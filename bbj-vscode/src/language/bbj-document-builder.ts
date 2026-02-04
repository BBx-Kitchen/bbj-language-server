import { AstNode, BuildOptions, DefaultDocumentBuilder, DocumentState, FileSystemProvider, LangiumDocument, LangiumSharedCoreServices, WorkspaceManager, interruptAndCheck, AstUtils } from "langium";
import { CancellationToken } from "vscode-jsonrpc";
import { URI } from 'vscode-uri';
import { BBjWorkspaceManager } from "./bbj-ws-manager.js";
import { Use, isUse } from "./generated/ast.js";
import { JavaSyntheticDocUri } from "./java-interop.js";
import { BBjPathPattern } from "./bbj-scope.js";
import { resolve } from "path";

export class BBjDocumentBuilder extends DefaultDocumentBuilder {

    wsManager: () => WorkspaceManager;
    override fileSystemProvider: FileSystemProvider;

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
        let prefixes = bbjWsManager.getSettings()?.prefixes;
        if (!prefixes) {
            return
        }

        const bbjImports = new Set<string>();
        for (const document of documents) {
            await interruptAndCheck(cancelToken);
            AstUtils.streamAllContents(document.parseResult.value).filter(isUse).forEach((use: Use) => {
                if (use.bbjFilePath) {
                    const cleanPath = use.bbjFilePath.match(BBjPathPattern)![1];
                    bbjImports.add(cleanPath);
                }
            })
        }

        const documentFactory = this.langiumDocumentFactory;
        const langiumDocuments = this.langiumDocuments;
        const fsProvider = this.fileSystemProvider;

        const addedDocuments: URI[] = []
        for (const importPath of bbjImports) {
            let docFileData;
            for (const prefixPath of prefixes) {
                const prefixedPath = URI.file(resolve(prefixPath, importPath));
                try {
                    const fileContent = await fsProvider.readFile(prefixedPath);
                    docFileData = { uri: prefixedPath, text: fileContent };
                    break; // early stop iterating prefixes when file is found
                } catch (e) {
                    // Continue to the next prefixPath if readFile fails
                }
            }
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

