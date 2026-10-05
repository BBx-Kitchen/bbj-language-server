/******************************************************************************
 * Copyright 2023 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

/**
 * Pins every check applied to a format/DENUM answer before it leaves the interop client: the
 * shape against the request that was sent, the echoed version, the size bounds, the range edit
 * coordinates and the sanitising of diagnostics.
 */
import { describe, expect, test } from 'vitest';
import type { DenumProgramParams, FormatProgramParams, ProgramRange } from '../src/language/java-interop-program-types.js';
import {
    allowedProgramTextLength, MAX_ORIGINAL_LINE_NUMBER_LENGTH, MAX_PROGRAM_DIAGNOSTIC_MESSAGE_LENGTH,
    MAX_PROGRAM_DIAGNOSTICS, PROGRAM_TEXT_ABSOLUTE_CAP, programLineLengths, sanitizePeerText,
    sanitizeProgramDiagnostics, validateDenumResult, validateFormatResult
} from '../src/language/java-program-guard.js';
import { TRUNCATION_MARKER } from '../src/language/java-peer-guard.js';

const DOCUMENT_TEXT = 'if a then print 1\n  x=1\nrem y\n';

function wholeRequest(overrides: Partial<FormatProgramParams> = {}): FormatProgramParams {
    return { text: DOCUMENT_TEXT, version: 'v-whole', ...overrides };
}

function wholeAnswer(overrides: Record<string, unknown> = {}): Record<string, unknown> {
    return {
        text: 'if a then print 1\n    x=1\nrem y\n',
        diagnostics: [],
        denumbered: false,
        version: 'v-whole',
        ...overrides
    };
}

describe('whole-document format answers', () => {
    test('a live-shaped answer becomes a fresh typed document result', () => {
        const raw = wholeAnswer();
        const outcome = validateFormatResult(wholeRequest(), raw);
        expect(outcome.ok).toBe(true);
        if (!outcome.ok) {
            return;
        }
        expect(outcome.value).not.toBe(raw);
        expect(Object.keys(outcome.value).sort()).toEqual(['denumbered', 'diagnostics', 'scope', 'text', 'version']);
        expect(outcome.value).toEqual({
            scope: 'document',
            text: raw.text,
            diagnostics: [],
            denumbered: false,
            version: 'v-whole'
        });
    });

    test('an answer carrying another version is refused as stale', () => {
        const outcome = validateFormatResult(wholeRequest(), wholeAnswer({ version: 'v-old' }));
        expect(outcome).toEqual({ ok: false, reason: 'version-mismatch' });
    });
});

function range(startLine: number, startCharacter: number, endLine: number, endCharacter: number): ProgramRange {
    return {
        start: { line: startLine, character: startCharacter },
        end: { line: endLine, character: endCharacter }
    };
}

function rangeRequest(requested: ProgramRange, text = DOCUMENT_TEXT): FormatProgramParams {
    return { text, version: 'v-range', range: requested };
}

function rangeAnswer(edits: unknown, overrides: Record<string, unknown> = {}): Record<string, unknown> {
    return { edits, diagnostics: [], denumbered: false, version: 'v-range', ...overrides };
}

function edit(editRange: unknown, newText: unknown = 'x\n'): Record<string, unknown> {
    return { range: editRange, newText };
}

