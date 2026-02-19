import { AstNode, DefaultWorkspaceManager, FileSystemProvider, LangiumDocument, LangiumDocumentFactory, } from "langium";
import { LangiumSharedServices } from "langium/lsp";
import { KeyValuePairObject, getProperties } from 'properties-file';
import { CancellationToken, WorkspaceFolder } from 'vscode-languageserver';
import { URI } from "vscode-uri";
import { BBjServices } from "./bbj-module.js";
import { JavaInteropService } from "./java-interop.js";
import { JavadocProvider } from "./java-javadoc.js";
import { logger } from "./logger.js";
import { builtinFunctions } from "./lib/functions.js";
import { builtinSymbolicLabels } from "./lib/labels.js";
import { builtinVariables } from "./lib/variables.js";
import { builtinBBjAPI } from "./lib/bbj-api.js";

// TODO extend the FileSystemAccess or add an additional service
// to not use 'fs' and 'os' here 
// import fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { builtinEvents } from "./lib/events.js";
import { setTypeResolutionWarnings } from "./bbj-validator.js";
import { setSuppressCascading, setMaxErrors } from "./bbj-document-validator.js";

export class BBjWorkspaceManager extends DefaultWorkspaceManager {

    private documentFactory: LangiumDocumentFactory;
    private javaInterop: JavaInteropService;
    private settings: { prefixes: string[], classpath: string[] } | undefined = undefined;
    private bbjdir = "";
    private classpathFromSettings = "";
    private configPath = "";

