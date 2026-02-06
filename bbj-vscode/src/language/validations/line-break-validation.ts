import { AstNode, AstUtils, CstNode, GrammarUtils, TextDocument, ValidationAcceptor } from "langium";
import { Range } from 'vscode-languageserver-types';
import { findLeafNodeAtOffset } from "../bbj-validator.js";
import { CompoundStatement, ElseStatement, IfEndStatement, IfStatement, isArrayDeclarationStatement, isBbjClass, isCommentStatement, isCompoundStatement, isDefFunction, isElseStatement, isFieldDecl, isForStatement, isIfEndStatement, isIfStatement, isLabelDecl, isLetStatement, isLibMember, isMethodDecl, isParameterDecl, isProgram, isSingleStatement, isStatement, isSwitchStatement, Statement } from "../generated/ast.js";

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
   * [predicate, before, after, both]
   * - predicate: function to filter out a node of interest
   * - before: needs line break before
   * - after: needs line break after
   * - both: needs line break before and after
   */
const lineBreakMap: LineBreakConfig<any>[] = [
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
    ifStatementLineBreaks(),
    elseStatementLineBreaks(),
    ifEndStatementLineBreaks(),
    compoundStatementLineBreaks(),
    [isStandaloneStatement, {
        before: false,
        after: false,
        both: true
    }],
];

