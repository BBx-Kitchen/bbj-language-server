package com.basis.bbj.intellij.composer;

import com.basis.bbj.intellij.composer.ComposerModels.AddChildWindowDecodeResult;
import com.basis.bbj.intellij.composer.ComposerModels.ComposerLensTarget;
import com.basis.bbj.intellij.composer.ComposerModels.AddChildWindowPreview;
import com.basis.bbj.intellij.composer.ComposerModels.AddChildWindowPreviewParams;
import com.basis.bbj.intellij.composer.ComposerModels.AddWindowDecodeResult;
import com.basis.bbj.intellij.composer.ComposerModels.AddWindowPreview;
import com.basis.bbj.intellij.composer.ComposerModels.AddWindowPreviewParams;
import com.basis.bbj.intellij.composer.ComposerModels.ComposerCatalogs;
import com.basis.bbj.intellij.composer.ComposerModels.CvsDecodeResult;
import com.basis.bbj.intellij.composer.ComposerModels.CvsPreview;
import com.basis.bbj.intellij.composer.ComposerModels.CvsPreviewInput;
import com.basis.bbj.intellij.composer.ComposerModels.CvsPreviewParams;
import com.basis.bbj.intellij.composer.ComposerModels.DecodeCallParams;
import com.basis.bbj.intellij.composer.ComposerModels.MsgboxDecodeResult;
import com.basis.bbj.intellij.composer.ComposerModels.MsgboxPreview;
import com.basis.bbj.intellij.composer.ComposerModels.MsgboxPreviewParams;
import com.basis.bbj.intellij.composer.ComposerModels.SetoptsDecodeCallParams;
import com.basis.bbj.intellij.composer.ComposerModels.SetoptsDecodeResult;
import com.basis.bbj.intellij.composer.ComposerModels.SetoptsPreview;
import com.basis.bbj.intellij.composer.ComposerModels.SetoptsPreviewParams;
import com.basis.bbj.intellij.composer.ComposerModels.SetoptsSelection;
import com.basis.bbj.intellij.composer.ComposerModels.SetoptsSelectionBit;
import com.basis.bbj.intellij.composer.ComposerModels.SetoptsComposeTriStateParams;
import com.basis.bbj.intellij.composer.ComposerModels.SetoptsComposeTriStateResult;
import com.basis.bbj.intellij.composer.ComposerModels.SetoptsInCodeDecodeParams;
import com.basis.bbj.intellij.composer.ComposerModels.SetoptsInCodeDecodeResult;
import com.basis.bbj.intellij.composer.ComposerModels.SetoptsTriStateEntry;
import com.basis.bbj.intellij.composer.ComposerModels.SetoptsTriStateSelection;
import org.eclipse.lsp4j.jsonrpc.MessageIssueException;
import org.eclipse.lsp4j.jsonrpc.json.JsonRpcMethod;
import org.eclipse.lsp4j.jsonrpc.json.MessageJsonHandler;
import org.eclipse.lsp4j.jsonrpc.messages.Message;
import org.eclipse.lsp4j.jsonrpc.messages.MessageIssue;
import org.eclipse.lsp4j.jsonrpc.messages.ResponseMessage;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
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
              },
              "setopts":{
                "bits":[{"byte":8,"mask":64,"label":"MKEYED verb creates XKEYED files","detail":null,
                  "bbj":"bbj-specific","bbjDetail":null,"since":null}],
                "byteGroups":[{"byte":1,"label":"Errors, console & listing"}]
              },
              "cvs":{
                "bits":[
                  {"value":1,"label":"Strip leading spaces","detail":null,"since":null,"charsCustomizable":true},
                  {"value":2,"label":"Strip trailing spaces","detail":null,"since":null,"charsCustomizable":true},
                  {"value":4,"label":"Convert to uppercase","detail":null,"since":null,"charsCustomizable":false},
                  {"value":8,"label":"Convert to lowercase","detail":null,"since":null,"charsCustomizable":false},
                  {"value":16,"label":"Convert non-printable characters to spaces","detail":null,"since":null,"charsCustomizable":true},
                  {"value":32,"label":"Replace multiple spaces with one space","detail":null,"since":null,"charsCustomizable":true},
                  {"value":64,"label":"Replace comma and period per SETOPTS mask settings","detail":null,"since":null,"charsCustomizable":false},
                  {"value":128,"label":"Strip all spaces","detail":"BBj-specific (not in PRO/5)","since":null,"charsCustomizable":true}
                ],
                "charsTooltip":"From BBj 19.0, the optional chars argument replaces the default space character."
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
        assertEquals(8, result.setopts.bits.get(0).byteNo);
        assertEquals("bbj-specific", result.setopts.bits.get(0).bbj);
        assertEquals("Errors, console & listing", result.setopts.byteGroups.get(0).label);
        assertEquals(8, result.cvs.bits.size(), "the CVS() catalog carries all eight documented op bits");
        assertTrue(result.cvs.bits.get(0).charsCustomizable);
        assertFalse(result.cvs.bits.get(2).charsCustomizable, "uppercase (bit 4) is not chars-customizable");
        assertTrue(result.cvs.charsTooltip.length() > 0);
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
        // This envelope carries neither error keys nor valid -- the documented fail-closed default.
        assertNull(result.xError);
        assertFalse(result.valid);
    }

    @Test
    void anAddWindowPreviewCarryingFieldErrorsParsesThroughTheLsp4jGson() {
        String envelope = """
            {"jsonrpc":"2.0","id":"1","result":{
              "flags":1,"eventMask":null,"flagsHex":"$00000001$","eventHex":null,
              "statement":"sysgui!.addWindow(\\"10\\", 10, 400, 300, \\"Window\\", $00000001$)",
              "flagsSummary":"Resizable","eventSummary":"(default)",
              "render":{"titleBar":true,"closeBox":false,"minMax":false,"menuBar":false,"hScroll":false,
                "vScroll":false,"border":false,"resizable":true,"disabled":false,"invisible":false,
                "minimized":false,"maximized":false,"badges":[],"title":"Window"},
              "xError":"Not a number — remove the quotes: 10","titleError":null,"valid":false
            }}""";

        AddWindowPreview result = parse("bbj/composer/addwindow/preview", AddWindowPreview.class, envelope,
            AddWindowPreviewParams.class);

        assertEquals("Not a number — remove the quotes: 10", result.xError);
        assertNull(result.titleError);
        assertFalse(result.valid);
    }

    @Test
    void aValidAddWindowPreviewWithEveryErrorOmittedParsesThroughTheLsp4jGson() {
        String envelope = """
            {"jsonrpc":"2.0","id":"1","result":{
              "flags":1,"eventMask":null,"flagsHex":"$00000001$","eventHex":null,
              "statement":"win! = sysgui!.addWindow(10, 10, 400, 300, \\"Window\\", $00000001$)",
              "flagsSummary":"Resizable","eventSummary":"(default)",
              "render":{"titleBar":true,"closeBox":false,"minMax":false,"menuBar":false,"hScroll":false,
                "vScroll":false,"border":false,"resizable":true,"disabled":false,"invisible":false,
                "minimized":false,"maximized":false,"badges":[],"title":"Window"},
              "valid":true
            }}""";

        AddWindowPreview result = parse("bbj/composer/addwindow/preview", AddWindowPreview.class, envelope,
            AddWindowPreviewParams.class);

        assertTrue(result.valid);
        assertNull(result.receiverError);
        assertNull(result.sysguiError);
        assertNull(result.titleError);
        assertNull(result.xError);
        assertNull(result.yError);
        assertNull(result.widthError);
        assertNull(result.heightError);
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
        assertFalse(result.incomplete, "an envelope with no incomplete key must parse false, not null");
    }

    /** An unfinished call: {@code MSGBOX(} with no message typed yet. */
    @Test
    void anIncompleteMsgboxDecodeCallResponseParsesThroughTheLsp4jGson() {
        String envelope = """
            {"jsonrpc":"2.0","id":"1","result":{
              "found":true,"incomplete":true,"edit":{"callStart":4,"callEnd":11},"trailingArgs":[],
              "initial":{"message":"","title":"","buttonSet":0,"icon":0,"defaultButton":0,"flags":[],
                "customButtons":[]},"hasOptions":false
            }}""";

        MsgboxDecodeResult result = parse("bbj/composer/msgbox/decodeCall", MsgboxDecodeResult.class, envelope,
            DecodeCallParams.class);

        assertTrue(result.found);
        assertTrue(result.incomplete);
        assertFalse(result.hasOptions);
        assertNull(result.replace);
        assertEquals(4, result.edit.callStart);
        assertEquals(11, result.edit.callEnd);
        assertEquals("", result.initial.message);
        assertEquals(0, result.initial.flags.size());
        assertEquals(0, result.initial.customButtons.size());
    }

    /** Compose-and-replace mode (#648): {@code replace} carries the original text and the banner. */
    @Test
    void aMsgboxDecodeCallResponseCarryingReplaceParsesThroughTheLsp4jGson() {
        String envelope = """
            {"jsonrpc":"2.0","id":"1","result":{
              "found":true,
              "edit":{"callStart":10,"callEnd":42},
              "trailingArgs":[],
              "initial":{"message":"\\"Hi\\"","title":"","assignTo":null,"buttonSet":0,
                "icon":0,"defaultButton":0,"flags":[],"customButtons":[],"trailingArgs":[],
                "editMode":null,"useConstants":null},
              "replace":{"originalOptions":"flags%","banner":"Could not decode this options expression — composing will replace it."},
              "hasOptions":true
            }}""";

        MsgboxDecodeResult result = parse("bbj/composer/msgbox/decodeCall", MsgboxDecodeResult.class, envelope,
            DecodeCallParams.class);

        assertTrue(result.found);
        assertTrue(result.hasOptions);
        assertEquals("flags%", result.replace.originalOptions);
        assertEquals("Could not decode this options expression — composing will replace it.", result.replace.banner);
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
        // This envelope carries neither error keys nor valid -- the documented fail-closed default.
        assertNull(result.idError);
        assertFalse(result.valid);
    }

    @Test
    void anAddChildWindowPreviewCarryingFieldErrorsParsesThroughTheLsp4jGson() {
        String envelope = """
            {"jsonrpc":"2.0","id":"1","result":{
              "flags":1,"eventMask":null,"flagsHex":"$00000001$","eventHex":null,
              "statement":"window!.addChildWindow(\\"101\\", 10, 10, 200, 150, \\"Child\\", $00000001$, sysgui!.getAvailableContext())",
              "flagsSummary":"Border","eventSummary":"(default)",
              "render":{"borderless":false,"recessed":false,"raised":false,"fieldset":false,
                "hScroll":false,"vScroll":false,"invisible":false,"disabled":false,"docked":false,
                "badges":[],"title":"Child"},
              "idError":"Not a number — remove the quotes: 101","titleError":null,"valid":false
            }}""";

        AddChildWindowPreview result = parse(
            "bbj/composer/addchildwindow/preview", AddChildWindowPreview.class, envelope,
            AddChildWindowPreviewParams.class);

        assertEquals("Not a number — remove the quotes: 101", result.idError);
        assertFalse(result.valid);
    }

    @Test
    void aValidAddChildWindowPreviewWithEveryErrorOmittedParsesThroughTheLsp4jGson() {
        String envelope = """
            {"jsonrpc":"2.0","id":"1","result":{
              "flags":1,"eventMask":null,"flagsHex":"$00000001$","eventHex":null,
              "statement":"child! = window!.addChildWindow(101, 10, 10, 200, 150, \\"Child\\", $00000001$, sysgui!.getAvailableContext())",
              "flagsSummary":"Border","eventSummary":"(default)",
              "render":{"borderless":false,"recessed":false,"raised":false,"fieldset":false,
                "hScroll":false,"vScroll":false,"invisible":false,"disabled":false,"docked":false,
                "badges":[],"title":"Child"},
              "valid":true
            }}""";

        AddChildWindowPreview result = parse(
            "bbj/composer/addchildwindow/preview", AddChildWindowPreview.class, envelope,
            AddChildWindowPreviewParams.class);

        assertTrue(result.valid);
        assertNull(result.receiverError);
        assertNull(result.windowError);
        assertNull(result.idError);
        assertNull(result.contextError);
        assertNull(result.titleError);
        assertNull(result.xError);
        assertNull(result.yError);
        assertNull(result.widthError);
        assertNull(result.heightError);
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

    @Test
    void aSetoptsDecodeCallResponseParsesThroughTheLsp4jGson() {
        String envelope = """
            {"jsonrpc":"2.0","id":"1","result":{
              "found":true,
              "edit":{"hexRange":[8,22],"insertOffset":null,"hexDigits":"08004020000000"},
              "initial":{"bits":[{"byte":3,"mask":2}],"maskComma":",","maskDot":".","rawTail":""}
            }}""";

        SetoptsDecodeResult result = parse(
            "bbj/composer/setopts/decodeCall", SetoptsDecodeResult.class, envelope, SetoptsDecodeCallParams.class);

        assertTrue(result.found);
        assertEquals(2, result.edit.hexRange.length);
        assertEquals(8, result.edit.hexRange[0]);
        assertEquals("08004020000000", result.edit.hexDigits);
        // The point of this test: proves the @SerializedName("byte") mapping survives LSP4IJ's own
        // deserializer, not just a hand-rolled Gson instance.
        assertEquals(3, result.initial.bits.get(0).byteNo);
    }

    @Test
    void aSetoptsPreviewResponseParsesThroughTheLsp4jGson() {
        String envelope = """
            {"jsonrpc":"2.0","id":"1","result":{
              "hexDigits":"08004020000000","line":"SETOPTS 08004020000000",
              "summary":"Byte 1: Console mode in public programs","maskInputsEnabled":true,
              "unknownByBytes":[{"byte":7,"mask":16}]
            }}""";

        SetoptsPreview result = parse(
            "bbj/composer/setopts/preview", SetoptsPreview.class, envelope, SetoptsPreviewParams.class);

        assertEquals("08004020000000", result.hexDigits);
        assertTrue(result.maskInputsEnabled);
        assertEquals(7, result.unknownByBytes.get(0).byteNo);
    }

    /**
     * The request direction, which the response-parsing family above does not cover: a dropped
     * {@code @SerializedName("byte")} would still pass every response-direction test while silently
     * sending a key the server ignores.
     */
    @Test
    void theSetoptsPreviewParamsSerializeWithTheWireKeyByte() {
        SetoptsSelection selection = new SetoptsSelection();
        selection.bits = List.of(new SetoptsSelectionBit(3, 2));
        SetoptsPreviewParams params = new SetoptsPreviewParams("08004020000000", selection);

        String json = new com.google.gson.Gson().toJson(params);

        assertTrue(json.contains("\"byte\":3"), "expected the wire key 'byte', got: " + json);
        assertFalse(json.contains("byteNo"), "the Java field name byteNo must never leak onto the wire: " + json);
    }

    // ---- CVS() (#649) --------------------------------------------------------------------------

    @Test
    void aFullyPopulatedCvsDecodeCallResponseParsesThroughTheLsp4jGson() {
        String envelope = """
            {"jsonrpc":"2.0","id":"1","result":{
              "found":true,"editable":true,"reason":null,
              "edit":{"callStart":5,"callEnd":25},
              "initial":{"str":"a$","bits":[1,4],"chars":"\\"*\\""},
              "trailingArgs":["ERR=100"]
            }}""";

        CvsDecodeResult result = parse(
            "bbj/composer/cvs/decodeCall", CvsDecodeResult.class, envelope, DecodeCallParams.class);

        assertTrue(result.found);
        assertTrue(result.editable);
        assertNull(result.reason);
        assertEquals(5, result.edit.callStart);
        assertEquals(25, result.edit.callEnd);
        assertEquals("a$", result.initial.str);
        assertEquals(2, result.initial.bits.size());
        assertEquals(1L, result.initial.bits.get(0));
        assertEquals("\"*\"", result.initial.chars);
        assertEquals(1, result.trailingArgs.size());
    }

    /** A not-editable verdict still carries {@code edit} + {@code reason}, but no {@code initial}/{@code trailingArgs}. */
    @Test
    void aNotEditableCvsDecodeCallResponseWithEveryOptionalFieldOmittedParsesWithoutFailing() {
        String envelope = """
            {"jsonrpc":"2.0","id":"1","result":{
              "found":true,"editable":false,
              "reason":"The mask argument is not a sum of integer literals, so it cannot be safely decoded.",
              "edit":{"callStart":5,"callEnd":18}
            }}""";

        CvsDecodeResult result = parse(
            "bbj/composer/cvs/decodeCall", CvsDecodeResult.class, envelope, DecodeCallParams.class);

        assertTrue(result.found);
        assertFalse(result.editable);
        assertFalse(result.incomplete, "an envelope with no incomplete key must parse as incomplete: false");
        assertEquals(
            "The mask argument is not a sum of integer literals, so it cannot be safely decoded.", result.reason);
        assertEquals(5, result.edit.callStart);
        assertNull(result.initial, "a not-editable verdict must carry no initial payload");
        assertNull(result.trailingArgs, "a not-editable verdict must carry no trailingArgs");
    }

    /** An unfinished call's decode: `incomplete: true`, `editable: false`, no `reason`. */
    @Test
    void anIncompleteCvsDecodeCallResponseParsesThroughTheLsp4jGson() {
        String envelope = """
            {"jsonrpc":"2.0","id":"1","result":{
              "found":true,"editable":false,"incomplete":true,
              "edit":{"callStart":5,"callEnd":9},
              "initial":{"str":"","bits":[],"chars":""},
              "trailingArgs":[]
            }}""";

        CvsDecodeResult result = parse(
            "bbj/composer/cvs/decodeCall", CvsDecodeResult.class, envelope, DecodeCallParams.class);

        assertTrue(result.found);
        assertFalse(result.editable);
        assertTrue(result.incomplete);
        assertNull(result.reason);
        assertEquals(5, result.edit.callStart);
        assertEquals(9, result.edit.callEnd);
        assertEquals("", result.initial.str);
        assertTrue(result.initial.bits.isEmpty());
        assertTrue(result.trailingArgs.isEmpty());
    }

    @Test
    void aCvsPreviewResponseWithMask255ParsesThroughTheLsp4jGson() {
        String envelope = """
            {"jsonrpc":"2.0","id":"1","result":{
              "mask":255,"statement":"a$ = CVS(a$, 255, \\"*\\")",
              "summary":"Strip leading spaces \\u00b7 Strip all spaces \\u2014 applied in ascending order",
              "charsEnabled":true,"strError":null,"charsError":null,"valid":true
            }}""";

        CvsPreview result = parse("bbj/composer/cvs/preview", CvsPreview.class, envelope, CvsPreviewParams.class);

        assertEquals(255L, result.mask);
        assertTrue(result.charsEnabled);
        assertTrue(result.valid);
        assertNull(result.strError);
    }

    /**
     * The request direction: proves {@code CvsPreviewInput.bits} serializes as a bare JSON array
     * of numbers, the shape {@code cvsPreview} in {@code cvs-composer.ts} expects.
     */
    @Test
    void theCvsPreviewParamsSerializeBitsAsAJsonArrayOfNumbers() {
        CvsPreviewInput input = new CvsPreviewInput();
        input.str = "a$";
        input.bits = List.of(1L, 4L);
        input.chars = "\"*\"";
        CvsPreviewParams params = new CvsPreviewParams(input);

        String json = new com.google.gson.Gson().toJson(params);

        assertTrue(json.contains("\"bits\":[1,4]"), "expected a bare numeric array for bits, got: " + json);
    }

    // ---- Composer cue (#650) ----------------------------------------------------------------------

    @Test
    void aComposerLensTargetCommandArgumentParsesThroughTheLsp4jGson() {
        String envelope = """
            {"jsonrpc":"2.0","id":"1","result":{
              "kind":"addwindow","uri":"file:///tmp/x.bbj","line":3,"character":12
            }}""";

        ComposerLensTarget result = parse("bbj.openComposerAt", ComposerLensTarget.class, envelope);

        assertEquals("addwindow", result.kind);
        assertEquals("file:///tmp/x.bbj", result.uri);
        assertEquals(3, result.line);
        assertEquals(12, result.character);
    }

    /**
     * {@code kind} is a plain wire string, never a Java enum (see {@link ComposerLensTarget}'s own
     * javadoc), so a kind the server adds later -- before this plugin's {@code ComposerLensKinds}
     * knows how to route it -- parses without throwing rather than failing the whole command
     * argument.
     */
    @Test
    void anUnknownCueKindStillParses() {
        String envelope = """
            {"jsonrpc":"2.0","id":"1","result":{
              "kind":"future-kind","uri":"file:///tmp/x.bbj","line":0,"character":0
            }}""";

        ComposerLensTarget result = parse("bbj.openComposerAt", ComposerLensTarget.class, envelope);

        assertEquals("future-kind", result.kind);
    }

    // ---- SETOPTS-in-code (#475, DISC-06, plan 88-04) --------------------------------------------

    @Test
    void aPopulatedDecodeInCodeResponseParsesThroughTheLsp4jGson() {
        String envelope = """
            {"jsonrpc":"2.0","id":"1","result":{
              "found":true,"editable":true,"mode":"chain","reason":null,
              "summary":"Byte 1: Console mode in public programs",
              "absolute":null,
              "chain":{"variableName":"opts$","startLine":5,"endLine":8,"indent":"    "},
              "initial":{"entries":[{"byte":1,"mask":8,"state":"set"},{"byte":3,"mask":64,"state":"clear"}]}
            }}""";

        SetoptsInCodeDecodeResult result = parse(
            "bbj/composer/setopts/decodeInCode", SetoptsInCodeDecodeResult.class, envelope,
            SetoptsInCodeDecodeParams.class);

        assertTrue(result.found);
        assertTrue(result.editable);
        assertEquals("chain", result.mode);
        assertEquals("opts$", result.chain.variableName);
        // The point of this test: proves the @SerializedName("byte") mapping survives LSP4IJ's own
        // deserializer, not just a hand-rolled Gson instance.
        assertEquals(1, result.initial.entries.get(0).byteNo);
        assertEquals("set", result.initial.entries.get(0).state);
        assertEquals(3, result.initial.entries.get(1).byteNo);
        assertEquals("clear", result.initial.entries.get(1).state);
    }

    /** An editable:false / not-found envelope with every optional field omitted must not throw (D-04). */
    @Test
    void aNotFoundDecodeInCodeResponseWithEveryOptionalFieldOmittedParsesWithoutFailing() {
        String envelope = """
            {"jsonrpc":"2.0","id":"1","result":{
              "found":false,"editable":false,"mode":"none"
            }}""";

        SetoptsInCodeDecodeResult result = parse(
            "bbj/composer/setopts/decodeInCode", SetoptsInCodeDecodeResult.class, envelope,
            SetoptsInCodeDecodeParams.class);

        assertFalse(result.found);
        assertFalse(result.editable);
        assertEquals("none", result.mode);
        assertNull(result.reason);
        assertNull(result.summary);
        assertNull(result.absolute);
        assertNull(result.chain, "editable:false must carry no chain payload (D-04)");
        assertNull(result.initial, "editable:false must carry no initial payload (D-04)");
    }

    @Test
    void aComposeTriStateResponseParsesThroughTheLsp4jGson() {
        String envelope = """
            {"jsonrpc":"2.0","id":"1","result":{
              "text":"opts$=OPTS\\nopts$=opts$ IOR $00000008$\\nSETOPTS opts$",
              "lines":["opts$=OPTS","opts$=opts$ IOR $00000008$","SETOPTS opts$"]
            }}""";

        SetoptsComposeTriStateResult result = parse(
            "bbj/composer/setopts/composeTriState", SetoptsComposeTriStateResult.class, envelope,
            SetoptsComposeTriStateParams.class);

        assertEquals(3, result.lines.size());
        assertEquals("SETOPTS opts$", result.lines.get(2));
        assertTrue(result.text.contains("SETOPTS opts$"));
    }

    /**
     * The request direction: a dropped {@code @SerializedName("byte")} on {@link SetoptsTriStateEntry}
     * would still pass every response-direction test while silently sending a key the server ignores.
     */
    @Test
    void theSetoptsComposeTriStateParamsSerializeWithTheWireKeyByte() {
        SetoptsTriStateSelection selection = new SetoptsTriStateSelection();
        selection.entries = List.of(new SetoptsTriStateEntry(3, 64, "set"));
        SetoptsComposeTriStateParams params = new SetoptsComposeTriStateParams(selection, "opts$", "", "block");

        String json = new com.google.gson.Gson().toJson(params);

        assertTrue(json.contains("\"byte\":3"), "expected the wire key 'byte', got: " + json);
        assertFalse(json.contains("byteNo"), "the Java field name byteNo must never leak onto the wire: " + json);
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
