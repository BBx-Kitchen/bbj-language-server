# Phase 08: Run Commands - Research

**Researched:** 2026-02-01
**Domain:** IntelliJ Platform execution API, external process spawning, action system
**Confidence:** HIGH

## Summary

This phase requires implementing three run actions (GUI, BUI, DWC) that spawn external BBj processes. The VSCode extension provides the reference implementation showing exact command-line parameters and behavior patterns. IntelliJ Platform offers two approaches: formal run configurations (persistent, UI-managed) or simple action-based process spawning (direct, lightweight). Given the phase constraints (no process lifecycle management, just launch-and-forget), simple actions using GeneralCommandLine + OSProcessHandler are the standard approach.

The VSCode extension uses `child_process.exec()` to spawn bbj/web.bbj executables without waiting for completion or streaming output. The web.bbj script (bundled with the extension) handles BUI/DWC browser launching internally. Run commands read BBj home and classpath from settings, support optional auto-save, and show error notifications only for process-start failures.

**Primary recommendation:** Implement as AnAction subclasses (not run configurations) using GeneralCommandLine for process spawning, NotificationGroup for error feedback, and ApplicationSettings for BBj home/classpath integration.

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| com.intellij.execution.configurations.GeneralCommandLine | Built-in | Command-line parameter management and process creation | IntelliJ Platform standard for external process execution |
| com.intellij.execution.process.OSProcessHandler | Built-in | Process lifecycle monitoring and output capture | Standard ProcessHandler implementation for observing process behavior |
| com.intellij.openapi.actionSystem.AnAction | Built-in | Action implementation base class | Required base for all IDE actions (menu, toolbar, keyboard) |
| com.intellij.notification.NotificationGroup | Built-in | Error/success notification balloons | Platform standard for user-facing messages |
| com.intellij.openapi.application.ApplicationManager | Built-in | Settings service access | Required for accessing BbjSettings.getInstance() |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| com.intellij.openapi.vfs.VirtualFile | Built-in | File abstraction for active editor file | Retrieving current BBj file path for run command |
| com.intellij.openapi.fileEditor.FileDocumentManager | Built-in | Document-to-file synchronization | Auto-save before run execution (if enabled) |
| com.intellij.openapi.project.Project | Built-in | Project context for working directory | Determining project root for run command working directory |
| java.nio.file.Path | Java 17 stdlib | Path manipulation for BBj home validation | Constructing paths to bbj/web.bbj executables |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| AnAction | RunConfiguration | Run configurations add UI complexity, persistence, and executor framework overhead when only "launch and forget" is needed |
| GeneralCommandLine | Runtime.exec() | GeneralCommandLine handles platform-specific quoting/escaping and provides cleaner API |
| NotificationGroup | Messages.showErrorDialog() | Notification balloons are less intrusive and auto-expire; dialogs require user dismissal |

**Installation:**
N/A - All dependencies are built into IntelliJ Platform 2024.2+

## Architecture Patterns

### Recommended Action Structure

```
src/main/java/com/basis/bbj/intellij/actions/
├── BbjRunGuiAction.java          # GUI run action (bbj -q -CP... -WD... file.bbj)
├── BbjRunBuiAction.java          # BUI run action (bbj -q -WD... web.bbj - "BUI" ...)
├── BbjRunDwcAction.java          # DWC run action (bbj -q -WD... web.bbj - "DWC" ...)
└── BbjRunActionBase.java         # Shared logic (settings access, auto-save, error handling)
```

### Pattern 1: Action-Based Process Spawning (Recommended)

**What:** AnAction subclass that spawns external process directly without run configuration framework
**When to use:** "Launch and forget" scenarios where plugin doesn't manage process lifecycle

