package com.basis.bbj.intellij.composer;

import com.basis.bbj.intellij.composer.ComposerModels.AddChildWindowDecodeResult;
import com.basis.bbj.intellij.composer.ComposerModels.AddWindowCatalogs;
import com.basis.bbj.intellij.composer.ComposerModels.AddWindowDecodeResult;
import com.basis.bbj.intellij.composer.ComposerModels.AddWindowEdit;
import com.basis.bbj.intellij.composer.ComposerModels.DecodeCallParams;
import com.basis.bbj.intellij.composer.ComposerModels.MsgboxCatalogs;
import com.basis.bbj.intellij.composer.ComposerModels.MsgboxDecodeResult;
import com.basis.bbj.intellij.composer.ComposerModels.MsgboxEdit;
import com.basis.bbj.intellij.composer.ComposerModels.SetoptsCatalogs;
import com.basis.bbj.intellij.composer.ComposerModels.SetoptsDecodeCallParams;
import com.basis.bbj.intellij.composer.ComposerModels.SetoptsDecodeResult;
import com.basis.bbj.intellij.composer.ComposerModels.SetoptsEdit;
import com.basis.bbj.intellij.composer.ComposerModels.SetoptsInCodeAbsoluteEdit;
import com.basis.bbj.intellij.composer.ComposerModels.SetoptsInCodeChainEdit;
import com.basis.bbj.intellij.composer.ComposerModels.SetoptsInCodeDecodeParams;
import com.basis.bbj.intellij.composer.ComposerModels.SetoptsInCodeDecodeResult;
import com.intellij.openapi.application.ApplicationManager;
import com.intellij.openapi.application.ModalityState;
import com.intellij.openapi.command.WriteCommandAction;
import com.intellij.openapi.editor.Document;
import com.intellij.openapi.editor.Editor;
import com.intellij.openapi.fileEditor.FileDocumentManager;
import com.intellij.openapi.project.Project;
import com.intellij.openapi.util.TextRange;
import com.intellij.openapi.vfs.VirtualFile;
import org.jetbrains.annotations.NotNull;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.concurrent.CompletableFuture;
import java.util.function.BiFunction;
import java.util.function.BiPredicate;

/**
 * Shared entry point for both composer UIs (#430/#433). Captures the caret context, asks the
 * language server to decode the call the caret is inside (the {@code decodeCall} requests), and
 * opens the dialog either prefilled for edit-in-place (replacing the call/tokens) or blank for
 * create (inserting at the caret). Used by the editor-popup actions and the lightbulb intentions,
 * so both are position-aware with identical behaviour.
 */
public final class ComposerLauncher {

    public enum Kind { MSGBOX, ADDWINDOW, ADDCHILDWINDOW, SETOPTS, SETOPTS_IN_CODE }

    private ComposerLauncher() {}

    /**
     * Cheap, synchronous heuristic for whether the caret sits on a line with the given call keyword
     * (e.g. {@code "msgbox"}), at or after its start — used by the lightbulb intentions' isAvailable
     * without an LSP round-trip. The precise decode happens on invoke.
     */
    public static boolean isCaretOnCall(@NotNull Editor editor, @NotNull String keyword) {
        Document doc = editor.getDocument();
        int caret = editor.getCaretModel().getOffset();
        if (caret > doc.getTextLength()) {
            return false;
        }
        int line = doc.getLineNumber(caret);
        int lineStart = doc.getLineStartOffset(line);
        String text = doc.getText(new TextRange(lineStart, doc.getLineEndOffset(line)))
                .toLowerCase(java.util.Locale.ROOT);
        int idx = text.indexOf(keyword);
        return idx >= 0 && (caret - lineStart) >= idx;
    }

