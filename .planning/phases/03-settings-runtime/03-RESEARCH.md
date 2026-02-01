# Phase 3: Settings & Runtime - Research

**Researched:** 2026-02-01
**Domain:** IntelliJ Platform plugin settings UI, Node.js detection, BBj environment configuration
**Confidence:** HIGH

## Summary

This phase implements the configuration UI and runtime detection for the BBj IntelliJ plugin. The research covers three major areas: (1) IntelliJ Platform settings persistence and UI using `PersistentStateComponent` + `Configurable`, (2) Node.js binary detection on the system PATH using core IntelliJ APIs (no dependency on the commercial Node.js plugin), and (3) editor notification banners via `EditorNotificationProvider` for missing configuration.

The IntelliJ Platform provides a well-documented, structured approach: a `@State`-annotated service stores settings as XML, a `Configurable` wires a Swing panel to those settings, and `EditorNotificationProvider` shows file-level banners. All three APIs are part of the core platform and work in Community Edition. The VS Code extension's LSP initialization contract (`{home: string, classpath: string}`) is the exact shape to mirror for Phase 4 consumption.

**Primary recommendation:** Implement a three-class MVC pattern (BbjSettings state service, BbjSettingsComponent Swing panel, BbjSettingsConfigurable controller) registered as `applicationConfigurable` with `parentId="language"`, plus two `EditorNotificationProvider` implementations for missing BBj home and missing Node.js. Use `PathEnvironmentVariableUtil.findInPath("node")` for Node.js detection and `GeneralCommandLine` to validate versions. Enforce Node.js >= 18 as minimum version (Langium 3.2.x requirement).

## Standard Stack

The established IntelliJ Platform APIs for this domain:

### Core
| API/Class | Package | Purpose | Why Standard |
|-----------|---------|---------|--------------|
| `PersistentStateComponent` | `com.intellij.openapi.components` | Persists settings as XML in IDE config | Official persistence model, automatic serialization |
| `Configurable` | `com.intellij.openapi.options` | Connects settings UI to persisted state | Standard settings page controller interface |
| `EditorNotificationProvider` | `com.intellij.ui` | Shows banners at top of editors | Official API for file-level notifications |
| `EditorNotificationPanel` | `com.intellij.ui` | Pre-built banner UI with actions | Standard panel with Status enum (Info/Warning/Error) |
| `PathEnvironmentVariableUtil` | `com.intellij.execution.configurations` | Finds executables on system PATH | Core platform API, works in Community Edition |
| `GeneralCommandLine` | `com.intellij.execution.configurations` | Executes external processes | Standard way to run commands from plugins |
| `TextFieldWithBrowseButton` | `com.intellij.openapi.ui` | Text input with folder browser | Standard file/folder picker control |
| `ComboBox` | `com.intellij.openapi.ui` | Dropdown selector | IntelliJ-specific JComboBox replacement |
| `ComponentValidator` | `com.intellij.openapi.ui` | Inline field validation | Official validation framework with ValidationInfo |
| `FormBuilder` | `com.intellij.util.ui` | Builds settings panel layouts | Standard form layout utility |

### Supporting
| API/Class | Package | Purpose | When to Use |
|-----------|---------|---------|-------------|
| `FileChooserDescriptorFactory` | `com.intellij.openapi.fileChooser` | Creates file chooser configs | For browse button folder selection |
| `CollectionComboBoxModel` | `com.intellij.ui` | Dynamic combo box model | For classpath dropdown population |
| `BrowserUtil` | `com.intellij.ide` | Opens URLs in system browser | For "Install Node.js" action link |
| `EditorNotifications` | `com.intellij.ui` | Triggers notification refresh | When settings change, call `updateAllNotifications()` |
| `ApplicationManager` | `com.intellij.openapi.application` | Accesses application services | For retrieving the settings singleton |
| `DocumentAdapter` | `com.intellij.ui` | Listens for text field changes | For real-time inline validation |
| `ExecUtil` | `com.intellij.execution.util` | Executes commands and reads output | For `node --version` execution |
| `ShowSettingsUtil` | `com.intellij.openapi.options` | Opens settings dialog programmatically | For "Configure" action in banners |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `PathEnvironmentVariableUtil` | `NodeJsInterpreterManager` (JB Node.js plugin) | Requires Ultimate Edition dependency; not available in Community |
| `applicationConfigurable` | `projectConfigurable` | Project-level is more common for lang settings, but decision locks application-level |
| Manual Swing layout | IntelliJ UI DSL (Kotlin) | UI DSL is Kotlin-only; plugin is Java-based |
| `@State` XML storage | `PropertiesComponent` | PropertiesComponent is simpler but less structured, no versioning |

