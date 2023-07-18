/******************************************************************************
 * Copyright 2023 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

import {
    AstNode, AstNodeDescription, AstNodeLocator, CstNode, DefaultNameProvider, DefaultScopeComputation, DefaultScopeProvider, DocumentSegment, EMPTY_SCOPE, EMPTY_STREAM, findNodeForProperty, getContainerOfType, getDocument, IndexManager, isAstNode,
    LangiumDocument, PrecomputedScopes, ReferenceInfo, Scope, Stream, stream, streamContents, StreamScope, toDocumentSegment
} from 'langium';
import { CancellationToken } from 'vscode-languageserver';
import { BBjServices } from './bbj-module';
import {
    Assignment, BbjClass, Class, Expression, FieldDecl, isArrayDecl, isAssignment, isBbjClass,
    isClass, isConstructorCall, isFieldDecl, isForStatement, isJavaClass, isJavaField, isJavaMethod, isLetStatement,
    isLibMember, isMemberCall,
    isMethodDecl,
    isProgram, isSymbolRef, isUse, isVariableDecl, JavaClass,
    LibMember, MethodDecl, NamedElement, Program, Use
} from './generated/ast';
import { JavaInteropService } from './java-interop';


export class BbjScopeProvider extends DefaultScopeProvider {

    protected readonly javaInterop: JavaInteropService;
    protected readonly astNodeLocator: AstNodeLocator;

    constructor(services: BBjServices) {
        super(services);
        this.javaInterop = services.java.JavaInteropService;
        this.astNodeLocator = services.workspace.AstNodeLocator;
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
                return new StreamScope(this.createBBjClassMemberScope(receiverType).getAllElements(), super.getScope(context));
            }
        } else if (isUse(context.container)) {
            const filePath = context.container.bbjFilePath?.toLowerCase()
            if (filePath) {
                const bbjClasses = this.indexManager.allElements(BbjClass).filter(bbjClass => {
                    // FIXME 
                    // 1. load first files in same folder
                    // 2. try resolve with path relative to project root
                    // 3. Access PREFIX folder information and load the first match 
                    return bbjClass.documentUri.path.toLowerCase().endsWith(filePath)
                });
                return new StreamScope(stream(bbjClasses), undefined);
            }
            return EMPTY_SCOPE
        } else if (isSymbolRef(context.container)) {
            const bbjType = getContainerOfType(context.container, isBbjClass)
            var memberScope = EMPTY_STREAM;
            if (bbjType) {
                if (context.container.instanceAccess) {
                    memberScope = this.createBBjClassMemberScope(bbjType, context.container.isMethodCall).getAllElements()
                }
            }
            const memberAndImports = memberScope
                .concat(this.importedBBjClasses(getContainerOfType(context.container, isProgram)))
            return new StreamScope(memberAndImports, super.getScope(context))
        }
        if (!context.container.$container && context.container.$cstNode?.element.$container) {
            // FIXME HACK for orphaned AST Instances
            return super.getScope({ ...context, container: context.container.$cstNode?.element });
        }
        return super.getScope(context);
    }


    protected override createScope(elements: Stream<AstNodeDescription>, outerScope: Scope): Scope {
        // By default scope is case insensitive
        return new StreamScope(elements, outerScope, { caseInsensitive: true });
    }

    protected override getGlobalScope(referenceType: string, _context: ReferenceInfo): Scope {

        function libraryIndex(indexManager: IndexManager): Stream<AstNodeDescription> {
            return indexManager.allElements(LibMember);
        }
        switch (referenceType) {
            case Class: {
                const program = getContainerOfType(_context.container, isProgram)
                // when looking for classes return only JavaClasses. References are case sensitive
                // Temporally add imported BBjClasses
                return new StreamScope(stream(this.importedBBjClasses(program)), new StreamScope(this.indexManager.allElements(JavaClass)));
            }
            case NamedElement: {
                if (isSymbolRef(_context.container) && _context.property === 'symbol')
                    // when looking for NamedElement Symbols consider JavaClasses (case sensitive) and LibMembers (case insensitive)
                    return new StreamScope(libraryIndex(this.indexManager), new StreamScope(this.indexManager.allElements(JavaClass)), { caseInsensitive: true });
            }
            default:
                return new StreamScope(libraryIndex(this.indexManager), undefined, { caseInsensitive: true });
        }


    }
    
    importedBBjClasses(root: Program | undefined): AstNodeDescription[] {
        if (root) {
            return root.statements.filter(it => isUse(it) && it.bbjClass?.ref)
                .map(it => (it as Use).bbjClass!.$nodeDescription!)
        }
        return []
    }

    createBBjClassMemberScope(bbjType: BbjClass, methodsOnly: boolean = false): StreamScope {
        const document = getDocument(bbjType)
        const typeScope = document?.precomputedScopes?.get(bbjType)
        let descriptions: AstNodeDescription[] = []
        if (typeScope) {
            descriptions.push(...typeScope.filter(member => !methodsOnly || member.type === MethodDecl))
        }
        if (bbjType.extends.length == 1 && isBbjClass(bbjType.extends[0].ref)) {
            return this.createCaseSensitiveScope(descriptions, this.createBBjClassMemberScope(bbjType.extends[0].ref, methodsOnly))
        }
        return this.createCaseSensitiveScope(descriptions)
    }

    createCaseSensitiveScope(elements: (AstNode | AstNodeDescription)[], outerScope?: Scope): StreamScope {
        const s = stream(elements).map(e => {
            if (isAstNode(e)) {
                const name = this.nameProvider.getName(e);
                if (name) {
                    return this.descriptions.createDescription(e, name);
                }
                return undefined;
            }
            return e
        }).nonNullable();
        return new StreamScope(s, outerScope);
    }



    protected getType(expression: Expression): Class | undefined {
        if (isSymbolRef(expression)) {
            const reference = expression.symbol.ref
            if (isAssignment(reference)) {
                return this.getType((reference as Assignment).value);
            } else if (isClass(reference)) {
                return reference
            } else if (isFieldDecl(reference) || isArrayDecl(reference) || isVariableDecl(reference) || isMethodDecl(reference)) {
                return reference?.type?.ref
            }
            return undefined;
        } else if (isConstructorCall(expression)) {
            return expression.class.ref;
        } else if (isMemberCall(expression)) {
            const member = expression.member.ref;
            if (member) {
                if (isJavaField(member)) {
                    return member.resolvedType?.ref;
                } else if (isJavaMethod(member)) {
                    return member.resolvedReturnType?.ref;
                } else {
                    return member.type?.ref
                }
            } else {
                return undefined
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

    override async computeExports(document: LangiumDocument, cancelToken = CancellationToken.None): Promise<AstNodeDescription[]> {
        // Only make classes and library elements globally "visible" in index
        return this.computeExportsForNode(document.parseResult.value, document, (node) => streamContents(node).filter(child => isClass(child) || isLibMember(child)), cancelToken);
    }

    override async computeLocalScopes(document: LangiumDocument, cancelToken: CancellationToken): Promise<PrecomputedScopes> {
        const rootNode = document.parseResult.value;
        if (isProgram(rootNode) && rootNode.$type === 'Program') {
            for (const use of rootNode.statements.filter(statement => statement.$type == Use)) {
                const className = (use as Use).javaClassName
                if (className != null) {
                    try {
                        await this.javaInterop.resolveClassByName(className, cancelToken);
                    } catch (e) {
                        console.error(e)
                    }
                }
            }
        }
        return super.computeLocalScopes(document, cancelToken);
    }

    protected override processNode(node: AstNode, document: LangiumDocument, scopes: PrecomputedScopes): void {
        if (isUse(node)) {
            if (node.javaClassName) {
                const javaClass = this.javaInterop.getResolvedClass(node.javaClassName);
                if (!javaClass) {
                    return;
                }
                if (javaClass.error) {
                    console.warn(`Java class resolution error: ${javaClass.error}`)
                    return;
                }
                const program = node.$container;
                const simpleName = node.javaClassName.substring(node.javaClassName.lastIndexOf('.') + 1);
                scopes.add(program, this.descriptions.createDescription(javaClass, simpleName))
            }
        } else if (isAssignment(node) && !node.instanceAccess && node.variable && !isFieldDecl(node.variable)) {
            const scopeHolder = (isForStatement(node.$container) || isLetStatement(node.$container)) ? node.$container.$container : node.$container
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
        } else if (isBbjClass(node) && node.name) {
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
            // local getter and setter.
            // TODO Probably better to move to ScopeProvider as super getter and setter can not be accessed.
            node.members.filter(member => isFieldDecl(member)).forEach(member => {
                const nameSegment = toDocumentSegment(findNodeForProperty(member.$cstNode, 'name'))
                if (!node.members.find(member => member.name === toAccessorName(member.name))) {
                    scopes.add(node, createAccessorDescription(this.astNodeLocator, member as FieldDecl, nameSegment));
                }
                if (!node.members.find(member => member.name === toAccessorName(member.name, true))) {
                    scopes.add(node, createAccessorDescription(this.astNodeLocator, member as FieldDecl, nameSegment, true));
                }
            });
        } else if (isSymbolRef(node) && node.symbolicLabel) {
            const program = getContainerOfType(node, isProgram)
            if (program) {
                // fake ref to *next
                const exists = scopes.get(program).find(descr => descr.name === '*next')
                if (!exists) {
                    scopes.add(program, {
                        name: '*next',
                        type: FieldDecl,
                        documentUri: document.uri,
                        path: this.astNodeLocator.getAstNodePath(node)
                    })
                }
            }
        } else {
            super.processNode(node, document, scopes);
        }
    }
}

export class BbjNameProvider extends DefaultNameProvider {

    static called = new Map<string | undefined, number>

    override getNameNode(node: AstNode): CstNode | undefined {
        if (!getDocument(node)) {
            // synthetic nodes
            return undefined
        }
        return findNodeForProperty(node.$cstNode, 'name');
    }
}

const pattern = new RegExp("[!|\$|%]$")
function toAccessorName(field: string, setter: boolean = false): string {
    return (setter ? 'set' : 'get') + (pattern.test(field) ? field.slice(0, -1) : field);
}


function createAccessorDescription(astNodeLocator: AstNodeLocator, member: FieldDecl, nameSegment: DocumentSegment | undefined, setter: boolean = false): AstNodeDescription {
    return {
        name: toAccessorName(member.name, setter),
        nameSegment,
        type: MethodDecl,
        documentUri: getDocument(member).uri,
        path: astNodeLocator.getAstNodePath(member)
    }
}