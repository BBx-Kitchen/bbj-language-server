import { beforeEach, describe, expect, test, vi } from 'vitest';

/**
 * Unit coverage for the addWindow composer's VS Code UI wiring (issue #628): the
 * `registerAddWindowComposer` registration, its `CodeActionProvider`, its `bbj.composeAddWindow`
 * command (both new-insert and edit-in-place routing), and the composer-cue click path through
 * `openComposerAt`. Every other test file that imports `addwindow-composer-ui.ts` replaces it
 * with `vi.fn()`, so none of this wiring has run under test before this file.
 *
 * Modelled on `test/msgbox-composer-ui.test.ts`'s mocked-`vscode` harness and
 * `test/setopts-in-code-ui.test.ts`'s command-routing block: only `vscode` is mocked here, so
 * `registerAddWindowComposer`, `addWindowPanelArgAt`, `openAddWindowComposerPanel` and
 * `openComposerAt` all run for real.
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
    document: { uri: { toString(): string } };
    selection: { active: { line: number; character: number } };
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
import { registerAddWindowComposer, addWindowPanelArgAt } from '../src/addwindow-composer-ui.js';
import { AddWindowPanelArg } from '../src/addwindow-composer-webview.js';
import { openComposerAt } from '../src/composer-lens-command.js';
import { LENS_TARGET_GONE_TEXT } from '../src/composer-lens-contract.js';

const fakeContext = { subscriptions: [] as unknown[] };

function fakeDocument(text: string, uri = 'file:///a.bbj'): any {
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

function getRegisteredCommandHandler(): (arg?: AddWindowPanelArg) => void {
    const call = registerCommandMock.mock.calls.find((c: unknown[]) => c[0] === 'bbj.composeAddWindow');
    if (!call) throw new Error('bbj.composeAddWindow was not registered');
    return call[1] as (arg?: AddWindowPanelArg) => void;
}

// A single hex-literal flags argument: Resizable (0x1) + Close box (0x2) + Keyboard navigation (0x10000).
const LINE_FLAGS_ONLY = 'w! = sysgui!.addWindow(10, 10, 400, 300, "Main", $00010003$)';
// Same flags plus an event mask, both carrying one extra bit ($40 / $2) no catalog entry models.
const LINE_UNKNOWN_BITS = 'w! = sysgui!.addWindow(10, 10, 400, 300, "Main", $00010043$, $00000042$)';
// A call with a title argument but no flags literal yet.
const LINE_TITLE_NO_FLAGS = 'w! = sysgui!.addWindow(10, 10, 400, 300, "Main")';
// A call whose last argument before the flags literal is not a string literal.
const LINE_NO_TITLE_LITERAL = 'w! = sysgui!.addWindow(10, 10, 400, 300, title$, $00010003$)';
// Two independent addWindow calls on one line.
const LINE_TWO_CALLS = 'firstWin! = sysgui!.addWindow(1, 1, 100, 100, "A", $00000001$) : secondWin! = sysgui!.addWindow(2, 2, 200, 200, "B", $00000002$)';

describe('registerAddWindowComposer registration', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        activeTextEditor = undefined;
        textDocuments = [];
        fakeContext.subscriptions.length = 0;
    });

    test('registers exactly one command and one Code Action provider scoped to the bbj language with RefactorRewrite metadata, and pushes both disposables', () => {
        const commandDisposable = { id: 'command-disposable' };
        const providerDisposable = { id: 'provider-disposable' };
        registerCommandMock.mockReturnValueOnce(commandDisposable);
        registerCodeActionsProviderMock.mockReturnValueOnce(providerDisposable);

        registerAddWindowComposer(fakeContext as unknown as Parameters<typeof registerAddWindowComposer>[0]);

        expect(registerCommandMock).toHaveBeenCalledTimes(1);
        const [commandId, commandFn] = registerCommandMock.mock.calls[0];
        expect(commandId).toBe('bbj.composeAddWindow');
        expect(typeof commandFn).toBe('function');

        expect(registerCodeActionsProviderMock).toHaveBeenCalledTimes(1);
        const [languageArg, providerArg, metadataArg] = registerCodeActionsProviderMock.mock.calls[0];
        expect(languageArg).toEqual({ language: 'bbj' });
        expect(typeof (providerArg as { provideCodeActions: unknown }).provideCodeActions).toBe('function');
        expect(metadataArg).toEqual({ providedCodeActionKinds: [CodeActionKind.RefactorRewrite] });

        expect(fakeContext.subscriptions).toEqual([commandDisposable, providerDisposable]);
    });
});

describe('AddWindowCodeActionProvider', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        activeTextEditor = undefined;
        textDocuments = [];
    });

    function getProvider() {
        registerAddWindowComposer(fakeContext as unknown as Parameters<typeof registerAddWindowComposer>[0]);
        const call = registerCodeActionsProviderMock.mock.calls[0];
        return call[1] as { provideCodeActions: (doc: unknown, range: unknown) => Array<{ title: string; kind: unknown; command: { command: string; title: string; arguments: unknown[] } }> };
    }

    test('a call with a flags literal gets one Code Action with a literal label and a literal AddWindowPanelArg', () => {
        const provider = getProvider();
        const character = LINE_FLAGS_ONLY.indexOf('$00010003$');
        const actions = provider.provideCodeActions(fakeDocument(LINE_FLAGS_ONLY, 'file:///a.bbj'), fakeRange(0, character));

        expect(actions).toHaveLength(1);
        const action = actions[0];
        expect(action.title).toBe('Configure window flags (Close box · Resizable · Keyboard navigation)');
        expect(action.kind).toBe(CodeActionKind.RefactorRewrite);
        expect(action.command.command).toBe('bbj.composeAddWindow');
        expect(action.command.title).toBe(action.title);

        const flagsStart = LINE_FLAGS_ONLY.indexOf('$00010003$');
        const flagsEnd = flagsStart + '$00010003$'.length;
        const arg = action.command.arguments[0] as AddWindowPanelArg;
        expect(arg).toEqual({
            target: {
                uri: 'file:///a.bbj',
                line: 0,
                flagsRange: [flagsStart, flagsEnd],
                flagsInsertOffset: undefined,
                eventMaskRange: undefined,
                eventMaskInsertOffset: flagsEnd,
                preservedFlagBits: 0,
                preservedEventBits: 0,
            },
            initial: {
                flags: 0x00010003,
                eventMask: null,
                receiver: '',
                sysgui: 'sysgui!',
                x: '', y: '', width: '', height: '',
                title: '"Main"',
            },
        });
    });

    test('a call whose flags and event mask carry bits outside the catalogs preserves the unknown bits literally', () => {
        const provider = getProvider();
        const character = LINE_UNKNOWN_BITS.indexOf('$00010043$');
        const actions = provider.provideCodeActions(fakeDocument(LINE_UNKNOWN_BITS, 'file:///d.bbj'), fakeRange(0, character));

        expect(actions).toHaveLength(1);
        const arg = actions[0].command.arguments[0] as AddWindowPanelArg;
        expect(arg.target!.preservedFlagBits).toBe(64);
        expect(arg.target!.preservedEventBits).toBe(2);
        expect(actions[0].title).toBe('Configure window flags (Close box · Resizable · Keyboard navigation)');
    });

    test('a call with a title but no flags literal offers "Add window flags…" with the insert offset just past the title', () => {
        const provider = getProvider();
        const character = LINE_TITLE_NO_FLAGS.indexOf('"Main"');
        const actions = provider.provideCodeActions(fakeDocument(LINE_TITLE_NO_FLAGS, 'file:///e.bbj'), fakeRange(0, character));

        expect(actions).toHaveLength(1);
        expect(actions[0].title).toBe('Add window flags…');
        const arg = actions[0].command.arguments[0] as AddWindowPanelArg;
        expect(arg.target!.flagsRange).toBeUndefined();
        const expectedOffset = LINE_TITLE_NO_FLAGS.indexOf('"Main"') + '"Main"'.length;
        expect(arg.target!.flagsInsertOffset).toBe(expectedOffset);
    });

    test('a call with no string-literal argument falls back to a "Window" title in the initial preview', () => {
        const provider = getProvider();
        const character = LINE_NO_TITLE_LITERAL.indexOf('$00010003$');
        const actions = provider.provideCodeActions(fakeDocument(LINE_NO_TITLE_LITERAL, 'file:///f.bbj'), fakeRange(0, character));

        expect(actions).toHaveLength(1);
        const arg = actions[0].command.arguments[0] as AddWindowPanelArg;
        expect(arg.initial!.title).toBe('"Window"');
    });

    test('no action when the cursor sits outside every addWindow call on the line', () => {
        const provider = getProvider();
        const actions = provider.provideCodeActions(fakeDocument(LINE_FLAGS_ONLY, 'file:///g.bbj'), fakeRange(0, 0));
        expect(actions).toEqual([]);
    });

    test('no action on a line with no addWindow call at all', () => {
        const provider = getProvider();
        const line = 'x = 1 + 2';
        const actions = provider.provideCodeActions(fakeDocument(line, 'file:///h.bbj'), fakeRange(0, 3));
        expect(actions).toEqual([]);
    });

    test('two addWindow calls on one line: the action targets the call containing the cursor', () => {
        const provider = getProvider();
        const character = LINE_TWO_CALLS.indexOf('"B"');
        const actions = provider.provideCodeActions(fakeDocument(LINE_TWO_CALLS, 'file:///i.bbj'), fakeRange(0, character));

        expect(actions).toHaveLength(1);
        expect(actions[0].title).toBe('Configure window flags (Close box)');
    });
});

describe('addWindowPanelArgAt (direct)', () => {
    test('returns undefined when there is no addWindow call on the line', () => {
        expect(addWindowPanelArgAt('file:///x.bbj', 0, 'x = 1', 2)).toBeUndefined();
    });
});

describe('bbj.composeAddWindow command routing', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        activeTextEditor = undefined;
        textDocuments = [];
    });

    test('no argument and an active editor opens a NEW addWindow Composer panel; ready posts init with editMode false', async () => {
        activeTextEditor = {
            document: { uri: { toString: () => 'file:///new.bbj' } },
            selection: { active: { line: 2, character: 4 } },
        };
        const { panel, getHandler } = createFakePanel();
        createWebviewPanelMock.mockReturnValueOnce(panel);
        registerAddWindowComposer(fakeContext as unknown as Parameters<typeof registerAddWindowComposer>[0]);
        const commandHandler = getRegisteredCommandHandler();

        commandHandler(undefined);

        expect(createWebviewPanelMock).toHaveBeenCalledTimes(1);
        const [viewType, title] = createWebviewPanelMock.mock.calls[0];
        expect(viewType).toBe('bbjAddWindowComposer');
        expect(title).toBe('addWindow Composer');

        const handler = getHandler()!;
        await handler({ type: 'ready' });
        expect(panel.webview.postMessage).toHaveBeenCalledWith(expect.objectContaining({ type: 'init', editMode: false }));
    });

    test('no argument and no active editor shows the open-a-BBj-file message and creates no panel', () => {
        activeTextEditor = undefined;
        registerAddWindowComposer(fakeContext as unknown as Parameters<typeof registerAddWindowComposer>[0]);
        const commandHandler = getRegisteredCommandHandler();

        commandHandler(undefined);

        expect(showInformationMessageMock).toHaveBeenCalledWith('Open a BBj file first, then run the addWindow composer.');
        expect(createWebviewPanelMock).not.toHaveBeenCalled();
    });

    test('invoked with a Code Action-shaped argument opens "Edit addWindow flags"; a well-formed insert payload replaces the pinned flagsRange and disposes the panel', async () => {
        const { panel, getHandler } = createFakePanel();
        createWebviewPanelMock.mockReturnValueOnce(panel);
        registerAddWindowComposer(fakeContext as unknown as Parameters<typeof registerAddWindowComposer>[0]);
        const commandHandler = getRegisteredCommandHandler();

        const editArg: AddWindowPanelArg = {
            target: { uri: 'file:///edit.bbj', line: 3, flagsRange: [50, 61], preservedFlagBits: 0, preservedEventBits: 0 },
            initial: {
                flags: 0x00010003, eventMask: null,
                receiver: '', sysgui: 'sysgui!', x: '', y: '', width: '', height: '', title: '"Main"',
            },
        };
        commandHandler(editArg);

        expect(createWebviewPanelMock).toHaveBeenCalledTimes(1);
        const [, title] = createWebviewPanelMock.mock.calls[0];
        expect(title).toBe('Edit addWindow flags');

        const handler = getHandler()!;
        await handler({ type: 'ready' });
        await handler({
            type: 'insert',
            payload: {
                flags: [], eventMaskEnabled: false, eventMask: [],
                receiver: 'window!', sysgui: 'sysgui!', x: '10', y: '10', width: '400', height: '300', title: '"Win"',
            },
        });

        expect(applyEditMock).toHaveBeenCalledTimes(1);
        const edit = applyEditMock.mock.calls[0][0] as InstanceType<typeof FakeWorkspaceEdit>;
        expect(edit.replace).toHaveBeenCalledTimes(1);
        const [uriArg, rangeArg, textArg] = edit.replace.mock.calls[0];
        expect((uriArg as { __uri: string }).__uri).toBe('file:///edit.bbj');
        expect(rangeArg).toEqual(new FakeRange(new FakePosition(3, 50), new FakePosition(3, 61), undefined, undefined));
        expect(textArg).toBe('$00000000$');
        expect(panel.dispose).toHaveBeenCalledTimes(1);
    });
});

describe('composer-cue click through openComposerAt for kind addwindow', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        activeTextEditor = undefined;
        textDocuments = [];
    });

    test('opens "Edit addWindow flags" for a document in workspace.textDocuments whose current text still holds the call', async () => {
        const uri = 'file:///lens.bbj';
        const line = LINE_FLAGS_ONLY;
        textDocuments = [{ uri: { toString: () => uri }, lineAt: (_l: number) => ({ text: line }) }];
        const { panel } = createFakePanel();
        createWebviewPanelMock.mockReturnValueOnce(panel);
        const character = line.indexOf('$00010003$');

        await openComposerAt(fakeContext as unknown as Parameters<typeof openComposerAt>[0], { kind: 'addwindow', uri, line: 0, character });

        expect(createWebviewPanelMock).toHaveBeenCalledTimes(1);
        const [, title] = createWebviewPanelMock.mock.calls[0];
        expect(title).toBe('Edit addWindow flags');
        expect(showInformationMessageMock).not.toHaveBeenCalled();
    });

    test('shows LENS_TARGET_GONE_TEXT and opens no panel when the line no longer holds an addWindow call', async () => {
        const uri = 'file:///lens2.bbj';
        const line = 'w! = 1';
        textDocuments = [{ uri: { toString: () => uri }, lineAt: (_l: number) => ({ text: line }) }];

        await openComposerAt(fakeContext as unknown as Parameters<typeof openComposerAt>[0], { kind: 'addwindow', uri, line: 0, character: 2 });

        expect(showInformationMessageMock).toHaveBeenCalledWith(LENS_TARGET_GONE_TEXT);
        expect(createWebviewPanelMock).not.toHaveBeenCalled();
    });
});
