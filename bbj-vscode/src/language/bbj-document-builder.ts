import { AstNode, AstNodeDescription, BuildOptions, DefaultDocumentBuilder, DocumentState, FileSystemProvider, LangiumDocument, LangiumSharedCoreServices, WorkspaceManager, interruptAndCheck, AstUtils, UriUtils } from "langium";
import type { ServiceRegistry, TextDocumentProvider } from "langium";
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
import { mergeDiagnostics, getCompilerTrigger, applyConfiguredDiagnosticHierarchy } from './bbj-document-validator.js';
import { BBJ_PARSER_SOURCE, type LiveParseOutcome } from './bbj-parser-service.js';
import {
    clearVerdictState,
    documentLineText,
    getVerdictState,
    reconcileWithVerdict,
    recallLangiumDiagnostics,
    setVerdictState
} from './bbj-diagnostic-reconciliation.js';
import { notifyBbjcplAvailability } from './bbj-notifications.js';
import { CONFIG_DOCUMENT_LANGUAGE_ID } from '../composer-lens-contract.js';
import type { BBjServices } from './bbj-module.js';

/**
 * False for a uri whose open text document carries the `bbx-config` language id — regardless of
 * its file extension, so a config file named `myconfig.bbj` is still excluded — and false for a
 * uri with no registered services at all (mirrors Langium's own `ServiceRegistry.getServices`
 * lookup, which checks the language-id map before falling back to file name/extension). True
 * otherwise. Exported so `BBjDocumentBuilder.update`'s filter is unit-testable without a live
 * document build.
 */
export function isBuildableDocumentUri(
    uri: URI,
    textDocuments: TextDocumentProvider | undefined,
    serviceRegistry: ServiceRegistry,
): boolean {
    if (textDocuments?.get(uri)?.languageId === CONFIG_DOCUMENT_LANGUAGE_ID) {
        return false;
    }
    return serviceRegistry.hasServices(uri);
}

export class BBjDocumentBuilder extends DefaultDocumentBuilder {

    wsManager: () => WorkspaceManager;
    override fileSystemProvider: FileSystemProvider;
    private importDepth = 0;
    private static readonly MAX_IMPORT_DEPTH = 10;
    private isImportingBBjDocuments = false;

    /**
     * Counts overridden `buildDocuments()` calls that are still running their
     * post-`super.buildDocuments()` tail (BBjCPL scheduling, transitive USE-import loading,
     * USE-diagnostic revalidation). Incremented at the top of `buildDocuments()` and
     * decremented in a `finally`, so re-entrant/nested calls are tracked correctly. Consulted
     * by {@link hasPendingWork} — see that method's doc comment for why this exists.
     */
    private postProcessingDepth = 0;

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

    /**
     * Filters `changed` through {@link isBuildableDocumentUri} before handing it to Langium's own
     * `update` (#650): a `bbx-config` document reaches this server only for its composer cue and
     * must never be parsed, linked, indexed, validated or diagnosed as BBj source, and a uri with
     * no registered services at all would otherwise throw during the parse phase. When the
     * filtered `changed` list and `deleted` are both empty, this returns without calling the base
     * method at all, so a config-only change never resets `currentState` or fires a build phase.
     */
    override async update(changed: URI[], deleted: URI[], cancelToken: CancellationToken = CancellationToken.None): Promise<void> {
        const buildableChanged = changed.filter(uri => isBuildableDocumentUri(uri, this.textDocuments, this.serviceRegistry));
        if (buildableChanged.length === 0 && deleted.length === 0) {
            return;
        }
        await super.update(buildableChanged, deleted, cancelToken);
    }

    /**
     * Whether a BBjCPL debounce timer is currently pending for any document — the second half
     * of the {@link hasPendingWork} quiescence predicate a config reload consults before it is
     * safe to push a restart request (#486).
     */
    public hasPendingCompile(): boolean {
        return this.cplDebounceTimers.size > 0;
    }

