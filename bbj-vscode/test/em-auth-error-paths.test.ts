import { afterEach, beforeAll, beforeEach, describe, expect, test, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Pins the base error surface of EM login and token validation (issue #564) while
 * extension.ts is still the one file holding both. Every error that escapes
 * bbj.loginEM's four pre-launch steps (output-file creation, os.userInfo, the argv
 * builder, the debug line) still rejects the command with that same error object;
 * every error the handler's own try/catch turns into a message still shows the
 * byte-identical "EM login failed: ..." text; EM validate's catch-all still returns
 * false on every error. This file is written and committed while the source is
 * still the base, passes there, and is never edited again after the EM code moves
 * into em-auth.ts and em-script-runner.ts.
 *
 * The activation mock block below is the same template used by
 * em-login-username.test.ts / em-token-expiry-wiring.test.ts. Two additions on top
 * of that template: createOwnerOnlyFile/buildEmLoginArgv/buildEmValidateArgv
 * (process-args.js) and os.userInfo are partially mocked via importOriginal, so
 * each defaults to its real implementation and can be made to throw a sentinel for
 * exactly one test — proving each step's own failure, not standing in for it.
 */

function jwtHeader(): string {
    return 'eyJhbGciOiJIUzI1NiJ9'; // {"alg":"HS256"} base64url, fixed literal
}

function jwtPayload(json: string): string {
    return Buffer.from(json, 'utf8').toString('base64url');
}

function unexpiredToken(): string {
    const futureExp = Math.floor(Date.now() / 1000) + 3600;
    return `${jwtHeader()}.${jwtPayload(`{"exp":${futureExp}}`)}.sig`;
}

function makeGlobalState(): { get: (key: string) => unknown; update: (key: string, value: unknown) => Promise<void> } {
    const map = new Map<string, unknown>();
    return {
        get: (key: string) => map.get(key),
        update: async (key: string, value: unknown) => { map.set(key, value); },
    };
}

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

// Real behaviour by default; each of these three can be made to throw a sentinel
// for exactly one test via mockImplementationOnce, so a test proves that step's
// own failure, never a stand-in for it.
vi.mock('../src/Commands/process-args.js', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../src/Commands/process-args.js')>();
    // The real createOwnerOnlyFile is exercised by its actual filesystem call for
    // every non-sentinel case below, at the same millisecond-based path scheme
    // test/em-login-username.test.ts's own activation-driven suite also creates
    // for real. Vitest runs different test files in separate worker processes,
    // so two workers can legitimately land on the same wall-clock millisecond and
    // collide on the exact same os.tmpdir() path. Suffixing this file's own real
    // creations with this process's pid keeps the underlying creation call
    // genuinely real (still O_CREAT|O_EXCL, still owner-only) while making that
    // collision impossible; every assertion below reads the mock's own recorded
    // call argument or return value, never a hardcoded path, so the suffix is
    // invisible to what the tests actually check.
    const realCreateOwnerOnlyFile = (filePath: string) => actual.createOwnerOnlyFile(`${filePath}.${process.pid}`);
    return {
        ...actual,
        createOwnerOnlyFile: vi.fn(realCreateOwnerOnlyFile),
        buildEmLoginArgv: vi.fn(actual.buildEmLoginArgv),
        buildEmValidateArgv: vi.fn(actual.buildEmValidateArgv),
    };
});
vi.mock('os', async (importOriginal) => {
    const actual = await importOriginal<typeof import('os')>();
    return {
        ...actual,
        default: actual,
        userInfo: vi.fn(actual.userInfo),
    };
});

import * as os from 'os';
import * as vscode from 'vscode';
import Commands from '../src/Commands/Commands.cjs';
import { createOwnerOnlyFile, buildEmLoginArgv, buildEmValidateArgv } from '../src/Commands/process-args.js';
import { runProcess } from '../src/Commands/process-runner.js';
import { activate } from '../src/extension.js';

const createOwnerOnlyFileMock = createOwnerOnlyFile as unknown as ReturnType<typeof vi.fn>;
const buildEmLoginArgvMock = buildEmLoginArgv as unknown as ReturnType<typeof vi.fn>;
const buildEmValidateArgvMock = buildEmValidateArgv as unknown as ReturnType<typeof vi.fn>;
const userInfoMock = os.userInfo as unknown as ReturnType<typeof vi.fn>;
const runProcessMock = runProcess as unknown as ReturnType<typeof vi.fn>;
const runBUIMock = Commands.runBUI as unknown as ReturnType<typeof vi.fn>;

