---
phase: 93-composer-robustness-consolidation
verified: 2026-09-18T10:35:32Z
status: gaps_found
score: 7/9 must-haves verified
behavior_unverified: 0
overrides_applied: 0
gaps:
  - truth: "The composer surface never raises an IDE-internal error from a malformed language-server payload — extended beyond the three named fields (catalogs sub-lists, flagsRange, eventMaskRange, hexRange) to every language-server-supplied field a write path dereferences without a bounds check"
    status: failed
    reason: "ComposerLauncher.openSetoptsInCodeAbsolute (line 619) and openSetoptsInCodeChain (lines 663-664) dereference ed.line / chain.startLine / chain.endLine via Document.getLineStartOffset(int) with no bounds check against the live document's line count. Document.getLineStartOffset throws IndexOutOfBoundsException for a line number < 0 or >= getLineCount(). This is the identical failure class (malformed/version-skewed language-server response -> uncaught exception on the EDT inside a WriteCommandAction -> IDE Internal Error balloon) that this same phase built ComposerEditRanges/ComposerNotices.MALFORMED_EDIT to close for the neighbouring hexRange field in the very same two methods, a few lines above. The phase's own code review (93-REVIEW.md, CR-01, status critical) found and documented this gap on 2026-09-18T10:30:48Z; no fix commit exists after the review (git log shows d04274ed 'docs(93): add code review report' as the latest commit touching this area, with the finding still uncommitted-to-code)."
    artifacts:
      - path: "bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ComposerLauncher.java"
        issue: "Lines 619, 663-664: ed.line / chain.startLine / chain.endLine passed to Document.getLineStartOffset(int) with no lower/upper bound check, unlike the ed.hexRange field two lines above (line 604) which this phase's plan 93-03 did guard with ComposerEditRanges.isUsable(...)."
    missing:
      - "A document-line-count bound check before each of the three dereferences (ed.line in openSetoptsInCodeAbsolute; chain.startLine/chain.endLine in openSetoptsInCodeChain), rendering ComposerNotices.malformedEdit(...) and aborting before the write command is entered — mirroring the pattern already established for hexRange in the same two methods."
deferred: []
human_verification:
  - test: "Success criterion #5: open MSGBOX, addWindow, addChildWindow, CVS, SETOPTS, and SETOPTS-in-code composers via all three entry points each (lightbulb intention, editor context-menu action, composer cue click-through) and confirm identical dialogs, defaults, and generated statements to before this phase's consolidation."
    expected: "No visible change to any dialog's fields, labels, default selections, or the BBj statement/block written into the source file, across all six composer kinds and both consolidated dialog/intention/action families."
    why_human: "This is a no-observable-delta claim about live IDE rendering and write behavior across six composer kinds; a headless JUnit source guard can pin structural literals but cannot render a Swing dialog or compare generated output visually. Flagged human_judgment: true in 93-01, 93-06, 93-07, 93-08's own SUMMARY coverage blocks."
  - test: "Open a composer dialog in both the Light and Darcula IntelliJ themes and confirm error text renders in the theme-aware error colour (NamedColorUtil.getErrorForeground()), and that a stalled preview also renders in that same colour instead of default gray."
    expected: "Error text and a stalled-preview label are visibly the theme's error red in both Light and Darcula — two deliberate colour changes introduced by plan 93-01 (D-02, D-04), not a no-observable-delta."
    why_human: "Colour rendering across IDE themes cannot be verified by a headless JUnit test; requires opening dialogs in both themes."
  - test: "Type a non-hex character into SetoptsComposerDialog's raw-hex field and confirm the same field-scoped error message text appears next to the field and Apply/OK is refused, matching pre-phase behaviour exactly."
    expected: "Message text is byte-identical to the deleted Java copy's wording ('must be 0-9 or A-F, up to 14 digits'); Apply/OK stays disabled until the field is corrected."
    why_human: "No headless JUnit test in this build exercises the live LSP round trip end-to-end with a real language-server response; plan 93-08's own SUMMARY flags this human_judgment: true (coverage item D4)."
  - test: "Open both addWindow and addChildWindow composers in create and edit mode and confirm they still open, preview, and write exactly as before the AddWindowFamilyComposerDialogBase extraction (93-06), with no change to any label, default value, or generated statement."
    expected: "Both dialogs behave identically to their pre-consolidation form."
    why_human: "Plan 93-06's own SUMMARY flags this human_judgment: true (coverage item D3) — a no-observable-delta claim about live dialog rendering/writing a headless test cannot verify."
