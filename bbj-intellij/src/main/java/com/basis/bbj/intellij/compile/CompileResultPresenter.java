package com.basis.bbj.intellij.compile;

import org.eclipse.lsp4j.Diagnostic;
import org.eclipse.lsp4j.Range;

import java.lang.reflect.Method;
import java.util.List;

/**
 * Renders a {@code bbj/compile} result into balloon text (#571). A plain
 * Java rendering seam with no IntelliJ import: every balloon's title, body and settings
 * remedy come from here, keyed on the result's machine-readable {@code reason} — never chosen by
 * reading its {@code message} prose.
 */
public final class CompileResultPresenter {

    private CompileResultPresenter() {}

    /** Immutable rendering of one compile result: what the balloon (and console line) should show. */
    public static final class Presentation {
        public final String title;
        public final String body;
        public final boolean error;
        public final boolean offerSettings;

        private Presentation(String title, String body, boolean error, boolean offerSettings) {
            this.title = title;
            this.body = body;
            this.error = error;
            this.offerSettings = offerSettings;
        }
    }

    /**
     * Renders one {@code bbj/compile} result. Success yields an information presentation naming
     * the file with an empty body. Every failure switches on {@code reason} — never {@code
     * message} prose — to pick the title's tail clause and whether a settings remedy
     * applies: the four reasons a setting can fix append a short clause naming the cause and set
     * {@code offerSettings} true; {@code compile-errors} renders the diagnostics into the body;
     * {@code bbjcpl-error} puts the raw {@code message} text into the body verbatim; the
     * remaining reasons append their own short clause with no settings remedy. Any other value,
     * including {@code null}, still produces a visible error naming that value, so no result
     * shape can silently look like a success.
     */
    public static Presentation present(String fileName, boolean success, String reason, String message,
            List<Diagnostic> diagnostics) {
        if (success) {
            return new Presentation("Compiled \"" + fileName + "\"", "", false, false);
        }

        String titleTail;
        boolean offerSettings;
        String body;

        if (reason == null) {
            titleTail = ": " + reason;
            offerSettings = false;
            body = orEmpty(message);
        } else {
            switch (reason) {
                case "output-directory-required":
                    titleTail = ": no compile output directory is configured";
                    offerSettings = true;
                    body = orEmpty(message);
                    break;
                case "bbj-home-not-configured":
                    titleTail = ": BBj home is not configured";
                    offerSettings = true;
                    body = orEmpty(message);
                    break;
                case "bbjcpl-not-found":
                    titleTail = ": the bbjcpl compiler was not found";
                    offerSettings = true;
                    body = orEmpty(message);
                    break;
                case "invalid-options":
                    titleTail = ": the compiler options are invalid";
                    offerSettings = true;
                    body = orEmpty(message);
                    break;
                case "compile-errors":
                    titleTail = "";
                    offerSettings = false;
                    body = renderDiagnostics(diagnostics);
                    break;
                case "bbjcpl-error":
                    titleTail = "";
                    offerSettings = false;
                    body = orEmpty(message);
                    break;
                case "compile-timeout":
                    titleTail = ": the compile timed out";
                    offerSettings = false;
                    body = orEmpty(message);
                    break;
                case "spawn-failed":
                    titleTail = ": the compiler could not be started";
                    offerSettings = false;
                    body = orEmpty(message);
                    break;
                case "invalid-file-uri":
                    titleTail = ": the file location is invalid";
                    offerSettings = false;
                    body = orEmpty(message);
                    break;
                default:
                    titleTail = ": " + reason;
                    offerSettings = false;
                    body = orEmpty(message);
                    break;
            }
        }

        return new Presentation("Failed to compile \"" + fileName + "\"" + titleTail, body, true, offerSettings);
    }

    /** The server proxy resolved to null: the language server is not running. */
    public static Presentation serverUnavailable(String fileName) {
        return new Presentation(
            "Failed to compile \"" + fileName + "\": the BBj language server is not running",
            "",
            true,
            false);
    }

    /** The request itself failed: an interruption, a timeout, or an execution failure. */
    public static Presentation requestFailed(String fileName, String detail) {
        return new Presentation("Failed to compile \"" + fileName + "\"", orEmpty(detail), true, false);
    }

