import { beforeEach, describe, expect, test, vi } from 'vitest';

/**
 * Coverage for the VS Code client's Workspace Trust gate on `bbj.configPath` (issue #511):
 * a workspace-scoped value must never reach `initializationOptions`, the `bbj` settings push,
 * a `workspace/configuration` pull answer, or the client's own config-association fallback
 * while the workspace is untrusted — only the user-level value (or the default, `null`) does.
 *
 * The `vi.mock('vscode')`, `vi.mock('vscode-languageclient/node')` and module mocks below
 * follow the convention established in `extension-activation.test.ts`, extended with a
 * hoisted state object that drives `workspace.isTrusted`, the global/workspace `configPath`
 * values, and the rest of the `bbj` settings section.
 */

/** Reads a dotted key ('interop.host') out of a nested settings object, VS Code-style. */
function getByPath(obj: unknown, dottedKey: string, def: unknown): unknown {
    const parts = dottedKey.split('.');
    let cur: unknown = obj;
    for (const part of parts) {
        if (cur === null || typeof cur !== 'object' || !(part in (cur as Record<string, unknown>))) {
            return def;
        }
        cur = (cur as Record<string, unknown>)[part];
    }
    return cur === undefined ? def : cur;
}

const h = vi.hoisted(() => ({
    state: {
        isTrusted: false as boolean | undefined,
        globalConfigPath: undefined as string | null | undefined,
        workspaceConfigPath: undefined as string | null | undefined,
        bbjSection: {} as Record<string, unknown>,
    },
    capturedClientOptions: undefined as {
        initializationOptions?: Record<string, unknown> | (() => Record<string, unknown>);
        middleware?: {
            workspace?: {
                didChangeConfiguration?: (sections: string[] | undefined, next: (sections: string[] | undefined) => Promise<void>) => Promise<void>;
                configuration?: (params: { items: Array<{ section?: string }> }, token: unknown, next: (params: unknown, token: unknown) => unknown) => unknown;
            };
        };
    } | undefined,
    sendNotificationMock: vi.fn(() => Promise.resolve()),
    startMock: vi.fn(() => Promise.resolve()),
    stopMock: vi.fn(() => Promise.resolve()),
    onNotificationMock: vi.fn(() => ({ dispose: vi.fn() })),
    registeredCommandIds: new Set<string>(),
    grantListeners: [] as Array<() => unknown>,
}));

/** Records a listener passed to `workspace.onDidGrantWorkspaceTrust` and returns a disposable. */
function onDidGrantWorkspaceTrust(listener: () => unknown): { dispose: () => void } {
    h.grantListeners.push(listener);
    return { dispose: () => { h.grantListeners = h.grantListeners.filter(l => l !== listener); } };
}

/** Fires every currently-registered trust-grant listener, as VS Code would on trust being granted. */
function fireWorkspaceTrustGranted(): void {
    for (const listener of [...h.grantListeners]) {
        listener();
    }
}

/** The initialization options as the language client resolves them when it starts. */
function initOptions(): Record<string, unknown> | undefined {
    const options = h.capturedClientOptions?.initializationOptions;
    return typeof options === 'function' ? options() : options;
}

/** Makes one BBj document count as open, which is what starts the language client. */
function openBbjDocument(): void {
    (vscode.workspace.textDocuments as unknown[]).push({ languageId: 'bbj', uri: { scheme: 'untitled', fsPath: '' } });
}

/** Reset every piece of hoisted mock state between tests. */
function resetState(): void {
    h.state.isTrusted = false;
    h.state.globalConfigPath = undefined;
    h.state.workspaceConfigPath = undefined;
    h.state.bbjSection = {};
    h.capturedClientOptions = undefined;
    h.sendNotificationMock.mockClear();
    h.sendNotificationMock.mockImplementation(() => Promise.resolve());
    h.startMock.mockClear();
    h.startMock.mockImplementation(() => Promise.resolve());
    h.stopMock.mockClear();
    h.onNotificationMock.mockClear();
    h.registeredCommandIds.clear();
    h.grantListeners = [];
    (vscode.workspace.textDocuments as unknown[]).length = 0;
}

