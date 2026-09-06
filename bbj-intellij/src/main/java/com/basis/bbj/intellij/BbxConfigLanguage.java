package com.basis.bbj.intellij;

import com.intellij.lang.Language;

/**
 * A distinct {@link Language} for BBj configuration files. It must never be reused as (or merged
 * with) {@link BbjLanguage}: the LSP4IJ language mapping is keyed on the BBj language, so mapping
 * this language too would send configuration files to the language server.
 */
public final class BbxConfigLanguage extends Language {
    public static final BbxConfigLanguage INSTANCE = new BbxConfigLanguage();

    private BbxConfigLanguage() {
        super("BBx Config");
    }
}
