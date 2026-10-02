/**
 * What the user is told when a format request does not change the buffer: one short Warning per
 * kind of problem, shown once per its own scope, never held up by a click, and never carrying the
 * document text. The service talks to the notifications module through its default messenger, so
 * these tests drive the whole chain from the format handler to the (fake) language client.
 */
import { EmptyFileSystem } from 'langium';
import type { NormalizedTextDocuments } from 'langium/lsp';
import type { Connection, DocumentFormattingParams, TextEdit } from 'vscode-languageserver';
import { CancellationToken } from 'vscode-jsonrpc';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { registerBoundedFormattingHandler } from '../src/language/bbj-formatting-handler.js';
import { FORMAT_REQUIRES_BBJ_26_03_MESSAGE } from '../src/language/bbj-format-service.js';
import {
    initNotifications, notifyJavaConnectionError, showFormatterWarningWithAction
} from '../src/language/bbj-notifications.js';
import { logger } from '../src/language/logger.js';
import {
    createBBjTestServices, type JavaInteropTestService, type JavaInteropTestServiceProgramScript
} from './bbj-test-module.js';
import { listenOnFakeConnection } from './fake-text-document-connection.js';

const URI_TEXT = 'file:///ws/demo.bbj';
const SOURCE = 'if a then print 1\n  x=1\nrem y\n';
const DEFAULT_OPTIONS = { tabSize: 4, insertSpaces: true };

type DocumentHandler = (params: DocumentFormattingParams, token: CancellationToken) => Promise<TextEdit[]>;

/** The slice of the language-client connection the notifications module talks to. */
function createFakeConnection() {
    const window = {
        showWarningMessage: vi.fn(),
        showErrorMessage: vi.fn(),
        showInformationMessage: vi.fn(),
        showDocument: vi.fn()
    };
    const sendNotification = vi.fn();
    const connection = { window, sendNotification } as unknown as Connection;
    return { connection, window, sendNotification };
}

function createHarness() {
    const { shared, BBj } = createBBjTestServices(EmptyFileSystem);
    const double = BBj.java.JavaInteropService as JavaInteropTestService;
    const textDocuments = shared.workspace.TextDocuments as unknown as NormalizedTextDocuments<TextDocument>;
    const client = listenOnFakeConnection(textDocuments);
    const handlerConnection = { onDocumentFormatting: vi.fn(), onDocumentRangeFormatting: vi.fn() };
    registerBoundedFormattingHandler(handlerConnection, shared, BBj);
    const formatDocument = handlerConnection.onDocumentFormatting.mock.calls[0][0] as DocumentHandler;
    const fake = createFakeConnection();
    initNotifications(fake.connection);
    const loggers = spyOnLogger();
    const format = (uri = URI_TEXT) => formatDocument({ textDocument: { uri }, options: DEFAULT_OPTIONS }, CancellationToken.None);
    return { BBj, double, client, format, loggers, ...fake };
}

type Harness = ReturnType<typeof createHarness>;

function spyOnLogger() {
    const spies = (['debug', 'info', 'warn', 'error'] as const).map(level => ({
        level,
        spy: vi.spyOn(logger, level).mockImplementation(() => { /* silenced */ })
    }));
    return {
        spies,
        spyFor: (level: 'debug' | 'info' | 'warn' | 'error') => spies.find(entry => entry.level === level)!.spy
    };
}

function loggedLines(loggers: Harness['loggers'], level: 'debug' | 'info' | 'warn' | 'error'): string[] {
    return loggers.spyFor(level).mock.calls.map(args => String(typeof args[0] === 'function' ? args[0]() : args[0]));
}

function deferred<T>() {
    let resolve!: (value: T) => void;
    const promise = new Promise<T>(r => { resolve = r; });
    return { promise, resolve };
}

function warnedTexts(harness: Harness): string[] {
    return harness.window.showWarningMessage.mock.calls.map(args => String(args[0]));
}

afterEach(() => {
    vi.restoreAllMocks();
    initNotifications(null as unknown as Connection);
});

