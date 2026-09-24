import { EmptyFileSystem, URI } from 'langium';
import type { NormalizedTextDocuments } from 'langium/lsp';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { BBjDocumentBuilder } from '../src/language/bbj-document-builder.js';
import { setCompilerTrigger } from '../src/language/bbj-document-validator.js';
import { clearAllVerdictStates } from '../src/language/bbj-diagnostic-reconciliation.js';
import { clearAllContentChanges, clearAllKeptChecks } from '../src/language/bbj-kept-check.js';
import { createBBjTestServices, JavaInteropTestService } from './bbj-test-module.js';
import { insertTextAt, listenOnFakeConnection } from './fake-text-document-connection.js';

/**
 * End-to-end coverage for the kept compiler errors under `on-save`: the last check's diagnostics
 * stay visible on their lines while the user types, through the real text-document store
 * (`listenOnFakeConnection`), the change-recording configuration, and the kept-check composition.
 */

/** Structural view onto the builder's private members under test, reached via cast -- same shape
 * as `on-save-trigger.test.ts`'s own `createHarness`. */
type BuilderPrivates = {
    bbjcplAvailable: boolean | undefined;
};

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
 * `Parsed`, so a subsequent open event finds it via `langiumDocuments.getDocument`. */
function addWorkspaceDocument(shared: ReturnType<typeof createBBjTestServices>['shared'], uri: URI, text: string) {
    const document = shared.workspace.LangiumDocumentFactory.fromString(text, uri);
    shared.workspace.LangiumDocuments.addDocument(document);
    return document;
}

afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    clearAllVerdictStates();
    clearAllKeptChecks();
    clearAllContentChanges();
    setCompilerTrigger('debounced');
});

describe('on-save kept errors', () => {
    test('tracer: a BBj Parser error from the last check follows its line while the user types above it', async () => {
        const { shared, interopService, client, builder } = createHarness();
        setCompilerTrigger('on-save');
        interopService.scriptParseProgram({
            errors: [{
                categories: [],
                message: 'undefined variable',
                editorStartLine: 2, // one-based -- the line 'y = 2' sits on.
                editorEndLine: 2,
                startCharacter: 1,
                endCharacter: 1
            }]
        });
        const parseProgramSpy = vi.spyOn(interopService, 'parseProgram');

        const uri = URI.file('/proj/kept-error.bbj');
        const text = 'x = 1\ny = 2\nz = 3\n';
        addWorkspaceDocument(shared, uri, text);

        vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
        // The open check runs, stores its verdict as this document's kept check, and (had a real
        // LSP connection been attached) would have published it on zero-based line 1.
        client.open(uri.toString(), 1, text);
        await vi.advanceTimersByTimeAsync(0);
        expect(parseProgramSpy).toHaveBeenCalledTimes(1);

        // Insert a line above the flagged one -- typing arms no compiler check under on-save.
        client.change(uri.toString(), 2, [insertTextAt(0, 0, 'rem added\n')]);
        await vi.advanceTimersByTimeAsync(1000);
        expect(parseProgramSpy).toHaveBeenCalledTimes(1);

        await builder.update([uri], []);

        const document = shared.workspace.LangiumDocuments.getDocument(uri)!;
        const bbjParserDiagnostics = (document.diagnostics ?? []).filter(d => d.source === 'BBj Parser');
        expect(bbjParserDiagnostics).toHaveLength(1);
        expect(bbjParserDiagnostics[0].range.start.line).toBe(2);
        expect(parseProgramSpy).toHaveBeenCalledTimes(1);
    });
});