/** Merges the workspace-scoped and user-level `configPath`, mirroring how VS Code merges scopes. */
function mergedConfigPath(def: string | null): string | null {
    if (h.state.workspaceConfigPath !== undefined) {
        return h.state.workspaceConfigPath;
    }
    if (h.state.globalConfigPath !== undefined) {
        return h.state.globalConfigPath;
    }
    return def;
}

function bbjConfiguration() {
    return {
        get: vi.fn((key: string, def?: unknown) => {
            if (key === 'configPath') {
                return mergedConfigPath((def ?? null) as string | null);
            }
            return getByPath(h.state.bbjSection, key, def);
        }),
        inspect: vi.fn((key: string) => {
            if (key === 'configPath') {
                return {
                    key: 'bbj.configPath',
                    defaultValue: null,
                    globalValue: h.state.globalConfigPath,
                    workspaceValue: h.state.workspaceConfigPath,
                };
            }
            return undefined;
        }),
        formatter: {},
    };
}

vi.mock('vscode', () => {
    const disposable = () => ({ dispose: vi.fn() });
    return {
        window: {
            showErrorMessage: vi.fn(),
            showWarningMessage: vi.fn(),
            showInformationMessage: vi.fn(),
            showInputBox: vi.fn(),
            showQuickPick: vi.fn(),
            showTextDocument: vi.fn(),
            createQuickPick: vi.fn(),
            createStatusBarItem: vi.fn(() => ({ text: '', tooltip: '', show: vi.fn(), hide: vi.fn(), dispose: vi.fn() })),
            createOutputChannel: vi.fn(() => ({ appendLine: vi.fn(), dispose: vi.fn() })),
            tabGroups: { all: [], onDidChangeTabs: vi.fn(() => disposable()) },
            onDidChangeActiveTextEditor: vi.fn(() => disposable()),
            activeTextEditor: undefined,
        },
        commands: {
            registerCommand: vi.fn((id: string, _handler: unknown) => {
                if (h.registeredCommandIds.has(id)) {
                    throw new Error(`command '${id}' already exists`);
                }
                h.registeredCommandIds.add(id);
                return { dispose: () => { h.registeredCommandIds.delete(id); } };
            }),
            executeCommand: vi.fn(),
        },
        languages: {
            registerDocumentFormattingEditProvider: vi.fn(() => disposable()),
            registerCodeActionsProvider: vi.fn(() => disposable()),
            registerCodeLensProvider: vi.fn(() => disposable()),
            onDidChangeDiagnostics: vi.fn(() => disposable()),
            getDiagnostics: vi.fn(() => []),
            setTextDocumentLanguage: vi.fn(),
        },
        workspace: {
            createFileSystemWatcher: vi.fn(() => disposable()),
            getConfiguration: vi.fn((section?: string) => {
                if (section === 'bbj') {
                    return bbjConfiguration();
                }
                return {
                    get: vi.fn((key: string, def?: unknown) => {
                        if (key === 'bbj') {
                            return { ...h.state.bbjSection, configPath: mergedConfigPath(null) };
                        }
                        return def;
                    }),
                    inspect: vi.fn(() => undefined),
                };
            }),
            textDocuments: [] as unknown[],
            onDidOpenTextDocument: vi.fn(() => disposable()),
            onDidChangeTextDocument: vi.fn(() => disposable()),
            onDidCloseTextDocument: vi.fn(() => disposable()),
            onDidChangeConfiguration: vi.fn(() => disposable()),
            workspaceFolders: undefined,
            get isTrusted() { return h.state.isTrusted; },
            onDidGrantWorkspaceTrust: vi.fn((listener: () => unknown) => onDidGrantWorkspaceTrust(listener)),
        },
        StatusBarAlignment: { Left: 1, Right: 2 },
        DiagnosticSeverity: { Error: 0, Warning: 1, Information: 2, Hint: 3 },
        ConfigurationTarget: { Global: 1, Workspace: 2, WorkspaceFolder: 3 },
        QuickPickItemKind: { Separator: -1 },
        CodeActionKind: { RefactorRewrite: { value: 'refactor.rewrite' } },
        Uri: class { },
    };
});

