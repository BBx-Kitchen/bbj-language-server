import { EmptyFileSystem } from 'langium';
import { NodeFileSystem } from 'langium/node';
import { validationHelper } from 'langium/test';
import * as os from 'node:os';
import * as path from 'node:path';
import { DiagnosticSeverity } from 'vscode-languageserver';
import { beforeAll, describe, expect, test } from 'vitest';
import { applyDiagnosticHierarchy } from '../../src/language/bbj-document-validator.js';
import {
    documentLineText,
    isSyntaxComplaint,
    lineSpansOverlap,
    recallLangiumDiagnostics,
    reconcileWithVerdict
} from '../../src/language/bbj-diagnostic-reconciliation.js';
import type { Program } from '../../src/language/generated/ast.js';
import { createBBjServices } from '../../src/language/bbj-module.js';
import { parseErrorsToDiagnostics, parseErrorToRange } from '../../src/language/bbj-parser-service.js';
import { END_OF_LINE_CHARACTER } from '../../src/language/lsp-position.js';
import { createBBjTestServices } from '../bbj-test-module.js';
import { initializeWorkspace, shouldRunBBjTests } from '../test-helper.js';

/**
 * A single RUN_BBJ_TESTS-gated confirmation that the coordinate convention the hermetic fixture
 * suite (`test/parser-coordinate-converter.test.ts`) encodes still matches the real, deployed
 * bbj-ls endpoint. This is not a second converter test suite: every fixture text below is copied
 * verbatim from that suite so the two stay in lockstep, and every assertion goes through the
 * exported converter rather than re-implementing any coordinate arithmetic.
 *
 * Calls `JavaInteropService.parseProgram()` directly -- never a full document build -- because a
 * build on this path reaches the compiler and interop services and is flaky locally and red on
 * CI (same reasoning as the other real-interop suite in this folder).
 *
 * With the gate closed this file contributes skipped tests only: no connection is ever attempted.
 */
function lineCountOf(text: string): number {
    return text.split('\n').length;
}

const tempDir = os.tmpdir();

