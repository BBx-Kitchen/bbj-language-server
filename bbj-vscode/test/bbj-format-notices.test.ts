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
import {
    FORMAT_ENGINE_FAILED_MESSAGE, FORMAT_NOTICE_LEDGER_LIMIT, FORMAT_PROTECTED_MESSAGE,
    FORMAT_REQUIRES_BBJ_26_03_MESSAGE, FORMAT_SERVICE_UNAVAILABLE_MESSAGE, FORMAT_TIMEOUT_MESSAGE,
    FORMAT_TOO_LARGE_MESSAGE, GO_TO_LINE_ACTION, MAX_LISTED_SETTING_PROBLEMS, OPEN_SETTINGS_ACTION,
    invalidSettingsMessage, mixedNumberingMessage, type FormatMessenger
} from '../src/language/bbj-format-service.js';
import { OPEN_FORMATTER_SETTINGS_METHOD } from '../src/language/format-settings-notification.js';
import {
    initNotifications, notifyJavaConnectionError, showFormatterWarningWithAction
} from '../src/language/bbj-notifications.js';
import { logger } from '../src/language/logger.js';
import {
    createBBjTestServices, type JavaInteropTestService, type JavaInteropTestServiceProgramScript
} from './bbj-test-module.js';
import { createFakeServerConnection } from './fake-server-connection.js';
import { listenOnFakeConnection } from './fake-text-document-connection.js';

const URI_TEXT = 'file:///ws/demo.bbj';
const SOURCE = 'if a then print 1\n  x=1\nrem y\n';
const DEFAULT_OPTIONS = { tabSize: 4, insertSpaces: true };

type DocumentHandler = (params: DocumentFormattingParams, token: CancellationToken) => Promise<TextEdit[]>;

function createHarness() {
    const { shared, BBj } = createBBjTestServices(EmptyFileSystem);
    const double = BBj.java.JavaInteropService as JavaInteropTestService;
    const textDocuments = shared.workspace.TextDocuments as unknown as NormalizedTextDocuments<TextDocument>;
    const client = listenOnFakeConnection(textDocuments);
    const handlerConnection = { onDocumentFormatting: vi.fn(), onDocumentRangeFormatting: vi.fn() };
    registerBoundedFormattingHandler(handlerConnection, shared, BBj);
    const formatDocument = handlerConnection.onDocumentFormatting.mock.calls[0][0] as DocumentHandler;
    const fake = createFakeServerConnection();
    initNotifications(fake.connection);
    const loggers = spyOnLogger();
    const format = (uri = URI_TEXT) => formatDocument({ textDocument: { uri }, options: DEFAULT_OPTIONS }, CancellationToken.None);
    return { BBj, double, client, format, loggers, ...fake };
}

/** A recording stand-in for the messenger, installed on the harness's format service. */
function installRecordingMessenger(harness: Harness) {
    const messenger = {
        warn: vi.fn(),
        warnWithAction: vi.fn(),
        showDocument: vi.fn(),
        openFormatterSettings: vi.fn()
    } satisfies FormatMessenger;
    harness.BBj.compiler.BBjFormatService.setMessenger(messenger);
    return messenger;
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
        const { connection, window } = createFakeServerConnection();
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
        const { connection, window } = createFakeServerConnection();
        window.showWarningMessage.mockRejectedValue(new Error('client went away'));
        initNotifications(connection);

        await expect(showFormatterWarningWithAction('text', 'Action')).resolves.toBeUndefined();
    });

    test('resolves to the picked title', async () => {
        const { connection, window } = createFakeServerConnection();
        const answer = deferred<{ title: string } | undefined>();
        window.showWarningMessage.mockReturnValue(answer.promise);
        initNotifications(connection);

        const picked = showFormatterWarningWithAction('text', 'Action');
        answer.resolve({ title: 'Action' });

        await expect(picked).resolves.toBe('Action');
        expect(window.showWarningMessage).toHaveBeenCalledWith('text', { title: 'Action' });
    });
});

/** A wire error as bbj-ls would answer it. */
function wireError(code: number, message = 'peer message'): JavaInteropTestServiceProgramScript {
    return { error: { code, message } };
}