describe('range format answers', () => {
    test('a live-shaped single edit validates to a fresh range result', () => {
        const newText = 'if a then print 1\n    x=1\n';
        const raw = rangeAnswer([edit(range(0, 0, 2, 0), newText)]);
        const outcome = validateFormatResult(rangeRequest(range(0, 0, 2, 0)), raw);
        expect(outcome.ok).toBe(true);
        if (!outcome.ok) {
            return;
        }
        expect(outcome.value).not.toBe(raw);
        expect(outcome.value).toEqual({
            scope: 'range',
            edits: [{ range: range(0, 0, 2, 0), newText }],
            diagnostics: [],
            denumbered: false,
            version: 'v-range'
        });
    });

    test('a validated edit, its range and both positions are fresh objects', () => {
        const rawEdit = edit(range(0, 0, 2, 0));
        const outcome = validateFormatResult(rangeRequest(range(0, 0, 2, 0)), rangeAnswer([rawEdit]));
        expect(outcome.ok).toBe(true);
        if (!outcome.ok || outcome.value.scope !== 'range') {
            return;
        }
        const built = outcome.value.edits[0];
        const rawRange = rawEdit.range as ProgramRange;
        expect(built).not.toBe(rawEdit);
        expect(built.range).not.toBe(rawRange);
        expect(built.range.start).not.toBe(rawRange.start);
        expect(built.range.end).not.toBe(rawRange.end);
        expect(Object.keys(built).sort()).toEqual(['newText', 'range']);
    });

    test('a text without a trailing newline validates', () => {
        const text = 'if a then print 1\n  x=1';
        const raw = rangeAnswer([edit(range(0, 0, 1, 5), 'if a then print 1\n    x=1')]);
        expect(validateFormatResult(rangeRequest(range(0, 0, 1, 5), text), raw).ok).toBe(true);
    });

    test('a request end past the document with the peer clamped answer validates', () => {
        const raw = rangeAnswer([edit(range(0, 0, 2, 0))]);
        expect(validateFormatResult(rangeRequest(range(0, 0, 99, 0)), raw).ok).toBe(true);
    });

    test.each([
        ['CRLF', 'a=1\r\nb=2\r\n'],
        ['lone CR', 'a=1\rb=2\r']
    ])('%s text keeps its terminators in the edit', (_name, text) => {
        const raw = rangeAnswer([edit(range(0, 0, 2, 0), text)]);
        const outcome = validateFormatResult(rangeRequest(range(0, 0, 2, 0), text), raw);
        expect(outcome.ok).toBe(true);
        if (outcome.ok && outcome.value.scope === 'range') {
            expect(outcome.value.edits[0].newText).toBe(text);
        }
    });

    test('an empty edits array is an unchanged range', () => {
        const outcome = validateFormatResult(rangeRequest(range(0, 0, 2, 0)), rangeAnswer([]));
        expect(outcome.ok).toBe(true);
        if (outcome.ok && outcome.value.scope === 'range') {
            expect(outcome.value.edits).toEqual([]);
        }
    });

    test('a zero-width request expanded to the whole statement validates', () => {
        const raw = rangeAnswer([edit(range(0, 0, 2, 0))]);
        expect(validateFormatResult(rangeRequest(range(1, 2, 1, 2)), raw).ok).toBe(true);
    });

    describe('refusals', () => {
        const request = rangeRequest(range(0, 0, 2, 0));

        test('text on a range answer', () => {
            const raw = rangeAnswer([], { text: 'x' });
            expect(validateFormatResult(request, raw)).toEqual({ ok: false, reason: 'text-on-range-request' });
        });

        test.each([
            ['missing', undefined],
            ['null', null],
            ['an object', {}],
            ['a string', 'edit']
        ])('edits %s', (_name, edits) => {
            const raw = rangeAnswer(edits);
            expect(validateFormatResult(request, raw)).toEqual({ ok: false, reason: 'edits-not-array' });
        });

        test('two edits', () => {
            const raw = rangeAnswer([edit(range(0, 0, 1, 0)), edit(range(1, 0, 2, 0))]);
            expect(validateFormatResult(request, raw)).toEqual({ ok: false, reason: 'too-many-edits' });
        });

        test.each([
            ['the edit is a string', 'edit'],
            ['the edit is null', null],
            ['the range is missing', { newText: 'x' }],
            ['the range is a string', edit('range')],
            ['start is missing', edit({ end: { line: 1, character: 0 } })],
            ['end is a number', edit({ start: { line: 0, character: 0 }, end: 3 })]
        ])('%s', (_name, badEdit) => {
            const raw = rangeAnswer([badEdit]);
            expect(validateFormatResult(request, raw)).toEqual({ ok: false, reason: 'edit-malformed' });
        });

        test.each([
            ['a negative line', range(-1, 0, 1, 0)],
            ['a negative character', range(0, -1, 1, 0)],
            ['a fractional line', range(0, 0, 1.5, 0)],
            ['a string character', { start: { line: 0, character: '0' }, end: { line: 1, character: 0 } }],
            ['NaN', range(0, 0, Number.NaN, 0)]
        ])('%s', (_name, badRange) => {
            const raw = rangeAnswer([edit(badRange)]);
            expect(validateFormatResult(request, raw)).toEqual({ ok: false, reason: 'edit-position-invalid' });
        });

        test.each([
            ['start line after end line', range(2, 0, 1, 0)],
            ['start character after end character', range(1, 3, 1, 1)]
        ])('%s', (_name, inverted) => {
            const raw = rangeAnswer([edit(inverted)]);
            expect(validateFormatResult(request, raw)).toEqual({ ok: false, reason: 'edit-inverted' });
        });

        test.each([
            ['a line past the last line', range(0, 0, 4, 0)],
            ['a character past the line length', range(0, 0, 1, 99)],
            ['a start past the last line', range(5, 0, 5, 0)]
        ])('%s', (_name, outside) => {
            const raw = rangeAnswer([edit(outside)]);
            expect(validateFormatResult(request, raw)).toEqual({ ok: false, reason: 'edit-outside-document' });
        });

        test('an edit that does not touch the requested lines', () => {
            const raw = rangeAnswer([edit(range(2, 0, 2, 5))]);
            expect(validateFormatResult(rangeRequest(range(0, 0, 0, 4)), raw))
                .toEqual({ ok: false, reason: 'edit-not-overlapping' });
        });

        test('an end at character 0 does not count the line it ends on', () => {
            const raw = rangeAnswer([edit(range(2, 0, 2, 3))]);
            expect(validateFormatResult(rangeRequest(range(0, 0, 2, 0)), raw))
                .toEqual({ ok: false, reason: 'edit-not-overlapping' });
        });

        test('a newText that is not a string', () => {
            const raw = rangeAnswer([edit(range(0, 0, 1, 0), 42)]);
            expect(validateFormatResult(request, raw)).toEqual({ ok: false, reason: 'new-text-not-string' });
        });

        test('a newText above the allowed length', () => {
            const tooLong = 'x'.repeat(allowedProgramTextLength(DOCUMENT_TEXT) + 1);
            const raw = rangeAnswer([edit(range(0, 0, 1, 0), tooLong)]);
            expect(validateFormatResult(request, raw)).toEqual({ ok: false, reason: 'new-text-too-large' });
        });

        test('a stale version', () => {
            const raw = rangeAnswer([], { version: 'v-old' });
            expect(validateFormatResult(request, raw)).toEqual({ ok: false, reason: 'version-mismatch' });
        });
    });
});

