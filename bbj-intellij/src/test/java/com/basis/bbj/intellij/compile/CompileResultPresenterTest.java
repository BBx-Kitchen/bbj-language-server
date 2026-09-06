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
 * Behavioural coverage for {@link CompileResultPresenter} (#571): success, every
 * reason in the vocabulary, an unrecognised reason, and the two client-side failures. A plain
 * JUnit 5 test over a plain-Java seam — no IntelliJ platform test framework. Several tests below
 * drive {@code messageTextOf} with small duck-typed stand-ins: a diagnostic's message accessor
 * shape is decided by whichever client library the IDE loads at run time, and this classpath can
 * only ever produce one of those shapes, so the other shapes have to be supplied by hand.
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

    /** A stand-in exposing only a no-argument {@code getMessage()} returning a plain string. */
    private static final class StringMessageStandIn {
        private final String message;

        StringMessageStandIn(String message) {
            this.message = message;
        }

        public String getMessage() {
            return message;
        }
    }

    /**
     * A stand-in exposing only a no-argument {@code getMessage()} whose return value is
     * whatever object is supplied — used to drive {@code messageTextOf} with an
     * {@link EitherStandIn} or a thrown/null result.
     */
    private static final class ObjectMessageStandIn {
        private final Object message;
        private final boolean throwOnAccess;

        ObjectMessageStandIn(Object message) {
            this(message, false);
        }

        private ObjectMessageStandIn(Object message, boolean throwOnAccess) {
            this.message = message;
            this.throwOnAccess = throwOnAccess;
        }

        static ObjectMessageStandIn throwing() {
            return new ObjectMessageStandIn(null, true);
        }

        public Object getMessage() {
            if (throwOnAccess) {
                throw new RuntimeException("accessor deliberately fails for the test");
            }
            return message;
        }
    }

    /** Duck-typed stand-in for a two-branch (either-left-or-right) value. */
    private static final class EitherStandIn {
        private final boolean left;
        private final Object leftValue;
        private final Object rightValue;

        private EitherStandIn(boolean left, Object leftValue, Object rightValue) {
            this.left = left;
            this.leftValue = leftValue;
            this.rightValue = rightValue;
        }

        static EitherStandIn ofLeft(Object value) {
            return new EitherStandIn(true, value, null);
        }

        static EitherStandIn ofRight(Object value) {
            return new EitherStandIn(false, null, value);
        }

        public boolean isLeft() {
            return left;
        }

        public Object getLeft() {
            return leftValue;
        }

        public Object getRight() {
            return rightValue;
        }
    }

    /** Duck-typed stand-in for a markup-shaped value exposing a plain-string {@code getValue()}. */
    private static final class MarkupStandIn {
        private final String value;

        MarkupStandIn(String value) {
            this.value = value;
        }

        public String getValue() {
            return value;
        }
    }

    @Test
    void aStringShapedMessageValueIsUsedAsIs() {
        String text = CompileResultPresenter.messageTextOf(new StringMessageStandIn("plain text message"));

        assertEquals("plain text message", text);
    }

    @Test
    void aTwoWayMessageValueIsReadFromItsLeftBranch() {
        Object diagnostic = new ObjectMessageStandIn(EitherStandIn.ofLeft("left branch text"));

        String text = CompileResultPresenter.messageTextOf(diagnostic);

        assertEquals("left branch text", text);
    }

    @Test
    void aTwoWayMessageValueIsReadFromItsMarkupRightBranch() {
        Object diagnostic = new ObjectMessageStandIn(EitherStandIn.ofRight(new MarkupStandIn("markup branch text")));

        String text = CompileResultPresenter.messageTextOf(diagnostic);

        assertEquals("markup branch text", text);
    }

    @Test
    void anUnreadableMessageValueYieldsEmptyTextInsteadOfThrowing() {
        Object noAccessorAtAll = new Object();
        Object accessorThrows = ObjectMessageStandIn.throwing();
        Object accessorReturnsNull = new ObjectMessageStandIn(null);

        assertEquals("", CompileResultPresenter.messageTextOf(noAccessorAtAll),
            "an object with no getMessage() accessor at all must yield empty text, not throw");
        assertEquals("", CompileResultPresenter.messageTextOf(accessorThrows),
            "an accessor that throws must yield empty text, not propagate");
        assertEquals("", CompileResultPresenter.messageTextOf(accessorReturnsNull),
            "an accessor returning null must yield empty text");
    }

    @Test
    void aRealDiagnosticFromThisClasspathStillYieldsItsMessage() {
        Diagnostic diagnostic = diagnosticAt(0, 0, "a genuine diagnostic message");

        String text = CompileResultPresenter.messageTextOf(diagnostic);

        assertEquals("a genuine diagnostic message", text);
    }

    @Test
    void aDiagnosticWithNoMessageStillRendersItsLocation() {
        Diagnostic diagnostic = new Diagnostic();
        diagnostic.setRange(new Range(new Position(2, 4), new Position(2, 5)));
        // setMessage is never called, so getMessage() returns null.

        Presentation presentation = CompileResultPresenter.present(
            "hello.bbj", false, "compile-errors", null, List.of(diagnostic));

        assertEquals("3:5", presentation.body);
    }
}
