import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { beforeEach, describe, expect, test, vi } from 'vitest';

/**
 * Unit coverage for the VS Code MSGBOX composer UI's compose-and-replace mode (#648):
 *   - `MsgboxCodeActionProvider` labels (unchanged existing labels + the new replace-mode label)
 *   - `msgboxPanelArgFromDecode`, the shared function the lightbulb and any future cue dispatcher use
 *   - the webview's replace banner markup/script (read as text — no real webview host needed)
 *
 * Modelled on test/setopts-in-code-ui.test.ts's mocked-`vscode` harness so no real VS Code
 * extension host or webview is needed.
 */

const {
    registerCommandMock, registerCodeActionsProviderMock, createWebviewPanelMock, showInformationMessageMock,
    showWarningMessageMock, applyEditMock, showQuickPickMock, createQuickPickMock, showInputBoxMock,
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
        // Resolves to the first catalog item — the picker always advances the wizard
        // deterministically in these tests; individual selections are not under test here.
        showQuickPickMock: vi.fn((items: Array<{ value: number }>) => Promise.resolve(items[0])),
        createQuickPickMock: vi.fn(() => {
            const qp = {
                items: [] as Array<{ value: number; label: string }>,
                selectedItems: [] as Array<{ value: number; label: string }>,
                onDidAccept: vi.fn((cb: () => void) => { qp.__accept = cb; }),
                onDidHide: vi.fn((cb: () => void) => { qp.__hide = cb; }),
                show: vi.fn(() => { qp.__accept?.(); }),
                hide: vi.fn(),
                dispose: vi.fn(),
                __accept: undefined as (() => void) | undefined,
                __hide: undefined as (() => void) | undefined,
            };
            return qp;
        }),
        showInputBoxMock: vi.fn(),
        FakeCodeAction, FakePosition, FakeRange, FakeWorkspaceEdit,
    };
});

let textDocuments: Array<{ uri: { toString(): string }; lineAt(line: number): { text: string } }> = [];
let activeTextEditor: {
    document: { uri: { toString(): string }; lineCount: number; lineAt(line: number): { text: string } };
    selection: { active: { line: number; character: number } };
    edit: ReturnType<typeof vi.fn>;
} | undefined;

