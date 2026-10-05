import * as fs from 'fs';
import * as path from 'path';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

/**
 * Characterization safety net for `activate()` before it is split into single-purpose
 * registration functions. This suite proves two things about today's unsplit `extension.ts`:
 *
 * 1. Every command id `package.json`'s `contributes.commands` lists is either passed to
 *    `vscode.commands.registerCommand` by `activate()` itself, or is registered by one of the
 *    composer modules this suite mocks — the allow-list below, one entry per id, each with a
 *    one-line reason for why the id lives outside `activate()`'s own registrations. Every
 *    allow-list entry is itself checked against `package.json` and against its module's source.
 * 2. The order `activate()` registers things in, and how many disposables it leaves in
 *    `context.subscriptions`, are pinned as a literal. A later change to `activate()` that
 *    reorders or adds/removes a registration must update this literal deliberately, not by
 *    accident.
 */

const { registeredCommandIds, onNotificationMock, trace, registered } = vi.hoisted(() => {
    const trace: string[] = [];
    const registered: string[] = [];
    const registeredCommandIds = new Set<string>();
    const onNotificationMock = vi.fn((method: string, _handler: (...args: unknown[]) => void) => {
        trace.push(`notification:${method}`);
        return { dispose: vi.fn() };
    });
    return { registeredCommandIds, onNotificationMock, trace, registered };
});

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
            createStatusBarItem: vi.fn((_alignment: number, priority: number) => {
                trace.push(`statusBar:${priority}`);
                return { text: '', tooltip: '', show: vi.fn(), hide: vi.fn(), dispose: vi.fn() };
            }),
            createOutputChannel: vi.fn(() => {
                trace.push('outputChannel');
                return { appendLine: vi.fn(), show: vi.fn(), dispose: vi.fn() };
            }),
            tabGroups: {
                all: [],
                onDidChangeTabs: vi.fn(() => {
                    trace.push('onDidChangeTabs');
                    return disposable();
                }),
            },
            onDidChangeActiveTextEditor: vi.fn(() => {
                trace.push('onDidChangeActiveTextEditor');
                return disposable();
            }),
            activeTextEditor: undefined,
        },
        commands: {
            registerCommand: vi.fn((id: string, _handler: unknown) => {
                if (registeredCommandIds.has(id)) {
                    throw new Error(`command '${id}' already exists`);
                }
                registeredCommandIds.add(id);
                trace.push(`command:${id}`);
                registered.push(id);
                return { dispose: () => { registeredCommandIds.delete(id); } };
            }),
            executeCommand: vi.fn(),
        },
        languages: {
            registerDocumentFormattingEditProvider: vi.fn(() => {
                trace.push('formatter');
                return disposable();
            }),
            registerCodeActionsProvider: vi.fn(() => {
                trace.push('codeActions');
                return disposable();
            }),
            registerCodeLensProvider: vi.fn(() => disposable()),
            onDidChangeDiagnostics: vi.fn(() => {
                trace.push('onDidChangeDiagnostics');
                return disposable();
            }),
            getDiagnostics: vi.fn(() => []),
            setTextDocumentLanguage: vi.fn(),
        },
        workspace: {
            createFileSystemWatcher: vi.fn(() => {
                trace.push('fileSystemWatcher');
                return disposable();
            }),
            getConfiguration: vi.fn(() => ({
                get: vi.fn((_key: string, def?: unknown) => def),
                formatter: {},
            })),
            textDocuments: [],
            onDidOpenTextDocument: vi.fn(() => {
                trace.push('onDidOpenTextDocument');
                return disposable();
            }),
            onDidChangeTextDocument: vi.fn(() => {
                trace.push('onDidChangeTextDocument');
                return disposable();
            }),
            onDidCloseTextDocument: vi.fn(() => {
                trace.push('onDidCloseTextDocument');
                return disposable();
            }),
            onDidChangeConfiguration: vi.fn(() => {
                trace.push('onDidChangeConfiguration');
                return disposable();
            }),
            workspaceFolders: undefined,
            isTrusted: true,
            onDidGrantWorkspaceTrust: vi.fn(() => {
                trace.push('onDidGrantWorkspaceTrust');
                return disposable();
            }),
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
    BBjLibraryFileSystemProvider: { register: vi.fn(() => { trace.push('libraryFileSystem'); }) },
}));
vi.mock('../src/msgbox-composer-ui.js', () => ({
    registerMsgboxComposer: vi.fn(() => { trace.push('composer:registerMsgboxComposer'); }),
}));
vi.mock('../src/addwindow-composer-ui.js', () => ({
    registerAddWindowComposer: vi.fn(() => { trace.push('composer:registerAddWindowComposer'); }),
}));
vi.mock('../src/addchildwindow-composer-ui.js', () => ({
    registerAddChildWindowComposer: vi.fn(() => { trace.push('composer:registerAddChildWindowComposer'); }),
}));
vi.mock('../src/composer-lens-command.js', () => ({
    registerComposerLensCommand: vi.fn(() => { trace.push('composer:registerComposerLensCommand'); }),
}));
vi.mock('../src/cvs-composer-ui.js', () => ({
    registerCvsComposer: vi.fn(() => { trace.push('composer:registerCvsComposer'); }),
}));
vi.mock('../src/setopts-composer-ui.js', () => ({
    registerSetOptsComposer: vi.fn(() => { trace.push('composer:registerSetOptsComposer'); }),
}));
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

