/**
 * The format path end to end over the hermetic interop double: the bounded handler reads the open
 * buffer, the format service builds the request and turns the answer into minimal line edits, and
 * every failure, cancellation and stale answer leaves the buffer alone.
 */
import { EmptyFileSystem } from 'langium';
import type { NormalizedTextDocuments } from 'langium/lsp';
import type { DocumentFormattingParams, TextEdit } from 'vscode-languageserver';
import { CancellationToken } from 'vscode-jsonrpc';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { URI } from 'vscode-uri';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { registerBoundedFormattingHandler } from '../src/language/bbj-formatting-handler.js';
import { FORMATTER_SETTING_KEYS } from '../src/language/bbj-format-settings.js';
import { logger } from '../src/language/logger.js';
import {
    createBBjTestServices, type JavaInteropTestService, type JavaInteropTestServiceProgramScript
} from './bbj-test-module.js';
import { listenOnFakeConnection } from './fake-text-document-connection.js';

const URI_TEXT = 'file:///ws/demo.bbj';
const ORIGINAL = 'if a then print 1\n  x=1\nrem y\n';
const FORMATTED = 'if a then print 1\nx=1\nrem y\n';
const DEFAULT_OPTIONS = { tabSize: 4, insertSpaces: true };

type DocumentHandler = (params: DocumentFormattingParams, token: CancellationToken) => Promise<TextEdit[]>;

/** A script answer carrying the whole formatted text for the given request version. */
function documentAnswer(text: string, version = '1'): JavaInteropTestServiceProgramScript {
    return { result: { text, diagnostics: [], denumbered: false, version } };
}

function createHarness() {
    const { shared, BBj } = createBBjTestServices(EmptyFileSystem);
    const double = BBj.java.JavaInteropService as JavaInteropTestService;
    const textDocuments = shared.workspace.TextDocuments as unknown as NormalizedTextDocuments<TextDocument>;
    const client = listenOnFakeConnection(textDocuments);
    const connection = { onDocumentFormatting: vi.fn(), onDocumentRangeFormatting: vi.fn() };
    registerBoundedFormattingHandler(connection, shared, BBj);
    const formatDocument = connection.onDocumentFormatting.mock.calls[0][0] as DocumentHandler;
    return { shared, BBj, double, client, formatDocument };
}

function documentParams(uri = URI_TEXT, options = DEFAULT_OPTIONS): DocumentFormattingParams {
    return { textDocument: { uri }, options };
}

function applyTo(text: string, edits: TextEdit[]): string {
    return TextDocument.applyEdits(TextDocument.create(URI_TEXT, 'bbj', 1, text), edits);
}

function spyOnLogger() {
    return (['debug', 'info', 'warn', 'error'] as const).map(level => ({
        level,
        spy: vi.spyOn(logger, level).mockImplementation(() => { /* silenced */ })
    }));
}

/** A promise whose settlement the test decides. */
function deferred<T>() {
    let resolve!: (value: T) => void;
    const promise = new Promise<T>(r => { resolve = r; });
    return { promise, resolve };
}

afterEach(() => {
    vi.restoreAllMocks();
});

