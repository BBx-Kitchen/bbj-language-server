import { EmptyFileSystem, LangiumDocument } from 'langium';
import { parseHelper } from 'langium/test';
import { beforeAll, describe, expect, test } from 'vitest';
import { DiagnosticSeverity } from 'vscode-languageserver';
import { Model } from '../src/language/generated/ast.js';
import { createBBjTestServices } from './bbj-test-module.js';
import { initializeWorkspace } from './test-helper.js';

const services = createBBjTestServices(EmptyFileSystem);
const validate = (content: string) => parseHelper<Model>(services.BBj)(content, { validation: true });
const documentSymbolProvider = services.BBj.lsp.DocumentSymbolProvider!;

describe('DocumentSymbol Tests', async () => {

    beforeAll(async () => {
        await initializeWorkspace(services.shared);
    });

    function expectNoErrors(document: LangiumDocument) {
        expect(document.parseResult.lexerErrors.length).toBe(0)
        expect(document.parseResult.parserErrors.length).toBe(0)
        // no errors
        expect(document.diagnostics?.filter(d => d.severity === DiagnosticSeverity.Error).map(err => err.message).join('\n') ?? '').toBe('')
    }

    test('DocumentSymbol definitions test', async () => {
        const document = await validate(`
            declare BBjVector testVar!
            someVar! = "Test"
            class public TestClass
                field public Boolean testField!
                method  public void TestMethod()
                methodend
            classend

            PRINT 'RB'
            PRINT 'CS'

            some_label:
              REM
              release
        `)
        expectNoErrors(document)

        const symbols = await documentSymbolProvider.getSymbols(document, { textDocument: { uri: document.uri.toString() } });
        expect(symbols.length).toBe(3);
        expect(symbols.map(s => s.name).join(', ')).toBe('testVar!, TestClass, some_label');
        expect(symbols[1].children?.map(s => s.name).join(', ')).toBe('testField!, TestMethod');

    })
});

