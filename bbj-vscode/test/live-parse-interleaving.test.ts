import { DocumentState, DocumentValidator, EmptyFileSystem, URI } from 'langium';
import type { LangiumDocument, LangiumSharedCoreServices } from 'langium';
import { validationHelper } from 'langium/test';
import type { NormalizedTextDocuments } from 'langium/lsp';
import { BBjDocumentBuilder } from '../src/language/bbj-document-builder.js';
import { TextDocument } from 'vscode-languageserver-textdocument';
import type { Diagnostic } from 'vscode-languageserver';
import { DiagnosticSeverity } from 'vscode-languageserver';
import { afterEach, beforeAll, describe, expect, test, vi } from 'vitest';
import { BBJ_PARSER_SOURCE } from '../src/language/bbj-parser-service.js';
import { METHOD_NOT_FOUND, type ParseError } from '../src/language/java-interop.js';
import { mergeDiagnostics, setCompilerTrigger } from '../src/language/bbj-document-validator.js';
import {
    clearAllVerdictStates,
    DOWNGRADED_SYNTAX_CODE,
    getVerdictState,
    recallLangiumSnapshot,
    rememberLangiumDiagnostics,
    setVerdictState
} from '../src/language/bbj-diagnostic-reconciliation.js';
import { createBBjTestServices, JavaInteropTestService } from './bbj-test-module.js';
import { initializeWorkspace } from './test-helper.js';
import type { Program } from '../src/language/generated/ast.js';
import { END_OF_LINE_CHARACTER } from '../src/language/lsp-position.js';

/**
 * Interleaving coverage for a document's concurrent diagnostics writers: the live-parse cycle
 * armed directly from a text-document event, the pure diagnostics-list composition, and
 * Langium's own validation, each finishing in either order and across text versions -- no
 * writer's list is ever lost, doubled or misattributed against another's.
 *
 * Two independent Langium syntax complaints on distinct lines are needed throughout this file.
 * An unclosed parenthesis mid-document swallows every following statement into a single parser
 * error (this codebase's own established finding -- see the whole-suite decision log), and a
 * document carrying any parser error skips line-break validation entirely
 * (`checkLineBreaks` bails whenever `document.parseResult.parserErrors.length > 0`), so two
 * genuinely independent parse errors need the dangling-binary-operator pattern this codebase
 * already established for that case (the same shape `bbj-parser-service.test.ts`'s
 * "an older server gets exactly the 0.16.x diagnostics" describe block pins), not a
 * parenthesis-plus-line-break combination.
 */

/** Two independent Langium parse errors on distinct lines, separated by a resynchronizing
 * statement -- see the file-level doc comment for why this shape, not two unclosed parens or a
 * parenthesis-plus-line-break pairing. */
const TWO_SYNTAX_COMPLAINTS_TEXT = 'x = 1 +\nrem ok\ny = 2 *\n';

/** Structural view onto the builder's private/protected members under test, reached via cast. */
type BuilderPrivates = {
    bbjcplAvailable: boolean | undefined;
    sendDiagnosticsToClient(uri: URI, diagnostics: Diagnostic[]): void;
};

/** A fresh, real `BBjDocumentBuilder` (via `createBBjTestServices`) with `bbjcplAvailable` forced
 * on -- there is no BBj install in this test environment, and every test here is about which
 * writer's list wins, not availability detection. Mirrors `live-parse-scheduling.test.ts`'s own
 * `createHarness()`. */
function createHarness() {
    const { shared, BBj } = createBBjTestServices(EmptyFileSystem);
    const builder = shared.workspace.DocumentBuilder as BBjDocumentBuilder;
    const privates = builder as unknown as BuilderPrivates;
    privates.bbjcplAvailable = true;
    const interopService = BBj.java.JavaInteropService as JavaInteropTestService;
    const textDocuments = shared.workspace.TextDocuments as unknown as NormalizedTextDocuments;
    return { shared, BBj, builder, privates, interopService, textDocuments };
}

/** Adds a `LangiumDocument` for `uri` the way a workspace scan would -- never built, state stays
 * `Parsed`, so it models a file the initial build has not reached yet. */
