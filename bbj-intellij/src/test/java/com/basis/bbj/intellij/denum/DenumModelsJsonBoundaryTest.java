package com.basis.bbj.intellij.denum;

import org.eclipse.lsp4j.jsonrpc.json.JsonRpcMethod;
import org.eclipse.lsp4j.jsonrpc.json.MessageJsonHandler;
import org.eclipse.lsp4j.jsonrpc.messages.Message;
import org.eclipse.lsp4j.jsonrpc.messages.NotificationMessage;
import org.eclipse.lsp4j.jsonrpc.messages.ResponseMessage;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Cross-language boundary coverage for {@code bbj/denum}: a full JSON-RPC response envelope is
 * parsed the way the IntelliJ plugin actually parses it, through LSP4J's own
 * {@link MessageJsonHandler} and its Gson instance. The answer arrives after the server has applied
 * the edit, so a parse failure here would surface as a false "Denumber failed" for a run that did
 * apply; that is why {@code edits} is an opaque JSON element and {@code diagnostics} is unmodelled.
 */
class DenumModelsJsonBoundaryTest {

    private static MessageJsonHandler handler() {
        MessageJsonHandler handler = new MessageJsonHandler(Map.of("bbj/denum",
            JsonRpcMethod.request("bbj/denum", DenumModels.DenumResult.class, DenumModels.DenumParams.class)));
        handler.setMethodProvider(id -> "bbj/denum");
        return handler;
    }

    private static DenumModels.DenumResult parse(String envelope) {
        Message message = handler().parseMessage(envelope);
        ResponseMessage response = (ResponseMessage) message;
        return (DenumModels.DenumResult) response.getResult();
    }

    @Test
    void anAppliedRunWithAnOversizedPositionAndDiagnosticsParses() {
        String envelope = """
            {"jsonrpc":"2.0","id":"1","result":{"status":"denumbered","version":3,"edits":[{"range":{"start":{"line":0,"character":0},"end":{"line":3,"character":9007199254740991}},"newText":"LET A=5\\nPRINT A\\nEND\\n"}],"diagnostics":[{"line":2,"originalLineNumber":"0020","severity":"ERROR","message":"bad"}],"applied":true}}""";

        DenumModels.DenumResult result = parse(envelope);

        assertEquals("denumbered", result.status);
        assertEquals(Boolean.TRUE, result.applied);
        assertNull(result.reason);
        assertNull(result.message);
        assertNotNull(result.edits);
        assertTrue(result.edits.isJsonArray(), "edits must stay an opaque JSON array");
        assertEquals(1, result.edits.getAsJsonArray().size());
    }

    @Test
    void aFailedRunKeepsItsStatusReasonAndMessage() {
        String envelope = """
            {"jsonrpc":"2.0","id":"1","result":{"status":"failed","reason":"not-open","message":"Open the BBj file in the editor first; denumbering works on the open editor text."}}""";

        DenumModels.DenumResult result = parse(envelope);

        assertEquals("failed", result.status);
        assertEquals("not-open", result.reason);
        assertEquals("Open the BBj file in the editor first; denumbering works on the open editor text.",
            result.message);
        assertNull(result.applied);
        assertNull(result.edits);
    }

    @Test
    void anUnknownMemberBesideTheStatusIsIgnored() {
        String envelope = """
            {"jsonrpc":"2.0","id":"1","result":{"status":"not-line-numbered","futureField":{"a":[1,2]}}}""";

        DenumModels.DenumResult result = parse(envelope);

        assertEquals("not-line-numbered", result.status);
    }

    @Test
    void anEmptyResultParsesWithEveryFieldNull() {
        String envelope = """
            {"jsonrpc":"2.0","id":"1","result":{}}""";

        DenumModels.DenumResult result = parse(envelope);

        assertNotNull(result);
        assertNull(result.status);
        assertNull(result.reason);
        assertNull(result.message);
        assertNull(result.edits);
        assertNull(result.applied);
    }

    private static DenumModels.DenumDiagnosticsParams parseNotification(String envelope) {
        MessageJsonHandler notificationHandler = new MessageJsonHandler(Map.of("bbj/denumDiagnostics",
            JsonRpcMethod.notification("bbj/denumDiagnostics", DenumModels.DenumDiagnosticsParams.class)));
        NotificationMessage message = (NotificationMessage) notificationHandler.parseMessage(envelope);
        return (DenumModels.DenumDiagnosticsParams) message.getParams();
    }

    @Test
    void aNotificationVersionParsesToTheDocumentVersion() {
        DenumModels.DenumDiagnosticsParams params = parseNotification("""
            {"jsonrpc":"2.0","method":"bbj/denumDiagnostics","params":{"uri":"file:///tmp/a.bbj","version":7,"diagnostics":[{"line":2,"originalLineNumber":"0020","severity":"ERROR","message":"bad"}]}}""");

        assertEquals(Long.valueOf(7L), params.version);
        assertEquals("file:///tmp/a.bbj", params.uri);
        assertEquals(1, params.diagnostics.size());
    }

    @Test
    void aNotificationWithoutAVersionLeavesItNull() {
        DenumModels.DenumDiagnosticsParams params = parseNotification("""
            {"jsonrpc":"2.0","method":"bbj/denumDiagnostics","params":{"uri":"file:///tmp/a.bbj","diagnostics":[]}}""");

        assertNull(params.version);
        assertEquals("file:///tmp/a.bbj", params.uri);
    }

    @Test
    void aNotificationVersionOfAnotherJsonTypeDoesNotRejectTheList() {
        for (String odd : new String[] {"\"7\"", "1.5", "null", "true"}) {
            DenumModels.DenumDiagnosticsParams params = parseNotification("""
                {"jsonrpc":"2.0","method":"bbj/denumDiagnostics","params":{"uri":"file:///tmp/a.bbj","version":%s,"diagnostics":[{"line":1,"severity":"INFO","message":"m"}]}}"""
                .formatted(odd));

            assertNotNull(params, "version " + odd + " must not reject the notification");
            assertEquals("file:///tmp/a.bbj", params.uri);
            assertEquals(1, params.diagnostics.size(), "version " + odd + " must not drop the list");
        }
    }

    @Test
    void theParamsSerializeToTheUriAlone() {
        String json = handler().getGson().toJson(new DenumModels.DenumParams("file:///tmp/a%20b.bbj"));

        assertEquals("{\"uri\":\"file:///tmp/a%20b.bbj\"}", json);
    }
}
