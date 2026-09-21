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

// One shared services/validate instance for the whole file (all describe blocks below):
// each createBBjServices()+initializeWorkspace() pair does real, non-trivial async setup
// work, and giving every describe block its own copy compounds into a beforeAll timeout
// once the file holds more than a couple of them.
const services = createBBjServices(EmptyFileSystem);
let validate: ReturnType<typeof validationHelper<Program>>;

beforeAll(async () => {
    await initializeWorkspace(services.shared);
    validate = validationHelper<Program>(services.BBj);
});

const lineBreakDiagnostics = (diagnostics: { message: string }[]) =>
    diagnostics.filter(d => /new line|line break/i.test(d.message));

/**
 * P61-D5-006: line-break-validation.ts's hasLinebreakBefore/hasLinebreakAfter (294-318)
 * had no test covering CRLF line endings or a missing trailing newline at end-of-file —
 * a regression in either case would pass `npm test` undetected (D-13, no red state
 * producible: the code already handles both correctly).
 */
describe('Line break validation: CRLF and missing trailing newline (P61-D5-006)', () => {
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

describe('Line break validation: TABLE statement', () => {
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

    // Regression: TABLE_DATA's lookbehind must require TABLE at the start of a statement (line
    // start, optional label, or after a ';' separator). Without that anchor, any identifier that
    // merely ends in or contains "table" swallows the rest of its line as opaque TABLE data.
    const stillOrdinaryIdentifierCases: [string, string][] = [
        ['bare table as a for-loop bound', 'for i=1 to table step 2\nnext i\n'],
        ['mytable as a for-loop bound', 'for i=1 to mytable step 2\nnext i\n'],
        ['rowtable as a for-loop bound', 'for i=1 to rowtable step 2\nnext i\n'],
        ['bare table in an if condition', 'if table then print "x"\n'],
        ['mytable in an if condition', 'if mytable then print "x"\n'],
        ['table in a while condition', 'while table\nwend\n'],
        ['table used mid-expression after a minus', 'x = table - 1\n'],
        ['table used mid-expression after a plus', 'x = table + 1\n'],
        ['table printed as an ordinary value', 'print table ; print 1\n'],
        ['table as an assignment target', 'table = 5\n'],
        ['table as a let-assignment target', 'let table = 5\n'],
        ['mytable as an assignment target', 'mytable = 3\n'],
    ];

    test.each(stillOrdinaryIdentifierCases)('%s produces no line-break diagnostics', async (_label, src) => {
        const result = await validate(src);
        expect(lineBreakDiagnostics(result.diagnostics)).toHaveLength(0);
    });

    test('TABLE statement immediately after a \';\' statement separator produces no line-break diagnostics', async () => {
        const result = await validate('x = 1;TABLE ff00aa11\n');
        expect(lineBreakDiagnostics(result.diagnostics)).toHaveLength(0);
    });
});

describe('Line break validation: RESTORE with a numeric or label reference', () => {
    // Symbolic-label targets (an asterisk followed by a name) are a form the grammar's
    // lineref alternative already declares legal, so these must land in the same
    // positiveCases array as the numeric/user-label forms above rather than a separate list.
    const symbolicLabelCases: [string, string][] = [
        ['symbolic label target, uppercase keyword', 'RESTORE *RETRY\n'],
        ['symbolic label target, lowercase keyword', 'restore *retry\n'],
        ['symbolic label target, mixed case', 'ReStOrE *ReTrY\n'],
        ['symbolic label target whose name is also a language word', 'RESTORE *NEXT\n'],
        ['symbolic label target, undeclared label', 'RESTORE *mytarget\n'],
    ];

    const positiveCases: [string, string][] = [
        ['numeric reference, uppercase keyword', 'RESTORE 0\n'],
        ['numeric reference, lowercase keyword', 'restore 1\n'],
        ['numeric reference, mixed-case keyword', 'ReStOrE 2\n'],
        ['reference to a declared label', 'RESTORE mylabel\nmylabel: x = 1\n'],
        ['bare RESTORE at end of line', 'RESTORE\n'],
        ['bare RESTORE followed by another statement', 'RESTORE\nx = 1\n'],
        ['RESTORE sharing a line with a leading label', 'L1: RESTORE 3\n'],
        ...symbolicLabelCases,
    ];

    test.each(positiveCases)('%s produces no line-break diagnostics', async (_label, src) => {
        const result = await validate(src);
        expect(lineBreakDiagnostics(result.diagnostics)).toHaveLength(0);
    });

    // Diagnostics-only is not sufficient here: the defect this pins is that the input splits
    // into two statements (a RestoreStatement plus an ExpressionStatement for the stray
    // "*label"), which a future pattern change could keep quiet on diagnostics alone while
    // still producing the wrong tree. An undeclared symbolic label (RESTORE *mytarget) may
    // still produce a linking diagnostic, which lineBreakDiagnostics() already excludes; the
    // statement shape below is unaffected by linking and is asserted regardless.
    test.each(symbolicLabelCases)('%s parses as exactly one RestoreStatement', async (_label, src) => {
        const result = await validate(src);
        const statements = (result.document.parseResult.value as unknown as { statements: { $type: string }[] }).statements;
        expect(statements.map(s => s.$type)).toEqual(['RestoreStatement']);
    });

    test('two statements on one line with no separator between them is still flagged', async () => {
        const result = await validate('a = 1 restore 0\n');
        expect(lineBreakDiagnostics(result.diagnostics).length).toBeGreaterThan(0);
    });
});

// Regression: RESTORE_NO_NL's operand lookahead must require a name-start character
// immediately after an asterisk, not merely tolerate an asterisk anywhere in its operand
// class. A variable named after the verb, multiplied with a spaced '*' operator, must keep
// parsing as an ordinary assignment -- not be swallowed into a RestoreStatement the way an
// earlier lexer token in this phase once swallowed an identifier that merely contained its
// verb word, before that token gained a statement anchor.
describe('Line break validation: the RESTORE verb word used as a name', () => {
    const stillOrdinaryIdentifierCases: [string, string][] = [
        ['a variable named after the verb, multiplied with a spaced operator', 'x = restore * 2\n'],
        ['a variable named after the verb, added with a spaced operator', 'y = restore + 1\n'],
        ['the verb word embedded in a longer identifier, multiplied', 'x = restorex * 2\n'],
        ['the verb word embedded in a longer identifier, as an assignment target', 'restorex = 1\n'],
    ];

    test.each(stillOrdinaryIdentifierCases)('%s produces no line-break diagnostics and parses as one LetStatement', async (_label, src) => {
        const result = await validate(src);
        expect(lineBreakDiagnostics(result.diagnostics)).toHaveLength(0);
        const statements = (result.document.parseResult.value as unknown as { statements: { $type: string }[] }).statements;
        expect(statements.map(s => s.$type)).toEqual(['LetStatement']);
    });
});

describe('Line break validation: LOAD with a file id', () => {
    const positiveCases: [string, string][] = [
        ['string file id, uppercase keyword', 'LOAD "prog1"\n'],
        ['string file id, lowercase keyword', 'load "prog2"\n'],
        ['string file id, mixed-case keyword', 'LoAd "prog3"\n'],
        ['file id with a second argument', 'LOAD "prog4",1\n'],
    ];

    test.each(positiveCases)('%s produces no line-break diagnostics', async (_label, src) => {
        const result = await validate(src);
        expect(lineBreakDiagnostics(result.diagnostics)).toHaveLength(0);
    });

    test('two statements on one line with no separator between them is still flagged', async () => {
        const result = await validate('a = 1 load "prog"\n');
        expect(lineBreakDiagnostics(result.diagnostics).length).toBeGreaterThan(0);
    });
});

describe('Line break validation: EXIT with an identifier operand', () => {
    const positiveCases: [string, string][] = [
        ['numeric operand, uppercase keyword', 'EXIT 1\n'],
        ['numeric operand, lowercase keyword', 'exit 2\n'],
        ['identifier operand, mixed-case keyword', 'errcode = 5\nExIt errcode\n'],
        ['identifier operand, uppercase keyword', 'errcode = 5\nEXIT errcode\n'],
        ['bare EXIT, uppercase keyword', 'EXIT\n'],
        ['bare EXIT, lowercase keyword', 'exit\n'],
    ];

    test.each(positiveCases)('%s produces no line-break diagnostics', async (_label, src) => {
        const result = await validate(src);
        expect(lineBreakDiagnostics(result.diagnostics)).toHaveLength(0);
    });

    test('IF x THEN EXIT ELSE ... still parses with the ELSE branch intact', async () => {
        const result = await validate('x = 1\nif x then exit else y = 1\n');
        expect(result.document.parseResult.parserErrors).toHaveLength(0);
        const statements = (result.document.parseResult.value as unknown as { statements: { $type: string }[] }).statements;
        expect(statements.map(s => s.$type)).toContain('ElseStatement');
    });

    test('two statements on one line with no separator between them is still flagged', async () => {
        const result = await validate('errcode = 1\na = 1 exit errcode\n');
        expect(lineBreakDiagnostics(result.diagnostics).length).toBeGreaterThan(0);
    });
});

describe('Line break validation: keyword-named GOTO/GOSUB/ON...GOSUB targets', () => {
    const words = ['print', 'save', 'read', 'input', 'find', 'extract', 'delete', 'enter', 'write'];
    const positiveCases: [string, string][] = words.map(w => [
        `GOSUB target named "${w}"`,
        `GOSUB ${w}\n${w}: x = 1\n`,
    ]);
    positiveCases.push(['GOTO target named "print", lowercase keyword', 'goto print\nprint: x = 1\n']);
    positiveCases.push(['mixed-case GoSub to a mixed-case target', 'GoSub PrInT\nPrInT: x = 1\n']);
    positiveCases.push(['last target of an ON ... GOSUB list', 'ON 1 GOSUB first,print\nfirst: x = 1\nprint: y = 1\n']);

    test.each(positiveCases)('%s produces no line-break diagnostics', async (_label, src) => {
        const result = await validate(src);
        expect(lineBreakDiagnostics(result.diagnostics)).toHaveLength(0);
    });

    test('two statements on one line with no separator between them is still flagged', async () => {
        const result = await validate('a = 1 gosub print\nprint: x = 1\n');
        expect(lineBreakDiagnostics(result.diagnostics).length).toBeGreaterThan(0);
    });
});

describe('Line break validation: multi-line DEF FN with no closing FNEND', () => {
    const positiveCases: [string, string][] = [
        ['unclosed function, no closing marker at all', 'def fnx(a$)\nb$ = a$\nreturn b$\n'],
        ['unclosed function, trailing space after the header\'s closing parenthesis', 'def fnx (a$) \nb$ = a$\nreturn b$\n'],
        ['unclosed function, blank line between the header and the first body statement', 'def fnx(a$)\n\nb$ = a$\nreturn b$\n'],
        ['an earlier, properly closed function followed by one unclosed function', 'def fna(a$)\nb$=a$\nreturn b$\nfnend\ndef fnc(c$)\nd$=c$\nreturn d$\n'],
    ];

    test.each(positiveCases)('%s produces no line-break diagnostics', async (_label, src) => {
        const result = await validate(src);
        expect(lineBreakDiagnostics(result.diagnostics)).toHaveLength(0);
    });

    test('a properly closed function still ends at its closing marker: a statement on the next line is a top-level statement, not part of the body', async () => {
        const result = await validate('def fna(a$)\nb$=a$\nreturn b$\nfnend\nx=1\n');
        expect(lineBreakDiagnostics(result.diagnostics)).toHaveLength(0);
        const statements = (result.document.parseResult.value as unknown as { statements: { $type: string }[] }).statements;
        expect(statements.map(s => s.$type)).toEqual(['DefFunction', 'LetStatement']);
    });

    test('a statement crammed onto the closing marker\'s own line via a semicolon is still rejected', async () => {
        // The closing marker's own lexer token only matches when immediately followed by
        // ';' or a line break, so a real statement can never legally share its physical
        // line: trying to chain one on with ';' produces a diagnostic (a parser error
        // surfaced as one), proving the relaxed rule did not also relax this. Asserting
        // non-emptiness only, per this construct's own nature -- not the usual
        // lineBreakDiagnostics() filter, since the rejection here is a parse failure,
        // not a "needs a line break" message.
        const result = await validate('def fna(a$)\nb$=a$\nreturn b$\nfnend;x=1\n');
        expect(result.diagnostics.length).toBeGreaterThan(0);
    });
});
