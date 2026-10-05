/******************************************************************************
 * Copyright 2023 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

/**
 * Proves the dedicated format and DENUM connection end to end against the scriptable fake peer
 * under fake timers: the route a request takes, the typed outcome it ends in and the lifecycle of
 * the connection. Never opens a real socket and never reaches port 5008.
 */
import { URI, type LangiumDocument } from 'langium';
import { afterEach, describe, expect, test, vi } from 'vitest';
import type { Socket } from 'net';
import { CancellationTokenSource, ResponseError, type MessageConnection } from 'vscode-jsonrpc/node.js';
import type { Connection } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { BBjParserService } from '../src/language/bbj-parser-service.js';
import { initNotifications } from '../src/language/bbj-notifications.js';
import { clearAllVerdictStates, getVerdictState, setVerdictState } from '../src/language/bbj-diagnostic-reconciliation.js';
import { JavaClass } from '../src/language/generated/ast.js';
import { PROGRAM_DENUM_FORMAT_REQUEST_TIMEOUT_MS, PROGRAM_LANE_REOPEN_COOLDOWN_MS, PROGRAM_REQUEST_TIMEOUT_MS } from '../src/language/java-interop-program-lane.js';
import { logger } from '../src/language/logger.js';
import { createFakePeerServices, type FakePeerInteropService } from './fake-interop-peer.js';

/** Exposes the protected `getRawClass()` to the test via a structural cast. */
type RawClassAccess = { getRawClass(className: string): Promise<JavaClass> };

describe('whole-document format over the dedicated connection', () => {
    afterEach(() => {
        vi.useRealTimers();
    });

    test('a format request is answered on its own connection, distinct from the shared connection and the parse lane, and leaves the generation unchanged', async () => {
        const { interop } = createFakePeerServices();
        interop.peerUp = true;
        interop.connectDelayMs = 0;
        vi.useFakeTimers();

        await (interop as unknown as RawClassAccess).getRawClass('test.Warm');
        await interop.parseProgram({ text: 'x = 1', canonicalName: '/proj/a.bbj', version: '1', prefixes: [], workspaceRoots: [] });
        const generationBefore = interop.connectionGeneration;

        const outcome = await interop.formatProgram({ text: 'rem a\n', version: 'v1' });

        expect(outcome).toMatchObject({ kind: 'ok', result: { scope: 'document', text: 'rem a\n', version: 'v1' } });
        expect(interop.connectionGeneration).toBe(generationBefore);

        const classConnection = interop.sentRequests.find(r => r.method === 'getClassInfo')!.connectionId;
        const parseConnection = interop.sentRequests.find(r => r.method === 'parseProgram')!.connectionId;
        const formatRequests = interop.sentRequests.filter(r => r.method === 'formatProgram');
        expect(formatRequests).toHaveLength(1);
        expect(formatRequests[0].connectionId).not.toBe(classConnection);
        expect(formatRequests[0].connectionId).not.toBe(parseConnection);
    });

    test('an answer with the wrong version echo becomes a malformed-result outcome and the call still resolves', async () => {
        const { interop } = createFakePeerServices();
        interop.peerUp = true;
        interop.connectDelayMs = 0;
        vi.useFakeTimers();
        interop.answerWith('formatProgram', () => ({ text: 'x', diagnostics: [], denumbered: false, version: 'stale' }));

        const outcome = await interop.formatProgram({ text: 'x', version: 'v2' });

        expect(outcome).toEqual({ kind: 'malformed-result', reason: 'version-mismatch' });
    });

    test('a peer application error becomes a typed failed outcome and is never rethrown', async () => {
        const { interop } = createFakePeerServices();
        interop.peerUp = true;
        interop.connectDelayMs = 0;
        vi.useFakeTimers();
        interop.answerWith('formatProgram', () => {
            throw new ResponseError(-33009, 'format engine failed');
        });

        const outcome = await interop.formatProgram({ text: 'x', version: 'v3' });

        expect(outcome).toMatchObject({ kind: 'failed', failure: 'format-failed', code: -33009 });
    });

    test('an invalid-settings answer is a typed outcome whose strings carry no control characters', async () => {
        const { interop } = createFakePeerServices();
        interop.peerUp = true;
        interop.connectDelayMs = 0;
        vi.useFakeTimers();
        interop.answerWith('formatProgram', () => {
            throw new ResponseError(-33007, 'invalid settings', [
                { setting: 'indentWidth', message: 'bad' + String.fromCharCode(27) + 'x' }
            ]);
        });

        const outcome = await interop.formatProgram({ text: 'x', version: 'v4' });

        expect(outcome.kind).toBe('invalid-settings');
        if (outcome.kind !== 'invalid-settings') {
            return;
        }
        expect(outcome.problems).toHaveLength(1);
        expect(outcome.problems[0].setting).toBe('indentWidth');
        for (const char of outcome.problems[0].message) {
            expect(char.charCodeAt(0)).toBeGreaterThanOrEqual(32);
        }
    });
});

