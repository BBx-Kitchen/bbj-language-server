package com.basis.bbj.intellij;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Behavioural coverage for {@link InteropPortSettings}: the single effective-port rule every
 * reader shares, the upgrade-migration precedence, and the persist/modified-check helpers the
 * Settings dialog uses.
 */
class InteropPortSettingsTest {

    // ---- isValidPort ----

    @Test
    void isValidPortAcceptsTheFullRangeAndRejectsOutsideIt() {
        assertTrue(InteropPortSettings.isValidPort(1));
        assertTrue(InteropPortSettings.isValidPort(65535));
        assertFalse(InteropPortSettings.isValidPort(0));
        assertFalse(InteropPortSettings.isValidPort(65536));
        assertFalse(InteropPortSettings.isValidPort(-1));
    }

    // ---- sanitizePort ----

    @Test
    void sanitizePortReturnsAValidPortUnchangedAndTheDefaultOtherwise() {
        assertEquals(6000, InteropPortSettings.sanitizePort(6000));
        assertEquals(BbjInteropPortDetector.DEFAULT_PORT, InteropPortSettings.sanitizePort(0));
        assertEquals(BbjInteropPortDetector.DEFAULT_PORT, InteropPortSettings.sanitizePort(65536));
    }

    // ---- effectivePort ----

    @Test
    void autoDetectOnTakesTheDetectedPort() {
        BbjInteropPortDetector.PortLookup lookup = new BbjInteropPortDetector.PortLookup(6000, true, false);

        assertEquals(6000, InteropPortSettings.effectivePort(true, 5008, lookup));
    }

    @Test
    void autoDetectOnWithNothingDetectedFallsBackToTheDefaultAndIgnoresTheStoredValue() {
        assertEquals(BbjInteropPortDetector.DEFAULT_PORT,
                InteropPortSettings.effectivePort(true, 6000, BbjInteropPortDetector.NOT_DETECTED));
    }

    @Test
    void autoDetectOnWithADisabledServiceStillReturnsTheDetectedPort() {
        BbjInteropPortDetector.PortLookup lookup = new BbjInteropPortDetector.PortLookup(6000, true, true);

        assertEquals(6000, InteropPortSettings.effectivePort(true, 5008, lookup));
    }

    @Test
    void autoDetectOffWithAnOutOfRangeStoredPortIsSanitisedRatherThanUsed() {
        assertEquals(BbjInteropPortDetector.DEFAULT_PORT,
                InteropPortSettings.effectivePort(false, 0, BbjInteropPortDetector.NOT_DETECTED));
    }

    @Test
    void anExplicitlyConfirmed5008SurvivesAPropertiesFileNamingADifferentPort() {
        BbjInteropPortDetector.PortLookup detected6000 = new BbjInteropPortDetector.PortLookup(6000, true, false);

        assertEquals(6000, InteropPortSettings.effectivePort(true, 5008, detected6000),
                "auto-detect on takes the detected port even when the stored value is the default");
        assertEquals(5008, InteropPortSettings.effectivePort(false, 5008, detected6000),
                "auto-detect off keeps an explicitly stored 5008 even though detection found 6000");
    }

    // ---- migratedAutoDetect ----

    @Test
    void migrationInferenceCoversAllFiveCombinations() {
        assertTrue(InteropPortSettings.migratedAutoDetect(true, 5008),
                "a saved default port carries no signal, so a saved-true flag stays auto-detecting");
        assertFalse(InteropPortSettings.migratedAutoDetect(true, 6000),
                "a saved non-default port is evidence of a deliberate choice, overriding a saved-true flag");
        assertTrue(InteropPortSettings.migratedAutoDetect(true, 0),
                "an invalid saved port carries no signal, same as the default");
        assertFalse(InteropPortSettings.migratedAutoDetect(false, 5008),
                "a saved-false flag is itself the signal; the port value does not matter");
        assertFalse(InteropPortSettings.migratedAutoDetect(false, 6000));
    }

    // ---- portToPersist ----

    @Test
    void portToPersistKeepsTheStoredValueWhileAutoDetectIsOn() {
        assertEquals(5008, InteropPortSettings.portToPersist(true, 6000, 5008),
                "the greyed UI field shows a detected value that must never be persisted as the explicit choice");
    }

    @Test
    void portToPersistUsesTheSanitisedUiValueWhileAutoDetectIsOff() {
        assertEquals(6000, InteropPortSettings.portToPersist(false, 6000, 5008));
        assertEquals(BbjInteropPortDetector.DEFAULT_PORT, InteropPortSettings.portToPersist(false, 0, 5008));
    }

    // ---- portSettingModified ----

    @Test
    void changingOnlyTheFieldValueWhileAutoDetectIsOnInBothIsNotAModification() {
        assertFalse(InteropPortSettings.portSettingModified(true, 5008, true, 6000));
    }

    @Test
    void changingTheAutoDetectFlagItselfIsAModification() {
        assertTrue(InteropPortSettings.portSettingModified(true, 5008, false, 5008));
    }

    @Test
    void withAutoDetectOffAPortDifferenceIsAModificationAndAnEqualPortIsNot() {
        assertTrue(InteropPortSettings.portSettingModified(false, 5008, false, 6000));
        assertFalse(InteropPortSettings.portSettingModified(false, 6000, false, 6000));
    }
}
