import { AstNode, BuildOptions, DefaultDocumentBuilder, DocumentState, FileSystemProvider, LangiumDocument, LangiumSharedCoreServices, WorkspaceManager, interruptAndCheck, AstUtils } from "langium";
import { CancellationToken } from "vscode-jsonrpc";
import { URI } from 'vscode-uri';
import { BBjWorkspaceManager } from "./bbj-ws-manager.js";
import { Use, isUse } from "./generated/ast.js";
import { JavaSyntheticDocUri } from "./java-interop.js";

export class BBjDocumentBuilder extends DefaultDocumentBuilder {

    wsManager: () => WorkspaceManager;
    fileSystemProvider: FileSystemProvider;

    constructor(services: LangiumSharedCoreServices) {
        super(services);
        this.wsManager = () => services.workspace.WorkspaceManager;
        this.fileSystemProvider = services.workspace.FileSystemProvider
    }

    protected override shouldValidate(_document: LangiumDocument<AstNode>): boolean {
        if (_document.uri.toString() === JavaSyntheticDocUri) {
            // never validate programmatically created classpath document
            _document.state = DocumentState.Validated;
            return false;
        }
        if (this.wsManager() instanceof BBjWorkspaceManager) {
            const validate = super.shouldValidate(_document)
                && !(this.wsManager() as BBjWorkspaceManager).isExternalDocument(_document.uri)
            if (!validate) {
                // mark as validated to avoid rebuilding
                _document.state = DocumentState.Validated;
            }
            return validate;
        }
        return super.shouldValidate(_document);
    }

    protected override async buildDocuments(documents: LangiumDocument<AstNode>[], options: BuildOptions, cancelToken: CancellationToken): Promise<void> {
        await super.buildDocuments(documents, options, cancelToken);
        // Collect and add referenced BBj Document. Trigger update afterwards.
        await this.addImportedBBjDocuments(documents, options, cancelToken);
    }

    async addImportedBBjDocuments(documents: LangiumDocument<AstNode>[], options: BuildOptions, cancelToken: CancellationToken) {
        const bbjWsManager = this.wsManager() as BBjWorkspaceManager;
        const prefixes = bbjWsManager.getSettings()?.prefixes;
        if (!prefixes) {
            return;
        }

        const bbjImports = new Set<string>();
        for (const document of documents) {
            await interruptAndCheck(cancelToken);
            AstUtils.streamAllContents(document.parseResult.value).filter(isUse).forEach((use: Use) => {
                if (use.bbjFilePath) {
                    bbjImports.add(use.bbjFilePath);
                }
            })
        }

        const documentFactory = this.langiumDocumentFactory;
        const langiumDocuments = this.langiumDocuments;
        const fsProvider = this.fileSystemProvider;

        const addedDocuments: URI[] = []
        for (const importPath of bbjImports) {
            const docFileContents = await Promise.all(prefixes.map(async prefixPath => {
                const prefixedPath = URI.file(prefixPath + (prefixPath.endsWith('/') ? '' : '/') + importPath)
                try {
                    const fileContent = await fsProvider.readFile(prefixedPath);
                    return { uri: prefixedPath, text: fileContent };
                } catch (e) {
                    return undefined;
                }
            }));
            
            const docFileData = docFileContents.find(doc => doc !== undefined);
            if (docFileData) {
                const document = documentFactory.fromString(docFileData.text, docFileData.uri);
                if (!langiumDocuments.hasDocument(document.uri)) {
                    langiumDocuments.addDocument(document);
                    addedDocuments.push(document.uri);
                }
            }
        }
        if (addedDocuments.length > 0) {
            const started = Date.now()
            await this.update(addedDocuments, [], cancelToken);
            const elapsed = Date.now() - started
            console.debug(`Transitive BBj file update for ${addedDocuments.length} documents took ${elapsed}ms`)
        }
    };
}

