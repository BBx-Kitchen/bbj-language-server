/**
 * What the user sees at the end of a DENUM run: the diagnostics list, the one message that counts
 * it with a Show button, and the one message of every way a run can fail. The service talks to the
 * notifications module through its default messenger, so these tests drive the whole chain to the
 * (fake) language client.
 */
import { CancellationTokenSource } from 'vscode-jsonrpc';
import { afterEach, describe, expect, test, vi } from 'vitest';
import {
    DENUM_FAILED_MESSAGE, DENUM_IN_PROGRESS_MESSAGE, DENUM_SUCCESS_MESSAGE, DENUM_TOKENIZED_MESSAGE,
    SHOW_DENUM_DIAGNOSTICS_ACTION, denumSuccessMessage
} from '../src/language/bbj-denum-service.js';
import { TOKENIZED_PROGRAM_PREFIX, mixedNumberingMessage } from '../src/language/bbj-format-service.js';
import { DENUM_DIAGNOSTICS_METHOD, SHOW_DENUM_DIAGNOSTICS_METHOD, type DenumDiagnosticDto } from '../src/language/denum-notifications.js';
import {
    createDenumHarness, deferred, denumAnswer, loggedLines, resetDenumHarness, type DenumHarness
} from './denum-test-harness.js';
import type { JavaInteropTestServiceProgramScript } from './bbj-test-module.js';

const URI_TEXT = 'file:///ws/numbered.bbj';
const NUMBERED = '0010 print 1\n0020 goto 0010\n';
const DENUMBERED = 'L10: print 1\ngoto L10\n';

afterEach(resetDenumHarness);

const error = (line: number, message = 'e'): DenumDiagnosticDto => ({ line, originalLineNumber: '', severity: 'ERROR', message });

/** Every payload sent to the client under `method`, in order. */
function sent(harness: DenumHarness, method: string): unknown[][] {
    return harness.sendNotification.mock.calls.filter(args => args[0] === method).map(args => args.slice(1));
}

function openNumbered(harness: DenumHarness): void {
    harness.client.open(URI_TEXT, 1, NUMBERED);
}

describe('the counts message', () => {

    test.each<[string, DenumDiagnosticDto[], string]>([
        ['no diagnostics', [], 'Denumbered.'],
        ['one error', [error(1)], 'Denumbered. 1 error.'],
        ['one note', [{ line: 1, originalLineNumber: '', severity: 'INFO', message: 'n' }], 'Denumbered. 1 note.'],
        ['mixed kinds',
            [error(1), error(2), { line: 1, originalLineNumber: '', severity: 'WARNING', message: 'w' },
                ...[1, 2, 3].map(line => ({ line, originalLineNumber: '', severity: 'INFO' as const, message: 'n' }))],
            'Denumbered. 2 errors, 1 warning, 3 notes.']
    ])('%s', (_name, diagnostics, expected) => {
        expect(denumSuccessMessage(DENUM_SUCCESS_MESSAGE, diagnostics)).toBe(expected);
    });
});