describe('format, range format and DENUM over one dedicated connection', () => {
    afterEach(() => {
        vi.useRealTimers();
    });

    const wholeRange = { start: { line: 0, character: 0 }, end: { line: 1, character: 0 } };

    test('a DENUM request returns the denumbered text', async () => {
        const { interop } = createFakePeerServices();
        interop.peerUp = true;
        interop.connectDelayMs = 0;
        vi.useFakeTimers();
        interop.answerWith('denumProgram', () => ({ text: 'print 1\n', diagnostics: [], denumbered: true, version: 'd1' }));

        const outcome = await interop.denumProgram({ text: '0010 print 1\n', version: 'd1' });

        expect(outcome).toMatchObject({ kind: 'ok', result: { text: 'print 1\n', denumbered: true, version: 'd1' } });
    });

    test('a range format request returns the one edit the peer answered with', async () => {
        const { interop } = createFakePeerServices();
        interop.peerUp = true;
        interop.connectDelayMs = 0;
        vi.useFakeTimers();
        const edit = { range: wholeRange, newText: 'a = 1\n' };
        interop.answerWith('formatProgram', () => ({ edits: [edit], diagnostics: [], denumbered: false, version: 'r1' }));

        const outcome = await interop.formatProgram({ text: 'a=1\nb=2\n', version: 'r1', range: wholeRange });

        expect(outcome).toMatchObject({ kind: 'ok', result: { scope: 'range', edits: [edit], version: 'r1' } });
    });

    test('a range format request the peer answers with no edit is ok with no edits', async () => {
        const { interop } = createFakePeerServices();
        interop.peerUp = true;
        interop.connectDelayMs = 0;
        vi.useFakeTimers();

        const outcome = await interop.formatProgram({ text: 'a=1\nb=2\n', version: 'r2', range: wholeRange });

        expect(outcome).toMatchObject({ kind: 'ok', result: { scope: 'range', edits: [] } });
    });

    test('whole-document, range and DENUM requests all share one connection, distinct from the shared connection and the parse lane', async () => {
        const { interop } = createFakePeerServices();
        interop.peerUp = true;
        interop.connectDelayMs = 0;
        vi.useFakeTimers();

        await (interop as unknown as RawClassAccess).getRawClass('test.Warm');
        await interop.parseProgram({ text: 'x = 1', canonicalName: '/proj/a.bbj', version: '1', prefixes: [], workspaceRoots: [] });

        await interop.formatProgram({ text: 'a=1\nb=2\n', version: 'f1' });
        await interop.formatProgram({ text: 'a=1\nb=2\n', version: 'f2', range: wholeRange });
        await interop.denumProgram({ text: 'a=1\n', version: 'f3' });

        const classConnection = interop.sentRequests.find(r => r.method === 'getClassInfo')!.connectionId;
        const parseConnection = interop.sentRequests.find(r => r.method === 'parseProgram')!.connectionId;
        const programRequests = interop.sentRequests.filter(r => r.method === 'formatProgram' || r.method === 'denumProgram');
        expect(programRequests).toHaveLength(3);
        expect(new Set(programRequests.map(r => r.connectionId)).size).toBe(1);
        expect(programRequests[0].connectionId).not.toBe(classConnection);
        expect(programRequests[0].connectionId).not.toBe(parseConnection);
        // The lane opened exactly one socket of its own beside the shared one and the parse lane.
        expect(interop.socketAttempts).toBe(3);
    });

    test('with the dedicated connection hung and a format request pending, a parse and a class lookup are still answered', async () => {
        const { interop } = createFakePeerServices();
        interop.peerUp = true;
        interop.connectDelayMs = 0;
        vi.useFakeTimers();
        const rawClassAccess = interop as unknown as RawClassAccess;

        await rawClassAccess.getRawClass('test.Warm');
        await interop.formatProgram({ text: 'x = 1\n', version: 'h0' });
        const programConnection = interop.sentRequests.find(r => r.method === 'formatProgram')!.connectionId;
        interop.hungConnectionIds.add(programConnection);

        let formatSettled = false;
        const pendingFormat = interop.formatProgram({ text: 'x = 2\n', version: 'h1' }).then(outcome => {
            formatSettled = true;
            return outcome;
        });
        await vi.advanceTimersByTimeAsync(0);
        expect(interop.sentRequests.filter(r => r.method === 'formatProgram')).toHaveLength(2);

        const parse = await interop.parseProgram({ text: 'x = 3', canonicalName: '/proj/h.bbj', version: '1', prefixes: [], workspaceRoots: [] });
        const lookup = await rawClassAccess.getRawClass('test.AfterHang');

        expect(parse.errors).toEqual([]);
        expect(lookup.error).toBeUndefined();
        expect(formatSettled).toBe(false);

        // Cleanup: drop every connection so the pending request settles.
        interop.dropConnection();
        await vi.advanceTimersByTimeAsync(10000);
        await pendingFormat;
    });
});

