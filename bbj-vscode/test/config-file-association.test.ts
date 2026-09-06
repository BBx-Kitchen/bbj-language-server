import { beforeEach, describe, expect, test, vi } from 'vitest';

/**
 * Regression coverage for the VS Code host's config-file discoverability behavior (#485):
 * the warm cache the host keeps for the server-pushed resolved config path, and the dynamic
 * `bbx-config` language association that makes an arbitrarily-named/located config file get
 * config-file highlighting, the SETOPTS lens, and the SETOPTS composer.
 */

vi.mock('vscode', () => {
    return {
        workspace: {
            getConfiguration: vi.fn(() => ({
                get: vi.fn((_key: string, def?: unknown) => def),
            })),
        },
    };
});

import * as vscode from 'vscode';
import {
    getActiveConfigPath,
    getResolvedConfigPath,
    isActiveConfigPath,
    resetConfigPathCacheForTests,
    setResolvedConfigPath,
    shouldWarnOnce,
} from '../src/config-path-cache.js';
import type { ResolvedConfigPath } from '../src/language/config-path-resolver.js';

/** Point the mocked `bbj.configPath` workspace setting at `value` (or unset when `null`). */
function mockConfigPathSetting(value: string | null): void {
    (vscode.workspace.getConfiguration as ReturnType<typeof vi.fn>).mockReturnValue({
        get: vi.fn((_key: string, def?: unknown) => (value === null ? def : value)),
    });
}

function pushedPath(overrides: Partial<ResolvedConfigPath> = {}): ResolvedConfigPath {
    return { path: '/home/user/cfg/config.bbx', source: 'default', exists: true, problem: null, ...overrides };
}

describe('config-path-cache', () => {
    beforeEach(() => {
        resetConfigPathCacheForTests();
        mockConfigPathSetting(null);
    });

    test('getActiveConfigPath returns the cached pushed path when one has arrived', () => {
        setResolvedConfigPath(pushedPath({ path: '/srv/custom/myconfig.bbx' }));
        expect(getActiveConfigPath()).toBe('/srv/custom/myconfig.bbx');
    });

    test('with no push yet and an explicit setting, getActiveConfigPath returns that setting canonicalized', () => {
        mockConfigPathSetting('/tmp/custom-config.bbx');
        expect(getActiveConfigPath()).toBe('/tmp/custom-config.bbx');
    });

    test('with no push yet and no explicit setting, getActiveConfigPath is undefined', () => {
        expect(getActiveConfigPath()).toBeUndefined();
    });

    test('a pushed payload whose path is null clears the cache back to the explicit-setting-only behavior', () => {
        mockConfigPathSetting('/tmp/custom-config.bbx');
        setResolvedConfigPath(pushedPath({ path: '/srv/custom/myconfig.bbx' }));
        expect(getActiveConfigPath()).toBe('/srv/custom/myconfig.bbx');

        setResolvedConfigPath({ path: null, source: 'none', exists: false, problem: null });
        expect(getActiveConfigPath()).toBe('/tmp/custom-config.bbx');
    });

    test('isActiveConfigPath is true for the active path and false for any other file', () => {
        setResolvedConfigPath(pushedPath({ path: '/srv/custom/myconfig.bbx' }));
        expect(isActiveConfigPath('/srv/custom/myconfig.bbx')).toBe(true);
        expect(isActiveConfigPath('/srv/custom/other.bbx')).toBe(false);
    });

    test('shouldWarnOnce returns true the first time for a path and false for every repeat', () => {
        expect(shouldWarnOnce('/srv/custom/myconfig.bbx')).toBe(true);
        expect(shouldWarnOnce('/srv/custom/myconfig.bbx')).toBe(false);
        expect(shouldWarnOnce('/srv/custom/myconfig.bbx')).toBe(false);
    });

    test('getResolvedConfigPath returns the last pushed payload, or undefined before any push', () => {
        expect(getResolvedConfigPath()).toBeUndefined();
        const payload = pushedPath();
        setResolvedConfigPath(payload);
        expect(getResolvedConfigPath()).toEqual(payload);
    });
});
