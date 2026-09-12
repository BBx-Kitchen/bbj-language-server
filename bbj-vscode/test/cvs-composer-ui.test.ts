import { readFileSync } from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { beforeEach, describe, expect, test, vi } from 'vitest';

/**
 * Unit coverage for the VS Code CVS() composer (#649): a webview panel that composes a new
 * `CVS(...)` call or edits an existing literal-mask call in place, plus a command and a
 * lightbulb. Modelled on test/setopts-in-code-ui.test.ts and test/msgbox-composer-ui.test.ts's
 * mocked-`vscode` harness so no real VS Code extension host or webview is needed. Every mask,
 * statement and validity value comes from ./cvs-composer.ts's `cvsPreview`/`decodeCvsCall` — this
 * file never re-derives mask arithmetic of its own.
 */

const {
    registerCommandMock, registerCodeActionsProviderMock, createWebviewPanelMock,
    showInformationMessageMock, showWarningMessageMock, applyEditMock,
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
        FakeCodeAction, FakePosition, FakeRange, FakeWorkspaceEdit,
    };
});

let textDocuments: Array<{ uri: { toString(): string }; lineAt(line: number): { text: string } }> = [];
let activeTextEditor: { document: { uri: { toString(): string } }; selection: { active: unknown } } | undefined;

