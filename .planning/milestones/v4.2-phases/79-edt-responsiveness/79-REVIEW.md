---
phase: 79-edt-responsiveness
reviewed: 2026-09-04T00:00:00Z
depth: standard
files_reviewed: 28
files_reviewed_list:
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjEMLoginAction.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjRefreshJavaClassesAction.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjRunActionBase.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjMissingNodeNotificationProvider.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjNodeDownloader.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjNodeVersionCache.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjSettingsComponent.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjSettingsLookups.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/concurrency/AlarmScheduler.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/concurrency/KeystrokeDebouncer.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/concurrency/RestartGate.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/concurrency/Scheduler.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/concurrency/ThreadProbe.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/DownloadGuard.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjJavaInteropStatusBarWidget.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjRestartServerAction.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjServerCrashNotificationProvider.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjServerService.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjStatusBarWidget.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/BbjNodeVersionCacheTest.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/concurrency/KeystrokeDebouncerTest.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/concurrency/ManualScheduler.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/concurrency/RestartGateTest.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/DownloadGuardTest.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/BbjMissingNodeNotificationSourceGuardTest.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/BbjNodeDownloaderSourceGuardTest.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/BbjServerServiceRestartSourceGuardTest.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/BbjSettingsComponentSourceGuardTest.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/OffEdtDispatchSourceGuardTest.java
findings:
  critical: 1
  warning: 5
  info: 3
  total: 9
status: issues_found
---

# Phase 79: Code Review Report

**Reviewed:** 2026-09-04
**Depth:** standard
**Files Reviewed:** 28 (source guard/unit tests included)
**Status:** issues_found

## Summary

The phase adds a coherent set of concurrency seams (`Scheduler`/`AlarmScheduler`, `KeystrokeDebouncer`, `RestartGate`, `DownloadGuard`, `BbjNodeVersionCache`, `ThreadProbe`) and threads most previously-blocking work (EM login, token validation, BUI/DWC launch, Node download, settings-field lookups) off the EDT, backed by runtime `assertIsNonDispatchThread()` tripwires and a family of textual "source-guard" tests. The design is generally sound and the `DownloadGuard` implementation in particular is correctly synchronized and is the only concurrency primitive here with an actual multi-threaded test (`exactlyOneOfEightConcurrentAcquireCallsWins`).

However, one call path was missed entirely (`BbjRunActionBase.validateBeforeRun()` still performs blocking filesystem I/O directly on the EDT, before the pooled-thread dispatch that was added around everything else in the same method), which directly contradicts this phase's stated goal. Several of the new concurrency primitives also have real, demonstrable gaps: `RestartGate.request()` is not internally synchronized (unlike the correctly-`synchronized` `DownloadGuard`), `BbjNodeVersionCache.getVersion()` has a classic check-then-act race that can duplicate subprocess spawns, and the async settings-lookup refactor introduces a narrow but real staleness window in `BbjSettingsComponent.getClasspathEntry()`. The source-guard test suite is also incomplete relative to its own stated coverage claim (the "settings-apply flow" restart site is not fenced despite `BbjServerService`'s class Javadoc listing it as one of the guarded call sites).

## Critical Issues

### CR-01: `BbjRunActionBase.validateBeforeRun()` still performs blocking filesystem I/O on the EDT

**File:** `bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjRunActionBase.java:52-58` (call sites), `148-173` and `182-205` (blocking implementation)

**Issue:** `actionPerformed` calls `autoSaveIfNeeded()` and then `validateBeforeRun(project)` synchronously on the EDT, *before* dispatching to `executeOnPooledThread`:

```java
// Auto-save if enabled
autoSaveIfNeeded();

// Validate before running
if (!validateBeforeRun(project)) {
    return;
}

// Build the command line and launch it off EDT to avoid UI freezing.
...
ApplicationManager.getApplication().executeOnPooledThread(() -> { ... });
```

`validateBeforeRun()` calls `Files.isDirectory(bbjHomeDir)` and `getBbjExecutablePath()`, which in turn calls `Files.exists(...)`, `Files.isRegularFile(...)`, and `Files.isExecutable(...)` up to four times — all directly on the calling (EDT) thread. This is exactly the class of bug this phase set out to eliminate: everything else this method does (building the command line, EM token validation up to 10s, EM login up to 15s) was deliberately moved off the EDT in this same change, but the plain existence/executable checks were left in place. When `bbjHomePath` points at a network share or a slow/unresponsive mount (a realistic scenario for enterprise BBj installations), these calls can stall the UI thread for a perceptible or unbounded amount of time on every single Run action invocation — the opposite of the phase's goal of never blocking the EDT on run-related I/O.

