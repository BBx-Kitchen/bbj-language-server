import { describe, expect, test } from 'vitest';
import { isLineNumberedSource } from '../src/line-numbering.js';

describe('isLineNumberedSource', () => {
    test('detects a classic line-numbered program', () => {
        expect(isLineNumberedSource(
            '0010 LET A=5\n' +
            '0020 PRINT A\n' +
            '0030 END\n'
        )).toBe(true);
    });

    test('ignores blank lines between numbered statements', () => {
        expect(isLineNumberedSource(
            '\n' +
            '0010 LET A=5\n' +
            '\n' +
            '0020 PRINT A\n' +
            '0030 GOTO 0010\n'
        )).toBe(true);
    });

    test('accepts numbered REM lines (whole program is numbered)', () => {
        expect(isLineNumberedSource(
            '00010 REM my program\n' +
            '00020 PRINT "hi"\n' +
            '00030 STOP\n'
        )).toBe(true);
    });

    test('rejects modern unnumbered source', () => {
        expect(isLineNumberedSource(
            'class public MyApp\n' +
            '    method public void run()\n' +
            '        print "hi"\n' +
            '    methodend\n' +
            'classend\n'
        )).toBe(false);
    });

    test('rejects a mix (a single unnumbered statement disqualifies)', () => {
        expect(isLineNumberedSource(
            '0010 LET A=5\n' +
            'PRINT A\n' +
            '0030 END\n'
        )).toBe(false);
    });

    test('does not treat numeric labels as line numbers', () => {
        // `0010:` is a label, not a line number — no whitespace before the statement.
        expect(isLineNumberedSource(
            '0010:\n' +
            '    print "hi"\n' +
            '    goto 0010\n'
        )).toBe(false);
    });

    test('too few lines to decide → false', () => {
        expect(isLineNumberedSource('0010 PRINT "hi"\n')).toBe(false);
    });

    test('handles CRLF line endings', () => {
        expect(isLineNumberedSource(
            '0010 LET A=5\r\n' +
            '0020 PRINT A\r\n' +
            '0030 END\r\n'
        )).toBe(true);
    });

    test('empty input → false', () => {
        expect(isLineNumberedSource('')).toBe(false);
    });
});
