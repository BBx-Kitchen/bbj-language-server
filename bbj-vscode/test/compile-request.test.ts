import path from 'path';
import fs from 'fs';
import os from 'os';
import { describe, test, expect } from 'vitest';
import { EmptyFileSystem } from 'langium';
import { createBBjServices } from '../src/language/bbj-module.js';
import { BBjCPLService } from '../src/language/bbj-cpl-service.js';
import { BBjWorkspaceManager } from '../src/language/bbj-ws-manager.js';
import { createCompileHandler, type CompileRequestDeps } from '../src/language/compile-command.js';

/**
 * End-to-end coverage for the `bbj/compile` request handler (#571): a real,
 * options-aware bbjcpl compile that both IDEs reach through the shared language server.
 * Every test that spawns a fixture bbjcpl is skipped on win32 — the fixtures are POSIX
 * shell scripts; a Windows substitute would need a .bat/.exe equivalent.
 */

const FIXTURE_OK_HOME = path.join(__dirname, 'test-data', 'cpl-fixture-compile-ok-bbjhome');
const FIXTURE_FATAL_HOME = path.join(__dirname, 'test-data', 'cpl-fixture-compile-fatal-bbjhome');
const FIXTURE_PARSE_HOME = path.join(__dirname, 'test-data', 'cpl-fixture-bbjhome');

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
        // initializationOptions key `compilerOutputDirectory` is set.
        wsManager.setCompilerConfig({ output: { directory: '/tmp/out' } });
        expect((wsManager.getCompilerConfig().output as { directory: string }).directory).toBe('/tmp/out');

        // A settings object that carries no output directory (IntelliJ never sends one; VS
        // Code could push a bbj.compiler object without an output.directory value) must not
        // erase the seed — setCompilerConfig merges, it never replaces wholesale.
        wsManager.setCompilerConfig({ trigger: 'off' });
        expect((wsManager.getCompilerConfig().output as { directory: string }).directory).toBe('/tmp/out');
    });

    test('noOutputDirectoryAndNoValidateOnlyIsRefusedWithoutSpawningTheCompiler', async () => {
        if (process.platform === 'win32') return;
        const tmpDir = makeTmpDir();
        const argvLog = path.join(tmpDir, 'argv.log');
        process.env.BBJCPL_ARGV_LOG = argvLog;
        try {
            const handler = createCompileHandler({
                cplService: createCplService(FIXTURE_OK_HOME),
                wsManager: withCompilerConfig({}),
            });

            const result = await handler({ uri: 'file:///tmp/hello.bbj' });

            expect(result.success).toBe(false);
            expect(result.reason).toBe('output-directory-required');
            expect(result.diagnostics).toEqual([]);
            expect(fs.existsSync(argvLog)).toBe(false);
        } finally {
            delete process.env.BBJCPL_ARGV_LOG;
        }
    }, 10000);

    test('validateOnlyAloneSatisfiesTheOutputLocationRule', async () => {
        if (process.platform === 'win32') return;
        const tmpDir = makeTmpDir();
        const argvLog = path.join(tmpDir, 'argv.log');
        process.env.BBJCPL_ARGV_LOG = argvLog;
        try {
            const handler = createCompileHandler({
                cplService: createCplService(FIXTURE_OK_HOME),
                wsManager: withCompilerConfig({ output: { validateOnly: true } }),
            });

            const result = await handler({ uri: 'file:///tmp/hello.bbj' });

            expect(result.reason).toBeUndefined();
            const loggedArgs = fs.readFileSync(argvLog, 'utf-8').split('\n').filter(Boolean);
            expect(loggedArgs).toContain('-N');
        } finally {
            delete process.env.BBJCPL_ARGV_LOG;
        }
    }, 10000);

    test('stderrThatParsesIntoNothingIsAFailureCarryingTheRawText', async () => {
        if (process.platform === 'win32') return;
        const tmpDir = makeTmpDir();
        const handler = createCompileHandler({
            cplService: createCplService(FIXTURE_FATAL_HOME),
            wsManager: withCompilerConfig({ output: { directory: tmpDir } }),
        });

        const result = await handler({ uri: 'file:///tmp/hello.bbj' });

        expect(result.success).toBe(false);
        expect(result.reason).toBe('bbjcpl-error');
        expect(result.diagnostics).toEqual([]);
        expect(result.message).toContain('Invalid output directory');
        expect(result.message).toContain('Exiting');
    }, 10000);

    test('parsedCompilerErrorsComeBackAsDiagnosticsNotAsRawText', async () => {
        if (process.platform === 'win32') return;
        const tmpDir = makeTmpDir();
        const handler = createCompileHandler({
            cplService: createCplService(FIXTURE_PARSE_HOME),
            wsManager: withCompilerConfig({ output: { directory: tmpDir } }),
        });

        const result = await handler({ uri: 'file:///tmp/fake.bbj' });

        expect(result.success).toBe(false);
        expect(result.reason).toBe('compile-errors');
        expect(result.diagnostics).toHaveLength(1);
        expect(result.diagnostics[0].source).toBe('BBjCPL');
    }, 10000);

    test('anUnconfiguredBbjHomeIsRefusedWithItsOwnReason', async () => {
        const handler = createCompileHandler({
            cplService: createCplService(''),
            wsManager: withCompilerConfig({ output: { directory: '/tmp/out' } }),
        });

        const result = await handler({ uri: 'file:///tmp/hello.bbj' });

        expect(result.reason).toBe('bbj-home-not-configured');
    });

    test('aNonFileUriIsRefusedBeforeAnythingElse', async () => {
        if (process.platform === 'win32') return;
        const tmpDir = makeTmpDir();
        const argvLog = path.join(tmpDir, 'argv.log');
        process.env.BBJCPL_ARGV_LOG = argvLog;
        try {
            const handler = createCompileHandler({
                cplService: createCplService(FIXTURE_OK_HOME),
                wsManager: withCompilerConfig({ output: { directory: tmpDir } }),
            });

            const result = await handler({ uri: 'untitled:Untitled-1' });

            expect(result.reason).toBe('invalid-file-uri');
            expect(fs.existsSync(argvLog)).toBe(false);
        } finally {
            delete process.env.BBJCPL_ARGV_LOG;
        }
    }, 10000);

    test('conflictingOptionsAreRefusedWithTheValidatorsMessage', async () => {
        const handler = createCompileHandler({
            cplService: createCplService(FIXTURE_OK_HOME),
            wsManager: withCompilerConfig({
                output: { directory: '/tmp/out', extension: '.bbj', keepExtension: true }
            }),
        });

        const result = await handler({ uri: 'file:///tmp/hello.bbj' });

        expect(result.reason).toBe('invalid-options');
        expect(result.message).toBeTruthy();
    });

    test('anExplicitCompileIsNotCancelledByABackgroundValidateOnlyCompileOfTheSameFile', async () => {
        if (process.platform === 'win32') return;
        const tmpDir = makeTmpDir();
        process.env.BBJCPL_SLEEP = '0.3';
        try {
            const cplService = createCplService(FIXTURE_OK_HOME);
            const filePath = '/tmp/concurrency-test.bbj';

            // Explicit compile starts first (and, via BBJCPL_SLEEP, is still running when the
            // background validate-only compile for the same file starts below).
            const explicitPromise = cplService.compileWithOptions(filePath, [`-d${tmpDir}`]);
            const backgroundPromise = cplService.compile(filePath);

            const [explicitResult] = await Promise.all([explicitPromise, backgroundPromise]);

            expect(explicitResult.success).toBe(true);
            expect(cplService.isCompiling(filePath)).toBe(false);
        } finally {
            delete process.env.BBJCPL_SLEEP;
        }
    }, 10000);

    test('twoOverlappingExplicitCompilesOfTheSameFileBothSettle', async () => {
        if (process.platform === 'win32') return;
        const tmpDir = makeTmpDir();
        const cplService = createCplService(FIXTURE_OK_HOME);
        const filePath = '/tmp/overlap-test.bbj';

        const first = cplService.compileWithOptions(filePath, [`-d${tmpDir}`]);
        const second = cplService.compileWithOptions(filePath, [`-d${tmpDir}`]);

        const [r1, r2] = await Promise.all([first, second]);

        expect(r1.success).toBe(true);
        expect(r2.success).toBe(true);
    }, 10000);

});
