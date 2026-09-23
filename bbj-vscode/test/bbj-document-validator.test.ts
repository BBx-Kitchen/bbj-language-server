import { DocumentValidator, EmptyFileSystem } from 'langium';
import { validationHelper } from 'langium/test';
import { TextDocument } from 'vscode-languageserver-textdocument';
import type { Diagnostic } from 'vscode-languageserver';
import { DiagnosticSeverity } from 'vscode-languageserver';
import { afterEach, beforeAll, describe, expect, test } from 'vitest';
import { createBBjServices } from '../src/language/bbj-module.js';
import type { Program } from '../src/language/generated/ast.js';
import { initializeWorkspace } from './test-helper.js';
import { applyConfiguredDiagnosticHierarchy, applyDiagnosticHierarchy, setCompilerTrigger } from '../src/language/bbj-document-validator.js';
import { BBJ_PARSER_SOURCE } from '../src/language/bbj-parser-service.js';
import { END_OF_LINE_CHARACTER } from '../src/language/lsp-position.js';
import {
    DOWNGRADED_SYNTAX_CODE,
    LINE_BREAK_DIAGNOSTIC_CODE,
    clearAllVerdictStates,
    documentLineText,
    getVerdictState,
    reconcileWithVerdict,
    recallLangiumDiagnostics,
    setVerdictState,
} from '../src/language/bbj-diagnostic-reconciliation.js';

// One shared services/validate instance for the whole file, in the style of
// line-break-validation.test.ts: each createBBjServices()+initializeWorkspace() pair does real,
// non-trivial async setup work.
const services = createBBjServices(EmptyFileSystem);
let validate: ReturnType<typeof validationHelper<Program>>;

beforeAll(async () => {
    await initializeWorkspace(services.shared);
    validate = validationHelper<Program>(services.BBj);
});

afterEach(() => {
    clearAllVerdictStates();
    setCompilerTrigger('debounced');
});

type DataCode = { code?: unknown } | undefined;

function codeOf(d: { data?: unknown }): unknown {
    return (d.data as DataCode)?.code;
}

function isParsingError(d: { severity?: DiagnosticSeverity; data?: unknown }): boolean {
    return d.severity === DiagnosticSeverity.Error && codeOf(d) === DocumentValidator.ParsingError;
}

/**
 * Validates `text`, derives an accepted (zero-error) verdict's carry-over state from its
 * pre-hierarchy diagnostics -- via `reconcileWithVerdict(<raw>, [], lineText)`, an empty verdict
 * diagnostics list meaning "BBj found nothing on this text" -- and stores it for the document's
 * own uri. Disposes the document afterward: carry-over state lives on the uri, not the document
 * object, so a later `validate()` at the same uri picks it up even though it is a fresh
 * `LangiumDocument`.
 */
async function storeAcceptedVerdict(text: string): Promise<string> {
    const result = await validate(text);
    const raw = recallLangiumDiagnostics(result.document);
    expect(raw).toBeDefined();
    // Precondition: the fixture really produces a syntax error to downgrade, and its message
    // does not embed a line or column number -- so the line-shift test below exercises the
    // match rule (message + line text) and not an accidental message difference.
    const parseErrors = raw!.filter(isParsingError);
    expect(parseErrors.length).toBeGreaterThan(0);
    for (const error of parseErrors) {
        expect(error.message).not.toMatch(/\bline\s*\d/i);
        expect(error.message).not.toMatch(/:\d+:\d+/);
    }

    const lineText = documentLineText(result.document.textDocument);
    const { state } = reconcileWithVerdict(raw!, [], lineText);
    const uri = result.document.uri.toString();
    setVerdictState(uri, state);
    result.dispose();
    return uri;
}

describe('BBjDocumentValidator: no verdict state', () => {
    test('validation is unchanged: it deep-equals applyDiagnosticHierarchy over the remembered pre-hierarchy list', async () => {
        const text = 'rem no verdict yet\nx = (1 + 2\n';
        const result = await validate(text);
        const parseErrors = result.diagnostics.filter(isParsingError);
        expect(parseErrors.length).toBeGreaterThan(0); // precondition: this text is a real syntax error

        const remembered = recallLangiumDiagnostics(result.document);
        expect(remembered).toBeDefined();
        expect(result.diagnostics).toEqual(applyDiagnosticHierarchy(remembered!, true, 20));
        result.dispose();
    });
});

