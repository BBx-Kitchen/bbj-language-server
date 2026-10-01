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
import { ResponseError } from 'vscode-jsonrpc/node.js';
import type { Connection } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { BBjParserService } from '../src/language/bbj-parser-service.js';
import { initNotifications } from '../src/language/bbj-notifications.js';
import { clearAllVerdictStates, getVerdictState, setVerdictState } from '../src/language/bbj-diagnostic-reconciliation.js';
import { JavaClass } from '../src/language/generated/ast.js';
import { PROGRAM_LANE_REOPEN_COOLDOWN_MS } from '../src/language/java-interop-program-lane.js';
import { logger } from '../src/language/logger.js';
import { createFakePeerServices } from './fake-interop-peer.js';

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
