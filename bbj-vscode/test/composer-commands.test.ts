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

    test('registerComposerRequests wires every handler onto the connection', () => {
        const onRequest = vi.fn();
        registerComposerRequests({ onRequest } as any);
        const methods = onRequest.mock.calls.map(c => c[0]);
        expect(methods).toEqual(Object.keys(composerHandlers));
        expect(methods).toContain('bbj/composer/catalogs');
        expect(methods).toContain('bbj/composer/addwindow/compose');
    });
});
