# Phase 4: Language Server Integration - Research

**Researched:** 2026-02-01
**Domain:** LSP4IJ IntelliJ plugin integration, language server lifecycle, IntelliJ UI (status bar, tool windows, notifications)
**Confidence:** HIGH

## Summary

This phase connects the existing BBj language server (Langium-based, Node.js, bundled as `main.cjs`) to the IntelliJ plugin via LSP4IJ, Red Hat's open-source LSP client for JetBrains IDEs. The research covers four domains: (1) LSP4IJ integration -- how to declare the dependency, implement `LanguageServerFactory`, wire the server process, and configure language mappings; (2) language server lifecycle -- lazy startup, crash recovery, settings-triggered restart, and clean shutdown; (3) IntelliJ UI components -- status bar widget, tool window for log output, balloon notifications, and editor banners; (4) LSP feature wiring -- how LSP4IJ handles completion, diagnostics, navigation, hover, and signature help out of the box, with optional icon customization via `LSPCompletionFeature`.

The standard approach is straightforward: LSP4IJ provides all LSP client plumbing. The plugin implements `LanguageServerFactory` to create an `OSProcessStreamConnectionProvider` that launches `node main.cjs --stdio`, registers language/file mappings in `plugin.xml`, and optionally customizes the `LanguageClientImpl` to pass `initializationOptions` (home, classpath) and handle server status changes. All LSP features (diagnostics, completion, hover, go-to-definition, signature help) work automatically once the server definition and language mapping are registered. Custom UI (status bar widget, log tool window, notifications) is built using standard IntelliJ Platform APIs.

**Primary recommendation:** Use LSP4IJ 0.19.0 as a marketplace plugin dependency with `OSProcessStreamConnectionProvider` and `GeneralCommandLine` to launch the Node.js language server over stdio. Bundle `main.cjs` as a plugin resource. Build custom status bar, tool window, and notification UX using standard IntelliJ APIs alongside LSP4IJ's server lifecycle callbacks.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| LSP4IJ | 0.19.0 | LSP client for IntelliJ (Community Edition compatible) | Only mature open-source LSP client for CE; used by 40+ plugins; handles all LSP protocol details |
| IntelliJ Platform SDK | 2024.2 (build 242) | IDE platform APIs | Target platform already decided in Phase 1 |
| vscode-languageserver/node | 9.x | Language server runtime (already in bbj-vscode) | The existing BBj language server uses this; supports stdio transport |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Eclipse LSP4J | (bundled by LSP4IJ) | Java LSP type bindings | Provided by LSP4IJ -- do NOT add separately to avoid ClassCastException |
| IntelliJ Platform Gradle Plugin | 2.11.0 | Build tooling | Already configured in Phase 1 |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| LSP4IJ | JetBrains native LSP API | Native API requires IntelliJ Ultimate until 2025.3 when CE is sunset; not viable for 2024.2 CE target |
| LSP4IJ | lsp4intellij (Ballerina) | Less mature, fewer features, smaller community |

**Installation (build.gradle.kts additions):**
```kotlin
repositories {
    mavenCentral()
    intellijPlatform {
        defaultRepositories()
    }
}

dependencies {
    intellijPlatform {
        intellijIdeaCommunity("2024.2")
        // Existing bundled plugin dependency
        bundledPlugin("org.jetbrains.plugins.textmate")
        // LSP4IJ from JetBrains Marketplace
        plugin("com.redhat.devtools.lsp4ij:0.19.0")
        // ... existing verifier, signer, instrumentation
    }
}
```

**plugin.xml addition:**
```xml
<depends>com.redhat.devtools.lsp4ij</depends>
```

## Architecture Patterns

