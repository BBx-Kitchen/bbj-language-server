package com.basis.bbj.intellij.composer;

import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.fail;

/**
 * Pins structural invariants of {@link SetoptsComposerDialog} that no headless test in this build
 * can exercise at runtime: the layout (one scrollable panel, byte groups in catalog order, greyed
 * BBj-annotated bits), the remaining client-side validation gate (the mask check runs before any
 * request is issued -- the raw-tail check moved server-side, #607), the lossless-original
 * contract (the captured original hex rides on every preview), and the raw-tail error routing to
 * its field-level label from the server's own response. Each assertion fails if a future change
 * sorts the groups, drops the grey-out, moves the mask check after the request, stops passing the
 * original, or stops rendering the server's raw-tail message next to its field.
 */
class SetoptsComposerDialogSourceGuardTest {

    private static final Path DIALOG_SOURCE = Paths.get(
            "src", "main", "java", "com", "basis", "bbj", "intellij", "composer", "SetoptsComposerDialog.java")
            .toAbsolutePath();

    private static String readSource() {
        if (!Files.exists(DIALOG_SOURCE)) {
            fail("Guarded source file not found at " + DIALOG_SOURCE);
        }
        try {
            return withoutCommentLines(Files.readString(DIALOG_SOURCE));
        } catch (IOException e) {
            throw new UncheckedIOException("Failed to read " + DIALOG_SOURCE, e);
        }
    }

