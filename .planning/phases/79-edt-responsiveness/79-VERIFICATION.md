---
phase: 79-edt-responsiveness
verified: 2026-09-04T10:47:53Z
status: passed
score: 5/5 must-haves verified
behavior_unverified: 0
overrides_applied: 0
human_verification:

  - test: "Open the Settings dialog, set a valid BBj home with a classpath entry already selected, close and reopen the dialog (or trigger reset()) while the home-path background lookup is still in flight, and confirm the classpath combo does not visibly reset to empty/placeholder before the lookup lands."
    expected: "The previously-persisted classpath entry stays selected (or is silently re-applied) across the reset()-then-lookup window; isModified() never reports a spurious change and apply() never overwrites the stored entry with an empty string."
    why_human: "pendingClasspathSelection preservation across a real Settings-dialog open/reset()/apply() cycle is asserted only by source-guard text checks and by construction (no BasePlatformTestCase harness exists in this repo per REQUIREMENTS.md Out of Scope) — 79-02-SUMMARY.md's own D3 coverage entry marks this human_judgment: true."
  - test: "In a running IDE build, invoke Run As BUI, Run As DWC, and Login to Enterprise Manager, and confirm they still complete successfully (no new failure, no new dialog, no logged assertion error) now that assertIsNonDispatchThread() runs on both paths."
    expected: "Both paths behave exactly as before — the assertion is a diagnostic tripwire on an already-correct off-EDT path and must not become a new way for either action to fail."
    why_human: "The assertion only fires meaningfully inside a real IDE platform (isDispatchThread() semantics); the plain-JUnit classpath used by this repo's tests has no platform runtime to exercise it end-to-end — 79-03-SUMMARY.md's own D3 coverage entry marks this human_judgment: true and asks for exactly this confirmation."
---

# Phase 79: EDT Responsiveness Verification Report

