package com.basis.bbj.intellij.lsp;

/**
 * Plain-Java seam for the IntelliJ-side half of the "Compile output directory" setting (#571).
 * <p>
 * The value travels to the language server as a <b>flat</b> {@code initializationOptions} key,
 * not as a nested key inside {@link BbjLanguageClient#createSettings()}. LSP4IJ 0.19.0's generic
 * settings push (the only caller of {@code triggerChangeConfiguration()}) is never wired for BBj
 * settings, and its pull path ({@code workspace/configuration}, {@code section: "bbj"}) resolves
 * {@code SettingsHelper.findSettings("bbj", ...)} against {@code createSettings()}'s flat JSON
 * object, which has no {@code "bbj"} wrapper key and therefore returns null. The
 * {@code initializationOptions} channel built in {@link BbjLanguageServerFactory} is the one that
 * reliably reaches the server — it is exactly how {@code compilerTrigger} already works, and a
 * settings-apply restart re-sends fresh initialization options for free.
 * <p>
 * This class has no IntelliJ platform dependency so it can be covered by plain JUnit 5 tests.
 */
public final class CompilerInitOptions {

    /**
     * The flat {@code initializationOptions} key the language server reads in
     * {@code bbj-ws-manager.ts}'s {@code onInitialize} handler.
     */
    public static final String COMPILER_OUTPUT_DIRECTORY_KEY = "compilerOutputDirectory";

    private CompilerInitOptions() {
    }

    /**
     * Normalises a raw, possibly user-typed compiler output directory value for transmission to
     * the language server.
     * <p>
     * Returns the empty string for {@code null} or a value that is blank after trimming — the
     * language server treats the empty string as "no output directory configured" and refuses to
     * compile in place (D-05). A non-blank value is returned trimmed but otherwise untouched: no
     * filesystem check, no path canonicalisation, no separator rewriting, and interior whitespace
     * is preserved because the value becomes exactly one argument-array element on the server side
     * (GHSA-p5f3-9456-9pcx's one-string-one-argument convention).
     *
     * @param raw the raw field value, or {@code null}
     * @return the trimmed value, or the empty string when unset or blank
     */
    public static String normalizeOutputDirectory(String raw) {
        if (raw == null) {
            return "";
        }
        return raw.trim();
    }
}
