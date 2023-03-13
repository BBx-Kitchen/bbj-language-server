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
    VariableDecl | Assignment | PrintValue | ExpressionStatement;

VariableDecl returns Field:
    'declare' type=[Class:ID] name=VariableName;

Assignment:
    variable=[Field:VariableName] '=' value=Expression;

PrintValue:
    ('?' | 'PRINT') value=Expression;

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

ExpressionStatement:
    expression=Expression;

Expression:
    PrimaryExpression (
        {infer MemberRef.receiver=current} '.' member=[JavaMember:ID]
        (isMethodCall?='(' (args+=Expression (',' args+=Expression)*)? ')')?
    )*;

PrimaryExpression:
    SymbolRef | NumberLiteral | StringLiteral | ConstructorCall;

SymbolRef:
    instanceAccess?='#'? symbol=[Field:VariableName];

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
