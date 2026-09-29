/**
 * Method return type and field initializer checks: validates METHODRET statements and field
 * initializers against their declared types, including a conservative literal-kind check and a
 * deeper Java-type-inference check against a fixed table of well-known FINAL Java types
 * (issue #437, follow-up to #372/#436/#79).
 */
import { AstNode, AstUtils, DiagnosticInfo, ValidationAcceptor } from 'langium';
import { TypeInferer } from '../bbj-type-inferer.js';
import { isTypeResolutionWarningsEnabled } from '../bbj-validator.js';
import { getClass } from '../bbj-nodedescription-provider.js';
import { Class, Expression, FieldDecl, isBbjClass, isClass, isJavaClass, isMethodReturnStatement, isNumberLiteral, isStringLiteral, MethodDecl, QualifiedClass } from '../generated/ast.js';
import { classFqn, bbjSupertypesReach } from './class-types.js';

// BBj scalar return types whose value kind can be checked against returned literals without
// needing type resolution. Names are compared case-insensitively (BBj is case-insensitive).
const STRING_RETURN_TYPES = new Set(['bbjstring']);
const NUMERIC_RETURN_TYPES = new Set(['bbjnumber']);

/**
 * Checks on a method's METHODRET statements against its declared return type. Interface methods
 * (no body, hence no `endTag`) are declared elsewhere and excluded. Covers:
 *  - void method must not return a value;
 *  - non-void method with a body must return a value (issue #372);
 *  - a returned literal whose kind contradicts a BBj scalar return type or a resolvable class.
 * Java-class and unresolved return types are checked only where it is safe without full
 * java-interop-backed type inference, to avoid false positives on BBj's loose typing.
 */
export function checkMethodReturn(meth: MethodDecl, accept: ValidationAcceptor, inferer: TypeInferer): void {
    if (!meth.endTag) {
        return; // no body (interface method) — nothing to check
    }
    const valueReturns = AstUtils.streamAllContents(meth)
        .filter(isMethodReturnStatement)
        .filter(ret => ret.return !== undefined)
        .toArray();

    // A void method must not return a value. The compiler accepts this, so it is a warning
    // rather than an error.
    if (meth.voidReturn) {
        for (const ret of valueReturns) {
            accept('warning', `Method '${meth.name}' is declared void and must not return a value.`, {
                node: ret,
                property: 'return'
            });
        }
        return;
    }

    if (!meth.returnType) {
        return; // neither void nor an explicit return type — nothing required
    }

    // #372: a non-void method with no value-returning METHODRET disagrees with the compiler,
    // which accepts this shape, so it is a warning rather than an error. No special case for
    // an empty or stub-looking body — a plain warning applies uniformly.
    if (valueReturns.length === 0) {
        accept('warning', `Method '${meth.name}' declares a return type but has no METHODRET returning a value.`, {
            node: meth,
            property: 'name'
        });
        return;
    }

    // Conservative return-type check on returned literals. Array return types are skipped.
    if (meth.arrayDims.length > 0) {
        return;
    }
    for (const ret of valueReturns) {
        const mismatch = literalTypeMismatch(meth.returnType, ret.return!);
        if (mismatch) {
            accept('error', `Method '${meth.name}' declares return type '${mismatch.typeName}' but returns a ${mismatch.valueKind}.`, {
                node: ret,
                property: 'return'
            });
            continue; // already reported by the literal check — don't double-report
        }
        // Deeper check against Java / non-BBj return types via type inference (issue #437).
        checkReturnTypeAssignable(meth, ret.return!, {
            node: ret,
            property: 'return'
        }, accept, inferer);
    }
}

// BBj scalar return types are handled by the literal check above and are otherwise loosely
// typed (BBj coerces), so the inference-based Java-type check below skips them to stay
// false-positive-free. Compared case-insensitively.
const BBJ_SCALAR_RETURN_TYPES = new Set(['bbjstring', 'bbjnumber', 'bbjint']);

