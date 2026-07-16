import { describe, expect, test } from 'vitest';
import { isTokenizedBBjHeader, TOKENIZED_BBJ_MAGIC_LENGTH } from '../src/tokenized-bbj.js';

describe('isTokenizedBBjHeader', () => {
    // First 16 bytes of a real tokenized program (_util), taken from the
    // little-endian hexdump words: 3c3c 6262 3e6a 843e 0000 001f f700 da09
    const realHeader = Uint8Array.from([
        0x3c, 0x3c, 0x62, 0x62, 0x6a, 0x3e, 0x3e, 0x84,
        0x00, 0x00, 0x1f, 0x00, 0x00, 0xf7, 0x09, 0xda
    ]);

    test('detects the "<<bbj>>" magic of a real tokenized program', () => {
        expect(isTokenizedBBjHeader(realHeader)).toBe(true);
    });

    test('detects when given exactly the magic-length prefix', () => {
        expect(isTokenizedBBjHeader(realHeader.subarray(0, TOKENIZED_BBJ_MAGIC_LENGTH))).toBe(true);
    });

    test('rejects plain-text BBj source', () => {
        const text = new TextEncoder().encode('rem hello\nprint "hi"\n');
        expect(isTokenizedBBjHeader(text)).toBe(false);
    });

    test('rejects a near-miss (wrong angle brackets)', () => {
        const bytes = new TextEncoder().encode('<bbj>>>');
        expect(isTokenizedBBjHeader(bytes)).toBe(false);
    });

    test('rejects a truncated prefix shorter than the magic', () => {
        expect(isTokenizedBBjHeader(Uint8Array.from([0x3c, 0x3c, 0x62]))).toBe(false);
    });

    test('rejects empty input', () => {
        expect(isTokenizedBBjHeader(new Uint8Array(0))).toBe(false);
    });
});
