import { describe, expect, test, vi } from 'vitest';
import { composerHandlers, registerComposerRequests } from '../src/language/composer-commands';

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

    test('registerComposerRequests wires every handler onto the connection', () => {
        const onRequest = vi.fn();
        registerComposerRequests({ onRequest } as any);
        const methods = onRequest.mock.calls.map(c => c[0]);
        expect(methods).toEqual(Object.keys(composerHandlers));
        expect(methods).toContain('bbj/composer/catalogs');
        expect(methods).toContain('bbj/composer/addwindow/compose');
    });
});
