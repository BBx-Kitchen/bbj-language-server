/******************************************************************************
 * Copyright 2023 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

/**
 * Tests for the Java interop test harness (bbj-vscode/tools/interop-test-harness). Every test
 * here drives the harness's real `connect()`, request scaffold and case/gate logic against the
 * in-process fake JSON-RPC server in `interop-harness-fake-peer.ts` — this suite NEVER opens a
 * real socket and NEVER reaches port 5008, so it passes with RUN_BBJ_TESTS unset.
 */
import { afterEach, describe, expect, it } from 'vitest';
import {
    ConnectionError,
    ConnectionErrors,
    ErrorCodes,
    ResponseError,
    type MessageConnection,
} from 'vscode-jsonrpc/node.js';
import { harnessCases, runSuite } from '../tools/interop-test-harness/cases.js';
import { evaluateGate, finalSegment, isCriticalFieldCheck } from '../tools/interop-test-harness/gate.js';
import {
    connect,
    defineCase,
    deriveStatus,
    getClassInfosRequest,
    isPeerErrorReply,
} from '../tools/interop-test-harness/scaffold.js';
import type { Assertion, FieldCheck, TestResult } from '../tools/interop-test-harness/types.js';
import { healthyFixtures, startFakePeer, type FakePeer, type FakePeerOverrides } from './interop-harness-fake-peer.js';

const EXPECTED_CASE_NAMES = [
    '1. java.lang.String — static methods, constructors',
    '2. java.util.HashMap — constructors with varying arity',
    '3. java.util.Date — deprecated methods',
    '4. java.lang.Math — static methods/fields, private constructor',
    '5. java.lang.Boolean — static fields (TRUE, FALSE)',
    '6. java.sql.Connection — interface, no constructors',
    '7. java.lang.System — static fields (out, err, in)',
    '8. java.util.Map$Entry — nested/inner class',
    '9. Primitive type — int',
    '10. Non-existent class — error handling',
    '11. java.lang.Deprecated — annotation type',
    '12. getClassInfos — java.lang',
    '13. getClassInfos — java.util',
    '14. getClassInfos — com.basis.startup.type',
    '15. getTopLevelPackages',
    '16. loadClasspath — empty',
    '17. loadClasspath — file: prefix',
];

describe('status derivation', () => {
    it('is pass when there are no field checks and no assertions', () => {
        expect(deriveStatus([], [])).toBe('pass');
    });

    it('is fail when a field check is present but mistyped', () => {
        const checks: FieldCheck[] = [
            { field: 'type', expected: 'string', actual: 'number', present: true, typeMatch: false },
        ];
        expect(deriveStatus(checks, [])).toBe('fail');
    });

    it('is fail when a field check is missing entirely', () => {
        const checks: FieldCheck[] = [
            { field: 'name', expected: 'string', actual: 'undefined', present: false, typeMatch: false },
        ];
        expect(deriveStatus(checks, [])).toBe('fail');
    });

    it('is fail when one assertion did not pass', () => {
        const assertions: Assertion[] = [{ description: 'must hold', passed: false }];
        expect(deriveStatus([], assertions)).toBe('fail');
    });
});

describe('scaffold against a fake peer', () => {
    let peer: FakePeer;
    let conn: MessageConnection;

    afterEach(async () => {
        conn?.dispose();
        await peer?.close();
    });

    function arrayCheckCase() {
        return defineCase({
            name: 'array check',
            request: getClassInfosRequest,
            params: { packageName: 'com.basis.startup.type' },
            validate: (outcome, _checks, assertions) => {
                assertions.push({ description: 'is an array', passed: Array.isArray(outcome) });
            },
        });
    }

    it('passes against the healthy peer', async () => {
        peer = await startFakePeer();
        conn = await connect('127.0.0.1', peer.port, 2000);
        const result = await arrayCheckCase().run(conn);
        expect(result.status).toBe('pass');
    });

    it('fails, not errors, when the peer answers a non-array', async () => {
        peer = await startFakePeer({ getClassInfos: () => ({ notAnArray: true }) });
        conn = await connect('127.0.0.1', peer.port, 2000);
        const result = await arrayCheckCase().run(conn);
        expect(result.status).toBe('fail');
    });

    it('errors when a peer error is thrown for a case that did not opt in to peer errors', async () => {
        peer = await startFakePeer({
            getClassInfos: () => {
                throw new ResponseError(ErrorCodes.InternalError, 'boom');
            },
        });
        conn = await connect('127.0.0.1', peer.port, 2000);
        const result = await arrayCheckCase().run(conn);
        expect(result.status).toBe('error');
    });
});

