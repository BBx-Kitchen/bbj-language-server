/******************************************************************************
 * Copyright 2023 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

/**
 * Pins the one classifier every bbj-ls failure goes through: each application and JSON-RPC code
 * maps to its own kind, anything else is a transport failure, the two codes that carry data
 * produce validated, bounded, freshly built payloads, and the failure log cadence warns once per
 * kind and then drops to debug.
 */
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { ErrorCodes, ResponseError } from 'vscode-jsonrpc/node.js';
import { LSPErrorCodes } from 'vscode-languageserver';
import {
    classifyInteropError, ERROR_DENUM_NEEDED, ERROR_FORMAT_FAILED, ERROR_INVALID_SETTINGS,
    ERROR_MIXED_NUMBERING, ERROR_PARSE_FAILED, ERROR_PROTECTED_PROGRAM, ERROR_SERVICE_UNAVAILABLE,
    ERROR_TIMEOUT, ERROR_TOO_LARGE, FailureLogCadence, MAX_INVALID_SETTINGS_PROBLEMS,
    type InteropErrorKind
} from '../src/language/java-interop-errors.js';
import { InteropTransportError } from '../src/language/java-interop.js';
import { MAX_PEER_ERROR_LENGTH, TRUNCATION_MARKER } from '../src/language/java-peer-guard.js';
import { logger } from '../src/language/logger.js';

describe('classifyInteropError: code to kind', () => {

    const table: Array<[string, number, InteropErrorKind]> = [
        ['parse failed', ERROR_PARSE_FAILED, 'parser-exception'],
        ['timeout', ERROR_TIMEOUT, 'timeout'],
        ['too large', ERROR_TOO_LARGE, 'size-cap'],
        ['service unavailable', ERROR_SERVICE_UNAVAILABLE, 'service-unavailable'],
        ['protected program', ERROR_PROTECTED_PROGRAM, 'protected-program'],
        ['denum needed', ERROR_DENUM_NEEDED, 'denum-needed'],
        ['invalid settings', ERROR_INVALID_SETTINGS, 'invalid-settings'],
        ['mixed numbering', ERROR_MIXED_NUMBERING, 'mixed-numbering'],
        ['format failed', ERROR_FORMAT_FAILED, 'format-failed'],
        ['invalid params', ErrorCodes.InvalidParams, 'invalid-params'],
        ['method not found', ErrorCodes.MethodNotFound, 'method-not-found'],
        ['request cancelled', LSPErrorCodes.RequestCancelled, 'cancelled'],
    ];

    test.each(table)('%s (%i) is %s', (_name, code, kind) => {
        expect(classifyInteropError(new ResponseError(code, 'peer said so'))).toMatchObject({ kind, code });
    });

    test.each(table)('a plain object with code %s (%i) classifies like a ResponseError', (_name, code, kind) => {
        const fromPlain = classifyInteropError({ code, message: 'peer said so' });
        const fromResponseError = classifyInteropError(new ResponseError(code, 'peer said so'));
        expect(fromPlain.kind).toBe(kind);
        expect(fromPlain.code).toBe(fromResponseError.code);
    });

    test('the numeric constants carry the documented values', () => {
        expect([
            ERROR_PARSE_FAILED, ERROR_TIMEOUT, ERROR_TOO_LARGE, ERROR_SERVICE_UNAVAILABLE,
            ERROR_PROTECTED_PROGRAM, ERROR_DENUM_NEEDED, ERROR_INVALID_SETTINGS,
            ERROR_MIXED_NUMBERING, ERROR_FORMAT_FAILED
        ]).toEqual([-33001, -33002, -33003, -33004, -33005, -33006, -33007, -33008, -33009]);
    });

    test('a service-unavailable answer is a failure kind, never a missing method', () => {
        expect(classifyInteropError({ code: ERROR_SERVICE_UNAVAILABLE }).kind).toBe('service-unavailable');
    });

    const transportCases: Array<[string, unknown]> = [
        ['a plain Error', new Error('x')],
        ['the breaker short circuit', new InteropTransportError('Java interop service unavailable (circuit open)')],
        ['a dropped in-flight request', new ResponseError(ErrorCodes.PendingResponseRejected, 'connection closed')],
        ['an internal error code', { code: -32603 }],
        ['an unknown number', { code: 12345 }],
        ['a string code', { code: '-33001' }],
        ['null', null],
        ['undefined', undefined],
        ['a string', 'text'],
    ];

    test.each(transportCases)('%s is transport', (_name, error) => {
        expect(classifyInteropError(error).kind).toBe('transport');
    });

    test('a non-numeric code is reported as no code', () => {
        expect(classifyInteropError({ code: '-33001' }).code).toBeUndefined();
        expect(classifyInteropError(new Error('x')).code).toBeUndefined();
    });

    test('the message is the error message for an Error and String(error) otherwise', () => {
        expect(classifyInteropError(new Error('boom')).message).toBe('boom');
        expect(classifyInteropError(new ResponseError(ERROR_TIMEOUT, 'too slow')).message).toBe('too slow');
        expect(classifyInteropError('text').message).toBe('text');
        expect(classifyInteropError(null).message).toBe('null');
        expect(classifyInteropError(undefined).message).toBe('undefined');
        expect(classifyInteropError({ code: 1 }).message).toBe('[object Object]');
    });
});

