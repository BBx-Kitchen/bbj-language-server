package com.basis.bbj.intellij.config;

import com.basis.bbj.intellij.config.ConfigModels.ResolvedConfigPathResult;
import org.eclipse.lsp4j.jsonrpc.json.JsonRpcMethod;
import org.eclipse.lsp4j.jsonrpc.json.MessageJsonHandler;
import org.eclipse.lsp4j.jsonrpc.messages.Message;
import org.eclipse.lsp4j.jsonrpc.messages.ResponseMessage;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Message-handler round trip for {@code bbj/resolvedConfigPath}'s result DTO, mirroring
 * {@code composer.ComposerModelsJsonBoundaryTest}: the envelope is parsed through LSP4IJ's own
 * {@link MessageJsonHandler}, the same deserializer the plugin's real connection uses, so a Gson
 * field rename fails here rather than in a live IDE.
 */
class ConfigModelsJsonBoundaryTest {

    private static <T> T parse(String requestName, Class<T> resultType, String envelope, Class<?>... paramTypes) {
        JsonRpcMethod method = paramTypes.length == 0
            ? JsonRpcMethod.request(requestName, resultType)
            : JsonRpcMethod.request(requestName, resultType, paramTypes);
        MessageJsonHandler handler = new MessageJsonHandler(Map.of(requestName, method));
        handler.setMethodProvider(id -> requestName);
        Message message = handler.parseMessage(envelope);
        ResponseMessage response = (ResponseMessage) message;
        return resultType.cast(response.getResult());
    }

    @Test
    void aResolvedConfigPathResponseParsesThroughTheLsp4jGsonWithEveryFieldPopulated() {
        String envelope = """
            {"jsonrpc":"2.0","id":"1","result":{
              "path":"/home/user/bbj/cfg/config.bbx","source":"default","exists":true,"problem":null
            }}""";

        ResolvedConfigPathResult result = parse("bbj/resolvedConfigPath", ResolvedConfigPathResult.class, envelope);

        assertEquals("/home/user/bbj/cfg/config.bbx", result.path);
        assertEquals("default", result.source);
        assertTrue(result.exists);
        assertNull(result.problem);
    }

    @Test
    void aResponseWithNullPathAndNullProblemParsesWithoutThrowing() {
        String envelope = """
            {"jsonrpc":"2.0","id":"1","result":{
              "path":null,"source":"none","exists":false,"problem":null
            }}""";

        ResolvedConfigPathResult result = parse("bbj/resolvedConfigPath", ResolvedConfigPathResult.class, envelope);

        assertNull(result.path);
        assertEquals("none", result.source);
        assertFalse(result.exists);
        assertNull(result.problem);
    }
}
