package com.basis.bbj.intellij;

import com.intellij.extapi.psi.ASTWrapperPsiElement;
import com.intellij.lang.ASTNode;
import org.jetbrains.annotations.NotNull;

/**
 * Generic PSI element wrapper for BBj tokens.
 */
public final class BbjPsiElement extends ASTWrapperPsiElement {

    public BbjPsiElement(@NotNull ASTNode node) {
        super(node);
    }
}
