/******************************************************************************
 * Copyright 2023 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

import { startLanguageServer } from 'langium/lsp';
import { NodeFileSystem } from 'langium/node';
import { createConnection, ProposedFeatures, CodeLensRefreshRequest } from 'vscode-languageserver/node';
import { DocumentState } from 'langium';
import { createBBjServices } from './bbj-module.js';
import { BBjWorkspaceManager } from './bbj-ws-manager.js';
import { logger, LogLevel } from './logger.js';
import { setSuppressCascading, setMaxErrors, setCompilerTrigger } from './bbj-document-validator.js';
import { setParameterHintMode } from './bbj-inlay-hint-provider.js';
import { initNotifications, notifyResolvedConfigPath, notifyConfigReloadRequired } from './bbj-notifications.js';
import { registerComposerRequests } from './composer-commands.js';
import { registerCompileRequest } from './compile-command.js';
import { registerResolvedConfigPathRequest } from './resolved-config-path-request.js';
import { registerSetOptsInCodeRequests } from './setopts-in-code-request.js';
import { createConfigWatcher } from './config-watcher.js';
import { BBjDocumentBuilder } from './bbj-document-builder.js';
import { registerBoundedCodeActionHandler } from './bbj-code-action-handler.js';
import { registerComposerCodeLensHandler } from './composer-codelens-handler.js';
import { registerConfigAwareHoverHandler } from './bbj-hover-handler.js';
import { JavaClassReloadServices, reloadClasspathAndRecheckDocuments } from './java-class-reload.js';

// Create a connection to the client
const connection = createConnection(ProposedFeatures.all);

// Wire the notification module with the LSP connection (before any notifications can fire)
initNotifications(connection);

// Expose the visual-composer domain logic (#426/#430) as bbj/composer/* requests so both the
// VS Code and IntelliJ clients drive one implementation (#433).
registerComposerRequests(connection);

// Inject the shared services and language-specific services
const { shared, BBj } = createBBjServices({ connection, ...NodeFileSystem });

connection.onRequest('bbj/refreshJavaClasses', async () => {
    try {
        await reloadJavaClassesAndRevalidate();
        return true;
    } catch (error) {
        console.error('Failed to refresh Java classes:', error);
        connection.window.showErrorMessage(`Failed to refresh Java classes: ${error}`);
        return false;
    }
});

// A real, options-aware bbjcpl compile that both IDEs can reach through the shared
// language server, with no bbjcpl invocation logic duplicated on the IntelliJ side (#571).
registerCompileRequest(connection, {
    cplService: BBj.compiler.BBjCPLService,
    wsManager: shared.workspace.WorkspaceManager as BBjWorkspaceManager,
});

// The one shared answer to "which file is the BBj config file" (#485), exposed on-demand
// alongside the pushed notification registered below.
registerResolvedConfigPathRequest(connection, {
    wsManager: shared.workspace.WorkspaceManager as BBjWorkspaceManager,
});

// SETOPTS-in-code decode/compose (#475, DISC-06): unlike registerComposerRequests above, this
// family needs document-aware context (LangiumDocuments) and so cannot join composerHandlers —
// that registration runs BEFORE createBBjServices exists and its handlers receive only plain
// JSON with no document access. Registered here, after the services exist.
registerSetOptsInCodeRequests(connection, {
    documents: shared.workspace.LangiumDocuments,
});

// The bbj/configReloadRequired watcher (#486). Creating the instance arms nothing by itself —
// arming happens only at the workspaceInitialized call site below, and re-arming happens only
// at the two setConfigPath call sites; no third call site is permitted.
const configWatcher = createConfigWatcher({
    hasPendingWork: () => (shared.workspace.DocumentBuilder as BBjDocumentBuilder).hasPendingWork(),
    notify: notifyConfigReloadRequired,
});

// Start the language server with the shared services
startLanguageServer(shared);

// Register AFTER startLanguageServer to override Langium's default codeAction handler
// deliberately: IntelliJ evaluates every registered intention (including LSP4IJ's all-language
// LSPIntentionAction0..19, which waits on our textDocument/codeAction reply with no timeout of
// its own) inside one modal, EDT-blocking "Searching for Context Actions..." dialog. A server
// that can hold that request open indefinitely can freeze the editor's UI thread through a client
// that is behaving reasonably, so this handler answers within a named budget and gates on the
// same document state hover uses, rather than Langium's later default. See
// bbj-code-action-handler.ts for the full rationale.
registerBoundedCodeActionHandler(connection, shared, BBj);

// Register AFTER startLanguageServer to override Langium's default codeLens handler
// deliberately: the composer cue (#650) needs only text and CST, so waiting on Langium's default
// IndexedReferences gate would delay every cue by the cold linking time, and the default handler
// loads a client-supplied uri from disk via getOrCreateDocument. This handler answers within a
// named budget, gated at DocumentState.Parsed, resolving documents in-memory only. See
// composer-codelens-handler.ts for the full rationale.
registerComposerCodeLensHandler(connection, shared, BBj);

// Register AFTER startLanguageServer to override Langium's default hover handler deliberately: a
// config document (#650) is never built, and Langium's default hover handler's own
// `WorkspaceManager.ready` wait (ahead of the document-state check) held that fact behind the full
// cold workspace-initialization time rather than failing fast, the same DoS-shaped hang the
// codeAction/codeLens overrides above already close. This handler answers a config document's
// hover instantly and delegates every other document unchanged. See bbj-hover-handler.ts.
registerConfigAwareHoverHandler(connection, shared);

// Ask the client to re-request inlay hints, e.g. after Java classes (and the Javadoc-based
// parameter names) arrived asynchronously. Clients without refresh support just ignore us.
function refreshInlayHints() {
    connection.languages.inlayHint.refresh().catch(() => { /* client does not support refresh */ });
}

