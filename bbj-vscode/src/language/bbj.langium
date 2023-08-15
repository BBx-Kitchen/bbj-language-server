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
    CommentStatement |
    VariableDecl |
    LetStatement |
    ArrayDeclarationStatement |
    MethodReturnStatement |
    PrintValue |
    SetErrorStatement |
    ForStatement |
    IfStatement |
    WhileStatement |
    WhileEndStatement |
    GotoStatement |
    ExitStatement |
    ExitWithNumberStatement |
    ExitToStatement |
    NextStatement |
    LabelDecl |
    OpenStatement |
    ReadStatement |
    CloseStatement |
    WaitStatement |
    ThrowStatement |
    Use |
    ProcessEvent |
    ExpressionStatement |
    SwitchStatement |
    ClipFromStrStatement |
    AddrStatement |
    SqlOpenStatement |
    SqlPrepStatement |
    SqlExecStatement |
    SqlCloseStatement
;

CommentStatement: {infer CommentStatement} COMMENT; // add content back hen we need to show comment

Use:
    'use' (bbjFilePath=BBjFilePath bbjClass=[BbjClass:ValidName]) | 
    'use' javaClassName=QualifiedJavaClassName
;

VariableDecl returns VariableDecl:
    'declare' 'auto'? type=[Class:QualifiedClassName] name=FeatureName;

Assignment:
    instanceAccess?='#'? variable=[VariableDecl:FeatureName] '=' value=Expression;

LetStatement:
    'LET'? assignments+=Assignment (',' assignments+=Assignment)*
;

PrintValue:
    // TODO find out where mnemonics can be used and consider to add a mnemonic Expression
    ('?' | 'PRINT' | 'WRITE') 'RECORD'? (value+=(Expression|MNEMONIC) (',' value+=(Expression|MNEMONIC))*)? ENDLINE_PRINT_COMMA?
;

ClassDecl returns BbjClass:
    'CLASS' visibility=Visibility Static name=ValidName 
        Extends?
        ('IMPLEMENTS' implements+=[Class:QualifiedClassName])? (',' implements+=[Class:QualifiedClassName])*  (';' comments+=CommentStatement)?
    (members+=ClassMember | Comments)*
    'CLASSEND'
;
InterfaceDecl returns BbjClass:
    interface?='INTERFACE' visibility=Visibility name=ValidName Extends? (';' comments+=CommentStatement)?
        (members+=MethodDecl | Comments)*
    'INTERFACEEND'
;

fragment Static:
    static?='STATIC'?
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
    'FIELD' visibility=Visibility Static type=[Class:QualifiedClassName] name=FeatureName ('=' init=Expression)?  (';' comments+=CommentStatement)?
;

MethodDecl returns MethodDecl:
    'METHOD' visibility=Visibility Static type=[Class:QualifiedClassName]? name=ValidName '(' (params+=ParameterDecl (',' params+=ParameterDecl)*)? ')' (';' comments+=CommentStatement)?
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
    {infer ParameterDecl} type=[Class:QualifiedClassName] name=FeatureName
;


ArrayDeclarationStatement returns ArrayDecl:
    'DIM' name=FeatureName '[' dimensions+=NUMBER (',' dimensions+=NUMBER)* ']'
;

LabelDecl:
    name=ID':'
;

ForStatement:
    // TODO check to evaluates to a number
    'FOR' init=Assignment 'TO' to=Expression  ('STEP' step=Expression)?
;

NextStatement:
    NEXT_TOKEN (variable=[VariableDecl:FeatureName])?
;

IfStatement:
    'IF' condition=Expression (
        'SLTHEN'?
            then+=Statement
        ('ELSE' else+=Statement)?
    |   
        isMultiline?='MLTHEN'?
            (then+=Statement)*
        ('ELSE'  (else+=Statement)*)?
    ('ENDIF' | 'FI')
    )
;

WhileStatement:
    'WHILE' condition=Expression
;

