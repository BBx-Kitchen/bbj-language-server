package com.basis.bbj.intellij;

/**
 * The inline settings hint text shown under the java-interop Port field, one exact string per
 * detection state. No {@code com.intellij} import, following {@link
 * com.basis.bbj.intellij.config.ConfigReloadPresentation}'s platform-free presentation-seam
 * convention: plain statics, plain arguments, one class per presentation concern.
 *
 * <p>This class is an inline hint row, never a dialog, a balloon, or a validator warning; and
 * only the plugin's own strings plus a parsed integer ever reach it, never raw file content.
 */
public final class InteropPortPresentation {

    private InteropPortPresentation() {
    }

    /**
     * Returns the inline hint text for the given auto-detect state and detection result. With
     * auto-detect off, the row stays blank but keeps its height (a single space), the way the
     * Node.js version label does. With auto-detect on, the key and the default port are composed
     * from {@link BbjInteropPortDetector}'s own constants rather than repeated as literals, so a
     * change there cannot leave stale copy in the dialog.
     */
    public static String hint(boolean autoDetect, BbjInteropPortDetector.PortLookup lookup) {
        if (!autoDetect) {
            return " ";
        }
        if (lookup.detected()) {
            if (lookup.serviceDisabled()) {
                return "Detected from BBj.properties, but java-interop is disabled in BBjServices ("
                        + BbjInteropPortDetector.ADDR_KEY + ").";
            }
            return "Detected from BBj.properties (" + BbjInteropPortDetector.ADDR_KEY + ").";
        }
        return "Using the default " + BbjInteropPortDetector.DEFAULT_PORT
                + " — no port was found in BBj.properties.";
    }
}
