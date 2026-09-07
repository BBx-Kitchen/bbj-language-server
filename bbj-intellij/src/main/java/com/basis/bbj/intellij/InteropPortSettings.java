package com.basis.bbj.intellij;

/**
 * Pure decision functions for the java-interop port setting: the single effective-port answer
 * every reader shares, the one-time upgrade-migration inference, and the persist/modified-check
 * helpers the Settings dialog uses. No {@code com.intellij} import and no I/O — every input
 * arrives as a plain argument, in the style of {@link BbjSettingsLookups}' pure statics.
 */
public final class InteropPortSettings {

    private InteropPortSettings() {
    }

    /** True for a port in 1-65535 inclusive. */
    public static boolean isValidPort(int port) {
        return port >= 1 && port <= 65535;
    }

    /**
     * The port when valid, {@link BbjInteropPortDetector#DEFAULT_PORT} otherwise. Stops a corrupt
     * or hand-edited {@code BbjSettings.xml} from driving a connection to port 0 or any other
     * out-of-range value.
     */
    public static int sanitizePort(int port) {
        return isValidPort(port) ? port : BbjInteropPortDetector.DEFAULT_PORT;
    }

    /**
     * The single answer every reader of the java-interop port shares: when {@code autoDetect} is
     * true, the lookup's port if it was detected and {@link BbjInteropPortDetector#DEFAULT_PORT}
     * otherwise; when false, {@link #sanitizePort(int)} of {@code storedPort}. An explicitly
     * confirmed 5008 is returned unchanged when {@code autoDetect} is false even if detection
     * found a different port, because the flag — not the numeric value — is what records the
     * user's choice.
     */
    public static int effectivePort(boolean autoDetect, int storedPort, BbjInteropPortDetector.PortLookup lookup) {
        if (autoDetect) {
            return lookup.detected() ? lookup.port() : BbjInteropPortDetector.DEFAULT_PORT;
        }
        return sanitizePort(storedPort);
    }

    /**
     * The one-time upgrade inference applied when persisted state is loaded: true only when
     * {@code savedAutoDetect} is true <b>and</b> the saved port carries no signal, meaning it
     * equals {@link BbjInteropPortDetector#DEFAULT_PORT} or is not a valid port.
     *
     * <p>IntelliJ's serializer omits a field equal to its Java default, so an install saved before
     * the flag existed writes neither the flag nor a port of 5008. A saved port other than 5008 is
     * therefore the only evidence that such a user configured one deliberately, and that evidence
     * must win so their port is not silently replaced by detection.
     *
     * <p>What this rule cannot recover: a pre-flag user who deliberately typed 5008 is
     * indistinguishable on disk from one who never opened the dialog, and gains auto-detection.
     */
    public static boolean migratedAutoDetect(boolean savedAutoDetect, int savedPort) {
        boolean savedPortCarriesNoSignal = savedPort == BbjInteropPortDetector.DEFAULT_PORT || !isValidPort(savedPort);
        return savedAutoDetect && savedPortCarriesNoSignal;
    }

    /**
     * The port to persist to {@code BbjSettings.xml}: {@code storedPort} unchanged when
     * {@code autoDetect} is true, {@link #sanitizePort(int)} of {@code uiPort} otherwise. This is
     * what keeps auto-detection from ever writing a detected value into the persisted explicit
     * port: while the checkbox is on, the greyed field shows a detected number that must not be
     * mistaken for the user's choice.
     */
    public static int portToPersist(boolean autoDetect, int uiPort, int storedPort) {
        return autoDetect ? storedPort : sanitizePort(uiPort);
    }

    /**
     * Whether the Settings dialog should report itself modified: true when the flags differ, or
     * when the UI flag is off and the ports differ. The port comparison is deliberately skipped
     * while auto-detect is on in the dialog, because the greyed field tracks a detected value the
     * dialog never persists, and comparing it would make the settings page permanently claim to be
     * modified.
     */
    public static boolean portSettingModified(boolean storedAutoDetect, int storedPort, boolean uiAutoDetect,
            int uiPort) {
        if (storedAutoDetect != uiAutoDetect) {
            return true;
        }
        return !uiAutoDetect && storedPort != uiPort;
    }
}
