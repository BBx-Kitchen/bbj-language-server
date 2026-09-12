import { beforeEach, describe, expect, test, vi } from 'vitest';

/**
 * Unit coverage for the SETOPTS-in-code stale-edit guard (#475, DISC-06, plan 88-15):
 *   - `applyIfUnchanged`'s own pre-apply check, driven directly (Task 1)
 *   - `openSetOptsTriStateComposerPanel`'s guarded chain apply (Task 1)
 *   - `openSetOptsComposerPanel`'s guarded absolute-literal apply (Task 2)
 *   - `sameSetOptsInCodeDecode`'s field-wise comparison, in both directions (Task 2)
 *   - the source-level wiring property that every apply in both writers goes through the guard
 *     (Task 2)
 *
 * Everything runs under a mocked `vscode` module, modelled on
 * `test/setopts-in-code-ui.test.ts`'s harness and extended with a mutable
 * `workspace.textDocuments` array and `window.showWarningMessage`, matching
 * `test/extension-activation.test.ts`'s shape for both.
 */

const {
    applyEditMock, createWebviewPanelMock, registerCommandMock, showWarningMessageMock, showInformationMessageMock,
    FakePosition, FakeRange, FakeWorkspaceEdit, textDocuments,
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
        applyEditMock: vi.fn().mockResolvedValue(true),
        createWebviewPanelMock: vi.fn(),
        registerCommandMock: vi.fn(),
        showWarningMessageMock: vi.fn(),
        showInformationMessageMock: vi.fn(),
        FakePosition, FakeRange, FakeWorkspaceEdit,
        textDocuments: [] as Array<{ uri: { toString(): string }; version: number }>,
    };
});

vi.mock('vscode', () => ({
    window: {
        createWebviewPanel: createWebviewPanelMock,
        activeTextEditor: undefined,
        showInformationMessage: showInformationMessageMock,
        showWarningMessage: showWarningMessageMock,
    },
    workspace: {
        applyEdit: applyEditMock,
        textDocuments,
    },
    commands: {
        registerCommand: registerCommandMock,
    },
    languages: {
        registerCodeActionsProvider: vi.fn(),
    },
    ViewColumn: { Beside: 2 },
    CodeActionKind: { RefactorRewrite: { value: 'refactor.rewrite' } },
    Position: FakePosition,
    Range: FakeRange,
    WorkspaceEdit: FakeWorkspaceEdit,
    Uri: { parse: (s: string) => ({ toString: () => s, __uri: s }) },
}));

import {
    applyIfUnchanged, sameSetOptsInCodeDecode, SetOptsStaleEditGuard,
    STALE_CHECK_FAILED_MESSAGE, STALE_DOCUMENT_MESSAGE,
} from '../src/setopts-stale-edit-guard.js';
import {
    openSetOptsTriStateComposerPanel, SetOptsInCodeRequestSender, SetOptsTriStatePanelArg, SetOptsTriStateTarget,
} from '../src/setopts-tristate-webview.js';
import { openSetOptsComposerPanel, SetOptsPanelArg } from '../src/setopts-composer-webview.js';
import { registerSetOptsInCodeComposer } from '../src/setopts-in-code-ui.js';
import { SETOPTS_DECODE_IN_CODE_METHOD, SetOptsInCodeDecodeResult } from '../src/language/setopts-in-code-request.js';
import * as fs from 'fs';
import * as path from 'path';

interface FakePanel {
    webview: {
        html: string;
        postMessage: ReturnType<typeof vi.fn>;
        onDidReceiveMessage: ReturnType<typeof vi.fn>;
    };
    dispose: ReturnType<typeof vi.fn>;
    onDidDispose: ReturnType<typeof vi.fn>;
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
        onDidDispose: vi.fn(() => ({ dispose: vi.fn() })),
    };
    return { panel, getHandler: () => handler };
}

const fakeContext = { subscriptions: [] } as unknown as Parameters<typeof openSetOptsTriStateComposerPanel>[0];

/** A fake open document entry for `vscode.workspace.textDocuments`. */
function openDoc(uri: string, version: number): { uri: { toString(): string }; version: number } {
    return { uri: { toString: () => uri }, version };
}