    /**
     * Cheap, synchronous three-keyword gate for the SETOPTS-in-code intention's isAvailable
     * (#475, DISC-06): the caret's line names {@code SETOPTS}, {@code IOR(} or {@code AND(}
     * case-insensitively, at or before the caret. Widens {@link #isCaretOnCall}'s single-keyword
     * mechanics to a set of three rather than introducing a second document-reading
     * implementation. The authoritative safe/unsafe/editable decision always comes from the
     * server's {@code decodeInCode} response, never from this heuristic.
     */
    static boolean isCaretOnSetoptsInCode(@NotNull Editor editor) {
        return isCaretOnCall(editor, "setopts") || isCaretOnCall(editor, "ior(") || isCaretOnCall(editor, "and(");
    }

    public static void launch(@NotNull Project project, @NotNull Editor editor, @NotNull Kind kind) {
        // Capture the caret's line/column on the EDT before going async.
        Document doc = editor.getDocument();
        int caret = editor.getCaretModel().getOffset();
        int line = doc.getLineNumber(caret);
        int lineStart = doc.getLineStartOffset(line);
        String lineText = doc.getText(new TextRange(lineStart, doc.getLineEndOffset(line)));
        int col = caret - lineStart;

        ComposerFlow flow = new ComposerFlow(
                ComposerLauncher::onEdt,
                notice -> ComposerNoticeRenderer.render(project, notice, () -> launch(project, editor, kind)),
                ComposerFlow.LAUNCH_TIMEOUT_MILLIS);
        CompletableFuture<BbjComposerServer> serverFuture = BbjComposerService.server(project);

        switch (kind) {
            case MSGBOX -> flow.launch(labelOf(kind), serverFuture,
                    (server, catalogs) -> server.msgboxDecodeCall(new DecodeCallParams(lineText, col)),
                    (server, catalogs, decoded) -> openMsgbox(project, editor, server, catalogs.msgbox, decoded, line, col));
            case ADDWINDOW -> flow.launch(labelOf(kind), serverFuture,
                    (server, catalogs) -> server.addWindowDecodeCall(new DecodeCallParams(lineText, col)),
                    (server, catalogs, decoded) -> openAddWindow(project, editor, server, catalogs.addwindow, decoded, line, col));
            case ADDCHILDWINDOW -> flow.launch(labelOf(kind), serverFuture,
                    (server, catalogs) -> server.addChildWindowDecodeCall(new DecodeCallParams(lineText, col)),
                    (server, catalogs, decoded) -> openAddChildWindow(project, editor, server, catalogs.addchildwindow, decoded, line, col));
            case SETOPTS -> flow.launch(labelOf(kind), serverFuture,
                    (server, catalogs) -> server.setoptsDecodeCall(new SetoptsDecodeCallParams(lineText)),
                    (server, catalogs, decoded) -> openSetopts(project, editor, server, catalogs.setopts, decoded, line, col));
            case SETOPTS_IN_CODE -> {
                // The in-code decode needs document-wide context (a document URI, not just a line
                // of text), so the caret's virtual file is captured here on the EDT rather than
                // sending a blank URI -- when no virtual file is available (an unsaved scratch
                // buffer or a closed editor), the not-ready notice fires instead of guessing.
                VirtualFile file = FileDocumentManager.getInstance().getFile(doc);
                if (file == null) {
                    ComposerNoticeRenderer.render(project, ComposerNotices.notReady(labelOf(kind)), null);
                    return;
                }
                String uri = uriOf(file);
                flow.launch(labelOf(kind), serverFuture,
                        (server, catalogs) -> server.setoptsDecodeInCode(new SetoptsInCodeDecodeParams(uri, line, col)),
                        (server, catalogs, decoded) -> openSetoptsInCode(project, editor, server, catalogs.setopts, decoded, line, col, uri));
            }
        }
    }

    /**
     * The document URI format the language server's document store keys open documents by --
     * mirroring {@code BbjCompileAction}'s own conversion for {@code bbj/compile}, since both
     * requests need a URI the server can resolve against its own already-open document, never a
     * filesystem read of an arbitrary path.
     */
    private static String uriOf(VirtualFile file) {
        try {
            return file.toNioPath().toUri().toString();
        } catch (UnsupportedOperationException ex) {
            return file.getUrl();
        }
    }

