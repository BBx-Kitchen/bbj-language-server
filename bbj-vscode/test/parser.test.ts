import { describe, expect, test } from 'vitest';
import { parseDocument, parseHelper } from 'langium/test';
import { createBBjServices } from '../src/language/bbj-module';
import { EmptyFileSystem } from 'langium';
import { Program } from '../src/language/generated/ast';

const services = createBBjServices(EmptyFileSystem);

const parse = parseHelper<Program>(services.BBj);

describe('Parser Tests', () => {
    test('Program definition test', async () => {
        const program = await parse(`
        REM arrays
        dim A[1,4]
        number = A[1];

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

    test('Library definition test', async () => {
        const lib = await parse(`
        library
        ASC(param=string, ERR?=lineref): int

        /* Function comment here */
        NULL():string
    `)
        expect(lib.parseResult.lexerErrors).toHaveLength(0)
        expect(lib.parseResult.parserErrors).toHaveLength(0)
    })

});