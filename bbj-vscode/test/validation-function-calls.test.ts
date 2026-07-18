import { EmptyFileSystem } from 'langium';
import { validationHelper } from 'langium/test';
import { beforeAll, describe, expect, test } from 'vitest';
import { Program } from '../src/language/generated/ast.js';
import { createBBjServices } from '../src/language/bbj-module.js';
import { initializeWorkspace } from './test-helper.js';

/** Diagnostics produced by the builtin-function call check (#451). */
const CALL_ISSUE = /but received \d|accepts at most|value is given|returns a .* value, but/;

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

    // Return type vs assignment target (variable name suffix: $ = string, none/% = numeric).
    test.each([
        'A=HTA("a")',      // HTA returns string -> numeric A
        'A%=DIR("x")',     // DIR returns string -> numeric A%
        'B$=ABS(2)',       // ABS returns num -> string B$
        'N=DSK("0")',      // DSK returns string -> numeric N
        'B$=MSGBOX("hi")', // MSGBOX returns numeric (selected-button id) -> string B$
        'S$=TCB(1)',       // TCB returns numeric -> string S$
        'N=XFIN(1)',       // XFIN returns string -> numeric N
    ])('flags return/target mismatch: %j', async (code) => {
        expect(await callIssues(code)).not.toEqual([]);
    });

    test.each([
        'A$=HTA("a")',     // string return -> string target
        'A=ABS(2.6)',      // numeric return -> numeric target
        'N%=LEN("hi")',    // int return -> numeric target
        'X!=NULL()',       // object return -> object target (not judged)
        'A=IFF(1,2,3)',    // any return -> not judged
        'N=MSGBOX("hi")',  // MSGBOX returns numeric (selected-button id) -> numeric N
        'N=TCB(1)',        // TCB returns numeric -> numeric N
        'S$=XFIN(1)',      // XFIN returns string -> string S$
    ])('accepts return/target: %j', async (code) => {
        expect(await callIssues(code)).toEqual([]);
    });

    // Type inference for non-literal arguments: nested builtin calls (return type)
    // and variables (name suffix).
    test.each([
        '? HTA(ABS(4.5))',   // ABS returns numeric -> HTA string parameter
        '? ABS(HTA("f"))',   // HTA returns string -> ABS numeric parameter
        'x$="a"\n? ABS(x$)',  // string variable -> ABS numeric parameter
        'n=5\n? HTA(n)',      // numeric variable -> HTA string parameter
    ])('flags inferred argument mismatch: %j', async (code) => {
        expect(await callIssues(code)).not.toEqual([]);
    });

    test.each([
        '? ABS(LEN("hi"))',   // LEN returns numeric -> ABS numeric parameter
        '? HTA(ATH("f"))',    // ATH returns string -> HTA string parameter
        's$="x"\n? HTA(s$)',   // string variable -> HTA string parameter
        'n=5\n? ABS(n)',       // numeric variable -> ABS numeric parameter
        '? STR(n)',            // STR objexpr is `any` -> not judged
        '? PAD("x",5,"C")',    // PAD padtype is the string keyword "L"/"C"/"R"
    ])('accepts inferred argument: %j', async (code) => {
        expect(await callIssues(code)).toEqual([]);
    });
});
