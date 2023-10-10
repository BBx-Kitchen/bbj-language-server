import { DocumentValidator, EmptyFileSystem, LangiumDocument } from 'langium';
import { parseHelper } from 'langium/test';
import { describe, expect, test } from 'vitest';
import { Diagnostic, DiagnosticSeverity } from 'vscode-languageserver';
import { createBBjTestServices } from './bbj-test-module';
import { Model } from '../src/language/generated/ast';
import { initializeWorkspace } from './test-helper';

const services = createBBjTestServices(EmptyFileSystem);
const validate = (content: string) => parseHelper<Model>(services.BBj)(content, {validationChecks: 'all'});

describe('Linking Tests', async () => {
    await initializeWorkspace(services.shared);

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

    test('Use symbolic labels', async () => {
        const document = await validate(`
        class public List
            method public List add()
            add(err=*break)
            methodend
        classend
        
        map = new List(err=*next)
        map.add(err=*BReak)
        map.add(err=*STOP)
        map.add(err=*next)
        `)
        expectNoErrors(document)
    })

    test('Link to string template array members', async () => {
        const document = await validate(`
        DIM key$:"MY_COL:K(10)"
        key.my_col = 525.95
        READ RECORD(1, KEY=key$) myrec$
        `)
        expectNoErrors(document)
    })

    test('Link to named lib parameter.', async () => {
        const document = await validate(`
        fileopen("Open Server File", "", "", "", "", MODE="CLIENT")
        filesave("Open Server File", "", "", "", "", MODE="CLIENT")
        `)
        expectNoErrors(document)
    })

    test('Link to MSGBOX named lib parameter.', async () => {
        const document = await validate(`
        temp = msgbox("Hello!", "IconInfo", "Greetings", MODE="theme=primary")
        result = msgbox("Message$",1,"Title$","Button1$","Button2$","Button3$",tim=12, mode="mode$",err=*NEXT)
        `)
        expectNoErrors(document)
    })

    test('Process assignment in compound statement #99', async () => {
        const document = await validate(`
            title$ = "" ; rem should add title$ to compound statement parent scope
            PRINT title$
        `)
        expectNoErrors(document)
    })

});