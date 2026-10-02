/**
 * What the user sees at the end of a DENUM run: the diagnostics list, the one message that counts
 * it with a Show button, and the one message of every way a run can fail. The service talks to the
 * notifications module through its default messenger, so these tests drive the whole chain to the
 * (fake) language client.
 */
import { CancellationTokenSource } from 'vscode-jsonrpc';
import { afterEach, describe, expect, test, vi } from 'vitest';
import {
    DENUM_SUCCESS_MESSAGE, SHOW_DENUM_DIAGNOSTICS_ACTION, denumSuccessMessage
} from '../src/language/bbj-denum-service.js';
import { DENUM_DIAGNOSTICS_METHOD, SHOW_DENUM_DIAGNOSTICS_METHOD, type DenumDiagnosticDto } from '../src/language/denum-notifications.js';
import {
    createDenumHarness, deferred, denumAnswer, resetDenumHarness, type DenumHarness
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
