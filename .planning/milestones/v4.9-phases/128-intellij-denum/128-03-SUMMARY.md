---
phase: 128-intellij-denum
plan: 03
subsystem: intellij-plugin
tags: [intellij, editor-notifications, denum, debounce, source-guards]

requires:
  - phase: 128-intellij-denum
    provides: BbjDenumberAction.denumber(project, file) and LineNumbering.isLineNumberedSource from plan 01
provides:
  - "BbjLineNumberedNotificationProvider: Info banner with one Denumber link on the shared notification base"
  - "DirtyFileCoalescer: plain-Java per-key debounce over PreviewDebouncer"
  - "BbjLineNumberedBannerRefresher: project service with one filtered document listener refreshing one file's banner per 300 ms"
affects: [128-04]

actuals:
  tokens: 7700
  tasks: 3
  commits: 4

tech-stack:
  added: []
  patterns:
    - "banner verdict recomputed from the document text under ReadAction on every platform call, no cached state"
    - "lazy creation of a Disposable project service from the first provider evaluation, parented listener and alarm"
    - "set of dirty keys drained through a trailing-edge debouncer; remove-before-refresh keeps a key marked mid-refresh"

key-files:
  created:
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjLineNumberedNotificationProvider.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/concurrency/DirtyFileCoalescer.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/denum/BbjLineNumberedBannerRefresher.java
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/BbjLineNumberedNotificationProviderSourceGuardTest.java
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/concurrency/DirtyFileCoalescerTest.java
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/denum/BbjLineNumberedBannerRefresherSourceGuardTest.java
  modified:
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjNotificationProviderBase.java
    - bbj-intellij/src/main/resources/META-INF/plugin.xml
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/BbjNotificationProviderBaseSourceGuardTest.java

key-decisions:
  - "Banner status is Info: it is an offer, not a problem; the base's crash-versus-warning guard stays unchanged"
  - "Debounce window is 300 ms, per file, through the existing PreviewDebouncer and the pooled-thread AlarmScheduler"
  - "The refresher is created lazily from the provider (no startup activity) and is parented to itself, not to the project; the platform disposes a Disposable project service with the project"

patterns-established:
  - "DirtyFileCoalescer as the reusable seam for re-evaluating per-file editor state after document edits"

requirements-completed: []

coverage:
  - id: D1
    description: "A line-numbered BBj program shows the Info banner with exactly one Denumber link wired to the action's request path; no dismiss, no setting, no read-only special case, no cached verdict; unnumbered, config and non-BBj files show none"
    requirement: IJF-06
    verification:
      - kind: unit
        ref: "bbj-intellij BbjLineNumberedNotificationProviderSourceGuardTest and BbjNotificationProviderBaseSourceGuardTest (whole classes)"
        status: pass
    human_judgment: true
    rationale: "That the banner really appears when a numbered file is opened, that the platform tolerates the lazy service creation from a background read action, and that the link starts a run are only observable in a live IDE; the closing plan's hand check confirms them with idea.log free of provider exceptions"
  - id: D2
    description: "A burst of edits to one file collapses to one refresh, distinct files refresh once each, a later edit refreshes again, a key marked mid-refresh is not lost, nothing runs before the UI thread dispatches it, cancelAll is never called"
    requirement: IJF-06
    verification:
      - kind: unit
        ref: "bbj-intellij DirtyFileCoalescerTest (8 cases, deterministic scheduler)"
        status: pass
    human_judgment: false
  - id: D3
    description: "The banner goes away after the DENUM edit and returns after an Undo within about 300 ms of the last change; edits to non-BBj documents schedule nothing; a closed project or invalid file is skipped"
    requirement: IJF-06
    verification:
      - kind: unit
        ref: "bbj-intellij BbjLineNumberedBannerRefresherSourceGuardTest (whole class)"
        status: pass
    human_judgment: true
    rationale: "The structural pins prove one listener, filter-before-mark and the disposal guards; the actual disappearance after the edit and return after Undo, including a file shown in split editors, is a runtime behaviour confirmed by the hand check"

duration: 8min
completed: 2026-10-03
status: complete
---

# Phase 128 Plan 03: Line-numbered banner Summary

**IntelliJ shows an Info banner "This is a line-numbered BBj program. Denumber it for editing." with a single Denumber link on numbered BBj files, and a debounced per-file project refresher makes it disappear after the DENUM edit and return after Undo**

## Performance

