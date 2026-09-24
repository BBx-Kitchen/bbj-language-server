import { AstNode, AstUtils, CstNode, GrammarUtils, TextDocument, ValidationAcceptor } from "langium";
import { Range } from 'vscode-languageserver-types';
import { findLeafNodeAtOffset } from "../bbj-validator.js";
import { LINE_BREAK_DIAGNOSTIC_CODE } from "../bbj-diagnostic-reconciliation.js";
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
                            range: cst.range,
                            data: { code: LINE_BREAK_DIAGNOSTIC_CODE }
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
                            range: cst.range,
                            data: { code: LINE_BREAK_DIAGNOSTIC_CODE }
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
                            range: cst.range,
                            data: { code: LINE_BREAK_DIAGNOSTIC_CODE }
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
            || isDefFunction(node.$container)
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
                if (isLabelDecl(prev)) {
                    // a label declaration immediately before this IF on the same line is
                    // always a legal prefix (the same rule isStandaloneStatement already
                    // applies one function away) -- do not walk past it looking for
                    // something else, and do not clear on a preceding end-of-IF statement,
                    // which must stay reported.
                    lineBreaks.before = false;
                    break;
                }
                prev = previousStatement(prev);
            }
        }
        return lineBreaks
    }
    return [isIfStatement, mask]
}

// Balance rule shared by elseStatementLineBreaks and ifEndStatementLineBreaks: walking
// past a same-line closer finds a nested chain's true governing IF, but each closer
// stepped over consumes one open IF that this node cannot also claim. Both walkers count
// a same-line end-of-IF statement they step over and match each one against an IF found
// later on the walk. The ELSE walker also counts a same-line ELSE met while no end-of-IF
// is pending, because the IF that ELSE belongs to cannot also own a second ELSE; an ELSE
// met while an end-of-IF is still pending belongs to that inner group instead and spends
// nothing. An IF found while an end-of-IF is pending belongs to that pending group
// (decrement it); an IF found with no end-of-IF pending but an earlier ELSE claim pending
// belongs to that claim instead (decrement the claim); an IF found with neither pending
// governs this node. The same-line guard keeps the walk monotonic and terminating either
// way.
function elseStatementLineBreaks(): LineBreakConfig<ElseStatement> {
    const mask = (node: ElseStatement) => {
        const lineBreaks = { before: false, after: false, both: true };
        let openIfs = 0;
        let elseClaims = 0;
        let prev = previousStatement(node);
        while (isSingleStatement(prev) && isSameLine(prev, node)) {
            if (isIfEndStatement(prev)) {
                openIfs++;
            } else if (isElseStatement(prev)) {
                if (openIfs === 0) {
                    // An ELSE met with no end-of-IF pending claims one earlier IF -- the
                    // same-line closer chain has already accounted for any inner group's
                    // own ELSE via the openIfs count above.
                    elseClaims++;
                }
            } else if (isIfStatement(prev)) {
                if (openIfs > 0) {
                    openIfs--;
                } else if (elseClaims > 0) {
                    elseClaims--;
                } else {
                    lineBreaks.both = false;
                    break;
                }
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
        let openIfs = 0;
        let prev = previousStatement(node);
        while (isSingleStatement(prev) && isSameLine(prev, node)) {
            if (isIfEndStatement(prev)) {
                // ELSE does not increment here: it still belongs to an open IF, so it is a
                // valid thing for an end-of-IF to close directly.
                openIfs++;
            } else if (isIfStatement(prev) || isElseStatement(prev)) {
                if (openIfs === 0) {
                    lineBreaks.both = false;
                    break;
                }
                openIfs--;
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
    } else if (isCompoundStatement(container)) {
        // Statements chained by `;` on one line (e.g. `red = 0; else ...`) live in a
        // CompoundStatement. Without this, previousStatement() can't walk in/out of the
        // compound and single-line IF/ELSE constructs get spurious "new line" errors (#388).
        return container.statements;
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

// Tolerates a leading user line number (classic BASIC-style numbering, e.g. `0010 class public
// a`) immediately before a masked keyword on the same physical line -- a line number followed by
// whitespace is a legitimate "start of statement" prefix, not code that requires its own line
// break before the masked keyword. A prefix that is anything other than whitespace or a single
// leading number stays rejected exactly as before.
const lineStartRegex = /^\s*(\d+\s+)?$/;
// The comment-tail group requires a separator (space/tab) plus the comment body when `rem` is
// followed by more text (`; rem c`), but also accepts a bare `rem` with nothing at all after it
// (`; rem` / `;rem` at end of line) by making the separator+body group itself optional. An
// identifier that merely starts with `rem` (`remx=1`) still fails to match: after consuming the
// literal `rem`, the regex has nothing left to consume the trailing identifier characters with,
// and backtracking to skip the whole group entirely leaves the same trailing text unconsumed --
// either way, the required `$` anchor cannot be reached.
const lineEndRegex = /^\s*(;[ \t]*)?(rem(?:[ \t][^\n\r]*)?)?(\r?\n)?$/i;

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
