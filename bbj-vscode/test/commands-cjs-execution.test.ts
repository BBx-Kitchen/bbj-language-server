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
            'denumber',
            'decompileReplace',
            'decompileReadonly',
            'setOutputChannel',
        ]) {
            expect(typeof (Commands as Record<string, unknown>)[name]).toBe('function');
        }
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
        callback(new Error('boom'), '', 'stderr text');

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
        const appendLine = vi.fn();
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
        callback(new Error('boom'), '', '');

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
        const appendLine = vi.fn();
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

describe('Commands.cjs denumber / decompileReplace / decompileReadonly', () => {
    let tmpDir: string;

    beforeEach(() => {
        resetCommandsHarness();
        setFakeSettings(DEFAULT_TEST_SETTINGS);
        tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bbj-cjs-test-'));
    });

    afterEach(() => {
        fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    /** Fakes bbjlst by writing `<lastArg>.lst` next to whatever file was passed. */
    function fakeBbjlstWrites(content: string): void {
        fakeProcessRunner.runProcess.mockImplementation(async (argv: Argv) => {
            const target = argv.args.at(-1) as string;
            fs.writeFileSync(`${target}.lst`, content);
            return { stdout: '', stderr: '' };
        });
    }

    test('denumber rewrites the input file in place with the .lst content, then opens and shows it', async () => {
        const { Commands } = loadCommands();
        const inputPath = path.join(tmpDir, 'a.bbj');
        fs.writeFileSync(inputPath, 'plain text program\n');
        const lstContent = 'denumbered content\n';
        fakeBbjlstWrites(lstContent);

        Commands.denumber({ fsPath: inputPath });
        await fakeVscode.window.withProgress.mock.results.at(-1)?.value;

        expect(fs.readFileSync(inputPath, 'utf-8')).toBe(lstContent);
        const [uri] = fakeVscode.workspace.openTextDocument.mock.calls.at(-1) ?? [];
        expect((uri as { fsPath?: string } | undefined)?.fsPath).toBe(inputPath);
        expect(fakeVscode.window.showTextDocument).toHaveBeenCalledTimes(1);
    });

    test('decompileReplace produces the same in-place result as denumber, through the decompile target resolver', async () => {
        const { Commands } = loadCommands();
        const inputPath = path.join(tmpDir, 'b.bbj');
        fs.writeFileSync(inputPath, 'plain text program\n');
        const lstContent = 'decompiled content\n';
        fakeBbjlstWrites(lstContent);

        Commands.decompileReplace({ fsPath: inputPath });
        await fakeVscode.window.withProgress.mock.results.at(-1)?.value;

        expect(fs.readFileSync(inputPath, 'utf-8')).toBe(lstContent);
    });

    test('decompileReadonly leaves the original untouched and opens a .bbj file in a bbj-decompiled- temp dir as read-only', async () => {
        const { Commands } = loadCommands();
        const inputPath = path.join(tmpDir, 'c.bbj');
        const originalContent = 'original content, never rewritten\n';
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

    test('a decompile whose runProcess rejects shows an error starting "Failed to decompile"', async () => {
        const { Commands } = loadCommands();
        const inputPath = path.join(tmpDir, 'd.bbj');
        fs.writeFileSync(inputPath, 'plain text program\n');
        fakeProcessRunner.runProcess.mockRejectedValueOnce(new Error('decompile boom'));

        Commands.denumber({ fsPath: inputPath });
        await fakeVscode.window.withProgress.mock.results.at(-1)?.value;

        const [message] = fakeVscode.window.showErrorMessage.mock.calls[0];
        expect(message).toMatch(/^Failed to decompile/);
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
});
