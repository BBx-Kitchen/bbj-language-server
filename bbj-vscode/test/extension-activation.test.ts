import { beforeEach, describe, expect, test, vi } from 'vitest';

/**
 * Regression for P62-D2-004: extension.ts's startLanguageClient() calls client.start()
 * without awaiting it or attaching a .catch(). If the language-server process fails to
 * spawn, that rejection was previously never observed anywhere — an unhandled promise
 * rejection in the extension host, with every command still registered as though the
 * server had started.
 *
 * extension.ts pulls in vscode-languageclient's LanguageClient plus several extension-only
 * UI/registration modules — all mocked below so this test isolates the client.start()
 * rejection path without spinning up a real VS Code extension host, the composer
 * webviews, or the actual language server process.
 */

const { registeredCommandIds, onNotificationMock } = vi.hoisted(() => ({
    registeredCommandIds: new Set<string>(),
    onNotificationMock: vi.fn((_method: string, _handler: (...args: unknown[]) => void) => ({ dispose: vi.fn() })),
}));

const startMock = vi.fn();

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
            createOutputChannel: vi.fn(() => ({
                appendLine: vi.fn(), show: vi.fn(), dispose: vi.fn(),
                info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), trace: vi.fn(),
            })),
            tabGroups: { all: [], onDidChangeTabs: vi.fn(() => disposable()) },
            onDidChangeActiveTextEditor: vi.fn(() => disposable()),
            activeTextEditor: undefined,
        },
        commands: {
            registerCommand: vi.fn((id: string, _handler: unknown) => {
                if (registeredCommandIds.has(id)) {
                    throw new Error(`command '${id}' already exists`);
                }
                registeredCommandIds.add(id);
                return { dispose: () => { registeredCommandIds.delete(id); } };
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
            getConfiguration: vi.fn(() => ({
                get: vi.fn((_key: string, def?: unknown) => def),
                formatter: {},
            })),
            textDocuments: [],
            openTextDocument: vi.fn(),
            onDidOpenTextDocument: vi.fn(() => disposable()),
            onDidChangeTextDocument: vi.fn(() => disposable()),
            onDidCloseTextDocument: vi.fn(() => disposable()),
            onDidChangeConfiguration: vi.fn(() => disposable()),
            workspaceFolders: undefined,
            isTrusted: true,
            onDidGrantWorkspaceTrust: vi.fn(() => disposable()),
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
        start = startMock;
        stop = vi.fn();
        onNotification = onNotificationMock;
        constructor() { }
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
        denumber: vi.fn(),
        decompileReplace: vi.fn(),
        decompileReadonly: vi.fn(),
        setOutputChannel: vi.fn(),
    },
}));

import * as vscode from 'vscode';
import { activate } from '../src/extension.js';
import { OPEN_FORMATTER_SETTINGS_METHOD } from '../src/language/format-settings-notification.js';
import { DENUM_DIAGNOSTICS_METHOD, SHOW_DENUM_DIAGNOSTICS_METHOD } from '../src/language/denum-notifications.js';

/** Fresh mock ExtensionContext — every activate() call must get its own, since disposal
 *  and re-registration are tracked through each context's own `subscriptions` array. */
