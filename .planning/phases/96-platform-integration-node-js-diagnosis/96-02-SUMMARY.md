---
phase: 96-platform-integration-node-js-diagnosis
plan: 02
subsystem: infra
tags: [intellij, textmate, plugin-data-dir, cleanup]

# Dependency graph
requires:
  - phase: 96 (prior plan 96-01)
    provides: 96-01 deleted BbjColorSettingsPage; unrelated file, no functional dependency
provides:
  - "A stable, versioned TextMate bundle cache directory that survives across IDE launches instead of a fresh temp directory + 5-file copy every time"
  - "A scoped, best-effort sweep of the textmate-bbj* temp directories earlier launches abandoned"
affects: [97-release, any future PLAT-01 (#613) follow-up]

# Actuals (#2632) — pairs with the plan's estimate to calibrate future estimates.
actuals:
  tokens: 5819
  tasks: 3
  commits: 2
patterns-established: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Platform-free cache-decision seam (TextMateBundleCache) with zero com.intellij imports, tested by plain JUnit 5 with @TempDir"
    - "Write-ordering-as-concurrency-safety: bundle files copied first, version marker written last"
    - "Scoped best-effort directory sweep reusing NodeInstallPipeline.deleteRecursively, logged-and-stepped-over per-entry failures"

key-files:
  created:
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/TextMateBundleCache.java
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/TextMateBundleCacheTest.java
  modified:
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjTextMateBundleProvider.java

key-decisions:
  - "Task 2 blocking-human gate: sweep-scoped selected (of sweep-scoped / sweep-none / sweep-logged)"
  - "Invalidation key is plugin version, not a per-file content digest (96-RESEARCH.md A4)"
  - "No file lock added for the cross-process race; write ordering (files first, marker last) is the sole concurrency-safety mechanism (96-RESEARCH.md recommendation)"

requirements-completed: [PLAT-01]

coverage:
  - id: D1
    description: "A second IDE launch at the same plugin version reuses the stable bundle directory and opens zero bundle resources, instead of allocating a fresh temp directory and re-copying all five files"
    requirement: "PLAT-01"
    verification:
      - kind: unit
        ref: "TextMateBundleCacheTest#populateThenIsPopulatedForReturnsTrueAndASecondRunOpensNothing"
        status: pass
    human_judgment: false
  - id: D2
    description: "Directories abandoned by earlier launches under the plugin's own textmate-bbj prefix, directly beneath the IDE's own config-scoped temp path, are removed; anything outside that scope (non-matching names, plain files, nested matches, symlink targets) is left untouched, and a per-entry delete failure is logged and stepped over rather than thrown"
    requirement: "PLAT-01"
    verification:
      - kind: unit
        ref: "TextMateBundleCacheTest#sweepAbandonedRemovesOnlyDirectMatchingChildDirectories"
        status: pass
      - kind: unit
        ref: "TextMateBundleCacheTest#sweepAbandonedNeverRemovesAPlainFileEvenIfItsNameMatches"
        status: pass
      - kind: unit
        ref: "TextMateBundleCacheTest#sweepAbandonedNeverReachesADirectoryNestedBelowADirectChild"
        status: pass
      - kind: unit
        ref: "TextMateBundleCacheTest#sweepAbandonedWithABlankPrefixActsOnNothing"
        status: pass
      - kind: unit
        ref: "TextMateBundleCacheTest#sweepAbandonedOnAMissingRootReturnsZeroWithoutThrowing"
        status: pass
      - kind: unit
        ref: "TextMateBundleCacheTest#sweepAbandonedDeletesASymbolicLinkAndNeverTheFileItPointsAt"
        status: pass
    human_judgment: false
  - id: D3
    description: "After two launches of the installed plugin, syntax highlighting still works and bbj-intellij-data/textmate holds the five bundle files plus one marker"
    verification: []
    human_judgment: true
    rationale: "Requires a running installed IDE across two real launches — harvested at end of phase per the plan's own <verification> note, not provable by a unit test in this plan"

# Metrics
duration: ~20min (this continuation; Task 1 ran to completion in a prior agent session)
completed: 2026-09-20
status: complete
---

# Phase 96 Plan 02: TextMate Bundle Caching & Sweep Summary

**Stable `bbj-intellij-data/textmate` cache directory replaces the per-launch temp-dir copy, with a scoped sweep of the `textmate-bbj*` directories earlier launches abandoned.**

## Performance

- **Duration:** Task 1 (stable cache seam) ran in a prior agent session; this continuation covered the Task 2 decision recording and Task 3 implementation in ~20 min.
- **Completed:** 2026-09-20T01:49:52Z
- **Tasks:** 3 (Task 1 verified as already committed; Task 2 decision recorded; Task 3 implemented)
- **Files modified:** 3 (`TextMateBundleCache.java`, `BbjTextMateBundleProvider.java`, `TextMateBundleCacheTest.java`)

## Accomplishments

- `TextMateBundleCache` (platform-free, zero `com.intellij` imports) holds the whole cache decision: `isPopulatedFor`, `populate`, and now `sweepAbandoned` — all driven by plain JUnit 5 with `@TempDir`.
- `BbjTextMateBundleProvider.getBundles()` is a thin wrapper: resolves the stable directory and the running plugin version, skips the copy loop on a cache hit, and — only after the stable directory is confirmed populated — sweeps abandoned `textmate-bbj*` temp directories.
- The sweep is bounded four ways per the Task 2 decision: direct children only (no recursive search for matches), directories only, name-prefix match against the plugin's own `textmate-bbj` literal, and a blank/null prefix matching nothing. It reuses the already symlink-safe `NodeInstallPipeline.deleteRecursively` rather than a second hand-rolled walker.
- 15 tests in `TextMateBundleCacheTest` (9 from Task 1, 6 new for the sweep) prove both the cache-hit/miss/ordering behaviour and the sweep's blast radius, including that a symlink inside a swept directory is removed as a link while the file it points at (created outside the temp root) survives.
- Whole IntelliJ suite green under `./gradlew test --rerun-tasks`: 1055 tests, 0 failures, 0 errors — no `UP-TO-DATE` shortcut masking a stale green.

## Task Commits

Each task was committed atomically:

1. **Task 1: One launch populates, the next launch copies nothing — the stable directory end to end** - `f2b6c99d` (feat) — completed and committed in a prior agent session; verified present at the start of this continuation (zero `com.intellij` imports in `TextMateBundleCache.java`, `MARKER_FILE_NAME` defined, no uncommitted source changes).
2. **Task 2: Decide whether to sweep the TextMate bundle directories earlier launches abandoned** - checkpoint:decision, no code change. Resolved by a human at the blocking-human gate: **`sweep-scoped`** selected (of `sweep-scoped` / `sweep-none` / `sweep-logged`). No commit — recorded here and carried into Task 3.
3. **Task 3: Carry out the sweep decision and prove its blast radius is bounded** - `1134624c` (feat)

**Plan metadata:** commit pending (this SUMMARY + STATE/ROADMAP/REQUIREMENTS updates)

## Files Created/Modified

- `bbj-intellij/src/main/java/com/basis/bbj/intellij/TextMateBundleCache.java` — platform-free cache seam: marker read (`isPopulatedFor`), ordered populate (`populate`), and the new scoped sweep (`sweepAbandoned`)
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjTextMateBundleProvider.java` — thin wrapper resolving the stable directory + plugin version, calling the sweep only after a confirmed-populated cache, guarded so a sweep failure can never block bundle registration
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/TextMateBundleCacheTest.java` — `@TempDir`-driven coverage: cache hit/miss/ordering (Task 1) plus the sweep's blast-radius proofs (Task 3)

## Decisions Made

**Task 2 decision (blocking-human gate, resolved by a human — not auto-approved and not re-litigated here):** `sweep-scoped`.

- **Context:** PLAT-01's requirement text asks for abandoned directories to be "cleaned up." Research (96-RESEARCH.md assumption A2) verified the literal `textmate-bbj` prefix is unique within this repository and that `PathManager.getTempPath()` is IDE-config-scoped (not the machine-wide OS temp dir), but could NOT verify that no other plugin installed in the same IDE ever uses the identical prefix — a platform guarantee is impossible to obtain, only an observation about this codebase.
- **Options considered:** `sweep-scoped` (recommended — closes PLAT-01 as written, tightly bounded), `sweep-none` (zero risk, leaves the cleanup clause unmet), `sweep-logged` (report-only, still leaves the clause unmet).
- **Selected:** `sweep-scoped`. Implemented in Task 3 exactly to the scoping the gate specified: direct children only, directories only, plugin's own prefix, only after the new stable directory is confirmed populated, every delete failure logged and stepped over, never thrown.
- **Reasoning carried forward:** the sweep closes ROADMAP criterion 1's cleanup clause and PLAT-01 in full. Its residual risk (an unrelated plugin sharing the exact `textmate-bbj` prefix in the same IDE) is accepted as bounded by the prefix's specificity and the config-scoped (not machine-wide) temp path, per the gate's own stated reasoning.

**Other decisions carried from Task 1 (already committed, restated here for completeness):**
- Invalidation key is plugin version (via `PluginManager.getInstance().findEnabledPlugin(...)`), not a per-file content digest — the five bundle files are packaged JAR resources immutable except on plugin upgrade (96-RESEARCH.md A4, confirmed via `build.gradle.kts`'s `copyTextMateBundle` task).
- No file lock for the cross-process race case (two `./gradlew runIde` invocations sharing one sandbox). Write ordering (bundle files copied first, version marker written last) makes every interleaving benign — a double-copy writes identical bytes from the same immutable JAR resource, and no reader can observe the marker before the files. Confirmed at Task 1: `NodeInstallPipeline.deleteRecursively` needed no widening — it was already `public static` (closing 96-RESEARCH.md Open Question 2).
- The plugin descriptor lookup (`PluginManager.getInstance().findEnabledPlugin(PluginId.getId("com.basis.bbj"))`) was not observed returning null in this session's test runs (development/test classloader behavior was not separately exercised beyond the unit tests' direct calls to `TextMateBundleCache` with explicit version strings, which bypass the descriptor lookup entirely). The `null`-version path is covered by `TextMateBundleCacheTest#nullPluginVersionIsNeverACacheHit` and `BbjTextMateBundleProvider.resolvePluginVersion()`'s explicit null-tolerant handling, so behavior is proven even though the descriptor itself was not observed absent live.

## Deviations from Plan

None - plan executed exactly as written. The Task 2 decision was supplied by the orchestrator/human at the blocking-human gate and implemented in Task 3 without modification.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- PLAT-01 (#613) is fully implemented: the reuse half (Task 1) and the cleanup half (Task 2/3) both close. The invalidation key, the concurrency argument, and the sweep decision are all written down here and in 96-RESEARCH.md.
- `BbjTextMateBundleProvider` no longer allocates a per-launch temp directory in any code path.
- ROADMAP criterion 1 is fully met (both the reuse clause and the cleanup clause), not recorded as partial.
- Whole IntelliJ suite green (1055 tests) under a forced re-run — no stale-green risk carried forward.
- Ready for the remaining Phase 96 plans (PLAT-02 through PLAT-06 and the Windows attestation, per 96-CONTEXT.md).

---
*Phase: 96-platform-integration-node-js-diagnosis*
*Completed: 2026-09-20*

## Self-Check: PASSED

- `TextMateBundleCache.java` — FOUND on disk
- `BbjTextMateBundleProvider.java` — FOUND on disk
- `TextMateBundleCacheTest.java` — FOUND on disk
- `96-02-SUMMARY.md` — FOUND on disk
- Commit `f2b6c99d` (Task 1) — FOUND in `git log --oneline --all`
- Commit `1134624c` (Task 3) — FOUND in `git log --oneline --all`
- All `<acceptance_criteria>` for Task 1 and Task 3 re-verified: platform-free class, zero `com.intellij` in `TextMateBundleCache.java`, no `createTempDirectory`/`getTempPath` in the provider, `bbj-intellij-data` literal present, no static mutable field, counting-opener zero-resources proof, torn-populate-leaves-no-marker proof, sweep scoping proofs (direct children only, directories only, prefix match, blank-prefix no-op, missing-root no-op, symlink safety) — all PASS.
- Plan-level `<verification>`: `TextMateBundleCacheTest` green (15/15), `./gradlew test --rerun-tasks` green (1055 tests, 0 failures, 0 errors, no UP-TO-DATE shortcut on `:test`), `NodeInstallPipelineSourceGuardTest` unmodified and passing.
- No `D-NN`/plan-number/`C-`/`CR-`/`PLAT-` planning identifier found in any `.java` file touched by this plan (`grep -nE` scan returned no matches).
