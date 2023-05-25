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
    uses+=Use? (LINE_BREAK+ uses+=Use?)* // FIXME use should become a statement
    statements+=(Statement | ClassDecl)? (LINE_BREAK+ statements+=(Statement | ClassDecl)?)*
;

Use:
    'use' className=QualifiedClassName
;

Statement:
   SingleStatement ({infer CompoundStatement.statements += current } (';' statements += SingleStatement)+)?;


SingleStatement:
    VariableDecl | Assignment | ArrayDeclarationStatement
    | PrintValue | ExpressionStatement
    | ForStatement | IfStatement | WhileStatement | WhileEndStatement
    | GotoStatement | ExitStatement | ExitToStatement | NextStatement | LabelDecl
;

VariableDecl returns VariableDecl:
    'declare' type=[Class:ID] name=VariableName;

Assignment:
    variable=[VariableDecl:VariableName] '=' value=Expression;

PrintValue:
    ('?' | 'PRINT') value+=Expression (',' value+=Expression)*
;

ClassDecl returns BbjClass:
    'CLASS' visibility=Visibility name=ID ('EXTENDS' superType=[Class:QualifiedClassName])? LINE_BREAK+
    members+=ClassMember? (LINE_BREAK+ members+=ClassMember?)*
    'CLASSEND'
;

ClassMember returns ClassMember:
    FieldDecl | MethodDecl
;

FieldDecl returns FieldDecl:
    'FIELD' visibility=Visibility type=[Class:QualifiedClassName] name=VariableName
;

MethodDecl:
    'METHOD' visibility=Visibility static?='STATIC'? type=[Class:QualifiedClassName]? name=ID '(' (params+=ParameterDecl (',' params+=ParameterDecl)*)? ')' LINE_BREAK+
        body+=Statement? (LINE_BREAK+ body+=Statement?)*
        ('METHODRET' return=Expression LINE_BREAK+)?
    'METHODEND'
;

ParameterDecl returns VariableDecl:
    type=[Class:QualifiedClassName] name=VariableName
;

ForStatement:
    'FOR' init=Assignment 'TO' to=Expression  ('STEP' step=Expression)?
;

NextStatement:
    'NEXT' (variable=[VariableDecl:VariableName])?
;

IfStatement:
   SLIfStatement | MLIfStatement
;

SLIfStatement:
    'IF' condition=Expression 'THEN' then += SingleStatement (';' then += SingleStatement)*
        ('ELSE' else += SingleStatement (';'else += SingleStatement)* )?
;

MLIfStatement:
    'IF' condition=Expression 'THEN' LINE_BREAK+
    then += Statement? (LINE_BREAK+ then += Statement?)*
    (LINE_BREAK+ 'ELSE' LINE_BREAK+ else += Statement (LINE_BREAK+ else += Statement?)* )?
    (LINE_BREAK+ 'ENDIF' | 'FI')
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
    kind=('RETURN' | 'END')
;

ExitToStatement:
    'EXITTO' target=[LabelDecl]
;

ArrayDeclarationStatement returns ArrayDecl:
    'DIM' name = ID '[' dimensions+=NUMBER (',' dimensions+=NUMBER)* ']'
;


LabelDecl:
    name=ID':'
;


// TODO as a program statement literal expressions are not allowed
// Only membercalls to variables
ExpressionStatement:
    expression=MemberCall;

EXPR_OPERATOR returns string:
    '^' | '*' |  '/' | '+' | '-' | '<' | '>' | '=' | '<=' | '>=' | '<>' | 'AND' | 'OR' // from the BBx docu
;

Expression:
    MemberCall ({infer BinaryExpression.left=current} operator=EXPR_OPERATOR right=MemberCall)?
;

MemberCall infers Expression:
    PrimaryExpression (
        {infer MemberCall.receiver=current} '.' member=[JavaMember:ID] (isMethodCall?='(' (args+=Expression (',' args+=Expression)*)? ')')?
        | {infer ArrayElement.receiver=current} "[" indices+=Expression (',' indices+=Expression)* "]"
    )*;

PrimaryExpression:
    SymbolRef | Literal | ConstructorCall;

SymbolRef:
    instanceAccess?='#'? symbol=[NamedElement:VariableName] (isMethodCall?='(' (args+=Expression (',' args+=Expression)*)? ')')?
;

Literal:
    NumberLiteral | StringLiteral
;

NumberLiteral:
    value=NUMBER;

StringLiteral:
    value=STRING | HEX_STRING;

ConstructorCall:
    'new' class=[Class:QualifiedClassName] '(' (args+=Expression (',' args+=Expression)*)? ')';

QualifiedClassName returns string:
    ID ('.' ID)*;

VariableName returns string:
    ID | ID_WITH_SUFFIX;

Visibility returns string:
    'PUBLIC'|'PRIVATE';

// BBx Library
Library: 
    LINE_BREAK* 'library'
    declarations+=LibFunction? (LINE_BREAK+ declarations+=LibFunction?)* 
;

LibFunction returns LibFunction:
    (docu = DOCU LINE_BREAK+)?
    name = ID '(' parameters+=LibParameter? (',' parameters+=LibParameter)* ')' ':' returnType=ID
;

LibParameter returns LibParameter:
    name=ID optional?='?'? ('=' type=ID)?
;


hidden terminal WS: /[^\S\r\n]+/;
hidden terminal SL_COMMENT: /(rem|REM) [^\n\r]*[\n\r]+/; // TODO make REM case insensetive

terminal LINE_BREAK: /[\n\r]+/;


terminal ID_WITH_SUFFIX: /[_a-zA-Z][\w_]*(!|\$|%)/; // Suffix: ! = object, $ = string, % = int, missing = double
terminal ID: /[_a-zA-Z][\w_]*/;

terminal NUMBER returns number: /(\+|-)?[0-9]+(\.[0-9]*)?/; // TODO create unary operators

terminal STRING: /"([^"]|"{2})*"/; // check this
terminal HEX_STRING: /\$[0-9A-F]*\$/;  // $0A1E$, $$ = Null string

terminal DOCU:  /\/\*[\s\S]*?\*\//;


// Types
interface NamedElement {
    name: string
}

interface VariableDecl extends NamedElement {
    type?: @Class
}

interface FieldDecl extends VariableDecl {
    visibility?: string
}

interface ArrayDecl extends VariableDecl {
    dimensions: number[]
}

interface BbjClass extends Class {
    visibility?: string
    superType?: @Class
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
