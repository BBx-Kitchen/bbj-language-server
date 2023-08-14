import { AstNode, BuildOptions, DefaultDocumentBuilder, DocumentState, LangiumDocument, LangiumSharedServices, WorkspaceManager } from "langium";
import { BBjWsManager } from "./bbj-ws-manager";

export class BBjDocumentBuilder extends DefaultDocumentBuilder {
    wsManager: () => WorkspaceManager;

    constructor(services: LangiumSharedServices) {
        super(services);
        this.wsManager = () => services.workspace.WorkspaceManager;
    }

    protected override shouldValidate(_document: LangiumDocument<AstNode>, options: BuildOptions): boolean {
        if (_document.uri.toString() === 'classpath:/bbj.class') {
            // never validate programmatically created classpath document
            _document.state = DocumentState.Validated;
            return false;
        }
        const wsManager = this.wsManager();
        if (BBjWsManager.is(wsManager)) {
            const validate = super.shouldValidate(_document, options)
                && !wsManager.isExternalDocument(_document.uri)
            if (!validate) {
                // mark as validated to avoid rebuilding
                _document.state = DocumentState.Validated;
            }
            return validate;
        }
        return super.shouldValidate(_document, options);
    }
}

