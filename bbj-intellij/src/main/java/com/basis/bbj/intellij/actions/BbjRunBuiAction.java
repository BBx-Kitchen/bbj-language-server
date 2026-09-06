package com.basis.bbj.intellij.actions;

import com.basis.bbj.intellij.BbjIcons;
import com.intellij.execution.configurations.GeneralCommandLine;
import com.intellij.openapi.project.Project;
import com.intellij.openapi.vfs.VirtualFile;
import org.jetbrains.annotations.NotNull;
import org.jetbrains.annotations.Nullable;

/**
 * Action to run a BBj file as a BUI (Browser User Interface) program.
 * Spawns the bbj executable with web.bbj runner and BUI client type.
 */
public final class BbjRunBuiAction extends BbjRunActionBase {

    public BbjRunBuiAction() {
        super("Run As BUI Program", "Run current BBj file as BUI program in browser", BbjIcons.RUN_BUI);
    }

    @Override
    @Nullable
    protected GeneralCommandLine buildCommandLine(@NotNull VirtualFile file, @NotNull Project project) {
        return buildWebRunCommandLine(file, project, "BUI");
    }

    @Override
    @NotNull
    protected String getRunMode() {
        return "BUI";
    }
}
