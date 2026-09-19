package com.basis.bbj.intellij.ui;

import com.intellij.openapi.project.Project;
import com.intellij.openapi.wm.StatusBarWidget;
import org.jetbrains.annotations.Nls;
import org.jetbrains.annotations.NotNull;

/**
 * Factory for creating the BBj language server status bar widget.
 */
public final class BbjStatusBarWidgetFactory extends BbjStatusBarWidgetFactoryBase {

    @Override
    public @NotNull String getId() {
        return "BbjLanguageServerStatus";
    }

    @Override
    public @Nls @NotNull String getDisplayName() {
        return "BBj Language Server";
    }

    @Override
    public @NotNull StatusBarWidget createWidget(@NotNull Project project) {
        return new BbjStatusBarWidget(project);
    }
}
