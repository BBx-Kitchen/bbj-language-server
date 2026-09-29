import { describe, expect, test } from 'vitest';
import { CallSpan, findCallAt, findCalls, scanArgs, trimmedRange } from '../src/composer-call-scanner.js';
import { findMsgboxCalls } from '../src/msgbox-composer.js';
import { findCvsCalls } from '../src/cvs-composer.js';
import { findAddWindowCalls } from '../src/addwindow-composer.js';
import { findAddChildWindowCalls } from '../src/addchildwindow-composer.js';

describe('composer-call-scanner (#534)', () => {
    describe('scanArgs', () => {
        test('finds four top-level argument ranges and callEnd past the closing paren, handling nested parens and quoted strings', () => {
            const line = 'f(a, (b, c), "x, ""y""", d)';
            const open = line.indexOf('(') + 1;
            const { argRanges, callEnd } = scanArgs(line, open);
            expect(argRanges.map(([a, b]) => line.slice(a, b).trim())).toEqual(['a', '(b, c)', '"x, ""y"""', 'd']);
            expect(callEnd).toBe(line.length);
        });

        test('an unterminated call returns the last range ending at the line end and callEnd equal to the line length', () => {
            const line = 'f(a, b';
            const open = line.indexOf('(') + 1;
            const { argRanges, callEnd } = scanArgs(line, open);
            expect(argRanges.map(([a, b]) => line.slice(a, b).trim())).toEqual(['a', 'b']);
            expect(callEnd).toBe(line.length);
        });

        test('an empty call returns one empty range', () => {
            const line = 'f()';
            const open = line.indexOf('(') + 1;
            const { argRanges, callEnd } = scanArgs(line, open);
            expect(argRanges).toEqual([[open, open]]);
            expect(callEnd).toBe(line.length);
        });
    });

    describe('trimmedRange', () => {
        test('strips leading and trailing whitespace from the segment', () => {
            const line = '  ab  ';
            expect(trimmedRange(line, 0, line.length)).toEqual([2, 4]);
        });

        test('an all-whitespace segment [a, b) returns [b, b]', () => {
            const line = '   ';
            expect(trimmedRange(line, 0, line.length)).toEqual([line.length, line.length]);
        });
    });

    describe('findCalls', () => {
        const build = (line: string, callStart: number, open: number): CallSpan => ({ callStart, callEnd: open });

        test('finds addWindow ( and ADDWINDOW( case-insensitively in source order, calling build with (line, callStart, open)', () => {
            const line = 'x = addWindow (1) + ADDWINDOW(2)';
            const seen: Array<{ callStart: number; open: number }> = [];
            const calls = findCalls(line, 'addwindow', (ln, callStart, open) => {
                seen.push({ callStart, open });
                return build(ln, callStart, open);
            });
            expect(calls).toHaveLength(2);
            expect(seen[0].callStart).toBe(line.indexOf('addWindow'));
            expect(seen[1].callStart).toBe(line.indexOf('ADDWINDOW'));
            expect(line[seen[0].open - 1]).toBe('(');
            expect(line[seen[1].open - 1]).toBe('(');
        });

        test('without options also matches a name preceded by a dot or an identifier character (the existing looser behaviour)', () => {
            expect(findCalls('obj.addwindow(1)', 'addwindow', build)).toHaveLength(1);
            expect(findCalls('xaddwindow(1)', 'addwindow', build)).toHaveLength(1);
        });

        test('with the notAfterIdentifierOrDot option excludes a name after an identifier character or a dot', () => {
            const opts = { notAfterIdentifierOrDot: true };
            for (const line of ['obj.cvs(a)', 'obj!.cvs(a)', 'xcvs(a)', 'my_cvs(a)', '2cvs(a)']) {
                expect(findCalls(line, 'cvs', build, opts)).toHaveLength(0);
            }
        });

        test('with the notAfterIdentifierOrDot option still matches at line start and after a space, =, ( or +', () => {
            const opts = { notAfterIdentifierOrDot: true };
            for (const line of ['cvs(a)', ' cvs(a)', '=cvs(a)', '(cvs(a)', '+cvs(a)']) {
                expect(findCalls(line, 'cvs', build, opts)).toHaveLength(1);
            }
        });

        test('throws for a name that is not a plain identifier', () => {
            expect(() => findCalls('x', '', build)).toThrow();
            expect(() => findCalls('x', 'a.b', build)).toThrow();
            expect(() => findCalls('x', 'a(b)', build)).toThrow();
        });
    });

    describe('findCallAt', () => {
        test('returns undefined outside every span, includes both ends inclusive, and returns the smallest containing span for nested calls', () => {
            const outer: CallSpan = { callStart: 0, callEnd: 10 };
            const inner: CallSpan = { callStart: 2, callEnd: 6 };
            const calls = [outer, inner];
            expect(findCallAt(calls, -1)).toBeUndefined();
            expect(findCallAt(calls, 11)).toBeUndefined();
            expect(findCallAt(calls, 0)).toBe(outer);
            expect(findCallAt(calls, 10)).toBe(outer);
            expect(findCallAt(calls, 3)).toBe(inner);
        });
    });

    describe('per-composer boundary difference survives the consolidation', () => {
        test('findMsgboxCalls keeps its looser matching (call after a dot or an identifier character) while findCvsCalls keeps its stricter boundary', () => {
            const looserLines = ['obj.msgbox("hi")', 'xmsgbox("hi")'];
            for (const line of looserLines) {
                const calls = findMsgboxCalls(line);
                expect(calls).toHaveLength(1);
                expect(calls[0].callStart).toBe(line.toLowerCase().indexOf('msgbox'));
            }

            const stricterLines = ['obj.cvs(a$, 1)', 'xcvs(a$, 1)'];
            for (const line of stricterLines) {
                expect(findCvsCalls(line)).toHaveLength(0);
            }
        });

        test('findAddWindowCalls and findAddChildWindowCalls also default to the looser matching, so an accidental flip of either composer\'s findCalls options argument fails here', () => {
            const looserAddWindowLines = ['obj.addwindow("w", 0, 0, 10, 10, "")', 'xaddwindow("w", 0, 0, 10, 10, "")'];
            for (const line of looserAddWindowLines) {
                const calls = findAddWindowCalls(line);
                expect(calls).toHaveLength(1);
                expect(calls[0].callStart).toBe(line.toLowerCase().indexOf('addwindow'));
            }

            const looserAddChildWindowLines = ['obj.addchildwindow("w", 0, 0, 10, 10, "")', 'xaddchildwindow("w", 0, 0, 10, 10, "")'];
            for (const line of looserAddChildWindowLines) {
                const calls = findAddChildWindowCalls(line);
                expect(calls).toHaveLength(1);
                expect(calls[0].callStart).toBe(line.toLowerCase().indexOf('addchildwindow'));
            }
        });
    });
});
