package com.basis.bbj.intellij.actions;

import com.basis.bbj.intellij.BbjIcons;
import com.basis.bbj.intellij.BbjSettings;
import com.intellij.execution.configurations.GeneralCommandLine;
import com.intellij.openapi.project.Project;
import com.intellij.openapi.ui.Messages;
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
        // Get BBj executable path (validation already done in actionPerformed)
        String bbjPath = getBbjExecutablePath();

        // Get web.bbj path
        String webBbjPath = getWebBbjPath();
        if (webBbjPath == null) {
            logError(project, "web.bbj runner not found in plugin bundle");
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

        // Get token from PasswordSafe, auto-prompt login if not stored
        String token = BbjEMTokenStore.getToken();
        if (token == null || token.isEmpty()) {
            int result = Messages.showYesNoDialog(
                project,
                "EM login required for DWC. Login now?",
                "Enterprise Manager Login Required",
                Messages.getQuestionIcon()
            );
            if (result == Messages.YES) {
                boolean loginOk = BbjEMLoginAction.performLogin(project);
                if (loginOk) {
                    token = BbjEMTokenStore.getToken();
                }
            }
            if (token == null || token.isEmpty()) {
                logError(project, "EM login required for DWC run. Use Tools > Login to Enterprise Manager.");
                return null;
            }
        }

        // Get classpath from settings
        BbjSettings.State state = BbjSettings.getInstance().getState();
        String classpath = state.classpathEntry != null ? state.classpathEntry : "";

        // Build command line: bbj -q -WD<webRunnerDir> <webBbjPath> - "DWC" <name> <programme> <workingDir> "" "" <classpath> <token>
        GeneralCommandLine cmd = new GeneralCommandLine(bbjPath);
        cmd.addParameter("-q");
        cmd.addParameter("-WD" + webRunnerDir);
        cmd.addParameter(webBbjPath);
        cmd.addParameter("-");
        cmd.addParameter("DWC");
        cmd.addParameter(name);
        cmd.addParameter(programme);
        cmd.addParameter(workingDir);
        cmd.addParameter("");  // username placeholder
        cmd.addParameter("");  // password placeholder
        cmd.addParameter(classpath);
        cmd.addParameter(token);

        cmd.setWorkDirectory(webRunnerDir);

        return cmd;
    }

    @Override
    @NotNull
    protected String getRunMode() {
        return "DWC";
    }
}
