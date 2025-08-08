import { DocumentValidator, EmptyFileSystem, LangiumDocument } from 'langium';
import { parseHelper } from 'langium/test';
import { beforeAll, describe, expect, test } from 'vitest';
import { Diagnostic, DiagnosticSeverity } from 'vscode-languageserver';
import { createBBjTestServices } from './bbj-test-module.js';
import { Model } from '../src/language/generated/ast.js';
import { initializeWorkspace } from './test-helper.js';
import { isPortOpen } from './test-helper.js';
import { JavadocProvider } from '../src/language/java-javadoc.js';

const services = createBBjTestServices(EmptyFileSystem);
const validate = (content: string) => parseHelper<Model>(services.BBj)(content, { validation: true });

describe('Linking Tests', async () => {
    let isInteropRunning: boolean = await isPortOpen(5008);

    beforeAll(async () => {
        await initializeWorkspace(services.shared);
    });

    function findLinkingErrors(document: LangiumDocument): Diagnostic[] {
        return document.diagnostics?.filter(err => err.data?.code === DocumentValidator.LinkingError) ?? []
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

    test('Enter verb: Put variable in scope if not exists.', async () => {
        const document = await validate(`
        ENTER A$
        ? A$
        `)
        expectNoErrors(document)
    })

    test('Case insensitive access to BBjAPI', async () => {
        const document = await validate(`
            API! = BbJaPi() REM <== no linking error here
        `)
        expectNoErrors(document)
    })
    
    describe.runIf(isInteropRunning)("Interop related tests", () => {
        test('All BBj classes extends Object', async () => {
            const document = await validate(`
                class public MyClass
                classend
                t = new MyClass()
                REM toString() comes from Object
                t.toString()
            `)
            expectNoErrors(document)
        });
    	
		test('Imported java classes resolves', async () => {
        	const document = await validate(`
            	use java.util.HashMap
            	hm! = new HashMap()
            	hm!.put("JKH","HJ")
        	`)
        	expectNoErrors(document)
   		})
        test('Import and declare simple Java class without using FQNs', async () => {
            const document = await validate(`
                use java.util.Date
                declare Date jsonobj!
            `)
            expectNoErrors(document)
        });

        test('Import Java class', async () => {
            const document = await validate(`
                use java.util.Date
            `)
            expectNoErrors(document)
        });

        test('Declare with direct import', async () => {
            const document = await validate(`
                declare java.util.Date date!
            `)
            expectNoErrors(document)
        });

        test('Class definition with direct import in extends', async () => {
            const document = await validate(`
                class MyDate extends java.util.Date
                classend
            `)
            expectNoErrors(document)
        });

        test('Class definition with direct import in implements', async () => {
            const document = await validate(`
                class List implements java.util.List
                classend
            `)
            expectNoErrors(document)
        });

        test('Object construction with direct import', async () => {
            const document = await validate(`
                let hashMap! = new java.util.HashMap()
            `)
            expectNoErrors(document)
        });

        test('Test for #67', async () => {
            const document = await validate(`
                use java.lang.Class
                declare Class thinClientClass!
            `)
            expectNoErrors(document)
        });

        test('Unloaded Java FQN access - test for #6', async () => {
            const document = await validate(`
                A$ = java.sql.Date.valueOf("2305-07-23")
            `)
            expectNoErrors(document)
        });
        
        test('Java FQN access - test for #6', async () => {
            const document = await validate(`
                use java.sql.Date
                b! = java.lang.Boolean.TRUE 
                A$ = java.sql.Date.valueOf("2305-07-23")
                hm! = new java.util.HashMap()
            `)
            expectNoErrors(document)
        });



        test('Linked List is resolved', async () => {
            const document = await validate(`
                let list! = new java.util.LinkedList()
            `)
            expectNoErrors(document)
        });

        test('Package scope as most outer scope', async () => {
            const document = await validate(`
                declare java.lang.String com
                com.charAt(3)
            `)
            expectNoErrors(document)
        });

        test('Resolve nested class in use statement', async () => {
            const document = await validate(`
                use java.util.Map.Entry
            `)
            expectNoErrors(document)
        });

        test('Resolve nested class FQN', async () => {
            const document = await validate(`
                e = new java.util.Map.Entry()
                comp = e.getValue()
            `)
            expectNoErrors(document)
        });
    });
});
