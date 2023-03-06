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
    value=INT;

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
// TODO what other suffixes are possible?
terminal ID_WITH_SUFFIX: /[_a-zA-Z][\w_]*(!)/;
terminal ID: /[_a-zA-Z][\w_]*/;
terminal INT returns number: /[0-9]+/;
terminal STRING: /"[^"]*"|'[^']*'/;

