import { AstNode, DefaultWorkspaceManager, LangiumDocument, LangiumDocumentFactory, LangiumSharedServices } from "langium";
import { CancellationToken } from "vscode";
import { WorkspaceFolder } from 'vscode-languageserver';
import { URI } from "vscode-uri";
import { BBjServices } from "../bbj-module";
import { JavaInteropService } from "../java-interop";
import { builtinFunctions } from "./functions";
import { getProperties } from 'properties-file'
import os from 'os'
import fs from 'fs';

export class BBjWorkspaceManager extends DefaultWorkspaceManager {

    private documentFactory: LangiumDocumentFactory;
    private javaInterop: JavaInteropService;
    private settings: { prefixes: string[], classpath: string } | undefined = undefined;

    constructor(services: LangiumSharedServices) {
        super(services);
        this.documentFactory = services.workspace.LangiumDocumentFactory;
        const bbjServices = services.ServiceRegistry.all.find(service => service.LanguageMetaData.languageId === 'bbj') as BBjServices;
        this.javaInterop = bbjServices.java.JavaInteropService;
    }

    override async initializeWorkspace(folders: WorkspaceFolder[], cancelToken?: CancellationToken | undefined): Promise<void> {
        const content = await this.fileSystemProvider.readDirectory(this.getRootFolder(folders[0]));
        const confFile = content.find(file => file.isFile && file.uri.path.endsWith("project.properties"));
        if (confFile) {
            this.settings = parseSettings(this.fileSystemProvider.readFileSync(confFile.uri))
            await this.javaInterop.loadClasspath(this.settings!.classpath, cancelToken)

        }
        return super.initializeWorkspace(folders, cancelToken);
    }

    protected override async loadAdditionalDocuments(
        folders: WorkspaceFolder[],
        collector: (document: LangiumDocument<AstNode>) => void
    ): Promise<void> {
        // Load library
        collector(this.documentFactory.fromString(builtinFunctions, URI.parse('bbjlib:///functions.bbl')));
        if (this.settings?.prefixes) {
            this.settings.prefixes.forEach(async prefixPath => {
                console.warn('Add to additional files: ' + prefixPath.toString())
                if(fs.existsSync(prefixPath)) {
                    await this.traverseFolder({ name: "", uri: "" }, URI.file(prefixPath), ['.bbj'], collector)
                } else {
                    console.warn(`${prefixPath} is not a directory. Skipped.`)
                }
            })
        }
    }
}

export function parseSettings(input: string): { prefixes: string[], classpath: string } {
    const props = getProperties(input)
    return { prefixes: collectPrefixes(props.PREFIX), classpath: resolveTilde(props.classpath) };
}

export function collectPrefixes(input: string): string[] {
    return input.split(" ").map(entry => resolveTilde(entry.trim().slice(1, -1)))
}

export function resolveTilde(input: string) : string {
    return input.replace('~', os.homedir())
}