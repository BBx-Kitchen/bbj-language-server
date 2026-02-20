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

// Main program
Program:
    Statements*
;

fragment Statements:
    statements+=(Statement | ClassDecl | DefFunction | InterfaceDecl);

Statement:
    SingleStatement ({infer CompoundStatement.statements+=current} (';' statements+=SingleStatement)+)?;


SingleStatement:
    KeywordStatement | //must be the first alternative (otherwise BREAK etc will be handled as NamedElement)
    ReadStatement |
    DreadStatement |
    DataStatement |
    ExtendedInputStatement |
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
    FileOptStatement |
    FileStatement |
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
    RedimStatement |
    RemoveCallbackStatement |
    RemoveStatement |
    RenameStatement |
    ResourceCloseStatement |
    RestoreStatement |
    RunStatement |
    SaveStatement |
    SavePStatement |
    SelectStatement |
    SerialStatement |
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
    SwitchCase |
    ThrowStatement |
    UnlockStatement |
    UntilStatement |
    UpdateLicenseStatement |
    Use |
    VariableDecl |
    WaitStatement |
    WhileEndStatement |
    WhileStatement |
    XCallStatement |
    ExpressionStatement
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
    'CHANOPT' '(' channelno=Expression Mode? RPAREN_NO_NL str=Expression
    ;

RemoveStatement:
    'REMOVE' '(' channelno=Expression Key Err? Dom? RPAREN_NL
    ;

PrefixStatement:
    'PREFIX' str=Expression
    ;

SqlCommitStatement:
    'SQLCOMMIT' '(' sqlchan=Expression Err? RPAREN_NL
    ;

SqlRollbackStatement:
    'SQLROLLBACK' '(' sqlchan=Expression Err? RPAREN_NL
    ;

StartStatement:
    START_BREAK
    | 'START' int1=Expression (',' int2=Expression)? Err? (',' fileid=Expression)?
    ;

LockStatement:
    'LOCK' '(' channelno=Expression Err? RPAREN_NL
    ;

UnlockStatement:
    'UNLOCK' '(' channelno=Expression Err? RPAREN_NL
    ;

DeleteStatement:
      'DELETE' lineRefA=LabelRef comma?=ENDLINE_PRINT_COMMA?
    | 'DELETE' comma?=',' lineRefB=LabelRef
    | 'DELETE' lineRefA=LabelRef comma?=',' lineRefB=LabelRef
    ;

BackgroundStatement:
    'BACKGROUND' str=Expression Err?;

CallbackStatement:
    'CALLBACK' '(' eventType=[LibEventType:ValidName] ',' publicProgramEntryPoint=Expression ',' contextID=Expression (',' controlID=Expression)? RPAREN_NL
    ;

DumpStatement:
    'DUMP' ('(' channelno=Expression Mode? Err? Ind? RPAREN_NL)?
    ;


FileStatement:
    ('FILE' | 'XFILE') string1=Expression (',' string2=Expression)? Mode? Err?
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

SerialStatement:
    'SERIAL' fileid=Expression (',' records=Expression ',' recsize=Expression)? Mode? Err?
    ;

RemoveCallbackStatement:
    'REMOVE_CALLBACK' '(' eventType=[LibEventType:ValidName] ',' contextID=Expression (',' controlID=Expression)? RPAREN_NL
    ;

ResourceCloseStatement:
    'RESCLOSE' '(' handle=Expression Err? RPAREN_NL
    ;

RestoreStatement:
    'RESTORE' lineref=LabelRef
    ;

DreadStatement:
    'DREAD' items+=InputItem (',' items+=InputItem)* Err?
;

DataStatement:
    'DATA' values+=Expression (',' values+=Expression)*
;

SaveStatement:
     'SAVE' fileid=Expression (',' int=Expression)?
    ;

SavePStatement:
    'SAVEP' (filename=Expression (',' passwordOrCreate=Expression (',' create=Expression)?)?)?
    ;

SelectStatement:
    'SELECT' '(' channelno=Expression Mode? Err? RPAREN_NO_NL
    template=BinaryExpression
    (':' fields+=BinaryExpression (',' fields+=BinaryExpression)*)?
    'FROM' fileid=Expression
    ('WHERE' where=Expression)?
    ('SORTBY' sortby=Expression)?
    ('LIMIT' limitFirst=Expression ',' limitCount=Expression)?
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
    'SETTRACE' ('(' channelno=Expression Mode? Err? RPAREN_NL)?
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
    'LCHECKIN' '(' handle=Expression Err? RPAREN_NL
    ;

EraseStatement:
    'ERASE' items+=Expression (',' items+=(Option | Expression))*
;

StringStatement:
    'STRING' file=Expression Mode? Err?
;

