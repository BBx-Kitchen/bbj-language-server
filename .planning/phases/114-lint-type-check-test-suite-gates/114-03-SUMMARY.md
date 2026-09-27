---
phase: 114-lint-type-check-test-suite-gates
plan: "03"
subsystem: intellij
tags: [intellij, lsp4ij, junit5, reflection, progress-indicator]

# Dependency graph
requires: []
provides:
  - "BbjNodeDownloader.progressReporter(indicator) re-asserts determinate mode before every setFraction, proven by a Proxy-based recording-fake ProgressIndicator test (no IDE application needed)"
  - "Reflective bbjcplAvailability registration guard (getMethod + JsonNotification + ServiceEndpoints.getSupportedMethods) that fails on a commented-out annotation or a changed parameter type"
affects: [114-13]

actuals:
  tokens: 3800
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "java.lang.reflect.Proxy over a platform interface (ProgressIndicator, confirmed an interface via javap on the ideaIC util-8.jar) for a recording fake that never starts an IDE application"
    - "Reflective JSON-RPC registration guard: getMethod pins the parameter type, the JsonNotification annotation value is read directly, and ServiceEndpoints.getSupportedMethods confirms LSP4IJ's own registration path -- immune to comments and to a changed parameter type"

key-files:
  created:
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/BbjNodeDownloaderProgressTest.java
  modified:
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjNodeDownloader.java
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/BbjNodeDownloaderSourceGuardTest.java
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/Lsp4ijOverrideSiteSourceGuardTest.java

key-decisions:
  - "progressReporter(indicator) extracted as a package-visible static factory returning NodeInstallPipeline.Progress, called from downloadNodeAsync's Task.Backgroundable.run(); the single pre-install setIndeterminate(false) call outside the repeatedly-invoked lambda is gone"
  - "BbjNodeDownloaderProgressTest drives the callback with a java.lang.reflect.Proxy fake over ProgressIndicator rather than a hand-rolled stub class or an IDE test fixture -- confirmed ProgressIndicator is a plain interface (javap against the ideaIC-2024.2 util-8.jar) before committing to the Proxy approach"
  - "The bbjcplAvailability guard's replacement API (org.eclipse.lsp4j.jsonrpc.services.ServiceEndpoints, org.eclipse.lsp4j.jsonrpc.json.JsonRpcMethod) was confirmed to resolve with a standalone ./gradlew compileTestJava run before writing the assertions against it, per the plan's own uncertainty note"

requirements-completed: [FIX-04]

coverage:
  - id: D1
    description: "The download progress callback re-asserts determinate mode before every fraction; a behavioural recording-fake test replaces the text-count guard and goes red when the reassertion is removed"
    requirement: FIX-04
    verification:
      - kind: unit
        ref: "BbjNodeDownloaderProgressTest#aSingleStepOnAFreshIndeterminateIndicatorRecordsSetIndeterminateThenTextThenFractionWithNoViolation"
        status: pass
      - kind: unit
        ref: "BbjNodeDownloaderProgressTest#threeStepsWithAPlatformStyleResetBetweenEachRecordNoViolationAndReassertDeterminateEachTime"
        status: pass
      - kind: other
        ref: "Mutation probe: removed setIndeterminate(false) from progressReporter, re-ran BbjNodeDownloaderProgressTest -- 2 of 4 tests failed"
        status: pass
    human_judgment: false
  - id: D2
    description: "The bbjcplAvailability guard checks the registered JSON-RPC notification by reflection (parameter type, annotation value, ServiceEndpoints registration) instead of scanning source text for a substring"
    requirement: FIX-04
    verification:
      - kind: unit
        ref: "Lsp4ijOverrideSiteSourceGuardTest#theBbjcplAvailabilityHandlerIsARegisteredObjectNotificationThatDoesNothingWithItsPayload"
        status: pass
      - kind: other
        ref: "Mutation probe: commented out @JsonNotification on BbjLanguageClient.bbjcplAvailability -- test failed (AssertionFailedError)"
        status: pass
      - kind: other
        ref: "Mutation probe: changed the handler's parameter type to String -- test failed (NoSuchMethodException)"
        status: pass
    human_judgment: false

duration: 16min
completed: 2026-09-27
status: complete
---

# Phase 114 Plan 03: IntelliJ Phase 97 Follow-ups (FIX-04) Summary

**Extracted `BbjNodeDownloader.progressReporter(indicator)` so determinate mode is re-asserted on every download step, backed by a `Proxy`-based recording-fake test, and replaced the comment-blind `bbjcplAvailability` text guard with a reflective `ServiceEndpoints`/`JsonNotification` check.**

## Performance

- **Duration:** 16 min
- **Started:** 2026-09-27T16:46:06Z
- **Completed:** 2026-09-27T17:02:00Z
- **Tasks:** 2
- **Files modified:** 4 (1 created, 3 modified)

