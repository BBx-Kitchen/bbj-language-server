---
phase: 93-composer-robustness-consolidation
plan: 07
subsystem: ide-intellij
tags: [intellij-plugin, editor-action, composer, java, source-guard]

# Dependency graph
requires:
  - phase: 93
    provides: "93-03's ComposerEditRanges/MALFORMED_EDIT range guards and 93-05's ComposerCatalogsCheck shape guard on ComposerLauncher (read but not modified by this plan -- these actions drive that already-hardened launch path)"
provides:
  - "BbjComposeActionBase abstract class carrying actionPerformed, update and getActionUpdateThread exactly once"
  - "All six BbjCompose*Action classes converted to thin no-arg subclasses"
  - "BbjComposeActionBaseSourceGuardTest pinning the base's structural shape and all six delegation pins"
  - "BbjComposeCvsActionSourceGuardTest, BbjComposeSetoptsActionSourceGuardTest, BbjComposeSetoptsInCodeActionSourceGuardTest re-pointed to the base+subclass shape"
affects: ["93-08 (touches SetoptsComposerDialog/SetoptsTriStateComposerDialog and their own guards -- does not touch the actions package this plan converts)"]

actuals:
  tokens: 14500
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "abstract-base-plus-thin-no-arg-subclasses for a platform extension point that instantiates via a no-arg constructor and gives the instance no way to learn its own registration identity (mirrors ComposerIntentionBase from 93-04, per D-06)"

key-files:
  created:
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjComposeActionBase.java
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/actions/BbjComposeActionBaseSourceGuardTest.java
  modified:
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjComposeMsgboxAction.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjComposeAddWindowAction.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjComposeAddChildWindowAction.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjComposeCvsAction.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjComposeSetoptsAction.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjComposeSetoptsInCodeAction.java
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/actions/BbjComposeCvsActionSourceGuardTest.java
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/actions/BbjComposeSetoptsActionSourceGuardTest.java
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/actions/BbjComposeSetoptsInCodeActionSourceGuardTest.java

key-decisions:
  - "Shipped as abstract base + 6 thin no-arg subclasses (deliberate deviation from #616's proposed 'single data-driven registration' wording, per D-06) -- an AnAction could read its own registered id via ActionManager.getId(this) and map it to a Kind, but that would turn a renamed or mistyped action id into a silent no-op at click time instead of a compile error. Record this reasoning when closing #616: close as done, not as partially implemented. Mirrors ComposerIntentionBase's shape (93-04) so both consolidations have one review story."
  - "The base's update() carries the full default gate (project != null && editor != null && isAvailableFor(...)), not just the launch call -- the two SETOPTS actions override only isAvailableFor(...) rather than re-declaring update(), so the project/editor half of the gate is written exactly once and can never be repeated or drift between subclasses."
  - "isAvailableFor(Project, Editor, VirtualFile) defaults to true and is left as a regular (non-abstract) overridable method, not an abstract hook -- unlike ComposerIntentionBase's getText()/isAvailable() pattern, all four uniform actions share literally the same default rather than each needing its own trivial override, so a default body is the leaner choice here without weakening the compile-time-safety goal (kind() stays the one abstract hook)."

patterns-established:
  - "For a platform extension point instantiated by no-arg constructor where most subclasses share one gate but a minority need their own predicate, give the base's update() the shared skeleton and expose one overridable (not abstract) predicate hook with a permissive default -- avoids forcing a no-op override onto every subclass that doesn't need one, while still keeping the true per-subclass identity (kind()) a compile-time-checked abstract hook."

requirements-completed: [COMP-09]

