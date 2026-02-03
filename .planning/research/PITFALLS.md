# Domain Pitfalls: IntelliJ Plugin Run Commands, Console Integration, and Marketplace Publication

**Domain:** IntelliJ Platform Plugin Development (2024.2+)
**Researched:** 2026-02-02
**Context:** v1.2 milestone - fixing run commands, adding console output capture, preparing for JetBrains Marketplace

## Critical Pitfalls

Mistakes that cause rewrites or major issues.

### Pitfall 1: MainToolBar Action Registration Broken in New UI (2024.2+)

**What goes wrong:** Actions registered to `group-id="MainToolBar"` in plugin.xml appear in Classic UI but are invisible in the New UI (enabled by default in IntelliJ 2024.2+). Toolbar appears empty despite correct XML registration.

**Why it happens:** IntelliJ 2024.2 introduced a redesigned "New UI" with different toolbar architecture. The `MainToolBar` group ID still exists for backward compatibility but is not automatically surfaced in the New UI. Actions need explicit registration to New UI-specific toolbar groups.

**Consequences:**
- Users on default New UI see no toolbar buttons
- Plugin appears broken on fresh IntelliJ installations
- Manual "Customize Toolbar" required to surface actions
- Affects both Community and Ultimate editions

**Prevention:**
1. Register actions to **both** Classic and New UI toolbar groups:
   - Classic UI: `group-id="MainToolBar"`
   - New UI: `group-id="MainToolBarSettings"` or alternative New UI groups (`NavBarVcsGroup`, `VcsToobarActions`)
2. Test plugin with **New UI enabled** (Settings > Appearance & Behavior > New UI)
3. Test on both IntelliJ Community Edition and Ultimate Edition
4. Check toolbar visibility immediately after plugin installation (not just after customization)

**Detection:**
- Install plugin in fresh IntelliJ 2024.2+ instance with New UI enabled
- Check if toolbar actions visible without manual customization
- Switch between Classic UI and New UI to verify both work

