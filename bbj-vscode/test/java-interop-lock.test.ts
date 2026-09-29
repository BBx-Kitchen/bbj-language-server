/******************************************************************************
 * Copyright 2023 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

/**
 * `ResolutionLock` on its own, built with no other collaborator and no Langium services: re-entrant
 * acquisition, FIFO hand-over across queued waiters, and `reset()` (#558). Never uses a timer —
 * ordering is proven by flushing already-resolved promises, matching the real lock's own
 * synchronous-then-microtask resolution behaviour.
 */
import { describe, expect, test } from 'vitest';
import { ResolutionLock } from '../src/language/java-interop-lock.js';

/** Drains the microtask queue a few times so any already-resolved promise's `.then()` has run. */
async function flush(times = 5): Promise<void> {
    for (let i = 0; i < times; i++) {
        await Promise.resolve();
    }
}

describe('ResolutionLock', () => {
    test('a free lock is granted immediately and currentToken is the holder token', async () => {
        const lock = new ResolutionLock();
        const token = {};
        expect(lock.currentToken).toBeNull();

        const release = await lock.acquire(token);

        expect(lock.currentToken).toBe(token);
        release();
        expect(lock.currentToken).toBeNull();
    });

    test('the holding token acquiring again is re-entrant: it resolves immediately with a no-op release, and the lock stays held', async () => {
        const lock = new ResolutionLock();
        const token = {};
        const firstRelease = await lock.acquire(token);

        const secondRelease = await lock.acquire(token);
        expect(lock.currentToken).toBe(token);

        // The re-entrant release is a no-op: it must not free the lock.
        secondRelease();
        expect(lock.currentToken).toBe(token);

        firstRelease();
        expect(lock.currentToken).toBeNull();
    });

    test('a second, distinct token waits until the holder releases', async () => {
        const lock = new ResolutionLock();
        const holderToken = {};
        const waiterToken = {};
        const holderRelease = await lock.acquire(holderToken);

        let waiterGranted = false;
        const waiterPromise = lock.acquire(waiterToken).then((release) => {
            waiterGranted = true;
            return release;
        });

        await flush();
        expect(waiterGranted).toBe(false);
        expect(lock.currentToken).toBe(holderToken);

        holderRelease();
        const waiterRelease = await waiterPromise;

        expect(waiterGranted).toBe(true);
        expect(lock.currentToken).toBe(waiterToken);
        waiterRelease();
        expect(lock.currentToken).toBeNull();
    });

    test('three waiters are granted in the order they asked, one at a time as each releases', async () => {
        const lock = new ResolutionLock();
        const order: string[] = [];

        const holderRelease = await lock.acquire({});
        order.push('holder');

        const waiterA = lock.acquire({}).then((release) => { order.push('a'); return release; });
        const waiterB = lock.acquire({}).then((release) => { order.push('b'); return release; });
        const waiterC = lock.acquire({}).then((release) => { order.push('c'); return release; });

        await flush();
        expect(order).toEqual(['holder']);

        holderRelease();
        const releaseA = await waiterA;
        expect(order).toEqual(['holder', 'a']);

        releaseA();
        const releaseB = await waiterB;
        expect(order).toEqual(['holder', 'a', 'b']);

        releaseB();
        const releaseC = await waiterC;
        expect(order).toEqual(['holder', 'a', 'b', 'c']);

        releaseC();
        expect(lock.currentToken).toBeNull();
    });

    test('reset() frees the lock and clears currentToken', async () => {
        const lock = new ResolutionLock();
        const token = {};
        await lock.acquire(token);
        expect(lock.currentToken).toBe(token);

        lock.reset();

        expect(lock.currentToken).toBeNull();
        // The lock is free again: a new token acquires immediately.
        const newToken = {};
        const release = await lock.acquire(newToken);
        expect(lock.currentToken).toBe(newToken);
        release();
    });

    test('reset() drops a queued waiter: it is never granted afterwards', async () => {
        const lock = new ResolutionLock();
        const holderToken = {};
        await lock.acquire(holderToken); // held for the rest of this test, never released

        let waiterGranted = false;
        void lock.acquire({}).then(() => { waiterGranted = true; });

        await flush();
        expect(waiterGranted).toBe(false);

        lock.reset();
        await flush();

        expect(waiterGranted).toBe(false);
        expect(lock.currentToken).toBeNull();
    });
});
