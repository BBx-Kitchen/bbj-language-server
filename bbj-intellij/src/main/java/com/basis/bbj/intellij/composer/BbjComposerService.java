package com.basis.bbj.intellij.composer;

import com.intellij.openapi.project.Project;
import com.redhat.devtools.lsp4ij.LanguageServerManager;
import org.jetbrains.annotations.NotNull;

import java.util.concurrent.CompletableFuture;

/**
 * Resolves the running BBj language server as a {@link BbjComposerServer} proxy so the composer
 * dialogs/actions can call the {@code bbj/composer/*} requests (#433). The server id matches the
 * {@code <server id="bbjLanguageServer">} declaration in {@code plugin.xml}.
 */
public final class BbjComposerService {
    private static final String SERVER_ID = "bbjLanguageServer";

    private BbjComposerService() {}

    /**
     * The composer server proxy, or a future completing with {@code null} when the server is not
     * running (e.g. no BBj file has been opened yet). Callers must handle the null case.
     */
    public static @NotNull CompletableFuture<BbjComposerServer> server(@NotNull Project project) {
        // Ensure the server is (being) started, then resolve the proxy.
        LanguageServerManager.getInstance(project).start(SERVER_ID);
        return LanguageServerManager.getInstance(project)
                .getLanguageServer(SERVER_ID)
                .thenApply(item -> item == null ? null : (BbjComposerServer) item.getServer());
    }
}
