package com.basis.bbj.intellij.config;

import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.fail;

/**
 * Source-guard fence: {@code BbjConfigFileTypeOverrider} must reach exactly one decision point --
 * {@code isConfigFile(} -- and do no filesystem probing, content reading, or server-proxy call of
 * its own, since {@code getOverriddenFileType} runs synchronously on indexing threads.
 * Also fences {@code BbjConfigPathService}'s re-detection call: exactly one {@code reparseFiles}
 * call, and it must sit inside an {@code invokeLater} block so the cache write itself stays
 * synchronous.
 */
class BbjConfigFileTypeOverriderSourceGuardTest {

    private static final Path OVERRIDER_SOURCE = Paths.get(
            "src", "main", "java", "com", "basis", "bbj", "intellij", "config", "BbjConfigFileTypeOverrider.java")
            .toAbsolutePath();
    private static final Path SERVICE_SOURCE = Paths.get(
            "src", "main", "java", "com", "basis", "bbj", "intellij", "config", "BbjConfigPathService.java")
            .toAbsolutePath();

    private static String readSource(Path path) {
        if (!Files.exists(path)) {
            fail("Guarded source not found at " + path);
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

    @Test
    void overriderReachesTheSharedPredicateExactlyOnceAndReturnsExactlyOneFileTypeConstant() {
        String text = readSource(OVERRIDER_SOURCE);
        assertEquals(1, countOccurrences(text, "isConfigFile("),
                "the override decision must not be duplicated -- it must delegate to the one shared predicate exactly once");
        assertEquals(1, countOccurrences(text, "BbjConfigFileType.INSTANCE"),
                "exactly one file type constant may be returned");
    }

    @Test
    void overriderDoesNoDirectFileConstruction() {
        String text = readSource(OVERRIDER_SOURCE);
        assertEquals(0, countOccurrences(text, "new File("),
                "no direct java.io.File construction may occur on an indexing thread");
    }

    @Test
    void overriderDoesNoVirtualFileContentRead() {
        String text = readSource(OVERRIDER_SOURCE);
        assertEquals(0, countOccurrences(text, "contentsToByteArray("),
                "no VirtualFile content read may occur on an indexing thread");
        assertEquals(0, countOccurrences(text, "getInputStream("),
                "no VirtualFile content read may occur on an indexing thread");
    }

    @Test
    void overriderMakesNoComposerServerProxyCall() {
        String text = readSource(OVERRIDER_SOURCE);
        assertEquals(0, countOccurrences(text, "BbjComposerServer"),
                "no call into the composer-server proxy may occur on an indexing thread");
    }

    @Test
    void serviceCallsReparseFilesExactlyOnceInsideInvokeLater() {
        String text = readSource(SERVICE_SOURCE);
        assertEquals(1, countOccurrences(text, "reparseFiles("),
                "exactly one reparseFiles call must trigger re-detection after the resolved path changes");

        int reparseIndex = text.indexOf("reparseFiles(");
        int invokeLaterIndex = text.lastIndexOf("invokeLater(", reparseIndex);
        assertEquals(true, invokeLaterIndex >= 0,
                "reparseFiles must be called from inside an invokeLater block");

        int closingBeforeReparse = text.indexOf("});", invokeLaterIndex);
        assertEquals(true, closingBeforeReparse >= reparseIndex,
                "the reparseFiles call must be nested inside the invokeLater block, not after its closing brace");
    }
}
