/******************************************************************************
 * Copyright 2023 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

/**
 * Tests for the interop test harness's HTML report (bbj-vscode/tools/interop-test-harness). Three
 * groups:
 *
 * - "CLI against a fake peer" runs the real CLI (run-tests.ts) as a child process through the
 *   pinned local tsx, against the in-process fake JSON-RPC server, and proves the console output,
 *   the exit code and the report file all agree.
 * - "syntaxHighlightJson" is pure tests over the JSON highlighter.
 * - "report colouring and escaping (#596)" runs the real suite against the fake peer and checks
 *   the assembled report text.
 *
 * None of this opens a socket to the live peer on :5008, and everything here passes with
 * RUN_BBJ_TESTS unset.
 */
import { spawn } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, afterEach, describe, expect, it } from 'vitest';
import { type MessageConnection } from 'vscode-jsonrpc/node.js';
import { runSuite } from '../tools/interop-test-harness/cases.js';
import { evaluateGate } from '../tools/interop-test-harness/gate.js';
import { generateReport, syntaxHighlightJson, toJsonText } from '../tools/interop-test-harness/report.js';
import { connect } from '../tools/interop-test-harness/scaffold.js';
import { healthyFixtures, startFakePeer, type FakePeer } from './interop-harness-fake-peer.js';

/** The bbj-vscode project root, resolved from this file's own location so the CLI spawns with a
 *  correct cwd regardless of the test runner's own working directory. */
const BBJ_VSCODE_DIR = fileURLToPath(new URL('..', import.meta.url));

interface CliRun {
    code: number | null;
    stdout: string;
}

/** Spawns the real harness CLI through the pinned local tsx, asynchronously — a synchronous
 *  spawn would deadlock against the in-process fake peer, which runs on this same event loop. */
function runCli(args: string[]): Promise<CliRun> {
    return new Promise((resolveRun, rejectRun) => {
        const child = spawn(
            process.execPath,
            ['--import', 'tsx', 'tools/interop-test-harness/run-tests.ts', ...args],
            { cwd: BBJ_VSCODE_DIR },
        );
        let stdout = '';
        child.stdout.on('data', (chunk: Buffer) => { stdout += chunk.toString(); });
        child.on('error', rejectRun);
        child.on('close', (code) => resolveRun({ code, stdout }));
    });
}

function caseLine(stdout: string, caseNumber: number): string | undefined {
    return stdout.split('\n').find(line => line.includes(`[${caseNumber}/17]`));
}

describe('CLI against a fake peer', () => {
    let peer: FakePeer | undefined;
    const tmpDir = mkdtempSync(join(tmpdir(), 'interop-harness-report-'));

    afterAll(() => {
        rmSync(tmpDir, { recursive: true, force: true });
    });

    afterEach(async () => {
        await peer?.close();
        peer = undefined;
    });

    it('exits 0, prints 17 passing case lines and writes a report with 17 PASS badges against a healthy peer', async () => {
        peer = await startFakePeer();
        const outputPath = join(tmpDir, 'healthy-report.html');

        const { code, stdout } = await runCli([
            '--host', '127.0.0.1', '--port', String(peer.port), '--output', outputPath, '--timeout', '5000',
        ]);

        expect(code).toBe(0);
        for (let n = 1; n <= 17; n++) {
            expect(caseLine(stdout, n), `case ${n} line`).toContain('✓');
        }
        expect(stdout).toContain('Results: 17 passed, 0 failed, 0 errors');

        const report = readFileSync(outputPath, 'utf-8');
        expect(report.match(/PASS</g) ?? []).toHaveLength(17);
        expect(report).not.toContain('FAIL<');
        expect(report).not.toContain('ERROR<');
        expect(report).toContain('<div class="summary-stat pass">17</div>');
    }, 30_000);

    it('exits 1, prints ✗ for cases 12/13/14/16/17 and writes a report with 5 FAIL badges against the #514 stub', async () => {
        peer = await startFakePeer({
            getClassInfos: () => ({ notAnArray: true }),
            loadClasspath: () => 'ok',
        });
        const outputPath = join(tmpDir, 'stub-report.html');

        const { code, stdout } = await runCli([
            '--host', '127.0.0.1', '--port', String(peer.port), '--output', outputPath, '--timeout', '5000',
        ]);

        expect(code).toBe(1);
        const expectedFailing = new Set([12, 13, 14, 16, 17]);
        for (let n = 1; n <= 17; n++) {
            const line = caseLine(stdout, n);
            expect(line, `case ${n} line`).toBeDefined();
            expect(line, `case ${n}`).toContain(expectedFailing.has(n) ? '✗' : '✓');
        }
        expect(stdout).toContain('Results: 12 passed, 5 failed, 0 errors');

        const report = readFileSync(outputPath, 'utf-8');
        expect(report.match(/FAIL</g) ?? []).toHaveLength(5);
        expect(report).toContain('<div class="summary-stat pass">12</div>');
        expect(report).toContain('<div class="summary-stat fail">5</div>');
        expect(report).toContain('<div class="summary-stat error">0</div>');
    }, 30_000);
});