vi.mock('vscode', () => ({
    window: {
        createWebviewPanel: createWebviewPanelMock,
        get activeTextEditor() { return activeTextEditor; },
        showInformationMessage: showInformationMessageMock,
        showWarningMessage: showWarningMessageMock,
        showQuickPick: showQuickPickMock,
        createQuickPick: createQuickPickMock,
        showInputBox: showInputBoxMock,
    },
    workspace: {
        get textDocuments() { return textDocuments; },
        applyEdit: applyEditMock,
    },
    commands: {
        registerCommand: registerCommandMock,
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

import {
    registerMsgboxComposer, msgboxPanelArgFromDecode, captureComposeArgTarget,
    runComposeMsgboxVisualCommand, msgboxPanelArgAtCursor,
} from '../src/msgbox-composer-ui.js';
import { openMsgboxComposerPanel, msgboxCallStillMatches, MsgboxPanelArg, MsgboxEditTarget } from '../src/msgbox-composer-webview.js';
import { decodeMsgboxCall, MSGBOX_REPLACE_BANNER_TEXT } from '../src/msgbox-composer.js';

const fakeContext = { subscriptions: [] } as unknown as Parameters<typeof openMsgboxComposerPanel>[0];

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

describe('MsgboxCodeActionProvider labels (#648)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    function getProvider() {
        registerMsgboxComposer(fakeContext as unknown as Parameters<typeof registerMsgboxComposer>[0]);
        const call = registerCodeActionsProviderMock.mock.calls[0];
        return call[1] as any;
    }

    test('an integer-literal call keeps its existing "Configure" label and argument shape', () => {
        const provider = getProvider();
        const line = 'r = MSGBOX("Hi", 36, "T")';
        const actions = provider.provideCodeActions(fakeDocument(line), fakeRange(0, line.indexOf('36')));
        expect(actions).toHaveLength(1);
        expect(actions[0].title).toBe('Configure MSGBOX options (Yes, No · Question icon)');
        const arg: MsgboxPanelArg = actions[0].command.arguments[0];
        expect(arg.target?.callStart).toBe(line.indexOf('MSGBOX'));
        expect(arg.replace).toBeUndefined();
    });

    test('a bare call keeps its existing "Add MSGBOX options…" label, unchanged', () => {
        const provider = getProvider();
        const line = 'MSGBOX("Hi")';
        const actions = provider.provideCodeActions(fakeDocument(line), fakeRange(0, 5));
        expect(actions).toHaveLength(1);
        expect(actions[0].title).toBe('Add MSGBOX options…');
        const arg: MsgboxPanelArg = actions[0].command.arguments[0];
        expect(arg.replace).toBeUndefined();
    });

    test('an undecodable options expression opens compose-and-replace mode', () => {
        const provider = getProvider();
        const line = 'r = MSGBOX("Hi", flags%, "T")';
        const actions = provider.provideCodeActions(fakeDocument(line), fakeRange(0, line.indexOf('flags%')));
        expect(actions).toHaveLength(1);
        expect(actions[0].title).toBe('Compose MSGBOX options (replaces expression)…');
        const arg: MsgboxPanelArg = actions[0].command.arguments[0];
        expect(arg.target?.callStart).toBe(line.indexOf('MSGBOX'));
        expect(arg.target?.callEnd).toBe(line.length);
        expect(arg.replace).toEqual({ originalOptions: 'flags%', banner: MSGBOX_REPLACE_BANNER_TEXT });
    });
});

describe('msgboxPanelArgFromDecode (#648)', () => {
    test('returns the same { arg, label } shape the lightbulb uses, and undefined for not-found', () => {
        const line = 'r = MSGBOX("Hi", 36, "T")';
        const decoded = decodeMsgboxCall(line);
        const result = msgboxPanelArgFromDecode('file:///a.bbj', 0, line, decoded);
        expect(result?.label).toBe('Configure MSGBOX options (Yes, No · Question icon)');
        expect(result?.arg.initial?.buttonSet).toBe(4);
        expect(result?.arg.target?.callText).toBe(line.slice(decoded.edit!.callStart, decoded.edit!.callEnd));
        expect(msgboxPanelArgFromDecode('file:///a.bbj', 0, line, { found: false })).toBeUndefined();
    });

    test('produces the replace-mode label and arg.replace for an undecodable expression', () => {
        const line = 'r = MSGBOX("Hi", flags%, "T")';
        const decoded = decodeMsgboxCall(line);
        const result = msgboxPanelArgFromDecode('file:///a.bbj', 0, line, decoded);
        expect(result?.label).toBe('Compose MSGBOX options (replaces expression)…');
        expect(result?.arg.replace).toEqual({ originalOptions: 'flags%', banner: MSGBOX_REPLACE_BANNER_TEXT });
    });

    test('produces the completing label and a target.incomplete arg for an unfinished call', () => {
        const line = 'x = MSGBOX(';
        const decoded = decodeMsgboxCall(line, 11);
        const result = msgboxPanelArgFromDecode('file:///a.bbj', 0, line, decoded);
        expect(result?.label).toBe('Complete MSGBOX call…');
        expect(result?.arg.target?.incomplete).toBe(true);
        expect(result?.arg.target?.callStart).toBe(4);
        expect(result?.arg.target?.callEnd).toBe(11);
        expect(result?.arg.target?.callText).toBe('MSGBOX(');
        expect(result?.arg.replace).toBeUndefined();
    });
});

describe('msgboxCallStillMatches (#648)', () => {
    test('true when the call span still reads the captured text, false after it changes', () => {
        const target: MsgboxEditTarget = {
            uri: 'file:///a.bbj', line: 0, callStart: 4, callEnd: 25,
            callText: 'MSGBOX("Hi", 36, "T")', trailingArgs: [],
        };
        expect(msgboxCallStillMatches('r = MSGBOX("Hi", 36, "T")', target)).toBe(true);
        expect(msgboxCallStillMatches('r = MSGBOX("Bye", 36, "T")', target)).toBe(false);
    });
});

describe('msgboxCallStillMatches is span-exact', () => {
    test('a same-prefix but grown unterminated call is refused even though the slice still matches', () => {
        const target: MsgboxEditTarget = {
            uri: 'file:///a.bbj', line: 0, callStart: 4, callEnd: 11,
            callText: 'MSGBOX(', trailingArgs: [],
        };
        expect(msgboxCallStillMatches('x = MSGBOX(', target)).toBe(true);
        expect(msgboxCallStillMatches('x = MSGBOX("Hi"', target)).toBe(false);
    });
});

describe('Panel init message carries replace (#648)', () => {
    test('init message includes replace when in compose-and-replace mode, null otherwise', () => {
        const { panel: panelA, getHandler: getHandlerA } = createFakePanel();
        createWebviewPanelMock.mockReturnValueOnce(panelA);
        const replaceArg: MsgboxPanelArg = {
            target: { uri: 'file:///a.bbj', line: 0, callStart: 0, callEnd: 10, callText: 'MSGBOX(...)', trailingArgs: [] },
            initial: { message: '"Hi"', title: '', buttonSet: 0, icon: 0, defaultButton: 0, flags: [], customButtons: [] },
            replace: { originalOptions: 'flags%', banner: MSGBOX_REPLACE_BANNER_TEXT },
        };
        openMsgboxComposerPanel(fakeContext, replaceArg);
        getHandlerA()!({ type: 'ready' });
        const initA = panelA.webview.postMessage.mock.calls.find(c => (c[0] as { type: string }).type === 'init');
        expect((initA![0] as { replace: unknown }).replace).toEqual(replaceArg.replace);

        const { panel: panelB, getHandler: getHandlerB } = createFakePanel();
        createWebviewPanelMock.mockReturnValueOnce(panelB);
        const decodableArg: MsgboxPanelArg = {
            target: { uri: 'file:///a.bbj', line: 0, callStart: 0, callEnd: 10, callText: 'MSGBOX(...)', trailingArgs: [] },
            initial: { message: '"Hi"', title: '', buttonSet: 4, icon: 32, defaultButton: 0, flags: [], customButtons: [] },
        };
        openMsgboxComposerPanel(fakeContext, decodableArg);
        getHandlerB()!({ type: 'ready' });
        const initB = panelB.webview.postMessage.mock.calls.find(c => (c[0] as { type: string }).type === 'init');
        expect((initB![0] as { replace: unknown }).replace).toBeNull();
    });
});

describe('openMsgboxComposerPanel EDIT mode staleness guard (#648)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        textDocuments = [];
    });

    function fakeDocument(text: string, uri: string): { uri: { toString(): string }; lineAt(line: number): { text: string } } {
        return {
            uri: { toString: () => uri },
            lineAt: (_line: number) => ({ text }),
        };
    }

    test('EDIT mode replaces the call span in place and disposes the panel when the call is unchanged', async () => {
        const line = 'r = MSGBOX("Hi", 36, "T")';
        const target: MsgboxEditTarget = {
            uri: 'file:///a.bbj', line: 0, callStart: 4, callEnd: 25, callText: 'MSGBOX("Hi", 36, "T")', trailingArgs: [],
        };
        textDocuments = [fakeDocument(line, 'file:///a.bbj')];
        const arg: MsgboxPanelArg = {
            target,
            initial: { message: '"Hi"', title: '"T"', buttonSet: 4, icon: 32, defaultButton: 0, flags: [], customButtons: [] },
        };
        const { panel, getHandler } = createFakePanel();
        createWebviewPanelMock.mockReturnValueOnce(panel);

        openMsgboxComposerPanel(fakeContext, arg);
        const handler = getHandler()!;
        const payload = {
            buttonSet: 4, icon: 32, defaultButton: 0, flags: [], customButtons: [],
            message: '"Hi"', title: '"T"', assignTo: '', useConstants: false,
        };
        await handler({ type: 'insert', payload });

        expect(applyEditMock).toHaveBeenCalledTimes(1);
        const edit = applyEditMock.mock.calls[0][0] as InstanceType<typeof FakeWorkspaceEdit>;
        expect(edit.replace).toHaveBeenCalledTimes(1);
        expect(showWarningMessageMock).not.toHaveBeenCalled();
        expect(panel.dispose).toHaveBeenCalledTimes(1);
    });

    test('EDIT mode refuses to write and does not dispose when the document is missing', async () => {
        const target: MsgboxEditTarget = {
            uri: 'file:///gone.bbj', line: 0, callStart: 4, callEnd: 25, callText: 'MSGBOX("Hi", 36, "T")', trailingArgs: [],
        };
        textDocuments = [];
        const arg: MsgboxPanelArg = {
            target,
            initial: { message: '"Hi"', title: '"T"', buttonSet: 4, icon: 32, defaultButton: 0, flags: [], customButtons: [] },
        };
        const { panel, getHandler } = createFakePanel();
        createWebviewPanelMock.mockReturnValueOnce(panel);

        openMsgboxComposerPanel(fakeContext, arg);
        const handler = getHandler()!;
        const payload = {
            buttonSet: 4, icon: 32, defaultButton: 0, flags: [], customButtons: [],
            message: '"Hi"', title: '"T"', assignTo: '', useConstants: false,
        };
        await handler({ type: 'insert', payload });

        expect(applyEditMock).not.toHaveBeenCalled();
        expect(showWarningMessageMock).toHaveBeenCalledWith('The MSGBOX() call changed since the composer opened; nothing was applied.');
        expect(panel.dispose).not.toHaveBeenCalled();
    });

    test('EDIT mode refuses to write when the call text changed since the composer opened', async () => {
        const target: MsgboxEditTarget = {
            uri: 'file:///a.bbj', line: 0, callStart: 4, callEnd: 25, callText: 'MSGBOX("Hi", 36, "T")', trailingArgs: [],
        };
        textDocuments = [fakeDocument('r = MSGBOX("Bye", 36, "T")', 'file:///a.bbj')];
        const arg: MsgboxPanelArg = {
            target,
            initial: { message: '"Hi"', title: '"T"', buttonSet: 4, icon: 32, defaultButton: 0, flags: [], customButtons: [] },
        };
        const { panel, getHandler } = createFakePanel();
        createWebviewPanelMock.mockReturnValueOnce(panel);

        openMsgboxComposerPanel(fakeContext, arg);
        const handler = getHandler()!;
        const payload = {
            buttonSet: 4, icon: 32, defaultButton: 0, flags: [], customButtons: [],
            message: '"Hi"', title: '"T"', assignTo: '', useConstants: false,
        };
        await handler({ type: 'insert', payload });

        expect(applyEditMock).not.toHaveBeenCalled();
        expect(showWarningMessageMock).toHaveBeenCalledWith('The MSGBOX() call changed since the composer opened; nothing was applied.');
        expect(panel.dispose).not.toHaveBeenCalled();
    });
});

