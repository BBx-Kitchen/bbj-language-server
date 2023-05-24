import { AstNode, DefaultWorkspaceManager, LangiumDocument, LangiumDocumentFactory, LangiumSharedServices } from "langium";
import { WorkspaceFolder } from 'vscode-languageserver';
import { URI } from "vscode-uri";
import { builtinFunctions } from "./functions";


export class BBjWorkspaceManager extends DefaultWorkspaceManager {

    private documentFactory: LangiumDocumentFactory;

    constructor(services: LangiumSharedServices) {
        super(services);
        this.documentFactory = services.workspace.LangiumDocumentFactory;
    }

    protected override async loadAdditionalDocuments(
        folders: WorkspaceFolder[],
        collector: (document: LangiumDocument<AstNode>) => void
    ): Promise<void> {
        console.warn('Loading bbjlib:///functions.bbl')
        // Load library
        collector(this.documentFactory.fromString(builtinFunctions, URI.parse('bbjlib:///functions.bbl')));
    }
}