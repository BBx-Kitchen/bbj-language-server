import { AstNode } from "langium";
import { BBjServices } from "./bbj-module.js";
import { getClass } from "./bbj-nodedescription-provider.js";
import { Assignment, Class, Expression, isArrayDecl, isAssignment, isBBjTypeRef, isClass, isConstructorCall, isFieldDecl, isJavaField, isJavaMethod, isJavaPackage, isLibFunction, isMemberCall, isMethodCall, isMethodDecl, isStringLiteral, isSymbolRef, isVariableDecl, JavaPackage } from "./generated/ast.js";
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
        } else if (isStringLiteral(expression)) {
            return this.javaInterop.getResolvedClass('java.lang.String')
        } else if(isMethodCall(expression)) {
            // Check if this is a CAST() call
            if (isSymbolRef(expression.method)) {
                const methodRef = expression.method.symbol.ref;
                if (isLibFunction(methodRef) && methodRef.name.toLowerCase() === 'cast') {
                    // CAST(type, object) - first argument is the type
                    if (expression.args.length > 0) {
                        const typeArg = expression.args[0].expression;
                        if (isBBjTypeRef(typeArg)) {
                            return typeArg.klass.ref;
                        } else if (isSymbolRef(typeArg)) {
                            const typeRef = typeArg.symbol.ref;
                            if (isClass(typeRef)) {
                                return typeRef;
                            }
                        }
                    }
                    // If type is unresolvable, return undefined (treat as untyped)
                    return undefined;
                }
            }
            return this.getType(expression.method);
        } else if(isBBjTypeRef(expression)) {
            return expression.klass.ref;
        }
        return undefined;
    }
}