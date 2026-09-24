import { DocumentState, DocumentValidator, EmptyFileSystem, URI } from 'langium';
import type { LangiumDocument } from 'langium';
import { validationHelper } from 'langium/test';
import type { NormalizedTextDocuments } from 'langium/lsp';
import { CancellationToken } from 'vscode-jsonrpc';
import type { Diagnostic } from 'vscode-languageserver';
import { DiagnosticSeverity } from 'vscode-languageserver';
import { afterEach, beforeAll, describe, expect, test, vi } from 'vitest';
import { BBjDocumentBuilder } from '../src/language/bbj-document-builder.js';
import { setCompilerTrigger } from '../src/language/bbj-document-validator.js';
import { clearAllVerdictStates, DOWNGRADED_SYNTAX_CODE } from '../src/language/bbj-diagnostic-reconciliation.js';
import { createBBjTestServices, JavaInteropTestService } from './bbj-test-module.js';
import { listenOnFakeConnection } from './fake-text-document-connection.js';
import { initializeWorkspace } from './test-helper.js';
import type { Program } from '../src/language/generated/ast.js';
import { END_OF_LINE_CHARACTER } from '../src/language/lsp-position.js';

/**
 * Builder-level coverage for the bbjcpl fallback dedup: an overlapping syntax complaint gives way
 * to bbjcpl's own diagnostic only once the cycle's checked text is provably the text bbjcpl
 * compiled, in both `on-save` and `debounced`, and every mismatch keeps merging exactly as before
 * this phase. Mirrors `on-save-trigger.test.ts`'s and `live-parse-interleaving.test.ts`'s own
 * harness and fixture shape -- see their file-level doc comments for why this shape.
 */

/** Two independent Langium parse errors on distinct lines -- see live-parse-interleaving.test.ts's
 * file-level doc comment for why this shape, not two unclosed parens or a parenthesis-plus-
 * line-break pairing. */
const TWO_SYNTAX_COMPLAINTS_TEXT = 'x = 1 +\nrem ok\ny = 2 *\n';

/** Structural view onto the builder's private members under test, reached via cast. */
type BuilderPrivates = {
    runBbjcplForDocuments(documents: LangiumDocument[], cancelToken: CancellationToken): Promise<void>;
    armLiveParseForDocument(document: LangiumDocument, textDocument: LangiumDocument['textDocument'], reason: 'open' | 'change' | 'save'): void;
    bbjcplAvailable: boolean | undefined;
};

/** A fresh, real `BBjDocumentBuilder` (via `createBBjTestServices`) with `bbjcplAvailable` forced
 * on, connected to a fake LSP client that drives the real `TextDocuments` store. */
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
function addWorkspaceDocument(shared: ReturnType<typeof createBBjTestServices>['shared'], uri: URI, text: string): LangiumDocument {
    const document: LangiumDocument = shared.workspace.LangiumDocumentFactory.fromString(text, uri);
    shared.workspace.LangiumDocuments.addDocument(document);
    return document;
}

/** A whole-line `Diagnostic` in the shape the save-time compiler parser produces (see
 * `bbj-cpl-parser.ts`), sourced `'BBjCPL'`. */
function bbjcplDiagnostic(line: number, message: string): Diagnostic {
    return {
        range: { start: { line, character: 0 }, end: { line, character: END_OF_LINE_CHARACTER } },
        message,
        severity: DiagnosticSeverity.Error,
        source: 'BBjCPL',
    };
}

/** Drains one real macrotask turn -- needed only once a cycle reaches `notifyDocumentPhase` for
 * real (a document already at the Validated state). Same idiom as
 * `live-parse-interleaving.test.ts`'s own `flushRealMacrotask`; see that file's doc comment for
 * why a fake `setTimeout` alone does not cover it. */
function flushRealMacrotask(): Promise<void> {
    return new Promise(resolve => setImmediate(resolve));
}

afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    clearAllVerdictStates();
    setCompilerTrigger('debounced');
});

describe('bbjcpl fallback dedup', () => {
    // The zero-based lines TWO_SYNTAX_COMPLAINTS_TEXT's two independent parse errors land on --
    // derived from a throwaway validation, never hard-coded, exactly as
    // live-parse-interleaving.test.ts's own beforeAll does.
    let firstFlaggedLine: number;
    let secondFlaggedLine: number;

    beforeAll(async () => {
        const probeServices = createBBjTestServices(EmptyFileSystem);
        await initializeWorkspace(probeServices.shared);
        const probeValidate = validationHelper<Program>(probeServices.BBj);
        const result = await probeValidate(TWO_SYNTAX_COMPLAINTS_TEXT);
        const parseErrors = result.diagnostics.filter(
            d => d.severity === DiagnosticSeverity.Error
                && (d.data as { code?: unknown } | undefined)?.code === DocumentValidator.ParsingError
        );
        const flaggedLines = [...new Set(parseErrors.map(d => d.range.start.line))];
        // Precondition: the fixture really does produce two independent parse errors on two
        // distinct lines.
        expect(flaggedLines.length).toBe(2);
        firstFlaggedLine = Math.min(...flaggedLines);
        secondFlaggedLine = flaggedLines.find(l => l !== firstFlaggedLine)!;
    });

    test('tracer: after a save, a bbjcpl finding on a line Langium also flags shows once, as bbjcpl\'s own diagnostic, and the other line stays an Error', async () => {
        const { shared, BBj, interopService, client, builder } = createHarness();
        setCompilerTrigger('on-save');
        interopService.scriptParseProgram('method-not-found');
        const compileSpy = vi.spyOn(BBj.compiler.BBjCPLService, 'compile').mockResolvedValue([]);

        const uri = URI.file('/proj/fallback-dedup-tracer.bbj');
        const uriString = uri.toString();
        addWorkspaceDocument(shared, uri, TWO_SYNTAX_COMPLAINTS_TEXT);

        vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
        // The open check compiles with no findings ([]).
        client.open(uriString, 1, TWO_SYNTAX_COMPLAINTS_TEXT);
        await vi.advanceTimersByTimeAsync(0);

        // Langium's own validation, for real -- remembers the pre-hierarchy list (the two parse
        // errors) together with the text it validated against.
        await builder.update([uri], []);
        const document = shared.workspace.LangiumDocuments.getDocument(uri)!;
        expect(document.state).toBe(DocumentState.Validated);

        compileSpy.mockResolvedValueOnce([bbjcplDiagnostic(firstFlaggedLine, 'Syntax error: probe')]);
        client.save(uriString);
        await vi.advanceTimersByTimeAsync(0);
        await flushRealMacrotask();
        await flushRealMacrotask();

        const diagnostics = document.diagnostics ?? [];
        const onFirstLine = diagnostics.filter(d => d.range.start.line === firstFlaggedLine);
        expect(onFirstLine).toHaveLength(1);
        expect(onFirstLine[0].source).toBe('BBjCPL');
        expect(onFirstLine[0].message).toBe('Syntax error: probe');

        const onSecondLine = diagnostics.filter(d => d.range.start.line === secondFlaggedLine);
        expect(onSecondLine).toHaveLength(1);
        expect(onSecondLine[0].severity).toBe(DiagnosticSeverity.Error);
        expect((onSecondLine[0].data as { code?: unknown } | undefined)?.code).not.toBe(DOWNGRADED_SYNTAX_CODE);
    });
});
