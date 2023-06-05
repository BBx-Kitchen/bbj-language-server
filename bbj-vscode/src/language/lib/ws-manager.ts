import { AstNode, DefaultWorkspaceManager, LangiumDocument, LangiumDocumentFactory, LangiumSharedServices } from "langium";
import { CancellationToken } from "vscode";
import { WorkspaceFolder } from 'vscode-languageserver';
import { URI } from "vscode-uri";
import { BBjServices } from "../bbj-module";
import { JavaInteropService } from "../java-interop";
import { builtinFunctions } from "./functions";


export class BBjWorkspaceManager extends DefaultWorkspaceManager {

    private documentFactory: LangiumDocumentFactory;
    private javaInterop: JavaInteropService;
    
    constructor(services: LangiumSharedServices) {
        super(services);
        this.documentFactory = services.workspace.LangiumDocumentFactory;
        const bbjServices = services.ServiceRegistry.all.find(service => service.LanguageMetaData.languageId === 'bbj') as BBjServices;
        this.javaInterop = bbjServices.java.JavaInteropService;
    }

    override async initializeWorkspace(folders: WorkspaceFolder[], cancelToken?: CancellationToken | undefined): Promise<void> {
        const content = await this.fileSystemProvider.readDirectory(this.getRootFolder(folders[0]));
        const confFile = content.find(file => file.isFile && file.uri.path.endsWith("bbj.cfg"));
        if(confFile) {
            await this.javaInterop.loadClasspath(this.fileSystemProvider.readFileSync(confFile.uri), cancelToken)
        }
        return super.initializeWorkspace(folders, cancelToken);
    }

    protected override async loadAdditionalDocuments(
        folders: WorkspaceFolder[],
        collector: (document: LangiumDocument<AstNode>) => void
    ): Promise<void> {
        // Load library
        collector(this.documentFactory.fromString(builtinFunctions, URI.parse('bbjlib:///functions.bbl')));
    }
}