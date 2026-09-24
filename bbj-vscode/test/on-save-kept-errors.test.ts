import { DocumentValidator, EmptyFileSystem, URI } from 'langium';
import type { LangiumDocument } from 'langium';
import type { NormalizedTextDocuments } from 'langium/lsp';
import { validationHelper } from 'langium/test';
import { DiagnosticSeverity } from 'vscode-languageserver';
import { CancellationToken } from 'vscode-jsonrpc';
import { afterEach, beforeAll, describe, expect, test, vi } from 'vitest';
import { BBjDocumentBuilder } from '../src/language/bbj-document-builder.js';
import { setCompilerTrigger } from '../src/language/bbj-document-validator.js';
import { clearAllVerdictStates, DOWNGRADED_SYNTAX_CODE } from '../src/language/bbj-diagnostic-reconciliation.js';
import { clearAllContentChanges, clearAllKeptChecks } from '../src/language/bbj-kept-check.js';
import { BBJ_PARSER_SOURCE } from '../src/language/bbj-parser-service.js';
import type { ParseError } from '../src/language/java-interop.js';
import type { Program } from '../src/language/generated/ast.js';
import { END_OF_LINE_CHARACTER } from '../src/language/lsp-position.js';
import { createBBjTestServices, JavaInteropTestService } from './bbj-test-module.js';
import { initializeWorkspace } from './test-helper.js';
import { insertTextAt, listenOnFakeConnection, replaceLines } from './fake-text-document-connection.js';

/** Replaces a whole line's content, in place, keeping the line's own identity (Task 2's own
 * "replacing the line's whole content keeps L" rule -- both ends of the range stay on `line`
 * itself, unlike {@link replaceLines}, whose range spans into the next line and therefore drops
 * the line instead). `END_OF_LINE_CHARACTER` clamps to the line's real length, whatever it is. */
function replaceLineContent(line: number, text: string): ReturnType<typeof insertTextAt> {
    return {
        range: { start: { line, character: 0 }, end: { line, character: END_OF_LINE_CHARACTER } },
        text
    };
}

/**
 * End-to-end coverage for the kept compiler errors under `on-save`: the last check's diagnostics
 * stay visible on their lines while the user types, through the real text-document store
 * (`listenOnFakeConnection`), the change-recording configuration, and the kept-check composition.
 */

/** Structural view onto the builder's private members under test, reached via cast -- same shape
 * as `on-save-trigger.test.ts`'s own `createHarness`. */
type BuilderPrivates = {
    bbjcplAvailable: boolean | undefined;
    runBbjcplForDocuments(documents: LangiumDocument[], cancelToken: CancellationToken): Promise<void>;
};

function createHarness() {
    const { shared, BBj } = createBBjTestServices(EmptyFileSystem);
    const builder = shared.workspace.DocumentBuilder as BBjDocumentBuilder;
    const privates = builder as unknown as BuilderPrivates;
    privates.bbjcplAvailable = true;
    const interopService = BBj.java.JavaInteropService as JavaInteropTestService;
    const textDocuments = shared.workspace.TextDocuments as unknown as NormalizedTextDocuments;
    const client = listenOnFakeConnection(textDocuments);
    return { shared, BBj, builder, privates, interopService, client };
}

/** Adds a `LangiumDocument` for `uri` the way a workspace scan would -- never built, state stays
 * `Parsed`, so a subsequent open event finds it via `langiumDocuments.getDocument`. */
function addWorkspaceDocument(shared: ReturnType<typeof createBBjTestServices>['shared'], uri: URI, text: string) {
    const document = shared.workspace.LangiumDocumentFactory.fromString(text, uri);
    shared.workspace.LangiumDocuments.addDocument(document);
    return document;
}

afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    clearAllVerdictStates();
    clearAllKeptChecks();
    clearAllContentChanges();
    setCompilerTrigger('debounced');
});

