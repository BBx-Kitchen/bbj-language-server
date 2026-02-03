# Architecture Integration: v1.2 Run Fixes, Console Output, and Marketplace Readiness

**Domain:** IntelliJ Platform Plugin Development
**Researched:** 2026-02-02
**Confidence:** HIGH

## Executive Summary

This research examines how run command fixes, console output capture, and Marketplace publication integrate with the existing BBj IntelliJ plugin architecture. The plugin follows standard IntelliJ Platform patterns with an `AnAction`-based run system, tool window infrastructure for console output, and Gradle build tasks for publication. The v1.2 milestone requires targeted fixes to existing components plus new console integration components.

## Existing Architecture Overview

### Run Action Hierarchy
```
BbjRunActionBase (abstract)
├── getBbjExecutablePath() → File validation
├── buildCommandLine() → GeneralCommandLine construction
├── actionPerformed() → OSProcessHandler → startNotify()
└── Subclasses:
    ├── BbjRunGuiAction (-q flag)
    ├── BbjRunBuiAction (web.bbj + BUI mode)
    └── BbjRunDwcAction (web.bbj + DWC mode)
```

**Current flow:**
1. User triggers action → `actionPerformed()`
2. Auto-save if enabled → `autoSaveIfNeeded()`
3. Build command → `buildCommandLine()` (subclass responsibility)
4. Execute → `new OSProcessHandler(cmd).startNotify()`
5. Fire and forget → No output capture, no process tracking

### Settings Architecture
- **BbjSettings**: Application-level PersistentStateComponent
- **Storage**: `BbjSettings.xml` in IDE config directory
- **Key fields**: `bbjHomePath`, `nodeJsPath`, `classpathEntry`, `autoSaveBeforeRun`
- **Validation**: `BbjHomeDetector.isValidBbjHome()` checks for `cfg/BBj.properties`

### Tool Window Architecture
- **BbjServerLogToolWindowFactory**: Creates console for LSP server output
- **BbjServerService**: Project-level service managing LSP lifecycle
- **Pattern**: ConsoleView created via `TextConsoleBuilderFactory`, registered with service, service writes via `console.print()`

### Build System
- **Gradle**: Kotlin DSL with IntelliJ Platform Gradle Plugin 2.x
- **Dependencies**: `intellijIdeaCommunity("2024.2")`, `lsp4ij:0.19.0`, `pluginVerifier()`, `zipSigner()`
- **Tasks**: `prepareSandbox`, `buildPlugin`, `signPlugin`, `publishPlugin`

## Problem Analysis: Why Run Commands Fail

### Issue 1: Executable Path Resolution on Windows

**Current code (BbjRunActionBase.java:88-104):**
```java
String exeName = SystemInfo.isWindows ? "bbj.exe" : "bbj";
File executable = new File(bbjHome, "bin/" + exeName);
if (!executable.exists() || !executable.isFile()) {
    return null;
}
```

**Why this can fail:**
1. **Symlinks**: `File.exists()` returns `false` for broken symlinks even if link file exists
2. **Case sensitivity**: Windows NTFS is case-insensitive but `File` operations respect exact case
3. **Path separators**: Hardcoded `"bin/"` assumes forward slash works (it does in Java, but clarity matters)
4. **Executable bit irrelevant**: `File.isFile()` doesn't check if file is actually runnable
5. **No logging**: When `null` is returned, caller shows generic error with no diagnostic info

**Impact on phases:**
- Phase 7 (Executable Path Fix) must add diagnostics
- Phase 8 (Console Output) needs process tracking to detect launch failures

### Issue 2: OSProcessHandler Without Output Capture

**Current code (BbjRunActionBase.java:54-56):**
```java
OSProcessHandler handler = new OSProcessHandler(cmd);
handler.startNotify();
showSuccess(project, file.getName(), getRunMode());
```

**Problems:**
1. **No process listeners**: Output goes to void
2. **No termination detection**: Process may fail immediately, no feedback
3. **No console attachment**: User sees notification but not actual output
4. **Fire-and-forget**: Handler becomes garbage-collectable after `startNotify()`
5. **No error stream capture**: stderr lost

**IntelliJ Platform best practices (2024):**
- Attach `ProcessTerminatedListener` for exit code display
- Use `ColoredProcessHandler` for ANSI escape code support
- Avoid EDT blocking: Launch in pooled thread
- Provide `ProgressIndicator` context for cancellation support

### Issue 3: Environment Variable Inheritance

