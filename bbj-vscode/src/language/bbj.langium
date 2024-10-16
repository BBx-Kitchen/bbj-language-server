/******************************************************************************
 * Copyright 2023 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/
grammar BBj

import './java-types'

entry Model:
    Library | Program
;

// Main programm
Program:
    Statements*
;

fragment Statements:
    statements+=(Statement | ClassDecl | DefFunction | InterfaceDecl);

Statement:
    SingleStatement ({infer CompoundStatement.statements+=current} (';' statements+=SingleStatement)+)?;


SingleStatement:
    KeywordStatement | //must be the first alternative (otherwise BREAK etc will be handled as NamedElement)
    SqlCloseStatement |
    SqlCommitStatement |
    SqlRollbackStatement |

    AddrStatement |
    ArrayDeclarationStatement |
    BackgroundStatement |
    BeginStatement |
    CallbackStatement |
    CallStatement |
    ChanOptStatement |
    ClearPasswordStatement |
    ClipOperationStatement |
    ClipFileStatement |
    ClipFromStrStatement |
    CloseStatement |
    CommentStatement |
    DeleteStatement |
    DirectStatement |
    DirStatement |
    DropStatement |
    DumpStatement |
    ElseStatement |
    EnterStatement |
    EraseStatement |
    ExecuteStatement |
    ExitToStatement |
    ExitWithNumberStatement |
    ExpressionStatement |
    FileOptStatement |
    FnErrStatement |
    ForStatement |
    FulltextStatement |
    GotoStatement |
    IfEndStatement |
    IfStatement |
    IndexedStatement |
    InitFileStatement |
    KeyedFileStatement |
    LabelDecl |
    LCheckInStatement |
    LetStatement |
    LockStatement |
    MethodReturnStatement |
    NextStatement |
    OnGotoStatement |
    OpenStatement |
    PrecisionStatement |
    PrefixStatement |
    PrintStatement |
    ProcessEvent |
    ReadRecordStatement |
    ReadStatement |
    RedimStatement |
    RemoveCallbackStatement |
    RemoveStatement |
    RenameStatement |
    ResourceCloseStatement |
    RestoreStatement |
    RunStatement |
    SaveStatement |
    SavePStatement |
    SetDayStatement |
    SetErrorStatement |
    SetOptsStatement |
    SetTerminalStatement |
    SetTimeStatement |
    SetTraceStatement |
    SortStatement |
    SqlCloseStatement |
    SqlOpenStatement |
    SqlOpStatement |
    SqlPrepStatement |
    StartStatement |
    StringStatement |
    SwitchStatement |
    ThrowStatement |
    UnlockStatement |
    UntilStatement |
    UpdateLicenseStatement |
    Use |
    VariableDecl |
    WaitStatement |
    WhileEndStatement |
    WhileStatement |
    XCallStatement
;

ClearPasswordStatement:
    'CLEARP' password=Expression (',' level=Expression)?
    ;

ClipOperationStatement:
    ('CLIPCLEAR'|'CLIPLOCK'|'CLIPUNLOCK') ('ERR' '=' err=LabelRef)?
    ;

ClipFileStatement:
    ('CLIPFROMFILE'|'CLIPTOFILE') fmt=Expression ',' file=Expression Err?
    ;

ChanOptStatement:
    'CHANOPT' '(' channelno=Expression Mode? ')' str=Expression
    ;

RemoveStatement:
    'REMOVE' '(' channelno=Expression Key Err? Dom? ')'
    ;

PrefixStatement:
    'PREFIX' str=Expression
    ;

SqlCommitStatement:
    'SQLCOMMIT' '(' sqlchan=Expression Err? ')'
    ;

SqlRollbackStatement:
    'SQLROLLBACK' '(' sqlchan=Expression Err? ')'
    ;

StartStatement:
    START_BREAK
    | 'START' int1=Expression (',' int2=Expression)? Err? (',' fileid=Expression)?
    ;

LockStatement:
    'LOCK' '(' channelno=Expression Err? ')'
    ;

UnlockStatement:
    'UNLOCK' '(' channelno=Expression Err? ')'
    ;

DeleteStatement:
    DELETE_STANDALONE
    | 'DELETE' lineRefA=LabelRef comma?=ENDLINE_PRINT_COMMA?
    | 'DELETE' comma?=',' lineRefB=LabelRef
    | 'DELETE' lineRefA=LabelRef comma?=',' lineRefB=LabelRef
    ;

BackgroundStatement:
    'BACKGROUND' str=Expression Err?;

CallbackStatement:
    'CALLBACK' '(' eventType=[LibEventType:ValidName] ',' publicProgramEntryPoint=Expression ',' contextID=Expression (',' controlID=Expression)? ')'
    ;

DumpStatement:
    'DUMP' ('(' channelno=Expression Mode? Err? Ind? ')')?
    ;

FileOptStatement:
    'FILEOPT' str1=Expression Mode? Err?
    ;

FulltextStatement:
    'FULLTEXT' fileid=Expression ',' template=Expression ',' keyfield=Expression Mode? Err?
    ;

IndexedStatement:
    'INDEXED' fileid=Expression ',' records=Expression ',' recsize=Expression Mode? Err?
    ;

RemoveCallbackStatement:
    'REMOVE_CALLBACK' '(' eventType=[LibEventType:ValidName] ',' contextID=Expression (',' controlID=Expression)? ')'
    ;

ResourceCloseStatement:
    'RESCLOSE' '(' handle=Expression Err? ')'
    ;

RestoreStatement:
    'RESTORE' lineref=LabelRef
    ;

SaveStatement:
    'SAVE' (fileid=Expression (',' int=Expression)?)?
    ;

SavePStatement:
    'SAVEP' (filename=Expression (',' passwordOrCreate=Expression (',' create=Expression)?)?)?
    ;

SetDayStatement:
    'SETDAY' string=Expression
    ;

SetTerminalStatement:
    'SETTERM' alias=Expression Mode? Err?
    ;

SetTimeStatement:
    'SETTIME' num=Expression Err?
    ;

SetTraceStatement:
    'SETTRACE' ('(' channelno=Expression Mode? Err? ')')?
    ;

SortStatement:
    'SORT' fileid=Expression ',' keysize=Expression ',' records=Expression Mode? Err?
    ;

UpdateLicenseStatement:
    'UPDATELIC' ('ERR' '=' lineref=LabelRef)?
    ;

XCallStatement:
    'XCALL' argument=Expression Mode? Err? Tim? (',' exprlist+=Expression)*
    ;

InitFileStatement:
    'INITFILE' file=Expression Options?
;

LCheckInStatement:
    'LCHECKIN' '(' handle=Expression Err? ')'
    ;

EraseStatement:
    'ERASE' items+=Expression (',' items+=(Option | Expression))*
;

StringStatement:
    'STRING' file=Expression Mode? Err?
;

DefFunction returns DefFunction:
    'DEF' name=FeatureName '(' (parameters+=FunctionParameter (',' parameters+=FunctionParameter)*)? ')' (
        '=' value=Expression
        | (body += (DefReturn | Statement))* FNEND
    );

DefReturn:
    'RETURN' returnValue=Expression;

FunctionParameter returns NamedElement: name=FeatureName;

FnErrStatement: 'FNERR' errorCode=NumberLiteral;

DirectStatement:
    'DIRECT' fileId=Expression ',' keySize=Expression ',' records=Expression ',' recSize=Expression Err?
;

CommentStatement:
    {infer CommentStatement} COMMENT; // add content back hen we need to show comment

Use:
    'use' (bbjFilePath=BBjFilePath bbjClass=[BbjClass:ValidName]) | 
    'use' javaClassName=QualifiedJavaClassName
;

VariableDecl returns VariableDecl:
    'declare' 'auto'? type=[Class:QualifiedClassName] (array?='[' ']')? name=FeatureName;

Assignment:
    instanceAccess?='#'? variable=MemberCall '=' value=Expression;

ClassDecl returns BbjClass:
    'CLASS' Visibility Static name=ValidName 
        Extends?
        ('IMPLEMENTS' implements+=[Class:QualifiedClassName])? (',' implements+=[Class:QualifiedClassName])*  (';' comments+=CommentStatement)?
    (members+=ClassMember | Comments)*
    'CLASSEND'
;
InterfaceDecl returns BbjClass:
    interface?='INTERFACE' Visibility name=ValidName Extends? (';' comments+=CommentStatement)?
        (members+=MethodDecl | Comments)*
    'INTERFACEEND'
;

fragment Static:
    static?='STATIC'?
;
fragment Visibility:
    visibility=Modifier?
;

Modifier returns string:
  'PUBLIC'|'PRIVATE'|'PROTECTED'
;

fragment Extends:
    ('EXTENDS' extends+=[Class:QualifiedClassName] (',' extends+=[Class:QualifiedClassName])*)
;

fragment Comments:
    comments+=CommentStatement+
;

ClassMember returns ClassMember:
    FieldDecl | MethodDecl
;

FieldDecl returns FieldDecl:
    'FIELD' Visibility Static type=[Class:QualifiedClassName] (array?='[' ']')? name=FeatureName ('=' init=Expression)?  (';' comments+=CommentStatement)?
;

MethodDecl returns MethodDecl:
    'METHOD' Visibility Static (returnType=[Class:QualifiedClassName] (array?='[' ']')? )? name=ValidName '(' (params+=ParameterDecl (',' params+=ParameterDecl)*)? ')' (';' comments+=CommentStatement)?
    Comments?
    (
        (body+=Statement)*
        endTag='METHODEND'
    )?
;

MethodReturnStatement:
    METHODRET_END | ('METHODRET' return=Expression)
;

ParameterDecl returns VariableDecl:
    {infer ParameterDecl} type=[Class:QualifiedClassName] (array?='[' ']')? name=FeatureName
;

/**
 * https://documentation.basis.cloud/BASISHelp/WebHelp/commands/dim_verb.htm
 */
