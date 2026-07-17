import { EmptyFileSystem, LangiumDocument } from 'langium';
import { parseHelper } from 'langium/test';
import { beforeAll, describe, expect, test } from 'vitest';
import { createBBjServices } from '../src/language/bbj-module';
import { Model, Program, isBbjClass, isVariableDecl } from '../src/language/generated/ast';

const services = createBBjServices(EmptyFileSystem);
const parse = parseHelper<Model>(services.BBj);

function expectNoParserLexerErrors(document: LangiumDocument) {
    expect(document.parseResult.lexerErrors.map(e => e.message).join('\n')).toBe('');
    expect(document.parseResult.parserErrors.map(e => e.message).join('\n')).toBe('');
}

describe('DECLARE in class body (#380)', () => {
    beforeAll(() => services.shared.workspace.WorkspaceManager.initializeWorkspace([]));

    test('DECLARE directly in a class body (outside methods) does not break parsing', async () => {
        // A `declare` directly in the class body is not valid BBj, but it must NOT break
        // parsing of the whole file. It is now accepted as a VariableDecl ClassMember and
        // the class (incl. members after the declare, and trailing statements) still parses
        // with zero errors — no cascade of misparsed keywords.
        const result = await parse(`
                class public Automatization
                    declare BBjVector scheduledTasks!

                    method public void run()
                    methodend
                classend

                x = 1
        `, { validation: false });
        expectNoParserLexerErrors(result);
        const model = result.parseResult.value as Program;
        const clazz = model.statements.find(isBbjClass);
        expect(clazz, 'CLASS should parse as a BbjClass').toBeDefined();
        expect(clazz!.members.some(isVariableDecl), 'declare captured as a class member').toBe(true);
    });
});
