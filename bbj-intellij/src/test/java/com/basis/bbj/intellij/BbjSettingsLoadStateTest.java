package com.basis.bbj.intellij;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Coverage for {@link BbjSettings#loadState(BbjSettings.State)}: the auto-detect upgrade
 * inference must apply exactly once per installation, gated by a persisted flag, rather than
 * being re-derived from the stored port on every restart.
 */
class BbjSettingsLoadStateTest {

    @Test
    void firstLoadInfersFromTheStoredPortAndMarksItselfMigrated() {
        BbjSettings.State state = new BbjSettings.State();
        state.javaInteropPortAutoDetect = true;
        state.javaInteropPort = 6000;
        state.javaInteropSettingsMigrated = false;

        new BbjSettings().loadState(state);

        assertFalse(state.javaInteropPortAutoDetect,
                "a saved non-default port on a never-migrated install is still evidence of a "
                        + "deliberate choice");
        assertTrue(state.javaInteropSettingsMigrated,
                "loadState must mark the migration done so it never re-derives the flag again");
    }

    @Test
    void firstLoadWithNoPortSignalKeepsAutoDetectOn() {
        BbjSettings.State state = new BbjSettings.State();
        state.javaInteropPortAutoDetect = true;
        state.javaInteropPort = BbjInteropPortDetector.DEFAULT_PORT;
        state.javaInteropSettingsMigrated = false;

        new BbjSettings().loadState(state);

        assertTrue(state.javaInteropPortAutoDetect);
        assertTrue(state.javaInteropSettingsMigrated);
    }

    @Test
    void aReEnableFlowSurvivesARestartOnceMigrationHasAlreadyRun() {
        // A user who had auto-detect off with an explicit port 6001, then re-enabled auto-detect
        // in the dialog: portToPersist keeps the stale 6001 in the persisted port field while the
        // flag flips to true. Once the one-time migration has already run for this installation
        // (migrated=true), a later restart must not re-derive the flag from that stale port.
        BbjSettings.State state = new BbjSettings.State();
        state.javaInteropPortAutoDetect = true;
        state.javaInteropPort = 6001;
        state.javaInteropSettingsMigrated = true;

        new BbjSettings().loadState(state);

        assertTrue(state.javaInteropPortAutoDetect,
                "a re-enabled auto-detect flag must survive a restart once migration has already "
                        + "run for this installation");
    }

    @Test
    void loadStateNeverRunsTheMigrationTwice() {
        BbjSettings.State state = new BbjSettings.State();
        state.javaInteropPortAutoDetect = true;
        state.javaInteropPort = 6000;
        state.javaInteropSettingsMigrated = false;

        BbjSettings settings = new BbjSettings();
        settings.loadState(state);
        assertFalse(state.javaInteropPortAutoDetect);
        assertTrue(state.javaInteropSettingsMigrated);

        // A second restart, with the user having explicitly turned auto-detect back on in the
        // dialog since. The already-migrated state must not be re-derived a second time.
        state.javaInteropPortAutoDetect = true;
        settings.loadState(state);

        assertTrue(state.javaInteropPortAutoDetect);
    }
}
