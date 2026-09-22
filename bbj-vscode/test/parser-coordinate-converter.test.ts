import { describe, expect, test } from 'vitest';
import { parseErrorToRange, parseErrorsToDiagnostics } from '../src/language/bbj-parser-service.js';
import type { ParseError } from '../src/language/java-interop.js';
import { END_OF_LINE_CHARACTER, LSP_MAX_UINTEGER } from '../src/language/lsp-position.js';

/**
 * A plain Vitest suite over the two exported conversion functions — no Langium services, no
 * document build, no timers, no socket. Every fixture is an inline string literal; each fixture's
 * line count is derived from its own literal (split on the newline character) rather than
 * hard-coded, so a later edit to a fixture cannot silently invalidate its expectation.
 *
 * The fixture programs are invented, minimal BBj text with a deliberate syntax error — never a
 * corpus file — and are kept inline rather than placed alongside the auto-parsed fixture corpus,
 * which requires every file it holds to produce zero lexer/parser errors.
 */
function lineCountOf(text: string): number {
    return text.split('\n').length;
}

describe('parseErrorToRange: the four document shapes a live BBj parser reports against', () => {
    test('a colon-continued statement anchors to the first physical line of the joined statement, not the continuation line', () => {
        const text = 'rem comment line 1\nprint "a",\n:"b\nrem line 4\n';
        const error: ParseError = {
            categories: ['SyntaxError'],
            message: 'probe.src: (2): syntax error',
            editorStartLine: 2,
            editorEndLine: 2,
            startCharacter: 1,
            endCharacter: 12,
        };

        const range = parseErrorToRange(error, lineCountOf(text));

        expect(range.start.line).toBe(1);
        expect(range.end.line).toBe(1);
        expect(range.start.character).toBe(0);
        expect(range.end.character).toBe(END_OF_LINE_CHARACTER);
    });

    test("a program carrying the user's own line numbers reports the physical editor line, and the number text shifts nothing", () => {
        const text = '10 rem first\n20 print "unterminated\n30 rem third\n';
        const error: ParseError = {
            categories: ['SyntaxError'],
            message: 'probe.src: (2): syntax error',
            editorStartLine: 2,
            editorEndLine: 2,
            startCharacter: 1,
            endCharacter: 24,
        };

        const range = parseErrorToRange(error, lineCountOf(text));

        expect(range.start.line).toBe(1);
        expect(range.end.line).toBe(1);
        expect(range.start.character).toBe(0);
        expect(range.end.character).toBe(END_OF_LINE_CHARACTER);
    });

    test('a CRLF document produces an identical converted range to the same document with LF endings, field for field', () => {
        const crlfText = 'rem comment line 1\r\nprint "a",\r\n:"b\r\nrem line 4\r\n';
        const lfText = 'rem comment line 1\nprint "a",\n:"b\nrem line 4\n';
        const error: ParseError = {
            categories: ['SyntaxError'],
            message: 'probe.src: (2): syntax error',
            editorStartLine: 2,
            editorEndLine: 2,
            startCharacter: 1,
            endCharacter: 12,
        };

        const crlfRange = parseErrorToRange(error, lineCountOf(crlfText));
        const lfRange = parseErrorToRange(error, lineCountOf(lfText));

        expect(crlfRange).toEqual(lfRange);
        expect(crlfRange.start.line).toBe(1);
        expect(crlfRange.start.character).toBe(0);
        expect(crlfRange.end.character).toBe(END_OF_LINE_CHARACTER);
    });

    test('an error on the last line of a document whose final line has no trailing newline lands on that line, not past the document', () => {
        const text = 'rem comment line 1\nprint "unterminated';
        const error: ParseError = {
            categories: ['SyntaxError'],
            message: 'probe.src: (2): syntax error',
            editorStartLine: 2,
            editorEndLine: 2,
            startCharacter: 1,
            endCharacter: 19,
        };

        const range = parseErrorToRange(error, lineCountOf(text));

        expect(range.start.line).toBe(1);
        expect(range.end.line).toBe(1);
        expect(range.start.character).toBe(0);
        expect(range.end.character).toBe(END_OF_LINE_CHARACTER);
        expect(range.end.line).toBeLessThan(lineCountOf(text));
    });
});