/** A minimally-complete `decodeInCode` result, overridable per test. */
function fakeDecode(overrides: Partial<SetOptsInCodeDecodeResult> = {}): SetOptsInCodeDecodeResult {
    return {
        found: true, editable: true, mode: 'chain',
        chain: { variableName: 'opts$', startLine: 5, endLine: 7, indent: '' },
        ...overrides,
    };
}

describe('applyIfUnchanged (Task 1)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        textDocuments.length = 0;
    });

    test('no guard supplied: applyEdit is called once, resolves true, showWarningMessage never called', async () => {
        const applyEdit = vi.fn().mockResolvedValue(true);
        const result = await applyIfUnchanged(undefined, applyEdit);
        expect(result).toBe(true);
        expect(applyEdit).toHaveBeenCalledTimes(1);
        expect(showWarningMessageMock).not.toHaveBeenCalled();
    });

    test('happy path: unchanged document applies once and resolves true, no warning', async () => {
        textDocuments.push(openDoc('file:///a.bbj', 7));
        const captured = fakeDecode();
        const fresh = fakeDecode();
        const guard: SetOptsStaleEditGuard = { uri: 'file:///a.bbj', capturedDecode: captured, reDecode: vi.fn().mockResolvedValue(fresh) };
        const applyEdit = vi.fn().mockResolvedValue(true);

        const result = await applyIfUnchanged(guard, applyEdit);

        expect(result).toBe(true);
        expect(applyEdit).toHaveBeenCalledTimes(1);
        expect(showWarningMessageMock).not.toHaveBeenCalled();
    });

    test('applyEdit itself resolves false (edit could not be applied): warned with STALE_CHECK_FAILED_MESSAGE, result is false', async () => {
        textDocuments.push(openDoc('file:///a.bbj', 7));
        const captured = fakeDecode();
        const fresh = fakeDecode();
        const guard: SetOptsStaleEditGuard = { uri: 'file:///a.bbj', capturedDecode: captured, reDecode: vi.fn().mockResolvedValue(fresh) };
        const applyEdit = vi.fn().mockResolvedValue(false);

        const result = await applyIfUnchanged(guard, applyEdit);

        expect(result).toBe(false);
        expect(applyEdit).toHaveBeenCalledTimes(1);
        expect(showWarningMessageMock).toHaveBeenCalledWith(STALE_CHECK_FAILED_MESSAGE);
    });

    test('no guard supplied and applyEdit resolves false: result is false, no warning (unguarded caller keeps no-message behavior)', async () => {
        const applyEdit = vi.fn().mockResolvedValue(false);
        const result = await applyIfUnchanged(undefined, applyEdit);
        expect(result).toBe(false);
        expect(applyEdit).toHaveBeenCalledTimes(1);
        expect(showWarningMessageMock).not.toHaveBeenCalled();
    });

    test('target document absent from textDocuments: no apply, resolves false, warned with STALE_DOCUMENT_MESSAGE', async () => {
        const guard: SetOptsStaleEditGuard = { uri: 'file:///missing.bbj', capturedDecode: fakeDecode(), reDecode: vi.fn() };
        const applyEdit = vi.fn();

        const result = await applyIfUnchanged(guard, applyEdit);

        expect(result).toBe(false);
        expect(applyEdit).not.toHaveBeenCalled();
        expect(showWarningMessageMock).toHaveBeenCalledWith(STALE_DOCUMENT_MESSAGE);
    });

    test('reDecode resolves a decode whose chain.startLine moved: no apply, resolves false, warned STALE_DOCUMENT_MESSAGE', async () => {
        textDocuments.push(openDoc('file:///a.bbj', 7));
        const captured = fakeDecode({ chain: { variableName: 'opts$', startLine: 5, endLine: 7, indent: '' } });
        const fresh = fakeDecode({ chain: { variableName: 'opts$', startLine: 6, endLine: 7, indent: '' } });
        const guard: SetOptsStaleEditGuard = { uri: 'file:///a.bbj', capturedDecode: captured, reDecode: vi.fn().mockResolvedValue(fresh) };
        const applyEdit = vi.fn();

        const result = await applyIfUnchanged(guard, applyEdit);

        expect(result).toBe(false);
        expect(applyEdit).not.toHaveBeenCalled();
        expect(showWarningMessageMock).toHaveBeenCalledWith(STALE_DOCUMENT_MESSAGE);
    });

    test('reDecode resolves undefined: no apply, resolves false, warned STALE_DOCUMENT_MESSAGE', async () => {
        textDocuments.push(openDoc('file:///a.bbj', 7));
        const guard: SetOptsStaleEditGuard = { uri: 'file:///a.bbj', capturedDecode: fakeDecode(), reDecode: vi.fn().mockResolvedValue(undefined) };
        const applyEdit = vi.fn();

        const result = await applyIfUnchanged(guard, applyEdit);

        expect(result).toBe(false);
        expect(applyEdit).not.toHaveBeenCalled();
        expect(showWarningMessageMock).toHaveBeenCalledWith(STALE_DOCUMENT_MESSAGE);
    });

    test('reDecode rejects: no apply, resolves false, warned STALE_CHECK_FAILED_MESSAGE, rejection never escapes', async () => {
        textDocuments.push(openDoc('file:///a.bbj', 7));
        const guard: SetOptsStaleEditGuard = { uri: 'file:///a.bbj', capturedDecode: fakeDecode(), reDecode: vi.fn().mockRejectedValue(new Error('boom')) };
        const applyEdit = vi.fn();

        await expect(applyIfUnchanged(guard, applyEdit)).resolves.toBe(false);

        expect(applyEdit).not.toHaveBeenCalled();
        expect(showWarningMessageMock).toHaveBeenCalledWith(STALE_CHECK_FAILED_MESSAGE);
    });

    test('reDecode never settles: a 5 ms timeout aborts, no apply, resolves false, warned STALE_CHECK_FAILED_MESSAGE', async () => {
        textDocuments.push(openDoc('file:///a.bbj', 7));
        const guard: SetOptsStaleEditGuard = {
            uri: 'file:///a.bbj', capturedDecode: fakeDecode(),
            reDecode: () => new Promise<SetOptsInCodeDecodeResult | undefined>(() => { /* never settles */ }),
        };
        const applyEdit = vi.fn();

        const result = await applyIfUnchanged(guard, applyEdit, 5);

        expect(result).toBe(false);
        expect(applyEdit).not.toHaveBeenCalled();
        expect(showWarningMessageMock).toHaveBeenCalledWith(STALE_CHECK_FAILED_MESSAGE);
    });

    test('in-flight mutation: version bumps from 7 to 8 while reDecode resolves an otherwise-equal decode: no apply, resolves false, warned STALE_DOCUMENT_MESSAGE', async () => {
        const doc = openDoc('file:///a.bbj', 7);
        textDocuments.push(doc);
        const captured = fakeDecode();
        const fresh = fakeDecode();
        const guard: SetOptsStaleEditGuard = {
            uri: 'file:///a.bbj', capturedDecode: captured,
            reDecode: vi.fn().mockImplementation(async () => {
                doc.version = 8;
                return fresh;
            }),
        };
        const applyEdit = vi.fn();

        const result = await applyIfUnchanged(guard, applyEdit);

        expect(result).toBe(false);
        expect(applyEdit).not.toHaveBeenCalled();
        expect(showWarningMessageMock).toHaveBeenCalledWith(STALE_DOCUMENT_MESSAGE);
    });
});

