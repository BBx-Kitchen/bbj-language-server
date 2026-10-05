/**
 * What happens when a format request meets a file with line numbers: formatting never denumbers by
 * itself, it raises an offer on every request, and the user's click (however late) acts on the
 * buffer as it is then. Format Document, Format Selection, a save and two requests started
 * together each get their own message; the offer never takes part in the notice ledger. The tests
 * drive the whole chain from the format handler to the (fake) language client.
 */
import type { DocumentFormattingParams, DocumentRangeFormattingParams, Range, TextEdit } from 'vscode-languageserver';
import { CancellationToken } from 'vscode-jsonrpc';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { afterEach, describe, expect, test, vi } from 'vitest';
import {
    BBjFormatService, FORMAT_ENGINE_FAILED_MESSAGE, FORMAT_SERVICE_UNAVAILABLE_MESSAGE, FORMAT_TIMEOUT_MESSAGE,
    FORMAT_NOTICE_LEDGER_LIMIT, FORMAT_TOO_LARGE_MESSAGE, GO_TO_LINE_ACTION, OPEN_SETTINGS_ACTION, invalidSettingsMessage
} from '../src/language/bbj-format-service.js';
import { registerBoundedFormattingHandler } from '../src/language/bbj-formatting-handler.js';
import {
    DENUMBER_ACTION, DENUMBER_AND_FORMAT_ACTION, DENUM_AND_FORMAT_SUCCESS_MESSAGE, DENUM_NOT_OPEN_MESSAGE,
    DENUM_NOT_NUMBERED_FORMATTED_MESSAGE, DENUM_NOT_REACHABLE_MESSAGE, DENUM_NOTHING_TO_DO_MESSAGE, DENUM_OFFER_MESSAGE, DENUM_PROTECTED_MESSAGE,
    DENUM_REQUIRES_BBJ_26_03_MESSAGE, DENUM_SELECTION_MESSAGE, DENUM_STALE_MESSAGE, DENUM_SUCCESS_MESSAGE,
    DENUM_TOKENIZED_MESSAGE, SHOW_DENUM_DIAGNOSTICS_ACTION
} from '../src/language/bbj-denum-service.js';
import { DENUM_DIAGNOSTICS_METHOD } from '../src/language/denum-notifications.js';
import { OPEN_FORMATTER_SETTINGS_METHOD } from '../src/language/format-settings-notification.js';
import type { JavaInteropTestServiceProgramScript } from './bbj-test-module.js';
import { createDenumHarness, deferred, denumAnswer, loggedLines, resetDenumHarness } from './denum-test-harness.js';

const URI_TEXT = 'file:///ws/numbered.bbj';
const NUMBERED = '0010 print 1\n0020 goto 0010\n';
const DENUMBERED = 'L10: print 1\ngoto L10\n';
const NUMBERED_LATER = '0010 print 2\n0020 goto 0010\n0030 end\n';
const DENUMBERED_LATER = 'L10: print 2\ngoto L10\nend\n';
const DEFAULT_OPTIONS = { tabSize: 4, insertSpaces: true };
const WHOLE_FILE: Range = { start: { line: 0, character: 0 }, end: { line: 1, character: 0 } };

afterEach(resetDenumHarness);

/** A wire error as bbj-ls would answer it. */
function wireError(code: number): JavaInteropTestServiceProgramScript {
    return { error: { code, message: 'peer message' } };
}

const LINE_NUMBERS = wireError(-33006);

/** The DENUM harness plus the bounded format handlers on a mock connection. */
function createOfferHarness() {
    const harness = createDenumHarness();
    const handlers = { onDocumentFormatting: vi.fn(), onDocumentRangeFormatting: vi.fn() };
    registerBoundedFormattingHandler(handlers, harness.shared, harness.BBj);
    const documentHandler = handlers.onDocumentFormatting.mock.calls[0][0] as
        (params: DocumentFormattingParams, token: CancellationToken) => Promise<TextEdit[]>;
    const rangeHandler = handlers.onDocumentRangeFormatting.mock.calls[0][0] as
        (params: DocumentRangeFormattingParams, token: CancellationToken) => Promise<TextEdit[]>;
    const formatDocument = (uri = URI_TEXT) =>
        documentHandler({ textDocument: { uri }, options: DEFAULT_OPTIONS }, CancellationToken.None);
    const formatRange = (uri = URI_TEXT, range: Range = WHOLE_FILE) =>
        rangeHandler({ textDocument: { uri }, range, options: DEFAULT_OPTIONS }, CancellationToken.None);
    harness.double.scriptFormatProgram(LINE_NUMBERS);
    return { ...harness, formatDocument, formatRange };
}

