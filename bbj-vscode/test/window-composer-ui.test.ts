import { describe, expect, test, vi } from 'vitest';

/**
 * Unit coverage for the shared addWindow/addChildWindow title pick and Code Action argument
 * builder (issue #534): `titleArg` and `windowPanelArgAt`, tested with a fake spec and literal
 * expectations, plus a check that `addWindowPanelArgAt` (the thin addwindow-composer-ui.ts
 * wrapper) still returns exactly the values the addwindow-composer-ui.test.ts fixture pins.
 *
 * `vscode` is mocked only so `addwindow-composer-ui.ts`'s module-level `import * as vscode from
 * 'vscode'` resolves; no vscode API is actually exercised by the tests below.
 */

vi.mock('vscode', () => ({
    commands: { registerCommand: vi.fn() },
    languages: { registerCodeActionsProvider: vi.fn() },
    CodeActionKind: { RefactorRewrite: { value: 'refactor.rewrite' } },
    CodeAction: class FakeCodeAction { constructor(public title: string, public kind: unknown) { } },
}));

import {
    titleArg, windowPanelArgAt, WINDOW_TITLE_FALLBACK,
    type WindowCallInfo, type WindowPanelArgSpec,
} from '../src/window-composer-ui.js';
import { addWindowPanelArgAt } from '../src/addwindow-composer-ui.js';
import { WINDOW_FLAGS, EVENT_MASK_BITS, unknownBits } from '../src/addwindow-composer.js';

describe('titleArg', () => {
    test('returns the last string-literal arg before the flags', () => {
        expect(titleArg(['x', '"A"', 'y', '"B"', 'z'], '"F"')).toBe('"B"');
    });

    test('returns a literal whose text carries an escaped embedded quote', () => {
        expect(titleArg(['"say ""hi"""'], '"F"')).toBe('"say ""hi"""');
    });

    test('falls back to the fallback when there is no string-literal arg', () => {
        expect(titleArg([], '"F"')).toBe('"F"');
        expect(titleArg(['a$', '"a" + b$'], '"F"')).toBe('"F"');
    });
});

interface FakeExtra {
    fixedField: string;
}

function fakeSpec(overrides: Partial<WindowPanelArgSpec<FakeExtra>> = {}): WindowPanelArgSpec<FakeExtra> {
    return {
        findCallAt: () => undefined,
        flagCatalog: WINDOW_FLAGS,
        eventCatalog: EVENT_MASK_BITS,
        describeFlags: (mask: number) => `flags:${mask}`,
        titleFallback: '"Fallback"',
        fixedInitial: { fixedField: 'fixed' },
        configureLabel: 'Configure test flags',
        addLabel: 'Add test flags…',
        requireFlagsSlot: false,
        ...overrides,
    };
}

describe('windowPanelArgAt', () => {
    test('returns undefined when the spec finds no call', () => {
        expect(windowPanelArgAt(fakeSpec(), 'file:///x.bbj', 0, 'x', 0)).toBeUndefined();
    });

    test('with a flags value: the configure label, preserved unknown bits, and a merged initial', () => {
        const info: WindowCallInfo = {
            args: ['"Title"'],
            flagsValue: 0x00010043,
            flagsRange: [5, 16],
            eventMaskValue: 0x00000042,
            eventMaskRange: [18, 29],
        };
        const spec = fakeSpec({ findCallAt: () => info });

        const result = windowPanelArgAt(spec, 'file:///a.bbj', 2, 'line text', 7);

        expect(result).toEqual({
            arg: {
                target: {
                    uri: 'file:///a.bbj',
                    line: 2,
                    flagsRange: [5, 16],
                    flagsInsertOffset: undefined,
                    eventMaskRange: [18, 29],
                    eventMaskInsertOffset: undefined,
                    preservedFlagBits: unknownBits(0x00010043, WINDOW_FLAGS),
                    preservedEventBits: unknownBits(0x00000042, EVENT_MASK_BITS),
                },
                initial: {
                    flags: 0x00010043,
                    eventMask: 0x00000042,
                    title: '"Title"',
                    fixedField: 'fixed',
                },
            },
            label: 'Configure test flags (flags:65603)',
        });
    });

    test('a call with neither a flags value nor a flags-insert slot: undefined when requireFlagsSlot is true', () => {
        const info: WindowCallInfo = { args: [] };
        const spec = fakeSpec({ findCallAt: () => info, requireFlagsSlot: true });

        expect(windowPanelArgAt(spec, 'file:///a.bbj', 0, 'x', 0)).toBeUndefined();
    });

    test('a call with neither a flags value nor a flags-insert slot: the add label with no flags range/offset when requireFlagsSlot is false', () => {
        const info: WindowCallInfo = { args: [] };
        const spec = fakeSpec({ findCallAt: () => info, requireFlagsSlot: false });

        const result = windowPanelArgAt(spec, 'file:///a.bbj', 0, 'x', 0);

        expect(result?.label).toBe('Add test flags…');
        expect(result?.arg.target.flagsRange).toBeUndefined();
        expect(result?.arg.target.flagsInsertOffset).toBeUndefined();
        expect(result?.arg.initial).toEqual({
            flags: 0,
            eventMask: null,
            title: '"Fallback"',
            fixedField: 'fixed',
        });
    });
});

describe('addWindowPanelArgAt through the shared helper', () => {
    test('pins the same values as the TEST-10 addwindow-composer-ui.test.ts flags-literal fixture', () => {
        const line = 'w! = sysgui!.addWindow(10, 10, 400, 300, "Main", $00010003$)';
        const flagsStart = line.indexOf('$00010003$');
        const flagsEnd = flagsStart + '$00010003$'.length;

        const result = addWindowPanelArgAt('file:///a.bbj', 0, line, flagsStart);

        expect(result).toEqual({
            arg: {
                target: {
                    uri: 'file:///a.bbj',
                    line: 0,
                    flagsRange: [flagsStart, flagsEnd],
                    flagsInsertOffset: undefined,
                    eventMaskRange: undefined,
                    eventMaskInsertOffset: flagsEnd,
                    preservedFlagBits: 0,
                    preservedEventBits: 0,
                },
                initial: {
                    flags: 0x00010003,
                    eventMask: null,
                    receiver: '',
                    sysgui: 'sysgui!',
                    x: '', y: '', width: '', height: '',
                    title: '"Main"',
                },
            },
            label: 'Configure window flags (Close box · Resizable · Keyboard navigation)',
        });
    });

    test('returns undefined when there is no addWindow call on the line', () => {
        expect(addWindowPanelArgAt('file:///x.bbj', 0, 'x = 1', 2)).toBeUndefined();
    });
});

describe('title fallback constants', () => {
    test('WINDOW_TITLE_FALLBACK is the addWindow fallback title literal', () => {
        expect(WINDOW_TITLE_FALLBACK).toBe('"Window"');
    });
});
