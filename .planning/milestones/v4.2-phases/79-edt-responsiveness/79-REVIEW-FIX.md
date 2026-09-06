---
phase: 79-edt-responsiveness
fixed_at: 2026-09-04T00:00:00Z
review_path: .planning/phases/79-edt-responsiveness/79-REVIEW.md
iteration: 1
findings_in_scope: 6
fixed: 6
skipped: 0
status: all_fixed
findings:
  - id: CR-01
    status: fixed
    files_modified:
      - bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjRunActionBase.java
    commit_hash: bb40ef6
  - id: WR-01
    status: fixed
    files_modified:
      - bbj-intellij/src/main/java/com/basis/bbj/intellij/concurrency/RestartGate.java
      - bbj-intellij/src/test/java/com/basis/bbj/intellij/concurrency/RestartGateTest.java
    commit_hash: df717cd
  - id: WR-02
    status: fixed
    files_modified:
      - bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjNodeVersionCache.java
    commit_hash: 0a5bdac
  - id: WR-03
    status: "fixed: requires human verification"
    files_modified:
      - bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjSettingsComponent.java
      - bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjSettingsConfigurable.java
    commit_hash: b7c41f8
  - id: WR-04
    status: fixed
    files_modified:
      - bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjNodeDownloader.java
    commit_hash: 993e57e
  - id: WR-05
    status: fixed
    files_modified:
      - bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/BbjServerServiceRestartSourceGuardTest.java
    commit_hash: b99d538
out_of_scope:
  - IN-01
  - IN-02
  - IN-03
---

# Phase 79: Code Review Fix Report

**Fixed at:** 2026-09-04
**Source review:** .planning/phases/79-edt-responsiveness/79-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 6 (CR-01, WR-01, WR-02, WR-03, WR-04, WR-05)
- Fixed: 6
- Skipped: 0

All source edits and test/build verification ran directly in the main checkout on `main`
(`workflow.use_worktrees` is `false` in `.planning/config.json`), not in an isolated worktree.

## Fixed Issues

### CR-01: `BbjRunActionBase.validateBeforeRun()` still performs blocking filesystem I/O on the EDT

**Files modified:** `bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjRunActionBase.java`
**Commit:** `bb40ef6`
**Applied fix:** Moved the `validateBeforeRun(project)` call from synchronously on the EDT (before
`executeOnPooledThread`) to inside the pooled-thread lambda, immediately after
`assertIsNonDispatchThread()` and ahead of `buildCommandLine(file, project)`. `autoSaveIfNeeded()`
stays on the EDT as required (`FileDocumentManager` needs it there). Verified `OffEdtDispatchSourceGuardTest`
still passes unchanged (it only asserts `assertIsNonDispatchThread()` appears exactly once, before
`buildCommandLine`, both of which still hold).

### WR-01: `RestartGate.request()` is not synchronized — coalescing can be defeated by concurrent callers

**Files modified:**
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/concurrency/RestartGate.java`
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/concurrency/RestartGateTest.java`

