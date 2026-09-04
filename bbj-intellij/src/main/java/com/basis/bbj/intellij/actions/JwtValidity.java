package com.basis.bbj.intellij.actions;

import org.jetbrains.annotations.Nullable;

import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Classifies an EM JWT into exactly one of {@link Result#VALID}, {@link Result#EXPIRED} or
 * {@link Result#MALFORMED} from a single decode. There is deliberately no result meaning
 * "cannot tell" -- #535 is that a two-part token, a payload with no {@code exp} claim, and any
 * decode/parse exception were each reported as "not expired" via four independent {@code return
 * false} sites, handing the run path an unverifiable token. Collapsing every unclassifiable shape
 * into {@link Result#MALFORMED} -- treated as expired by every caller -- removes that
 * classification instead of patching each branch separately (research Pitfall 5: a partial fix
 * satisfies a test that exercises only one path per assertion).
 *
 * <p>No JWT or JSON library is added and the signature is never verified: there is no key
 * material on the client, and the server-side check ({@code validateTokenServerSide}) remains the
 * authority. This class only decides whether a token is worth presenting to the server at all.
 */
public final class JwtValidity {

    /** Pre-compiled once rather than per call. */
    private static final Pattern EXP_PATTERN = Pattern.compile("\"exp\"\\s*:\\s*(\\d+)");

    public enum Result { VALID, EXPIRED, MALFORMED }

    private JwtValidity() {} // Utility class

    /**
     * Classifies {@code token} as of {@code nowEpochSeconds}. A null or empty token, a segment
     * count other than 3, a base64url decode failure, a payload with no matching {@code exp}
     * group, and a group that does not parse as a {@code long} are all {@link Result#MALFORMED}.
     * Only a successfully parsed integer {@code exp} produces {@link Result#VALID} or
     * {@link Result#EXPIRED}, compared strictly ({@code exp <= now} is expired) -- no leeway, no
     * clock-skew allowance, because the server-side check absorbs skew.
     *
     * @param token           the JWT token to classify
     * @param nowEpochSeconds the clock reading to compare {@code exp} against, in epoch seconds
     * @return the classification; never null
     */
    public static Result check(@Nullable String token, long nowEpochSeconds) {
        if (token == null || token.isEmpty()) {
            return Result.MALFORMED;
        }

        try {
            // JWTs have 3 dot-separated parts: header.payload.signature
            String[] parts = token.split("\\.");
            if (parts.length != 3) {
                return Result.MALFORMED;
            }

            // Base64url-decode the payload (index 1)
            byte[] decodedBytes = Base64.getUrlDecoder().decode(parts[1]);
            String payload = new String(decodedBytes, StandardCharsets.UTF_8);

            // Parse JSON manually to extract exp claim (no external dependency)
            Matcher matcher = EXP_PATTERN.matcher(payload);

            if (!matcher.find()) {
                return Result.MALFORMED;
            }

            long exp = Long.parseLong(matcher.group(1));

            return exp <= nowEpochSeconds ? Result.EXPIRED : Result.VALID;
        } catch (Exception e) {
            // Decode failure, non-integer exp, overflow -- all unclassifiable, all MALFORMED.
            return Result.MALFORMED;
        }
    }
}
