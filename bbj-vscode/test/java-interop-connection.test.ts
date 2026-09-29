/******************************************************************************
 * Copyright 2023 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

/**
 * `JavaInteropConnection`'s own coverage, built with a stub socket factory and no owning
 * service or Langium services at all (#558): the shared connection, its circuit breaker,
 * cooldown backoff, stale-attempt handling, reset, disconnect, the connection generation
 * and `probeIfDue()`.
 */
import { Socket } from 'net';
import { MessageConnection } from 'vscode-jsonrpc/node.js';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import {
    INTEROP_BREAKER_BACKOFF_FACTOR, INTEROP_BREAKER_INITIAL_COOLDOWN_MS, INTEROP_BREAKER_MAX_COOLDOWN_MS,
    InteropTransportError, JavaInteropConnection
} from '../src/language/java-interop-connection.js';

/** Per-fake-connection bookkeeping: what `listen()`/`dispose()` were called and the registered listeners. */
interface FakeConnectionRecord {
    listened: boolean;
    disposed: boolean;
    closeListeners: Array<() => void>;
    errorListeners: Array<() => void>;
}

/** A minimal fake `MessageConnection`: no real requests are ever sent over it in this suite. */
function createFakeMessageConnection(record: FakeConnectionRecord): MessageConnection {
    return {
        listen: () => { record.listened = true; },
        dispose: () => { record.disposed = true; },
        onClose: (listener: () => void) => { record.closeListeners.push(listener); },
        onError: (listener: () => void) => { record.errorListeners.push(listener); },
        sendRequest: () => Promise.resolve(undefined)
    } as unknown as MessageConnection;
}

