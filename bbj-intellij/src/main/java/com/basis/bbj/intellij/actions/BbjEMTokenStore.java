package com.basis.bbj.intellij.actions;

import com.intellij.credentialStore.CredentialAttributes;
import com.intellij.credentialStore.CredentialAttributesKt;
import com.intellij.credentialStore.Credentials;
import com.intellij.credentialStore.PasswordSafeSettings;
import com.intellij.credentialStore.ProviderType;
import com.intellij.ide.passwordSafe.PasswordSafe;
import com.intellij.ide.util.PropertiesComponent;
import com.intellij.notification.Notification;
import com.intellij.notification.NotificationAction;
import com.intellij.notification.NotificationType;
import com.intellij.notification.Notifications;
import com.intellij.openapi.actionSystem.AnActionEvent;
import com.intellij.openapi.application.ApplicationManager;
import com.intellij.openapi.options.ShowSettingsUtil;
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
     * Production notifier behind {@link #BACKEND_NOTICE}: raises a non-modal WARNING balloon naming
     * the store the token actually landed in. Non-modal deliberately -- the login path already shows
     * a modal success dialog, and a second modal on top of it would be unwelcome (#552).
     *
     * <p>{@link TokenBackend#NATIVE_KEYCHAIN} never reaches this method (the policy filters it out
     * before calling the notifier), so it is a no-op here rather than a fourth message.
     */
    private static void showBackendBalloon(TokenBackend backend) {
        String body;
        switch (backend) {
            case KEEPASS_FILE:
                body = "IntelliJ is keeping your Enterprise Manager token in a KeePass file, not the operating system keychain.";
                break;
            case MEMORY_ONLY:
                body = "IntelliJ is keeping your Enterprise Manager token in memory only - it will be lost when the IDE restarts.";
                break;
            case UNKNOWN:
                body = "IntelliJ is keeping your Enterprise Manager token in an unrecognised password store, not the operating system keychain.";
                break;
            default:
                return;
        }

        Notification notification = new Notification(
            "BBj Language Server",
            "Enterprise Manager token is not in the OS keychain",
            body,
            NotificationType.WARNING
        );

        notification.addAction(new NotificationAction("Open Password Settings") {
            @Override
            public void actionPerformed(@NotNull AnActionEvent e, @NotNull Notification notification) {
                ShowSettingsUtil.getInstance().showSettingsDialog(e.getProject(), "Passwords");
                notification.expire();
            }
        });
        notification.addAction(new NotificationAction("Dismiss") {
            @Override
            public void actionPerformed(@NotNull AnActionEvent e, @NotNull Notification notification) {
                notification.expire();
            }
        });

        Notifications.Bus.notify(notification);
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
