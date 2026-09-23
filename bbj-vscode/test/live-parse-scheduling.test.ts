import { DocumentState, EmptyFileSystem, URI } from 'langium';
import type { LangiumDocument, LangiumSharedCoreServices } from 'langium';
import type { NormalizedTextDocuments } from 'langium/lsp';
import { BBjDocumentBuilder } from '../src/language/bbj-document-builder.js';
import { BBjWorkspaceManager } from '../src/language/bbj-ws-manager.js';
import { TextDocument } from 'vscode-languageserver-textdocument';
import type { Diagnostic } from 'vscode-languageserver';
import { DiagnosticSeverity } from 'vscode-languageserver';
import { CancellationToken } from 'vscode-jsonrpc';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { BBJ_PARSER_SOURCE } from '../src/language/bbj-parser-service.js';
import type { ParseError } from '../src/language/java-interop.js';
import { setCompilerTrigger } from '../src/language/bbj-document-validator.js';
import { clearAllVerdictStates } from '../src/language/bbj-diagnostic-reconciliation.js';
import { createBBjTestServices, JavaInteropTestService } from './bbj-test-module.js';
import { initializeWorkspace } from './test-helper.js';

/**
 * End-to-end coverage for the live-parse cycle armed directly from a text-document event,
 * outside Langium's own workspace-build lock: a real `BBjDocumentBuilder` and a real
 * `BBjParserService`, driven through the hermetic `JavaInteropTestService` double, with a real
 * `WorkspaceLock` held by an unresolved write action standing in for a long initial workspace
 * build.
 */

/** Structural view onto the builder's private/protected members under test, reached via cast. */
type BuilderPrivates = {
    bbjcplAvailable: boolean | undefined;
    sendDiagnosticsToClient(uri: URI, diagnostics: Diagnostic[]): void;
    runBbjcplForDocuments(documents: LangiumDocument[], cancelToken: CancellationToken): Promise<void>;
};

/** A fresh, real `BBjDocumentBuilder` (via `createBBjTestServices`) with `bbjcplAvailable` forced
 * on -- there is no BBj install in this test environment, and every test here is about the event
 * path, not availability detection. */
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

/**
 * Drains one real macrotask turn on top of `vi.advanceTimersByTimeAsync`. Needed only for a
 * cycle that reaches `notifyDocumentPhase` for real (a document already at the Validated state):
 * Langium's own `interruptAndCheck` compares its `CancellationToken.None` (from
 * `vscode-languageserver-protocol`) by identity against whatever token is passed in, and this
 * codebase's own `CancellationToken.None` (from `vscode-jsonrpc`) is a structurally-equal but
 * distinct object, so the comparison fails and `interruptAndCheck` takes its `delayNextTick()`
 * branch -- a real `setImmediate`, which `toFake: ['setTimeout', 'clearTimeout']` does not cover.
 * Pre-existing behaviour of `notifyDocumentPhase`, unrelated to this phase's own change; every
 * other cycle in this file ends at `sendDiagnosticsToClient` instead and never needs this.
 */
function flushRealMacrotask(): Promise<void> {
    return new Promise(resolve => setImmediate(resolve));
}

afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    clearAllVerdictStates();
    setCompilerTrigger('debounced');
});