describe('parseProgram - the live endpoint confirms the coordinate convention (real interop)', async () => {
    const run = await shouldRunBBjTests();

    const services = createBBjServices(NodeFileSystem);

    beforeAll(async () => {
        if (!run) return;
        services.BBj.java.JavaInteropService.setConnectionConfig('127.0.0.1', 5008);
        await initializeWorkspace(services.shared);
    }, 120000);

    test.runIf(run)("a colon-continued statement anchors to the joined statement's first physical line", async () => {
        const text = 'rem comment line 1\nprint "a",\n:"b\nrem line 4\n';
        const result = await services.BBj.java.JavaInteropService.parseProgram({
            text,
            canonicalName: path.join(tempDir, 'parse-program-live-colon.bbj'),
            version: 'live-colon-v1',
            prefixes: [],
            workspaceRoots: []
        });

        expect(result.version).toBe('live-colon-v1');
        expect(result.errors.length).toBeGreaterThan(0);
        const lineCount = lineCountOf(text);
        for (const error of result.errors) {
            const range = parseErrorToRange(error, lineCount);
            expect(range.start.line).toBe(1);
            expect(range.end.character).toBe(END_OF_LINE_CHARACTER);
        }
    }, 60000);

    test.runIf(run)("a program carrying the user's own line numbers reports the physical editor line, not the user's number", async () => {
        const text = '10 rem first\n20 print "unterminated\n30 rem third\n';
        const result = await services.BBj.java.JavaInteropService.parseProgram({
            text,
            canonicalName: path.join(tempDir, 'parse-program-live-linenum.bbj'),
            version: 'live-linenum-v1',
            prefixes: [],
            workspaceRoots: []
        });

        expect(result.version).toBe('live-linenum-v1');
        expect(result.errors.length).toBeGreaterThan(0);
        const lineCount = lineCountOf(text);
        for (const error of result.errors) {
            const range = parseErrorToRange(error, lineCount);
            expect(range.start.line).toBe(1);
            expect(range.end.character).toBe(END_OF_LINE_CHARACTER);
        }
    }, 60000);

    test.runIf(run)('a CRLF document converts to the same editor range as the LF equivalent', async () => {
        const text = 'rem comment line 1\r\nprint "a",\r\n:"b\r\nrem line 4\r\n';
        const result = await services.BBj.java.JavaInteropService.parseProgram({
            text,
            canonicalName: path.join(tempDir, 'parse-program-live-crlf.bbj'),
            version: 'live-crlf-v1',
            prefixes: [],
            workspaceRoots: []
        });

        expect(result.version).toBe('live-crlf-v1');
        expect(result.errors.length).toBeGreaterThan(0);
        const lineCount = lineCountOf(text);
        for (const error of result.errors) {
            const range = parseErrorToRange(error, lineCount);
            expect(range.start.line).toBe(1);
            expect(range.end.character).toBe(END_OF_LINE_CHARACTER);
        }
    }, 60000);

    test.runIf(run)('a final line with no trailing newline lands the error on that line, not past the document', async () => {
        const text = 'rem comment line 1\nprint "unterminated';
        const result = await services.BBj.java.JavaInteropService.parseProgram({
            text,
            canonicalName: path.join(tempDir, 'parse-program-live-notrailingnl.bbj'),
            version: 'live-notrailingnl-v1',
            prefixes: [],
            workspaceRoots: []
        });

        expect(result.version).toBe('live-notrailingnl-v1');
        expect(result.errors.length).toBeGreaterThan(0);
        const lineCount = lineCountOf(text);
        for (const error of result.errors) {
            const range = parseErrorToRange(error, lineCount);
            expect(range.start.line).toBe(1);
            expect(range.end.line).toBeLessThan(lineCount);
            expect(range.end.character).toBe(END_OF_LINE_CHARACTER);
        }
    }, 60000);

    test.runIf(run)('a clean, invented two-line program reports no errors -- the negative control', async () => {
        const text = 'rem clean program\nprint "ok"\n';
        const result = await services.BBj.java.JavaInteropService.parseProgram({
            text,
            canonicalName: path.join(tempDir, 'parse-program-live-clean.bbj'),
            version: 'live-clean-v1',
            prefixes: [],
            workspaceRoots: []
        });

        expect(result.version).toBe('live-clean-v1');
        expect(result.errors).toEqual([]);
    }, 60000);
});

/**
 * Confirms the shipped reconciliation code (`reconcileWithVerdict` / `applyDiagnosticHierarchy`)
 * against the real, deployed BBj parser -- not a re-implementation, not a scripted double. BBj's
 * side is the same direct `parseProgram()` call as the suite above, for the same reason (a full
 * document build reaches the compiler/interop services and is flaky locally and red on CI).
 * Langium's side is deliberately hermetic: a separate `createBBjTestServices(EmptyFileSystem)`
 * instance (its interop double never connects) drives real validation so the reconciliation input
 * is genuine validator output, not a hand-built diagnostic.
 *
 * With the gate closed this describe block contributes skipped tests only: no connection is ever
 * attempted, matching the suite above.
 */
