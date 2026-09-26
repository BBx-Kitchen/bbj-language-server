import { AstNode, Reference } from "langium";
import { BBjServices } from "./bbj-module.js";
import { argumentTypeOf, bestOverloadCandidates, overloadCandidates } from "./bbj-overload-selector.js";
import { getClass } from "./bbj-nodedescription-provider.js";
import { Assignment, Class, Expression, JavaMethod, MethodCall, MethodDecl, NamedElement, isArrayDecl, isAssignment, isBBjTypeRef, isCastExpression, isClass, isConstructorCall, isFieldDecl, isJavaClass, isJavaField, isJavaMethod, isJavaPackage, isMemberCall, isMethodCall, isMethodDecl, isSimpleTypeRef, isStringLiteral, isSymbolRef, isVariableDecl, JavaPackage } from "./generated/ast.js";
import { JavaInteropService } from "./java-interop.js";

export interface TypeInferer {
    getType(expression: Expression): JavaPackage |Class | undefined;
}

export class BBjTypeInferer implements TypeInferer {
    protected readonly javaInterop: JavaInteropService;
    private resolving = new Set<AstNode>();

    constructor(services: BBjServices) {
        this.javaInterop = services.java.JavaInteropService;
    }

    public getType(expression: Expression): JavaPackage | Class | undefined {
        if (this.resolving.has(expression)) {
            return undefined;
        }
        this.resolving.add(expression);
        try {
            return this.getTypeInternal(expression);
        } finally {
            this.resolving.delete(expression);
        }
    }

    private getTypeInternal(expression: Expression): JavaPackage | Class | undefined {
        if (isSymbolRef(expression)) {
            let reference;
            try {
                reference = expression.symbol.ref;
            } catch {
                // Langium throws on cyclic reference resolution (e.g., b!=b!.toString()
                // where b! has no prior assignment). Return undefined instead of propagating.
                return undefined;
            }
            if (isAssignment(reference)) {
                return this.getType((reference as Assignment).value);
            } else if (isClass(reference)) {
                return reference
            } else if (isFieldDecl(reference) || isArrayDecl(reference) || isVariableDecl(reference)) {
                return getClass(reference.type);
            } else if (isMethodDecl(reference)) {
                return this.declaredReturnType(reference);
            } else if (isJavaPackage(reference)) {
                return reference;
            }
            return undefined;
        } else if (isConstructorCall(expression)) {
            return getClass(expression.klass);
        } else if (isMemberCall(expression)) {
            // A dangling member access (`receiver.` with the member not yet typed) parses to a
            // MemberCall whose `member` reference is absent — nothing to infer a type from.
            if (!expression.member) {
                return undefined;
            }
            // Check for .class property — resolves to java.lang.Class
            const memberRefText = expression.member.$refText;
            if (memberRefText === 'class') {
                return this.javaInterop.getResolvedClass('java.lang.Class');
            }
            let member;
            try {
                member = expression.member.ref;
            } catch {
                return undefined;
            }
            if (member) {
                if (isJavaField(member)) {
                    return member.resolvedType?.ref;
                } else if (isJavaMethod(member)) {
                    // resolvedReturnType is populated asynchronously by java-interop.ts's
                    // resolveClass() Phase 2 (java-interop.ts:615-618). A JavaMethod reached
                    // before that phase completes — or constructed outside it entirely — still
                    // carries the always-present raw `returnType: string`; fall back to
                    // resolving that through the same class-resolution path rather than
                    // silently returning no type (P61-D2-011, P66-D2-001 / DEBT-03).
                    return this.declaredReturnType(member);
                } else if (isMethodDecl(member)) {
                    return this.declaredReturnType(member);
                } else if (isFieldDecl(member)) {
                    return getClass(member.type);
                } else if (isJavaPackage(member) || isClass(member)) {
                    return member;
                }
            } else {
                return undefined
            }
        } else if (isCastExpression(expression)) {
            // CastExpression has castType as a QualifiedClass directly
            if (isBBjTypeRef(expression.castType)) {
                return expression.castType.klass.ref;
            } else if (isSimpleTypeRef(expression.castType)) {
                return expression.castType.simpleClass.ref;
            }
            // For array casts or unresolvable types, return undefined (treat as untyped)
            return undefined;
        } else if (isStringLiteral(expression)) {
            return this.javaInterop.getResolvedClass('java.lang.String')
        } else if (isMethodCall(expression)) {
            // A call expression (e.g. BBjAPI(), obj.foo()) has the type of the
            // thing being called: for BBjAPI() the method symbol resolves to the
            // BBjAPI class, for obj.foo() the receiver member yields its return type.
            // An overloaded callee re-selects by the call's own arguments first (#556) —
            // the linker only ever picked the first-yielded same-named declaration.
            const overloaded = this.overloadedCallType(expression);
            if (overloaded) {
                return overloaded.type;
            }
            return this.getType(expression.method);
        } else if(isBBjTypeRef(expression)) {
            return expression.klass.ref;
        }
        return undefined;
    }

    /** The declared return type of a JavaMethod or MethodDecl, resolved to a Class. */
    private declaredReturnType(node: JavaMethod | MethodDecl): Class | undefined {
        if (isJavaMethod(node)) {
            return node.resolvedReturnType?.ref ?? this.javaInterop.getResolvedClass(node.returnType);
        }
        return getClass(node.returnType);
    }

    /**
     * Re-selects an overloaded call's return type by the call's own argument types (#556),
     * instead of the linker's first-yielded same-named declaration. Returns `undefined` when
     * there is nothing to re-select (the callee has no same-named siblings) — the caller then
     * falls back to today's linked-member lookup. Returns `{ type }` once re-selection ran,
     * where `type` may itself be `undefined` when the arguments do not decide between
     * candidates with different return types — a deliberately conservative tie rule: a wrong
     * guessed type could make a downstream check fire on a valid member.
     */
    private overloadedCallType(call: MethodCall): { type: JavaPackage | Class | undefined } | undefined {
        const callee = call.method;
        let refInfo: Reference<NamedElement> | undefined;
        if (isSymbolRef(callee)) {
            refInfo = callee.symbol;
        } else if (isMemberCall(callee)) {
            refInfo = callee.member;
        }
        if (!refInfo) {
            return undefined;
        }
        let linked;
        try {
            linked = refInfo.ref;
        } catch {
            return undefined;
        }
        if (!linked || !(isJavaMethod(linked) || isMethodDecl(linked))) {
            return undefined;
        }
        const candidates = overloadCandidates(linked);
        if (candidates.length < 2) {
            // No same-named sibling: keep today's inferred type via the caller's fallback.
            return undefined;
        }
        const argTypes = call.args.map(arg => arg.expression ? argumentTypeOf(arg.expression, this) : undefined);
        const winners = bestOverloadCandidates(candidates, argTypes);
        const types = winners.map(w => this.declaredReturnType(w.node));
        const first = types[0];
        const sameType = types.every(t => sameDeclaredClass(t, first));
        return { type: sameType ? first : undefined };
    }
}

/** True when two resolved return-type Classes are the same declaration, or — for two
 *  JavaClass results — the same fully-qualified name (JavaClass instances are re-created
 *  per resolution, so identity alone is too strict). */
function sameDeclaredClass(a: Class | undefined, b: Class | undefined): boolean {
    if (a === b) {
        return true;
    }
    if (!a || !b) {
        return false;
    }
    if (isJavaClass(a) && isJavaClass(b)) {
        return a.name === b.name && a.packageName === b.packageName;
    }
    return false;
}