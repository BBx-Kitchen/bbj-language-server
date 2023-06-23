
import {
    AstNodeDescription,
    DefaultLinker, LinkingError, ReferenceInfo
} from 'langium';
import { URI } from 'vscode-uri';
import { BinaryExpression, isSymbolRef, MethodDecl, ParameterCall, VariableDecl } from './generated/ast';

export class BbjLinker extends DefaultLinker {

    static ERR_PARAM: AstNodeDescription = {
        type: VariableDecl,
        name: 'err',
        documentUri: URI.parse('bbjlib:///functions.bbl'),
        path: ''
    };

    override getCandidate(refInfo: ReferenceInfo): AstNodeDescription | LinkingError {
        if (isSymbolRef(refInfo.container)) {
            if (refInfo.container.symbolicLabel && refInfo.reference.$refText === 'next') {
                const scope = this.scopeProvider.getScope(refInfo);
                // handle next symbolic links. TODO add other
                const description = scope.getElement('*' + refInfo.reference.$refText);
                return description ?? this.createLinkingError(refInfo);
            } else if(!refInfo.container.isMethodCall) {
                if(refInfo.reference.$refText === 'err' 
                    && refInfo.container.$container.$type === BinaryExpression
                    && refInfo.container.$containerProperty === 'left'
                    && refInfo.container.$container.$container.$type === ParameterCall) {
                        // Error param case: addProperty("prop" , err=*next)
                    return BbjLinker.ERR_PARAM;
                }
                const scope = this.scopeProvider.getScope(refInfo);
                // Don't link to a constructor when Type reference is expected 
                const filtered = scope.getAllElements().find(descr => descr.type !== MethodDecl && descr.name ===  refInfo.reference.$refText)
                return filtered ?? this.createLinkingError(refInfo);
            }
        }
        return super.getCandidate(refInfo);
    }
}