// Ask the client to re-request code lenses once the first build completes, so a composer-cue
// request answered null during a cold start is re-issued by clients that support refresh.
function refreshCodeLenses() {
    connection.sendRequest(CodeLensRefreshRequest.type).catch(() => { /* client does not support refresh */ });
}

// The narrow service slice java-class-reload.ts's shared helper needs, built once from the
// services created above. Reused by both the explicit refresh path below and the interop
// recovery path.
const javaClassReloadServices: JavaClassReloadServices = {
    javaInterop: BBj.java.JavaInteropService,
    workspaceManager: shared.workspace.WorkspaceManager as BBjWorkspaceManager,
    langiumDocuments: shared.workspace.LangiumDocuments,
    documentBuilder: shared.workspace.DocumentBuilder
};

// Clears the Java classpath cache, reloads it from the current workspace settings, reloads
// implicit imports, and re-validates every open document by resetting its build state — the
// shared reload sequence used by both the explicit bbj/refreshJavaClasses request handler and an
// onDidChangeConfiguration settings change that affects the classpath.
async function reloadJavaClassesAndRevalidate(): Promise<void> {
    const javaInterop = BBj.java.JavaInteropService;

    // Step 1: Clear all cached Java class data (includes disconnecting)
    javaInterop.clearCache();

    // Steps 2-4: reload classpath, reload implicit imports, re-check open documents once.
    await reloadClasspathAndRecheckDocuments(javaClassReloadServices);
    refreshInlayHints();

    // Step 5: Send notification
    connection.window.showInformationMessage('Java classes refreshed');
}

// Guard: skip Java class reload until initial workspace build is complete
let workspaceInitialized = false;
// Set when an interop recovery is reported before the first workspace build completes, so the
// deferred re-check can run exactly once, right after that build, instead of being lost.
let javaRecoveryPending = false;

// Re-checks open documents after the interop breaker reports recovery, without clearCache() and
// without a popup — the classpath and implicit imports reload first, since a reconnected peer is
// a fresh backend instance with no memory of the custom classpath.
async function recheckAfterInteropRecovery(): Promise<void> {
    try {
        await reloadClasspathAndRecheckDocuments(javaClassReloadServices);
        refreshInlayHints();
    } catch (error) {
        console.error('Failed to re-check documents after the Java interop service recovered:', error);
    }
}

BBj.java.JavaInteropService.onConnectionRecovered(() => {
    if (!workspaceInitialized) {
        javaRecoveryPending = true;
        return;
    }
    return recheckAfterInteropRecovery();
});

