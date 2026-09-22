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