type OfferHarness = ReturnType<typeof createOfferHarness>;

/** Holds the next window prompt open until the returned `answer` settles. */
function holdPrompt(harness: OfferHarness) {
    const answer = deferred<{ title: string } | undefined>();
    harness.window.showWarningMessage.mockReturnValueOnce(answer.promise);
    return answer;
}

function warned(harness: OfferHarness): string[] {
    return harness.window.showWarningMessage.mock.calls.map(args => String(args[0]));
}

function informed(harness: OfferHarness): string[] {
    return harness.window.showInformationMessage.mock.calls.map(args => String(args[0]));
}

describe('Format Document on a file with line numbers', () => {

    test('answers at once with no edits and raises one offer with both buttons', async () => {
        const harness = createOfferHarness();
        harness.client.open(URI_TEXT, 1, NUMBERED);

        expect(await harness.formatDocument()).toEqual([]);

        expect(harness.window.showWarningMessage).toHaveBeenCalledTimes(1);
        expect(harness.window.showWarningMessage).toHaveBeenCalledWith(
            DENUM_OFFER_MESSAGE, { title: 'Denumber' }, { title: 'Denumber and Format' });
        expect(harness.double.denumProgramCalls).toEqual([]);
        expect(harness.double.formatProgramCalls).toHaveLength(1);
        expect(harness.double.formatProgramCalls[0]).not.toHaveProperty('allowDenum');
        expect(harness.workspace.applyEdit).not.toHaveBeenCalled();
    });

    test('never waits for the user: a prompt that never settles leaves the response immediate', async () => {
        const harness = createOfferHarness();
        harness.window.showWarningMessage.mockReturnValue(new Promise(() => { /* never answered */ }));
        harness.client.open(URI_TEXT, 1, NUMBERED);

        expect(await harness.formatDocument()).toEqual([]);

        expect(harness.window.showWarningMessage).toHaveBeenCalledTimes(1);
    });

    test('dismissing the offer sends nothing', async () => {
        const harness = createOfferHarness();
        const answer = holdPrompt(harness);
        harness.client.open(URI_TEXT, 1, NUMBERED);

        await harness.formatDocument();
        answer.resolve(undefined);
        await new Promise(resolve => setTimeout(resolve, 0));

        expect(harness.double.denumProgramCalls).toEqual([]);
        expect(harness.workspace.applyEdit).not.toHaveBeenCalled();
        expect(warned(harness)).toEqual([DENUM_OFFER_MESSAGE]);
    });
});