const NUMBERED_TEXT = '0010 print 1\n0020 goto 0010\n';

function denumRequest(overrides: Partial<DenumProgramParams> = {}): DenumProgramParams {
    return { text: NUMBERED_TEXT, version: 'v-denum', ...overrides };
}

function denumAnswer(overrides: Record<string, unknown> = {}): Record<string, unknown> {
    return {
        text: 'L10: print 1\ngoto L10\n',
        diagnostics: [],
        denumbered: true,
        version: 'v-denum',
        ...overrides
    };
}

describe('DENUM answers', () => {
    test('a live-shaped answer becomes a fresh typed result', () => {
        const raw = denumAnswer();
        const outcome = validateDenumResult(denumRequest(), raw);
        expect(outcome.ok).toBe(true);
        if (!outcome.ok) {
            return;
        }
        expect(outcome.value).not.toBe(raw);
        expect(Object.keys(outcome.value).sort()).toEqual(['denumbered', 'diagnostics', 'text', 'version']);
        expect(outcome.value).toEqual({
            text: 'L10: print 1\ngoto L10\n',
            diagnostics: [],
            denumbered: true,
            version: 'v-denum'
        });
    });

    test('an unnumbered program comes back unchanged and not denumbered', () => {
        const request = denumRequest({ text: 'print 1\n' });
        const raw = denumAnswer({ text: 'print 1\n', denumbered: false });
        const outcome = validateDenumResult(request, raw);
        expect(outcome.ok).toBe(true);
        if (outcome.ok) {
            expect(outcome.value).not.toBe(raw);
            expect(outcome.value.denumbered).toBe(false);
            expect(outcome.value.text).toBe('print 1\n');
        }
    });

    test('a syntax-error diagnostic from a numbered source is kept', () => {
        const diagnostic = { line: 1, originalLineNumber: '0010', severity: 'ERROR', message: 'syntax error' };
        const outcome = validateDenumResult(denumRequest(), denumAnswer({ diagnostics: [diagnostic] }));
        expect(outcome.ok).toBe(true);
        if (outcome.ok) {
            expect(outcome.value.diagnostics).toEqual([diagnostic]);
            expect(outcome.value.diagnostics[0]).not.toBe(diagnostic);
        }
    });

    test('a missing text', () => {
        const raw = denumAnswer({ text: undefined });
        expect(validateDenumResult(denumRequest(), raw)).toEqual({ ok: false, reason: 'text-not-string' });
    });

    test.each([
        ['missing', undefined],
        ['null', null],
        ['the string true', 'true']
    ])('denumbered %s', (_name, denumbered) => {
        const raw = denumAnswer({ denumbered });
        expect(validateDenumResult(denumRequest(), raw)).toEqual({ ok: false, reason: 'denumbered-not-boolean' });
    });

    test('a version mismatch', () => {
        const raw = denumAnswer({ version: 'v-other' });
        expect(validateDenumResult(denumRequest(), raw)).toEqual({ ok: false, reason: 'version-mismatch' });
    });

    test.each([
        ['null', null],
        ['an array', []],
        ['a string', 'text']
    ])('a raw answer that is %s', (_name, raw) => {
        expect(validateDenumResult(denumRequest(), raw)).toEqual({ ok: false, reason: 'not-an-object' });
    });

    test('a text above the cap', () => {
        const raw = denumAnswer({ text: 'x'.repeat(allowedProgramTextLength(NUMBERED_TEXT) + 1) });
        expect(validateDenumResult(denumRequest(), raw)).toEqual({ ok: false, reason: 'text-too-large' });
    });
});

