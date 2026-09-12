import { describe, expect, test } from 'vitest';
import {
    CVS_BITS, CVS_CHARS_TOOLTIP, CVS_KNOWN_MASK,
    charsApplies, composeCvsCall, cvsBitsSet, encodeCvsMask,
} from '../src/cvs-composer.js';

describe('CVS() composer logic (#649)', () => {
    test('CVS_BITS catalog is the eight documented bits, ascending', () => {
        expect(CVS_BITS.map(b => b.value)).toEqual([1, 2, 4, 8, 16, 32, 64, 128]);
    });

    test('charsCustomizable is true exactly for 1, 2, 16, 32, 128', () => {
        const customizable = CVS_BITS.filter(b => b.charsCustomizable).map(b => b.value);
        expect(customizable).toEqual([1, 2, 16, 32, 128]);
    });

    test('CVS_CHARS_TOOLTIP names both version gates', () => {
        expect(CVS_CHARS_TOOLTIP).toMatch(/19\.0/);
        expect(CVS_CHARS_TOOLTIP).toMatch(/19\.10/);
    });

    test('CVS_KNOWN_MASK covers all eight documented bits', () => {
        expect(CVS_KNOWN_MASK).toBe(255);
    });

    test('encodeCvsMask ORs the given bits', () => {
        expect(encodeCvsMask([1, 4])).toBe(5);
        expect(encodeCvsMask([])).toBe(0);
        expect(encodeCvsMask([1, 2, 128])).toBe(131);
    });

    test('cvsBitsSet returns catalog values present, ascending', () => {
        expect(cvsBitsSet(5)).toEqual([1, 4]);
        expect(cvsBitsSet(131)).toEqual([1, 2, 128]);
        expect(cvsBitsSet(0)).toEqual([]);
    });

    test('charsApplies is true when any checked bit is chars-customizable', () => {
        expect(charsApplies([4])).toBe(false);
        expect(charsApplies([4, 1])).toBe(true);
        expect(charsApplies([8, 64])).toBe(false);
        expect(charsApplies([128])).toBe(true);
    });

    test('composeCvsCall builds the call from str + mask, optional chars/assignTo/trailingArgs', () => {
        expect(composeCvsCall({ str: 'a$', mask: 5 })).toBe('CVS(a$, 5)');
        expect(composeCvsCall({ str: 'a$', mask: 5, chars: '"*"' })).toBe('CVS(a$, 5, "*")');
        expect(composeCvsCall({ str: 'a$', mask: 5, assignTo: 'b$' })).toBe('b$ = CVS(a$, 5)');
        expect(composeCvsCall({ str: 'a$', mask: 5, trailingArgs: ['ERR=100'] })).toBe('CVS(a$, 5, ERR=100)');
    });

    test('composeCvsCall never trims or measures chars — verbatim byte-for-byte', () => {
        const statement = composeCvsCall({ str: 'a$', mask: 1, chars: '"é✓"' });
        expect(statement).toContain('"é✓"');
    });
});
