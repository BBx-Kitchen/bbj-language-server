/**
 * The format path end to end over the hermetic interop double: the bounded handler reads the open
 * buffer, the format service builds the request and turns the answer into minimal line edits, and
 * every failure, cancellation and stale answer leaves the buffer alone.
 */
import { EmptyFileSystem } from 'langium';
import type { NormalizedTextDocuments } from 'langium/lsp';
import type { DocumentFormattingParams, DocumentRangeFormattingParams, Range, TextEdit } from 'vscode-languageserver';
import { CancellationTokenSource } from 'vscode-languageserver';
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
type RangeHandler = (params: DocumentRangeFormattingParams, token: CancellationToken) => Promise<TextEdit[]>;

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
    const formatRange = connection.onDocumentRangeFormatting.mock.calls[0]?.[0] as RangeHandler;
    return { shared, BBj, double, client, formatDocument, formatRange };
}

function rangeParams(range: Range, uri = URI_TEXT): DocumentRangeFormattingParams {
    return { textDocument: { uri }, range, options: DEFAULT_OPTIONS };
}

/** A script answer carrying one range edit for the given request version. */
function rangeAnswer(range: Range, newText: string, version = '1'): JavaInteropTestServiceProgramScript {
    return { result: { edits: [{ range, newText }], diagnostics: [], denumbered: false, version } };
}

const THREE_LINES = 'a=1\n  b=2\nc=3\n';
const SELECTION_ON_LINE_ONE: Range = { start: { line: 1, character: 2 }, end: { line: 1, character: 5 } };

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
        const { double, client, formatDocument } = createHarness();
        const spies = spyOnLogger();
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
        const { double, client, formatDocument } = createHarness();
        const spies = spyOnLogger();
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

describe('format selection', () => {

    test('a peer edit wider than the selection comes back trimmed to the lines that differ', async () => {
        const { double, client, formatRange } = createHarness();
        double.scriptFormatProgram(rangeAnswer({ start: { line: 0, character: 0 }, end: { line: 2, character: 0 } }, 'a=1\nb=2\n'));
        client.open(URI_TEXT, 1, THREE_LINES);

        const edits = await formatRange(rangeParams(SELECTION_ON_LINE_ONE), CancellationToken.None);

        expect(edits).toHaveLength(1);
        expect(edits[0].range).toEqual({ start: { line: 1, character: 0 }, end: { line: 2, character: 0 } });
        expect(applyTo(THREE_LINES, edits)).toBe('a=1\nb=2\nc=3\n');
    });

    test('the request carries the selection field by field and a path with a range suffix', async () => {
        const { double, client, formatRange } = createHarness();
        client.open(URI_TEXT, 1, THREE_LINES);

        await formatRange(rangeParams(SELECTION_ON_LINE_ONE), CancellationToken.None);

        const call = double.formatProgramCalls[0];
        expect(call.range).toEqual(SELECTION_ON_LINE_ONE);
        expect(call.canonicalName).toBe(`${URI.parse(URI_TEXT).fsPath}#range:1-1`);
        expect('allowDenum' in call).toBe(false);
        expect(Object.keys(call.settings ?? {})).toHaveLength(15);
    });

    test('an edit that reaches past the selection is accepted at its own range, not clipped to the selection', async () => {
        const { double, client, formatRange } = createHarness();
        double.scriptFormatProgram(rangeAnswer(
            { start: { line: 0, character: 0 }, end: { line: 3, character: 0 } }, 'A=1\n  b=2\nC=3\n'));
        client.open(URI_TEXT, 1, THREE_LINES);

        const edits = await formatRange(rangeParams(SELECTION_ON_LINE_ONE), CancellationToken.None);

        expect(edits).toHaveLength(1);
        expect(edits[0].range).toEqual({ start: { line: 0, character: 0 }, end: { line: 3, character: 0 } });
        expect(applyTo(THREE_LINES, edits)).toBe('A=1\n  b=2\nC=3\n');
    });

    test('an answer without edits gives no edit', async () => {
        const { double, client, formatRange } = createHarness();
        double.scriptFormatProgram({ result: { edits: [], diagnostics: [], denumbered: false, version: '1' } });
        client.open(URI_TEXT, 1, THREE_LINES);

        expect(await formatRange(rangeParams(SELECTION_ON_LINE_ONE), CancellationToken.None)).toEqual([]);
    });

    test('a peer edit whose new text equals the text it replaces gives no edit', async () => {
        const { double, client, formatRange } = createHarness();
        double.scriptFormatProgram(rangeAnswer({ start: { line: 0, character: 0 }, end: { line: 2, character: 0 } }, 'a=1\n  b=2\n'));
        client.open(URI_TEXT, 1, THREE_LINES);

        expect(await formatRange(rangeParams(SELECTION_ON_LINE_ONE), CancellationToken.None)).toEqual([]);
    });

    test('a ranged request on save goes through the same path as any other selection', async () => {
        const { double, client, formatRange } = createHarness();
        double.scriptFormatProgram(rangeAnswer({ start: { line: 2, character: 0 }, end: { line: 3, character: 0 } }, 'C=3\n'));
        client.open(URI_TEXT, 1, THREE_LINES);

        const edits = await formatRange(rangeParams({ start: { line: 2, character: 0 }, end: { line: 2, character: 3 } }), CancellationToken.None);

        expect(edits).toEqual([{ range: { start: { line: 2, character: 0 }, end: { line: 3, character: 0 } }, newText: 'C=3\n' }]);
        expect(double.formatProgramCalls[0].canonicalName).toBe(`${URI.parse(URI_TEXT).fsPath}#range:2-2`);
    });

    test('a whole-document and a selection request started together are both answered under different names', async () => {
        const { double, client, formatDocument, formatRange } = createHarness();
        const answer = deferred<JavaInteropTestServiceProgramScript>();
        double.scriptFormatProgram({ pending: answer.promise });
        client.open(URI_TEXT, 1, THREE_LINES);

        const whole = formatDocument(documentParams(), CancellationToken.None);
        const selection = formatRange(rangeParams(SELECTION_ON_LINE_ONE), CancellationToken.None);
        answer.resolve('success');

        expect(Array.isArray(await whole)).toBe(true);
        expect(Array.isArray(await selection)).toBe(true);
        expect(double.formatProgramCalls).toHaveLength(2);
        const names = double.formatProgramCalls.map(call => call.canonicalName);
        expect(names[0]).not.toBe(names[1]);
    });
});

