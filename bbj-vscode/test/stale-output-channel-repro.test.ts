import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

/**
 * Reproduction for the "Channel has been closed" report (BBj 26.02 / VS Code 1.137):
 * the first Run As BBj Program works, every later run fails with that message, and only
 * restarting VS Code clears it.
 *
 * "Channel has been closed" is a VS Code string, not a BBj one: it is thrown by
 * `src/vs/workbench/api/common/extHostOutput.ts` when an extension writes to an
 * OutputChannel that has already been disposed.
 *
 * The chain this file reproduces:
 *   1. `extension.ts` captures `client.outputChannel` once at activation and hands that
 *      same object to `Commands.setOutputChannel(...)`.
 *   2. Our `clientOptions` pass no `outputChannel`, so vscode-languageclient owns it
 *      (`_disposeOutputChannel = true`) and `stop()` disposes it via `cleanUpChannel()`.
 *   3. The config-reload restart gate calls `stop()` then `start()`, so the captured
 *      object is dead while `client.outputChannel` lazily creates a fresh one.
 *   4. Nothing ever re-hands the replacement over, so every later write throws.
 *
 * Note this is the ONLY disposal path: a server crash takes `cleanUp(ShutdownMode.Stop |
 * Restart)` (client.js:1464-1481), which never calls `cleanUpChannel()`. An explicit
 * `client.stop()` is required, and in this extension only the config-reload restart gate
 * issues one.
 *
 * These tests assert the CURRENT, BROKEN behaviour so the defect is pinned down. When the
 * fix lands, the `isDisposed` / call-count expectations below are the ones to invert.
 *
 * The existing suite could not catch this: `Commands.cjs` is CommonJS and cannot be loaded
 * under Vitest (see no-shell-command-construction.test.ts), so every test mocks it
 * wholesale, and the other reload tests give the mocked client an OutputChannel that never
 * disposes and a `stop()` that does nothing.
 */

interface FakeChannel {
    name: string;
    appendLine: (value: string) => void;
    dispose: () => void;
    readonly isDisposed: boolean;
}

/**
 * Hoisted so the `vi.mock` factories below — which run while `extension.ts` is being
 * imported, before ordinary top-level consts initialize — can reach these.
 */
const h = vi.hoisted(() => {
    /**
     * Faithful model of a VS Code OutputChannel: writing after disposal throws the exact
     * error `extHostOutput.ts`'s `validate()` raises.
     */
    function createHostOutputChannel(name: string) {
        let disposed = false;
        return {
            name,
            appendLine: (_value: string) => {
                if (disposed) {
                    throw new Error('Channel has been closed');
                }
            },
            dispose: () => {
                disposed = true;
            },
            get isDisposed() {
                return disposed;
            },
        };
    }

    return {
        createHostOutputChannel,
        createdChannels: [] as ReturnType<typeof createHostOutputChannel>[],
        clientStartMock: vi.fn(() => Promise.resolve()),
        clientStopMock: vi.fn(),
        clientOnNotificationMock: vi.fn(),
        setOutputChannelMock: vi.fn(),
    };
});

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
            createOutputChannel: vi.fn(() => ({ appendLine: vi.fn() })),
            tabGroups: { all: [], onDidChangeTabs: vi.fn(() => disposable()) },
            onDidChangeActiveTextEditor: vi.fn(() => disposable()),
            activeTextEditor: undefined,
        },
        commands: {
            registerCommand: vi.fn(),
            executeCommand: vi.fn(),
        },
        languages: {
            registerDocumentFormattingEditProvider: vi.fn(),
            registerCodeActionsProvider: vi.fn(),
            registerCodeLensProvider: vi.fn(),
            onDidChangeDiagnostics: vi.fn(() => disposable()),
            getDiagnostics: vi.fn(() => []),
            setTextDocumentLanguage: vi.fn(),
        },
        workspace: {
            createFileSystemWatcher: vi.fn(() => disposable()),
            getConfiguration: vi.fn(() => ({
                get: vi.fn((_key: string, def?: unknown) => def),
            })),
            textDocuments: [] as unknown[],
            onDidOpenTextDocument: vi.fn(() => disposable()),
            onDidChangeTextDocument: vi.fn(() => disposable()),
            onDidCloseTextDocument: vi.fn(() => disposable()),
            onDidChangeConfiguration: vi.fn(() => disposable()),
            workspaceFolders: undefined,
        },
        StatusBarAlignment: { Left: 1, Right: 2 },
        DiagnosticSeverity: { Error: 0, Warning: 1, Information: 2, Hint: 3 },
        ConfigurationTarget: { Global: 1, Workspace: 2, WorkspaceFolder: 3 },
        QuickPickItemKind: { Separator: -1 },
        CodeActionKind: { RefactorRewrite: { value: 'refactor.rewrite' } },
        Uri: class { },
    };
});

