import { ValidationAcceptor, ValidationChecks, ValidationRegistry } from 'langium';
import {
    BBjAstType,
    LibFunction,
    MethodCall,
    ParameterCall,
    isBinaryExpression,
    isLibFunction,
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
 * Validate calls to builtin functions against their library signatures (#451).
 */
export function registerFunctionCallChecks(registry: ValidationRegistry): void {
    const checks: ValidationChecks<BBjAstType> = {
        MethodCall: checkFunctionCallArguments,
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
    const method = call.method;
    if (!isSymbolRef(method)) {
        return;
    }
    let target;
    try {
        target = method.symbol.ref;
    } catch {
        return; // cyclic / unresolved reference
    }
    if (!isLibFunction(target)) {
        return;
    }
    const fn = target;

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
        const expected = expectedKind(positionalParams[i].type);
        if (expected && expected !== literal) {
            accept('warning',
                `Argument ${i + 1} of '${fn.name}()' expects a ${expected} value, but a ${literal} literal was given.`,
                { node: positionalArgs[i] });
        }
    }
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

/** What a declared parameter type accepts, or undefined when it is too ambiguous to judge. */
function expectedKind(type: string): 'numeric' | 'string' | undefined {
    switch (type) {
        case 'num':
        case 'int':
            return 'numeric';
        case 'string':
            return 'string';
        // char/object/any and everything else: don't judge.
        default:
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
