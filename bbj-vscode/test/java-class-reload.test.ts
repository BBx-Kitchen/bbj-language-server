/******************************************************************************
 * Copyright 2023 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

/**
 * Regression coverage for the shared reload-and-recheck helper (#504): after the interop
 * breaker closes and reports recovery, the classpath and implicit imports must reload before
 * open documents are re-checked, without `clearCache()` — a reconnected peer is a fresh backend
 * instance with no memory of the custom classpath.
 */
import { DocumentState, EmptyFileSystem } from 'langium';
import { parseHelper } from 'langium/test';
import type { Connection } from 'vscode-languageserver';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import type { URI } from 'vscode-uri';
import { initNotifications } from '../src/language/bbj-notifications.js';
import { BBjWorkspaceManager } from '../src/language/bbj-ws-manager.js';
import { Model } from '../src/language/generated/ast.js';
import { INTEROP_BREAKER_INITIAL_COOLDOWN_MS } from '../src/language/java-interop.js';
import { reloadClasspathAndRecheckDocuments } from '../src/language/java-class-reload.js';
import { createBBjTestServices } from './bbj-test-module.js';
import { createFakePeerServices } from './fake-interop-peer.js';

describe('Java class reload after interop recovery (#504)', () => {
    test('reloads the classpath, then implicit imports, then re-checks every file document once', async () => {
        const { shared, BBj } = createBBjTestServices(EmptyFileSystem);
        const parse = parseHelper<Model>(BBj);
        await parse('x = 1', { documentUri: 'file:///reload/a.bbj', validation: false });
        await parse('x = 1', { documentUri: 'file:///reload/b.bbj', validation: false });

        const wsManager = shared.workspace.WorkspaceManager as BBjWorkspaceManager;
        (wsManager as unknown as { settings: { prefixes: string[]; classpath: string[] } }).settings =
            { prefixes: [], classpath: ['/opt/lib/custom.jar'] };

        const loadClasspath = vi.fn().mockResolvedValue(true);
        const loadImplicitImports = vi.fn().mockResolvedValue(true);
        const clearCache = vi.fn();
        const javaInterop = { loadClasspath, loadImplicitImports, clearCache };

        const recordedStates: DocumentState[] = [];
        const update = vi.spyOn(shared.workspace.DocumentBuilder, 'update')
            .mockImplementation(async (changed: URI[]) => {
                for (const uri of changed) {
                    const doc = shared.workspace.LangiumDocuments.getDocument(uri);
                    if (doc) {
                        recordedStates.push(doc.state);
                    }
                }
            });

        await reloadClasspathAndRecheckDocuments({
            javaInterop,
            workspaceManager: wsManager,
            langiumDocuments: shared.workspace.LangiumDocuments,
            documentBuilder: shared.workspace.DocumentBuilder
        });

        expect(loadClasspath).toHaveBeenCalledTimes(1);
        expect(loadClasspath).toHaveBeenCalledWith(['/opt/lib/custom.jar']);
        expect(loadImplicitImports).toHaveBeenCalledTimes(1);
        expect(update).toHaveBeenCalledTimes(1);
        const [changedUris, deletedUris] = update.mock.calls[0];
        expect((changedUris as URI[]).map(u => u.toString()).sort()).toEqual(
            ['file:///reload/a.bbj', 'file:///reload/b.bbj'].sort()
        );
        expect(deletedUris).toEqual([]);
        expect(recordedStates.length).toBeGreaterThan(0);
        expect(recordedStates.every(state => state === DocumentState.Parsed)).toBe(true);

        const loadClasspathOrder = loadClasspath.mock.invocationCallOrder[0];
        const loadImplicitImportsOrder = loadImplicitImports.mock.invocationCallOrder[0];
        const updateOrder = update.mock.invocationCallOrder[0];
        expect(loadClasspathOrder).toBeLessThan(loadImplicitImportsOrder);
        expect(loadImplicitImportsOrder).toBeLessThan(updateOrder);

        expect(clearCache).not.toHaveBeenCalled();
    });

    test('skips the classpath load when no classpath is configured', async () => {
        const { shared, BBj } = createBBjTestServices(EmptyFileSystem);
        const parse = parseHelper<Model>(BBj);
        await parse('x = 1', { documentUri: 'file:///reload/c.bbj', validation: false });

        const wsManager = shared.workspace.WorkspaceManager as BBjWorkspaceManager;
        (wsManager as unknown as { settings: { prefixes: string[]; classpath: string[] } }).settings =
            { prefixes: [], classpath: [] };

        const loadClasspath = vi.fn().mockResolvedValue(true);
        const loadImplicitImports = vi.fn().mockResolvedValue(true);
        const javaInterop = { loadClasspath, loadImplicitImports, clearCache: vi.fn() };

        const update = vi.spyOn(shared.workspace.DocumentBuilder, 'update').mockResolvedValue(undefined);

        await reloadClasspathAndRecheckDocuments({
            javaInterop,
            workspaceManager: wsManager,
            langiumDocuments: shared.workspace.LangiumDocuments,
            documentBuilder: shared.workspace.DocumentBuilder
        });

        expect(loadClasspath).not.toHaveBeenCalled();
        expect(loadImplicitImports).toHaveBeenCalledTimes(1);
        expect(update).toHaveBeenCalledTimes(1);
    });

    describe('end to end through the fake interop peer', () => {
        beforeEach(() => {
            initNotifications({ window: { showErrorMessage: vi.fn() } } as unknown as Connection);
        });

        afterEach(() => {
            vi.useRealTimers();
            initNotifications(null as unknown as Connection);
        });

        test('an interop recovery re-checks documents exactly once', async () => {
            const { shared, BBj, interop } = createFakePeerServices();
            const parse = parseHelper<Model>(BBj);
            await parse('x = 1', { documentUri: 'file:///reload/c.bbj', validation: false });

            const workspaceManager = shared.workspace.WorkspaceManager as BBjWorkspaceManager;
            const langiumDocuments = shared.workspace.LangiumDocuments;
            const documentBuilder = shared.workspace.DocumentBuilder;

            const update = vi.spyOn(documentBuilder, 'update').mockResolvedValue(undefined);

            interop.onConnectionRecovered(() => reloadClasspathAndRecheckDocuments({
                javaInterop: interop,
                workspaceManager,
                langiumDocuments,
                documentBuilder
            }));

            vi.useFakeTimers();

            interop.connectDelayMs = 0;
            await interop.resolveClassByName('test.Down');
            interop.peerUp = true;
            await vi.advanceTimersByTimeAsync(INTEROP_BREAKER_INITIAL_COOLDOWN_MS);
            await interop.resolveClassByName('test.Up');
            await vi.advanceTimersByTimeAsync(0);

            expect(update).toHaveBeenCalledTimes(1);

            await interop.resolveClassByName('test.Again');
            await vi.advanceTimersByTimeAsync(0);
            expect(update).toHaveBeenCalledTimes(1);

            interop.clearCache();
            await interop.resolveClassByName('test.AfterClear');
            await vi.advanceTimersByTimeAsync(0);
            expect(update).toHaveBeenCalledTimes(1);
        });
    });
});