describe('BBjDocumentValidator: carry-over between verdicts', () => {
    test('a syntax complaint the last verdict downgraded stays a Warning on the very next validation', async () => {
        const text = 'rem seen line\nx = (1 + 2\n';
        const uri = await storeAcceptedVerdict(text);

        const result = await validate(text, { documentUri: uri });
        const carried = result.diagnostics.find(d => codeOf(d) === DOWNGRADED_SYNTAX_CODE);
        expect(carried).toBeDefined();
        expect(carried!.severity).toBe(DiagnosticSeverity.Warning);
        expect(carried!.source).toBe('bbj');
        result.dispose();
    });

    test('a syntax complaint carried across a line shift (a blank line inserted above it) still stays a Warning', async () => {
        const text = 'rem seen line\nx = (1 + 2\n';
        const uri = await storeAcceptedVerdict(text);

        // Same flagged line's text, moved one line down by an edit above it.
        const shifted = 'rem seen line\n\nx = (1 + 2\n';
        const result = await validate(shifted, { documentUri: uri });
        const carried = result.diagnostics.find(d => codeOf(d) === DOWNGRADED_SYNTAX_CODE);
        expect(carried).toBeDefined();
        expect(carried!.severity).toBe(DiagnosticSeverity.Warning);
        result.dispose();
    });

    test('the same line edited to a different syntax error is not matched and shows as an Error', async () => {
        const text = 'rem seen line\nx = (1 + 2\n';
        const uri = await storeAcceptedVerdict(text);

        const edited = 'rem seen line\ny = (3 * 4\n';
        const result = await validate(edited, { documentUri: uri });
        const parseErrors = result.diagnostics.filter(isParsingError);
        expect(parseErrors.length).toBeGreaterThan(0); // precondition: still a syntax error
        expect(result.diagnostics.some(d => codeOf(d) === DOWNGRADED_SYNTAX_CODE)).toBe(false);
        result.dispose();
    });

    test('a second, unseen syntax error on another line is an Error while the seen one stays a Warning', async () => {
        const text = 'rem seen line\nx = (1 + 2\n';
        const uri = await storeAcceptedVerdict(text);

        // A genuinely independent second statement (its own dangling-operator syntax error,
        // resynchronized by the 'rem sep' line) placed before the unchanged, still-last
        // 'x = (1 + 2' line -- the original line's error message and position are unaffected by
        // what precedes it.
        const withNewError = 'z = 5 +\nrem sep\nx = (1 + 2\n';
        const result = await validate(withNewError, { documentUri: uri });

        const warnings = result.diagnostics.filter(d => codeOf(d) === DOWNGRADED_SYNTAX_CODE);
        const errors = result.diagnostics.filter(isParsingError);
        expect(warnings.length).toBeGreaterThan(0);
        expect(errors.length).toBeGreaterThan(0);
        result.dispose();
    });

    test('with the compiler trigger off, the same complaint is shown as an Error again', async () => {
        const text = 'rem seen line\nx = (1 + 2\n';
        const uri = await storeAcceptedVerdict(text);

        setCompilerTrigger('off');
        const result = await validate(text, { documentUri: uri });
        const errors = result.diagnostics.filter(isParsingError);
        expect(errors.length).toBeGreaterThan(0);
        expect(result.diagnostics.some(d => codeOf(d) === DOWNGRADED_SYNTAX_CODE)).toBe(false);
        result.dispose();
    });
});

describe('BBjDocumentValidator: verdict state is cleared on document close', () => {
    test('closing a document forgets its verdict state', () => {
        const uri = 'file:///close-test.bbj';
        setVerdictState(uri, { seen: new Set(['some-key']) });
        expect(getVerdictState(uri)).toBeDefined();

        const doc = TextDocument.create(uri, 'bbj', 1, 'x = 1\n');
        services.shared.workspace.TextDocuments.set(doc);
        services.shared.workspace.TextDocuments.delete(uri);

        expect(getVerdictState(uri)).toBeUndefined();
    });
});