---

# Phase 93: Composer Robustness & Consolidation Verification Report

**Phase Goal:** The composer surface never raises an IDE-internal error and never writes
syntax-breaking text into a developer's source file, and its duplicated dialogs, intentions,
launch actions and Swing helpers each exist exactly once.

**Verified:** 2026-09-18T10:35:32Z
**Status:** gaps_found
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | SC1 (COMP-03): a malformed/partial `bbj/composer/catalogs` response shows the same graceful not-ready message a fully-null response gets, for all six composer kinds | ✓ VERIFIED | `ComposerCatalogsCheck.isUsable(...)` (4 overloads) gates all 6 `ComposerLauncher.open*` entry points (`grep` confirms 6 call sites at lines 296/356/377/479/547/685, each `catalogs == null \|\| !ComposerCatalogsCheck.isUsable(catalogs)`, reusing the existing `notReady` notice). Behaviourally tested by `ComposerCatalogsCheckTest` (null/empty/populated per sub-list) and structurally pinned by `ComposerCatalogsShapeSourceGuardTest`. |
| 2 | SC2 (COMP-04): text typed into a composer dialog that would break BBj syntax is rejected/escaped before the write, for all six dialogs | ✓ VERIFIED | Server (`bbj-vscode/src/setopts-catalog.ts:346-384`) computes `valid`/`rawTailError` from the single raw-tail regex; Java DTOs mirror it (`ComposerModels.java` — 7 `valid` fields, 1 `rawTailError`); `SetoptsComposerDialog.apply` gates `setOKActionEnabled(p.valid)` and renders `p.rawTailError`; `SetoptsTriStateComposerDialog.apply` gates `setOKActionEnabled(result.valid)`; VS Code webview (`setopts-composer-webview.ts:330`) disables `Apply` on `!m.valid`. `grep -rn "setOKActionEnabled(true)"` across all composer dialogs returns zero hits — the unconditional-enable this requirement targeted is gone everywhere. |
| 3 | SC3 (COMP-05, literal scope): a `flagsRange`/`eventMaskRange` (and, per D-01/D-10, `hexRange`) that does not carry exactly two elements aborts the edit with `ComposerNotices.malformedEdit(...)` instead of throwing `ArrayIndexOutOfBoundsException` | ✓ VERIFIED | `ComposerEditRanges.isUsable(int[])` (`range != null && range.length == 2`) guards all 4 named call sites in `ComposerLauncher.java` (lines 431, 437, 500, 604), each before its `StaleEditGuard`/write-command construction. Behaviourally tested by `ComposerEditRangesTest` (null, 0, 1, 2, 3+ elements); wiring pinned by `ComposerLauncherRangeGuardSourceGuardTest`. |
| 4 | Phase-goal completeness (derived from the goal statement's "never raises an IDE-internal error"): no other language-server-supplied field on a composer write path is dereferenced without a bounds/usability check | ✗ FAILED | `ComposerLauncher.openSetoptsInCodeAbsolute` (line 619) and `openSetoptsInCodeChain` (lines 663-664) pass `ed.line`/`chain.startLine`/`chain.endLine` straight into `Document.getLineStartOffset(int)` with no check against `editor.getDocument().getLineCount()`. An out-of-range line number throws `IndexOutOfBoundsException` on the EDT inside the same `WriteCommandAction` body this phase hardened for the neighbouring `hexRange` field two lines above. Documented as CR-01 (critical) in this phase's own `93-REVIEW.md`; unresolved in the current tree (no fix commit after the review). See Gaps Summary. |
| 5 | COMP-06: addWindow and addChildWindow dialogs share one base | ✓ VERIFIED | `AddWindowComposerDialog` and `AddChildWindowComposerDialog` both `extends AddWindowFamilyComposerDialogBase`; the base carries the preview seam, debounce wiring, sequence-counter discipline, grouped-checkbox rendering and OK-gating exactly once (`AddWindowFamilyComposerDialogBase.java`, 10152 bytes). Pinned by `AddWindowFamilyComposerDialogBaseSourceGuardTest` and the re-pointed `ComposerDialogRefreshSourceGuardTest`/`ComposerFieldValidationSourceGuardTest`. |
| 6 | COMP-07: `clip`, `labeled`, `setEnabledRecursive` (and the wider present-day family: `errorLabel`, `labeledWithError`, unavailable-preview label) exist exactly once | ✓ VERIFIED | `ComposerSwingHelpers.java` is the sole home; `grep` for `private static JPanel labeled(`/`private static JBLabel errorLabel(`/`private static String clip(`/`private static void setEnabledRecursive(`/`private static JPanel labeledWithError(` across the composer package returns zero hits — every dialog/panel now delegates. Pinned by `ComposerSwingHelpersSourceGuardTest`. |
| 7 | COMP-08: the five `Configure*Intention` classes share one base (base+thin-subclass, a recorded platform-forced deviation from #618's literal "single data-driven registration" wording — IntelliJ's `<intentionAction>` extension point instantiates via no-arg constructor with no way for an instance to learn its registration) | ✓ VERIFIED | All 5 `Configure*Intention` classes `extends ComposerIntentionBase`; `plugin.xml` still registers exactly 5 `<intentionAction>` entries naming the same 5 classes (lines 144-168), never the base. Pinned by `ComposerIntentionBaseSourceGuardTest` and the re-pointed `ComposerIntentionPreviewSourceGuardTest`. |
| 8 | COMP-09: the six composer-launch actions share one base (same recorded platform-forced deviation from #616's wording, per D-06) | ✓ VERIFIED | All 6 `BbjCompose*Action` classes `extends BbjComposeActionBase`; `plugin.xml` registrations for all 6 action ids unchanged (lines 63/70/77/84/94/101); `BbjOpenComposerAtAction` (the LSP4IJ cue action) confirmed untouched/not on the new base. Pinned by `BbjComposeActionBaseSourceGuardTest` and 3 re-pointed subclass guards. |
| 9 | SC5: every composer a user can reach (MSGBOX, addWindow, addChildWindow, CVS, SETOPTS, SETOPTS-in-code) behaves identically after consolidation — same dialogs, lightbulb/context-menu entries, cue click-through, written output — evidenced by the whole JUnit suite plus one hand UAT round | ⚠️ Needs human | JUnit half confirmed: whole IntelliJ suite 972 tests, 0 failures, 0 errors, forced `--rerun` (orchestrator-verified, independently corroborated here by the monotonically increasing per-plan counts in each SUMMARY: 886→889→904→912→944→952→968→992, though the final orchestrator count of 972 vs. 93-08's self-reported 992 is a discrepancy worth noting — see Gaps Summary). Hand UAT half not yet performed; 4 items carried to Human Verification below, matching what 93-01/93-06/93-08's own SUMMARYs already flagged `human_judgment: true`. |

**Score:** 7/9 truths verified (1 failed, 1 requires human UAT)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `bbj-intellij/.../composer/ComposerCatalogsCheck.java` | Plain-Java catalogs-shape predicate (COMP-03) | ✓ VERIFIED | Exists, 4 overloads, no `com.intellij` import, wired at 6 sites |
| `bbj-intellij/.../composer/ComposerModels.java` + `bbj-vscode/src/setopts-catalog.ts` | `valid`/`rawTailError` wire contract (COMP-04) | ✓ VERIFIED | 7 `valid` fields + 1 `rawTailError` in Java DTOs; matching TS fields; consumed by both dialogs and the VS Code webview |
| `bbj-intellij/.../composer/ComposerEditRanges.java` | Plain-Java range-length predicate (COMP-05) | ✓ VERIFIED | Exists, `isUsable(int[])`, no `com.intellij` import, wired at 4 sites |
| `bbj-intellij/.../composer/AddWindowFamilyComposerDialogBase.java` | Shared addWindow-family base (COMP-06) | ✓ VERIFIED | Exists; both dialogs extend it |
| `bbj-intellij/.../composer/ComposerSwingHelpers.java` | Shared Swing helper home (COMP-07) | ✓ VERIFIED | Exists; zero duplicate private helper defs remain in dialogs/panels |
| `bbj-intellij/.../composer/ComposerIntentionBase.java` | Shared intention base (COMP-08) | ✓ VERIFIED | Exists; all 5 intentions extend it; `plugin.xml` unchanged |
| `bbj-intellij/.../actions/BbjComposeActionBase.java` | Shared launch-action base (COMP-09) | ✓ VERIFIED | Exists; all 6 actions extend it; `plugin.xml` unchanged |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `ComposerLauncher.open*` (6 sites) | `ComposerCatalogsCheck.isUsable` | extended `catalogs == null \|\| !isUsable(...)` guard | ✓ WIRED | Confirmed by direct grep, all 6 sites |
| `ComposerLauncher` (4 range sites) | `ComposerEditRanges.isUsable` / `ComposerNotices.malformedEdit` | pre-write guard | ✓ WIRED for `flagsRange`, `eventMaskRange`, `hexRange` (2 sites) — ✗ **NOT WIRED** for `ed.line`, `chain.startLine`, `chain.endLine` (see gap) |
| `SetoptsPreview.valid`/`rawTailError` | `SetoptsComposerDialog.apply` | field read → `setOKActionEnabled`/label render | ✓ WIRED | Confirmed by direct read of `apply(SetoptsPreview p)` |
| `SetoptsComposeTriStateResult.valid` | `SetoptsTriStateComposerDialog.apply` | field read → `setOKActionEnabled` | ✓ WIRED | Confirmed |
| `plugin.xml` `<intentionAction>`/`<action>` entries | 5 intention classes / 6 action classes | unchanged `<className>` registrations | ✓ WIRED | grep confirms all 11 class names present, base never registered |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|--------------|--------|----------|
| COMP-03 (#609) | 93-05 | Malformed/partial catalogs response degrades gracefully | ✓ SATISFIED | Truth 1 |
| COMP-04 (#607) | 93-02, 93-08 | Syntax-breaking text rejected/escaped before write | ✓ SATISFIED | Truth 2 |
| COMP-05 (#591) | 93-03 | `applyHexEdit` fails gracefully instead of AIOOBE | ✓ SATISFIED (as literally scoped) — but see Truth 4 for an adjacent, unguarded crash class in the same file/phase | Truth 3, Truth 4 |
| COMP-06 (#630) | 93-06 | addWindow/addChildWindow share one base | ✓ SATISFIED | Truth 5 |
| COMP-07 (#619) | 93-01 | `clip`/`labeled`/`setEnabledRecursive` exist exactly once | ✓ SATISFIED | Truth 6 |
| COMP-08 (#618) | 93-04 | `Configure*Intention` consolidated (platform-forced base+subclass) | ✓ SATISFIED, deviation recorded | Truth 7 |
| COMP-09 (#616) | 93-07 | Composer-launch actions consolidated (platform-forced base+subclass) | ✓ SATISFIED, deviation recorded | Truth 8 |

No orphaned requirements: all 7 IDs declared across the 8 plans' `requirements:` frontmatter match REQUIREMENTS.md's Phase 93 traceability rows exactly (COMP-03 through COMP-09), and REQUIREMENTS.md marks all 7 `Complete`. That marking is accurate for each requirement's own literal wording; it does not capture the CR-01 gap below because CR-01 sits outside the named fields of any single requirement — it is a codebase-level shortfall against the phase's overarching ROADMAP goal statement, surfaced by the phase's own code review rather than by a requirement ID.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `bbj-intellij/.../composer/ComposerLauncher.java` | 619, 663-664 | Unchecked language-server-supplied line-number fields passed to `Document.getLineStartOffset` | 🛑 Blocker | CR-01 — see Gaps Summary |
| `bbj-intellij/.../composer/ComposerLauncher.java` | 313, 363, 384, 390, 403, 485, 497, 709 | `decoded.edit` dereferenced with no null check across every edit-in-place path (pre-existing, not introduced by this phase) | ⚠️ Warning | WR-01 in `93-REVIEW.md` — same risk class as CR-01 but pre-existing code, not a phase-93 regression; not counted as a phase-93 gap but worth tracking as follow-up debt |
| `bbj-vscode/src/language/setopts-in-code-request.ts` | 360-362 | `createComposeTriStateHandler` performs no defensive validation of `params.selection` | ℹ️ Info | WR-02 in `93-REVIEW.md` — client→server direction, lower severity, not part of this phase's stated (server→client) threat model |
| `bbj-vscode/src/setopts-composer-webview.ts` | 111-126 | Silent no-op when `target` carries neither `hexRange` nor `insertOffset` (pre-existing) | ℹ️ Info | IN-01 in `93-REVIEW.md` — pre-existing, not introduced by this phase's diff to this file |

No `TBD`/`FIXME`/`XXX` debt markers found in the phase's modified files. No planning-identifier leakage found in source/test files (each plan's own register-check already confirmed this per-plan; spot-checked here).

## Gaps Summary

**One blocking gap (CR-01), already found and documented by this phase's own code review, remains unfixed in the codebase.**

The phase's stated ROADMAP goal is: *"The composer surface never raises an IDE-internal error and never writes syntax-breaking text into a developer's source file..."* Plans 93-03 and 93-05 closed this for `flagsRange`, `eventMaskRange`, `hexRange` (both write paths), and every catalogs sub-list — genuinely and verifiably, per Truths 1 and 3 above. But `ComposerLauncher.openSetoptsInCodeAbsolute` and `openSetoptsInCodeChain` — modified by this same phase (plan 93-03 added the `hexRange` guard at line 604, two lines above the still-unguarded `ed.line` dereference at line 619) — still pass three other language-server-supplied fields (`ed.line`, `chain.startLine`, `chain.endLine`) straight into `Document.getLineStartOffset(int)` with no bound check. A malformed or version-skewed language-server response naming a line number outside the current document throws `IndexOutOfBoundsException` on the EDT inside the same `WriteCommandAction` body — the identical "IDE Internal Error balloon" failure class named in the ROADMAP's own success criterion #1, just triggered by a different field than the three already guarded.

This was not missed by the process — `93-REVIEW.md` (code review, `depth: standard`, `status: issues_found`, generated 2026-09-18T10:30:48Z, after the final plan 93-08 commit) found and documented this exact gap as CR-01 with a concrete fix sketch. No commit exists after the review that applies that fix; the latest commit (`d04274ed`) only adds the review document itself. Because this finding sits in code this phase actively modified, addresses the exact failure class the phase's goal statement names, and is unresolved, it is reported here as a blocking gap rather than deferred to a later phase (phases 94-97 cover Enterprise Manager, java-interop, Platform, and Release — none touch `ComposerLauncher` or the composer surface).

**Secondary note (not a blocking gap):** the orchestrator-supplied fact states the final IntelliJ suite is "972 tests, 0 failures, 0 errors," while plan 93-08's own SUMMARY (the last plan) self-reports "992 tests, 0 failures, 0 errors" from the same `./gradlew test --rerun` command. These two numbers disagree by 20. Both cannot be the actual current count from the same command against the same tree. This does not change the pass/fail outcome (both counts report 0 failures), but the discrepancy is unexplained and is flagged here for the record rather than silently resolved in either direction.

**Recommended next step:** a small follow-up plan (or an addition to this phase before it is considered fully closed) that applies the fix CR-01 already sketches — a document-line-count bound check before each of the three dereferences, rendering `ComposerNotices.malformedEdit(...)` and aborting before the write command is entered, mirroring the pattern this same phase already established for `hexRange` two lines above each site.

---

_Verified: 2026-09-18T10:35:32Z_
_Verifier: Claude (gsd-verifier)_
