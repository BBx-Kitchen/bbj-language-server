import {
    AstNode, AstNodeDescription, AstNodeLocator,
    AstUtils,
    CstUtils,
    DefaultScopeComputation,
    DocumentSegment,
    GrammarUtils,
    interruptAndCheck,
    LangiumDocument,
    LocalSymbols,
    MapScope,
    MultiMap
} from 'langium';
import { CancellationToken } from 'vscode-languageserver';
import { BBjServices } from './bbj-module.js';
import { getClassRefNode, getFQNFullname } from './bbj-nodedescription-provider.js';
import { collectAllUseStatements } from './bbj-scope.js';
import {
    ArrayDecl,
    Assignment,
    CompoundStatement,
    FieldDecl, isArrayDecl, isAssignment, isBbjClass,
    isClass,
    isClasspath,
    isDreadStatement,
    isEnterStatement, isFieldDecl, isForStatement,
    isInputVariable,
    isJavaPackage,
    isJavaTypeRef,
    isLetStatement,
    isLibEventType,
    isLibMember,
    isMemberCall,
    isMethodDecl,
    isProgram,
    isReadStatement,
    isSymbolRef, isUse,
    isVariableDecl,
    MemberCall,
    MethodDecl,
    Use
} from './generated/ast.js';
import { JavaInteropService, JavaSyntheticDocUri } from './java-interop.js';


export class BbjScopeComputation extends DefaultScopeComputation {

    protected readonly javaInterop: JavaInteropService;
    protected readonly astNodeLocator: AstNodeLocator;

    constructor(services: BBjServices) {
        super(services);
        this.javaInterop = services.java.JavaInteropService;
        this.astNodeLocator = services.workspace.AstNodeLocator;
    }

    override async collectExportedSymbols(document: LangiumDocument, cancelToken = CancellationToken.None): Promise<AstNodeDescription[]> {
        // Only make classes and library elements globally "visible" in index
        return this.collectExportedSymbolsForNode(document.parseResult.value, document, (node) => AstUtils.streamContents(node).filter(child => isClass(child) || isLibMember(child) || isLibEventType(child)), cancelToken);
    }

    override async collectLocalSymbols(document: LangiumDocument, cancelToken: CancellationToken): Promise<LocalSymbols> {
        const rootNode = document.parseResult.value;
        const scopes = new MultiMap<AstNode, AstNodeDescription>();
        // Override to process node in an async way
        // to trigger backend resolution of Java class references.
        for (const node of AstUtils.streamAllContents(rootNode)) {
            await interruptAndCheck(cancelToken);
            await this.processNode(node, document, scopes);
        }

        if (isProgram(rootNode)) {
            // Cache USE statements. They are used frequently during scope resolution.
            (document as BbjDocument).cachedUseStatements = collectAllUseStatements(rootNode);
        }

        if (JavaSyntheticDocUri === document.uri.toString() && isClasspath(rootNode)) {
            // Cache classes as map scope. It is used very often and not changing.
            (document as JavaDocument).classesMapScope = new MapScope(scopes.getStream(rootNode).toArray())
        }
        return scopes;
    }

