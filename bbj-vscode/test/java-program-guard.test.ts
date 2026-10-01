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
import type { FormatProgramParams, ProgramRange } from '../src/language/java-interop-program-types.js';
import { allowedProgramTextLength, validateFormatResult } from '../src/language/java-program-guard.js';

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
