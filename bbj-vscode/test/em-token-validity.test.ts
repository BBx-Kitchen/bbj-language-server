import { describe, expect, test } from 'vitest';

import { classifyEmToken, isEmTokenExpired } from '../src/em-token-validity.js';

/**
 * Mirrors the IntelliJ JwtValidityTest shapes for the VS Code EM token check
 * (issue #553), plus the JavaScript-specific empty-signature and base64url
 * alphabet cases that Java's own suite does not need.
 */

const HEADER = 'eyJhbGciOiJIUzI1NiJ9'; // {"alg":"HS256"} base64url, fixed literal
const SIGNATURE = 'sig';

function payload(json: string): string {
    return Buffer.from(json, 'utf8').toString('base64url');
}

function tokenWithPayload(json: string): string {
    return `${HEADER}.${payload(json)}.${SIGNATURE}`;
}

describe('classifyEmToken', () => {
    test('a two-part token is malformed', () => {
        expect(classifyEmToken('aaa.bbb', 1000)).toBe('malformed');
    });

    test('an empty third (signature) segment is malformed (unsigned token)', () => {
        const token = `${HEADER}.${payload('{"exp":2000}')}.`;

        expect(classifyEmToken(token, 1000)).toBe('malformed');
    });

    test('a well-formed payload without an exp claim is malformed', () => {
        const token = tokenWithPayload('{"sub":"admin"}');

        expect(classifyEmToken(token, 1000)).toBe('malformed');
    });

    test('exp after now is valid, and isEmTokenExpired reports false', () => {
        const token = tokenWithPayload('{"exp":2000}');

        expect(classifyEmToken(token, 1999)).toBe('valid');
        expect(isEmTokenExpired(token, 1999)).toBe(false);
    });

    test('exp on either side of now discriminates expired from valid, and exp equal to now is expired', () => {
        const token = tokenWithPayload('{"exp":2000}');

        expect(classifyEmToken(token, 2001)).toBe('expired');
        expect(classifyEmToken(token, 2000)).toBe('expired');
    });

    test('a payload segment that fails base64url decoding is malformed', () => {
        const token = `${HEADER}.!!!not-base64!!!.${SIGNATURE}`;

        expect(classifyEmToken(token, 1000)).toBe('malformed');
        expect(isEmTokenExpired(token, 1000)).toBe(true);
    });

    test('a payload segment using the standard base64 alphabet (+ or /) instead of base64url is malformed', () => {
        // '+//+/fw=' is valid standard-alphabet base64 (Buffer.from([0xfb,0xff,0xfe,0xfd,0xfc]).toString('base64'))
        // but '+' and '/' are outside the base64url alphabet Java's URL decoder (and this module) require.
        const token = `${HEADER}.+//+/fw=.${SIGNATURE}`;

        expect(classifyEmToken(token, 1000)).toBe('malformed');
    });

    test('a payload segment whose unpadded length is congruent to 1 mod 4 is malformed', () => {
        // 'abcde' is 5 base64url-alphabet characters with no padding; 5 % 4 === 1,
        // a remainder impossible for genuinely valid base64 data.
        const token = `${HEADER}.abcde.${SIGNATURE}`;

        expect(classifyEmToken(token, 1000)).toBe('malformed');
    });

    test('null, undefined and empty-string tokens are malformed, and isEmTokenExpired reports true', () => {
        for (const token of [null, undefined, '']) {
            expect(classifyEmToken(token, 1000)).toBe('malformed');
            expect(isEmTokenExpired(token, 1000)).toBe(true);
        }
    });

    test('a string exp value is malformed', () => {
        const token = tokenWithPayload('{"exp":"soon"}');

        expect(classifyEmToken(token, 1000)).toBe('malformed');
    });

    test('decimal exp values are malformed', () => {
        expect(classifyEmToken(tokenWithPayload('{"exp":12.5}'), 1000)).toBe('malformed');
        expect(classifyEmToken(tokenWithPayload('{"exp":2000.0}'), 1000)).toBe('malformed');
    });

    test('a negative exp value is malformed', () => {
        const token = tokenWithPayload('{"exp":-5}');

        expect(classifyEmToken(token, 1000)).toBe('malformed');
    });

    test('an exp value larger than a safe integer is malformed (overflow)', () => {
        const token = tokenWithPayload('{"exp":99999999999999999999}');

        expect(classifyEmToken(token, 1000)).toBe('malformed');
    });

    test('a four-part token is malformed', () => {
        const token = `${HEADER}.${payload('{"exp":2000}')}.${SIGNATURE}.extra`;

        expect(classifyEmToken(token, 1000)).toBe('malformed');
        expect(isEmTokenExpired(token, 1000)).toBe(true);
    });

    test('a token with no dots is malformed', () => {
        const token = 'abcdefghij';

        expect(classifyEmToken(token, 1000)).toBe('malformed');
        expect(isEmTokenExpired(token, 1000)).toBe(true);
    });

    test('a payload with whitespace around the exp colon is valid', () => {
        const token = tokenWithPayload('{"exp" : 2000}');

        expect(classifyEmToken(token, 1000)).toBe('valid');
    });

    test('classifyEmToken is pure across repeated and interleaved calls', () => {
        const malformed = 'aaa.bbb';
        const valid = tokenWithPayload('{"exp":2000}');

        expect(classifyEmToken(malformed, 1000)).toBe('malformed');
        expect(classifyEmToken(valid, 1000)).toBe('valid');
        expect(classifyEmToken(malformed, 1000)).toBe('malformed');
    });
});
