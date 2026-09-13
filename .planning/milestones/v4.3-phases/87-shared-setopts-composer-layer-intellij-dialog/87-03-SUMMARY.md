---
phase: 87-shared-setopts-composer-layer-intellij-dialog
plan: 03
subsystem: composer
tags: [intellij, langium, vitest, junit5, editor-action, setopts]

# Dependency graph
requires:
  - phase: 87-shared-setopts-composer-layer-intellij-dialog
    plan: 01
    provides: "bbj/composer/setopts/decodeCall and setoptsDecodeCall/setoptsPreview on BbjComposerServer, the SETOPTS DTO family, and DecodeEquality.sameSetopts"
  - phase: 87-shared-setopts-composer-layer-intellij-dialog
    plan: 02
    provides: "SetoptsComposerDialog (constructor + getHexDigits()/getLine() getters), the debounced preview round trip"
provides:
  - "ComposerLauncher.Kind.SETOPTS: the fourth composer launch chain, wiring setoptsDecodeCall (line-only, no caret column) through ComposerFlow into openSetopts"
  - "openSetopts's guarded edit-in-place apply (StaleEditGuard + DecodeEquality.sameSetopts, one replaceString( call confined to the decoded hex token or bare-keyword insert point) and its unguarded compose-new insertion via the refactored insertAt(..., atLineStart) helper"
  - "BbjComposeSetoptsAction: a PSI-free, config-file-scoped ('Compose SETOPTS…') Editor Popup Menu entry, registered in plugin.xml with no default keystroke"
  - "An automated regression pair (config-hot-reload.test.ts) proving a SETOPTS-only composer write produces zero reload notifications while a PREFIX write in the same file still produces exactly one, built from the composer's own composeSetOptsLine/parseVector/setoptsPreview functions"
  - "QA/FULL-TEST-CHECKLIST.md IntelliJ row 18, the one live-IDE hand check this phase's verification bar requires"
affects: [88-setopts-in-code-hovers]

# Actuals (#2632)
actuals:
  tokens: 7821
  tasks: 3
  commits: 3

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "openSetopts computes start/end/replacement locally inside the guarded write lambda before the single replaceString( call, returning early (no write) when both hexRange and insertOffset are null -- keeps the guarded body to exactly one write site, matching openMsgbox/applyHexEdit's shape"
    - "insertAtCaret is now a one-line delegating wrapper over insertAt(project, editor, text, command, atLineStart); atLineStart=true (SETOPTS compose-new) inserts at the caret's line start so a composed line can never split a PREFIX or other directive line the user right-clicked; the three pre-existing call sites (MSGBOX/addWindow/addChildWindow) pass atLineStart=false and are behaviorally unchanged"

key-files:
  created:
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjComposeSetoptsAction.java
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/actions/BbjComposeSetoptsActionSourceGuardTest.java
  modified:
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ComposerLauncher.java
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerApplyGuardSourceGuardTest.java
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerLauncherChainSourceGuardTest.java
    - bbj-intellij/src/main/resources/META-INF/plugin.xml
    - bbj-vscode/test/config-hot-reload.test.ts
    - QA/FULL-TEST-CHECKLIST.md

key-decisions:
  - "openSetopts placed between applyHexEdit and insertAt/insertAtCaret in ComposerLauncher.java (not after them) -- required by ComposerApplyGuardSourceGuardTest's positional check that no create-path insertString( call ever falls between a guarded applyIfUnchanged( and its replaceString(); placing openSetopts's own guarded body before the file's only insertString( site (inside insertAt) keeps that invariant true without changing the check itself"
  - "DecodeEquality.sameSetopts was not written in this plan -- 87-01 already delivered it (with its own DecodeEqualityTest coverage) since the comparator lives with the other DTO-boundary work, not the launcher wiring; Task 1 only wires ComposerLauncher to call it"
  - "The action's update() calls BbjConfigPathService.getInstance() with no argument (corrected from 87-PATTERNS.md's stale getInstance(project) signature, per the plan's own 'Corrections to the pattern map' note) -- getInstance() is a no-arg application service accessor"

