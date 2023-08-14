import { AstNode, DefaultIndexManager, LangiumDocument, LangiumSharedServices, WorkspaceManager } from "langium";
import { URI } from "vscode-uri";
import { BBjWsManager } from "./bbj-ws-manager";

export class BBjIndexManager extends DefaultIndexManager {

    wsManager: () => WorkspaceManager;

    constructor(services: LangiumSharedServices) {
        super(services);
        this.wsManager = () => services.workspace.WorkspaceManager;
    }

    protected override isAffected(document: LangiumDocument<AstNode>, changed: URI): boolean {
        if(document.uri.toString() === 'classpath:/bbj.class' || document.uri.scheme === 'bbjlib') {
            // only affected by ClassPath changes
            return false;
        }
        const wsManager = this.wsManager();
        if (BBjWsManager.is(wsManager)) {
            const isExternal = wsManager.isExternalDocument(document.uri)
            if (document.references.some(e => e.error !== undefined)) {
                // don't rebuild external documents that has errors
                return !isExternal
            }
            if(!wsManager.isExternalDocument(changed) && isExternal) {
                // don't rebuild external documents if ws document changed
                return false;
            }
        }
        return super.isAffected(document, changed);
    }

}