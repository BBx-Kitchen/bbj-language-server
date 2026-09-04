package com.basis.bbj.intellij.lsp;

import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.fail;

/**
 * Source-guard fence: {@code BbjSettingsComponent} must perform zero filesystem/subprocess work
 * of its own — every such call moved into {@code BbjSettingsLookups}, reached only through a
 * debounced background lookup over one {@code AlarmScheduler}-backed {@code Scheduler}
 * (EDT-02, #541, D-12).
 */
class BbjSettingsComponentSourceGuardTest {

    private static final Path GUARDED_SOURCE = Paths.get(
            "src", "main", "java", "com", "basis", "bbj", "intellij", "BbjSettingsComponent.java")
            .toAbsolutePath();

    private static String readGuardedSource() {
        Path resolved = GUARDED_SOURCE;
        if (!Files.exists(resolved)) {
            fail("Guarded source file not found at " + resolved);
        }
        try {
            return Files.readString(resolved);
        } catch (IOException e) {
            throw new UncheckedIOExceptionForTest(resolved, e);
        }
    }

    private static final class UncheckedIOExceptionForTest extends RuntimeException {
        UncheckedIOExceptionForTest(Path resolved, IOException cause) {
            super("Failed to read " + resolved, cause);
        }
    }

    private static int countOccurrences(String text, String literal) {
        int count = 0;
        int index = 0;
        while ((index = text.indexOf(literal, index)) != -1) {
            count++;
            index += literal.length();
        }
        return count;
    }

    @Test
    void noFilesystemOrSubprocessHelperIsCalledDirectly() {
        String text = readGuardedSource();
        assertEquals(0, countOccurrences(text, "BbjNodeDetector."),
                "Node.js detection must be moved into BbjSettingsLookups");
        assertEquals(0, countOccurrences(text, "BbjHomeDetector."),
                "BBj home validation must be moved into BbjSettingsLookups");
        assertEquals(0, countOccurrences(text, "BbjSettings.getBBjClasspathEntries("),
                "classpath enumeration must be moved into BbjSettingsLookups");
        assertEquals(0, countOccurrences(text, "new File("),
                "no direct file construction may remain in the component");
    }

    @Test
    void exactlyOneAlarmSchedulerOwnsTheComponentsDebounceAndNoBareAlarmIsCreated() {
        String text = readGuardedSource();
        assertEquals(1, countOccurrences(text, "new AlarmScheduler(parentDisposable)"),
                "one Alarm, owned by the component's Disposable (D-12)");
        assertEquals(0, countOccurrences(text, "new Alarm("),
                "no bare Alarm may be created outside the AlarmScheduler seam");
    }

    @Test
    void eachDocumentAdapterCallsItsOwnDebouncerExactlyOnce() {
        String text = readGuardedSource();
        assertEquals(1, countOccurrences(text, "nodeDebouncer.onTextChanged("));
        assertEquals(1, countOccurrences(text, "homeDebouncer.onTextChanged("));
    }

    @Test
    void thePendingNodeLabelAppearsExactlyOnce() {
        String text = readGuardedSource();
        assertEquals(1, countOccurrences(text, "Checking Node.js version…"));
    }

    @Test
    void theThreadProbeIsWiredFromThePlatform() {
        String text = readGuardedSource();
        assertTrue(text.contains("isDispatchThread()"),
                "a ThreadProbe backed by the platform's isDispatchThread() must be wired in");
    }

    @Test
    void theGuardReadTheRightFile() {
        String text = readGuardedSource();
        int classIndex = text.indexOf("class BbjSettingsComponent");
        int alarmIndex = text.indexOf("new AlarmScheduler(parentDisposable)");
        assertTrue(classIndex >= 0, "class BbjSettingsComponent must be present");
        assertTrue(alarmIndex >= 0, "new AlarmScheduler(parentDisposable) must be present");
        assertTrue(classIndex < alarmIndex,
                "sanity anchor: the class declaration must precede the AlarmScheduler construction");
    }
}
