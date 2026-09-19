package com.basis.bbj.intellij.ui;

import com.intellij.openapi.project.Project;
import com.intellij.openapi.wm.StatusBarWidget;
import org.jetbrains.annotations.Nls;
import org.jetbrains.annotations.NotNull;

/**
 * Factory for creating the BBj java-interop status bar widget.
 */
public final class BbjJavaInteropStatusBarWidgetFactory extends BbjStatusBarWidgetFactoryBase {

    @Override
    public @NotNull String getId() {
        return "BbjJavaInteropStatus";
    }

    @Override
    public @Nls @NotNull String getDisplayName() {
        return "BBj Java Interop Status";
    }

    @Override
    public @NotNull StatusBarWidget createWidget(@NotNull Project project) {
        return new BbjJavaInteropStatusBarWidget(project);
    }
}