const FAILURE_ROWS: ReadonlyArray<[string, JavaInteropTestServiceProgramScript, string]> = [
    ['a client timeout', { outcome: { kind: 'timeout', origin: 'client' } }, FORMAT_TIMEOUT_MESSAGE],
    ['a peer timeout', wireError(-33002), FORMAT_TIMEOUT_MESSAGE],
    ['a file that is too large', wireError(-33003), FORMAT_TOO_LARGE_MESSAGE],
    ['a protected program', wireError(-33005), FORMAT_PROTECTED_MESSAGE],
    ['a format failure', wireError(-33009), FORMAT_ENGINE_FAILED_MESSAGE],
    ['a parser exception', wireError(-33001), FORMAT_ENGINE_FAILED_MESSAGE],
    ['a malformed answer', { outcome: { kind: 'malformed-result', reason: 'no text' } }, FORMAT_ENGINE_FAILED_MESSAGE],
    ['an unavailable service', wireError(-33004), FORMAT_SERVICE_UNAVAILABLE_MESSAGE]
];

describe('every failure kind has its own short Warning', () => {

    test.each(FAILURE_ROWS)('%s shows its text once and leaves the buffer alone', async (_name, script, text) => {
        const harness = createHarness();
        const messenger = installRecordingMessenger(harness);
        harness.double.scriptFormatProgram(script);
        harness.client.open(URI_TEXT, 1, SOURCE);

        expect(await harness.format()).toEqual([]);

        expect(messenger.warn).toHaveBeenCalledTimes(1);
        expect(messenger.warn).toHaveBeenCalledWith(text);
        expect(messenger.warnWithAction).not.toHaveBeenCalled();
        expect(messenger.showDocument).not.toHaveBeenCalled();
        expect(messenger.openFormatterSettings).not.toHaveBeenCalled();
    });

    test('the texts are the ones the user is meant to read', () => {
        expect(FORMAT_TIMEOUT_MESSAGE).toBe('BBj formatting timed out. The file was not changed; try again.');
        expect(FORMAT_TOO_LARGE_MESSAGE).toBe('This file is too large for BBj formatting. The file was not changed.');
        expect(FORMAT_PROTECTED_MESSAGE).toBe('This BBj program is protected and cannot be formatted.');
        expect(FORMAT_ENGINE_FAILED_MESSAGE).toBe(
            'The BBj formatter could not process this file. The file was not changed. See the BBj output for details.');
        expect(FORMAT_SERVICE_UNAVAILABLE_MESSAGE).toBe(
            'The BBj formatting service is not available right now. The file was not changed; try again later.');
    });

    test('a failed outcome with an empty peer message still shows the fixed text', async () => {
        const harness = createHarness();
        const messenger = installRecordingMessenger(harness);
        harness.double.scriptFormatProgram(wireError(-33009, ''));
        harness.client.open(URI_TEXT, 1, SOURCE);

        await harness.format();

        expect(messenger.warn).toHaveBeenCalledWith(FORMAT_ENGINE_FAILED_MESSAGE);
    });

    test('every message goes through the real messenger as a Warning and nothing else', async () => {
        const harness = createHarness();
        harness.client.open(URI_TEXT, 1, SOURCE);

        let version = 1;
        for (const [, script] of FAILURE_ROWS) {
            harness.double.scriptFormatProgram(script);
            await harness.format();
            harness.double.simulateReconnect();
            harness.client.change(URI_TEXT, ++version, [{ text: SOURCE }]);
        }

        expect(harness.window.showWarningMessage).toHaveBeenCalled();
        expect(harness.window.showErrorMessage).not.toHaveBeenCalled();
        expect(harness.window.showInformationMessage).not.toHaveBeenCalled();
        expect(harness.window.showDocument).not.toHaveBeenCalled();
        expect(harness.sendNotification).not.toHaveBeenCalled();
    });
});