    protected async processNode(node: AstNode, document: LangiumDocument, scopes: LocalSymbols): Promise<void> {
        if (isUse(node) && node.javaClass) {
            try {
                const javaClassName = getFQNFullname(node.javaClass);
                let javaClass = await this.tryResolveJavaReference(javaClassName, this.javaInterop);

                // If resolution failed, try inner class notation (replace last . with $)
                if (!javaClass && javaClassName.includes('.')) {
                    const lastDot = javaClassName.lastIndexOf('.');
                    const innerClassName = javaClassName.substring(0, lastDot) + '$' + javaClassName.substring(lastDot + 1);
                    javaClass = await this.tryResolveJavaReference(innerClassName, this.javaInterop);
                }

                if (!javaClass) {
                    return;
                }
                if (javaClass.error) {
                    console.warn(`Java '${javaClassName}' class resolution error: ${javaClass.error}`)
                    return;
                }
                const program = node.$container;
                const simpleName = javaClassName.substring(javaClassName.lastIndexOf('.') + 1);
                this.addToScope(scopes, program, this.descriptions.createDescription(javaClass, simpleName))
            } catch (e) {
                console.warn(`Error processing USE statement for ${getFQNFullname(node.javaClass)}: ${e}`);
                return;
            }
        } else if (isVariableDecl(node) && node.$containerProperty !== 'params') {
            // DECLARE statements should be scoped to the entire method body
            // not just the block they appear in
            const methodScope = AstUtils.getContainerOfType(node, isMethodDecl);
            const scopeHolder = methodScope ?? node.$container;
            if (scopeHolder) {
                const description = this.descriptions.createDescription(node, node.name);
                this.addToScope(scopes, scopeHolder, description);
            }
        } else if (isJavaTypeRef(node) && node.pathParts.length > 1) { // resolve only qualified names
            const javaClassName = getFQNFullname(node);
            // just trigger resolution so the class reference is loaded into the synthetic document.
            await this.tryResolveJavaReference(javaClassName, this.javaInterop);
        } else if (isAssignment(node) && !node.instanceAccess && node.variable && !isFieldDecl(node.variable)) {
            const scopeHolder = this.findScopeHolder(node)
            if (isSymbolRef(node.variable)) {
                // case: `foo$ = ""` without declaring foo$
                const symbol = node.variable.symbol
                if (scopes.getStream(scopeHolder).toArray().findIndex((descr: AstNodeDescription) => descr.name === symbol.$refText) === -1) {
                    this.addToScope(scopes, scopeHolder, {
                        name: symbol.$refText,
                        nameSegment: CstUtils.toDocumentSegment(symbol.$refNode),
                        selectionSegment: CstUtils.toDocumentSegment(symbol.$refNode),
                        type: FieldDecl.$type,
                        documentUri: document.uri,
                        path: this.astNodeLocator.getAstNodePath(node)
                    })
                }
            }
        } else if (isBbjClass(node) && node.name) {
            this.addToScope(scopes, node.$container, this.descriptions.createDescription(node, node.name))
            const classNameNode = GrammarUtils.findNodeForProperty(node.$cstNode, 'name')
            this.addToScope(scopes, node, {
                name: 'this!',
                nameSegment: CstUtils.toDocumentSegment(classNameNode),
                selectionSegment: CstUtils.toDocumentSegment(classNameNode),
                type: FieldDecl.$type,
                documentUri: document.uri,
                path: this.astNodeLocator.getAstNodePath(node)
            })
            if (node.extends.length > 0) {
                const superType = node.extends[0]
                this.addToScope(scopes, node, {
                    name: 'super!',
                    nameSegment: CstUtils.toDocumentSegment(getClassRefNode(superType)),
                    selectionSegment: CstUtils.toDocumentSegment(getClassRefNode(superType)),
                    type: FieldDecl.$type,
                    documentUri: document.uri,
                    path: this.astNodeLocator.getAstNodePath(node)
                })
            }
            // local getter and setter.
            // TODO Probably better to move to ScopeProvider as super getter and setter can not be accessed.
            node.members.filter(member => isFieldDecl(member)).forEach(field => {
                const nameSegment = CstUtils.toDocumentSegment(GrammarUtils.findNodeForProperty(field.$cstNode, 'name'))
                if (!node.members.find(member => member.name === toAccessorName(field.name))) {
                    this.addToScope(scopes, node, createAccessorDescription(this.astNodeLocator, field as FieldDecl, nameSegment));
                }
                if (!node.members.find(member => member.name === toAccessorName(field.name, true))) {
                    this.addToScope(scopes, node, createAccessorDescription(this.astNodeLocator, field as FieldDecl, nameSegment, true));
                }
            });
        } else if (isInputVariable(node) && (isReadStatement(node.$container) || isDreadStatement(node.$container) || isEnterStatement(node.$container))) {
            /*
            Create input variables.
            Cases:
               READ(1,KEY="TEST")A$,B$,C$
               DREAD A$,B$,C$
               ENTER A$,B$,C$
            */
            if (isSymbolRef(node)) {
                const scopeHolder = node.$container.$container
                const inputName = node.symbol.$refText
                if (scopes.getStream(scopeHolder).toArray().findIndex((descr: AstNodeDescription) => descr.name === inputName) === -1) {
                    this.addToScope(scopes, scopeHolder, {
                        name: inputName,
                        nameSegment: CstUtils.toDocumentSegment(node.symbol.$refNode),
                        selectionSegment: CstUtils.toDocumentSegment(node.symbol.$refNode),
                        type: FieldDecl.$type,
                        documentUri: document.uri,
                        path: this.astNodeLocator.getAstNodePath(node)
                    })
                }
            }
        } else if (isArrayDecl(node)) {
            const scopeHolder = node.$container.$container
            if (scopeHolder) {
                const description = this.descriptions.createDescription(node, node.name)
                this.addToScope(scopes, scopeHolder, description);
                if (isTemplateStringArray(node)) {
                    // Create alias for arrays with template string. 
                    // case reference key$ with key: 
                    // DIM key$:"MY_COL:K(10)"
                    // key.my_col = 525.95
                    // add same description with name without $ to allow reference without $
                    this.addToScope(scopes, scopeHolder, { ...description, name: node.name.slice(0, -1) });
                }
            }
        } else if (isMemberCall(node) && isMemberCall(node.receiver) && this.isPotentiallyJavaFqn(node, node.receiver)) {
            // Preload FQN Java classes
            const qualifiers = this.collectMemberQualifier(node);
            if (qualifiers.length > 1) {
                // first part should match one of the known top level packages
                const rootPackage = this.javaInterop.getChildOf(undefined, qualifiers[0])
                if (isJavaPackage(rootPackage)) {
                    const classFqn = qualifiers.concat(node.member.$refText).join('.');
                    if (!this.javaInterop.getResolvedClass(classFqn)) {
                        console.debug(`Java class ${classFqn}, check it is resolved.`)
                        // Just try resolve FQN class.
                        await this.tryResolveJavaReference(classFqn, this.javaInterop)
                    }
                }
            }
        } else {
            // Almost super implementation, but CompoundStatement is considered
            const container = node.$container;
            if (container) {
                const name = this.nameProvider.getName(node);
                if (name) {
                    this.addToScope(scopes, container, this.descriptions.createDescription(node, name, document));
                }
            }
        }
    }

