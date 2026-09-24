import { DocumentState, DocumentValidator, EmptyFileSystem, URI } from 'langium';
import type { LangiumDocument } from 'langium';
import { validationHelper } from 'langium/test';
import type { NormalizedTextDocuments } from 'langium/lsp';
import { CancellationToken } from 'vscode-jsonrpc';
import type { Diagnostic } from 'vscode-languageserver';
import { DiagnosticSeverity } from 'vscode-languageserver';
import { afterEach, beforeAll, describe, expect, test, vi } from 'vitest';
import { BBjDocumentBuilder } from '../src/language/bbj-document-builder.js';
import { applyConfiguredDiagnosticHierarchy, mergeDiagnostics, setCompilerTrigger } from '../src/language/bbj-document-validator.js';
import { clearAllVerdictStates, DOWNGRADED_SYNTAX_CODE, recallLangiumSnapshot } from '../src/language/bbj-diagnostic-reconciliation.js';
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

describe('the dedup applies only when bbjcpl checked the editor text', () => {
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
        expect(flaggedLines.length).toBe(2);
        firstFlaggedLine = Math.min(...flaggedLines);
        secondFlaggedLine = flaggedLines.find(l => l !== firstFlaggedLine)!;
    });

    test('debounced, file saved: a save records the version, and the rebuild path dedups an overlapping complaint for that version', async () => {
        const { shared, BBj, interopService, client, builder } = createHarness();
        setCompilerTrigger('debounced');
        interopService.scriptParseProgram('method-not-found');
        const compileSpy = vi.spyOn(BBj.compiler.BBjCPLService, 'compile').mockResolvedValue([]);
        const parseProgramSpy = vi.spyOn(interopService, 'parseProgram');

        const uri = URI.file('/proj/debounced-save-rebuild.bbj');
        const uriString = uri.toString();
        addWorkspaceDocument(shared, uri, TWO_SYNTAX_COMPLAINTS_TEXT);

        vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
        client.open(uriString, 1, TWO_SYNTAX_COMPLAINTS_TEXT);
        await vi.advanceTimersByTimeAsync(600); // settles the open-armed cycle

        await builder.update([uri], []); // real Langium validation -- baseline remembered
        await vi.advanceTimersByTimeAsync(600); // settles the rebuild-armed cycle update() triggers
        await flushRealMacrotask();
        await flushRealMacrotask();

        const document = shared.workspace.LangiumDocuments.getDocument(uri)!;
        expect(document.state).toBe(DocumentState.Validated);

        // A save under debounced arms nothing, but still records the version.
        parseProgramSpy.mockClear();
        client.save(uriString);
        await vi.advanceTimersByTimeAsync(1000);
        expect(parseProgramSpy).not.toHaveBeenCalled();

        compileSpy.mockResolvedValueOnce([bbjcplDiagnostic(firstFlaggedLine, 'Syntax error: rebuild probe')]);
        const privates = builder as unknown as BuilderPrivates;
        await privates.runBbjcplForDocuments([document], CancellationToken.None);
        await vi.advanceTimersByTimeAsync(500);
        await flushRealMacrotask();
        await flushRealMacrotask();

        const diagnostics = document.diagnostics ?? [];
        const onFirstLine = diagnostics.filter(d => d.range.start.line === firstFlaggedLine);
        // A dedup replaces the Langium complaint outright with bbjcpl's own diagnostic object --
        // its own message and no data.code -- unlike mergeDiagnostics, which would keep the
        // Langium complaint's own message and merely recolor its source.
        expect(onFirstLine).toHaveLength(1);
        expect(onFirstLine[0].source).toBe('BBjCPL');
        expect(onFirstLine[0].message).toBe('Syntax error: rebuild probe');
        expect((onFirstLine[0].data as { code?: unknown } | undefined)?.code).toBeUndefined();
    });

    test('debounced, unsaved edits: a change arms a cycle whose fallback merges as before when the file cannot be read', async () => {
        const { shared, BBj, interopService, client, builder } = createHarness();
        setCompilerTrigger('debounced');
        interopService.scriptParseProgram('method-not-found');
        vi.spyOn(BBj.compiler.BBjCPLService, 'compile').mockResolvedValue([]);

        const uri = URI.file('/proj/debounced-unsaved-edit.bbj');
        const uriString = uri.toString();
        addWorkspaceDocument(shared, uri, TWO_SYNTAX_COMPLAINTS_TEXT);

        vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
        client.open(uriString, 1, TWO_SYNTAX_COMPLAINTS_TEXT);
        await vi.advanceTimersByTimeAsync(600);
        await builder.update([uri], []);
        await vi.advanceTimersByTimeAsync(600);
        await flushRealMacrotask();
        await flushRealMacrotask();

        const document = shared.workspace.LangiumDocuments.getDocument(uri)!;
        expect(document.state).toBe(DocumentState.Validated);
        const latestLangiumList = document.diagnostics ?? [];

        // No save ever happened for this uri, and the EmptyFileSystemProvider's own readFile
        // throws synchronously -- both checkedTextIsOnDisk branches say "not on disk".
        const cplDiag = bbjcplDiagnostic(firstFlaggedLine, 'Syntax error: unsaved-edit probe');
        vi.spyOn(BBj.compiler.BBjCPLService, 'compile').mockResolvedValueOnce([cplDiag]);

        client.change(uriString, 2, [{ text: 'x = 1 +\nrem edited\ny = 2 *\n' }]);
        await vi.advanceTimersByTimeAsync(500);
        await flushRealMacrotask();
        await flushRealMacrotask();

        const expected = mergeDiagnostics(applyConfiguredDiagnosticHierarchy(latestLangiumList), [cplDiag]);
        expect(document.diagnostics).toEqual(expected);
    });

    test('on-save, an open whose on-disk text matches the checked text dedups an overlapping complaint', async () => {
        const { shared, BBj, interopService, client, builder } = createHarness();
        setCompilerTrigger('on-save');
        interopService.scriptParseProgram('method-not-found');
        const compileSpy = vi.spyOn(BBj.compiler.BBjCPLService, 'compile').mockResolvedValue([]);

        const uri = URI.file('/proj/on-save-open-disk-match.bbj');
        addWorkspaceDocument(shared, uri, TWO_SYNTAX_COMPLAINTS_TEXT);

        vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
        client.open(uri.toString(), 1, TWO_SYNTAX_COMPLAINTS_TEXT);
        await vi.advanceTimersByTimeAsync(0);

        await builder.update([uri], []);
        const document = shared.workspace.LangiumDocuments.getDocument(uri)!;
        expect(document.state).toBe(DocumentState.Validated);

        vi.spyOn(builder.fileSystemProvider, 'readFile').mockResolvedValue(TWO_SYNTAX_COMPLAINTS_TEXT);
        compileSpy.mockResolvedValueOnce([bbjcplDiagnostic(firstFlaggedLine, 'Syntax error: disk-match probe')]);

        const privates = builder as unknown as BuilderPrivates;
        privates.armLiveParseForDocument(document, document.textDocument, 'open');
        await vi.advanceTimersByTimeAsync(0);
        await flushRealMacrotask();
        await flushRealMacrotask();

        const diagnostics = document.diagnostics ?? [];
        const onFirstLine = diagnostics.filter(d => d.range.start.line === firstFlaggedLine);
        // A dedup replaces the Langium complaint outright with bbjcpl's own diagnostic object --
        // its own message and no data.code -- unlike mergeDiagnostics, which would keep the
        // Langium complaint's own message and merely recolor its source.
        expect(onFirstLine).toHaveLength(1);
        expect(onFirstLine[0].source).toBe('BBjCPL');
        expect(onFirstLine[0].message).toBe('Syntax error: disk-match probe');
        expect((onFirstLine[0].data as { code?: unknown } | undefined)?.code).toBeUndefined();
    });

    test('on-save, an open whose on-disk text differs by one non-ASCII character merges as before', async () => {
        const { shared, BBj, interopService, client, builder } = createHarness();
        setCompilerTrigger('on-save');
        interopService.scriptParseProgram('method-not-found');
        const compileSpy = vi.spyOn(BBj.compiler.BBjCPLService, 'compile').mockResolvedValue([]);

        const uri = URI.file('/proj/on-save-open-disk-mismatch.bbj');
        addWorkspaceDocument(shared, uri, TWO_SYNTAX_COMPLAINTS_TEXT);

        vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
        client.open(uri.toString(), 1, TWO_SYNTAX_COMPLAINTS_TEXT);
        await vi.advanceTimersByTimeAsync(0);

        await builder.update([uri], []);
        const document = shared.workspace.LangiumDocuments.getDocument(uri)!;
        expect(document.state).toBe(DocumentState.Validated);
        const latestLangiumList = document.diagnostics ?? [];

        // A different decoding of the same file -- a single non-ASCII character away from the
        // checked text, so an exact-string comparison never matches.
        vi.spyOn(builder.fileSystemProvider, 'readFile').mockResolvedValue(TWO_SYNTAX_COMPLAINTS_TEXT.replace('rem ok', 'rem oké'));
        const cplDiag = bbjcplDiagnostic(firstFlaggedLine, 'Syntax error: disk-mismatch probe');
        compileSpy.mockResolvedValueOnce([cplDiag]);

        const privates = builder as unknown as BuilderPrivates;
        privates.armLiveParseForDocument(document, document.textDocument, 'open');
        await vi.advanceTimersByTimeAsync(0);
        await flushRealMacrotask();
        await flushRealMacrotask();

        const expected = mergeDiagnostics(applyConfiguredDiagnosticHierarchy(latestLangiumList), [cplDiag]);
        expect(document.diagnostics).toEqual(expected);
    });

    test('on-save, an open whose on-disk read rejects merges as before', async () => {
        const { shared, BBj, interopService, client, builder } = createHarness();
        setCompilerTrigger('on-save');
        interopService.scriptParseProgram('method-not-found');
        const compileSpy = vi.spyOn(BBj.compiler.BBjCPLService, 'compile').mockResolvedValue([]);

        const uri = URI.file('/proj/on-save-open-disk-reject.bbj');
        addWorkspaceDocument(shared, uri, TWO_SYNTAX_COMPLAINTS_TEXT);

        vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
        client.open(uri.toString(), 1, TWO_SYNTAX_COMPLAINTS_TEXT);
        await vi.advanceTimersByTimeAsync(0);

        await builder.update([uri], []);
        const document = shared.workspace.LangiumDocuments.getDocument(uri)!;
        expect(document.state).toBe(DocumentState.Validated);
        const latestLangiumList = document.diagnostics ?? [];

        vi.spyOn(builder.fileSystemProvider, 'readFile').mockRejectedValue(new Error('read failed'));
        const cplDiag = bbjcplDiagnostic(firstFlaggedLine, 'Syntax error: disk-reject probe');
        compileSpy.mockResolvedValueOnce([cplDiag]);

        const privates = builder as unknown as BuilderPrivates;
        privates.armLiveParseForDocument(document, document.textDocument, 'open');
        await vi.advanceTimersByTimeAsync(0);
        await flushRealMacrotask();
        await flushRealMacrotask();

        const expected = mergeDiagnostics(applyConfiguredDiagnosticHierarchy(latestLangiumList), [cplDiag]);
        expect(document.diagnostics).toEqual(expected);
    });

    test('a stale Langium snapshot whose flagged line differs from the checked text keeps that complaint even though it overlaps', async () => {
        const { shared, BBj, interopService, client, builder } = createHarness();
        setCompilerTrigger('on-save');
        interopService.scriptParseProgram('method-not-found');
        const compileSpy = vi.spyOn(BBj.compiler.BBjCPLService, 'compile').mockResolvedValue([]);

        const uri = URI.file('/proj/stale-snapshot-line-diff.bbj');
        const uriString = uri.toString();
        const v1Text = TWO_SYNTAX_COMPLAINTS_TEXT;
        addWorkspaceDocument(shared, uri, v1Text);

        vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
        client.open(uriString, 1, v1Text);
        await vi.advanceTimersByTimeAsync(0);

        await builder.update([uri], []);
        const document = shared.workspace.LangiumDocuments.getDocument(uri)!;
        expect(document.state).toBe(DocumentState.Validated);
        const snapshot = recallLangiumSnapshot(document)!;
        expect(snapshot.validatedText).toBe(v1Text);

        // Edits only the first flagged line's own text -- the second flagged line's text stays
        // byte-identical between v1 and v2, and Langium is never re-validated for v2.
        const v1Lines = v1Text.split('\n');
        v1Lines[firstFlaggedLine] = `${v1Lines[firstFlaggedLine]} 2`;
        const v2Text = v1Lines.join('\n');
        expect(v2Text).not.toBe(v1Text);
        client.change(uriString, 2, [{ text: v2Text }]); // 'change' arms nothing under on-save

        compileSpy.mockResolvedValueOnce([bbjcplDiagnostic(firstFlaggedLine, 'Syntax error: stale-line probe')]);
        client.save(uriString);
        await vi.advanceTimersByTimeAsync(0);
        await flushRealMacrotask();
        await flushRealMacrotask();

        const diagnostics = document.diagnostics ?? [];
        const onFirstLine = diagnostics.filter(d => d.range.start.line === firstFlaggedLine);
        // The stale complaint stays -- kept as an Error alongside bbjcpl's own diagnostic, not
        // replaced by it, because the line it sits on no longer matches what bbjcpl actually
        // checked.
        expect(onFirstLine.some(d => d.severity === DiagnosticSeverity.Error && d.source !== 'BBjCPL')).toBe(true);
        expect(onFirstLine.some(d => d.source === 'BBjCPL')).toBe(true);
    });

    test('bbjcpl returning no diagnostics publishes the hierarchy-applied Langium list unchanged, and the file is never read', async () => {
        const { shared, BBj, interopService, client, builder } = createHarness();
        setCompilerTrigger('on-save');
        interopService.scriptParseProgram('method-not-found');
        vi.spyOn(BBj.compiler.BBjCPLService, 'compile').mockResolvedValue([]);
        const readFileSpy = vi.spyOn(builder.fileSystemProvider, 'readFile');

        const uri = URI.file('/proj/empty-cpl-result.bbj');
        const uriString = uri.toString();
        addWorkspaceDocument(shared, uri, TWO_SYNTAX_COMPLAINTS_TEXT);

        vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
        client.open(uriString, 1, TWO_SYNTAX_COMPLAINTS_TEXT);
        await vi.advanceTimersByTimeAsync(0);

        await builder.update([uri], []);
        const document = shared.workspace.LangiumDocuments.getDocument(uri)!;
        const baselineList = applyConfiguredDiagnosticHierarchy(recallLangiumSnapshot(document)!.diagnostics);

        client.save(uriString);
        await vi.advanceTimersByTimeAsync(0);
        await flushRealMacrotask();
        await flushRealMacrotask();

        expect(document.diagnostics).toEqual(baselineList);
        expect(readFileSpy).not.toHaveBeenCalled();
    });
});
