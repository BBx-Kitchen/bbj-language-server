/******************************************************************************
 * Copyright 2023 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

/**
 * `CompleteClassIndex` on its own, built with stub hooks and no owning interop service (#558):
 * building and querying the simple-name index, and the `ensure()` latch/retry behaviour around
 * a scripted `getAllClassNames` answer.
 */
import { MessageConnection } from 'vscode-jsonrpc/node.js';
import { beforeEach, describe, expect, test } from 'vitest';
import { CompleteClassIndex } from '../src/language/java-interop-class-index.js';
import { METHOD_NOT_FOUND } from '../src/language/java-interop-connection.js';

describe('CompleteClassIndex (#558)', () => {
    let connectCalls: number;
    let sendRequestCalls: number;
    let probeIfDueCalls: number;
    /** Scripts the fake connection's `getAllClassNames` answer for `ensure()` tests. */
    let connectOutcome: 'ok' | 'method-not-found' | 'transient-error';
    let scriptedFqns: string[];

    beforeEach(() => {
        connectCalls = 0;
        sendRequestCalls = 0;
        probeIfDueCalls = 0;
        connectOutcome = 'ok';
        scriptedFqns = [];
    });

    /** Builds a `CompleteClassIndex` whose `buildCompleteClassIndex` hook forwards to the instance's own `build()`, mirroring the real front's wiring. */
    function createIndex(): CompleteClassIndex {
        const index: CompleteClassIndex = new CompleteClassIndex({
            connect: () => {
                connectCalls++;
                return Promise.resolve({
                    sendRequest: () => {
                        sendRequestCalls++;
                        if (connectOutcome === 'method-not-found') {
                            return Promise.reject({ code: METHOD_NOT_FOUND });
                        }
                        if (connectOutcome === 'transient-error') {
                            return Promise.reject(new Error('connect ECONNRESET'));
                        }
                        return Promise.resolve(scriptedFqns);
                    }
                } as unknown as MessageConnection);
            },
            probeIfDue: () => { probeIfDueCalls++; },
            buildCompleteClassIndex: (fqns) => index.build(fqns)
        });
        return index;
    }

    test('build() indexes fully-qualified names by their lowercased simple name, skipping inner ($) and packageless names', () => {
        const index = createIndex();
        index.build(['java.util.List', 'java.util.ArrayList', 'java.util.Map$Entry', 'NoPackage']);

        expect(index.size).toBe(2);
        expect(index.simpleNameMatches('List')).toEqual(['java.util.List']);
        expect(index.simpleNameMatches('ArrayList')).toEqual(['java.util.ArrayList']);
        expect(index.simpleNameMatches('Entry')).toEqual([]);
        expect(index.simpleNameMatches('NoPackage')).toEqual([]);
    });

    test('simpleNameMatches finds a class case-insensitively and returns an empty array for an unknown name', () => {
        const index = createIndex();
        index.build(['java.util.List']);

        expect(index.simpleNameMatches('LIST')).toEqual(['java.util.List']);
        expect(index.simpleNameMatches('list')).toEqual(['java.util.List']);
        expect(index.simpleNameMatches('Unknown')).toEqual([]);
    });

    test('prefixMatches collects every matching FQN and stops once the set reaches twice the limit', () => {
        const index = createIndex();
        const matching = Array.from({ length: 10 }, (_, i) => `pkg${i}.prefixed${i}`);
        index.build([...matching, 'other.pkg.Other']);

        const matches = index.prefixMatches('prefixed', 3);

        expect(matches.size).toBe(6);
        expect([...matches].every(fqn => fqn.toLowerCase().includes('prefixed'))).toBe(true);
    });

    test('clear() drops the index so has() is false', () => {
        const index = createIndex();
        index.build(['java.util.List']);
        expect(index.has()).toBe(true);

        index.clear();

        expect(index.has()).toBe(false);
        expect(index.simpleNameMatches('List')).toEqual([]);
    });

    test('ensure() on success builds the index once from the getAllClassNames answer and returns true', async () => {
        const index = createIndex();
        scriptedFqns = ['java.util.List', 'java.util.ArrayList'];

        const result = await index.ensure();

        expect(result).toBe(true);
        expect(index.has()).toBe(true);
        expect(index.size).toBe(2);
        expect(connectCalls).toBe(1);
        expect(sendRequestCalls).toBe(1);

        // Already resolved: a second ensure() does not re-send the request, it just probes.
        const second = await index.ensure();
        expect(second).toBe(true);
        expect(sendRequestCalls).toBe(1);
        expect(probeIfDueCalls).toBe(1);
    });

    test('a MethodNotFound error latches: ensure() returns false, and a second ensure() sends no request and calls probeIfDue', async () => {
        const index = createIndex();
        connectOutcome = 'method-not-found';

        const first = await index.ensure();

        expect(first).toBe(false);
        expect(index.has()).toBe(false);
        expect(sendRequestCalls).toBe(1);

        const second = await index.ensure();
        expect(second).toBe(false);
        expect(sendRequestCalls).toBe(1);
        expect(probeIfDueCalls).toBe(1);
    });

    test('a transient error does not latch: ensure() returns false and a second ensure() sends the request again', async () => {
        const index = createIndex();
        connectOutcome = 'transient-error';

        const first = await index.ensure();

        expect(first).toBe(false);
        expect(index.has()).toBe(false);
        expect(sendRequestCalls).toBe(1);

        const second = await index.ensure();
        expect(second).toBe(false);
        expect(sendRequestCalls).toBe(2);
        expect(probeIfDueCalls).toBe(0);
    });
});
