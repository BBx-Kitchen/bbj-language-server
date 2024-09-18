/******************************************************************************
 * Copyright 2023 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

import { AstNode, CompositeCstNode, CstNode, LeafCstNode, Properties, RootCstNode, ValidationAcceptor, ValidationChecks, findNodesForKeyword, getContainerOfType, getDocument, isCompositeCstNode, isLeafCstNode } from 'langium';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { Range } from 'vscode-languageserver-types';
import type { BBjServices } from './bbj-module';
import { BBjAstType, CommentStatement, DefFunction, EraseStatement, InitFileStatement, KeyedFileStatement, OpenStatement, Option, Use, isArrayDeclarationStatement, isBbjClass, isCommentStatement, isCompoundStatement, isElseStatement, isFieldDecl, isForStatement, isIfEndStatement, isIfStatement, isKeywordStatement, isLabelDecl, isLetStatement, isLibMember, isMethodDecl, isOption, isParameterDecl, isStatement } from './generated/ast';
import { JavaInteropService } from './java-interop';

/**
 * Register custom validation checks.
 */
export function registerValidationChecks(services: BBjServices) {
    const registry = services.validation.ValidationRegistry;
    const validator = services.validation.BBjValidator;
    const checks: ValidationChecks<BBjAstType> = {
        AstNode: validator.checkLinebreaks,
        Use: validator.checkUsedClassExists,
        OpenStatement: validator.checkOpenStatementOptions,
        InitFileStatement: validator.checkInitFileStatementOptions,
        EraseStatement: validator.checkEraseStatementOptions,
        KeyedFileStatement: validator.checkKeyedFileStatement,
        DefFunction: validator.checkReturnValueInDef,
        CommentStatement: validator.checkCommentNewLines
    };
    registry.register(checks, validator);
}

type LinebreakMap = [(node: AstNode) => boolean, string[] | boolean, string[] | boolean, string[] | boolean][]

/**
 * Implementation of custom validations.
 */
export class BBjValidator {

    protected readonly javaInterop: JavaInteropService;
    protected readonly linebreakMap: LinebreakMap = [
        [isFieldDecl,
            ['FIELD'],
            true,
            false],
        [isMethodDecl,
            ['METHOD'],
            false,
            ['METHODEND']],
        [isBbjClass,
            ['CLASS', 'INTERFACE'],
            false,
            ['CLASSEND', 'INTERFACEEND']],
        [isLibMember,
            false,
            false,
            true],
        [isIfStatement,
            true,
            false,
            false],
        [isIfEndStatement,
            false,
            false,
            true],
        [isElseStatement,
            false,
            false,
            true],
        [this.isStandaloneStatement,
            false,
            false,
            true],
    ];

    constructor(services: BBjServices) {
        this.javaInterop = services.java.JavaInteropService;
    }

    private isStandaloneStatement(node: AstNode): boolean {
        const previous = this.getPreviousNode(node);
        if (isLabelDecl(node) || isLabelDecl(previous)) {
            return false;
        }
        if (isStatement(node) && !isParameterDecl(node) && !isCommentStatement(node)) {
            if (isCompoundStatement(node.$container)
                || isLetStatement(node.$container)
                || isForStatement(node.$container)
                || isArrayDeclarationStatement(node.$container)
                || getContainerOfType(previous, isIfStatement)) {
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

    checkCommentNewLines(node: CommentStatement, accept: ValidationAcceptor): void {
        const document = getDocument(node);
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

    checkLinebreaks(node: AstNode, accept: ValidationAcceptor): void {
        const document = getDocument(node);
        if (document.parseResult.parserErrors.length > 0) {
            return;
        }
        const textDocument = document.textDocument;
        for (const [predicate, before, after, both] of this.linebreakMap) {
            if (node.$cstNode && predicate.call(this, node)) {
                if (before) {
                    const beforeNodes = this.getCstNodes(node.$cstNode, before);
                    for (const cst of beforeNodes) {
                        if (!this.hasLinebreakBefore(cst, textDocument)) {
                            accept('error', 'This line needs to be preceeded by a line break.', {
                                node,
                                range: cst.range
                            });
                        }
                    }
                }
                if (after) {
                    const afterNodes = this.getCstNodes(node.$cstNode, after);
                    for (const cst of afterNodes) {
                        if (!this.hasLinebreakAfter(cst, textDocument)) {
                            accept('error', 'This line needs to be succeeded by a line break.', {
                                node,
                                range: cst.range
                            });
                        }
                    }
                }
                if (both) {
                    const cstNodes = this.getCstNodes(node.$cstNode, both);
                    for (const cst of cstNodes) {
                        if (!this.hasLinebreakAfter(cst, textDocument) || !this.hasLinebreakBefore(cst, textDocument)) {
                            accept('error', 'This line needs to be wrapped by line breaks.', {
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

    private getCstNodes(node: CstNode, features: string[] | boolean): CstNode[] {
        if (Array.isArray(features)) {
            const nodes: CstNode[] = [];
            for (const feature of features) {
                nodes.push(...findNodesForKeyword(node, feature));
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
                if (statement.kind.toUpperCase() === 'RETURN') {
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
