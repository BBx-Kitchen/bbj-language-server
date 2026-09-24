/******************************************************************************
 * Copyright 2023 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

/**
 * A parse sent through `parseProgram()` must never wait behind class-lookup traffic already
 * queued on the shared interop connection during a large workspace's initial build (issue
 * #692). This file proves the dedicated connection end to end against the scriptable fake
 * peer, then pins its shared-connection fallback and connection lifecycle. Runs entirely
 * against `test/fake-interop-peer.ts` under fake timers — never a real socket, never port 5008.
 */
import { URI, type LangiumDocument } from 'langium';
import type { Connection } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { initNotifications } from '../src/language/bbj-notifications.js';
import { clearAllVerdictStates, getVerdictState, setVerdictState } from '../src/language/bbj-diagnostic-reconciliation.js';
import { JavaClass } from '../src/language/generated/ast.js';
import { InteropTransportError, isInteropTransportFailure, METHOD_NOT_FOUND } from '../src/language/java-interop.js';
import { BBjParserService } from '../src/language/bbj-parser-service.js';
import { logger } from '../src/language/logger.js';
import { createFakePeerServices } from './fake-interop-peer.js';

/** Exposes the protected `getRawClass()` to the test via a structural cast. */
type RawClassAccess = { getRawClass(className: string): Promise<JavaClass> };

describe('dedicated parser connection', () => {
    afterEach(() => {
        vi.useRealTimers();
    });

    test('a parse is answered on its own connection while class lookups on the shared connection are still pending', async () => {
        const { interop } = createFakePeerServices();
        interop.peerUp = true;
        interop.connectDelayMs = 0;
        vi.useFakeTimers();

        const rawClassAccess = interop as unknown as RawClassAccess;
        // One answered lookup opens and confirms the shared connection (connection 1).
        await rawClassAccess.getRawClass('test.Warm');
        expect(interop.socketAttempts).toBe(1);

        // The shared connection now hangs every further request, standing in for a large
        // workspace's initial build with many class lookups already outstanding.
        interop.hungConnectionIds.add(1);
        const settled: boolean[] = Array.from({ length: 50 }, () => false);
        const pendingLookups = Array.from({ length: 50 }, (_, i) =>
            rawClassAccess.getRawClass(`test.Missing${i}`).then(
                () => { settled[i] = true; },
                () => { settled[i] = true; }
            )
        );

        const result = await interop.parseProgram({
            text: 'x = 1',
            canonicalName: '/proj/a.bbj',
            version: '1',
            prefixes: [],
            workspaceRoots: []
        });

        expect(result.errors).toEqual([]);
        expect(interop.socketAttempts).toBe(2);

        const classInfoRequests = interop.sentRequests.filter(r => r.method === 'getClassInfo');
        expect(classInfoRequests.length).toBeGreaterThan(0);
        expect(classInfoRequests.every(r => r.connectionId === 1)).toBe(true);

        const parseRequests = interop.sentRequests.filter(r => r.method === 'parseProgram');
        expect(parseRequests).toHaveLength(1);
        expect(parseRequests[0].connectionId).toBe(2);

        // The fifty lookups on the hung shared connection are still pending.
        expect(settled.every(s => s === false)).toBe(true);

        // Cleanup: drop every connection and let the still-pending lookups settle.
        interop.dropConnection();
        await vi.advanceTimersByTimeAsync(10000);
        await Promise.allSettled(pendingLookups);
    });
});