patterns-established:
  - "BbjComposeSetoptsActionSourceGuardTest mirrors BbjRefreshJavaClassesActionSourceGuardTest's stripComments + named-literal-constant convention, extended with a scoped plugin.xml substring check (own <action>...</action> element only, not the whole descriptor) so a sibling action's legitimate keyboard-shortcut declaration can never trip this action's D-04 no-keystroke assertion"

requirements-completed: [DISC-04]

coverage:
  - id: D9
    description: "ComposerLauncher.Kind.SETOPTS composes the launch chain through ComposerFlow exactly like the other three composer kinds: setoptsDecodeCall (line-only) -> openSetopts, with catalogs==null and decode-null/mismatch both surfacing through the existing notice/balloon seam"
    requirement: DISC-04
    verification:
      - kind: unit
        ref: "bbj-intellij ComposerLauncherChainSourceGuardTest#theLauncherComposesEachComposerKindThroughTheFlowSeamExactlyOnce (4 flow.launch( sites)"
        status: pass
      - kind: unit
        ref: "bbj-intellij ComposerApplyGuardSourceGuardTest#allFourEditFlowsReachTheGuardWithTheirOwnComparator, #theReDecodeReusesTheSameRequestTheLaunchAlreadyIssued (setoptsDecodeCall( x2, DecodeEquality::sameSetopts x1)"
        status: pass
    human_judgment: false
  - id: D10
    description: "The SETOPTS edit-in-place apply path is guarded by StaleEditGuard.applyIfUnchanged with DecodeEquality.sameSetopts and exactly one replaceString( write confined to the decoded hex token range or the bare-keyword insert point; the compose-new path inserts a whole line at the caret's line start via the refactored insertAt helper, never mid-line"
    requirement: DISC-04
    verification:
      - kind: unit
        ref: "bbj-intellij ComposerApplyGuardSourceGuardTest#everyWriteInTheLauncherLiesInsideAGuardedApplyBody (3 applyIfUnchanged(/3 replaceString(), #theCreatePathStaysOutsideTheGuard (1 insertString(, never inside a guarded body)"
        status: pass
    human_judgment: false
  - id: D11
    description: "BbjComposeSetoptsAction is a PSI-free, config-file-scoped ('absent, not disabled' outside config.bbx/config.min) Editor Popup Menu entry with no default keystroke, registered as bbj.composeSetopts in plugin.xml"
    requirement: DISC-04
    verification:
      - kind: unit
        ref: "bbj-intellij BbjComposeSetoptsActionSourceGuardTest (all 7 tests: config-path predicate, presence-based scoping, PSI-free, no Java-side SETOPTS parsing, one launch target, no restart entry point, plugin.xml registration with no keystroke)"
        status: pass
    human_judgment: false
  - id: D12
    description: "A SETOPTS-only composer write (built from the composer's own composeSetOptsLine/parseVector/setoptsPreview functions) produces zero bbj/configReloadRequired notifications, while a PREFIX edit in the same file still produces exactly one -- reconfirming Phase 85 D-06's relevance gate with no new suppression code in config-watcher.ts or config-reload-notification.ts"
    requirement: DISC-04
    verification:
      - kind: unit
        ref: "bbj-vscode test/config-hot-reload.test.ts#a line written by the SETOPTS composer produces zero notifications, while a PREFIX edit in the same file still produces exactly one"
        status: pass
    human_judgment: false
  - id: D13
    description: "The one live-IDE hand check this phase's verification bar requires (Phase 86 D-18) is recorded as IntelliJ QA row 18, covering both composer modes, the absent-in-.bbj check, and the no-restart observation"
    requirement: DISC-04
    verification: []
    human_judgment: true
    rationale: "A live IntelliJ session (context-menu visibility, live debounced preview, greyed BBj-ignored options, and the absence of a server restart/reconnect) cannot be proven by an automated test; QA/FULL-TEST-CHECKLIST.md row 18 records the exact steps for a human to run against a built plugin."

