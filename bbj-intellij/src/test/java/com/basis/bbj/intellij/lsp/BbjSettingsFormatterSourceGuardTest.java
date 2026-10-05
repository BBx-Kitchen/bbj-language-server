package com.basis.bbj.intellij.lsp;

import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.fail;
import static com.basis.bbj.intellij.lsp.JavaSourceScan.methodBody;
import static com.basis.bbj.intellij.lsp.JavaSourceScan.stripComments;

/**
 * Source-guard fence for the Formatter section of the BBj settings page.
 * <p>
 * The section must sit directly after "BBj Compiler", so the server's "Open Settings" link lands
 * the user near it; its controls must be unable to produce a value the language server rejects (a
 * spinner bounded by the seam's constants, combos over the seam's own value lists, checkboxes, and
 * no free-text field); and the configurable must compare, store and reset the normalized values,
 * storing them before the debounced restart that re-sends them as initialization options.
 */
class BbjSettingsFormatterSourceGuardTest {

    private static final Path COMPONENT_SOURCE = Paths.get(
            "src", "main", "java", "com", "basis", "bbj", "intellij", "BbjSettingsComponent.java")
            .toAbsolutePath();

    private static final Path CONFIGURABLE_SOURCE = Paths.get(
            "src", "main", "java", "com", "basis", "bbj", "intellij", "BbjSettingsConfigurable.java")
            .toAbsolutePath();

    /** The 15 control fields in page order. */
    private static final List<String> CONTROLS_IN_PAGE_ORDER = List.of(
            "formatterIndentWidthSpinner",
            "formatterIndentCharacterCombo",
            "formatterIndentLabelBlocksCheckbox",
            "formatterKeywordsToUppercaseCheckbox",
            "formatterIfClosingKeywordCombo",
            "formatterIfKeywordCaseCombo",
            "formatterSplitSingleLineIfCheckbox",
            "formatterRemoveLineContinuationCheckbox",
            "formatterSplitInlineCommentsCheckbox",
            "formatterSplitInlineLabelCommentCheckbox",
            "formatterCollapseMultiLineCheckbox",
            "formatterBlankLineAfterReturnCheckbox",
            "formatterParameterLayoutCombo",
            "formatterOperatorSpacingCombo",
            "formatterEolCharacterCombo");

    private static final List<String> CHOICE_LISTS = List.of(
            "INDENT_CHARACTER_VALUES",
            "IF_CLOSING_KEYWORD_VALUES",
            "IF_KEYWORD_CASE_VALUES",
            "PARAMETER_LAYOUT_VALUES",
            "OPERATOR_SPACING_VALUES",
            "EOL_CHARACTER_VALUES");

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
    void theFormatterSectionSitsBetweenTheCompilerAndNodeSections() {
        String text = stripComments(readSource(COMPONENT_SOURCE));
        assertEquals(1, countOccurrences(text, "new TitledSeparator(\"Formatter\")"),
                "the page must have exactly one Formatter separator");
        int compiler = text.indexOf("new TitledSeparator(\"BBj Compiler\")");
        int formatter = text.indexOf("new TitledSeparator(\"Formatter\")");
        int node = text.indexOf("new TitledSeparator(\"Node.js Runtime\")");
        assertTrue(compiler >= 0 && node >= 0, "the BBj Compiler and Node.js Runtime separators must be present");
        assertTrue(compiler < formatter && formatter < node,
                "the Formatter section must sit after BBj Compiler and before Node.js Runtime");
        assertEquals(0, countOccurrences(text.substring(compiler + 1, formatter), "new TitledSeparator("),
                "no other section may sit between BBj Compiler and Formatter");

        String section = text.substring(formatter, node);
        int previous = -1;
        for (String control : CONTROLS_IN_PAGE_ORDER) {
            int index = section.indexOf(control);
            assertTrue(index >= 0, control + " must be laid out in the Formatter section");
            assertTrue(index > previous, control + " must follow the previous control in page order");
            previous = index;
        }
        assertTrue(section.indexOf("formatterNoteLabel") > previous,
                "the note must sit under the section's last control");
    }