export function checkLineBreaks(node: AstNode, accept: ValidationAcceptor): void {
    const document = AstUtils.getDocument(node);
    if (document.parseResult.parserErrors.length > 0) {
        return;
    }
    const textDocument = document.textDocument;
    for (const config of lineBreakMap) {
        const predicate = config[0];
        if (node.$cstNode && predicate(node)) {
            const mask = (config[1] instanceof Function) ? config[1](node) : config[1];
            if (mask.before) {
                const beforeNodes = getCstNodes(node.$cstNode, mask.before);
                for (const cst of beforeNodes) {
                    if (!hasLinebreakBefore(cst, textDocument)) {
                        accept('error', 'This statement needs to start in a new line: ' + textDocument.getText(cst.range), {
                            node,
                            range: cst.range
                        });
                    }
                }
            }
            if (mask.after) {
                const afterNodes = getCstNodes(node.$cstNode, mask.after);
                for (const cst of afterNodes) {
                    if (!hasLinebreakAfter(cst, textDocument)) {
                        accept('error', 'This statement needs to end with a line break: ' + textDocument.getText(cst.range), {
                            node,
                            range: cst.range
                        });
                    }
                }
            }
            if (mask.both) {
                const cstNodes = getCstNodes(node.$cstNode, mask.both);
                for (const cst of cstNodes) {
                    let missingMsg: string | undefined;
                    if (!hasLinebreakBefore(cst, textDocument)) {
                        missingMsg = 'This statement needs to start in a new line';
                    } else if (!hasLinebreakAfter(cst, textDocument)) {
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

export function getPreviousNode(node: AstNode): AstNode | undefined {
    const offset = node.$cstNode?.offset;
    if (offset) {
        const previous = findLeafNodeAtOffset(node.$cstNode.root, offset - 1);
        return previous?.astNode;
    }
    return undefined;
}

function isStandaloneStatement(node: AstNode): node is Statement {
    const previous = getPreviousNode(node);
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
            || isInsideSingleLineIf(node)) {
            return false;
        }
        return true;
    }
    return false;
}

function ifStatementLineBreaks(): LineBreakConfig<IfStatement> {
    const mask = (node: IfStatement) => {
        const lineBreaks = { before: true, after: false, both: false };
        const container = node.$container;

        if (isCompoundStatement(container)) {
            const compoundContainer = container.$container;
            const index = container.statements.indexOf(node);
            // IF_THEN: if last statement in compound statement and next statement is on the same line
            // then no line break before is allowed
            if (index === container.statements.length - 1) {
                const siblings = getSiblings(compoundContainer);
                const next = siblings[siblings.indexOf(container) + 1];
                if (next && isSameLine(node, next)) {
                    lineBreaks.before = false;
                }
            }
        } else {
            let prev = previousStatement(node);
            while (isSingleStatement(prev) && isSameLine(prev, node)) {
                if (isIfStatement(prev)) {
                    // IF_THEN: if previous is IF_THEN - same line
                    lineBreaks.before = false;
                    break;
                }
            }
        }
        return lineBreaks
    }
    return [isIfStatement, mask]
}

function elseStatementLineBreaks(): LineBreakConfig<ElseStatement> {
    const mask = (node: ElseStatement) => {
        const lineBreaks = { before: false, after: false, both: true };
        let prev = previousStatement(node);
        while (isSingleStatement(prev) && isSameLine(prev, node)) {
            if (isIfStatement(prev)) {
                // ELSE: if previous is IF_THEN - same line
                lineBreaks.both = false;
                break;
            } else if (isElseStatement(prev) || isIfEndStatement(prev)) {
                // other
                break;
            }
            prev = previousStatement(prev);
        }
        return lineBreaks
    }
    return [isElseStatement, mask]
}

function ifEndStatementLineBreaks(): LineBreakConfig<IfEndStatement> {
    const mask = (node: IfEndStatement) => {
        let lineBreaks = { before: false, after: false, both: true };
        let prev = previousStatement(node);
        while (isSingleStatement(prev) && isSameLine(prev, node)) {
            if (isIfStatement(prev) || isElseStatement(prev)) {
                // ENDIF: if previous is IF_THEN or ELSE same line
                lineBreaks.both = false;
                break;
            } else if (isIfEndStatement(prev)) {
                // other
                break;
            }
            prev = previousStatement(prev);
        }
        return lineBreaks
    }
    return [isIfEndStatement, mask]
}

function compoundStatementLineBreaks(): LineBreakConfig<CompoundStatement> {
    const mask = (node: CompoundStatement) => {
        const lineBreaks = { before: false, after: false, both: false };
        if (isStandaloneStatement(node)) {
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

function isSameLine(node: AstNode, other: AstNode): boolean {
    return node.$cstNode?.range.start.line === other.$cstNode?.range.start.line;
}

function previousStatement(statement: Statement): Statement | undefined {
    const container = statement.$container;
    if (statement.$containerIndex === 0 && isCompoundStatement(container)) {
        return previousStatement(container);
    } else {
        if (statement.$containerIndex && statement.$containerIndex > 0) {
            const prevSibling = getSiblings(container)[statement.$containerIndex - 1];
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

function getSiblings(container: AstNode | undefined): AstNode[] {
    if (isProgram(container)) {
        return container.statements;
    } else if (isMethodDecl(container) || isDefFunction(container)) {
        return container.body;
    }
    return [];
}

function isInsideSingleLineIf(node: Statement): boolean {
    let prev = previousStatement(node);
    while (prev && isSameLine(prev, node)) {
        if (isIfStatement(prev)) {
            return true;
        }
        prev = previousStatement(prev);
    }
    return false;
}


function getCstNodes(node: CstNode, features: string[] | boolean): CstNode[] {
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

const lineStartRegex = /^\s*$/;
const lineEndRegex = /^\s*(;[ \t]*)?(rem[ \t][^\n\r]*)?(\r?\n)?$/i;

function hasLinebreakBefore(node: CstNode, textDocument: TextDocument): boolean {
    const nodeStart = node.range.start;
    const textRange: Range = {
        start: {
            line: nodeStart.line,
            character: 0
        },
        end: nodeStart
    };
    const text = textDocument.getText(textRange);
    return lineStartRegex.test(text);
}

function hasLinebreakAfter(node: CstNode, textDocument: TextDocument): boolean {
    const nodeEnd = node.range.end;
    const textRange: Range = {
        start: nodeEnd,
        end: {
            line: nodeEnd.line + 1,
            character: 0
        }
    };
    const text = textDocument.getText(textRange);
    return lineEndRegex.test(text);
}
