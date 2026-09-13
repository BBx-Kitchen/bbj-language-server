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
final class BbjFileVisibility {

    static final String BBJ_FILE_TYPE_NAME = "BBj";

    private BbjFileVisibility() {
    }

    static boolean isBbjProgramFileTypeName(@Nullable String fileTypeName) {
        return BBJ_FILE_TYPE_NAME.equals(fileTypeName);
    }

    static boolean showsForFileTypeNames(@NotNull List<String> fileTypeNames) {
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
