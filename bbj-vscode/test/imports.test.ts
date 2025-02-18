
import { parseHelper } from 'langium/test';
import { beforeAll, describe, expect, test } from 'vitest';
import { createBBjServices } from '../src/language/bbj-module';
import { EmptyFileSystem, LangiumDocument, URI } from 'langium';

describe('Import tests', () => {
    let parse: ReturnType<typeof parseHelper>;

    function expectNoParserLexerErrors(document: LangiumDocument) {
        expect(document.parseResult.lexerErrors.join('\n')).toBe('')
        expect(document.parseResult.parserErrors.join('\n')).toBe('')
    }

    function expectNoValidationErrors(document: LangiumDocument) {
        expect(document.diagnostics?.map(d => d.message).join('\n')).toBe('')
    }

    beforeAll(async () => {
        const services = createBBjServices(EmptyFileSystem);
        parse = parseHelper(services.BBj);
        const document = await parse(`
            class BBjNumber
            classend
            class public ImportMe
                field public static BBjNumber field
                method public static BBjNumber zero()
                    methodret 0
                methodend
                method public static BBjNumber identity(BBjNumber value)
                    methodret value
                methodend
            classend
        `, {
            documentUri: URI.file("importMe.bbj").toString(),
            validation: true,
        });
        expectNoParserLexerErrors(document);
        expectNoValidationErrors(document);
    });

    test('Import full-qualified, use afterwards', async () => {
        const document = await parse(`
            use ::importMe.bbj::ImportMe
            let imp = new ImportMe()
            let num1 = ImportMe.field
            let num2 = ImportMe.zero()
            let num3 = ImportMe.identity(num2)
        `, { validation: true });
        expectNoParserLexerErrors(document);
        expectNoValidationErrors(document);
    });

    test('No import, use full-qualified constructor afterwards', async () => {
        const document = await parse(`
            let imp = new ::./importMe.bbj::ImportMe()
        `, { validation: true });
        expectNoParserLexerErrors(document);
        expectNoValidationErrors(document);
    });

    test('No import, use full-qualified field afterwards', async () => {
        const document = await parse(`
            let num1 = ::./importMe.bbj::ImportMe.field
        `, { validation: true });
        expectNoParserLexerErrors(document);
        expectNoValidationErrors(document);
    });

    test('No import, use full-qualified method with no parameters afterwards', async () => {
        const document = await parse(`
            let num2 = ::./importMe.bbj::ImportMe.zero()
        `, { validation: true });
        expectNoParserLexerErrors(document);
        expectNoValidationErrors(document);
    });

    test('No import, use full-qualified method with parameters afterwards', async () => {
        const document = await parse(`
            let num3 = ::./importMe.bbj::ImportMe.identity(123)
        `, { validation: true });
        expectNoParserLexerErrors(document);
        expectNoValidationErrors(document);
    });
});