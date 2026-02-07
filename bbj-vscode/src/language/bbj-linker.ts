
import {
    AstNode,
    AstNodeDescription,
    AstUtils,
    DefaultLinker, DocumentState, interruptAndCheck,
    isReference,
    LangiumDocument, LinkingError,
    ReferenceInfo,
    WorkspaceManager
} from 'langium';
import { LangiumServices } from 'langium/lsp';
import { CancellationToken } from 'vscode-languageserver';
import { URI } from 'vscode-uri';
import { dirname, relative } from 'node:path';
import { isTemplateStringArray } from './bbj-scope-local.js';
import { StreamScopeWithPredicate } from './bbj-scope.js';
import { BBjWorkspaceManager } from './bbj-ws-manager.js';
import { BinaryExpression, ConstructorCall, isArrayDecl, isBBjClassMember, isMemberCall, isMethodCall, isMethodDecl, isSymbolRef, LibFunction, MethodDecl, ParameterCall, VariableDecl } from './generated/ast.js';

export class BbjLinker extends DefaultLinker {

    static ERR_PARAM: AstNodeDescription = {
        type: VariableDecl.$type,
        name: 'err',
        documentUri: URI.parse('bbjlib:///labels.bbl'),
        path: ''
    };

    wsManager: () => WorkspaceManager;

    constructor(services: LangiumServices) {
        super(services)
        this.wsManager = () => services.shared.workspace.WorkspaceManager;
    }

    override async link(document: LangiumDocument, cancelToken = CancellationToken.None): Promise<void> {
        const started = Date.now()
        const wsManager = this.wsManager()
        const externalDoc = (wsManager instanceof BBjWorkspaceManager)
            && (wsManager as BBjWorkspaceManager).isExternalDocument(document.uri)

        const treeIter = AstUtils.streamAst(document.parseResult.value).iterator()
        for (const node of treeIter) {
            await interruptAndCheck(cancelToken);
            if (externalDoc && isBBjClassMember(node)) {
                if (node.visibility?.toLowerCase() !== 'private') {
                    AstUtils.streamReferences(node).forEach(ref => this.doLink(ref, document));
                    // don't link the method body or Field initialization, we are only interested on its signature
                    if (isMethodDecl(node)) {
                        node.params.forEach(p => AstUtils.streamReferences(p).forEach(ref => this.doLink(ref, document)))
                    }
                }
                treeIter.prune()
            } else {
                AstUtils.streamReferences(node).forEach(ref => this.doLink(ref, document));
            }
        }
        const elapsed = Date.now() - started
        const threshold = 500
        if (elapsed > threshold) {
            console.debug(`Linking (>${threshold}ms) ${document.uri} took ${elapsed}ms`)
        }
        document.state = DocumentState.Linked;
    }

    override doLink(refInfo: ReferenceInfo, document: LangiumDocument): void {
        if (refInfo.property === 'member' && isMemberCall(refInfo.container)) {
            const receiver = refInfo.container.receiver
            // FIXME try to not resolve receiver ref
            if (isSymbolRef(receiver) && isArrayDecl(receiver.symbol.ref) && isTemplateStringArray(receiver.symbol.ref)) {
                // don't link member calls to array template.
                /* Case `my_col` member call:
                    DIM key$:"MY_COL:K(10)"
                    key.my_col = 525.95 
                */
                return
            }
        }
        super.doLink(refInfo, document);
    }

