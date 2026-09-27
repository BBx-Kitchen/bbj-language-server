import { beforeEach, describe, expect, test, vi } from 'vitest';

/**
 * Cross-panel coverage for the SEC-10 message-shape guard (#604): a wrong-shaped message posted
 * to any composer webview is dropped before `build()`, a language-server request, a
 * `WorkspaceEdit`, or a panel `dispose()` runs — silently, with no toast and no console output
 * (D-02) — while a well-formed message still works exactly as before.
 *
 * One `describe` block per panel. Modelled on `test/msgbox-composer-ui.test.ts`'s mocked-`vscode`
 * harness; the fake panel captures the handler passed to `onDidReceiveMessage`, exactly as
 * `test/webview-panel-lifecycle.test.ts` does.
 */

const {
    registerCommandMock, registerCodeActionsProviderMock, createWebviewPanelMock,
    showInformationMessageMock, showWarningMessageMock, showErrorMessageMock, applyEditMock,
    FakePosition, FakeRange, FakeWorkspaceEdit,
} = vi.hoisted(() => {
    class FakePosition {
        constructor(public line: number, public character: number) { }
    }
    class FakeRange {
        constructor(
            public a?: unknown, public b?: unknown, public c?: unknown, public d?: unknown,
        ) { }
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
        showErrorMessageMock: vi.fn(),
        applyEditMock: vi.fn().mockResolvedValue(true),
        FakePosition, FakeRange, FakeWorkspaceEdit,
    };
});

let textDocuments: Array<{ uri: { toString(): string }; lineAt(line: number): { text: string } }> = [];
let activeTextEditor: {
    document: { uri: { toString(): string }; lineCount: number; lineAt(line: number): { text: string } };
    selection: { active: { line: number; character: number } };
} | undefined;

vi.mock('vscode', () => ({
    window: {
        createWebviewPanel: createWebviewPanelMock,
        get activeTextEditor() { return activeTextEditor; },
        showInformationMessage: showInformationMessageMock,
        showWarningMessage: showWarningMessageMock,
        showErrorMessage: showErrorMessageMock,
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
    Position: FakePosition,
    Range: FakeRange,
    WorkspaceEdit: FakeWorkspaceEdit,
    Uri: { parse: (s: string) => ({ toString: () => s, __uri: s }) },
    ViewColumn: { Beside: 2 },
}));

import { openMsgboxComposerPanel } from '../src/msgbox-composer-webview.js';

const fakeContext = { subscriptions: [] } as unknown as Parameters<typeof openMsgboxComposerPanel>[0];

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

let consoleLogSpy: ReturnType<typeof vi.spyOn>;
let consoleWarnSpy: ReturnType<typeof vi.spyOn>;
let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
    vi.clearAllMocks();
    textDocuments = [];
    activeTextEditor = {
        document: {
            uri: { toString: () => 'file:///a.bbj' },
            lineCount: 1,
            lineAt: (_line: number) => ({ text: '' }),
        },
        selection: { active: { line: 0, character: 0 } },
    };
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => { /* silenced */ });
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => { /* silenced */ });
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => { /* silenced */ });
});

/** Asserts a malformed message produced no side effect of any kind and no diagnostic output. */
function expectNoSideEffects(panel: FakePanel): void {
    expect(panel.webview.postMessage).not.toHaveBeenCalled();
    expect(applyEditMock).not.toHaveBeenCalled();
    expect(panel.dispose).not.toHaveBeenCalled();
    expect(showInformationMessageMock).not.toHaveBeenCalled();
    expect(showWarningMessageMock).not.toHaveBeenCalled();
    expect(showErrorMessageMock).not.toHaveBeenCalled();
    expect(consoleLogSpy).not.toHaveBeenCalled();
    expect(consoleWarnSpy).not.toHaveBeenCalled();
    expect(consoleErrorSpy).not.toHaveBeenCalled();
}

describe('msgbox panel message guard (#604)', () => {
    const validSelection = {
        buttonSet: 4, icon: 32, defaultButton: 0, flags: [], customButtons: ['', '', ''],
        message: '"Hi"', title: '"T"', assignTo: 'ret!', useConstants: false,
    };

    const malformed: Array<[string, unknown]> = [
        ['empty payload object', { type: 'insert', payload: {} }],
        ['flags is a string, not an array', { type: 'insert', payload: { ...validSelection, flags: 'nope' } }],
        ['buttonSet is a numeric string', { type: 'insert', payload: { ...validSelection, buttonSet: '4' } }],
        ['icon is a non-integer number', { type: 'insert', payload: { ...validSelection, icon: 1.5 } }],
        ['customButtons holds a number', { type: 'insert', payload: { ...validSelection, customButtons: [1] } }],
        ['message is a number', { type: 'insert', payload: { ...validSelection, message: 7 } }],
        ['useConstants is a string', { type: 'insert', payload: { ...validSelection, useConstants: 'true' } }],
        ['message is null', null],
        ['message is a bare string', 'insert'],
        ['type is not a known msgbox type', { type: 'bogus' }],
    ];

    test.each(malformed)('%s causes no postMessage, no applyEdit, no dispose, and no diagnostic output', async (_label, msg) => {
        const { panel, getHandler } = createFakePanel();
        createWebviewPanelMock.mockReturnValueOnce(panel);
        openMsgboxComposerPanel(fakeContext);
        const handler = getHandler()!;

        const result = await handler(msg);

        expect(result).toBeUndefined();
        expectNoSideEffects(panel);
    });

    test('a ready message still posts init', async () => {
        const { panel, getHandler } = createFakePanel();
        createWebviewPanelMock.mockReturnValueOnce(panel);
        openMsgboxComposerPanel(fakeContext);
        const handler = getHandler()!;

        await handler({ type: 'ready' });

        expect(panel.webview.postMessage).toHaveBeenCalledTimes(1);
        expect((panel.webview.postMessage.mock.calls[0][0] as { type: string }).type).toBe('init');
    });

    test('a change with a readForm-shaped payload posts exactly one preview message', async () => {
        const { panel, getHandler } = createFakePanel();
        createWebviewPanelMock.mockReturnValueOnce(panel);
        openMsgboxComposerPanel(fakeContext);
        const handler = getHandler()!;

        await handler({ type: 'change', payload: validSelection });

        expect(panel.webview.postMessage).toHaveBeenCalledTimes(1);
        expect((panel.webview.postMessage.mock.calls[0][0] as { type: string }).type).toBe('preview');
    });
});
