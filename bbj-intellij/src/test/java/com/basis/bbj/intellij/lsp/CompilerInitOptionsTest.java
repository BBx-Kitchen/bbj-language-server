package com.basis.bbj.intellij.lsp;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

/**
 * Behavioural coverage for {@link CompilerInitOptions#normalizeOutputDirectory(String)} and its
 * flat initialization-options key (#571, PARITY-01, D-05).
 */
class CompilerInitOptionsTest {

    @Test
    void aConfiguredDirectoryIsForwardedVerbatim() {
        assertEquals("/tmp/out", CompilerInitOptions.normalizeOutputDirectory("/tmp/out"));
    }

    @Test
    void anUnsetDirectoryNormalisesToTheEmptyString() {
        assertEquals("", CompilerInitOptions.normalizeOutputDirectory(null));
        assertEquals("", CompilerInitOptions.normalizeOutputDirectory(""));
    }

    @Test
    void theInitializationKeyIsTheFlatNameTheServerReads() {
        assertEquals("compilerOutputDirectory", CompilerInitOptions.COMPILER_OUTPUT_DIRECTORY_KEY);
    }
}