**No additional dependencies needed.** All APIs are part of the IntelliJ Platform core (`com.intellij.modules.platform`), which the plugin already depends on.

## Architecture Patterns

### Recommended Project Structure
```
src/main/java/com/basis/bbj/intellij/
├── BbjLanguage.java              # (existing)
├── BbjFileType.java              # (existing)
├── BbjIcons.java                 # (existing)
├── BbjSettings.java              # NEW: PersistentStateComponent - state service
├── BbjSettingsComponent.java     # NEW: Swing UI panel
├── BbjSettingsConfigurable.java  # NEW: Configurable controller
├── BbjNodeDetector.java          # NEW: Node.js detection utility
├── BbjHomeDetector.java          # NEW: BBj home auto-detection utility
├── BbjMissingHomeNotificationProvider.java   # NEW: Editor banner for BBj home
├── BbjMissingNodeNotificationProvider.java   # NEW: Editor banner for Node.js
└── ...
```

### Pattern 1: MVC Settings Pattern (Official IntelliJ Pattern)
**What:** Three-class separation of concerns for settings
**When to use:** Always for plugin settings pages
**Example:**

```java
// === BbjSettings.java - The Model (PersistentStateComponent) ===
// Source: https://plugins.jetbrains.com/docs/intellij/settings-tutorial.html

@State(
    name = "com.basis.bbj.intellij.BbjSettings",
    storages = @Storage("BbjSettings.xml")
)
public final class BbjSettings implements PersistentStateComponent<BbjSettings.State> {

    public static class State {
        public String bbjHomePath = "";
        public String nodeJsPath = "";
        public String classpathEntry = "";
    }

    private State myState = new State();

    public static BbjSettings getInstance() {
        return ApplicationManager.getApplication().getService(BbjSettings.class);
    }

    @Override
    public State getState() {
        return myState;
    }

    @Override
    public void loadState(@NotNull State state) {
        myState = state;
    }
}
```

```java
// === BbjSettingsComponent.java - The View (Swing panel) ===
// Source: https://plugins.jetbrains.com/docs/intellij/settings-tutorial.html

public class BbjSettingsComponent {
    private final JPanel mainPanel;
    private final TextFieldWithBrowseButton bbjHomeField;
    private final TextFieldWithBrowseButton nodeJsField;
    private final ComboBox<String> classpathCombo;

    public BbjSettingsComponent() {
        bbjHomeField = new TextFieldWithBrowseButton();
        bbjHomeField.addBrowseFolderListener(
            "Select BBj Home Directory",
            "Choose the root directory of your BBj installation",
            null,
            FileChooserDescriptorFactory.createSingleFolderDescriptor()
        );

        nodeJsField = new TextFieldWithBrowseButton();
        nodeJsField.addBrowseFolderListener(
            "Select Node.js Executable",
            "Choose the Node.js binary",
            null,
            FileChooserDescriptorFactory.createSingleLocalFileDescriptor()
        );

        classpathCombo = new ComboBox<>();

        mainPanel = FormBuilder.createFormBuilder()
            .addLabeledComponent(new JBLabel("BBj home:"), bbjHomeField, 1, false)
            // ... validation labels, Node.js field, classpath combo
            .addComponentFillVertically(new JPanel(), 0)
            .getPanel();
    }

    public JPanel getPanel() { return mainPanel; }
    // ... getters and setters for fields
}
```

```java
// === BbjSettingsConfigurable.java - The Controller ===
// Source: https://plugins.jetbrains.com/docs/intellij/settings-tutorial.html

public final class BbjSettingsConfigurable implements Configurable {
    private BbjSettingsComponent myComponent;

    @Override
    public String getDisplayName() {
        return "BBj";
    }

    @Override
    public JComponent createComponent() {
        myComponent = new BbjSettingsComponent();
        return myComponent.getPanel();
    }

    @Override
    public boolean isModified() {
        BbjSettings.State state = BbjSettings.getInstance().getState();
        // Compare UI values to stored state
        return !myComponent.getBbjHomePath().equals(state.bbjHomePath)
            || !myComponent.getNodeJsPath().equals(state.nodeJsPath)
            || !myComponent.getClasspathEntry().equals(state.classpathEntry);
    }

    @Override
    public void apply() {
        BbjSettings.State state = BbjSettings.getInstance().getState();
        state.bbjHomePath = myComponent.getBbjHomePath();
        state.nodeJsPath = myComponent.getNodeJsPath();
        state.classpathEntry = myComponent.getClasspathEntry();

        // Refresh editor notifications after settings change
        // Phase 4 will add language server restart here
        for (Project project : ProjectManager.getInstance().getOpenProjects()) {
            EditorNotifications.getInstance(project).updateAllNotifications();
        }
    }

    @Override
    public void reset() {
        BbjSettings.State state = BbjSettings.getInstance().getState();
        myComponent.setBbjHomePath(state.bbjHomePath);
        myComponent.setNodeJsPath(state.nodeJsPath);
        myComponent.setClasspathEntry(state.classpathEntry);
    }
}
```