**Example:**
```java
// Source: VSCode Commands.cjs run() + IntelliJ execution docs
public class BbjRunGuiAction extends AnAction {
    @Override
    public void actionPerformed(@NotNull AnActionEvent e) {
        Project project = e.getProject();
        if (project == null) return;

        VirtualFile file = e.getData(CommonDataKeys.VIRTUAL_FILE);
        if (file == null) return;

        BbjSettings settings = BbjSettings.getInstance();
        String bbjHome = settings.getState().bbjHomePath;

        if (bbjHome.isEmpty()) {
            showError(project, "BBj home not configured");
            return;
        }

        // Auto-save if enabled
        if (shouldAutoSave()) {
            FileDocumentManager.getInstance().saveAllDocuments();
        }

        // Build command line
        String bbj = Paths.get(bbjHome, "bin", "bbj").toString();
        GeneralCommandLine cmd = new GeneralCommandLine(bbj, "-q");

        String classpath = settings.getState().classpathEntry;
        if (!classpath.isEmpty()) {
            cmd.addParameter("-CP" + classpath);
        }

        cmd.addParameter("-WD" + project.getBasePath());
        cmd.addParameter(file.getPath());

        // Execute (fire and forget)
        try {
            OSProcessHandler handler = new OSProcessHandler(cmd);
            handler.startNotify();
            // Plugin does NOT wait for completion or manage lifecycle
        } catch (ExecutionException ex) {
            showError(project, "Failed to launch: " + ex.getMessage());
        }
    }

    @Override
    public void update(@NotNull AnActionEvent e) {
        // Enable only for BBj files
        VirtualFile file = e.getData(CommonDataKeys.VIRTUAL_FILE);
        boolean enabled = file != null &&
            (file.getFileType() instanceof BbjFileType ||
             file.getFileType() instanceof BbxConfigFileType);
        e.getPresentation().setEnabledAndVisible(enabled);
    }
}
```

### Pattern 2: BUI/DWC Web Runner Integration

**What:** Executing bundled web.bbj script with client type parameter
**When to use:** BUI and DWC run modes (browser-based execution)

**Example:**
```java
// Source: VSCode Commands.cjs runWeb() + web.bbj script analysis
public class BbjRunBuiAction extends AnAction {
    @Override
    public void actionPerformed(@NotNull AnActionEvent e) {
        Project project = e.getProject();
        VirtualFile file = e.getData(CommonDataKeys.VIRTUAL_FILE);

        BbjSettings settings = BbjSettings.getInstance();
        String bbjHome = settings.getState().bbjHomePath;
        String classpath = settings.getState().classpathEntry;

        // Locate bundled web.bbj
        String webRunner = findBundledWebRunner(); // From plugin resources

        // Build command: bbj -q -WD<tools> web.bbj - "BUI" "name" "program" "wd" "user" "pass" "sscp"
        String bbj = Paths.get(bbjHome, "bin", "bbj").toString();
        GeneralCommandLine cmd = new GeneralCommandLine(bbj, "-q");
        cmd.addParameter("-WD" + Paths.get(webRunner).getParent().toString());
        cmd.addParameter(webRunner);
        cmd.addParameter("-"); // Separator
        cmd.addParameter("BUI"); // Client type
        cmd.addParameter(file.getNameWithoutExtension()); // App name
        cmd.addParameter(file.getName()); // Program file
        cmd.addParameter(project.getBasePath()); // Working directory
        cmd.addParameter("admin"); // Username (from settings or default)
        cmd.addParameter("admin123"); // Password (from settings or default)
        cmd.addParameter(classpath); // Session-specific classpath

        try {
            OSProcessHandler handler = new OSProcessHandler(cmd);
            handler.startNotify();
            // web.bbj opens browser internally via BBjAPI().getThinClient().browse(url!)
        } catch (ExecutionException ex) {
            showError(project, "Failed to launch BUI: " + ex.getMessage());
        }
    }
}
```

### Pattern 3: Settings Integration and Validation

**What:** Retrieving BBj home and classpath from application settings
**When to use:** All run actions require settings access

**Example:**
```java
// Source: VSCode Commands.cjs getBBjHome() + BbjSettings.java
protected boolean validateSettings(Project project) {
    BbjSettings settings = BbjSettings.getInstance();
    String bbjHome = settings.getState().bbjHomePath;

    if (bbjHome.isEmpty()) {
        NotificationGroupManager.getInstance()
            .getNotificationGroup("BBj Language Server")
            .createNotification(
                "BBj home not configured. Please set BBj home in Settings.",
                NotificationType.ERROR
            )
            .notify(project);
        return false;
    }

    // Verify bbj executable exists
    Path bbjExe = Paths.get(bbjHome, "bin", "bbj");
    if (!Files.exists(bbjExe)) {
        showError(project, "BBj executable not found at: " + bbjExe);
        return false;
    }

    return true;
}
```

### Pattern 4: Notification Feedback

**What:** Using NotificationGroup for success/error messages
**When to use:** Process start failures (not runtime errors - those appear in BBj GUI/browser)