    /** The label a balloon names the invoked composer by — replaces the switch that lived in {@code notifyNotReady}. */
    private static String labelOf(Kind kind) {
        return switch (kind) {
            case MSGBOX -> "MSGBOX";
            case ADDWINDOW -> "addWindow";
            case ADDCHILDWINDOW -> "addChildWindow";
            case SETOPTS -> "SETOPTS";
            case SETOPTS_IN_CODE -> "SETOPTS in code";
        };
    }

    private static void openMsgbox(Project project, Editor editor, BbjComposerServer server,
                                   MsgboxCatalogs catalogs, MsgboxDecodeResult decoded, int line, int col) {
        if (catalogs == null) {
            ComposerNoticeRenderer.render(project, ComposerNotices.notReady(labelOf(Kind.MSGBOX)), null);
            return;
        }
        boolean edit = decoded != null && decoded.found;
        MsgboxComposerDialog dialog = edit
                ? new MsgboxComposerDialog(project, server, catalogs, decoded.initial, true, decoded.trailingArgs)
                : new MsgboxComposerDialog(project, server, catalogs, null, false, null);
        if (!dialog.showAndGet()) {
            return;
        }
        String text = dialog.getStatement();
        if (text == null || text.isEmpty()) {
            return;
        }
        if (edit) {
            MsgboxEdit ed = decoded.edit;
            StaleEditGuard guard = new StaleEditGuard(
                    documentViewOf(editor),
                    body -> WriteCommandAction.runWriteCommandAction(project, "Configure MSGBOX", null, body),
                    ComposerLauncher::onEdt,
                    notice -> ComposerNoticeRenderer.render(project, notice, () -> launch(project, editor, Kind.MSGBOX)),
                    StaleEditGuard.REDECODE_TIMEOUT_MILLIS);
            guard.applyIfUnchanged(labelOf(Kind.MSGBOX), line, col, decoded,
                    (currentLineText, currentCol) -> server.msgboxDecodeCall(new DecodeCallParams(currentLineText, currentCol)),
                    DecodeEquality::sameMsgbox,
                    () -> {
                        int ls = editor.getDocument().getLineStartOffset(line);
                        editor.getDocument().replaceString(ls + ed.callStart, ls + ed.callEnd, text);
                    });
        } else {
            insertAtCaret(project, editor, text, "Compose MSGBOX");
        }
    }

    /** The live document view every stale-edit guard reads from -- current line count/text/stamp, never captured values. */
    private static StaleEditGuard.DocumentView documentViewOf(Editor editor) {
        return new StaleEditGuard.DocumentView() {
            @Override
            public int lineCount() {
                return editor.getDocument().getLineCount();
            }

            @Override
            public String lineText(int line) {
                Document doc = editor.getDocument();
                return doc.getText(new TextRange(doc.getLineStartOffset(line), doc.getLineEndOffset(line)));
            }

            @Override
            public long modificationStamp() {
                return editor.getDocument().getModificationStamp();
            }
        };
    }

    private static void openAddWindow(Project project, Editor editor, BbjComposerServer server,
                                      AddWindowCatalogs catalogs, AddWindowDecodeResult decoded, int line, int col) {
        if (catalogs == null) {
            ComposerNoticeRenderer.render(project, ComposerNotices.notReady(labelOf(Kind.ADDWINDOW)), null);
            return;
        }
        boolean edit = decoded != null && decoded.found;
        AddWindowComposerDialog dialog = edit
                ? new AddWindowComposerDialog(project, server, catalogs, decoded.initial, true,
                        decoded.edit.preservedFlagBits, decoded.edit.preservedEventBits)
                : new AddWindowComposerDialog(project, server, catalogs);
        if (!dialog.showAndGet()) {
            return;
        }
        if (edit) {
            applyAddWindowEdit(project, editor, server, line, col, decoded, dialog);
        } else {
            insertAtCaret(project, editor, dialog.getStatement(), "Compose addWindow");
        }
    }

