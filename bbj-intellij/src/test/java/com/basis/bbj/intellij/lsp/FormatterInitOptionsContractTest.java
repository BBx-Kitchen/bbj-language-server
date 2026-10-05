package com.basis.bbj.intellij.lsp;

import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.fail;

/**
 * Cross-language contract for the {@code formatter} object IntelliJ sends in its
 * {@code initializationOptions}: the 15 key names and their order, the defaults, the allowed values
 * of the six choice settings and the indent width bounds must equal what the language server
 * whitelists in {@code bbj-format-settings.ts} and what the VS Code extension declares under
 * {@code bbj.formatter.*} in {@code package.json}. A change on either side alone fails here instead
 * of surfacing as a formatter request the server rejects. Both sources are read only as plain text.
 */
class FormatterInitOptionsContractTest {

    private static final Path FORMAT_SETTINGS_TS = Paths.get(
        "..", "bbj-vscode", "src", "language", "bbj-format-settings.ts")
        .toAbsolutePath().normalize();

    private static final Path PACKAGE_JSON = Paths.get(
        "..", "bbj-vscode", "package.json")
        .toAbsolutePath().normalize();

    private static String readSource(Path path) {
        if (!Files.exists(path)) {
            fail("Source not found at " + path);
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

    /** The text between {@code from} and the first following {@code to}, exclusive. */
    private static String between(String text, String from, String to) {
        int start = text.indexOf(from);
        assertTrue(start >= 0, "marker not found: " + from);
        int end = text.indexOf(to, start + from.length());
        assertTrue(end > start, "closing marker not found after " + from + ": " + to);
        return text.substring(start + from.length(), end);
    }

    private static JsonObject configurationProperties() {
        JsonObject root = JsonParser.parseString(readSource(PACKAGE_JSON)).getAsJsonObject();
        return root.getAsJsonObject("contributes")
            .getAsJsonObject("configuration")
            .getAsJsonObject("properties");
    }

    private static JsonObject property(String key) {
        JsonObject entry = configurationProperties().getAsJsonObject("bbj.formatter." + key);
        assertNotNull(entry, "package.json declares no bbj.formatter." + key);
        return entry;
    }

    /** The default as the TypeScript source spells it: a number, false, or a single-quoted string. */
    private static String tsLiteral(Object value) {
        return value instanceof String ? "'" + value + "'" : String.valueOf(value);
    }

    private static Map<String, Object> defaultsByKey() {
        FormatterInitOptions.Values d = FormatterInitOptions.DEFAULTS;
        return Map.ofEntries(
            Map.entry("indentWidth", d.indentWidth()),
            Map.entry("indentCharacter", d.indentCharacter()),
            Map.entry("keywordsToUppercase", d.keywordsToUppercase()),
            Map.entry("removeLineContinuation", d.removeLineContinuation()),
            Map.entry("splitSingleLineIf", d.splitSingleLineIf()),
            Map.entry("splitInlineComments", d.splitInlineComments()),
            Map.entry("splitInlineLabelComment", d.splitInlineLabelComment()),
            Map.entry("collapseMultiLine", d.collapseMultiLine()),
            Map.entry("eolCharacter", d.eolCharacter()),
            Map.entry("ifClosingKeyword", d.ifClosingKeyword()),
            Map.entry("ifKeywordCase", d.ifKeywordCase()),
            Map.entry("parameterLayout", d.parameterLayout()),
            Map.entry("operatorSpacing", d.operatorSpacing()),
            Map.entry("indentLabelBlocks", d.indentLabelBlocks()),
            Map.entry("blankLineAfterReturn", d.blankLineAfterReturn()));
    }

    @Test
    void theFifteenKeysMatchTheServersListInOrder() {
        String ts = readSource(FORMAT_SETTINGS_TS);
        String block = between(ts, "FORMATTER_SETTING_KEYS: readonly FormatterSettingKey[] = Object.freeze([",
            "] as FormatterSettingKey[]");
        List<String> serverKeys = new ArrayList<>();
        Matcher matcher = Pattern.compile("'([A-Za-z]+)'").matcher(block);
        while (matcher.find()) {
            serverKeys.add(matcher.group(1));
        }
        assertEquals(15, serverKeys.size(), "the server's key list no longer has 15 entries");
        assertEquals(serverKeys, FormatterInitOptions.KEYS,
            "FormatterInitOptions.KEYS must equal FORMATTER_SETTING_KEYS, same names in the same order");
    }

    @Test
    void eachDefaultMatchesTheServersDefault() {
        String ts = readSource(FORMAT_SETTINGS_TS);
        String block = between(ts, "FORMATTER_DEFAULTS: Readonly<Record<FormatterSettingKey, FormatSettingValue>> = Object.freeze({",
            "});");
        Map<String, Object> defaults = defaultsByKey();
        assertEquals(15, defaults.size());
        for (String key : FormatterInitOptions.KEYS) {
            Matcher matcher = Pattern.compile("(?m)^\\s*" + key + ":\\s*([^,\\r\\n]+),?\\s*$").matcher(block);
            assertTrue(matcher.find(), "FORMATTER_DEFAULTS has no entry for " + key);
            assertEquals(tsLiteral(defaults.get(key)), matcher.group(1).trim(),
                "default of " + key + " differs from FORMATTER_DEFAULTS");
        }
    }

    @Test
    void eachChoiceListMatchesThePackageJsonEnum() {
        Map<String, List<String>> choices = Map.of(
            "indentCharacter", FormatterInitOptions.INDENT_CHARACTER_VALUES,
            "eolCharacter", FormatterInitOptions.EOL_CHARACTER_VALUES,
            "ifClosingKeyword", FormatterInitOptions.IF_CLOSING_KEYWORD_VALUES,
            "ifKeywordCase", FormatterInitOptions.IF_KEYWORD_CASE_VALUES,
            "parameterLayout", FormatterInitOptions.PARAMETER_LAYOUT_VALUES,
            "operatorSpacing", FormatterInitOptions.OPERATOR_SPACING_VALUES);
        assertEquals(6, choices.size());
        for (Map.Entry<String, List<String>> choice : choices.entrySet()) {
            JsonObject entry = property(choice.getKey());
            JsonArray enumValues = entry.getAsJsonArray("enum");
            assertNotNull(enumValues, "bbj.formatter." + choice.getKey() + " declares no enum");
            List<String> declared = new ArrayList<>();
            for (JsonElement element : enumValues) {
                declared.add(element.getAsString());
            }
            assertEquals(declared, choice.getValue(),
                "allowed values of " + choice.getKey() + " differ from the package.json enum");
            assertEquals(choice.getValue().get(0), entry.get("default").getAsString(),
                "the first allowed value of " + choice.getKey() + " must be the package.json default");
        }
    }

    @Test
    void indentWidthBoundsMatchThePackageJson() {
        JsonObject entry = property("indentWidth");
        assertEquals(FormatterInitOptions.INDENT_WIDTH_MIN, entry.get("minimum").getAsInt());
        assertEquals(FormatterInitOptions.INDENT_WIDTH_MAX, entry.get("maximum").getAsInt());
        assertEquals(FormatterInitOptions.INDENT_WIDTH_DEFAULT, entry.get("default").getAsInt());
        assertEquals(0, FormatterInitOptions.INDENT_WIDTH_MIN);
        assertEquals(16, FormatterInitOptions.INDENT_WIDTH_MAX);
        assertEquals(2, FormatterInitOptions.INDENT_WIDTH_DEFAULT);
    }

    @Test
    void theBooleanDefaultsMatchThePackageJson() {
        Map<String, Object> defaults = defaultsByKey();
        for (String key : FormatterInitOptions.KEYS) {
            Object value = defaults.get(key);
            if (value instanceof Boolean) {
                assertEquals(value, property(key).get("default").getAsBoolean(),
                    "default of " + key + " differs from the package.json default");
            }
        }
    }

    @Test
    void theDeprecatedAliasIsNotAKey() {
        for (String key : FormatterInitOptions.KEYS) {
            if (key.equalsIgnoreCase("splitSingleLineIf")) {
                assertEquals("splitSingleLineIf", key,
                    "only the lower-case-f spelling may be sent; the capital IF spelling is a VS Code alias");
            }
        }
        assertFalse(FormatterInitOptions.KEYS.contains("splitSingleLineIF"));
    }
}
