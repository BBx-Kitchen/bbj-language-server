/******************************************************************************
 * Copyright 2023 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

import { AstNode, AstUtils, CompositeCstNode, CstNode, DiagnosticInfo, GrammarUtils, LeafCstNode, Properties, Reference, RootCstNode, ValidationAcceptor, ValidationChecks, isCompositeCstNode, isLeafCstNode } from 'langium';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { Range } from 'vscode-languageserver-types';
import type { BBjServices } from './bbj-module.js';
import { BBjAstType, Class, CommentStatement, DefFunction, ElseStatement, EraseStatement, IfEndStatement, InitFileStatement, KeyedFileStatement, MethodDecl, OpenStatement, Option, SingleStatement, Statement, Use, isArrayDeclarationStatement, isBbjClass, isCommentStatement, isCompoundStatement, isElseStatement, isFieldDecl, isForStatement, isIfEndStatement, isIfStatement, isKeywordStatement, isLabelDecl, isLetStatement, isLibMember, isMethodDecl, isOption, isParameterDecl, isProgram, isStatement, isSwitchStatement } from './generated/ast.js';
import { JavaInteropService } from './java-interop.js';
import { dirname, isAbsolute, relative } from 'path';
import { registerClassChecks } from './validations/check-classes.js';

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


    constructor(services: BBjServices) {
        this.javaInterop = services.java.JavaInteropService;
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
        [isIfStatement, {
            before: true,
            after: false,
            both: false
        }],
        this.elseStatementLineBreaks(),
        this.ifEndStatementLineBreaks(),
        [this.isStandaloneStatement, {
            before: false,
            after: false,
            both: true
        }],
    ];

    private elseStatementLineBreaks(): LineBreakConfig<ElseStatement> {
        let lineBreaks = { before: false, after: false, both: true };
        const mask = (node: ElseStatement) => {
            const prev = this.getPreviousNode(node);
            if (isIfStatement(prev) && this.isSameLine(prev, node)) {
                // ELSE: if previous is IF_THEN same line
                lineBreaks.both = false;
            }
            return lineBreaks
        }
        return [isElseStatement, mask]
    }

    private ifEndStatementLineBreaks(): LineBreakConfig<IfEndStatement> {
        let lineBreaks = { before: false, after: false, both: true };
        const mask = (node: IfEndStatement) => {
            const prev = this.getPreviousNode(node);
            if ((isIfStatement(prev) || isElseStatement(prev)) && this.isSameLine(prev, node)) {
                // ENDIF: if previous is IF_THEN or ELSE same line
                lineBreaks.both = false;
            }
            return lineBreaks
        }
        return [isIfEndStatement, mask]
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
                            accept('error', 'This line needs to be preceeded by a line break: ' + textDocument.getText(cst.range), {
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
                            accept('error', 'This line needs to be succeeded by a line break: ' + textDocument.getText(cst.range), {
                                node,
                                range: cst.range
                            });
                        }
                    }
                }
                if (mask.both) {
                    const cstNodes = this.getCstNodes(node.$cstNode, mask.both);
                    for (const cst of cstNodes) {
                        if (!this.hasLinebreakAfter(cst, textDocument) || !this.hasLinebreakBefore(cst, textDocument)) {
                            accept('error', 'This line needs to be wrapped by line breaks: ' + textDocument.getText(cst.range), {
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
            if (statement.$containerIndex && statement.$containerIndex > 0) {
                const prevSibling = container.statements[statement.$containerIndex - 1];
                return isStatement(prevSibling) ? prevSibling : undefined;
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

    private isStandaloneStatement(node: AstNode): node is SingleStatement {
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
                || AstUtils.getContainerOfType(previous, isIfStatement)) {
                return false;
            }
            return true;
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


