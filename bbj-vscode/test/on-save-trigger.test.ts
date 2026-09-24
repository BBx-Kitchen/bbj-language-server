import { EmptyFileSystem, URI } from 'langium';
import type { LangiumDocument } from 'langium';
import type { NormalizedTextDocuments } from 'langium/lsp';
import type { InitializeParams, InitializeResult } from 'vscode-languageserver';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { BBjDocumentBuilder } from '../src/language/bbj-document-builder.js';
import { setCompilerTrigger } from '../src/language/bbj-document-validator.js';
import { clearAllVerdictStates } from '../src/language/bbj-diagnostic-reconciliation.js';
import { createBBjTestServices, JavaInteropTestService } from './bbj-test-module.js';
import { listenOnFakeConnection } from './fake-text-document-connection.js';

/**
 * End-to-end coverage for the `on-save` compiler trigger: the server's advertised save
 * capability, a save arming exactly one zero-delay check through the real text-document store
 * (`listenOnFakeConnection`), and the save-time compile fallback when the live parse is
 * unavailable.
 */

/** Structural view onto the builder's private `bbjcplAvailable` field. */
type BuilderPrivates = {
    bbjcplAvailable: boolean | undefined;
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