**Commit:** `df717cd`
**Applied fix:** Made `request(long)` `synchronized`, so `cancelAll()` + `schedule()` run as one
atomic unit (mirroring `DownloadGuard`'s synchronized `tryAcquire`/`release`). Added a new
8-thread concurrency test, `concurrentRequestsFromMultipleThreadsCoalesceIntoExactlyOneScheduledRestart`,
mirroring `DownloadGuardTest.exactlyOneOfEightConcurrentAcquireCallsWins`'s
ready/start/done-latch shape: N threads call `request(500)` concurrently, then the test asserts
exactly one pending task was left on the scheduler and exactly one restart ran once the delay
elapsed. All 8 `RestartGateTest` cases (7 existing + 1 new) pass.

### WR-02: `BbjNodeVersionCache.getVersion()` has a check-then-act race that can duplicate `node --version` spawns

**Files modified:** `bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjNodeVersionCache.java`
**Commit:** `0a5bdac`
**Applied fix:** Replaced the separate `cache.get(...)` / `cache.put(...)` pair with a single
`ConcurrentHashMap.compute(...)` call, applied exactly as suggested in the review's Fix section.
`compute` holds the map's per-bin lock for the whole read-check-spawn-store sequence for a given
path, closing the race window. All 7 existing `BbjNodeVersionCacheTest` cases pass unchanged (no
new concurrency test was added for this finding — the review's fix suggestion did not call for
one, unlike WR-01).

### WR-03: Async settings lookups introduce a staleness window in `getClasspathEntry()`

**Files modified:**
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjSettingsComponent.java`
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjSettingsConfigurable.java`

**Commit:** `b7c41f8`
**Applied fix:** Chose the review's second suggested option (flush-before-read) over disabling the
Apply button, per task guidance, since it needs no platform plumbing. Added
`BbjSettingsComponent.flushPendingHomeLookup()`, a package-visible method that — only when
`classpathLookupPending` is still true — runs `BbjSettingsLookups.lookupHome(...)` synchronously
against the live BBj-home field text and applies the result via the existing `applyHomeLookup(...)`.
`BbjSettingsConfigurable.apply()` now calls this flush immediately before it reads
`myComponent.getClasspathEntry()`, so a user clicking Apply/OK within the ~300ms debounce window
after typing a new BBj home path gets a classpath value derived from that path rather than one
left over from the previous home. `BbjSettingsComponentSourceGuardTest` (all 6 cases) still passes
— the flush routes through the same `BbjSettingsLookups` abstraction the guard already expects, it
does not add any of the banned direct filesystem/detector calls.

**Flagged for human verification:** This fix intentionally reintroduces a small amount of
synchronous filesystem I/O on the EDT, but only in the narrow, low-frequency path of clicking
Apply/OK while a debounced lookup is in flight (as opposed to on every keystroke, which is what
the phase eliminated). A developer should confirm this tradeoff is acceptable and, ideally,
exercise the actual IntelliJ Settings dialog manually (type a new BBj home, click Apply
immediately, confirm the persisted classpath matches the new home) since there is no existing
unit test harness for `BbjSettingsComponent`/`BbjSettingsConfigurable` to add an automated
regression test against.

### WR-04: `BbjNodeDownloader`'s cancellable download task ignores cancellation outside the byte-copy phase

**Files modified:** `bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjNodeDownloader.java`
**Commit:** `993e57e`
**Applied fix:** Threaded the `ProgressIndicator` through `extract(...)` and `install(...)` and
added `indicator.checkCanceled()` at the start of each, as suggested. Also threaded it into
`extractTarGz(...)` and added a `checkCanceled()` poll inside its output-reading loop (destroying
the `tar` subprocess via `destroyForcibly()` if cancellation is detected mid-extraction, so a
canceled task does not leave an orphaned external process running). All `BbjNodeDownloaderSourceGuardTest`,
`BbjServerServiceRestartSourceGuardTest`, and `BbjMissingNodeNotificationSourceGuardTest` cases
still pass — the textual anchors these guards check (`extract(platform`, `install(platform`,
`NodeArchiveVerifier.verify(` ordering, etc.) are unaffected by adding the indicator parameter.

### WR-05: Source-guard fence omits the "settings-apply flow" restart site it claims to cover

**Files modified:** `bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/BbjServerServiceRestartSourceGuardTest.java`
**Commit:** `b99d538`
**Applied fix:** Added a new `SETTINGS_CONFIGURABLE` path constant and a dedicated test,
`theSettingsApplyFlowCallsScheduleRestartAndNeverTheRawRestartMethod`, checking
`BbjSettingsConfigurable.java` for `scheduleRestart()`/`requestRestart(` (rather than folding it
into `EXTERNAL_RESTART_SITES`, whose existing test asserts the zero-delay `requestRestart(0)`
literal used by the other six sites) plus zero raw `.restart()` calls, per the task's explicit
guidance. All `BbjServerServiceRestartSourceGuardTest` cases (8 existing + 1 new) pass.

## Skipped Issues

None — all six in-scope findings were fixed.

## Out of Scope (not fixed per fix_scope)

- **IN-01**: Source-guard tests are purely textual and can be defeated by a no-op refactor.
- **IN-02**: Duplicated plugin-bundle path-resolution logic across `BbjEMLoginAction`/`BbjRunActionBase`.
- **IN-03**: `deleteDirectory` follows symlinks during recursive cleanup in `BbjNodeDownloader`.

These were explicitly excluded by `fix_scope: critical_warning` and left for a future pass.

## Verification

- `cd bbj-intellij && ./gradlew compileJava compileTestJava` — clean compile after each fix.
- Targeted test runs after each fix: `OffEdtDispatchSourceGuardTest`, `RestartGateTest`,
  `BbjNodeVersionCacheTest`, `BbjSettingsComponentSourceGuardTest`, `BbjNodeDownloaderSourceGuardTest`,
  `BbjServerServiceRestartSourceGuardTest`, `BbjMissingNodeNotificationSourceGuardTest` — all pass.
- `cd bbj-intellij && ./gradlew test` (full suite) — `BUILD SUCCESSFUL`, run after all six commits.
- `bbj-vscode/out/language/main.cjs` already existed, so no rebuild of `bbj-vscode` was required
  before running the `bbj-intellij` gates.
- All gates above ran in the main checkout on `main` (no isolated worktree — `workflow.use_worktrees`
  is `false`), so these results are directly reproducible from this working tree.

---

_Fixed: 2026-09-04_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
