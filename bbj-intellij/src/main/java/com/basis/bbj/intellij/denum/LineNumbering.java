package com.basis.bbj.intellij.denum;

import org.jetbrains.annotations.NotNull;

/** Java port of {@code isLineNumberedSource} in {@code bbj-vscode/src/line-numbering.ts}. */
public final class LineNumbering {

    static final int MAX_LINES_TO_INSPECT = 20;
    static final int MIN_LINES_TO_DECIDE = 3;

    private LineNumbering() {}

    public static boolean isLineNumberedSource(@NotNull CharSequence text) {
        return false;
    }
}
