package com.basis.bbj.intellij.ui;

import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.fail;

/**
 * Structural pin for {@code BbjJavaInteropService}'s disposal guards (#592, #593). No live
 * IntelliJ project disposal can be simulated in plain JUnit, so the guarantee is pinned here
 * instead: the guard must be the entry statement of {@code checkConnection()}, the first statement
 * inside {@code broadcastStatus()}'s {@code invokeLater} lambda, and the first statement inside the
 * constructor's startup {@code invokeLater} lambda that seeds the poll gate -- three sites, not
 * outside any of them.
 */
class BbjJavaInteropServiceDisposalSourceGuardTest {

    private static final Path BBJ_JAVA_INTEROP_SERVICE_SOURCE = Paths.get(
            "src", "main", "java", "com", "basis", "bbj", "intellij", "ui",
            "BbjJavaInteropService.java")
            .toAbsolutePath();

    private static final String IS_DISPOSED = "project.isDisposed()";

    private static String readSource(Path path) {
        if (!Files.exists(path)) {
            fail("Guarded source not found at " + path);
        }
        try {
            return Files.readString(path);
        } catch (IOException e) {
            throw new UncheckedIOExceptionForTest(path, e);
        }
    }

    private static final class UncheckedIOExceptionForTest extends RuntimeException {
        UncheckedIOExceptionForTest(Path resolved, IOException cause) {
            super("Failed to read " + resolved, cause);
        }
    }

    /**
     * Strips line comments and block comments (including javadoc) from {@code text} before any
     * assertion counts occurrences, so a prose comment mentioning a guarded token can neither
     * satisfy nor break an assertion. Each guard keeps its own private copy of this helper.
     */
    private static String stripComments(String text) {
        String noBlockComments = text.replaceAll("(?s)/\\*.*?\\*/", "");
        return noBlockComments.replaceAll("//[^\n]*", "");
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
    void isDisposedGuardOccursExactlyThreeTimes() {
        // Widened from 2 to 3 for #593: the constructor's startup invokeLater lambda that seeds
        // the poll gate needs the identical guard, since it reads FileEditorManager on a project
        // that may have been disposed between scheduling and running.
        String text = stripComments(readSource(BBJ_JAVA_INTEROP_SERVICE_SOURCE));
        assertEquals(3, countOccurrences(text, IS_DISPOSED),
                "BbjJavaInteropService must guard exactly three sites: checkConnection() entry, "
                        + "broadcastStatus()'s invokeLater lambda, and the constructor's startup "
                        + "invokeLater lambda");
    }

    @Test
    void constructorStartupSeedGuardsInsideTheInvokeLaterLambdaNotOutsideIt() {
        String text = stripComments(readSource(BBJ_JAVA_INTEROP_SERVICE_SOURCE));
        int constructorIndex = text.indexOf("public BbjJavaInteropService(");
        assertTrue(constructorIndex >= 0, "the constructor must be present");
        int getInstanceIndex = text.indexOf("public static BbjJavaInteropService getInstance(",
                constructorIndex);
        assertTrue(getInstanceIndex >= 0, "getInstance() must follow the constructor");

        String constructorBody = text.substring(constructorIndex, getInstanceIndex);
        int invokeLaterIndex = constructorBody.indexOf("invokeLater");
        int guardIndex = constructorBody.indexOf(IS_DISPOSED);
        assertTrue(invokeLaterIndex >= 0,
                "the constructor must schedule an invokeLater to seed the poll gate");
        assertTrue(guardIndex >= 0,
                "the constructor's startup invokeLater lambda must guard on project.isDisposed()");
        assertTrue(invokeLaterIndex < guardIndex,
                "the disposal guard must be inside the invokeLater lambda, not before it");
    }

    @Test
    void checkConnectionGuardsBeforeAnyProbeOrStatusWork() {
        String text = stripComments(readSource(BBJ_JAVA_INTEROP_SERVICE_SOURCE));
        int methodIndex = text.indexOf("private void checkConnection(");
        assertTrue(methodIndex >= 0, "checkConnection() must be present");
        int guardIndex = text.indexOf(IS_DISPOSED, methodIndex);
        assertTrue(guardIndex >= 0, "checkConnection() must guard on project.isDisposed()");

        String beforeGuard = text.substring(methodIndex, guardIndex);
        assertFalse(beforeGuard.contains("Socket"),
                "nothing must run before the disposal guard in checkConnection() -- found Socket");
        assertFalse(beforeGuard.contains("InteropProbeClient"),
                "nothing must run before the disposal guard in checkConnection() -- found "
                        + "InteropProbeClient");
        assertFalse(beforeGuard.contains("updateStatus("),
                "nothing must run before the disposal guard in checkConnection() -- found "
                        + "updateStatus(");
    }

    @Test
    void broadcastStatusGuardsInsideTheInvokeLaterLambdaNotOutsideIt() {
        String text = stripComments(readSource(BBJ_JAVA_INTEROP_SERVICE_SOURCE));
        int methodIndex = text.indexOf("private void broadcastStatus(");
        assertTrue(methodIndex >= 0, "broadcastStatus() must be present");
        int messageBusIndex = text.indexOf("project.getMessageBus()", methodIndex);
        assertTrue(messageBusIndex >= 0,
                "broadcastStatus() must publish via project.getMessageBus()");

        String body = text.substring(methodIndex, messageBusIndex);
        int invokeLaterIndex = body.indexOf("invokeLater");
        int guardIndex = body.indexOf(IS_DISPOSED);
        assertTrue(invokeLaterIndex >= 0, "broadcastStatus() must dispatch via invokeLater");
        assertTrue(guardIndex >= 0,
                "broadcastStatus()'s invokeLater lambda must guard on project.isDisposed()");
        assertTrue(invokeLaterIndex < guardIndex,
                "the disposal guard must be inside the invokeLater lambda, not before it");
    }
}
