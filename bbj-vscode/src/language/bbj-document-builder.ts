import { AstNode, BuildOptions, DefaultDocumentBuilder, LangiumDocument, LangiumSharedServices, WorkspaceManager } from "langium";
import { BBjWorkspaceManager } from "./bbj-ws-manager";


export class BBjDocumentBuilder extends DefaultDocumentBuilder {
    wsManager: () => WorkspaceManager;
    
    constructor(services: LangiumSharedServices) {
        super(services);
        this.wsManager = () => services.workspace.WorkspaceManager;
    }
    
    protected override shouldValidate(_document: LangiumDocument<AstNode>, options: BuildOptions): boolean {
        if(_document.uri.toString() === 'classpath:/bbj.class') {
            // never validate programmatically created classpath document
            return false;
        }
        if(this.wsManager() instanceof BBjWorkspaceManager) {
            return super.shouldValidate(_document, options)
                && !(this.wsManager() as BBjWorkspaceManager).isExternalDocument(_document.uri)
        }
        return super.shouldValidate(_document, options);
    }
}

