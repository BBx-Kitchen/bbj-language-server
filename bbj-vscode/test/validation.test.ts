/******************************************************************************
 * Copyright 2022 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

import { EmptyFileSystem } from 'langium';
import { describe, expect, test } from 'vitest';

import { expectError, expectNoIssues, validationHelper } from 'langium/test';
import { createBBjServices } from '../src/language/bbj-module';
import { Program, isBinaryExpression, isEraseStatement, isInitFileStatement, isKeyedFileStatement } from '../src/language/generated/ast';
import { findByIndex, findFirst, initializeWorkspace } from './test-helper';

const services = createBBjServices(EmptyFileSystem);
const validate = validationHelper<Program>(services.BBj);

describe('BBj validation', async () => {

    await initializeWorkspace(services.shared);

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
        expect(validationResult.diagnostics[0].code).toBe('parsing-error');
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
    // test('Check STRING validation', async () => {
    //     const validationResult = await validate(`
    //     STRING "TEST",mod=""
    //     STRING "TEST",error=errorCase
    //     errorCase:
    //     `);
    //     expectError(validationResult, 'STRING verb can have following options: mode, err. Found: mod.', {
    //         node: findByIndex(validationResult.document, isStringStatement, 0),
    //         property: 'options'
    //     });
    //     expectError(validationResult, 'STRING verb can have following options: mode, err. Found: error.', {
    //         node: findByIndex(validationResult.document, isStringStatement, 1),
    //         property: 'options'
    //     });
    // });
});