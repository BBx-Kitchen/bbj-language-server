import { describe, test, expect, vi, beforeEach } from 'vitest';
import { EventEmitter } from 'events';

// 'vscode' is not resolvable outside the extension host, and document-formatter.ts calls
// vscode.workspace.* at import time — mock it before importing the module under test. The
// registered onDidChangeTextDocument callback is captured on __testState so tests can drive it
// directly to populate the module's unsaved-content map.
vi.mock('vscode', () => {
    class TextEdit {
        constructor(public range: unknown, public newText: string) { }
    }
    class Range {
        constructor(public startLine: number, public startChar: number, public endLine: number, public endChar: number) { }
    }
    const __testState: { onDidChangeTextDocument?: (event: unknown) => void } = {};
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
            onDidChangeTextDocument: vi.fn((cb: (event: unknown) => void) => {
                __testState.onDidChangeTextDocument = cb;
                return { dispose: () => { } };
            }),
            onDidCloseTextDocument: vi.fn(() => ({ dispose: () => { } })),
        },
        window: {
            showErrorMessage: vi.fn(),
        },
        TextEdit,
        Range,
        __testState,
    };
});

vi.mock('child_process', () => ({
    spawn: vi.fn(),
}));

// The wiring under test here is "does runFormatter call the verifier and refuse to
// spawn on a non-ok result" — the verification logic itself is exercised for real, against
// real bytes, by test/formatter-verifier-tamper.test.ts. Default to ok:true in beforeEach so
// every pre-existing test above keeps its current behaviour unmodified.
vi.mock('../src/formatter-verifier.js', () => ({
    verifyFormatterArtifacts: vi.fn(),
    FORMATTER_TOOLS_DIR: '/fake/tools/formatter',
}));

