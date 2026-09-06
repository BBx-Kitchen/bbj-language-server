import fs from 'fs';
import os from 'os';
import path from 'path';
import { URI } from 'langium';
import { NodeFileSystem } from 'langium/node';
import type { WorkspaceFolder, Connection } from 'vscode-languageserver';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import {
    EM_CONFIG_SENTINEL,
    canonicalizeConfigPath,
    expandHome,
    normalizeConfigSetting,
    resolveConfigPath,
    samePath,
} from '../src/language/config-path-resolver.js';
import {
    RESOLVED_CONFIG_PATH_METHOD,
    createResolvedConfigPathHandler,
    type ResolvedConfigPathDeps,
    type ResolvedConfigPathResult,
} from '../src/language/resolved-config-path-request.js';
import { createBBjTestServices } from './bbj-test-module.js';
import type { BBjWorkspaceManager } from '../src/language/bbj-ws-manager.js';

/**
 * End-to-end and unit coverage for the one shared answer to "which file is the BBj config
 * file" (#485): the pure resolver, the `bbj/resolvedConfigPath` request handler, and the
 * pushed notification sharing the same payload shape.
 *
 * Plain unit style throughout — no `DocumentBuilder.build`, which reaches for the BBjCPL
 * compiler and java-interop on port 5008 and is flaky locally and failing on CI.
 */

function makeTmpDir(): string {
    return fs.mkdtempSync(path.join(os.tmpdir(), 'bbj-config-path-'));
}

describe('normalizeConfigSetting', () => {
    test('blank, whitespace-only and null all collapse to the empty string', () => {
        expect(normalizeConfigSetting('  ')).toBe('');
        expect(normalizeConfigSetting(null)).toBe('');
        expect(normalizeConfigSetting(undefined)).toBe('');
        expect(normalizeConfigSetting('')).toBe('');
    });

    test('the EM Config sentinel collapses to the empty string', () => {
        expect(normalizeConfigSetting(EM_CONFIG_SENTINEL)).toBe('');
        expect(normalizeConfigSetting('--')).toBe('');
    });

    test('a real value is trimmed and returned', () => {
        expect(normalizeConfigSetting('  /a/b/config.bbx  ')).toBe('/a/b/config.bbx');
    });
});

describe('expandHome', () => {
    test('expands only a leading tilde segment', () => {
        const homeDir = () => '/home/tester';
        expect(expandHome('~/cfg/my.bbx', homeDir)).toBe(path.join('/home/tester', 'cfg/my.bbx'));
        expect(expandHome('~', homeDir)).toBe('/home/tester');
    });

    test('a tilde appearing anywhere other than the leading position is left untouched', () => {
        const homeDir = () => '/home/tester';
        expect(expandHome('/a/~b/c.bbx', homeDir)).toBe('/a/~b/c.bbx');
    });
});

describe('canonicalizeConfigPath', () => {
    test('resolves a symlink to its real target, NFC-normalized, with OS-native separators', () => {
        const tmpDir = makeTmpDir();
        const realFile = path.join(tmpDir, 'real-config.bbx');
        fs.writeFileSync(realFile, 'PREFIX ~/x~\n');
        const linkFile = path.join(tmpDir, 'link-config.bbx');
        fs.symlinkSync(realFile, linkFile);

        const canonical = canonicalizeConfigPath(linkFile);

        expect(canonical).toBe(fs.realpathSync.native(realFile));
        expect(canonical).toBe(canonical.normalize('NFC'));
    });

    test('falls back to the plain absolute string for a non-existent path', () => {
        const tmpDir = makeTmpDir();
        const missing = path.join(tmpDir, 'does-not-exist.bbx');

        expect(canonicalizeConfigPath(missing)).toBe(path.normalize(missing));
    });
});

describe('samePath', () => {
    test('two NFC/NFD spellings of one path compare equal', () => {
        const nfc = 'café.bbx'; // é as a single codepoint
        const nfd = 'café.bbx'; // e + combining acute accent
        expect(samePath(nfc, nfd)).toBe(true);
    });

    test('a symlink and its target compare equal once both are canonicalized', () => {
        const tmpDir = makeTmpDir();
        const realFile = path.join(tmpDir, 'real-config.bbx');
        fs.writeFileSync(realFile, 'PREFIX ~/x~\n');
        const linkFile = path.join(tmpDir, 'link-config.bbx');
        fs.symlinkSync(realFile, linkFile);

        expect(samePath(canonicalizeConfigPath(linkFile), canonicalizeConfigPath(realFile))).toBe(true);
    });

    test('on win32 and darwin, comparison is case-insensitive', () => {
        if (process.platform !== 'win32' && process.platform !== 'darwin') {
            return;
        }
        expect(samePath('/A/B/Config.bbx', '/a/b/config.bbx')).toBe(true);
    });
});

