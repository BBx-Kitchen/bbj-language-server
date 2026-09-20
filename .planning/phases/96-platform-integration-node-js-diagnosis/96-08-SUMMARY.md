---
phase: 96-platform-integration-node-js-diagnosis
plan: 08
subsystem: ide-plugin
tags: [intellij, node-js, notifications, settings, source-guard]

requires:
  - phase: 96-platform-integration-node-js-diagnosis
    provides: "96-05's NodeExecutableResolver/NodePresentation reason-driven seam and 96-06's editor-banner consumer of it -- the second consumer this plan wires up"
provides:
  - "One shared id-to-behaviour mapping (NodeActions.perform) and one shared id-to-label mapping (NodePresentation.actionLabel), consumed by both the language-server start-failure notification and the editor banner"
  - "The language server's start-failure notification now offers the same reason-varying action set as the banner instead of a single hardcoded configure-path action"
  - "The Settings dialog's below-minimum-version label and the Node.js path field's empty-text hint both name clearing the field as the recovery"
  - "A human re-UAT of the fix on real Windows against a build from this tree, recorded as a pass, closing UAT gap G-96-2"
affects: [97-release]

actuals:
  tokens: 21000
  tasks: 4
  commits: 5

tech-stack:
  added: []
  patterns: []

key-files:
  created:
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/NodeActions.java
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/NodePresentationTest.java (extended; five new label cases)
  modified:
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/BbjLanguageServer.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjMissingNodeNotificationProvider.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/NodePresentation.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjSettingsComponent.java
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/BbjLanguageServerSourceGuardTest.java (extended)
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/BbjSettingsFailureStateSourceGuardTest.java (extended)

key-decisions:
  - "The plan's single BbjNodeActions class (label + handler) split in practice across two existing homes instead: NodePresentation.actionLabel(String) carries the id-to-label half (platform-free, plain-JUnit testable, consistent with NodePresentation already owning bannerText/bannerActions), and the new NodeActions.perform(Project, String) in com.basis.bbj.intellij carries the id-to-behaviour half (the platform calls NodePresentation must stay free of). Both surfaces still read from exactly one mapping each -- the plan's actual requirement -- just not from one single class."
  - "Structural guards landed as extensions to the existing BbjLanguageServerSourceGuardTest and BbjSettingsFailureStateSourceGuardTest rather than as three new standalone classes (BbjNodeRecoveryActionsSourceGuardTest / BbjSettingsNodeRecoveryHintSourceGuardTest / BbjNodeActionsTest named in the plan). The assertions the plan specified were all added, just filed beside their sibling guards instead of in new files."
  - "G-96-2 recorded as closed on the maintainer's blanket 'pass, works as expected now' reply (2026-09-20), tied to the bbj-intellij-0.1.0.zip sha256 89ba44723d319771bc6436aee8b0a0218fca04b93c2093c5f6249f3258df2659 built from source commit dbdb65282e4b5f5c6fc984f24c230b1ef6079dca."

requirements-completed: []

