package com.basis.bbj.intellij;

import java.util.List;
import java.util.Map;

/**
 * Tooltip and note texts for the Formatter section of the BBj settings page.
 * <p>
 * Every tooltip carries the same explanation the VS Code extension shows for the matching
 * {@code bbj.formatter.*} setting in its {@code package.json}, with the VS Code markup removed
 * (backticks dropped, a {@code #bbj.formatter.<name>#} setting link reduced to {@code <name>}). A
 * choice setting's tooltip also lists every value with its description. A contract test reads
 * {@code package.json} and fails when the two drift apart.
 * <p>
 * Plain Java with no IntelliJ platform dependency, so it can be covered by plain JUnit 5 tests.
 */
public final class FormatterSettingTexts {

    /**
     * The note under the Formatter section: when the values take effect, and the measured line
     * ending limitation of IntelliJ (the IDE refuses a formatting edit whose text carries CRLF line
     * breaks; lsp4ij issue #381).
     */
    public static final String RESTART_NOTE = "These settings apply after the language server restarts. "
            + "Apply restarts it automatically. "
            + "In IntelliJ, Line ending CRLF stops formatting entirely: the IDE refuses the formatter's edit "
            + "and the file stays unchanged, without a message (an LSP4IJ limitation, lsp4ij issue #381); "
            + "LF does not change a file's line endings either, so leave it at KEEP.";

    /** Points to the IDE's own format-on-save switch, which is not part of this page. */
    public static final String FORMAT_ON_SAVE_HINT =
            "To format on save, turn on Reformat code under Settings | Tools | Actions on Save.";

    /** One choice value and its description. */
    private record Choice(String value, String description) {
    }

    private static final Map<String, String> DESCRIPTIONS = Map.ofEntries(
            Map.entry("indentWidth", "Number of indent characters per block level, from 0 to 16."),
            Map.entry("indentCharacter", "Character used for indentation."),
            Map.entry("indentLabelBlocks",
                    "Indent the statements between a subroutine label and its closing RETURN by one level."),
            Map.entry("keywordsToUppercase", "Write BBj keywords in upper case. Wins over ifKeywordCase."),
            Map.entry("ifClosingKeyword", "Keyword that closes a block IF. KEEP leaves every existing FI or "
                    + "ENDIF as written; a closer the formatter adds uses FI."),
            Map.entry("ifKeywordCase", "Case of ELSE, FI and ENDIF. KEEP leaves existing keywords as written; "
                    + "added ones copy the case of their IF. keywordsToUppercase always wins."),
            Map.entry("splitSingleLineIf", "Split a single-line IF statement across several lines."),
            Map.entry("removeLineContinuation", "Remove line-continuation characters."),
            Map.entry("splitInlineComments", "Move in-line comments onto their own line."),
            Map.entry("splitInlineLabelComment", "Move a label's in-line comment onto its own line."),
            Map.entry("collapseMultiLine", "Collapse consecutive blank lines into one."),
            Map.entry("blankLineAfterReturn", "Put exactly one blank line after a subroutine's closing RETURN."),
            Map.entry("parameterLayout", "Spacing around the commas between method parameters."),
            Map.entry("operatorSpacing", "Spacing around binary operators."),
            Map.entry("eolCharacter", "Line ending of the formatted file."));

    private static final Map<String, List<Choice>> CHOICES = Map.of(
            "indentCharacter", List.of(
                    new Choice("SPACE", "Indent with spaces."),
                    new Choice("TAB", "Indent with tab characters.")),
            "ifClosingKeyword", List.of(
                    new Choice("KEEP", "Leave existing closers as written; added closers use FI."),
                    new Choice("FI", "Close every block IF with FI."),
                    new Choice("ENDIF", "Close every block IF with ENDIF.")),
            "ifKeywordCase", List.of(
                    new Choice("KEEP", "Leave existing keywords as written; added ones copy the IF's case."),
                    new Choice("MATCH_IF", "Copy the case of the opening IF."),
                    new Choice("LOWER_CASE", "Write them in lower case."),
                    new Choice("UPPER_CASE", "Write them in upper case.")),
            "parameterLayout", List.of(
                    new Choice("KEEP_INITIAL_LAYOUT", "Keep the spacing as written."),
                    new Choice("NO_BLANK", "No blank around the commas."),
                    new Choice("BEFORE_COMMA", "One blank before each comma."),
                    new Choice("AFTER_COMMA", "One blank after each comma."),
                    new Choice("BEFORE_AND_AFTER_COMMA", "One blank before and after each comma.")),
            "operatorSpacing", List.of(
                    new Choice("KEEP", "Keep the spacing as written."),
                    new Choice("SPACED", "Exactly one blank on each side; unary signs, exponents, strings and "
                            + "comments stay as written.")),
            "eolCharacter", List.of(
                    new Choice("KEEP", "Use the file's most frequent line ending."),
                    new Choice("LF", "Use LF."),
                    new Choice("CRLF", "Use CRLF.")));

    private FormatterSettingTexts() {
    }

    /**
     * The tooltip for one formatter setting.
     * <p>
     * A spinner or checkbox setting gets its description as plain text. A choice setting gets an
     * HTML tooltip: the description, then one {@code VALUE: description} line per allowed value,
     * with {@code &}, {@code <} and {@code >} escaped. An unknown key gets an empty string.
     *
     * @param key the setting name, for example {@code indentWidth}
     * @return the tooltip text
     */
    public static String tooltip(String key) {
        String description = DESCRIPTIONS.get(key);
        if (description == null) {
            return "";
        }
        List<Choice> choices = CHOICES.get(key);
        if (choices == null) {
            return description;
        }
        StringBuilder html = new StringBuilder("<html>").append(escape(description));
        for (Choice choice : choices) {
            html.append("<br>").append(escape(choice.value())).append(": ").append(escape(choice.description()));
        }
        return html.append("</html>").toString();
    }

    private static String escape(String text) {
        return text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;");
    }
}
