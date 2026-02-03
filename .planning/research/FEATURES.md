# Feature Landscape: IntelliJ Run Commands, Console Integration, and Marketplace Readiness

**Domain:** IntelliJ IDEA Plugin Development (Run Execution + Marketplace Publication)
**Project:** BBj Language Server IntelliJ Plugin v1.2
**Researched:** 2026-02-02

## Table Stakes

Features users expect. Missing = product feels incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Run Action Execution** | Core workflow — users expect "run" to actually run programs | Low | Already exists but broken — "executable not found" despite BBj Home configured |
| **Console Output Capture** | Users need to see program output to debug/verify behavior | Medium | OSProcessHandler exists but not connected to ConsoleView — output disappears into void |
| **Error Messages on Run Failure** | Users need to know why execution failed | Low | Already exists (error notification balloons) but needs improvement for "executable not found" debugging |
| **Working Directory Context** | Run commands must execute in correct directory context | Low | Already working (project root via -WD flag) |
| **Auto-Save Before Run** | Prevent "running stale code" confusion | Low | Already working (configurable setting) |
| **Valid Plugin Description** | Marketplace requires first 40 chars in English with clear value prop | Low | Needs writing — current PROJECT.md description can be adapted |
| **Plugin Logo (40x40 SVG)** | Marketplace requirement — cannot use default template logo | Low | Already exists (BbjIcons system) but need to verify 40x40 SVG format |
| **Legal Compliance (EULA)** | Mandatory for Marketplace publication | Medium | Need to create Developer EULA — BASIS International is vendor |
| **Compatibility Declaration** | Must declare IntelliJ version range in plugin.xml | Low | Exists but needs verification (`untilBuild = ""` already set) |
| **Plugin Verifier Passing** | All plugins checked automatically — incompatible versions restricted | Medium | Need to run `verifyPlugin` Gradle task in CI |
| **At Least One Screenshot** | Marketplace requirement (min 1200 × 760 px, recommended 1280 × 800 px) | Low | Need to capture IDE with BBj file, syntax highlighting, completions visible |
| **Change Notes** | Document what's new/fixed in each version | Low | Need to write for initial release — "Initial release with LSP integration, run commands, etc." |
| **Visible Run Actions in New UI** | With IntelliJ 2024+ new UI, toolbar actions hidden by default | Medium | Registered in MainToolBar but users report needing manual "Add Action to Main Toolbar" |

## Differentiators

Features that set product apart. Not expected, but valued.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Colored Console Output (ANSI support)** | BBj may output colored logs — professional IDEs render them | Low | Use ColoredProcessHandler instead of OSProcessHandler |
| **Process Termination Status** | Show exit code in console (success/failure) | Low | Attach ProcessTerminatedListener to handler |
| **Multiple Screenshots Showing Features** | High-quality listings have 3-5 screenshots showing different features | Low | Show: syntax highlighting, completions, structure view, run output, settings UI |
| **Stop/Restart Running Process** | Users may want to kill long-running BBj programs | Medium | ConsoleView provides stop button automatically when process attached |
| **Run Configuration History** | IntelliJ users expect to see recent runs in Run toolbar dropdown | High | Requires full RunConfiguration implementation, not just AnAction |
| **Keyboard Shortcut Documentation** | Alt+G/B/D shortcuts are non-standard — users need discoverability | Low | Document in plugin description or provide shortcut reference |
| **Demo Video (Under 5 minutes)** | Marketplace best practice — shows plugin in action | Medium | Optional but high-quality listings often include video |
| **Getting Started Instructions** | New users need clear setup steps (BBj Home, run first program) | Low | Should be in plugin description with links to documentation |
| **Clickable Hyperlinks in Console** | Convert file paths to clickable links in console output | Medium | Use TextConsoleBuilderFactory with console filters |
| **Run Action Icons Visible by Default** | Most IDE run actions appear in toolbar without manual configuration | High | Complex — new UI has different toolbar registration; may require ActionGroup strategy |
| **Debug Support** | Users eventually expect debugging, not just running | Very High | Out of scope for v1.2 — marked as future milestone |

## Anti-Features

