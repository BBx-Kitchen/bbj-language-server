# Technology Stack for v1.2: Run Fixes, Console Integration, and Marketplace Readiness

**Project:** BBj Language Server IntelliJ Plugin
**Researched:** 2026-02-02
**Milestone:** v1.2 - Run command fixes, console output capture, JetBrains Marketplace publication

## Executive Summary

This milestone requires **no new framework dependencies** but leverages existing IntelliJ Platform SDK APIs that are already available. The focus is on three technical areas:

1. **Toolbar visibility fix** - Configuration changes in plugin.xml to support new UI (2024.2+ default)
2. **Console output capture** - Existing execution APIs (ConsoleView, RunContentManager) already in classpath
3. **Marketplace publication** - Build tooling already configured (gradle-intellij-plugin 2.x, zipSigner, pluginVerifier)

**Confidence Level:** HIGH - All required APIs are stable, documented, and already available in the project's IntelliJ Platform SDK 2024.2 dependency.

---

## Current Stack (No Changes Required)

| Component | Version | Status |
|-----------|---------|--------|
| IntelliJ Platform SDK | 2024.2 | Already configured |
| Gradle IntelliJ Platform Plugin | 2.x (org.jetbrains.intellij.platform) | Already configured |
| Java | 17 | Already configured |
| LSP4IJ | 0.19.0 | Already configured |
| Plugin Verifier | Latest (via `pluginVerifier()` dependency) | Already configured |
| Marketplace ZIP Signer | Latest (via `zipSigner()` dependency) | Already configured |

**No new dependencies needed.** The build.gradle.kts already includes `pluginVerifier()` and `zipSigner()` in the `intellijPlatform` dependencies block.

---

## Stack Additions for New Features

### 1. Toolbar Visibility in New UI (Configuration Only)

**Problem:** Actions registered to `MainToolBar` group may not appear in IntelliJ's new UI (default since 2024.2).

**Solution:** Update plugin.xml action group registration.

#### Required APIs (Already Available)