describe('whole-document refusals', () => {
    test('both text and edits', () => {
        const raw = wholeAnswer({ edits: [] });
        expect(validateFormatResult(wholeRequest(), raw)).toEqual({ ok: false, reason: 'edits-on-document-request' });
    });

    test('neither text nor edits', () => {
        const raw = wholeAnswer({ text: undefined });
        expect(validateFormatResult(wholeRequest(), raw)).toEqual({ ok: false, reason: 'text-not-string' });
    });

    test('a text that is a number', () => {
        const raw = wholeAnswer({ text: 42 });
        expect(validateFormatResult(wholeRequest(), raw)).toEqual({ ok: false, reason: 'text-not-string' });
    });

    test('a denumbered flag that is not a boolean', () => {
        const raw = wholeAnswer({ denumbered: 'yes' });
        expect(validateFormatResult(wholeRequest(), raw)).toEqual({ ok: false, reason: 'denumbered-not-boolean' });
    });

    test('a version echoed as a number is not the string that was sent', () => {
        const raw = wholeAnswer({ version: 12 });
        expect(validateFormatResult(wholeRequest({ version: '12' }), raw)).toEqual({ ok: false, reason: 'version-mismatch' });
    });

    test('an absent denumbered flag reads as false', () => {
        const raw = wholeAnswer({ denumbered: undefined });
        const outcome = validateFormatResult(wholeRequest(), raw);
        expect(outcome.ok).toBe(true);
        if (outcome.ok) {
            expect(outcome.value.denumbered).toBe(false);
        }
    });

    test('a diagnostics value that is not an array refuses the answer', () => {
        const raw = wholeAnswer({ diagnostics: {} });
        expect(validateFormatResult(wholeRequest(), raw)).toEqual({ ok: false, reason: 'diagnostics-not-array' });
    });
});

