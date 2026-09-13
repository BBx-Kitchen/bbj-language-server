---
phase: 89-cvs-composer-msgbox-expressions-composer-discoverability
plan: 08
subsystem: composer
tags: [intellij, cvs, msgbox, swing, composer, java]

# Dependency graph
requires:
  - phase: 89-cvs-composer-msgbox-expressions-composer-discoverability
    provides: "plan 89-04's ComposerLauncher.launchAt/ComposerLensKinds/BbjOpenComposerAtAction cue-click wiring"
  - phase: 89-cvs-composer-msgbox-expressions-composer-discoverability
    provides: "plan 89-07's pinned CVS() wire contract (cvsDecodeCall/cvsPreview, CvsCatalogs/CvsDecodeResult/CvsPreview DTOs, DecodeEquality.sameCvs) and the MsgboxReplace/hasOptions payload"
provides:
  - CvsComposerDialog -- a flat, titled, debounced CVS() composer dialog over bbj/composer/cvs/preview
  - ComposerLauncher.Kind.CVS with launchAt wiring, openCvs (guarded edit-in-place, not-editable reason, compose-new)
  - MsgboxComposerDialog's compose-and-replace banner and read-only original-expression field
  - ComposerReplaceBannerSourceGuardTest pinning the MSGBOX replace wiring
affects: [89-10-cvs-alt-enter-and-editor-popup, 89-13-full-uat-and-verification]

# Actuals (#2632)
actuals:
  tokens: 12200
  tasks: 2
  commits: 2

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "A flat single-panel checkbox catalog (no byte-group sections, no scroll pane) is the lighter alternative to SETOPTS's grouped/scrolled layout, reusing the exact same ComposerFlow/PreviewDebouncer/AlarmScheduler/scheduleRefresh plumbing"
    - "A server-driven compose-and-replace banner (verbatim server text, no client-side wording) plus a read-only original-expression field is the reusable shape for showing a user what an undecodable expression will discard before Apply"

key-files:
  created:
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/CvsComposerDialog.java
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerReplaceBannerSourceGuardTest.java
  modified:
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ComposerLauncher.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/MsgboxComposerDialog.java
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerApplyGuardSourceGuardTest.java
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerDialogRefreshSourceGuardTest.java
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerLauncherChainSourceGuardTest.java

key-decisions:
  - "CvsComposerDialog's chars field keeps its catalog tooltip unconditionally (set once in createCenterPanel, never touched again) while toggling only setEnabled/foreground on each preview -- the tooltip and the disable state are two independent concerns, and coupling them would risk losing the tooltip on disablement."
  - "The chars field/label default foreground colors are captured once in createCenterPanel (not hard-coded) so re-enabling after a disabled preview restores the platform's actual look-and-feel color rather than an assumed one."
  - "ComposerDialogRefreshSourceGuardTest's SETOPTS-only scheduleRefresh test was generalized to loop over DEBOUNCED_DIALOG_SOURCES (now SETOPTS, the tri-state dialog, and CVS) rather than adding a third near-duplicate hard-coded test method."
  - "ComposerLauncher.java's per-task commit split: the trivial decoded.replace/null call-site edit inside openMsgbox (Task 2) was deferred out of Task 1's commit and applied together with MsgboxComposerDialog.java's constructor-signature change, since a commit combining the two independently would not compile standalone."

patterns-established:
  - "A dialog whose live preview is coalesced through PreviewDebouncer is added to both ComposerDialogRefreshSourceGuardTest's DIALOG_SOURCES and DEBOUNCED_DIALOG_SOURCES lists in the same task that introduces it, keeping the generalized scheduleRefresh/OK-disable-count assertions self-updating."

requirements-completed: [DISC-02, DISC-03]