vi.mock('vscode', () => ({
    window: {
        createWebviewPanel: createWebviewPanelMock,
        get activeTextEditor() { return activeTextEditor; },
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
    ViewColumn: { Beside: 2 },
    CodeActionKind: { RefactorRewrite: { value: 'refactor.rewrite' } },
    CodeAction: FakeCodeAction,
    Position: FakePosition,
    Range: FakeRange,
    WorkspaceEdit: FakeWorkspaceEdit,
    Uri: { parse: (s: string) => ({ toString: () => s, __uri: s }) },
}));

import { registerCvsComposer, cvsPanelArgAt } from '../src/cvs-composer-ui.js';
import {
    openCvsComposerPanel, cvsCallStillMatches, type CvsEditTarget, type CvsPanelArg,
} from '../src/cvs-composer-webview.js';
import { cvsPreview } from '../src/cvs-composer.js';

const fakeContext = { subscriptions: [] } as unknown as Parameters<typeof openCvsComposerPanel>[0];

function fakeDocument(uri: string, lines: string[]) {
    return {
        uri: { toString: () => uri },
        lineAt: (line: number) => ({ text: lines[line] }),
    };
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
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

describe('cvsPanelArgAt (#649)', () => {
    test('an editable literal-sum call returns the target/initial/label the lightbulb uses', () => {
        const line = 'x$ = CVS(a$, 1+4)';
        const result = cvsPanelArgAt('file:///a.bbj', 4, line, 6);
        expect(result).toBeDefined();
        expect(result!.arg.target).toEqual({
            uri: 'file:///a.bbj',
            line: 4,
            callStart: 5,
            callEnd: 17,
            callText: 'CVS(a$, 1+4)',
            trailingArgs: [],
        });
        expect(result!.arg.initial).toEqual({ str: 'a$', bits: [1, 4], chars: '' });
        expect(result!.label.startsWith('Configure CVS() options (')).toBe(true);
    });

    test('returns undefined for a non-literal mask and for a line with no CVS() call', () => {
        expect(cvsPanelArgAt('file:///a.bbj', 0, 'x$ = CVS(a$, n%)', 6)).toBeUndefined();
        expect(cvsPanelArgAt('file:///a.bbj', 0, 'x$ = "no call here"', 5)).toBeUndefined();
    });
});

describe('CVS lightbulb (#649)', () => {
    beforeEach(() => { vi.clearAllMocks(); });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function getProvider(): any {
        registerCvsComposer(fakeContext);
        const call = registerCodeActionsProviderMock.mock.calls[0];
        return call[1];
    }

    test('returns exactly one RefactorRewrite action for an editable call', () => {
        const provider = getProvider();
        const line = 'x$ = CVS(a$, 1+4)';
        const actions = provider.provideCodeActions(fakeDocument('file:///a.bbj', [line]), fakeRange(0, 6));
        expect(actions).toHaveLength(1);
        expect(actions[0].command.command).toBe('bbj.composeCvs');
        expect(actions[0].kind).toEqual({ value: 'refactor.rewrite' });
    });

    test('returns no action for a non-editable call', () => {
        const provider = getProvider();
        const line = 'x$ = CVS(a$, n%)';
        const actions = provider.provideCodeActions(fakeDocument('file:///a.bbj', [line]), fakeRange(0, 6));
        expect(actions).toHaveLength(0);
    });
});

describe('registerCvsComposer (#649)', () => {
    beforeEach(() => { vi.clearAllMocks(); });

    test('registers the bbj.composeCvs command and one Code Action provider for bbj', () => {
        registerCvsComposer(fakeContext);
        expect(registerCommandMock).toHaveBeenCalledTimes(1);
        expect(registerCommandMock.mock.calls[0][0]).toBe('bbj.composeCvs');
        expect(registerCodeActionsProviderMock).toHaveBeenCalledTimes(1);
        expect(registerCodeActionsProviderMock.mock.calls[0][0]).toEqual({ language: 'bbj' });
    });
});

describe('cvsCallStillMatches (#649)', () => {
    test('true when the call span still reads the captured text, false after it changes', () => {
        const target: CvsEditTarget = {
            uri: 'file:///a.bbj', line: 0, callStart: 5, callEnd: 17,
            callText: 'CVS(a$, 1+4)', trailingArgs: [],
        };
        expect(cvsCallStillMatches('x$ = CVS(a$, 1+4)', target)).toBe(true);
        expect(cvsCallStillMatches('x$ = CVS(b$, 1+4)', target)).toBe(false);
    });
});

describe('openCvsComposerPanel (#649)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        textDocuments = [];
        activeTextEditor = undefined;
    });

    test('NEW mode with no active editor shows a message and opens no panel', () => {
        openCvsComposerPanel(fakeContext);
        expect(showInformationMessageMock).toHaveBeenCalledWith('Open a BBj file first, then run the CVS() composer.');
        expect(createWebviewPanelMock).not.toHaveBeenCalled();
    });

    test('NEW mode inserts the composed statement at the captured cursor position and disposes the panel', async () => {
        activeTextEditor = { document: { uri: { toString: () => 'file:///a.bbj' } }, selection: { active: { line: 2, character: 3 } } };
        const { panel, getHandler } = createFakePanel();
        createWebviewPanelMock.mockReturnValueOnce(panel);

        openCvsComposerPanel(fakeContext);
        const handler = getHandler()!;
        const payload = { str: '"hi"', bits: [1], chars: '', assignTo: 'b$' };
        await handler({ type: 'insert', payload });

        const expected = cvsPreview({
            str: payload.str, bits: payload.bits, chars: payload.chars, assignTo: payload.assignTo,
            trailingArgs: [], editMode: false,
        });
        expect(applyEditMock).toHaveBeenCalledTimes(1);
        const edit = applyEditMock.mock.calls[0][0] as InstanceType<typeof FakeWorkspaceEdit>;
        expect(edit.insert).toHaveBeenCalledWith(expect.anything(), expect.anything(), expected.statement);
        expect(panel.dispose).toHaveBeenCalledTimes(1);
    });

    test('an invalid preview is never inserted, even on insert', async () => {
        activeTextEditor = { document: { uri: { toString: () => 'file:///a.bbj' } }, selection: { active: { line: 0, character: 0 } } };
        const { panel, getHandler } = createFakePanel();
        createWebviewPanelMock.mockReturnValueOnce(panel);

        openCvsComposerPanel(fakeContext);
        const handler = getHandler()!;
        // Empty str is required and invalid in NEW mode.
        await handler({ type: 'insert', payload: { str: '', bits: [], chars: '', assignTo: '' } });

        expect(applyEditMock).not.toHaveBeenCalled();
        expect(panel.dispose).not.toHaveBeenCalled();
    });

    test('EDIT mode replaces the call span in place and disposes the panel when the call is unchanged', async () => {
        const target: CvsEditTarget = {
            uri: 'file:///a.bbj', line: 0, callStart: 5, callEnd: 17,
            callText: 'CVS(a$, 1+4)', trailingArgs: [],
        };
        textDocuments = [fakeDocument('file:///a.bbj', ['x$ = CVS(a$, 1+4)'])];
        const arg: CvsPanelArg = { target, initial: { str: 'a$', bits: [1, 4], chars: '' } };
        const { panel, getHandler } = createFakePanel();
        createWebviewPanelMock.mockReturnValueOnce(panel);

        openCvsComposerPanel(fakeContext, arg);
        const handler = getHandler()!;
        const payload = { str: 'a$', bits: [1], chars: '', assignTo: '' };
        await handler({ type: 'insert', payload });

        const expected = cvsPreview({
            str: payload.str, bits: payload.bits, chars: payload.chars, trailingArgs: [], editMode: true,
        });
        expect(applyEditMock).toHaveBeenCalledTimes(1);
        const edit = applyEditMock.mock.calls[0][0] as InstanceType<typeof FakeWorkspaceEdit>;
        expect(edit.replace).toHaveBeenCalledWith(expect.anything(), expect.anything(), expected.statement);
        expect(showWarningMessageMock).not.toHaveBeenCalled();
        expect(panel.dispose).toHaveBeenCalledTimes(1);
    });

    test('EDIT mode refuses to write and does not dispose when the document is missing', async () => {
        const target: CvsEditTarget = {
            uri: 'file:///gone.bbj', line: 0, callStart: 5, callEnd: 17,
            callText: 'CVS(a$, 1+4)', trailingArgs: [],
        };
        textDocuments = [];
        const arg: CvsPanelArg = { target, initial: { str: 'a$', bits: [1, 4], chars: '' } };
        const { panel, getHandler } = createFakePanel();
        createWebviewPanelMock.mockReturnValueOnce(panel);

        openCvsComposerPanel(fakeContext, arg);
        const handler = getHandler()!;
        await handler({ type: 'insert', payload: { str: 'a$', bits: [1], chars: '', assignTo: '' } });

        expect(applyEditMock).not.toHaveBeenCalled();
        expect(showWarningMessageMock).toHaveBeenCalledWith('The CVS() call changed since the composer opened; nothing was applied.');
        expect(panel.dispose).not.toHaveBeenCalled();
    });

    test('EDIT mode refuses to write when the call text changed since the composer opened', async () => {
        const target: CvsEditTarget = {
            uri: 'file:///a.bbj', line: 0, callStart: 5, callEnd: 17,
            callText: 'CVS(a$, 1+4)', trailingArgs: [],
        };
        textDocuments = [fakeDocument('file:///a.bbj', ['x$ = CVS(b$, 1+4)'])];
        const arg: CvsPanelArg = { target, initial: { str: 'a$', bits: [1, 4], chars: '' } };
        const { panel, getHandler } = createFakePanel();
        createWebviewPanelMock.mockReturnValueOnce(panel);

        openCvsComposerPanel(fakeContext, arg);
        const handler = getHandler()!;
        await handler({ type: 'insert', payload: { str: 'a$', bits: [1], chars: '', assignTo: '' } });

        expect(applyEditMock).not.toHaveBeenCalled();
        expect(showWarningMessageMock).toHaveBeenCalledWith('The CVS() call changed since the composer opened; nothing was applied.');
        expect(panel.dispose).not.toHaveBeenCalled();
    });

    test('change forwards the preview from cvsPreview verbatim — no mask arithmetic in the webview module', async () => {
        activeTextEditor = { document: { uri: { toString: () => 'file:///a.bbj' } }, selection: { active: { line: 0, character: 0 } } };
        const { panel, getHandler } = createFakePanel();
        createWebviewPanelMock.mockReturnValueOnce(panel);

        openCvsComposerPanel(fakeContext);
        const handler = getHandler()!;
        const payload = { str: '"hi"', bits: [1, 128], chars: '_', assignTo: 'b$' };
        await handler({ type: 'change', payload });

        const expected = cvsPreview({
            str: payload.str, bits: payload.bits, chars: payload.chars, assignTo: payload.assignTo,
            trailingArgs: [], editMode: false,
        });
        const previewCall = panel.webview.postMessage.mock.calls.find(c => (c[0] as { type: string }).type === 'preview');
        expect(previewCall![0]).toEqual({ type: 'preview', ...expected });
    });
});