### Recommended Project Structure
```
src/main/java/com/basis/bbj/intellij/
    BbjLanguage.java               # (existing) Language definition
    BbjFileType.java               # (existing) File type
    BbjSettings.java               # (existing) Persistent settings
    BbjIcons.java                  # (existing, extend) Icon definitions
    lsp/
        BbjLanguageServerFactory.java    # LanguageServerFactory implementation
        BbjLanguageServer.java           # OSProcessStreamConnectionProvider
        BbjLanguageClient.java           # LanguageClientImpl (initOptions, settings)
        BbjCompletionFeature.java        # LSPCompletionFeature (custom icons)
    ui/
        BbjStatusBarWidgetFactory.java   # StatusBarWidgetFactory
        BbjStatusBarWidget.java          # CustomStatusBarWidget
        BbjServerLogToolWindowFactory.java # ToolWindowFactory
        BbjRestartServerAction.java      # AnAction for Tools menu
        BbjNotificationService.java      # Balloon notifications
        BbjServerCrashNotificationProvider.java # Editor banner on crash
```

### Pattern 1: LanguageServerFactory + OSProcessStreamConnectionProvider
**What:** The central pattern for connecting IntelliJ to a Node.js language server via LSP4IJ.
**When to use:** Always -- this is the entry point for all LSP integration.
**Example:**
```java
// Source: LSP4IJ Developer Guide
// https://github.com/redhat-developer/lsp4ij/blob/main/docs/DeveloperGuide.md

public class BbjLanguageServerFactory implements LanguageServerFactory {

    @NotNull
    @Override
    public StreamConnectionProvider createConnectionProvider(@NotNull Project project) {
        return new BbjLanguageServer(project);
    }

    @NotNull
    @Override
    public LanguageClientImpl createLanguageClient(@NotNull Project project) {
        return new BbjLanguageClient(project);
    }

    @NotNull
    @Override
    public LSPClientFeatures createClientFeatures() {
        return new LSPClientFeatures()
            .setCompletionFeature(new BbjCompletionFeature());
    }
}
```

### Pattern 2: OSProcessStreamConnectionProvider with GeneralCommandLine
**What:** Launches the Node.js language server process using IntelliJ's process management.
**When to use:** For the server process lifecycle.
**Example:**
```java
// Source: LSP4IJ Developer Guide
public class BbjLanguageServer extends OSProcessStreamConnectionProvider {

    public BbjLanguageServer(@NotNull Project project) {
        BbjSettings.State settings = BbjSettings.getInstance().getState();
        String nodePath = resolveNodePath(settings);
        String serverPath = resolveServerPath();

        GeneralCommandLine cmd = new GeneralCommandLine(
            nodePath,
            serverPath,
            "--stdio"
        );
        cmd.setCharset(StandardCharsets.UTF_8);
        // Working directory can be set to project base path
        cmd.setWorkDirectory(project.getBasePath());
        super.setCommandLine(cmd);
    }
}
```

### Pattern 3: LanguageClientImpl for InitializationOptions and Settings
**What:** Passes BBj-specific settings (home path, classpath) to the language server during initialization and on settings change.
**When to use:** Required to make the language server functional -- it needs `home` and `classpath`.
**Example:**
```java
// Source: LSP4IJ Developer Guide + BBj VS Code extension analysis
public class BbjLanguageClient extends LanguageClientImpl {

    public BbjLanguageClient(@NotNull Project project) {
        super(project);
    }

    @Override
    protected Object createSettings() {
        // Return settings for workspace/didChangeConfiguration
        BbjSettings.State state = BbjSettings.getInstance().getState();
        JsonObject settings = new JsonObject();
        settings.addProperty("home", state.bbjHomePath);
        settings.addProperty("classpath", state.classpathEntry);
        return settings;
    }

    @Override
    public void handleServerStatusChanged(@NotNull ServerStatus serverStatus) {
        if (serverStatus == ServerStatus.started) {
            triggerChangeConfiguration();
        }
        // Notify status bar widget of state change
        // Notify tool window of state change
    }
}
```

### Pattern 4: plugin.xml Extension Point Registration
**What:** Declares the language server and language mapping using LSP4IJ extension points.
**When to use:** Required -- this wires everything together.
**Example:**
```xml
<!-- Source: LSP4IJ Developer Guide -->
<extensions defaultExtensionNs="com.redhat.devtools.lsp4ij">
    <server id="bbjLanguageServer"
            name="BBj Language Server"
            factoryClass="com.basis.bbj.intellij.lsp.BbjLanguageServerFactory">
        <description><![CDATA[
            BBj Language Server providing diagnostics, completion,
            navigation, hover, and signature help.
        ]]></description>
    </server>

    <languageMapping language="BBj"
                     serverId="bbjLanguageServer"
                     languageId="bbj"/>
</extensions>
```

