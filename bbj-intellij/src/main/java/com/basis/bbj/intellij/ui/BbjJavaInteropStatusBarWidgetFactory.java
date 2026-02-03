package com.basis.bbj.intellij.ui;

import com.intellij.openapi.project.Project;
import com.intellij.openapi.wm.StatusBarWidget;
import com.intellij.openapi.wm.StatusBarWidgetFactory;
import org.jetbrains.annotations.Nls;
import org.jetbrains.annotations.NotNull;

/**
 * Factory for creating the BBj java-interop status bar widget.
 */
public final class BbjJavaInteropStatusBarWidgetFactory implements StatusBarWidgetFactory {

    @Override
    public @NotNull String getId() {
        return "BbjJavaInteropStatus";
    }

    @Override
    public @Nls @NotNull String getDisplayName() {
        return "BBj Java Interop Status";
    }

    @Override
    public boolean isAvailable(@NotNull Project project) {
        return true;
    }

    @Override
    public @NotNull StatusBarWidget createWidget(@NotNull Project project) {
        return new BbjJavaInteropStatusBarWidget(project);
    }

    @Override
    public void disposeWidget(@NotNull StatusBarWidget widget) {
        // Widget disposal handled automatically
    }

    @Override
    public boolean canBeEnabledOn(@NotNull com.intellij.openapi.wm.StatusBar statusBar) {
        return true;
    }
}
