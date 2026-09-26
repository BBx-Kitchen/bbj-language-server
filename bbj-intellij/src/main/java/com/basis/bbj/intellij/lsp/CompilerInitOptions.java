package com.basis.bbj.intellij.lsp;

import java.util.List;

/**
 * Plain-Java seam for the IntelliJ-side half of the "Compile output directory" (#571) and
 * "Compiler check" settings.
 * <p>
 * Both values travel to the language server as <b>flat</b> {@code initializationOptions} keys,
 * not as nested keys inside {@link BbjLanguageClient#createSettings()}. LSP4IJ 0.19.0's generic
 * settings push (the only caller of {@code triggerChangeConfiguration()}) is never wired for BBj
 * settings, and its pull path ({@code workspace/configuration}, {@code section: "bbj"}) resolves
 * {@code SettingsHelper.findSettings("bbj", ...)} against {@code createSettings()}'s flat JSON
 * object, which has no {@code "bbj"} wrapper key and therefore returns null. The
 * {@code initializationOptions} channel built in {@link BbjLanguageServerFactory} is the one that
 * reliably reaches the server for both keys, and a settings-apply restart re-sends fresh
 * initialization options for free.
 * <p>
 * This class has no IntelliJ platform dependency so it can be covered by plain JUnit 5 tests.
 */
public final class CompilerInitOptions {

    /**
     * The flat {@code initializationOptions} key the language server reads in
     * {@code bbj-ws-manager.ts}'s {@code onInitialize} handler.
     */
    public static final String COMPILER_OUTPUT_DIRECTORY_KEY = "compilerOutputDirectory";

    /**
     * The flat {@code initializationOptions} key the language server reads in
     * {@code bbj-ws-manager.ts}'s {@code onInitialize} handler for the compiler trigger mode.
     */
    public static final String COMPILER_TRIGGER_KEY = "compilerTrigger";

    public static final String TRIGGER_DEBOUNCED = "debounced";
    public static final String TRIGGER_ON_SAVE = "on-save";
    public static final String TRIGGER_OFF = "off";

    /** Dropdown display order: Debounced, On save, Off. */
    public static final List<String> TRIGGER_DISPLAY_NAMES = List.of("Debounced", "On save", "Off");

    private CompilerInitOptions() {
    }

    /**
     * Normalises a raw, possibly user-typed compiler output directory value for transmission to
     * the language server.
     * <p>
     * Returns the empty string for {@code null} or a value that is blank after trimming — the
     * language server treats the empty string as "no output directory configured" and refuses to
     * compile in place. A non-blank value is returned trimmed but otherwise untouched: no
     * filesystem check, no path canonicalisation, no separator rewriting, and interior whitespace
     * is preserved because the value becomes exactly one argument-array element on the server side
     * (the server's one-string-one-argument argv convention).
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

    /**
     * Normalises a raw, possibly persisted or user-supplied compiler trigger value for
     * transmission to the language server.
     * <p>
     * Trims the input, then returns it unchanged when it is exactly one of the three wire values
     * the server accepts ({@link #TRIGGER_DEBOUNCED}, {@link #TRIGGER_ON_SAVE},
     * {@link #TRIGGER_OFF}). Anything else — {@code null}, blank, or an unrecognised value from a
     * hand-edited settings file — normalises to {@link #TRIGGER_DEBOUNCED}, matching the server's
     * own allow-list fallback in {@code bbj-ws-manager.ts}.
     *
     * @param raw the raw field value, or {@code null}
     * @return one of the three wire values
     */
    public static String normalizeTrigger(String raw) {
        if (raw == null) {
            return TRIGGER_DEBOUNCED;
        }
        String trimmed = raw.trim();
        if (TRIGGER_DEBOUNCED.equals(trimmed) || TRIGGER_ON_SAVE.equals(trimmed) || TRIGGER_OFF.equals(trimmed)) {
            return trimmed;
        }
        return TRIGGER_DEBOUNCED;
    }

    /**
     * Returns the dropdown display name for a wire value, after normalising it.
     *
     * @param wireValue the wire value, possibly unnormalised
     * @return the matching entry from {@link #TRIGGER_DISPLAY_NAMES}
     */
    public static String triggerDisplayName(String wireValue) {
        String normalized = normalizeTrigger(wireValue);
        if (TRIGGER_ON_SAVE.equals(normalized)) {
            return "On save";
        }
        if (TRIGGER_OFF.equals(normalized)) {
            return "Off";
        }
        return "Debounced";
    }

    /**
     * Returns the wire value for a dropdown display name. Any value other than the three known
     * display names — including {@code null} — returns {@link #TRIGGER_DEBOUNCED}.
     *
     * @param displayName the selected dropdown item
     * @return one of the three wire values
     */
    public static String triggerFromDisplayName(String displayName) {
        if ("On save".equals(displayName)) {
            return TRIGGER_ON_SAVE;
        }
        if ("Off".equals(displayName)) {
            return TRIGGER_OFF;
        }
        return TRIGGER_DEBOUNCED;
    }
}
