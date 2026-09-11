package com.basis.bbj.intellij.composer;

/**
 * The Java twin of {@code bbj-vscode/src/setopts-catalog.ts}'s {@code bbjHexLiteral} (G-88-3):
 * the ONE place on this host that decides how a BBj hex literal is spelled.
 * <p>
 * BBj's grammar declares {@code STRING_LITERAL} ({@code "…"}) and {@code HEX_STRING}
 * ({@code $…$}) as two SEPARATE terminals ({@code bbj.langium:949-950}) -- wrapping a hex value
 * in quotes turns a byte-decoded {@code HEX_STRING} into a plain-text {@code STRING_LITERAL}
 * instead, which BBj never hex-decodes. Inside a BBj program, a BARE run of hex digits (no
 * {@code $…$} delimiters at all) is not valid {@code SETOPTS}/{@code IOR}/{@code AND} argument
 * syntax either -- that form is correct only for {@code config.bbx} ({@code SetoptsComposerDialog},
 * #474), a different file format this class does not touch.
 * <p>
 * This class has no IntelliJ platform dependency so it can be covered by plain JUnit 5 tests,
 * mirroring the repo's existing plain-Java seam convention ({@code RemToggleSeam},
 * {@code CompilerInitOptions}, {@code NodeAvailability}).
 */
public final class BbjHexLiteral {

    private BbjHexLiteral() {
    }

    /**
     * Wraps {@code digits} in a dollar sign on each side -- the only correct spelling of a BBj
     * hex literal inside a BBj program. An empty {@code digits} yields {@code $$}, the empty-hex
     * form BBj itself documents.
     *
     * @param digits the hex digits, verbatim -- no validation, no case normalisation
     * @return {@code digits} delimited by a dollar sign on each side
     */
    public static String of(String digits) {
        return "$" + digits + "$";
    }
}