### Pattern 2: EditorNotificationProvider for Missing Configuration
**What:** Banner at top of BBj file editors when config is missing
**When to use:** When a hard requirement (BBj home, Node.js) is not configured
**Example:**

```java
// Source: https://plugins.jetbrains.com/docs/intellij/notifications.html
// + https://github.com/JetBrains/intellij-community EditorNotificationProvider.java

public class BbjMissingHomeNotificationProvider implements EditorNotificationProvider, DumbAware {

    @Override
    public @Nullable Function<? super @NotNull FileEditor, ? extends @Nullable JComponent>
            collectNotificationData(@NotNull Project project, @NotNull VirtualFile file) {

        // Only show for BBj files
        if (file.getFileType() != BbjFileType.INSTANCE) {
            return null;
        }

        BbjSettings.State state = BbjSettings.getInstance().getState();
        if (state.bbjHomePath != null && !state.bbjHomePath.isEmpty()) {
            // Check validity: cfg/BBj.properties must exist
            File propsFile = new File(state.bbjHomePath, "cfg/BBj.properties");
            if (propsFile.exists()) {
                return null; // Valid, no banner needed
            }
        }

        return fileEditor -> {
            EditorNotificationPanel panel = new EditorNotificationPanel(
                fileEditor, EditorNotificationPanel.Status.Warning
            );
            panel.setText("BBj home directory is not configured");
            panel.createActionLabel("Configure BBj Home", () -> {
                ShowSettingsUtil.getInstance().showSettingsDialog(
                    project, BbjSettingsConfigurable.class
                );
            });
            return panel;
        };
    }
}
```

### Pattern 3: Node.js Detection Without JetBrains Node.js Plugin
**What:** Find and validate Node.js using core platform APIs only
**When to use:** Community Edition compatible Node.js detection
**Example:**

```java
// Source: Research - PathEnvironmentVariableUtil is core platform API

public final class BbjNodeDetector {

    private BbjNodeDetector() {} // utility class

    /** Find node binary on system PATH */
    public static @Nullable String detectNodePath() {
        File nodeFile = PathEnvironmentVariableUtil.findInPath("node");
        if (nodeFile != null && nodeFile.canExecute()) {
            return nodeFile.getAbsolutePath();
        }
        return null;
    }

    /** Get Node.js version from a given path */
    public static @Nullable String getNodeVersion(@NotNull String nodePath) {
        try {
            GeneralCommandLine cmd = new GeneralCommandLine(nodePath, "--version");
            cmd.withParentEnvironmentType(
                GeneralCommandLine.ParentEnvironmentType.CONSOLE
            );
            cmd.setCharset(StandardCharsets.UTF_8);
            String output = ExecUtil.execAndReadLine(cmd);
            // Output is like "v22.22.0"
            return output != null ? output.trim() : null;
        } catch (Exception e) {
            return null;
        }
    }

    /** Check if version meets minimum requirement (18+) */
    public static boolean meetsMinimumVersion(@Nullable String version) {
        if (version == null || !version.startsWith("v")) return false;
        try {
            String[] parts = version.substring(1).split("\\.");
            int major = Integer.parseInt(parts[0]);
            return major >= 18;
        } catch (NumberFormatException e) {
            return false;
        }
    }
}
```

### Pattern 4: BBj Home Auto-Detection
**What:** Find BBj installation from installer trace file and common locations
**When to use:** Pre-populate settings on first use
**Example:**