describe('a DENUM run that reported diagnostics', () => {

    const THREE = [
        { line: 1, originalLineNumber: '0010', severity: 'ERROR' as const, message: 'syntax error' },
        { line: 2, originalLineNumber: '0020', severity: 'WARNING' as const, message: 'w' },
        { line: 0, originalLineNumber: '', severity: 'ERROR' as const, message: 'e2' }
    ];

    test('applies the edit, sends the list, then shows one Warning with the counts and Show', async () => {
        const harness = createDenumHarness();
        harness.double.scriptDenumProgram(denumAnswer(DENUMBERED, 1, THREE));
        openNumbered(harness);

        const result = await harness.run(URI_TEXT);

        expect(result.status).toBe('denumbered');
        expect(result.message).toBe('Denumbered. 2 errors, 1 warning.');
        expect(harness.workspace.applyEdit).toHaveBeenCalledTimes(1);
        expect(sent(harness, DENUM_DIAGNOSTICS_METHOD)).toEqual([[{ uri: URI_TEXT, diagnostics: THREE }]]);
        expect(harness.window.showWarningMessage).toHaveBeenCalledTimes(1);
        expect(harness.window.showWarningMessage).toHaveBeenCalledWith('Denumbered. 2 errors, 1 warning.', { title: 'Show' });
        expect(harness.window.showInformationMessage).not.toHaveBeenCalled();
        expect(harness.window.showErrorMessage).not.toHaveBeenCalled();

        const applied = harness.workspace.applyEdit.mock.invocationCallOrder[0];
        const listed = harness.sendNotification.mock.invocationCallOrder[0];
        const shown = harness.window.showWarningMessage.mock.invocationCallOrder[0];
        expect(applied).toBeLessThan(listed);
        expect(listed).toBeLessThan(shown);
    });

    test('choosing Show sends the reveal notification with no payload', async () => {
        const harness = createDenumHarness();
        harness.window.showWarningMessage.mockResolvedValue({ title: SHOW_DENUM_DIAGNOSTICS_ACTION });
        harness.double.scriptDenumProgram(denumAnswer(DENUMBERED, 1, THREE));
        openNumbered(harness);

        await harness.run(URI_TEXT);
        await vi.waitFor(() => expect(sent(harness, SHOW_DENUM_DIAGNOSTICS_METHOD)).toHaveLength(1));

        const reveal = harness.sendNotification.mock.calls.find(args => args[0] === SHOW_DENUM_DIAGNOSTICS_METHOD)!;
        expect(reveal).toEqual([SHOW_DENUM_DIAGNOSTICS_METHOD]);
    });

    test('dismissing the message sends nothing more', async () => {
        const harness = createDenumHarness();
        harness.window.showWarningMessage.mockResolvedValue(undefined);
        harness.double.scriptDenumProgram(denumAnswer(DENUMBERED, 1, THREE));
        openNumbered(harness);

        await harness.run(URI_TEXT);
        await new Promise(resolve => setTimeout(resolve, 0));

        expect(sent(harness, SHOW_DENUM_DIAGNOSTICS_METHOD)).toEqual([]);
        expect(harness.sendNotification).toHaveBeenCalledTimes(1);
    });

    test('warnings and notes alone show an Information message, not a Warning', async () => {
        const harness = createDenumHarness();
        harness.double.scriptDenumProgram(denumAnswer(DENUMBERED, 1, [
            { line: 1, originalLineNumber: '0010', severity: 'WARNING', message: 'w' },
            { line: 2, originalLineNumber: '0020', severity: 'INFO', message: 'n' }
        ]));
        openNumbered(harness);

        await harness.run(URI_TEXT);

        expect(harness.window.showInformationMessage).toHaveBeenCalledTimes(1);
        expect(harness.window.showInformationMessage).toHaveBeenCalledWith('Denumbered. 1 warning, 1 note.', { title: 'Show' });
        expect(harness.window.showWarningMessage).not.toHaveBeenCalled();
    });

    test('a clean run sends no list and shows the plain confirmation without an action', async () => {
        const harness = createDenumHarness();
        harness.double.scriptDenumProgram(denumAnswer(DENUMBERED, 1));
        openNumbered(harness);

        await harness.run(URI_TEXT);

        expect(sent(harness, DENUM_DIAGNOSTICS_METHOD)).toEqual([]);
        expect(harness.window.showInformationMessage).toHaveBeenCalledTimes(1);
        expect(harness.window.showInformationMessage).toHaveBeenCalledWith('Denumbered.');
        expect(harness.window.showWarningMessage).not.toHaveBeenCalled();
    });

    test('an answer that needs no edit still sends the list and shows the counts with Show', async () => {
        const harness = createDenumHarness();
        harness.double.scriptDenumProgram(denumAnswer(NUMBERED, 1, THREE));
        openNumbered(harness);

        const result = await harness.run(URI_TEXT);

        expect(result).toMatchObject({ status: 'denumbered', message: 'Denumbered. 2 errors, 1 warning.', applied: false });
        expect(result.diagnostics).toEqual(THREE);
        expect(harness.workspace.applyEdit).not.toHaveBeenCalled();
        expect(sent(harness, DENUM_DIAGNOSTICS_METHOD)).toEqual([[{ uri: URI_TEXT, diagnostics: THREE, version: 1 }]]);
        expect(harness.window.showWarningMessage).toHaveBeenCalledTimes(1);
        expect(harness.window.showWarningMessage).toHaveBeenCalledWith('Denumbered. 2 errors, 1 warning.', { title: 'Show' });
        expect(harness.window.showInformationMessage).not.toHaveBeenCalled();
    });

    test('an answer that needs no edit and has no diagnostics shows the plain confirmation', async () => {
        const harness = createDenumHarness();
        harness.double.scriptDenumProgram(denumAnswer(NUMBERED, 1));
        openNumbered(harness);

        const result = await harness.run(URI_TEXT);

        expect(result).toMatchObject({ status: 'denumbered', message: 'Denumbered.', applied: false });
        expect(harness.workspace.applyEdit).not.toHaveBeenCalled();
        expect(sent(harness, DENUM_DIAGNOSTICS_METHOD)).toEqual([]);
        expect(harness.window.showInformationMessage).toHaveBeenCalledTimes(1);
        expect(harness.window.showInformationMessage).toHaveBeenCalledWith('Denumbered.');
    });

    test('a list longer than the interop guard keeps arrives cut to 500, in the list and in the counts', async () => {
        const harness = createDenumHarness();
        harness.double.scriptDenumProgram(denumAnswer(DENUMBERED, 1, Array.from({ length: 600 }, (_, index) => error(0, `e${index}`))));
        openNumbered(harness);

        const result = await harness.run(URI_TEXT);

        const [[payload]] = sent(harness, DENUM_DIAGNOSTICS_METHOD) as Array<[{ diagnostics: unknown[] }]>;
        expect(payload.diagnostics).toHaveLength(500);
        expect(result.message).toBe('Denumbered. 500 errors.');
        expect(harness.window.showWarningMessage).toHaveBeenCalledWith('Denumbered. 500 errors.', { title: 'Show' });
    });

    test('the Show prompt is never awaited: a prompt that never settles does not hold the run', async () => {
        const harness = createDenumHarness();
        harness.window.showWarningMessage.mockReturnValue(new Promise(() => { /* never settles */ }));
        harness.double.scriptDenumProgram(denumAnswer(DENUMBERED, 1, THREE));
        openNumbered(harness);

        await expect(harness.run(URI_TEXT)).resolves.toMatchObject({ status: 'denumbered', applied: true });
    });
});

