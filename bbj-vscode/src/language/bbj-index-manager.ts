import { AstNode, DefaultIndexManager, LangiumDocument, LangiumSharedCoreServices, URI, WorkspaceManager } from "langium";
import { BBjWorkspaceManager } from "./bbj-ws-manager.js";
import { JavaSyntheticDocUri } from "./java-interop.js";

export class BBjIndexManager extends DefaultIndexManager {

    wsManager: () => WorkspaceManager;

    constructor(services: LangiumSharedCoreServices) {
        super(services);
        this.wsManager = () => services.workspace.WorkspaceManager;
    }

    public override isAffected(document: LangiumDocument<AstNode>, changedUris: Set<string>): boolean {
        if(document.uri.toString() === JavaSyntheticDocUri || document.uri.scheme === 'bbjlib') {
            // only affected by ClassPath changes
            return false;
        }
        if (this.wsManager() instanceof BBjWorkspaceManager) {
            const bbjWsManager = this.wsManager() as BBjWorkspaceManager;
            const isExternal = bbjWsManager.isExternalDocument(document.uri)
            // Don't rebuild external documents if workspace documents changed
            if(![...changedUris].every(changed => bbjWsManager.isExternalDocument(URI.parse(changed))) && isExternal) {
                return false;
            }
        }
        return super.isAffected(document, changedUris);
    }

}