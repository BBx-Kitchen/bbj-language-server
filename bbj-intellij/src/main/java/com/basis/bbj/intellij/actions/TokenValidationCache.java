package com.basis.bbj.intellij.actions;

import org.jetbrains.annotations.NotNull;
import org.jetbrains.annotations.Nullable;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;
import java.util.function.BooleanSupplier;
import java.util.function.LongSupplier;

/**
 * Read-through trust window in front of the server-side EM token validation subprocess
 * ({@code validateTokenServerSide}), keyed on a SHA-256 digest of the token's UTF-8 bytes --
 * never the token plaintext (#542, research Pitfall 6). Not an IntelliJ service -- a plain
 * static memo with no {@code com.intellij} import of any kind, so it runs on the plain
 * JUnit 5 test classpath.
 *
 * <p>Only a successful server validation is recorded ({@link #recordValidated}); a failed one
 * never populates the cache. Expiry is evaluated on read against {@link #TRUST_WINDOW_MS} --
 * there is no timer and no background thread. {@link BbjEMTokenStore#storeToken} and
 * {@link BbjEMTokenStore#deleteToken} both call {@link #invalidate()} unconditionally, so a
 * login, a logout, an expiry-driven delete and a failed-validation delete all clear the trust
 * record; nothing here is persisted, so an IDE restart also starts cold.
 */
public final class TokenValidationCache {

    /**
     * The trust window: a UX optimisation, never a security boundary. {@code web.bbj}
     * still presents the token to EM at every launch, so a revoked token fails at launch
     * regardless of this window. Must not be raised above five minutes; may be lowered, not
     * below 60 seconds.
     */
    public static final long TRUST_WINDOW_MS = TimeUnit.MINUTES.toMillis(5);

    /** The single production instance; tests inject a fixed clock via the package-private constructor. */
    public static final TokenValidationCache SESSION = new TokenValidationCache(System::currentTimeMillis);

    /** One immutable trust record: the digest of the validated token, and when it was validated. */
    private record Entry(byte[] tokenDigest, long validatedAtMillis) {
    }

    private final LongSupplier clock;
    private final AtomicReference<Entry> entry = new AtomicReference<>();

    /** Package-private so tests can inject a fixed clock and observe the window's arithmetic. */
    TokenValidationCache(LongSupplier clock) {
        this.clock = clock;
    }

    private static byte[] digestOf(String token) {
        try {
            return MessageDigest.getInstance("SHA-256").digest(token.getBytes(StandardCharsets.UTF_8));
        } catch (NoSuchAlgorithmException e) {
            // SHA-256 is mandated by every JDK security provider (JLS/JCA baseline); this is
            // unreachable in practice and is not itself a validation-failure path.
            throw new IllegalStateException("SHA-256 MessageDigest not available", e);
        }
    }

    /**
     * True only when a prior successful validation of the same token (by digest) is still
     * within {@link #TRUST_WINDOW_MS}. A null or empty token, an empty cache, a different token
     * value (a miss by construction, since the digest differs), or an expired entry all return
     * false. Evaluated entirely on read -- no timer, no background thread.
     *
     * @param token the token to check, or null/empty for "never trusted"
     * @return true only for a still-fresh, digest-matching prior validation
     */
    public boolean isTrusted(@Nullable String token) {
        if (token == null || token.isEmpty()) {
            return false;
        }
        Entry current = entry.get();
        if (current == null) {
            return false;
        }
        if (!MessageDigest.isEqual(current.tokenDigest(), digestOf(token))) {
            return false;
        }
        return clock.getAsLong() - current.validatedAtMillis() <= TRUST_WINDOW_MS;
    }

    /**
     * Records a successful validation of {@code token} as of now, replacing any prior entry.
     * Never called for a token that failed server-side validation -- callers are
     * expected to guard this themselves; see {@link #validateThrough}.
     *
     * @param token the token that was just positively validated
     */
    public void recordValidated(@NotNull String token) {
        entry.set(new Entry(digestOf(token), clock.getAsLong()));
    }

    /**
     * Clears the trust record unconditionally. Called from both
     * {@link BbjEMTokenStore#storeToken} and {@link BbjEMTokenStore#deleteToken} so that login,
     * logout, an expiry-driven delete and a failed-validation delete all start the next Run
     * cold.
     */
    public void invalidate() {
        entry.set(null);
    }

    /**
     * The read-through entry point and the only decision site: when {@link #isTrusted} is true,
     * returns true without calling {@code serverCheck} at all -- the subprocess is skipped
     * entirely. Otherwise runs {@code serverCheck}, records the result only when it returned
     * true and the token is non-null and non-empty, and returns that result unconditionally. A
     * false verdict from {@code serverCheck} is never recorded.
     *
     * @param token       the token to validate, or null/empty (never trusted, never recorded)
     * @param serverCheck the server-side validation to run on a cache miss
     * @return true when trusted or when {@code serverCheck} returned true
     */
    public boolean validateThrough(@Nullable String token, BooleanSupplier serverCheck) {
        if (isTrusted(token)) {
            return true;
        }
        boolean result = serverCheck.getAsBoolean();
        if (result && token != null && !token.isEmpty()) {
            recordValidated(token);
        }
        return result;
    }

    /** Test-only: whether a trust record currently exists, regardless of its freshness. */
    boolean hasEntry() {
        return entry.get() != null;
    }
}