describe('a DENUM run that sends no list', () => {

    const WITH_ERROR = [error(1)];

    async function runWithoutList(setup: (harness: DenumHarness) => void) {
        const harness = createDenumHarness();
        openNumbered(harness);
        setup(harness);
        const result = await harness.run(URI_TEXT);
        return { harness, result };
    }

    test('an unnumbered answer', async () => {
        const { harness } = await runWithoutList(h => {
            h.double.scriptDenumProgram({ result: { text: NUMBERED, diagnostics: WITH_ERROR, denumbered: false, version: '1' } });
        });
        expect(sent(harness, DENUM_DIAGNOSTICS_METHOD)).toEqual([]);
    });

    test('a refused edit', async () => {
        const { harness, result } = await runWithoutList(h => {
            h.workspace.applyEdit.mockResolvedValue({ applied: false });
            h.double.scriptDenumProgram(denumAnswer(DENUMBERED, 1, WITH_ERROR));
        });
        expect(result.reason).toBe('not-applied');
        expect(sent(harness, DENUM_DIAGNOSTICS_METHOD)).toEqual([]);
    });

    test('a stale answer', async () => {
        const harness = createDenumHarness();
        openNumbered(harness);
        const gate = deferred<JavaInteropTestServiceProgramScript>();
        harness.double.scriptDenumProgram({ pending: gate.promise });

        const running = harness.run(URI_TEXT);
        harness.client.change(URI_TEXT, 2, [{ text: '0010 print 2\n' }]);
        gate.resolve(denumAnswer(DENUMBERED, 1, WITH_ERROR));
        const result = await running;

        expect(result.reason).toBe('stale');
        expect(sent(harness, DENUM_DIAGNOSTICS_METHOD)).toEqual([]);
    });

    test('a failed outcome', async () => {
        const { harness, result } = await runWithoutList(h => {
            h.double.scriptDenumProgram({ error: { code: -33009, message: 'failed' } });
        });
        expect(result.status).toBe('failed');
        expect(sent(harness, DENUM_DIAGNOSTICS_METHOD)).toEqual([]);
    });

    test('a cancelled run', async () => {
        const harness = createDenumHarness();
        openNumbered(harness);
        const source = new CancellationTokenSource();
        harness.double.scriptDenumProgram(denumAnswer(DENUMBERED, 1, WITH_ERROR));
        source.cancel();

        const result = await harness.run(URI_TEXT, source.token);

        expect(result.reason).toBe('cancelled');
        expect(sent(harness, DENUM_DIAGNOSTICS_METHOD)).toEqual([]);
    });
});

/** A wire error as bbj-ls would answer it. */
function wireError(code: number, message = 'peer message', data?: unknown): JavaInteropTestServiceProgramScript {
    return { error: { code, message, data } };
}

