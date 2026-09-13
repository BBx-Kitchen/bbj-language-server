/******************************************************************************
 * Copyright 2023 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

/**
 * Regression coverage for the java-interop circuit breaker (#504): with the peer unreachable,
 * many unresolved classes cost about one connect timeout in total (not one per class), and
 * resolution resumes once the peer is back without `clearCache()`. Runs entirely against the
 * scriptable fake peer in fake-interop-peer.ts, under fake timers — never a real socket, never
 * port 5008.
 */
import type { Connection } from 'vscode-languageserver';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { initNotifications } from '../src/language/bbj-notifications.js';
import {
    INTEROP_BREAKER_BACKOFF_FACTOR, INTEROP_BREAKER_INITIAL_COOLDOWN_MS, INTEROP_BREAKER_MAX_COOLDOWN_MS
} from '../src/language/java-interop.js';
import { createFakePeerServices } from './fake-interop-peer.js';

describe('java-interop circuit breaker (#504)', () => {
    let showErrorMessage: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        showErrorMessage = vi.fn();
        initNotifications({ window: { showErrorMessage } } as unknown as Connection);
    });

    afterEach(() => {
        vi.useRealTimers();
        initNotifications(null as unknown as Connection);
    });

    test('twenty unresolved classes against an unreachable peer settle within one connect timeout', async () => {
        const { interop } = createFakePeerServices();
        vi.useFakeTimers();

        const classNames = Array.from({ length: 20 }, (_, i) => `test.Missing${i}`);
        const settled: boolean[] = classNames.map(() => false);
        const resultsPromise = Promise.all(classNames.map(async (name, index) => {
            const result = await interop.resolveClassByName(name);
            settled[index] = true;
            return result;
        }));

        await vi.advanceTimersByTimeAsync(10000);
        await vi.advanceTimersByTimeAsync(50);

        expect(settled.every(Boolean)).toBe(true);
        expect(interop.socketAttempts).toBe(1);
        expect(showErrorMessage).toHaveBeenCalledTimes(1);

        const results = await resultsPromise;
        for (let i = 0; i < classNames.length; i++) {
            expect(results[i].error).toBeDefined();
            expect(interop.getResolvedClass(classNames[i])).toBeUndefined();
        }
    });

    test('the peer coming back is picked up by the next lookup after the cooldown, without clearCache', async () => {
        const { interop } = createFakePeerServices();
        interop.connectDelayMs = 0;
        vi.useFakeTimers();

        await interop.resolveClassByName('test.First');
        expect(showErrorMessage).toHaveBeenCalledTimes(1);

        interop.peerUp = true;
        const clearCacheSpy = vi.spyOn(interop, 'clearCache');
        const recovered = vi.fn();
        interop.onConnectionRecovered(recovered);

        await vi.advanceTimersByTimeAsync(INTEROP_BREAKER_INITIAL_COOLDOWN_MS - 1);
        const attemptsBeforeDue = interop.socketAttempts;
        const early = await interop.resolveClassByName('test.TooEarly');
        expect(early.error).toBeDefined();
        expect(interop.socketAttempts).toBe(attemptsBeforeDue);

        await vi.advanceTimersByTimeAsync(1);
        const later = await interop.resolveClassByName('test.Later');
        expect(later.error).toBeUndefined();
        expect(interop.getResolvedClass('test.Later')).toBeDefined();

        await vi.advanceTimersByTimeAsync(0);
        expect(recovered).toHaveBeenCalledTimes(1);

        await interop.resolveClassByName('test.AnotherAfterRecovery');
        expect(recovered).toHaveBeenCalledTimes(1);

        expect(clearCacheSpy).not.toHaveBeenCalled();
        expect(showErrorMessage).toHaveBeenCalledTimes(1);
    });

    test('failed probes back off up to the cap and stay silent', async () => {
        const { interop } = createFakePeerServices();
        interop.connectDelayMs = 0;
        vi.useFakeTimers();

        await interop.resolveClassByName('test.Open');
        expect(showErrorMessage).toHaveBeenCalledTimes(1);

        let now = 0;
        let cooldown = INTEROP_BREAKER_INITIAL_COOLDOWN_MS;
        let dueAt = cooldown;

        for (let round = 0; round < 6; round++) {
            await vi.advanceTimersByTimeAsync(dueAt - now);
            now = dueAt;
            const beforeAttempts = interop.socketAttempts;
            const probeResult = await interop.resolveClassByName(`test.Probe${round}`);
            expect(probeResult.error).toBeDefined();
            expect(interop.socketAttempts).toBe(beforeAttempts + 1);

            // The due time for the next round is computed from the cooldown that was active
            // during this probe; only after that does the cooldown itself back off.
            dueAt = now + cooldown;
            cooldown = Math.min(cooldown * INTEROP_BREAKER_BACKOFF_FACTOR, INTEROP_BREAKER_MAX_COOLDOWN_MS);

            await vi.advanceTimersByTimeAsync((dueAt - 1) - now);
            now = dueAt - 1;
            const attemptsAtEdge = interop.socketAttempts;
            const tooEarly = await interop.resolveClassByName(`test.TooEarly${round}`);
            expect(tooEarly.error).toBeDefined();
            expect(interop.socketAttempts).toBe(attemptsAtEdge);
        }

        expect(cooldown).toBe(INTEROP_BREAKER_MAX_COOLDOWN_MS);
        expect(showErrorMessage).toHaveBeenCalledTimes(1);
    });

    test('only one probe runs while half-open', async () => {
        const { interop } = createFakePeerServices();
        interop.connectDelayMs = 10000;
        vi.useFakeTimers();

        const openingCall = interop.loadClasspath(['/x.jar']);
        await vi.advanceTimersByTimeAsync(10000);
        await openingCall;
        expect(showErrorMessage).toHaveBeenCalledTimes(1);

        await vi.advanceTimersByTimeAsync(INTEROP_BREAKER_INITIAL_COOLDOWN_MS);

        const attemptsBeforeProbe = interop.socketAttempts;
        const first = interop.loadClasspath(['/x.jar']);
        const second = interop.loadClasspath(['/x.jar']);

        await vi.advanceTimersByTimeAsync(10);

        expect(await second).toBe(false);
        expect(interop.socketAttempts).toBe(attemptsBeforeProbe + 1);

        // Let the still-pending probe's own connect timeout elapse so the test cleans up.
        await vi.advanceTimersByTimeAsync(10000);
        await first;
    });

    test('clearCache resets the breaker and a stale probe cannot report recovery', async () => {
        const { interop } = createFakePeerServices();
        interop.connectDelayMs = 0;
        vi.useFakeTimers();

        await interop.resolveClassByName('test.First');
        expect(showErrorMessage).toHaveBeenCalledTimes(1);

        interop.clearCache();
        const afterClear = await interop.resolveClassByName('test.SecondAttempt');
        expect(afterClear.error).toBeDefined();
        expect(showErrorMessage).toHaveBeenCalledTimes(2);

        interop.connectDelayMs = 10000;
        await vi.advanceTimersByTimeAsync(INTEROP_BREAKER_INITIAL_COOLDOWN_MS);

        const recovered = vi.fn();
        interop.onConnectionRecovered(recovered);

        const probePromise = interop.resolveClassByName('test.StaleProbe');
        interop.peerUp = true;
        interop.clearCache();
        await vi.advanceTimersByTimeAsync(10000);
        await probePromise;

        expect(recovered).not.toHaveBeenCalled();
    });

    test('a second outage after recovery shows a second popup', async () => {
        const { interop } = createFakePeerServices();
        interop.connectDelayMs = 0;
        vi.useFakeTimers();

        await interop.resolveClassByName('test.First');
        expect(showErrorMessage).toHaveBeenCalledTimes(1);

        interop.peerUp = true;
        await vi.advanceTimersByTimeAsync(INTEROP_BREAKER_INITIAL_COOLDOWN_MS);
        await interop.resolveClassByName('test.Recovered');
        expect(interop.getResolvedClass('test.Recovered')).toBeDefined();

        interop.dropConnection();
        interop.peerUp = false;

        await interop.resolveClassByName('test.SecondOutage');
        expect(showErrorMessage).toHaveBeenCalledTimes(2);
    });
});
