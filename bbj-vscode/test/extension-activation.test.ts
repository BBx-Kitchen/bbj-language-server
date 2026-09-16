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
    onNotificationMock: vi.fn(() => ({ dispose: vi.fn() })),
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
            createOutputChannel: vi.fn(() => ({ appendLine: vi.fn(), dispose: vi.fn() })),
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

vi.mock('vscode-languageclient/node', () => {
    class LanguageClient {
        outputChannel = { appendLine: vi.fn() };
        start = startMock;
        stop = vi.fn();
        onNotification = onNotificationMock;
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

    test('the formatting provider and every notification handler are disposed with the activation, alongside every command', () => {
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

        const formatterMock = vscode.languages.registerDocumentFormattingEditProvider as ReturnType<typeof vi.fn>;
        expect(formatterMock).toHaveBeenCalledTimes(1);
        for (const result of formatterMock.mock.results.map(r => r.value)) {
            expect(context.subscriptions).toContain(result);
        }

        expect(onNotificationMock.mock.calls.length).toBeGreaterThanOrEqual(3);
        const notificationNames = onNotificationMock.mock.calls.map(c => c[0]);
        expect(notificationNames).toContain('bbj/bbjcplAvailability');
        for (const result of onNotificationMock.mock.results.map(r => r.value)) {
            expect(context.subscriptions).toContain(result);
        }

        disposeSubscriptions(context);
    });
});
