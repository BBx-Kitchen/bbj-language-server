import { describe, expect, test } from 'vitest';
import { denumPayloadUri, denumProblems, formatDenumDiagnosticsBlock } from '../src/denum-diagnostics-output.js';

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
});

describe('denumProblems', () => {
    test('maps a located entry to its zero-based line with the original line number after the message', () => {
        expect(denumProblems({
            uri: 'file:///ws/a.bbj',
            diagnostics: [{ line: 1, originalLineNumber: '0010', severity: 'ERROR', message: 'syntax error' }],
        }, 3)).toEqual([{ line: 0, severity: 'ERROR', message: 'syntax error (original line 0010)' }]);
    });
});
