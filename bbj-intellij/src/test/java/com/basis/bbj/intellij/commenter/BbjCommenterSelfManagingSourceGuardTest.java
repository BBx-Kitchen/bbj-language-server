package com.basis.bbj.intellij.commenter;

import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.fail;

/**
 * Pins the #540 self-managing commenter wiring in source. A failure here means either
 * {@code BbjCommenter} stopped implementing one of its two interfaces, or a line decision was
 * inlined back into the platform class instead of staying delegated to {@link RemToggleSeam}.
 */
class BbjCommenterSelfManagingSourceGuardTest {

    private static final Path BBJ_COMMENTER_SOURCE = Paths.get(
            "src", "main", "java", "com", "basis", "bbj", "intellij", "BbjCommenter.java")
            .toAbsolutePath();

    private static final Path REM_TOGGLE_SEAM_SOURCE = Paths.get(
            "src", "main", "java", "com", "basis", "bbj", "intellij", "commenter", "RemToggleSeam.java")
            .toAbsolutePath();

    private static final Path PLUGIN_XML = Paths.get(
            "src", "main", "resources", "META-INF", "plugin.xml")
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

    /** Drops any line whose trimmed form is a comment line, so a javadoc sentence explaining
     * the delegation cannot make the "no inlined recognition" assertions pass or fail by accident. */
    private static String stripCommentLines(String text) {
        StringBuilder sb = new StringBuilder();
        for (String line : text.split("\n", -1)) {
            String trimmed = line.trim();
            if (trimmed.startsWith("*") || trimmed.startsWith("//")) {
                continue;
            }
            sb.append(line).append('\n');
        }
        return sb.toString();
    }

    @Test
    void bbjCommenterDeclaresBothCommenterAndSelfManagingCommenter() {
        String text = readSource(BBJ_COMMENTER_SOURCE);
        assertTrue(text.contains("SelfManagingCommenter"),
                "BbjCommenter.java must still declare SelfManagingCommenter");
        assertTrue(text.contains("implements Commenter,"),
                "BbjCommenter.java must still implement Commenter alongside SelfManagingCommenter");
    }

    @Test
    void bbjCommenterDelegatesEachLineDecisionToTheSeamExactlyOnce() {
        String text = readSource(BBJ_COMMENTER_SOURCE);
        assertEquals(1, countOccurrences(text, "RemToggleSeam.isCommented("),
                "isLineCommented must delegate to the seam exactly once");
        assertEquals(1, countOccurrences(text, "RemToggleSeam.comment("),
                "commentLine must delegate to the seam exactly once");
        assertEquals(1, countOccurrences(text, "RemToggleSeam.uncomment("),
                "uncommentLine must delegate to the seam exactly once");
    }

    @Test
    void noRecognitionLogicIsInlinedBackIntoBbjCommenter() {
        String text = stripCommentLines(readSource(BBJ_COMMENTER_SOURCE));
        assertEquals(0, countOccurrences(text, "equalsIgnoreCase"),
                "recognition must stay delegated to the seam, not inlined via equalsIgnoreCase");
        assertEquals(0, countOccurrences(text, "startsWith"),
                "recognition must stay delegated to the seam, not inlined via startsWith");
    }

    @Test
    void bbjCommenterStillReadsGetLineCommentPrefixAndUsesTheEmptyState() {
        String text = readSource(BBJ_COMMENTER_SOURCE);
        assertTrue(text.contains("getLineCommentPrefix"),
                "the Commenter half of BbjCommenter must stay intact");
        assertTrue(text.contains("EMPTY_STATE"),
                "the stateless state holder must be reused rather than allocating a new one per line");
    }

    @Test
    void theLineStartOffsetIsComputedBeforeTheSeamIsAskedToComment() {
        String text = readSource(BBJ_COMMENTER_SOURCE);
        int lineStartIndex = text.indexOf("getLineStartOffset(");
        int seamCommentIndex = text.indexOf("RemToggleSeam.comment(");
        assertTrue(lineStartIndex >= 0, "getLineStartOffset( is not present in BbjCommenter.java");
        assertTrue(seamCommentIndex >= 0, "RemToggleSeam.comment( is not present in BbjCommenter.java");
        assertTrue(lineStartIndex < seamCommentIndex,
                "the replacement must be computed from the line start offset, so the prefix lands at column 0");
    }

    @Test
    void remToggleSeamCarriesNoIntellijImport() {
        String text = readSource(REM_TOGGLE_SEAM_SOURCE);
        assertEquals(0, countOccurrences(text, "import com.intellij"),
                "RemToggleSeam.java must stay a plain-Java seam with no platform import");
    }

    @Test
    void pluginXmlStillRegistersBbjCommenterAsTheLangCommenter() {
        String text = readSource(PLUGIN_XML);
        assertTrue(text.contains("com.basis.bbj.intellij.BbjCommenter"),
                "plugin.xml must still register BbjCommenter as the lang.commenter implementation");
    }
}
