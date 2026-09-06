package com.basis.bbj.intellij;

import org.junit.jupiter.api.Test;

import java.lang.reflect.Method;
import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.function.Function;
import java.util.function.Predicate;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Behavioural coverage of {@link BbjSettingsLookups}'s failure path: a throwing collaborator on
 * either the Node or the home lookup must produce a failure-marked result rather than propagate,
 * an empty path must consult no collaborator at all, and neither public entry point may declare a
 * checked exception — the contract the debounced background task depends on.
 */
class BbjSettingsLookupsFailurePathTest {

    private static final class CountingPredicate implements Predicate<String> {
        private final boolean answer;
        private final AtomicInteger invocations = new AtomicInteger();

        CountingPredicate(boolean answer) {
            this.answer = answer;
        }

        @Override
        public boolean test(String s) {
            invocations.incrementAndGet();
            return answer;
        }

        int invocations() {
            return invocations.get();
        }
    }

    private static final class CountingFunction<R> implements Function<String, R> {
        private final R answer;
        private final AtomicInteger invocations = new AtomicInteger();

        CountingFunction(R answer) {
            this.answer = answer;
        }

        @Override
        public R apply(String s) {
            invocations.incrementAndGet();
            return answer;
        }

        int invocations() {
            return invocations.get();
        }
    }

    private static final class ThrowingPredicate implements Predicate<String> {
        @Override
        public boolean test(String s) {
            throw new IllegalStateException("boom: predicate blew up");
        }
    }

    private static final class ThrowingFunction<R> implements Function<String, R> {
        @Override
        public R apply(String s) {
            throw new IllegalStateException("boom: function blew up");
        }
    }

    // ---- Node lookup failure path ----

    @Test
    void aVersionResolverThatThrowsYieldsAFailedNodeLookupRatherThanPropagating() {
        BbjSettingsLookups.NodeLookup result = BbjSettingsLookups.lookupNode(
                "/opt/bbj-test/node",
                new CountingPredicate(true),
                new ThrowingFunction<>(),
                new CountingPredicate(true));

        assertTrue(result.failed(), "a throwing version resolver must yield a failed result");
        assertEquals("/opt/bbj-test/node", result.path(), "the path being looked up is still carried");
        assertNull(result.version(), "a failed result carries no version");
    }

    @Test
    void aMinimumVersionCheckThatThrowsAlsoYieldsAFailedNodeLookup() {
        BbjSettingsLookups.NodeLookup result = BbjSettingsLookups.lookupNode(
                "/opt/bbj-test/node",
                new CountingPredicate(true),
                new CountingFunction<>("v20.0.0"),
                new ThrowingPredicate());

        assertTrue(result.failed(),
                "a throwing minimum-version predicate must yield a failed result too, proving the "
                        + "catch covers the whole body and not only the first collaborator");
        assertNull(result.version(), "a failed result carries no version");
    }

    // ---- Home lookup failure path ----

    @Test
    void aClasspathEnumeratorThatThrowsYieldsAFailedHomeLookup() {
        BbjSettingsLookups.HomeLookup result = BbjSettingsLookups.lookupHome(
                "/opt/bbj-test/home",
                new CountingPredicate(true),
                new ThrowingFunction<>());

        assertTrue(result.failed(), "a throwing classpath enumerator must yield a failed result");
        assertFalse(result.valid(), "a failed result must not claim validity");
        assertTrue(result.entries().isEmpty(), "a failed result carries an empty entry list, not null");
    }

    @Test
    void aValidHomePredicateThatThrowsAlsoYieldsAFailedHomeLookup() {
        BbjSettingsLookups.HomeLookup result = BbjSettingsLookups.lookupHome(
                "/opt/bbj-test/home",
                new ThrowingPredicate(),
                new CountingFunction<>(List.of("entry.jar")));

        assertTrue(result.failed(),
                "a throwing valid-home predicate must yield a failed result too, proving the catch "
                        + "covers the whole body and not only the first collaborator");
        assertFalse(result.valid());
        assertTrue(result.entries().isEmpty());
    }

    // ---- Empty-input edge: consults nothing ----

    @Test
    void anEmptyNodePathIsNotAFailureAndConsultsNeitherCollaborator() {
        CountingPredicate fileExists = new CountingPredicate(true);
        CountingFunction<String> versionOf = new CountingFunction<>("v20.0.0");
        CountingPredicate meetsMinimum = new CountingPredicate(true);

        BbjSettingsLookups.NodeLookup result =
                BbjSettingsLookups.lookupNode("", fileExists, versionOf, meetsMinimum);

        assertFalse(result.failed(), "an empty path is a normal not-exists result, not a failure");
        assertFalse(result.exists());
        assertEquals(0, fileExists.invocations(), "a blank field must never spawn anything");
        assertEquals(0, versionOf.invocations());
        assertEquals(0, meetsMinimum.invocations());
    }

    @Test
    void anEmptyHomePathIsNotAFailureAndConsultsNeitherCollaborator() {
        CountingPredicate validHome = new CountingPredicate(true);
        CountingFunction<List<String>> entriesOf = new CountingFunction<>(List.of("entry.jar"));

        BbjSettingsLookups.HomeLookup result =
                BbjSettingsLookups.lookupHome("", validHome, entriesOf);

        assertFalse(result.failed(), "an empty path is a normal invalid result, not a failure");
        assertFalse(result.valid());
        assertEquals(0, validHome.invocations(), "a blank field must never spawn anything");
        assertEquals(0, entriesOf.invocations());
    }

    // ---- The flag is not always true ----

    @Test
    void aSuccessfulLookupIsNotMarkedFailed() {
        BbjSettingsLookups.NodeLookup nodeResult = BbjSettingsLookups.lookupNode(
                "/opt/bbj-test/node",
                new CountingPredicate(true),
                new CountingFunction<>("v20.0.0"),
                new CountingPredicate(true));
        BbjSettingsLookups.HomeLookup homeResult = BbjSettingsLookups.lookupHome(
                "/opt/bbj-test/home",
                new CountingPredicate(true),
                new CountingFunction<>(List.of("entry.jar")));

        assertFalse(nodeResult.failed(), "the flag must not be hard-coded true");
        assertFalse(homeResult.failed(), "the flag must not be hard-coded true");
    }

    // ---- The public entry points declare no checked exception ----

    @Test
    void neitherPublicEntryPointDeclaresAThrownException() throws NoSuchMethodException {
        Method lookupNode = BbjSettingsLookups.class.getDeclaredMethod("lookupNode", String.class);
        Method lookupHome = BbjSettingsLookups.class.getDeclaredMethod("lookupHome", String.class);

        assertEquals(0, lookupNode.getExceptionTypes().length,
                "lookupNode(String) must declare zero exception types");
        assertEquals(0, lookupHome.getExceptionTypes().length,
                "lookupHome(String) must declare zero exception types");
    }
}
