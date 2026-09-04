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
}
