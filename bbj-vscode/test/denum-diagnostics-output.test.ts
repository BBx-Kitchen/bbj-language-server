import { describe, expect, test } from 'vitest';
import { denumPayloadUri, denumPayloadVersion, denumProblems, formatDenumDiagnosticsBlock } from '../src/denum-diagnostics-output.js';

const UNKNOWN_HEADER = 'Denumber diagnostics for an unknown file:';

function entry(overrides: Record<string, unknown> = {}): Record<string, unknown> {
    return { line: 1, originalLineNumber: '0010', severity: 'ERROR', message: 'syntax error', ...overrides };
}

describe('formatDenumDiagnosticsBlock', () => {
    test('writes a header naming the file, then one line per entry', () => {
        const lines = formatDenumDiagnosticsBlock({
            uri: 'file:///ws/a.bbj',
            diagnostics: [{ line: 1, originalLineNumber: '0010', severity: 'ERROR', message: 'syntax error' }],
        });

        expect(lines).toEqual([
            'Denumber diagnostics for /ws/a.bbj:',
            '  line 1 (original 0010) ERROR: syntax error',
        ]);
    });

    test('an entry at line 0 is written as no location, and an empty original line number is left out', () => {
        const lines = formatDenumDiagnosticsBlock({
            uri: 'file:///ws/a.bbj',
            diagnostics: [entry({ line: 0, originalLineNumber: '', severity: 'INFO', message: 'note' })],
        });

        expect(lines[1]).toBe('  no location INFO: note');
    });

    test('an empty original line number is left out of a located entry too', () => {
        const lines = formatDenumDiagnosticsBlock({
            uri: 'file:///ws/a.bbj',
            diagnostics: [entry({ originalLineNumber: '', severity: 'WARNING' })],
        });

        expect(lines[1]).toBe('  line 1 WARNING: syntax error');
    });

    test('a uri that is not a file uri is written as given', () => {
        expect(formatDenumDiagnosticsBlock({ uri: 'untitled:Untitled-1', diagnostics: [] }))
            .toEqual(['Denumber diagnostics for untitled:Untitled-1:']);
    });

    test.each([
        ['undefined', undefined],
        ['null', null],
        ['a number', 42],
        ['a string', 'text'],
        ['an empty object', {}],
        ['an array', []],
        ['a numeric uri and text diagnostics', { uri: 7, diagnostics: 'x' }],
    ])('%s gives a header for an unknown file and no entry, without throwing', (_name, payload) => {
        expect(formatDenumDiagnosticsBlock(payload)).toEqual([UNKNOWN_HEADER]);
    });

    test.each([
        ['diagnostics that are not an array', { uri: 'file:///ws/a.bbj', diagnostics: 'x' }],
        ['no diagnostics at all', { uri: 'file:///ws/a.bbj' }],
        ['diagnostics that are null', { uri: 'file:///ws/a.bbj', diagnostics: null }],
    ])('a string uri with %s gives its header and no entry', (_name, payload) => {
        expect(formatDenumDiagnosticsBlock(payload)).toEqual(['Denumber diagnostics for /ws/a.bbj:']);
    });

    test('invalid entries are skipped while the valid entries around them are kept in order', () => {
        const lines = formatDenumDiagnosticsBlock({
            uri: 'file:///ws/a.bbj',
            diagnostics: [
                entry({ message: 'first' }),
                null,
                'text',
                42,
                [],
                entry({ line: -1, message: 'negative line' }),
                entry({ line: 1.5, message: 'fractional line' }),
                entry({ line: '3', message: 'text line' }),
                entry({ line: Number.MAX_SAFE_INTEGER + 1, message: 'unsafe line' }),
                entry({ severity: 'FATAL', message: 'unknown severity' }),
                entry({ severity: 'error', message: 'lower-case severity' }),
                entry({ message: 42 }),
                entry({ message: undefined }),
                entry({ line: 2, message: 'second' }),
            ],
        });

        expect(lines).toEqual([
            'Denumber diagnostics for /ws/a.bbj:',
            '  line 1 (original 0010) ERROR: first',
            '  line 2 (original 0010) ERROR: second',
        ]);
    });

    test('a non-string original line number is treated as empty', () => {
        const lines = formatDenumDiagnosticsBlock({
            uri: 'file:///ws/a.bbj',
            diagnostics: [entry({ originalLineNumber: 10 }), entry({ originalLineNumber: null, line: 2 })],
        });

        expect(lines.slice(1)).toEqual([
            '  line 1 ERROR: syntax error',
            '  line 2 ERROR: syntax error',
        ]);
    });

    test('a CR or LF inside the message becomes one space each, so an entry stays one line', () => {
        const lines = formatDenumDiagnosticsBlock({
            uri: 'file:///ws/a.bbj',
            diagnostics: [entry({ message: 'first\r\nsecond' }), entry({ message: 'a\nb\rc' })],
        });

        expect(lines[1]).toBe('  line 1 (original 0010) ERROR: first  second');
        expect(lines[2]).toBe('  line 1 (original 0010) ERROR: a b c');
        for (const line of lines) {
            expect(line).not.toMatch(/[\r\n]/);
        }
    });

    test('a CR or LF inside the original line number or the path is flattened the same way', () => {
        const lines = formatDenumDiagnosticsBlock({
            uri: 'untitled:one\ntwo',
            diagnostics: [entry({ originalLineNumber: '00\r10' })],
        });

        expect(lines).toEqual([
            'Denumber diagnostics for untitled:one two:',
            '  line 1 (original 00 10) ERROR: syntax error',
        ]);
    });

    test('other control characters and the Unicode line and paragraph separators become a space too', () => {
        const lines = formatDenumDiagnosticsBlock({
            uri: 'untitled:a\u2028b',
            diagnostics: [
                entry({ message: 'a\u2028b\u2029c\u0085d\u000be\u0000f\u007fg\u009fh' }),
                entry({ originalLineNumber: '00\u2029\u001b10' }),
            ],
        });

        expect(lines).toEqual([
            'Denumber diagnostics for untitled:a b:',
            '  line 1 (original 0010) ERROR: a b c d e f g h',
            '  line 1 (original 00  10) ERROR: syntax error',
        ]);
    });

    test('a message with astral characters and a very long message are written whole', () => {
        const long = 'x'.repeat(2000);
        const lines = formatDenumDiagnosticsBlock({
            uri: 'file:///ws/a.bbj',
            diagnostics: [entry({ message: 'smile \u{1F600} done' }), entry({ message: long })],
        });

        expect(lines[1]).toBe('  line 1 (original 0010) ERROR: smile \u{1F600} done');
        expect(lines[2]).toBe(`  line 1 (original 0010) ERROR: ${long}`);
    });

    test('entries are written in the order the payload lists them, equal lines included', () => {
        const lines = formatDenumDiagnosticsBlock({
            uri: 'file:///ws/a.bbj',
            diagnostics: [
                entry({ line: 5, message: 'third in the list but first' }),
                entry({ line: 2, message: 'earlier line second' }),
                entry({ line: 5, message: 'same line again' }),
                entry({ line: 5, message: 'and once more' }),
            ],
        });

        expect(lines.slice(1).map(line => line.split(': ')[1])).toEqual([
            'third in the list but first',
            'earlier line second',
            'same line again',
            'and once more',
        ]);
    });

    test('two runs on the same file are two separate blocks, each with its own header', () => {
        const params = { uri: 'file:///ws/a.bbj', diagnostics: [entry()] };

        const first = formatDenumDiagnosticsBlock(params);
        const second = formatDenumDiagnosticsBlock(params);

        expect(first[0]).toBe('Denumber diagnostics for /ws/a.bbj:');
        expect(second[0]).toBe('Denumber diagnostics for /ws/a.bbj:');
        expect([...first, ...second].filter(line => line.startsWith('Denumber diagnostics for'))).toHaveLength(2);
    });

    test('hostile text only ever becomes output text', () => {
        const lines = formatDenumDiagnosticsBlock({
            uri: 'command:workbench.action.reloadWindow',
            diagnostics: [entry({ message: 'command:workbench.action.quit' })],
        });

        expect(lines).toEqual([
            'Denumber diagnostics for command:workbench.action.reloadWindow:',
            '  line 1 (original 0010) ERROR: command:workbench.action.quit',
        ]);
    });
});

