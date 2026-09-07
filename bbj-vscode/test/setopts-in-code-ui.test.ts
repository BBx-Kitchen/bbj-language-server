import { beforeEach, describe, expect, test, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

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
import { registerSetOptsInCodeComposer, setoptsInCodeCandidateLine } from '../src/setopts-in-code-ui.js';

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

describe('setoptsInCodeCandidateLine (Task 2, pure helper)', () => {
    test.each([
        ['SETOPTS', 'SETOPTS opts$', 0],
        ['setopts (lowercase)', 'setopts opts$', 3],
        ['SeTopTs (mixed case)', '  SeTopTs opts$', 4],
        ['IOR(', 'opts$=IOR(opts$,"$80$")', 10],
        ['ior( (lowercase)', 'opts$=ior(opts$,"$80$")', 20],
        ['AND(', 'opts$=AND(opts$,"$7F$")', 6],
        ['and( (mixed case)', 'opts$=AnD(opts$,"$7F$")', 23],
    ])('positive: %s at or after the keyword start', (_label, line, character) => {
        expect(setoptsInCodeCandidateLine(line, character)).toBe(true);
    });

    test('negative: caret strictly before every keyword occurrence on the line', () => {
        const line = 'x = 1 : SETOPTS opts$';
        expect(setoptsInCodeCandidateLine(line, 2)).toBe(false);
    });

    test('negative: an unrelated line with none of the three keywords', () => {
        expect(setoptsInCodeCandidateLine('x$ = "hello world"', 5)).toBe(false);
    });

    test.each([
        ['expand(', 'x$ = EXPAND("foo")'],
        ['command(', 'y = COMMAND(1)'],
        ['demand(', 'y = demand(1)'],
        ['brand(', 'y = Brand(1)'],
        ['island(', 'y = ISLAND(1)'],
        ['prior(', 'y = PRIOR(1)'],
        ['senior(', 'y = SENIOR(1)'],
        ['junior(', 'y = JUNIOR(1)'],
        ['SETOPTSFOO', 'x = SETOPTSFOO(1)'],
        ['SETOPTSHELPER(', 'x = SETOPTSHELPER(1)'],
    ])('negative: %s is a substring of an ordinary identifier, not a word-boundary keyword match', (_label, line) => {
        expect(setoptsInCodeCandidateLine(line, line.length - 1)).toBe(false);
    });
});

describe('registerSetOptsInCodeComposer / command routing (Task 2)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    function getRegisteredCommandHandler(): (arg?: unknown) => Promise<void> {
        const call = registerCommandMock.mock.calls.find((c: unknown[]) => c[0] === 'bbj.composeSetoptsInCode');
        if (!call) throw new Error('bbj.composeSetoptsInCode was not registered');
        return call[1] as (arg?: unknown) => Promise<void>;
    }

    test('registers exactly one command and one Code Action provider scoped to the bbj language, no CodeLens', () => {
        const sender: SetOptsInCodeRequestSender = vi.fn();
        registerSetOptsInCodeComposer(fakeContext, sender);

        expect(registerCommandMock).toHaveBeenCalledWith('bbj.composeSetoptsInCode', expect.any(Function));
        expect(registerCodeActionsProviderMock).toHaveBeenCalledTimes(1);
        const [languageArg] = registerCodeActionsProviderMock.mock.calls[0];
        expect(languageArg).toEqual({ language: 'bbj' });
    });

    test('mode: absolute, editable: true opens the existing absolute SETOPTS panel', async () => {
        const sender: SetOptsInCodeRequestSender = vi.fn().mockResolvedValue({
            found: true, editable: true, mode: 'absolute',
            absolute: { line: 2, hexRange: [10, 18], hexDigits: '08004020' },
        });
        createWebviewPanelMock.mockReturnValue({ webview: { html: '', postMessage: vi.fn(), onDidReceiveMessage: vi.fn(() => ({ dispose: vi.fn() })) }, dispose: vi.fn() });
        registerSetOptsInCodeComposer(fakeContext, sender);
        const handler = getRegisteredCommandHandler();

        await handler({ uri: 'file:///x.bbj', line: 2, character: 5 });

        expect(createWebviewPanelMock).toHaveBeenCalledTimes(1);
        const [viewType] = createWebviewPanelMock.mock.calls[0];
        expect(viewType).toBe('bbjSetOptsComposer');
        expect(showInformationMessageMock).not.toHaveBeenCalled();
    });

    test('mode: chain, editable: true opens the tri-state panel with the chain edit-in-place target', async () => {
        const sender: SetOptsInCodeRequestSender = vi.fn().mockResolvedValue({
            found: true, editable: true, mode: 'chain',
            chain: { variableName: 'opts$', startLine: 3, endLine: 5, indent: '  ' },
            initial: { entries: [] },
        });
        createWebviewPanelMock.mockReturnValue({ webview: { html: '', postMessage: vi.fn(), onDidReceiveMessage: vi.fn(() => ({ dispose: vi.fn() })) }, dispose: vi.fn() });
        registerSetOptsInCodeComposer(fakeContext, sender);
        const handler = getRegisteredCommandHandler();

        await handler({ uri: 'file:///x.bbj', line: 4, character: 2 });

        expect(createWebviewPanelMock).toHaveBeenCalledTimes(1);
        const [viewType] = createWebviewPanelMock.mock.calls[0];
        expect(viewType).toBe('bbjSetOptsTriStateComposer');
        expect(showInformationMessageMock).not.toHaveBeenCalled();
    });

    test('found: false opens the tri-state panel with no target (compose-new)', async () => {
        const sender: SetOptsInCodeRequestSender = vi.fn().mockResolvedValue({ found: false, editable: false, mode: 'none' });
        createWebviewPanelMock.mockReturnValue({ webview: { html: '', postMessage: vi.fn(), onDidReceiveMessage: vi.fn(() => ({ dispose: vi.fn() })) }, dispose: vi.fn() });
        const vscodeModule = await import('vscode');
        const uri = { toString: () => 'file:///x.bbj' };
        (vscodeModule.window as unknown as { activeTextEditor: unknown }).activeTextEditor = {
            document: { uri, languageId: 'bbj' },
            selection: { active: { line: 4, character: 2 } },
        };
        registerSetOptsInCodeComposer(fakeContext, sender);
        const handler = getRegisteredCommandHandler();

        await handler({ uri: 'file:///x.bbj', line: 4, character: 2 });

        expect(createWebviewPanelMock).toHaveBeenCalledTimes(1);
        const [viewType] = createWebviewPanelMock.mock.calls[0];
        expect(viewType).toBe('bbjSetOptsTriStateComposer');

        (vscodeModule.window as unknown as { activeTextEditor: unknown }).activeTextEditor = undefined;
    });

    test('editable: false with found: true opens no panel and shows a message containing the server reason', async () => {
        const sender: SetOptsInCodeRequestSender = vi.fn().mockResolvedValue({
            found: true, editable: false, mode: 'chain', reason: 'a branch was encountered while tracing the chain',
        });
        registerSetOptsInCodeComposer(fakeContext, sender);
        const handler = getRegisteredCommandHandler();

        await handler({ uri: 'file:///x.bbj', line: 4, character: 2 });

        expect(createWebviewPanelMock).not.toHaveBeenCalled();
        expect(showInformationMessageMock).toHaveBeenCalledWith(expect.stringContaining('a branch was encountered while tracing the chain'));
    });

    test('no active editor (command palette, no arg) shows a non-blocking hint and opens nothing', async () => {
        const vscodeModule = await import('vscode');
        (vscodeModule.window as unknown as { activeTextEditor: unknown }).activeTextEditor = undefined;
        const sender: SetOptsInCodeRequestSender = vi.fn();
        registerSetOptsInCodeComposer(fakeContext, sender);
        const handler = getRegisteredCommandHandler();

        await handler(undefined);

        expect(sender).not.toHaveBeenCalled();
        expect(createWebviewPanelMock).not.toHaveBeenCalled();
        expect(showInformationMessageMock).toHaveBeenCalledTimes(1);
    });

    test('active editor with a non-bbj languageId (no arg) shows a non-blocking hint and opens nothing', async () => {
        const vscodeModule = await import('vscode');
        (vscodeModule.window as unknown as { activeTextEditor: unknown }).activeTextEditor = {
            document: { uri: { toString: () => 'file:///x.bbx-config' }, languageId: 'bbx-config' },
            selection: { active: { line: 0, character: 0 } },
        };
        const sender: SetOptsInCodeRequestSender = vi.fn();
        registerSetOptsInCodeComposer(fakeContext, sender);
        const handler = getRegisteredCommandHandler();

        await handler(undefined);

        expect(sender).not.toHaveBeenCalled();
        expect(createWebviewPanelMock).not.toHaveBeenCalled();
        expect(showInformationMessageMock).toHaveBeenCalledTimes(1);

        (vscodeModule.window as unknown as { activeTextEditor: unknown }).activeTextEditor = undefined;
    });

    test('a rejected decodeInCode request shows a non-blocking message and never throws into the extension host', async () => {
        const sender: SetOptsInCodeRequestSender = vi.fn().mockRejectedValue(new Error('language server unreachable'));
        registerSetOptsInCodeComposer(fakeContext, sender);
        const handler = getRegisteredCommandHandler();

        await expect(handler({ uri: 'file:///x.bbj', line: 1, character: 1 })).resolves.toBeUndefined();

        expect(createWebviewPanelMock).not.toHaveBeenCalled();
        expect(showInformationMessageMock).toHaveBeenCalledWith(expect.stringContaining('language server unreachable'));
    });
});

