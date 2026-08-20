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