describe('a message repeats only when its own scope changes', () => {

    test.each([
        ['too large', wireError(-33003), FORMAT_TOO_LARGE_MESSAGE],
        ['protected', wireError(-33005), FORMAT_PROTECTED_MESSAGE]
    ] as Array<[string, JavaInteropTestServiceProgramScript, string]>)(
        'a %s answer shows once per document and version, and an edit re-arms it', async (_name, script, text) => {
            const harness = createHarness();
            const messenger = installRecordingMessenger(harness);
            harness.double.scriptFormatProgram(script);
            harness.client.open(URI_TEXT, 1, SOURCE);

            await harness.format();
            await harness.format();
            expect(messenger.warn).toHaveBeenCalledTimes(1);

            harness.client.change(URI_TEXT, 2, [{ text: 'print 2\n' }]);
            await harness.format();

            expect(messenger.warn).toHaveBeenCalledTimes(2);
            expect(messenger.warn).toHaveBeenLastCalledWith(text);
        });

    test.each([
        ['a timeout', { outcome: { kind: 'timeout', origin: 'peer' } }, FORMAT_TIMEOUT_MESSAGE],
        ['an engine failure', wireError(-33009), FORMAT_ENGINE_FAILED_MESSAGE],
        ['an unavailable service', wireError(-33004), FORMAT_SERVICE_UNAVAILABLE_MESSAGE]
    ] as Array<[string, JavaInteropTestServiceProgramScript, string]>)(
        '%s shows once per connection however many documents hit it, and a reconnect re-arms it', async (_name, script, text) => {
            const harness = createHarness();
            const messenger = installRecordingMessenger(harness);
            harness.double.scriptFormatProgram(script);
            harness.client.open(URI_TEXT, 1, SOURCE);
            harness.client.open('file:///ws/other.bbj', 1, SOURCE);

            await harness.format(URI_TEXT);
            await harness.format('file:///ws/other.bbj');
            expect(messenger.warn).toHaveBeenCalledTimes(1);

            harness.double.simulateReconnect();
            await harness.format(URI_TEXT);

            expect(messenger.warn).toHaveBeenCalledTimes(2);
            expect(messenger.warn).toHaveBeenLastCalledWith(text);
        });

    test('a reconnect does not repeat a message about the content of an unchanged document', async () => {
        const harness = createHarness();
        const messenger = installRecordingMessenger(harness);
        harness.double.scriptFormatProgram(wireError(-33003));
        harness.client.open(URI_TEXT, 1, SOURCE);

        await harness.format();
        harness.double.simulateReconnect();
        await harness.format();

        expect(messenger.warn).toHaveBeenCalledTimes(1);
    });

    test('an engine failure and a malformed answer are separate notices on one connection', async () => {
        const harness = createHarness();
        const messenger = installRecordingMessenger(harness);
        harness.client.open(URI_TEXT, 1, SOURCE);

        harness.double.scriptFormatProgram(wireError(-33009));
        await harness.format();
        harness.double.scriptFormatProgram({ outcome: { kind: 'malformed-result', reason: 'no text' } });
        await harness.format();
        await harness.format();

        expect(messenger.warn.mock.calls.map(args => args[0])).toEqual([FORMAT_ENGINE_FAILED_MESSAGE, FORMAT_ENGINE_FAILED_MESSAGE]);
    });

    test('two different kinds on the same document and version each show once', async () => {
        const harness = createHarness();
        const messenger = installRecordingMessenger(harness);
        harness.client.open(URI_TEXT, 1, SOURCE);

        harness.double.scriptFormatProgram(wireError(-33003));
        await harness.format();
        harness.double.scriptFormatProgram(wireError(-33005));
        await harness.format();
        await harness.format();

        expect(messenger.warn.mock.calls.map(args => args[0])).toEqual([FORMAT_TOO_LARGE_MESSAGE, FORMAT_PROTECTED_MESSAGE]);
    });

    test('an invalid-params answer shows nothing, warns in the log once and then logs at debug', async () => {
        const harness = createHarness();
        const messenger = installRecordingMessenger(harness);
        harness.double.scriptFormatProgram(wireError(-32602));
        harness.client.open(URI_TEXT, 1, SOURCE);

        await harness.format();
        expect(harness.loggers.spyFor('warn')).toHaveBeenCalledTimes(1);
        await harness.format();

        expect(harness.loggers.spyFor('warn')).toHaveBeenCalledTimes(1);
        expect(messenger.warn).not.toHaveBeenCalled();
        expect(messenger.warnWithAction).not.toHaveBeenCalled();
    });

    test('a full ledger forgets its oldest notice first', async () => {
        const harness = createHarness();
        const messenger = installRecordingMessenger(harness);
        harness.double.scriptFormatProgram(wireError(-33003));
        const uris = Array.from({ length: FORMAT_NOTICE_LEDGER_LIMIT + 1 }, (_, index) => `file:///ws/doc${index}.bbj`);
        for (const uri of uris) {
            harness.client.open(uri, 1, SOURCE);
            await harness.format(uri);
        }
        expect(messenger.warn).toHaveBeenCalledTimes(uris.length);

        await harness.format(uris[uris.length - 1]);
        expect(messenger.warn).toHaveBeenCalledTimes(uris.length);

        await harness.format(uris[0]);
        expect(messenger.warn).toHaveBeenCalledTimes(uris.length + 1);
    });
});