describe('parseErrorToRange: an out-of-range or collapsed input is clamped, never dropped', () => {
    // A four-line document, deliberately with no trailing newline, so its own derived line count
    // is exactly 4 and the "last line" clamp below has an unambiguous zero-based target.
    const fourLineText = 'rem line one\nrem line two\nrem line three\nrem line four';

    test('a reported line far beyond the document clamps to the last line and the diagnostic still exists', () => {
        const error: ParseError = {
            categories: ['SyntaxError'],
            message: 'a line number past the end of the document',
            editorStartLine: 99,
            editorEndLine: 99,
            startCharacter: 1,
            endCharacter: 2,
        };

        const range = parseErrorToRange(error, lineCountOf(fourLineText));

        expect(range.start.line).toBe(3);
        expect(range.end.line).toBe(3);
    });

    test('a reported line of zero or negative clamps to the first line', () => {
        const zeroLine: ParseError = {
            categories: ['SyntaxError'],
            message: 'reported line zero',
            editorStartLine: 0,
            editorEndLine: 0,
            startCharacter: 1,
            endCharacter: 2,
        };
        const negativeLine: ParseError = {
            categories: ['SyntaxError'],
            message: 'a negative reported line',
            editorStartLine: -5,
            editorEndLine: -5,
            startCharacter: 1,
            endCharacter: 2,
        };

        expect(parseErrorToRange(zeroLine, lineCountOf(fourLineText)).start.line).toBe(0);
        expect(parseErrorToRange(negativeLine, lineCountOf(fourLineText)).start.line).toBe(0);
    });

    test('an end character at or below the start character spans the whole clamped line, starting at character 0', () => {
        const equalBounds: ParseError = {
            categories: ['SyntaxError'],
            message: 'end character equal to start character',
            editorStartLine: 2,
            editorEndLine: 2,
            startCharacter: 5,
            endCharacter: 5,
        };
        const endBelowStart: ParseError = {
            categories: ['SyntaxError'],
            message: 'end character below start character',
            editorStartLine: 2,
            editorEndLine: 2,
            startCharacter: 8,
            endCharacter: 3,
        };

        for (const error of [equalBounds, endBelowStart]) {
            const range = parseErrorToRange(error, lineCountOf(fourLineText));
            expect(range.start.character).toBe(0);
            expect(range.end.character).toBe(END_OF_LINE_CHARACTER);
        }
    });

    test('a start character of zero spans the whole clamped line', () => {
        const error: ParseError = {
            categories: ['SyntaxError'],
            message: 'start character zero',
            editorStartLine: 2,
            editorEndLine: 2,
            startCharacter: 0,
            endCharacter: 40,
        };

        const range = parseErrorToRange(error, lineCountOf(fourLineText));

        expect(range.start.character).toBe(0);
        expect(range.end.character).toBe(END_OF_LINE_CHARACTER);
    });

    test('every produced range stays within the LSP unsigned-integer bounds and never goes negative', () => {
        const extremeCases: ParseError[] = [
            {
                categories: [],
                message: 'a line far beyond any reasonable document',
                editorStartLine: 999999,
                editorEndLine: 999999,
                startCharacter: 1,
                endCharacter: 2,
            },
            {
                categories: [],
                message: 'a deeply negative line and character',
                editorStartLine: -999999,
                editorEndLine: -999999,
                startCharacter: -10,
                endCharacter: -5,
            },
            {
                categories: [],
                message: 'an end character far past any real line length',
                editorStartLine: 1,
                editorEndLine: 1,
                startCharacter: 1,
                endCharacter: 999999999,
            },
        ];

        for (const error of extremeCases) {
            const range = parseErrorToRange(error, lineCountOf(fourLineText));
            expect(range.start.line).toBeGreaterThanOrEqual(0);
            expect(range.end.line).toBeGreaterThanOrEqual(0);
            expect(range.start.character).toBeGreaterThanOrEqual(0);
            expect(range.end.character).toBeGreaterThanOrEqual(0);
            expect(range.start.line).toBeLessThanOrEqual(LSP_MAX_UINTEGER);
            expect(range.end.line).toBeLessThanOrEqual(LSP_MAX_UINTEGER);
            expect(range.start.character).toBeLessThanOrEqual(LSP_MAX_UINTEGER);
            expect(range.end.character).toBeLessThanOrEqual(LSP_MAX_UINTEGER);
        }
    });

    test('an end line reported before the start line clamps up to the start line, never producing an inverted range', () => {
        const error: ParseError = {
            categories: ['SyntaxError'],
            message: 'end line before start line',
            editorStartLine: 5,
            editorEndLine: 2,
            startCharacter: 1,
            endCharacter: 2,
        };

        const range = parseErrorToRange(error, lineCountOf(fourLineText) + 10);

        expect(range.start.line).toBe(4);
        expect(range.end.line).toBe(4);
        expect(range.end.line).toBeGreaterThanOrEqual(range.start.line);
    });

    test('the converter carries no state between calls: two calls with different line counts in one test both convert correctly', () => {
        const inAShortDocument: ParseError = {
            categories: [],
            message: 'reported on line 10 of a 3-line document',
            editorStartLine: 10,
            editorEndLine: 10,
            startCharacter: 1,
            endCharacter: 2,
        };
        const inALongDocument: ParseError = {
            categories: [],
            message: 'reported on line 10 of a 100-line document',
            editorStartLine: 10,
            editorEndLine: 10,
            startCharacter: 1,
            endCharacter: 2,
        };

        const shortDocumentRange = parseErrorToRange(inAShortDocument, 3);
        const longDocumentRange = parseErrorToRange(inALongDocument, 100);

        // Clamped to the short document's last line (zero-based).
        expect(shortDocumentRange.start.line).toBe(2);
        // Well within the long document, so the reported line converts unclamped (zero-based).
        expect(longDocumentRange.start.line).toBe(9);
    });
});

