---
phase: 88-setopts-in-code-hovers-tri-state-composer
plan: 05
subsystem: ui
tags: [intellij, swing, intention, setopts, composer, tri-state]

# Dependency graph
requires:
  - phase: 88-setopts-in-code-hovers-tri-state-composer
    provides: "88-04's BbjComposerServer.setoptsDecodeInCode/setoptsComposeTriState, the SETOPTS-in-code DTO family (ComposerModels.java) and DecodeEquality.sameSetoptsInCode this plan's dialog and launcher branch consume directly"
provides:
  - "SetoptsTriStateComposerDialog -- a Swing composer reusing SetoptsComposerDialog's byte-grouped catalog layout, PreviewDebouncer debounce and CR-01 OK-gating, with a Set/Clear/Leave radio row per option and a read-only generated-block preview"
  - "ComposerLauncher.Kind.SETOPTS_IN_CODE -- routes an absolute literal to the existing two-state dialog, a safe chain or compose-new to the new tri-state dialog, and a not-editable result to a reason-only notice with no edit constructed"
  - "ConfigureSetoptsInCodeIntention -- the lightbulb (Alt+Enter) trigger, registered in plugin.xml with its own intentionDescriptions/ resources"
  - "Five new QA/FULL-TEST-CHECKLIST.md hand-check rows covering both IDEs' hover decode and tri-state composer, plus a live-BBjServices mask-width falsification row for 88-RESEARCH.md Assumption A2"
affects: [89 (composer discoverability CodeLens cue can now target both the config.bbx and in-code SETOPTS composers)]

# Actuals (#2632)
actuals:
  tokens: 15950
  tasks: 3
  commits: 3

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "SetoptsTriStateComposerDialog follows SetoptsComposerDialog's exact skeleton (ComposerFlow + PreviewDebouncer + CR-01 OK-gating + observe-both-sides sequence check) rather than introducing a second dialog shape or a mode flag on the existing dialog"
    - "ComposerLauncher.Kind.SETOPTS_IN_CODE is a distinct enum value (not a mode flag on Kind.SETOPTS) since the two flows have different DTOs (document-position vs. single-line) and different dialogs"

key-files:
  created:
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/SetoptsTriStateComposerDialog.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ConfigureSetoptsInCodeIntention.java
    - bbj-intellij/src/main/resources/intentionDescriptions/ConfigureSetoptsInCodeIntention/description.html
    - bbj-intellij/src/main/resources/intentionDescriptions/ConfigureSetoptsInCodeIntention/before.bbj.template
    - bbj-intellij/src/main/resources/intentionDescriptions/ConfigureSetoptsInCodeIntention/after.bbj.template
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/SetoptsInCodeSourceGuardTest.java
  modified:
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ComposerLauncher.java
    - bbj-intellij/src/main/resources/META-INF/plugin.xml
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerDialogRefreshSourceGuardTest.java
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerApplyGuardSourceGuardTest.java
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerLauncherChainSourceGuardTest.java
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerIntentionPreviewSourceGuardTest.java
    - QA/FULL-TEST-CHECKLIST.md

key-decisions:
  - "The per-row three-state widget is three JBRadioButtons in one javax.swing.ButtonGroup (Set/Clear/Leave), confirmed as the right call after checking com.intellij.ui.components for a tri-state alternative -- none exists (88-RESEARCH.md Assumption A4 resolved: no platform component substituted)."
  - "The mask-character/raw-tail form region is replaced entirely by a read-only JBTextArea preview plus a static 'Options left Leave... are left untouched' label -- SetoptsComposeTriStateResult carries no unknownByBytes data (unlike SetoptsPreview), so the callout is static explanatory text, not a computed unknownBitsText() call."
  - "ComposerLauncher.isCaretOnSetoptsInCode(Editor) is a new package-private helper that ORs three isCaretOnCall(editor, keyword) calls (setopts/ior(/and() rather than widening isCaretOnCall's own signature -- reuses the existing caret/line/lowercase mechanics verbatim, per the plan's explicit instruction."
  - "The not-editable branch reuses ComposerNotices.requestFailed(kindLabel, reason) rather than adding a fourth ComposerNotices.Reason -- ComposerNotices.java is not in this plan's files_modified list, and its own class javadoc frames its three reasons as 'the three failure classes this and later composer plans surface', signaling reuse is the intended path."
  - "ComposerLauncher.uriOf(VirtualFile) mirrors BbjCompileAction's own URI conversion (file.toNioPath().toUri().toString(), falling back to file.getUrl()) rather than inventing a second conversion -- the same URI shape the server's document store already resolves for bbj/compile."
  - "DISC-06 marked complete in REQUIREMENTS.md: both IDE halves now exist -- 88-06 shipped the VS Code tri-state UI, this plan ships the IntelliJ tri-state dialog, launcher branch and lightbulb intention -- satisfying the requirement's exact wording (generate-new AND edit-in-place, both statically-safe shapes, both IDEs). DISC-05 was left untouched, already marked complete from Wave 2 (Plans 88-01/88-02) per this plan's own instruction not to touch it."

