# Phase 5: Java Interop - Research

**Researched:** 2026-02-01
**Domain:** IntelliJ Platform UI components (status bar widgets, editor banners, settings), debounced configuration changes, external service connection management
**Confidence:** HIGH

## Summary

This phase adds UI components and configuration for connecting to the java-interop service (runs inside BBjServices on localhost:5008), enabling Java class and method completions in the language server. The research covers three domains: (1) IntelliJ Platform status bar widgets -- how to register, control visibility by file type, implement clickable popups with actions, and create separate widgets for independent concerns; (2) editor notification banners -- how to implement persistent (non-dismissible) banners via EditorNotificationProvider, add action links, and control visibility based on conditions; (3) settings and debouncing -- how to add fields to existing settings pages, detect changes, and use IntelliJ's Alarm class to debounce rapid changes into a single server restart.

The standard approach is well-established: status bar widgets use StatusBarWidgetFactory extension point with CustomStatusBarWidget for rich display (icon + text + popup). Editor banners use EditorNotificationProvider with EditorNotificationPanel for persistent notifications. Settings changes trigger debounced restarts via Alarm.cancelAllRequests() + Alarm.addRequest() with a ~500ms delay. All UI updates from background threads must use ApplicationManager.invokeLater(). The java-interop configuration (host/port) is passed to the language server via initializationOptions, matching the pattern already implemented in Phase 4. The language server manages the java-interop connection autonomously -- the plugin only provides configuration and surfaces status to users.