vi.mock('vscode-languageclient/node', () => {
    class LanguageClient {
        outputChannel = { appendLine: vi.fn() };
        start = h.startMock;
        stop = h.stopMock;
        needsStop = () => h.startMock.mock.calls.length > 0;
        onNotification = h.onNotificationMock;
        sendNotification = h.sendNotificationMock;
        constructor(_id: string, _name: string, _serverOptions: unknown, clientOptions: Record<string, unknown>) {
            h.capturedClientOptions = clientOptions as typeof h.capturedClientOptions;
        }
    }
    return {
        LanguageClient,
        TransportKind: { ipc: 1 },
        DidChangeConfigurationNotification: { type: { method: 'workspace/didChangeConfiguration' } },
    };
});

vi.mock('../src/language/lib/fs-provider.js', () => ({
    BBjLibraryFileSystemProvider: { register: vi.fn() },
}));
vi.mock('../src/msgbox-composer-ui.js', () => ({ registerMsgboxComposer: vi.fn() }));
vi.mock('../src/addwindow-composer-ui.js', () => ({ registerAddWindowComposer: vi.fn() }));
vi.mock('../src/addchildwindow-composer-ui.js', () => ({ registerAddChildWindowComposer: vi.fn() }));
vi.mock('../src/composer-lens-command.js', () => ({ registerComposerLensCommand: vi.fn() }));
vi.mock('../src/cvs-composer-ui.js', () => ({ registerCvsComposer: vi.fn() }));
vi.mock('../src/setopts-composer-ui.js', () => ({ registerSetOptsComposer: vi.fn() }));
vi.mock('../src/Commands/Commands.cjs', () => ({
    default: {
        openConfigFile: vi.fn(),
        openPropertiesFile: vi.fn(),
        openEnterpriseManager: vi.fn(),
        run: vi.fn(),
        runBUI: vi.fn(),
        runDWC: vi.fn(),
        compile: vi.fn(),
        decompileReplace: vi.fn(),
        decompileReadonly: vi.fn(),
        setOutputChannel: vi.fn(),
    },
}));

import * as vscode from 'vscode';
import { DidChangeConfigurationNotification } from 'vscode-languageclient/node';
import { activate } from '../src/extension.js';
import { getActiveConfigPath, resetConfigPathCacheForTests } from '../src/config-path-cache.js';
import {
    createConfigPathTrustMiddleware,
    effectiveConfigPath,
    gatedBbjSettings,
    registerTrustGrantRepush,
    type TrustAwareWorkspace,
} from '../src/config-path-trust.js';

/** Fresh mock ExtensionContext — matches `extension-activation.test.ts`'s `makeContext`. */
function fakeContext(): Parameters<typeof activate>[0] {
    return {
        subscriptions: [],
        secrets: {},
        asAbsolutePath: (p: string) => p,
        extension: { packageJSON: { version: '0.0.0-test' } },
    } as unknown as Parameters<typeof activate>[0];
}

function disposeSubscriptions(context: Parameters<typeof activate>[0]): void {
    for (const sub of context.subscriptions as Array<{ dispose(): void }>) {
        sub.dispose();
    }
}

/** A directly-constructed `TrustAwareWorkspace` stub for unit-testing `effectiveConfigPath` in isolation. */
function stubWorkspace(opts: {
    isTrusted?: boolean;
    globalValue?: string | null;
    workspaceValue?: string | null;
    workspaceFolderValue?: string | null;
}): TrustAwareWorkspace {
    const merged = opts.workspaceFolderValue !== undefined
        ? opts.workspaceFolderValue
        : opts.workspaceValue !== undefined
            ? opts.workspaceValue
            : opts.globalValue !== undefined
                ? opts.globalValue
                : null;
    return {
        isTrusted: opts.isTrusted as boolean,
        getConfiguration: () => ({
            get: <T>(_key: string, def?: T): T => (merged === undefined ? (def as T) : (merged as unknown as T)),
            inspect: <T>(_key: string) => ({
                key: 'bbj.configPath',
                defaultValue: null as unknown as T,
                globalValue: opts.globalValue as unknown as T,
                workspaceValue: opts.workspaceValue as unknown as T,
                workspaceFolderValue: opts.workspaceFolderValue as unknown as T,
            }),
        }),
        onDidGrantWorkspaceTrust: () => ({ dispose: () => { } }),
    };
}

