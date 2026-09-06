package com.basis.bbj.intellij.concurrency;

import com.intellij.openapi.Disposable;
import com.intellij.util.Alarm;
import org.jetbrains.annotations.NotNull;

/**
 * Production {@link Scheduler} adapter over {@code com.intellij.util.Alarm}, matching the
 * existing {@code Alarm(ThreadToUse.POOLED_THREAD, parent)} idiom already used by
 * {@code BbjServerService.restartAlarm} and {@code BbjJavaInteropService.checkAlarm}. The Alarm's
 * lifecycle is tied to {@code parent}, so it is disposed automatically when the parent is.
 */
public final class AlarmScheduler implements Scheduler {

    private final Alarm alarm;

    public AlarmScheduler(@NotNull Disposable parent) {
        this.alarm = new Alarm(Alarm.ThreadToUse.POOLED_THREAD, parent);
    }

    @Override
    public void schedule(Runnable task, long delayMs) {
        alarm.addRequest(task, delayMs);
    }

    @Override
    public void cancel(Runnable task) {
        alarm.cancelRequest(task);
    }

    @Override
    public void cancelAll() {
        alarm.cancelAllRequests();
    }
}