describe('the shared-connection fallback, the dedicated connection lifecycle, and the latch/verdict interplay', () => {
    afterEach(() => {
        vi.restoreAllMocks();
        vi.clearAllMocks();
        vi.useRealTimers();
        initNotifications(null as unknown as Connection);
        clearAllVerdictStates();
    });

    test('with the dedicated connection refused, a parse succeeds over the shared connection, warns once with only the refusal text, never shows a dialog, and leaves the generation unchanged', async () => {
        const { interop } = createFakePeerServices();
        interop.peerUp = true;
        interop.connectDelayMs = 0;
        vi.useFakeTimers();

        const showErrorMessage = vi.fn();
        initNotifications({ window: { showErrorMessage } } as unknown as Connection);
        const warnSpy = vi.spyOn(logger, 'warn').mockImplementation(() => { });

        const rawClassAccess = interop as unknown as RawClassAccess;
        await rawClassAccess.getRawClass('test.Warm'); // opens the shared connection first (attempt 1)
        const generationBefore = interop.connectionGeneration;
        interop.refusedSocketAttempts.add(2); // the dedicated connection's own attempt

        const secretText = 'REM this text must never reach a log line, marker XYZZY456';
        const result = await interop.parseProgram({
            text: secretText,
            canonicalName: '/proj/refused.bbj',
            version: '1',
            prefixes: [],
            workspaceRoots: []
        });

        expect(result.errors).toEqual([]);
        expect(interop.socketAttempts).toBe(2);
        const parseRequests = interop.sentRequests.filter(r => r.method === 'parseProgram');
        expect(parseRequests).toHaveLength(1);
        expect(parseRequests[0].connectionId).toBe(1);

        expect(warnSpy).toHaveBeenCalledTimes(1);
        const warnLine = String(warnSpy.mock.calls[0][0]);
        expect(warnLine).toContain('ECONNREFUSED');
        expect(warnLine).not.toContain('XYZZY456');
        expect(showErrorMessage).not.toHaveBeenCalled();
        expect(interop.connectionGeneration).toBe(generationBefore);

        // A class lookup afterwards still succeeds, reusing the shared connection.
        const attemptsBeforeLookup = interop.socketAttempts;
        const lookup = await rawClassAccess.getRawClass('test.AfterFallback');
        expect(lookup.error).toBeUndefined();
        expect(interop.socketAttempts).toBe(attemptsBeforeLookup);
    });

    test('a second parse in the same generation opens no new socket and logs nothing; clearCache() makes the next parse try the dedicated connection again', async () => {
        const { interop } = createFakePeerServices();
        interop.peerUp = true;
        interop.connectDelayMs = 0;
        vi.useFakeTimers();
        const warnSpy = vi.spyOn(logger, 'warn').mockImplementation(() => { });

        await interop.parseProgram({ text: 'x = 1', canonicalName: '/proj/a.bbj', version: '1', prefixes: [], workspaceRoots: [] });
        const attemptsAfterFirst = interop.socketAttempts;
        // The dedicated lane is tried first and independently: a parse that never needs the
        // shared connection opens only the lane's own socket, not a second one for `connect()`.
        expect(attemptsAfterFirst).toBe(1);

        await interop.parseProgram({ text: 'x = 2', canonicalName: '/proj/a.bbj', version: '2', prefixes: [], workspaceRoots: [] });
        expect(interop.socketAttempts).toBe(attemptsAfterFirst);
        expect(warnSpy).not.toHaveBeenCalled();

        interop.clearCache();
        await interop.parseProgram({ text: 'x = 3', canonicalName: '/proj/a.bbj', version: '3', prefixes: [], workspaceRoots: [] });
        // clearCache() disposes both connections, but the next parse still only needs to reopen
        // the dedicated one.
        expect(interop.socketAttempts).toBe(attemptsAfterFirst + 1);
    });

    test('two same-tick parses open exactly one dedicated socket and both requests carry the same connection id', async () => {
        const { interop } = createFakePeerServices();
        interop.peerUp = true;
        interop.connectDelayMs = 0;
        vi.useFakeTimers();

        const [resultA, resultB] = await Promise.all([
            interop.parseProgram({ text: 'a', canonicalName: '/proj/a.bbj', version: '1', prefixes: [], workspaceRoots: [] }),
            interop.parseProgram({ text: 'b', canonicalName: '/proj/b.bbj', version: '1', prefixes: [], workspaceRoots: [] })
        ]);

        expect(resultA.errors).toEqual([]);
        expect(resultB.errors).toEqual([]);
        // Both parses share the one dedicated socket; neither needs the shared connection.
        expect(interop.socketAttempts).toBe(1);

        const parseRequests = interop.sentRequests.filter(r => r.method === 'parseProgram');
        expect(parseRequests).toHaveLength(2);
        expect(parseRequests[0].connectionId).toBe(parseRequests[1].connectionId);
    });

    test('opening the dedicated connection leaves the generation unchanged; losing it bumps the generation by one, the next class lookup stays on the shared connection, and the next parse reopens a dedicated connection', async () => {
        const { interop } = createFakePeerServices();
        interop.peerUp = true;
        interop.connectDelayMs = 0;
        vi.useFakeTimers();

        const rawClassAccess = interop as unknown as RawClassAccess;
        await rawClassAccess.getRawClass('test.Warm'); // opens the shared connection, bumping the generation once
        const generationAfterShared = interop.connectionGeneration;

        await interop.parseProgram({ text: 'x = 1', canonicalName: '/proj/a.bbj', version: '1', prefixes: [], workspaceRoots: [] });
        expect(interop.connectionGeneration).toBe(generationAfterShared);

        const laneConnectionId = interop.sentRequests.find(r => r.method === 'parseProgram')!.connectionId;
        interop.dropConnection(laneConnectionId);
        expect(interop.connectionGeneration).toBe(generationAfterShared + 1);

        const attemptsBeforeLookup = interop.socketAttempts;
        const lookup = await rawClassAccess.getRawClass('test.AfterLaneDrop');
        expect(lookup.error).toBeUndefined();
        expect(interop.socketAttempts).toBe(attemptsBeforeLookup);

        const attemptsBeforeSecondParse = interop.socketAttempts;
        const result = await interop.parseProgram({ text: 'x = 2', canonicalName: '/proj/a.bbj', version: '2', prefixes: [], workspaceRoots: [] });
        expect(result.errors).toEqual([]);
        expect(interop.socketAttempts).toBe(attemptsBeforeSecondParse + 1);
        const parseRequests = interop.sentRequests.filter(r => r.method === 'parseProgram');
        expect(parseRequests[1].connectionId).not.toBe(laneConnectionId);
    });

    test('a parse pending on a hung dedicated connection rejects as a transport failure when that connection drops', async () => {
        const { interop } = createFakePeerServices();
        interop.peerUp = true;
        interop.connectDelayMs = 0;
        vi.useFakeTimers();

        const rawClassAccess = interop as unknown as RawClassAccess;
        await rawClassAccess.getRawClass('test.Warm'); // opens the shared connection as connection 1

        interop.hungConnectionIds.add(2); // the dedicated connection, opened next, will be connection 2

        const pendingParse = interop.parseProgram({ text: 'x = 1', canonicalName: '/proj/a.bbj', version: '1', prefixes: [], workspaceRoots: [] });
        await vi.advanceTimersByTimeAsync(0);
        expect(interop.socketAttempts).toBe(2);
        expect(interop.sentRequests.filter(r => r.method === 'parseProgram')).toHaveLength(1);

        interop.dropConnection(2);

        let caught: unknown;
        try {
            await pendingParse;
        } catch (e) {
            caught = e;
        }
        expect(isInteropTransportFailure(caught)).toBe(true);
    });

    test('an older server behind the dedicated connection: the parse rejects with MethodNotFound, the dedicated connection is disposed, and the next parse in the same generation opens the shared connection', async () => {
        const { interop } = createFakePeerServices();
        interop.peerUp = true;
        interop.connectDelayMs = 0;
        interop.parseProgramMethodMissing = true;
        vi.useFakeTimers();

        let caught: unknown;
        try {
            await interop.parseProgram({ text: 'x = 1', canonicalName: '/proj/a.bbj', version: '1', prefixes: [], workspaceRoots: [] });
        } catch (e) {
            caught = e;
        }
        expect((caught as { code?: number } | undefined)?.code).toBe(METHOD_NOT_FOUND);
        // Only the dedicated lane was tried for this attempt; the shared connection was never needed.
        expect(interop.socketAttempts).toBe(1);

        const laneConnectionId = interop.sentRequests.find(r => r.method === 'parseProgram')!.connectionId;
        expect(interop.connectionRecords().find(r => r.id === laneConnectionId)?.disposed).toBe(true);

        interop.parseProgramMethodMissing = false;
        const attemptsBeforeNext = interop.socketAttempts;
        const result = await interop.parseProgram({ text: 'x = 2', canonicalName: '/proj/a.bbj', version: '2', prefixes: [], workspaceRoots: [] });
        expect(result.errors).toEqual([]);
        // The lane is retired for this generation, so the next parse opens the shared connection
        // instead — its request travels on that new connection's own id.
        expect(interop.socketAttempts).toBe(attemptsBeforeNext + 1);
        const parseRequests = interop.sentRequests.filter(r => r.method === 'parseProgram');
        expect(parseRequests[1].connectionId).not.toBe(laneConnectionId);
    });

    test('clearCache marks the dedicated connection disposed', async () => {
        const { interop } = createFakePeerServices();
        interop.peerUp = true;
        interop.connectDelayMs = 0;
        vi.useFakeTimers();

        await interop.parseProgram({ text: 'x = 1', canonicalName: '/proj/a.bbj', version: '1', prefixes: [], workspaceRoots: [] });
        const laneConnectionId = interop.sentRequests.find(r => r.method === 'parseProgram')!.connectionId;
        expect(interop.connectionRecords().find(r => r.id === laneConnectionId)?.disposed).toBe(false);

        interop.clearCache();
        expect(interop.connectionRecords().find(r => r.id === laneConnectionId)?.disposed).toBe(true);
    });

    test('with the peer down, a parse tries its own connection, then the shared one, and rejects as a transport failure with no request sent', async () => {
        const { interop } = createFakePeerServices();
        interop.peerUp = false;
        interop.connectDelayMs = 0;
        vi.useFakeTimers();

        const showErrorMessage = vi.fn();
        initNotifications({ window: { showErrorMessage } } as unknown as Connection);

        let caught: unknown;
        try {
            await interop.parseProgram({ text: 'x = 1', canonicalName: '/proj/a.bbj', version: '1', prefixes: [], workspaceRoots: [] });
        } catch (e) {
            caught = e;
        }
        expect(isInteropTransportFailure(caught)).toBe(true);
        // The dedicated lane's own attempt fails first (falling back silently), then the shared
        // connection's own attempt also fails.
        expect(interop.socketAttempts).toBe(2);
        expect(interop.sentRequests.some(r => r.method === 'parseProgram')).toBe(false);
    });

    test('with the shared breaker open, a parse is answered over its own connection', async () => {
        const { interop } = createFakePeerServices();
        interop.peerUp = true;
        interop.connectDelayMs = 0;
        vi.useFakeTimers();

        // The very first socket attempt (the shared connection's own) is refused, opening the
        // breaker; the dedicated lane's later attempt succeeds since only attempt 1 is refused.
        interop.refusedSocketAttempts.add(1);

        const rawClassAccess = interop as unknown as RawClassAccess;
        let warmCaught: unknown;
        try {
            await rawClassAccess.getRawClass('test.Warm');
        } catch (e) {
            warmCaught = e;
        }
        expect(isInteropTransportFailure(warmCaught)).toBe(true);

        const result = await interop.parseProgram({ text: 'x = 1', canonicalName: '/proj/a.bbj', version: '1', prefixes: [], workspaceRoots: [] });
        expect(result.errors).toEqual([]);
        expect(interop.socketAttempts).toBe(2);

        const parseRequests = interop.sentRequests.filter(r => r.method === 'parseProgram');
        expect(parseRequests).toHaveLength(1);
        const laneConnectionId = parseRequests[0].connectionId;
        // The parse was answered over the dedicated lane, not the (still broken) shared connection.
        expect(interop.connectionRecords().find(r => r.id === laneConnectionId)).toBeDefined();

        // The breaker was not closed by the parse: a class lookup right afterwards still
        // short-circuits with the circuit-open message, and makes no new socket attempt.
        const attemptsBeforeLookup = interop.socketAttempts;
        let lookupCaught: unknown;
        try {
            await rawClassAccess.getRawClass('test.AfterParse');
        } catch (e) {
            lookupCaught = e;
        }
        expect(lookupCaught).toBeInstanceOf(InteropTransportError);
        expect((lookupCaught as Error).message).toContain('circuit open');
        expect(interop.socketAttempts).toBe(attemptsBeforeLookup);
    });

    test('a real BBjParserService over the fake peer: dropping the dedicated connection clears a document verdict state on the next isEnabled() call', async () => {
        const { interop } = createFakePeerServices();
        interop.peerUp = true;
        interop.connectDelayMs = 0;
        vi.useFakeTimers();

        const parserService = new BBjParserService({
            shared: { workspace: { WorkspaceManager: {} } },
            java: { JavaInteropService: interop }
        });

        const uri = URI.file('/proj/verdict.bbj');
        const document = {
            uri,
            textDocument: TextDocument.create(uri.toString(), 'bbj', 1, 'rem line 1\n')
        } as unknown as LangiumDocument;

        const outcome = await parserService.requestLiveParse(document);
        expect(outcome.kind).toBe('verdict');

        setVerdictState(uri, { seen: new Set(['some-key']) });
        expect(getVerdictState(uri)).toBeDefined();

        const laneConnectionId = interop.sentRequests.find(r => r.method === 'parseProgram')!.connectionId;
        interop.dropConnection(laneConnectionId);

        parserService.isEnabled();
        expect(getVerdictState(uri)).toBeUndefined();
    });
});
