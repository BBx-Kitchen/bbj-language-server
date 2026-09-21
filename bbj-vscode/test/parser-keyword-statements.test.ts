/******************************************************************************
 * Copyright 2023 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

import { EmptyFileSystem } from 'langium';
import { beforeAll, describe, expect, test } from 'vitest';
import { parseHelper, validationHelper } from 'langium/test';
import { DiagnosticSeverity } from 'vscode-languageserver';
import { createBBjServices } from '../src/language/bbj-module.js';
import { FieldStatement, LetStatement, Program, isFieldStatement, isLetStatement } from '../src/language/generated/ast.js';
import { initializeWorkspace } from './test-helper.js';

// One shared services/parse/validate instance for the whole file (all describe blocks below,
// including those added by later plans in this phase): each createBBjServices() +
// initializeWorkspace() pair does real, non-trivial async setup work, and a second instance in
// this file re-triggers the beforeAll hook-timeout flake under contention.
const services = createBBjServices(EmptyFileSystem);
let parse: ReturnType<typeof parseHelper<Program>>;
let validate: ReturnType<typeof validationHelper<Program>>;

beforeAll(async () => {
    await initializeWorkspace(services.shared);
    parse = parseHelper<Program>(services.BBj);
    validate = validationHelper<Program>(services.BBj);
});

const lineBreakDiagnostics = (diagnostics: { message: string }[]) =>
    diagnostics.filter(d => /new line|line break/i.test(d.message));

describe('RECORD verbs LEN= channel option', () => {
    test.each([
        ['READ RECORD', 'READ RECORD(1,LEN=10)a$\n'],
        ['EXTRACT RECORD', 'EXTRACT RECORD(1,LEN=10)a$\n'],
        ['FIND RECORD', 'FIND RECORD(1,LEN=10)a$\n'],
        ['INPUT RECORD', 'INPUT RECORD(1,LEN=10)a$\n'],
        ['PRINT RECORD', 'PRINT RECORD(1,LEN=10)a$\n'],
        ['WRITE RECORD', 'WRITE RECORD(1,LEN=10)a$\n'],
        ['fused READRECORD', 'READRECORD(1,LEN=10)a$\n'],
        ['lower case', 'read record(1,len=10)a$\n'],
        ['mixed case', 'Read Record(1,Len=10)a$\n'],
        ['verifier LEN=a,b form', 'READ(1)a$:(LEN=1,10)\n'],
    ])('%s parses with zero lexer and parser errors', async (_name, src) => {
        const result = await parse(src);
        expect(result.parseResult.lexerErrors, 'lexer errors').toHaveLength(0);
        expect(result.parseResult.parserErrors, 'parser errors').toHaveLength(0);
    });

    test('LET LEN=5 parses as a single assignment statement, not a run of bare expressions', async () => {
        const parsed = await parse('LET LEN=5\n');
        expect(parsed.parseResult.parserErrors, 'parser errors').toHaveLength(0);
        const statements = (parsed.parseResult.value as Program).statements;
        expect(statements).toHaveLength(1);
        expect(isLetStatement(statements[0]), 'statement is a LetStatement').toBe(true);
        const letStatement = statements[0] as LetStatement;
        expect(letStatement.assignments).toHaveLength(1);

        const validated = await validate('LET LEN=5\n');
        expect(lineBreakDiagnostics(validated.diagnostics), 'no line-break diagnostic').toHaveLength(0);
    });

    test('a verifier option whose value is absent is still a parser error', async () => {
        // The rule that was edited keeps its teeth: qualifies as a parser error both before
        // and after the LEN= unfuse (confirmed by probe).
        const parsed = await parse('READ(1)a$:(LEN=1,)\n');
        expect(parsed.parseResult.parserErrors.length, 'parser errors').toBeGreaterThan(0);
    });

    test.each([
        ['mylen assignment', 'mylen=1\n'],
        ['lenx$ assignment', 'lenx$="a"\n'],
        ['nlen array assignment', 'nlen(1)=2\n'],
        ['for loop to mylen', 'for i=1 to mylen\nnext i\n'],
        ['if mylen then', 'if mylen then x=1\n'],
    ])('keyword-as-identifier: %s stays clean', async (_name, src) => {
        const result = await parse(src);
        expect(result.parseResult.lexerErrors, 'lexer errors').toHaveLength(0);
        expect(result.parseResult.parserErrors, 'parser errors').toHaveLength(0);
    });

    test.each([
        ['record_2 assignment', 'record_2=5\n'],
        ['record_2 read', 'x=record_2+1\n'],
        ['READ record_2 item', 'READ(1)record_2\n'],
    ])('a name starting with the combined form\'s second word stays ordinary: %s', async (_name, src) => {
        const result = await parse(src);
        expect(result.parseResult.lexerErrors, 'lexer errors').toHaveLength(0);
        expect(result.parseResult.parserErrors, 'parser errors').toHaveLength(0);
    });
});

describe('FIELD verb', () => {
    test.each([
        ['name-part: string variable', 'field rec$,name$=dec(x$)\n'],
        ['name-part: string literal, spaced', 'FIELD REC$, "NAME" = "MARY"\n'],
        ['name-part: concatenation with masked str()', 'field rec$,"PRE_"+str(n:"00") = cvs(a$,3)\n'],
        ['value-part: nested function call', 'field rec$,name$=dec(str(x$))\n'],
        ['value-part: negative number', 'field rec$,name$=-5\n'],
        ['value-part: num() call', 'field rec$,name$=num(x$)\n'],
        ['value-part: method-call result', 'field rec$,name$=obj!.getName()\n'],
        ['method body', 'CLASS PUBLIC c\nMETHOD PUBLIC VOID m()\nfield rec$,name$=dec(x$)\nMETHODEND\nCLASSEND\n'],
        ['upper case', 'FIELD REC$,NAME$=1\n'],
        ['lower case', 'field rec$,name$=1\n'],
        ['mixed case', 'Field Rec$,Name$=1\n'],
    ])('%s parses with zero lexer and parser errors', async (_name, src) => {
        const result = await parse(src);
        expect(result.parseResult.lexerErrors, 'lexer errors').toHaveLength(0);
        expect(result.parseResult.parserErrors, 'parser errors').toHaveLength(0);
    });

    test('the verb line produces exactly one FieldStatement with record, name and value present', async () => {
        const parsed = await parse('field rec$,name$=dec(x$)\n');
        expect(parsed.parseResult.parserErrors, 'parser errors').toHaveLength(0);
        const statements = (parsed.parseResult.value as Program).statements;
        expect(statements).toHaveLength(1);
        expect(isFieldStatement(statements[0]), 'statement is a FieldStatement').toBe(true);
        const fieldStatement = statements[0] as FieldStatement;
        expect(fieldStatement.record).toBeDefined();
        expect(fieldStatement.name).toBeDefined();
        expect(fieldStatement.value).toBeDefined();
    });

    test('a FIELD verb without a value is still a parser error', async () => {
        // Confirmed by probe: this is a parser error both before and after the FieldStatement
        // rule was added -- the value part is mandatory (no '?' marker on the rule).
        const parsed = await parse('field rec$,name$\n');
        expect(parsed.parseResult.parserErrors.length, 'parser errors').toBeGreaterThan(0);
    });

    test('a class-member FIELD declaration without a type is still a parser error', async () => {
        const parsed = await parse('CLASS PUBLIC c\nFIELD PUBLIC x\nCLASSEND\n');
        expect(parsed.parseResult.parserErrors.length, 'parser errors').toBeGreaterThan(0);
    });

    test('a class-member FIELD declaration with a type stays clean', async () => {
        const result = await parse('CLASS PUBLIC c\nFIELD PUBLIC INTEGER x\nCLASSEND\n');
        expect(result.parseResult.lexerErrors, 'lexer errors').toHaveLength(0);
        expect(result.parseResult.parserErrors, 'parser errors').toHaveLength(0);
    });

    test.each([
        ['field=5', 'field=5\n'],
        ['x=field+1', 'x=field+1\n'],
        ['field(1)', 'field(1)\n'],
        ['field.x', 'field.x\n'],
        ['myfield=1', 'myfield=1\n'],
        ['fieldname$="a"', 'fieldname$="a"\n'],
        ['nfield(1)=2', 'nfield(1)=2\n'],
        ['for i=1 to nfield', 'for i=1 to nfield\nnext i\n'],
        ['if myfield then x=1', 'if myfield then x=1\n'],
    ])('keyword-as-identifier: %s stays clean', async (_name, src) => {
        const result = await parse(src);
        expect(result.parseResult.lexerErrors, 'lexer errors').toHaveLength(0);
        expect(result.parseResult.parserErrors, 'parser errors').toHaveLength(0);
    });

    test('the verb produces no error-severity diagnostic (linking excluded)', async () => {
        const validated = await validate('field rec$,name$=dec(x$)\n');
        const errorDiagnostics = validated.diagnostics.filter(d => d.severity === DiagnosticSeverity.Error);
        expect(errorDiagnostics, 'error-severity diagnostics').toHaveLength(0);
    });
});