### Pattern 5: CustomStatusBarWidget for Rich Status Display
**What:** Custom status bar widget showing server state with icon + text + popup menu.
**When to use:** The standard StatusBarWidget presentations (Icon, Text, MultipleTextValues) cannot combine icon + text. Use `CustomStatusBarWidget` for the rich display the CONTEXT requires.
**Example:**
```java
// Source: IntelliJ Platform SDK - Status Bar Widgets
// https://plugins.jetbrains.com/docs/intellij/status-bar-widgets.html
public class BbjStatusBarWidget extends EditorBasedWidget
        implements CustomStatusBarWidget {

    public static final String ID = "BbjLanguageServerStatus";

    @Override
    public JComponent getComponent() {
        // Return a JPanel with icon + label
        // Click handler opens popup menu
    }

    // Called to update when editor changes or server status changes
    public void updateStatus(ServerStatus status) {
        // Update icon color and label text
    }
}
```

### Pattern 6: ToolWindow with ConsoleView for Server Logs
**What:** Dedicated bottom panel for real-time language server stdout/stderr output.
**When to use:** Required by CONTEXT -- "BBj Language Server" tool window tab.
**Example:**
```java
// Source: IntelliJ Platform SDK - Tool Windows
// https://plugins.jetbrains.com/docs/intellij/tool-windows.html
public class BbjServerLogToolWindowFactory implements ToolWindowFactory, DumbAware {

    @Override
    public void createToolWindowContent(@NotNull Project project,
                                        @NotNull ToolWindow toolWindow) {
        ConsoleView console = TextConsoleBuilderFactory.getInstance()
            .createBuilder(project).getConsole();
        Content content = toolWindow.getContentManager()
            .getFactory().createContent(console.getComponent(),
                "BBj Language Server", false);
        toolWindow.getContentManager().addContent(content);
    }
}
```

