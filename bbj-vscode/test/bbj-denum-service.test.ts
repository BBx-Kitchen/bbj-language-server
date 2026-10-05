/**
 * How a DENUM run ends when the world moves under it: the buffer changes or closes during the call,
 * the editor refuses the edit, two runs overlap, the caller cancels, the program is tokenized, empty
 * or full of non-ASCII text. The service talks to the notifications module through its default
 * messenger, so these tests drive the whole chain to the (fake) language client.
 */
import { CancellationTokenSource } from 'vscode-jsonrpc';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { afterEach, describe, expect, test, vi } from 'vitest';
import {
    DENUM_FAILED_MESSAGE, DENUM_IN_PROGRESS_MESSAGE, DENUM_NOT_APPLIED_MESSAGE, DENUM_NOTHING_TO_DO_MESSAGE,
    DENUM_STALE_MESSAGE, DENUM_SUCCESS_MESSAGE, DENUM_TOKENIZED_MESSAGE
} from '../src/language/bbj-denum-service.js';
import {
    createDenumHarness, deferred, denumAnswer, installRecordingMessenger, loggedLines, resetDenumHarness,
    type DenumHarness
} from './denum-test-harness.js';
import { APPLY_EDIT_TIMEOUT_MS } from '../src/language/bbj-notifications.js';
import type { JavaInteropTestServiceProgramScript } from './bbj-test-module.js';

const URI_TEXT = 'file:///ws/numbered.bbj';
const NUMBERED = '0010 print 1\n0020 goto 0010\n';
const DENUMBERED = 'L10: print 1\ngoto L10\n';

afterEach(resetDenumHarness);

/** Holds the scripted answer back until the returned `release` is called. */
function holdAnswer(harness: DenumHarness, text = DENUMBERED, version = 1) {
    const gate = deferred<JavaInteropTestServiceProgramScript>();
    harness.double.scriptDenumProgram({ pending: gate.promise });
    return { release: () => gate.resolve(denumAnswer(text, version)) };
}

function warned(harness: DenumHarness): string[] {
    return harness.window.showWarningMessage.mock.calls.map(args => String(args[0]));
}

function informed(harness: DenumHarness): string[] {
    return harness.window.showInformationMessage.mock.calls.map(args => String(args[0]));
}

describe('a file without line numbers', () => {

    test.each([['an unnumbered buffer', 'print 1\n'], ['an empty buffer', '']])(
        '%s is nothing to do: one Information message and no edit', async (_name, text) => {
            const harness = createDenumHarness();
            harness.client.open(URI_TEXT, 1, text);

            const result = await harness.run(URI_TEXT);

            expect(result.status).toBe('not-line-numbered');
            expect(result.edits).toBeUndefined();
            expect(informed(harness)).toEqual([DENUM_NOTHING_TO_DO_MESSAGE]);
            expect(warned(harness)).toEqual([]);
            expect(harness.workspace.applyEdit).not.toHaveBeenCalled();
        });
});

describe('a buffer that changes while bbj-ls is denumbering', () => {

    test('a change drops the answer: one Warning and nothing applied', async () => {
        const harness = createDenumHarness();
        harness.client.open(URI_TEXT, 1, NUMBERED);
        const held = holdAnswer(harness);

        const running = harness.run(URI_TEXT);
        harness.client.change(URI_TEXT, 2, [{ text: '0010 print 2\n' }]);
        held.release();
        const result = await running;

        expect(result).toMatchObject({ status: 'failed', reason: 'stale', message: DENUM_STALE_MESSAGE });
        expect(warned(harness)).toEqual([DENUM_STALE_MESSAGE]);
        expect(informed(harness)).toEqual([]);
        expect(harness.workspace.applyEdit).not.toHaveBeenCalled();
    });

    test('closing the buffer ends the same way', async () => {
        const harness = createDenumHarness();
        harness.client.open(URI_TEXT, 1, NUMBERED);
        const held = holdAnswer(harness);

        const running = harness.run(URI_TEXT);
        harness.client.close(URI_TEXT);
        held.release();
        const result = await running;

        expect(result.reason).toBe('stale');
        expect(warned(harness)).toEqual([DENUM_STALE_MESSAGE]);
        expect(harness.workspace.applyEdit).not.toHaveBeenCalled();
    });
});

