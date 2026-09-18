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
 * Pins the #630 consolidation of the addWindow and addChildWindow dialogs onto one shared base,
 * {@link AddWindowFamilyComposerDialogBase}: the preview seam, the debounce wiring, the
 * sequence-counter discipline and the OK-gating discipline each live there exactly once, reached
 * by both subclasses through inheritance rather than duplicated per dialog file again. Its own
 * private copies of every helper below -- never a shared test utility -- so a bad edit here can
 * never weaken another guard in this suite.
 */
class AddWindowFamilyComposerDialogBaseSourceGuardTest {

    private static final Path BASE_SOURCE = composerSource("AddWindowFamilyComposerDialogBase.java");
    private static final Path ADD_WINDOW_SOURCE = composerSource("AddWindowComposerDialog.java");
    private static final Path ADD_CHILD_WINDOW_SOURCE = composerSource("AddChildWindowComposerDialog.java");

    private static Path composerSource(String fileName) {
        return Paths.get(
                "src", "main", "java", "com", "basis", "bbj", "intellij", "composer", fileName)
                .toAbsolutePath();
    }

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
     * Drops comment/javadoc lines so a rationale sentence naming a guarded literal (including this
     * class's own javadoc) can never satisfy or trip a count-based assertion. Applied ahead of
     * every count-based assertion in this class without exception.
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

    @Test
    void theBaseDeclaresExactlyOneOfEachSeamConstruction() {
        String text = withoutCommentLines(readSource(BASE_SOURCE));
        assertEquals(1, countOccurrences(text, "new PreviewDebouncer("),
                "the base must construct exactly one PreviewDebouncer");
        assertEquals(1, countOccurrences(text, "new AlarmScheduler(getDisposable())"),
                "the base must construct exactly one AlarmScheduler over its own disposable");
        assertEquals(1, countOccurrences(text, "ComposerFlow.once("),
                "the base must wrap its notifier in exactly one ComposerFlow.once(");
        assertEquals(1, countOccurrences(text, "PREVIEW_DEBOUNCE_MS = 300L"),
                "the base must declare exactly one PREVIEW_DEBOUNCE_MS = 300L");
        assertEquals(0, countOccurrences(text, "new Alarm("),
                "the base must not create a bespoke Alarm of its own -- AlarmScheduler is the only Alarm owner");
        assertEquals(1, countOccurrences(text, "this::refresh"),
                "the base must reference refresh() exactly once -- as the PreviewDebouncer's own action");
    }

    @Test
    void theBaseConstructorRequiresANonNullProject() {
        String text = readSource(BASE_SOURCE);
        assertEquals(0, countOccurrences(text, "@Nullable Project project"),
                "the base must never declare its project parameter @Nullable -- it is wired straight into "
                        + "ComposerNoticeRenderer.render's @NotNull Project parameter");
        assertTrue(countOccurrences(text, "@NotNull Project project") >= 1,
                "the base must declare its project parameter @NotNull, matching "
                        + "ComposerNoticeRenderer.render's contract");
    }

    @Test
    void scheduleRefreshDisablesOkAdvancesTheSequenceAndTriggersTheDebouncerExactlyOnceEach() {
        String body = extractMethodBody(withoutCommentLines(readSource(BASE_SOURCE)), "void scheduleRefresh(");
        assertEquals(1, countOccurrences(body, "setOKActionEnabled(false)"),
                "scheduleRefresh() must disable OK exactly once, synchronously, before scheduling the debounced preview");
        assertEquals(1, countOccurrences(body, "seq.incrementAndGet()"),
                "scheduleRefresh() must advance the sequence number exactly once, invalidating any response "
                        + "already in flight before this keystroke");
        assertEquals(1, countOccurrences(body, "previewDebouncer.trigger()"),
                "scheduleRefresh() must trigger the debouncer exactly once");
        int incrementIndex = body.indexOf("seq.incrementAndGet()");
        int triggerIndex = body.indexOf("previewDebouncer.trigger()");
        assertTrue(incrementIndex >= 0 && triggerIndex >= 0 && incrementIndex < triggerIndex,
                "scheduleRefresh() must advance the sequence number before triggering the debouncer");
    }

    @Test
    void previewUnavailableDelegatesToTheSharedSwingHelperAndDisablesOkExactlyOnceEach() {
        String body = extractMethodBody(withoutCommentLines(readSource(BASE_SOURCE)), "void previewUnavailable(");
        assertEquals(1, countOccurrences(body, "ComposerSwingHelpers.previewUnavailable("),
                "previewUnavailable(String) must delegate to ComposerSwingHelpers.previewUnavailable( exactly once");
        assertEquals(1, countOccurrences(body, "setOKActionEnabled(false)"),
                "previewUnavailable(String) must disable OK exactly once");
    }

    @Test
    void theAbstractRefreshDeclarationCarriesNoBodyOrAssertion() {
        String text = readSource(BASE_SOURCE);
        int abstractDeclarationIndex = text.indexOf("protected abstract void refresh(");
        assertTrue(abstractDeclarationIndex >= 0,
                "the abstract refresh() declaration is not present in AddWindowFamilyComposerDialogBase.java");

        String abstractDeclarationLine = text.substring(
                text.lastIndexOf('\n', abstractDeclarationIndex) + 1,
                text.indexOf('\n', abstractDeclarationIndex));
        assertTrue(abstractDeclarationLine.trim().endsWith(";"),
                "the abstract declaration has no body, so it cannot and must not carry the assertion");
    }

    @Test
    void bothSubclassesDelegateToTheSharedBaseExactlyOnce() {
        for (Path source : java.util.List.of(ADD_WINDOW_SOURCE, ADD_CHILD_WINDOW_SOURCE)) {
            String text = withoutCommentLines(readSource(source));
            assertEquals(1, countOccurrences(text, "extends AddWindowFamilyComposerDialogBase"),
                    source.getFileName() + " must extend AddWindowFamilyComposerDialogBase exactly once");
            assertEquals(1, countOccurrences(text, "flow.observe("),
                    source.getFileName() + " must hand its own preview request to the inherited flow.observe( exactly once");
            assertEquals(2, countOccurrences(text, "mySeq == seq.get()"),
                    source.getFileName() + " must check the sequence on both the success path and the failure path");
        }
    }

    @Test
    void neitherSubclassReintroducesTheSeamOrTheHelpersTheBaseNowOwns() {
        for (Path source : java.util.List.of(ADD_WINDOW_SOURCE, ADD_CHILD_WINDOW_SOURCE)) {
            String text = withoutCommentLines(readSource(source));
            for (String forbidden : new String[]{
                    "new PreviewDebouncer(", "new AlarmScheduler(", "ComposerFlow.once(", "PREVIEW_DEBOUNCE_MS",
                    "private void scheduleRefresh()", "private static void setSelected(", "private void prefill("}) {
                assertEquals(0, countOccurrences(text, forbidden),
                        source.getFileName() + " must not reintroduce \"" + forbidden + "\" -- it is inherited from the base");
            }
        }
    }
}