coverage:
  - id: D1
    description: "The language server's start-failure notification builds its buttons from NodePresentation.bannerActions/actionLabel, run through NodeActions.perform, instead of a single hardcoded configure-path action"
    requirement: "PLAT-04"
    verification:
      - kind: unit
        ref: "BbjLanguageServerSourceGuardTest (extended) -- notifyUnresolvedNodePathTakesTheResolutionType, notifyUnresolvedNodePathBodyDerivesActionsFromTheSharedPresentationSeamExactlyOnceEach, theIdIteratingForHeaderPrecedesTheSingleAddAction, notifyUnresolvedNodePathBodyRunsExactlyOneActionThroughTheSharedBehaviourMapping, noActionLabelLiteralSurvivesInTheCommentStrippedWholeFile"
        status: pass
      - kind: manual_procedural
        ref: "Maintainer Windows re-UAT, 2026-09-20: 'pass, works as expected now'"
        status: pass
    human_judgment: true
    rationale: "The banner and notification rendering in a live IDE, and the editor-banner blind spot in the too-old-configured state, can only be confirmed by a human looking at a running Windows IDE."
  - id: D2
    description: "One shared id-to-behaviour/id-to-label mapping serves both the startup notification and the editor banner, each with exactly one action-adding call site"
    requirement: "PLAT-05"
    verification:
      - kind: unit
        ref: "BbjLanguageServerSourceGuardTest (banner-side assertions) + NodePresentationTest (five new actionLabel cases)"
        status: pass
    human_judgment: false
  - id: D3
    description: "The Settings dialog's below-minimum-version label names the clear-the-field recovery, and the Node.js path field carries the same recovery as an empty-text hint"
    requirement: null
    verification:
      - kind: unit
        ref: "BbjSettingsFailureStateSourceGuardTest (extended) -- theBelowMinimumBranchNamesTheClearFieldRecoveryRightAfterTheVersionReport, theNodeJsFieldCarriesAnEmptyTextHintBetweenItsConstructionAndTheVersionLabel"
        status: pass
      - kind: manual_procedural
        ref: "Maintainer Windows re-UAT, 2026-09-20: 'pass, works as expected now'"
        status: pass
    human_judgment: true
    rationale: "Visual placement and wording of the settings hint in a running dialog were part of the maintainer's manual checklist."
  - id: D4
    description: "An installable IntelliJ plugin zip, built from the two-fix tree with the whole JUnit suite green under a forced re-run, exists with its path/size/sha256/source-commit recorded"
    requirement: null
    verification:
      - kind: other
        ref: "bbj-intellij/build/distributions/bbj-intellij-0.1.0.zip, 1,159,831 bytes, sha256 89ba44723d319771bc6436aee8b0a0218fca04b93c2093c5f6249f3258df2659, built from commit dbdb65282e4b5f5c6fc984f24c230b1ef6079dca; prior executor reported ./gradlew test --rerun-tasks: 1091 tests, 0 failures, 0 errors"
        status: pass
    human_judgment: false

duration: continuation session, close-out only
completed: 2026-09-20
status: complete
---

# Phase 96 Plan 08: One shared Node.js recovery-action mapping, closing UAT gap G-96-2 Summary

**The language-server start-failure notification now offers the same download/configure/install-manually action set as the editor banner (read from one shared mapping), the Settings dialog names the clear-the-field recovery next to its version-too-old statement and as the Node.js field's empty-text hint, and the maintainer's real-Windows re-UAT reply -- "pass, works as expected now" -- closes G-96-2.**

## Performance

