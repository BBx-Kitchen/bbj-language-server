import { describe, test, expect, vi, beforeEach } from 'vitest';
import { EventEmitter } from 'events';

// 'vscode' is not resolvable outside the extension host, and document-formatter.ts calls
// vscode.workspace.* at import time — mock it before importing the module under test.
vi.mock('vscode', () => {
    class TextEdit {
        constructor(public range: unknown, public newText: string) { }
    }
    class Range {
        constructor(public startLine: number, public startChar: number, public endLine: number, public endChar: number) { }
    }
    return {
        workspace: {
            getConfiguration: vi.fn(() => ({
                formatter: {
                    indentWidth: 4,
                    keywordsToUppercase: false,
                    removeLineContinuation: false,
                    splitSingleLineIF: false,
                },
            })),
            onDidChangeTextDocument: vi.fn(() => ({ dispose: () => { } })),
            onDidCloseTextDocument: vi.fn(() => ({ dispose: () => { } })),
        },
        TextEdit,
        Range,
    };
});

vi.mock('child_process', () => ({
    spawn: vi.fn(),
}));

import * as cp from 'child_process';
import { DocumentFormatter } from '../src/document-formatter.js';

/** A minimal fake ChildProcess: an EventEmitter with stdout/stderr/stdin. */
function makeFakeProcess() {
    const proc: any = new EventEmitter();
    proc.stdout = new EventEmitter();
    proc.stdout.setEncoding = vi.fn();
    proc.stderr = new EventEmitter();
    proc.stdin = { end: vi.fn() };
    return proc;
}

function makeDocument(uriPath: string, text: string) {
    return {
        uri: { fsPath: uriPath, toString: () => uriPath },
        getText: () => text,
        lineCount: 1,
    } as any;
}

describe('DocumentFormatter', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    test('P62-D2-010: rejects the format promise on a non-ENOENT spawn error', async () => {
        const proc = makeFakeProcess();
        (cp.spawn as unknown as ReturnType<typeof vi.fn>).mockReturnValue(proc);

        const doc = makeDocument('/tmp/a.bbj', 'rem hi');
        const formatPromise = DocumentFormatter.provideDocumentFormattingEdits(doc);

        const err: NodeJS.ErrnoException = new Error('permission denied');
        err.code = 'EACCES';
        proc.emit('error', err);

        await expect(formatPromise).rejects.toBeTruthy();
    }, 5000);

    describe('P62-D3-001: concurrent format requests share one spawn', () => {
        function spawnCollectingImpl() {
            const procs: ReturnType<typeof makeFakeProcess>[] = [];
            (cp.spawn as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => {
                const p = makeFakeProcess();
                procs.push(p);
                return p;
            });
            return procs;
        }

        test('two requests for the same document while the first is in flight share one spawn', async () => {
            const procs = spawnCollectingImpl();
            const doc = makeDocument('/tmp/dup.bbj', 'rem hi');

            const p1 = DocumentFormatter.provideDocumentFormattingEdits(doc);
            const p2 = DocumentFormatter.provideDocumentFormattingEdits(doc);

            expect(cp.spawn).toHaveBeenCalledTimes(1);

            procs[0].stdout.emit('data', 'formatted output');
            procs[0].emit('close', 0);

            const [r1, r2] = await Promise.all([p1, p2]);
            expect((r1 as any)[0].newText).toBe('formatted output');
            expect((r2 as any)[0].newText).toBe('formatted output');
        });

        test('two requests for different document URIs still spawn twice', () => {
            spawnCollectingImpl();
            const docA = makeDocument('/tmp/dup-a.bbj', 'rem a');
            const docB = makeDocument('/tmp/dup-b.bbj', 'rem b');

            DocumentFormatter.provideDocumentFormattingEdits(docA);
            DocumentFormatter.provideDocumentFormattingEdits(docB);

            expect(cp.spawn).toHaveBeenCalledTimes(2);
        });

        test('the in-flight entry is removed once the promise resolves, so a later request spawns again', async () => {
            const procs = spawnCollectingImpl();
            const doc = makeDocument('/tmp/dup-resolve.bbj', 'rem c');

            const p1 = DocumentFormatter.provideDocumentFormattingEdits(doc);
            procs[0].stdout.emit('data', 'formatted');
            procs[0].emit('close', 0);
            await p1;

            DocumentFormatter.provideDocumentFormattingEdits(doc);
            expect(cp.spawn).toHaveBeenCalledTimes(2);
        });

        test('the in-flight entry is removed once the promise rejects, so a later request spawns again', async () => {
            const procs = spawnCollectingImpl();
            const doc = makeDocument('/tmp/dup-reject.bbj', 'rem d');

            const p1 = DocumentFormatter.provideDocumentFormattingEdits(doc);
            procs[0].emit('close', 1);
            await expect(p1).rejects.toBeTruthy();

            DocumentFormatter.provideDocumentFormattingEdits(doc);
            expect(cp.spawn).toHaveBeenCalledTimes(2);
        });
    });
});
