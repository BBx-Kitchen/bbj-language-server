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
import org.eclipse.lsp4j.jsonrpc.services.JsonRequest;
import org.eclipse.lsp4j.services.LanguageServer;

import java.util.concurrent.CompletableFuture;

/**
 * The BBj language server, extended with the custom {@code bbj/composer/*} requests (#433) so the
 * visual composers can reuse the server's flag/hex arithmetic instead of re-implementing it in Java.
 * Registered as the server proxy interface via {@code BbjLanguageServerFactory#getServerInterface()};
 * LSP4IJ builds a dynamic proxy that dispatches these methods over LSP.
 */
public interface BbjComposerServer extends LanguageServer {

    /** Static option catalogs for both composers — fetched once, then rendered client-side. */
    @JsonRequest("bbj/composer/catalogs")
    CompletableFuture<ComposerCatalogs> composerCatalogs();

    /** Full MSGBOX preview (expr + statement + validation + render) for one selection. */
    @JsonRequest("bbj/composer/msgbox/preview")
    CompletableFuture<MsgboxPreview> msgboxPreview(MsgboxPreviewParams params);

    /** Full addWindow preview (flags/event hex + statement + summaries + schematic) for one selection. */
    @JsonRequest("bbj/composer/addwindow/preview")
    CompletableFuture<AddWindowPreview> addWindowPreview(AddWindowPreviewParams params);

    /** Decode the MSGBOX call at the caret into a prefill payload + the call span to replace. */
    @JsonRequest("bbj/composer/msgbox/decodeCall")
    CompletableFuture<MsgboxDecodeResult> msgboxDecodeCall(DecodeCallParams params);

    /** Decode the addWindow call at the caret into a prefill payload + token ranges to rewrite. */
    @JsonRequest("bbj/composer/addwindow/decodeCall")
    CompletableFuture<AddWindowDecodeResult> addWindowDecodeCall(DecodeCallParams params);

    /** Full addChildWindow preview (flags/event hex + statement + summaries + schematic) (#473). */
    @JsonRequest("bbj/composer/addchildwindow/preview")
    CompletableFuture<AddChildWindowPreview> addChildWindowPreview(AddChildWindowPreviewParams params);

    /** Decode the addChildWindow call at the caret into a prefill payload + token ranges to rewrite. */
    @JsonRequest("bbj/composer/addchildwindow/decodeCall")
    CompletableFuture<AddChildWindowDecodeResult> addChildWindowDecodeCall(DecodeCallParams params);
}