**Fix:** Move the validation (and, if desired, the auto-save) inside the pooled-thread lambda, ahead of `buildCommandLine`, and route any validation failure back to the EDT the same way `logError` already does elsewhere in this class:

```java
ApplicationManager.getApplication().executeOnPooledThread(() -> {
    ApplicationManager.getApplication().assertIsNonDispatchThread();
    if (!validateBeforeRun(project)) {
        return; // logError already shown by validateBeforeRun, and it already dispatches its own invokeLater
    }
    GeneralCommandLine cmd = buildCommandLine(file, project);
    ...
});
```
(`autoSaveIfNeeded()` must stay on the EDT since `FileDocumentManager` requires it, but the filesystem-stat validation does not.)

## Warnings

### WR-01: `RestartGate.request()` is not synchronized — coalescing can be defeated by concurrent callers

**File:** `bbj-intellij/src/main/java/com/basis/bbj/intellij/concurrency/RestartGate.java:25-28`

**Issue:** `request()` performs `scheduler.cancelAll()` followed by `scheduler.schedule(restartAction, delayMs)` as two separate, non-atomic calls:

```java
public void request(long delayMs) {
    scheduler.cancelAll();
    scheduler.schedule(restartAction, delayMs);
}
```

If two threads call `request()` at nearly the same time (e.g. `BbjServerService.updateStatus()`'s crash-triggered `requestRestart(CRASH_RESTART_DELAY_MS)` racing a user's manual "Restart Server" click), the following interleaving produces **two** scheduled restarts instead of the one the whole class exists to guarantee:

```
T1: cancelAll()      // clears
T2: cancelAll()      // no-op, already empty
T1: schedule(action, d1)
T2: schedule(action, d2)   // now two independent Alarm requests for the same runnable
```

Contrast this with `DownloadGuard`, whose equivalent compare-and-set + attach operation is correctly wrapped in a single `synchronized` method specifically to prevent this class of race (`tryAcquire`/`release`). Today this is latent rather than actively firing, because every current caller of `requestRestart` happens to be routed through the EDT (`BbjLanguageClient.handleServerStatusChanged` wraps `updateStatus` in `invokeLater`, and all the UI action/notification call sites are Swing/AnAction callbacks), so calls are serialized in practice. But nothing in `RestartGate`, `AlarmScheduler`, or `BbjServerService` enforces that invariant, and `AlarmScheduler` is explicitly built on a `POOLED_THREAD` alarm specifically so it *can* be driven from background threads. `RestartGateTest` also only ever exercises this class through a single-threaded `ManualScheduler` — unlike `DownloadGuardTest`, which has a dedicated 8-thread concurrency test (`exactlyOneOfEightConcurrentAcquireCallsWins`) — so this gap is completely unguarded by tests.

**Fix:** Make `request()` atomic, e.g.:

```java
public synchronized void request(long delayMs) {
    scheduler.cancelAll();
    scheduler.schedule(restartAction, delayMs);
}
```
and add a multi-threaded test mirroring `DownloadGuardTest`'s concurrency case (N threads calling `request()` concurrently, then asserting the action ran exactly once after the delay elapses).

### WR-02: `BbjNodeVersionCache.getVersion()` has a check-then-act race that can duplicate `node --version` spawns

**File:** `bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjNodeVersionCache.java:69-81`

**Issue:**

```java
public @Nullable String getVersion(@NotNull String nodePath) {
    String currentStamp = stat.stampOf(nodePath);
    if (currentStamp == null) {
        return null;
    }
    Entry cached = cache.get(nodePath);
    if (cached != null && cached.stamp().equals(currentStamp)) {
        return cached.version();
    }
    String version = spawner.versionOf(nodePath);
    cache.put(nodePath, new Entry(currentStamp, version));
    return version;
}
```

