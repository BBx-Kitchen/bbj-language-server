import { beforeEach, describe, expect, test, vi } from 'vitest';

/**
 * Unit coverage for `bbj.openComposerAt` (#650, plan 89-01 Task 3): the VS Code command a
 * composer cue click invokes. Modelled on `test/setopts-in-code-ui.test.ts`'s `vscode` mock
 * harness. `openAddWindowComposerPanel` from `./addwindow-composer-webview.js` is mocked so this
 * file only proves the routing/gone-target/no-edit behaviours, not the webview's own arithmetic
 * (that belongs to `test/addwindow-composer.test.ts`).
 */

const {
    registerCommandMock, showInformationMessageMock, applyEditMock, openAddWindowComposerPanelMock,
} = vi.hoisted(() => ({
    registerCommandMock: vi.fn(),
    showInformationMessageMock: vi.fn(),
    applyEditMock: vi.fn(),
    openAddWindowComposerPanelMock: vi.fn(),
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
    },
}));

vi.mock('../src/addwindow-composer-webview.js', () => ({
    openAddWindowComposerPanel: openAddWindowComposerPanelMock,
}));

import {
    registerComposerLensCommand, openComposerAt,
} from '../src/composer-lens-command.js';
import { COMPOSER_LENS_COMMAND, LENS_TARGET_GONE_TEXT, type ComposerLensTarget } from '../src/composer-lens-contract.js';
import { addWindowPanelArgAt } from '../src/addwindow-composer-ui.js';

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

    test('any other kind shows an information message naming that kind\'s title and opens no panel', async () => {
        textDocuments = [fakeDocument('file:///a.bbj', ['SETOPTS $01$'])];
        const target: ComposerLensTarget = { kind: 'setopts-in-code', uri: 'file:///a.bbj', line: 0, character: 0 };

        await openComposerAt(fakeContext, target);

        expect(showInformationMessageMock).toHaveBeenCalledTimes(1);
        expect(showInformationMessageMock.mock.calls[0][0]).toMatch(/Compose SETOPTS/);
        expect(openAddWindowComposerPanelMock).not.toHaveBeenCalled();
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