    @Test
    void everyControlCarriesItsTooltipAndTheNoteTakesTheSharedText() {
        String text = stripComments(readSource(COMPONENT_SOURCE));
        assertEquals(15, countOccurrences(text, "setToolTipText(FormatterSettingTexts.tooltip("),
                "each of the 15 controls must carry its tooltip");
        for (String control : CONTROLS_IN_PAGE_ORDER) {
            assertEquals(1, countMatches(text, control + "\\.setToolTipText\\(\\s*FormatterSettingTexts\\.tooltip\\("),
                    control + " must set its tooltip exactly once");
        }
        assertEquals(1, countOccurrences(text, "FormatterSettingTexts.RESTART_NOTE"),
                "the section note must take its text from the shared constant");
    }

    @Test
    void theControlsAreOneBoundedSpinnerSixCombosAndEightCheckboxes() {
        String text = stripComments(readSource(COMPONENT_SOURCE));
        assertEquals(1, countMatches(text, "private final JBIntSpinner formatter[A-Z]\\w*;"),
                "exactly one formatter spinner field");
        assertEquals(6, countMatches(text, "private final ComboBox<String> formatter[A-Z]\\w*;"),
                "exactly six formatter combo fields");
        assertEquals(8, countMatches(text, "private final JCheckBox formatter[A-Z]\\w*;"),
                "exactly eight formatter checkbox fields");
        assertEquals(0, countMatches(text, "(JBTextField|JTextField|JFormattedTextField) formatter[A-Z]"),
                "no formatter setting may be a free-text field");
        for (String control : CONTROLS_IN_PAGE_ORDER) {
            assertEquals(1, countMatches(text, "private final \\w+(<String>)? " + control + ";"),
                    control + " must be declared exactly once");
        }

        String oneLine = text.replaceAll("\\s+", " ");
        assertEquals(1, countOccurrences(oneLine, "new JBIntSpinner("), "exactly one spinner is created");
        assertEquals(1, countOccurrences(oneLine, "new JBIntSpinner(FormatterInitOptions.INDENT_WIDTH_DEFAULT, "
                        + "FormatterInitOptions.INDENT_WIDTH_MIN, FormatterInitOptions.INDENT_WIDTH_MAX)"),
                "the spinner must be bounded by the seam's indent-width constants");
        for (String list : CHOICE_LISTS) {
            assertEquals(1, countOccurrences(oneLine,
                            "new CollectionComboBoxModel<>(FormatterInitOptions." + list + ")"),
                    "one combo must list exactly FormatterInitOptions." + list);
        }
        assertEquals(0, countOccurrences(text, "splitSingleLineIF"),
                "the deprecated VS Code alias has no control");
    }

    @Test
    void theConfigurableComparesStoresAndResetsTheFormatterValues() {
        String text = stripComments(readSource(CONFIGURABLE_SOURCE));

        String isModified = methodBody(text, "public boolean isModified()");
        assertTrue(isModified.contains(
                        "!Objects.equals(myComponent.getFormatterValues(), FormatterInitOptions.fromState(state))"),
                "isModified must compare the controls with the normalized persisted values");

        String apply = methodBody(text, "public void apply()");
        int store = apply.indexOf("FormatterInitOptions.writeToState(myComponent.getFormatterValues(), state)");
        int restart = apply.indexOf("scheduleRestart()");
        assertTrue(store >= 0, "apply must store the formatter values");
        assertTrue(restart >= 0, "apply must schedule the debounced restart");
        assertTrue(store < restart,
                "the values must be stored before the restart that re-sends them as initialization options");

        String reset = methodBody(text, "public void reset()");
        assertTrue(reset.contains("myComponent.setFormatterValues(FormatterInitOptions.fromState(state))"),
                "reset must load the normalized persisted values");

        assertEquals(2, countOccurrences(text, "getFormatterValues()"),
                "only isModified and apply read the formatter values");
        assertEquals(1, countOccurrences(text, "setFormatterValues("),
                "only reset loads the formatter values");
    }
}
