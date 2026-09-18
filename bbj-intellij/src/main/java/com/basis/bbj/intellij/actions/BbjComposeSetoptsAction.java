package com.basis.bbj.intellij.actions;

import com.basis.bbj.intellij.composer.ComposerLauncher;
import com.basis.bbj.intellij.config.BbjConfigPathService;
import com.intellij.openapi.editor.Editor;
import com.intellij.openapi.project.Project;
import com.intellij.openapi.vfs.VirtualFile;
import org.jetbrains.annotations.NotNull;
import org.jetbrains.annotations.Nullable;

/**
 * Editor action: open the visual SETOPTS composer for the resolved config file (#633). PSI-free by
 * design -- {@code BbxConfigLanguage}/{@code BbjConfigFileType} (Phase 84 Plan 05) has no parser, and
 * the config language reaches the language server only under its own {@code bbx-config} language id,
 * which the server never parses, so this action's availability check scans no syntax tree at all.
 * One entry point covers both modes (D-05/D-06): the caret's line is captured inside {@link
 * ComposerLauncher#launch} and decoded server-side via {@code bbj/composer/setopts/decodeCall} --
 * an existing {@code SETOPTS <hex>} line opens the dialog in edit mode for that line, any other line
 * opens it in compose-new mode targeting the caret. This action binds no default keystroke in this
 * phase (D-04).
 */
public final class BbjComposeSetoptsAction extends BbjComposeActionBase {

    @Override
    protected ComposerLauncher.Kind kind() {
        return ComposerLauncher.Kind.SETOPTS;
    }

    /**
     * Scoped to the resolved config file only (D-02): absent, not merely disabled, everywhere else.
     * Per D-03 the action is available on every line of a config file, so this never reads the
     * caret's line text -- the edit-vs-compose-new decision happens at launch, server-side.
     */
    @Override
    protected boolean isAvailableFor(@NotNull Project project, @NotNull Editor editor, @Nullable VirtualFile file) {
        return BbjConfigPathService.getInstance().isConfigFile(file);
    }
}
