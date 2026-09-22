import type { LangiumDocument, LangiumSharedCoreServices } from 'langium';
import { DocumentValidator, EmptyFileSystem, URI } from 'langium';
import { validationHelper } from 'langium/test';
import { TextDocument } from 'vscode-languageserver-textdocument';
import type { Diagnostic } from 'vscode-languageserver';
import { DiagnosticSeverity, LSPErrorCodes } from 'vscode-languageserver';
import { afterEach, beforeAll, describe, expect, test, vi } from 'vitest';
import { BBjDocumentBuilder } from '../src/language/bbj-document-builder.js';
import { setMaxErrors } from '../src/language/bbj-document-validator.js';
import { BBjWorkspaceManager } from '../src/language/bbj-ws-manager.js';
import { BBJ_PARSER_SOURCE, BBjParserService } from '../src/language/bbj-parser-service.js';
import { END_OF_LINE_CHARACTER } from '../src/language/lsp-position.js';
import { clearAllVerdictStates, DOWNGRADED_SYNTAX_CODE } from '../src/language/bbj-diagnostic-reconciliation.js';
import type { ParseError } from '../src/language/java-interop.js';
import { Program } from '../src/language/generated/ast.js';
import { logger } from '../src/language/logger.js';
import { createBBjTestServices, JavaInteropTestService } from './bbj-test-module.js';
import { initializeWorkspace } from './test-helper.js';

/**
 * End-to-end harness for the live parser diagnostics client: a real `BBjDocumentBuilder` driving
 * a real `BBjParserService` over the hermetic `JavaInteropTestService` double, exactly the shape
 * `document-builder.test.ts`'s `buildHarness()` already establishes for the sibling `BBjCPLService`
 * path, plus a real `TextDocument` per `bbj-document-builder-config.test.ts`'s `fakeTextDocuments`.
 *
 * Accepts an existing `createBBjTestServices` result so a caller that also needs a validated
 * document (the tracer test below) can drive the builder over the same workspace/interop double
 * the document was validated against, instead of a second, unrelated instance.
 */
function buildHarness(services: ReturnType<typeof createBBjTestServices> = createBBjTestServices(EmptyFileSystem)) {
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

/** Builds `count` distinct `ParseError` records, each with its own message so scripted order is observable. */
function manyErrors(count: number): ParseError[] {
    return Array.from({ length: count }, (_, i) => ({
        categories: ['SyntaxError'],
        message: `error ${i}`,
        editorStartLine: 1,
        editorEndLine: 1,
        startCharacter: 1,
        endCharacter: 5,
    }));
}

afterEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
    vi.useRealTimers();
    // The diagnostics-cap tests below push bbj-document-validator's module-scoped setting;
    // restore its default so later tests in this file (and other files sharing the module) see it.
    setMaxErrors(20);
    // Verdict state is also module-scoped, keyed by document uri; clear it so an earlier
    // test's carried-over state can never leak into a later one.
    clearAllVerdictStates();
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

    test('a live verdict replaces the save-time compile: only the live diagnostic, no compile run', async () => {
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

        const doc = fakeDocument('/proj/replaces.bbj', 'rem line 1\n');
        openDocumentUris.add(doc.uri.toString());

        const privates = builder as unknown as BuilderPrivates;
        vi.spyOn(privates, 'notifyDocumentPhase').mockResolvedValue(undefined);

        privates.debouncedCompile(doc);
        await vi.advanceTimersByTimeAsync(600);

        expect(doc.diagnostics).toHaveLength(1);
        expect(doc.diagnostics![0].source).toBe(BBJ_PARSER_SOURCE);
        expect(compileMock).not.toHaveBeenCalled();
    });
});