- **Duration:** continuation close-out only (Tasks 1-3 code/build executed and committed by prior agents; this session recorded Task 4's human verdict and closed the plan)
- **Tasks:** 4 of 4 (Task 4 was a `checkpoint:human-verify`, `gate="blocking-human"`, now answered)
- **Files modified:** 8 (this plan's own diff against its start point)

## Accomplishments

- One shared id-to-label mapping (`NodePresentation.actionLabel`) and one shared id-to-behaviour mapping (`NodeActions.perform`) now back both the start-failure notification and the editor banner -- neither surface enumerates its own labels or handlers.
- The language server's `notifyUnresolvedNodePath` takes a `NodeExecutableResolver.Resolution` instead of a bare message string, and loops over `NodePresentation.bannerActions(resolution)` to build its `NotificationAction`s, so a too-old configured Node.js now offers the download action next to configure-path and install-manually -- the same three-action set the banner already offered.
- The Settings dialog's below-minimum-version label now ends with "clear this field to auto-detect or download Node.js 22+" right after the detected-version report, and the empty Node.js path field shows "Leave empty to auto-detect or download Node.js 22+" as placeholder text before any path is ever configured.
- Both fix sites are pinned by extended source guards (`BbjLanguageServerSourceGuardTest`, `BbjSettingsFailureStateSourceGuardTest`) plus five new plain-JUnit cases in `NodePresentationTest` for `actionLabel`.
- An installable plugin zip was built from the two-fix tree (commit `dbdb6528`) with the whole IntelliJ JUnit suite green on a forced re-run, and the maintainer re-ran UAT Test 2 on real Windows against it, replying "pass, works as expected now" -- G-96-2 is closed.

## Task Commits

Each task was committed atomically (TDD-style split for Task 1):

1. **Task 1: One action mapping, two surfaces** -- `7a5d96ec` (test, RED: failing test for the shared action-label mapping), `42768480` (feat, GREEN: route the start-failure notification through the shared action mapping), `0fd4308b` (test: fence the start-failure notification against a literal-labelled regression)
2. **Task 2: Settings dialog names the recovery** -- `dbdb6528` (feat: name the clear-the-field recovery beside the too-old version report)
3. **Task 3: Rebuild both distributables** -- no commit (build-only, artefacts not committed per plan's `<done>` criterion). Source commit `dbdb65282e4b5f5c6fc984f24c230b1ef6079dca`.
4. **Task 4: Windows re-UAT checkpoint** -- no commit (human-verify checkpoint, no file changes)

**Plan metadata:** `4af30f56` (docs: reconcile plan frontmatter paths with the classes as built), plus this close-out commit.

_Note: Task 1 carries three commits (test → feat → test) because it was executed as a TDD task._

## Files Created/Modified

- `bbj-intellij/src/main/java/com/basis/bbj/intellij/NodeActions.java` -- new. Single `perform(Project, String)` static method mapping a `NodePresentation` action id to its platform behaviour (download via `BbjNodeDownloader.downloadNodeAsync`, configure-path via `ShowSettingsUtil`, install-manually via `BrowserUtil.browse` on a private constant URL); throws `IllegalArgumentException` on an unrecognised id.
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/NodePresentation.java` -- added `actionLabel(String actionId)`, the id-to-label half of the shared mapping, alongside the pre-existing `bannerText`/`bannerActions`.
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/BbjLanguageServer.java` -- `notifyUnresolvedNodePath` now takes a `Resolution` (plus the separate, unchanged message string) and builds one `NotificationAction` per id from `NodePresentation.bannerActions(resolution)`, labelled via `NodePresentation.actionLabel` and run via `NodeActions.perform`.
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjMissingNodeNotificationProvider.java` -- the banner's three-branch if-chain collapsed to a loop over `NodePresentation.bannerActions(resolution)` calling `panel.createActionLabel(NodePresentation.actionLabel(actionId), () -> NodeActions.perform(project, actionId))`; unused `BrowserUtil`/`ShowSettingsUtil`/`EditorNotifications` imports removed.
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjSettingsComponent.java` -- below-minimum-version `setText` extended with the recovery sentence; Node.js field's empty text set to the matching hint.
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/NodePresentationTest.java` -- five new cases for `actionLabel` (three fixed labels, distinctness/non-blank, unknown-id throws).
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/BbjLanguageServerSourceGuardTest.java` -- extended with the notification-side and banner-side structural assertions described in the plan (resolution-typed parameter, single `bannerActions`/`actionLabel`/`NodeActions.perform` call sites, loop-precedes-addAction ordering, no surviving literal-labelled action).
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/BbjSettingsFailureStateSourceGuardTest.java` -- extended with the two new settings-copy assertions (recovery phrase inside the below-minimum `setText` statement; empty-text hint positioned between the field and version-label constructions).

## Decisions Made

- G-96-2 is recorded as closed on the maintainer's reply "pass, works as expected now" (2026-09-20), tied to artefact `bbj-intellij-0.1.0.zip` sha256 `89ba44723d319771bc6436aee8b0a0218fca04b93c2093c5f6249f3258df2659` (1,159,831 bytes) and source commit `dbdb65282e4b5f5c6fc984f24c230b1ef6079dca`, plus VS Code side `bbj-lang-0.15.3.vsix` sha256 `12265919186f37bb89a5c99b670c30d053ff6acae3c671405369d73136385db6` (2,631,405 bytes).
- Naming and file-placement deviated from the plan's prose (see Deviations below) but the structural requirements -- exactly one shared mapping per direction, both surfaces reading from it, one action-adding site each -- were all met and are pinned by tests.

## The Maintainer's Windows Re-UAT Reply (verbatim)

> "pass, works as expected now"

This is a **blanket pass**. The maintainer did not itemise the three checks in Task 4's `how-to-verify` (popup buttons in step 4 / editor banner in the too-old-configured state in step 5 / settings label and empty-field hint in step 3), did not quote any on-screen text back, and did not say whether the optional end-to-end payoff check (step 6, clicking "Download Node.js" through to a successful restart) was run. No per-item observation, button order, or quoted string is invented here beyond what was actually said. On the basis of this reply, G-96-2 is recorded as closed.

## Deviations from Plan

### Auto-fixed / structural deviations (no functional impact -- structural requirements met, just not through the literal file/class names in the plan)

**1. Class and test naming differs from the plan's prose**
- **Found during:** Task 1 review (this close-out session)
- **What the plan named:** A single `BbjNodeActions` class in `com.basis.bbj.intellij` with two public statics, `label(String)` and `handler(Project, String)`, both dispatching via an if-chain (the plan explicitly said "Do not use a switch statement"). Three new test classes: `BbjNodeActionsTest`, `BbjNodeRecoveryActionsSourceGuardTest`, `BbjSettingsNodeRecoveryHintSourceGuardTest`.
- **What was actually built:** The id-to-label half lives in `NodePresentation.actionLabel(String)` in the `lsp` package (platform-free, exercised by five new cases added to the existing `NodePresentationTest`), and the id-to-behaviour half is `NodeActions.perform(Project, String)` in `com.basis.bbj.intellij` -- one method rather than two, dispatching via a Java `switch` expression rather than an if-chain. The structural guards were added to the existing `BbjLanguageServerSourceGuardTest` (notification-side and banner-side assertions) and `BbjSettingsFailureStateSourceGuardTest` (settings-copy assertions) rather than filed as three new standalone classes.
- **Why it likely happened:** While Tasks 1-2 were running, a second planner overwrote `96-08-PLAN.md` in the working tree with an uncommitted 3-task variant (autonomous, different naming) before the orchestrator restored the committed 4-task plan. This naming mix -- `NodePresentation.actionLabel` instead of `BbjNodeActions.label`, `NodeActions` instead of `BbjNodeActions`, a `switch` instead of an if-chain -- is the probable but not certain fallout of that overwrite; stated here as the likely cause, not as established fact.
- **Impact:** None on the plan's actual `must_haves` and `acceptance_criteria`: exactly one shared id-to-label mapping and exactly one shared id-to-behaviour mapping exist, each consumed by both surfaces with exactly one action-adding call site apiece, and every structural assertion the plan specified is present, just filed under different class names. `Lsp4ijImportAllowlistTest`, `DownloadGuardTest` and `BbjNodeDownloaderSourceGuardTest` all pass unedited -- none of those three files appears in the `2f553a75..HEAD` diff.
- **Files affected:** `NodeActions.java`, `NodePresentation.java`, `BbjLanguageServerSourceGuardTest.java`, `BbjSettingsFailureStateSourceGuardTest.java`, `NodePresentationTest.java`.
- **Committed in:** `7a5d96ec`, `42768480`, `0fd4308b` (Task 1); reconciled in plan frontmatter by `4af30f56`.

**2. `NodeActions` breaks the plugin's `Bbj`-prefix naming convention**
- **Found during:** this close-out session, reviewing `com.basis.bbj.intellij` package contents
- **Note:** `NodeActions` is the only class in `com.basis.bbj.intellij` without the `Bbj` prefix every sibling class in that package carries (`BbjSettingsComponent`, `BbjNodeDownloader`, `BbjMissingNodeNotificationProvider`, etc.). Not fixed in this plan -- flagged as a follow-up candidate for code review.

**3. Pre-existing planning identifier in `BbjSettingsComponent.java` javadoc, out of scope**
- `D-12` appears in `BbjSettingsComponent.java` javadoc around lines 33 and 225, predating this plan. Left untouched -- out of scope for this plan's fix sites, and this plan's own diff introduces no new planning identifier (checked against the `2f553a75..HEAD` diff).

---

**Total deviations:** 3 (1 structural naming/placement deviation with no functional impact, 1 informational follow-up note, 1 pre-existing out-of-scope item). No `WINDOWS.md` ledger entry opened -- the Windows re-UAT passed, which is the only outcome this plan's `<output>` instructs to leave the ledger untouched for.

## Issues Encountered

A second planner overwrote `96-08-PLAN.md` in the working tree with an uncommitted 3-task variant while Tasks 1-2 were executing under the committed 4-task plan; the orchestrator restored the committed plan before this continuation session began. No task work was lost, but it is the likely source of deviation 1's naming mismatch.

## User Setup Required

None -- no external service configuration required.

## Next Phase Readiness

- G-96-2 is closed. Phase 96's UAT gap that this plan existed to close no longer blocks phase completion.
- PLAT-04 and PLAT-05 remain Complete, as declared by prior plans in this phase; this plan closed a UAT gap against them and made no requirement-status change (per this plan's own `<output>` instruction not to edit REQUIREMENTS.md).
- `NodeActions`'s missing `Bbj` prefix (deviation 2) is a candidate for the phase's code-review pass, not a blocker.
- Phase 96 is otherwise ready for verification: 7/8 plans executed with PLAT-06 (96-07) recorded as an open WINDOWS.md entry (unrelated defect -- language server does not start after Node.js auto-install on Windows, needing a dedicated debug session per 96-07-SUMMARY.md), and now 96-08 closing G-96-2 on a reported pass.

---
*Phase: 96-platform-integration-node-js-diagnosis*
*Completed: 2026-09-20*
