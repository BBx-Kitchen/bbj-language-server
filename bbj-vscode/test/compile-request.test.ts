import path from 'path';
import fs from 'fs';
import os from 'os';
import { describe, test, expect } from 'vitest';
import { EmptyFileSystem } from 'langium';
import { createBBjServices } from '../src/language/bbj-module.js';
import { BBjWorkspaceManager } from '../src/language/bbj-ws-manager.js';
import { BBjCPLService } from '../src/language/bbj-cpl-service.js';
import { createCompileHandler, type CompileRequestDeps } from '../src/language/compile-command.js';

/**
 * End-to-end coverage for the `bbj/compile` request handler (#571, PARITY-01): a real,
 * options-aware bbjcpl compile that both IDEs reach through the shared language server.
 * Every test that spawns a fixture bbjcpl is skipped on win32 — the fixtures are POSIX
 * shell scripts; a Windows substitute would need a .bat/.exe equivalent.
 */

const FIXTURE_OK_HOME = path.join(__dirname, 'test-data', 'cpl-fixture-compile-ok-bbjhome');

/** A BBjCPLService instance backed by the given fixture bbjHome (or '' for "unconfigured"). */
function createCplService(bbjHome: string): BBjCPLService {
    const services = {
        shared: {
            workspace: {
                WorkspaceManager: { getBBjDir: () => bbjHome }
            }
        }
    };
    return new BBjCPLService(services as any);
}

/** A minimal wsManager stub exposing only what CompileRequestDeps needs. */
function withCompilerConfig(compilerConfig: unknown): CompileRequestDeps['wsManager'] {
    return { getCompilerConfig: () => compilerConfig };
}

function makeTmpDir(): string {
    return fs.mkdtempSync(path.join(os.tmpdir(), 'bbj-compile-out-'));
}

describe('bbj/compile request handler', () => {

    test('aCompileWithAnOutputDirectorySucceedsAndReturnsNoDiagnostics', async () => {
        if (process.platform === 'win32') return;
        const tmpDir = makeTmpDir();
        const handler = createCompileHandler({
            cplService: createCplService(FIXTURE_OK_HOME),
            wsManager: withCompilerConfig({ output: { directory: tmpDir } }),
        });

        const result = await handler({ uri: 'file:///tmp/hello.bbj' });

        expect(result.success).toBe(true);
        expect(result.diagnostics).toEqual([]);
        expect(result.reason).toBeUndefined();
    }, 10000);

    test('theArgumentListCarriesTheOutputDirectoryFlagAndTheFileAndNoValidateOnlyFlag', async () => {
        if (process.platform === 'win32') return;
        const tmpDir = makeTmpDir();
        const argvLog = path.join(tmpDir, 'argv.log');
        process.env.BBJCPL_ARGV_LOG = argvLog;
        try {
            const handler = createCompileHandler({
                cplService: createCplService(FIXTURE_OK_HOME),
                wsManager: withCompilerConfig({ output: { directory: tmpDir } }),
            });
            const filePath = '/tmp/hello.bbj';

            await handler({ uri: `file://${filePath}` });

            const loggedArgs = fs.readFileSync(argvLog, 'utf-8').split('\n').filter(Boolean);
            expect(loggedArgs).toEqual([`-d${tmpDir}`, filePath]);
            expect(loggedArgs).not.toContain('-N');
        } finally {
            delete process.env.BBJCPL_ARGV_LOG;
        }
    }, 10000);

    test('theCompilerOutputDirectoryArrivesFromTheFlatInitializationOptionsKey', () => {
        const services = createBBjServices(EmptyFileSystem);
        const wsManager = services.shared.workspace.WorkspaceManager as BBjWorkspaceManager;

        // Mirrors what onInitialize's compilerOutputDirectory branch does when the flat
        // initializationOptions key `compilerOutputDirectory` is set (RESEARCH.md Pitfall 2).
        wsManager.setCompilerConfig({ output: { directory: '/tmp/out' } });
        expect((wsManager.getCompilerConfig().output as { directory: string }).directory).toBe('/tmp/out');

        // A settings object that carries no output directory (IntelliJ never sends one; VS
        // Code could push a bbj.compiler object without an output.directory value) must not
        // erase the seed — setCompilerConfig merges, it never replaces wholesale.
        wsManager.setCompilerConfig({ trigger: 'off' });
        expect((wsManager.getCompilerConfig().output as { directory: string }).directory).toBe('/tmp/out');
    });

});
