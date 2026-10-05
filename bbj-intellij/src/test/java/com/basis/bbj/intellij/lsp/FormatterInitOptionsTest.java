package com.basis.bbj.intellij.lsp;

import com.basis.bbj.intellij.BbjSettings;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonPrimitive;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.function.BiConsumer;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class FormatterInitOptionsTest {

    /** One choice setting: its key, how to set it on a persisted state, and its allowed values. */
    private record Choice(String key, BiConsumer<BbjSettings.State, String> setter, List<String> allowed) {
    }

    private static final List<Choice> CHOICES = List.of(
        new Choice("indentCharacter", (s, v) -> s.formatterIndentCharacter = v,
            FormatterInitOptions.INDENT_CHARACTER_VALUES),
        new Choice("eolCharacter", (s, v) -> s.formatterEolCharacter = v,
            FormatterInitOptions.EOL_CHARACTER_VALUES),
        new Choice("ifClosingKeyword", (s, v) -> s.formatterIfClosingKeyword = v,
            FormatterInitOptions.IF_CLOSING_KEYWORD_VALUES),
        new Choice("ifKeywordCase", (s, v) -> s.formatterIfKeywordCase = v,
            FormatterInitOptions.IF_KEYWORD_CASE_VALUES),
        new Choice("parameterLayout", (s, v) -> s.formatterParameterLayout = v,
            FormatterInitOptions.PARAMETER_LAYOUT_VALUES),
        new Choice("operatorSpacing", (s, v) -> s.formatterOperatorSpacing = v,
            FormatterInitOptions.OPERATOR_SPACING_VALUES));

    private static final List<String> BOOLEAN_KEYS = List.of(
        "keywordsToUppercase", "removeLineContinuation", "splitSingleLineIf", "splitInlineComments",
        "splitInlineLabelComment", "collapseMultiLine", "indentLabelBlocks", "blankLineAfterReturn");

    private static List<String> keysOf(JsonObject json) {
        return new ArrayList<>(json.keySet());
    }

    private static JsonObject sentBy(BbjSettings.State state) {
        return FormatterInitOptions.toJson(FormatterInitOptions.fromState(state));
    }

    private static Map<String, Object> expectedDefaults() {
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

    private static FormatterInitOptions.Values withChoices(String choice) {
        return new FormatterInitOptions.Values(
            FormatterInitOptions.INDENT_WIDTH_DEFAULT, choice, false, false, false, false, false, false,
            choice, choice, choice, choice, choice, false, false);
    }

    @Test
    void theWireKeyIsFormatter() {
        assertEquals("formatter", FormatterInitOptions.FORMATTER_KEY);
    }

    @Test
    void aDefaultStateSendsAllFifteenKeysWithTheirDefaults() {
        JsonObject json = sentBy(new BbjSettings.State());

        assertEquals(15, json.size(), "the object must carry exactly 15 members");
        assertEquals(FormatterInitOptions.KEYS, keysOf(json), "the keys must follow the server's order");
        Map<String, Object> expected = expectedDefaults();
        for (String key : FormatterInitOptions.KEYS) {
            JsonPrimitive value = json.get(key).getAsJsonPrimitive();
            Object want = expected.get(key);
            if (want instanceof Integer number) {
                assertEquals(number.intValue(), value.getAsInt(), key);
            } else if (want instanceof Boolean flag) {
                assertEquals(flag.booleanValue(), value.getAsBoolean(), key);
            } else {
                assertEquals(want, value.getAsString(), key);
            }
        }
        assertEquals(2, json.get("indentWidth").getAsInt());
    }

    @Test
    void nullBlankAndUnknownChoicesFallBackToTheDefault() {
        for (Choice choice : CHOICES) {
            String fallback = choice.allowed().get(0);
            String lowerCase = choice.allowed().get(choice.allowed().size() - 1).toLowerCase();
            String[] bad = {null, "", "   ", lowerCase, "BOGUS"};
            for (String raw : bad) {
                BbjSettings.State state = new BbjSettings.State();
                choice.setter().accept(state, raw);
                assertEquals(fallback, sentBy(state).get(choice.key()).getAsString(),
                    choice.key() + " set to " + raw + " must fall back to " + fallback);
            }
        }
        BbjSettings.State padded = new BbjSettings.State();
        padded.formatterIndentCharacter = " TAB ";
        assertEquals("TAB", sentBy(padded).get("indentCharacter").getAsString());
    }

    @Test
    void indentWidthKeepsTheBoundsAndResetsOutOfRangeValuesToTwo() {
        int[] keep = {0, 1, 4, 16};
        for (int width : keep) {
            BbjSettings.State state = new BbjSettings.State();
            state.formatterIndentWidth = width;
            assertEquals(width, sentBy(state).get("indentWidth").getAsInt());
        }
        int[] reset = {-1, 17, Integer.MIN_VALUE, Integer.MAX_VALUE};
        for (int width : reset) {
            BbjSettings.State state = new BbjSettings.State();
            state.formatterIndentWidth = width;
            assertEquals(2, sentBy(state).get("indentWidth").getAsInt(),
                "indentWidth " + width + " must reset to 2");
        }
    }

    @Test
    void theNormalizersApplyTheSameRulesDirectly() {
        assertEquals(0, FormatterInitOptions.normalizeIndentWidth(0));
        assertEquals(16, FormatterInitOptions.normalizeIndentWidth(16));
        assertEquals(2, FormatterInitOptions.normalizeIndentWidth(-1));
        assertEquals(2, FormatterInitOptions.normalizeIndentWidth(17));
        assertEquals("TAB", FormatterInitOptions.normalizeChoice(" TAB ", FormatterInitOptions.INDENT_CHARACTER_VALUES));
        assertEquals("SPACE", FormatterInitOptions.normalizeChoice("tab", FormatterInitOptions.INDENT_CHARACTER_VALUES));
        assertEquals("SPACE", FormatterInitOptions.normalizeChoice(null, FormatterInitOptions.INDENT_CHARACTER_VALUES));
        assertEquals("KEEP", FormatterInitOptions.normalizeChoice("", FormatterInitOptions.EOL_CHARACTER_VALUES));
    }

    @Test
    void normalizingTwiceGivesTheSameResult() {
        List<FormatterInitOptions.Values> inputs = List.of(
            FormatterInitOptions.DEFAULTS,
            withChoices(null),
            withChoices(""),
            withChoices("   "),
            withChoices("BOGUS"),
            withChoices("KEEP"),
            withChoices(" LF "),
            new FormatterInitOptions.Values(99, "tab", true, true, true, true, true, true,
                "crlf", "fi", "upper_case", "after_comma", "spaced", true, true),
            new FormatterInitOptions.Values(Integer.MIN_VALUE, "TAB", false, true, false, true, false, true,
                "CRLF", "ENDIF", "UPPER_CASE", "BEFORE_AND_AFTER_COMMA", "SPACED", true, false));
        for (FormatterInitOptions.Values input : inputs) {
            FormatterInitOptions.Values once = FormatterInitOptions.normalize(input);
            FormatterInitOptions.Values twice = FormatterInitOptions.normalize(once);
            assertEquals(once, twice, "normalizing " + input + " twice must be stable");
        }
    }

    @Test
    void numbersAndBooleansAreJsonPrimitivesOfTheRightKind() {
        JsonObject json = sentBy(new BbjSettings.State());

        assertTrue(json.get("indentWidth").getAsJsonPrimitive().isNumber(), "indentWidth must be a JSON number");
        for (String key : BOOLEAN_KEYS) {
            assertTrue(json.get(key).getAsJsonPrimitive().isBoolean(), key + " must be a JSON boolean");
        }
        for (Choice choice : CHOICES) {
            assertTrue(json.get(choice.key()).getAsJsonPrimitive().isString(),
                choice.key() + " must be a JSON string");
        }
    }

    @Test
    void noValueIsEverJsonNull() {
        JsonObject json = FormatterInitOptions.toJson(withChoices(null));

        assertEquals(15, json.size());
        for (Map.Entry<String, JsonElement> member : json.entrySet()) {
            assertFalse(member.getValue().isJsonNull(), member.getKey() + " must never be JSON null");
        }
    }

    @Test
    void writingToStateAndReadingBackGivesTheNormalizedValues() {
        List<FormatterInitOptions.Values> inputs = List.of(
            FormatterInitOptions.DEFAULTS,
            new FormatterInitOptions.Values(16, "TAB", true, true, true, true, true, true,
                "LF", "ENDIF", "MATCH_IF", "AFTER_COMMA", "SPACED", true, true),
            new FormatterInitOptions.Values(0, "SPACE", false, true, false, true, false, true,
                "CRLF", "FI", "LOWER_CASE", "NO_BLANK", "KEEP", false, true),
            new FormatterInitOptions.Values(17, "tab", true, false, true, false, true, false,
                null, "", "   ", "BOGUS", "spaced", true, false),
            new FormatterInitOptions.Values(-1, null, false, false, false, false, false, false,
                " LF ", "endif", "UPPER_CASE", "BEFORE_AND_AFTER_COMMA", "SPACED", false, false));
        for (FormatterInitOptions.Values input : inputs) {
            BbjSettings.State state = new BbjSettings.State();
            FormatterInitOptions.writeToState(input, state);
            assertEquals(FormatterInitOptions.normalize(input), FormatterInitOptions.fromState(state),
                "writing " + input + " and reading it back must give the normalized values");
        }
        BbjSettings.State outOfRange = new BbjSettings.State();
        FormatterInitOptions.writeToState(new FormatterInitOptions.Values(17, "BOGUS", false, false, false,
            false, false, false, null, null, null, null, null, false, false), outOfRange);
        assertEquals(2, outOfRange.formatterIndentWidth, "an out-of-range width is stored as the default");
        assertEquals("SPACE", outOfRange.formatterIndentCharacter, "an unknown choice is stored as the default");
        assertEquals("KEEP", outOfRange.formatterEolCharacter, "a null choice is stored as the default");
    }

    @Test
    void theDeprecatedAliasIsNeverSent() {
        List<JsonObject> outputs = List.of(
            sentBy(new BbjSettings.State()),
            FormatterInitOptions.toJson(withChoices(null)),
            FormatterInitOptions.toJson(FormatterInitOptions.DEFAULTS));
        for (JsonObject json : outputs) {
            for (String key : json.keySet()) {
                assertFalse(key.contains("IF"), "no key may be spelled with a capital IF: " + key);
            }
            assertTrue(json.has("splitSingleLineIf"));
        }
    }
}