**Current code:** No explicit environment configuration on `GeneralCommandLine`

**Default behavior:**
- GeneralCommandLine uses `ParentEnvironmentType.CONSOLE` by default
- On macOS, simulates console environment (loads shell profile)
- On Windows/Linux, equivalent to SYSTEM environment

**Why this matters for BBj:**
- BBj executable may depend on `BBXDIR` or `BASIS_HOME` environment variables
- Classpath entries in `BBj.properties` may reference `$BBXDIR`
- Web mode runners may need `PATH` to find `java` executable

**Recommendation:** Explicitly set `ParentEnvironmentType.CONSOLE` for clarity

## Architecture Changes Required

### Component: BbjRunActionBase (MODIFIED)

**File:** `src/main/java/com/basis/bbj/intellij/actions/BbjRunActionBase.java`

**Changes:**
1. **Enhanced executable validation:**
   ```java
   protected String getBbjExecutablePath() {
       String bbjHome = BbjSettings.getInstance().getState().bbjHomePath;
       if (bbjHome == null || bbjHome.isEmpty()) {
           return null; // Caller shows "BBj home not configured"
       }

       String exeName = SystemInfo.isWindows ? "bbj.exe" : "bbj";
       Path executablePath = Paths.get(bbjHome, "bin", exeName);

       if (!Files.exists(executablePath)) {
           // Return null + log diagnostic
           return null;
       }

       if (!Files.isRegularFile(executablePath)) {
           // Directory named bbj.exe? Symlink to directory?
           return null;
       }

       // Windows: Check readable, Unix: Check executable bit
       if (!Files.isReadable(executablePath)) {
           return null;
       }

       return executablePath.toString();
   }
   ```

2. **Console-aware process execution:**
   ```java
   protected void executeWithConsole(GeneralCommandLine cmd, VirtualFile file, Project project) {
       // Get or create "BBj Run Output" tool window
       BbjRunConsoleService consoleService = BbjRunConsoleService.getInstance(project);

       // Create console view for this run
       String tabTitle = file.getName() + " (" + getRunMode() + ")";
       ConsoleView console = consoleService.createConsoleTab(tabTitle);

       // Launch process in background thread
       ApplicationManager.getApplication().executeOnPooledThread(() -> {
           try {
               OSProcessHandler handler = new OSProcessHandler(cmd);

               // Attach console
               console.attachToProcess(handler);

               // Add termination listener
               handler.addProcessListener(new ProcessTerminatedListener(
                   ProcessTerminatedListener.generateCommandLineText(cmd)
               ));

               // Start process
               handler.startNotify();

               // Optionally: Wait for completion and check exit code
               // handler.waitFor();

           } catch (ExecutionException ex) {
               console.print("Failed to launch: " + ex.getMessage() + "\n",
                             ConsoleViewContentType.ERROR_OUTPUT);
           }
       });
   }
   ```

3. **Environment type configuration:**
   ```java
   protected GeneralCommandLine buildCommandLine(...) {
       GeneralCommandLine cmd = new GeneralCommandLine(bbjPath);
       cmd.withParentEnvironmentType(GeneralCommandLine.ParentEnvironmentType.CONSOLE);
       // ... rest of command line setup
       return cmd;
   }
   ```

**Integration points:**
- Reads `BbjSettings.bbjHomePath`
- Creates `GeneralCommandLine` with console environment
- Calls new `BbjRunConsoleService` for output capture
- Notifications remain for user feedback

### Component: BbjRunConsoleService (NEW)

**File:** `src/main/java/com/basis/bbj/intellij/ui/BbjRunConsoleService.java`

**Responsibility:** Manage "BBj Run Output" tool window with dynamic console tabs

**Key methods:**
```java
public class BbjRunConsoleService implements Disposable {
    private final Project project;
    private final Map<String, ConsoleView> activeConsoles = new ConcurrentHashMap<>();

    public static BbjRunConsoleService getInstance(@NotNull Project project);

    // Create new console tab in "BBj Run Output" tool window
    public ConsoleView createConsoleTab(@NotNull String title);

    // Remove console tab when process terminates
    public void removeConsoleTab(@NotNull String title);

    // Get existing console or create new one
    public ConsoleView getOrCreateConsole(@NotNull String title);
}
```

**Architecture pattern (follows BbjServerService):**
1. Project-level service registered in plugin.xml
2. Tool window registered separately (BbjRunConsoleToolWindowFactory)
3. Service gets reference to tool window's ContentManager
4. Creates Content instances with ConsoleView components
5. Manages lifecycle: create on run, cleanup on dispose

