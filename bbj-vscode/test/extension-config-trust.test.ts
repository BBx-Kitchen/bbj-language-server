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
    capturedClientOptions: undefined as { initializationOptions?: Record<string, unknown> } | undefined,
    sendNotificationMock: vi.fn(() => Promise.resolve()),
    startMock: vi.fn(() => Promise.resolve()),
    stopMock: vi.fn(() => Promise.resolve()),
    onNotificationMock: vi.fn(() => ({ dispose: vi.fn() })),
    registeredCommandIds: new Set<string>(),
}));

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
        onNotification = h.onNotificationMock;
        sendNotification = h.sendNotificationMock;
        constructor(_id: string, _name: string, _serverOptions: unknown, clientOptions: { initializationOptions?: Record<string, unknown> }) {
            h.capturedClientOptions = clientOptions;
        }
    }
    return { LanguageClient, TransportKind: { ipc: 1 } };
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
        denumber: vi.fn(),
        decompileReplace: vi.fn(),
        decompileReadonly: vi.fn(),
        setOutputChannel: vi.fn(),
    },
}));

import { activate } from '../src/extension.js';
import { getActiveConfigPath, resetConfigPathCacheForTests } from '../src/config-path-cache.js';
import { effectiveConfigPath, type TrustAwareWorkspace } from '../src/config-path-trust.js';

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
            get: <T>(_key: string, def: T): T => (merged === undefined ? def : (merged as unknown as T)),
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

        expect(h.capturedClientOptions?.initializationOptions?.configPath).toBe('/home/user/cfg/config.bbx');
        disposeSubscriptions(context);
    });

    test('a trusted workspace hands initializationOptions.configPath the merged (workspace) value', () => {
        h.state.isTrusted = true;
        h.state.globalConfigPath = '/home/user/cfg/config.bbx';
        h.state.workspaceConfigPath = '/ws/evil/config.bbx';

        const context = fakeContext();
        activate(context);

        expect(h.capturedClientOptions?.initializationOptions?.configPath).toBe('/ws/evil/config.bbx');
        disposeSubscriptions(context);
    });

    test('initializationOptions.interopHost/interopPort carry whatever get() returns, with no client-side literal default', () => {
        h.state.isTrusted = true;
        h.state.bbjSection = {};

        const context = fakeContext();
        activate(context);

        expect(h.capturedClientOptions?.initializationOptions?.interopHost).toBeUndefined();
        expect(h.capturedClientOptions?.initializationOptions?.interopPort).toBeUndefined();
        disposeSubscriptions(context);
    });

    test('initializationOptions.interopHost/interopPort still carry a configured value through untouched', () => {
        h.state.isTrusted = true;
        h.state.bbjSection = { interop: { host: 'myhost', port: 6000 } };

        const context = fakeContext();
        activate(context);

        expect(h.capturedClientOptions?.initializationOptions?.interopHost).toBe('myhost');
        expect(h.capturedClientOptions?.initializationOptions?.interopPort).toBe(6000);
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
