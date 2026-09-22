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
    FieldStatement |
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
    IolistStatement |
    KeyedFileStatement |
    LabelDecl |
    LCheckInStatement |
    LetStatement |
    LoadStatement |
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
    SetDriveStatement |
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
    TableStatement |
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

// The compiler accepts MODE= and ERR= in either written order; the grammar previously fixed
// Mode before Err. Widened to an order-independent alternation over the same two existing
// fragments -- no new option syntax, no new fragment.
FulltextStatement:
    'FULLTEXT' fileid=Expression ',' template=Expression ',' keyfield=Expression (Mode Err? | Err Mode?)?
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
    RESTORE_NO_NL lineref=(LabelRef | NUMBER) | kind='RESTORE'
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

TableStatement:
    'TABLE' data=TABLE_DATA
    ;

// The FIELD verb (record, name, value). Distinct from FieldDecl (the class-member declaration,
// reachable only through ClassMember) -- the two never compete at the same decision point. The
// name part is typed one level below the relational expression, which otherwise consumes the
// statement's own '=' as a comparison operator (mirrors Assignment's MemberCall-typed left side).
// The trailing Err? reuses the same optional error-branch fragment every other verb in this
// grammar already carries -- the verb's only documented option.
FieldStatement:
    'FIELD' record=Expression ',' name=AdditiveExpr '=' value=Expression Err?
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

// SETDRIVE fileid{,ERR=lineref} -- no grammar rule existed for this verb at all before this
// change, so every SETDRIVE line silently split into two unrelated expression statements. The
// trailing Err? reuses the same optional error-branch fragment every other small verb in this
// grammar already carries -- the verb's only documented option.
SetDriveStatement:
    'SETDRIVE' fileid=Expression Err?
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
        RPAREN_NO_NL '=' value=Expression (';' comments+=CommentStatement)?
        // FNEND is optional: a multi-line function whose body is never closed (the
        // compiler accepts this, running the body to end of file) must not force the
        // parser's fallback ExpressionStatement interpretation of the header just
        // because a mandatory tail token never arrives.
        | RPAREN_NL (body += (DefReturn | Statement))* FNEND? (';' comments+=CommentStatement)?
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
    'declare' auto?='auto'? type=QualifiedClass (arrayDims+='[' ']')* name=FeatureName;

Assignment:
    instanceAccess?='#'? variable=MemberCall '=' value=Expression;

ClassDecl returns BbjClass:
    'CLASS' Visibility Static name=ValidName
        Extends?
        ('IMPLEMENTS' implements+=QualifiedClass)? (',' implements+=QualifiedClass)*  (';' comments+=CommentStatement)?
    (NUMBER? (members+=ClassMember | Comments))*
    NUMBER? 'CLASSEND' (';' comments+=CommentStatement)?
;
InterfaceDecl returns BbjClass:
    interface?='INTERFACE' Visibility name=ValidName Extends? (';' comments+=CommentStatement)?
        (NUMBER? (members+=InterfaceMethodDecl | Comments))*
    NUMBER? 'INTERFACEEND' (';' comments+=CommentStatement)?
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
    'FIELD' Visibility Static type=QualifiedClass (arrayDims+='[' ']')* name=FeatureName ('=' init=Expression)?  (';' comments+=CommentStatement)?
;

MethodDecl returns MethodDecl:
    MethodDeclStart
    Comments?
    (
        (body+=(DefFunction | Statement))*
        endTag='METHODEND' (';' comments+=CommentStatement)?
    )?
;

fragment MethodDeclStart:
    'METHOD' Visibility Static (voidReturn?='void' | (returnType=QualifiedClass (arrayDims+='[' ']')*) )? name=ValidName '(' (params+=ParameterDecl (',' params+=ParameterDecl)*)? RPAREN (';' comments+=CommentStatement)?
;

InterfaceMethodDecl returns MethodDecl:
   MethodDeclStart
;

MethodReturnStatement:
    METHODRET_END | ('METHODRET' return=Expression)
;

ParameterDecl returns VariableDecl:
    {infer ParameterDecl} type=QualifiedClass (arrayDims+='[' ']')* name=FeatureName ('[' 'ALL'? ']')?
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

// The IOLIST statement -- items are ordinary variable references (scalars, strings, arrays with
// an all-elements subscript), covered by the plain Expression rule; no dedicated item rule is
// needed. The first item is mandatory, so a trailing comma with nothing after it stays a parser
// error. A bare 'IOLIST' with no items is not one: the keyword falls back to an ordinary
// identifier and the line parses as an expression statement.
IolistStatement:
    'IOLIST' items+=Expression (',' items+=Expression)*
;

LabelDecl returns LabelDecl:
    name=LabelName':'
;

