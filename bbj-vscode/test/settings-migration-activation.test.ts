import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

/**
 * Drives the formatter settings migration through the real `activate()` with a scripted
 * `bbj.formatter` configuration: where the migration writes, what it logs to the 'BBj' channel,
 * that it shows no notification, and that a configuration without `inspect` and `update` or a
 * rejected write never disturbs activation.
 */

const { scripted, channelLines, hostState } = vi.hoisted(() => {
    const scripted: {
        formatter: Record<string, unknown>;
        table: Record<string, { globalValue?: unknown; workspaceValue?: unknown }>;
        updates: Array<[string, unknown, number]>;
        rejectUpdates: boolean;
    } = { formatter: {}, table: {}, updates: [], rejectUpdates: false };
    const channelLines: string[] = [];
    const hostState: { workspaceTrusted: boolean } = { workspaceTrusted: true };
    return { scripted, channelLines, hostState };
});

const startMock = vi.fn();
const sendRequestMock = vi.fn();
const onNotificationMock = vi.fn(() => ({ dispose: vi.fn() }));

vi.mock('vscode', () => {
    const disposable = () => ({ dispose: vi.fn() });

    class Uri {
        constructor(readonly scheme: string, readonly fsPath: string) { }
        toString(): string { return `${this.scheme}://${this.fsPath}`; }
        static file(fsPath: string): Uri { return new Uri('file', fsPath); }
    }

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
                appendLine: vi.fn((line: string) => { channelLines.push(line); }),
                dispose: vi.fn(),
            })),
            tabGroups: { all: [], onDidChangeTabs: vi.fn(() => disposable()) },
            onDidChangeActiveTextEditor: vi.fn(() => disposable()),
            activeTextEditor: undefined,
            visibleTextEditors: [],
        },
        commands: {
            registerCommand: vi.fn(() => disposable()),
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
            getConfiguration: vi.fn((section?: string) => section === 'bbj.formatter'
                ? scripted.formatter
                : { get: vi.fn((_key: string, def?: unknown) => def), inspect: vi.fn(() => undefined), formatter: {} }),
            textDocuments: [],
            openTextDocument: vi.fn(),
            onDidOpenTextDocument: vi.fn(() => disposable()),
            onDidChangeTextDocument: vi.fn(() => disposable()),
            onDidCloseTextDocument: vi.fn(() => disposable()),
            onDidChangeConfiguration: vi.fn(() => disposable()),
            workspaceFolders: undefined,
            get isTrusted() { return hostState.workspaceTrusted; },
            onDidGrantWorkspaceTrust: vi.fn(() => disposable()),
        },
        StatusBarAlignment: { Left: 1, Right: 2 },
        DiagnosticSeverity: { Error: 0, Warning: 1, Information: 2, Hint: 3 },
        ConfigurationTarget: { Global: 1, Workspace: 2, WorkspaceFolder: 3 },
        QuickPickItemKind: { Separator: -1 },
        CodeActionKind: { RefactorRewrite: { value: 'refactor.rewrite' } },
        Uri,
    };
});