describe('openSetOptsTriStateComposerPanel with a guard — chain edit-in-place (Task 1)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        textDocuments.length = 0;
    });

    test('unchanged document: still produces exactly one edit.replace with the captured range and composed text + newline', async () => {
        textDocuments.push(openDoc('file:///a.bbj', 3));
        const { panel, getHandler } = createFakePanel();
        createWebviewPanelMock.mockReturnValue(panel);
        const composed = { lines: ['  opts$=IOR(opts$,$8000000000000000$)'], text: '  opts$=IOR(opts$,$8000000000000000$)' };
        const sender: SetOptsInCodeRequestSender = vi.fn().mockResolvedValue(composed);
        const target: SetOptsTriStateTarget = { uri: 'file:///a.bbj', startLine: 5, endLine: 7, indent: '  ', variableName: 'opts$' };
        const decode = fakeDecode({ chain: { variableName: 'opts$', startLine: 5, endLine: 7, indent: '  ' } });
        const guard: SetOptsStaleEditGuard = { uri: 'file:///a.bbj', capturedDecode: decode, reDecode: vi.fn().mockResolvedValue(decode) };
        const arg: SetOptsTriStatePanelArg = { target, guard };

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
        expect(panel.dispose).toHaveBeenCalledTimes(1);
    });

    test('document changed between panel open and Apply: zero applyEdit calls, exactly one showWarningMessage, panel still disposed', async () => {
        textDocuments.push(openDoc('file:///a.bbj', 3));
        const { panel, getHandler } = createFakePanel();
        createWebviewPanelMock.mockReturnValue(panel);
        const composed = { lines: ['  opts$=IOR(opts$,$8000000000000000$)'], text: '  opts$=IOR(opts$,$8000000000000000$)' };
        const sender: SetOptsInCodeRequestSender = vi.fn().mockResolvedValue(composed);
        const target: SetOptsTriStateTarget = { uri: 'file:///a.bbj', startLine: 5, endLine: 7, indent: '  ', variableName: 'opts$' };
        const capturedDecode = fakeDecode({ chain: { variableName: 'opts$', startLine: 5, endLine: 7, indent: '  ' } });
        const changedDecode = fakeDecode({ chain: { variableName: 'opts$', startLine: 6, endLine: 8, indent: '  ' } });
        const guard: SetOptsStaleEditGuard = { uri: 'file:///a.bbj', capturedDecode, reDecode: vi.fn().mockResolvedValue(changedDecode) };
        const arg: SetOptsTriStatePanelArg = { target, guard };

        openSetOptsTriStateComposerPanel(fakeContext, arg, sender);
        const handler = getHandler()!;
        await handler({ type: 'ready' });
        await handler({ type: 'apply', payload: { entries: [] } });

        expect(applyEditMock).not.toHaveBeenCalled();
        expect(showWarningMessageMock).toHaveBeenCalledTimes(1);
        expect(panel.dispose).toHaveBeenCalledTimes(1);
    });

    test('compose-new (no target) with a guard nevertheless present: the guard is ignored, insert applies, sender is never asked to re-decode', async () => {
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
        const reDecode = vi.fn();
        const guard: SetOptsStaleEditGuard = { uri: 'file:///c.bbj', capturedDecode: fakeDecode(), reDecode };

        openSetOptsTriStateComposerPanel(fakeContext, { guard }, sender);
        const handler = getHandler()!;
        await handler({ type: 'ready' });
        await handler({ type: 'apply', payload: { entries: [] } });

        expect(applyEditMock).toHaveBeenCalledTimes(1);
        const edit = applyEditMock.mock.calls[0][0] as InstanceType<typeof FakeWorkspaceEdit>;
        expect(edit.insert).toHaveBeenCalledTimes(1);
        expect(reDecode).not.toHaveBeenCalled();

        (vscodeModule.window as unknown as { activeTextEditor: unknown }).activeTextEditor = undefined;
    });
});

