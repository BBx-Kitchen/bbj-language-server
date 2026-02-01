package com.basis.bbj.intellij.lsp;

import com.basis.bbj.intellij.BbjIcons;
import org.eclipse.lsp4j.CompletionItemKind;
import org.jetbrains.annotations.Nullable;

import javax.swing.Icon;

/**
 * Utility for mapping LSP completion item kinds to BBj-specific icons.
 * Used by LSP4IJ to display custom icons in completion popups.
 */
public final class BbjCompletionFeature {

    private BbjCompletionFeature() {
    }

    /**
     * Maps a completion item kind to a BBj-specific icon.
     *
     * @param kind the LSP completion item kind
     * @return icon for the kind, or null for default LSP4IJ handling
     */
    public static @Nullable Icon getIcon(@Nullable CompletionItemKind kind) {
        if (kind == null) {
            return null;
        }

        switch (kind) {
            case Function:
            case Method:
                return BbjIcons.FUNCTION;
            case Variable:
            case Field:
                return BbjIcons.VARIABLE;
            case Keyword:
                return BbjIcons.KEYWORD;
            default:
                return null;
        }
    }
}