    /**
     * The quiescence predicate a config-reload watcher polls before pushing a restart
     * notification, so the restart is never emitted mid-validation (#486). True while any of
     * "the workspace is busy" holds:
     *
     *  - a Langium build is in flight or has never completed. `DefaultDocumentBuilder` resets
     *    `currentState` to `DocumentState.Changed` at the top of every `build`/`update` call and
     *    only advances it to `DocumentState.Validated` once the validation phase finishes, so
     *    `currentState < DocumentState.Validated` is exactly that condition; or
     *  - the overridden `buildDocuments()` below is still running its post-validation tail
     *    (BBjCPL scheduling, transitive USE-import loading via `addImportedBBjDocuments`, or
     *    USE-diagnostic revalidation) — `currentState` already reached `Validated` at that
     *    point, so without this half the predicate would report "not busy" while that tail is
     *    still actively loading/relinking/re-validating documents ({@link postProcessingDepth}); or
     *  - a BBjCPL debounce timer is pending ({@link hasPendingCompile}).
     */
    public hasPendingWork(): boolean {
        return this.currentState < DocumentState.Validated
            || this.postProcessingDepth > 0
            || this.hasPendingCompile();
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
        this.postProcessingDepth++;
        try {
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
        } finally {
            this.postProcessingDepth--;
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
            // Clear stale BBjCPL and live-parser diagnostics for all eligible documents.
            for (const document of documents) {
                if (!this.shouldCompileWithBbjcpl(document)) continue;
                const hadCompilerDiagnostics = document.diagnostics?.some(
                    d => d.source === 'BBjCPL' || d.source === BBJ_PARSER_SOURCE
                );
                if (hadCompilerDiagnostics) {
                    document.diagnostics = (document.diagnostics ?? []).filter(
                        d => d.source !== 'BBjCPL' && d.source !== BBJ_PARSER_SOURCE
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
     * Only compile real .bbj files that are open in an editor — skip synthetic,
     * external, and non-file documents.
     *
     * The open-editor gate mirrors when Langium itself validates (initial workspace
     * builds run without the validation option): without it, workspace initialization
     * spawns one bbjcpl process per .bbj file in the project.
     */
    private shouldCompileWithBbjcpl(document: LangiumDocument): boolean {
        // Must be open in an editor (LSP didOpen). Outside an LSP context
        // the inherited textDocuments is undefined and nothing is ever "open".
        if (!this.textDocuments?.get(document.uri)) return false;
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
     * Clear-then-show: old BBjCPL and live-parser diagnostics are cleared when the cycle
     * starts, new ones appear when it is done.
     *
     * The live parser is asked first. A verdict for text unchanged since the request went out
     * reconciles Langium's own diagnostics against BBj's and the save-time compile does not run
     * this cycle — bbjcpl is the same BBj parser, run against the saved file instead of the live
     * text, so with a verdict already in hand it would only add duplicates or stale results.
     *
     * A verdict for text that has since moved on, or a request superseded by a newer one, does
     * nothing further this cycle: no reconciliation, no state change, no save-time compile — the
     * edit that changed the text has already scheduled a newer cycle of its own.
     *
     * Every other outcome (the latch/trigger is off, or the live parse failed) forgets any
     * verdict this document had and falls back to the save-time compile exactly as before the
     * live parser existed, so a real Langium error is never left downgraded without a verdict
     * behind it.
     */
    /**
     * Clears a document's verdict state, if one exists, and restores the pre-hierarchy Langium
     * diagnostics list (with the hierarchy re-applied) as the document's diagnostics — undoing
     * whatever downgrade or replacement decision that state represented. Called at the start of
     * every outcome that falls back to the save-time compile (a failed cycle, an unavailable
     * endpoint, or the latch/trigger being off), so a real Langium error is never left downgraded
     * without a verdict behind it.
     *
     * When no verdict state exists for the document, this does nothing at all — a document that
     * never had a verdict is left byte-for-byte as it already was, matching 0.16.x behaviour.
     */
    private forgetVerdict(document: LangiumDocument): void {
        if (getVerdictState(document.uri) === undefined) return;
        clearVerdictState(document.uri);
        const remembered = recallLangiumDiagnostics(document);
        if (remembered) {
            document.diagnostics = applyConfiguredDiagnosticHierarchy(remembered);
        }
    }

    private debouncedCompile(document: LangiumDocument): void {
        const key = document.uri.fsPath;
        const existing = this.cplDebounceTimers.get(key);
        if (existing) clearTimeout(existing);

        const timer = setTimeout(async () => {
            this.cplDebounceTimers.delete(key);

            try {
                // Clear-then-show: remove old BBjCPL and live-parser diagnostics together,
                // before either the BBjCPL merge or the verdict reconciliation runs below.
                // mergeDiagnostics() matches a cplDiag against any existing diagnostic on the
                // same line whose source isn't 'BBjCPL' — if a stale live-parser diagnostic
                // from a previous debounce cycle were still present here, it would get silently
                // absorbed into a mislabeled 'BBjCPL' entry that keeps the old message text.
                document.diagnostics = (document.diagnostics ?? []).filter(
                    d => d.source !== 'BBjCPL' && d.source !== BBJ_PARSER_SOURCE
                );

                // Resolve BBjCPLService/BBjParserService lazily via serviceRegistry
                // (BBjDocumentBuilder is a shared service; both are language services)
                const langServices = this.serviceRegistry.getServices(document.uri) as BBjServices;
                const cplService = langServices.compiler.BBjCPLService;
                const bbjParserService = langServices.compiler.BBjParserService;

                // Recorded before the request goes out: the document's text — and therefore this
                // cycle's cancellation token — may change while the request is in flight, and an
                // edit that changes it has already scheduled a newer cycle of its own.
                const versionBeforeRequest = document.textDocument.version;
                let liveOutcome: LiveParseOutcome | undefined;
                if (bbjParserService.isEnabled()) {
                    liveOutcome = await bbjParserService.requestLiveParse(document);
                }

                if (liveOutcome?.kind === 'verdict' && document.textDocument.version === versionBeforeRequest) {
                    // Reconcile against the pre-hierarchy Langium list, not document.diagnostics
                    // above: the hierarchy may already have hidden linking diagnostics or
                    // warnings because of a parse error the verdict is about to downgrade or
                    // replace, and those need the chance to reappear once it has.
                    const langiumDiagnostics = recallLangiumDiagnostics(document) ?? document.diagnostics ?? [];
                    const { diagnostics, state } = reconcileWithVerdict(
                        langiumDiagnostics,
                        liveOutcome.diagnostics,
                        documentLineText(document.textDocument)
                    );
                    setVerdictState(document.uri, state);
                    document.diagnostics = applyConfiguredDiagnosticHierarchy(diagnostics);
                } else if (liveOutcome?.kind === 'verdict' || liveOutcome?.kind === 'cancelled') {
                    // A verdict for text that has since moved on, or a request superseded by a
                    // newer one: nothing further this cycle — no reconciliation, no state change,
                    // no save-time compile.
                } else {
                    // failed, unavailable, or the latch/trigger is off: forget any verdict first,
                    // so a real Langium error is never left downgraded without one behind it, then
                    // fall back to the save-time compile exactly as before the live parser existed.
                    this.forgetVerdict(document);
                    const cplDiags = await cplService.compile(key);
                    if (cplDiags.length > 0) {
                        // Merge BBjCPL diagnostics with current Langium diagnostics
                        document.diagnostics = mergeDiagnostics(
                            document.diagnostics ?? [],
                            cplDiags
                        );
                    }
                }

                // Re-notify client with the updated diagnostics — a single publish covering
                // whichever branch above ran.
                // Use CancellationToken.None — the original build's token may be stale
                // after the 500ms debounce. Both compiler services handle their own timeout internally.
                await this.notifyDocumentPhase(document, DocumentState.Validated, CancellationToken.None);
            } catch (e) {
                // The callback runs detached from setTimeout, with no rejection handler of
                // its own — an uncaught throw here would surface as an unhandled promise
                // rejection at the process level instead of being caught in-context
                // (P61-D2-017). Log and let the build continue.
                logger.error(`BBjCPL debounced compile failed for ${key}: ${e}`);
            }
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
                    // Skip binary/tokenized BBj files that can't be parsed.
                    // Routine/expected — log at debug so it doesn't surface as an
                    // error in the output channel for workspaces with tokenized files.
                    if (docFileData.text.startsWith('<<bbj>>')) {
                        logger.debug(`Skipping binary/tokenized file: ${docFileData.uri.fsPath}`);
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

        // Build the fsPath-to-BbjClass index ONCE per update instead of re-scanning
        // allElements() inside the per-diagnostic filter below — a full linear scan of
        // the entire workspace's BbjClass index, repeated once per unresolved-USE
        // diagnostic in this batch, previously ran on every incremental rebuild (P61-D3-005).
        const classesByPath = new Map<string, AstNodeDescription>();
        for (const bbjClass of this.indexManager.allElements(BbjClass.$type)) {
            classesByPath.set(normalize(bbjClass.documentUri.fsPath).toLowerCase(), bbjClass);
        }

        for (const document of documents) {
            if (bbjWsManager.isExternalDocument(document.uri)) continue;
            if (!document.diagnostics?.length) continue;

            const originalLength = document.diagnostics.length;
            document.diagnostics = document.diagnostics.filter(diag => {
                // LSP 3.18 widened Diagnostic.message to `string | MarkupContent`; our
                // diagnostics use plain string messages, so read the string form.
                const message = typeof diag.message === 'string' ? diag.message : diag.message.value;
                // Only re-check our specific USE file-path diagnostics
                if (!message.startsWith(USE_FILE_NOT_RESOLVED_PREFIX)) {
                    return true; // keep all other diagnostics
                }

                // Extract the clean path from the diagnostic message
                // Message format: "File 'some/path.bbj' could not be resolved..."
                const pathMatch = message.match(/^File '([^']+)'/);
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

                // Check if any BbjClass now exists at these URIs, via the Map built once
                // above rather than re-scanning allElements() for every diagnostic.
                const nowResolved = adjustedFileUris.some(adjustedFileUri =>
                    classesByPath.has(normalize(adjustedFileUri.fsPath).toLowerCase())
                );

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