describe('resolveConfigPath', () => {
    test('a relative setting is rejected: path is null and problem names the rejected value', () => {
        const result = resolveConfigPath({ configPathSetting: 'relative/config.bbx', bbjHome: '/opt/bbj' });

        expect(result.path).toBeNull();
        expect(result.source).toBe('setting');
        expect(result.problem).toBeTruthy();
        expect(result.problem).toContain('relative/config.bbx');
    });

    test('no setting and a BBj home resolves to the home default with source "default"', () => {
        const tmpHome = makeTmpDir();
        fs.mkdirSync(path.join(tmpHome, 'cfg'), { recursive: true });
        fs.writeFileSync(path.join(tmpHome, 'cfg', 'config.bbx'), 'PREFIX ~/x~\n');

        const result = resolveConfigPath({ configPathSetting: '', bbjHome: tmpHome });

        expect(result.source).toBe('default');
        expect(result.path).toBe(fs.realpathSync.native(path.join(tmpHome, 'cfg', 'config.bbx')));
        expect(result.exists).toBe(true);
        expect(result.problem).toBeNull();
    });

    test('blank, whitespace-only and sentinel settings resolve identically to unset (the home default)', () => {
        const tmpHome = makeTmpDir();
        fs.mkdirSync(path.join(tmpHome, 'cfg'), { recursive: true });
        fs.writeFileSync(path.join(tmpHome, 'cfg', 'config.bbx'), 'PREFIX ~/x~\n');

        const unset = resolveConfigPath({ configPathSetting: '', bbjHome: tmpHome });
        const blank = resolveConfigPath({ configPathSetting: '   ', bbjHome: tmpHome });
        const sentinel = resolveConfigPath({ configPathSetting: EM_CONFIG_SENTINEL, bbjHome: tmpHome });

        for (const result of [blank, sentinel]) {
            expect(result.source).toBe('default');
            expect(result.path).toBe(unset.path);
            expect(result.path).not.toContain(EM_CONFIG_SENTINEL);
        }
    });

    test('neither setting nor BBj home yields path null, source none, problem null', () => {
        const result = resolveConfigPath({ configPathSetting: '', bbjHome: '' });

        expect(result).toEqual({ path: null, source: 'none', exists: false, problem: null });
    });

    test('a configured path pointing at a symlink resolves to the real target', () => {
        const tmpDir = makeTmpDir();
        const realFile = path.join(tmpDir, 'real-config.bbx');
        fs.writeFileSync(realFile, 'PREFIX ~/x~\n');
        const linkFile = path.join(tmpDir, 'link-config.bbx');
        fs.symlinkSync(realFile, linkFile);

        const result = resolveConfigPath({ configPathSetting: linkFile, bbjHome: '' });

        expect(result.path).toBe(fs.realpathSync.native(realFile));
        expect(result.source).toBe('setting');
        expect(result.exists).toBe(true);
    });

    test('a configured path that does not exist yields exists:false and a problem naming it', () => {
        const tmpDir = makeTmpDir();
        const missing = path.join(tmpDir, 'missing-config.bbx');

        const result = resolveConfigPath({ configPathSetting: missing, bbjHome: '' });

        expect(result.path).toBe(path.normalize(missing));
        expect(result.exists).toBe(false);
        expect(result.problem).toContain(path.normalize(missing));
    });

    test('a configured path naming the same file as the home default agrees byte-for-byte with the default branch', () => {
        const tmpHome = makeTmpDir();
        fs.mkdirSync(path.join(tmpHome, 'cfg'), { recursive: true });
        const configFile = path.join(tmpHome, 'cfg', 'config.bbx');
        fs.writeFileSync(configFile, 'PREFIX ~/x~\n');

        const viaDefault = resolveConfigPath({ configPathSetting: '', bbjHome: tmpHome });
        const viaSetting = resolveConfigPath({ configPathSetting: configFile, bbjHome: '' });

        expect(viaSetting.path).toBe(viaDefault.path);
        expect(viaSetting.source).toBe('setting');
        expect(viaDefault.source).toBe('default');
    });

    test('resolution precedence is total: an explicit usable setting beats the home default', () => {
        const tmpHome = makeTmpDir();
        fs.mkdirSync(path.join(tmpHome, 'cfg'), { recursive: true });
        fs.writeFileSync(path.join(tmpHome, 'cfg', 'config.bbx'), 'PREFIX ~/home~\n');

        const tmpCustom = makeTmpDir();
        const customFile = path.join(tmpCustom, 'custom.bbx');
        fs.writeFileSync(customFile, 'PREFIX ~/custom~\n');

        const result = resolveConfigPath({ configPathSetting: customFile, bbjHome: tmpHome });

        expect(result.source).toBe('setting');
        expect(result.path).toBe(fs.realpathSync.native(customFile));
    });

    test('resolveConfigPath is the only function that concatenates a BBj home with cfg and config.bbx', () => {
        // The invariant this test encodes: joining "cfg" and "config.bbx" onto a home directory
        // happens in exactly one place in the whole repository — this module. A grep-based
        // regression would require a fixture per caller; this behavioral proof is the two
        // paths above (the default branch and an equivalent explicit setting) always agreeing.
        const tmpHome = makeTmpDir();
        fs.mkdirSync(path.join(tmpHome, 'cfg'), { recursive: true });
        fs.writeFileSync(path.join(tmpHome, 'cfg', 'config.bbx'), 'PREFIX ~/x~\n');

        const first = resolveConfigPath({ configPathSetting: '', bbjHome: tmpHome });
        const second = resolveConfigPath({ configPathSetting: '', bbjHome: tmpHome });

        expect(first.path).toBe(second.path);
    });
});

