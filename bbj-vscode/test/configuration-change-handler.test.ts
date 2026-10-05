/******************************************************************************
 * Copyright 2023 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

/**
 * Behaviour coverage for the extracted `workspace/didChangeConfiguration` handler (#563). The
 * registered handler is driven through a fake `Connection` — never through `main.ts`, which
 * would call `createConnection()` at module load.
 */
import { describe, expect, test, vi } from 'vitest';
import type { Connection, DidChangeConfigurationParams } from 'vscode-languageserver';
import type { ResolvedConfigPath } from '../src/language/config-path-resolver.js';
import {
    createConfigurationChangeHandler,
    registerConfigurationChangeHandler,
    type BbjSettings,
    type ConfigurationChangeDeps,
} from '../src/language/configuration-change-handler.js';
import { LogLevel } from '../src/language/logger.js';

const RESOLVED_PATH: ResolvedConfigPath = { path: '/resolved/config.bbx', source: 'default', exists: true, problem: null };

/** Builds a fresh, order-recording fake deps object. Every branch under test overrides only what it needs. */
function createDeps(orderLog: string[], overrides: Partial<ConfigurationChangeDeps> = {}): ConfigurationChangeDeps {
    return {
        updateConfiguration: vi.fn(() => { orderLog.push('updateConfiguration'); }),
        getConfiguration: vi.fn(),
        isWorkspaceInitialized: vi.fn(() => true),
        wsManager: {
            setConfigPath: vi.fn(() => { orderLog.push('setConfigPath'); }),
            getResolvedConfigPath: vi.fn(() => RESOLVED_PATH),
            setCompilerConfig: vi.fn(),
        },
        javaInterop: {
            setConnectionConfig: vi.fn((host: unknown, port: unknown) => { orderLog.push(`setConnectionConfig:${String(host)}:${String(port)}`); }),
        },
        configWatcher: {
            updateResolvedPath: vi.fn(() => { orderLog.push('updateResolvedPath'); }),
        },
        notifyResolvedConfigPath: vi.fn(() => { orderLog.push('notifyResolvedConfigPath'); }),
        reloadJavaClassesAndRevalidate: vi.fn(async () => { orderLog.push('reload'); }),
        refreshInlayHints: vi.fn(),
        setLogLevel: vi.fn(),
        setSuppressCascading: vi.fn(),
        setMaxErrors: vi.fn(),
        setCompilerTrigger: vi.fn(),
        setParameterHintMode: vi.fn(),
        setFormatterSettings: vi.fn(),
        ...overrides,
    };
}

function createFakeConnection() {
    return { onDidChangeConfiguration: vi.fn() } as unknown as Pick<Connection, 'onDidChangeConfiguration'>;
}

/** Registers the handler on a fake connection and returns the callback the registration captured. */
function registerAndCapture(deps: ConfigurationChangeDeps): (change: DidChangeConfigurationParams) => Promise<void> {
    const connection = createFakeConnection();
    registerConfigurationChangeHandler(connection, deps);
    const onDidChangeConfigurationMock = connection.onDidChangeConfiguration as unknown as ReturnType<typeof vi.fn>;
    expect(onDidChangeConfigurationMock).toHaveBeenCalledTimes(1);
    return onDidChangeConfigurationMock.mock.calls[0][0] as (change: DidChangeConfigurationParams) => Promise<void>;
}

function pushChange(bbj: BbjSettings): DidChangeConfigurationParams {
    return { settings: { bbj } } as unknown as DidChangeConfigurationParams;
}

function pullChange(): DidChangeConfigurationParams {
    return { settings: {} } as unknown as DidChangeConfigurationParams;
}

