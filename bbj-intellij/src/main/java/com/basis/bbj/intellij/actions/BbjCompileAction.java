package com.basis.bbj.intellij.actions;

import com.basis.bbj.intellij.BbjIcons;
import com.basis.bbj.intellij.ui.BbjServerService;
import com.intellij.openapi.actionSystem.ActionUpdateThread;
import com.intellij.openapi.actionSystem.AnAction;
import com.intellij.openapi.actionSystem.AnActionEvent;
import com.intellij.openapi.actionSystem.CommonDataKeys;
import com.intellij.openapi.project.Project;
import com.intellij.openapi.vfs.VirtualFile;
import org.jetbrains.annotations.NotNull;

/**
 * Action to compile the current BBj file.
 * Only visible when a BBj source file (.bbj, .bbx, .src) is open and language server is ready.
 * Excludes .bbl files (library files, not user source code per Phase 41 requirements).
 */
public final class BbjCompileAction extends AnAction {

    public BbjCompileAction() {
        super("Compile BBj File", "Compile the current BBj file", BbjIcons.COMPILE);
    }

    @Override
    public void actionPerformed(@NotNull AnActionEvent e) {
        Project project = e.getProject();
        VirtualFile file = e.getData(CommonDataKeys.VIRTUAL_FILE);

        if (project == null || file == null) {
            return;
        }

        // Send compile command to language server via custom notification
        BbjServerService service = BbjServerService.getInstance(project);
        // TODO: Implement language server custom notification for bbj.compile command
        // For now, log that compile was triggered
        service.logToConsole("[Compile] Triggered for file: " + file.getName(),
            com.intellij.execution.ui.ConsoleViewContentType.SYSTEM_OUTPUT);
    }

    @Override
    public void update(@NotNull AnActionEvent e) {
        Project project = e.getProject();
        VirtualFile file = e.getData(CommonDataKeys.VIRTUAL_FILE);

        // Check if current file is a BBj source file
        boolean isBbjFile = false;
        if (file != null) {
            String ext = file.getExtension();
            // Exclude .bbl (library files) per Phase 41 requirements
            // Only include .bbj, .bbx, .src (user source files)
            isBbjFile = ext != null && (ext.equals("bbj") || ext.equals("bbx") || ext.equals("src"));
        }

        // Check if language server is ready
        boolean serverReady = false;
        if (project != null && isBbjFile) {
            BbjServerService service = BbjServerService.getInstance(project);
            com.redhat.devtools.lsp4ij.ServerStatus status = service.getCurrentStatus();
            serverReady = status == com.redhat.devtools.lsp4ij.ServerStatus.started;
        }

        // Only show action when project exists, file is a BBj source file, and server is ready
        e.getPresentation().setEnabledAndVisible(project != null && isBbjFile && serverReady);
    }

    @Override
    public @NotNull ActionUpdateThread getActionUpdateThread() {
        return ActionUpdateThread.BGT;
    }
}
