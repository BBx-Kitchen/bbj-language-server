# Phase 11: Run Command Fixes - Research

**Researched:** 2026-02-02
**Domain:** IntelliJ Platform action system, new UI toolbar compatibility, process output capture, tool window integration
**Confidence:** HIGH

## Summary

Phase 11 fixes known issues from Phase 8 (Run Commands) that emerged after initial implementation. The core problems are: (1) toolbar actions not visible in IntelliJ's new UI (default since 2024.2), (2) BBj executable resolution bug causing "not found" errors despite valid configuration, (3) lack of process stderr capture for debugging failed launches, and (4) missing context menu invocation from project tree.

The new UI changed toolbar architecture significantly—`MainToolBar` actions are hidden by default and users must manually add them back. The recommended solution is to register actions to both `EditorPopupMenu` (existing) and `ProjectViewPopupMenu` (new) for context menu access, while removing unreliable toolbar placement. For stderr capture, the existing `BbjServerLogToolWindowFactory` infrastructure can be reused—attach a `ProcessAdapter` to capture stderr and route it to the existing language server log window using `BbjServerService.logToConsole()`. The executable resolution bug requires investigation, but likely stems from platform-specific path handling (symbolic links, case sensitivity, or File.exists() vs Files.exists() differences).

Per CONTEXT.md decisions, this phase deliberately does NOT create a dedicated console tool window for BBj program output—BBj handles its own UI. The plugin only logs process startup errors and stderr to the existing language server log window.

**Primary recommendation:** Remove toolbar registrations (MainToolBar), add ProjectViewPopupMenu registration for context menu access, validate BBj Home/executable before launch with clear error messages to LS log window, and attach ProcessAdapter to route stderr to existing log infrastructure.

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| com.intellij.openapi.actionSystem.AnAction | Built-in | Action implementation base class | Required base for all IDE actions (menu, toolbar, keyboard) |
| com.intellij.execution.process.OSProcessHandler | Built-in | Process lifecycle monitoring and output capture | Standard ProcessHandler implementation for observing process behavior |
| com.intellij.execution.process.ProcessAdapter | Built-in | Event listener for process output streams | Standard pattern for capturing stdout/stderr from OSProcessHandler |
| com.intellij.execution.ui.ConsoleView | Built-in | Console display component | Standard interface for displaying process output in tool windows |
| com.intellij.openapi.wm.ToolWindowManager | Built-in | Programmatic tool window access | Required for showing/hiding tool windows on demand |
| java.nio.file.Files | Java 17 stdlib | Modern file system operations | More reliable than java.io.File for existence checks and symbolic link handling |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| com.intellij.execution.ui.ConsoleViewContentType | Built-in | Content type constants for console coloring | Styling log messages (ERROR_OUTPUT, SYSTEM_OUTPUT, etc.) |
| com.intellij.openapi.actionSystem.CommonDataKeys | Built-in | Data keys for retrieving context data | Getting current file from editor or project view |
| com.intellij.openapi.vfs.VirtualFile | Built-in | File abstraction for active editor file | Retrieving current BBj file path for run command |
| com.intellij.notification.NotificationGroupManager | Built-in | User-facing notification balloons | Error feedback (settings issues, validation failures) |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| ProjectViewPopupMenu | MainToolBar | Toolbar actions hidden by default in new UI; context menu more discoverable |
| ProcessAdapter | CapturingProcessHandler | ProcessAdapter allows real-time streaming to log window; CapturingProcessHandler buffers entire output |
| Files.exists() | File.exists() | File.exists() returns false for symbolic links to nonexistent targets (JDK-4956115); Files.exists() handles this correctly |
| Existing log window | New console tool window | Per CONTEXT.md, BBj handles its own UI output—no dedicated console needed, just error logging |

**Installation:**
N/A - All dependencies are built into IntelliJ Platform 2024.2+

## Architecture Patterns

### Recommended Action Structure

```
src/main/java/com/basis/bbj/intellij/actions/
├── BbjRunGuiAction.java          # GUI run action (existing)
├── BbjRunBuiAction.java          # BUI run action (existing)
├── BbjRunDwcAction.java          # DWC run action (existing)
└── BbjRunActionBase.java         # Shared logic (MODIFY: add validation, stderr capture)
```

### Pattern 1: Context Menu Registration for New UI Compatibility

