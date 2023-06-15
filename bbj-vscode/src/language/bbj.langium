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
    VariableDecl |
    Assignment |
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
    ExitToStatement |
    NextStatement |
    LabelDecl |
    OpenStatement |
    ReadStatement |
    CloseStatement |
    WaitStatement |
    ThrowStatement |
    Use |
    ExpressionStatement
;

Use:
    'use' (bbjFilePath=BBjFilePath bbjClass=[BbjClass:ValidName]) | 
    'use' javaClassName=QualifiedJavaClassName
;

VariableDecl returns VariableDecl:
    'declare' 'auto'? type=[Class:QualifiedClassName] name=FeatureName;

Assignment:
    instanceAccess?='#'? variable=[VariableDecl:FeatureName] '=' value=Expression;

LetStatement:
    'LET' assigments+=Assignment (',' assigments+=Assignment)*
;

PrintValue:
    // TODO find out where mnemonics can be used and consider to add a mnemonic Expression
    ('?' | 'PRINT' | 'WRITE') 'RECORD'? (value+=(Expression|MNEMONIC) (',' value+=(Expression|MNEMONIC))* (':' mask=STRING)?)?
;

ClassDecl returns BbjClass:
    'CLASS' visibility=Visibility Static name=ValidName 
        Extends?
        ('IMPLEMENTS' implements+=[Class:QualifiedClassName])? (',' implements+=[Class:QualifiedClassName])* 
    (members+=ClassMember)*
    'CLASSEND'
;
InterfaceDecl returns BbjClass:
    interface?='INTERFACE' visibility=Visibility name=ValidName Extends? 
    (members+=MethodDecl)*
     'INTERFACEEND'
;

fragment Static:
    static?='STATIC'?
;

fragment Extends:
    ('EXTENDS' extends+=[Class:QualifiedClassName] (',' extends+=[Class:QualifiedClassName])*)
;

ClassMember returns ClassMember:
    FieldDecl | MethodDecl
;

FieldDecl returns FieldDecl:
    'FIELD' visibility=Visibility Static type=[Class:QualifiedClassName] name=FeatureName ('=' init=Expression)?
;

MethodDecl returns MethodDecl:
    'METHOD' visibility=Visibility Static type=[Class:QualifiedClassName]? name=ValidName '(' (params+=ParameterDecl (',' params+=ParameterDecl)*)? ')'
    (
        (body+=Statement)*
        'METHODEND'//FIXME doesn't work for interfaces
    )?
;

MethodReturnStatement:
    'METHODRET' return=Expression?
;

ParameterDecl returns VariableDecl:
    type=[Class:QualifiedClassName] name=FeatureName
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
        'SLTHEN' 
            then+=Statement
        ('ELSE' else+=Statement)?
    |   
        isMultiline?='MLTHENFirst'
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

GotoStatement:
    kind=('GOTO' | 'GOSUB') target=[LabelDecl]
;

ExitStatement:
    kind=('RETURN' | 'END' | 'BYE' | 'EXIT' | 'RELEASE')
;

ExitToStatement:
    'EXITTO' target=[LabelDecl]
;

SetErrorStatement:
    'SETERR'  target=[LabelDecl]
;

OpenStatement:
    // TODO check channelno is int and fileid is string
    'OPEN' '(' channelno=Expression? (',' 'ERR' '=' err=[LabelDecl])?')'fileid=Expression
;

// NOTE:INPUT, EXTRACT, and FIND use the same syntax as READ and READ RECORD.
ReadStatement:
    'READ' (record='RECORD')? ('(' channelno=Expression? Options? ')')? (input+=Expression (','input+=Expression)* )?
;

fragment Options:
    (',' option+=Option)* (',' 'ERR' '=' err=[LabelDecl])?
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
// TODO as a program statement literal expressions are not allowed
// Only membercalls to variables
ExpressionStatement:
    expression=PrefixExpression;

EXPR_OPERATOR returns string:
    '^' | '*' |  '/' | '+' | '-' | '<' | '>' | '=' | '<=' | '>=' | '<>' | 'AND' | 'OR' // from the BBx docu
;

Expression:
    PrefixExpression ({infer BinaryExpression.left=current} operator=EXPR_OPERATOR right=Expression)?
;
PrefixExpression infers Expression:
    {infer PrefixExpression} operator=('!'|'-'|'+') expression=MemberCall
	| MemberCall;

MemberCall infers Expression:
    PrimaryExpression (
        {infer MemberCall.receiver=current} '.' member=[JavaMember:FeatureName] (isMethodCall?='(' (args+=ParameterCall (',' args+=ParameterCall)* )? ')')?
        | {infer ArrayElement.receiver=current} "[" indices+=Expression (',' indices+=Expression)* "]"
    )*;

ParameterCall:
    'err='? expression=Expression
;

PrimaryExpression infers Expression:
    '(' Expression ')'
    | SymbolRef
    | Literal
    | ConstructorCall;

SymbolRef:
    (instanceAccess?='#' | '*')? symbol=[NamedElement:FeatureName]  (isMethodCall?='(' (args+=Expression (',' args+=Expression)*)? ')')?
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
    'NEXT' |'PRINT' | 'AND' | 'OR' | 'ERR' | 'FIELD' | 'WRITE'
;
Visibility returns string:
    'PUBLIC'|'PRIVATE'|'PROTECTED';

// BBx Library
Library:
    'library' 
    (declarations+=LibFunction)*
;

LibFunction returns LibFunction:
    (docu=DOCU)?
    name=ID '(' parameters+=LibParameter? (',' parameters+=LibParameter)* ')' ':' returnType=ID
;

LibParameter returns LibParameter:
    name=ValidName optional?='?'? (':' type=ID)?
;

hidden terminal WS: /\s+/;
hidden terminal SL_COMMENT: /([rR][eE][mM])[ \t][^\n\r]*[\n\r]+/; // (rEm)(space or tab)(all but linebreak)(linebreak)

terminal NEXT_TOKEN: /_next/;

terminal BBjFilePath: /::.*::/;

terminal ID_WITH_SUFFIX: /[_a-zA-Z][\w_]*(!|\$|%)/; // Suffix: ! = object, $ = string, % = int, missing = double
terminal ID: /[_a-zA-Z][\w_]*/;

terminal NUMBER returns number: /[0-9]+(\.[0-9]*)?/;

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
}

interface MethodDecl extends NamedElement {
    visibility?: string
    static?: boolean
    type?: @Class
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

type ClassMember = FieldDecl | MethodDecl
