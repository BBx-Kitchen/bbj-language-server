package com.basis.bbj.intellij.actions;

/**
 * How IntelliJ's PasswordSafe is actually protecting the Enterprise Manager token (#552).
 *
 * <p>This is the plain classification the rest of the plugin speaks in, so that the platform's own
 * {@code ProviderType} never leaves {@code BbjEMTokenStore.resolveBackend()} — the single method
 * allowed to touch that unstable internal API.
 *
 * <p>Everything that is not {@link #NATIVE_KEYCHAIN} is worth warning about, {@link #UNKNOWN}
 * included: a backend we failed to identify must never be presented to the user as the OS keychain,
 * because a silent detection failure would defeat the entire point of the notice.
 */
public enum TokenBackend {

    /** The native operating-system keychain — the expected, strongest store. */
    NATIVE_KEYCHAIN,

    /** A KeePass database file managed by the IDE rather than the operating system. */
    KEEPASS_FILE,

    /** The token is held for this session only and does not survive an IDE restart. */
    MEMORY_ONLY,

    /** Detection failed, or the platform reported a store this plugin does not recognise. */
    UNKNOWN
}
