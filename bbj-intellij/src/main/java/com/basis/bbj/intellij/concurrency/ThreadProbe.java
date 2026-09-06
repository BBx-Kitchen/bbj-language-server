package com.basis.bbj.intellij.concurrency;

/**
 * Seam letting a background-only task refuse to run on the EDT, without importing the IntelliJ
 * platform (D-03). Production call sites pass {@code () ->
 * ApplicationManager.getApplication().isDispatchThread()}; there is no production adapter class
 * for this one — it is a single method, trivially supplied as a lambda at each call site.
 */
@FunctionalInterface
public interface ThreadProbe {

    /**
     * Whether the calling thread is currently the Event Dispatch Thread.
     */
    boolean isDispatchThread();
}
