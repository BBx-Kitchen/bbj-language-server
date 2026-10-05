/**
 * The bounded formatting handlers: which documents reach the format service, and proof that a
 * request is answered from the open buffer even while the workspace is still loading.
 */
import { EmptyFileSystem } from 'langium';
import type { NormalizedTextDocuments } from 'langium/lsp';
import type { DocumentFormattingParams, DocumentRangeFormattingParams, Range, TextEdit } from 'vscode-languageserver';
import { CancellationToken } from 'vscode-jsonrpc';
import { TextDocument } from 'vscode-languageserver-textdocument';
import type { URI } from 'vscode-uri';
import { afterEach, describe, expect, test, vi } from 'vitest';
import {
    createBoundedDocumentFormattingHandler, createBoundedRangeFormattingHandler, registerBoundedFormattingHandler,
    type FormattingHandlerDeps
} from '../src/language/bbj-formatting-handler.js';
import type { BBjFormatRequest } from '../src/language/bbj-format-service.js';
import { CONFIG_DOCUMENT_LANGUAGE_ID } from '../src/composer-lens-contract.js';
import { createBBjTestServices, type JavaInteropTestService } from './bbj-test-module.js';
import { listenOnFakeConnection } from './fake-text-document-connection.js';

const URI_TEXT = 'file:///ws/demo.bbj';
const OPTIONS = { tabSize: 4, insertSpaces: true };
const SELECTION: Range = { start: { line: 0, character: 0 }, end: { line: 0, character: 3 } };
const EDITS: TextEdit[] = [{ range: { start: { line: 0, character: 0 }, end: { line: 1, character: 0 } }, newText: 'x\n' }];

function openDocument(languageId: string): TextDocument {
    return TextDocument.create(URI_TEXT, languageId, 1, 'a=1\n');
}

function stubDeps(languageId: string | undefined, format = vi.fn(async (_request: BBjFormatRequest) => EDITS)) {
    const deps: FormattingHandlerDeps = {
        getTextDocument: (_uri: URI) => (languageId === undefined ? undefined : openDocument(languageId)),
        format
    };
    return { deps, format };
}

const documentParams = (uri = URI_TEXT): DocumentFormattingParams => ({ textDocument: { uri }, options: OPTIONS });
const rangeParams = (uri = URI_TEXT): DocumentRangeFormattingParams => ({ textDocument: { uri }, range: SELECTION, options: OPTIONS });

afterEach(() => {
    vi.restoreAllMocks();
});

describe('which documents reach the format service', () => {

    test.each([
        ['document', (deps: FormattingHandlerDeps) => createBoundedDocumentFormattingHandler(deps)(documentParams(), CancellationToken.None)],
        ['range', (deps: FormattingHandlerDeps) => createBoundedRangeFormattingHandler(deps)(rangeParams(), CancellationToken.None)]
    ])('%s handler: a document that is not open gives no edit and nothing is formatted', async (_name, run) => {
        const { deps, format } = stubDeps(undefined);

        expect(await run(deps)).toEqual([]);
        expect(format).not.toHaveBeenCalled();
    });

    test.each([
        ['document', CONFIG_DOCUMENT_LANGUAGE_ID, (deps: FormattingHandlerDeps) => createBoundedDocumentFormattingHandler(deps)(documentParams(), CancellationToken.None)],
        ['document', 'plaintext', (deps: FormattingHandlerDeps) => createBoundedDocumentFormattingHandler(deps)(documentParams(), CancellationToken.None)],
        ['range', CONFIG_DOCUMENT_LANGUAGE_ID, (deps: FormattingHandlerDeps) => createBoundedRangeFormattingHandler(deps)(rangeParams(), CancellationToken.None)],
        ['range', 'plaintext', (deps: FormattingHandlerDeps) => createBoundedRangeFormattingHandler(deps)(rangeParams(), CancellationToken.None)]
    ])('%s handler: a %s document gives no edit and nothing is formatted', async (_name, languageId, run) => {
        const { deps, format } = stubDeps(languageId);

        expect(await run(deps)).toEqual([]);
        expect(format).not.toHaveBeenCalled();
    });

    test('a format that rejects gives no edit from either handler', async () => {
        const { deps } = stubDeps('bbj', vi.fn(async () => { throw new Error('boom'); }));

        expect(await createBoundedDocumentFormattingHandler(deps)(documentParams(), CancellationToken.None)).toEqual([]);
        expect(await createBoundedRangeFormattingHandler(deps)(rangeParams(), CancellationToken.None)).toEqual([]);
    });

    test('a BBj document returns exactly the edits the format service resolved with', async () => {
        const { deps, format } = stubDeps('bbj');

        const documentEdits = await createBoundedDocumentFormattingHandler(deps)(documentParams(), CancellationToken.None);
        const rangeEdits = await createBoundedRangeFormattingHandler(deps)(rangeParams(), CancellationToken.None);

        expect(documentEdits).toBe(EDITS);
        expect(rangeEdits).toBe(EDITS);
        expect(format.mock.calls[0][0].range).toBeUndefined();
        expect(format.mock.calls[1][0].range).toEqual(SELECTION);
    });

    test('the request can look up the live document again by the same uri', async () => {
        const { deps, format } = stubDeps('bbj');

        await createBoundedDocumentFormattingHandler(deps)(documentParams(), CancellationToken.None);

        expect(format.mock.calls[0][0].current()?.uri).toBe(URI_TEXT);
    });
});

