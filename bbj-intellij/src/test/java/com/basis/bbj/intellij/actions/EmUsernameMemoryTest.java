package com.basis.bbj.intellij.actions;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

/**
 * Behavioural coverage for the last-successful-EM-username memory (issue #546 follow-up):
 * pre-fills the last username that logged in successfully, or {@link
 * EmUsernameMemory#DEFAULT_USERNAME} when none is remembered, and never remembers a password
 * or token.
 *
 * <p>The store double below is a single-slot {@code String[]} standing in for the production
 * application-level {@code PropertiesComponent} value, mirroring {@code
 * BackendNoticePolicyTest}'s in-memory double -- {@link EmUsernameMemory} carries no IntelliJ
 * platform import, so it runs on this module's plain JUnit 5 test classpath.
 */
class EmUsernameMemoryTest {

    /** Mutable single-slot store standing in for the persisted last-username record. */
    private static final class Store {
        private String slot;
        private int writeCount;

        Store(String initial) {
            slot = initial;
        }

        String get() {
            return slot;
        }

        void set(String value) {
            slot = value;
            writeCount++;
        }
    }

    private static EmUsernameMemory memoryOver(Store store) {
        return new EmUsernameMemory(store::get, store::set);
    }

    @Test
    void emptyStoreYieldsTheDefaultUsername() {
        Store store = new Store("");
        assertEquals("admin", memoryOver(store).initialUsername());
    }

    @Test
    void nullStoreYieldsTheDefaultUsername() {
        Store store = new Store(null);
        assertEquals("admin", memoryOver(store).initialUsername());
    }

    @Test
    void blankStoreYieldsTheDefaultUsername() {
        Store store = new Store("   ");
        assertEquals("admin", memoryOver(store).initialUsername());
    }

    @Test
    void aRememberedUsernameIsReturnedAsStored() {
        Store store = new Store("jdoe");
        assertEquals("jdoe", memoryOver(store).initialUsername());
    }

    @Test
    void rememberWritesANonBlankUsernameExactlyOnce() {
        Store store = new Store("");
        memoryOver(store).remember("jdoe");
        assertEquals("jdoe", store.get());
        assertEquals(1, store.writeCount);
    }

    @Test
    void rememberIgnoresAnEmptyUsername() {
        Store store = new Store("");
        memoryOver(store).remember("");
        assertEquals(0, store.writeCount);
    }

    @Test
    void rememberIgnoresABlankUsername() {
        Store store = new Store("");
        memoryOver(store).remember("   ");
        assertEquals(0, store.writeCount);
    }

    @Test
    void rememberIgnoresANullUsername() {
        Store store = new Store("");
        memoryOver(store).remember(null);
        assertEquals(0, store.writeCount);
    }
}