function addWorkspaceDocument(shared: ReturnType<typeof createBBjTestServices>['shared'], uri: URI, text: string): LangiumDocument {
    const document: LangiumDocument = shared.workspace.LangiumDocumentFactory.fromString(text, uri);
    shared.workspace.LangiumDocuments.addDocument(document);
    return document;
}

/** Fires a combined open+change event for `uri` on the harness's real `TextDocuments` store. */
function openOrChange(textDocuments: NormalizedTextDocuments, uriString: string, version: number, text: string): void {
    textDocuments.set(TextDocument.create(uriString, 'bbj', version, text));
}

/**
 * Drains one real macrotask turn on top of `vi.advanceTimersByTimeAsync`. Needed only for a
 * cycle that reaches `notifyDocumentPhase` for real (a document already at the Validated state):
 * Langium's own `interruptAndCheck` compares its `CancellationToken.None` (from
 * `vscode-languageserver-protocol`) by identity against whatever token is passed in, and this
 * codebase's own `CancellationToken.None` (from `vscode-jsonrpc`) is a structurally-equal but
 * distinct object, so the comparison fails and `interruptAndCheck` takes its `delayNextTick()`
 * branch -- a real `setImmediate`, which `toFake: ['setTimeout', 'clearTimeout']` does not cover.
 * Pre-existing behaviour, unrelated to this file's own changes (`live-parse-scheduling.test.ts`
 * established the same helper first).
 */
function flushRealMacrotask(): Promise<void> {
    return new Promise(resolve => setImmediate(resolve));
}

/** True when no two diagnostics in `diagnostics` share the same source, message, start line and
 * severity -- the uniqueness bar every captured list in this file must clear. */
function hasNoDuplicates(diagnostics: Diagnostic[]): boolean {
    const seen = new Set<string>();
    for (const d of diagnostics) {
        const message = typeof d.message === 'string' ? d.message : d.message.value;
        const key = `${d.source ?? ''}\0${message}\0${d.range.start.line}\0${d.severity ?? ''}`;
        if (seen.has(key)) return false;
        seen.add(key);
    }
    return true;
}

afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    clearAllVerdictStates();
    setCompilerTrigger('debounced');
});