const REQUIRES_26_03 = 'Denumbering requires BBj 26.03 or later. The connected BBjServices does not provide it.';
const NOT_REACHABLE = 'BBjServices is not reachable. The file was not changed.';
const TIMEOUT = 'Denumbering timed out. The file was not changed; try again.';
const TOO_LARGE = 'This file is too large to denumber. The file was not changed.';
const PROTECTED = 'This BBj program is protected and cannot be denumbered.';
const PARSER_FAILED =
    'Denumbering failed. The file was not changed. If it contains characters BBj cannot represent, remove them and try again.';
const UNAVAILABLE = 'The BBj denumbering service is not available right now. The file was not changed; try again later.';

/** name, scripted answer, reason, text, the tokens the warn log line has to carry */
const FAILURE_ROWS: ReadonlyArray<[string, JavaInteropTestServiceProgramScript, string, string, string[]]> = [
    ['an older BBjServices', 'method-not-found', 'requires-bbj-26-03', REQUIRES_26_03, ['requires-bbj-26-03', 'method-not-found']],
    ['an unreachable service', { outcome: { kind: 'unavailable', reason: 'not-reachable' } }, 'not-reachable', NOT_REACHABLE, ['not-reachable']],
    ['a transport failure', 'transport-error', 'not-reachable', NOT_REACHABLE, ['not-reachable', 'transport']],
    ['a client timeout', { outcome: { kind: 'timeout', origin: 'client' } }, 'timeout', TIMEOUT, ['timeout', 'client']],
    ['a peer timeout', wireError(-33002), 'timeout', TIMEOUT, ['timeout']],
    ['a file that is too large', wireError(-33003), 'too-large', TOO_LARGE, ['too-large', 'size-cap', '-33003']],
    ['a protected program', wireError(-33005), 'protected-program', PROTECTED, ['protected-program', '-33005']],
    ['a parser exception', wireError(-33001), 'denum-failed', PARSER_FAILED, ['denum-failed', 'parser-exception', '-33001']],
    ['a DENUM failure', wireError(-33009), 'denum-failed', DENUM_FAILED_MESSAGE, ['denum-failed', 'format-failed', '-33009']],
    ['an invalid-params answer', wireError(-32602), 'denum-failed', DENUM_FAILED_MESSAGE, ['denum-failed', 'invalid-params']],
    ['a line-numbers answer', wireError(-33006), 'denum-failed', DENUM_FAILED_MESSAGE, ['denum-failed', 'denum-needed', '-33006']],
    ['a malformed answer', { outcome: { kind: 'malformed-result', reason: 'no text' } }, 'denum-failed', DENUM_FAILED_MESSAGE, ['denum-failed', 'malformed-result']],
    ['an unavailable service', wireError(-33004), 'service-unavailable', UNAVAILABLE, ['service-unavailable', '-33004']]
];

function windowMessages(harness: DenumHarness): number {
    return harness.window.showWarningMessage.mock.calls.length
        + harness.window.showInformationMessage.mock.calls.length
        + harness.window.showErrorMessage.mock.calls.length;
}

describe('every failure outcome ends in exactly one Warning of its own', () => {

    test.each(FAILURE_ROWS)('%s', async (_name, script, reason, text) => {
        const harness = createDenumHarness();
        harness.double.scriptDenumProgram(script);
        openNumbered(harness);

        const result = await harness.run(URI_TEXT);

        expect(result).toMatchObject({ status: 'failed', reason, message: text });
        expect(harness.window.showWarningMessage).toHaveBeenCalledTimes(1);
        expect(harness.window.showWarningMessage).toHaveBeenCalledWith(text);
        expect(windowMessages(harness)).toBe(1);
        expect(harness.workspace.applyEdit).not.toHaveBeenCalled();
        expect(sent(harness, DENUM_DIAGNOSTICS_METHOD)).toEqual([]);
    });

    test('an unreachable service raises no error popup of its own', async () => {
        const harness = createDenumHarness();
        harness.double.scriptDenumProgram('transport-error');
        openNumbered(harness);

        await harness.run(URI_TEXT);

        expect(harness.window.showErrorMessage).not.toHaveBeenCalled();
    });

    test.each(FAILURE_ROWS)('%s logs one warn line naming what happened', async (_name, script, reason, _text, tokens) => {
        const harness = createDenumHarness();
        harness.double.scriptDenumProgram(script);
        openNumbered(harness);

        await harness.run(URI_TEXT);

        const lines = loggedLines(harness.loggers, 'warn');
        expect(lines).toHaveLength(1);
        for (const token of [reason, ...tokens]) {
            expect(lines[0]).toContain(token);
        }
    });

    test('a tokenized buffer shows the Decompile pointer and reaches nobody', async () => {
        const harness = createDenumHarness();
        harness.client.open(URI_TEXT, 1, `${TOKENIZED_PROGRAM_PREFIX}binary`);

        const result = await harness.run(URI_TEXT);

        expect(result.reason).toBe('tokenized');
        expect(harness.window.showWarningMessage).toHaveBeenCalledWith(DENUM_TOKENIZED_MESSAGE);
        expect(windowMessages(harness)).toBe(1);
        expect(harness.double.denumProgramCalls).toEqual([]);
    });
});

