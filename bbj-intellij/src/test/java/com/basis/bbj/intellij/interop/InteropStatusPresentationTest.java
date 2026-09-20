package com.basis.bbj.intellij.interop;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;

/**
 * Drives all three {@link InteropStatusPresentation} methods across all four status names plus
 * an unrecognized name (#587).
 */
class InteropStatusPresentationTest {

    private static final String CONNECTED = "CONNECTED";
    private static final String DISCONNECTED = "DISCONNECTED";
    private static final String CHECKING = "CHECKING";
    private static final String WRONG_PEER = "WRONG_PEER";
    private static final String UNRECOGNIZED = "NOT_A_REAL_STATUS";

    @Test
    void statusTextIsByteIdenticalForThePreExistingThreeLabels() {
        assertEquals("Java: Connected", InteropStatusPresentation.statusText(CONNECTED));
        assertEquals("Java: Disconnected", InteropStatusPresentation.statusText(DISCONNECTED));
        assertEquals("Java: Checking...", InteropStatusPresentation.statusText(CHECKING));
    }

    @Test
    void statusTextCoversTheNewWrongPeerStateAndAnUnrecognizedName() {
        assertEquals("Java: Wrong peer", InteropStatusPresentation.statusText(WRONG_PEER));
        assertEquals("Java: Unknown", InteropStatusPresentation.statusText(UNRECOGNIZED));
    }

    @Test
    void tooltipEqualsStatusTextForEveryNonWrongPeerName() {
        for (String statusName : new String[] {CONNECTED, DISCONNECTED, CHECKING, UNRECOGNIZED}) {
            assertEquals(InteropStatusPresentation.statusText(statusName),
                    InteropStatusPresentation.tooltip(statusName),
                    "tooltip must equal statusText for " + statusName);
        }
    }

    @Test
    void tooltipNamesTheWrongPeerSituationInsteadOfReusingTheGenericLabel() {
        String tooltip = InteropStatusPresentation.tooltip(WRONG_PEER);
        assertNotNull(tooltip);
        assertNotEquals(InteropStatusPresentation.statusText(WRONG_PEER), tooltip);
    }

    @Test
    void bannerTextIsNullForConnectedAndChecking() {
        assertNull(InteropStatusPresentation.bannerText(CONNECTED));
        assertNull(InteropStatusPresentation.bannerText(CHECKING));
    }

    @Test
    void bannerTextIsNullForAnUnrecognizedName() {
        assertNull(InteropStatusPresentation.bannerText(UNRECOGNIZED));
    }

    @Test
    void bannerTextDiffersBetweenDisconnectedAndWrongPeer() {
        String disconnected = InteropStatusPresentation.bannerText(DISCONNECTED);
        String wrongPeer = InteropStatusPresentation.bannerText(WRONG_PEER);

        assertNotNull(disconnected);
        assertNotNull(wrongPeer);
        assertNotEquals(disconnected, wrongPeer);
        assertEquals("Start BBjServices for Java completions", disconnected);
    }
}