coverage:
  - id: D1
    description: "All six composer-launch actions share one base carrying Kind plus an availability predicate; the launch call, the presence-scoping and the background update thread are each written once"
    requirement: COMP-09
    verification:
      - kind: unit
        ref: "BbjComposeActionBaseSourceGuardTest#actionPerformedBodyLaunchesThroughComposerLauncherExactlyOnceAndMutatesNoDocumentItself"
        status: pass
      - kind: unit
        ref: "BbjComposeActionBaseSourceGuardTest#updateBodyGatesThroughSetEnabledAndVisibleAndIsAvailableForExactlyOnceEach"
        status: pass
      - kind: unit
        ref: "BbjComposeActionBaseSourceGuardTest#everyUniformSubclassDelegatesToTheBaseExactlyOnce, #theSetoptsSubclassDelegatesWithItsOwnKindNotTheInCodeKind, #theSetoptsInCodeSubclassDelegatesWithItsOwnKind"
        status: pass
    human_judgment: false
  - id: D2
    description: "The four uniform actions use the base's default project-plus-editor gate; the two SETOPTS actions supply their own predicates (config-file / BBj-source), never re-declaring update()"
    requirement: COMP-09
    verification:
      - kind: unit
        ref: "BbjComposeActionBaseSourceGuardTest#bothSetoptsSubclassesDeclareTheirOwnAvailabilityOverrideExactlyOnceAndNoOtherSubclassDoes"
        status: pass
      - kind: unit
        ref: "BbjComposeSetoptsActionSourceGuardTest#theAvailabilityPredicateReachesConfigPathServiceWithNoArgument"
        status: pass
    human_judgment: false
  - id: D3
    description: "The kind is a compile-time constant per subclass, never derived from the registered action id"
    requirement: COMP-09
    verification:
      - kind: unit
        ref: "BbjComposeActionBaseSourceGuardTest#theKindIsNeverDerivedFromTheRegisteredActionId, #theAbstractKindDeclarationCarriesNoBody"
        status: pass
    human_judgment: false
  - id: D4
    description: "BbjOpenComposerAtAction stays separate and untouched"
    requirement: COMP-09
    verification:
      - kind: unit
        ref: "BbjComposeActionBaseSourceGuardTest#theCueActionIsNotConvertedToTheNewBase; BbjOpenComposerAtActionSourceGuardTest and ComposerLensCommandContractTest pass unmodified"
        status: pass
    human_judgment: false
  - id: D5
    description: "All seven action ids and their plugin.xml registrations, menu placements and absent keystrokes are unchanged"
    requirement: COMP-09
    verification:
      - kind: other
        ref: "git diff --name-only over plugin.xml across all three task commits returns nothing"
        status: pass
    human_judgment: false
  - id: D6
    description: "No action does Java-side SETOPTS keyword matching, CVS mask parsing or integer parsing"
    requirement: COMP-09
    verification:
      - kind: unit
        ref: "BbjComposeActionBaseSourceGuardTest#noSubclassOrTheBaseDoesJavaSideParsingOfAnyKind"
        status: pass
    human_judgment: false
  - id: D7
    description: "Whole IntelliJ JUnit suite green after the consolidation (968 tests, 0 failures)"
    verification:
      - kind: unit
        ref: "./gradlew test --rerun (968 tests, 0 failures, 0 errors)"
        status: pass
    human_judgment: false

duration: ~10min
completed: 2026-09-18
status: complete
---

# Phase 93 Plan 07: Composer Launch-Action Consolidation Summary

**All six `BbjCompose*Action` editor-context-menu actions now share one `BbjComposeActionBase` for the launch call, the presence-scoped availability gate and the background update thread, converted to thin no-arg subclasses that supply only their `Kind` (and, for the two SETOPTS actions, their own availability predicate).**

## Performance

