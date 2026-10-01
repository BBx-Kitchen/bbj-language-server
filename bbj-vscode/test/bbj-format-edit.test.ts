import { describe, expect, test } from 'vitest';
import type { TextEdit } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { minimalLineEdit, rangeFormatEdits } from '../src/language/bbj-format-edit.js';

function doc(text: string): TextDocument {
    return TextDocument.create('file:///format-edit.bbj', 'bbj', 1, text);
}

/** The edit for formatting a whole document from `oldText` to `newText`. */
function wholeDocumentEdits(oldText: string, newText: string): { document: TextDocument; edits: TextEdit[] } {
    const document = doc(oldText);
    return { document, edits: minimalLineEdit(document, 0, oldText.length, newText) };
}

function apply(oldText: string, newText: string): string {
    const { document, edits } = wholeDocumentEdits(oldText, newText);
    return TextDocument.applyEdits(document, edits);
}

/** A small deterministic generator, so a failing case can be replayed from its seed. */
function mulberry32(seed: number): () => number {
    let state = seed >>> 0;
    return () => {
        state = (state + 0x6D2B79F5) >>> 0;
        let t = state;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

describe('minimalLineEdit', () => {
    test.each([
        ['LF', 'a\nb\nc\n'],
        ['CRLF', 'a\r\nb\r\nc\r\n'],
        ['lone CR', 'a\rb\rc\r']
    ])('equal text gives no edit for a %s document', (_name, text) => {
        const document = doc(text);
        expect(minimalLineEdit(document, 0, text.length, text)).toEqual([]);
    });

    test('a changed middle line yields one edit covering only that line', () => {
        const { edits } = wholeDocumentEdits('a\nb\nc\n', 'a\nB\nc\n');
        expect(edits).toEqual([{
            range: { start: { line: 1, character: 0 }, end: { line: 2, character: 0 } },
            newText: 'B\n'
        }]);
    });

    test('inserting a line round-trips and adds only that line', () => {
        const { document, edits } = wholeDocumentEdits('a\nc\n', 'a\nb\nc\n');
        expect(edits).toHaveLength(1);
        expect(edits[0].newText).toBe('b\n');
        expect(edits[0].range.start).toEqual(edits[0].range.end);
        expect(TextDocument.applyEdits(document, edits)).toBe('a\nb\nc\n');
    });

    test('deleting a line round-trips and removes only that line', () => {
        const { document, edits } = wholeDocumentEdits('a\nb\nc\n', 'a\nc\n');
        expect(edits).toHaveLength(1);
        expect(edits[0].newText).toBe('');
        expect(TextDocument.applyEdits(document, edits)).toBe('a\nc\n');
    });

    test('replacing every line round-trips', () => {
        const { document, edits } = wholeDocumentEdits('a\nb\nc\n', 'x\ny\nz\n');
        expect(edits).toHaveLength(1);
        expect(TextDocument.applyEdits(document, edits)).toBe('x\ny\nz\n');
    });

    test('a document without a trailing line break ends the edit at the document end', () => {
        const { document, edits } = wholeDocumentEdits('a\nb', 'a\nB');
        expect(edits).toHaveLength(1);
        expect(edits[0].range.end).toEqual(document.positionAt(document.getText().length));
        expect(TextDocument.applyEdits(document, edits)).toBe('a\nB');
    });

    test('adding a trailing line break round-trips', () => {
        expect(apply('a\nb', 'a\nb\n')).toBe('a\nb\n');
        expect(apply('a\nb\n', 'a\nb')).toBe('a\nb');
    });

    test('changing only the terminator of the first line is an edit covering that line only', () => {
        const { document, edits } = wholeDocumentEdits('a\nb\n', 'a\r\nb\n');
        expect(edits).toEqual([{
            range: { start: { line: 0, character: 0 }, end: { line: 1, character: 0 } },
            newText: 'a\r\n'
        }]);
        expect(TextDocument.applyEdits(document, edits)).toBe('a\r\nb\n');
    });

    test('a lone CR document is split on its own terminators', () => {
        const { edits } = wholeDocumentEdits('a\rb\rc\r', 'a\rB\rc\r');
        expect(edits).toEqual([{
            range: { start: { line: 1, character: 0 }, end: { line: 2, character: 0 } },
            newText: 'B\r'
        }]);
    });

    test('astral characters round-trip and no boundary falls inside a surrogate pair', () => {
        const oldText = 'x😀y\nz\n';
        const newText = 'x😀y\nZ\n';
        const { document, edits } = wholeDocumentEdits(oldText, newText);
        expect(TextDocument.applyEdits(document, edits)).toBe(newText);
        for (const position of [edits[0].range.start, edits[0].range.end]) {
            const offset = document.offsetAt(position);
            const before = oldText.charCodeAt(offset - 1);
            const after = oldText.charCodeAt(offset);
            const insidePair = before >= 0xD800 && before <= 0xDBFF && after >= 0xDC00 && after <= 0xDFFF;
            expect(insidePair).toBe(false);
        }
        const changedAstral = wholeDocumentEdits('x😀y\nz\n', 'x😁y\nz\n');
        expect(TextDocument.applyEdits(changedAstral.document, changedAstral.edits)).toBe('x😁y\nz\n');
    });

    test('an edit inside a segment compares only that segment and rebases to its position', () => {
        const document = doc('one\ntwo\nthree\nfour\n');
        const start = document.offsetAt({ line: 1, character: 0 });
        const end = document.offsetAt({ line: 3, character: 0 });
        const edits = minimalLineEdit(document, start, end, 'two\nTHREE\n');
        expect(edits).toEqual([{
            range: { start: { line: 2, character: 0 }, end: { line: 3, character: 0 } },
            newText: 'THREE\n'
        }]);
        expect(minimalLineEdit(document, start, end, 'two\nthree\n')).toEqual([]);
        expect(TextDocument.applyEdits(document, edits)).toBe('one\ntwo\nTHREE\nfour\n');
    });

    test('offsets outside the document are clamped to it', () => {
        const document = doc('a\nb\n');
        const edits = minimalLineEdit(document, -5, 9999, 'a\nB\n');
        expect(TextDocument.applyEdits(document, edits)).toBe('a\nB\n');
        expect(minimalLineEdit(document, 9999, 5, '')).toEqual([]);
    });

    test('an empty document gets the whole new text', () => {
        expect(apply('', 'a\nb\n')).toBe('a\nb\n');
        expect(apply('a\nb\n', '')).toBe('');
        expect(wholeDocumentEdits('', '').edits).toEqual([]);
    });

    describe('seeded round trip', () => {
        const linePool = ['', 'a', 'PRINT 1', 'x😀y', '  indented', 'REM 😀😀', 'z'];
        const terminators = ['\n', '\r\n', '\r'];

        function randomLines(random: () => number): { lines: string[]; ends: string[] } {
            const count = Math.floor(random() * 7);
            const lines: string[] = [];
            const ends: string[] = [];
            for (let i = 0; i < count; i++) {
                lines.push(linePool[Math.floor(random() * linePool.length)]);
                ends.push(terminators[Math.floor(random() * terminators.length)]);
            }
            return { lines, ends };
        }

        function render(lines: string[], ends: string[], trailingBreak: boolean): string {
            return lines.map((line, i) => line + (i < lines.length - 1 || trailingBreak ? ends[i] : '')).join('');
        }

        function mutate(random: () => number, lines: string[], ends: string[]): { lines: string[]; ends: string[] } {
            const nextLines = [...lines];
            const nextEnds = [...ends];
            const changes = 1 + Math.floor(random() * 3);
            for (let c = 0; c < changes; c++) {
                const kind = Math.floor(random() * 4);
                const at = nextLines.length === 0 ? 0 : Math.floor(random() * nextLines.length);
                if (kind === 0 || nextLines.length === 0) {
                    nextLines.splice(at, 0, linePool[Math.floor(random() * linePool.length)]);
                    nextEnds.splice(at, 0, terminators[Math.floor(random() * terminators.length)]);
                } else if (kind === 1) {
                    nextLines.splice(at, 1);
                    nextEnds.splice(at, 1);
                } else if (kind === 2) {
                    nextLines[at] = linePool[Math.floor(random() * linePool.length)];
                } else {
                    nextEnds[at] = terminators[Math.floor(random() * terminators.length)];
                }
            }
            return { lines: nextLines, ends: nextEnds };
        }

        test('300 cases: applying the edit reproduces the new text and touches only differing lines', () => {
            const random = mulberry32(125);
            for (let i = 0; i < 300; i++) {
                const base = randomLines(random);
                const trailing = random() < 0.5;
                const changed = mutate(random, base.lines, base.ends);
                const changedTrailing = random() < 0.5 ? trailing : !trailing;
                const oldText = render(base.lines, base.ends, trailing);
                const newText = render(changed.lines, changed.ends, changedTrailing);
                const label = `case ${i}: ${JSON.stringify(oldText)} -> ${JSON.stringify(newText)}`;

                const { document, edits } = wholeDocumentEdits(oldText, newText);
                if (oldText === newText) {
                    expect(edits, label).toEqual([]);
                    continue;
                }
                expect(edits.length, label).toBeLessThanOrEqual(1);
                expect(TextDocument.applyEdits(document, edits), label).toBe(newText);
                if (edits.length === 1) {
                    const startOffset = document.offsetAt(edits[0].range.start);
                    const endOffset = document.offsetAt(edits[0].range.end);
                    expect(edits[0].range.start.character, label).toBe(0);
                    expect(endOffset, label).toBeLessThanOrEqual(oldText.length);
                    expect(oldText.slice(0, startOffset), label).toBe(newText.slice(0, startOffset));
                    expect(oldText.slice(endOffset), label).toBe(newText.slice(newText.length - (oldText.length - endOffset)));
                }
            }
        });

        test('equal inputs always give no edit', () => {
            const random = mulberry32(7);
            for (let i = 0; i < 100; i++) {
                const base = randomLines(random);
                const text = render(base.lines, base.ends, random() < 0.5);
                expect(wholeDocumentEdits(text, text).edits, JSON.stringify(text)).toEqual([]);
            }
        });
    });
});

describe('rangeFormatEdits', () => {
    test('no peer edit gives no edit', () => {
        expect(rangeFormatEdits(doc('a\nb\n'), [])).toEqual([]);
    });

    test('a peer edit that rewrites text to itself gives no edit', () => {
        const document = doc('a\nb\nc\n');
        const edits = rangeFormatEdits(document, [{
            range: { start: { line: 1, character: 0 }, end: { line: 2, character: 0 } },
            newText: 'b\n'
        }]);
        expect(edits).toEqual([]);
    });

    test('a peer edit is trimmed to the lines that differ', () => {
        const document = doc('a\nb\nc\nd\n');
        const edits = rangeFormatEdits(document, [{
            range: { start: { line: 0, character: 0 }, end: { line: 3, character: 0 } },
            newText: 'a\nB\nc\n'
        }]);
        expect(edits).toEqual([{
            range: { start: { line: 1, character: 0 }, end: { line: 2, character: 0 } },
            newText: 'B\n'
        }]);
        expect(TextDocument.applyEdits(document, edits)).toBe('a\nB\nc\nd\n');
    });

    test('a peer edit wider than the selected lines is kept at its own range', () => {
        const document = doc('IF x THEN\nPRINT 1\nFI\nend\n');
        // The user selected only line 1; the peer snapped to the whole statement on lines 0-2.
        const edits = rangeFormatEdits(document, [{
            range: { start: { line: 0, character: 0 }, end: { line: 3, character: 0 } },
            newText: 'IF x THEN\n  PRINT 1\nFI\n'
        }]);
        expect(edits).toEqual([{
            range: { start: { line: 1, character: 0 }, end: { line: 2, character: 0 } },
            newText: '  PRINT 1\n'
        }]);
        expect(TextDocument.applyEdits(document, edits)).toBe('IF x THEN\n  PRINT 1\nFI\nend\n');
    });

    test('a peer edit that changes the first and last line of its range keeps both', () => {
        const document = doc('a\nb\nc\n');
        const edits = rangeFormatEdits(document, [{
            range: { start: { line: 0, character: 0 }, end: { line: 3, character: 0 } },
            newText: 'A\nb\nC\n'
        }]);
        expect(TextDocument.applyEdits(document, edits)).toBe('A\nb\nC\n');
    });

    test('a peer edit with positions past the document end stays inside the document', () => {
        const document = doc('a\nb');
        const edits = rangeFormatEdits(document, [{
            range: { start: { line: 1, character: 0 }, end: { line: 40, character: 0 } },
            newText: 'B'
        }]);
        expect(TextDocument.applyEdits(document, edits)).toBe('a\nB');
        for (const edit of edits) {
            expect(edit.range.end).toEqual(document.positionAt(document.getText().length));
        }
    });
});
