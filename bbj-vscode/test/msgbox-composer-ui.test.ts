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
    showWarningMessageMock, applyEditMock,
    FakeCodeAction, FakeRange, FakeWorkspaceEdit,
} = vi.hoisted(() => {
    class FakeCodeAction {
        command: unknown;
        constructor(public title: string, public kind: unknown) { }
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
        FakeCodeAction, FakeRange, FakeWorkspaceEdit,
    };
});

let textDocuments: Array<{ uri: { toString(): string }; lineAt(line: number): { text: string } }> = [];

vi.mock('vscode', () => ({
    window: {
        createWebviewPanel: createWebviewPanelMock,
        activeTextEditor: undefined,
        showInformationMessage: showInformationMessageMock,
        showWarningMessage: showWarningMessageMock,
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
    Range: FakeRange,
    WorkspaceEdit: FakeWorkspaceEdit,
    Uri: { parse: (s: string) => ({ toString: () => s, __uri: s }) },
    ViewColumn: { Beside: 2 },
}));

import { registerMsgboxComposer, msgboxPanelArgFromDecode } from '../src/msgbox-composer-ui.js';
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
