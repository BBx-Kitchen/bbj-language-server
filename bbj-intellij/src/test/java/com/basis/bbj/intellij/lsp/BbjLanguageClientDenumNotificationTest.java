package com.basis.bbj.intellij.lsp;

import com.basis.bbj.intellij.denum.DenumDiagnosticsPresenter;
import com.basis.bbj.intellij.denum.DenumModels.DenumDiagnosticsParams;
import org.eclipse.lsp4j.jsonrpc.json.JsonRpcMethod;
import org.eclipse.lsp4j.jsonrpc.json.MessageJsonHandler;
import org.eclipse.lsp4j.jsonrpc.messages.Message;
import org.eclipse.lsp4j.jsonrpc.messages.NotificationMessage;
import org.eclipse.lsp4j.jsonrpc.services.JsonNotification;
import org.eclipse.lsp4j.jsonrpc.services.ServiceEndpoints;
import org.junit.jupiter.api.Test;

import java.lang.reflect.Method;
import java.lang.reflect.Type;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertInstanceOf;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * The DENUM notifications reach the client the way a real server sends them: the client's own
 * supported-method map (the one LSP4J builds by reflecting over {@link BbjLanguageClient}) must
 * hold both names as notifications, and a literal JSON-RPC message must parse through that map
 * into the payload type the handler declares.
 */
class BbjLanguageClientDenumNotificationTest {

    private static final String DIAGNOSTICS = "bbj/denumDiagnostics";
    private static final String SHOW = "bbj/showDenumDiagnostics";

    private static Map<String, JsonRpcMethod> supported() {
        return ServiceEndpoints.getSupportedMethods(BbjLanguageClient.class);
    }

    private static Message parse(String json) {
        return new MessageJsonHandler(supported()).parseMessage(json);
    }

    @Test
    void theDiagnosticsNotificationIsRegisteredWithTheDiagnosticsParamsType() {
        JsonRpcMethod registered = supported().get(DIAGNOSTICS);

        assertNotNull(registered, DIAGNOSTICS + " must be a supported method of the client");
        assertTrue(registered.isNotification(), DIAGNOSTICS + " must be a notification, not a request");
        assertArrayEquals(new Type[] {DenumDiagnosticsParams.class}, registered.getParameterTypes(),
            "the notification must take exactly the diagnostics params type");
    }

    @Test
    void aLiteralDiagnosticsNotificationParsesAndRendersAsTheBlock() {
        String json = "{\"jsonrpc\":\"2.0\",\"method\":\"bbj/denumDiagnostics\",\"params\":{"
            + "\"uri\":\"file:///tmp/p.bbj\",\"diagnostics\":[{\"line\":2,"
            + "\"originalLineNumber\":\"0020\",\"severity\":\"ERROR\",\"message\":\"bad\"}]}}";

        Message message = parse(json);

        NotificationMessage notification = assertInstanceOf(NotificationMessage.class, message);
        assertEquals(DIAGNOSTICS, notification.getMethod());
        DenumDiagnosticsParams params = assertInstanceOf(DenumDiagnosticsParams.class, notification.getParams());
        List<String> texts = DenumDiagnosticsPresenter.present(params).stream()
            .map(DenumDiagnosticsPresenter.Line::text).toList();
        assertEquals(List.of(
            "Denumber diagnostics for /tmp/p.bbj:",
            "  line 2 (original 0020) ERROR: bad"), texts);
    }

    @Test
    void aLineAtTheJavaScriptSafeIntegerLimitParsesInsteadOfRejectingTheMessage() {
        String json = "{\"jsonrpc\":\"2.0\",\"method\":\"bbj/denumDiagnostics\",\"params\":{"
            + "\"uri\":\"file:///tmp/p.bbj\",\"diagnostics\":[{\"line\":9007199254740991,"
            + "\"originalLineNumber\":\"\",\"severity\":\"WARNING\",\"message\":\"m\"}]}}";

        NotificationMessage notification = assertInstanceOf(NotificationMessage.class, parse(json));
        DenumDiagnosticsParams params = assertInstanceOf(DenumDiagnosticsParams.class, notification.getParams());

        assertEquals(9007199254740991L, params.diagnostics.get(0).line);
    }

    @Test
    void theRevealNotificationIsRegisteredWithOneObjectParameterAndCarriesItsName() throws Exception {
        JsonRpcMethod registered = supported().get(SHOW);

        assertNotNull(registered, SHOW + " must be a supported method of the client");
        assertTrue(registered.isNotification(), SHOW + " must be a notification, not a request");
        assertArrayEquals(new Type[] {Object.class}, registered.getParameterTypes(),
            "the reveal takes exactly one Object parameter, which it never reads");

        Method handler = BbjLanguageClient.class.getMethod("showDenumDiagnostics", Object.class);
        JsonNotification annotation = handler.getAnnotation(JsonNotification.class);
        assertNotNull(annotation, "the reveal handler must be annotated with @JsonNotification");
        assertEquals(SHOW, annotation.value());
    }

    @Test
    void aRevealWithoutAParamsMemberParsesWithNullParams() {
        String json = "{\"jsonrpc\":\"2.0\",\"method\":\"bbj/showDenumDiagnostics\"}";

        NotificationMessage notification = assertInstanceOf(NotificationMessage.class, parse(json));

        assertEquals(SHOW, notification.getMethod());
        assertNull(notification.getParams());
    }
}
