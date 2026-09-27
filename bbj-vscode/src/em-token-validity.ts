/******************************************************************************
 * Copyright 2023 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

/**
 * Classifies an EM JWT's expiry. Mirrors bbj-intellij's JwtValidity.check
 * (issue #553): anything not positively decoded as an unexpired JWT is
 * expired. No JWT or JSON library is added and the signature is never
 * verified — there is no key material on the client, and the server-side
 * check (validateTokenServerSide) remains the authority. This module only
 * decides whether a token is worth presenting to the server at all.
 *
 * JavaScript's String.prototype.split keeps a trailing empty segment where
 * Java's String.split does not ("header.payload.".split('.') has length 3 in
 * JavaScript, 2 in Java), so the empty signature segment is checked
 * explicitly rather than relying on a bare segment-count check.
 *
 * This module has no imports and no `vscode` dependency, so it can be tested
 * directly with no mocks.
 */

/** `"exp": 123` -- the trailing `(?![.\d])` rejects a decimal exp value
 * (e.g. `12.5`) instead of silently truncating it to the leading digits; a
 * non-integer exp must classify as malformed, never reach a verdict. */
const EXP_PATTERN = /"exp"\s*:\s*(\d+)(?![.\d])/;

/** A base64url segment: only the base64url alphabet, with at most 2 `=`
 * padding characters at the end. */
const BASE64URL_ALPHABET = /^[A-Za-z0-9_-]+={0,2}$/;

export type EmTokenVerdict = 'valid' | 'expired' | 'malformed';

/**
 * Classifies `token` as of `nowEpochSeconds`. A null/empty token, a segment
 * count other than 3, an empty third (signature) segment, a base64url decode
 * failure, a payload with no `exp` claim, or an `exp` that does not parse as
 * a safe non-negative integer are all `'malformed'`. Only a positively
 * decoded, integer `exp` yields `'valid'`/`'expired'`, compared strictly
 * (`exp <= now` is expired) -- no leeway, no clock-skew allowance, because
 * the server-side check absorbs skew.
 */
export function classifyEmToken(token: string | null | undefined, nowEpochSeconds: number): EmTokenVerdict {
    if (!token) {
        return 'malformed';
    }

    const parts = token.split('.');
    // JavaScript's split() keeps a trailing empty segment (unlike Java's
    // String.split), so "header.payload." has length 3 here -- the explicit
    // empty-signature check below is required, not redundant.
    if (parts.length !== 3 || parts[2] === '') {
        return 'malformed';
    }

    try {
        const decoded = decodeBase64UrlStrict(parts[1]);
        const match = EXP_PATTERN.exec(decoded);
        if (!match) {
            return 'malformed';
        }

        const exp = Number(match[1]);
        if (!Number.isSafeInteger(exp)) {
            return 'malformed';
        }

        return exp <= nowEpochSeconds ? 'expired' : 'valid';
    } catch {
        // Decode failure, non-integer exp, overflow -- all unclassifiable, all malformed.
        return 'malformed';
    }
}

/** `true` unless `classifyEmToken` returns `'valid'` -- anything not positively
 * decoded as an unexpired JWT is treated as expired. */
export function isEmTokenExpired(token: string | null | undefined, nowEpochSeconds: number): boolean {
    return classifyEmToken(token, nowEpochSeconds) !== 'valid';
}

/**
 * Strictly decodes a base64url segment, mirroring Java's
 * `Base64.getUrlDecoder()`, which rejects any character outside the
 * base64url alphabet and any invalid length/padding. Node's
 * `Buffer.from(..., 'base64url')` is lenient and silently skips characters
 * Java would reject, so the alphabet and length are checked explicitly
 * first. Throws on any violation; the caller treats that as malformed.
 */
function decodeBase64UrlStrict(segment: string): string {
    if (!BASE64URL_ALPHABET.test(segment)) {
        throw new Error('segment is not valid base64url');
    }

    const unpadded = segment.replace(/=+$/, '');
    // A remainder of 1 is impossible for valid base64 data (a byte group
    // encodes to 2, 3 or 4 characters, never 1), so it signals corruption.
    if (unpadded.length % 4 === 1) {
        throw new Error('segment has an invalid base64url length');
    }
    if (segment.includes('=') && segment.length % 4 !== 0) {
        throw new Error('segment has invalid base64url padding');
    }

    return Buffer.from(unpadded, 'base64url').toString('utf8');
}
