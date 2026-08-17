import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';
import { beforeAll, describe, expect, test } from 'vitest';
import { walkInputs } from './support/line-break-walk-inputs.js';

/**
 * Out-of-process termination guard for the line-break backward walks (#232, #492).
 *
 * The regression this covers is an infinite *synchronous* loop. A blocked event loop
 * cannot run timers, so vitest's own per-test timeout never fires and a regression
 * would hang CI instead of failing it. (That is the same mechanism that let the
 * language server outlive the editor: the `--clientProcessId` watchdog in
 * vscode-languageserver is a `setInterval`.)
 *
 * So the validation runs in a child process that the OS can kill, and this test
 * asserts the child finished on its own. A regression fails here in
 * CHILD_BUDGET_MS with a readable message instead of stalling the job.
 */

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const OUT_FILE = path.resolve(TEST_DIR, '.tmp/line-break-walk-child.mjs');

/** Generous: the child takes ~2s locally. Only a hang should ever reach this. */
const CHILD_BUDGET_MS = 60_000;

describe('backward walks cannot hang the process (#232)', () => {
    beforeAll(async () => {
        // Bundled rather than run through a TS loader so the child is a plain node
        // process with no test-runner machinery that could absorb the hang.
        await esbuild.build({
            entryPoints: [path.resolve(TEST_DIR, 'support/line-break-walk-child.ts')],
            outfile: OUT_FILE,
            bundle: true,
            platform: 'node',
            // ESM because langium exposes `langium/test` under the `import` condition only.
            format: 'esm',
            target: 'node22',
            packages: 'external',
            logLevel: 'silent'
        });
        expect(fs.existsSync(OUT_FILE)).toBe(true);
    }, 120_000);

    test(`validates all ${walkInputs.length} walk inputs in a child process that exits on its own`, () => {
        const result = spawnSync(process.execPath, [OUT_FILE], {
            cwd: path.resolve(TEST_DIR, '..'),
            timeout: CHILD_BUDGET_MS,
            killSignal: 'SIGKILL',
            encoding: 'utf8'
        });

        if (result.signal) {
            const started = [...result.stdout.matchAll(/^start (.+)$/gm)].map(m => m[1]);
            const finished = new Set([...result.stdout.matchAll(/^done (.+)$/gm)].map(m => m[1]));
            const stuck = started.filter(label => !finished.has(label));
            throw new Error(
                `Child process was killed with ${result.signal} after ${CHILD_BUDGET_MS}ms without exiting. ` +
                `A backward walk in line-break-validation.ts is not advancing (see #232). ` +
                `Input(s) still in flight: ${stuck.length > 0 ? stuck.join(', ') : '(none reported)'}`
            );
        }

        expect(result.stderr).toBe('');
        expect(result.status).toBe(0);
        expect(result.stdout).toContain('all inputs terminated');
        // Every input reached its `done` line, so no walk silently swallowed one.
        expect([...result.stdout.matchAll(/^done /gm)]).toHaveLength(walkInputs.length);
    }, CHILD_BUDGET_MS + 30_000);
});
