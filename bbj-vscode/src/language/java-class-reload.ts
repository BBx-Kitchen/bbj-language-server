/******************************************************************************
 * Copyright 2023 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

import { DocumentState } from 'langium';
import type { DocumentBuilder, LangiumDocuments } from 'langium';
import type { BBjWorkspaceManager } from './bbj-ws-manager.js';
import type { JavaInteropService } from './java-interop.js';

/**
 * The narrow slice of services {@link reloadClasspathAndRecheckDocuments} needs. Never imports
 * `main.ts` — importing it from shared code crashes the test suite (`bbj-notifications.ts`
 * isolation), since `main.ts` calls `createConnection` at module load.
 */
export interface JavaClassReloadServices {
    javaInterop: Pick<JavaInteropService, 'loadClasspath' | 'loadImplicitImports'>;
    workspaceManager: Pick<BBjWorkspaceManager, 'getSettings'>;
    langiumDocuments: LangiumDocuments;
    documentBuilder: DocumentBuilder;
}

/**
 * Reloads the Java classpath and implicit imports, then re-checks every open `file`-scheme
 * document once, without clearing any already-resolved class cache. Shared by the explicit
 * "Refresh Java Classes" flow (which clears the cache first, through its own caller) and by an
 * interop connection recovery (which does not): a reconnected peer is a fresh backend instance
 * with no memory of the custom classpath, so the classpath and implicit imports must load again
 * before the re-check can trust its answers.
 */
export async function reloadClasspathAndRecheckDocuments(services: JavaClassReloadServices): Promise<void> {
    const { javaInterop, workspaceManager, langiumDocuments, documentBuilder } = services;

    // Reload classpath from workspace settings
    const settings = workspaceManager.getSettings();
    if (settings && settings.classpath.length > 0) {
        await javaInterop.loadClasspath(settings.classpath);
    }

    // Reload implicit imports
    await javaInterop.loadImplicitImports();

    // Re-check all open documents by resetting their state
    const documents = langiumDocuments.all.toArray();
    for (const doc of documents) {
        if (doc.uri.scheme === 'file') {
            doc.state = DocumentState.Parsed;
        }
    }
    const docUris = documents
        .filter(doc => doc.uri.scheme === 'file')
        .map(doc => doc.uri);
    if (docUris.length > 0) {
        await documentBuilder.update(docUris, []);
    }
}
