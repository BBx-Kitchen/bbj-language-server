package com.basis.bbj.intellij.actions;

import com.intellij.notification.NotificationGroupManager;
import com.intellij.notification.NotificationType;
import com.intellij.openapi.actionSystem.AnAction;
import com.intellij.openapi.actionSystem.AnActionEvent;
import com.intellij.openapi.actionSystem.CommonDataKeys;
import com.intellij.openapi.application.ApplicationManager;
import com.intellij.openapi.project.Project;
import com.intellij.openapi.vfs.VirtualFile;
import com.redhat.devtools.lsp4ij.LanguageServerItem;
import com.redhat.devtools.lsp4ij.LanguageServersRegistry;
import org.eclipse.lsp4j.services.LanguageServer;
import org.jetbrains.annotations.NotNull;

import java.util.concurrent.CompletableFuture;

/**
 * Tools menu action to refresh Java classes cache in the BBj language server.
 * Sends a custom LSP request to clear all cached Java class data and reload classpath.
 */
public final class BbjRefreshJavaClassesAction extends AnAction {

    public BbjRefreshJavaClassesAction() {
        super("Refresh Java Classes", "Reload Java classpath and clear cached class information", null);
    }

    @Override
    public void actionPerformed(@NotNull AnActionEvent e) {
        Project project = e.getProject();
        if (project == null) {
            return;
        }

        // Execute the refresh command on the BBj language server
        ApplicationManager.getApplication().executeOnPooledThread(() -> {
            try {
                // Get the BBj language server
                LanguageServersRegistry.getInstance()
                    .getLanguageServers(project)
                    .forEach(serverDefinition -> {
                        if ("bbjLanguageServer".equals(serverDefinition.getId())) {
                            // Get all server instances for this definition
                            for (LanguageServerItem serverItem : serverDefinition.getServerWrappers()) {
                                CompletableFuture<Boolean> future = serverItem.getServer()
                                    .thenCompose(server -> {
                                        if (server != null) {
                                            // Send the custom bbj/refreshJavaClasses request using the generic request method
                                            // This uses the LanguageServer's request() method which allows custom requests
                                            return server.request("bbj/refreshJavaClasses", null)
                                                .thenApply(result -> {
                                                    // The server returns a boolean
                                                    return result instanceof Boolean ? (Boolean) result : false;
                                                });
                                        }
                                        return CompletableFuture.completedFuture(false);
                                    });

                                future.whenComplete((success, ex) -> {
                                    if (ex != null) {
                                        ApplicationManager.getApplication().invokeLater(() -> {
                                            NotificationGroupManager.getInstance()
                                                .getNotificationGroup("BBj Language Server")
                                                .createNotification(
                                                    "Failed to refresh Java classes",
                                                    ex.getMessage(),
                                                    NotificationType.ERROR
                                                )
                                                .notify(project);
                                        });
                                    } else if (success != null && success) {
                                        // Success notification is already sent by the language server
                                        // via connection.window.showInformationMessage
                                    }
                                });
                            }
                        }
                    });
            } catch (Exception ex) {
                ApplicationManager.getApplication().invokeLater(() -> {
                    NotificationGroupManager.getInstance()
                        .getNotificationGroup("BBj Language Server")
                        .createNotification(
                            "Error refreshing Java classes",
                            ex.getMessage(),
                            NotificationType.ERROR
                        )
                        .notify(project);
                });
            }
        });
    }

    @Override
    public void update(@NotNull AnActionEvent e) {
        Project project = e.getProject();
        VirtualFile file = e.getData(CommonDataKeys.VIRTUAL_FILE);

        boolean isBbjFile = false;
        if (file != null) {
            String ext = file.getExtension();
            isBbjFile = ext != null && (ext.equals("bbj") || ext.equals("bbl") || ext.equals("bbjt") || ext.equals("src"));
        }

        e.getPresentation().setEnabledAndVisible(project != null && isBbjFile);
    }
}