describe('an accepted verdict turns the language server\'s parse error into a warning and skips the save-time compile', () => {
    const validationServices = createBBjTestServices(EmptyFileSystem);
    let validate: ReturnType<typeof validationHelper<Program>>;

    beforeAll(async () => {
        await initializeWorkspace(validationServices.shared);
        validate = validationHelper<Program>(validationServices.BBj);
    });

    test('an accepted verdict turns the language server\'s parse error into a warning and skips the save-time compile', async () => {
        // A deliberate syntax error: an unclosed parenthesis in an assignment.
        const result = await validate('x = (1 + 2\n');
        const parseErrors = result.diagnostics.filter(
            d => d.severity === DiagnosticSeverity.Error
                && (d.data as { code?: unknown } | undefined)?.code === DocumentValidator.ParsingError
        );
        // Precondition: the invented text really does produce at least one Langium parse error.
        expect(parseErrors.length).toBeGreaterThan(0);

        vi.useFakeTimers();
        const { builder, interopService, compileMock, openDocumentUris } = buildHarness(validationServices);
        compileMock.mockResolvedValue([]);
        interopService.scriptParseProgram({ errors: [] });

        const document = result.document;
        openDocumentUris.add(document.uri.toString());

        const privates = builder as unknown as BuilderPrivates;
        const notifySpy = vi.spyOn(privates, 'notifyDocumentPhase').mockResolvedValue(undefined);

        privates.debouncedCompile(document);
        await vi.advanceTimersByTimeAsync(600);

        const finalDiagnostics = document.diagnostics ?? [];
        expect(finalDiagnostics.some(d => d.severity === DiagnosticSeverity.Error)).toBe(false);
        for (const original of parseErrors) {
            const carried = finalDiagnostics.find(
                d => d.message === original.message && d.range.start.line === original.range.start.line
            );
            expect(carried).toBeDefined();
            expect(carried!.severity).toBe(DiagnosticSeverity.Warning);
            expect(carried!.source).toBe('bbj');
            expect((carried!.data as { code?: unknown } | undefined)?.code).toBe(DOWNGRADED_SYNTAX_CODE);
        }
        expect(compileMock).not.toHaveBeenCalled();
        expect(notifySpy).toHaveBeenCalledTimes(1);
    });
});

