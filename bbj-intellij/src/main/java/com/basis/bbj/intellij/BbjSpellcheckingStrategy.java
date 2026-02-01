package com.basis.bbj.intellij;

import com.intellij.psi.PsiElement;
import com.intellij.spellchecker.tokenizer.SpellcheckingStrategy;
import com.intellij.spellchecker.tokenizer.Tokenizer;
import org.jetbrains.annotations.NotNull;

/**
 * Suppresses IntelliJ's spell checker for BBj files.
 * BBj keywords like "classend", "methodend" etc. are not English words
 * and would otherwise be flagged as typos. The LSP server handles all
 * real diagnostics.
 */
public final class BbjSpellcheckingStrategy extends SpellcheckingStrategy {

    @Override
    public @NotNull Tokenizer<?> getTokenizer(PsiElement element) {
        return EMPTY_TOKENIZER;
    }
}
