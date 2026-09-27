import { beforeEach, describe, expect, test, vi } from 'vitest';

/**
 * Unit coverage for the config.bbx SETOPTS composer's VS Code UI wiring (issue #628): the
 * `registerSetOptsComposer` registration, its bbx-config-scoped `CodeActionProvider`, its
 * `bbj.composeConfigSetopts` command (with and without an explicit argument, including the
 * active-config-path hint), `argForActiveEditor` directly, and the composer-cue click path
 * through `openComposerAt`. Every other test file that imports `setopts-composer-ui.ts` (a
 * different module from the already well-tested `setopts-in-code-ui.ts`) replaces it with
 * `vi.fn()`, so none of this wiring has run under test before this file.
 *
 * Modelled on `test/addwindow-composer-ui.test.ts`'s harness: only `vscode` is mocked here, so
 * `registerSetOptsComposer`, `setoptsConfigPanelArgAt`, `argForActiveEditor`,
 * `openSetOptsComposerPanel` and `openComposerAt` all run for real. The real
 * `config-path-cache.ts` is driven through its own setter/reset functions rather than mocked.
 */

const {
    registerCommandMock, registerCodeActionsProviderMock, createWebviewPanelMock,
    showInformationMessageMock, showWarningMessageMock, applyEditMock, executeCommandMock,
    FakeCodeAction, FakePosition, FakeRange, FakeWorkspaceEdit,
} = vi.hoisted(() => {
    class FakeCodeAction {
        command: unknown;
        constructor(public title: string, public kind: unknown) { }
    }
    class FakePosition {
        constructor(public line: number, public character: number) { }
    }
    class FakeRange {
        constructor(public startLine: number, public startCharacter: number, public endLine: number, public endCharacter: number) { }
    }
    class FakeWorkspaceEdit {
        insert = vi.fn();
        replace = vi.fn();
    }
    return {
        registerCommandMock: vi.fn(),
        registerCodeActionsProviderMock: vi.fn(),
        createWebviewPanelMock: vi.fn(),
        showInformationMessageMock: vi.fn(),
        showWarningMessageMock: vi.fn(),
        applyEditMock: vi.fn().mockResolvedValue(true),
        executeCommandMock: vi.fn(),
        FakeCodeAction, FakePosition, FakeRange, FakeWorkspaceEdit,
    };
});

let activeTextEditor: {
    document: {
        languageId: string;
        uri: { toString(): string; fsPath: string };
        lineCount: number;
        lineAt(line: number): { text: string };
    };
    selection: { active: { line: number } };
} | undefined;
let textDocuments: Array<{ uri: { toString(): string }; lineAt(line: number): { text: string } }> = [];

vi.mock('vscode', () => ({
    window: {
        createWebviewPanel: createWebviewPanelMock,
        get activeTextEditor() { return activeTextEditor; },
        showInformationMessage: showInformationMessageMock,
        showWarningMessage: showWarningMessageMock,
    },
    workspace: {
        applyEdit: applyEditMock,
        get textDocuments() { return textDocuments; },
        isTrusted: true,
        getConfiguration: () => ({ get: () => null, inspect: () => undefined }),
    },
    commands: {
        registerCommand: registerCommandMock,
        executeCommand: executeCommandMock,
    },
    languages: {
        registerCodeActionsProvider: registerCodeActionsProviderMock,
    },
    CodeActionKind: { RefactorRewrite: { value: 'refactor.rewrite' } },
    CodeAction: FakeCodeAction,
    Position: FakePosition,
    Range: FakeRange,
    WorkspaceEdit: FakeWorkspaceEdit,
    Uri: { parse: (s: string) => ({ toString: () => s, __uri: s }) },
    ViewColumn: { Beside: 2 },
}));

import { CodeActionKind } from 'vscode';
import { registerSetOptsComposer, setoptsConfigPanelArgAt, argForActiveEditor } from '../src/setopts-composer-ui.js';
import { SetOptsPanelArg } from '../src/setopts-composer-webview.js';
import { openComposerAt } from '../src/composer-lens-command.js';
import { LENS_TARGET_GONE_TEXT } from '../src/composer-lens-contract.js';
import { setResolvedConfigPath, resetConfigPathCacheForTests } from '../src/config-path-cache.js';