**Integration points:**
- Called by `BbjRunActionBase.executeWithConsole()`
- Retrieves tool window via `ToolWindowManager.getInstance(project).getToolWindow("BBj Run Output")`
- Creates ConsoleView via `TextConsoleBuilderFactory`
- Manages Content via `toolWindow.getContentManager()`

### Component: BbjRunConsoleToolWindowFactory (NEW)

**File:** `src/main/java/com/basis/bbj/intellij/ui/BbjRunConsoleToolWindowFactory.java`

**Responsibility:** Factory for "BBj Run Output" tool window (registered in plugin.xml)

**Pattern (identical to BbjServerLogToolWindowFactory):**
```java
public class BbjRunConsoleToolWindowFactory implements ToolWindowFactory, DumbAware {
    @Override
    public void createToolWindowContent(@NotNull Project project, @NotNull ToolWindow toolWindow) {
        // Initial placeholder content
        ConsoleView initialConsole = TextConsoleBuilderFactory.getInstance()
            .createBuilder(project)
            .getConsole();

        Content content = ContentFactory.getInstance()
            .createContent(initialConsole.getComponent(), "Welcome", false);
        toolWindow.getContentManager().addContent(content);

        // Register service reference (service will manage tabs)
        BbjRunConsoleService service = BbjRunConsoleService.getInstance(project);
        service.initialize(toolWindow);
    }
}
```

**plugin.xml registration:**
```xml
<toolWindow id="BBj Run Output"
            factoryClass="com.basis.bbj.intellij.ui.BbjRunConsoleToolWindowFactory"
            anchor="bottom"
            icon="com.basis.bbj.intellij.BbjIcons.TOOL_WINDOW"
            canCloseContents="true"/>
```

**Differences from BbjServerLogToolWindowFactory:**
- `canCloseContents="true"` (users can close individual run tabs)
- Service manages multiple tabs instead of single console
- No auto-initialization message (tabs created on demand)

### Component: plugin.xml (MODIFIED)

**File:** `src/main/resources/META-INF/plugin.xml`

**Changes:**
1. **Add project service:**
   ```xml
   <projectService serviceImplementation="com.basis.bbj.intellij.ui.BbjRunConsoleService"/>
   ```

2. **Add tool window:**
   ```xml
   <toolWindow id="BBj Run Output"
               factoryClass="com.basis.bbj.intellij.ui.BbjRunConsoleToolWindowFactory"
               anchor="bottom"
               icon="com.basis.bbj.intellij.BbjIcons.TOOL_WINDOW"
               canCloseContents="true"/>
   ```

**No changes needed:** Action registrations remain the same (behavior changes internal to actions)

### Component: build.gradle.kts (MODIFIED for Marketplace)

**File:** `bbj-intellij/build.gradle.kts`

**Current state:** Already includes `pluginVerifier()` and `zipSigner()` dependencies

**Changes for Marketplace:**
1. **Version bump** (alpha → beta or 1.0.0):
   ```kotlin
   version = "1.0.0"
   ```

2. **Add signing configuration:**
   ```kotlin
   intellijPlatform {
       signing {
           certificateChain.set(providers.environmentVariable("CERTIFICATE_CHAIN"))
           privateKey.set(providers.environmentVariable("PRIVATE_KEY"))
           password.set(providers.environmentVariable("PRIVATE_KEY_PASSWORD"))
       }
   }
   ```

3. **Add publishing configuration:**
   ```kotlin
   intellijPlatform {
       publishing {
           token.set(providers.environmentVariable("PUBLISH_TOKEN"))
           channels.set(listOf("stable")) // or "beta"
       }
   }
   ```

4. **Add verifyPlugin task configuration:**
   ```kotlin
   tasks {
       verifyPlugin {
           // Verify against multiple IDE versions
           ides {
               ide(IntelliJPlatformType.IntellijIdeaCommunity, "2024.2")
               ide(IntelliJPlatformType.IntellijIdeaCommunity, "2024.3")
           }
       }
   }
   ```

**Integration with CI:** Environment variables set in GitHub Actions secrets

### Component: Description and Change Notes (NEW/MODIFIED)

**Files:**
- `src/main/resources/META-INF/description.html` (already exists, may need editing)
- `src/main/resources/META-INF/changeNotes.html` (NEW, created per release)

**Format:** Simple HTML (paragraphs, lists, text formatting)

