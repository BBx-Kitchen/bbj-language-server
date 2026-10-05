package com.basis.bbj.intellij.lsp;

import com.basis.bbj.intellij.BbjSettings;
import com.basis.bbj.intellij.composer.BbjComposerServer;
import com.basis.bbj.intellij.tokenized.TokenizedBbj;
import com.basis.bbj.intellij.ui.BbjServerService;
import com.google.gson.JsonObject;
import com.intellij.openapi.application.ApplicationManager;
import com.intellij.openapi.project.Project;
import com.intellij.openapi.vfs.VirtualFile;
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
     * The one switch deciding whether IntelliJ offers LSP formatting for BBj files. It is on after
     * a hands-on evaluation of the BBj formatter through LSP4IJ 0.21.0 on IntelliJ IDEA 2024.2
     * (build 242, Linux) and IntelliJ IDEA 2026.2.2 (build 262, Windows): Reformat Code, Reformat
     * Code on a selection and Actions on Save all format through the language server. Known issues:
     * <ul>
     *   <li>The formatter's Line ending setting CRLF stops formatting entirely: the IDE refuses an
     *       edit whose text carries CRLF line breaks, leaves the file unchanged and shows no
     *       message (an LSP4IJ limitation, lsp4ij #381). KEEP, the default, works.</li>
     *   <li>When the formatter has nothing to change, the IDE still sends one empty change
     *       notification and bumps the document version; text and file stay unchanged.</li>
     *   <li>Actions on Save saves the typed text first, then formats and saves a second time;
     *       nothing is lost.</li>
     *   <li>Format on save is IntelliJ's own Actions on Save setting, not an option on the BBj
     *       settings page.</li>
     * </ul>
     * All four formatting checks are gated on this switch, so setting it to {@code false} again
     * makes Reformat Code, Actions on Save and the client-side typed-character triggers never send
     * a formatting request to the language server. Server-driven on-type formatting is not gated
     * here: it is never offered because the language server does not advertise it.
     */
    private static final boolean LSP_FORMATTING_ENABLED = true;

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
                options.addProperty("interopPort", BbjSettings.getInstance().getEffectiveJavaInteropPort());
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

            // A tokenized program is offered decompile by the editor banner and is never sent to
            // the server (the server also ignores one). Declining the file here means no didOpen
            // is sent and the server never parses a large binary. After Decompile & Replace the
            // editor is reopened, the file is source, and it is connected as usual.
            @Override
            public boolean isEnabled(@NotNull VirtualFile file) {
                return super.isEnabled(file) && !TokenizedBbj.isTokenized(file);
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
        // super from touching the capability registry or the file whenever the switch is off.
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
