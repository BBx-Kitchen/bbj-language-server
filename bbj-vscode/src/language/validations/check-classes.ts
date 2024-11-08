import { AstNode, AstUtils, DiagnosticInfo, Reference, ValidationAcceptor, ValidationChecks, ValidationRegistry } from 'langium';
import { BBjAstType, BbjClass, Class, isBbjClass } from '../generated/ast.js';
import { dirname, isAbsolute, relative } from 'path';
import { assertTrue } from '../assertions.js';

export function registerClassChecks(registry: ValidationRegistry) {
    const validator = new ClassValidator();
    const classChecks: ValidationChecks<BBjAstType> = {
        Use: (use, accept) => {
            if(!use.bbjClass) {
                return;
            }
            const ref = use.bbjClass;
            const uriOfUsage = AstUtils.getDocument(ref.$refNode!.root.astNode).uri.fsPath;
            if(ref.ref) {
                const uriOfDeclaration = AstUtils.getDocument(ref.ref).uri.fsPath;
                validator.checkBBjClass(ref.ref, uriOfDeclaration, uriOfUsage, accept, {
                    node: use,
                    property: 'bbjClass'
                });
            }
        },
        BbjClass: (decl, accept) => {
            decl.extends.forEach((implement, index) => {
                validator.checkClassReference(accept, implement, {
                    node: decl,
                    property: 'extends',
                    index
                });
            });
            decl.implements.forEach((implement, index) => {
                validator.checkClassReference(accept, implement, {
                    node: decl,
                    property: 'implements',
                    index
                });
            });
        },
        ConstructorCall: (call, accept) => validator.checkClassReference(accept, call.class, {
            node: call,
            property: 'class'
        }),
        MethodDecl: (meth, accept) => validator.checkClassReference(accept, meth.returnType, {
            node: meth,
            property: 'returnType'
        }),
        ParameterDecl: (param, accept) => validator.checkClassReference(accept, param.type, {
            node: param,
            property: 'type'
        }),
        VariableDecl: (decl, accept) => validator.checkClassReference(accept, decl.type, {
            node: decl,
            property: 'type'
        }),
    };
    registry.register(classChecks, validator);
}

class ClassValidator {
    private isSubFolderOf(folder: string, parentFolder: string) {
        if(parentFolder === folder) {
            return true;
        }
        const relativePath = relative(parentFolder, folder);
        return relativePath && !relativePath.startsWith('..') && !isAbsolute(relativePath);
    }

    public checkClassReference<N extends AstNode>(accept: ValidationAcceptor, ref: Reference<Class>|undefined, info: DiagnosticInfo<N>): void {
        if(!ref) {
            return;
        }
        const uriOfUsage = AstUtils.getDocument(ref.$refNode!.root.astNode).uri.fsPath;
        if(!ref.ref) {
            return;
        }
        const klass = ref.ref;
        const uriOfDeclaration = AstUtils.getDocument(ref.ref).uri.fsPath;
        if(isBbjClass(klass) && klass.visibility) {
            return this.checkBBjClass<N>(klass, uriOfDeclaration, uriOfUsage, accept, info);
        }
    }

    public checkBBjClass<N extends AstNode>(klass: BbjClass, uriOfDeclaration: string, uriOfUsage: string, accept: ValidationAcceptor, info: DiagnosticInfo<N>) {
        assertTrue(klass.visibility !== undefined);
        const typeName = klass.interface ? 'interface' : 'class';
        
        switch (klass.visibility.toUpperCase()) {
            case "PUBLIC":
                //everything is allowed
                return;
            case "PROTECTED":
                const dirOfDeclaration = dirname(uriOfDeclaration);
                const dirOfUsage = dirname(uriOfUsage);
                if (!this.isSubFolderOf(dirOfUsage, dirOfDeclaration)) {
                    accept("error", `Protected ${typeName} '${klass.name}' can be only referenced within the same directory!`, info);
                }
                break;
            case "PRIVATE":
                if (uriOfUsage !== uriOfDeclaration) {
                    accept("error", `Private ${typeName} '${klass.name}' can be only referenced within the same file!`, info);
                }
                break;
        }
    }
}