patterns-established: []

requirements-completed: [DISC-06]

coverage:
  - id: T1
    description: "D-06: SetoptsTriStateComposerDialog reuses SetoptsComposerDialog's byte-grouped catalog layout (catalogs.byteGroups/catalogs.bits iteration), the same bbj-annotation greying/tooltip, and the same PreviewDebouncer at PREVIEW_DEBOUNCE_MS=300L, with the per-row widget changed to a three-state Set/Clear/Leave ButtonGroup radio row"
    requirement: "DISC-06"
    verification:
      - kind: unit
        ref: "bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerDialogRefreshSourceGuardTest.java (all 12 tests, now scanning 5 dialogs)"
        status: pass
    human_judgment: false
  - id: T2
    description: "D-04: ComposerLauncher opens the existing two-state SetoptsComposerDialog for an absolute SETOPTS <literal> decode, the new tri-state dialog for a safe chain decode and for compose-new, and raises no edit affordance at all when the server reports editable: false -- rendering the server's reason instead"
    requirement: "DISC-06"
    verification:
      - kind: unit
        ref: "bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/SetoptsInCodeSourceGuardTest.java (all 4 tests)"
        status: pass
    human_judgment: false
  - id: T3
    description: "D-05: the compose-new path inserts the server-composed canonical block at the caret's LINE START via the existing insertAt(..., atLineStart = true) helper, never mid-line"
    requirement: "DISC-06"
    verification:
      - kind: unit
        ref: "bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/SetoptsInCodeSourceGuardTest.java#theComposeNewPathInsertsAtTheLineStart"
        status: pass
    human_judgment: false
  - id: T4
    description: "Both edit paths (absolute literal, safe chain) write through StaleEditGuard.applyIfUnchanged with DecodeEquality::sameSetoptsInCode, re-decoding through the same setoptsDecodeInCode request the launch used"
    requirement: "DISC-06"
    verification:
      - kind: unit
        ref: "bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/SetoptsInCodeSourceGuardTest.java#bothGuardedEditPathsRouteThroughApplyIfUnchangedWithSameSetoptsInCode; bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerApplyGuardSourceGuardTest.java (widened counts, 5 applyIfUnchanged/replaceString pairs)"
        status: pass
    human_judgment: false
  - id: T5
    description: "D-03: ConfigureSetoptsInCodeIntention is registered for BBj in plugin.xml, follows ConfigureMsgboxIntention's exact shape (isAvailable/invoke/startInWriteAction=false/generatePreview returning IntentionPreviewInfo.Html) and ships its own intentionDescriptions/ resource directory"
    requirement: "DISC-06"
    verification:
      - kind: unit
        ref: "bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerIntentionPreviewSourceGuardTest.java (all 5 tests, 4 sources); bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/IntentionDescriptionResourcesTest.java (all 5 tests, descriptor-driven, picked up the new registration automatically)"
        status: pass
    human_judgment: false
  - id: T6
    description: "EDGE/DISC-06/empty: with every option left Leave the dialog's OK/Insert still produces a well-formed block (origin line plus SETOPTS line) for compose-new, and an empty replacement region for an existing chain -- never an empty insert and never a malformed line"
    requirement: "DISC-06"
    verification:
      - kind: unit
        ref: "compose-new: openSetoptsInCodeComposeNew refuses an empty getBlockText() before any write (ComposerLauncher.java); chain: openSetoptsInCodeChain's replaceString([startLine,endLine), \"\") deletes the reassignment lines outright rather than leaving a blank line, mirroring 88-06's VS Code webview behavior"
        status: pass
      - kind: other
        ref: "server-side round-trip already covered by 88-04's ComposerModelsJsonBoundaryTest and setopts-catalog.ts's own composeSetOptsBlock tests (not re-verified here -- this plan's own scope is the IntelliJ dialog/launcher, not the server's codegen)"
        status: pass
    human_judgment: false
  - id: T7
    description: "EDGE/DISC-06/ordering: the dialog sends its selection as one entry per catalog bit in catalogs.bits order, so the server's deterministic ordering is what reaches the document"
    requirement: "DISC-06"
    verification:
      - kind: unit
        ref: "SetoptsTriStateComposerDialog.refresh() iterates `rows` (built in catalogs.bits/catalogs.byteGroups order in createCenterPanel) to build the SetoptsTriStateEntry list, never the selection's own order"
        status: pass
    human_judgment: true
    rationale: "The row-order guarantee lives in Swing UI construction order, which the plain-JUnit source-guard tests in this suite do not execute against a live IntelliJ Application -- structurally true by construction (the for-loop iterates catalogs.byteGroups/catalogs.bits identically to SetoptsComposerDialog, whose own row order is pinned by ComposerDialogRefreshSourceGuardTest's byte-group iteration checks), but a manual UAT check of the applied block's byte-then-bit ordering (QA row 20) is the appropriate verification, matching 88-06's own D5 rationale for the equivalent VS Code claim."
  - id: T8
    description: "QA/FULL-TEST-CHECKLIST.md gains one hand-check row per IDE for the hover decode and one per IDE for the in-code composer, plus the live-BBjServices check that falsifies or confirms the 16-byte mask-padding assumption (88-RESEARCH.md A2)"
    requirement: "DISC-06"
    verification:
      - kind: other
        ref: "QA/FULL-TEST-CHECKLIST.md rows 15-16 (VS Code), 19-21 (IntelliJ)"
        status: pass
    human_judgment: true
    rationale: "These are hand-check rows by design -- no automated test can drive a live hover popup, an Alt+Enter lightbulb, or a real BBjServices run. Marked pass here in the sense that the rows exist and are well-formed; the checks themselves are pending human execution per the QA checklist's own workflow."

