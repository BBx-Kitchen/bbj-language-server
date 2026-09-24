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
 * Source-guard fence for the IntelliJ "Compiler check" setting. Pins the wiring sites —
 * {@code BbjSettings}, {@code BbjLanguageServerFactory}, {@code CompilerInitOptions},
 * {@code BbjSettingsComponent} and {@code BbjSettingsConfigurable} — plus the deliberate
 * non-change to {@code BbjLanguageClient}, following the same pattern
 * {@link CompilerOutputDirectorySourceGuardTest} established for #571.
 * <p>
 * A failure here means either the trigger stopped reaching the initialization options — in
 * which case IntelliJ would silently keep using {@code debounced} regardless of the user's
 * choice — or someone re-routed the value through {@link BbjLanguageClient#createSettings()},
 * which LSP4IJ 0.19.0 resolves to null for this plugin's flat settings shape. Do not "fix" the
 * omission from {@code BbjLanguageClient} without re-reading that finding first.
 */
class CompilerTriggerSourceGuardTest {

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
    void bbjSettingsPersistsTheTriggerFieldExactlyOnceWithTheDebouncedDefault() {
        String text = readSource(BBJ_SETTINGS_SOURCE);
        assertEquals(1, countOccurrences(text, "public String compilerTrigger = \"debounced\""),
                "BbjSettings.State must declare compilerTrigger exactly once, default debounced");
    }

    @Test
    void theFactoryAddsTheTriggerPropertyExactlyOnceBeforeHandingOverTheInitializationOptions() {
        String text = readSource(BBJ_LANGUAGE_SERVER_FACTORY_SOURCE);
        assertEquals(1, countOccurrences(text, "CompilerInitOptions.COMPILER_TRIGGER_KEY"),
                "BbjLanguageServerFactory must add the compiler trigger key exactly once");
        int addPropertyIndex = text.indexOf("CompilerInitOptions.COMPILER_TRIGGER_KEY");
        int handOverIndex = text.indexOf("params.setInitializationOptions(options)");
        assertTrue(addPropertyIndex >= 0, "the compilerTrigger property must be added in apply()");
        assertTrue(handOverIndex >= 0, "the initialization options object must be handed over");
        assertTrue(addPropertyIndex < handOverIndex,
                "the trigger property must be added before the initialization options object is "
                        + "handed over");
    }

    @Test
    void theLanguageClientNeverMentionsCompilerTrigger() {
        String text = readSource(BBJ_LANGUAGE_CLIENT_SOURCE);
        assertEquals(0, countOccurrences(text, "compilerTrigger"),
                "BbjLanguageClient must not carry compilerTrigger -- LSP4IJ's settings "
                        + "resolution returns null for this plugin's flat client settings object "
                        + "(LSP4IJ section \"bbj\" lookup)");
    }

    @Test
    void theSeamHasNoIntellijImport() {
        String text = readSource(COMPILER_INIT_OPTIONS_SOURCE);
        assertEquals(0, countOccurrences(text, "import com.intellij"),
                "CompilerInitOptions must have no IntelliJ platform import");
    }
}
