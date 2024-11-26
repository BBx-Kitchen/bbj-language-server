/******************************************************************************
 * Copyright 2023 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

import { AstNode, AstUtils, CompositeCstNode, CstNode, DiagnosticInfo, GrammarUtils, LeafCstNode, Properties, Reference, RootCstNode, ValidationAcceptor, ValidationChecks, isCompositeCstNode, isLeafCstNode } from 'langium';
import { dirname, isAbsolute, relative } from 'path';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { Range } from 'vscode-languageserver-types';
import type { BBjServices } from './bbj-module.js';
import { BBjAstType, Class, CommentStatement, CompoundStatement, DefFunction, ElseStatement, EraseStatement, FieldDecl, IfEndStatement, IfStatement, InitFileStatement, JavaField, JavaMethod, KeyedFileStatement, MemberCall, MethodDecl, OpenStatement, Option, Statement, Use, isArrayDeclarationStatement, isBBjClassMember, isBbjClass, isClass, isCommentStatement, isCompoundStatement, isElseStatement, isFieldDecl, isForStatement, isIfEndStatement, isIfStatement, isKeywordStatement, isLabelDecl, isLetStatement, isLibMember, isMethodDecl, isOption, isParameterDecl, isProgram, isSingleStatement, isStatement, isSwitchStatement } from './generated/ast.js';
import { JavaInteropService } from './java-interop.js';
import { registerClassChecks } from './validations/check-classes.js';
import { TypeInferer } from './bbj-type-inferer.js';

/**
 * Register custom validation checks.
 */
export function registerValidationChecks(services: BBjServices) {
    const registry = services.validation.ValidationRegistry;
    const validator = services.validation.BBjValidator;
    const checks: ValidationChecks<BBjAstType> = {
        AstNode: validator.checkLineBreaks,
        Use: validator.checkUsedClassExists,
        OpenStatement: validator.checkOpenStatementOptions,
        InitFileStatement: validator.checkInitFileStatementOptions,
        EraseStatement: validator.checkEraseStatementOptions,
        KeyedFileStatement: validator.checkKeyedFileStatement,
        DefFunction: validator.checkReturnValueInDef,
        CommentStatement: validator.checkCommentNewLines,
        MethodDecl: validator.checkIfMethodIsChildOfInterface,
        MemberCall: validator.checkMemberCallUsingAccessLevels,
    };
    registry.register(checks, validator);
    registerClassChecks(registry);
}

type LineBreakMask = {
    before: string[] | boolean;
    after: string[] | boolean;
    both: string[] | boolean;
}

type LineBreakConfig<T extends AstNode> = [
    (node: AstNode) => node is T,
    LineBreakMask | ((node: T) => LineBreakMask)
]

/**
 * Implementation of custom validations.
 */
export class BBjValidator {
    protected readonly javaInterop: JavaInteropService;

    protected readonly typeInferer: TypeInferer;

    constructor(services: BBjServices) {
        this.javaInterop = services.java.JavaInteropService;
        this.typeInferer = services.types.Inferer;
    }

    checkMemberCallUsingAccessLevels(memberCall: MemberCall, accept: ValidationAcceptor): void {
        const type = memberCall.member.$nodeDescription?.type ?? memberCall.member.ref?.$type;
        if(!type || ![JavaField, JavaMethod, MethodDecl, FieldDecl].includes(type)) {
            return;
        }
        const classOfDeclaration = memberCall.member.ref?.$container;
        const classOfUsage = AstUtils.getContainerOfType(memberCall, isClass);
        if(!classOfDeclaration) {
            return;
        }
        const expectedAccessLevels = ["PUBLIC"];
        if(classOfUsage) {
            if(classOfUsage === classOfDeclaration) {
                expectedAccessLevels.push("PRIVATE", "PROTECTED");
            } else {
                const remainingClasses = [classOfUsage];
                while(remainingClasses.length > 0) {
                    const c = remainingClasses.pop();
                    if(c === classOfDeclaration) {
                        expectedAccessLevels.push("PROTECTED");
                        break;
                    }
                    if(isBbjClass(c)) {
                        remainingClasses.push(...c.extends.map(x => x.ref).filter(x => x!== undefined).map(x => x as Class))
                    }
                }
            }
        }
        const member = memberCall.member.ref;
        if(member && isBBjClassMember(member)) {
            const actualAccessLevel = (member.visibility ?? "PUBLIC").toUpperCase();
            if(!expectedAccessLevels.includes(actualAccessLevel)) {
                accept('error', `The member '${member.name}' from the type '${classOfDeclaration.name}' is not visible`, {
                    node: memberCall,
                    property: 'member'
                });
            }
        }
    }