- **Started:** 2026-09-18T09:59:05Z (approx, from STATE.md's prior session timestamp)
- **Completed:** 2026-09-18T10:07:58Z
- **Tasks:** 3/3
- **Files modified:** 11 (1 created main, 1 created test, 5 modified main, 3 modified test — plus this SUMMARY)

## Accomplishments

- Created `BbjComposeActionBase.java`, an abstract `AnAction` implementation carrying `actionPerformed` (the single `ComposerLauncher.launch(project, editor, kind())` call site), `update` (the single `setEnabledAndVisible(project != null && editor != null && isAvailableFor(project, editor, file))` gate) and `getActionUpdateThread` (returns `ActionUpdateThread.BGT`) exactly once. Exposes one overridable `isAvailableFor(Project, Editor, VirtualFile)` defaulting to `true`, and one abstract hook `kind()`.
- Converted all six `BbjCompose*Action` classes (`Msgbox`, `AddWindow`, `AddChildWindow`, `Cvs`, `Setopts`, `SetoptsInCode`) to thin subclasses. The four uniform actions supply only `kind()`; the two SETOPTS actions additionally override `isAvailableFor(...)` with their existing file-scoped predicates (`BbjConfigPathService.isConfigFile(file)` and `SetoptsInCodeActionAvailability.isAvailable(extension, isConfigFile)`), never re-declaring `update()`.
- Re-pointed `BbjComposeCvsActionSourceGuardTest`, `BbjComposeSetoptsActionSourceGuardTest` and `BbjComposeSetoptsInCodeActionSourceGuardTest` to the base-aware guard pattern: the launch call, presence gate, update thread and no-parsing/no-PSI/no-restart sweeps now assert against the base (in addition to the subclass where the assertion still applies, e.g. the SETOPTS config-path predicate), plus a delegation pin per subclass proving it extends the base and supplies its own `Kind`/`isAvailableFor`.
- Added `BbjComposeActionBaseSourceGuardTest` (14 tests) — the first structural coverage `BbjComposeMsgboxAction`, `BbjComposeAddWindowAction` and `BbjComposeAddChildWindowAction` have ever had. Pins the base's `actionPerformed`/`update` bodies, the zero-body abstract `kind()` declaration, zero `ActionManager.getId(` and zero composer action-id string literals on the base, all six delegation pins (with the `Kind.SETOPTS` vs `Kind.SETOPTS_IN_CODE` substring-inflation guard for the SETOPTS pin), that no subclass re-declares `actionPerformed`/`getActionUpdateThread`/`setEnabledAndVisible`, the no-Java-side-parsing sweep across base and all six subclasses, and that `BbjOpenComposerAtAction` stays off the new base.
- Whole IntelliJ suite: **968 tests, 0 failures, 0 errors** (up from the 944 baseline noted at 93-05) — verified with `./gradlew test --rerun` (forced re-run, not `UP-TO-DATE`).

## Task Commits

Each task was committed atomically:

1. **Task 1: Shared action base carrying one uniform action end-to-end** - `0d73750a` (feat)
2. **Task 2: Convert the remaining five actions, including the two SETOPTS predicates** - `93f70da0` (feat)
3. **Task 3: New base guard covering all six delegation pins** - `119c5afd` (test)

**Plan metadata:** (this commit)

## Files Created/Modified

- `bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjComposeActionBase.java` - new abstract base; launch call, presence gate, update thread
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjComposeMsgboxAction.java` - thin subclass
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjComposeAddWindowAction.java` - thin subclass
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjComposeAddChildWindowAction.java` - thin subclass
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjComposeCvsAction.java` - thin subclass (reference shape converted in Task 1)
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjComposeSetoptsAction.java` - thin subclass; keeps its own `isAvailableFor` reaching `BbjConfigPathService`
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjComposeSetoptsInCodeAction.java` - thin subclass; keeps its own `isAvailableFor` reaching `SetoptsInCodeActionAvailability`
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/actions/BbjComposeActionBaseSourceGuardTest.java` - new guard for the base's structural shape and all six delegation pins (14 tests)
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/actions/BbjComposeCvsActionSourceGuardTest.java` - re-pointed to base+subclass assertions
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/actions/BbjComposeSetoptsActionSourceGuardTest.java` - re-pointed to base+subclass assertions
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/actions/BbjComposeSetoptsInCodeActionSourceGuardTest.java` - re-pointed to base+subclass assertions

## Decisions Made

- **Base-plus-subclasses shape, not a single data-driven registration.** Deliberate, deviation from #616's proposed wording, matching D-06. An `AnAction` could technically read its own registered id via `ActionManager.getId(this)` and map it to a `Kind`, but that would turn a renamed or mistyped action id into a silent no-op at click time instead of a compile error. **When closing the underlying issue (#616), close it as done with this reasoning attached, not as partially implemented.** This mirrors 93-04's `ComposerIntentionBase` consolidation so both have one review story.
- `isAvailableFor(...)` is a regular overridable method with a permissive default (`true`), not an abstract hook. Unlike `ComposerIntentionBase`'s `getText()`/`isAvailable()` (deliberately left undeclared so every one of five differently-shaped subclasses supplies its own), here four of six subclasses share literally the identical default gate. Making it abstract would force four trivial `return true;` overrides for no safety benefit; `kind()` remains the one abstract hook carrying the actual per-subclass identity that must never silently default.
- The base's `update()` owns the full gate (`project != null && editor != null && isAvailableFor(...)`), so the two SETOPTS subclasses override only the file-scoped half of the predicate and never re-declare `update()` itself — eliminating the risk that a subclass's gate and the base's gate could disagree.

## Deviations from Plan

None - plan executed exactly as written. All three tasks' acceptance criteria were verified via the `<verify>` commands specified, plus an additional `--rerun` full-suite pass and an explicit `git diff --name-only` check confirming `plugin.xml` was untouched across all three task commits.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- COMP-09 is fully satisfied and marked complete in REQUIREMENTS.md. COMP-04 remains Pending — untouched by this plan, owned by plan 93-08.
- Whole IntelliJ suite is green (968/968) with the new 14-test base guard included in that count.
- Plan 93-08 (`SetoptsComposerDialog`/`SetoptsTriStateComposerDialog` and their own guards) touches a disjoint file set — no overlap with this plan's `actions/` package.
- `#616` can be closed as done with the base-plus-thin-subclasses reasoning recorded above, once the UAT round confirms all six composer entry points from the editor context menu.

## Known Stubs

None — this plan is a pure structural consolidation with no new UI surface, no new data flow, and no placeholder values introduced.

---
*Phase: 93-composer-robustness-consolidation*
*Completed: 2026-09-18*

## Self-Check: PASSED

All created/modified files verified present on disk; all three task commit hashes (`0d73750a`, `93f70da0`, `119c5afd`) verified present in `git log`.
