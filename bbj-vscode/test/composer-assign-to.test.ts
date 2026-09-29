import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { beforeEach, describe, expect, test, vi } from 'vitest';

/**
 * Coverage for the shared `assignTo` validator and its wiring into the msgbox and CVS composer
 * previews (issue #626): a shared `validateAssignTo(text, resultType)` decides valid assign-to
 * targets by result type, `msgboxPreview`/`cvsPreview` report `assignToError` and fold it into
 * `valid`, and each VS Code panel renders the verdict and refuses to insert when invalid.
 *
 * Modelled on `test/msgbox-composer-ui.test.ts`'s mocked-`vscode` harness so no real VS Code
 * extension host or webview is needed.
 */

const {
    registerCommandMock, registerCodeActionsProviderMock, createWebviewPanelMock,
    showInformationMessageMock, showWarningMessageMock, applyEditMock,
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

import { validateAssignTo, msgboxPreview } from '../src/msgbox-composer.js';
import { openMsgboxComposerPanel } from '../src/msgbox-composer-webview.js';
import { cvsPreview } from '../src/cvs-composer.js';
import { openCvsComposerPanel } from '../src/cvs-composer-webview.js';

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
});

const MSGBOX_WEBVIEW_SRC = readFileSync(
    fileURLToPath(new URL('../src/msgbox-composer-webview.ts', import.meta.url)), 'utf-8',
);

const NUMBER_MESSAGE = 'Not a numeric or object variable — e.g. ret, ret! or r[1]';

describe('validateAssignTo — number (MSGBOX) (#626)', () => {
    const ok: string[] = ['ret', 'ret!', 'ret%', 'RET!', 'r[1]', 'r[i+1]', 'r![ i ]', 'r[1,2]', '  ret!  '];
    test.each(ok)('%s is a valid numeric assign-to target', (text) => {
        expect(validateAssignTo(text, 'number')).toEqual({ ok: true });
    });

    const bad: string[] = [
        'ret$', 'ret$[1]', '"x"', 'a+b', 'ret = 1', 'a;b', 'a:b', 'ret!!', '1ret', 'r[]', 'r[1]]',
        'r[1;a=2]', 'r["x"]', 'r[(1]', 'r [1]', 'ret !', 'obj!.x',
        'rét!', // a non-ASCII letter in the base name
        'ret＄', // a name ending in a full-width dollar sign
        'ret\n!', // an inner newline
    ];
    test.each(bad)('%s is rejected for a numeric result', (text) => {
        const result = validateAssignTo(text, 'number');
        expect(result.ok).toBe(false);
        expect(result.message).toBe(NUMBER_MESSAGE);
    });

    test('empty or whitespace-only text is Required', () => {
        expect(validateAssignTo('', 'number')).toEqual({ ok: false, message: 'Required' });
        expect(validateAssignTo('   ', 'number')).toEqual({ ok: false, message: 'Required' });
    });
});

describe('msgboxPreview assignTo validation (#626)', () => {
    const base = { message: '"Hi"', title: '', buttonSet: 0, icon: 0, defaultButton: 0, flags: [] as number[], customButtons: [] as string[] };

    test('a new insert with empty assignTo requires it, marks invalid, and drops the assignment prefix', () => {
        const p = msgboxPreview({ ...base, assignTo: '' });
        expect(p.assignToError).toBe('Required');
        expect(p.valid).toBe(false);
        expect(p.statement).toBe('MSGBOX("Hi")');
    });

    test('a new insert with an invalid assignTo reports the numeric message and marks invalid', () => {
        const p = msgboxPreview({ ...base, assignTo: 'ret$' });
        expect(p.assignToError).toBe(NUMBER_MESSAGE);
        expect(p.valid).toBe(false);
    });

    test('a new insert with a padded but valid assignTo has no error, is valid, and trims for the statement', () => {
        const p = msgboxPreview({ ...base, assignTo: ' ret! ' });
        expect(p.assignToError).toBeUndefined();
        expect(p.valid).toBe(true);
        expect(p.statement.startsWith('ret! = MSGBOX(')).toBe(true);
    });

    test('edit mode hides the field: an empty assignTo produces no error and does not affect valid', () => {
        const p = msgboxPreview({ ...base, assignTo: '', editMode: true });
        expect(p.assignToError).toBeUndefined();
        expect(p.valid).toBe(true);
    });

    test('completing mode (assignTo undefined or null, editMode not true) hides the field too', () => {
        expect(msgboxPreview({ ...base, assignTo: undefined }).assignToError).toBeUndefined();
        expect(msgboxPreview({ ...base, assignTo: null }).assignToError).toBeUndefined();
    });

    test('a bare-string message error and an invalid assignTo both surface, and the function is pure', () => {
        const input = { ...base, message: 'Caption', assignTo: 'ret$' };
        const p1 = msgboxPreview(input);
        const p2 = msgboxPreview(input);
        expect(p1.messageError).toBeDefined();
        expect(p1.assignToError).toBe(NUMBER_MESSAGE);
        expect(p1.valid).toBe(false);
        expect(p1).toEqual(p2);
    });
});

