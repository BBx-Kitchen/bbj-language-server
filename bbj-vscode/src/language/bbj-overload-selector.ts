import { AstNode } from 'langium';
import { MethodData, toMethodData } from './bbj-nodedescription-provider.js';
import type { TypeInferer } from './bbj-type-inferer.js';
import { Expression, JavaMethod, LibFunction, MethodDecl, isClass, isJavaClass, isJavaMethod, isLibFunction, isMethodDecl, isNumberLiteral, isPrefixExpression, isStringLiteral } from './generated/ast.js';

/**
 * Overload selection for call sites (#478). The linker resolves an overloaded method
 * name to whichever declaration the scope yields first, so `sg!.addWindow("Title")`
 * may link to the multi-parameter overload and expose the wrong parameter list.
 *
 * Call sites re-select among the sibling overloads by the call's shape: only
 * signatures that can take the argument count are considered, ranked by how well
 * the argument types fit the parameter types position by position.
 */

/**
 * What is known about an argument's type at a call site: a literal category,
 * an inferred class name, or nothing.
 */
export type ArgumentType = 'number' | 'string' | { className: string } | undefined;

/** A signature can take `argCount` arguments: all non-optional parameters are covered. */
export function fitsArity(method: MethodData, argCount: number): boolean {
    const required = method.parameters.filter(p => !p.optional).length;
    return argCount >= required && argCount <= method.parameters.length;
}

/**
 * Returns the overload of the linked declaration that best fits the call, judged by
 * argument count and argument-type affinity — the linked signature itself when it wins
 * or when there is nothing better to choose from.
 */
export function findBestOverload(resolved: AstNode | undefined, linked: MethodData, argTypes: ArgumentType[]): MethodData {
    const siblings = resolved ? siblingOverloads(resolved) : [];
    if (siblings.length === 0) {
        return linked;
    }
    // The linked declaration goes first so it wins all ties.
    const candidates = [linked, ...siblings].filter(c => fitsArity(c, argTypes.length));
    if (candidates.length === 0) {
        return linked;
    }
    let best = candidates[0];
    let bestScore = scoreOverload(best, argTypes);
    for (let i = 1; i < candidates.length; i++) {
        const score = scoreOverload(candidates[i], argTypes);
        if (score > bestScore) {
            best = candidates[i];
            bestScore = score;
        }
    }
    return best;
}

function scoreOverload(method: MethodData, argTypes: ArgumentType[]): number {
    // Taking every argument as a declared parameter beats relying on optional ones
    let score = method.parameters.length === argTypes.length ? 1 : 0;
    for (let i = 0; i < argTypes.length && i < method.parameters.length; i++) {
        score += typeAffinity(argTypes[i], method.parameters[i].type);
    }
    return score;
}

// Numeric also covers booleans: BBj spells them 0/1. Class names are compared by
// lower-cased simple name — Java subtyping is not available here (JavaClass carries
// no hierarchy), so an unrelated-looking pair scores neutral, never negative.
// `byte` is deliberately NOT numeric: the interop service erases arrays to their
// component type, so a reflected `byte` is almost always a byte[] parameter
// (addWindow's p_flags, event masks), which BBj fills with (hex) strings — it must
// not count against a string argument.
const NUMERIC_TYPES = new Set(['number', 'int', 'integer', 'long', 'short', 'float', 'double', 'boolean', 'bool', 'num', 'bbjnumber', 'bbjint']);
const STRING_TYPES = new Set(['string', 'charsequence', 'bbjstring']);

function typeAffinity(arg: ArgumentType, parameterType: string): number {
    if (!arg || !parameterType) {
        return 0;
    }
    const param = simpleName(parameterType);
    const argName = typeof arg === 'string' ? arg : simpleName(arg.className);
    if (typeof arg !== 'string' && argName === param) {
        return 3;
    }
    const argNumeric = NUMERIC_TYPES.has(argName);
    const argString = STRING_TYPES.has(argName);
    if ((argNumeric && STRING_TYPES.has(param)) || (argString && NUMERIC_TYPES.has(param))) {
        return -4;
    }
    if ((argNumeric && NUMERIC_TYPES.has(param)) || (argString && STRING_TYPES.has(param))) {
        return 2;
    }
    return 0;
}