describe('clicking Denumber on the offer', () => {

    test('denumbers the buffer with one edit labelled Denumber and confirms', async () => {
        const harness = createOfferHarness();
        const answer = holdPrompt(harness);
        harness.double.scriptDenumProgram(denumAnswer(DENUMBERED, 1));
        harness.client.open(URI_TEXT, 1, NUMBERED);

        await harness.formatDocument();
        expect(harness.double.denumProgramCalls).toEqual([]);
        answer.resolve({ title: DENUMBER_ACTION });

        await vi.waitFor(() => expect(informed(harness)).toEqual([DENUM_SUCCESS_MESSAGE]));
        expect(harness.double.denumProgramCalls).toEqual([{ text: NUMBERED, version: '1' }]);
        expect(harness.workspace.applyEdit).toHaveBeenCalledTimes(1);
        expect(harness.workspace.applyEdit.mock.calls[0][0]).toMatchObject({ label: 'Denumber' });
    });

    test('a late click acts on the buffer as it is then, not as it was when the offer was shown', async () => {
        const harness = createOfferHarness();
        const answer = holdPrompt(harness);
        harness.double.scriptDenumProgram(denumAnswer(DENUMBERED_LATER, 2));
        harness.client.open(URI_TEXT, 1, NUMBERED);

        await harness.formatDocument();
        harness.client.change(URI_TEXT, 2, [{ text: NUMBERED_LATER }]);
        answer.resolve({ title: DENUMBER_ACTION });

        await vi.waitFor(() => expect(harness.workspace.applyEdit).toHaveBeenCalledTimes(1));
        expect(harness.double.denumProgramCalls).toEqual([{ text: NUMBERED_LATER, version: '2' }]);
        const edit = harness.workspace.applyEdit.mock.calls[0][0] as
            { edit: { documentChanges: Array<{ textDocument: { uri: string; version: number } }> } };
        expect(edit.edit.documentChanges[0].textDocument).toEqual({ uri: URI_TEXT, version: 2 });
    });

    test('a buffer closed before the click ends with the not-open Warning and no call', async () => {
        const harness = createOfferHarness();
        const answer = holdPrompt(harness);
        harness.client.open(URI_TEXT, 1, NUMBERED);

        await harness.formatDocument();
        harness.client.close(URI_TEXT);
        answer.resolve({ title: DENUMBER_ACTION });

        await vi.waitFor(() => expect(warned(harness)).toEqual([DENUM_OFFER_MESSAGE, DENUM_NOT_OPEN_MESSAGE]));
        expect(harness.double.denumProgramCalls).toEqual([]);
        expect(harness.workspace.applyEdit).not.toHaveBeenCalled();
    });
});

describe('the formatting path on its own', () => {

    test('never denumbers: no denumProgram call and no call carrying the denumber permission', async () => {
        const harness = createOfferHarness();
        harness.client.open(URI_TEXT, 1, NUMBERED);

        await harness.formatDocument();
        await harness.formatRange();

        expect(harness.double.denumProgramCalls).toEqual([]);
        expect(harness.double.formatProgramCalls.length).toBeGreaterThan(0);
        for (const call of harness.double.formatProgramCalls) {
            expect(call).not.toHaveProperty('allowDenum');
        }
    });
});

const FORMATTED = 'L10: print 1\n\ngoto L10\n';

/** Raises the offer on a fresh buffer and returns the held prompt, so a test decides when and what the user picks. */
async function raiseOffer(harness: OfferHarness, text = NUMBERED) {
    const answer = holdPrompt(harness);
    harness.client.open(URI_TEXT, 1, text);
    await harness.formatDocument();
    return answer;
}

/** Raises the offer, scripts what bbj-ls answers to the next format call and clicks Denumber and Format. */
async function clickDenumberAndFormat(harness: OfferHarness, script: JavaInteropTestServiceProgramScript, text = NUMBERED) {
    const answer = await raiseOffer(harness, text);
    harness.double.scriptFormatProgram(script);
    answer.resolve({ title: DENUMBER_AND_FORMAT_ACTION });
}

function formattedAnswer(text = FORMATTED, version = 1, diagnostics: Parameters<typeof denumAnswer>[2] = []) {
    return denumAnswer(text, version, diagnostics);
}

type AppliedEdit = { label: string; edit: { documentChanges: Array<{ textDocument: { uri: string; version: number }; edits: TextEdit[] }> } };