describe('on-save kept errors', () => {
    test('tracer: a BBj Parser error from the last check follows its line while the user types above it', async () => {
        const { shared, interopService, client, builder } = createHarness();
        setCompilerTrigger('on-save');
        interopService.scriptParseProgram({
            errors: [{
                categories: [],
                message: 'undefined variable',
                editorStartLine: 2, // one-based -- the line 'y = 2' sits on.
                editorEndLine: 2,
                startCharacter: 1,
                endCharacter: 1
            }]
        });
        const parseProgramSpy = vi.spyOn(interopService, 'parseProgram');

        const uri = URI.file('/proj/kept-error.bbj');
        const text = 'x = 1\ny = 2\nz = 3\n';
        addWorkspaceDocument(shared, uri, text);

        vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
        // The open check runs, stores its verdict as this document's kept check, and (had a real
        // LSP connection been attached) would have published it on zero-based line 1.
        client.open(uri.toString(), 1, text);
        await vi.advanceTimersByTimeAsync(0);
        expect(parseProgramSpy).toHaveBeenCalledTimes(1);

        // Insert a line above the flagged one -- typing arms no compiler check under on-save.
        client.change(uri.toString(), 2, [insertTextAt(0, 0, 'rem added\n')]);
        await vi.advanceTimersByTimeAsync(1000);
        expect(parseProgramSpy).toHaveBeenCalledTimes(1);

        await builder.update([uri], []);

        const document = shared.workspace.LangiumDocuments.getDocument(uri)!;
        const bbjParserDiagnostics = (document.diagnostics ?? []).filter(d => d.source === 'BBj Parser');
        expect(bbjParserDiagnostics).toHaveLength(1);
        expect(bbjParserDiagnostics[0].range.start.line).toBe(2);
        expect(parseProgramSpy).toHaveBeenCalledTimes(1);
    });
});

/** Two independent Langium parse errors on distinct lines -- the same fixture and rationale as
 * `live-parse-interleaving.test.ts`'s own `TWO_SYNTAX_COMPLAINTS_TEXT` (its own file-level doc
 * comment explains why the dangling-binary-operator shape, not two unclosed parens, is needed for
 * two genuinely independent complaints). */
const TWO_SYNTAX_COMPLAINTS_TEXT = 'x = 1 +\nrem ok\ny = 2 *\n';

/** The `data.code` a plain (never seen, never downgraded) syntax complaint carries. */
function isPlainParsingError(d: { severity?: DiagnosticSeverity; data?: unknown }): boolean {
    return d.severity === DiagnosticSeverity.Error
        && (d.data as { code?: unknown } | undefined)?.code === DocumentValidator.ParsingError;
}

