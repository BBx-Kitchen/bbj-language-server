
import { parseHelper } from 'langium/test';
import { beforeAll, describe, expect, test } from 'vitest';
import { createBBjServices } from '../src/language/bbj-module';
import { EmptyFileSystem, LangiumDocument, URI } from 'langium';

import { isBbjDocument } from '../src/language/bbj-scope-local';

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

    test('USE statements are cached after scope computation', async () => {
        const document = await parse(`
            use ::importMe.bbj::ImportMe
            use java.util.List
            let x = new ImportMe()
        `, { validation: true });
        expectNoParserLexerErrors(document);
        expectNoValidationErrors(document);

        // Verify that the document has cachedUseStatements populated
        expect(isBbjDocument(document)).toBe(true);
        if (isBbjDocument(document)) {
            expect(document.cachedUseStatements).toBeDefined();
            expect(document.cachedUseStatements).toHaveLength(2);
            // Verify the USE statements have the expected structure
            expect(document.cachedUseStatements![0].bbjFilePath).toBe('::importMe.bbj::');
            expect(document.cachedUseStatements![1].javaClass).toBeDefined();
        }
    });

    test('USE with non-existent file path produces error diagnostic', async () => {
        const document = await parse(`
            use ::nonexistent/file.bbj::SomeClass
        `, { validation: true });
        expectNoParserLexerErrors(document);
        // Should have exactly one validation error about unresolvable file
        const errors = document.diagnostics?.filter(d => d.severity === 1) ?? [];
        expect(errors).toHaveLength(1);
        expect(errors[0].message).toContain("could not be resolved");
    });

    test('USE with valid file path produces no file-path error', async () => {
        const document = await parse(`
            use ::importMe.bbj::ImportMe
            let x = new ImportMe()
        `, { validation: true });
        expectNoParserLexerErrors(document);
        // No error diagnostics — file path resolves via pre-parsed importMe.bbj
        const errors = document.diagnostics?.filter(d => d.severity === 1) ?? [];
        expect(errors).toHaveLength(0);
    });
});

describe('Prefix tests', () => {
    const services = createBBjServices(EmptyFileSystem);
    let parse: ReturnType<typeof parseHelper>;

    beforeAll(async () => {
        parse = parseHelper(services.BBj);
        // Pre-parse the BBjWidget file so it's in the index when the test document references it.
        // The URI must match what relative resolution from the test document would produce.
        await parse(`
            class public BBjWidget
            classend
        `, { documentUri: 'file:///prefix/BBjWidget/BBjWidget.bbj' });
    });

    test('USE referencing file with no classes (e.g., binary) shows file-path error', async () => {
        // Pre-parse binary-like content at a PREFIX URI - produces no BbjClass nodes
        await parse('<<bbj>>', { documentUri: 'file:///prefix/BinaryFile/BinaryFile.bbj' });

        const document = await parse(`
            use ::BinaryFile/BinaryFile.bbj::SomeClass
        `, { documentUri: 'file:///prefix/test-binary.bbj', validation: true });
        expectNoParserLexerErrors(document);
        // Should have a file-path warning because the "binary" file has no BbjClass in the index
        // (severity 1 = Error for file-not-found, severity 2 = Warning for file-found-no-classes)
        const filePathErrors = document.diagnostics?.filter(d =>
            (d.severity === 1 || d.severity === 2) && d.message.startsWith("File '")
        ) ?? [];
        expect(filePathErrors).toHaveLength(1);
        expect(filePathErrors[0].message).toContain("could not be resolved");
    });

    test('USE with PREFIX-resolved file path resolves classes', async () => {
        // Set the test document URI so that relative resolution of 'BBjWidget/BBjWidget.bbj'
        // from dirname('file:///prefix/test.bbj') = 'file:///prefix/' produces
        // 'file:///prefix/BBjWidget/BBjWidget.bbj' -- matching the pre-parsed document.
        const document = await parse(`
            use ::BBjWidget/BBjWidget.bbj::BBjWidget
            declare auto ::BBjWidget/BBjWidget.bbj::BBjWidget xxx
            let yyy = new ::BBjWidget/BBjWidget.bbj::BBjWidget()
            CLASS PUBLIC ZZZ
                METHOD ::BBjWidget/BBjWidget.bbj::BBjWidget doIt()
                    METHODRET new ::BBjWidget/BBjWidget.bbj::BBjWidget()
                METHODEND
            CLASSEND
        `, { documentUri: 'file:///prefix/test.bbj', validation: true });
        expectNoParserLexerErrors(document);
        // The BBjWidget class should resolve via the pre-parsed document
        const filePathErrors = document.diagnostics?.filter(d =>
            d.severity === 1 && d.message.startsWith("File '")
        ) ?? [];
        expect(filePathErrors).toHaveLength(0);
    });
});