**References:**
- [New UI toolbar registration discussion](https://platform.jetbrains.com/t/registering-action-in-new-ui-main-toolbar/1310)
- [Action group icons not showing in New UI](https://intellij-support.jetbrains.com/hc/en-us/community/posts/15268937638290-Action-group-Icon-doesn-t-show-up-for-newUI)
- [Action System documentation](https://plugins.jetbrains.com/docs/intellij/action-system.html)

---

### Pitfall 2: ProcessHandler Lifecycle Violation - startNotify() Not Called

**What goes wrong:** Creating `OSProcessHandler` or `GeneralCommandLine.createProcess()` but forgetting to call `processHandler.startNotify()`. Process starts but output is never captured. Console remains blank even though process executes.

**Why it happens:** The ProcessHandler API requires explicit `startNotify()` call to begin capturing stdout/stderr. Many developers assume `new OSProcessHandler(commandLine)` or executing the command line automatically starts monitoring, but it doesn't.

**Consequences:**
- Process runs but console shows no output
- `ProcessListener` events never fire
- `processTerminated()` event never fires
- Cannot detect when process completes
- Silent failures - process errors invisible to users

**Prevention:**
1. **Always call `startNotify()` after creating ProcessHandler:**
   ```java
   OSProcessHandler handler = new OSProcessHandler(cmd);
   handler.addProcessListener(listener); // Optional
   handler.startNotify(); // REQUIRED - do not forget
   ```
2. Attach `ProcessTerminatedListener.attach(handler)` for proper exit status display
3. Create ConsoleView and call `consoleView.attachToProcess(handler)` **before** `startNotify()`
4. Follow strict lifecycle order:
   - Create ProcessHandler
   - Attach listeners
   - Attach ConsoleView
   - Call `startNotify()`

**Detection:**
- Process launches but console tool window shows nothing
- No process output despite verbose program execution
- Process termination events never fire
- IDE shows "Running..." status indefinitely

**References:**
- [Execution documentation](https://plugins.jetbrains.com/docs/intellij/execution.html)
- [ProcessHandler lifecycle order](https://github.com/JetBrains/intellij-community/blob/master/platform/util/src/com/intellij/execution/process/ProcessHandler.java)

---

### Pitfall 3: File.separator Path Construction Fails Cross-Platform

**What goes wrong:** Building file paths using `new File(bbjHome, "bin/" + exeName)` with hardcoded forward slash. On Windows, this constructs paths like `C:\BBj\bin/bbj.exe` (mixed separators), which may exist but fail `File.exists()` checks in certain contexts. On macOS with special characters in paths, mixed separators cause path resolution failures.

**Why it happens:**
- Java `File` constructor accepts both separators on most platforms but mixing them is fragile
- IntelliJ VirtualFileSystem normalizes to forward slashes, creating inconsistency
- Windows tolerates mixed separators but some File API methods fail unpredictably
- Developers test on one platform (macOS uses `/`) and miss Windows-specific issues

**Consequences:**
- `getBbjExecutablePath()` returns null even when BBj Home is correctly configured
- Run actions disabled despite valid configuration
- Different behavior on Windows vs macOS/Linux
- Hard to debug - path "looks correct" when printed

**Prevention:**
1. **Use File constructor chaining** instead of string concatenation:
   ```java
   File binDir = new File(bbjHome, "bin");
   File executable = new File(binDir, exeName);
   ```
2. **Or use Path API** (Java 7+) with platform-agnostic separators:
   ```java
   Path executable = Paths.get(bbjHome, "bin", exeName);
   ```
3. **Never hardcode `/` or `\\`** in path construction
4. Use `File.separator` only if absolutely necessary (avoid string concatenation)
5. Test on **both** Windows and macOS/Linux before release

**Detection:**
- Run action returns "BBj executable not found" despite valid BBj Home
- Print `executable.getAbsolutePath()` and observe mixed separators
- `File.exists()` returns false but manual navigation finds the file
- Works on macOS, fails on Windows (or vice versa)

**References:**
- [VirtualFile path format (always forward slashes)](https://plugins.jetbrains.com/docs/intellij/virtual-file.html)
- [Cross-platform file path discussion](https://dev.to/kailashnirmal/understanding-file-path-formats-in-windows-and-java-for-cross-platform-compatibility-2im3)
- [Hardcoded file separator issues](https://intellij-support.jetbrains.com/hc/en-us/community/posts/206131989--IG-Hardcoded-file-separator-should-be-more-selective)

---

### Pitfall 4: JetBrains Marketplace Plugin Verifier Fails on Internal API Usage

**What goes wrong:** Plugin uses `@ApiStatus.Internal` annotated classes or methods (e.g., `PlatformUtils.isRider()`, `PlatformUtils.isCLion()`) that appear in IDE autocomplete. Plugin builds successfully locally but fails Plugin Verifier during Marketplace upload, causing automatic rejection.

**Why it happens:**
- IntelliJ IDEA autocomplete suggests internal APIs without clear warnings
- APIs marked `@Internal` are private and subject to breaking changes without notice
- Plugin Verifier enforces this constraint but local builds do not
- Kotlin `internal` visibility modifier also triggers violations

**Consequences:**
- Plugin rejected by Marketplace automated checks
- Upload fails with cryptic "internal API usage" errors
- Must refactor and re-upload, delaying release
- Breaking changes in future IntelliJ versions silently break plugin

**Prevention:**
1. **Enable IDE inspections before submission:**
   - Settings > Editor > Inspections > JVM languages > "Unstable API Usage"
   - Plugin DevKit > Code > "Usages of ApiStatus.@Obsolete"
   - Plugin DevKit > Code > "Usage of IntelliJ API not available in older IDEs"
2. **Run Plugin Verifier locally** before upload:
   ```bash
   ./gradlew runPluginVerifier
   ```
3. **Integrate into CI pipeline** to catch violations automatically
4. **Consult [Internal API Migration guide](https://plugins.jetbrains.com/docs/intellij/api-internal.html)** when flagged
5. **Review [Incompatible Changes](https://plugins.jetbrains.com/docs/intellij/api-changes-list-2025.html)** for your target platform version

**Detection:**
- IDE inspection highlights usage in yellow/red
- Plugin Verifier output shows "Internal API must not be used"
- Marketplace upload fails with compatibility errors
- Scheduled CI builds fail after IntelliJ platform update

**References:**
- [Plugin Verifier documentation](https://plugins.jetbrains.com/docs/intellij/verifying-plugin-compatibility.html)
- [Internal API migration](https://plugins.jetbrains.com/docs/intellij/api-internal.html)
- [Plugin Verifier livestream](https://blog.jetbrains.com/platform/2025/05/plugin-verifier-and-api-compatibility-maintenance-livestream-recording-amp-key-takeaways/)

---

## Moderate Pitfalls

Mistakes that cause delays or technical debt.

### Pitfall 5: Console Output Lost Due to Execution Context Mismatch

**What goes wrong:** Creating `OSProcessHandler` and calling `startNotify()` but not displaying output in a tool window. Output is captured but never shown to the user. Process succeeds/fails silently.

**Why it happens:** ProcessHandler captures output but requires explicit connection to `ConsoleView` to display it. Developers focus on launching the process and forget the UI presentation layer.

**Prevention:**
1. Create `ConsoleView` using `TextConsoleBuilderFactory`:
   ```java
   ConsoleView console = TextConsoleBuilderFactory.getInstance()
       .createBuilder(project)
       .getConsole();
   ```
2. Attach to process **before** `startNotify()`:
   ```java
   console.attachToProcess(processHandler);
   ```
3. Display in tool window using `ToolWindowManager` or `ExecutionManager`
4. Study reference implementations like `MavenRunConfiguration` or `BuildView`

**Detection:**
- Process runs but no output visible anywhere
- Users cannot see compilation errors or runtime output
- Success/failure unclear without checking exit code manually

**References:**
- [Running console command from plugin](https://intellij-support.jetbrains.com/hc/en-us/community/posts/360007850040-Running-console-command-from-plugin-and-displaying-the-output)
- [ConsoleView integration examples](https://www.tabnine.com/code/java/classes/com.intellij.execution.ui.ConsoleView)

---

### Pitfall 6: Marketplace Rejection - Plugin Name Too Long or Contains Restricted Terms

**What goes wrong:** Plugin submitted with name like "BBj Language Support Plugin for IntelliJ IDEA" (47 chars). Marketplace rejects due to:
- Name exceeds 30 character limit
- Contains restricted word "Plugin"
- Contains restricted word "IntelliJ"

**Why it happens:** Developers create descriptive names without reading approval guidelines. Common pattern: "{Language} {Feature} Plugin for IntelliJ IDEA".

**Prevention:**
1. **Keep name ≤30 characters**
2. **Avoid restricted terms:** "Plugin", "IntelliJ", "JetBrains", "IDEA"
3. **Use description field for detail**, not the name
4. **Examples of compliant names:**
   - "BBj Language Support" ✓ (21 chars)
   - "BBj Tools" ✓ (9 chars)
   - "BBj Language Plugin" ✗ (contains "Plugin")
   - "IntelliJ BBj Support" ✗ (contains "IntelliJ")

**Detection:**
- Marketplace upload form shows character count
- Automated approval check flags restricted terms
- Review feedback from JetBrains within 3-4 days

**References:**
- [Marketplace Approval Guidelines](https://plugins.jetbrains.com/docs/marketplace/jetbrains-marketplace-approval-guidelines.html)
- [Best practices for listing](https://plugins.jetbrains.com/docs/marketplace/best-practices-for-listing.html)

---

### Pitfall 7: Marketplace Rejection - Missing or Invalid Custom Logo

**What goes wrong:** Plugin submitted with:
- Default IntelliJ plugin icon (template)
- Logo not 40x40px SVG format
- Logo too similar to JetBrains branding

Marketplace rejects for "missing unique plugin logo."

**Why it happens:** Developers focus on functionality and treat branding as optional polish. Guidelines require **unique, distinct** logo before approval.

**Prevention:**
1. Create **custom 40x40px SVG icon** (not PNG, not template)
2. Ensure icon is **visually distinct** from JetBrains logos
3. Test in both light and dark themes (provide `_dark.svg` variant if needed)
4. Upload via Plugin Upload page > Plugin Icon field
5. Reference in `plugin.xml` if bundled

**Detection:**
- Marketplace review feedback: "unique plugin icon required"
- Upload form shows default icon preview
- Compare with approved plugins in Marketplace

**References:**
- [Marketplace Approval Guidelines - Logo requirements](https://plugins.jetbrains.com/docs/marketplace/jetbrains-marketplace-approval-guidelines.html)
- [Uploading a new plugin](https://plugins.jetbrains.com/docs/marketplace/uploading-a-new-plugin.html)

---

### Pitfall 8: Execution Fails Silently - No Exception Shown to User

**What goes wrong:** `OSProcessHandler` construction throws `ExecutionException` but it's caught and logged without user-visible error. User clicks "Run" and nothing happens - no notification, no console, no error dialog.

**Why it happens:**
- Catch block logs exception via `LOG.error()` but doesn't show notification
- Gradle integration may suppress exception details showing only "non-zero exit code"
- Process fails before ConsoleView attachment, so errors never reach UI

**Prevention:**
1. **Always show user-visible error** when execution fails:
   ```java
   try {
       OSProcessHandler handler = new OSProcessHandler(cmd);
       handler.startNotify();
   } catch (ExecutionException ex) {
       showError(project, "Failed to launch: " + ex.getMessage());
   }
   ```
2. Include **actionable error details** (missing executable, permission denied, etc.)
3. Consider adding console output even for setup failures
4. Test with **invalid configurations** to verify error handling

**Detection:**
- Click "Run" and nothing happens
- No console window opens
- No error notification appears
- Check IDE logs to find hidden exception

**References:**
- [Process.exec different results within IntelliJ](https://intellij-support.jetbrains.com/hc/en-us/community/posts/360003376100-Process-exec-different-results-within-IntelliJ)
- [Gradle console output cleared after error](https://intellij-support.jetbrains.com/hc/en-us/community/posts/7582027179282-Gradle-console-output-cleared-after-error)

---

### Pitfall 9: Marketplace Rejection - Broken or Inaccessible Repository Link

**What goes wrong:** Plugin submitted with repository link pointing to:
- Private GitHub repository (not publicly accessible)
- Incorrect URL (404 error)
- Repository with no content or README

Marketplace rejects because reviewers cannot verify source code or validate open-source claims.

**Why it happens:** Plugin developed in private repo, developer forgets to make public before submission. Or link copy-pasted incorrectly from browser.

**Prevention:**
1. **Make repository public** before Marketplace submission
2. **Test link in private browser** to verify accessibility
3. Include **working README** with build instructions
4. For open-source plugins, link is **mandatory** per guidelines
5. Add repository URL in `plugin.xml`:
   ```xml
   <vendor url="https://github.com/your-org/your-plugin">...</vendor>
   ```

**Detection:**
- Marketplace review feedback: "repository inaccessible"
- Open link in incognito/private browser - does it work?
- Check GitHub repo settings - is it public?

**References:**
- [Webinar: Uploading a Plugin to Marketplace](https://blog.jetbrains.com/platform/2023/11/webinar-recording-uploading-a-plugin-to-jetbrains-marketplace/)
- [Marketplace Approval Guidelines](https://plugins.jetbrains.com/docs/marketplace/jetbrains-marketplace-approval-guidelines.html)

---

## Minor Pitfalls

Mistakes that cause annoyance but are fixable.

### Pitfall 10: Action Update Performance - Slow Toolbar State Checks

**What goes wrong:** `AnAction.update()` method performs heavy computation (file system access, network calls, parsing) to determine if action should be enabled. Toolbar freezes or lags on every focus change or user activity.

**Why it happens:** Developers don't realize `update()` is called **frequently** - on every user activity, focus transfer, or keystroke. Treating it like `actionPerformed()` causes performance issues.

**Prevention:**
1. **Keep `update()` fast** - official docs: "no real work must be performed"
2. **Cache state** and invalidate on meaningful events
3. Use `ActionUpdateThread.BGT` (background thread) to avoid EDT blocking
4. If state changes outside user activity, call `ActivityTracker.getInstance().inc()` to refresh
5. For file checks, use `VirtualFile` API (cached) not `java.io.File` (disk access)

**Detection:**
- Toolbar or menu feels sluggish
- IDE freezes briefly on file switching
- Profiler shows high CPU in `update()` method
- Users report "unresponsive UI"

**References:**
- [Action System - Target Component](https://plugins.jetbrains.com/docs/intellij/action-system.html)
- [Creating Actions tutorial](https://plugins.jetbrains.com/docs/intellij/working-with-custom-actions.html)

---

### Pitfall 11: ConsoleView ProcessListener Events Not Firing

**What goes wrong:** Added `ProcessListener` to capture `processTerminated()` or `onTextAvailable()` events, but callbacks never fire. Process completes but listener remains silent.

**Why it happens:** Listener added **after** `startNotify()` was called. ProcessHandler fires events only to listeners registered **before** `startNotify()`.

**Prevention:**
1. **Add listeners BEFORE `startNotify()`:**
   ```java
   OSProcessHandler handler = new OSProcessHandler(cmd);
   handler.addProcessListener(new ProcessAdapter() {
       @Override
       public void processTerminated(@NotNull ProcessEvent event) {
           // Handle termination
       }
   });
   handler.startNotify(); // Now listener will receive events
   ```
2. Verify listener attachment order in code review
3. Use `ProcessTerminatedListener.attach(handler)` for standard exit status handling

**Detection:**
- `processTerminated()` never called
- Console doesn't show "Process finished with exit code X"
- Cannot detect when process completes
- Callbacks work in unit tests but not production

**References:**
- [ProcessHandler lifecycle](https://github.com/JetBrains/intellij-community/blob/master/platform/util/src/com/intellij/execution/process/ProcessHandler.java)
- [ProcessListener examples](https://www.javatips.net/api/com.intellij.execution.process.processhandler)

---

### Pitfall 12: Windows Path Length Limit (260 chars) Not Handled

**What goes wrong:** Plugin works on macOS/Linux but fails on Windows when project path exceeds 260 characters. File operations fail with cryptic errors like "The filename or extension is too long."

**Why it happens:** Windows has legacy MAX_PATH limitation (260 chars) unless long path support is explicitly enabled. Deep project structures with long artifact names hit this limit.

**Prevention:**
1. **Warn users** if project path approaching limit
2. Use relative paths where possible
3. Document Windows long path workaround in plugin description
4. Consider shorter artifact names in plugin distribution
5. Test on Windows with nested project structure (e.g., `C:\Users\VeryLongUserName\Projects\...`)

**Detection:**
- Plugin works on macOS, fails on Windows
- Error: "The filename or extension is too long"
- File operations return unexpected null/errors
- Works in shallow directories, fails in deep ones

**References:**
- [Windows path length limitation](https://learn.microsoft.com/en-us/windows/win32/fileio/maximum-file-path-limitation)

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Fix run command path resolution | Pitfall 3: Mixed separators in File paths | Use `File(parent, child)` constructor, test on Windows |
| Add toolbar button visibility | Pitfall 1: MainToolBar not visible in New UI | Register to both MainToolBar and MainToolBarSettings groups |
| Integrate console output | Pitfall 2: startNotify() not called | Follow strict lifecycle: create → attach → startNotify() |
| Integrate console output | Pitfall 5: ConsoleView not displayed | Create ConsoleView and show in tool window via ToolWindowManager |
| Prepare Marketplace submission | Pitfall 4: Internal API usage | Run `./gradlew runPluginVerifier` before upload |
| Prepare Marketplace submission | Pitfall 6: Plugin name too long | Rename to ≤30 chars, remove "Plugin"/"IntelliJ" words |
| Prepare Marketplace submission | Pitfall 7: Missing custom logo | Create 40x40px SVG logo, test in both themes |
| Prepare Marketplace submission | Pitfall 9: Private repository link | Make repo public, test link in private browser |
| Cross-platform testing | Pitfall 3: Path separator issues | Test on both Windows and macOS before release |
| Cross-platform testing | Pitfall 12: Windows path length | Test with deep project path on Windows |

---

## Research Confidence

| Area | Confidence | Source Quality |
|------|------------|----------------|
| New UI toolbar issues | HIGH | Official JetBrains forums + SDK docs + recent 2025 discussions |
| ProcessHandler lifecycle | HIGH | Official execution.html docs + IntelliJ source code |
| File path cross-platform | HIGH | VirtualFile docs + community discussions + Java best practices |
| Marketplace approval | HIGH | Official approval guidelines + submission docs |
| Plugin Verifier | HIGH | Official verifier docs + livestream recording |
| Console integration | MEDIUM | Community forums + code examples (no single authoritative source) |
| Windows path limits | MEDIUM | General Windows API knowledge + IntelliJ support forums |

---

## Sources

**New UI and Toolbar Actions:**
- [New UI toolbar registration](https://platform.jetbrains.com/t/registering-action-in-new-ui-main-toolbar/1310)
- [New UI lost toolbars](https://intellij-support.jetbrains.com/hc/en-us/community/posts/20802107307154--New-UI-lost-toolbars-and-settings)
- [Action group icons not showing in New UI](https://intellij-support.jetbrains.com/hc/en-us/community/posts/15268937638290-Action-group-Icon-doesn-t-show-up-for-newUI)
- [Action System documentation](https://plugins.jetbrains.com/docs/intellij/action-system.html)

**ProcessHandler and Execution:**
- [Execution documentation](https://plugins.jetbrains.com/docs/intellij/execution.html)
- [ProcessHandler source code](https://github.com/JetBrains/intellij-community/blob/master/platform/util/src/com/intellij/execution/process/ProcessHandler.java)
- [Running console command from plugin](https://intellij-support.jetbrains.com/hc/en-us/community/posts/360007850040-Running-console-command-from-plugin-and-displaying-the-output)
- [Process exec different results](https://intellij-support.jetbrains.com/hc/en-us/community/posts/360003376100-Process-exec-different-results-within-IntelliJ)

**Cross-Platform File Paths:**
- [VirtualFile documentation](https://plugins.jetbrains.com/docs/intellij/virtual-file.html)
- [File path formats for cross-platform compatibility](https://dev.to/kailashnirmal/understanding-file-path-formats-in-windows-and-java-for-cross-platform-compatibility-2im3)
- [Hardcoded file separator issues](https://intellij-support.jetbrains.com/hc/en-us/community/posts/206131989--IG-Hardcoded-file-separator-should-be-more-selective)

**JetBrains Marketplace:**
- [Marketplace Approval Guidelines](https://plugins.jetbrains.com/docs/marketplace/jetbrains-marketplace-approval-guidelines.html)
- [Publishing and listing your plugin](https://plugins.jetbrains.com/docs/marketplace/publishing-and-listing-your-plugin.html)
- [Uploading a new plugin](https://plugins.jetbrains.com/docs/marketplace/uploading-a-new-plugin.html)
- [Webinar: Uploading a Plugin to Marketplace](https://blog.jetbrains.com/platform/2023/11/webinar-recording-uploading-a-plugin-to-jetbrains-marketplace/)

**Plugin Verifier:**
- [Verifying Plugin Compatibility](https://plugins.jetbrains.com/docs/intellij/verifying-plugin-compatibility.html)
- [Plugin Verifier GitHub](https://github.com/JetBrains/intellij-plugin-verifier)
- [Plugin Verifier and API Compatibility Maintenance](https://blog.jetbrains.com/platform/2025/05/plugin-verifier-and-api-compatibility-maintenance-livestream-recording-amp-key-takeaways/)
- [Internal API Migration](https://plugins.jetbrains.com/docs/intellij/api-internal.html)
- [Incompatible Changes in 2025](https://plugins.jetbrains.com/docs/intellij/api-changes-list-2025.html)