/**
 * A `TrustAwareWorkspace` stub for the push/pull middleware: `getConfiguration('bbj')`
 * answers `configPath` only; `getConfiguration()` (no section) answers `get('bbj')` with the
 * full section object and `get(<other name>)` with whatever `otherSections` carries.
 */
function stubGatedWorkspace(opts: {
    isTrusted: boolean;
    globalConfigPath?: string | null;
    workspaceConfigPath?: string | null;
    bbjSection?: Record<string, unknown>;
    otherSections?: Record<string, unknown>;
}): TrustAwareWorkspace {
    const merged = opts.workspaceConfigPath !== undefined
        ? opts.workspaceConfigPath
        : opts.globalConfigPath !== undefined
            ? opts.globalConfigPath
            : null;
    return {
        isTrusted: opts.isTrusted,
        getConfiguration: (section?: string) => {
            if (section === 'bbj') {
                return {
                    get: <T>(key: string, def?: T): T => (key === 'configPath' ? (merged as unknown as T) : (def as T)),
                    inspect: <T>(_key: string) => ({
                        key: 'bbj.configPath',
                        defaultValue: null as unknown as T,
                        globalValue: opts.globalConfigPath as unknown as T,
                        workspaceValue: opts.workspaceConfigPath as unknown as T,
                    }),
                };
            }
            return {
                get: <T>(key: string, def?: T): T => {
                    if (key === 'bbj') {
                        return { ...(opts.bbjSection ?? {}) } as unknown as T;
                    }
                    if (opts.otherSections && key in opts.otherSections) {
                        return opts.otherSections[key] as unknown as T;
                    }
                    return def as T;
                },
                inspect: <T>(_key: string): { key: string; globalValue?: T } | undefined => undefined,
            };
        },
        onDidGrantWorkspaceTrust: () => ({ dispose: () => { } }),
    };
}

describe('effectiveConfigPath', () => {
    test('untrusted workspace: ignores workspaceValue, returns globalValue', () => {
        const workspace = stubWorkspace({
            isTrusted: false,
            globalValue: '/home/user/cfg/config.bbx',
            workspaceValue: '/ws/evil/config.bbx',
        });
        expect(effectiveConfigPath(workspace)).toBe('/home/user/cfg/config.bbx');
    });

    test('untrusted workspace: only a workspaceValue set never surfaces, returns null', () => {
        const workspace = stubWorkspace({ isTrusted: false, workspaceValue: '/ws/evil/config.bbx' });
        expect(effectiveConfigPath(workspace)).toBeNull();
    });

    test('untrusted workspace: only a workspaceFolderValue set never surfaces, returns null', () => {
        const workspace = stubWorkspace({ isTrusted: false, workspaceFolderValue: '/ws/folder/config.bbx' });
        expect(effectiveConfigPath(workspace)).toBeNull();
    });

    test('untrusted workspace: no values at all returns null', () => {
        const workspace = stubWorkspace({ isTrusted: false });
        expect(effectiveConfigPath(workspace)).toBeNull();
    });

    test('a host reporting no trust state at all is treated as untrusted (fail closed)', () => {
        const workspace = stubWorkspace({
            isTrusted: undefined,
            globalValue: '/home/user/cfg/config.bbx',
            workspaceValue: '/ws/evil/config.bbx',
        });
        expect(effectiveConfigPath(workspace)).toBe('/home/user/cfg/config.bbx');
    });

    test('trusted workspace: returns get()\'s merged value (the workspace value when one is set)', () => {
        const workspace = stubWorkspace({
            isTrusted: true,
            globalValue: '/home/user/cfg/config.bbx',
            workspaceValue: '/ws/evil/config.bbx',
        });
        expect(effectiveConfigPath(workspace)).toBe('/ws/evil/config.bbx');
    });
});