```java
// Source: ~/BASIS/Install.properties analysis from dev machine

public final class BbjHomeDetector {

    private BbjHomeDetector() {}

    /** Auto-detect BBj home from Install.properties, then common locations */
    public static @Nullable String detectBbjHome() {
        // 1. Check ~/BASIS/Install.properties
        String fromInstaller = detectFromInstallerTrace();
        if (fromInstaller != null) return fromInstaller;

        // 2. Check common locations
        for (String path : getCommonLocations()) {
            if (isValidBbjHome(path)) return path;
        }
        return null;
    }

    private static @Nullable String detectFromInstallerTrace() {
        Path propsPath = Paths.get(System.getProperty("user.home"), "BASIS", "Install.properties");
        if (!Files.exists(propsPath)) return null;

        try (BufferedReader reader = Files.newBufferedReader(propsPath)) {
            Properties props = new Properties();
            props.load(reader);
            // Try BBjDirectory first, then BASISInstallDirectory
            String dir = props.getProperty("BBjDirectory");
            if (dir == null) dir = props.getProperty("BASISInstallDirectory");
            if (dir != null && isValidBbjHome(dir)) return dir;
        } catch (IOException e) {
            // ignore
        }
        return null;
    }

    private static String[] getCommonLocations() {
        if (SystemInfo.isWindows) {
            return new String[]{"C:\\bbx", "C:\\basis\\bbj"};
        }
        return new String[]{"/usr/local/bbx", "/opt/bbx", "/opt/basis/bbj"};
    }

    /** Validates by checking cfg/BBj.properties exists */
    public static boolean isValidBbjHome(@NotNull String path) {
        return new File(path, "cfg/BBj.properties").exists();
    }
}
```

### Pattern 5: plugin.xml Registration
**What:** Wiring all components together in plugin.xml
**When to use:** Required for all extension points
**Example:**

```xml
<!-- In plugin.xml <extensions> block -->
<extensions defaultExtensionNs="com.intellij">
    <!-- Application-level settings service -->
    <applicationService
        serviceImplementation="com.basis.bbj.intellij.BbjSettings"/>

    <!-- Settings page under Languages & Frameworks > BBj -->
    <applicationConfigurable
        parentId="language"
        instance="com.basis.bbj.intellij.BbjSettingsConfigurable"
        id="com.basis.bbj.intellij.BbjSettingsConfigurable"
        displayName="BBj"/>

    <!-- Editor banners for missing configuration -->
    <editorNotificationProvider
        implementation="com.basis.bbj.intellij.BbjMissingHomeNotificationProvider"/>
    <editorNotificationProvider
        implementation="com.basis.bbj.intellij.BbjMissingNodeNotificationProvider"/>
</extensions>
```

### Pattern 6: Inline Validation with ComponentValidator
**What:** Real-time validation on text fields showing error/success indicators
**When to use:** BBj home and Node.js path fields
**Example:**

```java
// Source: https://plugins.jetbrains.com/docs/intellij/validation-errors.html

// In BbjSettingsComponent constructor, after creating bbjHomeField:
new ComponentValidator(parentDisposable)
    .withValidator(() -> {
        String path = bbjHomeField.getText();
        if (path.isEmpty()) {
            return null; // Don't validate empty (user may still be filling in)
        }
        if (!BbjHomeDetector.isValidBbjHome(path)) {
            return new ValidationInfo(
                "BBj.properties not found in " + path + "/cfg/",
                bbjHomeField
            );
        }
        return null; // Valid
    })
    .installOn(bbjHomeField.getTextField());

// Trigger revalidation on text changes
bbjHomeField.getTextField().getDocument().addDocumentListener(new DocumentAdapter() {
    @Override
    protected void textChanged(@NotNull DocumentEvent e) {
        ComponentValidator.getInstance(bbjHomeField.getTextField())
            .ifPresent(ComponentValidator::revalidate);

        // Also refresh classpath dropdown when BBj home changes
        updateClasspathDropdown(bbjHomeField.getText());
    }
});
```

### Anti-Patterns to Avoid
- **Creating Swing components in Configurable constructor:** The IntelliJ Platform may instantiate `Configurable` on a background thread. All Swing work must happen in `createComponent()`.
- **Depending on JetBrains Node.js plugin:** `NodeJsInterpreterManager` and related APIs are only available in Ultimate Edition. The plugin targets Community Edition.
- **Storing settings in PropertiesComponent:** Use `PersistentStateComponent` with `@State`/`@Storage` for structured settings with proper serialization.
- **Making settings project-level:** Decision is locked to application-level. Use `applicationConfigurable` + `applicationService`, not `projectConfigurable` + `projectService`.
- **Validating empty fields on input:** Never validate empty required fields on input. Users should be able to fill the form in any order.
- **Running Node.js detection at IDE startup:** Decision says detection triggers on first BBj file open. Use lazy initialization.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| File/folder browser dialog | Custom JFileChooser | `TextFieldWithBrowseButton` + `FileChooserDescriptorFactory` | Integrates with IntelliJ's native file chooser, supports path completion |
| Inline field validation | Manual border/icon changes | `ComponentValidator` + `ValidationInfo` | Handles validation lifecycle, proper UX positioning, themed styling |
| Settings persistence | Manual file I/O | `PersistentStateComponent` with `@State`/`@Storage` | Automatic XML serialization, migration support, IDE config directory |
| Opening external URLs | `Desktop.browse()` | `BrowserUtil.browse()` | Respects IntelliJ browser settings, cross-platform |
| Finding executables on PATH | Manual PATH parsing | `PathEnvironmentVariableUtil.findInPath()` | Handles OS differences, macOS env simulation |
| Running external commands | `ProcessBuilder` | `GeneralCommandLine` + `ExecUtil` | Proper charset handling, parent environment types, macOS console env |
| Dropdown/combo box | `JComboBox` | `com.intellij.openapi.ui.ComboBox` + `CollectionComboBoxModel` | Correct sizing, popup width, IntelliJ theme integration |
| Opening settings dialog | Manual frame management | `ShowSettingsUtil.getInstance().showSettingsDialog()` | Standard API, handles dialog lifecycle |
| Refreshing editor banners | Custom event system | `EditorNotifications.getInstance(project).updateAllNotifications()` | Standard way to refresh all notification providers |

