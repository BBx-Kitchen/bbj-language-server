/******************************************************************************
 * Copyright 2023 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/
grammar BBj

import './java-types'

entry Program:
    uses+=Use*
    statements+=Statement*;

Use:
    'use' className=QualifiedClassName;

Statement: VariableDecl | Assignment | PrintValue | ExpressionStatement;

VariableDecl:
    'declare' type=[JavaClass:ID] name=VariableName;

Assignment:
    variable=[VariableDecl] '=' value=Expression;

PrintValue:
    '?' value=Expression;

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
    symbol=[VariableDecl];

NumberLiteral:
    value=NUMBER;

StringLiteral:
    value=STRING;

ConstructorCall:
    'new' class=[JavaClass:ID] '(' (args+=Expression (',' args+=Expression)*)? ')';

QualifiedClassName returns string:
    ID ('.' ID)*;

VariableName returns string:
    ID | ID_WITH_SUFFIX;

hidden terminal WS: /\s+/;
hidden terminal SL_COMMENT: /rem [^\n\r]*/;
terminal ID_WITH_SUFFIX: /[_a-zA-Z][\w_]*(!|\$|%)/; // Suffix: ! = object, $ = string, % = int
terminal ID: /[_a-zA-Z][\w_]*/;
terminal NUMBER returns number: /[0-9]+(\.[0-9]*)?/;

terminal STRING: /"[^"]*"|'[^']*'/;

