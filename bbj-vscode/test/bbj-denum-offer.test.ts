/**
 * What happens when a format request meets a file with line numbers: formatting never denumbers by
 * itself, it raises one offer, and the user's click (however late) acts on the buffer as it is then.
 * The tests drive the whole chain from the format handler to the (fake) language client.
 */
import type { DocumentFormattingParams, DocumentRangeFormattingParams, Range, TextEdit } from 'vscode-languageserver';
import { CancellationToken } from 'vscode-jsonrpc';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { registerBoundedFormattingHandler } from '../src/language/bbj-formatting-handler.js';
import {
    DENUMBER_ACTION, DENUM_NOT_OPEN_MESSAGE, DENUM_OFFER_MESSAGE, DENUM_SUCCESS_MESSAGE
} from '../src/language/bbj-denum-service.js';
import type { JavaInteropTestServiceProgramScript } from './bbj-test-module.js';
import { createDenumHarness, deferred, denumAnswer, resetDenumHarness } from './denum-test-harness.js';

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
