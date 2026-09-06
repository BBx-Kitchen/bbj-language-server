import { beforeEach, describe, expect, test, vi } from 'vitest';

/**
 * Regression coverage for the VS Code host's config-file discoverability behavior (#485):
 * the warm cache the host keeps for the server-pushed resolved config path, the dynamic
 * `bbx-config` language association that makes an arbitrarily-named/located config file get
 * config-file highlighting, the SETOPTS lens, and the SETOPTS composer, and the composer's hint
 * when the open config file is not the one the tooling actually reads.
 */

const clientStartMock = vi.fn(() => Promise.resolve());
const clientOnNotificationMock = vi.fn();

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

vi.mock('vscode-languageclient/node', () => {
    class LanguageClient {
        outputChannel = { appendLine: vi.fn() };
        start = clientStartMock;
        stop = vi.fn();
        onNotification = clientOnNotificationMock;
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
// setopts-composer-ui.js is deliberately NOT mocked — its inactive-config hint is under test.
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
import {
    getActiveConfigPath,
    getResolvedConfigPath,
    isActiveConfigPath,
    resetConfigPathCacheForTests,
    setResolvedConfigPath,
    shouldWarnOnce,
} from '../src/config-path-cache.js';
import { argForActiveEditor } from '../src/setopts-composer-ui.js';
import type { ResolvedConfigPath } from '../src/language/config-path-resolver.js';
import { RESOLVED_CONFIG_PATH_METHOD } from '../src/language/resolved-config-path-request.js';

/** Point the mocked `bbj.configPath` workspace setting at `value` (or unset when `null`). */
function mockConfigPathSetting(value: string | null): void {
    (vscode.workspace.getConfiguration as ReturnType<typeof vi.fn>).mockReturnValue({
        get: vi.fn((_key: string, def?: unknown) => (value === null ? def : value)),
    });
}

function pushedPath(overrides: Partial<ResolvedConfigPath> = {}): ResolvedConfigPath {
    return { path: '/home/user/cfg/config.bbx', source: 'default', exists: true, problem: null, ...overrides };
}

describe('config-path-cache', () => {
    beforeEach(() => {
        resetConfigPathCacheForTests();
        mockConfigPathSetting(null);
    });

    test('getActiveConfigPath returns the cached pushed path when one has arrived', () => {
        setResolvedConfigPath(pushedPath({ path: '/srv/custom/myconfig.bbx' }));
        expect(getActiveConfigPath()).toBe('/srv/custom/myconfig.bbx');
    });

    test('with no push yet and an explicit setting, getActiveConfigPath returns that setting canonicalized', () => {
        mockConfigPathSetting('/tmp/custom-config.bbx');
        expect(getActiveConfigPath()).toBe('/tmp/custom-config.bbx');
    });

    test('with no push yet and no explicit setting, getActiveConfigPath is undefined', () => {
        expect(getActiveConfigPath()).toBeUndefined();
    });

    test('a pushed payload whose path is null clears the cache back to the explicit-setting-only behavior', () => {
        mockConfigPathSetting('/tmp/custom-config.bbx');
        setResolvedConfigPath(pushedPath({ path: '/srv/custom/myconfig.bbx' }));
        expect(getActiveConfigPath()).toBe('/srv/custom/myconfig.bbx');

        setResolvedConfigPath({ path: null, source: 'none', exists: false, problem: null });
        expect(getActiveConfigPath()).toBe('/tmp/custom-config.bbx');
    });

    test('isActiveConfigPath is true for the active path and false for any other file', () => {
        setResolvedConfigPath(pushedPath({ path: '/srv/custom/myconfig.bbx' }));
        expect(isActiveConfigPath('/srv/custom/myconfig.bbx')).toBe(true);
        expect(isActiveConfigPath('/srv/custom/other.bbx')).toBe(false);
    });

    test('shouldWarnOnce returns true the first time for a path and false for every repeat', () => {
        expect(shouldWarnOnce('/srv/custom/myconfig.bbx')).toBe(true);
        expect(shouldWarnOnce('/srv/custom/myconfig.bbx')).toBe(false);
        expect(shouldWarnOnce('/srv/custom/myconfig.bbx')).toBe(false);
    });

    test('getResolvedConfigPath returns the last pushed payload, or undefined before any push', () => {
        expect(getResolvedConfigPath()).toBeUndefined();
        const payload = pushedPath();
        setResolvedConfigPath(payload);
        expect(getResolvedConfigPath()).toEqual(payload);
    });
});

/** A minimal stand-in for `vscode.TextDocument` — only the fields the association code reads. */
function fakeDoc(fsPath: string, languageId: string): { uri: { scheme: string; fsPath: string }; languageId: string } {
    return { uri: { scheme: 'file', fsPath }, languageId };
}

/** A minimal stand-in for `vscode.ExtensionContext`, matching `extension-activation.test.ts`. */
function fakeContext(): Parameters<typeof activate>[0] {
    return {
        subscriptions: [],
        secrets: {},
        asAbsolutePath: (p: string) => p,
        extension: { packageJSON: { version: '0.0.0-test' } },
    } as unknown as Parameters<typeof activate>[0];
}

describe('bbx-config editor association', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        resetConfigPathCacheForTests();
        (vscode.workspace as unknown as { textDocuments: unknown[] }).textDocuments = [];
        (vscode.workspace.getConfiguration as ReturnType<typeof vi.fn>).mockReturnValue({
            get: vi.fn((_key: string, def?: unknown) => def),
        });
    });

    test('a document already open at activation is switched to bbx-config when it is the active config path', () => {
        const docA = fakeDoc('/srv/custom/myconfig.bbx', 'plaintext');
        (vscode.workspace as unknown as { textDocuments: unknown[] }).textDocuments = [docA];
        setResolvedConfigPath(pushedPath({ path: '/srv/custom/myconfig.bbx' }));

        activate(fakeContext());

        expect(vscode.languages.setTextDocumentLanguage).toHaveBeenCalledWith(docA, 'bbx-config');
    });

    test('the same document is switched again on a simulated close/reopen — not a one-shot', () => {
        setResolvedConfigPath(pushedPath({ path: '/srv/custom/myconfig.bbx' }));
        activate(fakeContext());
        expect(vscode.languages.setTextDocumentLanguage).not.toHaveBeenCalled();

        const onOpen = (vscode.workspace.onDidOpenTextDocument as ReturnType<typeof vi.fn>).mock.calls[0][0];
        const docA = fakeDoc('/srv/custom/myconfig.bbx', 'plaintext');

        onOpen(docA); // first open
        expect(vscode.languages.setTextDocumentLanguage).toHaveBeenCalledWith(docA, 'bbx-config');

        (vscode.languages.setTextDocumentLanguage as ReturnType<typeof vi.fn>).mockClear();
        const docAReopened = fakeDoc('/srv/custom/myconfig.bbx', 'plaintext'); // VS Code re-derives its default language on reopen
        onOpen(docAReopened); // simulated close + reopen
        expect(vscode.languages.setTextDocumentLanguage).toHaveBeenCalledWith(docAReopened, 'bbx-config');
    });

    test('a document already carrying bbx-config is left alone', () => {
        const docA = fakeDoc('/srv/custom/myconfig.bbx', 'bbx-config');
        (vscode.workspace as unknown as { textDocuments: unknown[] }).textDocuments = [docA];
        setResolvedConfigPath(pushedPath({ path: '/srv/custom/myconfig.bbx' }));

        activate(fakeContext());

        expect(vscode.languages.setTextDocumentLanguage).not.toHaveBeenCalled();
    });

    test('a configured path ending in a BBj source extension is still switched to bbx-config', () => {
        const docA = fakeDoc('/srv/custom/myconfig.bbj', 'bbj');
        (vscode.workspace as unknown as { textDocuments: unknown[] }).textDocuments = [docA];
        setResolvedConfigPath(pushedPath({ path: '/srv/custom/myconfig.bbj' }));

        activate(fakeContext());

        expect(vscode.languages.setTextDocumentLanguage).toHaveBeenCalledWith(docA, 'bbx-config');
    });

    test('a document that is not the active config path is never switched', () => {
        const docA = fakeDoc('/srv/other/file.bbj', 'bbj');
        (vscode.workspace as unknown as { textDocuments: unknown[] }).textDocuments = [docA];
        setResolvedConfigPath(pushedPath({ path: '/srv/custom/myconfig.bbx' }));

        activate(fakeContext());

        expect(vscode.languages.setTextDocumentLanguage).not.toHaveBeenCalled();
    });

    test('a configuration change releases the old path and associates the new one', () => {
        const docA = fakeDoc('/srv/custom/old-config.bbx', 'plaintext');
        const docB = fakeDoc('/srv/custom/new-config.bbx', 'plaintext');
        (vscode.workspace as unknown as { textDocuments: unknown[] }).textDocuments = [docA, docB];
        setResolvedConfigPath(pushedPath({ path: '/srv/custom/old-config.bbx' }));

        activate(fakeContext());
        expect(vscode.languages.setTextDocumentLanguage).toHaveBeenCalledWith(docA, 'bbx-config');

        // Simulate VS Code having actually applied the earlier association, then the setting change.
        docA.languageId = 'bbx-config';
        (vscode.languages.setTextDocumentLanguage as ReturnType<typeof vi.fn>).mockClear();
        setResolvedConfigPath(pushedPath({ path: '/srv/custom/new-config.bbx' }));

        const onConfigChange = (vscode.workspace.onDidChangeConfiguration as ReturnType<typeof vi.fn>).mock.calls[0][0];
        onConfigChange({ affectsConfiguration: (key: string) => key === 'bbj.configPath' });

        expect(vscode.languages.setTextDocumentLanguage).toHaveBeenCalledWith(docA, undefined);
        expect(vscode.languages.setTextDocumentLanguage).toHaveBeenCalledWith(docB, 'bbx-config');
    });

    test('the resolvedConfigPath push releases the old path even when the settings listener already fired and no-op\'d', () => {
        // Realistic ordering: the local bbj.configPath settings-change listener always fires
        // before the server's async bbj/resolvedConfigPath push arrives, and at that point the
        // cache still holds the OLD path — so the listener's release-and-resweep is a no-op (it
        // re-applies the still-active old path right after releasing it). The push handler must
        // be able to release the stale association itself once the resolution actually changes
        // (#485). This mock reacts to setTextDocumentLanguage (unlike the sibling tests in this
        // file) so the resweep-after-release step below observes the released state, matching
        // real VS Code's document.languageId after the association is dropped.
        (vscode.languages.setTextDocumentLanguage as ReturnType<typeof vi.fn>).mockImplementation(
            (doc: { languageId: string }, langId: string | undefined) => {
                doc.languageId = langId ?? 'plaintext';
            }
        );
        const docA = fakeDoc('/srv/custom/old-config.bbx', 'plaintext');
        const docB = fakeDoc('/srv/custom/new-config.bbx', 'plaintext');
        (vscode.workspace as unknown as { textDocuments: unknown[] }).textDocuments = [docA, docB];
        setResolvedConfigPath(pushedPath({ path: '/srv/custom/old-config.bbx' }));

        activate(fakeContext());
        expect(docA.languageId).toBe('bbx-config');

        // The setting change fires first, BEFORE the cache is updated with the new path: it
        // releases A, then immediately resweeps and finds A still active (cache unchanged) —
        // re-associating A right back. Net effect on A: unchanged.
        const onConfigChange = (vscode.workspace.onDidChangeConfiguration as ReturnType<typeof vi.fn>).mock.calls[0][0];
        onConfigChange({ affectsConfiguration: (key: string) => key === 'bbj.configPath' });
        expect(docA.languageId).toBe('bbx-config');
        expect(docB.languageId).toBe('plaintext');

        // The server's push then arrives with the new path (the handler itself updates the cache).
        const onResolvedConfigPath = clientOnNotificationMock.mock.calls
            .find(([method]) => method === RESOLVED_CONFIG_PATH_METHOD)?.[1];
        onResolvedConfigPath!(pushedPath({ path: '/srv/custom/new-config.bbx' }));

        expect(docA.languageId).toBe('plaintext');
        expect(docB.languageId).toBe('bbx-config');
    });

    test('a configuration change unrelated to bbj.configPath is ignored', () => {
        const docA = fakeDoc('/srv/custom/myconfig.bbx', 'bbx-config');
        (vscode.workspace as unknown as { textDocuments: unknown[] }).textDocuments = [docA];
        setResolvedConfigPath(pushedPath({ path: '/srv/custom/myconfig.bbx' }));

        activate(fakeContext());
        (vscode.languages.setTextDocumentLanguage as ReturnType<typeof vi.fn>).mockClear();

        const onConfigChange = (vscode.workspace.onDidChangeConfiguration as ReturnType<typeof vi.fn>).mock.calls[0][0];
        onConfigChange({ affectsConfiguration: (key: string) => key === 'bbj.home' });

        expect(vscode.languages.setTextDocumentLanguage).not.toHaveBeenCalled();
    });
});

