import { describe, expect, test } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { NO_ACTIVE_BBJ_FILE_MESSAGE, type ActiveEditorSnapshot } from '../src/Commands/target-resolution.js';
import { createDenumberCommand, denumberFailedMessage, type DenumberDocument } from '../src/denumber-command.js';
import type { DenumParams, DenumResult } from '../src/language/denum-command.js';

/**
 * Covers the Denumber BBj Program command through recording stubs (no editor host, no language
 * client), plus source guards over the command module and `extension.ts` and a pin of the
 * `package.json` contribution points the command keeps: id, title, icon, keybinding and menus.
 */

const REPO_ROOT = path.resolve(__dirname, '..');

type Call = [string, ...unknown[]];

interface Recorder {
    calls: Call[];
    names(): string[];
    count(name: string): number;
}

interface Scenario {
    active?: ActiveEditorSnapshot;
    visible?: boolean;
    sendResult?: DenumResult;
    sendError?: unknown;
    openError?: unknown;
}

function documentFor(fsPath: string): DenumberDocument & { fsPath: string } {
    return { fsPath, uri: { toString: () => `file://${fsPath}` } };
}

function setup(scenario: Scenario = {}) {
    const calls: Call[] = [];
    const recorder: Recorder = {
        calls,
        names: () => calls.map(call => call[0]),
        count: (name: string) => calls.filter(call => call[0] === name).length,
    };
    const handler = createDenumberCommand({
        activeEditor: () => scenario.active,
        openDocument: async (fsPath: string) => {
            calls.push(['openDocument', fsPath]);
            if (scenario.openError !== undefined) {
                throw scenario.openError;
            }
            return documentFor(fsPath);
        },
        isVisible: (uri: string) => {
            calls.push(['isVisible', uri]);
            return scenario.visible ?? false;
        },
        show: async (document) => {
            calls.push(['show', document.uri.toString()]);
        },
        skipOpenPrompt: (uri: string) => {
            calls.push(['skipOpenPrompt', uri]);
        },
        sendDenum: async (params: DenumParams) => {
            calls.push(['sendDenum', params]);
            if (scenario.sendError !== undefined) {
                throw scenario.sendError;
            }
            return scenario.sendResult ?? { status: 'denumbered' };
        },
        warn: (message: string) => {
            calls.push(['warn', message]);
        },
        error: (message: string) => {
            calls.push(['error', message]);
        },
    });
    return { handler, recorder };
}

const bbjEditor: ActiveEditorSnapshot = { fileName: '/work/active.bbj', languageId: 'bbj' };

describe('the Denumber command target guard', () => {
    test('with no argument and no active editor it warns once and sends nothing', async () => {
        const { handler, recorder } = setup();
        await handler();
        expect(recorder.calls).toEqual([['warn', NO_ACTIVE_BBJ_FILE_MESSAGE]]);
    });

    test('a config.bbx editor (language bbx-config) is not a target', async () => {
        const { handler, recorder } = setup({ active: { fileName: '/work/config.bbx', languageId: 'bbx-config' } });
        await handler();
        expect(recorder.calls).toEqual([['warn', NO_ACTIVE_BBJ_FILE_MESSAGE]]);
    });

    test('a .bbjt editor is not a target', async () => {
        const { handler, recorder } = setup({ active: { fileName: '/work/layout.bbjt', languageId: 'bbj' } });
        await handler();
        expect(recorder.calls).toEqual([['warn', NO_ACTIVE_BBJ_FILE_MESSAGE]]);
    });

    test('an argument with a string fsPath wins over the active editor', async () => {
        const { handler, recorder } = setup({ active: bbjEditor });
        await handler({ fsPath: '/work/other.bbj' });
        expect(recorder.calls[0]).toEqual(['openDocument', '/work/other.bbj']);
        expect(recorder.count('openDocument')).toBe(1);
    });

    test.each([
        ['a number', 42],
        ['an empty object', {}],
        ['a non-string fsPath', { fsPath: 7 }],
        ['an empty fsPath', { fsPath: '' }],
        ['null', null],
        ['a string', '/work/other.bbj'],
    ])('%s is treated as no argument and falls back to the active editor', async (_label, argument) => {
        const { handler, recorder } = setup({ active: bbjEditor });
        await handler(argument);
        expect(recorder.calls[0]).toEqual(['openDocument', '/work/active.bbj']);
        expect(recorder.count('openDocument')).toBe(1);
    });

    test.each([
        ['a number', 42],
        ['an empty object', {}],
        ['a non-string fsPath', { fsPath: 7 }],
    ])('%s with no active editor warns and never reaches openDocument', async (_label, argument) => {
        const { handler, recorder } = setup();
        await handler(argument);
        expect(recorder.calls).toEqual([['warn', NO_ACTIVE_BBJ_FILE_MESSAGE]]);
    });

    test('the Explorer selection array passed as a second argument is ignored', async () => {
        const { handler, recorder } = setup();
        const explorerCall = handler as (first?: unknown, second?: unknown) => Promise<void>;
        await explorerCall({ fsPath: '/work/first.bbj' }, [{ fsPath: '/work/first.bbj' }, { fsPath: '/work/second.bbj' }]);
        expect(recorder.count('openDocument')).toBe(1);
        expect(recorder.count('sendDenum')).toBe(1);
        expect(recorder.calls[0]).toEqual(['openDocument', '/work/first.bbj']);
    });
});