describe('denumPayloadUri', () => {
    test('gives the uri of a payload that names one', () => {
        expect(denumPayloadUri({ uri: 'file:///ws/a.bbj', diagnostics: [] })).toBe('file:///ws/a.bbj');
    });

    test.each([
        ['a numeric uri', { uri: 7 }],
        ['null', null],
        ['a string', 'x'],
    ])('gives undefined for %s', (_name, payload) => {
        expect(denumPayloadUri(payload)).toBeUndefined();
    });
});

describe('denumPayloadVersion', () => {
    test.each([
        ['zero', 0],
        ['a positive version', 7],
    ])('gives %s as it is', (_name, version) => {
        expect(denumPayloadVersion({ uri: 'file:///ws/a.bbj', diagnostics: [], version })).toBe(version);
    });

    test.each<[string, unknown]>([
        ['a negative number', -1],
        ['a fraction', 1.5],
        ['NaN', Number.NaN],
        ['Infinity', Number.POSITIVE_INFINITY],
        ['a number beyond the safe integers', 2 ** 53],
        ['a numeric string', '7'],
        ['null', null],
        ['an object', { value: 7 }],
    ])('gives undefined for %s', (_name, version) => {
        expect(denumPayloadVersion({ uri: 'file:///ws/a.bbj', diagnostics: [], version })).toBeUndefined();
    });

    test.each<[string, unknown]>([
        ['a missing version key', { uri: 'file:///ws/a.bbj', diagnostics: [] }],
        ['null', null],
        ['a number', 7],
        ['a string', '7'],
        ['an array', [7]],
        ['undefined', undefined],
    ])('gives undefined for %s as the payload', (_name, payload) => {
        expect(denumPayloadVersion(payload)).toBeUndefined();
    });
});

