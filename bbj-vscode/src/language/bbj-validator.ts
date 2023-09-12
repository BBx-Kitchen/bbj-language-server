/******************************************************************************
 * Copyright 2023 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

import { AstNode, CstNode, RootCstNode, ValidationAcceptor, ValidationChecks, findNodesForKeyword, getDocument } from 'langium';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { Range } from 'vscode-languageserver-types';
import type { BBjServices } from './bbj-module';
import { BBjAstType, BinaryExpression, CommentStatement, Use, isBbjClass, isCommentStatement, isCompoundStatement, isFieldDecl, isForStatement, isIfStatement, isLabelDecl, isLetStatement, isLibMember, isLibSymbolicLabelDecl, isMethodDecl, isParameterDecl, isStatement, isSymbolRef } from './generated/ast';
import { JavaInteropService } from './java-interop';

/**
 * Register custom validation checks.
 */
export function registerValidationChecks(services: BBjServices) {
    const registry = services.validation.ValidationRegistry;
    const validator = services.validation.BBjValidator;
    const checks: ValidationChecks<BBjAstType> = {
        AstNode: validator.checkLinebreaks,
        BinaryExpression: validator.checkSymbolicLabelRef,
        Use: validator.checkUsedClassExists,
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
            ['IF'],
            ['MLTHENFirst'],
            ['ENDIF', 'FI']],
        [this.isStandaloneStatement,
            false,
            false,
            true],
    ];

    constructor(services: BBjServices) {
        this.javaInterop = services.java.JavaInteropService;
    }

    private isStandaloneStatement(node: AstNode): boolean {
        if (isStatement(node) && !isParameterDecl(node) && !isCommentStatement(node)) {
            if (isCompoundStatement(node.$container)
                || (isIfStatement(node.$container) && !node.$container.isMultiline)
                || isLetStatement(node.$container)
                || isForStatement(node.$container)) {
                return false;
            }
            return true;
        }
        return false;
    }

    checkCommentNewLines(node: CommentStatement, accept: ValidationAcceptor): void {
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
        const textDocument = getDocument(node).textDocument;
        for (const [predicate, before, after, both] of this.linebreakMap) {
            if (node.$cstNode && predicate(node)) {
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
            } else if(resolvedClass.error) {
                accept('error', `Error when loading ${className}: ${resolvedClass.error}`, { node: use });
            }
        }
    }
    checkSymbolicLabelRef(node: BinaryExpression, accept: ValidationAcceptor): void {
        if (isSymbolRef(node.right) && node.right.symbol) {
            if(!node.right.symbolicLabel && isLibSymbolicLabelDecl(node.right.symbol.ref)) {
                accept('error', `Symbolic Label name must be prefixed with '*'.`, { node: node.right });
            }
        }
    }
}
