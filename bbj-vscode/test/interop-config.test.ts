/******************************************************************************
 * Copyright 2023 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

import { EmptyFileSystem } from 'langium';
import type { InitializeParams } from 'vscode-languageserver';
import * as fs from 'fs';
import * as path from 'path';
import { afterEach, describe, expect, test, vi } from 'vitest';
import {
    DEFAULT_INTEROP_HOST,
    DEFAULT_INTEROP_PORT,
    INTEROP_HOST_SETTING,
    INTEROP_PORT_SETTING,
    validateInteropConfig,
} from '../src/language/interop-config.js';
import { createBBjTestServices } from './bbj-test-module.js';
import type { JavaInteropService } from '../src/language/java-interop.js';
import { logger } from '../src/language/logger.js';

/**
 * Coverage for the shared interop host/port validator (issues #509, #510, #581) and the two
 * server entry points that must route through it: the initialization-options path here, and
 * the configuration-change path added alongside main.ts's call site.
 */

afterEach(() => {
    vi.restoreAllMocks();
});

describe('validateInteropConfig', () => {
    test('a well-formed host and port pass through unchanged', () => {
        const result = validateInteropConfig('interop.example', 6000);
        expect(result).toEqual({ host: 'interop.example', port: 6000, rejected: [] });
    });

    test('a host with surrounding whitespace is trimmed', () => {
        const result = validateInteropConfig('  myhost  ', 5008);
        expect(result.host).toBe('myhost');
        expect(result.rejected).toEqual([]);
    });

    test.each([
        ['empty string', ''],
        ['whitespace only', '   '],
        ['a number', 42],
        ['an object', {}],
    ])('an invalid host (%s) falls back to the default with one rejection', (_label, rawHost) => {
        const result = validateInteropConfig(rawHost, 6000);
        expect(result.host).toBe(DEFAULT_INTEROP_HOST);
        expect(result.port).toBe(6000);
        expect(result.rejected).toEqual([{ setting: INTEROP_HOST_SETTING, value: rawHost }]);
    });

    test.each([
        ['zero', 0],
        ['above 65535', 65536],
        ['non-integer', 1.5],
        ['NaN', NaN],
        ['negative', -1],
        ['a numeric string', '5008'],
    ])('an invalid port (%s) falls back to the default with one rejection', (_label, rawPort) => {
        const result = validateInteropConfig('h', rawPort);
        expect(result.host).toBe('h');
        expect(result.port).toBe(DEFAULT_INTEROP_PORT);
        expect(result.rejected).toEqual([{ setting: INTEROP_PORT_SETTING, value: rawPort }]);
    });

    test.each([1, 65535])('port %d at the boundary is accepted', (port) => {
        const result = validateInteropConfig('h', port);
        expect(result.port).toBe(port);
        expect(result.rejected).toEqual([]);
    });

    test('undefined host and port fall back to the defaults with no rejection', () => {
        const result = validateInteropConfig(undefined, undefined);
        expect(result).toEqual({ host: DEFAULT_INTEROP_HOST, port: DEFAULT_INTEROP_PORT, rejected: [] });
    });

    test('null host and port fall back to the defaults with no rejection', () => {
        const result = validateInteropConfig(null, null);
        expect(result).toEqual({ host: DEFAULT_INTEROP_HOST, port: DEFAULT_INTEROP_PORT, rejected: [] });
    });
});

describe('interop settings from the initialization options (issue #509, #510)', () => {
    async function initializeWith(interopHost: unknown, interopPort: unknown) {
        const services = createBBjTestServices(EmptyFileSystem);
        const warnSpy = vi.spyOn(logger, 'warn').mockImplementation(() => { });
        await services.shared.lsp.LanguageServer.initialize({
            processId: null,
            rootUri: null,
            capabilities: {},
            initializationOptions: { interopHost, interopPort },
        } as InitializeParams);
        return { services, warnSpy };
    }

    test('an invalid host falls back and logs one warning naming bbj.interop.host', async () => {
        const { services, warnSpy } = await initializeWith(42, 6000);
        expect(services.BBj.java.JavaInteropService.getConnectionConfig()).toEqual({
            host: DEFAULT_INTEROP_HOST,
            port: 6000,
        });
        expect(warnSpy).toHaveBeenCalledTimes(1);
        expect(warnSpy.mock.calls[0][0]).toContain(INTEROP_HOST_SETTING);
    });

    test('an invalid (numeric-string) port falls back and logs one warning naming bbj.interop.port and the string value', async () => {
        const { services, warnSpy } = await initializeWith('interop.example', '5008');
        expect(services.BBj.java.JavaInteropService.getConnectionConfig()).toEqual({
            host: 'interop.example',
            port: DEFAULT_INTEROP_PORT,
        });
        expect(warnSpy).toHaveBeenCalledTimes(1);
        expect(warnSpy.mock.calls[0][0]).toContain(INTEROP_PORT_SETTING);
        expect(warnSpy.mock.calls[0][0]).toContain('5008');
    });

    test('both invalid falls back to both defaults with two warnings', async () => {
        const { services, warnSpy } = await initializeWith(42, '5008');
        expect(services.BBj.java.JavaInteropService.getConnectionConfig()).toEqual({
            host: DEFAULT_INTEROP_HOST,
            port: DEFAULT_INTEROP_PORT,
        });
        expect(warnSpy).toHaveBeenCalledTimes(2);
    });

    test('both absent falls back to both defaults with no warning', async () => {
        const { services, warnSpy } = await initializeWith(undefined, undefined);
        expect(services.BBj.java.JavaInteropService.getConnectionConfig()).toEqual({
            host: DEFAULT_INTEROP_HOST,
            port: DEFAULT_INTEROP_PORT,
        });
        expect(warnSpy).not.toHaveBeenCalled();
    });
});