/**
 * The complete set of assignable target types for well-known FINAL Java types, keyed by the
 * returned type's fully-qualified name (all lower-cased). Because these classes are `final`,
 * their supertype closure is fixed and fully known here — so if the declared return type's FQN
 * is NOT in the set, the returned value is *provably* not assignable and can be flagged with no
 * risk of missing a subtype relationship. Non-final Java types are never flagged (see below),
 * since their hierarchy is not walkable from the AST (a JavaClass carries no supertype info).
 */
const FINAL_TYPE_ASSIGNABLE_TO: ReadonlyMap<string, ReadonlySet<string>> = new Map([
    ['java.lang.string', new Set(['java.lang.string', 'java.lang.charsequence', 'java.lang.comparable', 'java.io.serializable', 'java.lang.object'])],
    ['java.lang.integer', new Set(['java.lang.integer', 'java.lang.number', 'java.lang.comparable', 'java.io.serializable', 'java.lang.object'])],
    ['java.lang.long', new Set(['java.lang.long', 'java.lang.number', 'java.lang.comparable', 'java.io.serializable', 'java.lang.object'])],
    ['java.lang.short', new Set(['java.lang.short', 'java.lang.number', 'java.lang.comparable', 'java.io.serializable', 'java.lang.object'])],
    ['java.lang.byte', new Set(['java.lang.byte', 'java.lang.number', 'java.lang.comparable', 'java.io.serializable', 'java.lang.object'])],
    ['java.lang.double', new Set(['java.lang.double', 'java.lang.number', 'java.lang.comparable', 'java.io.serializable', 'java.lang.object'])],
    ['java.lang.float', new Set(['java.lang.float', 'java.lang.number', 'java.lang.comparable', 'java.io.serializable', 'java.lang.object'])],
    ['java.lang.boolean', new Set(['java.lang.boolean', 'java.lang.comparable', 'java.io.serializable', 'java.lang.object'])],
    ['java.lang.character', new Set(['java.lang.character', 'java.lang.comparable', 'java.io.serializable', 'java.lang.object'])],
    ['java.math.bigdecimal', new Set(['java.math.bigdecimal', 'java.lang.number', 'java.lang.comparable', 'java.io.serializable', 'java.lang.object'])],
    ['java.math.biginteger', new Set(['java.math.biginteger', 'java.lang.number', 'java.lang.comparable', 'java.io.serializable', 'java.lang.object'])]
]);

/**
 * Validates a single returned expression against a method's declared (Java / non-BBj) return
 * type using type inference (issue #437, follow-up to #372/#436). Gated behind the
 * `typeResolutionWarnings` flag, exactly like the CAST-resolvability check.
 *
 * Deliberately conservative to avoid false positives on BBj's loose typing:
 *  - fires ONLY when both the declared and the inferred returned type FULLY resolve to a Class;
 *  - skips BBj scalar declared types (owned by the literal check, and loosely coerced);
 *  - `java.lang.Object` (the top type) is always assignable;
 *  - only reports when the returned value's type is *provably* not assignable — currently when
 *    the returned type is a well-known FINAL Java type whose complete supertype set is known and
 *    does not contain the declared type. Non-final returned types and BBj-class returns are left
 *    unflagged because the Java class hierarchy is not walkable from the AST here.
 */
function checkReturnTypeAssignable<N extends AstNode>(meth: MethodDecl, returned: Expression, info: DiagnosticInfo<N>, accept: ValidationAcceptor, inferer: TypeInferer): void {
    if (!isTypeResolutionWarningsEnabled() || meth.arrayDims.length > 0) {
        return;
    }
    // BBj scalar declared types are handled elsewhere / loosely typed — never flag them here.
    const declaredName = simpleTypeName(meth.returnType!);
    if (declaredName && BBJ_SCALAR_RETURN_TYPES.has(declaredName.toLowerCase())) {
        return;
    }
    const declaredClass = getClass(meth.returnType);
    if (!declaredClass) {
        return; // declared type does not fully resolve — skip silently
    }
    const inferred = inferer.getType(returned);
    if (!inferred || !isClass(inferred)) {
        return; // returned type does not resolve to a Class — skip silently
    }
    if (isAssignable(declaredClass, inferred) === false) {
        accept('error', `Method '${meth.name}' declares return type '${classDisplayName(declaredClass)}' but returns a value of incompatible type '${classDisplayName(inferred)}'.`, info);
    }
}

