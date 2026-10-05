import { describe, expect, test } from 'vitest';
import {
    createLanguageClientStarter,
    ensureStartedForCommand,
    LanguageServerStartError,
    startOnServerDocuments,
    type DocumentLike,
    type DocumentSource
} from '../src/language-client-starter.js';

/** A start function that counts its calls and resolves when the test says so. */
function controllableStart() {
    let calls = 0;
    let finish: () => void = () => undefined;
    let fail: (error: unknown) => void = () => undefined;
    const start = (): Promise<void> => {
        calls++;
        return new Promise<void>((resolve, reject) => {
            finish = resolve;
            fail = reject;
        });
    };
    return { start, calls: () => calls, finish: () => finish(), fail: (error: unknown) => fail(error) };
}

/**
 * A start function whose every attempt is its own controllable promise, so a test can fail the
 * first attempt and let a later one succeed. Plain functions only: no mock wrapper decides when
 * a promise settles.
 */
function attemptedStart() {
    const attempts: Array<{ finish: () => void; fail: (error: unknown) => void }> = [];
    const start = (): Promise<void> =>
        new Promise<void>((resolve, reject) => {
            attempts.push({ finish: resolve, fail: reject });
        });
    return { start, attempts: () => attempts.length, attempt: (index: number) => attempts[index] };
}

/** An editor stand-in: documents open now plus a way to open one later. */
function fakeSource(initial: DocumentLike[]) {
    const listeners: Array<(document: DocumentLike) => void> = [];
    let disposed = 0;
    const source: DocumentSource = {
        openDocuments: () => initial,
        onDidOpen: listener => {
            listeners.push(listener);
            return { dispose: () => { disposed++; } };
        }
    };
    return {
        source,
        open: (languageId: string) => listeners.forEach(listener => listener({ languageId })),
        listenerCount: () => listeners.length,
        disposed: () => disposed
    };
}