    /**
       * [predicate, before, after, both]
       * - predicate: function to filter out a node of interest
       * - before: needs line break before
       * - after: needs line break after
       * - both: needs line break before and after
       */
    protected readonly lineBreakMap: LineBreakConfig<any>[] = [
        [isFieldDecl, {
            before: ['FIELD'],
            after: true,
            both: false
        }],
        [isMethodDecl, {
            before: ['METHOD'],
            after: false,
            both: ['METHODEND']
        }],
        [isBbjClass, {
            before: ['CLASS', 'INTERFACE'],
            after: false,
            both: ['CLASSEND', 'INTERFACEEND']
        }],
        [isLibMember, {
            before: false,
            after: false,
            both: true
        }],
        this.ifStatementLineBreaks(),
        this.elseStatementLineBreaks(),
        this.ifEndStatementLineBreaks(),
        this.compoundStatementLineBreaks(),
        [this.isStandaloneStatement, {
            before: false,
            after: false,
            both: true
        }],
    ];

    private ifStatementLineBreaks(): LineBreakConfig<IfStatement> {
        const mask = (node: IfStatement) => {
            const lineBreaks = { before: true, after: false, both: false };
            if (isCompoundStatement(node.$container)) {
                lineBreaks.before = false;
            }
            return lineBreaks
        }
        return [isIfStatement, mask]
    }

    private elseStatementLineBreaks(): LineBreakConfig<ElseStatement> {
        const mask = (node: ElseStatement) => {
            const lineBreaks = { before: false, after: false, both: true };
            let prev = this.previousStatement(node);
            while (isSingleStatement(prev) && this.isSameLine(prev, node)) {
                if (isIfStatement(prev)) {
                    // ELSE: if previous is IF_THEN - same line
                    lineBreaks.both = false;
                    break;
                } else if (isElseStatement(prev) || isIfEndStatement(prev)) {
                    // other
                    break;
                }
                prev = this.previousStatement(prev);
            }
            return lineBreaks
        }
        return [isElseStatement, mask]
    }

    private ifEndStatementLineBreaks(): LineBreakConfig<IfEndStatement> {
        const mask = (node: IfEndStatement) => {
            let lineBreaks = { before: false, after: false, both: true };
            let prev = this.previousStatement(node);
            while (isSingleStatement(prev) && this.isSameLine(prev, node)) {
                if (isIfStatement(prev) || isElseStatement(prev)) {
                    // ENDIF: if previous is IF_THEN or ELSE same line
                    lineBreaks.both = false;
                    break;
                } else if (isIfEndStatement(prev)) {
                    // other
                    break;
                }
                prev = this.previousStatement(prev);
            }
            return lineBreaks
        }
        return [isIfEndStatement, mask]
    }

    private compoundStatementLineBreaks(): LineBreakConfig<CompoundStatement> {
        const mask = (node: CompoundStatement) => {
            const lineBreaks = { before: false, after: false, both: false };
            if (this.isStandaloneStatement(node)) {
                // default case - wrap by line breaks
                lineBreaks.both = true;
                if (isIfStatement(node.statements[node.statements.length - 1])) {
                    // case: PRINT "FOO"; IF value = 1 THEN PRINT "BAR" FI
                    lineBreaks.both = false;
                    lineBreaks.before = true;
                    lineBreaks.after = false;
                }
            }
            return lineBreaks
        }
        return [isCompoundStatement, mask]
    }