describe('openMsgboxComposerPanel completing an unfinished call', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        textDocuments = [];
    });

    const target: MsgboxEditTarget = {
        uri: 'file:///a.bbj', line: 0, callStart: 4, callEnd: 11,
        callText: 'MSGBOX(', trailingArgs: [], incomplete: true,
    };
    const arg: MsgboxPanelArg = {
        target,
        initial: { message: '', title: '', buttonSet: 0, icon: 0, defaultButton: 0, flags: [], customButtons: [] },
    };

    test('opens a panel titled "Complete MSGBOX call" and posts completing true / replace null on ready', () => {
        const { panel, getHandler } = createFakePanel();
        createWebviewPanelMock.mockReturnValueOnce(panel);

        openMsgboxComposerPanel(fakeContext, arg);
        expect(createWebviewPanelMock.mock.calls[0][1]).toBe('Complete MSGBOX call');

        getHandler()!({ type: 'ready' });
        const initCall = panel.webview.postMessage.mock.calls.find(c => (c[0] as { type: string }).type === 'init');
        expect(initCall![0]).toMatchObject({ completing: true, replace: null });
    });

    test('insert replaces the captured span with the composed call and no assignment prefix, then disposes the panel', async () => {
        textDocuments = [fakeDocument('x = MSGBOX(', 'file:///a.bbj')];
        const { panel, getHandler } = createFakePanel();
        createWebviewPanelMock.mockReturnValueOnce(panel);

        openMsgboxComposerPanel(fakeContext, arg);
        const handler = getHandler()!;
        const payload = {
            buttonSet: 0, icon: 64, defaultButton: 0, flags: [], customButtons: [],
            message: '"Saved"', title: '', assignTo: 'ret!', useConstants: false,
        };
        await handler({ type: 'insert', payload });

        expect(applyEditMock).toHaveBeenCalledTimes(1);
        const edit = applyEditMock.mock.calls[0][0] as InstanceType<typeof FakeWorkspaceEdit>;
        expect(edit.replace).toHaveBeenCalledTimes(1);
        const [, rangeArg, text] = edit.replace.mock.calls[0];
        expect(rangeArg).toEqual(new FakeRange(0, 4, 0, 11));
        expect(text).toBe('MSGBOX("Saved", 64)');
        expect(panel.dispose).toHaveBeenCalledTimes(1);
    });

    test('a grown call refuses the write and shows the stale warning, keeping the panel open', async () => {
        textDocuments = [fakeDocument('x = MSGBOX("S', 'file:///a.bbj')];
        const { panel, getHandler } = createFakePanel();
        createWebviewPanelMock.mockReturnValueOnce(panel);

        openMsgboxComposerPanel(fakeContext, arg);
        const handler = getHandler()!;
        const payload = {
            buttonSet: 0, icon: 64, defaultButton: 0, flags: [], customButtons: [],
            message: '"Saved"', title: '', assignTo: 'ret!', useConstants: false,
        };
        await handler({ type: 'insert', payload });

        expect(applyEditMock).not.toHaveBeenCalled();
        expect(showWarningMessageMock).toHaveBeenCalledWith('The MSGBOX() call changed since the composer opened; nothing was applied.');
        expect(panel.dispose).not.toHaveBeenCalled();
    });
});