const fakeContext = { subscriptions: [] as unknown[] };

function fakeDocument(text: string, uri = 'file:///a.bbx'): any {
    return {
        lineAt: (_line: number) => ({ text }),
        uri: { toString: () => uri },
    };
}
function fakeRange(line: number, character: number): any {
    return { start: { line, character } };
}

interface FakePanel {
    webview: { html: string; postMessage: ReturnType<typeof vi.fn>; onDidReceiveMessage: ReturnType<typeof vi.fn> };
    dispose: ReturnType<typeof vi.fn>;
    onDidDispose: ReturnType<typeof vi.fn>;
}
function createFakePanel(): { panel: FakePanel; getHandler: () => ((msg: unknown) => unknown) | undefined } {
    let handler: ((msg: unknown) => unknown) | undefined;
    const panel: FakePanel = {
        webview: {
            html: '',
            postMessage: vi.fn(),
            onDidReceiveMessage: vi.fn((cb: (msg: unknown) => unknown) => {
                handler = cb;
                return { dispose: vi.fn() };
            }),
        },
        dispose: vi.fn(),
        onDidDispose: vi.fn(() => ({ dispose: vi.fn() })),
    };
    return { panel, getHandler: () => handler };
}

function getRegisteredCommandHandler(): (arg?: SetOptsPanelArg) => void {
    const call = registerCommandMock.mock.calls.find((c: unknown[]) => c[0] === 'bbj.composeConfigSetopts');
    if (!call) throw new Error('bbj.composeConfigSetopts was not registered');
    return call[1] as (arg?: SetOptsPanelArg) => void;
}

describe('registerSetOptsComposer registration', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        activeTextEditor = undefined;
        textDocuments = [];
        fakeContext.subscriptions.length = 0;
        resetConfigPathCacheForTests();
    });

    test('registers exactly one command and one Code Action provider scoped to bbx-config with RefactorRewrite metadata, and pushes both disposables', () => {
        const commandDisposable = { id: 'command-disposable' };
        const providerDisposable = { id: 'provider-disposable' };
        registerCommandMock.mockReturnValueOnce(commandDisposable);
        registerCodeActionsProviderMock.mockReturnValueOnce(providerDisposable);

        registerSetOptsComposer(fakeContext as unknown as Parameters<typeof registerSetOptsComposer>[0]);

        expect(registerCommandMock).toHaveBeenCalledTimes(1);
        const [commandId, commandFn] = registerCommandMock.mock.calls[0];
        expect(commandId).toBe('bbj.composeConfigSetopts');
        expect(typeof commandFn).toBe('function');

        expect(registerCodeActionsProviderMock).toHaveBeenCalledTimes(1);
        const [languageArg, providerArg, metadataArg] = registerCodeActionsProviderMock.mock.calls[0];
        expect(languageArg).toEqual({ language: 'bbx-config' });
        expect(typeof (providerArg as { provideCodeActions: unknown }).provideCodeActions).toBe('function');
        expect(metadataArg).toEqual({ providedCodeActionKinds: [CodeActionKind.RefactorRewrite] });

        expect(fakeContext.subscriptions).toEqual([commandDisposable, providerDisposable]);
    });
});

