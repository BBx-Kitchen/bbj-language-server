package com.basis.bbj.intellij.actions;

import com.intellij.credentialStore.CredentialAttributes;
import com.intellij.credentialStore.CredentialAttributesKt;
import com.intellij.credentialStore.Credentials;
import com.intellij.credentialStore.PasswordSafeSettings;
import com.intellij.credentialStore.ProviderType;
import com.intellij.ide.passwordSafe.PasswordSafe;
import com.intellij.ide.util.PropertiesComponent;
import com.intellij.openapi.application.ApplicationManager;
import org.jetbrains.annotations.NotNull;
import org.jetbrains.annotations.Nullable;

/**
 * Utility for storing and retrieving EM JWT tokens via IntelliJ PasswordSafe.
 * Tokens are keyed by a service name and stored via IntelliJ's PasswordSafe, backed by
 * whichever credential store the user has configured (a native keychain, KeePass, or none).
 */
public final class BbjEMTokenStore {

    private static final String SERVICE_NAME = "BBj Enterprise Manager";

    /**
     * Persisted name of the last backend the user was warned about -- a value, not a boolean flag,
     * so a later change to a different weak backend still warns (#552).
     */
    private static final String BACKEND_WARNED_KEY = "com.basis.bbj.intellij.emTokenBackendWarned";

    /** Production policy: the persisted record above, warned about through a notification balloon. */
    private static final BackendNoticePolicy BACKEND_NOTICE = new BackendNoticePolicy(
        () -> PropertiesComponent.getInstance().getValue(BACKEND_WARNED_KEY, ""),
        value -> PropertiesComponent.getInstance().setValue(BACKEND_WARNED_KEY, value),
        BbjEMTokenStore::showBackendBalloon
    );

    private BbjEMTokenStore() {} // Utility class

    private static CredentialAttributes createAttributes() {
        return new CredentialAttributes(
            CredentialAttributesKt.generateServiceName(SERVICE_NAME, "jwt-token")
        );
    }

    public static void storeToken(@NotNull String token) {
        BACKEND_NOTICE.evaluate(resolveBackend());
        CredentialAttributes attrs = createAttributes();
        Credentials credentials = new Credentials("bbj-em", token);
        PasswordSafe.getInstance().set(attrs, credentials);
    }

    @Nullable
    public static String getToken() {
        BACKEND_NOTICE.evaluate(resolveBackend());
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

    /**
     * Production notifier behind {@link #BACKEND_NOTICE}: raises the balloon naming the store the
     * token actually landed in. The balloon body itself is filled in with the user-facing wording.
     */
    private static void showBackendBalloon(TokenBackend backend) {
        // Notification construction follows.
    }

    /**
     * Classify the credential store PasswordSafe resolved to for this IDE.
     *
     * <p>This is the only method in the plugin that names the platform's password-settings API. That
     * API is marked internal on the pinned platform, so a breaking change to it has to fail here and
     * nowhere else -- a source guard keeps it that way. Everything this method cannot positively
     * identify as the native keychain becomes {@link TokenBackend#UNKNOWN}, which is warn-worthy: a
     * detection failure that quietly passed as "keychain" would defeat the point of the notice (#552).
     *
     * @return the resolved backend, or {@link TokenBackend#UNKNOWN} on any failure
     */
    static TokenBackend resolveBackend() {
        try {
            PasswordSafeSettings settings =
                ApplicationManager.getApplication().getService(PasswordSafeSettings.class);
            if (settings == null) {
                return TokenBackend.UNKNOWN;
            }
            ProviderType provider = settings.getProviderType();
            if (provider == null) {
                return TokenBackend.UNKNOWN;
            }
            switch (provider) {
                case KEYCHAIN:
                    return TokenBackend.NATIVE_KEYCHAIN;
                case KEEPASS:
                    return TokenBackend.KEEPASS_FILE;
                case MEMORY_ONLY:
                case DO_NOT_STORE:
                    return TokenBackend.MEMORY_ONLY;
                default:
                    return TokenBackend.UNKNOWN;
            }
        } catch (Throwable t) {
            return TokenBackend.UNKNOWN;
        }
    }
}
