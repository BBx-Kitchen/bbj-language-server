package com.basis.bbj.intellij.actions;

import com.basis.bbj.intellij.BbjIcons;
import com.intellij.execution.configurations.GeneralCommandLine;
import com.intellij.openapi.project.Project;
import com.intellij.openapi.vfs.VirtualFile;
import org.jetbrains.annotations.NotNull;
import org.jetbrains.annotations.Nullable;

/**
 * Action to run a BBj file as a GUI program.
 * Spawns the bbj executable with -q flag, classpath, working directory, and file path.
 */
public final class BbjRunGuiAction extends BbjRunActionBase {

    public BbjRunGuiAction() {
        super("Run As BBj Program", "Run current BBj file as GUI program", BbjIcons.RUN_GUI);
    }

    @Override
    @Nullable
    protected GeneralCommandLine buildCommandLine(@NotNull VirtualFile file, @NotNull Project project) {
        // Get BBj executable path (validation already done in actionPerformed)
        String bbjPath = getBbjExecutablePath();

        // Build command line
        GeneralCommandLine cmd = new GeneralCommandLine(bbjPath);

        // Add -q flag (quiet mode - required)
        cmd.addParameter("-q");

        // Add classpath if configured
        String classpath = getClasspathArg();
        if (classpath != null) {
            cmd.addParameter(classpath);
        }

        // Add custom config.bbx path if configured
        String configPath = getConfigPathArg();
        if (configPath != null) {
            cmd.addParameter(configPath);
        }

        // Add working directory (project root)
        String projectRoot = project.getBasePath();
        if (projectRoot != null) {
            cmd.addParameter("-WD" + projectRoot);
            cmd.setWorkDirectory(projectRoot);
        }

        // Add file path
        cmd.addParameter(file.getPath());

        return cmd;
    }

    @Override
    @NotNull
    protected String getRunMode() {
        return "GUI";
    }
}
