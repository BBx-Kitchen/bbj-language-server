import { ValidationAcceptor, ValidationChecks, ValidationRegistry } from 'langium';
import type { BBjServices } from '../bbj-module.js';
import { TypeInferer } from '../bbj-type-inferer.js';
import {
    BBjAstType,
    Expression,
    JavaClass,
    MemberCall,
    NamedElement,
    isArrayDecl,
    isAssignment,
    isCastExpression,
    isConstructorCall,
    isJavaClass,
    isMemberCall,
    isMethodCall,
    isStringLiteral,
    isSymbolRef,
    isVariableDecl
} from '../generated/ast.js';

import { isTemplateStringArray } from '../bbj-scope-local.js';

/** Diagnostic code carried by every Error this check emits. */
export const UNKNOWN_JAVA_MEMBER_CODE = 'bbj-unknown-java-member';

/**
 * True only for a Java class the interop backend actually described. `createStubClass` sets
 * `error` on every stub returned for a failed, cancelled, cold or depth-limited resolution, so
 * only a class the backend fully resolved passes here. The synthetic BBjAPI fallback
 * (`lib/bbj-api.ts`) parses to a BbjClass, never a JavaClass, so it never reaches this guard.
 */
export function isFullyResolvedJavaClass(type: unknown): type is JavaClass {
    return isJavaClass(type) && !type.error;
}

/**
 * Read `receiver.symbol.ref` for a SymbolRef, tolerating a cyclic-reference throw. Typed as
 * `unknown` rather than `NamedElement | undefined` (its true static type) because Assignment --
 * one of the shapes callers narrow this to with `isAssignment` -- is a plain AstNode, not a
 * NamedElement; narrowing a `NamedElement` typed value to it collapses to `never`, exactly the
 * same "let x;" widening bbj-type-inferer.ts already relies on for the identical read.
 */
function resolveSymbol(receiver: Expression): unknown {
    if (!isSymbolRef(receiver)) {
        return undefined;
    }
    try {
        return receiver.symbol?.ref;
    } catch {
        // Langium throws on cyclic reference resolution.
        return undefined;
    }
}

/**
 * True when the receiver's type is certain enough to trust an "unknown member" verdict on. BBj
 * dispatches an object method call on the runtime object, so a type reached only through a
 * method's return type or a Java field's type is a lower bound, not a guarantee -- such a
 * receiver keeps today's Warning instead of a new Error.
 */
export function hasCertainReceiverType(receiver: Expression, depth = 0): boolean {
    if (depth > 8) {
        return false;
    }
    if (isConstructorCall(receiver) || isCastExpression(receiver) || isStringLiteral(receiver)) {
        return true;
    }
    if (isMethodCall(receiver)) {
        const method = receiver.method;
        if (isSymbolRef(method)) {
            return method.symbol?.$refText?.toLowerCase() === 'bbjapi';
        }
        return false;
    }
    if (isSymbolRef(receiver)) {
        const ref = resolveSymbol(receiver);
        if (isJavaClass(ref)) {
            // Class reference, e.g. `String` after `USE java.lang.String`.
            return true;
        }
        if (isVariableDecl(ref) && !isArrayDecl(ref) && ref.arrayDims.length === 0) {
            // DECLARE, a typed field or a typed parameter -- but not an array of that type.
            // `declare Type[] var!` (or `Type@[] var!`) parses as a plain VariableDecl/FieldDecl/
            // ParameterDecl with non-empty arrayDims, not the separate ArrayDecl node the isArrayDecl
            // guard above already excludes -- an array's own pseudo-members (Java's `.length`) are
            // not members of the element class itself, so this receiver is not certain either.
            return true;
        }
        if (isAssignment(ref)) {
            // An undeclared variable takes its first assignment's own certainty.
            return hasCertainReceiverType(ref.value, depth + 1);
        }
        return false;
    }
    return false;
}

/**
 * Reports a method call or field read that does not exist on a fully resolved Java class as an
 * Error the diagnostic hierarchy cannot hide -- every uncertain receiver keeps today's linking
 * Warning. See the guards below; each returns silently, matching the codebase's own
 * silent-skip-on-ambiguous-input idiom (never throw, never flag an uncertain shape).
 */
