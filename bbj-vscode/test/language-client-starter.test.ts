import { describe, expect, test } from 'vitest';
import {
    createLanguageClientStarter,
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

    test('a failed start is cached: later triggers see the same failure and do not retry', async () => {
        const control = controllableStart();
        const starter = createLanguageClientStarter(control.start);
        const first = starter.ensureStarted();
        control.fail(new Error('spawn failed'));
        await expect(first).rejects.toThrow('spawn failed');

        await expect(starter.ensureStarted()).rejects.toThrow('spawn failed');
        expect(control.calls()).toBe(1);
    });

    test('a start function that throws synchronously becomes a rejected promise, once', async () => {
        let calls = 0;
        const starter = createLanguageClientStarter(() => {
            calls++;
            throw new Error('sync failure');
        });

        await expect(starter.ensureStarted()).rejects.toThrow('sync failure');
        await expect(starter.ensureStarted()).rejects.toThrow('sync failure');
        expect(calls).toBe(1);
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

    test('a failed start reaches the error callback and is not an unhandled rejection', async () => {
        const control = controllableStart();
        const starter = createLanguageClientStarter(control.start);
        const errors: unknown[] = [];
        const editor = fakeSource([]);
        startOnServerDocuments(starter, editor.source, error => errors.push(error));

        editor.open('bbj');
        control.fail(new Error('no server'));
        await starter.ensureStarted().catch(() => undefined);

        expect(errors).toHaveLength(1);
        expect((errors[0] as Error).message).toBe('no server');
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