describe('MSGBOX panel — assignTo end to end (#626)', () => {
    function validSelection(overrides: Record<string, unknown> = {}) {
        return {
            buttonSet: 0, icon: 0, defaultButton: 0, flags: [] as number[], customButtons: ['', '', ''],
            message: '"Hi"', title: '', assignTo: 'ret!', useConstants: false,
            ...overrides,
        };
    }

    test('NEW mode: ready posts an init whose initial.assignTo is ret!', async () => {
        const { panel, getHandler } = createFakePanel();
        createWebviewPanelMock.mockReturnValueOnce(panel);
        openMsgboxComposerPanel(fakeContext);
        const handler = getHandler()!;

        await handler({ type: 'ready' });

        const initCall = panel.webview.postMessage.mock.calls.find(c => (c[0] as { type: string }).type === 'init');
        expect(initCall![0]).toMatchObject({ initial: expect.objectContaining({ assignTo: 'ret!' }) });
    });

    test('NEW mode: a change with an invalid assignTo posts a preview with assignToError set and valid false', async () => {
        const { panel, getHandler } = createFakePanel();
        createWebviewPanelMock.mockReturnValueOnce(panel);
        openMsgboxComposerPanel(fakeContext);
        const handler = getHandler()!;

        await handler({ type: 'change', payload: validSelection({ assignTo: 'ret$' }) });

        const previewCall = panel.webview.postMessage.mock.calls.find(c => (c[0] as { type: string }).type === 'preview');
        expect(previewCall![0]).toMatchObject({ assignToError: NUMBER_MESSAGE, valid: false });
    });

    test('NEW mode: an insert with an empty assignTo applies no edit and keeps the panel open', async () => {
        const { panel, getHandler } = createFakePanel();
        createWebviewPanelMock.mockReturnValueOnce(panel);
        openMsgboxComposerPanel(fakeContext);
        const handler = getHandler()!;

        await handler({ type: 'insert', payload: validSelection({ assignTo: '' }) });

        expect(applyEditMock).not.toHaveBeenCalled();
        expect(panel.dispose).not.toHaveBeenCalled();
    });

    test('NEW mode: an insert with a valid assignTo applies one insert whose text starts with ret! = MSGBOX(', async () => {
        const { panel, getHandler } = createFakePanel();
        createWebviewPanelMock.mockReturnValueOnce(panel);
        openMsgboxComposerPanel(fakeContext);
        const handler = getHandler()!;

        await handler({ type: 'insert', payload: validSelection({ assignTo: 'ret!' }) });

        expect(applyEditMock).toHaveBeenCalledTimes(1);
        const edit = applyEditMock.mock.calls[0][0] as InstanceType<typeof FakeWorkspaceEdit>;
        expect(edit.insert).toHaveBeenCalledTimes(1);
        const [, , text] = edit.insert.mock.calls[0];
        expect((text as string).startsWith('ret! = MSGBOX(')).toBe(true);
        expect(panel.dispose).toHaveBeenCalledTimes(1);
    });
});

