package com.basis.bbj.intellij;

import com.intellij.lang.Language;
import com.intellij.psi.codeStyle.CodeStyleSettingsCustomizable;
import com.intellij.psi.codeStyle.CommonCodeStyleSettings;
import com.intellij.psi.codeStyle.LanguageCodeStyleSettingsProvider;
import org.jetbrains.annotations.NotNull;

/**
 * Code style settings provider for BBj language.
 * Forces REM comments to be placed at column 0 (before indentation).
 */
public class BbjLanguageCodeStyleSettingsProvider extends LanguageCodeStyleSettingsProvider {

    @Override
    public @NotNull Language getLanguage() {
        return BbjLanguage.INSTANCE;
    }

    @Override
    protected void customizeDefaults(@NotNull CommonCodeStyleSettings commonSettings,
                                      @NotNull CommonCodeStyleSettings.IndentOptions indentOptions) {
        commonSettings.LINE_COMMENT_AT_FIRST_COLUMN = true;
        commonSettings.BLOCK_COMMENT_AT_FIRST_COLUMN = true;
    }

    @Override
    public String getCodeSample(@NotNull SettingsType settingsType) {
        return "REM Sample BBj code\nPRINT \"Hello World\"\n";
    }
}