describe('clicking Denumber and Format on the offer', () => {

    test('sends one format call with the denumber permission and the 15 settings, and no DENUM call', async () => {
        const harness = createOfferHarness();
        await clickDenumberAndFormat(harness, formattedAnswer());

        await vi.waitFor(() => expect(harness.workspace.applyEdit).toHaveBeenCalledTimes(1));
        expect(harness.double.formatProgramCalls).toHaveLength(2);
        const call = harness.double.formatProgramCalls[1];
        const settings = harness.BBj.compiler.BBjFormatService.settingsSnapshot();
        expect(Object.keys(settings)).toHaveLength(15);
        expect(call).toEqual({ text: NUMBERED, version: '1', settings, allowDenum: true });
        expect(call).not.toHaveProperty('canonicalName');
        expect(call).not.toHaveProperty('range');
        expect(harness.double.denumProgramCalls).toEqual([]);
    });

    test('applies the answer as one edit labelled Denumber and Format and confirms', async () => {
        const harness = createOfferHarness();
        await clickDenumberAndFormat(harness, formattedAnswer());

        await vi.waitFor(() => expect(informed(harness)).toEqual([DENUM_AND_FORMAT_SUCCESS_MESSAGE]));
        expect(DENUM_AND_FORMAT_SUCCESS_MESSAGE).toBe('Denumbered and formatted.');
        expect(harness.workspace.applyEdit).toHaveBeenCalledTimes(1);
        const applied = harness.workspace.applyEdit.mock.calls[0][0] as AppliedEdit;
        expect(applied.label).toBe('Denumber and Format');
        expect(applied.edit.documentChanges).toHaveLength(1);
        expect(applied.edit.documentChanges[0].edits).toHaveLength(1);
        expect(applied.edit.documentChanges[0].textDocument).toEqual({ uri: URI_TEXT, version: 1 });
        expect(TextDocument.applyEdits(TextDocument.create(URI_TEXT, 'bbj', 1, NUMBERED), applied.edit.documentChanges[0].edits))
            .toBe(FORMATTED);
    });

    test('sends the diagnostics list after the apply and shows the counts with Show', async () => {
        const harness = createOfferHarness();
        await clickDenumberAndFormat(harness, formattedAnswer(FORMATTED, 1,
            [{ line: 1, originalLineNumber: '0010', severity: 'ERROR', message: 'bad statement' }]));

        await vi.waitFor(() => expect(warned(harness)).toEqual([DENUM_OFFER_MESSAGE, 'Denumbered and formatted. 1 error.']));
        expect(harness.window.showWarningMessage).toHaveBeenLastCalledWith(
            'Denumbered and formatted. 1 error.', { title: SHOW_DENUM_DIAGNOSTICS_ACTION });
        expect(harness.sendNotification).toHaveBeenCalledTimes(1);
        expect(harness.sendNotification.mock.calls[0][0]).toBe(DENUM_DIAGNOSTICS_METHOD);
        expect(harness.workspace.applyEdit.mock.invocationCallOrder[0])
            .toBeLessThan(harness.sendNotification.mock.invocationCallOrder[0]);
    });

    test('a file that turns out to have no line numbers gets the format edit and a message that says it was formatted', async () => {
        const harness = createOfferHarness();
        await clickDenumberAndFormat(harness,
            { result: { text: 'print 1\n', diagnostics: [], denumbered: false, version: '1' } });

        await vi.waitFor(() => expect(informed(harness)).toEqual([DENUM_NOT_NUMBERED_FORMATTED_MESSAGE]));
        expect(harness.workspace.applyEdit).toHaveBeenCalledTimes(1);
        expect(harness.sendNotification).not.toHaveBeenCalled();
    });

    test('a file that turns out to have no line numbers and needs no format edit applies nothing', async () => {
        const harness = createOfferHarness();
        await clickDenumberAndFormat(harness,
            { result: { text: NUMBERED, diagnostics: [], denumbered: false, version: '1' } });

        await vi.waitFor(() => expect(informed(harness)).toEqual([DENUM_NOTHING_TO_DO_MESSAGE]));
        expect(harness.workspace.applyEdit).not.toHaveBeenCalled();
        expect(harness.sendNotification).not.toHaveBeenCalled();
    });
});

