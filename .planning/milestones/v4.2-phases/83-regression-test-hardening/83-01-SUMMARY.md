---
phase: 83-regression-test-hardening
plan: 01
subsystem: testing
tags: [junit5, intellij-plugin, node-download, symlink-safety, mutation-testing]

# Dependency graph
requires:
  - phase: 79-edt-responsiveness
    provides: DownloadGuard (JVM-wide download serialization, off-EDT lookups) that this plan's adapter and drain-dispatch helper build on
  - phase: 81-feature-parity
    provides: bbj/compile server surface and lexer/commenter fixes that share the same Gradle toolchain this plan's tests run under
provides:
  - "A plain-Java NodeInstallPipeline seam covering the whole Node.js download/verify/extract/install/cache pipeline, executed by real JUnit 5 tests against committed fixture archives"
  - "A DownloadCompletions drain-dispatch helper isolating one throwing UI-refresh completion from the rest"
  - "A fixed symlink-following recursive delete (79-REVIEW IN-03), with a regression test proving the fix"
  - "Four committed Node fixture archives with a provenance README, replacing the previous zero-fixture, zero-execution guard-only coverage"
affects: [83-02, 83-03, future-node-pipeline-changes]

# Actuals (#2632)
actuals:
  tokens: 25400
  tasks: 3
  commits: 6

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Plain-Java pipeline seam with every platform touch point (Fetcher, Progress, CancelProbe, PathProbe, DigestSource, ByteSource) injected as a constructor collaborator, so the whole pipeline runs under plain JUnit 5"
    - "Fixture digests are literal strings transcribed from a provenance README, never computed from the same bytes the verifier reads under test"
    - "Source guards scoped to a located method-body window (bodyOf helper: locate declaration, brace-match to the closing brace) rather than whole-file text search"

key-files:
  created:
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/NodeInstallPipeline.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/DownloadCompletions.java
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/NodeInstallPipelineTest.java
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/NodeInstallPipelineSourceGuardTest.java
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/DownloadCompletionsTest.java
    - bbj-intellij/src/test/resources/node-fixtures/README.md
    - bbj-intellij/src/test/resources/node-fixtures/fake-node-win.zip
    - bbj-intellij/src/test/resources/node-fixtures/fake-node-win-no-binary.zip
    - bbj-intellij/src/test/resources/node-fixtures/fake-node-unix.tar.gz
    - bbj-intellij/src/test/resources/node-fixtures/fake-node-unix-no-binary.tar.gz
  modified:
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjNodeDownloader.java
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/BbjNodeDownloaderSourceGuardTest.java

key-decisions:
  - "Fixture digests are literal constants transcribed from the fixtures README, never computed at test time from the same bytes the verifier reads — computing them at test time would make the verify step vacuous"
  - "NodeInstallPipeline takes a Target record (Os, Arch) as a constructor argument rather than reading the host, so both platform branches are exercised on one Linux container"
  - "The recursive temp-directory delete uses Files.walkFileTree with no file-visit option, so a symbolic link is deleted as a link and never followed into its target (closes 79-REVIEW IN-03)"
  - "DownloadCompletions.dispatch isolates each UI-executor hand-over in its own try/catch, so one throwing editor-banner refresh cannot swallow the others still waiting"

requirements-completed: [BUILD-04]

