import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { beforeEach, describe, expect, test, vi } from 'vitest';

/**
 * Panel-level coverage for the addWindow / addChildWindow field validation (#623): a malformed
 * field is shown inline, Insert is disabled, and a forced `insert` message still applies no edit
 * because the extension-side handler recomputes the preview and checks `valid` itself.
 *
 * Modelled on test/msgbox-composer-ui.test.ts's mocked-`vscode` harness so no real VS Code
 * extension host or webview is needed.
 */

const {
    createWebviewPanelMock, showInformationMessageMock, applyEditMock,
    FakePosition, FakeRange, FakeWorkspaceEdit,
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
    return {
        createWebviewPanelMock: vi.fn(),
        showInformationMessageMock: vi.fn(),
        applyEditMock: vi.fn().mockResolvedValue(true),
        FakePosition, FakeRange, FakeWorkspaceEdit,
    };
});

let activeTextEditor: {
    document: { uri: { toString(): string } };
    selection: { active: { line: number; character: number } };
} | undefined;

vi.mock('vscode', () => ({
    window: {
        createWebviewPanel: createWebviewPanelMock,
        get activeTextEditor() { return activeTextEditor; },
        showInformationMessage: showInformationMessageMock,
    },
    workspace: {
        applyEdit: applyEditMock,
    },
    Position: FakePosition,
    Range: FakeRange,
    WorkspaceEdit: FakeWorkspaceEdit,
    Uri: { parse: (s: string) => ({ toString: () => s, __uri: s }) },
    ViewColumn: { Beside: 2 },
}));

import { openAddWindowComposerPanel, AddWindowPanelArg } from '../src/addwindow-composer-webview.js';

const fakeContext = { subscriptions: [] } as unknown as Parameters<typeof openAddWindowComposerPanel>[0];

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

function setActiveEditor(uri: string, line: number, character: number): void {
    activeTextEditor = {
        document: { uri: { toString: () => uri } },
        selection: { active: { line, character } },
    } as unknown as typeof activeTextEditor;
}

describe('addWindow panel refuses malformed fields (#623)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        activeTextEditor = undefined;
    });

    const validPayload = {
        flags: [] as number[], eventMaskEnabled: false, eventMask: [] as number[],
        receiver: 'window!', sysgui: 'sysgui!', title: '"Win"',
        x: '10', y: '10', width: '400', height: '300',
    };
    const malformedPayload = { ...validPayload, x: '"10"' };

    test('a change with a malformed x field posts a preview with xError set and valid: false', () => {
        setActiveEditor('file:///a.bbj', 0, 0);
        const { panel, getHandler } = createFakePanel();
        createWebviewPanelMock.mockReturnValueOnce(panel);

        openAddWindowComposerPanel(fakeContext);
        const handler = getHandler()!;
        handler({ type: 'change', payload: malformedPayload });

        const previewCall = panel.webview.postMessage.mock.calls.find(c => (c[0] as { type: string }).type === 'preview');
        expect((previewCall![0] as { xError?: string }).xError).toBe('Not a number — remove the quotes: 10');
        expect((previewCall![0] as { valid: boolean }).valid).toBe(false);
    });

    test('insert with a malformed payload applies no edit and keeps the panel open', async () => {
        setActiveEditor('file:///a.bbj', 0, 0);
        const { panel, getHandler } = createFakePanel();
        createWebviewPanelMock.mockReturnValueOnce(panel);

        openAddWindowComposerPanel(fakeContext);
        const handler = getHandler()!;
        await handler({ type: 'insert', payload: malformedPayload });

        expect(applyEditMock).not.toHaveBeenCalled();
        expect(panel.dispose).not.toHaveBeenCalled();
    });

    test('insert with a valid payload applies exactly one edit that inserts the statement, and disposes the panel', async () => {
        setActiveEditor('file:///a.bbj', 0, 0);
        const { panel, getHandler } = createFakePanel();
        createWebviewPanelMock.mockReturnValueOnce(panel);

        openAddWindowComposerPanel(fakeContext);
        const handler = getHandler()!;
        await handler({ type: 'insert', payload: validPayload });

        expect(applyEditMock).toHaveBeenCalledTimes(1);
        const edit = applyEditMock.mock.calls[0][0] as InstanceType<typeof FakeWorkspaceEdit>;
        expect(edit.insert).toHaveBeenCalledTimes(1);
        expect(panel.dispose).toHaveBeenCalledTimes(1);
    });

    test('a valid change followed by a malformed insert applies no edit', async () => {
        setActiveEditor('file:///a.bbj', 0, 0);
        const { panel, getHandler } = createFakePanel();
        createWebviewPanelMock.mockReturnValueOnce(panel);

        openAddWindowComposerPanel(fakeContext);
        const handler = getHandler()!;
        handler({ type: 'change', payload: validPayload });
        await handler({ type: 'insert', payload: malformedPayload });

        expect(applyEditMock).not.toHaveBeenCalled();
    });

    test('EDIT mode still applies its flags edit, since edit-mode fields are never validated', async () => {
        const target = {
            uri: 'file:///a.bbj', line: 0,
            flagsRange: [10, 20] as [number, number],
            preservedFlagBits: 0, preservedEventBits: 0,
        };
        const arg: AddWindowPanelArg = { target };
        const { panel, getHandler } = createFakePanel();
        createWebviewPanelMock.mockReturnValueOnce(panel);

        openAddWindowComposerPanel(fakeContext, arg);
        const handler = getHandler()!;
        await handler({ type: 'insert', payload: { ...malformedPayload, title: 'caption' } });

        expect(applyEditMock).toHaveBeenCalledTimes(1);
        const edit = applyEditMock.mock.calls[0][0] as InstanceType<typeof FakeWorkspaceEdit>;
        expect(edit.replace).toHaveBeenCalledTimes(1);
        expect(panel.dispose).toHaveBeenCalledTimes(1);
    });
});

describe('addwindow-composer-webview.ts source carries the validation markup and guard (#623)', () => {
    const source = readFileSync(
        fileURLToPath(new URL('../src/addwindow-composer-webview.ts', import.meta.url)),
        'utf-8',
    );

    test('declares an error element id for every statement field', () => {
        for (const id of ['x', 'y', 'width', 'height', 'title', 'receiver', 'sysgui']) {
            expect(source).toContain(`id="${id}-error"`);
        }
    });

    test('the extension-side insert handler guards on the recomputed valid flag', () => {
        expect(source).toContain('if (!r.valid) break;');
    });

    test('disables Insert from the preview\'s valid flag', () => {
        expect(source).toContain("$('insert').disabled = !m.valid");
    });

    test('sets field error text only through .textContent, never innerHTML', () => {
        expect(source).not.toMatch(/-error['"]\)\.innerHTML/);
    });
});
