package com.basis.bbj.intellij.config;

import java.util.Locale;

/**
 * Platform-free path helpers mirroring the language server's
 * {@code bbj-vscode/src/language/config-path-resolver.ts} for the same inputs. No
 * {@code com.intellij} import, so this class is testable in plain JUnit exactly like
 * {@link com.basis.bbj.intellij.BbjSettingsLookups}.
 */
public final class ConfigPaths {

    private ConfigPaths() {}

    /**
     * The EM Config sentinel value meaning "not configured". Some settings UIs emit this literal
     * two-hyphen string rather than leaving the field blank; it must be treated identically to an
     * unset value everywhere it could otherwise leak into a resolved path or a spawned argv.
     */
    public static final String EM_CONFIG_SENTINEL = "--";

    /**
     * Normalizes a raw configured-path setting: {@code null}, blank, whitespace-only and the EM
     * Config sentinel all collapse to the empty string (meaning "unset"); anything else is
     * trimmed. This is the same sentinel-neutralization the language server's
     * {@code normalizeConfigSetting} performs.
     */
    public static String normalizeSetting(String raw) {
        if (raw == null) {
            return "";
        }
        String trimmed = raw.trim();
        if (trimmed.isEmpty() || trimmed.equals(EM_CONFIG_SENTINEL)) {
            return "";
        }
        return trimmed;
    }

    /**
     * Compares two path strings for equality using the host platform's name, case-insensitively
     * on win32/darwin and exactly elsewhere -- matching the language server's {@code samePath}
     * for the same inputs. Returns {@code false} when either side is {@code null} or empty.
     */
    public static boolean samePath(String a, String b) {
        return samePath(a, b, System.getProperty("os.name"));
    }

    /**
     * Same as {@link #samePath(String, String)} but with an injectable OS-name, so the
     * case-folding behavior for win32/darwin is testable on linux.
     *
     * <p>Normalizes both operands to forward slashes before comparing: {@code a} and {@code b}
     * are produced by two different subsystems on Windows (the language server's resolved path,
     * canonicalized via Node's {@code path.normalize} which uses backslashes on win32, vs.
     * IntelliJ's {@code VirtualFile.getPath()}, which the platform always returns with forward
     * slashes) -- unlike the TypeScript side, where both operands flow through the same
     * canonicalizer and never need separator normalization.
     */
    public static boolean samePath(String a, String b, String osName) {
        if (a == null || a.isEmpty() || b == null || b.isEmpty()) {
            return false;
        }
        String normalizedA = a.replace('\\', '/');
        String normalizedB = b.replace('\\', '/');
        if (isCaseInsensitivePlatform(osName)) {
            return normalizedA.equalsIgnoreCase(normalizedB);
        }
        return normalizedA.equals(normalizedB);
    }

    private static boolean isCaseInsensitivePlatform(String osName) {
        if (osName == null) {
            return false;
        }
        String lower = osName.toLowerCase(Locale.ROOT);
        return lower.contains("win") || lower.contains("mac") || lower.contains("darwin");
    }

    /**
     * Returns the {@code -c} run argument for a config path, or {@code null} for anything
     * {@link #normalizeSetting} empties -- the second defensive sentinel layer the folded todo
     * asks for; the shared language-server resolver is the primary layer.
     */
    public static String configPathArg(String path) {
        String normalized = normalizeSetting(path);
        if (normalized.isEmpty()) {
            return null;
        }
        return "-c" + normalized;
    }
}
