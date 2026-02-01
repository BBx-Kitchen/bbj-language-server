package com.basis.bbj.intellij.ui;

import com.intellij.execution.ui.ConsoleView;
import com.intellij.execution.ui.ConsoleViewContentType;
import com.intellij.openapi.project.DumbAware;
import com.intellij.openapi.project.Project;
import com.intellij.openapi.util.Disposer;
import com.intellij.openapi.wm.ToolWindow;
import com.intellij.openapi.wm.ToolWindowFactory;
import com.intellij.ui.content.Content;
import com.intellij.ui.content.ContentFactory;
import org.jetbrains.annotations.NotNull;

/**
 * Tool window factory for the BBj Language Server log output.
 * Creates a console view that displays real-time server stdout/stderr.
 */
public final class BbjServerLogToolWindowFactory implements ToolWindowFactory, DumbAware {

    @Override
    public void createToolWindowContent(@NotNull Project project, @NotNull ToolWindow toolWindow) {
        // Create console view for log output using TextConsoleBuilderFactory
        ConsoleView console = com.intellij.execution.filters.TextConsoleBuilderFactory.getInstance()
            .createBuilder(project)
            .getConsole();

        // Create content with the console component
        ContentFactory contentFactory = ContentFactory.getInstance();
        Content content = contentFactory.createContent(console.getComponent(), "Log", false);
        toolWindow.getContentManager().addContent(content);

        // Register the console with BbjServerService so it can write to it
        BbjServerService service = BbjServerService.getInstance(project);
        service.setConsoleView(console);

        // Register console as disposable with the tool window
        Disposer.register(toolWindow.getDisposable(), console);

        // Write initial message
        service.logToConsole("BBj Language Server log initialized", ConsoleViewContentType.SYSTEM_OUTPUT);
    }

    @Override
    public boolean shouldBeAvailable(@NotNull Project project) {
        return true;
    }
}