describe('every way Denumber and Format can fail', () => {

    const invalidProblems = [
        { setting: 'indentWidth', message: 'must be between 0 and 16' },
        { setting: 'indentCharacter', message: 'must be SPACE or TAB' }
    ];

    test.each<[string, JavaInteropTestServiceProgramScript, string]>([
        ['a file that is too large', wireError(-33003), FORMAT_TOO_LARGE_MESSAGE],
        ['a format failure', wireError(-33009), FORMAT_ENGINE_FAILED_MESSAGE],
        ['a malformed answer', { outcome: { kind: 'malformed-result', reason: 'no text' } }, FORMAT_ENGINE_FAILED_MESSAGE],
        ['a range answer', {
            outcome: { kind: 'ok', result: { scope: 'range', edits: [], diagnostics: [], denumbered: false, version: '1' } }
        }, FORMAT_ENGINE_FAILED_MESSAGE],
        ['a client timeout', { outcome: { kind: 'timeout', origin: 'client' } }, FORMAT_TIMEOUT_MESSAGE],
        ['an unavailable service', wireError(-33004), FORMAT_SERVICE_UNAVAILABLE_MESSAGE],
        ['a protected program', wireError(-33005), DENUM_PROTECTED_MESSAGE],
        ['an older BBjServices', 'method-not-found', DENUM_REQUIRES_BBJ_26_03_MESSAGE],
        ['a transport failure', 'transport-error', DENUM_NOT_REACHABLE_MESSAGE]
    ])('%s ends in exactly one Warning and changes nothing', async (_name, script, text) => {
        const harness = createOfferHarness();
        await clickDenumberAndFormat(harness, script);

        await vi.waitFor(() => expect(warned(harness)).toEqual([DENUM_OFFER_MESSAGE, text]));
        expect(harness.window.showWarningMessage).toHaveBeenLastCalledWith(text);
        expect(harness.workspace.applyEdit).not.toHaveBeenCalled();
        expect(harness.sendNotification).not.toHaveBeenCalled();
        expect(informed(harness)).toEqual([]);
    });

    test('invalid settings name the keys and offer Open Settings, which sends the full key names', async () => {
        const harness = createOfferHarness();
        const expected = harness.BBj.compiler.BBjFormatService.describeInvalidSettings(invalidProblems).text;
        const answer = await raiseOffer(harness);
        harness.double.scriptFormatProgram({ error: { code: -33007, message: 'invalid', data: invalidProblems } });
        harness.window.showWarningMessage.mockReturnValueOnce(Promise.resolve({ title: OPEN_SETTINGS_ACTION }));
        answer.resolve({ title: DENUMBER_AND_FORMAT_ACTION });

        await vi.waitFor(() => expect(harness.sendNotification).toHaveBeenCalledTimes(1));
        expect(warned(harness)).toEqual([DENUM_OFFER_MESSAGE, expected]);
        expect(harness.window.showWarningMessage).toHaveBeenLastCalledWith(expected, { title: OPEN_SETTINGS_ACTION });
        expect(harness.sendNotification).toHaveBeenCalledWith(OPEN_FORMATTER_SETTINGS_METHOD, {
            keys: ['bbj.formatter.indentWidth', 'bbj.formatter.indentCharacter']
        });
        expect(harness.workspace.applyEdit).not.toHaveBeenCalled();
    });

    test('mixed numbering names the line and offers Go to Line', async () => {
        const harness = createOfferHarness();
        await clickDenumberAndFormat(harness, { error: { code: -33008, message: 'mixed', data: { line: 2 } } });

        await vi.waitFor(() => expect(warned(harness)).toHaveLength(2));
        expect(harness.window.showWarningMessage).toHaveBeenLastCalledWith(
            'Mixed line numbering at line 2. The file was not changed.', { title: GO_TO_LINE_ACTION });
        expect(harness.workspace.applyEdit).not.toHaveBeenCalled();
    });

    test('a tokenized buffer is never sent', async () => {
        const harness = createOfferHarness();
        harness.client.open(URI_TEXT, 1, '<<bbj>>abc');

        const result = await harness.service.runDenumAndFormat(
            { uri: URI_TEXT, current: () => harness.textDocuments.get(URI_TEXT) }, CancellationToken.None);

        expect(result.status).toBe('failed');
        expect(warned(harness)).toEqual([DENUM_TOKENIZED_MESSAGE]);
        expect(harness.double.formatProgramCalls).toEqual([]);
    });

    test('a buffer that changes during the call drops the answer', async () => {
        const harness = createOfferHarness();
        const gate = deferred<JavaInteropTestServiceProgramScript>();
        harness.double.scriptFormatProgram({ pending: gate.promise });
        harness.client.open(URI_TEXT, 1, NUMBERED);

        const running = harness.service.runDenumAndFormat(
            { uri: URI_TEXT, current: () => harness.textDocuments.get(URI_TEXT) }, CancellationToken.None);
        await vi.waitFor(() => expect(harness.double.formatProgramCalls).toHaveLength(1));
        harness.client.change(URI_TEXT, 2, [{ text: NUMBERED_LATER }]);
        gate.resolve(formattedAnswer());
        const result = await running;

        expect(result).toMatchObject({ status: 'failed', reason: 'stale' });
        expect(warned(harness)).toEqual([DENUM_STALE_MESSAGE]);
        expect(harness.workspace.applyEdit).not.toHaveBeenCalled();
    });
});

