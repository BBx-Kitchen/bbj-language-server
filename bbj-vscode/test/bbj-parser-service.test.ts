import type { LangiumDocument, LangiumSharedCoreServices } from 'langium';
import { DocumentValidator, EmptyFileSystem, URI } from 'langium';
import { validationHelper } from 'langium/test';
import { TextDocument } from 'vscode-languageserver-textdocument';
import type { Diagnostic } from 'vscode-languageserver';
import { DiagnosticSeverity, LSPErrorCodes } from 'vscode-languageserver';
import { afterEach, beforeAll, describe, expect, test, vi } from 'vitest';
import { BBjDocumentBuilder } from '../src/language/bbj-document-builder.js';
import { applyDiagnosticHierarchy, mergeDiagnostics, setMaxErrors } from '../src/language/bbj-document-validator.js';
import { BBjWorkspaceManager } from '../src/language/bbj-ws-manager.js';
import { BBJ_PARSER_SOURCE, BBjParserService } from '../src/language/bbj-parser-service.js';
import { END_OF_LINE_CHARACTER } from '../src/language/lsp-position.js';
import {
    clearAllVerdictStates,
    DOWNGRADED_SYNTAX_CODE,
    getVerdictState,
    recallLangiumDiagnostics,
    rememberLangiumDiagnostics,
    setVerdictState,
} from '../src/language/bbj-diagnostic-reconciliation.js';
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