describe('live-parse scheduling', () => {
    test('a change event while the workspace lock is held publishes a live parser diagnostic before the lock is released', async () => {
        const { shared, builder, privates, interopService, textDocuments } = createHarness();

        const scriptedError: ParseError = {
            categories: ['SyntaxError'],
            message: 'unclosed parenthesis',
            editorStartLine: 2,
            editorEndLine: 2,
            startCharacter: 1,
            endCharacter: 5,
        };
        interopService.scriptParseProgram({ errors: [scriptedError] });
        const parseProgramSpy = vi.spyOn(interopService, 'parseProgram');

        const uri = URI.file('/proj/early.bbj');
        const uriString = uri.toString();
        const originalText = 'x = 1\ny = 2\n';
        const editedText = 'x = 1\ny = (2\n';
        const document = addWorkspaceDocument(shared, uri, originalText);
        // A file the startup scan loaded but a build has never touched -- Parsed, not Validated.
        expect(document.state).toBe(DocumentState.Parsed);

        const validatedPhaseSpy = vi.fn();
        builder.onDocumentPhase(DocumentState.Validated, validatedPhaseSpy);
        const sendSpy = vi.spyOn(privates, 'sendDiagnosticsToClient');

        // Hold the workspace lock -- standing in for a long initial workspace build still in
        // flight -- then queue a second write standing in for the rebuild Langium's own
        // document-update handler would enqueue once the change event reaches it.
        let releaseHeldWrite: () => void = () => { /* replaced below */ };
        const heldWritePromise = new Promise<void>(resolve => { releaseHeldWrite = resolve; });
        const heldWriteResult = shared.workspace.WorkspaceLock.write(() => heldWritePromise);
        let queuedWriteRan = false;
        const queuedWriteResult = shared.workspace.WorkspaceLock.write(() => { queuedWriteRan = true; });

        vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
        try {
            openOrChange(textDocuments, uriString, 7, editedText);
            await vi.advanceTimersByTimeAsync(600);

            expect(parseProgramSpy).toHaveBeenCalledTimes(1);
            expect(parseProgramSpy.mock.calls[0][0]).toMatchObject({ text: editedText, version: '7' });

            expect(sendSpy).toHaveBeenCalledTimes(1);
            const [, publishedDiagnostics] = sendSpy.mock.calls[0];
            expect(publishedDiagnostics).toHaveLength(1);
            expect(publishedDiagnostics[0].source).toBe(BBJ_PARSER_SOURCE);

            // Below Validated: the client got the diagnostic straight away, but the document was
            // never written and no request waiting on the Validated phase was released.
            expect(validatedPhaseSpy).not.toHaveBeenCalled();
            expect(document.diagnostics).toBeUndefined();

            // The lock is still held -- the queued write has not run yet.
            expect(queuedWriteRan).toBe(false);
        } finally {
            releaseHeldWrite();
        }

        await Promise.all([heldWriteResult, queuedWriteResult]);
        expect(queuedWriteRan).toBe(true);
    });

    test('an open event for a loaded, open file: document arms one cycle', async () => {
        const { shared, interopService, textDocuments } = createHarness();
        const scriptedError: ParseError = {
            categories: ['SyntaxError'],
            message: 'unexpected token',
            editorStartLine: 1,
            editorEndLine: 1,
            startCharacter: 1,
            endCharacter: 3,
        };
        interopService.scriptParseProgram({ errors: [scriptedError] });
        const parseProgramSpy = vi.spyOn(interopService, 'parseProgram');

        const uri = URI.file('/proj/opened.bbj');
        const text = 'x = 1\n';
        addWorkspaceDocument(shared, uri, text);

        vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
        openOrChange(textDocuments, uri.toString(), 1, text);
        await vi.advanceTimersByTimeAsync(600);

        expect(parseProgramSpy).toHaveBeenCalledTimes(1);
        expect(parseProgramSpy.mock.calls[0][0]).toMatchObject({ text, version: '1' });
    });

    test('an open event for a uri with no LangiumDocument yet defers until the workspace reports ready', async () => {
        const { shared, interopService, textDocuments } = createHarness();
        interopService.scriptParseProgram({ errors: [] });
        const parseProgramSpy = vi.spyOn(interopService, 'parseProgram');

        const uri = URI.file('/proj/late.bbj');
        const uriString = uri.toString();
        const text = 'x = 1\n';

        vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
        // Five events for a uri the workspace has not loaded yet: none produces a request, and
        // only one pending "arm once ready" entry is kept for this uri.
        for (let version = 1; version <= 5; version++) {
            openOrChange(textDocuments, uriString, version, text);
        }
        await vi.advanceTimersByTimeAsync(600);
        expect(parseProgramSpy).not.toHaveBeenCalled();

        addWorkspaceDocument(shared, uri, text);
        await initializeWorkspace(shared);
        await vi.advanceTimersByTimeAsync(600);

        expect(parseProgramSpy).toHaveBeenCalledTimes(1);
        expect(parseProgramSpy.mock.calls[0][0]).toMatchObject({ text, version: '5' });
    });

    test('with the compiler trigger off, a change event requests nothing and leaves hasPendingCompile() false', async () => {
        const { shared, builder, interopService, textDocuments } = createHarness();
        const parseProgramSpy = vi.spyOn(interopService, 'parseProgram');
        setCompilerTrigger('off');

        const uri = URI.file('/proj/trigger-off.bbj');
        const text = 'x = 1\n';
        addWorkspaceDocument(shared, uri, text);

        vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
        openOrChange(textDocuments, uri.toString(), 1, text);
        await vi.advanceTimersByTimeAsync(600);

        expect(parseProgramSpy).not.toHaveBeenCalled();
        expect(builder.hasPendingCompile()).toBe(false);
    });

    test('a change event for a non-file: uri, and for a document under a configured PREFIX directory, arms nothing', async () => {
        const { shared, builder, interopService, textDocuments } = createHarness();
        const parseProgramSpy = vi.spyOn(interopService, 'parseProgram');

        const nonFileUri = URI.parse('untitled:/scratch.bbj');
        const nonFileText = 'x = 1\n';
        addWorkspaceDocument(shared, nonFileUri, nonFileText);

        const wsManagerSettings = shared.workspace.WorkspaceManager as unknown as {
            settings: { prefixes: string[]; classpath: string[] };
        };
        wsManagerSettings.settings = { prefixes: ['/prefix'], classpath: [] };
        const externalUri = URI.file('/prefix/lib.bbj');
        const externalText = 'y = 2\n';
        addWorkspaceDocument(shared, externalUri, externalText);

        vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
        openOrChange(textDocuments, nonFileUri.toString(), 1, nonFileText);
        openOrChange(textDocuments, externalUri.toString(), 1, externalText);
        await vi.advanceTimersByTimeAsync(600);

        expect(parseProgramSpy).not.toHaveBeenCalled();
        expect(builder.hasPendingCompile()).toBe(false);
    });

    test('a change event followed within 500 ms by a rebuild-driven trigger produces exactly one parse request', async () => {
        const { shared, privates, interopService, textDocuments } = createHarness();
        interopService.scriptParseProgram({ errors: [] });
        const parseProgramSpy = vi.spyOn(interopService, 'parseProgram');

        const uri = URI.file('/proj/merge.bbj');
        const text = 'x = 1\n';
        const document = addWorkspaceDocument(shared, uri, text);

        vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
        openOrChange(textDocuments, uri.toString(), 1, text);
        await vi.advanceTimersByTimeAsync(200);

        await privates.runBbjcplForDocuments([document], CancellationToken.None);
        await vi.advanceTimersByTimeAsync(600);

        expect(parseProgramSpy).toHaveBeenCalledTimes(1);
    });

    test.each([
        ['transport-error' as const],
        ['method-not-found' as const],
    ])('an early cycle whose live parse is scripted %s falls back to the save-time compile and sends the merged result to the client', async script => {
        const { shared, BBj, privates, interopService, textDocuments } = createHarness();
        interopService.scriptParseProgram(script);
        const cplDiagnostic: Diagnostic = {
            range: { start: { line: 0, character: 0 }, end: { line: 0, character: 5 } },
            message: 'save-time compile found this',
            severity: DiagnosticSeverity.Error,
            source: 'BBjCPL',
        };
        const compileSpy = vi.spyOn(BBj.compiler.BBjCPLService, 'compile').mockResolvedValue([cplDiagnostic]);
        const sendSpy = vi.spyOn(privates, 'sendDiagnosticsToClient');

        const uri = URI.file(`/proj/fallback-${script}.bbj`);
        const text = 'x = 1\n';
        addWorkspaceDocument(shared, uri, text);

        vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
        openOrChange(textDocuments, uri.toString(), 1, text);
        await vi.advanceTimersByTimeAsync(600);

        expect(compileSpy).toHaveBeenCalledTimes(1);
        expect(sendSpy).toHaveBeenCalledTimes(1);
        const [, diagnostics] = sendSpy.mock.calls[0];
        expect(diagnostics).toEqual([cplDiagnostic]);
    });

    test('between the event and the timer firing, hasPendingCompile() and hasPendingWork() are true; after the cycle they are false', async () => {
        const { shared, builder, interopService, textDocuments } = createHarness();
        interopService.scriptParseProgram({ errors: [] });
        await builder.build([], {});
        expect(builder.hasPendingWork()).toBe(false);

        const uri = URI.file('/proj/pending.bbj');
        const text = 'x = 1\n';
        addWorkspaceDocument(shared, uri, text);

        vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
        openOrChange(textDocuments, uri.toString(), 1, text);

        expect(builder.hasPendingCompile()).toBe(true);
        expect(builder.hasPendingWork()).toBe(true);

        await vi.advanceTimersByTimeAsync(600);

        expect(builder.hasPendingCompile()).toBe(false);
    });

    test('a cycle for a document whose state is Validated writes document.diagnostics and fires the Validated phase once', async () => {
        const { shared, builder, privates, interopService, textDocuments } = createHarness();
        const scriptedError: ParseError = {
            categories: ['SyntaxError'],
            message: 'validated-document diagnostic',
            editorStartLine: 1,
            editorEndLine: 1,
            startCharacter: 1,
            endCharacter: 3,
        };
        interopService.scriptParseProgram({ errors: [scriptedError] });
        const sendSpy = vi.spyOn(privates, 'sendDiagnosticsToClient');
        const validatedPhaseSpy = vi.fn();
        builder.onDocumentPhase(DocumentState.Validated, validatedPhaseSpy);

        const uri = URI.file('/proj/already-validated.bbj');
        const text = 'x = 1\n';
        const document = addWorkspaceDocument(shared, uri, text);
        document.state = DocumentState.Validated;

        vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
        openOrChange(textDocuments, uri.toString(), 1, text);
        await vi.advanceTimersByTimeAsync(600);
        await flushRealMacrotask();

        expect(document.diagnostics).toHaveLength(1);
        expect(document.diagnostics![0].source).toBe(BBJ_PARSER_SOURCE);
        expect(validatedPhaseSpy).toHaveBeenCalledTimes(1);
        expect(sendSpy).not.toHaveBeenCalled();
    });
});

