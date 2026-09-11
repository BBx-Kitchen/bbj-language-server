/**
 * Tests for the editor-agnostic config.bbx SETOPTS catalog/vector module (#474).
 */
import { describe, expect, test } from 'vitest';
import {
    BYTE_GROUPS, FIRST_RAW_BYTE, MASK_COMMA_BYTE, MASK_DOT_BYTE, MAX_BYTES, SETOPTS_BITS,
    SETOPTS_IN_CODE_DEFAULT_VAR,
    bbjHexLiteral, composeSetOptsBlock, composeSetOptsLine, describeIorAndMask, describeMaskVector, describeVector,
    encodeVector, emptyVector, getBit, knownByteMask, maskChar, parseSetOptsLine, parseVector,
    rawTail, setBit, setMaskChar, setRawTail, setoptsPreview, singleBitAndMask, singleBitIorMask,
    triStateFromChainEffect, unknownBitsInByte,
    type SetOptsSelection, type SetOptsTriStateEntry, type SetOptsTriStateSelection, type SetOptsVector,
} from '../src/setopts-catalog.js';

/** The SETOPTS line the stock BBj config.bbx ships with (7 bytes). */
const STOCK = '08004020000000';

const noSelection: SetOptsSelection = { bits: [], maskComma: '', maskDot: '', rawTail: '' };

/** The selection a UI would build for `v`: checked catalog bits + displayed data-byte fields. */
function selectionFor(v: SetOptsVector): SetOptsSelection {
    return {
        bits: SETOPTS_BITS.filter(b => getBit(v, b.byte, b.mask)).map(b => ({ byte: b.byte, mask: b.mask })),
        maskComma: maskChar(v, MASK_COMMA_BYTE),
        maskDot: maskChar(v, MASK_DOT_BYTE),
        rawTail: rawTail(v),
    };
}

describe('catalog integrity', () => {
    test('every bit is a single-bit mask in a documented byte', () => {
        for (const bit of SETOPTS_BITS) {
            expect(BYTE_GROUPS[bit.byte], `byte ${bit.byte} has a group`).toBeDefined();
            expect(bit.mask & (bit.mask - 1), `${bit.byte}:$${bit.mask.toString(16)}$ is a single bit`).toBe(0);
            expect(bit.mask).toBeGreaterThan(0);
            expect(bit.mask).toBeLessThanOrEqual(0xff);
        }
    });

    test('no duplicate byte/mask pairs', () => {
        const keys = SETOPTS_BITS.map(b => `${b.byte}:${b.mask}`);
        expect(new Set(keys).size).toBe(keys.length);
    });

    test('bytes 5, 6 and 10+ carry no flag bits (they are data)', () => {
        expect(SETOPTS_BITS.some(b => b.byte === 5 || b.byte === 6 || b.byte >= FIRST_RAW_BYTE)).toBe(false);
    });

    test('the twelve PRO/5-only bits are annotated as ignored in BBj', () => {
        expect(SETOPTS_BITS.filter(b => b.bbj === 'ignored')).toHaveLength(12);
    });
});

describe('parseVector / encodeVector', () => {
    test('round-trips the stock config string', () => {
        const v = parseVector(STOCK)!;
        expect(v.bytes).toEqual([0x08, 0x00, 0x40, 0x20, 0x00, 0x00, 0x00]);
        expect(encodeVector(v)).toBe(STOCK);
    });

    test('round-trips short and full-length strings, preserving length and case-normalizing', () => {
        for (const digits of ['0010', '00c20240', '00C20240000000000000000000000000']) {
            expect(encodeVector(parseVector(digits)!)).toBe(digits.toUpperCase());
        }
    });

    test('an odd digit count survives as a high-nibble partial byte', () => {
        const v = parseVector('081')!;
        expect(v.bytes).toEqual([0x08, 0x10]);
        expect(encodeVector(v)).toBe('081');
    });

    test('rejects non-hex input and more than 16 bytes', () => {
        expect(parseVector('00G2')).toBeUndefined();
        expect(parseVector('')).toBeUndefined();
        expect(parseVector('0'.repeat(33))).toBeUndefined();
        expect(parseVector('$0010$')).toBeUndefined();
    });
});