describe('activation wiring guards (Task 3)', () => {
    const REPO_ROOT = path.resolve(__dirname, '..');
    const EXTENSION_TS = path.join(REPO_ROOT, 'src/extension.ts');
    const PACKAGE_JSON = path.join(REPO_ROOT, 'package.json');
    const COMMAND_ID = 'bbj.composeSetoptsInCode';

    /** Drop every line whose trimmed text starts with `//` so a comment cannot satisfy the assertion below. */
    function withoutCommentLines(text: string): string {
        return text
            .split('\n')
            .filter(line => !line.trim().startsWith('//'))
            .join('\n');
    }

    test('registerSetOptsInCodeComposer is both imported and called in extension.ts, outside of comments', () => {
        const code = withoutCommentLines(fs.readFileSync(EXTENSION_TS, 'utf-8'));
        const occurrences = code.split('registerSetOptsInCodeComposer').length - 1;
        expect(occurrences).toBeGreaterThanOrEqual(2); // one import, one call
        expect(code).toMatch(/import\s*\{\s*registerSetOptsInCodeComposer\s*\}\s*from/);
        expect(code).toMatch(/registerSetOptsInCodeComposer\(context,/);
    });

    test('package.json declares the command, its context-menu entry (scoped to bbj, not bbx-config) and its activation event', () => {
        const pkg = JSON.parse(fs.readFileSync(PACKAGE_JSON, 'utf-8'));

        const commandEntry = (pkg.contributes.commands as Array<{ command: string; title: string; category: string }>)
            .find(c => c.command === COMMAND_ID);
        expect(commandEntry).toBeDefined();
        expect(commandEntry?.category).toBe('BBj');

        const menuEntry = (pkg.contributes.menus['editor/context'] as Array<{ command: string; when: string; group: string }>)
            .find(m => m.command === COMMAND_ID);
        expect(menuEntry).toBeDefined();
        expect(menuEntry?.when).toBe('editorLangId == bbj');
        expect(menuEntry?.when).not.toMatch(/bbx-config/);
        expect(menuEntry?.group).toBe('1_modification');

        expect(pkg.activationEvents as string[]).toContain(`onCommand:${COMMAND_ID}`);
    });

    test('package.json remains valid JSON', () => {
        expect(() => JSON.parse(fs.readFileSync(PACKAGE_JSON, 'utf-8'))).not.toThrow();
    });
});