describe('SetOptsCodeActionProvider', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        activeTextEditor = undefined;
        textDocuments = [];
        resetConfigPathCacheForTests();
    });

    function getProvider() {
        registerSetOptsComposer(fakeContext as unknown as Parameters<typeof registerSetOptsComposer>[0]);
        const call = registerCodeActionsProviderMock.mock.calls[0];
        return call[1] as { provideCodeActions: (doc: unknown, range: unknown) => Array<{ title: string; kind: unknown; command: { command: string; title: string; arguments: unknown[] } }> };
    }

    test('a valid "SETOPTS <hex>" line gets one Code Action with a literal label and a literal target', () => {
        const provider = getProvider();
        const line = 'SETOPTS 80';
        const actions = provider.provideCodeActions(fakeDocument(line, 'file:///a.bbx'), fakeRange(0, 0));

        expect(actions).toHaveLength(1);
        const action = actions[0];
        expect(action.title).toBe('Configure SETOPTS (Byte 1: Error 63 on unassigned variables)');
        expect(action.kind).toBe(CodeActionKind.RefactorRewrite);
        expect(action.command.command).toBe('bbj.composeConfigSetopts');
        expect(action.command.title).toBe(action.title);

        const hexStart = line.indexOf('80');
        const hexEnd = hexStart + '80'.length;
        const arg = action.command.arguments[0] as SetOptsPanelArg;
        expect(arg).toEqual({
            target: {
                uri: 'file:///a.bbx',
                line: 0,
                hexRange: [hexStart, hexEnd],
                insertOffset: undefined,
                originalHex: '80',
            },
        });
    });

    test('a long vector whose summary exceeds 72 characters ellipsizes the label to a fixed 72-character parenthesized part', () => {
        const provider = getProvider();
        // Byte 1 = $FF$: every catalog bit for that byte is set, producing a long summary.
        const line = 'SETOPTS FF';
        const actions = provider.provideCodeActions(fakeDocument(line, 'file:///b.bbx'), fakeRange(0, 0));

        expect(actions).toHaveLength(1);
        const title = actions[0].title;
        expect(title.startsWith('Configure SETOPTS (')).toBe(true);
        expect(title.endsWith(')')).toBe(true);
        const summaryPart = title.slice('Configure SETOPTS ('.length, -1);
        expect(summaryPart.length).toBe(72);
        expect(summaryPart.endsWith('…')).toBe(true);
    });

    test('a bare "SETOPTS" keyword line offers "Compose SETOPTS…" with an insert offset and no hex range', () => {
        const provider = getProvider();
        const line = 'SETOPTS';
        const actions = provider.provideCodeActions(fakeDocument(line, 'file:///c.bbx'), fakeRange(0, 0));

        expect(actions).toHaveLength(1);
        expect(actions[0].title).toBe('Compose SETOPTS…');
        const arg = actions[0].command.arguments[0] as SetOptsPanelArg;
        expect(arg.target!.hexRange).toBeUndefined();
        expect(arg.target!.insertOffset).toBe(line.length);
    });

    test('no action on a non-SETOPTS line', () => {
        const provider = getProvider();
        const actions = provider.provideCodeActions(fakeDocument('x = 1', 'file:///d.bbx'), fakeRange(0, 0));
        expect(actions).toEqual([]);
    });

    test('no action on a malformed token line (trailing junk after the hex token)', () => {
        const provider = getProvider();
        const actions = provider.provideCodeActions(fakeDocument('SETOPTS 12 34', 'file:///e.bbx'), fakeRange(0, 0));
        expect(actions).toEqual([]);
    });
});

describe('setoptsConfigPanelArgAt (direct)', () => {
    test('returns undefined for a line with no SETOPTS keyword', () => {
        expect(setoptsConfigPanelArgAt('file:///x.bbx', 0, 'x = 1')).toBeUndefined();
    });
});