describe('msgbox-composer-webview.ts source guards (#626)', () => {
    test('has one assignTo-error element, written only via textContent, toggling invalid, with no optional marker', () => {
        expect((MSGBOX_WEBVIEW_SRC.match(/id="assignTo-error"/g) ?? []).length).toBe(1);
        expect(MSGBOX_WEBVIEW_SRC).toContain(`$('assignTo-error').textContent = m.assignToError || '';`);
        expect(MSGBOX_WEBVIEW_SRC).toContain(`$('assignTo').classList.toggle('invalid', !!m.assignToError);`);
        expect(MSGBOX_WEBVIEW_SRC).not.toContain('Assign result to (optional)');
        expect(MSGBOX_WEBVIEW_SRC).toContain('Assign result to</label>');
    });
});

const CVS_WEBVIEW_SRC = readFileSync(
    fileURLToPath(new URL('../src/cvs-composer-webview.ts', import.meta.url)), 'utf-8',
);

const STRING_MESSAGE = 'Not a string or object variable — e.g. s$, s! or s$[1]';

describe('validateAssignTo — string (CVS) (#626)', () => {
    const ok: string[] = ['s$', 's!', 'S$', 's$[i]', 's$[i+1]', 's![1]'];
    test.each(ok)('%s is a valid string assign-to target', (text) => {
        expect(validateAssignTo(text, 'string')).toEqual({ ok: true });
    });

    const bad: string[] = ['s', 's%', 's$$', '"s"', 's$ = x', 's$;x', 's$[]', 's [1]', 'x.y'];
    test.each(bad)('%s is rejected for a string result', (text) => {
        const result = validateAssignTo(text, 'string');
        expect(result.ok).toBe(false);
        expect(result.message).toBe(STRING_MESSAGE);
    });

    test('empty text is Required', () => {
        expect(validateAssignTo('', 'string')).toEqual({ ok: false, message: 'Required' });
    });
});

describe('cvsPreview assignTo validation (#626)', () => {
    const base = { str: 'a$', bits: [] as number[], chars: '' };

    test('a new insert with empty assignTo requires it and marks invalid', () => {
        const p = cvsPreview({ ...base, assignTo: '' });
        expect(p.assignToError).toBe('Required');
        expect(p.valid).toBe(false);
    });

    test('a new insert with an invalid assignTo reports the string message and marks invalid', () => {
        const p = cvsPreview({ ...base, assignTo: 'x' });
        expect(p.assignToError).toBe(STRING_MESSAGE);
        expect(p.valid).toBe(false);
    });

    test('a new insert with a padded but valid assignTo has no error, is valid, and trims for the statement', () => {
        const p = cvsPreview({ ...base, assignTo: ' s$ ' });
        expect(p.assignToError).toBeUndefined();
        expect(p.valid).toBe(true);
        expect(p.statement.startsWith('s$ = CVS(')).toBe(true);
    });

    test('edit mode, or assignTo undefined/null, hides the field with no error and no change to the statement', () => {
        const edit = cvsPreview({ ...base, assignTo: 'b$', editMode: true });
        expect(edit.assignToError).toBeUndefined();
        expect(cvsPreview({ ...base, assignTo: undefined }).assignToError).toBeUndefined();
        expect(cvsPreview({ ...base, assignTo: null }).assignToError).toBeUndefined();
    });

    test('an empty str and an invalid assignTo both surface, and the function is pure', () => {
        const input = { ...base, str: '', assignTo: 'x' };
        const p1 = cvsPreview(input);
        const p2 = cvsPreview(input);
        expect(p1.strError).toBeDefined();
        expect(p1.assignToError).toBe(STRING_MESSAGE);
        expect(p1.valid).toBe(false);
        expect(p1).toEqual(p2);
    });
});