### Anti-Patterns to Avoid
- **Embedding LSP4J directly:** LSP4IJ bundles its own LSP4J. Adding LSP4J as a dependency causes ClassCastException at runtime. Never include `org.eclipse.lsp4j` in your dependencies.
- **Using IPC transport:** The VS Code extension uses IPC transport. For LSP4IJ (and all non-VS Code clients), the server MUST be launched with `--stdio` flag so `createConnection(ProposedFeatures.all)` auto-detects stdio transport.
- **Console logging in stdio mode:** When the language server runs over stdio, stdout IS the communication channel. The language server must not write debug output to stdout. (Langium handles this internally -- it uses the connection's logging, not console.log to stdout.)
- **Building custom LSP protocol handling:** LSP4IJ handles all protocol details (JSON-RPC, message framing, request/response correlation). Never implement LSP protocol handling manually.
- **Polling for server status:** Use `handleServerStatusChanged` callback in `LanguageClientImpl`, not polling.
- **Blocking the EDT:** All server communication and process management must happen off the EDT. LSP4IJ handles this internally, but custom UI updates triggered by server status changes must use `invokeLater`.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| LSP protocol communication | Custom JSON-RPC over stdio | LSP4IJ `OSProcessStreamConnectionProvider` | Protocol framing, message correlation, cancellation, partial results all handled |
| Completion popup | Custom completion contributor | LSP4IJ `LSPCompletionContributor` (auto-registered) | Handles resolve, text edits, snippet expansion, sorting |
| Diagnostic annotations | Custom annotator/inspector | LSP4IJ diagnostic integration (auto-registered) | Handles severity mapping, quick fixes, diagnostic updates |
| Go-to-definition | Custom reference contributor | LSP4IJ definition support (auto-registered) | Handles Ctrl+Click, multiple targets, cross-file navigation |
| Hover tooltips | Custom documentation provider | LSP4IJ hover support (auto-registered) | Handles markdown rendering, syntax highlighting in fenced blocks |
| Parameter hints | Custom parameter info handler | LSP4IJ signature help (auto-registered) | Handles active parameter highlighting, overload navigation |
| Process lifecycle | Custom ProcessBuilder wrapper | `OSProcessStreamConnectionProvider` + `LanguageServerManager` | Handles streams, error logging, process tracking, graceful stop |
| Server restart | Custom stop/start sequencing | `LanguageServerManager.getInstance(project).stop()` then `.start()` | Handles pending requests, proper shutdown sequence |

**Key insight:** LSP4IJ provides virtually all LSP client functionality out of the box via extension points. Once the server and language mapping are registered, completion, diagnostics, hover, navigation, and signature help all work automatically. The only custom code needed is for: (1) server launch configuration (node path, server path, arguments), (2) initialization options, (3) custom UI (status bar, tool window, notifications), and (4) optional icon customization for completion items.

## Common Pitfalls

### Pitfall 1: LSP4J Version Conflict (ClassCastException)
**What goes wrong:** Plugin includes its own LSP4J dependency, causing ClassCastException at runtime because LSP4IJ loads LSP4J types from its own classloader.
**Why it happens:** Transitive dependencies or explicit inclusion of `org.eclipse.lsp4j`.
**How to avoid:** Never add LSP4J as a dependency. If any dependency pulls in LSP4J transitively, exclude it: `implementation("...") { exclude("org.eclipse.lsp4j") }`.
**Warning signs:** ClassCastException involving `org.eclipse.lsp4j.*` classes at runtime.

### Pitfall 2: Server Launched Without --stdio Flag
**What goes wrong:** Language server starts but no LSP communication occurs. Server appears running but plugin shows no LSP features.
**Why it happens:** The BBj language server's `createConnection(ProposedFeatures.all)` defaults to IPC when `--stdio` is not in process arguments. IPC works only within VS Code's process model.
**How to avoid:** Always include `"--stdio"` in the `GeneralCommandLine` arguments.
**Warning signs:** Server process starts, no errors, but no diagnostics/completion appear. LSP4IJ console shows no requests/responses.

### Pitfall 3: Bundled Server Path Resolution
**What goes wrong:** Plugin can't find `main.cjs` at runtime.
**Why it happens:** The language server bundle must be included as a plugin resource and resolved relative to the plugin installation directory, not the project directory.
**How to avoid:** Copy `main.cjs` into plugin resources during build (similar to existing `copyTextMateBundle` task). Resolve at runtime using `PluginManagerCore.getPlugin(PluginId.getId("...")).getPluginPath()` or include in resources jar.
**Warning signs:** FileNotFoundException or "command not found" errors when server starts.

### Pitfall 4: Zombie Node.js Processes
**What goes wrong:** Node.js processes survive after project close, consuming system resources.
**Why it happens:** Normal JVM shutdown or project disposal doesn't automatically kill child processes, especially on Windows. If the server is stopped but the process hangs, it becomes a zombie.
**How to avoid:** Use `OSProcessStreamConnectionProvider` which manages the process via IntelliJ's `OSProcessHandler`. Hook into project disposal (`Disposer.register(project, ...)`) to force-kill. The CONTEXT specifies force-kill on project close (no graceful shutdown wait).
**Warning signs:** Multiple `node` processes visible in task manager after IDE restart.

### Pitfall 5: InitializationOptions Timing
**What goes wrong:** Language server starts but has no `home` or `classpath` configuration.
**Why it happens:** Settings must be passed as `initializationOptions` during the LSP `initialize` request. If only `createSettings` is implemented (which handles `workspace/didChangeConfiguration`), the server won't receive the initial home/classpath.
**How to avoid:** Override `LSPClientFeatures.initializeParams(InitializeParams)` to set `initializationOptions` with `{ home: "...", classpath: "..." }`. Also implement `createSettings()` for subsequent configuration changes.
**Warning signs:** Server starts but reports "No bbjdir set" in logs.

### Pitfall 6: Crash Loop Without Recovery Limit
**What goes wrong:** Server crashes, auto-restarts, crashes again, creating infinite restart loop consuming CPU.
**Why it happens:** Persistent configuration error or bug causes immediate crash on startup.
**How to avoid:** Implement crash counter. Auto-restart once after first crash. If second crash occurs within a short window, stop and notify user (as specified in CONTEXT). LSP4IJ itself has a 50-attempt limit, but that's too high -- our UX requires stopping after 2.
**Warning signs:** Rapid status bar flickering between "Starting" and "Error" states.

### Pitfall 7: EDT Blocking from Server Status Updates
**What goes wrong:** UI freezes when server status changes trigger synchronous work on EDT.
**Why it happens:** `handleServerStatusChanged` callback may be called on a background thread, and updating UI components requires EDT dispatch.
**How to avoid:** All UI updates from `handleServerStatusChanged` should use `ApplicationManager.getApplication().invokeLater()`. For tool window updates, use `ToolWindowManager.invokeLater()`.
**Warning signs:** UI freezing or "slow operations on EDT" exceptions in IDE log.

### Pitfall 8: Settings Change Restart Storm
**What goes wrong:** Changing BBj home, classpath, and Node.js path in quick succession triggers 3 separate restarts.
**Why it happens:** Settings apply one at a time, each triggering a restart.
**How to avoid:** Debounce settings changes. Use an `Alarm` (IntelliJ's built-in debounce utility) with ~500ms delay. Reset the alarm on each change, so multiple rapid changes batch into a single restart.
**Warning signs:** Server restarts multiple times when user modifies settings page and clicks Apply.

## Code Examples

Verified patterns from official sources:

### Server Registration in plugin.xml
```xml
<!-- Source: LSP4IJ Developer Guide -->
<!-- https://github.com/redhat-developer/lsp4ij/blob/main/docs/DeveloperGuide.md -->
<extensions defaultExtensionNs="com.redhat.devtools.lsp4ij">
    <server id="bbjLanguageServer"
            name="BBj Language Server"
            factoryClass="com.basis.bbj.intellij.lsp.BbjLanguageServerFactory">
        <description><![CDATA[
            BBj Language Server powered by Langium. Provides diagnostics,
            code completion, go-to-definition, hover, and signature help
            for BBj source files.
        ]]></description>
    </server>

    <languageMapping language="BBj"
                     serverId="bbjLanguageServer"
                     languageId="bbj"/>
</extensions>
```

### InitializationOptions via LSPClientFeatures
```java
// Source: LSP4IJ LSP API docs
// https://github.com/redhat-developer/lsp4ij/blob/main/docs/LSPApi.md
// Combined with BBj VS Code extension analysis (initializationOptions format)
public class BbjClientFeatures extends LSPClientFeatures {

    @Override
    public void initializeParams(@NotNull InitializeParams params) {
        super.initializeParams(params);
        BbjSettings.State state = BbjSettings.getInstance().getState();
        JsonObject options = new JsonObject();
        options.addProperty("home", state.bbjHomePath);
        options.addProperty("classpath", state.classpathEntry);
        params.setInitializationOptions(options);
    }
}
```

### LanguageServerManager API for Restart
```java
// Source: LSP4IJ Developer Guide
// Stop without disabling, then start
LanguageServerManager manager = LanguageServerManager.getInstance(project);
LanguageServerManager.StopOptions stopOptions = new LanguageServerManager.StopOptions();
stopOptions.setWillDisable(false);
manager.stop("bbjLanguageServer", stopOptions);
manager.start("bbjLanguageServer");
```

### Balloon Notification
```java
// Source: IntelliJ Platform SDK - Notifications
// https://plugins.jetbrains.com/docs/intellij/notifications.html

// Register in plugin.xml:
// <notificationGroup id="BBj Language Server"
//                    displayType="STICKY_BALLOON"/>

NotificationGroupManager.getInstance()
    .getNotificationGroup("BBj Language Server")
    .createNotification(
        "BBj Language Server crashed unexpectedly",
        NotificationType.ERROR)
    .addAction(new NotificationAction("Show Log") {
        @Override
        public void actionPerformed(AnActionEvent e, Notification n) {
            // Open tool window to show log
            ToolWindow tw = ToolWindowManager.getInstance(project)
                .getToolWindow("BBj Language Server");
            if (tw != null) tw.show();
            n.expire();
        }
    })
    .notify(project);
```

### Status Bar Widget Registration
```xml
<!-- Source: IntelliJ Platform SDK - Status Bar Widgets -->
<!-- https://plugins.jetbrains.com/docs/intellij/status-bar-widgets.html -->
<extensions defaultExtensionNs="com.intellij">
    <statusBarWidgetFactory
        id="BbjLanguageServerStatus"
        implementation="com.basis.bbj.intellij.ui.BbjStatusBarWidgetFactory"/>
</extensions>
```

### Tool Window Registration
```xml
<!-- Source: IntelliJ Platform SDK - Tool Windows -->
<!-- https://plugins.jetbrains.com/docs/intellij/tool-windows.html -->
<extensions defaultExtensionNs="com.intellij">
    <toolWindow id="BBj Language Server"
                factoryClass="com.basis.bbj.intellij.ui.BbjServerLogToolWindowFactory"
                anchor="bottom"
                icon="com.basis.bbj.intellij.BbjIcons.TOOL_WINDOW"
                canCloseContents="false"/>
</extensions>
```

### Debounced Restart Using Alarm
```java
// Source: IntelliJ Platform API (com.intellij.util.Alarm)
// Used for batching rapid settings changes into single restart
private final Alarm restartAlarm = new Alarm(Alarm.ThreadToUse.POOLED_THREAD, this);
private static final int RESTART_DEBOUNCE_MS = 500;

public void scheduleRestart() {
    restartAlarm.cancelAllRequests();
    restartAlarm.addRequest(() -> {
        LanguageServerManager manager = LanguageServerManager.getInstance(project);
        LanguageServerManager.StopOptions options = new LanguageServerManager.StopOptions();
        options.setWillDisable(false);
        manager.stop("bbjLanguageServer", options);
        manager.start("bbjLanguageServer");
    }, RESTART_DEBOUNCE_MS);
}
```

### Completion Icon Override
```java
// Source: LSP4IJ LSP API docs
// https://github.com/redhat-developer/lsp4ij/blob/main/docs/LSPApi.md
public class BbjCompletionFeature extends LSPCompletionFeature {

    @Override
    public Icon getIcon(@NotNull CompletionItem item) {
        // Map LSP completion kinds to BBj-specific icons
        if (item.getKind() == CompletionItemKind.Function) {
            return BbjIcons.FUNCTION;
        }
        if (item.getKind() == CompletionItemKind.Variable) {
            return BbjIcons.VARIABLE;
        }
        if (item.getKind() == CompletionItemKind.Keyword) {
            return BbjIcons.KEYWORD;
        }
        // Fall back to LSP4IJ default icons
        return super.getIcon(item);
    }
}
```

### Tools Menu Action Registration
```xml
<!-- Source: IntelliJ Platform SDK - Actions -->
<actions>
    <action id="bbj.restartLanguageServer"
            class="com.basis.bbj.intellij.ui.BbjRestartServerAction"
            text="Restart BBj Language Server"
            description="Restart the BBj language server">
        <add-to-group group-id="ToolsMenu" anchor="last"/>
    </action>
</actions>
```

### Language Server Bundle Copy Task (build.gradle.kts)
```kotlin
// Copy bundled language server from bbj-vscode output
val copyLanguageServer by tasks.registering(Copy::class) {
    from("${projectDir}/../bbj-vscode/out/language/") {
        include("main.cjs")
    }
    into(layout.buildDirectory.dir("resources/main/language-server"))
}

tasks.named("processResources") {
    dependsOn(copyLanguageServer)
    dependsOn(copyTextMateBundle)
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| JetBrains LSP API (Ultimate only) | LSP4IJ (CE compatible) | 2023-2024 | Enables LSP in Community Edition |
| ProcessStreamConnectionProvider | OSProcessStreamConnectionProvider | LSP4IJ 0.5+ | Better process tracking, error logging in LSP console |
| Direct LanguageClientImpl settings | LSPClientFeatures.initializeParams() | LSP4IJ 0.14+ | Cleaner API for initialization options |
| Custom completion rendering | LSPCompletionFeature overrides | LSP4IJ 0.14+ | Structured customization via getIcon, getItemText, etc. |
| Gradle IntelliJ Plugin 1.x | IntelliJ Platform Gradle Plugin 2.x | 2024 | Required for modern plugin development |

**Deprecated/outdated:**
- `ProcessStreamConnectionProvider.setCommands(List<String>)`: Use `OSProcessStreamConnectionProvider.setCommandLine(GeneralCommandLine)` instead for better process management.
- Direct `NotificationGroup` construction: Use `NotificationGroupManager.getInstance().getNotificationGroup(id)` with XML-registered group.
- JetBrains LSP API for CE targeting: Not available in CE until 2025.3 when CE is sunset. Use LSP4IJ for 2024.2 CE target.

## Open Questions

Things that couldn't be fully resolved:

1. **Server Bundle Path Resolution at Runtime**
   - What we know: The language server `main.cjs` needs to be bundled as a plugin resource and resolved at runtime. Grammar files are already copied via `copyTextMateBundle` task.
   - What's unclear: The exact API for resolving files inside the installed plugin directory. Options include `PluginManagerCore.getPlugin().getPluginPath()`, `PathManager.getPluginsPath()`, or using classloader resource resolution. Need to test which approach works correctly in both development (runIde) and production.
   - Recommendation: Start with classloader resource extraction to temp directory, fall back to plugin path resolution if needed. Test during implementation.

2. **LSP4IJ Console vs Custom Tool Window**
   - What we know: LSP4IJ provides its own "LSP Console" that shows server requests/responses and stderr output. The CONTEXT requires a dedicated "BBj Language Server" tool window tab.
   - What's unclear: Whether the LSP4IJ console is sufficient or whether the custom tool window should duplicate/replace it. The CONTEXT explicitly says "real-time server stdout/stderr log output" in the tool window.
   - Recommendation: Build the custom tool window as specified in CONTEXT. It captures process stderr/stdout directly. The LSP4IJ console can remain available as an advanced debugging tool for users who know about it.

3. **Exact ServerStatus Callback Behavior**
   - What we know: `LanguageClientImpl.handleServerStatusChanged(ServerStatus)` is called with `starting`, `started`, `stopping`, `stopped`. LSP4IJ also has `none`, `checking_installed`, `installing`, `installed`, `not_installed` states.
   - What's unclear: Whether `handleServerStatusChanged` is called on the EDT or a background thread. The LSP4IJ source suggests background thread.
   - Recommendation: Always dispatch UI updates via `invokeLater()` from this callback. Test actual threading behavior during implementation.

4. **Language Server Log Output Capture**
   - What we know: `OSProcessStreamConnectionProvider` routes errors to the LSP4IJ console's Log tab. The server writes debug output via Langium's built-in logging (which goes to stderr, not stdout, in stdio mode).
   - What's unclear: Whether we can intercept the process stderr stream for our custom tool window without interfering with LSP4IJ's own error capture. May need to use a `ProcessListener` on the `OSProcessHandler`.
   - Recommendation: Investigate `OSProcessStreamConnectionProvider` subclass hooks or `ProcessListener` during implementation. Alternatively, pipe stderr to both LSP4IJ and our tool window.

## Sources

### Primary (HIGH confidence)
- LSP4IJ Developer Guide - LanguageServerFactory, OSProcessStreamConnectionProvider, LanguageClientImpl, extension points, LanguageServerManager API
  - https://github.com/redhat-developer/lsp4ij/blob/main/docs/DeveloperGuide.md
- LSP4IJ LSP API docs - LSPClientFeatures, LSPCompletionFeature, initializeParams, completion icon override
  - https://github.com/redhat-developer/lsp4ij/blob/main/docs/LSPApi.md
- LSP4IJ source code - ServerStatus enum (none, checking_installed, installing, installed, not_installed, starting, started, stopping, stopped)
  - https://github.com/redhat-developer/lsp4ij/blob/main/src/main/java/com/redhat/devtools/lsp4ij/ServerStatus.java
- LSP4IJ source code - LanguageClientImpl methods (createSettings, handleServerStatusChanged, triggerChangeConfiguration)
  - https://github.com/redhat-developer/lsp4ij/blob/main/src/main/java/com/redhat/devtools/lsp4ij/client/LanguageClientImpl.java
- LSP4IJ source code - OSProcessStreamConnectionProvider (setCommandLine, start, stop, isAlive, getPid)
  - https://github.com/redhat-developer/lsp4ij/blob/main/src/main/java/com/redhat/devtools/lsp4ij/server/OSProcessStreamConnectionProvider.java
- LSP4IJ source code - LanguageServerFactory interface (createConnectionProvider, createLanguageClient, createClientFeatures, getServerInterface)
  - https://github.com/redhat-developer/lsp4ij/blob/main/src/main/java/com/redhat/devtools/lsp4ij/LanguageServerFactory.java
- IntelliJ Platform SDK - Status Bar Widgets
  - https://plugins.jetbrains.com/docs/intellij/status-bar-widgets.html
- IntelliJ Platform SDK - Tool Windows
  - https://plugins.jetbrains.com/docs/intellij/tool-windows.html
- IntelliJ Platform SDK - Notifications
  - https://plugins.jetbrains.com/docs/intellij/notifications.html
- IntelliJ Platform Gradle Plugin 2.x - Dependencies Extension (plugin marketplace dependencies)
  - https://plugins.jetbrains.com/docs/intellij/tools-intellij-platform-gradle-plugin-dependencies-extension.html
- BBj VS Code extension source - Language server launch, initializationOptions format: `{ home: string, classpath: string }`
  - Local: `bbj-vscode/src/extension.ts` (lines 399-444)
- BBj language server source - main.ts uses `createConnection(ProposedFeatures.all)` supporting stdio with `--stdio` flag
  - Local: `bbj-vscode/src/language/main.ts`
- BBj workspace manager source - initializationOptions handling: `params.initializationOptions.home`, `params.initializationOptions.classpath`
  - Local: `bbj-vscode/src/language/bbj-ws-manager.ts` (lines 30-41)

### Secondary (MEDIUM confidence)
- LSP4IJ gradle.properties - pluginSinceBuild=242, platformVersion=2024.2, current version 0.19.2-SNAPSHOT
  - https://github.com/redhat-developer/lsp4ij/blob/main/gradle.properties
- LSP4IJ GitHub releases - Latest stable: 0.19.0 (Dec 4, 2024), 0.19.1 (Dec 17, 2024)
  - https://github.com/redhat-developer/lsp4ij/releases
- Clojure LSP IntelliJ build.gradle.kts - Real-world example of LSP4IJ plugin dependency declaration
  - https://github.com/clojure-lsp/clojure-lsp-intellij/blob/master/build.gradle.kts
- vscode-languageserver stdio transport - `createConnection(ProposedFeatures.all)` auto-detects `--stdio` from process.argv
  - Multiple sources (Snyk, VS Code extension guide, GitHub examples)

### Tertiary (LOW confidence)
- LSP4IJ status bar widget support - Issue #212 requesting built-in status widget; not yet implemented as of research date
  - https://github.com/redhat-developer/lsp4ij/issues/212
- JetBrains native LSP timeline - CE support in 2025.3 when unified distribution launches (blog post Sep 2025)
  - https://blog.jetbrains.com/platform/2025/09/the-lsp-api-is-now-available-to-all-intellij-idea-users-and-plugin-developers/

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - LSP4IJ source code and developer guide directly examined; API methods verified against source
- Architecture: HIGH - Patterns derived from official LSP4IJ docs, IntelliJ Platform SDK, and existing BBj codebase analysis
- Pitfalls: HIGH - Confirmed through official documentation (LSP4J conflict), source code analysis (stdio transport), and community issues
- UI patterns: MEDIUM - StatusBarWidget and ToolWindow patterns from official SDK docs; some implementation details (like process stderr interception) need validation during implementation
- Completion icons: HIGH - `LSPCompletionFeature.getIcon()` method confirmed in LSP API docs with override example

**Research date:** 2026-02-01
**Valid until:** 2026-03-01 (30 days -- LSP4IJ is actively developed but core APIs stable)
