import { describe, expect, test, vi, beforeEach } from 'vitest';

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

beforeEach(() => {
    execFileMock.mockReset();
    execMock.mockReset();
});

describe('runProcess', () => {
    test('calls execFile with the executable path, the argument array, and no shell-enabling option', async () => {
        const argv: Argv = { file: '/opt/bbj/bin/bbj', args: ['-q', '-CPbbj_default', '-WD/w', '/w/a.bbj'] };
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
        const argv: Argv = { file: '/opt/bbj/bin/bbj', args: ['-q'] };
        execFileMock.mockImplementation((file, args, options, cb) => cb(null, '', ''));
        await runProcess(argv);
        expect(execMock).not.toHaveBeenCalled();
    });

    test('resolves {stdout, stderr} on success', async () => {
        const argv: Argv = { file: '/opt/bbj/bin/bbj', args: ['-q'] };
        execFileMock.mockImplementation((file, args, options, cb) => cb(null, 'hello', ''));
        const result = await runProcess(argv);
        expect(result).toEqual({ stdout: 'hello', stderr: '' });
    });

    test('rejects with the error, carrying stderr attached, on failure', async () => {
        const argv: Argv = { file: '/opt/bbj/bin/bbj', args: ['-q'] };
        const err = new Error('Command failed');
        execFileMock.mockImplementation((file, args, options, cb) => cb(err, '', 'boom on stderr'));
        await expect(runProcess(argv)).rejects.toMatchObject({ message: 'Command failed', stderr: 'boom on stderr' });
    });

    test('seam: a metacharacter-bearing classpath from buildRunArgv reaches execFile as one verbatim element', async () => {
        const { buildRunArgv } = await import('../src/Commands/process-args.js');
        const argv = buildRunArgv({
            home: '/opt/bbj',
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
});

describe('runProcessCallback', () => {
    test('delegates to execFile with the argument array', () => {
        const argv: Argv = { file: '/opt/bbj/bin/bbj', args: ['-q'] };
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
        const argv: Argv = { file: '/opt/bbj/bin/bbj', args: ['-q'] };
        const cb = vi.fn();
        const err = new Error('failed');
        execFileMock.mockImplementation((file, args, options, innerCb) => innerCb(err, '', 'stderr text'));

        runProcessCallback(argv, {}, cb);

        expect(cb).toHaveBeenCalledWith(expect.objectContaining({ message: 'failed', stderr: 'stderr text' }), '', 'stderr text');
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
