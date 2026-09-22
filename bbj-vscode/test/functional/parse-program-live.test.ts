import { NodeFileSystem } from 'langium/node';
import * as os from 'node:os';
import * as path from 'node:path';
import { beforeAll, describe, expect, test } from 'vitest';
import { createBBjServices } from '../../src/language/bbj-module.js';
import { parseErrorToRange } from '../../src/language/bbj-parser-service.js';
import { END_OF_LINE_CHARACTER } from '../../src/language/lsp-position.js';
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
