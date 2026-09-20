---
phase: 96-platform-integration-node-js-diagnosis
plan: 03
subsystem: infra
tags: [node-install-pipeline, intellij, zip-extraction, exception-handling, junit5]

requires:
  - phase: 83-regression-test-hardening
    provides: NodeInstallPipelineTest and NodeInstallPipelineSourceGuardTest against four committed fixture archives, the seam WR-02/WR-04 are fixed inside
provides:
  - "extractZip matches its target entry by exact relative path, not a loose endsWith(\"node.exe\") suffix test"
  - "installExtracted resolves the executable name through Target.nodeExecutableName() on both platform branches, retiring the independently re-derived \"node.exe\"/\"node\" literals (IN-02)"
  - "install()'s outer finally swallows a temp-archive cleanup failure through a new deleteIfExistsQuietly helper, so it can never replace the pipeline's real exception (WR-02)"
  - "A committed decoy fixture (fake-node-win-decoy.zip) and its hand-transcribed SHA-256 pin proving the exact-path fix"
affects: [96-07-windows-attestation]

actuals:
  tokens: 3019
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "Best-effort single-file cleanup helper (deleteIfExistsQuietly) mirroring the existing deleteRecursivelyQuietly convention -- a cleanup failure must never mask an earlier exception"
    - "Exact relative-path zip-entry match assembled from the same literals archiveFileName() already produces, joined with a forward slash (the zip format's own separator) to Target.nodeExecutableName()"

key-files:
  created:
    - bbj-intellij/src/test/resources/node-fixtures/fake-node-win-decoy.zip
  modified:
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/NodeInstallPipeline.java
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/NodeInstallPipelineTest.java
    - bbj-intellij/src/test/resources/node-fixtures/README.md

key-decisions:
  - "IN-02 stayed a one-line reuse per branch exactly as CONTEXT.md's fold condition required -- both installExtracted branches now call target.nodeExecutableName() with no added logic."
  - "The non-writable-parent cleanup-failure test variant is not skipped on this host -- it ran and passed, confirmed by the assumeTrue(!capturedTarget.isEmpty() && Files.exists(...)) check passing and the JUnit XML report showing no <skipped/> element."

requirements-completed: []

coverage:
  - id: D1
    description: "The Windows .zip branch installs only the entry at its own expected relative path; a wrong-path decoy entry ending in the same file name is skipped"
    requirement: "PLAT-06"
    verification:
      - kind: unit
        ref: "NodeInstallPipelineTest#aWrongPathDecoyEntryAheadOfTheRealBinaryIsSkippedAndTheRealBinaryIsInstalled"
        status: pass
      - kind: unit
        ref: "NodeInstallPipelineSourceGuardTest (whole class, unmodified pins on install() ordering)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Target.nodeExecutableName() is the single source of the Windows/Unix executable file name across extraction and install (IN-02)"
    requirement: "PLAT-06"
    verification:
      - kind: unit
        ref: "NodeInstallPipelineTest (existing Windows/Unix end-to-end cases, unmodified, still green)"
        status: pass
    human_judgment: false
  - id: D3
    description: "A failed temp-archive cleanup no longer replaces the pipeline's real exception (WR-02)"
    requirement: "PLAT-06"
    verification:
      - kind: unit
        ref: "NodeInstallPipelineTest.FailureAxis#aFailingTempFileCleanupNeverMasksTheRealVerificationFailure"
        status: pass
    human_judgment: false
  - id: D4
    description: "The whole IntelliJ JUnit suite stays green on a forced re-run, including both no-binary negative fixtures and the symlink cleanup case"
    verification:
      - kind: unit
        ref: "./gradlew test --rerun-tasks (18/18 tasks executed, BUILD SUCCESSFUL)"
        status: pass
    human_judgment: false

duration: 25min
completed: 2026-09-20
status: complete
---

# Phase 96 Plan 03: Node Install Pipeline Windows-Path Robustness Summary

**Exact zip-entry path matching, one-line executable-name reuse, and swallow-and-log outer cleanup close the two folded 83-REVIEW findings (WR-02, WR-04) plus IN-02 in `NodeInstallPipeline.java`.**

## Performance

- **Duration:** 25 min
- **Started:** 2026-09-20T01:53:30Z
- **Completed:** 2026-09-20T02:18:00Z
- **Tasks:** 2
- **Files modified:** 4 (1 new fixture, 3 modified)

