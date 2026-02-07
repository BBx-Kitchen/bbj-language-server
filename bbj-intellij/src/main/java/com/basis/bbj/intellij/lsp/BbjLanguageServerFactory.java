package com.basis.bbj.intellij.lsp;

import com.basis.bbj.intellij.BbjSettings;
import com.google.gson.JsonObject;
import com.intellij.openapi.project.Project;
import com.intellij.psi.PsiFile;
import com.redhat.devtools.lsp4ij.LanguageServerFactory;
import com.redhat.devtools.lsp4ij.client.LanguageClientImpl;
import com.redhat.devtools.lsp4ij.client.features.LSPClientFeatures;
import com.redhat.devtools.lsp4ij.client.features.LSPDocumentLinkFeature;
import com.redhat.devtools.lsp4ij.server.StreamConnectionProvider;
import org.eclipse.lsp4j.InitializeParams;
import org.jetbrains.annotations.NotNull;

/**
 * Factory for creating BBj language server connections and client features.
 * Registered via plugin.xml extension point: com.redhat.devtools.lsp4ij.server
 */
public final class BbjLanguageServerFactory implements LanguageServerFactory {

    @Override
    public @NotNull StreamConnectionProvider createConnectionProvider(@NotNull Project project) {
        return new BbjLanguageServer(project);
    }

    @Override
    public @NotNull LanguageClientImpl createLanguageClient(@NotNull Project project) {
        return new BbjLanguageClient(project);
    }

    @Override
    public @NotNull LSPClientFeatures createClientFeatures() {
        return new LSPClientFeatures() {
            @Override
            public void initializeParams(@NotNull InitializeParams params) {
                super.initializeParams(params);
                BbjSettings.State state = BbjSettings.getInstance().getState();
                JsonObject options = new JsonObject();
                options.addProperty("home", state.bbjHomePath);
                options.addProperty("classpath", state.classpathEntry);
                options.addProperty("javaInteropHost",
                    state.javaInteropHost != null && !state.javaInteropHost.isEmpty()
                        ? state.javaInteropHost : "localhost");
                options.addProperty("javaInteropPort", state.javaInteropPort);
                options.addProperty("configPath",
                    state.configPath != null ? state.configPath : "");
                params.setInitializationOptions(options);
            }
        }
        .setDocumentLinkFeature(new LSPDocumentLinkFeature() {
            @Override
            public boolean isSupported(@NotNull PsiFile file) {
                return false;
            }
        })
        .setCompletionFeature(new BbjCompletionFeature());
    }
}