/**
 * Three-valued assignability of a returned value of type `returned` to the declared type
 * `declared`: `true` = provably assignable, `false` = provably NOT assignable, `undefined` =
 * unknown (must be treated as assignable, i.e. not flagged). Only definitive answers are used
 * to emit a diagnostic.
 */
function isAssignable(declared: Class, returned: Class): boolean | undefined {
    if (declared === returned) {
        return true;
    }
    const declaredFqn = classFqn(declared).toLowerCase();
    const returnedFqn = classFqn(returned).toLowerCase();
    if (declaredFqn === returnedFqn) {
        return true;
    }
    // java.lang.Object is the top type: every reference type is assignable to it.
    if (declaredFqn === 'java.lang.object') {
        return true;
    }
    // A returned BBj class whose resolvable supertype chain reaches the declared class is
    // assignable; otherwise we cannot be certain (the chain may reach Java types we cannot
    // walk), so we defer rather than risk a false positive.
    if (isBbjClass(returned)) {
        return bbjSupertypesReach(returned, declared) ? true : undefined;
    }
    // A returned well-known FINAL Java type has a fully-known supertype set: decide definitively.
    if (isJavaClass(returned)) {
        const assignableTo = FINAL_TYPE_ASSIGNABLE_TO.get(returnedFqn);
        if (assignableTo) {
            return assignableTo.has(declaredFqn);
        }
    }
    return undefined; // hierarchy not walkable / unknown — do not flag
}

/** Human-readable class name for diagnostics (FQN for Java types, simple name for BBj types). */
function classDisplayName(klass: Class): string {
    return isJavaClass(klass) ? classFqn(klass) : klass.name;
}

/**
 * Validates a field's literal initializer against its declared type (#79), e.g.
 * `field public BBjNumber n! = "text"`. Reuses the same conservative, java-interop-free
 * literal check as method return types.
 */
export function checkFieldInit(field: FieldDecl, accept: ValidationAcceptor): void {
    if (!field.init || field.arrayDims.length > 0) {
        return; // no initializer, or an array field — nothing to check here
    }
    const mismatch = literalTypeMismatch(field.type, field.init);
    if (mismatch) {
        accept('error', `Field '${field.name}' is declared '${mismatch.typeName}' but is initialized with a ${mismatch.valueKind}.`, {
            node: field,
            property: 'init'
        });
    }
}

/**
 * If `value` is a literal whose kind contradicts the declared scalar/class `type`, returns the
 * expected type name and the literal kind; otherwise undefined. Only cases that are safe
 * without java-interop-backed type inference are reported, matching BBj's loose typing:
 * a BBjNumber assigned a string literal, a BBjString assigned a number literal, or any literal
 * assigned to a resolvable user-defined BBj class/interface.
 */
function literalTypeMismatch(type: QualifiedClass | undefined, value: Expression): { typeName: string, valueKind: string } | undefined {
    if (!type) {
        return undefined;
    }
    const returnsString = isStringLiteral(value);
    const returnsNumber = isNumberLiteral(value);
    if (!returnsString && !returnsNumber) {
        return undefined; // non-literal: needs deeper type inference, left untouched
    }
    const typeName = simpleTypeName(type);
    if (!typeName) {
        return undefined;
    }
    const lower = typeName.toLowerCase();
    const expectsNumber = NUMERIC_RETURN_TYPES.has(lower);
    const expectsString = STRING_RETURN_TYPES.has(lower);
    // A literal is never an instance of a user-defined BBj class/interface, so any literal
    // assigned to a resolvable BBj class is a mismatch.
    const declaredBBjClass = !expectsNumber && !expectsString && isBbjClass(getClass(type));
    if ((expectsNumber && returnsString) || (expectsString && returnsNumber) || declaredBBjClass) {
        return { typeName, valueKind: returnsString ? 'string' : 'number' };
    }
    return undefined;
}

/** Simple (unqualified) name of a declared type, taken from its source text. */
function simpleTypeName(type: QualifiedClass): string | undefined {
    const text = type.$cstNode?.text?.trim();
    if (!text) {
        return undefined;
    }
    return text.substring(text.lastIndexOf('.') + 1);
}