describe('an older BBj without a formatter', () => {

    test('is reported once per connection and a reconnect re-arms it', async () => {
        const harness = createHarness();
        harness.double.scriptFormatProgram('method-not-found');
        harness.client.open(URI_TEXT, 1, SOURCE);

        expect(await harness.format()).toEqual([]);
        expect(await harness.format()).toEqual([]);

        expect(harness.window.showWarningMessage).toHaveBeenCalledTimes(1);
        expect(harness.window.showWarningMessage).toHaveBeenCalledWith(FORMAT_REQUIRES_BBJ_26_03_MESSAGE);
        expect(harness.window.showErrorMessage).not.toHaveBeenCalled();
        expect(harness.window.showInformationMessage).not.toHaveBeenCalled();

        harness.double.simulateReconnect();
        await harness.format();

        expect(warnedTexts(harness)).toEqual([FORMAT_REQUIRES_BBJ_26_03_MESSAGE, FORMAT_REQUIRES_BBJ_26_03_MESSAGE]);
    });

    test('shows one message when two formats meet the same answer together', async () => {
        const harness = createHarness();
        harness.double.scriptFormatProgram('method-not-found');
        harness.client.open(URI_TEXT, 1, SOURCE);

        const results = await Promise.all([harness.format(), harness.format()]);

        expect(results).toEqual([[], []]);
        expect(harness.window.showWarningMessage).toHaveBeenCalledTimes(1);
    });

    test('logs a warn line the first time and a debug line for the repeat', async () => {
        const harness = createHarness();
        harness.double.scriptFormatProgram('method-not-found');
        harness.client.open(URI_TEXT, 1, SOURCE);

        await harness.format();
        expect(harness.loggers.spyFor('warn')).toHaveBeenCalledTimes(1);
        const debugBefore = harness.loggers.spyFor('debug').mock.calls.length;

        await harness.format();

        expect(harness.loggers.spyFor('warn')).toHaveBeenCalledTimes(1);
        expect(harness.loggers.spyFor('debug').mock.calls.length).toBeGreaterThan(debugBefore);
    });

    test('has a text of its own, apart from the not-connected message', () => {
        const { connection, window } = createFakeConnection();
        initNotifications(connection);
        notifyJavaConnectionError('x');

        const notConnected = String(window.showErrorMessage.mock.calls[0][0]);
        expect(FORMAT_REQUIRES_BBJ_26_03_MESSAGE).not.toBe(notConnected);
        expect(FORMAT_REQUIRES_BBJ_26_03_MESSAGE).not.toContain('not reachable');
        expect(FORMAT_REQUIRES_BBJ_26_03_MESSAGE).not.toContain('Failed to connect');
        expect(FORMAT_REQUIRES_BBJ_26_03_MESSAGE).toBe(
            'BBj formatting requires BBj 26.03 or later. The connected BBjServices does not provide it.');
    });
});

describe('an interop connection that is not reachable', () => {

    test.each<[string, JavaInteropTestServiceProgramScript, string]>([
        ['not reachable', { outcome: { kind: 'unavailable', reason: 'not-reachable' } }, 'not-reachable'],
        ['a transport failure', 'transport-error', 'transport']
    ])('shows nothing for %s and logs one debug line naming it', async (_name, script, token) => {
        const harness = createHarness();
        harness.double.scriptFormatProgram(script);
        harness.client.open(URI_TEXT, 1, SOURCE);

        expect(await harness.format()).toEqual([]);

        expect(harness.window.showWarningMessage).not.toHaveBeenCalled();
        expect(harness.window.showErrorMessage).not.toHaveBeenCalled();
        expect(harness.window.showInformationMessage).not.toHaveBeenCalled();
        expect(harness.window.showDocument).not.toHaveBeenCalled();
        expect(harness.sendNotification).not.toHaveBeenCalled();
        expect(harness.loggers.spyFor('warn')).not.toHaveBeenCalled();
        expect(harness.loggers.spyFor('error')).not.toHaveBeenCalled();
        const named = loggedLines(harness.loggers, 'debug').filter(line => line.includes(token));
        expect(named).toHaveLength(1);
    });
});

describe('the notifications module without a usable connection', () => {

    test('resolves to undefined when it holds no connection', async () => {
        initNotifications(null as unknown as Connection);

        await expect(showFormatterWarningWithAction('text', 'Action')).resolves.toBeUndefined();
    });

    test('resolves to undefined when the prompt rejects', async () => {
        const { connection, window } = createFakeConnection();
        window.showWarningMessage.mockRejectedValue(new Error('client went away'));
        initNotifications(connection);

        await expect(showFormatterWarningWithAction('text', 'Action')).resolves.toBeUndefined();
    });

    test('resolves to the picked title', async () => {
        const { connection, window } = createFakeConnection();
        const answer = deferred<{ title: string } | undefined>();
        window.showWarningMessage.mockReturnValue(answer.promise);
        initNotifications(connection);

        const picked = showFormatterWarningWithAction('text', 'Action');
        answer.resolve({ title: 'Action' });

        await expect(picked).resolves.toBe('Action');
        expect(window.showWarningMessage).toHaveBeenCalledWith('text', { title: 'Action' });
    });
});
