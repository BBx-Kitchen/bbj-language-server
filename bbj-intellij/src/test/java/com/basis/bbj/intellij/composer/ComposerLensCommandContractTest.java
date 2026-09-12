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
 * Cross-language contract for the composer cue command id and its mapped kinds (#650), following
 * {@code ComposerRequestContractTest}'s quoted-literal cross-language read pattern: the command id
 * and every wire kind this plugin currently routes must appear as quoted literals in the language
 * server's own {@code composer-lens-contract.ts}, and {@code plugin.xml} must declare the action id
 * exactly once. Renaming the command on one side alone -- {@link ComposerLensKinds}, the language
 * server's contract module, or the plugin descriptor -- fails here instead of only at click time in
 * a live IDE, because each read is independent: {@code composer-lens-contract.ts} is read as plain
 * text, {@code plugin.xml} is read as plain text, and {@link ComposerLensKinds#OPEN_COMPOSER_AT_COMMAND}
 * is read from compiled Java, so no single edit can keep all three assertions passing without the
 * id actually staying identical everywhere.
 */
class ComposerLensCommandContractTest {

    private static final Path COMPOSER_LENS_CONTRACT_TS = Paths.get(
        "..", "bbj-vscode", "src", "composer-lens-contract.ts").toAbsolutePath().normalize();

    private static final Path PLUGIN_XML = Paths.get(
        "src", "main", "resources", "META-INF", "plugin.xml").toAbsolutePath();

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

    @Test
    void theCommandIdIsAQuotedLiteralInTheLanguageServersCueContract() {
        String contractSource = readSource(COMPOSER_LENS_CONTRACT_TS);

        assertTrue(contractSource.contains("'" + ComposerLensKinds.OPEN_COMPOSER_AT_COMMAND + "'"),
            "expected the quoted literal '" + ComposerLensKinds.OPEN_COMPOSER_AT_COMMAND
                + "' in " + COMPOSER_LENS_CONTRACT_TS);
    }

    @Test
    void everyMappedWireKindAppearsQuotedInTheLanguageServersCueContract() {
        String contractSource = readSource(COMPOSER_LENS_CONTRACT_TS);

        for (String wireKind : ComposerLensKinds.mappedWireKinds()) {
            boolean present = contractSource.contains("'" + wireKind + "'")
                || contractSource.contains("\"" + wireKind + "\"");
            assertTrue(present, "wire kind '" + wireKind + "' not found as a quoted literal in "
                + COMPOSER_LENS_CONTRACT_TS);
        }
    }

    @Test
    void pluginXmlDeclaresTheCommandIdExactlyOnce() {
        String pluginXml = readSource(PLUGIN_XML);
        String expected = "id=\"" + ComposerLensKinds.OPEN_COMPOSER_AT_COMMAND + "\"";

        assertEquals(1, countOccurrences(pluginXml, expected),
            "expected plugin.xml to declare " + expected + " exactly once");
    }
}
