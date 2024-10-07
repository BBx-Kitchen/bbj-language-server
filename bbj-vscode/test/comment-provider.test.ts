import { EmptyFileSystem } from 'langium';
import { parseHelper } from 'langium/test';
import { describe, expect, test } from 'vitest';
import { createBBjServices } from '../src/language/bbj-module.js';
import { Model, Program, isBbjClass } from '../src/language/generated/ast.js';


const services = createBBjServices(EmptyFileSystem);

const parse = parseHelper<Model>(services.BBj);

describe('Parser Tests', () => {
    const commentProvider = services.BBj.documentation.CommentProvider;

    test('Program definition test', async () => {
        const program = await parse(`
REM /** 
REM  * Javadoc for TestClass
REM  */
class public TestClass

    REM /** 
    REM  * Javadoc not for Method TEST
    REM  */

    REM /** 
    REM  * Javadoc for Method TEST
    REM  */
    method public void test()
        
    methodend
    
    REM /** 
    REM  * Javadoc for Field TEST
    REM  */
    FIELD public String test
classend
`)
        const prog = program.parseResult.value as Program
        const clazz = prog.statements.filter(isBbjClass)[0]
        expect(commentProvider.getComment(clazz)).toBe('/**\n* Javadoc for TestClass\n*/')
        expect(commentProvider.getComment(clazz.members[0])).toBe('/**\n* Javadoc for Method TEST\n*/')
        expect(commentProvider.getComment(clazz.members[1])).toBe('/**\n* Javadoc for Field TEST\n*/')
    })
})
