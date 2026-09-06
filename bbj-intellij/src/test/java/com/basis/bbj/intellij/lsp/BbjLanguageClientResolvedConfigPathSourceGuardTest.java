package com.basis.bbj.intellij.lsp;

import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.fail;

/**
 * Source-guard fence for the ordering guarantees inside
 * {@link BbjLanguageClient#resolvedConfigPath} that plain JUnit cannot exercise directly: the
 * method needs a live LSP4J launcher and a real IntelliJ {@code Application}/{@code Project} to
 * invoke. This test pins, as a text check on the source, that the cache write stays synchronous
 * and ahead of the deferred balloon, and that the early return for an existing file is in place.
 */
class BbjLanguageClientResolvedConfigPathSourceGuardTest {

    private static final Path GUARDED_SOURCE = Paths.get(
        "src", "main", "java", "com", "basis", "bbj", "intellij", "lsp", "BbjLanguageClient.java")
        .toAbsolutePath();

    private static final String ANNOTATION = "@JsonNotification(\"bbj/resolvedConfigPath\")";
    private static final String INVOKE_LATER = "invokeLater(";

    private static String readGuardedSource() {
        if (!Files.exists(GUARDED_SOURCE)) {
            fail("Guarded source file not found at " + GUARDED_SOURCE);
        }
        try {
            return Files.readString(GUARDED_SOURCE);
        } catch (IOException e) {
            throw new UncheckedIOExceptionForTest(e);
        }
    }

    private static final class UncheckedIOExceptionForTest extends RuntimeException {
        UncheckedIOExceptionForTest(IOException cause) {
            super("Failed to read " + GUARDED_SOURCE, cause);
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
     * Extracts the body of the annotated method, from the annotation up to the closing brace of
     * the enclosing class (the method is the last member of the class), by matching braces.
     */
    private static String extractAnnotatedMethodBody(String text) {
        int annotationIndex = text.indexOf(ANNOTATION);
        if (annotationIndex == -1) {
            fail("Annotation " + ANNOTATION + " not found in " + GUARDED_SOURCE);
        }
        int methodStart = text.indexOf('{', annotationIndex);
        if (methodStart == -1) {
            fail("Could not find the start of the annotated method body");
        }
        int depth = 0;
        for (int i = methodStart; i < text.length(); i++) {
            char c = text.charAt(i);
            if (c == '{') {
                depth++;
            } else if (c == '}') {
                depth--;
                if (depth == 0) {
                    return text.substring(methodStart, i + 1);
                }
            }
        }
        fail("Could not find the matching closing brace of the annotated method body");
        return null;
    }

    @Test
    void theResolvedConfigPathNotificationHandlerExistsExactlyOnce() {
        String text = readGuardedSource();
        assertEquals(1, countOccurrences(text, ANNOTATION),
            "the bbj/resolvedConfigPath notification must be handled by exactly one method");
    }

    @Test
    void theCacheWriteHappensBeforeAnyDeferredWork() {
        String body = extractAnnotatedMethodBody(readGuardedSource());
        int updateIndex = body.indexOf("BbjConfigPathService.getInstance().update(");
        int invokeLaterIndex = body.indexOf(INVOKE_LATER);
        assertTrue(updateIndex != -1, "the cache-write call must be present in the handler body");
        assertTrue(invokeLaterIndex != -1, "the handler must defer the notification through invokeLater");
        assertTrue(updateIndex < invokeLaterIndex,
            "the cache write must happen synchronously, before the deferred invokeLater block");
    }

    @Test
    void theNotificationIsCreatedOnlyInsideTheDeferredBlock() {
        String body = extractAnnotatedMethodBody(readGuardedSource());
        int invokeLaterIndex = body.indexOf(INVOKE_LATER);
        int createNotificationIndex = body.indexOf("createNotification");
        assertTrue(invokeLaterIndex != -1, "the handler must defer the notification through invokeLater");
        assertTrue(createNotificationIndex != -1, "the handler must create a notification");
        assertTrue(createNotificationIndex > invokeLaterIndex,
            "the notification must only be created inside the deferred invokeLater block");
    }

    @Test
    void theWarnOnceGuardIsCheckedOnceBeforeDeferringAnything() {
        String body = extractAnnotatedMethodBody(readGuardedSource());
        assertEquals(1, countOccurrences(body, "shouldWarnOnce("),
            "shouldWarnOnce must be consulted exactly once in the handler body");
        int shouldWarnOnceIndex = body.indexOf("shouldWarnOnce(");
        int invokeLaterIndex = body.indexOf(INVOKE_LATER);
        assertTrue(shouldWarnOnceIndex < invokeLaterIndex,
            "the warn-once guard must be evaluated before the deferred invokeLater block");
    }

    @Test
    void theHandlerReturnsEarlyWhenTheResolvedPathExists() {
        String body = extractAnnotatedMethodBody(readGuardedSource());
        int existsIndex = body.indexOf("result.exists");
        int invokeLaterIndex = body.indexOf(INVOKE_LATER);
        assertTrue(existsIndex != -1, "the handler must inspect result.exists");
        assertTrue(existsIndex < invokeLaterIndex,
            "the exists check must happen before the deferred invokeLater block");

        int lineStart = body.lastIndexOf('\n', existsIndex) + 1;
        int lineEnd = body.indexOf('\n', existsIndex);
        String conditionLine = body.substring(lineStart, lineEnd == -1 ? body.length() : lineEnd);
        assertTrue(conditionLine.trim().startsWith("if "),
            "result.exists must be checked in an if-condition; found: " + conditionLine.trim());

        int returnIndex = body.indexOf("return;", existsIndex);
        assertTrue(returnIndex != -1 && returnIndex < invokeLaterIndex,
            "the branch checking result.exists must return before the deferred invokeLater block");
    }
}
