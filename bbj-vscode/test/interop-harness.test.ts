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
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ErrorCodes, ResponseError, type MessageConnection } from 'vscode-jsonrpc/node.js';
import { connect, defineCase, deriveStatus, getClassInfosRequest } from '../tools/interop-test-harness/scaffold.js';
import type { Assertion, FieldCheck } from '../tools/interop-test-harness/types.js';
import { startFakePeer, type FakePeer } from './interop-harness-fake-peer.js';

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
