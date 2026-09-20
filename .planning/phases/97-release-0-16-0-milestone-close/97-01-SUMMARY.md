---
phase: 97-release-0-16-0-milestone-close
plan: 01
subsystem: intellij-lsp
tags: [lsp4ij, crash-detection, java, intellij]

requires:
  - phase: 83-intellij-burn-down
    provides: LSP4IJ coupling fence (import allowlist + reflective canaries + whole-file source guards)
provides:
  - Authoritative crash-detection status feed on LSPClientFeatures#handleServerStatusChanged
  - Extended LSP4IJ coupling fence covering the new hook
affects: [97-05]

actuals:
  tokens: 12000
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "Anonymous LSPClientFeatures subclass gains a second override (handleServerStatusChanged) beside its existing initializeParams override, following the same EDT-dispatch idiom used everywhere else in the plugin."

key-files:
  created: []
  modified:
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/BbjLanguageServerFactory.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/BbjLanguageClient.java
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/Lsp4ijImportAllowlistTest.java
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/Lsp4ijCouplingCanaryTest.java
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/Lsp4ijOverrideSiteSourceGuardTest.java

key-decisions:
  - "Threading: Option B taken as directed by the orchestrator -- the new override dispatches its whole body through ApplicationManager.getApplication().invokeLater(...), keeping BbjServerService.updateStatus's non-volatile fields on the single-threaded EDT guarantee they rely on today. Option A (synchronized(this) around the non-UI section) stays a deferred follow-up, not this plan's work."
  - "getProject() wrapper-set assumption CONFIRMED by reading LSP4IJ 0.21.0's LanguageServerWrapper bytecode (javap -c), not merely assumed: getClientFeatures() lazily creates the client-features instance via getOrCreateClientFeatures(), which calls setServerWrapper(this) on it immediately after construction, before ever storing or returning it. Every call path that reaches handleServerStatusChanged(...) does so through getClientFeatures(), so getProject() can never see a null-wrapper client-features instance."

requirements-completed: [REL-01]

coverage:
  - id: D1
    description: "The crash-detection status feed is authoritative on LSPClientFeatures#handleServerStatusChanged (createClientFeatures()'s anonymous subclass) and no longer on BbjLanguageClient; exactly one updateStatus( call site exists across both files."
    requirement: "REL-01"
    verification:
      - kind: integration
        ref: "bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/Lsp4ijImportAllowlistTest.java#everyAllowlistedFileUsesExactlyTheSymbolsTheAllowlistRecords"
        status: pass
      - kind: other
        ref: "grep -c 'updateStatus(' on non-comment lines of both files (1 in factory, 0 in client)"
        status: pass
      - kind: other
        ref: "./gradlew compileJava --rerun-tasks"
        status: pass
    human_judgment: false
  - id: D2
    description: "New LSP4IJ coupling canary reflectively pins LSPClientFeatures.handleServerStatusChanged(ServerStatus) and LSPClientFeatures.getProject(), so a vendor rename/re-signature fails the build."
    requirement: "REL-01"
    verification:
      - kind: unit
        ref: "bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/Lsp4ijCouplingCanaryTest.java#theClientFeaturesMembersThisPluginOverridesStillExist"
        status: pass
    human_judgment: false
  - id: D3
    description: "New whole-file source guards pin the single-status-feed-site invariant: the factory's override calls super once, invokeLater once, updateStatus once, isDisposed at least twice; the client's override calls updateStatus zero times and keeps its one logToConsole call."
    requirement: "REL-01"
    verification:
      - kind: unit
        ref: "bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/Lsp4ijOverrideSiteSourceGuardTest.java#clientFeaturesHandleServerStatusChangedIsTheSingleStatusFeedSite"
        status: pass
      - kind: unit
        ref: "bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/Lsp4ijOverrideSiteSourceGuardTest.java#theLanguageClientOverrideNoLongerFeedsTheServerService"
        status: pass
    human_judgment: false
  - id: D4
    description: "Folded todo 1 end-to-end crash-detection fix works as intended in a running IDE (kill the language-server process, verify the crash banner and restart behavior)."
    requirement: "REL-01"
    verification: []
    human_judgment: true
    rationale: "D-07 explicitly requires a maintainer hand UAT in a running IDE, killing the process/dropping the connection and observing crash-banner and restart behavior -- no automated test can exercise LSP4IJ's real process-lifecycle teardown. This is plan 97-05's blocking checkpoint, out of this plan's scope."

duration: 15min
completed: 2026-09-20
status: complete
---

# Phase 97 Plan 01: Crash-Detection Status Feed Move Summary

**Moved the authoritative language-server status feed from `BbjLanguageClient` (nulled out by LSP4IJ before it publishes `stopped`) to a new `handleServerStatusChanged` override on `BbjLanguageServerFactory.createClientFeatures()`'s `LSPClientFeatures` subclass, confirming by bytecode inspection that `getProject()` can never see an unset server wrapper.**

## Performance

- **Duration:** ~15 min
- **Completed:** 2026-09-20T13:53:47Z
- **Tasks:** 3
- **Files modified:** 5

## Accomplishments

