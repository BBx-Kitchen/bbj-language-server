import { DocumentState, DocumentValidator, EmptyFileSystem, URI } from 'langium';
import type { LangiumDocument } from 'langium';
import type { NormalizedTextDocuments } from 'langium/lsp';
import { validationHelper } from 'langium/test';
import type { Diagnostic } from 'vscode-languageserver';
import { DiagnosticSeverity } from 'vscode-languageserver';
import { CancellationToken } from 'vscode-jsonrpc';
import { afterEach, beforeAll, describe, expect, test, vi } from 'vitest';
import { BBjDocumentBuilder } from '../src/language/bbj-document-builder.js';
import { setCompilerTrigger } from '../src/language/bbj-document-validator.js';
import { clearAllVerdictStates, DOWNGRADED_SYNTAX_CODE, getVerdictState } from '../src/language/bbj-diagnostic-reconciliation.js';
import { clearAllContentChanges, clearAllKeptChecks, getKeptCheck } from '../src/language/bbj-kept-check.js';
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
    sendDiagnosticsToClient(uri: URI, diagnostics: Diagnostic[]): void;
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

describe('in-flight results and supersession under on-save', () => {
    test('tracer: a save\'s result that resolves after the user typed is kept and placed on the shifted line', async () => {
        const { shared, interopService, client, builder } = createHarness();
        setCompilerTrigger('on-save');
        interopService.scriptParseProgram({ errors: [] });
        const parseProgramSpy = vi.spyOn(interopService, 'parseProgram');

        const uri = URI.file('/proj/in-flight-kept.bbj');
        const uriString = uri.toString();
        const text = 'x = 1\ny = 2\nz = 3\n';
        addWorkspaceDocument(shared, uri, text);

        vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
        // The open check completes right away, with no errors.
        client.open(uriString, 1, text);
        await vi.advanceTimersByTimeAsync(0);
        expect(parseProgramSpy).toHaveBeenCalledTimes(1);

        // The save's own check is held: it will not resolve until the user has already typed.
        let resolveHeld: (() => void) | undefined;
        const held = new Promise<void>(resolve => { resolveHeld = resolve; });
        parseProgramSpy.mockImplementationOnce(async params => {
            await held;
            return {
                version: params.version,
                errors: [{
                    categories: [],
                    message: 'undefined variable',
                    editorStartLine: 2, // one-based -- the line 'y = 2' sits on in the saved text.
                    editorEndLine: 2,
                    startCharacter: 1,
                    endCharacter: 1
                }]
            };
        });

        client.save(uriString);
        await vi.advanceTimersByTimeAsync(0);
        expect(parseProgramSpy).toHaveBeenCalledTimes(2);

        // The user types while the save's own check is still in flight -- inserts a line at the
        // top, bumping the version. Typing arms no compiler check under on-save.
        client.change(uriString, 2, [insertTextAt(0, 0, 'rem added\n')]);
        await vi.advanceTimersByTimeAsync(1000);
        expect(parseProgramSpy).toHaveBeenCalledTimes(2);

        // The held check now resolves, for the version-1 text it was actually sent.
        resolveHeld!();
        await vi.advanceTimersByTimeAsync(0);
        await Promise.resolve();
        await Promise.resolve();

        await builder.update([uri], []);
        let document = shared.workspace.LangiumDocuments.getDocument(uri)!;
        let bbjParserDiagnostics = (document.diagnostics ?? []).filter(d => d.source === BBJ_PARSER_SOURCE);
        expect(bbjParserDiagnostics).toHaveLength(1);
        expect(bbjParserDiagnostics[0].range.start.line).toBe(2);

        // Another keystroke after that still shows it there, shifted again.
        client.change(uriString, 3, [insertTextAt(0, 0, 'rem another\n')]);
        await builder.update([uri], []);
        document = shared.workspace.LangiumDocuments.getDocument(uri)!;
        bbjParserDiagnostics = (document.diagnostics ?? []).filter(d => d.source === BBJ_PARSER_SOURCE);
        expect(bbjParserDiagnostics).toHaveLength(1);
        expect(bbjParserDiagnostics[0].range.start.line).toBe(3);
        expect(parseProgramSpy).toHaveBeenCalledTimes(2);
    });

    test('supersession, newer first: resolving the newer save before the older one means only the newer result is ever published or kept', async () => {
        const { shared, interopService, client, privates } = createHarness();
        setCompilerTrigger('on-save');

        const uri = URI.file('/proj/supersession-newer-first.bbj');
        const uriString = uri.toString();
        const text = 'x = 1\ny = 2\n';
        addWorkspaceDocument(shared, uri, text);

        let resolveA: ((errors: ParseError[]) => void) | undefined;
        let resolveB: ((errors: ParseError[]) => void) | undefined;
        const heldA = new Promise<ParseError[]>(resolve => { resolveA = resolve; });
        const heldB = new Promise<ParseError[]>(resolve => { resolveB = resolve; });
        let call = 0;
        vi.spyOn(interopService, 'parseProgram').mockImplementation(async params => {
            call++;
            if (call === 1) {
                // The open's own check -- resolves right away, with no errors.
                return { version: params.version, errors: [] };
            }
            const errors = await (call === 2 ? heldA : heldB);
            return { version: params.version, errors };
        });
        const publishedLists: Diagnostic[][] = [];
        vi.spyOn(privates, 'sendDiagnosticsToClient').mockImplementation((_uri, diagnostics) => {
            publishedLists.push(diagnostics);
        });

        vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
        client.open(uriString, 1, text);
        await vi.advanceTimersByTimeAsync(0);

        // Cycle A: save, held.
        client.save(uriString);
        await vi.advanceTimersByTimeAsync(0);
        // Typing arms nothing under on-save -- only another save starts a new cycle.
        client.change(uriString, 2, [insertTextAt(0, 0, 'rem edit\n')]);
        // Cycle B: a second save, held too, for the newer text.
        client.save(uriString);
        await vi.advanceTimersByTimeAsync(0);

        const errorX: ParseError = { categories: [], message: 'X', editorStartLine: 1, editorEndLine: 1, startCharacter: 1, endCharacter: 1 };
        const errorY: ParseError = { categories: [], message: 'Y', editorStartLine: 1, editorEndLine: 1, startCharacter: 1, endCharacter: 1 };

        // The newer cycle resolves first...
        resolveB!([errorX]);
        await vi.advanceTimersByTimeAsync(0);
        await Promise.resolve();
        await Promise.resolve();
        expect(getKeptCheck(uri)?.diagnostics[0]?.message).toBe('X');

        // ...then the older, stale cycle resolves -- it must not overwrite B's result.
        resolveA!([errorY]);
        await vi.advanceTimersByTimeAsync(0);
        await Promise.resolve();
        await Promise.resolve();

        expect(getKeptCheck(uri)?.diagnostics[0]?.message).toBe('X');
        expect(getVerdictState(uri)?.diagnostics?.[0]?.message).toBe('X');
        expect(publishedLists.every(list => !list.some(d => d.message === 'Y'))).toBe(true);
    });

    test('supersession, older first: the older cycle publishes and stores nothing, and the newer cycle still wins once it resolves', async () => {
        const { shared, interopService, client, privates } = createHarness();
        setCompilerTrigger('on-save');

        const uri = URI.file('/proj/supersession-older-first.bbj');
        const uriString = uri.toString();
        const text = 'x = 1\ny = 2\n';
        addWorkspaceDocument(shared, uri, text);

        let resolveA: ((errors: ParseError[]) => void) | undefined;
        let resolveB: ((errors: ParseError[]) => void) | undefined;
        const heldA = new Promise<ParseError[]>(resolve => { resolveA = resolve; });
        const heldB = new Promise<ParseError[]>(resolve => { resolveB = resolve; });
        let call = 0;
        vi.spyOn(interopService, 'parseProgram').mockImplementation(async params => {
            call++;
            if (call === 1) {
                // The open's own check -- resolves right away, with no errors.
                return { version: params.version, errors: [] };
            }
            const errors = await (call === 2 ? heldA : heldB);
            return { version: params.version, errors };
        });
        const publishedLists: Diagnostic[][] = [];
        vi.spyOn(privates, 'sendDiagnosticsToClient').mockImplementation((_uri, diagnostics) => {
            publishedLists.push(diagnostics);
        });

        vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
        client.open(uriString, 1, text);
        await vi.advanceTimersByTimeAsync(0);

        client.save(uriString);
        await vi.advanceTimersByTimeAsync(0);
        client.change(uriString, 2, [insertTextAt(0, 0, 'rem edit\n')]);
        client.save(uriString);
        await vi.advanceTimersByTimeAsync(0);

        const errorX: ParseError = { categories: [], message: 'X', editorStartLine: 1, editorEndLine: 1, startCharacter: 1, endCharacter: 1 };
        const errorY: ParseError = { categories: [], message: 'Y', editorStartLine: 1, editorEndLine: 1, startCharacter: 1, endCharacter: 1 };

        // Snapshot the state right before either save cycle resolves -- still the open's own
        // check (no errors), from before A or B ever ran.
        const keptCheckBeforeResolution = getKeptCheck(uri);
        const verdictBeforeResolution = getVerdictState(uri);
        const publishedCountBeforeResolution = publishedLists.length;

        // The older cycle resolves first -- superseded before it ever gets here: no change at all.
        resolveA!([errorY]);
        await vi.advanceTimersByTimeAsync(0);
        await Promise.resolve();
        await Promise.resolve();
        expect(getKeptCheck(uri)).toEqual(keptCheckBeforeResolution);
        expect(getVerdictState(uri)).toEqual(verdictBeforeResolution);
        expect(publishedLists).toHaveLength(publishedCountBeforeResolution);

        // The newer cycle resolves afterward and publishes/stores as normal.
        resolveB!([errorX]);
        await vi.advanceTimersByTimeAsync(0);
        await Promise.resolve();
        await Promise.resolve();

        expect(getKeptCheck(uri)?.diagnostics[0]?.message).toBe('X');
        expect(publishedLists.some(list => list.some(d => d.message === 'X'))).toBe(true);
        expect(publishedLists.every(list => !list.some(d => d.message === 'Y'))).toBe(true);
    });

    test('debounced regression: a verdict held while the text moves on is still dropped', async () => {
        const { shared, interopService, client } = createHarness();
        setCompilerTrigger('debounced');
        interopService.scriptParseProgram({ errors: [] });

        const uri = URI.file('/proj/debounced-moved-on.bbj');
        const uriString = uri.toString();
        const text = 'x = 1\n';
        addWorkspaceDocument(shared, uri, text);

        let resolveHeld: (() => void) | undefined;
        const held = new Promise<void>(resolve => { resolveHeld = resolve; });
        const parseProgramSpy = vi.spyOn(interopService, 'parseProgram').mockImplementationOnce(async params => {
            await held;
            return {
                version: params.version,
                errors: [{
                    categories: [],
                    message: 'a stale verdict for text the user has since moved on from',
                    editorStartLine: 1,
                    editorEndLine: 1,
                    startCharacter: 1,
                    endCharacter: 1
                }]
            };
        });

        vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
        client.open(uriString, 1, text);
        // The debounced cycle fires and hangs, awaiting the held request.
        await vi.advanceTimersByTimeAsync(600);
        expect(parseProgramSpy).toHaveBeenCalledTimes(1);

        // The text moves on while the request is still in flight -- no further timer is advanced,
        // so no second cycle starts; this is purely about the still-in-flight cycle's own outcome.
        client.change(uriString, 2, [insertTextAt(0, 0, 'rem edit\n')]);

        resolveHeld!();
        await vi.advanceTimersByTimeAsync(0);
        await Promise.resolve();
        await Promise.resolve();

        expect(getKeptCheck(uri)).toBeUndefined();
        expect(getVerdictState(uri)).toBeUndefined();
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

/** A whole-line `Diagnostic` in the shape the save-time compiler parser produces, sourced
 * `'BBjCPL'` -- same idiom as `bbj-cpl-fallback-dedup.test.ts`'s own `bbjcplDiagnostic`. */
function bbjcplDiagnostic(line: number, message: string): Diagnostic {
    return {
        range: { start: { line, character: 0 }, end: { line, character: END_OF_LINE_CHARACTER } },
        message,
        severity: DiagnosticSeverity.Error,
        source: 'BBjCPL',
    };
}

/** Drains one real macrotask turn -- needed only once a cycle reaches `notifyDocumentPhase` for
 * real (a document already at the Validated state). Same idiom as
 * `bbj-cpl-fallback-dedup.test.ts`'s own `flushRealMacrotask`. */
function flushRealMacrotask(): Promise<void> {
    return new Promise(resolve => setImmediate(resolve));
}

describe('fallback results kept until the next save, end to end', () => {
    // The zero-based lines TWO_SYNTAX_COMPLAINTS_TEXT's two independent parse errors land on --
    // derived from a throwaway validation, exactly as the other describe blocks in this file do.
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

    /** Opens `uri` on the fake client and validates it once for real, with the compiler trigger
     * off so the open itself starts no compiler check -- the same helper shape as the sibling
     * describe block's own `openAndValidateOnce`. */
    async function openAndValidateOnce(
        harness: ReturnType<typeof createHarness>,
        uri: URI,
        text: string
    ): Promise<void> {
        setCompilerTrigger('off');
        harness.client.open(uri.toString(), 1, text);
        await harness.builder.update([uri], []);
    }

    test('on-save save: after inserting a line at the top, the BBjCPL diagnostic shows on the shifted line, the Langium complaint there stays gone, and the other line is still a plain Error', async () => {
        const harness = createHarness();
        const { shared, BBj, interopService, client, builder } = harness;
        const uri = URI.file('/proj/fallback-kept-shift.bbj');
        const uriString = uri.toString();
        addWorkspaceDocument(shared, uri, TWO_SYNTAX_COMPLAINTS_TEXT);
        await openAndValidateOnce(harness, uri, TWO_SYNTAX_COMPLAINTS_TEXT);

        setCompilerTrigger('on-save');
        interopService.scriptParseProgram('method-not-found');
        const compileSpy = vi.spyOn(BBj.compiler.BBjCPLService, 'compile').mockResolvedValue([]);
        compileSpy.mockResolvedValueOnce([bbjcplDiagnostic(firstFlaggedLine, 'Syntax error: kept probe')]);

        vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
        client.save(uriString);
        await vi.advanceTimersByTimeAsync(0);
        await flushRealMacrotask();
        await flushRealMacrotask();

        let document = shared.workspace.LangiumDocuments.getDocument(uri)!;
        let diagnostics = document.diagnostics ?? [];
        expect(diagnostics.filter(d => d.range.start.line === firstFlaggedLine && d.source === 'BBjCPL')).toHaveLength(1);
        expect(diagnostics.some(d => isPlainParsingError(d) && d.range.start.line === firstFlaggedLine)).toBe(false);
        expect(diagnostics.filter(d => d.range.start.line === secondFlaggedLine && isPlainParsingError(d))).toHaveLength(1);

        // Insert a line at the top -- typing arms no compiler check under on-save.
        client.change(uriString, 2, [insertTextAt(0, 0, 'rem inserted\n')]);
        await builder.update([uri], []);

        document = shared.workspace.LangiumDocuments.getDocument(uri)!;
        diagnostics = document.diagnostics ?? [];
        expect(diagnostics.filter(d => d.range.start.line === firstFlaggedLine + 1 && d.source === 'BBjCPL')).toHaveLength(1);
        expect(diagnostics.some(d => isPlainParsingError(d) && d.range.start.line === firstFlaggedLine + 1)).toBe(false);
        const onSecondLine = diagnostics.filter(d => d.range.start.line === secondFlaggedLine + 1);
        expect(onSecondLine.filter(isPlainParsingError)).toHaveLength(1);
        expect(onSecondLine.some(d => (d.data as { code?: unknown } | undefined)?.code === DOWNGRADED_SYNTAX_CODE)).toBe(false);
    });

    test('editing the first flagged line to different invalid text keeps the BBjCPL diagnostic and shows a fresh Langium Error for the new text on the same line', async () => {
        const harness = createHarness();
        const { shared, BBj, interopService, client, builder } = harness;
        const uri = URI.file('/proj/fallback-edit-flagged-line.bbj');
        const uriString = uri.toString();
        addWorkspaceDocument(shared, uri, TWO_SYNTAX_COMPLAINTS_TEXT);
        await openAndValidateOnce(harness, uri, TWO_SYNTAX_COMPLAINTS_TEXT);

        setCompilerTrigger('on-save');
        interopService.scriptParseProgram('method-not-found');
        const compileSpy = vi.spyOn(BBj.compiler.BBjCPLService, 'compile').mockResolvedValue([]);
        compileSpy.mockResolvedValueOnce([bbjcplDiagnostic(firstFlaggedLine, 'Syntax error: kept probe')]);

        vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
        client.save(uriString);
        await vi.advanceTimersByTimeAsync(0);
        await flushRealMacrotask();
        await flushRealMacrotask();

        // Replacing the flagged line's own text (still a resync point right after the still-
        // dangling first operator, per this file's other describe block) with different text: the
        // kept BBjCPL diagnostic stays on that line, and a fresh Langium complaint about the new
        // text shows as an Error beside it, since the check never saw this exact line text.
        client.change(uriString, 2, [replaceLineContent(firstFlaggedLine, 'rem changed')]);
        await builder.update([uri], []);

        const document = shared.workspace.LangiumDocuments.getDocument(uri)!;
        const diagnostics = document.diagnostics ?? [];
        const onFirstLine = diagnostics.filter(d => d.range.start.line === firstFlaggedLine);
        expect(onFirstLine.some(d => d.source === 'BBjCPL')).toBe(true);
        expect(onFirstLine.some(isPlainParsingError)).toBe(true);
    });

    test('a fallback compile held while the user types after the save is kept and placed on the shifted line once it resolves', async () => {
        const harness = createHarness();
        const { shared, BBj, interopService, client, builder } = harness;
        const uri = URI.file('/proj/fallback-held-compile.bbj');
        const uriString = uri.toString();
        addWorkspaceDocument(shared, uri, TWO_SYNTAX_COMPLAINTS_TEXT);
        await openAndValidateOnce(harness, uri, TWO_SYNTAX_COMPLAINTS_TEXT);

        setCompilerTrigger('on-save');
        interopService.scriptParseProgram('method-not-found');
        let resolveCompile: ((diagnostics: Diagnostic[]) => void) | undefined;
        const held = new Promise<Diagnostic[]>(resolve => { resolveCompile = resolve; });
        vi.spyOn(BBj.compiler.BBjCPLService, 'compile').mockImplementationOnce(() => held);

        vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
        client.save(uriString);
        await vi.advanceTimersByTimeAsync(0);

        // The user types while the save's own compile is still in flight -- inserts a line at the
        // top. Typing arms no compiler check under on-save.
        client.change(uriString, 2, [insertTextAt(0, 0, 'rem inserted\n')]);
        await vi.advanceTimersByTimeAsync(1000);

        resolveCompile!([bbjcplDiagnostic(firstFlaggedLine, 'Syntax error: held probe')]);
        await vi.advanceTimersByTimeAsync(0);
        await flushRealMacrotask();
        await flushRealMacrotask();

        await builder.update([uri], []);
        const document = shared.workspace.LangiumDocuments.getDocument(uri)!;
        const bbjcplDiagnostics = (document.diagnostics ?? []).filter(d => d.source === 'BBjCPL');
        expect(bbjcplDiagnostics).toHaveLength(1);
        expect(bbjcplDiagnostics[0].range.start.line).toBe(firstFlaggedLine + 1);
    });

    test('a later save whose compile returns no findings removes the previously kept BBjCPL diagnostic', async () => {
        const harness = createHarness();
        const { shared, BBj, interopService, client, builder } = harness;
        const uri = URI.file('/proj/fallback-clears-on-empty.bbj');
        const uriString = uri.toString();
        addWorkspaceDocument(shared, uri, TWO_SYNTAX_COMPLAINTS_TEXT);
        await openAndValidateOnce(harness, uri, TWO_SYNTAX_COMPLAINTS_TEXT);

        setCompilerTrigger('on-save');
        interopService.scriptParseProgram('method-not-found');
        const compileSpy = vi.spyOn(BBj.compiler.BBjCPLService, 'compile').mockResolvedValue([]);
        compileSpy.mockResolvedValueOnce([bbjcplDiagnostic(firstFlaggedLine, 'Syntax error: kept probe')]);

        vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
        client.save(uriString);
        await vi.advanceTimersByTimeAsync(0);
        await flushRealMacrotask();
        await flushRealMacrotask();

        let document = shared.workspace.LangiumDocuments.getDocument(uri)!;
        expect((document.diagnostics ?? []).some(d => d.source === 'BBjCPL')).toBe(true);

        // A later save whose compile returns no findings at all -- the previous kept check is
        // replaced with an empty one, clearing the shown diagnostic.
        client.save(uriString);
        await vi.advanceTimersByTimeAsync(0);
        await flushRealMacrotask();
        await flushRealMacrotask();

        document = shared.workspace.LangiumDocuments.getDocument(uri)!;
        expect((document.diagnostics ?? []).some(d => d.source === 'BBjCPL')).toBe(false);
        expect(getKeptCheck(uri)?.diagnostics ?? []).toEqual([]);
    });
});

describe('mode switches keep current errors', () => {
    test('debounced verdict, then switch to on-save, then type: the BBj error stays on its shifted line until the next save', async () => {
        const { shared, interopService, client, builder } = createHarness();
        setCompilerTrigger('debounced');
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

        const uri = URI.file('/proj/switch-debounced-to-onsave.bbj');
        const uriString = uri.toString();
        const text = 'x = 1\ny = 2\nz = 3\n';
        addWorkspaceDocument(shared, uri, text);

        vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
        client.open(uriString, 1, text);
        await vi.advanceTimersByTimeAsync(600);
        await builder.update([uri], []);

        let document = shared.workspace.LangiumDocuments.getDocument(uri)!;
        let bbjDiagnostics = (document.diagnostics ?? []).filter(d => d.source === BBJ_PARSER_SOURCE);
        expect(bbjDiagnostics).toHaveLength(1);
        expect(bbjDiagnostics[0].range.start.line).toBe(1);

        setCompilerTrigger('on-save');

        // Typing arms no compiler check under on-save; the kept verdict from before the switch
        // stays, re-placed on its shifted line.
        client.change(uriString, 2, [insertTextAt(0, 0, 'rem inserted\n')]);
        await builder.update([uri], []);

        document = shared.workspace.LangiumDocuments.getDocument(uri)!;
        bbjDiagnostics = (document.diagnostics ?? []).filter(d => d.source === BBJ_PARSER_SOURCE);
        expect(bbjDiagnostics).toHaveLength(1);
        expect(bbjDiagnostics[0].range.start.line).toBe(2);
    });

    test('debounced bbjcpl fallback result, then switch to on-save, then type: the BBjCPL error stays until the next save', async () => {
        const { shared, BBj, interopService, client, builder, privates } = createHarness();
        setCompilerTrigger('debounced');
        interopService.scriptParseProgram('method-not-found');
        const compileSpy = vi.spyOn(BBj.compiler.BBjCPLService, 'compile').mockResolvedValue([]);

        const uri = URI.file('/proj/switch-debounced-fallback-to-onsave.bbj');
        const uriString = uri.toString();
        const text = 'x = 1\ny = 2\nz = 3\n';
        const document = addWorkspaceDocument(shared, uri, text);

        vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
        // Settles the open-armed cycle (empty compile), then establishes a real, Validated
        // Langium baseline -- the same two-step setup bbj-cpl-fallback-dedup.test.ts's own
        // "debounced, file saved" test uses, so the interesting cycle below publishes directly
        // onto document.diagnostics instead of only reaching sendDiagnosticsToClient.
        client.open(uriString, 1, text);
        await vi.advanceTimersByTimeAsync(600);
        await builder.update([uri], []);
        await vi.advanceTimersByTimeAsync(600);
        await flushRealMacrotask();
        await flushRealMacrotask();

        expect(document.state).toBe(DocumentState.Validated);

        // A save under debounced arms nothing directly, but records the version; a rebuild (e.g.
        // another file's save) is what actually runs the scripted compile here.
        compileSpy.mockResolvedValueOnce([bbjcplDiagnostic(2, 'Syntax error: debounced fallback probe')]);
        client.save(uriString);
        await privates.runBbjcplForDocuments([document], CancellationToken.None);
        await vi.advanceTimersByTimeAsync(500);
        await flushRealMacrotask();
        await flushRealMacrotask();

        expect((document.diagnostics ?? []).filter(d => d.source === 'BBjCPL')).toHaveLength(1);

        setCompilerTrigger('on-save');
        client.change(uriString, 3, [insertTextAt(0, 0, 'rem inserted\n')]);
        await builder.update([uri], []);

        const onShiftedLine = (document.diagnostics ?? []).filter(d => d.source === 'BBjCPL' && d.range.start.line === 3);
        expect(onShiftedLine).toHaveLength(1);
    });

    test('on-save kept errors, then switch to debounced: a rebuild keeps them, the next edit keeps them until its own check replaces them, and typing afterward behaves like steady-state debounced', async () => {
        const { shared, interopService, client, builder } = createHarness();
        setCompilerTrigger('on-save');
        interopService.scriptParseProgram({
            errors: [{
                categories: [],
                message: 'on-save kept error',
                editorStartLine: 3, // one-based -- the 'z = 3' line, never edited below.
                editorEndLine: 3,
                startCharacter: 1,
                endCharacter: 1
            }]
        });

        const uri = URI.file('/proj/switch-onsave-to-debounced.bbj');
        const uriString = uri.toString();
        const text = 'x = 1\ny = 2\nz = 3\n';
        const document = addWorkspaceDocument(shared, uri, text);

        vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
        client.open(uriString, 1, text);
        await vi.advanceTimersByTimeAsync(0);
        await builder.update([uri], []);

        expect((document.diagnostics ?? []).filter(d => d.source === BBJ_PARSER_SOURCE)).toHaveLength(1);
        expect(getKeptCheck(uri)?.storedUnderOnSave).toBe(true);

        setCompilerTrigger('debounced');

        // A rebuild (the settings-change reload) -- builder.update() alone is the rebuild;
        // runBbjcplForDocuments' own "the trigger just switched" guard (reached from inside
        // buildDocuments) arms nothing for it, and the kept error from before the switch stays
        // through this rebuild's own Langium validation.
        await builder.update([uri], []);
        expect((document.diagnostics ?? []).filter(d => d.source === BBJ_PARSER_SOURCE)).toHaveLength(1);

        // The next edit (on an unrelated line, so the kept diagnostic's own line is untouched)
        // arms a debounced cycle, but the kept error stays visible in validation until that
        // check's own result arrives.
        interopService.scriptParseProgram({ errors: [] });
        client.change(uriString, 2, [replaceLines(0, 1, 'x = 2\n')]);
        await builder.update([uri], []);
        expect((document.diagnostics ?? []).filter(d => d.source === BBJ_PARSER_SOURCE)).toHaveLength(1);
        expect(getKeptCheck(uri)?.storedUnderOnSave).toBe(true);

        // The debounced cycle settles: its own (empty) result replaces the kept error.
        await vi.advanceTimersByTimeAsync(500);
        await builder.update([uri], []);
        expect((document.diagnostics ?? []).filter(d => d.source === BBJ_PARSER_SOURCE)).toHaveLength(0);
        expect(getKeptCheck(uri)?.storedUnderOnSave).toBe(false);

        // From here on, typing behaves exactly like steady-state debounced: a verdict's own
        // diagnostics never show on the very next validation before its own debounce settles.
        interopService.scriptParseProgram({
            errors: [{
                categories: [],
                message: 'steady-state debounced verdict',
                editorStartLine: 1,
                editorEndLine: 1,
                startCharacter: 1,
                endCharacter: 1
            }]
        });
        client.change(uriString, 3, [replaceLines(0, 1, 'x = 3\n')]);
        await builder.update([uri], []);
        expect((document.diagnostics ?? []).filter(d => d.source === BBJ_PARSER_SOURCE)).toHaveLength(0);

        await vi.advanceTimersByTimeAsync(500);
        await builder.update([uri], []);
        expect((document.diagnostics ?? []).filter(d => d.source === BBJ_PARSER_SOURCE)).toHaveLength(1);
    });

    test('steady-state debounced, no switch: typing after a verdict never shows the verdict\'s diagnostics on the next validation', async () => {
        const { shared, interopService, client, builder } = createHarness();
        setCompilerTrigger('debounced');
        interopService.scriptParseProgram({
            errors: [{
                categories: [],
                message: 'a verdict about to be superseded by typing',
                editorStartLine: 1,
                editorEndLine: 1,
                startCharacter: 1,
                endCharacter: 1
            }]
        });

        const uri = URI.file('/proj/steady-state-debounced.bbj');
        const uriString = uri.toString();
        const text = 'x = 1\ny = 2\n';
        addWorkspaceDocument(shared, uri, text);

        vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
        client.open(uriString, 1, text);
        await vi.advanceTimersByTimeAsync(600);
        await builder.update([uri], []);

        let document = shared.workspace.LangiumDocuments.getDocument(uri)!;
        expect((document.diagnostics ?? []).filter(d => d.source === BBJ_PARSER_SOURCE)).toHaveLength(1);
        expect(getKeptCheck(uri)?.storedUnderOnSave).toBe(false);

        client.change(uriString, 2, [replaceLines(0, 1, 'x = 2\n')]);
        await builder.update([uri], []);

        document = shared.workspace.LangiumDocuments.getDocument(uri)!;
        expect((document.diagnostics ?? []).filter(d => d.source === BBJ_PARSER_SOURCE)).toHaveLength(0);
    });

    test('a switch to off clears every kept check and change log, and validation shows Langium diagnostics only', async () => {
        const { shared, interopService, client, builder, privates } = createHarness();
        setCompilerTrigger('on-save');
        interopService.scriptParseProgram({
            errors: [{
                categories: [],
                message: 'about to be cleared by off',
                editorStartLine: 1,
                editorEndLine: 1,
                startCharacter: 1,
                endCharacter: 1
            }]
        });

        const uri = URI.file('/proj/switch-to-off.bbj');
        const uriString = uri.toString();
        const text = 'x = 1\ny = 2\n';
        const document = addWorkspaceDocument(shared, uri, text);

        vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
        client.open(uriString, 1, text);
        await vi.advanceTimersByTimeAsync(0);
        await builder.update([uri], []);
        expect((document.diagnostics ?? []).filter(d => d.source === BBJ_PARSER_SOURCE)).toHaveLength(1);
        expect(getKeptCheck(uri)).toBeDefined();

        setCompilerTrigger('off');
        await privates.runBbjcplForDocuments([document], CancellationToken.None);

        expect(getKeptCheck(uri)).toBeUndefined();
        expect(getVerdictState(uri)).toBeUndefined();
        expect((document.diagnostics ?? []).some(d => d.source === BBJ_PARSER_SOURCE)).toBe(false);
    });

    test('close: the document\'s kept check and change log are gone; reopening under on-save runs one open check', async () => {
        const { shared, interopService, client, builder } = createHarness();
        setCompilerTrigger('on-save');
        interopService.scriptParseProgram({ errors: [] });
        const parseProgramSpy = vi.spyOn(interopService, 'parseProgram');

        const uri = URI.file('/proj/close-forgets-kept-check.bbj');
        const uriString = uri.toString();
        const text = 'x = 1\n';
        addWorkspaceDocument(shared, uri, text);

        vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
        client.open(uriString, 1, text);
        await vi.advanceTimersByTimeAsync(0);
        expect(parseProgramSpy).toHaveBeenCalledTimes(1);
        expect(getKeptCheck(uri)).toBeDefined();

        // Forces BBjDocumentValidator's lazy instantiation (its constructor registers the
        // onDidClose subscription that forgets a closed document's kept check) -- nothing else in
        // this test reaches a real validation otherwise.
        await builder.update([uri], []);

        client.close(uriString);
        await vi.advanceTimersByTimeAsync(0);
        expect(getKeptCheck(uri)).toBeUndefined();

        client.open(uriString, 1, text);
        await vi.advanceTimersByTimeAsync(0);
        expect(parseProgramSpy).toHaveBeenCalledTimes(2);
    });

    test('order independence: a verdict cycle and a Langium validation of the same text, in either order, end with deep-equal document.diagnostics', async () => {
        const scriptedError: ParseError = {
            categories: ['SyntaxError'],
            message: 'order-independence mode-switch verdict',
            editorStartLine: 1,
            editorEndLine: 1,
            startCharacter: 1,
            endCharacter: 3,
        };
        const text = 'x = 1\ny = 2\n';

        async function runVerdictFirst(): Promise<Diagnostic[]> {
            const { shared, interopService, client, builder } = createHarness();
            setCompilerTrigger('debounced');
            interopService.scriptParseProgram({ errors: [scriptedError] });
            const uri = URI.file('/proj/order-independence-verdict-first.bbj');
            addWorkspaceDocument(shared, uri, text);

            vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
            client.open(uri.toString(), 1, text);
            await vi.advanceTimersByTimeAsync(600);
            await builder.update([uri], []);

            const document = shared.workspace.LangiumDocuments.getDocument(uri)!;
            return document.diagnostics ?? [];
        }

        async function runLangiumFirst(): Promise<Diagnostic[]> {
            const { shared, interopService, client, builder } = createHarness();
            setCompilerTrigger('debounced');
            interopService.scriptParseProgram({ errors: [scriptedError] });
            const uri = URI.file('/proj/order-independence-langium-first.bbj');
            addWorkspaceDocument(shared, uri, text);

            vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
            client.open(uri.toString(), 1, text);
            await builder.update([uri], []);
            await vi.advanceTimersByTimeAsync(600);
            await flushRealMacrotask();
            await flushRealMacrotask();

            const document = shared.workspace.LangiumDocuments.getDocument(uri)!;
            return document.diagnostics ?? [];
        }

        const verdictFirst = await runVerdictFirst();
        const langiumFirst = await runLangiumFirst();

        expect(verdictFirst.length).toBeGreaterThan(0);
        expect(langiumFirst).toEqual(verdictFirst);
    });
});
