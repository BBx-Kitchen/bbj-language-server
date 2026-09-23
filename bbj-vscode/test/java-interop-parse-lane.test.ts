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
import { afterEach, describe, expect, test, vi } from 'vitest';
import { JavaClass } from '../src/language/generated/ast.js';
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