| API | Package | Purpose | Source |
|-----|---------|---------|--------|
| `RightToolbarSideGroup` | Action group ID | Right-aligned toolbar placement in new UI | [ActionsBundle.properties](https://github.com/JetBrains/intellij-community/blob/master/platform/platform-resources-en/src/messages/ActionsBundle.properties) |
| `EditorPopupMenu` | Action group ID | Context menu for editor (keep existing) | Standard platform group |

#### Implementation Approach

**Current registration** (plugin.xml lines 26, 36, 46):
```xml
<add-to-group group-id="MainToolBar" anchor="last"/>
```

**Recommended change:**
```xml
<!-- Keep EditorPopupMenu registration -->
<add-to-group group-id="EditorPopupMenu" anchor="first"/>
<!-- Add to RightToolbarSideGroup for new UI visibility -->
<add-to-group group-id="RightToolbarSideGroup" anchor="last"/>
```

**Why RightToolbarSideGroup:**
- Part of new UI's toolbar architecture (2024.2+)
- Right-aligned placement appropriate for run actions
- Matches IntelliJ's standard run action placement

**Alternative considered:** `MainToolBar` - Still works in classic UI but hidden by default in new UI. New UI is now the default, so MainToolBar alone is insufficient.

**Sources:**
- [The New UI Becomes the Default in 2024.2](https://blog.jetbrains.com/blog/2024/07/08/the-new-ui-becomes-the-default-in-2024-2/)
- [Registering action in new ui main toolbar](https://platform.jetbrains.com/t/registering-action-in-new-ui-main-toolbar/1310)
- [Action System | IntelliJ Platform Plugin SDK](https://plugins.jetbrains.com/docs/intellij/action-system.html)

---

### 2. Console Output Capture (Use Existing APIs)

**Problem:** `BbjRunActionBase` creates `OSProcessHandler` but doesn't attach it to a console view. Output is lost.

**Solution:** Create `ConsoleView`, attach to process, display in Run tool window.

#### Required APIs (Already Available in IntelliJ Platform 2024.2)

| API | Package | Purpose | When to Use |
|-----|---------|---------|-------------|
| `TextConsoleBuilderFactory` | `com.intellij.execution.filters` | Creates console builder instances | Every run action invocation |
| `TextConsoleBuilder` | `com.intellij.execution.filters` | Configures and builds ConsoleView | Created by factory |
| `ConsoleView` | `com.intellij.execution.ui` | Display component for process output | Attach to OSProcessHandler |
| `RunContentDescriptor` | `com.intellij.execution.ui` | Describes content shown in Run tool window | Wrap console + process + UI |
| `ExecutionManager` | `com.intellij.execution` | Manages execution lifecycles | Access via `getInstance(project)` |
| `RunContentManager` | `com.intellij.execution.ui` | Manages Run/Debug tool window tabs | Access via `ExecutionManager.getContentManager()` |
| `DefaultRunExecutor` | `com.intellij.execution.executors` | Executor for "Run" (not "Debug") | Use `getRunExecutorInstance()` |
| `ProcessTerminatedListener` | `com.intellij.execution.process` | Displays exit code when process ends | Attach to ProcessHandler |
| `ColoredProcessHandler` | `com.intellij.execution.process` | OSProcessHandler with ANSI color support | Use if BBj outputs ANSI codes |

#### Integration Pattern

**Current code** (BbjRunActionBase.java:54-56):
```java
OSProcessHandler handler = new OSProcessHandler(cmd);
handler.startNotify();
showSuccess(project, file.getName(), getRunMode());
```

**Enhanced implementation:**
```java
// 1. Create console
ConsoleView console = TextConsoleBuilderFactory
    .createBuilder(project)
    .getConsole();

// 2. Create process handler
OSProcessHandler handler = new OSProcessHandler(cmd);

// 3. Attach console to process
console.attachToProcess(handler);

// 4. Add exit code listener
ProcessTerminatedListener.attach(handler);

// 5. Create content descriptor
RunContentDescriptor descriptor = new RunContentDescriptor(
    console,                          // console
    handler,                          // processHandler
    console.getComponent(),           // component
    file.getName() + " (" + getRunMode() + ")",  // displayName
    getIcon()                         // icon
);

// 6. Show in Run tool window
DefaultRunExecutor executor = DefaultRunExecutor.getRunExecutorInstance();
ExecutionManager.getInstance(project)
    .getContentManager()
    .showRunContent(executor, descriptor);

// 7. Start process
handler.startNotify();
```

**Why this pattern:**
- Matches standard IntelliJ execution flow
- Console automatically captures stdout/stderr
- Run tool window provides built-in UI (stop button, rerun, etc.)
- ProcessTerminatedListener shows "Process finished with exit code X"
- No manual output parsing required

**Alternative considered:** Custom tool window - Unnecessary complexity. RunContentManager already provides all needed UI.

**Sources:**
- [Execution | IntelliJ Platform Plugin SDK](https://plugins.jetbrains.com/docs/intellij/execution.html)
- [ConsoleView examples | Tabnine](https://www.tabnine.com/code/java/classes/com.intellij.execution.ui.ConsoleView)
- [RunContentDescriptor examples | Tabnine](https://www.tabnine.com/code/java/classes/com.intellij.execution.ui.RunContentDescriptor)

#### Optional Enhancement: ANSI Color Support

If BBj programs output ANSI color codes, use `ColoredProcessHandler` instead of `OSProcessHandler`:

```java
ColoredProcessHandler handler = new ColoredProcessHandler(cmd);
```

This automatically renders colors in the console. No other changes needed.

---

### 3. JetBrains Marketplace Publication (Use Existing Build Tasks)

**Problem:** Plugin must meet Marketplace requirements before publication.

**Solution:** Configure signing, add metadata, use existing Gradle tasks.

#### Required Build Tasks (Already Available)

The project's build.gradle.kts (lines 28-30) already includes:
```kotlin
pluginVerifier()
zipSigner()
instrumentationTools()
```

These provide the following Gradle tasks:

| Task | Purpose | When to Run | Configuration Required |
|------|---------|-------------|------------------------|
| `buildPlugin` | Creates distributable ZIP in build/distributions/ | Before publishing | None - already works |
| `verifyPlugin` | Validates plugin compatibility with target IDEs | Before publishing | Optional: configure `intellijPlatform.pluginVerification.ides` |
| `signPlugin` | Cryptographically signs the plugin ZIP | Before publishing | Required: certificate chain + private key |
| `publishPlugin` | Uploads to JetBrains Marketplace | On release | Required: Personal Access Token |

#### Signing Configuration (New Requirement)

**Status:** Currently NOT configured. Signing is mandatory for Marketplace (warning dialog shown to users if unsigned).

**Add to build.gradle.kts:**
```kotlin
intellijPlatform {
    signing {
        certificateChain.set(providers.environmentVariable("CERTIFICATE_CHAIN"))
        privateKey.set(providers.environmentVariable("PRIVATE_KEY"))
        password.set(providers.environmentVariable("PRIVATE_KEY_PASSWORD"))
    }

    publishing {
        token.set(providers.environmentVariable("PUBLISH_TOKEN"))
        // Optional: channels.set(listOf("beta", "alpha"))
    }
}
```

**Environment variables required:**
- `CERTIFICATE_CHAIN` - Self-signed certificate (PEM format)
- `PRIVATE_KEY` - RSA private key (PEM format)
- `PRIVATE_KEY_PASSWORD` - Password for private key
- `PUBLISH_TOKEN` - JetBrains Marketplace Personal Access Token

**Generate certificate chain (one-time setup):**
```bash
# Generate RSA private key (4096-bit)
openssl genpkey -aes-256-cbc -algorithm RSA -out private_encrypted.pem -pkeyopt rsa_keygen_bits:4096

# Extract unencrypted private key
openssl rsa -in private_encrypted.pem -out private.pem

# Create self-signed certificate (365-day validity)
openssl req -key private.pem -new -x509 -days 365 -out chain.crt
```

**Why environment variables:**
- Never commit credentials to version control
- Works in CI/CD (GitHub Actions, etc.)
- Same config works for local and automated builds

**Alternative considered:** Hardcoding credentials in build.gradle.kts - Security vulnerability. Never do this.

**Sources:**
- [Plugin Signing | IntelliJ Platform Plugin SDK](https://plugins.jetbrains.com/docs/intellij/plugin-signing.html)
- [Publishing a Plugin | IntelliJ Platform Plugin SDK](https://plugins.jetbrains.com/docs/intellij/publishing-plugin.html)
- [Tasks | IntelliJ Platform Plugin SDK](https://plugins.jetbrains.com/docs/intellij/tools-intellij-platform-gradle-plugin-tasks.html)

#### plugin.xml Metadata Requirements

**Current status:** Basic metadata exists (build.gradle.kts lines 35-50), but some fields are missing for optimal Marketplace listing.

**Required metadata** (already configured):
- `<id>` - Plugin ID (✓ com.basis.bbj.intellij)
- `<name>` - Plugin name (✓ BBj Language Support)
- `<vendor>` - Vendor info (✓ BASIS International Ltd.)
- `<description>` - HTML description (✓ loaded from description.html)
- `ideaVersion.sinceBuild` - Min version (✓ 242 = 2024.2)
- `ideaVersion.untilBuild` - Max version (✓ "" = unlimited)

**Recommended additions:**
- `<change-notes>` - What's new in this version (shown in Marketplace)

**Add to plugin.xml** (or configure via Gradle `patchPluginXml` task):
```xml
<change-notes><![CDATA[
  <h3>v1.2 - Console Integration and Run Fixes</h3>
  <ul>
    <li>Fixed: Run actions now visible in new UI toolbar</li>
    <li>Added: Console output capture for BBj programs</li>
    <li>Added: Process exit code display</li>
  </ul>
]]></change-notes>
```

**First publication requirement:** The first plugin upload MUST be manual. Go to [JetBrains Marketplace](https://plugins.jetbrains.com/), click "Add new plugin", fill out form, upload ZIP. After that, `publishPlugin` task can be used for updates.

**Sources:**
- [Plugin Configuration File | IntelliJ Platform Plugin SDK](https://plugins.jetbrains.com/docs/intellij/plugin-configuration-file.html)
- [Best practices for listing your plugin | JetBrains Marketplace](https://plugins.jetbrains.com/docs/marketplace/best-practices-for-listing.html)

#### Publishing Workflow

**Manual first upload:**
1. Run `./gradlew buildPlugin` - Creates unsigned ZIP
2. Run `./gradlew signPlugin` - Signs the ZIP (requires env vars)
3. Upload signed ZIP manually to Marketplace
4. Fill out plugin details (license, screenshots, etc.)

**Subsequent releases (automated):**
1. Update version in build.gradle.kts (`version = "X.Y.Z"`)
2. Update change-notes in plugin.xml
3. Run `./gradlew publishPlugin` - Builds, signs, uploads automatically
4. Marketplace shows new version after approval

**Important:** Marketplace rejects uploads with duplicate versions. Always increment version number.

---

## What NOT to Add

| Technology | Why NOT Needed | Alternative |
|------------|----------------|-------------|
| Custom Run Configuration API | Too complex for simple "run this file" actions | Direct OSProcessHandler + ConsoleView |
| Apache Commons Exec | IntelliJ Platform already has execution APIs | Use built-in OSProcessHandler |
| Log4j/SLF4J for console output | ConsoleView handles all output automatically | Use ConsoleView |
| Separate console tool window | RunContentManager already provides Run tool window | Use ExecutionManager |
| Action toolbar APIs | Actions declared in plugin.xml, not programmatically | Use declarative registration |
| New dependencies for ANSI colors | ColoredProcessHandler already available | Use ColoredProcessHandler if needed |

---

## Integration with Existing Code

### Modified Files

| File | Current State | Required Changes |
|------|---------------|------------------|
| `plugin.xml` | Actions registered to MainToolBar | Add `<add-to-group group-id="RightToolbarSideGroup" anchor="last"/>` to each run action |
| `BbjRunActionBase.java` | Creates OSProcessHandler, doesn't show console | Wrap handler in ConsoleView + RunContentDescriptor, show via ExecutionManager |
| `build.gradle.kts` | Has pluginVerifier + zipSigner | Add `intellijPlatform.signing` and `intellijPlatform.publishing` blocks |

### Unchanged Files

- LSP4IJ integration - No changes
- Settings UI - No changes
- Language server lifecycle - No changes
- File type registration - No changes
- Icons, TextMate bundle - No changes

---

## Version Compatibility

| API/Feature | Min Version | Our Version | Status |
|-------------|-------------|-------------|--------|
| ConsoleView | 2020.1+ | 2024.2 | ✓ Supported |
| TextConsoleBuilderFactory | 2020.1+ | 2024.2 | ✓ Supported |
| RunContentManager | 2020.1+ | 2024.2 | ✓ Supported |
| RightToolbarSideGroup | 2023.1+ (new UI) | 2024.2 | ✓ Supported |
| DefaultRunExecutor | 2020.1+ | 2024.2 | ✓ Supported |
| Plugin signing | 2020.3+ | 2024.2 | ✓ Supported |
| IntelliJ Platform Gradle Plugin 2.x | 2022.3+ | 2024.2 | ✓ Supported |

**Compatibility range:** Plugin targets 2024.2+ (sinceBuild=242, untilBuild=""). All required APIs are stable and available.

---

## Known Limitations and Workarounds

### 1. MainToolBar vs RightToolbarSideGroup

**Issue:** Plugin currently registers to `MainToolBar`, which is hidden by default in new UI (2024.2+).

**Workaround:** Register to BOTH groups:
```xml
<add-to-group group-id="MainToolBar" anchor="last"/>         <!-- Classic UI -->
<add-to-group group-id="RightToolbarSideGroup" anchor="last"/> <!-- New UI -->
```

This ensures visibility in both old UI (if user switches) and new UI.

**Source:** [Registering action in new ui main toolbar](https://platform.jetbrains.com/t/registering-action-in-new-ui-main-toolbar/1310)

### 2. Plugin Signing on CI/CD

**Issue:** Certificate generation requires interactive OpenSSL prompts.

**Workaround:** Pre-generate certificate locally, store in CI/CD secrets as base64:
```bash
# Encode for CI secrets
cat chain.crt | base64 > chain.crt.b64
cat private.pem | base64 > private.pem.b64

# Decode in CI (example: GitHub Actions)
echo "${{ secrets.CERTIFICATE_CHAIN_B64 }}" | base64 -d > chain.crt
export CERTIFICATE_CHAIN=$(cat chain.crt)
```

### 3. Process Output Buffering

**Issue:** BBj programs may buffer output, console appears empty until program exits.

**Workaround:** Enable flush-on-newline in BBj program (application-specific), or use ColoredProcessHandler which may have better buffering behavior.

**Detection:** If console shows no output until process terminates, this is the issue.

---

## Confidence Assessment

| Area | Confidence | Evidence |
|------|------------|----------|
| Toolbar visibility fix | HIGH | RightToolbarSideGroup documented in official source code |
| Console output capture | HIGH | Standard pattern documented in SDK, multiple code examples |
| Plugin signing | HIGH | Official docs with exact openssl commands |
| Plugin publishing | MEDIUM | Docs are clear, but first upload must be manual (one-time friction) |
| ANSI color support | MEDIUM | ColoredProcessHandler exists, but untested if BBj outputs ANSI |

**Overall confidence:** HIGH - All APIs are stable, documented, and already in our dependency tree. No version conflicts, no experimental features.

---

## Installation & Configuration

### For Development (No Changes)

```bash
# All dependencies already configured
./gradlew buildPlugin
./gradlew runIde
```

### For Publishing (New Setup Required)

```bash
# 1. Generate signing certificate (one-time)
openssl genpkey -aes-256-cbc -algorithm RSA -out private_encrypted.pem -pkeyopt rsa_keygen_bits:4096
openssl rsa -in private_encrypted.pem -out private.pem
openssl req -key private.pem -new -x509 -days 365 -out chain.crt

# 2. Set environment variables (add to ~/.bashrc or CI secrets)
export CERTIFICATE_CHAIN="$(cat chain.crt)"
export PRIVATE_KEY="$(cat private.pem)"
export PRIVATE_KEY_PASSWORD="your-password"
export PUBLISH_TOKEN="perm:YOUR_TOKEN_HERE"

# 3. Build and sign
./gradlew signPlugin

# 4. Publish (after manual first upload)
./gradlew publishPlugin
```

---

## Sources

### Official Documentation
- [Execution | IntelliJ Platform Plugin SDK](https://plugins.jetbrains.com/docs/intellij/execution.html)
- [Action System | IntelliJ Platform Plugin SDK](https://plugins.jetbrains.com/docs/intellij/action-system.html)
- [Publishing a Plugin | IntelliJ Platform Plugin SDK](https://plugins.jetbrains.com/docs/intellij/publishing-plugin.html)
- [Plugin Signing | IntelliJ Platform Plugin SDK](https://plugins.jetbrains.com/docs/intellij/plugin-signing.html)
- [Tasks | IntelliJ Platform Plugin SDK](https://plugins.jetbrains.com/docs/intellij/tools-intellij-platform-gradle-plugin-tasks.html)
- [IntelliJ Platform Gradle Plugin (2.x)](https://plugins.jetbrains.com/docs/intellij/tools-intellij-platform-gradle-plugin.html)

### Community Resources
- [The New UI Becomes the Default in 2024.2](https://blog.jetbrains.com/blog/2024/07/08/the-new-ui-becomes-the-default-in-2024-2/)
- [Registering action in new ui main toolbar](https://platform.jetbrains.com/t/registering-action-in-new-ui-main-toolbar/1310)
- [RunContentDescriptor examples | Tabnine](https://www.tabnine.com/code/java/classes/com.intellij.execution.ui.RunContentDescriptor)
- [ConsoleView examples | Tabnine](https://www.tabnine.com/code/java/classes/com.intellij.execution.ui.ConsoleView)

### Source Code References
- [ActionsBundle.properties (IntelliJ Community)](https://github.com/JetBrains/intellij-community/blob/master/platform/platform-resources-en/src/messages/ActionsBundle.properties)
- [ProgramRunnerUtil.java (IntelliJ Community)](https://github.com/JetBrains/intellij-community/blob/master/platform/execution-impl/src/com/intellij/execution/ProgramRunnerUtil.java)

---

## Summary

**No new dependencies required.** All necessary APIs are already available in IntelliJ Platform SDK 2024.2. This milestone is about:

1. **Configuration changes** (plugin.xml action groups)
2. **API usage** (ConsoleView + RunContentManager)
3. **Build configuration** (signing + publishing)

The stack is stable, well-documented, and production-ready. Proceed with implementation.