duration: 25min
completed: 2026-09-07
status: complete
---

# Phase 88 Plan 05: SETOPTS-in-Code IntelliJ Tri-State Composer (Dialog, Launcher Branch, Intention) Summary

**Ships the IntelliJ user-facing half of DISC-06: `SetoptsTriStateComposerDialog` (a Set/Clear/Leave radio-row composer reusing Phase 87's byte-grouped layout and debounce), `ComposerLauncher.Kind.SETOPTS_IN_CODE`'s mode-based dialog routing with guarded writes, and `ConfigureSetoptsInCodeIntention`'s Alt+Enter lightbulb trigger — closing DISC-06 now that both IDEs have a working tri-state composer.**

## Performance

- **Duration:** ~25 min
- **Tasks:** 3
- **Files modified:** 13 (6 created, 7 modified)

## Accomplishments

- `SetoptsTriStateComposerDialog` extends `DialogWrapper` with the exact same skeleton `SetoptsComposerDialog` uses — `ComposerFlow` + `balloonOnce` + `PreviewDebouncer` at `PREVIEW_DEBOUNCE_MS=300L`, `setOKActionEnabled(false)` before the first `refresh()`, a `scheduleRefresh()` helper that disables OK synchronously before triggering the debouncer (CR-01), and `flow.observe(...)` checking `mySeq == seq.get()` on both the success and failure callbacks — but with a `TriStateRow` record (bit + three `JBRadioButton`s in one `ButtonGroup`) instead of `CheckboxRow`, and a read-only `JBTextArea` block preview instead of the mask-character/raw-tail form region.
- `ComposerLauncher` gains `Kind.SETOPTS_IN_CODE`, a `launch()` switch arm that captures the caret's virtual-file URI (via `FileDocumentManager` + a `BbjCompileAction`-mirrored URI conversion, refusing to send a blank URI when no virtual file exists), and a four-way `openSetoptsInCode` dispatcher: `found=false` → blank tri-state dialog, compose-new, insert at line start; `editable=false` → a reason-only notice, no dialog; `mode="absolute"` → the existing two-state `SetoptsComposerDialog`; `mode="chain"` → the new tri-state dialog, replacing `[startLine, endLine)`. Both edit paths build their own `StaleEditGuard` re-decoding through `setoptsDecodeInCode` and comparing with `DecodeEquality::sameSetoptsInCode`.
- `ConfigureSetoptsInCodeIntention` copies `ConfigureMsgboxIntention`'s exact member order and modifiers, gated by a new `ComposerLauncher.isCaretOnSetoptsInCode(Editor)` helper (three `isCaretOnCall` calls ORed together for `setopts`/`ior(`/`and(`), registered as plugin.xml's fourth `<intentionAction>` with its own three-file `intentionDescriptions/ConfigureSetoptsInCodeIntention/` resource directory.
- Five new source guards/test updates: `ComposerDialogRefreshSourceGuardTest` scans the new dialog as a fifth source (generalizing the CR-01 three-disable expectation from one dialog to a `DEBOUNCED_DIALOG_SOURCES` list of two); `ComposerApplyGuardSourceGuardTest`'s occurrence counts widened from 3 to 5 for `applyIfUnchanged`/`replaceString`, with a new `sameSetoptsInCode` count of 2 (subtracting it from the substring-colliding `sameSetopts` count so neither assertion double-counts the other); `ComposerLauncherChainSourceGuardTest`'s `flow.launch(` count widened from 4 to 5; `ComposerIntentionPreviewSourceGuardTest` scans the new intention as a fourth source with a per-source scoped `isAvailable`-helper assertion; a new `SetoptsInCodeSourceGuardTest` pins all four of Task 2's routing invariants.
- `QA/FULL-TEST-CHECKLIST.md` gains five hand-check rows: VS Code rows 15 (hover decode) and 16 (in-code composer), IntelliJ rows 19 (hover decode via LSP4IJ) and 20 (composer via Alt+Enter), plus IntelliJ row 21 — a live-BBjServices mask-width falsification check for 88-RESEARCH.md Assumption A2 (the 16-byte mask-padding default).
- `DISC-06` marked complete in `REQUIREMENTS.md` — both IDE halves now exist (88-06 VS Code, this plan IntelliJ), satisfying the requirement's own wording.

## Task Commits

Each task was committed atomically:

1. **Task 1: `SetoptsTriStateComposerDialog` — three-state rows over Phase 87's byte-grouped layout** - `8ef79d78` (feat)
2. **Task 2: `Kind.SETOPTS_IN_CODE` launch branch with mode-based dialog routing and guarded writes** - `bb557544` (feat)
3. **Task 3: Lightbulb intention, its description resources, registration and the QA hand-check rows** - `455e4f82` (feat)

## Files Created/Modified

- `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/SetoptsTriStateComposerDialog.java` - New: the three-state Set/Clear/Leave composer dialog
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ComposerLauncher.java` - `Kind.SETOPTS_IN_CODE`, `isCaretOnSetoptsInCode`, `uriOf`, `openSetoptsInCode`/`openSetoptsInCodeComposeNew`/`openSetoptsInCodeAbsolute`/`openSetoptsInCodeChain`/`ensureTrailingNewline`
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ConfigureSetoptsInCodeIntention.java` - New: the lightbulb intention
- `bbj-intellij/src/main/resources/META-INF/plugin.xml` - Fourth `<intentionAction>` registration
- `bbj-intellij/src/main/resources/intentionDescriptions/ConfigureSetoptsInCodeIntention/{description.html,before.bbj.template,after.bbj.template}` - New: the intention's description resources
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerDialogRefreshSourceGuardTest.java` - Fifth dialog source, `DEBOUNCED_DIALOG_SOURCES` generalization
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerApplyGuardSourceGuardTest.java` - Widened `applyIfUnchanged`/`replaceString` counts, new `sameSetoptsInCode` assertion
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerLauncherChainSourceGuardTest.java` - Widened `flow.launch(` count
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerIntentionPreviewSourceGuardTest.java` - Fourth intention source, scoped `isAvailable`-helper assertion, widened plugin.xml count
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/SetoptsInCodeSourceGuardTest.java` - New: pins all four launcher routing invariants
- `QA/FULL-TEST-CHECKLIST.md` - Five new hand-check rows

## Decisions Made

- The per-row three-state widget is three `JBRadioButton`s in one `javax.swing.ButtonGroup` — confirmed after checking `com.intellij.ui.components` for a platform tri-state alternative; none exists (resolves 88-RESEARCH.md Assumption A4: no substitution needed).
- The mask-character/raw-tail region is replaced by a read-only `JBTextArea` preview plus a static "Options left Leave... untouched" label, since `SetoptsComposeTriStateResult` carries no `unknownByBytes` data (unlike `SetoptsPreview`) — the callout is static explanatory text, not a computed value.
- `ComposerLauncher.isCaretOnSetoptsInCode(Editor)` is a new package-private helper ORing three `isCaretOnCall(editor, keyword)` calls rather than widening `isCaretOnCall`'s own signature, per the plan's explicit instruction to reuse the existing mechanics rather than write new document-reading code.
- The not-editable notice reuses `ComposerNotices.requestFailed(kindLabel, reason)` rather than adding a fourth `ComposerNotices.Reason` — `ComposerNotices.java` is not in this plan's `files_modified` list, and its class javadoc frames its three reasons as the vocabulary "this and later composer plans surface," signaling reuse over growth.
- `ComposerLauncher.uriOf(VirtualFile)` mirrors `BbjCompileAction`'s own URI conversion (`file.toNioPath().toUri().toString()`, falling back to `file.getUrl()`) — the same URI shape the server's document store already resolves for `bbj/compile`, avoiding a second, potentially-mismatched conversion.
- `DISC-06` marked complete: both IDE halves now exist (88-06 VS Code, this plan IntelliJ IDE), satisfying the requirement's exact wording (generate-new and edit-in-place, both statically-safe shapes, both IDEs). `DISC-05` was deliberately left untouched, already marked complete from Wave 2 (Plans 88-01/88-02).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Test defect] Two per-file source-guard assertions needed generalizing, not deleting, once a second dialog/intention followed the same rule**
- **Found during:** Task 1 and Task 3 verification runs
- **Issue:** `ComposerDialogRefreshSourceGuardTest`'s `eachDialogDisablesOkBeforeItsFirstPreviewRoundTripAndOnAnyLaterFailure` hard-coded its "expects a third `setOKActionEnabled(false)`" exception to a single file identity (`SETOPTS_SOURCE`); `ComposerIntentionPreviewSourceGuardTest`'s `invokeAndIsAvailableAreUndisturbedOnEveryIntention` hard-coded a single-keyword `isCaretOnCall(editor,` occurrence check for every intention. Both rules are structurally correct in general, but `SetoptsTriStateComposerDialog` also follows the CR-01 debounce rule (needing the same third disable), and `ConfigureSetoptsInCodeIntention` gates on three keywords via a dedicated helper (`isCaretOnSetoptsInCode`) rather than the single-keyword helper.
- **Fix:** Generalized the first check to a `DEBOUNCED_DIALOG_SOURCES` list (both `SetoptsComposerDialog` and `SetoptsTriStateComposerDialog` expect 3); scoped the second check per-source (`SETOPTS_IN_CODE_SOURCE` asserts `isCaretOnSetoptsInCode` instead of `isCaretOnCall`). Neither assertion was weakened or deleted — both still enforce every dialog/intention follows its applicable rule.
- **Files modified:** `ComposerDialogRefreshSourceGuardTest.java`, `ComposerIntentionPreviewSourceGuardTest.java`
- **Verification:** Both test files pass in full (`ComposerDialogRefreshSourceGuardTest`: 12/12, `ComposerIntentionPreviewSourceGuardTest`: 5/5)
- **Committed in:** `8ef79d78` (Task 1), `455e4f82` (Task 3)

**2. [Rule 1 - Bug] `DecodeEquality::sameSetopts` substring-collides with the new `DecodeEquality::sameSetoptsInCode`**
- **Found during:** Task 2 implementation, before running the test (caught by inspection while updating `ComposerApplyGuardSourceGuardTest`)
- **Issue:** `"DecodeEquality::sameSetopts"` is a literal prefix of `"DecodeEquality::sameSetoptsInCode"` (a method reference has no trailing `(` to disambiguate on). Adding two new `DecodeEquality::sameSetoptsInCode` call sites to `ComposerLauncher.java` would have silently broken `allFourEditFlowsReachTheGuardWithTheirOwnComparator`'s existing `assertEquals(1, countOccurrences(text, "DecodeEquality::sameSetopts"), ...)` — the count would jump from 1 to 3 (1 exact + 2 substring matches inside the longer literal).
- **Fix:** Subtract the longer literal's own count from the shorter one before asserting: `countOccurrences(text, "DecodeEquality::sameSetopts") - sameSetoptsInCodeCount`, with a separate `assertEquals(2, sameSetoptsInCodeCount, ...)` for the new comparator.
- **Files modified:** `ComposerApplyGuardSourceGuardTest.java`
- **Verification:** `ComposerApplyGuardSourceGuardTest` passes in full (10/10)
- **Committed in:** `bb557544` (Task 2)

---

**Total deviations:** 2 auto-fixed (2 test-defect fixes, both Rule 1 — pre-existing test assertions that needed widening/scoping to remain correct once a second dialog/intention/comparator legitimately followed the same rule, never a weakening of what any assertion enforces)
**Impact on plan:** Necessary to keep every source guard both passing and meaningful; no scope creep, no behavior change to production code beyond what Tasks 1-3 specified.

## Issues Encountered

**QA/FULL-TEST-CHECKLIST.md row-number collision (not a defect, documented for the record):** the plan's own acceptance criterion `grep -cE '^\| 16 \| ' QA/FULL-TEST-CHECKLIST.md` is `"1"`, expecting the new VS Code row 16 to be the file's only row-16 line. The IntelliJ table already has a pre-existing row 16 ("Refresh Java Classes keeps language features online", added by Phase 86) with an identical `| 16 | ` prefix — the two tables' independent 1-based numbering means row numbers collide across tables by design (row 14 already collides the same way, added by Phases 84/85). After this plan's edit the grep reports `2`, not `1`. This is a pre-existing property of the checklist's per-table numbering scheme that this plan's own row addition cannot avoid without renumbering an unrelated, already-referenced IntelliJ row (which risks breaking cross-references to "row 16"/"row 18" elsewhere in STATE.md and prior SUMMARYs) — the two new VS Code rows (15, 16) and three new IntelliJ rows (19, 20, 21) are present, correctly numbered within their own table, and correctly worded per the plan's own row-content instructions. The IntelliJ row 21 acceptance grep (`is "1"`) passes cleanly since no other table reaches row 21.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- DISC-06 (#475) is closed: both IDEs now offer a tri-state Set/Clear/Leave SETOPTS-in-code composer with edit-in-place for the two statically-safe shapes and compose-new for a blank block, all writes guarded by a fresh server re-decode.
- Phase 89 (composer discoverability, DISC-01's persistent per-line marker) can build directly on this plan's `ConfigureSetoptsInCodeIntention` trigger without any interim UI to remove first.
- `cd bbj-intellij && ./gradlew test --offline` exits 0 (736 tests, 0 failures, 0 errors — whole IntelliJ JUnit suite, no regressions)
- `cd bbj-intellij && ./gradlew buildPlugin --offline` exits 0 (plugin archive builds with the new registration and resources)
- No file under `bbj-vscode/` was modified by this plan (verified via `git diff --stat` against the pre-plan commit)
- QA row 21 (mask-width falsification) is an explicit hand-check against a live BBjServices — 88-RESEARCH.md Assumption A2 (16-byte mask padding) remains unfalsified by any automated test in this repo; it is a UAT item, not a phase blocker, per the plan's own framing.
- No other blockers

## Self-Check: PASSED

All 13 modified/created files verified present on disk; all 3 task commit hashes
(`8ef79d78`, `bb557544`, `455e4f82`) verified present in `git log --oneline --all`.

---
*Phase: 88-setopts-in-code-hovers-tri-state-composer*
*Completed: 2026-09-07*
