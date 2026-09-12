import { beforeEach, describe, expect, test, vi } from 'vitest';

/**
 * Unit coverage for `bbj.openComposerAt` (#650): the VS Code command a composer cue click
 * invokes. Modelled on `test/setopts-in-code-ui.test.ts`'s `vscode` mock
 * harness. `openAddWindowComposerPanel` from `./addwindow-composer-webview.js` is mocked so this
 * file only proves the routing/gone-target/no-edit behaviours, not the webview's own arithmetic
 * (that belongs to `test/addwindow-composer.test.ts`).
 */

const {
    registerCommandMock, showInformationMessageMock, applyEditMock, executeCommandMock,
    openAddWindowComposerPanelMock, openAddChildWindowComposerPanelMock,
    openMsgboxComposerPanelMock, openCvsComposerPanelMock, openSetOptsComposerPanelMock,
} = vi.hoisted(() => ({
    registerCommandMock: vi.fn(),
    showInformationMessageMock: vi.fn(),
    applyEditMock: vi.fn(),
    executeCommandMock: vi.fn(),
    openAddWindowComposerPanelMock: vi.fn(),
    openAddChildWindowComposerPanelMock: vi.fn(),
    openMsgboxComposerPanelMock: vi.fn(),
    openCvsComposerPanelMock: vi.fn(),
    openSetOptsComposerPanelMock: vi.fn(),
}));

let textDocuments: Array<{ uri: { toString(): string }; lineCount: number; lineAt(line: number): { text: string } }> = [];

vi.mock('vscode', () => ({
    window: {
        showInformationMessage: showInformationMessageMock,
    },
    workspace: {
        get textDocuments() { return textDocuments; },
        applyEdit: applyEditMock,
    },
    commands: {
        registerCommand: registerCommandMock,
        executeCommand: executeCommandMock,
    },
    languages: {
        registerCodeActionsProvider: vi.fn(),
    },
    CodeActionKind: { RefactorRewrite: 'refactor.rewrite' },
    CodeAction: class { constructor(public title: string, public kind: unknown) { } },
}));

vi.mock('../src/addwindow-composer-webview.js', () => ({
    openAddWindowComposerPanel: openAddWindowComposerPanelMock,
}));

vi.mock('../src/addchildwindow-composer-webview.js', () => ({
    openAddChildWindowComposerPanel: openAddChildWindowComposerPanelMock,
}));

vi.mock('../src/msgbox-composer-webview.js', () => ({
    openMsgboxComposerPanel: openMsgboxComposerPanelMock,
}));

vi.mock('../src/cvs-composer-webview.js', () => ({
    openCvsComposerPanel: openCvsComposerPanelMock,
}));

vi.mock('../src/setopts-composer-webview.js', () => ({
    openSetOptsComposerPanel: openSetOptsComposerPanelMock,
}));

import {
    registerComposerLensCommand, openComposerAt,
} from '../src/composer-lens-command.js';
import { COMPOSER_LENS_COMMAND, LENS_TARGET_GONE_TEXT, type ComposerLensTarget } from '../src/composer-lens-contract.js';
import { addWindowPanelArgAt } from '../src/addwindow-composer-ui.js';
import { addChildWindowPanelArgAt } from '../src/addchildwindow-composer-ui.js';
import { decodeMsgboxCall } from '../src/msgbox-composer.js';
import { msgboxPanelArgFromDecode } from '../src/msgbox-composer-ui.js';
import { cvsPanelArgAt } from '../src/cvs-composer-ui.js';
import { setoptsConfigPanelArgAt } from '../src/setopts-composer-ui.js';

const fakeContext = { subscriptions: [] } as unknown as Parameters<typeof openComposerAt>[0];

function fakeDocument(uri: string, lines: string[]) {
    return {
        uri: { toString: () => uri },
        lineCount: lines.length,
        lineAt: (line: number) => ({ text: lines[line] }),
    };
}

describe('registerComposerLensCommand', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        textDocuments = [];
    });

    test('registers exactly the command id bbj.openComposerAt', () => {
        registerComposerLensCommand(fakeContext);
        expect(registerCommandMock).toHaveBeenCalledTimes(1);
        expect(registerCommandMock.mock.calls[0][0]).toBe(COMPOSER_LENS_COMMAND);
        expect(registerCommandMock.mock.calls[0][0]).toBe('bbj.openComposerAt');
    });
});

