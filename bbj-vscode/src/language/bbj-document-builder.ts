import { AstNode, BuildOptions, DefaultDocumentBuilder, DocumentState, FileSystemProvider, LangiumDocument, LangiumSharedCoreServices, WorkspaceManager, interruptAndCheck, AstUtils, UriUtils } from "langium";
import { CancellationToken } from "vscode-jsonrpc";
import { URI } from 'vscode-uri';
import { BBjWorkspaceManager } from "./bbj-ws-manager.js";
import { Use, isUse, BbjClass } from "./generated/ast.js";
import { JavaSyntheticDocUri } from "./java-interop.js";
import { BBjPathPattern } from "./bbj-scope.js";
import { normalize, resolve, join } from "path";
import { accessSync } from "fs";
import { logger } from './logger.js';
import { USE_FILE_NOT_RESOLVED_PREFIX } from './bbj-validator.js';
import { mergeDiagnostics, getCompilerTrigger } from './bbj-document-validator.js';
import { notifyBbjcplAvailability } from './bbj-notifications.js';
import type { BBjServices } from './bbj-module.js';

export class BBjDocumentBuilder extends DefaultDocumentBuilder {

    wsManager: () => WorkspaceManager;
    override fileSystemProvider: FileSystemProvider;
    private importDepth = 0;
    private static readonly MAX_IMPORT_DEPTH = 10;
    private isImportingBBjDocuments = false;

    /** Per-file debounce timers for BBjCPL compilation. */
    private readonly cplDebounceTimers = new Map<string, ReturnType<typeof setTimeout>>();

    /** Trailing-edge debounce interval for saves (ms). */
    private static readonly SAVE_DEBOUNCE_MS = 500;