DefFunction returns DefFunction:
    'DEF' name=FeatureName '(' (parameters+=FunctionParameter (',' parameters+=FunctionParameter)*)? (
        RPAREN_NO_NL '=' value=Expression
        | RPAREN_NL (body += (DefReturn | Statement))* FNEND
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
    'use' javaClass=JavaTypeRef
;

VariableDecl returns VariableDecl:
    'declare' auto?='auto'? type=QualifiedClass (array?='[' ']')? name=FeatureName;

Assignment:
    instanceAccess?='#'? variable=MemberCall '=' value=Expression;

ClassDecl returns BbjClass:
    'CLASS' Visibility Static name=ValidName 
        Extends?
        ('IMPLEMENTS' implements+=QualifiedClass)? (',' implements+=QualifiedClass)*  (';' comments+=CommentStatement)?
    (members+=ClassMember | Comments)*
    'CLASSEND'
;
InterfaceDecl returns BbjClass:
    interface?='INTERFACE' Visibility name=ValidName Extends? (';' comments+=CommentStatement)?
        (members+=InterfaceMethodDecl | Comments)*
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
    ('EXTENDS' extends+=QualifiedClass (',' extends+=QualifiedClass)*)
;

fragment Comments:
    comments+=CommentStatement+
;

ClassMember returns ClassMember:
    FieldDecl | MethodDecl | VariableDecl
;

FieldDecl returns FieldDecl:
    'FIELD' Visibility Static type=QualifiedClass (array?='[' ']')? name=FeatureName ('=' init=Expression)?  (';' comments+=CommentStatement)?
;

MethodDecl returns MethodDecl:
    MethodDeclStart
    Comments?
    (
        (body+=(Statement | DefFunction))*
        endTag='METHODEND'
    )?
;

fragment MethodDeclStart returns MethodDecl:
    'METHOD' Visibility Static (voidReturn?='void' | (returnType=QualifiedClass (array?='[' ']')?) )? name=ValidName '(' (params+=ParameterDecl (',' params+=ParameterDecl)*)? RPAREN (';' comments+=CommentStatement)?
;

InterfaceMethodDecl returns MethodDecl:
   MethodDeclStart
;

MethodReturnStatement:
    METHODRET_END | ('METHODRET' return=Expression)
;

ParameterDecl returns VariableDecl:
    {infer ParameterDecl} type=QualifiedClass (array?='[' ']')? name=FeatureName
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
            ('(' size=Expression (',' init=Expression)? RPAREN)? // set size and init
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
    'WEND' {infer WhileEndStatement}
;

SwitchStatement:
    ('SWITCH' value=Expression)
    | end='SWEND'
;

SwitchCase:
    LabelDecl? 'CASE' (default ?= 'DEFAULT' | value=Expression);

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
    {infer SymbolicLabelRef} label=[LibSymbolicLabelDecl:SymbolicLabelName]
;

KeywordStatement:
    KEYWORD_STANDALONE
    | kind=( 'BREAK' | 'BYE' | 'CONTINUE' | 'DENUM' | 'END' | 'ENDTRACE' | 'ESCAPE' | 'FLOATINGPOINT' | 'REPEAT' | 'RESET' | 'RETRY' | 'RETURN' | 'STOP')
;

ExitWithNumberStatement:
    EXIT_NO_NL exitVal=Expression | kind='EXIT' | RELEASE_NL | RELEASE_NO_NL exitVal=Expression
;

ExitToStatement:
    'EXITTO' target=LabelRef
;

SetErrorStatement:
    kind=('SETERR' | 'SETESC') target=(LabelRef | NUMBER)
;

OpenStatement:
    // TODO check channelno is int and fileid is string
    'OPEN' '(' channelno=Expression? Options? RPAREN_NO_NL fileid=Expression
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
        WithChannelAndOptionsAndOutputItems?
    )
    ;

//actual intent: ('('channelno?options?')')? (items(',' items)*)? ','?
fragment WithChannelAndOptionsAndOutputItems infers WithChannelAndOptionsAndOutputItems:
    '(' channelno=Expression? Options? (
        RPAREN_NL
        | RPAREN_NO_NL items+=OutputItem (',' items+=OutputItem)* ENDLINE_PRINT_COMMA?
        | RPAREN_NO_NL ENDLINE_PRINT_COMMA
    )
    | items+=OutputItem (',' items+=OutputItem)* ENDLINE_PRINT_COMMA?
    | ENDLINE_PRINT_COMMA
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
    ASTERISK_STANDALONE //treats an asterisk as a null field
    | ('IOL=' iol=LabelRef) //Refers to the IOLIST statement
;

/**
 * NOTE: READ, INPUT, EXTRACT, and FIND use the same syntax as READ and READ RECORD.
 */
ReadStatement:
    kind=READ_KINDS record?='RECORD'? WithChannelAndOptionsAndInputItems?
