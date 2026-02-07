/******************************************************************************
 * Copyright 2023 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

import { startLanguageServer } from 'langium/lsp';
import { NodeFileSystem } from 'langium/node';
import { createConnection, ProposedFeatures, RequestType } from 'vscode-languageserver/node.js';
import { DocumentState } from 'langium';
import { createBBjServices } from './bbj-module.js';
import { BBjWorkspaceManager } from './bbj-ws-manager.js';

// Create a connection to the client
const connection = createConnection(ProposedFeatures.all);

// Inject the shared services and language-specific services
const { shared, BBj } = createBBjServices({ connection, ...NodeFileSystem });

// Custom request type for refreshing Java classes
const RefreshJavaClassesRequest = new RequestType<void, boolean, void>('bbj/refreshJavaClasses');

connection.onRequest(RefreshJavaClassesRequest, async () => {
    try {
        const javaInterop = BBj.java.JavaInteropService;

        // Step 1: Clear all cached Java class data
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

connection.onDidChangeConfiguration(async (_change) => {
    try {
        const javaInterop = BBj.java.JavaInteropService;
        const wsManager = shared.workspace.WorkspaceManager as BBjWorkspaceManager;

        // Fetch the latest BBj config section from the client
        const bbjConfig = await connection.workspace.getConfiguration({ section: 'bbj' });
        const newClasspath = bbjConfig?.classpath || '';
        const newHome = bbjConfig?.home || '';

        // Compare with current settings to detect relevant changes
        const currentSettings = wsManager.getSettings();
        const currentHome = wsManager.getBBjDir();

        const classpathChanged = newClasspath !== (currentSettings?.classpath?.join(':') || '');
        const homeChanged = newHome !== currentHome;

        if (!classpathChanged && !homeChanged) {
            return;
        }

        console.log('BBj settings changed, refreshing Java classes...');

        javaInterop.clearCache();

        let classpathToUse: string[] = [];
        if (currentSettings && currentSettings.classpath.length > 0 &&
            !(currentSettings.classpath.length === 1 && currentSettings.classpath[0] === '')) {
            classpathToUse = currentSettings.classpath;
        } else if (newClasspath) {
            classpathToUse = [`[${newClasspath}]`];
        }

        if (classpathToUse.length > 0) {
            await javaInterop.loadClasspath(classpathToUse);
        }
        await javaInterop.loadImplicitImports();

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

// Start the language server with the shared services
startLanguageServer(shared);