Features to explicitly NOT build. Common mistakes in this domain.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **Full RunConfiguration System (for v1.2)** | High complexity — requires RunConfigurationType, ConfigurationFactory, SettingsEditor, persistence layer | Keep simple AnAction approach but add console output capture |
| **Custom Console Tool Window** | IntelliJ provides ConsoleView system — reinventing it is wasted effort | Use TextConsoleBuilderFactory.createBuilder(project).getConsole() |
| **Embedding BBj Home Detection** | Users have different installation paths — detection fragile and error-prone | Keep settings UI — let user specify BBj Home explicitly |
| **Bundled BBj Runtime** | 400MB max plugin size, legal issues distributing BASIS's proprietary runtime | Require user to install BBj separately — validate path in settings |
| **Multiple Concurrent Console Tabs** | Simple AnAction execution doesn't support this without RunConfiguration | Accept limitation for v1.2 — each run replaces previous console (or detached) |
| **Marketing Adjectives in Description** | Marketplace guidelines explicitly warn against "simple, lightweight, professional" | Use direct, factual language: "Provides BBj language support via LSP" not "The simplest BBj plugin" |
| **Plugin Name with "Plugin" Suffix** | Marketplace rejection reason — cannot contain "Plugin", "IntelliJ", "JetBrains" | Already correct: "BBj Language Support" |
| **Trademarked Names Without Authorization** | Marketplace rejection factor | "BBj" is BASIS's trademark — vendor email shows authorization |
| **Collecting Telemetry Without Consent** | Marketplace rejection — requires explicit user consent + privacy policy | No telemetry in v1.2 — avoid complexity |
| **Toolbar Registration via Programmatic API** | New UI has known issues with programmatic toolbar registration | Use XML registration in plugin.xml (already done) but accept users may need manual "Add to toolbar" |

## Feature Dependencies

```
Run Action Execution
  → Console Output Capture (cannot see results without this)
    → Colored Output Support (optional enhancement)
    → Process Termination Status (optional enhancement)
    → Clickable Hyperlinks (optional enhancement)

Marketplace Publication
  → Valid Description (required)
  → Logo 40x40 SVG (required)
  → Developer EULA (required)
  → At Least One Screenshot (required)
    → Multiple Screenshots (quality improvement)
    → Demo Video (quality improvement)
  → Plugin Verifier Passing (required)
  → Change Notes (required)
```

## MVP Recommendation

For v1.2 (Run Fixes + Marketplace), prioritize:

### Critical Path (Must Fix)
1. **Console Output Capture** — Users cannot use run commands without seeing output
   - Connect OSProcessHandler to ConsoleView via TextConsoleBuilderFactory
   - Show console tool window when run action triggered
   - Attach ProcessTerminatedListener for exit status
2. **Executable Resolution Bug** — "Not found" despite BBj Home configured
   - Debug getBbjExecutablePath() logic (likely path construction issue)
   - Improve error message to show actual path checked
3. **Marketplace Legal Compliance**
   - Write Developer EULA (BASIS International Ltd.)
   - Add to plugin.xml or Marketplace listing
4. **Marketplace Assets**
   - Write plugin description (first 40 chars English, value prop)
   - Create 1-3 screenshots (1280 × 800 px recommended)
   - Write change notes for initial release
5. **Plugin Verifier**
   - Run verifyPlugin Gradle task
   - Fix any compatibility issues

### Nice-to-Have (Quality Improvements)
1. **Colored Console Output** — Low effort, high polish (use ColoredProcessHandler)
2. **Multiple Screenshots** — Show syntax highlighting, completions, run output
3. **Getting Started Section** — Clear setup instructions in description
4. **Toolbar Visibility Guidance** — Document "Add Action to Main Toolbar" for new UI users

Defer to post-v1.2:
- **Run Configuration System** — High complexity, marginal benefit over AnAction for single-file runs
- **Debug Support** — Already marked as future milestone
- **Toolbar Auto-Visibility in New UI** — Complex platform issue, manual workaround acceptable
- **Run History Dropdown** — Requires RunConfiguration system

## Complexity Assessment by Category

| Category | Low | Medium | High | Very High |
|----------|-----|--------|------|-----------|
| **Run Fixes** | Error messages, working dir | Console output, colored output | Run Configuration system | Debug support |
| **Marketplace Assets** | Description, logo check, change notes, screenshots | EULA creation, plugin verifier | - | - |
| **New UI Toolbar** | Documentation | Action visibility testing | Programmatic registration fixes | - |