    private static void openAddChildWindow(Project project, Editor editor, BbjComposerServer server,
                                           AddWindowCatalogs catalogs, AddChildWindowDecodeResult decoded, int line, int col) {
        if (catalogs == null) {
            ComposerNoticeRenderer.render(project, ComposerNotices.notReady(labelOf(Kind.ADDCHILDWINDOW)), null);
            return;
        }
        boolean edit = decoded != null && decoded.found;
        AddChildWindowComposerDialog dialog = edit
                ? new AddChildWindowComposerDialog(project, server, catalogs, decoded.initial, true,
                        decoded.edit.preservedFlagBits, decoded.edit.preservedEventBits)
                : new AddChildWindowComposerDialog(project, server, catalogs);
        if (!dialog.showAndGet()) {
            return;
        }
        if (edit) {
            applyHexEdit(project, editor, line, col, decoded.edit, "Configure child window flags",
                    dialog.getFlagsHex(), dialog.isEventEnabled() ? dialog.getEventHex() : null,
                    labelOf(Kind.ADDCHILDWINDOW), decoded,
                    (currentLineText, currentCol) -> server.addChildWindowDecodeCall(new DecodeCallParams(currentLineText, currentCol)),
                    DecodeEquality::sameAddChildWindow, Kind.ADDCHILDWINDOW);
        } else {
            insertAtCaret(project, editor, dialog.getStatement(), "Compose addChildWindow");
        }
    }

    /** Rewrite the flags (and, if enabled, event_mask) hex tokens in place, right-to-left. */
    private static void applyAddWindowEdit(Project project, Editor editor, BbjComposerServer server, int line, int col,
                                           AddWindowDecodeResult decoded, AddWindowComposerDialog dialog) {
        applyHexEdit(project, editor, line, col, decoded.edit, "Configure window flags",
                dialog.getFlagsHex(), dialog.isEventEnabled() ? dialog.getEventHex() : null,
                labelOf(Kind.ADDWINDOW), decoded,
                (currentLineText, currentCol) -> server.addWindowDecodeCall(new DecodeCallParams(currentLineText, currentCol)),
                DecodeEquality::sameAddWindow, Kind.ADDWINDOW);
    }

    /**
     * Rewrite the flags (and, when {@code eventHex} is non-null, event_mask) hex tokens in place,
     * guarded by a fresh {@link StaleEditGuard} built exactly like the MSGBOX path's. Shared by the
     * addWindow and addChildWindow edit flows — the token-range/insert-offset payload has the same
     * shape for both ({@link AddWindowEdit}) — so {@code D} is the caller's decode-result type
     * ({@link AddWindowDecodeResult} or {@link AddChildWindowDecodeResult}), threaded through as
     * explicit parameters rather than a context object.
     */
    private static <D> void applyHexEdit(Project project, Editor editor, int line, int col, AddWindowEdit ed,
                                         String commandName, String flagsHex, String eventHex,
                                         String kindLabel, D capturedDecode,
                                         BiFunction<String, Integer, CompletableFuture<D>> reDecode,
                                         BiPredicate<D, D> sameDecode, Kind kind) {
        // Defense in depth for #538: OK is disabled until the dialog's first preview resolves, so
        // flagsHex should never still be empty here -- but if it somehow were, writing it would
        // corrupt the statement's flags literal. Mirrors openMsgbox's own empty-statement guard.
        if (flagsHex == null || flagsHex.isEmpty()) {
            return;
        }
        StaleEditGuard guard = new StaleEditGuard(
                documentViewOf(editor),
                body -> WriteCommandAction.runWriteCommandAction(project, commandName, null, body),
                ComposerLauncher::onEdt,
                notice -> ComposerNoticeRenderer.render(project, notice, () -> launch(project, editor, kind)),
                StaleEditGuard.REDECODE_TIMEOUT_MILLIS);
        guard.applyIfUnchanged(kindLabel, line, col, capturedDecode, reDecode, sameDecode, () -> {
            Document doc = editor.getDocument();
            int ls = doc.getLineStartOffset(line);
            List<Op> ops = new ArrayList<>();
            if (ed.flagsRange != null) {
                ops.add(new Op(ls + ed.flagsRange[0], ls + ed.flagsRange[1], flagsHex));
            } else if (ed.flagsInsertOffset != null) {
                ops.add(new Op(ls + ed.flagsInsertOffset, ls + ed.flagsInsertOffset, ", " + flagsHex));
            }
            if (eventHex != null) {
                if (ed.eventMaskRange != null) {
                    ops.add(new Op(ls + ed.eventMaskRange[0], ls + ed.eventMaskRange[1], eventHex));
                } else if (ed.eventMaskInsertOffset != null) {
                    ops.add(new Op(ls + ed.eventMaskInsertOffset, ls + ed.eventMaskInsertOffset, ", " + eventHex));
                }
            }
            // Apply from the highest offset down so earlier edits don't shift later ranges.
            ops.sort(Comparator.comparingInt((Op o) -> o.start).reversed());
            for (Op op : ops) {
                doc.replaceString(op.start, op.end, op.text);
            }
        });
    }