WhileEndStatement:
    'WEND' {infer WhileEndStatement};

SwitchStatement:
    'SWITCH' value=Expression cases+=SwitchCase* ('CASE' 'DEFAULT' (';')? (defaultCase +=Statement)*)? 'SWEND';

SwitchCase:
    LabelDecl? 'CASE' value=Expression (';')? (body+=Statement)*;

GotoStatement:
    kind=('GOTO' | 'GOSUB') target=[LabelDecl]
;

// FIXME Move to a Library as FieldDeclaration with a flag to get rid of ExitStatement<>SymboRef ambiguities
ExitStatement:
    kind=('RETURN' | 'END' | 'BYE' | 'BREAK' | 'CONTINUE')
;

ExitWithNumberStatement:
    kind = 'EXIT' | 'RELEASE' exitVal = NUMBER?;

ExitToStatement:
    'EXITTO' target=[LabelDecl]
;

SetErrorStatement:
    kind = ('SETERR' | 'SETESC') target=[LabelDecl]
;

OpenStatement:
    // TODO check channelno is int and fileid is string
    'OPEN' '(' channelno=Expression? (',' 'ERR' '=' err=[LabelDecl])?')'fileid=Expression
;

// NOTE:INPUT, EXTRACT, and FIND use the same syntax as READ and READ RECORD.
ReadStatement:
    kind = READ_KINDS (record='RECORD')? ('(' channelno=Expression? Options? ')')? (input+=Expression (','input+=Expression)* )?
;

READ_KINDS returns string:
    'READ' | 'INPUT' | 'EXTRACT' | 'FIND'
; 

AddrStatement:
    'ADDR' fileid=StringLiteral Err?
;

ClipFromStrStatement:
    'CLIPFROMSTR' fmt=NumberLiteral ',' str=Expression (',' ERR=[LabelDecl])?
;

SqlOpenStatement:
    'SQLOPEN' '(' sqlchan= Expression (',' 'MODE' mode=StringLiteral Err?)? ')' datasourcename=Expression
;

SqlPrepStatement:
    'SQLPREP' '(' sqlchan=Expression Err? ')' str=Expression
;

SqlCloseStatement:
    'SQLCLOSE' '(' sqlchan=Expression Err? ')'
;

SqlExecStatement:
    'SQLEXEC' '(' sqlchan=Expression Err? ')' (exprs+=Expression (',' exprs+=Expression)*)?
;

fragment Err:
    (',' 'ERR' '=' err=[LabelDecl])
;

fragment Options:
    (',' option+=Option)* Err?
;

Option:
    key=ValidName '=' value=Expression
;

CloseStatement:
    'CLOSE' '(' channelno=Expression? Options?')'
;

WaitStatement:
    // In BBj, num can be a fractional number accurate to a millisecond.
    'WAIT' time=Expression
;

ThrowStatement:
    'THROW' expression=Expression (',' number=NumberLiteral)? (',' 'ERR' '=' err=[LabelDecl])?
;

ProcessEvent:
    // TODO add later?  {,TIM=int}{,ERR=lineref}
    {infer ProcessEvent} 'PROCESS_EVENTS'
;

// TODO as a program statement literal expressions are not allowed
// Only membercalls to variables
ExpressionStatement:
    expression=PrefixExpression;

EXPR_OPERATOR returns string:
    '^' | '*' |  '/' | '+' | '-' | '<' | '>' | '=' | '<=' | '>=' | '<>' | 'AND' | 'OR'// from the BBx docu
;

Expression:
    BinaryExpression ({infer StringMask.left=current} ':' right=Expression)?
;

BinaryExpression infers Expression:
     PrefixExpression ({infer BinaryExpression.left=current} operator=EXPR_OPERATOR right=Expression)?
;

PrefixExpression infers Expression:
    {infer PrefixExpression} operator=('!'|'-'|'+') expression=MemberCall
    | MemberCall
;