ArrayDeclarationStatement:
    'DIM' items+= ArrayDecl (',' items+=ArrayDecl)* Err?
;

ArrayDecl returns ArrayDecl:
    name=FeatureName
    (
        (':' template=Expression)
        | (
            ('[' dimensions+=Expression (',' dimensions+=Expression)* ']')?
            ('(' size=Expression (',' init=Expression)? ')')? // set size and init
          )
    )
;

RedimStatement:
    'REDIM' arrays+=Expression (',' arrays+=Expression)* Err?
;

LabelDecl returns LabelDecl:
    name=ValidName':'
;

ForStatement:
    // TODO check `to` evaluates to a number
    'FOR' init=Assignment 'TO' to=Expression  ('STEP' step=Expression)?
;

UntilStatement:
    // REPEAT .. UNTIL Verb
    'UNTIL' condition=Expression
;

NextStatement:
    NEXT_BREAK
    | NEXT_ID variable=[VariableDecl:FeatureName]
;

IfStatement:
    'IF' condition=Expression 'THEN'?
;

ElseStatement:
    'ELSE' {infer ElseStatement};

IfEndStatement:
    ('ENDIF' | 'FI') {infer IfEndStatement};


WhileStatement:
    'WHILE' condition=Expression
;

WhileEndStatement:
    'WEND' {infer WhileEndStatement};