shared.workspace.DocumentBuilder.onBuildPhase(DocumentState.Validated, () => {
    if (!workspaceInitialized) {
        workspaceInitialized = true;
        refreshInlayHints();
        refreshCodeLenses();
        const wsManager = shared.workspace.WorkspaceManager as BBjWorkspaceManager;
        notifyResolvedConfigPath(wsManager.getResolvedConfigPath());
        // Armed exactly once, here, after the first Validated build phase.
        configWatcher.start(wsManager.getResolvedConfigPath(), wsManager.getConsumedConfigSnapshot());
        if (javaRecoveryPending) {
            javaRecoveryPending = false;
            void recheckAfterInteropRecovery();
        }
    }
});

// Register AFTER startLanguageServer to override Langium's default handler
connection.onDidChangeConfiguration(async (change) => {
    // Forward to Langium's ConfigurationProvider so its internals stay in sync
    shared.workspace.ConfigurationProvider.updateConfiguration(change);

    // Get BBj settings: try push model first, fall back to pull model
    let config = change.settings?.bbj;
    if (!config) {
        try {
            config = await connection.workspace.getConfiguration('bbj');
        } catch {
            return;
        }
    }
    if (!config) {
        return;
    }

    // Apply debug setting to logger immediately (no startup gate)
    if (config.debug !== undefined) {
        const newLevel = config.debug === true ? LogLevel.DEBUG : LogLevel.WARN;
        logger.setLevel(newLevel);
    }

    // Apply diagnostic suppression settings (no startup gate — apply immediately)
    if (config.diagnostics?.suppressCascading !== undefined) {
        setSuppressCascading(config.diagnostics.suppressCascading);
    }
    if (config.diagnostics?.maxErrors !== undefined) {
        setMaxErrors(config.diagnostics.maxErrors);
    }

    // Apply compiler trigger setting (no startup gate — apply immediately)
    if (config.compiler?.trigger !== undefined) {
        const trigger = config.compiler.trigger;
        if (trigger === 'debounced' || trigger === 'on-save' || trigger === 'off') {
            setCompilerTrigger(trigger);
        }
    }

    // Forward VS Code's full bbj.compiler.* option set to bbj/compile's config source. Merged
    // (never replaced), so this can never erase an IntelliJ-seeded compilerOutputDirectory
    // (#571 — this branch is currently VS Code-only; IntelliJ never delivers config.compiler).
    if (config.compiler !== undefined) {
        (shared.workspace.WorkspaceManager as BBjWorkspaceManager).setCompilerConfig(config.compiler);
    }

    // Apply inlay hint mode (no startup gate — apply immediately) and repaint open editors
    if (config.inlayHints?.parameterNames?.enabled !== undefined) {
        setParameterHintMode(config.inlayHints.parameterNames.enabled);
        refreshInlayHints();
    }

    // Skip Java class reload during initial startup — initializeWorkspace handles it
    if (!workspaceInitialized) {
        // Still apply non-reload settings
        const wsManager = shared.workspace.WorkspaceManager as BBjWorkspaceManager;
        wsManager.setConfigPath(config.configPath || '');
        // A host may query bbj/resolvedConfigPath even before the workspace build gate opens,
        // so the re-resolved value must be pushed here too, not only after initialization.
        notifyResolvedConfigPath(wsManager.getResolvedConfigPath());
        // Re-arm the watcher on the newly-resolved path. Symmetrical with the post-init site
        // below, even though the watcher has not started yet and this call is a no-op.
        configWatcher.updateResolvedPath(wsManager.getResolvedConfigPath());
        return;
    }

    try {
        const javaInterop = BBj.java.JavaInteropService;
        const wsManager = shared.workspace.WorkspaceManager as BBjWorkspaceManager;

        const newInteropHost = config.interop?.host || 'localhost';
        const newInteropPort = config.interop?.port || 5008;

        // Update configPath in wsManager for PREFIX resolution, then re-push the resolved
        // value so hosts' warm caches self-correct without a second request (no PREFIX/USE
        // reload here — that belongs to a later reload path).
        wsManager.setConfigPath(config.configPath || '');
        notifyResolvedConfigPath(wsManager.getResolvedConfigPath());
        // Re-arm the watcher on the newly-resolved path.
        configWatcher.updateResolvedPath(wsManager.getResolvedConfigPath());

        logger.info('BBj settings changed, refreshing Java classes...');
        javaInterop.setConnectionConfig(newInteropHost, newInteropPort);

        await reloadJavaClassesAndRevalidate();
    } catch (error) {
        console.error('Failed to refresh Java classes after settings change:', error);
    }
});
