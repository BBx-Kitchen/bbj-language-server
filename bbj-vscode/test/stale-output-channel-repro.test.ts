import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

/**
 * Coverage for the "Channel has been closed" fix (BBj 26.02 / VS Code 1.137): the first
 * Run As BBj Program used to work while every later run failed with that message, and only
 * restarting VS Code cleared it.
 *
 * "Channel has been closed" is a VS Code string, not a BBj one: it is thrown by
 * `src/vs/workbench/api/common/extHostOutput.ts` when an extension writes to an
 * OutputChannel that has already been disposed.
 *
 * The fix is ownership (#671):
 *   1. `activate()` creates the channel itself via `vscode.window.createOutputChannel(...)`
 *      and hands that same object to `Commands.setOutputChannel(...)`.
 *   2. That channel is also passed as `clientOptions.outputChannel`, so
 *      vscode-languageclient treats it as caller-owned (`_disposeOutputChannel = false`)
 *      and never disposes it through `cleanUpChannel()` when `stop()` runs.
 *   3. The config-reload restart gate still calls `stop()` then `start()`, but the same
 *      channel object survives every restart because nothing ever disposed it.
 *   4. `activate()` pushes the channel onto `context.subscriptions`, so VS Code disposes it
 *      exactly once when the extension itself deactivates.
 *
 * The existing suite could not catch the original defect: `Commands.cjs` is CommonJS and
 * cannot be loaded under Vitest (see no-shell-command-construction.test.ts), so every test
 * mocks it wholesale, and the other reload tests give the mocked client an OutputChannel
 * that never disposes and a `stop()` that does nothing.
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
        /** Every channel `vscode.window.createOutputChannel` handed out — the extension-owned ones. */
        hostChannels: [] as ReturnType<typeof createHostOutputChannel>[],
        /** Channels the fake LanguageClient created itself via its lazy getter — must stay empty. */
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
            createOutputChannel: vi.fn((name: string) => {
                const channel = h.createHostOutputChannel(name);
                h.hostChannels.push(channel);
                return channel;
            }),
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
 * Models the real vscode-languageclient contract the fix depends on:
 * - when `clientOptions.outputChannel` is supplied, that exact object is returned by the
 *   `outputChannel` getter and `stop()` must never dispose it (client.js:461-462, 1262,
 *   1299-1303: `_disposeOutputChannel` is false whenever the caller supplied a channel)
 * - only when no channel was supplied does the getter lazily create one, and only that
 *   self-created channel is disposed on `stop()`
 */
vi.mock('vscode-languageclient/node', () => {
    class LanguageClient {
        private readonly suppliedChannel: ReturnType<typeof h.createHostOutputChannel> | undefined;
        private selfCreatedChannel: ReturnType<typeof h.createHostOutputChannel> | undefined;
        constructor(
            _id: string,
            _name: string,
            _serverOptions: unknown,
            clientOptions: { outputChannel?: ReturnType<typeof h.createHostOutputChannel> },
        ) {
            this.suppliedChannel = clientOptions?.outputChannel;
        }
        get outputChannel() {
            if (this.suppliedChannel) {
                return this.suppliedChannel;
            }
            if (!this.selfCreatedChannel) {
                this.selfCreatedChannel = h.createHostOutputChannel('BBj');
                h.createdChannels.push(this.selfCreatedChannel);
            }
            return this.selfCreatedChannel;
        }
        start = h.clientStartMock;
        needsStop = () => true;
        onNotification = h.clientOnNotificationMock;
        stop = () => {
            h.clientStopMock();
            if (!this.suppliedChannel && this.selfCreatedChannel) {
                this.selfCreatedChannel.dispose();
                this.selfCreatedChannel = undefined;
            }
            return Promise.resolve();
        };
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

function activateForTest(): Parameters<typeof activate>[0] {
    const context = {
        subscriptions: [],
        secrets: {},
        asAbsolutePath: (p: string) => p,
        extension: { packageJSON: { version: '0.0.0-test' } },
    } as unknown as Parameters<typeof activate>[0];
    activate(context);
    return context;
}

function capturedHandler(method: string): (params: ConfigReloadNotification) => void {
    const call = [...h.clientOnNotificationMock.mock.calls].reverse().find(c => c[0] === method);
    if (!call) {
        throw new Error(`No client.onNotification handler registered for ${method}`);
    }
    return call[1] as (params: ConfigReloadNotification) => void;
}

const RELOAD: ConfigReloadNotification = { path: '/opt/bbx/cfg/config.bbx', reason: 'prefix-changed' };

describe('the BBj output channel survives a config-reload restart (#671)', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        h.hostChannels.length = 0;
        h.createdChannels.length = 0;
        h.clientStartMock.mockClear();
        h.clientStopMock.mockClear();
        h.clientOnNotificationMock.mockClear();
        h.setOutputChannelMock.mockClear();
    });
    afterEach(() => {
        vi.useRealTimers();
    });

    test('a restart never disposes the channel Commands holds, and the client never falls back to its own channel', async () => {
        activateForTest();

        expect(h.setOutputChannelMock).toHaveBeenCalledTimes(1);
        const handedToCommands = h.setOutputChannelMock.mock.calls[0][0] as FakeChannel;
        expect(handedToCommands.isDisposed).toBe(false);
        // The object handed to Commands is the one vscode.window.createOutputChannel returned.
        expect(h.hostChannels).toHaveLength(1);
        expect(handedToCommands).toBe(h.hostChannels[0]);

        capturedHandler(CONFIG_RELOAD_METHOD)(RELOAD);
        await vi.advanceTimersByTimeAsync(CONFIG_RELOAD_RESTART_DELAY_MS);

        expect(h.clientStopMock).toHaveBeenCalledTimes(1);
        // client.stop() must leave the extension-owned channel alone.
        expect(handedToCommands.isDisposed).toBe(false);
        expect(h.setOutputChannelMock).toHaveBeenCalledTimes(1);
        // The language client's own lazy channel getter must never have been used.
        expect(h.createdChannels).toHaveLength(0);

        // This is the write Commands.run performs at Commands.cjs:323-324 before it
        // launches BBj — it must not throw after a restart.
        expect(() => handedToCommands.appendLine('GUI run: "/opt/bbx/bin/bbj" "-q"'))
            .not.toThrow();
    });

    test('a second reload does not throw out of the handler and produces a second restart', async () => {
        activateForTest();
        const handler = capturedHandler(CONFIG_RELOAD_METHOD);

        handler(RELOAD);
        await vi.advanceTimersByTimeAsync(CONFIG_RELOAD_RESTART_DELAY_MS);
        expect(h.clientStopMock).toHaveBeenCalledTimes(1);

        expect(() => handler(RELOAD)).not.toThrow();

        await vi.advanceTimersByTimeAsync(CONFIG_RELOAD_RESTART_DELAY_MS);
        expect(h.clientStopMock).toHaveBeenCalledTimes(2);
    });

    test('the channel is pushed onto context.subscriptions, so disposing activation disposes it exactly once', () => {
        const context = activateForTest();
        const handedToCommands = h.setOutputChannelMock.mock.calls[0][0] as FakeChannel;

        expect(context.subscriptions).toContain(handedToCommands);

        for (const sub of context.subscriptions as Array<{ dispose(): void } | undefined>) {
            sub?.dispose();
        }
        expect(handedToCommands.isDisposed).toBe(true);
    });
});