describe('what the user and the log are never shown', () => {

    test('no message and no log line at any level carries the document text or a peer echo', async () => {
        const secret = 'SECRET_MARKER_NOTICE';
        const peerEcho = 'PEER_ECHO_MARKER';
        const harness = createHarness();
        const messenger = installRecordingMessenger(harness);
        harness.client.open(URI_TEXT, 1, `rem ${secret}\nx=1\n`);

        for (const [, script] of FAILURE_ROWS) {
            const echoing = typeof script === 'object' && 'error' in script
                ? wireError(script.error.code, `parser says ${peerEcho}`)
                : script;
            harness.double.scriptFormatProgram(echoing);
            await harness.format();
            harness.double.simulateReconnect();
        }

        expect(messenger.warn).toHaveBeenCalled();
        const shown = JSON.stringify(messenger.warn.mock.calls);
        expect(shown).not.toContain(secret);
        expect(shown).not.toContain(peerEcho);
        for (const { level, spy } of harness.loggers.spies) {
            const logged = JSON.stringify(spy.mock.calls.map(args => args.map(arg => typeof arg === 'function' ? arg() : arg)));
            expect(logged, `logger.${level}`).not.toContain(secret);
            expect(logged, `logger.${level}`).not.toContain(peerEcho);
        }
    });
});

/** A `-33007` answer naming the given settings. */
function invalidSettingsAnswer(...problems: Array<{ setting: string; message: string }>): JavaInteropTestServiceProgramScript {
    return { error: { code: -33007, message: 'invalid formatter settings', data: problems } };
}

/** A `-33008` answer for the given line (or none). */
function mixedNumberingAnswer(line?: number, extra: Record<string, unknown> = {}): JavaInteropTestServiceProgramScript {
    return { error: { code: -33008, message: 'mixed numbering', data: line === undefined ? extra : { line, ...extra } } };
}

function numberedLines(count: number): string {
    return Array.from({ length: count }, (_, index) => `x${index}=1`).join('\n');
}

