package com.basis.bbj.intellij.lsp;

import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.fail;
import static com.basis.bbj.intellij.lsp.JavaSourceScan.stripComments;

/**
 * Cross-language contract for the two interop connection keys in the {@code initializationOptions}
 * IntelliJ sends at {@code initialize}: the language server reads {@code interopHost} and
 * {@code interopPort} (and VS Code writes the same two names), so the IntelliJ factory must use
 * exactly those names. A rename on either side alone -- the factory, the server's reader or VS
 * Code's writer -- fails here instead of silently leaving the server on its default
 * {@code localhost:5008}. Every source is read only as plain text via {@link Files#readString},
 * never parsed and never reflected over.
 */
class InteropInitOptionsContractTest {

    private static final Path FACTORY_JAVA = Paths.get(
        "src", "main", "java", "com", "basis", "bbj", "intellij", "lsp", "BbjLanguageServerFactory.java")
        .toAbsolutePath().normalize();

    private static final Path WS_MANAGER_TS = Paths.get(
        "..", "bbj-vscode", "src", "language", "bbj-ws-manager.ts")
        .toAbsolutePath().normalize();

    private static final Path EXTENSION_TS = Paths.get(
        "..", "bbj-vscode", "src", "extension.ts")
        .toAbsolutePath().normalize();

    private static final String HOST_KEY = "interopHost";

    private static final String PORT_KEY = "interopPort";

    /** The spelling IntelliJ used to send, which the server never read. Built from parts on purpose. */
    private static final String OLD_HOST_KEY = "java" + "Interop" + "Host";

    private static final String OLD_PORT_KEY = "java" + "Interop" + "Port";

    private static String readSource(Path path) {
        if (!Files.exists(path)) {
            fail("Source not found at " + path);
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

    private static String doubleQuoted(String literal) {
        return "\"" + literal + "\"";
    }

    @Test
    void theFactoryWritesTheInteropKeysTheServerReads() {
        String java = stripComments(readSource(FACTORY_JAVA));

        assertEquals(1, countOccurrences(java, doubleQuoted(HOST_KEY)),
            "the factory must write the host under " + doubleQuoted(HOST_KEY) + " exactly once in "
                + FACTORY_JAVA);
        assertEquals(1, countOccurrences(java, doubleQuoted(PORT_KEY)),
            "the factory must write the port under " + doubleQuoted(PORT_KEY) + " exactly once in "
                + FACTORY_JAVA);
    }

    @Test
    void theFactoryWritesNoJavaInteropPrefixedWireKey() {
        String java = stripComments(readSource(FACTORY_JAVA));

        assertEquals(0, countOccurrences(java, doubleQuoted(OLD_HOST_KEY)),
            "the factory still writes the host under " + doubleQuoted(OLD_HOST_KEY)
                + ", a name the server never reads");
        assertEquals(0, countOccurrences(java, doubleQuoted(OLD_PORT_KEY)),
            "the factory still writes the port under " + doubleQuoted(OLD_PORT_KEY)
                + ", a name the server never reads");
    }

    @Test
    void theServerReadsTheSameTwoKeys() {
        String ts = readSource(WS_MANAGER_TS);

        assertTrue(ts.contains("initializationOptions." + HOST_KEY),
            "the server no longer reads initializationOptions." + HOST_KEY + " in " + WS_MANAGER_TS);
        assertTrue(ts.contains("initializationOptions." + PORT_KEY),
            "the server no longer reads initializationOptions." + PORT_KEY + " in " + WS_MANAGER_TS);
    }

    @Test
    void vsCodeSendsTheSameTwoKeys() {
        String ts = readSource(EXTENSION_TS);

        assertTrue(ts.contains(HOST_KEY + ":"),
            "VS Code no longer writes " + HOST_KEY + ": in " + EXTENSION_TS);
        assertTrue(ts.contains(PORT_KEY + ":"),
            "VS Code no longer writes " + PORT_KEY + ": in " + EXTENSION_TS);
    }
}
