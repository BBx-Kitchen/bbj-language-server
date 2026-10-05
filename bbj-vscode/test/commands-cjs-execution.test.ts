/******************************************************************************
 * Copyright 2026 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

/**
 * Commands.cjs (issue #565) is resolved by Node's native loader, so `vi.mock`
 * cannot reach it; commands-cjs-harness.ts loads the real file through
 * node:module hooks and these tests drive its command bodies against spies.
 */

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { NO_ACTIVE_BBJ_FILE_MESSAGE } from '../src/Commands/target-resolution.js';
import type { Argv } from '../src/Commands/process-args.js';
import type { ProcessError } from '../src/Commands/process-runner.js';
import {
    fakeProcessRunner,
    fakeVscode,
    loadCommands,
    resetCommandsHarness,
    setFakeSettings,
} from './commands-cjs-harness.js';

const DEFAULT_TEST_SETTINGS = {
    bbj: { home: '/opt/bbx', classpath: '' },
    'bbj.web': { apps: {}, AutoSaveUponRun: false },
};

/**
 * A plain `Error` doesn't satisfy Node's `ExecException` (which `ProcessError` extends and
 * which requires `cmd`); this builds a minimal fake that does, for tests that hand a fake
 * failure straight to the `runProcessCallback` callback captured off `.mock.calls`.
 */
function fakeProcessError(message: string): ProcessError {
    return Object.assign(new Error(message), { cmd: message });
}

/**
 * Narrows a possibly-`undefined` property (`Argv.env`, `ExecFileOptions.env`) captured off a
 * mock call to its defined type for the env-focused assertions below — production always sets
 * `env` on a web-run argv/options pair, the type is just optional because not every `Argv` use
 * carries one.
 */
function assertDefined<T>(value: T | undefined, message: string): asserts value is T {
    if (value === undefined) {
        throw new Error(message);
    }
}

describe('Commands.cjs executes under vitest', () => {
    beforeEach(() => {
        resetCommandsHarness();
        setFakeSettings(DEFAULT_TEST_SETTINGS);
    });

    test('loadCommands() returns the real Commands object with every command function', () => {
        const { Commands } = loadCommands();
        for (const name of [
            'openConfigFile',
            'openPropertiesFile',
            'openEnterpriseManager',
            'run',
            'runBUI',
            'runDWC',
            'compile',
            'decompileReplace',
            'decompileReadonly',
            'setOutputChannel',
        ]) {
            expect(typeof (Commands as Record<string, unknown>)[name]).toBe('function');
        }
    });

    test('the loaded Commands object has no member for the removed bbjlst line-number command', () => {
        const { Commands } = loadCommands();
        expect(Object.prototype.hasOwnProperty.call(Commands, 'denumber')).toBe(false);
    });

    test('Commands.run launches once with the resolved config path, ending on the target file', () => {
        const { Commands, configPathCache } = loadCommands();
        configPathCache.setResolvedConfigPath({ path: '/cfg/config.bbx', exists: true });

        Commands.run({ fsPath: '/w/a.bbj' });

        expect(fakeProcessRunner.runProcessCallback).toHaveBeenCalledTimes(1);
        const [argv] = fakeProcessRunner.runProcessCallback.mock.calls[0];
        expect(argv.args).toContain('-c/cfg/config.bbx');
        expect(argv.args.at(-1)).toBe('/w/a.bbj');
    });

    test('Commands.run shows the no-config-path message and never spawns when the resolved payload is the "--" sentinel', () => {
        const { Commands, configPathCache } = loadCommands();
        configPathCache.setResolvedConfigPath({ path: '--', exists: false });

        Commands.run({ fsPath: '/w/a.bbj' });

        expect(fakeVscode.window.showErrorMessage).toHaveBeenCalledWith(
            expect.stringContaining('No config file could be resolved for this run.')
        );
        expect(fakeProcessRunner.runProcessCallback).not.toHaveBeenCalled();
    });

    test('loadCommands() is idempotent: hooks register once per worker, same Commands object every call', () => {
        const first = loadCommands();
        const second = loadCommands();
        expect(second.Commands).toBe(first.Commands);
        expect(second.configPathCache).toBe(first.configPathCache);
    });
});

describe('Commands.cjs openConfigFile', () => {
    beforeEach(() => {
        resetCommandsHarness();
        setFakeSettings(DEFAULT_TEST_SETTINGS);
    });

    test('shows the "not configured" error and never opens a document when nothing is configured, even with bbj.home set', () => {
        const { Commands } = loadCommands();

        Commands.openConfigFile();

        expect(fakeVscode.window.showErrorMessage).toHaveBeenCalledWith(
            'No config file is configured. Set the "bbj.configPath" setting to choose one.'
        );
        expect(fakeVscode.workspace.openTextDocument).not.toHaveBeenCalled();
    });

    test('shows "Config file not found" and never opens a document when the resolved payload reports the file missing', () => {
        const { Commands, configPathCache } = loadCommands();
        configPathCache.setResolvedConfigPath({ path: '/cfg/config.bbx', exists: false });

        Commands.openConfigFile();

        expect(fakeVscode.window.showErrorMessage).toHaveBeenCalledWith('Config file not found: /cfg/config.bbx');
        expect(fakeVscode.workspace.openTextDocument).not.toHaveBeenCalled();
    });

    test('opens the resolved path and shows the document when the resolved payload reports the file present', async () => {
        const { Commands, configPathCache } = loadCommands();
        configPathCache.setResolvedConfigPath({ path: '/cfg/config.bbx', exists: true });

        await Commands.openConfigFile();

        expect(fakeVscode.workspace.openTextDocument).toHaveBeenCalledWith('/cfg/config.bbx');
        expect(fakeVscode.window.showTextDocument).toHaveBeenCalledTimes(1);
    });
});

