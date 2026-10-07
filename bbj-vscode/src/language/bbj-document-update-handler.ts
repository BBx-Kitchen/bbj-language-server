import type { FileSystemProvider, LangiumDocuments } from 'langium';
import { DefaultDocumentUpdateHandler } from 'langium/lsp';
import type { LangiumSharedServices } from 'langium/lsp';
import type { TextDocumentChangeEvent } from 'vscode-languageserver';
import type { TextDocument } from 'vscode-languageserver-textdocument';
import { URI } from 'vscode-uri';
import { logger } from './logger.js';
import { BBjWorkspaceManager } from './bbj-ws-manager.js';

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
 *
 * Closing a PREFIX document rebuilds it from disk, so it becomes an unvalidated library
 * document again (or is dropped when its file is gone). Langium subscribes `didCloseDocument`
 * to `TextDocuments.onDidClose` only because this class defines it; the `openClose`
 * capability is already advertised, so nothing else changes for the client.
 */
export class BBjDocumentUpdateHandler extends DefaultDocumentUpdateHandler {

    private readonly langiumDocuments: () => LangiumDocuments;
    private readonly fileSystemProvider: () => FileSystemProvider;

    constructor(services: LangiumSharedServices) {
        super(services);
        this.langiumDocuments = () => services.workspace.LangiumDocuments;
        this.fileSystemProvider = () => services.workspace.FileSystemProvider;
    }

    public didSaveDocument(_event: TextDocumentChangeEvent<TextDocument>): void {
        // Intentionally empty -- see the class doc comment. Presence alone flips
        // `textDocumentSync.save` to `true` in the server's `InitializeResult`.
    }

    /**
     * Turns a PREFIX document whose editor closed back into a library document. The unsaved
     * editor buffer is dropped: `DefaultLangiumDocumentFactory.update` reads the file from disk
     * once no text document is open for the uri, and `BBjDocumentBuilder` skips validation for a
     * PREFIX document that is not open. When the file no longer exists, the document is removed
     * as deleted instead, which also publishes empty diagnostics for it.
     *
     * This does not go through `fireDocumentUpdate`: the rejection of the write promise it
     * creates is never handled, and this server has no process-level handler for it. The chain
     * below returns that promise into a `catch` that logs only the uri and the error message.
     */
    public didCloseDocument(event: TextDocumentChangeEvent<TextDocument>): void {
        const workspaceManager = this.workspaceManager;
        if (!(workspaceManager instanceof BBjWorkspaceManager)) return;
        const uri = URI.parse(event.document.uri);
        if (!workspaceManager.isExternalDocument(uri) || !this.langiumDocuments().hasDocument(uri)) return;

        workspaceManager.ready
            .then(async () => {
                const exists = await this.fileSystemProvider().exists(uri);
                return this.workspaceLock.write(token => exists
                    ? this.documentBuilder.update([uri], [], token)
                    : this.documentBuilder.update([], [uri], token));
            })
            .catch(e => {
                logger.error(`Rebuilding the closed document failed for ${event.document.uri}: ${e instanceof Error ? e.message : String(e)}`);
            });
    }

}
