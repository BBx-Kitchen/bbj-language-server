package com.basis.bbj.intellij.composer;

import com.basis.bbj.intellij.composer.ComposerModels.AddWindowCatalogs;
import com.basis.bbj.intellij.composer.ComposerModels.AddWindowDecodeResult;
import com.basis.bbj.intellij.composer.ComposerModels.AddWindowEdit;
import com.basis.bbj.intellij.composer.ComposerModels.DecodeCallParams;
import com.basis.bbj.intellij.composer.ComposerModels.MsgboxCatalogs;
import com.basis.bbj.intellij.composer.ComposerModels.MsgboxDecodeResult;
import com.basis.bbj.intellij.composer.ComposerModels.MsgboxEdit;
import com.intellij.openapi.application.ApplicationManager;
import com.intellij.openapi.application.ModalityState;
import com.intellij.openapi.command.WriteCommandAction;
import com.intellij.openapi.editor.Document;
import com.intellij.openapi.editor.Editor;
import com.intellij.openapi.project.Project;
import com.intellij.openapi.ui.Messages;
import com.intellij.openapi.util.TextRange;
import org.jetbrains.annotations.NotNull;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

/**
 * Shared entry point for both composer UIs (#430/#433). Captures the caret context, asks the
 * language server to decode the call the caret is inside (the {@code decodeCall} requests), and
 * opens the dialog either prefilled for edit-in-place (replacing the call/tokens) or blank for
 * create (inserting at the caret). Used by the editor-popup actions and the lightbulb intentions,
 * so both are position-aware with identical behaviour.
 */
public final class ComposerLauncher {

    public enum Kind { MSGBOX, ADDWINDOW }

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

    public static void launch(@NotNull Project project, @NotNull Editor editor, @NotNull Kind kind) {
        // Capture the caret's line/column on the EDT before going async.
        Document doc = editor.getDocument();
        int caret = editor.getCaretModel().getOffset();
        int line = doc.getLineNumber(caret);
        int lineStart = doc.getLineStartOffset(line);
        String lineText = doc.getText(new TextRange(lineStart, doc.getLineEndOffset(line)));
        int col = caret - lineStart;

        BbjComposerService.server(project).thenAccept(server -> {
            if (server == null) {
                notifyNotReady(project, kind);
                return;
            }
            server.composerCatalogs().thenAccept(catalogs -> {
                if (catalogs == null) {
                    notifyNotReady(project, kind);
                    return;
                }
                if (kind == Kind.MSGBOX) {
                    server.msgboxDecodeCall(new DecodeCallParams(lineText, col)).thenAccept(decoded ->
                            onEdt(() -> openMsgbox(project, editor, server, catalogs.msgbox, decoded, line)));
                } else {
                    server.addWindowDecodeCall(new DecodeCallParams(lineText, col)).thenAccept(decoded ->
                            onEdt(() -> openAddWindow(project, editor, server, catalogs.addwindow, decoded, line)));
                }
            });
        });
    }

    private static void openMsgbox(Project project, Editor editor, BbjComposerServer server,
                                   MsgboxCatalogs catalogs, MsgboxDecodeResult decoded, int line) {
        if (catalogs == null) {
            notifyNotReady(project, Kind.MSGBOX);
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
            WriteCommandAction.runWriteCommandAction(project, "Configure MSGBOX", null, () -> {
                int ls = editor.getDocument().getLineStartOffset(line);
                editor.getDocument().replaceString(ls + ed.callStart, ls + ed.callEnd, text);
            });
        } else {
            insertAtCaret(project, editor, text, "Compose MSGBOX");
        }
    }

    private static void openAddWindow(Project project, Editor editor, BbjComposerServer server,
                                      AddWindowCatalogs catalogs, AddWindowDecodeResult decoded, int line) {
        if (catalogs == null) {
            notifyNotReady(project, Kind.ADDWINDOW);
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
            applyAddWindowEdit(project, editor, line, decoded.edit, dialog);
        } else {
            insertAtCaret(project, editor, dialog.getStatement(), "Compose addWindow");
        }
    }

    /** Rewrite the flags (and, if enabled, event_mask) hex tokens in place, right-to-left. */
    private static void applyAddWindowEdit(Project project, Editor editor, int line, AddWindowEdit ed, AddWindowComposerDialog dialog) {
        WriteCommandAction.runWriteCommandAction(project, "Configure window flags", null, () -> {
            Document doc = editor.getDocument();
            int ls = doc.getLineStartOffset(line);
            List<Op> ops = new ArrayList<>();
            if (ed.flagsRange != null) {
                ops.add(new Op(ls + ed.flagsRange[0], ls + ed.flagsRange[1], dialog.getFlagsHex()));
            } else if (ed.flagsInsertOffset != null) {
                ops.add(new Op(ls + ed.flagsInsertOffset, ls + ed.flagsInsertOffset, ", " + dialog.getFlagsHex()));
            }
            if (dialog.isEventEnabled() && dialog.getEventHex() != null) {
                if (ed.eventMaskRange != null) {
                    ops.add(new Op(ls + ed.eventMaskRange[0], ls + ed.eventMaskRange[1], dialog.getEventHex()));
                } else if (ed.eventMaskInsertOffset != null) {
                    ops.add(new Op(ls + ed.eventMaskInsertOffset, ls + ed.eventMaskInsertOffset, ", " + dialog.getEventHex()));
                }
            }
            // Apply from the highest offset down so earlier edits don't shift later ranges.
            ops.sort(Comparator.comparingInt((Op o) -> o.start).reversed());
            for (Op op : ops) {
                doc.replaceString(op.start, op.end, op.text);
            }
        });
    }

    private static void insertAtCaret(Project project, Editor editor, String text, String command) {
        if (text == null || text.isEmpty()) {
            return;
        }
        WriteCommandAction.runWriteCommandAction(project, command, null, () -> {
            int offset = editor.getCaretModel().getOffset();
            editor.getDocument().insertString(offset, text);
            editor.getCaretModel().moveToOffset(offset + text.length());
        });
    }

    private static void notifyNotReady(Project project, Kind kind) {
        String title = kind == Kind.MSGBOX ? "Compose MSGBOX" : "Compose addWindow";
        onEdt(() -> Messages.showInfoMessage(project,
                "The BBj language server is not ready yet. Open a BBj file and try again.", title));
    }

    private static void onEdt(Runnable runnable) {
        ApplicationManager.getApplication().invokeLater(runnable, ModalityState.defaultModalityState());
    }

    private record Op(int start, int end, String text) {}
}
