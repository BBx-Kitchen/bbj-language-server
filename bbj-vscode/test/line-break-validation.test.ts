/******************************************************************************
 * Copyright 2022 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

import { EmptyFileSystem } from 'langium';
import { beforeAll, describe, expect, test } from 'vitest';

import { validationHelper } from 'langium/test';
import { createBBjServices } from '../src/language/bbj-module.js';
import { Program } from '../src/language/generated/ast.js';
import { initializeWorkspace } from './test-helper.js';

/**
 * P61-D5-006: line-break-validation.ts's hasLinebreakBefore/hasLinebreakAfter (294-318)
 * had no test covering CRLF line endings or a missing trailing newline at end-of-file —
 * a regression in either case would pass `npm test` undetected (D-13, no red state
 * producible: the code already handles both correctly).
 */
describe('Line break validation: CRLF and missing trailing newline (P61-D5-006)', async () => {
    const services = createBBjServices(EmptyFileSystem);
    let validate: ReturnType<typeof validationHelper<Program>>;

    beforeAll(async () => {
        await initializeWorkspace(services.shared);
        validate = validationHelper<Program>(services.BBj);
    });

    test('CRLF line endings do not trigger a spurious line-break error', async () => {
        // Standalone statements (isStandaloneStatement) require a line break both
        // before and after. Joining them with \r\n must satisfy hasLinebreakBefore/
        // hasLinebreakAfter exactly as \n does.
        const result = await validate('x = 1\r\ny = 2\r\n');
        const lineBreakErrors = result.diagnostics.filter(d => /needs to start in a new line/i.test(d.message));
        expect(lineBreakErrors).toHaveLength(0);
    });

    test('missing trailing newline at end of file does not trigger a spurious line-break error', async () => {
        // No trailing \n after the final statement — hasLinebreakAfter reads past
        // end-of-document; the regex's optional (\r?\n)? must still match on empty text.
        const result = await validate('x = 1\ny = 2');
        const lineBreakErrors = result.diagnostics.filter(d => /needs to start in a new line/i.test(d.message));
        expect(lineBreakErrors).toHaveLength(0);
    });

    test('CRLF combined with a missing trailing newline on the final line', async () => {
        const result = await validate('x = 1\r\ny = 2');
        const lineBreakErrors = result.diagnostics.filter(d => /needs to start in a new line/i.test(d.message));
        expect(lineBreakErrors).toHaveLength(0);
    });
});

describe('Line break validation: TABLE statement', async () => {
    const services = createBBjServices(EmptyFileSystem);
    let validate: ReturnType<typeof validationHelper<Program>>;

    beforeAll(async () => {
        await initializeWorkspace(services.shared);
        validate = validationHelper<Program>(services.BBj);
    });

    const lineBreakDiagnostics = (diagnostics: { message: string }[]) =>
        diagnostics.filter(d => /new line|line break/i.test(d.message));

    const positiveCases: [string, string][] = [
        ['no leading label, short unspaced data', 'TABLE ff00aa11\n'],
        ['leading label declaration', 'L1: TABLE ff00aa11\n'],
        ['long unspaced data field', 'TABLE aabbccddeeff00112233445566778899aabbccddeeff0011\n'],
        ['data field with single spaces between groups', 'TABLE aa bb cc dd ee ff\n'],
        ['data field mixing spaced and unspaced groups', 'TABLE aabb cc ddee ff\n'],
        ['all-uppercase keyword', 'TABLE FF00AA11\n'],
        ['all-lowercase keyword', 'table ff00aa11\n'],
        ['mixed-case keyword', 'TaBlE ff00aa11\n'],
        ['trailing ;rem comment', 'TABLE ff00aa11;rem trailing comment\n'],
        ['leading label with lowercase keyword', 'L2: table aa bb cc dd\n'],
    ];

    test.each(positiveCases)('%s produces no line-break diagnostics', async (_label, src) => {
        const result = await validate(src);
        expect(lineBreakDiagnostics(result.diagnostics)).toHaveLength(0);
    });

    test('two statements on one line with no separator between them is still flagged', async () => {
        const result = await validate('a = 1 table 00ff\n');
        expect(lineBreakDiagnostics(result.diagnostics).length).toBeGreaterThan(0);
    });
});
