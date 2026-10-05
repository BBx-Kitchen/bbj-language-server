import { beforeAll, beforeEach, describe, expect, test, vi } from 'vitest';

/**
 * Activation-driven proof for the EM token expiry check (issue #553):
 * a malformed, unsigned or exp-less stored token is deleted and the Run BUI
 * command asks for a new login, without ever reaching Commands.runBUI; a
 * valid, unexpired token passes through unchanged.
 *
 * The vi.mock block below is copied from extension-activation.test.ts's
 * activation harness, extended with a hoisted command-handler map so the
 * registered bbj.runBUI handler can be invoked directly.
 */

const { registeredCommandIds, commandHandlers, onNotificationMock } = vi.hoisted(() => ({
    registeredCommandIds: new Set<string>(),
    commandHandlers: new Map<string, (...args: unknown[]) => unknown>(),
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
            registerCommand: vi.fn((id: string, handler: (...args: unknown[]) => unknown) => {
                if (registeredCommandIds.has(id)) {
                    throw new Error(`command '${id}' already exists`);
                }
                registeredCommandIds.add(id);
                commandHandlers.set(id, handler);
                return {
                    dispose: () => {
                        registeredCommandIds.delete(id);
                        commandHandlers.delete(id);
                    },
                };
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
        decompileReplace: vi.fn(),
        decompileReadonly: vi.fn(),
        setOutputChannel: vi.fn(),
    },
}));

import * as vscode from 'vscode';
import Commands from '../src/Commands/Commands.cjs';
import { activate, getEMCredentials } from '../src/extension.js';

const HEADER = 'eyJhbGciOiJIUzI1NiJ9'; // {"alg":"HS256"} base64url, fixed literal

function payload(json: string): string {
    return Buffer.from(json, 'utf8').toString('base64url');
}

describe('EM token expiry wiring (issue #553)', () => {
    const secretsGet = vi.fn();
    const secretsDelete = vi.fn(async () => undefined);
    const secretsStore = vi.fn(async () => undefined);

    const context = {
        subscriptions: [],
        secrets: { get: secretsGet, delete: secretsDelete, store: secretsStore },
        asAbsolutePath: (p: string) => p,
        extension: { packageJSON: { version: '0.0.0-test' } },
    } as unknown as Parameters<typeof activate>[0];

    beforeAll(() => {
        startMock.mockImplementation(() => Promise.resolve());
        activate(context);
    });

    beforeEach(() => {
        secretsGet.mockReset();
        secretsDelete.mockClear();
        secretsStore.mockClear();
        (vscode.window.showInformationMessage as ReturnType<typeof vi.fn>).mockReset();
        (Commands.runBUI as ReturnType<typeof vi.fn>).mockClear();
    });

    test('a malformed stored token is deleted and Run BUI asks for a new login without ever calling Commands.runBUI', async () => {
        secretsGet.mockResolvedValue('aaa.bbb');

        const handler = commandHandlers.get('bbj.runBUI');
        expect(handler).toBeDefined();

        await handler!({ fsPath: '/w/a.bbj' });

        expect(secretsDelete).toHaveBeenCalledWith('bbj.em.token');
        expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
            'EM login required. Login now?', 'Login', 'Cancel'
        );
        expect(Commands.runBUI).not.toHaveBeenCalled();
    });

    test('an unsigned stored token makes getEMCredentials resolve undefined and deletes the token', async () => {
        const token = `${HEADER}.${payload('{"exp":9999999999}')}.`;
        secretsGet.mockResolvedValue(token);

        const creds = await getEMCredentials();

        expect(creds).toBeUndefined();
        expect(secretsDelete).toHaveBeenCalledWith('bbj.em.token');
    });

    test('an exp-less stored token makes getEMCredentials resolve undefined and deletes the token', async () => {
        const token = `${HEADER}.${payload('{"sub":"admin"}')}.sig`;
        secretsGet.mockResolvedValue(token);

        const creds = await getEMCredentials();

        expect(creds).toBeUndefined();
        expect(secretsDelete).toHaveBeenCalledWith('bbj.em.token');
    });

    test('a stored token whose exp is one hour in the future resolves credentials and never deletes the token', async () => {
        const futureExp = Math.floor(Date.now() / 1000) + 3600;
        const token = `${HEADER}.${payload(`{"exp":${futureExp}}`)}.sig`;
        secretsGet.mockResolvedValue(token);

        const creds = await getEMCredentials();

        expect(creds).toEqual({ username: '__token__', password: token });
        expect(secretsDelete).not.toHaveBeenCalled();
    });
});
