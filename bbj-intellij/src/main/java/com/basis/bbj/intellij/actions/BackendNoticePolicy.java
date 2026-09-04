package com.basis.bbj.intellij.actions;

import java.util.function.Consumer;
import java.util.function.Supplier;

/**
 * Decides whether the user still needs to be told that their Enterprise Manager token is not in the
 * native OS keychain (#552).
 *
 * <p>The rule is <em>once per distinct non-keychain backend</em>, not once ever. A one-shot boolean
 * would be wrong: a user who was warned about a memory-only store and later switches to a KeePass
 * file has changed how their token is protected, and deserves to hear about the new state. By the
 * same argument, resolving back to the native keychain clears the record, so a later switch away
 * warns again.
 *
 * <p>Both collaborators are {@code java.util.function} types, so this class carries no IntelliJ
 * platform dependency and is exercised directly by behavioural tests. In production the store is
 * backed by a persisted properties entry (so the record survives an IDE restart) and the notifier
 * raises a notification balloon.
 */
public final class BackendNoticePolicy {

    private final Supplier<String> lastWarnedGet;
    private final Consumer<String> lastWarnedSet;
    private final Consumer<TokenBackend> notifier;

    public BackendNoticePolicy(Supplier<String> lastWarnedGet,
                               Consumer<String> lastWarnedSet,
                               Consumer<TokenBackend> notifier) {
        this.lastWarnedGet = lastWarnedGet;
        this.lastWarnedSet = lastWarnedSet;
        this.notifier = notifier;
    }

    /**
     * Notify at most once for each distinct non-keychain backend, and clear the record whenever the
     * native keychain is in use.
     *
     * <p>Synchronized because the read-compare-notify-write sequence has to be atomic: two Runs
     * started at nearly the same moment both resolve the same backend, and without the lock both
     * could observe "not yet warned" and raise a balloon for one single state.
     *
     * @param backend the backend PasswordSafe actually resolved to for this token
     */
    public synchronized void evaluate(TokenBackend backend) {
        if (backend == TokenBackend.NATIVE_KEYCHAIN) {
            lastWarnedSet.accept("");
            return;
        }
        String lastWarned = lastWarnedGet.get();
        if (backend.name().equals(lastWarned)) {
            return;
        }
        notifier.accept(backend);
        lastWarnedSet.accept(backend.name());
    }
}