describe('the Denumber command request', () => {
    test('a document that is not visible is opened, marked, shown and only then sent, with its own URI', async () => {
        const { handler, recorder } = setup({ visible: false });
        await handler({ fsPath: '/work/numbered.bbj' });
        expect(recorder.calls).toEqual([
            ['openDocument', '/work/numbered.bbj'],
            ['skipOpenPrompt', 'file:///work/numbered.bbj'],
            ['isVisible', 'file:///work/numbered.bbj'],
            ['show', 'file:///work/numbered.bbj'],
            ['sendDenum', { uri: 'file:///work/numbered.bbj' }],
        ]);
    });

    test('a document that is already visible is not shown again', async () => {
        const { handler, recorder } = setup({ visible: true });
        await handler({ fsPath: '/work/numbered.bbj' });
        expect(recorder.names()).toEqual(['openDocument', 'skipOpenPrompt', 'isVisible', 'sendDenum']);
        expect(recorder.count('show')).toBe(0);
    });

    test('the active editor is the target when there is no argument', async () => {
        const { handler, recorder } = setup({ active: bbjEditor, visible: true });
        await handler();
        expect(recorder.calls.at(-1)).toEqual(['sendDenum', { uri: 'file:///work/active.bbj' }]);
    });

    test.each<[string, DenumResult]>([
        ['denumbered', { status: 'denumbered' }],
        ['not line-numbered', { status: 'not-line-numbered' }],
        ['not open', { status: 'failed', reason: 'not-open', message: 'Open the BBj file in the editor first.' }],
        ['in progress', { status: 'failed', reason: 'in-progress', message: 'Denumber is already running.' }],
        ['tokenized', { status: 'failed', reason: 'tokenized' }],
    ])('a %s result shows nothing on the client and sends exactly once', async (_label, sendResult) => {
        const { handler, recorder } = setup({ visible: true, sendResult });
        await handler({ fsPath: '/work/numbered.bbj' });
        expect(recorder.count('sendDenum')).toBe(1);
        expect(recorder.count('warn')).toBe(0);
        expect(recorder.count('error')).toBe(0);
    });

    test('a rejected request gives exactly one error message and no warning', async () => {
        const { handler, recorder } = setup({ visible: true, sendError: new Error('connection lost') });
        await handler({ fsPath: '/work/numbered.bbj' });
        expect(recorder.calls.filter(call => call[0] === 'error')).toEqual([['error', 'Denumber failed: connection lost']]);
        expect(recorder.count('warn')).toBe(0);
        expect(recorder.count('sendDenum')).toBe(1);
    });

    test('a file that cannot be opened gives one error message and sends nothing', async () => {
        const { handler, recorder } = setup({ openError: new Error('file not found') });
        await handler({ fsPath: '/work/missing.bbj' });
        const errors = recorder.calls.filter(call => call[0] === 'error');
        expect(errors).toHaveLength(1);
        expect(String(errors[0][1])).toMatch(/^Denumber failed: /);
        expect(recorder.count('sendDenum')).toBe(0);
        expect(recorder.count('show')).toBe(0);
    });

    test('two invocations started back to back send two requests and add no client message', async () => {
        const { handler, recorder } = setup({ visible: true });
        await Promise.all([handler({ fsPath: '/work/numbered.bbj' }), handler({ fsPath: '/work/numbered.bbj' })]);
        expect(recorder.count('sendDenum')).toBe(2);
        expect(recorder.count('warn')).toBe(0);
        expect(recorder.count('error')).toBe(0);
    });
});

