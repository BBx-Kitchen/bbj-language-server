package com.basis.bbj.intellij.actions;

import com.basis.bbj.intellij.composer.ComposerLauncher;
import com.basis.bbj.intellij.config.BbjConfigPathService;
import com.intellij.openapi.editor.Editor;
import com.intellij.openapi.project.Project;
import com.intellij.openapi.vfs.VirtualFile;
import org.jetbrains.annotations.NotNull;
import org.jetbrains.annotations.Nullable;

/**
 * Editor action: a second, non-intention door into the tri-state SETOPTS-in-code composer (#475).
 * IntelliJ computes ALL intention availability for the caret -- including
 * LSP4IJ's all-language {@code LSPIntentionAction0..19}, which blocks on the BBj language
 * server's {@code textDocument/codeAction} with no timeout of its own -- inside ONE modal,
 * EDT-blocking progress dialog titled "Searching for Context Actions...". A single slow intention
 * from any installed plugin can therefore make the Alt+Enter lightbulb unreachable; this action
 * reaches the same launcher without entering that shared search phase at all, so the composer's
 * reachability no longer depends on it.
 *
 * Calls {@link ComposerLauncher#launch} with {@link ComposerLauncher.Kind#SETOPTS_IN_CODE} --
 * byte-for-byte the same call the sibling lightbulb trigger, {@code
 * com.basis.bbj.intellij.composer.ConfigureSetoptsInCodeIntention}, makes -- so the two entry
 * points cannot drift in behaviour. This additional trigger can be layered on without touching
 * the request/DTO surface either entry point relies on.
 */
public final class BbjComposeSetoptsInCodeAction extends BbjComposeActionBase {

    @Override
    protected ComposerLauncher.Kind kind() {
        return ComposerLauncher.Kind.SETOPTS_IN_CODE;
    }

    /**
     * Presence-scoped (never a disabled-but-visible state): available on a BBj source file, absent
     * on the resolved config file (which has its own SETOPTS composer entry) and everywhere else,
     * per {@link SetoptsInCodeActionAvailability}.
     */
    @Override
    protected boolean isAvailableFor(@NotNull Project project, @NotNull Editor editor, @Nullable VirtualFile file) {
        boolean isConfigFile = BbjConfigPathService.getInstance().isConfigFile(file);
        String extension = file != null ? file.getExtension() : null;
        return SetoptsInCodeActionAvailability.isAvailable(extension, isConfigFile);
    }
}