;

ExtendedInputStatement:
    kind=('INPUTN' | 'INPUTE') WithChannelAndOptionsAndInputItems?
;

READ_KINDS returns string:
    'READ' | 'INPUT' | 'EXTRACT' | 'FIND'
;

ReadRecordStatement infers ReadStatement:
    kind=READ_RECORD_KINDS WithChannelAndOptionsAndInputItems?
;

//actual intent: ('('channelno?options?')')? (items(','items)*)?
fragment WithChannelAndOptionsAndInputItems infers WithChannelAndOptionsAndInputItems:
    '(' channelno=Expression? Options? (RPAREN_NL | RPAREN_NO_NL items+=InputItem (','items+=InputItem)* ENDLINE_PRINT_COMMA?)
    | items+=InputItem (','items+=InputItem)* ENDLINE_PRINT_COMMA?
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
    {infer InputVariable} Expression options=VerifyOptions?
;

VerifyOptions:
    ':(' elements+=VerifyOption (',' elements+=VerifyOption)* (',' elements+=LastVerifyOption)? RPAREN_NL
;

VerifyOption:
    key=StringLiteral '=' lineref=(LabelRef | NUMBER)
;

LastVerifyOption:
    ('LEN=' min=Expression ',' max=Expression) // LEN=intA,intB 
    | min=Expression // numvar:(4) num A numeric expression can impose range and precision on the numeric input
;

AddrStatement:
    'ADDR' fileid=Expression Err?
;

ClipFromStrStatement:
    'CLIPFROMSTR' fmt=Expression ',' str=Expression Err?
;

SqlOpenStatement:
    'SQLOPEN' '(' sqlchan=Expression Mode? Err? RPAREN_NO_NL datasourcename=Expression
;

SqlPrepStatement:
    'SQLPREP' '(' sqlchan=Expression Err? RPAREN_NO_NL str=Expression
;

SqlCloseStatement:
    'SQLCLOSE' '(' sqlchan=Expression Err? RPAREN
;

SqlOpStatement:
    kind = ('SQLEXEC' | 'SQLSET') '(' sqlchan=Expression Err? (RPAREN_NL | RPAREN_NO_NL exprs+=Expression (',' exprs+=Expression)*)
;

RPAREN returns string:
    RPAREN_NL | RPAREN_NO_NL
    ;

RPAREN_NO_NL returns string:
    ')'
    ;

CloseStatement:
    'CLOSE'  '(' channelno=Expression? Options? RPAREN_NL
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
    kind=('BEGIN' | 'CLEAR') ('EXCEPT' except+=Expression (','  except+=Expression)*)?
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

Expression:
    BinaryExpression ({infer StringMask.left=current} ':' right=Expression)? //string mask
;


BinaryExpression infers Expression:
    RelationalExpr ({infer BinaryExpression.left=current} operator=('AND'|'OR') right=RelationalExpr)*
    ;

RelationalExpr infers Expression:
    AdditiveExpr ({infer BinaryExpression.left=current} operator=('<' | '>' | '=' | '<=' | '>=' | '<>' ) right=AdditiveExpr)*
    ;

AdditiveExpr infers Expression:
    MultiplicativeExpr ({infer BinaryExpression.left=current} operator=('+' | '-') right=MultiplicativeExpr)*
    ;

MultiplicativeExpr infers Expression:
    ExponentiationExpr ({infer BinaryExpression.left=current} operator=(ASTERISK_EXPRESSION | '/') right=ExponentiationExpr)*
    ;

ExponentiationExpr infers Expression:
    PrefixExpression ({infer BinaryExpression.left=current} operator='^' right=PrefixExpression)*
    ;

PrefixExpression infers Expression:
    {infer PrefixExpression} operator=('!'|'-'|'+') expression=MemberCall
    | MemberCall
    ;

MemberCall infers Expression:
    PrimaryExpression
    (
        {infer MemberCall.receiver=current} '.' member=[NamedElement:FeatureName]
        | {infer ArrayElement.receiver=current} "[" (all?="ALL" | indices+=Expression (',' indices+=Expression)*) "]"
        | {infer MethodCall.method=current} '(' (args+=ParameterCall (',' args+=ParameterCall)* )? Err? RPAREN
    )*
;

ParameterCall:
    expression=Expression
;

PrimaryExpression infers Expression:
    '(' Expression RPAREN
    | SymbolRef
    | Literal
    | Mnemonic
    | PositionalMnemonic
    | ConstructorCall
    | CastExpression
    | SymbolicLabelName
    | BBjTypeRef
    | JavaSymbol
    ;

BBjTypeRef:
    klass=[Class:QualifiedBBjClassName]
    ;