describe('bbj.composeConfigSetopts command routing', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        activeTextEditor = undefined;
        textDocuments = [];
        resetConfigPathCacheForTests();
    });

    test('an explicit argument opens "Edit SETOPTS" for that target without consulting the editor', () => {
        const { panel } = createFakePanel();
        createWebviewPanelMock.mockReturnValueOnce(panel);
        registerSetOptsComposer(fakeContext as unknown as Parameters<typeof registerSetOptsComposer>[0]);
        const commandHandler = getRegisteredCommandHandler();
        const explicitArg: SetOptsPanelArg = { target: { uri: 'file:///explicit.bbx', line: 4, hexRange: [8, 10], originalHex: '80' } };

        commandHandler(explicitArg);

        expect(createWebviewPanelMock).toHaveBeenCalledTimes(1);
        const [, title] = createWebviewPanelMock.mock.calls[0];
        expect(title).toBe('Edit SETOPTS');
        expect(showInformationMessageMock).not.toHaveBeenCalled();
    });

    test('no argument and no active editor shows the open-a-config-file message and opens no panel', () => {
        activeTextEditor = undefined;
        registerSetOptsComposer(fakeContext as unknown as Parameters<typeof registerSetOptsComposer>[0]);
        const commandHandler = getRegisteredCommandHandler();

        commandHandler(undefined);

        expect(showInformationMessageMock).toHaveBeenCalledWith('Open a config.bbx file first, then run the SETOPTS composer.');
        expect(createWebviewPanelMock).not.toHaveBeenCalled();
    });

    test('no argument and an active editor whose languageId is not bbx-config shows the same message and opens no panel', () => {
        activeTextEditor = {
            document: {
                languageId: 'bbj',
                uri: { toString: () => 'file:///f.bbj', fsPath: '/f.bbj' },
                lineCount: 1,
                lineAt: (_l: number) => ({ text: 'x = 1' }),
            },
            selection: { active: { line: 0 } },
        };
        registerSetOptsComposer(fakeContext as unknown as Parameters<typeof registerSetOptsComposer>[0]);
        const commandHandler = getRegisteredCommandHandler();

        commandHandler(undefined);

        expect(showInformationMessageMock).toHaveBeenCalledWith('Open a config.bbx file first, then run the SETOPTS composer.');
        expect(createWebviewPanelMock).not.toHaveBeenCalled();
    });

    test('an editor whose file has a SETOPTS line on line 2 opens "Edit SETOPTS" for that line (first SETOPTS line wins); apply writes a literal hex digest', async () => {
        const lines = ['x=1', 'SETOPTS 80', 'SETOPTS 40'];
        activeTextEditor = {
            document: {
                languageId: 'bbx-config',
                uri: { toString: () => 'file:///g.bbx', fsPath: '/g.bbx' },
                lineCount: lines.length,
                lineAt: (l: number) => ({ text: lines[l] }),
            },
            selection: { active: { line: 0 } },
        };
        const { panel, getHandler } = createFakePanel();
        createWebviewPanelMock.mockReturnValueOnce(panel);
        registerSetOptsComposer(fakeContext as unknown as Parameters<typeof registerSetOptsComposer>[0]);
        const commandHandler = getRegisteredCommandHandler();

        commandHandler(undefined);

        expect(createWebviewPanelMock).toHaveBeenCalledTimes(1);
        const [, title] = createWebviewPanelMock.mock.calls[0];
        expect(title).toBe('Edit SETOPTS');

        const handler = getHandler()!;
        await handler({ type: 'ready' });
        await handler({ type: 'apply', payload: { checked: [], maskComma: '', maskDot: '', rawTail: '' } });

        expect(applyEditMock).toHaveBeenCalledTimes(1);
        const edit = applyEditMock.mock.calls[0][0] as InstanceType<typeof FakeWorkspaceEdit>;
        expect(edit.replace).toHaveBeenCalledTimes(1);
        const [uriArg, rangeArg, textArg] = edit.replace.mock.calls[0];
        expect((uriArg as { __uri: string }).__uri).toBe('file:///g.bbx');
        expect(rangeArg).toEqual(new FakeRange(1, 8, 1, 10));
        expect(textArg).toBe('00');
        expect(panel.dispose).toHaveBeenCalledTimes(1);
    });

    test('an editor with no SETOPTS line opens "SETOPTS Composer" (NEW mode); a well-formed apply payload inserts at the captured cursor line and disposes the panel', async () => {
        const lines = ['x=1', 'y=2'];
        activeTextEditor = {
            document: {
                languageId: 'bbx-config',
                uri: { toString: () => 'file:///new-config.bbx', fsPath: '/new-config.bbx' },
                lineCount: lines.length,
                lineAt: (l: number) => ({ text: lines[l] }),
            },
            selection: { active: { line: 1 } },
        };
        const { panel, getHandler } = createFakePanel();
        createWebviewPanelMock.mockReturnValueOnce(panel);
        registerSetOptsComposer(fakeContext as unknown as Parameters<typeof registerSetOptsComposer>[0]);
        const commandHandler = getRegisteredCommandHandler();

        commandHandler(undefined);

        expect(createWebviewPanelMock).toHaveBeenCalledTimes(1);
        const [, title] = createWebviewPanelMock.mock.calls[0];
        expect(title).toBe('SETOPTS Composer');

        const handler = getHandler()!;
        await handler({ type: 'ready' });
        await handler({ type: 'apply', payload: { checked: [], maskComma: '', maskDot: '', rawTail: '' } });

        expect(applyEditMock).toHaveBeenCalledTimes(1);
        const edit = applyEditMock.mock.calls[0][0] as InstanceType<typeof FakeWorkspaceEdit>;
        expect(edit.insert).toHaveBeenCalledTimes(1);
        const [uriArg, positionArg, textArg] = edit.insert.mock.calls[0];
        expect((uriArg as { toString(): string }).toString()).toBe('file:///new-config.bbx');
        expect(positionArg).toEqual(new FakePosition(1, 0));
        expect(textArg).toBe('SETOPTS 00000000\n');
        expect(panel.dispose).toHaveBeenCalledTimes(1);
    });

    test('when setResolvedConfigPath names a different active config path, a non-blocking hint is shown and the panel still opens', () => {
        setResolvedConfigPath({ path: '/other/config.bbx', source: 'setting', exists: true, problem: null });
        const lines = ['x=1'];
        activeTextEditor = {
            document: {
                languageId: 'bbx-config',
                uri: { toString: () => 'file:///active/config.bbx', fsPath: '/active/config.bbx' },
                lineCount: lines.length,
                lineAt: (l: number) => ({ text: lines[l] }),
            },
            selection: { active: { line: 0 } },
        };
        const { panel } = createFakePanel();
        createWebviewPanelMock.mockReturnValueOnce(panel);
        registerSetOptsComposer(fakeContext as unknown as Parameters<typeof registerSetOptsComposer>[0]);
        const commandHandler = getRegisteredCommandHandler();

        commandHandler(undefined);

        expect(showInformationMessageMock).toHaveBeenCalledWith(
            "This isn't the active config file — BBj tooling reads: /other/config.bbx",
        );
        expect(createWebviewPanelMock).toHaveBeenCalledTimes(1);
    });
});

