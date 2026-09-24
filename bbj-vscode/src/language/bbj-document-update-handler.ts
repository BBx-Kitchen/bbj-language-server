import { DefaultDocumentUpdateHandler } from 'langium/lsp';
import type { TextDocumentChangeEvent } from 'vscode-languageserver';
import type { TextDocument } from 'vscode-languageserver-textdocument';

/**
 * Langium only advertises `textDocumentSync.save` -- and only subscribes
 * `TextDocuments.onDidSave` to `didSaveDocument` at all -- when
 * `services.lsp.DocumentUpdateHandler.didSaveDocument` exists
 * (`buildInitializeResult()`/`addDocumentUpdateHandler()` in Langium's own
 * `language-server.ts`). Without a `didSaveDocument` present here, both VS Code's
 * `vscode-languageclient` and IntelliJ's LSP4IJ correctly withhold `textDocument/didSave`
 * entirely -- they are not broken, they are honoring a capability this server never
 * advertised. This override's only job is to make that capability true; its body stays empty.
 *
 * The actual reaction to a save lives in `BBjDocumentBuilder`, which already subscribes to
 * `services.workspace.TextDocuments` directly for `onDidOpen`/`onDidChangeContent` -- the same
 * `TextDocuments` instance exposes `onDidSave` on the identical public interface, so the save
 * listener joins those two rather than routing through this handler. A save needs no rebuild
 * here either: the client's own file-watcher change notification (`didChangeWatchedFiles`)
 * already triggers Langium's rebuild-driven trigger for the saved file.
 */
export class BBjDocumentUpdateHandler extends DefaultDocumentUpdateHandler {

    public didSaveDocument(_event: TextDocumentChangeEvent<TextDocument>): void {
        // Intentionally empty -- see the class doc comment. Presence alone flips
        // `textDocumentSync.save` to `true` in the server's `InitializeResult`.
    }

}
