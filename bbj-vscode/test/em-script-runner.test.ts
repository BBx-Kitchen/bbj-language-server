import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

/**
 * Own unit tests for the one shared EM helper-script runner (issue #564):
 * output-file creation (owner-only, EEXIST on a pre-placed file), the launch
 * (env spread over process.env with argv.env winning, timeout passed through,
 * no shell option), the trimmed-output read, and cleanup (removed on success,
 * on a launcher rejection, and on a read failure), mirroring
 * process-runner.test.ts's mocking of `child_process`.
 */

const execFileMock = vi.fn();
const execMock = vi.fn();

vi.mock('child_process', () => ({
    execFile: (...args: unknown[]) => execFileMock(...args),
    exec: (...args: unknown[]) => execMock(...args)
}));

import { createScriptOutputFile, runScriptToOwnerOnlyFile } from '../src/em-script-runner.js';
import type { Argv } from '../src/Commands/process-args.js';

// Fixture homes mirroring process-runner.test.ts: cpl-fixture-bbjhome satisfies
// the full installation layout (bin/bbj, bin/bbjcpl, cfg/); cpl-fixture-partial-bbjhome
// does not, so a launch built against it fails the layout check before execFile runs.
const FULL_HOME = path.join(__dirname, 'test-data', 'cpl-fixture-bbjhome');
const FULL_HOME_BBJ = path.join(FULL_HOME, 'bin', 'bbj');
const PARTIAL_HOME_BBJ = path.join(__dirname, 'test-data', 'cpl-fixture-partial-bbjhome', 'bin', 'bbj');

beforeEach(() => {
    execFileMock.mockReset();
    execMock.mockReset();
});

afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.EM_SCRIPT_RUNNER_TEST_SENTINEL;
});

describe.skipIf(process.platform === 'win32')('createScriptOutputFile', () => {
    test('returns a path that exists, lies in os.tmpdir(), is named from the prefix and a millisecond timestamp, and is owner-only', () => {
        const outputFile = createScriptOutputFile('bbj-em-script-runner-test');
        try {
            expect(fs.existsSync(outputFile)).toBe(true);
            expect(path.dirname(outputFile)).toBe(os.tmpdir());
            expect(path.basename(outputFile)).toMatch(/^bbj-em-script-runner-test-\d+\.tmp$/);
            expect(fs.statSync(outputFile).mode & 0o777).toBe(0o600);
        } finally {
            fs.unlinkSync(outputFile);
        }
    });

    test('throws an error whose code is EEXIST and leaves the existing file untouched when a file already sits at the resulting path', () => {
        const fixedNow = 1234567890123;
        vi.spyOn(Date, 'now').mockReturnValue(fixedNow);
        const expectedPath = path.join(os.tmpdir(), `bbj-em-script-runner-eexist-${fixedNow}.tmp`);
        fs.writeFileSync(expectedPath, 'pre-existing contents');

        try {
            expect(() => createScriptOutputFile('bbj-em-script-runner-eexist')).toThrowError(
                expect.objectContaining({ code: 'EEXIST' })
            );
            expect(fs.readFileSync(expectedPath, 'utf-8')).toBe('pre-existing contents');
        } finally {
            fs.unlinkSync(expectedPath);
        }
    });
});