- `BbjLanguageServerFactory.createClientFeatures()`'s anonymous `LSPClientFeatures` gained a second override, `handleServerStatusChanged(@NotNull ServerStatus status)`, that calls `super.handleServerStatusChanged(status)` once, resolves the project via the now-confirmed-safe `getProject()`, and (per the Option B threading decision) dispatches `BbjServerService.getInstance(project).updateStatus(status)` through `ApplicationManager.getApplication().invokeLater(...)` with a project-disposed guard both before and inside the lambda.
- `BbjLanguageClient.handleServerStatusChanged` had its `service.updateStatus(serverStatus)` call deleted -- every other statement (super call, outer guard, `invokeLater`, the `service` local, the `logToConsole` line) stayed byte-identical, so the existing `handleServerStatusChangedCallsSuperOnceAndDispatchesItsOwnWorkThroughInvokeLater` guard kept passing unedited.
- `Lsp4ijImportAllowlistTest.ALLOWLIST`'s `BbjLanguageServerFactory.java` entry gained `"ServerStatus"`, alongside the existing five symbols; the 12-file map size assertion is unchanged.
- A new reflective canary, `theClientFeaturesMembersThisPluginOverridesStillExist`, pins `LSPClientFeatures.handleServerStatusChanged(ServerStatus)` and `LSPClientFeatures.getProject()` by signature.
- Two new whole-file source guards pin the single-authoritative-feed-site invariant: `clientFeaturesHandleServerStatusChangedIsTheSingleStatusFeedSite` (factory: super once, `invokeLater(` once, `updateStatus(` once, `isDisposed()` at least twice) and `theLanguageClientOverrideNoLongerFeedsTheServerService` (client: zero `updateStatus(` calls, one `logToConsole(` call).

## Task Commits

Each task was committed atomically:

1. **Task 1: End-to-end status feed** - `bb0a49f0` (feat)
2. **Task 2: Coupling canary for the new LSP4IJ hook** - `cb3ce7f8` (test)
3. **Task 3: Source guards pinning the single status-feed site** - `a2680319` (test)

**Plan metadata:** commit follows this SUMMARY.

## Files Created/Modified

- `bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/BbjLanguageServerFactory.java` - new `handleServerStatusChanged` override; three new imports (`ServerStatus`, `ApplicationManager`, `BbjServerService`)
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/BbjLanguageClient.java` - removed the `updateStatus(serverStatus)` call from its `handleServerStatusChanged` override
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/Lsp4ijImportAllowlistTest.java` - extended the factory's allowlist entry with `"ServerStatus"`
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/Lsp4ijCouplingCanaryTest.java` - new reflective canary for the two vendor members the override depends on
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/Lsp4ijOverrideSiteSourceGuardTest.java` - two new whole-file source guards

## Decisions Made

- **Option B threading (as pre-decided by the orchestrator, not re-opened):** the new override's whole body runs inside `invokeLater`, matching `BbjLanguageClient`'s existing shape and preserving `BbjServerService.updateStatus`'s implicit single-threaded-on-EDT guarantee for its non-volatile fields. Option A (`synchronized(this)` around the non-UI section) is a deferred follow-up.
- **`getProject()` wrapper-set assumption CONFIRMED, not left as a flagged risk.** Read `LanguageServerWrapper`'s bytecode via `javap -c -p` against the pinned `lsp4ij-0.21.0.jar`: `updateStatus(...)` calls `getClientFeatures().handleServerStatusChanged(status)` unconditionally; `getClientFeatures()` lazily creates the instance through `getOrCreateClientFeatures()`, which calls `createClientFeatures()` then `setServerWrapper(this)` on the result *before* caching or returning it. There is no code path where `handleServerStatusChanged` is invoked on a client-features instance whose wrapper is unset, so `getProject()` (which reads `getServerWrapper().getProject()`) is safe in every reachable call.

## Deviations from Plan

None - plan executed exactly as written. The one flagged assumption in the plan's frontmatter (LSP4IJ setting the client-features wrapper before any status publish) was confirmed true by direct bytecode inspection during Task 1, as the plan instructed, and recorded above rather than left unconfirmed.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- The single-feed-site invariant (one `updateStatus(` call site, on the client-features hook) is now both true in the source and pinned by an executable guard, satisfying the RESEARCH.md Pitfall 1 requirement this plan's objective names.
- `ExpectedStopGuard.java` and `BbjServerService.java` are untouched, as required -- plan 97-02 owns the stale-previous-status fix in `BbjServerService.updateStatus`.
- The maintainer hand UAT proving this end-to-end in a running IDE (kill the language-server process, observe crash banner + restart) is plan 97-05's blocking checkpoint, not yet run.
- No blockers for the next plan in this wave.

## Self-Check: PASSED

All 5 modified source/test files verified present on disk; all 4 commits (`bb0a49f0`, `cb3ce7f8`,
`a2680319`, `764fc451`) verified present in `git log`. All plan-level `<verification>` commands
re-ran green (`./gradlew test --tests "*.Lsp4ij*" --rerun-tasks` BUILD SUCCESSFUL; exactly one
non-comment `updateStatus(` across the two files, living in the factory; `ExpectedStopGuard.java`
and `BbjServerService.java` untouched per `git diff --exit-code`).

---
*Phase: 97-release-0-16-0-milestone-close*
*Completed: 2026-09-20*