/** A minimal stand-in for the active `vscode.TextEditor`, with no SETOPTS line in the document. */
function fakeEditor(fsPath: string, languageId: string): {
    document: { languageId: string; uri: { fsPath: string }; lineCount: number; lineAt: (line: number) => { text: string } };
} {
    return {
        document: {
            languageId,
            uri: { fsPath },
            lineCount: 0,
            lineAt: () => ({ text: '' }),
        },
    };
}

describe('inactive-config hint in the SETOPTS composer', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        resetConfigPathCacheForTests();
        (vscode.workspace.getConfiguration as ReturnType<typeof vi.fn>).mockReturnValue({
            get: vi.fn((_key: string, def?: unknown) => def),
        });
        (vscode.window as unknown as { activeTextEditor: unknown }).activeTextEditor = undefined;
    });

    test('the hint fires when the open bbx-config document is not the active config file', () => {
        (vscode.window as unknown as { activeTextEditor: unknown }).activeTextEditor =
            fakeEditor('/home/user/cfg/config.bbx', 'bbx-config');
        setResolvedConfigPath(pushedPath({ path: '/srv/custom/myconfig.bbx' }));

        argForActiveEditor();

        expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
            expect.stringContaining('/srv/custom/myconfig.bbx')
        );
    });

    test('the hint does not fire when the open bbx-config document IS the active config file', () => {
        (vscode.window as unknown as { activeTextEditor: unknown }).activeTextEditor =
            fakeEditor('/srv/custom/myconfig.bbx', 'bbx-config');
        setResolvedConfigPath(pushedPath({ path: '/srv/custom/myconfig.bbx' }));

        argForActiveEditor();

        expect(vscode.window.showInformationMessage).not.toHaveBeenCalled();
    });

    test('the hint does not fire when there is no active config path at all', () => {
        (vscode.window as unknown as { activeTextEditor: unknown }).activeTextEditor =
            fakeEditor('/home/user/cfg/config.bbx', 'bbx-config');
        // No push and no explicit setting — getActiveConfigPath() is undefined.

        argForActiveEditor();

        expect(vscode.window.showInformationMessage).not.toHaveBeenCalled();
    });

    test('the composer still proceeds to open on the file the user has open despite the hint', () => {
        (vscode.window as unknown as { activeTextEditor: unknown }).activeTextEditor =
            fakeEditor('/home/user/cfg/config.bbx', 'bbx-config');
        setResolvedConfigPath(pushedPath({ path: '/srv/custom/myconfig.bbx' }));

        const result = argForActiveEditor();

        expect(result).toEqual({});
    });

    test('the existing "open a config file first" message is unchanged for a non-bbx-config editor', () => {
        (vscode.window as unknown as { activeTextEditor: unknown }).activeTextEditor =
            fakeEditor('/home/user/notes.txt', 'plaintext');

        const result = argForActiveEditor();

        expect(result).toBeUndefined();
        expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
            'Open a config.bbx file first, then run the SETOPTS composer.'
        );
    });
});

