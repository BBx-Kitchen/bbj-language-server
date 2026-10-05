package com.basis.bbj.intellij;

import com.basis.bbj.intellij.lsp.FormatterInitOptions;
import com.google.gson.JsonArray;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.fail;

/**
 * Contract between the IntelliJ formatter tooltips and the VS Code extension's {@code package.json}:
 * every tooltip carries the {@code bbj.formatter.*} description with the VS Code markup removed, and
 * a choice setting's tooltip also carries every allowed value with its description. A change on
 * either side alone fails here.
 */
class FormatterSettingTextsContractTest {

    private static final Path PACKAGE_JSON = Paths.get("..", "bbj-vscode", "package.json")
            .toAbsolutePath().normalize();

    private static final List<String> CHOICE_KEYS = List.of(
            "indentCharacter", "ifClosingKeyword", "ifKeywordCase", "parameterLayout", "operatorSpacing",
            "eolCharacter");

    private static JsonObject property(String key) {
        if (!Files.exists(PACKAGE_JSON)) {
            fail("package.json not found at " + PACKAGE_JSON);
        }
        String text;
        try {
            text = Files.readString(PACKAGE_JSON);
        } catch (IOException e) {
            throw new IllegalStateException("Failed to read " + PACKAGE_JSON, e);
        }
        JsonObject entry = JsonParser.parseString(text).getAsJsonObject()
                .getAsJsonObject("contributes")
                .getAsJsonObject("configuration")
                .getAsJsonObject("properties")
                .getAsJsonObject("bbj.formatter." + key);
        assertNotNull(entry, "package.json declares no bbj.formatter." + key);
        return entry;
    }

    /** The VS Code description of a setting: markdownDescription when present, else description. */
    private static String rawDescription(JsonObject entry) {
        if (entry.has("markdownDescription")) {
            return entry.get("markdownDescription").getAsString();
        }
        return entry.get("description").getAsString();
    }

    /** Drops backticks and turns a {@code #bbj.formatter.<name>#} link into {@code <name>}. */
    private static String stripMarkup(String text) {
        return text.replaceAll("#bbj\\.formatter\\.([A-Za-z]+)#", "$1").replace("`", "");
    }

    private static String escapeHtml(String text) {
        return text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;");
    }

    @Test
    void everyTooltipCarriesTheStrippedVsCodeDescription() {
        for (String key : FormatterInitOptions.KEYS) {
            String description = stripMarkup(rawDescription(property(key)));
            String tooltip = FormatterSettingTexts.tooltip(key);
            String expected = CHOICE_KEYS.contains(key) ? escapeHtml(description) : description;
            assertTrue(tooltip.contains(expected),
                    key + ": the tooltip must carry the package.json description \"" + description + "\"");
        }
    }

    @Test
    void everyChoiceTooltipListsEachValueWithItsDescription() {
        for (String key : CHOICE_KEYS) {
            assertTrue(FormatterInitOptions.KEYS.contains(key), key + " must be a formatter key");
            JsonObject entry = property(key);
            JsonArray values = entry.getAsJsonArray("enum");
            JsonArray descriptions = entry.getAsJsonArray("enumDescriptions");
            assertNotNull(descriptions, key + " must have enumDescriptions in package.json");
            assertEquals(values.size(), descriptions.size(), key + ": one description per value");
            String tooltip = FormatterSettingTexts.tooltip(key);
            assertTrue(tooltip.startsWith("<html>") && tooltip.endsWith("</html>"),
                    key + ": a choice tooltip is HTML");
            for (int i = 0; i < values.size(); i++) {
                String line = "<br>" + escapeHtml(values.get(i).getAsString()) + ": "
                        + escapeHtml(stripMarkup(descriptions.get(i).getAsString()));
                assertTrue(tooltip.contains(line), key + ": the tooltip must carry the line " + line);
            }
        }
    }

    @Test
    void noTooltipCarriesVsCodeMarkup() {
        for (String key : FormatterInitOptions.KEYS) {
            String tooltip = FormatterSettingTexts.tooltip(key);
            assertFalse(tooltip.isEmpty(), key + " must have a tooltip");
            assertFalse(tooltip.contains("#bbj.formatter."), key + ": no VS Code setting link");
            assertFalse(tooltip.contains("`"), key + ": no backtick");
        }
    }

    @Test
    void anUnknownKeyHasNoTooltip() {
        assertEquals("", FormatterSettingTexts.tooltip("splitSingleLineIF"));
        assertEquals("", FormatterSettingTexts.tooltip("noSuchSetting"));
    }

    @Test
    void theNoteSaysWhenValuesApplyAndNamesTheLineEndingLimitation() {
        String note = FormatterSettingTexts.RESTART_NOTE;
        assertTrue(note.startsWith("These settings apply after the language server restarts. "
                + "Apply restarts it automatically."), "the note must say when the values apply");
        assertTrue(note.contains("Line ending CRLF stops formatting entirely"),
                "the note must name the CRLF limitation plainly");
        assertTrue(note.contains("lsp4ij issue #381"), "the note must name the upstream issue");
        assertTrue(note.endsWith("so leave it at KEEP."), "the note must recommend KEEP");
    }
}