describe('command routing re-decode wiring (Task 1)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        textDocuments.length = 0;
    });

    function getRegisteredCommandHandler(): (arg?: unknown) => Promise<void> {
        const call = registerCommandMock.mock.calls.find((c: unknown[]) => c[0] === 'bbj.composeSetoptsInCode');
        if (!call) throw new Error('bbj.composeSetoptsInCode was not registered');
        return call[1] as (arg?: unknown) => Promise<void>;
    }

    test("mode: 'chain', editable: true re-issues decodeInCode on Apply with the same uri/line/character the capture used", async () => {
        textDocuments.push(openDoc('file:///x.bbj', 1));
        const decodeResult: SetOptsInCodeDecodeResult = {
            found: true, editable: true, mode: 'chain',
            chain: { variableName: 'opts$', startLine: 3, endLine: 5, indent: '  ' },
            initial: { entries: [] },
        };
        const composed = { lines: ['  opts$=IOR(opts$,$8000000000000000$)'], text: '  opts$=IOR(opts$,$8000000000000000$)' };
        const sender: SetOptsInCodeRequestSender = vi.fn().mockImplementation(async (method: string) =>
            method === SETOPTS_DECODE_IN_CODE_METHOD ? decodeResult : composed);
        const { panel, getHandler } = createFakePanel();
        createWebviewPanelMock.mockReturnValue(panel);
        registerSetOptsInCodeComposer(fakeContext, sender);
        const commandHandler = getRegisteredCommandHandler();

        await commandHandler({ uri: 'file:///x.bbj', line: 4, character: 2 });
        const panelHandler = getHandler()!;
        await panelHandler({ type: 'ready' });
        await panelHandler({ type: 'apply', payload: { entries: [] } });

        const decodeCalls = (sender as ReturnType<typeof vi.fn>).mock.calls.filter(c => c[0] === SETOPTS_DECODE_IN_CODE_METHOD);
        expect(decodeCalls.length).toBe(2);
        expect(decodeCalls[0][1]).toEqual({ uri: 'file:///x.bbj', line: 4, character: 2 });
        expect(decodeCalls[1][1]).toEqual({ uri: 'file:///x.bbj', line: 4, character: 2 });
        expect(applyEditMock).toHaveBeenCalledTimes(1);
    });
});

