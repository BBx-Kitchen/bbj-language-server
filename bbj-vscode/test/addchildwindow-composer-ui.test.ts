import { beforeEach, describe, expect, test, vi } from 'vitest';

/**
 * Unit coverage for the addChildWindow composer's VS Code UI wiring (issue #628): the
 * `registerAddChildWindowComposer` registration, its `CodeActionProvider` (including its
 * no-flags-slot refusal and "Child" title fallback), its `bbj.composeAddChildWindow` command, and
 * the composer-cue click path through `openComposerAt`. Every other test file that imports
 * `addchildwindow-composer-ui.ts` replaces it with `vi.fn()`, so none of this wiring has run under
 * test before this file.
 *
 * Modelled on `test/addwindow-composer-ui.test.ts`'s harness: only `vscode` is mocked here, so
 * `registerAddChildWindowComposer`, `addChildWindowPanelArgAt`, `openAddChildWindowComposerPanel`
 * and `openComposerAt` all run for real.
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
        startLine: number;
        startCharacter: number;
        endLine: number;
        endCharacter: number;
        // vscode.Range has two constructor forms: four numbers, or two Positions. Widened here to
        // accept both -- called with either (line, char, line, char) or (Position, Position,
        // undefined, undefined) -- while still storing the same four numeric fields either way, so
        // every existing toEqual comparison against this class is unchanged.
        constructor(
            startLineOrStart: number | InstanceType<typeof FakePosition>,
            startCharacterOrEnd: number | InstanceType<typeof FakePosition>,
            endLine?: number,
            endCharacter?: number
        ) {
            if (startLineOrStart instanceof FakePosition && startCharacterOrEnd instanceof FakePosition) {
                this.startLine = startLineOrStart.line;
                this.startCharacter = startLineOrStart.character;
                this.endLine = startCharacterOrEnd.line;
                this.endCharacter = startCharacterOrEnd.character;
            } else {
                this.startLine = startLineOrStart as number;
                this.startCharacter = startCharacterOrEnd as number;
                this.endLine = endLine as number;
                this.endCharacter = endCharacter as number;
            }
        }
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
import { registerAddChildWindowComposer, addChildWindowPanelArgAt } from '../src/addchildwindow-composer-ui.js';
import { AddChildWindowPanelArg } from '../src/addchildwindow-composer-webview.js';
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

function getRegisteredCommandHandler(): (arg?: AddChildWindowPanelArg) => void {
    const call = registerCommandMock.mock.calls.find((c: unknown[]) => c[0] === 'bbj.composeAddChildWindow');
    if (!call) throw new Error('bbj.composeAddChildWindow was not registered');
    return call[1] as (arg?: AddChildWindowPanelArg) => void;
}

const CONTEXT_EXPR = 'sysgui!.getAvailableContext()';
// A single hex-literal flags argument: Keyboard navigation (0x00010000) only.
const LINE_FLAGS_ONLY = `c! = window!.addChildWindow(101, 10, 10, 200, 150, "Kid", $00010000$, ${CONTEXT_EXPR})`;
// Same flags plus an event mask, both carrying one extra bit ($1 / $2) no catalog entry models.
const LINE_UNKNOWN_BITS = `c! = window!.addChildWindow(101, 10, 10, 200, 150, "Kid", $00010001$, ${CONTEXT_EXPR}, $00000042$)`;
// A call with a title but no flags literal yet.
const LINE_TITLE_NO_FLAGS = `c! = window!.addChildWindow(101, 10, 10, 200, 150, "Kid", ${CONTEXT_EXPR})`;
// A call whose second-to-last argument (where the title would be) is not a string literal, and
// has no flags literal either — the no-flags-slot overload addWindow does not have.
const LINE_NO_FLAGS_SLOT = `c! = window!.addChildWindow(101, 10, 10, 200, 150, someExpr, ${CONTEXT_EXPR})`;
// A call whose title argument is not a string literal (flags present).
const LINE_NO_TITLE_LITERAL = `c! = window!.addChildWindow(101, 10, 10, 200, 150, childTitle$, $00010000$, ${CONTEXT_EXPR})`;

describe('registerAddChildWindowComposer registration', () => {
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

        registerAddChildWindowComposer(fakeContext as unknown as Parameters<typeof registerAddChildWindowComposer>[0]);

        expect(registerCommandMock).toHaveBeenCalledTimes(1);
        const [commandId, commandFn] = registerCommandMock.mock.calls[0];
        expect(commandId).toBe('bbj.composeAddChildWindow');
        expect(typeof commandFn).toBe('function');

        expect(registerCodeActionsProviderMock).toHaveBeenCalledTimes(1);
        const [languageArg, providerArg, metadataArg] = registerCodeActionsProviderMock.mock.calls[0];
        expect(languageArg).toEqual({ language: 'bbj' });
        expect(typeof (providerArg as { provideCodeActions: unknown }).provideCodeActions).toBe('function');
        expect(metadataArg).toEqual({ providedCodeActionKinds: [CodeActionKind.RefactorRewrite] });

        expect(fakeContext.subscriptions).toEqual([commandDisposable, providerDisposable]);
    });
});

describe('AddChildWindowCodeActionProvider', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        activeTextEditor = undefined;
        textDocuments = [];
    });

    function getProvider() {
        registerAddChildWindowComposer(fakeContext as unknown as Parameters<typeof registerAddChildWindowComposer>[0]);
        const call = registerCodeActionsProviderMock.mock.calls[0];
        return call[1] as { provideCodeActions: (doc: unknown, range: unknown) => Array<{ title: string; kind: unknown; command: { command: string; title: string; arguments: unknown[] } }> };
    }

    test('a call with a flags literal gets one Code Action with a literal label and a literal AddChildWindowPanelArg', () => {
        const provider = getProvider();
        const character = LINE_FLAGS_ONLY.indexOf('$00010000$');
        const actions = provider.provideCodeActions(fakeDocument(LINE_FLAGS_ONLY, 'file:///a.bbj'), fakeRange(0, character));

        expect(actions).toHaveLength(1);
        const action = actions[0];
        expect(action.title).toBe('Configure child window flags (Keyboard navigation)');
        expect(action.kind).toBe(CodeActionKind.RefactorRewrite);
        expect(action.command.command).toBe('bbj.composeAddChildWindow');
        expect(action.command.title).toBe(action.title);

        const flagsStart = LINE_FLAGS_ONLY.indexOf('$00010000$');
        const flagsEnd = flagsStart + '$00010000$'.length;
        const contextEnd = LINE_FLAGS_ONLY.indexOf(CONTEXT_EXPR) + CONTEXT_EXPR.length;
        const arg = action.command.arguments[0] as AddChildWindowPanelArg;
        expect(arg).toEqual({
            target: {
                uri: 'file:///a.bbj',
                line: 0,
                flagsRange: [flagsStart, flagsEnd],
                flagsInsertOffset: undefined,
                eventMaskRange: undefined,
                eventMaskInsertOffset: contextEnd,
                preservedFlagBits: 0,
                preservedEventBits: 0,
            },
            initial: {
                flags: 0x00010000,
                eventMask: null,
                receiver: '',
                window: 'window!',
                id: '',
                context: '',
                x: '', y: '', width: '', height: '',
                title: '"Kid"',
            },
        });
    });

    test('a call whose flags and event mask carry bits outside the catalogs preserves the unknown bits literally', () => {
        const provider = getProvider();
        const character = LINE_UNKNOWN_BITS.indexOf('$00010001$');
        const actions = provider.provideCodeActions(fakeDocument(LINE_UNKNOWN_BITS, 'file:///d.bbj'), fakeRange(0, character));

        expect(actions).toHaveLength(1);
        const arg = actions[0].command.arguments[0] as AddChildWindowPanelArg;
        expect(arg.target!.preservedFlagBits).toBe(1);
        expect(arg.target!.preservedEventBits).toBe(2);
        expect(actions[0].title).toBe('Configure child window flags (Keyboard navigation)');
    });

    test('a call with a title but no flags literal offers "Add child window flags…" with the insert offset just past the title, before the context argument', () => {
        const provider = getProvider();
        const character = LINE_TITLE_NO_FLAGS.indexOf('"Kid"');
        const actions = provider.provideCodeActions(fakeDocument(LINE_TITLE_NO_FLAGS, 'file:///e.bbj'), fakeRange(0, character));

        expect(actions).toHaveLength(1);
        expect(actions[0].title).toBe('Add child window flags…');
        const arg = actions[0].command.arguments[0] as AddChildWindowPanelArg;
        expect(arg.target!.flagsRange).toBeUndefined();
        const expectedOffset = LINE_TITLE_NO_FLAGS.indexOf('"Kid"') + '"Kid"'.length;
        expect(arg.target!.flagsInsertOffset).toBe(expectedOffset);
        expect(arg.target!.flagsInsertOffset).toBeLessThan(LINE_TITLE_NO_FLAGS.indexOf(CONTEXT_EXPR));
    });

    test('a call with no title slot and no flags literal offers no Code Action, and addChildWindowPanelArgAt returns undefined', () => {
        const provider = getProvider();
        const character = LINE_NO_FLAGS_SLOT.indexOf('someExpr');
        const actions = provider.provideCodeActions(fakeDocument(LINE_NO_FLAGS_SLOT, 'file:///j.bbj'), fakeRange(0, character));

        expect(actions).toEqual([]);
        expect(addChildWindowPanelArgAt('file:///j.bbj', 0, LINE_NO_FLAGS_SLOT, character)).toBeUndefined();
    });

    test('a call with no string-literal title falls back to a "Child" title in the initial preview', () => {
        const provider = getProvider();
        const character = LINE_NO_TITLE_LITERAL.indexOf('$00010000$');
        const actions = provider.provideCodeActions(fakeDocument(LINE_NO_TITLE_LITERAL, 'file:///f.bbj'), fakeRange(0, character));

        expect(actions).toHaveLength(1);
        const arg = actions[0].command.arguments[0] as AddChildWindowPanelArg;
        expect(arg.initial!.title).toBe('"Child"');
    });

    test('no action when the cursor sits outside every addChildWindow call on the line', () => {
        const provider = getProvider();
        const actions = provider.provideCodeActions(fakeDocument(LINE_FLAGS_ONLY, 'file:///g.bbj'), fakeRange(0, 0));
        expect(actions).toHaveLength(0);
    });

    test('no action on a line with no addChildWindow call at all', () => {
        const provider = getProvider();
        const line = 'x = 1 + 2';
        const actions = provider.provideCodeActions(fakeDocument(line, 'file:///h.bbj'), fakeRange(0, 3));
        expect(actions).toEqual([]);
    });
});

describe('addChildWindowPanelArgAt (direct)', () => {
    test('returns undefined when there is no addChildWindow call on the line', () => {
        expect(addChildWindowPanelArgAt('file:///x.bbj', 0, 'x = 1', 2)).toBeUndefined();
    });
});

describe('bbj.composeAddChildWindow command routing', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        activeTextEditor = undefined;
        textDocuments = [];
    });

    test('no argument and an active editor opens a NEW addChildWindow Composer panel; ready posts init with editMode false', async () => {
        activeTextEditor = {
            document: { uri: { toString: () => 'file:///new.bbj' } },
            selection: { active: { line: 2, character: 4 } },
        };
        const { panel, getHandler } = createFakePanel();
        createWebviewPanelMock.mockReturnValueOnce(panel);
        registerAddChildWindowComposer(fakeContext as unknown as Parameters<typeof registerAddChildWindowComposer>[0]);
        const commandHandler = getRegisteredCommandHandler();

        commandHandler(undefined);

        expect(createWebviewPanelMock).toHaveBeenCalledTimes(1);
        const [viewType, title] = createWebviewPanelMock.mock.calls[0];
        expect(viewType).toBe('bbjAddChildWindowComposer');
        expect(title).toBe('addChildWindow Composer');

        const handler = getHandler()!;
        await handler({ type: 'ready' });
        expect(panel.webview.postMessage).toHaveBeenCalledWith(expect.objectContaining({ type: 'init', editMode: false }));
    });

    test('no argument and no active editor shows the open-a-BBj-file message and creates no panel', () => {
        activeTextEditor = undefined;
        registerAddChildWindowComposer(fakeContext as unknown as Parameters<typeof registerAddChildWindowComposer>[0]);
        const commandHandler = getRegisteredCommandHandler();

        commandHandler(undefined);

        expect(showInformationMessageMock).toHaveBeenCalledWith('Open a BBj file first, then run the addChildWindow composer.');
        expect(createWebviewPanelMock).not.toHaveBeenCalled();
    });

    test('invoked with a Code Action-shaped argument opens "Edit addChildWindow flags"; a well-formed insert payload replaces the pinned flagsRange and disposes the panel', async () => {
        const { panel, getHandler } = createFakePanel();
        createWebviewPanelMock.mockReturnValueOnce(panel);
        registerAddChildWindowComposer(fakeContext as unknown as Parameters<typeof registerAddChildWindowComposer>[0]);
        const commandHandler = getRegisteredCommandHandler();

        const editArg: AddChildWindowPanelArg = {
            target: { uri: 'file:///edit.bbj', line: 3, flagsRange: [50, 61], preservedFlagBits: 0, preservedEventBits: 0 },
            initial: {
                flags: 0x00010000, eventMask: null,
                receiver: '', window: 'window!', id: '', context: '', x: '', y: '', width: '', height: '', title: '"Kid"',
            },
        };
        commandHandler(editArg);

        expect(createWebviewPanelMock).toHaveBeenCalledTimes(1);
        const [, title] = createWebviewPanelMock.mock.calls[0];
        expect(title).toBe('Edit addChildWindow flags');

        const handler = getHandler()!;
        await handler({ type: 'ready' });
        await handler({
            type: 'insert',
            payload: {
                flags: [], eventMaskEnabled: false, eventMask: [],
                receiver: 'child!', window: 'window!', id: '101', context: CONTEXT_EXPR,
                x: '10', y: '10', width: '200', height: '150', title: '"Child"',
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

describe('composer-cue click through openComposerAt for kind addchildwindow', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        activeTextEditor = undefined;
        textDocuments = [];
    });

    test('opens "Edit addChildWindow flags" for a document in workspace.textDocuments whose current text still holds the call', async () => {
        const uri = 'file:///lens.bbj';
        const line = LINE_FLAGS_ONLY;
        textDocuments = [{ uri: { toString: () => uri }, lineAt: (_l: number) => ({ text: line }) }];
        const { panel } = createFakePanel();
        createWebviewPanelMock.mockReturnValueOnce(panel);
        const character = line.indexOf('$00010000$');

        await openComposerAt(fakeContext as unknown as Parameters<typeof openComposerAt>[0], { kind: 'addchildwindow', uri, line: 0, character });

        expect(createWebviewPanelMock).toHaveBeenCalledTimes(1);
        const [, title] = createWebviewPanelMock.mock.calls[0];
        expect(title).toBe('Edit addChildWindow flags');
        expect(showInformationMessageMock).not.toHaveBeenCalled();
    });

    test('shows LENS_TARGET_GONE_TEXT and opens no panel when the line no longer holds an addChildWindow call', async () => {
        const uri = 'file:///lens2.bbj';
        const line = 'c! = 1';
        textDocuments = [{ uri: { toString: () => uri }, lineAt: (_l: number) => ({ text: line }) }];

        await openComposerAt(fakeContext as unknown as Parameters<typeof openComposerAt>[0], { kind: 'addchildwindow', uri, line: 0, character: 2 });

        expect(showInformationMessageMock).toHaveBeenCalledWith(LENS_TARGET_GONE_TEXT);
        expect(createWebviewPanelMock).not.toHaveBeenCalled();
    });
});