describe('the dedicated connection lifecycle', () => {
    afterEach(() => {
        vi.restoreAllMocks();
        vi.clearAllMocks();
        vi.useRealTimers();
        initNotifications(null as unknown as Connection);
        clearAllVerdictStates();
    });

    test('a refused open answers not-reachable with no fallback, no dialog and no change to the generation, and class lookups keep working', async () => {
        const { interop } = createFakePeerServices();
        interop.peerUp = true;
        interop.connectDelayMs = 0;
        vi.useFakeTimers();
        const showErrorMessage = vi.fn();
        initNotifications({ window: { showErrorMessage } } as unknown as Connection);
        const warnSpy = vi.spyOn(logger, 'warn').mockImplementation(() => { });
        const rawClassAccess = interop as unknown as RawClassAccess;

        await rawClassAccess.getRawClass('test.Warm'); // opens the shared connection (attempt 1)
        const generationBefore = interop.connectionGeneration;
        interop.refusedSocketAttempts.add(2); // the program connection's own attempt

        const outcome = await interop.formatProgram({ text: 'REM secret marker QWERTY789\n', version: 'u1' });

        expect(outcome).toEqual({ kind: 'unavailable', reason: 'not-reachable' });
        expect(interop.socketAttempts).toBe(2);
        expect(interop.sentRequests.some(r => r.method === 'formatProgram')).toBe(false);
        expect(warnSpy).toHaveBeenCalledTimes(1);
        const warnLine = String(warnSpy.mock.calls[0][0]);
        expect(warnLine).toContain('ECONNREFUSED');
        expect(warnLine).not.toContain('QWERTY789');
        expect(showErrorMessage).not.toHaveBeenCalled();
        expect(interop.connectionGeneration).toBe(generationBefore);

        // A class lookup afterwards reuses the shared connection: no new socket, no circuit-open error.
        const attemptsBeforeLookup = interop.socketAttempts;
        const lookup = await rawClassAccess.getRawClass('test.AfterRefusal');
        expect(lookup.error).toBeUndefined();
        expect(interop.socketAttempts).toBe(attemptsBeforeLookup);
    });

    test('a socket that cannot be wrapped is destroyed, the request answers not-reachable and the cool-down starts', async () => {
        const { interop } = createFakePeerServices();
        interop.peerUp = true;
        interop.connectDelayMs = 0;
        vi.useFakeTimers();
        const warnSpy = vi.spyOn(logger, 'warn').mockImplementation(() => { });
        const destroy = vi.fn();
        const patched = interop as unknown as { createSocket(): Promise<Socket>; wrapSocket(socket: Socket): MessageConnection };
        patched.createSocket = async () => ({ destroy }) as unknown as Socket;
        patched.wrapSocket = () => { throw new Error('wrap failed'); };

        const outcome = await interop.formatProgram({ text: 'a\n', version: 'w1' });

        expect(outcome).toEqual({ kind: 'unavailable', reason: 'not-reachable' });
        expect(destroy).toHaveBeenCalledTimes(1);
        expect(warnSpy).toHaveBeenCalledTimes(1);
        expect(String(warnSpy.mock.calls[0][0])).toContain('wrap failed');
        expect(interop.sentRequests).toEqual([]);

        // The cool-down is running: the next request attempts no new socket.
        expect(await interop.formatProgram({ text: 'a\n', version: 'w2' })).toEqual({ kind: 'unavailable', reason: 'not-reachable' });
        expect(destroy).toHaveBeenCalledTimes(1);
    });

    test('inside the cool-down no socket is attempted; once it has passed the next request opens the connection again', async () => {
        const { interop } = createFakePeerServices();
        interop.peerUp = true;
        interop.connectDelayMs = 0;
        vi.useFakeTimers();
        const warnSpy = vi.spyOn(logger, 'warn').mockImplementation(() => { });
        interop.refusedSocketAttempts.add(1);

        const first = await interop.formatProgram({ text: 'a\n', version: 'c1' });
        expect(first).toEqual({ kind: 'unavailable', reason: 'not-reachable' });
        expect(interop.socketAttempts).toBe(1);

        const second = await interop.formatProgram({ text: 'a\n', version: 'c2' });
        expect(second).toEqual({ kind: 'unavailable', reason: 'not-reachable' });
        expect(interop.socketAttempts).toBe(1);
        expect(warnSpy).toHaveBeenCalledTimes(1);

        await vi.advanceTimersByTimeAsync(PROGRAM_LANE_REOPEN_COOLDOWN_MS - 1);
        const third = await interop.formatProgram({ text: 'a\n', version: 'c3' });
        expect(third).toEqual({ kind: 'unavailable', reason: 'not-reachable' });
        expect(interop.socketAttempts).toBe(1);

        await vi.advanceTimersByTimeAsync(1);
        const fourth = await interop.formatProgram({ text: 'a\n', version: 'c4' });
        expect(fourth.kind).toBe('ok');
        expect(interop.socketAttempts).toBe(2);
    });

    test('losing the connection moves only its own epoch: the generation and a stored live-parse verdict survive, and the next request reopens', async () => {
        const { interop } = createFakePeerServices();
        interop.peerUp = true;
        interop.connectDelayMs = 0;
        vi.useFakeTimers();

        const parserService = new BBjParserService({
            shared: { workspace: { WorkspaceManager: {} } },
            java: { JavaInteropService: interop }
        });
        const uri = URI.file('/proj/lane-loss.bbj');
        const document = {
            uri,
            textDocument: TextDocument.create(uri.toString(), 'bbj', 1, 'rem line 1\n')
        } as unknown as LangiumDocument;

        const verdict = await parserService.requestLiveParse(document);
        expect(verdict.kind).toBe('verdict');
        setVerdictState(uri, { seen: new Set(['some-key']) });

        expect((await interop.formatProgram({ text: 'a\n', version: 'l1' })).kind).toBe('ok');
        const generationBefore = interop.connectionGeneration;
        const firstConnection = interop.sentRequests.find(r => r.method === 'formatProgram')!.connectionId;

        interop.dropConnection(firstConnection);
        parserService.isEnabled();

        expect(getVerdictState(uri)).toBeDefined();
        expect(interop.connectionGeneration).toBe(generationBefore);

        expect((await interop.formatProgram({ text: 'a\n', version: 'l2' })).kind).toBe('ok');
        const formatRequests = interop.sentRequests.filter(r => r.method === 'formatProgram');
        expect(formatRequests).toHaveLength(2);
        expect(formatRequests[1].connectionId).not.toBe(firstConnection);
    });

    test('clearCache disposes the connection, and lifts the cool-down after a refused open', async () => {
        const { interop } = createFakePeerServices();
        interop.peerUp = true;
        interop.connectDelayMs = 0;
        vi.useFakeTimers();
        vi.spyOn(logger, 'warn').mockImplementation(() => { });

        await interop.formatProgram({ text: 'a\n', version: 'k1' });
        const connectionId = interop.sentRequests.find(r => r.method === 'formatProgram')!.connectionId;
        expect(interop.connectionRecords().find(r => r.id === connectionId)?.disposed).toBe(false);
        interop.clearCache();
        expect(interop.connectionRecords().find(r => r.id === connectionId)?.disposed).toBe(true);

        // The next open is refused, which starts a cool-down...
        interop.refusedSocketAttempts.add(interop.socketAttempts + 1);
        expect(await interop.formatProgram({ text: 'a\n', version: 'k2' })).toEqual({ kind: 'unavailable', reason: 'not-reachable' });

        // ...and a cache clear lets the very next request attempt a socket at once.
        interop.clearCache();
        const attemptsBefore = interop.socketAttempts;
        const outcome = await interop.formatProgram({ text: 'a\n', version: 'k3' });
        expect(outcome.kind).toBe('ok');
        expect(interop.socketAttempts).toBe(attemptsBefore + 1);
    });
});

