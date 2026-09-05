package com.basis.bbj.intellij.compile;

import org.eclipse.lsp4j.Diagnostic;

import java.util.List;

/**
 * Gson-serializable data objects carrying the language server's {@code bbj/compile} request
 * params and result (#571, PARITY-01). {@code bbj-vscode/src/language/compile-command.ts} is the
 * single source of truth for both shapes; field names here must match its JSON keys exactly.
 *
 * <p>{@code CompileResult.reason} is one of nine machine-readable values the server can return
 * for a non-success result: {@code output-directory-required}, {@code invalid-file-uri},
 * {@code invalid-options}, {@code bbj-home-not-configured}, {@code bbjcpl-not-found},
 * {@code compile-timeout}, {@code spawn-failed}, {@code compile-errors} and {@code bbjcpl-error}.
 * The client dispatches on this value, never on {@code CompileResult.message} prose (D-10).
 */
public final class CompileModels {

    private CompileModels() {}

    /** Params for {@code bbj/compile}: the file to compile, identified by URI. */
    public static final class CompileParams {
        public String uri;

        public CompileParams(String uri) {
            this.uri = uri;
        }
    }

    /** Result of a {@code bbj/compile} request. */
    public static final class CompileResult {
        public boolean success;
        public List<Diagnostic> diagnostics;
        public String reason;
        public String message;
        public String file;
    }
}
