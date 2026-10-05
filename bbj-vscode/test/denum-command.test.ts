/**
 * `bbj/denum` end to end through the request handler, the DENUM service and a fake language client:
 * a numbered open buffer comes back denumbered as one versioned edit that the server applies
 * itself, with exactly one message for the user.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { EmptyFileSystem } from 'langium';
import type { NormalizedTextDocuments } from 'langium/lsp';
import type { Connection, TextEdit } from 'vscode-languageserver';
import { CancellationToken } from 'vscode-jsonrpc';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { afterEach, describe, expect, test, vi } from 'vitest';
import {
    BBjDenumService, DENUM_NOT_OPEN_MESSAGE, DENUM_NOTHING_TO_DO_MESSAGE
} from '../src/language/bbj-denum-service.js';
import { applyDocumentEdit, initNotifications, showInformation } from '../src/language/bbj-notifications.js';
import { DENUM_FAILURE_REASONS, createDenumHandler } from '../src/language/denum-command.js';
import { DENUM_DIAGNOSTICS_METHOD, SHOW_DENUM_DIAGNOSTICS_METHOD } from '../src/language/denum-notifications.js';
import { logger } from '../src/language/logger.js';
import { createBBjTestServices, type JavaInteropTestService } from './bbj-test-module.js';
import { createFakeServerConnection } from './fake-server-connection.js';
import { listenOnFakeConnection } from './fake-text-document-connection.js';
import { applyEditsAsClient } from './denum-test-harness.js';

const URI_TEXT = 'file:///ws/numbered.bbj';
const NUMBERED = '0010 print 1\n0020 goto 0010\n';
const DENUMBERED = 'L10: print 1\ngoto L10\n';

function createHarness() {
    const { shared, BBj } = createBBjTestServices(EmptyFileSystem);
    const double = BBj.java.JavaInteropService as JavaInteropTestService;
    const textDocuments = shared.workspace.TextDocuments as unknown as NormalizedTextDocuments<TextDocument>;
    const client = listenOnFakeConnection(textDocuments);
    const fake = createFakeServerConnection();
    initNotifications(fake.connection);
    // Like a real client: an accepted edit reaches the document as one didChange with the next version.
    fake.workspace.applyEdit.mockImplementation(async (params: unknown) => {
        const { edit } = params as { edit: { documentChanges: Array<{ textDocument: { uri: string }; edits: TextEdit[] }> } };
        for (const change of edit.documentChanges) {
            applyEditsAsClient(client, textDocuments, change.textDocument.uri, change.edits);
        }
        return { applied: true };
    });
    vi.spyOn(logger, 'debug').mockImplementation(() => { /* silenced */ });
    const handler = createDenumHandler({
        getTextDocument: uri => textDocuments.get(uri),
        denum: BBj.compiler.BBjDenumService
    });
    return { BBj, double, client, handler, ...fake };
}

afterEach(() => {
    vi.restoreAllMocks();
    initNotifications(null as unknown as Connection);
});

describe('bbj/denum on a numbered open buffer', () => {

    test('is served by the DENUM service of the language services', () => {
        const harness = createHarness();
        expect(harness.BBj.compiler.BBjDenumService).toBeInstanceOf(BBjDenumService);
    });

    test('denumbers the buffer as one versioned edit the server applies', async () => {
        const harness = createHarness();
        harness.double.scriptDenumProgram({ result: { text: DENUMBERED, diagnostics: [], denumbered: true, version: '1' } });
        harness.client.open(URI_TEXT, 1, NUMBERED);

        const result = await harness.handler({ uri: URI_TEXT }, CancellationToken.None);

        expect(result.status).toBe('denumbered');
        expect(result.version).toBe(1);
        expect(result.applied).toBe(true);
        expect(result.edits).toHaveLength(1);
        expect(harness.workspace.applyEdit).toHaveBeenCalledTimes(1);
        expect(harness.workspace.applyEdit).toHaveBeenCalledWith({
            label: 'Denumber',
            edit: { documentChanges: [{ textDocument: { uri: URI_TEXT, version: 1 }, edits: result.edits }] }
        });
        expect(TextDocument.applyEdits(TextDocument.create(URI_TEXT, 'bbj', 1, NUMBERED), result.edits!)).toBe(DENUMBERED);
    });

    test('shows exactly one Information message and nothing else', async () => {
        const harness = createHarness();
        harness.double.scriptDenumProgram({ result: { text: DENUMBERED, diagnostics: [], denumbered: true, version: '1' } });
        harness.client.open(URI_TEXT, 1, NUMBERED);

        await harness.handler({ uri: URI_TEXT }, CancellationToken.None);

        expect(harness.window.showInformationMessage).toHaveBeenCalledTimes(1);
        expect(harness.window.showInformationMessage).toHaveBeenCalledWith('Denumbered.');
        expect(harness.window.showWarningMessage).not.toHaveBeenCalled();
        expect(harness.window.showErrorMessage).not.toHaveBeenCalled();
    });
});

