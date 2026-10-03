package com.basis.bbj.intellij.denum;

import org.jetbrains.annotations.Nullable;

import java.util.List;

/** Placeholder until the rendering is written. */
public final class DenumDiagnosticsPresenter {

    private DenumDiagnosticsPresenter() {}

    /** One console line and whether it is printed as error output. */
    public record Line(String text, boolean error) {}

    static final String UNKNOWN_FILE = "an unknown file";

    public static List<Line> present(@Nullable DenumModels.DenumDiagnosticsParams params) {
        return List.of();
    }

    static String flatten(String text) {
        return text;
    }
}
