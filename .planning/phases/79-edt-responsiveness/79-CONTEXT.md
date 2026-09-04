# Phase 79: EDT Responsiveness - Context

**Gathered:** 2026-09-04
**Status:** Ready for planning

<domain>
## Phase Boundary

The IntelliJ plugin (`bbj-intellij/`) never blocks the Event Dispatch Thread on EM token validation, EM login, Node.js version detection, Settings-dialog typing, or language-server crash recovery, and never races itself on language-server restarts or Node.js downloads. Requirements EDT-01 through EDT-06 (issues #506, #541, #543, #513, #539, #537), each locked in with a regression test that runs under the existing plain-JUnit 5 `./gradlew test` task.

Six code sites, all in `bbj-intellij/src/main/java/com/basis/bbj/intellij/`: `actions/BbjRunActionBase.java` and `actions/BbjEMLoginAction.java` (#506, verify-and-close), `BbjSettingsComponent.java` (#541), `BbjMissingNodeNotificationProvider.java` (#543), `ui/BbjServerService.java` (#513, #539), `BbjNodeDownloader.java` (#537), plus the direct `restart()` call sites those fixes redirect.

Not in this phase: EM token expiry/keychain work (Phase 80), the compile action and lexer fixes (Phase 81), composer changes (Phase 82), the broader Node download/extract/cache and LSP4IJ canary coverage (Phase 83), any general async/threading abstraction, and any `BasePlatformTestCase`/live-IDE test harness (REQUIREMENTS.md Out of Scope).

</domain>

<decisions>
## Implementation Decisions

### Verified state of `main` (2026-09-04)

- `BbjServerService.restart()` has **seven** direct callers, not the six #539 lists: `ui/BbjRestartServerAction.java:27`, `ui/BbjServerCrashNotificationProvider.java:49`, `ui/BbjStatusBarWidget.java:122`, `ui/BbjJavaInteropStatusBarWidget.java:116`, `actions/BbjRefreshJavaClassesAction.java:30`, the crash auto-restart inside `updateStatus()` (`BbjServerService.java:131`), and the "Restart Language Server" action on the Node download success notification (`BbjNodeDownloader.java:318`). Only `BbjSettingsConfigurable.apply()` (line 83) uses the existing debounced `scheduleRestart()`.
- The first-crash path (`BbjServerService.java:121-132`) does `Thread.sleep(1000)` inside `invokeLater` — on the EDT — then calls `restart()`.
- `BbjSettingsComponent` (lines 148-164) runs `BbjNodeDetector.getNodeVersion()` (spawns `node --version`) and `BbjHomeDetector.isValidBbjHome()` + `BbjSettings.getBBjClasspathEntries()` (directory reads) synchronously inside Swing `DocumentAdapter.textChanged` on every keystroke. The component receives a `Disposable` parent (`BbjSettingsConfigurable`, which implements `Disposable`), so a debounce `Alarm` has a natural owner.
- `BbjMissingNodeNotificationProvider.collectNotificationData()` calls the stateless `BbjNodeDetector.getNodeVersion()` on every refresh pass, on both the configured-path branch and the PATH-detection branch.
- `BbjNodeDownloader.downloadNodeAsync()` guards concurrency with a **persisted** `PropertiesComponent` boolean (`DOWNLOAD_IN_PROGRESS_KEY`, lines 38/77/85/94): the read-then-write is not atomic, and the key stays `true` forever if the IDE dies mid-download.
- `BbjRunActionBase.actionPerformed` (line 65) and `BbjEMLoginAction.actionPerformed` (line 42) already dispatch `buildCommandLine()` / `performLogin()` via `executeOnPooledThread` (v4.1 CR-02, commit 06eb1a7). #506 is verify-and-close.
- Test classpath is plain JUnit 5 (`junit-bom:5.10.2`, `useJUnitPlatform()`); no IntelliJ platform classes are available to tests. The eight existing test classes live in `src/test/java/com/basis/bbj/intellij/lsp/`; `NodeExecutableResolverTest` shows the injectable-seam style (`NodeExecutableResolver.PathProbe`), the five `*SourceGuardTest` classes show the source-text assertion style.

### Regression-test approach (all six requirements)

- **D-01:** Every fix is built as a **plain-Java seam** that the production class delegates to, and each seam gets **behavioural JUnit 5 tests** plus **one source-guard test per production site** asserting the site wires the seam (and, where relevant, that the old pattern is gone). Seams: a restart gate (D-05), a Node-version cache (D-09), a keystroke debouncer (D-12), and a download guard (D-14). No new test framework, no `testFramework(TestFrameworkType.Platform)`, no `BasePlatformTestCase` — the platform is not on the test classpath and stays off it. — **Reversibility:** reversible — seams are internal classes with no published contract; Phase 83 will build on them, so removing them later is `costly` only after Phase 83 lands.
- **D-02:** Time-based behaviour is tested through a small **`Scheduler` seam** (`schedule(Runnable, long delayMs)`, `cancelAll()`), with a production adapter over the existing `com.intellij.util.Alarm` (`ThreadToUse.POOLED_THREAD`, parented to a real `Disposable`) and a manual, deterministic scheduler in tests that advances time explicitly. No `Thread.sleep` or timeout-polling in tests.
- **D-03:** Off-EDT execution is tested through a **thread-probe seam** (`isDispatchThread()`): production delegates to `ApplicationManager.getApplication().isDispatchThread()`, tests inject a fixed answer. Seams that must never run on the EDT consult it.
- **D-04 (EDT-01, #506):** Add a **runtime assertion** `ApplicationManager.getApplication().assertIsNonDispatchThread()` as the first statement of `BbjRunActionBase.buildCommandLine()` implementations' shared entry (or of the abstract method's single call site plus `BbjEMLoginAction.performLogin()`), so a real IDE logs an error the moment either path is ever called on the EDT. The regression test is a source-guard asserting (a) the assertion is present in both methods and (b) both calls are still enclosed in `executeOnPooledThread`. No production behaviour change beyond the assertion; the issue closes as verify-and-close.

### Restart funnel (EDT-04 #513, EDT-05 #539)

- **D-05:** One guarded entry point, `requestRestart(long delayMs)` (name at planner's discretion), implemented as **coalescing through the existing `restartAlarm`**: `cancelAllRequests()` then `addRequest(this::doRestart, delayMs)`. Two triggers inside the window collapse into exactly one `stop` + `start`. A trigger that arrives during the pending first-crash delay merges into it. No in-flight flag, no second state machine.
- **D-06:** **All seven** callers listed under "Verified state" go through the guard; the raw `stop("bbjLanguageServer")` + `start("bbjLanguageServer")` becomes private (package-private only if a test needs it). The source-guard test asserts zero `.restart()` call sites on `BbjServerService` outside `ui/BbjServerService.java`. #539 closes as "all triggers", not "six".
- **D-07:** Manual triggers (restart action, crash-notification Restart, both status-bar widgets, refresh Java classes, download-success Restart) call the guard with a **near-zero delay** (0 ms request on the alarm) so they coalesce with anything pending but feel instant. Settings-apply keeps `RESTART_DEBOUNCE_MS` (500 ms). The first-crash auto-restart uses the **1 s delay scheduled on `restartAlarm`** (`addRequest(this::doRestart, 1000)`), replacing the `Thread.sleep` inside `invokeLater` — that `invokeLater`/`sleep` block is deleted, and the source-guard asserts `Thread.sleep` no longer appears in `BbjServerService.java`.
- **D-08:** `clearCrashState()` stays part of the restart path (it must run whether the restart was manual or automatic) and its `EditorNotifications.updateAllNotifications()` call keeps its `invokeLater`, which is correct EDT use. The crash-count / 30 s window semantics are unchanged.

### Node-version cache and keystroke debounce (EDT-02 #541, EDT-03 #543)

- **D-09:** New plain-Java class `BbjNodeVersionCache` beside `BbjNodeDetector` (package `com.basis.bbj.intellij`): a static `ConcurrentHashMap` memo in front of the stateless `BbjNodeDetector.getNodeVersion()`, with an injectable spawner (so tests count spawns without a real `node`) and a package-private `clear()` for tests. Not an IntelliJ service; nothing to register in `plugin.xml`.
- **D-10:** Cache key is **configured path + a cheap stat of the binary (last-modified time and size)**. `node --version` is re-spawned only when the setting changes or the binary at that path is replaced (in-place Node upgrade); two consecutive notification refresh passes for the same unchanged path spawn at most once (the EDT-03 regression test), and a stale version is never shown after an upgrade. The stat is not a subprocess and is cheap, but it is still file I/O: in the Settings dialog it runs inside the debounced background task, never in the document listener.
- **D-11:** `BbjMissingNodeNotificationProvider` resolves the version through the cache on both branches (configured path, and PATH-detected path from `BbjNodeDetector.detectNodePath()`). `detectNodePath()` itself is a PATH scan without a subprocess and may stay as is.
- **D-12:** `BbjSettingsComponent` replaces the synchronous work in both `DocumentAdapter`s with a **debounced background lookup**: a keystroke debouncer seam over the `Scheduler` (D-02), backed in production by one `Alarm(POOLED_THREAD, parentDisposable)` owned by the component (the `Disposable` passed into its constructor, i.e. `BbjSettingsConfigurable`). The background task performs the Node stat + version lookup (via the cache) and the BBj-home validity + classpath enumeration, then posts results with `invokeLater`. Results are **discarded if the field's text has changed** since the lookup was scheduled (compare against the current field value on the EDT before applying). Debounce interval at Claude's discretion (300 ms suggested; `RESTART_DEBOUNCE_MS` is 500).
- **D-13:** While a lookup is pending the Node label shows **"Checking Node.js version…"** and the classpath combo is **disabled** with its placeholder model; the background result then fills both. The empty-path and missing-file short-circuits (`nodePath.isEmpty()`, `!file.exists()`) move into the background task too, so the listener does no file I/O at all. The EDT-02 regression test simulates rapid keystrokes against the debouncer + fake scheduler and asserts zero spawns and zero directory reads until the scheduler fires, then exactly one.

### Download guard (EDT-06 #537)

- **D-14:** Replace the persisted `PropertiesComponent` flag with an **in-memory `AtomicBoolean` compare-and-set** inside a small `DownloadGuard` seam (`tryAcquire()` / `release()`), released in the `finally` of the `Task.Backgroundable`. `DOWNLOAD_IN_PROGRESS_KEY` and its three uses are deleted; no startup clean-up is needed because nothing persists. The EDT-06 regression test calls `downloadNodeAsync`'s guarded start twice from two threads (or two sequential calls without release) and asserts one acquisition.
- **D-15:** A caller that loses the race still gets the existing **"Node.js download already in progress" balloon**, and its `onComplete` callback is **attached to the running download** (the guard keeps a list of pending completions that the winner's `finally` drains via `invokeLater`), so the editor banner refresh never depends on which click won. — **Reversibility:** reversible.

### Plan split

- **D-16:** Three plans, **per seam, tests first** (each plan writes its failing test before the production change, matching the v4.1 red-then-green convention):
  1. `BbjServerService` restart funnel + crash delay (#539, #513) with the restart-gate and `Scheduler` seams, including the seven call-site redirects.
  2. `BbjNodeVersionCache` + Settings-dialog debouncer + notification-provider cache use (#541, #543).
  3. `DownloadGuard` (#537) + the #506 runtime assertion and source-guards (EDT-01, EDT-06).
  Plans 2 and 3 depend on plan 1 only for the shared `Scheduler` seam; the planner may put that seam in plan 1 and run 2 and 3 in parallel afterwards.

### Claude's Discretion
- Exact seam names, packages, and whether the seams sit beside their consumers or in one small `concurrency`/`util` package.
- Debounce interval for the Settings dialog (300 ms suggested) and whether manual restarts use `0` or a few ms on the alarm.
- Test file placement: extend the existing `src/test/java/com/basis/bbj/intellij/lsp/` package or mirror production packages; the existing eight tests all sit in `lsp/`.
- How the source-guards are scoped (exact substrings vs. small regexes), following the existing `*SourceGuardTest` style.
- Whether `assertIsNonDispatchThread()` sits in `BbjRunActionBase` at the single `buildCommandLine(file, project)` call site or inside each of the three subclass implementations (`BbjRunGuiAction`, `BbjRunBuiAction`, `BbjRunDwcAction`); one shared site is preferred.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements and roadmap
- `.planning/REQUIREMENTS.md` — §EDT Responsiveness (EDT-01 … EDT-06, each with the exact regression-test wording) and §Out of Scope (no general async abstraction; no `BasePlatformTestCase` harness; no lexer rewrite)
- `.planning/ROADMAP.md` — Phase 79 entry: goal and five success criteria; Phase 83 depends on this phase's EDT paths
- `.planning/STATE.md` — §Accumulated Context: v4.2 sequencing note, standing v4.1 decisions (red-then-green regression coverage; `numFailedTests: 0` whole-suite gate)
- `.planning/PROJECT.md` — §Constraints (Community Edition, Node.js dependency) and §Key Decisions ("Process launch off EDT to pooled thread"; "30-second LS grace period"; "Gate run actions on LS started status")

### Research (verified against current `main` on 2026-09-04)
- `.planning/research/SUMMARY.md` — §Architecture Approach (shared Node-version cache in front of `BbjNodeDetector`; `restartAlarm` as the one proven debounce), §Critical Pitfalls 1 and 3 (#506 already fixed; new `Alarm`s must be parented to a real `Disposable`), §Phase 2 / §Phase 4 ordering (#539 before #513 in the same file; cache before #541/#543)
- `.planning/research/ARCHITECTURE.md` — component boundaries for the six fix sites
- `.planning/research/PITFALLS.md` — Pitfall 3 (`Alarm` disposal) and Pitfall 4 (plain memoized field for the read cache, not a timer)

### Production files this phase edits
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjServerService.java` — `restartAlarm` (line 37, `POOLED_THREAD`, parented to the service), `updateStatus()` crash branch (lines 100-143, the `Thread.sleep` at 126), `restart()` (209-215), `scheduleRestart()` (220-223)
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjRestartServerAction.java`, `ui/BbjServerCrashNotificationProvider.java`, `ui/BbjStatusBarWidget.java`, `ui/BbjJavaInteropStatusBarWidget.java`, `actions/BbjRefreshJavaClassesAction.java`, `BbjNodeDownloader.java:318` — the direct `restart()` callers to redirect
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjSettingsComponent.java` — constructor `Disposable parentDisposable` (line 43), the two `DocumentAdapter`s (148-164), `updateClasspathDropdown()` (200-216), `updateNodeVersionLabel()` (221-239)
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjSettingsConfigurable.java` — implements `Disposable`; `createComponent()` (37-38) passes `this`; `disposeUIResources()` (152)
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjMissingNodeNotificationProvider.java` — `collectNotificationData()` lines 36-59 (both `getNodeVersion` calls)
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjNodeDetector.java` — stateless `getNodeVersion()` (40-50) the cache wraps; `detectNodePath()` (26-32)
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjNodeDownloader.java` — `DOWNLOAD_IN_PROGRESS_KEY` (38) and `downloadNodeAsync()` (74-100)
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjRunActionBase.java` — `executeOnPooledThread` wrapper (60-70), abstract `buildCommandLine` (417)
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjEMLoginAction.java` — `actionPerformed` (36-43), `performLogin()`

### Test patterns to follow
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/NodeExecutableResolverTest.java` — injectable-seam behavioural test style (`PathProbe`)
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/BbjNodeDownloaderSourceGuardTest.java`, `BbjLanguageServerSourceGuardTest.java`, `BbjLanguageServerBundleSourceGuardTest.java` — source-guard style (`Paths.get("src","main",…)`, `indexOf` ordering, `countOccurrences`)
- `bbj-intellij/build.gradle.kts` — test dependencies (lines 36-38) and `useJUnitPlatform()` (42); do not add platform test frameworks

### Issues (acceptance criteria are authoritative for closure)
- GitHub #506 — verify-and-close: off-EDT `buildCommandLine()`/`performLogin()` locked in by a regression test
- GitHub #541 — Settings dialog keystrokes never spawn or read files on the EDT
- GitHub #543 — missing-Node notification caches the version per path
- GitHub #513 — first-crash delay via `restartAlarm`, no `Thread.sleep` in `invokeLater`
- GitHub #539 — one guarded restart entry point for every trigger
- GitHub #537 — atomic single-download guard

### Not useful here
- `.planning/codebase/*.md` — dated 2026-02-01, predate `bbj-intellij/`

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `BbjServerService.restartAlarm` — already `Alarm(ThreadToUse.POOLED_THREAD, this)` parented to the project-level service; D-05/D-07 extend it rather than adding a second alarm.
- `BbjJavaInteropService.checkAlarm` — a second example of the same pattern (`cancelAllRequests` + `addRequest`), useful as the reference shape for the `Scheduler` adapter.
- `BbjSettingsComponent(Disposable parentDisposable)` + `BbjSettingsConfigurable implements Disposable` — the natural owner for the Settings debounce alarm (research Pitfall 3 is already solvable without new lifecycle code).
- `NodeExecutableResolver.PathProbe` and `NodeInstallIntegrity.SESSION` — precedents for injectable seams with a production singleton and test doubles.
- The five `*SourceGuardTest` classes — copy the helper shape (`readGuardedSource`, `countOccurrences`) for the new guards.

### Established Patterns
- Off-EDT work: `ApplicationManager.getApplication().executeOnPooledThread(...)`; results back to the UI via `invokeLater` with a `project.isDisposed()` check first.
- Debounce: `Alarm.cancelAllRequests()` then `addRequest(runnable, delayMs)`.
- Regression tests are written red-then-green and run under `./gradlew test` on the JDK 17 toolchain provisioned in Phase 78; `buildPlugin` depends on `test`.
- Register-check the diff before pushing (v4.1 practice): issue numbers in comments are fine, no advisory ids.

### Integration Points
- The guarded restart entry point is the seam Phase 83's EDT regression coverage (BUILD-04) will target; keep its API small and stable.
- `BbjNodeVersionCache` is consumed by two callers now (Settings dialog, notification provider); Phase 83's Node download/cache coverage may add a third.
- `BbjNodeDownloader.downloadNodeAsync` is called from the notification panel and from `NodeExecutableResolver`-adjacent paths; D-15's callback attachment must preserve the `onComplete`-on-EDT contract documented in its Javadoc.

</code_context>

<specifics>
## Specific Ideas

- The EDT-03 test wording is literal: "at most one spawn across two consecutive refresh passes for the same configured path" — the cache test should call the provider's resolution twice and count spawner invocations.
- The EDT-05 test wording is literal: "fires two triggers in quick succession and asserts one restart" — drive the restart gate with the fake scheduler, fire two requests, advance time, assert one `doRestart`.
- The EDT-04 test has two halves: behavioural (crash delay scheduled on the gate with 1000 ms, no sleep) and source-guard (`Thread.sleep` absent from `BbjServerService.java`).
- The #506 runtime assertion doubles as a live tripwire in real IDEs; keep it even though the wrapper already exists.

</specifics>

<deferred>
## Deferred Ideas

- Broader Node download/extract/cache regression coverage and LSP4IJ experimental-API canaries — Phase 83 (BUILD-04, BUILD-05).
- A general async/threading abstraction beyond the `Scheduler`/thread-probe seams — REQUIREMENTS.md Out of Scope; the seams are deliberately minimal.
- Making `BbjNodeVersionCache` an application service with its own `Disposable` — not needed for a static memo; revisit only if a third consumer needs lifecycle hooks.

### Reviewed Todos (not folded)
- `2026-08-22-strip-em-config-sentinel-in-getconfigpatharg-and-commands-cj.md` — a run-action argument bug in `BbjRunActionBase.getConfigPathArg` / `Commands.cjs`, not an EDT path; stays pending (matched Phase 79 on keywords only, reviewed again 2026-09-04).
- `2026-09-03-update-live-interop-tests-for-getallclassnames-backend.md` — vitest live-interop drift in `bbj-vscode`; unrelated to the IntelliJ plugin; stays pending.

</deferred>

---

*Phase: 79-edt-responsiveness*
*Context gathered: 2026-09-04*
