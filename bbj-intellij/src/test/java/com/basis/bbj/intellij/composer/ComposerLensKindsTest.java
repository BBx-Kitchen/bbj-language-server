package com.basis.bbj.intellij.composer;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;

import java.util.Optional;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Table-style coverage of {@link ComposerLensKinds} (#650): the wire-kind to
 * {@link ComposerLauncher.Kind} mapping, the command id constant, and the unmapped-kind set.
 */
class ComposerLensKindsTest {

    @ParameterizedTest
    @CsvSource({
        "msgbox, MSGBOX",
        "addwindow, ADDWINDOW",
        "addchildwindow, ADDCHILDWINDOW",
        "setopts-in-code, SETOPTS_IN_CODE",
        "setopts-config, SETOPTS"
    })
    void mapsEveryDocumentedWireKindToItsLauncherKind(String wireKind, String expectedKindName) {
        Optional<ComposerLauncher.Kind> mapped = ComposerLensKinds.launcherKindOf(wireKind);

        assertTrue(mapped.isPresent(), "wire kind '" + wireKind + "' must map to a launcher kind");
        assertEquals(ComposerLauncher.Kind.valueOf(expectedKindName), mapped.get());
    }

    @ParameterizedTest
    @ValueSource(strings = {"cvs", "unknown"})
    @NullAndEmptySource
    void anyOtherWireKindIsEmpty(String wireKind) {
        assertEquals(Optional.empty(), ComposerLensKinds.launcherKindOf(wireKind));
    }

    @Test
    void theCommandIdMatchesTheServersCueContract() {
        assertEquals("bbj.openComposerAt", ComposerLensKinds.OPEN_COMPOSER_AT_COMMAND);
    }

    @Test
    void mappedWireKindsReturnsExactlyTheFiveMappedStrings() {
        assertEquals(
            Set.of("msgbox", "addwindow", "addchildwindow", "setopts-in-code", "setopts-config"),
            ComposerLensKinds.mappedWireKinds());
    }
}
