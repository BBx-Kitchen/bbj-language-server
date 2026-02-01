package com.basis.bbj.intellij;

import com.intellij.openapi.util.SystemInfo;
import org.jetbrains.annotations.NotNull;
import org.jetbrains.annotations.Nullable;

import java.io.BufferedReader;
import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Properties;

/**
 * Utility class for auto-detecting BBj installation directories.
 * Checks the BASIS installer trace file and common installation locations.
 */
public final class BbjHomeDetector {

    private BbjHomeDetector() {
    }

    /**
     * Auto-detect BBj home directory.
     * <ol>
     *   <li>Read {@code ~/BASIS/Install.properties} for {@code BBjDirectory} or {@code BASISInstallDirectory}</li>
     *   <li>Check common OS-specific installation locations</li>
     * </ol>
     *
     * @return absolute path to a valid BBj home, or null if not found
     */
    public static @Nullable String detectBbjHome() {
        // 1. Check ~/BASIS/Install.properties
        String fromInstaller = detectFromInstallerTrace();
        if (fromInstaller != null) {
            return fromInstaller;
        }

        // 2. Check common locations
        for (String path : getCommonLocations()) {
            if (isValidBbjHome(path)) {
                return path;
            }
        }

        return null;
    }

    /**
     * Validates a path as a BBj home directory by checking for {@code cfg/BBj.properties}.
     *
     * @param path directory to validate
     * @return true if the path contains cfg/BBj.properties
     */
    public static boolean isValidBbjHome(@NotNull String path) {
        return new File(path, "cfg/BBj.properties").exists();
    }

    private static @Nullable String detectFromInstallerTrace() {
        Path propsPath = Paths.get(System.getProperty("user.home"), "BASIS", "Install.properties");
        if (!Files.exists(propsPath)) {
            return null;
        }

        try (BufferedReader reader = Files.newBufferedReader(propsPath)) {
            Properties props = new Properties();
            props.load(reader);

            // Try BBjDirectory first, then BASISInstallDirectory
            String dir = props.getProperty("BBjDirectory");
            if (dir == null) {
                dir = props.getProperty("BASISInstallDirectory");
            }
            if (dir != null && isValidBbjHome(dir)) {
                return dir;
            }
        } catch (IOException e) {
            // ignore
        }

        return null;
    }

    private static String[] getCommonLocations() {
        if (SystemInfo.isWindows) {
            return new String[]{"C:\\bbx", "C:\\basis\\bbj"};
        }
        return new String[]{"/usr/local/bbx", "/opt/bbx", "/opt/basis/bbj"};
    }
}