## Accomplishments
- `BbjNodeDownloader.progressReporter(ProgressIndicator)` is a package-visible static factory: its callback calls `setIndeterminate(false)` before `setText`/`setFraction` on every invocation, so a response with no `Content-Length` (where the platform's `saveToFile` can reset the indicator to indeterminate between chunks) never reports a fraction on an indeterminate indicator.
- `BbjNodeDownloaderProgressTest` drives `progressReporter` with a recording fake `ProgressIndicator` built via `java.lang.reflect.Proxy` (confirmed an interface by `javap`-ing the bundled `ideaIC-2024.2` platform jar) -- no IDE application starts. Four tests cover a single fresh step, three steps with a platform-style reset between each, unchanged forwarding of text/fraction values, and a callback that is built but never invoked.
- The substring-counting `theIndicatorLeavesIndeterminateModeBeforeTheFirstFractionIsReported` method is removed from `BbjNodeDownloaderSourceGuardTest`; its other eight methods are untouched.
- `Lsp4ijOverrideSiteSourceGuardTest`'s `bbjcplAvailability` guard is now reflective: `BbjLanguageClient.class.getMethod("bbjcplAvailability", Object.class)` pins the parameter type, the method's `JsonNotification` annotation value is checked to equal exactly `"bbj/bbjcplAvailability"`, and `ServiceEndpoints.getSupportedMethods(BbjLanguageClient.class)` confirms LSP4IJ's own registration path sees it as a notification with exactly one `Object` parameter. The exact empty-body source check stays.
- The whole IntelliJ suite (`./gradlew cleanTest test`) is `BUILD SUCCESSFUL` after both tasks and after both mutation-probe restorations.

## Task Commits

1. **Task 1: The download progress callback re-asserts determinate mode on every step, proven by a recording fake indicator** - `829612ad` (feat)
2. **Task 2: The bbjcplAvailability guard checks the registered JSON-RPC notification by reflection, and the whole IntelliJ suite stays green** - `e3733309` (feat)

**Plan metadata:** (commit hash recorded after this SUMMARY is committed)

## Files Created/Modified
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjNodeDownloader.java` - extracted `progressReporter(indicator)`, called from `downloadNodeAsync`'s background task
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/BbjNodeDownloaderProgressTest.java` - new behavioural recording-fake test for the progress callback
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/BbjNodeDownloaderSourceGuardTest.java` - removed the substring guard the new test replaces
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/Lsp4ijOverrideSiteSourceGuardTest.java` - reflective `bbjcplAvailability` guard replacing the text-count/brace-scan checks

## Decisions Made
- Confirmed `com.intellij.openapi.progress.ProgressIndicator` is a plain interface (via `javap` against `ideaIC-2024.2/lib/util-8.jar`) before committing to a `Proxy.newProxyInstance` recording fake, avoiding a hand-written stub that would need to track every interface method by hand.
- Ran a standalone `./gradlew compileTestJava` after adding the `ServiceEndpoints`/`JsonRpcMethod` imports, per the plan's own noted uncertainty about whether that API resolves on the test classpath -- it does, transitively through the bundled `lsp4ij` plugin dependency, the same mechanism `Lsp4ijCouplingCanaryTest` already relies on.
- Kept the class Javadoc's existing structure and added one sentence noting the `bbjcplAvailability` guard is the one exception to source-text scanning, per the plan's instruction.

## Deviations from Plan

None - plan executed exactly as written.

## Mutation Probes

**Task 1 (download progress callback):** Removed `indicator.setIndeterminate(false);` from `progressReporter`'s lambda body and re-ran `BbjNodeDownloaderProgressTest`. Result: 2 of 4 tests failed --
`aSingleStepOnAFreshIndeterminateIndicatorRecordsSetIndeterminateThenTextThenFractionWithNoViolation` and
`threeStepsWithAPlatformStyleResetBetweenEachRecordNoViolationAndReassertDeterminateEachTime`, both with `org.opentest4j.AssertionFailedError`.
Restored with `git checkout -- bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjNodeDownloader.java`; `git status --porcelain` on the file printed nothing afterward.

**Task 2 (bbjcplAvailability guard), probe A:** Commented out `@JsonNotification("bbj/bbjcplAvailability")` on `BbjLanguageClient.bbjcplAvailability`. Result: `theBbjcplAvailabilityHandlerIsARegisteredObjectNotificationThatDoesNothingWithItsPayload` failed with `org.opentest4j.AssertionFailedError` (the annotation lookup returned `null`).
Restored with `git checkout -- bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/BbjLanguageClient.java`.

**Task 2, probe B:** Changed the handler's parameter type from `Object` to `String`. Result: the same test failed with `java.lang.NoSuchMethodException` (the pinned `getMethod("bbjcplAvailability", Object.class)` lookup no longer resolves).
Restored with the same `git checkout --`; a follow-up whole-suite run confirmed all tests green again.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- The IntelliJ half of FIX-04 (D-15) is closed: both weak phase-97 guards now fail when their guarded behaviour breaks, and the download-progress bug is fixed at its source. FIX-04 is also declared by plan 114-04 (still open, the vitest `issue447-real-interop.test.ts` half); `requirements.ready-ids` will hold `FIX-04` open in REQUIREMENTS.md until that plan's SUMMARY exists too.
- The in-IDE progress-bar visual check remains a manual item in plan 114-13's checkpoint, per this plan's `<success_criteria>`.
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp` is byte-identical to the phase base commit (`e8941d48`) -- this plan touched only `BbjNodeDownloader.java` (package `com.basis.bbj.intellij`, not `lsp`) and the two test files.

## Self-Check: PASSED

All 4 created/modified files verified present on disk; both task commits (`829612ad`, `e3733309`) verified present in git log; the plan-level `<verification>` (`./gradlew cleanTest test` BUILD SUCCESSFUL, three mutation probes each turning a test red and restored) re-confirmed above.

---
*Phase: 114-lint-type-check-test-suite-gates*
*Completed: 2026-09-27*
