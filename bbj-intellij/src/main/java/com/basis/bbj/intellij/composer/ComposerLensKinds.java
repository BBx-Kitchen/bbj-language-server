package com.basis.bbj.intellij.composer;

import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

/**
 * Pure wire-kind to {@link ComposerLauncher.Kind} mapping (#650). The wire kinds come from the
 * language server's cue contract ({@code bbj-vscode/src/composer-lens-contract.ts}); this class
 * only routes a server-computed target to the matching launcher kind and makes no applicability
 * decision of its own — that decision is entirely the server's.
 *
 * <p>Carries no IntelliJ Platform import, so it stays runnable on the plain JUnit 5 classpath.</p>
 */
public final class ComposerLensKinds {

    private ComposerLensKinds() {}

    /**
     * The command id a composer cue's LSP {@code Command} invokes. Must equal both the
     * IntelliJ action id LSP4IJ looks up via {@code ActionManager.getAction} and the literal
     * quoted in {@code bbj-vscode/src/composer-lens-contract.ts}.
     */
    public static final String OPEN_COMPOSER_AT_COMMAND = "bbj.openComposerAt";

    private static final Map<String, ComposerLauncher.Kind> WIRE_TO_LAUNCHER_KIND;

    static {
        Map<String, ComposerLauncher.Kind> map = new LinkedHashMap<>();
        map.put("msgbox", ComposerLauncher.Kind.MSGBOX);
        map.put("addwindow", ComposerLauncher.Kind.ADDWINDOW);
        map.put("addchildwindow", ComposerLauncher.Kind.ADDCHILDWINDOW);
        map.put("cvs", ComposerLauncher.Kind.CVS);
        map.put("setopts-in-code", ComposerLauncher.Kind.SETOPTS_IN_CODE);
        map.put("setopts-config", ComposerLauncher.Kind.SETOPTS);
        WIRE_TO_LAUNCHER_KIND = Collections.unmodifiableMap(map);
    }

    /**
     * The {@link ComposerLauncher.Kind} a cue's wire {@code kind} string routes to, or empty for
     * an unrecognized string, {@code null} or blank.
     */
    public static Optional<ComposerLauncher.Kind> launcherKindOf(String wireKind) {
        if (wireKind == null) {
            return Optional.empty();
        }
        return Optional.ofNullable(WIRE_TO_LAUNCHER_KIND.get(wireKind));
    }

    /** Every wire kind this class currently maps, for the cross-language contract test. */
    public static Set<String> mappedWireKinds() {
        return WIRE_TO_LAUNCHER_KIND.keySet();
    }
}
