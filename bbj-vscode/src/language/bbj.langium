/******************************************************************************
 * Copyright 2023 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/
grammar BBj

import './java-types'

entry Program:
    uses+=Use*
    statements+=(Statement | ClassDecl)*;

Use:
    'use' className=QualifiedClassName;

Statement:
    VariableDecl | Assignment | PrintValue | ExpressionStatement
    | ForStatement | IfStatement | WhileStatement | GotoStatement | ExitStatement | LabelDecl
;

VariableDecl returns Field:
    'declare' type=[Class:ID] name=VariableName;

Assignment:
    variable=[Field:VariableName] '=' value=Expression;

PrintValue:
    ('?' | 'PRINT') value+=Expression (',' value+=Expression)*
;

ClassDecl returns BbjClass:
    'CLASS' visibility=Visibility name=ID ('EXTENDS' superType=[Class:QualifiedClassName])?
    members+=(FieldDecl | MethodDecl)*
    'CLASSEND'
;
FieldDecl returns Field:
    'FIELD' visibility=Visibility type=[Class:QualifiedClassName] name=VariableName
;

MethodDecl:
    'METHOD' visibility=Visibility static?='STATIC'? type=[Class:QualifiedClassName]? name=ID '(' (params+=ParameterDecl (',' params+=ParameterDecl)*)? ')'
        body+=Statement*
        ('METHODRET' return=Expression)?
    'METHODEND'
;

ParameterDecl returns Field:
    type=[Class:QualifiedClassName] name=VariableName
;

ForStatement:
    'FOR' init=Assignment 'TO' to=Expression
    body+=Statement*
    'NEXT'
;
IfStatement:
    'IF' condition=Expression 'THEN'
    body+=Statement*
    'FI'
;
WhileStatement:
    'WHILE' condition=Expression 
    body+=Statement*
    'WEND'
;

GotoStatement:
    kind=('GOTO' | 'GOSUB') target=[LabelDecl]
;

ExitStatement:
    kind=('RETURN' | 'END')
;

LabelDecl:
    name=ID':'
;


ExpressionStatement:
    expression=Expression;


EXPR_OPERATOR returns string:
    '+' | '-' | '*' | '/' | '<>' | '==' | '>=' | '<=' | '>' | '<'
;

Expression:
    MemberCall ({infer BinaryExpression.left=current} operator=EXPR_OPERATOR right=MemberCall)?
;

MemberCall:
    PrimaryExpression (
        {infer MemberRef.receiver=current} '.' member=[JavaMember:ID]
        (isMethodCall?='(' (args+=Expression (',' args+=Expression)*)? ')')?
    )*;

PrimaryExpression:
    SymbolRef | NumberLiteral | StringLiteral | ConstructorCall;

SymbolRef:
    instanceAccess?='#'? symbol=[Field:VariableName] (isMethodCall?='(' (args+=Expression (',' args+=Expression)*)? ')')?
;

NumberLiteral:
    value=NUMBER;

StringLiteral:
    value=STRING;

ConstructorCall:
    'new' class=[Class:QualifiedClassName] '(' (args+=Expression (',' args+=Expression)*)? ')';

QualifiedClassName returns string:
    ID ('.' ID)*;

VariableName returns string:
    ID | ID_WITH_SUFFIX;

Visibility returns string:
    'PUBLIC'|'PRIVATE';

hidden terminal WS: /\s+/;
hidden terminal SL_COMMENT: /rem [^\n\r]*/;

terminal ID_WITH_SUFFIX: /[_a-zA-Z][\w_]*(!|\$|%)/; // Suffix: ! = object, $ = string, % = int
terminal ID: /[_a-zA-Z][\w_]*/;
terminal NUMBER returns number: /[0-9]+(\.[0-9]*)?/;

terminal STRING: /"[^"]*"|'[^']*'/;

// Types

interface Field {
    type: @Class
    name: string
    visibility?: string
}

interface BbjClass extends Class {
    visibility?: string
    superType?: @Class
    members: ClassMember[]
}

type ClassMember = Field | MethodDecl
