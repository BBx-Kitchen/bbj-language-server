package com.basis.bbj.intellij;

/**
 * RED-phase stub — intentionally wrong return values so {@code InteropPortSettingsTest} fails
 * for the right reason before the real implementation lands.
 */
public final class InteropPortSettings {

    private InteropPortSettings() {
    }

    public static boolean isValidPort(int port) {
        return false;
    }

    public static int sanitizePort(int port) {
        return -1;
    }

    public static int effectivePort(boolean autoDetect, int storedPort, BbjInteropPortDetector.PortLookup lookup) {
        return -1;
    }

    public static boolean migratedAutoDetect(boolean savedAutoDetect, int savedPort) {
        return false;
    }

    public static int portToPersist(boolean autoDetect, int uiPort, int storedPort) {
        return -1;
    }

    public static boolean portSettingModified(boolean storedAutoDetect, int storedPort, boolean uiAutoDetect,
            int uiPort) {
        return false;
    }
}