import { activate } from '../src/extension.js';
import { registerMsgboxComposer } from '../src/msgbox-composer-ui.js';
import { registerAddWindowComposer } from '../src/addwindow-composer-ui.js';
import { registerAddChildWindowComposer } from '../src/addchildwindow-composer-ui.js';
import { registerSetOptsComposer } from '../src/setopts-composer-ui.js';
import { registerCvsComposer } from '../src/cvs-composer-ui.js';
import { CONFIG_RELOAD_METHOD } from '../src/language/config-reload-notification.js';
import { RESOLVED_CONFIG_PATH_METHOD } from '../src/language/resolved-config-path-request.js';
import { OPEN_FORMATTER_SETTINGS_METHOD } from '../src/language/format-settings-notification.js';
import { DENUM_DIAGNOSTICS_METHOD, SHOW_DENUM_DIAGNOSTICS_METHOD } from '../src/language/denum-notifications.js';

// setopts-in-code-ui.js is deliberately NOT mocked: its real registerSetOptsInCodeComposer runs
// during activate() and registers 'bbj.composeSetoptsInCode' plus a Code Action provider, exactly
// as it does in production — that command is not on the allow-list below.

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

/** Read straight from the real package.json — never a copied list — so a future command
 *  addition or removal is caught automatically. */
const packageJson = JSON.parse(
    fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf-8')
) as { contributes: { commands: Array<{ command: string }> } };
const contributedCommandIds = packageJson.contributes.commands.map(c => c.command);

/** The six commands activate() does not register itself: each is registered by a composer
 *  module this suite mocks. Every entry is checked against package.json and its own module's
 *  source in the second test below. */
const ALLOW_LIST: Array<{ id: string; module: string; reason: string }> = [
    { id: 'bbj.composeMsgbox', module: 'msgbox-composer-ui.ts', reason: 'registered by the MSGBOX composer module, which this suite mocks' },
    { id: 'bbj.composeMsgboxVisual', module: 'msgbox-composer-ui.ts', reason: 'registered by the MSGBOX composer module, which this suite mocks' },
    { id: 'bbj.composeAddWindow', module: 'addwindow-composer-ui.ts', reason: 'registered by the addWindow composer module, which this suite mocks' },
    { id: 'bbj.composeAddChildWindow', module: 'addchildwindow-composer-ui.ts', reason: 'registered by the addChildWindow composer module, which this suite mocks' },
    { id: 'bbj.composeConfigSetopts', module: 'setopts-composer-ui.ts', reason: 'registered by the SETOPTS composer module, which this suite mocks' },
    { id: 'bbj.composeCvs', module: 'cvs-composer-ui.ts', reason: 'registered by the CVS() composer module, which this suite mocks' },
];

/** The activation sequence activate() produces today, on the unsplit extension.ts. A later
 *  change to activate() must update this literal deliberately — a silent reorder fails here. */