describe('createLanguageClientStarter', () => {
    test('does nothing until it is asked, then starts once', () => {
        const control = controllableStart();
        const starter = createLanguageClientStarter(control.start);
        expect(control.calls()).toBe(0);
        expect(starter.isStarted()).toBe(false);

        void starter.ensureStarted();
        void starter.ensureStarted();
        void starter.ensureStarted();

        expect(control.calls()).toBe(1);
        expect(starter.isStarted()).toBe(true);
    });

    test('concurrent triggers share one start and all settle together', async () => {
        const control = controllableStart();
        const starter = createLanguageClientStarter(control.start);

        const settled: string[] = [];
        const first = starter.ensureStarted().then(() => settled.push('first'));
        const second = starter.ensureStarted().then(() => settled.push('second'));
        await Promise.resolve();
        expect(settled).toEqual([]);

        control.finish();
        await Promise.all([first, second]);

        expect(control.calls()).toBe(1);
        expect(settled.sort()).toEqual(['first', 'second']);
    });

    test('a trigger after the start has finished does not start again', async () => {
        const control = controllableStart();
        const starter = createLanguageClientStarter(control.start);
        const first = starter.ensureStarted();
        control.finish();
        await first;

        await starter.ensureStarted();

        expect(control.calls()).toBe(1);
    });

    test('a failed start rejects every caller that shared it and leaves the starter not started', async () => {
        const control = attemptedStart();
        const starter = createLanguageClientStarter(control.start);
        const first = starter.ensureStarted();
        const second = starter.ensureStarted();
        expect(starter.isStarted()).toBe(true);

        control.attempt(0).fail(new Error('spawn failed'));

        await expect(first).rejects.toThrow('spawn failed');
        await expect(second).rejects.toThrow('spawn failed');
        expect(control.attempts()).toBe(1);
        expect(starter.isStarted()).toBe(false);
    });

    test('a trigger after a failed start retries, and a successful retry is then kept', async () => {
        const control = attemptedStart();
        const starter = createLanguageClientStarter(control.start);
        const first = starter.ensureStarted();
        control.attempt(0).fail(new Error('java missing'));
        await expect(first).rejects.toThrow('java missing');

        const retry = starter.ensureStarted();
        expect(control.attempts()).toBe(2);
        control.attempt(1).finish();
        await retry;

        expect(starter.isStarted()).toBe(true);
        await starter.ensureStarted();
        expect(control.attempts()).toBe(2);
    });

    test('triggers during a failing attempt share it; only a trigger after the failure starts another', async () => {
        const control = attemptedStart();
        const starter = createLanguageClientStarter(control.start);

        const during = [starter.ensureStarted(), starter.ensureStarted(), starter.ensureStarted()];
        expect(control.attempts()).toBe(1);
        control.attempt(0).fail(new Error('no server'));
        const outcomes = await Promise.allSettled(during);
        expect(outcomes.map(outcome => outcome.status)).toEqual(['rejected', 'rejected', 'rejected']);
        expect(control.attempts()).toBe(1);

        const after = starter.ensureStarted();
        expect(control.attempts()).toBe(2);
        control.attempt(1).fail(new Error('still no server'));
        await expect(after).rejects.toThrow('still no server');
    });

    test('a failure is reported once per attempt, however many callers shared it', async () => {
        const control = attemptedStart();
        const errors: unknown[] = [];
        const starter = createLanguageClientStarter(control.start, error => errors.push(error));

        const callers = [starter.ensureStarted(), starter.ensureStarted(), starter.ensureStarted()];
        control.attempt(0).fail(new Error('first failure'));
        await Promise.allSettled(callers);
        expect(errors.map(error => (error as Error).message)).toEqual(['first failure']);

        const retry = starter.ensureStarted();
        control.attempt(1).fail(new Error('second failure'));
        await Promise.allSettled([retry]);
        expect(errors.map(error => (error as Error).message)).toEqual(['first failure', 'second failure']);
    });

    test('a successful start is never reported as an error', async () => {
        const control = attemptedStart();
        const errors: unknown[] = [];
        const starter = createLanguageClientStarter(control.start, error => errors.push(error));

        const started = starter.ensureStarted();
        control.attempt(0).finish();
        await started;
        await starter.ensureStarted();

        expect(errors).toEqual([]);
    });

    test('a reporter that throws does not hide the failure from the caller', async () => {
        const control = attemptedStart();
        const starter = createLanguageClientStarter(control.start, () => {
            throw new Error('reporter broke');
        });

        const started = starter.ensureStarted();
        control.attempt(0).fail(new Error('real cause'));

        await expect(started).rejects.toThrow('real cause');
    });

    test('a start function that throws synchronously becomes a rejected promise that the next trigger retries', async () => {
        let calls = 0;
        const errors: unknown[] = [];
        const starter = createLanguageClientStarter(() => {
            calls++;
            throw new Error('sync failure');
        }, error => errors.push(error));

        await expect(starter.ensureStarted()).rejects.toThrow('sync failure');
        await expect(starter.ensureStarted()).rejects.toThrow('sync failure');

        expect(calls).toBe(2);
        expect(errors).toHaveLength(2);
    });
});

describe('ensureStartedForCommand', () => {
    test('resolves once the server is up', async () => {
        const control = attemptedStart();
        const starter = createLanguageClientStarter(control.start);

        const waiting = ensureStartedForCommand(starter);
        control.attempt(0).finish();

        await expect(waiting).resolves.toBeUndefined();
    });

    test('rejects with a LanguageServerStartError that carries the cause when the start fails', async () => {
        const control = attemptedStart();
        const starter = createLanguageClientStarter(control.start);
        const cause = new Error('spawn failed');

        const waiting = ensureStartedForCommand(starter);
        control.attempt(0).fail(cause);

        const error = await waiting.catch((thrown: unknown) => thrown);
        expect(error).toBeInstanceOf(LanguageServerStartError);
        expect((error as LanguageServerStartError).message).toBe('spawn failed');
        expect((error as LanguageServerStartError).cause).toBe(cause);
    });

    test('a command that stopped on a failed start can run again after the next attempt succeeds', async () => {
        const control = attemptedStart();
        const starter = createLanguageClientStarter(control.start);

        const failed = ensureStartedForCommand(starter);
        control.attempt(0).fail(new Error('no server'));
        await expect(failed).rejects.toBeInstanceOf(LanguageServerStartError);

        const again = ensureStartedForCommand(starter);
        control.attempt(1).finish();
        await expect(again).resolves.toBeUndefined();
    });
});