coverage:
  - id: D1
    description: "ComposerLauncher.Kind.CVS opens a flat, titled, debounced Compose/Configure CVS() dialog: pre-filled for edit inside an editable CVS() call, blank for compose-new elsewhere, with no byte-group headers and no scroll pane"
    requirement: "DISC-03"
    verification:
      - kind: unit
        ref: "ComposerDialogRefreshSourceGuardTest (CvsComposerDialog.java added to DIALOG_SOURCES/DEBOUNCED_DIALOG_SOURCES, all shared assertions re-run green)"
        status: pass
      - kind: unit
        ref: "grep-based acceptance criteria: new PreviewDebouncer( exactly once, JBScrollPane count 0 (#649)"
        status: pass
    human_judgment: true
    rationale: "Visible dialog layout, chars-field grey-out, and OK-gating behaviour in a running IntelliJ IDE are covered by plan 89-13's end-of-phase human checks, per this plan's own <verification> item 4."
  - id: D2
    description: "Editing an editable CVS() call replaces only its call span through StaleEditGuard with DecodeEquality::sameCvs and a re-issued cvsDecodeCall; a non-editable call shows the server's reason and opens no dialog; compose-new inserts at the caret"
    requirement: "DISC-03"
    verification:
      - kind: unit
        ref: "ComposerApplyGuardSourceGuardTest (six applyIfUnchanged/replaceString call sites, DecodeEquality::sameCvs exactly once, cvsDecodeCall( exactly twice)"
        status: pass
      - kind: unit
        ref: "ComposerLauncherChainSourceGuardTest (flow.launch( now six -- one per kind including CVS)"
        status: pass
    human_judgment: false
  - id: D3
    description: "MsgboxComposerDialog shows the server's compose-and-replace banner and the original options expression read-only at the top of the dialog when decoded.replace is present, adding no extra confirmation dialog; a decoded constant sum or literal shows neither"
    requirement: "DISC-02"
    verification:
      - kind: unit
        ref: "ComposerReplaceBannerSourceGuardTest (constructor parameter, banner sourced from replace.banner with no hard-coded copy, read-only original-expression field, zero Messages. calls, both components gated behind replace != null, single decoded.replace call site in ComposerLauncher)"
        status: pass
    human_judgment: false
  - id: D4
    description: "The full IntelliJ test suite stays green after both changes, and no plan/decision/threat id leaked into the new or edited source/test comments"
    verification:
      - kind: unit
        ref: "./gradlew test --offline (790 tests, 0 failures)"
        status: pass
      - kind: other
        ref: "register check: git diff <first commit>~1..HEAD -- bbj-intellij/src, zero matches for the banned id regex"
        status: pass
    human_judgment: false

duration: 10min
completed: 2026-09-12
status: complete
---

# Phase 89 Plan 08: IntelliJ CVS() Composer and MSGBOX Compose-and-Replace Summary

**A new flat, debounced `CvsComposerDialog` wires `ComposerLauncher.Kind.CVS` end-to-end (guarded edit-in-place, not-editable reason, compose-new), and `MsgboxComposerDialog` now shows the server's compose-and-replace banner plus the original options expression read-only whenever the language server could not decode it.**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-09-12T09:31:24Z
- **Completed:** 2026-09-12T09:42:19Z
- **Tasks:** 2
- **Files modified:** 8 (2 created, 6 modified)