const EXPECTED_SEQUENCE = [
    'libraryFileSystem',
    'composer:registerMsgboxComposer',
    'composer:registerAddWindowComposer',
    'composer:registerAddChildWindowComposer',
    'composer:registerComposerLensCommand',
    'composer:registerCvsComposer',
    'composer:registerSetOptsComposer',
    'command:bbj.composeSetoptsInCode',
    'codeActions',
    'outputChannel',
    'fileSystemWatcher',
    'onDidGrantWorkspaceTrust',
    'onDidChangeConfiguration',
    'command:bbj.config',
    'command:bbj.properties',
    'command:bbj.em',
    'command:bbj.loginEM',
    'command:bbj.run',
    'command:bbj.runBUI',
    'command:bbj.runDWC',
    'command:bbj.compile',
    'command:bbj.denumber',
    'command:bbj.decompile',
    'command:bbj.decompileReadonly',
    'command:bbj.configureCompileOptions',
    'command:bbj.refreshJavaClasses',
    'command:bbj.showClasspathEntries',
    `notification:${OPEN_FORMATTER_SETTINGS_METHOD}`,
    `notification:${DENUM_DIAGNOSTICS_METHOD}`,
    `notification:${SHOW_DENUM_DIAGNOSTICS_METHOD}`,
    'onDidChangeTextDocument',
    'onDidCloseTextDocument',
    'onDidChangeTabs',
    'onDidChangeActiveTextEditor',
    'statusBar:100',
    'onDidChangeDiagnostics',
    'onDidChangeActiveTextEditor',
    'statusBar:99',
    'notification:bbj/bbjcplAvailability',
    'statusBar:98',
    `notification:${CONFIG_RELOAD_METHOD}`,
    `notification:${RESOLVED_CONFIG_PATH_METHOD}`,
    'onDidOpenTextDocument',
    'onDidChangeConfiguration',
    'onDidOpenTextDocument',
];
const EXPECTED_SUBSCRIPTIONS_LENGTH = 38;

let context: Parameters<typeof activate>[0];

beforeEach(() => {
    vi.clearAllMocks();
    trace.length = 0;
    registered.length = 0;
    registeredCommandIds.clear();
    startMock.mockImplementation(() => Promise.resolve());
    context = makeContext();
    activate(context);
});

afterEach(() => {
    disposeSubscriptions(context);
});

describe('activation command coverage', () => {
    test('every contributed command is registered by activate() or is on the checked allow-list', () => {
        const allowListIds = new Set(ALLOW_LIST.map(entry => entry.id));
        const missing = contributedCommandIds.filter(
            id => !registered.includes(id) && !allowListIds.has(id)
        );
        expect(missing).toEqual([]);
    });

    test('every allow-list entry is itself contributed, backed by its module, and registered exactly once with the activation context', () => {
        for (const entry of ALLOW_LIST) {
            expect(contributedCommandIds).toContain(entry.id);
            const source = fs.readFileSync(path.join(__dirname, '..', 'src', entry.module), 'utf-8');
            const escapedId = entry.id.replace(/\./g, '\\.');
            const idPattern = new RegExp(`registerCommand\\(['"\`]${escapedId}['"\`]`);
            expect(source).toMatch(idPattern);
        }

        expect(registerMsgboxComposer).toHaveBeenCalledTimes(1);
        expect(registerMsgboxComposer).toHaveBeenCalledWith(context);
        expect(registerAddWindowComposer).toHaveBeenCalledTimes(1);
        expect(registerAddWindowComposer).toHaveBeenCalledWith(context);
        expect(registerAddChildWindowComposer).toHaveBeenCalledTimes(1);
        expect(registerAddChildWindowComposer).toHaveBeenCalledWith(context);
        expect(registerSetOptsComposer).toHaveBeenCalledTimes(1);
        expect(registerSetOptsComposer).toHaveBeenCalledWith(context);
        expect(registerCvsComposer).toHaveBeenCalledTimes(1);
        expect(registerCvsComposer).toHaveBeenCalledWith(context);
    });

    test('activate() registers no command id that package.json does not contribute', () => {
        const contributedSet = new Set(contributedCommandIds);
        const extra = registered.filter(id => !contributedSet.has(id));
        expect(extra).toEqual([]);
    });

    test('the activation sequence and subscription count match the pinned base', () => {
        expect(trace).toEqual(EXPECTED_SEQUENCE);
        expect(context.subscriptions.length).toBe(EXPECTED_SUBSCRIPTIONS_LENGTH);
    });
});
