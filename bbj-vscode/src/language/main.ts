/******************************************************************************
 * Copyright 2023 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

import { startLanguageServer } from 'langium/lsp';
import { NodeFileSystem } from 'langium/node';
import { createConnection, ProposedFeatures } from 'vscode-languageserver/node.js';
import { DocumentState } from 'langium';
import { createBBjServices } from './bbj-module.js';
import { BBjWorkspaceManager } from './bbj-ws-manager.js';
import { logger, LogLevel } from './logger.js';

// Create a connection to the client
const connection = createConnection(ProposedFeatures.all);

// Inject the shared services and language-specific services
const { shared, BBj } = createBBjServices({ connection, ...NodeFileSystem });

connection.onRequest('bbj/refreshJavaClasses', async () => {
    try {
        const javaInterop = BBj.java.JavaInteropService;

        // Step 1: Clear all cached Java class data (includes disconnecting)
        javaInterop.clearCache();

        // Step 2: Reload classpath from workspace settings
        const wsManager = shared.workspace.WorkspaceManager as BBjWorkspaceManager;
        const settings = wsManager.getSettings();
        if (settings && settings.classpath.length > 0) {
            await javaInterop.loadClasspath(settings.classpath);
        }

        // Step 3: Reload implicit imports
        await javaInterop.loadImplicitImports();

        // Step 4: Re-validate all open documents by resetting their state
        const documents = shared.workspace.LangiumDocuments.all.toArray();
        for (const doc of documents) {
            if (doc.uri.scheme === 'file') {
                doc.state = DocumentState.Parsed;
            }
        }
        const docUris = documents
            .filter(doc => doc.uri.scheme === 'file')
            .map(doc => doc.uri);
        if (docUris.length > 0) {
            await shared.workspace.DocumentBuilder.update(docUris, []);
        }

        // Step 5: Send notification
        connection.window.showInformationMessage('Java classes refreshed');

        return true;
    } catch (error) {
        console.error('Failed to refresh Java classes:', error);
        connection.window.showErrorMessage(`Failed to refresh Java classes: ${error}`);
        return false;
    }
});

// Start the language server with the shared services
startLanguageServer(shared);

// Track pending debug setting received before workspace init
let pendingDebugLevel: LogLevel = LogLevel.WARN; // Default when debug=false

// Guard: skip Java class reload until initial workspace build is complete
let workspaceInitialized = false;
shared.workspace.DocumentBuilder.onBuildPhase(DocumentState.Validated, () => {
    if (!workspaceInitialized) {
        workspaceInitialized = true;
        // Quiet startup complete: apply user's debug preference
        logger.setLevel(pendingDebugLevel);
    }
});

// Register AFTER startLanguageServer to override Langium's default handler
connection.onDidChangeConfiguration(async (change) => {
    // Forward to Langium's ConfigurationProvider so its internals stay in sync
    shared.workspace.ConfigurationProvider.updateConfiguration(change);

    // Only process BBj-specific setting changes
    const config = change.settings?.bbj;
    if (!config) {
        return;
    }

    // Apply debug setting to logger
    if (config.debug !== undefined) {
        const newLevel = config.debug === true ? LogLevel.DEBUG : LogLevel.WARN;
        if (workspaceInitialized) {
            // Post-startup: apply immediately
            logger.setLevel(newLevel);
        } else {
            // Pre-startup: store for deferred application (quiet startup mode)
            pendingDebugLevel = newLevel;
        }
    }

    // Skip Java class reload during initial startup — initializeWorkspace handles it
    if (!workspaceInitialized) {
        // Still apply non-reload settings
        const wsManager = shared.workspace.WorkspaceManager as BBjWorkspaceManager;
        wsManager.setConfigPath(config.configPath || '');
        return;
    }

    try {
        const javaInterop = BBj.java.JavaInteropService;
        const wsManager = shared.workspace.WorkspaceManager as BBjWorkspaceManager;

        const newInteropHost = config.interop?.host || 'localhost';
        const newInteropPort = config.interop?.port || 5008;

        // Update configPath in wsManager for PREFIX resolution
        wsManager.setConfigPath(config.configPath || '');

        logger.info('BBj settings changed, refreshing Java classes...');
        javaInterop.setConnectionConfig(newInteropHost, newInteropPort);

        // Clear all cached Java class data (includes disconnecting)
        javaInterop.clearCache();

        // Reload classpath from current workspace settings
        const settings = wsManager.getSettings();
        if (settings && settings.classpath.length > 0) {
            await javaInterop.loadClasspath(settings.classpath);
        }
        await javaInterop.loadImplicitImports();

        // Re-validate all open documents
        const documents = shared.workspace.LangiumDocuments.all.toArray();
        for (const doc of documents) {
            if (doc.uri.scheme === 'file') {
                doc.state = DocumentState.Parsed;
            }
        }
        const docUris = documents
            .filter(doc => doc.uri.scheme === 'file')
            .map(doc => doc.uri);
        if (docUris.length > 0) {
            await shared.workspace.DocumentBuilder.update(docUris, []);
        }

        connection.window.showInformationMessage('Java classes refreshed');
    } catch (error) {
        console.error('Failed to refresh Java classes after settings change:', error);
    }
});
