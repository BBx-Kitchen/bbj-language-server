import { DocumentState, DocumentValidator, EmptyFileSystem, URI } from 'langium';
import type { LangiumDocument } from 'langium';
import type { NormalizedTextDocuments } from 'langium/lsp';
import type { InitializeParams, InitializeResult } from 'vscode-languageserver';
import { DiagnosticSeverity } from 'vscode-languageserver';
import { CancellationToken } from 'vscode-jsonrpc';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { BBjDocumentBuilder } from '../src/language/bbj-document-builder.js';
import { setCompilerTrigger } from '../src/language/bbj-document-validator.js';
import { clearAllVerdictStates } from '../src/language/bbj-diagnostic-reconciliation.js';
import { createBBjTestServices, JavaInteropTestService } from './bbj-test-module.js';
import { insertTextAt, listenOnFakeConnection, replaceLines } from './fake-text-document-connection.js';
import { initializeWorkspace } from './test-helper.js';

/**
 * End-to-end coverage for the `on-save` compiler trigger: the server's advertised save
 * capability, a save arming exactly one zero-delay check through the real text-document store
 * (`listenOnFakeConnection`), and the save-time compile fallback when the live parse is
 * unavailable.
 */

/** Structural view onto the builder's private members under test, reached via cast. */
type BuilderPrivates = {
    bbjcplAvailable: boolean | undefined;
    runBbjcplForDocuments(documents: LangiumDocument[], cancelToken: CancellationToken): Promise<void>;
};

/** A fresh, real `BBjDocumentBuilder` (via `createBBjTestServices`) with `bbjcplAvailable` forced
 * on -- there is no BBj install in this test environment -- connected to a fake LSP client that
 * drives the real `TextDocuments` store the way VS Code or IntelliJ would. */
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
 * `Parsed`, so a subsequent open/save event finds it via `langiumDocuments.getDocument`. */
function addWorkspaceDocument(shared: ReturnType<typeof createBBjTestServices>['shared'], uri: URI, text: string): LangiumDocument {
    const document: LangiumDocument = shared.workspace.LangiumDocumentFactory.fromString(text, uri);
    shared.workspace.LangiumDocuments.addDocument(document);
    return document;
}

afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    clearAllVerdictStates();
    setCompilerTrigger('debounced');
});

describe('on-save compiler trigger', () => {
    test('capability: the server advertises textDocumentSync.save, and the DocumentUpdateHandler exposes didSaveDocument', () => {
        const { shared } = createBBjTestServices(EmptyFileSystem);

        // buildInitializeResult is protected on DefaultLanguageServer -- reached via a
        // structural cast, the same way the rest of this phase reaches protected/private
        // members under test.
        const languageServer = shared.lsp.LanguageServer as unknown as {
            buildInitializeResult(params: InitializeParams): InitializeResult;
        };
        const result = languageServer.buildInitializeResult({
            processId: null,
            rootUri: null,
            capabilities: {},
            workspaceFolders: null,
        } as InitializeParams);

        expect(result.capabilities.textDocumentSync).toMatchObject({ save: true });
        expect(typeof shared.lsp.DocumentUpdateHandler.didSaveDocument).toBe('function');
    });

    test('tracer: on-save, opening a loaded document runs one immediate check, and saving it runs a second, with no 500ms wait', async () => {
        const { shared, interopService, client } = createHarness();
        setCompilerTrigger('on-save');
        interopService.scriptParseProgram({ errors: [] });
        const parseProgramSpy = vi.spyOn(interopService, 'parseProgram');

        const uri = URI.file('/proj/save-trigger.bbj');
        const text = 'x = 1\n';
        addWorkspaceDocument(shared, uri, text);

        vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
        client.open(uri.toString(), 1, text);
        await vi.advanceTimersByTimeAsync(0);

        expect(parseProgramSpy).toHaveBeenCalledTimes(1);

        client.save(uri.toString());
        await vi.advanceTimersByTimeAsync(0);

        expect(parseProgramSpy).toHaveBeenCalledTimes(2);
        expect(parseProgramSpy.mock.calls[1][0]).toMatchObject({ text, version: '1' });
    });

    test('fallback: on-save, when the live parse is unavailable, a save runs exactly one save-time compile', async () => {
        const { shared, BBj, interopService, client } = createHarness();
        setCompilerTrigger('on-save');
        interopService.scriptParseProgram('method-not-found');
        const compileSpy = vi.spyOn(BBj.compiler.BBjCPLService, 'compile').mockResolvedValue([]);

        const uri = URI.file('/proj/save-fallback.bbj');
        const text = 'x = 1\n';
        addWorkspaceDocument(shared, uri, text);

        vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
        client.open(uri.toString(), 1, text);
        await vi.advanceTimersByTimeAsync(0);
        // The open above also falls back to a save-time compile under 'method-not-found' --
        // clear it so the assertion below isolates the save's own contribution.
        compileSpy.mockClear();

        client.save(uri.toString());
        await vi.advanceTimersByTimeAsync(0);

        expect(compileSpy).toHaveBeenCalledTimes(1);
    });
});