describe('syntaxHighlightJson', () => {
    it('gives a key its own json-key span', () => {
        const json = JSON.stringify({ a: 1 }, null, 2);
        expect(syntaxHighlightJson(json)).toContain('<span class="json-key">&quot;a&quot;</span>');
    });

    it('keeps an escaped-quote string value in one json-string span', () => {
        const json = JSON.stringify({ msg: 'He said "hi"' }, null, 2);
        expect(syntaxHighlightJson(json)).toContain(
            '<span class="json-string">&quot;He said \\&quot;hi\\&quot;&quot;</span>');
    });

    it('escapes markup and ampersands inside a string value and never lets it through raw', () => {
        const json = JSON.stringify({ v: '<b>&' }, null, 2);
        const highlighted = syntaxHighlightJson(json);
        expect(highlighted).toContain('&lt;b&gt;&amp;');
        expect(highlighted).not.toContain('<b>&');
    });

    it('keeps non-ASCII characters unchanged inside one json-string span', () => {
        const json = JSON.stringify({ v: 'é—✓' }, null, 2);
        expect(syntaxHighlightJson(json)).toContain('<span class="json-string">&quot;é—✓&quot;</span>');
    });

    it('treats a key containing a colon as one json-key span, with its value a separate json-string span', () => {
        const json = JSON.stringify({ 'a:b': 'c' }, null, 2);
        const highlighted = syntaxHighlightJson(json);
        expect(highlighted).toContain('<span class="json-key">&quot;a:b&quot;</span>');
        expect(highlighted).toContain('<span class="json-string">&quot;c&quot;</span>');
    });

    it('gives array string elements their own json-string spans', () => {
        const json = JSON.stringify(['x', 'y'], null, 2);
        const highlighted = syntaxHighlightJson(json);
        expect(highlighted.match(/<span class="json-string">&quot;[xy]&quot;<\/span>/g)).toHaveLength(2);
    });

    it('gives numbers, true, false and null their own spans', () => {
        const json = JSON.stringify({ n: 42, t: true, f: false, u: null }, null, 2);
        const highlighted = syntaxHighlightJson(json);
        expect(highlighted).toContain('<span class="json-number">42</span>');
        expect(highlighted).toContain('<span class="json-bool">true</span>');
        expect(highlighted).toContain('<span class="json-bool">false</span>');
        expect(highlighted).toContain('<span class="json-null">null</span>');
    });

    it('gives the JSON text of a top-level null a json-null span', () => {
        expect(syntaxHighlightJson(JSON.stringify(null))).toBe('<span class="json-null">null</span>');
    });

    it('renders empty objects and arrays without throwing and without any spans', () => {
        expect(syntaxHighlightJson(JSON.stringify({}, null, 2))).not.toContain('<span');
        expect(syntaxHighlightJson(JSON.stringify([], null, 2))).not.toContain('<span');
    });

    it("the report's value-to-JSON-text helper turns undefined into the text 'null'", () => {
        expect(toJsonText(undefined)).toBe('null');
    });
});

describe('report colouring and escaping (#596)', () => {
    let peer: FakePeer | undefined;
    let conn: MessageConnection | undefined;

    afterEach(async () => {
        conn?.dispose();
        await peer?.close();
        peer = undefined;
        conn = undefined;
    });

    it('colours the escaped key and string value of the nonexistent-class error, and shows the Critical column', async () => {
        peer = await startFakePeer();
        conn = await connect('127.0.0.1', peer.port, 2000);
        const { results, matrixRows } = await runSuite(conn);
        const verdict = evaluateGate(results);

        const report = generateReport(results, matrixRows, verdict, '127.0.0.1', peer.port, new Date('2026-01-01T00:00:00Z'));

        expect(report).toContain('<span class="json-key">&quot;error&quot;</span>');
        expect(report).toContain(
            '<span class="json-string">&quot;Class \\&quot;com.nonexistent.Fake\\&quot; not found&quot;</span>');
        expect(report).toContain(`<div class="summary-stat pass">${verdict.passCount}</div>`);
        expect(report).toContain(`<div class="summary-stat fail">${verdict.failCount}</div>`);
        expect(report).toContain(`<div class="summary-stat error">${verdict.errorCount}</div>`);
        expect(report).toContain('<th>Critical</th>');
    });

    it('escapes markup in a peer class name so it never reaches the report raw', async () => {
        const stringClass = healthyFixtures.classes['java.lang.String'];
        peer = await startFakePeer({
            getClassInfo: (params) => params.className === 'java.lang.String'
                ? { ...stringClass, name: '<img src=x>' }
                : (healthyFixtures.classes[params.className] ?? { error: `Class "${params.className}" not found` }),
        });
        conn = await connect('127.0.0.1', peer.port, 2000);
        const { results, matrixRows } = await runSuite(conn);
        const verdict = evaluateGate(results);

        const report = generateReport(results, matrixRows, verdict, '127.0.0.1', peer.port, new Date('2026-01-01T00:00:00Z'));

        expect(report).toContain('&lt;img src=x&gt;');
        expect(report).not.toContain('<img src=x>');
    });
});
