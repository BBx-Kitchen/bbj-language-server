package com.basis.bbj.intellij.composer;

import com.basis.bbj.intellij.composer.ComposerModels.CvsDecodeResult;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.fail;

/**
 * Behavioural coverage for {@link CvsComposeMode#of(CvsDecodeResult)} (#649): the plain-Java
 * routing seam that decides whether {@code openCvs} composes new, edits an existing call in
 * place, completes an unfinished call, or refuses to open a dialog at all.
 */
class CvsComposeModeTest {

    private static final Path SOURCE = Paths.get(
            "src", "main", "java", "com", "basis", "bbj", "intellij", "composer", "CvsComposeMode.java")
            .toAbsolutePath();

    @Test
    void nullDecodeIsComposeNew() {
        assertEquals(CvsComposeMode.COMPOSE_NEW, CvsComposeMode.of(null));
    }

    @Test
    void notFoundDecodeIsComposeNew() {
        CvsDecodeResult decoded = new CvsDecodeResult();
        decoded.found = false;
        assertEquals(CvsComposeMode.COMPOSE_NEW, CvsComposeMode.of(decoded));
    }

    @Test
    void foundIncompleteAndNotEditableIsCompleteCall() {
        CvsDecodeResult decoded = new CvsDecodeResult();
        decoded.found = true;
        decoded.editable = false;
        decoded.incomplete = true;
        assertEquals(CvsComposeMode.COMPLETE_CALL, CvsComposeMode.of(decoded));
    }

    @Test
    void foundEditableAndNotIncompleteIsEditInPlace() {
        CvsDecodeResult decoded = new CvsDecodeResult();
        decoded.found = true;
        decoded.editable = true;
        decoded.incomplete = false;
        assertEquals(CvsComposeMode.EDIT_IN_PLACE, CvsComposeMode.of(decoded));
    }

    @Test
    void foundNotEditableAndNotIncompleteWithReasonIsNotEditable() {
        CvsDecodeResult decoded = new CvsDecodeResult();
        decoded.found = true;
        decoded.editable = false;
        decoded.incomplete = false;
        decoded.reason = "The mask argument is not a sum of integer literals, so it cannot be safely decoded.";
        assertEquals(CvsComposeMode.NOT_EDITABLE, CvsComposeMode.of(decoded));
    }

    @Test
    void incompleteWinsOverEditableSoAnIncompleteCallIsNeverOpenedReadOnly() {
        CvsDecodeResult decoded = new CvsDecodeResult();
        decoded.found = true;
        decoded.editable = true;
        decoded.incomplete = true;
        assertEquals(CvsComposeMode.COMPLETE_CALL, CvsComposeMode.of(decoded),
                "a decode the server never sends (both incomplete and editable true) must still "
                        + "route to COMPLETE_CALL rather than opening a read-only string field");
    }

    @Test
    void sourceCarriesNoIntelliJPlatformImport() {
        String text = readSource(SOURCE);
        assertFalse(text.contains("import com.intellij"),
                "CvsComposeMode must stay a plain-Java routing seam runnable on the plain JUnit 5 "
                        + "classpath, with no IntelliJ platform import");
    }

    private static String readSource(Path path) {
        if (!Files.exists(path)) {
            fail("Guarded source file not found at " + path);
        }
        try {
            return Files.readString(path);
        } catch (IOException e) {
            throw new UncheckedIOExceptionForTest(path, e);
        }
    }

    private static final class UncheckedIOExceptionForTest extends RuntimeException {
        UncheckedIOExceptionForTest(Path resolved, IOException cause) {
            super("Failed to read " + resolved, cause);
        }
    }
}
