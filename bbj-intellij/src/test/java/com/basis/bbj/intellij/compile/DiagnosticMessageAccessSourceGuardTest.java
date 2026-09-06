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
 * Pins the #571 fix so it cannot regress silently. The plugin's dependency on the client
 * library that defines a diagnostic's message accessor is resolved by the IDE at run time, and
 * the plugin descriptor has no way to constrain its version -- so a typed accessor call, or an
 * import naming one client-library generation's message type, is a latent crash on any install
 * whose client library differs from the build's. This guard fails the build the moment either
 * reappears in the rendering seam.
 */
class DiagnosticMessageAccessSourceGuardTest {

    private static final Path PRESENTER_SOURCE = Paths.get(
            "src", "main", "java", "com", "basis", "bbj", "intellij", "compile", "CompileResultPresenter.java")
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
            if (trimmed.startsWith("*") || trimmed.startsWith("//") || trimmed.startsWith("/*")) {
                continue;
            }
            result.append(line).append('\n');
        }
        return result.toString();
    }

    @Test
    void theRenderingSeamCallsNoTypedMessageAccessor() {
        String text = withoutCommentLines(readSource(PRESENTER_SOURCE));

        assertEquals(0, countOccurrences(text, ".getMessage()"),
            "CompileResultPresenter.java must not call a diagnostic's message accessor through a "
                + "typed, compile-time method descriptor -- the return type of that accessor "
                + "differs across client-library generations, and a typed call site cannot "
                + "compile against, or resolve on, more than one of them");
    }

    @Test
    void theMessageIsReadThroughAReflectiveLookupWithAFallback() {
        String text = readSource(PRESENTER_SOURCE);

        assertTrue(text.contains("getMethod"),
            "CompileResultPresenter.java must resolve the message accessor via reflection "
                + "(Class.getMethod), not a typed call site");
        assertTrue(text.contains("\"getMessage\""),
            "the accessor name must be looked up by its quoted string literal, not a typed "
                + "method reference");
        assertTrue(text.contains("ReflectiveOperationException"),
            "the reflective lookup must catch ReflectiveOperationException so a resolution or "
                + "invocation failure degrades instead of propagating into the background task");
    }

    @Test
    void theRenderingSeamBindsToNoClientLibraryMessageType() {
        String text = withoutCommentLines(readSource(PRESENTER_SOURCE));

        assertEquals(0, countOccurrences(text, "MarkupContent"),
            "naming the markup-shaped message type would make this file compile only against "
                + "the client-library generation that defines it");
        assertEquals(0, countOccurrences(text, "jsonrpc.messages.Either"),
            "naming the two-branch message type would make this file compile only against the "
                + "client-library generation that defines it");
    }
}
