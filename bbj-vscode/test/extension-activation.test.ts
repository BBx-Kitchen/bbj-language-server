import { describe, expect, test, vi } from 'vitest';

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
            onDidChangeDiagnostics: vi.fn(() => disposable()),
            getDiagnostics: vi.fn(() => []),
        },
        workspace: {
            createFileSystemWatcher: vi.fn(() => disposable()),
            getConfiguration: vi.fn(() => ({
                get: vi.fn((_key: string, def?: unknown) => def),
                formatter: {},
            })),
            onDidChangeTextDocument: vi.fn(() => disposable()),
            onDidCloseTextDocument: vi.fn(() => disposable()),
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
        onNotification = vi.fn();
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
        setOutputChannel: vi.fn(),
    },
}));

import * as vscode from 'vscode';
import { activate } from '../src/extension.js';

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