describe('the invalid-settings text shared by formatting and Denumber and Format', () => {

    test('describeInvalidSettings gives the text and the full key names the format notice uses', () => {
        const harness = createOfferHarness();
        const problems = [{ setting: 'indentWidth', message: 'bad' }, { setting: 'indentWidth', message: 'worse' }];

        const described = harness.BBj.compiler.BBjFormatService.describeInvalidSettings(problems);

        expect(described.text).toBe(invalidSettingsMessage(problems, key => key));
        expect(described.keys).toEqual(['bbj.formatter.indentWidth']);
    });
});

/** Formatting on its own never denumbers: no DENUM call and no format call carrying the denumber permission. */
function expectNoDenumberingYet(harness: OfferHarness): void {
    expect(harness.double.denumProgramCalls).toEqual([]);
    for (const call of harness.double.formatProgramCalls) {
        expect(call).not.toHaveProperty('allowDenum');
    }
}

describe('Format Selection on a file with line numbers', () => {

    test('answers at once with no edits and explains, offering Denumber only', async () => {
        const harness = createOfferHarness();
        harness.client.open(URI_TEXT, 1, NUMBERED);

        expect(await harness.formatRange()).toEqual([]);

        expect(harness.window.showWarningMessage).toHaveBeenCalledTimes(1);
        expect(harness.window.showWarningMessage).toHaveBeenCalledWith(DENUM_SELECTION_MESSAGE, { title: 'Denumber' });
        expect(DENUM_SELECTION_MESSAGE).toBe('Formatting a selection needs a file without line numbers. Denumber the file first.');
        expectNoDenumberingYet(harness);
    });

    test('picking Denumber runs a plain DENUM and never a combined run', async () => {
        const harness = createOfferHarness();
        const answer = holdPrompt(harness);
        harness.double.scriptDenumProgram(denumAnswer(DENUMBERED, 1));
        harness.client.open(URI_TEXT, 1, NUMBERED);

        await harness.formatRange();
        answer.resolve({ title: DENUMBER_ACTION });

        await vi.waitFor(() => expect(informed(harness)).toEqual([DENUM_SUCCESS_MESSAGE]));
        expect(harness.double.denumProgramCalls).toEqual([{ text: NUMBERED, version: '1' }]);
        expect(harness.double.formatProgramCalls).toHaveLength(1);
        expect(harness.double.formatProgramCalls[0]).not.toHaveProperty('allowDenum');
    });

    test('Format Selection shows the explanation on every request', async () => {
        const harness = createOfferHarness();
        harness.client.open(URI_TEXT, 1, NUMBERED);

        await harness.formatRange();
        await harness.formatRange();

        expect(warned(harness)).toEqual([DENUM_SELECTION_MESSAGE, DENUM_SELECTION_MESSAGE]);
        for (const call of harness.window.showWarningMessage.mock.calls) {
            expect(call.slice(1)).toEqual([{ title: 'Denumber' }]);
        }
        expectNoDenumberingYet(harness);
    });
});

