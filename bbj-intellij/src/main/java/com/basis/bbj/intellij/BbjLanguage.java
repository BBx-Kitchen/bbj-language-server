package com.basis.bbj.intellij;

import com.intellij.lang.Language;

public class BbjLanguage extends Language {
    public static final BbjLanguage INSTANCE = new BbjLanguage();

    private BbjLanguage() {
        super("BBj");
    }
}