describe('bbj.composeMsgbox picker re-resolves its target before writing (#532)', () => {
    let quickPickSideEffect: (() => void) | undefined;

    beforeEach(() => {
        vi.clearAllMocks();
        textDocuments = [];
        activeTextEditor = undefined;
        quickPickSideEffect = undefined;
        showQuickPickMock.mockImplementation((items: Array<{ value: number }>) => {
            const effect = quickPickSideEffect;
            quickPickSideEffect = undefined;
            effect?.();
            return Promise.resolve(items[0]);
        });
    });

    function getComposeHandler(): (arg?: unknown) => Promise<void> | void {
        registerMsgboxComposer(fakeContext);
        const call = registerCommandMock.mock.calls.find(c => c[0] === 'bbj.composeMsgbox')!;
        return call[1] as (arg?: unknown) => Promise<void> | void;
    }

    function makeFakeEditor(uri: string, lines: string[]) {
        const editBuilder = { replace: vi.fn(), insert: vi.fn() };
        const editor = {
            document: {
                uri: { toString: () => uri },
                get lineCount() { return lines.length; },
                lineAt: (n: number) => ({ text: lines[n] }),
            },
            selection: { active: { line: 0, character: 0 } },
            edit: vi.fn((cb: (b: typeof editBuilder) => void) => { cb(editBuilder); return Promise.resolve(true); }),
        };
        return { editor, editBuilder };
    }

    test('an unchanged edit-arg call replaces exactly the captured token span', async () => {
        const lines = ['r = MSGBOX("Hi", 36, "T")'];
        const { editor, editBuilder } = makeFakeEditor('file:///a.bbj', lines);
        activeTextEditor = editor as unknown as typeof activeTextEditor;

        await getComposeHandler()({ edit: { line: 0, exprRange: [17, 19], current: 36 } });

        expect(editor.edit).toHaveBeenCalledTimes(1);
        expect(editBuilder.replace).toHaveBeenCalledTimes(1);
        const [rangeArg, textArg] = editBuilder.replace.mock.calls[0];
        expect(rangeArg).toEqual(new FakeRange(0, 17, 0, 19));
        expect(textArg).toBe('0');
        expect(showWarningMessageMock).not.toHaveBeenCalled();
    });

    test('a line inserted above during the wizard aborts with the stale warning and no edit', async () => {
        const lines = ['r = MSGBOX("Hi", 36, "T")'];
        const { editor, editBuilder } = makeFakeEditor('file:///a.bbj', lines);
        activeTextEditor = editor as unknown as typeof activeTextEditor;
        quickPickSideEffect = () => { lines.unshift(''); };

        await getComposeHandler()({ edit: { line: 0, exprRange: [17, 19], current: 36 } });

        expect(editor.edit).not.toHaveBeenCalled();
        expect(editBuilder.replace).not.toHaveBeenCalled();
        expect(showWarningMessageMock).toHaveBeenCalledWith('The MSGBOX() call changed since the composer opened; nothing was applied.');
    });

    test('the message text changing during the wizard aborts with the stale warning and no edit', async () => {
        const lines = ['r = MSGBOX("Hi", 36, "T")'];
        const { editor, editBuilder } = makeFakeEditor('file:///a.bbj', lines);
        activeTextEditor = editor as unknown as typeof activeTextEditor;
        quickPickSideEffect = () => { lines[0] = 'r = MSGBOX("Bye", 36, "T")'; };

        await getComposeHandler()({ edit: { line: 0, exprRange: [17, 19], current: 36 } });

        expect(editor.edit).not.toHaveBeenCalled();
        expect(editBuilder.replace).not.toHaveBeenCalled();
        expect(showWarningMessageMock).toHaveBeenCalledWith('The MSGBOX() call changed since the composer opened; nothing was applied.');
    });

    test('an unterminated call that grows during the wizard is refused by the span-exact check', async () => {
        const lines = ['r = MSGBOX("Hi"'];
        const { editor, editBuilder } = makeFakeEditor('file:///a.bbj', lines);
        activeTextEditor = editor as unknown as typeof activeTextEditor;
        quickPickSideEffect = () => { lines[0] = 'r = MSGBOX("Hi", 1'; };

        await getComposeHandler()({ insert: { line: 0, character: 15 } });

        expect(editor.edit).not.toHaveBeenCalled();
        expect(editBuilder.insert).not.toHaveBeenCalled();
        expect(showWarningMessageMock).toHaveBeenCalledWith('The MSGBOX() call changed since the composer opened; nothing was applied.');
    });

    test('the edit-arg token already differing before the wizard opens aborts before showQuickPick is called', async () => {
        const lines = ['r = MSGBOX("Hi", 4, "T")'];
        const { editor } = makeFakeEditor('file:///a.bbj', lines);
        activeTextEditor = editor as unknown as typeof activeTextEditor;

        await getComposeHandler()({ edit: { line: 0, exprRange: [17, 19], current: 36 } });

        expect(showQuickPickMock).not.toHaveBeenCalled();
        expect(editor.edit).not.toHaveBeenCalled();
        expect(showWarningMessageMock).toHaveBeenCalledWith('The MSGBOX() call changed since the composer opened; nothing was applied.');
    });

    test('the document losing its lines during the wizard aborts with the stale warning and no edit', async () => {
        const lines = ['r = MSGBOX("Hi", 36, "T")'];
        const { editor, editBuilder } = makeFakeEditor('file:///a.bbj', lines);
        activeTextEditor = editor as unknown as typeof activeTextEditor;
        quickPickSideEffect = () => { lines.length = 0; };

        await getComposeHandler()({ edit: { line: 0, exprRange: [17, 19], current: 36 } });

        expect(editor.edit).not.toHaveBeenCalled();
        expect(editBuilder.replace).not.toHaveBeenCalled();
        expect(showWarningMessageMock).toHaveBeenCalledWith('The MSGBOX() call changed since the composer opened; nothing was applied.');
    });

    test('no argument on a plain statement composes new at the cursor, unchanged', async () => {
        const lines = ['x = 1'];
        const { editor, editBuilder } = makeFakeEditor('file:///a.bbj', lines);
        activeTextEditor = editor as unknown as typeof activeTextEditor;
        showInputBoxMock.mockResolvedValueOnce('"Message"').mockResolvedValueOnce('');

        await getComposeHandler()();

        expect(editor.edit).toHaveBeenCalledTimes(1);
        expect(editBuilder.insert).toHaveBeenCalledTimes(1);
        const [, textArg] = editBuilder.insert.mock.calls[0];
        expect(textArg).toBe('ret! = MSGBOX("Message")');
        expect(showWarningMessageMock).not.toHaveBeenCalled();
    });
});

