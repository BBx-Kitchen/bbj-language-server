import { AstNode, Reference } from "langium";
import { isMemberCall, isSymbolRef, MethodCall, NamedElement } from "./generated/ast.js";

export function assertType<T>(_x: unknown): asserts _x is T {}

/**
 * `simpleName` is a runtime-only property set on interop-supplied DTOs (JavaClass, JavaField,
 * FieldDecl, BbjClass nodes backed by a resolved Java peer); it is absent from the generated AST
 * types. Narrowed to `string | undefined` (never a non-string truthy value in practice) so
 * callers can keep using it directly wherever a `string` is required, while preserving the
 * original falsy-on-empty-string fallback behaviour (`simpleName ? simpleName : node.name`).
 */
export function readSimpleName(node: AstNode): string | undefined {
    const raw = (node as unknown as { simpleName?: unknown }).simpleName;
    return typeof raw === 'string' ? raw : undefined;
}

/**
 * Resolves the reference to whatever a call invokes: the symbol of a plain call such as
 * `CHR(65)` or `FNAREA(3,4)`, or the member of a member call such as `p!.resize(100, 200)`.
 * Returns `undefined` for any other callee shape. Signature help and inlay hints both resolve
 * the callee through this one function (#580).
 */
export function getFunctionReference(callNode: MethodCall): Reference<NamedElement> | undefined {
    const method = callNode.method;
    if (isSymbolRef(method)) {
        return method.symbol;
    } else if (isMemberCall(method)) {
        return method.member;
    }
    return undefined;
}