coverage:
  - id: D1
    description: "The whole Node.js download/verify/extract/install/cache pipeline runs end to end in plain JUnit 5 against committed fixtures, on both platform branches, without a platform test harness"
    requirement: "BUILD-04"
    verification:
      - kind: unit
        ref: "bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/NodeInstallPipelineTest.java#theWindowsBranchRunsTheWholeNodeDownloadExtractAndCachePipelineEndToEnd"
        status: pass
      - kind: unit
        ref: "bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/NodeInstallPipelineTest.java#PlatformAxis.theUnixBranchExtractsBinNodeThroughTheRealTarAndSetsTheExecutableBit"
        status: pass
    human_judgment: false
  - id: D2
    description: "All six platform/architecture archive names assemble correctly and each has a pinned digest; a digest mismatch, a missing binary, or a cancel between steps all short-circuit cleanly with no leftover temp state"
    requirement: "BUILD-04"
    verification:
      - kind: unit
        ref: "bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/NodeInstallPipelineTest.java#PlatformAxis.everyPlatformAndArchitecturePairAssemblesAnArchiveNameThatHasAPinnedDigest"
        status: pass
      - kind: unit
        ref: "bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/NodeInstallPipelineTest.java#FailureAxis (aDigestMismatchStopsThePipelineBeforeExtraction, anArchiveWithNoNodeBinaryFailsInstallAndCleansUpOnWindows, anArchiveWithNoNodeBinaryFailsInstallAndCleansUpOnUnix, aCancelSignalledBeforeExtractionStopsThePipelineAndCleansUp, aCancelSignalledBeforeInstallationStopsThePipelineAndCleansUp)"
        status: pass
    human_judgment: false
  - id: D3
    description: "The symlink-following recursive delete bug (79-REVIEW IN-03) is fixed: a link inside the temp extraction directory is deleted as a link, its target survives"
    requirement: "BUILD-04"
    verification:
      - kind: unit
        ref: "bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/NodeInstallPipelineTest.java#FailureAxis.cleanupDeletesASymbolicLinkAndNeverTheFileItPointsAt"
        status: pass
      - kind: unit
        ref: "bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/NodeInstallPipelineSourceGuardTest.java#theRecursiveDeletePassesNoFileVisitOptionInsideDeleteRecursively"
        status: pass
    human_judgment: false
  - id: D4
    description: "Every drained download completion reaches the UI executor exactly once, in attachment order, and a throwing completion never blocks the rest"
    requirement: "BUILD-04"
    verification:
      - kind: unit
        ref: "bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/DownloadCompletionsTest.java (all four tests)"
        status: pass
    human_judgment: false
  - id: D5
    description: "The Windows auto-install failure observed in a prior UAT round is not reproducible from the pipeline's own branch logic on this Linux container"
    human_judgment: true
    rationale: "A Linux container cannot exercise real Windows filesystem/process behavior; closing this needs a live Windows run, tracked as a todo (see below)"

duration: 63min
completed: 2026-09-06
status: complete
---

# Phase 83 Plan 01: Node.js Download Pipeline Regression Coverage Summary

**Extracted the Node.js download/verify/extract/install/cache pipeline into a plain-Java `NodeInstallPipeline` seam that plain JUnit 5 now drives end to end on both platform branches against four committed fixture archives, fixing the 79-REVIEW symlink-following delete bug along the way.**

## Performance

- **Duration:** 63 min
- **Started:** 2026-09-06T06:56:00Z (approx.)
- **Completed:** 2026-09-06T07:59:00Z
- **Tasks:** 3
- **Files modified/created:** 12 (7 code files, 5 fixture/README files)

## Accomplishments

- `NodeInstallPipeline` — a plain-Java seam with `Target`, `Fetcher`, `Progress`, `CancelProbe` injected, so URL/archive-name assembly, fetch, digest verify, zip/tar extraction, install, digest record, cache-hit and cleanup are all executed by real tests rather than asserted as source text.
- Both platform branches proven on one Linux container: the Windows branch (zip, `node.exe`, no executable bit) and the Unix branch (real `tar`, `bin/node`, executable bit set), plus all six platform/architecture archive names checked against `NodeArchiveVerifier`'s pinned digest table.
- Failure paths covered: digest mismatch short-circuits before extraction, a missing binary in either archive format fails with an actionable message, cancellation before extraction and before installation both clean up completely, and a re-install over an existing binary replaces it and re-records the digest.
- The 79-REVIEW IN-03 symlink-following delete bug fixed: `deleteRecursively` now uses `Files.walkFileTree` with no file-visit option, proven by a regression test that plants a link aimed at an outside directory and asserts the directory survives.
- `DownloadCompletions.dispatch` extracted as a plain-Java drain-dispatch helper, isolating a throwing UI-refresh completion from the others still waiting; wired into `BbjNodeDownloader`'s background task.
- Thirteen pre-existing downloader source guards accounted for: nine moved (unweakened) into the new `NodeInstallPipelineSourceGuardTest`, scoped to method-body windows; four adapter-only guards rewritten to describe the thinned adapter; two new guards added (tar argv shape, production-collaborator wiring).

