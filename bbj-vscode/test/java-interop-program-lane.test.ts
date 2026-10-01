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

describe('format, range format and DENUM over one dedicated connection', () => {
    afterEach(() => {
        vi.useRealTimers();
    });

    const wholeRange = { start: { line: 0, character: 0 }, end: { line: 1, character: 0 } };

    test('a DENUM request returns the denumbered text', async () => {
        const { interop } = createFakePeerServices();
        interop.peerUp = true;
        interop.connectDelayMs = 0;
        vi.useFakeTimers();
        interop.answerWith('denumProgram', () => ({ text: 'print 1\n', diagnostics: [], denumbered: true, version: 'd1' }));

        const outcome = await interop.denumProgram({ text: '0010 print 1\n', version: 'd1' });

        expect(outcome).toMatchObject({ kind: 'ok', result: { text: 'print 1\n', denumbered: true, version: 'd1' } });
    });

    test('a range format request returns the one edit the peer answered with', async () => {
        const { interop } = createFakePeerServices();
        interop.peerUp = true;
        interop.connectDelayMs = 0;
        vi.useFakeTimers();
        const edit = { range: wholeRange, newText: 'a = 1\n' };
        interop.answerWith('formatProgram', () => ({ edits: [edit], diagnostics: [], denumbered: false, version: 'r1' }));

        const outcome = await interop.formatProgram({ text: 'a=1\nb=2\n', version: 'r1', range: wholeRange });

        expect(outcome).toMatchObject({ kind: 'ok', result: { scope: 'range', edits: [edit], version: 'r1' } });
    });

    test('a range format request the peer answers with no edit is ok with no edits', async () => {
        const { interop } = createFakePeerServices();
        interop.peerUp = true;
        interop.connectDelayMs = 0;
        vi.useFakeTimers();

        const outcome = await interop.formatProgram({ text: 'a=1\nb=2\n', version: 'r2', range: wholeRange });

        expect(outcome).toMatchObject({ kind: 'ok', result: { scope: 'range', edits: [] } });
    });

    test('whole-document, range and DENUM requests all share one connection, distinct from the shared connection and the parse lane', async () => {
        const { interop } = createFakePeerServices();
        interop.peerUp = true;
        interop.connectDelayMs = 0;
        vi.useFakeTimers();

        await (interop as unknown as RawClassAccess).getRawClass('test.Warm');
        await interop.parseProgram({ text: 'x = 1', canonicalName: '/proj/a.bbj', version: '1', prefixes: [], workspaceRoots: [] });

        await interop.formatProgram({ text: 'a=1\nb=2\n', version: 'f1' });
        await interop.formatProgram({ text: 'a=1\nb=2\n', version: 'f2', range: wholeRange });
        await interop.denumProgram({ text: 'a=1\n', version: 'f3' });

        const classConnection = interop.sentRequests.find(r => r.method === 'getClassInfo')!.connectionId;
        const parseConnection = interop.sentRequests.find(r => r.method === 'parseProgram')!.connectionId;
        const programRequests = interop.sentRequests.filter(r => r.method === 'formatProgram' || r.method === 'denumProgram');
        expect(programRequests).toHaveLength(3);
        expect(new Set(programRequests.map(r => r.connectionId)).size).toBe(1);
        expect(programRequests[0].connectionId).not.toBe(classConnection);
        expect(programRequests[0].connectionId).not.toBe(parseConnection);
        // The lane opened exactly one socket of its own beside the shared one and the parse lane.
        expect(interop.socketAttempts).toBe(3);
    });

    test('with the dedicated connection hung and a format request pending, a parse and a class lookup are still answered', async () => {
        const { interop } = createFakePeerServices();
        interop.peerUp = true;
        interop.connectDelayMs = 0;
        vi.useFakeTimers();
        const rawClassAccess = interop as unknown as RawClassAccess;

        await rawClassAccess.getRawClass('test.Warm');
        await interop.formatProgram({ text: 'x = 1\n', version: 'h0' });
        const programConnection = interop.sentRequests.find(r => r.method === 'formatProgram')!.connectionId;
        interop.hungConnectionIds.add(programConnection);

        let formatSettled = false;
        const pendingFormat = interop.formatProgram({ text: 'x = 2\n', version: 'h1' }).then(outcome => {
            formatSettled = true;
            return outcome;
        });
        await vi.advanceTimersByTimeAsync(0);
        expect(interop.sentRequests.filter(r => r.method === 'formatProgram')).toHaveLength(2);

        const parse = await interop.parseProgram({ text: 'x = 3', canonicalName: '/proj/h.bbj', version: '1', prefixes: [], workspaceRoots: [] });
        const lookup = await rawClassAccess.getRawClass('test.AfterHang');

        expect(parse.errors).toEqual([]);
        expect(lookup.error).toBeUndefined();
        expect(formatSettled).toBe(false);

        // Cleanup: drop every connection so the pending request settles.
        interop.dropConnection();
        await vi.advanceTimersByTimeAsync(10000);
        await pendingFormat;
    });
});
