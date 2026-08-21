package com.basis.bbj.intellij.lsp;

import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.fail;

class BbjLanguageServerSourceGuardTest {

    private static final Path GUARDED_SOURCE = Paths.get(
            "src", "main", "java", "com", "basis", "bbj", "intellij", "lsp", "BbjLanguageServer.java")
            .toAbsolutePath();

    private static String readGuardedSource() {
        Path resolved = GUARDED_SOURCE;
        if (!Files.exists(resolved)) {
            fail("Guarded source file not found at " + resolved);
        }
        try {
            return Files.readString(resolved);
        } catch (IOException e) {
            throw new UncheckedIOExceptionForTest(resolved, e);
        }
    }

    private static final class UncheckedIOExceptionForTest extends RuntimeException {
        UncheckedIOExceptionForTest(Path resolved, IOException cause) {
            super("Failed to read " + resolved, cause);
        }
    }

    @Test
    void launchFileContainsNoQuotedUnqualifiedExecutableNameLiteral() {
        String text = readGuardedSource();
        assertEquals(0, countOccurrences(text, "\"node\""));
    }

    @Test
    void resolverNamePrecedesTheCommandLineConstruction() {
        String text = readGuardedSource();
        int resolverIndex = text.indexOf("NodeExecutableResolver");
        int commandLineIndex = text.indexOf("new GeneralCommandLine(");
        assertTrue(resolverIndex >= 0, "NodeExecutableResolver is not referenced in the launch file");
        assertTrue(commandLineIndex >= 0, "new GeneralCommandLine( is not present in the launch file");
        assertTrue(resolverIndex < commandLineIndex,
                "NodeExecutableResolver must be named before the command-line construction");
    }

    @Test
    void commandLineIsConstructedExactlyOnce() {
        String text = readGuardedSource();
        assertEquals(1, countOccurrences(text, "new GeneralCommandLine("));
    }

    @Test
    void workingDirectoryLineIsPresentExactlyOnceInItsOriginalForm() {
        String text = readGuardedSource();
        assertEquals(1, countOccurrences(text, "cmd.setWorkDirectory(new File(project.getBasePath()))"));
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
}
