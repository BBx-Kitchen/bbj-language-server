---
phase: quick-13
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjServerService.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/BbjLanguageServer.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/BbjLanguageClient.java
  - bbj-intellij/src/main/resources/META-INF/plugin.xml
autonomous: false

must_haves:
  truths:
    - "Multiple IntelliJ project windows each have their own running BBj language server"
    - "Closing one IntelliJ window does not stop/break the language server in other windows"
    - "Restart Server action recovers the language server without requiring full IDE restart"
  artifacts:
    - path: "bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjServerService.java"
      provides: "Fixed server lifecycle management that does not interfere with LSP4IJ multi-project handling"
    - path: "bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/BbjLanguageServer.java"
      provides: "Robust per-project language server process creation"
  key_links:
    - from: "BbjServerService"
      to: "LanguageServerManager"
      via: "restart/stop/start calls"
      pattern: "LanguageServerManager\\.getInstance.*\\.(stop|start)"
---

<objective>
Fix IntelliJ multi-instance language server: investigate and fix single-connection limitation causing "Stopped" state in subsequent IDE windows.

Purpose: When multiple IntelliJ windows/projects are open, only the first connects to the language server. Subsequent windows show "Stopped" and restart fails. This is likely caused by BbjServerService's custom lifecycle management (grace period shutdown, crash detection) conflicting with LSP4IJ's built-in per-project server management, or by a state corruption issue in the crash recovery logic.

Output: Fixed BbjServerService and related files so that each project window independently manages its own language server instance without cross-project interference.
</objective>

<execution_context>
@/Users/beff/.claude/get-shit-done/workflows/execute-plan.md
@/Users/beff/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjServerService.java
@bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/BbjLanguageServer.java
@bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/BbjLanguageServerFactory.java
@bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/BbjLanguageClient.java
@bbj-intellij/src/main/resources/META-INF/plugin.xml
@bbj-intellij/build.gradle.kts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Diagnose and fix multi-project server lifecycle issues</name>
  <files>
    bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjServerService.java
    bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/BbjLanguageClient.java
    bbj-intellij/src/main/resources/META-INF/plugin.xml
  </files>
  <action>
The root cause investigation should check these areas IN ORDER, fixing each issue found:

**Investigation Area 1: LSP4IJ server extension configuration**

Check the plugin.xml `<server>` registration. The current registration is:
```xml
<server id="bbjLanguageServer"
        name="BBj Language Server"
        factoryClass="com.basis.bbj.intellij.lsp.BbjLanguageServerFactory">
```

LSP4IJ's `ServerExtensionPointBean` supports a `singleton` attribute (defaults to `false`) and a `lastDocumentDisconnectedTimeout` attribute. Verify:
- `singleton` is NOT set or is `false` (we want per-project instances)
- Consider adding `lastDocumentDisconnectedTimeout` to align with or replace BbjServerService's custom grace period

**Investigation Area 2: BbjServerService grace period conflicts with LSP4IJ**

The `BbjServerService` has a custom 30-second grace period that calls `LanguageServerManager.getInstance(project).stop("bbjLanguageServer")` when no BBj files are open. This DIRECTLY stops the LSP4IJ-managed server, which may put LSP4IJ into a state where it thinks the server was user-stopped (not auto-stoppable) and refuses to restart it automatically when a BBj file is opened again.

**FIX:** Remove the custom grace period shutdown from `BbjServerService` entirely. Instead, use LSP4IJ's built-in `lastDocumentDisconnectedTimeout` attribute on the `<server>` element in plugin.xml. This lets LSP4IJ manage the idle shutdown natively, which avoids state conflicts. Set `lastDocumentDisconnectedTimeout="30"` (in seconds) in plugin.xml.

Remove from `BbjServerService.java`:
- The `gracePeriodScheduler` field and all references
- The `gracePeriodTask` field and all references
- The `inGracePeriod` field and all references
- The `GRACE_PERIOD_SECONDS` constant
- The `checkAndStartGracePeriod()` method
- The `startGracePeriod()` method
- The `cancelGracePeriod()` method
- The `isInGracePeriod()` method
- The `FileEditorManagerListener` subscription in the constructor that calls these methods
- The `gracePeriodScheduler.shutdownNow()` call in `dispose()`

In plugin.xml, update the server registration to:
```xml
<server id="bbjLanguageServer"
        name="BBj Language Server"
        lastDocumentDisconnectedTimeout="30"
        factoryClass="com.basis.bbj.intellij.lsp.BbjLanguageServerFactory">
```

**Investigation Area 3: BbjServerService crash detection state corruption**

The `crashCount >= 2` guard permanently prevents auto-restart until `clearCrashState()` is explicitly called. If a second project's server fails to start and crashes twice (which would happen quickly), the crash state prevents any restart. AND the crash state clearing only happens when status becomes `started` -- but if the server can't start, we get a deadlock.

**FIX:** Make the crash detection more robust:
1. In the `restart()` method, call `clearCrashState()` before doing the stop/start cycle. This ensures that a manual restart always works regardless of prior crash state.
2. In `updateStatus()`, when `crashCount >= 2` and the status is `stopped`, do NOT block subsequent manual restart attempts. The crash guard should only prevent AUTO-restart, not manual restart.

Modify `restart()` to:
```java
public void restart() {
    clearCrashState();
    LanguageServerManager manager = LanguageServerManager.getInstance(project);
    manager.stop("bbjLanguageServer");
    manager.start("bbjLanguageServer");
}
```

**Investigation Area 4: BbjServerService.dispose() stopping server on project close**