/** Runs one live parse through a real parser service over the same fake peer. */
async function liveParse(interop: FakePeerInteropService, name: string) {
    const parserService = new BBjParserService({
        shared: { workspace: { WorkspaceManager: {} } },
        java: { JavaInteropService: interop }
    });
    const uri = URI.file(`/proj/${name}.bbj`);
    const document = {
        uri,
        textDocument: TextDocument.create(uri.toString(), 'bbj', 1, 'rem line 1\n')
    } as unknown as LangiumDocument;
    const verdict = await parserService.requestLiveParse(document);
    return { verdict, enabled: parserService.isEnabled() };
}

/** Sends one whole-document request to the named method. */
function callProgram(interop: FakePeerInteropService, method: 'formatProgram' | 'denumProgram', version: string, text = 'a\n') {
    return method === 'formatProgram'
        ? interop.formatProgram({ text, version })
        : interop.denumProgram({ text, version });
}

/** Silences every logger level and keeps the calls, so no line can slip past an assertion. */
function spyOnLogger() {
    const spies = {
        warn: vi.spyOn(logger, 'warn').mockImplementation(() => { }),
        info: vi.spyOn(logger, 'info').mockImplementation(() => { }),
        debug: vi.spyOn(logger, 'debug').mockImplementation(() => { }),
        error: vi.spyOn(logger, 'error').mockImplementation(() => { })
    };
    const lines = () => Object.values(spies).flatMap(spy => spy.mock.calls.map(call => String(call[0])));
    return { ...spies, lines };
}