describe('openComposerAt', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        textDocuments = [];
    });

    test('addwindow: on an open document whose line still carries the call, opens the panel once with the same arg addWindowPanelArgAt builds', async () => {
        const lineText = 'window! = sysgui!.addWindow(10, 10, 400, 300, "Main", $00010003$)';
        textDocuments = [fakeDocument('file:///a.bbj', [lineText])];
        const character = lineText.indexOf('addWindow');
        const target: ComposerLensTarget = { kind: 'addwindow', uri: 'file:///a.bbj', line: 0, character };

        await openComposerAt(fakeContext, target);

        expect(openAddWindowComposerPanelMock).toHaveBeenCalledTimes(1);
        const expected = addWindowPanelArgAt('file:///a.bbj', 0, lineText, character);
        expect(openAddWindowComposerPanelMock.mock.calls[0][1]).toEqual(expected!.arg);
        expect(showInformationMessageMock).not.toHaveBeenCalled();
        expect(applyEditMock).not.toHaveBeenCalled();
    });

    test('a uri not among the open text documents shows the gone message and opens no panel', async () => {
        textDocuments = [];
        const target: ComposerLensTarget = { kind: 'addwindow', uri: 'file:///missing.bbj', line: 0, character: 0 };

        await openComposerAt(fakeContext, target);

        expect(showInformationMessageMock).toHaveBeenCalledWith(LENS_TARGET_GONE_TEXT);
        expect(openAddWindowComposerPanelMock).not.toHaveBeenCalled();
    });

    test('a line index out of range shows the gone message and opens no panel', async () => {
        textDocuments = [fakeDocument('file:///a.bbj', ['x = 1'])];
        const target: ComposerLensTarget = { kind: 'addwindow', uri: 'file:///a.bbj', line: 5, character: 0 };

        await openComposerAt(fakeContext, target);

        expect(showInformationMessageMock).toHaveBeenCalledWith(LENS_TARGET_GONE_TEXT);
        expect(openAddWindowComposerPanelMock).not.toHaveBeenCalled();
    });

    test('a line that no longer carries an addWindow call at that character shows the gone message and opens no panel', async () => {
        textDocuments = [fakeDocument('file:///a.bbj', ['x = 1'])];
        const target: ComposerLensTarget = { kind: 'addwindow', uri: 'file:///a.bbj', line: 0, character: 0 };

        await openComposerAt(fakeContext, target);

        expect(showInformationMessageMock).toHaveBeenCalledWith(LENS_TARGET_GONE_TEXT);
        expect(openAddWindowComposerPanelMock).not.toHaveBeenCalled();
    });

    test('setopts-config: on an open config document whose line still carries a SETOPTS line, calls openSetOptsComposerPanel once with setoptsConfigPanelArgAt(...)', async () => {
        const lineText = 'SETOPTS 00000080';
        textDocuments = [fakeDocument('file:///config.bbx', [lineText])];
        const target: ComposerLensTarget = { kind: 'setopts-config', uri: 'file:///config.bbx', line: 0, character: 0 };

        await openComposerAt(fakeContext, target);

        expect(openSetOptsComposerPanelMock).toHaveBeenCalledTimes(1);
        const expected = setoptsConfigPanelArgAt('file:///config.bbx', 0, lineText);
        expect(openSetOptsComposerPanelMock.mock.calls[0][1]).toEqual(expected);
        expect(showInformationMessageMock).not.toHaveBeenCalled();
        expect(executeCommandMock).not.toHaveBeenCalled();
    });

    test('setopts-config: a line no longer carrying a SETOPTS line shows the gone message and opens no panel', async () => {
        textDocuments = [fakeDocument('file:///config.bbx', ['PREFIX "/x/"'])];
        const target: ComposerLensTarget = { kind: 'setopts-config', uri: 'file:///config.bbx', line: 0, character: 0 };

        await openComposerAt(fakeContext, target);

        expect(showInformationMessageMock).toHaveBeenCalledWith(LENS_TARGET_GONE_TEXT);
        expect(openSetOptsComposerPanelMock).not.toHaveBeenCalled();
    });

    test('msgbox: on a line with a MSGBOX call, calls openMsgboxComposerPanel once with msgboxPanelArgFromDecode(decodeMsgboxCall(...)).arg', async () => {
        const lineText = 'r = MSGBOX("Hi", 36, "T")';
        textDocuments = [fakeDocument('file:///a.bbj', [lineText])];
        const character = lineText.indexOf('MSGBOX');
        const target: ComposerLensTarget = { kind: 'msgbox', uri: 'file:///a.bbj', line: 0, character };

        await openComposerAt(fakeContext, target);

        expect(openMsgboxComposerPanelMock).toHaveBeenCalledTimes(1);
        const decoded = decodeMsgboxCall(lineText, character);
        const expected = msgboxPanelArgFromDecode('file:///a.bbj', 0, lineText, decoded);
        expect(openMsgboxComposerPanelMock.mock.calls[0][1]).toEqual(expected!.arg);
        expect(showInformationMessageMock).not.toHaveBeenCalled();
    });

    test('msgbox: an expression-options MSGBOX call passes an argument carrying replace', async () => {
        const lineText = 'r = MSGBOX("Hi", flags%, "T")';
        textDocuments = [fakeDocument('file:///a.bbj', [lineText])];
        const character = lineText.indexOf('MSGBOX');
        const target: ComposerLensTarget = { kind: 'msgbox', uri: 'file:///a.bbj', line: 0, character };

        await openComposerAt(fakeContext, target);

        expect(openMsgboxComposerPanelMock).toHaveBeenCalledTimes(1);
        expect(openMsgboxComposerPanelMock.mock.calls[0][1].replace).toBeDefined();
    });

    test('msgbox: an unfinished call passes an argument whose target.incomplete is true', async () => {
        const lineText = 'x = MSGBOX(';
        textDocuments = [fakeDocument('file:///a.bbj', [lineText])];
        const character = lineText.indexOf('MSGBOX');
        const target: ComposerLensTarget = { kind: 'msgbox', uri: 'file:///a.bbj', line: 0, character };

        await openComposerAt(fakeContext, target);

        expect(openMsgboxComposerPanelMock).toHaveBeenCalledTimes(1);
        const arg = openMsgboxComposerPanelMock.mock.calls[0][1] as { target?: { incomplete?: boolean; callStart?: number } };
        expect(arg.target?.incomplete).toBe(true);
        expect(arg.target?.callStart).toBe(4);
    });

    test('msgbox: a line no longer carrying the call shows the gone message and opens no panel', async () => {
        textDocuments = [fakeDocument('file:///a.bbj', ['x = 1'])];
        const target: ComposerLensTarget = { kind: 'msgbox', uri: 'file:///a.bbj', line: 0, character: 0 };

        await openComposerAt(fakeContext, target);

        expect(showInformationMessageMock).toHaveBeenCalledWith(LENS_TARGET_GONE_TEXT);
        expect(openMsgboxComposerPanelMock).not.toHaveBeenCalled();
    });

    test('addchildwindow: calls openAddChildWindowComposerPanel with addChildWindowPanelArgAt(...).arg', async () => {
        const lineText = 'child! = window!.addChildWindow(101, "Child", 10, 10, 200, 150, $00000000$)';
        textDocuments = [fakeDocument('file:///a.bbj', [lineText])];
        const character = lineText.indexOf('addChildWindow');
        const target: ComposerLensTarget = { kind: 'addchildwindow', uri: 'file:///a.bbj', line: 0, character };

        await openComposerAt(fakeContext, target);

        expect(openAddChildWindowComposerPanelMock).toHaveBeenCalledTimes(1);
        const expected = addChildWindowPanelArgAt('file:///a.bbj', 0, lineText, character);
        expect(openAddChildWindowComposerPanelMock.mock.calls[0][1]).toEqual(expected!.arg);
        expect(showInformationMessageMock).not.toHaveBeenCalled();
    });

    test('addchildwindow: addChildWindowPanelArgAt keeps the same label/argument logic the Code Action used before extraction', () => {
        // A regression guard for the refactor that extracted addChildWindowPanelArgAt out of the
        // Code Action provider: the visible label/argument output must stay byte-identical.
        const withFlags = 'child! = window!.addChildWindow(101, "Child", 10, 10, 200, 150, $00010000$)';
        const flagsResult = addChildWindowPanelArgAt('file:///a.bbj', 0, withFlags, withFlags.indexOf('addChildWindow'));
        expect(flagsResult?.label).toMatch(/^Configure child window flags \(.+\)$/);

        const noFlagsButTitle = 'child! = window!.addChildWindow(101, 10, 10, 200, 150, "Child", context!)';
        const addResult = addChildWindowPanelArgAt('file:///a.bbj', 0, noFlagsButTitle, noFlagsButTitle.indexOf('addChildWindow'));
        expect(addResult?.label).toBe('Add child window flags…');

        const noTitleNoFlags = 'child! = window!.addChildWindow(101, 10, 10, 200, 150)';
        const noAction = addChildWindowPanelArgAt('file:///a.bbj', 0, noTitleNoFlags, noTitleNoFlags.indexOf('addChildWindow'));
        expect(noAction).toBeUndefined();
    });

    test('addchildwindow: a line no longer carrying the call shows the gone message and opens no panel', async () => {
        textDocuments = [fakeDocument('file:///a.bbj', ['x = 1'])];
        const target: ComposerLensTarget = { kind: 'addchildwindow', uri: 'file:///a.bbj', line: 0, character: 0 };

        await openComposerAt(fakeContext, target);

        expect(showInformationMessageMock).toHaveBeenCalledWith(LENS_TARGET_GONE_TEXT);
        expect(openAddChildWindowComposerPanelMock).not.toHaveBeenCalled();
    });

    test('cvs: calls openCvsComposerPanel with cvsPanelArgAt(...).arg', async () => {
        const lineText = 'x$ = CVS(a$, 1+4)';
        textDocuments = [fakeDocument('file:///a.bbj', [lineText])];
        const character = lineText.indexOf('CVS');
        const target: ComposerLensTarget = { kind: 'cvs', uri: 'file:///a.bbj', line: 0, character };

        await openComposerAt(fakeContext, target);

        expect(openCvsComposerPanelMock).toHaveBeenCalledTimes(1);
        const expected = cvsPanelArgAt('file:///a.bbj', 0, lineText, character);
        expect(openCvsComposerPanelMock.mock.calls[0][1]).toEqual(expected!.arg);
        expect(showInformationMessageMock).not.toHaveBeenCalled();
    });

    test('cvs: a mask-less (incomplete) call opens the composer with cvsPanelArgAt(...).arg carrying incomplete: true, and shows no gone message', async () => {
        const lineText = 'x$ = CVS(a$)';
        textDocuments = [fakeDocument('file:///a.bbj', [lineText])];
        const character = lineText.indexOf('CVS');
        const target: ComposerLensTarget = { kind: 'cvs', uri: 'file:///a.bbj', line: 0, character };

        await openComposerAt(fakeContext, target);

        expect(openCvsComposerPanelMock).toHaveBeenCalledTimes(1);
        const expected = cvsPanelArgAt('file:///a.bbj', 0, lineText, character);
        expect(expected!.arg.target?.incomplete).toBe(true);
        expect(openCvsComposerPanelMock.mock.calls[0][1]).toEqual(expected!.arg);
        expect(showInformationMessageMock).not.toHaveBeenCalled();
    });

    test('cvs: a line whose mask is no longer editable (non-literal) shows the gone message and opens no panel', async () => {
        textDocuments = [fakeDocument('file:///a.bbj', ['x$ = CVS(a$, n%)'])];
        const character = 'x$ = CVS(a$, n%)'.indexOf('CVS');
        const target: ComposerLensTarget = { kind: 'cvs', uri: 'file:///a.bbj', line: 0, character };

        await openComposerAt(fakeContext, target);

        expect(showInformationMessageMock).toHaveBeenCalledWith(LENS_TARGET_GONE_TEXT);
        expect(openCvsComposerPanelMock).not.toHaveBeenCalled();
    });

    test('setopts-in-code: executes bbj.composeSetoptsInCode exactly once with { uri, line, character } and opens no panel of its own', async () => {
        const lineText = 'SETOPTS $04$';
        textDocuments = [fakeDocument('file:///a.bbj', [lineText])];
        const character = lineText.indexOf('$04$');
        const target: ComposerLensTarget = { kind: 'setopts-in-code', uri: 'file:///a.bbj', line: 0, character };

        await openComposerAt(fakeContext, target);

        expect(executeCommandMock).toHaveBeenCalledTimes(1);
        expect(executeCommandMock).toHaveBeenCalledWith('bbj.composeSetoptsInCode', {
            uri: 'file:///a.bbj', line: 0, character,
        });
        expect(showInformationMessageMock).not.toHaveBeenCalled();
        expect(openAddWindowComposerPanelMock).not.toHaveBeenCalled();
        expect(openMsgboxComposerPanelMock).not.toHaveBeenCalled();
        expect(openAddChildWindowComposerPanelMock).not.toHaveBeenCalled();
        expect(openCvsComposerPanelMock).not.toHaveBeenCalled();
    });

    test('no branch calls vscode.workspace.applyEdit or any editor edit', async () => {
        const lineText = 'window! = sysgui!.addWindow(10, 10, 400, 300, "Main", $00010003$)';
        textDocuments = [fakeDocument('file:///a.bbj', [lineText])];
        const character = lineText.indexOf('addWindow');
        const target: ComposerLensTarget = { kind: 'addwindow', uri: 'file:///a.bbj', line: 0, character };

        await openComposerAt(fakeContext, target);

        expect(applyEditMock).not.toHaveBeenCalled();
    });
});
