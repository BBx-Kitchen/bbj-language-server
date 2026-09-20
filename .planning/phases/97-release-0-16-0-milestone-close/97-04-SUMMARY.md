---
phase: 97-release-0-16-0-milestone-close
plan: 04
subsystem: intellij-lsp
tags: [lsp4ij, intellij, node-download, log-noise]

requires:
  - phase: 83-intellij-burn-down
    provides: LSP4IJ coupling fence (import allowlist + reflective canaries + whole-file source guards)
provides:
  - No-op bbj/bbjcplAvailability notification handler on BbjLanguageClient
  - Indeterminate-mode fix in BbjNodeDownloader's progress reporting
affects: []

actuals:
  tokens: 1427
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "A third @JsonNotification handler added beside BbjLanguageClient's two existing ones, copying their doc-comment convention and taking an untyped Object parameter with an empty body so a no-op handler has no processing path at all."

key-files:
  created: []
  modified:
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/BbjLanguageClient.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjNodeDownloader.java
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/Lsp4ijOverrideSiteSourceGuardTest.java
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/BbjNodeDownloaderSourceGuardTest.java

key-decisions:
  - "Handler parameter shape: untyped Object, per 97-CONTEXT.md's discretion note preferring a no-op over surfacing BBjCPL availability as a new IntelliJ capability. A typed payload class would create a parse/validate path a true no-op must not have."
  - "The setIndeterminate(false) call is a single unconditional statement placed right after productionPipeline() is obtained and before pipeline.install(...), outside the progress lambda, so it runs once per download rather than on every progress tick."

requirements-completed: [REL-01]

coverage:
  - id: D1
    description: "BbjLanguageClient declares a bbj/bbjcplAvailability no-op handler, so LSP4IJ stops logging an unsupported-notification warning on every server start."
    requirement: "REL-01"
    verification:
      - kind: unit
        ref: "bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/Lsp4ijOverrideSiteSourceGuardTest.java#theBbjcplAvailabilityHandlerIsDeclaredAndDoesNothingWithItsPayload"
        status: pass
      - kind: other
        ref: "./gradlew compileJava --rerun-tasks"
        status: pass
      - kind: other
        ref: "grep -c 'bbj/bbjcplAvailability' BbjLanguageClient.java == 1"
        status: pass
    human_judgment: false
  - id: D2
    description: "BbjNodeDownloader leaves indeterminate mode before the first download-progress fraction is reported, so the platform no longer logs an IllegalStateException trace during a Node.js download."
    requirement: "REL-01"
    verification:
      - kind: unit
        ref: "bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/BbjNodeDownloaderSourceGuardTest.java#theIndicatorLeavesIndeterminateModeBeforeTheFirstFractionIsReported"
        status: pass
      - kind: other
        ref: "grep -c 'setIndeterminate(false)' BbjNodeDownloader.java == 1"
        status: pass
    human_judgment: false
  - id: D3
    description: "Both behaviours are observable only as idea.log noise disappearing during real server-start / download sessions -- a maintainer would need to compare log output before/after to see the effect directly."
    verification: []
    human_judgment: true
    rationale: "The source guards prove the code shape; confirming the actual log lines are gone requires running a real IntelliJ session with the plugin installed, which is outside this plan's automated verification and left to end-of-phase hand UAT."

duration: 10min
completed: 2026-09-20
status: complete
---

# Phase 97 Plan 04: Close Two Folded Log-Noise Todos Summary

**Added a no-op `bbj/bbjcplAvailability` `@JsonNotification` handler to `BbjLanguageClient` and a single `indicator.setIndeterminate(false)` call to `BbjNodeDownloader`, each pinned by a new source-guard assertion, closing folded todos 3 and 4 before 0.16.0 ships.**

## Performance

- **Duration:** ~10 min
- **Completed:** 2026-09-20T14:08:07Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- `BbjLanguageClient.bbjcplAvailability(Object result)` is declared with `@JsonNotification("bbj/bbjcplAvailability")`, an untyped `Object` parameter, and an empty body — LSP4J's reflection over the concrete class is the whole registration, and the handler has no path to parse, validate or store its payload.
- `Lsp4ijOverrideSiteSourceGuardTest.theBbjcplAvailabilityHandlerIsDeclaredAndDoesNothingWithItsPayload` asserts the annotation appears exactly once and the handler body, stripped of whitespace, equals `{}`.
- `BbjNodeDownloader.downloadNodeAsync` calls `indicator.setIndeterminate(false)` once, immediately after obtaining the production pipeline and before `pipeline.install(...)`, so the indicator leaves indeterminate mode before the first `setFraction(...)` call inside the progress lambda.
- `BbjNodeDownloaderSourceGuardTest.theIndicatorLeavesIndeterminateModeBeforeTheFirstFractionIsReported` asserts both calls occur exactly once each and that `setIndeterminate(false)` precedes `setFraction(` by index.
- No changes to `bbj-vscode/src/language/bbj-notifications.ts` or `bbj-document-builder.ts` — confirmed via `git diff --exit-code` on both files.

