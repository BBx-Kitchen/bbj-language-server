import { BBjServices } from "./bbj-module.js";
import { Expression, Class, Assignment, isArrayDecl, isAssignment, isClass, isConstructorCall, isFieldDecl, isJavaField, isJavaMethod, isLibFunction, isMemberCall, isMethodDecl, isStringLiteral, isSymbolRef, isVariableDecl, isMethodCall } from "./generated/ast.js";
import { JavaInteropService } from "./java-interop.js";

export interface TypeInferer {
    getType(expression: Expression): Class | undefined;
}

export class BBjTypeInferer implements TypeInferer {
    protected readonly javaInterop: JavaInteropService;

    constructor(services: BBjServices) {
        this.javaInterop = services.java.JavaInteropService;
    }

    public getType(expression: Expression): Class | undefined {
        if (isSymbolRef(expression)) {
            const reference = expression.symbol.ref
            if (isAssignment(reference)) {
                return this.getType((reference as Assignment).value);
            } else if (isClass(reference)) {
                return reference
            } else if (isFieldDecl(reference) || isArrayDecl(reference) || isVariableDecl(reference)) {
                return reference.type?.type.ref
            } else if (isMethodDecl(reference)) {
                return reference.returnType?.type.ref
            } else if (isLibFunction(reference) && reference.name.toLowerCase() === 'cast') {
                if (expression.args.length > 0) {
                    // CAST function return type is the first arg which is a Class reference
                    return this.getType(expression.args[0])
                }
            }
            return undefined;
        } else if (isConstructorCall(expression)) {
            return expression.class.type.ref;
        } else if (isMemberCall(expression)) {
            const member = expression.member.ref;
            if (member) {
                if (isJavaField(member)) {
                    return member.resolvedType?.ref;
                } else if (isJavaMethod(member)) {
                    return member.resolvedReturnType?.ref;
                } else if (isMethodDecl(member)) {
                    return member.returnType?.type.ref
                }
            } else {
                return undefined
            }
        } else if (isStringLiteral(expression)) {
            return this.javaInterop.getResolvedClass('java.lang.String')
        } else if(isMethodCall(expression)) {
            return this.getType(expression.method);
        }
        return undefined;
    }
}