describe('sameSetOptsInCodeDecode (Task 2)', () => {
    test('two field-wise identical chain results built from distinct entries array instances compare equal', () => {
        const a = fakeDecode({ initial: { entries: [{ byte: 1, mask: 0x80, state: 'set' }] } });
        const b = fakeDecode({ initial: { entries: [{ byte: 1, mask: 0x80, state: 'set' }] } });
        expect(a.initial).not.toBe(b.initial);
        expect(sameSetOptsInCodeDecode(a, b)).toBe(true);
    });

    test('two field-wise identical absolute results built from distinct hexRange array instances compare equal', () => {
        const a = fakeDecode({ mode: 'absolute', chain: undefined, absolute: { line: 2, hexRange: [8, 42], hexDigits: 'AB' } });
        const b = fakeDecode({ mode: 'absolute', chain: undefined, absolute: { line: 2, hexRange: [8, 42], hexDigits: 'AB' } });
        expect(a.absolute).not.toBe(b.absolute);
        expect(sameSetOptsInCodeDecode(a, b)).toBe(true);
    });

    test.each([
        ['found', { found: false }],
        ['editable', { editable: false }],
        ['mode', { mode: 'absolute' as const }],
        ['reason', { reason: 'a reason' }],
        ['summary', { summary: 'a summary' }],
        ['chain.variableName', { chain: { variableName: 'other$', startLine: 5, endLine: 7, indent: '' } }],
        ['chain.startLine', { chain: { variableName: 'opts$', startLine: 6, endLine: 7, indent: '' } }],
        ['chain.endLine', { chain: { variableName: 'opts$', startLine: 5, endLine: 8, indent: '' } }],
        ['chain.indent', { chain: { variableName: 'opts$', startLine: 5, endLine: 7, indent: '  ' } }],
    ])('a single-field difference in %s compares unequal', (_label, override) => {
        const a = fakeDecode();
        const b = fakeDecode(override);
        expect(sameSetOptsInCodeDecode(a, b)).toBe(false);
    });

    test.each([
        ['absolute.line', { line: 3, hexRange: [8, 42] as [number, number], hexDigits: 'AB' }],
        ['absolute.hexRange', { line: 2, hexRange: [8, 43] as [number, number], hexDigits: 'AB' }],
        ['absolute.hexDigits', { line: 2, hexRange: [8, 42] as [number, number], hexDigits: 'CD' }],
    ])('a single-field difference in %s compares unequal', (_label, absoluteOverride) => {
        const a = fakeDecode({ mode: 'absolute', chain: undefined, absolute: { line: 2, hexRange: [8, 42], hexDigits: 'AB' } });
        const b = fakeDecode({ mode: 'absolute', chain: undefined, absolute: absoluteOverride });
        expect(sameSetOptsInCodeDecode(a, b)).toBe(false);
    });

    test('two selections holding the same entries in a swapped order compare unequal', () => {
        const a = fakeDecode({ initial: { entries: [{ byte: 1, mask: 0x80, state: 'set' }, { byte: 1, mask: 0x40, state: 'clear' }] } });
        const b = fakeDecode({ initial: { entries: [{ byte: 1, mask: 0x40, state: 'clear' }, { byte: 1, mask: 0x80, state: 'set' }] } });
        expect(sameSetOptsInCodeDecode(a, b)).toBe(false);
    });

    test('a result carrying a chain payload against an otherwise-identical result carrying none compares unequal, in both argument orders', () => {
        const withChain = fakeDecode({ chain: { variableName: 'opts$', startLine: 5, endLine: 7, indent: '' } });
        const withoutChain = fakeDecode({ chain: undefined });
        expect(sameSetOptsInCodeDecode(withChain, withoutChain)).toBe(false);
        expect(sameSetOptsInCodeDecode(withoutChain, withChain)).toBe(false);
    });
});