describe('per-method availability', () => {
    afterEach(() => {
        vi.restoreAllMocks();
        vi.clearAllMocks();
        vi.useRealTimers();
        clearAllVerdictStates();
    });

    test('a peer without formatProgram latches only that method: DENUM and live parse keep working and the lane stays open', async () => {
        const { interop } = createFakePeerServices();
        interop.peerUp = true;
        interop.connectDelayMs = 0;
        vi.useFakeTimers();
        interop.formatProgramMethodMissing = true;

        const first = await interop.formatProgram({ text: 'a\n', version: 'm1' });
        expect(first).toEqual({ kind: 'unavailable', reason: 'method-not-found' });
        const generationBefore = interop.connectionGeneration;
        const attemptsBefore = interop.socketAttempts;

        const second = await interop.formatProgram({ text: 'a\n', version: 'm2' });
        expect(second).toEqual({ kind: 'unavailable', reason: 'method-not-found' });
        expect(interop.sentRequests.filter(r => r.method === 'formatProgram')).toHaveLength(1);
        expect(interop.socketAttempts).toBe(attemptsBefore);

        const denum = await interop.denumProgram({ text: 'a\n', version: 'm3' });
        expect(denum.kind).toBe('ok');
        const programConnection = interop.sentRequests.find(r => r.method === 'formatProgram')!.connectionId;
        expect(interop.sentRequests.find(r => r.method === 'denumProgram')!.connectionId).toBe(programConnection);
        expect(interop.connectionRecords().find(r => r.id === programConnection)?.disposed).toBe(false);

        const parse = await liveParse(interop, 'format-missing');
        expect(parse.verdict.kind).toBe('verdict');
        expect(parse.enabled).toBe(true);
        expect(interop.connectionGeneration).toBe(generationBefore);
    });

    test('a peer without denumProgram latches only that method: format and live parse keep working and the lane stays open', async () => {
        const { interop } = createFakePeerServices();
        interop.peerUp = true;
        interop.connectDelayMs = 0;
        vi.useFakeTimers();
        interop.denumProgramMethodMissing = true;

        const first = await interop.denumProgram({ text: 'a\n', version: 'n1' });
        expect(first).toEqual({ kind: 'unavailable', reason: 'method-not-found' });
        const generationBefore = interop.connectionGeneration;
        const attemptsBefore = interop.socketAttempts;

        const second = await interop.denumProgram({ text: 'a\n', version: 'n2' });
        expect(second).toEqual({ kind: 'unavailable', reason: 'method-not-found' });
        expect(interop.sentRequests.filter(r => r.method === 'denumProgram')).toHaveLength(1);
        expect(interop.socketAttempts).toBe(attemptsBefore);

        const format = await interop.formatProgram({ text: 'a\n', version: 'n3' });
        expect(format.kind).toBe('ok');
        const programConnection = interop.sentRequests.find(r => r.method === 'denumProgram')!.connectionId;
        expect(interop.sentRequests.find(r => r.method === 'formatProgram')!.connectionId).toBe(programConnection);
        expect(interop.connectionRecords().find(r => r.id === programConnection)?.disposed).toBe(false);

        const parse = await liveParse(interop, 'denum-missing');
        expect(parse.verdict.kind).toBe('verdict');
        expect(parse.enabled).toBe(true);
        expect(interop.connectionGeneration).toBe(generationBefore);
    });

    test.each([
        'a cache clear',
        'a lost program connection',
        'a fresh shared connection'
    ])('a latched method is probed again after %s', async (cause) => {
        const { interop } = createFakePeerServices();
        interop.peerUp = true;
        interop.connectDelayMs = 0;
        vi.useFakeTimers();
        const rawClassAccess = interop as unknown as RawClassAccess;
        await rawClassAccess.getRawClass('test.Warm');

        interop.formatProgramMethodMissing = true;
        expect(await interop.formatProgram({ text: 'a\n', version: 'p1' })).toEqual({ kind: 'unavailable', reason: 'method-not-found' });
        expect(await interop.formatProgram({ text: 'a\n', version: 'p2' })).toEqual({ kind: 'unavailable', reason: 'method-not-found' });
        expect(interop.sentRequests.filter(r => r.method === 'formatProgram')).toHaveLength(1);

        interop.formatProgramMethodMissing = false;
        const generationBefore = interop.connectionGeneration;
        if (cause === 'a cache clear') {
            interop.clearCache();
        } else if (cause === 'a lost program connection') {
            interop.dropConnection(interop.sentRequests.find(r => r.method === 'formatProgram')!.connectionId);
        } else {
            interop.dropConnection(interop.sentRequests.find(r => r.method === 'getClassInfo')!.connectionId);
            await rawClassAccess.getRawClass('test.Again');
            expect(interop.connectionGeneration).toBeGreaterThan(generationBefore);
        }

        const outcome = await interop.formatProgram({ text: 'a\n', version: 'p3' });
        expect(outcome.kind).toBe('ok');
        expect(interop.sentRequests.filter(r => r.method === 'formatProgram')).toHaveLength(2);
    });

    test('a method-not-found answer from a replaced connection does not latch the new one', async () => {
        const { interop } = createFakePeerServices();
        interop.peerUp = true;
        interop.connectDelayMs = 0;
        vi.useFakeTimers();
        let rejectLater: (reason: unknown) => void = () => { };
        interop.answerWith('formatProgram', () => new Promise((_resolve, reject) => { rejectLater = reject; }));

        const stale = interop.formatProgram({ text: 'a\n', version: 's1' });
        await vi.advanceTimersByTimeAsync(0);
        const staleConnection = interop.sentRequests.find(r => r.method === 'formatProgram')!.connectionId;
        interop.dropConnection(staleConnection);
        rejectLater({ code: -32601 });

        expect(await stale).toEqual({ kind: 'unavailable', reason: 'method-not-found' });

        interop.answerWith('formatProgram', params => {
            const request = params as { text: string; version: string };
            return { text: request.text, diagnostics: [], denumbered: false, version: request.version };
        });
        const next = await interop.formatProgram({ text: 'a\n', version: 's2' });

        expect(next.kind).toBe('ok');
        const formatRequests = interop.sentRequests.filter(r => r.method === 'formatProgram');
        expect(formatRequests).toHaveLength(2);
        expect(formatRequests[1].connectionId).not.toBe(staleConnection);
    });
});

describe('the outcome of every peer answer', () => {
    afterEach(() => {
        vi.restoreAllMocks();
        vi.clearAllMocks();
        vi.useRealTimers();
    });

    const failed = (failure: string, code: number) => ({ kind: 'failed', failure, code });

    test.each([
        ['-33001', () => new ResponseError(-33001, 'parse failed'), failed('parser-exception', -33001)],
        ['-33002', () => new ResponseError(-33002, 'overran'), { kind: 'timeout', origin: 'peer' }],
        ['-33003', () => new ResponseError(-33003, 'too large'), failed('size-cap', -33003)],
        ['-33004', () => new ResponseError(-33004, 'closing'), failed('service-unavailable', -33004)],
        ['-33005', () => new ResponseError(-33005, 'protected'), failed('protected-program', -33005)],
        ['-33006', () => new ResponseError(-33006, 'line numbers'), failed('denum-needed', -33006)],
        ['-33007', () => new ResponseError(-33007, 'bad settings', [{ setting: 'indentWidth', message: 'not an integer' }]),
            { kind: 'invalid-settings', problems: [{ setting: 'indentWidth', message: 'not an integer' }] }],
        ['-33008', () => new ResponseError(-33008, 'mixed', { line: 2 }), { kind: 'mixed-numbering', line: 2 }],
        ['-33008 with garbage data', () => new ResponseError(-33008, 'mixed', 'garbage'), { kind: 'mixed-numbering', line: undefined }],
        ['-33009', () => new ResponseError(-33009, 'engine failed'), failed('format-failed', -33009)],
        ['-32602', () => new ResponseError(-32602, 'bad params'), failed('invalid-params', -32602)],
        ['-32800', () => new ResponseError(-32800, 'superseded'), { kind: 'cancelled' }],
        ['a plain error', () => new Error('connection reset'), { kind: 'failed', failure: 'transport' }]
    ])('a %s answer is its own typed outcome on both methods', async (_name, makeError, expected) => {
        const { interop } = createFakePeerServices();
        interop.peerUp = true;
        interop.connectDelayMs = 0;
        vi.useFakeTimers();
        spyOnLogger();
        const handler = () => { throw makeError(); };
        interop.answerWith('formatProgram', handler);
        interop.answerWith('denumProgram', handler);

        for (const method of ['formatProgram', 'denumProgram'] as const) {
            const outcome = await callProgram(interop, method, `o-${method}`);
            expect(outcome).toMatchObject(expected);
        }
    });

    test('a -33004 answer never latches the method off: the next call still sends a request', async () => {
        const { interop } = createFakePeerServices();
        interop.peerUp = true;
        interop.connectDelayMs = 0;
        vi.useFakeTimers();
        spyOnLogger();
        interop.answerWith('formatProgram', () => { throw new ResponseError(-33004, 'closing'); });

        expect(await interop.formatProgram({ text: 'a\n', version: 'u1' })).toMatchObject({ kind: 'failed', failure: 'service-unavailable' });
        interop.answerWith('formatProgram', params => {
            const request = params as { text: string; version: string };
            return { text: request.text, diagnostics: [], denumbered: false, version: request.version };
        });

        expect((await interop.formatProgram({ text: 'a\n', version: 'u2' })).kind).toBe('ok');
        expect(interop.sentRequests.filter(r => r.method === 'formatProgram')).toHaveLength(2);
    });
});

