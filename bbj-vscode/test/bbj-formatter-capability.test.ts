import * as fs from 'fs';
import * as path from 'path';
import { EmptyFileSystem } from 'langium';
import type { InitializeParams, InitializeResult } from 'vscode-languageserver';
import { describe, expect, test } from 'vitest';
import { BBjFormatter } from '../src/language/bbj-formatter.js';
import { createBBjTestServices } from './bbj-test-module.js';

/**
 * The server advertises document and range formatting because a formatter is registered in the
 * language services, and answers those requests through the bounded handler that `main.ts`
 * registers after the language server starts.
 */

/** Strip `//`-prefixed line comments so a comment mentioning a call can't satisfy a guard. */
function codeOnly(source: string): string {
    return source
        .split('\n')
        .map(line => {
            const commentIndex = line.indexOf('//');
            return commentIndex >= 0 ? line.slice(0, commentIndex) : line;
        })
        .join('\n');
}

function initializeResult(): InitializeResult {
    const { shared } = createBBjTestServices(EmptyFileSystem);
    // buildInitializeResult is protected on DefaultLanguageServer -- reached through a structural
    // cast, the same way other capability tests reach it.
    const languageServer = shared.lsp.LanguageServer as unknown as {
        buildInitializeResult(params: InitializeParams): InitializeResult;
    };
    return languageServer.buildInitializeResult({
        processId: null,
        rootUri: null,
        capabilities: {},
        workspaceFolders: null,
    } as InitializeParams);
}

describe('formatting capability', () => {
    test('the server advertises document formatting and range formatting', () => {
        const { capabilities } = initializeResult();

        expect(capabilities.documentFormattingProvider).toBe(true);
        expect(capabilities.documentRangeFormattingProvider).toBe(true);
    });

    test('the server does not advertise on-type formatting', () => {
        const { capabilities } = initializeResult();

        expect(capabilities.documentOnTypeFormattingProvider).toBeUndefined();
    });

    test('the formatter service slot holds the BBj formatter', () => {
        const { BBj } = createBBjTestServices(EmptyFileSystem);

        expect(BBj.lsp.Formatter).toBeInstanceOf(BBjFormatter);
    });
});

describe('formatting handler registration in main.ts', () => {
    const MAIN_TS_SOURCE_PATH = path.join(__dirname, '..', 'src', 'language', 'main.ts');

    test('the bounded handler is registered exactly once, after startLanguageServer', () => {
        const source = codeOnly(fs.readFileSync(MAIN_TS_SOURCE_PATH, 'utf-8'));
        const call = 'registerBoundedFormattingHandler(connection, shared, BBj)';
        const registerIndex = source.indexOf(call);
        const startIndex = source.indexOf('startLanguageServer(shared)');

        expect(registerIndex, 'expected the bounded formatting handler to be registered in main.ts').toBeGreaterThanOrEqual(0);
        expect(source.indexOf(call, registerIndex + 1), 'expected exactly one registration').toBe(-1);
        expect(startIndex, 'expected a startLanguageServer(shared) call in main.ts').toBeGreaterThanOrEqual(0);
        expect(registerIndex).toBeGreaterThan(startIndex);
    });
});