describe('missing config file warning', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        resetConfigPathCacheForTests();
        (vscode.workspace as unknown as { textDocuments: unknown[] }).textDocuments = [];
        (vscode.workspace.getConfiguration as ReturnType<typeof vi.fn>).mockReturnValue({
            get: vi.fn((_key: string, def?: unknown) => def),
        });
    });

    /** Grabs the handler registered for the resolved-config-path push, after activation. */
    function getResolvedConfigPathHandler(): (params: ResolvedConfigPath) => void {
        activate(fakeContext());
        const call = clientOnNotificationMock.mock.calls
            .find(([method]) => method === RESOLVED_CONFIG_PATH_METHOD);
        return call![1];
    }

    test('a push for a missing config file warns once with the path in the message', () => {
        const onPush = getResolvedConfigPathHandler();

        onPush(pushedPath({ path: '/srv/custom/missing.bbx', exists: false }));

        expect(vscode.window.showWarningMessage).toHaveBeenCalledTimes(1);
        expect(vscode.window.showWarningMessage).toHaveBeenCalledWith(
            expect.stringContaining('/srv/custom/missing.bbx')
        );
    });

    test('a second push for the same missing path does not warn again', () => {
        const onPush = getResolvedConfigPathHandler();

        onPush(pushedPath({ path: '/srv/custom/missing.bbx', exists: false }));
        onPush(pushedPath({ path: '/srv/custom/missing.bbx', exists: false }));

        expect(vscode.window.showWarningMessage).toHaveBeenCalledTimes(1);
    });

    test('a push for a different missing path warns again', () => {
        const onPush = getResolvedConfigPathHandler();

        onPush(pushedPath({ path: '/srv/custom/missing.bbx', exists: false }));
        onPush(pushedPath({ path: '/srv/custom/other-missing.bbx', exists: false }));

        expect(vscode.window.showWarningMessage).toHaveBeenCalledTimes(2);
        expect(vscode.window.showWarningMessage).toHaveBeenLastCalledWith(
            expect.stringContaining('/srv/custom/other-missing.bbx')
        );
    });

    test('a push whose file exists never warns', () => {
        const onPush = getResolvedConfigPathHandler();

        onPush(pushedPath({ path: '/srv/custom/present.bbx', exists: true }));

        expect(vscode.window.showWarningMessage).not.toHaveBeenCalled();
    });
});