    /**
     * Opens the SETOPTS dialog (#633), either prefilled for edit-in-place on the decoded line or
     * blank for compose-new. The edit path replaces only the decoded hex token (or fills the empty
     * insert point after a bare {@code SETOPTS} keyword) through {@link StaleEditGuard}; the
     * compose-new path inserts a whole line at the caret's line start via {@link #insertAt}.
     */
    private static void openSetopts(Project project, Editor editor, BbjComposerServer server,
                                    SetoptsCatalogs catalogs, SetoptsDecodeResult decoded, int line, int col) {
        if (catalogs == null) {
            ComposerNoticeRenderer.render(project, ComposerNotices.notReady(labelOf(Kind.SETOPTS)), null);
            return;
        }
        boolean edit = decoded != null && decoded.found;
        SetoptsComposerDialog dialog = edit
                ? new SetoptsComposerDialog(project, server, catalogs, decoded.initial, decoded.edit.hexDigits, true)
                : new SetoptsComposerDialog(project, server, catalogs, null, null, false);
        if (!dialog.showAndGet()) {
            return;
        }
        if (edit) {
            // Defense in depth for #538, mirroring applyHexEdit's own empty-value guard: OK is
            // disabled until the first preview resolves, so hex should never still be empty here.
            String hex = dialog.getHexDigits();
            if (hex == null || hex.isEmpty()) {
                return;
            }
            SetoptsEdit ed = decoded.edit;
            StaleEditGuard guard = new StaleEditGuard(
                    documentViewOf(editor),
                    body -> WriteCommandAction.runWriteCommandAction(project, "Configure SETOPTS", null, body),
                    ComposerLauncher::onEdt,
                    notice -> ComposerNoticeRenderer.render(project, notice, () -> launch(project, editor, Kind.SETOPTS)),
                    StaleEditGuard.REDECODE_TIMEOUT_MILLIS);
            guard.applyIfUnchanged(labelOf(Kind.SETOPTS), line, col, decoded,
                    (currentLineText, currentCol) -> server.setoptsDecodeCall(new SetoptsDecodeCallParams(currentLineText)),
                    DecodeEquality::sameSetopts,
                    () -> {
                        int start;
                        int end;
                        String replacement;
                        if (ed.hexRange != null) {
                            start = ed.hexRange[0];
                            end = ed.hexRange[1];
                            replacement = hex;
                        } else if (ed.insertOffset != null) {
                            start = ed.insertOffset;
                            end = ed.insertOffset;
                            replacement = " " + hex;
                        } else {
                            return;
                        }
                        int ls = editor.getDocument().getLineStartOffset(line);
                        editor.getDocument().replaceString(ls + start, ls + end, replacement);
                    });
        } else {
            insertAt(project, editor, dialog.getLine() + "\n", "Compose SETOPTS", true);
        }
    }