describe('openSetOptsComposerPanel with a guard — absolute-literal edit-in-place (Task 2)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        textDocuments.length = 0;
    });

    test('in-code absolute edit target with a guard, unchanged document: exactly one edit.replace with the captured line and hex range, a complete $…$ literal', async () => {
        textDocuments.push(openDoc('file:///x.bbj', 1));
        const { panel, getHandler } = createFakePanel();
        createWebviewPanelMock.mockReturnValue(panel);
        const decode = fakeDecode({ mode: 'absolute', chain: undefined, absolute: { line: 2, hexRange: [8, 42], hexDigits: '00C20240000000000000000000000000' } });
        const guard: SetOptsStaleEditGuard = { uri: 'file:///x.bbj', capturedDecode: decode, reDecode: vi.fn().mockResolvedValue(decode) };
        const arg: SetOptsPanelArg = {
            target: {
                uri: 'file:///x.bbj', line: 2, hexRange: [8, 42],
                originalHex: '00C20240000000000000000000000000',
                hexSyntax: 'bbj-literal',
            },
            guard,
        };

        openSetOptsComposerPanel(fakeContext, arg);
        const handler = getHandler()!;
        await handler({ type: 'ready' });
        await handler({ type: 'apply', payload: { checked: [], maskComma: '', maskDot: '', rawTail: '' } });

        expect(applyEditMock).toHaveBeenCalledTimes(1);
        const edit = applyEditMock.mock.calls[0][0] as InstanceType<typeof FakeWorkspaceEdit>;
        expect(edit.replace).toHaveBeenCalledTimes(1);
        const [, rangeArg, textArg] = edit.replace.mock.calls[0];
        expect(rangeArg).toEqual(new FakeRange(2, 8, 2, 42));
        expect(textArg as string).toMatch(/^\$[0-9A-F]*\$$/);
        expect(panel.dispose).toHaveBeenCalledTimes(1);
    });

    test('in-code absolute edit target with a guard, document changed between open and Apply: zero applyEdit calls, exactly one showWarningMessage, panel still disposed', async () => {
        textDocuments.push(openDoc('file:///x.bbj', 1));
        const { panel, getHandler } = createFakePanel();
        createWebviewPanelMock.mockReturnValue(panel);
        const captured = fakeDecode({ mode: 'absolute', chain: undefined, absolute: { line: 2, hexRange: [8, 42], hexDigits: '00C20240000000000000000000000000' } });
        const changed = fakeDecode({ mode: 'absolute', chain: undefined, absolute: { line: 3, hexRange: [8, 42], hexDigits: '00C20240000000000000000000000000' } });
        const guard: SetOptsStaleEditGuard = { uri: 'file:///x.bbj', capturedDecode: captured, reDecode: vi.fn().mockResolvedValue(changed) };
        const arg: SetOptsPanelArg = {
            target: {
                uri: 'file:///x.bbj', line: 2, hexRange: [8, 42],
                originalHex: '00C20240000000000000000000000000',
                hexSyntax: 'bbj-literal',
            },
            guard,
        };

        openSetOptsComposerPanel(fakeContext, arg);
        const handler = getHandler()!;
        await handler({ type: 'ready' });
        await handler({ type: 'apply', payload: { checked: [], maskComma: '', maskDot: '', rawTail: '' } });

        expect(applyEditMock).not.toHaveBeenCalled();
        expect(showWarningMessageMock).toHaveBeenCalledTimes(1);
        expect(panel.dispose).toHaveBeenCalledTimes(1);
    });

    test('a config.bbx target (no hexSyntax, no guard): the replacement is applied and contains no $, no re-decode issued', async () => {
        const { panel, getHandler } = createFakePanel();
        createWebviewPanelMock.mockReturnValue(panel);
        const arg: SetOptsPanelArg = {
            target: { uri: 'file:///barista.bbx-config', line: 0, hexRange: [8, 16], originalHex: '00C20240' },
        };

        openSetOptsComposerPanel(fakeContext, arg);
        const handler = getHandler()!;
        await handler({ type: 'ready' });
        await handler({ type: 'apply', payload: { checked: [], maskComma: '', maskDot: '', rawTail: '' } });

        expect(applyEditMock).toHaveBeenCalledTimes(1);
        expect(showWarningMessageMock).not.toHaveBeenCalled();
        const edit = applyEditMock.mock.calls[0][0] as InstanceType<typeof FakeWorkspaceEdit>;
        const [, , textArg] = edit.replace.mock.calls[0];
        expect(textArg as string).not.toContain('$');
        expect(textArg as string).toMatch(/^[0-9A-F]+$/);
    });
});

