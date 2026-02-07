package com.basis.bbj.intellij.actions;

import com.intellij.credentialStore.CredentialAttributes;
import com.intellij.credentialStore.CredentialAttributesKt;
import com.intellij.credentialStore.Credentials;
import com.intellij.ide.passwordSafe.PasswordSafe;
import org.jetbrains.annotations.NotNull;
import org.jetbrains.annotations.Nullable;

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
}
