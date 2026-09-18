package com.basis.bbj.intellij.composer;

import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.fail;

/**
 * Pins every {@code bbj/composer/catalogs} construction site in {@code ComposerLauncher.java} to
 * the one shared {@link ComposerCatalogsCheck} (#609): each of the six {@code open*} entry points
 * checks its per-kind catalogs object through the shared predicate exactly once, sharing its
 * method's existing not-ready notice, and that check runs strictly before any dialog is
 * constructed (or, for the SETOPTS-in-code dispatcher, before any of its three downstream
 * construction paths is reached) -- a half-built Swing dialog on the EDT is exactly what this shape
 * check prevents. A failure here means one of those regressed -- a check was removed, moved after
 * construction begins, or a redundant check crept into one of the three SETOPTS-in-code downstream
 * methods that the dispatcher already gates once.
 *
 * <p>Carries its own private copies of every helper, deliberately never a shared test utility, so a
 * single bad edit can never weaken every source guard in this package at once.</p>
 */
class ComposerCatalogsShapeSourceGuardTest {

    private static final Path LAUNCHER_SOURCE = Paths.get(
            "src", "main", "java", "com", "basis", "bbj", "intellij", "composer", "ComposerLauncher.java")
            .toAbsolutePath();

    private static final Path CATALOGS_CHECK_SOURCE = Paths.get(
            "src", "main", "java", "com", "basis", "bbj", "intellij", "composer", "ComposerCatalogsCheck.java")
            .toAbsolutePath();

    private static final Path BUILD_GRADLE_KTS = Paths.get("build.gradle.kts").toAbsolutePath();

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

    /**
     * Drops comment/javadoc lines so a rationale sentence naming a forbidden or counted literal
     * (for example this class's own javadoc) can never trip a count-based assertion. Applied ahead
     * of every count-based assertion in this class without exception.
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

    /** Extracts a brace-balanced method body starting from the first '{' after {@code signatureFragment}. */
    private static String extractMethodBody(String text, String signatureFragment) {
        int sigIndex = text.indexOf(signatureFragment);
        assertTrue(sigIndex >= 0, "method signature not found: " + signatureFragment);
        int braceStart = text.indexOf('{', sigIndex);
        assertTrue(braceStart >= 0, "opening brace not found for: " + signatureFragment);
        int depth = 0;
        for (int i = braceStart; i < text.length(); i++) {
            char c = text.charAt(i);
            if (c == '{') {
                depth++;
            } else if (c == '}') {
                depth--;
                if (depth == 0) {
                    return text.substring(braceStart, i + 1);
                }
            }
        }
        fail("unbalanced braces for: " + signatureFragment);
        return "";
    }

    /** The smallest index among every marker present in {@code text}, or -1 when none are present. */
    private static int firstOccurrenceOfAny(String text, String... markers) {
        int min = -1;
        for (String marker : markers) {
            int idx = text.indexOf(marker);
            if (idx >= 0 && (min == -1 || idx < min)) {
                min = idx;
            }
        }
        return min;
    }

    @Test
    void everyGatedMethodChecksTheSharedPredicateExactlyOnceAndTheGuardDidNotAddASeventhNoticeSite() {
        String text = withoutCommentLines(readSource(LAUNCHER_SOURCE));

        assertEquals(6, countOccurrences(text, "ComposerCatalogsCheck.isUsable(catalogs)"),
                "exactly six construction sites are gated: MSGBOX, addWindow, addChildWindow, SETOPTS, "
                        + "SETOPTS-in-code (one gate for both its dialogs) and CVS()");
        // The whole-file notReady() count is 7, not 6: six gated open* methods each reuse their own
        // pre-existing notReady() render call (no growth from this plan), plus one pre-existing,
        // unrelated notReady() in the SETOPTS_IN_CODE cue-launch branch that fires when no virtual
        // file is available for the caret's document -- a different failure class than a malformed
        // catalogs payload, and outside every gated method's body.
        assertEquals(7, countOccurrences(text, "ComposerNotices.notReady("),
                "the shape check must reuse each gated method's existing notReady() call rather than "
                        + "adding a new one; six gated methods plus the one pre-existing no-virtual-file "
                        + "notReady() outside all of them");
    }

    @Test
    void openMsgboxChecksTheSharedPredicateOnceBeforeConstructingItsDialog() {
        String body = extractMethodBody(readSource(LAUNCHER_SOURCE), "private static void openMsgbox(");
        assertGatedOnce(body, "openMsgbox");
        assertOrderedBeforeConstruction(body, "openMsgbox", "new MsgboxComposerDialog(");
    }

    @Test
    void openAddWindowChecksTheSharedPredicateOnceBeforeConstructingItsDialog() {
        String body = extractMethodBody(readSource(LAUNCHER_SOURCE), "private static void openAddWindow(");
        assertGatedOnce(body, "openAddWindow");
        assertOrderedBeforeConstruction(body, "openAddWindow", "new AddWindowComposerDialog(");
    }

