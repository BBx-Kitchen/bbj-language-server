---
phase: 95-java-interop-status-accuracy-widget-consolidation
plan: 03
subsystem: infra
tags: [intellij, java-interop, settings, source-guard, port-constant]

requires:
  - phase: 95-java-interop-status-accuracy-widget-consolidation
    provides: "95-02's poll-gating/status-accuracy work in BbjJavaInteropService (unrelated files, no overlap)"
provides:
  - "One canonical java-interop port constant (BbjInteropPortDetector.DEFAULT_PORT) with zero surviving raw-literal drift sites in src/main/java"
  - "A durable, falsification-proven source guard pinning that single-occurrence invariant"
affects: [96-node-runtime-platform-consolidation]

actuals:
  tokens: 6500
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "Source guard extension (add a method to an existing per-file guard test rather than creating a new guard file) when the guard already owns the reusable stripComments()/countOccurrences() helpers"

key-files:
  created: []
  modified:
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjSettings.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjSettingsComponent.java
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/EffectiveInteropPortSourceGuardTest.java

key-decisions:
  - "Closed #594 as done on the D-11 reasoning (BbjInteropPortDetector.DEFAULT_PORT stays the sole, com.intellij-free canonical constant) rather than introducing a second BbjSettings-owned constant, per the plan's explicit prohibition."
  - "Extended EffectiveInteropPortSourceGuardTest with a new method instead of creating a fourth guard file, reusing its existing stripComments()/countOccurrences()/readSource() helpers."
  - "Omitted D-xx/plan-number identifiers from the new test's comments per this plan's explicit instruction, using the GitHub issue number (#594) instead."

requirements-completed: [IOP-04]

coverage:
  - id: D1
    description: "BbjSettings.State.javaInteropPort, the port-field placeholder, and both getJavaInteropPort() fallbacks in BbjSettingsComponent now read BbjInteropPortDetector.DEFAULT_PORT instead of a raw 5008 literal, with no second named constant introduced and the numeric value unchanged."
    requirement: IOP-04
    verification:
      - kind: unit
        ref: "bbj-intellij/src/test/java/com/basis/bbj/intellij/InteropPortSettingsTest.java"
        status: pass
      - kind: unit
        ref: "bbj-intellij/src/test/java/com/basis/bbj/intellij/BbjInteropPortDetectorTest.java"
        status: pass
      - kind: unit
        ref: "bbj-intellij/src/test/java/com/basis/bbj/intellij/InteropPortPresentationTest.java"
        status: pass
      - kind: unit
        ref: "bbj-intellij/src/test/java/com/basis/bbj/intellij/BbjSettingsLoadStateTest.java"
        status: pass
    human_judgment: false
  - id: D2
    description: "A source guard pins the single surviving comment-stripped occurrence of the port literal tree-wide in src/main/java, proven by a deliberate falsification (observed red, then restored byte-identically and re-verified green)."
    requirement: IOP-04
    verification:
      - kind: unit
        ref: "bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/EffectiveInteropPortSourceGuardTest.java#exactlyOnePortLiteralSurvivesTreeWide"
        status: pass
    human_judgment: false

duration: 10min
completed: 2026-09-19
status: complete
---

# Phase 95 Plan 03: Java-Interop Port Constant Consolidation Summary

