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

import { beforeEach, describe, expect, test, vi } from 'vitest';
import { NO_ACTIVE_BBJ_FILE_MESSAGE } from '../src/Commands/target-resolution.js';
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