In `dispose()`, we call `LanguageServerManager.getInstance(project).stop("bbjLanguageServer")`. This is redundant because LSP4IJ already handles server cleanup when a project is disposed. Worse, if the LanguageServerManager has already been disposed (it's also a project service), this call could throw or corrupt state.

**FIX:** Remove the explicit `LanguageServerManager.stop()` call from `dispose()`. LSP4IJ handles this automatically. The dispose method should just log and clean up local resources.

After all fixes, also update `BbjLanguageClient.handleServerStatusChanged()` to add project disposal guards:
```java
@Override
public void handleServerStatusChanged(ServerStatus serverStatus) {
    super.handleServerStatusChanged(serverStatus);
    Project project = getProject();
    if (project.isDisposed()) {
        return;
    }
    ApplicationManager.getApplication().invokeLater(() -> {
        if (project.isDisposed()) {
            return;
        }
        BbjServerService service = BbjServerService.getInstance(project);
        service.logToConsole("Server status: " + serverStatus, ConsoleViewContentType.SYSTEM_OUTPUT);
        service.updateStatus(serverStatus);
    });
}
```

Also in `BbjServerService.updateStatus()`, add a disposal guard at the top:
```java
public void updateStatus(@NotNull ServerStatus status) {
    if (project.isDisposed()) {
        return;
    }
    // ... rest of method
}
```

And guard all `invokeLater` calls in updateStatus with `project.isDisposed()` checks.
  </action>
  <verify>
    Run `cd /Users/beff/_workspace/bbj-language-server/bbj-intellij && ./gradlew build` to verify compilation succeeds.
    Grep for "gracePeriod" in BbjServerService.java to confirm all grace period code is removed.
    Grep for "lastDocumentDisconnectedTimeout" in plugin.xml to confirm it's added.
    Verify BbjServerService no longer imports ScheduledExecutorService, ScheduledFuture, FileEditorManager, FileEditorManagerListener, MessageBusConnection (if unused by other code).
  </verify>
  <done>
    BbjServerService no longer has custom grace period shutdown logic (delegated to LSP4IJ's lastDocumentDisconnectedTimeout).
    Crash detection allows manual restart to always work by clearing crash state before restart.
    Dispose method does not call LanguageServerManager.stop() (LSP4IJ handles it).
    All invokeLater/status callbacks guard against disposed projects.
    Plugin.xml has lastDocumentDisconnectedTimeout="30" on server element.
    Project compiles without errors.
  </done>
</task>

<task type="auto">
  <name>Task 2: Clean up BbjStatusBarWidget grace period references</name>
  <files>
    bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjStatusBarWidget.java
  </files>
  <action>
Since we removed `isInGracePeriod()` from `BbjServerService`, check `BbjStatusBarWidget.java` for any references to the grace period idle state and remove or simplify them. The status bar widget likely checks `service.isInGracePeriod()` to show an "idle" indicator. Remove this check and simplify the status display to just show the server status from LSP4IJ (started, stopped, starting, etc.) without a custom idle state.

Also check any other files that reference `isInGracePeriod` or `inGracePeriod`:
- `BbjStatusBarWidgetFactory.java`
- Any other UI components

Remove all references to the grace period from the widget code.
  </action>
  <verify>
    Run `cd /Users/beff/_workspace/bbj-language-server/bbj-intellij && ./gradlew build` to verify compilation succeeds with no errors.
    Grep the entire bbj-intellij/src directory for "gracePeriod" or "grace_period" or "isInGracePeriod" to confirm zero remaining references.
  </verify>
  <done>
    No references to grace period remain anywhere in the codebase.
    Status bar widget displays server status without custom idle state logic.
    Project compiles without errors.
  </done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <name>Task 3: Verify multi-instance language server fix</name>
  <action>Human verification of the multi-instance fix across multiple IntelliJ project windows.</action>
  <what-built>Fixed multi-instance language server by: (1) removing custom grace period shutdown that conflicted with LSP4IJ's server lifecycle, replacing it with LSP4IJ's native lastDocumentDisconnectedTimeout, (2) fixing crash detection to allow manual restart to always work by clearing crash state, (3) removing redundant server stop in dispose(), (4) adding project disposal guards to prevent state corruption during project close.</what-built>
  <how-to-verify>
    1. Build the plugin: `cd bbj-intellij && ./gradlew buildPlugin`
    2. Install/run in IntelliJ sandbox: `./gradlew runIde`
    3. Open a BBj file in the first project window -- verify the language server starts (status bar shows "Running" or similar)
    4. Open a second IntelliJ window with a different project that also has BBj files -- verify the language server starts in the second window too
    5. Close the first window -- verify the second window's language server continues running
    6. In the remaining window, use Tools > Restart BBj Language Server -- verify it recovers successfully
    7. Close all BBj files (but keep the IDE open) -- verify the server stops after ~30 seconds (LSP4IJ's timeout)
    8. Re-open a BBj file -- verify the server restarts automatically
  </how-to-verify>
  <resume-signal>Type "approved" or describe any issues observed</resume-signal>
</task>

</tasks>

<verification>
- `./gradlew build` passes in bbj-intellij directory
- No references to custom grace period code remain in the codebase
- plugin.xml has `lastDocumentDisconnectedTimeout="30"` on the server element
- `BbjServerService.restart()` calls `clearCrashState()` before stop/start
- `BbjServerService.dispose()` does NOT call `LanguageServerManager.stop()`
- All `invokeLater` callbacks in BbjServerService and BbjLanguageClient guard against disposed projects
</verification>

<success_criteria>
Multiple IntelliJ project windows can each independently run a BBj language server instance. Closing one window does not affect other windows' language servers. Manual restart always works regardless of prior crash state. No custom grace period code conflicts with LSP4IJ's native server lifecycle management.
</success_criteria>

<output>
After completion, create `.planning/quick/13-fix-intellij-multi-instance-language-ser/13-SUMMARY.md`
</output>
