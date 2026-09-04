package com.basis.bbj.intellij.actions;

import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;

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
}
