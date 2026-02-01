package com.basis.bbj.intellij.lsp;

import com.basis.bbj.intellij.BbjSettings;
import com.google.gson.JsonObject;
import com.intellij.openapi.project.Project;
import com.redhat.devtools.lsp4ij.ServerStatus;
import com.redhat.devtools.lsp4ij.client.LanguageClientImpl;
import org.jetbrains.annotations.NotNull;
import org.jetbrains.annotations.Nullable;

/**
 * BBj language client implementation.
 * Provides initialization options (BBj home, classpath) to the language server
 * and handles server status changes.
 */
public final class BbjLanguageClient extends LanguageClientImpl {

    public BbjLanguageClient(@NotNull Project project) {
        super(project);
    }

    @Override
    public @Nullable Object createSettings() {
        BbjSettings.State state = BbjSettings.getInstance().getState();
        JsonObject settings = new JsonObject();
        settings.addProperty("home", state.bbjHomePath);
        settings.addProperty("classpath", state.classpathEntry);
        return settings;
    }

    @Override
    public void handleServerStatusChanged(ServerStatus serverStatus) {
        super.handleServerStatusChanged(serverStatus);
        // Log status change (temporary - Plan 03 will replace with tool window logging)
        System.out.println("BBj LS status: " + serverStatus);
    }
}