/**
 * Makes exactly the call main.ts's onDidChangeConfiguration handler makes:
 * `javaInterop.setConnectionConfig(config.interop?.host, config.interop?.port)` where
 * `config` is the pushed `bbj` settings section.
 */
function applyAsConfigurationChange(
    service: JavaInteropService,
    settings: { bbj: { interop?: { host?: unknown; port?: unknown } } },
): void {
    service.setConnectionConfig(settings.bbj.interop?.host, settings.bbj.interop?.port);
}

describe('interop settings from a configuration change (issue #509, #510)', () => {
    function freshService(): JavaInteropService {
        return createBBjTestServices(EmptyFileSystem).BBj.java.JavaInteropService;
    }

    test('an invalid host falls back and logs one warning naming bbj.interop.host', () => {
        const service = freshService();
        const warnSpy = vi.spyOn(logger, 'warn').mockImplementation(() => { });
        applyAsConfigurationChange(service, { bbj: { interop: { host: '', port: 6000 } } });
        expect(service.getConnectionConfig()).toEqual({ host: DEFAULT_INTEROP_HOST, port: 6000 });
        expect(warnSpy).toHaveBeenCalledTimes(1);
        expect(warnSpy.mock.calls[0][0]).toContain(INTEROP_HOST_SETTING);
    });

    test('an invalid (out-of-range) port falls back and logs one warning naming bbj.interop.port', () => {
        const service = freshService();
        const warnSpy = vi.spyOn(logger, 'warn').mockImplementation(() => { });
        applyAsConfigurationChange(service, { bbj: { interop: { host: 'interop.example', port: 70000 } } });
        expect(service.getConnectionConfig()).toEqual({ host: 'interop.example', port: DEFAULT_INTEROP_PORT });
        expect(warnSpy).toHaveBeenCalledTimes(1);
        expect(warnSpy.mock.calls[0][0]).toContain(INTEROP_PORT_SETTING);
    });

    test('both invalid falls back to both defaults with two warnings', () => {
        const service = freshService();
        const warnSpy = vi.spyOn(logger, 'warn').mockImplementation(() => { });
        applyAsConfigurationChange(service, { bbj: { interop: { host: 5, port: 'x' } } });
        expect(service.getConnectionConfig()).toEqual({ host: DEFAULT_INTEROP_HOST, port: DEFAULT_INTEROP_PORT });
        expect(warnSpy).toHaveBeenCalledTimes(2);
    });

    test('a bbj section without an interop key falls back to both defaults with no warning', () => {
        const service = freshService();
        const warnSpy = vi.spyOn(logger, 'warn').mockImplementation(() => { });
        applyAsConfigurationChange(service, { bbj: {} });
        expect(service.getConnectionConfig()).toEqual({ host: DEFAULT_INTEROP_HOST, port: DEFAULT_INTEROP_PORT });
        expect(warnSpy).not.toHaveBeenCalled();
    });
});

describe('configuration-change-handler.ts configuration-change call site', () => {
    function stripLineComments(text: string): string {
        return text
            .split('\n')
            .map(line => {
                const idx = line.indexOf('//');
                return idx >= 0 ? line.slice(0, idx) : line;
            })
            .join('\n');
    }

    function configurationChangeHandlerSource(): string {
        return stripLineComments(
            fs.readFileSync(path.join(__dirname, '..', 'src', 'language', 'configuration-change-handler.ts'), 'utf-8'),
        );
    }

    // The onDidChangeConfiguration body (and this call site) moved from main.ts into
    // configuration-change-handler.ts (#563); main.ts registers the handler at module load
    // against a live connection, so this test pins the call site text there while the behavior
    // behind it is exercised through setConnectionConfig above, via applyAsConfigurationChange.
    test('exactly one setConnectionConfig( call, passing config.interop?.host and config.interop?.port directly', () => {
        const source = configurationChangeHandlerSource();
        const matches = source.match(/setConnectionConfig\(/g) ?? [];
        expect(matches).toHaveLength(1);
        expect(source).toMatch(/setConnectionConfig\(\s*config\.interop\?\.host\s*,\s*config\.interop\?\.port\s*\)/);
    });
});
