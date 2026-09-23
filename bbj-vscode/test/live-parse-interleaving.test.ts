import { DocumentState, DocumentValidator, EmptyFileSystem, URI } from 'langium';
import type { LangiumDocument, LangiumSharedCoreServices } from 'langium';
import { validationHelper } from 'langium/test';
import type { NormalizedTextDocuments } from 'langium/lsp';
import { BBjDocumentBuilder } from '../src/language/bbj-document-builder.js';
import { TextDocument } from 'vscode-languageserver-textdocument';
import type { Diagnostic } from 'vscode-languageserver';
import { DiagnosticSeverity } from 'vscode-languageserver';
import { afterEach, beforeAll, describe, expect, test, vi } from 'vitest';
import { BBJ_PARSER_SOURCE } from '../src/language/bbj-parser-service.js';
import type { ParseError } from '../src/language/java-interop.js';
import { setCompilerTrigger } from '../src/language/bbj-document-validator.js';
import { clearAllVerdictStates, DOWNGRADED_SYNTAX_CODE } from '../src/language/bbj-diagnostic-reconciliation.js';
import { createBBjTestServices, JavaInteropTestService } from './bbj-test-module.js';
import { initializeWorkspace } from './test-helper.js';
import type { Program } from '../src/language/generated/ast.js';

/**
 * Interleaving coverage for a document's concurrent diagnostics writers (D-07/D-12 part b): the
 * live-parse cycle armed directly from a text-document event (plan 01), the pure composition
 * plan 02 built, and Langium's own validation, each finishing in either order and across text
 * versions -- no writer's list is ever lost, doubled or misattributed against another's.
 *
 * Two independent Langium syntax complaints on distinct lines are needed throughout this file.
 * An unclosed parenthesis mid-document swallows every following statement into a single parser
 * error (this codebase's own established finding -- see the whole-suite decision log), and a
 * document carrying any parser error skips line-break validation entirely
 * (`checkLineBreaks` bails whenever `document.parseResult.parserErrors.length > 0`), so two
 * genuinely independent parse errors need the dangling-binary-operator pattern this codebase
 * already established for that case (the same shape `bbj-parser-service.test.ts`'s
 * "an older server gets exactly the 0.16.x diagnostics" describe block pins), not a
 * parenthesis-plus-line-break combination.
 */

/** Two independent Langium parse errors on distinct lines, separated by a resynchronizing
 * statement -- see the file-level doc comment for why this shape, not two unclosed parens or a
 * parenthesis-plus-line-break pairing. */
const TWO_SYNTAX_COMPLAINTS_TEXT = 'x = 1 +\nrem ok\ny = 2 *\n';

/** Structural view onto the builder's private/protected members under test, reached via cast. */
type BuilderPrivates = {
    bbjcplAvailable: boolean | undefined;
    sendDiagnosticsToClient(uri: URI, diagnostics: Diagnostic[]): void;
};

/** A fresh, real `BBjDocumentBuilder` (via `createBBjTestServices`) with `bbjcplAvailable` forced
 * on -- there is no BBj install in this test environment, and every test here is about which
 * writer's list wins, not availability detection. Mirrors `live-parse-scheduling.test.ts`'s own
 * `createHarness()`. */
function createHarness() {
    const { shared, BBj } = createBBjTestServices(EmptyFileSystem);
    const builder = shared.workspace.DocumentBuilder as BBjDocumentBuilder;
    const privates = builder as unknown as BuilderPrivates;
    privates.bbjcplAvailable = true;
    const interopService = BBj.java.JavaInteropService as JavaInteropTestService;
    const textDocuments = shared.workspace.TextDocuments as unknown as NormalizedTextDocuments;
    return { shared, BBj, builder, privates, interopService, textDocuments };
}

/** Adds a `LangiumDocument` for `uri` the way a workspace scan would -- never built, state stays
 * `Parsed`, so it models a file the initial build has not reached yet. */
function addWorkspaceDocument(shared: ReturnType<typeof createBBjTestServices>['shared'], uri: URI, text: string): LangiumDocument {
    const document: LangiumDocument = shared.workspace.LangiumDocumentFactory.fromString(text, uri);
    shared.workspace.LangiumDocuments.addDocument(document);
    return document;
}

/** Fires a combined open+change event for `uri` on the harness's real `TextDocuments` store. */
function openOrChange(textDocuments: NormalizedTextDocuments, uriString: string, version: number, text: string): void {
    textDocuments.set(TextDocument.create(uriString, 'bbj', version, text));
}

/** True when no two diagnostics in `diagnostics` share the same source, message, start line and
 * severity -- the uniqueness bar every captured list in this file must clear. */
function hasNoDuplicates(diagnostics: Diagnostic[]): boolean {
    const seen = new Set<string>();
    for (const d of diagnostics) {
        const message = typeof d.message === 'string' ? d.message : d.message.value;
        const key = `${d.source ?? ''}\0${message}\0${d.range.start.line}\0${d.severity ?? ''}`;
        if (seen.has(key)) return false;
        seen.add(key);
    }
    return true;
}

afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    clearAllVerdictStates();
    setCompilerTrigger('debounced');
});