    /**
     * Drops comment lines (javadoc, line comments, block comment starts) so a rationale sentence
     * naming a guarded literal can never satisfy or trip an assertion from inside a comment.
     */
    private static String withoutCommentLines(String text) {
        StringBuilder result = new StringBuilder();
        for (String line : text.split("\n", -1)) {
            String trimmed = line.trim();
            if (trimmed.startsWith("*") || trimmed.startsWith("//") || trimmed.startsWith("/*")) {
                continue;
            }
            result.append(line).append('\n');
        }
        return result.toString();
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

    /**
     * Returns the brace-delimited block that follows the first occurrence of {@code marker}
     * (a method signature or an {@code if} condition), without its outer braces. Braces inside
     * string and char literals are skipped, so a regex such as {@code "[0-9A-F]{0,14}"} in the
     * condition is never mistaken for the block.
     */
    private static String blockAfter(String text, String marker) {
        int start = text.indexOf(marker);
        assertTrue(start >= 0, "SetoptsComposerDialog.java must contain: " + marker);
        int bodyStart = -1;
        int depth = 0;
        char quote = 0;
        for (int i = start + marker.length(); i < text.length(); i++) {
            char c = text.charAt(i);
            if (quote != 0) {
                if (c == '\\') {
                    i++;
                } else if (c == quote) {
                    quote = 0;
                }
            } else if (c == '"' || c == '\'') {
                quote = c;
            } else if (c == '{') {
                if (depth++ == 0) {
                    bodyStart = i + 1;
                }
            } else if (c == '}' && depth > 0 && --depth == 0) {
                return text.substring(bodyStart, i);
            }
        }
        fail("block after '" + marker + "' must be opened and closed");
        return "";
    }

    @Test
    void layoutIteratesByteGroupsInArrivalOrderWithinOneScrollPane() {
        String text = readSource();

        assertEquals(1, countOccurrences(text, "new JBScrollPane("),
                "exactly one JBScrollPane must hold the whole form so every option lives in one scrollable panel");
        assertTrue(text.contains("for (SetoptsByteGroup group : catalogs.byteGroups)"),
                "the form must iterate catalogs.byteGroups directly, in the order the server sent them");
        assertEquals(0, countOccurrences(text, ".sort("), "byte groups must not be re-sorted");
        assertEquals(0, countOccurrences(text, ".sorted("), "byte groups must not be re-sorted");
        assertEquals(0, countOccurrences(text, "Comparator"), "byte groups must not be re-sorted");
    }

    @Test
    void checkboxIterationDynamicallyFiltersFromCatalogBits() {
        String text = readSource();

        assertTrue(text.contains("for (SetoptsBit bit : catalogs.bits)"),
                "checkbox rendering must iterate catalogs.bits rather than a hard-coded list");
        assertTrue(text.contains("bit.byteNo != group.byteNo"),
                "each group must show only the bits whose byte number matches the group");
        assertEquals(0, countOccurrences(text, "new int[]"),
                "no hard-coded byte list may decide group membership");
    }

    @Test
    void annotatedBitsAreGreyedWithTooltips() {
        String text = readSource();

        assertEquals(1, countOccurrences(text, "UIUtil.getInactiveTextColor()"),
                "exactly one grey-out site must exist, for BBj-annotated bits");
        String annotated = blockAfter(text, "if (bit.bbj != null)");
        assertTrue(annotated.contains("setForeground(UIUtil.getInactiveTextColor())"),
                "a bit annotated as ignored/BBj-specific must be rendered in the inactive text color");
        assertTrue(annotated.contains("setToolTipText(bit.bbjDetail"),
                "a greyed bit must explain itself with bbjDetail as its tooltip");

        String plain = blockAfter(text, "else if (bit.detail != null)");
        assertTrue(plain.contains("setToolTipText(bit.detail)"),
                "a non-annotated bit must carry its detail text as the tooltip");
        assertEquals(0, countOccurrences(plain, "getInactiveTextColor"),
                "a non-annotated bit must not be greyed");
    }

    /**
     * The raw-tail check moved server-side (#607); this now guards only the mask check that
     * remains client-side. A later reader must not expect this test to cover the raw tail.
     */
    @Test
    void refreshMethodValidatesTheMaskCharactersBeforeIssuingAnyRequest() {
        String refresh = blockAfter(readSource(), "private void refresh()");

        int maskCheck = refresh.indexOf("if (!isValidMaskChar(maskComma) || !isValidMaskChar(maskDot))");
        int seqIncrement = refresh.indexOf("seq.incrementAndGet()");
        int request = refresh.indexOf("server.setoptsPreview(");

        assertTrue(maskCheck >= 0, "refresh() must validate both mask replacement characters");
        assertTrue(request >= 0, "refresh() must issue the preview request");
        assertTrue(seqIncrement >= 0, "refresh() must take a sequence number for the request it issues");
        assertTrue(maskCheck < seqIncrement,
                "the mask check must run before refresh() takes a sequence number");
        assertTrue(seqIncrement < request, "the sequence number must be taken before the request is issued");

        String maskBranch = blockAfter(refresh, "if (!isValidMaskChar(maskComma)");
        int unavailable = maskBranch.indexOf("previewUnavailable(");
        int ret = maskBranch.indexOf("return;");
        assertTrue(unavailable >= 0 && ret > unavailable,
                "an invalid mask character must disable OK through previewUnavailable(...) and return without a request");
        assertEquals(0, countOccurrences(maskBranch, "server.setoptsPreview("),
                "an invalid mask character must never reach the language server");
    }

    /**
     * The deleted raw-tail rule (#607) must never return unnoticed: no digit-bound constant
     * and no {@code .matches(} call may reappear anywhere in this file.
     */
    @Test
    void theDeletedRawTailRuleCannotReturnUnnoticed() {
        String text = readSource();
        assertEquals(0, countOccurrences(text, "MAX_RAW_TAIL_DIGITS"),
                "the deleted raw-tail digit-bound constant must not reappear");
        assertEquals(0, countOccurrences(text, ".matches("),
                "no .matches( call may reappear -- raw-tail validation is the server's job now");
    }

    @Test
    void maskValidationEnforcesOnePrintableAsciiCharacter() {
        String check = blockAfter(readSource(), "private static boolean isValidMaskChar(String text)");

        assertTrue(check.contains("text.length() > 1"),
                "a mask replacement longer than one character must be rejected");
        assertTrue(check.contains(">= 0x20") && check.contains("<= 0x7E"),
                "a mask replacement must be a printable ASCII character (0x20..0x7E)");
    }

    @Test
    void setoptsPreviewParamsAlwaysPassesOriginalHex() {
        String text = readSource();

        assertEquals(1, countOccurrences(text, "new SetoptsPreviewParams("),
                "one construction site guarantees every preview request carries the captured original");
        assertTrue(text.contains("new SetoptsPreviewParams(originalHex, "),
                "the preview must start from the captured original hex so unmodeled bytes and unknown bits survive");
    }

    /**
     * The raw-tail message now comes from the server's own response (#607), rendered inside
     * {@code apply(SetoptsPreview)} rather than authored in Java. This replaces the prior guard,
     * which described an ordering inside a branch that no longer exists -- patching it would have
     * left a test that passed vacuously.
     */
    @Test
    void applyRendersTheServersRawTailErrorAndTheLabelIsNeverAssignedAMessageLiteral() {
        String text = readSource();
        String apply = blockAfter(text, "private void apply(SetoptsPreview p)");

        assertEquals(1, countOccurrences(apply, "rawTailError.setText(p.rawTailError"),
                "apply(SetoptsPreview) must render the server's rawTailError exactly once");

        // The only string literal the raw-tail label may ever be set from is the single-space
        // placeholder that keeps the label's height stable when there is no message (matching the
        // null-to-space convention the other dialogs use) -- never an author-written message.
        int index = 0;
        while ((index = text.indexOf("rawTailError.setText(", index)) != -1) {
            int parenStart = index + "rawTailError.setText(".length();
            if (text.startsWith("\" \")", parenStart)) {
                // the single-space placeholder embedded in the null-check ternary -- allowed
            } else if (text.startsWith("p.rawTailError", parenStart)) {
                // rendering the server's message -- allowed
            } else {
                fail("rawTailError.setText( must only ever render p.rawTailError or the \" \" placeholder, "
                        + "never an author-written message literal");
            }
            index = parenStart;
        }
    }
}
