package com.basis.bbj.intellij.lsp;

import com.intellij.icons.AllIcons;
import com.redhat.devtools.lsp4ij.client.features.LSPCompletionFeature;
import org.eclipse.lsp4j.CompletionItem;
import org.eclipse.lsp4j.CompletionItemKind;
import org.jetbrains.annotations.NotNull;
import org.jetbrains.annotations.Nullable;

import javax.swing.Icon;

/**
 * Maps LSP CompletionItemKind to IntelliJ platform icons.
 * Distinguishes Java-interop completions from BBj completions
 * by inspecting the completion item's detail field.
 *
 * Uses native platform icons for consistency with other languages.
 */
public class BbjCompletionFeature extends LSPCompletionFeature {

    @Override
    public @Nullable Icon getIcon(@NotNull CompletionItem item) {
        if (item.getKind() == null) {
            return super.getIcon(item);
        }

        CompletionItemKind kind = item.getKind();
        boolean isJavaInterop = isJavaInteropCompletion(item);

        if (isJavaInterop) {
            return switch (kind) {
                case Class -> AllIcons.Nodes.AbstractClass;
                case Interface -> AllIcons.Nodes.Interface;
                case Method, Function -> AllIcons.Nodes.AbstractMethod;
                case Field -> AllIcons.Nodes.Field;
                default -> super.getIcon(item);
            };
        }

        return switch (kind) {
            case Function, Method -> AllIcons.Nodes.Method;
            case Class -> AllIcons.Nodes.Class;
            case Interface -> AllIcons.Nodes.Interface;
            case Variable -> AllIcons.Nodes.Variable;
            case Field -> AllIcons.Nodes.Field;
            case Property -> AllIcons.Nodes.Property;
            case Keyword -> AllIcons.Nodes.Tag;
            case Constant -> AllIcons.Nodes.Constant;
            case Enum -> AllIcons.Nodes.Enum;
            case EnumMember -> AllIcons.Nodes.Field;
            case Module -> AllIcons.Nodes.Package;
            case Snippet -> AllIcons.Nodes.Template;
            case Event -> AllIcons.Nodes.Lambda;
            default -> super.getIcon(item);
        };
    }

    /**
     * Heuristic to detect Java-interop completions from BBj language server.
     * Java-interop completions have detail fields containing Java package/class info.
     */
    private static boolean isJavaInteropCompletion(@NotNull CompletionItem item) {
        String detail = item.getDetail();
        if (detail == null || detail.isEmpty()) {
            return false;
        }

        CompletionItemKind kind = item.getKind();
        if (kind != CompletionItemKind.Function && kind != CompletionItemKind.Method
                && kind != CompletionItemKind.Class && kind != CompletionItemKind.Interface) {
            return false;
        }

        return detail.contains("java.") || detail.contains("javax.")
                || detail.contains("com.basis.") || detail.contains("throws ");
    }
}
