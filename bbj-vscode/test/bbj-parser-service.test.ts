import type { LangiumDocument, LangiumSharedCoreServices } from 'langium';
import { EmptyFileSystem, URI } from 'langium';
import { TextDocument } from 'vscode-languageserver-textdocument';
import type { Diagnostic } from 'vscode-languageserver';
import { DiagnosticSeverity } from 'vscode-languageserver';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { BBjDocumentBuilder } from '../src/language/bbj-document-builder.js';
import { BBjWorkspaceManager } from '../src/language/bbj-ws-manager.js';
import { BBJ_PARSER_SOURCE, BBjParserService } from '../src/language/bbj-parser-service.js';
import { END_OF_LINE_CHARACTER } from '../src/language/lsp-position.js';
import type { ParseError } from '../src/language/java-interop.js';
import { logger } from '../src/language/logger.js';
import { createBBjTestServices, JavaInteropTestService } from './bbj-test-module.js';

/**
 * End-to-end harness for the live parser diagnostics client: a real `BBjDocumentBuilder` driving
 * a real `BBjParserService` over the hermetic `JavaInteropTestService` double, exactly the shape
 * `document-builder.test.ts`'s `buildHarness()` already establishes for the sibling `BBjCPLService`
 * path, plus a real `TextDocument` per `bbj-document-builder-config.test.ts`'s `fakeTextDocuments`.
 */