describe('bit access', () => {
    test('setBit grows the vector only when setting', () => {
        const v = parseVector('0010')!;
        setBit(v, 7, 0x20, false); // clearing beyond the end must not grow
        expect(encodeVector(v)).toBe('0010');
        setBit(v, 7, 0x20, true);
        expect(encodeVector(v)).toBe('00100000000020');
    });

    test('toggling one bit changes exactly one nibble (issue #474 guarantee)', () => {
        const before = encodeVector(parseVector('00C20240000000000000000000000000')!);
        const v = parseVector(before)!;
        setBit(v, 1, 0x80, true);
        const after = encodeVector(v);
        expect(after).toHaveLength(before.length);
        const diffs = [...before].filter((c, i) => c !== after[i]);
        expect(diffs).toHaveLength(1);
        expect(after.startsWith('80C2')).toBe(true);
    });

    test('unknown bits are visible per byte and never claimed by the catalog', () => {
        expect(knownByteMask(9)).toBe(0xf0);
        const v = parseVector('0000000000000000C8')!; // byte 9 = $C8$: $80$+$40$ known, $08$ not
        expect(unknownBitsInByte(v, 9)).toBe(0x08);
        expect(unknownBitsInByte(v, 1)).toBe(0);
        expect(unknownBitsInByte(v, 10)).toBe(0); // beyond documented flag bytes
    });
});

describe('mask replacement characters (bytes 5/6)', () => {
    test('read/write printable chars; empty string clears', () => {
        const v = emptyVector();
        setMaskChar(v, MASK_COMMA_BYTE, '.');
        setMaskChar(v, MASK_DOT_BYTE, ',');
        expect(maskChar(v, MASK_COMMA_BYTE)).toBe('.');
        expect(maskChar(v, MASK_DOT_BYTE)).toBe(',');
        expect(encodeVector(v)).toBe('000000002E2C');
        setMaskChar(v, MASK_DOT_BYTE, '');
        expect(encodeVector(v)).toBe('000000002E00');
    });

    test('clearing a char beyond the vector end does not grow it', () => {
        const v = parseVector('0010')!;
        setMaskChar(v, MASK_COMMA_BYTE, '');
        expect(encodeVector(v)).toBe('0010');
    });
});

describe('raw tail (bytes 10–16)', () => {
    test('get/set replaces only the tail and preserves the head', () => {
        const v = parseVector('00C202400000000000AABB')!;
        expect(rawTail(v)).toBe('AABB');
        setRawTail(v, 'FF');
        expect(encodeVector(v)).toBe('00C202400000000000FF');
        setRawTail(v, '');
        expect(encodeVector(v)).toBe('00C202400000000000');
    });

    test('setting a tail on a short vector zero-pads the head through byte 9', () => {
        const v = parseVector('0010')!;
        setRawTail(v, '42');
        expect(encodeVector(v)).toBe('00100000000000000042');
    });
});

describe('parseSetOptsLine', () => {
    test('recognizes the documented syntax, keyword case-insensitively', () => {
        for (const line of [`SETOPTS ${STOCK}`, `setopts ${STOCK}`, `  SETOPTS   ${STOCK}  `]) {
            const info = parseSetOptsLine(line)!;
            expect(info.hexDigits).toBe(STOCK);
            expect(line.slice(info.hexRange![0], info.hexRange![1])).toBe(STOCK);
            expect(encodeVector(info.vector!)).toBe(STOCK);
        }
    });

    test('a bare SETOPTS keyword yields an insert offset instead of a token', () => {
        const info = parseSetOptsLine('SETOPTS')!;
        expect(info.hexRange).toBeUndefined();
        expect(info.insertOffset).toBe(7);
    });

    test('rejects non-SETOPTS lines, trailing junk and malformed tokens', () => {
        expect(parseSetOptsLine('ALIAS X0 SYSGUI')).toBeUndefined();
        expect(parseSetOptsLine('SETOPTSX 0010')).toBeUndefined();
        expect(parseSetOptsLine(`SETOPTS ${STOCK} extra`)).toBeUndefined();
        expect(parseSetOptsLine('SETOPTS $0010$')).toBeUndefined();
        expect(parseSetOptsLine('SETOPTS 00G0')).toBeUndefined();
    });
});

describe('describeVector', () => {
    test('summarizes the stock config', () => {
        const summary = describeVector(parseVector(STOCK)!);
        expect(summary).toContain('Console mode in public programs');
        expect(summary).toContain('Advisory locking in data files');
        expect(summary).toContain('Enable Data Server access');
    });

    test('an all-zero vector reads as defaults; unknown bits and tails are flagged', () => {
        expect(describeVector(parseVector('0000')!)).toBe('(default settings)');
        expect(describeVector(parseVector('0000000000000000C8')!)).toContain('unknown bit(s) $08$');
        expect(describeVector(parseVector('000000000000000000FF')!)).toContain('Bytes 10+: FF');
    });
});