describe('initializationOptions honour Workspace Trust for bbj.configPath (issue #511)', () => {
    beforeEach(() => {
        resetState();
    });

    test('an untrusted workspace hands initializationOptions.configPath only the user-level value', () => {
        h.state.isTrusted = false;
        h.state.globalConfigPath = '/home/user/cfg/config.bbx';
        h.state.workspaceConfigPath = '/ws/evil/config.bbx';

        const context = fakeContext();
        activate(context);

        expect(initOptions()?.configPath).toBe('/home/user/cfg/config.bbx');
        disposeSubscriptions(context);
    });

    test('a trusted workspace hands initializationOptions.configPath the merged (workspace) value', () => {
        h.state.isTrusted = true;
        h.state.globalConfigPath = '/home/user/cfg/config.bbx';
        h.state.workspaceConfigPath = '/ws/evil/config.bbx';

        const context = fakeContext();
        activate(context);

        expect(initOptions()?.configPath).toBe('/ws/evil/config.bbx');
        disposeSubscriptions(context);
    });

    test('initializationOptions.interopHost/interopPort carry whatever get() returns, with no client-side literal default', () => {
        h.state.isTrusted = true;
        h.state.bbjSection = {};

        const context = fakeContext();
        activate(context);

        expect(initOptions()?.interopHost).toBeUndefined();
        expect(initOptions()?.interopPort).toBeUndefined();
        disposeSubscriptions(context);
    });

    test('initializationOptions.interopHost/interopPort still carry a configured value through untouched', () => {
        h.state.isTrusted = true;
        h.state.bbjSection = { interop: { host: 'myhost', port: 6000 } };

        const context = fakeContext();
        activate(context);

        expect(initOptions()?.interopHost).toBe('myhost');
        expect(initOptions()?.interopPort).toBe(6000);
        disposeSubscriptions(context);
    });
});