describe('classifyInteropError: invalid-settings data', () => {

    function invalidSettings(data: unknown) {
        return classifyInteropError(new ResponseError(ERROR_INVALID_SETTINGS, 'invalid settings', data));
    }

    test('keeps every problem in order, each with exactly the keys setting and message', () => {
        const classified = invalidSettings([
            { setting: 'indentWidth', message: 'not an integer' },
            { setting: 'bogus', message: 'unknown setting' },
        ]);
        expect(classified.kind).toBe('invalid-settings');
        expect(classified.data).toEqual({
            kind: 'invalid-settings',
            problems: [
                { setting: 'indentWidth', message: 'not an integer' },
                { setting: 'bogus', message: 'unknown setting' },
            ]
        });
        const problems = (classified.data as { problems: object[] }).problems;
        for (const problem of problems) {
            expect(Object.keys(problem)).toEqual(['setting', 'message']);
        }
    });

    test('drops entries that are not plain objects with a string setting and message, one at a time', () => {
        const classified = invalidSettings([
            'text', 7, null, [], undefined,
            { setting: 1, message: 'a' },
            { setting: 'a', message: 2 },
            { setting: 'a' },
            { message: 'a' },
            { setting: 'kept', message: 'ok' },
        ]);
        expect(classified.data).toEqual({
            kind: 'invalid-settings',
            problems: [{ setting: 'kept', message: 'ok' }]
        });
    });

    test.each([
        ['undefined', undefined],
        ['null', null],
        ['an object', { setting: 'a', message: 'b' }],
        ['a string', 'text'],
        ['a number', 3],
    ])('data that is %s still yields the kind with no problems', (_name, data) => {
        const classified = invalidSettings(data);
        expect(classified.kind).toBe('invalid-settings');
        expect(classified.data).toEqual({ kind: 'invalid-settings', problems: [] });
    });

    test('keeps at most the problem cap', () => {
        const many = Array.from({ length: 100 }, (_v, i) => ({ setting: `s${i}`, message: `m${i}` }));
        const problems = (invalidSettings(many).data as { problems: Array<{ setting: string }> }).problems;
        expect(MAX_INVALID_SETTINGS_PROBLEMS).toBe(64);
        expect(problems).toHaveLength(MAX_INVALID_SETTINGS_PROBLEMS);
        expect(problems[0].setting).toBe('s0');
        expect(problems[63].setting).toBe('s63');
    });

    test('truncates an over-long message and setting name to the peer error bound', () => {
        const long = 'x'.repeat(5000);
        const classified = invalidSettings([{ setting: long, message: long }]);
        const [problem] = (classified.data as { problems: Array<{ setting: string; message: string }> }).problems;
        for (const value of [problem.setting, problem.message]) {
            expect(value).toHaveLength(MAX_PEER_ERROR_LENGTH);
            expect(value.endsWith(TRUNCATION_MARKER)).toBe(true);
        }
    });

    test('a __proto__ key from parsed JSON never reaches Object.prototype or the returned problem', () => {
        const data: unknown = JSON.parse(
            '[{"setting":"a","message":"b","__proto__":{"polluted":true}},{"__proto__":{"polluted":true},"setting":"c","message":"d"}]'
        );
        const classified = invalidSettings(data);
        expect(({} as Record<string, unknown>).polluted).toBeUndefined();
        const problems = (classified.data as { problems: object[] }).problems;
        expect(problems).toEqual([{ setting: 'a', message: 'b' }, { setting: 'c', message: 'd' }]);
        for (const problem of problems) {
            expect(Object.keys(problem)).toEqual(['setting', 'message']);
            expect(Object.getPrototypeOf(problem)).toBe(Object.prototype);
        }
    });

    test('never hands back the peer\'s own objects', () => {
        const entry = { setting: 'a', message: 'b' };
        const classified = invalidSettings([entry]);
        const [problem] = (classified.data as { problems: object[] }).problems;
        expect(problem).not.toBe(entry);
    });
});