    private isSameLine(node: AstNode, other: AstNode): boolean {
        return node.$cstNode?.range.start.line === other.$cstNode?.range.start.line;
    }

    checkLineBreaks(node: AstNode, accept: ValidationAcceptor): void {
        const document = AstUtils.getDocument(node);
        if (document.parseResult.parserErrors.length > 0) {
            return;
        }
        const textDocument = document.textDocument;
        for (const config of this.lineBreakMap) {
            const predicate = config[0];
            if (node.$cstNode && predicate.call(this, node)) {
                const mask = (config[1] instanceof Function) ? config[1](node) : config[1];
                if (mask.before) {
                    const beforeNodes = this.getCstNodes(node.$cstNode, mask.before);
                    for (const cst of beforeNodes) {
                        if (!this.hasLinebreakBefore(cst, textDocument)) {
                            accept('error', 'This statement needs to start in a new line: ' + textDocument.getText(cst.range), {
                                node,
                                range: cst.range
                            });
                        }
                    }
                }
                if (mask.after) {
                    const afterNodes = this.getCstNodes(node.$cstNode, mask.after);
                    for (const cst of afterNodes) {
                        if (!this.hasLinebreakAfter(cst, textDocument)) {
                            accept('error', 'This statement needs to end with a line break: ' + textDocument.getText(cst.range), {
                                node,
                                range: cst.range
                            });
                        }
                    }
                }
                if (mask.both) {
                    const cstNodes = this.getCstNodes(node.$cstNode, mask.both);
                    for (const cst of cstNodes) {
                        let missingMsg: string | undefined;
                        if (!this.hasLinebreakBefore(cst, textDocument)) {
                            missingMsg = 'This statement needs to start in a new line';
                        } else if (!this.hasLinebreakAfter(cst, textDocument)) {
                            missingMsg = 'This statement needs to end with a line break';
                        }
                        if (missingMsg) {
                            accept('error', `${missingMsg}: ${textDocument.getText(cst.range)}`, {
                                node,
                                range: cst.range
                            });
                        }
                    }
                }
                break;
            }
        }
    }

    private previousStatement(statement: Statement): Statement | undefined {
        const container = statement.$container;
        if (isProgram(container) || isCompoundStatement(container)) {
            if (statement.$containerIndex === 0 && isCompoundStatement(container)) {
                return this.previousStatement(container);
            } else if (statement.$containerIndex && statement.$containerIndex > 0) {
                const prevSibling = container.statements[statement.$containerIndex - 1];
                if (isCompoundStatement(prevSibling)) {
                    // last child statement in compound statement
                    return prevSibling.statements[prevSibling.statements.length - 1];
                } else if (isStatement(prevSibling)) {
                    return prevSibling;
                }
            }
        }
        return undefined;
    }

    public checkClassReference<N extends AstNode>(accept: ValidationAcceptor, ref: Reference<Class> | undefined, info: DiagnosticInfo<N>): void {
        if (!ref) {
            return;
        }
        const uriOfUsage = AstUtils.getDocument(ref.$refNode!.root.astNode).uri.fsPath;
        if (!ref.ref) {
            return;
        }
        const klass = ref.ref;
        if (isBbjClass(klass) && klass.visibility) {
            const typeName = klass.interface ? 'interface' : 'class';
            const uriOfDeclaration = AstUtils.getDocument(ref.ref).uri.fsPath;
            switch (klass.visibility.toUpperCase()) {
                case "PUBLIC":
                    //everything is allowed
                    return;
                case "PROTECTED":
                    const dirOfDeclaration = dirname(uriOfDeclaration);
                    const dirOfUsage = dirname(uriOfUsage);
                    if (!this.isSubFolderOf(dirOfUsage, dirOfDeclaration)) {
                        accept("error", `Protected ${typeName} '${klass.name}' can be only referenced within the same directory!`, info);
                    }
                    break;
                case "PRIVATE":
                    if (uriOfUsage !== uriOfDeclaration) {
                        accept("error", `Private ${typeName} '${klass.name}' can be only referenced within the same file!`, info);
                    }
                    break;
            }
        }
    }