describe('whole-document format through the bounded handler', () => {

    test('an open buffer comes back as one edit over the changed line only', async () => {
        const { double, client, formatDocument } = createHarness();
        double.scriptFormatProgram(documentAnswer(FORMATTED));
        client.open(URI_TEXT, 1, ORIGINAL);

        const edits = await formatDocument(documentParams(), CancellationToken.None);

        expect(edits).toHaveLength(1);
        expect(edits[0].range).toEqual({ start: { line: 1, character: 0 }, end: { line: 2, character: 0 } });
        expect(applyTo(ORIGINAL, edits)).toBe(FORMATTED);
    });

    test('the request carries the buffer text, the version as a string, the file path and exactly the 15 settings', async () => {
        const { double, client, formatDocument } = createHarness();
        double.scriptFormatProgram(documentAnswer(FORMATTED));
        client.open(URI_TEXT, 1, ORIGINAL);

        await formatDocument(documentParams(), CancellationToken.None);

        expect(double.formatProgramCalls).toHaveLength(1);
        const call = double.formatProgramCalls[0];
        expect(call.text).toBe(ORIGINAL);
        expect(call.version).toBe('1');
        expect(call.canonicalName).toBe(URI.parse(URI_TEXT).fsPath);
        expect(Object.keys(call.settings ?? {})).toHaveLength(15);
        expect(Object.keys(call.settings ?? {}).sort()).toEqual([...FORMATTER_SETTING_KEYS].sort());
        expect(call.settings?.indentWidth).toBe(2);
        expect('range' in call).toBe(false);
    });

    test('the request never asks to denumber the program', async () => {
        const { double, client, formatDocument } = createHarness();
        double.scriptFormatProgram(documentAnswer(FORMATTED));
        client.open(URI_TEXT, 1, ORIGINAL);

        await formatDocument(documentParams(), CancellationToken.None);

        expect('allowDenum' in double.formatProgramCalls[0]).toBe(false);
    });

    test('the editor formatting options never change the settings that are sent', async () => {
        const { double, client, formatDocument } = createHarness();
        double.scriptFormatProgram(documentAnswer(FORMATTED));
        client.open(URI_TEXT, 1, ORIGINAL);

        await formatDocument(documentParams(URI_TEXT, { tabSize: 8, insertSpaces: false }), CancellationToken.None);

        const settings = double.formatProgramCalls[0].settings;
        expect(settings?.indentWidth).toBe(2);
        expect(settings?.indentCharacter).toBe('SPACE');
    });

    test('text that is already formatted gives no edit', async () => {
        const { double, client, formatDocument } = createHarness();
        client.open(URI_TEXT, 1, FORMATTED);

        const edits = await formatDocument(documentParams(), CancellationToken.None);

        expect(double.formatProgramCalls).toHaveLength(1);
        expect(edits).toEqual([]);
    });

    test('an answer for an older version is dropped when the document was edited meanwhile', async () => {
        const { double, client, formatDocument } = createHarness();
        const answer = deferred<JavaInteropTestServiceProgramScript>();
        double.scriptFormatProgram({ pending: answer.promise });
        client.open(URI_TEXT, 1, ORIGINAL);

        const result = formatDocument(documentParams(), CancellationToken.None);
        client.change(URI_TEXT, 2, [{ text: 'print 2\n' }]);
        answer.resolve(documentAnswer(FORMATTED, '1'));

        expect(await result).toEqual([]);
    });

    test('an answer is dropped when the document was closed meanwhile', async () => {
        const { double, client, formatDocument } = createHarness();
        const answer = deferred<JavaInteropTestServiceProgramScript>();
        double.scriptFormatProgram({ pending: answer.promise });
        client.open(URI_TEXT, 1, ORIGINAL);

        const result = formatDocument(documentParams(), CancellationToken.None);
        client.close(URI_TEXT);
        answer.resolve(documentAnswer(FORMATTED, '1'));

        expect(await result).toEqual([]);
    });

    test('a failed request gives no edit and no log line at any level carries the document text', async () => {
        const marker = 'SECRET_MARKER_TEXT';
        const spies = spyOnLogger();
        const { double, client, formatDocument } = createHarness();
        double.scriptFormatProgram('transport-error');
        client.open(URI_TEXT, 1, `rem ${marker}\nx=1\n`);

        const edits = await formatDocument(documentParams(), CancellationToken.None);

        expect(edits).toEqual([]);
        for (const { level, spy } of spies) {
            const logged = JSON.stringify(spy.mock.calls.map(args => args.map(arg => typeof arg === 'function' ? arg() : arg)));
            expect(logged, `logger.${level}`).not.toContain(marker);
        }
        expect(spies.find(entry => entry.level === 'warn')?.spy).not.toHaveBeenCalled();
        expect(spies.find(entry => entry.level === 'error')?.spy).not.toHaveBeenCalled();
    });

    test('the secret marker never reaches a log line for an answer that is dropped as stale', async () => {
        const marker = 'SECRET_MARKER_STALE';
        const spies = spyOnLogger();
        const { double, client, formatDocument } = createHarness();
        const answer = deferred<JavaInteropTestServiceProgramScript>();
        double.scriptFormatProgram({ pending: answer.promise });
        client.open(URI_TEXT, 1, `rem ${marker}\n`);

        const result = formatDocument(documentParams(), CancellationToken.None);
        client.close(URI_TEXT);
        answer.resolve('transport-error');
        await result;

        for (const { level, spy } of spies) {
            const logged = JSON.stringify(spy.mock.calls.map(args => args.map(arg => typeof arg === 'function' ? arg() : arg)));
            expect(logged, `logger.${level}`).not.toContain(marker);
        }
    });

    test('new settings reach the next request, without keys the server does not know, and move the revision', async () => {
        const { BBj, double, client, formatDocument } = createHarness();
        double.scriptFormatProgram(documentAnswer(FORMATTED));
        client.open(URI_TEXT, 1, ORIGINAL);

        BBj.compiler.BBjFormatService.setSettings({ indentWidth: 4, javaPath: '/j' });
        await formatDocument(documentParams(), CancellationToken.None);

        const settings = double.formatProgramCalls[0].settings;
        expect(settings?.indentWidth).toBe(4);
        expect(settings && 'javaPath' in settings).toBe(false);
        expect(BBj.compiler.BBjFormatService.settingsRevision).toBe(1);
        expect(BBj.compiler.BBjFormatService.settingsSnapshot().indentWidth).toBe(4);
    });
});
