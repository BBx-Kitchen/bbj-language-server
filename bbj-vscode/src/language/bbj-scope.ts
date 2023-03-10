/******************************************************************************
 * Copyright 2023 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

import {
    AstNode, AstNodeLocator, DefaultScopeComputation, DefaultScopeProvider, EMPTY_SCOPE, LangiumDocument, PrecomputedScopes, ReferenceInfo, Scope, Stream, stream, toDocumentSegment
} from 'langium';
import { CancellationToken } from 'vscode-jsonrpc';
import { BBjServices } from './bbj-module';
import {
    Assignment, BbjClass, Class, ClassMember, Expression, Field, isAssignment, isBbjClass, isClass, isConstructorCall, isField, isJavaClass, isJavaField, isJavaMethod, isMemberRef, isProgram, isSymbolRef, isUse
} from './generated/ast';
import { JavaInteropService } from './java-interop';

export class BbjScopeProvider extends DefaultScopeProvider {

    protected readonly javaInterop: JavaInteropService;

    constructor(services: BBjServices) {
        super(services);
        this.javaInterop = services.java.JavaInteropService;
    }

    override getScope(context: ReferenceInfo): Scope {
        if (isMemberRef(context.container) && context.property === 'member') {
            const receiverType = this.getType(context.container.receiver);
            if (!receiverType) {
                return EMPTY_SCOPE;
            }
            if (isJavaClass(receiverType)) {
                return this.createScopeForNodes(stream(receiverType.fields).concat(receiverType.methods));
            } else if (isBbjClass(receiverType)) {
                return this.createScopeForNodes(this.collectMembers(receiverType).filter(member => member.visibility === 'PUBLIC' && member.type));
            }
        }
        return super.getScope(context);
    }

    protected collectMembers(clazz: BbjClass): Stream<ClassMember> {
        const members = stream(clazz.members)
        if (isBbjClass(clazz.superType?.ref)) {
            return members.concat(this.collectMembers(clazz.superType!.ref))
        }
        return members
    }

    protected getType(expression: Expression): Class | undefined {
        if (isSymbolRef(expression)) {
            const reference = expression.symbol.ref
            if (isAssignment(reference)) {
                return this.getType((reference as Assignment).value);
            } else if(isClass(reference)) {
                return reference
            }
            return reference?.type?.ref;
        } else if (isConstructorCall(expression)) {
            return expression.class.ref;
        } else if (isMemberRef(expression)) {
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
        if (isProgram(rootNode)) {
            for (const use of rootNode.uses) {
                if (use.className) {
                    await this.javaInterop.resolveClass(use.className);
                }
            }
        }
        return super.computeLocalScopes(document, cancelToken);
    }

    protected override processNode(node: AstNode, document: LangiumDocument, scopes: PrecomputedScopes): void {
        if (isUse(node)) {
            if (!node.className) {
                return;
            }
            const javaClass = this.javaInterop.getResolvedClass(node.className);
            if (!javaClass) {
                return;
            }
            const program = node.$container;
            const simpleName = node.className.substring(node.className.lastIndexOf('.') + 1);
            scopes.add(program, this.descriptions.createDescription(javaClass, simpleName))
        } else if (isAssignment(node) && node.variable && !isField(node.variable)) {
            const scopeHolder = node.$container
            if (scopes.get(scopeHolder).findIndex((descr) => descr.name === node.variable.$refText) === -1) {
                scopes.add(scopeHolder, {
                    name: node.variable.$refText,
                    nameSegment: toDocumentSegment(node.variable.$refNode),
                    selectionSegment: toDocumentSegment(node.variable.$refNode),
                    type: Field,
                    documentUri: document.uri,
                    path: this.astNodeLocator.getAstNodePath(node)
                })
            }
        } else if (isBbjClass(node)) {
            if(node.superType?.ref) {
                scopes.add(node, {
                    name: 'super!',
                    nameSegment: toDocumentSegment(node.superType?.$refNode),
                    selectionSegment: toDocumentSegment(node.superType?.$refNode),
                    type: Field,
                    documentUri: document.uri,
                    path: this.astNodeLocator.getAstNodePath(node.superType?.ref)
                })
            }
        } else {
            super.processNode(node, document, scopes);
        }
    }

}
