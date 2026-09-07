package com.basis.bbj.intellij;

import org.junit.jupiter.api.Test;

import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Behavioural coverage for {@link InteropPortPresentation}: each of the four detection states
 * gets one exact hint string, composed from {@link BbjInteropPortDetector}'s own constants, and
 * the three auto-detect-on branches are pairwise distinct.
 */
class InteropPortPresentationTest {

    @Test
    void autoDetectOffReturnsASingleSpaceRegardlessOfTheLookup() {
        assertEquals(" ", InteropPortPresentation.hint(false, BbjInteropPortDetector.NOT_DETECTED));
        assertEquals(" ", InteropPortPresentation.hint(false,
                new BbjInteropPortDetector.PortLookup(6000, true, false)));
    }

    @Test
    void detectedAndEnabledNamesTheKey() {
        BbjInteropPortDetector.PortLookup lookup = new BbjInteropPortDetector.PortLookup(6000, true, false);

        String hint = InteropPortPresentation.hint(true, lookup);

        assertTrue(hint.contains(BbjInteropPortDetector.ADDR_KEY));
    }

    @Test
    void detectedAndDisabledNamesBothTheKeyAndTheDisabledService() {
        BbjInteropPortDetector.PortLookup lookup = new BbjInteropPortDetector.PortLookup(6000, true, true);

        String hint = InteropPortPresentation.hint(true, lookup);

        assertTrue(hint.contains(BbjInteropPortDetector.ADDR_KEY));
        assertTrue(hint.toLowerCase().contains("disabled"));
    }

    @Test
    void notDetectedNamesTheDefaultPortAndSaysNoPortWasFound() {
        String hint = InteropPortPresentation.hint(true, BbjInteropPortDetector.NOT_DETECTED);

        assertTrue(hint.contains(String.valueOf(BbjInteropPortDetector.DEFAULT_PORT)));
        assertTrue(hint.toLowerCase().contains("no port was found"));
    }

    @Test
    void noHintIsNullOrEmptyForAnyInput() {
        String[] hints = {
                InteropPortPresentation.hint(false, BbjInteropPortDetector.NOT_DETECTED),
                InteropPortPresentation.hint(true, new BbjInteropPortDetector.PortLookup(6000, true, false)),
                InteropPortPresentation.hint(true, new BbjInteropPortDetector.PortLookup(6000, true, true)),
                InteropPortPresentation.hint(true, BbjInteropPortDetector.NOT_DETECTED),
        };
        for (String hint : hints) {
            assertFalse(hint == null || hint.isEmpty());
        }
    }

    @Test
    void theThreeAutoDetectOnBranchesArePairwiseDistinct() {
        String detectedEnabled = InteropPortPresentation.hint(true,
                new BbjInteropPortDetector.PortLookup(6000, true, false));
        String detectedDisabled = InteropPortPresentation.hint(true,
                new BbjInteropPortDetector.PortLookup(6000, true, true));
        String notDetected = InteropPortPresentation.hint(true, BbjInteropPortDetector.NOT_DETECTED);

        Set<String> distinct = Set.of(detectedEnabled, detectedDisabled, notDetected);
        assertEquals(3, distinct.size(), "the three auto-detect-on branches must be pairwise distinct");
    }
}