describe('mixed numbering', () => {

    const FIVE_LINES = 'a\nb\nc\nd\ne';

    test('names the line and offers Go to Line in the request\'s own document', async () => {
        const harness = createDenumHarness();
        harness.window.showWarningMessage.mockResolvedValue({ title: 'Go to Line' });
        harness.double.scriptDenumProgram(wireError(-33008, 'mixed', { line: 3 }));
        harness.client.open(URI_TEXT, 1, FIVE_LINES);

        const result = await harness.run(URI_TEXT);

        expect(result).toMatchObject({ status: 'failed', reason: 'mixed-numbering', line: 2 });
        expect(harness.window.showWarningMessage).toHaveBeenCalledTimes(1);
        expect(harness.window.showWarningMessage).toHaveBeenCalledWith(
            'Mixed line numbering at line 3. The file was not changed.', { title: 'Go to Line' });
        await vi.waitFor(() => expect(harness.window.showDocument).toHaveBeenCalledTimes(1));
        expect(harness.window.showDocument).toHaveBeenCalledWith({
            uri: URI_TEXT, takeFocus: true, selection: { start: { line: 2, character: 0 }, end: { line: 2, character: 0 } }
        });
    });

    test('an oversized line is clamped to the live document at click time', async () => {
        const harness = createDenumHarness();
        const answer = deferred<{ title: string } | undefined>();
        harness.window.showWarningMessage.mockReturnValue(answer.promise);
        harness.double.scriptDenumProgram(wireError(-33008, 'mixed', { line: 99 }));
        harness.client.open(URI_TEXT, 1, FIVE_LINES);

        const result = await harness.run(URI_TEXT);
        expect(result.line).toBe(4);

        harness.client.change(URI_TEXT, 2, [{ text: 'a\nb\nc' }]);
        answer.resolve({ title: 'Go to Line' });
        await vi.waitFor(() => expect(harness.window.showDocument).toHaveBeenCalledTimes(1));
        expect(harness.window.showDocument).toHaveBeenCalledWith(expect.objectContaining({
            uri: URI_TEXT, selection: { start: { line: 2, character: 0 }, end: { line: 2, character: 0 } }
        }));
    });

    test('a document closed before the click falls back to its line count at run time', async () => {
        const harness = createDenumHarness();
        const answer = deferred<{ title: string } | undefined>();
        harness.window.showWarningMessage.mockReturnValue(answer.promise);
        harness.double.scriptDenumProgram(wireError(-33008, 'mixed', { line: 99 }));
        harness.client.open(URI_TEXT, 1, FIVE_LINES);

        await harness.run(URI_TEXT);
        harness.client.close(URI_TEXT);
        answer.resolve({ title: 'Go to Line' });

        await vi.waitFor(() => expect(harness.window.showDocument).toHaveBeenCalledTimes(1));
        expect(harness.window.showDocument).toHaveBeenCalledWith(expect.objectContaining({
            uri: URI_TEXT, selection: { start: { line: 4, character: 0 }, end: { line: 4, character: 0 } }
        }));
    });

    test('an answer without a line shows the plain text and no action', async () => {
        const harness = createDenumHarness();
        harness.double.scriptDenumProgram(wireError(-33008, 'mixed'));
        harness.client.open(URI_TEXT, 1, FIVE_LINES);

        const result = await harness.run(URI_TEXT);

        expect(result).toMatchObject({ status: 'failed', reason: 'mixed-numbering' });
        expect(result.line).toBeUndefined();
        expect(harness.window.showWarningMessage).toHaveBeenCalledTimes(1);
        expect(harness.window.showWarningMessage).toHaveBeenCalledWith(mixedNumberingMessage(undefined));
    });

    test('never opens anything but the request\'s document', async () => {
        const harness = createDenumHarness();
        harness.window.showWarningMessage.mockResolvedValue({ title: 'Go to Line' });
        harness.double.scriptDenumProgram(wireError(-33008, 'file:///etc/passwd', { line: 2, uri: 'file:///etc/passwd' }));
        harness.client.open(URI_TEXT, 1, FIVE_LINES);

        await harness.run(URI_TEXT);

        await vi.waitFor(() => expect(harness.window.showDocument).toHaveBeenCalledTimes(1));
        expect(harness.window.showDocument).toHaveBeenCalledWith(expect.objectContaining({ uri: URI_TEXT }));
    });
});

