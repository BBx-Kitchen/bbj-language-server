/******************************************************************************
 * Copyright 2026 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

import { EmptyFileSystem, LangiumDocument } from 'langium';
import { parseHelper } from 'langium/test';
import { describe, expect, test } from 'vitest';
import { createBBjServices } from '../src/language/bbj-module.js';
import { LetStatement, Model, Program, StringLiteral } from '../src/language/generated/ast.js';

const services = createBBjServices(EmptyFileSystem);
const parse = parseHelper<Model>(services.BBj);

async function convertStringLiteral(source: string): Promise<string> {
    const result: LangiumDocument = await parse(source, { validation: false });
    expect(result.parseResult.lexerErrors).toHaveLength(0);
    expect(result.parseResult.parserErrors).toHaveLength(0);
    const program = result.parseResult.value as Program;
    const letStmt = program.statements[0] as LetStatement;
    const literal = letStmt.assignments[0].value as StringLiteral;
    return literal.value;
}

describe('BBjValueConverter STRING_LITERAL (P61-D2-005)', () => {

    test('a doubled quote inside a string literal converts to a single embedded quote', async () => {
        const value = await convertStringLiteral(`let x$ = "He said ""hi"""`);
        expect(value).toBe('He said "hi"');
    });

    test('a string literal with no doubled quote converts unchanged', async () => {
        const value = await convertStringLiteral(`let x$ = "Hello World"`);
        expect(value).toBe('Hello World');
    });

    test('an empty string literal converts to the empty string', async () => {
        const value = await convertStringLiteral(`let x$ = ""`);
        expect(value).toBe('');
    });

});
