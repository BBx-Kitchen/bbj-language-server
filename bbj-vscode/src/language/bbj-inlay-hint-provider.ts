import { AstNode, Reference } from 'langium';
import { AbstractInlayHintProvider, InlayHintAcceptor } from 'langium/lsp';
import { InlayHintKind } from 'vscode-languageserver';
import { findOverloadForArity, fitsArity, isFunctionNodeDescription } from './bbj-nodedescription-provider.js';
import { Expression, MethodCall, NamedElement, isMemberCall, isMethodCall, isNumberLiteral, isPrefixExpression, isStringLiteral, isSymbolRef } from './generated/ast.js';

export type ParameterHintMode = 'none' | 'literals' | 'all';

let parameterHintMode: ParameterHintMode = 'literals';

export function setParameterHintMode(mode: unknown): void {
    if (mode === 'none' || mode === 'literals' || mode === 'all') {
        parameterHintMode = mode;
    }
}

export function getParameterHintMode(): ParameterHintMode {
    return parameterHintMode;
}

/**
 * Names the JDK invents when a jar was compiled without -parameters (arg0, arg1, ...).
 * Showing them as hints is worse than showing nothing.
 */
const SYNTHETIC_NAME = /^(arg|param|p)\d+$/i;

/**
 * Parameter name inlay hints at call sites (issue #108). Resolves the callee the same
 * way signature help does: through the reference's FunctionNodeDescription, which
 * normalizes BBj class methods, DEF FN functions, builtin library functions and Java
 * methods (with the Javadoc-backed realName fallback) into one parameter list.
 */
export class BBjInlayHintProvider extends AbstractInlayHintProvider {

    override computeInlayHint(node: AstNode, acceptor: InlayHintAcceptor): void {
        if (parameterHintMode === 'none') {
            return;
        }
        if (!isMethodCall(node) || node.args.length === 0) {
            return;
        }
        const ref = this.getFunctionReference(node);
        // Access .ref so lazily linked references are resolved before reading the description
        if (!ref?.ref) {
            return;
        }
        const description = ref.$nodeDescription;
        if (!isFunctionNodeDescription(description)) {
            return;
        }
        const calleeName = description.name.toLowerCase();
        // The linker links an overloaded name to one arbitrary declaration; when that
        // signature cannot take this call's argument count, hint from the sibling
        // overload that can (#478).
        let parameters = description.parameters;
        if (!fitsArity(description, node.args.length)) {
            parameters = findOverloadForArity(ref.ref, node.args.length)?.parameters ?? parameters;
        }
        // Extra arguments beyond the declared parameters (varargs, arity errors) get no hint
        const count = Math.min(node.args.length, parameters.length);
        for (let i = 0; i < count; i++) {
            const cst = node.args[i].$cstNode;
            if (!cst) {
                continue;
            }
            const parameter = parameters[i];
            const name = (parameter.realName ?? parameter.name)?.trim();
            if (!name || SYNTHETIC_NAME.test(stripTypeSuffix(name))) {
                continue;
            }
            if (parameterHintMode === 'literals' && !isLiteralArgument(node.args[i].expression)) {
                continue;
            }
            if (matchesParameterName(cst.text, name) || isSelfDescribing(calleeName, name)) {
                continue;
            }
            acceptor({
                position: cst.range.start,
                label: `${name}:`,
                kind: InlayHintKind.Parameter,
                paddingRight: true
            });
        }
    }

    protected getFunctionReference(callNode: MethodCall): Reference<NamedElement> | undefined {
        const method = callNode.method;
        if (isSymbolRef(method)) {
            return method.symbol;
        } else if (isMemberCall(method)) {
            return method.member;
        }
        return undefined;
    }
}

/**
 * True for arguments whose value carries no name of its own: string/number literals,
 * optionally behind a numeric sign (-1, +0.5). Everything else (variables, calls,
 * arithmetic) is considered self-describing in 'literals' mode.
 */
export function isLiteralArgument(expression: Expression): boolean {
    if (isPrefixExpression(expression) && (expression.operator === '-' || expression.operator === '+')) {
        return isLiteralArgument(expression.expression);
    }
    return isNumberLiteral(expression) || isStringLiteral(expression);
}

/** BBj variable names carry type suffixes (name$, obj!, i%) that must not defeat name comparisons. */
function stripTypeSuffix(name: string): string {
    return name.replace(/[!$%]$/, '');
}

/**
 * A hint is redundant when the argument is a plain identifier already spelling the
 * parameter name: foo(count) for foo(count). Case-insensitive (BBj), ignoring type
 * suffixes and instance access: foo(#count!) matches parameter "count".
 */
export function matchesParameterName(argumentText: string, parameterName: string): boolean {
    const identifier = /^#?([a-zA-Z_][a-zA-Z0-9_]*)[!$%]?$/.exec(argumentText.trim());
    return identifier !== null
        && identifier[1].toLowerCase() === stripTypeSuffix(parameterName).toLowerCase();
}

/**
 * setName(x$) style: the callee name already contains the parameter name, so a hint
 * adds nothing. Only applied to names of 3+ characters to avoid accidental substrings.
 */
export function isSelfDescribing(calleeName: string, parameterName: string): boolean {
    const bare = stripTypeSuffix(parameterName).toLowerCase();
    return bare.length >= 3 && calleeName.includes(bare);
}
