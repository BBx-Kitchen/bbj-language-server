import { AstNode } from "langium";

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