describe('cvs-composer-webview.ts source assertions (#649)', () => {
    const webviewSource = readFileSync(
        fileURLToPath(new URL('../src/cvs-composer-webview.ts', import.meta.url)),
        'utf-8',
    );

    test('computes every preview through cvsPreview, never independently', () => {
        expect(webviewSource).toMatch(/cvsPreview\(/);
    });

    test('renders bits into one flat container with no group headers or nested scroll region', () => {
        const bitsHostOccurrences = webviewSource.match(/getElementById\(['"]bits['"]\)|\$\(['"]bits['"]\)/g) ?? [];
        expect(bitsHostOccurrences.length).toBeGreaterThanOrEqual(1);
        expect(webviewSource).not.toMatch(/group-title/);
        expect(webviewSource).not.toMatch(/overflow-y/);
    });

    test('toggles the chars input disabled property from the preview\'s charsEnabled', () => {
        expect(/\$\(['"]chars['"]\)\.disabled\s*=\s*!m\.charsEnabled/.test(webviewSource)).toBe(true);
    });

    test('sets user-derived values via textContent, never innerHTML (clearing a container to empty is fine)', () => {
        expect(webviewSource).not.toMatch(/\.innerHTML\s*=\s*[^'"\s]/);
        expect((webviewSource.match(/\.textContent\s*=/g) ?? []).length).toBeGreaterThanOrEqual(3);
    });

    test('carries a nonce CSP like the other composer panels', () => {
        expect(webviewSource).toMatch(/script-src 'nonce-\$\{nonce\}'/);
    });
});

describe('package.json manifest (#649)', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const packageJson: any = JSON.parse(readFileSync(path.join(__dirname, '..', 'package.json'), 'utf-8'));

    test('contributes.commands has the bbj.composeCvs entry', () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const entry = packageJson.contributes.commands.find((c: any) => c.command === 'bbj.composeCvs');
        expect(entry).toEqual({ category: 'BBj', command: 'bbj.composeCvs', title: 'Compose CVS() (visual)…' });
    });

    test('menus["editor/context"] has an entry for bbj.composeCvs scoped to bbj files', () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const entry = packageJson.contributes.menus['editor/context'].find((m: any) => m.command === 'bbj.composeCvs');
        expect(entry).toEqual({ command: 'bbj.composeCvs', when: 'editorLangId == bbj', group: '1_modification' });
    });

    test('activationEvents includes onCommand:bbj.composeCvs', () => {
        expect(packageJson.activationEvents).toContain('onCommand:bbj.composeCvs');
    });
});
