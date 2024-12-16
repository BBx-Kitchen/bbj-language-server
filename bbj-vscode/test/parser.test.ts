import { AstNode, EmptyFileSystem, LangiumDocument } from 'langium';
import { AstUtils } from 'langium';
import { expectError, parseHelper } from 'langium/test';
import { beforeAll, describe, expect, test } from 'vitest';
import { createBBjServices } from '../src/language/bbj-module';
import { CompoundStatement, LetStatement, Library, Model, OutputItem, PrintStatement, Program, ReadStatement, StringLiteral, SymbolRef, isAddrStatement, isCallStatement, isClipFromStrStatement, isCloseStatement, isCommentStatement, isCompoundStatement, isExitWithNumberStatement, isGotoStatement, isLetStatement, isLibrary, isPrintStatement, isProgram, isRedimStatement, isRunStatement, isSqlCloseStatement, isSqlPrepStatement, isSwitchCase, isSwitchStatement, isWaitStatement } from '../src/language/generated/ast';

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
        expect(AstUtils.streamAst(document.parseResult.value).some(predicate)).toBeTruthy();
    }

    beforeAll(() => services.shared.workspace.WorkspaceManager.initializeWorkspace([]));

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
        `, { validation: true });
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
        `, { validation: true });
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
        `, { validation: true });
        expectNoParserLexerErrors(result);
        expectNoValidationErrors(result);

        const program = result.parseResult.value as Program;
        const printStmt = program.statements.slice(-1).pop() as PrintStatement;
        const refContainer = (ref: OutputItem) => (ref as SymbolRef).symbol.ref?.$container
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
        `, { validation: true });
        expectNoParserLexerErrors(result);
        expectNoValidationErrors(result);
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
        `, { validation: true });
        expectNoParserLexerErrors(result);
        //TODO expectNoValidationErrors(result);
    });

    test('Multiple Array declaration and access tests', async () => {
        const result = await parse(`
        let rd_num_files = 123
        dim rd_open_tables$[1:rd_num_files],rd_open_opts$[1:rd_num_files],rd_open_chans$[1:rd_num_files],rd_open_tpls$[1:rd_num_files]
        `, { validation: true });
        expectNoParserLexerErrors(result);
        expectNoValidationErrors(result);
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
        `, { validation: true });
        expectNoParserLexerErrors(result);
        //TODO expectNoValidationErrors(result);
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
        `, { validation: true });
        expectNoParserLexerErrors(result);
        //TODO expectNoValidationErrors(result);
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
        `, { validation: true });
        expectNoParserLexerErrors(result);
        expectNoValidationErrors(result);
    });

    test('Check substring expression ', async () => {
        const result = await parse(`
        let serverfile = 1
        let NAME$ = "name"
        NAME$(1,5); rem substring
        NAME$(10); rem substring

        compat$ = stbl("!COMPAT","THOROUGHBRED_IF47=TRUE")

        let x$ = ""
        if x$(10,10) = "" then print "if47" ; rem substring
        if len(cvs(x$(10,10),3)) = 0 then print "if47" ; rem substring

        bytes = dec(fin(serverfile)(1,4))
        a$=STR(1234)(1,2)
        `, { validation: true });
        expectNoParserLexerErrors(result);
        expectNoValidationErrors(result);
    });

    test('Check substring other cases ', async () => {
        const result = await parse(`
        new String()(1)
        `, { validation: true });
        expectNoParserLexerErrors(result);
        //TODO expectNoValidationErrors(result);
    });

    test('Use Symbolic label in a verb', async () => {
        const result = await parse(`
        serverfile$ = "test"
        open (7, err=*next)serverfile$
        `, { validation: true });
        expectNoParserLexerErrors(result);
        expectNoValidationErrors(result);
    });

    test('Check readrecord and similar', async () => {
        const result = await parse(`
        READRECORD(1,IND=2,ERR=9500)A$
        WRITERECORD(1,IND=2,ERR=9500)A$
        PRINTRECORD(1,IND=2,ERR=9500)A$
        INPUTRECORD(1,IND=2,ERR=9500)A$
        EXTRACTRECORD(1,IND=2,ERR=9500)A$
        FINDRECORD(1,IND=2,ERR=9500)A$
        `, { validation: true });
        expectNoParserLexerErrors(result);
        expectNoValidationErrors(result);
    });

    test('Check read and similar, with record', async () => {
        const result = await parse(`
        READ RECORD(1,IND=2,ERR=9500)A$
        WRITE RECORD(1,IND=2,ERR=9500)A$
        PRINT RECORD(1,IND=2,ERR=9500)A$
        INPUT RECORD(1,IND=2,ERR=9500)A$
        EXTRACT RECORD(1,IND=2,ERR=9500)A$
        FIND RECORD(1,IND=2,ERR=9500)A$
        `, { validation: true });
        expectNoParserLexerErrors(result);
        expectNoValidationErrors(result);
    });

    test('Check CALL and RUN', async () => {
        const result = await parse(`
        RUN "TEST", ERR=errorCase
        RUN "TEST2"
        CALL "bus.bbj::setUpdateLocation", mapRC%, mapUser$, mapPassword$, mapVendor$, mapApplication$, mapVersion$, mapLevel%, mapLocation
        X!=23
        CALL "subprog",(X!), ERR=errorCase
        errorCase: STOP
        `, { validation: true });
        expectNoParserLexerErrors(result);
        //TODO expectNoValidationErrors(result);
        expectToContainAstNodeType(result, isRunStatement);
        expectToContainAstNodeType(result, isCallStatement);
    });

    test('Check PROCESS_EVENT Parameters', async () => {
        const result = await parse(`
        process_events,err=*same
        process_events, TIM = 28, err=*next
        `, { validation: true });
        expectNoParserLexerErrors(result);
        expectNoValidationErrors(result);
    });

    test('Check Reserved keywords', async () => {
        const result = await parse(`
        CLASS public MyClass

            METHOD public MyClass open()
            METHODEND
      
        classend
        `, { validation: true });
        expectNoParserLexerErrors(result);
        expectNoValidationErrors(result);
    });

    test('Check Open Verb optional params keywords', async () => {
        const result = await parse(`
        OPEN (unt,mode="O_CREATE,O_TRUNC",TIM=12)"path/"+"html.png"
        OPEN (unt,TIM=12)"path/"+"html.png"
        OPEN (unt,ISZ=0,TIM=5,mode="",ERR=errorCase)"path/"+"html.png"
        OPEN (unt)"path/"+"html.png"
        errorCase:
        `, { validation: true });
        expectNoParserLexerErrors(result);
        expectNoValidationErrors(result);
    });

    test('Check SQLOpen Verb', async () => {
        const result = await parse(`
        SQLOPEN(1,mode="SQLDriverConnect",err=*next)"datasource"
        SQLOPEN(1,err=*next)"datasource"
        SQLOPEN(1)"datasource"
        `, { validation: true });
        expectNoParserLexerErrors(result);
        expectNoValidationErrors(result);
    });

    test('Check Begin Clear Verb', async () => {
        const result = await parse(`
        dim PARAMS[2]
        foo$ = ""

        BEGIN
        BEGIN EXCEPT foo$, PARAMS[ALL], foo$
        CLEAR
        CLEAR EXCEPT foo$, PARAMS[ALL], foo$
        `, { validation: true });
        expectNoParserLexerErrors(result);
        expectNoValidationErrors(result);
    });

    test('Check Drop Verb', async () => {
        const result = await parse(`
        DROP "TEST.BBX", ERR=*next
        DROP "TEST.BBX"
        `, { validation: true });
        expectNoParserLexerErrors(result);
        expectNoValidationErrors(result);
    });

    test('Check Exit Verbs', async () => {
        const result = await parse(`
        RETURN
        END
        BYE
        BREAK
        CONTINUE
        ESCAPE
        `, { validation: true });
        expectNoParserLexerErrors(result);
        expectNoValidationErrors(result);
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
        `, { validation: true });
        expectNoParserLexerErrors(result);
        expectNoValidationErrors(result);
    });
    test('Enter Verb standalone', async () => {
        const result = await parse(`
        someVar$ = "TEST"
        ENTER
        someVar$ = "TEST2"; REM expect no error
        `, { validation: true });
        expectNoParserLexerErrors(result);
        expectNoValidationErrors(result);
    });
    test('Check REPEAT..UNTIL Verb', async () => {
        const result = await parse(`
        LOOP_EXIT=0
        REPEAT
            LOOP_EXIT = LOOP_EXIT + 1
        UNTIL LOOP_EXIT=10
        `, { validation: true });
        expectNoParserLexerErrors(result);
        expectNoValidationErrors(result);
    });

    test('Check SETOPTS Verb', async () => {
        const result = await parse(`
        LET A$=$02$
        SETOPTS A$
        SETOPTS $00C20240000000000000000000000000$
        `, { validation: true });
        expectNoParserLexerErrors(result);
        expectNoValidationErrors(result);
    });

    test('Check Precision Verb', async () => {
        const result = await parse(`
        LET A%=16
        Precision A%
        Precision 1, 3
        Precision A%, A%
        `, { validation: true });
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
        `, { validation: true });
        expectNoParserLexerErrors(result);
        expectNoValidationErrors(result);
    });

    test('1. If statement test #66', async () => {
        const result = await parse(`
        if 1<>0 rd_table_pfx$="@"
        if 2 = 3 and 2 = 2
            rd_temp_beg = ""
        endif        
        `, { validation: true });
        expectNoParserLexerErrors(result);
        expectNoValidationErrors(result);
    });
    test('2. If statement test #66', async () => {
        const result = await parse(`
        label1:

        IF "dd"="sd" THEN 
: GOTO label1
        `, { validation: true });
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
        `, { validation: true });
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
        `, { validation: true });
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
        `, { validation: true });
        expectNoParserLexerErrors(result);
        expectNoValidationErrors(result);
    });

    test('Release usage', async () => {
        const result = await parse(`
        requestSemaphore! = BBjAPI().getGlobalNamespace().getValue()
        requestSemaphore!.release()
        `, { validation: true });
        expectNoParserLexerErrors(result);
        //TODO expectNoValidationErrors(result);
    });

    test('Call: fileId as expression', async () => {
        const result = await parse(`
        authpgm$ = "test"
        call authpgm$+"::PRE_AUTHENTICATION", err=*next
        `, { validation: true });
        expectNoParserLexerErrors(result);
        expectNoValidationErrors(result);
    });

    test('Read with err option using symbolic label ref', async () => {
        const result = await parse(`
        ch = 2
        read record (ch,end=*break)log$
        `, { validation: true });
        expectNoParserLexerErrors(result);
        expectNoValidationErrors(result);
    });

    test('Dir statements', async () => {
        const result = await parse(`
        path$ = "test"
        mkdir path$, err=*next
        chdir "REST_WD", err=*next
        rmdir "REST_WD"
        rmdir "REST_WD", err=*next
        `, { validation: true });
        expectNoParserLexerErrors(result);
        expectNoValidationErrors(result);
    });

    test('Array type ref', async () => {
        const result = await parse(`
       
        class public OutputHandler

            field protected String[] strings

            method public String[] createHTML(byte[] bytes)
            methodend
        classend
        `, { validation: true });
        expectNoParserLexerErrors(result);
        //TODO expectNoValidationErrors(result);
    });

    test('Check SQLSET statement', async () => {
        const result = await parse(`
        value$ = "test"
        ch=2
        i=3
        sqlset(ch)i,value$
        `, { validation: true });
        expectNoParserLexerErrors(result);
        expectNoValidationErrors(result);
    });

    test('Execute statement', async () => {
        const result = await parse(`
        invokeCommand! = "test"
        execute invokeCommand!, err=Jump
        Jump:
        `, { validation: true });
        expectNoParserLexerErrors(result);
        expectNoValidationErrors(result);
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
        `, { validation: true });
        expectNoParserLexerErrors(result);
        expectNoValidationErrors(result);
    });

    test('Check WHILE verb', async () => {
        const result = await parse(`
            A = 0
            B = 10
            WHILE A < B
                A = A + 1
                PRINT A        
            WEND
        `, { validation: true });
        expectNoParserLexerErrors(result);
        expectNoValidationErrors(result);
    });

    test('Check WAIT verb', async () => {
        const result = await parse(`
            WAIT 123
        `, { validation: true });
        expectNoParserLexerErrors(result);
        expectNoValidationErrors(result);
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
        `, { validation: true });
        expectNoParserLexerErrors(result);
        //TODO expectNoValidationErrors(result);
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
        `, { validation: true });
        expectNoParserLexerErrors(result);
        expectNoValidationErrors(result);
        expectToContainAstNodeType(result, isSqlPrepStatement);
    });

    test('Check SQLCLOSE verb', async () => {
        const result = await parse(`
            Start: SQLOPEN(1)"General Ledger"
                SQLCLOSE(1)
                SQLCLOSE(1,ERR=Labl)
                return
            Labl: STOP
        `, { validation: true });
        expectNoParserLexerErrors(result);
        expectNoValidationErrors(result);
        expectToContainAstNodeType(result, isSqlCloseStatement);
    });

    test('Check RELEASE verb', async () => {
        const result = await parse(`
            RELEASE 123
            RELEASE
        `, { validation: true });
        expectNoParserLexerErrors(result);
        expectNoValidationErrors(result);
        expectToContainAstNodeType(result, isExitWithNumberStatement);
    });

    test('Check REDIM verb', async () => {
        const result = await parse(`
            Start:  DIM fin$:tmpl(0,ind=0)
                    LET fin$=fin(0,ind=0)
                    REDIM fin$
                    REDIM fin$,fin$,ERR=ErrorLabel
            ErrorLabel: STOP
        `, { validation: true });
        expectNoParserLexerErrors(result);
        //TODO expectNoValidationErrors(result);
        expectToContainAstNodeType(result, isRedimStatement);
    });

    test('Check ADDR verb', async () => {
        const result = await parse(`
            ADDR "MYPROG"
            ADDR "MYPROG", ERR=ErrorLabel
            ErrorLabel: STOP
        `, { validation: true });
        expectNoParserLexerErrors(result);
        expectNoValidationErrors(result);
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
        `, { validation: true });
        expectNoParserLexerErrors(result);
        expectNoValidationErrors(result);
        expectToContainAstNodeType(result, isClipFromStrStatement);
    });

    test('Check CLOSE verb', async () => {
        const result = await parse(`
            Start:  CLOSE (1)
                    CLOSE (1,ERR=ErrorLabel)
            ErrorLabel: STOP
        `, { validation: true });
        expectNoParserLexerErrors(result);
        expectNoValidationErrors(result);
        expectToContainAstNodeType(result, isCloseStatement);
    });

    test('Check GOSUB verb', async () => {
        const result = await parse(`
            Start:  GOSUB func
                    STOP
            func:   REM SUBROUTINE
                    LET C=2;
                    LET A=50; LET B=A * C / 2; PRINT B
                    RETURN
        `, { validation: true });
        expectNoParserLexerErrors(result);
        expectNoValidationErrors(result);
        expectToContainAstNodeType(result, isGotoStatement);
    });

    test('Check GOTO verb', async () => {
        const result = await parse(`
            start:  GOTO region
                    STOP
            region: REM and so on
        `, { validation: true });
        expectNoParserLexerErrors(result);
        expectNoValidationErrors(result);
        expectToContainAstNodeType(result, isGotoStatement);
    });

    describe("Check PRINT/WRITE verb", () => {
        test("With Jump labels", async () => {
            const result = await parse(`
                    LET str$="hallo"
                    WRITE (0, ERR=ErrorJump,END=EndJump) str$
                    PRINT (0, ERR=ErrorJump,END=EndJump) str$
                    ? (0) str$
                ErrorJump: exit
                EndJump: exit
            `, { validation: true });
            expectNoParserLexerErrors(result);
            expectNoValidationErrors(result);
            expectToContainAstNodeType(result, isPrintStatement);
        });

        test("With DIR option", async () => {
            const result = await parse(`
                WRITE "Hallo!"
                WRITE (0, DIR=-1) "?"
            `, { validation: true });
            expectNoParserLexerErrors(result);
            expectNoValidationErrors(result);
            expectToContainAstNodeType(result, isPrintStatement);
        });

        test("With IND option", async () => {
            const result = await parse(`
                WRITE (0, IND=0) "Pardon?!"
                PRINT (0, IND=0) "Pardon?!"
            `, { validation: true });
            expectNoParserLexerErrors(result);
            expectNoValidationErrors(result);
            expectToContainAstNodeType(result, isPrintStatement);
        });

        test("With KEY option", async () => {
            const result = await parse(`
                WRITE (0, KEY="key") "value"

                REM Format of IP:Port not documented well enough
                REM https://documentation.basis.cloud/BASISHelp/WebHelp/commands/write_verb.htm
                REM WRITE (0, KEY="127.0.0.1") "ip-value"
                REM WRITE (0, KEY="127.0.0.1":8080) "ip-value"
            `, { validation: true });
            expectNoParserLexerErrors(result);
            expectNoValidationErrors(result);
            expectToContainAstNodeType(result, isPrintStatement);
        });

        test("With TBL option", async () => {
            const result = await parse(`
                    WRITE (0, TBL=TableLine) "abcdef"
                    PRINT (0, TBL=TableLine) "abcdef"
                TableLine: REM TODO add TABLE verb here
            `, { validation: true });
            expectNoParserLexerErrors(result);
            expectNoValidationErrors(result);
            expectToContainAstNodeType(result, isPrintStatement);
        });

        test("With TIM option", async () => {
            const result = await parse(`
                    WRITE (0, TIM=5, ERR=ErrorJump) "123456"
                    PRINT (0, TIM=5, ERR=ErrorJump) "123456"
                ErrorJump: exit
            `, { validation: true });
            expectNoParserLexerErrors(result);
            expectNoValidationErrors(result);
            expectToContainAstNodeType(result, isPrintStatement);
        });

    });

    test('Check LET verb', async () => {
        //TODO what about matrix operations?
        //https://documentation.basis.cloud/BASISHelp/WebHelp/commands/let_verb.htm
        const result = await parse(`
            C = 5
            LET C=100
        `, { validation: true });
        expectNoParserLexerErrors(result);
        expectNoValidationErrors(result);
        expectToContainAstNodeType(result, isLetStatement);
    });

    test('Return statement without result', async () => {
        const result = await parse(`
        GOSUB funcNoReturn

        funcNoReturn:
            PRINT "we do something and RETURN"
            RETURN
        `, { validation: true });
        expectNoParserLexerErrors(result);
        expectNoValidationErrors(result);
    });

    test('Return statement with lowcase', async () => {
        const result = await parse(`
        GOSUB funcWithReturn

        funcWithReturn:
            return
        `, { validation: true });
        expectNoParserLexerErrors(result);
        expectNoValidationErrors(result);
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

    test("Check INITFILE verb", async () => {
        const result = await parse(`
                INITFILE "TEST",mode="",err=errorCase
                INITFILE "TEST2"
            errorCase:
        `, { validation: true });
        expectNoParserLexerErrors(result);
        expectNoValidationErrors(result);
    });

    test("Check ERASE verb", async () => {
        const result = await parse(`
            ERASE "TEST1",mode="",tim=5,err=errorCase
            ERASE "TEST2",tim=5,err=errorCase
            ERASE "TEST3",err=errorCase
            ERASE "TEST4"
            errorCase:
        `, { validation: true });
        expectNoParserLexerErrors(result);
        expectNoValidationErrors(result);
    });
    test("Check ERASE verb multiple files", async () => {
        const result = await parse(`
            ERASE "TEST1", "TEST2", "TEST3", mode="",tim=5,err=errorCase
            ERASE "TEST1", "TEST2", "TEST3", tim=5,err=errorCase
            ERASE "TEST1", "TEST2", "TEST3", err=errorCase
            ERASE "TEST1", "TEST2", "TEST3"
            errorCase:
        `, { validation: true });
        expectNoParserLexerErrors(result);
        expectNoValidationErrors(result);
    });

    test("Check STRING verb", async () => {
        const result = await parse(`
                 STRING "TEST",mode="",err=errorCase
                 STRING "TEST2"
             errorCase:
        `, { validation: true });
        expectNoParserLexerErrors(result);
        expectNoValidationErrors(result);
    });

    test("Check DIRECT verb", async () => {
        const result = await parse(`
                DIRECT "TEST",10,100,512,ERR=errorCase
                DIRECT "TEST",10,100,512
            errorCase:
        `, { validation: true });
        expectNoParserLexerErrors(result);
        expectNoValidationErrors(result);
    });

    test("Check CALLBACK verb", async () => {
        const result = await parse(`
                CONTEXT = 0
                CALLBACK(ON_CLOSE,handler,CONTEXT,0)
                CALLBACK(ON_CLOSE,handler,CONTEXT)
            handler: ENTER
                REM do something
                EXIT
        `, { validation: true });
        expectNoParserLexerErrors(result);
        expectNoValidationErrors(result);
    });

    test("Check REMOVE_CALLBACK verb", async () => {
        const result = await parse(`
            CONTEXT = 0
            REMOVE_CALLBACK(ON_CLOSE,CONTEXT,0)
            REMOVE_CALLBACK(ON_CLOSE,CONTEXT)
        `, { validation: true });
        expectNoParserLexerErrors(result);
        expectNoValidationErrors(result);
    });

    test("Check mnenonic lowcase", async () => {
        const result = await parse(`
            print 'hide'
            print 'lf'
        `, { validation: true });
        expectNoParserLexerErrors(result);
        expectNoValidationErrors(result);
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
        `, { validation: true });
        expectNoParserLexerErrors(result);
        expectNoValidationErrors(result);
    });

    test("Check CLEARP statement", async () => {
        const result = await parse(`
            CLEARP "password",123
            CLEARP "hallo"
        `, { validation: true });
        expectNoParserLexerErrors(result);
        expectNoValidationErrors(result);
    });

    test("Check CLIPCLEAR statement", async () => {
        const result = await parse(`
            CLIPCLEAR ERR=labelError
            CLIPCLEAR
        labelError:
        `, { validation: true });
        expectNoParserLexerErrors(result);
        expectNoValidationErrors(result);
    });

    test("Check CLIPFROMFILE statement", async () => {
        const result = await parse(`
            CLIPFROMFILE "format1","file.txt",ERR=labelError
            CLIPFROMFILE "format1","file.txt"
        labelError:
        `, { validation: true });
        expectNoParserLexerErrors(result);
        expectNoValidationErrors(result);
    });

    test("Check CLIPTOFILE statement", async () => {
        const result = await parse(`
            CLIPTOFILE "format1","file.txt",ERR=labelError
            CLIPTOFILE "format1","file.txt"
        labelError:
        `, { validation: true });
        expectNoParserLexerErrors(result);
        expectNoValidationErrors(result);
    });

    test("Check CLIPLOCK/UNLOCK statement", async () => {
        const result = await parse(`
            CLIPLOCK ERR=labelError
            CLIPLOCK
            CLIPUNLOCK ERR=labelError
            CLIPUNLOCK
        labelError:
        `, { validation: true });
        expectNoParserLexerErrors(result);
        expectNoValidationErrors(result);
    });

    test("Check DENUM statement", async () => {
        const result = await parse(`
            DENUM
        `, { validation: true });
        expectNoParserLexerErrors(result);
        expectNoValidationErrors(result);
    });

    test("Check DUMP statement", async () => {
        const result = await parse(`
            DUMP
            DUMP (0,MODE="NAME=X$,NAME=I")
            DUMP (0,MODE="CHANNELS")
            DUMP (1)
            DUMP (1,ERR=labelError)
        labelError:
        `, { validation: true });
        expectNoParserLexerErrors(result);
        expectNoValidationErrors(result);
    });

    test("Check ENDTRACE statement", async () => {
        const result = await parse(`
            ENDTRACE
        `, { validation: true });
        expectNoParserLexerErrors(result);
        expectNoValidationErrors(result);
    });

    test("Check FILEOPT statement", async () => {
        const result = await parse(`
            FILEOPT "test"
            FILEOPT "test",MODE="a"
            FILEOPT "test",ERR=labelError
            FILEOPT "test",MODE="a",ERR=labelError
        labelError:
        `, { validation: true });
        expectNoParserLexerErrors(result);
        expectNoValidationErrors(result);
    });

    test("Check FLOATINGPOINT statement", async () => {
        const result = await parse(`
            BEGIN
            LET T=999999.99999
            PRINT T
            FLOATINGPOINT
        `, { validation: true });
        expectNoParserLexerErrors(result);
        expectNoValidationErrors(result);
    });

    test("Check FULLTEXT statement", async () => {
        const result = await parse(`
            FULLTEXT "file.db","ID:C(32),DOCUMENT:C(32767*)","ID"
            FULLTEXT "file.db","ID:C(32),DOCUMENT:C(32767*)","ID",MODE="abc"
            FULLTEXT "file.db","ID:C(32),DOCUMENT:C(32767*)","ID",ERR=labelError
            FULLTEXT "file.db","ID:C(32),DOCUMENT:C(32767*)","ID",MODE="123",ERR=labelError
        labelError:
        `, { validation: true });
        expectNoParserLexerErrors(result);
        expectNoValidationErrors(result);
    });

    test("Check INDEXED statement", async () => {
        const result = await parse(`
            INDEXED "TEST2",300,190
            INDEXED "TEST2",300,190,ERR=labelError
            INDEXED "TEST2",300,190,MODE="XXX"
            INDEXED "TEST2",300,190,MODE="XXX",ERR=labelError
        labelError:
        `, { validation: true });
        expectNoParserLexerErrors(result);
        expectNoValidationErrors(result);
    });

    test("Check LCHECKIN statement", async () => {
        const result = await parse(`
            LCHECKIN(1)
            LCHECKIN(1,ERR=labelError)
        labelError:
        `, { validation: true });
        expectNoParserLexerErrors(result);
        expectNoValidationErrors(result);
    });

    test("Check RESCLOSE statement", async () => {
        const result = await parse(`
            RESCLOSE(2)
            RESCLOSE(1,ERR=labelError)
        labelError:
        `, { validation: true });
        expectNoParserLexerErrors(result);
        expectNoValidationErrors(result);
    });

    test("Check RESTORE statement", async () => {
        const result = await parse(`
            RESTORE labelError
        labelError:
        `, { validation: true });
        expectNoParserLexerErrors(result);
        expectNoValidationErrors(result);
    });

    test("Check SAVE statement", async () => {
        const result = await parse(`
            SAVE
            SAVE "file.txt"
            SAVE "file.txt",100
        `, { validation: true });
        expectNoParserLexerErrors(result);
        expectNoValidationErrors(result);
    });

    test("Check SAVEP statement", async () => {
        const result = await parse(`
            REM ' SAVEP with the unclearable password.
            SAVEP "program.bbj", 0
            SAVEP "program.bbj", $$, 0
            SAVEP "program.bbj"

            REM ' SAVEP with the password "password"
            SAVEP "program.bbj", "password", 0
            SAVEP "program.bbj", "password"
            SAVEP
        `, { validation: true });
        expectNoParserLexerErrors(result);
        expectNoValidationErrors(result);
    });

    test("Check SETDAY statement", async () => {
        const result = await parse(`
            SETDAY "09/15/96"
            SETDAY "non-sense"
        `, { validation: true });
        expectNoParserLexerErrors(result);
        expectNoValidationErrors(result);
    });

    test("Check SETTERM statement", async () => {
        const result = await parse(`
            SETTERM "alias"
            SETTERM "alias",MODE="123"
            SETTERM "alias",ERR=labelError
            SETTERM "alias",MODE="123",ERR=labelError
        labelError:
        `, { validation: true });
        expectNoParserLexerErrors(result);
        expectNoValidationErrors(result);
    });

    test("Check SETTIME statement", async () => {
        const result = await parse(`
            SETTIME 10.5
            SETTIME 24.5,ERR=labelError
        labelError:
        `, { validation: true });
        expectNoParserLexerErrors(result);
        expectNoValidationErrors(result);
    });

    test("Check SETTRACE statement", async () => {
        const result = await parse(`
            SETTRACE
            SETTRACE(1)
            SETTRACE(1,ERR=labelError)
            SETTRACE(1,MODE="hallo")
            SETTRACE(1,MODE="xxx",ERR=labelError)
        labelError:
        `, { validation: true });
        expectNoParserLexerErrors(result);
        expectNoValidationErrors(result);
    });

    test("Check SORT statement", async () => {
        const result = await parse(`
            SORT "TEST.BBX",10,100,ERR=labelError
            SORT "TEST.BBX",10,100,MODE="123",ERR=labelError
            SORT "TEST.BBX",10,100,MODE="XXX"
            SORT "TEST.BBX",10,100
        labelError:
        `, { validation: true });
        expectNoParserLexerErrors(result);
        expectNoValidationErrors(result);
    });

    test.skip("Check TABLE statement", async () => {
        const result = await parse(`
            REM EBCDIC to ASCII conversion (ISO 8859/1)
            TABLE FF 00 01 02 03 9C 09 86 7F 97 8D 8E 0B 0C 0D 0E 0F 10 11 12 13 9D 85 08 87 18 19 92 8F 1C 1D 1E
        `, { validation: true });
        expectNoParserLexerErrors(result);
        expectNoValidationErrors(result);
    });

    test("Check UPDATELIC statement", async () => {
        const result = await parse(`
            UPDATELIC
            UPDATELIC ERR=labelError
        labelError:
        `, { validation: true });
        expectNoParserLexerErrors(result);
        expectNoValidationErrors(result);
    });

    test("Check XCALL statement", async () => {
        const result = await parse(`
            REM Hello_caller.bbx (compile with pro5cpl)
            LET NAME$="Nico"
            LET RESPONSE$=""
            XCALL "hello.bbj",NAME$,RESPONSE$
            PRINT "Response was: ",RESPONSE$

            REM Other stuff
            XCALL "hello.bbj",MODE="mode"
            XCALL "hello.bbj",ERR=labelError,NAME$,RESPONSE$
            XCALL "hello.bbj",TIM=123,NAME$,RESPONSE$
        labelError:
        `, { validation: true });
        expectNoParserLexerErrors(result);
        expectNoValidationErrors(result);
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

    test("Check DIM statement", async () => {
        const result = await parse(`
                DIM A$(32000,$01$)
                DIM B$(9),X[2,3],A$(9,"A")
                DIM ARRAY$[10:20](10,"*")
                DIM REC$:TEMP$
                DIM B$(9),ERR=errorLabel
            errorLabel:
        `);
        expectNoParserLexerErrors(result);
    });

    test("Check FOR... NEXT statement", async () => {
        const result = await parse(`
            FOR i=1 TO 10
                PRINT "Number ", i
            NEXT
        `);
        expectNoParserLexerErrors(result);
    });

    test("Check INTERFACE statement", async () => {
        const result = await parse(`
            interface Nameable
                method public BBjString name()
            interfaceend

            interface Person extends Nameable
                method public BBjNumber id()
            interfaceend

            class Alice implements Nameable
                method public BBjString name()
                    methodret "Alice"
                methodend
            classend

            class Bob implements Person
                method public BBjNumber id()
                    methodret 12345
                methodend
                method public BBjString name()
                    methodret "Bob"
                methodend
            classend
        `);
        expectNoParserLexerErrors(result);
    });

    test("Check INTERFACE statement with two methods", async () => {
        const result = await parse(`
            interface Chris
                method public String doIt(String foo!)
                method public int doIt(String foo2!)
            interfaceend
        `, { validation: true });
        expectNoParserLexerErrors(result);
    });

    test("Check LOCK and UNLOCK statement", async () => {
        const result = await parse(`
                LOCK(1,err=labelError)
                UNLOCK(1,err=labelError)
            labelError:
                LOCK(2)
                UNLOCK(2)
        `, { validation: true });
        expectNoParserLexerErrors(result);
        expectNoValidationErrors(result);
    });

    test("Check STOP statement", async () => {
        const result = await parse(`
            STOP
        `, { validation: true });
        expectNoParserLexerErrors(result);
        expectNoValidationErrors(result);
    });

    test("Check RESET statement", async () => {
        const result = await parse(`
            RESET
        `, { validation: true });
        expectNoParserLexerErrors(result);
        expectNoValidationErrors(result);
    });

    test("Check RETRY statement", async () => {
        const result = await parse(`
            RETRY
        `, { validation: true });
        expectNoParserLexerErrors(result);
        expectNoValidationErrors(result);
    });

    test("Check START statement", async () => {
        const result = await parse(`
                START
                START 255
                START 123,456
                START 123,456,"file.bbx"
                START 123,"file.bbx"
                START 255,err=labelError
                START 123,456,err=labelError
                START 123,456,err=labelError,"file.bbx"
                START 123,err=labelError,"file.bbx"
            labelError:
        `, { validation: true });
        expectNoParserLexerErrors(result);
        expectNoValidationErrors(result);
    });

    test('Check SQLROLLBACK statement', async () => {
        const result = await parse(`
                SQLROLLBACK(1)
                SQLROLLBACK(2,err=LabelError)
            labelError:
        `, { validation: true });
        expectNoParserLexerErrors(result);
        expectNoValidationErrors(result);
    });

    test('Check SQLCOMMIT statement', async () => {
        const result = await parse(`
            SQLOPEN(1,MODE="AUTO_COMMIT=OFF")"MyData"
            SQLPREP(1)"INSERT INTO mytable VALUES ('10', 'Sample Record')"
            SQLEXEC(1)
            SQLCOMMIT(1,err=labelError)
            SQLCLOSE(1)
        labelError:
            SQLCOMMIT(1)
        `, { validation: true });
        expectNoParserLexerErrors(result);
        expectNoValidationErrors(result);
    });

    test('Check SQLEXEC statement', async () => {
        const result = await parse(`
            LET SQL1=123
            LET LAST_NAME$ = "Bob"
            SQLPREP (SQL1)"select * from CUSTOMERS where LAST_NAME > ?"
            REM Fill the ? gap with LAST_NAME$
            SQLEXEC (SQL1)LAST_NAME$
        `, { validation: true });
        expectNoParserLexerErrors(result);
        expectNoValidationErrors(result);
    });

    test('Check ON ... GOSUB statement', async () => {
        const result = await parse(`
                let A = 1
                on A gosub label1,label2
                on A gosub label1
                A = -1
                on A gosub label1,label2
            label1:
            label2:
        `, { validation: true });
        expectNoParserLexerErrors(result);
        expectNoValidationErrors(result);
    });

    test('Check PREFIX statement', async () => {
        const result = await parse(`
            PREFIX "/BASIS/SOURCE/MS/ /PRO5/UTIL/"
            prefix """C:\\Program Files\\"" ""C:\\temp\\"""
        `, { validation: true });
        expectNoParserLexerErrors(result);
        expectNoValidationErrors(result);
    });

    test('Check REMOVE statement', async () => {
        const result = await parse(`
                REMOVE(1,KEY="TEST KEY",ERR=label1,DOM=label1)
                REMOVE(1,KEY="TEST KEY")
                REMOVE(1,KEY="TEST KEY",ERR=label1)
                REMOVE(1,KEY="TEST KEY",DOM=label1)
            label1:
        `, { validation: true });
        expectNoParserLexerErrors(result);
        expectNoValidationErrors(result);
    });

    test('Check remove as function name', async () => {
        const result = await parse(`
            class public RemoveTest
                method public void delete(Object obj!)
                    obj!.remove(1)
                methodend
            classend
        `, { validation: true });
        expectNoParserLexerErrors(result);
    });

    test('Check INPUT statement', async () => {
        const result = await parse(`
            INPUT "Id>", id$
            INPUT "Price>", price$
            INPUT (0,ERR=1000)@(5,20),'CE',"ENTER NAME:"
        `, { validation: true });
        expectNoParserLexerErrors(result);
        expectNoValidationErrors(result);
    });

    test('Check CHANOPT statement', async () => {
        const result = await parse(`
            CHANOPT (1,MODE="123") "BAUD=9600,MODE=8N1,XON/XOFF"
        `, { validation: true });
        expectNoParserLexerErrors(result);
        expectNoValidationErrors(result);
    });

    test('Check Save as Id', async () => {
        const result = await parse(`
        class public DTNote
        
        method public boolean save(BBjString text!)
            methodret 1
        methodend
        
        classend
        `, { validation: true });
        expectNoParserLexerErrors(result);
    });

    test('Print trailing comma in compound statement', async () => {
        const result = await parse(`
        let adv = 1
        print 'fl', "9", chr(adv), fill(adv, $0a$),; rem  Move down CDS037 grid
        `, { validation: true });
        expectNoParserLexerErrors(result);
        expectNoValidationErrors(result);
    });

    test('Switch case single line', async () => {
        const result = await parse(`
        a$ = "2"

        switch a$
            case "1"; print "First"; break
            case "2"; print "Second"; break
            case "3"; print "Third"; break
            case default; print "Not in top three, try again"
        swend
        `, { validation: true });
        expectNoParserLexerErrors(result);
        expectNoValidationErrors(result);
    });

    test('Issue 163 READ', async () => {
        const result = await parse(`
            let so70 = 1111
            read(so70, knum=3, dir=0, end=*next)
            read(so70, knum=3, dir=0, end=*next)
        `, { validation: true });
        expectNoParserLexerErrors(result);
        expectNoValidationErrors(result);
    });

    test('Single SQLEXEC without parameters', async () => {
        const result = await parse(`
            SQLEXEC(1)
        `, { validation: true });
        expectNoParserLexerErrors(result);
        expectNoValidationErrors(result);
    });

    test('Single SQLEXEC with REM', async () => {
        const result = await parse(`
            SQLEXEC(1) ; REM tada
        `, { validation: true });
        expectNoParserLexerErrors(result);
        expectNoValidationErrors(result);
    });

    test('Multiply without spaces', async () => {
        const result = await parse(`
            let p_width = 100
            let p_hPadding = 20
            let imageW = int(p_width + (2*p_hPadding))
        `, { validation: true });
        expectNoParserLexerErrors(result);
        expectNoValidationErrors(result);
    });

    test('Switch-Default without semicolon', async () => {
        const result = await parse(`
            LET t$ = "hallo"
            SWITCH t$
                CASE 1
                    PRINT "1"
                    BREAK
                CASE 2
                    PRINT "2"
                    BREAK
                CASE DEFAULT
                    PRINT "default"
            SWEND
        `, { validation: true });
        expectNoParserLexerErrors(result);
        expectNoValidationErrors(result);
    });

    test('Switch-Default with semicolon', async () => {
        const result = await parse(`
            LET t = 123
            SWITCH t; CASE 1; PRINT "1"; BREAK; CASE 2; PRINT "2"; BREAK; CASE DEFAULT; PRINT "default"; SWEND
        `, { validation: true });
        expectNoParserLexerErrors(result);
        expectNoValidationErrors(result);
    });

    test('issue 190, SWITCH CASEs with REM in-between', async () => {
        const result = await parse(`
            num = 4
            switch (num)
                rem [locale].properties Files
                case 1
                    PRINT
                    break
                rem Jar File
                case 2
                    PRINT
                    break
                rem Zip File
                case 3
                    PRINT
                    break
            swend
        `, { validation: true });
        expectNoParserLexerErrors(result);
        expectNoValidationErrors(result);
    });

    test('issue 187, SWITCH CASE in one line', async () => {
        const result = await parse(`
            input i
            SWITCH i; CASE 1; PRINT "1"; BREAK; CASE DEFAULT; PRINT "default"; SWEND
        `, { validation: true });
        expectNoParserLexerErrors(result);
        expectNoValidationErrors(result);
    });

    test('INPUT standalone #176', async () => {
        const result = await parse(`
            input
            a = 9
        `, { validation: true });
        expectNoParserLexerErrors(result);
        expectNoValidationErrors(result);
    });

    test('INPUT trailing comma #176', async () => {
        const result = await parse(`
            input(0,err=3)'ask'("",4,"Requires at least Visual PRO/5 REV 2.0 or BBj.  "+ "This program will now terminate.","&Terminate:Y"+$0a$),'ee',cfg__trash$,'be',
        `, { validation: true });
        expectNoParserLexerErrors(result);
        expectNoValidationErrors(result);
    });

    test('NEXT with id #175', async () => {
        const result = await parse(`
            for z = 21 to 0 step -1
                z = z * 2
            next z
        `, { validation: true });
        expectNoParserLexerErrors(result);
        expectNoValidationErrors(result);
    });

    test('NEXT with id in compoud statement #175', async () => {
        const result = await parse(`
            for z = 21 to 0 step -1; z = z * 2; next z
        `, { validation: true });
        expectNoParserLexerErrors(result);
        expectNoValidationErrors(result);
    });

    test('NEXT with id combined in compoud statement #175', async () => {
        const result = await parse(`
        m = 10; for z = 21 to 0 step -1; m = m * 2; next z
        m = 10; for z = 21 to 0 step -1; m = m * 2; next

        goto *next
        `, { validation: true });
        expectNoParserLexerErrors(result);
        expectNoValidationErrors(result);
    });

});