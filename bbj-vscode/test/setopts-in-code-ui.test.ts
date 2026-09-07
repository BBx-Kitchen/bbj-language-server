import { beforeEach, describe, expect, test, vi } from 'vitest';

/**
 * Unit coverage for the SETOPTS-in-code VS Code UI (#475, DISC-06, plan 88-06):
 *   - setopts-tristate-webview.ts's message handler (Task 1)
 *   - setopts-in-code-ui.ts's Code Action / command routing (Task 2)
 *   - extension.ts / package.json wiring guards (Task 3)
 *
 * Everything runs under a mocked `vscode` module — modelled on
 * test/extension-activation.test.ts's harness — so no real VS Code extension host, webview or
 * language client is needed. The server is always a stub `sender`; this file never asserts
 * anything about `composeSetOptsBlock`'s own arithmetic (that belongs to
 * test/setopts-catalog.test.ts and test/setopts-in-code-request.test.ts) — only that the panel
 * and the command routing forward to it and apply exactly what it returns.
 */

const {
    applyEditMock, createWebviewPanelMock, registerCommandMock, registerCodeActionsProviderMock, showInformationMessageMock,
    FakePosition, FakeRange, FakeWorkspaceEdit, FakeCodeAction,
} = vi.hoisted(() => {
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
    class FakeCodeAction {
        command: unknown;
        constructor(public title: string, public kind: unknown) { }
    }
    return {
        applyEditMock: vi.fn().mockResolvedValue(true),
        createWebviewPanelMock: vi.fn(),
        registerCommandMock: vi.fn(),
        registerCodeActionsProviderMock: vi.fn(),
        showInformationMessageMock: vi.fn(),
        FakePosition, FakeRange, FakeWorkspaceEdit, FakeCodeAction,
    };
});

vi.mock('vscode', () => ({
    window: {
        createWebviewPanel: createWebviewPanelMock,
        activeTextEditor: undefined,
        showInformationMessage: showInformationMessageMock,
    },
    workspace: {
        applyEdit: applyEditMock,
    },
    commands: {
        registerCommand: registerCommandMock,
    },
    languages: {
        registerCodeActionsProvider: registerCodeActionsProviderMock,
    },
    ViewColumn: { Beside: 2 },
    CodeActionKind: { RefactorRewrite: { value: 'refactor.rewrite' } },
    CodeAction: FakeCodeAction,
    Position: FakePosition,
    Range: FakeRange,
    WorkspaceEdit: FakeWorkspaceEdit,
    Uri: { parse: (s: string) => ({ toString: () => s, __uri: s }) },
}));

import {
    openSetOptsTriStateComposerPanel, SetOptsInCodeRequestSender, SetOptsTriStatePanelArg, SetOptsTriStateTarget,
} from '../src/setopts-tristate-webview.js';

interface FakePanel {
    webview: {
        html: string;
        postMessage: ReturnType<typeof vi.fn>;
        onDidReceiveMessage: ReturnType<typeof vi.fn>;
    };
    dispose: ReturnType<typeof vi.fn>;
}

/** Creates a fake webview panel and exposes the message handler the module under test registers. */
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

const fakeContext = { subscriptions: [] } as unknown as Parameters<typeof openSetOptsTriStateComposerPanel>[0];

