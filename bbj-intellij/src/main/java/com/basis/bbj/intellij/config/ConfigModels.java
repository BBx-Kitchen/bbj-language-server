package com.basis.bbj.intellij.config;

/**
 * Gson-serializable data object carrying the language server's {@code bbj/resolvedConfigPath}
 * request/notification payload (see {@code bbj-vscode/src/language/config-path-resolver.ts} and
 * {@code bbj-vscode/src/language/resolved-config-path-request.ts}). The TypeScript side is the
 * single source of truth for these values; this class only carries the JSON across LSP4IJ.
 * Field names must match the JSON keys exactly.
 */
public final class ConfigModels {

    private ConfigModels() {}

    /** Result of {@code bbj/resolvedConfigPath}: the one shared answer to "which file is the BBj config file". */
    public static final class ResolvedConfigPathResult {
        /** Absolute, symlink-resolved, OS-normalized path, or {@code null} if none could be determined. */
        public String path;
        /** Where this path came from: {@code "setting"}, {@code "default"} or {@code "none"}. */
        public String source;
        /** Whether the resolved path exists and is readable. Always {@code false} when {@code path} is {@code null}. */
        public boolean exists;
        /** A message naming the exact path when resolution failed or the file is missing/unreadable, else {@code null}. */
        public String problem;
    }
}