SwitchStatement:
    'SWITCH' value=Expression cases+=SwitchCase* ('CASE' 'DEFAULT' (';')? (defaultCase+=Statement)*)? 'SWEND';

SwitchCase:
    LabelDecl? 'CASE' value=Expression (';')? (body+=Statement)*;

GotoStatement:
    kind=('GOTO' | 'GOSUB') target=LabelRef
;

OnGotoStatement:
    'ON' int=Expression kind=('GOTO' | 'GOSUB') targets+=LabelRef (',' targets+=LabelRef)*
    ;


LabelRef infers Expression:
    SymbolicLabelRef | UserLabelRef
;

UserLabelRef infers LabelRef:
   {infer UserLabelRef} label=[LabelDecl:ValidName]
;

SymbolicLabelRef infers LabelRef:
    {infer SymbolicLabelRef} label=[LibSymbolicLabelDecl:SYMBOLIC_LABEL_NAME]
;

KeywordStatement:
    kind=( 'BREAK' | 'BYE' | 'CONTINUE' | 'DENUM' | 'END' | 'ENDTRACE' | 'ESCAPE' | 'FLOATINGPOINT' | 'REPEAT' | 'RESET' | 'RETRY' | 'RETURN' | 'STOP')
;

ExitWithNumberStatement:
    kind='EXIT' | 'RELEASE' exitVal=NUMBER?;

