import { describe, expect, test } from 'vitest';
import {
    WINDOW_FLAGS, EVENT_MASK_BITS, encodeBits, bitsSet, unknownBits, knownMask,
    formatHex, parseHexLiteral, describeMask, describeFlags, describeEventMask,
    composeAddWindow, parseAddWindowCallOnLine, findAddWindowCallAt, windowSchematic, WINDOW_FLAG,
} from '../src/addwindow-composer';

describe('addWindow composer logic (#430)', () => {
    test('catalogs cover the documented bit counts and have unique bits', () => {
        expect(WINDOW_FLAGS).toHaveLength(26);
        expect(EVENT_MASK_BITS).toHaveLength(19);
        for (const catalog of [WINDOW_FLAGS, EVENT_MASK_BITS]) {
            const values = catalog.map(f => f.value);
            expect(new Set(values).size).toBe(values.length);          // no duplicate bits
            expect(values.every(v => (v & (v - 1)) === 0 && v !== 0)).toBe(true); // each is a single bit
        }
    });

    test('encodeBits ORs bits into an unsigned mask, including the sign bit', () => {
        expect(encodeBits([0x1, 0x2, 0x10000])).toBe(0x00010003);
        expect(encodeBits([])).toBe(0);
        // 0x80000000 must stay positive (unsigned), not become a negative int32
        expect(encodeBits([0x80000000, 0x1])).toBe(0x80000001);
        expect(encodeBits([0x80000000])).toBeGreaterThan(0);
    });

    test('bitsSet is the inverse of encodeBits over a catalog', () => {
        const chosen = [0x00000001, 0x00000002, 0x01000000, 0x80000000];
        expect(bitsSet(encodeBits(chosen), WINDOW_FLAGS).sort()).toEqual([...chosen].sort());
        expect(bitsSet(0, WINDOW_FLAGS)).toEqual([]);
    });

    test('formatHex / parseHexLiteral round-trip canonical 8-digit hex', () => {
        expect(formatHex(0x00010003)).toBe('$00010003$');
        expect(formatHex(0)).toBe('$00000000$');
        expect(formatHex(0x80000000)).toBe('$80000000$'); // sign bit renders unsigned
        for (const n of [0, 0x1, 0x00010003, 0x40000000, 0x80000000, 0xFFFFFFFF]) {
            expect(parseHexLiteral(formatHex(n))).toBe(n >>> 0);
        }
    });

    test('parseHexLiteral accepts $$ and rejects non-hex-literals', () => {
        expect(parseHexLiteral('$$')).toBe(0);
        expect(parseHexLiteral('$00010003$')).toBe(0x00010003);
        expect(parseHexLiteral('  $00010003$  ')).toBe(0x00010003); // trimmed
        expect(parseHexLiteral('00010003')).toBeUndefined();        // no $ delimiters
        expect(parseHexLiteral('$00XY$')).toBeUndefined();          // not hex
        expect(parseHexLiteral('flags$')).toBeUndefined();          // a variable, not a literal
    });

    test('unknownBits isolates bits no catalog entry models (for round-trip preservation)', () => {
        const reserved = 0x00004000; // not a documented window flag
        const mask = 0x00000001 | reserved;
        expect(unknownBits(mask, WINDOW_FLAGS)).toBe(reserved);
        expect(unknownBits(0x00000001, WINDOW_FLAGS)).toBe(0);
        // re-encoding the known selection plus preserved unknown bits reproduces the original mask
        expect(encodeBits([...bitsSet(mask, WINDOW_FLAGS), unknownBits(mask, WINDOW_FLAGS)])).toBe(mask);
    });

    test('knownMask ORs every catalog bit', () => {
        expect(knownMask(WINDOW_FLAGS)).toBe(encodeBits(WINDOW_FLAGS.map(f => f.value)));
    });

    test('describeMask / describeFlags / describeEventMask render a human summary', () => {
        // 0x00010003 = Close box (0x2) + Resizable (0x1) + Keyboard navigation (0x10000), in catalog order
        expect(describeFlags(0x00010003)).toBe('Close box · Resizable · Keyboard navigation');
        expect(describeMask(0, WINDOW_FLAGS)).toBe('(none)');
        expect(describeEventMask(0x00000040 | 0x00000400)).toContain('Mouse button down');
        expect(describeEventMask(0x00000040 | 0x00000400)).toContain('Key pressed');
    });

    test('windowSchematic maps flag bits to a drawable preview + badges', () => {
        const s = windowSchematic(WINDOW_FLAG.RESIZABLE | WINDOW_FLAG.CLOSE_BOX | WINDOW_FLAG.MENU_BAR);
        expect(s.titleBar).toBe(true);   // no "No title bar" flag
        expect(s.closeBox).toBe(true);
        expect(s.menuBar).toBe(true);
        expect(s.resizable).toBe(true);
        expect(s.minMax).toBe(false);
        expect(s.badges).toEqual([]);    // all set bits are visualized

        const noTitle = windowSchematic(WINDOW_FLAG.NO_TITLE_BAR);
        expect(noTitle.titleBar).toBe(false);

        // A non-visual flag (Dialog) surfaces as a badge, not a drawn element
        const dialog = windowSchematic(0x00080000 | 0x00020000); // Dialog + Always on top
        expect(dialog.badges).toContain('Dialog');
        expect(dialog.badges).toContain('Always on top');
    });

    test('composeAddWindow renders the call and omits event_mask when unset', () => {
        const base = { receiver: 'window!', sysgui: 'sysgui!', x: '10', y: '10', width: '400', height: '300', title: '"Win"' };
        expect(composeAddWindow({ ...base, flags: 0x00010003 }))
            .toBe('window! = sysgui!.addWindow(10, 10, 400, 300, "Win", $00010003$)');
        // event_mask included only when provided
        expect(composeAddWindow({ ...base, flags: 0x00000003, eventMask: 0x00000440 }))
            .toBe('window! = sysgui!.addWindow(10, 10, 400, 300, "Win", $00000003$, $00000440$)');
        // no receiver -> bare expression; eventMask: null is treated as unset
        expect(composeAddWindow({ sysgui: 'g!', x: '0', y: '0', width: '1', height: '1', title: 't$', flags: 0, eventMask: null }))
            .toBe('g!.addWindow(0, 0, 1, 1, t$, $00000000$)');
    });

    test('parse locates the flags hex literal and its replaceable range', () => {
        const line = 'window! = sysgui!.addWindow(300,300,400,400,"Title",$00010003$)';
        const info = parseAddWindowCallOnLine(line)!;
        expect(info.flagsValue).toBe(0x00010003);
        expect(line.slice(info.flagsRange![0], info.flagsRange![1])).toBe('$00010003$');
        expect(info.eventMaskRange).toBeUndefined();
        // flags present but no event_mask -> offer an insert point right after the flags literal
        expect(info.eventMaskInsertOffset).toBe(info.flagsRange![1]);
    });

    test('parse locates flags AND event_mask (second hex literal)', () => {
        const line = 'w! = g!.addWindow(0, 0, 200, 100, "T", $00000003$, $10000440$)';
        const info = parseAddWindowCallOnLine(line)!;
        expect(info.flagsValue).toBe(0x00000003);
        expect(info.eventMaskValue).toBe(0x10000440);
        expect(line.slice(info.eventMaskRange![0], info.eventMaskRange![1])).toBe('$10000440$');
        expect(info.flagsInsertOffset).toBeUndefined();
        expect(info.eventMaskInsertOffset).toBeUndefined();
    });

    test('parse finds flags regardless of the context-id / title-only overload', () => {
        // context-id overload: extra leading int arg, flags still the first hex literal
        const ctx = parseAddWindowCallOnLine('g!.addWindow(1, 0, 0, 200, 100, "T", $00040000$)')!;
        expect(ctx.flagsValue).toBe(0x00040000);
        // title-only overload
        const titleOnly = parseAddWindowCallOnLine('g!.addWindow("T", $00080002$)')!;
        expect(titleOnly.flagsValue).toBe(0x00080002);
    });

    test('parse offers a flags-insert offset for a call with no hex literal yet', () => {
        const line = 'window! = sysgui!.addWindow(10, 10, 400, 300, "Hello")';
        const info = parseAddWindowCallOnLine(line)!;
        expect(info.flagsValue).toBeUndefined();
        expect(info.flagsInsertOffset).toBeDefined();
        const off = info.flagsInsertOffset!;
        expect(line.slice(0, off) + ', $00010003$' + line.slice(off))
            .toBe('window! = sysgui!.addWindow(10, 10, 400, 300, "Hello", $00010003$)');
    });

    test('parse handles commas/parens inside the title string', () => {
        const line = 'w! = g!.addWindow(0,0,9,9,"a, b (c)",$00000002$)';
        const info = parseAddWindowCallOnLine(line)!;
        expect(info.args[4]).toBe('"a, b (c)"');
        expect(info.flagsValue).toBe(0x00000002);
    });

    test('findAddWindowCallAt targets the call the cursor is inside (two calls on one line)', () => {
        const line = 'if x then a! = g!.addWindow("A", $00000002$) else b! = g!.addWindow("B")';
        const first = findAddWindowCallAt(line, line.indexOf('"A"'))!;
        expect(first.flagsValue).toBe(0x00000002);
        const second = findAddWindowCallAt(line, line.indexOf('"B"'))!;
        expect(second.flagsValue).toBeUndefined();
        expect(second.flagsInsertOffset).toBeDefined();
        expect(first.callStart).not.toBe(second.callStart);
        expect(findAddWindowCallAt(line, 0)).toBeUndefined(); // cursor on the IF, outside both calls
    });
});
