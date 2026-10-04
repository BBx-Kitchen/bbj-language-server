package com.basis.bbj.intellij.lsp;

import com.basis.bbj.intellij.BbjSettings;
import com.google.gson.JsonObject;

import java.util.List;

/**
 * Plain-Java seam for the IntelliJ-side half of the BBj code formatter settings.
 * <p>
 * The 15 settings travel to the language server as <b>one</b> {@code formatter} object inside the
 * flat {@code initializationOptions}, the same channel {@link CompilerInitOptions} uses and for the
 * same reason: LSP4IJ's generic settings push is never wired for BBj settings, and its pull path
 * resolves against {@link BbjLanguageClient#createSettings()}'s flat object and returns null. The
 * server reads {@code initializationOptions.formatter} in {@code bbj-ws-manager.ts} and hands it to
 * its formatter settings normalizer. A settings-apply restart re-sends fresh initialization
 * options for free.
 * <p>
 * The object always carries all 15 keys with explicit values, never a {@code null}, because bbj-ls
 * rejects an unknown or null value. The key names, order, defaults, choice values and the indent
 * width bounds mirror {@code bbj-format-settings.ts} and the {@code bbj.formatter.*} entries of the
 * VS Code extension's {@code package.json}; a contract test pins them. The deprecated
 * {@code splitSingleLineIF} spelling is a VS Code-only alias and is never sent.
 * <p>
 * This class has no IntelliJ platform dependency so it can be covered by plain JUnit 5 tests.
 */
public final class FormatterInitOptions {

    /**
     * The flat {@code initializationOptions} key the language server reads in
     * {@code bbj-ws-manager.ts}'s {@code onInitialize} handler.
     */
    public static final String FORMATTER_KEY = "formatter";

    /** The 15 setting names, in the server's fixed order. */
    public static final List<String> KEYS = List.of(
            "indentWidth",
            "indentCharacter",
            "keywordsToUppercase",
            "removeLineContinuation",
            "splitSingleLineIf",
            "splitInlineComments",
            "splitInlineLabelComment",
            "collapseMultiLine",
            "eolCharacter",
            "ifClosingKeyword",
            "ifKeywordCase",
            "parameterLayout",
            "operatorSpacing",
            "indentLabelBlocks",
            "blankLineAfterReturn");

    public static final int INDENT_WIDTH_DEFAULT = 2;
    public static final int INDENT_WIDTH_MIN = 0;
    public static final int INDENT_WIDTH_MAX = 16;

    /** Allowed values per choice setting. The first element of every list is the default. */
    public static final List<String> INDENT_CHARACTER_VALUES = List.of("SPACE", "TAB");
    public static final List<String> EOL_CHARACTER_VALUES = List.of("KEEP", "LF", "CRLF");
    public static final List<String> IF_CLOSING_KEYWORD_VALUES = List.of("KEEP", "FI", "ENDIF");
    public static final List<String> IF_KEYWORD_CASE_VALUES =
            List.of("KEEP", "MATCH_IF", "LOWER_CASE", "UPPER_CASE");
    public static final List<String> PARAMETER_LAYOUT_VALUES = List.of(
            "KEEP_INITIAL_LAYOUT", "NO_BLANK", "BEFORE_COMMA", "AFTER_COMMA", "BEFORE_AND_AFTER_COMMA");
    public static final List<String> OPERATOR_SPACING_VALUES = List.of("KEEP", "SPACED");

    /**
     * One value per formatter setting, components in the server's key order.
     */
    public record Values(
            int indentWidth,
            String indentCharacter,
            boolean keywordsToUppercase,
            boolean removeLineContinuation,
            boolean splitSingleLineIf,
            boolean splitInlineComments,
            boolean splitInlineLabelComment,
            boolean collapseMultiLine,
            String eolCharacter,
            String ifClosingKeyword,
            String ifKeywordCase,
            String parameterLayout,
            String operatorSpacing,
            boolean indentLabelBlocks,
            boolean blankLineAfterReturn) {
    }

    /** The value of every setting when the user has not changed it, equal to the server-side defaults. */
    public static final Values DEFAULTS = new Values(
            INDENT_WIDTH_DEFAULT,
            INDENT_CHARACTER_VALUES.get(0),
            false,
            false,
            false,
            false,
            false,
            false,
            EOL_CHARACTER_VALUES.get(0),
            IF_CLOSING_KEYWORD_VALUES.get(0),
            IF_KEYWORD_CASE_VALUES.get(0),
            PARAMETER_LAYOUT_VALUES.get(0),
            OPERATOR_SPACING_VALUES.get(0),
            false,
            false);

    private FormatterInitOptions() {
    }

    /**
     * Reads the 15 persisted {@code formatter*} fields into a {@link Values}.
     *
     * @param state the persisted settings state
     * @return the values as stored
     */
    public static Values fromState(BbjSettings.State state) {
        return new Values(
                state.formatterIndentWidth,
                state.formatterIndentCharacter,
                state.formatterKeywordsToUppercase,
                state.formatterRemoveLineContinuation,
                state.formatterSplitSingleLineIf,
                state.formatterSplitInlineComments,
                state.formatterSplitInlineLabelComment,
                state.formatterCollapseMultiLine,
                state.formatterEolCharacter,
                state.formatterIfClosingKeyword,
                state.formatterIfKeywordCase,
                state.formatterParameterLayout,
                state.formatterOperatorSpacing,
                state.formatterIndentLabelBlocks,
                state.formatterBlankLineAfterReturn);
    }

    /**
     * Builds the {@code formatter} object for the initialization options: exactly the 15
     * {@link #KEYS} in order, the indent width as a JSON number, the eight flags as JSON booleans
     * and the six choices as JSON strings.
     *
     * @param values the values to send
     * @return the JSON object
     */
    public static JsonObject toJson(Values values) {
        JsonObject json = new JsonObject();
        json.addProperty("indentWidth", values.indentWidth());
        json.addProperty("indentCharacter", values.indentCharacter());
        json.addProperty("keywordsToUppercase", values.keywordsToUppercase());
        json.addProperty("removeLineContinuation", values.removeLineContinuation());
        json.addProperty("splitSingleLineIf", values.splitSingleLineIf());
        json.addProperty("splitInlineComments", values.splitInlineComments());
        json.addProperty("splitInlineLabelComment", values.splitInlineLabelComment());
        json.addProperty("collapseMultiLine", values.collapseMultiLine());
        json.addProperty("eolCharacter", values.eolCharacter());
        json.addProperty("ifClosingKeyword", values.ifClosingKeyword());
        json.addProperty("ifKeywordCase", values.ifKeywordCase());
        json.addProperty("parameterLayout", values.parameterLayout());
        json.addProperty("operatorSpacing", values.operatorSpacing());
        json.addProperty("indentLabelBlocks", values.indentLabelBlocks());
        json.addProperty("blankLineAfterReturn", values.blankLineAfterReturn());
        return json;
    }
}
