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
    const positiveCases: [string, string][] = [
        ['numeric reference, uppercase keyword', 'RESTORE 0\n'],
        ['numeric reference, lowercase keyword', 'restore 1\n'],
        ['numeric reference, mixed-case keyword', 'ReStOrE 2\n'],
        ['reference to a declared label', 'RESTORE mylabel\nmylabel: x = 1\n'],
        ['bare RESTORE at end of line', 'RESTORE\n'],
        ['bare RESTORE followed by another statement', 'RESTORE\nx = 1\n'],
        ['RESTORE sharing a line with a leading label', 'L1: RESTORE 3\n'],
    ];

    test.each(positiveCases)('%s produces no line-break diagnostics', async (_label, src) => {
        const result = await validate(src);
        expect(lineBreakDiagnostics(result.diagnostics)).toHaveLength(0);
    });

    test('two statements on one line with no separator between them is still flagged', async () => {
        const result = await validate('a = 1 restore 0\n');
        expect(lineBreakDiagnostics(result.diagnostics).length).toBeGreaterThan(0);
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
