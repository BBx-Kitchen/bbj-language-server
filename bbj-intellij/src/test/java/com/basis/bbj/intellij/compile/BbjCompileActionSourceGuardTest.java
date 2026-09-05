package com.basis.bbj.intellij.compile;

import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.fail;

/**
 * Pins the #571 compile wiring: the round trip stays off the dispatch thread, the
 * document save always precedes the request, and no compiler invocation logic has reappeared on
 * the IntelliJ side. A future regression means one of three things happened — the round trip
 * moved back onto the dispatch thread, the save stopped happening before the request, or compiler
 * invocation logic crept back into {@code BbjCompileAction} — each of which this guard fails the
 * build for instead of letting it fail silently in production.
 */
class BbjCompileActionSourceGuardTest {

    private static final Path COMPILE_ACTION_SOURCE = Paths.get(
            "src", "main", "java", "com", "basis", "bbj", "intellij", "actions", "BbjCompileAction.java")
            .toAbsolutePath();

    private static final Path COMPOSER_SERVER_SOURCE = Paths.get(
            "src", "main", "java", "com", "basis", "bbj", "intellij", "composer", "BbjComposerServer.java")
            .toAbsolutePath();

    private static final Path PRESENTER_SOURCE = Paths.get(
            "src", "main", "java", "com", "basis", "bbj", "intellij", "compile", "CompileResultPresenter.java")
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

    /** Drops comment/javadoc lines so a rationale sentence can't trip a "zero times" assertion. */
    private static String withoutCommentLines(String text) {
        StringBuilder result = new StringBuilder();
        for (String line : text.split("\n", -1)) {
            String trimmed = line.trim();
            if (trimmed.startsWith("*") || trimmed.startsWith("//")) {
                continue;
            }
            result.append(line).append('\n');
        }
        return result.toString();
    }

    @Test
    void assertIsNonDispatchThreadSitsInsideTheBackgroundBodyAheadOfTheFirstBlockingCall() {
        String text = readSource(COMPILE_ACTION_SOURCE);

        int taskIndex = text.indexOf("Task.Backgroundable");
        int assertIndex = text.indexOf("assertIsNonDispatchThread()");
        int serverIndex = text.indexOf("BbjComposerService.server(");

        assertTrue(taskIndex >= 0, "Task.Backgroundable is not present in BbjCompileAction.java");
        assertTrue(assertIndex >= 0, "assertIsNonDispatchThread() is not present in BbjCompileAction.java");
        assertTrue(serverIndex >= 0, "BbjComposerService.server( is not present in BbjCompileAction.java");
        assertEquals(1, countOccurrences(text, "assertIsNonDispatchThread()"),
                "the assertion must appear exactly once");
        assertTrue(taskIndex < assertIndex,
                "the assertion must be inside the background body, after Task.Backgroundable");
        assertTrue(assertIndex < serverIndex,
                "the assertion must run before the first blocking call, BbjComposerService.server(");
    }

    @Test
    void theDocumentIsSavedBeforeTheBackgroundTaskIsQueued() {
        String text = readSource(COMPILE_ACTION_SOURCE);

        int saveIndex = text.indexOf("saveDocument(");
        int taskIndex = text.indexOf("Task.Backgroundable");

        assertTrue(saveIndex >= 0, "saveDocument( is not present in BbjCompileAction.java");
        assertEquals(1, countOccurrences(text, "saveDocument("),
                "the save must happen exactly once");
        assertTrue(saveIndex < taskIndex,
                "the save must precede the background task, so the file on disk matches the editor");
    }

    @Test
    void theSaveIsUnconditionalAndReadsNoSetting() {
        String text = withoutCommentLines(readSource(COMPILE_ACTION_SOURCE));

        assertEquals(0, countOccurrences(text, "autoSaveBeforeRun"),
                "the compile save must not be gated on autoSaveBeforeRun");
        assertEquals(0, countOccurrences(text, "BbjSettings.getInstance()"),
                "the save path must not read any BbjSettings value");
    }

    @Test
    void noCompilerInvocationLogicLeakedOntoTheIntelliJSide() {
        String text = withoutCommentLines(readSource(COMPILE_ACTION_SOURCE));

        assertEquals(0, countOccurrences(text, "ProcessBuilder"),
                "no process launch belongs on the IntelliJ side (#571)");
        assertEquals(0, countOccurrences(text, "GeneralCommandLine"),
                "no command line construction belongs on the IntelliJ side (#571)");
        assertEquals(0, countOccurrences(text, "resolveBbjBinary"),
                "bbjcpl resolution belongs to the language server, not this action");
        assertEquals(0, countOccurrences(readSource(COMPILE_ACTION_SOURCE), "Triggered for file"),
                "the old no-op stub line must be gone");
    }

    @Test
    void theUpdateGatingAndTheHashtag571ReferenceAreUnchanged() {
        String text = readSource(COMPILE_ACTION_SOURCE);

        assertTrue(text.contains("ext.equals(\"bbj\")"), "the .bbj gating literal must be unchanged");
        assertTrue(text.contains("ext.equals(\"bbx\")"), "the .bbx gating literal must be unchanged");
        assertTrue(text.contains("ext.equals(\"src\")"), "the .src gating literal must be unchanged");
        assertTrue(text.contains("ServerStatus.started"), "the server-ready gating must be unchanged");
        assertTrue(text.contains("setEnabledAndVisible("), "the visibility gating call must be unchanged");
        assertTrue(text.contains("#571"), "the wiring must still explain why it exists (#571)");
    }

    @Test
    void bbjComposerServerDeclaresTheCompileRequestExactlyOnce() {
        String text = readSource(COMPOSER_SERVER_SOURCE);

        assertEquals(1, countOccurrences(text, "@JsonRequest(\"bbj/compile\")"),
                "bbj/compile must be declared exactly once on the server interface");
    }

    @Test
    void theResultPresenterCarriesNoIntelliJImport() {
        String text = readSource(PRESENTER_SOURCE);

        assertEquals(0, countOccurrences(text, "import com.intellij"),
                "the rendering seam must stay a plain-Java class");
    }

    @Test
    void pluginXmlStillRegistersTheCompileAction() {
        String text = readSource(PLUGIN_XML);

        assertTrue(text.contains("com.basis.bbj.intellij.actions.BbjCompileAction"),
                "plugin.xml must still register BbjCompileAction as the bbj.compile action class");
    }
}
