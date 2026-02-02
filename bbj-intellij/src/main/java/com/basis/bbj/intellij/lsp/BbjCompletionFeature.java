package com.basis.bbj.intellij.lsp;

import com.intellij.icons.AllIcons;
import org.eclipse.lsp4j.CompletionItem;
import org.eclipse.lsp4j.CompletionItemKind;
import org.jetbrains.annotations.Nullable;

import javax.swing.Icon;

/**
 * Utility for mapping LSP completion item kinds to IntelliJ platform icons.
 * Uses AllIcons.Nodes for native look and feel consistent with other languages.
 * Distinguishes Java-interop completions by detail field heuristic.
 *
 * TODO: Wire into LSP4IJ completion pipeline when LSPCompletionFeature API becomes available.
 */
public final class BbjCompletionFeature {

    private BbjCompletionFeature() {
    }

    /**
     * Maps a completion item to an appropriate platform icon.
     * Distinguishes Java class/method completions from BBj completions.
     *
     * @param item the LSP completion item
     * @return icon for the item, or null for default LSP4IJ handling
     */
    public static @Nullable Icon getIcon(@Nullable CompletionItem item) {
        if (item == null || item.getKind() == null) {
            return null;
        }

        CompletionItemKind kind = item.getKind();
        boolean isJavaInterop = isJavaInteropCompletion(item);

        // Java-interop completions get Java-specific icons
        if (isJavaInterop) {
            switch (kind) {
                case Class:
                    return AllIcons.Nodes.Class;
                case Interface:
                    return AllIcons.Nodes.Interface;
                case Method:
                    return AllIcons.Nodes.Method;
                case Field:
                    return AllIcons.Nodes.Field;
                default:
                    return null;
            }
        }

        // BBj completions use platform icons
        switch (kind) {
            case Function:
            case Method:
                return AllIcons.Nodes.Method;
            case Class:
                return AllIcons.Nodes.Class;
            case Interface:
                return AllIcons.Nodes.Interface;
            case Variable:
            case Field:
                return AllIcons.Nodes.Field;
            case Property:
                return AllIcons.Nodes.Property;
            case Keyword:
                return AllIcons.Nodes.Static; // Static marker for keywords
            case Event:
                return AllIcons.Nodes.Lambda;
            case Module:
                return AllIcons.Nodes.Package;
            case Constant:
                return AllIcons.Nodes.Constant;
            case Enum:
                return AllIcons.Nodes.Enum;
            case EnumMember:
                return AllIcons.Nodes.Field;
            default:
                return null; // Use LSP4IJ default
        }
    }

    /**
     * Heuristic to detect Java-interop completions from BBj language server.
     * The java-interop service provides completions with detail field containing
     * Java package/class information (e.g., "java.lang.String", "java.util.List").
     *
     * @param item the completion item
     * @return true if this appears to be a Java class/method completion
     */
    private static boolean isJavaInteropCompletion(@Nullable CompletionItem item) {
        if (item == null || item.getDetail() == null) {
            return false;
        }

        String detail = item.getDetail();
        // Java-interop completions typically have detail starting with "java." or containing fully-qualified class names
        return detail.startsWith("java.") ||
               detail.startsWith("javax.") ||
               detail.startsWith("com.") ||
               detail.startsWith("org.") ||
               detail.matches(".*\\.[A-Z][a-zA-Z0-9]*$"); // Ends with capitalized class name
    }
}