**Example description.html:**
```html
<p>
BBj Language Support provides code intelligence for BBj source files in IntelliJ IDEA.
</p>

<ul>
  <li>Syntax highlighting for .bbj, .bbl, .bbjt, .src, and .bbx files</li>
  <li>Code completion, go-to-definition, and hover documentation</li>
  <li>Real-time error checking and diagnostics</li>
  <li>Run actions for GUI, BUI, and DWC programs</li>
  <li>Integrated console output for program execution</li>
</ul>

<p>
Powered by the BBj Language Server (Langium-based).
</p>
```

**Example changeNotes.html:**
```html
<h3>Version 1.0.0</h3>
<ul>
  <li>Fixed: Run commands now properly detect BBj executable on all platforms</li>
  <li>New: Console output capture in "BBj Run Output" tool window</li>
  <li>New: Multiple concurrent run outputs with separate tabs</li>
  <li>Improved: Better error messages when BBj home not configured</li>
</ul>
```

**Gradle integration:**
```kotlin
intellijPlatform {
    pluginConfiguration {
        description = file("src/main/resources/META-INF/description.html").readText()
        changeNotes.set(file("src/main/resources/META-INF/changeNotes.html").readText())
    }
}
```

## Data Flow: Run Action with Console

### Before (Current v1.1)
```
User clicks "Run As BBj Program"
  ↓
BbjRunGuiAction.actionPerformed()
  ↓
buildCommandLine() → GeneralCommandLine
  ↓
new OSProcessHandler(cmd).startNotify()
  ↓
[Process output lost]
  ↓
showSuccess() notification
```

### After (v1.2)
```
User clicks "Run As BBj Program"
  ↓
BbjRunGuiAction.actionPerformed()
  ↓
buildCommandLine() → GeneralCommandLine with CONSOLE env
  ↓
executeWithConsole(cmd, file, project)
  ↓
BbjRunConsoleService.createConsoleTab(title)
  ↓
  ├─ Get/show "BBj Run Output" tool window
  ├─ Create new ConsoleView
  └─ Add as Content tab
  ↓
ApplicationManager.executeOnPooledThread()
  ↓
new OSProcessHandler(cmd)
  ↓
console.attachToProcess(handler)
  ↓
handler.addProcessListener(ProcessTerminatedListener)
  ↓
handler.startNotify()
  ↓
[Process output → ConsoleView in real-time]
  ↓
[Process terminates → exit code displayed]
```

## Data Flow: Marketplace Publication

### One-time Setup
```
Developer generates signing certificate
  ↓
Certificate chain + private key stored in GitHub Secrets
  ↓
JetBrains Account Personal Access Token stored in GitHub Secrets
```

### Per-Release Flow
```
Update version in build.gradle.kts
  ↓
Update changeNotes.html
  ↓
Run `./gradlew verifyPlugin` (local testing)
  ↓
  ├─ Checks plugin.xml structure
  ├─ Verifies dependencies exist
  ├─ Tests against IDE version range
  └─ Reports API compatibility issues
  ↓
Commit and tag release
  ↓
GitHub Actions CI triggered
  ↓
CI runs: buildPlugin → signPlugin → publishPlugin
  ↓
  ├─ buildPlugin: Creates ZIP with all resources
  ├─ signPlugin: Signs ZIP with certificate
  └─ publishPlugin: Uploads to Marketplace
  ↓
JetBrains Marketplace automated review
  ↓
  ├─ Binary verification
  ├─ Approval guidelines check
  └─ Compatibility verification
  ↓
Plugin published (visible in Marketplace + IDE plugin browser)
```

## Component Interaction Map

