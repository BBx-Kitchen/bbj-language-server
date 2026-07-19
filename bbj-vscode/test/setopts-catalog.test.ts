/**
 * Tests for the editor-agnostic config.bbx SETOPTS catalog/vector module (#474).
 */
import { describe, expect, test } from 'vitest';
import {
    BYTE_GROUPS, FIRST_RAW_BYTE, MASK_COMMA_BYTE, MASK_DOT_BYTE, SETOPTS_BITS,
    composeSetOptsLine, describeVector, encodeVector, emptyVector, getBit, knownByteMask,
    maskChar, parseSetOptsLine, parseVector, rawTail, setBit, setMaskChar, setRawTail,
    setoptsPreview, unknownBitsInByte, type SetOptsSelection, type SetOptsVector,
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
