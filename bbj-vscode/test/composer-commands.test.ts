import { describe, expect, test, vi } from 'vitest';
import { composerHandlers, registerComposerRequests } from '../src/language/composer-commands';
import { decodeMsgboxCall } from '../src/msgbox-composer';
import { decodeCvsCall, cvsPreview } from '../src/cvs-composer';

// Thin pass-through handlers: these tests assert the request layer faithfully re-exposes the pure
// composer API (the arithmetic itself is covered by msgbox-composer / addwindow-composer tests).
const call = <M extends keyof typeof composerHandlers>(method: M, params?: unknown) =>
    (composerHandlers[method] as (p: unknown) => unknown)(params);

describe('composer LS command layer (#433)', () => {
    test('catalogs returns both composers option sets', () => {
        const c = call('bbj/composer/catalogs') as any;
        expect(c.msgbox.buttonSets.length).toBeGreaterThan(0);
        expect(c.msgbox.icons.length).toBeGreaterThan(0);
        expect(c.addwindow.flags).toHaveLength(26);
        expect(c.addwindow.eventBits).toHaveLength(19);
        expect(c.addchildwindow.flags).toHaveLength(17);
        expect(c.addchildwindow.eventBits).toHaveLength(19);
        expect(c.setopts.bits).toHaveLength(50);
        expect(c.setopts.byteGroups.map((g: any) => g.byte)).toEqual([1, 2, 3, 4, 7, 8, 9]);
        expect(c.cvs.bits.map((b: any) => b.value)).toEqual([1, 2, 4, 8, 16, 32, 64, 128]);
        expect(c.cvs.charsTooltip.length).toBeGreaterThan(0);
    });

    test('msgbox encode/decode round-trips a selection through expr', () => {
        const { expr } = call('bbj/composer/msgbox/encode', { selection: { buttonSet: 4, icon: 32, flags: [65536] } }) as any;
        expect(expr).toBe(4 + 32 + 65536);
        const decoded = call('bbj/composer/msgbox/decode', { expr }) as any;
        expect(decoded).toEqual({ buttonSet: 4, icon: 32, defaultButton: 0, flags: [65536] });
    });

    test('msgbox compose / describe / validateString pass through', () => {
        expect((call('bbj/composer/msgbox/compose', { input: { message: '"Hi"', expr: 36 } }) as any).statement)
            .toBe('MSGBOX("Hi", 36)');
        expect((call('bbj/composer/msgbox/describe', { expr: 36 }) as any).text).toBe('Yes, No · Question icon');
        expect((call('bbj/composer/msgbox/validateString', { text: 'Caption', required: true }) as any).ok).toBe(false);
        expect((call('bbj/composer/msgbox/validateString', { text: '"Caption"' }) as any).ok).toBe(true);
    });

    test('msgbox/preview returns the full aggregate UI payload in one call', () => {
        const p = call('bbj/composer/msgbox/preview', {
            input: { message: '"Hi"', title: '', buttonSet: 4, icon: 32, defaultButton: 0, flags: [], customButtons: [] },
        }) as any;
        expect(p.expr).toBe(36);
        expect(p.statement).toBe('MSGBOX("Hi", 36)');
        expect(p.valid).toBe(true);
        expect(p.render.buttons).toEqual(['Yes', 'No']);
    });

    test('addwindow/preview returns hex + statement + schematic in one call', () => {
        const p = call('bbj/composer/addwindow/preview', {
            input: { flags: [0x1, 0x2], eventMaskEnabled: false, eventMask: [], receiver: 'w!', sysgui: 'g!', x: '0', y: '0', width: '9', height: '9', title: '"T"' },
        }) as any;
        expect(p.flagsHex).toBe('$00000003$');
        expect(p.statement).toBe('w! = g!.addWindow(0, 0, 9, 9, "T", $00000003$)');
        expect(p.render.closeBox).toBe(true);
        expect(p.valid).toBe(true);
    });

    test('addwindow/preview returns valid: false with xError for a malformed field (#623)', () => {
        const p = call('bbj/composer/addwindow/preview', {
            input: { flags: [], eventMaskEnabled: false, eventMask: [], receiver: 'w!', sysgui: 'g!', x: '"10"', y: '0', width: '9', height: '9', title: '"T"' },
        }) as any;
        expect(p.valid).toBe(false);
        expect(p.xError).toBe('Not a number — remove the quotes: 10');
    });

    test('addchildwindow/preview returns valid: false with idError for a malformed field (#623)', () => {
        const p = call('bbj/composer/addchildwindow/preview', {
            input: {
                flags: [], eventMaskEnabled: false, eventMask: [],
                receiver: 'c!', window: 'w!', id: '"101"', context: 'ctx!',
                x: '0', y: '0', width: '9', height: '9', title: '"T"',
            },
        }) as any;
        expect(p.valid).toBe(false);
        expect(p.idError).toBe('Not a number — remove the quotes: 101');
    });

    test('msgbox parseLine finds the call (first, or the one at the cursor)', () => {
        const first = call('bbj/composer/msgbox/parseLine', { line: 'x = MSGBOX("a", 36)' }) as any;
        expect(first.call.exprValue).toBe(36);
        const line = 'if c then MSGBOX("A", 16) else MSGBOX("B")';
        const at = call('bbj/composer/msgbox/parseLine', { line, character: line.indexOf('"B"') }) as any;
        expect(at.call.exprValue).toBeUndefined(); // the bare second call
    });

    test('addwindow encodeFlags -> mask + canonical hex, preserving unknown bits', () => {
        const r = call('bbj/composer/addwindow/encodeFlags', { bits: [0x1, 0x2, 0x10000] }) as any;
        expect(r.mask).toBe(0x00010003);
        expect(r.hex).toBe('$00010003$');
        // sign bit stays unsigned; a preserved (undocumented) bit is OR-ed back
        const s = call('bbj/composer/addwindow/encodeFlags', { bits: [0x80000000], preserved: 0x00004000 }) as any;
        expect(s.mask).toBe((0x80000000 | 0x00004000) >>> 0);
        expect(s.hex).toBe('$80004000$');
    });

    test('addwindow decodeFlags returns bits + schematic + unknown bits', () => {
        const r = call('bbj/composer/addwindow/decodeFlags', { mask: 0x01000002 | 0x00004000 }) as any;
        expect(r.bits).toContain(0x00000002);      // Close box
        expect(r.bits).toContain(0x01000000);      // No title bar
        expect(r.unknownBits).toBe(0x00004000);    // reserved bit preserved
        expect(r.schematic.titleBar).toBe(false);  // No title bar flag set
        expect(r.schematic.closeBox).toBe(true);
        expect(r.text).toContain('No title bar');
    });

    test('addwindow compose / schematic / parseHex / parseLine pass through', () => {
        const statement = (call('bbj/composer/addwindow/compose', {
            input: { receiver: 'w!', sysgui: 'g!', x: '0', y: '0', width: '9', height: '9', title: '"T"', flags: 0x2 },
        }) as any).statement;
        expect(statement).toBe('w! = g!.addWindow(0, 0, 9, 9, "T", $00000002$)');
        expect((call('bbj/composer/addwindow/schematic', { mask: 0x01000000 }) as any).titleBar).toBe(false);
        expect((call('bbj/composer/addwindow/parseHex', { token: '$00010003$' }) as any).value).toBe(0x00010003);
        const parsed = call('bbj/composer/addwindow/parseLine', { line: 'w! = g!.addWindow("T", $00080002$)' }) as any;
        expect(parsed.call.flagsValue).toBe(0x00080002);
    });

    test('msgbox/decodeCall decodes the call at the caret into a prefill + call span', () => {
        const line = '    ret! = MSGBOX("Are you sure?", 36, "Confirm")';
        const r = call('bbj/composer/msgbox/decodeCall', { line, character: line.indexOf('36') }) as any;
        expect(r.found).toBe(true);
        expect(r.initial.message).toBe('"Are you sure?"');
        expect(r.initial.title).toBe('"Confirm"');
        expect(r.initial.buttonSet).toBe(4);  // Yes/No
        expect(r.initial.icon).toBe(32);       // Question
        expect(line.slice(r.edit.callStart, r.edit.callEnd)).toBe('MSGBOX("Are you sure?", 36, "Confirm")');

        // caret outside any call -> not found
        expect((call('bbj/composer/msgbox/decodeCall', { line, character: 0 }) as any).found).toBe(false);
        // bare call -> found (lets the UI add options), zeroed selection
        const bare = call('bbj/composer/msgbox/decodeCall', { line: 'x = MSGBOX("Hi")', character: 12 }) as any;
        expect(bare.found).toBe(true);
        expect(bare.initial.buttonSet).toBe(0);
        expect(bare.initial.message).toBe('"Hi"');
    });

    test('addwindow/decodeCall decodes flags/event bits + token ranges at the caret', () => {
        const line = 'w! = g!.addWindow(0, 0, 9, 9, "T", $01000002$, $00000440$)';
        const r = call('bbj/composer/addwindow/decodeCall', { line, character: line.indexOf('$01000002$') }) as any;
        expect(r.found).toBe(true);
        expect(r.initial.flags).toContain(0x00000002);       // Close box
        expect(r.initial.flags).toContain(0x01000000);       // No title bar
        expect(r.initial.eventMaskEnabled).toBe(true);
        expect(r.initial.eventMask).toContain(0x00000040);   // Mouse button down
        expect(r.initial.title).toBe('"T"');
        expect(line.slice(r.edit.flagsRange[0], r.edit.flagsRange[1])).toBe('$01000002$');
        expect(line.slice(r.edit.eventMaskRange[0], r.edit.eventMaskRange[1])).toBe('$00000440$');

        // a call with no flags yet -> found, with a flags-insert offset and no event mask
        const bare = call('bbj/composer/addwindow/decodeCall', { line: 'g!.addWindow("T")', character: 5 }) as any;
        expect(bare.found).toBe(true);
        expect(bare.initial.flags).toEqual([]);
        expect(bare.edit.flagsInsertOffset).toBeGreaterThan(0);
        expect(bare.edit.eventMaskRange).toBeUndefined();
    });

    test('addchildwindow/preview returns hex + statement + schematic in one call', () => {
        const p = call('bbj/composer/addchildwindow/preview', {
            input: {
                flags: [0x00000800, 0x00200000], eventMaskEnabled: false, eventMask: [],
                receiver: 'child!', window: 'window!', id: '101', context: 'ctx!',
                x: '10', y: '10', width: '200', height: '150', title: '"Panel"',
            },
        }) as any;
        expect(p.flagsHex).toBe('$00200800$');
        expect(p.eventHex).toBeNull();
        expect(p.statement).toBe('child! = window!.addChildWindow(101, 10, 10, 200, 150, "Panel", $00200800$, ctx!)');
        expect(p.render.borderless).toBe(true);
        expect(p.render.docked).toBe(true);
    });

    test('addchildwindow/decodeCall decodes flags/event bits + token ranges at the caret', () => {
        const line = 'c! = w!.addChildWindow(1, 0, 0, 9, 9, "T", $00000810$, ctx, $00000440$)';
        const r = call('bbj/composer/addchildwindow/decodeCall', { line, character: line.indexOf('$00000810$') }) as any;
        expect(r.found).toBe(true);
        expect(r.initial.flags).toContain(0x00000800);       // Borderless
        expect(r.initial.flags).toContain(0x00000010);       // Initially invisible
        expect(r.initial.eventMaskEnabled).toBe(true);
        expect(r.initial.eventMask).toContain(0x00000040);   // Mouse button down
        expect(r.initial.title).toBe('"T"');
        expect(line.slice(r.edit.flagsRange[0], r.edit.flagsRange[1])).toBe('$00000810$');
        expect(line.slice(r.edit.eventMaskRange[0], r.edit.eventMaskRange[1])).toBe('$00000440$');

        // a call with no flags yet -> found, insert offset after the title (before the context)
        const bare = call('bbj/composer/addchildwindow/decodeCall', { line: 'w!.addChildWindow("T", ctx)', character: 5 }) as any;
        expect(bare.found).toBe(true);
        expect(bare.initial.flags).toEqual([]);
        expect(bare.edit.flagsInsertOffset).toBe('w!.addChildWindow("T"'.length);
        expect(bare.edit.eventMaskRange).toBeUndefined();

        // caret outside any call -> not found
        expect((call('bbj/composer/addchildwindow/decodeCall', { line, character: 0 }) as any).found).toBe(false);
    });

    test('setopts/decodeCall decodes an existing line, a bare keyword, and refuses what it cannot round-trip', () => {
        const r = call('bbj/composer/setopts/decodeCall', { line: 'SETOPTS 08004020000000' }) as any;
        expect(r.found).toBe(true);
        expect(r.edit.hexRange).toEqual([8, 22]);
        expect(r.edit.hexDigits).toBe('08004020000000');
        expect(r.edit.insertOffset).toBeUndefined();
        expect(r.initial.bits).toEqual([
            { byte: 1, mask: 0x08 },
            { byte: 3, mask: 0x40 },
            { byte: 4, mask: 0x20 },
        ]);
        expect(r.initial.maskComma).toBe('');
        expect(r.initial.maskDot).toBe('');
        expect(r.initial.rawTail).toBe('');

        // bare keyword, no digits yet -> found (lets the UI compose from scratch), zeroed selection
        const bare = call('bbj/composer/setopts/decodeCall', { line: 'SETOPTS' }) as any;
        expect(bare.found).toBe(true);
        expect(bare.edit.insertOffset).toBe(7);
        expect(bare.edit.hexRange).toBeUndefined();
        expect(bare.edit.hexDigits).toBeUndefined();
        expect(bare.initial).toEqual({ bits: [], maskComma: '', maskDot: '', rawTail: '' });

        // leading whitespace + lower case -> still recognised (parseSetOptsLine is case-insensitive)
        expect((call('bbj/composer/setopts/decodeCall', { line: '  setopts 0800' }) as any).found).toBe(true);

        // the composer must not touch what it cannot round-trip
        expect(call('bbj/composer/setopts/decodeCall', { line: 'PREFIX /usr/lib/' })).toEqual({ found: false });
        expect(call('bbj/composer/setopts/decodeCall', { line: 'SETOPTS 0800 extra' })).toEqual({ found: false });
        expect(call('bbj/composer/setopts/decodeCall', { line: 'SETOPTS ZZZZ' })).toEqual({ found: false });
    });

    test('setopts/preview starts from the original vector and never from zero', () => {
        // no original, empty selection -> the emptyVector() baseline
        const empty = call('bbj/composer/setopts/preview', {
            selection: { bits: [], maskComma: '', maskDot: '', rawTail: '' },
        }) as any;
        expect(empty.hexDigits).toBe('00000000');
        expect(empty.line).toBe('SETOPTS 00000000');
        expect(empty.summary).toBe('(default settings)');
        expect(empty.maskInputsEnabled).toBe(false);
        expect(empty.unknownByBytes).toEqual([]);

        // lossless round-trip: adding one bit on top of an original vector changes exactly that
        // byte and keeps every other digit (and the original digit count) untouched — the
        // structural mitigation for this plan's data-loss threat (T-87-01)
        const original = '08004020000000';
        const decoded = call('bbj/composer/setopts/decodeCall', { line: `SETOPTS ${original}` }) as any;
        const selection = {
            bits: [...decoded.initial.bits, { byte: 1, mask: 0x40 }],
            maskComma: decoded.initial.maskComma,
            maskDot: decoded.initial.maskDot,
            rawTail: decoded.initial.rawTail,
        };
        const preview = call('bbj/composer/setopts/preview', { original, selection }) as any;
        expect(preview.hexDigits).toHaveLength(14);
        expect(preview.hexDigits).not.toBe(original);
        expect(preview.hexDigits.slice(2)).toBe(original.slice(2)); // bytes 2-7 untouched
        expect(preview.hexDigits.slice(0, 2)).not.toBe(original.slice(0, 2)); // only byte 1 changed

        // an unmodeled bit (byte 7 mask 0x40 has no catalog entry) survives untouched and is named
        const originalWithUnknown = '00000000000040';
        const unknownPreview = call('bbj/composer/setopts/preview', {
            original: originalWithUnknown,
            selection: { bits: [], maskComma: '', maskDot: '', rawTail: '' },
        }) as any;
        expect(unknownPreview.hexDigits).toBe(originalWithUnknown);
        expect(unknownPreview.unknownByBytes).toContainEqual({ byte: 7, mask: 0x40 });

        // an invalid (non-hex) raw-tail entry is silently ignored, leaving hexDigits unchanged
        const originalWithTail = `${'0'.repeat(18)}11223344556677`;
        const invalidTailPreview = call('bbj/composer/setopts/preview', {
            original: originalWithTail,
            selection: { bits: [], maskComma: '', maskDot: '', rawTail: 'ZZ' },
        }) as any;
        expect(invalidTailPreview.hexDigits).toBe(originalWithTail);
    });

    test('msgbox/decodeCall delegates to decodeMsgboxCall for literal, constant-sum and replace-mode lines (#648)', () => {
        const cases: Array<{ line: string; character?: number }> = [
            { line: '    ret! = MSGBOX("Are you sure?", 36, "Confirm")', character: undefined },
            { line: 'r = MSGBOX("Hi", BBjMsgBox.MSGBOX_BUTTONS_YES_NO+BBjMsgBox.MSGBOX_ICON_QUESTION, "T")', character: undefined },
            { line: 'r = MSGBOX("Hi", flags%, "T", "B1", TIM=5)', character: undefined },
        ];
        for (const { line, character } of cases) {
            const viaHandler = call('bbj/composer/msgbox/decodeCall', { line, character });
            expect(viaHandler).toEqual(decodeMsgboxCall(line, character));
        }
    });

    test('cvs/decodeCall and cvs/preview delegate to cvs-composer.ts (#649)', () => {
        const line = 'x$ = CVS(a$, 1+4)';
        const viaHandlerWithCaret = call('bbj/composer/cvs/decodeCall', { line, character: 6 });
        expect(viaHandlerWithCaret).toEqual(decodeCvsCall(line, 6));
        const viaHandlerNoCaret = call('bbj/composer/cvs/decodeCall', { line });
        expect(viaHandlerNoCaret).toEqual(decodeCvsCall(line));

        const input = { str: 'a$', bits: [1, 4], chars: '"*"' };
        const preview = call('bbj/composer/cvs/preview', { input }) as any;
        expect(preview).toEqual(cvsPreview(input));
    });

    test('registerComposerRequests wires every handler onto the connection', () => {
        const onRequest = vi.fn();
        registerComposerRequests({ onRequest } as any);
        const methods = onRequest.mock.calls.map(c => c[0]);
        expect(methods).toEqual(Object.keys(composerHandlers));
        expect(methods).toContain('bbj/composer/catalogs');
        expect(methods).toContain('bbj/composer/addwindow/compose');
    });
});