    private collectMemberQualifier(node: MemberCall) {
        // collect all member calls in the chain
        const qualifiers: string[] = [];
        let currentNode: MemberCall | undefined = node;
        while (currentNode) {
            if (isMemberCall(currentNode.receiver)) {
                // Following the Java name convention, prevent match of plain member calls like: `List.class`
                const memberId = currentNode.receiver.member?.$refText
                if (memberId?.length > 0 && /^[a-z]/.test(memberId)) {
                    qualifiers.push(memberId)
                    currentNode = currentNode.receiver;
                } else {
                    return [];
                }
            } else if (isSymbolRef(currentNode.receiver)) {
                // first part of the chain is a symbol reference
                qualifiers.push(currentNode.receiver.symbol?.$refText);
                break;
            } else {
                break;
            }
        }
        return qualifiers.reverse();
    }

    private isPotentiallyJavaFqn(node: MemberCall, receiver: MemberCall): boolean {
        return node.member?.$refText?.length > 0 && /^[A-Z]/.test(node.member.$refText) && receiver.member?.$refText?.length > 0 && /^[a-z]/.test(receiver.member.$refText);
    }

    private async tryResolveJavaReference(javaClassName: string, javaInterop: JavaInteropService) {
        let javaClass = javaInterop.getResolvedClass(javaClassName)
        if (!javaClass) {
            // try resolve using Java service
            try {
                javaClass = await this.javaInterop.resolveClassByName(javaClassName);
            } catch (e) {
                console.warn(e)
            }
        }
        if (!javaClass?.$container) {
            console.error(`Check Java class '${javaClassName}' has no container.`)
            return undefined;
        }
        return javaClass;
    }

    /**
    * if scopeHolder is a CompoundStatement, add to parent scope.
    * Case: title$ = "" ; rem Title
    */
    private addToScope(scopes: LocalSymbols, scopeHolder: AstNode, descr: AstNodeDescription): void {
        const key = scopeHolder.$type === CompoundStatement.$type ? scopeHolder.$container! : scopeHolder;
        (scopes as MultiMap<AstNode, AstNodeDescription>).add(key, descr);
    }

    private findScopeHolder(assignment: Assignment) {
        const container = assignment.$container
        if (isForStatement(container)) {
            return container.$container
        } else if (isLetStatement(container)) {
            return container.$container
        } else {
            return container
        }
    }
}


function createAccessorDescription(astNodeLocator: AstNodeLocator, member: FieldDecl, nameSegment: DocumentSegment | undefined, setter: boolean = false): AstNodeDescription {
    return {
        name: toAccessorName(member.name, setter),
        nameSegment,
        type: MethodDecl.$type,
        documentUri: AstUtils.getDocument(member).uri,
        path: astNodeLocator.getAstNodePath(member)
    }
}

const pattern = new RegExp("[!|\$|%]$")

function toAccessorName(field: string, setter: boolean = false): string {
    return (setter ? 'set' : 'get') + (pattern.test(field) ? field.slice(0, -1) : field);
}

export function isTemplateStringArray(array: ArrayDecl): boolean {
    return array.template && array.name?.endsWith('$')
}

export interface JavaDocument extends LangiumDocument {
    classesMapScope: MapScope
}

export function isJavaDocument(item: unknown): item is JavaDocument {
    return typeof item === 'object' && item !== null && item.hasOwnProperty('classesMapScope');
}

export interface BbjDocument extends LangiumDocument {
    cachedUseStatements: Use[] | undefined;
}

export function isBbjDocument(item: unknown): item is BbjDocument {
    return typeof item === 'object' && item !== null && item.hasOwnProperty('cachedUseStatements');
}