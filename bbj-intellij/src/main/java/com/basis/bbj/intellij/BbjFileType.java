package com.basis.bbj.intellij;

import com.intellij.openapi.fileTypes.LanguageFileType;
import org.jetbrains.annotations.NotNull;
import javax.swing.Icon;

public final class BbjFileType extends LanguageFileType {
    public static final BbjFileType INSTANCE = new BbjFileType();

    private BbjFileType() {
        super(BbjLanguage.INSTANCE);
    }

    @NotNull
    @Override
    public String getName() {
        return "BBj";
    }

    @NotNull
    @Override
    public String getDescription() {
        return "BBj source file";
    }

    @NotNull
    @Override
    public String getDefaultExtension() {
        return "bbj";
    }

    @Override
    public Icon getIcon() {
        return BbjIcons.FILE;
    }
}