**Key insight:** IntelliJ Platform has purpose-built APIs for every UI pattern in a settings page. Using raw Swing instead of IntelliJ wrappers creates visual inconsistencies and breaks with theme updates.

## Common Pitfalls

### Pitfall 1: Configurable Constructor Creates Swing Components
**What goes wrong:** Settings page creation triggers Swing component creation on background thread, causing UI freezes or exceptions.
**Why it happens:** IntelliJ may instantiate `Configurable` lazily on a background thread.
**How to avoid:** Create all Swing components in `createComponent()`, never in the constructor. The `reset()` method is called immediately after `createComponent()`, so initialization of values there is also unnecessary.
**Warning signs:** Intermittent UI freezes when opening Settings dialog.

### Pitfall 2: Node.js PATH Not Found Due to macOS Environment
**What goes wrong:** `node` binary is installed (via nvm, Homebrew) but `PathEnvironmentVariableUtil.findInPath()` returns null.
**Why it happens:** On macOS, GUI applications don't inherit the full shell environment. PATH from `.bashrc`/`.zshrc` may not be available. IntelliJ simulates console environment via `EnvironmentUtil.getEnvironmentMap()`.
**How to avoid:** Use `GeneralCommandLine.ParentEnvironmentType.CONSOLE` when executing Node.js. Provide manual path override in settings for nvm users. Consider checking common nvm paths (`~/.nvm/versions/node/*/bin/node`) as fallback.
**Warning signs:** Node.js works in terminal but not detected by plugin.

### Pitfall 3: applicationConfigurable Under Languages & Frameworks
**What goes wrong:** Settings appear under "Languages & Frameworks" but most peers are project-level settings.
**Why it happens:** `parentId="language"` is typically used with `projectConfigurable`. Using `applicationConfigurable` with this parent is less common.
**How to avoid:** This is by design (locked decision: application-level settings). The settings page will work correctly. Just be aware that the parent group shows a mix of application and project settings in IntelliJ.
**Warning signs:** None expected, this is a valid configuration.

### Pitfall 4: Classpath Dropdown Not Updating When BBj Home Changes
**What goes wrong:** User changes BBj home path but classpath dropdown still shows entries from old path (or is empty).
**Why it happens:** Dropdown model isn't refreshed when the text field value changes.
**How to avoid:** Attach a `DocumentListener` to the BBj home text field. On change, re-parse `BBj.properties` from the new path and call `classpathCombo.setModel(new CollectionComboBoxModel<>(newEntries))`. Disable the combo when path is empty/invalid.
**Warning signs:** Stale classpath entries, combo shows entries from previous BBj installation.

### Pitfall 5: Settings XML Not Saved Without Equals Check
**What goes wrong:** Settings are always written to disk even when unchanged, creating unnecessary IDE config churn.
**Why it happens:** `PersistentStateComponent` checks if state equals the default. If there's no proper equality check, it may always save.
**How to avoid:** The `State` inner class should have an `equals()` method or rely on field-by-field comparison (which IntelliJ does automatically for simple public fields). Using public `String` fields with default `""` values works correctly with automatic comparison.
**Warning signs:** `BbjSettings.xml` appears in IDE config even with all-default values.

### Pitfall 6: EditorNotifications Not Refreshed After Settings Apply
**What goes wrong:** User configures BBj home in settings, clicks OK, but the editor banner doesn't disappear.
**Why it happens:** `EditorNotificationProvider.collectNotificationData()` isn't re-invoked automatically when settings change.
**How to avoid:** In `BbjSettingsConfigurable.apply()`, iterate open projects and call `EditorNotifications.getInstance(project).updateAllNotifications()`.
**Warning signs:** Stale banners that only disappear when the file is closed and reopened.

## Code Examples

