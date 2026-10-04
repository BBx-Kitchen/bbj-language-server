/******************************************************************************
 * Copyright 2023 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

/**
 * Behaviour coverage for the extracted `bbj/refreshJavaClasses` handler and its shared
 * reload-and-revalidate sequence (#563). The registered handler is driven through a fake
 * `Connection` — never through `main.ts`, which would call `createConnection()` at module load.
 */
import { EmptyFileSystem } from 'langium';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { LSPErrorCodes, ResponseError, type Connection } from 'vscode-languageserver';
import {
    REFRESH_JAVA_CLASSES_METHOD,
    createInlayHintRefresher,
    createReloadJavaClassesAndRevalidate,
    registerRefreshJavaClassesRequest,
} from '../src/language/java-class-refresh.js';
import { createBBjTestServices } from './bbj-test-module.js';

function createFakeConnection(inlayHintRefresh: () => Promise<void> = () => Promise.resolve()) {
    return {
        onRequest: vi.fn(),
        window: {
            showErrorMessage: vi.fn(),
            showInformationMessage: vi.fn(),
        },
        languages: {
            inlayHint: { refresh: vi.fn(inlayHintRefresh) },
        },
    } as unknown as Connection;
}

/** Builds a fresh, call-order-recording fake `javaInterop` + `reloadServices` pair. */
function createReloadFixture() {
    const { shared } = createBBjTestServices(EmptyFileSystem);
    const callOrder: string[] = [];
    const javaInterop = {
        clearCache: vi.fn(() => { callOrder.push('clearCache'); }),
        loadClasspath: vi.fn(async () => { callOrder.push('loadClasspath'); return true; }),
        loadImplicitImports: vi.fn(async () => { callOrder.push('loadImplicitImports'); return true; }),
    };
    const workspaceManager = {
        getSettings: () => ({ prefixes: [], classpath: ['/opt/lib/custom.jar'] }),
    };
    const reloadServices = {
        javaInterop,
        workspaceManager,
        langiumDocuments: shared.workspace.LangiumDocuments,
        documentBuilder: shared.workspace.DocumentBuilder,
    };
    return { callOrder, javaInterop, reloadServices };
}

describe('bbj/refreshJavaClasses (#563)', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    test('success: registers one onRequest callback, reloads in order, refreshes hints and notifies', async () => {
        const connection = createFakeConnection();
        const refreshInlayHints = createInlayHintRefresher(connection);
        const { callOrder, javaInterop, reloadServices } = createReloadFixture();
        const reloadJavaClassesAndRevalidate = createReloadJavaClassesAndRevalidate({
            javaInterop,
            reloadServices,
            refreshInlayHints,
            window: connection.window,
        });

        registerRefreshJavaClassesRequest(connection, { reloadJavaClassesAndRevalidate });

        const onRequestMock = connection.onRequest as unknown as ReturnType<typeof vi.fn>;
        expect(onRequestMock).toHaveBeenCalledTimes(1);
        const [method, handler] = onRequestMock.mock.calls[0] as [string, () => Promise<boolean>];
        expect(method).toBe(REFRESH_JAVA_CLASSES_METHOD);

        const result = await handler();

        expect(result).toBe(true);
        expect(callOrder).toEqual(['clearCache', 'loadClasspath', 'loadImplicitImports']);
        expect(connection.languages.inlayHint.refresh).toHaveBeenCalledTimes(1);
        expect(connection.window.showInformationMessage).toHaveBeenCalledTimes(1);
        expect(connection.window.showInformationMessage).toHaveBeenCalledWith('Java classes refreshed');
        expect(connection.window.showErrorMessage).not.toHaveBeenCalled();
    });

    test('success: a client without inlay-hint refresh support still resolves true, no unhandled rejection', async () => {
        const connection = createFakeConnection(() => Promise.reject(new Error('refresh not supported')));
        const refreshInlayHints = createInlayHintRefresher(connection);
        const { javaInterop, reloadServices } = createReloadFixture();
        const reloadJavaClassesAndRevalidate = createReloadJavaClassesAndRevalidate({
            javaInterop,
            reloadServices,
            refreshInlayHints,
            window: connection.window,
        });

        registerRefreshJavaClassesRequest(connection, { reloadJavaClassesAndRevalidate });

        const onRequestMock = connection.onRequest as unknown as ReturnType<typeof vi.fn>;
        const [, handler] = onRequestMock.mock.calls[0] as [string, () => Promise<boolean>];

        const result = await handler();

        expect(result).toBe(true);
        expect(connection.window.showInformationMessage).toHaveBeenCalledWith('Java classes refreshed');
    });

    test('failure: loadImplicitImports rejects, handler resolves false, error is shown and logged', async () => {
        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => { /* silence */ });
        const connection = createFakeConnection();
        const refreshInlayHints = createInlayHintRefresher(connection);
        const { reloadServices } = createReloadFixture();
        const boom = new Error('boom');
        const javaInterop = {
            clearCache: vi.fn(),
            loadClasspath: vi.fn().mockResolvedValue(true),
            loadImplicitImports: vi.fn().mockRejectedValue(boom),
        };
        const reloadJavaClassesAndRevalidate = createReloadJavaClassesAndRevalidate({
            javaInterop,
            reloadServices: { ...reloadServices, javaInterop },
            refreshInlayHints,
            window: connection.window,
        });

        registerRefreshJavaClassesRequest(connection, { reloadJavaClassesAndRevalidate });

        const onRequestMock = connection.onRequest as unknown as ReturnType<typeof vi.fn>;
        const [, handler] = onRequestMock.mock.calls[0] as [string, () => Promise<boolean>];

        const result = await handler();

        expect(result).toBe(false);
        expect(connection.window.showErrorMessage).toHaveBeenCalledWith('Failed to refresh Java classes: Error: boom');
        expect(connection.window.showInformationMessage).not.toHaveBeenCalled();
        expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to refresh Java classes:', boom);
    });

    test('a cancelled "Java classes refreshed" or failure message never becomes an unhandled rejection', async () => {
        const cancelled = () => Promise.reject(new ResponseError(LSPErrorCodes.RequestCancelled, 'cancelled'));
        // Plain functions, not vi.fn: a vi.fn mock subscribes to the promises it returns to record
        // settled results, which would mark the rejection handled and hide the defect.
        const shown: string[] = [];
        const show = (message: string) => { shown.push(message); return cancelled(); };
        const connection = createFakeConnection();
        Object.assign(connection.window, { showInformationMessage: show, showErrorMessage: show });
        vi.spyOn(console, 'error').mockImplementation(() => { /* expected failure log */ });
        const { reloadServices, javaInterop } = createReloadFixture();
        const reload = createReloadJavaClassesAndRevalidate({
            javaInterop,
            reloadServices,
            refreshInlayHints: () => { /* not under test */ },
            window: connection.window,
        });
        registerRefreshJavaClassesRequest(connection, {
            reloadJavaClassesAndRevalidate: () => Promise.reject(new Error('boom')),
        });
        const [, failingHandler] = (connection.onRequest as unknown as ReturnType<typeof vi.fn>).mock.calls[0] as [string, () => Promise<boolean>];

        const seen: unknown[] = [];
        const listener = (reason: unknown) => { seen.push(reason); };
        process.on('unhandledRejection', listener);
        try {
            await reload();
            expect(await failingHandler()).toBe(false);
            await new Promise(resolve => setTimeout(resolve, 20));
        } finally {
            process.off('unhandledRejection', listener);
        }

        expect(seen).toEqual([]);
        expect(shown).toEqual(['Java classes refreshed', 'Failed to refresh Java classes: Error: boom']);
    });
});
