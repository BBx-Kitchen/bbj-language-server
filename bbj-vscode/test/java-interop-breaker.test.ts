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
});
