package com.basis.bbj.intellij.ui;

import com.intellij.openapi.project.Project;
import com.intellij.openapi.wm.StatusBar;
import com.intellij.openapi.wm.StatusBarWidget;
import com.intellij.openapi.wm.StatusBarWidgetFactory;
import org.jetbrains.annotations.NotNull;

/**
 * Shared base for the two status-bar widget factories, carrying the three byte-identical methods
 * ({@code isAvailable}, {@code disposeWidget}, {@code canBeEnabledOn}) and leaving {@code
 * getId()}, {@code getDisplayName()} and {@code createWidget(Project)} to each subclass.
 *
 * <p>These three remain abstract hooks rather than constructor parameters or a data-driven
 * registration: the IntelliJ {@code statusBarWidgetFactory} extension point instantiates by
 * {@code implementation=} through a no-arg constructor, so a constructor-parameterised factory
 * could not be registered there, and a data-driven shape would turn a mistyped id into a runtime
 * no-op instead of a compile error.
 */
public abstract class BbjStatusBarWidgetFactoryBase implements StatusBarWidgetFactory {

    @Override
    public boolean isAvailable(@NotNull Project project) {
        return true;
    }

    @Override
    public void disposeWidget(@NotNull StatusBarWidget widget) {
        // Widget disposal handled automatically
    }

    @Override
    public boolean canBeEnabledOn(@NotNull StatusBar statusBar) {
        return true;
    }
}
