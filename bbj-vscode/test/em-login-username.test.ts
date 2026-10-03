import { beforeAll, beforeEach, describe, expect, test, vi } from 'vitest';

/**
 * The EM login username pre-fill (issue #546 follow-up: web.bbj no longer
 * defaults the username, so the prompt remembers the last EM username that
 * logged in successfully, falling back to `admin` when none is remembered).
 *
 * Part one exercises the plain seam (em-username-memory.ts) with an
 * in-memory store double. Part two drives the real `bbj.loginEM` command
 * handler through `activate()`, copying the activation mock block from
 * extension-activation.test.ts / em-token-expiry-wiring.test.ts.
 */

import { DEFAULT_EM_USERNAME, EM_LAST_USERNAME_KEY, initialEmUsername, rememberEmUsername, type EmUsernameStore } from '../src/em-username-memory.js';

// JWT-shaped token helpers mirroring em-token-validity.test.ts, so "a successful
// login" exercises a token classifyEmToken actually accepts (issue #535: a login
// handler that stores/remembers on any non-ERROR output, without validating the
// returned token, is the exact bug this test must catch).
const JWT_HEADER = 'eyJhbGciOiJIUzI1NiJ9'; // {"alg":"HS256"} base64url, fixed literal

function jwtPayload(json: string): string {
    return Buffer.from(json, 'utf8').toString('base64url');
}

function unexpiredToken(): string {
    const futureExp = Math.floor(Date.now() / 1000) + 3600;
    return `${JWT_HEADER}.${jwtPayload(`{"exp":${futureExp}}`)}.sig`;
}

function makeStore(initial?: Record<string, unknown>): EmUsernameStore & { map: Map<string, unknown> } {
    const map = new Map<string, unknown>(Object.entries(initial ?? {}));
    return {
        map,
        get: (key: string) => map.get(key),
        update: vi.fn(async (key: string, value: string) => {
            map.set(key, value);
        }),
    };
}

describe('em-username-memory (unit)', () => {
    test('initialEmUsername returns admin over an empty store', () => {
        expect(initialEmUsername(makeStore())).toBe(DEFAULT_EM_USERNAME);
    });

    test('initialEmUsername returns the remembered username', () => {
        const store = makeStore({ [EM_LAST_USERNAME_KEY]: 'jdoe' });
        expect(initialEmUsername(store)).toBe('jdoe');
    });

    test.each(['', '   ', 42] as const)(
        'initialEmUsername falls back to admin for %j',
        (stored) => {
            const store = makeStore({ [EM_LAST_USERNAME_KEY]: stored });
            expect(initialEmUsername(store)).toBe(DEFAULT_EM_USERNAME);
        }
    );

    test('rememberEmUsername stores a non-blank username', async () => {
        const store = makeStore();
        await rememberEmUsername(store, 'jdoe');
        expect(store.update).toHaveBeenCalledWith(EM_LAST_USERNAME_KEY, 'jdoe');
    });

    test('rememberEmUsername is a no-op for a blank username', async () => {
        const store = makeStore();
        await rememberEmUsername(store, '');
        expect(store.update).not.toHaveBeenCalled();
    });
});

