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
        public String javaInteropHost = "localhost";  // Default: localhost (resolves to 127.0.0.1)
        public int javaInteropPort = BbjInteropPortDetector.DEFAULT_PORT;  // Default: shared with BbjInteropPortDetector.DEFAULT_PORT
        public boolean javaInteropPortAutoDetect = true;  // Default: true; this flag, not the numeric value, records whether the port was chosen by the user
        public boolean javaInteropSettingsMigrated = false;  // Default: false; set true once the one-time upgrade inference below has run, so it never re-derives the flag from a later, unrelated port value
        public String configPath = "";  // Default: empty (uses {bbjHome}/cfg/config.bbx)
        public boolean autoSaveBeforeRun = true;  // Default: true (auto-save before run execution)
        public String emUrl = "";  // EM URL for web.bbj runner, defaults to empty (uses http://localhost:8888)
        public String compilerOutputDirectory = "";  // Default: empty (no output directory configured; #571)
    }

    private State myState = new State();

    public static BbjSettings getInstance() {
        return ApplicationManager.getApplication().getService(BbjSettings.class);
    }

    @Override
    public State getState() {
        // Auto-detect BBj Home on first access if not configured
        if (myState.bbjHomePath == null || myState.bbjHomePath.isEmpty()) {
            String detected = BbjHomeDetector.detectBbjHome();
            if (detected != null) {
                myState.bbjHomePath = detected;
            }
        }
        // Auto-detect Node.js path on first access if not configured
        if (myState.nodeJsPath == null || myState.nodeJsPath.isEmpty()) {
            String detected = BbjNodeDetector.detectNodePath();
            if (detected != null) {
                myState.nodeJsPath = detected;
            }
        }
        return myState;
    }

    @Override
    public void loadState(@NotNull State state) {
        // The one-time upgrade migration: applied here, before the incoming state is stored, so
        // every persisted install passes through this exactly once before any reader can ever
        // observe javaInteropPortAutoDetect. Gated on javaInteropSettingsMigrated so it runs
        // only for an install that has never seen it -- otherwise a later, unrelated stored port
        // (left behind by portToPersist while auto-detect is on) would be misread as evidence the
        // flag was a deliberate choice on every subsequent restart, silently undoing a legitimate
        // re-enable of auto-detect.
        if (!state.javaInteropSettingsMigrated) {
            state.javaInteropPortAutoDetect =
                    InteropPortSettings.migratedAutoDetect(state.javaInteropPortAutoDetect, state.javaInteropPort);
            state.javaInteropSettingsMigrated = true;
        }
        myState = state;
    }

    /**
     * The single answer every reader of the java-interop port shares: {@code
     * BbjLanguageServerFactory}'s initialization options, {@code BbjJavaInteropService}'s health
     * probe, and {@code BbjSettingsConfigurable#reset()} all call this method. Nothing outside
     * this class may read the raw {@link State#javaInteropPort} field for the effective value.
     *
     * <p>Resolves a {@link BbjInteropPortDetector.PortLookup} through the stat-keyed {@link
     * BbjInteropPortCache} only when auto-detect is on, so an explicit port performs not even a
     * stat.
     */
    public int getEffectiveJavaInteropPort() {
        State state = getState();
        BbjInteropPortDetector.PortLookup lookup = state.javaInteropPortAutoDetect
                ? BbjInteropPortCache.SESSION.lookup(state.bbjHomePath)
                : BbjInteropPortDetector.NOT_DETECTED;
        return InteropPortSettings.effectivePort(state.javaInteropPortAutoDetect, state.javaInteropPort, lookup);
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
