package com.basis.bbj.intellij.lsp;

import org.eclipse.lsp4j.jsonrpc.json.JsonRpcMethod;
import org.eclipse.lsp4j.jsonrpc.json.MessageJsonHandler;
import org.eclipse.lsp4j.jsonrpc.messages.Message;
import org.eclipse.lsp4j.jsonrpc.messages.NotificationMessage;
import org.eclipse.lsp4j.jsonrpc.services.JsonNotification;
import org.eclipse.lsp4j.jsonrpc.services.ServiceEndpoints;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.lang.reflect.Method;
import java.lang.reflect.Type;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertInstanceOf;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.fail;
import static com.basis.bbj.intellij.lsp.JavaSourceScan.bodyOf;

/**
 * The server's request to open the formatter settings reaches the client the way a real server
 * sends it, and the client answers it by opening the BBj settings page without ever reading the
 * payload. The payload carries setting names chosen by the server; the handler must not be able to
 * turn one into a path, a command or a link, so the source guard here pins that the parameter is
 * named once in the whole client file (its declaration) and that the handler body opens a fixed
 * configurable class and nothing else. The method name is checked against the server's single
 * owner of it, {@code bbj-vscode/src/language/format-settings-notification.ts}, read as plain text.
 */
class BbjLanguageClientOpenFormatterSettingsTest {

    private static final String OPEN_SETTINGS = "bbj/openFormatterSettings";

    private static final Path FORMAT_SETTINGS_NOTIFICATION_TS = Paths.get(
        "..", "bbj-vscode", "src", "language", "format-settings-notification.ts")
        .toAbsolutePath().normalize();

    private static final Path CLIENT_SOURCE = Paths.get(
        "src", "main", "java", "com", "basis", "bbj", "intellij", "lsp", "BbjLanguageClient.java")
        .toAbsolutePath().normalize();

    private static Map<String, JsonRpcMethod> supported() {
        return ServiceEndpoints.getSupportedMethods(BbjLanguageClient.class);
    }

    private static Message parse(String json) {
        return new MessageJsonHandler(supported()).parseMessage(json);
    }

    private static String readSource(Path path) {
        if (!Files.exists(path)) {
            fail("Source not found at " + path);
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
    void theOpenSettingsNotificationIsRegisteredWithOneObjectParameter() throws Exception {
        JsonRpcMethod registered = supported().get(OPEN_SETTINGS);

        assertNotNull(registered, OPEN_SETTINGS + " must be a supported method of the client");
        assertTrue(registered.isNotification(), OPEN_SETTINGS + " must be a notification, not a request");
        assertArrayEquals(new Type[] {Object.class}, registered.getParameterTypes(),
            "the handler takes exactly one Object parameter, which it never reads");

        Method handler = BbjLanguageClient.class.getMethod("openFormatterSettings", Object.class);
        JsonNotification annotation = handler.getAnnotation(JsonNotification.class);
        assertNotNull(annotation, "openFormatterSettings must be annotated with @JsonNotification");
        assertEquals(OPEN_SETTINGS, annotation.value());
    }

    @Test
    void theNameMatchesTheServersConstant() {
        String ts = readSource(FORMAT_SETTINGS_NOTIFICATION_TS);

        assertTrue(ts.contains("'" + OPEN_SETTINGS + "'") || ts.contains("\"" + OPEN_SETTINGS + "\""),
            "format-settings-notification.ts must declare the method name " + OPEN_SETTINGS
                + "; a rename on either side alone breaks the Open Settings button");
    }

    @Test
    void aNotificationWithKeysParses() {
        String json = "{\"jsonrpc\":\"2.0\",\"method\":\"bbj/openFormatterSettings\","
            + "\"params\":{\"keys\":[\"bbj.formatter.indentWidth\"]}}";

        NotificationMessage notification = assertInstanceOf(NotificationMessage.class, parse(json));

        assertEquals(OPEN_SETTINGS, notification.getMethod());
        assertNotNull(notification.getParams(), "the keys payload must parse, even though it is never read");
    }

    @Test
    void aNotificationWithoutParamsParses() {
        String json = "{\"jsonrpc\":\"2.0\",\"method\":\"bbj/openFormatterSettings\"}";

        NotificationMessage notification = assertInstanceOf(NotificationMessage.class, parse(json));

        assertEquals(OPEN_SETTINGS, notification.getMethod());
        assertNull(notification.getParams());
    }

    @Test
    void theHandlerNeverReadsItsParameterAndOpensTheBbjPage() {
        String text = readSource(CLIENT_SOURCE);

        assertEquals(1, countOccurrences(text, "ignoredKeys"),
            "the parameter name may appear only in its declaration, so the payload is never read");

        String body = bodyOf(text, "public void openFormatterSettings(");
        assertEquals(1, countOccurrences(body, "invokeLater("),
            "the handler must move to the EDT through invokeLater( exactly once");
        assertEquals(2, countOccurrences(body, "isDisposed("),
            "the handler must check for a disposed project before and after the hop to the EDT");
        assertEquals(1, countOccurrences(body, "showSettingsDialog(project, BbjSettingsConfigurable.class)"),
            "the handler must open the BBj settings page, a fixed configurable class, exactly once");
        assertEquals(1, countOccurrences(body, "compareAndSet(false, true)"),
            "repeated requests must be coalesced through one pending flag");
        assertEquals(1, countOccurrences(body, "finally"),
            "the pending flag must be cleared in a finally, so a failed dialog cannot block later requests");
        for (String forbidden : new String[] {"BrowserUtil", "Paths.", "VirtualFile", "ActionManager", "getParams"}) {
            assertEquals(0, countOccurrences(body, forbidden),
                "the handler must not use " + forbidden + ": nothing from the server may become a "
                    + "path, a command or a link");
        }
    }
}
