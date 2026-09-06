package com.basis.bbj.intellij;

import com.intellij.openapi.fileTypes.LanguageFileType;
import org.jetbrains.annotations.NotNull;
import javax.swing.Icon;

/**
 * The plugin-owned file type for BBj configuration files. It carries no parser definition --
 * configuration files are not parsed as BBj source -- and is registered over {@link
 * BbxConfigLanguage}, never {@link BbjLanguage}, so it stays out of the language server.
 */
public final class BbjConfigFileType extends LanguageFileType {
    public static final BbjConfigFileType INSTANCE = new BbjConfigFileType();

    private BbjConfigFileType() {
        super(BbxConfigLanguage.INSTANCE);
    }

    @NotNull
    @Override
    public String getName() {
        return "BBx Config";
    }

    @NotNull
    @Override
    public String getDescription() {
        return "BBj configuration file";
    }

    @NotNull
    @Override
    public String getDefaultExtension() {
        return "bbx";
    }

    @Override
    public Icon getIcon() {
        return BbjIcons.CONFIG_FILE;
    }
}
