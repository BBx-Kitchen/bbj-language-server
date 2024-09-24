import { AstNode, EmptyFileSystem, LangiumDocument } from 'langium';
import { parseHelper } from 'langium/test';
import { streamAst } from 'langium';
import { describe, expect, test } from 'vitest';
import { createBBjServices } from '../src/language/bbj-module';
import { CompoundStatement, LetStatement, Library, Model, PrintStatement, Program, ReadStatement, StringLiteral, SymbolRef, isAddrStatement, isCallStatement, isClipFromStrStatement, isCloseStatement, isCommentStatement, isCompoundStatement, isExitWithNumberStatement, isGotoStatement, isLetStatement, isLibrary, isPrintStatement, isProgram, isRedimStatement, isRunStatement, isSqlCloseStatement, isSqlPrepStatement, isSwitchCase, isSwitchStatement, isWaitStatement } from '../src/language/generated/ast';

const services = createBBjServices(EmptyFileSystem);

const parse = parseHelper<Model>(services.BBj);
describe('Parser Tests', () => {

    function expectNoParserLexerErrors(document: LangiumDocument) {
        expect(document.parseResult.lexerErrors.join('\n')).toBe('')
        expect(document.parseResult.parserErrors.join('\n')).toBe('')
    }

    function expectNoValidationErrors(document: LangiumDocument) {
        expect(document.diagnostics?.map(d => d.message).join('\n')).toBe('')
    }

    function expectToContainAstNodeType<N extends AstNode>(document: LangiumDocument, predicate: (ast: AstNode) => ast is N) {
        expect(streamAst(document.parseResult.value).some(predicate)).toBeTruthy();
    }

    test('Program definition test', async () => {
        const program = await parse(`
        REM arrays
        dim A[1,4]
        number = A[1]

        REM Variables
        some_string$ = "Hello ""World"""
        some_number = 3.14 - +1
        some_integer% = 7
        some_object! = NULL()

        FOR i=1 TO 10
            PRINT "Number ", i
        NEXT
    `)
        expectNoParserLexerErrors(program)
    })

    test('Program parsed', async () => {
        const result = await parse('some_string$ = "Hello ""World"""')
        expect(isProgram(result.parseResult.value)).true
        const prog = result.parseResult.value as Program
        expect(prog.statements.length).toBe(1)
        expectNoParserLexerErrors(result)
    })

    test('Library definition test', async () => {
        const lib = await parse(`
        library
        ASC(param:string, ERR?:lineref): int

        /@@ Function comment here @/
        NULL():string
    `)
        expectNoParserLexerErrors(lib)
    })

    test('Library parsed', async () => {
        const lib = await parse(`
        library
        /@@ Function comment here @/
        NULL():string
        `)
        expect(isLibrary(lib.parseResult.value)).true
        const func = (lib.parseResult.value as Library).declarations[0]
        expect(func.name).equal('NULL')
        expect(func.docu).equal('/@@ Function comment here @/') // TODO remove "/@@@/"
    })

    test('Empty library parsed', async () => {
        const lib = await parse(`library`)
        expect(isLibrary(lib.parseResult.value)).true
    })


    test('Parse Class Decl', async () => {
        const result = await parse(`
        use java.lang.String
        use java.lang.Boolean

        CLASS PUBLIC BBjString
        CLASSEND

        CLASS PUBLIC someClass

            FIELD PUBLIC BBjString someInstanceString$

            METHOD PUBLIC STATIC String getSomeString()
                METHODRET "ABC"
            METHODEND
            
            METHOD PUBLIC String getInstanceString(Boolean something!, String some_string!)
                print something!, some_string!
                
                METHODRET #someInstanceString$
            
            METHODEND

        CLASSEND
        `)
        expectNoParserLexerErrors(result)
        expect(isProgram(result.parseResult.value)).true
    })

    test('Parse Interface Decl', async () => {
        const result = await parse(`
        interface public ResolverInterface
            method public Boolean resolve(String term!, Integer column!)
        interfaceend
        `)
        expectNoParserLexerErrors(result)
        expect(isProgram(result.parseResult.value)).true
    })

    test('Parse Class Decl with comments', async () => {
        const result = await parse(`
        REM class comment
        CLASS PUBLIC someClass; REM class comment
            REM field comment
            FIELD PUBLIC BBjString someInstanceString$;REM field comment
            
            REM meth comment
            METHOD PUBLIC STATIC String getSomeString(); REM meth comment
                METHODRET "ABC"
            METHODEND

            REM meth comment
            METHOD PUBLIC STATIC String getSomeString2(); REM meth comment
                METHODRET "ABC"
            METHODEND

            METHOD PUBLIC String getSomeString3(); REM meth comment
            REM class body comment without METHODEND
            
            REM class body comment
        CLASSEND
        `)
        expectNoParserLexerErrors(result)
        expect(isProgram(result.parseResult.value)).true
    })

    test('Parse Interface Decl with comments', async () => {
        const result = await parse(`
        REM class comment
        interface public ResolverInterface; REM class comment
            REM meth comment
            method public Boolean resolve(String term!, Integer column!); REM meth comment
            REM meth comment
            method public Boolean resolve2(String term!, Integer column!); REM meth comment
            REM class body comment
        interfaceend
        `)
        expectNoParserLexerErrors(result)
        expect(isProgram(result.parseResult.value)).true
    })

    test('Parse namedParameter Decl', async () => {
        const result = await parse(`
        BBjAPI().removeTimer("onLoadFallback", err= *next)
        `)
        expectNoParserLexerErrors(result)
        expect(isProgram(result.parseResult.value)).true
    })

    test('Parse hex string in expression', async () => {
        const result = await parse(`
        filter$ = "Image Files"+$0a$+"*.png;*.jpg;*.jpeg;*.gif"
        `)
        expectNoParserLexerErrors(result)
        expect(isProgram(result.parseResult.value)).true
    })

    test('Parse string mask', async () => {
        const result = await parse(`
        PRINT "String":"mask"
        s! = str(p_color!.getRed():"##0")
        `)
        expectNoParserLexerErrors(result)
        expect(isProgram(result.parseResult.value)).true
    })

    test('Parse multiple assignments with "LET"', async () => {
        const result = await parse(`
        LET a = 1, b = 2, c = 3
        PRINT a
        `);
        expectNoParserLexerErrors(result);
    })

    test('Parse multiple assignments wihtout "LET"', async () => {
        const result = await parse(`
        a = 1, b = 2, c = 3
        PRINT a
        `);
        expectNoParserLexerErrors(result);
    });

    test('Parse "METHODRET" in a single line "IF"', async () => {
        const result = await parse(`
        IF true THEN METHODRET

        IF true THEN METHODRET 1
        `);
        expectNoParserLexerErrors(result);
    });

    test('Parse "METHODRET" in a multi line "IF"', async () => {
        const result = await parse(`
        IF true THEN
            METHODRET 2
        ELSE
            METHODRET
        ENDIF
        `);
        expectNoParserLexerErrors(result);
    });

    test('Parse "REM" as independent statement on own line', async () => {
        const result = await parse(`
        REM single line rem
        `);
        expectNoParserLexerErrors(result);
        const model = result.parseResult.value;
        expect(isProgram(model)).toBeTruthy();
        expect(isCommentStatement((model as Program).statements[0])).toBeTruthy();
    });

    test('Parse "REM" as independent statement in compound statement', async () => {
        const result = await parse(`
        PRINT 1; REM compound rem
        PRINT 2
        `);
        expectNoParserLexerErrors(result);
        const model = result.parseResult.value;
        expect(isProgram(model)).toBeTruthy();
        const compound = (model as Program).statements[0] as CompoundStatement;
        expect(isCompoundStatement(compound)).toBeTruthy();
        expect(compound.statements).toHaveLength(2);
        expect(isPrintStatement(compound.statements[0])).toBeTruthy();
        expect(isCommentStatement(compound.statements[1])).toBeTruthy();
    });

    test('Allow trailing comma in print', async () => {
        const result = await parse(`
        PRINT X$,
        PRINT ERR,TCB(5),`); // no line break at the end
        expectNoParserLexerErrors(result);
    });

    test('Number syntax', async () => {
        const result = await parse(`
        x = 23
        y = 0.1234
        z = .123345
        `);
        expectNoParserLexerErrors(result);
    });

    test('Number syntax - invalid', async () => {
        const result = await parse(`
            y = 0.1234.1
            z = .123345.12
        `, { validationChecks: 'all' });
        // currently parsed as two numbers 0.1234 and .1
        expectNoParserLexerErrors(result);
        // validation complains about missing linebreaks between 0.1234 and .1
        expect(result.diagnostics).toHaveLength(4);
    });

    test('Seterr and Setesc', async () => {
        const result = await parse(`
        seterr stderr
        setesc stdesc
        
        goto byebye
        
        stdesc:
            REM standard escape routine
        stderr: 
            REM standard error routine
        
        byebye:
            bye
        `, { validationChecks: 'all' });
        expectNoParserLexerErrors(result);
        expectNoValidationErrors(result);
    });

    test('String backslash should not escape', async () => {
        const result = await parse(`
        rd_table_pfx$="\\Test\\"
        `);
        expect(result.parseResult.parserErrors).toHaveLength(0);
        const program = result.parseResult.value as Program;
        const letStmt = program.statements[0] as LetStatement;
        const strValue = letStmt.assignments[0].value as StringLiteral;
        expect(strValue.value).toBe('\\Test\\');
    });

    test('READ: Input variable should be linked or created.', async () => {
        const result = await parse(`
        let B$="1",C$="2",Q$="3"

        READ(1,KEY="TEST",ERR=9500)A$,B$,C$
        READ RECORD(1,IND=2,ERR=9500)A$
        READ RECORD(1,IND=2,ERR=9500)*,A$
        EXTRACT(2,KEY=Q$,DOM=1300)IOL=Label1
        INPUT (0,ERR=1000)@(5,20),'CE',"ENTER NAME:",N$:("FRED"=Label1,$AAFF00$=Label2,LEN=1,24)
        REad (0) array[ALL]
        
        Label1:
            PRINT "Label"
        Label2:
            PRINT "Label2"

        Print A$,B$,C$
        `, { validationChecks: 'all' });
        expectNoParserLexerErrors(result);
        expectNoValidationErrors(result);

        const program = result.parseResult.value as Program;
        const printStmt = program.statements.slice(-1).pop() as PrintStatement;
        const refContainer = (ref) => (ref as SymbolRef).symbol.ref?.$container
        expect(refContainer(printStmt.items[0])?.$type).toBe(ReadStatement); // a$ links to READ input item
        expect(refContainer(printStmt.items[1])?.$type).toBe(LetStatement); // b$ links to LET assignment
        expect(refContainer(printStmt.items[2])?.$type).toBe(LetStatement);// c$ links to LET assignment
    });

    test('Mnemonic tests', async () => {
        const result = await parse(`
        let x = 1,y = 2
        let ABS = "fakeFunc"
        REM using mnemonic in output:
        PRINT 'CS','BR',@(0,0),"Hello World",'ER',@(10,10),"This is a Demo",@(0,20),
        
        PRINT (0)'CS','BR',@(0,0),"Hello World",'ER',@(10,10),"This is a Demo",@(0,20),
        
        REM but it's also allowed in INPUT 
        INPUT 'CS','BR',@(0,0),"Hello World",'ER',@(10,10),"Enter your name:",@(30),X$
        
        REM for completeness sake an even more complex input:
        INPUT (0,err=*same)'CS','BR',@(4,0),"Hello World",'ER',@(10,10),"Enter your name: ",'CL',X$:(""=fin,LEN=x,y)
        
        rem Mnemonics are in a way like Strings:
        X$='CS'+'BR'+@(x,y)+"Hello World"+'ER'+@(ABS(4),10)+"This is a Demo"+@(0,20)
        PRINT X$,
        
        REM Hence, they can also be concatenated with plus during output:
        PRINT 'CS'+'BR'+@(0,0)+"Hello World"+'ER'+@(10,10)+"This is a Demo"+@(0,20),

        REM parameterized mnemonics
        LET CURSOR$="C:\WINDOWS\Cursors\hourgla2.ani"
        LET TITLE$="4"+" "+3+" "+CURSOR$
        PRINT (1)'WINDOW'(200,200,500,200,TITLE$,$00010003$)
        PRINT (1)'SETCURSOR'(CURSOR$),'FOCUS'(0)

        REM from issue #39
        ? 'FILESAVE'("save file","C:/","test",".txt","Text files"+$0a$+"*.txt")
        ? 'WINDOW'(10,10,20,10,"Hello")
        
        fin:
        release
        `, { validationChecks: 'all' });
        expectNoParserLexerErrors(result);
        expect(result.diagnostics).toHaveLength(1); // 1 for linking error on *same
    });

    test('Array declaration and access tests', async () => {
        const result = await parse(`
        REM square brackets with one or multiple dimensions
        DIM Y1[22]
        DIM Y2[10,10,20]
        
        REM same with Strings arrays:
        DIM Y1$[22]
        DIM Y2$[10,10,20]
        
        REM now this is pre-sizing a String with length 20
        DIM Z1$(20)
        
        REM same, initialize it with dots
        DIM Z2$(10,".")
        
        REM now the combination: a String array of pre-dimensioned strings:
        DIM Y3$[22](20)
        DIM Y4$[10,10,20](30,".")
        
        REM object arrays
        DIM X![20]
        DIM X![20,10,4]
        
        REM Java arrays:
        REM https://documentation.basis.cloud/BASISHelp/WebHelp/gridctrl/Working_with_Java_Arrays.htm
        
        colorx! = Array.newInstance(Class.forName("java.awt.Color"),2) 
        Array.set(colorx!,0,Color.RED)
        Array.set(colorx!,1,Color.BLUE)
        print "colorx![0]=",Array.get(colorx!,0)
        print "colorx![1]=",Array.get(colorx!,1)
        
        declare Color[] Color!
        color! = new Color[2]
        color![0] = Color.RED
        color![1] = Color.BLUE
        print "color![0]=",color![0]
        print "color![1]=",color![1]
        
        REM String Templates
        
        tpl$="NAME:C(25*),FIRSTNAME:C(25*),SCORE:N(4)"
        DIM rec$:tpl$
        rec.name$="Wallace"
        rec.firstname$="Marcellus"
        rec.score=2.3
        print rec.name$,": ",rec.score
        
        REM other examples
        DIM B$:"NAME:C(10+)"
        
        DIM B$:"NAME:C(10+=0)"
        
        X$="STRING:C(6)"
        DIM A$:X$
        REDIM A$
        `);
        expectNoParserLexerErrors(result);
    });

    test('Multiple Array declaration and access tests', async () => {
        const result = await parse(`
        dim rd_open_tables$[1:rd_num_files],rd_open_opts$[1:rd_num_files],rd_open_chans$[1:rd_num_files],rd_open_tpls$[1:rd_num_files]
        `);
        expectNoParserLexerErrors(result);
    });

    test('Check throw statement syntax', async () => {
        const result = await parse(`
        class public Sample

            method public String write(String dr!)
                seterr writeErr
                PRINT dr!
                methodret dr!

                writeErr:
                throw errmes(-1), err
            methodend
        classend
        `);
        expectNoParserLexerErrors(result);
    });

    test('Check throw statement syntax with ERR=linefref', async () => {
        const result = await parse(`
        class public Sample

            method public String write(String dr!)
                seterr writeErr
                PRINT dr!
                methodret dr!

                writeErr:
                throw errmes(-1), err, err=STOP
            methodend
        classend
        `);
        expectNoParserLexerErrors(result);
    });

    test('Check substring expression on array element', async () => {
        const result = await parse(`
        dim Y$[10], XYZ$[10,10]
        y$[1](2,1)="TEST"; rem substring
       
        XYZ$[3,4](1,5); rem substring

        compat$ = stbl("!COMPAT","THOROUGHBRED_IF47=TRUE")

        let x$ = ""
        if x$(10,10) = "" then print "if47" ; rem substring
        if len(cvs(x$(10,10),3)) = 0 then print "if47" ; rem substring
        `);
        expectNoParserLexerErrors(result);
    });

    test('Check substring expression ', async () => {
        const result = await parse(`
        let NAME$ = "name"
        NAME$(1,5); rem substring
        NAME$(10); rem substring

        compat$ = stbl("!COMPAT","THOROUGHBRED_IF47=TRUE")

        let x$ = ""
        if x$(10,10) = "" then print "if47" ; rem substring
        if len(cvs(x$(10,10),3)) = 0 then print "if47" ; rem substring

        bytes = dec(fin(serverfile)(1,4))
        a$=STR(1234)(1,2)
        `);
        expectNoParserLexerErrors(result);
    });

    test('Check substring other cases ', async () => {
        const result = await parse(`
        new String()(1)
        `);
        expectNoParserLexerErrors(result);
    });

    test('Use Symbolic label in a verb', async () => {
        const result = await parse(`
        serverfile$ = "test"
        open (7, err=*next)serverfile$
        `);
        expectNoParserLexerErrors(result);
    });

    test('Check readrecord and similar', async () => {
        const result = await parse(`
        READRECORD(1,IND=2,ERR=9500)A$
        WRITERECORD(1,IND=2,ERR=9500)A$
        PRINTRECORD(1,IND=2,ERR=9500)A$
        INPUTRECORD(1,IND=2,ERR=9500)A$
        EXTRACTRECORD(1,IND=2,ERR=9500)A$
        FINDRECORD(1,IND=2,ERR=9500)A$
        `);
        expectNoParserLexerErrors(result);
    });

    test('Check read and similar, with record', async () => {
        const result = await parse(`
        READ RECORD(1,IND=2,ERR=9500)A$
        WRITE RECORD(1,IND=2,ERR=9500)A$
        PRINT RECORD(1,IND=2,ERR=9500)A$
        INPUT RECORD(1,IND=2,ERR=9500)A$
        EXTRACT RECORD(1,IND=2,ERR=9500)A$
        FIND RECORD(1,IND=2,ERR=9500)A$
        `);
        expectNoParserLexerErrors(result);
    });

    test('Check CALL and RUN', async () => {
        const result = await parse(`
        RUN "TEST", ERR=errorCase
        RUN "TEST2"
        CALL "bus.bbj::setUpdateLocation", mapRC%, mapUser$, mapPassword$, mapVendor$, mapApplication$, mapVersion$, mapLevel%, mapLocation
        X!=23
        CALL "subprog",(X!), ERR=errorCase
        errorCase: STOP
        `);
        expectNoParserLexerErrors(result);
        expectToContainAstNodeType(result, isRunStatement);
        expectToContainAstNodeType(result, isCallStatement);
    });

    test('Check PROCESS_EVENT Parameters', async () => {
        const result = await parse(`
        process_events,err=*same
        process_events, TIM = 28, err=*next
        `);
        expectNoParserLexerErrors(result);
    });

    test('Check Reserved keywords', async () => {
        const result = await parse(`
        CLASS public MyClass

            METHOD public MyClass open()
            METHODEND
      
        classend
        `);
        expectNoParserLexerErrors(result);
    });
    
    test('Check Open Verb optional params keywords', async () => {
        const result = await parse(`
        OPEN (unt,mode="O_CREATE,O_TRUNC",TIM=12)"path/"+"html.png"
        OPEN (unt,TIM=12)"path/"+"html.png"
        OPEN (unt,ISZ=0,TIM=5,mode="",ERR=errorCase)"path/"+"html.png"
        OPEN (unt)"path/"+"html.png"
        errorCase:
        `);
        expectNoParserLexerErrors(result);
    });
    
    test('Check SQLOpen Verb', async () => {
        const result = await parse(`
        SQLOPEN(1,mode="SQLDriverConnect",err=*next)"datasource"
        SQLOPEN(1,err=*next)"datasource"
        SQLOPEN(1)"datasource"
        `);
        expectNoParserLexerErrors(result);
    });

    test('Check Begin Clear Verb', async () => {
        const result = await parse(`
        dim PARAMS[2]
        foo$ = ""

        BEGIN
        BEGIN EXCEPT foo$, PARAMS[ALL], foo$
        CLEAR
        CLEAR EXCEPT foo$, PARAMS[ALL], foo$
        `);
        expectNoParserLexerErrors(result);
    });

    test('Check Drop Verb', async () => {
        const result = await parse(`
        DROP "TEST.BBX", ERR=*next
        DROP "TEST.BBX"
        `);
        expectNoParserLexerErrors(result);
    });

    test('Check Exit Verbs', async () => {
        const result = await parse(`
        RETURN
        END
        BYE
        BREAK
        CONTINUE
        ESCAPE
        `);
        expectNoParserLexerErrors(result);
    });

    test('Check Enter Verb', async () => {
        const result = await parse(`
        someVar$ = "TEST"
        someOtherVar$ = "TEST"
        ENTER someVar$
        ENTER someVar$, someOtherVar$
        ENTER someVar$, ERR=JumpToLabel
        ENTER someVar$, someOtherVar$, ERR=JumpToLabel

        JumpToLabel:
        `, { validationChecks: 'all' });
        expectNoParserLexerErrors(result);
        expectNoValidationErrors(result);
    });

    test('Check REPEAT..UNTIL Verb', async () => {
        const result = await parse(`
        LOOP_EXIT=0
        REPEAT
            LOOP_EXIT = LOOP_EXIT + 1
        UNTIL LOOP_EXIT=10
        `, { validationChecks: 'all' });
        expectNoParserLexerErrors(result);
        expectNoValidationErrors(result);
    });

    test('Check SETOPTS Verb', async () => {
        const result = await parse(`
        LET A$=$02$
        SETOPTS A$
        SETOPTS $00C20240000000000000000000000000$
        `, { validationChecks: 'all' });
        expectNoParserLexerErrors(result);
        expectNoValidationErrors(result);
    });

    test('Check Precision Verb', async () => {
        const result = await parse(`
        LET A%=16
        Precision A%
        Precision 1, 3
        Precision A%, A%
        `, { validationChecks: 'all' });
        expectNoParserLexerErrors(result);
        expectNoValidationErrors(result);
    });

    test('Check KeyedFileStatement Verb', async () => {
        const result = await parse(`
        MKEYED "MYFILE",[1:6],[7:10:"N"],0,16
        VKEYED "MYFILE",[1:4:2],[2:1:10],80,1000
        XKEYED "MYFILE",[1:1:10]+[2:1:5],[1:25:2:"D"],[4:12:20],80,1000
        MKEYED "myfile",10,0,500,MODE="CRYPTPASS=test",ERR=Jump
        Jump:
        `, { validationChecks: 'all' });
        expectNoParserLexerErrors(result);
        expectNoValidationErrors(result);
    });

    test('1. If statement test #66', async () => {
        const result = await parse(`
        if 1<>0 rd_table_pfx$="@"
        if 2 = 3 and 2 = 2
            rd_temp_beg = ""
        endif        
        `, { validationChecks: 'all' });
        expectNoParserLexerErrors(result);
        expectNoValidationErrors(result);
    });
    test('2. If statement test #66', async () => {
        const result = await parse(`
        label1:

        IF "dd"="sd" THEN 
: GOTO label1
        `, { validationChecks: 'all' });
        expectNoParserLexerErrors(result);
        expectNoValidationErrors(result);
    });
    test('3. If statement test #66', async () => {
        const result = await parse(`
        start_stop: ? "start stop"
        exit_prog: ? "exit"
        toSwitch = 123
        switch toSwitch
            case 27;rem escape
                if toSwitch = "EDIT" then
                    exitto exit_prog
                gosub start_stop
            break
        swend
        `, { validationChecks: 'all' });
        expectNoParserLexerErrors(result);
        expectNoValidationErrors(result);
    });
    test('4. If statement test #66', async () => {
        const result = await parse(`
        if "mode" <> "TIME"
            if 2 = 0 break
            if 3 = 0 break
            print "start_stop"
        endif
        `, { validationChecks: 'all' });
        expectNoParserLexerErrors(result);
        expectNoValidationErrors(result);
    });

    test('Rename statement', async () => {
        const result = await parse(`
        tmpname$  = "test"
        newname$  = "test2"
        rename tmpname$ TO newname$
        rename tmpname$, newname$
        rename tmpname$ TO newname$, MODE="REPLACE"
        rename tmpname$ TO newname$, MODE="REPLACE", ERR=Jump

        Jump:
        `);
        expectNoParserLexerErrors(result);
    });

    test('Release usage', async () => {
        const result = await parse(`
        requestSemaphore! = BBjAPI().getGlobalNamespace().getValue()
        requestSemaphore!.release()
        `);
        expectNoParserLexerErrors(result);
    });

    test('Call: fileId as expression', async () => {
        const result = await parse(`
        authpgm$ = "test"
        call authpgm$+"::PRE_AUTHENTICATION", err=*next
        `);
        expectNoParserLexerErrors(result);
    });

    test('Read with err option using symbolic label ref', async () => {
        const result = await parse(`
        ch = 2
        read record (ch,end=*break)log$
        `);
        expectNoParserLexerErrors(result);
    });

    test('Dir statements', async () => {
        const result = await parse(`
        path$ = "test"
        mkdir path$, err=*next
        chdir "REST_WD", err=*next
        rmdir "REST_WD"
        rmdir "REST_WD", err=*next
        `);
        expectNoParserLexerErrors(result);
    });

    test('Array type ref', async () => {
        const result = await parse(`
       
        class public OutputHandler

            field protected String[] strings

            method public String[] createHTML(byte[] bytes)
            methodend
        classend
        `);
        expectNoParserLexerErrors(result);
    });

    test('Sql set statement', async () => {
        const result = await parse(`
        value$ = "test"
        ch=2
        i=3
        sqlset(ch)i,value$
        `);
        expectNoParserLexerErrors(result);
    });

    test('Execute statement', async () => {
        const result = await parse(`
        invokeCommand! = "test"
        execute invokeCommand!, err=Jump
        Jump:
        `);
        expectNoParserLexerErrors(result);
    });

    test('Check DEF FN... verb', async () => {
        const result = await parse(`
        DEF FNA(Z)=Z*5
        LET Y=FNA(4)

        DEF FNGCF(X,Y)
            IF FPT(X)<>0 OR FPT(Y)<>0 THEN FNERR 41
            WHILE X<>0
                LET TEMP=X, X=MOD(Y,X), Y=TEMP
            WEND
            RETURn Y
        FNEND
        `);
        expectNoParserLexerErrors(result);
    });

    test('Check WHILE verb', async () => {
        const result = await parse(`
            A = 0
            B = 10
            WHILE A < B
                A = A + 1
                PRINT A        
            WEND
        `);
        expectNoParserLexerErrors(result);
    });

    test('Check WAIT verb', async () => {
        const result = await parse(`
            WAIT 123
        `);
        expectNoParserLexerErrors(result);
        expectToContainAstNodeType(result, isWaitStatement);
    });

    test('Check SWITCH...CASE...SWEND verb', async () => {
        const result = await parse(`
            LVL = 3
            SWITCH LVL
                CASE 0
                CASE 1; PRINT "Easy"; BREAK
                CASE 2; PRINT "Middle"; BREAK
                CASE DEFAULT; PRINT "Hard"; BREAK
            SWEND
        `);
        expectNoParserLexerErrors(result);
        expectToContainAstNodeType(result, isSwitchStatement);
        expectToContainAstNodeType(result, isSwitchCase);
    });

    test('Check SQLPREP verb', async () => {
        const result = await parse(`
            SQLOPEN(1)"General Ledger"
            SQLPREP(1)"Create table april96 (id integer primary key, price integer(10,2))"
            SQLEXEC(1)
            SQLPREP(1)"Insert into april96 values (?,?)"
            LOOP:
            INPUT "Id>", id$
            INPUT "Price>", price$
            SQLEXEC(1) id$, price$
            GOTO LOOP
        `);
        expectNoParserLexerErrors(result);
        expectToContainAstNodeType(result, isSqlPrepStatement);
    });

    test('Check SQLCLOSE verb', async () => {
        const result = await parse(`
            Start: SQLOPEN(1)"General Ledger"
                SQLCLOSE(1)
                SQLCLOSE(1,ERR=Labl)
                return
            Labl: STOP
        `);
        expectNoParserLexerErrors(result);
        expectToContainAstNodeType(result, isSqlCloseStatement);
    });

    test('Check RELEASE verb', async () => {
        const result = await parse(`
            RELEASE 123
            RELEASE
        `);
        expectNoParserLexerErrors(result);
        expectToContainAstNodeType(result, isExitWithNumberStatement);
    });

    test('Check REDIM verb', async () => {
        const result = await parse(`
            Start:  DIM fin$:tmpl(0,ind=0)
                    LET fin$=fin(0,ind=0)
                    REDIM fin$
                    REDIM fin$,fin$,ERR=ErrorLabel
            ErrorLabel: STOP
        `);
        expectNoParserLexerErrors(result);
        expectToContainAstNodeType(result, isRedimStatement);
    });

    test('Check ADDR verb', async () => {
        const result = await parse(`
            ADDR "MYPROG"
            ADDR "MYPROG", ERR=ErrorLabel
            ErrorLabel: STOP
        `);
        expectNoParserLexerErrors(result);
        expectToContainAstNodeType(result, isAddrStatement);
    });


    test('Check CLIPFROMSTR verb', async () => {
        //documentation: https://documentation.basis.cloud/BASISHelp/WebHelp/commands/bbj-commands/clipboard_verbs_and_functions_bbj.htm
        //1=TEXT
        const result = await parse(`
            Start:  str$ = "Test!"
                    CLIPFROMSTR 1,str$
                    CLIPFROMSTR 1,str$,ERR=ErrorLabel
            ErrorLabel: STOP
        `);
        expectNoParserLexerErrors(result);
        expectToContainAstNodeType(result, isClipFromStrStatement);
    });

    test('Check CLOSE verb', async () => {
        const result = await parse(`
            Start:  CLOSE (1)
                    CLOSE (1,ERR=ErrorLabel)
            ErrorLabel: STOP
        `);
        expectNoParserLexerErrors(result);
        expectToContainAstNodeType(result, isCloseStatement);
    });

    test('Check GOSUB verb', async () => {
        const result = await parse(`
            Start:  GOSUB func
                    STOP
            func:   REM SUBROUTINE
                    LET A=50; LET B=A * C / 2; PRINT B
                    RETURN
        `);
        expectNoParserLexerErrors(result);
        expectToContainAstNodeType(result, isGotoStatement);
    });

    test('Check GOTO verb', async () => {
        const result = await parse(`
            start:  GOTO region
                    STOP
            region: REM and so on
        `);
        expectNoParserLexerErrors(result);
        expectToContainAstNodeType(result, isGotoStatement);
    });

    describe("Check PRINT/WRITE verb", () => {
        test("With Jump labels", async() => {
            const result = await parse(`
                    WRITE (0, ERR=ErrorJump,END=EndJump) str$
                    PRINT (0, ERR=ErrorJump,END=EndJump) str$
                    ? (0) str$
                ErrorJump: exit
                EndJump: exit
            `);
            expectNoParserLexerErrors(result);
            expectToContainAstNodeType(result, isPrintStatement);
        });

        test("With DIR option", async() => {
            const result = await parse(`
                WRITE "Hallo!"
                WRITE (0, DIR=-1) "?"
            `);
            expectNoParserLexerErrors(result);
            expectToContainAstNodeType(result, isPrintStatement);
        });

        test("With IND option", async () => {
            const result = await parse(`
                WRITE (0, IND=0) "Pardon?!"
                PRINT (0, IND=0) "Pardon?!"
            `);
            expectNoParserLexerErrors(result);
            expectToContainAstNodeType(result, isPrintStatement);
        });

        test("With KEY option", async () => {
            const result = await parse(`
                WRITE (0, KEY="key") "value"

                REM Format of IP:Port not documented well enough
                REM https://documentation.basis.cloud/BASISHelp/WebHelp/commands/write_verb.htm
                REM WRITE (0, KEY="127.0.0.1") "ip-value"
                REM WRITE (0, KEY="127.0.0.1":8080) "ip-value"
            `);
            expectNoParserLexerErrors(result);
            expectToContainAstNodeType(result, isPrintStatement);
        });

        test("With TBL option", async () => {
            const result = await parse(`
                    WRITE (0, TBL=TableLine) "abcdef"
                    PRINT (0, TBL=TableLine) "abcdef"
                TableLine: REM TODO add TABLE verb here
            `);
            expectNoParserLexerErrors(result);
            expectToContainAstNodeType(result, isPrintStatement);
        });

        test("With TIM option", async () => {
            const result = await parse(`
                    WRITE (0, TIM=5, ERR=ErrorJump) "123456"
                    PRINT (0, TIM=5, ERR=ErrorJump) "123456"
                ErrorJump: exit
            `);
            expectNoParserLexerErrors(result);
            expectToContainAstNodeType(result, isPrintStatement);
        });

    });

    test('Check LET verb', async () => {
        //TODO what about matrix operations?
        //https://documentation.basis.cloud/BASISHelp/WebHelp/commands/let_verb.htm
        const result = await parse(`
            C = 5
            LET C=100
        `);
        expectNoParserLexerErrors(result);
        expectToContainAstNodeType(result, isLetStatement);
    });

    test('Return statement without result', async () => {
        const result = await parse(`
        GOSUB funcNoReturn

        funcNoReturn:
            PRINT "we do something and RETURN"
            RETURN
        `);
        expectNoParserLexerErrors(result);
    });

    test('Return statement with lowcase', async () => {
        const result = await parse(`
        GOSUB funcWithReturn

        funcWithReturn:
            return
        `);
        expectNoParserLexerErrors(result);
    });

    test('ClientObject - access with @. Issue: #57', async () => {
        const result = await parse(`
        declare java.lang.String@ str$
        declare String@ str$
        str$ = new java.lang.String@()
        str$ = new String@()
        str$ = String@.substring(2)
        `);
        expectNoParserLexerErrors(result);
    });

    test("Check INITFILE verb", async() => {
        const result = await parse(`
                INITFILE "TEST",mode="",err=errorCase
                INITFILE "TEST2"
            errorCase:
        `);
        expectNoParserLexerErrors(result);
    });

    test("Check ERASE verb", async() => {
        const result = await parse(`
            ERASE "TEST1",mode="",tim=5,err=errorCase
            ERASE "TEST2",tim=5,err=errorCase
            ERASE "TEST3",err=errorCase
            ERASE "TEST4"
            errorCase:
        `);
        expectNoParserLexerErrors(result);
    });
    test("Check ERASE verb multiple files", async() => {
        const result = await parse(`
            ERASE "TEST1", "TEST2", "TEST3", mode="",tim=5,err=errorCase
            ERASE "TEST1", "TEST2", "TEST3", tim=5,err=errorCase
            ERASE "TEST1", "TEST2", "TEST3", err=errorCase
            ERASE "TEST1", "TEST2", "TEST3"
            errorCase:
        `);
        expectNoParserLexerErrors(result);
    });

    test("Check STRING verb", async () => {
        const result = await parse(`
                 STRING "TEST",mode="",err=errorCase
                 STRING "TEST2"
             errorCase:
         `);
        expectNoParserLexerErrors(result);
    });

    test("Check DIRECT verb", async () => {
        const result = await parse(`
                DIRECT "TEST",10,100,512,ERR=errorCase
                DIRECT "TEST",10,100,512
            errorCase:
        `);
        expectNoParserLexerErrors(result);
    });

    test("Check CALLBACK verb", async () => {
        const result = await parse(`
                CONTEXT = 0
                CALLBACK(ON_CLOSE,handler,CONTEXT,0)
                CALLBACK(ON_CLOSE,handler,CONTEXT)
            handler: ENTER
                REM do something
                EXIT
        `);
        expectNoParserLexerErrors(result);
    });

    test("Check REMOVE_CALLBACK verb", async () => {
        const result = await parse(`
            CONTEXT = 0
            REMOVE_CALLBACK(ON_CLOSE,CONTEXT,0)
            REMOVE_CALLBACK(ON_CLOSE,CONTEXT)
        `);
        expectNoParserLexerErrors(result);
    });

    test("Check mnenonic lowcase", async () => {
        const result = await parse(`
            print 'hide'
            print 'lf'
        `);
        expectNoParserLexerErrors(result);
    });

    test("Check return statement expect no parameter", async () => {
        const result = await parse(`
            gosub lbl1
            release

            lbl1: 
                REM do somethin
                PRINT ""
            return

            lbl2:
                REM do something else
                print ""
            return
        `);
        expectNoParserLexerErrors(result);
    });

    test("Check BACKGROUND statement", async () => {
        const result = await parse(`
                BACKGROUND "Menu"
                BACKGROUND "Menu",ERR=error
            error:
        `);
        expectNoParserLexerErrors(result);
    });

    test("Check DELETE statement", async () => {
        const result = await parse(`
                DELETE
                DELETE label1
                DELETE label1,
                DELETE,label2
                DELETE label1,label2

            label1:
                BACKGROUND "MENU"

            label2:
                BACKGROUND "MENU2"
        `);
        expectNoParserLexerErrors(result);
    });

});