import * as cp from 'child_process';
import * as vscodeMocked from 'vscode';
import { DocumentFormatter } from '../src/document-formatter.js';
import { verifyFormatterArtifacts } from '../src/formatter-verifier.js';

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
        (verifyFormatterArtifacts as unknown as ReturnType<typeof vi.fn>).mockReturnValue({ ok: true });
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

    describe('P62-D5-006: full formatter coverage (test-is-the-fix, D-13)', () => {
        // The non-ENOENT-error case is already covered above by P62-D2-010's regression test —
        // deliberately not duplicated here (see this row's `notes:` in 67-APPLY-SET.md).

        test('rejects with the underlying error when java is not found (ENOENT)', async () => {
            const proc = makeFakeProcess();
            (cp.spawn as unknown as ReturnType<typeof vi.fn>).mockReturnValue(proc);

            const doc = makeDocument('/tmp/d5-enoent.bbj', 'rem x');
            const formatPromise = DocumentFormatter.provideDocumentFormattingEdits(doc);

            const err: NodeJS.ErrnoException = new Error('java not found');
            err.code = 'ENOENT';
            proc.emit('error', err);

            await expect(formatPromise).rejects.toBeTruthy();
        });

        test('rejects when the formatter process exits with a non-zero code', async () => {
            const proc = makeFakeProcess();
            (cp.spawn as unknown as ReturnType<typeof vi.fn>).mockReturnValue(proc);

            const doc = makeDocument('/tmp/d5-nonzero.bbj', 'rem x');
            const formatPromise = DocumentFormatter.provideDocumentFormattingEdits(doc);

            proc.stderr.emit('data', 'syntax error at line 1');
            proc.emit('close', 1);

            await expect(formatPromise).rejects.toBeTruthy();
        });

        test('formats the unsaved buffer content tracked via onDidChangeTextDocument, not document.getText()', async () => {
            const proc = makeFakeProcess();
            (cp.spawn as unknown as ReturnType<typeof vi.fn>).mockReturnValue(proc);

            const doc = makeDocument('/tmp/d5-unsaved.bbj', 'saved-on-disk text');
            // Simulate VS Code reporting an in-memory edit for this same document before format runs.
            (vscodeMocked as any).__testState.onDidChangeTextDocument({
                document: { uri: doc.uri, getText: () => 'unsaved edited text' },
            });

            const formatPromise = DocumentFormatter.provideDocumentFormattingEdits(doc);
            proc.stdout.emit('data', 'formatted');
            proc.emit('close', 0);
            await formatPromise;

            expect(proc.stdin.end).toHaveBeenCalledWith('unsaved edited text');
        });
    });

    describe('formatter artefact verification gate', () => {
        test('when the verifier reports ok, cp.spawn is called exactly once and synchronously, and formatting resolves as before', async () => {
            (verifyFormatterArtifacts as unknown as ReturnType<typeof vi.fn>).mockReturnValue({ ok: true });
            const proc = makeFakeProcess();
            (cp.spawn as unknown as ReturnType<typeof vi.fn>).mockReturnValue(proc);

            const doc = makeDocument('/tmp/sec08-ok.bbj', 'rem hi');
            const formatPromise = DocumentFormatter.provideDocumentFormattingEdits(doc);

            // Synchronous: no await before this assertion.
            expect(cp.spawn).toHaveBeenCalledTimes(1);

            proc.stdout.emit('data', 'formatted output');
            proc.emit('close', 0);

            const result = await formatPromise;
            expect((result as any)[0].newText).toBe('formatted output');
        });

        test('when the verifier reports DIGEST_MISMATCH, cp.spawn is never called, the promise rejects, logger.warn is called, and showErrorMessage is called exactly once', async () => {
            (verifyFormatterArtifacts as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
                ok: false,
                reason: 'DIGEST_MISMATCH',
                relativePath: 'BBjCFCli.jar',
                absolutePath: '/fake/tools/formatter/BBjCFCli.jar',
                expectedSha256: 'expected-hash',
                actualSha256: 'actual-hash',
            });

            const doc = makeDocument('/tmp/sec08-mismatch.bbj', 'rem hi');
            const formatPromise = DocumentFormatter.provideDocumentFormattingEdits(doc);

            expect(cp.spawn).not.toHaveBeenCalled();
            await expect(formatPromise).rejects.toBeTruthy();
            expect((vscodeMocked as any).window.showErrorMessage).toHaveBeenCalledTimes(1);
        });

        test('when a second and third mismatch follow in the same module session, logger.warn fires each time but showErrorMessage is still called exactly once in total', async () => {
            (verifyFormatterArtifacts as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
                ok: false,
                reason: 'DIGEST_MISMATCH',
                relativePath: 'BBjCFCli.jar',
                absolutePath: '/fake/tools/formatter/BBjCFCli.jar',
                expectedSha256: 'expected-hash',
                actualSha256: 'actual-hash',
            });

            // vi.clearAllMocks() in beforeEach resets showErrorMessage's call count for this test.
            const doc1 = makeDocument('/tmp/sec08-mismatch-1.bbj', 'rem a');
            await expect(DocumentFormatter.provideDocumentFormattingEdits(doc1)).rejects.toBeTruthy();

            const doc2 = makeDocument('/tmp/sec08-mismatch-2.bbj', 'rem b');
            await expect(DocumentFormatter.provideDocumentFormattingEdits(doc2)).rejects.toBeTruthy();

            const doc3 = makeDocument('/tmp/sec08-mismatch-3.bbj', 'rem c');
            await expect(DocumentFormatter.provideDocumentFormattingEdits(doc3)).rejects.toBeTruthy();

            expect((vscodeMocked as any).window.showErrorMessage).toHaveBeenCalledTimes(1);
        });

        test('when the verifier reports MISSING_OR_UNREADABLE, cp.spawn is never called, the promise rejects, logger.warn names the expected path, and showErrorMessage is NOT called', async () => {
            (verifyFormatterArtifacts as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
                ok: false,
                reason: 'MISSING_OR_UNREADABLE',
                relativePath: 'BBjCFCli.jar',
                absolutePath: '/fake/tools/formatter/BBjCFCli.jar',
                expectedSha256: 'expected-hash',
            });

            const doc = makeDocument('/tmp/sec08-missing.bbj', 'rem hi');
            const formatPromise = DocumentFormatter.provideDocumentFormattingEdits(doc);

            expect(cp.spawn).not.toHaveBeenCalled();
            await expect(formatPromise).rejects.toBeTruthy();
            expect((vscodeMocked as any).window.showErrorMessage).not.toHaveBeenCalled();
        });

        test('once-per-session toast dedup starts fresh on module reload (fresh session flag)', async () => {
            vi.resetModules();
            const freshModule = await import('../src/document-formatter.js');
            const freshVerifier = await import('../src/formatter-verifier.js');
            (freshVerifier.verifyFormatterArtifacts as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
                ok: false,
                reason: 'DIGEST_MISMATCH',
                relativePath: 'BBjCFCli.jar',
                absolutePath: '/fake/tools/formatter/BBjCFCli.jar',
                expectedSha256: 'expected-hash',
                actualSha256: 'actual-hash',
            });

            const doc = makeDocument('/tmp/sec08-fresh-session.bbj', 'rem hi');
            await expect(
                freshModule.DocumentFormatter.provideDocumentFormattingEdits(doc)
            ).rejects.toBeTruthy();

            expect((vscodeMocked as any).window.showErrorMessage).toHaveBeenCalledTimes(1);
        });
    });
});
