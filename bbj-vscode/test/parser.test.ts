import { describe, expect, test } from 'vitest';
import { parseDocument, parseHelper } from 'langium/test';
import { createBBjServices } from '../src/language/bbj-module';
import { EmptyFileSystem } from 'langium';
import { isLibrary, isProgram, Library, Model, Program } from '../src/language/generated/ast';

const services = createBBjServices(EmptyFileSystem);

const parse = parseHelper<Model>(services.BBj);

describe('Parser Tests', () => {
    test('Program definition test', async () => {
        const program = await parse(`
        REM arrays
        dim A[1,4]
        number = A[1]

        REM Variables
        some_string$ = "Hello ""World"""
        some_number = 3.14 - +1
        some_integer% = 7
        some_object! = NULL()

        FOR i=1 TO 10
            PRINT "Number ", i
        NEXT
    `)
        expect(program.parseResult.lexerErrors.length).toBe(0)
        expect(program.parseResult.parserErrors.length).toBe(0)
    })

    test('Program parsed', async () => {
        const result = await parse('some_string$ = "Hello ""World"""')
        expect(isProgram(result.parseResult.value)).true
        const prog = result.parseResult.value as Program
        expect(prog.statements.length).toBe(1)
    })

    test('Library definition test', async () => {
        const lib = await parse(`
        library
        ASC(param:string, ERR?:lineref): int

        /@@ Function comment here @/
        NULL():string
    `)
        expect(lib.parseResult.lexerErrors).toHaveLength(0)
        expect(lib.parseResult.parserErrors).toHaveLength(0)
    })

    test('Library parsed', async () => {
        const lib = await parse(`
        library
        /@@ Function comment here @/
        NULL():string
        `)
        expect(isLibrary(lib.parseResult.value)).true
        const func = (lib.parseResult.value as Library).declarations[0]
        expect(func.name).equal('NULL')
        expect(func.docu).equal('/@@ Function comment here @/') // TODO remove "/@@@/"
    })

    test('Empty library parsed', async () => {
        const lib = await parse(`library`)
        expect(isLibrary(lib.parseResult.value)).true
    })


    test('Parse Class Decl', async () => {
        const result = await parse(`
        use java.lang.String
        use java.lang.Boolean

        CLASS PUBLIC BBjString
        CLASSEND

        CLASS PUBLIC someClass

            FIELD PUBLIC BBjString someInstanceString$

            METHOD PUBLIC STATIC String getSomeString()
                METHODRET "ABC"
            METHODEND
            
            METHOD PUBLIC String getInstanceString(Boolean something!, String some_string!)
                print something!, some_string!
                
                METHODRET #someInstanceString$
            
            METHODEND

        CLASSEND
        `)
        expect(isProgram(result.parseResult.value)).true
        expect(result.parseResult.lexerErrors).toHaveLength(0)
        expect(result.parseResult.parserErrors).toHaveLength(0)
    })
});