describe('workspace/didChangeConfiguration (#563)', () => {
    test('always forwards the change to updateConfiguration first', async () => {
        const orderLog: string[] = [];
        const deps = createDeps(orderLog);
        const handler = registerAndCapture(deps);

        await handler(pushChange({ debug: true }));

        expect(deps.updateConfiguration).toHaveBeenCalledTimes(1);
        expect(orderLog[0]).toBe('updateConfiguration');
    });

    test('push model: settings.bbj present, getConfiguration is never called, its values drive the setters', async () => {
        const orderLog: string[] = [];
        const deps = createDeps(orderLog);
        const handler = registerAndCapture(deps);

        await handler(pushChange({ debug: true }));

        expect(deps.getConfiguration).not.toHaveBeenCalled();
        expect(deps.setLogLevel).toHaveBeenCalledWith(LogLevel.DEBUG);
    });

    test('pull model: no bbj section in settings, getConfiguration(\'bbj\') is called and its answer drives the setters', async () => {
        const orderLog: string[] = [];
        const getConfiguration = vi.fn().mockResolvedValue({ debug: true } satisfies BbjSettings);
        const deps = createDeps(orderLog, { getConfiguration });
        const handler = registerAndCapture(deps);

        await handler(pullChange());

        expect(getConfiguration).toHaveBeenCalledWith('bbj');
        expect(deps.setLogLevel).toHaveBeenCalledWith(LogLevel.DEBUG);
    });

    test('pull model: a rejected pull returns without applying anything after updateConfiguration', async () => {
        const orderLog: string[] = [];
        const getConfiguration = vi.fn().mockRejectedValue(new Error('no config available'));
        const deps = createDeps(orderLog, { getConfiguration });
        const handler = registerAndCapture(deps);

        await handler(pullChange());

        expect(deps.setLogLevel).not.toHaveBeenCalled();
        expect(deps.wsManager.setConfigPath).not.toHaveBeenCalled();
        expect(deps.reloadJavaClassesAndRevalidate).not.toHaveBeenCalled();
    });

    test('pull model: a pull resolving to undefined returns without applying anything after updateConfiguration', async () => {
        const orderLog: string[] = [];
        const getConfiguration = vi.fn().mockResolvedValue(undefined);
        const deps = createDeps(orderLog, { getConfiguration });
        const handler = registerAndCapture(deps);

        await handler(pullChange());

        expect(deps.setLogLevel).not.toHaveBeenCalled();
        expect(deps.wsManager.setConfigPath).not.toHaveBeenCalled();
        expect(deps.reloadJavaClassesAndRevalidate).not.toHaveBeenCalled();
    });

    describe('formatter settings', () => {
        test('a push with a formatter section hands that object over once, even before the workspace is initialized', async () => {
            const deps = createDeps([], { isWorkspaceInitialized: vi.fn(() => false) });
            const handler = registerAndCapture(deps);
            const formatter = { indentWidth: 4 };

            await handler(pushChange({ formatter }));

            expect(deps.setFormatterSettings).toHaveBeenCalledTimes(1);
            expect(deps.setFormatterSettings).toHaveBeenCalledWith(formatter);
        });

        test('a push without a formatter section never calls setFormatterSettings', async () => {
            const deps = createDeps([]);
            const handler = registerAndCapture(deps);

            await handler(pushChange({ debug: true }));

            expect(deps.setFormatterSettings).not.toHaveBeenCalled();
        });

        test('a pull hands over the formatter section of the pulled configuration', async () => {
            const formatter = { keywordsToUppercase: true };
            const getConfiguration = vi.fn().mockResolvedValue({ formatter } satisfies BbjSettings);
            const deps = createDeps([], { getConfiguration });
            const handler = registerAndCapture(deps);

            await handler(pullChange());

            expect(deps.setFormatterSettings).toHaveBeenCalledWith(formatter);
        });
    });

    describe('setters', () => {
        test('debug: true calls setLogLevel(LogLevel.DEBUG)', async () => {
            const deps = createDeps([]);
            const handler = registerAndCapture(deps);
            await handler(pushChange({ debug: true }));
            expect(deps.setLogLevel).toHaveBeenCalledWith(LogLevel.DEBUG);
        });

        test('debug: false calls setLogLevel(LogLevel.WARN)', async () => {
            const deps = createDeps([]);
            const handler = registerAndCapture(deps);
            await handler(pushChange({ debug: false }));
            expect(deps.setLogLevel).toHaveBeenCalledWith(LogLevel.WARN);
        });

        test('debug absent makes no setLogLevel call', async () => {
            const deps = createDeps([]);
            const handler = registerAndCapture(deps);
            await handler(pushChange({}));
            expect(deps.setLogLevel).not.toHaveBeenCalled();
        });

        test('suppressCascading and maxErrors are forwarded', async () => {
            const deps = createDeps([]);
            const handler = registerAndCapture(deps);
            await handler(pushChange({ diagnostics: { suppressCascading: true, maxErrors: 42 } }));
            expect(deps.setSuppressCascading).toHaveBeenCalledWith(true);
            expect(deps.setMaxErrors).toHaveBeenCalledWith(42);
        });

        test.each(['debounced', 'on-save', 'off'] as const)('compiler.trigger %s is forwarded', async trigger => {
            const deps = createDeps([]);
            const handler = registerAndCapture(deps);
            await handler(pushChange({ compiler: { trigger } }));
            expect(deps.setCompilerTrigger).toHaveBeenCalledWith(trigger);
        });

        test('an invalid compiler.trigger is ignored', async () => {
            const deps = createDeps([]);
            const handler = registerAndCapture(deps);
            await handler(pushChange({ compiler: { trigger: 'bogus' } }));
            expect(deps.setCompilerTrigger).not.toHaveBeenCalled();
        });

        test('a compiler object is passed to setCompilerConfig', async () => {
            const deps = createDeps([]);
            const handler = registerAndCapture(deps);
            const compiler = { compilerOutputDirectory: '/out' };
            await handler(pushChange({ compiler }));
            expect(deps.wsManager.setCompilerConfig).toHaveBeenCalledWith(compiler);
        });

        test('inlayHints.parameterNames.enabled calls setParameterHintMode then refreshInlayHints', async () => {
            const deps = createDeps([]);
            const handler = registerAndCapture(deps);
            await handler(pushChange({ inlayHints: { parameterNames: { enabled: 'literals' } } }));
            expect(deps.setParameterHintMode).toHaveBeenCalledWith('literals');
            expect(deps.refreshInlayHints).toHaveBeenCalled();
        });
    });

    describe('workspace-initialization boundary', () => {
        test('before the first build: setConfigPath, notifyResolvedConfigPath and updateResolvedPath run; reload and setConnectionConfig do not', async () => {
            const orderLog: string[] = [];
            const deps = createDeps(orderLog, { isWorkspaceInitialized: vi.fn(() => false) });
            const handler = registerAndCapture(deps);

            await handler(pushChange({ configPath: '/my/config.bbx' }));

            expect(deps.wsManager.setConfigPath).toHaveBeenCalledWith('/my/config.bbx');
            expect(deps.notifyResolvedConfigPath).toHaveBeenCalledWith(RESOLVED_PATH);
            expect(deps.configWatcher.updateResolvedPath).toHaveBeenCalledWith(RESOLVED_PATH);
            expect(deps.reloadJavaClassesAndRevalidate).not.toHaveBeenCalled();
            expect(deps.javaInterop.setConnectionConfig).not.toHaveBeenCalled();
        });

        test('before the first build: an absent configPath falls back to an empty string', async () => {
            const deps = createDeps([], { isWorkspaceInitialized: vi.fn(() => false) });
            const handler = registerAndCapture(deps);

            await handler(pushChange({}));

            expect(deps.wsManager.setConfigPath).toHaveBeenCalledWith('');
        });

        test('after the first build: setConfigPath, notifyResolvedConfigPath, updateResolvedPath, setConnectionConfig and reload run in that order', async () => {
            const orderLog: string[] = [];
            const deps = createDeps(orderLog);
            const handler = registerAndCapture(deps);

            await handler(pushChange({ interop: { host: '10.0.0.5', port: 6000 } }));

            expect(orderLog).toEqual([
                'updateConfiguration',
                'setConfigPath',
                'notifyResolvedConfigPath',
                'updateResolvedPath',
                'setConnectionConfig:10.0.0.5:6000',
                'reload',
            ]);
        });

        test('after the first build: with no interop section, setConnectionConfig is called with (undefined, undefined)', async () => {
            const deps = createDeps([]);
            const handler = registerAndCapture(deps);

            await handler(pushChange({}));

            expect(deps.javaInterop.setConnectionConfig).toHaveBeenCalledWith(undefined, undefined);
        });

        test('after the first build: a change carrying only a non-classpath setting (debug) still reloads', async () => {
            const deps = createDeps([]);
            const handler = registerAndCapture(deps);

            await handler(pushChange({ debug: true }));

            expect(deps.reloadJavaClassesAndRevalidate).toHaveBeenCalledTimes(1);
        });

        test('a rejected reload is logged and the handler still resolves without throwing', async () => {
            const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => { /* silence */ });
            const boom = new Error('boom');
            const deps = createDeps([], { reloadJavaClassesAndRevalidate: vi.fn().mockRejectedValue(boom) });
            const handler = registerAndCapture(deps);

            await expect(handler(pushChange({ debug: true }))).resolves.toBeUndefined();

            expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to refresh Java classes after settings change:', boom);
        });
    });

    test('createConfigurationChangeHandler builds a handler directly (no connection wiring required)', async () => {
        const deps = createDeps([]);
        const handler = createConfigurationChangeHandler(deps);

        const result = await handler(pushChange({ debug: true }));

        expect(result).toBeUndefined();
        expect(deps.setLogLevel).toHaveBeenCalledWith(LogLevel.DEBUG);
    });
});
