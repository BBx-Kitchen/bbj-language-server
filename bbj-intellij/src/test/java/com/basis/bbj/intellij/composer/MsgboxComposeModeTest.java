package com.basis.bbj.intellij.composer;

import com.basis.bbj.intellij.composer.ComposerModels.MsgboxDecodeResult;
import com.basis.bbj.intellij.composer.ComposerModels.MsgboxReplace;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.fail;

/**
 * Behavioural coverage for {@link MsgboxComposeMode#of(MsgboxDecodeResult)}: the plain-Java routing
 * seam that decides whether {@code openMsgbox} composes new, edits an existing call in place,
 * opens compose-and-replace, or completes an unfinished call.
 */
class MsgboxComposeModeTest {

    private static final Path SOURCE = Paths.get(
            "src", "main", "java", "com", "basis", "bbj", "intellij", "composer", "MsgboxComposeMode.java")
            .toAbsolutePath();

    @Test
    void nullDecodeIsComposeNew() {
        assertEquals(MsgboxComposeMode.COMPOSE_NEW, MsgboxComposeMode.of(null));
    }

    @Test
    void notFoundDecodeIsComposeNew() {
        MsgboxDecodeResult decoded = new MsgboxDecodeResult();
        decoded.found = false;
        assertEquals(MsgboxComposeMode.COMPOSE_NEW, MsgboxComposeMode.of(decoded));
    }

    @Test
    void foundIncompleteIsCompleteCall() {
        MsgboxDecodeResult decoded = new MsgboxDecodeResult();
        decoded.found = true;
        decoded.incomplete = true;
        assertEquals(MsgboxComposeMode.COMPLETE_CALL, MsgboxComposeMode.of(decoded));
    }

    @Test
    void foundIncompleteWithReplaceAlsoSetIsStillCompleteCall() {
        // The server never sends both incomplete and replace at once, but if it ever did the
        // incomplete check must still win -- completing an unfinished call, not a compose-and-
        // replace banner for a call that has nothing yet to preserve.
        MsgboxDecodeResult decoded = new MsgboxDecodeResult();
        decoded.found = true;
        decoded.incomplete = true;
        MsgboxReplace replace = new MsgboxReplace();
        replace.originalOptions = "flags%";
        replace.banner = "Could not decode this options expression — composing will replace it.";
        decoded.replace = replace;
        assertEquals(MsgboxComposeMode.COMPLETE_CALL, MsgboxComposeMode.of(decoded),
                "a decode the server never sends (both incomplete and replace set) must still route "
                        + "to COMPLETE_CALL rather than opening the compose-and-replace banner");
    }

    @Test
    void foundNotIncompleteWithReplaceIsReplaceOptions() {
        MsgboxDecodeResult decoded = new MsgboxDecodeResult();
        decoded.found = true;
        decoded.incomplete = false;
        MsgboxReplace replace = new MsgboxReplace();
        replace.originalOptions = "flags%";
        replace.banner = "Could not decode this options expression — composing will replace it.";
        decoded.replace = replace;
        assertEquals(MsgboxComposeMode.REPLACE_OPTIONS, MsgboxComposeMode.of(decoded));
    }

    @Test
    void foundNotIncompleteNoReplaceIsEditInPlaceForADecodableOptionsCall() {
        MsgboxDecodeResult decoded = new MsgboxDecodeResult();
        decoded.found = true;
        decoded.incomplete = false;
        decoded.replace = null;
        decoded.hasOptions = true;
        assertEquals(MsgboxComposeMode.EDIT_IN_PLACE, MsgboxComposeMode.of(decoded));
    }

    @Test
    void foundNotIncompleteNoReplaceIsEditInPlaceForABareAddOptionsCall() {
        MsgboxDecodeResult decoded = new MsgboxDecodeResult();
        decoded.found = true;
        decoded.incomplete = false;
        decoded.replace = null;
        decoded.hasOptions = false;
        assertEquals(MsgboxComposeMode.EDIT_IN_PLACE, MsgboxComposeMode.of(decoded));
    }

    @Test
    void sourceCarriesNoIntelliJPlatformImport() {
        String text = readSource(SOURCE);
        assertFalse(text.contains("import com.intellij"),
                "MsgboxComposeMode must stay a plain-Java routing seam runnable on the plain JUnit 5 "
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
