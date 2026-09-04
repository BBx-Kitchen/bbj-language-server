package com.basis.bbj.intellij.actions;

import com.intellij.credentialStore.CredentialAttributes;
import com.intellij.credentialStore.CredentialAttributesKt;
import com.intellij.credentialStore.Credentials;
import com.intellij.ide.passwordSafe.PasswordSafe;
import org.jetbrains.annotations.NotNull;
import org.jetbrains.annotations.Nullable;

/**
 * Utility for storing and retrieving EM JWT tokens via IntelliJ PasswordSafe.
 * Tokens are keyed by a service name and stored via IntelliJ's PasswordSafe, backed by
 * whichever credential store the user has configured (a native keychain, KeePass, or none).
 */
public final class BbjEMTokenStore {

    private static final String SERVICE_NAME = "BBj Enterprise Manager";

    private BbjEMTokenStore() {} // Utility class

    private static CredentialAttributes createAttributes() {
        return new CredentialAttributes(
            CredentialAttributesKt.generateServiceName(SERVICE_NAME, "jwt-token")
        );
    }

    public static void storeToken(@NotNull String token) {
        CredentialAttributes attrs = createAttributes();
        Credentials credentials = new Credentials("bbj-em", token);
        PasswordSafe.getInstance().set(attrs, credentials);
    }

    @Nullable
    public static String getToken() {
        CredentialAttributes attrs = createAttributes();
        Credentials credentials = PasswordSafe.getInstance().get(attrs);
        return credentials != null ? credentials.getPasswordAsString() : null;
    }

    public static void deleteToken() {
        CredentialAttributes attrs = createAttributes();
        PasswordSafe.getInstance().set(attrs, null);
    }

    /**
     * Check if a JWT token is expired by decoding its payload and checking the exp claim.
     * Anything that is not positively decoded as an unexpired JWT is reported expired (#535):
     * a non-3-part token, a payload with no {@code exp} claim, and any decode/parse failure all
     * classify {@link JwtValidity.Result#MALFORMED} and are treated as expired here -- there is
     * no result meaning "cannot tell, let the server decide".
     *
     * @param token the JWT token to check
     * @return true if expired or unclassifiable, false only for a positively decoded, unexpired JWT
     */
    public static boolean isTokenExpired(@Nullable String token) {
        return JwtValidity.check(token, System.currentTimeMillis() / 1000) != JwtValidity.Result.VALID;
    }
}