describe('the bbj settings push and pull carry the gated configPath (issue #511)', () => {
    test('didChangeConfiguration(["bbj"], next): untrusted, sends the gated section once, never calls next', async () => {
        const workspace = stubGatedWorkspace({
            isTrusted: false,
            globalConfigPath: '/home/user/cfg/config.bbx',
            workspaceConfigPath: '/ws/evil/config.bbx',
            bbjSection: { home: '/opt/bbj', classpath: 'bbj_default' },
        });
        const send = vi.fn(() => Promise.resolve());
        const next = vi.fn(() => Promise.resolve());
        const middleware = createConfigPathTrustMiddleware(send, workspace);

        await middleware.didChangeConfiguration(['bbj'], next);

        expect(send).toHaveBeenCalledTimes(1);
        expect(send).toHaveBeenCalledWith({
            bbj: { home: '/opt/bbj', classpath: 'bbj_default', configPath: '/home/user/cfg/config.bbx' },
        });
        expect(next).not.toHaveBeenCalled();
    });

    test('didChangeConfiguration(["bbj"], next): trusted, sends the merged (workspace) configPath, other keys unchanged', async () => {
        const workspace = stubGatedWorkspace({
            isTrusted: true,
            globalConfigPath: '/home/user/cfg/config.bbx',
            workspaceConfigPath: '/ws/evil/config.bbx',
            bbjSection: { home: '/opt/bbj', classpath: 'bbj_default' },
        });
        const send = vi.fn(() => Promise.resolve());
        const next = vi.fn(() => Promise.resolve());
        const middleware = createConfigPathTrustMiddleware(send, workspace);

        await middleware.didChangeConfiguration(['bbj'], next);

        expect(send).toHaveBeenCalledWith({
            bbj: { home: '/opt/bbj', classpath: 'bbj_default', configPath: '/ws/evil/config.bbx' },
        });
    });

    test('didChangeConfiguration(undefined, next) calls next(undefined) and never send (the settings:null notification carries no values)', async () => {
        const workspace = stubGatedWorkspace({ isTrusted: true });
        const send = vi.fn(() => Promise.resolve());
        const next = vi.fn(() => Promise.resolve());
        const middleware = createConfigPathTrustMiddleware(send, workspace);

        await middleware.didChangeConfiguration(undefined, next);

        expect(next).toHaveBeenCalledWith(undefined);
        expect(send).not.toHaveBeenCalled();
    });

    test('configuration() substitutes configPath in a bbj item, a bbj.configPath item and a whole-config item; a non-array result passes through unchanged', async () => {
        const workspace = stubGatedWorkspace({
            isTrusted: false,
            globalConfigPath: '/home/user/cfg/config.bbx',
            workspaceConfigPath: '/ws/evil/config.bbx',
        });
        const send = vi.fn(() => Promise.resolve());
        const middleware = createConfigPathTrustMiddleware(send, workspace);

        const params = { items: [{ section: 'bbj' }, { section: 'bbj.configPath' }, {}] };
        const nextResult = [
            { home: '/opt/bbj', configPath: '/ws/evil/config.bbx' },
            '/ws/evil/config.bbx',
            { bbj: { home: '/opt/bbj', configPath: '/ws/evil/config.bbx' }, editor: { tabSize: 2 } },
        ];
        const next = vi.fn(() => Promise.resolve(nextResult));

        const result = await middleware.configuration(params as never, undefined as never, next as never);

        expect(result).toEqual([
            { home: '/opt/bbj', configPath: '/home/user/cfg/config.bbx' },
            '/home/user/cfg/config.bbx',
            { bbj: { home: '/opt/bbj', configPath: '/home/user/cfg/config.bbx' }, editor: { tabSize: 2 } },
        ]);

        const nonArrayNext = vi.fn(() => Promise.resolve(undefined));
        const passthrough = await middleware.configuration(params as never, undefined as never, nonArrayNext as never);
        expect(passthrough).toBeUndefined();
    });

    test('gatedBbjSettings copies the section as plain JSON: mutating the result never touches the source', () => {
        const source = { home: '/opt/bbj', nested: { a: 1 }, list: [1, 2, { b: 2 }] };
        const workspace = stubGatedWorkspace({
            isTrusted: true,
            workspaceConfigPath: '/ws/config.bbx',
            bbjSection: source,
        });

        const result = gatedBbjSettings(workspace);
        expect(result).toEqual({ ...source, configPath: '/ws/config.bbx' });

        (result.nested as Record<string, unknown>).a = 999;
        (result.list as unknown[])[2] = 'mutated';
        expect(source.nested.a).toBe(1);
        expect(source.list[2]).toEqual({ b: 2 });
    });

    test('gatedBbjSettings copies an own "__proto__" key on a nested settings value without redirecting the copy\'s prototype', () => {
        // Built via JSON.parse, not an object literal, so "__proto__" lands as a genuine own
        // enumerable property -- the same shape a hand-edited .vscode/settings.json produces.
        const evilPayload = JSON.parse('{"__proto__":{"polluted":true},"safe":"value"}') as Record<string, unknown>;
        const workspace = stubGatedWorkspace({
            isTrusted: true,
            workspaceConfigPath: '/ws/config.bbx',
            bbjSection: { nested: evilPayload },
        });

        const result = gatedBbjSettings(workspace);
        const nested = result.nested as Record<string, unknown>;

        expect(Object.getPrototypeOf(nested)).toBeNull();
        expect(nested.polluted).toBeUndefined();
        expect(nested.safe).toBe('value');
        expect(() => JSON.stringify(result)).not.toThrow();
    });

    test('through activate(): the push path sends DidChangeConfigurationNotification with the gated bbj settings', async () => {
        resetState();
        h.state.isTrusted = false;
        h.state.globalConfigPath = '/home/user/cfg/config.bbx';
        h.state.workspaceConfigPath = '/ws/evil/config.bbx';
        h.state.bbjSection = { home: '/opt/bbj' };

        const context = fakeContext();
        activate(context);

        const didChangeConfiguration = h.capturedClientOptions?.middleware?.workspace?.didChangeConfiguration;
        expect(didChangeConfiguration).toBeDefined();

        await didChangeConfiguration!(['bbj'], vi.fn());

        expect(h.sendNotificationMock).toHaveBeenCalledWith(
            DidChangeConfigurationNotification.type,
            { settings: { bbj: { home: '/opt/bbj', configPath: '/home/user/cfg/config.bbx' } } }
        );
        disposeSubscriptions(context);
    });
});