describe('classifyInteropError: mixed-numbering data', () => {

    function mixedNumbering(data: unknown) {
        return classifyInteropError(new ResponseError(ERROR_MIXED_NUMBERING, 'mixed line numbering', data));
    }

    test('carries a positive integer line', () => {
        const classified = mixedNumbering({ line: 2 });
        expect(classified.kind).toBe('mixed-numbering');
        expect(classified.data).toEqual({ kind: 'mixed-numbering', line: 2 });
    });

    test.each([
        ['zero', { line: 0 }],
        ['negative', { line: -1 }],
        ['fractional', { line: 1.5 }],
        ['a string', { line: '2' }],
        ['absent', {}],
        ['null data', null],
        ['array data', []],
        ['undefined data', undefined],
    ])('a line that is %s gives an undefined line', (_name, data) => {
        const classified = mixedNumbering(data);
        expect(classified.kind).toBe('mixed-numbering');
        expect(classified.data).toEqual({ kind: 'mixed-numbering', line: undefined });
    });
});

describe('classifyInteropError: data on other codes', () => {

    test.each([
        ERROR_PARSE_FAILED, ERROR_TIMEOUT, ERROR_TOO_LARGE, ERROR_SERVICE_UNAVAILABLE,
        ERROR_PROTECTED_PROGRAM, ERROR_DENUM_NEEDED, ERROR_FORMAT_FAILED,
        ErrorCodes.InvalidParams, ErrorCodes.MethodNotFound, LSPErrorCodes.RequestCancelled,
    ])('code %i never carries data', code => {
        const classified = classifyInteropError(new ResponseError(code, 'x', [{ setting: 'a', message: 'b' }]));
        expect(classified.data).toBeUndefined();
    });

    test('a transport failure never carries data', () => {
        expect(classifyInteropError(new Error('x')).data).toBeUndefined();
    });
});

describe('FailureLogCadence', () => {

    let warn: ReturnType<typeof vi.spyOn>;
    let debug: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
        warn = vi.spyOn(logger, 'warn').mockImplementation(() => {});
        debug = vi.spyOn(logger, 'debug').mockImplementation(() => {});
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    test('warns the first time a kind is reported and debugs every repeat', () => {
        const cadence = new FailureLogCadence();
        cadence.report('timeout', 'line one');
        cadence.report('timeout', 'line two');
        expect(warn.mock.calls).toEqual([['line one']]);
        expect(debug.mock.calls).toEqual([['line two']]);
    });

    test('a different kind warns on its own first occurrence', () => {
        const cadence = new FailureLogCadence();
        cadence.report('timeout', 'a');
        cadence.report('size-cap', 'b');
        expect(warn.mock.calls).toEqual([['a'], ['b']]);
        expect(debug).not.toHaveBeenCalled();
    });

    test('a new generation value re-arms warn, the same value does not', () => {
        const cadence = new FailureLogCadence();
        cadence.syncGeneration(1);
        cadence.report('timeout', 'a');
        cadence.syncGeneration(1);
        cadence.report('timeout', 'b');
        expect(warn.mock.calls).toEqual([['a']]);
        expect(debug.mock.calls).toEqual([['b']]);
        cadence.syncGeneration(2);
        cadence.report('timeout', 'c');
        expect(warn.mock.calls).toEqual([['a'], ['c']]);
    });

    test('clear re-arms warn for every kind', () => {
        const cadence = new FailureLogCadence();
        cadence.report('timeout', 'a');
        cadence.report('size-cap', 'b');
        cadence.clear();
        cadence.report('timeout', 'c');
        cadence.report('size-cap', 'd');
        expect(warn.mock.calls).toEqual([['a'], ['b'], ['c'], ['d']]);
        expect(debug).not.toHaveBeenCalled();
    });

    test('logs exactly the line it is given', () => {
        const cadence = new FailureLogCadence();
        cadence.report('transport', 'request failed (transport): socket closed');
        expect(warn).toHaveBeenCalledWith('request failed (transport): socket closed');
    });
});
