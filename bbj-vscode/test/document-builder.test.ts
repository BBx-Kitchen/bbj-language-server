import type { AstNodeDescription, LangiumDocument, LangiumSharedCoreServices } from 'langium';
import { EmptyFileSystem, URI, stream } from 'langium';
import { CancellationToken } from 'vscode-jsonrpc';
import { TextDocument } from 'vscode-languageserver-textdocument';
import type { Diagnostic } from 'vscode-languageserver';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { createBBjServices } from '../src/language/bbj-module.js';
import { BBjDocumentBuilder } from '../src/language/bbj-document-builder.js';
import { BBjWorkspaceManager } from '../src/language/bbj-ws-manager.js';
import { BbjClass } from '../src/language/generated/ast.js';
import { USE_FILE_NOT_RESOLVED_PREFIX } from '../src/language/bbj-validator.js';
import { BBJ_PARSER_SOURCE, type LiveParseOutcome } from '../src/language/bbj-parser-service.js';
import { clearAllVerdictStates } from '../src/language/bbj-diagnostic-reconciliation.js';
import { logger } from '../src/language/logger.js';

vi.mock('../src/language/bbj-notifications.js', () => ({
    notifyBbjcplAvailability: vi.fn(),
}));
import { notifyBbjcplAvailability } from '../src/language/bbj-notifications.js';

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
    const isEnabledMock = vi.fn<() => boolean>().mockReturnValue(true);
    const requestLiveParseMock = vi.fn<(document: LangiumDocument) => Promise<LiveParseOutcome>>()
        .mockResolvedValue({ kind: 'unavailable' });
    const fakeServiceRegistry = {
        getServices: () => ({
            compiler: {
                BBjCPLService: { compile: compileMock },
                BBjParserService: { isEnabled: isEnabledMock, requestLiveParse: requestLiveParseMock },
            },
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
    return {
        builder,
        wsManager,
        compileMock,
        isEnabledMock,
        requestLiveParseMock,
        openDocumentUris,
        indexManager: services.shared.workspace.IndexManager,
    };
}

function fakeDocument(path: string, diagnostics: Diagnostic[] = [], text = ''): LangiumDocument {
    const uri = URI.file(path);
    return {
        uri,
        diagnostics,
        textDocument: TextDocument.create(uri.toString(), 'bbj', 1, text),
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
    vi.clearAllMocks();
    vi.useRealTimers();
    // Verdict state is module-scoped, keyed by document uri; clear it so an earlier test's
    // carried-over state can never leak into a later one.
    clearAllVerdictStates();
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

describe('revalidateUseFilePathDiagnostics scans the index a bounded number of times per update (P61-D3-005)', () => {
    test('allElements() is called once per update, not once per diagnostic, with identical results', async () => {
        const { builder, wsManager, indexManager } = buildHarness();
        (wsManager as unknown as { settings: { prefixes: string[]; classpath: string[] } }).settings =
            { prefixes: ['/prefix'], classpath: [] };

        const resolvedUri = URI.file('/prefix/Resolved.bbj');
        const fakeClassDescription = {
            type: BbjClass.$type,
            name: 'Resolved',
            documentUri: resolvedUri,
        } as unknown as AstNodeDescription;

        const allElementsSpy = vi.spyOn(indexManager, 'allElements').mockReturnValue(stream([fakeClassDescription]));

        const resolvedDiagMessage = `${USE_FILE_NOT_RESOLVED_PREFIX}Resolved.bbj' could not be resolved.`;
        const unresolvedDiagMessage = `${USE_FILE_NOT_RESOLVED_PREFIX}Missing.bbj' could not be resolved.`;
        const range = { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } };
        const makeDiags = (): Diagnostic[] => [
            { message: resolvedDiagMessage, range, severity: 2 },
            { message: unresolvedDiagMessage, range, severity: 2 },
        ];

        const doc1 = fakeDocument('/proj/main1.bbj', makeDiags());
        const doc2 = fakeDocument('/proj/main2.bbj', makeDiags());

        await (builder as unknown as BuilderPrivates).revalidateUseFilePathDiagnostics([doc1, doc2], CancellationToken.None);

        // Bounded: at most one index scan for the whole batch, not once per diagnostic
        // (4 diagnostics across the 2 documents here).
        expect(allElementsSpy.mock.calls.length).toBeLessThanOrEqual(1);

        // Result equivalence: the now-resolved diagnostic is removed from every document,
        // the still-unresolved one survives — same outcome the per-lookup scan produced.
        expect(doc1.diagnostics?.map(d => d.message)).toEqual([unresolvedDiagMessage]);
        expect(doc2.diagnostics?.map(d => d.message)).toEqual([unresolvedDiagMessage]);
    });
});

describe('trackBbjcplAvailability dedup and debouncedCompile timing (P61-D5-016)', () => {
    test('trackBbjcplAvailability only notifies once across repeated calls (lazy, once-only guard)', () => {
        const { builder } = buildHarness();
        const privates = builder as unknown as BuilderPrivates;

        // wsManager.getBBjDir() is "" by default in this harness, so both calls take the
        // "unavailable" branch — the dedup guard under test is bbjcplAvailable !== undefined,
        // not the notification module's own value-change dedup.
        privates.trackBbjcplAvailability();
        privates.trackBbjcplAvailability();

        expect(privates.bbjcplAvailable).toBe(false);
        expect(vi.mocked(notifyBbjcplAvailability)).toHaveBeenCalledOnce();
    });

    test('debouncedCompile coalesces rapid successive calls into one compile after the debounce window', async () => {
        vi.useFakeTimers();
        const { builder, compileMock } = buildHarness();
        compileMock.mockResolvedValue([]);

        const doc = fakeDocument('/proj/rapid.bbj');
        const privates = builder as unknown as BuilderPrivates;
        // Simulate 3 rapid saves of the same file before the debounce window elapses.
        privates.debouncedCompile(doc);
        privates.debouncedCompile(doc);
        privates.debouncedCompile(doc);

        await vi.advanceTimersByTimeAsync(600);

        expect(compileMock).toHaveBeenCalledOnce();
    });
});

describe('debouncedCompile clears stale live-parser diagnostics before the BBjCPL merge step', () => {
    test('a fresh same-line BBjCPL diagnostic from a fallback cycle is not absorbed into a leftover live-parser entry from a prior verdict cycle', async () => {
        vi.useFakeTimers();
        const { builder, compileMock, requestLiveParseMock } = buildHarness();
        const privates = builder as unknown as BuilderPrivates;
        const doc = fakeDocument('/proj/persistent-error.bbj');
        const line5Range = { start: { line: 5, character: 0 }, end: { line: 5, character: 10 } };

        // First debounce cycle: a verdict carrying one live-parser diagnostic on line 5. The
        // save-time compile does not run this cycle.
        requestLiveParseMock.mockResolvedValueOnce({
            kind: 'verdict',
            diagnostics: [
                { message: 'stale live-parser message', range: line5Range, severity: 1, source: BBJ_PARSER_SOURCE },
            ],
        });
        privates.debouncedCompile(doc);
        await vi.advanceTimersByTimeAsync(600);

        expect(doc.diagnostics?.map(d => ({ source: d.source, message: d.message }))).toEqual([
            { source: BBJ_PARSER_SOURCE, message: 'stale live-parser message' },
        ]);
        expect(compileMock).not.toHaveBeenCalled();

        // Second debounce cycle: the live parse fails, so this cycle falls back to the save-time
        // compile, which now flags the same line with a new message. The BBjCPL diagnostic must
        // win with its own current message, not the leftover live-parser text from the previous
        // cycle's verdict.
        requestLiveParseMock.mockResolvedValueOnce({ kind: 'failed' });
        compileMock.mockResolvedValueOnce([
            { message: 'current bbjcpl message', range: line5Range, severity: 1, source: 'BBjCPL' },
        ]);
        privates.debouncedCompile(doc);
        await vi.advanceTimersByTimeAsync(600);

        expect(doc.diagnostics?.map(d => ({ source: d.source, message: d.message }))).toEqual([
            { source: 'BBjCPL', message: 'current bbjcpl message' },
        ]);
    });
});
