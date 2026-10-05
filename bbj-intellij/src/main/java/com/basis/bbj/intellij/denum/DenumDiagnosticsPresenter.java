package com.basis.bbj.intellij.denum;

import org.jetbrains.annotations.NotNull;
import org.jetbrains.annotations.Nullable;

import java.net.URI;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.regex.Pattern;

/**
 * Renders the payload of a {@code bbj/denumDiagnostics} notification as console lines: a header
 * naming the file, then one line per diagnostic in the order the payload lists them. It mirrors
 * {@code formatDenumDiagnosticsBlock} in {@code bbj-vscode/src/denum-diagnostics-output.ts}, so
 * both IDEs print the same block.
 *
 * <p>The payload crosses a process boundary, so every field is validated here and {@link #present}
 * never throws, whatever it is given. A malformed entry is skipped, every control character and
 * line or paragraph separator becomes a space so one entry is always exactly one line, and nothing
 * in the payload ever becomes a command, a link or a path to open: the file uri is display text
 * only. No message is cut; the server bounds the list.
 *
 * <p>Plain Java with no IntelliJ import, so it runs in a plain JUnit test.
 */
public final class DenumDiagnosticsPresenter {

    /** One console line and whether it is printed as error output. */
    public record Line(@NotNull String text, boolean error) {}

    static final String UNKNOWN_FILE = "an unknown file";

    private static final String ERROR = "ERROR";
    private static final Set<String> SEVERITIES = Set.of(ERROR, "WARNING", "INFO");

    /** Every control character (C0, DEL, C1) and the Unicode line and paragraph separators. */
    private static final Pattern FLATTEN = Pattern.compile("[\\p{Cc}\\u2028\\u2029]");

    private DenumDiagnosticsPresenter() {}

    /**
     * The header line followed by one line per valid entry, in payload order. Null params, a null
     * uri and a null list are tolerated; invalid entries are skipped silently.
     */
    public static @NotNull List<Line> present(@Nullable DenumModels.DenumDiagnosticsParams params) {
        List<Line> lines = new ArrayList<>();
        String uri = params == null ? null : params.uri;
        String display = uri == null ? UNKNOWN_FILE : flatten(displayPath(uri));
        lines.add(new Line("Denumber diagnostics for " + display + ":", false));

        if (params == null || params.diagnostics == null) {
            return lines;
        }
        for (DenumModels.DenumDiagnostic diagnostic : params.diagnostics) {
            Line line = renderEntry(diagnostic);
            if (line != null) {
                lines.add(line);
            }
        }
        return lines;
    }

    private static @Nullable Line renderEntry(@Nullable DenumModels.DenumDiagnostic entry) {
        if (entry == null || entry.line == null || entry.line < 0
            || entry.severity == null || !SEVERITIES.contains(entry.severity)
            || entry.message == null) {
            return null;
        }
        String location = entry.line == 0 ? "no location" : "line " + entry.line;
        String original = entry.originalLineNumber == null || entry.originalLineNumber.isEmpty()
            ? ""
            : " (original " + flatten(entry.originalLineNumber) + ")";
        String text = "  " + location + original + " " + entry.severity + ": " + flatten(entry.message);
        return new Line(text, ERROR.equals(entry.severity));
    }

    /** The file-system path of a {@code file} uri; any other uri, or one that does not parse, as given. */
    private static String displayPath(String uri) {
        if (!uri.regionMatches(true, 0, "file:", 0, "file:".length())) {
            return uri;
        }
        try {
            return Paths.get(URI.create(uri)).toString();
        } catch (RuntimeException e) {
            return uri;
        }
    }

    /** Replaces every control character and line or paragraph separator with one space. */
    static String flatten(String text) {
        return FLATTEN.matcher(text).replaceAll(" ");
    }
}
