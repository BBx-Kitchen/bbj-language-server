import { describe, expect, test, vi, beforeEach } from 'vitest';
import path from 'path';

/**
 * GHSA-p5f3-9456-9pcx (CWE-78): proves the launcher hands its argument array to
 * `execFile` and never builds (or invokes) a shell command string. The mocked
 * `exec` export below stands in for the shell-string API this module must never
 * call. The metacharacter fixture is inert test data proving pass-through, not
 * an exploit.
 */
const METACHAR_FIXTURE = 'legit;`injected`';

const execFileMock = vi.fn();
const execMock = vi.fn();

vi.mock('child_process', () => ({
    execFile: (...args: unknown[]) => execFileMock(...args),
    exec: (...args: unknown[]) => execMock(...args)
}));

import { runProcess, runProcessCallback, formatArgvForLog } from '../src/Commands/process-runner.js';
import type { Argv } from '../src/Commands/process-args.js';

// Fixture homes for the execution-path gate cases below: cpl-fixture-bbjhome
// satisfies the full installation layout (bin/bbj, bin/bbjcpl, cfg/);
// cpl-fixture-partial-bbjhome satisfies only bin/bbjcpl.
const FULL_HOME = path.join(__dirname, 'test-data', 'cpl-fixture-bbjhome');
const FULL_HOME_BBJ = path.join(FULL_HOME, 'bin', 'bbj');
const PARTIAL_HOME_BBJCPL = path.join(__dirname, 'test-data', 'cpl-fixture-partial-bbjhome', 'bin', 'bbjcpl');

beforeEach(() => {
    execFileMock.mockReset();
    execMock.mockReset();
});

describe.skipIf(process.platform === 'win32')('runProcess', () => {
    test('calls execFile with the executable path, the argument array, and no shell-enabling option', async () => {
        const argv: Argv = { file: FULL_HOME_BBJ, args: ['-q', '-CPbbj_default', '-WD/w', '/w/a.bbj'] };
        execFileMock.mockImplementation((file, args, options, cb) => {
            cb(null, 'out', '');
        });

        await runProcess(argv);

        expect(execFileMock).toHaveBeenCalledTimes(1);
        const [calledFile, calledArgs, calledOptions] = execFileMock.mock.calls[0];
        expect(calledFile).toBe(argv.file);
        expect(calledArgs).toEqual(argv.args);
        expect(calledOptions).not.toHaveProperty('shell', true);
    });

    test('the module never invokes the shell-string exec API', async () => {
        const argv: Argv = { file: FULL_HOME_BBJ, args: ['-q'] };
        execFileMock.mockImplementation((file, args, options, cb) => cb(null, '', ''));
        await runProcess(argv);
        expect(execMock).not.toHaveBeenCalled();
    });

    test('resolves {stdout, stderr} on success', async () => {
        const argv: Argv = { file: FULL_HOME_BBJ, args: ['-q'] };
        execFileMock.mockImplementation((file, args, options, cb) => cb(null, 'hello', ''));
        const result = await runProcess(argv);
        expect(result).toEqual({ stdout: 'hello', stderr: '' });
    });

    test('rejects with the error, carrying stderr attached, on failure', async () => {
        const argv: Argv = { file: FULL_HOME_BBJ, args: ['-q'] };
        const err = new Error('Command failed');
        execFileMock.mockImplementation((file, args, options, cb) => cb(err, '', 'boom on stderr'));
        await expect(runProcess(argv)).rejects.toMatchObject({ message: 'Command failed', stderr: 'boom on stderr' });
    });

    test('seam: a metacharacter-bearing classpath from buildRunArgv reaches execFile as one verbatim element', async () => {
        const { buildRunArgv } = await import('../src/Commands/process-args.js');
        const argv = buildRunArgv({
            home: FULL_HOME,
            platform: 'linux',
            classpathEntry: METACHAR_FIXTURE,
            configPath: null,
            workingDir: '/w',
            fileName: '/w/a.bbj'
        });
        execFileMock.mockImplementation((file, args, options, cb) => cb(null, '', ''));
        await runProcess(argv);
        const [, calledArgs] = execFileMock.mock.calls[0];
        expect((calledArgs as string[])).toContain(`-CP${METACHAR_FIXTURE}`);
    });

    test('rejects and never calls execFile when the file fails the installation-layout check', async () => {
        const argv: Argv = { file: PARTIAL_HOME_BBJCPL, args: ['-N', '/w/a.bbj'] };
        await expect(runProcess(argv)).rejects.toBeTruthy();
        expect(execFileMock).not.toHaveBeenCalled();
    });

    test('rejects and never calls execFile when the basename is not a known bbj program name', async () => {
        const argv: Argv = { file: path.join(FULL_HOME, 'bin', 'notbbj'), args: [] };
        await expect(runProcess(argv)).rejects.toBeTruthy();
        expect(execFileMock).not.toHaveBeenCalled();
    });

    test('rejects and never calls execFile when the parent directory is not named bin', async () => {
        const argv: Argv = { file: path.join(FULL_HOME, 'cfg', 'bbj'), args: [] };
        await expect(runProcess(argv)).rejects.toBeTruthy();
        expect(execFileMock).not.toHaveBeenCalled();
    });

    test('passes execFile the normalised reconstructed path, not the raw candidate with redundant separators', async () => {
        const argv: Argv = { file: FULL_HOME + path.sep + path.sep + 'bin' + path.sep + 'bbj', args: ['-q'] };
        execFileMock.mockImplementation((file, args, options, cb) => cb(null, '', ''));
        await runProcess(argv);
        const [calledFile] = execFileMock.mock.calls[0];
        expect(calledFile).toBe(path.join(FULL_HOME, 'bin', 'bbj'));
    });

    test('resolves and calls execFile exactly once for a fully valid installation layout (positive control)', async () => {
        const argv: Argv = { file: path.join(FULL_HOME, 'bin', 'bbjcpl'), args: ['-N', '/w/a.bbj'] };
        execFileMock.mockImplementation((file, args, options, cb) => cb(null, '', ''));
        await runProcess(argv);
        expect(execFileMock).toHaveBeenCalledTimes(1);
    });
});