describe('live-parse and Langium writers interleaved', () => {
    // The zero-based lines TWO_SYNTAX_COMPLAINTS_TEXT's two independent parse errors land on --
    // derived from a throwaway validation on a separate, freshly-initialized services instance,
    // never hard-coded (Langium's own error-recovery line placement is not this test's concern).
    let firstFlaggedLine: number;
    let secondFlaggedLine: number;

    beforeAll(async () => {
        const probeServices = createBBjTestServices(EmptyFileSystem);
        await initializeWorkspace(probeServices.shared);
        const probeValidate = validationHelper<Program>(probeServices.BBj);
        const result = await probeValidate(TWO_SYNTAX_COMPLAINTS_TEXT);
        const parseErrors = result.diagnostics.filter(
            d => d.severity === DiagnosticSeverity.Error
                && (d.data as { code?: unknown } | undefined)?.code === DocumentValidator.ParsingError
        );
        const flaggedLines = [...new Set(parseErrors.map(d => d.range.start.line))];
        // Precondition: the fixture really does produce two independent parse errors on two
        // distinct lines.
        expect(flaggedLines.length).toBe(2);
        firstFlaggedLine = Math.min(...flaggedLines);
        secondFlaggedLine = flaggedLines.find(l => l !== firstFlaggedLine)!;
    });

    test('BBj\'s verdict first, then Langium\'s validation of the same text, publishes one consistent list', async () => {
        const { shared, builder, privates, interopService, textDocuments } = createHarness();

        // BBj's own verdict flags only the first complaint's line -- the second stays something
        // BBj is silent on, so Langium's carry-over treatment (D-05) must downgrade it instead of
        // dropping it.
        const scriptedError: ParseError = {
            categories: ['SyntaxError'],
            message: 'bbj verdict on the first complaint line',
            editorStartLine: firstFlaggedLine + 1, // ParseError lines are one-based.
            editorEndLine: firstFlaggedLine + 1,
            startCharacter: 1,
            endCharacter: 5,
        };
        interopService.scriptParseProgram({ errors: [scriptedError] });

        const uri = URI.file('/proj/interleave-tracer.bbj');
        const uriString = uri.toString();
        const document = addWorkspaceDocument(shared, uri, TWO_SYNTAX_COMPLAINTS_TEXT);
        // A file the startup scan loaded but a build has never touched -- Parsed, not Validated,
        // exactly the state an early verdict is published against (D-04).
        expect(document.state).toBe(DocumentState.Parsed);

        const clientPublishedLists: Diagnostic[][] = [];
        vi.spyOn(privates, 'sendDiagnosticsToClient').mockImplementation((_uri, diagnostics) => {
            clientPublishedLists.push(diagnostics);
        });
        const validatedPublishedLists: Diagnostic[][] = [];
        builder.onDocumentPhase(DocumentState.Validated, doc => {
            validatedPublishedLists.push(doc.diagnostics ?? []);
        });

        vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
        // Arrival order 1: the live-parse cycle's verdict, armed directly from the change event,
        // reaches the client before Langium has ever validated this text.
        openOrChange(textDocuments, uriString, 3, TWO_SYNTAX_COMPLAINTS_TEXT);
        await vi.advanceTimersByTimeAsync(600);

        expect(clientPublishedLists).toHaveLength(1);
        expect(clientPublishedLists[0]).toHaveLength(1);
        expect(clientPublishedLists[0][0].source).toBe(BBJ_PARSER_SOURCE);
        expect(clientPublishedLists[0][0].range.start.line).toBe(firstFlaggedLine);

        // Arrival order 2: Langium's own validation of the very same text runs afterward.
        await builder.update([uri], []);

        expect(validatedPublishedLists.length).toBeGreaterThan(0);
        const finalList = validatedPublishedLists[validatedPublishedLists.length - 1];

        // BBj's diagnostic is present exactly once, on the first complaint's line.
        const bbjDiagnostics = finalList.filter(d => d.source === BBJ_PARSER_SOURCE);
        expect(bbjDiagnostics).toHaveLength(1);
        expect(bbjDiagnostics[0].severity).toBe(DiagnosticSeverity.Error);
        expect(bbjDiagnostics[0].range.start.line).toBe(firstFlaggedLine);

        // No Langium syntax complaint survives on BBj's own line -- replaced, not merely
        // downgraded.
        const onFirstLine = finalList.filter(d => d.range.start.line === firstFlaggedLine);
        expect(onFirstLine).toHaveLength(1);
        expect(onFirstLine[0].source).toBe(BBJ_PARSER_SOURCE);

        // The second complaint, which BBj's verdict never mentioned, is downgraded to a Warning
        // rather than dropped.
        const downgraded = finalList.filter(
            d => (d.data as { code?: unknown } | undefined)?.code === DOWNGRADED_SYNTAX_CODE
        );
        expect(downgraded).toHaveLength(1);
        expect(downgraded[0].severity).toBe(DiagnosticSeverity.Warning);
        expect(downgraded[0].source).toBe('bbj');
        expect(downgraded[0].range.start.line).toBe(secondFlaggedLine);

        // No diagnostic ever doubles up, in the early client-sent list or the final Validated
        // list.
        for (const list of [...clientPublishedLists, ...validatedPublishedLists]) {
            expect(hasNoDuplicates(list)).toBe(true);
        }
    });
});