describe('live-parse and Langium writers interleaved', () => {
    // The zero-based lines TWO_SYNTAX_COMPLAINTS_TEXT's two independent parse errors land on --
    // derived from a throwaway validation on a separate, freshly-initialized services instance,
    // never hard-coded (Langium's own error-recovery line placement is not this test's concern).
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

    /** The scripted verdict the "order independence" pair of tests shares, flagging only the
     * first complaint's line -- same shape as the tracer's own scripted error. */
    function orderIndependenceScriptedError(): ParseError {
        return {
            categories: ['SyntaxError'],
            message: 'order-independence verdict on the first complaint line',
            editorStartLine: firstFlaggedLine + 1, // ParseError lines are one-based.
            editorEndLine: firstFlaggedLine + 1,
            startCharacter: 1,
            endCharacter: 5,
        };
    }

    /** Set by the "verdict first" order-independence test, compared against by the "Langium
     * first" one -- both reconcile the same fixture and scripted verdict, just in the opposite
     * arrival order, and must end at the same published list. */
    let orderIndependenceReference: Diagnostic[] | undefined;

    test('BBj\'s verdict first, then Langium\'s validation of the same text, publishes one consistent list', async () => {
        const { shared, builder, privates, interopService, textDocuments } = createHarness();

        // BBj's own verdict flags only the first complaint's line -- the second stays something
        // BBj is silent on, so Langium's carry-over treatment must downgrade it instead of
        // dropping it.
        const scriptedError: ParseError = {
            categories: ['SyntaxError'],
            message: 'bbj verdict on the first complaint line',
            editorStartLine: firstFlaggedLine + 1, // ParseError lines are one-based.
            editorEndLine: firstFlaggedLine + 1,
            startCharacter: 1,
            endCharacter: 5,
        };
        interopService.scriptParseProgram({ errors: [scriptedError] });

        const uri = URI.file('/proj/interleave-tracer.bbj');
        const uriString = uri.toString();
        const document = addWorkspaceDocument(shared, uri, TWO_SYNTAX_COMPLAINTS_TEXT);
        // A file the startup scan loaded but a build has never touched -- Parsed, not Validated,
        // exactly the state an early verdict is published against.
        expect(document.state).toBe(DocumentState.Parsed);

        const clientPublishedLists: Diagnostic[][] = [];
        vi.spyOn(privates, 'sendDiagnosticsToClient').mockImplementation((_uri, diagnostics) => {
            clientPublishedLists.push(diagnostics);
        });
        const validatedPublishedLists: Diagnostic[][] = [];
        builder.onDocumentPhase(DocumentState.Validated, doc => {
            validatedPublishedLists.push(doc.diagnostics ?? []);
        });

        vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
        // Arrival order 1: the live-parse cycle's verdict, armed directly from the change event,
        // reaches the client before Langium has ever validated this text.
        openOrChange(textDocuments, uriString, 3, TWO_SYNTAX_COMPLAINTS_TEXT);
        await vi.advanceTimersByTimeAsync(600);

        expect(clientPublishedLists).toHaveLength(1);
        expect(clientPublishedLists[0]).toHaveLength(1);
        expect(clientPublishedLists[0][0].source).toBe(BBJ_PARSER_SOURCE);
        expect(clientPublishedLists[0][0].range.start.line).toBe(firstFlaggedLine);

        // Arrival order 2: Langium's own validation of the very same text runs afterward.
        await builder.update([uri], []);

        expect(validatedPublishedLists.length).toBeGreaterThan(0);
        const finalList = validatedPublishedLists[validatedPublishedLists.length - 1];

        // BBj's diagnostic is present exactly once, on the first complaint's line.
        const bbjDiagnostics = finalList.filter(d => d.source === BBJ_PARSER_SOURCE);
        expect(bbjDiagnostics).toHaveLength(1);
        expect(bbjDiagnostics[0].severity).toBe(DiagnosticSeverity.Error);
        expect(bbjDiagnostics[0].range.start.line).toBe(firstFlaggedLine);

        // No Langium syntax complaint survives on BBj's own line -- replaced, not merely
        // downgraded.
        const onFirstLine = finalList.filter(d => d.range.start.line === firstFlaggedLine);
        expect(onFirstLine).toHaveLength(1);
        expect(onFirstLine[0].source).toBe(BBJ_PARSER_SOURCE);

        // The second complaint, which BBj's verdict never mentioned, is downgraded to a Warning
        // rather than dropped.
        const downgraded = finalList.filter(
            d => (d.data as { code?: unknown } | undefined)?.code === DOWNGRADED_SYNTAX_CODE
        );
        expect(downgraded).toHaveLength(1);
        expect(downgraded[0].severity).toBe(DiagnosticSeverity.Warning);
        expect(downgraded[0].source).toBe('bbj');
        expect(downgraded[0].range.start.line).toBe(secondFlaggedLine);

        // No diagnostic ever doubles up, in the early client-sent list or the final Validated
        // list.
        for (const list of [...clientPublishedLists, ...validatedPublishedLists]) {
            expect(hasNoDuplicates(list)).toBe(true);
        }
    });

    test('a save-time compile that resolves after Langium validates newer text merges onto that newer Langium list, not onto whatever another writer left in document.diagnostics', async () => {
        const { shared, BBj, builder, textDocuments, interopService } = createHarness();
        // The old-server default (MethodNotFound): no verdict, so this cycle falls back to the
        // save-time compile.
        interopService.scriptParseProgram('method-not-found');

        let resolveCompile: (diagnostics: Diagnostic[]) => void = () => { /* replaced below */ };
        vi.spyOn(BBj.compiler.BBjCPLService, 'compile').mockImplementation(
            () => new Promise<Diagnostic[]>(resolve => { resolveCompile = resolve; })
        );

        const uri = URI.file('/proj/interleave-race.bbj');
        const uriString = uri.toString();
        const textV1 = 'x = 1\n';
        addWorkspaceDocument(shared, uri, textV1);

        vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
        openOrChange(textDocuments, uriString, 1, textV1);
        // Fires the debounce cycle: the old-server probe answers, and it suspends awaiting the
        // save-time compile (still pending -- resolveCompile has not been called yet).
        await vi.advanceTimersByTimeAsync(600);

        // While the compile is still pending, the document is edited and Langium validates the
        // new text -- a real validation landing in the middle of this cycle's own wait.
        const textV2 = 'x = 1 +\nrem ok\ny = 2\n';
        openOrChange(textDocuments, uriString, 2, textV2);
        await builder.update([uri], []);

        const document = shared.workspace.LangiumDocuments.getDocument(uri)!;
        expect(document.state).toBe(DocumentState.Validated);
        const langiumListForV2 = document.diagnostics ?? [];
        // Precondition: the new text really does produce a real Langium diagnostic to merge onto.
        expect(langiumListForV2.length).toBeGreaterThan(0);

        // A different writer overwrites document.diagnostics between that validation and this
        // cycle's own save-time compile resolving -- the concurrent-publish race this cycle must
        // not be fooled by: its own result must come from the latest Langium snapshot, not from
        // whatever document.diagnostics happens to hold at the moment the compile resolves.
        const anotherWritersDiagnostic: Diagnostic = {
            range: { start: { line: 0, character: 0 }, end: { line: 0, character: 1 } },
            message: 'a different cycle\'s own diagnostic, unrelated to this one',
            severity: DiagnosticSeverity.Warning,
        };
        document.diagnostics = [anotherWritersDiagnostic];

        const cplDiagnostic: Diagnostic = {
            range: { start: { line: 0, character: 0 }, end: { line: 0, character: 5 } },
            message: 'bbjcpl on the new text',
            severity: DiagnosticSeverity.Error,
            source: 'BBjCPL',
        };
        resolveCompile([cplDiagnostic]);
        await flushRealMacrotask();
        await flushRealMacrotask();

        expect(document.diagnostics).toEqual(mergeDiagnostics(langiumListForV2, [cplDiagnostic]));
    });

    test('order independence: verdict first, then Langium validates, ends with the full reconciliation (the reference this file\'s "Langium first" test compares against)', async () => {
        vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });

        const { shared, interopService, textDocuments, builder } = createHarness();
        interopService.scriptParseProgram({ errors: [orderIndependenceScriptedError()] });
        const uri = URI.file('/proj/order-verdict-first.bbj');
        addWorkspaceDocument(shared, uri, TWO_SYNTAX_COMPLAINTS_TEXT);
        openOrChange(textDocuments, uri.toString(), 1, TWO_SYNTAX_COMPLAINTS_TEXT);
        await vi.advanceTimersByTimeAsync(600);
        await builder.update([uri], []);

        const document = shared.workspace.LangiumDocuments.getDocument(uri)!;
        expect(document.diagnostics).toBeDefined();
        expect(document.diagnostics!.length).toBeGreaterThan(0);
        expect(hasNoDuplicates(document.diagnostics!)).toBe(true);
        orderIndependenceReference = document.diagnostics!;
    });

    test('order independence: Langium first, then the verdict cycle, ends with the same reconciliation as verdict first', async () => {
        expect(orderIndependenceReference).toBeDefined(); // depends on the previous test's own run

        vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });

        const { shared, interopService, textDocuments, builder } = createHarness();
        interopService.scriptParseProgram({ errors: [orderIndependenceScriptedError()] });
        const uri = URI.file('/proj/order-langium-first.bbj');
        addWorkspaceDocument(shared, uri, TWO_SYNTAX_COMPLAINTS_TEXT);
        openOrChange(textDocuments, uri.toString(), 1, TWO_SYNTAX_COMPLAINTS_TEXT);
        await builder.update([uri], []);
        await vi.advanceTimersByTimeAsync(600);
        await flushRealMacrotask();

        const document = shared.workspace.LangiumDocuments.getDocument(uri)!;
        expect(document.diagnostics).toEqual(orderIndependenceReference);
        expect(hasNoDuplicates(document.diagnostics!)).toBe(true);
    });

    test('a verdict newer than Langium: an unchanged-line complaint downgrades, the edited-line complaint stays an Error, the complaint on BBj\'s line drops, and re-validating publishes the full reconciliation', async () => {
        const { shared, builder, textDocuments, interopService } = createHarness();

        const v1Text = TWO_SYNTAX_COMPLAINTS_TEXT;
        const uri = URI.file('/proj/verdict-newer-than-langium.bbj');
        const uriString = uri.toString();
        addWorkspaceDocument(shared, uri, v1Text);

        openOrChange(textDocuments, uriString, 1, v1Text);
        await builder.update([uri], []);
        const document = shared.workspace.LangiumDocuments.getDocument(uri)!;
        expect(document.state).toBe(DocumentState.Validated);

        // A third complaint, hand-placed on a line the real fixture's two parse errors never
        // land on (confirmed by the throwaway probe above), layered onto the genuinely-validated
        // snapshot -- the rest of this test exercises the real event/verdict/composition wiring
        // end to end; only this one complaint's exact line is chosen by hand, to pin the
        // three-way downgrade/keep/drop split deterministically instead of fighting the parser's
        // own recovery for a third independent syntax error.
        const freeLine = firstFlaggedLine === 0 || secondFlaggedLine === 0 ? Math.max(firstFlaggedLine, secondFlaggedLine) + 1 : 0;
        const handPlacedComplaint: Diagnostic = {
            range: { start: { line: freeLine, character: 0 }, end: { line: freeLine, character: END_OF_LINE_CHARACTER } },
            message: 'hand-placed complaint for the interleaving matrix',
            severity: DiagnosticSeverity.Error,
            source: 'bbj',
            data: { code: DocumentValidator.ParsingError },
        };
        const realSnapshot = recallLangiumSnapshot(document)!;
        expect(realSnapshot.validatedText).toBe(v1Text);
        rememberLangiumDiagnostics(document, [handPlacedComplaint, ...realSnapshot.diagnostics], v1Text);

        // Version 2: only the hand-placed complaint's own line changes; the two real complaint
        // lines stay byte-identical to version 1.
        const v1Lines = v1Text.split('\n');
        v1Lines[freeLine] = 'rem edited\n'.trimEnd();
        const v2Text = v1Lines.join('\n');
        expect(v2Text).not.toBe(v1Text);

        const scriptedError: ParseError = {
            categories: ['SyntaxError'],
            message: 'bbj verdict for version 2',
            editorStartLine: firstFlaggedLine + 1,
            editorEndLine: firstFlaggedLine + 1,
            startCharacter: 1,
            endCharacter: 3,
        };
        interopService.scriptParseProgram({ errors: [scriptedError] });

        vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
        openOrChange(textDocuments, uriString, 2, v2Text);
        await vi.advanceTimersByTimeAsync(600);
        await flushRealMacrotask();

        const earlyList = document.diagnostics ?? [];
        const bbjEarly = earlyList.filter(d => d.source === BBJ_PARSER_SOURCE);
        expect(bbjEarly).toHaveLength(1);

        const onFirstFlaggedLine = earlyList.filter(d => d.range.start.line === firstFlaggedLine);
        expect(onFirstFlaggedLine).toHaveLength(1);
        expect(onFirstFlaggedLine[0].source).toBe(BBJ_PARSER_SOURCE); // dropped, replaced by BBj's own

        const onSecondFlaggedLine = earlyList.filter(d => d.range.start.line === secondFlaggedLine);
        expect(onSecondFlaggedLine).toHaveLength(1);
        expect(onSecondFlaggedLine[0].severity).toBe(DiagnosticSeverity.Warning);
        expect((onSecondFlaggedLine[0].data as { code?: unknown } | undefined)?.code).toBe(DOWNGRADED_SYNTAX_CODE);

        const onEditedLine = earlyList.filter(d => d.range.start.line === freeLine);
        expect(onEditedLine).toHaveLength(1);
        expect(onEditedLine[0].severity).toBe(DiagnosticSeverity.Error);
        expect(onEditedLine[0].message).toBe(handPlacedComplaint.message);

        expect(hasNoDuplicates(earlyList)).toBe(true);

        // Re-validating version 2 for real publishes the full reconciliation: BBj's diagnostic
        // still present exactly once, still no duplicates.
        await builder.update([uri], []);
        const reconciledList = document.diagnostics ?? [];
        expect(reconciledList.filter(d => d.source === BBJ_PARSER_SOURCE)).toHaveLength(1);
        expect(hasNoDuplicates(reconciledList)).toBe(true);
    });

    test('Langium newer than a stale verdict: releasing the held verdict after update() already published version 2 changes nothing', async () => {
        const { shared, builder, textDocuments, interopService } = createHarness();

        let resolveParseProgram: () => void = () => { /* replaced below */ };
        vi.spyOn(interopService, 'parseProgram').mockImplementation(params => new Promise(resolve => {
            resolveParseProgram = () => resolve({
                version: params.version,
                errors: [{
                    categories: ['SyntaxError'],
                    message: 'a verdict for the version this request was sent for',
                    editorStartLine: 1,
                    editorEndLine: 1,
                    startCharacter: 1,
                    endCharacter: 3,
                }],
            });
        }));

        const uri = URI.file('/proj/langium-newer-than-verdict.bbj');
        const uriString = uri.toString();
        const v1Text = 'x = 1\n';
        addWorkspaceDocument(shared, uri, v1Text);

        vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
        openOrChange(textDocuments, uriString, 1, v1Text);
        // Fires the cycle: it sends the version-1 request and suspends awaiting it -- the mock
        // never resolves until resolveParseProgram() is called.
        await vi.advanceTimersByTimeAsync(600);

        // The user edits to version 2, and Langium validates it for real while the version-1
        // request is still held.
        const v2Text = TWO_SYNTAX_COMPLAINTS_TEXT;
        openOrChange(textDocuments, uriString, 2, v2Text);
        await builder.update([uri], []);

        const document = shared.workspace.LangiumDocuments.getDocument(uri)!;
        expect(document.state).toBe(DocumentState.Validated);
        const langiumListForV2 = document.diagnostics ?? [];
        expect(langiumListForV2.length).toBeGreaterThan(0); // precondition

        // The held version-1 request now resolves -- superseded by the edit, so it must publish
        // nothing and store no verdict state.
        resolveParseProgram();
        await flushRealMacrotask();
        await flushRealMacrotask();

        expect(document.diagnostics).toEqual(langiumListForV2);
        expect(getVerdictState(uri)).toBeUndefined();
    });

    test('a stale Langium validation, released after a newer verdict already exists, still holds BBj\'s newer diagnostic exactly once', async () => {
        const { shared, builder, textDocuments, interopService, BBj } = createHarness();

        let releaseValidation: () => void = () => { /* replaced below */ };
        const heldValidation = new Promise<void>(resolve => { releaseValidation = resolve; });
        const validatorService = BBj.validation.DocumentValidator;
        const originalValidateDocument = validatorService.validateDocument.bind(validatorService);
        vi.spyOn(validatorService, 'validateDocument').mockImplementation(async (...args) => {
            await heldValidation;
            return originalValidateDocument(...(args as Parameters<typeof originalValidateDocument>));
        });

        const uri = URI.file('/proj/stale-langium-after-newer-verdict.bbj');
        const uriString = uri.toString();
        const v1Text = 'x = 1\n';
        addWorkspaceDocument(shared, uri, v1Text);

        const validatedPublishedLists: Diagnostic[][] = [];
        builder.onDocumentPhase(DocumentState.Validated, doc => {
            validatedPublishedLists.push(doc.diagnostics ?? []);
        });

        vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
        openOrChange(textDocuments, uriString, 1, v1Text);
        // Starts a build for version 1 -- it parses/links for real and hangs inside the held
        // validateDocument(). Not awaited here: it only resolves once releaseValidation() runs.
        const updatePromise = builder.update([uri], []);
        // Gives that build a chance to reach, and hang on, the held validation.
        await flushRealMacrotask();
        await flushRealMacrotask();

        const document = shared.workspace.LangiumDocuments.getDocument(uri)!;
        expect(document.state < DocumentState.Validated).toBe(true);

        // While validation is held, the user edits to newer text and the cycle's own verdict for
        // it arrives, sent to the client without writing document.diagnostics (still below
        // Validated).
        const v2Text = TWO_SYNTAX_COMPLAINTS_TEXT;
        const scriptedError: ParseError = {
            categories: ['SyntaxError'],
            message: 'bbj verdict for the newer text',
            editorStartLine: firstFlaggedLine + 1,
            editorEndLine: firstFlaggedLine + 1,
            startCharacter: 1,
            endCharacter: 3,
        };
        interopService.scriptParseProgram({ errors: [scriptedError] });
        openOrChange(textDocuments, uriString, 2, v2Text);
        await vi.advanceTimersByTimeAsync(600);

        expect(document.diagnostics).toBeUndefined(); // still held -- nothing written yet

        releaseValidation();
        await updatePromise;
        await flushRealMacrotask();
        await flushRealMacrotask();

        expect(document.state).toBe(DocumentState.Validated);
        const finalList = validatedPublishedLists[validatedPublishedLists.length - 1] ?? document.diagnostics ?? [];
        const bbjDiagnostics = finalList.filter(d => d.source === BBJ_PARSER_SOURCE);
        expect(bbjDiagnostics).toHaveLength(1);
        expect(hasNoDuplicates(finalList)).toBe(true);
    });

    test('two consecutive cycles with the same verdict for unchanged text publish deep-equal lists', async () => {
        const { privates, interopService, shared, textDocuments } = createHarness();
        const scriptedError: ParseError = {
            categories: ['SyntaxError'],
            message: 'idempotent verdict',
            editorStartLine: 1,
            editorEndLine: 1,
            startCharacter: 1,
            endCharacter: 3,
        };
        interopService.scriptParseProgram({ errors: [scriptedError] });

        const uri = URI.file('/proj/idempotent.bbj');
        const uriString = uri.toString();
        const text = 'x = 1\n';
        addWorkspaceDocument(shared, uri, text);

        const clientPublishedLists: Diagnostic[][] = [];
        vi.spyOn(privates, 'sendDiagnosticsToClient').mockImplementation((_uri, diagnostics) => {
            clientPublishedLists.push(diagnostics);
        });

        vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
        openOrChange(textDocuments, uriString, 1, text);
        await vi.advanceTimersByTimeAsync(600);
        // A relink-driven revalidation of unchanged text still arms a fresh cycle.
        openOrChange(textDocuments, uriString, 1, text);
        await vi.advanceTimersByTimeAsync(600);

        expect(clientPublishedLists).toHaveLength(2);
        expect(clientPublishedLists[0]).toEqual(clientPublishedLists[1]);
        expect(hasNoDuplicates(clientPublishedLists[1])).toBe(true);
    });

    test('two overlapping cycles for the same document: an older cycle that fails after a newer cycle already published its verdict changes nothing', async () => {
        const { shared, BBj, privates, interopService, textDocuments } = createHarness();

        const uri = URI.file('/proj/stale-failed-after-newer-verdict.bbj');
        const uriString = uri.toString();
        const v1Text = 'x = 1\n';
        addWorkspaceDocument(shared, uri, v1Text);

        // Version 1's request hangs until releaseV1Failure() runs; version 2's request resolves
        // with a verdict right away -- so the newer cycle finishes, and publishes, first.
        let releaseV1Failure: () => void = () => { /* replaced below */ };
        vi.spyOn(interopService, 'parseProgram').mockImplementation(params => {
            if (params.version === '1') {
                return new Promise((_resolve, reject) => {
                    releaseV1Failure = () => reject(Object.assign(
                        new Error('a parser exception on the endpoint'), { code: -33001 }
                    ));
                });
            }
            return Promise.resolve({
                version: params.version,
                errors: [{
                    categories: ['SyntaxError'],
                    message: 'the newer cycle\'s own verdict',
                    editorStartLine: 1,
                    editorEndLine: 1,
                    startCharacter: 1,
                    endCharacter: 3,
                }],
            });
        });
        const compileSpy = vi.spyOn(BBj.compiler.BBjCPLService, 'compile');
        const sendSpy = vi.spyOn(privates, 'sendDiagnosticsToClient');

        vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });

        // Cycle A: armed for version 1, its debounce timer fires and sends the version-1
        // request, which then hangs -- the cycle is suspended awaiting it.
        openOrChange(textDocuments, uriString, 1, v1Text);
        await vi.advanceTimersByTimeAsync(500);

        // The edit that supersedes cycle A: `debouncedCompile`'s timer callback deletes its own
        // `cplDebounceTimers` entry before its first await (see that method's own doc comment),
        // so this schedules an independent, second timer for the same document rather than
        // merging into cycle A's still-pending one.
        const v2Text = 'x = 1\ny = 2\n';
        openOrChange(textDocuments, uriString, 2, v2Text);

        // Cycle B: its own timer fires, its request resolves immediately with a verdict for
        // version 2, and it publishes -- all before cycle A's own request ever resolves.
        await vi.advanceTimersByTimeAsync(500);

        expect(sendSpy).toHaveBeenCalledTimes(1);
        const [, publishedForV2] = sendSpy.mock.calls[0];
        expect(publishedForV2.some(d => d.source === BBJ_PARSER_SOURCE)).toBe(true);
        const verdictAfterCycleB = getVerdictState(uri);
        expect(verdictAfterCycleB?.version).toBe(2);

        // Cycle A's stale request now resolves as a real application failure -- not cancelled,
        // which the server only returns for a request it recognized as superseded.
        releaseV1Failure();
        await flushRealMacrotask();
        await flushRealMacrotask();
        await flushRealMacrotask();

        // Cycle A's stale failure must change nothing: no save-time compile ran for it, no
        // second publish happened (nothing overwrote cycle B's diagnostics), and cycle B's
        // stored verdict for version 2 is untouched.
        expect(compileSpy).not.toHaveBeenCalled();
        expect(sendSpy).toHaveBeenCalledTimes(1);
        expect(getVerdictState(uri)).toEqual(verdictAfterCycleB);
    });

    test('two overlapping cycles for the same document: an older cycle discovering the endpoint went unavailable still clears every document\'s verdict, but still never publishes over a newer cycle\'s result', async () => {
        const { shared, BBj, privates, interopService, textDocuments } = createHarness();

        const staleUri = URI.file('/proj/stale-unavailable.bbj');
        const staleUriString = staleUri.toString();
        const v1Text = 'x = 1\n';
        addWorkspaceDocument(shared, staleUri, v1Text);

        // A second, unrelated document with its own already-stored verdict -- proving the
        // connection-wide clear really is connection-wide, not scoped to the stale cycle's own
        // document.
        const otherUri = URI.file('/proj/unrelated-document.bbj');
        addWorkspaceDocument(shared, otherUri, 'y = 2\n');
        setVerdictState(otherUri, { seen: new Set<string>(), version: 1, diagnostics: [] });

        let releaseV1Unavailable: () => void = () => { /* replaced below */ };
        vi.spyOn(interopService, 'parseProgram').mockImplementation(params => {
            if (params.version === '1') {
                return new Promise((_resolve, reject) => {
                    releaseV1Unavailable = () => reject(Object.assign(
                        new Error('Unsupported request method: parseProgram'), { code: METHOD_NOT_FOUND }
                    ));
                });
            }
            return Promise.resolve({
                version: params.version,
                errors: [{
                    categories: ['SyntaxError'],
                    message: 'the newer cycle\'s own verdict',
                    editorStartLine: 1,
                    editorEndLine: 1,
                    startCharacter: 1,
                    endCharacter: 3,
                }],
            });
        });
        const compileSpy = vi.spyOn(BBj.compiler.BBjCPLService, 'compile');
        const sendSpy = vi.spyOn(privates, 'sendDiagnosticsToClient');

        vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });

        openOrChange(textDocuments, staleUriString, 1, v1Text);
        await vi.advanceTimersByTimeAsync(500);

        const v2Text = 'x = 1\ny = 2\n';
        openOrChange(textDocuments, staleUriString, 2, v2Text);
        await vi.advanceTimersByTimeAsync(500);

        expect(sendSpy).toHaveBeenCalledTimes(1);
        expect(getVerdictState(staleUri)?.version).toBe(2);
        expect(getVerdictState(otherUri)).toBeDefined();

        // The endpoint just latched off, discovered by the stale version-1 request. Even though
        // that request is stale for its own document, the on/off latch flip it reports is a
        // connection-wide fact, not a per-cycle one -- both documents' stored verdicts must be
        // forgotten, but cycle B's diagnostics, already sent to the client, must not be
        // recomputed or overwritten.
        releaseV1Unavailable();
        await flushRealMacrotask();
        await flushRealMacrotask();
        await flushRealMacrotask();

        expect(getVerdictState(staleUri)).toBeUndefined();
        expect(getVerdictState(otherUri)).toBeUndefined();
        expect(compileSpy).not.toHaveBeenCalled();
        expect(sendSpy).toHaveBeenCalledTimes(1);
    });
});
