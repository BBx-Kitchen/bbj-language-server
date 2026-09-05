package com.basis.bbj.intellij.compile;

import org.eclipse.lsp4j.jsonrpc.json.JsonRpcMethod;
import org.eclipse.lsp4j.jsonrpc.json.MessageJsonHandler;
import org.eclipse.lsp4j.jsonrpc.messages.Message;
import org.eclipse.lsp4j.jsonrpc.messages.ResponseMessage;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;

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
}