describe('setopts-tristate-webview.ts (Task 1)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    test('chain-replace range: apply on a non-empty [startLine, endLine) target replaces that range with the composed text + newline', async () => {
        const { panel, getHandler } = createFakePanel();
        createWebviewPanelMock.mockReturnValue(panel);
        const composed = { lines: ['  opts$=IOR(opts$,"$8000000000000000$")'], text: '  opts$=IOR(opts$,"$8000000000000000$")' };
        const sender: SetOptsInCodeRequestSender = vi.fn().mockResolvedValue(composed);
        const target: SetOptsTriStateTarget = { uri: 'file:///a.bbj', startLine: 5, endLine: 7, indent: '  ', variableName: 'opts$' };
        const arg: SetOptsTriStatePanelArg = { target };

        openSetOptsTriStateComposerPanel(fakeContext, arg, sender);
        const handler = getHandler()!;
        await handler({ type: 'ready' });
        await handler({ type: 'apply', payload: { entries: [] } });

        expect(applyEditMock).toHaveBeenCalledTimes(1);
        const edit = applyEditMock.mock.calls[0][0] as InstanceType<typeof FakeWorkspaceEdit>;
        expect(edit.replace).toHaveBeenCalledTimes(1);
        const [uriArg, rangeArg, textArg] = edit.replace.mock.calls[0];
        expect((uriArg as { __uri: string }).__uri).toBe('file:///a.bbj');
        expect(rangeArg).toEqual(new FakeRange(5, 0, 7, 0));
        expect(textArg).toBe(`${composed.text}\n`);
        expect(edit.insert).not.toHaveBeenCalled();
        expect(panel.dispose).toHaveBeenCalledTimes(1);
    });

    test('equal-line insert: apply on a target where startLine === endLine inserts at that position instead of replacing', async () => {
        const { panel, getHandler } = createFakePanel();
        createWebviewPanelMock.mockReturnValue(panel);
        const composed = { lines: ['  opts$=AND(opts$,"$7FFFFFFFFFFFFFFF$")'], text: '  opts$=AND(opts$,"$7FFFFFFFFFFFFFFF$")' };
        const sender: SetOptsInCodeRequestSender = vi.fn().mockResolvedValue(composed);
        const target: SetOptsTriStateTarget = { uri: 'file:///b.bbj', startLine: 9, endLine: 9, indent: '  ', variableName: 'opts$' };

        openSetOptsTriStateComposerPanel(fakeContext, { target }, sender);
        const handler = getHandler()!;
        await handler({ type: 'ready' });
        await handler({ type: 'apply', payload: { entries: [] } });

        const edit = applyEditMock.mock.calls[0][0] as InstanceType<typeof FakeWorkspaceEdit>;
        expect(edit.insert).toHaveBeenCalledTimes(1);
        const [uriArg, positionArg, textArg] = edit.insert.mock.calls[0];
        expect((uriArg as { __uri: string }).__uri).toBe('file:///b.bbj');
        expect(positionArg).toEqual(new FakePosition(9, 0));
        expect(textArg).toBe(`${composed.text}\n`);
        expect(edit.replace).not.toHaveBeenCalled();
    });

    test('compose-new insert: with no target, apply inserts the composed block at the active editor cursor line', async () => {
        const { panel, getHandler } = createFakePanel();
        createWebviewPanelMock.mockReturnValue(panel);
        const composed = { lines: ['opts$=OPTS', 'SETOPTS opts$'], text: 'opts$=OPTS\nSETOPTS opts$' };
        const sender: SetOptsInCodeRequestSender = vi.fn().mockResolvedValue(composed);
        const uri = { __uri: 'file:///c.bbj', toString: () => 'file:///c.bbj' };
        const vscodeModule = await import('vscode');
        (vscodeModule.window as unknown as { activeTextEditor: unknown }).activeTextEditor = {
            document: { uri },
            selection: { active: { line: 3 } },
        };

        openSetOptsTriStateComposerPanel(fakeContext, {}, sender);
        const handler = getHandler()!;
        await handler({ type: 'ready' });
        await handler({ type: 'apply', payload: { entries: [] } });

        const edit = applyEditMock.mock.calls[0][0] as InstanceType<typeof FakeWorkspaceEdit>;
        expect(edit.insert).toHaveBeenCalledTimes(1);
        const [uriArg, positionArg, textArg] = edit.insert.mock.calls[0];
        expect(uriArg).toBe(uri);
        expect(positionArg).toEqual(new FakePosition(3, 0));
        expect(textArg).toBe(`${composed.text}\n`);

        (vscodeModule.window as unknown as { activeTextEditor: unknown }).activeTextEditor = undefined;
    });

    test('compose-new with no active editor opens no panel', async () => {
        const vscodeModule = await import('vscode');
        (vscodeModule.window as unknown as { activeTextEditor: unknown }).activeTextEditor = undefined;
        const sender: SetOptsInCodeRequestSender = vi.fn();

        openSetOptsTriStateComposerPanel(fakeContext, {}, sender);

        expect(createWebviewPanelMock).not.toHaveBeenCalled();
    });

    test('all-Leave case: a chain target with an empty composed region replaces the range with the empty string (no line inserted)', async () => {
        const { panel, getHandler } = createFakePanel();
        createWebviewPanelMock.mockReturnValue(panel);
        const composed = { lines: [], text: '' };
        const sender: SetOptsInCodeRequestSender = vi.fn().mockResolvedValue(composed);
        const target: SetOptsTriStateTarget = { uri: 'file:///d.bbj', startLine: 4, endLine: 6, indent: '', variableName: 'opts$' };

        openSetOptsTriStateComposerPanel(fakeContext, { target }, sender);
        const handler = getHandler()!;
        await handler({ type: 'ready' });
        await handler({ type: 'apply', payload: { entries: [] } });

        const edit = applyEditMock.mock.calls[0][0] as InstanceType<typeof FakeWorkspaceEdit>;
        expect(edit.replace).toHaveBeenCalledTimes(1);
        const [, , textArg] = edit.replace.mock.calls[0];
        expect(textArg).toBe('');
    });

    test('all-Leave case: compose-new still inserts the two-line canonical block (block scope never composes to zero lines)', async () => {
        const { panel, getHandler } = createFakePanel();
        createWebviewPanelMock.mockReturnValue(panel);
        const composed = { lines: ['opts$=OPTS', 'SETOPTS opts$'], text: 'opts$=OPTS\nSETOPTS opts$' };
        const sender: SetOptsInCodeRequestSender = vi.fn().mockResolvedValue(composed);
        const uri = { __uri: 'file:///e.bbj', toString: () => 'file:///e.bbj' };
        const vscodeModule = await import('vscode');
        (vscodeModule.window as unknown as { activeTextEditor: unknown }).activeTextEditor = {
            document: { uri },
            selection: { active: { line: 0 } },
        };

        openSetOptsTriStateComposerPanel(fakeContext, {}, sender);
        const handler = getHandler()!;
        await handler({ type: 'ready' });
        await handler({ type: 'apply', payload: { entries: [] } });

        const edit = applyEditMock.mock.calls[0][0] as InstanceType<typeof FakeWorkspaceEdit>;
        const [, , textArg] = edit.insert.mock.calls[0];
        expect(textArg).toBe(`${composed.text}\n`);

        (vscodeModule.window as unknown as { activeTextEditor: unknown }).activeTextEditor = undefined;
    });

    test('cancel disposes the panel without applying any edit', async () => {
        const { panel, getHandler } = createFakePanel();
        createWebviewPanelMock.mockReturnValue(panel);
        const sender: SetOptsInCodeRequestSender = vi.fn();
        const target: SetOptsTriStateTarget = { uri: 'file:///g.bbj', startLine: 2, endLine: 2, indent: '', variableName: 'opts$' };

        openSetOptsTriStateComposerPanel(fakeContext, { target }, sender);
        const handler = getHandler()!;
        await handler({ type: 'cancel' });

        expect(panel.dispose).toHaveBeenCalledTimes(1);
        expect(applyEditMock).not.toHaveBeenCalled();
    });

    test('change forwards the form selection through the sender and posts the preview back', async () => {
        const { panel, getHandler } = createFakePanel();
        createWebviewPanelMock.mockReturnValue(panel);
        const composed = { lines: ['opts$=IOR(opts$,"$8000000000000000$")'], text: 'opts$=IOR(opts$,"$8000000000000000$")' };
        const sender: SetOptsInCodeRequestSender = vi.fn().mockResolvedValue(composed);
        const target: SetOptsTriStateTarget = { uri: 'file:///f.bbj', startLine: 1, endLine: 1, indent: '', variableName: 'opts$' };

        openSetOptsTriStateComposerPanel(fakeContext, { target }, sender);
        const handler = getHandler()!;
        await handler({ type: 'change', payload: { entries: [{ byte: 1, mask: 0x80, state: 'set' }] } });

        expect(sender).toHaveBeenCalledWith(
            'bbj/composer/setopts/composeTriState',
            expect.objectContaining({
                selection: { entries: [{ byte: 1, mask: 0x80, state: 'set' }] },
                variable: 'opts$',
                indent: '',
                scope: 'reassignments',
            }),
        );
        expect(panel.webview.postMessage).toHaveBeenCalledWith(expect.objectContaining({ type: 'preview', ...composed }));
    });
});