describe('CVS panel — assignTo end to end (#626)', () => {
    function cvsFakeContext() {
        return { subscriptions: [] } as unknown as Parameters<typeof openCvsComposerPanel>[0];
    }

    test('NEW mode: ready posts an init whose initial.assignTo is s$', async () => {
        const { panel, getHandler } = createFakePanel();
        createWebviewPanelMock.mockReturnValueOnce(panel);
        openCvsComposerPanel(cvsFakeContext());
        const handler = getHandler()!;

        await handler({ type: 'ready' });

        const initCall = panel.webview.postMessage.mock.calls.find(c => (c[0] as { type: string }).type === 'init');
        expect(initCall![0]).toMatchObject({ initial: expect.objectContaining({ assignTo: 's$' }) });
    });

    test('NEW mode: an insert with an empty assignTo applies no edit', async () => {
        const { panel, getHandler } = createFakePanel();
        createWebviewPanelMock.mockReturnValueOnce(panel);
        openCvsComposerPanel(cvsFakeContext());
        const handler = getHandler()!;

        await handler({ type: 'insert', payload: { str: 'a$', bits: [], chars: '', assignTo: '' } });

        expect(applyEditMock).not.toHaveBeenCalled();
        expect(panel.dispose).not.toHaveBeenCalled();
    });

    test('NEW mode: an insert with s$ applies one insert whose text starts with s$ = CVS(', async () => {
        const { panel, getHandler } = createFakePanel();
        createWebviewPanelMock.mockReturnValueOnce(panel);
        openCvsComposerPanel(cvsFakeContext());
        const handler = getHandler()!;

        await handler({ type: 'insert', payload: { str: 'a$', bits: [], chars: '', assignTo: 's$' } });

        expect(applyEditMock).toHaveBeenCalledTimes(1);
        const edit = applyEditMock.mock.calls[0][0] as InstanceType<typeof FakeWorkspaceEdit>;
        expect(edit.insert).toHaveBeenCalledTimes(1);
        const [, , text] = edit.insert.mock.calls[0];
        expect((text as string).startsWith('s$ = CVS(')).toBe(true);
        expect(panel.dispose).toHaveBeenCalledTimes(1);
    });

    test('completing mode still ignores assignTo', async () => {
        textDocuments = [{ uri: { toString: () => 'file:///a.bbj' }, lineAt: () => ({ text: 'a$ = CVS(name$' }) }];
        const target = {
            uri: 'file:///a.bbj', line: 0, callStart: 5, callEnd: 14,
            callText: 'CVS(name$', trailingArgs: [] as string[], incomplete: true,
        };
        const { panel, getHandler } = createFakePanel();
        createWebviewPanelMock.mockReturnValueOnce(panel);
        openCvsComposerPanel(cvsFakeContext(), { target, initial: { str: 'name$', bits: [], chars: '' } });
        const handler = getHandler()!;

        await handler({ type: 'insert', payload: { str: 'name$', bits: [], chars: '', assignTo: 'ignored$' } });

        expect(applyEditMock).toHaveBeenCalledTimes(1);
        const edit = applyEditMock.mock.calls[0][0] as InstanceType<typeof FakeWorkspaceEdit>;
        expect(edit.replace).toHaveBeenCalledTimes(1);
        const [, , text] = edit.replace.mock.calls[0];
        expect(text as string).not.toContain('=');
        expect(panel.dispose).toHaveBeenCalledTimes(1);
    });
});

describe('cvs-composer-webview.ts source guards (#626)', () => {
    test('has one assignTo-error element, written only via textContent, toggling invalid, fills from init.assignTo, no optional marker', () => {
        expect((CVS_WEBVIEW_SRC.match(/id="assignTo-error"/g) ?? []).length).toBe(1);
        expect(CVS_WEBVIEW_SRC).toContain(`$('assignTo-error').textContent = m.assignToError || '';`);
        expect(CVS_WEBVIEW_SRC).toContain(`$('assignTo').classList.toggle('invalid', !!m.assignToError);`);
        expect(CVS_WEBVIEW_SRC).toContain(`$('assignTo').value = init.assignTo || '';`);
        expect(CVS_WEBVIEW_SRC).not.toContain('Assign result to (optional)');
        expect(CVS_WEBVIEW_SRC).toContain('Assign result to</label>');
        expect(CVS_WEBVIEW_SRC).toContain(`assignTo: 's$'`);
    });
});
