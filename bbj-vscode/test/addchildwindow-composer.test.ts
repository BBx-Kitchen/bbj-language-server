import { describe, expect, test } from 'vitest';
import {
    CHILD_WINDOW_FLAGS, CHILD_EVENT_MASK_BITS, CHILD_WINDOW_FLAG,
    describeChildFlags, childWindowSchematic,
    composeAddChildWindow, addchildwindowPreview,
    parseAddChildWindowCallOnLine, findAddChildWindowCallAt,
    encodeBits, bitsSet, unknownBits,
} from '../src/addchildwindow-composer';
import { findAddWindowCalls } from '../src/addwindow-composer';
import { findAddChildWindowCalls } from '../src/addchildwindow-composer';

describe('addChildWindow composer logic (#473)', () => {
    test('catalog covers the documented child-window bits and has unique single bits', () => {
        expect(CHILD_WINDOW_FLAGS).toHaveLength(17);
        expect(CHILD_EVENT_MASK_BITS).toHaveLength(19); // shared SYSGUI event mask
        const values = CHILD_WINDOW_FLAGS.map(f => f.value);
        expect(new Set(values).size).toBe(values.length);                       // no duplicate bits
        expect(values.every(v => (v & (v - 1)) === 0 && v !== 0)).toBe(true);   // each a single bit
        // Spot-check documented values (BBjWindow::addChildWindow flag table)
        expect(values).toContain(0x00000800); // Borderless
        expect(values).toContain(0x00001000); // Fieldset element
        expect(values).toContain(0x00008000); // Simple
        expect(values).toContain(0x00200000); // Docking
        expect(values).toContain(0x80000000); // TRACK(0)
        // addWindow-only bits must NOT be offered for child windows
        expect(values).not.toContain(0x00000001); // Resizable
        expect(values).not.toContain(0x00000002); // Close box
        expect(values).not.toContain(0x00040000); // Border (top-level window)
    });

    test('describeChildFlags renders a human summary in catalog order', () => {
        expect(describeChildFlags(0)).toBe('(none)');
        expect(describeChildFlags(CHILD_WINDOW_FLAG.BORDERLESS | CHILD_WINDOW_FLAG.DOCKING))
            .toBe('Borderless · Docking');
    });

    test('childWindowSchematic maps flag bits to a drawable preview + badges', () => {
        const s = childWindowSchematic(CHILD_WINDOW_FLAG.RAISED | CHILD_WINDOW_FLAG.VSCROLL);
        expect(s.raised).toBe(true);
        expect(s.vScroll).toBe(true);
        expect(s.borderless).toBe(false);
        expect(s.badges).toEqual([]);

        // Fieldset rendering requires BOTH Fieldset and Simple
        expect(childWindowSchematic(CHILD_WINDOW_FLAG.FIELDSET).fieldset).toBe(false);
        const fs = childWindowSchematic(CHILD_WINDOW_FLAG.FIELDSET | CHILD_WINDOW_FLAG.SIMPLE);
        expect(fs.fieldset).toBe(true);
        expect(fs.badges).toEqual([]); // Simple is part of the fieldset visual, not a badge

        // Simple alone (no fieldset) has no visual -> badge
        const simple = childWindowSchematic(CHILD_WINDOW_FLAG.SIMPLE);
        expect(simple.fieldset).toBe(false);
        expect(simple.badges).toContain('Simple child window (BBj 22+)');

        // Non-visual behavior flags surface as badges
        const kb = childWindowSchematic(0x00010000 | 0x00800000); // Keyboard nav + Enter as Tab
        expect(kb.badges).toContain('Keyboard navigation');
        expect(kb.badges).toContain('Enter behaves as Tab');
    });

    test('composeAddChildWindow renders the call with context after flags, event_mask last', () => {
        const base = {
            receiver: 'child!', window: 'window!', id: '101',
            x: '10', y: '10', width: '200', height: '150', title: '"Child"',
            context: 'sysgui!.getAvailableContext()',
        };
        expect(composeAddChildWindow({ ...base, flags: 0x00010000 }))
            .toBe('child! = window!.addChildWindow(101, 10, 10, 200, 150, "Child", $00010000$, sysgui!.getAvailableContext())');
        expect(composeAddChildWindow({ ...base, flags: 0x00000800, eventMask: 0x00000440 }))
            .toBe('child! = window!.addChildWindow(101, 10, 10, 200, 150, "Child", $00000800$, sysgui!.getAvailableContext(), $00000440$)');
        // no receiver -> bare expression; eventMask: null treated as unset
        expect(composeAddChildWindow({ window: 'w!', id: '1', x: '0', y: '0', width: '1', height: '1', title: 't$', flags: 0, context: 'ctx', eventMask: null }))
            .toBe('w!.addChildWindow(1, 0, 0, 1, 1, t$, $00000000$, ctx)');
    });

    test('addchildwindowPreview aggregates hex + compose + summaries + schematic', () => {
        const p = addchildwindowPreview({
            flags: [CHILD_WINDOW_FLAG.BORDERLESS, CHILD_WINDOW_FLAG.VSCROLL], eventMaskEnabled: false, eventMask: [],
            receiver: 'child!', window: 'window!', id: '101', context: 'ctx!',
            x: '10', y: '10', width: '200', height: '150', title: '"Panel"',
        });
        expect(p.flagsHex).toBe('$00000808$');
        expect(p.eventHex).toBeNull();
        expect(p.eventSummary).toBe('(default)');
        expect(p.statement).toBe('child! = window!.addChildWindow(101, 10, 10, 200, 150, "Panel", $00000808$, ctx!)');
        expect(p.render.title).toBe('Panel');
        expect(p.render.borderless).toBe(true);
        expect(p.render.vScroll).toBe(true);
    });

    test('addchildwindowPreview enables event mask + preserves unknown bits, drops receiver in edit mode', () => {
        const p = addchildwindowPreview({
            flags: [CHILD_WINDOW_FLAG.DOCKING], eventMaskEnabled: true, eventMask: [0x00000040],
            window: 'w!', id: '1', context: 'c', x: '0', y: '0', width: '9', height: '9', title: '"T"',
            editMode: true, preservedFlagBits: 0x00000040, // not a documented child-window flag
        });
        expect(p.flagsHex).toBe('$00200040$'); // reserved bit OR-ed back in
        expect(p.eventHex).toBe('$00000040$');
        expect(p.statement).toBe('w!.addChildWindow(1, 0, 0, 9, 9, "T", $00200040$, c, $00000040$)'); // no receiver
        expect(p.flagsSummary).toBe('Docking'); // summary shows only catalog bits
    });

    test('parse locates the flags hex literal; event_mask insert point is after the context', () => {
        const line = 'child! = window!.addChildWindow(101, 10, 10, 200, 150, "Child", $00010000$, context!)';
        const info = parseAddChildWindowCallOnLine(line)!;
        expect(info.flagsValue).toBe(0x00010000);
        expect(line.slice(info.flagsRange![0], info.flagsRange![1])).toBe('$00010000$');
        expect(info.eventMaskRange).toBeUndefined();
        // flags present but no event_mask -> insert point AFTER the trailing context argument
        const off = info.eventMaskInsertOffset!;
        expect(line.slice(0, off) + ', $00000440$' + line.slice(off))
            .toBe('child! = window!.addChildWindow(101, 10, 10, 200, 150, "Child", $00010000$, context!, $00000440$)');
    });

    test('parse locates flags AND event_mask around the context argument', () => {
        const line = 'c! = w!.addChildWindow(1, 0, 0, 200, 100, "T", $00000800$, ctx, $10000440$)';
        const info = parseAddChildWindowCallOnLine(line)!;
        expect(info.flagsValue).toBe(0x00000800);
        expect(info.eventMaskValue).toBe(0x10000440);
        expect(line.slice(info.eventMaskRange![0], info.eventMaskRange![1])).toBe('$10000440$');
        expect(info.flagsInsertOffset).toBeUndefined();
        expect(info.eventMaskInsertOffset).toBeUndefined();
    });

    test('parse offers a flags-insert offset after the title, before the context', () => {
        const line = 'child! = window!.addChildWindow(101, 10, 10, 200, 150, "Hello", context!)';
        const info = parseAddChildWindowCallOnLine(line)!;
        expect(info.flagsValue).toBeUndefined();
        const off = info.flagsInsertOffset!;
        expect(line.slice(0, off) + ', $00010000$' + line.slice(off))
            .toBe('child! = window!.addChildWindow(101, 10, 10, 200, 150, "Hello", $00010000$, context!)');
    });

    test('parse offers NO flags-insert offset for the no-title overloads (flags require a title)', () => {
        // (context) and (ID, context) overloads cannot legally take a flags argument
        expect(parseAddChildWindowCallOnLine('w!.addChildWindow(ctx)')!.flagsInsertOffset).toBeUndefined();
        expect(parseAddChildWindowCallOnLine('w!.addChildWindow(101, ctx)')!.flagsInsertOffset).toBeUndefined();
        // (title, context) DOES have a title -> insert point after it
        const line = 'w!.addChildWindow("T", ctx)';
        const info = parseAddChildWindowCallOnLine(line)!;
        const off = info.flagsInsertOffset!;
        expect(line.slice(0, off) + ', $00000800$' + line.slice(off)).toBe('w!.addChildWindow("T", $00000800$, ctx)');
    });

    test('parse handles commas/parens inside the title and in the context expression', () => {
        const line = 'c! = w!.addChildWindow(1, 0, 0, 9, 9, "a, b (c)", $00000020$, sysgui!.getAvailableContext())';
        const info = parseAddChildWindowCallOnLine(line)!;
        expect(info.args[5]).toBe('"a, b (c)"');
        expect(info.args[7]).toBe('sysgui!.getAvailableContext()');
        expect(info.flagsValue).toBe(0x00000020);
        expect(info.eventMaskValue).toBeUndefined();
    });

    test('findAddChildWindowCallAt targets the call the cursor is inside', () => {
        const line = 'if x then a! = w!.addChildWindow("A", $00000800$, c) else b! = w!.addChildWindow("B", c)';
        const first = findAddChildWindowCallAt(line, line.indexOf('"A"'))!;
        expect(first.flagsValue).toBe(0x00000800);
        const second = findAddChildWindowCallAt(line, line.indexOf('"B"'))!;
        expect(second.flagsValue).toBeUndefined();
        expect(first.callStart).not.toBe(second.callStart);
        expect(findAddChildWindowCallAt(line, 0)).toBeUndefined();
    });

    test('addWindow and addChildWindow parsers do not match each other\'s calls', () => {
        const childLine = 'c! = w!.addChildWindow(1, 0, 0, 9, 9, "T", $00000800$, ctx)';
        const windowLine = 'w! = g!.addWindow(0, 0, 9, 9, "T", $00000003$)';
        expect(findAddWindowCalls(childLine)).toHaveLength(0);
        expect(findAddChildWindowCalls(windowLine)).toHaveLength(0);
    });

    test('round-trip: decode bits + unknown bits re-encode to the original mask', () => {
        const reserved = 0x00000040; // not a documented child-window flag
        const mask = (CHILD_WINDOW_FLAG.BORDERLESS | CHILD_WINDOW_FLAG.DOCKING | reserved) >>> 0;
        expect(unknownBits(mask, CHILD_WINDOW_FLAGS)).toBe(reserved);
        expect(encodeBits([...bitsSet(mask, CHILD_WINDOW_FLAGS), unknownBits(mask, CHILD_WINDOW_FLAGS)])).toBe(mask);
    });
});