describe('bbj/denum requests that must not reach bbj-ls', () => {

    test.each([
        ['undefined', undefined],
        ['null', null],
        ['an empty object', {}],
        ['a numeric uri', { uri: 42 }],
        ['a bare string', 'file:///ws/a.bbj']
    ])('params that are %s end with invalid-params and one Warning', async (_name, params) => {
        const harness = createHarness();
        const denum = vi.spyOn(harness.double, 'denumProgram');

        const result = await harness.handler(params, CancellationToken.None);

        expect(result).toEqual({ status: 'failed', reason: 'invalid-params', message: DENUM_NOT_OPEN_MESSAGE });
        expect(harness.window.showWarningMessage).toHaveBeenCalledTimes(1);
        expect(harness.window.showWarningMessage).toHaveBeenCalledWith(DENUM_NOT_OPEN_MESSAGE);
        expect(denum).not.toHaveBeenCalled();
    });

    test('a well-formed uri that is not open ends with not-open and one Warning', async () => {
        const harness = createHarness();
        const denum = vi.spyOn(harness.double, 'denumProgram');

        const result = await harness.handler({ uri: 'file:///ws/closed.bbj' }, CancellationToken.None);

        expect(result).toEqual({ status: 'failed', reason: 'not-open', message: DENUM_NOT_OPEN_MESSAGE });
        expect(harness.window.showWarningMessage).toHaveBeenCalledTimes(1);
        expect(denum).not.toHaveBeenCalled();
    });

    test.each(['bbx', 'plaintext'])('an open %s document ends with not-open and its text never leaves the server', async languageId => {
        const harness = createHarness();
        const denum = vi.spyOn(harness.double, 'denumProgram');
        harness.client.open('file:///ws/other.txt', 1, NUMBERED, languageId);

        const result = await harness.handler({ uri: 'file:///ws/other.txt' }, CancellationToken.None);

        expect(result.reason).toBe('not-open');
        expect(harness.window.showWarningMessage).toHaveBeenCalledTimes(1);
        expect(denum).not.toHaveBeenCalled();
    });

    test('a service whose run rejects still resolves as a failed run', async () => {
        const handler = createDenumHandler({
            getTextDocument: () => undefined,
            denum: { run: () => Promise.reject(new Error('boom')) }
        });
        vi.spyOn(logger, 'debug').mockImplementation(() => { /* silenced */ });

        await expect(handler({ uri: URI_TEXT }, CancellationToken.None)).resolves.toEqual({ status: 'failed', reason: 'denum-failed' });
    });
});