describe('reconciliation against the live endpoint (real interop)', async () => {
    const run = await shouldRunBBjTests();

    const bbjServices = createBBjServices(NodeFileSystem);
    const langiumServices = createBBjTestServices(EmptyFileSystem);
    let validate: ReturnType<typeof validationHelper<Program>>;

    beforeAll(async () => {
        if (!run) return;
        bbjServices.BBj.java.JavaInteropService.setConnectionConfig('127.0.0.1', 5008);
        await initializeWorkspace(langiumServices.shared);
        validate = validationHelper<Program>(langiumServices.BBj);
    }, 120000);

    test.runIf(run)("a line both parsers reject keeps BBj's diagnostic alone", async () => {
        const text = 'rem clean line\nx = (1 + 2\n';

        const result = await bbjServices.BBj.java.JavaInteropService.parseProgram({
            text,
            canonicalName: path.join(tempDir, 'parse-program-live-reconcile-reject.bbj'),
            version: 'reconcile-reject-v1',
            prefixes: [],
            workspaceRoots: []
        });
        expect(result.errors.length).toBeGreaterThan(0); // precondition: BBj rejects this text

        const langiumResult = await validate(text);
        const raw = recallLangiumDiagnostics(langiumResult.document);
        expect(raw).toBeDefined();
        const lineCount = lineCountOf(text);
        const bbjDiagnostics = parseErrorsToDiagnostics(result.errors, lineCount, 20);
        // precondition: Langium's own raw list has a syntax complaint whose span overlaps a BBj
        // diagnostic's span -- otherwise this fixture proves nothing about replacement.
        const hasOverlappingComplaint = raw!.some(
            d => isSyntaxComplaint(d) && bbjDiagnostics.some(bbj => lineSpansOverlap(d.range, bbj.range))
        );
        expect(hasOverlappingComplaint).toBe(true);

        const lineText = documentLineText(langiumResult.document.textDocument);
        const { diagnostics: reconciled } = reconcileWithVerdict(raw!, bbjDiagnostics, lineText);
        const hierarchyApplied = applyDiagnosticHierarchy(reconciled, true, 20);

        for (const bbjDiagnostic of bbjDiagnostics) {
            const matches = hierarchyApplied.filter(d => d.message === bbjDiagnostic.message && d.source === bbjDiagnostic.source);
            expect(matches).toHaveLength(1);
        }
        const survivingSyntaxComplaints = hierarchyApplied.filter(isSyntaxComplaint);
        for (const complaint of survivingSyntaxComplaints) {
            expect(bbjDiagnostics.some(bbj => lineSpansOverlap(complaint.range, bbj.range))).toBe(false);
        }
        langiumResult.dispose();
    }, 60000);

    test.runIf(run)('a document the BBj parser accepts carries no language-server syntax error', async () => {
        // The pending A2 todo's invented nested single-line IF/ELSE/FI repro: Langium flags it
        // ("needs to start in a new line: else"), the compiler accepts it. Confirmed verbatim
        // for plan 05's hand check in both IDEs.
        const text = 'if a then if b then c=1 else d=1 fi else e=1 fi';

        const result = await bbjServices.BBj.java.JavaInteropService.parseProgram({
            text,
            canonicalName: path.join(tempDir, 'parse-program-live-reconcile-accept.bbj'),
            version: 'reconcile-accept-v1',
            prefixes: [],
            workspaceRoots: []
        });
        expect(result.errors).toEqual([]); // precondition: BBj accepts this text

        const langiumResult = await validate(text);
        const raw = recallLangiumDiagnostics(langiumResult.document);
        expect(raw).toBeDefined();
        // precondition: Langium's own raw list holds at least one line-break-coded or
        // parsing-error diagnostic to downgrade -- otherwise this fixture proves nothing.
        const complaints = raw!.filter(isSyntaxComplaint);
        expect(complaints.length).toBeGreaterThan(0);

        const lineText = documentLineText(langiumResult.document.textDocument);
        const { diagnostics: reconciled } = reconcileWithVerdict(raw!, [], lineText);
        const hierarchyApplied = applyDiagnosticHierarchy(reconciled, true, 20);

        const survivingSyntaxErrors = hierarchyApplied.filter(
            d => d.severity === DiagnosticSeverity.Error && isSyntaxComplaint(d)
        );
        expect(survivingSyntaxErrors).toHaveLength(0);

        for (const complaint of complaints) {
            const downgraded = hierarchyApplied.find(d => d.message === complaint.message && d.source === 'bbj');
            expect(downgraded).toBeDefined();
            expect(downgraded!.severity).toBe(DiagnosticSeverity.Warning);
        }
        langiumResult.dispose();
    }, 60000);
});
