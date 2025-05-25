import { BBjServices } from "./bbj-module.js";
import { getClass } from "./bbj-nodedescription-provider.js";
import { Assignment, Class, Expression, isArrayDecl, isAssignment, isBBjTypeRef, isClass, isConstructorCall, isFieldDecl, isJavaField, isJavaMethod, isJavaPackage, isMemberCall, isMethodCall, isMethodDecl, isStringLiteral, isSymbolRef, isVariableDecl, JavaPackage } from "./generated/ast.js";
import { JavaInteropService } from "./java-interop.js";

export interface TypeInferer {
    getType(expression: Expression): JavaPackage |Class | undefined;
}

export class BBjTypeInferer implements TypeInferer {
    protected readonly javaInterop: JavaInteropService;

    constructor(services: BBjServices) {
        this.javaInterop = services.java.JavaInteropService;
    }

    public getType(expression: Expression): JavaPackage | Class | undefined {
        if (isSymbolRef(expression)) {
            const reference = expression.symbol.ref
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
            const member = expression.member.ref;
            if (member) {
                if (isJavaField(member)) {
                    return member.resolvedType?.ref;
                } else if (isJavaMethod(member)) {
                    return member.resolvedReturnType?.ref;
                } else if (isMethodDecl(member)) {
                    return getClass(member.returnType);
                } else if (isJavaPackage(member) || isClass(member)) {
                    return member;
                }
            } else {
                return undefined
            }
        } else if (isStringLiteral(expression)) {
            return this.javaInterop.getResolvedClass('java.lang.String')
        } else if(isMethodCall(expression)) {
            return this.getType(expression.method);
        } else if(isBBjTypeRef(expression)) {
            return expression.klass.ref;
        }
        return undefined;
    }
}