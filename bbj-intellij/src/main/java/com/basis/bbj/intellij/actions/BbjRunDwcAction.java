package com.basis.bbj.intellij.actions;

import com.basis.bbj.intellij.BbjIcons;
import com.intellij.execution.configurations.GeneralCommandLine;
import com.intellij.openapi.project.Project;
import com.intellij.openapi.vfs.VirtualFile;
import org.jetbrains.annotations.NotNull;
import org.jetbrains.annotations.Nullable;

/**
 * Action to run a BBj file as a DWC (Dynamic Web Client) program.
 * Spawns the bbj executable with web.bbj runner and DWC client type.
 */
public final class BbjRunDwcAction extends BbjRunActionBase {

    public BbjRunDwcAction() {
        super("Run As DWC Program", "Run current BBj file as DWC program in browser", BbjIcons.RUN_DWC);
    }

    @Override
    @Nullable
    protected GeneralCommandLine buildCommandLine(@NotNull VirtualFile file, @NotNull Project project) {
        return buildWebRunCommandLine(file, project, "DWC");
    }

    @Override
    @NotNull
    protected String getRunMode() {
        return "DWC";
    }
}