- **Duration:** about 8 min
- **Completed:** 2026-10-03
- **Tasks:** 3
- **Files modified:** 9 (6 created, 3 modified)

## Accomplishments
- `BbjLineNumberedNotificationProvider` extends the shared base (so `config.bbx` and every other file type are excluded by the base's guard), reads the document under `ReadAction.compute`, asks `LineNumbering.isLineNumberedSource`, and offers exactly one `Denumber` label running `BbjDenumberAction.denumber(project, file)`. It holds no state, so the verdict is fresh on each platform call.
- `DirtyFileCoalescer<K>` collapses edits into one refresh per distinct key per window on top of `PreviewDebouncer`, never calls `cancelAll`, and keeps a key marked during its own refresh for the next window.
- `BbjLineNumberedBannerRefresher` registers one document listener (change and bulk-update-finished), filters to BBj program files before scheduling, and refreshes only the changed file's banner after 300 ms, guarded by `project.isDisposed()` and `file.isValid()`. The provider creates it lazily with `getInstance(project)`.
- Base class Javadoc counts now read five providers, four in this package, with the line-numbered banner on `Info`.
- Whole IntelliJ suite green under `./gradlew cleanTest test`: 1258 tests, 0 failures, 0 skipped (was 1235).

## Task Commits

1. **Task 1: banner provider (tracer)** - `98c46bdb` (feat)
2. **Task 2: per-file debounce (TDD)** - RED `5dc1ec38` (test), GREEN `d6a4c605` (feat)
3. **Task 3: project-level refresher** - `9038f6d3` (feat)

**Plan metadata:** committed separately (docs: complete plan)

## Files Created/Modified
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjLineNumberedNotificationProvider.java` - the banner
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/concurrency/DirtyFileCoalescer.java` - plain-Java debounce seam, no IntelliJ import
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/denum/BbjLineNumberedBannerRefresher.java` - project service with the listener
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjNotificationProviderBase.java` - Javadoc counts only
- `bbj-intellij/src/main/resources/META-INF/plugin.xml` - provider and project service registrations
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/BbjNotificationProviderBaseSourceGuardTest.java` - fifth provider in both parameter lists
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/BbjLineNumberedNotificationProviderSourceGuardTest.java`, `concurrency/DirtyFileCoalescerTest.java`, `denum/BbjLineNumberedBannerRefresherSourceGuardTest.java` - new tests

## Decisions Made
- Status `Info` for the banner (offer, not problem); the existing three-warnings-one-error guard is untouched.
- 300 ms per-file window; the refresher parents the alarm and the listener to itself.
- The tracer gate ran in the default end-of-phase mode with an automated-only verify: the Task 1 verify was green, so expansion went ahead.

## Deviations from Plan

None - plan executed exactly as written. The RED run of Task 2 used a compiling placeholder coalescer, as in the earlier plans, so seven of the eight tests failed on behaviour (the null-key test passes against a no-op by construction and is pinned by the real implementation). Task 3 added no unit test of the listener itself because the platform's multicaster is not available in this suite; structural pins stand in, and the hand check in the closing plan covers the live behaviour.

## Issues Encountered
- `plugin.xml` sits under an ignore rule, so staging it needs `git add -f` for the tracked file (same as in plan 01); nothing new was ignored or force-added beyond that tracked file.

## Known Stubs
None. The placeholder coalescer from the RED commit was replaced in the following commit.

## Threat Flags
None. The only new surface is what the plan's threat register already covers: the refresh storm is bounded by the coalescer and the BBj-only filter, and the banner only offers (one link, the click is the only trigger).

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- The three flagged runtime assumptions stay open for the hand check in 128-04: the provider is called with the thread contract the read action assumes (idea.log must show no provider exception on opening numbered files in a fresh session), lazy service creation from a background read action is allowed, and the banner returns after Undo, including with the file shown in two split editors.
- IJF-06 is not marked complete in REQUIREMENTS.md: plan 04 still declares it.

## Self-Check: PASSED

All created files exist on disk; commits `98c46bdb`, `5dc1ec38`, `d6a4c605` and `9038f6d3` are in the log; every acceptance criterion of the three tasks passed; the register grep over tracked diff lines and the new files prints nothing; `Lsp4ijImportAllowlistTest` is unchanged; nothing under `bbj-vscode/` changed; `./gradlew cleanTest test` reported 1258 tests with 0 failures.

---
*Phase: 128-intellij-denum*
*Completed: 2026-10-03*
