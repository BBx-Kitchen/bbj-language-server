import { EmptyFileSystem } from 'langium';
import { validationHelper, ValidationResult } from 'langium/test';
import { describe, expect, test } from 'vitest';
import { createBBjServices } from '../src/language/bbj-module.js';
import type { Program } from '../src/language/generated/ast.js';
import { walkInputs } from './support/line-break-walk-inputs.js';

const services = createBBjServices(EmptyFileSystem);
const validate = validationHelper<Program>(services.BBj);

const LINE_BREAK_MESSAGE = /new line|line break/;

function lineBreakDiagnostics(result: ValidationResult<Program>): string[] {
    return result.diagnostics.filter(d => LINE_BREAK_MESSAGE.test(d.message)).map(d => d.message);
}

/**
 * Termination coverage for the backward walks in `line-break-validation.ts` (#232, #492).
 *
 * See `support/line-break-walk-inputs.ts` for why each input is here. The bug these
 * guard against was an infinite *synchronous* loop, so a regression makes the test
 * process hang rather than fail — vitest cannot interrupt a blocked event loop. The
 * out-of-process guard in `line-break-walk-timeout.test.ts` converts that hang into
 * a failure; keep the two in step.
 */
describe('backward walk termination (#232)', () => {
    describe.each(walkInputs.map(i => [i.label, i] as const))('%s', (_label, input) => {
        test(`terminates and parses cleanly (${input.walk} walk, ${input.iterations} iteration(s))`, async () => {
            const result = await validate(input.source);

            // A parse error would make `checkLineBreaks` bail out before reaching any
            // walk, leaving this input covering nothing.
            expect(result.document.parseResult.lexerErrors).toHaveLength(0);
            expect(result.document.parseResult.parserErrors).toHaveLength(0);
        });
    });

    test('IF whose FI shares a line with a following IF is flagged, not hung', async () => {
        const result = await validate('if x then\na = 1\nfi if y then\nb = 2\nfi');

        // The walk steps over `fi`, finds no governing IF on this line, and so requires
        // the second IF to start on a new line.
        expect(lineBreakDiagnostics(result)).toEqual([
            'This statement needs to end with a line break: fi',
            'This statement needs to start in a new line: if y then'
        ]);
    });

    test('NEXT followed by IF on the same line is flagged, not hung', async () => {
        const result = await validate('for i = 1 to 3\na = 1\nnext i if y then\nb = 2\nfi');

        expect(lineBreakDiagnostics(result)).toContain('This statement needs to start in a new line: if y then');
    });

    test('single-line IF..FI followed by IF..FI on the same line is accepted', async () => {
        // Three iterations of the IF walk before it resolves to the governing IF.
        const result = await validate('if x then a = 1 fi if y then b = 2 fi');

        expect(lineBreakDiagnostics(result)).toEqual([]);
    });

    test('ELSE reached by walking back over a compound finds its governing IF', async () => {
        // Walks b = 2 -> a = 1 -> the IF, three iterations, so the ELSE is accepted.
        const result = await validate('if x then a = 1; b = 2 else b = 3');

        expect(lineBreakDiagnostics(result)).toEqual([]);
    });

    test('ELSE with no governing IF on the line is still flagged', async () => {
        const result = await validate('a = 1; b = 2 else c = 3');

        expect(lineBreakDiagnostics(result)).toContain('This statement needs to start in a new line: else');
    });

    test('FI reached by walking back over a compound finds its governing IF', async () => {
        const result = await validate('if x then a = 1; b = 2 fi');

        expect(lineBreakDiagnostics(result)).toEqual([]);
    });

    test('FI with no governing IF on the line is still flagged', async () => {
        const result = await validate('a = 1; b = 2 fi');

        expect(lineBreakDiagnostics(result)).toContain('This statement needs to start in a new line: fi');
    });

    test('`;` before IF keeps it in a CompoundStatement and never enters the IF walk', async () => {
        // Control for the shape that does NOT reproduce the hang, so a future change that
        // routes `;` chains into the walk shows up here.
        const result = await validate('if x then a = 1 fi; if y then b = 2 fi');

        expect(lineBreakDiagnostics(result)).toEqual([]);
    });
});
