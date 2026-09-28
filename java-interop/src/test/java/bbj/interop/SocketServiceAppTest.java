/******************************************************************************
 * Copyright 2023 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/
package bbj.interop;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import org.junit.jupiter.api.Test;

class SocketServiceAppTest {

    @Test
    void noArgsReturnsDefaultPort() {
        assertEquals(SocketServiceApp.DEFAULT_PORT, SocketServiceApp.parsePort(new String[] {}));
    }

    @Test
    void acceptsLowestValidPort() {
        assertEquals(1, SocketServiceApp.parsePort(new String[] { "1" }));
    }

    @Test
    void acceptsHighestValidPort() {
        assertEquals(65535, SocketServiceApp.parsePort(new String[] { "65535" }));
    }

    @Test
    void rejectsZero() {
        assertThrows(IllegalArgumentException.class, () -> SocketServiceApp.parsePort(new String[] { "0" }));
    }

    @Test
    void rejectsNegativePort() {
        assertThrows(IllegalArgumentException.class, () -> SocketServiceApp.parsePort(new String[] { "-1" }));
    }

    @Test
    void rejectsPortAboveRange() {
        assertThrows(IllegalArgumentException.class, () -> SocketServiceApp.parsePort(new String[] { "65536" }));
    }

    @Test
    void rejectsNonNumericPort() {
        assertThrows(IllegalArgumentException.class, () -> SocketServiceApp.parsePort(new String[] { "abc" }));
    }

    @Test
    void rejectsMoreThanOneArgument() {
        assertThrows(IllegalArgumentException.class, () -> SocketServiceApp.parsePort(new String[] { "1", "2" }));
    }
}
