package com.basis.bbj.intellij.actions;

import java.util.function.Consumer;
import java.util.function.Supplier;
import org.jetbrains.annotations.Nullable;

/**
 * Remembers the last Enterprise Manager username that logged in successfully, so the login
 * prompt can offer it next time instead of a hard-coded default (issue #546 follow-up).
 *
 * <p>The username is not secret: production backs this with an application-level {@code
 * PropertiesComponent} value, the same shape {@link BbjEMTokenStore}'s backend-warning record
 * already uses. Passwords and tokens never go through this seam.
 *
 * <p>Both collaborators are {@code java.util.function} types, so this class carries no
 * IntelliJ platform dependency and is exercised directly by plain JUnit 5 tests.
 */
public final class EmUsernameMemory {

    /** The username offered when nothing has been remembered yet. */
    public static final String DEFAULT_USERNAME = "admin";

    private final Supplier<String> lastUsernameGet;
    private final Consumer<String> lastUsernameSet;

    public EmUsernameMemory(Supplier<String> lastUsernameGet, Consumer<String> lastUsernameSet) {
        this.lastUsernameGet = lastUsernameGet;
        this.lastUsernameSet = lastUsernameSet;
    }

    /**
     * The username to pre-fill the login prompt with: the stored value when it is non-null and
     * not blank, else {@link #DEFAULT_USERNAME}.
     */
    public String initialUsername() {
        String stored = lastUsernameGet.get();
        if (stored != null && !stored.isBlank()) {
            return stored;
        }
        return DEFAULT_USERNAME;
    }

    /**
     * Remembers {@code username} for next time. A no-op unless {@code username} is non-null
     * and not blank -- called only after a successful login, and only with the username, never
     * a password or token.
     */
    public void remember(@Nullable String username) {
        if (username == null || username.isBlank()) {
            return;
        }
        lastUsernameSet.accept(username);
    }
}
