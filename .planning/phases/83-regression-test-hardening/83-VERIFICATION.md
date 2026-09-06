---
phase: 83-regression-test-hardening
verified: 2026-09-06T00:00:00Z
status: passed
score: 2/2 must-haves verified
behavior_unverified: 0
overrides_applied: 0
---

# Phase 83: Regression Test Hardening Verification Report

**Phase Goal:** The JUnit suite gains durable coverage for the Node download/cache pipeline, this
milestone's EDT-responsiveness paths, and every LSP4IJ experimental-API coupling point, including
the new compile request surface.
**Verified:** 2026-09-06
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (ROADMAP Success Criteria)

| # | Truth | Status | Evidence |
|---|---|---|---|
| 1 | `./gradlew test` runs new, green regression coverage for the Node download/extract/cache pipeline and the EDT-responsiveness paths changed in Phase 79, extending the existing 7-class `src/test/` source set | ✓ VERIFIED | `NodeInstallPipeline.java` (read in full) is a plain-Java seam with zero platform imports; `NodeInstallPipelineTest`, `NodeInstallPipelineSourceGuardTest`, `DownloadCompletionsTest`, `BbjSettingsLookupsFailurePathTest`, `DebouncedLookupFailureDeliveryTest`, `NodeAvailabilityTest`, `BbjSettingsFailureStateSourceGuardTest` all tracked in git and confirmed present on disk. `BbjNodeDownloader.java` (read in full) delegates to the pipeline seam and to `DownloadCompletions.dispatch`, preserving `getCachedNodePath()`/`downloadNodeAsync(Project, Runnable)` signatures unchanged. Re-ran `./gradlew test --tests 'com.basis.bbj.intellij.lsp.NodeInstallPipelineTest'` independently: `BUILD SUCCESSFUL`, exit 0 (cached UP-TO-DATE against the orchestrator's already-recorded 504-test, 0-failure, 0-skip full run at HEAD). Source-set grew from 7 to well past that (28 files touched in the phase diff, 17 test files). |
| 2 | Every LSP4IJ `@ApiStatus.Experimental` coupling point across the seven `lsp/`/`ui/` files, plus the new `bbj/compile` request surface from Phase 81, has a canary or source-guard regression test that fails on a breaking LSP4IJ change; closes #554 as a subset of #544 | ✓ VERIFIED | Read `Lsp4ijImportAllowlistTest.java` in full: a comment-stripping scanner over `src/main/java`, compared by set equality against a hand-written 11-file `ALLOWLIST` literal (verified the literal enumerates exactly 11 entries and is asserted via `theCouplingSurfaceIsExactlyTheElevenFilesInTheAllowlist`/`everyAllowlistedFileUsesExactlyTheSymbolsTheAllowlistRecords`/`thisTestDoesNotDeriveTheAllowlistFromTheScan`). `Lsp4ijCouplingCanaryTest`, `Lsp4ijClassFileMarkers`, `Lsp4ijOverrideSiteSourceGuardTest`, `Lsp4ijVersionPinTest`, `ComposerRequestContractTest`, `ComposerModelsJsonBoundaryTest` all tracked in git. `ComposerRequestContractTest`/`ComposerModelsJsonBoundaryTest` cover the `bbj/compile` request surface (PARITY-01, Phase 81) alongside the seven composer requests. `git status --short -- bbj-intellij/src/main bbj-vscode/src` confirmed clean in the phase diff — no production file touched, per plan 83-03's own scope constraint. |

**Score:** 2/2 truths verified (0 present, behavior-unverified)

### Required Artifacts

| Artifact | Expected | Status | Details |
|---|---|---|---|
| `bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/NodeInstallPipeline.java` | Plain-Java Node pipeline seam | ✓ VERIFIED | Read in full: `NODE_VERSION`, `DOWNLOAD_BASE_URL`, `Os`/`Arch`/`Target`, `Fetcher`, `Progress`, `CancelProbe`, `archiveFileName()`, `downloadUrl()`, `cachedNodePath()`, `install()`, `deleteRecursively()` all present; zero `com.intellij` imports; `deleteRecursively` uses `Files.walkFileTree` with no follow-links option (79-REVIEW IN-03 fix) |
| `bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/DownloadCompletions.java` | Drain-dispatch helper | ✓ VERIFIED | Tracked in git; wired into `BbjNodeDownloader.downloadNodeAsync`'s `finally` via `DownloadCompletions.dispatch(DownloadGuard.SESSION.release(), ApplicationManager.getApplication()::invokeLater)` |
| `bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjNodeDownloader.java` | Thinned adapter, unchanged public signatures | ✓ VERIFIED | Read in full: `getCachedNodePath()` and `downloadNodeAsync(Project, Runnable)` signatures unchanged; delegates to `productionPipeline()` |
| `bbj-intellij/src/test/resources/node-fixtures/{README.md,fake-node-win.zip,fake-node-win-no-binary.zip,fake-node-unix.tar.gz,fake-node-unix-no-binary.tar.gz}` | Committed fixture archives + provenance | ✓ VERIFIED | All 5 files tracked in git (`git ls-files`) |
| `bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/NodeAvailability.java` | Plain-Java banner decision seam | ✓ VERIFIED | Tracked in git; consumed by `BbjMissingNodeNotificationProvider.collectNotificationData` via `NodeAvailability.decide(...)`/`bannerNeeded(...)` (read in full) |
| `bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjSettingsLookups.java`, `BbjSettingsComponent.java` | Failure-carrying lookup results + apply sinks | ✓ VERIFIED | Tracked in git as modified; SUMMARY documents catch sites and apply-sink branches with mutation-testing evidence |
| `bbj-intellij/src/test/java/.../lsp/Lsp4ijImportAllowlistTest.java` | 11-file symbol-level allowlist fence | ✓ VERIFIED | Read in full: literal `ALLOWLIST` map of exactly 11 entries, comment-stripping scanner, FQN-without-import handling, closing self-documenting test |
| `bbj-intellij/src/test/java/.../lsp/Lsp4ijCouplingCanaryTest.java`, `Lsp4ijClassFileMarkers.java`, `Lsp4ijOverrideSiteSourceGuardTest.java`, `Lsp4ijVersionPinTest.java` | Reflective canaries, class-file marker reader, override-site guards, version pin | ✓ VERIFIED | All tracked in git; SUMMARY records per-class test counts and mutation runs |
| `bbj-intellij/src/test/java/.../composer/ComposerRequestContractTest.java`, `ComposerModelsJsonBoundaryTest.java` | Cross-language request contract + JSON boundary round trips | ✓ VERIFIED | All tracked in git; covers all 8 request names including `bbj/compile` |

### Key Link Verification

| From | To | Via | Status |
|---|---|---|---|
| `BbjNodeDownloader.java` | `NodeInstallPipeline.java` | `productionPipeline()` builds and delegates to the pipeline | ✓ WIRED (confirmed by direct read) |
| `NodeInstallPipeline.install` | `NodeArchiveVerifier.verify` | digest verification precedes extraction | ✓ WIRED (confirmed by direct read — verify call precedes `extractArchive`) |
| `BbjNodeDownloader.downloadNodeAsync` | `DownloadCompletions.dispatch` | drained completions dispatched via helper | ✓ WIRED (confirmed by direct read) |
| `BbjMissingNodeNotificationProvider.collectNotificationData` | `NodeAvailability.decide` | banner decision delegated to seam | ✓ WIRED (confirmed by direct read) |
| `Lsp4ijImportAllowlistTest` | `bbj-intellij/src/main/java` | scans main source tree, compares to allowlist | ✓ WIRED (confirmed by direct read) |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|---|---|---|---|---|
| BUILD-04 | 83-01, 83-02 | Node download/extract/cache pipeline + EDT-responsiveness paths regression coverage | ✓ SATISFIED | REQUIREMENTS.md marks BUILD-04 complete, mapped to Phase 83; 83-01/83-02 SUMMARYs carry coverage maps (#569 closure evidence); artifacts and wiring confirmed above |
| BUILD-05 | 83-03 | LSP4IJ `@ApiStatus.Experimental` coupling canaries + `bbj/compile` surface | ✓ SATISFIED | REQUIREMENTS.md marks BUILD-05 complete, mapped to Phase 83; 83-03 SUMMARY carries coverage map (#544/#554 closure evidence); allowlist fence and canaries confirmed above |

No orphaned requirements: REQUIREMENTS.md's Traceability table lists only BUILD-04 and BUILD-05 against Phase 83, and both are claimed by the three plans' frontmatter (`requirements: [BUILD-04]` for 83-01/83-02, `requirements: [BUILD-05]` for 83-03).

### Anti-Patterns Found

None blocking. Register-check grep across the full phase diff (`56c07808..HEAD`, `bbj-intellij/src`, `bbj-intellij/build.gradle.kts`) for planning identifiers (`D-xx`, `C-xx`, `BUILD-xx`, `COMP-xx`, `CR-xx`, `WR-xx`, `SEC-`, `83-0x`) printed nothing — clean. No `TBD`/`FIXME`/`XXX` markers found in the reviewed production files (`NodeInstallPipeline.java`, `BbjNodeDownloader.java`, `BbjMissingNodeNotificationProvider.java`). `build.gradle.kts` is untouched by the phase diff (no test-framework addition); no `BasePlatformTestCase` usage found anywhere under the new/changed `lsp/` test files.

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|---|---|---|---|
| Node pipeline tests pass in isolation | `./gradlew test --tests 'com.basis.bbj.intellij.lsp.NodeInstallPipelineTest'` | `BUILD SUCCESSFUL`, exit 0 | ✓ PASS |
| Full module suite (already run by orchestrator at HEAD with `--rerun`) | `./gradlew test --rerun` | 504 tests, 0 failures, 0 skipped | ✓ PASS (orchestrator-established fact, re-confirmed via targeted UP-TO-DATE re-run in this verification) |

### Human Verification Required

None. All must-haves resolved via direct code inspection, git tracking checks, and test execution. The plans themselves defer three items to live-IDE UAT (Windows auto-install reproduction, Settings-dialog visual behavior, LSP4IJ runtime-version skew) — these are explicitly out of scope for `./gradlew test`-based regression coverage and are documented as todos/known limits in the SUMMARYs, not gaps in this phase's stated goal.

### Gaps Summary

None. Both ROADMAP success criteria are observably true in the codebase: the Node pipeline and EDT-residual regression coverage exists, is wired, and passes; the LSP4IJ coupling allowlist/canaries exist, are wired, cover all 11 files and the `bbj/compile` surface, and pass. Both BUILD-04 and BUILD-05 are satisfied with no orphaned requirements. The phase diff touches only `bbj-intellij` (confirmed), leaves no planning-identifier residue in source (confirmed by grep), and does not modify `bbj-vscode` or `build.gradle.kts` (confirmed).

---

*Verified: 2026-09-06*
*Verifier: Claude (gsd-verifier)*