```
┌─────────────────────────────────────────────────────────────┐
│                    User Action Layer                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ BbjRunGui    │  │ BbjRunBui    │  │ BbjRunDwc    │      │
│  │   Action     │  │   Action     │  │   Action     │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│         └──────────────────┴──────────────────┘             │
└────────────────────────────┬────────────────────────────────┘
                             │ extends
                             ↓
┌─────────────────────────────────────────────────────────────┐
│                 BbjRunActionBase                            │
│  ┌────────────────────────────────────────────────┐         │
│  │ getBbjExecutablePath() [MODIFIED]              │         │
│  │ - Enhanced diagnostics                         │         │
│  │ - Files.exists() + Files.isReadable()          │         │
│  │                                                 │         │
│  │ executeWithConsole() [NEW]                     │         │
│  │ - Creates console tab                          │         │
│  │ - Launches in pooled thread                    │         │
│  │ - Attaches OSProcessHandler to ConsoleView     │         │
│  └───────────────────┬────────────────────────────┘         │
└────────────────────────┼────────────────────────────────────┘
                         │ uses
                         ↓
┌─────────────────────────────────────────────────────────────┐
│              BbjRunConsoleService [NEW]                     │
│  ┌────────────────────────────────────────────────┐         │
│  │ Project-level service                          │         │
│  │                                                 │         │
│  │ createConsoleTab(title) → ConsoleView          │         │
│  │ - Gets ToolWindow from ToolWindowManager       │         │
│  │ - Creates ConsoleView via                      │         │
│  │   TextConsoleBuilderFactory                    │         │
│  │ - Adds Content to ContentManager               │         │
│  │                                                 │         │
│  │ removeConsoleTab(title)                        │         │
│  │ - Cleanup on process termination (optional)    │         │
│  └───────────────────┬────────────────────────────┘         │
└────────────────────────┼────────────────────────────────────┘
                         │ manages
                         ↓
┌─────────────────────────────────────────────────────────────┐
│          BbjRunConsoleToolWindowFactory [NEW]               │
│  ┌────────────────────────────────────────────────┐         │
│  │ Creates "BBj Run Output" ToolWindow            │         │
│  │                                                 │         │
│  │ createToolWindowContent()                      │         │
│  │ - Initial placeholder console                  │         │
│  │ - Registers with BbjRunConsoleService          │         │
│  └────────────────────────────────────────────────┘         │
└─────────────────────────────────────────────────────────────┘
                         │
                         │ registered in
                         ↓
┌─────────────────────────────────────────────────────────────┐
│                      plugin.xml                             │
│  <projectService ... BbjRunConsoleService />                │
│  <toolWindow id="BBj Run Output" ... />                     │
│  <action id="bbj.runGui" ... />  (existing)                 │
└─────────────────────────────────────────────────────────────┘
```

## Build Order Recommendations

### Phase 7: Run Command Fixes (Foundation)
**Goal:** Make executable path resolution robust + add diagnostics

**Build order:**
1. **Modify `BbjRunActionBase.getBbjExecutablePath()`**
   - Replace `File` with `Files` (NIO2)
   - Add `Files.isReadable()` check
   - Add diagnostic logging when returning null
   - **Why first:** All run actions depend on this, must be stable before console integration

2. **Add environment type to `buildCommandLine()`**
   - Set `ParentEnvironmentType.CONSOLE`
   - **Why second:** Simple addition, no dependencies on other changes

3. **Test manually with missing/broken BBj home**
   - Verify error messages are clear
   - Verify no crashes
   - **Why third:** Validates foundation before moving forward

### Phase 8: Console Integration (Feature)
**Goal:** Capture process output in tool window

**Build order:**
1. **Create `BbjRunConsoleToolWindowFactory`**
   - Copy pattern from `BbjServerLogToolWindowFactory`
   - Register in plugin.xml
   - **Why first:** Tool window must exist before service can use it

2. **Register tool window in plugin.xml**
   - Add `<toolWindow id="BBj Run Output" .../>`
   - Test that window appears (even if empty)
   - **Why second:** Validates registration before wiring logic

3. **Create `BbjRunConsoleService`**
   - Implement `getInstance()`, `createConsoleTab()`, `Disposable`
   - Register as projectService in plugin.xml
   - **Why third:** Service depends on tool window existing

4. **Wire service to tool window factory**
   - Factory calls `service.initialize(toolWindow)`
   - Service stores ContentManager reference
   - **Why fourth:** Establishes communication channel

5. **Add `executeWithConsole()` to `BbjRunActionBase`**
   - Call `BbjRunConsoleService.createConsoleTab()`
   - Create `OSProcessHandler` in pooled thread
   - Attach console with `console.attachToProcess(handler)`
   - Add `ProcessTerminatedListener`
   - **Why fifth:** Integrates all components

6. **Modify subclass `actionPerformed()`**
   - Replace direct `new OSProcessHandler()` with `executeWithConsole()`
   - Keep error handling for `buildCommandLine() == null`
   - **Why sixth:** Activates new behavior

7. **Test end-to-end**
   - Run GUI program, verify output appears
   - Run multiple programs, verify separate tabs
   - Close tab, verify cleanup
   - **Why last:** Full integration validation

### Phase 9: Marketplace Preparation (Publication)
**Goal:** Sign, verify, and publish plugin

