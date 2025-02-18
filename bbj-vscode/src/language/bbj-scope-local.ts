import {
    AstNode, AstNodeDescription, AstNodeLocator,
    AstUtils,
    CstUtils,
    DefaultScopeComputation,
    DocumentSegment,
    GrammarUtils,
    LangiumDocument,
    MapScope,
    PrecomputedScopes
} from 'langium';
import { CancellationToken } from 'vscode-languageserver';
import { BBjServices } from './bbj-module.js';
import { collectAllUseStatements } from './bbj-scope.js';
import {
    ArrayDecl,
    Assignment,
    CompoundStatement,
    FieldDecl, isArrayDecl, isAssignment, isBbjClass,
    isClass,
    isClasspath,
    isEnterStatement, isFieldDecl, isForStatement,
    isInputVariable,
    isLetStatement,
    isLibEventType,
    isLibMember,
    isProgram, isReadStatement,
    isSymbolRef, isUse,
    MethodDecl
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

    override async computeExports(document: LangiumDocument, cancelToken = CancellationToken.None): Promise<AstNodeDescription[]> {
        // Only make classes and library elements globally "visible" in index
        return this.computeExportsForNode(document.parseResult.value, document, (node) => AstUtils.streamContents(node).filter(child => isClass(child) || isLibMember(child) || isLibEventType(child)), cancelToken);
    }

    override async computeLocalScopes(document: LangiumDocument, cancelToken: CancellationToken): Promise<PrecomputedScopes> {
        const rootNode = document.parseResult.value;
        if (isProgram(rootNode) && rootNode.$type === 'Program') {
            for (const use of collectAllUseStatements(rootNode)) {
                const className = use.javaClassName
                if (className != null) {
                    try {
                        await this.javaInterop.resolveClassByName(className, cancelToken);
                    } catch (e) {
                        console.error(e)
                    }
                }
            }
        }
        if (JavaSyntheticDocUri === document.uri.toString() && isClasspath(rootNode)) {
            const computed = await super.computeLocalScopes(document, cancelToken);
            // Cache classes as map scope. It is used very often and not changing.
            (document as JavaDocument).classesMapScope = new MapScope(computed.get(rootNode))
            return computed;
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
                this.addToScope(scopes, program, this.descriptions.createDescription(javaClass, simpleName))
            }
        } else if (isAssignment(node) && !node.instanceAccess && node.variable && !isFieldDecl(node.variable)) {
            const scopeHolder = this.findScopeHolder(node)
            if (isSymbolRef(node.variable)) {
                // case: `foo$ = ""` without declaring foo$
                const symbol = node.variable.symbol
                if (scopes.get(scopeHolder).findIndex((descr) => descr.name === symbol.$refText) === -1) {
                    this.addToScope(scopes, scopeHolder, {
                        name: symbol.$refText,
                        nameSegment: CstUtils.toDocumentSegment(symbol.$refNode),
                        selectionSegment: CstUtils.toDocumentSegment(symbol.$refNode),
                        type: FieldDecl,
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
                type: FieldDecl,
                documentUri: document.uri,
                path: this.astNodeLocator.getAstNodePath(node)
            })
            if (node.extends.length > 0) {
                const superType = node.extends[0]
                this.addToScope(scopes, node, {
                    name: 'super!',
                    nameSegment: CstUtils.toDocumentSegment(superType.type.$refNode),
                    selectionSegment: CstUtils.toDocumentSegment(superType.type.$refNode),
                    type: FieldDecl,
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
        } else if (isInputVariable(node) && (isReadStatement(node.$container) || isEnterStatement(node.$container))) {
            /*
            Create input variables.
            Cases:
               READ(1,KEY="TEST")A$,B$,C$
               ENTER A$,B$,C$
            */
            if (isSymbolRef(node)) {
                const scopeHolder = node.$container.$container
                const inputName = node.symbol.$refText
                if (scopes.get(scopeHolder).findIndex((descr) => descr.name === inputName) === -1) {
                    this.addToScope(scopes, scopeHolder, {
                        name: inputName,
                        nameSegment: CstUtils.toDocumentSegment(node.symbol.$refNode),
                        selectionSegment: CstUtils.toDocumentSegment(node.symbol.$refNode),
                        type: FieldDecl,
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

    /**
    * if scopeHolder is a CompoundStatement, add to parent scope.
    * Case: title$ = "" ; rem Title
    */
    private addToScope(scopes: PrecomputedScopes, scopeHolder: AstNode, descr: AstNodeDescription): void {
        const key = scopeHolder.$type === CompoundStatement ? scopeHolder.$container! : scopeHolder
        scopes.add(key, descr);
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
        type: MethodDecl,
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