describe('with the real services', () => {

    function createHarness() {
        const { shared, BBj } = createBBjTestServices(EmptyFileSystem);
        const double = BBj.java.JavaInteropService as JavaInteropTestService;
        const client = listenOnFakeConnection(shared.workspace.TextDocuments as unknown as NormalizedTextDocuments<TextDocument>);
        const connection = { onDocumentFormatting: vi.fn(), onDocumentRangeFormatting: vi.fn() };
        registerBoundedFormattingHandler(connection, shared, BBj);
        const formatDocument = connection.onDocumentFormatting.mock.calls[0][0] as
            (params: DocumentFormattingParams, token: CancellationToken) => Promise<TextEdit[]>;
        return { shared, double, client, formatDocument };
    }

    test('a format resolves while the workspace is still loading and no document wait is started', async () => {
        const { shared, double, client, formatDocument } = createHarness();
        Object.defineProperty(shared.workspace.WorkspaceManager, 'ready', { get: () => new Promise<void>(() => { /* never settles */ }) });
        const waitUntil = vi.spyOn(shared.workspace.DocumentBuilder, 'waitUntil').mockImplementation(() => new Promise(() => { /* never settles */ }));
        double.scriptFormatProgram({ result: { text: 'x=1\n', diagnostics: [], denumbered: false, version: '1' } });
        client.open(URI_TEXT, 1, '  x=1\n');

        const edits = await formatDocument(documentParams(), CancellationToken.None);

        expect(edits).toHaveLength(1);
        expect(edits[0].newText).toBe('x=1\n');
        expect(waitUntil).not.toHaveBeenCalled();
    });

    test('a config document and a plain text document give no edit and are never sent to the formatter', async () => {
        const { double, client, formatDocument } = createHarness();
        client.open('file:///ws/config.bbx', 1, 'key=value\n', CONFIG_DOCUMENT_LANGUAGE_ID);
        client.open('file:///ws/notes.txt', 1, 'some notes\n', 'plaintext');

        expect(await formatDocument(documentParams('file:///ws/config.bbx'), CancellationToken.None)).toEqual([]);
        expect(await formatDocument(documentParams('file:///ws/notes.txt'), CancellationToken.None)).toEqual([]);
        expect(double.formatProgramCalls).toEqual([]);
    });

    test('a document that is not open gives no edit and is never loaded from disk', async () => {
        const { shared, double, formatDocument } = createHarness();
        const getOrCreate = vi.spyOn(shared.workspace.LangiumDocuments, 'getOrCreateDocument');

        expect(await formatDocument(documentParams('file:///ws/unopened.bbj'), CancellationToken.None)).toEqual([]);
        expect(getOrCreate).not.toHaveBeenCalled();
        expect(double.formatProgramCalls).toEqual([]);
    });
});
