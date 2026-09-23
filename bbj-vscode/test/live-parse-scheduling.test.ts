import { DocumentState, EmptyFileSystem, URI } from 'langium';
import type { LangiumDocument } from 'langium';
import type { NormalizedTextDocuments } from 'langium/lsp';
import type { BBjDocumentBuilder } from '../src/language/bbj-document-builder.js';
import { TextDocument } from 'vscode-languageserver-textdocument';
import type { Diagnostic } from 'vscode-languageserver';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { BBJ_PARSER_SOURCE } from '../src/language/bbj-parser-service.js';
import type { ParseError } from '../src/language/java-interop.js';
import { setCompilerTrigger } from '../src/language/bbj-document-validator.js';
import { clearAllVerdictStates } from '../src/language/bbj-diagnostic-reconciliation.js';
import { createBBjTestServices, JavaInteropTestService } from './bbj-test-module.js';

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
};

afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    clearAllVerdictStates();
    setCompilerTrigger('debounced');
});

describe('live-parse scheduling', () => {
    test('a change event while the workspace lock is held publishes a live parser diagnostic before the lock is released', async () => {
        const { shared, BBj } = createBBjTestServices(EmptyFileSystem);
        const builder = shared.workspace.DocumentBuilder as BBjDocumentBuilder;
        const privates = builder as unknown as BuilderPrivates;
        // Bypass the real bbjcpl-binary probe -- there is no BBj install in this test
        // environment, and this test's whole point is the event path, not availability
        // detection.
        privates.bbjcplAvailable = true;

        const interopService = BBj.java.JavaInteropService as JavaInteropTestService;
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
        const document: LangiumDocument = shared.workspace.LangiumDocumentFactory.fromString(originalText, uri);
        shared.workspace.LangiumDocuments.addDocument(document);
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
            (shared.workspace.TextDocuments as unknown as NormalizedTextDocuments).set(
                TextDocument.create(uriString, 'bbj', 7, editedText)
            );
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
});