describe('captureComposeArgTarget (#532)', () => {
    test('edit: requires the same exprRange and exprValue at the argument line', () => {
        const line = 'r = MSGBOX("Hi", 36, "T")';
        const target = captureComposeArgTarget('file:///a.bbj', 0, line, { edit: { line: 0, exprRange: [17, 19], current: 36 } });
        expect(target).toEqual({
            uri: 'file:///a.bbj', line: 0, callStart: 4, callEnd: 25, callText: 'MSGBOX("Hi", 36, "T")', trailingArgs: [],
        });
    });

    test('edit: returns undefined when the token moved or the value no longer matches', () => {
        expect(captureComposeArgTarget('file:///a.bbj', 0, 'r = MSGBOX("Hi", 4, "T")', { edit: { line: 0, exprRange: [17, 19], current: 36 } })).toBeUndefined();
    });

    test('insert: requires the same optionInsertOffset at the argument line', () => {
        const line = 'a! = msgbox("Hello World!")';
        const offset = line.length - 1;
        const target = captureComposeArgTarget('file:///a.bbj', 0, line, { insert: { line: 0, character: offset } });
        expect(target?.callText).toBe(line.slice(target!.callStart, target!.callEnd));
    });

    test('returns undefined for an argument with neither edit nor insert', () => {
        expect(captureComposeArgTarget('file:///a.bbj', 0, 'r = MSGBOX("Hi", 36, "T")', {})).toBeUndefined();
    });
});

