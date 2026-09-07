/**
 * Pure AST detection for SETOPTS-in-code shapes (#475, DISC-05/DISC-06).
 *
 * This module recognizes SETOPTS/IOR/AND shapes directly in `.bbj` source (as opposed to
 * `setopts-catalog.ts`'s `config.bbx` file-content parsing) and renders their decode as hover
 * markdown. It has NO `vscode` / `langium/lsp` dependency — it is a plain analysis module over
 * the Langium-generated AST, unit-testable in isolation and reusable by the future
 * `bbj/composer/setopts/decodeInCode` request handler (plan 88-02).
 *
 * Only shape (a) — an absolute `SETOPTS <hex>` statement — is implemented by this plan (88-01).
 * Shapes (b)/(c) (the OPTS-derived `IOR`/`AND` chain and a single chain-link call) are declared
 * in the {@link SetOptsCodeShape} union now so plan 88-02 does not need a breaking type change,
 * but {@link detectSetOptsShape} never produces them yet.
 */

import { AstNode, CstNode } from 'langium';
import {
    isCompoundStatement,
    isDefFunction,
    isMethodDecl,
    isProgram,
    isSetOptsStatement,
    isStringLiteral,
} from './generated/ast.js';
import { describeVector, parseVector, SetOptsVector } from '../setopts-catalog.js';

/** The builtin function name that ORs bits into an OPTS-derived vector. */
export const IOR_FN_NAME = 'IOR';
/** The builtin function name that ANDs bits out of an OPTS-derived vector. */
export const AND_FN_NAME = 'AND';
/** The BBj library variable whose value is the current PRO/5 options vector. */
export const OPTS_VAR_NAME = 'OPTS';

/** One `IOR`/`AND` reassignment link in a traced OPTS-derived chain (populated by plan 88-02). */
export interface SetOptsChainLink {
    fnName: 'IOR' | 'AND';
    maskHex: string;
    vector: SetOptsVector;
}

/** The accumulated set/clear effect of a traced chain (populated by plan 88-02). */
export interface SetOptsChainEffect {
    set: Array<{ byte: number; mask: number }>;
    clear: Array<{ byte: number; mask: number }>;
}

/**
 * Why a chain was judged unsafe for edit-in-place (DISC-06's static-safety boundary).
 * Populated by plan 88-02 — declared here so the shape union is stable across both plans.
 */
export type SetOptsUnsafeReason = 'control-flow' | 'reassigned' | 'alias' | 'unparseable-mask' | 'no-origin';

/**
 * The three DISC-05 hover shapes. Only `absolute` is produced by this plan (88-01); `chain` and
 * `mask-call` are declared now and filled in by plan 88-02.
 */
export type SetOptsCodeShape =
    | { kind: 'absolute'; hexDigits: string; vector: SetOptsVector }
    | { kind: 'chain'; variableName: string; safe: boolean; unsafeReason?: SetOptsUnsafeReason; links: SetOptsChainLink[]; effect: SetOptsChainEffect }
    | { kind: 'mask-call'; fnName: 'IOR' | 'AND'; maskHex: string; vector: SetOptsVector };

/**
 * Bound on how many `$container` hops {@link setoptsHoverTarget} walks before giving up. The
 * real AST is never this deep between a leaf and its enclosing statement; this is a defensive
 * ceiling, not a tuned constant.
 */
const MAX_CONTAINER_HOPS = 12;

/**
 * Resolve the `SetOptsStatement` a hovered leaf belongs to, or `undefined` when the leaf is
 * anywhere else. Matches both the `SETOPTS` keyword token (whose CST leaf's `astNode` is the
 * statement itself) and any token inside the statement's `opts` expression (whose `astNode`
 * chain reaches the statement via `$container`).
 *
 * Stops as soon as it reaches a `SetOptsStatement` (found) or a statement-list container
 * (`Program`, `MethodDecl`, `DefFunction`, `CompoundStatement`) without finding one (not found)
 * — walking past a statement-list container would cross into unrelated sibling statements.
 */
export function setoptsHoverTarget(leaf: CstNode): AstNode | undefined {
    let node: AstNode | undefined = leaf.astNode;
    let hops = 0;
    while (node && hops < MAX_CONTAINER_HOPS) {
        if (isSetOptsStatement(node)) {
            return node;
        }
        if (isProgram(node) || isMethodDecl(node) || isDefFunction(node) || isCompoundStatement(node)) {
            return undefined;
        }
        node = node.$container;
        hops++;
    }
    return undefined;
}

/**
 * Detect the SETOPTS-in-code shape a node represents. Only shape (a) — an absolute
 * `SETOPTS <hex>` statement whose `opts` is a `StringLiteral` that round-trips through
 * {@link parseVector} — is implemented; everything else (missing `opts`, a non-hex or
 * over-length literal, a non-`StringLiteral` expression) returns `undefined`. Never attempts a
 * partial parse and never falls back to raw source text when `parseVector` declines the token.
 */
export function detectSetOptsShape(node: AstNode): SetOptsCodeShape | undefined {
    if (!isSetOptsStatement(node)) {
        return undefined;
    }
    const opts = node.opts;
    if (!isStringLiteral(opts)) {
        return undefined;
    }
    let text = opts.value;
    // BBj hex literals are written `$08004020$`; the value converter may or may not retain the
    // delimiters, so strip exactly one leading and trailing `$` when both are present.
    if (text.length >= 2 && text.startsWith('$') && text.endsWith('$')) {
        text = text.slice(1, -1);
    }
    const vector = parseVector(text);
    if (!vector) {
        return undefined;
    }
    return { kind: 'absolute', hexDigits: text.toUpperCase(), vector };
}

/**
 * Render a {@link SetOptsCodeShape} as hover markdown. For `absolute`, reuses
 * `describeVector` verbatim — this module adds no new summary formatting logic.
 */
export function setoptsHoverMarkdown(shape: SetOptsCodeShape): string {
    switch (shape.kind) {
        case 'absolute':
            return `__SETOPTS $${shape.hexDigits}$__\n\n${describeVector(shape.vector)}`;
        case 'chain':
        case 'mask-call':
            // Populated by plan 88-02; detectSetOptsShape never produces these shapes yet.
            throw new Error(`setoptsHoverMarkdown: shape kind '${shape.kind}' is not yet implemented (plan 88-02)`);
    }
}

/**
 * Trace an OPTS-derived `IOR`/`AND` reassignment chain backward from a variable's use.
 * Declared now, implemented by plan 88-02 (the "Traceability Algorithm" in 88-RESEARCH.md).
 */
export function traceOptsChain(_node: AstNode): SetOptsChainLink[] | undefined {
    return undefined;
}

/**
 * Fold a sequence of chain links into their accumulated set/clear effect.
 * Declared now, implemented by plan 88-02.
 */
export function foldChainEffect(_links: SetOptsChainLink[]): SetOptsChainEffect {
    return { set: [], clear: [] };
}