/**
 * `describeIorAndMask` / `describeMaskVector` — the SETOPTS-in-code decode hover's exact
 * DISC-05 framing for `IOR`/`AND` masks (#475, plan 88-02). `'clear'` must report the catalog
 * bits ABSENT from the mask (a 0 bit in an AND mask means the option is cleared) — never the
 * bits present, which would invert the meaning DISC-05 mandates.
 */
describe('describeIorAndMask / describeMaskVector (AND masks as the options they clear)', () => {
    const byte1Bit = SETOPTS_BITS.find(b => b.byte === 1 && b.mask === 0x08)!;

    test('"set" selects exactly the catalog bits present in the mask', () => {
        const setLabels = SETOPTS_BITS.filter(b => b.byte === 1 && (0x08 & b.mask) !== 0).map(b => b.label);
        expect(describeIorAndMask(1, 0x08, 'set')).toEqual(setLabels);
        expect(describeIorAndMask(1, 0x08, 'set')).toEqual([byte1Bit.label]);
    });

    test('"clear" selects exactly the catalog bits ABSENT from the mask — the inversion DISC-05 requires', () => {
        // 0xF7 = every byte-1 catalog bit set except $08$ — the single ABSENT bit is the one
        // reported as cleared. If the 'set'/'clear' branches were swapped, this would fail:
        // describeIorAndMask(1, 0xF7, 'set') covers every OTHER byte-1 label instead.
        expect(describeIorAndMask(1, 0xF7, 'clear')).toEqual(['Console mode in public programs']);
        const clearLabels = SETOPTS_BITS.filter(b => b.byte === 1 && (0xF7 & b.mask) === 0).map(b => b.label);
        expect(describeIorAndMask(1, 0xF7, 'clear')).toEqual(clearLabels);
    });

    test('an all-ones AND mask clears nothing in that byte', () => {
        expect(describeIorAndMask(1, 0xFF, 'clear')).toEqual([]);
    });

    test('a zero IOR mask sets nothing in that byte', () => {
        expect(describeIorAndMask(1, 0x00, 'set')).toEqual([]);
    });

    test('only bytes listed in BYTE_GROUPS are ever described — mask replacement (5-6) and reserved (10-16) bytes are never treated as options', () => {
        // SETOPTS_BITS has no entries at all for bytes 5, 6, or 10+, so describeIorAndMask
        // filters to nothing regardless of the mask value.
        expect(describeIorAndMask(5, 0xFF, 'set')).toEqual([]);
        expect(describeIorAndMask(6, 0x00, 'clear')).toEqual([]);
        expect(describeIorAndMask(10, 0xFF, 'set')).toEqual([]);
    });

    test('describeMaskVector concatenates every covered byte\'s labels in catalog order, "Byte N: label · label" joined by "; "', () => {
        // byte 1 = $08$ (one set bit), byte 2 = $30$ (two set bits: 0x20, 0x10)
        const v = parseVector('0830')!;
        const byte2Labels = SETOPTS_BITS.filter(b => b.byte === 2 && (0x30 & b.mask) !== 0).map(b => b.label);
        expect(describeMaskVector(v, 'set')).toBe(
            `Byte 1: ${byte1Bit.label}; Byte 2: ${byte2Labels.join(' · ')}`
        );
    });

    test('describeMaskVector "clear" reports, per byte present in the vector, the catalog bits absent from that byte\'s mask', () => {
        const v = parseVector('F7')!; // one byte only — byte 1, every catalog bit set except $08$
        expect(describeMaskVector(v, 'clear')).toBe('Byte 1: Console mode in public programs');
    });

    test('a mask vector shorter than the full catalog says nothing about bytes beyond its length', () => {
        const v = parseVector('FF')!; // byte 1 only, all bits set — bytes 2+ don't exist in this vector
        // 'clear' on byte 1 reports nothing (every catalog bit is present), and no "Byte 2"
        // segment appears at all — a short AND mask says nothing about the bytes it doesn't cover.
        expect(describeMaskVector(v, 'clear')).toBe('(clears no modelled options)');
        expect(describeMaskVector(v, 'set')).not.toContain('Byte 2');
    });

    test('an empty result renders an explicit placeholder for both kinds, never an empty string', () => {
        const zero = parseVector('00000000')!;
        expect(describeMaskVector(zero, 'set')).toBe('(no modelled options)');
        const allOnes = parseVector('FFFFFFFF')!;
        expect(describeMaskVector(allOnes, 'clear')).toBe('(clears no modelled options)');
    });
});

