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
});