    /**
     * Opens the SETOPTS-in-code composer (#475, DISC-06): routes a decoded shape to the right
     * dialog and the right guarded write, based on the server's own {@code mode}/{@code editable}
     * verdict -- an absolute literal to the existing two-state {@link SetoptsComposerDialog}, a
     * safe chain or compose-new to the new {@link SetoptsTriStateComposerDialog}, and a
     * {@code found && !editable} result to no dialog at all, just the server's own reason. Never
     * constructs an edit from a decode result the server marked not editable.
     */
    private static void openSetoptsInCode(Project project, Editor editor, BbjComposerServer server,
                                          SetoptsCatalogs catalogs, SetoptsInCodeDecodeResult decoded,
                                          int line, int col, String uri) {
        if (catalogs == null) {
            ComposerNoticeRenderer.render(project, ComposerNotices.notReady(labelOf(Kind.SETOPTS_IN_CODE)), null);
            return;
        }
        if (decoded == null || !decoded.found) {
            openSetoptsInCodeComposeNew(project, editor, server, catalogs);
            return;
        }
        if (!decoded.editable) {
            String reason = decoded.reason != null
                    ? decoded.reason
                    : "This SETOPTS shape cannot be safely edited in place.";
            ComposerNoticeRenderer.render(project, ComposerNotices.requestFailed(labelOf(Kind.SETOPTS_IN_CODE), reason), null);
            return;
        }
        if ("absolute".equals(decoded.mode)) {
            openSetoptsInCodeAbsolute(project, editor, server, catalogs, decoded, line, col, uri);
        } else {
            openSetoptsInCodeChain(project, editor, server, catalogs, decoded, line, col, uri);
        }
    }

    /** Compose-new: a blank tri-state dialog whose composed block is inserted at the caret's line start. */
    private static void openSetoptsInCodeComposeNew(Project project, Editor editor, BbjComposerServer server,
                                                     SetoptsCatalogs catalogs) {
        SetoptsTriStateComposerDialog dialog =
                new SetoptsTriStateComposerDialog(project, server, catalogs, null, null, null, "block", false);
        if (!dialog.showAndGet()) {
            return;
        }
        String text = dialog.getBlockText();
        if (text == null || text.isEmpty()) {
            return;
        }
        insertAt(project, editor, ensureTrailingNewline(text), "Compose SETOPTS block", true);
    }

    /** Edit-in-place on an absolute {@code SETOPTS <literal>} statement, via the existing two-state dialog. */
    private static void openSetoptsInCodeAbsolute(Project project, Editor editor, BbjComposerServer server,
                                                   SetoptsCatalogs catalogs, SetoptsInCodeDecodeResult decoded,
                                                   int line, int col, String uri) {
        SetoptsInCodeAbsoluteEdit ed = decoded.absolute;
        if (ed == null) {
            return;
        }
        SetoptsComposerDialog dialog = new SetoptsComposerDialog(project, server, catalogs, null, ed.hexDigits, true);
        if (!dialog.showAndGet()) {
            return;
        }
        // Defense in depth for #538, mirroring openSetopts's own empty-value guard: OK is disabled
        // until the first preview resolves, so hex should never still be empty here.
        String hex = dialog.getHexDigits();
        if (hex == null || hex.isEmpty()) {
            return;
        }
        StaleEditGuard guard = new StaleEditGuard(
                documentViewOf(editor),
                body -> WriteCommandAction.runWriteCommandAction(project, "Configure SETOPTS", null, body),
                ComposerLauncher::onEdt,
                notice -> ComposerNoticeRenderer.render(project, notice, () -> launch(project, editor, Kind.SETOPTS_IN_CODE)),
                StaleEditGuard.REDECODE_TIMEOUT_MILLIS);
        guard.applyIfUnchanged(labelOf(Kind.SETOPTS_IN_CODE), line, col, decoded,
                (currentLineText, currentCol) -> server.setoptsDecodeInCode(new SetoptsInCodeDecodeParams(uri, line, currentCol)),
                DecodeEquality::sameSetoptsInCode,
                () -> {
                    Document doc = editor.getDocument();
                    int ls = doc.getLineStartOffset(ed.line);
                    doc.replaceString(ls + ed.hexRange[0], ls + ed.hexRange[1], hex);
                });
    }