The `get`-then-`put` sequence is not atomic despite the backing `ConcurrentHashMap`. Two threads racing on a cache miss for the same `nodePath` (a realistic scenario: `BbjSettingsLookups.lookupNode` runs on the shared settings `AlarmScheduler` pooled thread while `BbjMissingNodeNotificationProvider.collectNotificationData` can be invoked concurrently per open BBj editor on the platform's own background executor, both reading the same global `nodeJsPath`) can both observe a miss and both spawn `node --version` concurrently. This contradicts the class's own stated goal ("Two consecutive resolutions of the same unchanged path spawn `node --version` at most once") once "consecutive" becomes "concurrent." The impact is limited to redundant subprocess spawns rather than data corruption (the last writer simply wins in the map), but it is a real, provable race in a class explicitly built to eliminate exactly this kind of duplicate work.

**Fix:** Use an atomic per-key update, e.g.:

```java
public @Nullable String getVersion(@NotNull String nodePath) {
    String currentStamp = stat.stampOf(nodePath);
    if (currentStamp == null) {
        return null;
    }
    return cache.compute(nodePath, (path, existing) ->
        existing != null && existing.stamp().equals(currentStamp)
            ? existing
            : new Entry(currentStamp, spawner.versionOf(path))
    ).version();
}
```

### WR-03: Async settings lookups introduce a staleness window in `getClasspathEntry()`

**File:** `bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjSettingsComponent.java:189-201` (sets `classpathLookupPending = true` synchronously on keystroke), `249-267` (`applyHomeLookup` clears it ~300ms later), `313-322` (`getClasspathEntry()`)

**Issue:** `getClasspathEntry()` returns `pendingClasspathSelection` while `classpathLookupPending` is `true`:

```java
public @NotNull String getClasspathEntry() {
    if (classpathLookupPending) {
        return pendingClasspathSelection;
    }
    ...
}
```

`classpathLookupPending` is set `true` synchronously the instant the BBj-home field's text changes, but is only cleared ~300ms later when `homeDebouncer`'s background lookup completes and `applyHomeLookup` runs on the EDT. Prior to this phase's refactor, the classpath dropdown (and therefore `getClasspathEntry()`'s return value) was recomputed synchronously on the same EDT event as the keystroke, so `getClasspathEntry()` was always consistent with the live BBj-home text by the time "Apply" could be clicked. Now, if the user types a new BBj home path and clicks "Apply" within the 300ms debounce window, `getClasspathEntry()` returns `pendingClasspathSelection` — whatever value was last set via `setClasspathEntry()` (typically the classpath loaded from the *previous* BBj home, or "") rather than anything derived from the path just typed. This is a real, if narrow, regression in settings-save correctness introduced by the D-12 async refactor.

**Fix:** Either disable the "Apply"/"OK" action while `classpathLookupPending` is true, or have the Configurable's `apply()` flush pending debounced lookups synchronously before reading `getClasspathEntry()`.

### WR-04: `BbjNodeDownloader`'s cancellable download task ignores cancellation outside the byte-copy phase

**File:** `bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjNodeDownloader.java:78-165`

**Issue:** `downloadNodeAsync` queues `new Task.Backgroundable(project, "Downloading Node.js " + NODE_VERSION + "...", true)` — the third constructor argument (`true`) marks the task cancellable, and IntelliJ shows a Cancel affordance on the progress UI for it. `HttpRequests...saveToFile(tempFile.toFile(), indicator)` does honor cancellation during the byte copy, but none of `NodeArchiveVerifier.verify(...)`, `extract(...)`, or `install(...)` — which run after the download completes and can themselves take several seconds (tar extraction via an external process, digest verification, file copy) — ever call `indicator.checkCanceled()`. Once the download bytes finish, clicking Cancel has no effect for the remainder of the task, silently misleading the user and leaving `DownloadGuard` held for longer than necessary.