describe('the invalid-settings text', () => {

    test('names one bad key with its message', () => {
        expect(invalidSettingsMessage([{ setting: 'indentWidth', message: 'must be between 0 and 16' }], key => key)).toBe(
            'Invalid BBj formatter settings: bbj.formatter.indentWidth: must be between 0 and 16. The file was not changed.');
    });

    test('lists the first five problems and counts the rest', () => {
        const problems = Array.from({ length: 7 }, (_, index) => ({ setting: `key${index + 1}`, message: `bad ${index + 1}` }));

        const text = invalidSettingsMessage(problems, key => key);

        expect(MAX_LISTED_SETTING_PROBLEMS).toBe(5);
        expect(text).toBe('Invalid BBj formatter settings: '
            + 'bbj.formatter.key1: bad 1; bbj.formatter.key2: bad 2; bbj.formatter.key3: bad 3; '
            + 'bbj.formatter.key4: bad 4; bbj.formatter.key5: bad 5; and 2 more. The file was not changed.');
    });

    test('has a text of its own for an answer without problems', () => {
        expect(invalidSettingsMessage([], key => key)).toBe('Invalid BBj formatter settings. The file was not changed.');
    });

    test('counts problems, so a long message or key with astral characters is shown whole', () => {
        const astral = '\u{1F600}'.repeat(300);

        const text = invalidSettingsMessage([{ setting: astral, message: astral }], key => key);

        expect(text).toContain(`bbj.formatter.${astral}: ${astral}`);
    });

    test('names the spelling of the key the user set', async () => {
        const harness = createHarness();
        const messenger = installRecordingMessenger(harness);
        harness.BBj.compiler.BBjFormatService.setSettings({ splitSingleLineIF: 'yes' });
        harness.double.scriptFormatProgram(invalidSettingsAnswer({ setting: 'splitSingleLineIf', message: 'must be true or false' }));
        harness.client.open(URI_TEXT, 1, SOURCE);

        await harness.format();

        expect(String(messenger.warnWithAction.mock.calls[0][0])).toContain('bbj.formatter.splitSingleLineIF: must be true or false');
    });
});

describe('invalid settings through the format request', () => {

    test('answer at once with a warning that offers Open Settings, and send the full key names on a click', async () => {
        const harness = createHarness();
        const messenger = installRecordingMessenger(harness);
        harness.double.scriptFormatProgram(invalidSettingsAnswer(
            { setting: 'indentWidth', message: 'must be between 0 and 16' },
            { setting: 'indentCharacter', message: 'must be SPACE or TAB' },
            { setting: 'indentWidth', message: 'a second complaint' }));
        harness.client.open(URI_TEXT, 1, SOURCE);

        expect(await harness.format()).toEqual([]);

        expect(messenger.warnWithAction).toHaveBeenCalledTimes(1);
        const [text, title, onAction] = messenger.warnWithAction.mock.calls[0];
        expect(title).toBe(OPEN_SETTINGS_ACTION);
        expect(text).toBe('Invalid BBj formatter settings: bbj.formatter.indentWidth: must be between 0 and 16; '
            + 'bbj.formatter.indentCharacter: must be SPACE or TAB; bbj.formatter.indentWidth: a second complaint. '
            + 'The file was not changed.');
        expect(messenger.openFormatterSettings).not.toHaveBeenCalled();

        onAction();

        expect(messenger.openFormatterSettings).toHaveBeenCalledTimes(1);
        expect(messenger.openFormatterSettings).toHaveBeenCalledWith({
            keys: ['bbj.formatter.indentWidth', 'bbj.formatter.indentCharacter']
        });
        expect(messenger.warn).not.toHaveBeenCalled();
    });

    test('an answer without problems still shows one warning with Open Settings', async () => {
        const harness = createHarness();
        const messenger = installRecordingMessenger(harness);
        harness.double.scriptFormatProgram(invalidSettingsAnswer());
        harness.client.open(URI_TEXT, 1, SOURCE);

        await harness.format();

        expect(messenger.warnWithAction).toHaveBeenCalledWith(
            'Invalid BBj formatter settings. The file was not changed.', OPEN_SETTINGS_ACTION, expect.any(Function));
        messenger.warnWithAction.mock.calls[0][2]();
        expect(messenger.openFormatterSettings).toHaveBeenCalledWith({ keys: [] });
    });

    test('shows once per settings revision across documents, and a change of the settings re-arms it', async () => {
        const harness = createHarness();
        const messenger = installRecordingMessenger(harness);
        harness.double.scriptFormatProgram(invalidSettingsAnswer({ setting: 'indentWidth', message: 'bad' }));
        harness.client.open(URI_TEXT, 1, SOURCE);
        harness.client.open('file:///ws/other.bbj', 1, SOURCE);

        await harness.format(URI_TEXT);
        await harness.format('file:///ws/other.bbj');
        expect(messenger.warnWithAction).toHaveBeenCalledTimes(1);

        harness.BBj.compiler.BBjFormatService.setSettings({ indentWidth: 99 });
        await harness.format(URI_TEXT);

        expect(messenger.warnWithAction).toHaveBeenCalledTimes(2);
    });

    test('a setting name shaped like a uri or a command only ever reaches the key list', async () => {
        const harness = createHarness();
        const messenger = installRecordingMessenger(harness);
        harness.double.scriptFormatProgram(invalidSettingsAnswer(
            { setting: 'file:///etc/passwd', message: 'bad' }, { setting: 'workbench.action.quit', message: 'bad' }));
        harness.client.open(URI_TEXT, 1, SOURCE);

        await harness.format();
        messenger.warnWithAction.mock.calls[0][2]();

        expect(messenger.showDocument).not.toHaveBeenCalled();
        expect(messenger.openFormatterSettings).toHaveBeenCalledWith({
            keys: ['bbj.formatter.file:///etc/passwd', 'bbj.formatter.workbench.action.quit']
        });
    });
});

