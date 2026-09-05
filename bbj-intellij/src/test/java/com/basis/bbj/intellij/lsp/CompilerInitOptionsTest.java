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

    @Test
    void aWhitespaceOnlyDirectoryNormalisesToTheEmptyString() {
        assertEquals("", CompilerInitOptions.normalizeOutputDirectory("   "));
        assertEquals("", CompilerInitOptions.normalizeOutputDirectory("\t"));
    }

    @Test
    void surroundingWhitespaceIsTrimmedButTheInteriorIsUntouched() {
        assertEquals("/tmp/my out", CompilerInitOptions.normalizeOutputDirectory("  /tmp/my out  "));
    }

    @Test
    void aWindowsStylePathIsForwardedUnchanged() {
        assertEquals("C:\\Users\\bbj\\out",
                CompilerInitOptions.normalizeOutputDirectory("C:\\Users\\bbj\\out"));
    }

    @Test
    void normalizingTwiceGivesTheSameResult() {
        String[] inputs = {"/tmp/out", null, "", "   ", "\t", "  /tmp/my out  ", "C:\\Users\\bbj\\out"};
        for (String input : inputs) {
            String once = CompilerInitOptions.normalizeOutputDirectory(input);
            String twice = CompilerInitOptions.normalizeOutputDirectory(once);
            assertEquals(once, twice, "normalizing \"" + input + "\" twice must be stable");
        }
    }

    @Test
    void theSeamHasNoFilesystemDependency() {
        assertEquals("/does/not/exist",
                CompilerInitOptions.normalizeOutputDirectory("/does/not/exist"));
    }
}
