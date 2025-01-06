/******************************************************************************
 * Copyright 2022 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

import { AstUtils, EmptyFileSystem } from 'langium';
import { beforeAll, describe, expect, test } from 'vitest';

import { expectError, expectNoIssues, validationHelper } from 'langium/test';
import { createBBjServices } from '../src/language/bbj-module.js';
import { Program, isBinaryExpression, isEraseStatement, isInitFileStatement, isKeyedFileStatement, isKeywordStatement, isSymbolicLabelRef, isMemberCall, BbjClass, FieldDecl, MethodDecl } from '../src/language/generated/ast.js';
import { findByIndex, findFirst, initializeWorkspace } from './test-helper.js';

describe('BBj validation', async () => {
    const services = createBBjServices(EmptyFileSystem);
    let validate: ReturnType<typeof validationHelper<Program>>;

    beforeAll(async () => {
        await initializeWorkspace(services.shared);
        validate = validationHelper<Program>(services.BBj);
    });

    test('Symbolic link reference starts with', async () => {
        const validationResult = await validate(`
        class public List
        classend
        let map = new List(err=*next)
        
        `);

        expectNoIssues(validationResult, {
            node: findFirst(validationResult.document, isBinaryExpression),
            property: 'right'
        });

    });

    test('Open statement valid options', async () => {
        const validationResult = await validate(`
        OPEN (unt,mode="12",tim=12)"path/"+"html.png"
        OPEN (unt,mode="12")"path/"+"html.png"
        OPEN (unt,tim=12)"path/"+"html.png"
        OPEN (unt)"path/"+"html.png"
        `);

        expectNoIssues(validationResult);

    });

    test('KeyedFile statement valid options', async () => {
        const validationResult = await validate(`
        MKEYED "MYFILE",10,80,1000,MODE="somemode"
        `);
        expectNoIssues(validationResult);

    });

    test('KeyedFile statement invalid options', async () => {
        const validationResult = await validate(`
        VKEYED "MYFILE",10,80,1000,MODE="somemode"
        XKEYED "MYFILE",10,80,1000,MODE="somemode"
        `);

        expectError(validationResult, 'MODE option only supported in MKEYED Verb.', {
            node: findFirst(validationResult.document, isKeyedFileStatement),
            property: 'mode'
        });
        expectError(validationResult, 'MODE option only supported in MKEYED Verb.', {
            node: findByIndex(validationResult.document, isKeyedFileStatement, 1),
            property: 'mode'
        });
    });
    
    test('Labels followed by code', async () => {
        const validationResult = await validate(`
        seterr stderr
        setesc stdesc

        goto byebye

        stdesc: REM standard escape routine
        stderr: REM standard error routine

        byebye: bye
        `);

        expectNoIssues(validationResult);
    });

    test('No newline line validation on parse error', async () => {
        const validationResult = await validate(`
        x = 4
        x = [
        declare String p_color declare String foo
        `);
        // only the parse error should be reported, not the "This line needs to be wrapped by line breaks."
        expect(validationResult.diagnostics).toHaveLength(1);
        expect(validationResult.diagnostics[0].data.code).toBe('parsing-error');
    });
    /* FIXME
    test('No newline line validation after :', async () => {
        const validationResult = await validate(`
        IF 4 <> 3 THEN 
        : PRINT "s"; REM "Test" 
        `);
        expectNoIssues(validationResult);
    });
    */
    test('OPEN verb: No error when using err', async () => {
        const validationResult = await validate(`
        ch = 1
        file$ = "test"
        open (ch,err=filenotfund)file$
        filenotfund:
        `);
        expectNoIssues(validationResult);
    });
    test('Seterr with line number', async () => {
        const validationResult = await validate(`
        seterr 0
        `);
        expectNoIssues(validationResult);
    });

    test('Check INITFILE validation', async () => {
        const validationResult = await validate(`
        INITFILE "TEST",mod=""
        INITFILE "TEST",error=errorCase
        INITFILE "TEST",time=8
        errorCase:
        `);
        expectError(validationResult, 'INITFILE verb can have following options: mode, tim, err. Found: mod.', {
            node: findByIndex(validationResult.document, isInitFileStatement, 0),
            property: 'options'
        });
        expectError(validationResult, 'INITFILE verb can have following options: mode, tim, err. Found: error.', {
            node: findByIndex(validationResult.document, isInitFileStatement, 1),
            property: 'options'
        });
        expectError(validationResult, 'INITFILE verb can have following options: mode, tim, err. Found: time.', {
            node: findByIndex(validationResult.document, isInitFileStatement, 2),
            property: 'options'
        });
    });

    test('Check ERASE validation', async () => {
        const validationResult = await validate(`
        ERASE "TEST",mod=""
        ERASE "TEST",error=errorCase
        ERASE "TEST",time=123
        errorCase:
        `);
        expectError(validationResult, 'ERASE verb can have following options: mode, tim, err. Found: mod.', {
            node: findByIndex(validationResult.document, isEraseStatement, 0),
            property: 'items'
        });
        expectError(validationResult, 'ERASE verb can have following options: mode, tim, err. Found: error.', {
            node: findByIndex(validationResult.document, isEraseStatement, 1),
            property: 'items'
        });
        expectError(validationResult, 'ERASE verb can have following options: mode, tim, err. Found: time.', {
            node: findByIndex(validationResult.document, isEraseStatement, 2),
            property: 'items'
        });
    });
    test('Check ERASE expression/option validation', async () => {
        const validationResult = await validate(`
        ERASE "TEST",mode="","not an option"
        `);
        expectError(validationResult, 'Invalid option. Expecting {,MODE=string}{,TIM=int}{,ERR=lineref}.', {
            node: findByIndex(validationResult.document, isEraseStatement, 0)?.items[2]
        });
       
    });

    test('Link a function call', async () => {
        const validationResult = await validate(`
            let fp = FPT(1)
        `);
        expectNoIssues(validationResult);
    });

    test('Line breaks RETURN', async () => {
        const validationResult = await validate(`
        DEF FNGCF(X,Y)
            IF FPT(X)<>0 OR FPT(Y)<>0 THEN FNERR 41
            WHILE X<>0
                LET TEMP=X, X=MOD(Y,X), Y=TEMP
            WEND
            RETURN Y
        FNEND
        `);
        expectNoIssues(validationResult);
    });

    test('DEF RETURN needs a return value', async () => {
        const validationResult = await validate(`
        DEF FNGCF(X,Y)
            IF FPT(X)<>0 OR FPT(Y)<>0 THEN FNERR 41
            WHILE X<>0
                LET TEMP=X, X=MOD(Y,X), Y=TEMP
            WEND
            REM expect error here
            RETURN
        FNEND
        `);
        const keywordStatement  = findFirst(validationResult.document, isKeywordStatement, true);
        expect(keywordStatement).toBeDefined();
        expectError(validationResult, 'RETURN statement inside a DEF function must have a return value.', {
            node: keywordStatement
        });
    });

    test('Call instance members with different access levels', async () => {
        const validationResult = await validate(`
            class public Test
                field private String fieldPrivate
                field protected String fieldProtected
                field public String fieldPublic

                method private doPrivately()
                methodend

                method protected doProtected()
                methodend

                method public doPublic()
                    #this!.doPrivately()               ; REM no error
                methodend
            classend

            class public TestDX extends Test 
                method public doNew()
                    #this!.doProtected()               ; REM no error
                    #this!.doPrivately()               ; REM error
                    let local1 = #this!.fieldProtected ; REM no error
                    let local2 = #this!.fieldPrivate   ; REM error
                methodend
            classend

            t! = new Test()
            t!.doPrivately()                           ; REM error
            t!.doProtected()                           ; REM error
            t!.doPublic()                              ; REM no error
            let global1 = t!.fieldPrivate              ; REM error
            let global2 = t!.fieldProtected            ; REM error
            let global3 = t!.fieldPublic               ; REM no error
        `);
        const memberCalls  = AstUtils.streamAllContents(validationResult.document.parseResult.value).filter(isMemberCall).toArray();
        expect(memberCalls).toHaveLength(11);
        expectError(validationResult, "The member 'doPrivately' from the type 'Test' is not visible", {
            node: memberCalls[2],
            property: 'member'
        });
        expectError(validationResult, "The member 'fieldPrivate' from the type 'Test' is not visible", {
            node: memberCalls[4],
            property: 'member'
        });
        expectError(validationResult, "The member 'doPrivately' from the type 'Test' is not visible", {
            node: memberCalls[5],
            property: 'member'
        });
        expectError(validationResult, "The member 'doProtected' from the type 'Test' is not visible", {
            node: memberCalls[6],
            property: 'member'
        });
        expectError(validationResult, "The member 'fieldPrivate' from the type 'Test' is not visible", {
            node: memberCalls[8],
            property: 'member'
        });
        expectError(validationResult, "The member 'fieldProtected' from the type 'Test' is not visible", {
            node: memberCalls[9],
            property: 'member'
        });
    });

    test('Call static members with different access levels', async () => {
        const validationResult = await validate(`
            class public Test
                field private static String fieldPrivate
                field protected static String fieldProtected
                field public static String fieldPublic

                method private static doPrivately()
                methodend

                method protected static doProtected()
                methodend

                method public static doPublic()
                    #this!.doPrivately()             ; REM no error
                methodend
            classend

            class public TestDX extends Test 
                method public doNew()
                    Test.doProtected()               ; REM no error
                    Test.doPrivately()               ; REM error
                    let local1 = Test.fieldProtected ; REM no error
                    let local2 = Test.fieldPrivate   ; REM error
                methodend
            classend

            Test.doPrivately()                       ; REM error
            Test.doProtected()                       ; REM error
            Test.doPublic()                          ; REM no error
            let global1 = Test.fieldPrivate          ; REM error
            let global2 = Test.fieldProtected        ; REM error
            let global3 = Test.fieldPublic           ; REM no error
        `);
        const memberCalls  = AstUtils.streamAllContents(validationResult.document.parseResult.value).filter(isMemberCall).toArray();
        expect(memberCalls).toHaveLength(11);
        expectError(validationResult, "The member 'doPrivately' from the type 'Test' is not visible", {
            node: memberCalls[2],
            property: 'member'
        });
        expectError(validationResult, "The member 'fieldPrivate' from the type 'Test' is not visible", {
            node: memberCalls[4],
            property: 'member'
        });
        expectError(validationResult, "The member 'doPrivately' from the type 'Test' is not visible", {
            node: memberCalls[5],
            property: 'member'
        });
        expectError(validationResult, "The member 'doProtected' from the type 'Test' is not visible", {
            node: memberCalls[6],
            property: 'member'
        });
        expectError(validationResult, "The member 'fieldPrivate' from the type 'Test' is not visible", {
            node: memberCalls[8],
            property: 'member'
        });
        expectError(validationResult, "The member 'fieldProtected' from the type 'Test' is not visible", {
            node: memberCalls[9],
            property: 'member'
        });
	});

    test('IF statement one line', async () => {
        const validationResult = await validate(`
        value = -1
        if value = 0 then value = 1 else value = 2
        IF value=0 THEN value=3 ELSE value=4 FI; PRINT value
        IF value=0 THEN value=5 ELSE value=6 FI; PRINT value; IF value=7 THEN value=8; PRINT value
        value = 0; if value<>0 then value = 9
        value = 0; if value<>0 then value = 9 fi
        value = 0; if value<>0 then value = 9 else value = 4
        value = 0; if value<>0 then value = 9 else value = 4 fi
        `);
        expectNoIssues(validationResult);
    });

    test('IF as last child of a compound statement', async () => {
        const validationResult = await validate(`
        debug = 1
        PRINT "Foo"; if debug then
        PRINT "top_rs_row=",3
        `);
        // missing statement after `if debug then``
        expect(validationResult.diagnostics).toHaveLength(1);
    });

    test('IF after IF single line', async () => {
        // Issue #210
        const validationResult = await validate(`
            a = 4
            if a = "" then if a > 0 then exit else return
        `);
       expectNoIssues(validationResult);
    });

    test('IF single line function container', async () => {
        // Issue #209
        const validationResult = await validate(`
        class public Test
            method public doTest()
                appName! = 2; if appName! = "" then appName! = "default"
            methodend
        classend
        DEF defFunc()
            appName! = 2; if appName! = "" then appName! = "default"
        FNEND
        `);
       expectNoIssues(validationResult);
    });

    test('SymbolicLabelRef text should not contain whitespace', async () => {
        const validationResult = await validate(`
        exitto *   BREAK
        `);
        const symbolicLabelRef  = findFirst(validationResult.document, isSymbolicLabelRef, true);
        expect(symbolicLabelRef).toBeDefined();
        expectError(validationResult, 'Symbolic label reference may not contain whitespace.', {
            node: symbolicLabelRef
        });
    });

    test('Issue 207 about access level from method that overrides auto-getter or setter', async () => {
        const validationResult = await validate(`
        class public Issue
            field protected String Test
            method public String getTest()
                methodret #Test
            methodend
        classend
        t! = new Issue()
        ? t!.getTest()
        `);
        expect(validationResult.diagnostics.map(m => m.message).every(m => m === "Could not resolve reference to Class named 'String'.")).toBeTruthy();
    });
});