describe('startOnServerDocuments', () => {
    test('a bbj document that is already open starts the client at once', () => {
        const control = controllableStart();
        const starter = createLanguageClientStarter(control.start);
        const editor = fakeSource([{ languageId: 'plaintext' }, { languageId: 'bbj' }]);

        startOnServerDocuments(starter, editor.source);

        expect(control.calls()).toBe(1);
    });

    test('a bbx-config document that is already open starts the client', () => {
        const control = controllableStart();
        const starter = createLanguageClientStarter(control.start);

        startOnServerDocuments(starter, fakeSource([{ languageId: 'bbx-config' }]).source);

        expect(control.calls()).toBe(1);
    });

    test('no document, or documents of other languages, never start the client', () => {
        const control = controllableStart();
        const starter = createLanguageClientStarter(control.start);
        const editor = fakeSource([{ languageId: 'plaintext' }, { languageId: 'typescript' }]);

        startOnServerDocuments(starter, editor.source);
        editor.open('json');
        editor.open('markdown');
        editor.open('BBJ');

        expect(control.calls()).toBe(0);
        expect(starter.isStarted()).toBe(false);
    });

    test('a bbj document that opens later starts the client', () => {
        const control = controllableStart();
        const starter = createLanguageClientStarter(control.start);
        const editor = fakeSource([]);
        startOnServerDocuments(starter, editor.source);
        expect(control.calls()).toBe(0);

        editor.open('bbj');

        expect(control.calls()).toBe(1);
    });

    test('many bbj documents, open and opening, start the client exactly once', () => {
        const control = controllableStart();
        const starter = createLanguageClientStarter(control.start);
        const editor = fakeSource([{ languageId: 'bbj' }, { languageId: 'bbj' }]);
        startOnServerDocuments(starter, editor.source);

        editor.open('bbj');
        editor.open('bbx-config');
        editor.open('bbj');

        expect(control.calls()).toBe(1);
    });

    test('a command that started the client first is not followed by a second start from a document', () => {
        const control = controllableStart();
        const starter = createLanguageClientStarter(control.start);
        const editor = fakeSource([]);
        startOnServerDocuments(starter, editor.source);

        void starter.ensureStarted();
        editor.open('bbj');

        expect(control.calls()).toBe(1);
    });

    test('a failed start from a document is reported by the starter and is not an unhandled rejection', async () => {
        const control = attemptedStart();
        const errors: unknown[] = [];
        const starter = createLanguageClientStarter(control.start, error => errors.push(error));
        const editor = fakeSource([]);
        const unhandled: unknown[] = [];
        const onUnhandled = (reason: unknown): void => { unhandled.push(reason); };
        process.on('unhandledRejection', onUnhandled);
        try {
            startOnServerDocuments(starter, editor.source);

            editor.open('bbj');
            control.attempt(0).fail(new Error('no server'));
            await new Promise(resolve => setTimeout(resolve, 0));
        } finally {
            process.off('unhandledRejection', onUnhandled);
        }

        expect(unhandled).toEqual([]);
        expect(errors).toHaveLength(1);
        expect((errors[0] as Error).message).toBe('no server');
    });

    test('a bbj document opening after a failed start starts again', async () => {
        const control = attemptedStart();
        const starter = createLanguageClientStarter(control.start);
        const editor = fakeSource([{ languageId: 'bbj' }]);
        startOnServerDocuments(starter, editor.source);
        control.attempt(0).fail(new Error('no server'));
        await new Promise(resolve => setTimeout(resolve, 0));
        expect(control.attempts()).toBe(1);

        editor.open('bbj');

        expect(control.attempts()).toBe(2);
    });

    test('returns the disposable of the open listener', () => {
        const control = controllableStart();
        const starter = createLanguageClientStarter(control.start);
        const editor = fakeSource([]);

        const registration = startOnServerDocuments(starter, editor.source);
        expect(editor.listenerCount()).toBe(1);
        registration.dispose();

        expect(editor.disposed()).toBe(1);
    });
});
