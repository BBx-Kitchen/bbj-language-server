---
phase: 79-edt-responsiveness
plan: 03
subsystem: infra
tags: [intellij, concurrency, junit5, edt, node-download]

# Dependency graph
requires:
  - phase: 79-edt-responsiveness (plan 01)
    provides: BbjServerService.requestRestart(long) — the download-success notification's Restart action already redirects through it; this plan's DownloadGuard rewiring left that call site untouched
provides:
  - Plain-Java DownloadGuard (tryAcquire/release) making the Node.js download in-progress check atomic and in-memory
  - Runtime off-EDT assertion in BbjRunActionBase and BbjEMLoginAction, locking in the v4.1 CR-02 dispatch (#506)
affects: [83-regression-test-hardening]

# Actuals (#2632)
actuals:
  tokens: 5800
  tasks: 3
  commits: 3

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Injectable static singleton guard (DownloadGuard.SESSION) following NodeInstallIntegrity.SESSION's shape: attach-under-lock so a race loser's callback is never dropped"
    - "assertIsNonDispatchThread() as a live runtime tripwire layered on top of an already-correct executeOnPooledThread wrapper — diagnostic, not behavior-changing"

key-files:
  created:
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/DownloadGuard.java
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/DownloadGuardTest.java
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/OffEdtDispatchSourceGuardTest.java
  modified:
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjNodeDownloader.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjRunActionBase.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjEMLoginAction.java
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/BbjNodeDownloaderSourceGuardTest.java

key-decisions:
  - "BbjNodeDownloaderSourceGuardTest already carried seven pre-existing tests, not six as the plan's flagged-assumption count expected; adding the six new assertions brings the class to 13 tests, still well above the verify step's 'fewer than 12' failure threshold, so no adjustment was needed."
  - "assertIsNonDispatchThread() compiled and ran without modification on this platform (2024.2/JDK 17 toolchain), so flagged assumption #3's ThreadingAssertions.assertBackgroundThread() substitution was not needed."

patterns-established:
  - "DownloadGuard: JVM-wide compare-and-set guard with FIFO pending-completion attachment, acquired before the background task is queued rather than inside it — the actual EDT-06 fix, since the old flag was set only after a second caller could already have passed the check"

requirements-completed: [EDT-01, EDT-06]

coverage:
  - id: D1
    description: "Two near-simultaneous Node.js download requests start exactly one download task; the loser gets the same balloon and still has its onComplete callback run on the EDT when the winning download finishes"
    requirement: "EDT-06"
    verification:
      - kind: unit
        ref: "bbj-intellij/src/test/java/com/basis/bbj/intellij/DownloadGuardTest.java (7 tests: sequential, 8-thread concurrency, ordering, empty/fresh, null-callback, drain-once, loser-attached)"
        status: pass
      - kind: unit
        ref: "bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/BbjNodeDownloaderSourceGuardTest.java (6 new assertions: flag gone, guard acquire/release counts, acquire-before-queue ordering, release-after-failure ordering, invokeLater dispatch, requestRestart(0) survives)"
        status: pass
    human_judgment: false
  - id: D2
    description: "The persisted download in-progress flag is deleted; the in-progress state is in-memory only, so an IDE killed mid-download leaves nothing behind"
    requirement: "EDT-06"
    verification:
      - kind: unit
        ref: "bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/BbjNodeDownloaderSourceGuardTest.java#thePersistedInProgressFlagIsGone"
        status: pass
    human_judgment: false
  - id: D3
    description: "Run As BUI/DWC and EM login assert they are not on the dispatch thread before doing any blocking work, locking in the v4.1 CR-02 off-EDT dispatch; both executeOnPooledThread wrappers stay intact"
    requirement: "EDT-01"
    verification:
      - kind: unit
        ref: "bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/OffEdtDispatchSourceGuardTest.java (5 tests)"
        status: pass
    human_judgment: true
    rationale: "The assertion is a live-IDE tripwire (D-04) — it fires only when a real IDE ever calls either path on the dispatch thread, which the plain-JUnit classpath (no platform test harness, REQUIREMENTS.md Out of Scope) cannot exercise. The source guard proves the wiring is correct by construction; a human confirming Run As BUI/DWC and EM login still work in a running IDE closes the verify-and-close loop for #506."

duration: ~20min
completed: 2026-09-04
status: complete
---

# Phase 79 Plan 03: Atomic Download Guard + Off-EDT Dispatch Tripwire Summary

**A plain-Java `DownloadGuard` singleton makes the Node.js download in-progress check atomic and in-memory (replacing a persisted, non-atomic `PropertiesComponent` flag), and `assertIsNonDispatchThread()` now backs the already-correct v4.1 off-EDT dispatch for Run As BUI/DWC and EM login with a live runtime tripwire.**

## Performance

- **Duration:** ~20 min
- **Started:** 2026-09-04
- **Completed:** 2026-09-04T10:23:29Z
- **Tasks:** 3 completed
- **Files modified:** 7 (3 created, 4 modified)

## Accomplishments

- `DownloadGuard` (plain Java, no IntelliJ platform imports): `tryAcquire(Runnable)` performs `held.compareAndSet(false, true)` and attaches the completion under the same lock, so D-15's loser-never-drops-a-callback guarantee holds even under an 8-thread race (`DownloadGuardTest`, 7 tests).
- `BbjNodeDownloader.downloadNodeAsync` acquires the guard **before** `new Task.Backgroundable(...).queue()` — the actual EDT-06 fix, since the old persisted-flag write happened inside `run()`, after a second caller could already have passed the check. The background task's `finally` now loops over `DownloadGuard.SESSION.release()` and dispatches every drained completion via `invokeLater`, on both the success and failure paths.
- `DOWNLOAD_IN_PROGRESS_KEY` and its three `PropertiesComponent` uses are deleted; nothing persists, so no startup clean-up is needed and an IDE killed mid-download leaves nothing behind.
- `BbjNodeDownloaderSourceGuardTest` gained six new assertions pinning the wiring: the flag and `PropertiesComponent` are gone, the guard is acquired/released exactly once each, the acquire precedes queueing, the release sits after the failure-path literal (so it runs on that path too), drained completions reach `invokeLater`, and plan 79-01's `requestRestart(0)` redirect survives untouched.
- `BbjRunActionBase.actionPerformed`'s pooled lambda and `BbjEMLoginAction.performLogin` both now call `ApplicationManager.getApplication().assertIsNonDispatchThread()` as their first statement — one shared site for all three run-mode subclasses via the pooled lambda, and inside `performLogin` itself so all four in-tree `BbjRunBuiAction`/`BbjRunDwcAction` call sites are covered, not just `actionPerformed`'s own dispatch. Both `executeOnPooledThread` wrappers and both CR-02 rationale comments are untouched — this is a diagnostic tripwire on an already-correct path (D-04), not a behavior change.
- `OffEdtDispatchSourceGuardTest` (5 tests) pins both assertion sites, the pooled-dispatch wrapper, the `executeOnPooledThread(() -> performLogin(project))` call site, and confirms the abstract `buildCommandLine` declaration (no body) carries no assertion.
- The assertion API (`ApplicationManager.getApplication().assertIsNonDispatchThread()`) compiled and ran without modification on this platform (2024.2, JDK 17 toolchain) — flagged assumption #3's `ThreadingAssertions.assertBackgroundThread()` substitution was not needed.
- Whole-suite `./gradlew test` green: 159 tests, 0 failures (141 baseline from plan 79-02 + 7 `DownloadGuardTest` + 6 new `BbjNodeDownloaderSourceGuardTest` assertions + 5 `OffEdtDispatchSourceGuardTest`).

## Task Commits

Each task was committed atomically:

1. **Task 1: End-to-end single-download guard — two clicks, one download task** - `b832463` (feat)
2. **Task 2: Source-guard the download guard wiring** - `92e707b` (test)
3. **Task 3: Lock in off-EDT token validation and login with an assertion and a guard test** - `9a108d9` (fix)

**Plan metadata:** (this commit)

_Note: this is a tracer+tdd plan; Task 1's commit bundles its failing-test-first coverage together with the production change, consistent with how plans 79-01 and 79-02 committed. The tracer feedback gate re-ran `DownloadGuardTest` after Task 1's commit (interactive, `end-of-phase` mode, automated-only `<verify>`) and passed, so expansion into Tasks 2-3 proceeded without a checkpoint._

## Files Created/Modified

- `bbj-intellij/src/main/java/com/basis/bbj/intellij/DownloadGuard.java` - JVM-wide single-download guard: `tryAcquire(Runnable)` compare-and-set plus FIFO pending completions, `release()` drains
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjNodeDownloader.java` - `downloadNodeAsync` guarded before queueing, released in the finally of the background task on both success and failure paths
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjRunActionBase.java` - `assertIsNonDispatchThread()` inside the pooled lambda, ahead of `buildCommandLine`
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjEMLoginAction.java` - `assertIsNonDispatchThread()` as the first statement of `performLogin`
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/DownloadGuardTest.java` - concurrency, adjacency, ordering and empty/single-input coverage for the guard (7 tests)
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/BbjNodeDownloaderSourceGuardTest.java` - extended with 6 assertions pinning the guard wiring (13 tests total)
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/OffEdtDispatchSourceGuardTest.java` - source guard locking in the off-EDT dispatch and the assertion for both #506 paths (5 tests)

## Decisions Made

- `BbjNodeDownloaderSourceGuardTest` already carried seven pre-existing tests (verified before editing), not six as the plan's flagged-assumption count expected. Adding the six new assertions brought the class to 13, still comfortably above the verify step's "fewer than 12" failure threshold — no adjustment was needed, just noted here for accuracy against the plan's own count.
- `assertIsNonDispatchThread()` needed no substitution to `ThreadingAssertions.assertBackgroundThread()` — it compiled and ran cleanly on this platform, closing flagged assumption #3 as a non-issue.

## Deviations from Plan

None - plan executed exactly as written. The test-count note above reflects a discrepancy between the plan's assumption and the actual pre-existing file, not a deviation in what was built.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- EDT-01 and EDT-06 are satisfied; phase 79 is now complete — all six requirements (EDT-01 through EDT-06) are closed across plans 79-01, 79-02, and 79-03.
- `DownloadGuard` and the off-EDT assertions are stable, narrow seams ready for Phase 83's regression-test-hardening pass (BUILD-04, BUILD-05) to build additional coverage on top of, without modification.
- No file touched by plan 79-02, confirming both wave-2 plans (79-02, 79-03) could have run in parallel as the plan's success criteria required.
- Flagged residual risk (accepted, not solved): cross-process download races across two separate IDE processes sharing one plugins directory remain unguarded — an in-JVM guard cannot span processes; only a file lock would, and that is out of scope for this milestone (research PITFALLS.md Pitfall 3).

## Self-Check: PASSED

- FOUND: bbj-intellij/src/main/java/com/basis/bbj/intellij/DownloadGuard.java
- FOUND: bbj-intellij/src/test/java/com/basis/bbj/intellij/DownloadGuardTest.java
- FOUND: bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/OffEdtDispatchSourceGuardTest.java
- FOUND commit b832463 (feat(79-03): atomic in-memory DownloadGuard replaces persisted download flag)
- FOUND commit 92e707b (test(79-03): source-guard the download guard wiring)
- FOUND commit 9a108d9 (fix(79-03): runtime tripwire for off-EDT Run As BUI/DWC and EM login (#506))
- CONFIRMED: `./gradlew test` (whole suite) → BUILD SUCCESSFUL, 159 tests, 0 failures
- CONFIRMED: `grep -c 'DOWNLOAD_IN_PROGRESS_KEY\|PropertiesComponent' BbjNodeDownloader.java` → 0, 0

---
*Phase: 79-edt-responsiveness*
*Completed: 2026-09-04*