/** A `TrustAwareWorkspace` stub with a mutable trust flag and a real grant-listener registry. */
function stubTrustGrantWorkspace(opts: {
    globalConfigPath?: string | null;
    workspaceConfigPath?: string | null;
    bbjSection?: Record<string, unknown>;
}): TrustAwareWorkspace & { trusted: { value: boolean }; grant: () => void } {
    const trusted = { value: false };
    const listeners: Array<() => unknown> = [];
    const merged = opts.workspaceConfigPath !== undefined
        ? opts.workspaceConfigPath
        : opts.globalConfigPath !== undefined
            ? opts.globalConfigPath
            : null;
    return {
        get isTrusted() { return trusted.value; },
        getConfiguration: (section?: string) => {
            if (section === 'bbj') {
                return {
                    get: <T>(key: string, def?: T): T => (key === 'configPath' ? (merged as unknown as T) : (def as T)),
                    inspect: <T>(_key: string) => ({
                        key: 'bbj.configPath',
                        defaultValue: null as unknown as T,
                        globalValue: opts.globalConfigPath as unknown as T,
                        workspaceValue: opts.workspaceConfigPath as unknown as T,
                    }),
                };
            }
            return {
                get: <T>(key: string, def?: T): T => {
                    if (key === 'bbj') {
                        return { ...(opts.bbjSection ?? {}) } as unknown as T;
                    }
                    return def as T;
                },
                inspect: <T>(_key: string): { key: string; globalValue?: T } | undefined => undefined,
            };
        },
        onDidGrantWorkspaceTrust: (listener: () => unknown) => {
            listeners.push(listener);
            return { dispose: () => { } };
        },
        trusted,
        grant: () => { for (const listener of [...listeners]) listener(); },
    };
}