describe('denumProblems', () => {
    test('maps a located entry to its zero-based line with the original line number after the message', () => {
        expect(denumProblems({
            uri: 'file:///ws/a.bbj',
            diagnostics: [{ line: 1, originalLineNumber: '0010', severity: 'ERROR', message: 'syntax error' }],
        }, 3)).toEqual([{ line: 0, severity: 'ERROR', message: 'syntax error (original line 0010)' }]);
    });
});

describe('denumProblems messages', () => {
    const params = (...entries: Array<Record<string, unknown>>) => ({ uri: 'file:///ws/a.bbj', diagnostics: entries });

    test('a located entry without an original number keeps its message alone', () => {
        expect(denumProblems(params(entry({ originalLineNumber: '' })), 3)[0].message).toBe('syntax error');
    });

    test('an entry without a location is said to have none, with or without an original number', () => {
        const problems = denumProblems(params(
            entry({ line: 0, originalLineNumber: '', severity: 'INFO', message: 'note' }),
            entry({ line: 0, originalLineNumber: '0010', severity: 'INFO', message: 'note' })
        ), 3);

        expect(problems.map(problem => problem.message)).toEqual([
            'note (no location)',
            'note (no location, original line 0010)',
        ]);
        expect(problems.map(problem => problem.line)).toEqual([0, 0]);
    });

    test('control characters and separators in the message and the original number become spaces', () => {
        const [problem] = denumProblems(params(
            entry({ message: 'a\r\nb\u2028c\u0085d', originalLineNumber: '00\u2029\u001b10' })
        ), 3);

        expect(problem.message).toBe('a  b c d (original line 00  10)');
    });

    test('the severity passes through unchanged', () => {
        const problems = denumProblems(params(
            entry({ severity: 'ERROR' }), entry({ severity: 'WARNING' }), entry({ severity: 'INFO' })
        ), 3);

        expect(problems.map(problem => problem.severity)).toEqual(['ERROR', 'WARNING', 'INFO']);
    });
});