ExitToStatement:
    'EXITTO' target=LabelRef
;

SetErrorStatement:
    kind=('SETERR' | 'SETESC') target=(LabelRef | NUMBER)
;

OpenStatement:
    // TODO check channelno is int and fileid is string
    'OPEN' WithChannelAndOptions fileid=Expression
;


LetStatement:
    'LET'? assignments+=Assignment (',' assignments+=Assignment)*
;

PrintStatement:
    PRINT_STANDALONE_NL
    | 
    (
        (
            (('?' | 'PRINT' | 'WRITE') record?='RECORD'?)
            | (record?=('PRINTRECORD' | 'WRITERECORD'))
        )
        WithChannelAndOptions? (items+=OutputItem (',' items+=OutputItem)*)? ENDLINE_PRINT_COMMA?
    )
    ;


fragment WithChannelAndOptions infers WithChannelAndOptions:
    '(' channelno=Expression? Options? ')'
;

/**
 * Adds a comma separated parameter list: (',' PARAM_NAME+=Expression)+
 */
fragment Options:
    (',' options+=Option)+
;

Option:
    key=ValidName '=' value=(Expression | LabelRef)
;

/**
 * Add optional parameter ,ERR=LabelRef
 */
fragment Err:
    ',' 'ERR' '=' err=LabelRef
;

fragment Dom:
    ',' 'DOM' '=' dom=LabelRef
;

fragment Mode:
    ',' 'MODE' '=' mode=Expression
;

fragment Key:
    ',' 'KEY' '=' key=Expression
    ;

fragment Ind:
    ',' 'IND' '=' index=Expression
    ;

fragment Tim:
    ',' 'TIM' '=' index=Expression
    ;

CallStatement:
    'CALL' fileid=Expression Err? (',' expressions+=Expression)*
;

DropStatement:
    'DROP' fileid=Expression Err?
;

RunStatement:
    'RUN' fileid=Expression Err?
;

ExecuteStatement:
    'EXECUTE' expression=Expression Err?
;

RenameStatement:
    'RENAME' from=Expression ('TO' | ',') to=Expression Mode? Err?
;

/**
 * See https://documentation.basis.cloud/BASISHelp/WebHelp/commands/write_verb.htm
 */
OutputItem:
    Expression | OtherItem
;

OtherItem:
    '*' //treats an asterisk as a null field
    | ('IOL=' iol=LabelRef) //Refers to the IOLIST statement
;

/**
 * NOTE: READ, INPUT, EXTRACT, and FIND use the same syntax as READ and READ RECORD.
 */
ReadStatement:
    kind=READ_KINDS record?='RECORD'? WithChannelAndOptions? (items+=InputItem (','items+=InputItem)* )?
;

READ_KINDS returns string:
    'READ' | 'INPUT' | 'EXTRACT' | 'FIND'
;

ReadRecordStatement infers ReadStatement:
    kind=READ_RECORD_KINDS WithChannelAndOptions? (items+=InputItem (','items+=InputItem)* )?
;

READ_RECORD_KINDS returns string:
    'READRECORD' | 'INPUTRECORD' | 'EXTRACTRECORD' | 'FINDRECORD'
;

InputItem:
    InputVariable | Expression | OtherItem
;

/**
 * See https://documentation.basis.cloud/BASISHelp/WebHelp/commands/read_verb.htm
 */
InputVariable:
    {infer InputVariable} ( SymbolRef ('[ALL]' | options=VerifyOptions)?) // TODO SymbolRef '[ALL]' is array access
;

VerifyOptions:
    ':(' elements+=VerifyOption (',' elements+=VerifyOption)* (',' elements+=LastVerifyOption)?')'