describe('text size caps', () => {
    test('a short request allows its text four times over plus 64 KiB', () => {
        expect(allowedProgramTextLength('abc')).toBe(65548);
        const request = wholeRequest({ text: 'abc' });
        expect(validateFormatResult(request, wholeAnswer({ text: 'x'.repeat(65548) })).ok).toBe(true);
        expect(validateFormatResult(request, wholeAnswer({ text: 'x'.repeat(65549) })))
            .toEqual({ ok: false, reason: 'text-too-large' });
    });

    test('a long request is held to the absolute cap', () => {
        const requestText = 'y'.repeat(4_200_000);
        expect(allowedProgramTextLength(requestText)).toBe(PROGRAM_TEXT_ABSOLUTE_CAP);
        const request = denumRequest({ text: requestText });
        const atCap = denumAnswer({ text: 'x'.repeat(PROGRAM_TEXT_ABSOLUTE_CAP) });
        const overCap = denumAnswer({ text: 'x'.repeat(PROGRAM_TEXT_ABSOLUTE_CAP + 1) });
        expect(validateDenumResult(request, atCap).ok).toBe(true);
        expect(validateDenumResult(request, overCap)).toEqual({ ok: false, reason: 'text-too-large' });
    });
});

describe('line model', () => {
    test.each([
        ['', [0]],
        ['a\n', [1, 0]],
        ['ab\r\ncd', [2, 2]],
        ['ab\rcd\r', [2, 2, 0]],
        ['a\n\nb', [1, 0, 1]]
    ])('%j has line lengths %j', (text, expected) => {
        expect(programLineLengths(text)).toEqual(expected);
    });
});

