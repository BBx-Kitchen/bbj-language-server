/**
 * The Langium formatting slot: it answers through the same format service as the bounded handlers,
 * with the same document gates, and never offers on-type formatting.
 */
import { EmptyFileSystem } from 'langium';
import type { NormalizedTextDocuments } from 'langium/lsp';
import type { DocumentFormattingParams, DocumentOnTypeFormattingParams, DocumentRangeFormattingParams, Range, TextEdit } from 'vscode-languageserver';
import { CancellationToken } from 'vscode-jsonrpc';
import type { TextDocument } from 'vscode-languageserver-textdocument';
import { URI } from 'vscode-uri';
import { describe, expect, test, vi } from 'vitest';
import { BBjFormatter } from '../src/language/bbj-formatter.js';
import { registerBoundedFormattingHandler } from '../src/language/bbj-formatting-handler.js';
import { CONFIG_DOCUMENT_LANGUAGE_ID } from '../src/composer-lens-contract.js';
import { createBBjTestServices, type JavaInteropTestService } from './bbj-test-module.js';
import { listenOnFakeConnection } from './fake-text-document-connection.js';

const URI_TEXT = 'file:///ws/demo.bbj';
const ORIGINAL = 'if a then print 1\n  x=1\nrem y\n';
const FORMATTED = 'if a then print 1\nx=1\nrem y\n';
const OPTIONS = { tabSize: 4, insertSpaces: true };
const SELECTION: Range = { start: { line: 1, character: 0 }, end: { line: 1, character: 3 } };

function createHarness() {
    const { shared, BBj } = createBBjTestServices(EmptyFileSystem);
    const double = BBj.java.JavaInteropService as JavaInteropTestService;
    const textDocuments = shared.workspace.TextDocuments as unknown as NormalizedTextDocuments<TextDocument>;
    const client = listenOnFakeConnection(textDocuments);
    const connection = { onDocumentFormatting: vi.fn(), onDocumentRangeFormatting: vi.fn() };
    registerBoundedFormattingHandler(connection, shared, BBj);
    const handler = connection.onDocumentFormatting.mock.calls[0][0] as
        (params: DocumentFormattingParams, token: CancellationToken) => Promise<TextEdit[]>;
    const formatter = new BBjFormatter(BBj);

    /** The Langium document for an open buffer, built the way the framework hands one to a formatter. */
    function langiumDocumentFor(uri: string) {
        const textDocument = textDocuments.get(uri);
        if (textDocument === undefined) {
            throw new Error(`document ${uri} is not open`);
        }
        return shared.workspace.LangiumDocumentFactory.fromTextDocument(textDocument, URI.parse(uri));
    }
    return { double, client, handler, formatter, langiumDocumentFor };
}

const documentParams = (uri = URI_TEXT): DocumentFormattingParams => ({ textDocument: { uri }, options: OPTIONS });
const rangeParams = (uri = URI_TEXT): DocumentRangeFormattingParams => ({ textDocument: { uri }, range: SELECTION, options: OPTIONS });

describe('BBjFormatter', () => {

    test('formatDocument returns the same edits as the registered document handler', async () => {
        const { double, client, handler, formatter, langiumDocumentFor } = createHarness();
        double.scriptFormatProgram({ result: { text: FORMATTED, diagnostics: [], denumbered: false, version: '1' } });
        client.open(URI_TEXT, 1, ORIGINAL);

        const fromHandler = await handler(documentParams(), CancellationToken.None);
        const fromFormatter = await formatter.formatDocument(langiumDocumentFor(URI_TEXT), documentParams());

        expect(fromHandler).toHaveLength(1);
        expect(fromFormatter).toEqual(fromHandler);
    });

    test('formatDocumentRange sends the requested range', async () => {
        const { double, client, formatter, langiumDocumentFor } = createHarness();
        client.open(URI_TEXT, 1, ORIGINAL);

        await formatter.formatDocumentRange(langiumDocumentFor(URI_TEXT), rangeParams(), CancellationToken.None);

        expect(double.formatProgramCalls).toHaveLength(1);
        expect(double.formatProgramCalls[0].range).toEqual(SELECTION);
    });

    test('formatDocumentOnType gives no edit and sends nothing, and on-type formatting is not offered', async () => {
        const { double, client, formatter, langiumDocumentFor } = createHarness();
        client.open(URI_TEXT, 1, ORIGINAL);
        const onType: DocumentOnTypeFormattingParams = { textDocument: { uri: URI_TEXT }, position: { line: 0, character: 1 }, ch: '\n', options: OPTIONS };

        expect(await formatter.formatDocumentOnType(langiumDocumentFor(URI_TEXT), onType)).toEqual([]);
        expect(double.formatProgramCalls).toEqual([]);
        expect(formatter.formatOnTypeOptions).toBeUndefined();
    });

    test('a config document gives no edit from either method and sends nothing', async () => {
        const { double, client, formatter, langiumDocumentFor } = createHarness();
        // The uri carries an extension the service registry knows; only the language id marks the
        // buffer as a config document.
        const configUri = 'file:///ws/settings.bbj';
        client.open(configUri, 1, 'key=value\n', CONFIG_DOCUMENT_LANGUAGE_ID);
        const document = langiumDocumentFor(configUri);

        expect(await formatter.formatDocument(document, documentParams(configUri))).toEqual([]);
        expect(await formatter.formatDocumentRange(document, rangeParams(configUri))).toEqual([]);
        expect(double.formatProgramCalls).toEqual([]);
    });
});