    private static String orEmpty(String value) {
        return value != null ? value : "";
    }

    private static String renderDiagnostics(List<Diagnostic> diagnostics) {
        if (diagnostics == null || diagnostics.isEmpty()) {
            return "";
        }
        StringBuilder body = new StringBuilder();
        for (int i = 0; i < diagnostics.size(); i++) {
            if (i > 0) {
                body.append('\n');
            }
            body.append(renderOne(diagnostics.get(i)));
        }
        return body.toString();
    }

    /**
     * One diagnostic as {@code <line>:<column> <message>}, one-based; the location alone when
     * the message text is empty, and the message text alone when the range is missing.
     *
     * <p>The message is read through {@link #messageTextOf}, not through a typed
     * {@code Diagnostic.getMessage()} call: the accessor's return type is part of the JVM method
     * descriptor, the plugin's dependency on the client library that defines {@code Diagnostic}
     * is resolved by the IDE at run time (a plugin descriptor cannot pin the version of a plugin
     * it depends on), and different client-library generations return that message as different
     * shapes. So the message is read by name and normalised, and an unreadable message degrades
     * to the diagnostic's location rather than to an unhandled error (#571).
     */
    private static String renderOne(Diagnostic diagnostic) {
        String text = messageTextOf(diagnostic);
        Range range = diagnostic.getRange();
        if (range == null || range.getStart() == null) {
            return text;
        }
        int line = range.getStart().getLine() + 1;
        int column = range.getStart().getCharacter() + 1;
        String location = line + ":" + column;
        return text.isEmpty() ? location : location + " " + text;
    }

    /**
     * Resolves the no-argument {@code getMessage} accessor on {@code diagnostic}'s runtime class
     * and normalises whatever it returns into a plain string. Takes {@code Object}, not a typed
     * diagnostic parameter, so the read is driven purely by shape rather than by a compile-time
     * type — the only way one plugin binary can render diagnostics from either client-library
     * generation on the classpath at run time.
     */
    static String messageTextOf(Object diagnostic) {
        return unwrapMessage(invokeNoArg(diagnostic, "getMessage"), 0);
    }

    private static final int MAX_MESSAGE_UNWRAP_DEPTH = 3;

    /**
     * Normalises a message value that may be a plain string, a two-branch value (either its left
     * or right branch), or a markup-shaped value exposing {@code getValue()} — the three shapes a
     * diagnostic's message can take across client-library generations. Bounded by
     * {@link #MAX_MESSAGE_UNWRAP_DEPTH} so the recursion is visibly terminating; an unrecognised
     * shape falls back to the value's own textual form rather than to nothing.
     */
    private static String unwrapMessage(Object value, int depth) {
        if (value == null || depth > MAX_MESSAGE_UNWRAP_DEPTH) {
            return "";
        }
        if (value instanceof String stringValue) {
            return stringValue;
        }
        Object left = invokeNoArg(value, "getLeft");
        if (left != null) {
            return unwrapMessage(left, depth + 1);
        }
        Object right = invokeNoArg(value, "getRight");
        if (right != null) {
            return unwrapMessage(right, depth + 1);
        }
        Object markupValue = invokeNoArg(value, "getValue");
        if (markupValue instanceof String markupText) {
            return markupText;
        }
        return String.valueOf(value);
    }

    /**
     * Invokes the named no-argument accessor on {@code target} by reflection, returning
     * {@code null} for a null target, an accessor that does not exist, an accessor that throws,
     * or an accessor that itself returns null. Nothing thrown here may escape into the caller —
     * that escape is the exact failure this seam exists to prevent (#571).
     */
    private static Object invokeNoArg(Object target, String methodName) {
        if (target == null) {
            return null;
        }
        try {
            Method accessor = target.getClass().getMethod(methodName);
            if (!accessor.canAccess(target)) {
                accessor.setAccessible(true);
            }
            return accessor.invoke(target);
        } catch (ReflectiveOperationException | RuntimeException e) {
            return null;
        }
    }
}