describe('an older server gets exactly the 0.16.x diagnostics', () => {
    const validationServices = createBBjTestServices(EmptyFileSystem);
    let validate: ReturnType<typeof validationHelper<Program>>;

    beforeAll(async () => {
        await initializeWorkspace(validationServices.shared);
        validate = validationHelper<Program>(validationServices.BBj);
    });

    /**
     * Builds a validated document with a real Langium parse error, then drives one accepted
     * (zero-error) verdict cycle so the parse error starts out downgraded to a Warning.
     */
    async function acceptedVerdictDocument(
        harness: ReturnType<typeof buildHarness>
    ): Promise<LangiumDocument> {
        const result = await validate('x = (1 + 2\n');
        const parseErrors = result.diagnostics.filter(
            d => d.severity === DiagnosticSeverity.Error
                && (d.data as { code?: unknown } | undefined)?.code === DocumentValidator.ParsingError
        );
        expect(parseErrors.length).toBeGreaterThan(0);

        const document = result.document;
        harness.openDocumentUris.add(document.uri.toString());

        const privates = harness.builder as unknown as BuilderPrivates;
        harness.interopService.scriptParseProgram({ errors: [] });
        privates.debouncedCompile(document);
        await vi.advanceTimersByTimeAsync(600);
        expect(document.diagnostics?.some(d => d.severity === DiagnosticSeverity.Error)).toBe(false);

        return document;
    }

    test('exact equality against the 0.16.x merge: a Langium error bbjcpl also flags is replaced, one bbjcpl does not flag stays an Error, nothing is downgraded, no verdict state', async () => {
        vi.useFakeTimers();
        const { builder, compileMock, openDocumentUris } = buildHarness(validationServices);
        // JavaInteropTestService defaults to the old-server (MethodNotFound) script.

        // Invented text producing two Langium parse errors on two distinct lines: one on
        // line 1 (the dangling '+' at the end of line 0 forces recovery to fail there) and
        // one on line 2 (the dangling '*' at the end of line 2 itself).
        const result = await validate('x = 1 +\nrem ok\ny = 2 *\n');
        const parseErrors = result.diagnostics.filter(
            d => d.severity === DiagnosticSeverity.Error
                && (d.data as { code?: unknown } | undefined)?.code === DocumentValidator.ParsingError
        );
        // Precondition: the invented text really does produce parse errors on two distinct lines,
        // and line 0 (used below as "a line Langium does not flag") is not one of them.
        const flaggedLines = [...new Set(parseErrors.map(d => d.range.start.line))];
        expect(flaggedLines.length).toBe(2);
        const unflaggedLine = 0;
        expect(flaggedLines).not.toContain(unflaggedLine);
        const firstFlaggedLine = Math.min(...flaggedLines);

        const document = result.document;
        openDocumentUris.add(document.uri.toString());

        const cplDiags: Diagnostic[] = [
            {
                range: { start: { line: firstFlaggedLine, character: 0 }, end: { line: firstFlaggedLine, character: END_OF_LINE_CHARACTER } },
                message: 'bbjcpl flags the same line',
                severity: DiagnosticSeverity.Error,
                source: 'BBjCPL',
            },
            {
                range: { start: { line: unflaggedLine, character: 0 }, end: { line: unflaggedLine, character: END_OF_LINE_CHARACTER } },
                message: 'bbjcpl-only diagnostic on a line Langium does not flag',
                severity: DiagnosticSeverity.Error,
                source: 'BBjCPL',
            },
        ];
        compileMock.mockResolvedValue(cplDiags);

        const privates = builder as unknown as BuilderPrivates;
        vi.spyOn(privates, 'notifyDocumentPhase').mockResolvedValue(undefined);

        privates.debouncedCompile(document);
        await vi.advanceTimersByTimeAsync(600);

        const remembered = recallLangiumDiagnostics(document);
        expect(remembered).toBeDefined();
        expect(document.diagnostics).toEqual(mergeDiagnostics(applyDiagnosticHierarchy(remembered!, true, 20), cplDiags));

        const onFirstFlaggedLine = document.diagnostics!.find(d => d.range.start.line === firstFlaggedLine);
        expect(onFirstFlaggedLine!.source).toBe('BBjCPL');
        expect(onFirstFlaggedLine!.severity).toBe(DiagnosticSeverity.Error);
        expect(parseErrors.some(pe => pe.message === onFirstFlaggedLine!.message)).toBe(true);

        const secondFlaggedLine = flaggedLines.find(l => l !== firstFlaggedLine)!;
        const onSecondFlaggedLine = document.diagnostics!.find(d => d.range.start.line === secondFlaggedLine);
        expect(onSecondFlaggedLine!.source).toBe('bbj');
        expect(onSecondFlaggedLine!.severity).toBe(DiagnosticSeverity.Error);

        expect(document.diagnostics!.some(
            d => (d.data as { code?: unknown } | undefined)?.code === DOWNGRADED_SYNTAX_CODE
        )).toBe(false);
        expect(getVerdictState(document.uri)).toBeUndefined();
    });

    test('a MethodNotFound answer clears every document\'s verdict state, not just the one whose cycle produced it', async () => {
        vi.useFakeTimers();
        const harness = buildHarness(validationServices);
        const { builder, interopService } = harness;
        harness.compileMock.mockResolvedValue([]);

        const document = await acceptedVerdictDocument(harness);
        expect(getVerdictState(document.uri)).toBeDefined();

        const otherUri = URI.file('/proj/hand-set-other-document.bbj');
        setVerdictState(otherUri, { seen: new Set(['hand-set-key']) });

        interopService.scriptParseProgram('method-not-found');
        const privates = builder as unknown as BuilderPrivates;
        privates.debouncedCompile(document);
        await vi.advanceTimersByTimeAsync(600);

        expect(getVerdictState(document.uri)).toBeUndefined();
        expect(getVerdictState(otherUri)).toBeUndefined();
        expect(document.diagnostics?.some(d => d.severity === DiagnosticSeverity.Error)).toBe(true);
    });

    test('after simulateReconnect, calling isEnabled() clears the verdict state', async () => {
        vi.useFakeTimers();
        const harness = buildHarness(validationServices);
        harness.compileMock.mockResolvedValue([]);

        const document = await acceptedVerdictDocument(harness);
        expect(getVerdictState(document.uri)).toBeDefined();

        harness.interopService.simulateReconnect();
        harness.parserService.isEnabled();

        expect(getVerdictState(document.uri)).toBeUndefined();
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

describe('a live-parse failure falls back to the save-time compile', () => {
    const validationServices = createBBjTestServices(EmptyFileSystem);
    let validate: ReturnType<typeof validationHelper<Program>>;

    beforeAll(async () => {
        await initializeWorkspace(validationServices.shared);
        validate = validationHelper<Program>(validationServices.BBj);
    });

    /**
     * Builds a validated document with a real Langium parse error, then drives one accepted
     * (zero-error) verdict cycle so the parse error starts out downgraded to a Warning — the
     * precondition every case below falls back from.
     */
    async function acceptedVerdictDocument(
        harness: ReturnType<typeof buildHarness>
    ): Promise<{ document: LangiumDocument; parseErrors: Diagnostic[] }> {
        const result = await validate('x = (1 + 2\n');
        const parseErrors = result.diagnostics.filter(
            d => d.severity === DiagnosticSeverity.Error
                && (d.data as { code?: unknown } | undefined)?.code === DocumentValidator.ParsingError
        );
        // Precondition: the invented text really does produce at least one Langium parse error.
        expect(parseErrors.length).toBeGreaterThan(0);

        const document = result.document;
        harness.openDocumentUris.add(document.uri.toString());

        const privates = harness.builder as unknown as BuilderPrivates;
        harness.interopService.scriptParseProgram({ errors: [] });
        privates.debouncedCompile(document);
        await vi.advanceTimersByTimeAsync(600);
        expect(document.diagnostics?.some(d => d.severity === DiagnosticSeverity.Error)).toBe(false);

        return { document, parseErrors };
    }

    test.each([
        [-33001, 'parser-exception'],
        [-33002, 'timeout'],
        [-33003, 'size-cap'],
        [-33004, 'service-unavailable'],
        [-33005, 'protected-program'],
    ])('application error %i (%s): falls back to the save-time compile with Langium errors restored', async (code, kind) => {
        vi.useFakeTimers();
        const harness = buildHarness(validationServices);
        const { builder, interopService, compileMock } = harness;
        compileMock.mockResolvedValue([]);
        const warnSpy = vi.spyOn(logger, 'warn').mockImplementation(() => { });

        const privates = builder as unknown as BuilderPrivates;
        vi.spyOn(privates, 'notifyDocumentPhase').mockResolvedValue(undefined);

        const { document, parseErrors } = await acceptedVerdictDocument(harness);

        interopService.scriptParseProgram({ code, message: `boom (${kind})` });
        privates.debouncedCompile(document);
        await vi.advanceTimersByTimeAsync(600);

        expect(compileMock).toHaveBeenCalledOnce();
        for (const original of parseErrors) {
            const restored = document.diagnostics?.find(
                d => d.message === original.message && d.range.start.line === original.range.start.line
            );
            expect(restored).toBeDefined();
            expect(restored!.severity).toBe(DiagnosticSeverity.Error);
            expect((restored!.data as { code?: unknown } | undefined)?.code).toBe(DocumentValidator.ParsingError);
        }
        expect(getVerdictState(document.uri)).toBeUndefined();
        expect(warnSpy).toHaveBeenCalledTimes(1);
    });

    test('a transport failure: falls back to the save-time compile with Langium errors restored', async () => {
        vi.useFakeTimers();
        const harness = buildHarness(validationServices);
        const { builder, interopService, compileMock } = harness;
        compileMock.mockResolvedValue([]);
        const warnSpy = vi.spyOn(logger, 'warn').mockImplementation(() => { });

        const privates = builder as unknown as BuilderPrivates;
        vi.spyOn(privates, 'notifyDocumentPhase').mockResolvedValue(undefined);

        const { document, parseErrors } = await acceptedVerdictDocument(harness);

        interopService.scriptParseProgram('transport-error');
        privates.debouncedCompile(document);
        await vi.advanceTimersByTimeAsync(600);

        expect(compileMock).toHaveBeenCalledOnce();
        for (const original of parseErrors) {
            const restored = document.diagnostics?.find(
                d => d.message === original.message && d.range.start.line === original.range.start.line
            );
            expect(restored).toBeDefined();
            expect(restored!.severity).toBe(DiagnosticSeverity.Error);
        }
        expect(getVerdictState(document.uri)).toBeUndefined();
        expect(warnSpy).toHaveBeenCalledTimes(1);
    });

    test('a malformed result: falls back to the save-time compile with Langium errors restored', async () => {
        vi.useFakeTimers();
        const harness = buildHarness(validationServices);
        const { builder, interopService, compileMock } = harness;
        compileMock.mockResolvedValue([]);
        const warnSpy = vi.spyOn(logger, 'warn').mockImplementation(() => { });

        const privates = builder as unknown as BuilderPrivates;
        vi.spyOn(privates, 'notifyDocumentPhase').mockResolvedValue(undefined);

        const { document, parseErrors } = await acceptedVerdictDocument(harness);

        interopService.scriptParseProgram('malformed-result');
        privates.debouncedCompile(document);
        await vi.advanceTimersByTimeAsync(600);

        expect(compileMock).toHaveBeenCalledOnce();
        for (const original of parseErrors) {
            const restored = document.diagnostics?.find(
                d => d.message === original.message && d.range.start.line === original.range.start.line
            );
            expect(restored).toBeDefined();
            expect(restored!.severity).toBe(DiagnosticSeverity.Error);
        }
        expect(getVerdictState(document.uri)).toBeUndefined();
        expect(warnSpy).toHaveBeenCalledTimes(1);
    });

    test('a cancelled answer after an accepted verdict: no compile run, the parse error stays a Warning, verdict state unchanged', async () => {
        vi.useFakeTimers();
        const harness = buildHarness(validationServices);
        const { builder, interopService, compileMock } = harness;
        compileMock.mockResolvedValue([]);

        const privates = builder as unknown as BuilderPrivates;
        vi.spyOn(privates, 'notifyDocumentPhase').mockResolvedValue(undefined);

        const { document } = await acceptedVerdictDocument(harness);
        const stateBefore = getVerdictState(document.uri);
        expect(stateBefore).toBeDefined();

        interopService.scriptParseProgram({ code: LSPErrorCodes.RequestCancelled, message: 'superseded by a newer request' });
        privates.debouncedCompile(document);
        await vi.advanceTimersByTimeAsync(600);

        expect(compileMock).not.toHaveBeenCalled();
        expect(document.diagnostics?.some(d => d.severity === DiagnosticSeverity.Warning)).toBe(true);
        expect(getVerdictState(document.uri)).toEqual(stateBefore);
    });

    test('a verdict for a document whose text version changed while the request was in flight: the parse error stays an Error, no verdict state stored, no compile run', async () => {
        vi.useFakeTimers();
        const { builder, interopService, compileMock, openDocumentUris } = buildHarness();
        compileMock.mockResolvedValue([]);

        const parsingErrorDiag: Diagnostic = {
            range: { start: { line: 0, character: 0 }, end: { line: 0, character: 5 } },
            message: 'stale parse error',
            severity: DiagnosticSeverity.Error,
            data: { code: DocumentValidator.ParsingError },
        };
        const doc = fakeDocument('/proj/stale-version.bbj', 'rem line 1\n', [parsingErrorDiag]);
        rememberLangiumDiagnostics(doc, [parsingErrorDiag]);
        openDocumentUris.add(doc.uri.toString());

        vi.spyOn(interopService, 'parseProgram').mockImplementation(async params => {
            // Simulate the document changing text version while this request is in flight —
            // the edit that changed it has already scheduled a newer debounce cycle of its own.
            doc.textDocument = TextDocument.create(doc.uri.toString(), 'bbj', Number(params.version) + 1, 'rem line 1\n');
            return { version: params.version, errors: [] };
        });

        const privates = builder as unknown as BuilderPrivates;
        vi.spyOn(privates, 'notifyDocumentPhase').mockResolvedValue(undefined);

        privates.debouncedCompile(doc);
        await vi.advanceTimersByTimeAsync(600);

        expect(compileMock).not.toHaveBeenCalled();
        expect(doc.diagnostics).toEqual([parsingErrorDiag]);
        expect(getVerdictState(doc.uri)).toBeUndefined();
    });
});

describe('a BBj Parser diagnostic that replaced a Langium parse error survives a cancelled cycle and a stale-version cycle', () => {
    const validationServices = createBBjTestServices(EmptyFileSystem);
    let validate: ReturnType<typeof validationHelper<Program>>;

    beforeAll(async () => {
        await initializeWorkspace(validationServices.shared);
        validate = validationHelper<Program>(validationServices.BBj);
    });

    test('a following cancelled cycle, then a following stale-version cycle, each change nothing', async () => {
        vi.useFakeTimers();
        const harness = buildHarness(validationServices);
        const { builder, interopService, compileMock, openDocumentUris } = harness;
        compileMock.mockResolvedValue([]);

        // A deliberate syntax error: an unclosed parenthesis in an assignment.
        const result = await validate('x = (1 + 2\n');
        const parseErrors = result.diagnostics.filter(
            d => d.severity === DiagnosticSeverity.Error
                && (d.data as { code?: unknown } | undefined)?.code === DocumentValidator.ParsingError
        );
        expect(parseErrors.length).toBeGreaterThan(0);
        const flaggedLine = parseErrors[0].range.start.line;

        const document = result.document;
        openDocumentUris.add(document.uri.toString());

        const privates = builder as unknown as BuilderPrivates;
        vi.spyOn(privates, 'notifyDocumentPhase').mockResolvedValue(undefined);

        // Cycle 1: a verdict whose own error overlaps the Langium parse error's line drives the
        // *replace* path (not the downgrade path): the Langium complaint is dropped entirely and
        // BBj's own diagnostic (source BBJ_PARSER_SOURCE) stands in for it alone.
        const bbjError: ParseError = {
            categories: ['SyntaxError'],
            message: 'bbj parser replacement diagnostic',
            editorStartLine: flaggedLine + 1, // ParseError lines are one-based.
            editorEndLine: flaggedLine + 1,
            startCharacter: 1,
            endCharacter: 5,
        };
        interopService.scriptParseProgram({ errors: [bbjError] });
        privates.debouncedCompile(document);
        await vi.advanceTimersByTimeAsync(600);

        const afterReplace = document.diagnostics ?? [];
        const replacementDiagnostic = afterReplace.find(d => d.source === BBJ_PARSER_SOURCE);
        expect(replacementDiagnostic).toBeDefined();
        expect(replacementDiagnostic!.message).toBe('bbj parser replacement diagnostic');
        // The Langium parse error on the same line is gone -- replaced, not merely downgraded.
        expect(afterReplace.some(
            d => (d.data as { code?: unknown } | undefined)?.code === DocumentValidator.ParsingError
                && d.range.start.line === flaggedLine
        )).toBe(false);
        expect(compileMock).not.toHaveBeenCalled();

        // Cycle 2: cancelled -- superseded by a newer request. Per debouncedCompile()'s own
        // no-op branch, this must change nothing: a clear-then-show strip that ran
        // unconditionally, without this branch restoring it, would silently drop the
        // BBJ_PARSER_SOURCE diagnostic from the republished list.
        interopService.scriptParseProgram({ code: LSPErrorCodes.RequestCancelled, message: 'superseded by a newer request' });
        privates.debouncedCompile(document);
        await vi.advanceTimersByTimeAsync(600);
        expect(document.diagnostics).toEqual(afterReplace);
        expect(compileMock).not.toHaveBeenCalled();

        // Cycle 3: a verdict for text whose version has since moved on -- must also change
        // nothing, for the same reason.
        vi.spyOn(interopService, 'parseProgram').mockImplementationOnce(async params => {
            // Unlike the plain `fakeDocument()` stub used elsewhere in this file, a real
            // validated `LangiumDocument`'s `textDocument` is a getter-only accessor property
            // (`DefaultLangiumDocumentFactory`) — a plain assignment throws. `defineProperty`
            // replaces it with a plain writable value, mirroring what a real edit does.
            Object.defineProperty(document, 'textDocument', {
                value: TextDocument.create(
                    document.uri.toString(), 'bbj', Number(params.version) + 1, document.textDocument.getText()
                ),
                writable: true,
                configurable: true
            });
            return { version: params.version, errors: [] };
        });
        privates.debouncedCompile(document);
        await vi.advanceTimersByTimeAsync(600);
        expect(document.diagnostics).toEqual(afterReplace);
        expect(compileMock).not.toHaveBeenCalled();
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
        expect(compileMock).toHaveBeenCalledOnce();
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
        expect(compileMock).toHaveBeenCalledOnce();
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
        expect(compileMock).toHaveBeenCalledOnce();
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
        expect(compileMock).not.toHaveBeenCalled();
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
