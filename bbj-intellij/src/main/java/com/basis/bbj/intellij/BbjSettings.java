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
}
