/******************************************************************************
 * Copyright 2023 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

import {
    AstNode, AstNodeDescription, AstNodeLocator, DefaultScopeComputation, DefaultScopeProvider, EMPTY_SCOPE, findNodeForProperty,
    LangiumDocument, PrecomputedScopes, ReferenceInfo, Scope, Stream, stream, StreamScope, toDocumentSegment
} from 'langium';
import { CancellationToken } from 'vscode-jsonrpc';
import { BBjServices } from './bbj-module';
import {
    Assignment, BbjClass, Class, ClassMember, Expression, FieldDecl, isArrayDecl, isAssignment, isBbjClass,
    isClass, isConstructorCall, isFieldDecl, isForStatement, isJavaClass, isJavaField, isJavaMethod, isMemberCall,
    isProgram, isSymbolRef, isUse, isVariableDecl, JavaClass, LibFunction, Use
} from './generated/ast';
import { JavaInteropService } from './java-interop';


export class BbjScopeProvider extends DefaultScopeProvider {

    protected readonly javaInterop: JavaInteropService;

    constructor(services: BBjServices) {
        super(services);
        this.javaInterop = services.java.JavaInteropService;
    }

    override getScope(context: ReferenceInfo): Scope {
        if (isMemberCall(context.container) && context.property === 'member') {
            const receiverType = this.getType(context.container.receiver);
            if (!receiverType) {
                return EMPTY_SCOPE;
            }
            if (isJavaClass(receiverType)) {
                return this.createScopeForNodes(stream(receiverType.fields).concat(receiverType.methods));
            } else if (isBbjClass(receiverType)) {
                return this.createScopeForNodes(this.collectMembers(receiverType).filter(member => member.visibility === 'PUBLIC' && member.type));
            }
        } else if(isUse(context.container)) {
            const filePath = context.container.bbjFilePath
            if(filePath && filePath.length > 4) {
                const bbjClasses = this.indexManager.allElements(BbjClass).filter(bbjClass => {
                    // TODO compare with path relative to project root
                    return bbjClass.documentUri.path.endsWith(filePath)
                });
                return new StreamScope(stream(bbjClasses), undefined);
            }
            return EMPTY_SCOPE
        }
        return super.getScope(context);
    }

    protected override createScope(elements: Stream<AstNodeDescription>, outerScope: Scope): Scope {
        return new StreamScope(elements, outerScope, { caseInsensitive: true });
    }

    protected override getGlobalScope(referenceType: string, _context: ReferenceInfo): Scope {
        switch (referenceType) {
            case Class: {
                // when looking for classes return only JavaClasses. References are case sensitive
                return new StreamScope(this.indexManager.allElements(JavaClass), undefined);
            }
            default: return new StreamScope(this.indexManager.allElements(LibFunction), undefined, { caseInsensitive: true });
        }
    }

    protected collectMembers(clazz: BbjClass): ClassMember[] {
        let members = clazz.members
        if (isBbjClass(clazz.extends?.length > 0)) {
            clazz.extends.forEach((superType) => {
                // TODO handle JavaClass as well
                if (isBbjClass(superType!.ref)) {
                    members = members.concat(this.collectMembers(superType!.ref))
                }
            });
            return members
        }
        return members
    }

    protected getType(expression: Expression): Class | undefined {
        if (isSymbolRef(expression)) {
            const reference = expression.symbol.ref
            if (isAssignment(reference)) {
                return this.getType((reference as Assignment).value);
            } else if (isClass(reference)) {
                return reference
            } else if (isFieldDecl(reference) || isArrayDecl(reference) || isVariableDecl(reference)) {
                return reference?.type?.ref
            }
            return undefined;
        } else if (isConstructorCall(expression)) {
            return expression.class.ref;
        } else if (isMemberCall(expression)) {
            const member = expression.member.ref;
            if (isJavaField(member)) {
                return member.resolvedType?.ref;
            } else if (isJavaMethod(member)) {
                return member.resolvedReturnType?.ref;
            }
        }
        return undefined;
    }
}

export class BbjScopeComputation extends DefaultScopeComputation {

    protected readonly javaInterop: JavaInteropService;
    protected readonly astNodeLocator: AstNodeLocator;

    constructor(services: BBjServices) {
        super(services);
        this.javaInterop = services.java.JavaInteropService;
        this.astNodeLocator = services.workspace.AstNodeLocator;
    }

    override async computeLocalScopes(document: LangiumDocument, cancelToken: CancellationToken): Promise<PrecomputedScopes> {
        const rootNode = document.parseResult.value;
        if (isProgram(rootNode) && rootNode.$type === 'Program') {
            for (const use of rootNode.statements.filter(statement => statement.$type == Use)) {
                const className = (use as Use).className
                if (className != null) {
                    if (!isBBjClassPath(className)) {
                        await this.javaInterop.resolveClass(className);
                    }
                }
            }
        }
        return super.computeLocalScopes(document, cancelToken);
    }

    protected override processNode(node: AstNode, document: LangiumDocument, scopes: PrecomputedScopes): void {
        if (isUse(node)) {
            if(node.bbjClass?.ref) {
                scopes.add(node.$container, this.descriptions.createDescription(node.bbjClass?.ref, node.bbjClass?.ref.name))
            }
            const classPath = node.className;
            if (!classPath) {
                return;
            }
            if (!isBBjClassPath(classPath)) {
                const javaClass = this.javaInterop.getResolvedClass(classPath);
                if (!javaClass) {
                    return;
                }
                if (javaClass.error) {
                    console.warn(`Java class resolution error: ${javaClass.error}`)
                    return;
                }
                const program = node.$container;
                const simpleName = classPath.substring(classPath.lastIndexOf('.') + 1);
                scopes.add(program, this.descriptions.createDescription(javaClass, simpleName))
            }
        } else if (isAssignment(node) && node.variable && !isFieldDecl(node.variable)) {
            const scopeHolder = isForStatement(node.$container) ? node.$container.$container : node.$container
            if (scopes.get(scopeHolder).findIndex((descr) => descr.name === node.variable.$refText) === -1) {
                scopes.add(scopeHolder, {
                    name: node.variable.$refText,
                    nameSegment: toDocumentSegment(node.variable.$refNode),
                    selectionSegment: toDocumentSegment(node.variable.$refNode),
                    type: FieldDecl,
                    documentUri: document.uri,
                    path: this.astNodeLocator.getAstNodePath(node)
                })
            }
        } else if (isBbjClass(node)) {
            scopes.add(node.$container, this.descriptions.createDescription(node, node.name))
            const classNameNode = findNodeForProperty(node.$cstNode, 'name')
            scopes.add(node, {
                name: 'this!',
                nameSegment: toDocumentSegment(classNameNode),
                selectionSegment: toDocumentSegment(classNameNode),
                type: FieldDecl,
                documentUri: document.uri,
                path: this.astNodeLocator.getAstNodePath(node)
            })
            if (node.extends.length > 0) {
                const superType = node.extends[0]
                scopes.add(node, {
                    name: 'super!',
                    nameSegment: toDocumentSegment(superType.$refNode),
                    selectionSegment: toDocumentSegment(superType.$refNode),
                    type: FieldDecl,
                    documentUri: document.uri,
                    path: this.astNodeLocator.getAstNodePath(node)
                })
            }
        } else {
            super.processNode(node, document, scopes);
        }
    }

}

function isBBjClassPath(path: string) {
    return path.startsWith('::');
}