import { AstUtils, ValidationChecks, ValidationRegistry } from 'langium';
import type { BBjServices } from '../bbj-module.js';
import { BBjAstType, isBbjClass } from '../generated/ast.js';
import { checkClassReference, checkBBjClass } from './check-class-reference.js';
import { checkMethodReturn, checkFieldInit } from './check-return-types.js';
import { checkInstantiable, checkConstructorArguments } from './check-constructor.js';
import { checkCyclicInheritance } from './check-cyclic-inheritance.js';

export function registerClassChecks(registry: ValidationRegistry, services: BBjServices) {
    const inferer = services.types.Inferer;
    const javaInterop = services.java.JavaInteropService;
    const classChecks: ValidationChecks<BBjAstType> = {
        Use: (use, accept) => {
            if(!use.bbjClass) {
                return;
            }
            const ref = use.bbjClass;
            const uriOfUsage = AstUtils.getDocument(ref.$refNode!.root.astNode).uri.fsPath;
            if(ref.ref && isBbjClass(ref.ref)) {
                const uriOfDeclaration = AstUtils.getDocument(ref.ref).uri.fsPath;
                checkBBjClass(ref.ref, uriOfDeclaration, uriOfUsage, accept, {
                    node: use,
                    property: 'bbjClass'
                });
            }
        },
        BbjClass: (decl, accept) => {
            if(!decl.visibility) {
                const typeName = decl.interface ? 'Interface' : 'Class';
                accept("warning", `${typeName} visibility (public, protected, or private) declaration is missing.`, {
                    node: decl,
                    property: 'name'
                });
                return;
            }
            decl.extends.forEach((extend, index) => {
                checkClassReference(accept, extend, {
                    node: decl,
                    property: 'extends',
                    index
                }, javaInterop);
            });
            decl.implements.forEach((implement, index) => {
                checkClassReference(accept, implement, {
                    node: decl,
                    property: 'implements',
                    index
                }, javaInterop);
            });
            // Check for cyclic inheritance
            if (decl.extends.length > 0) {
                checkCyclicInheritance(decl, accept);
            }
        },
        ConstructorCall: (call, accept) => {
            checkClassReference(accept, call.klass, {
                node: call,
                property: 'klass'
            }, javaInterop);
            checkInstantiable(call, accept);
            checkConstructorArguments(call, accept);
        },
        MethodDecl: (meth, accept) => {
            checkClassReference(accept, meth.returnType, {
                node: meth,
                property: 'returnType'
            }, javaInterop);
            checkMethodReturn(meth, accept, inferer);
        },
        FieldDecl: (field, accept) => {
            checkClassReference(accept, field.type, {
                node: field,
                property: 'type'
            }, javaInterop);
            checkFieldInit(field, accept);
        },
        ParameterDecl: (param, accept) => checkClassReference(accept, param.type, {
            node: param,
            property: 'type'
        }, javaInterop),
        VariableDecl: (decl, accept) => checkClassReference(accept, decl.type, {
            node: decl,
            property: 'type'
        }, javaInterop),
    };
    registry.register(classChecks);
}
