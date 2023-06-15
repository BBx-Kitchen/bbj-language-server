import { AstNode, DefaultIndexManager, LangiumDocument, LangiumSharedServices, WorkspaceManager } from "langium";
import { URI } from "vscode-uri";
import { BBjWorkspaceManager } from "./bbj-ws-manager";

export class BBjIndexManager extends DefaultIndexManager {

    wsManager: () => WorkspaceManager;

    constructor(services: LangiumSharedServices) {
        super(services);
        this.wsManager = () => services.workspace.WorkspaceManager;
    }

    protected override isAffected(document: LangiumDocument<AstNode>, changed: URI): boolean {
        if (this.wsManager() instanceof BBjWorkspaceManager) {
            if (document.references.some(e => e.error !== undefined)) {
                // don't rebuild external documents that has errors
                return !(this.wsManager() as BBjWorkspaceManager).isExternalDocument(document.uri)
            }
        }
        return super.isAffected(document, changed);
    }

}