### Parsing BBj.properties for Classpath Entries
```java
// Mirrors VS Code extension's getBBjClasspathEntries() from extension.ts
// Source: bbj-vscode/src/extension.ts lines 27-59

public static List<String> getBBjClasspathEntries(@NotNull String bbjHomePath) {
    Path propertiesPath = Paths.get(bbjHomePath, "cfg", "BBj.properties");
    List<String> entries = new ArrayList<>();

    if (!Files.exists(propertiesPath)) {
        return entries;
    }

    try {
        List<String> lines = Files.readAllLines(propertiesPath, StandardCharsets.UTF_8);
        for (String line : lines) {
            String trimmed = line.trim();
            if (trimmed.startsWith("basis.classpath.")) {
                // Extract key name between "basis.classpath." and "="
                int eqIndex = trimmed.indexOf('=');
                if (eqIndex > 0) {
                    String key = trimmed.substring("basis.classpath.".length(), eqIndex);
                    // Skip internal entries (prefixed with underscore)
                    if (!key.startsWith("_")) {
                        entries.add(key);
                    }
                }
            }
        }
    } catch (IOException e) {
        // Return empty list on error
    }

    Collections.sort(entries);
    return entries;
}
```

### LSP Initialization Options Contract
```java
// The language server expects initializationOptions with this shape:
// Source: bbj-vscode/src/extension.ts lines 426-429
// Source: bbj-vscode/src/language/bbj-ws-manager.ts lines 30-41

// Shape: { home: string, classpath: string }
// - home: absolute path to BBj installation directory
// - classpath: name of a classpath entry (e.g., "bbj_default", "addon")

// Phase 4 will use these settings like:
// Map<String, Object> initOptions = new HashMap<>();
// initOptions.put("home", BbjSettings.getInstance().getState().bbjHomePath);
// initOptions.put("classpath", BbjSettings.getInstance().getState().classpathEntry);
```

### Disposable Pattern for ComponentValidator
```java
// Source: https://plugins.jetbrains.com/docs/intellij/validation-errors.html
// + https://intellij-support.jetbrains.com/hc/en-us/community/posts/8094343922194

// BbjSettingsConfigurable should implement Disposable for proper cleanup
public final class BbjSettingsConfigurable implements Configurable, Disposable {
    private BbjSettingsComponent myComponent;

    @Override
    public JComponent createComponent() {
        myComponent = new BbjSettingsComponent(this); // pass as parentDisposable
        return myComponent.getPanel();
    }

    @Override
    public void disposeUIResources() {
        myComponent = null;
        Disposer.dispose(this);
    }

    @Override
    public void dispose() {
        // ComponentValidators are cleaned up via the Disposable chain
    }
    // ... isModified, apply, reset
}
```

### Section Headers in Settings Panel
```java
// Use TitledSeparator for visual section headers within a single scrollable page
// Source: IntelliJ Platform UI conventions

mainPanel = FormBuilder.createFormBuilder()
    .addComponent(new TitledSeparator("BBj Environment"))
    .addLabeledComponent(new JBLabel("BBj home:"), bbjHomeField, 1, false)
    .addComponent(validationLabel)  // for inline validation status

    .addComponent(new TitledSeparator("Node.js Runtime"))
    .addLabeledComponent(new JBLabel("Node.js path:"), nodeJsField, 1, false)
    .addComponent(nodeVersionLabel)  // show detected version

    .addComponent(new TitledSeparator("Classpath"))
    .addLabeledComponent(new JBLabel("Classpath entry:"), classpathCombo, 1, false)

    .addComponentFillVertically(new JPanel(), 0)
    .getPanel();
```

### Opening Settings From EditorNotificationPanel
```java
// Source: https://plugins.jetbrains.com/docs/intellij/notifications.html

panel.createActionLabel("Configure BBj Home", () -> {
    ShowSettingsUtil.getInstance().showSettingsDialog(
        project,
        BbjSettingsConfigurable.class
    );
});
```