vi.mock('vscode-languageclient/node', () => {
    class LanguageClient {
        outputChannel = { appendLine: vi.fn() };
        start = startMock;
        stop = vi.fn();
        onNotification = onNotificationMock;
        sendRequest = sendRequestMock;
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
import { activate } from '../src/extension.js';

const GLOBAL_TARGET = 1;

type Context = Parameters<typeof activate>[0];

function makeContext(): Context {
    return {
        subscriptions: [],
        secrets: {},
        asAbsolutePath: (p: string) => p,
        extension: { packageJSON: { version: '0.0.0-test' } },
    } as unknown as Context;
}

const activatedContexts: Context[] = [];

function activateFresh(): Context {
    const context = makeContext();
    activate(context);
    activatedContexts.push(context);
    return context;
}

/** A scripted configuration whose `update` applies the change to the table, as the editor would. */
function scriptConfiguration(): void {
    scripted.formatter = {
        get: vi.fn((_key: string, def?: unknown) => def),
        inspect: vi.fn((key: string) => ({ key, ...(scripted.table[key] ?? {}) })),
        update: vi.fn(async (key: string, value: unknown, target: number) => {
            scripted.updates.push([key, value, target]);
            if (scripted.rejectUpdates) {
                throw new Error('settings file is dirty');
            }
            const entry = (scripted.table[key] ??= {});
            if (target === GLOBAL_TARGET) {
                entry.globalValue = value;
            } else {
                entry.workspaceValue = value;
            }
        }),
    };
}

function migrationLines(): string[] {
    return channelLines.filter(line => line.includes('splitSingleLineIF'));
}

type ChangeEvent = { affectsConfiguration(section: string): boolean };

/** Delivers one configuration change to every listener the extension registered at activation. */
function fireConfigurationChange(...affected: string[]): void {
    const listeners = vi.mocked(vscode.workspace.onDidChangeConfiguration).mock.calls
        .map(call => (call as unknown as [(event: ChangeEvent) => void])[0]);
    for (const listener of listeners) {
        listener({ affectsConfiguration: section => affected.includes(section) });
    }
}

function formatterConfigurationFetches(): number {
    return vi.mocked(vscode.workspace.getConfiguration).mock.calls
        .filter(call => call[0] === 'bbj.formatter').length;
}

const settle = () => new Promise(resolve => setTimeout(resolve, 20));

function expectNoNotification(): void {
    expect(vscode.window.showInformationMessage).not.toHaveBeenCalled();
    expect(vscode.window.showWarningMessage).not.toHaveBeenCalled();
    expect(vscode.window.showErrorMessage).not.toHaveBeenCalled();
}

beforeEach(() => {
    vi.clearAllMocks();
    channelLines.length = 0;
    scripted.formatter = {};
    scripted.table = {};
    scripted.updates = [];
    scripted.rejectUpdates = false;
    hostState.workspaceTrusted = true;
    startMock.mockImplementation(() => Promise.resolve());
    sendRequestMock.mockResolvedValue(undefined);
});

afterEach(() => {
    for (const context of activatedContexts.splice(0)) {
        for (const sub of context.subscriptions as Array<{ dispose(): void }>) {
            sub.dispose();
        }
    }
});

describe('the formatter settings migration through activate()', () => {
    test('moves an old-spelling user value at the user target, logs one line and shows no notification', async () => {
        scripted.table['splitSingleLineIF'] = { globalValue: true };
        scriptConfiguration();

        activateFresh();

        await vi.waitFor(() => {
            expect(scripted.updates).toHaveLength(2);
        });
        expect(scripted.updates).toEqual([
            ['splitSingleLineIf', true, GLOBAL_TARGET],
            ['splitSingleLineIF', undefined, GLOBAL_TARGET],
        ]);
        await vi.waitFor(() => {
            expect(migrationLines()).toHaveLength(1);
        });
        expect(migrationLines()[0]).toBe(
            'Moved bbj.formatter.splitSingleLineIF to bbj.formatter.splitSingleLineIf in the user settings.'
        );
        expectNoNotification();
    });

    test('moves a trusted workspace value at the workspace target and leaves it alone when untrusted', async () => {
        scripted.table['splitSingleLineIF'] = { workspaceValue: false };
        scriptConfiguration();
        hostState.workspaceTrusted = false;

        activateFresh();
        // The migration is started synchronously from activate(); give its promise chain time to settle.
        await new Promise(resolve => setTimeout(resolve, 20));
        expect(scripted.updates).toEqual([]);
        expect(migrationLines()).toEqual([]);

        hostState.workspaceTrusted = true;
        activateFresh();
        await vi.waitFor(() => {
            expect(scripted.updates).toHaveLength(2);
        });
        expect(scripted.updates).toEqual([
            ['splitSingleLineIf', false, 2],
            ['splitSingleLineIF', undefined, 2],
        ]);
        expectNoNotification();
    });

    test('lets activate() return normally and logs nothing when the configuration has no inspect or update', async () => {
        scripted.formatter = { get: vi.fn((_key: string, def?: unknown) => def) };

        expect(() => activateFresh()).not.toThrow();
        await new Promise(resolve => setTimeout(resolve, 20));

        expect(migrationLines()).toEqual([]);
        expectNoNotification();
    });

    test('logs one failure line and raises no unhandled rejection when an update rejects', async () => {
        const unhandled: unknown[] = [];
        const onUnhandled = (reason: unknown) => { unhandled.push(reason); };
        process.on('unhandledRejection', onUnhandled);
        try {
            scripted.table['splitSingleLineIF'] = { globalValue: true };
            scripted.rejectUpdates = true;
            scriptConfiguration();

            activateFresh();

            await vi.waitFor(() => {
                expect(migrationLines()).toHaveLength(1);
            });
            expect(migrationLines()[0].startsWith('Could not finish moving')).toBe(true);
            expect(migrationLines()[0]).toContain('settings file is dirty');
            expect(scripted.updates).toEqual([['splitSingleLineIf', true, GLOBAL_TARGET]]);
            await new Promise(resolve => setTimeout(resolve, 20));
            expect(unhandled).toEqual([]);
            expectNoNotification();
        } finally {
            process.off('unhandledRejection', onUnhandled);
        }
    });
});

describe('the formatter settings migration after activation', () => {
    test('moves an old-spelling value that appears after activation when the old key changes', async () => {
        scriptConfiguration();
        activateFresh();
        await settle();
        expect(scripted.updates).toEqual([]);

        scripted.table['splitSingleLineIF'] = { globalValue: true };
        fireConfigurationChange('bbj.formatter.splitSingleLineIF');

        await vi.waitFor(() => {
            expect(scripted.updates).toHaveLength(2);
        });
        expect(scripted.updates).toEqual([
            ['splitSingleLineIf', true, GLOBAL_TARGET],
            ['splitSingleLineIF', undefined, GLOBAL_TARGET],
        ]);
        await vi.waitFor(() => {
            expect(migrationLines()).toHaveLength(1);
        });
        expect(migrationLines()[0]).toBe(
            'Moved bbj.formatter.splitSingleLineIF to bbj.formatter.splitSingleLineIf in the user settings.'
        );
        expectNoNotification();
    });

    test('does not run the migration for a change to another setting', async () => {
        scriptConfiguration();
        activateFresh();
        await settle();

        scripted.table['splitSingleLineIF'] = { globalValue: true };
        fireConfigurationChange('bbj.formatter.indentWidth');
        await settle();

        expect(scripted.updates).toEqual([]);
        expect(migrationLines()).toEqual([]);
    });

    test('never runs two migrations at once and runs once more for events that arrive meanwhile', async () => {
        scripted.table['splitSingleLineIF'] = { globalValue: true };
        scriptConfiguration();
        let release!: () => void;
        const gate = new Promise<void>(resolve => { release = resolve; });
        const applyUpdate = scripted.formatter.update as (key: string, value: unknown, target: number) => Promise<void>;
        scripted.formatter.update = vi.fn(async (key: string, value: unknown, target: number) => {
            await gate;
            await applyUpdate(key, value, target);
        });
        const inspect = scripted.formatter.inspect as ReturnType<typeof vi.fn>;

        activateFresh();
        await vi.waitFor(() => {
            expect(scripted.formatter.update).toHaveBeenCalledTimes(1);
        });
        // One run reads the old and the new key once each.
        expect(inspect).toHaveBeenCalledTimes(2);

        fireConfigurationChange('bbj.formatter.splitSingleLineIF');
        fireConfigurationChange('bbj.formatter.splitSingleLineIF');
        await settle();
        expect(inspect).toHaveBeenCalledTimes(2);

        release();
        await vi.waitFor(() => {
            expect(inspect).toHaveBeenCalledTimes(4);
        });
        await settle();
        expect(inspect).toHaveBeenCalledTimes(4);
        expect(scripted.updates).toEqual([
            ['splitSingleLineIf', true, GLOBAL_TARGET],
            ['splitSingleLineIF', undefined, GLOBAL_TARGET],
        ]);
    });

    test('reads a fresh configuration for the run a change event starts', async () => {
        scriptConfiguration();
        activateFresh();
        await settle();
        const before = formatterConfigurationFetches();
        expect(before).toBeGreaterThan(0);

        fireConfigurationChange('bbj.formatter.splitSingleLineIF');

        await vi.waitFor(() => {
            expect(formatterConfigurationFetches()).toBeGreaterThan(before);
        });
    });
});
