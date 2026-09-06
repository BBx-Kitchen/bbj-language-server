package com.basis.bbj.intellij.actions;

import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;
import java.util.Base64;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Behavioural coverage for {@link JwtValidity#check(String, long)} and
 * {@link BbjEMTokenStore#isTokenExpired(String)}. Every previously fail-open branch (#535) is
 * pinned by a named test: a non-3-part token, an exp-less payload and a decode-throwing payload
 * must each classify MALFORMED and each make {@code isTokenExpired} report true.
 */
class JwtValidityTest {

    private static final String HEADER = "eyJhbGciOiJIUzI1NiJ9"; // {"alg":"HS256"} base64url, fixed literal
    private static final String SIGNATURE = "sig";

    private static String payloadSegment(String json) {
        return Base64.getUrlEncoder().withoutPadding().encodeToString(json.getBytes(StandardCharsets.UTF_8));
    }

    private static String tokenWithPayload(String json) {
        return HEADER + "." + payloadSegment(json) + "." + SIGNATURE;
    }

    @Test
    void aTwoPartTokenIsMalformed() {
        String token = "aaa.bbb";

        assertEquals(JwtValidity.Result.MALFORMED, JwtValidity.check(token, 1000L));
        assertTrue(BbjEMTokenStore.isTokenExpired(token));
    }

    @Test
    void aWellFormedPayloadWithoutAnExpClaimIsMalformed() {
        String token = tokenWithPayload("{\"sub\":\"admin\"}");

        assertEquals(JwtValidity.Result.MALFORMED, JwtValidity.check(token, 1000L));
        assertTrue(BbjEMTokenStore.isTokenExpired(token));
    }

    @Test
    void expOnEitherSideOfNowDiscriminatesValidFromExpired() {
        String token = tokenWithPayload("{\"exp\":2000}");

        assertEquals(JwtValidity.Result.VALID, JwtValidity.check(token, 1999L));
        assertEquals(JwtValidity.Result.EXPIRED, JwtValidity.check(token, 2001L));
    }

    @Test
    void aDecodeThrowingPayloadIsMalformed() {
        // "!!!not-base64!!!" contains characters outside the base64url alphabet, so
        // Base64.getUrlDecoder().decode throws IllegalArgumentException.
        String token = HEADER + ".!!!not-base64!!!." + SIGNATURE;

        assertEquals(JwtValidity.Result.MALFORMED, JwtValidity.check(token, 1000L));
        assertTrue(BbjEMTokenStore.isTokenExpired(token));
    }

    @Test
    void aNullTokenIsMalformed() {
        assertEquals(JwtValidity.Result.MALFORMED, JwtValidity.check(null, 1000L));
        assertTrue(BbjEMTokenStore.isTokenExpired(null));
    }

    @Test
    void anEmptyTokenIsMalformed() {
        assertEquals(JwtValidity.Result.MALFORMED, JwtValidity.check("", 1000L));
        assertTrue(BbjEMTokenStore.isTokenExpired(""));
    }

    @Test
    void anExpExactlyEqualToNowIsExpired() {
        String token = tokenWithPayload("{\"exp\":2000}");

        assertEquals(JwtValidity.Result.EXPIRED, JwtValidity.check(token, 2000L));
    }

    @Test
    void anExpThatIsNotAnIntegerIsMalformed() {
        String stringExp = tokenWithPayload("{\"exp\":\"soon\"}");
        String decimalExp = tokenWithPayload("{\"exp\":12.5}");

        assertEquals(JwtValidity.Result.MALFORMED, JwtValidity.check(stringExp, 1000L));
        assertEquals(JwtValidity.Result.MALFORMED, JwtValidity.check(decimalExp, 1000L));
    }

    @Test
    void anExpLargerThanLongMaxIsMalformed() {
        // 20 nines overflows Long.parseLong (Long.MAX_VALUE has 19 digits).
        String token = tokenWithPayload("{\"exp\":99999999999999999999}");

        assertEquals(JwtValidity.Result.MALFORMED, JwtValidity.check(token, 1000L));
    }

    @Test
    void aFourPartTokenIsMalformed() {
        String token = HEADER + "." + payloadSegment("{\"exp\":2000}") + "." + SIGNATURE + ".extra";

        assertEquals(JwtValidity.Result.MALFORMED, JwtValidity.check(token, 1000L));
        assertTrue(BbjEMTokenStore.isTokenExpired(token));
    }

    @Test
    void aTokenWithNoDotsIsMalformed() {
        String token = "abcdefghij";

        assertEquals(JwtValidity.Result.MALFORMED, JwtValidity.check(token, 1000L));
        assertTrue(BbjEMTokenStore.isTokenExpired(token));
    }

    @Test
    void checkIsPureAcrossRepeatedAndInterleavedCalls() {
        String malformed = "aaa.bbb";
        String valid = tokenWithPayload("{\"exp\":2000}");

        assertEquals(JwtValidity.Result.MALFORMED, JwtValidity.check(malformed, 1000L));
        assertEquals(JwtValidity.Result.VALID, JwtValidity.check(valid, 1000L));
        assertEquals(JwtValidity.Result.MALFORMED, JwtValidity.check(malformed, 1000L));
    }
}