**Re-pointed the last three raw `5008` port literals at `BbjInteropPortDetector.DEFAULT_PORT` and pinned the result with a tree-wide, falsification-proven single-occurrence source guard, closing #594.**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-09-19T17:25:42Z (approx., following 95-02's completion)
- **Completed:** 2026-09-19T17:32:48Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- `BbjSettings.State.javaInteropPort`'s field initializer, `BbjSettingsComponent`'s port-field placeholder, and both `getJavaInteropPort()` fallbacks (empty-text and `NumberFormatException`) now read `BbjInteropPortDetector.DEFAULT_PORT` instead of the raw literal `5008`. No new import was needed in either file — both already live in `com.basis.bbj.intellij`, the detector's own package.
- No second named port constant was introduced anywhere in `src/main/java` — confirmed by grep and by the new guard. `DEFAULT_PORT` stays the sole, `com.intellij`-free canonical constant so the plain-JUnit-tested `InteropPortSettings` and `InteropPortPresentation` keep referencing it without pulling in a `PersistentStateComponent`.
- The numeric value stayed `5008` throughout — `InteropPortSettingsTest` and `BbjSettingsLoadStateTest` (the upgrade-inference and persisted-default behaviours) pass unchanged.
- `EffectiveInteropPortSourceGuardTest` gained `exactlyOnePortLiteralSurvivesTreeWide()`: it walks all of `src/main/java`, comment-strips each file, sums occurrences of `5008`, and asserts the total is exactly 1, that the sole occurrence's file path ends with `BbjInteropPortDetector.java`, and (an anti-vacuity control) that `BbjInteropPortDetector.java`'s own stripped source independently contains exactly 1 occurrence — guarding against an over-matching comment-stripping regex silently passing at zero.
- The new guard was proven to actually catch drift, not just assert quietly: a throwaway class carrying a raw `5008` literal was added to `BbjHomeDetector.java` (a file outside this plan's scope, chosen specifically so the falsification edit would not touch either re-pointed file), the guard was run and observed **RED** (failure at the tree-wide total-count assertion), the file was restored via `git checkout --` and its sha256 checksum confirmed byte-identical to the pre-edit checksum, and the guard was re-run and observed **GREEN**.

## Task Commits

Each task was committed atomically:

1. **Task 1: Re-point the last three raw port literals at the canonical constant** - `37a77f2a` (feat)
2. **Task 2: Pin the single surviving occurrence so the drift cannot return** - `cf09274c` (test)

**Plan metadata:** committed together with this SUMMARY (see below).

## Files Created/Modified
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjSettings.java` - `State.javaInteropPort`'s initializer re-pointed at `BbjInteropPortDetector.DEFAULT_PORT`; trailing comment reworded to name the shared constant instead of repeating the numeral.
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjSettingsComponent.java` - port-field placeholder and both `getJavaInteropPort()` fallbacks re-pointed; the `return null;` fallback's trailing comment (line 195, the 4th site RESEARCH.md's Pitfall 3 flagged as missing from CONTEXT.md's D-12 enumeration) reworded to drop its stale numeral.
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/EffectiveInteropPortSourceGuardTest.java` - extended with `exactlyOnePortLiteralSurvivesTreeWide()`, its supporting `MAIN_SOURCE_ROOT`/`BBJ_INTEROP_PORT_DETECTOR_SOURCE`/`PORT_LITERAL` fields, and the `Files.walk` tree-scan idiom (mirroring `Lsp4ijImportAllowlistTest`'s `scanMainSources()`).

## Decisions Made

- **#594 closed as done on the D-11 reasoning, not as partially implemented.** No `BbjSettings.DEFAULT_JAVA_INTEROP_PORT` was added despite the issue's literal wording — `BbjInteropPortDetector.DEFAULT_PORT` already is the de facto shared constant with three consumers and is deliberately `com.intellij`-free, so adding a second constant on `BbjSettings` would both recreate the exact drift #594 complains about and point the platform-free `InteropPortSettings`/`InteropPortPresentation` at a `PersistentStateComponent`. This follows the Phase 93 D-05 and Phase 94 D-05 precedent.
- **The guard extends the existing test rather than adding a fourth guard file.** `EffectiveInteropPortSourceGuardTest` already carries the `stripComments()`/`countOccurrences()`/`readSource()` helpers D-12 names as the copy target; extending in place avoided a fourth private copy of the same regex.
- **The falsification edit targeted a file outside this plan's scope** (`BbjHomeDetector.java`, not `BbjSettings.java`/`BbjSettingsComponent.java`) specifically so the throwaway edit-and-restore cycle could not be confused with — or accidentally leave residue in — either of the two files this plan's Task 1 legitimately modified.
- **No `D-xx`/plan-number identifier was placed in the new test's comments**, per this plan's explicit instruction; the GitHub issue number `#594` is used instead where a reference was warranted.

## Deviations from Plan

None - plan executed exactly as written. Both surviving literal sites (`BbjSettings.java:30`, `BbjSettingsComponent.java:189/461/466`) and the additional prose-only site RESEARCH.md flagged (`BbjSettingsComponent.java:195`) matched the plan's cited line numbers exactly on re-verification, confirming the prior-wave note that 95-01/95-02 did not touch these two files.

## Issues Encountered

None. One self-correction during execution, not a deviation from the plan's instructions but worth recording: the new guard's javadoc initially cited `D-12` and `95-RESEARCH.md` identifiers, which this plan's own action text explicitly forbids in `.java` files (`#594` only). Caught by grepping the diff before committing, per the plan's Task 2 instruction, and reworded before the commit — no functional change, no re-verification needed since only comment text changed after the last test run confirmed the code green.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- IOP-04 (#594) is closed. The java-interop port default now has exactly one definition, pinned by a guard proven to actually fail on drift.
- This was the last plan in Phase 95's IOP-04 line of work; Phase 95's remaining requirements (IOP-01/02/03/05) were addressed in 95-01 and 95-02.
- No blockers for Phase 96 (`node-runtime-platform-consolidation`). Note for Phase 96 discussion (carried from 95-CONTEXT.md, not new here): 95-01 edited `BbjJavaInteropNotificationProvider.java`, one of the three editor notification providers Phase 96's PLAT-03 (#622) consolidates — the ROADMAP's "file-disjoint" claim for Phase 96 is false, as already flagged.

## Self-Check: PASSED

Re-verified after the fact (no source re-touched, no test suite re-run — only existence/history
checks): this SUMMARY.md (`95-03-SUMMARY.md`) and both modified source files
(`BbjSettings.java`, `BbjSettingsComponent.java`) are present on disk. All three commit hashes
claimed above (`37a77f2a`, `cf09274c`, `4dd138ee`) are present via
`git log --oneline --all`, with subjects matching this SUMMARY's Task Commits table
(`feat(95-03): re-point the last raw java-interop port literals at DEFAULT_PORT`,
`test(95-03): pin the tree-wide single-occurrence port-literal guard`,
`docs(95-03): complete java-interop port constant consolidation plan`). `git status --short` on
`BbjHomeDetector.java` (the falsification-edit target) shows no pending changes, confirming the
byte-identical restoration documented above held through the rest of this plan's execution. Both
re-pointed files (`BbjSettings.java:30`; `BbjSettingsComponent.java:189,461,466`) still show zero
raw `5008` occurrences and reference `BbjInteropPortDetector.DEFAULT_PORT` instead. Task 1's
targeted tests (`InteropPortSettingsTest`, `BbjInteropPortDetectorTest`,
`InteropPortPresentationTest`, `BbjSettingsLoadStateTest`, `EffectiveInteropPortSourceGuardTest`)
and the whole-suite `./gradlew test --rerun-tasks` run were both observed green during execution
(not re-run for this attestation, per the coordinator's explicit instruction not to re-run the
suite for this documentation-only repair). Task 2's falsification — the throwaway
`5008` literal in `BbjHomeDetector.java`, the guard observed RED, the `git checkout --`
restoration, and sha256 match (`99b7d89c...`) before and after — was performed and witnessed
directly during execution, not merely asserted. No acceptance criterion from `95-03-PLAN.md`'s
two tasks was left unmet.

---
*Phase: 95-java-interop-status-accuracy-widget-consolidation*
*Completed: 2026-09-19*
