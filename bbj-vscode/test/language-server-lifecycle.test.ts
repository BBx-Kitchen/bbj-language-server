import { ChildProcess, spawn } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, test } from 'vitest';

/**
 * Language server lifecycle coverage for #232 (see #492).
 *
 * In #232 the server kept running at 100% CPU after the editor exited, leaving one
 * orphaned process per session. `vscode-languageserver` already guards against
 * that: given `--clientProcessId`, it polls `process.kill(pid, 0)` every 3s and
 * calls `process.exit(1)` once the client is gone. What broke was not the guard
 * but the event loop — a synchronous validation loop starved the timer.
 *
 * This test covers the *symptom* rather than that one cause: whatever makes the
 * server unable to notice a dead client, it fails here. It is the check that would
 * have caught the original report, which never came with a source file.
 */

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const SERVER = path.resolve(TEST_DIR, '../out/language/main.cjs');

/** The watchdog polls every 3s; allow several cycles plus process teardown. */
const EXIT_BUDGET_MS = 20_000;

const serverBuilt = fs.existsSync(SERVER);

function waitForExit(child: ChildProcess, budgetMs: number): Promise<number | 'timeout'> {
    return new Promise(resolve => {
        const timer = setTimeout(() => resolve('timeout'), budgetMs);
        child.once('exit', code => {
            clearTimeout(timer);
            resolve(code ?? 0);
        });
    });
}

function isAlive(pid: number | undefined): boolean {
    if (pid === undefined) {
        return false;
    }
    try {
        process.kill(pid, 0);
        return true;
    } catch {
        return false;
    }
}

describe.skipIf(!serverBuilt)('language server lifecycle (#232)', () => {
    let client: ChildProcess | undefined;
    let server: ChildProcess | undefined;

    afterEach(() => {
        // Never let this test be the thing that leaks a language server.
        for (const child of [server, client]) {
            if (child && child.exitCode === null && child.pid !== undefined) {
                try {
                    child.kill('SIGKILL');
                } catch {
                    // already gone
                }
            }
        }
        server = undefined;
        client = undefined;
    });

    test('server exits after its client process dies', async () => {
        // Stand-in for the extension host: alive until we kill it, nothing else.
        client = spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], { stdio: 'ignore' });
        await new Promise(resolve => setTimeout(resolve, 250));
        expect(isAlive(client.pid), 'stand-in client failed to start').toBe(true);

        // Same invocation the extension uses, per the orphaned command lines in #232.
        server = spawn(process.execPath, [SERVER, '--node-ipc', `--clientProcessId=${client.pid}`], {
            stdio: ['pipe', 'pipe', 'pipe', 'ipc']
        });
        const stderr: string[] = [];
        server.stderr?.on('data', chunk => stderr.push(String(chunk)));

        // Let it reach its message loop before pulling the client out from under it.
        await new Promise(resolve => setTimeout(resolve, 2_000));
        expect(server.exitCode, `server exited early: ${stderr.join('')}`).toBeNull();

        client.kill('SIGKILL');
        const exit = await waitForExit(server, EXIT_BUDGET_MS);

        expect(
            exit,
            `server did not exit within ${EXIT_BUDGET_MS}ms of its client dying — this is the #232 orphan. ` +
            `stderr: ${stderr.join('') || '(empty)'}`
        ).not.toBe('timeout');
        // vscode-languageserver exits 1 when the client vanishes without a shutdown request.
        expect(exit).toBe(1);
    }, EXIT_BUDGET_MS + 30_000);

    test('server stays up while its client is alive', async () => {
        // Negative control: the exit above must be caused by the client dying, not by
        // the server falling over on its own a few seconds in.
        client = spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], { stdio: 'ignore' });
        await new Promise(resolve => setTimeout(resolve, 250));

        server = spawn(process.execPath, [SERVER, '--node-ipc', `--clientProcessId=${client.pid}`], {
            stdio: ['pipe', 'pipe', 'pipe', 'ipc']
        });
        const stderr: string[] = [];
        server.stderr?.on('data', chunk => stderr.push(String(chunk)));

        // Two watchdog cycles: long enough for a false positive to show up.
        await new Promise(resolve => setTimeout(resolve, 8_000));

        expect(server.exitCode, `server exited while its client was alive: ${stderr.join('')}`).toBeNull();
    }, 40_000);
});

test.skipIf(serverBuilt)('language server lifecycle tests need `npm run build` first', () => {
    // Visible skip rather than silent absence: out/language/main.cjs is a build artifact,
    // so a plain `npm test` on a clean checkout would otherwise appear to cover this.
    expect(serverBuilt).toBe(false);
});
