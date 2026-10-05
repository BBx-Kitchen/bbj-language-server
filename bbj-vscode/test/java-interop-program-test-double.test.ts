/******************************************************************************
 * Copyright 2023 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

/**
 * Pins the scripted format and DENUM answers that every `createBBjTestServices` suite can rely on:
 * a valid success echo by default, one script per method, and wire answers that run through the
 * production validator and error classifier. The double never opens a socket.
 */
import { EmptyFileSystem } from 'langium';
import { describe, expect, test, vi } from 'vitest';
import type { ProgramOutcome } from '../src/language/java-interop.js';
import { createBBjTestServices, type JavaInteropTestService } from './bbj-test-module.js';

function newDouble(): JavaInteropTestService {
    return createBBjTestServices(EmptyFileSystem).BBj.java.JavaInteropService as JavaInteropTestService;
}

const WHOLE_DOCUMENT = { text: 'rem a\nrem b\n', version: 'v1' };
const RANGE = { text: 'rem a\nrem b\n', version: 'v2', range: { start: { line: 0, character: 0 }, end: { line: 1, character: 0 } } };
const DENUM = { text: '10 rem a\n20 rem b\n', version: 'v3' };

describe('the default format and DENUM answers', () => {
    test('a whole-document format is ok with scope document, the request text echoed and the request version', async () => {
        const outcome = await newDouble().formatProgram(WHOLE_DOCUMENT);

        expect(outcome).toEqual({
            kind: 'ok',
            result: { scope: 'document', text: WHOLE_DOCUMENT.text, diagnostics: [], denumbered: false, version: 'v1' },
        });
    });

    test('a range format is ok with scope range, no edits and the request version', async () => {
        const outcome = await newDouble().formatProgram(RANGE);

        expect(outcome).toEqual({
            kind: 'ok',
            result: { scope: 'range', edits: [], diagnostics: [], denumbered: false, version: 'v2' },
        });
    });

    test('a DENUM is ok with denumbered false, the request text echoed and the request version', async () => {
        const outcome = await newDouble().denumProgram(DENUM);

        expect(outcome).toEqual({
            kind: 'ok',
            result: { text: DENUM.text, diagnostics: [], denumbered: false, version: 'v3' },
        });
    });

    test('every services set gets its own double, so a script in one suite never leaks into another', async () => {
        const scripted = newDouble();
        scripted.scriptFormatProgram('method-not-found');

        expect((await newDouble().formatProgram(WHOLE_DOCUMENT)).kind).toBe('ok');
    });
});

describe('scripted outcomes', () => {
    test('method-not-found on format leaves DENUM answering, because scripts are per method', async () => {
        const double = newDouble();
        double.scriptFormatProgram('method-not-found');

        expect(await double.formatProgram(WHOLE_DOCUMENT)).toEqual({ kind: 'unavailable', reason: 'method-not-found' });
        expect((await double.denumProgram(DENUM)).kind).toBe('ok');
    });

    test('method-not-found on DENUM leaves format answering', async () => {
        const double = newDouble();
        double.scriptDenumProgram('method-not-found');

        expect(await double.denumProgram(DENUM)).toEqual({ kind: 'unavailable', reason: 'method-not-found' });
        expect((await double.formatProgram(WHOLE_DOCUMENT)).kind).toBe('ok');
    });

    test('transport-error is a failed outcome of kind transport', async () => {
        const double = newDouble();
        double.scriptFormatProgram('transport-error');

        expect(await double.formatProgram(WHOLE_DOCUMENT)).toMatchObject({ kind: 'failed', failure: 'transport' });
    });

    test('an invalid-settings wire error keeps its problems', async () => {
        const double = newDouble();
        double.scriptFormatProgram({
            error: { code: -33007, message: 'invalid settings', data: [{ setting: 'indentWidth', message: 'bad' }] },
        });

        expect(await double.formatProgram(WHOLE_DOCUMENT)).toEqual({
            kind: 'invalid-settings',
            problems: [{ setting: 'indentWidth', message: 'bad' }],
        });
    });

    test('a mixed-numbering wire error keeps the offending line', async () => {
        const double = newDouble();
        double.scriptDenumProgram({ error: { code: -33008, message: 'mixed line numbering', data: { line: 3 } } });

        expect(await double.denumProgram(DENUM)).toEqual({ kind: 'mixed-numbering', line: 3 });
    });

    test('a DENUM-needed wire error is a failed outcome of kind denum-needed', async () => {
        const double = newDouble();
        double.scriptFormatProgram({ error: { code: -33006, message: 'program needs denumbering' } });

        expect(await double.formatProgram(WHOLE_DOCUMENT)).toMatchObject({ kind: 'failed', failure: 'denum-needed', code: -33006 });
    });

    test('a request-cancelled wire error is a cancelled outcome', async () => {
        const double = newDouble();
        double.scriptDenumProgram({ error: { code: -32800, message: 'cancelled' } });

        expect(await double.denumProgram(DENUM)).toEqual({ kind: 'cancelled' });
    });

    test('a scripted wire result is accepted when it is a valid answer to the request that was sent', async () => {
        const double = newDouble();
        double.scriptFormatProgram({ result: { text: 'REM A\n', diagnostics: [], denumbered: false, version: 'v1' } });

        expect(await double.formatProgram({ text: 'rem a\n', version: 'v1' })).toMatchObject({
            kind: 'ok',
            result: { scope: 'document', text: 'REM A\n' },
        });
    });

    test('the outcome escape hatch returns the given outcome unchanged', async () => {
        const double = newDouble();
        const given: ProgramOutcome<unknown> = { kind: 'timeout', origin: 'client' };
        double.scriptFormatProgram({ outcome: given });

        expect(await double.formatProgram(WHOLE_DOCUMENT)).toBe(given);
    });
});

