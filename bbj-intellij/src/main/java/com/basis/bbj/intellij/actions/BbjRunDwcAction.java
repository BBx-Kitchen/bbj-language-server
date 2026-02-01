package com.basis.bbj.intellij.actions;

import com.basis.bbj.intellij.BbjIcons;
import com.basis.bbj.intellij.BbjSettings;
import com.intellij.execution.configurations.GeneralCommandLine;
import com.intellij.openapi.project.Project;
import com.intellij.openapi.vfs.VirtualFile;
import org.jetbrains.annotations.NotNull;
import org.jetbrains.annotations.Nullable;

import java.io.File;

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
        // Get BBj executable path
        String bbjPath = getBbjExecutablePath();
        if (bbjPath == null) {
            showError(project, "BBj home is not configured or bbj executable not found");
            return null;
        }

        // Get web.bbj path
        String webBbjPath = getWebBbjPath();
        if (webBbjPath == null) {
            showError(project, "web.bbj runner not found in plugin bundle");
            return null;
        }

        // Get web.bbj directory (working directory for the runner)
        File webBbjFile = new File(webBbjPath);
        String webRunnerDir = webBbjFile.getParent();

        // Derive name (filename without extension)
        String fileName = file.getName();
        String name = fileName.contains(".")
            ? fileName.substring(0, fileName.lastIndexOf('.'))
            : fileName;

        // Programme is the filename only (basename)
        String programme = fileName;

        // Working directory is the file's parent directory
        String workingDir = file.getParent().getPath();

        // Get EM credentials and classpath from settings
        BbjSettings.State state = BbjSettings.getInstance().getState();
        String username = state.emUsername != null ? state.emUsername : "admin";
        String password = state.emPassword != null ? state.emPassword : "admin123";
        String classpath = state.classpathEntry != null ? state.classpathEntry : "";

        // Build command line: bbj -q -WD<webRunnerDir> <webBbjPath> - "DWC" <name> <programme> <workingDir> <username> <password> <classpath>
        GeneralCommandLine cmd = new GeneralCommandLine(bbjPath);
        cmd.addParameter("-q");
        cmd.addParameter("-WD" + webRunnerDir);
        cmd.addParameter(webBbjPath);
        cmd.addParameter("-");
        cmd.addParameter("DWC");
        cmd.addParameter(name);
        cmd.addParameter(programme);
        cmd.addParameter(workingDir);
        cmd.addParameter(username);
        cmd.addParameter(password);
        cmd.addParameter(classpath);

        cmd.setWorkDirectory(webRunnerDir);

        return cmd;
    }

    @Override
    @NotNull
    protected String getRunMode() {
        return "DWC";
    }
}