describe('on-save: typing, open and rebuild rules', () => {
    test('open: on-save, opening runs exactly one check at 0 ms despite the paired change event', async () => {
        const { shared, interopService, client } = createHarness();
        setCompilerTrigger('on-save');
        interopService.scriptParseProgram({ errors: [] });
        const parseProgramSpy = vi.spyOn(interopService, 'parseProgram');

        const uri = URI.file('/proj/open-once.bbj');
        const text = 'x = 1\n';
        addWorkspaceDocument(shared, uri, text);

        vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
        client.open(uri.toString(), 1, text);
        await vi.advanceTimersByTimeAsync(0);

        expect(parseProgramSpy).toHaveBeenCalledTimes(1);
    });

    test('typing: on-save, a burst of change events including an invalid edit arms no compiler check, and a rebuild still shows Langium\'s own syntax diagnostic', async () => {
        const { shared, interopService, client, builder } = createHarness();
        setCompilerTrigger('on-save');
        interopService.scriptParseProgram({ errors: [] });
        const parseProgramSpy = vi.spyOn(interopService, 'parseProgram');

        const uri = URI.file('/proj/typing-burst.bbj');
        const validText = 'x = 1\n';
        addWorkspaceDocument(shared, uri, validText);

        vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
        client.open(uri.toString(), 1, validText);
        await vi.advanceTimersByTimeAsync(0);
        parseProgramSpy.mockClear();

        // A burst of edits, the last leaving the document with a dangling binary operator --
        // this codebase's own established shape for a genuine, independent Langium parse error.
        client.change(uri.toString(), 2, [replaceLines(0, 1, 'y = 2\n')]);
        client.change(uri.toString(), 3, [replaceLines(0, 1, 'x = 1 +\n')]);
        await vi.advanceTimersByTimeAsync(1000);

        expect(parseProgramSpy).not.toHaveBeenCalled();
        expect(builder.hasPendingCompile()).toBe(false);

        await builder.update([uri], []);

        const document = shared.workspace.LangiumDocuments.getDocument(uri)!;
        expect(document.state).toBe(DocumentState.Validated);
        const hasSyntaxError = document.diagnostics?.some(
            d => d.severity === DiagnosticSeverity.Error
                && (d.data as { code?: unknown } | undefined)?.code === DocumentValidator.ParsingError
        );
        expect(hasSyntaxError).toBe(true);
    });

    test('rebuild: on-save, runBbjcplForDocuments and a rebuild of another document arm no compiler check for the open document', async () => {
        const { shared, interopService, client, builder, privates } = createHarness();
        setCompilerTrigger('on-save');
        interopService.scriptParseProgram({ errors: [] });
        const parseProgramSpy = vi.spyOn(interopService, 'parseProgram');

        const uri = URI.file('/proj/rebuild-open.bbj');
        const text = 'x = 1\n';
        const document = addWorkspaceDocument(shared, uri, text);

        vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
        client.open(uri.toString(), 1, text);
        await vi.advanceTimersByTimeAsync(0);
        parseProgramSpy.mockClear();

        // A rebuild for this same document -- e.g. its own Langium build re-running
        // runBbjcplForDocuments outside the event-driven path.
        await privates.runBbjcplForDocuments([document], CancellationToken.None);
        await vi.advanceTimersByTimeAsync(1000);
        expect(parseProgramSpy).not.toHaveBeenCalled();

        // A rebuild of an unrelated, also-open document.
        const otherUri = URI.file('/proj/rebuild-other.bbj');
        const otherText = 'y = 2\n';
        addWorkspaceDocument(shared, otherUri, otherText);
        client.open(otherUri.toString(), 1, otherText);
        await vi.advanceTimersByTimeAsync(0);
        // The other document's own open armed its own check -- isolate the assertion below to
        // what the rebuild itself contributes for the FIRST document.
        parseProgramSpy.mockClear();

        await builder.update([otherUri], []);
        await vi.advanceTimersByTimeAsync(1000);

        expect(parseProgramSpy).not.toHaveBeenCalled();
    });

    test('ordering: on-save, a change then a rebuild, and a rebuild then a change, for the same document, arm no compiler check', async () => {
        const { shared, interopService, client, privates } = createHarness();
        setCompilerTrigger('on-save');
        interopService.scriptParseProgram({ errors: [] });
        const parseProgramSpy = vi.spyOn(interopService, 'parseProgram');

        const uri = URI.file('/proj/order-a.bbj');
        const text = 'x = 1\n';
        const document = addWorkspaceDocument(shared, uri, text);

        vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
        client.open(uri.toString(), 1, text);
        await vi.advanceTimersByTimeAsync(0);
        parseProgramSpy.mockClear();

        client.change(uri.toString(), 2, [replaceLines(0, 1, 'x = 2\n')]);
        await privates.runBbjcplForDocuments([document], CancellationToken.None);
        await vi.advanceTimersByTimeAsync(1000);
        expect(parseProgramSpy).not.toHaveBeenCalled();

        await privates.runBbjcplForDocuments([document], CancellationToken.None);
        client.change(uri.toString(), 3, [replaceLines(0, 1, 'x = 3\n')]);
        await vi.advanceTimersByTimeAsync(1000);
        expect(parseProgramSpy).not.toHaveBeenCalled();
    });

    test('repeat: on-save, the same edit sent twice arms no compiler check', async () => {
        const { shared, interopService, client } = createHarness();
        setCompilerTrigger('on-save');
        interopService.scriptParseProgram({ errors: [] });
        const parseProgramSpy = vi.spyOn(interopService, 'parseProgram');

        const uri = URI.file('/proj/repeat-edit.bbj');
        const text = 'x = 1\n';
        addWorkspaceDocument(shared, uri, text);

        vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
        client.open(uri.toString(), 1, text);
        await vi.advanceTimersByTimeAsync(0);
        parseProgramSpy.mockClear();

        client.change(uri.toString(), 2, [replaceLines(0, 1, 'x = 2\n')]);
        client.change(uri.toString(), 3, [replaceLines(0, 1, 'x = 2\n')]);
        await vi.advanceTimersByTimeAsync(1000);

        expect(parseProgramSpy).not.toHaveBeenCalled();
    });

    test('empty document: on-save, opening and saving each run one check with empty text, and typing between them arms nothing', async () => {
        const { shared, interopService, client } = createHarness();
        setCompilerTrigger('on-save');
        interopService.scriptParseProgram({ errors: [] });
        const parseProgramSpy = vi.spyOn(interopService, 'parseProgram');

        const uri = URI.file('/proj/empty.bbj');
        addWorkspaceDocument(shared, uri, '');

        vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
        client.open(uri.toString(), 1, '');
        await vi.advanceTimersByTimeAsync(0);

        expect(parseProgramSpy).toHaveBeenCalledTimes(1);
        expect(parseProgramSpy.mock.calls[0][0]).toMatchObject({ text: '', version: '1' });
        parseProgramSpy.mockClear();

        // A zero-width, empty-text edit -- "typing" that leaves the document empty -- must still
        // arm nothing under on-save.
        client.change(uri.toString(), 2, [insertTextAt(0, 0, '')]);
        await vi.advanceTimersByTimeAsync(1000);
        expect(parseProgramSpy).not.toHaveBeenCalled();

        client.save(uri.toString());
        await vi.advanceTimersByTimeAsync(0);
        expect(parseProgramSpy).toHaveBeenCalledTimes(1);
        expect(parseProgramSpy.mock.calls[0][0]).toMatchObject({ text: '', version: '2' });
    });

    test('idempotency: on-save, two saves of unchanged text each run their own check', async () => {
        const { shared, interopService, client } = createHarness();
        setCompilerTrigger('on-save');
        interopService.scriptParseProgram({ errors: [] });
        const parseProgramSpy = vi.spyOn(interopService, 'parseProgram');

        const uri = URI.file('/proj/save-twice.bbj');
        const text = 'x = 1\n';
        addWorkspaceDocument(shared, uri, text);

        vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
        client.open(uri.toString(), 1, text);
        await vi.advanceTimersByTimeAsync(0);
        parseProgramSpy.mockClear();

        client.save(uri.toString());
        await vi.advanceTimersByTimeAsync(0);
        expect(parseProgramSpy).toHaveBeenCalledTimes(1);

        client.save(uri.toString());
        await vi.advanceTimersByTimeAsync(0);
        expect(parseProgramSpy).toHaveBeenCalledTimes(2);
        expect(parseProgramSpy.mock.calls[0][0]).toMatchObject({ text, version: '1' });
        expect(parseProgramSpy.mock.calls[1][0]).toMatchObject({ text, version: '1' });
    });

    test('concurrency: on-save, typing while a save-triggered check is in flight arms nothing, and the held check resolves cleanly', async () => {
        const { shared, interopService, client } = createHarness();
        setCompilerTrigger('on-save');

        const uri = URI.file('/proj/save-in-flight.bbj');
        const text = 'x = 1\n';
        addWorkspaceDocument(shared, uri, text);

        interopService.scriptParseProgram({ errors: [] });
        vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
        client.open(uri.toString(), 1, text);
        await vi.advanceTimersByTimeAsync(0);

        let resolveHeld: (() => void) | undefined;
        const held = new Promise<void>(resolve => { resolveHeld = resolve; });
        const parseProgramSpy = vi.spyOn(interopService, 'parseProgram').mockImplementationOnce(async params => {
            await held;
            return { version: params.version, errors: [] };
        });

        client.save(uri.toString());
        await vi.advanceTimersByTimeAsync(0);
        expect(parseProgramSpy).toHaveBeenCalledTimes(1);

        // Typing while the save's check is still in flight: arms nothing, and does not disturb
        // the still-pending request.
        client.change(uri.toString(), 2, [replaceLines(0, 1, 'x = 2\n')]);
        await vi.advanceTimersByTimeAsync(1000);
        expect(parseProgramSpy).toHaveBeenCalledTimes(1);

        // The held request now resolves without throwing.
        resolveHeld!();
        await vi.advanceTimersByTimeAsync(0);
        await Promise.resolve();
        expect(parseProgramSpy).toHaveBeenCalledTimes(1);
    });

    test('reopen: on-save, closing and reopening a document runs one check per open', async () => {
        const { shared, interopService, client } = createHarness();
        setCompilerTrigger('on-save');
        interopService.scriptParseProgram({ errors: [] });
        const parseProgramSpy = vi.spyOn(interopService, 'parseProgram');

        const uri = URI.file('/proj/reopen.bbj');
        const text = 'x = 1\n';
        addWorkspaceDocument(shared, uri, text);

        vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
        client.open(uri.toString(), 1, text);
        await vi.advanceTimersByTimeAsync(0);
        expect(parseProgramSpy).toHaveBeenCalledTimes(1);

        client.close(uri.toString());
        await vi.advanceTimersByTimeAsync(0);

        client.open(uri.toString(), 1, text);
        await vi.advanceTimersByTimeAsync(0);
        expect(parseProgramSpy).toHaveBeenCalledTimes(2);
    });

    test('deferred open: on-save, an open for a not-yet-loaded uri defers until ready and then runs one check; a standalone change for it leaves no pending deferral', async () => {
        const { shared, interopService, client } = createHarness();
        setCompilerTrigger('on-save');
        interopService.scriptParseProgram({ errors: [] });
        const parseProgramSpy = vi.spyOn(interopService, 'parseProgram');

        const uri = URI.file('/proj/deferred.bbj');
        const uriString = uri.toString();
        const text = 'x = 1\n';

        vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
        // The open itself pairs with an immediate change event (Langium's own behaviour); under
        // on-save the change reason arms nothing regardless of deferral state.
        client.open(uriString, 1, text);
        await vi.advanceTimersByTimeAsync(1000);
        expect(parseProgramSpy).not.toHaveBeenCalled();

        // A separate, standalone change event for the same not-yet-loaded uri: eventArmsCheck
        // already returns false for reason 'change' under on-save, before any pending-deferral
        // bookkeeping is ever touched.
        client.change(uriString, 2, [replaceLines(0, 1, 'x = 2\n')]);
        await vi.advanceTimersByTimeAsync(1000);
        expect(parseProgramSpy).not.toHaveBeenCalled();

        addWorkspaceDocument(shared, uri, text);
        await initializeWorkspace(shared);
        await vi.advanceTimersByTimeAsync(0);

        expect(parseProgramSpy).toHaveBeenCalledTimes(1);
    });
});