describe('every request on a file with line numbers raises its own message', () => {

    test('Format Document shows the offer on every request, edited or not', async () => {
        const harness = createOfferHarness();
        harness.client.open(URI_TEXT, 1, NUMBERED);

        expect(await harness.formatDocument()).toEqual([]);
        expectNoDenumberingYet(harness);
        expect(await harness.formatDocument()).toEqual([]);
        expectNoDenumberingYet(harness);
        expect(warned(harness)).toEqual([DENUM_OFFER_MESSAGE, DENUM_OFFER_MESSAGE]);

        harness.client.change(URI_TEXT, 2, [{ text: NUMBERED_LATER }]);
        expect(await harness.formatDocument()).toEqual([]);
        expectNoDenumberingYet(harness);

        expect(warned(harness)).toEqual([DENUM_OFFER_MESSAGE, DENUM_OFFER_MESSAGE, DENUM_OFFER_MESSAGE]);
        for (const call of harness.window.showWarningMessage.mock.calls) {
            expect(call.slice(1)).toEqual([{ title: 'Denumber' }, { title: 'Denumber and Format' }]);
        }
    });

    test('picking Denumber on the second of two offers runs one DENUM on the buffer, so an earlier offer did nothing', async () => {
        const harness = createOfferHarness();
        harness.double.scriptDenumProgram(denumAnswer(DENUMBERED, 1));
        harness.client.open(URI_TEXT, 1, NUMBERED);

        await harness.formatDocument();
        expectNoDenumberingYet(harness);
        const second = holdPrompt(harness);
        await harness.formatDocument();
        expectNoDenumberingYet(harness);
        second.resolve({ title: DENUMBER_ACTION });

        await vi.waitFor(() => expect(informed(harness)).toEqual([DENUM_SUCCESS_MESSAGE]));
        expect(harness.double.denumProgramCalls).toEqual([{ text: NUMBERED, version: '1' }]);
        expect(harness.workspace.applyEdit).toHaveBeenCalledTimes(1);
    });

    test('a save is the same request as Format Document and gets the offer again', async () => {
        const harness = createOfferHarness();
        harness.client.open(URI_TEXT, 1, NUMBERED);

        await harness.formatDocument();
        harness.client.change(URI_TEXT, 1, [{ text: NUMBERED }]);
        await harness.formatDocument();

        expect(warned(harness)).toEqual([DENUM_OFFER_MESSAGE, DENUM_OFFER_MESSAGE]);
        expectNoDenumberingYet(harness);
    });

    test.each([
        ['the selection first', ['range', 'document', 'range', 'document'], [DENUM_SELECTION_MESSAGE, DENUM_OFFER_MESSAGE, DENUM_SELECTION_MESSAGE, DENUM_OFFER_MESSAGE]],
        ['the document first', ['document', 'range', 'range', 'document'], [DENUM_OFFER_MESSAGE, DENUM_SELECTION_MESSAGE, DENUM_SELECTION_MESSAGE, DENUM_OFFER_MESSAGE]]
    ] as Array<[string, Array<'range' | 'document'>, string[]]>)(
        'the explanation and the offer never suppress each other, with %s', async (_name, order, expected) => {
            const harness = createOfferHarness();
            harness.client.open(URI_TEXT, 1, NUMBERED);

            for (const kind of order) {
                await (kind === 'range' ? harness.formatRange() : harness.formatDocument());
                expectNoDenumberingYet(harness);
            }

            expect(warned(harness)).toEqual(expected);
        });

    test('two format requests started together each answer at once and each raise the offer', async () => {
        const harness = createOfferHarness();
        harness.client.open(URI_TEXT, 1, NUMBERED);

        const results = await Promise.all([harness.formatDocument(), harness.formatDocument()]);

        expect(results).toEqual([[], []]);
        expect(warned(harness)).toEqual([DENUM_OFFER_MESSAGE, DENUM_OFFER_MESSAGE]);
        expectNoDenumberingYet(harness);
    });
});

