import { AstNode, AstNodeDescription, BuildOptions, DefaultDocumentBuilder, DocumentState, FileSystemProvider, LangiumDocument, LangiumSharedCoreServices, WorkspaceManager, interruptAndCheck, AstUtils, UriUtils } from "langium";
import type { ServiceRegistry, TextDocumentProvider } from "langium";
import type { LangiumSharedServices } from "langium/lsp";
import { CancellationToken } from "vscode-jsonrpc";
import type { Connection, Diagnostic, Event, TextDocumentChangeEvent } from 'vscode-languageserver';
import type { TextDocument } from 'vscode-languageserver-textdocument';
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
    clearAllVerdictStates,
    clearVerdictState,
    composeWithVerdict,
    getVerdictState,
    recallLangiumSnapshot,
    rememberLangiumDiagnostics,
    setVerdictState,
    type LangiumDiagnosticsSnapshot,
    type VerdictState
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

/**
 * The shape of a `TextDocuments` provider that also exposes the open/change events -- every
 * real LSP shared-services instance (`NormalizedTextDocuments`), but not the hand-built
 * `{ get }`-only test doubles several harnesses construct `BBjDocumentBuilder` with.
 */
type TextDocumentEventsProvider = TextDocumentProvider & {
    readonly onDidOpen: Event<TextDocumentChangeEvent<TextDocument>>;
    readonly onDidChangeContent: Event<TextDocumentChangeEvent<TextDocument>>;
};

/**
 * True only when `provider` exposes both `onDidOpen` and `onDidChangeContent` as functions --
 * the shape the live-parse event listener needs. The core `TextDocumentProvider` type has only
 * `get`, and several test harnesses construct `BBjDocumentBuilder` with such a `{ get }`-only
 * stub; this guard lets the constructor skip the event subscription for those instead of
 * throwing on a missing method.
 */
export function hasTextDocumentEvents(
    provider: TextDocumentProvider | undefined
): provider is TextDocumentEventsProvider {
    const candidate = provider as Partial<TextDocumentEventsProvider> | undefined;
    return typeof candidate?.onDidOpen === 'function' && typeof candidate?.onDidChangeContent === 'function';
}

/**
 * Drops every diagnostic sourced from the save-time compiler (`'BBjCPL'`) or the live parser
 * ({@link BBJ_PARSER_SOURCE}) from `diagnostics` -- the same pair `debouncedCompile()`'s
 * compute-first cycle strips before a fresh cycle's result replaces them, computed without
 * writing the stripped list back to `document.diagnostics` first.
 */