**Example:**
```java
// Source: IntelliJ notifications docs + VSCode error handling pattern
protected void showError(Project project, String message) {
    NotificationGroupManager.getInstance()
        .getNotificationGroup("BBj Language Server")
        .createNotification(message, NotificationType.ERROR)
        .notify(project);
}

protected void showSuccess(Project project, String message) {
    NotificationGroupManager.getInstance()
        .getNotificationGroup("BBj Language Server")
        .createNotification(message, NotificationType.INFORMATION)
        .notify(project);
}
```

### Pattern 5: Action Registration in plugin.xml

**What:** Declaring actions with toolbar placement and keyboard shortcuts
**When to use:** All run actions need menu, toolbar, and keyboard access

**Example:**
```xml
<!-- Source: IntelliJ action system docs + VSCode package.json menus/keybindings -->
<actions>
    <action id="bbj.runGui"
            class="com.basis.bbj.intellij.actions.BbjRunGuiAction"
            text="Run As BBj Program"
            description="Run current BBj file as GUI program"
            icon="com.basis.bbj.intellij.BbjIcons.RUN_GUI">
        <add-to-group group-id="EditorPopupMenu" anchor="first"/>
        <keyboard-shortcut keymap="$default" first-keystroke="alt G"/>
    </action>

    <action id="bbj.runBui"
            class="com.basis.bbj.intellij.actions.BbjRunBuiAction"
            text="Run As BUI Program"
            icon="com.basis.bbj.intellij.BbjIcons.RUN_BUI">
        <add-to-group group-id="EditorPopupMenu" anchor="after" relative-to-action="bbj.runGui"/>
        <keyboard-shortcut keymap="$default" first-keystroke="alt B"/>
    </action>

    <action id="bbj.runDwc"
            class="com.basis.bbj.intellij.actions.BbjRunDwcAction"
            text="Run As DWC Program"
            icon="com.basis.bbj.intellij.BbjIcons.RUN_DWC">
        <add-to-group group-id="EditorPopupMenu" anchor="after" relative-to-action="bbj.runBui"/>
        <keyboard-shortcut keymap="$default" first-keystroke="alt D"/>
    </action>
</actions>
```

### Anti-Patterns to Avoid

- **Using run configurations for "launch and forget":** Run configurations add persistence, UI complexity, and executor framework overhead when the plugin doesn't manage process lifecycle. The phase boundary explicitly states "spawns... and the program runs externally. The plugin does not manage the running process lifecycle beyond launch."

- **Streaming process output to Run tool window:** None of the three run modes produce console output to stream (GUI = external window, BUI/DWC = browser). Phase context states output should go to Event Log for debugging, not a Run tool window.

- **Manually constructing command strings:** Using string concatenation for command lines breaks on paths with spaces. GeneralCommandLine handles platform-specific quoting/escaping automatically.

- **Blocking on process completion:** VSCode extension uses `exec()` without waiting. IntelliJ actions should call `startNotify()` and return immediately. Don't call `handler.waitFor()`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Command-line execution | Manual Process.exec() with string concatenation | GeneralCommandLine | Handles platform-specific quoting, escaping, environment variables, working directory |
| Process lifecycle | Custom Thread + StreamGobbler for output | OSProcessHandler | Built-in output capture, termination detection, process tree management |
| User notifications | Custom JPanel dialogs | NotificationGroup + NotificationGroupManager | Respects user notification preferences, auto-expiry, Event Log integration |
| File type detection | String.endsWith() checks | VirtualFile.getFileType() instanceof BbjFileType | Handles edge cases (uppercase extensions, aliased types, custom associations) |
| Settings access | Reading XML directly | ApplicationManager.getApplication().getService(BbjSettings.class) | Handles persistence, thread-safety, IDE lifecycle |

**Key insight:** IntelliJ Platform provides high-level APIs for all common plugin operations. Custom implementations introduce bugs around thread-safety, platform differences (Windows .exe suffixes, path separators), and IDE lifecycle events.

## Common Pitfalls

### Pitfall 1: Windows Executable Suffix Handling

**What goes wrong:** Command fails on Windows because executable path lacks .exe extension
**Why it happens:** BBj executables are `bbj` on macOS/Linux, `bbj.exe` on Windows
**How to avoid:** Check OS platform and append .exe conditionally
**Warning signs:** Action works on macOS but fails on Windows with "file not found" error

**Solution:**
```java
// Source: VSCode Commands.cjs lines 51, 92, 181
String exeSuffix = SystemInfo.isWindows ? ".exe" : "";
String bbj = Paths.get(bbjHome, "bin", "bbj" + exeSuffix).toString();
```

### Pitfall 2: Working Directory Defaults