describe('an editor that refuses the edit', () => {

    test('answering applied false ends with one Warning and no Information message', async () => {
        const harness = createDenumHarness();
        harness.workspace.applyEdit.mockResolvedValue({ applied: false });
        harness.double.scriptDenumProgram(denumAnswer(DENUMBERED, 1));
        harness.client.open(URI_TEXT, 1, NUMBERED);

        const result = await harness.run(URI_TEXT);

        expect(result).toMatchObject({ status: 'failed', reason: 'not-applied', message: DENUM_NOT_APPLIED_MESSAGE });
        expect(warned(harness)).toEqual([DENUM_NOT_APPLIED_MESSAGE]);
        expect(informed(harness)).toEqual([]);
    });

    test('rejecting the request ends the same way', async () => {
        const harness = createDenumHarness();
        harness.workspace.applyEdit.mockRejectedValue(new Error('closed'));
        harness.double.scriptDenumProgram(denumAnswer(DENUMBERED, 1));
        harness.client.open(URI_TEXT, 1, NUMBERED);

        const result = await harness.run(URI_TEXT);

        expect(result.reason).toBe('not-applied');
        expect(warned(harness)).toEqual([DENUM_NOT_APPLIED_MESSAGE]);
        expect(informed(harness)).toEqual([]);
    });

    test('never answering ends as not applied after the deadline and frees the document', async () => {
        vi.useFakeTimers();
        try {
            const harness = createDenumHarness();
            harness.workspace.applyEdit.mockReturnValue(new Promise(() => { /* never settles */ }));
            harness.double.scriptDenumProgram(denumAnswer(DENUMBERED, 1));
            harness.client.open(URI_TEXT, 1, NUMBERED);

            const running = harness.run(URI_TEXT);
            await vi.advanceTimersByTimeAsync(APPLY_EDIT_TIMEOUT_MS);
            const result = await running;

            expect(result).toMatchObject({ status: 'failed', reason: 'not-applied', message: DENUM_NOT_APPLIED_MESSAGE });
            expect(warned(harness)).toEqual([DENUM_NOT_APPLIED_MESSAGE]);

            harness.workspace.applyEdit.mockResolvedValue({ applied: true });
            const next = await harness.run(URI_TEXT);
            expect(next.reason).not.toBe('in-progress');
            expect(next.status).toBe('denumbered');
        } finally {
            vi.useRealTimers();
        }
    });
});

describe('overlapping runs', () => {

    test('a second run for the same document ends at once while the first still ends with its own message', async () => {
        const harness = createDenumHarness();
        harness.client.open(URI_TEXT, 1, NUMBERED);
        const held = holdAnswer(harness);

        const first = harness.run(URI_TEXT);
        const second = await harness.run(URI_TEXT);

        expect(second).toMatchObject({ status: 'failed', reason: 'in-progress', message: DENUM_IN_PROGRESS_MESSAGE });
        expect(warned(harness)).toEqual([DENUM_IN_PROGRESS_MESSAGE]);
        expect(harness.double.denumProgramCalls).toHaveLength(1);

        held.release();
        const firstResult = await first;

        expect(firstResult.status).toBe('denumbered');
        expect(informed(harness)).toEqual([DENUM_SUCCESS_MESSAGE]);

        harness.double.scriptDenumProgram('success');
        await harness.run(URI_TEXT);
        expect(harness.double.denumProgramCalls).toHaveLength(2);
    });

    test('runs for different documents proceed in parallel', async () => {
        const harness = createDenumHarness();
        harness.client.open('file:///ws/a.bbj', 1, NUMBERED);
        harness.client.open('file:///ws/b.bbj', 1, NUMBERED);
        const held = holdAnswer(harness);

        const first = harness.run('file:///ws/a.bbj');
        const second = harness.run('file:///ws/b.bbj');

        expect(harness.double.denumProgramCalls).toHaveLength(2);
        expect(warned(harness)).toEqual([]);
        held.release();
        await Promise.all([first, second]);
    });
});

