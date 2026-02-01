package com.basis.bbj.intellij;

import com.intellij.execution.configurations.GeneralCommandLine;
import com.intellij.execution.configurations.PathEnvironmentVariableUtil;
import com.intellij.execution.util.ExecUtil;
import org.jetbrains.annotations.NotNull;
import org.jetbrains.annotations.Nullable;

import java.io.File;
import java.nio.charset.StandardCharsets;

/**
 * Utility class for detecting Node.js on the system and validating its version.
 * Uses core IntelliJ Platform APIs (no dependency on JetBrains Node.js plugin).
 */
public final class BbjNodeDetector {

    private BbjNodeDetector() {
    }

    /**
     * Finds the {@code node} binary on the system PATH.
     *
     * @return absolute path to the node executable, or null if not found
     */
    public static @Nullable String detectNodePath() {
        File nodeFile = PathEnvironmentVariableUtil.findInPath("node");
        if (nodeFile != null && nodeFile.canExecute()) {
            return nodeFile.getAbsolutePath();
        }
        return null;
    }

    /**
     * Gets the Node.js version string by running {@code node --version}.
     *
     * @param nodePath absolute path to the node executable
     * @return version string (e.g., "v22.22.0"), or null on error
     */
    public static @Nullable String getNodeVersion(@NotNull String nodePath) {
        try {
            GeneralCommandLine cmd = new GeneralCommandLine(nodePath, "--version");
            cmd.withParentEnvironmentType(GeneralCommandLine.ParentEnvironmentType.CONSOLE);
            cmd.setCharset(StandardCharsets.UTF_8);
            String output = ExecUtil.execAndReadLine(cmd);
            return output != null ? output.trim() : null;
        } catch (Exception e) {
            return null;
        }
    }

    /**
     * Checks if the given version string represents Node.js >= 18.
     *
     * @param version version string starting with "v" (e.g., "v22.22.0")
     * @return true if major version is at least 18
     */
    public static boolean meetsMinimumVersion(@Nullable String version) {
        if (version == null || !version.startsWith("v")) {
            return false;
        }
        try {
            String[] parts = version.substring(1).split("\\.");
            int major = Integer.parseInt(parts[0]);
            return major >= 18;
        } catch (NumberFormatException e) {
            return false;
        }
    }
}