describe.skipIf(process.platform === 'win32')('runProcessCallback', () => {
    test('delegates to execFile with the argument array', () => {
        const argv: Argv = { file: FULL_HOME_BBJ, args: ['-q'] };
        const cb = vi.fn();
        execFileMock.mockImplementation((file, args, options, innerCb) => innerCb(null, 'out', ''));

        runProcessCallback(argv, {}, cb);

        expect(execFileMock).toHaveBeenCalledTimes(1);
        const [calledFile, calledArgs] = execFileMock.mock.calls[0];
        expect(calledFile).toBe(argv.file);
        expect(calledArgs).toEqual(argv.args);
        expect(cb).toHaveBeenCalledWith(null, 'out', '');
    });

    test('attaches stderr to a non-null error', () => {
        const argv: Argv = { file: FULL_HOME_BBJ, args: ['-q'] };
        const cb = vi.fn();
        const err = new Error('failed');
        execFileMock.mockImplementation((file, args, options, innerCb) => innerCb(err, '', 'stderr text'));

        runProcessCallback(argv, {}, cb);

        expect(cb).toHaveBeenCalledWith(expect.objectContaining({ message: 'failed', stderr: 'stderr text' }), '', 'stderr text');
    });

    test('invokes the callback with a non-null error and never calls execFile when the file fails the installation-layout check', () => {
        const argv: Argv = { file: PARTIAL_HOME_BBJCPL, args: ['-N', '/w/a.bbj'] };
        const cb = vi.fn();

        runProcessCallback(argv, {}, cb);

        expect(cb).toHaveBeenCalledTimes(1);
        const [err] = cb.mock.calls[0];
        expect(err).toBeTruthy();
        expect(execFileMock).not.toHaveBeenCalled();
    });
});

describe('formatArgvForLog', () => {
    test('renders a readable single-line rendering, redacting a non-empty secret', () => {
        const argv: Argv = { file: '/opt/bbj/bin/bbj', args: ['-q', '-', 'admin', 'super-secret'] };
        const rendered = formatArgvForLog(argv, ['super-secret']);
        expect(rendered).not.toContain('super-secret');
        expect(rendered).toContain('***');
        expect(rendered).toContain('admin');
    });

    test('an empty-string secret redacts nothing', () => {
        const argv: Argv = { file: '/opt/bbj/bin/bbj', args: ['-q', '-', 'admin', ''] };
        const rendered = formatArgvForLog(argv, ['']);
        expect(rendered).not.toContain('***');
    });
});
