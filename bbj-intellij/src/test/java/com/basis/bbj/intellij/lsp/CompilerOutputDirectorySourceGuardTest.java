package com.basis.bbj.intellij.lsp;

import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.fail;

/**
 * Source-guard fence for the "Compile output directory" setting (#571, PARITY-01). Pins all four
 * wiring sites — {@code BbjSettings}, {@code BbjSettingsComponent}, {@code BbjSettingsConfigurable}
 * and {@code BbjLanguageServerFactory} — plus the deliberate non-change to
 * {@code BbjLanguageClient}.
 * <p>
 * A failure here means either the setting stopped reaching the initialization options — in which
 * case the compile action would refuse on every invocation with no visible cause — or someone
 * re-routed the value through {@link BbjLanguageClient#createSettings()}, which LSP4IJ 0.19.0
 * resolves to null for this plugin's flat settings shape (RESEARCH.md Pitfall 2). Do not "fix" the
 * omission from {@code BbjLanguageClient} without re-reading that finding first.
 */
class CompilerOutputDirectorySourceGuardTest {

    private static final Path BBJ_SETTINGS_SOURCE = Paths.get(
            "src", "main", "java", "com", "basis", "bbj", "intellij", "BbjSettings.java")
            .toAbsolutePath();

    private static final Path BBJ_SETTINGS_COMPONENT_SOURCE = Paths.get(
            "src", "main", "java", "com", "basis", "bbj", "intellij", "BbjSettingsComponent.java")
            .toAbsolutePath();

    private static final Path BBJ_SETTINGS_CONFIGURABLE_SOURCE = Paths.get(
            "src", "main", "java", "com", "basis", "bbj", "intellij", "BbjSettingsConfigurable.java")
            .toAbsolutePath();

    private static final Path BBJ_LANGUAGE_SERVER_FACTORY_SOURCE = Paths.get(
            "src", "main", "java", "com", "basis", "bbj", "intellij", "lsp",
            "BbjLanguageServerFactory.java")
            .toAbsolutePath();

    private static final Path BBJ_LANGUAGE_CLIENT_SOURCE = Paths.get(
            "src", "main", "java", "com", "basis", "bbj", "intellij", "lsp", "BbjLanguageClient.java")
            .toAbsolutePath();

    private static final Path COMPILER_INIT_OPTIONS_SOURCE = Paths.get(
            "src", "main", "java", "com", "basis", "bbj", "intellij", "lsp",
            "CompilerInitOptions.java")
            .toAbsolutePath();

    private static String readSource(Path path) {
        if (!Files.exists(path)) {
            fail("Guarded source file not found at " + path);
        }
        try {
            return Files.readString(path);
        } catch (IOException e) {
            throw new UncheckedIOExceptionForTest(path, e);
        }
    }

    private static final class UncheckedIOExceptionForTest extends RuntimeException {
        UncheckedIOExceptionForTest(Path resolved, IOException cause) {
            super("Failed to read " + resolved, cause);
        }
    }

    private static int countOccurrences(String text, String literal) {
        int count = 0;
        int index = 0;
        while ((index = text.indexOf(literal, index)) != -1) {
            count++;
            index += literal.length();
        }
        return count;
    }

    @Test
    void bbjSettingsPersistsTheFieldExactlyOnce() {
        String text = readSource(BBJ_SETTINGS_SOURCE);
        assertEquals(1, countOccurrences(text, "public String compilerOutputDirectory"),
                "BbjSettings.State must declare compilerOutputDirectory exactly once");
    }

    @Test
    void bbjSettingsComponentOffersADirectoryChooserAlongsideBbjHome() {
        String text = readSource(BBJ_SETTINGS_COMPONENT_SOURCE);
        assertTrue(text.contains("compilerOutputDirectoryField"),
                "BbjSettingsComponent must declare compilerOutputDirectoryField");
        assertEquals(2, countOccurrences(text, "createSingleFolderDescriptor"),
                "the BBj home field and the new compiler output field must both use "
                        + "createSingleFolderDescriptor");
    }

    @Test
    void bbjSettingsConfigurableCarriesTheFieldThroughIsModifiedApplyAndReset() {
        String text = readSource(BBJ_SETTINGS_CONFIGURABLE_SOURCE);
        assertEquals(2, countOccurrences(text, "getCompilerOutputDirectory()"),
                "isModified and apply must both read getCompilerOutputDirectory()");
        assertEquals(1, countOccurrences(text, "setCompilerOutputDirectory("),
                "reset must call setCompilerOutputDirectory( exactly once");
    }

    @Test
    void theValueIsStoredBeforeTheRestartThatReDeliversIt() {
        String text = readSource(BBJ_SETTINGS_CONFIGURABLE_SOURCE);
        int assignIndex = text.indexOf(
                "state.compilerOutputDirectory = myComponent.getCompilerOutputDirectory()");
        int restartIndex = text.indexOf("scheduleRestart()");
        assertTrue(assignIndex >= 0,
                "the compilerOutputDirectory assignment must be present in apply()");
        assertTrue(restartIndex >= 0, "scheduleRestart() must be present in apply()");
        assertTrue(assignIndex < restartIndex,
                "the value must be stored before the restart that re-delivers it as fresh "
                        + "initialization options");
    }

    @Test
    void theFactoryAddsThePropertyBeforeHandingOverTheInitializationOptions() {
        String text = readSource(BBJ_LANGUAGE_SERVER_FACTORY_SOURCE);
        assertEquals(1, countOccurrences(text, "CompilerInitOptions.COMPILER_OUTPUT_DIRECTORY_KEY"),
                "BbjLanguageServerFactory must add the compiler output directory key exactly once");
        assertEquals(1, countOccurrences(text, "params.setInitializationOptions(options)"),
                "the initialization options object must be handed over exactly once");
        int addPropertyIndex = text.indexOf("CompilerInitOptions.COMPILER_OUTPUT_DIRECTORY_KEY");
        int handOverIndex = text.indexOf("params.setInitializationOptions(options)");
        assertTrue(addPropertyIndex < handOverIndex,
                "the property must be added before the initialization options object is handed "
                        + "over");
        assertTrue(text.contains("return BbjComposerServer.class;"),
                "getServerInterface() must be untouched by this plan — 81-05 owns the server "
                        + "interface");
    }

    @Test
    void theLanguageClientStaysUnchangedBecauseThatChannelNeverReachesTheServer() {
        String text = readSource(BBJ_LANGUAGE_CLIENT_SOURCE);
        assertEquals(0, countOccurrences(text, "compilerOutputDirectory"),
                "BbjLanguageClient must not carry compilerOutputDirectory — LSP4IJ's settings "
                        + "resolution returns null for this plugin's flat client settings object "
                        + "(RESEARCH.md Pitfall 2)");
        assertEquals(1, countOccurrences(text, "settings.addProperty(\"home\""),
                "createSettings() must still add exactly the pre-existing three properties");
        assertEquals(1, countOccurrences(text, "settings.addProperty(\"classpath\""),
                "createSettings() must still add exactly the pre-existing three properties");
        assertEquals(1, countOccurrences(text, "settings.addProperty(\"logLevel\""),
                "createSettings() must still add exactly the pre-existing three properties");
    }

    @Test
    void theSeamHasNoIntellijImport() {
        String text = readSource(COMPILER_INIT_OPTIONS_SOURCE);
        assertEquals(0, countOccurrences(text, "import com.intellij"),
                "CompilerInitOptions must have no IntelliJ platform import (C-01)");
    }
}