## Platform-Specific Considerations

### Console Output Capture Pattern
```java
// Standard pattern from IntelliJ Platform SDK
TextConsoleBuilder builder = TextConsoleBuilderFactory.createBuilder(project);
ConsoleView console = builder.getConsole();

// Create process handler
OSProcessHandler handler = new OSProcessHandler(cmd);

// Attach console to process
console.attachToProcess(handler);

// Start process
handler.startNotify();

// Show in tool window or content manager
```

### New UI Toolbar Visibility
- Registered actions in MainToolBar may not appear automatically in new UI (2024+)
- Users can manually add via: Right-click toolbar → "Add Action to Main Toolbar" → select action
- Documented workaround: Tools menu always works, context menu (EditorPopupMenu) always works
- Keyboard shortcuts (Alt+G/B/D) always work regardless of toolbar visibility

### Marketplace Screenshot Best Practices
- Show plugin in actual IDE context (not device photos)
- Highlight key features: syntax highlighting, completions, console output, settings
- Use readable text size (will be scaled down in preview card)
- Avoid marketing overlays — focus on functionality
- 16:10 aspect ratio (1280 × 800) recommended, min 1200 × 760

## Known Pitfalls from Existing Code

### Current Run Action Implementation
The existing `BbjRunActionBase` uses:
```java
OSProcessHandler handler = new OSProcessHandler(cmd);
handler.startNotify();
```

**Problem:** Process starts but output goes nowhere — no ConsoleView attached.

**Fix Required:** Create ConsoleView, attach handler, show in tool window.

### Executable Path Resolution
```java
File executable = new File(bbjHome, "bin/" + exeName);
```

**Potential Issue:** Path separator handling on Windows vs Unix.
**Better Approach:** Use `Paths.get(bbjHome, "bin", exeName).toFile()`

### MainToolBar Registration
```xml
<add-to-group group-id="MainToolBar" anchor="last"/>
```

**Known Issue:** In new UI (IntelliJ 2024+), actions added via XML may not appear without manual user configuration.
**Mitigation:** Document in Getting Started; ensure EditorPopupMenu and keyboard shortcuts work as fallback.

## Sources

### Official IntelliJ Platform SDK
- [Action System](https://plugins.jetbrains.com/docs/intellij/action-system.html)
- [Execution](https://plugins.jetbrains.com/docs/intellij/execution.html)
- [Run Configurations](https://plugins.jetbrains.com/docs/intellij/run-configurations.html)
- [Grouping Actions](https://plugins.jetbrains.com/docs/intellij/grouping-actions-tutorial.html)

### JetBrains Marketplace
- [Best Practices for Listing](https://plugins.jetbrains.com/docs/marketplace/best-practices-for-listing.html)
- [Approval Guidelines](https://plugins.jetbrains.com/docs/marketplace/jetbrains-marketplace-approval-guidelines.html)
- [Publishing and Listing](https://plugins.jetbrains.com/docs/marketplace/publishing-and-listing-your-plugin.html)

### Community Support Threads
- [Registering action in new UI main toolbar](https://platform.jetbrains.com/t/registering-action-in-new-ui-main-toolbar/1310)
- [IntelliJ Plugins: Getting the output of an OS command](https://intellij-support.jetbrains.com/hc/en-us/community/posts/6147163269778-IntelliJ-Plugins-Getting-the-output-of-an-OS-command)
- [New UI lost toolbars and settings](https://intellij-support.jetbrains.com/hc/en-us/community/posts/20802107307154--New-UI-lost-toolbars-and-settings)

### Code Examples and Patterns
- [OSProcessHandler](https://dploeger.github.io/intellij-api-doc/com/intellij/execution/process/OSProcessHandler.html)
- [CapturingProcessHandler](https://dploeger.github.io/intellij-api-doc/com/intellij/execution/process/CapturingProcessHandler.html)
- [Run Configuration Management](https://plugins.jetbrains.com/docs/intellij/run-configuration-management.html)

---

**Confidence Level:** HIGH for console patterns and Marketplace requirements (verified via official documentation), MEDIUM for new UI toolbar behavior (based on community reports + official docs), MEDIUM for executable resolution debugging (hypothesis based on code review).