describe('position-aware MSGBOX commands', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        textDocuments = [];
        activeTextEditor = undefined;
    });

    function setActiveEditor(uri: string, lines: string[], line: number, character: number) {
        activeTextEditor = {
            document: {
                uri: { toString: () => uri },
                get lineCount() { return lines.length; },
                lineAt: (l: number) => ({ text: lines[l] }),
            },
            selection: { active: { line, character } },
            edit: vi.fn(),
        } as unknown as typeof activeTextEditor;
    }

    test('bbj.composeMsgboxVisual with no argument on an unfinished call opens Complete MSGBOX call', () => {
        setActiveEditor('file:///a.bbj', ['x = MSGBOX('], 0, 11);
        const { panel } = createFakePanel();
        createWebviewPanelMock.mockReturnValueOnce(panel);

        registerMsgboxComposer(fakeContext);
        const handler = registerCommandMock.mock.calls.find(c => c[0] === 'bbj.composeMsgboxVisual')![1] as (arg?: unknown) => void;
        handler();

        expect(createWebviewPanelMock).toHaveBeenCalledTimes(1);
        expect(createWebviewPanelMock.mock.calls[0][1]).toBe('Complete MSGBOX call');
    });

    test('a plain object without target/initial (e.g. a document URI) also decodes the cursor', () => {
        setActiveEditor('file:///a.bbj', ['x = MSGBOX('], 0, 11);
        const { panel } = createFakePanel();
        createWebviewPanelMock.mockReturnValueOnce(panel);

        runComposeMsgboxVisualCommand(fakeContext, { toString: () => 'file:///a.bbj' });

        expect(createWebviewPanelMock).toHaveBeenCalledTimes(1);
        expect(createWebviewPanelMock.mock.calls[0][1]).toBe('Complete MSGBOX call');
    });

    test('cursor inside a decodable call opens Edit MSGBOX', () => {
        const line = 'r = MSGBOX("Hi", 36, "T")';
        setActiveEditor('file:///a.bbj', [line], 0, line.indexOf('36'));
        const { panel } = createFakePanel();
        createWebviewPanelMock.mockReturnValueOnce(panel);

        runComposeMsgboxVisualCommand(fakeContext);

        expect(createWebviewPanelMock).toHaveBeenCalledTimes(1);
        expect(createWebviewPanelMock.mock.calls[0][1]).toBe('Edit MSGBOX');
    });

    test('cursor inside a compose-and-replace call opens Edit MSGBOX with a non-null replace', () => {
        const line = 'r = MSGBOX("Hi", flags%, "T")';
        setActiveEditor('file:///a.bbj', [line], 0, line.indexOf('flags%'));
        const { panel, getHandler } = createFakePanel();
        createWebviewPanelMock.mockReturnValueOnce(panel);

        runComposeMsgboxVisualCommand(fakeContext);

        expect(createWebviewPanelMock.mock.calls[0][1]).toBe('Edit MSGBOX');
        getHandler()!({ type: 'ready' });
        const initCall = panel.webview.postMessage.mock.calls.find(c => (c[0] as { type: string }).type === 'init');
        expect((initCall![0] as { replace: unknown }).replace).not.toBeNull();
    });

    test('cursor with no MSGBOX call composes a NEW call at the cursor (unchanged)', () => {
        setActiveEditor('file:///a.bbj', ['x = 1'], 0, 3);
        const { panel } = createFakePanel();
        createWebviewPanelMock.mockReturnValueOnce(panel);

        runComposeMsgboxVisualCommand(fakeContext);

        expect(createWebviewPanelMock).toHaveBeenCalledTimes(1);
        expect(createWebviewPanelMock.mock.calls[0][1]).toBe('MSGBOX Composer');
    });

    test('a MsgboxPanelArg argument opens exactly that argument while activeTextEditor is undefined', () => {
        activeTextEditor = undefined; // proves the active editor is never consulted for this argument shape
        const target: MsgboxEditTarget = {
            uri: 'file:///a.bbj', line: 0, callStart: 4, callEnd: 25, callText: 'MSGBOX("Hi", 36, "T")', trailingArgs: [],
        };
        const arg: MsgboxPanelArg = {
            target,
            initial: { message: '"Hi"', title: '"T"', buttonSet: 4, icon: 32, defaultButton: 0, flags: [], customButtons: [] },
        };
        const { panel } = createFakePanel();
        createWebviewPanelMock.mockReturnValueOnce(panel);

        runComposeMsgboxVisualCommand(fakeContext, arg);

        expect(createWebviewPanelMock).toHaveBeenCalledTimes(1);
        expect(createWebviewPanelMock.mock.calls[0][1]).toBe('Edit MSGBOX');
    });

    test('bbj.composeMsgbox with no argument and the cursor inside an unfinished call opens Complete MSGBOX call; showQuickPick and editor.edit are never called', () => {
        setActiveEditor('file:///a.bbj', ['x = MSGBOX('], 0, 11);
        const { panel } = createFakePanel();
        createWebviewPanelMock.mockReturnValueOnce(panel);

        registerMsgboxComposer(fakeContext);
        const handler = registerCommandMock.mock.calls.find(c => c[0] === 'bbj.composeMsgbox')![1] as (arg?: unknown) => Promise<void> | void;
        handler();

        expect(createWebviewPanelMock).toHaveBeenCalledTimes(1);
        expect(createWebviewPanelMock.mock.calls[0][1]).toBe('Complete MSGBOX call');
        expect(showQuickPickMock).not.toHaveBeenCalled();
        expect(activeTextEditor?.edit).not.toHaveBeenCalled();
    });
});

