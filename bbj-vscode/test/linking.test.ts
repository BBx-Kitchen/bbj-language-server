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
        expect(linkingErr[0].message).toContain("Could not resolve reference to NamedElement named 'STR'.")
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

    test.skip('Link to string template array members', async () => {
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
        // BBjAPI is now loaded as a built-in BbjClass, always available regardless of Java interop
        const document = await validate(`
            API! = BbJaPi()
            api2! = bbjapi()
            api3! = BBJAPI()
        `)
        expectNoErrors(document)
    })

    test('BBjAPI() resolves without Java interop', async () => {
        // This test verifies BBjAPI works even when Java interop service is unavailable
        // The built-in BbjClass ensures BBjAPI() always resolves
        const document = await validate(`
            api! = BBjAPI()
        `)
        expectNoErrors(document)
    })

    test('BBjAPI() variable has correct type', async () => {
        // Variable assigned from BBjAPI() should have type BBjAPI
        // Note: Without Java interop, the BbjClass has no methods, but the type resolves
        const document = await validate(`
            api! = BBjAPI()
            REM Type is BBjAPI - no linker error on assignment
        `)
        const linkingErrors = findLinkingErrors(document)
        const bbjApiError = linkingErrors.find(err => err.message.includes('BBjAPI'))
        expect(bbjApiError).toBeUndefined()
    })

    test('Self-referencing variable without prior assignment does not produce cyclic error', async () => {
        // b!=b!.toString() without a prior b!="" should NOT produce a cyclic reference error.
        // The type inferer catches the re-entrant ref access gracefully.
        const document = await validate(`
            b!=b!.toString()
        `)
        const linkingErrors = findLinkingErrors(document)
        const cyclicError = linkingErrors.find(err => err.message.toLowerCase().includes('cyclic'))
        expect(cyclicError).toBeUndefined()
    })

    test('CAST() conveys type for method completion', async () => {
        const document = await validate(`
            class public TargetClass
                method public TargetClass doWork()
                    methodret #this!
                methodend
            classend

            class public BaseClass
            classend

            obj! = new BaseClass()
            result! = CAST(TargetClass, obj!)
            result!.doWork()  REM <== no linking error, type is correctly inferred
        `)
        expectNoErrors(document)
    })

    test('Implicit getter conveys backing field type', async () => {
        const document = await validate(`
            class public MyString
                method public MyString doWork()
                    methodret #this!
                methodend
            classend

            class public Person
                field public MyString Name$
            classend

            p! = new Person()
            result! = p!.Name$
            result!.doWork()  REM <== no linking error, Name$ returns MyString
        `)
        expectNoErrors(document)
    })

    test('CAST with unresolvable type shows warning', async () => {
        const document = await validate(`
            class public BaseClass
            classend

            obj! = new BaseClass()
            result! = CAST(NonExistentClass, obj!)
        `)
        const warnings = document.diagnostics?.filter(d => d.severity === DiagnosticSeverity.Warning) ?? []
        expect(warnings.length).toBeGreaterThan(0)
        const castWarning = warnings.find(w => w.message.includes('CAST'))
        expect(castWarning).toBeDefined()
    })

    test('Super class field access - single level inheritance', async () => {
        const document = await validate(`
            class public BaseClass
                field public BaseClass name!
            classend

            class public DerivedClass extends BaseClass
            classend

            obj! = new DerivedClass()
            obj!.name! = new BaseClass()  REM <== no linking error, field inherited from BaseClass
        `)
        expectNoErrors(document)
    })

    test('Super class field access - multi-level inheritance', async () => {
        const document = await validate(`
            class public GrandParent
                field public GrandParent grandField!
            classend

            class public Parent extends GrandParent
                field public Parent parentField!
            classend

            class public Child extends Parent
                field public Child childField!
            classend

            obj! = new Child()
            obj!.grandField! = new GrandParent()  REM <== inherited from GrandParent
            obj!.parentField! = new Parent()  REM <== inherited from Parent
            obj!.childField! = new Child()  REM <== own field
        `)
        expectNoErrors(document)
    })

    test('Super class method access', async () => {
        const document = await validate(`
            class public BaseClass
                method public doWork()
                methodend
            classend

            class public DerivedClass extends BaseClass
            classend

            obj! = new DerivedClass()
            obj!.doWork()  REM <== no linking error, method inherited
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

    test('DECLARE anywhere in method body is recognized for type resolution', async () => {
        const document = await validate(`
            class public MyClass
                method public java.lang.String test()
                    x$ = myVar!.charAt(1)
                    declare java.lang.String myVar!
                    methodret myVar!
                methodend
            classend
        `)
        expectNoErrors(document)
    })

    test('DECLARE at top level scope works', async () => {
        const document = await validate(`
            declare java.lang.String name!
            x = name!.charAt(1)
        `)
        expectNoErrors(document)
    })

    test('USE with unresolvable class does not crash document processing', async () => {
        const document = await validate(`
            use com.nonexistent.FakeClass
            x$ = "hello"
        `)
        // Should parse fine, may have linking/warning for the USE, but should not crash
        expect(document.parseResult.parserErrors.length).toBe(0)
        // The x$ assignment should still work despite the bad USE
    })
});