describe('EM login and token validation base error surface (issue #564)', () => {
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
        // Activation itself must run unaffected by this test's settings -- only
        // set after activate() has already registered every command.
        settings.home = '/opt/bbx';
    });

    beforeEach(() => {
        createOwnerOnlyFileMock.mockClear();
        buildEmLoginArgvMock.mockClear();
        buildEmValidateArgvMock.mockClear();
        userInfoMock.mockClear();
        (vscode.window.showInputBox as ReturnType<typeof vi.fn>).mockReset();
        (vscode.window.showErrorMessage as ReturnType<typeof vi.fn>).mockReset();
        (vscode.window.showInformationMessage as ReturnType<typeof vi.fn>).mockReset();
        (vscode.commands.executeCommand as ReturnType<typeof vi.fn>).mockReset();
        runProcessMock.mockReset();
        runBUIMock.mockClear();
        secretsGet.mockReset();
        secretsDelete.mockClear();
        secretsStore.mockClear();
        (context as unknown as { globalState: unknown }).globalState = makeGlobalState();
    });

    // On some of these paths the base leaves the owner-only output file behind
    // (a throw between creating it and the launch is never cleaned up, as at
    // base) -- remove whatever createOwnerOnlyFile actually created so one
    // test's leftover file can never satisfy a later test's own creation.
    afterEach(() => {
        for (const result of createOwnerOnlyFileMock.mock.results) {
            if (result.type === 'return' && typeof result.value === 'string' && fs.existsSync(result.value)) {
                fs.unlinkSync(result.value);
            }
        }
    });

    describe('bbj.loginEM', () => {
        function invokeLoginEM(): Promise<void> {
            const handler = commandHandlers.get('bbj.loginEM') as (() => Promise<void>) | undefined;
            expect(handler).toBeDefined();
            return handler!();
        }

        beforeEach(() => {
            (vscode.window.showInputBox as ReturnType<typeof vi.fn>)
                .mockResolvedValueOnce('jdoe')
                .mockResolvedValueOnce('pw');
        });

        test('createOwnerOnlyFile throwing rejects the command with the same error object, before any process launch', async () => {
            const sentinel = Object.assign(new Error('EEXIST sentinel'), { code: 'EEXIST' });
            createOwnerOnlyFileMock.mockImplementationOnce(() => { throw sentinel; });

            await expect(invokeLoginEM()).rejects.toBe(sentinel);

            expect(createOwnerOnlyFileMock).toHaveBeenCalledTimes(1);
            const calledPath = createOwnerOnlyFileMock.mock.calls[0][0] as string;
            expect(path.basename(calledPath)).toMatch(/^bbj-em-login-/);
            expect(vscode.window.showErrorMessage).not.toHaveBeenCalled();
            expect(runProcessMock).not.toHaveBeenCalled();
            expect(secretsStore).not.toHaveBeenCalled();
        });

        test('os.userInfo() throwing rejects the command with the same error object, before buildEmLoginArgv', async () => {
            const sentinel = new Error('userInfo sentinel');
            userInfoMock.mockImplementationOnce(() => { throw sentinel; });

            await expect(invokeLoginEM()).rejects.toBe(sentinel);

            expect(userInfoMock).toHaveBeenCalledTimes(1);
            expect(buildEmLoginArgvMock).not.toHaveBeenCalled();
            expect(vscode.window.showErrorMessage).not.toHaveBeenCalled();
            expect(runProcessMock).not.toHaveBeenCalled();
        });

        test('buildEmLoginArgv throwing rejects the command with the same error object, before any process launch', async () => {
            const sentinel = new Error('buildEmLoginArgv sentinel');
            buildEmLoginArgvMock.mockImplementationOnce(() => { throw sentinel; });

            await expect(invokeLoginEM()).rejects.toBe(sentinel);

            expect(buildEmLoginArgvMock).toHaveBeenCalledTimes(1);
            expect(vscode.window.showErrorMessage).not.toHaveBeenCalled();
            expect(runProcessMock).not.toHaveBeenCalled();
        });

        test('a runProcess rejection carrying stderr shows "EM login failed: Error: <stderr>" and removes the output file', async () => {
            runProcessMock.mockRejectedValueOnce(Object.assign(new Error('exit code 1'), { stderr: 'Authentication failed' }));

            await invokeLoginEM();

            expect(runProcessMock).toHaveBeenCalledTimes(1);
            expect(vscode.window.showErrorMessage).toHaveBeenCalledTimes(1);
            expect(vscode.window.showErrorMessage).toHaveBeenCalledWith('EM login failed: Error: Authentication failed');
            const tmpFile = createOwnerOnlyFileMock.mock.results.at(-1)!.value as string;
            expect(fs.existsSync(tmpFile)).toBe(false);
            expect(secretsStore).not.toHaveBeenCalled();
        });

        test('a runProcess rejection with no stderr falls back to its message in "EM login failed: Error: <message>"', async () => {
            runProcessMock.mockRejectedValueOnce(new Error('spawn timed out'));

            await invokeLoginEM();

            expect(vscode.window.showErrorMessage).toHaveBeenCalledTimes(1);
            expect(vscode.window.showErrorMessage).toHaveBeenCalledWith('EM login failed: Error: spawn timed out');
        });

        test('output starting with ERROR: shows "EM login failed: Error: <text after the prefix>" and removes the output file', async () => {
            runProcessMock.mockImplementationOnce(async (argv: { args: string[] }) => {
                fs.writeFileSync(argv.args[3], 'ERROR:Authentication failed');
                return { stdout: '', stderr: '' };
            });

            await invokeLoginEM();

            expect(vscode.window.showErrorMessage).toHaveBeenCalledTimes(1);
            expect(vscode.window.showErrorMessage).toHaveBeenCalledWith('EM login failed: Error: Authentication failed');
            const tmpFile = createOwnerOnlyFileMock.mock.results.at(-1)!.value as string;
            expect(fs.existsSync(tmpFile)).toBe(false);
        });
    });

    describe('bbj.runBUI (EM token validation)', () => {
        function invokeRunBUI(): Promise<void> {
            const handler = commandHandlers.get('bbj.runBUI') as ((params: unknown) => Promise<void>) | undefined;
            expect(handler).toBeDefined();
            return handler!({ fsPath: '/w/a.bbj' });
        }

        test('createOwnerOnlyFile throwing inside validation makes it return false, triggering re-login without ever launching a process', async () => {
            secretsGet.mockResolvedValueOnce(unexpiredToken());
            const sentinel = Object.assign(new Error('EEXIST sentinel'), { code: 'EEXIST' });
            createOwnerOnlyFileMock.mockImplementationOnce(() => { throw sentinel; });

            await invokeRunBUI();

            expect(createOwnerOnlyFileMock).toHaveBeenCalledTimes(1);
            const calledPath = createOwnerOnlyFileMock.mock.calls[0][0] as string;
            expect(path.basename(calledPath)).toMatch(/^bbj-em-validate-/);
            expect(secretsDelete).toHaveBeenCalledWith('bbj.em.token');
            expect(vscode.window.showInformationMessage).toHaveBeenCalledWith('EM token expired or invalid. Please log in again.');
            expect(vscode.commands.executeCommand).toHaveBeenCalledWith('bbj.loginEM');
            expect(runProcessMock).not.toHaveBeenCalled();
            expect(vscode.window.showErrorMessage).not.toHaveBeenCalled();
            expect(runBUIMock).not.toHaveBeenCalled();
        });

        test('buildEmValidateArgv throwing inside validation makes it return false, triggering re-login without ever launching a process', async () => {
            secretsGet.mockResolvedValueOnce(unexpiredToken());
            const sentinel = new Error('buildEmValidateArgv sentinel');
            buildEmValidateArgvMock.mockImplementationOnce(() => { throw sentinel; });

            await invokeRunBUI();

            expect(buildEmValidateArgvMock).toHaveBeenCalledTimes(1);
            expect(secretsDelete).toHaveBeenCalledWith('bbj.em.token');
            expect(vscode.window.showInformationMessage).toHaveBeenCalledWith('EM token expired or invalid. Please log in again.');
            expect(vscode.commands.executeCommand).toHaveBeenCalledWith('bbj.loginEM');
            expect(runProcessMock).not.toHaveBeenCalled();
            expect(runBUIMock).not.toHaveBeenCalled();
        });

        test('a runProcess rejection during validation makes it return false, triggering re-login, and removes the output file', async () => {
            secretsGet.mockResolvedValueOnce(unexpiredToken());
            runProcessMock.mockRejectedValueOnce(new Error('exit code 1'));

            await invokeRunBUI();

            expect(runProcessMock).toHaveBeenCalledTimes(1);
            expect(secretsDelete).toHaveBeenCalledWith('bbj.em.token');
            expect(vscode.window.showInformationMessage).toHaveBeenCalledWith('EM token expired or invalid. Please log in again.');
            expect(vscode.commands.executeCommand).toHaveBeenCalledWith('bbj.loginEM');
            const tmpFile = createOwnerOnlyFileMock.mock.results.at(-1)!.value as string;
            expect(fs.existsSync(tmpFile)).toBe(false);
            expect(runBUIMock).not.toHaveBeenCalled();
        });

        test('output "VALID" runs Commands.runBUI with the token credential and never deletes the token', async () => {
            const token = unexpiredToken();
            secretsGet.mockResolvedValueOnce(token);
            runProcessMock.mockImplementationOnce(async (argv: { args: string[] }) => {
                fs.writeFileSync(argv.args[3], 'VALID\n');
                return { stdout: '', stderr: '' };
            });

            await invokeRunBUI();

            expect(runBUIMock).toHaveBeenCalledTimes(1);
            expect(runBUIMock).toHaveBeenCalledWith({ fsPath: '/w/a.bbj' }, { username: '__token__', password: token });
            expect(secretsDelete).not.toHaveBeenCalled();
            const tmpFile = createOwnerOnlyFileMock.mock.results.at(-1)!.value as string;
            expect(fs.existsSync(tmpFile)).toBe(false);
        });
    });
});
