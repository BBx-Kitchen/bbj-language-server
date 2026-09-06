package com.basis.bbj.intellij.composer;

import com.basis.bbj.intellij.composer.ComposerModels.AddChildWindowDecodeResult;
import com.basis.bbj.intellij.composer.ComposerModels.AddChildWindowPreview;
import com.basis.bbj.intellij.composer.ComposerModels.AddChildWindowPreviewParams;
import com.basis.bbj.intellij.composer.ComposerModels.AddWindowDecodeResult;
import com.basis.bbj.intellij.composer.ComposerModels.AddWindowPreview;
import com.basis.bbj.intellij.composer.ComposerModels.AddWindowPreviewParams;
import com.basis.bbj.intellij.composer.ComposerModels.ComposerCatalogs;
import com.basis.bbj.intellij.composer.ComposerModels.DecodeCallParams;
import com.basis.bbj.intellij.composer.ComposerModels.MsgboxDecodeResult;
import com.basis.bbj.intellij.composer.ComposerModels.MsgboxPreview;
import com.basis.bbj.intellij.composer.ComposerModels.MsgboxPreviewParams;
import org.eclipse.lsp4j.jsonrpc.MessageIssueException;
import org.eclipse.lsp4j.jsonrpc.json.JsonRpcMethod;
import org.eclipse.lsp4j.jsonrpc.json.MessageJsonHandler;
import org.eclipse.lsp4j.jsonrpc.messages.Message;
import org.eclipse.lsp4j.jsonrpc.messages.MessageIssue;
import org.eclipse.lsp4j.jsonrpc.messages.ResponseMessage;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Message-handler round trips for every {@code bbj/composer/*} result DTO (#544), mirroring
 * {@code compile.CompileResultJsonBoundaryTest}: each envelope is parsed through LSP4IJ's own
 * {@link MessageJsonHandler}, the same deserializer the plugin's real connection uses, so a Gson
 * field rename or a numeric overflow fails here rather than in a live IDE.
 */
class ComposerModelsJsonBoundaryTest {

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
    void aComposerCatalogsResponseParsesThroughTheLsp4jGson() {
        String envelope = """
            {"jsonrpc":"2.0","id":"1","result":{
              "msgbox":{
                "buttonSets":[{"value":1,"label":"OK","group":null,"detail":null}],
                "icons":[{"value":48,"label":"Question","group":null,"detail":null}],
                "defaultButtons":[{"value":1,"label":"Button 1","group":null,"detail":null}],
                "flags":[{"value":512,"label":"Modal","group":null,"detail":null}]
              },
              "addwindow":{
                "flags":[{"value":1,"label":"Title Bar","group":"Appearance","detail":null}],
                "eventBits":[{"value":2147483648,"label":"Close","group":null,"detail":null}]
              },
              "addchildwindow":{
                "flags":[{"value":1,"label":"Border","group":null,"detail":null}],
                "eventBits":[{"value":2,"label":"Resize","group":null,"detail":null}]
              }
            }}""";

        ComposerCatalogs result = parse("bbj/composer/catalogs", ComposerCatalogs.class, envelope);

        assertEquals(1, result.msgbox.buttonSets.size());
        assertEquals(1L, result.msgbox.buttonSets.get(0).value);
        assertEquals(1, result.addwindow.flags.size());
        assertEquals("Appearance", result.addwindow.flags.get(0).group);
        // The 32-bit sign bit set: overflows a Java int, which is exactly why every raw bit value
        // in ComposerModels is declared long rather than int.
        assertEquals(2147483648L, result.addwindow.eventBits.get(0).value);
        assertEquals(1, result.addchildwindow.eventBits.size());
    }

    @Test
    void aMsgboxPreviewResponseParsesThroughTheLsp4jGson() {
        String envelope = """
            {"jsonrpc":"2.0","id":"1","result":{
              "expr":513,"statement":"MSGBOX(\\"Hello\\",513,\\"Title\\")",
              "summary":"OK button, question icon","messageError":null,"titleError":null,"customError":null,
              "valid":true,
              "render":{"title":"Title","message":"Hello","icon":32,"buttons":["OK"],"defaultIndex":0}
            }}""";

        MsgboxPreview result = parse("bbj/composer/msgbox/preview", MsgboxPreview.class, envelope,
            MsgboxPreviewParams.class);

        assertEquals(513, result.expr);
        assertTrue(result.valid);
        assertEquals(1, result.render.buttons.size());
        assertEquals("OK", result.render.buttons.get(0));
        assertEquals(0, result.render.defaultIndex);
    }

    @Test
    void anAddWindowPreviewResponseParsesThroughTheLsp4jGson() {
        String envelope = """
            {"jsonrpc":"2.0","id":"1","result":{
              "flags":2147483648,"eventMask":4294967295,"flagsHex":"$80000000$","eventHex":"$FFFFFFFF$",
              "statement":"win! = sysgui!.addWindow(...)","flagsSummary":"Title Bar, Invisible",
              "eventSummary":"All events",
              "render":{"titleBar":true,"closeBox":false,"minMax":false,"menuBar":false,"hScroll":false,
                "vScroll":false,"border":false,"resizable":false,"disabled":false,"invisible":true,
                "minimized":false,"maximized":false,"badges":["Invisible"],"title":"Window"}
            }}""";

        AddWindowPreview result = parse("bbj/composer/addwindow/preview", AddWindowPreview.class, envelope,
            AddWindowPreviewParams.class);

        // Both flags and eventMask carry values beyond Integer.MAX_VALUE -- the documented reason
        // these fields are long, not int.
        assertEquals(2147483648L, result.flags);
        assertEquals(4294967295L, result.eventMask);
        assertEquals(1, result.render.badges.size());
        assertTrue(result.render.titleBar);
    }

    @Test
    void aMsgboxDecodeCallResponseParsesThroughTheLsp4jGson() {
        String envelope = """
            {"jsonrpc":"2.0","id":"1","result":{
              "found":true,
              "edit":{"callStart":10,"callEnd":42},
              "trailingArgs":["A$"],
              "initial":{"message":"\\"Hello\\"","title":"\\"Title\\"","assignTo":null,"buttonSet":1,
                "icon":32,"defaultButton":1,"flags":[512],"customButtons":["OK"],"trailingArgs":["A$"],
                "editMode":true,"useConstants":false}
            }}""";

        MsgboxDecodeResult result = parse("bbj/composer/msgbox/decodeCall", MsgboxDecodeResult.class, envelope,
            DecodeCallParams.class);

        assertTrue(result.found);
        assertEquals(10, result.edit.callStart);
        assertEquals(42, result.edit.callEnd);
        assertEquals(1, result.trailingArgs.size());
        assertEquals(1, result.initial.flags.size());
        assertEquals(512L, result.initial.flags.get(0));
    }

    @Test
    void anAddWindowDecodeCallResponseParsesThroughTheLsp4jGson() {
        String envelope = """
            {"jsonrpc":"2.0","id":"1","result":{
              "found":true,
              "edit":{"flagsRange":[10,20],"flagsInsertOffset":null,"eventMaskRange":[25,35],
                "eventMaskInsertOffset":null,"preservedFlagBits":2147483648,"preservedEventBits":0},
              "initial":{"flags":[1,2],"eventMaskEnabled":true,"eventMask":[2147483648],"title":"\\"Window\\""}
            }}""";

        AddWindowDecodeResult result = parse(
            "bbj/composer/addwindow/decodeCall", AddWindowDecodeResult.class, envelope, DecodeCallParams.class);

        assertTrue(result.found);
        assertEquals(2, result.edit.flagsRange.length);
        assertEquals(10, result.edit.flagsRange[0]);
        // Beyond Integer.MAX_VALUE, same overflow reason as the catalogs/addWindow-preview tests.
        assertEquals(2147483648L, result.edit.preservedFlagBits);
        assertEquals(1, result.initial.eventMask.size());
        assertEquals(2147483648L, result.initial.eventMask.get(0));
    }

    @Test
    void anAddChildWindowPreviewResponseParsesThroughTheLsp4jGson() {
        String envelope = """
            {"jsonrpc":"2.0","id":"1","result":{
              "flags":1,"eventMask":2,"flagsHex":"$00000001$","eventHex":"$00000002$",
              "statement":"child! = window!.addChildWindow(...)","flagsSummary":"Border",
              "eventSummary":"Resize",
              "render":{"borderless":false,"recessed":false,"raised":false,"fieldset":false,
                "hScroll":false,"vScroll":false,"invisible":false,"disabled":false,"docked":false,
                "badges":[],"title":"Child"}
            }}""";

        AddChildWindowPreview result = parse(
            "bbj/composer/addchildwindow/preview", AddChildWindowPreview.class, envelope,
            AddChildWindowPreviewParams.class);

        assertEquals(1L, result.flags);
        assertEquals(2L, result.eventMask);
        assertEquals("Child", result.render.title);
        assertTrue(result.render.badges.isEmpty());
    }

    @Test
    void anAddChildWindowDecodeCallResponseParsesThroughTheLsp4jGson() {
        String envelope = """
            {"jsonrpc":"2.0","id":"1","result":{
              "found":true,
              "edit":{"flagsRange":[5,15],"flagsInsertOffset":null,"eventMaskRange":null,
                "eventMaskInsertOffset":20,"preservedFlagBits":0,"preservedEventBits":0},
              "initial":{"flags":[1],"eventMaskEnabled":false,"eventMask":[],"title":"\\"Child\\""}
            }}""";

        AddChildWindowDecodeResult result = parse(
            "bbj/composer/addchildwindow/decodeCall", AddChildWindowDecodeResult.class, envelope,
            DecodeCallParams.class);

        assertTrue(result.found);
        assertEquals(2, result.edit.flagsRange.length);
        assertNull(result.edit.eventMaskRange);
        assertEquals(20, result.edit.eventMaskInsertOffset);
        assertEquals("\"Child\"", result.initial.title);
    }

    /**
     * The negative control: pins that the same parser still rejects a primitive-int field value
     * beyond the int range. LSP4IJ wraps the underlying Gson parse failure in its own
     * {@link MessageIssueException} rather than surfacing a bare parse exception directly, exactly
     * as {@code compile.CompileResultJsonBoundaryTest}'s equivalent negative control documents.
     */
    @Test
    void anOversizedIntegerFieldIsRejectedByTheSameParser() {
        String oversizedValue = "9007199254740991";
        String oversizedEnvelope = """
            {"jsonrpc":"2.0","id":"1","result":{
              "found":true,
              "edit":{"callStart":%s,"callEnd":42},
              "trailingArgs":[],
              "initial":{"message":"\\"Hello\\"","title":"","assignTo":null,"buttonSet":1,
                "icon":32,"defaultButton":1,"flags":[512],"customButtons":[],"trailingArgs":[],
                "editMode":null,"useConstants":null}
            }}""".formatted(oversizedValue);

        RuntimeException thrown = assertThrows(RuntimeException.class, () -> parse(
            "bbj/composer/msgbox/decodeCall", MsgboxDecodeResult.class, oversizedEnvelope, DecodeCallParams.class));

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

    /** Documents that a successful parse produces genuinely usable int ranges, not just no-throw. */
    @Test
    void everyParsedRangeFitsAJavaInt() {
        String envelope = """
            {"jsonrpc":"2.0","id":"1","result":{
              "found":true,
              "edit":{"callStart":10,"callEnd":42},
              "trailingArgs":[],
              "initial":{"message":"\\"Hello\\"","title":"","assignTo":null,"buttonSet":1,
                "icon":32,"defaultButton":1,"flags":[512],"customButtons":[],"trailingArgs":[],
                "editMode":null,"useConstants":null}
            }}""";

        MsgboxDecodeResult result = parse(
            "bbj/composer/msgbox/decodeCall", MsgboxDecodeResult.class, envelope, DecodeCallParams.class);

        assertTrue(result.edit.callStart >= 0);
        assertTrue(result.edit.callEnd >= 0);
        assertTrue(result.initial.buttonSet >= 0);
        assertTrue(result.initial.icon >= 0);
        assertTrue(result.initial.defaultButton >= 0);
    }

    /** A server that stops sending an optional value must not break the client at the boundary. */
    @Test
    void aMissingOptionalFieldParsesToNullRatherThanFailing() {
        String envelope = """
            {"jsonrpc":"2.0","id":"1","result":{
              "expr":513,"statement":"MSGBOX(\\"Hello\\",513,\\"Title\\")",
              "summary":"OK button, question icon","messageError":null,"customError":null,
              "valid":true,
              "render":{"title":"Title","message":"Hello","icon":32,"buttons":["OK"],"defaultIndex":0}
            }}""";

        MsgboxPreview result = parse("bbj/composer/msgbox/preview", MsgboxPreview.class, envelope,
            MsgboxPreviewParams.class);

        assertNull(result.titleError, "an omitted optional field must parse to null, not fail");
    }
}
