import { AstNode, DefaultWorkspaceManager, LangiumDocument, LangiumDocumentFactory, LangiumSharedServices } from "langium";
import { CancellationToken } from "vscode";
import { WorkspaceFolder } from 'vscode-languageserver';
import { URI } from "vscode-uri";
import { BBjServices } from "./bbj-module";
import { JavaInteropService } from "./java-interop";
import { builtinFunctions } from "./lib/functions";
import { getProperties } from 'properties-file'

// TODO extend the FileSystemAccess or add an additional service
// to not use 'fs' and 'os' here 
import os from 'os'
import fs from 'fs';
import path from 'path';

export class BBjWorkspaceManager extends DefaultWorkspaceManager {

    private documentFactory: LangiumDocumentFactory;
    private javaInterop: JavaInteropService;
    private settings: { prefixes: string[], classpath: string[] } | undefined = undefined;

    constructor(services: LangiumSharedServices) {
        super(services);
        this.documentFactory = services.workspace.LangiumDocumentFactory;
        const bbjServices = services.ServiceRegistry.all.find(service => service.LanguageMetaData.languageId === 'bbj') as BBjServices;
        this.javaInterop = bbjServices.java.JavaInteropService;
    }

    override async initializeWorkspace(folders: WorkspaceFolder[], cancelToken?: CancellationToken | undefined): Promise<void> {
        try {
            const content = await this.fileSystemProvider.readDirectory(this.getRootFolder(folders[0]));
            const confFile = content.find(file => file.isFile && file.uri.path.endsWith("project.properties"));
            if (confFile) {
                this.settings = parseSettings(this.fileSystemProvider.readFileSync(confFile.uri))
            } else {
                this.settings = parseSettings("")
            }
            await this.javaInterop.loadClasspath(this.settings!.classpath, cancelToken)
            await this.javaInterop.loadImplicitImports(cancelToken);
        } catch {
            // all fine
        }
        return await super.initializeWorkspace(folders, cancelToken);
    }

    protected override async traverseFolder(workspaceFolder: WorkspaceFolder, folderPath: URI, fileExtensions: string[], collector: (document: LangiumDocument) => void): Promise<void> {
        const content = await this.fileSystemProvider.readDirectory(folderPath);
        await Promise.all(content.map(async entry => {
            if (this.includeEntry(workspaceFolder, entry, fileExtensions)) {
                if (entry.isDirectory) {
                    await this.traverseFolder(workspaceFolder, entry.uri, fileExtensions, collector);
                } else if (entry.isFile) {
                    // TODO Read from stream
                    const file = await this.fileSystemProvider.readFile(entry.uri);
                    if(!file.startsWith('<<bbj>>')) {
                        const document = this.langiumDocuments.getOrCreateDocument(entry.uri);
                        collector(document);
                    } else {
                        console.warn(`Skipped binary file from index: ${entry.uri}`)
                    }
                }
            }
        }));
    }
    protected override async loadAdditionalDocuments(
        folders: WorkspaceFolder[],
        collector: (document: LangiumDocument<AstNode>) => void
    ): Promise<void> {
        // Load library
        collector(this.documentFactory.fromString(builtinFunctions, URI.parse('bbjlib:///functions.bbl')));

        // Load additional files configured with the PREFIX property
        if (this.settings?.prefixes) {
            Promise.all(this.settings.prefixes.map(async prefixPath => {
                console.warn('Add to additional files: ' + prefixPath.toString())
                if (fs.existsSync(prefixPath)) {
                    await this.traverseFolder({ name: "", uri: "" }, URI.file(prefixPath), ['.bbj'], collector)
                } else {
                    console.warn(`${prefixPath} is not a directory. Skipped.`)
                }
            }))
        }
    }

    public getSettings() {
        return this.settings;
    }

    public isExternalDocument(documentUri: URI): boolean {
        if (this.settings?.prefixes) {
            for (const prefix of this.settings?.prefixes) {
                // TODO check that document is part of the workspace folders
                if (documentUri.fsPath.startsWith(path.normalize(prefix))) {
                    return true;
                }
            }
        }
        return false;
    }
}

export function parseSettings(input: string): { prefixes: string[], classpath: string[] } {
    const props = getProperties(input)
    console.warn("get props: ",props);
    
    var cp="";
    if (props.classpath) {
        cp = resolveTilde(props.classpath);
    }

    var pfx=""
    if (props.PREFIX) {
        pfx = props.PREFIX;
    }

    return { prefixes: collectPrefixes(pfx), classpath: cp.split(":")};
}

export function collectPrefixes(input: string): string[] {
    return input.split(" ").map(entry => resolveTilde(entry.trim().slice(1, -1)))
}

export function resolveTilde(input: string): string {
    return input.replaceAll('~', os.homedir())
}