describe('BBjParserService: no endpoint failure ever becomes a diagnostic', () => {
    test.each([
        [-33001, 'parser-exception'],
        [-33002, 'timeout'],
        [-33003, 'size-cap'],
        [-33004, 'service-unavailable'],
        [-33005, 'protected-program'],
    ])('an application error %i (%s) never becomes a diagnostic', async (code, kind) => {
        vi.useFakeTimers();
        const { builder, interopService, compileMock, openDocumentUris } = buildHarness();
        compileMock.mockResolvedValue([]);
        interopService.scriptParseProgram({ code, message: `boom (${kind})` });

        const existing: Diagnostic = {
            range: { start: { line: 0, character: 0 }, end: { line: 0, character: 1 } },
            message: 'pre-existing diagnostic',
            severity: DiagnosticSeverity.Warning,
        };
        const doc = fakeDocument(`/proj/app-${kind}.bbj`, 'rem line 1\n', [existing]);
        openDocumentUris.add(doc.uri.toString());

        const privates = builder as unknown as BuilderPrivates;
        vi.spyOn(privates, 'notifyDocumentPhase').mockResolvedValue(undefined);
        const warnSpy = vi.spyOn(logger, 'warn').mockImplementation(() => { });
        const errorSpy = vi.spyOn(logger, 'error').mockImplementation(() => { });

        privates.debouncedCompile(doc);
        await vi.advanceTimersByTimeAsync(600);

        // Zero diagnostics added; the document's existing diagnostics are untouched.
        expect(doc.diagnostics).toEqual([existing]);
        expect(errorSpy).not.toHaveBeenCalled();
        expect(warnSpy).toHaveBeenCalledTimes(1);
        expect(warnSpy.mock.calls[0][0]).toContain(kind);
    });

    test('a transport failure (a plain rejected error) never becomes a diagnostic: zero diagnostics and one warn line', async () => {
        vi.useFakeTimers();
        const { builder, interopService, compileMock, openDocumentUris } = buildHarness();
        compileMock.mockResolvedValue([]);
        interopService.scriptParseProgram('transport-error');

        const doc = fakeDocument('/proj/transport.bbj', 'rem line 1\n');
        openDocumentUris.add(doc.uri.toString());

        const privates = builder as unknown as BuilderPrivates;
        vi.spyOn(privates, 'notifyDocumentPhase').mockResolvedValue(undefined);
        const warnSpy = vi.spyOn(logger, 'warn').mockImplementation(() => { });
        const errorSpy = vi.spyOn(logger, 'error').mockImplementation(() => { });

        privates.debouncedCompile(doc);
        await vi.advanceTimersByTimeAsync(600);

        expect(doc.diagnostics).toHaveLength(0);
        expect(errorSpy).not.toHaveBeenCalled();
        expect(warnSpy).toHaveBeenCalledTimes(1);
        expect(warnSpy.mock.calls[0][0]).toContain('transport');
    });

    test('a malformed result (errors missing) never becomes a diagnostic: zero diagnostics, one warn line, no exception', async () => {
        vi.useFakeTimers();
        const { builder, interopService, compileMock, openDocumentUris } = buildHarness();
        compileMock.mockResolvedValue([]);
        interopService.scriptParseProgram('malformed-result');

        const doc = fakeDocument('/proj/malformed.bbj', 'rem line 1\n');
        openDocumentUris.add(doc.uri.toString());

        const privates = builder as unknown as BuilderPrivates;
        vi.spyOn(privates, 'notifyDocumentPhase').mockResolvedValue(undefined);
        const warnSpy = vi.spyOn(logger, 'warn').mockImplementation(() => { });
        const errorSpy = vi.spyOn(logger, 'error').mockImplementation(() => { });

        privates.debouncedCompile(doc);
        await vi.advanceTimersByTimeAsync(600);

        expect(doc.diagnostics).toHaveLength(0);
        expect(errorSpy).not.toHaveBeenCalled();
        expect(warnSpy).toHaveBeenCalledTimes(1);
        expect(warnSpy.mock.calls[0][0]).toContain('malformed-result');
    });

    test('a cancellation never becomes a diagnostic: zero diagnostics and no log line at any level', async () => {
        vi.useFakeTimers();
        const { builder, interopService, compileMock, openDocumentUris } = buildHarness();
        compileMock.mockResolvedValue([]);
        interopService.scriptParseProgram({ code: LSPErrorCodes.RequestCancelled, message: 'superseded by a newer request' });

        const doc = fakeDocument('/proj/cancelled.bbj', 'rem line 1\n');
        openDocumentUris.add(doc.uri.toString());

        const privates = builder as unknown as BuilderPrivates;
        vi.spyOn(privates, 'notifyDocumentPhase').mockResolvedValue(undefined);
        const infoSpy = vi.spyOn(logger, 'info').mockImplementation(() => { });
        const warnSpy = vi.spyOn(logger, 'warn').mockImplementation(() => { });
        const debugSpy = vi.spyOn(logger, 'debug').mockImplementation(() => { });
        const errorSpy = vi.spyOn(logger, 'error').mockImplementation(() => { });

        privates.debouncedCompile(doc);
        await vi.advanceTimersByTimeAsync(600);

        expect(doc.diagnostics).toHaveLength(0);
        expect(infoSpy).not.toHaveBeenCalled();
        expect(warnSpy).not.toHaveBeenCalled();
        expect(debugSpy).not.toHaveBeenCalled();
        expect(errorSpy).not.toHaveBeenCalled();
    });

    test('repeat failures of the same kind never become a diagnostic: the first warns, repeats log at debug, a different kind warns again', async () => {
        vi.useFakeTimers();
        const { builder, interopService, compileMock, openDocumentUris } = buildHarness();
        compileMock.mockResolvedValue([]);

        const doc = fakeDocument('/proj/cadence.bbj', 'rem line 1\n');
        openDocumentUris.add(doc.uri.toString());

        const privates = builder as unknown as BuilderPrivates;
        vi.spyOn(privates, 'notifyDocumentPhase').mockResolvedValue(undefined);
        const warnSpy = vi.spyOn(logger, 'warn').mockImplementation(() => { });
        const debugSpy = vi.spyOn(logger, 'debug').mockImplementation(() => { });

        // First occurrence of 'timeout': warn.
        interopService.scriptParseProgram({ code: -33002, message: 'timeout 1' });
        privates.debouncedCompile(doc);
        await vi.advanceTimersByTimeAsync(600);
        expect(warnSpy).toHaveBeenCalledTimes(1);
        expect(debugSpy.mock.calls.filter(c => String(c[0]).includes('timeout'))).toHaveLength(0);

        // Second occurrence of the same kind: debug, not warn.
        interopService.scriptParseProgram({ code: -33002, message: 'timeout 2' });
        privates.debouncedCompile(doc);
        await vi.advanceTimersByTimeAsync(600);
        expect(warnSpy).toHaveBeenCalledTimes(1);
        expect(debugSpy.mock.calls.filter(c => String(c[0]).includes('timeout'))).toHaveLength(1);

        // A different kind: warns again.
        interopService.scriptParseProgram({ code: -33001, message: 'parser exception' });
        privates.debouncedCompile(doc);
        await vi.advanceTimersByTimeAsync(600);
        expect(warnSpy).toHaveBeenCalledTimes(2);

        expect(doc.diagnostics).toHaveLength(0);
    });

    test('a success between two failures never becomes a diagnostic and re-arms the warn level for the next occurrence of the same kind', async () => {
        vi.useFakeTimers();
        const { builder, interopService, compileMock, openDocumentUris } = buildHarness();
        compileMock.mockResolvedValue([]);

        const doc = fakeDocument('/proj/rearm.bbj', 'rem line 1\n');
        openDocumentUris.add(doc.uri.toString());

        const privates = builder as unknown as BuilderPrivates;
        vi.spyOn(privates, 'notifyDocumentPhase').mockResolvedValue(undefined);
        const warnSpy = vi.spyOn(logger, 'warn').mockImplementation(() => { });

        // First 'timeout': warn.
        interopService.scriptParseProgram({ code: -33002, message: 'timeout 1' });
        privates.debouncedCompile(doc);
        await vi.advanceTimersByTimeAsync(600);
        expect(warnSpy).toHaveBeenCalledTimes(1);

        // A genuine successful parse in between.
        interopService.scriptParseProgram({ errors: [] });
        privates.debouncedCompile(doc);
        await vi.advanceTimersByTimeAsync(600);

        // 'timeout' again: warns again, since the success re-armed it.
        interopService.scriptParseProgram({ code: -33002, message: 'timeout 3' });
        privates.debouncedCompile(doc);
        await vi.advanceTimersByTimeAsync(600);
        expect(warnSpy).toHaveBeenCalledTimes(2);
    });

    test('a failure never changes the on/off latch: after a failure the next edit still sends a request', async () => {
        vi.useFakeTimers();
        const { builder, interopService, compileMock, openDocumentUris } = buildHarness();
        compileMock.mockResolvedValue([]);
        const parseProgramSpy = vi.spyOn(interopService, 'parseProgram');

        const doc = fakeDocument('/proj/latch-unaffected.bbj', 'rem line 1\n');
        openDocumentUris.add(doc.uri.toString());

        const privates = builder as unknown as BuilderPrivates;
        vi.spyOn(privates, 'notifyDocumentPhase').mockResolvedValue(undefined);
        vi.spyOn(logger, 'warn').mockImplementation(() => { });

        interopService.scriptParseProgram({ code: -33001, message: 'boom' });
        privates.debouncedCompile(doc);
        await vi.advanceTimersByTimeAsync(600);
        expect(parseProgramSpy).toHaveBeenCalledTimes(1);

        interopService.scriptParseProgram({ code: -33001, message: 'boom again' });
        privates.debouncedCompile(doc);
        await vi.advanceTimersByTimeAsync(600);
        expect(parseProgramSpy).toHaveBeenCalledTimes(2);

        expect(doc.diagnostics).toHaveLength(0);
    });

    test('no log line for any failure kind contains the document text', async () => {
        vi.useFakeTimers();
        const { builder, interopService, compileMock, openDocumentUris } = buildHarness();
        compileMock.mockResolvedValue([]);
        interopService.scriptParseProgram({ code: -33001, message: 'boom' });

        const secretText = 'REM this line must never appear in a log line, marker XYZZY123';
        const doc = fakeDocument('/proj/no-text-in-log.bbj', secretText);
        openDocumentUris.add(doc.uri.toString());

        const privates = builder as unknown as BuilderPrivates;
        vi.spyOn(privates, 'notifyDocumentPhase').mockResolvedValue(undefined);
        const infoSpy = vi.spyOn(logger, 'info').mockImplementation(() => { });
        const warnSpy = vi.spyOn(logger, 'warn').mockImplementation(() => { });
        const debugSpy = vi.spyOn(logger, 'debug').mockImplementation(() => { });
        const errorSpy = vi.spyOn(logger, 'error').mockImplementation(() => { });

        privates.debouncedCompile(doc);
        await vi.advanceTimersByTimeAsync(600);

        for (const spy of [infoSpy, warnSpy, debugSpy, errorSpy]) {
            for (const call of spy.mock.calls) {
                expect(String(call[0])).not.toContain('XYZZY123');
            }
        }
    });
});

