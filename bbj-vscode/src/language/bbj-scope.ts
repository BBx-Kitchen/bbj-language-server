/******************************************************************************
 * Copyright 2023 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

import {
    AstNode, AstNodeDescription, AstNodeLocator,
    AstNodeTypesWithCrossReferences,
    AstReflection,
    AstUtils,
    CrossReferencesOfAstNodeType,
    CstNode, DefaultNameProvider,
    DefaultScopeProvider,
    EMPTY_SCOPE, EMPTY_STREAM,
    GrammarUtils,
    IndexManager, isAstNode,
    ReferenceInfo, Scope, Stream, stream,
    StreamScope,
    URI,
    UriUtils
} from 'langium';
import { BBjServices } from './bbj-module.js';
import { isBbjDocument, isJavaDocument } from './bbj-scope-local.js';
import { TypeInferer } from './bbj-type-inferer.js';
import {
    BBjAstType,
    BbjClass, BBjTypeRef, Class,
    isBbjClass,
    isBinaryExpression,
    isCallbackStatement,
    isClasspath, isCompoundStatement,
    isJavaClass, isJavaField, isJavaMethod, isJavaMethodParameter,
    isJavaPackage,
    isJavaTypeRef,
    isLibFunction,
    isMemberCall,
    isMethodCall,
    isParameterCall,
    isProgram,
    isRemoveCallbackStatement,
    isStatement, isSymbolRef, isUse, JavaClass,
    JavaSymbol,
    LibEventType,
    LibMember, MethodDecl, NamedElement, Program,
    Statement, Use
} from './generated/ast.js';
import { JavaInteropService } from './java-interop.js';
import { BBjWorkspaceManager } from './bbj-ws-manager.js';
import { resolve } from 'path';
import { assertType } from './utils.js';
import { getClass } from './bbj-nodedescription-provider.js';
import { assertTrue } from './assertions.js';

const BBjClassNamePattern = /^::(.*)::([_a-zA-Z][\w_]*@?)$/;
export const BBjPathPattern = /^::(.*)::$/;

export class BbjScopeProvider extends DefaultScopeProvider {

    protected readonly javaInterop: JavaInteropService;
    protected readonly astNodeLocator: AstNodeLocator;
    protected readonly typeInferer: TypeInferer;
    protected readonly workspaceManager: BBjWorkspaceManager;
    protected readonly astReflection: AstReflection;

    constructor(services: BBjServices) {
        super(services);
        this.astReflection = services.shared.AstReflection;
        this.javaInterop = services.java.JavaInteropService;
        this.astNodeLocator = services.workspace.AstNodeLocator;
        this.typeInferer = services.types.Inferer;
        this.workspaceManager = services.shared.workspace.WorkspaceManager as BBjWorkspaceManager;
    }

    override getScope(context: ReferenceInfo): Scope {
        const container = context.container as AstNodeTypesWithCrossReferences<BBjAstType>;
        switch (container.$type) {
            case 'SimpleTypeRef': {
                const property = context.property as CrossReferencesOfAstNodeType<typeof container>;
                if (property === 'simpleClass') {
                    return this.resolveClassScopeByName(context, container.simpleClass.$refText);
                }
                return EMPTY_SCOPE;
            }
            case 'BBjTypeRef': {
                assertType<BBjTypeRef>(container);
                const property = context.property as CrossReferencesOfAstNodeType<typeof container>;
                if (property === 'klass') {
                    return this.resolveClassScopeByName(context, container.klass?.$refText);
                }
                return EMPTY_SCOPE;
            }
            case 'JavaSymbol': {
                assertType<JavaSymbol>(container);
                const property = context.property as CrossReferencesOfAstNodeType<typeof container>;
                if (property === 'symbol') {
                    if (isJavaTypeRef(container.$container)) {
                        assertTrue(container.$containerIndex !== undefined);
                        if (container.$containerIndex === 0) {
                            return this.createScopeForNodes(this.javaInterop.getChildrenOf());
                        } else {
                            const previousPart = container.$container.pathParts[container.$containerIndex - 1].symbol.ref;
                            if (previousPart) {
                                let outerScope: Scope | undefined = undefined;
                                if (isJavaClass(previousPart)) {
                                    // nested class
                                    const pack = AstUtils.getContainerOfType(previousPart, isJavaPackage)
                                    if (pack) {
                                        const nestedClasses = this.javaInterop.getChildrenOf(pack).filter(it => isJavaClass(it) && it.name.startsWith(previousPart.name + '.'))
                                        outerScope = new StreamScope(stream(nestedClasses).map((it) => {
                                            const simpleName = it.name.split('.').pop()
                                            if (simpleName) {
                                                return this.descriptions.createDescription(it, simpleName);
                                            }
                                            return undefined;
                                        }).nonNullable());
                                    }
                                }
                                return this.createScopeForNodes(this.javaInterop.getChildrenOf(previousPart), outerScope);
                            }
                        }
                    }
                }
                return EMPTY_SCOPE;
            }
        }
        if (
            (context.property === 'resolvedType' && (isJavaField(context.container) || isJavaMethodParameter(context.container)))
            || (context.property === 'resolvedReturnType' && isJavaMethod(context.container))
        ) {
            // Scope for JavaClass only
            const doc = AstUtils.getDocument(context.container)
            const precomputed = doc.localSymbols
            if (precomputed) {
                if (isJavaDocument(doc)) {
                    if (doc.classesMapScope) {
                        // return cached JavaClass MapScope
                        return doc.classesMapScope
                    }
                    console.warn(`JavaDocument without classesMapScope.`)
                }
                console.warn(`Resolving JavaMember from outside of JavaDocument.`)
                const classPath = AstUtils.getContainerOfType(context.container, isClasspath);
                if (classPath) {
                    const allDescriptions = precomputed.getStream(classPath).toArray();
                    return new StreamScope(stream(allDescriptions)) // don't filter as we only have classes as children
                }
            }
            console.error(`Can not retrieve scope for JavaClass type.`)
            return EMPTY_SCOPE;
        }
        if (context.property === 'member' && isMemberCall(context.container)) {
            const receiver = context.container.receiver
            const receiverType = this.typeInferer.getType(receiver);
            if (!receiverType) {
                return EMPTY_SCOPE;
            }
            if (isJavaClass(receiverType)) {
                return this.createScopeForNodes(stream(receiverType.fields).concat(receiverType.methods));
            } else if (isBbjClass(receiverType)) {
                return new StreamScopeWithPredicate(this.createBBjClassMemberScope(receiverType).getAllElements(), super.getScope(context));
            } else if (isJavaPackage(receiverType)) {
                return this.createScopeForNodes(this.javaInterop.getChildrenOf(receiverType));
            }
        } else if (isUse(context.container)) {
            const match = context.container.bbjFilePath?.match(BBjPathPattern);
            if (match) {
                return this.getBBjClassesFromFile(context.container, match[1], true);
            }
            return EMPTY_SCOPE;
        } else if (isSymbolRef(context.container)) {
            var membersStream = EMPTY_STREAM;
            const bbjType = AstUtils.getContainerOfType(context.container, isBbjClass)
            if (bbjType) {
                if (context.container.instanceAccess) {
                    membersStream = this.createBBjClassMemberScope(bbjType, false, new Set()).getAllElements()
                }
            }
            const program = AstUtils.getContainerOfType(context.container, isProgram);
            const memberAndImports = new StreamScopeWithPredicate(
                membersStream.concat(this.importedBBjClasses(program)),
                this.superGetScope(context)
            );

            if (context.container.$containerProperty === 'left' // left side of an assignment
                && isBinaryExpression(context.container.$container)
                && context.container.$container.$containerProperty === 'expression' // parameter call args
                && isParameterCall(context.container.$container.$container)
                && context.container.$container.$container.$containerProperty === 'args'  // method call args
                && isMethodCall(context.container.$container.$container.$container)
            ) {
                // named parameter scope
                const method = context.container.$container.$container.$container.method;
                if (isSymbolRef(method)) {
                    const symbol = method.symbol.ref;
                    if (isLibFunction(symbol)) {
                        const namedParams = stream(symbol.parameters)
                            .filter(param => param.refByName === true)
                            .map(param => this.descriptions.createDescription(param, param.name));
                        return this.createScope(namedParams, memberAndImports)
                    }
                }
            }
            return memberAndImports
        }
        if (!context.container.$container && context.container.$cstNode?.astNode.$container) {
            // FIXME HACK for orphaned AST Instances
            return this.superGetScope({ ...context, container: context.container.$cstNode?.astNode });
        }
        if (isCallbackStatement(context.container) || isRemoveCallbackStatement(context.container)) {
            if (context.property === 'eventType') {
                return this.getGlobalScope(LibEventType.$type, context);
            }
        }
        return this.superGetScope(context);
    }

    private getBBjClassesFromFile(container: AstNode, bbjFilePath: string, simpleName: boolean) {
        const currentDocUri = AstUtils.getDocument(container).uri;
        const prefixes = this.workspaceManager.getSettings()?.prefixes ?? [];
        const adjustedFileUris = [UriUtils.resolvePath(UriUtils.dirname(currentDocUri), bbjFilePath)].concat(
            prefixes.map(prefixPath => URI.file(resolve(prefixPath, bbjFilePath)))
        );
        let bbjClasses = this.indexManager.allElements(BbjClass.$type).filter(bbjClass => {
            // FIXME
            // DONE 1. load first files in same folder
            // TODO 2. try resolve with path relative to project root
            // DONE 3. Access PREFIX folder information and load the first match
            return adjustedFileUris.some(adjustedFileUri => bbjClass.documentUri.toString().toLowerCase().endsWith(adjustedFileUri.fsPath.toLowerCase()));
        })
        if (!simpleName) {
            bbjClasses = bbjClasses.map(d => this.descriptions.createDescription(d.node!, `::${bbjFilePath}::${d.name}`));
        }
        return new StreamScopeWithPredicate(bbjClasses);
    }

    private resolveClassScopeByName(context: ReferenceInfo, qualifiedClassName: string): Scope {
        if (!qualifiedClassName) {
            return EMPTY_SCOPE;
        }
        const match = qualifiedClassName.match(BBjClassNamePattern);
        if (match) {
            const relativeFilePath = match[1];
            return this.getBBjClassesFromFile(context.container, relativeFilePath, false);
        } else {
            const program = AstUtils.getContainerOfType(context.container, isProgram)!;
            const document = AstUtils.getDocument(program);
            const locals = document.localSymbols?.getStream(program).toArray()
                ?.filter((descr: AstNodeDescription) => this.astReflection.isSubtype(descr.type, Class.$type)) ?? EMPTY_STREAM;
            const imports = this.importedBBjClasses(program);
            const globals = this.getGlobalScope(Class.$type, context);
            return this.createScope(stream(imports).concat(locals), globals);
        }
    }

    private superGetScope(context: ReferenceInfo) {
        // Extracted one point access to super impl for performance and debugging purposes
        return super.getScope(context)
    }

    protected override createScope(elements: Stream<AstNodeDescription>, outerScope: Scope): Scope {
        // By default scope is case insensitive
        return new StreamScopeWithPredicate(elements, outerScope, { caseInsensitive: true });
    }

    protected override getGlobalScope(referenceType: string, _context: ReferenceInfo): Scope {

        function libraryIndex(indexManager: IndexManager): Stream<AstNodeDescription> {
            return indexManager.allElements(LibMember.$type);
        }
        // Add java root packages to be linked in expressions like: java.util.List
        const javaRoots = this.javaInterop.getChildrenOf().filter(it => isJavaPackage(it));
        let javaPackageScope: Scope = EMPTY_SCOPE;
        if (javaRoots.length > 0) {
            javaPackageScope = this.createCaseSensitiveScope(javaRoots);
        }

        switch (referenceType) {
            case Class.$type: {
                const program = AstUtils.getContainerOfType(_context.container, isProgram)
                // when looking for classes return only JavaClasses. References are case sensitive
                // Temporally add imported BBjClasses
                return new StreamScopeWithPredicate(stream(this.importedBBjClasses(program)), new StreamScopeWithPredicate(this.indexManager.allElements(JavaClass.$type)));
            }
            case LibEventType.$type: {
                return new StreamScopeWithPredicate(this.indexManager.allElements(LibEventType.$type), undefined, { caseInsensitive: true });
            }
            case NamedElement.$type: {
                if (isSymbolRef(_context.container) && _context.property === 'symbol') {
                    // when looking for NamedElement Symbols consider:
                    // - LibMembers (case insensitive)
                    // - JavaClasses (case sensitive)
                    // - JavaPackageRoots (case sensitive)
                    return new StreamScopeWithPredicate(libraryIndex(this.indexManager),
                        new StreamScopeWithPredicate(this.indexManager.allElements(JavaClass.$type), javaPackageScope),
                        { caseInsensitive: true }
                    );
                }
            }
            default:
                return new StreamScopeWithPredicate(libraryIndex(this.indexManager), javaPackageScope, { caseInsensitive: true });
        }


    }

    importedBBjClasses(root: Program | undefined): AstNodeDescription[] {
        if (root) {
            const useStatements = collectAllUseStatements(root);
            return useStatements.filter(it => it.bbjClass?.ref)
                .map(it => it.bbjClass!.$nodeDescription!);
        }
        return []
    }

    importedClasses(root: Program | undefined): AstNodeDescription[] {
        if (root) {
            const useStatements = collectAllUseStatements(root);
            return useStatements.map(use => {
                if (use.bbjClass && use.bbjClass.ref) {
                    return this.descriptions.createDescription(use.bbjClass.ref, use.bbjClass.ref.name);
                } else if (use.javaClass) {
                    const lastPart = use.javaClass.pathParts[use.javaClass.pathParts.length - 1];
                    const klass = lastPart.symbol.ref;
                    if (klass) {
                        return this.descriptions.createDescription(klass, klass.name);
                    }
                }
                return undefined;
            }).filter(a => a) as AstNodeDescription[];
        }
        return []
    }

    createBBjClassMemberScope(bbjType: BbjClass, methodsOnly: boolean = false, visited: Set<BbjClass> = new Set()): StreamScope {
        // Cycle protection: stop if we've already visited this class
        if (visited.has(bbjType)) {
            return this.createCaseSensitiveScope([]);
        }
        visited.add(bbjType);

        const document = AstUtils.getDocument(bbjType)
        const typeScope = document?.localSymbols?.getStream(bbjType).toArray()
        let descriptions: AstNodeDescription[] = []
        if (typeScope) {
            descriptions.push(...typeScope.filter((member: AstNodeDescription) => !methodsOnly || member.type === MethodDecl.$type))
        }
        if (bbjType.extends.length == 1) {
            const superType = getClass(bbjType.extends[0]);
            if (isBbjClass(superType)) {
                return this.createCaseSensitiveScope(descriptions, this.createBBjClassMemberScope(superType, methodsOnly, visited))
            } else if (isJavaClass(superType)) {
                // Recursively traverse Java class inheritance chain
                return this.createCaseSensitiveScope(descriptions, this.createJavaClassMemberScope(superType))
            } else if (bbjType.extends[0]) {
                // Super class is unresolvable - fall through to Object fallback
                // (Warning diagnostic will be added in validator)
            }
        }
        // handle implicit extends java.lang.Object (or unresolvable extends)
        const javaObject = this.javaInterop.getResolvedClass('java.lang.Object');
        if (javaObject) {
            const members = stream(javaObject.fields).concat(javaObject.methods);
            return this.createCaseSensitiveScope(descriptions, this.createScopeForNodes(members))
        }
        return this.createCaseSensitiveScope(descriptions)
    }

    createJavaClassMemberScope(javaClass: JavaClass): Scope {
        // Get members from current Java class
        const members = stream(javaClass.fields).concat(javaClass.methods);

        // Note: JavaClass does not include superclass information from java-interop
        // Superclass traversal is not currently supported for Java classes
        return this.createScopeForNodes(members);
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
        return new StreamScopeWithPredicate(s, outerScope);
    }
}

export class StreamScopeWithPredicate extends StreamScope {

    override getElement(name: string, predicate: (descr: AstNodeDescription) => boolean = () => true): AstNodeDescription | undefined {
        const nameToLower = name.toLowerCase()
        const local = this.caseInsensitive
            ? this.elements.find(e => e.name.toLowerCase() === nameToLower && predicate(e))
            : this.elements.find(e => e.name === name && predicate(e));
        if (local) {
            return local;
        }
        if (this.outerScope) {
            if (this.outerScope instanceof StreamScopeWithPredicate) {
                return this.outerScope.getElement(name, predicate);
            } else {
                return this.outerScope.getElement(name);
            }
        }
        return undefined;
    }
}

export class BbjNameProvider extends DefaultNameProvider {

    static called = new Map<string | undefined, number>

    override getNameNode(node: AstNode): CstNode | undefined {
        if (!AstUtils.getDocument(node)) {
            // synthetic nodes
            return undefined
        }
        return GrammarUtils.findNodeForProperty(node.$cstNode, 'name');
    }
}


export function collectAllUseStatements(program: Program): Use[] {
    // Check if USE statements are already cached in the document
    const document = AstUtils.getDocument(program);
    if (isBbjDocument(document) && document.cachedUseStatements) {
        return document.cachedUseStatements;
    }
    return collectUseStatements(program.statements.filter(isStatement))
}

function collectUseStatements(statements: Statement[]): Use[] {
    const uses: Use[] = []
    for (const statement of statements) {
        if (isUse(statement)) {
            uses.push(statement)
        } else if (isCompoundStatement(statement)) {
            uses.push(...collectUseStatements(statement.statements))
        }
        // TODO inspect `use` inside classes? 
    }
    return uses
}