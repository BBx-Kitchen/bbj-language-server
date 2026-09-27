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

import { beforeEach, describe, expect, test } from 'vitest';
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
