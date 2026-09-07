/**
 * Tests for the editor-agnostic config.bbx SETOPTS catalog/vector module (#474).
 */
import { describe, expect, test } from 'vitest';
import {
    BYTE_GROUPS, FIRST_RAW_BYTE, MASK_COMMA_BYTE, MASK_DOT_BYTE, SETOPTS_BITS,
    composeSetOptsLine, describeIorAndMask, describeMaskVector, describeVector, encodeVector,
    emptyVector, getBit, knownByteMask, maskChar, parseSetOptsLine, parseVector, rawTail, setBit,
    setMaskChar, setRawTail, setoptsPreview, unknownBitsInByte,
    type SetOptsSelection, type SetOptsVector,
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
