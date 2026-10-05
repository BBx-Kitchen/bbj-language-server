package com.basis.bbj.intellij.tokenized;

import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.fail;

/**
 * Pins the magic bytes of a tokenized BBj program to the TypeScript definition the VS Code
 * extension uses, so a change on one side alone fails this suite.
 */
class TokenizedBbjContractTest {

    private static final Path TYPESCRIPT_SOURCE =
            Paths.get("..", "bbj-vscode", "src", "tokenized-bbj.ts").toAbsolutePath().normalize();

    private static final String TYPESCRIPT_MAGIC = "Uint8Array.from([0x3c, 0x3c, 0x62, 0x62, 0x6a, 0x3e, 0x3e])";

    @Test
    void theTypeScriptSideDefinesTheSevenMagicBytes() throws IOException {
        if (!Files.exists(TYPESCRIPT_SOURCE)) {
            fail("The VS Code definition of the magic bytes was not found at " + TYPESCRIPT_SOURCE);
        }
        String text = Files.readString(TYPESCRIPT_SOURCE);

        assertTrue(text.contains(TYPESCRIPT_MAGIC),
                "tokenized-bbj.ts no longer defines the magic as " + TYPESCRIPT_MAGIC);
    }

    @Test
    void theJavaSideDefinesExactlyTheSameBytes() {
        assertArrayEquals(
                new byte[] {0x3c, 0x3c, 0x62, 0x62, 0x6a, 0x3e, 0x3e},
                TokenizedBbj.MAGIC,
                "the Java magic differs from the one in tokenized-bbj.ts");
    }
}