describe('an error burst', () => {
    afterEach(() => {
        vi.restoreAllMocks();
        vi.clearAllMocks();
        vi.useRealTimers();
        initNotifications(null as unknown as Connection);
        clearAllVerdictStates();
    });

    test('twenty application errors leave the generation, class lookups and live parse untouched', async () => {
        const { interop } = createFakePeerServices();
        interop.peerUp = true;
        interop.connectDelayMs = 0;
        vi.useFakeTimers();
        const showErrorMessage = vi.fn();
        initNotifications({ window: { showErrorMessage } } as unknown as Connection);
        spyOnLogger();
        const rawClassAccess = interop as unknown as RawClassAccess;

        await rawClassAccess.getRawClass('test.Warm');
        const generationBefore = interop.connectionGeneration;

        const codes = [-33001, -33002, -33003, -33004, -33005, -33006, -33007, -33008, -33009, -32602, -32800];
        let next = 0;
        const burst = () => {
            const code = codes[next++ % codes.length];
            const data = code === -33007 ? [{ setting: 'indentWidth', message: 'bad' }] : code === -33008 ? { line: 2 } : undefined;
            throw new ResponseError(code, `burst ${code}`, data);
        };
        interop.answerWith('formatProgram', burst);
        interop.answerWith('denumProgram', burst);

        const outcomes = await Promise.all(Array.from({ length: 20 }, (_, index) =>
            callProgram(interop, index % 2 === 0 ? 'formatProgram' : 'denumProgram', `burst-${index}`)));

        const tokens = new Set(outcomes.map(outcome => outcome.kind === 'failed' ? outcome.failure : outcome.kind));
        expect(tokens.size).toBe(codes.length);
        expect(interop.connectionGeneration).toBe(generationBefore);

        // The shared connection still answers: no new socket, no circuit-open error, no dialog.
        const attemptsAfterBurst = interop.socketAttempts;
        const lookup = await rawClassAccess.getRawClass('test.AfterBurst');
        expect(lookup.error ?? '').not.toContain('circuit open');
        expect(lookup.error).toBeUndefined();
        expect(interop.socketAttempts).toBe(attemptsAfterBurst);
        expect(showErrorMessage).not.toHaveBeenCalled();

        const parse = await liveParse(interop, 'after-burst');
        expect(parse.verdict.kind).toBe('verdict');
        expect(parse.enabled).toBe(true);
        expect(interop.connectionGeneration).toBe(generationBefore);
    });
});