function makeContext(): Parameters<typeof activate>[0] {
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

beforeEach(() => {
    registeredCommandIds.clear();
    startMock.mockReset();
    startMock.mockImplementation(() => Promise.resolve());
});

describe('extension activation (P62-D2-004)', () => {
    test('a client.start() rejection is observed and surfaced, not left unhandled', async () => {
        startMock.mockImplementation(() => Promise.reject(new Error('spawn ENOENT')));

        const context = {
            subscriptions: [],
            secrets: {},
            asAbsolutePath: (p: string) => p,
            extension: { packageJSON: { version: '0.0.0-test' } },
        } as unknown as Parameters<typeof activate>[0];

        activate(context);

        // Let the microtask queue drain so the .catch() handler attached to client.start() runs.
        await new Promise(resolve => setTimeout(resolve, 0));

        expect(vscode.window.showErrorMessage).toHaveBeenCalled();
        const calls = (vscode.window.showErrorMessage as ReturnType<typeof vi.fn>).mock.calls;
        const message = calls.map(c => String(c[0])).join('\n');
        expect(message).toMatch(/did not start/i);
    });

    test('a successful client.start() activates without surfacing an error', async () => {
        startMock.mockImplementation(() => Promise.resolve());

        const context = {
            subscriptions: [],
            secrets: {},
            asAbsolutePath: (p: string) => p,
            extension: { packageJSON: { version: '0.0.0-test' } },
        } as unknown as Parameters<typeof activate>[0];

        (vscode.window.showErrorMessage as ReturnType<typeof vi.fn>).mockClear();

        activate(context);
        await new Promise(resolve => setTimeout(resolve, 0));

        expect(vscode.window.showErrorMessage).not.toHaveBeenCalled();
    });
});

describe('extension re-activation (#531)', () => {
    test('activating twice without disposing the first throws on a duplicate command id', () => {
        activate(makeContext());

        expect(() => activate(makeContext())).toThrow(/already exists/);
    });

    test('a second activation after disposing the first registers every command again without throwing', () => {
        const first = makeContext();
        activate(first);
        disposeSubscriptions(first);
        expect(registeredCommandIds.size).toBe(0);

        const second = makeContext();
        expect(() => activate(second)).not.toThrow();
        expect(registeredCommandIds.size).toBeGreaterThan(0);

        disposeSubscriptions(second);
        expect(registeredCommandIds.size).toBe(0);
    });

    test('no client-side formatting provider is registered, and every notification handler is disposed with the activation, alongside every command', () => {
        (vscode.commands.registerCommand as ReturnType<typeof vi.fn>).mockClear();
        (vscode.languages.registerDocumentFormattingEditProvider as ReturnType<typeof vi.fn>).mockClear();
        onNotificationMock.mockClear();

        const context = makeContext();
        activate(context);

        const commandResults = (vscode.commands.registerCommand as ReturnType<typeof vi.fn>).mock.results.map(r => r.value);
        expect(commandResults.length).toBeGreaterThan(0);
        for (const result of commandResults) {
            expect(context.subscriptions).toContain(result);
        }

        // The language server's formatting capability is the only BBj formatter; the extension
        // never registers a second one.
        expect(vscode.languages.registerDocumentFormattingEditProvider).not.toHaveBeenCalled();

        expect(onNotificationMock.mock.calls.length).toBeGreaterThanOrEqual(3);
        const notificationNames = onNotificationMock.mock.calls.map(c => c[0]);
        expect(notificationNames).toContain('bbj/bbjcplAvailability');
        expect(notificationNames).toContain(DENUM_DIAGNOSTICS_METHOD);
        expect(notificationNames).toContain(SHOW_DENUM_DIAGNOSTICS_METHOD);
        for (const result of onNotificationMock.mock.results.map(r => r.value)) {
            expect(context.subscriptions).toContain(result);
        }

        disposeSubscriptions(context);
    });
});

describe('formatter settings link', () => {
    function activateAndFindHandler(): { context: Parameters<typeof activate>[0]; handler: (params?: unknown) => void; registrations: number } {
        onNotificationMock.mockClear();
        const context = makeContext();
        activate(context);

        const matching = onNotificationMock.mock.calls
            .map((call, index) => ({ method: call[0], handler: call[1], result: onNotificationMock.mock.results[index].value }))
            .filter(entry => entry.method === OPEN_FORMATTER_SETTINGS_METHOD);
        expect(context.subscriptions).toContain(matching[0]?.result);
        return { context, handler: matching[0]?.handler as (params?: unknown) => void, registrations: matching.length };
    }

    test('exactly one handler is registered for the open-settings notification, and it is disposed with the activation', () => {
        const { context, registrations } = activateAndFindHandler();

        expect(registrations).toBe(1);

        disposeSubscriptions(context);
    });

    test.each([
        ['a normal payload', { keys: ['bbj.formatter.indentWidth'] }],
        ['a hostile payload', { keys: ['"; rm -rf /', 'workbench.action.reloadWindow'] }],
        ['no payload', undefined],
    ])('%s opens the settings view filtered to the formatter settings and nothing else', (_name, payload) => {
        const { context, handler } = activateAndFindHandler();
        const executeCommand = vscode.commands.executeCommand as ReturnType<typeof vi.fn>;
        executeCommand.mockClear();

        handler(payload);

        expect(executeCommand.mock.calls).toEqual([['workbench.action.openSettings', 'bbj.formatter']]);

        disposeSubscriptions(context);
    });
});

describe('denumber diagnostics output', () => {
    interface ChannelMock {
        appendLine: ReturnType<typeof vi.fn>;
        show: ReturnType<typeof vi.fn>;
        info: ReturnType<typeof vi.fn>;
        warn: ReturnType<typeof vi.fn>;
        error: ReturnType<typeof vi.fn>;
        debug: ReturnType<typeof vi.fn>;
        trace: ReturnType<typeof vi.fn>;
    }

    function activateAndFindHandlers(): {
        context: Parameters<typeof activate>[0];
        channel: ChannelMock;
        list: (params?: unknown) => void;
        reveal: (params?: unknown) => void;
        listRegistrations: number;
        revealRegistrations: number;
    } {
        onNotificationMock.mockClear();
        const createOutputChannel = vscode.window.createOutputChannel as ReturnType<typeof vi.fn>;
        createOutputChannel.mockClear();
        const context = makeContext();
        activate(context);

        const find = (method: string) => onNotificationMock.mock.calls
            .map((call, index) => ({ method: call[0], handler: call[1], result: onNotificationMock.mock.results[index].value }))
            .filter(entry => entry.method === method);
        const lists = find(DENUM_DIAGNOSTICS_METHOD);
        const reveals = find(SHOW_DENUM_DIAGNOSTICS_METHOD);
        expect(context.subscriptions).toContain(lists[0]?.result);
        expect(context.subscriptions).toContain(reveals[0]?.result);
        return {
            context,
            channel: createOutputChannel.mock.results[0].value as ChannelMock,
            list: lists[0]?.handler as (params?: unknown) => void,
            reveal: reveals[0]?.handler as (params?: unknown) => void,
            listRegistrations: lists.length,
            revealRegistrations: reveals.length,
        };
    }

    const payload = {
        uri: 'file:///ws/a.bbj',
        diagnostics: [{ line: 1, originalLineNumber: '0010', severity: 'ERROR', message: 'syntax error' }],
    };

    test('each notification has exactly one handler, disposed with the activation', () => {
        const { context, listRegistrations, revealRegistrations } = activateAndFindHandlers();

        expect(listRegistrations).toBe(1);
        expect(revealRegistrations).toBe(1);

        disposeSubscriptions(context);
    });

    test('the list notification appends the block to the BBj channel as raw lines and does nothing else', () => {
        const { context, channel, list } = activateAndFindHandlers();
        const executeCommand = vscode.commands.executeCommand as ReturnType<typeof vi.fn>;
        executeCommand.mockClear();

        list(payload);

        expect(channel.appendLine.mock.calls).toEqual([
            ['Denumber diagnostics for /ws/a.bbj:'],
            ['  line 1 (original 0010) ERROR: syntax error'],
        ]);
        for (const method of [channel.info, channel.warn, channel.error, channel.debug, channel.trace, channel.show]) {
            expect(method).not.toHaveBeenCalled();
        }
        expect(executeCommand).not.toHaveBeenCalled();
        expect(vscode.window.createOutputChannel).toHaveBeenCalledTimes(1);

        disposeSubscriptions(context);
    });

    test('two runs append two blocks, each starting with its own header', () => {
        const { context, channel, list } = activateAndFindHandlers();

        list(payload);
        list(payload);

        const lines = channel.appendLine.mock.calls.map(call => call[0]);
        expect(lines).toEqual([
            'Denumber diagnostics for /ws/a.bbj:',
            '  line 1 (original 0010) ERROR: syntax error',
            'Denumber diagnostics for /ws/a.bbj:',
            '  line 1 (original 0010) ERROR: syntax error',
        ]);

        disposeSubscriptions(context);
    });

    test('a hostile list payload only appends text and never opens, runs or jumps anywhere', () => {
        const { context, channel, list } = activateAndFindHandlers();
        const spies = [
            vscode.commands.executeCommand,
            vscode.window.showTextDocument,
            vscode.workspace.openTextDocument,
        ] as Array<ReturnType<typeof vi.fn>>;
        spies.forEach(spy => spy.mockClear());

        list({
            uri: 'command:workbench.action.reloadWindow',
            diagnostics: [{ line: 1, originalLineNumber: '', severity: 'ERROR', message: 'command:workbench.action.quit' }],
        });

        expect(channel.appendLine.mock.calls).toEqual([
            ['Denumber diagnostics for command:workbench.action.reloadWindow:'],
            ['  line 1 ERROR: command:workbench.action.quit'],
        ]);
        spies.forEach(spy => expect(spy).not.toHaveBeenCalled());

        disposeSubscriptions(context);
    });

    test.each([
        ['null', null],
        ['a number', 42],
        ['a string', 'text'],
        ['an object without diagnostics', { uri: 7 }],
    ])('a malformed list payload (%s) does not throw and still writes a header', (_name, payload) => {
        const { context, channel, list } = activateAndFindHandlers();

        expect(() => list(payload)).not.toThrow();

        expect(channel.appendLine).toHaveBeenCalledTimes(1);
        expect(channel.appendLine.mock.calls[0][0]).toBe('Denumber diagnostics for an unknown file:');

        disposeSubscriptions(context);
    });

    test.each([
        ['a file uri payload', { uri: 'file:///etc/passwd' }],
        ['no payload', undefined],
        ['a string payload', 'x'],
    ])('the reveal notification with %s only shows the channel', (_name, payload) => {
        const { context, channel, reveal } = activateAndFindHandlers();
        const spies = [
            vscode.commands.executeCommand,
            vscode.window.showTextDocument,
            vscode.workspace.openTextDocument,
        ] as Array<ReturnType<typeof vi.fn>>;
        spies.forEach(spy => spy.mockClear());

        reveal(payload);

        expect(channel.show.mock.calls).toEqual([[true]]);
        expect(channel.appendLine).not.toHaveBeenCalled();
        spies.forEach(spy => expect(spy).not.toHaveBeenCalled());

        disposeSubscriptions(context);
    });

    test('the reveal notification shows the BBj channel without taking focus and appends nothing', () => {
        const { context, channel, reveal } = activateAndFindHandlers();

        reveal();

        expect(channel.show.mock.calls).toEqual([[true]]);
        expect(channel.appendLine).not.toHaveBeenCalled();

        disposeSubscriptions(context);
    });
});