describe('denumProblems lines and entries', () => {
    const params = (...entries: unknown[]) => ({ uri: 'file:///ws/a.bbj', diagnostics: entries });

    test('a line past the end lands on the last line and a located entry lands one line before its number', () => {
        const problems = denumProblems(params(entry({ line: 2 }), entry({ line: 3 }), entry({ line: 99 })), 3);

        expect(problems.map(problem => problem.line)).toEqual([1, 2, 2]);
    });

    test.each([[0], [-4], [Number.NaN]])('a line count of %s puts every entry on line 0', (lineCount) => {
        const problems = denumProblems(params(entry({ line: 1 }), entry({ line: 7 }), entry({ line: 0 })), lineCount);

        expect(problems.map(problem => problem.line)).toEqual([0, 0, 0]);
    });

    test('skips exactly the entries the output block skips', () => {
        const diagnostics = [
            entry({ message: 'first' }),
            null,
            'text',
            42,
            [],
            entry({ line: -1, message: 'negative line' }),
            entry({ line: 1.5, message: 'fractional line' }),
            entry({ line: '3', message: 'text line' }),
            entry({ line: Number.MAX_SAFE_INTEGER + 1, message: 'unsafe line' }),
            entry({ severity: 'FATAL', message: 'unknown severity' }),
            entry({ severity: 'error', message: 'lower-case severity' }),
            entry({ message: 42 }),
            entry({ message: undefined }),
            entry({ line: 2, message: 'second' }),
        ];

        const problems = denumProblems(params(...diagnostics), 5);
        const blockLines = formatDenumDiagnosticsBlock(params(...diagnostics)).slice(1);

        expect(problems.map(problem => problem.message)).toEqual([
            'first (original line 0010)',
            'second (original line 0010)',
        ]);
        expect(blockLines).toHaveLength(problems.length);
    });

    test('keeps the payload order, equal lines included', () => {
        const problems = denumProblems(params(
            entry({ line: 5, message: 'a' }),
            entry({ line: 2, message: 'b' }),
            entry({ line: 5, message: 'c' })
        ), 9);

        expect(problems.map(problem => [problem.line, problem.message.split(' ')[0]])).toEqual([[4, 'a'], [1, 'b'], [4, 'c']]);
    });

    test('keeps at most 500 entries, the first 500, and one last problem counts the rest', () => {
        const entries = Array.from({ length: 501 }, (_, index) => entry({ message: `m${index}` }));

        const problems = denumProblems(params(...entries), 3);

        expect(problems).toHaveLength(501);
        expect(problems[0].message.startsWith('m0 ')).toBe(true);
        expect(problems[499].message.startsWith('m499 ')).toBe(true);
        expect(problems[500]).toEqual({
            line: 0,
            severity: 'INFO',
            message: '1 more diagnostic not shown here, see the BBj output'
        });
    });

    test('the count of left-out entries ignores invalid entries and a list within the bound gets no such problem', () => {
        const valid = Array.from({ length: 502 }, (_, index) => entry({ message: `m${index}` }));
        const invalid = [null, entry({ line: -1 })];

        const over = denumProblems(params(...valid.slice(0, 250), ...invalid, ...valid.slice(250)), 3);
        const within = denumProblems(params(...valid.slice(0, 500), ...invalid), 3);

        expect(over).toHaveLength(501);
        expect(over[500].message).toBe('2 more diagnostics not shown here, see the BBj output');
        expect(within).toHaveLength(500);
        expect(within.some(problem => problem.message.includes('not shown here'))).toBe(false);
    });

    test.each([
        ['null', null],
        ['a number', 42],
        ['a string', 'text'],
        ['an array', []],
        ['an empty object', {}],
        ['diagnostics that are not a list', { uri: 'file:///ws/a.bbj', diagnostics: 'x' }],
    ])('%s gives no problem and does not throw', (_name, payload) => {
        expect(denumProblems(payload, 3)).toEqual([]);
    });
});
