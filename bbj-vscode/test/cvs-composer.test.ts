import { describe, expect, test } from 'vitest';
import {
    CVS_BITS, CVS_CHARS_TOOLTIP, CVS_KNOWN_MASK, CVS_NOT_EDITABLE_REASON_TEXT,
    charsApplies, composeCvsCall, cvsBitsSet, cvsPreview, decodeCvsCall, describeCvsMask,
    encodeCvsMask, findCvsCallAt, findCvsCalls, parseCvsCallOnLine, parseCvsLiteralSum,
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

    // --- literal-sum parsing ---

    test('parseCvsLiteralSum accepts integer sums, rejects everything else', () => {
        expect(parseCvsLiteralSum('5')).toBe(5);
        expect(parseCvsLiteralSum(' 1 + 4 ')).toBe(5);
        expect(parseCvsLiteralSum('1+2+128')).toBe(131);
        expect(parseCvsLiteralSum('n%')).toBeUndefined();
        expect(parseCvsLiteralSum('1+n%')).toBeUndefined();
        expect(parseCvsLiteralSum('(1+4)')).toBeUndefined();
        expect(parseCvsLiteralSum('8-3')).toBeUndefined();
        expect(parseCvsLiteralSum('1++4')).toBeUndefined();
        expect(parseCvsLiteralSum('')).toBeUndefined();
    });

    // --- call location ---

    test('findCvsCalls finds every CVS(...) call in source order, case-insensitively', () => {
        const calls = findCvsCalls('x$ = CVS(a$, 1) + CVS(b$, 4)');
        expect(calls).toHaveLength(2);
        expect(calls[0].args).toEqual(['a$', '1']);
        expect(calls[1].args).toEqual(['b$', '4']);
    });

    test('findCvsCalls keeps longer names and method calls out via the identifier boundary', () => {
        expect(findCvsCalls('x$ = MYCVS(a$, 1)')).toHaveLength(0);
        expect(findCvsCalls('x$ = obj!.cvs(a$, 1)')).toHaveLength(0);
    });

    test('findCvsCallAt picks the innermost call containing the cursor; parseCvsCallOnLine picks the first', () => {
        const line = 'x$ = CVS(a$, 1) + CVS(b$, 4)';
        expect(findCvsCallAt(line, 6)?.args).toEqual(['a$', '1']);
        expect(findCvsCallAt(line, 20)?.args).toEqual(['b$', '4']);
        expect(findCvsCallAt(line, 16)).toBeUndefined();
        expect(parseCvsCallOnLine(line)?.args).toEqual(['a$', '1']);
    });

    // --- edit-in-place decode verdict ---

    test('decodeCvsCall recognizes a literal-sum mask as editable', () => {
        const result = decodeCvsCall('x$ = CVS(a$, 1+4)', 6);
        expect(result.found).toBe(true);
        expect(result.editable).toBe(true);
        expect(result.edit).toEqual({ callStart: 5, callEnd: 17 });
        expect(result.initial).toEqual({ str: 'a$', bits: [1, 4], chars: '' });
        expect(result.trailingArgs).toEqual([]);
    });

    test('decodeCvsCall preserves the string, chars and ERR arguments verbatim', () => {
        const withChars = decodeCvsCall('x$ = CVS(" a ", 3, "*", ERR=100)');
        expect(withChars.initial?.str).toBe('" a "');
        expect(withChars.initial?.chars).toBe('"*"');
        expect(withChars.trailingArgs).toEqual(['ERR=100']);

        const noChars = decodeCvsCall('x$ = CVS(a$, 1, ERR=100)');
        expect(noChars.initial?.chars).toBe('');
        expect(noChars.trailingArgs).toEqual(['ERR=100']);
    });

    test('decodeCvsCall reports the three not-editable reasons, and found:false for no call', () => {
        const nonLiteral = decodeCvsCall('x$ = CVS(a$, n%)');
        expect(nonLiteral.found).toBe(true);
        expect(nonLiteral.editable).toBe(false);
        expect(nonLiteral.reason).toBe(CVS_NOT_EDITABLE_REASON_TEXT['non-literal-mask']);

        const missingMask = decodeCvsCall('x$ = CVS(a$)');
        expect(missingMask.editable).toBe(false);
        expect(missingMask.reason).toBe(CVS_NOT_EDITABLE_REASON_TEXT['missing-mask']);

        const unknownBits = decodeCvsCall('x$ = CVS(a$, 256)');
        expect(unknownBits.editable).toBe(false);
        expect(unknownBits.reason).toBe(CVS_NOT_EDITABLE_REASON_TEXT['unknown-bits']);

        expect(decodeCvsCall('x$ = 1 + 1')).toEqual({ found: false });
    });

    // --- preview ---

    test('cvsPreview with no bits set yields mask 0, "(no operation)", chars disabled', () => {
        const preview = cvsPreview({ str: 'a$', bits: [], chars: '' });
        expect(preview.mask).toBe(0);
        expect(preview.summary).toBe('(no operation)');
        expect(preview.charsEnabled).toBe(false);
        expect(preview.statement).toBe('CVS(a$, 0)');
    });

    test('cvsPreview with multiple bits lists them ascending and notes ascending application', () => {
        const preview = cvsPreview({ str: 'a$', bits: [4, 1], chars: '"*"' });
        expect(preview.mask).toBe(5);
        const leadingIdx = preview.summary.indexOf('Strip leading spaces');
        const upperIdx = preview.summary.indexOf('Convert to uppercase');
        expect(leadingIdx).toBeGreaterThanOrEqual(0);
        expect(upperIdx).toBeGreaterThan(leadingIdx);
        expect(preview.summary).toMatch(/ascending order/);
        expect(preview.charsEnabled).toBe(true);
        expect(preview.statement).toBe('CVS(a$, 5, "*")');
    });

    test('cvsPreview disables chars when no checked bit is chars-customizable', () => {
        const preview = cvsPreview({ str: 'a$', bits: [4], chars: '"*"' });
        expect(preview.charsEnabled).toBe(false);
        expect(preview.statement).toBe('CVS(a$, 4)');
    });

    test('cvsPreview reports strError for an empty string and charsError for an invalid chars expression', () => {
        const emptyStr = cvsPreview({ str: '', bits: [1], chars: '' });
        expect(emptyStr.strError).toBeTruthy();
        expect(emptyStr.valid).toBe(false);

        const badChars = cvsPreview({ str: 'a$', bits: [1], chars: 'abc' });
        expect(badChars.charsError).toBeTruthy();
        expect(badChars.valid).toBe(false);
    });

    test('cvsPreview in edit mode omits assignTo and appends trailingArgs verbatim', () => {
        const preview = cvsPreview({
            str: 'a$', bits: [1], chars: '', assignTo: 'b$', trailingArgs: ['ERR=100'], editMode: true,
        });
        expect(preview.statement).toBe('CVS(a$, 1, ERR=100)');
    });

    test('describeCvsMask matches cvsPreview.summary for a representative mask', () => {
        expect(describeCvsMask(0)).toBe('(no operation)');
        expect(describeCvsMask(5)).toBe(cvsPreview({ str: 'a$', bits: [1, 4], chars: '' }).summary);
    });
});
