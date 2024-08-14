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
    statements+=(Statement | ClassDecl | InterfaceDecl);

Statement:
    SingleStatement ({infer CompoundStatement.statements+=current} (';' statements+=SingleStatement)+)?;


SingleStatement:
    CommentStatement | // alt 0
    VariableDecl |
    LetStatement |
    ArrayDeclarationStatement |
    RedimStatement |
    MethodReturnStatement |
    PrintStatement |
    SetErrorStatement |
    ForStatement |
    IfStatement |
    ElseStatement |
    IfEndStatement |
    WhileStatement | // alt 10
    WhileEndStatement |
    GotoStatement |
    KeywordStatement |
    ReturnStatement |
    ExitWithNumberStatement |
    ExitToStatement |
    NextStatement |
    LabelDecl |
    OpenStatement |
    ReadStatement |
    ReadRecordStatement | // alt 20
    CloseStatement |
    WaitStatement |
    ThrowStatement |
    Use |
    ProcessEvent |
    ExpressionStatement |
    SwitchStatement |
    ClipFromStrStatement |
    AddrStatement |
    SqlOpenStatement | // alt 30
    SqlPrepStatement |
    SqlOpStatement |
    SqlCloseStatement |
    CallStatement |
    DropStatement |
    BeginStatement |
    EnterStatement |
    UntilStatement |
    SetOptsStatement |
    PrecisionStatement |
    KeyedFileStatement | // alt 40
    RunStatement |
    RenameStatement |
    DirStatement |
    ExecuteStatement
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
        'METHODEND'//FIXME Need to be forbiden for interfaces
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
    'DIM' items+= ArrayDecl (',' items+=ArrayDecl)*
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
    name=ID':'
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
    NEXT_TOKEN (variable=[VariableDecl:FeatureName])?
;

IfStatement:
    'IF' condition=Expression 'THEN'?
;

ElseStatement:
    'ELSE' {infer ElseStatement};

IfEndStatement:
    ('ENDIF' | 'FI') {infer IfEndStatement};

ReturnStatement:
    ENDLINE_RETURN | 'RETURN' returnValue=Expression;

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
    kind=('END' | 'BYE' | 'BREAK' | 'CONTINUE' | 'ESCAPE' | 'REPEAT')
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
    (
        (('?' | 'PRINT' | 'WRITE') record?='RECORD'?)
        | (record?=('PRINTRECORD' | 'WRITERECORD'))
    )
     WithChannelAndOptions? (items+=OutputItem (',' items+=OutputItem)*)? ENDLINE_PRINT_COMMA?
;


fragment WithChannelAndOptions infers WithChannelAndOptions:
    '(' channelno=Expression? Options? ')'
;

/**
 * Adds a coma separated prameter list: (',' PARAM_NAME+=Expression)+
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
    'RENAME' from=Expression ('TO' | ',') to=Expression (',' 'MODE' '=' mode=Expression)? Err?
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
    'SQLOPEN' '(' sqlchan=Expression (',' 'MODE' '=' mode=Expression)? Err? ')' datasourcename=Expression
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
    {infer ProcessEvent} 'PROCESS_EVENTS' (',' 'TIM' '=' tim=Expression)? Err?
;

BeginStatement:
    kind=('BEGIN' | 'CLEAR') ('EXCEPT' except+=SymbolRef '[ALL]'? (','  except+=SymbolRef '[ALL]'?)*)?
;

EnterStatement:
   'ENTER' variables+=InputVariable (',' variables+=InputVariable)* Err?
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
    (',' 'MODE' '=' mode=Expression)?
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
    value=(STRING | HEX_STRING)
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
    ID ('.' ID)*;

QualifiedBBjClassName returns string:
    BBjFilePath ID;

FeatureName returns string:
    EscapeId | ID_WITH_SUFFIX | ID;

ValidName returns string:
    EscapeId | ID
;

EscapeId returns string:
    'NEXT' | 'PRINT' | 'AND' | 'OR' | 'ERR' | 'FIELD' | 'WRITE' | 'END' | 'CLIPFROMSTR' | 'ADDR' | 'CONTINUE' | 'SQLOPEN' | 'SQLPREP' | 'MODE'
    | 'READ' | 'INPUT' | 'EXTRACT' | 'FIND' | 'CLOSE' | 'OPEN' | 'WAIT' | 'SETERR' | 'SETESC'| 'CLASS' | 'REDIM'
    | 'BREAK' | 'RETURN' | 'EXIT' | 'PRINTRECORD' | 'READRECORD' | 'WRITERECORD' | 'EXTRACTRECORD' | 'FINDRECORD' | 'INPUTRECORD' | 'RUN' | 'CALL'
    | 'TIM' | 'BEGIN' | 'CLEAR' | 'ESCAPE' | 'DROP' | 'ENTER' | 'SETOPTS' | 'PRECISION' | 'RELEASE' | 'RENAME' | 'TO'
    | 'MKDIR' | 'RMDIR' | 'CHDIR' | 'EXECUTE'
;

// BBx Library
Library:
    'library' 
    (declarations+=LibMember)*
;

LibMember:
    LibFunction | LibVariable | LibSymbolicLabel
;

LibFunction returns LibFunction:
    (docu=DOCU)?
    name=ValidName '(' parameters+=LibParameter? (',' parameters+=LibParameter)* ')' ':' returnType=ID
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
    'label' name=SYMBOLIC_LABEL_NAME
;

hidden terminal WS: /\s+/;
terminal COMMENT: /([rR][eE][mM])([ \t][^\n\r]*)?[\n\r]+/; // (rEm)(space or tab)(all but linebreak)(linebreak)

terminal ENDLINE_PRINT_COMMA: /_endline_print_comma/;
terminal ENDLINE_RETURN: /_endline_return/;

terminal NEXT_TOKEN: /_next/;
terminal METHODRET_END: /_methodret_end/;

terminal BBjFilePath: /::.*::/;

terminal ID_WITH_SUFFIX: /[_a-zA-Z][\w_]*(!|\$|%)/; // Suffix: ! = object, $ = string, % = int, missing = double
terminal ID: /[_a-zA-Z][\w_]*/;

terminal NUMBER returns number: /[0-9]+(\.[0-9]*)?|\.[0-9]+/; // .123 is also supported

// "" escapse " inside a string. Also \ as a plain non escape char. Handled in BBjValueConverter
terminal STRING: /"([^"]|"{2})*"/;
terminal HEX_STRING: /\$[0-9a-fA-F]*\$/;  // $0A1E$, $$ = Null string
terminal MNEMONIC: /'[0-9A-Z_]*'/;  // 'BOX'(10,12,4,4) 'FONT'("pica")

terminal DOCU:  /\/@@[\s\S]*?@\//;
terminal SYMBOLIC_LABEL_NAME: /\*[a-zA-Z]+/;

// Types

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
    body: Statement[]
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

interface LabelDecl extends NamedElement {
}

interface LibSymbolicLabelDecl extends LabelDecl {
    docu?: string
}


type BBjClassMember = FieldDecl | MethodDecl
type ClassMember =  BBjClassMember | JavaMember