**What goes wrong:** Process starts with IDE's bin/ directory as working directory, breaking relative paths
**Why it happens:** GeneralCommandLine defaults to IDE process's current directory if not explicitly set
**How to avoid:** Always set working directory explicitly to project root (GUI) or tools directory (BUI/DWC)
**Warning signs:** BBj program can't find relative file references or config files

**Solution:**
```java
// Source: IntelliJ GeneralCommandLine docs
cmd.setWorkDirectory(project.getBasePath()); // For GUI mode
cmd.setWorkDirectory(Paths.get(webRunner).getParent().toString()); // For BUI/DWC
```

### Pitfall 3: Classpath Parameter Format

**What goes wrong:** Classpath not applied because -CP and value are separate parameters
**Why it happens:** BBj expects `-CPvalue` (no space), but some devs pass as two parameters
**How to avoid:** Concatenate "-CP" + classpathEntry as single parameter
**Warning signs:** BBj classes not found at runtime despite classpath configured

**Solution:**
```java
// Source: VSCode Commands.cjs lines 186-190
String classpath = settings.getState().classpathEntry;
if (!classpath.isEmpty()) {
    cmd.addParameter("-CP" + classpath); // CORRECT: single parameter
    // NOT: cmd.addParameters("-CP", classpath); // WRONG: two parameters
}
```

### Pitfall 4: Auto-Save Timing

**What goes wrong:** Stale file content executed because save happens asynchronously after process starts
**Why it happens:** FileDocumentManager.saveAllDocuments() is asynchronous; command executes before save completes
**How to avoid:** For critical scenarios, use WriteAction.run() to force synchronous save, but VSCode doesn't wait either
**Warning signs:** User reports "old code" running despite editing file before clicking run

**Solution:**
```java
// Source: VSCode Commands.cjs lines 203-207
// VSCode pattern: save().then(runCommand) - promises sequence operations
if (shouldAutoSave()) {
    FileDocumentManager.getInstance().saveAllDocuments();
    // Note: IntelliJ's saveAllDocuments() is async but completes quickly
    // For true synchronous save, wrap in WriteAction.run(() -> {...})
    // However, VSCode doesn't block either, so this matches reference behavior
}
```

### Pitfall 5: Action Update Frequency

**What goes wrong:** Action update() method performs expensive operations (file I/O, settings access) causing UI lag
**Why it happens:** update() is called frequently (every UI refresh, mouse move over toolbar)
**How to avoid:** Cache expensive checks; only check file type (cheap VirtualFile operation)
**Warning signs:** IDE stutters when hovering over toolbar buttons or opening context menu

**Solution:**
```java
// Source: IntelliJ action system best practices
@Override
public void update(@NotNull AnActionEvent e) {
    // GOOD: Fast file type check
    VirtualFile file = e.getData(CommonDataKeys.VIRTUAL_FILE);
    boolean enabled = file != null && file.getFileType() instanceof BbjFileType;
    e.getPresentation().setEnabledAndVisible(enabled);

    // BAD: Don't validate settings here (expensive I/O)
    // boolean enabled = validateSettings(e.getProject());
}
```

## Code Examples

Verified patterns from official sources and VSCode reference implementation:

### GUI Run Command Construction

```java
// Source: VSCode Commands.cjs run() method (lines 174-208)
BbjSettings settings = BbjSettings.getInstance();
String bbjHome = settings.getState().bbjHomePath;
String classpath = settings.getState().classpathEntry;

VirtualFile file = e.getData(CommonDataKeys.VIRTUAL_FILE);
String workingDir = file.getParent().getPath();

String exeSuffix = SystemInfo.isWindows ? ".exe" : "";
String bbj = Paths.get(bbjHome, "bin", "bbj" + exeSuffix).toString();

GeneralCommandLine cmd = new GeneralCommandLine(bbj);
cmd.addParameter("-q"); // Quiet mode (suppress startup banner)
if (!classpath.isEmpty()) {
    cmd.addParameter("-CP" + classpath); // Session-specific classpath
}
cmd.addParameter("-WD" + workingDir); // Working directory
cmd.addParameter(file.getPath()); // Program file

try {
    OSProcessHandler handler = new OSProcessHandler(cmd);
    handler.startNotify();
} catch (ExecutionException ex) {
    showError(project, "Failed to run " + file.getName() + ": " + ex.getMessage());
}
```

### BUI/DWC Web Runner Command