describe('composing while typing between saves, end to end', () => {
    // The zero-based lines TWO_SYNTAX_COMPLAINTS_TEXT's two independent parse errors land on --
    // derived from a throwaway validation, exactly as live-parse-interleaving.test.ts does.
    let firstFlaggedLine: number;
    let secondFlaggedLine: number;

    beforeAll(async () => {
        const probeServices = createBBjTestServices(EmptyFileSystem);
        await initializeWorkspace(probeServices.shared);
        const probeValidate = validationHelper<Program>(probeServices.BBj);
        const result = await probeValidate(TWO_SYNTAX_COMPLAINTS_TEXT);
        const parseErrors = result.diagnostics.filter(isPlainParsingError);
        const flaggedLines = [...new Set(parseErrors.map(d => d.range.start.line))];
        expect(flaggedLines.length).toBe(2);
        firstFlaggedLine = Math.min(...flaggedLines);
        secondFlaggedLine = flaggedLines.find(l => l !== firstFlaggedLine)!;
    });

    /** The scripted verdict every test in this block shares: BBj's own parser flags only the
     * first complaint's line, one-based. */
    function scriptedFirstLineError(): ParseError {
        return {
            categories: ['SyntaxError'],
            message: 'bbj verdict on the first complaint line',
            editorStartLine: firstFlaggedLine + 1,
            editorEndLine: firstFlaggedLine + 1,
            startCharacter: 1,
            endCharacter: 5,
        };
    }

    /**
     * Opens `uri` on the fake client and validates it once for real, with the compiler trigger
     * off so the open itself starts no compiler check -- the way an already-open, already-scanned
     * workspace file looks by the time the user later saves it. `builder.update` reads its text
     * from the harness's own `TextDocuments` store (`DefaultLangiumDocumentFactory.update`), which
     * only has an entry for `uri` once `client.open` has run; calling it beforehand would fall
     * back to `EmptyFileSystemProvider.readFile`, which always throws.
     */
    async function openAndValidateOnce(
        harness: ReturnType<typeof createHarness>,
        uri: URI,
        text: string
    ): Promise<void> {
        setCompilerTrigger('off');
        harness.client.open(uri.toString(), 1, text);
        await harness.builder.update([uri], []);
    }

    test('end to end: the verdict drops the overlapping complaint and downgrades the other; inserting a line above keeps BBj\'s error on the shifted line', async () => {
        const harness = createHarness();
        const { shared, interopService, client, builder } = harness;
        const uri = URI.file('/proj/e2e-kept.bbj');
        const uriString = uri.toString();
        addWorkspaceDocument(shared, uri, TWO_SYNTAX_COMPLAINTS_TEXT);
        // A normal Langium validation first, as an already-open, already-scanned file would have,
        // so the save-triggered check below reconciles against real complaints, not an empty
        // baseline.
        await openAndValidateOnce(harness, uri, TWO_SYNTAX_COMPLAINTS_TEXT);

        setCompilerTrigger('on-save');
        interopService.scriptParseProgram({ errors: [scriptedFirstLineError()] });
        const parseProgramSpy = vi.spyOn(interopService, 'parseProgram');

        vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
        client.save(uriString);
        await vi.advanceTimersByTimeAsync(0);
        expect(parseProgramSpy).toHaveBeenCalledTimes(1);

        let document = shared.workspace.LangiumDocuments.getDocument(uri)!;
        let diagnostics = document.diagnostics ?? [];
        expect(diagnostics.filter(d => d.source === BBJ_PARSER_SOURCE)).toHaveLength(1);
        expect(diagnostics.filter(d => d.source === BBJ_PARSER_SOURCE)[0].range.start.line).toBe(firstFlaggedLine);
        let downgraded = diagnostics.filter(d => (d.data as { code?: unknown } | undefined)?.code === DOWNGRADED_SYNTAX_CODE);
        expect(downgraded).toHaveLength(1);
        expect(downgraded[0].range.start.line).toBe(secondFlaggedLine);
        // No plain (still-Error) syntax complaint survives on either flagged line.
        expect(diagnostics.some(d => isPlainParsingError(d) && (d.range.start.line === firstFlaggedLine || d.range.start.line === secondFlaggedLine))).toBe(false);

        // Insert a line at the top -- typing arms no compiler check under on-save.
        client.change(uriString, 2, [insertTextAt(0, 0, 'rem inserted\n')]);
        await vi.advanceTimersByTimeAsync(1000);
        expect(parseProgramSpy).toHaveBeenCalledTimes(1);

        await builder.update([uri], []);

        document = shared.workspace.LangiumDocuments.getDocument(uri)!;
        diagnostics = document.diagnostics ?? [];
        const bbjDiagnostics = diagnostics.filter(d => d.source === BBJ_PARSER_SOURCE);
        expect(bbjDiagnostics).toHaveLength(1);
        expect(bbjDiagnostics[0].range.start.line).toBe(firstFlaggedLine + 1);
        downgraded = diagnostics.filter(d => (d.data as { code?: unknown } | undefined)?.code === DOWNGRADED_SYNTAX_CODE);
        expect(downgraded).toHaveLength(1);
        expect(downgraded[0].range.start.line).toBe(secondFlaggedLine + 1);
    });

    test('end to end: editing the flagged line keeps BBj\'s error and adds the fresh complaint beside it; fixing the underlying syntax keeps BBj\'s error; deleting the line removes it', async () => {
        const harness = createHarness();
        const { shared, interopService, client } = harness;
        const uri = URI.file('/proj/e2e-edit-line.bbj');
        const uriString = uri.toString();
        addWorkspaceDocument(shared, uri, TWO_SYNTAX_COMPLAINTS_TEXT);
        await openAndValidateOnce(harness, uri, TWO_SYNTAX_COMPLAINTS_TEXT);

        setCompilerTrigger('on-save');
        interopService.scriptParseProgram({ errors: [scriptedFirstLineError()] });

        vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
        client.save(uriString);
        await vi.advanceTimersByTimeAsync(0);

        const { builder } = harness;

        // (a) Editing the first flagged line's own text (still a resync point right after the
        // still-dangling first operator, verified to keep landing the same parse error there):
        // BBj's kept error stays on that line (its own line was edited, not deleted --
        // replaceLineContent's range keeps both ends on the same line, unlike a full-line
        // replaceLines), and a fresh Langium complaint about the new text shows as an Error
        // beside it, since the check never saw this exact line text.
        client.change(uriString, 2, [replaceLineContent(firstFlaggedLine, 'rem changed')]);
        await builder.update([uri], []);

        let document = shared.workspace.LangiumDocuments.getDocument(uri)!;
        let diagnostics = document.diagnostics ?? [];
        expect(diagnostics.filter(d => d.source === BBJ_PARSER_SOURCE && d.range.start.line === firstFlaggedLine)).toHaveLength(1);
        expect(diagnostics.filter(d => isPlainParsingError(d) && d.range.start.line === firstFlaggedLine)).toHaveLength(1);

        // (b) Fixing the underlying dangling operators (both flagged lines are resync points for
        // one, not the operator itself) makes the whole document syntactically clean -- no
        // Langium syntax complaints survive anywhere -- but BBj's kept error still stays: it is
        // dropped only when its own line is deleted, never when Langium's own opinion changes.
        client.change(uriString, 3, [replaceLineContent(firstFlaggedLine - 1, 'x = 1')]);
        client.change(uriString, 4, [replaceLineContent(secondFlaggedLine, 'y = 2')]);
        await builder.update([uri], []);

        document = shared.workspace.LangiumDocuments.getDocument(uri)!;
        diagnostics = document.diagnostics ?? [];
        expect(diagnostics.some(d => isPlainParsingError(d))).toBe(false);
        expect(diagnostics.filter(d => d.source === BBJ_PARSER_SOURCE)).toHaveLength(1);
        expect(diagnostics.filter(d => d.source === BBJ_PARSER_SOURCE)[0].range.start.line).toBe(firstFlaggedLine);

        // (c) Deleting the flagged line removes BBj's kept error entirely.
        client.change(uriString, 5, [replaceLines(firstFlaggedLine, firstFlaggedLine + 1, '')]);
        await builder.update([uri], []);

        document = shared.workspace.LangiumDocuments.getDocument(uri)!;
        diagnostics = document.diagnostics ?? [];
        expect(diagnostics.some(d => d.source === BBJ_PARSER_SOURCE)).toBe(false);
    });

    test('end to end: a rebuild starts no compiler check and BBj\'s kept error stays', async () => {
        const harness = createHarness();
        const { shared, interopService, client, builder, privates } = harness;
        const uri = URI.file('/proj/e2e-rebuild.bbj');
        const uriString = uri.toString();
        addWorkspaceDocument(shared, uri, TWO_SYNTAX_COMPLAINTS_TEXT);
        await openAndValidateOnce(harness, uri, TWO_SYNTAX_COMPLAINTS_TEXT);
        const document = shared.workspace.LangiumDocuments.getDocument(uri)!;

        setCompilerTrigger('on-save');
        interopService.scriptParseProgram({ errors: [scriptedFirstLineError()] });

        vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
        client.save(uriString);
        await vi.advanceTimersByTimeAsync(0);

        const parseProgramSpy = vi.spyOn(interopService, 'parseProgram');

        // A rebuild for this same document -- no text change, no save.
        await privates.runBbjcplForDocuments([document], CancellationToken.None);
        await vi.advanceTimersByTimeAsync(1000);
        expect(parseProgramSpy).not.toHaveBeenCalled();

        await builder.update([uri], []);

        const rebuiltDocument = shared.workspace.LangiumDocuments.getDocument(uri)!;
        expect((rebuiltDocument.diagnostics ?? []).filter(d => d.source === BBJ_PARSER_SOURCE)).toHaveLength(1);
        expect(parseProgramSpy).not.toHaveBeenCalled();
    });

    test('regression under debounced: after the verdict, typing elsewhere makes BBj\'s error disappear from the next validation, as before', async () => {
        const harness = createHarness();
        const { shared, interopService, client, builder } = harness;
        const uri = URI.file('/proj/e2e-debounced-regression.bbj');
        const uriString = uri.toString();
        addWorkspaceDocument(shared, uri, TWO_SYNTAX_COMPLAINTS_TEXT);
        await openAndValidateOnce(harness, uri, TWO_SYNTAX_COMPLAINTS_TEXT);

        // Trigger switches to 'debounced' (the default) -- the mode this regression is about. A
        // save never arms a check under 'debounced' (unchanged by this phase), so a change event
        // is what starts the first verdict cycle here, exactly as before this phase.
        setCompilerTrigger('debounced');
        interopService.scriptParseProgram({ errors: [scriptedFirstLineError()] });

        vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
        client.change(uriString, 2, [replaceLines(1, 2, 'rem ok\n')]);
        await vi.advanceTimersByTimeAsync(600);

        let document = shared.workspace.LangiumDocuments.getDocument(uri)!;
        expect((document.diagnostics ?? []).filter(d => d.source === BBJ_PARSER_SOURCE)).toHaveLength(1);

        client.change(uriString, 3, [insertTextAt(3, 0, 'z = 9\n')]);
        await builder.update([uri], []);

        document = shared.workspace.LangiumDocuments.getDocument(uri)!;
        expect((document.diagnostics ?? []).filter(d => d.source === BBJ_PARSER_SOURCE)).toHaveLength(0);
    });
});