describe('Commands.cjs run', () => {
    beforeEach(() => {
        resetCommandsHarness();
        setFakeSettings(DEFAULT_TEST_SETTINGS);
    });

    test('shows NO_ACTIVE_BBJ_FILE_MESSAGE and never spawns when there is no fsPath and no active editor', () => {
        const { Commands } = loadCommands();

        Commands.run({});

        expect(fakeVscode.window.showWarningMessage).toHaveBeenCalledWith(NO_ACTIVE_BBJ_FILE_MESSAGE);
        expect(fakeProcessRunner.runProcessCallback).not.toHaveBeenCalled();
    });

    test('shows the "bbj.home settings cannot be found" error and never spawns when bbj.home is unset', () => {
        const { Commands, configPathCache } = loadCommands();
        setFakeSettings({ bbj: { home: '', classpath: '' }, 'bbj.web': { apps: {}, AutoSaveUponRun: false } });
        configPathCache.setResolvedConfigPath({ path: '/cfg/config.bbx', exists: true });

        Commands.run({ fsPath: '/w/a.bbj' });

        expect(fakeVscode.window.showErrorMessage.mock.calls[0][0]).toEqual(
            expect.stringContaining('bbj.home settings cannot be found')
        );
        expect(fakeProcessRunner.runProcessCallback).not.toHaveBeenCalled();
    });

    test('shows a "Failed to run" error when the spawn callback is invoked with an Error', () => {
        const { Commands, configPathCache } = loadCommands();
        configPathCache.setResolvedConfigPath({ path: '/cfg/config.bbx', exists: true });

        Commands.run({ fsPath: '/w/a.bbj' });
        const [, , callback] = fakeProcessRunner.runProcessCallback.mock.calls[0];
        callback(fakeProcessError('boom'), '', 'stderr text');

        expect(fakeVscode.window.showErrorMessage).toHaveBeenCalledWith(
            expect.stringMatching(/^Failed to run "\/w\/a\.bbj"/)
        );
    });

    test('logs a "GUI run: " debug line to the output channel when bbj.debug is true and an output channel is set', () => {
        const { Commands, configPathCache } = loadCommands();
        setFakeSettings({
            bbj: { home: '/opt/bbx', classpath: '', debug: true },
            'bbj.web': { apps: {}, AutoSaveUponRun: false },
        });
        configPathCache.setResolvedConfigPath({ path: '/cfg/config.bbx', exists: true });
        const appendLine = vi.fn((_line: string) => {});
        Commands.setOutputChannel({ appendLine });

        Commands.run({ fsPath: '/w/a.bbj' });

        expect(appendLine).toHaveBeenCalledWith(expect.stringMatching(/^GUI run: /));
    });
});

describe('Commands.cjs runBUI / runDWC', () => {
    beforeEach(() => {
        resetCommandsHarness();
        setFakeSettings(DEFAULT_TEST_SETTINGS);
    });

    test('runBUI with token credentials spawns once, carries the token only in argv.env, and never in argv.args', () => {
        const { Commands, configPathCache } = loadCommands();
        configPathCache.setResolvedConfigPath({ path: '/cfg/config.bbx', exists: true });

        Commands.runBUI({ fsPath: '/w/a.bbj' }, { username: '__token__', password: 'tok-123' });

        expect(fakeProcessRunner.runProcessCallback).toHaveBeenCalledTimes(1);
        const [argv, options] = fakeProcessRunner.runProcessCallback.mock.calls[0];
        assertDefined(argv.env, 'expected argv.env to be set for a web run');
        assertDefined(options.env, 'expected options.env to be set for a web run');
        expect(argv.args).toContain('BUI');
        expect(argv.args.at(-1)).toBe('/cfg/config.bbx');
        expect(argv.env.BBJ_EM_TOKEN).toBe('tok-123');
        expect(argv.env.BBJ_EM_USERNAME).toBe('');
        expect(argv.env.BBJ_EM_PASSWORD).toBe('');
        expect(argv.args.some((a: string) => a.includes('tok-123'))).toBe(false);
        for (const key of Object.keys(argv.env)) {
            expect(options.env[key]).toBe(argv.env[key]);
        }
    });

    test('runDWC with username/password credentials spawns once, carries the password only in argv.env, and never in argv.args', () => {
        const { Commands, configPathCache } = loadCommands();
        configPathCache.setResolvedConfigPath({ path: '/cfg/config.bbx', exists: true });

        Commands.runDWC({ fsPath: '/w/a.bbj' }, { username: 'jdoe', password: 'pw-secret-9' });

        expect(fakeProcessRunner.runProcessCallback).toHaveBeenCalledTimes(1);
        const [argv] = fakeProcessRunner.runProcessCallback.mock.calls[0];
        assertDefined(argv.env, 'expected argv.env to be set for a web run');
        expect(argv.args).toContain('DWC');
        expect(argv.env.BBJ_EM_USERNAME).toBe('jdoe');
        expect(argv.env.BBJ_EM_PASSWORD).toBe('pw-secret-9');
        expect(argv.env.BBJ_EM_TOKEN).toBe('');
        expect(argv.args.some((a: string) => a.includes('pw-secret-9'))).toBe(false);
    });

    test('runBUI with a "--" resolved config path shows the no-config-path message and never spawns', () => {
        const { Commands, configPathCache } = loadCommands();
        configPathCache.setResolvedConfigPath({ path: '--', exists: false });

        Commands.runBUI({ fsPath: '/w/a.bbj' }, { username: 'jdoe', password: 'pw' });

        expect(fakeVscode.window.showErrorMessage).toHaveBeenCalledWith(
            expect.stringContaining('No config file could be resolved for this run.')
        );
        expect(fakeProcessRunner.runProcessCallback).not.toHaveBeenCalled();
    });

    test('runBUI with no resolved payload and no bbj.configPath shows the no-config-path message and never spawns', () => {
        const { Commands } = loadCommands();

        Commands.runBUI({ fsPath: '/w/a.bbj' }, { username: 'jdoe', password: 'pw' });

        expect(fakeVscode.window.showErrorMessage).toHaveBeenCalledWith(
            expect.stringContaining('No config file could be resolved for this run.')
        );
        expect(fakeProcessRunner.runProcessCallback).not.toHaveBeenCalled();
    });

    test('runBUI with undefined credentials shows the NO_EM_CREDENTIALS_MESSAGE and never spawns, even with legacy bbj.web credential settings present', () => {
        const { Commands, configPathCache } = loadCommands();
        configPathCache.setResolvedConfigPath({ path: '/cfg/config.bbx', exists: true });
        setFakeSettings({
            bbj: { home: '/opt/bbx', classpath: '', web: { username: 'legacy-user', password: 'legacy-pw' } },
            'bbj.web': { apps: {}, AutoSaveUponRun: false },
        });

        Commands.runBUI({ fsPath: '/w/a.bbj' }, undefined);

        expect(fakeVscode.window.showErrorMessage).toHaveBeenCalledWith(
            (Commands as Record<string, unknown>).NO_EM_CREDENTIALS_MESSAGE
        );
        expect(fakeProcessRunner.runProcessCallback).not.toHaveBeenCalled();
    });

    test('runBUI\'s callback invoked with an Error shows an error starting "Failed to run"', () => {
        const { Commands, configPathCache } = loadCommands();
        configPathCache.setResolvedConfigPath({ path: '/cfg/config.bbx', exists: true });

        Commands.runBUI({ fsPath: '/w/a.bbj' }, { username: 'jdoe', password: 'pw' });
        const [, , callback] = fakeProcessRunner.runProcessCallback.mock.calls[0];
        callback(fakeProcessError('boom'), '', '');

        expect(fakeVscode.window.showErrorMessage).toHaveBeenCalledWith(
            expect.stringMatching(/^Failed to run "a\.bbj"/)
        );
    });

    test('with bbj.debug true and an output channel set, the runBUI/runDWC debug lines never contain the token/password', () => {
        const { Commands, configPathCache } = loadCommands();
        setFakeSettings({
            bbj: { home: '/opt/bbx', classpath: '', debug: true },
            'bbj.web': { apps: {}, AutoSaveUponRun: false },
        });
        configPathCache.setResolvedConfigPath({ path: '/cfg/config.bbx', exists: true });
        const appendLine = vi.fn((_line: string) => {});
        Commands.setOutputChannel({ appendLine });

        Commands.runBUI({ fsPath: '/w/a.bbj' }, { username: '__token__', password: 'tok-123' });
        const buiLine = appendLine.mock.calls.find(([line]: [string]) => line.startsWith('BUI run: '))?.[0];
        expect(buiLine).toBeDefined();
        expect(buiLine).not.toContain('tok-123');

        appendLine.mockClear();
        fakeProcessRunner.runProcessCallback.mockClear();
        Commands.runDWC({ fsPath: '/w/a.bbj' }, { username: 'jdoe', password: 'pw-secret-9' });
        const dwcLine = appendLine.mock.calls.find(([line]: [string]) => line.startsWith('DWC run: '))?.[0];
        expect(dwcLine).toBeDefined();
        expect(dwcLine).not.toContain('pw-secret-9');
    });
});

