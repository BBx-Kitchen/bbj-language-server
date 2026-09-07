/**
 * Pure AST detection for SETOPTS-in-code shapes (#475, DISC-05/DISC-06).
 *
 * This module recognizes SETOPTS/IOR/AND shapes directly in `.bbj` source (as opposed to
 * `setopts-catalog.ts`'s `config.bbx` file-content parsing) and renders their decode as hover
 * markdown. It has NO `vscode` / `langium/lsp` dependency — it is a plain analysis module over
 * the Langium-generated AST, unit-testable in isolation and reusable by the future
 * `bbj/composer/setopts/decodeInCode` request handler.
 *
 * Shape (a) — an absolute `SETOPTS <hex>` statement — was implemented by plan 88-01. Plan 88-02
 * adds shapes (b) and (c): the backward `OPTS`→`IOR`/`AND`→`SETOPTS` chain walk
 * ({@link traceOptsChain}) and single `IOR`/`AND` call decode, both routed through
 * {@link detectSetOptsShape}.
 */

import { AstNode, CstNode } from 'langium';
import {
    isCompoundStatement,
    isDefFunction,
    isElseStatement,
    isForStatement,
    isGotoStatement,
    isIfEndStatement,
    isIfStatement,
    isKeywordStatement,
    isLetStatement,
    isLibVariable,
    isMethodCall,
    isMethodDecl,
    isOnGotoStatement,
    isProgram,
    isSetOptsStatement,
    isStringLiteral,
    isSwitchCase,
    isSwitchStatement,
    isSymbolRef,
    isUntilStatement,
    isWhileEndStatement,
    isWhileStatement,
    MethodCall,
    SetOptsStatement,
} from './generated/ast.js';
import { describeIorAndMask, describeMaskVector, describeVector, parseVector, SETOPTS_BITS, SetOptsVector } from '../setopts-catalog.js';
import { resolveLibFunction } from './validations/check-function-calls.js';

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
 * Why a chain was judged unsafe for edit-in-place (DISC-06's static-safety boundary). A chain
 * never reports `safe: true` unless the backward walk reached an `OPTS`-sourced origin through
 * only `IOR`/`AND` reassignments of the same variable — any other outcome resolves to exactly
 * one of these named reasons, never a silent false "safe".
 */
export type SetOptsUnsafeReason = 'control-flow' | 'reassigned' | 'alias' | 'unparseable-mask' | 'no-origin';

/** The three DISC-05 hover shapes. */
export type SetOptsCodeShape =
    | { kind: 'absolute'; hexDigits: string; vector: SetOptsVector }
    | {
        kind: 'chain'; variableName: string; safe: boolean; unsafeReason?: SetOptsUnsafeReason;
        links: SetOptsChainLink[]; effect: SetOptsChainEffect;
        /**
         * The `Assignment` node whose value resolved to the `OPTS`-sourced origin, present only
         * when `safe` is `true`. Widened in plan 88-03 so `setopts-in-code-request.ts` can locate
         * the origin's document line for its edit-in-place range without a second AST walk.
         */
        originNode?: AstNode;
    }
    | { kind: 'mask-call'; fnName: 'IOR' | 'AND'; maskHex: string; vector: SetOptsVector };

/**
 * Bound on how many `$container` hops {@link setoptsHoverTarget} walks before giving up. The
 * real AST is never this deep between a leaf and its enclosing statement; this is a defensive
 * ceiling, not a tuned constant.
 */
const MAX_CONTAINER_HOPS = 12;

/**
 * Resolve the `SetOptsStatement` or `IOR`/`AND` `MethodCall` a hovered leaf belongs to, or
 * `undefined` when the leaf is anywhere else. Matches: the `SETOPTS` keyword token or any token
 * inside a `SetOptsStatement.opts` expression (whose `astNode` chain reaches the statement via
 * `$container`); and, for shape (c), a `SymbolRef` that is a `MethodCall`'s own `method`
 * expression — i.e. the function-name token itself, never a token inside one of that call's
 * `args` (each argument's `SymbolRef.$container` is a `ParameterCall`, not the `MethodCall`
 * directly, so hovering the first argument of `IOR(opts$,"$08$")` never matches here).
 *
 * Stops as soon as it reaches one of those two shapes (found) or a statement-list container
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
        if (isSymbolRef(node) && isMethodCall(node.$container) && node.$container.method === node) {
            return node.$container;
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
 * Parse a `$HEX$`-delimited (or bare) hex string literal into a vector, returning the vector
 * alongside its canonical uppercase hex digits. Delimiters are stripped when both are present;
 * anything that isn't a `StringLiteral`, or doesn't round-trip through {@link parseVector},
 * returns `undefined` — never a partial decode. Shared by the absolute shape, the mask-call
 * shape, and every `IOR`/`AND` chain-link mask inside {@link traceOptsChain}.
 */
function parseHexLiteral(expr: AstNode | undefined): { hexDigits: string; vector: SetOptsVector } | undefined {
    if (!expr || !isStringLiteral(expr)) {
        return undefined;
    }
    let text = expr.value;
    // BBj hex literals are written `$08004020$`; the value converter may or may not retain the
    // delimiters, so strip exactly one leading and trailing `$` when both are present.
    if (text.length >= 2 && text.startsWith('$') && text.endsWith('$')) {
        text = text.slice(1, -1);
    }
    const vector = parseVector(text);
    if (!vector) {
        return undefined;
    }
    return { hexDigits: text.toUpperCase(), vector };
}

/** Lowercased `$refText` of a `SymbolRef` expression, or `undefined` for anything else — BBj
 * variable names compare case-insensitively throughout this module. */
function symbolRefName(expr: AstNode | undefined): string | undefined {
    return expr && isSymbolRef(expr) ? expr.symbol.$refText?.toLowerCase() : undefined;
}

/** Resolve a call's target to `IOR`/`AND` (case-insensitive), or `undefined` for anything else. */
function iorOrAndName(call: MethodCall): 'IOR' | 'AND' | undefined {
    const fn = resolveLibFunction(call);
    if (!fn) {
        return undefined;
    }
    const nameUpper = fn.name.toUpperCase();
    return nameUpper === IOR_FN_NAME || nameUpper === AND_FN_NAME ? (nameUpper as 'IOR' | 'AND') : undefined;
}

/** The tracked variable name for a chain-trace entry point, or `undefined` when none can be
 * determined (not a chain to report, per {@link traceOptsChain}'s own contract). */
function trackedVariableName(target: SetOptsStatement): string | undefined {
    return symbolRefName(target.opts);
}

/** The flat statement array a node's `$container` type owns, or `undefined` for any other
 * container type (the scan must never treat a non-statement-list node as one). */
function containerStatements(node: AstNode): ReadonlyArray<AstNode> | undefined {
    if (isProgram(node)) {
        return node.statements;
    }
    if (isMethodDecl(node)) {
        return node.body;
    }
    if (isDefFunction(node)) {
        return node.body;
    }
    if (isCompoundStatement(node)) {
        return node.statements;
    }
    return undefined;
}

/**
 * Walk `target.$container` upward until reaching a `Program`, `MethodDecl`, `DefFunction` or
 * `CompoundStatement` — the first one found, never further — and return that container's
 * statement array together with the index of the direct element enclosing `target`. Bounded by
 * {@link MAX_CONTAINER_HOPS}, matching {@link setoptsHoverTarget}'s own defensive ceiling.
 */
function findAnchor(target: AstNode): { statements: ReadonlyArray<AstNode>; anchorIndex: number } | undefined {
    let prev: AstNode = target;
    let node: AstNode | undefined = target.$container;
    let hops = 0;
    while (node && hops < MAX_CONTAINER_HOPS) {
        const statements = containerStatements(node);
        if (statements) {
            const idx = statements.indexOf(prev);
            return idx === -1 ? undefined : { statements, anchorIndex: idx };
        }
        prev = node;
        node = node.$container;
        hops++;
    }
    return undefined;
}

/**
 * Flatten a statement array so a `CompoundStatement` sibling's own `statements` appear inline
 * at its position, in order — the same "transparent to its parent" rule `bbj-scope-local.ts`
 * already applies to scoping. `CompoundStatement.statements` is typed `SingleStatement` (never
 * another `CompoundStatement`), so one flattening pass is exhaustive; no recursion is needed.
 */
function flattenStatements(statements: ReadonlyArray<AstNode>): AstNode[] {
    const flat: AstNode[] = [];
    for (const stmt of statements) {
        if (isCompoundStatement(stmt)) {
            flat.push(...stmt.statements);
        } else {
            flat.push(stmt);
        }
    }
    return flat;
}

type StatementVerdict =
    | { kind: 'control-flow' | 'reassigned' | 'alias' | 'unparseable-mask' | 'irrelevant' }
    | { kind: 'origin'; originNode: AstNode }
    | { kind: 'link'; link: SetOptsChainLink };

/**
 * Classify one statement against the tracked variable name, per 88-RESEARCH.md's Traceability
 * Algorithm step 3. Any ambiguity resolves toward an unsafe verdict, never toward a false
 * "link" or "origin" — the walk must never touch a mask it cannot fully account for.
 */
function matchStatement(stmt: AstNode, trackedName: string): StatementVerdict {
    if (isIfStatement(stmt) || isElseStatement(stmt) || isIfEndStatement(stmt)
        || isWhileStatement(stmt) || isWhileEndStatement(stmt) || isForStatement(stmt)
        || isGotoStatement(stmt) || isOnGotoStatement(stmt)
        || isSwitchStatement(stmt) || isSwitchCase(stmt)
        || isUntilStatement(stmt) || (isKeywordStatement(stmt) && stmt.kind === 'REPEAT')) {
        return { kind: 'control-flow' };
    }
    if (!isLetStatement(stmt)) {
        return { kind: 'irrelevant' };
    }
    for (const assignment of stmt.assignments) {
        if (symbolRefName(assignment.variable) !== trackedName) {
            continue;
        }
        const value = assignment.value;
        if (isSymbolRef(value)) {
            let target: AstNode | undefined;
            try {
                target = value.symbol.ref;
            } catch {
                target = undefined; // cyclic / unresolved reference — not a recognizable OPTS origin
            }
            if (target && isLibVariable(target) && target.name.toUpperCase() === OPTS_VAR_NAME) {
                return { kind: 'origin', originNode: assignment };
            }
            return { kind: 'reassigned' };
        }
        if (isMethodCall(value)) {
            const fnName = iorOrAndName(value);
            if (!fnName) {
                return { kind: 'reassigned' };
            }
            if (symbolRefName(value.args[0]?.expression) !== trackedName) {
                return { kind: 'alias' };
            }
            const parsed = parseHexLiteral(value.args[1]?.expression);
            if (!parsed) {
                return { kind: 'unparseable-mask' };
            }
            return { kind: 'link', link: { fnName, maskHex: parsed.hexDigits, vector: parsed.vector } };
        }
        return { kind: 'reassigned' };
    }
    return { kind: 'irrelevant' };
}

interface ChainWalkResult {
    safe: boolean;
    unsafeReason?: SetOptsUnsafeReason;
    /** Links in backward-encounter order (newest/closest-to-target first); callers reverse. */
    linksNewestFirst: SetOptsChainLink[];
    /** The origin `Assignment` node, present only when `safe` is `true` (plan 88-03 widening). */
    originNode?: AstNode;
}

/**
 * Scan `statements` backward from just before `anchorStatement`'s position, per step 3 of the
 * Traceability Algorithm. Bounded by `statements.length` — never recurses into a nested
 * `MethodDecl`/`DefFunction`/`BbjClass` (T-88-04).
 */
function walkChain(statements: ReadonlyArray<AstNode>, anchorStatement: AstNode, trackedName: string): ChainWalkResult {
    const flat = flattenStatements(statements);
    const anchorIndex = flat.indexOf(anchorStatement);
    const linksNewestFirst: SetOptsChainLink[] = [];
    if (anchorIndex === -1) {
        // Structural anomaly (anchorStatement not found in its own container's flattened
        // array) — fail closed rather than guess a position.
        return { safe: false, unsafeReason: 'no-origin', linksNewestFirst };
    }
    for (let i = anchorIndex - 1; i >= 0; i--) {
        const verdict = matchStatement(flat[i], trackedName);
        switch (verdict.kind) {
            case 'control-flow':
                return { safe: false, unsafeReason: 'control-flow', linksNewestFirst };
            case 'origin':
                return { safe: true, linksNewestFirst, originNode: verdict.originNode };
            case 'link':
                linksNewestFirst.push(verdict.link);
                break;
            case 'reassigned':
                return { safe: false, unsafeReason: 'reassigned', linksNewestFirst };
            case 'alias':
                return { safe: false, unsafeReason: 'alias', linksNewestFirst };
            case 'unparseable-mask':
                return { safe: false, unsafeReason: 'unparseable-mask', linksNewestFirst };
            case 'irrelevant':
                break;
        }
    }
    return { safe: false, unsafeReason: 'no-origin', linksNewestFirst };
}

/**
 * Detect the SETOPTS-in-code shape a node represents:
 *  - (a) an absolute `SETOPTS <hex>` statement whose `opts` is a `StringLiteral` that round-trips
 *    through {@link parseVector};
 *  - (b) a `SETOPTS <variable>` statement whose `opts` is a `SymbolRef` — routed through
 *    {@link traceOptsChain};
 *  - (c) a single `IOR`/`AND` `MethodCall` whose second argument round-trips through
 *    {@link parseVector}.
 * Anything else (missing `opts`, a non-hex or over-length literal, an unrecognized expression
 * shape) returns `undefined`. Never attempts a partial parse and never falls back to raw source
 * text when the underlying parse declines the token.
 */
export function detectSetOptsShape(node: AstNode): SetOptsCodeShape | undefined {
    if (isSetOptsStatement(node)) {
        const opts = node.opts;
        if (isStringLiteral(opts)) {
            const parsed = parseHexLiteral(opts);
            return parsed && { kind: 'absolute', hexDigits: parsed.hexDigits, vector: parsed.vector };
        }
        if (isSymbolRef(opts)) {
            return traceOptsChain(node);
        }
        return undefined;
    }
    if (isMethodCall(node)) {
        const fnName = iorOrAndName(node);
        if (!fnName) {
            return undefined;
        }
        const parsed = parseHexLiteral(node.args[1]?.expression);
        return parsed && { kind: 'mask-call', fnName, maskHex: parsed.hexDigits, vector: parsed.vector };
    }
    return undefined;
}

/**
 * User-facing sentence for each {@link SetOptsUnsafeReason}, keyed once so plan 88-03's edit
 * gating can reuse the exact same wording in its own `reason` field rather than a second,
 * potentially-diverging inline string switch.
 */
export const UNSAFE_REASON_TEXT: Record<SetOptsUnsafeReason, string> = {
    'control-flow': 'a conditional, loop, or GOTO/GOSUB sits between this statement and its origin',
    reassigned: 'the variable is reassigned to something other than an IOR/AND of itself before this statement',
    alias: 'one of the IOR/AND reassignments operates on a different variable',
    'unparseable-mask': 'one of the IOR/AND masks in this chain is not a literal this decoder can read',
    'no-origin': 'no `var$=OPTS` assignment was found in the enclosing block',
};

/** Catalog labels for a resolved set/clear bit list (each entry already names one specific
 * catalog bit — {@link describeIorAndMask}'s `'set'` kind is the correct presence check for
 * both `effect.set` and `effect.clear`, since the inversion only applies when interpreting a
 * raw multi-bit `AND` mask argument, not an already-resolved single-bit result). */
function chainEffectLabels(entries: Array<{ byte: number; mask: number }>): string[] {
    return entries.flatMap(e => describeIorAndMask(e.byte, e.mask, 'set'));
}

/** Render the `chain` shape (b): the accumulated safe-chain effect, or the unsafe-chain
 * undecidability statement — the two must never share their introducing phrase (a future
 * refactor collapsing them into one render path would be a DISC-06 safety regression). */
function chainHoverMarkdown(shape: Extract<SetOptsCodeShape, { kind: 'chain' }>): string {
    const header = `__SETOPTS ${shape.variableName}__`;
    if (!shape.safe) {
        const reason = shape.unsafeReason ? UNSAFE_REASON_TEXT[shape.unsafeReason] : undefined;
        return `${header}\n\nThe effective value of this SETOPTS cannot be determined statically`
            + (reason ? ` — ${reason}.` : '.');
    }
    const setLabels = chainEffectLabels(shape.effect.set);
    const clearLabels = chainEffectLabels(shape.effect.clear);
    return [
        header,
        '',
        'Evaluated against the current runtime options vector returned by OPTS.',
        '',
        `Sets: ${setLabels.length ? setLabels.join(' · ') : '(none)'}`,
        `Clears: ${clearLabels.length ? clearLabels.join(' · ') : '(none)'}`,
    ].join('\n');
}

/** Render the `mask-call` shape (c): a single `IOR`/`AND` call, with `AND` masks framed as the
 * options they clear (DISC-05's cleared-bits requirement) — never as a raw bitmask. */
function maskCallHoverMarkdown(shape: Extract<SetOptsCodeShape, { kind: 'mask-call' }>): string {
    const header = `__${shape.fnName}($${shape.maskHex}$)__`;
    return shape.fnName === 'IOR'
        ? `${header}\n\nSets these options: ${describeMaskVector(shape.vector, 'set')}`
        : `${header}\n\nClears these options: ${describeMaskVector(shape.vector, 'clear')}`;
}

/**
 * Render a {@link SetOptsCodeShape} as hover markdown. For `absolute`, reuses `describeVector`
 * verbatim. For `chain`/`mask-call`, see {@link chainHoverMarkdown}/{@link maskCallHoverMarkdown}.
 */
export function setoptsHoverMarkdown(shape: SetOptsCodeShape): string {
    switch (shape.kind) {
        case 'absolute':
            return `__SETOPTS $${shape.hexDigits}$__\n\n${describeVector(shape.vector)}`;
        case 'chain':
            return chainHoverMarkdown(shape);
        case 'mask-call':
            return maskCallHoverMarkdown(shape);
    }
}

/**
 * Trace an `OPTS`-derived `IOR`/`AND` reassignment chain backward from `target` — a
 * `SetOptsStatement` (shape b). Implements 88-RESEARCH.md's Traceability Algorithm: the walk
 * never crosses into an enclosing or nested scope, and any statement it cannot fully account
 * for stops the walk with a named {@link SetOptsUnsafeReason} rather than a guessed "safe".
 *
 * Returns `undefined` only when no tracked variable name can be determined from `target` at
 * all (not an unsafe chain — there is no chain to report). Otherwise always returns the `chain`
 * variant of {@link SetOptsCodeShape}, with `links`/`effect` in source order.
 */
export function traceOptsChain(target: SetOptsStatement): Extract<SetOptsCodeShape, { kind: 'chain' }> | undefined {
    const variableName = trackedVariableName(target);
    if (!variableName) {
        return undefined;
    }
    const anchor = findAnchor(target);
    if (!anchor) {
        return { kind: 'chain', variableName, safe: false, unsafeReason: 'no-origin', links: [], effect: { set: [], clear: [] } };
    }
    const anchorStatement = anchor.statements[anchor.anchorIndex];
    const walk = walkChain(anchor.statements, anchorStatement, variableName);
    const links = [...walk.linksNewestFirst].reverse();
    const effect = foldChainEffect(links);
    return walk.safe
        ? { kind: 'chain', variableName, safe: true, links, effect, originNode: walk.originNode }
        : { kind: 'chain', variableName, safe: false, unsafeReason: walk.unsafeReason, links, effect };
}

/**
 * Fold a sequence of chain links (in source order) into their accumulated set/clear effect, in
 * `SETOPTS_BITS` catalog order. An `IOR` link whose mask has a catalog bit set marks it `set`;
 * an `AND` link whose mask has that bit CLEAR marks it `clear`; any other combination — the bit
 * absent from an `IOR` mask, present in an `AND` mask, or the mask too short to cover that
 * byte at all — leaves the bit's previously accumulated state untouched (last write wins per
 * bit, not per link).
 */
export function foldChainEffect(links: SetOptsChainLink[]): SetOptsChainEffect {
    const state = new Map<string, boolean>(); // "byte:mask" -> true (set) | false (clear)
    for (const link of links) {
        for (const bit of SETOPTS_BITS) {
            const byteIndex = bit.byte - 1;
            if (byteIndex >= link.vector.bytes.length) {
                continue; // this link's mask doesn't cover this catalog byte — no effect
            }
            const bitPresent = (link.vector.bytes[byteIndex] & bit.mask) !== 0;
            if (link.fnName === 'IOR' && bitPresent) {
                state.set(`${bit.byte}:${bit.mask}`, true);
            } else if (link.fnName === 'AND' && !bitPresent) {
                state.set(`${bit.byte}:${bit.mask}`, false);
            }
        }
    }
    const set: Array<{ byte: number; mask: number }> = [];
    const clear: Array<{ byte: number; mask: number }> = [];
    for (const bit of SETOPTS_BITS) {
        const value = state.get(`${bit.byte}:${bit.mask}`);
        if (value === true) {
            set.push({ byte: bit.byte, mask: bit.mask });
        } else if (value === false) {
            clear.push({ byte: bit.byte, mask: bit.mask });
        }
    }
    return { set, clear };
}
