import { AstNode, ValidationAcceptor, ValidationChecks, ValidationRegistry } from 'langium';
import {
    Assignment,
    BBjAstType,
    Expression,
    LibFunction,
    MethodCall,
    ParameterCall,
    isBinaryExpression,
    isLibFunction,
    isMethodCall,
    isNumberLiteral,
    isPrefixExpression,
    isStringLiteral,
    isSymbolRef,
} from '../generated/ast.js';

/**
 * Functions whose BASIS syntax is variadic ("num...") — the grammar cannot express
 * repetition, so the library declares them with a single fixed parameter. The
 * "too many arguments" check is skipped for them (the minimum-arity check still applies).
 */
const VARIADIC = new Set(['MAX', 'MIN', 'ERR']);

/**
 * Validate calls to builtin functions against their library signatures (#451):
 * argument arity/type, and the return type against an assignment target.
 */
export function registerFunctionCallChecks(registry: ValidationRegistry): void {
    const checks: ValidationChecks<BBjAstType> = {
        MethodCall: checkFunctionCallArguments,
        Assignment: checkFunctionReturnAssignment,
    };
    registry.register(checks);
}

/**
 * Check a call whose method resolves to a builtin {@link LibFunction} against its
 * declared signature: argument count (arity) and — for literal arguments only —
 * argument type. Non-literal arguments (variables, expressions) are not type-checked,
 * because builtin calls have no call-site type inference yet, so this never
 * false-positives on them.
 */
export function checkFunctionCallArguments(call: MethodCall, accept: ValidationAcceptor): void {
    const fn = resolveLibFunction(call);
    if (!fn) {
        return;
    }

    // Positional parameters vs by-name keyword parameters (ERR=, MODE=, IND=, ...).
    const positionalParams = fn.parameters.filter(p => !p.refByName);
    const requiredCount = positionalParams.filter(p => !p.optional).length;
    const maxCount = positionalParams.length;

    // By-name keyword args (`NAME=value`) don't count toward positional arity. `ERR=`
    // is captured by the grammar's Err fragment into `call.err`, never into `call.args`.
    const positionalArgs = call.args.filter(arg => !isNamedArgument(arg, fn));

    // --- Arity ---
    if (positionalArgs.length < requiredCount) {
        const expected = requiredCount === maxCount ? `${requiredCount}` : `at least ${requiredCount}`;
        accept('warning',
            `Function '${fn.name}()' expects ${expected} argument${requiredCount === 1 ? '' : 's'}, but received ${positionalArgs.length}.`,
            { node: call });
    } else if (!VARIADIC.has(fn.name.toUpperCase()) && positionalArgs.length > maxCount) {
        accept('warning',
            `Function '${fn.name}()' accepts at most ${maxCount} argument${maxCount === 1 ? '' : 's'}, but received ${positionalArgs.length}.`,
            { node: call });
    }

    // --- Argument types (literals only) ---
    for (let i = 0; i < positionalArgs.length && i < positionalParams.length; i++) {
        const literal = literalKind(positionalArgs[i]);
        if (!literal) {
            continue;
        }
        const expected = numericOrString(positionalParams[i].type);
        if (expected && expected !== literal) {
            accept('warning',
                `Argument ${i + 1} of '${fn.name}()' expects a ${expected} value, but a ${literal} literal was given.`,
                { node: positionalArgs[i] });
        }
    }
}

/**
 * Check that a builtin function's return type matches the variable it is assigned to,
 * e.g. `A = HTA("a")` — HTA returns a string, but `A` (no suffix) is numeric.
 * Only plain `var = fn(...)` assignments are judged: the value must be the call itself
 * (not part of a larger expression), and the target a simple string/numeric variable
 * whose kind is unambiguous from its name suffix ($ = string, % = int, none = numeric).
 * Object variables (`!`) and object/any/void returns are not judged.
 */
export function checkFunctionReturnAssignment(assignment: Assignment, accept: ValidationAcceptor): void {
    if (!isMethodCall(assignment.value)) {
        return;
    }
    const fn = resolveLibFunction(assignment.value);
    if (!fn) {
        return;
    }
    const returnKind = numericOrString(fn.returnType);
    const targetKind = variableKind(assignment.variable);
    if (returnKind && targetKind && returnKind !== targetKind) {
        const name = isSymbolRef(assignment.variable) ? assignment.variable.symbol.$refText : 'the target';
        accept('warning',
            `Function '${fn.name}()' returns a ${returnKind} value, but it is assigned to the ${targetKind} variable '${name}'.`,
            { node: assignment, property: 'value' });
    }
}

/** Resolve a call expression to the builtin {@link LibFunction} it invokes, if any. */
function resolveLibFunction(call: MethodCall): LibFunction | undefined {
    if (!isSymbolRef(call.method)) {
        return undefined;
    }
    let target: AstNode | undefined;
    try {
        target = call.method.symbol.ref;
    } catch {
        return undefined; // cyclic / unresolved reference
    }
    return isLibFunction(target) ? target : undefined;
}

/** A `NAME=value` argument whose NAME matches one of the function's by-name parameters. */
function isNamedArgument(arg: ParameterCall, fn: LibFunction): boolean {
    const expr = arg.expression;
    if (!isBinaryExpression(expr) || expr.operator !== '=' || !isSymbolRef(expr.left)) {
        return false;
    }
    const nameUpper = expr.left.symbol.$refText.toUpperCase();
    return fn.parameters.some(p => p.refByName && p.name.toUpperCase() === nameUpper);
}

/** Map a BBj type name to the string/numeric bucket, or undefined when too ambiguous to judge. */
function numericOrString(type: string): 'numeric' | 'string' | undefined {
    switch (type) {
        case 'num':
        case 'int':
            return 'numeric';
        case 'string':
        case 'char':
            return 'string';
        // object/any/void and everything else: don't judge.
        default:
            return undefined;
    }
}

/** The bucket of an assignment target from its name suffix, or undefined when not judged. */
function variableKind(variable: Expression): 'numeric' | 'string' | undefined {
    if (!isSymbolRef(variable)) {
        return undefined;
    }
    const name = variable.symbol.$refText;
    if (name.endsWith('$')) {
        return 'string';
    }
    if (name.endsWith('!')) {
        return undefined; // object variable — not a string/numeric mismatch
    }
    // No suffix (or '%') denotes a numeric scalar — unless it resolves to an explicitly
    // class-typed declaration (a `declare`d/field/param variable), which we don't judge.
    const ref = safeRef(variable);
    if (ref && 'type' in ref && (ref as { type?: unknown }).type) {
        return undefined;
    }
    return 'numeric';
}

function safeRef(variable: Expression): AstNode | undefined {
    if (!isSymbolRef(variable)) {
        return undefined;
    }
    try {
        return variable.symbol.ref;
    } catch {
        return undefined;
    }
}

/** The kind of a plain literal argument, or undefined when the argument is not a literal. */
function literalKind(arg: ParameterCall): 'numeric' | 'string' | undefined {
    const expr = arg.expression;
    if (isStringLiteral(expr)) {
        return 'string';
    }
    if (isNumberLiteral(expr)) {
        return 'numeric';
    }
    // signed numeric literal, e.g. -5 or +3
    if (isPrefixExpression(expr) && (expr.operator === '-' || expr.operator === '+') && isNumberLiteral(expr.expression)) {
        return 'numeric';
    }
    return undefined;
}