describe('setoptsPreview (the round-trip contract)', () => {
    test('an untouched selection reproduces the original string exactly', () => {
        for (const digits of [STOCK, '0010', '00C20240000000000000AABB', '0000000000000000C8']) {
            const v = parseVector(digits)!;
            expect(setoptsPreview(v, selectionFor(v)).hexDigits).toBe(digits);
        }
    });

    test('toggling one bit changes exactly one nibble of the stock config', () => {
        const v = parseVector(STOCK)!;
        const sel = selectionFor(v);
        sel.bits.push({ byte: 2, mask: 0x10 }); // NUM() strips embedded spaces
        const preview = setoptsPreview(v, sel);
        expect(preview.hexDigits).toBe('08104020000000');
        expect(preview.line).toBe('SETOPTS 08104020000000');
    });

    test('unchecking a bit clears it; unknown bits in the same byte survive', () => {
        const v = parseVector('0000000000000000C8')!; // byte 9: $80$+$40$ known, $08$ unknown
        const sel = selectionFor(v);
        sel.bits = sel.bits.filter(b => !(b.byte === 9 && b.mask === 0x80));
        expect(setoptsPreview(v, sel).hexDigits).toBe('000000000000000048');
    });

    test('mask chars only apply while byte 3 $02$ is checked', () => {
        const v = parseVector('0000')!;
        const off = setoptsPreview(v, { ...noSelection, maskComma: 'x', maskDot: 'y' });
        expect(off.hexDigits).toBe('0000');
        expect(off.maskInputsEnabled).toBe(false);
        const on = setoptsPreview(v, {
            ...noSelection, bits: [{ byte: 3, mask: 0x02 }], maskComma: 'x', maskDot: 'y',
        });
        expect(on.hexDigits).toBe('000002007879');
        expect(on.maskInputsEnabled).toBe(true);
    });

    test('an unprintable byte 5/6 value survives an untouched empty char input', () => {
        const v = parseVector('000002010200')!; // replacement on; byte 5 = $01$ (unprintable), byte 6 = $02$
        const preview = setoptsPreview(v, selectionFor(v));
        expect(preview.hexDigits).toBe('000002010200');
    });

    test('a new composition starts from an all-defaults vector and grows on demand', () => {
        const fresh = setoptsPreview(undefined, noSelection);
        expect(fresh.hexDigits).toBe('00000000');
        const grown = setoptsPreview(undefined, { ...noSelection, bits: [{ byte: 9, mask: 0x20 }] });
        expect(grown.hexDigits).toBe('000000000000000020');
    });
});

/**
 * Tri-state model, full-width mask generators and canonical block codegen — the BBj-code
 * SETOPTS composer's compose-new/edit-in-place codegen (#475, DISC-06, plan 88-03).
 */
describe('singleBitIorMask / singleBitAndMask (full-width masks)', () => {
    test('singleBitIorMask(1, 0x08) is all-zero except byte 1', () => {
        expect(singleBitIorMask(1, 0x08)).toBe('08' + '00'.repeat(15));
    });

    test('singleBitAndMask(1, 0x08) is all-F except byte 1, which is F7', () => {
        expect(singleBitAndMask(1, 0x08)).toBe('F7' + 'FF'.repeat(15));
    });

    test('every generated mask is exactly MAX_BYTES * 2 digits long, for every catalog bit', () => {
        for (const bit of SETOPTS_BITS) {
            expect(singleBitIorMask(bit.byte, bit.mask)).toHaveLength(MAX_BYTES * 2);
            expect(singleBitAndMask(bit.byte, bit.mask)).toHaveLength(MAX_BYTES * 2);
        }
    });
});

describe('bbjHexLiteral (the one formatter that decides a BBj hex literal\'s delimiters)', () => {
    test('wraps digits in a dollar sign on each side, nothing else', () => {
        expect(bbjHexLiteral('08')).toBe('$08$');
    });

    test('the empty-literal form is $$, since HEX_STRING permits zero digits', () => {
        expect(bbjHexLiteral('')).toBe('$$');
    });

    test('never introduces a double-quote character', () => {
        expect(bbjHexLiteral('DEADBEEF')).not.toContain('"');
    });

    test('carries no whitespace', () => {
        expect(bbjHexLiteral('08')).not.toMatch(/\s/);
    });
});

