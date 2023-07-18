
import {
    AstNodeDescription,
    DefaultLinker, DocumentState, interruptAndCheck, LangiumDocument, LangiumServices, LinkingError, ReferenceInfo, streamAst, streamReferences, WorkspaceManager
} from 'langium';
import { CancellationToken } from 'vscode-languageserver';
import { URI } from 'vscode-uri';
import { BBjWorkspaceManager } from './bbj-ws-manager';
import { BinaryExpression, ConstructorCall, isBBjClassMember, isMethodDecl, LibFunction, MethodDecl, ParameterCall, SymbolRef, VariableDecl } from './generated/ast';

export class BbjLinker extends DefaultLinker {

    static ERR_PARAM: AstNodeDescription = {
        type: VariableDecl,
        name: 'err',
        documentUri: URI.parse('bbjlib:///variables.bbl'),
        path: ''
    };

    wsManager: () => WorkspaceManager;

    constructor(services: LangiumServices) {
        super(services)
        this.wsManager = () => services.shared.workspace.WorkspaceManager;
    }

    override async link(document: LangiumDocument, cancelToken = CancellationToken.None): Promise<void> {
        const wsManager = this.wsManager()
        const externalDoc = (wsManager instanceof BBjWorkspaceManager)
            && (wsManager as BBjWorkspaceManager).isExternalDocument(document.uri)

        const treeIter = streamAst(document.parseResult.value).iterator()
        for (const node of treeIter) {
            if (externalDoc && isBBjClassMember(node)) {
                if (node.visibility?.toLowerCase() !== 'private') {
                    await interruptAndCheck(cancelToken);
                    streamReferences(node).forEach(ref => this.doLink(ref, document));
                    // don't link the method body or Field initialization, we are only interested on its signature
                    if (isMethodDecl(node)) {
                        node.params.forEach(p => streamReferences(p).forEach(ref => this.doLink(ref, document)))
                    }
                }
                treeIter.prune()
            } else {
                await interruptAndCheck(cancelToken);
                streamReferences(node).forEach(ref => this.doLink(ref, document));
            }
        }
        document.state = DocumentState.Linked;
    }

    override getCandidate(refInfo: ReferenceInfo): AstNodeDescription | LinkingError {
        if (refInfo.container.$type === SymbolRef) {
            const symbolRef = refInfo.container as SymbolRef;
            if (symbolRef.symbolicLabel && refInfo.reference.$refText === 'next') {
                const scope = this.scopeProvider.getScope(refInfo);
                // handle next symbolic links. TODO add other
                const description = scope.getElement('*' + refInfo.reference.$refText);
                return description ?? this.createLinkingError(refInfo);
            } else if (!symbolRef.isMethodCall) {
                if (refInfo.reference.$refText === 'err'
                    && symbolRef.$container.$type === BinaryExpression
                    && symbolRef.$containerProperty === 'left'
                    && (symbolRef.$container.$container.$type === ParameterCall || symbolRef.$container.$container.$type === ConstructorCall)) {
                    // Error param case: addProperty("prop" , err=*next)
                    return BbjLinker.ERR_PARAM;
                }
                const scope = this.scopeProvider.getScope(refInfo);
                // Don't link to methods or a constructor when not a method call is  expected 
                const filtered = scope.getAllElements().find(descr => descr.type !== MethodDecl && descr.type !== LibFunction && descr.name === refInfo.reference.$refText)
                return filtered ?? this.createLinkingError(refInfo);
            }
        }
        return super.getCandidate(refInfo);
    }
}