describe('the full suite against the fake peer', () => {
    let peer: FakePeer;
    let conn: MessageConnection;

    afterEach(async () => {
        conn?.dispose();
        await peer?.close();
    });

    it('all 17 cases pass against a healthy peer', async () => {
        peer = await startFakePeer();
        conn = await connect('127.0.0.1', peer.port, 2000);

        const { results, matrixRows } = await runSuite(conn);

        expect(results.map(r => r.name)).toEqual(EXPECTED_CASE_NAMES);
        expect(results.map(r => r.status)).toEqual(harnessCases.map(() => 'pass'));
        expect(matrixRows).toHaveLength(9);

        const verdict = evaluateGate(results);
        expect(verdict.exitCode).toBe(0);
        expect(verdict.criticalFailures).toHaveLength(0);
    });

    it('non-array getClassInfos (#514) makes cases 14 and 17 fail and the gate exit 1', async () => {
        peer = await startFakePeer({
            getClassInfos: () => ({ notAnArray: true }),
            loadClasspath: () => 'ok',
        });
        conn = await connect('127.0.0.1', peer.port, 2000);

        const { results } = await runSuite(conn);
        const byCaseNumber = (n: number) => results[n - 1];
        const expectedFailures = new Set([12, 13, 14, 16, 17]);

        for (let n = 1; n <= 17; n++) {
            expect(byCaseNumber(n).status, `case ${n}`).toBe(expectedFailures.has(n) ? 'fail' : 'pass');
        }

        const verdict = evaluateGate(results);
        expect(verdict.exitCode).toBe(1);
    });
});

describe('fixture mutations', () => {
    let peer: FakePeer;
    let conn: MessageConnection;

    afterEach(async () => {
        conn?.dispose();
        await peer?.close();
    });

    async function runWithOverrides(overrides: FakePeerOverrides) {
        peer = await startFakePeer(overrides);
        conn = await connect('127.0.0.1', peer.port, 2000);
        return runSuite(conn);
    }

    /** Every getClassInfo override below stays healthy for every class it does not target,
     *  so only the one case under test is affected. */
    function healthyOtherwise(className: string) {
        return healthyFixtures.classes[className] ?? { error: `Class "${className}" not found` };
    }

    it("missing critical field: String's first method with no isStatic fails case 1, with a critical failure on methods[0].isStatic", async () => {
        const stringClass = healthyFixtures.classes['java.lang.String'];
        const mutatedMethods = (stringClass.methods ?? []).map((m, i) => (i === 0 ? { ...m, isStatic: undefined } : m));
        const { results } = await runWithOverrides({
            getClassInfo: (params) => params.className === 'java.lang.String'
                ? { ...stringClass, methods: mutatedMethods }
                : healthyOtherwise(params.className),
        });

        expect(results[0].status).toBe('fail');
        const verdict = evaluateGate(results);
        const failure = verdict.criticalFailures.find(cf => cf.field === 'methods[0].isStatic');
        expect(failure).toBeDefined();
        expect(failure?.present).toBe(false);
        expect(verdict.exitCode).toBe(1);
    });

    it("mistyped critical field: a numeric type on String's first field fails case 1, with a critical failure on fields[0].type", async () => {
        const stringClass = healthyFixtures.classes['java.lang.String'];
        const mutatedFields = [{ ...(stringClass.fields ?? [])[0], type: 42 as unknown as string }];
        const { results } = await runWithOverrides({
            getClassInfo: (params) => params.className === 'java.lang.String'
                ? { ...stringClass, fields: mutatedFields }
                : healthyOtherwise(params.className),
        });

        expect(results[0].status).toBe('fail');
        const verdict = evaluateGate(results);
        const failure = verdict.criticalFailures.find(cf => cf.field === 'fields[0].type');
        expect(failure).toBeDefined();
        expect(failure?.present).toBe(true);
        expect(failure?.typeMatch).toBe(false);
    });

    it('nonexistent class without an error field fails case 10', async () => {
        const { results } = await runWithOverrides({
            getClassInfo: (params) => params.className === 'com.nonexistent.Fake'
                ? { name: 'Fake', packageName: 'com.nonexistent' }
                : healthyOtherwise(params.className),
        });
        expect(results[9].status).toBe('fail');
    });

    it('nonexistent class rejected by the peer passes case 10', async () => {
        const { results } = await runWithOverrides({
            getClassInfo: (params) => {
                if (params.className === 'com.nonexistent.Fake') {
                    throw new ResponseError(ErrorCodes.InternalError, 'Class not found');
                }
                return healthyOtherwise(params.className);
            },
        });
        expect(results[9].status).toBe('pass');
    });

    it('loadClasspath rejected by the peer passes case 17', async () => {
        const { results } = await runWithOverrides({
            loadClasspath: (params) => {
                if (params.classPathEntries.some(e => e.startsWith('file:'))) {
                    throw new ResponseError(ErrorCodes.InternalError, 'no such file');
                }
                return true;
            },
        });
        expect(results[16].status).toBe('pass');
    });

    it('a dropped connection during case 17 is error, not pass, and the gate exits 1', async () => {
        const { results } = await runWithOverrides({
            loadClasspath: (params, ctx) => {
                if (params.classPathEntries.some(e => e.startsWith('file:'))) {
                    ctx.drop();
                    return undefined;
                }
                return true;
            },
        });
        expect(results[16].status).toBe('error');
        expect(evaluateGate(results).exitCode).toBe(1);
    });

    it('empty getClassInfos arrays: cases 13 and 14 pass, case 12 fails', async () => {
        const { results } = await runWithOverrides({
            getClassInfos: () => [],
        });
        expect(results[11].status).toBe('fail');
        expect(results[12].status).toBe('pass');
        expect(results[13].status).toBe('pass');
    });
});

