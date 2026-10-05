import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test, vi } from 'vitest';

/**
 * Characterization safety net for the two open-file prompts and the two diagnostic status bars
 * `activate()` wires today, on the unsplit `extension.ts`. Both areas move into their own module
 * in a later plan and no existing test drives them — this suite pins their behaviour (exact
 * prompt texts and actions, "ask once per file" semantics, status bar priorities/texts/tooltips,
 * and the show/hide rules driven by diagnostics and the BBjCPL availability notification) so a
 * later move can be checked against green, not against a hand re-reading of `extension.ts`.
 */

const {
    commandHandlers,
    onNotificationMock,
    notificationHandlers,
    settings,
    statusBarItems,
    tabsListeners,
    activeEditorListeners,
    diagnosticsListeners,
    hostState,
} = vi.hoisted(() => {
    const commandHandlers = new Map<string, (...args: unknown[]) => unknown>();
    const notificationHandlers = new Map<string, (...args: unknown[]) => unknown>();
    const settings: Record<string, unknown> = {};
    const statusBarItems: Array<{
        alignment: number;
        priority: number;
        text: string;
        tooltip: string;
        show: (...args: unknown[]) => unknown;
        hide: (...args: unknown[]) => unknown;
    }> = [];
    const tabsListeners: Array<(event: { opened: unknown[] }) => void> = [];
    const activeEditorListeners: Array<(editor: unknown) => void> = [];
    const diagnosticsListeners: Array<() => void> = [];
    const hostState: {
        tabsAll: Array<{ tabs: unknown[] }>;
        activeTextEditor: unknown;
        diagnostics: Array<{ severity: number }>;
        visibleEditors: unknown[];
    } = { tabsAll: [], activeTextEditor: undefined, diagnostics: [], visibleEditors: [] };
    const onNotificationMock = vi.fn((method: string, handler: (...args: unknown[]) => unknown) => {
        notificationHandlers.set(method, handler);
        return { dispose: vi.fn() };
    });
    return {
        commandHandlers, onNotificationMock, notificationHandlers, settings,
        statusBarItems, tabsListeners, activeEditorListeners, diagnosticsListeners, hostState,
    };
});

const startMock = vi.fn();
const sendRequestMock = vi.fn();