### Opening External URL From EditorNotificationPanel
```java
// Source: https://github.com/JetBrains/intellij-community BrowserUtil.java

panel.createActionLabel("Install Node.js", () -> {
    BrowserUtil.browse("https://nodejs.org/");
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `EditorNotifications.Provider<T>` abstract class | `EditorNotificationProvider` interface with `collectNotificationData()` | Platform 2022.x | New interface returns `Function<FileEditor, JComponent>` instead of single panel |
| `applicationComponent` for settings | `applicationService` + `PersistentStateComponent` | Platform 2019.x | Components are deprecated; use services |
| `NodeJsInterpreterManager` (Ultimate only) | `PathEnvironmentVariableUtil.findInPath()` (core) | Always available | Community Edition compatible |
| Manual `@Service` annotation | XML registration in plugin.xml | Both work | XML registration required for `PersistentStateComponent` without `@Service` |
| JetBrains LSP (LspServerDescriptor) | LSP4IJ (Community compatible) | 2025.2+ for native | LSP4IJ supports Community Edition; JetBrains native LSP requires subscription/unified IDE |
| Langium Node.js 16+ | Langium 3.2+ requires Node.js 18+ | Langium 3.0 (2024) | Minimum version enforced in engines field |

**Deprecated/outdated:**
- `EditorNotifications.Provider<T>`: Still works but `EditorNotificationProvider` interface is the modern approach
- `PropertiesComponent` for structured settings: Use `PersistentStateComponent` instead
- `CONST_NULL` in `EditorNotificationProvider`: Deprecated, return `null` from `collectNotificationData()` instead

## LSP Initialization Options Contract

This is critical for Phase 4 integration. The BBj language server expects initialization options in this format:

```json
{
    "home": "/path/to/bbj/installation",
    "classpath": "bbj_default"
}
```

**Source:** `bbj-vscode/src/extension.ts` (lines 426-429) sends:
```typescript
initializationOptions: {
    home: vscode.workspace.getConfiguration("bbj").home,
    classpath: vscode.workspace.getConfiguration("bbj").classpath
}
```

**Source:** `bbj-vscode/src/language/bbj-ws-manager.ts` (lines 30-41) receives:
```typescript
if (params.initializationOptions) {
    this.bbjdir = params.initializationOptions.home || "";
    this.classpathFromSettings = params.initializationOptions.classpath || "";
}
```

The `State` class fields (`bbjHomePath`, `nodeJsPath`, `classpathEntry`) should map directly to this contract. Phase 4's `StreamConnectionProvider` will read from `BbjSettings.getInstance().getState()` to construct both the Node.js command line and the initialization options.

## Node.js Minimum Version Determination

**Finding:** The BBj language server uses Langium ~3.2.1 (`bbj-vscode/package.json`). The Langium monorepo's root `package.json` specifies `"engines": { "node": ">=20.10.0" }` on the main branch. However, Langium 3.2.x was released before the upgrade to 4.0 which moved to Node 20+.

**Langium 3.2.x minimum:** Node.js >= 18.0.0 (based on Langium 3.x workspace engines field at the time of release, and Node 18 being LTS during that period)

**Practical minimum for this plugin:** Node.js >= 18 (covers Langium 3.2.x requirement)

**Recommendation:** Enforce Node.js >= 18 as the minimum version. Display this in the error message. Consider recommending Node.js 20+ (current LTS) in the "Install Node.js" guidance since Node.js 18 reached end-of-life in April 2025.

**Confidence:** MEDIUM - The exact engines field for Langium 3.2.1 was not individually verified on npm (403 error), but the Langium 3.x series development used Node 18+ as minimum, and the project's own `documentation/package.json` requires `node >= 20.0`.

## Install.properties Format

Verified from the actual file at `~/BASIS/Install.properties`:

```properties
#
#Sun Nov 24 10:48:59 CET 2024
BBjVersion=23.07
AutoRecordInstallResponse=false
AutoPlaybackInstallResponse=false
BASISInstallDirectory=/Users/beff/bbx
InstallDirectory=/Users/beff/bbx
BBjDirectory=/Users/beff/bbx
```

**Parsing approach:** Standard `java.util.Properties` class handles this format (comment lines starting with `#`). Read `BBjDirectory` first, fall back to `BASISInstallDirectory`.

## BBj.properties Classpath Format

Verified from actual file at `~/bbx/cfg/BBj.properties`:

```
basis.classpath.addon=(addon_internal)
basis.classpath.barista=(barista_internal)
basis.classpath.basisdemos=(bbj_internal):...
basis.classpath.bbj_default=(bbj_internal)
basis.classpath._webforj_default=...   <-- underscore prefix = internal
```

**Parsing note:** Entries prefixed with underscore (like `_webforj_default`, `_dwcj_cli`) appear to be internal/system entries. The VS Code extension does not filter these, but they are unusual choices for user selection. Consider either: (a) showing all entries like VS Code does, or (b) filtering underscore-prefixed entries from the dropdown. Recommendation: show all entries for parity with VS Code extension.

## Open Questions

Things that couldn't be fully resolved:

1. **Exact Langium 3.2.1 Node.js engines field**
   - What we know: Langium 3.x series requires Node >= 18; main branch moved to >= 20.10.0
   - What's unclear: Whether Langium 3.2.1 specifically declares >= 16, >= 18, or no engines field
   - Recommendation: Enforce >= 18 (safe for Langium 3.x), recommend >= 20 in user-facing messages