duration: 8min
completed: 2026-09-07
status: complete
---

# Phase 87 Plan 03: Shared SETOPTS Composer Layer & IntelliJ Dialog Summary

**The SETOPTS composer wired end-to-end into IntelliJ: `Kind.SETOPTS`'s guarded edit-in-place/compose-new apply paths in `ComposerLauncher`, a PSI-free config-file-scoped `BbjComposeSetoptsAction` on the Editor Popup Menu, and an automated regression pair proving the write causes zero server restarts.**

## Performance

- **Duration:** 8 min
- **Started:** 2026-09-07T18:31:31Z
- **Completed:** 2026-09-07T18:39:06Z
- **Tasks:** 3
- **Files modified:** 8 (2 created, 6 modified)

## Accomplishments
- `ComposerLauncher.Kind.SETOPTS` is the fourth composer launch chain: `setoptsDecodeCall` (line-only, no caret column per D-03/D-06 Option B) flows through `ComposerFlow` into `openSetopts`, which either opens `SetoptsComposerDialog` prefilled for edit-in-place or blank for compose-new
- `openSetopts`'s edit path is guarded by `StaleEditGuard.applyIfUnchanged` with `DecodeEquality.sameSetopts`, writing through exactly one `replaceString(` call confined to the decoded hex token span (or a leading-space insert at a bare `SETOPTS` keyword's insert point); the compose-new path inserts a whole line at the caret's line start through the refactored `insertAt(project, editor, text, command, atLineStart)` helper, so a composed line can never split whatever line the user right-clicked
- `insertAtCaret` is now a one-line delegating wrapper over `insertAt(..., false)`; the three pre-existing MSGBOX/addWindow/addChildWindow call sites are behaviorally unchanged
- `ComposerApplyGuardSourceGuardTest`'s `applyIfUnchanged(`/`replaceString(` counts moved from 2 to 3, and `ComposerLauncherChainSourceGuardTest`'s `flow.launch(` count moved from 3 to 4, in the same commit as the launcher change so the module never went red
- `BbjComposeSetoptsAction`: a new `AnAction` whose `update()` gates purely on `BbjConfigPathService.getInstance().isConfigFile(file)` (no PSI, no caret-line text read, per D-01/D-02/D-03) and whose `actionPerformed()` calls `ComposerLauncher.launch(project, editor, Kind.SETOPTS)`; registered as `bbj.composeSetopts` ("Compose SETOPTS…") in plugin.xml's Editor Popup Menu group, with no default keystroke (D-04)
- New `BbjComposeSetoptsActionSourceGuardTest` (7 tests) pins the config-path predicate, presence-based (not disabled-but-visible) scoping, PSI-freedom, absence of Java-side SETOPTS parsing, the single `Kind.SETOPTS` launch target, absence of any restart entry point, and the plugin.xml registration's missing keystroke
- New `config-hot-reload.test.ts` regression pair, built from `composeSetOptsLine`/`parseVector`/`setoptsPreview` (never hand-typed text), proves a SETOPTS-only composer write yields zero `bbj/configReloadRequired` notifications while a PREFIX write to the same file still yields exactly one `prefix-changed` notification — reconfirming Phase 85 D-06's relevance gate with zero new suppression code
- `QA/FULL-TEST-CHECKLIST.md` gained IntelliJ row 18, the one live-IDE hand check this phase's verification bar (Phase 86 D-18) requires

## Task Commits

Each task was committed atomically:

1. **Task 1: `ComposerLauncher.Kind.SETOPTS` — guarded edit-in-place and compose-new insertion** - `a07e5466` (feat)
2. **Task 2: `BbjComposeSetoptsAction` — config-file-scoped editor context-menu entry** - `67672dd6` (feat)
3. **Task 3: Prove the composer's own write causes no reload, and record the hand check** - `b132f099` (test)

**Plan metadata:** (this commit)

