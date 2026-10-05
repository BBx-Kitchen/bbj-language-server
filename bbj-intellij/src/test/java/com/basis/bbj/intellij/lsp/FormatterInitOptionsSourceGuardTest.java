package com.basis.bbj.intellij.lsp;

import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.fail;
import static com.basis.bbj.intellij.lsp.JavaSourceScan.bodyOf;

/**
 * Source-guard fence for the {@code formatter} initialization option: the factory attaches it once
 * and before the options are handed over, the seam stays free of IntelliJ platform imports, the
 * persisted state declares each of the 15 fields once, and the language client's flat settings
 * object (a channel that never reaches the server) carries none of them.
 */
class FormatterInitOptionsSourceGuardTest {

    private static final Path BBJ_SETTINGS_SOURCE = Paths.get(
            "src", "main", "java", "com", "basis", "bbj", "intellij", "BbjSettings.java")
            .toAbsolutePath();

    private static final Path BBJ_LANGUAGE_SERVER_FACTORY_SOURCE = Paths.get(
            "src", "main", "java", "com", "basis", "bbj", "intellij", "lsp",
            "BbjLanguageServerFactory.java")
            .toAbsolutePath();

    private static final Path BBJ_LANGUAGE_CLIENT_SOURCE = Paths.get(
            "src", "main", "java", "com", "basis", "bbj", "intellij", "lsp", "BbjLanguageClient.java")
            .toAbsolutePath();

    private static final Path FORMATTER_INIT_OPTIONS_SOURCE = Paths.get(
            "src", "main", "java", "com", "basis", "bbj", "intellij", "lsp",
            "FormatterInitOptions.java")
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

    private static int countMatches(String text, String regex) {
        Matcher matcher = Pattern.compile(regex).matcher(text);
        int count = 0;
        while (matcher.find()) {
            count++;
        }
        return count;
    }

    @Test
    void theFactoryAttachesTheFormatterObjectOnceBeforeHandingOverTheOptions() {
        String text = readSource(BBJ_LANGUAGE_SERVER_FACTORY_SOURCE);
        assertEquals(1, countOccurrences(text, "FormatterInitOptions.FORMATTER_KEY"),
                "BbjLanguageServerFactory must add the formatter object exactly once");
        assertEquals(1, countOccurrences(text, "params.setInitializationOptions(options)"),
                "the initialization options object must be handed over exactly once");
        int attachIndex = text.indexOf("FormatterInitOptions.FORMATTER_KEY");
        int handOverIndex = text.indexOf("params.setInitializationOptions(options)");
        assertTrue(attachIndex < handOverIndex,
                "the formatter object must be added before the initialization options are handed over");
    }

    @Test
    void theSeamHasNoIntellijImport() {
        String text = readSource(FORMATTER_INIT_OPTIONS_SOURCE);
        assertEquals(0, countOccurrences(text, "import com.intellij"),
                "FormatterInitOptions must have no IntelliJ platform import");
        // The only allowed link to the platform-bound settings class is its nested plain-data
        // State; any other use of BbjSettings would pull the application service into the seam.
        String withoutImport = text.replace("import com.basis.bbj.intellij.BbjSettings;", "");
        assertEquals(0, countMatches(withoutImport, "BbjSettings\\b(?!\\.State\\b)"),
                "FormatterInitOptions may reference BbjSettings.State only, never BbjSettings itself");
    }

    @Test
    void bbjSettingsDeclaresEachFormatterFieldOnce() {
        String text = readSource(BBJ_SETTINGS_SOURCE);
        for (String key : FormatterInitOptions.KEYS) {
            String field = "formatter" + Character.toUpperCase(key.charAt(0)) + key.substring(1);
            int declarations = 0;
            for (String type : new String[] {"int", "boolean", "String"}) {
                declarations += countOccurrences(text, "public " + type + " " + field + " ");
            }
            assertEquals(1, declarations,
                    "BbjSettings.State must declare " + field + " exactly once as a public field");
        }
    }

    @Test
    void theLanguageClientCarriesNoFormatterSetting() {
        String text = readSource(BBJ_LANGUAGE_CLIENT_SOURCE);
        String body = bodyOf(text, "public @Nullable Object createSettings()");
        assertEquals(0, countOccurrences(body.toLowerCase(), "formatter"),
                "createSettings() must not carry formatter settings: that channel never reaches the server");
    }
}
