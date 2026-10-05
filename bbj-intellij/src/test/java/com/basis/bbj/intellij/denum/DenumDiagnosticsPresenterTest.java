package com.basis.bbj.intellij.denum;

import com.basis.bbj.intellij.denum.DenumDiagnosticsPresenter.Line;
import com.basis.bbj.intellij.denum.DenumModels.DenumDiagnostic;
import com.basis.bbj.intellij.denum.DenumModels.DenumDiagnosticsParams;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * The rendering of a {@code bbj/denumDiagnostics} payload into console lines. The payload comes
 * from another process, so besides the block format these tests pin that hostile or malformed
 * input is flattened, skipped or tolerated and never throws.
 */
class DenumDiagnosticsPresenterTest {

    private static final Path PRESENTER_SOURCE = Paths.get(
        "src", "main", "java", "com", "basis", "bbj", "intellij", "denum", "DenumDiagnosticsPresenter.java")
        .toAbsolutePath().normalize();

    private static DenumDiagnostic entry(Long line, String original, String severity, String message) {
        DenumDiagnostic d = new DenumDiagnostic();
        d.line = line;
        d.originalLineNumber = original;
        d.severity = severity;
        d.message = message;
        return d;
    }

    private static DenumDiagnosticsParams params(String uri, DenumDiagnostic... entries) {
        DenumDiagnosticsParams p = new DenumDiagnosticsParams();
        p.uri = uri;
        p.diagnostics = new ArrayList<>(List.of(entries));
        return p;
    }

    private static List<String> texts(List<Line> lines) {
        return lines.stream().map(Line::text).toList();
    }

    @Test
    void anEmptyListGivesTheHeaderAlone() {
        List<Line> lines = DenumDiagnosticsPresenter.present(params("file:///tmp/prog.bbj"));

        assertEquals(1, lines.size());
        assertEquals("Denumber diagnostics for /tmp/prog.bbj:", lines.get(0).text());
        assertFalse(lines.get(0).error());
    }

    @Test
    void anErrorEntryShowsItsLineItsOriginalNumberAndIsErrorOutput() {
        List<Line> lines = DenumDiagnosticsPresenter.present(params("file:///tmp/prog.bbj",
            entry(2L, "0020", "ERROR", "Unexpected token")));

        assertEquals(2, lines.size());
        assertEquals("  line 2 (original 0020) ERROR: Unexpected token", lines.get(1).text());
        assertTrue(lines.get(1).error());
    }

    @Test
    void anEntryWithoutALocationSaysSoAndAWarningIsNotErrorOutput() {
        List<Line> lines = DenumDiagnosticsPresenter.present(params("file:///tmp/prog.bbj",
            entry(0L, "", "WARNING", "w")));

        assertEquals("  no location WARNING: w", lines.get(1).text());
        assertFalse(lines.get(1).error());
    }

    @Test
    void aNullOriginalNumberLeavesOutTheSuffix() {
        List<Line> lines = DenumDiagnosticsPresenter.present(params("file:///tmp/prog.bbj",
            entry(5L, null, "INFO", "note")));

        assertEquals("  line 5 INFO: note", lines.get(1).text());
        assertFalse(lines.get(1).text().contains("(original"));
        assertFalse(lines.get(1).error());
    }

    @Test
    void entriesKeepPayloadOrderAfterTheHeader() {
        List<Line> lines = DenumDiagnosticsPresenter.present(params("file:///tmp/prog.bbj",
            entry(9L, "", "INFO", "third in line numbers, first in payload"),
            entry(1L, "", "ERROR", "second"),
            entry(4L, "", "WARNING", "third")));

        assertEquals(List.of(
            "Denumber diagnostics for /tmp/prog.bbj:",
            "  line 9 INFO: third in line numbers, first in payload",
            "  line 1 ERROR: second",
            "  line 4 WARNING: third"), texts(lines));
    }

    @Test
    void everyControlCharacterAndSeparatorInAMessageBecomesOneSpace() {
        String hostile = "a\nb\rc\u0007d\u0085e f g";
        List<Line> lines = DenumDiagnosticsPresenter.present(params("file:///tmp/prog.bbj",
            entry(1L, "", "ERROR", hostile)));

        assertEquals("  line 1 ERROR: a b c d e f g", lines.get(1).text());
        for (Line line : lines) {
            assertFalse(line.text().contains("\n"), "no returned line may hold a line feed");
            assertFalse(line.text().contains("\r"), "no returned line may hold a carriage return");
        }
    }