## Accomplishments
- `CvsComposerDialog` (#649): a flat, titled "Operations (applied in ascending order)" checkbox list over `catalogs.bits` (no byte-group headers, no scroll pane -- one flat panel), a `String` expression field kept read-only in edit mode, an "Assign result to (optional)" field visible only in compose-new, and a `chars` field that stays disabled-but-visible with its catalog tooltip preserved whenever the latest preview reports `charsEnabled: false`. Live preview flows through the same `ComposerFlow`/`PreviewDebouncer(300ms)`/`AlarmScheduler` plumbing every other debounced dialog uses, gated behind a `scheduleRefresh()` helper that disables OK before triggering the debouncer. OK stays disabled until the first preview resolves and again on any invalid/unavailable preview.
- `ComposerLauncher.Kind.CVS` (label `CVS()`) added; the `launchAt` switch gained a CVS branch mirroring MSGBOX's shape (`cvsDecodeCall` -> `openCvs`), including the same `fromCue` stale-cue gate the other branches use. `openCvs` renders `ComposerNotices.requestFailed` for a `found && !editable` decode (never opening a dialog), opens the guarded edit dialog for `found && editable` (applying through a fresh `StaleEditGuard` with `DecodeEquality::sameCvs` and a re-issued `cvsDecodeCall`, replacing `[callStart, callEnd)`), and opens compose-new otherwise, inserting at the caret.
- `MsgboxComposerDialog` gained a final `@Nullable MsgboxReplace replace` constructor parameter. When present, `createCenterPanel` renders the server's `replace.banner` text verbatim (with `AllIcons.General.BalloonWarning`) and a read-only `originalOptionsField` holding `replace.originalOptions`, both before the schematic preview; when `replace == null` neither component exists. No `Messages.` confirmation dialog was added anywhere. `ComposerLauncher.openMsgbox` now passes `decoded.replace` on the edit path and `null` on compose-new.
- Source guards updated to the new truth: `ComposerApplyGuardSourceGuardTest` now expects six `applyIfUnchanged(`/`replaceString(` call sites, one `DecodeEquality::sameCvs` reference, and two `cvsDecodeCall(` occurrences (renamed to `everyEditFlowReachesTheGuardWithItsOwnComparator`); `ComposerDialogRefreshSourceGuardTest` added `CvsComposerDialog.java` to both `DIALOG_SOURCES` and `DEBOUNCED_DIALOG_SOURCES` and generalized the previously SETOPTS-only `scheduleRefresh()` assertion into a loop over every debounced dialog; `ComposerLauncherChainSourceGuardTest` now expects six `flow.launch(` calls (one per kind including CVS). New `ComposerReplaceBannerSourceGuardTest` pins the MSGBOX replace-banner wiring end to end.

## Task Commits

1. **Task 1: CVS() end-to-end in IntelliJ -- launcher kind, flat debounced dialog, guarded edit, reason notice** - `437f6517` (feat)
2. **Task 2: MSGBOX compose-and-replace banner and read-only original expression in the IntelliJ dialog** - `48ea3c4a` (feat)

**Plan metadata:** captured in this SUMMARY's own commit.

_Task 1 is `type="tracer"`; its own `<verify>` (targeted composer/concurrency tests, re-run at commit time) passed, and per the auto-mode tracer feedback gate no expansion task followed before this feedback check -- Task 2 is an independent feature (MSGBOX), not an expansion of the CVS tracer slice._

## Files Created/Modified
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/CvsComposerDialog.java` - New flat, debounced CVS() composer dialog
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ComposerLauncher.java` - `Kind.CVS`, `openCvs`, and `openMsgbox`'s `decoded.replace` pass-through
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/MsgboxComposerDialog.java` - `replace` constructor parameter, banner + read-only original-expression UI
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerReplaceBannerSourceGuardTest.java` - New file: MSGBOX replace-banner wiring guard
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerApplyGuardSourceGuardTest.java` - Six-guarded-write/one-sameCvs/two-cvsDecodeCall counts
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerDialogRefreshSourceGuardTest.java` - CVS dialog added to both dialog-source lists, generalized scheduleRefresh assertion
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerLauncherChainSourceGuardTest.java` - Six-flow.launch( count

## Decisions Made
- The CVS chars field's tooltip is set once and never cleared; only `setEnabled`/foreground toggle per preview, so the tooltip cannot be accidentally lost on disablement.
- Default foreground colors for the chars field/label are captured live from the constructed components rather than hard-coded, so re-enabling restores the platform's actual look-and-feel color.
- `ComposerDialogRefreshSourceGuardTest`'s SETOPTS-only `scheduleRefresh()` test was generalized to loop over `DEBOUNCED_DIALOG_SOURCES` instead of adding a third near-duplicate method, since CVS reuses the identical debounce contract.
- `ComposerLauncher.java`'s two task-owned edits (the new CVS branch/`openCvs`, and `openMsgbox`'s `decoded.replace` pass-through) were split across the two task commits by temporarily reverting the Task 2 line before Task 1's commit and reapplying it before Task 2's commit, since staging the whole file with both changes together would have made either commit's tree fail to compile standalone against the other task's not-yet-committed dialog-class change.

## Deviations from Plan

None - plan executed exactly as written. The `ComposerLauncher.java` staging split above is a git-mechanics detail of *how* the two task commits were produced, not a change to the plan's action text; it required no additional code beyond what the plan already specified.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- The IntelliJ half of both composer changes (CVS() end-to-end, MSGBOX compose-and-replace banner) is in place and pinned by source guards; the full IntelliJ test suite passes (790 tests, 0 failures).
- Plan 89-10 can add the Alt+Enter intention and editor-popup action that open the CVS dialog -- `ComposerLauncher.Kind.CVS`/`openCvs` already exist for it to call into.
- Visible dialog behaviour (layout, chars-field grey-out, OK gating, the MSGBOX banner rendering) in a running IntelliJ IDE is deferred to plan 89-13's end-of-phase human checks, per this plan's own `<verification>` item 4 -- no IntelliJ sandbox render was exercised in this plan.
- No blockers.

---
*Phase: 89-cvs-composer-msgbox-expressions-composer-discoverability*
*Completed: 2026-09-12*

## Self-Check: PASSED

- FOUND: `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/CvsComposerDialog.java`
- FOUND: `bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerReplaceBannerSourceGuardTest.java`
- FOUND: `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ComposerLauncher.java`
- FOUND: `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/MsgboxComposerDialog.java`
- FOUND: `bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerApplyGuardSourceGuardTest.java`
- FOUND: `bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerDialogRefreshSourceGuardTest.java`
- FOUND: `bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerLauncherChainSourceGuardTest.java`
- FOUND: commit `437f6517` (Task 1) in `git log`
- FOUND: commit `48ea3c4a` (Task 2) in `git log`
- Re-ran acceptance criteria for both tasks: all `grep` checks pass (CVS enum/switch/labelOf, one `new PreviewDebouncer(`, `JBScrollPane` count 0, `DecodeEquality::sameCvs` present, `MsgboxReplace replace` present, `decoded.replace` present)
- Re-ran plan `<verification>` steps 1-3: targeted composer/concurrency suite, full `./gradlew test --offline` (790 tests, 0 failures), and the register check across `git diff 437f6517~1..HEAD -- bbj-intellij/src` -- zero matches for the banned plan/decision/threat id regex