```java
// Source: VSCode Commands.cjs runWeb() method (lines 46-76) + web.bbj script analysis
String webRunner = PluginManager.getPluginByClass(BbjRunBuiAction.class)
    .getPluginPath().resolve("lib/tools/web.bbj").toString();

String exeSuffix = SystemInfo.isWindows ? ".exe" : "";
String bbj = Paths.get(bbjHome, "bin", "bbj" + exeSuffix).toString();

GeneralCommandLine cmd = new GeneralCommandLine(bbj);
cmd.addParameter("-q");
cmd.addParameter("-WD" + Paths.get(webRunner).getParent().toString());
cmd.addParameter(webRunner);
cmd.addParameter("-"); // Separator (required by web.bbj arg parsing)
cmd.addParameter("BUI"); // Client type: "BUI" or "DWC"
cmd.addParameter(file.getNameWithoutExtension()); // App name (cleaned by web.bbj)
cmd.addParameter(file.getName()); // Program file
cmd.addParameter(project.getBasePath()); // Working directory for BBj program
cmd.addParameter("admin"); // EM username (default from VSCode settings)
cmd.addParameter("admin123"); // EM password (default from VSCode settings)
cmd.addParameter(classpath); // Session-specific classpath

try {
    OSProcessHandler handler = new OSProcessHandler(cmd);
    handler.startNotify();
    // web.bbj handles browser launch via BBjAPI().getThinClient().browse(url!)
} catch (ExecutionException ex) {
    showError(project, "Failed to launch BUI: " + ex.getMessage());
}
```

### Bundled web.bbj Resource Access

```java
// Source: IntelliJ Platform plugin resource loading pattern
private String findBundledWebRunner() {
    PluginId pluginId = PluginManager.getPluginByClass(getClass()).getPluginId();
    IdeaPluginDescriptor plugin = PluginManager.getPlugin(pluginId);
    Path pluginPath = plugin.getPluginPath();

    // web.bbj bundled at lib/tools/web.bbj (copied by PrepareSandboxTask)
    Path webBbj = pluginPath.resolve("lib/tools/web.bbj");

    if (!Files.exists(webBbj)) {
        throw new IllegalStateException("Bundled web.bbj not found at: " + webBbj);
    }

    return webBbj.toString();
}
```

### Conditional Action Visibility

```java
// Source: IntelliJ action system docs + VSCode package.json "when" conditions
@Override
public void update(@NotNull AnActionEvent e) {
    VirtualFile file = e.getData(CommonDataKeys.VIRTUAL_FILE);

    // Enable only for BBj file types (matches VSCode: "when": "resourceLangId == bbj")
    boolean isBbjFile = file != null &&
        (file.getFileType() instanceof BbjFileType ||
         file.getFileType() instanceof BbxConfigFileType);

    e.getPresentation().setEnabledAndVisible(isBbjFile);
}
```

### Error Notification with Event Log