const { registeredCommandIds, commandHandlers, onNotificationMock, settings } = vi.hoisted(() => ({
    registeredCommandIds: new Set<string>(),
    commandHandlers: new Map<string, (...args: unknown[]) => unknown>(),
    onNotificationMock: vi.fn(() => ({ dispose: vi.fn() })),
    settings: {} as Record<string, unknown>,
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
                get: vi.fn((key: string, def?: unknown) => (key in settings ? settings[key] : def)),
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
vi.mock('../src/Commands/process-runner.js', () => ({
    runProcess: vi.fn(),
    runProcessCallback: vi.fn(),
    formatArgvForLog: vi.fn(() => ''),
}));

import * as fs from 'fs';
import * as vscode from 'vscode';
import { runProcess } from '../src/Commands/process-runner.js';
import { activate } from '../src/extension.js';

describe('bbj.loginEM username pre-fill (activation-driven)', () => {
    const secretsGet = vi.fn();
    const secretsDelete = vi.fn(async () => undefined);
    const secretsStore = vi.fn(async () => undefined);

    const context = {
        subscriptions: [],
        secrets: { get: secretsGet, delete: secretsDelete, store: secretsStore },
        asAbsolutePath: (p: string) => p,
        extension: { packageJSON: { version: '0.0.0-test' } },
    } as unknown as Parameters<typeof activate>[0];

    let globalStore: ReturnType<typeof makeStore>;

    beforeAll(() => {
        startMock.mockImplementation(() => Promise.resolve());
        activate(context);
        // Activation itself must run unaffected by this test's settings --
        // only set after activate() has already registered every command.
        settings.home = '/opt/bbx';
    });

    beforeEach(() => {
        globalStore = makeStore();
        (context as unknown as { globalState: EmUsernameStore }).globalState = globalStore;
        (vscode.window.showInputBox as ReturnType<typeof vi.fn>).mockReset();
        (vscode.window.showErrorMessage as ReturnType<typeof vi.fn>).mockReset();
        (vscode.window.showInformationMessage as ReturnType<typeof vi.fn>).mockReset();
        (runProcess as ReturnType<typeof vi.fn>).mockReset();
        secretsStore.mockClear();
    });

    async function invokeLoginEM(): Promise<void> {
        const handler = commandHandlers.get('bbj.loginEM');
        expect(handler).toBeDefined();
        await handler!();
    }

    test('pre-fills admin when nothing has been remembered', async () => {
        (vscode.window.showInputBox as ReturnType<typeof vi.fn>).mockResolvedValueOnce(undefined);

        await invokeLoginEM();

        expect(vscode.window.showInputBox).toHaveBeenNthCalledWith(
            1,
            expect.objectContaining({ prompt: 'EM Username', value: 'admin' })
        );
    });

    test('pre-fills the remembered username', async () => {
        globalStore.map.set(EM_LAST_USERNAME_KEY, 'jdoe');
        (vscode.window.showInputBox as ReturnType<typeof vi.fn>).mockResolvedValueOnce(undefined);

        await invokeLoginEM();

        expect(vscode.window.showInputBox).toHaveBeenNthCalledWith(
            1,
            expect.objectContaining({ prompt: 'EM Username', value: 'jdoe' })
        );
    });

    test('a successful login stores the token then remembers the username, in that order', async () => {
        const token = unexpiredToken();
        (vscode.window.showInputBox as ReturnType<typeof vi.fn>)
            .mockResolvedValueOnce('jdoe')
            .mockResolvedValueOnce('pw');
        (runProcess as ReturnType<typeof vi.fn>).mockImplementation(async (argv: { args: string[] }) => {
            fs.writeFileSync(argv.args[3], token);
            return { stdout: '', stderr: '' };
        });

        await invokeLoginEM();

        expect(secretsStore).toHaveBeenCalledWith('bbj.em.token', token);
        expect(globalStore.update).toHaveBeenCalledWith(EM_LAST_USERNAME_KEY, 'jdoe');
        expect(secretsStore.mock.invocationCallOrder[0]).toBeLessThan(
            (globalStore.update as ReturnType<typeof vi.fn>).mock.invocationCallOrder[0]
        );

        for (const call of (globalStore.update as ReturnType<typeof vi.fn>).mock.calls) {
            expect(call[1]).not.toBe('pw');
            expect(call[1]).not.toBe(token);
        }
    });

    test('a login that returns an expired/malformed token is neither stored nor remembered (issue #535)', async () => {
        const malformedToken = 'not-a-jwt';
        (vscode.window.showInputBox as ReturnType<typeof vi.fn>)
            .mockResolvedValueOnce('jdoe')
            .mockResolvedValueOnce('pw');
        (runProcess as ReturnType<typeof vi.fn>).mockImplementation(async (argv: { args: string[] }) => {
            fs.writeFileSync(argv.args[3], malformedToken);
            return { stdout: '', stderr: '' };
        });

        await invokeLoginEM();

        expect(secretsStore).not.toHaveBeenCalled();
        expect(globalStore.update).not.toHaveBeenCalled();
        expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(expect.stringContaining('EM login failed'));
        // The error message must never carry the token text itself.
        for (const call of (vscode.window.showErrorMessage as ReturnType<typeof vi.fn>).mock.calls) {
            expect(String(call[0])).not.toContain(malformedToken);
        }
    });

    test('a failed login shows an error and remembers nothing', async () => {
        (vscode.window.showInputBox as ReturnType<typeof vi.fn>)
            .mockResolvedValueOnce('jdoe')
            .mockResolvedValueOnce('wrong-password');
        (runProcess as ReturnType<typeof vi.fn>).mockImplementation(async (argv: { args: string[] }) => {
            fs.writeFileSync(argv.args[3], 'ERROR:Authentication failed');
            return { stdout: '', stderr: '' };
        });

        await invokeLoginEM();

        expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(expect.stringContaining('EM login failed'));
        expect(globalStore.update).not.toHaveBeenCalled();
    });

    test('cancelling the username prompt calls neither runProcess nor the username memory', async () => {
        (vscode.window.showInputBox as ReturnType<typeof vi.fn>).mockResolvedValueOnce(undefined);

        await invokeLoginEM();

        expect(runProcess).not.toHaveBeenCalled();
        expect(globalStore.update).not.toHaveBeenCalled();
    });
});
