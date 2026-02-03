package com.basis.bbj.intellij;

import com.intellij.extapi.psi.PsiFileBase;
import com.intellij.openapi.fileTypes.FileType;
import com.intellij.psi.FileViewProvider;
import org.jetbrains.annotations.NotNull;

/**
 * PSI file implementation for BBj source files.
 */
public final class BbjFile extends PsiFileBase {

    public BbjFile(@NotNull FileViewProvider viewProvider) {
        super(viewProvider, BbjLanguage.INSTANCE);
    }

    @Override
    public @NotNull FileType getFileType() {
        return BbjFileType.INSTANCE;
    }
}