describe('failure logging', () => {
    afterEach(() => {
        vi.restoreAllMocks();
        vi.clearAllMocks();
        vi.useRealTimers();
    });

    const staleAnswer = () => ({ text: 'x', diagnostics: [], denumbered: false, version: 'stale' });

    test('a malformed answer warns once per connection, then logs at debug, and warns again on a new connection', async () => {
        const { interop } = createFakePeerServices();
        interop.peerUp = true;
        interop.connectDelayMs = 0;
        vi.useFakeTimers();
        const spies = spyOnLogger();
        interop.answerWith('formatProgram', staleAnswer);

        expect(await interop.formatProgram({ text: 'x', version: 'w1' })).toMatchObject({ kind: 'malformed-result' });
        expect(await interop.formatProgram({ text: 'x', version: 'w2' })).toMatchObject({ kind: 'malformed-result' });

        expect(spies.warn).toHaveBeenCalledTimes(1);
        expect(spies.debug).toHaveBeenCalledTimes(1);
        for (const spy of [spies.warn, spies.debug]) {
            const line = String(spy.mock.calls[0][0]);
            expect(line).toContain('formatProgram');
            expect(line).toContain('malformed-result');
        }

        interop.dropConnection(interop.sentRequests.find(r => r.method === 'formatProgram')!.connectionId);
        expect(await interop.formatProgram({ text: 'x', version: 'w3' })).toMatchObject({ kind: 'malformed-result' });

        expect(spies.warn).toHaveBeenCalledTimes(2);
        expect(spies.debug).toHaveBeenCalledTimes(1);
    });

    test('no log line at any level contains the request text', async () => {
        const { interop } = createFakePeerServices();
        interop.peerUp = true;
        interop.connectDelayMs = 0;
        vi.useFakeTimers();
        const spies = spyOnLogger();
        const marker = 'QWERTY789-SECRET';
        const text = `REM ${marker}\n`;

        interop.answerWith('formatProgram', staleAnswer);
        await interop.formatProgram({ text, version: 'x1' });
        interop.answerWith('formatProgram', () => { throw new ResponseError(-33009, 'format engine failed'); });
        await interop.formatProgram({ text, version: 'x2' });
        interop.answerWith('formatProgram', () => { throw new Error('connection reset'); });
        await interop.formatProgram({ text, version: 'x3' });

        expect(spies.warn).toHaveBeenCalledTimes(3);
        for (const line of spies.lines()) {
            expect(line).not.toContain(marker);
        }
    });

    test('a peer cancellation answer is not a failure and is not logged at any level', async () => {
        const { interop } = createFakePeerServices();
        interop.peerUp = true;
        interop.connectDelayMs = 0;
        vi.useFakeTimers();
        const spies = spyOnLogger();
        interop.answerWith('formatProgram', () => { throw new ResponseError(-32800, 'superseded'); });

        expect(await interop.formatProgram({ text: 'x', version: 'c1' })).toEqual({ kind: 'cancelled' });

        expect(spies.lines()).toEqual([]);
    });
});

