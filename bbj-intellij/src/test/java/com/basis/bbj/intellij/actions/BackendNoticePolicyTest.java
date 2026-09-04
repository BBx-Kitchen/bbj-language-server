package com.basis.bbj.intellij.actions;

import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Behavioural coverage for the once-per-distinct-non-keychain-backend notification rule (#552).
 *
 * <p>Every collaborator here is a plain in-memory double: a {@code String[]} holder standing in for
 * the production {@code PropertiesComponent} record, and an {@code ArrayList} standing in for the
 * production notification balloon. That is deliberate — the policy carries no IntelliJ platform
 * import, so it runs on this module's plain JUnit 5 test classpath with no platform fixture. The
 * fact that exactly one method in the plugin reads the unstable PasswordSafe settings API is a
 * separate, source-level property, proven by {@code EmTokenBackendNoticeSourceGuardTest}.
 */
class BackendNoticePolicyTest {

    /** Mutable single-slot store standing in for the persisted last-warned-backend record. */
    private static final class Store {
        private final String[] slot = new String[1];

        Store(String initial) {
            slot[0] = initial;
        }

        String get() {
            return slot[0];
        }

        void set(String value) {
            slot[0] = value;
        }
    }

    /** Counting notifier double: records both how many balloons were raised and for which backend. */
    private static final class Notifier {
        private final List<TokenBackend> calls = new ArrayList<>();

        void notify(TokenBackend backend) {
            calls.add(backend);
        }
    }

    private static BackendNoticePolicy policyOver(Store store, Notifier notifier) {
        return new BackendNoticePolicy(store::get, store::set, notifier::notify);
    }

    @Test
    void aKeepassBackendNotifiesOnce() {
        Store store = new Store("");
        Notifier notifier = new Notifier();
        BackendNoticePolicy policy = policyOver(store, notifier);

        policy.evaluate(TokenBackend.KEEPASS_FILE);

        assertEquals(List.of(TokenBackend.KEEPASS_FILE), notifier.calls,
                "a KeePass-file backend is not the native keychain, so the user must be told once, "
                        + "and the notification must name the backend that was actually resolved");
    }

    @Test
    void theSameBackendEvaluatedAgainDoesNotNotifyASecondTime() {
        Store store = new Store("");
        Notifier notifier = new Notifier();
        BackendNoticePolicy policy = policyOver(store, notifier);

        policy.evaluate(TokenBackend.KEEPASS_FILE);
        policy.evaluate(TokenBackend.KEEPASS_FILE);
        policy.evaluate(TokenBackend.KEEPASS_FILE);
        policy.evaluate(TokenBackend.KEEPASS_FILE);

        assertEquals(1, notifier.calls.size(),
                "the policy is evaluated on every login and every Run, so repeating the same backend "
                        + "must stay silent after the first balloon — otherwise the notice becomes noise "
                        + "the user learns to ignore");
    }

    @Test
    void theNativeKeychainNeverNotifies() {
        Store store = new Store("");
        Notifier notifier = new Notifier();
        BackendNoticePolicy policy = policyOver(store, notifier);

        policy.evaluate(TokenBackend.NATIVE_KEYCHAIN);

        assertTrue(notifier.calls.isEmpty(),
                "the native OS keychain is the expected, strongest backend — there is nothing to warn about");
    }

    @Test
    void aPersistedRecordSurvivesANewPolicyInstance() {
        Store store = new Store("");
        Notifier first = new Notifier();
        policyOver(store, first).evaluate(TokenBackend.KEEPASS_FILE);
        assertEquals(1, first.calls.size(), "precondition: the first policy warned");

        Notifier second = new Notifier();
        policyOver(store, second).evaluate(TokenBackend.KEEPASS_FILE);

        assertTrue(second.calls.isEmpty(),
                "the record lives in the injected store, not in policy instance state, so a fresh "
                        + "instance after an IDE restart must not warn again for the same backend");
    }

    @Test
    void switchingBackToTheNativeKeychainClearsTheRecord() {
        Store store = new Store("");
        Notifier notifier = new Notifier();
        BackendNoticePolicy policy = policyOver(store, notifier);

        policy.evaluate(TokenBackend.KEEPASS_FILE);
        policy.evaluate(TokenBackend.NATIVE_KEYCHAIN);
        policy.evaluate(TokenBackend.KEEPASS_FILE);

        assertEquals(2, notifier.calls.size(),
                "resolving back to the native keychain clears the last-warned record, so a later "
                        + "switch away from it must warn again");
    }

    @Test
    void aDifferentNonKeychainBackendWarnsAgainWithoutAnInterveningKeychain() {
        Store store = new Store("");
        Notifier notifier = new Notifier();
        BackendNoticePolicy policy = policyOver(store, notifier);

        policy.evaluate(TokenBackend.KEEPASS_FILE);
        policy.evaluate(TokenBackend.MEMORY_ONLY);

        assertEquals(List.of(TokenBackend.KEEPASS_FILE, TokenBackend.MEMORY_ONLY), notifier.calls,
                "a user who moves straight from one weak backend to a different weak backend, with no "
                        + "intervening keychain use, has still changed how their token is protected and "
                        + "must be told about the new state");
    }

    @Test
    void anUnknownBackendIsWarnWorthy() {
        Store store = new Store("");
        Notifier notifier = new Notifier();
        BackendNoticePolicy policy = policyOver(store, notifier);

        policy.evaluate(TokenBackend.UNKNOWN);
        policy.evaluate(TokenBackend.UNKNOWN);

        assertEquals(List.of(TokenBackend.UNKNOWN), notifier.calls,
                "a detection failure must never pass silently as the keychain -- UNKNOWN is warn-worthy "
                        + "like any other non-keychain backend, and once warned it stays quiet on repeat");
    }

    @Test
    void theNativeKeychainClearsAnExistingRecordEvenWhenItNeverWarnedInThisInstance() {
        Store store = new Store(TokenBackend.KEEPASS_FILE.name());
        Notifier notifier = new Notifier();
        BackendNoticePolicy policy = policyOver(store, notifier);

        policy.evaluate(TokenBackend.NATIVE_KEYCHAIN);

        assertEquals("", store.get(),
                "the record is cleared from whatever a fresh policy instance found already persisted, "
                        + "not only from a value this instance itself wrote");
        assertTrue(notifier.calls.isEmpty(), "the native keychain never itself raises a notification");
    }

    @Test
    void aNullOrEmptyStoredValueIsTreatedAsNeverWarned() {
        Store nullStore = new Store(null);
        Notifier nullNotifier = new Notifier();
        policyOver(nullStore, nullNotifier).evaluate(TokenBackend.MEMORY_ONLY);
        assertEquals(1, nullNotifier.calls.size(),
                "a null stored value (no record ever written, e.g. first run on this machine) must be "
                        + "treated as never-warned, not as a false match for any backend name");

        Store emptyStore = new Store("");
        Notifier emptyNotifier = new Notifier();
        policyOver(emptyStore, emptyNotifier).evaluate(TokenBackend.MEMORY_ONLY);
        assertEquals(1, emptyNotifier.calls.size(),
                "an empty stored value must likewise be treated as never-warned");
    }

    @Test
    void eightConcurrentEvaluatesOfTheSameBackendProduceExactlyOneNotification() throws InterruptedException {
        // The store itself must be synchronized so this test measures the policy's own atomicity
        // rather than a race in the double standing in for PropertiesComponent.
        Object storeLock = new Object();
        String[] slot = new String[] { "" };
        Notifier notifier = new Notifier();
        BackendNoticePolicy policy = new BackendNoticePolicy(
                () -> { synchronized (storeLock) { return slot[0]; } },
                value -> { synchronized (storeLock) { slot[0] = value; } },
                backend -> { synchronized (notifier) { notifier.notify(backend); } });

        int threadCount = 8;
        CountDownLatch ready = new CountDownLatch(threadCount);
        CountDownLatch release = new CountDownLatch(1);
        ExecutorService pool = Executors.newFixedThreadPool(threadCount);
        try {
            for (int i = 0; i < threadCount; i++) {
                pool.submit(() -> {
                    ready.countDown();
                    try {
                        release.await();
                    } catch (InterruptedException e) {
                        Thread.currentThread().interrupt();
                        return;
                    }
                    policy.evaluate(TokenBackend.KEEPASS_FILE);
                });
            }
            ready.await();
            release.countDown();
            pool.shutdown();
            assertTrue(pool.awaitTermination(10, TimeUnit.SECONDS), "all evaluate() calls must finish");
        } finally {
            pool.shutdownNow();
        }

        assertEquals(1, notifier.calls.size(),
                "eight Runs resolving the same non-keychain backend at nearly the same instant must "
                        + "still produce exactly one balloon -- the synchronized read-compare-notify-write "
                        + "sequence in evaluate() is what makes this atomic");
    }
}