    override getCandidate(refInfo: ReferenceInfo): AstNodeDescription | LinkingError {
        // Langium 4: ReferenceInfo.reference can be Reference | MultiReference
        // BBj only uses single references; skip multi-reference cases
        if (!isReference(refInfo.reference)) {
            return super.getCandidate(refInfo);
        }
        if (isSymbolRef(refInfo.container)) {
            const symbolRef = refInfo.container;
            if (!(isMethodCall(symbolRef.$container) && symbolRef.$containerProperty === 'method')) {
                if (refInfo.reference.$refText?.toLowerCase() === 'err'
                    && symbolRef.$container.$type === BinaryExpression.$type
                    && symbolRef.$containerProperty === 'left'
                    && (symbolRef.$container.$container.$type === ParameterCall.$type || symbolRef.$container.$container.$type === ConstructorCall.$type)) {
                    // Error param case: addProperty("prop" , err=*next)
                    return BbjLinker.ERR_PARAM;
                }
                const scope = this.scopeProvider.getScope(refInfo);
                const candidate = (scope instanceof StreamScopeWithPredicate) ?
                    // Don't link to methods or a constructor when not a method call is expected
                    scope.getElement(refInfo.reference.$refText, descr => descr.type !== MethodDecl.$type && descr.type !== LibFunction.$type)
                    : scope.getElement(refInfo.reference.$refText);
                return candidate ?? this.createLinkingError(refInfo);
            }
            if (refInfo.reference.$refText.toLowerCase() === 'bbjapi' && isMethodCall(symbolRef.$container)) {
                // Special case for BBjAPI implicit import, it can be accessed case insensitively
                const scope = this.scopeProvider.getScope(refInfo);
                const description = scope.getElement('BBjAPI');
                return description ?? this.createLinkingError(refInfo);
            }
        }
        return super.getCandidate(refInfo);
    }

    override createLinkingError(refInfo: ReferenceInfo): LinkingError {
        const error = super.createLinkingError(refInfo);
        // Enhance the message with source file context
        const sourceInfo = this.getSourceLocation(refInfo);
        if (sourceInfo) {
            error.message = `${error.message} [in ${sourceInfo}]`;
        }
        return error;
    }

    protected getSourceLocation(refInfo: ReferenceInfo): string | undefined {
        try {
            // Get the document from the reference
            const doc = AstUtils.getDocument(refInfo.container);
            if (!doc) return undefined;

            // Get workspace root
            const wsManager = this.wsManager();
            let workspaceRoot: string | undefined;

            const folders = wsManager.workspaceFolders;
            if (folders && folders.length > 0) {
                // WorkspaceFolder has uri property which is a string (URI)
                const wsUri = URI.parse(folders[0].uri);
                workspaceRoot = wsUri.fsPath;
            }

            // Fallback: use document directory
            if (!workspaceRoot) {
                workspaceRoot = dirname(doc.uri.fsPath);
            }

            // Compute relative path
            const relativePath = relative(workspaceRoot, doc.uri.fsPath);

            // Get line number from CST node
            let lineInfo = '';
            if (isReference(refInfo.reference) && refInfo.reference.$refNode) {
                const lineNumber = refInfo.reference.$refNode.range.start.line + 1; // 1-based
                lineInfo = `:${lineNumber}`;
            }

            return `${relativePath}${lineInfo}`;
        } catch (error) {
            // Graceful fallback if source location extraction fails
            return undefined;
        }
    }

    protected getSourceLocationForNode(document: LangiumDocument | undefined, line: number): string | undefined {
        if (!document) return undefined;
        try {
            const wsManager = this.wsManager();
            let workspaceRoot: string | undefined;
            const folders = wsManager.workspaceFolders;
            if (folders && folders.length > 0) {
                const wsUri = URI.parse(folders[0].uri);
                workspaceRoot = wsUri.fsPath;
            }
            if (!workspaceRoot) {
                workspaceRoot = dirname(document.uri.fsPath);
            }
            const relativePath = relative(workspaceRoot, document.uri.fsPath);
            return line > 0 ? `${relativePath}:${line}` : relativePath;
        } catch {
            return undefined;
        }
    }

    protected override throwCyclicReferenceError(node: AstNode, property: string, refText: string): never {
        // Get source location information
        const document = AstUtils.getDocument(node);
        const cstNode = node.$cstNode;
        const line = cstNode ? cstNode.range.start.line + 1 : 0;
        const sourceInfo = this.getSourceLocationForNode(document, line);

        const message = sourceInfo
            ? `Cyclic reference resolution detected for '${refText}' [in ${sourceInfo}]`
            : `Cyclic reference resolution detected for '${refText}'`;

        // Throw with enhanced message — Langium's getLinkedNode catches this
        // and stores it as a LinkingError on the reference
        throw new Error(message);
    }
}