## Accomplishments
- `extractZip`'s Windows `.zip` branch now matches its target entry by exact relative path (`node-v20.18.1-win-x64/node.exe`), built from the same literals `archiveFileName()` already assembles, instead of a loose `entry.getName().endsWith("node.exe")` suffix test. Proven by a new committed fixture, `fake-node-win-decoy.zip`, whose first entry is a wrong-path decoy (`other/decoy-node.exe`) carrying distinct marker bytes ahead of the real entry.
- `installExtracted` resolves the executable file name through `Target.nodeExecutableName()` on both the Windows and Unix branches, retiring the two independently re-derived `"node.exe"`/`"node"` literals (IN-02), folded in the same pass since it touches the same literal WR-04 fixes.
- `install()`'s outer `finally` now delegates to a new `deleteIfExistsQuietly` helper (a single-file sibling of the existing `deleteRecursivelyQuietly`) instead of calling `Files.deleteIfExists(tempFile)` directly, so a cleanup failure can never replace the pipeline's real exception (WR-02). The inner `finally`, already correct, is unchanged.
- A new test proves the primary failure survives a failing cleanup: a digest-mismatch pipeline driven through a fetcher that also strips write permission from the temp root, so the later cleanup attempt on the temp archive itself fails; the propagated `IOException` still names the verification failure and never mentions deletion.

## Task Commits

Each task was committed atomically:

1. **Task 1: A decoy entry can no longer be installed as the Node binary -- fixture, fix and proof** - `39ef6488` (fix)
2. **Task 2: A failed cleanup stops overwriting the real reason the install failed** - `8b7aa9ce` (fix)

**Plan metadata:** commit pending (this SUMMARY + STATE/ROADMAP/REQUIREMENTS)

_Note: both tasks were single-commit fixes; no TDD RED/GREEN sequencing was required by this plan._

## Files Created/Modified
- `bbj-intellij/src/test/resources/node-fixtures/fake-node-win-decoy.zip` - New committed fixture: a wrong-path decoy entry ahead of the real `node.exe` entry, proving the exact-path match
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/NodeInstallPipeline.java` - `extractZip` exact-path match (WR-04), `installExtracted` one-line `nodeExecutableName()` reuse on both branches (IN-02), new `deleteIfExistsQuietly` helper wired into the outer `finally` (WR-02)
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/NodeInstallPipelineTest.java` - New decoy-fixture pin and end-to-end test (Task 1); new failing-cleanup-survives test in `FailureAxis` (Task 2)
- `bbj-intellij/src/test/resources/node-fixtures/README.md` - New section for `fake-node-win-decoy.zip` with its build recipe and hand-transcribed SHA-256

## Decisions Made
- The decoy fixture's digest was computed with a real `sha256sum` run against the committed archive bytes and hand-transcribed into both the README and the test's pinned literal — never computed inside the test from the same bytes the verifier reads: `7de359bbff1843fd4b6b137ede3c1b170b5b1739a8ed3628c55b8c9c07aa1ce7`.
- IN-02 stayed a one-line reuse per branch, exactly as CONTEXT.md's fold condition required — no further refactor was needed or attempted.
- The non-writable-parent variant of the cleanup-failure test ran (not skipped) on this host: the test's own `assumeTrue(!capturedTarget.isEmpty() && Files.exists(capturedTarget.get(0)))` check passed, and the JUnit XML report for `FailureAxis` shows `aFailingTempFileCleanupNeverMasksTheRealVerificationFailure` with no `<skipped/>` element, confirming the permission change genuinely blocked deletion and the test exercised the real failing-cleanup path rather than a vacuous pass.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- `96-07-PLAN.md`'s Windows attestation now exercises a pipeline that already carries both WR-02 and WR-04, so no re-attestation of these two findings is needed.
- WR-01, WR-03 and WR-05 remain explicitly deferred (D-14) and stay recorded in STATE.md's Blockers — not touched here, per this plan's scope boundary.
- PLAT-06 is declared by both this plan and `96-07-PLAN.md` (the hand Windows attestation); it is left **Pending** here since `96-07` has not yet run — marking it complete now would repeat a known failure mode in this repo (a requirement flipped complete while a sibling declaring plan is still open).

## Self-Check: PASSED

- `bbj-intellij/src/test/resources/node-fixtures/fake-node-win-decoy.zip` — FOUND (staged and committed in `39ef6488`)
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/NodeInstallPipeline.java` — FOUND, contains both fixes
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/NodeInstallPipelineTest.java` — FOUND, contains both new tests
- `bbj-intellij/src/test/resources/node-fixtures/README.md` — FOUND, new section present
- Commit `39ef6488` — FOUND in `git log --oneline --all`
- Commit `8b7aa9ce` — FOUND in `git log --oneline --all`
- `grep -c 'endsWith("node.exe")' NodeInstallPipeline.java` — 0 (confirmed)
- `./gradlew test --tests "*.NodeInstallPipelineTest" --tests "*.NodeInstallPipelineSourceGuardTest"` — BUILD SUCCESSFUL (confirmed twice, once per task)
- `./gradlew test --rerun-tasks` — BUILD SUCCESSFUL, 18/18 tasks executed (no UP-TO-DATE), confirming a real re-run
- No `.java` file in this plan's diff contains a `D-NN`, plan-number, `C-`, `CR-`, `WR-` or `PLAT-` planning identifier (confirmed by grep, exit 1 / no matches)

---
*Phase: 96-platform-integration-node-js-diagnosis*
*Completed: 2026-09-20*