describe('diagnostics sanitising', () => {
    function diagnostic(overrides: Record<string, unknown> = {}): Record<string, unknown> {
        return { line: 1, originalLineNumber: '0010', severity: 'ERROR', message: 'syntax error', ...overrides };
    }

    test.each([
        ['absent', undefined],
        ['null', null]
    ])('%s diagnostics are none', (_name, raw) => {
        expect(sanitizeProgramDiagnostics(raw, 3)).toEqual({ ok: true, value: [] });
    });

    test('an object instead of an array', () => {
        expect(sanitizeProgramDiagnostics({}, 3)).toEqual({ ok: false, reason: 'diagnostics-not-array' });
    });

    test('600 valid entries keep exactly the first 500', () => {
        const raw = Array.from({ length: 600 }, (_unused, index) => diagnostic({ message: `m${index}` }));
        const outcome = sanitizeProgramDiagnostics(raw, 3);
        expect(outcome.ok).toBe(true);
        if (outcome.ok) {
            expect(outcome.value).toHaveLength(MAX_PROGRAM_DIAGNOSTICS);
            expect(outcome.value[0].message).toBe('m0');
            expect(outcome.value[MAX_PROGRAM_DIAGNOSTICS - 1].message).toBe('m499');
        }
    });

    test('line 0 means no location and is kept as 0', () => {
        const outcome = sanitizeProgramDiagnostics([diagnostic({ line: 0 })], 3);
        expect(outcome.ok && outcome.value[0].line).toBe(0);
    });

    test('an entry with an unusable line is dropped while its neighbours stay in order', () => {
        const lineCount = 3;
        for (const badLine of [-1, 1.5, '3', lineCount + 1]) {
            const raw = [diagnostic({ message: 'first' }), diagnostic({ line: badLine }), diagnostic({ message: 'last' })];
            const outcome = sanitizeProgramDiagnostics(raw, lineCount);
            expect(outcome.ok && outcome.value.map(entry => entry.message)).toEqual(['first', 'last']);
        }
    });

    test('an entry with an unknown severity is dropped', () => {
        const outcome = sanitizeProgramDiagnostics([diagnostic({ severity: 'FATAL' }), diagnostic()], 3);
        expect(outcome.ok && outcome.value).toHaveLength(1);
    });

    test('an entry without a string message or that is not an object is dropped', () => {
        const outcome = sanitizeProgramDiagnostics([diagnostic({ message: 5 }), 'text', null, diagnostic()], 3);
        expect(outcome.ok && outcome.value).toHaveLength(1);
    });

    test('a non-string original line number becomes an empty string', () => {
        const outcome = sanitizeProgramDiagnostics([diagnostic({ originalLineNumber: 10 })], 3);
        expect(outcome.ok && outcome.value[0].originalLineNumber).toBe('');
    });

    test('a 40-character original line number is cut to 32 ending with the marker', () => {
        const outcome = sanitizeProgramDiagnostics([diagnostic({ originalLineNumber: '9'.repeat(40) })], 3);
        expect(outcome.ok).toBe(true);
        if (outcome.ok) {
            const value = outcome.value[0].originalLineNumber;
            expect(value).toHaveLength(MAX_ORIGINAL_LINE_NUMBER_LENGTH);
            expect(value.endsWith(TRUNCATION_MARKER)).toBe(true);
        }
    });

    test('control, bidi and line-separator characters never survive in a message', () => {
        const at = (code: number): string => String.fromCharCode(code);
        const message = 'a' + at(0x00) + 'b' + at(0x1B) + 'c' + at(0x85) + 'd' + at(0x202E) + 'e' + at(0x2066)
            + 'f' + at(0x2028) + 'g' + at(0x0D) + 'h' + at(0x0A) + 'i' + at(0x09) + 'j';
        expect(sanitizePeerText(message, MAX_PROGRAM_DIAGNOSTIC_MESSAGE_LENGTH)).toBe('abc def g h i j');
        const outcome = sanitizeProgramDiagnostics([diagnostic({ message })], 3);
        expect(outcome.ok && outcome.value[0].message).toBe('abc def g h i j');
    });

    test.each([
        ['the zero-width and joiner characters', [0x200B, 0x200C, 0x200D]],
        ['the left-to-right and right-to-left marks', [0x200E, 0x200F]],
        ['the Arabic letter mark', [0x061C]],
        ['the word joiner and the invisible operators', [0x2060, 0x2061, 0x2062, 0x2063, 0x2064]],
        ['the deprecated format controls', [0x206A, 0x206B, 0x206C, 0x206D, 0x206E, 0x206F]],
        ['the byte order mark', [0xFEFF]],
        ['the bidi embeddings, overrides and isolates', [0x202A, 0x202B, 0x202C, 0x202D, 0x202E, 0x2066, 0x2067, 0x2068, 0x2069]]
    ])('%s are removed from a message and leave the visible text intact', (_name, codes) => {
        const message = codes.map(code => 'a' + String.fromCharCode(code)).join('') + 'z';
        const expected = 'a'.repeat(codes.length) + 'z';
        expect(sanitizePeerText(message, MAX_PROGRAM_DIAGNOSTIC_MESSAGE_LENGTH)).toBe(expected);
        const outcome = sanitizeProgramDiagnostics([diagnostic({ message })], 3);
        expect(outcome.ok && outcome.value[0].message).toBe(expected);
    });

    test('the characters next to the stripped ranges survive', () => {
        const kept = [0x00A0, 0x061B, 0x061D, 0x200A, 0x2010, 0x2049, 0x205F, 0x2070, 0xFEFE, 0xFF00, 0x4E2D];
        const text = kept.map(code => String.fromCharCode(code)).join('');
        expect(sanitizePeerText(text, MAX_PROGRAM_DIAGNOSTIC_MESSAGE_LENGTH)).toBe(text);
    });

    test('a 5000-character message is cut to 1024 ending with the marker', () => {
        const outcome = sanitizeProgramDiagnostics([diagnostic({ message: 'm'.repeat(5000) })], 3);
        expect(outcome.ok).toBe(true);
        if (outcome.ok) {
            const message = outcome.value[0].message;
            expect(message).toHaveLength(MAX_PROGRAM_DIAGNOSTIC_MESSAGE_LENGTH);
            expect(message.endsWith(TRUNCATION_MARKER)).toBe(true);
        }
    });

    test('a __proto__ key in parsed JSON adds no key and pollutes nothing', () => {
        const parsed: unknown = JSON.parse(
            '[{"line":1,"originalLineNumber":"0010","severity":"ERROR","message":"m","__proto__":{"polluted":true}}]'
        );
        const outcome = validateDenumResult(denumRequest(), denumAnswer({ diagnostics: parsed }));
        expect(outcome.ok).toBe(true);
        if (outcome.ok) {
            expect(Object.keys(outcome.value.diagnostics[0]).sort())
                .toEqual(['line', 'message', 'originalLineNumber', 'severity']);
        }
        expect(({} as Record<string, unknown>).polluted).toBeUndefined();
    });
});
