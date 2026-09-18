---
phase: 93-composer-robustness-consolidation
verified: 2026-09-18T11:40:00Z
status: human_needed
score: 8/9 must-haves verified
behavior_unverified: 0
overrides_applied: 0
re_verification:
  previous_status: gaps_found
  previous_score: 7/9
  gaps_closed:
    - "The composer surface never raises an IDE-internal error from a malformed language-server payload — extended to ed.line, chain.startLine, chain.endLine reaching Document.getLineStartOffset(int) unchecked (CR-01)"
  gaps_remaining: []
  regressions: []
human_verification:
  - test: "Success criterion #5: open MSGBOX, addWindow, addChildWindow, CVS, SETOPTS, and SETOPTS-in-code composers via all three entry points each (lightbulb intention, editor context-menu action, composer cue click-through) and confirm identical dialogs, defaults, and generated statements to before this phase's consolidation."
    expected: "No visible change to any dialog's fields, labels, default selections, or the BBj statement/block written into the source file, across all six composer kinds and both consolidated dialog/intention/action families."
    why_human: "This is a no-observable-delta claim about live IDE rendering and write behavior across six composer kinds; a headless JUnit source guard can pin structural literals but cannot render a Swing dialog or compare generated output visually. Flagged human_judgment: true in 93-01, 93-06, 93-07, 93-08's own SUMMARY coverage blocks. The ROADMAP's own Success Criterion 5 requires this evidence as 'the whole IntelliJ JUnit suite plus one hand UAT round' — the JUnit half is now confirmed (983 tests, 0 failures, 0 errors), the hand UAT half has not been performed by any plan in this phase, including the gap-closure plan, which was scoped only to the line-bound defect."
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

**Verified:** 2026-09-18T11:40:00Z
**Status:** human_needed
**Re-verification:** Yes — after gap closure (plan 93-09, commits `3a3e3dd3`, `4821d0f6`, `469c3dc1`, `f9889c37`)

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | SC1 (COMP-03): a malformed/partial `bbj/composer/catalogs` response shows the same graceful not-ready message a fully-null response gets, for all six composer kinds | ✓ VERIFIED (regression) | `grep -c "ComposerCatalogsCheck.isUsable" ComposerLauncher.java` = 6, unchanged from initial verification. Not touched by plan 93-09's diff. |
| 2 | SC2 (COMP-04): text typed into a composer dialog that would break BBj syntax is rejected/escaped before the write, for all six dialogs | ✓ VERIFIED (regression) | `grep -rn "setOKActionEnabled(true)" composer/` = 0 hits, unchanged. `valid`/`rawTailError` wiring in `ComposerModels.java`/`SetoptsComposerDialog`/`SetoptsTriStateComposerDialog`/VS Code webview untouched by 93-09's diff. |
| 3 | SC3 (COMP-05, range-array scope): a `flagsRange`/`eventMaskRange`/`hexRange` that does not carry exactly two elements aborts the edit with `ComposerNotices.malformedEdit(...)` instead of throwing `ArrayIndexOutOfBoundsException` | ✓ VERIFIED (regression) | `ComposerEditRanges.isUsable(int[])` unchanged (still `range != null && range.length == 2`); `grep -c "ComposerEditRanges.isUsable(" ComposerLauncher.java` = 4, unchanged. `ComposerEditRangesTest`'s 6 pre-existing array-length cases still pass (confirmed in the 14-test run below). |
| 4 | Phase-goal completeness — CR-01 (previously FAILED): no language-server-supplied field on a composer write path is dereferenced without a bounds/usability check, including `ed.line`/`chain.startLine`/`chain.endLine` | ✓ VERIFIED | `ComposerEditRanges.isUsableLine(int,int)` and `isUsableLineRegion(int,int,int)` added (`ComposerEditRanges.java:34-55`, no `com.intellij` import). Wired: `ComposerLauncher.java:611-615` guards `ed.line` in `openSetoptsInCodeAbsolute` before `new StaleEditGuard(` at line 616; `ComposerLauncher.java:663-667` guards `chain.startLine`/`chain.endLine` in `openSetoptsInCodeChain` before `new StaleEditGuard(` at line 668. Both render `ComposerNotices.malformedEdit(labelOf(Kind.SETOPTS_IN_CODE))` and `return` before any write. Boundary re-verified directly against the reviewer's own gate: `isUsableLineRegion(0, 10, 10)` is `false` (endLine==lineCount rejected, confirmed by direct read of the predicate body: `isUsableLine(10,10)` is `10 < 10` = false), `isUsableLineRegion(5, 5, 10)` is `true` (equal-line region accepted), `isUsableLineRegion(5, 2, 10)` is `false` (descending region rejected). `ComposerEditRangesTest` (14 tests, 0 failures — ran fresh this session) and `ComposerLauncherRangeGuardSourceGuardTest` (11 tests, 0 failures — ran fresh this session) both pass, including the re-pointed whole-file `malformedEdit(` count (4→6) and new per-method ordering/count pins. |
| 5 | COMP-06: addWindow and addChildWindow dialogs share one base | ✓ VERIFIED (regression) | `AddWindowComposerDialog` and `AddChildWindowComposerDialog` both still `extends AddWindowFamilyComposerDialogBase` (confirmed by direct grep this session). Not touched by 93-09's diff. |
| 6 | COMP-07: `clip`, `labeled`, `setEnabledRecursive` (and the wider family) exist exactly once | ✓ VERIFIED (regression) | `grep` for the five duplicate-candidate private helper signatures outside `ComposerSwingHelpers.java` returns zero hits (confirmed this session). Not touched by 93-09's diff. |
| 7 | COMP-08: the five `Configure*Intention` classes share one base | ✓ VERIFIED (regression) | All 5 `Configure*Intention` classes still `extends ComposerIntentionBase` (confirmed by direct grep this session). Not touched by 93-09's diff. |
| 8 | COMP-09: the six composer-launch actions share one base | ✓ VERIFIED (regression) | All 6 `BbjCompose*Action` classes still `extends BbjComposeActionBase` (confirmed by direct grep this session). Not touched by 93-09's diff. |
| 9 | SC5: every composer a user can reach behaves identically after consolidation, evidenced by the whole JUnit suite plus one hand UAT round | ⚠️ Needs human | JUnit half now fully confirmed and the prior 972-vs-992 discrepancy is resolved by direct observation this session: `./gradlew test --rerun` (forced, non-cached — `:test` executed, not `UP-TO-DATE`) followed by aggregating all 110 fresh `TEST-*.xml` files (timestamps confirmed generated during this run) gives **983 tests, 0 failures, 0 errors** — matching 93-09-SUMMARY.md's self-report exactly and matching the orchestrator-supplied authoritative count. Hand UAT half still not performed by any plan; carried to Human Verification below. |