describe('parseErrorsToDiagnostics: count, order, and message pass-through', () => {
    test('an empty error list converts to zero diagnostics', () => {
        expect(parseErrorsToDiagnostics([], 10, 20)).toHaveLength(0);
    });

    test('a single-element list converts to exactly one diagnostic', () => {
        const error: ParseError = {
            categories: ['SyntaxError'],
            message: 'the only error',
            editorStartLine: 1,
            editorEndLine: 1,
            startCharacter: 1,
            endCharacter: 2,
        };

        expect(parseErrorsToDiagnostics([error], 10, 20)).toHaveLength(1);
    });

    test('a three-element list keeps the input order', () => {
        const errors: ParseError[] = [
            { categories: [], message: 'first', editorStartLine: 1, editorEndLine: 1, startCharacter: 1, endCharacter: 2 },
            { categories: [], message: 'second', editorStartLine: 2, editorEndLine: 2, startCharacter: 1, endCharacter: 2 },
            { categories: [], message: 'third', editorStartLine: 3, editorEndLine: 3, startCharacter: 1, endCharacter: 2 },
        ];

        const diagnostics = parseErrorsToDiagnostics(errors, 10, 20);

        expect(diagnostics.map(d => d.message)).toEqual(['first', 'second', 'third']);
    });

    test("the message field is the record's own text, character for character, including punctuation and a path prefix", () => {
        const error: ParseError = {
            categories: ['SyntaxError'],
            message: 'probe.src: (2): syntax error, unexpected token ":"',
            editorStartLine: 2,
            editorEndLine: 2,
            startCharacter: 1,
            endCharacter: 2,
        };

        const [diagnostic] = parseErrorsToDiagnostics([error], 10, 20);

        expect(diagnostic.message).toBe('probe.src: (2): syntax error, unexpected token ":"');
    });
});