describe('granting Workspace Trust re-pushes the bbj settings (issue #511)', () => {
    test('registerTrustGrantRepush subscribes to onDidGrantWorkspaceTrust and returns its disposable', () => {
        const workspace = stubTrustGrantWorkspace({});
        const subscribeSpy = vi.spyOn(workspace, 'onDidGrantWorkspaceTrust');
        const send = vi.fn(() => Promise.resolve());
        const onError = vi.fn();

        const disposable = registerTrustGrantRepush(send, onError, workspace);

        expect(subscribeSpy).toHaveBeenCalledTimes(1);
        expect(typeof disposable.dispose).toBe('function');
    });

    test('firing the grant after trust is granted sends the gated bbj settings once, with the workspace configPath', async () => {
        const workspace = stubTrustGrantWorkspace({
            globalConfigPath: '/home/user/cfg/config.bbx',
            workspaceConfigPath: '/ws/evil/config.bbx',
            bbjSection: { home: '/opt/bbj' },
        });
        const send = vi.fn(() => Promise.resolve());
        const onError = vi.fn();
        registerTrustGrantRepush(send, onError, workspace);

        workspace.trusted.value = true;
        workspace.grant();
        await new Promise(resolve => setTimeout(resolve, 0));

        expect(send).toHaveBeenCalledTimes(1);
        expect(send).toHaveBeenCalledWith({ bbj: { home: '/opt/bbj', configPath: '/ws/evil/config.bbx' } });
    });

    test('a send that rejects routes the error to onError and never escapes as an unhandled rejection', async () => {
        const workspace = stubTrustGrantWorkspace({ workspaceConfigPath: '/ws/evil/config.bbx' });
        const error = new Error('send failed');
        const send = vi.fn(() => Promise.reject(error));
        const onError = vi.fn();
        registerTrustGrantRepush(send, onError, workspace);

        workspace.trusted.value = true;
        workspace.grant();
        await new Promise(resolve => setTimeout(resolve, 0));

        expect(onError).toHaveBeenCalledWith(error);
    });

    test('through activate(): the subscription is registered in context.subscriptions, and firing it sends the workspace configPath', async () => {
        resetState();
        h.state.isTrusted = false;
        h.state.globalConfigPath = '/home/user/cfg/config.bbx';
        h.state.workspaceConfigPath = '/ws/evil/config.bbx';
        h.state.bbjSection = { home: '/opt/bbj' };
        openBbjDocument();

        const context = fakeContext();
        activate(context);

        expect(h.grantListeners.length).toBeGreaterThan(0);

        h.state.isTrusted = true;
        fireWorkspaceTrustGranted();
        await new Promise(resolve => setTimeout(resolve, 0));

        expect(h.sendNotificationMock).toHaveBeenCalledWith(
            DidChangeConfigurationNotification.type,
            { settings: { bbj: { home: '/opt/bbj', configPath: '/ws/evil/config.bbx' } } }
        );

        disposeSubscriptions(context);
        expect(h.grantListeners.length).toBe(0);
    });

    test('through activate(): with no BBj document open the client is not running, so a trust grant sends nothing', async () => {
        resetState();
        h.state.isTrusted = false;
        h.state.workspaceConfigPath = '/ws/evil/config.bbx';

        const context = fakeContext();
        activate(context);
        h.state.isTrusted = true;
        fireWorkspaceTrustGranted();
        await new Promise(resolve => setTimeout(resolve, 0));

        expect(h.startMock).not.toHaveBeenCalled();
        expect(h.sendNotificationMock).not.toHaveBeenCalled();
        disposeSubscriptions(context);
    });
});

describe('the language client reads its initialization options when it starts', () => {
    beforeEach(() => {
        resetState();
    });

    test('a setting changed between activation and the first start is what the server receives', () => {
        h.state.isTrusted = true;
        h.state.bbjSection = { home: '/opt/old' };
        const context = fakeContext();
        activate(context);

        h.state.bbjSection = { home: '/opt/new' };

        expect(initOptions()?.home).toBe('/opt/new');
        disposeSubscriptions(context);
    });
});

describe('config-path-cache honours Workspace Trust before any server push (issue #511)', () => {
    beforeEach(() => {
        resetState();
        resetConfigPathCacheForTests();
    });

    test('untrusted workspace: getActiveConfigPath returns the canonicalized global value, ignoring the workspace value', () => {
        h.state.isTrusted = false;
        h.state.globalConfigPath = '/home/user/cfg/config.bbx';
        h.state.workspaceConfigPath = '/ws/evil/config.bbx';

        expect(getActiveConfigPath()).toBe('/home/user/cfg/config.bbx');
    });

    test('trusted workspace: getActiveConfigPath returns the canonicalized workspace value', () => {
        h.state.isTrusted = true;
        h.state.globalConfigPath = '/home/user/cfg/config.bbx';
        h.state.workspaceConfigPath = '/ws/evil/config.bbx';

        expect(getActiveConfigPath()).toBe('/ws/evil/config.bbx');
    });
});

describe('initializationOptions carry the raw formatter section', () => {
    beforeEach(() => {
        resetState();
    });

    test('initializationOptions.formatter is the section the user holds, untouched', () => {
        h.state.isTrusted = true;
        h.state.bbjSection = { formatter: { indentWidth: 4, indentCharacter: 'TAB' } };

        const context = fakeContext();
        activate(context);

        expect(initOptions()?.formatter).toEqual({ indentWidth: 4, indentCharacter: 'TAB' });
        disposeSubscriptions(context);
    });

    test('initializationOptions.formatter is undefined when the section holds no formatter', () => {
        h.state.isTrusted = true;
        h.state.bbjSection = {};

        const context = fakeContext();
        activate(context);

        expect(initOptions()?.formatter).toBeUndefined();
        disposeSubscriptions(context);
    });
});