```java
// Source: IntelliJ notifications API + VSCode error message pattern
private void notifyError(Project project, String title, String message) {
    NotificationGroupManager.getInstance()
        .getNotificationGroup("BBj Language Server") // Reuse existing group from plugin.xml
        .createNotification(title, message, NotificationType.ERROR)
        .notify(project);
    // Message appears as balloon (10s timeout) AND logged to Event Log tool window
}

private void notifySuccess(Project project, String message) {
    NotificationGroupManager.getInstance()
        .getNotificationGroup("BBj Language Server")
        .createNotification(message, NotificationType.INFORMATION)
        .notify(project);
    // For success messages, use INFORMATION type (not ERROR or WARNING)
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Runtime.exec(String) | GeneralCommandLine | IntelliJ Platform 2016+ | Proper handling of spaces in paths, environment variables, platform differences |
| Custom output streaming threads | OSProcessHandler | IntelliJ Platform 2016+ | Built-in output capture, termination detection, integration with Run tool window |
| Messages.showErrorDialog() | NotificationGroup balloons | IntelliJ Platform 2018+ | Less intrusive, respects user preferences, Event Log integration |
| Manual FileType string checks | VirtualFile.getFileType() | IntelliJ Platform 2019+ | Type-safe, handles custom associations and aliases |

**Deprecated/outdated:**
- **Runtime.exec()**: Use GeneralCommandLine instead (handles quoting, escaping, platform differences)
- **Custom thread-based process monitoring**: Use ProcessHandler implementations (OSProcessHandler, KillableProcessHandler)
- **Modal error dialogs for background operations**: Use notification balloons with appropriate severity (ERROR, WARNING, INFORMATION)

## Open Questions

1. **web.bbj Bundling Location**
   - What we know: VSCode bundles web.bbj in `tools/` directory, copied via build script
   - What's unclear: IntelliJ best practice for bundling BBj scripts (resources vs lib directory)
   - Recommendation: Use PrepareSandboxTask to copy web.bbj to `lib/tools/` (matches VSCode structure)

2. **EM Username/Password Settings**
   - What we know: VSCode has bbj.web.username and bbj.web.password settings (defaults: admin/admin123)
   - What's unclear: Should IntelliJ plugin expose these as settings or hard-code defaults?
   - Recommendation: Hard-code defaults for v1.0 (phase context doesn't mention EM settings), add settings in future phase if users request

3. **Multiple Simultaneous Runs**
   - What we know: Phase context states "Multiple simultaneous runs are allowed — each launch is independent"
   - What's unclear: Should plugin track launched processes for any reason (e.g., shutdown cleanup)?
   - Recommendation: No tracking needed. Phase boundary explicitly states "does not manage the running process lifecycle beyond launch"

4. **Auto-Save Configuration Scope**
   - What we know: VSCode has workspace-level bbj.web.AutoSaveUponRun setting
   - What's unclear: Application-level or project-level setting in IntelliJ?
   - Recommendation: Add to application-level BbjSettings (matches other run-related settings like classpath)

## Sources

### Primary (HIGH confidence)

- **VSCode Extension Reference Implementation:**
  - `/bbj-vscode/src/Commands/Commands.cjs` - run(), runBUI(), runDWC() methods
  - `/bbj-vscode/tools/web.bbj` - BUI/DWC runner script with parameter documentation
  - `/bbj-vscode/package.json` - Command registration, keybindings, menu placement, settings schema

- **IntelliJ Platform Official Documentation:**
  - [Execution API](https://plugins.jetbrains.com/docs/intellij/execution.html) - Process spawning, GeneralCommandLine, OSProcessHandler
  - [Action System](https://plugins.jetbrains.com/docs/intellij/action-system.html) - Action registration, keyboard shortcuts, toolbar placement
  - [Notifications](https://plugins.jetbrains.com/docs/intellij/notifications.html) - NotificationGroup creation, balloon vs Event Log
  - [Run Configurations](https://plugins.jetbrains.com/docs/intellij/run-configurations.html) - Run configuration framework (compared against for architecture decision)

- **IntelliJ Platform Source Code:**
  - [GeneralCommandLine.java](https://github.com/JetBrains/intellij-community/blob/master/platform/platform-api/src/com/intellij/execution/configurations/GeneralCommandLine.java) - Command-line construction
  - [OSProcessHandler.java](https://github.com/JetBrains/intellij-community/blob/master/platform/platform-util-io/src/com/intellij/execution/process/OSProcessHandler.java) - Process lifecycle management
  - [PlatformActions.xml](https://github.com/JetBrains/intellij-community/blob/master/platform/platform-resources/src/idea/PlatformActions.xml) - Built-in action group IDs

### Secondary (MEDIUM confidence)

- **IntelliJ Platform Community Support:**
  - [Execute command in the terminal from plugin action](https://intellij-support.jetbrains.com/hc/en-us/community/posts/360005329339-Execute-command-in-the-terminal-from-plugin-action) - Action-based command execution patterns
  - [Is there any way to trigger Run/Debug configuration programmatically?](https://intellij-support.jetbrains.com/hc/en-us/community/posts/207137575-Is-there-any-way-to-trigger-start-Run-Debug-configuration-programmatically-) - Run configuration vs action comparison

- **Code Examples:**
  - [Java Examples for GeneralCommandLine](https://www.javatips.net/api/com.intellij.execution.configurations.generalcommandline) - Real-world usage patterns
  - [Java Examples for OSProcessHandler](https://www.javatips.net/api/com.intellij.execution.process.osprocesshandler) - Process handler patterns

### Tertiary (LOW confidence)

- N/A - All research verified against official documentation or VSCode reference implementation

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All components are built-in IntelliJ Platform APIs with stable, documented interfaces
- Architecture: HIGH - VSCode extension provides complete reference implementation; IntelliJ patterns verified against official SDK docs
- Pitfalls: HIGH - Based on VSCode source code analysis (Windows .exe suffix, classpath format) and IntelliJ Platform best practices (working directory, action update frequency)

**Research date:** 2026-02-01
**Valid until:** 2027-02-01 (stable APIs, unlikely to change)