## Task Commits

Each task was committed atomically, plus two follow-up fix commits for issues this plan's own mutation-testing and acceptance-criteria review surfaced:

1. **Task 1: One fixture, one pipeline, one green end-to-end install — the Windows branch** - `dcc00927` (feat)
2. **Task 2: The rest of the matrix — Unix branch, six URLs, failure paths, cancel, re-install, and the symlink cleanup fix** - `aa1970d5` (test)
3. **Task 3: Drain dispatch, the adapter guards, one mutation per new class, and the coverage map** - `5fd3caa7` (feat)
4. **Fix: pin fixture digests as literals** - `11e763b3` (fix)
5. **Fix: scope the digest-matrix guard to a body window** - `39efcaaf` (fix)

**Plan metadata:** committed alongside this SUMMARY.

## Files Created/Modified

- `bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/NodeInstallPipeline.java` — the pipeline seam (new)
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/DownloadCompletions.java` — drain-dispatch helper (new)
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjNodeDownloader.java` — thinned to guard, background task, notifications, production-collaborator wiring
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/NodeInstallPipelineTest.java` — behavioral coverage of the whole pipeline (new)
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/NodeInstallPipelineSourceGuardTest.java` — scoped structural guards for the seam (new)
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/DownloadCompletionsTest.java` — behavioral coverage of drain dispatch (new)
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/BbjNodeDownloaderSourceGuardTest.java` — rewritten to cover only what remains in the adapter
- `bbj-intellij/src/test/resources/node-fixtures/{README.md,fake-node-win.zip,fake-node-win-no-binary.zip,fake-node-unix.tar.gz,fake-node-unix-no-binary.tar.gz}` — committed fixtures + provenance (new)

## Decisions Made

