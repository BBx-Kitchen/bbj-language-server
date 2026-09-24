import { EmptyFileSystem } from 'langium';
import { beforeAll, describe, expect, test } from 'vitest';

import { validationHelper } from 'langium/test';
import { createBBjServices } from '../src/language/bbj-module.js';
import { Program } from '../src/language/generated/ast.js';
import { initializeWorkspace } from './test-helper.js';

// A new, file-disjoint suite for the single-line IF/FI mask changes and the
// trailing-comma PRINT lexer fix (line-break-walk-termination.test.ts and
// line-break-validation.test.ts stay untouched and are not imported here).
const services = createBBjServices(EmptyFileSystem);
let validate: ReturnType<typeof validationHelper<Program>>;

beforeAll(async () => {
    await initializeWorkspace(services.shared);
    validate = validationHelper<Program>(services.BBj);
});

const lineBreakDiagnostics = (diagnostics: { message: string }[]) =>
    diagnostics.filter(d => /new line|line break/i.test(d.message)).map(d => d.message);

describe('Line break validation: single-line IF/FI forms the compiler accepts', () => {
    const positiveCases: [string, string][] = [
        [
            'labelled single-line IF with a semicolon-chained branch statement',
            'loopstart: IF flag THEN count = 1; GOTO loopstart\n'
        ],
        [
            'nested single-line IF closed by two chained end-of-IF statements',
            'if a then if b then c = 1 fi fi\n'
        ],
        [
            'the return-inside-a-single-line-IF form',
            'IF flag THEN RETURN 1 FI\n'
        ],
        [
            'a labelled single-line IF closed by an end-of-IF statement',
            'mylabel: if x then a = 1 fi\n'
        ],
        [
            'a nested single-line IF/FI followed on the same line by the outer ELSE',
            'if a then if b then c = 1 fi else d = 1 fi\n'
        ],
        [
            'trailing-comma PRINT followed by a multi-line IF block, no trailing whitespace',
            'print a$,\nif x then\nb = 1\nfi\n'
        ],
        [
            'trailing-comma PRINT followed by a multi-line IF block, one trailing space',
            'print a$, \nif x then\nb = 1\nfi\n'
        ],
        [
            'trailing-comma PRINT followed by a multi-line IF block, two trailing spaces',
            'print a$,  \nif x then\nb = 1\nfi\n'
        ],
        [
            'trailing-comma PRINT followed by a multi-line IF block, a trailing tab',
            'print a$,\t\nif x then\nb = 1\nfi\n'
        ],
    ];

    test.each(positiveCases)('%s produces no line-break diagnostics', async (_label, src) => {
        const result = await validate(src);
        expect(lineBreakDiagnostics(result.diagnostics)).toHaveLength(0);
    });
});

describe('Line break validation: single-line IF/FI forms that stay flagged', () => {
    test('a label followed on the same line by an end-of-IF statement with no governing IF is still flagged', async () => {
        const result = await validate('mylabel: fi\n');
        expect(lineBreakDiagnostics(result.diagnostics).length).toBeGreaterThan(0);
    });

    test('two real statements on one line with no semicolon between them is still flagged', async () => {
        const result = await validate('a = 1 b = 2\n');
        expect(lineBreakDiagnostics(result.diagnostics).length).toBeGreaterThan(0);
    });

    test('an end-of-IF statement sharing a line with a following IF is still flagged', async () => {
        const result = await validate('if x then\na = 1\nfi if y then\nb = 2\nfi\n');
        expect(lineBreakDiagnostics(result.diagnostics).length).toBeGreaterThan(0);
    });
});