describe('a run that ends without a result', () => {

    test('a cancelling caller ends silently and frees the document', async () => {
        const harness = createDenumHarness();
        harness.client.open(URI_TEXT, 1, NUMBERED);
        const held = holdAnswer(harness);
        const source = new CancellationTokenSource();

        const running = harness.run(URI_TEXT, source.token);
        source.cancel();
        held.release();
        const result = await running;

        expect(result).toEqual({ status: 'failed', reason: 'cancelled' });
        expect(warned(harness)).toEqual([]);
        expect(informed(harness)).toEqual([]);
        expect(harness.workspace.applyEdit).not.toHaveBeenCalled();
        expect(loggedLines(harness.loggers, 'debug').filter(line => line.includes('cancelled'))).toHaveLength(1);

        harness.double.scriptDenumProgram('success');
        await harness.run(URI_TEXT);
        expect(harness.double.denumProgramCalls).toHaveLength(2);
    });

    test('an interop client that rejects ends with the failed Warning and frees the document', async () => {
        const harness = createDenumHarness();
        harness.client.open(URI_TEXT, 1, NUMBERED);
        const failing = vi.spyOn(harness.double, 'denumProgram').mockRejectedValue(new Error('boom'));

        const result = await harness.run(URI_TEXT);

        expect(result).toMatchObject({ status: 'failed', reason: 'denum-failed', message: DENUM_FAILED_MESSAGE });
        expect(warned(harness)).toEqual([DENUM_FAILED_MESSAGE]);

        failing.mockRestore();
        harness.double.scriptDenumProgram('success');
        const next = await harness.run(URI_TEXT);
        expect(next.reason).not.toBe('in-progress');
        expect(harness.double.denumProgramCalls).toHaveLength(1);
    });
});

describe('what is sent to bbj-ls', () => {

    test('is the buffer text and its version, never a canonical name', async () => {
        const harness = createDenumHarness();
        harness.client.open(URI_TEXT, 1, NUMBERED);

        await harness.run(URI_TEXT);

        expect(harness.double.denumProgramCalls).toEqual([{ text: NUMBERED, version: '1' }]);
        expect('canonicalName' in harness.double.denumProgramCalls[0]).toBe(false);
    });

    test('a tokenized program is never sent: one Warning pointing to Decompile', async () => {
        const harness = createDenumHarness();
        harness.client.open(URI_TEXT, 1, '<<bbj>>\u0001\u0002binary-looking text');

        const result = await harness.run(URI_TEXT);

        expect(result).toMatchObject({ status: 'failed', reason: 'tokenized', message: DENUM_TOKENIZED_MESSAGE });
        expect(warned(harness)).toEqual([DENUM_TOKENIZED_MESSAGE]);
        expect(harness.double.denumProgramCalls).toEqual([]);
    });

    test.each(['<<BBJ>>abc', ' <<bbj>>abc'])('the tokenized prefix is exact: %j is sent', async text => {
        const harness = createDenumHarness();
        harness.client.open(URI_TEXT, 1, text);

        await harness.run(URI_TEXT);

        expect(harness.double.denumProgramCalls).toHaveLength(1);
        expect(warned(harness)).toEqual([]);
    });
});

describe('the edit', () => {

    test('counts UTF-16 code units of a CRLF buffer with an astral character', async () => {
        const harness = createDenumHarness();
        const original = '0010 print "\u{1F600}"\r\n0020 goto 0010\r\n';
        const answer = 'L10: print "\u{1F600}"\r\ngoto L10\r\n';
        harness.double.scriptDenumProgram(denumAnswer(answer, 1));
        harness.client.open(URI_TEXT, 1, original);

        const result = await harness.run(URI_TEXT);

        expect(result.edits).toHaveLength(1);
        expect(TextDocument.applyEdits(TextDocument.create(URI_TEXT, 'bbj', 1, original), result.edits!)).toBe(answer);
    });

    test('is applied to the version it was computed for, through the messenger', async () => {
        const harness = createDenumHarness();
        const messenger = installRecordingMessenger(harness);
        harness.double.scriptDenumProgram(denumAnswer(DENUMBERED, 3));
        harness.client.open(URI_TEXT, 3, NUMBERED);

        const result = await harness.run(URI_TEXT);

        expect(messenger.applyEdit).toHaveBeenCalledTimes(1);
        expect(messenger.applyEdit).toHaveBeenCalledWith(URI_TEXT, 3, result.edits, 'Denumber');
        expect(messenger.info).toHaveBeenCalledWith(DENUM_SUCCESS_MESSAGE);
        expect(messenger.warn).not.toHaveBeenCalled();
    });
});

describe('repeated runs', () => {

    test('the same successful run twice shows two messages', async () => {
        const harness = createDenumHarness();
        harness.client.open(URI_TEXT, 1, NUMBERED);
        harness.double.scriptDenumProgram(denumAnswer(DENUMBERED, 1));

        await harness.run(URI_TEXT);
        // The editor accepted the first edit, so put the numbered text back before the second run.
        harness.client.change(URI_TEXT, 10, [{ text: NUMBERED }]);
        harness.double.scriptDenumProgram(denumAnswer(DENUMBERED, 10));
        await harness.run(URI_TEXT);

        expect(informed(harness)).toEqual([DENUM_SUCCESS_MESSAGE, DENUM_SUCCESS_MESSAGE]);
    });
});
