import { EmptyFileSystem } from 'langium';
import { validationHelper } from 'langium/test';
import { beforeAll, describe, expect, test } from 'vitest';
import { Program } from '../src/language/generated/ast.js';
import { createBBjServices } from '../src/language/bbj-module.js';
import { initializeWorkspace } from './test-helper.js';

/** Diagnostics produced by the builtin-function call check (#451). */
const CALL_ISSUE = /but received \d|accepts at most|literal was given/;

describe('builtin function call validation (#451)', () => {
    const services = createBBjServices(EmptyFileSystem);
    let validate: ReturnType<typeof validationHelper<Program>>;

    beforeAll(async () => {
        await initializeWorkspace(services.shared);
        validate = validationHelper<Program>(services.BBj);
    });

    async function callIssues(code: string): Promise<string[]> {
        const result = await validate(code);
        return result.diagnostics.filter(d => CALL_ISSUE.test(d.message)).map(d => d.message);
    }

    // The concrete correct/incorrect examples from issue #179.
    test.each([
        '? ath(8)',        // numeric literal to a string parameter
        '? ath()',         // too few arguments
        '? ABS("UU")',     // string literal to a numeric parameter
        '? ADJN("2")',     // string literal to a numeric parameter
        '? ARGV()',        // too few arguments
        '? ARGV("TEST")',  // string literal to an int parameter
    ])('flags %j', async (code) => {
        expect(await callIssues(code)).not.toEqual([]);
    });

    test.each([
        '? ath("8")',
        '? ABS(2.6)',
        '? ADJN(2)',
        '? AND("U","J")',
        '? ARGV(0)',
        '? ARGV(1,err=*next)',
    ])('accepts %j', async (code) => {
        expect(await callIssues(code)).toEqual([]);
    });

    test('AND(3,8) flags both numeric literals against string parameters', async () => {
        expect(await callIssues('? AND(3,8)')).toHaveLength(2);
    });

    test('variadic MAX does not flag extra arguments', async () => {
        expect(await callIssues('? MAX(1,2,3,4,5)')).toEqual([]);
    });

    test('too many arguments are flagged for non-variadic functions', async () => {
        const issues = await callIssues('? ABS(1,2,3)');
        expect(issues.some(m => /accepts at most/.test(m))).toBe(true);
    });

    test('named ERR= argument is not counted as positional', async () => {
        expect(await callIssues('? ath("8",err=*next)')).toEqual([]);
    });
});
