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
     * Reads the 15 persisted {@code formatter*} fields into a {@link Values}, normalised so a
     * hand-edited settings file can never yield a value the server rejects.
     *
     * @param state the persisted settings state
     * @return the normalised values
     */
    public static Values fromState(BbjSettings.State state) {
        return normalize(new Values(
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
                state.formatterBlankLineAfterReturn));
    }

    /**
     * Stores the 15 values into the persisted {@code formatter*} fields, normalised first, so the
     * settings page can never persist a value the server rejects.
     *
     * @param values the values to store
     * @param state  the persisted settings state to write into
     */
    public static void writeToState(Values values, BbjSettings.State state) {
        Values normalized = normalize(values);
        state.formatterIndentWidth = normalized.indentWidth();
        state.formatterIndentCharacter = normalized.indentCharacter();
        state.formatterKeywordsToUppercase = normalized.keywordsToUppercase();
        state.formatterRemoveLineContinuation = normalized.removeLineContinuation();
        state.formatterSplitSingleLineIf = normalized.splitSingleLineIf();
        state.formatterSplitInlineComments = normalized.splitInlineComments();
        state.formatterSplitInlineLabelComment = normalized.splitInlineLabelComment();
        state.formatterCollapseMultiLine = normalized.collapseMultiLine();
        state.formatterEolCharacter = normalized.eolCharacter();
        state.formatterIfClosingKeyword = normalized.ifClosingKeyword();
        state.formatterIfKeywordCase = normalized.ifKeywordCase();
        state.formatterParameterLayout = normalized.parameterLayout();
        state.formatterOperatorSpacing = normalized.operatorSpacing();
        state.formatterIndentLabelBlocks = normalized.indentLabelBlocks();
        state.formatterBlankLineAfterReturn = normalized.blankLineAfterReturn();
    }

    /**
     * Normalises a raw, possibly persisted or hand-edited indent width for transmission to the
     * language server.
     * <p>
     * Returns the value unchanged when it lies within {@link #INDENT_WIDTH_MIN} to
     * {@link #INDENT_WIDTH_MAX} inclusive, which is the range bbj-ls and the VS Code schema accept;
     * anything else is reset to {@link #INDENT_WIDTH_DEFAULT} rather than clamped, so a corrupt
     * value falls back to the documented default instead of silently becoming an edge value.
     *
     * @param raw the raw field value
     * @return a width within the allowed range
     */
    public static int normalizeIndentWidth(int raw) {
        if (raw >= INDENT_WIDTH_MIN && raw <= INDENT_WIDTH_MAX) {
            return raw;
        }
        return INDENT_WIDTH_DEFAULT;
    }

    /**
     * Normalises a raw, possibly persisted or hand-edited choice value for transmission to the
     * language server.
     * <p>
     * Trims the input, then returns it unchanged when it is exactly one of the allowed values.
     * Anything else -- {@code null}, blank, a wrong-case spelling or an unknown value -- normalises to
     * the first allowed value, which is the setting's default. The match is exact and
     * case-sensitive on purpose: bbj-ls accepts only the listed values and rejects anything else
     * with -33007, so guessing at a near miss would trade a harmless default for a failing format
     * request.
     *
     * @param raw     the raw field value, or {@code null}
     * @param allowed the allowed values, default first
     * @return one of the allowed values
     */
    public static String normalizeChoice(String raw, List<String> allowed) {
        if (raw != null) {
            String trimmed = raw.trim();
            if (allowed.contains(trimmed)) {
                return trimmed;
            }
        }
        return allowed.get(0);
    }

    /**
     * Applies {@link #normalizeIndentWidth(int)} and {@link #normalizeChoice(String, List)} to every
     * field; the eight flags need no normalisation. Idempotent.
     *
     * @param raw the values to normalise
     * @return values the server accepts
     */
    public static Values normalize(Values raw) {
        return new Values(
                normalizeIndentWidth(raw.indentWidth()),
                normalizeChoice(raw.indentCharacter(), INDENT_CHARACTER_VALUES),
                raw.keywordsToUppercase(),
                raw.removeLineContinuation(),
                raw.splitSingleLineIf(),
                raw.splitInlineComments(),
                raw.splitInlineLabelComment(),
                raw.collapseMultiLine(),
                normalizeChoice(raw.eolCharacter(), EOL_CHARACTER_VALUES),
                normalizeChoice(raw.ifClosingKeyword(), IF_CLOSING_KEYWORD_VALUES),
                normalizeChoice(raw.ifKeywordCase(), IF_KEYWORD_CASE_VALUES),
                normalizeChoice(raw.parameterLayout(), PARAMETER_LAYOUT_VALUES),
                normalizeChoice(raw.operatorSpacing(), OPERATOR_SPACING_VALUES),
                raw.indentLabelBlocks(),
                raw.blankLineAfterReturn());
    }

    /**
     * Builds the {@code formatter} object for the initialization options: exactly the 15
     * {@link #KEYS} in order, the indent width as a JSON number, the eight flags as JSON booleans
     * and the six choices as JSON strings. The values are normalised first, so the result never
     * holds a JSON null whatever it is given.
     *
     * @param raw the values to send
     * @return the JSON object
     */
    public static JsonObject toJson(Values raw) {
        Values values = normalize(raw);
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
