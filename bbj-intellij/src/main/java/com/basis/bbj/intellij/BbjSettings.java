package com.basis.bbj.intellij;

import com.intellij.openapi.application.ApplicationManager;
import com.intellij.openapi.components.PersistentStateComponent;
import com.intellij.openapi.components.State;
import com.intellij.openapi.components.Storage;
import org.jetbrains.annotations.NotNull;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

@State(
    name = "com.basis.bbj.intellij.BbjSettings",
    storages = @Storage("BbjSettings.xml")
)
public final class BbjSettings implements PersistentStateComponent<BbjSettings.State> {

    public static class State {
        public String bbjHomePath = "";
        public String nodeJsPath = "";
        public String classpathEntry = "";
        public String logLevel = "Info";  // Default: Info. Options: Error, Warn, Info, Debug
        public int javaInteropPort = 5008;  // Default: 5008 (matches language server DEFAULT_PORT)
    }

    private State myState = new State();

    public static BbjSettings getInstance() {
        return ApplicationManager.getApplication().getService(BbjSettings.class);
    }

    @Override
    public State getState() {
        return myState;
    }

    @Override
    public void loadState(@NotNull State state) {
        myState = state;
    }

    /**
     * Reads classpath entry names from {@code <bbjHomePath>/cfg/BBj.properties}.
     * Parses lines starting with {@code basis.classpath.} and extracts the key
     * name between {@code basis.classpath.} and {@code =}.
     *
     * @param bbjHomePath absolute path to the BBj installation directory
     * @return sorted list of classpath entry names, or empty list on error
     */
    public static List<String> getBBjClasspathEntries(@NotNull String bbjHomePath) {
        Path propertiesPath = Paths.get(bbjHomePath, "cfg", "BBj.properties");
        List<String> entries = new ArrayList<>();

        if (!Files.exists(propertiesPath)) {
            return entries;
        }

        try {
            List<String> lines = Files.readAllLines(propertiesPath, StandardCharsets.UTF_8);
            for (String line : lines) {
                String trimmed = line.trim();
                if (trimmed.startsWith("basis.classpath.")) {
                    int eqIndex = trimmed.indexOf('=');
                    if (eqIndex > 0) {
                        String key = trimmed.substring("basis.classpath.".length(), eqIndex);
                        entries.add(key);
                    }
                }
            }
        } catch (IOException e) {
            // Return empty list on error
        }

        Collections.sort(entries);
        return entries;
    }

    /**
     * Attempts to auto-detect the java-interop port from BBjServices configuration.
     * Searches BBj.properties for port configuration properties related to java-interop or bridge.
     *
     * @param bbjHomePath absolute path to the BBj installation directory
     * @return detected port number (1-65535), or 5008 if not found or any error occurs
     */
    public static int detectJavaInteropPort(@NotNull String bbjHomePath) {
        if (bbjHomePath == null || bbjHomePath.isEmpty()) {
            return 5008;
        }

        Path propertiesPath = Paths.get(bbjHomePath, "cfg", "BBj.properties");
        if (!Files.exists(propertiesPath)) {
            return 5008;
        }

        try {
            List<String> lines = Files.readAllLines(propertiesPath, StandardCharsets.UTF_8);
            for (String line : lines) {
                String trimmed = line.trim();
                // Skip comments and empty lines
                if (trimmed.isEmpty() || trimmed.startsWith("#")) {
                    continue;
                }

                // Search for java-interop or bridge port configuration
                // Patterns: basis.java.interop.port=, java.interop.port=, basis.bridge.port=
                if (trimmed.contains("java.interop.port=") || trimmed.contains("bridge.port=")) {
                    int eqIndex = trimmed.indexOf('=');
                    if (eqIndex > 0 && eqIndex < trimmed.length() - 1) {
                        String value = trimmed.substring(eqIndex + 1).trim();
                        try {
                            int port = Integer.parseInt(value);
                            // Validate port range
                            if (port >= 1 && port <= 65535) {
                                return port;
                            }
                        } catch (NumberFormatException e) {
                            // Invalid port value, continue searching
                        }
                    }
                }
            }
        } catch (IOException e) {
            // Return default on error - best-effort auto-detection
        }

        return 5008;
    }
}