describe('msgboxPanelArgAtCursor', () => {
    test('decodes the editor cursor line the same way as the lightbulb', () => {
        const line = 'x = MSGBOX(';
        const editor = {
            document: { uri: { toString: () => 'file:///a.bbj' }, lineAt: () => ({ text: line }) },
            selection: { active: { line: 0, character: 11 } },
        } as unknown as Parameters<typeof msgboxPanelArgAtCursor>[0];
        const result = msgboxPanelArgAtCursor(editor);
        expect(result?.label).toBe('Complete MSGBOX call…');
        expect(result?.arg.target?.incomplete).toBe(true);
    });
});

describe('msgbox-composer-webview.ts replace banner markup + script (#648)', () => {
    const webviewSource = readFileSync(
        fileURLToPath(new URL('../src/msgbox-composer-webview.ts', import.meta.url)),
        'utf-8',
    );

    test('declares the replace-banner and original-options element ids in both markup and script', () => {
        const bannerOccurrences = webviewSource.match(/replace-banner/g) ?? [];
        expect(bannerOccurrences.length).toBeGreaterThanOrEqual(2);
        const originalOptionsOccurrences = webviewSource.match(/original-options/g) ?? [];
        expect(originalOptionsOccurrences.length).toBeGreaterThanOrEqual(2);
    });

    test('sets the banner text and original expression only through textContent (never innerHTML)', () => {
        expect(webviewSource).not.toMatch(/original-options[^\n]*innerHTML/);
        expect(webviewSource).not.toMatch(/replace-banner[^\n]*innerHTML/);
        // The script assigns text via a `.textContent =` statement referencing the banner elements.
        expect(/getElementById\(['"]original-options['"]\)\.textContent\s*=|\$\(['"]original-options['"]\)\.textContent\s*=/.test(webviewSource)).toBe(true);
    });
});