    /**
     * Edit-in-place on a safe {@code var$=OPTS … SETOPTS var$} chain, via the new tri-state
     * dialog: replaces only the reassignment region {@code [startLine, endLine)}, never the
     * user's {@code OPTS} origin or {@code SETOPTS} lines. An equal-line region ({@code
     * startLine == endLine}) is naturally an insertion, since {@code replaceString(x, x, text)}
     * behaves identically to an insert at {@code x}.
     */
    private static void openSetoptsInCodeChain(Project project, Editor editor, BbjComposerServer server,
                                               SetoptsCatalogs catalogs, SetoptsInCodeDecodeResult decoded,
                                               int line, int col, String uri) {
        SetoptsInCodeChainEdit chain = decoded.chain;
        if (chain == null) {
            return;
        }
        SetoptsTriStateComposerDialog dialog = new SetoptsTriStateComposerDialog(
                project, server, catalogs, decoded.initial, chain.variableName, chain.indent, "reassignments", true);
        if (!dialog.showAndGet()) {
            return;
        }
        String text = dialog.getBlockText();
        if (text == null) {
            return;
        }
        StaleEditGuard guard = new StaleEditGuard(
                documentViewOf(editor),
                body -> WriteCommandAction.runWriteCommandAction(project, "Configure SETOPTS block", null, body),
                ComposerLauncher::onEdt,
                notice -> ComposerNoticeRenderer.render(project, notice, () -> launch(project, editor, Kind.SETOPTS_IN_CODE)),
                StaleEditGuard.REDECODE_TIMEOUT_MILLIS);
        guard.applyIfUnchanged(labelOf(Kind.SETOPTS_IN_CODE), line, col, decoded,
                (currentLineText, currentCol) -> server.setoptsDecodeInCode(new SetoptsInCodeDecodeParams(uri, line, currentCol)),
                DecodeEquality::sameSetoptsInCode,
                () -> {
                    Document doc = editor.getDocument();
                    int startOffset = doc.getLineStartOffset(chain.startLine);
                    int endOffset = doc.getLineStartOffset(chain.endLine);
                    String replacement = text.isEmpty() ? "" : ensureTrailingNewline(text);
                    doc.replaceString(startOffset, endOffset, replacement);
                });
    }

    /** Appends a trailing newline when absent, so a following line is never joined onto the inserted/replaced text. */
    private static String ensureTrailingNewline(String text) {
        return text.endsWith("\n") ? text : text + "\n";
    }

    /**
     * Inserts {@code text} either at the caret ({@code atLineStart == false}, the create-path
     * behaviour every other composer already uses) or at the start of the caret's line ({@code
     * atLineStart == true}, SETOPTS's compose-new path) -- a mid-line insertion of a composed
     * whole line would split whatever line the user right-clicked, which is exactly the corruption
     * this method must never cause for SETOPTS.
     */
    private static void insertAt(Project project, Editor editor, String text, String command, boolean atLineStart) {
        if (text == null || text.isEmpty()) {
            return;
        }
        WriteCommandAction.runWriteCommandAction(project, command, null, () -> {
            Document doc = editor.getDocument();
            int caret = editor.getCaretModel().getOffset();
            int offset = atLineStart ? doc.getLineStartOffset(doc.getLineNumber(caret)) : caret;
            doc.insertString(offset, text);
            editor.getCaretModel().moveToOffset(offset + text.length());
        });
    }

    private static void insertAtCaret(Project project, Editor editor, String text, String command) {
        insertAt(project, editor, text, command, false);
    }

    private static void onEdt(Runnable runnable) {
        ApplicationManager.getApplication().invokeLater(runnable, ModalityState.defaultModalityState());
    }

    private record Op(int start, int end, String text) {}
}