describe('denumberFailedMessage', () => {
    test('uses the message of an Error and the string form of anything else', () => {
        expect(denumberFailedMessage(new Error('boom'))).toBe('Denumber failed: boom');
        expect(denumberFailedMessage('plain text')).toBe('Denumber failed: plain text');
        expect(denumberFailedMessage(17)).toBe('Denumber failed: 17');
    });
});

describe('the Denumber command sources', () => {
    const commandSource = fs.readFileSync(path.join(REPO_ROOT, 'src/denumber-command.ts'), 'utf-8');
    const extensionSource = fs.readFileSync(path.join(REPO_ROOT, 'src/extension.ts'), 'utf-8');

    test('the command module imports neither vscode nor child_process', () => {
        expect(commandSource).not.toMatch(/from\s+['"](vscode|child_process|node:child_process)['"]/);
    });

    test('the command module has no save or write path', () => {
        expect(commandSource).not.toMatch(/\.save\(|writeFile|applyEdit|\.edit\(/);
    });

    test('extension.ts registers bbj.denumber through createDenumberCommand', () => {
        expect(extensionSource).toContain('registerCommand("bbj.denumber", createDenumberCommand(');
    });

    test('extension.ts no longer references the old bbjlst-based denumber member', () => {
        expect(extensionSource).not.toMatch(/Commands\.denumber/);
    });

    test('extension.ts sends the request through the shared client with the shared method constant', () => {
        expect(extensionSource).toContain('sendRequest<DenumResult>(DENUM_REQUEST_METHOD');
    });
});

describe('the package.json contribution points of Denumber BBj Program', () => {
    const manifest = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'package.json'), 'utf-8'));
    const contributes = manifest.contributes;
    const when = 'resourceLangId == bbj && resourceExtname != .bbjt';
    const sharedRunClause = '(resourceLangId == bbj && resourceExtname != .bbjt) || resourceLangId == bbx';

    test('keeps its id, title and both icons', () => {
        const entry = contributes.commands.find((command: { command: string }) => command.command === 'bbj.denumber');
        expect(entry).toBeDefined();
        expect(entry.title).toBe('Denumber BBj Program');
        expect(entry.icon).toEqual({
            light: './images/bbj-denumber-light.svg',
            dark: './images/bbj-denumber-dark.svg',
        });
    });

    test('keeps the Alt+N keybinding', () => {
        const bindings = contributes.keybindings.filter((binding: { command: string }) => binding.command === 'bbj.denumber');
        expect(bindings).toEqual([{ command: 'bbj.denumber', key: 'alt+n' }]);
    });

    test('keeps exactly its editor context, editor title and Explorer context entries', () => {
        const menuEntries = (menu: string) =>
            contributes.menus[menu].filter((item: { command: string }) => item.command === 'bbj.denumber');
        expect(menuEntries('editor/context')).toEqual([{ when, command: 'bbj.denumber', group: 'BBj@5' }]);
        expect(menuEntries('editor/title')).toEqual([{ when, command: 'bbj.denumber', group: 'navigation@2' }]);
        expect(menuEntries('explorer/context')).toEqual([{ when, command: 'bbj.denumber', group: 'BBj@5' }]);

        const menusWithDenumber = Object.keys(contributes.menus).filter(menu => menuEntries(menu).length > 0);
        expect(menusWithDenumber.sort()).toEqual(['editor/context', 'editor/title', 'explorer/context']);
    });

    test('offers Denumber only for bbj documents, with no bbx branch, and leaves the other entries on the shared clause', () => {
        const allEntries: Array<{ when?: string; command: string }> = Object.values(contributes.menus).flat() as Array<{
            when?: string;
            command: string;
        }>;
        const denumberEntries = allEntries.filter(item => item.command === 'bbj.denumber');
        expect(denumberEntries).toHaveLength(3);
        for (const item of denumberEntries) {
            expect(item.when).not.toContain('bbx');
        }

        const onSharedClause = allEntries.filter(item => item.when === sharedRunClause);
        expect(onSharedClause).toHaveLength(12);
        expect(onSharedClause.some(item => item.command === 'bbj.denumber')).toBe(false);
    });
});
