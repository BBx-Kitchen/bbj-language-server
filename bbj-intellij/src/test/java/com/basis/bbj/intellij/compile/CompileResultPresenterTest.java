package com.basis.bbj.intellij.compile;

import com.basis.bbj.intellij.compile.CompileResultPresenter.Presentation;
import org.eclipse.lsp4j.Diagnostic;
import org.eclipse.lsp4j.Position;
import org.eclipse.lsp4j.Range;
import org.junit.jupiter.api.Test;

import java.util.Collections;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;

/**
 * Behavioural coverage for {@link CompileResultPresenter} (#571, PARITY-01): success, every
 * reason in the vocabulary, an unrecognised reason, and the two client-side failures. A plain
 * JUnit 5 test over a plain-Java seam — no IntelliJ platform test framework (C-01).
 */
class CompileResultPresenterTest {

    private static Diagnostic diagnosticAt(int zeroBasedLine, int zeroBasedColumn, String message) {
        Diagnostic diagnostic = new Diagnostic();
        Position start = new Position(zeroBasedLine, zeroBasedColumn);
        Position end = new Position(zeroBasedLine, zeroBasedColumn + 1);
        diagnostic.setRange(new Range(start, end));
        diagnostic.setMessage(message);
        return diagnostic;
    }

    @Test
    void aSuccessfulCompileShowsAnInformationBalloonNamingTheFile() {
        Presentation presentation = CompileResultPresenter.present(
            "hello.bbj", true, null, null, Collections.emptyList());

        assertEquals("Compiled \"hello.bbj\"", presentation.title);
        assertFalse(presentation.error);
        assertFalse(presentation.offerSettings);
    }

    @Test
    void aMissingOutputDirectoryIsAnErrorBalloonThatOffersSettings() {
        Presentation presentation = CompileResultPresenter.present(
            "hello.bbj", false, "output-directory-required",
            "Set the \"bbj.compiler.output.directory\" setting (or enable validate-only) before compiling.",
            Collections.emptyList());

        assertTrue(presentation.title.startsWith("Failed to compile \"hello.bbj\""));
        assertTrue(presentation.error);
        assertTrue(presentation.offerSettings);
    }

    @Test
    void compilerErrorsAreRenderedOnePerLineAsLineColonColumnMessage() {
        List<Diagnostic> diagnostics = List.of(
            diagnosticAt(2, 4, "unexpected token"),
            diagnosticAt(9, 0, "missing END"));

        Presentation presentation = CompileResultPresenter.present(
            "hello.bbj", false, "compile-errors", null, diagnostics);

        String[] lines = presentation.body.split("\n", -1);
        assertTrue(lines[0].startsWith("3:"), "first line should begin with the one-based line 3, got: " + lines[0]);
        assertTrue(lines[0].endsWith("unexpected token"));
        assertTrue(lines[1].startsWith("10:"), "second line should begin with the one-based line 10, got: " + lines[1]);
        assertTrue(lines[1].endsWith("missing END"));
    }

    @Test
    void everyReasonThatASettingCanFixOffersSettings() {
        for (String reason : List.of(
                "output-directory-required", "bbj-home-not-configured", "bbjcpl-not-found", "invalid-options")) {
            Presentation presentation = CompileResultPresenter.present(
                "hello.bbj", false, reason, "some message", Collections.emptyList());
            assertTrue(presentation.error, reason + " should be an error");
            assertTrue(presentation.offerSettings, reason + " should offer settings");
        }
    }

    @Test
    void everyReasonThatNoSettingCanFixDoesNotOfferSettings() {
        for (String reason : List.of(
                "compile-errors", "bbjcpl-error", "compile-timeout", "spawn-failed", "invalid-file-uri")) {
            Presentation presentation = CompileResultPresenter.present(
                "hello.bbj", false, reason, "some message", Collections.emptyList());
            assertTrue(presentation.error, reason + " should be an error");
            assertFalse(presentation.offerSettings, reason + " should not offer settings");
        }
    }

    @Test
    void rawCompilerTextIsShownVerbatimWhenNothingParsed() {
        String rawStderr = "Directory /tmp/nope does not exist.  Exiting...\nstdin: error: Invalid output directory";

        Presentation presentation = CompileResultPresenter.present(
            "hello.bbj", false, "bbjcpl-error", rawStderr, Collections.emptyList());

        assertEquals(rawStderr, presentation.body);
    }

    @Test
    void anUnknownReasonStillProducesAVisibleErrorBalloon() {
        Presentation unknown = CompileResultPresenter.present(
            "hello.bbj", false, "some-future-reason-not-yet-defined", "detail", Collections.emptyList());
        assertTrue(unknown.error);
        assertTrue(unknown.title.startsWith("Failed to compile"));

        Presentation nullReason = CompileResultPresenter.present(
            "hello.bbj", false, null, "detail", Collections.emptyList());
        assertTrue(nullReason.error);
        assertTrue(nullReason.title.startsWith("Failed to compile"));
    }

    @Test
    void aDiagnosticWithNoRangeRendersAsItsMessageAlone() {
        Diagnostic rangeless = new Diagnostic();
        rangeless.setMessage("something went wrong");
        // setRange is never called, so getRange() returns null.

        Presentation presentation = assertDoesNotThrow(() -> CompileResultPresenter.present(
            "hello.bbj", false, "compile-errors", null, List.of(rangeless)));

        assertEquals("something went wrong", presentation.body);
    }

    @Test
    void theBodyIsEmptyOnSuccessAndTheTitleQuotesTheFileName() {
        Presentation presentation = CompileResultPresenter.present(
            "my file.bbj", true, null, null, Collections.emptyList());

        assertEquals("Compiled \"my file.bbj\"", presentation.title);
        assertEquals("", presentation.body);
    }

    @Test
    void serverUnavailableNamesTheServerAndOffersNoSettings() {
        Presentation presentation = CompileResultPresenter.serverUnavailable("a.bbj");

        assertTrue(presentation.error);
        assertFalse(presentation.offerSettings);
        assertTrue(presentation.title.contains("language server"));
    }

    @Test
    void requestFailedCarriesTheDetailInTheBody() {
        Presentation presentation = CompileResultPresenter.requestFailed("a.bbj", "timed out");

        assertTrue(presentation.error);
        assertTrue(presentation.body.contains("timed out"));
    }

    @Test
    void presentIsPureAcrossRepeatedAndInterleavedCalls() {
        Presentation firstFailure = CompileResultPresenter.present(
            "hello.bbj", false, "compile-timeout", "timed out", Collections.emptyList());
        Presentation success = CompileResultPresenter.present(
            "hello.bbj", true, null, null, Collections.emptyList());
        Presentation secondFailure = CompileResultPresenter.present(
            "hello.bbj", false, "compile-timeout", "timed out", Collections.emptyList());

        assertEquals(firstFailure.title, secondFailure.title);
        assertEquals(firstFailure.body, secondFailure.body);
        assertEquals(firstFailure.error, secondFailure.error);
        assertEquals(firstFailure.offerSettings, secondFailure.offerSettings);
        assertEquals("Compiled \"hello.bbj\"", success.title);
    }
}
