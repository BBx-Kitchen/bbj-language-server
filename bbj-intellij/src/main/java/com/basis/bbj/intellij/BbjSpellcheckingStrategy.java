package com.basis.bbj.intellij;

import com.intellij.spellchecker.BundledDictionaryProvider;

/**
 * Provides a bundled dictionary of BBj keywords to IntelliJ's spell checker.
 * BBj keywords like "classend", "methodend" etc. are not English words
 * and would otherwise be flagged as typos.
 */
public final class BbjSpellcheckingStrategy implements BundledDictionaryProvider {

    @Override
    public String[] getBundledDictionaries() {
        return new String[]{"/dictionaries/bbj.dic"};
    }
}