describe('an unexpected failure', () => {

    test('gives no edit and reaches the log at warn once per connection', async () => {
        const { double, client, formatDocument } = createHarness();
        const spies = spyOnLogger();
        vi.spyOn(double, 'formatProgram').mockRejectedValue(new TypeError('boom'));
        client.open(URI_TEXT, 1, ORIGINAL);
        const warn = spies.find(entry => entry.level === 'warn')!.spy;

        expect(await formatDocument(documentParams(), CancellationToken.None)).toEqual([]);
        expect(warn).toHaveBeenCalledTimes(1);
        expect(warn.mock.calls[0][0]).toContain('unexpected-error (TypeError)');

        expect(await formatDocument(documentParams(), CancellationToken.None)).toEqual([]);
        expect(warn).toHaveBeenCalledTimes(1);
    });
});

describe('cancellation', () => {

    test('a cancelled outcome gives no edit and logs nothing above debug', async () => {
        const { double, client, formatDocument } = createHarness();
        const spies = spyOnLogger();
        double.scriptFormatProgram({ outcome: { kind: 'cancelled' } });
        client.open(URI_TEXT, 1, ORIGINAL);

        expect(await formatDocument(documentParams(), CancellationToken.None)).toEqual([]);

        for (const level of ['warn', 'info', 'error'] as const) {
            expect(spies.find(entry => entry.level === level)?.spy, `logger.${level}`).not.toHaveBeenCalled();
        }
    });

    test('a request the peer reports as superseded gives no edit and logs nothing above debug', async () => {
        const { double, client, formatDocument } = createHarness();
        const spies = spyOnLogger();
        double.scriptFormatProgram({ error: { code: -32800, message: 'request cancelled' } });
        client.open(URI_TEXT, 1, ORIGINAL);

        expect(await formatDocument(documentParams(), CancellationToken.None)).toEqual([]);

        for (const level of ['warn', 'info', 'error'] as const) {
            expect(spies.find(entry => entry.level === level)?.spy, `logger.${level}`).not.toHaveBeenCalled();
        }
    });

    test('a caller that cancelled while the answer was outstanding gets no edit even though the answer is ok', async () => {
        const { double, client, formatDocument } = createHarness();
        const spies = spyOnLogger();
        const answer = deferred<JavaInteropTestServiceProgramScript>();
        double.scriptFormatProgram({ pending: answer.promise });
        client.open(URI_TEXT, 1, ORIGINAL);
        const source = new CancellationTokenSource();

        const result = formatDocument(documentParams(), source.token);
        source.cancel();
        answer.resolve(documentAnswer(FORMATTED));

        expect(await result).toEqual([]);
        for (const level of ['warn', 'info', 'error'] as const) {
            expect(spies.find(entry => entry.level === level)?.spy, `logger.${level}`).not.toHaveBeenCalled();
        }
    });
});

describe('tokenized programs', () => {

    test('a buffer that is a tokenized program gives no edit and is never sent', async () => {
        const { double, client, formatDocument } = createHarness();
        client.open(URI_TEXT, 1, '<<bbj>>\u0001\u0002binary');

        expect(await formatDocument(documentParams(), CancellationToken.None)).toEqual([]);
        expect(double.formatProgramCalls).toEqual([]);
    });
});