describe('JavaInteropConnection (#558)', () => {
    let socketAttempts: number;
    let hookConnectCalls: number;
    /** Controls the next `createSocket()` hook call: an immediate success/failure, or a deferred one released via `pendingSocketReject`. */
    let socketMode: 'ok' | 'fail' | 'pending';
    let pendingSocketReject: ((error: Error) => void) | undefined;
    let lastRecord: FakeConnectionRecord | undefined;
    let connection: JavaInteropConnection;

    beforeEach(() => {
        socketAttempts = 0;
        hookConnectCalls = 0;
        socketMode = 'ok';
        pendingSocketReject = undefined;
        lastRecord = undefined;
        connection = new JavaInteropConnection({
            createSocket: () => {
                socketAttempts++;
                if (socketMode === 'fail') {
                    return Promise.reject(new Error('connect ECONNREFUSED 127.0.0.1:5008'));
                }
                if (socketMode === 'pending') {
                    return new Promise<Socket>((_resolve, reject) => { pendingSocketReject = reject; });
                }
                return Promise.resolve({} as unknown as Socket);
            },
            wrapSocket: () => {
                const record: FakeConnectionRecord = { listened: false, disposed: false, closeListeners: [], errorListeners: [] };
                lastRecord = record;
                return createFakeMessageConnection(record);
            },
            // The default the front provides: the hook calls the same instance's own connect().
            connect: () => {
                hookConnectCalls++;
                return connection.connect();
            }
        });
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    test('the first connect() opens one socket and wraps it, bumping generation by 1; a second connect() returns the same connection without a new socket', async () => {
        expect(connection.generation).toBe(0);
        const first = await connection.connect();
        expect(socketAttempts).toBe(1);
        expect(lastRecord?.listened).toBe(true);
        expect(connection.generation).toBe(1);

        const second = await connection.connect();
        expect(second).toBe(first);
        expect(socketAttempts).toBe(1);
        expect(connection.generation).toBe(1);
    });

    test('two same-tick connect() calls share one socket', async () => {
        const [a, b] = await Promise.all([connection.connect(), connection.connect()]);
        expect(a).toBe(b);
        expect(socketAttempts).toBe(1);
    });

    test('a socket failure rejects connect() with an InteropTransportError and opens the breaker; a connect() before the cooldown rejects with the circuit-open message without calling createSocket', async () => {
        socketMode = 'fail';
        await expect(connection.connect()).rejects.toBeInstanceOf(InteropTransportError);
        const attemptsAfterFailure = socketAttempts;

        await expect(connection.connect()).rejects.toThrow(/circuit open/);
        expect(socketAttempts).toBe(attemptsAfterFailure);
    });

    test('after the cooldown, one connect() is let through as the half-open probe; a successful probe closes the breaker and fires a registered recovery listener once', async () => {
        vi.useFakeTimers();
        socketMode = 'fail';
        await expect(connection.connect()).rejects.toBeInstanceOf(InteropTransportError);

        const recovered = vi.fn();
        connection.onConnectionRecovered(recovered);
        socketMode = 'ok';

        await vi.advanceTimersByTimeAsync(INTEROP_BREAKER_INITIAL_COOLDOWN_MS);
        await connection.connect();
        // The recovery listener is scheduled with Promise.resolve().then(...), never awaited by connect() itself.
        await vi.advanceTimersByTimeAsync(0);

        expect(recovered).toHaveBeenCalledTimes(1);
    });

    test('a failed probe keeps the breaker open, its cooldown backs off each round up to the cap, and the next probe is never let through before its own due time', async () => {
        vi.useFakeTimers();
        socketMode = 'fail';
        await expect(connection.connect()).rejects.toBeInstanceOf(InteropTransportError);

        let now = 0;
        let cooldown = INTEROP_BREAKER_INITIAL_COOLDOWN_MS;
        let dueAt = cooldown;

        for (let round = 0; round < 4; round++) {
            await vi.advanceTimersByTimeAsync(dueAt - now);
            now = dueAt;
            const beforeAttempts = socketAttempts;
            await expect(connection.connect()).rejects.toBeInstanceOf(InteropTransportError);
            expect(socketAttempts).toBe(beforeAttempts + 1);

            // The gap to the NEXT due time uses the cooldown that was active during the probe
            // just run; only afterward does the cooldown itself back off for the round after.
            dueAt = now + cooldown;
            cooldown = Math.min(cooldown * INTEROP_BREAKER_BACKOFF_FACTOR, INTEROP_BREAKER_MAX_COOLDOWN_MS);

            await vi.advanceTimersByTimeAsync((dueAt - 1) - now);
            now = dueAt - 1;
            const attemptsAtEdge = socketAttempts;
            await expect(connection.connect()).rejects.toThrow(/circuit open/);
            expect(socketAttempts).toBe(attemptsAtEdge);
        }

        expect(cooldown).toBe(INTEROP_BREAKER_MAX_COOLDOWN_MS);
    });

    test('resetBreaker() bumps generation by 1 and closes the breaker so the next connect() tries a socket at once', async () => {
        socketMode = 'fail';
        await expect(connection.connect()).rejects.toBeInstanceOf(InteropTransportError);
        const generationAfterOpen = connection.generation;

        connection.resetBreaker();
        expect(connection.generation).toBe(generationAfterOpen + 1);

        socketMode = 'ok';
        const attemptsBeforeReset = socketAttempts;
        await connection.connect();
        expect(socketAttempts).toBe(attemptsBeforeReset + 1);
    });

    test('a connect attempt that started before resetBreaker() and fails afterwards leaves the breaker closed', async () => {
        socketMode = 'pending';
        const pending = connection.connect();
        // resetBreaker() runs while the attempt above is still in flight.
        connection.resetBreaker();
        pendingSocketReject!(new Error('connect ECONNREFUSED 127.0.0.1:5008'));
        await expect(pending).rejects.toBeInstanceOf(InteropTransportError);

        // The stale failure must not have reopened the breaker: the next connect() attempts a
        // socket immediately instead of short-circuiting with the circuit-open error.
        socketMode = 'ok';
        const attemptsBeforeNext = socketAttempts;
        await connection.connect();
        expect(socketAttempts).toBe(attemptsBeforeNext + 1);
    });

    test('disconnect() disposes the shared connection, and the next connect() opens a new socket and bumps generation', async () => {
        await connection.connect();
        expect(connection.generation).toBe(1);
        const firstRecord = lastRecord!;

        connection.disconnect();
        expect(firstRecord.disposed).toBe(true);

        await connection.connect();
        expect(socketAttempts).toBe(2);
        expect(connection.generation).toBe(2);
        expect(lastRecord).not.toBe(firstRecord);
    });

    test('probeIfDue() calls the connect hook only when the breaker is open and its probe time has passed', async () => {
        vi.useFakeTimers();

        // Breaker closed: no probe.
        connection.probeIfDue();
        expect(hookConnectCalls).toBe(0);

        socketMode = 'fail';
        await expect(connection.connect()).rejects.toBeInstanceOf(InteropTransportError);

        // Breaker open, cooldown not yet elapsed: still no probe.
        connection.probeIfDue();
        expect(hookConnectCalls).toBe(0);

        await vi.advanceTimersByTimeAsync(INTEROP_BREAKER_INITIAL_COOLDOWN_MS);
        connection.probeIfDue();
        expect(hookConnectCalls).toBe(1);
        // probeIfDue() never awaits the probe it starts — let it settle before the test ends.
        await vi.advanceTimersByTimeAsync(0);
    });
});