describe('absolute-path command routing re-decode wiring (Task 2)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        textDocuments.length = 0;
    });

    function getRegisteredCommandHandler(): (arg?: unknown) => Promise<void> {
        const call = registerCommandMock.mock.calls.find((c: unknown[]) => c[0] === 'bbj.composeSetoptsInCode');
        if (!call) throw new Error('bbj.composeSetoptsInCode was not registered');
        return call[1] as (arg?: unknown) => Promise<void>;
    }

    test("mode: 'absolute', editable: true re-issues decodeInCode on Apply with the same uri/line/character the capture used", async () => {
        textDocuments.push(openDoc('file:///x.bbj', 1));
        const decodeResult: SetOptsInCodeDecodeResult = {
            found: true, editable: true, mode: 'absolute',
            absolute: { line: 2, hexRange: [10, 18], hexDigits: '08004020' },
        };
        const sender: SetOptsInCodeRequestSender = vi.fn().mockResolvedValue(decodeResult);
        const { panel, getHandler } = createFakePanel();
        createWebviewPanelMock.mockReturnValue(panel);
        registerSetOptsInCodeComposer(fakeContext, sender);
        const commandHandler = getRegisteredCommandHandler();

        await commandHandler({ uri: 'file:///x.bbj', line: 2, character: 5 });
        const panelHandler = getHandler()!;
        await panelHandler({ type: 'ready' });
        await panelHandler({ type: 'apply', payload: { checked: [], maskComma: '', maskDot: '', rawTail: '' } });

        const decodeCalls = (sender as ReturnType<typeof vi.fn>).mock.calls.filter(c => c[0] === SETOPTS_DECODE_IN_CODE_METHOD);
        expect(decodeCalls.length).toBe(2);
        expect(decodeCalls[0][1]).toEqual({ uri: 'file:///x.bbj', line: 2, character: 5 });
        expect(decodeCalls[1][1]).toEqual({ uri: 'file:///x.bbj', line: 2, character: 5 });
        expect(applyEditMock).toHaveBeenCalledTimes(1);
    });
});

/**
 * Pins the wiring property no single unit test above can otherwise establish: every apply in
 * `setopts-tristate-webview.ts` and `setopts-composer-webview.ts` reaches `applyIfUnchanged`
 * first. A failure here means an apply escaped the guard — restoring the exact silent-rewrite
 * defect this plan closes: an edit applied against a range captured before the document changed.
 */
describe('source-guard: every apply in both writers is routed through the guard (Task 2)', () => {
    const REPO_ROOT = path.resolve(__dirname, '..');

    /** Strip block comments FIRST (non-greedy), then drop every line starting with `//` — both
     * steps are required since these files carry long block-comment headers describing the write
     * path in prose, and counting occurrences inside prose would make the assertion satisfiable
     * by a comment rather than by code. */
    function withoutComments(text: string): string {
        const noBlockComments = text.replace(/\/\*[\s\S]*?\*\//g, '');
        return noBlockComments
            .split('\n')
            .filter(line => !line.trim().startsWith('//'))
            .join('\n');
    }

    test.each([
        'src/setopts-tristate-webview.ts',
        'src/setopts-composer-webview.ts',
    ])('%s: at least one guard call, and its workspace-apply count equals its guard-call count', (relativePath) => {
        const code = withoutComments(fs.readFileSync(path.join(REPO_ROOT, relativePath), 'utf-8'));
        const guardCalls = (code.match(/applyIfUnchanged\(/g) ?? []).length;
        const applyCalls = (code.match(/vscode\.workspace\.applyEdit\(/g) ?? []).length;

        expect(guardCalls).toBeGreaterThanOrEqual(1);
        expect(applyCalls).toBe(guardCalls);
    });
});