;

VerifyOption:
    key=StringLiteral '=' lineref=LabelRef
;

LastVerifyOption:
    ('LEN=' min=Expression ',' max=Expression) // LEN=intA,intB 
    | min=Expression // numvar:(4) num A numeric expression can impose range and precision on the numeric input
;

AddrStatement:
    'ADDR' fileid=StringLiteral Err?
;

ClipFromStrStatement:
    'CLIPFROMSTR' fmt=NumberLiteral ',' str=Expression Err?
;

SqlOpenStatement:
    'SQLOPEN' '(' sqlchan=Expression Mode? Err? ')' datasourcename=Expression
;

SqlPrepStatement:
    'SQLPREP' '(' sqlchan=Expression Err? ')' str=Expression
;

SqlCloseStatement:
    'SQLCLOSE' '(' sqlchan=Expression Err? ')'
;

SqlOpStatement:
    kind = ('SQLEXEC' | 'SQLSET') '(' sqlchan=Expression Err? ')' (exprs+=Expression (',' exprs+=Expression)*)?
;


CloseStatement:
    'CLOSE'  WithChannelAndOptions?
;

WaitStatement:
    // In BBj, num can be a fractional number accurate to a millisecond.
    'WAIT' time=Expression
;

ThrowStatement:
    'THROW' expression=Expression (',' number=Expression)? Err?
;

ProcessEvent:
    {infer ProcessEvent} 'PROCESS_EVENTS' Tim? Err?
;

BeginStatement:
    kind=('BEGIN' | 'CLEAR') ('EXCEPT' except+=SymbolRef '[ALL]'? (','  except+=SymbolRef '[ALL]'?)*)?
;

EnterStatement:
   'ENTER' (variables+=InputVariable (',' variables+=InputVariable)* Err?)?
;

SetOptsStatement:
    'SETOPTS' opts=Expression
;

PrecisionStatement:
    'PRECISION' value=Expression (',' digits=Expression)?
;

/*
MKEYED fileid,keysize,records,recsize{,MODE=string}{,ERR=lineref}
MKEYED fileid,keydef{,keydef...},records,recsize{,MODE=string}{,ERR=lineref}
*/
KeyedFileStatement:
    kind=('MKEYED'|'VKEYED'|'XKEYED')
    fileid=Expression 
    ',' (
          (keydefs+=KeyDef (',' keydefs+=KeyDef)*)
        | keysize=Expression
    )
    ',' records=Expression
    ',' recsize=Expression
    Mode?
    Err?
;

/*
 * Key definition. Each keydef has the following syntax:
 * segment{+ segment...}
 */
KeyDef:
    segments+=KeySegment ('+' segments+=KeySegment)*
;


/*
 * Each segment has the following syntax:
 * [{ field:} offset:len{ :flags}]
 */
KeySegment:
    // Use BinaryExpression instead of Expression because Expression's stringmask syntax collides with KeySegment syntax
    '[' arg0=BinaryExpression ':' arg1=BinaryExpression (':' arg2=BinaryExpression)? (':' arg3=BinaryExpression)? ']' 
;

DirStatement:
    kind=('MKDIR' | 'RMDIR' | 'CHDIR') path=Expression Err?
;

/* Expressions */

ExpressionStatement:
    // TODO as a program statement literal expressions are not allowed
    // Only membercalls to variables
    expression=PrefixExpression;

EXPR_OPERATOR returns string:
    '^' | '*' |  '/' | '+' | '-' | '<' | '>' | '=' | '<=' | '>=' | '<>' | 'AND' | 'OR'// from the BBx docu
;

Expression:
    BinaryExpression ({infer StringMask.left=current} ':' right=Expression)? //string mask
;

BinaryExpression infers Expression:
    PrefixExpression (
        {infer BinaryExpression.left=current} operator=EXPR_OPERATOR right=(Expression| SymbolicLabelRef)
    )?
;

PrefixExpression infers Expression:
    {infer PrefixExpression} operator=('!'|'-'|'+') expression=MemberCall
    | MemberCall
