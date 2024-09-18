/******************************************************************************
 * Copyright 2023 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

import {
    AstNode, AstNodeDescription, AstNodeLocator, CstNode, DefaultNameProvider,
    DefaultScopeProvider,
    EMPTY_SCOPE, EMPTY_STREAM, findNodeForProperty, getContainerOfType, getDocument, IndexManager, isAstNode,
    ReferenceInfo, Scope, Stream, stream,
    StreamScope
} from 'langium';
import { BBjServices } from './bbj-module';
import { isJavaDocument } from './bbj-scope-local';
import {
    Assignment, BbjClass, Class,
    Expression,
    isArrayDecl, isAssignment, isBbjClass,
    isBinaryExpression,
    isCallbackStatement,
    isClass, isClasspath, isCompoundStatement, isConstructorCall,
    isFieldDecl,
    isJavaClass, isJavaField, isJavaMethod, isJavaMethodParameter,
    isLibFunction,
    isMemberCall,
    isMethodDecl,
    isProgram,
    isRemoveCallbackStatement,
    isStatement, isStringLiteral, isSymbolRef, isUse, isVariableDecl, JavaClass,
    LibEventType,
    LibMember, MethodDecl, NamedElement, Program,
    Statement, Use
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
        if (
            (context.property === 'resolvedType' && (isJavaField(context.container) || isJavaMethodParameter(context.container)))
            || (context.property === 'resolvedReturnType' && isJavaMethod(context.container))
        ) {
            // Scope for JavaClass only
            const doc = getDocument(context.container)
            const precomputed = doc.precomputedScopes
            if (precomputed) {
                if (isJavaDocument(doc)) {
                    if (doc.classesMapScope) {
                        // return cached JavaClass MapScope
                        return doc.classesMapScope
                    }
                    console.warn(`JavaDocument without classesMapScope.`)
                }
                console.warn(`Resolving JavaMember from outside of JavaDocument.`)
                const classPath = getContainerOfType(context.container, isClasspath);
                if (classPath) {
                    const allDescriptions = precomputed.get(classPath);
                    return new StreamScope(stream(allDescriptions)) // don't filter as we only have classes as children
                }
            }
            console.error(`Can not retrieve scope for JavaClass type.`)
            return EMPTY_SCOPE;
        }
        if (context.property === 'member' && isMemberCall(context.container)) {
            const receiverType = this.getType(context.container.receiver);
            if (!receiverType) {
                return EMPTY_SCOPE;
            }
            if (isJavaClass(receiverType)) {
                return this.createScopeForNodes(stream(receiverType.fields).concat(receiverType.methods));
            } else if (isBbjClass(receiverType)) {
                return new StreamScopeWithPredicate(this.createBBjClassMemberScope(receiverType).getAllElements(), super.getScope(context));
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
                return new StreamScopeWithPredicate(stream(bbjClasses), undefined);
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

            const memberAndImports = new StreamScopeWithPredicate(
                memberScope.concat(this.importedBBjClasses(getContainerOfType(context.container, isProgram))),
                this.superGetScope(context)
            )

            if (context.container.$containerProperty === 'left' // left side of an assignment
                && isBinaryExpression(context.container.$container)
                && context.container.$container.$containerProperty === 'args' // function call args
                && isSymbolRef(context.container.$container.$container)
            ) {
                // named parameter scope
                const symbol = context.container.$container.$container.symbol.ref
                if (isLibFunction(symbol)) {
                    const namedParams = stream(symbol.parameters)
                        .filter(param => param.refByName === true)
                        .map(param => this.descriptions.createDescription(param, param.name));
                    return this.createScope(namedParams, memberAndImports)
                }
            }
            return memberAndImports
        }
        if (!context.container.$container && context.container.$cstNode?.element.$container) {
            // FIXME HACK for orphaned AST Instances
            return this.superGetScope({ ...context, container: context.container.$cstNode?.element });
        }
        if (isCallbackStatement(context.container) || isRemoveCallbackStatement(context.container)) {
            if (context.property === 'eventType') {
                return this.getGlobalScope(LibEventType, context);
            }
        }
        return this.superGetScope(context);
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
            return indexManager.allElements(LibMember);
        }
        switch (referenceType) {
            case Class: {
                const program = getContainerOfType(_context.container, isProgram)
                // when looking for classes return only JavaClasses. References are case sensitive
                // Temporally add imported BBjClasses
                return new StreamScopeWithPredicate(stream(this.importedBBjClasses(program)), new StreamScopeWithPredicate(this.indexManager.allElements(JavaClass)));
            }
            case LibEventType: {
                return new StreamScopeWithPredicate(this.indexManager.allElements(LibEventType), undefined, { caseInsensitive: true });
            }
            case NamedElement: {
                if (isSymbolRef(_context.container) && _context.property === 'symbol')
                    // when looking for NamedElement Symbols consider JavaClasses (case sensitive) and LibMembers (case insensitive)
                    return new StreamScopeWithPredicate(libraryIndex(this.indexManager), new StreamScopeWithPredicate(this.indexManager.allElements(JavaClass)), { caseInsensitive: true });
            }
            default:
                return new StreamScopeWithPredicate(libraryIndex(this.indexManager), undefined, { caseInsensitive: true });
        }


    }

    importedBBjClasses(root: Program | undefined): AstNodeDescription[] {
        if (root) {
            return collectAllUseStatements(root).filter(it => it.bbjClass?.ref)
                .map(it => it.bbjClass!.$nodeDescription!)
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
        if (bbjType.extends.length == 1) {
            const superType = bbjType.extends[0].ref;
            if (isBbjClass(superType)) {
                return this.createCaseSensitiveScope(descriptions, this.createBBjClassMemberScope(superType, methodsOnly))
            } else if (isJavaClass(superType)) {
                return this.createCaseSensitiveScope(descriptions, this.createScopeForNodes(stream(superType.fields).concat(superType.methods)))
            }
        } else {
            // handle implicit extends java.lang.Object
            const javaObject = this.javaInterop.getResolvedClass('java.lang.Object');
            if (javaObject) {
                return this.createCaseSensitiveScope(descriptions, this.createScopeForNodes(stream(javaObject.fields).concat(javaObject.methods)))
            }
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
        return new StreamScopeWithPredicate(s, outerScope);
    }



    protected getType(expression: Expression): Class | undefined {
        if (isSymbolRef(expression)) {
            const reference = expression.symbol.ref
            if (isAssignment(reference)) {
                return this.getType((reference as Assignment).value);
            } else if (isClass(reference)) {
                return reference
            } else if (isFieldDecl(reference) || isArrayDecl(reference) || isVariableDecl(reference)) {
                return reference.type?.ref
            } else if (isMethodDecl(reference)) {
                return reference.returnType?.ref
            } else if (isLibFunction(reference) && reference.name.toLowerCase() === 'cast') {
                if (expression.args.length > 0) {
                    // CAST function return type is the first arg which is a Class reference
                    return this.getType(expression.args[0])
                }
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
                } else if (isMethodDecl(member)) {
                    return member.returnType?.ref
                }
            } else {
                return undefined
            }
        } else if (isStringLiteral(expression)) {
            return this.javaInterop.getResolvedClass('java.lang.String')
        }
        return undefined;
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
        if (!getDocument(node)) {
            // synthetic nodes
            return undefined
        }
        return findNodeForProperty(node.$cstNode, 'name');
    }
}


export function collectAllUseStatements(program: Program): Use[] {
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