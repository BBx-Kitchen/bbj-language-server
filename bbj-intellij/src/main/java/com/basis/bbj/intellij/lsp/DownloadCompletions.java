package com.basis.bbj.intellij.lsp;

import java.util.List;
import java.util.function.Consumer;

/**
 * Hands every completion drained from the download guard to a UI executor exactly once, in
 * attachment order, isolating each hand-over from the others. One editor-banner refresh that
 * throws must never swallow the refreshes still waiting behind it — that isolation is this
 * class's only job. Plain Java, no IntelliJ platform import, so it is fully covered by plain
 * JUnit 5 tests.
 */
public final class DownloadCompletions {

    private DownloadCompletions() {
    }

    /**
     * Hands each non-null element of {@code drained} to {@code uiExecutor}, in list order,
     * exactly once. A {@code null} element is skipped rather than dispatched. A
     * {@link RuntimeException} thrown by {@code uiExecutor} or by a completion it runs does not
     * prevent the remaining elements from being handed over.
     */
    public static void dispatch(List<Runnable> drained, Consumer<Runnable> uiExecutor) {
        for (Runnable completion : drained) {
            if (completion == null) {
                continue;
            }
            try {
                uiExecutor.accept(completion);
            } catch (RuntimeException e) {
                // Isolate this hand-over's failure so the remaining completions still run.
            }
        }
    }
}
