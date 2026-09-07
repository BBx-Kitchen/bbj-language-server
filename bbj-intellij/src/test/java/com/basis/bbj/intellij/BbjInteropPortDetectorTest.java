package com.basis.bbj.intellij;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Behavioural coverage for {@link BbjInteropPortDetector}: a real, escaped
 * {@code com.basis.languageServer.addr} line resolves to a validated port end to end, the
 * malformed-value matrix through {@link BbjInteropPortDetector#parseAddrValue(String)} never
 * throws and never reports a wrong port, and every file-read failure mode collapses to
 * not-detected.
 */
class BbjInteropPortDetectorTest {

    private static void writeProperties(Path home, String content) throws IOException {
        Path cfgDir = home.resolve("cfg");
        Files.createDirectories(cfgDir);
        Files.writeString(cfgDir.resolve("BBj.properties"), content, StandardCharsets.UTF_8);
    }

    // ---- end-to-end: the live escaped fixture line ----

    @Test
    void aRealEscapedAddrLineResolvesToTheDetectedPort(@TempDir Path home) throws IOException {
        writeProperties(home, "com.basis.languageServer.addr=localhost\\:5008\\:true\n");

        BbjInteropPortDetector.PortLookup result = BbjInteropPortDetector.lookup(home.toString());

        assertEquals(5008, result.port());
        assertTrue(result.detected());
        assertFalse(result.serviceDisabled());
    }

    @Test
    void theSamePropertiesLineWithADifferentPortResolvesToThatPort(@TempDir Path home) throws IOException {
        writeProperties(home, "com.basis.languageServer.addr=localhost\\:6000\\:true\n");

        BbjInteropPortDetector.PortLookup result = BbjInteropPortDetector.lookup(home.toString());

        assertEquals(6000, result.port());
        assertTrue(result.detected());
    }

    @Test
    void aThirdSegmentOfFalseYieldsDetectedWithServiceDisabledAndTheParsedPort(@TempDir Path home) throws IOException {
        writeProperties(home, "com.basis.languageServer.addr=localhost\\:6000\\:false\n");

        BbjInteropPortDetector.PortLookup result = BbjInteropPortDetector.lookup(home.toString());

        assertEquals(6000, result.port());
        assertTrue(result.detected());
        assertTrue(result.serviceDisabled());
    }

    // ---- the malformed matrix, through the pure parser ----

    @Test
    void nullValueIsNotDetected() {
        assertNotDetected(BbjInteropPortDetector.parseAddrValue(null));
    }

    @Test
    void emptyValueIsNotDetected() {
        assertNotDetected(BbjInteropPortDetector.parseAddrValue(""));
    }

    @Test
    void blankValueIsNotDetected() {
        assertNotDetected(BbjInteropPortDetector.parseAddrValue("   "));
    }

    @Test
    void hostOnlyValueIsNotDetected() {
        assertNotDetected(BbjInteropPortDetector.parseAddrValue("localhost"));
    }

    @Test
    void fourSegmentValueIsNotDetected() {
        assertNotDetected(BbjInteropPortDetector.parseAddrValue("localhost:5008:true:extra"));
    }

    @Test
    void nonNumericPortIsNotDetected() {
        assertNotDetected(BbjInteropPortDetector.parseAddrValue("localhost:abc:true"));
    }

    @Test
    void portZeroIsNotDetected() {
        assertNotDetected(BbjInteropPortDetector.parseAddrValue("localhost:0:true"));
    }

    @Test
    void portOutOfUpperRangeIsNotDetected() {
        assertNotDetected(BbjInteropPortDetector.parseAddrValue("localhost:65536:true"));
    }

    @Test
    void aStillEscapedValueFailsTheNumericCheckAndReportsNotDetected() {
        // Proves that skipping the java.util.Properties unescape step yields not-detected rather
        // than a wrong port — the backslashes make the "port" segment non-numeric.
        assertNotDetected(BbjInteropPortDetector.parseAddrValue("localhost\\:5008\\:true"));
    }

    // ---- file-read failure modes ----

    @Test
    void aHomeThatDoesNotExistIsNotDetected(@TempDir Path home) {
        Path missingHome = home.resolve("does-not-exist");

        assertNotDetected(BbjInteropPortDetector.lookup(missingHome.toString()));
    }

    @Test
    void aHomeWithNoBBjPropertiesFileIsNotDetected(@TempDir Path home) throws IOException {
        Files.createDirectories(home.resolve("cfg"));

        assertNotDetected(BbjInteropPortDetector.lookup(home.toString()));
    }

    @Test
    void aPropertiesFileWithNoAddrKeyIsNotDetected(@TempDir Path home) throws IOException {
        writeProperties(home, "some.other.key=value\n");

        assertNotDetected(BbjInteropPortDetector.lookup(home.toString()));
    }

    @Test
    void anAddrKeyWithAnEmptyValueIsNotDetected(@TempDir Path home) throws IOException {
        writeProperties(home, "com.basis.languageServer.addr=\n");

        assertNotDetected(BbjInteropPortDetector.lookup(home.toString()));
    }

    // ---- ordering: last occurrence wins ----

    @Test
    void twoOccurrencesOfTheKeyResolveToTheLastOne(@TempDir Path home) throws IOException {
        writeProperties(home,
                "com.basis.languageServer.addr=localhost\\:5008\\:true\n"
                        + "com.basis.languageServer.addr=localhost\\:6000\\:true\n");

        BbjInteropPortDetector.PortLookup result = BbjInteropPortDetector.lookup(home.toString());

        assertEquals(6000, result.port(), "the last occurrence of a repeated key must win");
    }

    // ---- empty/null home ----

    @Test
    void anEmptyHomeIsNotDetected() {
        assertNotDetected(BbjInteropPortDetector.lookup(""));
    }

    @Test
    void aNullHomeIsNotDetected() {
        assertNotDetected(BbjInteropPortDetector.lookup(null));
    }

    private static void assertNotDetected(BbjInteropPortDetector.PortLookup result) {
        assertFalse(result.detected());
        assertEquals(BbjInteropPortDetector.DEFAULT_PORT, result.port(),
                "every not-detected result must report DEFAULT_PORT as its port");
    }
}
