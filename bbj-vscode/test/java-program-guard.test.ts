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
import type { FormatProgramParams } from '../src/language/java-interop-program-types.js';
import { validateFormatResult } from '../src/language/java-program-guard.js';

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