export function checkUnknownJavaMember(memberCall: MemberCall, accept: ValidationAcceptor, typeInferer: TypeInferer): void {
    if (!memberCall.member) {
        // Broken syntax like "obj!.   "
        return;
    }
    const memberText = memberCall.member.$refText;
    if (memberText.toLowerCase() === 'class') {
        // The implicit .class pseudo-member always resolves to java.lang.Class, regardless of
        // casing or whether java.lang.Class itself is resolvable in this environment.
        return;
    }
    const receiver = memberCall.receiver;
    const receiverSymbol = resolveSymbol(receiver);
    if (isArrayDecl(receiverSymbol) && isTemplateStringArray(receiverSymbol)) {
        // Template string field access (e.g. `key.my_col` from `DIM key$:"MY_COL:K(10)"`) --
        // the linker already skips linking this shape entirely.
        return;
    }
    let memberRef: NamedElement | undefined;
    try {
        memberRef = memberCall.member.ref;
    } catch {
        // Cyclic reference -- treat exactly like an unresolved member (nothing more to say here).
        return;
    }
    if (memberRef) {
        // Linking already resolved this reference -- nothing unknown about it.
        return;
    }
    const receiverType = typeInferer.getType(receiver);
    if (!isFullyResolvedJavaClass(receiverType)) {
        return;
    }
    if (!hasCertainReceiverType(receiver)) {
        return;
    }

    const isClassRef = isJavaClass(receiverSymbol);
    const memberTextLower = memberText.toLowerCase();
    // A bare class reference used as a method-call receiver (e.g. `BBjAPI.setClientProperty(...)`,
    // with no parentheses instantiating an object first) is accepted by the compiler for at least
    // some of BBj's Java proxy classes, and calls a real instance method -- confirmed against real
    // documentation-sample code and the live backend's own class description. Field access has no
    // such carve-out: issue #440's own regression still requires an instance field read through a
    // class reference to be flagged, so the static-only rule stays for fields only.
    const methodMatch = receiverType.methods.some(m => m.name.toLowerCase() === memberTextLower);
    if (methodMatch) {
        return;
    }
    const fieldMatch = receiverType.fields.some(f => (!isClassRef || f.isStatic) && f.name.toLowerCase() === memberTextLower);
    if (fieldMatch) {
        return;
    }
    // A nested class reference (e.g. `Tree.Kind`, a real Java member class) is not a method or
    // field, and today's scope provider does not offer it -- so it is always an unresolved
    // linking Warning already, never an Error this check should add. Reporting it as an unknown
    // member would be a false positive on legitimate Java syntax this check has no business
    // judging -- report only what is certain to be missing.
    const nestedClassMatch = receiverType.classes.some(c => c.name.toLowerCase() === memberTextLower);
    if (nestedClassMatch) {
        return;
    }
    // A class-reference member used as the receiver of a further member access (`Tree.Kind.CLASS`)
    // might be a real Java nested class or enum -- java-interop's JavaClass model carries no
    // nested-class membership data at all (`classes` above is always empty for a reflected
    // class), so this shape is genuinely unknowable from here, not a confirmed-missing member.
    // Nested types are only ever reached through a class reference, never an instance, so this
    // stays scoped to isClassRef.
    if (isClassRef && isMemberCall(memberCall.$container) && memberCall.$container.receiver === memberCall) {
        return;
    }

    const isMethod = isMethodCall(memberCall.$container) && memberCall.$container.method === memberCall;
    const kindWord = isMethod ? 'method' : 'field';
    const prefix = isClassRef ? `Static ${kindWord}` : (kindWord === 'method' ? 'Method' : 'Field');
    accept('error', `${prefix} '${memberText}' is not defined on ${receiverType.name}`, {
        node: memberCall,
        property: 'member',
        data: { code: UNKNOWN_JAVA_MEMBER_CODE }
    });
}

export function registerUnknownJavaMemberChecks(registry: ValidationRegistry, services: BBjServices): void {
    const typeInferer = services.types.Inferer;
    const checks: ValidationChecks<BBjAstType> = {
        MemberCall: (memberCall, accept) => checkUnknownJavaMember(memberCall, accept, typeInferer)
    };
    registry.register(checks);
}
