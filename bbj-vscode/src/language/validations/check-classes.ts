import { AstNode, AstUtils, DiagnosticInfo, ValidationAcceptor, ValidationChecks, ValidationRegistry } from 'langium';
import { basename, dirname, isAbsolute, relative } from 'path';
import { getClass, getClassRef } from '../bbj-nodedescription-provider.js';
import { BBjAstType, BbjClass, isBbjClass, QualifiedClass } from '../generated/ast.js';

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
            if(!decl.visibility) {
                const typeName = decl.interface ? 'Interface' : 'Class';
                accept("warning", `${typeName} visibility (public, protected, or private) declaration is missing.`, {
                    node: decl,
                    property: 'name'
                });
                return;
            }
            decl.extends.forEach((extend, index) => {
                validator.checkClassReference(accept, extend, {
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
            // Check for cyclic inheritance
            if (decl.extends.length > 0) {
                validator.checkCyclicInheritance(decl, accept);
            }
        },
        ConstructorCall: (call, accept) => validator.checkClassReference(accept, call.klass, {
            node: call,
            property: 'klass'
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

    public checkClassReference<N extends AstNode>(accept: ValidationAcceptor, qclass: QualifiedClass|undefined, info: DiagnosticInfo<N>): void {
        const ref = qclass ? getClassRef(qclass) : undefined;
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
        const typeName = klass.interface ? 'interface' : 'class';

        if(!klass.visibility) {
            accept("warning", `Visibility of ${typeName} '${klass.name}' is not declared and might not be accessible here.`, info);
            return;
        }

        // Get source location info for the declaration
        const filename = basename(uriOfDeclaration);
        const lineNumber = klass.$cstNode?.range.start.line;
        const lineInfo = lineNumber !== undefined ? `:${lineNumber + 1}` : '';
        const sourceInfo = `${filename}${lineInfo}`;

        switch (klass.visibility.toUpperCase()) {
            case "PUBLIC":
                //everything is allowed
                return;
            case "PROTECTED":
                const dirOfDeclaration = dirname(uriOfDeclaration);
                const dirOfUsage = dirname(uriOfUsage);
                if (!this.isSubFolderOf(dirOfUsage, dirOfDeclaration)) {
                    accept("error", `Protected ${typeName} '${klass.name}' (declared in ${sourceInfo}) is not visible from this directory.`, info);
                }
                break;
            case "PRIVATE":
                if (uriOfUsage !== uriOfDeclaration) {
                    accept("error", `Private ${typeName} '${klass.name}' (declared in ${sourceInfo}) is not visible from this file.`, info);
                }
                break;
        }
    }

    public checkCyclicInheritance(klass: BbjClass, accept: ValidationAcceptor): void {
        const visited = new Set<BbjClass>();
        visited.add(klass);
        let current: BbjClass | undefined = klass;
        const MAX_INHERITANCE_DEPTH = 20;
        let depth = 0;

        while (current && current.extends.length > 0 && depth < MAX_INHERITANCE_DEPTH) {
            const superType = getClass(current.extends[0]);
            if (!isBbjClass(superType)) {
                break; // Java class or unresolvable -- stop walking
            }
            if (visited.has(superType)) {
                accept("error", `Cyclic inheritance detected: class '${klass.name}' is involved in an inheritance cycle.`, {
                    node: klass,
                    property: 'extends',
                    index: 0
                });
                return;
            }
            visited.add(superType);
            current = superType;
            depth++;
        }
    }
}

