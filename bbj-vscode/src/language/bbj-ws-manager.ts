import { AstNode, DefaultWorkspaceManager, FileSystemProvider, LangiumDocument, LangiumDocumentFactory, } from "langium";
import { LangiumSharedServices } from "langium/lsp";
import { KeyValuePairObject, getProperties } from 'properties-file';
import { CancellationToken, WorkspaceFolder } from 'vscode-languageserver';
import { URI } from "vscode-uri";
import { BBjServices } from "./bbj-module.js";
import { JavaInteropService } from "./java-interop.js";
import { JavadocProvider } from "./java-javadoc.js";
import { builtinFunctions } from "./lib/functions.js";
import { builtinSymbolicLabels } from "./lib/labels.js";
import { builtinVariables } from "./lib/variables.js";

// TODO extend the FileSystemAccess or add an additional service
// to not use 'fs' and 'os' here 
// import fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { builtinEvents } from "./lib/events.js";

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
            let propcontents = "";
            let prefixfromconfig;
            if (folders.length > 0) {
                const content = await this.fileSystemProvider.readDirectory(this.getRootFolder(folders[0]));
                const confFile = content.find(file => file.isFile && file.uri.path.endsWith("project.properties"));
                if (confFile) {
                    propcontents = await this.fileSystemProvider.readFile(confFile.uri);
                }
                if (this.bbjdir) {
                    try {
                        const bbjcfgdir = await this.fileSystemProvider.readDirectory(joinPath(safeUri(this.bbjdir), 'cfg'));
                        const configbbx = bbjcfgdir.find(file => file.isFile && file.uri.path.endsWith("config.bbx"));
                        if (configbbx) {
                            prefixfromconfig = (await this.fileSystemProvider.readFile(configbbx.uri)).split('\n').find(line => line.startsWith("PREFIX"))?.substring(7) || "";
                        }
                    } catch (e) {
                        console.warn("No cfg/config.bbx found in bbjdir. No prefixes loaded.")
                    }
                } else {
                    console.warn("No bbjdir set. No classpath and prefixes loaded.")
                }
            }
            this.settings = parseSettings(propcontents, prefixfromconfig)

            // initialize javadoc look-up before loading classes.
            const wsJavadocFolders = folders.map(folder =>
                joinPath(safeUri(folder.uri), 'javadoc')
            );
            if (this.bbjdir) {
                wsJavadocFolders.unshift(
                    joinPath(safeUri(this.bbjdir), 'documentation', 'javadoc')
                );
            }
            console.debug(`JavaDoc provider initialize ${wsJavadocFolders}`);
            await tryInitializeJavaDoc(wsJavadocFolders, this.fileSystemProvider, cancelToken);

            if (this.settings!.classpath.length > 0) {
                const loaded = await this.javaInterop.loadClasspath(this.settings.classpath, cancelToken)
                console.debug(`Java Classes ${loaded ? '' : 'not '}loaded`)
            } else {
                console.warn("No classpath set. No Java classes loaded.")
            }
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
        _folders: WorkspaceFolder[],
        collector: (document: LangiumDocument<AstNode>) => void
    ): Promise<void> {
        // Load library
        collector(this.documentFactory.fromString(builtinFunctions, URI.parse('bbjlib:///functions.bbl')));
        collector(this.documentFactory.fromString(builtinVariables, URI.parse('bbjlib:///variables.bbl')));
        collector(this.documentFactory.fromString(builtinSymbolicLabels, URI.parse('bbjlib:///labels.bbl')));
        collector(this.documentFactory.fromString(builtinEvents, URI.parse('bbjlib:///events.bbl')));
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
                if (documentUri.fsPath.startsWith(URI.file(prefix).fsPath)) {
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

    return { prefixes: collectPrefixes(pfx), classpath: cp.split(path.delimiter) };
}

export function safeUri(input: string): URI {
    return input.startsWith('file://') ? URI.parse(input) : URI.file(input);
}
export function joinPath(base: URI, ...segments: string[]): URI {
    const path = [base.path, ...segments].join('/');
    const normalized = path.replace(/\/+/g, '/');
    return base.with({ path: normalized });
}

export function collectPrefixes(input: string): string[] {
    return input.split(" ").map(entry => resolveTilde(entry.trim().slice(1, -1)))
}

export function resolveTilde(input: string): string {
    return input.replaceAll('~', os.homedir())
}

async function tryInitializeJavaDoc(wsJavadocFolders: URI[], fileSystemProvider: FileSystemProvider, cancelToken: CancellationToken = CancellationToken.None) {
    try {
        return await JavadocProvider.getInstance().initialize(wsJavadocFolders, fileSystemProvider, cancelToken);
    } catch (e) {
        console.error(e);
    }
}

