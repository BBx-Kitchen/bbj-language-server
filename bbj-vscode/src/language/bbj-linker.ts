
import {
    AstNodeDescription,
    DefaultLinker, DocumentState, interruptAndCheck,
    LangiumDocument, LangiumServices, LinkingError,
    ReferenceInfo, streamAst, streamReferences, WorkspaceManager
} from 'langium';
import { CancellationToken } from 'vscode-languageserver';
import { URI } from 'vscode-uri';
import { StreamScopeWithPredicate } from './bbj-scope';
import { isTemplateStringArray } from './bbj-scope-local';
import { BBjWorkspaceManager } from './bbj-ws-manager';
import { BinaryExpression, ConstructorCall, isArrayDecl, isBBjClassMember, isMemberCall, isMethodDecl, isSymbolRef, LibFunction, MethodDecl, ParameterCall, SymbolRef, VariableDecl } from './generated/ast';

export class BbjLinker extends DefaultLinker {

    static ERR_PARAM: AstNodeDescription = {
        type: VariableDecl,
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

        const treeIter = streamAst(document.parseResult.value).iterator()
        for (const node of treeIter) {
            await interruptAndCheck(cancelToken);
            if (externalDoc && isBBjClassMember(node)) {
                if (node.visibility?.toLowerCase() !== 'private') {
                    streamReferences(node).forEach(ref => this.doLink(ref, document));
                    // don't link the method body or Field initialization, we are only interested on its signature
                    if (isMethodDecl(node)) {
                        node.params.forEach(p => streamReferences(p).forEach(ref => this.doLink(ref, document)))
                    }
                }
                treeIter.prune()
            } else {
                streamReferences(node).forEach(ref => this.doLink(ref, document));
            }
        }
        const elapsed = Date.now() - started
        const threshold = 100
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
        if (refInfo.container.$type === SymbolRef) {
            const symbolRef = refInfo.container as SymbolRef;
            if (!symbolRef.isMethodCall) {
                if (refInfo.reference.$refText?.toLowerCase() === 'err'
                    && symbolRef.$container.$type === BinaryExpression
                    && symbolRef.$containerProperty === 'left'
                    && (symbolRef.$container.$container.$type === ParameterCall || symbolRef.$container.$container.$type === ConstructorCall)) {
                    // Error param case: addProperty("prop" , err=*next)
                    return BbjLinker.ERR_PARAM;
                }
                const scope = this.scopeProvider.getScope(refInfo);
                const candidate = (scope instanceof StreamScopeWithPredicate) ?
                    // Don't link to methods or a constructor when not a method call is  expected
                    scope.getElement(refInfo.reference.$refText, descr => descr.type !== MethodDecl && descr.type !== LibFunction)
                    : scope.getElement(refInfo.reference.$refText);
                return candidate ?? this.createLinkingError(refInfo);
            }
        }
        if (refInfo.reference.$refText.toLowerCase() === 'bbjapi'
            && isSymbolRef(refInfo.container)
            && refInfo.container.isMethodCall) {
            // Special case for BBjAPI implicit import, it can be accessed case insensitively
            const scope = this.scopeProvider.getScope(refInfo);
            const description = scope.getElement('BBjAPI');
            return description ?? this.createLinkingError(refInfo);
        }
        return super.getCandidate(refInfo);
    }
}