    private isSubFolderOf(folder: string, parentFolder: string) {
        if (parentFolder === folder) {
            return true;
        }
        const relativePath = relative(parentFolder, folder);
        return relativePath && !relativePath.startsWith('..') && !isAbsolute(relativePath);
    }

    private isStandaloneStatement(node: AstNode): node is Statement {
        const previous = this.getPreviousNode(node);
        if (isLabelDecl(node) || isLabelDecl(previous)) {
            return false;
        }
        if (isStatement(node) && !isParameterDecl(node) && !isCommentStatement(node)) {
            if (isCompoundStatement(node.$container)
                || isLetStatement(node.$container)
                || isForStatement(node.$container)
                || isArrayDeclarationStatement(node.$container)
                || AstUtils.getContainerOfType(previous, isSwitchStatement)
                || AstUtils.getContainerOfType(previous, isIfStatement)
                || this.isInsideSingleLineIf(node)) {
                return false;
            }
            return true;
        }
        return false;
    }

    private isInsideSingleLineIf(node: Statement): boolean {
        let prev = this.previousStatement(node);
        while (prev && this.isSameLine(prev, node)) {
            if (isIfStatement(prev)) {
                return true;
            }
            prev = this.previousStatement(prev);
        }
        return false;
    }

    private getPreviousNode(node: AstNode): AstNode | undefined {
        const offset = node.$cstNode?.offset;
        if (offset) {
            const previous = findLeafNodeAtOffset(node.$cstNode.root, offset - 1);
            return previous?.element;
        }
        return undefined;
    }

    checkIfMethodIsChildOfInterface(node: MethodDecl, accept: ValidationAcceptor): void {
        const klass = AstUtils.getContainerOfType(node, isBbjClass)!;
        if (klass.interface && node.endTag) {
            accept('error', 'Methods of interfaces must not have a METHODEND keyword!', {
                node: node,
                property: 'endTag'
            });
        }
    }

    checkCommentNewLines(node: CommentStatement, accept: ValidationAcceptor): void {
        const document = AstUtils.getDocument(node);
        if (document.parseResult.parserErrors.length > 0 || isLabelDecl(this.getPreviousNode(node))) {
            return;
        }
        if (node.$cstNode) {
            const text = (node.$cstNode.root as RootCstNode).fullText;
            const offset = node.$cstNode.offset;
            for (let i = offset - 1; i >= 0; i--) {
                const char = text.charAt(i);
                if (char === '\n' || char === ';') {
                    return;
                } else if (char !== ' ' && char !== '\t') {
                    accept('error', "Comments need to be separated by line breaks or ';'.", {
                        node
                    });
                    return;
                }
            }
        }
    }



    private getCstNodes(node: CstNode, features: string[] | boolean): CstNode[] {
        if (Array.isArray(features)) {
            const nodes: CstNode[] = [];
            for (const feature of features) {
                nodes.push(...GrammarUtils.findNodesForKeyword(node, feature));
            }
            return nodes;
        } else {
            return [node];
        }
    }

    private lineStartRegex = /^\s*$/;
    private lineEndRegex = /^\s*(rem[ \t][^\n\r]*)?(\r?\n)?$/;

    private hasLinebreakBefore(node: CstNode, textDocument: TextDocument): boolean {
        const nodeStart = node.range.start;
        const textRange: Range = {
            start: {
                line: nodeStart.line,
                character: 0
            },
            end: nodeStart
        };
        const text = textDocument.getText(textRange);
        return this.lineStartRegex.test(text);
    }

    private hasLinebreakAfter(node: CstNode, textDocument: TextDocument): boolean {
        const nodeEnd = node.range.end;
        const textRange: Range = {
            start: nodeEnd,
            end: {
                line: nodeEnd.line + 1,
                character: 0
            }
        };
        const text = textDocument.getText(textRange);
        return this.lineEndRegex.test(text);
    }