**Primary recommendation:** Build a second status bar widget (separate from the existing LSP widget) for java-interop status, reuse the existing editor banner pattern for "java-interop unavailable" notifications, add port field to the existing BbjSettingsComponent, and reuse the existing debounced restart mechanism via BbjServerService.scheduleRestart().

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| IntelliJ Platform SDK | 2024.2 (build 242) | IDE platform APIs | Already in use from Phase 1/4; provides StatusBarWidget, EditorNotificationProvider, Configurable APIs |
| LSP4IJ | 0.19.0 | LSP client for IntelliJ | Already in use from Phase 4; initializationOptions API used to pass java-interop config to language server |
| com.intellij.util.Alarm | Platform built-in | Debouncing utility | Standard IntelliJ Platform debounce mechanism; used for batching rapid settings changes |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| com.intellij.ui.EditorNotificationPanel | Platform built-in | Persistent banner UI | For non-dismissible "start BBjServices" banner when java-interop unavailable |
| com.intellij.openapi.wm.CustomStatusBarWidget | Platform built-in | Rich status widget | For icon + text + popup menu display (standard presentations can't combine icon + text) |
| com.intellij.openapi.application.ApplicationManager | Platform built-in | EDT dispatching | Required when updating UI from background threads (server status callbacks) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Separate java-interop status widget | Combined LSP + java-interop widget | User decision specifies separate widgets; clearer separation of concerns |
| EditorNotificationPanel | Balloon notification | Banners stay visible until resolved; balloons dismiss -- banner matches "missing BBj home" pattern |
| Alarm for debouncing | Custom Timer/ScheduledExecutorService | Alarm is IntelliJ's standard; integrates with Disposable lifecycle, handles EDT dispatch correctly |

**Installation:**
No additional dependencies -- all APIs are part of IntelliJ Platform SDK already included in Phase 4.

## Architecture Patterns

### Recommended Project Structure
```
src/main/java/com/basis/bbj/intellij/
    BbjSettings.java                    # (existing) Add javaInteropHost, javaInteropPort fields
    BbjSettingsComponent.java           # (existing) Add host (static text), port (editable) fields
    BbjSettingsConfigurable.java        # (existing) Trigger restart on port change
    lsp/
        BbjLanguageClient.java          # (existing) Pass java-interop config in initializationOptions
    ui/
        BbjStatusBarWidget.java             # (existing) LSP status widget
        BbjJavaInteropStatusBarWidget.java  # (new) Java-interop status widget
        BbjJavaInteropStatusBarWidgetFactory.java # (new) Factory for java-interop widget
        BbjJavaInteropNotificationProvider.java   # (new) "Start BBjServices" banner
        BbjServerService.java               # (existing) scheduleRestart() already implemented
```

### Pattern 1: Separate Status Bar Widget for Java Interop
**What:** A second status bar widget specifically for java-interop connection state, independent of the LSP widget.
**When to use:** User decision specifies separate indicator for java-interop status.
**Example:**
```java
// Source: IntelliJ Platform SDK - Status Bar Widgets
// https://plugins.jetbrains.com/docs/intellij/status-bar-widgets.html
// Combined with existing BbjStatusBarWidget pattern

public class BbjJavaInteropStatusBarWidget implements CustomStatusBarWidget {
    private static final String ID = "BbjJavaInteropStatus";
    private final Project project;
    private final JPanel panel;
    private final JBLabel iconLabel;
    private final JBLabel textLabel;

    // Subscribe to java-interop status changes (via message bus)
    // Update icon + text based on state (connected/connecting/disconnected)
    // Show popup on click with host, port, connection duration, "Reconnect" action

    private void updateStatus(JavaInteropStatus status) {
        ApplicationManager.getApplication().invokeLater(() -> {
            // Update icon and text based on status
            // connected -> green icon, "Java Interop: Connected"
            // connecting -> yellow icon, "Java Interop: Connecting"
            // disconnected -> red icon, "Java Interop: Disconnected"
            updateVisibility();
        });
    }

    private void updateVisibility() {
        // Same pattern as existing LSP widget: only show when BBj file is open
        VirtualFile[] files = FileEditorManager.getInstance(project).getSelectedFiles();
        boolean hasBbjFile = /* check for .bbj/.bbl/.bbjt/.src */;
        panel.setVisible(hasBbjFile);
    }
}
```

### Pattern 2: Persistent Editor Banner for Java Interop Unavailable
**What:** Non-dismissible banner at top of editor when java-interop is unavailable (BBjServices not running).
**When to use:** When language server reports java-interop connection failed.
**Example:**
```java
// Source: IntelliJ Platform SDK - Banner (design guidelines)
// https://plugins.jetbrains.com/docs/intellij/banner.html
// Combined with existing BbjMissingHomeNotificationProvider pattern

public class BbjJavaInteropNotificationProvider implements EditorNotificationProvider {

    @Override
    public @Nullable Function<? super FileEditor, ? extends JComponent>
        collectNotificationData(@NotNull Project project, @NotNull VirtualFile file) {

        // Only show for BBj files
        if (!isBbjFile(file)) {
            return null;
        }

        // Check java-interop status from BbjServerService
        JavaInteropStatus status = BbjServerService.getInstance(project).getJavaInteropStatus();
        if (status == JavaInteropStatus.CONNECTED) {
            return null; // No banner when connected
        }

        // Show banner after brief grace period (avoid flashing on transient disconnect)
        long disconnectedDuration = System.currentTimeMillis() - status.getDisconnectedSince();
        if (disconnectedDuration < GRACE_PERIOD_MS) {
            return null;
        }

        return fileEditor -> {
            EditorNotificationPanel panel = new EditorNotificationPanel(fileEditor, Status.Warning);
            panel.setText("Start BBjServices for Java completions");
            panel.createActionLabel("Open Settings", () -> {
                ShowSettingsUtil.getInstance().showSettingsDialog(project, "BBj");
            });
            return panel;
        };
    }
}
```

### Pattern 3: Settings Fields for Java Interop Configuration
**What:** Add host (static "localhost" text) and port (editable numeric field) to existing BbjSettingsComponent.
**When to use:** Required for user to configure java-interop connection.
**Example:**
```java
// Extend existing BbjSettingsComponent

public class BbjSettingsComponent {
    // Existing: bbjHomeField, nodePathField, classpathComboBox, logLevelComboBox

    private JBLabel javaInteropHostLabel; // Static text: "localhost"
    private JBTextField javaInteropPortField;

    public BbjSettingsComponent(Disposable parent) {
        // ... existing fields ...

        // Java Interop section
        GridBagConstraints gbc = /* ... */;
        panel.add(new JBLabel("Java Interop:"), gbc);

        // Host: static "localhost" text (not editable)
        javaInteropHostLabel = new JBLabel("localhost");
        panel.add(javaInteropHostLabel, gbc);

        // Port: editable field with validation
        javaInteropPortField = new JBTextField();
        ComponentValidator portValidator = new ComponentValidator(parent)
            .withValidator(() -> {
                String text = javaInteropPortField.getText();
                if (text.isEmpty()) return null; // Allow empty (uses default)
                try {
                    int port = Integer.parseInt(text);
                    if (port < 1 || port > 65535) {
                        return new ValidationInfo("Port must be 1-65535", javaInteropPortField);
                    }
                } catch (NumberFormatException e) {
                    return new ValidationInfo("Port must be a number", javaInteropPortField);
                }
                return null;
            })
            .installOn(javaInteropPortField);
        panel.add(javaInteropPortField, gbc);
    }

    public String getJavaInteropHost() {
        return "localhost"; // Always localhost for this phase
    }

    public String getJavaInteropPort() {
        return javaInteropPortField.getText();
    }

    public void setJavaInteropPort(String port) {
        javaInteropPortField.setText(port);
    }
}
```

### Pattern 4: Auto-Detection of Java Interop Port from BBjServices Config
**What:** Read BBj.properties or BBjServices config to detect java-interop port; fall back to 5008 default.
**When to use:** Optional enhancement; simplifies configuration for users with standard BBjServices setup.
**Example:**
```java
// Low confidence pattern -- BBjServices config format not fully documented
// Implement as "nice to have" with fallback to 5008

public class BbjJavaInteropDetector {

    /**
     * Attempts to detect java-interop port from BBjServices configuration.
     * Priority: BBjServices config > 5008 default
     *
     * @param bbjHomePath BBj installation directory
     * @return detected port as string, or "5008" if not found
     */
    public static String detectJavaInteropPort(@NotNull String bbjHomePath) {
        // Strategy 1: Check BBj.properties for java-interop port setting
        Path propertiesPath = Paths.get(bbjHomePath, "cfg", "BBj.properties");
        String portFromProperties = readPortFromProperties(propertiesPath);
        if (portFromProperties != null) {
            return portFromProperties;
        }

        // Strategy 2: Check Enterprise Manager config (if accessible)
        // (format unclear from research -- may need empirical investigation)

        // Fallback: default port
        return "5008";
    }

    private static String readPortFromProperties(Path propertiesPath) {
        // Look for patterns like:
        // - java.interop.port=5008
        // - javaInterop.port=5008
        // - bridge.port=5008 (if java-interop uses bridge server)
        // (actual property name needs empirical verification)
        return null; // Return null if not found
    }
}
```

### Pattern 5: Debounced Restart on Port Change
**What:** Reuse existing BbjServerService.scheduleRestart() to debounce java-interop port changes.
**When to use:** When user changes port in settings and clicks Apply.
**Example:**
```java
// BbjSettingsConfigurable already implements this pattern for existing settings

@Override
public void apply() {
    if (myComponent == null) return;

    BbjSettings.State state = BbjSettings.getInstance().getState();

    // Existing settings
    state.bbjHomePath = myComponent.getBbjHomePath();
    state.nodeJsPath = myComponent.getNodeJsPath();
    state.classpathEntry = myComponent.getClasspathEntry();
    state.logLevel = myComponent.getLogLevel();

    // NEW: Java interop settings
    state.javaInteropHost = myComponent.getJavaInteropHost(); // Always "localhost"
    state.javaInteropPort = myComponent.getJavaInteropPort();

    // Refresh editor banners (existing pattern)
    for (var project : ProjectManager.getInstance().getOpenProjects()) {
        EditorNotifications.getInstance(project).updateAllNotifications();
    }

    // Trigger debounced restart (existing pattern)
    // BbjServerService.scheduleRestart() uses Alarm with 500ms delay
    for (var project : ProjectManager.getInstance().getOpenProjects()) {
        BbjServerService.getInstance(project).scheduleRestart();
    }
}
```

### Pattern 6: InitializationOptions with Java Interop Config
**What:** Extend existing initializationOptions (home, classpath) with java-interop config.
**When to use:** Language server needs java-interop host/port to connect on startup.
**Example:**
```java
// Extend existing BbjLanguageClient pattern from Phase 4

public class BbjLanguageClient extends LanguageClientImpl {
    // (existing code for createSettings)

    // BbjLanguageServerFactory.createClientFeatures() returns BbjClientFeatures
}

public class BbjClientFeatures extends LSPClientFeatures {

    @Override
    public void initializeParams(@NotNull InitializeParams params) {
        super.initializeParams(params);
        BbjSettings.State state = BbjSettings.getInstance().getState();

        JsonObject options = new JsonObject();
        // Existing from Phase 4
        options.addProperty("home", state.bbjHomePath);
        options.addProperty("classpath", state.classpathEntry);

        // NEW: Java interop config
        options.addProperty("javaInteropHost", state.javaInteropHost);
        options.addProperty("javaInteropPort", state.javaInteropPort);

        params.setInitializationOptions(options);
    }
}
```

### Pattern 7: Popup Details for Java Interop Widget
**What:** Clickable java-interop status widget shows popup with connection details and actions.
**When to use:** User clicks java-interop status widget to see details or reconnect.
**Example:**
```java
// BbjJavaInteropStatusBarWidget implementation

private void showPopupMenu(MouseEvent e) {
    JPopupMenu popup = new JPopupMenu();

    // Connection details (non-clickable info)
    JavaInteropStatus status = BbjServerService.getInstance(project).getJavaInteropStatus();
    popup.add(new JMenuItem("Host: " + status.getHost()) {{ setEnabled(false); }});
    popup.add(new JMenuItem("Port: " + status.getPort()) {{ setEnabled(false); }});

    if (status.isConnected()) {
        long duration = System.currentTimeMillis() - status.getConnectedSince();
        String durationStr = formatDuration(duration);
        popup.add(new JMenuItem("Connected: " + durationStr) {{ setEnabled(false); }});
    }

    popup.addSeparator();

    // Reconnect action
    JMenuItem reconnectItem = new JMenuItem("Reconnect");
    reconnectItem.addActionListener(event -> {
        BbjServerService.getInstance(project).reconnectJavaInterop();
    });
    popup.add(reconnectItem);

    // Open Settings action
    JMenuItem settingsItem = new JMenuItem("Open Settings");
    settingsItem.addActionListener(event -> {
        ShowSettingsUtil.getInstance().showSettingsDialog(project, "BBj");
    });
    popup.add(settingsItem);

    popup.show(panel, e.getX(), e.getY());
}
```

### Anti-Patterns to Avoid
- **Combining LSP and java-interop widgets:** User decision specifies separate widgets; don't combine into one.
- **Dismissible banner for java-interop unavailable:** Use EditorNotificationPanel without dismiss button (matches "missing BBj home" pattern).
- **Immediate banner on disconnect:** Use grace period (suggested: 2-3 seconds) to avoid flashing on transient disconnects.
- **Editable host field in this phase:** Host is localhost-only; display as static text, not editable field.
- **Blocking EDT in status update callbacks:** Always use ApplicationManager.invokeLater() when updating UI from background threads.
- **Multiple restart triggers without debouncing:** Reuse existing BbjServerService.scheduleRestart() -- it already implements 500ms debounce.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Debouncing settings changes | Custom Timer/delay logic | com.intellij.util.Alarm | Platform standard; integrates with Disposable lifecycle; handles EDT correctly |
| EDT dispatch from background thread | SwingUtilities.invokeLater | ApplicationManager.getApplication().invokeLater() | IntelliJ Platform standard; supports read/write actions, modal context |
| Status widget visibility control | Manual show/hide on file change events | Implement visibility check in updateVisibility() called from file editor listener | Pattern already proven in existing BbjStatusBarWidget |
| Settings validation | Manual error dialogs | ComponentValidator with ValidationInfo | Inline validation with visual feedback; consistent with platform UX |
| Persistent editor banner | Custom panel in editor | EditorNotificationProvider + EditorNotificationPanel | Platform-managed lifecycle; automatic positioning; consistent styling |

**Key insight:** IntelliJ Platform provides comprehensive UI component APIs (StatusBarWidget, EditorNotificationPanel, Alarm, ComponentValidator) that handle complex lifecycle, threading, and EDT dispatch concerns. Don't build custom alternatives -- use the platform APIs directly.

## Common Pitfalls

### Pitfall 1: Missing Grace Period on Disconnect
**What goes wrong:** Banner flashes briefly when BBjServices restarts or experiences transient network hiccup.
**Why it happens:** EditorNotificationProvider returns banner immediately when java-interop status changes to disconnected.
**How to avoid:** Track disconnect timestamp. Only show banner if disconnected for > grace period (suggested: 2-3 seconds).
**Warning signs:** User reports "flickering banner" when BBjServices is running normally.

### Pitfall 2: Widget Not Visible When Expected
**What goes wrong:** Java-interop status widget doesn't appear even when BBj file is open.
**Why it happens:** Visibility check runs once at widget creation; doesn't update when editor changes.
**How to avoid:** Subscribe to FileEditorManagerListener and call updateVisibility() on file selection change. Match existing BbjStatusBarWidget pattern.
**Warning signs:** Widget only appears on first BBj file open, not subsequent files.

### Pitfall 3: Port Auto-Detection Breaks on Non-Standard Config
**What goes wrong:** Auto-detection reads wrong port or crashes on unexpected BBj.properties format.
**Why it happens:** BBjServices config format not fully documented; may vary by version or customization.
**How to avoid:** Wrap auto-detection in try-catch, always fall back to 5008 default. Make port editable so user can override if auto-detection is wrong.
**Warning signs:** Settings page crashes or shows incorrect port on non-standard BBjServices installations.

### Pitfall 4: Language Server Doesn't Receive Updated Port
**What goes wrong:** User changes port in settings, server restarts, but still tries old port.
**Why it happens:** initializationOptions only sent on initial server start. Settings change triggers restart, but new initializationOptions not passed.
**How to avoid:** Ensure BbjClientFeatures.initializeParams() reads BbjSettings.getInstance().getState() at call time (not cached at construction).
**Warning signs:** Port change requires IntelliJ restart to take effect.

### Pitfall 5: EDT Blocking from Status Updates
**What goes wrong:** UI freezes when java-interop status changes rapidly.
**Why it happens:** Status update callback does heavy work on EDT or synchronously queries external state.
**How to avoid:** Keep status update callback lightweight; use ApplicationManager.invokeLater() for UI updates; cache status in BbjServerService rather than querying language server synchronously.
**Warning signs:** "Slow operations on EDT" warnings in IDE log when java-interop connects/disconnects.

### Pitfall 6: Banner Doesn't Disappear When BBjServices Starts
**What goes wrong:** "Start BBjServices" banner stays visible even after BBjServices is running.
**Why it happens:** EditorNotificationProvider doesn't re-evaluate when java-interop status changes.
**How to avoid:** Call EditorNotifications.getInstance(project).updateAllNotifications() when java-interop status changes to connected.
**Warning signs:** User reports banner still visible after starting BBjServices; only disappears on file close/reopen.

### Pitfall 7: Multiple Restarts on Rapid Settings Changes
**What goes wrong:** User changes BBj home, classpath, and java-interop port rapidly; server restarts 3 times.
**Why it happens:** Settings apply one at a time if user edits all three fields before clicking Apply.
**How to avoid:** Existing BbjServerService.scheduleRestart() already uses Alarm with 500ms debounce -- reuse it unchanged.
**Warning signs:** Server restart count in log doesn't match user Apply clicks.

## Code Examples

Verified patterns from official sources:

### Status Widget Factory Registration (plugin.xml)
```xml
<!-- Source: IntelliJ Platform SDK - Status Bar Widgets -->
<!-- https://plugins.jetbrains.com/docs/intellij/status-bar-widgets.html -->
<extensions defaultExtensionNs="com.intellij">
    <!-- Existing LSP widget -->
    <statusBarWidgetFactory
        id="BbjLanguageServerStatus"
        implementation="com.basis.bbj.intellij.ui.BbjStatusBarWidgetFactory"/>

    <!-- NEW: Java-interop widget -->
    <statusBarWidgetFactory
        id="BbjJavaInteropStatus"
        implementation="com.basis.bbj.intellij.ui.BbjJavaInteropStatusBarWidgetFactory"/>
</extensions>
```

### Editor Notification Provider Registration (plugin.xml)
```xml
<!-- Source: IntelliJ Platform SDK - Banner -->
<extensions defaultExtensionNs="com.intellij">
    <!-- Existing banners: missing node, missing home -->

    <!-- NEW: Java-interop unavailable banner -->
    <editorNotificationProvider
        implementation="com.basis.bbj.intellij.ui.BbjJavaInteropNotificationProvider"/>
</extensions>
```

### Alarm Debounce Pattern
```java
// Source: IntelliJ Platform community discussion
// https://intellij-support.jetbrains.com/hc/en-us/community/posts/115000133264
// Already implemented in BbjServerService from Phase 4

public class BbjServerService {
    private final Alarm restartAlarm = new Alarm(Alarm.ThreadToUse.POOLED_THREAD, this);
    private static final int RESTART_DEBOUNCE_MS = 500;

    public void scheduleRestart() {
        restartAlarm.cancelAllRequests();
        restartAlarm.addRequest(() -> {
            // Stop and restart language server
            LanguageServerManager manager = LanguageServerManager.getInstance(project);
            LanguageServerManager.StopOptions options = new LanguageServerManager.StopOptions();
            options.setWillDisable(false);
            manager.stop("bbjLanguageServer", options);
            manager.start("bbjLanguageServer");
        }, RESTART_DEBOUNCE_MS);
    }
}
```

### EditorNotificationPanel with Action Link
```java
// Source: IntelliJ Platform SDK - Banner (design guidelines)
// Combined with existing BbjMissingHomeNotificationProvider pattern

EditorNotificationPanel panel = new EditorNotificationPanel(fileEditor, Status.Warning);
panel.setText("Start BBjServices for Java completions");
panel.createActionLabel("Open Settings", () -> {
    ShowSettingsUtil.getInstance().showSettingsDialog(project, "BBj");
});
return panel;
```

### ComponentValidator for Port Field
```java
// Source: IntelliJ Platform Javadoc
// Already used in BbjSettingsComponent for BBj home path

ComponentValidator portValidator = new ComponentValidator(parent)
    .withValidator(() -> {
        String text = portField.getText();
        if (text.isEmpty()) {
            return null; // Empty is valid (falls back to default)
        }
        try {
            int port = Integer.parseInt(text);
            if (port < 1 || port > 65535) {
                return new ValidationInfo("Port must be 1-65535", portField);
            }
        } catch (NumberFormatException e) {
            return new ValidationInfo("Port must be a number", portField);
        }
        return null;
    })
    .installOn(portField);
```

### ApplicationManager.invokeLater for UI Updates
```java
// Source: IntelliJ Platform Javadoc
// Already used in existing BbjStatusBarWidget

private void updateStatus(ServerStatus status) {
    ApplicationManager.getApplication().invokeLater(() -> {
        // Update icon and text on EDT
        iconLabel.setIcon(getIconForStatus(status));
        textLabel.setText(getTextForStatus(status));
        updateVisibility();
    });
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Combined status indicator | Separate widgets for LSP and java-interop | 2026 (this phase) | Clearer separation; independent lifecycle |
| Dismissible banners | Persistent EditorNotificationPanel | IntelliJ 2020+ | Banners stay visible until condition resolved |
| Manual debouncing | com.intellij.util.Alarm | Always | Platform-managed lifecycle; correct EDT handling |
| SwingUtilities.invokeLater | ApplicationManager.invokeLater | IntelliJ Platform standard | Supports read/write actions, modal context |

**Deprecated/outdated:**
- Balloon notifications for persistent conditions: Use EditorNotificationPanel for conditions that need to stay visible until resolved.
- Custom Timer for debouncing: Use com.intellij.util.Alarm which integrates with IntelliJ's Disposable lifecycle.

## Open Questions

Things that couldn't be fully resolved:

1. **BBjServices Config Format for Java Interop Port**
   - What we know: Default port is 5008 (from CONTEXT and java-interop.ts DEFAULT_PORT). BBj.properties lives in bbjhome/cfg. Properties use basis.classpath.* format.
   - What's unclear: Exact property name for java-interop port (java.interop.port? javaInterop.port? bridge.port?). Whether java-interop port is configurable in BBjServices or hardcoded.
   - Recommendation: Implement auto-detection as "nice to have" with try-catch and 5008 fallback. If auto-detection proves complex during implementation, defer to backlog. Editable port field allows user override regardless.

2. **Java Interop Status Source**
   - What we know: Language server connects to java-interop via socket (java-interop.ts createSocket()). Connection failures logged to console.
   - What's unclear: Whether language server exposes java-interop connection status via LSP protocol (custom notification/request) or whether plugin must infer status (successful startup + no errors = connected).
   - Recommendation: Check if LSP4IJ or language server can provide java-interop status. If not available, implement simple heuristic: assume connected if language server started successfully, disconnected if server reports java-interop errors. Refine based on actual language server behavior during implementation.

3. **Grace Period Duration**
   - What we know: Brief grace period needed to avoid flashing banner on transient disconnects.
   - What's unclear: Optimal duration -- too short and banner flashes, too long and user doesn't see important info.
   - Recommendation: Start with 2 seconds. Make configurable if users report issues. Test with actual BBjServices restart scenarios during implementation.

4. **Reconnect Action Behavior**
   - What we know: User can click "Reconnect" in java-interop widget popup. Language server manages java-interop connection autonomously.
   - What's unclear: Whether "reconnect" should restart entire language server (which re-triggers java-interop connection) or if language server exposes a java-interop-specific reconnect API.
   - Recommendation: Reconnect = full language server restart (BbjServerService.restart()). This is simplest and matches the "restart on settings change" pattern. If language server later adds java-interop-specific reconnect, can refine.

## Sources

### Primary (HIGH confidence)
- IntelliJ Platform SDK - Status Bar Widgets
  - https://plugins.jetbrains.com/docs/intellij/status-bar-widgets.html
  - StatusBarWidgetFactory extension point, CustomStatusBarWidget for icon + text + popup
- IntelliJ Platform SDK - Banner (design guidelines)
  - https://plugins.jetbrains.com/docs/intellij/banner.html
  - EditorNotificationProvider, EditorNotificationPanel, persistent banners
- IntelliJ Platform SDK - Settings Guide
  - https://plugins.jetbrains.com/docs/intellij/settings-guide.html
  - Configurable lifecycle, createComponent/reset/apply/isModified
- IntelliJ Platform community - Alarm debounce pattern
  - https://intellij-support.jetbrains.com/hc/en-us/community/posts/115000133264
  - Alarm.cancelAllRequests() + addRequest() pattern
- BBj VS Code extension - Java interop initialization
  - Local: bbj-vscode/src/extension.ts (lines 426-429)
  - initializationOptions format: { home: string, classpath: string }
- BBj language server - Java interop default port
  - Local: bbj-vscode/src/language/java-interop.ts (line 18)
  - DEFAULT_PORT = 5008
- Existing IntelliJ plugin patterns
  - Local: bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjSettings.java
  - Local: bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjSettingsConfigurable.java
  - Local: bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjStatusBarWidget.java
  - Alarm debounce, ComponentValidator, CustomStatusBarWidget, MessageBus patterns

### Secondary (MEDIUM confidence)
- GitHub EditorNotificationProvider examples
  - https://github.com/JetBrains/intellij-community/blob/idea/243.22562.145/platform/platform-api/src/com/intellij/ui/EditorNotificationPanel.java
  - EditorNotificationPanel API methods
- IntelliJ Platform SDK - Notifications
  - https://plugins.jetbrains.com/docs/intellij/notifications.html
  - Balloon vs banner guidance
- BASIS BBj documentation - Default ports
  - https://basis.cloud/knowledge-base/kb00967/
  - BBjServices default ports (Bridge Server: 2007, Admin Server: 2002, etc.)

### Tertiary (LOW confidence)
- BBjServices java-interop port configuration
  - No official documentation found for java-interop port configuration
  - Auto-detection mechanism not verified -- implement with fallback

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All APIs part of IntelliJ Platform SDK verified against official docs
- Architecture: HIGH - Patterns derived from official SDK docs and existing plugin implementation (Phase 4)
- Pitfalls: HIGH - Based on official docs, community patterns, and existing plugin experience
- Java-interop config auto-detection: LOW - BBjServices config format not documented; implement with try-catch fallback
- Java-interop status source: MEDIUM - Language server connection logic verified in source; status exposure mechanism needs validation during implementation

**Research date:** 2026-02-01
**Valid until:** 2026-03-01 (30 days -- IntelliJ Platform APIs stable)