function simpleName(type: string): string {
    const dot = type.lastIndexOf('.');
    return (dot >= 0 ? type.substring(dot + 1) : type).toLowerCase();
}

/**
 * The call-site knowledge about an argument's type, used to rank overloads. Shared by the
 * inlay-hint provider and the type inferer so both derive it the same way (#556).
 */
export function argumentTypeOf(expression: Expression, inferer: TypeInferer): ArgumentType {
    let expr = expression;
    while (isPrefixExpression(expr) && (expr.operator === '-' || expr.operator === '+')) {
        expr = expr.expression;
    }
    if (isNumberLiteral(expr)) {
        return 'number';
    }
    if (isStringLiteral(expr)) {
        return 'string';
    }
    const type = inferer.getType(expr);
    return isClass(type) ? { className: type.name } : undefined;
}

/**
 * A candidate overload paired with the AstNode it came from. `findBestOverload`'s own
 * MethodData-only result cannot be resolved back to a Class for a MethodDecl sibling —
 * `toMethodData()` keeps only string type names, discarding the QualifiedClass node a
 * return-type lookup needs. This candidate shape keeps both.
 */
export interface OverloadCandidate {
    node: JavaMethod | MethodDecl;
    data: MethodData;
}

/**
 * Like `siblingOverloads`, but keeps the originating node paired with its `MethodData` and
 * always puts the linked declaration first.
 */
export function overloadCandidates(linked: AstNode): OverloadCandidate[] {
    if (isJavaMethod(linked) && isJavaClass(linked.$container)) {
        const siblings = linked.$container.methods.filter(m => m !== linked && m.name === linked.name);
        return [linked, ...siblings].map(node => ({ node, data: node }));
    }
    if (isMethodDecl(linked)) {
        const name = linked.name.toLowerCase();
        const siblings = linked.$container.members
            .filter((m): m is MethodDecl => isMethodDecl(m) && m !== linked && m.name.toLowerCase() === name);
        return [linked, ...siblings].map(node => ({ node, data: toMethodData(node) }));
    }
    return [];
}

/**
 * The candidates among `candidates` that best fit `argTypes`, scored the same way as
 * `findBestOverload`. When none of the candidates can take `argTypes.length` arguments,
 * every candidate is returned unfiltered — the arguments decide nothing. Otherwise only the
 * candidates sharing the single highest score are returned, in their input order.
 *
 * The caller decides what a tie means: the type inferer treats tied candidates with
 * different return types as undecided and infers no type (#556). `findBestOverload`'s own
 * tie rule (the linked declaration wins) is unrelated and unchanged by this function.
 */
export function bestOverloadCandidates(candidates: OverloadCandidate[], argTypes: ArgumentType[]): OverloadCandidate[] {
    const fitting = candidates.filter(c => fitsArity(c.data, argTypes.length));
    const pool = fitting.length > 0 ? fitting : candidates;
    let bestScore = -Infinity;
    for (const c of pool) {
        bestScore = Math.max(bestScore, scoreOverload(c.data, argTypes));
    }
    return pool.filter(c => scoreOverload(c.data, argTypes) === bestScore);
}

/** All other declarations sharing the resolved declaration's name and container. */
function siblingOverloads(node: AstNode): MethodData[] {
    if (isJavaMethod(node) && isJavaClass(node.$container)) {
        return node.$container.methods.filter(m => m !== node && m.name === node.name);
    }
    if (isMethodDecl(node)) {
        const name = node.name.toLowerCase();
        return node.$container.members
            .filter((m): m is MethodDecl => isMethodDecl(m) && m !== node && m.name.toLowerCase() === name)
            .map(toMethodData);
    }
    if (isLibFunction(node)) {
        const name = node.name.toLowerCase();
        return node.$container.declarations
            .filter((d): d is LibFunction => isLibFunction(d) && d !== node && d.name.toLowerCase() === name);
    }
    return [];
}
