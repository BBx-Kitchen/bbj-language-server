package com.basis.bbj.intellij.lsp;

import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class DownloadCompletionsTest {

    /** Records every runnable it receives, in the order received, then runs it immediately. */
    private static final class RecordingExecutor implements java.util.function.Consumer<Runnable> {
        private final List<Runnable> received = new ArrayList<>();

        @Override
        public void accept(Runnable runnable) {
            received.add(runnable);
            runnable.run();
        }

        List<Runnable> received() {
            return received;
        }
    }

    /** A completion that records whether it ran, and optionally throws when it does. */
    private static final class RecordingCompletion implements Runnable {
        private final boolean throwsOnRun;
        private int runCount;

        RecordingCompletion(boolean throwsOnRun) {
            this.throwsOnRun = throwsOnRun;
        }

        @Override
        public void run() {
            runCount++;
            if (throwsOnRun) {
                throw new RuntimeException("boom");
            }
        }

        int runCount() {
            return runCount;
        }
    }

    @Test
    void everyDrainedCompletionReachesTheUiExecutorExactlyOnceInAttachmentOrder() {
        RecordingCompletion c1 = new RecordingCompletion(false);
        RecordingCompletion c2 = new RecordingCompletion(false);
        RecordingCompletion c3 = new RecordingCompletion(false);
        RecordingExecutor executor = new RecordingExecutor();

        DownloadCompletions.dispatch(Arrays.asList(c1, c2, c3), executor);

        assertEquals(List.of(c1, c2, c3), executor.received(), "the executor must receive exactly these three, in order");
        assertEquals(1, c1.runCount());
        assertEquals(1, c2.runCount());
        assertEquals(1, c3.runCount());
    }

    @Test
    void aCompletionThatThrowsDoesNotStopTheRemainingCompletions() {
        RecordingCompletion c1 = new RecordingCompletion(false);
        RecordingCompletion c2 = new RecordingCompletion(true);
        RecordingCompletion c3 = new RecordingCompletion(false);
        RecordingExecutor executor = new RecordingExecutor();

        assertDoesNotThrow(() -> DownloadCompletions.dispatch(Arrays.asList(c1, c2, c3), executor));

        assertEquals(List.of(c1, c2, c3), executor.received(), "all three must still reach the executor");
        assertEquals(1, c1.runCount());
        assertEquals(1, c2.runCount(), "the throwing completion must still have run once");
        assertEquals(1, c3.runCount(), "the completion after the throwing one must still run");
    }

    @Test
    void anEmptyDrainDispatchesNothing() {
        RecordingExecutor executor = new RecordingExecutor();

        assertDoesNotThrow(() -> DownloadCompletions.dispatch(List.of(), executor));

        assertTrue(executor.received().isEmpty(), "an empty drain must invoke the executor zero times");
    }

    @Test
    void aNullCompletionInTheListIsSkippedRatherThanDispatched() {
        RecordingCompletion c1 = new RecordingCompletion(false);
        RecordingCompletion c3 = new RecordingCompletion(false);
        List<Runnable> withNull = Arrays.asList(c1, null, c3);
        RecordingExecutor executor = new RecordingExecutor();

        assertDoesNotThrow(() -> DownloadCompletions.dispatch(withNull, executor));

        assertEquals(List.of(c1, c3), executor.received(), "the null element must be skipped, not dispatched");
        assertEquals(1, c1.runCount());
        assertEquals(1, c3.runCount());
    }
}