describe('nothing is deduplicated', () => {

    test('an older BBjServices shows its message on every run of one connection', async () => {
        const harness = createDenumHarness();
        harness.double.scriptDenumProgram('method-not-found');
        openNumbered(harness);

        for (let run = 0; run < 3; run++) {
            await harness.run(URI_TEXT);
        }

        expect(harness.window.showWarningMessage.mock.calls).toEqual(Array(3).fill([REQUIRES_26_03]));
    });

    test.each(FAILURE_ROWS)('%s run twice on an unchanged document shows two Warnings', async (_name, script, _reason, text) => {
        const harness = createDenumHarness();
        harness.double.scriptDenumProgram(script);
        openNumbered(harness);

        await harness.run(URI_TEXT);
        await harness.run(URI_TEXT);

        expect(harness.window.showWarningMessage.mock.calls).toEqual([[text], [text]]);
    });
});

describe('runs that overlap or are cancelled', () => {

    test('two runs started together end in exactly two messages', async () => {
        const harness = createDenumHarness();
        openNumbered(harness);
        const gate = deferred<JavaInteropTestServiceProgramScript>();
        harness.double.scriptDenumProgram({ pending: gate.promise });

        const first = harness.run(URI_TEXT);
        const second = await harness.run(URI_TEXT);
        gate.resolve(denumAnswer(DENUMBERED, 1));
        await first;

        expect(second.reason).toBe('in-progress');
        expect(windowMessages(harness)).toBe(2);
        expect(harness.window.showWarningMessage).toHaveBeenCalledWith(DENUM_IN_PROGRESS_MESSAGE);
        expect(harness.window.showInformationMessage).toHaveBeenCalledWith('Denumbered.');
    });

    test('a cancelled run shows nothing', async () => {
        const harness = createDenumHarness();
        openNumbered(harness);
        const source = new CancellationTokenSource();
        source.cancel();

        const result = await harness.run(URI_TEXT, source.token);

        expect(result.reason).toBe('cancelled');
        expect(windowMessages(harness)).toBe(0);
    });
});

describe('what the user and the log are never shown', () => {

    test('no message and no log line at any level carries the document text or a peer echo', async () => {
        const secret = 'SECRET_MARKER_DENUM';
        const peerEcho = 'PEER_ECHO_MARKER';
        const harness = createDenumHarness();
        harness.window.showWarningMessage.mockResolvedValue({ title: 'Go to Line' });
        harness.client.open(URI_TEXT, 1, `0010 rem ${secret}\n0020 x=1\n`);

        const scripts = [
            ...FAILURE_ROWS.map(([, script]) => script),
            wireError(-33008, 'mixed', { line: 2 })
        ];
        for (const script of scripts) {
            const echoing = typeof script === 'object' && 'error' in script
                ? wireError(script.error.code, `parser says ${peerEcho}`, script.error.data)
                : script;
            harness.double.scriptDenumProgram(echoing);
            await harness.run(URI_TEXT);
        }
        harness.double.scriptDenumProgram(denumAnswer(DENUMBERED, 1, [error(1)]));
        await harness.run(URI_TEXT);

        expect(harness.window.showWarningMessage).toHaveBeenCalled();
        const shown = JSON.stringify([
            harness.window.showWarningMessage.mock.calls,
            harness.window.showInformationMessage.mock.calls,
            harness.window.showErrorMessage.mock.calls,
            harness.window.showDocument.mock.calls
        ]);
        expect(shown).not.toContain(secret);
        expect(shown).not.toContain(peerEcho);
        for (const { level, spy } of harness.loggers.spies) {
            const logged = JSON.stringify(spy.mock.calls.map(args => args.map(arg => typeof arg === 'function' ? arg() : arg)));
            expect(logged, `logger.${level}`).not.toContain(secret);
            expect(logged, `logger.${level}`).not.toContain(peerEcho);
        }
    });
});
