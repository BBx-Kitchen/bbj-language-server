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
            'a nested single-line IF/ELSE/FI followed on the same line by the outer ELSE',
            'if a then if b then c=1 else d=1 fi else e=1 fi\n'
        ],
        [
            'three nested single-line IF/ELSE/FI groups',
            'if a then if b then if c then d=1 else e=1 fi else f=1 fi else g=1 fi\n'
        ],
        [
            'an inner IF with ELSE but no end-of-IF followed by the outer ELSE',
            'if a then if b then c=1 else d=1 else e=1\n'
        ],
        [
            'semicolon-chained branch statements before an end-of-IF',
            'if a then b=1; c=2 fi\n'
        ],
        [
            'semicolon-chained branch statements before an ELSE and an end-of-IF',
            'if a then b=1; c=2 else d=1 fi\n'
        ],
        [
            'a nested single-line IF/ELSE/FI whose inner THEN branch is semicolon-chained',
            'if a then if b then c=1; d=2 else e=1 fi else f=1 fi\n'
        ],
        [
            'a labelled nested single-line IF/ELSE/FI followed by the outer ELSE',
            'lbl: if a then if b then c=1 else d=1 fi else e=1 fi\n'
        ],
        [
            'the nested one-liner continued over colon-prefixed lines',
            'if a then\n: if b then c=1 else d=1 fi\n: else e=1 fi\n'
        ],
        [
            'identifiers that contain the letters of IF, ELSE and FI',
            'if fix then elsewhere=1 else ifcount=2 fi\n'
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

    test('an extra ELSE after a complete nested IF/ELSE/FI group is still flagged', async () => {
        const result = await validate('if a then if b then c=1 else d=1 fi else e=1 else f=1 fi\n');
        expect(lineBreakDiagnostics(result.diagnostics).some(m => /else\s*$/i.test(m))).toBe(true);
    });
});
