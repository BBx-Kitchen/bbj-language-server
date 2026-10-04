package com.basis.bbj.intellij.lsp;

import com.basis.bbj.intellij.BbjSettings;
import com.basis.bbj.intellij.composer.BbjComposerServer;
import com.basis.bbj.intellij.ui.BbjServerService;
import com.google.gson.JsonObject;
import com.intellij.openapi.application.ApplicationManager;
import com.intellij.openapi.project.Project;
import com.intellij.psi.PsiFile;
import com.redhat.devtools.lsp4ij.LanguageServerFactory;
import com.redhat.devtools.lsp4ij.ServerStatus;
import com.redhat.devtools.lsp4ij.client.LanguageClientImpl;
import com.redhat.devtools.lsp4ij.client.features.LSPClientFeatures;
import com.redhat.devtools.lsp4ij.client.features.LSPDocumentLinkFeature;
import com.redhat.devtools.lsp4ij.client.features.LSPFormattingFeature;
import com.redhat.devtools.lsp4ij.server.StreamConnectionProvider;
import org.eclipse.lsp4j.InitializeParams;
import org.eclipse.lsp4j.services.LanguageServer;
import org.jetbrains.annotations.NotNull;

/**
 * Factory for creating BBj language server connections and client features.
 * Registered via plugin.xml extension point: com.redhat.devtools.lsp4ij.server
 */
public final class BbjLanguageServerFactory implements LanguageServerFactory {

    /**
     * The one switch deciding whether IntelliJ offers LSP formatting for BBj files. It stays off
     * until LSP4IJ formatting has been evaluated against the BBj formatter. While it is off,
     * Reformat Code, Actions on Save and the client-side typed-character triggers never send a
     * formatting request to the language server, even once the server advertises formatting.
     * Server-driven on-type formatting is not gated here: it is never offered because the
     * language server does not advertise it. Setting the switch to {@code true} restores
     * LSP4IJ's own behaviour unchanged.
     */
    private static final boolean LSP_FORMATTING_ENABLED = false;

    @Override
    public @NotNull StreamConnectionProvider createConnectionProvider(@NotNull Project project) {
        return new BbjLanguageServer(project);
    }

    @Override
    public @NotNull LanguageClientImpl createLanguageClient(@NotNull Project project) {
        return new BbjLanguageClient(project);
    }

    @Override
    public @NotNull Class<? extends LanguageServer> getServerInterface() {
        // Extend the server proxy with the custom bbj/composer/* requests (#433).
        return BbjComposerServer.class;
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
                options.addProperty("interopHost",
                    state.javaInteropHost != null && !state.javaInteropHost.isEmpty()
                        ? state.javaInteropHost : "localhost");
                options.addProperty("interopPort",BbjSettings.getInstance().getEffectiveJavaInteropPort());
                options.addProperty("configPath",
                    state.configPath != null ? state.configPath : "");
                // Flat keys, not nested under BbjLanguageClient.createSettings(): LSP4IJ's
                // settings resolution returns null for this plugin's flat client settings
                // object, so initialization options are the channel that actually reaches
                // the server (#571).
                options.addProperty(CompilerInitOptions.COMPILER_OUTPUT_DIRECTORY_KEY,
                    CompilerInitOptions.normalizeOutputDirectory(state.compilerOutputDirectory));
                options.addProperty(CompilerInitOptions.COMPILER_TRIGGER_KEY,
                    CompilerInitOptions.normalizeTrigger(state.compilerTrigger));
                // The formatter settings travel as one object the server normalizes.
                options.add(FormatterInitOptions.FORMATTER_KEY,
                    FormatterInitOptions.toJson(FormatterInitOptions.fromState(state)));
                params.setInitializationOptions(options);
            }

            // This is the status-feed site: LSP4IJ calls the client features for every status
            // change, but only calls the language client while it is non-null, and nulls that
            // reference before publishing the stopped status. BbjLanguageClient keeps only its
            // console line; this override is what actually reaches BbjServerService.
            @Override
            public void handleServerStatusChanged(@NotNull ServerStatus status) {
                super.handleServerStatusChanged(status);
                Project project = getProject();
                if (project.isDisposed()) {
                    return;
                }
                ApplicationManager.getApplication().invokeLater(() -> {
                    if (project.isDisposed()) {
                        return;
                    }
                    BbjServerService.getInstance(project).updateStatus(status);
                });
            }
        }
        .setDocumentLinkFeature(new LSPDocumentLinkFeature() {
            @Override
            public boolean isSupported(@NotNull PsiFile file) {
                return false;
            }
        })
        .setCompletionFeature(new BbjCompletionFeature())
        // All four checks are overridden because the formatting services gate on isEnabled and
        // then call the two supported checks directly; overriding isSupported alone, as on the
        // document-link feature above, would leave Reformat Code live. The short-circuit keeps
        // super from touching the capability registry or the file while the switch is off.
        .setFormattingFeature(new LSPFormattingFeature() {
            @Override
            public boolean isEnabled(@NotNull PsiFile file) {
                return LSP_FORMATTING_ENABLED && super.isEnabled(file);
            }

            @Override
            public boolean isSupported(@NotNull PsiFile file) {
                return LSP_FORMATTING_ENABLED && super.isSupported(file);
            }

            @Override
            public boolean isFormattingSupported(@NotNull PsiFile file) {
                return LSP_FORMATTING_ENABLED && super.isFormattingSupported(file);
            }

            @Override
            public boolean isRangeFormattingSupported(@NotNull PsiFile file) {
                return LSP_FORMATTING_ENABLED && super.isRangeFormattingSupported(file);
            }
        });
    }
}
