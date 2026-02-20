import { AstNode } from "langium";
import { BBjServices } from "./bbj-module.js";
import { getClass } from "./bbj-nodedescription-provider.js";
import { Assignment, Class, Expression, isArrayDecl, isAssignment, isBBjTypeRef, isCastExpression, isClass, isConstructorCall, isFieldDecl, isJavaField, isJavaMethod, isJavaPackage, isMemberCall, isMethodDecl, isSimpleTypeRef, isStringLiteral, isSymbolRef, isVariableDecl, JavaPackage } from "./generated/ast.js";
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
                return getClass(reference.returnType);
            } else if (isJavaPackage(reference)) {
                return reference;
            }
            return undefined;
        } else if (isConstructorCall(expression)) {
            return getClass(expression.klass);
        } else if (isMemberCall(expression)) {
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
                    return member.resolvedReturnType?.ref;
                } else if (isMethodDecl(member)) {
                    return getClass(member.returnType);
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
        } else if(isBBjTypeRef(expression)) {
            return expression.klass.ref;
        }
        return undefined;
    }
}