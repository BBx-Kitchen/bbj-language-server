package com.basis.bbj.intellij.ui;

import com.intellij.openapi.vfs.VirtualFile;
import org.jetbrains.annotations.NotNull;
import org.jetbrains.annotations.Nullable;

import java.util.List;

/**
 * Shared decision for whether the BBj status-bar widgets should be visible: visibility follows
 * the selected files' resolved file type, never their extension. This matters because {@code
 * BbjConfigFileTypeOverrider} gives the active (or default-named) config file its own file type
 * whatever its name, so an extension check containing "bbx" would wrongly count {@code
 * config.bbx} as a BBj program; and {@code .bbl} carries no BBj file type at all, so it must not
 * show the widgets either (#610).
 */
public final class BbjFileVisibility {

    static final String BBJ_FILE_TYPE_NAME = "BBj";

    private BbjFileVisibility() {
    }

    /**
     * Public so the notification base in the parent package ({@code com.basis.bbj.intellij}) can
     * share one definition of "is this a BBj program file" across the editor notification
     * providers, rather than each provider deriving its own visibility check (#622). {@link
     * #showsForSelection} stays package-private -- it is only ever called from within {@code ui}.
     */
    public static boolean isBbjProgramFileTypeName(@Nullable String fileTypeName) {
        return BBJ_FILE_TYPE_NAME.equals(fileTypeName);
    }

    /**
     * Public so the {@code interop} package's poll-gate tests can feed the empty-selection edge
     * case into {@code InteropPollPolicy} without a {@code VirtualFile} (#593). {@link
     * #showsForSelection} stays package-private -- it is only ever called from within {@code ui}.
     */
    public static boolean showsForFileTypeNames(@NotNull List<String> fileTypeNames) {
        for (String fileTypeName : fileTypeNames) {
            if (isBbjProgramFileTypeName(fileTypeName)) {
                return true;
            }
        }
        return false;
    }

    static boolean showsForSelection(@NotNull VirtualFile[] selectedFiles) {
        for (VirtualFile file : selectedFiles) {
            if (isBbjProgramFileTypeName(file.getFileType().getName())) {
                return true;
            }
        }
        return false;
    }
}
