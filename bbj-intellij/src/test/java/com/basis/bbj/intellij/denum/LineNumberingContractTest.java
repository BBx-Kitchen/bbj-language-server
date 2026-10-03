package com.basis.bbj.intellij.denum;

import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.fail;

/**
 * Drift guard between {@link LineNumbering} and the TypeScript rule it ports
 * ({@code bbj-vscode/src/line-numbering.ts} and its test file). A one-sided rule change must fail
 * the IntelliJ suite: the regex, both thresholds and the line split are pinned as plain text, and
 * the TypeScript test file must keep exactly the nine cases the Java test mirrors. Both files are
 * read only as text, never parsed.
 */
class LineNumberingContractTest {

    private static final Path LINE_NUMBERING_TS = Paths.get(
        "..", "bbj-vscode", "src", "line-numbering.ts").toAbsolutePath().normalize();

    private static final Path LINE_NUMBERING_TEST_TS = Paths.get(
        "..", "bbj-vscode", "test", "line-numbering.test.ts").toAbsolutePath().normalize();

    private static String read(Path path) {
        if (!Files.exists(path)) {
            fail("Language server source not found at " + path);
        }
        try {
            return Files.readString(path);
        } catch (IOException e) {
            throw new IllegalStateException("Failed to read " + path, e);
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

    @Test
    void theTypeScriptRuleStillHoldsTheShapeThePortMirrors() {
        String source = read(LINE_NUMBERING_TS);

        assertTrue(source.contains("/^\\s*\\d+[ \\t]+\\S/"),
            "the numbered-line regex changed in " + LINE_NUMBERING_TS + "; update LineNumbering to match");
        assertTrue(source.contains("const maxLinesToInspect = 20;"),
            "the inspection cap changed in " + LINE_NUMBERING_TS + "; update LineNumbering to match");
        assertTrue(source.contains("const minLinesToDecide = 3;"),
            "the minimum line count changed in " + LINE_NUMBERING_TS + "; update LineNumbering to match");
        assertTrue(source.contains("split(/\\r?\\n/)"),
            "the line split changed in " + LINE_NUMBERING_TS + "; update LineNumbering to match");
    }

    @Test
    void theTypeScriptTestFileStillHasExactlyTheNineMirroredCases() {
        String tests = read(LINE_NUMBERING_TEST_TS);

        assertEquals(9, countOccurrences(tests, "    test("),
            "a case was added to or removed from " + LINE_NUMBERING_TEST_TS
                + "; mirror it in LineNumberingTest and update this count");
    }

    @Test
    void theJavaConstantsEqualTheTypeScriptThresholds() {
        assertEquals(20, LineNumbering.MAX_LINES_TO_INSPECT);
        assertEquals(3, LineNumbering.MIN_LINES_TO_DECIDE);
    }
}
