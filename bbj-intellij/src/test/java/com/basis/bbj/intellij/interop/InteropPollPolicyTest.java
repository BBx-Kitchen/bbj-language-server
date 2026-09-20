package com.basis.bbj.intellij.interop;

import com.basis.bbj.intellij.ui.BbjFileVisibility;
import org.junit.jupiter.api.Test;

import java.util.List;

import static com.basis.bbj.intellij.interop.InteropPollPolicy.Decision.CHECK_NOW;
import static com.basis.bbj.intellij.interop.InteropPollPolicy.Decision.NO_CHANGE;
import static com.basis.bbj.intellij.interop.InteropPollPolicy.Decision.PAUSE;
import static com.basis.bbj.intellij.interop.InteropPollPolicy.Decision.REARM;
import static com.basis.bbj.intellij.interop.InteropPollPolicy.Trigger.SELECTION_CHANGED;
import static com.basis.bbj.intellij.interop.InteropPollPolicy.Trigger.SERVER_STARTED;
import static com.basis.bbj.intellij.interop.InteropPollPolicy.Trigger.TICK_COMPLETED;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;

/**
 * Enumerates every trigger/gate/previous-gate/server-started combination
 * {@link InteropPollPolicy#decide} must handle (twenty-four cases: three triggers, two gate
 * states, two previous-gate states, two server states), plus the empty-selection edge case that
 * closes the gate rather than throwing (#593).
 */
class InteropPollPolicyTest {

    // --- TICK_COMPLETED: a completed poll tick decides whether to re-arm or pause. ---

    @Test
    void tickCompletedWithServerStartedAndGateOpenRearms() {
        assertEquals(REARM, InteropPollPolicy.decide(TICK_COMPLETED, true, true, true));
        assertEquals(REARM, InteropPollPolicy.decide(TICK_COMPLETED, true, false, true));
    }

    @Test
    void tickCompletedWithServerStartedAndGateClosedPauses() {
        assertEquals(PAUSE, InteropPollPolicy.decide(TICK_COMPLETED, false, true, true));
        assertEquals(PAUSE, InteropPollPolicy.decide(TICK_COMPLETED, false, false, true));
    }

    @Test
    void tickCompletedWithServerNotStartedAlwaysPauses() {
        assertEquals(PAUSE, InteropPollPolicy.decide(TICK_COMPLETED, true, true, false));
        assertEquals(PAUSE, InteropPollPolicy.decide(TICK_COMPLETED, true, false, false));
        assertEquals(PAUSE, InteropPollPolicy.decide(TICK_COMPLETED, false, true, false));
        assertEquals(PAUSE, InteropPollPolicy.decide(TICK_COMPLETED, false, false, false));
    }

    // --- SELECTION_CHANGED: a tab switch may open, close, or leave the gate untouched. ---

    @Test
    void selectionChangedOpeningTheGateChecksNow() {
        assertEquals(CHECK_NOW, InteropPollPolicy.decide(SELECTION_CHANGED, true, false, true));
    }

    @Test
    void selectionChangedWithGateAlreadyOpenIsNoChange() {
        // Switching between two BBj tabs must not fire a second immediate check or restart the
        // timer (mirrors RestartGate's coalescing contract).
        assertEquals(NO_CHANGE, InteropPollPolicy.decide(SELECTION_CHANGED, true, true, true));
    }

    @Test
    void selectionChangedClosingTheGatePauses() {
        assertEquals(PAUSE, InteropPollPolicy.decide(SELECTION_CHANGED, false, true, true));
    }

    @Test
    void selectionChangedWithGateAlreadyClosedIsNoChange() {
        assertEquals(NO_CHANGE, InteropPollPolicy.decide(SELECTION_CHANGED, false, false, true));
    }

    @Test
    void selectionChangedWithServerNotStartedAlwaysPauses() {
        assertEquals(PAUSE, InteropPollPolicy.decide(SELECTION_CHANGED, true, true, false));
        assertEquals(PAUSE, InteropPollPolicy.decide(SELECTION_CHANGED, true, false, false));
        assertEquals(PAUSE, InteropPollPolicy.decide(SELECTION_CHANGED, false, true, false));
        assertEquals(PAUSE, InteropPollPolicy.decide(SELECTION_CHANGED, false, false, false));
    }

    // --- SERVER_STARTED: the server reaching `started` may fire an immediate check. ---

    @Test
    void serverStartedWithGateOpenChecksNow() {
        assertEquals(CHECK_NOW, InteropPollPolicy.decide(SERVER_STARTED, true, true, true));
        assertEquals(CHECK_NOW, InteropPollPolicy.decide(SERVER_STARTED, true, false, true));
    }

    @Test
    void serverStartedWithGateClosedPauses() {
        assertEquals(PAUSE, InteropPollPolicy.decide(SERVER_STARTED, false, true, true));
        assertEquals(PAUSE, InteropPollPolicy.decide(SERVER_STARTED, false, false, true));
    }

    @Test
    void serverStartedTriggerWithServerNotStartedAlwaysPauses() {
        // serverStarted=false is a contradiction in practice for this trigger, but decide() must
        // still short-circuit to PAUSE rather than special-case it away.
        assertEquals(PAUSE, InteropPollPolicy.decide(SERVER_STARTED, true, true, false));
        assertEquals(PAUSE, InteropPollPolicy.decide(SERVER_STARTED, true, false, false));
        assertEquals(PAUSE, InteropPollPolicy.decide(SERVER_STARTED, false, true, false));
        assertEquals(PAUSE, InteropPollPolicy.decide(SERVER_STARTED, false, false, false));
    }

    // --- Empty-selection edge case: an empty selected-files array must close the gate, not throw. ---

    @Test
    void emptySelectionClosesTheGateWithoutThrowing() {
        boolean gateOpen = BbjFileVisibility.showsForFileTypeNames(List.of());
        assertFalse(gateOpen, "an empty selection means no BBj file is selected");
        assertEquals(PAUSE, InteropPollPolicy.decide(TICK_COMPLETED, gateOpen, gateOpen, true));
    }
}