describe('the offer and the notice ledger', () => {

    test('two requests on one version each answer at once while every prompt stays open', async () => {
        const harness = createOfferHarness();
        harness.window.showWarningMessage.mockReturnValue(new Promise(() => { /* never answered */ }));
        harness.client.open(URI_TEXT, 1, NUMBERED);

        expect(await harness.formatDocument()).toEqual([]);
        expect(await harness.formatDocument()).toEqual([]);

        expect(warned(harness)).toEqual([DENUM_OFFER_MESSAGE, DENUM_OFFER_MESSAGE]);
        expectNoDenumberingYet(harness);
    });

    test('any number of offers never pushes another notice out of the ledger', async () => {
        const harness = createOfferHarness();
        const otherUri = 'file:///ws/large.bbj';
        harness.client.open(URI_TEXT, 1, NUMBERED);
        harness.client.open(otherUri, 1, 'print 1\n');
        const tooLarge = () => warned(harness).filter(text => text === FORMAT_TOO_LARGE_MESSAGE);

        harness.double.scriptFormatProgram(wireError(-33003));
        await harness.formatDocument(otherUri);
        expect(tooLarge()).toHaveLength(1);

        harness.double.scriptFormatProgram(LINE_NUMBERS);
        for (let version = 2; version <= FORMAT_NOTICE_LEDGER_LIMIT + 2; version++) {
            harness.client.change(URI_TEXT, version, [{ text: `${NUMBERED}${'0030 rem edit\n'.repeat(version)}` }]);
            await harness.formatDocument();
        }
        expect(warned(harness).filter(text => text === DENUM_OFFER_MESSAGE)).toHaveLength(FORMAT_NOTICE_LEDGER_LIMIT + 1);

        harness.double.scriptFormatProgram(wireError(-33003));
        await harness.formatDocument(otherUri);

        expect(tooLarge()).toHaveLength(1);
        expectNoDenumberingYet(harness);
    });
});

describe('a file the offer must never be raised for', () => {

    test.each([['an unnumbered buffer', 'print 1\n'], ['an empty buffer', '']])(
        '%s that bbj-ls formats raises no offer', async (_name, text) => {
            const harness = createOfferHarness();
            harness.double.scriptFormatProgram('success');
            const offer = vi.spyOn(harness.service, 'offer');
            harness.client.open(URI_TEXT, 1, text);

            await harness.formatDocument();
            await harness.formatRange();

            expect(offer).not.toHaveBeenCalled();
            expect(harness.window.showWarningMessage).not.toHaveBeenCalled();
            expectNoDenumberingYet(harness);
        });

    test('an offer that throws still answers [] and leaves only a fixed debug line', async () => {
        const harness = createOfferHarness();
        vi.spyOn(harness.service, 'offer').mockImplementation(() => { throw new Error('SECRET_MARKER_OFFER_FAILURE'); });
        harness.client.open(URI_TEXT, 1, NUMBERED);

        expect(await harness.formatDocument()).toEqual([]);

        const lines = loggedLines(harness.loggers, 'debug');
        expect(lines).toContain('Format notice: denum-needed not offered (offer failed)');
        for (const level of ['debug', 'info', 'warn', 'error'] as const) {
            expect(loggedLines(harness.loggers, level).join('\n'), `logger.${level}`).not.toContain('SECRET_MARKER_OFFER_FAILURE');
        }
    });

    test('a format service without a denumber service answers [] and shows nothing', async () => {
        const harness = createOfferHarness();
        const service = new BBjFormatService({ java: { JavaInteropService: harness.double } });
        const document = TextDocument.create(URI_TEXT, 'bbj', 1, NUMBERED);

        const edits = await service.format({ document, current: () => document }, CancellationToken.None);

        expect(edits).toEqual([]);
        expect(harness.window.showWarningMessage).not.toHaveBeenCalled();
        expect(harness.double.denumProgramCalls).toEqual([]);
    });
});

describe('what the offer is made of', () => {

    test('the offer and the explanation are fixed texts that no character of the buffer can change', async () => {
        const secret = 'SECRET_MARKER_OFFER';
        const harness = createOfferHarness();
        harness.client.open(URI_TEXT, 1, `0010 rem ${secret}\n0020 print 1\n`);

        await harness.formatDocument();
        await harness.formatRange();

        expect(harness.window.showWarningMessage.mock.calls).toEqual([
            [DENUM_OFFER_MESSAGE, { title: 'Denumber' }, { title: 'Denumber and Format' }],
            [DENUM_SELECTION_MESSAGE, { title: 'Denumber' }]
        ]);
        expect(JSON.stringify(harness.window.showWarningMessage.mock.calls)).not.toContain(secret);
        for (const level of ['debug', 'info', 'warn', 'error'] as const) {
            expect(loggedLines(harness.loggers, level).join('\n'), `logger.${level}`).not.toContain(secret);
        }
    });
});