    checkUsedClassExists(use: Use, accept: ValidationAcceptor): void {
        const className = use.javaClassName
        if (className) {
            const resolvedClass = this.javaInterop.getResolvedClass(className);
            if (!resolvedClass) {
                accept('error', `Class ${className} is not in the class path.`, { node: use });
            } else if (resolvedClass.error) {
                accept('error', `Error when loading ${className}: ${resolvedClass.error}`, { node: use });
            }
        }
    }

    private checkOptions<T extends AstNode>(verb: string, node: T, property: Properties<T>, options: Option[], validOptionKeys: string[], accept: ValidationAcceptor) {
        const copy = [...validOptionKeys.map(o => o.toLowerCase())];
        options.forEach((option, propertyIndex) => {
            const key = option.key.toLowerCase();
            const index = copy.indexOf(key);
            if (index > -1) {
                copy.splice(index, 1);
            } else {
                accept('error', `${verb} verb can have following options: ${validOptionKeys.join(', ')}. Found: ${key}.`, { node, property, index: propertyIndex });
            }
        });
    }

    checkInitFileStatementOptions(ele: InitFileStatement, accept: ValidationAcceptor): void {
        this.checkOptions('INITFILE', ele, 'options', ele.options, ['mode', 'tim', 'err'], accept);
    }

    checkEraseStatementOptions(ele: EraseStatement, accept: ValidationAcceptor): void {
        let expression = true;
        ele.items?.forEach((item, index) => {
            if (isOption(item)) {
                expression = false;
            } else if (!expression) {
                accept('error', 'Invalid option. Expecting {,MODE=string}{,TIM=int}{,ERR=lineref}.', { node: ele, property: 'items', index });
            }
        });
        this.checkOptions('ERASE', ele, 'items', ele.items.filter(expr => isOption(expr)).map(op => op as Option), ['mode', 'tim', 'err'], accept);
    }

    checkOpenStatementOptions(ele: OpenStatement, accept: ValidationAcceptor): void {
        this.checkOptions('OPEN', ele, 'options', ele.options, ['mode', 'tim', 'isz', 'err'], accept);
    }

    checkKeyedFileStatement(ele: KeyedFileStatement, accept: ValidationAcceptor): void {
        if (ele.kind !== 'MKEYED' && ele.mode) {
            accept('error', 'MODE option only supported in MKEYED Verb.', { node: ele, property: 'mode' });
            return;
        }
    }

    checkReturnValueInDef(ele: DefFunction, accept: ValidationAcceptor): void {
        if (ele.body && ele.body.length > 0) {
            ele.body.filter(isKeywordStatement).forEach(statement => {
                if (statement.kind && statement.kind.toUpperCase() === 'RETURN') {
                    accept('error', 'RETURN statement inside a DEF function must have a return value.', { node: statement });
                }
            })
            return;
        }
    }
}

export function findLeafNodeAtOffset(node: CstNode, offset: number): LeafCstNode | undefined {
    if (isLeafCstNode(node)) {
        return node;
    } else if (isCompositeCstNode(node)) {
        const searchResult = binarySearch(node, offset);
        if (searchResult) {
            return findLeafNodeAtOffset(searchResult, offset);
        }
    }
    return undefined;
}

function binarySearch(node: CompositeCstNode, offset: number): CstNode | undefined {
    let left = 0;
    let right = node.children.length - 1;
    let closest: CstNode | undefined = undefined;

    while (left <= right) {
        const middle = Math.floor((left + right) / 2);
        const middleNode = node.children[middle];

        if (middleNode.offset === offset) {
            // Found an exact match
            return middleNode;
        }

        if (middleNode.offset < offset) {
            // Update the closest node (less than offset) and move to the right half
            closest = middleNode;
            left = middle + 1;
        } else {
            // Move to the left half
            right = middle - 1;
        }
    }


    return closest;
}