    constructor(services: LangiumSharedServices) {
        super(services);
        services.lsp.LanguageServer.onInitialize(params => {
            // Always print startup banner so the output channel is visible
            const version = params.initializationOptions?.version || 'unknown';
            console.log(`BBj Language Server v${version}`);

            logger.debug(() => `Initialization options received: ${JSON.stringify(params.initializationOptions)}`);
            if (typeof params.initializationOptions === 'string') {
                // Legacy: just the home directory
                this.bbjdir = params.initializationOptions;
            } else if (params.initializationOptions) {
                // New format: object with home and classpath
                this.bbjdir = params.initializationOptions.home || "";
                this.classpathFromSettings = params.initializationOptions.classpath || "";
                logger.info(`BBj home: ${this.bbjdir}`);
                logger.debug(`Classpath from settings: ${this.classpathFromSettings}`);

                // Extract interop settings and apply to JavaInteropService
                const interopHost = params.initializationOptions.interopHost || 'localhost';
                const interopPort = params.initializationOptions.interopPort || 5008;
                this.javaInterop.setConnectionConfig(interopHost, interopPort);

                // Extract configPath setting
                this.configPath = params.initializationOptions.configPath || "";

                // Set type resolution warnings based on settings
                const typeResWarnings = params.initializationOptions.typeResolutionWarnings;
                if (typeResWarnings === false) {
                    setTypeResolutionWarnings(false);
                    logger.info('Type resolution warnings disabled');
                } else {
                    setTypeResolutionWarnings(true);
                    logger.info('Type resolution warnings enabled');
                }

                // Set diagnostic suppression settings
                const suppressCascading = params.initializationOptions.suppressCascading;
                if (suppressCascading === false) {
                    setSuppressCascading(false);
                    logger.info('Diagnostic cascading suppression disabled');
                } else {
                    setSuppressCascading(true);
                    logger.info('Diagnostic cascading suppression enabled');
                }

                const maxErrors = params.initializationOptions.maxErrors;
                if (typeof maxErrors === 'number' && maxErrors >= 1) {
                    setMaxErrors(maxErrors);
                    logger.info(`Max displayed errors: ${maxErrors}`);
                } else {
                    setMaxErrors(20);
                }
            }
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

                // Resolve config.bbx location: use configPath setting if set, otherwise default to bbjdir/cfg/config.bbx
                if (this.configPath) {
                    try {
                        const configUri = safeUri(this.configPath);
                        const configContents = await this.fileSystemProvider.readFile(configUri);
                        prefixfromconfig = configContents.split('\n').find(line => line.startsWith("PREFIX"))?.substring(7) || "";
                        logger.info(`Loaded config.bbx from custom path: ${this.configPath}`);
                    } catch (e) {
                        logger.warn(`Failed to load config.bbx from custom path ${this.configPath}: ${e}`);
                    }
                } else if (this.bbjdir) {
                    try {
                        const bbjcfgdir = await this.fileSystemProvider.readDirectory(joinPath(safeUri(this.bbjdir), 'cfg'));
                        const configbbx = bbjcfgdir.find(file => file.isFile && file.uri.path.endsWith("config.bbx"));
                        if (configbbx) {
                            prefixfromconfig = (await this.fileSystemProvider.readFile(configbbx.uri)).split('\n').find(line => line.startsWith("PREFIX"))?.substring(7) || "";
                        }
                    } catch (e) {
                        logger.warn("No cfg/config.bbx found in bbjdir. No prefixes loaded.")
                    }
                } else {
                    logger.warn("No bbjdir set. No classpath and prefixes loaded.")
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
            logger.debug(`JavaDoc provider initialize ${wsJavadocFolders}`);
            await tryInitializeJavaDoc(wsJavadocFolders, this.fileSystemProvider, cancelToken);

            // Use classpath from project.properties if available, otherwise fall back to VS Code settings
            let classpathToUse = this.settings!.classpath;
            
            // Check if classpath is effectively empty (no entries or just one empty string)
            const isClasspathEmpty = classpathToUse.length === 0 || 
                                   (classpathToUse.length === 1 && classpathToUse[0] === "");
            
            if (isClasspathEmpty && this.classpathFromSettings) {
                // The setting value should be wrapped in square brackets
                // For example: if bbj.classpath = "something", we pass ["[something]"]
                classpathToUse = [`[${this.classpathFromSettings}]`];
                logger.debug(`Using classpath from VS Code settings: bbj.classpath="${this.classpathFromSettings}"`);
                logger.debug(() => `Formatted for Java interop: ${JSON.stringify(classpathToUse)}`);
            }
            
            if (classpathToUse.length > 0) {
                logger.debug(() => `Loading classpath with entries: ${JSON.stringify(classpathToUse)}`);
                const loaded = await this.javaInterop.loadClasspath(classpathToUse, cancelToken)
                logger.info(`Java Classes ${loaded ? '' : 'not '}loaded`)
            } else {
                logger.warn("No classpath set. No Java classes loaded.")
            }
            const iiLoaded = await this.javaInterop.loadImplicitImports(cancelToken);
            logger.debug(`Implicit Java imports ${iiLoaded ? '' : 'not '}loaded`)
        } catch (e) {
            // all fine
            console.error(e);
        }

        return await super.initializeWorkspace(folders, cancelToken);
    }

    override shouldIncludeEntry(entry: { isFile: boolean; isDirectory: boolean; uri: URI }): boolean {
        // Filter files to only include BBj source extensions (.bbj, .bbjt)
        // .bbl excluded — library files are not user-editable source (#369)
        // This prevents Langium from trying to index .class files or other non-language files
        if (entry.isFile) {
            const path = entry.uri.path.toLowerCase();
            if (!path.endsWith('.bbj') && !path.endsWith('.bbjt') && !path.endsWith('.bbx') && !path.endsWith('.src')) {
                return false;
            }
        }
        // Note: Binary file filtering (files starting with '<<bbj>>') is now handled
        // during document building phase via document validators, not during traversal
        return super.shouldIncludeEntry(entry);
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
        collector(this.documentFactory.fromString(builtinBBjAPI, URI.parse('bbjlib:///bbj-api.bbl')));
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
                if (prefix.length > 0 && documentUri.fsPath.startsWith(URI.file(prefix).fsPath)) {
                    return true;
                }
            }
        }
        return false;
    }

    public setConfigPath(path: string): void {
        this.configPath = path;
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
        const javadocProvider = JavadocProvider.getInstance();
        if (!javadocProvider.isInitialized()) {
            return await javadocProvider.initialize(wsJavadocFolders, fileSystemProvider, cancelToken);
        }
    } catch (e) {
        console.error(e);
    }
}