describe('critical field gate', () => {
    it('finalSegment returns the text after the last dot', () => {
        expect(finalSegment('methods[0].returnType')).toBe('returnType');
        expect(finalSegment('name')).toBe('name');
    });

    it('isCriticalFieldCheck matches only the exact final path segment', () => {
        const check = (field: string): FieldCheck => ({ field, expected: 'string', actual: 'string', present: true, typeMatch: true });
        expect(isCriticalFieldCheck(check('methods[0].returnType'))).toBe(true);
        expect(isCriticalFieldCheck(check('constructor(2).isStatic'))).toBe(true);
        expect(isCriticalFieldCheck(check('methods[0].typeName'))).toBe(false);
        expect(isCriticalFieldCheck(check('nameHint'))).toBe(false);
        expect(isCriticalFieldCheck(check('fields'))).toBe(false);
    });

    it('evaluateGate([]) is exit 0 with zero counts', () => {
        expect(evaluateGate([])).toEqual({ passCount: 0, failCount: 0, errorCount: 0, criticalFailures: [], exitCode: 0 });
    });

    it('one error result gives exit 1', () => {
        const result: TestResult = {
            name: 'x', method: 'm', status: 'error', request: null, response: null,
            fieldChecks: [], assertions: [], durationMs: 1,
        };
        expect(evaluateGate([result]).exitCode).toBe(1);
    });

    it('a passing result with a present-but-mistyped critical check gives exit 1 and one critical failure', () => {
        const result: TestResult = {
            name: 'x', method: 'm', status: 'pass', request: null, response: null,
            fieldChecks: [{ field: 'returnType', expected: 'string', actual: 'number', present: true, typeMatch: false }],
            assertions: [], durationMs: 1,
        };
        const verdict = evaluateGate([result]);
        expect(verdict.exitCode).toBe(1);
        expect(verdict.criticalFailures).toHaveLength(1);
    });

    it('reversing a mixed result list gives the same exitCode, the same counts and the same set of critical failures', () => {
        const results: TestResult[] = [
            { name: 'a', method: 'm', status: 'pass', request: null, response: null, fieldChecks: [], assertions: [], durationMs: 1 },
            {
                name: 'b', method: 'm', status: 'fail', request: null, response: null,
                fieldChecks: [{ field: 'isStatic', expected: 'boolean', actual: 'undefined', present: false, typeMatch: false }],
                assertions: [], durationMs: 1,
            },
            { name: 'c', method: 'm', status: 'error', request: null, response: null, fieldChecks: [], assertions: [], durationMs: 1 },
        ];
        const forward = evaluateGate(results);
        const reversed = evaluateGate([...results].reverse());

        expect(reversed.exitCode).toBe(forward.exitCode);
        expect(reversed.passCount).toBe(forward.passCount);
        expect(reversed.failCount).toBe(forward.failCount);
        expect(reversed.errorCount).toBe(forward.errorCount);
        expect(new Set(reversed.criticalFailures.map(cf => `${cf.caseName}:${cf.field}`)))
            .toEqual(new Set(forward.criticalFailures.map(cf => `${cf.caseName}:${cf.field}`)));
    });
});

describe('peer error classification', () => {
    it('is true for a genuine JSON-RPC error reply', () => {
        expect(isPeerErrorReply(new ResponseError(ErrorCodes.InternalError, 'boom'))).toBe(true);
    });

    it('is false for the transport-level PendingResponseRejected code', () => {
        expect(isPeerErrorReply(new ResponseError(ErrorCodes.PendingResponseRejected, 'boom'))).toBe(false);
    });

    it('is false for a ConnectionError', () => {
        expect(isPeerErrorReply(new ConnectionError(ConnectionErrors.Closed, 'closed'))).toBe(false);
    });

    it('is false for a plain Error', () => {
        expect(isPeerErrorReply(new Error('boom'))).toBe(false);
    });
});
