/******************************************************************************
 * Copyright 2023 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

import {
    AstNode, DefaultScopeComputation, DefaultScopeProvider, EMPTY_SCOPE, LangiumDocument, PrecomputedScopes, ReferenceInfo, Scope, stream
} from 'langium';
import { CancellationToken } from 'vscode-jsonrpc';
import { BBjServices } from './bbj-module';
import {
    Expression, isConstructorCall, isJavaField, isJavaMethod, isMemberRef, isProgram, isSymbolRef, isUse, JavaClass
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
            return this.createScopeForNodes(stream(receiverType.fields).concat(receiverType.methods));
        }
        return super.getScope(context);
    }

    protected getType(expression: Expression): JavaClass | undefined {
        if (isSymbolRef(expression)) {
            return expression.symbol.ref?.type.ref;
        } else if(isConstructorCall(expression)) {
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

    constructor(services: BBjServices) {
        super(services);
        this.javaInterop = services.java.JavaInteropService;
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
        } else {
            super.processNode(node, document, scopes);
        }
    }

}