vi.mock('vscode', () => {
    const disposable = () => ({ dispose: vi.fn() });

    class Uri {
        readonly scheme: string;
        readonly fsPath: string;
        private readonly asString: string;
        constructor(scheme: string, fsPath: string) {
            this.scheme = scheme;
            this.fsPath = fsPath;
            this.asString = `${scheme}://${fsPath}`;
        }
        toString(): string { return this.asString; }
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
            createStatusBarItem: vi.fn((alignment: number, priority: number) => {
                const item = { alignment, priority, text: '', tooltip: '', show: vi.fn(), hide: vi.fn(), dispose: vi.fn() };
                statusBarItems.push(item);
                return item;
            }),
            createOutputChannel: vi.fn(() => ({ appendLine: vi.fn(), dispose: vi.fn() })),
            tabGroups: {
                get all() { return hostState.tabsAll; },
                onDidChangeTabs: vi.fn((listener: (event: { opened: unknown[] }) => void) => {
                    tabsListeners.push(listener);
                    return disposable();
                }),
            },
            onDidChangeActiveTextEditor: vi.fn((listener: (editor: unknown) => void) => {
                activeEditorListeners.push(listener);
                return disposable();
            }),
            get activeTextEditor() { return hostState.activeTextEditor; },
            get visibleTextEditors() { return hostState.visibleEditors; },
        },
        commands: {
            registerCommand: vi.fn((id: string, handler: (...args: unknown[]) => unknown) => {
                commandHandlers.set(id, handler);
                return { dispose: () => { commandHandlers.delete(id); } };
            }),
            executeCommand: vi.fn(),
        },
        languages: {
            registerDocumentFormattingEditProvider: vi.fn(() => disposable()),
            registerCodeActionsProvider: vi.fn(() => disposable()),
            registerCodeLensProvider: vi.fn(() => disposable()),
            onDidChangeDiagnostics: vi.fn((listener: () => void) => {
                diagnosticsListeners.push(listener);
                return disposable();
            }),
            getDiagnostics: vi.fn(() => hostState.diagnostics),
            setTextDocumentLanguage: vi.fn(),
        },
        workspace: {
            createFileSystemWatcher: vi.fn(() => disposable()),
            getConfiguration: vi.fn(() => ({
                get: vi.fn((key: string, def?: unknown) => (key in settings ? settings[key] : def)),
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

// setopts-in-code-ui.js is deliberately NOT mocked, matching activation-command-coverage.test.ts
// (as committed by Task 1): its real registerSetOptsInCodeComposer runs during activate() and
// registers its own command and Code Action provider, ahead of everything this suite pins.

import * as vscode from 'vscode';
import Commands from '../src/Commands/Commands.cjs';
import { activate } from '../src/extension.js';
import { NO_ACTIVE_BBJ_FILE_MESSAGE } from '../src/Commands/target-resolution.js';

const UriCtor = vscode.Uri as unknown as new (scheme: string, fsPath: string) => vscode.Uri;

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

const activatedContexts: Array<Parameters<typeof activate>[0]> = [];

/** Every test activates fresh, after arranging whatever tabs/editor/settings state it needs
 *  activation to observe — mirrors production, where those are already in place when the
 *  extension host calls activate(). */
function activateFresh(): Parameters<typeof activate>[0] {
    const context = makeContext();
    activate(context);
    activatedContexts.push(context);
    return context;
}

let tmpDir: string;

beforeAll(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bbj-activation-prompts-'));
});

afterAll(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
});

beforeEach(() => {
    vi.clearAllMocks();
    for (const key of Object.keys(settings)) {
        delete settings[key];
    }
    statusBarItems.length = 0;
    tabsListeners.length = 0;
    activeEditorListeners.length = 0;
    diagnosticsListeners.length = 0;
    notificationHandlers.clear();
    commandHandlers.clear();
    hostState.tabsAll = [];
    hostState.activeTextEditor = undefined;
    hostState.diagnostics = [];
    hostState.visibleEditors = [];
    startMock.mockImplementation(() => Promise.resolve());
    sendRequestMock.mockResolvedValue({ status: 'denumbered' });
});

afterEach(() => {
    for (const context of activatedContexts.splice(0)) {
        disposeSubscriptions(context);
    }
});

describe('the tokenized-file open prompt', () => {
    test('shows once with both actions; a repeat tab event shows nothing further; Decompile & Replace runs the decompile command', async () => {
        const filePath = path.join(tmpDir, 'tokenized-open.bbj');
        fs.writeFileSync(filePath, Buffer.concat([Buffer.from('<<bbj>>'), Buffer.from('rest of tokenized payload')]));
        const uri = new UriCtor('file', filePath);
        const tab = { input: { uri } };
        hostState.tabsAll = [{ tabs: [tab] }];
        (vscode.window.showInformationMessage as ReturnType<typeof vi.fn>).mockResolvedValueOnce('Decompile & Replace');

        activateFresh();

        await vi.waitFor(() => {
            expect(vscode.window.showInformationMessage).toHaveBeenCalled();
        });
        expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
            `"${path.basename(filePath)}" is a tokenized (binary) BBj program. Decompile it to editable source, or open a read-only copy?`,
            'Decompile & Replace', 'Open Read-only'
        );
        await vi.waitFor(() => {
            expect(Commands.decompileReplace).toHaveBeenCalledWith(uri);
        });

        (vscode.window.showInformationMessage as ReturnType<typeof vi.fn>).mockClear();
        tabsListeners[0]({ opened: [tab] });
        expect(vscode.window.showInformationMessage).not.toHaveBeenCalled();
    });

    function channelLines(): string[] {
        const channels = (vscode.window.createOutputChannel as ReturnType<typeof vi.fn>).mock.results
            .map((result) => result.value as { appendLine: ReturnType<typeof vi.fn> });
        return channels.flatMap((channel) => channel.appendLine.mock.calls.map(([line]) => String(line)));
    }

    test('an unreadable file raises no popup, logs one channel line, and is probed again on a later tab event', async () => {
        const filePath = path.join(tmpDir, 'tokenized-unreadable.bbj');
        fs.writeFileSync(filePath, Buffer.concat([Buffer.from('<<bbj>>'), Buffer.from('payload')]));
        const resolved = fs.realpathSync(filePath);
        const uri = new UriCtor('file', filePath);
        const tab = { input: { uri } };
        hostState.tabsAll = [{ tabs: [tab] }];
        const realOpen = fs.promises.open.bind(fs.promises);
        const openSpy = vi.spyOn(fs.promises, 'open').mockImplementation(((target: fs.PathLike, ...rest: unknown[]) => {
            if (target === resolved) {
                return Promise.reject(Object.assign(new Error('resource busy or locked'), { code: 'EBUSY' }));
            }
            return (realOpen as (...args: unknown[]) => Promise<fs.promises.FileHandle>)(target, ...rest);
        }) as typeof fs.promises.open);
        try {
            activateFresh();

            await vi.waitFor(() => {
                expect(channelLines().filter((line) => line.startsWith('Could not check whether "'))).toEqual([
                    'Could not check whether "tokenized-unreadable.bbj" is a tokenized BBj program: resource busy or locked',
                ]);
            });
            expect(vscode.window.showInformationMessage).not.toHaveBeenCalled();
            expect(vscode.window.showWarningMessage).not.toHaveBeenCalled();
            expect(vscode.window.showErrorMessage).not.toHaveBeenCalled();
        } finally {
            openSpy.mockRestore();
        }

        tabsListeners[0]({ opened: [tab] });

        await vi.waitFor(() => {
            expect(vscode.window.showInformationMessage).toHaveBeenCalledTimes(1);
        });
    });

    test('a symlink to a tokenized program is offered, and Decompile & Replace receives the link uri', async () => {
        const target = path.join(tmpDir, 'tokenized-link-target.bbj');
        fs.writeFileSync(target, Buffer.concat([Buffer.from('<<bbj>>'), Buffer.from('payload')]));
        const link = path.join(tmpDir, 'tokenized-link.bbj');
        fs.symlinkSync(target, link);
        const uri = new UriCtor('file', link);
        hostState.tabsAll = [{ tabs: [{ input: { uri } }] }];
        (vscode.window.showInformationMessage as ReturnType<typeof vi.fn>).mockResolvedValueOnce('Decompile & Replace');

        activateFresh();

        await vi.waitFor(() => {
            expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
                '"tokenized-link.bbj" is a tokenized (binary) BBj program. Decompile it to editable source, or open a read-only copy?',
                'Decompile & Replace', 'Open Read-only'
            );
        });
        await vi.waitFor(() => {
            expect(Commands.decompileReplace).toHaveBeenCalledWith(uri);
        });
    });

    test('with decompile.promptOnOpen false, neither a tokenized file nor a plain-text file prompts', () => {
        settings['decompile.promptOnOpen'] = false;
        const tokenizedPath = path.join(tmpDir, 'tokenized-suppressed.bbj');
        fs.writeFileSync(tokenizedPath, Buffer.concat([Buffer.from('<<bbj>>'), Buffer.from('payload')]));
        const plainPath = path.join(tmpDir, 'plain-suppressed.bbj');
        fs.writeFileSync(plainPath, 'print "hello"\n');
        const tokenizedTab = { input: { uri: new UriCtor('file', tokenizedPath) } };
        const plainTab = { input: { uri: new UriCtor('file', plainPath) } };
        hostState.tabsAll = [{ tabs: [tokenizedTab, plainTab] }];

        activateFresh();

        // decompile.promptOnOpen is read before any file access, so both tabs are skipped
        // synchronously and no wait is needed to prove neither one ever prompts.
        expect(vscode.window.showInformationMessage).not.toHaveBeenCalled();
    });
});

describe('the line-numbered-file open prompt', () => {
    const numberedText = '0010 LET A=5\n0020 PRINT A\n0030 END\n';

    function activeEditorWith(fileName: string, text: string) {
        const filePath = path.join(tmpDir, fileName);
        fs.writeFileSync(filePath, text);
        const doc = { languageId: 'bbj', uri: new UriCtor('file', filePath), fileName: filePath, getText: () => text };
        const editor = { document: doc };
        hostState.activeTextEditor = editor;
        return { doc, editor };
    }

    test('shows once for the active editor; a repeat active-editor event shows nothing further; Denumber runs bbj.denumber', async () => {
        const { doc, editor } = activeEditorWith('line-numbered.bbj', numberedText);
        (vscode.window.showInformationMessage as ReturnType<typeof vi.fn>).mockResolvedValueOnce('Denumber');

        activateFresh();

        expect(vscode.window.showInformationMessage).toHaveBeenCalledTimes(1);
        expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
            `"${path.basename(doc.fileName)}" is a line-numbered BBj program. Denumber it for editing, or open it read-only?`,
            'Denumber', 'Open Read-only'
        );
        await vi.waitFor(() => {
            expect(vscode.commands.executeCommand).toHaveBeenCalledWith('bbj.denumber', doc.uri);
        });

        (vscode.window.showInformationMessage as ReturnType<typeof vi.fn>).mockClear();
        for (const listener of activeEditorListeners) {
            listener(editor);
        }
        expect(vscode.window.showInformationMessage).not.toHaveBeenCalled();
    });

    test('Open Read-only shows the document and flips it read-only without ever running bbj.denumber', async () => {
        const { doc } = activeEditorWith('line-numbered-readonly.bbj', numberedText);
        (vscode.window.showInformationMessage as ReturnType<typeof vi.fn>).mockResolvedValueOnce('Open Read-only');

        activateFresh();

        await vi.waitFor(() => {
            expect(vscode.commands.executeCommand).toHaveBeenCalledWith('workbench.action.files.setActiveEditorReadonlyInSession');
        });
        expect(vscode.window.showTextDocument).toHaveBeenCalledWith(doc, { preview: false });
        const showOrder = (vscode.window.showTextDocument as ReturnType<typeof vi.fn>).mock.invocationCallOrder[0];
        const readonlyOrder = (vscode.commands.executeCommand as ReturnType<typeof vi.fn>).mock.invocationCallOrder[0];
        expect(readonlyOrder).toBeGreaterThan(showOrder);
        const executedCommands = (vscode.commands.executeCommand as ReturnType<typeof vi.fn>).mock.calls.map(call => call[0]);
        expect(executedCommands).not.toContain('bbj.denumber');
    });

    test('an unnumbered bbj editor shows no line-numbered prompt', () => {
        activeEditorWith('plain-source.bbj', 'print 1\nprint 2\n');

        activateFresh();

        expect(vscode.window.showInformationMessage).not.toHaveBeenCalled();
    });

    test('with denumber.promptOnOpen false, a numbered bbj editor shows no prompt', () => {
        settings['denumber.promptOnOpen'] = false;
        activeEditorWith('line-numbered-suppressed.bbj', numberedText);

        activateFresh();

        expect(vscode.window.showInformationMessage).not.toHaveBeenCalled();
    });
});

describe('the Denumber BBj Program command wired through activate()', () => {
    const numberedText = '0010 LET A=5\n0020 PRINT A\n0030 END\n';

    function numberedDocument(filePath: string) {
        return {
            languageId: 'bbj',
            uri: new UriCtor('file', filePath),
            fileName: filePath,
            getText: () => numberedText,
            save: vi.fn(),
        };
    }

    test('from the editor it sends one bbj/denum request with the document URI, shows nothing and never saves', async () => {
        const filePath = path.join(tmpDir, 'denumber-editor.bbj');
        const doc = numberedDocument(filePath);
        const editor = { document: doc };
        hostState.activeTextEditor = editor;
        hostState.visibleEditors = [editor];
        (vscode.workspace.openTextDocument as ReturnType<typeof vi.fn>).mockResolvedValue(doc);

        activateFresh();
        const handler = commandHandlers.get('bbj.denumber')!;
        await handler();

        expect(sendRequestMock).toHaveBeenCalledTimes(1);
        expect(sendRequestMock).toHaveBeenCalledWith('bbj/denum', { uri: `file://${filePath}` });
        expect(vscode.window.showTextDocument).not.toHaveBeenCalled();
        expect(doc.save).not.toHaveBeenCalled();
        expect(vscode.window.showErrorMessage).not.toHaveBeenCalled();
    });

    test('from the Explorer on a file that is not open it opens, shows without the prompt, then sends the request', async () => {
        const filePath = path.join(tmpDir, 'denumber-explorer.bbj');
        const doc = numberedDocument(filePath);
        const editor = { document: doc };
        (vscode.workspace.openTextDocument as ReturnType<typeof vi.fn>).mockResolvedValue(doc);
        (vscode.window.showTextDocument as ReturnType<typeof vi.fn>).mockImplementation(async () => {
            hostState.activeTextEditor = editor;
            hostState.visibleEditors = [editor];
            for (const listener of activeEditorListeners) {
                listener(editor);
            }
            return editor;
        });

        activateFresh();
        const explorerUri = new UriCtor('file', filePath);
        const handler = commandHandlers.get('bbj.denumber')!;
        await handler(explorerUri, [explorerUri]);

        expect(vscode.workspace.openTextDocument).toHaveBeenCalledTimes(1);
        const openedWith = (vscode.workspace.openTextDocument as ReturnType<typeof vi.fn>).mock.calls[0][0] as { fsPath: string };
        expect(openedWith.fsPath).toBe(filePath);
        expect(vscode.window.showTextDocument).toHaveBeenCalledTimes(1);
        expect(vscode.window.showTextDocument).toHaveBeenCalledWith(doc, { preview: false });
        expect(vscode.window.showInformationMessage).not.toHaveBeenCalled();
        expect(sendRequestMock).toHaveBeenCalledTimes(1);
        expect(sendRequestMock).toHaveBeenCalledWith('bbj/denum', { uri: `file://${filePath}` });
        const showOrder = (vscode.window.showTextDocument as ReturnType<typeof vi.fn>).mock.invocationCallOrder[0];
        const sendOrder = sendRequestMock.mock.invocationCallOrder[0];
        expect(sendOrder).toBeGreaterThan(showOrder);
        expect(doc.save).not.toHaveBeenCalled();
    });

    test('with no target it shows the no-active-file warning and neither opens nor sends anything', async () => {
        activateFresh();
        const handler = commandHandlers.get('bbj.denumber')!;
        await handler();

        expect(vscode.window.showWarningMessage).toHaveBeenCalledWith(NO_ACTIVE_BBJ_FILE_MESSAGE);
        expect(vscode.workspace.openTextDocument).not.toHaveBeenCalled();
        expect(sendRequestMock).not.toHaveBeenCalled();
    });
});

describe('the two diagnostic status bars', () => {
    test('are created with priorities 100, 99 and 98 in that order, Left-aligned, the first two carrying the suppression and BBjCPL texts', () => {
        activateFresh();

        expect(statusBarItems.map(item => item.priority)).toEqual([100, 99, 98]);
        for (const item of statusBarItems) {
            expect(item.alignment).toBe(1); // StatusBarAlignment.Left
        }
        expect(statusBarItems[0].text).toBe('$(warning) Diagnostics filtered');
        expect(statusBarItems[0].tooltip).toBe(
            'Parse errors detected — cascading linking and validation noise is hidden. Fix parse errors to see full diagnostics.'
        );
        expect(statusBarItems[1].text).toBe('$(warning) BBjCPL: unavailable');
        expect(statusBarItems[1].tooltip).toBe(
            'BBjCPL compiler not found. Check that BBj is installed and bbj.home is configured.'
        );
    });

    test('the suppression bar shows on an Error in the active bbj editor and hides otherwise', () => {
        // getText() deliberately returns ordinary (non-line-numbered) source: activate() also
        // wires maybePromptLineNumbered against the active editor, and this test's doc must not
        // trigger that unrelated prompt.
        const doc = {
            languageId: 'bbj',
            uri: new UriCtor('file', path.join(tmpDir, 'diagnostics.bbj')),
            fileName: path.join(tmpDir, 'diagnostics.bbj'),
            getText: () => 'print "hi"\n',
        };
        hostState.activeTextEditor = { document: doc };

        activateFresh();
        const suppressionBar = statusBarItems[0];

        hostState.diagnostics = [{ severity: vscode.DiagnosticSeverity.Error }];
        diagnosticsListeners[0]();
        expect(suppressionBar.show).toHaveBeenCalled();

        (suppressionBar.show as ReturnType<typeof vi.fn>).mockClear();
        (suppressionBar.hide as ReturnType<typeof vi.fn>).mockClear();
        hostState.diagnostics = [{ severity: vscode.DiagnosticSeverity.Warning }];
        diagnosticsListeners[0]();
        expect(suppressionBar.hide).toHaveBeenCalled();
        expect(suppressionBar.show).not.toHaveBeenCalled();

        (suppressionBar.hide as ReturnType<typeof vi.fn>).mockClear();
        hostState.diagnostics = [{ severity: vscode.DiagnosticSeverity.Error }];
        settings['diagnostics.suppressCascading'] = false;
        diagnosticsListeners[0]();
        expect(suppressionBar.hide).toHaveBeenCalled();
    });

    test('the BBjCPL bar shows when the server reports unavailable and hides when available', () => {
        activateFresh();
        const bbjcplBar = statusBarItems[1];
        const handler = notificationHandlers.get('bbj/bbjcplAvailability');
        expect(handler).toBeDefined();

        handler!({ available: false });
        expect(bbjcplBar.show).toHaveBeenCalled();

        (bbjcplBar.show as ReturnType<typeof vi.fn>).mockClear();
        handler!({ available: true });
        expect(bbjcplBar.hide).toHaveBeenCalled();
    });
});
