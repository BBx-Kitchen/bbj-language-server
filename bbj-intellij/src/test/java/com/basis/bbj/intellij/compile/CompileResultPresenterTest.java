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
}