MemberCall infers Expression:
    PrimaryExpression (
        {infer MemberCall.receiver=current} '.' member=[ClassMember:FeatureName] (isMethodCall?='(' (args+=ParameterCall (',' args+=ParameterCall)* )? ')')?
        | {infer ArrayElement.receiver=current} "[" indices+=Expression (',' indices+=Expression)* "]"
    )*;

ParameterCall:
    expression = Expression
;

PrimaryExpression infers Expression:
    '(' Expression ')'
    | SymbolRef
    | Literal
    | ConstructorCall;

SymbolRef:
    (instanceAccess?='#' | symbolicLabel?='*')? symbol=[NamedElement:FeatureName]  (isMethodCall?='(' (args+=Expression (',' args+=Expression)*)? ')')?
;

Literal:
    NumberLiteral | StringLiteral
;

NumberLiteral:
    value=NUMBER;

StringLiteral:
    value=STRING | HEX_STRING;

ConstructorCall:
    // TODO: Possibly use ID instead of QualifiedClassName
    'new' class=[Class:QualifiedClassName] '(' (args+=Expression (',' args+=Expression)*)? ')';

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
    'NEXT' |'PRINT' | 'AND' | 'OR' | 'ERR' | 'FIELD' | 'WRITE' | 'END' | 'CLIPFROMSTR' | 'ADDR' | 'CONTINUE' | 'SQLOPEN' | 'SQLPREP' | 'MODE'
    | 'READ' | 'INPUT' | 'EXTRACT' | 'FIND' | 'CLOSE' | 'WAIT' | 'SETERR' | 'SETESC'
;
Visibility returns string:
    'PUBLIC'|'PRIVATE'|'PROTECTED';

// BBx Library
Library:
    'library' 
    (declarations+=LibMember)*
;

LibMember:
    LibFunction | LibVariable
;

LibFunction returns LibFunction:
    (docu=DOCU)?
    name=ValidName '(' parameters+=LibParameter? (',' parameters+=LibParameter)* ')' ':' returnType=ID
;

LibParameter returns LibParameter:
    name=ValidName optional?='?'? (':' type=ID)?
;

LibVariable returns LibVariable:
    (docu=DOCU)?
    'var' name=ValidName (':' type=ID)?
;

hidden terminal WS: /\s+/;
terminal COMMENT: /([rR][eE][mM])([ \t][^\n\r]*)?[\n\r]+/; // (rEm)(space or tab)(all but linebreak)(linebreak)

terminal ENDLINE_PRINT_COMMA: /_endline_print_comma/;

terminal NEXT_TOKEN: /_next/;
terminal METHODRET_END: /_methodret_end/;

terminal BBjFilePath: /::.*::/;

terminal ID_WITH_SUFFIX: /[_a-zA-Z][\w_]*(!|\$|%)/; // Suffix: ! = object, $ = string, % = int, missing = double
terminal ID: /[_a-zA-Z][\w_]*/;

terminal NUMBER returns number: /[0-9]+(\.[0-9]*)?|\.[0-9]+/; // .123 is also supported

terminal STRING: /"([^"]|"{2})*"/; // TODO check this. Also support \ as a plain non escape char
terminal HEX_STRING: /\$[0-9a-fA-F]*\$/;  // $0A1E$, $$ = Null string
terminal MNEMONIC: /'[0-9A-Z_]*'/;  // 'BOX'(10,12,4,4) 'FONT'("pica")

terminal DOCU:  /\/@@[\s\S]*?@\//;


// Types

interface VariableDecl extends NamedElement {
    type?: @Class
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
    type?: @Class
    comments: CommentStatement[]
    params: VariableDecl[]
    body: Statement[]
}

interface ArrayDecl extends VariableDecl {
    dimensions: number[]
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
}

interface LibVariable extends NamedElement {
    docu?: string
    type?: string
}

type BBjClassMember = FieldDecl | MethodDecl
type ClassMember =  BBjClassMember | JavaMember
