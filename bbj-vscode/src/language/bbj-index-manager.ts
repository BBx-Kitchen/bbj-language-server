import { AstNode, DefaultIndexManager, LangiumDocument, LangiumSharedServices, WorkspaceManager } from "langium";
import { URI } from "vscode-uri";
import { BBjWorkspaceManager } from "./bbj-ws-manager";
import { JavaSyntheticDocUri } from "./java-interop";

export class BBjIndexManager extends DefaultIndexManager {

    wsManager: () => WorkspaceManager;

    constructor(services: LangiumSharedServices) {
        super(services);
        this.wsManager = () => services.workspace.WorkspaceManager;
    }

    protected override isAffected(document: LangiumDocument<AstNode>, changed: URI): boolean {
        if(document.uri.toString() === JavaSyntheticDocUri || document.uri.scheme === 'bbjlib') {
            // only affected by ClassPath changes
            return false;
        }
        if (this.wsManager() instanceof BBjWorkspaceManager) {
            const bbjWsManager = this.wsManager() as BBjWorkspaceManager;
            const isExternal = bbjWsManager.isExternalDocument(document.uri)
            if (document.references.some(e => e.error !== undefined)) {
                // don't rebuild external documents that has errors
                return !isExternal
            }
            if(!bbjWsManager.isExternalDocument(changed) && isExternal) {
                // don't rebuild external documents if ws document changed
                return false;
            }
        }
        return super.isAffected(document, changed);
    }

}