**What:** Register actions to context menus instead of main toolbar for reliable visibility
**When to use:** Actions that operate on files and should be accessible from editor and project tree

**Example:**
```xml
<!-- Source: plugin.xml action registration -->
<!-- BEFORE (Phase 8 - toolbar hidden in new UI): -->
<action id="bbj.runGui" class="com.basis.bbj.intellij.actions.BbjRunGuiAction">
    <add-to-group group-id="EditorPopupMenu" anchor="first"/>
    <add-to-group group-id="MainToolBar" anchor="last"/>  <!-- HIDDEN IN NEW UI -->
    <keyboard-shortcut keymap="$default" first-keystroke="alt G"/>
</action>

<!-- AFTER (Phase 11 - context menu + project tree): -->
<action id="bbj.runGui" class="com.basis.bbj.intellij.actions.BbjRunGuiAction">
    <add-to-group group-id="EditorPopupMenu" anchor="first"/>
    <add-to-group group-id="ProjectViewPopupMenu" anchor="first"/>  <!-- NEW: project tree -->
    <keyboard-shortcut keymap="$default" first-keystroke="alt G"/>
</action>
```

**Source:** [Registering action in new ui main toolbar](https://platform.jetbrains.com/t/registering-action-in-new-ui-main-toolbar/1310), [Action System Plugin SDK](https://plugins.jetbrains.com/docs/intellij/action-system.html)

### Pattern 2: Process Stderr Capture with ProcessAdapter

**What:** Attach ProcessAdapter to OSProcessHandler to capture stderr in real-time
**When to use:** Whenever spawning external processes that may fail during startup

**Example:**
```java
// Source: IntelliJ Platform execution patterns
// Location: BbjRunActionBase.actionPerformed()

OSProcessHandler handler = new OSProcessHandler(cmd);

// Attach listener to capture stderr
handler.addProcessListener(new ProcessAdapter() {
    @Override
    public void onTextAvailable(@NotNull ProcessEvent event, @NotNull Key outputType) {
        if (outputType == ProcessOutputTypes.STDERR) {
            // Route stderr to existing language server log window
            BbjServerService service = BbjServerService.getInstance(project);
            service.logToConsole(
                "BBj run error: " + event.getText(),
                ConsoleViewContentType.ERROR_OUTPUT
            );
        }
    }

    @Override
    public void processTerminated(@NotNull ProcessEvent event) {
        int exitCode = event.getExitCode();
        if (exitCode != 0) {
            BbjServerService service = BbjServerService.getInstance(project);
            service.logToConsole(
                "BBj process exited with code: " + exitCode,
                ConsoleViewContentType.ERROR_OUTPUT
            );

            // Auto-open log window on error
            ToolWindowManager.getInstance(project)
                .getToolWindow("BBj Language Server")
                .show(null);
        }
    }
});

handler.startNotify();
```

**Source:** [OSProcessHandler examples](https://www.javatips.net/api/com.intellij.execution.process.osprocesshandler), [Execution Plugin SDK](https://plugins.jetbrains.com/docs/intellij/execution.html)

### Pattern 3: Executable Validation Before Launch

**What:** Pre-validate BBj Home and executable existence before attempting to spawn process
**When to use:** All run actions before building GeneralCommandLine

**Example:**
```java
// Source: Current BbjRunActionBase + File.exists() pitfalls
// Location: BbjRunActionBase (new method)

/**
 * Validates BBj Home configuration and executable existence.
 * Logs errors to language server log window (no notification balloon).
 *
 * @return true if valid and executable exists, false otherwise
 */
protected boolean validateBbjExecutable(@NotNull Project project) {
    BbjSettings.State state = BbjSettings.getInstance().getState();
    String bbjHome = state.bbjHomePath;

    if (bbjHome == null || bbjHome.isEmpty()) {
        logValidationError(project, "BBj Home path is not configured");
        return false;
    }

    // Use Files.exists() instead of File.exists() to handle symbolic links correctly
    String exeName = SystemInfo.isWindows ? "bbj.exe" : "bbj";
    Path executable = Paths.get(bbjHome, "bin", exeName);

    if (!Files.exists(executable)) {
        logValidationError(project,
            "BBj executable not found at: " + executable.toAbsolutePath());
        return false;
    }

    if (!Files.isRegularFile(executable)) {
        logValidationError(project,
            "BBj path exists but is not a file: " + executable.toAbsolutePath());
        return false;
    }

    // On Unix-like systems, verify executable permission
    if (!SystemInfo.isWindows && !Files.isExecutable(executable)) {
        logValidationError(project,
            "BBj file exists but is not executable: " + executable.toAbsolutePath());
        return false;
    }

    return true;
}

private void logValidationError(@NotNull Project project, @NotNull String message) {
    BbjServerService service = BbjServerService.getInstance(project);
    service.logToConsole("Run validation failed: " + message,
        ConsoleViewContentType.ERROR_OUTPUT);

    // Auto-open log window to show validation error
    ToolWindowManager.getInstance(project)
        .getToolWindow("BBj Language Server")
        .show(null);
}
```

**Why Files.exists() instead of File.exists():**
- JDK-4956115: `File.exists()` returns false for symbolic links pointing to nonexistent targets
- `Files.exists()` from java.nio.file handles symbolic links correctly
- BBj installations may use symbolic links on Unix-like systems

**Source:** [File.exists() bug JDK-4956115](https://bugs.openjdk.org/browse/JDK-4956115), [Working with Symbolic Links with Java](https://howtodoinjava.com/java/io/working-with-symbolic-links/)

### Pattern 4: Tool Window Show on Error Only

**What:** Programmatically show tool window only when errors occur
**When to use:** Validation failures, process startup errors, stderr output

**Example:**
```java
// Source: ToolWindowManager API patterns
// Location: After logging error to console

private void showLogWindowOnError(@NotNull Project project) {
    ApplicationManager.getApplication().invokeLater(() -> {
        ToolWindow toolWindow = ToolWindowManager.getInstance(project)
            .getToolWindow("BBj Language Server");

        if (toolWindow != null && !toolWindow.isVisible()) {
            toolWindow.show(null);
        }
    });
}
```

**Why invokeLater:**
- ToolWindow operations must run on EDT (Event Dispatch Thread)
- Prevents IllegalStateException when called from background threads

**Source:** [Tool Windows Plugin SDK](https://plugins.jetbrains.com/docs/intellij/tool-windows.html), [ToolWindowManager API](https://github.com/JetBrains/intellij-community/blob/master/platform/platform-api/src/com/intellij/openapi/wm/ToolWindowManager.kt)

### Pattern 5: Action Group for Context Menu Submenu

**What:** Group related actions into a submenu using DefaultActionGroup
**When to use:** Multiple related actions that clutter context menus (optional pattern)

**Example:**
```xml
<!-- Source: Grouping Actions tutorial -->
<!-- OPTIONAL: Group GUI/BUI/DWC into "Run BBj As" submenu -->

<group id="bbj.runGroup" text="Run BBj As" popup="true">
    <reference ref="bbj.runGui"/>
    <reference ref="bbj.runBui"/>
    <reference ref="bbj.runDwc"/>
    <add-to-group group-id="EditorPopupMenu" anchor="first"/>
    <add-to-group group-id="ProjectViewPopupMenu" anchor="first"/>
</group>
```

**Tradeoff:** Submenu requires extra click but reduces context menu clutter. CONTEXT.md defers structure decision to Claude's discretion.

**Source:** [Grouping Actions Tutorial](https://plugins.jetbrains.com/docs/intellij/grouping-actions-tutorial.html)

### Anti-Patterns to Avoid

- **MainToolBar registration in new UI era:** Actions hidden by default, users must manually add them back—not discoverable
- **File.exists() for executable validation:** Returns false for symbolic links to nonexistent targets (JDK-4956115)
- **Notification balloons for validation errors:** Per CONTEXT.md, no notification balloons—log to existing log window only
- **Creating dedicated console tool window:** Per CONTEXT.md, BBj handles its own UI output—reuse existing log window for errors only
- **Waiting for process completion:** Fire-and-forget pattern—plugin does not manage BBj program lifecycle
- **Hardcoded error messages:** Use absolute paths in error messages for debuggability

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Process output capture | Custom stream readers with threads | ProcessAdapter + ProcessOutputTypes | ProcessAdapter handles buffering, threading, and encoding automatically; integrates with IntelliJ's execution framework |
| Tool window visibility management | Manual show/hide state tracking | ToolWindowManager.show(null) | Platform manages visibility state, focus, and docking; handles race conditions |
| Console output formatting | String concatenation + text coloring | ConsoleViewContentType constants | Platform-provided content types (ERROR_OUTPUT, SYSTEM_OUTPUT) ensure consistent styling with IDE theme |
| Executable path validation | String manipulation + File.exists() | Files.exists() + Files.isRegularFile() + Files.isExecutable() | java.nio.file API handles symbolic links correctly (File.exists() has JDK-4956115 bug) |
| Context menu grouping | Custom JMenu/JPopupMenu | DefaultActionGroup with popup=true | Action system handles keyboard navigation, mnemonics, and dynamic update() calls automatically |

**Key insight:** IntelliJ Platform's execution and action APIs already solve process output capture, tool window management, and context menu grouping. Reimplementing these patterns introduces bugs (symbolic link handling, encoding issues, race conditions) and breaks IDE integration (theming, keyboard shortcuts, accessibility).

## Common Pitfalls

### Pitfall 1: MainToolBar Actions Hidden in New UI

**What goes wrong:** Actions registered to `MainToolBar` group are not visible by default in IntelliJ's new UI (default since 2024.2). Users must manually customize toolbar to add actions back—extremely low discoverability.

**Why it happens:** New UI simplified toolbar to reduce clutter. Only essential actions (navigation, VCS) show by default. Plugin actions must be manually added via Settings > Appearance & Behavior > Menus and Toolbars or right-click toolbar > Customize.

**How to avoid:** Register actions to context menu groups (`EditorPopupMenu`, `ProjectViewPopupMenu`) instead of or in addition to toolbar. Context menus are always visible on right-click.

**Warning signs:**
- Actions work from keyboard shortcuts but not visible in toolbar
- Actions appear in classic UI but not new UI
- User reports "buttons missing" after IntelliJ update to 2024.2+

**Sources:**
- [The New UI Becomes the Default in 2024.2](https://blog.jetbrains.com/blog/2024/07/08/the-new-ui-becomes-the-default-in-2024-2/)
- [New UI Documentation](https://www.jetbrains.com/help/idea/new-ui.html)
- [Menus and toolbars customization](https://www.jetbrains.com/help/idea/customize-actions-menus-and-toolbars.html)

### Pitfall 2: File.exists() Returns False for Valid Symbolic Links

**What goes wrong:** `java.io.File.exists()` returns false for symbolic links pointing to nonexistent targets, even though the link file itself exists. BBj installations on macOS/Linux may use symlinks for executables (e.g., `bbj` → `bbj-21.0`), causing "executable not found" errors despite valid BBj Home configuration.

**Why it happens:** JDK-4956115 (filed 2003, still present in Java 17): `File.exists()` follows symbolic links and returns false if the target doesn't exist. This is inconsistent with `File.delete()` which succeeds on such links.

**How to avoid:** Use `java.nio.file.Files.exists(Path)` instead of `java.io.File.exists()`. The NIO API correctly handles symbolic links.

**Example fix:**
```java
// WRONG: File.exists() returns false for broken symlinks
File executable = new File(bbjHome, "bin/bbj");
if (!executable.exists()) {  // FALSE even if symlink exists
    return null;
}

// CORRECT: Files.exists() handles symlinks properly
Path executable = Paths.get(bbjHome, "bin", "bbj");
if (!Files.exists(executable)) {  // TRUE if symlink exists (even if target missing)
    return null;
}
```

**Warning signs:**
- "Executable not found" errors when BBj Home is correctly configured
- Works in VSCode extension (uses Node.js fs.existsSync) but not IntelliJ
- Works on Windows but fails on macOS/Linux
- Manual `ls -la` shows executable exists but File.exists() returns false

**Sources:**
- [JDK-4956115: File.exists() reports false for symbolic links](https://bugs.openjdk.org/browse/JDK-4956115)
- [Working with Symbolic Links with Java](https://howtodoinjava.com/java/io/working-with-symbolic-links/)

### Pitfall 3: ProcessAdapter Not Attached Before startNotify()

**What goes wrong:** If you call `handler.startNotify()` before `handler.addProcessListener()`, process output events are missed. stderr/stdout from early startup are lost.

**Why it happens:** `startNotify()` immediately begins consuming process streams. Listeners added after this point only receive subsequent output.

**How to avoid:** Always attach ProcessAdapter BEFORE calling startNotify():
```java
OSProcessHandler handler = new OSProcessHandler(cmd);
handler.addProcessListener(new ProcessAdapter() { /* ... */ });  // FIRST
handler.startNotify();  // THEN
```

**Warning signs:**
- Process runs but no stderr captured in log window
- Startup errors not logged but later output appears
- Intermittent—sometimes captures output, sometimes doesn't (race condition)

**Source:** [OSProcessHandler API documentation](https://dploeger.github.io/intellij-api-doc/com/intellij/execution/process/OSProcessHandler.html)

### Pitfall 4: Tool Window Operations Not on EDT

**What goes wrong:** Calling `ToolWindowManager.getToolWindow().show()` from background thread causes IllegalStateException or deadlocks.

**Why it happens:** Tool window operations modify UI components and must run on Event Dispatch Thread (EDT).

**How to avoid:** Wrap tool window operations in `ApplicationManager.getApplication().invokeLater()`:
```java
ApplicationManager.getApplication().invokeLater(() -> {
    ToolWindow toolWindow = ToolWindowManager.getInstance(project)
        .getToolWindow("BBj Language Server");
    if (toolWindow != null) {
        toolWindow.show(null);
    }
});
```

**Warning signs:**
- IllegalStateException: "Must be called from EDT"
- Deadlocks when showing tool window
- Tool window sometimes shows, sometimes doesn't (race condition)

**Source:** [Tool Windows Plugin SDK](https://plugins.jetbrains.com/docs/intellij/tool-windows.html)

### Pitfall 5: Validation Errors with Notification Balloons

**What goes wrong:** Showing notification balloons for validation errors is invasive—users must dismiss them, and they auto-expire losing error context.

**Why it happens:** Notifications designed for transient success messages, not persistent errors requiring debugging.

**How to avoid:** Per CONTEXT.md decision: validation errors go to existing language server log window, with auto-open on error. This provides persistent error context and matches existing error handling patterns.

**Warning signs:**
- Users report "error disappeared before I could read it"
- User must reproduce error to see message again
- Error balloons spam user during repeated debugging

**Source:** CONTEXT.md Phase 11 decisions

## Code Examples

Verified patterns from IntelliJ Platform SDK and existing codebase:

### Executable Validation with Files API

```java
// Source: BbjRunActionBase (modified for Phase 11)
// Handles symbolic links correctly using java.nio.file API

@Nullable
protected String getBbjExecutablePath(@NotNull Project project) {
    BbjSettings.State state = BbjSettings.getInstance().getState();
    String bbjHome = state.bbjHomePath;

    if (bbjHome == null || bbjHome.isEmpty()) {
        logError(project, "BBj Home path is not configured");
        return null;
    }

    String exeName = SystemInfo.isWindows ? "bbj.exe" : "bbj";
    Path executable = Paths.get(bbjHome, "bin", exeName);

    // Use Files.exists() not File.exists() (handles symlinks correctly)
    if (!Files.exists(executable)) {
        logError(project, "BBj executable not found at: " + executable.toAbsolutePath());
        return null;
    }

    if (!Files.isRegularFile(executable)) {
        logError(project, "Path exists but is not a file: " + executable.toAbsolutePath());
        return null;
    }

    // Unix-like systems: verify executable permission
    if (!SystemInfo.isWindows && !Files.isExecutable(executable)) {
        logError(project, "BBj file is not executable: " + executable.toAbsolutePath());
        return null;
    }

    return executable.toAbsolutePath().toString();
}

private void logError(@NotNull Project project, @NotNull String message) {
    BbjServerService service = BbjServerService.getInstance(project);
    service.logToConsole("Run validation error: " + message, ConsoleViewContentType.ERROR_OUTPUT);

    // Auto-show log window on error
    ApplicationManager.getApplication().invokeLater(() -> {
        ToolWindow tw = ToolWindowManager.getInstance(project).getToolWindow("BBj Language Server");
        if (tw != null && !tw.isVisible()) {
            tw.show(null);
        }
    });
}
```

### Process Stderr Capture with ProcessAdapter

```java
// Source: IntelliJ Platform execution patterns
// Location: BbjRunActionBase.actionPerformed()

@Override
public void actionPerformed(@NotNull AnActionEvent e) {
    Project project = e.getProject();
    VirtualFile file = e.getData(CommonDataKeys.VIRTUAL_FILE);

    if (project == null || file == null) {
        return;
    }

    // Validate BBj executable BEFORE attempting launch
    if (!validateBbjExecutable(project)) {
        return;  // Error already logged to tool window
    }

    // Auto-save if enabled
    autoSaveIfNeeded();

    // Build command line
    GeneralCommandLine cmd = buildCommandLine(file, project);
    if (cmd == null) {
        return;
    }

    // Execute with stderr capture
    try {
        OSProcessHandler handler = new OSProcessHandler(cmd);

        // Attach stderr capture BEFORE startNotify()
        handler.addProcessListener(new ProcessAdapter() {
            @Override
            public void onTextAvailable(@NotNull ProcessEvent event, @NotNull Key outputType) {
                if (outputType == ProcessOutputTypes.STDERR) {
                    BbjServerService service = BbjServerService.getInstance(project);
                    service.logToConsole(
                        "[BBj " + getRunMode() + "] " + event.getText().trim(),
                        ConsoleViewContentType.ERROR_OUTPUT
                    );
                }
            }

            @Override
            public void processTerminated(@NotNull ProcessEvent event) {
                int exitCode = event.getExitCode();
                if (exitCode != 0) {
                    BbjServerService service = BbjServerService.getInstance(project);
                    service.logToConsole(
                        "BBj process exited with code: " + exitCode,
                        ConsoleViewContentType.ERROR_OUTPUT
                    );

                    // Auto-show log window on non-zero exit
                    ApplicationManager.getApplication().invokeLater(() -> {
                        ToolWindow tw = ToolWindowManager.getInstance(project)
                            .getToolWindow("BBj Language Server");
                        if (tw != null && !tw.isVisible()) {
                            tw.show(null);
                        }
                    });
                }
            }
        });

        handler.startNotify();

        // Success message (informational)
        BbjServerService service = BbjServerService.getInstance(project);
        service.logToConsole(
            "Launched " + file.getName() + " (" + getRunMode() + ")",
            ConsoleViewContentType.SYSTEM_OUTPUT
        );

    } catch (ExecutionException ex) {
        logError(project, "Failed to launch: " + ex.getMessage());
    }
}
```

### Context Menu Registration

```xml
<!-- Source: plugin.xml action registration -->
<!-- Add ProjectViewPopupMenu for right-click on files in project tree -->

<action id="bbj.runGui"
        class="com.basis.bbj.intellij.actions.BbjRunGuiAction"
        text="Run As BBj Program"
        description="Run current BBj file as GUI program"
        icon="com.basis.bbj.intellij.BbjIcons.RUN_GUI">
    <add-to-group group-id="EditorPopupMenu" anchor="first"/>
    <add-to-group group-id="ProjectViewPopupMenu" anchor="first"/>
    <keyboard-shortcut keymap="$default" first-keystroke="alt G"/>
</action>

<action id="bbj.runBui"
        class="com.basis.bbj.intellij.actions.BbjRunBuiAction"
        text="Run As BUI Program"
        description="Run current BBj file as BUI program in browser"
        icon="com.basis.bbj.intellij.BbjIcons.RUN_BUI">
    <add-to-group group-id="EditorPopupMenu" anchor="after" relative-to-action="bbj.runGui"/>
    <add-to-group group-id="ProjectViewPopupMenu" anchor="after" relative-to-action="bbj.runGui"/>
    <keyboard-shortcut keymap="$default" first-keystroke="alt B"/>
</action>

<action id="bbj.runDwc"
        class="com.basis.bbj.intellij.actions.BbjRunDwcAction"
        text="Run As DWC Program"
        description="Run current BBj file as DWC program in browser"
        icon="com.basis.bbj.intellij.BbjIcons.RUN_DWC">
    <add-to-group group-id="EditorPopupMenu" anchor="after" relative-to-action="bbj.runBui"/>
    <add-to-group group-id="ProjectViewPopupMenu" anchor="after" relative-to-action="bbj.runBui"/>
    <keyboard-shortcut keymap="$default" first-keystroke="alt D"/>
</action>
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| MainToolBar actions always visible | MainToolBar hidden by default, manual customization required | IntelliJ 2024.2 (Aug 2024) | Plugin actions invisible to users unless manually added; must use context menus instead |
| File.exists() for path validation | Files.exists() for symbolic link handling | Java 7 (2011, but JDK-4956115 never fixed) | File.exists() returns false for valid symlinks; causes "not found" errors on macOS/Linux |
| Notification balloons for all errors | Tool window logging for persistent errors | Best practice evolution | Balloons auto-expire and must be dismissed; tool windows provide persistent context |
| ConsoleView in dedicated tool window | Reuse existing tool windows | Best practice (avoid UI clutter) | One log window for all plugin errors vs. multiple windows |

**Deprecated/outdated:**
- `File.exists()`: Use `Files.exists()` instead (symbolic link handling)
- `MainToolBar` registration alone: Add `ProjectViewPopupMenu` for discoverability in new UI
- Notification balloons for validation errors: Use tool window logging instead

## Open Questions

Things that couldn't be fully resolved:

1. **Exact cause of "executable not found" bug**
   - What we know: User reports "BBj executable not found" despite valid BBj Home configuration (Phase 8 known issue)
   - What's unclear: Root cause—symbolic links (File.exists() bug)? Case sensitivity? Path separator issues? Permission problems?
   - Recommendation: Implement comprehensive validation with Files API and absolute path logging. If bug persists after this fix, add debug logging to capture actual file system state (Files.exists(), Files.isExecutable(), Files.readSymbolicLink() for symlinks).

2. **Submenu vs flat context menu structure**
   - What we know: CONTEXT.md defers to Claude's discretion
   - What's unclear: User preference—flat menu (3 items at top level) vs submenu (1 "Run BBj As" item with 3 children)
   - Recommendation: Start with flat structure (lower friction, matching editor popup). If user feedback indicates clutter, create submenu group in future phase.

3. **Process stderr encoding on Windows**
   - What we know: ProcessAdapter captures stderr as text
   - What's unclear: BBj executable output encoding on Windows (UTF-8? Windows-1252?)
   - Recommendation: Test on Windows with non-ASCII error messages. If encoding issues arise, use `cmd.setCharset(Charset.forName("UTF-8"))` or detect system charset.

## Sources

### Primary (HIGH confidence)

- [IntelliJ Platform Plugin SDK - Action System](https://plugins.jetbrains.com/docs/intellij/action-system.html) - Official action registration documentation
- [IntelliJ Platform Plugin SDK - Tool Windows](https://plugins.jetbrains.com/docs/intellij/tool-windows.html) - Official tool window management
- [IntelliJ Platform Plugin SDK - Execution](https://plugins.jetbrains.com/docs/intellij/execution.html) - Official process execution patterns
- [IntelliJ Platform Plugin SDK - Grouping Actions](https://plugins.jetbrains.com/docs/intellij/grouping-actions-tutorial.html) - Official action grouping tutorial
- [JetBrains Blog - New UI Default in 2024.2](https://blog.jetbrains.com/blog/2024/07/08/the-new-ui-becomes-the-default-in-2024-2/) - Official announcement of toolbar changes
- [JDK-4956115: File.exists() bug with symbolic links](https://bugs.openjdk.org/browse/JDK-4956115) - Official Java bug report

### Secondary (MEDIUM confidence)

- [Registering action in new ui main toolbar - JetBrains Platform Forum](https://platform.jetbrains.com/t/registering-action-in-new-ui-main-toolbar/1310) - Community solution for new UI toolbar issues
- [OSProcessHandler Java Examples](https://www.javatips.net/api/com.intellij.execution.process.osprocesshandler) - Community code examples
- [Working with Symbolic Links with Java](https://howtodoinjava.com/java/io/working-with-symbolic-links/) - Java NIO symbolic link handling

### Tertiary (LOW confidence)

- None - all claims verified with official documentation

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All APIs are built-in to IntelliJ Platform 2024.2, verified in official SDK docs
- Architecture: HIGH - Patterns verified in official SDK tutorials and existing codebase (BbjServerLogToolWindowFactory, BbjServerService)
- Pitfalls: HIGH - New UI toolbar issue verified in official blog post and forum discussions; File.exists() bug verified in official JDK bug tracker

**Research date:** 2026-02-02
**Valid until:** ~60 days (stable APIs, but new UI patterns may evolve in IntelliJ 2025.x releases)