;

MemberCall infers Expression:
    PrimaryExpression
    (
        {infer MemberCall.receiver=current} '.' member=[ClassMember:FeatureName] (isMethodCall?='(' (args+=ParameterCall (',' args+=ParameterCall)* )? ')')?
        | {infer ArrayElement.receiver=current} "[" indices+=Expression (',' indices+=Expression)* "]"
    )*
    ({infer SubstringExpresion.receiver=current} '(' position = Expression (',' length = Expression)? ')')? // substring
;

ParameterCall:
    expression=Expression
;

PrimaryExpression infers Expression:
    '(' Expression ')'
    | SymbolRef
    | Literal
    | Mnemonic
    | PositionalMnemonic
    | ConstructorCall;

SymbolRef:
    instanceAccess?='#'? symbol=[NamedElement:FeatureName]  (isMethodCall?='(' (args+=Expression (',' args+=Expression)*)? Err?')')?
;

Literal:
    NumberLiteral | StringLiteral
;

NumberLiteral:
    value=NUMBER;

StringLiteral:
    value=(STRING_LITERAL | HEX_STRING)
;

Mnemonic:
    name=MNEMONIC ('(' params+=Expression (',' params+=Expression)*')')?
;

PositionalMnemonic:
    '@(' col=Expression (',' row=Expression)?')'
;

ConstructorCall:
    // TODO: Possibly use ID instead of QualifiedClassName
    'new' class=[Class:QualifiedClassName] 
    (
        ('(' (args+=Expression (',' args+=Expression)*)? ')')
        | ('[' (args+=Expression (',' args+=Expression)*)? ']')
    )
    ;

QualifiedClassName returns string:
    QualifiedBBjClassName | QualifiedJavaClassName;

QualifiedJavaClassName returns string:
    IdAndString ('.' IdAndString)*;

QualifiedBBjClassName returns string:
    BBjFilePath IdAndString;

FeatureName returns string:
    EscapeId | ID_WITH_SUFFIX | IdAndString;

ValidName returns string:
    EscapeId | IdAndString
;

IdAndString returns string:
    'STRING' | ID
;

EscapeId returns string:
    'NEXT' | 'PRINT' | 'AND' | 'OR' | 'ERR' | 'FIELD' | 'WRITE' | 'END' | 'CLIPFROMSTR' | 'ADDR' | 'CONTINUE' | 'SQLOPEN' | 'SQLPREP' | 'MODE'
    | 'READ' | 'INPUT' | 'EXTRACT' | 'FIND' | 'CLOSE' | 'OPEN' | 'WAIT' | 'SETERR' | 'SETESC'| 'CLASS' | 'REDIM'
    | 'BREAK' | 'RETURN' | 'EXIT' | 'PRINTRECORD' | 'READRECORD' | 'WRITERECORD' | 'EXTRACTRECORD' | 'FINDRECORD' | 'INPUTRECORD' | 'RUN' | 'CALL'
    | 'TBL' | 'TIM' | 'BEGIN' | 'CLEAR' | 'ESCAPE' | 'DROP' | 'ENTER' | 'SETOPTS' | 'PRECISION' | 'RELEASE' | 'RENAME' | 'TO'
    | 'MKDIR' | 'RMDIR' | 'CHDIR' | 'EXECUTE' | 'KEY' | 'IND' | 'DIR' | 'ISZ' | 'DEF' | 'STOP' | 'RESET' | 'RETRY'
    | 'BACKGROUND' | 'DELETE' | 'LOCK' | 'UNLOCK' | 'DIM' | 'SQLCOMMIT' | 'SQLROLLBACK' | 'SQLEXEC' | 'SQLCLOSE' | 'START' | 'DOM' | 'CHANOPT'
    | 'FILEOPT'
;

// BBx Library
Library:
    'library' 
    (
        declarations+=LibMember
        | declarations+=LibEventType
    )*
;

//ATTENTION: LibEventType is handled in an extra rule to not pollute the global index for content assist
LibMember:
    LibFunction | LibVariable | LibSymbolicLabel
;