describe('mode switches, and debounced/off unchanged', () => {
    test('on-save then a switch to debounced: the first rebuild after the switch arms nothing; the next edit arms a 500ms cycle', async () => {
        const { shared, interopService, client, privates } = createHarness();
        setCompilerTrigger('on-save');
        interopService.scriptParseProgram({ errors: [] });
        const parseProgramSpy = vi.spyOn(interopService, 'parseProgram');

        const uri = URI.file('/proj/switch-to-debounced.bbj');
        const text = 'x = 1\n';
        const document = addWorkspaceDocument(shared, uri, text);

        vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
        client.open(uri.toString(), 1, text);
        await vi.advanceTimersByTimeAsync(0);
        parseProgramSpy.mockClear();

        // Establishes lastRebuildTrigger = 'on-save' via one rebuild under the current mode --
        // mirrors the real sequence, where buildDocuments()/runBbjcplForDocuments() already ran
        // at least once while this trigger was current before a user ever switches modes.
        await privates.runBbjcplForDocuments([document], CancellationToken.None);
        await vi.advanceTimersByTimeAsync(0);
        parseProgramSpy.mockClear();

        setCompilerTrigger('debounced');
        await privates.runBbjcplForDocuments([document], CancellationToken.None);
        await vi.advanceTimersByTimeAsync(1000);
        expect(parseProgramSpy).not.toHaveBeenCalled();

        client.change(uri.toString(), 2, [replaceLines(0, 1, 'x = 2\n')]);
        await vi.advanceTimersByTimeAsync(499);
        expect(parseProgramSpy).not.toHaveBeenCalled();
        await vi.advanceTimersByTimeAsync(1);
        expect(parseProgramSpy).toHaveBeenCalledTimes(1);
    });

    test('debounced then a switch to on-save: the rebuild arms nothing, and typing arms nothing', async () => {
        const { shared, interopService, client, privates } = createHarness();
        setCompilerTrigger('debounced');
        interopService.scriptParseProgram({ errors: [] });
        const parseProgramSpy = vi.spyOn(interopService, 'parseProgram');

        const uri = URI.file('/proj/switch-to-on-save.bbj');
        const text = 'x = 1\n';
        const document = addWorkspaceDocument(shared, uri, text);

        vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
        client.open(uri.toString(), 1, text);
        await vi.advanceTimersByTimeAsync(600);
        parseProgramSpy.mockClear();

        setCompilerTrigger('on-save');
        await privates.runBbjcplForDocuments([document], CancellationToken.None);
        await vi.advanceTimersByTimeAsync(1000);
        expect(parseProgramSpy).not.toHaveBeenCalled();

        client.change(uri.toString(), 2, [replaceLines(0, 1, 'x = 2\n')]);
        await vi.advanceTimersByTimeAsync(1000);
        expect(parseProgramSpy).not.toHaveBeenCalled();
    });

    test('a switch to off clears BBjCPL and BBj Parser diagnostics as before', async () => {
        const { shared, interopService, client, privates } = createHarness();
        setCompilerTrigger('debounced');
        interopService.scriptParseProgram({ errors: [] });

        const uri = URI.file('/proj/switch-to-off.bbj');
        const text = 'x = 1\n';
        const document = addWorkspaceDocument(shared, uri, text);

        vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
        client.open(uri.toString(), 1, text);
        await vi.advanceTimersByTimeAsync(600);

        // A stale BBjCPL diagnostic left over from an earlier cycle.
        document.diagnostics = [
            ...(document.diagnostics ?? []),
            {
                range: { start: { line: 0, character: 0 }, end: { line: 0, character: 1 } },
                message: 'stale bbjcpl error',
                severity: DiagnosticSeverity.Error,
                source: 'BBjCPL',
            },
        ];

        setCompilerTrigger('off');
        await privates.runBbjcplForDocuments([document], CancellationToken.None);

        expect(document.diagnostics?.some(d => d.source === 'BBjCPL')).toBe(false);
    });

    test('debounced without a switch: a save arms nothing, a change arms a 500ms cycle, and the first rebuild on a fresh builder arms as before', async () => {
        const { shared, interopService, client, privates } = createHarness();
        // Trigger defaults to 'debounced' (set explicitly for clarity).
        setCompilerTrigger('debounced');
        interopService.scriptParseProgram({ errors: [] });
        const parseProgramSpy = vi.spyOn(interopService, 'parseProgram');

        const uri = URI.file('/proj/debounced-steady.bbj');
        const text = 'x = 1\n';
        const document = addWorkspaceDocument(shared, uri, text);

        vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
        client.open(uri.toString(), 1, text);
        await vi.advanceTimersByTimeAsync(600);
        parseProgramSpy.mockClear();

        client.save(uri.toString());
        await vi.advanceTimersByTimeAsync(1000);
        expect(parseProgramSpy).not.toHaveBeenCalled();

        client.change(uri.toString(), 2, [replaceLines(0, 1, 'x = 2\n')]);
        await vi.advanceTimersByTimeAsync(499);
        expect(parseProgramSpy).not.toHaveBeenCalled();
        await vi.advanceTimersByTimeAsync(1);
        expect(parseProgramSpy).toHaveBeenCalledTimes(1);
        parseProgramSpy.mockClear();

        // The first rebuild this fresh builder's runBbjcplForDocuments has ever seen -- no prior
        // lastRebuildTrigger, so it arms exactly as before this phase.
        await privates.runBbjcplForDocuments([document], CancellationToken.None);
        await vi.advanceTimersByTimeAsync(500);
        expect(parseProgramSpy).toHaveBeenCalledTimes(1);
    });

    test('off: open, change and save events all arm no compiler check', async () => {
        const { shared, interopService, client } = createHarness();
        setCompilerTrigger('off');
        interopService.scriptParseProgram({ errors: [] });
        const parseProgramSpy = vi.spyOn(interopService, 'parseProgram');

        const uri = URI.file('/proj/off-events.bbj');
        const text = 'x = 1\n';
        addWorkspaceDocument(shared, uri, text);

        vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
        client.open(uri.toString(), 1, text);
        await vi.advanceTimersByTimeAsync(1000);
        expect(parseProgramSpy).not.toHaveBeenCalled();

        client.change(uri.toString(), 2, [replaceLines(0, 1, 'x = 2\n')]);
        await vi.advanceTimersByTimeAsync(1000);
        expect(parseProgramSpy).not.toHaveBeenCalled();

        client.save(uri.toString());
        await vi.advanceTimersByTimeAsync(1000);
        expect(parseProgramSpy).not.toHaveBeenCalled();
    });
});