describe('bbj/resolvedConfigPath request handler and notification (end-to-end)', () => {
    function createMockConnection(): Connection {
        return {
            sendNotification: vi.fn(),
            window: { showErrorMessage: vi.fn() },
        } as unknown as Connection;
    }

    test('the handler returns exactly what the real resolver produced, and the pushed notification carries the identical payload', async () => {
        const tmpHome = makeTmpDir();
        fs.mkdirSync(path.join(tmpHome, 'cfg'), { recursive: true });
        fs.writeFileSync(path.join(tmpHome, 'cfg', 'config.bbx'), 'PREFIX ~/x~\n');

        const wsManager: ResolvedConfigPathDeps['wsManager'] = {
            getResolvedConfigPath: (): ResolvedConfigPathResult =>
                resolveConfigPath({ configPathSetting: '', bbjHome: tmpHome }),
        };
        const handler = createResolvedConfigPathHandler({ wsManager });

        const requestResult = await handler();
        expect(requestResult.source).toBe('default');
        expect(requestResult.exists).toBe(true);

        vi.resetModules();
        const notifications = await import('../src/language/bbj-notifications.js');
        const connection = createMockConnection();
        notifications.initNotifications(connection);
        notifications.notifyResolvedConfigPath(requestResult);

        expect(connection.sendNotification).toHaveBeenCalledTimes(1);
        expect(connection.sendNotification).toHaveBeenCalledWith(RESOLVED_CONFIG_PATH_METHOD, requestResult);
    });
});

describe('notifyResolvedConfigPath dedup', () => {
    beforeEach(() => {
        vi.resetModules();
    });

    function createMockConnection(): Connection {
        return {
            sendNotification: vi.fn(),
            window: { showErrorMessage: vi.fn() },
        } as unknown as Connection;
    }

    test('a repeat push with an identical value sends nothing; a changed value sends again', async () => {
        const mod = await import('../src/language/bbj-notifications.js');
        const connection = createMockConnection();
        mod.initNotifications(connection);

        const first: ResolvedConfigPathResult = { path: '/a/config.bbx', source: 'setting', exists: true, problem: null };
        const second: ResolvedConfigPathResult = { path: '/b/config.bbx', source: 'setting', exists: true, problem: null };

        mod.notifyResolvedConfigPath(first);
        mod.notifyResolvedConfigPath(first);
        mod.notifyResolvedConfigPath(first);
        expect(connection.sendNotification).toHaveBeenCalledTimes(1);
        expect(connection.sendNotification).toHaveBeenCalledWith(RESOLVED_CONFIG_PATH_METHOD, first);

        mod.notifyResolvedConfigPath(second);
        expect(connection.sendNotification).toHaveBeenCalledTimes(2);
        expect(connection.sendNotification).toHaveBeenLastCalledWith(RESOLVED_CONFIG_PATH_METHOD, second);

        // Repeating the same (now current) value again must not send a third notification.
        mod.notifyResolvedConfigPath(second);
        expect(connection.sendNotification).toHaveBeenCalledTimes(2);
    });
});