**Score:** 8/9 truths verified (0 failed, 1 requires human UAT)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `bbj-intellij/.../composer/ComposerCatalogsCheck.java` | Plain-Java catalogs-shape predicate (COMP-03) | ✓ VERIFIED | Unchanged since initial verification |
| `bbj-intellij/.../composer/ComposerModels.java` + `bbj-vscode/src/setopts-catalog.ts` | `valid`/`rawTailError` wire contract (COMP-04) | ✓ VERIFIED | Unchanged |
| `bbj-intellij/.../composer/ComposerEditRanges.java` | Plain-Java range/line-bound predicates (COMP-05) | ✓ VERIFIED | Extended this plan: `isUsable(int[])` unchanged, plus new `isUsableLine(int,int)` and `isUsableLineRegion(int,int,int)`; still zero `com.intellij` import |
| `bbj-intellij/.../composer/AddWindowFamilyComposerDialogBase.java` | Shared addWindow-family base (COMP-06) | ✓ VERIFIED | Unchanged |
| `bbj-intellij/.../composer/ComposerSwingHelpers.java` | Shared Swing helper home (COMP-07) | ✓ VERIFIED | Unchanged |
| `bbj-intellij/.../composer/ComposerIntentionBase.java` | Shared intention base (COMP-08) | ✓ VERIFIED | Unchanged |
| `bbj-intellij/.../actions/BbjComposeActionBase.java` | Shared launch-action base (COMP-09) | ✓ VERIFIED | Unchanged |
| `bbj-intellij/.../composer/ComposerLauncher.java` (openSetoptsInCodeAbsolute/openSetoptsInCodeChain) | Line-bound guards before write (CR-01 closure) | ✓ VERIFIED | Two new guard branches, both before `new StaleEditGuard(` |
| `bbj-intellij/.../composer/ComposerEditRangesTest.java` | Behavioural coverage of new predicates | ✓ VERIFIED | 14 tests total (6 pre-existing + 8 new), 0 failures |
| `bbj-intellij/.../composer/ComposerLauncherRangeGuardSourceGuardTest.java` | Source-guard pins for the two new sites | ✓ VERIFIED | 11 tests total, 0 failures, includes re-pointed whole-file count and per-method ordering/count assertions |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `ComposerLauncher.open*` (6 sites) | `ComposerCatalogsCheck.isUsable` | extended `catalogs == null \|\| !isUsable(...)` guard | ✓ WIRED | Regression-checked, unchanged |
| `ComposerLauncher` (4 range-array sites) | `ComposerEditRanges.isUsable` / `ComposerNotices.malformedEdit` | pre-write guard | ✓ WIRED | Regression-checked, unchanged |
| `openSetoptsInCodeAbsolute` (`ed.line`) | `ComposerEditRanges.isUsableLine` / `ComposerNotices.malformedEdit` | pre-write guard, before `new StaleEditGuard(` | ✓ WIRED | Direct read of `ComposerLauncher.java:611-616`; ordering pinned by `ComposerLauncherRangeGuardSourceGuardTest#theRangeCheckPrecedesTheWriteCommandInEveryGuardedMethod` |
| `openSetoptsInCodeChain` (`chain.startLine`/`chain.endLine`) | `ComposerEditRanges.isUsableLineRegion` / `ComposerNotices.malformedEdit` | pre-write guard, before `new StaleEditGuard(` | ✓ WIRED | Direct read of `ComposerLauncher.java:663-668`; ordering pinned by the same source guard test |
| `SetoptsPreview.valid`/`rawTailError` | `SetoptsComposerDialog.apply` | field read → `setOKActionEnabled`/label render | ✓ WIRED | Regression-checked, unchanged |
| `plugin.xml` `<intentionAction>`/`<action>` entries | 5 intention classes / 6 action classes | unchanged `<className>` registrations | ✓ WIRED | Regression-checked, unchanged |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| `isUsableLine`/`isUsableLineRegion` boundary correctness | `./gradlew test --tests "*.ComposerEditRangesTest"` | 14 tests, 0 failures, 0 errors (fresh XML, timestamp 2026-09-18T11:34:10Z) | ✓ PASS |
| New guard sites pinned to shared predicate, ordered before write command | `./gradlew test --tests "*.ComposerLauncherRangeGuardSourceGuardTest"` | 11 tests, 0 failures, 0 errors (fresh XML) | ✓ PASS |
| No new `Reason`/`Severity` introduced | `./gradlew test --tests "*.ComposerNoticesTest"` | 10 tests, 0 failures, 0 errors (fresh XML) | ✓ PASS |
| Neighbouring write-path invariants undisturbed | `./gradlew test --tests "*.ComposerApplyGuardSourceGuardTest" --tests "*.SetoptsInCodeSourceGuardTest" --tests "*.ComposerCatalogsShapeSourceGuardTest" --tests "*.ComposerLauncherChainSourceGuardTest"` | `BUILD SUCCESSFUL` | ✓ PASS |
| Whole IntelliJ suite, forced re-run | `./gradlew test --rerun` | `:test` executed (not cached); aggregated across all 110 fresh `TEST-*.xml` files: 983 tests, 0 failures, 0 errors | ✓ PASS |
| Planning-identifier leakage in the gap-closure diff | `git diff 724919d9 469c3dc1 -- <4 changed files> \| grep -inE "COMP-0\|D-0\|D-1[0-9]?\|CR-0\|GAP-\|93-09\|plan 09"` | zero matches | ✓ PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|--------------|--------|----------|
| COMP-03 (#609) | 93-05 | Malformed/partial catalogs response degrades gracefully | ✓ SATISFIED | Truth 1 |
| COMP-04 (#607) | 93-02, 93-08 | Syntax-breaking text rejected/escaped before write | ✓ SATISFIED | Truth 2 |
| COMP-05 (#591) | 93-03, 93-09 | Range arrays AND line numbers fail gracefully instead of throwing on a malformed language-server payload | ✓ SATISFIED (CR-01 gap now closed) | Truth 3, Truth 4 |
| COMP-06 (#630) | 93-06 | addWindow/addChildWindow share one base | ✓ SATISFIED | Truth 5 |
| COMP-07 (#619) | 93-01 | `clip`/`labeled`/`setEnabledRecursive` exist exactly once | ✓ SATISFIED | Truth 6 |
| COMP-08 (#618) | 93-04 | `Configure*Intention` consolidated (platform-forced base+subclass) | ✓ SATISFIED, deviation recorded | Truth 7 |
| COMP-09 (#616) | 93-07 | Composer-launch actions consolidated (platform-forced base+subclass) | ✓ SATISFIED, deviation recorded | Truth 8 |

No orphaned requirements: all 7 IDs declared across the 9 plans' `requirements:` frontmatter (93-01 through 93-09) match REQUIREMENTS.md's Phase 93 traceability rows exactly (COMP-03 through COMP-09).

**Bookkeeping note (not a code gap):** `.planning/REQUIREMENTS.md` currently marks only COMP-05 as `[x]` Complete, and its traceability table still reads "Gaps Found" for COMP-03/04/06/07/08/09 (lines 94-100). Per this verification's own fresh regression checks, all six of those requirements' underlying implementations are unchanged and intact since the initial (already-passing) verification of those truths — the "Gaps Found" marking is a stale artifact of the phase-level `gaps_found` status recorded before this gap-closure plan ran, not evidence of a functional regression in those six requirements. REQUIREMENTS.md should be updated to `Complete` for all seven COMP-0x rows once this phase's status is finalized.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `bbj-intellij/.../composer/ComposerLauncher.java` | 313, 363, 384, 390, 403, 485, 497, 709 | `decoded.edit` dereferenced with no null check across every edit-in-place path (pre-existing, not introduced by this phase) | ⚠️ Warning | WR-01 in `93-REVIEW.md` — same risk class as the now-closed CR-01 but pre-existing code, not a phase-93 regression; explicitly deferred by 93-09-PLAN.md's own `## Deferred` section; not counted as a phase-93 gap, tracked as follow-up debt |
| `bbj-vscode/src/language/setopts-in-code-request.ts` | 360-362 | `createComposeTriStateHandler` performs no defensive validation of `params.selection` | ℹ️ Info | WR-02 in `93-REVIEW.md` — client→server direction, lower severity, explicitly deferred, outside this phase's stated (server→client) threat model |
| `bbj-vscode/src/setopts-composer-webview.ts` | 111-126 | Silent no-op when `target` carries neither `hexRange` nor `insertOffset` (pre-existing) | ℹ️ Info | IN-01 in `93-REVIEW.md` — pre-existing, explicitly deferred, not introduced by this phase's diff to this file |

No `TBD`/`FIXME`/`XXX`/`TODO`/`HACK`/`PLACEHOLDER` debt markers found in any of the 4 files plan 93-09 modified. No planning-identifier leakage found in the 93-09 diff (register check re-run this session, zero matches; `#591` citations are the correct, permitted form).

## Gaps Summary

**No blocking gaps remain.** The one gap the initial verification recorded (CR-01 — `ed.line`, `chain.startLine`, `chain.endLine` reaching `Document.getLineStartOffset(int)` unchecked) is closed by gap-closure plan 93-09, verified fresh this session:

- The fix does not repeat the code review's own fix-sketch error: the upper bound is strict (`< lineCount`), so `isUsableLineRegion(0, 10, 10)` is correctly `false` rather than the sketch's incorrect `true`.
- An equal-line region (`startLine == endLine`) is correctly accepted (the documented insertion case), and a descending region (`endLine < startLine`) is correctly rejected.
- Both guards sit before their respective `new StaleEditGuard(` construction, so nothing is written on an aborted path.
- No new `Reason`/`Severity` was introduced; both aborts reuse `ComposerNotices.malformedEdit(...)`.
- The whole IntelliJ suite is green from a forced, non-cached re-run: 983 tests, 0 failures, 0 errors — independently re-aggregated this session from all 110 fresh JUnit XML result files, resolving the prior 972-vs-992 discrepancy by direct observation (983 is neither prior number, because it includes the 8 new predicate tests and 3 new source-guard tests this plan added).
- No planning-identifier leakage in the gap-closure diff.

**One item remains open, and is not a gap in the code — it is unavoidably a human-verification item:** Success Criterion 5 requires "the whole IntelliJ JUnit suite **plus one hand UAT round** covering all six [composer] kinds." The JUnit half is now fully satisfied. No plan in this phase — including the gap-closure plan, which was correctly scoped only to the CR-01 defect — performed or recorded a hand UAT round opening all six composer kinds through all three entry points (lightbulb intention, context-menu action, cue click-through) and comparing dialogs/defaults/written output to pre-phase behaviour. This is the same item the initial verification already carried to human verification (plus three narrower human-judgment items already flagged by individual plans' own SUMMARYs: theme-aware error colour rendering, the live raw-hex validation message round-trip, and addWindow/addChildWindow post-extraction parity). None of these four items can be resolved by a headless JUnit test or a source grep — they are visual/interactive claims about live IDE behaviour.

Per the decision tree, a human-verification item present with zero failing truths routes this phase to `human_needed`, not `passed`. This is the correct, non-inflated verdict: the phase's engineering work (all 7 requirement IDs, including the previously-failed CR-01 defect) is now fully verified in the codebase, but Success Criterion 5's own wording makes hand UAT a precondition for calling the phase's identical-behaviour claim proven, and that precondition has not yet been exercised by anyone.

---

_Verified: 2026-09-18T11:40:00Z_
_Verifier: Claude (gsd-verifier)_