    @Test
    void aControlCharacterInTheOriginalNumberIsFlattenedToo() {
        List<Line> lines = DenumDiagnosticsPresenter.present(params("file:///tmp/prog.bbj",
            entry(3L, "00\n20", "ERROR", "m")));

        assertEquals("  line 3 (original 00 20) ERROR: m", lines.get(1).text());
    }

    @Test
    void aFilePathThatDecodesToANewlineIsFlattenedInTheHeader() {
        List<Line> lines = DenumDiagnosticsPresenter.present(params("file:///tmp/a%0Ab.bbj"));

        assertEquals("Denumber diagnostics for /tmp/a b.bbj:", lines.get(0).text());
    }

    @Test
    void invalidEntriesAreSkippedAndTheValidOnesKept() {
        DenumDiagnosticsParams p = params("file:///tmp/prog.bbj",
            entry(1L, "", "ERROR", "kept one"),
            entry(null, "", "ERROR", "null line"),
            entry(-1L, "", "ERROR", "negative line"),
            entry(2L, "", "error", "lower case severity"),
            entry(3L, "", null, "null severity"),
            entry(4L, "", "ERROR", null),
            entry(5L, "", "FATAL", "unknown severity"),
            entry(6L, "", "INFO", "kept two"));
        p.diagnostics.add(1, null);

        assertEquals(List.of(
            "Denumber diagnostics for /tmp/prog.bbj:",
            "  line 1 ERROR: kept one",
            "  line 6 INFO: kept two"), texts(DenumDiagnosticsPresenter.present(p)));
    }

    @Test
    void aLineBeyondTheJavaScriptSafeIntegerRangeIsStillRendered() {
        List<Line> lines = DenumDiagnosticsPresenter.present(params("file:///tmp/prog.bbj",
            entry(9007199254740991L, "", "ERROR", "big")));

        assertEquals("  line 9007199254740991 ERROR: big", lines.get(1).text());
    }

    @Test
    void aVersionOnThePayloadChangesNothingInTheRenderedLines() {
        DenumDiagnosticsParams without = params("file:///tmp/prog.bbj",
            entry(2L, "0020", "ERROR", "Unexpected token"), entry(0L, "", "WARNING", "w"));
        DenumDiagnosticsParams with = params("file:///tmp/prog.bbj",
            entry(2L, "0020", "ERROR", "Unexpected token"), entry(0L, "", "WARNING", "w"));
        with.version = 7L;

        assertEquals(DenumDiagnosticsPresenter.present(without), DenumDiagnosticsPresenter.present(with));
    }

    @Test
    void nullParamsAndANullUriGiveTheUnknownFileHeader() {
        assertEquals(List.of("Denumber diagnostics for an unknown file:"),
            texts(DenumDiagnosticsPresenter.present(null)));
        assertEquals(List.of("Denumber diagnostics for an unknown file:"),
            texts(DenumDiagnosticsPresenter.present(params(null))));
    }

    @Test
    void nullDiagnosticsGiveTheHeaderOnly() {
        DenumDiagnosticsParams p = new DenumDiagnosticsParams();
        p.uri = "file:///tmp/prog.bbj";
        p.diagnostics = null;

        assertEquals(List.of("Denumber diagnostics for /tmp/prog.bbj:"),
            texts(DenumDiagnosticsPresenter.present(p)));
    }

    @Test
    void aNonFileUriAndAMalformedFileUriAreShownAsGiven() {
        assertEquals("Denumber diagnostics for untitled:Untitled-1:",
            DenumDiagnosticsPresenter.present(params("untitled:Untitled-1")).get(0).text());
        assertEquals("Denumber diagnostics for file://%zz:",
            DenumDiagnosticsPresenter.present(params("file://%zz")).get(0).text());
    }

    @Test
    void aControlCharacterInANonFileUriIsFlattenedToo() {
        assertEquals("Denumber diagnostics for untitled:a b:",
            DenumDiagnosticsPresenter.present(params("untitled:a b")).get(0).text());
    }

    @Test
    void theFlattenerReplacesExactlyControlCharactersAndTheTwoSeparators() {
        assertEquals("plain text kept", DenumDiagnosticsPresenter.flatten("plain text kept"));
        assertEquals("   ", DenumDiagnosticsPresenter.flatten("\t\u007f\u009f"));
        assertEquals("café 中", DenumDiagnosticsPresenter.flatten("café 中"));
    }

    @Test
    void thePresenterSourceCarriesNoIntelliJImport() throws IOException {
        String source = Files.readString(PRESENTER_SOURCE);

        assertFalse(source.contains("import com.intellij"),
            "the presenter is plain Java so it runs in a plain JUnit test");
    }
}