**Build order:**
1. **Generate signing certificate**
   - Follow [Plugin Signing docs](https://plugins.jetbrains.com/docs/intellij/plugin-signing.html)
   - Store in 1Password or secure location
   - **Why first:** One-time setup, blocks signing tasks

2. **Add GitHub Secrets**
   - `CERTIFICATE_CHAIN`, `PRIVATE_KEY`, `PRIVATE_KEY_PASSWORD`
   - `PUBLISH_TOKEN` (from JetBrains Account)
   - **Why second:** CI will fail without these

3. **Update build.gradle.kts**
   - Bump version to 1.0.0
   - Add `signing {}` block
   - Add `publishing {}` block
   - **Why third:** Configuration before attempting build

4. **Create/update description.html**
   - Clear value proposition
   - Feature list
   - **Why fourth:** Required for Marketplace listing

5. **Create changeNotes.html**
   - v1.0.0 changes
   - Bug fixes and new features
   - **Why fifth:** Required for release

6. **Run `./gradlew verifyPlugin` locally**
   - Fix any compatibility issues
   - **Why sixth:** Catch problems before CI

7. **Create GitHub Actions workflow**
   - Trigger on tag push
   - Run: verifyPlugin → buildPlugin → signPlugin → publishPlugin
   - **Why seventh:** Automates release process

8. **Tag release and push**
   - CI builds and publishes
   - Monitor for errors
   - **Why eighth:** Final publication

9. **Verify on Marketplace**
   - Check plugin page displays correctly
   - Test installation in clean IDE
   - **Why last:** Validates public release

## Common Pitfalls and Mitigations

### Pitfall 1: EDT Blocking with Process Wait

**Problem:** Calling `handler.waitFor()` on Event Dispatch Thread freezes UI

**Detection:** IntelliJ 2024.1+ logs "There is no ProgressIndicator or Job in this thread"

**Mitigation:**
- Always launch process in `ApplicationManager.getApplication().executeOnPooledThread()`
- Never call synchronous process operations in `actionPerformed()` directly
- Use process listeners for completion detection instead of blocking waits

**Phase affected:** Phase 8 (Console Integration)

### Pitfall 2: Plugin Verifier Fails on Missing Dependencies

**Problem:** Plugin references classes not available in target IDE version

**Detection:** `./gradlew verifyPlugin` reports "Plugin references a class which is not available in the IDE"

**Common causes:**
- Using API added in newer IDE version
- Missing dependency plugin declaration
- Incorrect `sinceBuild` in plugin.xml

**Mitigation:**
- Run verifyPlugin against minimum supported IDE version (2024.2)
- Check [IntelliJ Platform API Changes](https://plugins.jetbrains.com/docs/intellij/api-changes-list.html)
- Test in IDE matching `sinceBuild` version

**Phase affected:** Phase 9 (Marketplace Preparation)

### Pitfall 3: Process Output Encoding Issues

**Problem:** BBj output contains non-ASCII characters (errors in Spanish locale), displays as garbage in console

**Detection:** Console shows `??????` or box characters

**Mitigation:**
- Set charset on `GeneralCommandLine`: `cmd.withCharset(StandardCharsets.UTF_8)`
- BBj typically outputs in platform default encoding
- On Windows, may need `Charset.forName("windows-1252")`
- Test with non-ASCII file paths and error messages

**Phase affected:** Phase 8 (Console Integration)

### Pitfall 4: Tool Window Content Leak

**Problem:** Creating ConsoleView tabs without disposal causes memory leak

**Detection:** Multiple runs → OutOfMemoryError or IDE slowdown

**Mitigation:**
- Register each ConsoleView with `Disposer.register(toolWindow.getDisposable(), console)`
- Remove Content from ContentManager when tab closed
- Listen for Content removal events: `ContentManager.addContentManagerListener()`

**Phase affected:** Phase 8 (Console Integration)

### Pitfall 5: Marketplace Rejection for Missing Organization

**Problem:** First-time publication fails with "Plugin must be published by an organization"

**Detection:** JetBrains Marketplace returns error during upload

**Mitigation:**
- Create organization on [JetBrains Marketplace](https://plugins.jetbrains.com/author/me)
- Add `organizationId` to plugin.xml (not currently in build.gradle.kts config)
- Re-upload plugin

**Phase affected:** Phase 9 (Marketplace Preparation)

### Pitfall 6: BBj Executable Path with Spaces

**Problem:** BBj installed in `C:\Program Files\BBx\` fails to launch

**Detection:** `ExecutionException: Cannot run program "C:\Program": CreateProcess error=2, The system cannot find the file specified`

**Root cause:** GeneralCommandLine splits on spaces if not properly quoted

**Mitigation:**
- `GeneralCommandLine` constructor handles quoting automatically
- Verify with: `cmd.getCommandLineString()` (should show quoted path)
- Do NOT manually quote executable path
- Working: `new GeneralCommandLine("C:\\Program Files\\BBx\\bin\\bbj.exe")`
- Broken: `new GeneralCommandLine("\"C:\\Program Files\\BBx\\bin\\bbj.exe\"")`

**Phase affected:** Phase 7 (Run Command Fixes)

## Testing Strategy

### Unit Testing Approach

**Current state:** No unit tests exist

**Recommendation:** Unit tests for Phase 9 only (v1.2 is bug fix + small feature)

**Testable components:**
1. **BbjRunActionBase.getBbjExecutablePath()**
   - Mock file system with jimfs
   - Test: null when bbjHome unset
   - Test: null when bin/bbj missing
   - Test: null when bin/bbj is directory
   - Test: valid path when all conditions met

2. **BbjRunConsoleService tab management**
   - Test: createConsoleTab() adds Content
   - Test: duplicate title handling
   - Test: removeConsoleTab() cleanup

**Phase affected:** Optional for v1.2, recommended for v1.3+

### Manual Testing Checklist

**Phase 7: Run Command Fixes**
- [ ] Run GUI program with valid BBj home → Success
- [ ] Run GUI program with unset BBj home → Clear error
- [ ] Run GUI program with wrong BBj home → Clear error
- [ ] Run GUI program with bbj.exe renamed → Clear error (Windows)
- [ ] Run BUI program → Same validations
- [ ] Run DWC program → Same validations

**Phase 8: Console Integration**
- [ ] Run GUI program → Output appears in "BBj Run Output" window
- [ ] Run GUI program twice → Two separate tabs
- [ ] Close console tab → Tab removed, no errors
- [ ] Run program that prints to stdout → Text appears in real-time
- [ ] Run program that prints to stderr → Text appears (colored red)
- [ ] Run program that exits with error → Exit code displayed
- [ ] Run program with non-ASCII characters → No encoding issues

**Phase 9: Marketplace Preparation**
- [ ] `./gradlew verifyPlugin` → No errors
- [ ] `./gradlew buildPlugin` → ZIP created in build/distributions/
- [ ] `./gradlew signPlugin` → ZIP signature valid
- [ ] Install signed plugin in clean IDE → Plugin loads
- [ ] Upload to Marketplace → Accepted
- [ ] View plugin page on Marketplace → Description displays correctly
- [ ] Install from Marketplace → Works in fresh IDE

## Performance Considerations

### OSProcessHandler Thread Pool

**Current:** Each run action creates new `OSProcessHandler`, runs on pooled thread

**Impact:** Multiple concurrent runs use separate threads (OK, thread pool managed by platform)

**Recommendation:** No change needed. Platform handles thread lifecycle.

### Console Buffer Size

**Default:** IntelliJ ConsoleView has configurable buffer limit

**Concern:** BBj program with massive output (e.g., debug logging loop) could cause:
- Memory pressure
- UI lag scrolling console

**Mitigation:**
- Accept default buffer size (typically 1 MB)
- Document: Users should avoid `PRINT` loops for large datasets
- Future: Add "Clear Console" action to toolbar

### Tool Window Activation

**Current:** Tool window activation on every run could be disruptive

**Recommendation:**
- Do NOT auto-show tool window on every run
- User must manually open "BBj Run Output" window first time
- Subsequent runs add tabs without stealing focus
- Use `toolWindow.show()` only on explicit user action

## Version Compatibility Matrix

| Component | Minimum Version | Maximum Version | Notes |
|-----------|----------------|-----------------|-------|
| IntelliJ IDEA | 2024.2 (242) | 2024.3+ (open) | `sinceBuild="242"`, `untilBuild=""` |
| Java (plugin) | 17 | 21 | Plugin compiled with Java 17 target |
| Java (runtime) | 17 | 21+ | IntelliJ 2024.2 requires Java 17+ |
| Gradle | 8.5+ | 8.x | Kotlin DSL, IntelliJ Platform Plugin 2.x |
| LSP4IJ | 0.19.0 | 0.19.x | Language Server Protocol support |
| BBj (target) | 23.00+ | 24.x | User's BBj installation |

**Implications for Marketplace:**
- Plugin compatible with IntelliJ 2024.2, 2024.3, and future versions
- Marketplace verifier checks API usage against 2024.2
- Users on 2024.1 or earlier cannot install (enforced by platform)

## Success Criteria

### Phase 7: Run Command Fixes
- [x] Executable path validation uses NIO2 `Files` API
- [x] Clear error message when BBj home not configured
- [x] Clear error message when bbj executable missing
- [x] No crashes with broken symlinks or special file types
- [x] Diagnostic logging for troubleshooting

### Phase 8: Console Integration
- [x] "BBj Run Output" tool window appears in bottom panel
- [x] Each run creates separate console tab with title format: `{filename} ({mode})`
- [x] Process stdout/stderr captured in real-time
- [x] Process exit code displayed on termination
- [x] Multiple concurrent runs supported (separate tabs)
- [x] Console tabs closeable by user
- [x] No memory leaks from unclosed consoles
- [x] Process launched on pooled thread (no EDT blocking)

### Phase 9: Marketplace Preparation
- [x] Plugin signed with valid certificate
- [x] `verifyPlugin` task passes with no errors
- [x] Plugin uploaded to JetBrains Marketplace
- [x] Plugin page displays correctly (description, version, compatibility)
- [x] Plugin installable from Marketplace in fresh IDE
- [x] CI pipeline automates: build → sign → publish
- [x] Change notes document v1.0.0 features

## Sources

**IntelliJ Platform SDK (Official):**
- [Execution | IntelliJ Platform Plugin SDK](https://plugins.jetbrains.com/docs/intellij/execution.html)
- [Tool Windows | IntelliJ Platform Plugin SDK](https://plugins.jetbrains.com/docs/intellij/tool-windows.html)
- [Plugin Signing | IntelliJ Platform Plugin SDK](https://plugins.jetbrains.com/docs/intellij/plugin-signing.html)
- [Publishing a Plugin | IntelliJ Platform Plugin SDK](https://plugins.jetbrains.com/docs/intellij/publishing-plugin.html)
- [Preparing your plugin for publication | JetBrains Marketplace Documentation](https://plugins.jetbrains.com/docs/marketplace/prepare-your-plugin-for-publication.html)
- [Tasks | IntelliJ Platform Plugin SDK](https://plugins.jetbrains.com/docs/intellij/tools-intellij-platform-gradle-plugin-tasks.html)

**IntelliJ Platform API Documentation:**
- [OSProcessHandler (JetBrains intellij-community)](https://github.com/JetBrains/intellij-community/blob/master/platform/platform-util-io/src/com/intellij/execution/process/OSProcessHandler.java)
- [GeneralCommandLine (JetBrains intellij-community)](https://github.com/17712484466/intellij-community/blob/master/platform/platform-api/src/com/intellij/execution/configurations/GeneralCommandLine.java)
- [ToolWindowManager.kt (JetBrains intellij-community)](https://github.com/JetBrains/intellij-community/blob/master/platform/platform-api/src/com/intellij/openapi/wm/ToolWindowManager.kt)

**Community Support:**
- [How to make a simple console output – IDEs Support](https://intellij-support.jetbrains.com/hc/en-us/community/posts/206756385-How-to-make-a-simple-console-output)
- [Running commands in console from IntelliJ plugin actions – Create & Learn](https://javaworklife.wordpress.com/2020/11/02/running-console-commands-from-intellij-plugin-actions/)
- [How to automatically open a 'Tool Window' used as a custom console view – IDEs Support](https://intellij-support.jetbrains.com/hc/en-us/community/posts/4407224795794-How-to-automatically-open-a-Tool-Window-used-as-a-custom-console-view-when-launching-a-action)

**IntelliJ Plugin Verifier:**
- [intellij-plugin-verifier (GitHub)](https://github.com/JetBrains/intellij-plugin-verifier)
- [Verifying Plugin Compatibility | IntelliJ Platform Plugin SDK](https://plugins.jetbrains.com/docs/intellij/verifying-plugin-compatibility.html)

**Code Examples:**
- [ConsoleView.attachToProcess examples (Tabnine)](https://www.tabnine.com/code/java/classes/com.intellij.execution.ui.ConsoleView)
- [GeneralCommandLine examples (Tabnine)](https://www.tabnine.com/code/java/classes/com.intellij.execution.configurations.GeneralCommandLine)

**Platform Updates:**
- [Busy Plugin Developers Newsletter – Q4 2025 | JetBrains Platform Blog](https://blog.jetbrains.com/platform/2026/01/busy-plugin-developers-newsletter-q4-2025/)