describe('Commands.cjs compile', () => {
    beforeEach(() => {
        resetCommandsHarness();
        setFakeSettings(DEFAULT_TEST_SETTINGS);
    });

    test('compiles the target once, ending on the target file, then shows success', async () => {
        const { Commands } = loadCommands();

        Commands.compile({ fsPath: '/w/a.bbj' });
        await fakeVscode.window.withProgress.mock.results.at(-1)?.value;

        expect(fakeProcessRunner.runProcess).toHaveBeenCalledTimes(1);
        const [argv] = fakeProcessRunner.runProcess.mock.calls[0];
        expect(argv.args.at(-1)).toBe('/w/a.bbj');
        expect(fakeVscode.window.showInformationMessage).toHaveBeenCalledWith('Successfully compiled "/w/a.bbj"');
    });

    test('shows a "Failed to compile" error containing stderr when runProcess rejects', async () => {
        const { Commands } = loadCommands();
        const error = Object.assign(new Error('compile failed'), { stderr: 'boom' });
        fakeProcessRunner.runProcess.mockRejectedValueOnce(error);

        Commands.compile({ fsPath: '/w/a.bbj' });
        await fakeVscode.window.withProgress.mock.results.at(-1)?.value;

        const [message] = fakeVscode.window.showErrorMessage.mock.calls[0];
        expect(message).toMatch(/^Failed to compile "\/w\/a\.bbj"/);
        expect(message).toContain('boom');
    });

    test('shows a conflicts error and never calls runProcess when two conflicting options are both set', () => {
        const { Commands } = loadCommands();
        setFakeSettings({
            bbj: {
                home: '/opt/bbx',
                classpath: '',
                compiler: {
                    typeChecking: {
                        enabled: true,
                        configFile: '/explicit/config.bbx',
                        prefixDirectories: '/prefix/dir',
                    },
                },
            },
            'bbj.web': { apps: {}, AutoSaveUponRun: false },
        });

        Commands.compile({ fsPath: '/w/a.bbj' });

        const [message] = fakeVscode.window.showErrorMessage.mock.calls[0];
        expect(message).toMatch(/^Compiler options have conflicts/);
        expect(fakeProcessRunner.runProcess).not.toHaveBeenCalled();
    });
});

/** The first bytes of a tokenized BBj program ("<<bbj>>") followed by an opaque payload. */
const TOKENIZED_PROGRAM = '<<bbj>>tokenized payload';