describe('the bbj/denum result', () => {

    test('carries DENUM diagnostics in the host-neutral four-field shape, in order', async () => {
        const harness = createHarness();
        harness.double.scriptDenumProgram({
            result: {
                text: DENUMBERED,
                diagnostics: [
                    { line: 1, originalLineNumber: '0010', severity: 'ERROR', message: 'syntax error' },
                    { line: 0, originalLineNumber: '', severity: 'INFO', message: 'note' }
                ],
                denumbered: true,
                version: '1'
            }
        });
        harness.client.open(URI_TEXT, 1, NUMBERED);

        const result = await harness.handler({ uri: URI_TEXT }, CancellationToken.None);

        expect(result.diagnostics).toEqual([
            { line: 1, originalLineNumber: '0010', severity: 'ERROR', message: 'syntax error' },
            { line: 0, originalLineNumber: '', severity: 'INFO', message: 'note' }
        ]);
        for (const diagnostic of result.diagnostics!) {
            expect(Object.keys(diagnostic).sort()).toEqual(['line', 'message', 'originalLineNumber', 'severity']);
        }
    });

    test('is plain JSON for a success, an unnumbered file and a failure', async () => {
        const harness = createHarness();
        harness.client.open('file:///ws/plain.bbj', 1, 'print 1\n');
        harness.client.open(URI_TEXT, 1, NUMBERED);

        harness.double.scriptDenumProgram({ result: { text: DENUMBERED, diagnostics: [], denumbered: true, version: '1' } });
        const success = await harness.handler({ uri: URI_TEXT }, CancellationToken.None);
        harness.double.scriptDenumProgram('success');
        const unnumbered = await harness.handler({ uri: 'file:///ws/plain.bbj' }, CancellationToken.None);
        const failure = await harness.handler({ uri: 'file:///ws/missing.bbj' }, CancellationToken.None);

        expect(unnumbered.status).toBe('not-line-numbered');
        expect(unnumbered.message).toBe(DENUM_NOTHING_TO_DO_MESSAGE);
        for (const result of [success, unnumbered, failure]) {
            expect(JSON.parse(JSON.stringify(result))).toEqual(result);
        }
    });

    test('keeps the closed failure vocabulary stable', () => {
        expect([...DENUM_FAILURE_REASONS]).toEqual([
            'invalid-params', 'not-open', 'tokenized', 'protected-program', 'mixed-numbering', 'too-large', 'timeout',
            'denum-failed', 'service-unavailable', 'requires-bbj-26-03', 'not-reachable', 'stale', 'not-applied',
            'in-progress', 'cancelled', 'invalid-settings'
        ]);
    });
});

describe('the diagnostics notification contract', () => {

    test('names its two methods', () => {
        expect(DENUM_DIAGNOSTICS_METHOD).toBe('bbj/denumDiagnostics');
        expect(SHOW_DENUM_DIAGNOSTICS_METHOD).toBe('bbj/showDenumDiagnostics');
    });
});

describe('the notification senders the DENUM run uses', () => {

    test('applyDocumentEdit resolves to false when no connection is initialised', async () => {
        initNotifications(null as unknown as Connection);
        const applied = await applyDocumentEdit({ uri: URI_TEXT, version: 1, edits: [], label: 'Denumber' });
        expect(applied).toBe(false);
    });

    test('applyDocumentEdit resolves to false when the client request rejects', async () => {
        const fake = createFakeServerConnection();
        fake.workspace.applyEdit.mockRejectedValue(new Error('refused'));
        initNotifications(fake.connection);

        const applied = await applyDocumentEdit({ uri: URI_TEXT, version: 1, edits: [], label: 'Denumber' });

        expect(applied).toBe(false);
    });

    test('applyDocumentEdit resolves to false when the client answers applied false', async () => {
        const fake = createFakeServerConnection();
        fake.workspace.applyEdit.mockResolvedValue({ applied: false });
        initNotifications(fake.connection);

        expect(await applyDocumentEdit({ uri: URI_TEXT, version: 1, edits: [], label: 'Denumber' })).toBe(false);
    });

    test('showInformation never throws, with or without a connection', () => {
        initNotifications(null as unknown as Connection);
        expect(() => showInformation('hello')).not.toThrow();

        const fake = createFakeServerConnection();
        fake.window.showInformationMessage.mockImplementation(() => { throw new Error('closed'); });
        initNotifications(fake.connection);
        expect(() => showInformation('hello')).not.toThrow();
    });
});

/** Strip `//`-prefixed line comments so a comment mentioning a call cannot satisfy the guard. */
function codeOnly(source: string): string {
    return source
        .split('\n')
        .map(line => {
            const commentIndex = line.indexOf('//');
            return commentIndex >= 0 ? line.slice(0, commentIndex) : line;
        })
        .join('\n');
}

describe('bbj/denum wiring in main.ts', () => {

    test('is registered once, right after the compile request and before the server starts', () => {
        const source = codeOnly(fs.readFileSync(path.join(__dirname, '..', 'src', 'language', 'main.ts'), 'utf-8'));
        const denumIndex = source.indexOf('registerDenumRequest(connection');
        const compileIndex = source.indexOf('registerCompileRequest(connection');
        const startIndex = source.indexOf('startLanguageServer(shared)');

        expect(source.split('registerDenumRequest(connection')).toHaveLength(2);
        expect(compileIndex).toBeGreaterThanOrEqual(0);
        expect(denumIndex).toBeGreaterThan(compileIndex);
        expect(startIndex).toBeGreaterThan(denumIndex);
    });
});
