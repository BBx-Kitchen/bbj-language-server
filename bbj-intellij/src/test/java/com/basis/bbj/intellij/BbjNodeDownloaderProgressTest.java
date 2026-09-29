package com.basis.bbj.intellij;

import com.basis.bbj.intellij.lsp.NodeInstallPipeline;
import com.intellij.openapi.progress.ProgressIndicator;
import org.junit.jupiter.api.Test;

import java.lang.reflect.InvocationHandler;
import java.lang.reflect.Method;
import java.lang.reflect.Proxy;
import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Behavioural coverage for {@link BbjNodeDownloader#progressReporter(ProgressIndicator)}, driven
 * by a recording fake {@link ProgressIndicator} built with {@link Proxy#newProxyInstance} -- no
 * IDE application is started. The fake starts indeterminate, like a fresh platform indicator, and
 * records a violation whenever setFraction arrives while indeterminate, standing in for the
 * platform's real IllegalStateException log line.
 */
class BbjNodeDownloaderProgressTest {

    /**
     * Records every setIndeterminate/setText/setFraction call as a readable string in call order,
     * tracks the indicator's own indeterminate flag, and records a violation whenever setFraction
     * arrives while that flag is still true.
     */
    private static final class RecordingIndicator implements InvocationHandler {
        private final List<String> calls = new ArrayList<>();
        private final List<String> violations = new ArrayList<>();
        private boolean indeterminate = true;

        ProgressIndicator asProxy() {
            return (ProgressIndicator) Proxy.newProxyInstance(
                    getClass().getClassLoader(), new Class<?>[] {ProgressIndicator.class}, this);
        }

        /** Simulates the platform's file-save routine resetting the indicator between chunks. */
        void resetToIndeterminate() {
            indeterminate = true;
        }

        @Override
        public Object invoke(Object proxy, Method method, Object[] args) {
            switch (method.getName()) {
                case "setIndeterminate": {
                    boolean value = (Boolean) args[0];
                    calls.add("setIndeterminate(" + value + ")");
                    indeterminate = value;
                    return null;
                }
                case "isIndeterminate":
                    return indeterminate;
                case "setText": {
                    String text = (String) args[0];
                    calls.add("setText(" + text + ")");
                    return null;
                }
                case "setFraction": {
                    double fraction = (Double) args[0];
                    if (indeterminate) {
                        violations.add("setFraction(" + fraction + ") while indeterminate");
                    }
                    calls.add("setFraction(" + fraction + ")");
                    return null;
                }
                case "equals":
                    return proxy == args[0];
                case "hashCode":
                    return System.identityHashCode(proxy);
                case "toString":
                    return "RecordingIndicator" + calls;
                default:
                    return zeroValueFor(method.getReturnType());
            }
        }

        private static Object zeroValueFor(Class<?> returnType) {
            if (!returnType.isPrimitive() || returnType == void.class) {
                return null;
            }
            if (returnType == boolean.class) {
                return false;
            }
            if (returnType == double.class) {
                return 0.0d;
            }
            return 0;
        }
    }

    @Test
    void aSingleStepOnAFreshIndeterminateIndicatorRecordsSetIndeterminateThenTextThenFractionWithNoViolation() {
        RecordingIndicator fake = new RecordingIndicator();
        NodeInstallPipeline.Progress progress = BbjNodeDownloader.progressReporter(fake.asProxy());

        progress.step("Downloading", 0.1);

        assertEquals(List.of("setIndeterminate(false)", "setText(Downloading)", "setFraction(0.1)"), fake.calls);
        assertTrue(fake.violations.isEmpty(), "no violation expected: " + fake.violations);
    }

    @Test
    void threeStepsWithAPlatformStyleResetBetweenEachRecordNoViolationAndReassertDeterminateEachTime() {
        RecordingIndicator fake = new RecordingIndicator();
        NodeInstallPipeline.Progress progress = BbjNodeDownloader.progressReporter(fake.asProxy());

        progress.step("Downloading", 0.1);
        fake.resetToIndeterminate();
        progress.step("Verifying", 0.4);
        fake.resetToIndeterminate();
        progress.step("Extracting", 0.7);

        assertTrue(fake.violations.isEmpty(), "no violation expected: " + fake.violations);
        long resets = fake.calls.stream().filter(call -> call.equals("setIndeterminate(false)")).count();
        assertEquals(3, resets, "setIndeterminate(false) must run before every step, not just the first");

        int lastFractionIndex = -1;
        for (int i = 0; i < fake.calls.size(); i++) {
            if (fake.calls.get(i).startsWith("setFraction(")) {
                boolean sawReset = false;
                for (int j = lastFractionIndex + 1; j < i; j++) {
                    if (fake.calls.get(j).equals("setIndeterminate(false)")) {
                        sawReset = true;
                    }
                }
                assertTrue(sawReset,
                        "setFraction at index " + i + " has no setIndeterminate(false) since the previous fraction");
                lastFractionIndex = i;
            }
        }
    }

    @Test
    void textAndFractionValuesAreForwardedUnchanged() {
        RecordingIndicator fake = new RecordingIndicator();
        NodeInstallPipeline.Progress progress = BbjNodeDownloader.progressReporter(fake.asProxy());

        progress.step("Installing Node.js to plugin directory...", 0.9);

        assertTrue(fake.calls.contains("setText(Installing Node.js to plugin directory...)"));
        assertTrue(fake.calls.contains("setFraction(0.9)"));
    }

    @Test
    void withTheCallbackBuiltButNeverInvokedTheFakeRecordsNothing() {
        RecordingIndicator fake = new RecordingIndicator();
        BbjNodeDownloader.progressReporter(fake.asProxy());

        assertTrue(fake.calls.isEmpty());
        assertTrue(fake.violations.isEmpty());
    }
}
