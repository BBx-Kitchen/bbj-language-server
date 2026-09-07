package com.basis.bbj.intellij.refresh;

import com.basis.bbj.intellij.refresh.JavaClassesRefreshFlow.Outcome;
import com.basis.bbj.intellij.refresh.JavaClassesRefreshPresenter.Presentation;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/** Plain-JUnit coverage of {@link JavaClassesRefreshPresenter}'s per-outcome rendering (#632). */
class JavaClassesRefreshPresenterTest {

    @Test
    void successHasNoBalloonAndTheExactConsoleLine() {
        Presentation presentation = JavaClassesRefreshPresenter.present(Outcome.REFRESHED, null);

        assertFalse(presentation.balloon);
        assertFalse(presentation.error);
        assertFalse(presentation.offerRestart);
        assertEquals("Java classes refreshed", presentation.consoleLine);
    }

    @Test
    void declinedOffersBalloonAndRestart() {
        Presentation presentation = JavaClassesRefreshPresenter.present(Outcome.DECLINED, null);

        assertTrue(presentation.balloon);
        assertTrue(presentation.error);
        assertTrue(presentation.offerRestart);
        assertTrue(presentation.title.toLowerCase().contains("not refreshed"));
        assertTrue(presentation.body.contains("class cache could not be reloaded"));
    }

    @Test
    void serverUnavailableNamesTheLanguageServer() {
        Presentation presentation = JavaClassesRefreshPresenter.present(Outcome.SERVER_UNAVAILABLE, null);

        assertTrue(presentation.balloon);
        assertTrue(presentation.error);
        assertTrue(presentation.offerRestart);
        assertTrue(presentation.title.toLowerCase().contains("language server"));
        assertTrue(presentation.title.toLowerCase().contains("unavailable"));
    }

    @Test
    void requestFailedBodyContainsDetailVerbatim() {
        Presentation presentation = JavaClassesRefreshPresenter.present(Outcome.REQUEST_FAILED, "boom");

        assertTrue(presentation.balloon);
        assertTrue(presentation.error);
        assertTrue(presentation.offerRestart);
        assertTrue(presentation.body.contains("boom"));
    }

    @Test
    void timedOutBodyNamesTheBoundFromTheConstant() {
        Presentation presentation = JavaClassesRefreshPresenter.present(Outcome.TIMED_OUT, null);

        assertTrue(presentation.balloon);
        assertTrue(presentation.error);
        assertTrue(presentation.offerRestart);
        assertTrue(presentation.body.contains(String.valueOf(JavaClassesRefreshFlow.REFRESH_TIMEOUT_SECONDS)));
    }

    @Test
    void everyNonSuccessConsoleLineContainsTitleAndBody() {
        for (Outcome outcome : new Outcome[] {Outcome.DECLINED, Outcome.SERVER_UNAVAILABLE,
                Outcome.REQUEST_FAILED, Outcome.TIMED_OUT}) {
            Presentation presentation = JavaClassesRefreshPresenter.present(outcome, "detail");
            assertTrue(presentation.consoleLine.contains(presentation.title),
                "console line for " + outcome + " must contain its title");
            assertTrue(presentation.consoleLine.contains(presentation.body),
                "console line for " + outcome + " must contain its body");
        }
    }

    @Test
    void alreadyRunningConsoleLineIsNeverReturnedByPresent() {
        String alreadyRunning = JavaClassesRefreshPresenter.alreadyRunningConsoleLine();
        assertTrue(alreadyRunning.toLowerCase().contains("already running"));

        for (Outcome outcome : Outcome.values()) {
            Presentation presentation = JavaClassesRefreshPresenter.present(outcome, null);
            assertFalse(presentation.consoleLine.equals(alreadyRunning));
        }
    }

    @Test
    void presentNeverDispatchesOnTheDetailText() {
        for (Outcome outcome : Outcome.values()) {
            Presentation withNullDetail = JavaClassesRefreshPresenter.present(outcome, null);
            Presentation withNonsenseDetail = JavaClassesRefreshPresenter.present(outcome, "some nonsense detail");

            assertEquals(withNullDetail.balloon, withNonsenseDetail.balloon,
                "balloon flag must not depend on detail text for " + outcome);
            assertEquals(withNullDetail.error, withNonsenseDetail.error,
                "error flag must not depend on detail text for " + outcome);
            assertEquals(withNullDetail.offerRestart, withNonsenseDetail.offerRestart,
                "offerRestart flag must not depend on detail text for " + outcome);
        }
    }
}
