package com.basis.bbj.intellij;

import com.intellij.openapi.fileTypes.LanguageFileType;
import org.jetbrains.annotations.NotNull;
import javax.swing.Icon;

public final class BbxConfigFileType extends LanguageFileType {
    public static final BbxConfigFileType INSTANCE = new BbxConfigFileType();

    private BbxConfigFileType() {
        super(BbjLanguage.INSTANCE);
    }

    @NotNull
    @Override
    public String getName() {
        return "BBx Config";
    }

    @NotNull
    @Override
    public String getDescription() {
        return "BBx configuration file";
    }

    @NotNull
    @Override
    public String getDefaultExtension() {
        return "bbx";
    }

    @Override
    public Icon getIcon() {
        return BbjIcons.CONFIG;
    }
}