SymbolRef infers Expression:
    {infer SymbolRef} instanceAccess?='#'? symbol=[NamedElement:FeatureName]
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
    MNEMONIC ('(' params+=Expression (',' params+=Expression)*RPAREN)?
;

PositionalMnemonic:
    '@(' col=Expression (',' row=Expression)? RPAREN
;

ConstructorCall:
    'new' klass=QualifiedClass
    (
        ('(' (args+=Expression (',' args+=Expression)*)? RPAREN)
        | ('[' (args+=Expression (',' args+=Expression)*)? ']')
    )
    ;

CastExpression:
    'CAST' '(' castType=QualifiedClass (arrayDims+='[' ']')* ',' value=Expression Err? RPAREN
;

QualifiedClass:
    BBjTypeRef | SimpleTypeRef | JavaTypeRef;

type JavaPackageLike = JavaClass | JavaPackage;

SimpleTypeRef:
    simpleClass=[Class:ID]
    ;

JavaTypeRef:
    pathParts+=JavaSymbol ('.' pathParts+=JavaSymbol)*
    ;

JavaSymbol:
    symbol=[JavaPackageLike:ID];

QualifiedBBjClassName returns string:
    BBjFilePath ID;

FeatureName returns string:
    ID | ID_WITH_SUFFIX;

ValidName returns string:
    ID
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
    name=ValidName '(' parameters+=LibParameter? (',' parameters+=LibParameter)* RPAREN_NO_NL ':' returnType=ID
;

LibParameter returns LibParameter:
    name=ValidName optional?='?'?  refByName?='!'? (':' type=ID)?
;

LibVariable returns LibVariable:
    (docu=DOCU)?
    'var' name=ValidName (':' type=ID)?
;

LibSymbolicLabel returns LibSymbolicLabelDecl:
    (docu=DOCU)?
    'label' name=SymbolicLabelName
;

LibEventType returns LibEventType:
    (docu=DOCU)?
    'eventType' name=ValidName
    ;

SymbolicLabelName returns string: ASTERISK_EXPRESSION ValidName;

hidden terminal WS: /\s+/;
terminal COMMENT: /([rR][eE][mM])([ \t][^\n\r]*)?([\n\r]+)?/; // (rEm)(space or tab)(all but linebreak)(optional linebreak)

terminal KEYWORD_STANDALONE: /_KEYWORD_STANDALONE/;
terminal PRINT_STANDALONE_NL: /_PRINT_STANDALONE_NL/;
terminal ENDLINE_PRINT_COMMA: /_endline_print_comma/;
terminal NEXT_BREAK: /_next1/;
terminal NEXT_ID: /_next2/;
terminal METHODRET_END: /_methodret_end/;
terminal FNEND: /_fn_end/;
terminal START_BREAK: /_start/;
terminal RPAREN_NL: /_rparen_nl/;
terminal RELEASE_NL: /_release_nl/;
terminal RELEASE_NO_NL: /_release_no_nl/;
terminal EXIT_NO_NL: /_exit_no_nl/;

terminal ASTERISK_STANDALONE: /_asterisk_standalone/;
terminal ASTERISK_EXPRESSION: /_asterisk_expression/;

terminal BBjFilePath: /::.*::/;

terminal ID_WITH_SUFFIX: /[_a-zA-Z][\w_]*(!|\$|%)/; // Suffix: ! = object, $ = string, % = int, missing = double
terminal ID: /[_a-zA-Z][\w_]*(@)?/;  // @ = ClientObjectClass

terminal NUMBER returns number: /[0-9]+(\.[0-9]*)?|\.[0-9]+/; // .123 is also supported

// "" escapse " inside a string. Also \ as a plain non escape char. Handled in BBjValueConverter
terminal STRING_LITERAL: /"([^"]|"{2})*"/;
terminal HEX_STRING: /\$[0-9a-fA-F]*\$/;  // $0A1E$, $$ = Null string
terminal MNEMONIC: /'[0-9a-zA-Z_]*'/;  // 'hide', 'lf', 'BOX'(10,12,4,4), 'FONT'("pica") 

terminal DOCU:  /\/@@[\s\S]*?@\//;

// Types
type DefFunctionStatement = DefReturn | Statement;

interface DefFunction extends NamedElement {
    parameters: NamedElement[];
    value?: Expression;
    body?: DefFunctionStatement[];
}

interface VariableDecl extends NamedElement {
    type?: QualifiedClass
    array?: boolean
    auto?: boolean
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
    voidReturn?: boolean
    returnType?: QualifiedClass
    array?: boolean
    comments: CommentStatement[]
    params: VariableDecl[]
    body: (Statement | DefFunction)[];
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
    extends?: QualifiedClass[]
    implements?: QualifiedClass[]
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


type BBjClassMember = FieldDecl | MethodDecl | VariableDecl
type ClassMember =  BBjClassMember | JavaMember
