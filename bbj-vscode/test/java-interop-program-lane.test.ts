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
import { afterEach, describe, expect, test, vi } from 'vitest';
import { ResponseError } from 'vscode-jsonrpc/node.js';
import { JavaClass } from '../src/language/generated/ast.js';
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