describe.skipIf(process.platform === 'win32')('runScriptToOwnerOnlyFile', () => {
    function makeOutputFile(): string {
        return createScriptOutputFile('bbj-em-script-runner-run');
    }

    test('resolves the trimmed contents of the output file', async () => {
        const outputFile = makeOutputFile();
        fs.writeFileSync(outputFile, '  VALID\n');
        const argv: Argv = { file: FULL_HOME_BBJ, args: ['-q', '-', outputFile] };
        execFileMock.mockImplementation((file, args, options, cb) => cb(null, '', ''));

        const result = await runScriptToOwnerOnlyFile(argv, outputFile, 10000);

        expect(result).toBe('VALID');
        expect(fs.existsSync(outputFile)).toBe(false);
    });

    test('removes the output file after a successful launch', async () => {
        const outputFile = makeOutputFile();
        fs.writeFileSync(outputFile, 'VALID');
        const argv: Argv = { file: FULL_HOME_BBJ, args: ['-q', '-', outputFile] };
        execFileMock.mockImplementation((file, args, options, cb) => cb(null, '', ''));

        await runScriptToOwnerOnlyFile(argv, outputFile, 10000);

        expect(fs.existsSync(outputFile)).toBe(false);
    });

    test('removes the output file and rejects with the same error object, stderr attached, when execFile reports an error', async () => {
        const outputFile = makeOutputFile();
        const argv: Argv = { file: FULL_HOME_BBJ, args: ['-q', '-', outputFile] };
        const err = new Error('spawn failed');
        execFileMock.mockImplementation((file, args, options, cb) => cb(err, '', 'boom on stderr'));

        await expect(runScriptToOwnerOnlyFile(argv, outputFile, 10000)).rejects.toBe(err);

        expect((err as { stderr?: string }).stderr).toBe('boom on stderr');
        expect(fs.existsSync(outputFile)).toBe(false);
    });

    test('spreads argv.env over process.env, with argv.env winning over a same-named process.env key', async () => {
        const outputFile = makeOutputFile();
        fs.writeFileSync(outputFile, 'VALID');
        process.env.EM_SCRIPT_RUNNER_TEST_SENTINEL = 'from-process-env';
        const argv: Argv = {
            file: FULL_HOME_BBJ,
            args: ['-q', '-', outputFile],
            env: { EM_SCRIPT_RUNNER_TEST_SENTINEL: 'from-argv-env', BBJ_EM_TOKEN: 'tok' }
        };
        execFileMock.mockImplementation((file, args, options, cb) => cb(null, '', ''));

        await runScriptToOwnerOnlyFile(argv, outputFile, 10000);

        const [, , options] = execFileMock.mock.calls[0];
        expect(options.env.EM_SCRIPT_RUNNER_TEST_SENTINEL).toBe('from-argv-env');
        expect(options.env.BBJ_EM_TOKEN).toBe('tok');
        expect(options.env.PATH).toBe(process.env.PATH);
    });

    test('passes the given timeout through and sets no shell option', async () => {
        const outputFile = makeOutputFile();
        fs.writeFileSync(outputFile, 'VALID');
        const argv: Argv = { file: FULL_HOME_BBJ, args: ['-q', '-', outputFile] };
        execFileMock.mockImplementation((file, args, options, cb) => cb(null, '', ''));

        await runScriptToOwnerOnlyFile(argv, outputFile, 12345);

        const [, , options] = execFileMock.mock.calls[0];
        expect(options.timeout).toBe(12345);
        expect(options).not.toHaveProperty('shell', true);
    });

    test('rejects, never calls execFile, and removes the output file when argv.file fails the installation-layout check', async () => {
        const outputFile = makeOutputFile();
        const argv: Argv = { file: PARTIAL_HOME_BBJ, args: ['-q', '-', outputFile] };

        await expect(runScriptToOwnerOnlyFile(argv, outputFile, 10000)).rejects.toBeTruthy();

        expect(execFileMock).not.toHaveBeenCalled();
        expect(fs.existsSync(outputFile)).toBe(false);
    });

    test('rejects with an ENOENT error and does not throw during cleanup when execFile deletes the output file before reporting success', async () => {
        const outputFile = makeOutputFile();
        const argv: Argv = { file: FULL_HOME_BBJ, args: ['-q', '-', outputFile] };
        execFileMock.mockImplementation((file, args, options, cb) => {
            fs.unlinkSync(outputFile);
            cb(null, '', '');
        });

        await expect(runScriptToOwnerOnlyFile(argv, outputFile, 10000)).rejects.toMatchObject({ code: 'ENOENT' });

        expect(fs.existsSync(outputFile)).toBe(false);
    });
});