describe('argForActiveEditor (direct)', () => {
    beforeEach(() => {
        activeTextEditor = undefined;
        resetConfigPathCacheForTests();
        showInformationMessageMock.mockClear();
    });

    test('returns the same target argument the command routing opens for a file with an existing SETOPTS line', () => {
        const lines = ['x=1', 'SETOPTS 80'];
        activeTextEditor = {
            document: {
                languageId: 'bbx-config',
                uri: { toString: () => 'file:///h.bbx', fsPath: '/h.bbx' },
                lineCount: lines.length,
                lineAt: (l: number) => ({ text: lines[l] }),
            },
            selection: { active: { line: 0 } },
        };

        const result = argForActiveEditor();

        expect(result).toEqual({
            target: {
                uri: 'file:///h.bbx',
                line: 1,
                hexRange: [8, 10],
                insertOffset: undefined,
                originalHex: '80',
            },
        });
    });
});

describe('composer-cue click through openComposerAt for kind setopts-config', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        activeTextEditor = undefined;
        textDocuments = [];
        resetConfigPathCacheForTests();
    });

    test('opens "Edit SETOPTS" for a document in workspace.textDocuments whose current text still parses as a SETOPTS line', async () => {
        const uri = 'file:///lens.bbx';
        const line = 'SETOPTS 80';
        textDocuments = [{ uri: { toString: () => uri }, lineAt: (_l: number) => ({ text: line }) }];
        const { panel } = createFakePanel();
        createWebviewPanelMock.mockReturnValueOnce(panel);

        await openComposerAt(fakeContext as unknown as Parameters<typeof openComposerAt>[0], { kind: 'setopts-config', uri, line: 0, character: 0 });

        expect(createWebviewPanelMock).toHaveBeenCalledTimes(1);
        const [, title] = createWebviewPanelMock.mock.calls[0];
        expect(title).toBe('Edit SETOPTS');
        expect(showInformationMessageMock).not.toHaveBeenCalled();
    });

    test('shows LENS_TARGET_GONE_TEXT and opens no panel when the line no longer parses as SETOPTS', async () => {
        const uri = 'file:///lens2.bbx';
        const line = 'x = 1';
        textDocuments = [{ uri: { toString: () => uri }, lineAt: (_l: number) => ({ text: line }) }];

        await openComposerAt(fakeContext as unknown as Parameters<typeof openComposerAt>[0], { kind: 'setopts-config', uri, line: 0, character: 0 });

        expect(showInformationMessageMock).toHaveBeenCalledWith(LENS_TARGET_GONE_TEXT);
        expect(createWebviewPanelMock).not.toHaveBeenCalled();
    });
});