**Phase Goal:** The IntelliJ plugin never blocks the EDT on token validation, login, Node.js detection, settings input, or crash recovery, and never races itself on restarts or downloads.
**Verified:** 2026-09-04T10:47:53Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (Roadmap Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | A regression test fails if `buildCommandLine()`/`performLogin()` ever run on the EDT during Run As BUI/DWC or EM login (#506) | ✓ VERIFIED | `BbjRunActionBase.java:65-67` — `assertIsNonDispatchThread()` is the first statement inside `executeOnPooledThread(() -> {...})`, before `buildCommandLine(file, project)`. `BbjEMLoginAction.java:60-61` — `assertIsNonDispatchThread()` is the first statement of `performLogin`. `OffEdtDispatchSourceGuardTest` (5 tests) passes, pinning both sites and the ordering. |
| 2 | Rapidly typing in the Settings dialog's BBj home/Node.js path field never spawns a subprocess or reads a file on the EDT (#541) | ✓ VERIFIED | `BbjSettingsComponent.java` contains zero direct calls to `BbjNodeDetector.`, `BbjHomeDetector.`, `BbjSettings.getBBjClasspathEntries(`, or `new File(` (confirmed by grep); both `DocumentAdapter`s only call `nodeDebouncer.onTextChanged`/`homeDebouncer.onTextChanged`; both `ComponentValidator`s are pure readers of `lastNodeLookup`/`lastHomeLookup`. `KeystrokeDebouncerTest` (7 tests, real `ManualScheduler`-driven coalescing/staleness/EDT-refusal assertions) and `BbjSettingsComponentSourceGuardTest` (6 assertions) pass. |
| 3 | The missing-Node-runtime editor notification calls `node --version` at most once across two consecutive refresh passes for the same configured path (#543) | ✓ VERIFIED | `BbjMissingNodeNotificationProvider.java` resolves both branches through `BbjNodeVersionCache.SESSION.getVersion(...)` (confirmed by grep, 2 call sites) instead of the raw detector. `BbjNodeVersionCache.getVersion` is a stat-keyed (`lastModified:length`) `ConcurrentHashMap` memo — no timer, no hash. `BbjNodeVersionCacheTest` (7 tests, including the literal "two consecutive calls, one spawn" case, stat-change re-spawn, null-caching, bounded growth) and `BbjMissingNodeNotificationSourceGuardTest` (4 assertions) pass. |
| 4 | All six restart triggers funnel through one guarded entry point; first-crash delay is scheduled via `restartAlarm` off the EDT, not `Thread.sleep` in `invokeLater` (#513, #539) | ✓ VERIFIED | `BbjServerService.java` contains `requestRestart(long)` as the sole public entry point delegating to `restartGate.request(delayMs)`; `doRestart()` is private; `public void restart()` count is 0; `Thread.sleep` count is 0; `new Alarm(` count is 0 (wrapped in `AlarmScheduler`). All six external call sites (`BbjRestartServerAction`, `BbjServerCrashNotificationProvider`, `BbjStatusBarWidget`, `BbjJavaInteropStatusBarWidget`, `BbjRefreshJavaClassesAction`, `BbjNodeDownloader`) plus the in-file crash-balloon action call `requestRestart(0)`/`requestRestart(CRASH_RESTART_DELAY_MS)` — an eighth site (crash balloon) is also redirected, a documented superset of the roadmap's "six." `RestartGateTest` (7 tests: coalescing, zero-delay, adjacency, ordering, 1000 ms crash delay, merge-into-pending-delay) and `BbjServerServiceRestartSourceGuardTest` (8 assertions) pass. |
| 5 | Two near-simultaneous Node.js download requests start exactly one download task (#537) | ✓ VERIFIED | `DownloadGuard.tryAcquire` performs `held.compareAndSet(false, true)` and attaches the completion under the same `synchronized` lock as the check, called in `BbjNodeDownloader.downloadNodeAsync` **before** `Task.Backgroundable(...).queue()`; `release()` drains FIFO in the task's `finally` (both success and failure paths) and dispatches every completion via `invokeLater`. `DOWNLOAD_IN_PROGRESS_KEY`/`PropertiesComponent` are fully removed (grep count 0). `DownloadGuardTest` (7 tests, including an 8-thread `CountDownLatch`-driven concurrency test proving exactly 1 of 8 wins) and `BbjNodeDownloaderSourceGuardTest` (13 tests total, 6 new) pass. |

**Score:** 5/5 roadmap success criteria verified (0 present-but-behavior-unverified)

### Plan-Level Must-Haves (all three plans)

All plan-frontmatter `must_haves.truths` entries across 79-01, 79-02, 79-03 were checked against source and are backed by passing, non-trivial behavioral tests (`RestartGateTest`, `DownloadGuardTest`, `KeystrokeDebouncerTest`, `BbjNodeVersionCacheTest` — all use real edge-case assertions, e.g. `CountDownLatch`/`ExecutorService` races, `ManualScheduler` time-advance sequencing, staleness-discard checks — not placeholder assertions) plus source-guard tests for wiring. No must-have failed.

### `must_haves.prohibitions` (judgment-tier)

| Requirement | Statement | Status |
|---|---|---|
| EDT-05 | MUST NOT silently drop a user-initiated restart | resolved — coalescing always schedules exactly one pending task; `RestartGateTest` proves every request eventually fires (no drop, only merge) |
| EDT-02 | MUST NOT present a cached/debounced result as current after the input changed | resolved — staleness check compares `currentText.get()` before `apply.accept`; `KeystrokeDebouncerTest` Test 4/5 prove discard-on-change and apply-on-match |
| EDT-06 | MUST NOT silently drop a losing download request | resolved — `tryAcquire`'s completion attach happens under the same lock as the compare-and-set; `DownloadGuardTest` proves a loser's callback is present in the winner's `release()` |
| EDT-01 | MUST NOT let the new thread assertion change user-visible behaviour | resolved by construction (assertion added, no other statement touched) — full confirmation requires a running IDE (see Human Verification) |

These are judgment-tier, non-authoritative LLM-judge dispositions per ADR-550 D3/D4; flagged for awareness, not a blocking gate.

### Required Artifacts

| Artifact | Expected | Status | Details |
|---|---|---|---|
| `concurrency/Scheduler.java` | Plain-Java scheduling seam | ✓ VERIFIED | No `import com.intellij.` line; interface with `schedule`/`cancel`/`cancelAll` |
| `concurrency/AlarmScheduler.java` | Production adapter over `com.intellij.util.Alarm` | ✓ VERIFIED | `Alarm.ThreadToUse.POOLED_THREAD`, `Disposable` constructor param |
| `concurrency/RestartGate.java` | Coalescing gate | ✓ VERIFIED | `cancelAll()` then `schedule()`, no platform imports |
| `concurrency/ThreadProbe.java` | EDT-refusal seam | ✓ VERIFIED | Functional interface, no platform imports |
| `concurrency/KeystrokeDebouncer.java` | Per-field debounce w/ staleness discard | ✓ VERIFIED | `scheduler.cancel(previous)` (own task only, never `cancelAll`), EDT-refusal throw, staleness compare |
| `ui/BbjServerService.java` | `requestRestart(long)` single entry point | ✓ VERIFIED | Wired end-to-end, all 6 external + 2 in-file sites redirected |
| `BbjNodeVersionCache.java` | Stat-keyed memo | ✓ VERIFIED | `SESSION` singleton, `ConcurrentHashMap`, stat = lastModified+length |
| `BbjSettingsLookups.java` | Settings-dialog I/O holder | ✓ VERIFIED | `NodeLookup`/`HomeLookup` records, both short-circuits moved off EDT |
| `BbjSettingsComponent.java` | Listeners schedule only, validators read-only | ✓ VERIFIED | Confirmed by direct read of full file |
| `BbjMissingNodeNotificationProvider.java` | Both branches via cache | ✓ VERIFIED | 2 `BbjNodeVersionCache.SESSION.getVersion(` call sites |
| `DownloadGuard.java` | Atomic guard w/ FIFO completions | ✓ VERIFIED | `compareAndSet(false, true)` under `synchronized`, drains FIFO |
| `BbjNodeDownloader.java` | Guard acquired before queueing | ✓ VERIFIED | Acquire precedes `Task.Backgroundable`, release in `finally` on both paths |
| `actions/BbjRunActionBase.java` | Off-EDT assertion | ✓ VERIFIED | `assertIsNonDispatchThread()` inside pooled lambda, before `buildCommandLine` |
| `actions/BbjEMLoginAction.java` | Off-EDT assertion | ✓ VERIFIED | `assertIsNonDispatchThread()` as first statement of `performLogin` |
| All 8 new test classes | Behavioral + source-guard coverage | ✓ VERIFIED | 44 new tests, all pass (7+8+7+7+4+6+7+5, plus 6 new assertions folded into the pre-existing `BbjNodeDownloaderSourceGuardTest`) |

### Key Link Verification

| From | To | Via | Status |
|---|---|---|---|
| `BbjServerService.requestRestart` | `RestartGate.request` | delegation | ✓ WIRED |
| `RestartGate.request` | `Scheduler.cancelAll/schedule` | coalescing | ✓ WIRED |
| 6 external callers + 2 in-file sites | `BbjServerService.requestRestart(0\|CRASH_RESTART_DELAY_MS)` | direct call | ✓ WIRED (grep-confirmed on all 6 external files) |
| `BbjSettingsComponent` DocumentAdapters | `KeystrokeDebouncer.onTextChanged` | schedule-only listener | ✓ WIRED |
| `KeystrokeDebouncer` | `Scheduler.cancel/schedule` | per-field debounce | ✓ WIRED |
| `BbjSettingsLookups.lookupNode` | `BbjNodeVersionCache.SESSION.getVersion` | cache-backed lookup | ✓ WIRED |
| `BbjMissingNodeNotificationProvider` | `BbjNodeVersionCache.SESSION.getVersion` | both branches | ✓ WIRED (2 call sites) |
| `BbjNodeDownloader.downloadNodeAsync` | `DownloadGuard.SESSION.tryAcquire/release` | acquire-before-queue, release-in-finally | ✓ WIRED |
| `DownloadGuard.release()` | `ApplicationManager...invokeLater` | drained-completion dispatch | ✓ WIRED |

### Behavioral Spot-Checks / Test Execution

| Behavior | Command | Result | Status |
|---|---|---|---|
| Whole test suite | `./gradlew test` (fresh, `--rerun`) | BUILD SUCCESSFUL, 18 test classes, 159 tests / 0 skipped / 0 failures / 0 errors | ✓ PASS |
| `RestartGateTest` | `./gradlew test --tests '...RestartGateTest'` | 7/7 pass | ✓ PASS |
| `BbjServerServiceRestartSourceGuardTest` | targeted run | 8/8 pass | ✓ PASS |
| `BbjNodeVersionCacheTest` | targeted run | 7/7 pass | ✓ PASS |
| `KeystrokeDebouncerTest` | targeted run | 7/7 pass | ✓ PASS |
| `BbjMissingNodeNotificationSourceGuardTest` | targeted run | 4/4 pass | ✓ PASS |
| `BbjSettingsComponentSourceGuardTest` | targeted run | 6/6 pass | ✓ PASS |
| `DownloadGuardTest` | targeted run | 7/7 pass | ✓ PASS |
| `BbjNodeDownloaderSourceGuardTest` | targeted run | 13/13 pass (7 pre-existing + 6 new) | ✓ PASS |
| `OffEdtDispatchSourceGuardTest` | targeted run | 5/5 pass | ✓ PASS |

Test counts and results independently reproduced by this verification (not taken from SUMMARY.md claims) via a fresh `./gradlew test --rerun` plus per-class XML result parsing.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|---|---|---|---|---|
| EDT-01 | 79-03 | Off-EDT token validation/login, verify-and-close | ✓ SATISFIED | Assertion + wrapper intact, `OffEdtDispatchSourceGuardTest` |
| EDT-02 | 79-02 | Settings dialog debounce | ✓ SATISFIED | `KeystrokeDebouncer`, `BbjSettingsLookups`, both source guards |
| EDT-03 | 79-02 | Node-version cache | ✓ SATISFIED | `BbjNodeVersionCache`, provider rewire |
| EDT-04 | 79-01 | Crash delay off EDT | ✓ SATISFIED | `CRASH_RESTART_DELAY_MS` scheduled, no `Thread.sleep` |
| EDT-05 | 79-01 | Guarded restart funnel | ✓ SATISFIED | `requestRestart`, all 8 sites redirected |
| EDT-06 | 79-03 | Atomic download guard | ✓ SATISFIED | `DownloadGuard`, acquire-before-queue |

No orphaned requirements: REQUIREMENTS.md maps exactly EDT-01…EDT-06 to Phase 79, and all six appear in the union of the three plans' `requirements:` frontmatter fields.

### Anti-Patterns Found

None. Scanned all 19 files created/modified across the three plans for `TBD`/`FIXME`/`XXX`/`TODO`/`HACK`/`PLACEHOLDER`/stub phrasing/empty-return patterns. The only match was the benign descriptive phrase "not available" in a Javadoc comment describing the feature itself (`BbjMissingNodeNotificationProvider`'s class doc, "when Node.js 18+ is not available") — not a debt marker or stub indicator.

### Human Verification Required

1. **Settings-dialog classpath persistence across reset()**
   **Test:** Open Settings with a previously-persisted classpath entry selected, trigger a dialog reopen/reset while the BBj-home background lookup is still in flight.
   **Expected:** The classpath combo does not visibly flash to empty/placeholder and lose the persisted selection; `isModified()`/`apply()` behave correctly.
   **Why human:** No live-IDE (`BasePlatformTestCase`) test harness exists in this repo (REQUIREMENTS.md Out of Scope); the executor's own 79-02-SUMMARY.md coverage entry (D3) explicitly flags this as `human_judgment: true`.

2. **Run As BUI/DWC and EM login still function with the new runtime assertion**
   **Test:** In a running IDE build, invoke Run As BUI, Run As DWC, and EM login.
   **Expected:** All three behave exactly as before — no new failure, no assertion-triggered error in `idea.log`.
   **Why human:** `assertIsNonDispatchThread()`'s real behavior depends on the IntelliJ platform runtime, which the plain-JUnit test classpath does not provide; the executor's own 79-03-SUMMARY.md coverage entry (D3) explicitly flags this as `human_judgment: true`.

### Gaps Summary

No gaps found. All five roadmap success criteria and all six requirement IDs (EDT-01…EDT-06) are backed by real, substantive, passing code and non-trivial behavioral tests independently re-verified in this session (fresh `./gradlew test --rerun`: 159 tests, 0 failures, 0 errors). Two items carry over from the executors' own SUMMARY.md coverage sections as `human_judgment: true` — both concern live-IDE-platform behavior this repo's plain-JUnit test classpath cannot exercise, and both were already disclosed (not silently dropped) by the executors. They route to human verification per Step 8/9's `human_needed` classification rather than blocking the phase.

---

_Verified: 2026-09-04T10:47:53Z_
_Verifier: Claude (gsd-verifier)_