function buildHarness() {
    const services = createBBjTestServices(EmptyFileSystem);
    const wsManager = services.shared.workspace.WorkspaceManager as BBjWorkspaceManager;
    const interopService = services.BBj.java.JavaInteropService as JavaInteropTestService;

    const parserService = new BBjParserService({
        shared: { workspace: { WorkspaceManager: wsManager } },
        java: { JavaInteropService: interopService }
    });

    const compileMock = vi.fn<(filePath: string) => Promise<Diagnostic[]>>();
    const fakeServiceRegistry = {
        getServices: () => ({
            compiler: { BBjCPLService: { compile: compileMock }, BBjParserService: parserService },
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
    return { builder, wsManager, interopService, parserService, compileMock, openDocumentUris };
}

/** A real `TextDocument`-backed `LangiumDocument` stub — `getText()`/`lineCount` are live. */
function fakeDocument(path: string, text: string, diagnostics: Diagnostic[] = []): LangiumDocument {
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
    notifyDocumentPhase(document: LangiumDocument, state: number, cancelToken: unknown): Promise<void>;
};

afterEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
    vi.useRealTimers();
});

describe('BBjParserService publishes a live diagnostic through the document builder', () => {
    test('publishes a live diagnostic', async () => {
        vi.useFakeTimers();
        const { builder, interopService, compileMock, openDocumentUris } = buildHarness();
        compileMock.mockResolvedValue([]);

        const scriptedError: ParseError = {
            categories: ['SyntaxError', 'LineNumberError'],
            message: 'unexpected token',
            editorStartLine: 2,
            editorEndLine: 2,
            startCharacter: 1,
            endCharacter: 12,
        };
        interopService.scriptParseProgram({ errors: [scriptedError] });

        const doc = fakeDocument('/proj/live.bbj', 'rem line 1\nprint "a",\n');
        openDocumentUris.add(doc.uri.toString());

        const privates = builder as unknown as BuilderPrivates;
        const notifySpy = vi.spyOn(privates, 'notifyDocumentPhase').mockResolvedValue(undefined);

        privates.debouncedCompile(doc);
        await vi.advanceTimersByTimeAsync(600);

        expect(doc.diagnostics).toHaveLength(1);
        const diagnostic = doc.diagnostics![0];
        expect(diagnostic.source).toBe(BBJ_PARSER_SOURCE);
        expect(diagnostic.severity).toBe(DiagnosticSeverity.Error);
        expect(diagnostic.message).toBe('unexpected token');
        expect(diagnostic.code).toBe('SyntaxError,LineNumberError');
        expect(diagnostic.range.start.line).toBe(1);
        expect(diagnostic.range.end.character).toBe(END_OF_LINE_CHARACTER);

        expect(notifySpy).toHaveBeenCalled();
    });
});

describe('BBjParserService behaves exactly as before against an older server', () => {
    test('an older server: one probe request, no diagnostic, the save-time compile still runs, then no further requests', async () => {
        vi.useFakeTimers();
        const { builder, interopService, compileMock, openDocumentUris } = buildHarness();
        compileMock.mockResolvedValue([]);
        // JavaInteropTestService defaults to the old-server (MethodNotFound) script — no scripting needed.

        const parseProgramSpy = vi.spyOn(interopService, 'parseProgram');
        const errorSpy = vi.spyOn(logger, 'error').mockImplementation(() => { });
        const warnSpy = vi.spyOn(logger, 'warn').mockImplementation(() => { });

        const doc = fakeDocument('/proj/old-server.bbj', 'rem line 1\nprint "a"\n');
        openDocumentUris.add(doc.uri.toString());

        const privates = builder as unknown as BuilderPrivates;
        vi.spyOn(privates, 'notifyDocumentPhase').mockResolvedValue(undefined);

        // Three separate edits, each its own debounce window.
        privates.debouncedCompile(doc);
        await vi.advanceTimersByTimeAsync(600);
        privates.debouncedCompile(doc);
        await vi.advanceTimersByTimeAsync(600);
        privates.debouncedCompile(doc);
        await vi.advanceTimersByTimeAsync(600);

        expect(doc.diagnostics).toHaveLength(0);
        expect(compileMock).toHaveBeenCalledTimes(3);
        expect(parseProgramSpy).toHaveBeenCalledTimes(1);
        expect(errorSpy).not.toHaveBeenCalled();
        expect(warnSpy).not.toHaveBeenCalled();
    });

    test('logs the mode once per connection, across two different documents', async () => {
        vi.useFakeTimers();
        const { builder, compileMock, openDocumentUris } = buildHarness();
        compileMock.mockResolvedValue([]);

        const infoSpy = vi.spyOn(logger, 'info').mockImplementation(() => { });
        const warnSpy = vi.spyOn(logger, 'warn').mockImplementation(() => { });
        const errorSpy = vi.spyOn(logger, 'error').mockImplementation(() => { });

        const docA = fakeDocument('/proj/a.bbj', 'rem a\n');
        const docB = fakeDocument('/proj/b.bbj', 'rem b\n');
        openDocumentUris.add(docA.uri.toString());
        openDocumentUris.add(docB.uri.toString());

        const privates = builder as unknown as BuilderPrivates;
        vi.spyOn(privates, 'notifyDocumentPhase').mockResolvedValue(undefined);

        privates.debouncedCompile(docA);
        await vi.advanceTimersByTimeAsync(600);
        privates.debouncedCompile(docB);
        await vi.advanceTimersByTimeAsync(600);

        const offModeCalls = infoSpy.mock.calls.filter(
            call => call[0] === 'Live compiler diagnostics: off (endpoint not available)'
        );
        expect(offModeCalls).toHaveLength(1);
        expect(warnSpy).not.toHaveBeenCalled();
        expect(errorSpy).not.toHaveBeenCalled();
    });

    test('after simulateReconnect the latch resets: the next edit sends a request again and picks up a scripted result', async () => {
        vi.useFakeTimers();
        const { builder, interopService, compileMock, openDocumentUris } = buildHarness();
        compileMock.mockResolvedValue([]);

        const doc = fakeDocument('/proj/reconnect.bbj', 'rem line 1\nprint "a"\n');
        openDocumentUris.add(doc.uri.toString());

        const privates = builder as unknown as BuilderPrivates;
        vi.spyOn(privates, 'notifyDocumentPhase').mockResolvedValue(undefined);
        const parseProgramSpy = vi.spyOn(interopService, 'parseProgram');

        // First edit: old-server default, probe latches off.
        privates.debouncedCompile(doc);
        await vi.advanceTimersByTimeAsync(600);
        expect(doc.diagnostics).toHaveLength(0);
        expect(parseProgramSpy).toHaveBeenCalledTimes(1);

        // Simulate a reconnect (post-outage, or a Java-class cache clear) and script a result.
        interopService.simulateReconnect();
        const scriptedError: ParseError = {
            categories: ['SyntaxError'],
            message: 'now available',
            editorStartLine: 1,
            editorEndLine: 1,
            startCharacter: 1,
            endCharacter: 5,
        };
        interopService.scriptParseProgram({ errors: [scriptedError] });

        privates.debouncedCompile(doc);
        await vi.advanceTimersByTimeAsync(600);

        expect(parseProgramSpy).toHaveBeenCalledTimes(2);
        expect(doc.diagnostics).toHaveLength(1);
        expect(doc.diagnostics![0].message).toBe('now available');
    });

    test('a result with zero errors clears previously published live diagnostics for that document', async () => {
        vi.useFakeTimers();
        const { builder, interopService, compileMock, openDocumentUris } = buildHarness();
        compileMock.mockResolvedValue([]);

        const scriptedError: ParseError = {
            categories: ['SyntaxError'],
            message: 'first parse has an error',
            editorStartLine: 1,
            editorEndLine: 1,
            startCharacter: 1,
            endCharacter: 5,
        };
        interopService.scriptParseProgram({ errors: [scriptedError] });

        const doc = fakeDocument('/proj/cleared.bbj', 'rem line 1\n');
        openDocumentUris.add(doc.uri.toString());

        const privates = builder as unknown as BuilderPrivates;
        vi.spyOn(privates, 'notifyDocumentPhase').mockResolvedValue(undefined);

        privates.debouncedCompile(doc);
        await vi.advanceTimersByTimeAsync(600);
        expect(doc.diagnostics).toHaveLength(1);

        interopService.scriptParseProgram({ errors: [] });
        privates.debouncedCompile(doc);
        await vi.advanceTimersByTimeAsync(600);

        expect(doc.diagnostics).toHaveLength(0);
    });

    test('parsing identical text twice leaves exactly one diagnostic, not two', async () => {
        vi.useFakeTimers();
        const { builder, interopService, compileMock, openDocumentUris } = buildHarness();
        compileMock.mockResolvedValue([]);

        const scriptedError: ParseError = {
            categories: ['SyntaxError'],
            message: 'repeated error',
            editorStartLine: 1,
            editorEndLine: 1,
            startCharacter: 1,
            endCharacter: 5,
        };
        interopService.scriptParseProgram({ errors: [scriptedError] });

        const doc = fakeDocument('/proj/repeat.bbj', 'rem line 1\n');
        openDocumentUris.add(doc.uri.toString());

        const privates = builder as unknown as BuilderPrivates;
        vi.spyOn(privates, 'notifyDocumentPhase').mockResolvedValue(undefined);

        privates.debouncedCompile(doc);
        await vi.advanceTimersByTimeAsync(600);
        privates.debouncedCompile(doc);
        await vi.advanceTimersByTimeAsync(600);

        expect(doc.diagnostics).toHaveLength(1);
    });

    test('a live diagnostic and a save-time diagnostic on the same line coexist with their own sources', async () => {
        vi.useFakeTimers();
        const { builder, interopService, compileMock, openDocumentUris } = buildHarness();

        const sameLineRange = { start: { line: 0, character: 0 }, end: { line: 0, character: END_OF_LINE_CHARACTER } };
        const cplDiagnostic: Diagnostic = {
            range: sameLineRange,
            message: 'BBjCPL says something is wrong here',
            severity: DiagnosticSeverity.Error,
            source: 'BBjCPL',
        };
        compileMock.mockResolvedValue([cplDiagnostic]);

        const scriptedError: ParseError = {
            categories: ['SyntaxError'],
            message: 'live parser also flags this line',
            editorStartLine: 1,
            editorEndLine: 1,
            startCharacter: 1,
            endCharacter: 5,
        };
        interopService.scriptParseProgram({ errors: [scriptedError] });

        const doc = fakeDocument('/proj/coexist.bbj', 'rem line 1\n');
        openDocumentUris.add(doc.uri.toString());

        const privates = builder as unknown as BuilderPrivates;
        vi.spyOn(privates, 'notifyDocumentPhase').mockResolvedValue(undefined);

        privates.debouncedCompile(doc);
        await vi.advanceTimersByTimeAsync(600);

        expect(doc.diagnostics).toHaveLength(2);
        const sources = doc.diagnostics!.map(d => d.source).sort();
        expect(sources).toEqual([BBJ_PARSER_SOURCE, 'BBjCPL'].sort());
    });
});