describe('the request deadline and cancellation', () => {
    afterEach(() => {
        vi.restoreAllMocks();
        vi.clearAllMocks();
        vi.useRealTimers();
    });

    const params = (version: string) => ({ text: 'x = 1\n', version });

    /** A fake peer with the dedicated connection already open (one answered request) and every logger level spied. */
    async function openLane() {
        const { interop } = createFakePeerServices();
        interop.peerUp = true;
        interop.connectDelayMs = 0;
        vi.useFakeTimers();
        const spies = spyOnLogger();
        expect((await interop.formatProgram(params('ready'))).kind).toBe('ok');
        const connectionId = interop.sentRequests.find(r => r.method === 'formatProgram')!.connectionId;
        return { interop, spies, connectionId };
    }

    test('a request still pending at the deadline is cancelled on the wire and settles as a client timeout, never as transport', async () => {
        const { interop, spies, connectionId } = await openLane();
        expect(vi.getTimerCount()).toBe(0);
        interop.hungConnectionIds.add(connectionId);

        let settled = false;
        const pending = interop.formatProgram(params('slow')).then(outcome => {
            settled = true;
            return outcome;
        });
        await vi.advanceTimersByTimeAsync(PROGRAM_REQUEST_TIMEOUT_MS - 1);
        expect(settled).toBe(false);
        await vi.advanceTimersByTimeAsync(1);
        expect(settled).toBe(true);

        expect(await pending).toEqual({ kind: 'timeout', origin: 'client' });
        expect(interop.cancelledRequests).toHaveLength(1);
        expect(interop.cancelledRequests[0].params).toMatchObject({ version: 'slow' });
        expect(spies.warn).toHaveBeenCalledTimes(1);
        for (const line of spies.lines()) {
            expect(line).not.toContain('transport');
        }
        expect(vi.getTimerCount()).toBe(0);

        // The same connection serves the next request once the peer answers again.
        interop.hungConnectionIds.delete(connectionId);
        expect((await interop.formatProgram(params('after'))).kind).toBe('ok');
        const formatRequests = interop.sentRequests.filter(r => r.method === 'formatProgram');
        expect(formatRequests[formatRequests.length - 1].connectionId).toBe(connectionId);
    });

    const programRange = { start: { line: 0, character: 0 }, end: { line: 1, character: 0 } };

    test.each([
        ['a whole-document format', (interop: FakePeerInteropService) => interop.formatProgram(params('d1'))],
        ['a whole-document format that explicitly forbids denumbering', (interop: FakePeerInteropService) => interop.formatProgram({ ...params('d2'), allowDenum: false })],
        ['a range format', (interop: FakePeerInteropService) => interop.formatProgram({ ...params('d3'), range: programRange })],
        ['a DENUM request', (interop: FakePeerInteropService) => interop.denumProgram(params('d4'))]
    ])('%s is cancelled at the default deadline', async (_name, send) => {
        const { interop, connectionId } = await openLane();
        interop.hungConnectionIds.add(connectionId);

        let settled = false;
        const pending = send(interop).then(outcome => {
            settled = true;
            return outcome;
        });
        await vi.advanceTimersByTimeAsync(PROGRAM_REQUEST_TIMEOUT_MS - 1);
        expect(settled).toBe(false);
        await vi.advanceTimersByTimeAsync(1);

        expect(settled).toBe(true);
        expect(await pending).toEqual({ kind: 'timeout', origin: 'client' });
        expect(interop.cancelledRequests).toHaveLength(1);
    });

    test('a format request that allows denumbering gets the longer deadline, then is cancelled on the wire like any other', async () => {
        const { interop, spies, connectionId } = await openLane();
        interop.hungConnectionIds.add(connectionId);

        let settled = false;
        const pending = interop.formatProgram({ ...params('long'), allowDenum: true }).then(outcome => {
            settled = true;
            return outcome;
        });
        // Past the default deadline the request is still waiting, and nothing was cancelled.
        await vi.advanceTimersByTimeAsync(PROGRAM_REQUEST_TIMEOUT_MS);
        expect(settled).toBe(false);
        expect(interop.cancelledRequests).toHaveLength(0);

        await vi.advanceTimersByTimeAsync(PROGRAM_DENUM_FORMAT_REQUEST_TIMEOUT_MS - PROGRAM_REQUEST_TIMEOUT_MS - 1);
        expect(settled).toBe(false);
        await vi.advanceTimersByTimeAsync(1);

        expect(settled).toBe(true);
        expect(await pending).toEqual({ kind: 'timeout', origin: 'client' });
        expect(interop.cancelledRequests).toHaveLength(1);
        expect(interop.cancelledRequests[0].params).toMatchObject({ version: 'long', allowDenum: true });
        expect(spies.warn).toHaveBeenCalledTimes(1);
        expect(String(spies.warn.mock.calls[0][0])).toContain('no answer within 25 s');
        expect(vi.getTimerCount()).toBe(0);
    });

    test('a caller cancellation settles at once as cancelled, is sent to the peer, and is neither logged nor leaves a timer', async () => {
        const { interop, spies, connectionId } = await openLane();
        interop.hungConnectionIds.add(connectionId);
        const source = new CancellationTokenSource();

        let settled = false;
        const pending = interop.formatProgram(params('c1'), source.token).then(outcome => {
            settled = true;
            return outcome;
        });
        await vi.advanceTimersByTimeAsync(0);
        expect(settled).toBe(false);

        source.cancel();

        expect(await pending).toEqual({ kind: 'cancelled' });
        expect(interop.cancelledRequests).toHaveLength(1);
        expect(spies.lines()).toEqual([]);
        expect(vi.getTimerCount()).toBe(0);
        source.dispose();
    });

    test('a cancellation while the connection is still opening settles at once as cancelled, and the open is kept for the next request', async () => {
        const { interop } = createFakePeerServices();
        interop.peerUp = true;
        interop.connectDelayMs = 8000;
        vi.useFakeTimers();
        const spies = spyOnLogger();
        const source = new CancellationTokenSource();

        let settled = false;
        const pending = interop.formatProgram(params('o1'), source.token).then(outcome => {
            settled = true;
            return outcome;
        });
        await vi.advanceTimersByTimeAsync(1000);
        expect(settled).toBe(false);
        expect(interop.socketAttempts).toBe(1);

        // No timer is advanced: the cancellation alone settles the call, long before the open does.
        source.cancel();
        expect(await pending).toEqual({ kind: 'cancelled' });
        expect(interop.sentRequests).toEqual([]);
        source.dispose();

        // The open carries on and its connection serves the next request: no second socket.
        await vi.advanceTimersByTimeAsync(7000);
        const next = await interop.formatProgram(params('o2'));
        expect(next.kind).toBe('ok');
        expect(interop.socketAttempts).toBe(1);
        expect(interop.sentRequests.filter(r => r.method === 'formatProgram')).toHaveLength(1);
        expect(spies.lines()).toEqual([]);
        expect(vi.getTimerCount()).toBe(0);
    });

    test('a token that is already cancelled settles as cancelled with no socket and no request', async () => {
        const { interop } = createFakePeerServices();
        interop.peerUp = true;
        interop.connectDelayMs = 0;
        vi.useFakeTimers();
        const source = new CancellationTokenSource();
        source.cancel();

        const outcome = await interop.formatProgram(params('p1'), source.token);

        expect(outcome).toEqual({ kind: 'cancelled' });
        expect(interop.sentRequests).toEqual([]);
        expect(interop.socketAttempts).toBe(0);
        source.dispose();
    });

    test('a -33002 answer is a plain peer timeout: the connection is kept and serves the next request', async () => {
        const { interop, connectionId } = await openLane();
        interop.answerWith('formatProgram', () => { throw new ResponseError(-33002, 'overran'); });

        expect(await interop.formatProgram(params('t1'))).toEqual({ kind: 'timeout', origin: 'peer' });
        interop.answerWith('formatProgram', request => {
            const { text, version } = request as { text: string; version: string };
            return { text, diagnostics: [], denumbered: false, version };
        });
        expect((await interop.formatProgram(params('t2'))).kind).toBe('ok');

        const formatRequests = interop.sentRequests.filter(r => r.method === 'formatProgram');
        expect(new Set(formatRequests.map(r => r.connectionId))).toEqual(new Set([connectionId]));
        expect(interop.connectionRecords().find(r => r.id === connectionId)?.disposed).toBe(false);
        expect(vi.getTimerCount()).toBe(0);
    });

    test('the peer rejecting a cancelled request after the outcome has settled is not an unhandled rejection', async () => {
        const { interop, connectionId } = await openLane();
        interop.hungConnectionIds.add(connectionId);
        const unhandled = vi.fn();
        process.on('unhandledRejection', unhandled);
        try {
            const source = new CancellationTokenSource();
            const pending = interop.formatProgram(params('u1'), source.token);
            await vi.advanceTimersByTimeAsync(0);
            source.cancel();
            expect(await pending).toEqual({ kind: 'cancelled' });
            source.dispose();

            vi.useRealTimers();
            await new Promise(resolve => setTimeout(resolve, 0));
            expect(unhandled).not.toHaveBeenCalled();
        } finally {
            process.off('unhandledRejection', unhandled);
        }
    });
});