describe('sendDiagnosticsToClient', () => {
    /** Constructs `BBjDocumentBuilder` with hand-built fake services the way
     * `document-builder.test.ts`'s own `buildHarness()` does, optionally adding a fake
     * `lsp.Connection`. */
    function buildConnectionHarness(withConnection: boolean) {
        const services = createBBjTestServices(EmptyFileSystem);
        const wsManager = services.shared.workspace.WorkspaceManager as BBjWorkspaceManager;
        const sendDiagnosticsMock = vi.fn().mockResolvedValue(undefined);
        const fakeServiceRegistry = {
            getServices: () => ({
                compiler: {
                    BBjCPLService: services.BBj.compiler.BBjCPLService,
                    BBjParserService: services.BBj.compiler.BBjParserService,
                },
            }),
        };
        const fakeServices: Record<string, unknown> = {
            workspace: {
                LangiumDocuments: services.shared.workspace.LangiumDocuments,
                LangiumDocumentFactory: services.shared.workspace.LangiumDocumentFactory,
                TextDocuments: { get: () => undefined },
                IndexManager: services.shared.workspace.IndexManager,
                FileSystemProvider: services.shared.workspace.FileSystemProvider,
                WorkspaceManager: wsManager,
            },
            ServiceRegistry: fakeServiceRegistry,
        };
        if (withConnection) {
            fakeServices.lsp = { Connection: { sendDiagnostics: sendDiagnosticsMock } };
        }
        const builder = new BBjDocumentBuilder(fakeServices as unknown as LangiumSharedCoreServices);
        return { builder, sendDiagnosticsMock };
    }

    test('forwards to connection.sendDiagnostics with the uri string when an LSP connection exists', () => {
        const { builder, sendDiagnosticsMock } = buildConnectionHarness(true);
        const privates = builder as unknown as BuilderPrivates;
        const uri = URI.file('/proj/connection.bbj');
        const diagnostics: Diagnostic[] = [{
            range: { start: { line: 0, character: 0 }, end: { line: 0, character: 1 } },
            message: 'a diagnostic',
            severity: DiagnosticSeverity.Error,
            source: BBJ_PARSER_SOURCE,
        }];

        privates.sendDiagnosticsToClient(uri, diagnostics);

        expect(sendDiagnosticsMock).toHaveBeenCalledTimes(1);
        expect(sendDiagnosticsMock).toHaveBeenCalledWith({ uri: uri.toString(), diagnostics });
    });

    test('does nothing when no LSP connection is available', () => {
        const { builder } = buildConnectionHarness(false);
        const privates = builder as unknown as BuilderPrivates;
        const uri = URI.file('/proj/no-connection.bbj');

        expect(() => privates.sendDiagnosticsToClient(uri, [])).not.toThrow();
    });
});