describe('BBjParserService: the diagnostics setting caps the live errors, per document, in scripted order', () => {
    test('caps the live errors at the default of 20, publishing exactly the first 20 in scripted order', async () => {
        vi.useFakeTimers();
        const { builder, interopService, compileMock, openDocumentUris } = buildHarness();
        compileMock.mockResolvedValue([]);
        interopService.scriptParseProgram({ errors: manyErrors(25) });

        const doc = fakeDocument('/proj/cap-default.bbj', 'rem line 1\n');
        openDocumentUris.add(doc.uri.toString());

        const privates = builder as unknown as BuilderPrivates;
        vi.spyOn(privates, 'notifyDocumentPhase').mockResolvedValue(undefined);

        privates.debouncedCompile(doc);
        await vi.advanceTimersByTimeAsync(600);

        expect(doc.diagnostics).toHaveLength(20);
        expect(doc.diagnostics!.map(d => d.message)).toEqual(manyErrors(20).map(e => e.message));
    });

    test('caps the live errors at a pushed value of 3, publishing exactly the first 3', async () => {
        vi.useFakeTimers();
        setMaxErrors(3);
        const { builder, interopService, compileMock, openDocumentUris } = buildHarness();
        compileMock.mockResolvedValue([]);
        interopService.scriptParseProgram({ errors: manyErrors(5) });

        const doc = fakeDocument('/proj/cap-pushed.bbj', 'rem line 1\n');
        openDocumentUris.add(doc.uri.toString());

        const privates = builder as unknown as BuilderPrivates;
        vi.spyOn(privates, 'notifyDocumentPhase').mockResolvedValue(undefined);

        privates.debouncedCompile(doc);
        await vi.advanceTimersByTimeAsync(600);

        expect(doc.diagnostics).toHaveLength(3);
        expect(doc.diagnostics!.map(d => d.message)).toEqual(manyErrors(3).map(e => e.message));
    });

    test('caps the live errors: a scripted list shorter than the cap is not padded or dropped', async () => {
        vi.useFakeTimers();
        const { builder, interopService, compileMock, openDocumentUris } = buildHarness();
        compileMock.mockResolvedValue([]);
        interopService.scriptParseProgram({ errors: manyErrors(5) });

        const doc = fakeDocument('/proj/cap-shorter.bbj', 'rem line 1\n');
        openDocumentUris.add(doc.uri.toString());

        const privates = builder as unknown as BuilderPrivates;
        vi.spyOn(privates, 'notifyDocumentPhase').mockResolvedValue(undefined);

        privates.debouncedCompile(doc);
        await vi.advanceTimersByTimeAsync(600);

        expect(doc.diagnostics).toHaveLength(5);
        expect(doc.diagnostics!.map(d => d.message)).toEqual(manyErrors(5).map(e => e.message));
    });

    test('caps the live errors per document: two documents each scripted with 25 end up with 20 each, not 20 between them', async () => {
        vi.useFakeTimers();
        const { builder, interopService, compileMock, openDocumentUris } = buildHarness();
        compileMock.mockResolvedValue([]);

        const docA = fakeDocument('/proj/cap-a.bbj', 'rem a\n');
        const docB = fakeDocument('/proj/cap-b.bbj', 'rem b\n');
        openDocumentUris.add(docA.uri.toString());
        openDocumentUris.add(docB.uri.toString());

        const privates = builder as unknown as BuilderPrivates;
        vi.spyOn(privates, 'notifyDocumentPhase').mockResolvedValue(undefined);

        interopService.scriptParseProgram({ errors: manyErrors(25) });
        privates.debouncedCompile(docA);
        await vi.advanceTimersByTimeAsync(600);

        interopService.scriptParseProgram({ errors: manyErrors(25) });
        privates.debouncedCompile(docB);
        await vi.advanceTimersByTimeAsync(600);

        expect(docA.diagnostics).toHaveLength(20);
        expect(docB.diagnostics).toHaveLength(20);
    });

    test('caps the live errors: a non-positive pushed cap falls back to the module default instead of blanking every diagnostic', async () => {
        vi.useFakeTimers();
        setMaxErrors(0);
        const { builder, interopService, compileMock, openDocumentUris } = buildHarness();
        compileMock.mockResolvedValue([]);
        interopService.scriptParseProgram({ errors: manyErrors(25) });

        const doc = fakeDocument('/proj/cap-nonpositive.bbj', 'rem line 1\n');
        openDocumentUris.add(doc.uri.toString());

        const privates = builder as unknown as BuilderPrivates;
        vi.spyOn(privates, 'notifyDocumentPhase').mockResolvedValue(undefined);

        privates.debouncedCompile(doc);
        await vi.advanceTimersByTimeAsync(600);

        expect(doc.diagnostics).toHaveLength(20);
    });

    test('caps the live errors: an empty scripted list produces zero diagnostics', async () => {
        vi.useFakeTimers();
        const { builder, interopService, compileMock, openDocumentUris } = buildHarness();
        compileMock.mockResolvedValue([]);
        interopService.scriptParseProgram({ errors: [] });

        const doc = fakeDocument('/proj/cap-empty.bbj', 'rem line 1\n');
        openDocumentUris.add(doc.uri.toString());

        const privates = builder as unknown as BuilderPrivates;
        vi.spyOn(privates, 'notifyDocumentPhase').mockResolvedValue(undefined);

        privates.debouncedCompile(doc);
        await vi.advanceTimersByTimeAsync(600);

        expect(doc.diagnostics).toHaveLength(0);
    });
});