LibFunction returns LibFunction:
    (docu=DOCU)?
    name=ValidName '(' parameters+=LibParameter? (',' parameters+=LibParameter)* ')' ':' returnType=IdAndString
;

LibParameter returns LibParameter:
    name=ValidName optional?='?'?  refByName?='!'? (':' type=IdAndString)?
;

LibVariable returns LibVariable:
    (docu=DOCU)?
    'var' name=ValidName (':' type=IdAndString)?
;

LibSymbolicLabel returns LibSymbolicLabelDecl:
    (docu=DOCU)?
    'label' name=SYMBOLIC_LABEL_NAME
;

LibEventType returns LibEventType:
    (docu=DOCU)?
    'eventType' name=ValidName
    ;

hidden terminal WS: /\s+/;
terminal COMMENT: /([rR][eE][mM])([ \t][^\n\r]*)?[\n\r]+/; // (rEm)(space or tab)(all but linebreak)(linebreak)

terminal DELETE_STANDALONE: /_DELETE_STANDALONE/;
terminal PRINT_STANDALONE_NL: /_PRINT_STANDALONE_NL/;
terminal ENDLINE_PRINT_COMMA: /_endline_print_comma/;
terminal NEXT_BREAK: /_next1/;
terminal NEXT_ID: /_next2/;
terminal METHODRET_END: /_methodret_end/;
terminal FNEND: /_fn_end/;
terminal START_BREAK: /_start/;

terminal BBjFilePath: /::.*::/;

terminal ID_WITH_SUFFIX: /[_a-zA-Z][\w_]*(!|\$|%)/; // Suffix: ! = object, $ = string, % = int, missing = double
terminal ID: /[_a-zA-Z][\w_]*(@)?/;  // @ = ClientObjectClass

terminal NUMBER returns number: /[0-9]+(\.[0-9]*)?|\.[0-9]+/; // .123 is also supported

// "" escapse " inside a string. Also \ as a plain non escape char. Handled in BBjValueConverter
terminal STRING_LITERAL: /"([^"]|"{2})*"/;
terminal HEX_STRING: /\$[0-9a-fA-F]*\$/;  // $0A1E$, $$ = Null string
terminal MNEMONIC: /'[0-9a-zA-Z_]*'/;  // 'hide', 'lf', 'BOX'(10,12,4,4), 'FONT'("pica") 

terminal DOCU:  /\/@@[\s\S]*?@\//;
terminal SYMBOLIC_LABEL_NAME: /\*[a-zA-Z]+/;

// Types
type DefFunctionStatement = DefReturn | Statement;

interface DefFunction extends NamedElement {
    parameters: NamedElement[];
    value?: Expression;
    body?: DefFunctionStatement[];
}

interface VariableDecl extends NamedElement {
    type?: @Class
    array?: boolean
}

interface FieldDecl extends VariableDecl {
    visibility?: string
    static?: boolean
    init?: Expression
    comments: CommentStatement[]
}

interface MethodDecl extends NamedElement {
    visibility?: string
    static?: boolean
    returnType?: @Class
    array?: boolean
    comments: CommentStatement[]
    params: VariableDecl[]
    body: Statement[];
    endTag?: string;
}

interface ArrayDecl extends VariableDecl {
    dimensions: Expression[]
    template: Expression
    size: Expression
    init: Expression
}

interface BbjClass extends Class {
    visibility?: string
    static?: boolean
    interface: boolean
    extends?: @Class[]
    implements?: @Class[]
    comments: CommentStatement[]
    members: ClassMember[]
}

interface LibFunction extends NamedElement {
    parameters: LibParameter[]
    returnType: string
    docu?: string
}

interface LibParameter extends NamedElement {
    type: string
    optional: boolean
    refByName: boolean
}

interface LibVariable extends NamedElement {
    docu?: string
    type?: string
}

interface LibEventType extends NamedElement {
    docu?: string
}

interface LabelDecl extends NamedElement {
}

interface LibSymbolicLabelDecl extends LabelDecl {
    docu?: string
}


type BBjClassMember = FieldDecl | MethodDecl
type ClassMember =  BBjClassMember | JavaMember
