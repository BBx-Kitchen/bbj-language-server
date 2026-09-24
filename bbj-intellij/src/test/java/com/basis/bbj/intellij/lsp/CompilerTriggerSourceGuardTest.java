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

    @Test
    void theComponentDeclaresOneCompilerCheckRowBetweenOutputDirectoryAndNodeJsRuntime() {
        String text = readSource(BBJ_SETTINGS_COMPONENT_SOURCE);
        assertTrue(text.contains("compilerTriggerCombo"),
                "BbjSettingsComponent must declare compilerTriggerCombo");
        assertEquals(1, countOccurrences(text, "CompilerInitOptions.TRIGGER_DISPLAY_NAMES"),
                "the combo must be built from CompilerInitOptions.TRIGGER_DISPLAY_NAMES");
        assertEquals(1, countOccurrences(text, "new JBLabel(\"Compiler check:\")"),
                "exactly one \"Compiler check:\" row must be declared");
        int outputDirRowIndex = text.indexOf("new JBLabel(\"Compile output directory:\")");
        int compilerCheckRowIndex = text.indexOf("new JBLabel(\"Compiler check:\")");
        int nodeJsSeparatorIndex = text.indexOf("new TitledSeparator(\"Node.js Runtime\")");
        assertTrue(outputDirRowIndex >= 0, "the Compile output directory row must be present");
        assertTrue(compilerCheckRowIndex >= 0, "the Compiler check row must be present");
        assertTrue(nodeJsSeparatorIndex >= 0, "the Node.js Runtime separator must be present");
        assertTrue(outputDirRowIndex < compilerCheckRowIndex,
                "the Compiler check row must come after the Compile output directory row");
        assertTrue(compilerCheckRowIndex < nodeJsSeparatorIndex,
                "the Compiler check row must come before the Node.js Runtime separator");
    }

    @Test
    void theConfigurableReadsGetCompilerTriggerTwiceAndAssignsStateBeforeTheRestart() {
        String text = readSource(BBJ_SETTINGS_CONFIGURABLE_SOURCE);
        assertEquals(2, countOccurrences(text, "getCompilerTrigger()"),
                "isModified and apply must both read getCompilerTrigger()");
        assertEquals(1, countOccurrences(text, "setCompilerTrigger("),
                "reset must call setCompilerTrigger( exactly once");
        int assignIndex = text.indexOf("state.compilerTrigger = myComponent.getCompilerTrigger()");
        int restartIndex = text.indexOf("scheduleRestart()");
        assertTrue(assignIndex >= 0, "the compilerTrigger assignment must be present in apply()");
        assertTrue(restartIndex >= 0, "scheduleRestart() must be present in apply()");
        assertTrue(assignIndex < restartIndex,
                "the trigger value must be stored before the restart that re-delivers it as "
                        + "fresh initialization options");
    }
}
