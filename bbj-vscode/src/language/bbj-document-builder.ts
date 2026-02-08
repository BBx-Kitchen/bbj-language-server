import { AstNode, BuildOptions, DefaultDocumentBuilder, DocumentState, FileSystemProvider, LangiumDocument, LangiumSharedCoreServices, WorkspaceManager, interruptAndCheck, AstUtils, UriUtils } from "langium";
import { CancellationToken } from "vscode-jsonrpc";
import { URI } from 'vscode-uri';
import { BBjWorkspaceManager } from "./bbj-ws-manager.js";
import { Use, isUse, BbjClass } from "./generated/ast.js";
import { JavaSyntheticDocUri } from "./java-interop.js";
import { BBjPathPattern } from "./bbj-scope.js";
import { normalize, resolve } from "path";
import { logger } from './logger.js';
import { USE_FILE_NOT_RESOLVED_PREFIX } from './bbj-validator.js';

export class BBjDocumentBuilder extends DefaultDocumentBuilder {

    wsManager: () => WorkspaceManager;
    override fileSystemProvider: FileSystemProvider;
    private importDepth = 0;
    private static readonly MAX_IMPORT_DEPTH = 10;
    private isImportingBBjDocuments = false;

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
        // Collect and add referenced BBj documents after the initial build.
        // Skip if we're already inside an import cycle to prevent infinite loops:
        // buildDocuments -> addImportedBBjDocuments -> update -> shouldRelink (marks
        // docs with ref errors) -> buildDocuments -> addImportedBBjDocuments -> ...
        if (!this.isImportingBBjDocuments) {
            await this.addImportedBBjDocuments(documents, options, cancelToken);
            // After external PREFIX-resolved documents are loaded and indexed,
            // remove false-positive "could not be resolved" diagnostics for paths
            // that are now in the index. This fixes the timing issue where validation
            // runs before addImportedBBjDocuments loads external files.
            await this.revalidateUseFilePathDiagnostics(documents, cancelToken);
        }
    }

    /**
     * Collect all LangiumDocument objects for the given URIs from the document registry.
     */
    private getDocumentsForUris(uris: URI[]): LangiumDocument[] {
        return uris
            .filter(uri => this.langiumDocuments.hasDocument(uri))
            .map(uri => this.langiumDocuments.getDocument(uri)!);
    }

    /**
     * Override shouldRelink to prevent documents from being unnecessarily
     * relinked just because they have unresolved references. The default
     * Langium behavior relinks any document with reference errors on every
     * change, which causes a cascading rebuild loop when combined with
     * transitive USE import resolution.
     *
     * However, during the import flow (isImportingBBjDocuments), we restore
     * the default behavior of relinking documents with unresolved references.
     * This is necessary because when new external documents are loaded via
     * addImportedBBjDocuments, existing documents may have unresolved
     * references (e.g., extends clauses, field accesses) that can now be
     * resolved with the newly available documents. The isImportingBBjDocuments
     * flag already prevents infinite loops by blocking recursive imports.
     */
    protected override shouldRelink(document: LangiumDocument, changedUris: Set<string>): boolean {
        // During import resolution, also relink documents that have unresolved
        // references -- the newly imported documents may resolve them.
        if (this.isImportingBBjDocuments) {
            const hasErrors = document.references.some(ref => ref.error !== undefined);
            if (hasErrors) {
                return true;
            }
        }
        // For normal incremental updates, only relink if the document is
        // actually affected by a changed URI (i.e., one of its resolved
        // dependencies changed). This avoids relinking 25+ documents on
        // every keystroke just because they have some unresolvable references.
        return this.indexManager.isAffected(document, changedUris);
    }

    async addImportedBBjDocuments(documents: LangiumDocument<AstNode>[], options: BuildOptions, cancelToken: CancellationToken) {
        const bbjWsManager = this.wsManager() as BBjWorkspaceManager;
        let prefixes = bbjWsManager.getSettings()?.prefixes;
        if (!prefixes) {
            return
        }

        // Depth guard: prevent infinite recursion from transitive USE chains
        this.importDepth++;
        if (this.importDepth > BBjDocumentBuilder.MAX_IMPORT_DEPTH) {
            logger.warn(`Maximum transitive import depth (${BBjDocumentBuilder.MAX_IMPORT_DEPTH}) reached. Stopping USE resolution.`);
            this.importDepth--;
            return;
        }

        // Only the outermost call manages the flag; recursive calls inherit it.
        const isOutermostCall = !this.isImportingBBjDocuments;
        this.isImportingBBjDocuments = true;
        try {
            // Scan ALL passed documents for USE statements, including external/PREFIX
            // documents. This enables transitive dependency loading: if A.bbj uses
            // B.bbj (loaded from PREFIX), and B.bbj uses C.bbj, then C.bbj also
            // gets loaded. The depth guard above prevents infinite recursion.
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
                        // File not found at this prefix, try next
                    }
                }
                if (!docFileData) {
                    // Could not load from any PREFIX directory; will be reported as a diagnostic
                }
                if (docFileData) {
                    // Skip binary/tokenized BBj files that can't be parsed
                    if (docFileData.text.startsWith('<<bbj>>')) {
                        logger.warn(`Skipping binary/tokenized file: ${docFileData.uri.fsPath}`);
                        continue;
                    }
                    const document = documentFactory.fromString(docFileData.text, docFileData.uri);
                    if (!langiumDocuments.hasDocument(document.uri)) {
                        langiumDocuments.addDocument(document);
                        addedDocuments.push(document.uri);
                    }
                    // else: already loaded, skip
                }
            }
            if (addedDocuments.length > 0) {
                await this.update(addedDocuments, [], cancelToken);
                // Recursively load transitive USE dependencies from the newly-added
                // external documents. For example, if workspace file uses BBjGridExWidget.bbj
                // (loaded from PREFIX), and BBjGridExWidget.bbj uses GxOptions.bbj, then
                // GxOptions.bbj also needs to be loaded from PREFIX.
                const newDocs = this.getDocumentsForUris(addedDocuments);
                if (newDocs.length > 0) {
                    await this.addImportedBBjDocuments(newDocs, options, cancelToken);
                }
            }
        } finally {
            if (isOutermostCall) {
                this.isImportingBBjDocuments = false;
            }
            this.importDepth--;
        }
    };

    /**
     * After addImportedBBjDocuments loads and indexes external PREFIX-resolved files,
     * re-check USE file-path diagnostics that were emitted during the initial build.
     * Diagnostics for paths that are NOW resolvable via the index are removed, and
     * updated diagnostics are pushed to the editor.
     */
    private async revalidateUseFilePathDiagnostics(
        documents: LangiumDocument<AstNode>[],
        cancelToken: CancellationToken
    ): Promise<void> {
        const bbjWsManager = this.wsManager() as BBjWorkspaceManager;
        const prefixes = bbjWsManager.getSettings()?.prefixes ?? [];

        for (const document of documents) {
            if (bbjWsManager.isExternalDocument(document.uri)) continue;
            if (!document.diagnostics?.length) continue;

            const originalLength = document.diagnostics.length;
            document.diagnostics = document.diagnostics.filter(diag => {
                // Only re-check our specific USE file-path diagnostics
                if (!diag.message.startsWith(USE_FILE_NOT_RESOLVED_PREFIX)) {
                    return true; // keep all other diagnostics
                }

                // Extract the clean path from the diagnostic message
                // Message format: "File 'some/path.bbj' could not be resolved..."
                const pathMatch = diag.message.match(/^File '([^']+)'/);
                if (!pathMatch) {
                    return true; // keep if we can't parse
                }
                const cleanPath = pathMatch[1];

                // Build candidate URIs (same logic as checkUsedClassExists)
                const adjustedFileUris = [
                    UriUtils.resolvePath(UriUtils.dirname(document.uri), cleanPath)
                ].concat(
                    prefixes.map(prefixPath => URI.file(resolve(prefixPath, cleanPath)))
                );

                // Check if any BbjClass now exists at these URIs
                const nowResolved = this.indexManager.allElements(BbjClass.$type).some(bbjClass => {
                    return adjustedFileUris.some(adjustedFileUri =>
                        normalize(bbjClass.documentUri.fsPath).toLowerCase() === normalize(adjustedFileUri.fsPath).toLowerCase()
                    );
                });

                // If now resolved, remove the diagnostic (return false to filter out)
                return !nowResolved;
            });

            // If diagnostics changed, notify the editor
            if (document.diagnostics.length !== originalLength) {
                await this.notifyDocumentPhase(document, DocumentState.Validated, cancelToken);
            }
        }
    }
}