/**
 * Models the real vscode-languageclient contract this bug depends on:
 * - the `outputChannel` getter lazily creates a channel when it has none (client.js:531-538)
 * - `stop()` disposes and clears it, because we pass no `outputChannel` in clientOptions
 *   so `_disposeOutputChannel` is true (client.js:461-462, 1262, 1299-1303)
 */
vi.mock('vscode-languageclient/node', () => {
    class LanguageClient {
        private _channel: ReturnType<typeof h.createHostOutputChannel> | undefined;
        get outputChannel() {
            if (!this._channel) {
                this._channel = h.createHostOutputChannel('BBj');
                h.createdChannels.push(this._channel);
            }
            return this._channel;
        }
        start = h.clientStartMock;
        needsStop = () => true;
        onNotification = h.clientOnNotificationMock;
        stop = () => {
            h.clientStopMock();
            if (this._channel) {
                this._channel.dispose();
                this._channel = undefined;
            }
            return Promise.resolve();
        };
        constructor() { }
    }
    return { LanguageClient, TransportKind: { ipc: 1 } };
});

vi.mock('../src/language/lib/fs-provider.js', () => ({
    BBjLibraryFileSystemProvider: { register: vi.fn() },
}));
vi.mock('../src/msgbox-composer-ui.js', () => ({ registerMsgboxComposer: vi.fn() }));
vi.mock('../src/addwindow-composer-ui.js', () => ({ registerAddWindowComposer: vi.fn() }));
vi.mock('../src/addchildwindow-composer-ui.js', () => ({ registerAddChildWindowComposer: vi.fn() }));
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
        setOutputChannel: h.setOutputChannelMock,
    },
}));

import { activate } from '../src/extension.js';
import { CONFIG_RELOAD_METHOD, type ConfigReloadNotification } from '../src/language/config-reload-notification.js';
import { CONFIG_RELOAD_RESTART_DELAY_MS } from '../src/restart-gate.js';

function activateForTest(): void {
    const context = {
        subscriptions: [],
        secrets: {},
        asAbsolutePath: (p: string) => p,
        extension: { packageJSON: { version: '0.0.0-test' } },
    } as unknown as Parameters<typeof activate>[0];
    activate(context);
}

function capturedHandler(method: string): (params: ConfigReloadNotification) => void {
    const call = [...h.clientOnNotificationMock.mock.calls].reverse().find(c => c[0] === method);
    if (!call) {
        throw new Error(`No client.onNotification handler registered for ${method}`);
    }
    return call[1] as (params: ConfigReloadNotification) => void;
}

const RELOAD: ConfigReloadNotification = { path: '/opt/bbx/cfg/config.bbx', reason: 'prefix-changed' };

describe('stale OutputChannel after a config-reload restart', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        h.createdChannels.length = 0;
        h.clientStartMock.mockClear();
        h.clientStopMock.mockClear();
        h.clientOnNotificationMock.mockClear();
        h.setOutputChannelMock.mockClear();
    });
    afterEach(() => {
        vi.useRealTimers();
    });

    test('the restart disposes the very channel Commands holds, and the replacement is never handed over', async () => {
        activateForTest();

        expect(h.setOutputChannelMock).toHaveBeenCalledTimes(1);
        const handedToCommands = h.setOutputChannelMock.mock.calls[0][0] as FakeChannel;
        expect(handedToCommands.isDisposed).toBe(false);

        capturedHandler(CONFIG_RELOAD_METHOD)(RELOAD);
        await vi.advanceTimersByTimeAsync(CONFIG_RELOAD_RESTART_DELAY_MS);

        expect(h.clientStopMock).toHaveBeenCalledTimes(1);
        // client.stop() disposed it, and Commands.cjs still holds this exact object.
        expect(handedToCommands.isDisposed).toBe(true);
        expect(h.setOutputChannelMock).toHaveBeenCalledTimes(1);

        // This is the write Commands.run performs at Commands.cjs:323-324 before it
        // launches BBj — so BBj is never launched and the user sees only this message.
        expect(() => handedToCommands.appendLine('GUI run: "/opt/bbx/bin/bbj" "-q"'))
            .toThrowError('Channel has been closed');
    });

    test('the second reload throws inside the handler, so no further restart is ever requested', async () => {
        activateForTest();
        const handler = capturedHandler(CONFIG_RELOAD_METHOD);

        handler(RELOAD);
        await vi.advanceTimersByTimeAsync(CONFIG_RELOAD_RESTART_DELAY_MS);
        expect(h.clientStopMock).toHaveBeenCalledTimes(1);

        // extension.ts:966 writes to the captured channel unguarded — no bbj.debug needed —
        // and it sits *before* the restartGate.request(...) call on line 969.
        expect(() => handler(RELOAD)).toThrowError('Channel has been closed');

        await vi.advanceTimersByTimeAsync(CONFIG_RELOAD_RESTART_DELAY_MS);
        expect(h.clientStopMock).toHaveBeenCalledTimes(1);
    });
});