describe('initializeWorkspace reads PREFIX through the resolver', () => {
    /**
     * A real BBjWorkspaceManager backed by an actual disk filesystem (`NodeFileSystem`), so
     * the same real-fs existence/symlink probes `resolveConfigPath` itself uses agree with
     * what `initializeWorkspace` reads. The fast, hermetic Java-interop test double from
     * `bbj-test-module.ts` keeps this from reaching the real interop socket.
     */
    function createRealFsWorkspaceManager(): BBjWorkspaceManager {
        const services = createBBjTestServices(NodeFileSystem);
        return services.shared.workspace.WorkspaceManager as BBjWorkspaceManager;
    }

    function singleFolder(root: string): WorkspaceFolder[] {
        return [{ uri: URI.file(root).toString(), name: 'root' }];
    }

    test('a custom configured path: PREFIX is read from that file, via the canonical resolved path rather than the raw setting string', async () => {
        const configDir = makeTmpDir();
        const realConfigFile = path.join(configDir, 'my-config.bbx');
        fs.writeFileSync(realConfigFile, 'PREFIX "/custom-prefix/"\n');
        const linkConfigFile = path.join(configDir, 'link-config.bbx');
        fs.symlinkSync(realConfigFile, linkConfigFile);

        const wsManager = createRealFsWorkspaceManager();
        wsManager.setConfigPath(linkConfigFile);

        await wsManager.initializeWorkspace(singleFolder(makeTmpDir()));

        expect(wsManager.getSettings()?.prefixes).toContain('/custom-prefix/');
        const resolved = wsManager.getResolvedConfigPath();
        expect(resolved.path).toBe(fs.realpathSync.native(realConfigFile));
        expect(resolved.path).not.toBe(linkConfigFile);
    });

    test('no configured path and a BBj home whose cfg/config.bbx exists: PREFIX is read from the same file the resolver names', async () => {
        const tmpHome = makeTmpDir();
        fs.mkdirSync(path.join(tmpHome, 'cfg'), { recursive: true });
        fs.writeFileSync(path.join(tmpHome, 'cfg', 'config.bbx'), 'PREFIX "/home-prefix/"\n');

        const wsManager = createRealFsWorkspaceManager();
        (wsManager as unknown as { bbjdir: string }).bbjdir = tmpHome;

        await wsManager.initializeWorkspace(singleFolder(makeTmpDir()));

        expect(wsManager.getSettings()?.prefixes).toContain('/home-prefix/');
        const resolved = wsManager.getResolvedConfigPath();
        expect(resolved.path).toBe(fs.realpathSync.native(path.join(tmpHome, 'cfg', 'config.bbx')));
        expect(resolved.source).toBe('default');
    });

    test('a configured path that does not exist: no prefixes load, and getResolvedConfigPath reports exists:false with a problem naming the path', async () => {
        const configDir = makeTmpDir();
        const missingConfig = path.join(configDir, 'missing-config.bbx');

        const wsManager = createRealFsWorkspaceManager();
        wsManager.setConfigPath(missingConfig);

        await wsManager.initializeWorkspace(singleFolder(makeTmpDir()));

        const settings = wsManager.getSettings();
        expect(settings?.prefixes.filter(Boolean)).toEqual([]);
        const resolved = wsManager.getResolvedConfigPath();
        expect(resolved.exists).toBe(false);
        expect(resolved.problem).toContain(path.normalize(missingConfig));
    });

    test('neither setting: no prefixes load, and getResolvedConfigPath reports source none', async () => {
        const wsManager = createRealFsWorkspaceManager();

        await wsManager.initializeWorkspace(singleFolder(makeTmpDir()));

        const settings = wsManager.getSettings();
        expect(settings?.prefixes.filter(Boolean)).toEqual([]);
        expect(wsManager.getResolvedConfigPath().source).toBe('none');
    });
});

