import { AstNode } from 'langium';
import { MethodData, toMethodData } from './bbj-nodedescription-provider.js';
import { LibFunction, MethodDecl, isJavaClass, isJavaMethod, isLibFunction, isMethodDecl } from './generated/ast.js';

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
