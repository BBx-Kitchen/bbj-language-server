import { AstNode, DefaultWorkspaceManager, LangiumDocument, LangiumDocumentFactory, LangiumSharedServices } from "langium";
import { KeyValuePairObject, getProperties } from 'properties-file';
import { CancellationToken, WorkspaceFolder } from 'vscode-languageserver';
import { URI } from "vscode-uri";
import { BBjServices } from "./bbj-module";
import { JavaInteropService } from "./java-interop";
import { JavadocProvider } from "./java-javadoc";
import { builtinFunctions } from "./lib/functions";
import { builtinSymbolicLabels } from "./lib/labels";
import { builtinVariables } from "./lib/variables";

// TODO extend the FileSystemAccess or add an additional service
// to not use 'fs' and 'os' here 
// import fs from 'fs';
import os from 'os';
import path from 'path';

export class BBjWorkspaceManager extends DefaultWorkspaceManager {

    private documentFactory: LangiumDocumentFactory;
    private javaInterop: JavaInteropService;
    private settings: { prefixes: string[], classpath: string[] } | undefined = undefined;
    private bbjdir = "";

    constructor(services: LangiumSharedServices) {
        super(services);
        services.lsp.LanguageServer.onInitialize(params => {
            this.bbjdir = params.initializationOptions;
        });
        this.documentFactory = services.workspace.LangiumDocumentFactory;
        const bbjServices = services.ServiceRegistry.all.find(service => service.LanguageMetaData.languageId === 'bbj') as BBjServices;
        this.javaInterop = bbjServices.java.JavaInteropService;
    }

    override async initializeWorkspace(folders: WorkspaceFolder[], cancelToken?: CancellationToken | undefined): Promise<void> {

        try {
            const content = await this.fileSystemProvider.readDirectory(this.getRootFolder(folders[0]));
            const confFile = content.find(file => file.isFile && file.uri.path.endsWith("project.properties"));
            let propcontents = "";
            if (confFile) {
                propcontents = this.fileSystemProvider.readFileSync(confFile.uri);
            }
            let prefixfromconfig;
            if (this.bbjdir) {
                const bbjcfgdir = await this.fileSystemProvider.readDirectory(URI.parse(this.bbjdir + "/cfg/"));
                const configbbx = bbjcfgdir.find(file => file.isFile && file.uri.path.endsWith("config.bbx"));
                if (configbbx) {
                    prefixfromconfig = this.fileSystemProvider.readFileSync(configbbx.uri).split('\n').find(line => line.startsWith("PREFIX"))?.substring(7) || "";
                }
            } else {
                console.warn("No bbjdir set. No classpath and prefixes loaded.")
            }
            this.settings = parseSettings(propcontents, prefixfromconfig)

            // initialize javadoc look-up before loading classes.
            const wsJavadocFolders = folders.map(folder => URI.parse(folder.uri + '/javadoc/'))
            if (this.bbjdir) {
                wsJavadocFolders.unshift(URI.parse(this.bbjdir + '/documentation/javadoc/'))
            }
            await JavadocProvider.getInstance().initialize(wsJavadocFolders, this.fileSystemProvider, cancelToken);

            const loaded = await this.javaInterop.loadClasspath(this.settings!.classpath, cancelToken)
            console.debug(`Java Classes ${loaded ? '' : 'not '}loaded`)
            const iiLoaded = await this.javaInterop.loadImplicitImports(cancelToken);
            console.debug(`Implicit Java imports ${iiLoaded ? '' : 'not '}loaded`)
        } catch (e) {
            // all fine
            console.error(e);
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
                    const fileContent = await this.fileSystemProvider.readFile(entry.uri);
                    if (!fileContent.startsWith('<<bbj>>')) {
                        if (!this.langiumDocuments.hasDocument(entry.uri)) {
                            collector(this.documentFactory.fromString(fileContent, entry.uri));
                        }
                    } else {
                        // TODO Read binary file
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
        collector(this.documentFactory.fromString(builtinVariables, URI.parse('bbjlib:///variables.bbl')));
        collector(this.documentFactory.fromString(builtinSymbolicLabels, URI.parse('bbjlib:///labels.bbl')));
    }

    public getSettings() {
        return this.settings;
    }

    public getBBjDir() {
        return this.bbjdir;
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

export function parseSettings(input: string, prefixfromconfigbbx: string | undefined): { prefixes: string[], classpath: string[] } {

    let props: KeyValuePairObject;
    props = getProperties(input);
    let cp = "";
    if (props.classpath) {
        cp = resolveTilde(props.classpath);
    }

    let pfx = ""
    if (props.PREFIX) {
        pfx = props.PREFIX;
    } else if (prefixfromconfigbbx)
        pfx = prefixfromconfigbbx;

    return { prefixes: collectPrefixes(pfx), classpath: cp.split(":") };
}

export function collectPrefixes(input: string): string[] {
    return input.split(" ").map(entry => resolveTilde(entry.trim().slice(1, -1)))
}

export function resolveTilde(input: string): string {
    return input.replaceAll('~', os.homedir())
}

