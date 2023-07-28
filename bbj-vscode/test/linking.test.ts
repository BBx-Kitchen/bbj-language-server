import { DocumentValidator, EmptyFileSystem, LangiumDocument } from 'langium';
import { parseHelper } from 'langium/test';
import { describe, expect, test } from 'vitest';
import { Diagnostic, DiagnosticSeverity } from 'vscode-languageserver';
import { createBBjTestServices } from './bbj-test-module';
import { Model } from '../src/language/generated/ast';

const services = createBBjTestServices(EmptyFileSystem);
const validate = (content: string) => parseHelper<Model>(services.BBj)(content, {validationChecks: 'all'});

describe('Linking Tests', async () => {
    const wsManager = services.shared.workspace.WorkspaceManager;
    await wsManager.initializeWorkspace([{ name: 'test', uri: 'file:///' }]);

    function findLinkingErrors(document: LangiumDocument): Diagnostic[] {
        return document.diagnostics?.filter(err => err.code === DocumentValidator.LinkingError)??[]
    }
    function expectNoErrors(document: LangiumDocument) {
        expect(document.parseResult.lexerErrors.length).toBe(0)
        expect(document.parseResult.parserErrors.length).toBe(0)
        expect(findLinkingErrors(document).map(err => err.message).join('\n') ?? '').toBe('')
    }

    test('Library definitions test', async () => {
        const document = await validate(`
            field = UNT
            field2 = uNt
            
            fun = StR()
            fun2 = STR()
        `)
        expectNoErrors(document)
    })

    test('Do not link to method if field requested', async () => {
        const document = await validate(`
            field = STR
        `)
        const linkingErr = findLinkingErrors(document)
        expect(linkingErr.length).toBe(1)
        expect(linkingErr[0].message).toBe("Could not resolve reference to NamedElement named 'STR'.")
    })

    test('Linking errors are warnings', async () => {
        const document = await validate(`
            field = xYz_DoesNotExists
        `)
        const linkingErr = findLinkingErrors(document)
        expect(linkingErr.length).toBe(1)
        expect(linkingErr[0].severity).toBe(DiagnosticSeverity.Warning)
        
    })

    test('String literal is of type java.lang.String type', async () => {
        const document = await validate(`
            foo$ = "TEST"
            foo$.charAt(1)  REM <== no linking error here
        `)
        expectNoErrors(document)
    })

});