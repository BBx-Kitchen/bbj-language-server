import { AstUtils, EmptyFileSystem } from 'langium';
import { parseHelper } from 'langium/test';
import { describe, expect, test } from 'vitest';
import { createBBjServices } from '../src/language/bbj-module.js';
import { Model, Program, isBbjClass, isVariableDecl } from '../src/language/generated/ast.js';


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

    test('getComment on a DECLARE outside a class does not throw', async () => {
        // Regression: a VariableDecl (DECLARE) is a BBjClassMember by type but can live in a
        // Program or method body, whose container has no `comments`/`members`. getComment must
        // not throw "clazz.comments is not iterable" (crashed completion documentation).
        const doc = await parse(`
            declare BBjString foo!
            foo! = "x"

            class public C
                method public void m()
                    declare BBjString bar!
                    declare BBjString baz!
                methodend
            classend
        `, { validation: false });
        const decls = [...AstUtils.streamAst(doc.parseResult.value)].filter(isVariableDecl);
        expect(decls.length).toBe(3);
        for (const decl of decls) {
            expect(() => commentProvider.getComment(decl)).not.toThrow();
        }
    })
})