describe('the mixed-numbering text', () => {

    test('names the line when it is known and says so when it is not', () => {
        expect(mixedNumberingMessage(3)).toBe('Mixed line numbering at line 3. The file was not changed.');
        expect(mixedNumberingMessage(undefined)).toBe('Mixed line numbering in this file. The file was not changed.');
    });
});

describe('mixed numbering through the format request', () => {

    test('offers Go to Line and jumps to the zero-based line of the request\'s own document', async () => {
        const harness = createHarness();
        const messenger = installRecordingMessenger(harness);
        harness.double.scriptFormatProgram(mixedNumberingAnswer(3));
        harness.client.open(URI_TEXT, 1, numberedLines(10));

        expect(await harness.format()).toEqual([]);

        expect(messenger.warnWithAction).toHaveBeenCalledTimes(1);
        const [text, title, onAction] = messenger.warnWithAction.mock.calls[0];
        expect(text).toBe('Mixed line numbering at line 3. The file was not changed.');
        expect(title).toBe(GO_TO_LINE_ACTION);
        expect(messenger.showDocument).not.toHaveBeenCalled();

        onAction();

        expect(messenger.showDocument).toHaveBeenCalledTimes(1);
        expect(messenger.showDocument).toHaveBeenCalledWith(URI_TEXT, 2);
    });

    test('clamps a line past the end to the last line of the document', async () => {
        const harness = createHarness();
        const messenger = installRecordingMessenger(harness);
        harness.double.scriptFormatProgram(mixedNumberingAnswer(99));
        harness.client.open(URI_TEXT, 1, numberedLines(4));

        await harness.format();
        messenger.warnWithAction.mock.calls[0][2]();

        expect(messenger.showDocument).toHaveBeenCalledWith(URI_TEXT, 3);
    });

    test('clamps against the document as it is when the button is clicked', async () => {
        const harness = createHarness();
        const messenger = installRecordingMessenger(harness);
        harness.double.scriptFormatProgram(mixedNumberingAnswer(99));
        harness.client.open(URI_TEXT, 1, numberedLines(4));

        await harness.format();
        harness.client.change(URI_TEXT, 2, [{ text: numberedLines(120) }]);
        messenger.warnWithAction.mock.calls[0][2]();

        expect(messenger.showDocument).toHaveBeenCalledWith(URI_TEXT, 98);
    });

    test('still jumps harmlessly when the document was closed in the meantime', async () => {
        const harness = createHarness();
        const messenger = installRecordingMessenger(harness);
        harness.double.scriptFormatProgram(mixedNumberingAnswer(99));
        harness.client.open(URI_TEXT, 1, numberedLines(4));

        await harness.format();
        harness.client.close(URI_TEXT);
        messenger.warnWithAction.mock.calls[0][2]();

        expect(messenger.showDocument).toHaveBeenCalledWith(URI_TEXT, 3);
    });

    test('without a line shows a plain warning and offers no action', async () => {
        const harness = createHarness();
        const messenger = installRecordingMessenger(harness);
        harness.double.scriptFormatProgram(mixedNumberingAnswer());
        harness.client.open(URI_TEXT, 1, numberedLines(4));

        await harness.format();

        expect(messenger.warn).toHaveBeenCalledWith('Mixed line numbering in this file. The file was not changed.');
        expect(messenger.warnWithAction).not.toHaveBeenCalled();
    });

    test('never takes the uri from the peer', async () => {
        const harness = createHarness();
        const messenger = installRecordingMessenger(harness);
        harness.double.scriptFormatProgram(mixedNumberingAnswer(2, { uri: 'file:///etc/passwd', path: '/etc/passwd' }));
        harness.client.open(URI_TEXT, 1, numberedLines(4));

        await harness.format();
        messenger.warnWithAction.mock.calls[0][2]();

        expect(messenger.showDocument).toHaveBeenCalledWith(URI_TEXT, 1);
    });

    test('shows once per document and version', async () => {
        const harness = createHarness();
        const messenger = installRecordingMessenger(harness);
        harness.double.scriptFormatProgram(mixedNumberingAnswer(2));
        harness.client.open(URI_TEXT, 1, numberedLines(4));

        await harness.format();
        await harness.format();
        expect(messenger.warnWithAction).toHaveBeenCalledTimes(1);

        harness.client.change(URI_TEXT, 2, [{ text: numberedLines(5) }]);
        await harness.format();
        expect(messenger.warnWithAction).toHaveBeenCalledTimes(2);
    });
});