describe('a verdict on real validator output', () => {
    // An IF whose FI shares a line with a following IF -- the exact fixture
    // line-break-walk-termination.test.ts pins, reused here because its two line-break
    // messages and their shared line are already established, known-stable values.
    const lineBreakFixture = 'if x then\na = 1\nfi if y then\nb = 2\nfi';
    const isLineBreakDiagnostic = (d: Diagnostic) => codeOf(d) === LINE_BREAK_DIAGNOSTIC_CODE;
    const isLinkingError = (d: Diagnostic) => codeOf(d) === DocumentValidator.LinkingError;

    test('line-break diagnostics carry the line-break code, Error severity and their pinned messages unchanged', async () => {
        const result = await validate(lineBreakFixture);
        const lineBreakDiags = result.diagnostics.filter(isLineBreakDiagnostic);
        expect(lineBreakDiags).toHaveLength(2);
        expect(lineBreakDiags.every(d => d.severity === DiagnosticSeverity.Error)).toBe(true);
        expect(lineBreakDiags.map(d => d.message).sort()).toEqual([
            'This statement needs to end with a line break: fi',
            'This statement needs to start in a new line: if y then',
        ].sort());
        result.dispose();
    });

    test('an accepted verdict downgrades both line-break complaints to Warnings with source bbj, and leaves no syntax Error', async () => {
        const result = await validate(lineBreakFixture);
        const raw = recallLangiumDiagnostics(result.document);
        expect(raw).toBeDefined();
        const lineBreakRaw = raw!.filter(isLineBreakDiagnostic);
        expect(lineBreakRaw).toHaveLength(2); // precondition

        const lineText = documentLineText(result.document.textDocument);
        const { diagnostics: reconciled } = reconcileWithVerdict(raw!, [], lineText);
        const hierarchyApplied = applyConfiguredDiagnosticHierarchy(reconciled);

        const downgraded = hierarchyApplied.filter(d => codeOf(d) === DOWNGRADED_SYNTAX_CODE);
        expect(downgraded).toHaveLength(2);
        expect(downgraded.every(d => d.severity === DiagnosticSeverity.Warning)).toBe(true);
        expect(downgraded.every(d => d.source === 'bbj')).toBe(true);
        expect(downgraded.map(d => d.message).sort()).toEqual(lineBreakRaw.map(d => d.message).sort());

        const remainingSyntaxErrors = hierarchyApplied.filter(d =>
            d.severity === DiagnosticSeverity.Error
            && (codeOf(d) === DocumentValidator.ParsingError
                || codeOf(d) === DocumentValidator.LexingError
                || codeOf(d) === LINE_BREAK_DIAGNOSTIC_CODE)
        );
        expect(remainingSyntaxErrors).toHaveLength(0);
        result.dispose();
    });

    test('a BBj diagnostic spanning the shared line replaces both line-break complaints there', async () => {
        const result = await validate(lineBreakFixture);
        const raw = recallLangiumDiagnostics(result.document)!;
        const lineText = documentLineText(result.document.textDocument);
        // Both line-break complaints in this fixture sit on line 2 ('fi if y then').
        const bbjDiagnostic: Diagnostic = {
            range: { start: { line: 2, character: 0 }, end: { line: 2, character: END_OF_LINE_CHARACTER } },
            message: 'BBj flags this line',
            severity: DiagnosticSeverity.Error,
            source: BBJ_PARSER_SOURCE
        };

        const { diagnostics: reconciled } = reconcileWithVerdict(raw, [bbjDiagnostic], lineText);
        const hierarchyApplied = applyConfiguredDiagnosticHierarchy(reconciled);

        const onSharedLine = hierarchyApplied.filter(d => d.range.start.line === 2);
        expect(onSharedLine).toHaveLength(1);
        expect(onSharedLine[0].source).toBe(BBJ_PARSER_SOURCE);
        expect(hierarchyApplied.some(isLineBreakDiagnostic)).toBe(false);
        result.dispose();
    });

    test('a linking diagnostic hidden by a parse error becomes visible after an accepted verdict', async () => {
        // A GOTO to a label that is never declared (a linking error), plus an assignment with
        // an unclosed parenthesis on another line (a parse error).
        const text = 'goto missinglabel\nx = (1 + 2\n';
        const result = await validate(text);
        const raw = recallLangiumDiagnostics(result.document)!;

        // Preconditions: both a real parse error and a real linking error are present in the
        // raw list, and Rule 1 hides the linking error today, before any verdict exists.
        expect(raw.some(isParsingError)).toBe(true);
        expect(raw.some(isLinkingError)).toBe(true);
        const beforeVerdict = applyConfiguredDiagnosticHierarchy(raw);
        expect(beforeVerdict.some(isLinkingError)).toBe(false);

        const lineText = documentLineText(result.document.textDocument);
        const { diagnostics: reconciled } = reconcileWithVerdict(raw, [], lineText);
        const afterVerdict = applyConfiguredDiagnosticHierarchy(reconciled);
        expect(afterVerdict.some(isLinkingError)).toBe(true);
        result.dispose();
    });
});
