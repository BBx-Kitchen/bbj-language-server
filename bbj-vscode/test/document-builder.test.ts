import type { LangiumDocument, LangiumSharedCoreServices } from 'langium';
import { CancellationToken, EmptyFileSystem, URI } from 'langium';
import type { Diagnostic } from 'vscode-languageserver';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { createBBjServices } from '../src/language/bbj-module.js';
import { BBjDocumentBuilder } from '../src/language/bbj-document-builder.js';
import { BBjWorkspaceManager } from '../src/language/bbj-ws-manager.js';
import { logger } from '../src/language/logger.js';

vi.mock('../src/language/bbj-notifications.js', () => ({
    notifyBbjcplAvailability: vi.fn(),
}));

/**
 * Regression harness for RU-61-05's `BBjDocumentBuilder` findings (P61-D2-017, P61-D3-005,
 * P61-D5-016). Constructs a `BBjDocumentBuilder` directly (bypassing DI) with a mocked
 * `ServiceRegistry` (so `BBjCPLService.compile` is a controllable `vi.fn()`) and mocked
 * `TextDocuments`, while reusing a real `BBjWorkspaceManager`/`IndexManager` pair from
 * `createBBjServices(EmptyFileSystem)` for everything else this unit touches.
 */
function buildHarness() {
    const services = createBBjServices(EmptyFileSystem);
    const wsManager = services.shared.workspace.WorkspaceManager as BBjWorkspaceManager;

    const compileMock = vi.fn<(filePath: string) => Promise<Diagnostic[]>>();
    const fakeServiceRegistry = {
        getServices: () => ({
            compiler: { BBjCPLService: { compile: compileMock } },
        }),
    };

    const openDocumentUris = new Set<string>();
    const fakeTextDocuments = {
        get: (uri: URI) => (openDocumentUris.has(uri.toString()) ? {} : undefined),
    };

    const fakeServices = {
        workspace: {
            LangiumDocuments: services.shared.workspace.LangiumDocuments,
            LangiumDocumentFactory: services.shared.workspace.LangiumDocumentFactory,
            TextDocuments: fakeTextDocuments,
            IndexManager: services.shared.workspace.IndexManager,
            FileSystemProvider: services.shared.workspace.FileSystemProvider,
            WorkspaceManager: wsManager,
        },
        ServiceRegistry: fakeServiceRegistry,
    };

    const builder = new BBjDocumentBuilder(fakeServices as unknown as LangiumSharedCoreServices);
    return { builder, wsManager, compileMock, openDocumentUris, indexManager: services.shared.workspace.IndexManager };
}

function fakeDocument(path: string, diagnostics: Diagnostic[] = []): LangiumDocument {
    return {
        uri: URI.file(path),
        diagnostics,
    } as unknown as LangiumDocument;
}

/** Structural view onto the builder's private members under test, reached via cast. */
type BuilderPrivates = {
    debouncedCompile(document: LangiumDocument): void;
    trackBbjcplAvailability(): void;
    bbjcplAvailable: boolean | undefined;
    revalidateUseFilePathDiagnostics(documents: LangiumDocument[], cancelToken: CancellationToken): Promise<void>;
};

afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
});

describe('debouncedCompile catches and logs callback errors (P61-D2-017)', () => {
    test('a rejecting BBjCPLService.compile is caught and logged via logger.error', async () => {
        vi.useFakeTimers();
        const { builder, compileMock } = buildHarness();
        compileMock.mockRejectedValue(new Error('cpl compile boom'));
        const errorSpy = vi.spyOn(logger, 'error').mockImplementation(() => { });

        const doc = fakeDocument('/proj/foo.bbj');
        (builder as unknown as BuilderPrivates).debouncedCompile(doc);

        // Fire the 500ms trailing-edge debounce timer, then let the rejected
        // compile() promise's catch handler run.
        await vi.advanceTimersByTimeAsync(600);

        expect(compileMock).toHaveBeenCalledOnce();
        expect(errorSpy).toHaveBeenCalled();
    });
});