## Files Created/Modified
- `bbj-intellij/.../composer/ComposerLauncher.java` - `Kind.SETOPTS`, `openSetopts`, refactored `insertAt`/`insertAtCaret`
- `bbj-intellij/.../composer/ComposerApplyGuardSourceGuardTest.java` - guarded-write counts moved to 3, `sameSetopts`/`setoptsDecodeCall(x2)` assertions added
- `bbj-intellij/.../composer/ComposerLauncherChainSourceGuardTest.java` - `flow.launch(` count moved to 4
- `bbj-intellij/.../actions/BbjComposeSetoptsAction.java` - new PSI-free, config-file-scoped Editor Popup action
- `bbj-intellij/.../actions/BbjComposeSetoptsActionSourceGuardTest.java` - new 7-test source guard
- `bbj-intellij/src/main/resources/META-INF/plugin.xml` - `bbj.composeSetopts` action registration
- `bbj-vscode/test/config-hot-reload.test.ts` - new SETOPTS-composer-write-vs-PREFIX-write regression pair
- `QA/FULL-TEST-CHECKLIST.md` - IntelliJ row 18

## Decisions Made
- `openSetopts` was placed between `applyHexEdit` and `insertAt`/`insertAtCaret` in `ComposerLauncher.java` (not after them) — required by `ComposerApplyGuardSourceGuardTest`'s positional check that the file's single `insertString(` call site never falls between a guarded `applyIfUnchanged(` and its `replaceString(`; this ordering keeps that check meaningful without altering the check itself.
- `DecodeEquality.sameSetopts` was not written in this plan — 87-01 already delivered it, with its own `DecodeEqualityTest` coverage, as part of the DTO-boundary work. Task 1 only wires `ComposerLauncher` to call the existing comparator.
- The action's `update()` calls `BbjConfigPathService.getInstance()` with no argument — corrected from 87-PATTERNS.md's stale `getInstance(project)` signature per the plan's own "Corrections to the pattern map" note; `getInstance()` is the real no-arg application-service accessor (`BbjConfigPathService.java:34`).

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required. No new dependency was added to `package.json` or `build.gradle.kts`.

## Next Phase Readiness

Phase 87 is complete: all three plans (01 shared request layer, 02 dialog, 03 this wiring layer) landed. All four ROADMAP success criteria have an automated owner (SC1: plans 02/03; SC2: plan 03 Task 3; SC3: plan 01 Tasks 1-2; SC4: plan 02 Task 3 and plan 03 Task 1). DISC-04 (#633) is implemented and covered by automated tests on both language-server and IntelliJ sides; the one remaining verification step is the live-IDE hand check recorded as QA row 18.

No blockers. Phase 88 (SETOPTS-in-code hovers, DISC-05/DISC-06) can build directly on this phase's catalog/request shape and `ComposerLauncher`/`StaleEditGuard`/`DecodeEquality` seams.

---
*Phase: 87-shared-setopts-composer-layer-intellij-dialog*
*Completed: 2026-09-07*

## Self-Check: PASSED

- All 8 created/modified files confirmed present on disk (`BbjComposeSetoptsAction.java`, `BbjComposeSetoptsActionSourceGuardTest.java`, `ComposerLauncher.java`, `ComposerApplyGuardSourceGuardTest.java`, `ComposerLauncherChainSourceGuardTest.java`, `plugin.xml`, `config-hot-reload.test.ts`, `QA/FULL-TEST-CHECKLIST.md`).
- All 3 task commit hashes (`a07e5466`, `67672dd6`, `b132f099`) confirmed present in `git log --oneline --all`.
- `cd bbj-intellij && ./gradlew build --offline` green (720 tests, 0 failures/errors, up from 713 before this plan).
- `cd bbj-vscode && npx vitest run test/config-hot-reload.test.ts test/composer-commands.test.ts test/setopts-catalog.test.ts` green (75 tests).
- `git status --porcelain -- bbj-vscode/src/setopts-composer-ui.ts bbj-vscode/src/setopts-composer-webview.ts bbj-vscode/src/language/config-watcher.ts` empty — VS Code composer UI and Phase 85's watcher untouched.
- `QA/FULL-TEST-CHECKLIST.md` carries exactly one IntelliJ row 18.