export function withoutCompilerDiagnostics(diagnostics: Diagnostic[]): Diagnostic[] {
    return diagnostics.filter(d => d.source !== 'BBjCPL' && d.source !== BBJ_PARSER_SOURCE);
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

    /**
     * Lazy lookup for the shared LSP connection -- resolved on every call, never cached at
     * construction, since a hand-built test harness may construct `BBjDocumentBuilder` before an
     * LSP connection exists, and the real one is only ever wired up once, at server startup, by
     * `startLanguageServer()`. `undefined` when running without an LSP connection (every
     * non-LSP test harness in this repository) -- `sendDiagnosticsToClient` becomes a no-op then.
     */
    private readonly lspConnection: () => Connection | undefined;

    /**
     * Uris with a pending "arm once the workspace reports ready" entry -- at most one per uri,
     * so five events for the same not-yet-loaded document before `ready` resolves still chain
     * onto {@link WorkspaceManager.ready} only once. See {@link armWhenWorkspaceReady}.
     */
    private readonly pendingReadyUris = new Set<string>();

    constructor(services: LangiumSharedCoreServices) {
        super(services);
        this.wsManager = () => services.workspace.WorkspaceManager;
        this.fileSystemProvider = services.workspace.FileSystemProvider
        // Resolved lazily on every call (see the field's own doc comment), never at construction.
        this.lspConnection = () => (services as Partial<LangiumSharedServices>).lsp?.Connection;

        // Arm the live-parse cycle directly from the text-document events Langium's own
        // DefaultDocumentUpdateHandler listens on -- independent of services.workspace.WorkspaceLock,
        // so a change while the initial workspace build still holds that lock still reaches BBj's
        // parser. Additive: the rebuild-driven trigger (buildDocuments -> runBbjcplForDocuments ->
        // debouncedCompile) is untouched and keeps arming the very same cplDebounceTimers entry.
        // Langium's text-document store fires onDidOpen immediately followed by
        // onDidChangeContent for the same open, so both listeners resetting the same debounce
        // timer on an open is harmless -- the second reset just replaces the first.
        const textDocuments = services.workspace.TextDocuments;
        if (hasTextDocumentEvents(textDocuments)) {
            textDocuments.onDidOpen(event => this.armLiveParseFromEvent(event.document));
            textDocuments.onDidChangeContent(event => this.armLiveParseFromEvent(event.document));
        }
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
            // No cycle can run while the trigger is off, so no document may keep a verdict.
            clearAllVerdictStates();
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
     * Entry point for the constructor's `onDidOpen`/`onDidChangeContent` listeners. The whole
     * body is wrapped so a throw here never propagates into the shared text-document emitter
     * Langium's own update handler listens on too -- an event listener that throws would break
     * every OTHER listener registered on the same emitter, not just this one. Logs only the uri
     * and the error's own message, never document text.
     */
    private armLiveParseFromEvent(textDocument: TextDocument): void {
        try {
            if (getCompilerTrigger() === 'off') return;
            const uri = URI.parse(textDocument.uri);
            const document = this.langiumDocuments.getDocument(uri);
            if (!document) {
                // No LangiumDocument yet for this uri -- the workspace hasn't loaded it. Re-arm
                // once the workspace manager reports ready, since that resolves before the
                // startup build runs, never through services.workspace.WorkspaceLock.
                this.armWhenWorkspaceReady(uri);
                return;
            }
            this.armLiveParseForDocument(document, textDocument);
        } catch (e) {
            logger.error(`Live-parse event listener failed for ${textDocument.uri}: ${e instanceof Error ? e.message : String(e)}`);
        }
    }

    /**
     * Remembers `uri` and re-checks it once {@link WorkspaceManager.ready} resolves -- the
     * startup file scan has finished by then, but not the workspace's own build, so a document
     * this returns for may still be sitting at `Parsed`. At most one pending entry per uri (see
     * {@link pendingReadyUris}), so a burst of events for the same not-yet-loaded uri chains onto
     * `ready` only once. When `ready` resolves, the trigger is re-checked (a config change while
     * waiting may have turned it off), the document and its now-current live `TextDocument` are
     * looked up again, and the cycle is armed only when both exist. A rejected `ready` (this
     * repository never rejects it, but a hand-built test double could) is caught and logged, never
     * left as an unhandled rejection.
     */
    private armWhenWorkspaceReady(uri: URI): void {
        const key = uri.toString();
        if (this.pendingReadyUris.has(key)) return;
        this.pendingReadyUris.add(key);
        this.wsManager().ready
            .then(() => {
                this.pendingReadyUris.delete(key);
                if (getCompilerTrigger() === 'off') return;
                const document = this.langiumDocuments.getDocument(uri);
                const liveTextDocument = this.textDocuments?.get(uri);
                if (document && liveTextDocument) {
                    this.armLiveParseForDocument(document, liveTextDocument);
                }
            })
            .catch(e => {
                logger.error(`Live-parse ready deferral failed for ${key}: ${e instanceof Error ? e.message : String(e)}`);
            });
    }

    /**
     * Applies {@link isBuildableDocumentUri} first -- the same gate `update()` applies to the
     * rebuild-driven trigger, so a `bbx-config` document (or a uri with no registered services)
     * is never live-parsed either, however it reaches this method: directly from an event
     * (`armLiveParseFromEvent`) or deferred until the workspace is ready (`armWhenWorkspaceReady`),
     * both of which funnel through here rather than through `update()` itself. Then applies the
     * same gates {@link runBbjcplForDocuments} applies to the rebuild-driven trigger (open in an
     * editor, `file:` scheme, not synthetic, not external, bbjcpl found), binds the event's live
     * text onto `document` (research Pitfall 1), then arms the existing debounce cycle -- the same
     * {@link cplDebounceTimers} entry the rebuild path uses, so an event followed by a rebuild
     * inside the debounce window produces exactly one cycle.
     */
    private armLiveParseForDocument(document: LangiumDocument, textDocument: TextDocument): void {
        if (!isBuildableDocumentUri(document.uri, this.textDocuments, this.serviceRegistry)) return;
        if (!this.shouldCompileWithBbjcpl(document)) return;
        this.trackBbjcplAvailability();
        if (this.bbjcplAvailable === false) return;
        this.bindLiveTextDocument(document, textDocument);
        this.debouncedCompile(document);
    }

    /**
     * Binds the event's live, possibly unsaved `TextDocument` onto `document` without
     * re-parsing -- the exact property shape `DefaultLangiumDocumentFactory.update()` uses, so a
     * later real build rebinds it again without error. A never-built document's own
     * `textDocument` getter lazily snapshots the on-disk text the first time it is read and never
     * updates itself (research Pitfall 1); without this bind, the live parser would see that
     * stale snapshot instead of the edit that just fired this event. No re-parse here --
     * re-parsing outside the workspace lock would mutate the parse result a lock-held build may
     * still be reading.
     */
    private bindLiveTextDocument(document: LangiumDocument, textDocument: TextDocument): void {
        const descriptor = Object.getOwnPropertyDescriptor(document, 'textDocument');
        if (descriptor?.value === textDocument) return;
        try {
            Object.defineProperty(document, 'textDocument', { value: textDocument });
        } catch (e) {
            // The rebuild path still covers this document eventually; losing the live bind for
            // one cycle is not fatal.
            logger.debug(`Could not bind the live text document for ${document.uri.toString()}: ${e instanceof Error ? e.message : String(e)}`);
        }
    }

    /**
     * Clears a document's verdict state, if one exists, and reports whether one existed. No
     * longer writes `document.diagnostics` itself: the debounce cycle that calls this now
     * computes its one publish snapshot at the very end (see {@link publishCycleDiagnostics}), so
     * a write here would be an intermediate mutation the cycle's own snapshot immediately
     * supersedes anyway.
     *
     * When no verdict state exists for the document, this does nothing at all and returns
     * `false` — a document that never had a verdict is left byte-for-byte as it already was,
     * matching 0.16.x behaviour.
     */
    private forgetVerdict(document: LangiumDocument): boolean {
        if (getVerdictState(document.uri) === undefined) return false;
        clearVerdictState(document.uri);
        return true;
    }

    /**
     * The latest known Langium diagnostics for `document`, together with the text they were
     * validated against, every debounce cycle composes against instead of `document.diagnostics`
     * directly -- {@link recallLangiumSnapshot} when a Langium validation has remembered one, else
     * this cycle's own current list with the compiler-sourced diagnostics stripped (decision 5: a
     * document Langium has never validated this session has nothing more to offer than "whatever
     * Langium last published", empty for a never-validated document).
     */
    private latestLangiumBaseline(document: LangiumDocument): LangiumDiagnosticsSnapshot {
        return recallLangiumSnapshot(document)
            ?? { diagnostics: withoutCompilerDiagnostics(document.diagnostics ?? []) };
    }

    /**
     * Schedule a BBjCPL compilation with trailing-edge debounce.
     * On rapid saves, only the last save triggers compilation after
     * a 500ms quiet period. This prevents CPU spike and diagnostic flicker.
     *
     * Compute-first, publish-once: nothing is written to `document.diagnostics` until the cycle
     * has decided its whole result -- see {@link publishCycleDiagnostics}, the single write/publish
     * point every branch below ends at. This callback is also the target of a live-parse debounce
     * armed directly from a document change/open event (the constructor's `onDidChangeContent`
     * listener), which can run before this document has ever been through a Langium build, so it
     * must never assume a prior build already wrote `document.diagnostics` or remembered a
     * pre-hierarchy list.
     *
     * The live parser is asked first. A verdict for text unchanged since the request went out
     * reconciles Langium's own diagnostics against BBj's and the save-time compile does not run
     * this cycle — bbjcpl is the same BBj parser, run against the saved file instead of the live
     * text, so with a verdict already in hand it would only add duplicates or stale results.
     *
     * A verdict for text that has since moved on, or a request superseded by a newer one, does
     * nothing further this cycle: no reconciliation, no state change, no save-time compile, and no
     * publish at all — the edit that changed the text has already scheduled a newer cycle of its
     * own.
     *
     * Every other outcome (the latch/trigger already off, or the live parse failed or came back
     * unavailable) is gated on whether this cycle's own request is still for the document's
     * current text before it forgets a verdict, runs the save-time compile, or publishes anything
     * — a stale cycle here (superseded by a newer, independent debounce timer that started once
     * this one's own timer already fired — see {@link cplDebounceTimers}) must not discard or
     * overwrite a newer cycle's already-stored verdict or its already-published diagnostics. The
     * one exception is the connection-wide "endpoint just went unavailable" clear: that clear runs
     * regardless of this cycle's own staleness, because it is a one-time signal tied to the
     * request that discovered the flip, not to this cycle's text version — every document's
     * verdict is stale the moment the endpoint that produced it is gone, not only this one's.
     */
    private debouncedCompile(document: LangiumDocument): void {
        const key = document.uri.fsPath;
        const existing = this.cplDebounceTimers.get(key);
        if (existing) clearTimeout(existing);

        const timer = setTimeout(async () => {
            this.cplDebounceTimers.delete(key);

            try {
                // Resolve BBjCPLService/BBjParserService lazily via serviceRegistry
                // (BBjDocumentBuilder is a shared service; both are language services)
                const langServices = this.serviceRegistry.getServices(document.uri) as BBjServices;
                const cplService = langServices.compiler.BBjCPLService;
                const bbjParserService = langServices.compiler.BBjParserService;

                // Recorded before the request goes out: the document's live text document (and
                // therefore its version) may change while the request is in flight -- an edit
                // that changes it has already scheduled a newer cycle of its own, or (a
                // close-and-reopen) swapped the textDocument object outright.
                const textDocumentBeforeRequest = document.textDocument;
                const versionBeforeRequest = textDocumentBeforeRequest.version;
                let liveOutcome: LiveParseOutcome | undefined;
                if (bbjParserService.isEnabled()) {
                    liveOutcome = await bbjParserService.requestLiveParse(document);
                }
                const stillCurrent = document.textDocument === textDocumentBeforeRequest
                    && document.textDocument.version === versionBeforeRequest;

                let next: Diagnostic[];
                if (liveOutcome?.kind === 'verdict' && stillCurrent) {
                    // Compose against the latest known Langium snapshot (its pre-hierarchy list
                    // together with the text it was validated against), not document.diagnostics
                    // above: the hierarchy may already have hidden linking diagnostics or
                    // warnings because of a parse error the verdict is about to downgrade or
                    // replace, and those need the chance to reappear once it has.
                    //
                    // No remembered snapshot at all is no longer a "should not happen" case: an
                    // early cycle for a document the startup build hasn't validated yet (this
                    // phase's whole point) reaches this branch routinely with no snapshot at all
                    // -- latestLangiumBaseline's own fallback (this cycle's stripped current list)
                    // is exactly right for that case, not a signal of a decoupling bug between
                    // shouldValidate/shouldCompileWithBbjcpl.
                    //
                    // The Langium snapshot may still be validated against older text than this
                    // verdict -- composeWithVerdict itself picks the early-verdict reconciliation
                    // for that case, so a verdict that lands before Langium catches up still ends
                    // in one consistent list once Langium does.
                    const baseline = this.latestLangiumBaseline(document);
                    const record: VerdictState = {
                        seen: new Set<string>(),
                        version: versionBeforeRequest,
                        diagnostics: liveOutcome.diagnostics
                    };
                    const result = composeWithVerdict({
                        langiumDiagnostics: baseline.diagnostics,
                        validatedText: baseline.validatedText,
                        liveText: document.textDocument.getText(),
                        liveVersion: document.textDocument.version,
                        verdict: record
                    });
                    setVerdictState(document.uri, { ...record, seen: result.seen ?? new Set<string>() });
                    next = applyConfiguredDiagnosticHierarchy(result.diagnostics);
                } else if (liveOutcome?.kind === 'verdict' || liveOutcome?.kind === 'cancelled') {
                    // A verdict for text that has since moved on, or a request superseded by a
                    // newer one: nothing further this cycle — no reconciliation, no state change,
                    // no save-time compile, and (publishCycleDiagnostics never runs) no publish at
                    // all. The edit that changed the text has already scheduled a newer cycle of
                    // its own.
                    return;
                } else {
                    // failed, unavailable, or the latch/trigger already off (liveOutcome
                    // undefined): when this request is the one that just discovered the
                    // endpoint is gone, the on/off latch has flipped for the whole connection —
                    // no document may keep a verdict now, not only this one — so that clear
                    // always runs, even for a stale cycle: it is a one-time signal tied to the
                    // request that discovered the flip, not to this cycle's own text version,
                    // and skipping it here would leave other documents' verdicts trusting an
                    // endpoint that (per this very request) no longer exists.
                    if (liveOutcome?.kind === 'unavailable') {
                        clearAllVerdictStates();
                    }
                    if (!stillCurrent) {
                        // A newer cycle for the newer text is already in flight or has already
                        // finished, and may already have published its own verdict: no further
                        // state change for this document beyond the connection-wide clear above,
                        // no save-time compile, and no publish over whatever that newer cycle
                        // already produced.
                        return;
                    }
                    // Forget this document's verdict so a real Langium error is never left
                    // downgraded without one behind it, then fall back to the save-time compile
                    // exactly as before the live parser existed. Redundant with the clear above
                    // when this was also an 'unavailable' outcome, but harmless -- forgetVerdict
                    // is a no-op once the verdict is already gone.
                    this.forgetVerdict(document);
                    const cplDiags = await cplService.compile(key);
                    // Read after the compile await, not before: concurrent activity on this
                    // document (another cycle's publish, or a fresh Langium validation) may have
                    // changed the remembered Langium snapshot while this cycle waited on the
                    // save-time compile. With the verdict forgotten there is nothing left to
                    // reconcile, so the latest remembered Langium list with the hierarchy applied
                    // is the whole 0.16.x-shaped base bbjcpl merges onto.
                    const baseline = this.latestLangiumBaseline(document);
                    const base = applyConfiguredDiagnosticHierarchy(baseline.diagnostics);
                    next = cplDiags.length > 0 ? mergeDiagnostics(base, cplDiags) : base;
                }

                // A single publish covering whichever branch above ran -- see
                // publishCycleDiagnostics's own doc comment for why the state check there
                // matters. CancellationToken.None — the original build's token may be stale
                // after the 500ms debounce. Both compiler services handle their own timeout
                // internally.
                await this.publishCycleDiagnostics(document, next);
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
     * The single publish point every debounce cycle ends at. At or above the Validated state,
     * publishes exactly as before this phase: writes `document.diagnostics` and fires the
     * Validated document phase (the only path that runs `addDiagnosticsHandler`'s publish today).
     *
     * Below Validated -- an early cycle for a document the startup build hasn't reached yet --
     * neither is safe: `DefaultDocumentBuilder.validate()` appends onto an existing diagnostics
     * list rather than replacing it, so writing here would double up once the real build finally
     * validates; and firing the Validated phase would resolve every `waitUntil(Validated, uri)`
     * waiter for this uri (code actions, among others) against a document that was never actually
     * validated. Sends straight to the client instead.
     */
    private async publishCycleDiagnostics(document: LangiumDocument, diagnostics: Diagnostic[]): Promise<void> {
        if (document.state >= DocumentState.Validated) {
            document.diagnostics = diagnostics;
            await this.notifyDocumentPhase(document, DocumentState.Validated, CancellationToken.None);
        } else {
            this.sendDiagnosticsToClient(document.uri, diagnostics);
        }
    }

    /**
     * Sends `diagnostics` straight to the client over the LSP connection, bypassing
     * `notifyDocumentPhase`/`document.diagnostics` entirely -- see {@link publishCycleDiagnostics}.
     * A no-op when no LSP connection is available (every non-LSP test harness in this repository).
     */
    protected sendDiagnosticsToClient(uri: URI, diagnostics: Diagnostic[]): void {
        const connection = this.lspConnection();
        if (!connection) return;
        connection.sendDiagnostics({ uri: uri.toString(), diagnostics }).catch(e => {
            logger.error(`Failed to send early diagnostics for ${uri.toString()}: ${e instanceof Error ? e.message : String(e)}`);
        });
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

            // Lifted into a named predicate (not just applied inline to document.diagnostics
            // below) so the exact same resolvability decision can also be applied to the
            // remembered pre-hierarchy Langium diagnostics list — otherwise a USE diagnostic
            // this revalidation resolves and drops from document.diagnostics would reappear the
            // next time a verdict reconciles against that remembered list.
            const keep = (diag: Diagnostic): boolean => {
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
            };

            const originalLength = document.diagnostics.length;
            document.diagnostics = document.diagnostics.filter(keep);

            const snapshot = recallLangiumSnapshot(document);
            if (snapshot) {
                rememberLangiumDiagnostics(document, snapshot.diagnostics.filter(keep), snapshot.validatedText);
            }

            // If diagnostics changed, notify the editor
            if (document.diagnostics.length !== originalLength) {
                await this.notifyDocumentPhase(document, DocumentState.Validated, cancelToken);
            }
        }
    }
}
