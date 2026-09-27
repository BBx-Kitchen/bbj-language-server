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
});