    @Test
    void openAddChildWindowChecksTheSharedPredicateOnceBeforeConstructingItsDialog() {
        String body = extractMethodBody(readSource(LAUNCHER_SOURCE), "private static void openAddChildWindow(");
        assertGatedOnce(body, "openAddChildWindow");
        assertOrderedBeforeConstruction(body, "openAddChildWindow", "new AddChildWindowComposerDialog(");
    }

    @Test
    void openSetoptsChecksTheSharedPredicateOnceBeforeConstructingItsDialog() {
        String body = extractMethodBody(readSource(LAUNCHER_SOURCE), "private static void openSetopts(");
        assertGatedOnce(body, "openSetopts");
        assertOrderedBeforeConstruction(body, "openSetopts", "new SetoptsComposerDialog(");
    }

    @Test
    void openCvsChecksTheSharedPredicateOnceBeforeConstructingItsDialog() {
        String body = extractMethodBody(readSource(LAUNCHER_SOURCE), "private static void openCvs(");
        assertGatedOnce(body, "openCvs");
        assertOrderedBeforeConstruction(body, "openCvs", "new CvsComposerDialog(");
    }

    /**
     * {@code openSetoptsInCode} is the single dispatcher covering both SETOPTS-in-code dialogs: it
     * never constructs a dialog itself, only dispatches to {@code openSetoptsInCodeComposeNew},
     * {@code openSetoptsInCodeAbsolute} or {@code openSetoptsInCodeChain}, all downstream of this
     * one guard. The ordering check is against the earliest of those three dispatch calls rather
     * than a {@code new} construction, since none appears directly in this body.
     */
    @Test
    void openSetoptsInCodeChecksTheSharedPredicateOnceBeforeDispatchingToAnyDownstreamMethod() {
        String body = extractMethodBody(readSource(LAUNCHER_SOURCE), "private static void openSetoptsInCode(");
        assertGatedOnce(body, "openSetoptsInCode");
        assertOrderedBeforeConstruction(body, "openSetoptsInCode",
                "openSetoptsInCodeComposeNew(", "openSetoptsInCodeAbsolute(", "openSetoptsInCodeChain(");
    }

    private static void assertGatedOnce(String methodBody, String methodName) {
        assertEquals(1, countOccurrences(methodBody, "ComposerCatalogsCheck.isUsable(catalogs)"),
                methodName + " must check the shared predicate exactly once");
        assertEquals(1, countOccurrences(methodBody, "ComposerNotices.notReady("),
                methodName + " must render exactly one not-ready notice, reused for both the null-payload "
                        + "and the malformed-payload case");
    }

    private static void assertOrderedBeforeConstruction(String methodBody, String methodName, String... markers) {
        int checkIndex = methodBody.indexOf("ComposerCatalogsCheck.isUsable(catalogs)");
        int constructionIndex = firstOccurrenceOfAny(methodBody, markers);
        assertTrue(checkIndex >= 0 && constructionIndex >= 0 && checkIndex < constructionIndex,
                methodName + " must check the shared predicate before any dialog construction is reached -- "
                        + "a half-built Swing dialog on the EDT is exactly what this check prevents");
    }

    @Test
    void noSetoptsInCodeDownstreamMethodRepeatsTheCheckTheDispatcherAlreadyPerformed() {
        String text = readSource(LAUNCHER_SOURCE);

        String composeNew = extractMethodBody(text, "private static void openSetoptsInCodeComposeNew(");
        String absolute = extractMethodBody(text, "private static void openSetoptsInCodeAbsolute(");
        String chain = extractMethodBody(text, "private static void openSetoptsInCodeChain(");

        assertEquals(0, countOccurrences(composeNew, "ComposerCatalogsCheck.isUsable("),
                "openSetoptsInCodeComposeNew must not repeat the check its dispatcher already performed");
        assertEquals(0, countOccurrences(absolute, "ComposerCatalogsCheck.isUsable("),
                "openSetoptsInCodeAbsolute must not repeat the check its dispatcher already performed");
        assertEquals(0, countOccurrences(chain, "ComposerCatalogsCheck.isUsable("),
                "openSetoptsInCodeChain must not repeat the check its dispatcher already performed");
    }

    @Test
    void theSharedCheckCarriesNoIntelliJImport() {
        String text = withoutCommentLines(readSource(CATALOGS_CHECK_SOURCE));

        assertEquals(0, countOccurrences(text, "import com.intellij"),
                "ComposerCatalogsCheck must stay a plain-Java class runnable on the plain JUnit 5 classpath");
    }

    @Test
    void noPlatformTestFrameworkCreptIn() {
        String buildText = withoutCommentLines(readSource(BUILD_GRADLE_KTS));

        assertEquals(0, countOccurrences(buildText, "TestFrameworkType"),
                "no platform test framework may be declared in the Gradle build");
        assertEquals(0, countOccurrences(buildText, "BasePlatformTestCase"),
                "no BasePlatformTestCase-derived test may be declared for the catalogs shape check");
    }
}