describe('a prompt never holds up the format response', () => {

    test('a prompt that never settles leaves the response immediate', async () => {
        const harness = createHarness();
        harness.window.showWarningMessage.mockReturnValue(new Promise(() => { /* never answered */ }));
        harness.double.scriptFormatProgram(invalidSettingsAnswer({ setting: 'indentWidth', message: 'bad' }));
        harness.client.open(URI_TEXT, 1, SOURCE);

        expect(await harness.format()).toEqual([]);

        expect(harness.window.showWarningMessage).toHaveBeenCalledTimes(1);
        expect(harness.sendNotification).not.toHaveBeenCalled();
    });

    test('a late click on Open Settings sends the notification with the key names', async () => {
        const harness = createHarness();
        const answer = deferred<{ title: string } | undefined>();
        harness.window.showWarningMessage.mockReturnValue(answer.promise);
        harness.double.scriptFormatProgram(invalidSettingsAnswer({ setting: 'indentWidth', message: 'bad' }));
        harness.client.open(URI_TEXT, 1, SOURCE);

        await harness.format();
        answer.resolve({ title: 'Open Settings' });

        await vi.waitFor(() => expect(harness.sendNotification).toHaveBeenCalledTimes(1));
        expect(harness.sendNotification).toHaveBeenCalledWith(OPEN_FORMATTER_SETTINGS_METHOD, { keys: ['bbj.formatter.indentWidth'] });
    });

    test('a late click on Go to Line asks the client to show the line', async () => {
        const harness = createHarness();
        const answer = deferred<{ title: string } | undefined>();
        harness.window.showWarningMessage.mockReturnValue(answer.promise);
        harness.double.scriptFormatProgram(mixedNumberingAnswer(3));
        harness.client.open(URI_TEXT, 1, numberedLines(10));

        await harness.format();
        answer.resolve({ title: 'Go to Line' });

        await vi.waitFor(() => expect(harness.window.showDocument).toHaveBeenCalledTimes(1));
        expect(harness.window.showDocument).toHaveBeenCalledWith({
            uri: URI_TEXT,
            takeFocus: true,
            selection: { start: { line: 2, character: 0 }, end: { line: 2, character: 0 } }
        });
    });

    test('dismissing the prompt does nothing', async () => {
        const harness = createHarness();
        harness.window.showWarningMessage.mockResolvedValue(undefined);
        harness.double.scriptFormatProgram(mixedNumberingAnswer(3));
        harness.client.open(URI_TEXT, 1, numberedLines(10));

        await harness.format();
        await new Promise(resolve => setTimeout(resolve, 0));

        expect(harness.window.showDocument).not.toHaveBeenCalled();
        expect(harness.sendNotification).not.toHaveBeenCalled();
    });
});
