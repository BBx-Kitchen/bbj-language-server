package com.basis.bbj.intellij.compile;

import org.eclipse.lsp4j.Diagnostic;
import org.eclipse.lsp4j.jsonrpc.MessageIssueException;
import org.eclipse.lsp4j.jsonrpc.json.JsonRpcMethod;
import org.eclipse.lsp4j.jsonrpc.json.MessageJsonHandler;
import org.eclipse.lsp4j.jsonrpc.messages.Message;
import org.eclipse.lsp4j.jsonrpc.messages.MessageIssue;
import org.eclipse.lsp4j.jsonrpc.messages.ResponseMessage;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Cross-language boundary coverage for {@code bbj/compile} (#571): a full JSON-RPC response
 * envelope is parsed the way the IntelliJ plugin actually parses it — through LSP4IJ's own
 * {@link MessageJsonHandler} and its Gson instance, not a bare {@code new Gson()}. This class
 * exists because the JVM client's {@code Position.character} is a primitive {@code int}, and a
 * language-server response carrying a larger number is rejected during message parsing, before
 * any handler ever runs.
 */
class CompileResultJsonBoundaryTest {

    /**
     * Parses a JSON-RPC response envelope for {@code bbj/compile} through LSP4IJ's own
     * {@link MessageJsonHandler}, mirroring how the plugin's connection deserializes a real
     * response. A response carries no method name, so {@link MessageJsonHandler#setMethodProvider}
     * resolves the result type through this callback.
     */
    private static CompileModels.CompileResult parse(String envelope) {
        MessageJsonHandler handler = new MessageJsonHandler(Map.of("bbj/compile",
            JsonRpcMethod.request("bbj/compile", CompileModels.CompileResult.class,
                CompileModels.CompileParams.class)));
        handler.setMethodProvider(id -> "bbj/compile");
        Message message = handler.parseMessage(envelope);
        ResponseMessage response = (ResponseMessage) message;
        return (CompileModels.CompileResult) response.getResult();
    }

    @Test
    void aCompileErrorsResponseParsesThroughTheLsp4jGson() {
        String envelope = """
            {"jsonrpc":"2.0","id":"1","result":{"success":false,"diagnostics":[{"range":{"start":{"line":2,"character":0},"end":{"line":2,"character":2147483647}},"severity":1,"source":"BBjCPL","message":"Syntax error: bad code"}],"reason":"compile-errors","file":"file:///tmp/fake.bbj"}}""";

        CompileModels.CompileResult result = parse(envelope);

        assertEquals("compile-errors", result.reason);
        assertEquals(1, result.diagnostics.size());
        assertEquals(2, result.diagnostics.get(0).getRange().getStart().getLine());
        assertEquals(Integer.MAX_VALUE, result.diagnostics.get(0).getRange().getEnd().getCharacter());
    }

    /**
     * The negative control: pins that the same parser still rejects the previous oversized
     * value. LSP4IJ wraps the underlying Gson parse failure in its own
     * {@link MessageIssueException} (a {@link RuntimeException}) rather than surfacing a bare
     * {@code JsonParseException} directly, so the expectation is widened to
     * {@code RuntimeException} and the assertion instead confirms the failure names the
     * oversized number. If Gson ever becomes lenient about numbers that overflow an {@code int},
     * this test fails and the fix is to widen the expected exception type further while keeping
     * the assertion that the oversized payload does not yield a usable
     * {@link org.eclipse.lsp4j.Position} — never to delete the test.
     */
    @Test
    void theOversizedEndCharacterIsRejectedByTheSameParser() {
        String oversizedValue = "9007199254740991";
        String oversizedEnvelope = """
            {"jsonrpc":"2.0","id":"1","result":{"success":false,"diagnostics":[{"range":{"start":{"line":2,"character":0},"end":{"line":2,"character":%s}},"severity":1,"source":"BBjCPL","message":"Syntax error: bad code"}],"reason":"compile-errors","file":"file:///tmp/fake.bbj"}}"""
            .formatted(oversizedValue);

        RuntimeException thrown = assertThrows(RuntimeException.class, () -> parse(oversizedEnvelope));

        StringBuilder combined = new StringBuilder(thrown.getMessage() == null ? "" : thrown.getMessage());
        if (thrown instanceof MessageIssueException issueException) {
            for (MessageIssue issue : issueException.getIssues()) {
                Exception cause = issue.getCause();
                if (cause != null && cause.getMessage() != null) {
                    combined.append(' ').append(cause.getMessage());
                }
            }
        }
        assertTrue(combined.toString().contains(oversizedValue),
            "expected the failure to name the oversized number, got: " + combined);
    }

    /**
     * Documents that a successful parse produces genuinely usable {@code int} positions, not
     * just that parsing didn't throw.
     */
    @Test
    void everyPositionInAParsedResultFitsAJavaInt() {
        String envelope = """
            {"jsonrpc":"2.0","id":"1","result":{"success":false,"diagnostics":[{"range":{"start":{"line":2,"character":0},"end":{"line":2,"character":2147483647}},"severity":1,"source":"BBjCPL","message":"Syntax error: bad code"}],"reason":"compile-errors","file":"file:///tmp/fake.bbj"}}""";

        CompileModels.CompileResult result = parse(envelope);

        for (Diagnostic diagnostic : result.diagnostics) {
            assertTrue(diagnostic.getRange().getStart().getLine() >= 0);
            assertTrue(diagnostic.getRange().getStart().getCharacter() >= 0);
            assertTrue(diagnostic.getRange().getEnd().getLine() >= 0);
            assertTrue(diagnostic.getRange().getEnd().getCharacter() >= 0);
        }
    }

    /** Confirms the path that already worked in the field is not collateral damage. */
    @Test
    void aSuccessResultWithNoDiagnosticsStillParses() {
        String successEnvelope = """
            {"jsonrpc":"2.0","id":"1","result":{"success":true,"diagnostics":[],"file":"file:///tmp/hello.bbj"}}""";

        CompileModels.CompileResult result = parse(successEnvelope);

        assertTrue(result.success);
        assertEquals(0, result.diagnostics.size());
    }
}