2. **applicationConfigurable + parentId="language" for global settings**
   - What we know: This combination is valid in the API. Most "Languages & Frameworks" settings are project-level.
   - What's unclear: Whether visual placement will look odd next to project-level settings
   - Recommendation: Proceed as designed. If it looks wrong in practice, easy to move with a one-line plugin.xml change.

3. **EditorNotificationProvider re-evaluation frequency**
   - What we know: `collectNotificationData` is called when files open and when `updateAllNotifications()` is called
   - What's unclear: Exact caching behavior and whether the platform batches calls
   - Recommendation: Keep the method lightweight (just check settings state + file existence). Avoid I/O in the provider; pre-compute validity in settings service.

## Sources

### Primary (HIGH confidence)
- [IntelliJ Platform Settings Tutorial](https://plugins.jetbrains.com/docs/intellij/settings-tutorial.html) - PersistentStateComponent + Configurable pattern
- [IntelliJ Platform Settings Guide](https://plugins.jetbrains.com/docs/intellij/settings-guide.html) - parentId values, applicationConfigurable vs projectConfigurable
- [IntelliJ Platform Notifications](https://plugins.jetbrains.com/docs/intellij/notifications.html) - EditorNotificationProvider registration and usage
- [IntelliJ Platform Validation Errors](https://plugins.jetbrains.com/docs/intellij/validation-errors.html) - ComponentValidator + DocumentAdapter patterns
- [IntelliJ Platform File Choosers](https://plugins.jetbrains.com/docs/intellij/file-and-class-choosers.html) - TextFieldWithBrowseButton
- [EditorNotificationPanel.java source](https://github.com/JetBrains/intellij-community/blob/idea/243.22562.145/platform/platform-api/src/com/intellij/ui/EditorNotificationPanel.java) - Status enum, createActionLabel API
- [EditorNotificationProvider.java source](https://github.com/JetBrains/intellij-community/blob/idea/243.22562.145/platform/platform-api/src/com/intellij/ui/EditorNotificationProvider.java) - collectNotificationData interface
- [LSP4IJ Developer Guide](https://github.com/redhat-developer/lsp4ij/blob/main/docs/DeveloperGuide.md) - LanguageServerFactory, StreamConnectionProvider patterns
- bbj-vscode/src/extension.ts (lines 27-59, 426-429) - getBBjClasspathEntries, LSP initializationOptions
- bbj-vscode/src/language/bbj-ws-manager.ts (lines 30-41) - Server-side initializationOptions handling
- ~/BASIS/Install.properties (actual file) - Installer trace format
- ~/bbx/cfg/BBj.properties (actual file) - Classpath entry format

### Secondary (MEDIUM confidence)
- [IntelliJ Platform Persisting State](https://plugins.jetbrains.com/docs/intellij/persisting-state-of-components.html) - @State, @Storage details
- [Langium 3.0 release blog](https://www.typefox.io/blog/langium-release-3.0/) - Node.js version context
- [Langium GitHub package.json](https://github.com/eclipse-langium/langium/blob/main/package.json) - engines field (Node >= 20.10.0 on current main)
- [IntelliJ Plugin Dev Community Posts](https://intellij-support.jetbrains.com/hc/en-us/community/posts/360006002039-Get-NodeJS-interpreter) - PathEnvironmentVariableUtil pattern
- [PathEnvironmentVariableUtil examples](https://www.tabnine.com/code/java/methods/com.intellij.execution.configurations.PathEnvironmentVariableUtil/findInPath) - findInPath usage

### Tertiary (LOW confidence)
- Node.js 18 as exact Langium 3.2.1 minimum - inferred from project conventions, not verified on npm

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All APIs verified in official IntelliJ Platform SDK docs
- Architecture: HIGH - MVC settings pattern is the canonical IntelliJ approach
- Node.js detection: HIGH - PathEnvironmentVariableUtil verified as core platform API
- BBj home detection: HIGH - Install.properties format verified from actual file on dev machine
- Classpath parsing: HIGH - BBj.properties format verified from actual file on dev machine
- EditorNotificationProvider: HIGH - API verified from source code and official docs
- LSP init options contract: HIGH - Verified from both VS Code extension source and server source
- Node.js minimum version: MEDIUM - Langium 3.x requires >= 18, but exact 3.2.1 engines field not individually confirmed
- Pitfalls: MEDIUM - Based on official docs warnings and community patterns

**Research date:** 2026-02-01
**Valid until:** 2026-03-01 (stable IntelliJ Platform APIs, Langium version is pinned)
