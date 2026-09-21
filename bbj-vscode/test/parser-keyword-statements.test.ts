/******************************************************************************
 * Copyright 2023 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

import { AstUtils, EmptyFileSystem } from 'langium';
import { beforeAll, describe, expect, test } from 'vitest';
import { parseHelper, validationHelper } from 'langium/test';
import { DiagnosticSeverity } from 'vscode-languageserver';
import { createBBjServices } from '../src/language/bbj-module.js';
import { FieldStatement, IolistStatement, LabelDecl, LetStatement, OtherItem, Program, VariableDecl, isArrayElement, isBbjClass, isFieldStatement, isGotoStatement, isIolistStatement, isLetStatement, isOnGotoStatement, isOtherItem, isReadStatement, isUserLabelRef, isVariableDecl } from '../src/language/generated/ast.js';
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
        ['bare len as a variable', 'len=1\nx=len+1\n'],
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
        ['trailing error branch to a symbolic label', 'field rec$,name$=1,err=*retry\n'],
        ['trailing error branch to a user label', 'field rec$,name$=1,err=mylabel\nmylabel:\nx=1\n'],
        ['trailing error branch, upper case', 'FIELD REC$,NAME$=1,ERR=*RETRY\n'],
        ['trailing error branch, lower case', 'field rec$,name$=1,err=*retry\n'],
        ['trailing error branch, mixed case', 'Field Rec$,Name$=1,Err=*Retry\n'],
        ['trailing error branch in a method body', 'CLASS PUBLIC c\nMETHOD PUBLIC VOID m()\nfield rec$,name$=1,err=*retry\nMETHODEND\nCLASSEND\n'],
        ['value carries its own inner error branch, no trailing one', 'field rec$,name$=dec(x$,err=*retry)\n'],
        ['value carries its own inner error branch, plus a trailing one', 'field rec$,name$=dec(x$,err=*retry),err=*same\n'],
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

    test('the verb line with a trailing error branch produces exactly one FieldStatement with its error-branch property present', async () => {
        const parsed = await parse('field rec$,name$=1,err=*retry\n');
        expect(parsed.parseResult.parserErrors, 'parser errors').toHaveLength(0);
        const statements = (parsed.parseResult.value as Program).statements;
        expect(statements).toHaveLength(1);
        expect(isFieldStatement(statements[0]), 'statement is a FieldStatement').toBe(true);
        const fieldStatement = statements[0] as FieldStatement;
        expect(fieldStatement.record).toBeDefined();
        expect(fieldStatement.name).toBeDefined();
        expect(fieldStatement.value).toBeDefined();
        expect(fieldStatement.err).toBeDefined();
    });

    test('the trailing error branch to a user label resolves to that declaration', async () => {
        const parsed = await parse('field rec$,name$=1,err=mylabel\nmylabel:\nx=1\n');
        expect(parsed.parseResult.parserErrors, 'parser errors').toHaveLength(0);
        const fieldStatement = (parsed.parseResult.value as Program).statements[0] as FieldStatement;
        const labelRef = fieldStatement.err as unknown as { label: { ref?: LabelDecl } };
        expect(labelRef.label.ref, 'error-branch reference resolved').toBeDefined();
        expect(labelRef.label.ref!.name.toLowerCase(), 'resolved declaration name').toBe('mylabel');
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
        ['err=5', 'err=5\n'],
        ['x=err+1', 'x=err+1\n'],
        ['err(1)', 'err(1)\n'],
        ['err.x', 'err.x\n'],
        ['myerr=1', 'myerr=1\n'],
        ['errcode=1', 'errcode=1\n'],
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

    test('the verb line with a trailing error branch produces no error-severity diagnostic (linking excluded)', async () => {
        const validated = await validate('field rec$,name$=1,err=*retry\n');
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

describe('IOLIST statement', () => {
    test.each([
        ['standalone, short item list', 'iolist a$,b$\n'],
        ['behind a numeric label', 'L30: iolist a,b,c\n'],
        ['behind an ordinary named label', 'recio: iolist a$,b$,c,d[all]\n'],
        ['behind a label named with the word `label`', 'label: iolist a$,b$\n'],
        ['item list mixing a numeric scalar, a string variable and an all-elements array item', 'iolist n1,s1$,arr1[all]\n'],
        ['a long item list spread over a continuation line', 'iolist i1,i2,i3,i4,i5,i6,i7,i8,\n:i9,i10\n'],
        ['upper case', 'IOLIST a,b\n'],
        ['lower case', 'iolist a,b\n'],
        ['mixed case', 'IoList a,b\n'],
    ])('%s parses with zero lexer and parser errors', async (_name, src) => {
        const result = await parse(src);
        expect(result.parseResult.lexerErrors, 'lexer errors').toHaveLength(0);
        expect(result.parseResult.parserErrors, 'parser errors').toHaveLength(0);
    });

    test('the statement produces exactly one top-level IolistStatement with the expected item count', async () => {
        const parsed = await parse('iolist a,b,c\n');
        expect(parsed.parseResult.parserErrors, 'parser errors').toHaveLength(0);
        const statements = (parsed.parseResult.value as Program).statements;
        expect(statements).toHaveLength(1);
        expect(isIolistStatement(statements[0]), 'statement is an IolistStatement').toBe(true);
        const iolistStatement = statements[0] as IolistStatement;
        expect(iolistStatement.items).toHaveLength(3);
    });

    test('a channel-option reference to the leading label resolves to that label declaration', async () => {
        const src = 'chanio: iolist chnum,chstr$\nread(1)iol=chanio\n';
        const parsed = await parse(src);
        expect(parsed.parseResult.parserErrors, 'parser errors').toHaveLength(0);
        const statements = (parsed.parseResult.value as Program).statements;
        const readStmt = statements.find(isReadStatement);
        expect(readStmt, 'ReadStatement found').toBeDefined();
        const item0 = readStmt!.items[0];
        expect(isOtherItem(item0), 'first item is an OtherItem').toBe(true);
        const otherItem = item0 as OtherItem;
        const userLabelRef = otherItem.iol as unknown as { label: { ref?: LabelDecl } };
        expect(userLabelRef.label.ref, 'channel-option reference resolved').toBeDefined();
        expect(userLabelRef.label.ref!.name.toLowerCase(), 'resolved declaration name').toBe('chanio');
    });

    test('a program whose variables appear only inside the statement produces no error-severity diagnostic', async () => {
        const validated = await validate('recio:\niolist a1,b1$\nprint a1,b1$\n');
        const errorDiagnostics = validated.diagnostics.filter(d => d.severity === DiagnosticSeverity.Error);
        expect(errorDiagnostics, 'error-severity diagnostics').toHaveLength(0);
    });

    test('an item list with a trailing comma and no item after it is still a parser error', async () => {
        // Confirmed by probe: a parser error both before and after the IolistStatement rule
        // was added -- the item list requires at least one item per comma, so a trailing
        // comma with nothing following it stays unparseable.
        const parsed = await parse('iolist a,b,\n');
        expect(parsed.parseResult.parserErrors.length, 'parser errors').toBeGreaterThan(0);
    });

    test.each([
        ['iolist=5', 'iolist=5\n'],
        ['x=iolist+1', 'x=iolist+1\n'],
        ['myiolist=1', 'myiolist=1\n'],
        ['iolistx$="a"', 'iolistx$="a"\n'],
        ['niolist(1)=2', 'niolist(1)=2\n'],
        ['for i=1 to niolist', 'for i=1 to niolist\nnext i\n'],
        ['if myiolist then x=1', 'if myiolist then x=1\n'],
    ])('keyword-as-identifier: %s stays clean', async (_name, src) => {
        const result = await parse(src);
        expect(result.parseResult.lexerErrors, 'lexer errors').toHaveLength(0);
        expect(result.parseResult.parserErrors, 'parser errors').toHaveLength(0);
    });
});

describe('empty array brackets meaning the whole array', () => {
    test.each([
        ['dread target, no suffix', 'dread x[]\n'],
        ['dread target, string suffix', 'dread x$[]\n'],
        ['dread target, object suffix', 'dread x![]\n'],
        ['dread target, integer suffix', 'dread x%[]\n'],
        ['dread target, upper case', 'DREAD X![]\n'],
        ['dread target, lower case', 'dread x![]\n'],
        ['dread target, mixed case', 'Dread X![]\n'],
        ['dread multi-item list', 'dread a$[],b[]\n'],
        ['print item alone', 'print z![]\n'],
        ['print item mixed with a string literal', 'print "a",x$[]\n'],
        ['print list mixing an indexed and a whole-array item, written order', 'print x[1],z![]\n'],
        ['assignment target', 'x![] = 1\n'],
        ['CALL argument', 'call "p",a[]\n'],
        ['XCALL argument', 'xcall "p",a[]\n'],
        ['method-call argument', 'o!.put("k",a$[])\n'],
        ['function-call argument', 'x = vector(a$[])\n'],
        ['function-call argument with a trailing error option', 'x = vector(a$[],err=L100)\nL100:\ny=1\n'],
        ['nested interop copy call', 'call bbjapi().copy(v!,a[])\n'],
    ])('%s parses with zero lexer and parser errors', async (_name, src) => {
        const result = await parse(src);
        expect(result.parseResult.lexerErrors, 'lexer errors').toHaveLength(0);
        expect(result.parseResult.parserErrors, 'parser errors').toHaveLength(0);
    });

    test('an empty-bracket element carries the whole-array marker and an empty index list, matching x[all]', async () => {
        const empty = await parse('print z![]\n');
        expect(empty.parseResult.parserErrors, 'parser errors').toHaveLength(0);
        const emptyElements = AstUtils.streamAllContents(empty.parseResult.value).filter(isArrayElement).toArray();
        expect(emptyElements, 'one ArrayElement node').toHaveLength(1);
        expect(emptyElements[0].all, 'whole-array marker').toBe(true);
        expect(emptyElements[0].indices, 'index list').toHaveLength(0);

        const wholeAll = await parse('print z![all]\n');
        expect(wholeAll.parseResult.parserErrors, 'parser errors').toHaveLength(0);
        const allElements = AstUtils.streamAllContents(wholeAll.parseResult.value).filter(isArrayElement).toArray();
        expect(allElements, 'one ArrayElement node').toHaveLength(1);
        expect(allElements[0].all, 'whole-array marker matches x[all]').toBe(emptyElements[0].all);
        expect(allElements[0].indices, 'index list matches x[all]').toHaveLength(0);
    });

    test.each([
        ['unclosed bracket', 'print x[\n'],
        ['leading comma with nothing before it', 'print x[,]\n'],
    ])('%s is still a parser error', async (_name, src) => {
        const parsed = await parse(src);
        expect(parsed.parseResult.parserErrors.length, 'parser errors').toBeGreaterThan(0);
    });

    test.each([
        ['myall=1', 'myall=1\n'],
        ['allx$="a"', 'allx$="a"\n'],
        ['x=all2+1', 'x=all2+1\n'],
        ['for i=1 to nall', 'for i=1 to nall\nnext i\n'],
    ])('keyword-as-identifier: %s stays clean', async (_name, src) => {
        const result = await parse(src);
        expect(result.parseResult.lexerErrors, 'lexer errors').toHaveLength(0);
        expect(result.parseResult.parserErrors, 'parser errors').toHaveLength(0);
    });
});

describe('type-side bracket shapes', () => {
    test.each([
        ['two-pair declaration', 'declare int[][] two!\n'],
        ['one-pair declaration', 'declare int[] one!\n'],
        ['no-pair declaration', 'declare int x\n'],
        ['two-pair field inside a class that closes', 'class public A\nfield public int[][] f!\nclassend\n'],
        ['two-pair method return type inside a class that closes', 'class public A\nmethod public int[][] m()\nmethodend\nclassend\n'],
        ['parameter marker, upper case', 'class public A\nmethod public void m(BBjArray dat[all])\nmethodend\nclassend\n'],
        ['parameter marker, lower case', 'class public a\nmethod public void m(bbjarray dat[all])\nmethodend\nclassend\n'],
    ])('%s parses with zero lexer and parser errors', async (_name, src) => {
        const result = await parse(src);
        expect(result.parseResult.lexerErrors, 'lexer errors').toHaveLength(0);
        expect(result.parseResult.parserErrors, 'parser errors').toHaveLength(0);
    });

    test('a two-pair declaration records a bracket-pair count of two', async () => {
        const parsed = await parse('declare int[][] two!\n');
        expect(parsed.parseResult.parserErrors, 'parser errors').toHaveLength(0);
        const decl = AstUtils.streamAllContents(parsed.parseResult.value).filter(isVariableDecl).toArray()[0] as VariableDecl;
        expect(decl, 'VariableDecl found').toBeDefined();
        expect(decl.arrayDims, 'bracket-pair count').toHaveLength(2);
    });

    test('a no-pair declaration records a bracket-pair count of zero', async () => {
        const parsed = await parse('declare int x\n');
        expect(parsed.parseResult.parserErrors, 'parser errors').toHaveLength(0);
        const decl = AstUtils.streamAllContents(parsed.parseResult.value).filter(isVariableDecl).toArray()[0] as VariableDecl;
        expect(decl, 'VariableDecl found').toBeDefined();
        expect(decl.arrayDims, 'bracket-pair count').toHaveLength(0);
    });

    test('the whole class around a two-pair field or method return type survives -- exactly one BbjClass, no loose expression statements', async () => {
        const parsed = await parse('class public A\nfield public int[][] f!\nmethod public int[][] m()\nmethodend\nclassend\n');
        expect(parsed.parseResult.parserErrors, 'parser errors').toHaveLength(0);
        const statements = (parsed.parseResult.value as Program).statements;
        expect(statements).toHaveLength(1);
        expect(statements[0].$type, 'top-level node is the class').toBe('BbjClass');
    });
});

describe('a comment after a block boundary, and a line number in class code', () => {
    test.each([
        ['methodend, end of file, upper case', 'class public a\nmethod public void m()\nmethodend; rem c\nclassend\n'],
        ['classend, end of file, lower case', 'class public a\nclassend; rem c\n'],
        ['interfaceend, end of file, upper case', 'interface public i\ninterfaceend; REM c\n'],
        ['single-line def fn, end of file, lower case', 'def fnx(a)=a+1; rem c\n'],
        ['multi-line def fn, end of file, upper case', 'def fny(a)\nfnend; REM c\n'],
    ])('%s parses with zero lexer and parser errors and no error-severity diagnostic', async (_name, src) => {
        const result = await parse(src);
        expect(result.parseResult.lexerErrors, 'lexer errors').toHaveLength(0);
        expect(result.parseResult.parserErrors, 'parser errors').toHaveLength(0);
        const validated = await validate(src);
        const errorDiagnostics = validated.diagnostics.filter(d => d.severity === DiagnosticSeverity.Error);
        expect(errorDiagnostics, 'error-severity diagnostics').toHaveLength(0);
    });

    test.each([
        ['methodend, mid-stream, followed by another method and the class end', 'class public a\nmethod public void m()\nmethodend; rem c\nmethod public void n()\nmethodend\nclassend\n'],
        ['classend, mid-stream, followed by more of the program', 'class public a\nclassend; rem c\nx=1\n'],
        ['interfaceend, mid-stream, followed by more of the program', 'interface public i\ninterfaceend; rem c\nx=1\n'],
        ['single-line def fn, mid-stream, followed by more of the program', 'def fnx(a)=a+1; rem c\nx=1\n'],
        ['multi-line def fn, mid-stream, followed by more of the program', 'def fny(a)\nfnend; rem c\nx=1\n'],
    ])('%s parses with zero lexer and parser errors and no error-severity diagnostic', async (_name, src) => {
        const result = await parse(src);
        expect(result.parseResult.lexerErrors, 'lexer errors').toHaveLength(0);
        expect(result.parseResult.parserErrors, 'parser errors').toHaveLength(0);
        const validated = await validate(src);
        const errorDiagnostics = validated.diagnostics.filter(d => d.severity === DiagnosticSeverity.Error);
        expect(errorDiagnostics, 'error-severity diagnostics').toHaveLength(0);
    });

    test('a mid-stream comment right after a method end marker leaves the surrounding class as one class node, not loose expression statements', async () => {
        const src = 'class public a\nmethod public void m()\nmethodend; rem c\nmethod public void n()\nmethodend\nclassend\n';
        const parsed = await parse(src);
        expect(parsed.parseResult.parserErrors, 'parser errors').toHaveLength(0);
        const statements = (parsed.parseResult.value as Program).statements;
        expect(statements).toHaveLength(1);
        expect(isBbjClass(statements[0]), 'top-level node is a class, via the generated type guard').toBe(true);
    });

    test.each([
        ['a boundary followed by an ordinary statement rather than a comment', 'class public a\nclassend; x=1\n'],
        ['two line numbers in a row before the class end marker', 'class public a\n0010\n0020 classend\n'],
    ])('%s is still a parser error', async (_name, src) => {
        const parsed = await parse(src);
        expect(parsed.parseResult.parserErrors.length, 'parser errors').toBeGreaterThan(0);
    });

    test.each([
        ['number before a statement inside a method body', 'class public a\nmethod public void m()\n0016 print "x"\nmethodend\nclassend\n'],
        ['number directly before the method end marker', 'class public a\nmethod public void m()\n0017 methodend\nclassend\n'],
        ['number before the class header at top level', '0010 class public a\nclassend\n'],
        ['number directly before the class end marker, no method in between', 'class public a\n0020 classend\n'],
        ['number directly before a method header', 'class public a\n0015 method public void m()\nmethodend\nclassend\n'],
    ])('%s parses with zero lexer and parser errors', async (_name, src) => {
        const result = await parse(src);
        expect(result.parseResult.lexerErrors, 'lexer errors').toHaveLength(0);
        expect(result.parseResult.parserErrors, 'parser errors').toHaveLength(0);
    });

    test.each([
        ['myclassend=1', 'myclassend=1\n'],
        ['fnendx$="a"', 'fnendx$="a"\n'],
        ['x=methodend2+1', 'x=methodend2+1\n'],
        ['for i=1 to nfnend', 'for i=1 to nfnend\nnext i\n'],
    ])('keyword-as-identifier: %s stays clean', async (_name, src) => {
        const result = await parse(src);
        expect(result.parseResult.lexerErrors, 'lexer errors').toHaveLength(0);
        expect(result.parseResult.parserErrors, 'parser errors').toHaveLength(0);
    });
});

describe('language words as names (oracle sweep against the compiler)', () => {
    // Every word the compiler accepts as a name and the parser used to reject, fixed by its own
    // mechanism: 'declare', 'auto', 'library', 'use', 'var' widen FeatureName/LabelName the same
    // way Phase 99's 'label'/'void' did; 'void' gains the same widening in LabelName; 'start',
    // 'next', 'methodret', 'print', 'write', 'delete', 'save', 'enter', 'read', 'input',
    // 'extract' and 'find' each get an explicit ID-category grant on their own custom-pattern
    // token, mirroring the file's existing RELEASE_NL/RELEASE_NO_NL/EXIT_NO_NL grants.
    const fixedWords = [
        'declare', 'auto', 'library', 'use', 'var', 'void',
        'start', 'next', 'methodret', 'print', 'write',
        'delete', 'save', 'enter', 'read', 'input', 'extract', 'find',
    ];

    test.each(fixedWords.map(w => [w, w] as const))('%s: variable position, every suffix, upper/lower/mixed case, and a binary-operand form', async (_name, w) => {
        const upper = w.toUpperCase();
        const mixed = w[0].toUpperCase() + w.slice(1);
        const src = [
            `${upper}=1`, `PRINT ${upper}`,
            `${w}$="a"`, `print ${w}$`,
            `${mixed}!=bbjapi()`, `Print ${mixed}!`,
            `${upper}%=1`, `PRINT ${upper}%`,
            `xdeep = 1 - ${w}`,
        ].join('\n') + '\n';
        const result = await parse(src);
        expect(result.parseResult.lexerErrors, 'lexer errors').toHaveLength(0);
        expect(result.parseResult.parserErrors, 'parser errors').toHaveLength(0);
        expect((result.parseResult.value as Program).statements, 'top-level statement count (catches a silently-swallowed spurious statement)').toHaveLength(9);
    });

    test.each(fixedWords.map(w => [w, w] as const))('%s: label declaration and a GOTO/GOSUB/ON...GOTO branch target, including as the last of a multi-target list', async (_name, w) => {
        const src = `${w}:\nx=1\ngoto ${w}\nother:\ny=1\non x goto other,${w}\n`;
        const result = await parse(src);
        expect(result.parseResult.lexerErrors, 'lexer errors').toHaveLength(0);
        expect(result.parseResult.parserErrors, 'parser errors').toHaveLength(0);
        expect((result.parseResult.value as Program).statements, 'top-level statement count').toHaveLength(6);
    });

    test('a multi-target branch whose last target is a fixed word resolves every target in the order written', async () => {
        const src = 'a1:\nx=1\ngoto b1\na2:\ny=1\nb1:\nz=1\non x goto a1,a2,declare\ndeclare:\nw=1\n';
        const parsed = await parse(src);
        expect(parsed.parseResult.parserErrors, 'parser errors').toHaveLength(0);
        const statements = (parsed.parseResult.value as Program).statements;
        const onGoto = statements.find(isOnGotoStatement);
        expect(onGoto, 'OnGotoStatement found').toBeDefined();
        const resolvedNames = onGoto!.targets.map(t => {
            const ref = t as unknown as { label: { ref?: LabelDecl } };
            return ref.label.ref?.name.toLowerCase();
        });
        expect(resolvedNames, 'targets resolve in written order').toEqual(['a1', 'a2', 'declare']);
    });

    test.each(fixedWords.flatMap(w => [
        [`my${w}=1`, `my${w}=1\n`],
        [`${w}x$="a"`, `${w}x$="a"\n`],
        [`x=${w}2+1`, `x=${w}2+1\n`],
        [`for i=1 to n${w}`, `for i=1 to n${w}\nnext i\n`],
    ]))('identifier-adjacency: %s stays clean', async (_name, src) => {
        const result = await parse(src);
        expect(result.parseResult.lexerErrors, 'lexer errors').toHaveLength(0);
        expect(result.parseResult.parserErrors, 'parser errors').toHaveLength(0);
    });

    const customPatternWords = ['start', 'next', 'methodret', 'print', 'write', 'delete', 'save', 'enter', 'read', 'input', 'extract', 'find'];
    test.each(customPatternWords.map(w => [w, w] as const))('%s followed by a semicolon-introduced comment produces no error-severity diagnostic', async (_name, w) => {
        const validated = await validate(`${w}; rem c\n`);
        const errorDiagnostics = validated.diagnostics.filter(d => d.severity === DiagnosticSeverity.Error);
        expect(errorDiagnostics, 'error-severity diagnostics').toHaveLength(0);
    });

    test('the fourteen already-working roadmap words still work as a variable, a label and a branch target', async () => {
        const roadmapWords = ['label', 'text', 'vector', 'state', 'val', 'class', 'data', 'default', 'exit', 'next', 'step', 'str', 'table', 'to'];
        for (const w of roadmapWords) {
            const varResult = await parse(`${w}=1\nprint ${w}\nxdeep = 1 - ${w}\n`);
            expect(varResult.parseResult.parserErrors, `${w} as variable`).toHaveLength(0);
            const labelResult = await parse(`${w}:\nx=1\ngoto ${w}\n`);
            expect(labelResult.parseResult.parserErrors, `${w} as label/target`).toHaveLength(0);
        }
    });

    test('a malformed use of a newly-widened word is still a parser error -- the widening is additive, not a blanket fallback', async () => {
        // 'declare' reading as an ordinary identifier does not also make a bare, dangling '='
        // with nothing valid on either side of it disappear -- the widening only adds one more
        // way to CONSUME the word, it does not relax anything else in the grammar.
        const parsed = await parse('declare =\n');
        expect(parsed.parseResult.parserErrors.length, 'parser errors').toBeGreaterThan(0);
    });

    test('a word the compiler rejects as a name is not flagged as an error (record-only, not a regression to fix here)', async () => {
        // 'then' is one of the words the oracle sweep found the real compiler rejects as a name;
        // the parser already accepts it via the pre-existing generic uppercase-keyword ID-category
        // fallback (unrelated to this plan's own widening) -- recorded in 100-CONFORMANCE.md's
        // oracle-sweep section as record-only: words the compiler rejects are recorded, not
        // flagged, and adding a check for them is not this plan's job.
        const parsed = await parse('then=1\n');
        expect(parsed.parseResult.parserErrors).toHaveLength(0);
    });

    test('a malformed class whose name is not a valid identifier is still a parser error -- the METHODEND/CLASSEND/INTERFACEEND exclusion stays in place', async () => {
        // Tried and reverted this plan: removing these three from BBjTokenBuilder.EXCLUDED let a
        // malformed ClassDecl silently re-parse as a run of expression statements with zero
        // errors instead of the parser error it produces today. Recorded in
        // 100-CONFORMANCE.md, not fixed.
        const parsed = await parse('CLASS PUBLIC label\nCLASSEND\n');
        expect(parsed.parseResult.parserErrors.length, 'parser errors').toBeGreaterThan(0);
    });
});

describe('the long-tail triage: a verb with no rule at all, and two order-fixed option tails', () => {
    test.each([
        ['bare', 'SETDRIVE "C:\\bbj"\n'],
        ['with an error option', 'SETDRIVE "C:\\bbj",ERR=driveerr\ndriveerr: END\n'],
        ['lower case', 'setdrive "C:\\bbj"\n'],
        ['mixed case', 'SetDrive "C:\\bbj"\n'],
    ])('SETDRIVE %s parses with zero lexer and parser errors', async (_name, src) => {
        const result = await parse(src);
        expect(result.parseResult.lexerErrors, 'lexer errors').toHaveLength(0);
        expect(result.parseResult.parserErrors, 'parser errors').toHaveLength(0);
    });

    test('SETDRIVE with nothing after it is still a parser error', async () => {
        // The compiler rejects a bare SETDRIVE with no fileid; confirmed a parser error both
        // before this plan's rule existed (the leftover comma) and after (the missing required
        // expression) -- the message text differs, the error status does not.
        const parsed = await parse('setdrive ,err=driveerr\ndriveerr: END\n');
        expect(parsed.parseResult.parserErrors.length, 'parser errors').toBeGreaterThan(0);
    });

    test.each([
        ['setdrive=1', 'setdrive=1\nprint setdrive\n'],
        ['setdrive$="a"', 'setdrive$="a"\nprint setdrive$\n'],
        ['mysetdrive=1', 'mysetdrive=1\nprint mysetdrive\n'],
        ['setdrivex=1', 'setdrivex=1\nprint setdrivex\n'],
    ])('keyword-as-identifier: %s stays clean', async (_name, src) => {
        const result = await parse(src);
        expect(result.parseResult.lexerErrors, 'lexer errors').toHaveLength(0);
        expect(result.parseResult.parserErrors, 'parser errors').toHaveLength(0);
    });

    test.each([
        ['bare', 'PROCESS_EVENTS\n'],
        ['tim then err', 'PROCESS_EVENTS,TIM=5,ERR=peerr\npeerr: END\n'],
        ['err then tim', 'PROCESS_EVENTS,ERR=peerr,TIM=5\npeerr: END\n'],
        ['tim only', 'PROCESS_EVENTS,TIM=5\n'],
        ['err only', 'PROCESS_EVENTS,ERR=peerr\npeerr: END\n'],
        ['no spaces around separators', 'PROCESS_EVENTS,TIM=5,ERR=peerr\npeerr:END\n'],
        ['lower case', 'process_events,err=peerr,tim=5\npeerr: end\n'],
    ])('PROCESS_EVENTS %s parses with zero lexer and parser errors', async (_name, src) => {
        const result = await parse(src);
        expect(result.parseResult.lexerErrors, 'lexer errors').toHaveLength(0);
        expect(result.parseResult.parserErrors, 'parser errors').toHaveLength(0);
    });

    test('PROCESS_EVENTS with a dangling option is still a parser error', async () => {
        const parsed = await parse('process_events,tim=\n');
        expect(parsed.parseResult.parserErrors.length, 'parser errors').toBeGreaterThan(0);
    });

    test.each([
        ['process_events=1', 'process_events=1\nprint process_events\n'],
        ['myprocess_events=1', 'myprocess_events=1\nprint myprocess_events\n'],
    ])('keyword-as-identifier: %s stays clean', async (_name, src) => {
        const result = await parse(src);
        expect(result.parseResult.lexerErrors, 'lexer errors').toHaveLength(0);
        expect(result.parseResult.parserErrors, 'parser errors').toHaveLength(0);
    });

    test.each([
        ['bare', 'FULLTEXT "f","t","k"\n'],
        ['mode then err', 'FULLTEXT "f","t","k",MODE="a",ERR=fterr\nfterr: END\n'],
        ['err then mode', 'FULLTEXT "f","t","k",ERR=fterr,MODE="a"\nfterr: END\n'],
        ['mode only', 'FULLTEXT "f","t","k",MODE="a"\n'],
        ['err only', 'FULLTEXT "f","t","k",ERR=fterr\nfterr: END\n'],
        ['no spaces around separators', 'FULLTEXT "f","t","k",MODE="a",ERR=fterr\nfterr:END\n'],
        ['lower case', 'fulltext "f","t","k",err=fterr,mode="a"\nfterr: end\n'],
    ])('FULLTEXT %s parses with zero lexer and parser errors', async (_name, src) => {
        const result = await parse(src);
        expect(result.parseResult.lexerErrors, 'lexer errors').toHaveLength(0);
        expect(result.parseResult.parserErrors, 'parser errors').toHaveLength(0);
    });

    test('FULLTEXT with a dangling option is still a parser error', async () => {
        const parsed = await parse('fulltext "f","t","k",mode=\n');
        expect(parsed.parseResult.parserErrors.length, 'parser errors').toBeGreaterThan(0);
    });

    test.each([
        ['fulltext=1', 'fulltext=1\nprint fulltext\n'],
        ['myfulltext=1', 'myfulltext=1\nprint myfulltext\n'],
    ])('keyword-as-identifier: %s stays clean', async (_name, src) => {
        const result = await parse(src);
        expect(result.parseResult.lexerErrors, 'lexer errors').toHaveLength(0);
        expect(result.parseResult.parserErrors, 'parser errors').toHaveLength(0);
    });
});

describe('a same-line leading line number before a class-boundary keyword validates clean', () => {
    // Plan 02 asserted these shapes parse-only (the line-break validator's raw line-start text
    // check had no tolerance for a leading line number). This plan widened that check; these
    // same five shapes now validate clean, not just parse clean.
    test.each([
        ['number directly before the class end marker, no method in between', 'class public a\n0020 classend\n'],
        ['number directly before a method header', 'class public a\n0015 method public void m()\nmethodend\nclassend\n'],
        ['number directly before the interface end marker', 'interface public a\n0020 interfaceend\n'],
    ])('%s', async (_name, src) => {
        const validated = await validate(src);
        expect(validated.document.parseResult.parserErrors, 'parser errors').toHaveLength(0);
        const errorDiagnostics = validated.diagnostics.filter(d => d.severity === DiagnosticSeverity.Error);
        expect(errorDiagnostics, 'error-severity diagnostics').toHaveLength(0);
    });

    test('two line numbers in a row before the interface end marker is still a parser error', async () => {
        // Mirrors the identical ClassDecl still-flagged case above -- the widening tolerates one
        // leading number, not an unbounded run of them.
        const parsed = await parse('interface public a\n0010\n0020 interfaceend\n');
        expect(parsed.parseResult.parserErrors.length, 'parser errors').toBeGreaterThan(0);
    });

    test('a leading number sharing a line with the class header itself is a recorded, not a fixed, gap', async () => {
        // The class/interface HEADER case (and a leading number directly before METHODEND inside
        // a method body) is different from the five cases above: the top-level `Statements*`
        // loop and MethodDecl's own permissive body loop both absorb the leading number as its
        // OWN separate NumberLiteral expression statement (not a bare token inside a strict
        // allow-list loop, unlike ClassDecl's/InterfaceDecl's member loops) -- so a SECOND,
        // pre-existing and much more general diagnostic still fires: the number statement's own
        // "needs to end with a line break" check, from the same classic-BASIC-style
        // same-line-numbering idiom applied to an ORDINARY statement (`10 print 1` triggers the
        // identical pair of false diagnostics, confirmed by probe, unrelated to any class
        // construct). Fixing that well needs a general exemption for a leading-line-number
        // statement from the statement-separation check, not a contained mask edit -- out of
        // scope here, recorded in 100-CONFORMANCE.md.
        const validated = await validate('0010 class public a\nclassend\n');
        const lineBreakErrors = lineBreakDiagnostics(validated.diagnostics);
        expect(lineBreakErrors.length, 'a line-break diagnostic remains on the leading line number itself').toBeGreaterThan(0);
    });

    test('a leading number sharing a line with the method end marker, inside a method body, is the identical recorded gap', async () => {
        // MethodDecl's own body loop is permissive (like Program's), so a number directly before
        // METHODEND inside a method body also becomes its own separate NumberLiteral statement --
        // same recorded gap as the class-header case above, not the strict-allow-list member-loop
        // mechanism that made classend/field/method-header/interfaceend fully fixable.
        const validated = await validate('class public a\nmethod public void m()\n0017 methodend\nclassend\n');
        const lineBreakErrors = lineBreakDiagnostics(validated.diagnostics);
        expect(lineBreakErrors.length, 'a line-break diagnostic remains on the leading line number itself').toBeGreaterThan(0);
    });
});

describe('a bare comment word with nothing after it, right after a block boundary', () => {
    test.each([
        ['classend, a space then nothing', 'class public a\nclassend; rem\n'],
        ['classend, no space at all', 'class public a\nclassend;rem\n'],
        ['methodend, a space then nothing', 'class public a\nmethod public void m()\nmethodend; rem\nclassend\n'],
        ['classend, upper case REM', 'class public a\nCLASSEND; REM\n'],
        ['classend, no trailing line break at all (end of file)', 'class public a\nclassend;rem'],
    ])('%s validates clean', async (_name, src) => {
        const validated = await validate(src);
        expect(validated.document.parseResult.parserErrors, 'parser errors').toHaveLength(0);
        const errorDiagnostics = validated.diagnostics.filter(d => d.severity === DiagnosticSeverity.Error);
        expect(errorDiagnostics, 'error-severity diagnostics').toHaveLength(0);
    });

    test('a name merely starting with the comment word is still reported -- the bare-comment tolerance is not a blanket exemption', async () => {
        // 'remx=1' does not lex as a comment body (COMMENT requires the 'rem' word to stand
        // alone), so this stays a parser error exactly as before this plan's regex widening --
        // the line-break checker itself never runs once there is a parser error (it returns
        // early), so the still-flagged evidence here is the parser error, not a line-break
        // diagnostic.
        const parsed = await parse('class public a\nclassend; remx=1\nclassend\n');
        expect(parsed.parseResult.parserErrors.length, 'parser errors').toBeGreaterThan(0);
    });
});

describe('CLEAR/BEGIN with a plain variable list is a recorded, not a fixed, gap', () => {
    // Tried widening BeginStatement (shared by CLEAR and BEGIN) to also accept a plain
    // comma-separated variable list -- the compiler accepts `clear x`, `clear x$,y`,
    // `clear x![]` in addition to the bare and EXCEPT forms already modeled. Reverted: since the
    // whole tail is optional and a variable list starts with an ordinary Expression, a BARE
    // CLEAR/BEGIN immediately followed by an unrelated statement on the next line (only a line
    // break between them, no comma) silently swallowed that next statement's first expression as
    // its own variable list instead of leaving it for the next statement -- confirmed by probe
    // (`begin\nx=1\nprint x` lost x's declaration). Safely disambiguating needs a same-line-only
    // lexer token (the RESTORE_NO_NL/TABLE_DATA technique), which is lexer work -- recorded in
    // 100-CONFORMANCE.md, not fixed here. `clear x![]` and `clear except a$,b` stay exactly as
    // before this plan.
    test('clear followed by a variable stays two separately-flagged statements, not a widened CLEAR', async () => {
        const validated = await validate('x=1\nclear x\n');
        const lineBreakErrors = lineBreakDiagnostics(validated.diagnostics);
        expect(lineBreakErrors.length, 'the pre-existing line-break diagnostic on CLEAR is unchanged').toBeGreaterThan(0);
    });

    test('a bare CLEAR or BEGIN never absorbs the following, unrelated statement', async () => {
        // The regression this plan's own probe caught and reverted -- kept as a permanent
        // guardrail so a future re-attempt at this widening trips the same test.
        const validated = await validate('begin\nx=1\nprint x\n');
        const errorDiagnostics = validated.diagnostics.filter(d => d.severity === DiagnosticSeverity.Error);
        expect(errorDiagnostics, 'x must still resolve as an ordinary assignment, not be swallowed into BEGIN').toHaveLength(0);
    });

    test.each([
        ['clear except still parses', 'clear except a$\n'],
        ['begin except still parses', 'begin except a$\n'],
        ['bare begin still parses', 'begin\n'],
    ])('%s', async (_name, src) => {
        const result = await parse(src);
        expect(result.parseResult.lexerErrors, 'lexer errors').toHaveLength(0);
        expect(result.parseResult.parserErrors, 'parser errors').toHaveLength(0);
    });
});
