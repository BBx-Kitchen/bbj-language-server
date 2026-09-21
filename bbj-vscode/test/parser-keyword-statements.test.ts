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
import { FieldStatement, LabelDecl, LetStatement, Program, isFieldStatement, isGotoStatement, isLetStatement, isUserLabelRef } from '../src/language/generated/ast.js';
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

describe('the word `label` as a name', () => {
    test.each([
        ['declaration alone, upper case', 'LABEL:\nESCAPE\n'],
        ['declaration alone, lower case', 'label:\nescape\n'],
        ['declaration alone, mixed case', 'Label:\nEscape\n'],
        ['declaration immediately followed by a statement, no space', 'label:escape\n'],
        ['declaration followed by a space and a semicolon-chained pair', 'label: escape;exit\n'],
        ['upper-case declaration in front of ENTER', 'LABEL: ENTER A$,B$\n'],
        ['GOSUB target', 'label:\nx=1\nreturn\ngosub label\n'],
        ['GOTO target', 'label:\nx=1\ngoto label\n'],
        ['GOTO target inside a semicolon-chained statement', 'label:\nx=1\nLET X=0; GOTO LABEL\n'],
        ['one entry of a multi-target ON...GOTO list', 'label:\nx=1\nother:\ny=1\non x goto label,other\n'],
        ['variable on the left of an assignment', 'label=x+1\n'],
        ['variable read inside an expression', 'x=label+1\n'],
    ])('%s parses with zero lexer and parser errors and a non-empty statement list', async (_name, src) => {
        const result = await parse(src);
        expect(result.parseResult.lexerErrors, 'lexer errors').toHaveLength(0);
        expect(result.parseResult.parserErrors, 'parser errors').toHaveLength(0);
        const statements = (result.parseResult.value as Program).statements;
        expect(statements.length, 'top-level statement count').toBeGreaterThan(0);
    });

    test('a GOSUB to the declaration resolves the cross-reference to that declaration', async () => {
        const src = 'gosub label\nx=1\nreturn\nlabel:\nx=2\n';
        const parsed = await parse(src);
        expect(parsed.parseResult.parserErrors, 'parser errors').toHaveLength(0);
        const statements = (parsed.parseResult.value as Program).statements;
        const gotoStmt = statements.find(isGotoStatement);
        expect(gotoStmt, 'GotoStatement found').toBeDefined();
        expect(isUserLabelRef(gotoStmt!.target), 'target is a UserLabelRef').toBe(true);
        const userLabelRef = gotoStmt!.target as unknown as { label: { ref?: LabelDecl } };
        expect(userLabelRef.label.ref, 'cross-reference resolved to a declaration').toBeDefined();
        expect(userLabelRef.label.ref!.name.toLowerCase(), 'resolved declaration name').toBe('label');
    });

    test.each([
        ['other-name declaration alone', 'foo:\nx=1\n'],
        ['other-name declaration followed by a statement', 'foo:escape\n'],
        ['other-name numeric label followed by a statement', 'L30: enter a$\n'],
    ])('regression: %s still parses clean', async (_name, src) => {
        const result = await parse(src);
        expect(result.parseResult.lexerErrors, 'lexer errors').toHaveLength(0);
        expect(result.parseResult.parserErrors, 'parser errors').toHaveLength(0);
    });

    test('a class declared with the word as its name is still a parser error (deliberately not widened)', async () => {
        // ClassDecl.name is typed by ValidName, deliberately left unwidened -- confirmed by
        // probe as a parser error both before and after this plan's grammar edit.
        const parsed = await parse('CLASS PUBLIC label\nCLASSEND\n');
        expect(parsed.parseResult.parserErrors.length, 'parser errors').toBeGreaterThan(0);
    });

    test.each([
        ['mylabel=1', 'mylabel=1\n'],
        ['labelx$="a"', 'labelx$="a"\n'],
        ['nlabel(1)=2', 'nlabel(1)=2\n'],
        ['for i=1 to nlabel', 'for i=1 to nlabel\nnext i\n'],
        ['if mylabel then x=1', 'if mylabel then x=1\n'],
    ])('keyword-as-identifier: %s stays clean', async (_name, src) => {
        const result = await parse(src);
        expect(result.parseResult.lexerErrors, 'lexer errors').toHaveLength(0);
        expect(result.parseResult.parserErrors, 'parser errors').toHaveLength(0);
    });

    test.each([
        ['declaration immediately followed by a statement, no space', 'label:escape\n'],
        ['declaration followed by a space and a semicolon-chained pair', 'label: escape;exit\n'],
    ])('%s produces no error-severity diagnostic', async (_name, src) => {
        const validated = await validate(src);
        const errorDiagnostics = validated.diagnostics.filter(d => d.severity === DiagnosticSeverity.Error);
        expect(errorDiagnostics, 'error-severity diagnostics').toHaveLength(0);
    });
});
