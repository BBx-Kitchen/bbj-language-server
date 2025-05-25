
import { parseHelper } from 'langium/test';
import { beforeAll, describe, expect, test } from 'vitest';
import { createBBjServices } from '../src/language/bbj-module';
import { EmptyFileSystem, LangiumDocument, URI } from 'langium';
import { NodeFileSystem } from 'langium/node';

function expectNoParserLexerErrors(document: LangiumDocument) {
    expect(document.parseResult.lexerErrors.join('\n')).toBe('')
    expect(document.parseResult.parserErrors.join('\n')).toBe('')
}

function expectNoValidationErrors(document: LangiumDocument) {
    expect(document.diagnostics?.map(d => d.message).join('\n')).toBe('')
}

describe('Import tests', () => {
    const services = createBBjServices(EmptyFileSystem);
    let parse: ReturnType<typeof parseHelper>;

    beforeAll(async () => {
        parse = parseHelper(services.BBj);
        const document = await parse(`
            class protected BBjNumber
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

    test('No import, use full-qualified field call', async () => {
        const document = await parse(`
            let num1 = ::./importMe.bbj::ImportMe.field
        `, { validation: true });
        expectNoParserLexerErrors(document);
        expectNoValidationErrors(document);
    });

    test('No import, use full-qualified field declaration', async () => {
        const document = await parse(`
            CLASS PUBLIC XXX
                FIELD ::./importMe.bbj::ImportMe field
            CLASSEND

            let yyy = XXX.field
        `, { validation: true });
        expectNoParserLexerErrors(document);
        expectNoValidationErrors(document);
    });

    test('No import, use full-qualified method return type', async () => {
        const document = await parse(`
            CLASS PUBLIC XXX
                METHOD ::./importMe.bbj::ImportMe doIt()
                    METHODRET new ::./importMe.bbj::ImportMe()
                METHODEND
            CLASSEND

            let yyy = XXX.doIt()
        `, { validation: true });
        expectNoParserLexerErrors(document);
        expectNoValidationErrors(document);
    });

    test('No import, use full-qualified parameter type', async () => {
        const document = await parse(`
            CLASS PUBLIC String
            CLASSEND
            CLASS PUBLIC XXX
                METHOD String doIt(::./importMe.bbj::ImportMe aaa)
                    METHODRET ''
                METHODEND
            CLASSEND

            let yyy = XXX.doIt(new ::./importMe.bbj::ImportMe())
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

    test('No import, use full-qualified extends', async () => {
        const document = await parse(`
            class public XXX extends ::./importMe.bbj::ImportMe
            classend
        `, { validation: true });
        expectNoParserLexerErrors(document);
        expectNoValidationErrors(document);
    });

    test('No import, use full-qualified implements', async () => {
        const document = await parse(`
            class public XXX implements ::./importMe.bbj::ImportMe
            classend
        `, { validation: true });
        expectNoParserLexerErrors(document);
        expectNoValidationErrors(document);
    });

    test('No import, use full-qualified declare', async () => {
        const document = await parse(`
            declare auto ::./importMe.bbj::ImportMe xxx
        `, { validation: true });
        expectNoParserLexerErrors(document);
        expectNoValidationErrors(document);
    });

    test('No import, use class without extends and implements', async () => {
        const document = await parse(`
            class public XXX
            classend
        `, { validation: true });
        expectNoParserLexerErrors(document);
        expectNoValidationErrors(document);
    });
});

describe.skip('Prefix tests', () => {
    //Needs additional adjustments in the document builder
    const services = createBBjServices(NodeFileSystem);
    let parse: ReturnType<typeof parseHelper>;

    beforeAll(async () => {
        parse = parseHelper(services.BBj);
    });

    test('Prefix tests', async () => {
        const document = await parse(`
            use ::BBjWidget/BBjWidget.bbj::BBjWidget
            declare auto ::BBjWidget/BBjWidget.bbj::BBjWidget xxx
            let yyy = new ::BBjWidget/BBjWidget.bbj::BBjWidget()
            CLASS PUBLIC ZZZ
                METHOD ::BBjWidget/BBjWidget.bbj::BBjWidget doIt()
                    METHODRET new ::BBjWidget/BBjWidget.bbj::BBjWidget()
                METHODEND
            CLASSEND
        `, { validation: true });
        expectNoParserLexerErrors(document);
        expectNoValidationErrors(document);
    });
});