    /** Tracks whether BBjCPL is available (lazily detected on first trigger). */
    private bbjcplAvailable: boolean | undefined = undefined;

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
        if (_document.uri.scheme === 'bbjlib') {
            // never validate synthetic bbjlib files (functions.bbl, variables.bbl, etc.)
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
            // BBjCPL integration: compile validated documents based on trigger mode.
            // IMPORTANT: Called here inside buildDocuments(), NOT from onBuildPhase —
            // onBuildPhase triggers a CPU rebuild loop (see STATE.md).
            await this.runBbjcplForDocuments(documents, cancelToken);

            await this.addImportedBBjDocuments(documents, options, cancelToken);
            // After external PREFIX-resolved documents are loaded and indexed,
            // remove false-positive "could not be resolved" diagnostics for paths
            // that are now in the index. This fixes the timing issue where validation
            // runs before addImportedBBjDocuments loads external files.
            await this.revalidateUseFilePathDiagnostics(documents, cancelToken);
        }
    }

    /**
     * Run BBjCPL compilation for each validated document based on trigger mode.
     * Called from buildDocuments() after Langium validation completes.
     *
     * IMPORTANT: This runs INSIDE buildDocuments(), not from onBuildPhase —
     * calling from onBuildPhase causes CPU rebuild loops (see STATE.md).
     */
    private async runBbjcplForDocuments(
        documents: LangiumDocument<AstNode>[],
        cancelToken: CancellationToken
    ): Promise<void> {
        const trigger = getCompilerTrigger();

        if (trigger === 'off') {
            // Clear stale BBjCPL diagnostics for all eligible documents
            for (const document of documents) {
                if (!this.shouldCompileWithBbjcpl(document)) continue;
                const hadBbjcpl = document.diagnostics?.some(d => d.source === 'BBjCPL');
                if (hadBbjcpl) {
                    document.diagnostics = (document.diagnostics ?? []).filter(
                        d => d.source !== 'BBjCPL'
                    );
                    await this.notifyDocumentPhase(document, DocumentState.Validated, cancelToken);
                }
            }
            return;
        }

        // Lazy availability check on first trigger (per CONTEXT.md)
        this.trackBbjcplAvailability();
        if (this.bbjcplAvailable === false) return;

        for (const document of documents) {
            if (!this.shouldCompileWithBbjcpl(document)) continue;
            this.debouncedCompile(document);
        }
    }

    /**
     * Determine whether a document should be compiled with BBjCPL.
     * Only compile real .bbj files — skip synthetic, external, and non-file documents.
     */
    private shouldCompileWithBbjcpl(document: LangiumDocument): boolean {
        // Must be a real file path (not bbjlib:// or other virtual schemes)
        if (document.uri.scheme !== 'file') return false;
        // Skip the Java synthetic classpath document
        if (document.uri.toString() === JavaSyntheticDocUri) return false;
        // Skip external PREFIX-resolved documents
        if (this.wsManager() instanceof BBjWorkspaceManager) {
            if ((this.wsManager() as BBjWorkspaceManager).isExternalDocument(document.uri)) {
                return false;
            }
        }
        return true;
    }

    /**
     * Schedule a BBjCPL compilation with trailing-edge debounce.
     * On rapid saves, only the last save triggers compilation after
     * a 500ms quiet period. This prevents CPU spike and diagnostic flicker.
     *
     * Clear-then-show: old BBjCPL diagnostics are cleared when compile starts,
     * new ones appear when done.
     */
    private debouncedCompile(document: LangiumDocument): void {
        const key = document.uri.fsPath;
        const existing = this.cplDebounceTimers.get(key);
        if (existing) clearTimeout(existing);

        const timer = setTimeout(async () => {
            this.cplDebounceTimers.delete(key);

            // Clear-then-show: remove old BBjCPL diagnostics before compile
            document.diagnostics = (document.diagnostics ?? []).filter(
                d => d.source !== 'BBjCPL'
            );

            // Resolve BBjCPLService lazily via serviceRegistry
            // (BBjDocumentBuilder is a shared service; BBjCPLService is a language service)
            const langServices = this.serviceRegistry.getServices(document.uri) as BBjServices;
            const cplService = langServices.compiler.BBjCPLService;

            const cplDiags = await cplService.compile(key);

            if (cplDiags.length > 0) {
                // Merge BBjCPL diagnostics with current Langium diagnostics
                document.diagnostics = mergeDiagnostics(
                    document.diagnostics ?? [],
                    cplDiags
                );
            }

            // Re-notify client with updated merged diagnostics.
            // Use CancellationToken.None — the original build's token may be stale
            // after the 500ms debounce. BBjCPLService handles its own timeout internally.
            await this.notifyDocumentPhase(document, DocumentState.Validated, CancellationToken.None);
        }, BBjDocumentBuilder.SAVE_DEBOUNCE_MS);

        this.cplDebounceTimers.set(key, timer);
    }

    /**
     * Lazily detect BBjCPL availability on first compile trigger.
     * Checks whether the bbjcpl binary exists at the configured BBj home.
     * Sends a bbj/bbjcplAvailability notification to the client on first detection.
     *
     * Called once — subsequent calls are no-ops (bbjcplAvailable is already set).
     */
    private trackBbjcplAvailability(): void {
        if (this.bbjcplAvailable !== undefined) return;

        const wsManager = this.wsManager();
        if (!(wsManager instanceof BBjWorkspaceManager)) return;

        const bbjHome = wsManager.getBBjDir();
        if (!bbjHome) {
            this.bbjcplAvailable = false;
            notifyBbjcplAvailability(false);
            return;
        }

        const binaryName = process.platform === 'win32' ? 'bbjcpl.exe' : 'bbjcpl';
        const bbjcplPath = join(bbjHome, 'bin', binaryName);
        try {
            accessSync(bbjcplPath);
            this.bbjcplAvailable = true;
            notifyBbjcplAvailability(true);
        } catch {
            this.bbjcplAvailable = false;
            notifyBbjcplAvailability(false);
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