**Fix:** Call `indicator.checkCanceled()` at the start of `extract()` and `install()` (and periodically inside `extractTarGz`'s output-reading loop), or construct the task with `canBeCancelled = false` if cancellation genuinely isn't meant to be supported past the download step.

### WR-05: Source-guard fence omits the "settings-apply flow" restart site it claims to cover

**File:** `bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/BbjServerServiceRestartSourceGuardTest.java:22-35`; `bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjServerService.java:29-34`

**Issue:** `BbjServerService`'s class Javadoc explicitly states:

> Every restart trigger — the manual restart action, the crash notification, both status-bar widgets, refresh Java classes, the Node download-success notification, **and the settings-apply flow** — reaches the server only through the single guarded entry point `requestRestart(long)`.

`BbjServerServiceRestartSourceGuardTest.EXTERNAL_RESTART_SITES` is the mechanism that is supposed to fence exactly this guarantee, but its array lists only six files (`BbjRestartServerAction`, `BbjServerCrashNotificationProvider`, `BbjStatusBarWidget`, `BbjJavaInteropStatusBarWidget`, `BbjRefreshJavaClassesAction`, `BbjNodeDownloader`) — `BbjSettingsConfigurable.java` (the "settings-apply flow", confirmed to exist at `bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjSettingsConfigurable.java:83`, calling `BbjServerService.getInstance(project).scheduleRestart()`) is not in the list. Today that file happens to be correctly wired, but the test suite that exists specifically to catch a future regression in "every restart trigger" would not catch a regression in this particular site — the documented guarantee is broader than what is actually tested, and the gap sits precisely on a file this phase's own documentation calls out by name.

**Fix:** Add `BbjSettingsConfigurable.java` to `EXTERNAL_RESTART_SITES` (checking for `scheduleRestart()`/`requestRestart(` rather than the literal `requestRestart(0)` used for the zero-delay sites, since this site legitimately uses the debounced `scheduleRestart()`).

## Info

### IN-01: Source-guard tests are purely textual and can be defeated by a no-op refactor

**File:** all files under `bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/*SourceGuardTest.java`

**Issue:** Every "source guard" test in this phase (`BbjMissingNodeNotificationSourceGuardTest`, `BbjNodeDownloaderSourceGuardTest`, `BbjServerServiceRestartSourceGuardTest`, `BbjSettingsComponentSourceGuardTest`, `OffEdtDispatchSourceGuardTest`) works by reading the guarded `.java` file as a string and asserting on literal substring counts/positions (e.g. `countOccurrences(text, "requestRestart(0)")`). This gives no actual behavioral guarantee: extracting any guarded call into a one-line private helper method, or renaming a local variable that happens to appear in a matched literal, silently defeats the fence while introducing zero functional regression risk, or conversely could pass while the *behavior* regresses (e.g. the call is still textually present but now happens inside a dead branch). This is presumably an accepted, deliberate tradeoff given how hard it is to unit-test IntelliJ platform threading/EDT behavior directly, but it is worth flagging that "guard" in these test names implies stronger protection than a grep-for-string check actually provides.

**Fix:** No action required if this tradeoff is accepted project-wide; consider supplementing the highest-value guards (e.g. WR-05's restart fence) with an integration-style test where feasible.

### IN-02: Duplicated plugin-bundle path-resolution logic

**File:** `bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjEMLoginAction.java:210-220` (`getEMLoginBbjPath`), `bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjRunActionBase.java:236-252` (`getWebBbjPath`), `:261-276` (`getEmValidateBbjPath`)

**Issue:** Three near-identical private methods independently look up `PluginId.getId("com.basis.bbj")`, call `PluginManager.getInstance().findEnabledPlugin(...)`, resolve a `lib/tools/*.bbj` path relative to `plugin.getPluginPath()`, and swallow any exception to return `null`. This is straightforward duplication across two files; a future change to the plugin-bundle layout (or exception handling policy) needs to be applied in three places by hand.

**Fix:** Extract a shared `resolveBundledToolPath(String relativePath)` helper (e.g. on a small utility class) and have all three call sites delegate to it.

### IN-03: `deleteDirectory` follows symlinks during recursive cleanup

**File:** `bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjNodeDownloader.java:335-347`

**Issue:** `deleteDirectory` recurses via `file.isDirectory()`, which follows symbolic links; a symlink inside the temporary extraction directory pointing outside of it would cause the recursive delete to walk (and delete files under) an arbitrary target directory. Risk here is mitigated by the fact that the archive is downloaded from a pinned URL and checked against a pinned SHA-256 digest (`NodeArchiveVerifier`) before extraction, so this is not attacker-reachable under the current design, but it's worth calling out as a latent defense-in-depth gap if the trust model around the download source ever changes.

**Fix:** Use `Files.walkFileTree` with `FileVisitOption` defaults (which do not follow symlinks) or explicitly check `Files.isSymbolicLink(...)` before recursing.

---

_Reviewed: 2026-09-04_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
