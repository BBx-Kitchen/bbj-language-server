package com.basis.bbj.intellij.lsp;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

/**
 * Behavioural coverage for {@link CompilerInitOptions#normalizeOutputDirectory(String)} and its
 * flat initialization-options key (#571).
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

    @Test
    void theTriggerKeyIsTheFlatNameTheServerReads() {
        assertEquals("compilerTrigger", CompilerInitOptions.COMPILER_TRIGGER_KEY);
    }

    @Test
    void eachWireValueNormalisesToItself() {
        assertEquals("debounced", CompilerInitOptions.normalizeTrigger("debounced"));
        assertEquals("on-save", CompilerInitOptions.normalizeTrigger("on-save"));
        assertEquals("off", CompilerInitOptions.normalizeTrigger("off"));
    }

    @Test
    void nullEmptyBlankAndUnknownTriggerValuesNormaliseToDebounced() {
        assertEquals("debounced", CompilerInitOptions.normalizeTrigger(null));
        assertEquals("debounced", CompilerInitOptions.normalizeTrigger(""));
        assertEquals("debounced", CompilerInitOptions.normalizeTrigger("   "));
        assertEquals("debounced", CompilerInitOptions.normalizeTrigger("sometimes"));
    }

    @Test
    void aPaddedTriggerValueIsTrimmed() {
        assertEquals("on-save", CompilerInitOptions.normalizeTrigger("  on-save  "));
    }

    @Test
    void normalizingTheTriggerTwiceIsStable() {
        String[] inputs = {"debounced", "on-save", "off", null, "", "   ", "sometimes", "  on-save  "};
        for (String input : inputs) {
            String once = CompilerInitOptions.normalizeTrigger(input);
            String twice = CompilerInitOptions.normalizeTrigger(once);
            assertEquals(once, twice, "normalizing trigger \"" + input + "\" twice must be stable");
        }
    }

    @Test
    void triggerDisplayNamesRoundTripThroughFromDisplayName() {
        for (String wireValue : new String[] {"debounced", "on-save", "off"}) {
            String displayName = CompilerInitOptions.triggerDisplayName(wireValue);
            assertEquals(wireValue, CompilerInitOptions.triggerFromDisplayName(displayName),
                    "round trip for " + wireValue + " must return the original wire value");
        }
    }

    @Test
    void triggerDisplayNamesAreExactlyDebouncedOnSaveOffInOrder() {
        assertEquals(java.util.List.of("Debounced", "On save", "Off"),
                CompilerInitOptions.TRIGGER_DISPLAY_NAMES);
    }
}
