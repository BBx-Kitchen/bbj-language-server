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

    test('symbols survive broken method body', async () => {
        // A class with a broken method body (lexer error mid-body) followed by a valid method.
        // The BBj parser recovers at METHODEND and continues, so both methods appear in the AST.
        const document = await validate(`
            class public TestClass
                method public void broken()
                    @@@ INVALID BODY @@@
                methodend
                method public void good()
                methodend
            classend
        `)

        // This file intentionally has lexer errors — do NOT call expectNoErrors
        const symbols = await documentSymbolProvider.getSymbols(document, { textDocument: { uri: document.uri.toString() } });

        // Must not throw — symbols is an array (not undefined/null)
        expect(Array.isArray(symbols)).toBe(true);

        const allNames = flattenSymbolNames(symbols);
        // TestClass must appear
        expect(allNames).toContain('TestClass');
        // Both methods appear: parser recovers at METHODEND for the broken one
        expect(allNames).toContain('broken');
        // The valid method 'good' must also appear
        expect(allNames).toContain('good');
    })

    test('symbols before and after syntax error', async () => {
        // Valid declaration, then a syntax error in the middle, then more valid declarations
        const document = await validate(`
            declare BBjString before!
            @@@ SYNTAX ERROR @@@
            some_label:
              release
        `)

        // Intentionally has parse/lexer errors
        const symbols = await documentSymbolProvider.getSymbols(document, { textDocument: { uri: document.uri.toString() } });

        expect(Array.isArray(symbols)).toBe(true);
        // At minimum there should be some symbols recovered
        expect(symbols.length).toBeGreaterThanOrEqual(1);

        const allNames = flattenSymbolNames(symbols);
        // before! or some_label should be recoverable
        const hasBeforeOrLabel = allNames.includes('before!') || allNames.includes('some_label');
        expect(hasBeforeOrLabel).toBe(true);
    })

    test('class with missing name shows (parse error) or child symbols', async () => {
        // A class declaration missing its name — parser may recover and produce a BbjClass
        // with an empty/undefined name. The outline should not throw.
        const document = await validate(`
            class public
                method public void validMethod()
                methodend
            classend
        `)

        const symbols = await documentSymbolProvider.getSymbols(document, { textDocument: { uri: document.uri.toString() } });

        expect(Array.isArray(symbols)).toBe(true);
        // The outline must not be null/undefined — parser may produce 0 or more symbols
        // depending on recovery. Key assertion: no exception thrown.
        // If the class or method was recovered, names should be valid strings.
        const allNames = flattenSymbolNames(symbols);
        for (const name of allNames) {
            expect(typeof name).toBe('string');
            expect(name.length).toBeGreaterThan(0);
        }
    })

    test('completely broken file returns empty or near-empty array', async () => {
        // A completely unparseable string
        const document = await validate(`@@@ %%% ###`)

        const symbols = await documentSymbolProvider.getSymbols(document, { textDocument: { uri: document.uri.toString() } });

        // Must not throw — returns an array (possibly empty)
        expect(Array.isArray(symbols)).toBe(true);
        // Symbols should be 0 or a very small number (recovered tokens)
        expect(symbols.length).toBeLessThanOrEqual(5);
    })
});

/**
 * Flatten all symbol names including children recursively.
 */
function flattenSymbolNames(symbols: { name: string; children?: { name: string; children?: unknown[] }[] }[]): string[] {
    const names: string[] = [];
    for (const sym of symbols) {
        names.push(sym.name);
        if (sym.children) {
            names.push(...flattenSymbolNames(sym.children as { name: string; children?: { name: string; children?: unknown[] }[] }[]));
        }
    }
    return names;
}