## Task Commits

Each task was committed atomically:

1. **Task 1: End-to-end — the server's BBjCPL-availability notification reaches a declared client method** - `8353f089` (feat)
2. **Task 2: Leave indeterminate mode before the first download fraction** - `57005094` (fix)

**Plan metadata:** commit follows this SUMMARY.

## Files Created/Modified

- `bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/BbjLanguageClient.java` - new no-op `bbjcplAvailability` handler
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjNodeDownloader.java` - one `indicator.setIndeterminate(false)` statement in `downloadNodeAsync`
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/Lsp4ijOverrideSiteSourceGuardTest.java` - new guard for the no-op handler
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/BbjNodeDownloaderSourceGuardTest.java` - new guard for the indicator-mode ordering

## Decisions Made

- Handler parameter shape is untyped `Object`, per 97-CONTEXT.md's discretion note preferring a no-op over surfacing BBjCPL availability as a new IntelliJ capability.
- `setIndeterminate(false)` is a single unconditional statement outside the progress lambda (runs once per download, not once per progress tick).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Own source-guard comment tripped its own assertion**
- **Found during:** Task 2 (indicator-mode source guard)
- **Issue:** The first attempt's inline comment on the `setIndeterminate(false)` statement contained the literal substring `setFraction(`, which the guard test's naive string-counting assertion (`assertEquals(1, countOccurrences(...))`) counted as a second occurrence, failing the test the same task added.
- **Fix:** Reworded the comment to describe the invariant without repeating the literal method-call text.
- **Files modified:** `bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjNodeDownloader.java`
- **Verification:** `./gradlew test --tests "*.BbjNodeDownloaderSourceGuardTest" --tests "*.BbjServerServiceRestartSourceGuardTest" --rerun-tasks` went from 1 failure to BUILD SUCCESSFUL.
- **Committed in:** `57005094` (Task 2 commit; the comment was corrected before commit, so no separate fix commit was needed)

---

**Total deviations:** 1 auto-fixed (1 bug, self-caught before commit)
**Impact on plan:** No scope creep — the fix stayed inside the same statement the task was already touching.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Both folded todos 3 and 4 are closed in code, each pinned by an executable source guard in the file that already guards its class.
- Compilation and all targeted Gradle test suites (`Lsp4ij*`, `BbjNodeDownloaderSourceGuardTest`, `BbjServerServiceRestartSourceGuardTest`) are green.
- The sender files (`bbj-vscode/src/language/bbj-notifications.ts`, `bbj-document-builder.ts`) are untouched, as required.
- `BbjServerService.java`, `ExpectedStopGuard*.java` and `BbjServerServiceRestartSourceGuardTest.java` were not modified — those remain plan 97-02's territory.
- The actual disappearance of both `idea.log` warnings/exception traces still needs confirmation in a running IDE session, which is part of this phase's later hand-UAT checkpoint, not this plan's automated scope.

## Self-Check: PASSED

All 4 modified source/test files verified present on disk (`BbjLanguageClient.java`, `BbjNodeDownloader.java`, `Lsp4ijOverrideSiteSourceGuardTest.java`, `BbjNodeDownloaderSourceGuardTest.java`). Both commits (`8353f089`, `57005094`) verified present in `git log --oneline --all`. All plan-level acceptance criteria re-ran green: `./gradlew compileJava --rerun-tasks` BUILD SUCCESSFUL; `./gradlew test --tests "*.Lsp4ij*" --tests "*.BbjNodeDownloaderSourceGuardTest" --rerun-tasks` BUILD SUCCESSFUL; `grep -c 'bbj/bbjcplAvailability'` on `BbjLanguageClient.java` == 1; `grep -c 'setIndeterminate(false)'` on `BbjNodeDownloader.java` == 1; sender files untouched (`git diff --exit-code` clean); register check (`git diff HEAD~2 -- bbj-intellij bbj-vscode | grep -nE 'D-[0-9]+|REL-0[0-9]|T-97-[0-9]+|97-0[0-9]'`) prints nothing for this plan's own two commits.

---
*Phase: 97-release-0-16-0-milestone-close*
*Completed: 2026-09-20*
