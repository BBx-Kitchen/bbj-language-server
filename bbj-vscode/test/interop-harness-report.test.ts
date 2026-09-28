/******************************************************************************
 * Copyright 2023 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

/**
 * Tests for the interop test harness's HTML report (bbj-vscode/tools/interop-test-harness).
 * "CLI against a fake peer" runs the real CLI (run-tests.ts) as a child process through the
 * pinned local tsx, against the in-process fake JSON-RPC server, and proves the console output,
 * the exit code and the report file all agree. None of this opens a socket to the live peer on
 * :5008, and it passes with RUN_BBJ_TESTS unset.
 */
import { spawn } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, afterEach, describe, expect, it } from 'vitest';
import { startFakePeer, type FakePeer } from './interop-harness-fake-peer.js';

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