// A label declaration's name may be an ordinary identifier or the word 'label' itself -- narrowly
// scoped (unlike ValidName) so this widening doesn't also let 'label' name a class, method,
// library function or library variable, all of which are typed by ValidName elsewhere.
// 'declare' is free here for the same reason it is free in FeatureName above -- a label
// declaration (`declare:`) is never mistaken for a VariableDecl, which always requires a type.
// 'auto', 'library', 'use' and 'var' are free here for the same reasons given in FeatureName
// above -- none of them can start a valid LabelDecl continuation (a label is always immediately
// followed by ':'), so a label declared with one of these words never competes with the rule it
// is also a keyword for.
// 'void' has no label-position conflict either -- FeatureName above already explains why it is
// free as a variable; a void-return marker never appears where a label declaration is expected.
LabelName returns string:
    ID | 'label' | 'declare' | 'auto' | 'library' | 'use' | 'var' | 'void';

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
   {infer UserLabelRef} label=[LabelDecl:LabelName]
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

LoadStatement:
    'LOAD' fileid=Expression (',' int=Expression)?
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
fragment WithChannelAndOptionsAndOutputItems:
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
fragment WithChannelAndOptionsAndInputItems:
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
    ':(' (elements+=VerifyOption (',' elements+=VerifyOption)* (',' elements+=LastVerifyOption)? | elements+=LastVerifyOption) RPAREN
;

VerifyOption:
    key=StringLiteral '=' lineref=(LabelRef | NUMBER)
;

LastVerifyOption:
    ('LEN' '=' min=Expression ',' max=Expression) // LEN=intA,intB
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

// The compiler accepts TIM= and ERR= in either written order; the grammar previously fixed Tim
// before Err. Widened to an order-independent alternation over the same two existing fragments --
// no new option syntax, no new fragment.
ProcessEvent:
    {infer ProcessEvent} 'PROCESS_EVENTS' (Tim Err? | Err Tim?)?
;

// Tried widening this rule to also accept a plain comma-separated variable list after CLEAR (the
// compiler accepts `clear x`, `clear x$,y`, `clear x![]`, in addition to the already-modeled bare
// and EXCEPT forms) -- reverted. Since the entire tail is optional and a variable list starts
// with an ordinary Expression, a BARE 'CLEAR'/'BEGIN' immediately followed by an unrelated
// statement on the next line (no comma, only a line break) got its neighbour's first expression
// silently swallowed as its own variable list instead of leaving it for the next statement --
// confirmed by probe (`begin\nx=1\nprint x` lost x's declaration and produced two "could not
// resolve" errors). Safely disambiguating "more of this statement's list" from "the next
// statement starts here" needs a same-line-only lexer token (the RESTORE_NO_NL/TABLE_DATA style
// of committing to an operand only when no line break intervenes), which is lexer work -- recorded
// as needing more than this small change, not fixed here.
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
        {infer MemberCall.receiver=current} '.' (member=[NamedElement:FeatureName])?
        | {infer ArrayElement.receiver=current} "[" (all?="ALL" "]" | indices+=Expression (',' indices+=Expression)* "]" | all?="]")
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
    // 'void' is a keyword only for a method's void-return marker (MethodDeclStart), which uses
    // ValidName for the method name — so it never conflicts here. Allowing it as a FeatureName
    // lets `void` be used as an ordinary (numeric) variable/field/member name (#439).
    // 'label' is a keyword only for the library grammar's symbolic-label declaration
    // (LibSymbolicLabel), which is a separate rule entirely -- so it never conflicts here.
    // Allowing it as a FeatureName lets `label` be read and assigned as an ordinary variable.
    // 'declare' is a keyword only as the leading verb of VariableDecl, which is itself typed
    // by this same FeatureName rule for its OWN name -- a bare `declare=1` never starts a
    // VariableDecl (that rule always needs a type after the optional 'auto' flag), so the
    // word is free to also be an ordinary variable name here.
    // 'auto' is a keyword only as VariableDecl's own optional flag, one token AFTER 'declare' --
    // a bare `auto=1` can never be mistaken for that flag, since nothing starts a VariableDecl
    // without the leading 'declare' verb first.
    // 'library' is deliberately NOT free here: the entry rule (`Model: Library | Program`)
    // chooses by the first token, and a bare `library` line is how every built-in library
    // file begins. Accepting it as a variable name makes those files parse as programs and
    // BBjAPI() stops resolving. It stays usable as a label name (see LabelName).
    // 'use' is a keyword only as the leading verb of the Use rule, which always requires a file
    // path or a Java type reference immediately after it -- a bare `use=1` supplies neither, so
    // the parser falls through to this rule for the assignment/read form, the same shape
    // 'declare' already relies on above.
    // 'var' is a keyword only inside LibVariable, itself only reachable through the separate
    // Library rule, which is unreachable from Program and so cannot compete here.
    ID | ID_WITH_SUFFIX | 'void' | 'label' | 'declare' | 'auto' | 'use' | 'var';

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
terminal COMMENT: /([rR][eE][mM])(?![\w!$%@])([ \t][^\n\r]*)?([\n\r]+)?/; // (rEm)(not an identifier/suffix char, so "rem15"/"remark" stay identifiers)(space or tab)(all but linebreak)(optional linebreak)

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
terminal TABLE_DATA: /_table_data/;
terminal RESTORE_NO_NL: /_restore_no_nl/;

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
    comments: CommentStatement[]
}

interface VariableDecl extends NamedElement {
    type?: QualifiedClass
    arrayDims: string[]
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
    arrayDims: string[]
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
