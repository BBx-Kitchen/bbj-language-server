package com.basis.bbj.intellij.actions;

import com.intellij.credentialStore.CredentialAttributes;
import com.intellij.credentialStore.CredentialAttributesKt;
import com.intellij.credentialStore.Credentials;
import com.intellij.ide.passwordSafe.PasswordSafe;
import org.jetbrains.annotations.NotNull;
import org.jetbrains.annotations.Nullable;

import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Utility for storing and retrieving EM JWT tokens via IntelliJ PasswordSafe.
 * Tokens are keyed by a service name, stored in the OS-native keychain.
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
     * Returns true if token is expired, false otherwise or if unable to determine.
     *
     * @param token the JWT token to check
     * @return true if expired, false otherwise
     */
    public static boolean isTokenExpired(@Nullable String token) {
        if (token == null || token.isEmpty()) {
            return false;
        }

        try {
            // JWTs have 3 dot-separated parts: header.payload.signature
            String[] parts = token.split("\\.");
            if (parts.length != 3) {
                return false; // Not a JWT, let server decide
            }

            // Base64url-decode the payload (index 1)
            byte[] decodedBytes = Base64.getUrlDecoder().decode(parts[1]);
            String payload = new String(decodedBytes, StandardCharsets.UTF_8);

            // Parse JSON manually to extract exp claim (no external dependency)
            Pattern expPattern = Pattern.compile("\"exp\"\\s*:\\s*(\\d+)");
            Matcher matcher = expPattern.matcher(payload);

            if (!matcher.find()) {
                return false; // No exp claim, can't determine
            }

            long exp = Long.parseLong(matcher.group(1));
            long now = System.currentTimeMillis() / 1000;

            return exp <= now;
        } catch (Exception e) {
            // If any parsing fails, let server validate
            return false;
        }
    }
}