describe('Commands.cjs decompileReplace / decompileReadonly', () => {
    let tmpDir: string;
    let scratchTmp: string;
    let savedTmpdir: string | undefined;

    beforeEach(() => {
        resetCommandsHarness();
        setFakeSettings(DEFAULT_TEST_SETTINGS);
        tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bbj-cjs-test-'));
        // Private directories are created under os.tmpdir(); a per-test TMPDIR keeps the
        // directory counts below from racing other test files that share the system temp dir.
        scratchTmp = fs.mkdtempSync(path.join(os.tmpdir(), 'bbj-cjs-scratch-'));
        savedTmpdir = process.env.TMPDIR;
        process.env.TMPDIR = scratchTmp;
    });

    afterEach(() => {
        if (savedTmpdir === undefined) {
            delete process.env.TMPDIR;
        } else {
            process.env.TMPDIR = savedTmpdir;
        }
        fs.rmSync(tmpDir, { recursive: true, force: true });
        fs.rmSync(scratchTmp, { recursive: true, force: true });
    });

    /**
     * Fakes bbjlst by its documented `-d` rule: the listing is written into the `-d`
     * directory under exactly the input's file name, and never next to the input.
     */
    function fakeBbjlstWrites(content: string): void {
        fakeProcessRunner.runProcess.mockImplementation(async (argv: Argv) => {
            const outFlag = argv.args.find((arg) => arg.startsWith('-d'));
            if (outFlag === undefined) {
                throw new Error('fake bbjlst: no -d argument');
            }
            const target = argv.args.at(-1) as string;
            fs.writeFileSync(path.join(outFlag.slice(2), path.basename(target)), content);
            return { stdout: '', stderr: '' };
        });
    }

    /** The `-d` elements of a recorded bbjlst argv. */
    function outputDirFlags(args: string[]): string[] {
        return args.filter((arg) => arg.startsWith('-d'));
    }

    test('decompileReplace on a tokenized program runs bbjlst once without -l, with a private -d directory and the resolved path, and the file then holds the listing', async () => {
        const { Commands } = loadCommands();
        const inputPath = path.join(tmpDir, 'tok-replace.bbj');
        fs.writeFileSync(inputPath, '<<bbj>>tokenized payload');
        const lstContent = 'listing\n';
        fakeBbjlstWrites(lstContent);

        Commands.decompileReplace({ fsPath: inputPath });
        await fakeVscode.window.withProgress.mock.results.at(-1)?.value;

        expect(fakeProcessRunner.runProcess).toHaveBeenCalledTimes(1);
        const args = fakeProcessRunner.runProcess.mock.calls[0][0].args as string[];
        expect(args).not.toContain('-l');
        expect(args).toHaveLength(2);
        const flags = outputDirFlags(args);
        expect(flags).toHaveLength(1);
        expect(path.basename(flags[0].slice(2))).toMatch(/^bbj-decompiled-/);
        expect(args.at(-1)).toBe(path.resolve(inputPath));
        expect(fs.readFileSync(inputPath, 'utf-8')).toBe(lstContent);
    });

    test('decompileReadonly on a tokenized program runs bbjlst once without -l, with a private -d directory and the original path, leaving the original untouched', async () => {
        const { Commands } = loadCommands();
        const inputPath = path.join(tmpDir, 'tok-readonly.bbj');
        const original = '<<bbj>>tokenized payload';
        fs.writeFileSync(inputPath, original);
        fakeBbjlstWrites('listing\n');

        Commands.decompileReadonly({ fsPath: inputPath });
        await fakeVscode.window.withProgress.mock.results.at(-1)?.value;

        expect(fakeProcessRunner.runProcess).toHaveBeenCalledTimes(1);
        const args = fakeProcessRunner.runProcess.mock.calls[0][0].args as string[];
        expect(args).not.toContain('-l');
        expect(args).toHaveLength(2);
        const flags = outputDirFlags(args);
        expect(flags).toHaveLength(1);
        expect(path.basename(flags[0].slice(2))).toMatch(/^bbj-decompiled-/);
        expect(args.at(-1)).toBe(path.resolve(inputPath));
        expect(fs.readFileSync(inputPath, 'utf-8')).toBe(original);

        const [uri] = fakeVscode.workspace.openTextDocument.mock.calls.at(-1) ?? [];
        const openedPath = (uri as { fsPath?: string } | undefined)?.fsPath ?? '';
        fs.rmSync(path.dirname(openedPath), { recursive: true, force: true });
    });

    test('decompileReplace rewrites the input file in place with the .lst content, then opens and shows it', async () => {
        const { Commands } = loadCommands();
        const inputPath = path.join(tmpDir, 'a.bbj');
        fs.writeFileSync(inputPath, TOKENIZED_PROGRAM);
        const lstContent = 'decompiled content\n';
        fakeBbjlstWrites(lstContent);

        Commands.decompileReplace({ fsPath: inputPath });
        await fakeVscode.window.withProgress.mock.results.at(-1)?.value;

        expect(fs.readFileSync(inputPath, 'utf-8')).toBe(lstContent);
        const [uri] = fakeVscode.workspace.openTextDocument.mock.calls.at(-1) ?? [];
        expect((uri as { fsPath?: string } | undefined)?.fsPath).toBe(inputPath);
        expect(fakeVscode.window.showTextDocument).toHaveBeenCalledTimes(1);
        expect(fakeVscode.window.withProgress.mock.calls[0][0]).toMatchObject({ title: 'Decompiling BBj Program...' });
    });

    test('decompileReplace resolves its target through the decompile target resolver', async () => {
        const { Commands } = loadCommands();
        const inputPath = path.join(tmpDir, 'b.bbj');
        fs.writeFileSync(inputPath, TOKENIZED_PROGRAM);
        fakeBbjlstWrites('decompiled content\n');

        Commands.decompileReplace({ fsPath: inputPath });
        await fakeVscode.window.withProgress.mock.results.at(-1)?.value;

        expect(fakeProcessRunner.runProcess.mock.calls[0][0].args.at(-1)).toBe(path.resolve(inputPath));
        expect(fakeVscode.window.showWarningMessage).not.toHaveBeenCalled();
    });

    test('decompileReadonly leaves the original untouched and opens a .bbj file in a bbj-decompiled- temp dir as read-only', async () => {
        const { Commands } = loadCommands();
        const inputPath = path.join(tmpDir, 'c.bbj');
        const originalContent = TOKENIZED_PROGRAM;
        fs.writeFileSync(inputPath, originalContent);
        const lstContent = 'read-only decompiled content\n';
        fakeBbjlstWrites(lstContent);

        Commands.decompileReadonly({ fsPath: inputPath });
        await fakeVscode.window.withProgress.mock.results.at(-1)?.value;

        expect(fs.readFileSync(inputPath, 'utf-8')).toBe(originalContent);

        const [uri] = fakeVscode.workspace.openTextDocument.mock.calls.at(-1) ?? [];
        const openedPath = (uri as { fsPath?: string } | undefined)?.fsPath ?? '';
        expect(openedPath).toMatch(/bbj-decompiled-[^/\\]*[/\\]c\.bbj$/);
        expect(fs.readFileSync(openedPath, 'utf-8')).toBe(lstContent);
        expect(fakeVscode.commands.executeCommand).toHaveBeenCalledWith(
            'workbench.action.files.setActiveEditorReadonlyInSession'
        );

        fs.rmSync(path.dirname(openedPath), { recursive: true, force: true });
    });

    const PLAIN_NUMBERED_PROGRAM = '0010 PRINT 1\n0020 END\n';

    function decompileTempDirs(): string[] {
        return fs.readdirSync(scratchTmp).filter((name) => name.startsWith('bbj-decompiled-')).sort();
    }

    test('decompileReplace refuses a plain-text file: warns once, launches nothing, opens nothing, leaves the file unchanged', async () => {
        const { Commands } = loadCommands();
        const inputPath = path.join(tmpDir, 'plain-replace.bbj');
        fs.writeFileSync(inputPath, PLAIN_NUMBERED_PROGRAM);
        fakeBbjlstWrites('must never be written\n');

        Commands.decompileReplace({ fsPath: inputPath });
        await fakeVscode.window.withProgress.mock.results.at(-1)?.value;

        expect(fakeVscode.window.showWarningMessage).toHaveBeenCalledTimes(1);
        expect(fakeVscode.window.showWarningMessage).toHaveBeenCalledWith(
            '"plain-replace.bbj" is not a tokenized BBj program, so there is nothing to decompile.'
        );
        expect(fakeProcessRunner.runProcess).not.toHaveBeenCalled();
        expect(fakeVscode.workspace.openTextDocument).not.toHaveBeenCalled();
        expect(fakeVscode.window.showErrorMessage).not.toHaveBeenCalled();
        expect(fs.readFileSync(inputPath, 'utf-8')).toBe(PLAIN_NUMBERED_PROGRAM);
        expect(fs.existsSync(`${inputPath}.lst`)).toBe(false);
    });

    test('decompileReadonly refuses a plain-text file: warns once, creates no temporary directory, launches nothing, opens nothing', async () => {
        const { Commands } = loadCommands();
        const inputPath = path.join(tmpDir, 'plain-readonly.bbj');
        fs.writeFileSync(inputPath, PLAIN_NUMBERED_PROGRAM);
        fakeBbjlstWrites('must never be written\n');
        const tempDirsBefore = decompileTempDirs();

        Commands.decompileReadonly({ fsPath: inputPath });
        await fakeVscode.window.withProgress.mock.results.at(-1)?.value;

        expect(fakeVscode.window.showWarningMessage).toHaveBeenCalledTimes(1);
        expect(fakeVscode.window.showWarningMessage).toHaveBeenCalledWith(
            '"plain-readonly.bbj" is not a tokenized BBj program, so there is nothing to decompile.'
        );
        expect(fakeProcessRunner.runProcess).not.toHaveBeenCalled();
        expect(decompileTempDirs()).toEqual(tempDirsBefore);
        expect(fakeVscode.workspace.openTextDocument).not.toHaveBeenCalled();
        expect(fakeVscode.commands.executeCommand).not.toHaveBeenCalled();
        expect(fakeVscode.window.showErrorMessage).not.toHaveBeenCalled();
        expect(fs.readFileSync(inputPath, 'utf-8')).toBe(PLAIN_NUMBERED_PROGRAM);
    });

    describe('a file the probe cannot call tokenized names its real cause', () => {
        const COMMANDS = ['decompileReplace', 'decompileReadonly'] as const;

        afterEach(() => {
            vi.restoreAllMocks();
        });

        async function run(command: typeof COMMANDS[number], target: string): Promise<void> {
            const { Commands } = loadCommands();
            Commands[command]({ fsPath: target });
            await fakeVscode.window.withProgress.mock.results.at(-1)?.value;
        }

        function expectNothingStarted(): void {
            expect(fakeProcessRunner.runProcess).not.toHaveBeenCalled();
            expect(decompileTempDirs()).toEqual([]);
            expect(fakeVscode.workspace.openTextDocument).not.toHaveBeenCalled();
        }

        test.each(COMMANDS)('%s on a file that fails to open shows one error with the cause, not "not a tokenized BBj program"', async (command) => {
            const inputPath = path.join(tmpDir, 'busy.bbj');
            fs.writeFileSync(inputPath, TOKENIZED_PROGRAM);
            fakeBbjlstWrites('must never be written\n');
            vi.spyOn(fs.promises, 'open').mockRejectedValueOnce(Object.assign(new Error('resource busy or locked'), { code: 'EBUSY' }));

            await run(command, inputPath);

            expect(fakeVscode.window.showErrorMessage).toHaveBeenCalledTimes(1);
            const [message] = fakeVscode.window.showErrorMessage.mock.calls[0];
            expect(message).toBe('Could not read "busy.bbj": resource busy or locked');
            expect(fakeVscode.window.showWarningMessage).not.toHaveBeenCalled();
            expectNothingStarted();
        });

        test.skipIf(process.platform === 'win32' || process.getuid?.() === 0).each(COMMANDS)(
            '%s on a file without read permission shows one error that contains EACCES',
            async (command) => {
                const inputPath = path.join(tmpDir, 'locked.bbj');
                fs.writeFileSync(inputPath, TOKENIZED_PROGRAM);
                fs.chmodSync(inputPath, 0o000);

                await run(command, inputPath);

                expect(fakeVscode.window.showErrorMessage).toHaveBeenCalledTimes(1);
                expect(fakeVscode.window.showErrorMessage.mock.calls[0][0]).toContain('EACCES');
                expect(fakeVscode.window.showWarningMessage).not.toHaveBeenCalled();
                expectNothingStarted();
            }
        );

        test.each(COMMANDS)('%s on a missing file warns that it was not found', async (command) => {
            await run(command, path.join(tmpDir, 'gone.bbj'));

            expect(fakeVscode.window.showWarningMessage).toHaveBeenCalledTimes(1);
            expect(fakeVscode.window.showWarningMessage).toHaveBeenCalledWith(
                '"gone.bbj" was not found, so there is nothing to decompile.'
            );
            expect(fakeVscode.window.showErrorMessage).not.toHaveBeenCalled();
            expectNothingStarted();
        });

        test.each(COMMANDS)('%s on a directory warns that it is not a regular file', async (command) => {
            const dirPath = path.join(tmpDir, 'a-folder.bbj');
            fs.mkdirSync(dirPath);

            await run(command, dirPath);

            expect(fakeVscode.window.showWarningMessage).toHaveBeenCalledTimes(1);
            expect(fakeVscode.window.showWarningMessage).toHaveBeenCalledWith(
                '"a-folder.bbj" is not a regular file, so there is nothing to decompile.'
            );
            expect(fakeVscode.window.showErrorMessage).not.toHaveBeenCalled();
            expectNothingStarted();
        });

        test.each(COMMANDS)('%s on plain text keeps the not-tokenized warning', async (command) => {
            const inputPath = path.join(tmpDir, 'plain.bbj');
            fs.writeFileSync(inputPath, PLAIN_NUMBERED_PROGRAM);

            await run(command, inputPath);

            expect(fakeVscode.window.showWarningMessage).toHaveBeenCalledTimes(1);
            expect(fakeVscode.window.showWarningMessage).toHaveBeenCalledWith(
                '"plain.bbj" is not a tokenized BBj program, so there is nothing to decompile.'
            );
            expect(fakeVscode.window.showErrorMessage).not.toHaveBeenCalled();
            expectNothingStarted();
        });
    });

    test('decompileReplace on a symlinked tokenized program hands bbjlst the target, rewrites the target and keeps the link', async () => {
        const { Commands } = loadCommands();
        const target = path.join(tmpDir, 'target.bbj');
        const link = path.join(tmpDir, 'link.bbj');
        fs.writeFileSync(target, TOKENIZED_PROGRAM);
        fs.symlinkSync(target, link);
        fakeBbjlstWrites('decompiled content\n');

        Commands.decompileReplace({ fsPath: link });
        await fakeVscode.window.withProgress.mock.results.at(-1)?.value;

        expect(fakeProcessRunner.runProcess.mock.calls[0][0].args.at(-1)).toBe(fs.realpathSync(target));
        expect(fs.readFileSync(target, 'utf-8')).toBe('decompiled content\n');
        expect(fs.lstatSync(link).isSymbolicLink()).toBe(true);
        const [uri] = fakeVscode.workspace.openTextDocument.mock.calls.at(-1) ?? [];
        expect((uri as { fsPath?: string } | undefined)?.fsPath).toBe(link);
    });

    test('a decompile whose runProcess rejects shows an error starting "Failed to decompile"', async () => {
        const { Commands } = loadCommands();
        const inputPath = path.join(tmpDir, 'd.bbj');
        fs.writeFileSync(inputPath, TOKENIZED_PROGRAM);
        fakeProcessRunner.runProcess.mockRejectedValueOnce(new Error('decompile boom'));

        Commands.decompileReplace({ fsPath: inputPath });
        await fakeVscode.window.withProgress.mock.results.at(-1)?.value;

        const [message] = fakeVscode.window.showErrorMessage.mock.calls[0];
        expect(message).toMatch(/^Failed to decompile/);
    });

    const BOTH_COMMANDS = ['decompileReplace', 'decompileReadonly'] as const;

    function errorMessages(): string[] {
        return fakeVscode.window.showErrorMessage.mock.calls.map(([message]) => message as string);
    }

    test.each(BOTH_COMMANDS)(
        '%s reports a bbjlst run that exits 0 without writing a listing, with bbjlst\'s own output as details',
        async (command) => {
            const { Commands } = loadCommands();
            const inputPath = path.join(tmpDir, 'nolisting.bbj');
            fs.writeFileSync(inputPath, TOKENIZED_PROGRAM);
            fakeProcessRunner.runProcess.mockImplementation(async () => ({
                stdout: 'Unable to open file\n',
                stderr: '',
            }));

            Commands[command]({ fsPath: inputPath });
            await fakeVscode.window.withProgress.mock.results.at(-1)?.value;

            expect(errorMessages()).toHaveLength(1);
            expect(errorMessages()[0]).toMatch(/^Failed to decompile/);
            expect(errorMessages()[0]).toContain('wrote no decompiled listing for "nolisting.bbj"');
            expect(errorMessages()[0]).toContain('\n\nDetails:\nUnable to open file');
            expect(fs.readFileSync(inputPath, 'utf-8')).toBe(TOKENIZED_PROGRAM);
            expect(decompileTempDirs()).toEqual([]);
            expect(fakeVscode.workspace.openTextDocument).not.toHaveBeenCalled();
        },
        15_000
    );

    test.each(
        BOTH_COMMANDS.flatMap((command) => [
            [command, 'an empty listing', '', 'wrote an empty listing for "bad.bbj"'],
            [command, 'a still-tokenized listing', '<<bbj>>still tokenized', 'is still a tokenized program'],
        ])
    )('%s fails on %s, leaves the file unchanged and no private directory behind', async (command, _label, listing, message) => {
        const { Commands } = loadCommands();
        const inputPath = path.join(tmpDir, 'bad.bbj');
        fs.writeFileSync(inputPath, TOKENIZED_PROGRAM);
        fakeBbjlstWrites(listing);

        Commands[command]({ fsPath: inputPath });
        await fakeVscode.window.withProgress.mock.results.at(-1)?.value;

        expect(errorMessages()).toHaveLength(1);
        expect(errorMessages()[0]).toMatch(/^Failed to decompile/);
        expect(errorMessages()[0]).toContain(message);
        expect(fs.readFileSync(inputPath, 'utf-8')).toBe(TOKENIZED_PROGRAM);
        expect(decompileTempDirs()).toEqual([]);
    });

    test.each(BOTH_COMMANDS)('%s leaves no private directory behind when bbjlst itself fails to run', async (command) => {
        const { Commands } = loadCommands();
        const inputPath = path.join(tmpDir, 'boom.bbj');
        fs.writeFileSync(inputPath, TOKENIZED_PROGRAM);
        fakeProcessRunner.runProcess.mockRejectedValueOnce(new Error('decompile boom'));

        Commands[command]({ fsPath: inputPath });
        await fakeVscode.window.withProgress.mock.results.at(-1)?.value;

        expect(errorMessages()[0]).toMatch(/^Failed to decompile ".*boom\.bbj": decompile boom/);
        expect(fs.readFileSync(inputPath, 'utf-8')).toBe(TOKENIZED_PROGRAM);
        expect(decompileTempDirs()).toEqual([]);
    });

    test.each([
        ['a .pub file', 'a.pub'],
        ['an extensionless file', 'a'],
        ['a .lst file', 'a.lst'],
    ])('decompileReplace rewrites %s in place and leaves no private directory behind', async (_label, fileName) => {
        const { Commands } = loadCommands();
        const inputPath = path.join(tmpDir, fileName);
        fs.writeFileSync(inputPath, TOKENIZED_PROGRAM);
        const listing = 'unnumbered listing\n';
        fakeBbjlstWrites(listing);

        Commands.decompileReplace({ fsPath: inputPath });
        await fakeVscode.window.withProgress.mock.results.at(-1)?.value;

        expect(fakeVscode.window.showErrorMessage).not.toHaveBeenCalled();
        expect(fs.readFileSync(inputPath, 'utf-8')).toBe(listing);
        expect(fs.readdirSync(tmpDir)).toEqual([fileName]);
        expect(decompileTempDirs()).toEqual([]);
    });

    test('decompileReplace of a.bbj leaves a sibling file named a byte-identical', async () => {
        const { Commands } = loadCommands();
        const inputPath = path.join(tmpDir, 'a.bbj');
        const siblingPath = path.join(tmpDir, 'a');
        const siblingContent = 'plain text sibling\n';
        fs.writeFileSync(inputPath, TOKENIZED_PROGRAM);
        fs.writeFileSync(siblingPath, siblingContent);
        fakeBbjlstWrites('listing\n');

        Commands.decompileReplace({ fsPath: inputPath });
        await fakeVscode.window.withProgress.mock.results.at(-1)?.value;

        expect(fs.readFileSync(inputPath, 'utf-8')).toBe('listing\n');
        expect(fs.readFileSync(siblingPath, 'utf-8')).toBe(siblingContent);
        expect(fs.readdirSync(tmpDir).sort()).toEqual(['a', 'a.bbj']);
    });

    describe('decompileReplace and the tab that still holds the binary program', () => {
        function fileTab(fsPath: string, isDirty = false) {
            return { input: { uri: { scheme: 'file', fsPath } }, isDirty };
        }

        test('closes the placeholder tab before it opens the document, in the column that tab was in', async () => {
            const { Commands } = loadCommands();
            const inputPath = path.join(tmpDir, 'tab.bbj');
            fs.writeFileSync(inputPath, TOKENIZED_PROGRAM);
            fakeBbjlstWrites('source\n');
            const placeholder = fileTab(inputPath);
            const other = fileTab(path.join(tmpDir, 'other.bbj'));
            fakeVscode.window.tabGroups.all = [{ viewColumn: 1, tabs: [other] }, { viewColumn: 2, tabs: [placeholder] }];
            const order: string[] = [];
            fakeVscode.window.tabGroups.close.mockImplementation(async () => {
                order.push('close');
                return true;
            });
            fakeVscode.workspace.openTextDocument.mockImplementation(async (target: unknown) => {
                order.push('open');
                return { uri: target, fileName: inputPath };
            });

            Commands.decompileReplace({ fsPath: inputPath });
            await fakeVscode.window.withProgress.mock.results.at(-1)?.value;

            expect(order).toEqual(['close', 'open']);
            expect(fakeVscode.window.tabGroups.close).toHaveBeenCalledWith([placeholder], true);
            expect(fakeVscode.window.showErrorMessage).not.toHaveBeenCalled();
            expect(fakeVscode.window.showTextDocument).toHaveBeenCalledWith(expect.anything(), { preview: false, viewColumn: 2 });
        });

        test('also closes a tab on the real path behind a symbolic link', async () => {
            const { Commands } = loadCommands();
            const target = path.join(tmpDir, 'target.bbj');
            const link = path.join(tmpDir, 'link.bbj');
            fs.writeFileSync(target, TOKENIZED_PROGRAM);
            fs.symlinkSync(target, link);
            fakeBbjlstWrites('source\n');
            const onLink = fileTab(link);
            const onTarget = fileTab(fs.realpathSync(target));
            fakeVscode.window.tabGroups.all = [{ viewColumn: 1, tabs: [onLink, onTarget] }];

            Commands.decompileReplace({ fsPath: link });
            await fakeVscode.window.withProgress.mock.results.at(-1)?.value;

            expect(fakeVscode.window.tabGroups.close).toHaveBeenCalledWith([onLink, onTarget], true);
        });

        test('a failure to open the document after the replace is not reported as a failed decompile', async () => {
            const { Commands } = loadCommands();
            const inputPath = path.join(tmpDir, 'noopen.bbj');
            fs.writeFileSync(inputPath, TOKENIZED_PROGRAM);
            fakeBbjlstWrites('source\n');
            fakeVscode.workspace.openTextDocument.mockRejectedValueOnce(new Error('Could NOT open editor for "file:///x".'));

            Commands.decompileReplace({ fsPath: inputPath });
            await fakeVscode.window.withProgress.mock.results.at(-1)?.value;

            expect(fs.readFileSync(inputPath, 'utf-8')).toBe('source\n');
            expect(fakeVscode.window.showErrorMessage).toHaveBeenCalledTimes(1);
            expect(fakeVscode.window.showErrorMessage).toHaveBeenCalledWith(
                'Decompiled "noopen.bbj", but could not open it: Could NOT open editor for "file:///x". Close the tab and open the file again.'
            );
        });

        test('a failure to close the tab does not stop the document from being opened', async () => {
            const { Commands } = loadCommands();
            const inputPath = path.join(tmpDir, 'noclose.bbj');
            fs.writeFileSync(inputPath, TOKENIZED_PROGRAM);
            fakeBbjlstWrites('source\n');
            fakeVscode.window.tabGroups.all = [{ viewColumn: 1, tabs: [fileTab(inputPath)] }];
            fakeVscode.window.tabGroups.close.mockRejectedValueOnce(new Error('close boom'));

            Commands.decompileReplace({ fsPath: inputPath });
            await fakeVscode.window.withProgress.mock.results.at(-1)?.value;

            expect(fakeVscode.window.showErrorMessage).not.toHaveBeenCalled();
            expect(fakeVscode.workspace.openTextDocument).toHaveBeenCalledTimes(1);
        });

        test('decompileReadonly closes no tab, because the original stays untouched', async () => {
            const { Commands } = loadCommands();
            const inputPath = path.join(tmpDir, 'ro.bbj');
            fs.writeFileSync(inputPath, TOKENIZED_PROGRAM);
            fakeBbjlstWrites('source\n');
            fakeVscode.window.tabGroups.all = [{ viewColumn: 1, tabs: [fileTab(inputPath)] }];

            Commands.decompileReadonly({ fsPath: inputPath });
            await fakeVscode.window.withProgress.mock.results.at(-1)?.value;

            expect(fakeVscode.window.tabGroups.close).not.toHaveBeenCalled();
        });
    });

    test('decompileReadonly of a.pub opens <private dir>/a.bbj holding the listing, keeps the directory and leaves the original unchanged', async () => {
        const { Commands } = loadCommands();
        const inputPath = path.join(tmpDir, 'a.pub');
        fs.writeFileSync(inputPath, TOKENIZED_PROGRAM);
        const listing = 'read-only listing\n';
        fakeBbjlstWrites(listing);

        Commands.decompileReadonly({ fsPath: inputPath });
        await fakeVscode.window.withProgress.mock.results.at(-1)?.value;

        expect(fakeVscode.window.showErrorMessage).not.toHaveBeenCalled();
        const [uri] = fakeVscode.workspace.openTextDocument.mock.calls.at(-1) ?? [];
        const openedPath = (uri as { fsPath?: string } | undefined)?.fsPath ?? '';
        expect(path.basename(path.dirname(openedPath))).toMatch(/^bbj-decompiled-/);
        expect(path.basename(openedPath)).toBe('a.bbj');
        expect(fs.readFileSync(openedPath, 'utf-8')).toBe(listing);
        expect(decompileTempDirs()).toEqual([path.basename(path.dirname(openedPath))]);
        expect(fs.readFileSync(inputPath, 'utf-8')).toBe(TOKENIZED_PROGRAM);
        expect(fs.readdirSync(tmpDir)).toEqual(['a.pub']);
    });
});