describe('a scripted wire answer runs through the production guard', () => {
    test('edits on a whole-document request are refused as malformed, so the real validator ran', async () => {
        const double = newDouble();
        double.scriptFormatProgram({ result: { text: 'x', edits: [], diagnostics: [], denumbered: false, version: 'v1' } });

        expect(await double.formatProgram(WHOLE_DOCUMENT)).toEqual({
            kind: 'malformed-result',
            reason: 'edits-on-document-request',
        });
    });

    test('an answer that echoes another version is refused as stale', async () => {
        const double = newDouble();
        double.scriptDenumProgram({ result: { text: 'x', diagnostics: [], denumbered: false, version: 'older' } });

        expect(await double.denumProgram(DENUM)).toEqual({ kind: 'malformed-result', reason: 'version-mismatch' });
    });

    test('a DENUM answer without its denumbered flag is refused', async () => {
        const double = newDouble();
        double.scriptDenumProgram({ result: { text: 'x', diagnostics: [], version: 'v3' } });

        expect(await double.denumProgram(DENUM)).toEqual({ kind: 'malformed-result', reason: 'denumbered-not-boolean' });
    });

    test('a range answer carrying text is refused', async () => {
        const double = newDouble();
        double.scriptFormatProgram({ result: { text: 'x', edits: [], diagnostics: [], denumbered: false, version: 'v2' } });

        expect(await double.formatProgram(RANGE)).toEqual({ kind: 'malformed-result', reason: 'text-on-range-request' });
    });

    test('control characters in a scripted error message never reach the outcome', async () => {
        const double = newDouble();
        double.scriptFormatProgram({ error: { code: -33009, message: 'bad\u0007\nline' } });

        const outcome = await double.formatProgram(WHOLE_DOCUMENT);

        expect(outcome).toMatchObject({ kind: 'failed', failure: 'format-failed', message: 'bad line' });
    });
});

describe('the double never opens a socket', () => {
    test('no scripted call reaches createSocket or connect', async () => {
        const double = newDouble();
        const internals = double as unknown as { createSocket(): Promise<unknown>; connect(): Promise<unknown> };
        const createSocket = vi.spyOn(internals, 'createSocket');
        const connect = vi.spyOn(internals, 'connect');

        await double.formatProgram(WHOLE_DOCUMENT);
        await double.formatProgram(RANGE);
        await double.denumProgram(DENUM);
        double.scriptFormatProgram('method-not-found');
        await double.formatProgram(WHOLE_DOCUMENT);
        double.scriptDenumProgram('transport-error');
        await double.denumProgram(DENUM);
        double.scriptFormatProgram({ error: { code: -33007, message: 'invalid settings', data: [] } });
        await double.formatProgram(WHOLE_DOCUMENT);
        double.scriptDenumProgram({ result: { text: 'x', denumbered: true, diagnostics: [], version: 'v3' } });
        await double.denumProgram(DENUM);

        expect(createSocket).not.toHaveBeenCalled();
        expect(connect).not.toHaveBeenCalled();
    });

    test('createSocket itself rejects, so no other path can reach a real peer', async () => {
        const internals = newDouble() as unknown as { createSocket(): Promise<unknown> };

        await expect(internals.createSocket()).rejects.toThrow('Java interop is disabled in the test double');
    });
});