describe('composeSetOptsBlock', () => {
    function selectionOf(entries: SetOptsTriStateEntry[]): SetOptsTriStateSelection {
        return { entries };
    }

    const byte1Bit08 = SETOPTS_BITS.find(b => b.byte === 1 && b.mask === 0x08)!;
    const byte2Bit20 = SETOPTS_BITS.find(b => b.byte === 2 && b.mask === 0x20)!;

    test('a mixed Set/Clear/Leave selection emits opts$=OPTS, IOR lines, AND lines, then SETOPTS opts$', () => {
        // Expected lines are LITERAL strings, cross-checked against the sibling mask-value tests
        // above (`singleBitIorMask(1, 0x08)` and `singleBitAndMask(2, 0x20)`), never built by
        // re-evaluating composeSetOptsBlock's own production template — that tautology (re-running
        // the exact code under test to build its own expectation) is what let a previous `"$…$"`
        // double-quote defect ship past this file with 33 previously-passing tests.
        const selection = selectionOf([
            { byte: byte1Bit08.byte, mask: byte1Bit08.mask, state: 'set' },
            { byte: byte2Bit20.byte, mask: byte2Bit20.mask, state: 'clear' },
        ]);
        const result = composeSetOptsBlock({ selection });
        expect(result.lines).toEqual([
            'opts$=OPTS',
            'opts$=IOR(opts$,$08000000000000000000000000000000$)',
            'opts$=AND(opts$,$FFDFFFFFFFFFFFFFFFFFFFFFFFFFFFFF$)',
            'SETOPTS opts$',
        ]);
        expect(result.text).toBe(result.lines.join('\n'));
    });

    test('the FIRST catalog entry (byte 1, mask 0x80) as Set produces a literal, delimiter-only IOR line', () => {
        // Pins the low end of the mask-base index alongside the mid-catalog case above; an
        // off-by-one in the byte index would show at exactly one of the two catalog boundaries.
        const first = SETOPTS_BITS[0]!;
        expect(first.byte).toBe(1);
        expect(first.mask).toBe(0x80);
        const result = composeSetOptsBlock({
            selection: selectionOf([{ byte: first.byte, mask: first.mask, state: 'set' }]),
            scope: 'reassignments',
        });
        expect(result.lines).toEqual(['opts$=IOR(opts$,$80000000000000000000000000000000$)']);
    });

    test('the LAST catalog entry (byte 9, mask 0x10) as Clear produces a literal, delimiter-only AND line', () => {
        const last = SETOPTS_BITS[SETOPTS_BITS.length - 1]!;
        expect(last.byte).toBe(9);
        expect(last.mask).toBe(0x10);
        const result = composeSetOptsBlock({
            selection: selectionOf([{ byte: last.byte, mask: last.mask, state: 'clear' }]),
            scope: 'reassignments',
        });
        expect(result.lines).toEqual(['opts$=AND(opts$,$FFFFFFFFFFFFFFFFEFFFFFFFFFFFFFFF$)']);
    });

    test('no composed line, in either scope, contains a double-quote character', () => {
        // The property the old tautological oracle could never express: BBj's grammar treats a
        // quoted string and a hex string as separate terminals (bbj.langium:949-950), so a `"`
        // anywhere in a generated IOR/AND argument silently defeats hex decoding at runtime.
        const selection = selectionOf([
            { byte: byte1Bit08.byte, mask: byte1Bit08.mask, state: 'set' },
            { byte: byte2Bit20.byte, mask: byte2Bit20.mask, state: 'clear' },
        ]);
        const block = composeSetOptsBlock({ selection });
        const reassignments = composeSetOptsBlock({ selection, scope: 'reassignments' });
        for (const line of [...block.lines, ...reassignments.lines]) {
            expect(line.includes('"')).toBe(false);
        }
    });

    test('all Set lines come before all Clear lines, in SETOPTS_BITS catalog order, regardless of selection order', () => {
        // Selection lists the Clear entry first — output must still be Set-then-Clear.
        const selection = selectionOf([
            { byte: byte2Bit20.byte, mask: byte2Bit20.mask, state: 'clear' },
            { byte: byte1Bit08.byte, mask: byte1Bit08.mask, state: 'set' },
        ]);
        const result = composeSetOptsBlock({ selection, scope: 'reassignments' });
        expect(result.lines[0]).toContain('IOR');
        expect(result.lines[1]).toContain('AND');
    });

    test('scope: "reassignments" returns only the IOR/AND lines — no origin line, no SETOPTS line', () => {
        const selection = selectionOf([{ byte: byte1Bit08.byte, mask: byte1Bit08.mask, state: 'set' }]);
        const result = composeSetOptsBlock({ selection, scope: 'reassignments' });
        expect(result.lines).toHaveLength(1);
        expect(result.lines[0]).not.toContain('OPTS');
        expect(result.lines[0]).not.toContain('SETOPTS');
    });

    test('an all-Leave selection with scope: "block" returns exactly two lines (origin + SETOPTS)', () => {
        const result = composeSetOptsBlock({ selection: selectionOf([]) });
        expect(result.lines).toEqual([`${SETOPTS_IN_CODE_DEFAULT_VAR}=OPTS`, `SETOPTS ${SETOPTS_IN_CODE_DEFAULT_VAR}`]);
    });

    test('an all-Leave selection with scope: "reassignments" returns zero lines and an empty text', () => {
        const result = composeSetOptsBlock({ selection: selectionOf([]), scope: 'reassignments' });
        expect(result.lines).toEqual([]);
        expect(result.text).toBe('');
    });

    test('an entry explicitly left "leave" produces no line, same as an entry missing from the selection', () => {
        const explicitLeave = composeSetOptsBlock({
            selection: selectionOf([{ byte: byte1Bit08.byte, mask: byte1Bit08.mask, state: 'leave' }]),
            scope: 'reassignments',
        });
        const missingEntirely = composeSetOptsBlock({ selection: selectionOf([]), scope: 'reassignments' });
        expect(explicitLeave.lines).toEqual(missingEntirely.lines);
    });

    test('every returned line is prefixed with the supplied indent string', () => {
        const selection = selectionOf([{ byte: byte1Bit08.byte, mask: byte1Bit08.mask, state: 'set' }]);
        const result = composeSetOptsBlock({ selection, indent: '        ' });
        for (const line of result.lines) {
            expect(line.startsWith('        ')).toBe(true);
        }
    });

    test('a custom variable name is used consistently across every line', () => {
        const selection = selectionOf([{ byte: byte1Bit08.byte, mask: byte1Bit08.mask, state: 'set' }]);
        const result = composeSetOptsBlock({ selection, variable: 'A$' });
        expect(result.lines[0]).toBe('A$=OPTS');
        expect(result.lines[1]).toContain('A$=IOR(A$,');
        expect(result.lines[2]).toBe('SETOPTS A$');
    });

    test('two calls with the same input return byte-identical text', () => {
        const selection = selectionOf([
            { byte: byte1Bit08.byte, mask: byte1Bit08.mask, state: 'set' },
            { byte: byte2Bit20.byte, mask: byte2Bit20.mask, state: 'clear' },
        ]);
        const first = composeSetOptsBlock({ selection });
        const second = composeSetOptsBlock({ selection });
        expect(second.text).toBe(first.text);
    });
});

describe('triStateFromChainEffect', () => {
    test('maps every catalog bit to set/clear/leave, one entry per SETOPTS_BITS member, in catalog order', () => {
        const selection = triStateFromChainEffect({
            set: [{ byte: 1, mask: 0x08 }],
            clear: [{ byte: 2, mask: 0x20 }],
        });
        expect(selection.entries).toHaveLength(SETOPTS_BITS.length);
        expect(selection.entries.map(e => ({ byte: e.byte, mask: e.mask }))).toEqual(
            SETOPTS_BITS.map(b => ({ byte: b.byte, mask: b.mask }))
        );
        const byte1 = selection.entries.find(e => e.byte === 1 && e.mask === 0x08)!;
        const byte2 = selection.entries.find(e => e.byte === 2 && e.mask === 0x20)!;
        expect(byte1.state).toBe('set');
        expect(byte2.state).toBe('clear');
        for (const entry of selection.entries) {
            if (entry === byte1 || entry === byte2) continue;
            expect(entry.state).toBe('leave');
        }
    });

    test('an empty effect maps every entry to leave', () => {
        const selection = triStateFromChainEffect({ set: [], clear: [] });
        expect(selection.entries.every(e => e.state === 'leave')).toBe(true);
    });
});