describe('Commands.cjs openEnterpriseManager / openPropertiesFile', () => {
    let homeDir: string;

    beforeEach(() => {
        resetCommandsHarness();
        homeDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bbj-cjs-home-'));
        fs.mkdirSync(path.join(homeDir, 'cfg'), { recursive: true });
        fs.writeFileSync(
            path.join(homeDir, 'cfg', 'BBj.properties'),
            'com.basis.jetty.host=localhost\ncom.basis.jetty.port=8888\n'
        );
        setFakeSettings({ bbj: { home: homeDir, classpath: '' }, 'bbj.web': { apps: {}, AutoSaveUponRun: false } });
    });

    afterEach(() => {
        fs.rmSync(homeDir, { recursive: true, force: true });
    });

    test('openEnterpriseManager opens the EM URL built from BBj.properties', () => {
        const { Commands } = loadCommands();

        Commands.openEnterpriseManager();

        expect(fakeVscode.commands.executeCommand).toHaveBeenCalledTimes(1);
        const [command, uri] = fakeVscode.commands.executeCommand.mock.calls[0];
        expect(command).toBe('vscode.open');
        expect((uri as { toString: () => string }).toString()).toBe('http://localhost:8888/bbjem/em');
    });

    test('openPropertiesFile opens <home>/cfg/BBj.properties', async () => {
        const { Commands } = loadCommands();

        await Commands.openPropertiesFile();

        expect(fakeVscode.workspace.openTextDocument).toHaveBeenCalledWith(`${homeDir}/cfg/BBj.properties`);
        expect(fakeVscode.window.showTextDocument).toHaveBeenCalledTimes(1);
    });

    test('openEnterpriseManager shows an error and never opens a URL when BBj.properties is missing', () => {
        fs.rmSync(path.join(homeDir, 'cfg', 'BBj.properties'));
        const { Commands } = loadCommands();

        Commands.openEnterpriseManager();

        expect(fakeVscode.commands.executeCommand).not.toHaveBeenCalled();
        expect(fakeVscode.window.showErrorMessage).toHaveBeenCalledWith(
            expect.stringContaining('Could not open Enterprise Manager')
        );
    });

    test('openEnterpriseManager shows an error and never opens a URL when host/port are missing from BBj.properties', () => {
        fs.writeFileSync(path.join(homeDir, 'cfg', 'BBj.properties'), 'some.other.key=value\n');
        const { Commands } = loadCommands();

        Commands.openEnterpriseManager();

        expect(fakeVscode.commands.executeCommand).not.toHaveBeenCalled();
        expect(fakeVscode.window.showErrorMessage).toHaveBeenCalledWith(
            expect.stringContaining('com.basis.jetty.host/com.basis.jetty.port')
        );
    });
});
