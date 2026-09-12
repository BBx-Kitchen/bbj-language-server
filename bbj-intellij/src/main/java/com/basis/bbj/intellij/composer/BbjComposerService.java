package com.basis.bbj.intellij.composer;

import com.basis.bbj.intellij.ui.BbjServerService;
import com.intellij.openapi.Disposable;
import com.intellij.openapi.project.Project;
import com.redhat.devtools.lsp4ij.LanguageServerManager;
import org.jetbrains.annotations.NotNull;

import java.util.concurrent.CompletableFuture;

/**
 * Project-level cache of the resolved {@link BbjComposerServer} proxy and its {@link
 * ComposerModels.ComposerCatalogs} (#612), so composer dialogs/actions can call the {@code
 * bbj/composer/*} requests without re-resolving the language server or re-fetching catalogs on
 * every open. The one {@link ComposerHandleCache} this service owns is cleared on any {@link
 * BbjServerService.BbjServerStatusListener} status change, so the cache never outlives the server
 * instance it came from -- starting, stopping, a crash, a manual restart and a config-reload
 * restart all make the next open resolve again. The server id matches the
 * {@code <server id="bbjLanguageServer">} declaration in {@code plugin.xml}.
 */
public final class BbjComposerService implements Disposable {
    private static final String SERVER_ID = "bbjLanguageServer";

    private final ComposerHandleCache handles;

    public BbjComposerService(@NotNull Project project) {
        this.handles = new ComposerHandleCache(() -> resolveServer(project));
        project.getMessageBus().connect(this)
                .subscribe(BbjServerService.BbjServerStatusListener.TOPIC, status -> handles.invalidate());
    }

    /** The per-project cache of the composer server proxy and its catalogs. */
    public static @NotNull ComposerHandleCache handles(@NotNull Project project) {
        return project.getService(BbjComposerService.class).handles;
    }

    /**
     * The composer server proxy, or a future completing with {@code null} when the server is not
     * running (e.g. no BBj file has been opened yet). Callers must handle the null case. Backed by
     * the per-project cache, so a second call in the same session performs no server resolution.
     */
    public static @NotNull CompletableFuture<BbjComposerServer> server(@NotNull Project project) {
        return handles(project).server();
    }

    private static @NotNull CompletableFuture<BbjComposerServer> resolveServer(@NotNull Project project) {
        // Ensure the server is (being) started, then resolve the proxy.
        LanguageServerManager.getInstance(project).start(SERVER_ID);
        return LanguageServerManager.getInstance(project)
                .getLanguageServer(SERVER_ID)
                .thenApply(item -> item == null ? null : (BbjComposerServer) item.getServer());
    }

    @Override
    public void dispose() {
        // The message-bus connection created in the constructor is disposed with this service.
    }
}