- **Fixture digests are literals, never test-computed.** Caught during acceptance-criteria review: the first draft of `NodeInstallPipelineTest` computed each pin by hashing the fixture file at test time — the same bytes `NodeArchiveVerifier.verify` reads — which makes the verify step vacuous (a corrupted fixture and its "pin" would always agree). Fixed by transcribing each digest from the fixtures README as a literal constant, matching the plan's own flagged assumption #2.
- **`NodeInstallPipeline.productionPipeline()` sources its `ProgressIndicator` ambiently** via `ProgressManager.getInstance().getProgressIndicator()` inside the fetcher lambda, rather than taking an indicator parameter. This keeps the factory genuinely zero-argument (matching the plan's literal `productionPipeline()` call sites) while still letting `HttpRequests.saveToFile` honor mid-download cancellation from the real running task.
- **The recursive delete swallows its own `IOException`** in a `deleteRecursivelyQuietly` wrapper around the public `deleteRecursively`, matching the original adapter's silent-best-effort cleanup semantics (the old `File.delete()` calls ignored their boolean return).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixture digests computed at test time instead of pinned as literals**
- **Found during:** Task 3's mutation-testing step, while verifying the "swap verify and extract" mutation actually turns a test red
- **Issue:** `NodeInstallPipelineTest` called a `realSha256(fixture)` helper to compute each `FixedDigestSource` pin from the same fixture file `NodeArchiveVerifier.REAL_FILES` reads during verification. This makes the digest check vacuous — a corrupted fixture and its "pin" are always computed from the same (possibly-corrupted) bytes, so verification can never observe a mismatch that matters. It directly contradicted the plan's flagged assumption #2, which requires a hand-transcribed literal pin.
- **Fix:** Replaced every trust-anchor pin with a literal SHA-256 string copied from the fixtures README (`WINDOWS_FIXTURE_DIGEST`, `UNIX_FIXTURE_DIGEST`, `WINDOWS_NO_BINARY_FIXTURE_DIGEST`, `UNIX_NO_BINARY_FIXTURE_DIGEST`). Removed the now-fully-unused `realSha256` helper and its dedicated imports.
- **Files modified:** `bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/NodeInstallPipelineTest.java`
- **Verification:** Whole module suite re-run green (432 tests, 0 failures) after the fix.
- **Committed in:** `11e763b3`

**2. [Rule 1 - Bug] A guard test's whole-file text search violated its own class's window contract**
- **Found during:** Final acceptance-criteria review of Task 2's `NodeInstallPipelineSourceGuardTest`
- **Issue:** The acceptance criterion "every assertion in the class operates on a window rather than on the whole file text" was violated by `everyPlatformAndArchitectureTheFileCanProduceHasAPinnedDigest`, which searched `readGuardedSource()`'s whole-file text for `NODE_VERSION = "` directly instead of going through the `bodyOf` window helper every other test in the class uses.
- **Fix:** Scoped the search to the class body window (`bodyOf(text, "public final class NodeInstallPipeline")`).
- **Files modified:** `bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/NodeInstallPipelineSourceGuardTest.java`
- **Verification:** `NodeInstallPipelineSourceGuardTest` re-run green (9 tests, 0 failures); whole module suite re-run green.
- **Committed in:** `39efcaaf`

**3. [Rule 1 - Bug] Pre-existing planning-identifier text in files this plan touched**
- **Found during:** Source-hygiene grep before each commit
- **Issue:** Two pieces of pre-existing text (from earlier phases, already on `main` before this plan started) matched the planning-identifier pattern once this plan's edits brought the surrounding file into scope: a test method name/message referencing "plan 79-01" in `BbjNodeDownloaderSourceGuardTest.java`, and two javadoc references to `(D-14)`/`(D-15)` in `BbjNodeDownloader.java`'s `downloadNodeAsync` doc comment.
- **Fix:** Reworded both in plain prose (`theRestartRedirectSurvives`, and dropped the parenthetical decision-id references from the javadoc) without changing their technical meaning.
- **Files modified:** `bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/BbjNodeDownloaderSourceGuardTest.java`, `bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjNodeDownloader.java`
- **Verification:** Source-hygiene grep clean on every touched file; whole module suite green.
- **Committed in:** `dcc00927` (BbjNodeDownloader.java doc reword, part of Task 3's commit `5fd3caa7`), `aa1970d5` (BbjNodeDownloaderSourceGuardTest.java reword, part of Task 2's commit)

---

**Total deviations:** 3 auto-fixed (2 test-correctness bugs found via this plan's own mutation-testing/acceptance-criteria discipline, 1 pre-existing source-hygiene cleanup)
**Impact:** All three fixes strengthen the very coverage this plan exists to add; no scope creep, no architectural change.

## Mutation Testing (D-16, C-02)

One red/green mutation cycle recorded for each new test class, mutation never committed (confirmed with `git status --short -- bbj-intellij` clean before each stage):

### 1. `NodeInstallPipelineTest`

- **Mutation applied:** Swapped the verify and extract steps in `NodeInstallPipeline.install` (extraction ran before digest verification).
- **First result — a genuine coverage gap:** No test went red. Every existing assertion checks *end state* (nothing installed, temp root empty), and the `finally` cleanup erases the extraction directory on every path regardless of step order, so the wrong ordering was invisible to the existing suite. This gap was fixed in-phase (see Deviation #1 above is unrelated; this is Deviation-adjacent but tracked separately as a new test, not a bug fix) by adding `verificationReadsTheArchiveBeforeAnyExtractionDirectoryExistsUnderTheTemporaryRoot`, which wraps the `ByteSource` to record how many entries the temporary root holds the first time verification reads the archive.
- **Second result — the mutation now goes red:** `verificationReadsTheArchiveBeforeAnyExtractionDirectoryExistsUnderTheTemporaryRoot` failed with:
  `expected: <1> but was: <2>`
- **Reverted; re-run confirmed green** (6 tests, 0 failures in the outer class).

### 2. `NodeInstallPipelineSourceGuardTest`

- **Mutation applied:** Deleted the `"--strip-components=1"` argument from the tar argv in `NodeInstallPipeline.extractTarGz`.
- **Result:** `theTarArgvIsExactlyTarXzfArchivePathDashCDestinationPathStripComponentsOne()` failed with:
  `"--strip-components=1" is not present inside extractTarGz(...) ==> expected: <true> but was: <false>`
- **Reverted; re-run confirmed green** (9 tests, 0 failures).

### 3. `DownloadCompletionsTest`

- **Mutation applied:** Made `DownloadCompletions.dispatch` return after the first successfully-dispatched element.
- **Result:** 3 of 4 tests went red; `everyDrainedCompletionReachesTheUiExecutorExactlyOnceInAttachmentOrder()` failed with:
  `the executor must receive exactly these three, in order ==> expected: <[...three recording completions...]> but was: <[...one...]>`
- **Reverted; re-run confirmed green** (4 tests, 0 failures).

## Coverage Map (#569 closure evidence, D-18)

One row per Node-pipeline acceptance criterion, naming the test class and method(s) that execute it. This table is the material for the eventual closing comment on issue #569 — posting that comment is a follow-up this plan prepares but does not run.

| Criterion | Test class | Test method(s) |
|---|---|---|
| URL + archive-name assembly (Windows) | `NodeInstallPipelineTest` | `theWindowsBranchRunsTheWholeNodeDownloadExtractAndCachePipelineEndToEnd` |
| URL + archive-name assembly (all six platform/arch pairs) | `NodeInstallPipelineTest.PlatformAxis` | `everyPlatformAndArchitecturePairAssemblesAnArchiveNameThatHasAPinnedDigest` |
| Fetch (no network socket) | `NodeInstallPipelineTest` | `theFakeFetcherProvesNoSocketIsOpened` |
| Digest verify (success) | `NodeInstallPipelineTest` | `theWindowsBranchRunsTheWholeNodeDownloadExtractAndCachePipelineEndToEnd` |
| Digest verify (failure short-circuits before extraction) | `NodeInstallPipelineTest.FailureAxis` | `aDigestMismatchStopsThePipelineBeforeExtraction` |
| Digest verify (reads archive before extraction directory exists) | `NodeInstallPipelineTest` | `verificationReadsTheArchiveBeforeAnyExtractionDirectoryExistsUnderTheTemporaryRoot` |
| Digest verify (structural: precedes extract/install call sites) | `NodeInstallPipelineSourceGuardTest` | `verificationPrecedesTheExtractionCallInsideInstall`, `verificationPrecedesTheInstallCallInsideInstall` |
| Zip extraction (Windows, decoy entry skipped) | `NodeInstallPipelineTest` | `theWindowsBranchRunsTheWholeNodeDownloadExtractAndCachePipelineEndToEnd` |
| Tar extraction (Unix, real `tar` process) | `NodeInstallPipelineTest.PlatformAxis` | `theUnixBranchExtractsBinNodeThroughTheRealTarAndSetsTheExecutableBit` |
| Tar extraction (argv shape) | `NodeInstallPipelineSourceGuardTest` | `theTarArgvIsExactlyTarXzfArchivePathDashCDestinationPathStripComponentsOne` |
| Install (missing binary, both branches) | `NodeInstallPipelineTest.FailureAxis` | `anArchiveWithNoNodeBinaryFailsInstallAndCleansUpOnWindows`, `anArchiveWithNoNodeBinaryFailsInstallAndCleansUpOnUnix` |
| Install (re-install replaces existing binary) | `NodeInstallPipelineTest.FailureAxis` | `aReinstallOverAnExistingBinaryReplacesItAndRerecordsTheDigest` |
| Executable bit (Windows: never set) | `NodeInstallPipelineTest` | `theWindowsBranchNeverSetsTheExecutableBit` |
| Executable bit (Unix: set) | `NodeInstallPipelineTest.PlatformAxis` | `theUnixBranchExtractsBinNodeThroughTheRealTarAndSetsTheExecutableBit` |
| Digest record (sidecar written) | `NodeInstallPipelineTest` | `theWindowsBranchRunsTheWholeNodeDownloadExtractAndCachePipelineEndToEnd` |
| Digest record (structural: after the copy) | `NodeInstallPipelineSourceGuardTest` | `theInstalledDigestIsRecordedAfterTheCopyInsideTheInstallStep` |
| Cache-hit composition (hit after install) | `NodeInstallPipelineTest` | `aCacheHitAfterAnInstallReturnsTheInstalledPathAndSpawnsNoSecondInstall` |
| Cache-hit composition (three-condition breakdown) | `NodeInstallPipelineTest.FailureAxis` | `theCacheHitDecisionNeedsAllThreeConditions` |
| Cache-hit composition (structural) | `NodeInstallPipelineSourceGuardTest` | `theCacheHitPathConsultsTheRecordedDigestBeforeReturningInsideCachedNodePath` |
| Temp-file lifecycle (success path) | `NodeInstallPipelineTest` | `theWindowsBranchLeavesNoTemporaryArchiveOrExtractionDirectoryBehind` |
| Temp-file/dir lifecycle (verify failure, missing binary, cancel) | `NodeInstallPipelineTest.FailureAxis` | `aDigestMismatchStopsThePipelineBeforeExtraction`, `anArchiveWithNoNodeBinaryFailsInstallAndCleansUpOnWindows`, `anArchiveWithNoNodeBinaryFailsInstallAndCleansUpOnUnix`, `aCancelSignalledBeforeExtractionStopsThePipelineAndCleansUp`, `aCancelSignalledBeforeInstallationStopsThePipelineAndCleansUp` |
| Temp-directory cleanup (structural: no file-visit option) | `NodeInstallPipelineSourceGuardTest` | `theRecursiveDeletePassesNoFileVisitOptionInsideDeleteRecursively` |
| Symlink cleanup (79-REVIEW IN-03 fix) | `NodeInstallPipelineTest.FailureAxis` | `cleanupDeletesASymbolicLinkAndNeverTheFileItPointsAt` |
| Drain dispatch (behavioral: exactly-once, order, isolation, empty, null-skip) | `DownloadCompletionsTest` | all four tests |
| Drain dispatch (adapter wiring) | `BbjNodeDownloaderSourceGuardTest` | `drainedCompletionsAreDispatchedThroughDownloadCompletionsExactlyOnce` |

**Windows-reproducibility statement (D-06):** None of the Windows-branch tests reproduced the 80-UAT auto-install failure from the pipeline logic alone — every Windows-target case (end-to-end install, no-temp-leftover, no-executable-bit, no-network-socket, cache-hit, six-name matrix, digest-mismatch, missing-binary, cancel-before-extraction, cancel-before-installation) passed against the correctly-ordered pipeline on this Linux container. A todo has been filed (`.planning/todos/pending/2026-09-06-live-windows-check-for-node-auto-install-failure.md`) asking for a live Windows check capturing `idea.log` and the contents of `bbj-intellij-data/nodejs`.

## Issues Encountered

- **Environment note (not a plan defect):** This session's local `main` runs well ahead of `origin/main` (many prior phases' work is unpushed). The plan's literal Task 3 register-check verify command (`git diff origin/main ...`) surfaces dozens of pre-existing `D-xx`/`CR-xx` references from earlier, already-landed phases that have nothing to do with this plan. The register-check was instead run against this plan's own starting commit (`56c07808`, the tip immediately before Task 1's first commit) to get a signal scoped to this plan's actual diff — clean in both directions once the pre-existing hits described in Deviation #3 were reworded.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `NodeInstallPipeline` and `DownloadCompletions` are now available as reusable seams; 83-02 and 83-03 own disjoint files (Settings failure path / `NodeAvailability`, and LSP4IJ coupling canaries respectively) and can proceed in parallel with this plan's work already landed.
- The live-Windows UAT item above is the one open item this plan could not close from a Linux container; tracked as a todo, not a blocker for this plan's own completion.
- Whole IntelliJ module suite: 432 tests, 0 failures, 0 ignored at the final commit.

---
*Phase: 83-regression-test-hardening*
*Completed: 2026-09-06*

## Self-Check: PASSED

All key files confirmed present on disk; all five task/fix commit hashes confirmed in `git log`.