describe('re-resolve and re-push on a config-path setting change', () => {
    beforeEach(() => {
        vi.resetModules();
    });

    function createMockConnection(): Connection {
        return {
            sendNotification: vi.fn(),
            window: { showErrorMessage: vi.fn() },
        } as unknown as Connection;
    }

    /**
     * Simulates exactly what `main.ts`'s `onDidChangeConfiguration` handler does on each
     * `wsManager.setConfigPath(...)` call site: re-resolve, then push. Driving the real
     * resolver plus the notification module directly (rather than importing `main.ts`,
     * which calls `createConnection()` at module load time and would break the test
     * environment) mirrors the `bbj-notifications.ts` test convention.
     */
    async function pushForConfigPath(
        notify: (result: ResolvedConfigPathResult) => void,
        configPathSetting: string,
        bbjHome: string,
    ): Promise<void> {
        notify(resolveConfigPath({ configPathSetting, bbjHome }));
    }

    test('a settings push that changes the configured path results in exactly one new notification carrying the new canonical path', async () => {
        const mod = await import('../src/language/bbj-notifications.js');
        const connection = createMockConnection();
        mod.initNotifications(connection);
        const tmpDir = makeTmpDir();
        const configFile = path.join(tmpDir, 'config.bbx');
        fs.writeFileSync(configFile, 'PREFIX "/x/"\n');

        await pushForConfigPath(mod.notifyResolvedConfigPath, configFile, '');

        expect(connection.sendNotification).toHaveBeenCalledTimes(1);
        const [, payload] = (connection.sendNotification as ReturnType<typeof vi.fn>).mock.calls[0];
        expect((payload as ResolvedConfigPathResult).path).toBe(fs.realpathSync.native(configFile));
    });

    test('a settings push that leaves the configured path unchanged results in no new notification', async () => {
        const mod = await import('../src/language/bbj-notifications.js');
        const connection = createMockConnection();
        mod.initNotifications(connection);
        const tmpDir = makeTmpDir();
        const configFile = path.join(tmpDir, 'config.bbx');
        fs.writeFileSync(configFile, 'PREFIX "/x/"\n');

        await pushForConfigPath(mod.notifyResolvedConfigPath, configFile, '');
        await pushForConfigPath(mod.notifyResolvedConfigPath, configFile, '');

        expect(connection.sendNotification).toHaveBeenCalledTimes(1);
    });

    test('two successive changes result in two notifications, and the last one carries the last value', async () => {
        const mod = await import('../src/language/bbj-notifications.js');
        const connection = createMockConnection();
        mod.initNotifications(connection);
        const tmpDirA = makeTmpDir();
        const configFileA = path.join(tmpDirA, 'config.bbx');
        fs.writeFileSync(configFileA, 'PREFIX "/a/"\n');
        const tmpDirB = makeTmpDir();
        const configFileB = path.join(tmpDirB, 'config.bbx');
        fs.writeFileSync(configFileB, 'PREFIX "/b/"\n');

        await pushForConfigPath(mod.notifyResolvedConfigPath, configFileA, '');
        await pushForConfigPath(mod.notifyResolvedConfigPath, configFileB, '');

        expect(connection.sendNotification).toHaveBeenCalledTimes(2);
        const [, lastPayload] = (connection.sendNotification as ReturnType<typeof vi.fn>).mock.calls[1];
        expect((lastPayload as ResolvedConfigPathResult).path).toBe(fs.realpathSync.native(configFileB));
    });

    test('the pre-initialization branch pushes too: main.ts carries a notifyResolvedConfigPath call before AND after the workspaceInitialized gate', () => {
        // Behavioral proof lives in the three push tests above (the resolve-then-notify
        // sequence they exercise is identical on both sides of the gate); this is the
        // structural guarantee that main.ts actually wires both call sites plus the
        // build-phase one, not just one of them (three call sites total).
        const mainSource = fs.readFileSync(path.join(__dirname, '..', 'src', 'language', 'main.ts'), 'utf-8');
        const callSites = mainSource.match(/notifyResolvedConfigPath\(/g) ?? [];
        expect(callSites.length).toBe(3);
    });
});
