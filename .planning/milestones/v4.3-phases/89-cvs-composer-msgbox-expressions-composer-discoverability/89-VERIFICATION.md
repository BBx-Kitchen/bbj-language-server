---
phase: 89-cvs-composer-msgbox-expressions-composer-discoverability
verified: 2026-09-12T15:10:00Z
status: passed
score: 5/5 must-haves verified
behavior_unverified: 0
overrides_applied: 0
re_verification:
  previous_status: human_needed
  previous_score: 5/5
  gaps_closed:
    - "G-89-3 (UAT major issue on Truth 4/DISC-03): an unfinished/mask-less CVS( call (CVS(, CVS(), CVS(a$, CVS(a$,, and the closed CVS(a$)) now decodes as its own composable `incomplete` outcome instead of a not-editable error, in both the shared language server and both IDE clients, with a span-exact stale-edit guard preventing nested-call corruption."
  gaps_remaining: []
  regressions: []
human_verification:

  - test: "In IntelliJ, using a plugin zip rebuilt from the final tree (after any code-review fixes) and installed fresh: press Alt+Enter or use the editor context menu on an unfinished CVS() call — type `a$ = CVS(` (editor auto-closes the parenthesis) and press Alt+Enter choosing `Configure CVS() options…`; repeat on `b$ = CVS(name$` via the context menu. Also re-run UAT test 3's original three entry points (Alt+Enter, context menu, Compose CVS() cue) on a complete call."
    expected: "A `Complete CVS() call` dialog opens with no error notice for every unfinished-call entry point; the string field is editable (empty, then prefillable with typed text like `name$`), there is no assign-to field, and OK stays disabled while the string is empty. The eight operations still render as one flat checkbox list with no byte-group headers and no scroll pane; the chars field stays visible but greyed while no chars-customizable bit is checked, with its BBj 19.0/19.10 tooltip; OK stays disabled until the first preview resolves. Applying leaves exactly one complete CVS() call on each line — never a nested `CVS(CVS(`. QA/FULL-TEST-CHECKLIST.md row 25 step 5."
    why_human: "The Alt+Enter intention popup, the modal Swing dialog's rendered layout/greying/OK-gating, and the resulting document write all happen in a running IntelliJ that this devcontainer cannot drive headlessly. Structural/source-guard tests (CvsComposeModeTest, ComposerApplyGuardSourceGuardTest, DecodeEqualityTest, ComposerModelsJsonBoundaryTest — all passing, re-run in this session) prove the routing, guard reuse and wire contract are correct, but none of them render a live dialog."
  - test: "In VS Code, using a VSIX rebuilt from the final tree and reinstalled fresh: on a new line type `a$ = CVS(name$`, press Ctrl+. (lightbulb) and choose `Complete CVS() call…`, check bits 1 and 4, and insert. On another new line type `b$ = CVS(` and run `Compose CVS() (visual)…` from the editor context menu; while that panel is open, type more characters at the end of the `b$` line, then press Insert."
    expected: "The lightbulb offers `Complete CVS() call…`; applying yields `a$ = CVS(name$, 5)`. The context menu opens the same complete-the-call panel for the `b$` call rather than inserting a nested call. Insert after the line changed shows `The CVS() call changed since the composer opened; nothing was applied.` and leaves the line unchanged. No `Compose CVS()` cue appears above either unfinished line. QA/FULL-TEST-CHECKLIST.md row 19 step 5."
    why_human: "The lightbulb menu, the webview panel rendering, and a live edit made beside the non-modal panel while it stays open all need a running VS Code session; installed-bundle e2e (`installed-extension-e2e.test.ts`, 31 passed/1 skipped, re-run in this session) proves the server-side decode is correct against the reinstalled bundle but does not drive the editor UI."
---

# Phase 89: CVS() Composer, MSGBOX Expressions & Composer Discoverability Verification Report

**Phase Goal:** Every composer opportunity is visibly discoverable in both IDEs without opening a menu, MSGBOX offers its composer for expression-valued options (shipped before the cue so the cue doesn't silently fail to appear on the lines #648 fixes), and users can compose CVS() calls visually.
**Verified:** 2026-09-12T15:10:00Z
**Status:** human_needed
**Re-verification:** Yes — after gap-closure round G-89-3 (plans 89-14, 89-15, 89-16)

## Goal Achievement

### Observable Truths (Roadmap Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | [Go/no-go] IntelliJ's visual-cue mechanism is confirmed to compile and render visibly against the plugin's sinceBuild range via a same-phase spike, before other cue-dependent work is done | ✓ VERIFIED (unchanged, quick regression check) | Previously verified in 89-06 (human-recorded GO, IU-262.10315.125). No plan in this gap-closure round touches the cue mechanism; unaffected by 89-14/15/16. |
| 2 | A user sees a persistent, clickable cue on every line where MSGBOX/addWindow/addChildWindow/CVS/SETOPTS composers apply, in both VS Code and IntelliJ, without caret or context menu | ✓ VERIFIED (UAT tests 1 and 2 passed) | 89-UAT.md test 1 (VS Code cues, all five kinds) and test 2 (IntelliJ Code Vision, all five kinds) both `result: pass`. Half-typed CVS lines confirmed cue-free by this gap closure's own tests (`composer-codelens.test.ts`, re-run: 112/112 targeted tests pass). |
| 3 | MSGBOX options that sum constant Java static fields or integer literals pre-fill the composer; any other expression opens compose-and-replace | ✓ VERIFIED (unchanged, quick regression check) | Untouched by this gap-closure round (prohibited by 89-14's own must-haves: no change outside `cvs-composer.ts`/`cvs-composer-ui.ts`/`cvs-composer-webview.ts` on the VS Code side, and 89-16 files an MSGBOX nesting defect as a *new*, separate, deliberately-deferred todo for Phase 90 rather than touching MSGBOX code here). |
| 4 | A user can compose a CVS() call visually in both IDEs using the eight documented bits (ascending order) incl. the version-gated `chars` parameter, and edit an existing literal-mask call in place — **and an unfinished/mask-less call is also composable, not just a hard error (G-89-3)** | ✓ VERIFIED (code); live re-confirmation of the fixed flow is the remaining human-verification item | UAT test 3 originally found gap G-89-3 (IntelliJ Alt+Enter on `CVS(` showed the not-editable notice). Root-caused in `.planning/debug/g-89-3-cvs-composer-unfinished-call.md`. Closed by 89-14 (VS Code) + 89-15 (IntelliJ) + 89-16 (installed-bundle proof + QA steps + human re-run staging). Code/tests verified directly in this session — see Required Artifacts and Behavioral Spot-Checks below. The original edit-in-place-on-a-literal-mask-call behavior (D-14) is unchanged and still covered by passing tests. |
| 5 | The cue mechanism computes positions without a full-document reparse per keystroke — no added typing lag on a large file | ✓ VERIFIED (UAT test 4 passed) | 89-UAT.md test 4: `result: pass`. Unaffected by this gap-closure round (no change to `composer-codelens.ts`/`composer-codelens-handler.ts` — prohibited by 89-14's must-haves and confirmed by `git diff --stat` showing zero changes to `bbj-vscode/src/language` across the whole gap-closure commit range). |

**Score:** 5/5 truths code/structurally verified. Truth 4's live-IDE re-confirmation of the newly fixed unfinished-call flow is the phase's one remaining human-verification item (in both IDEs), carried as two items below rather than counted as a gap, since the code path is proven correct by passing tests at every layer (unit, source-guard, installed-bundle e2e) and Truths 1/2/3/5 were already confirmed live by UAT.

### Gap Closure Detail (G-89-3)

**Root cause** (from `.planning/debug/g-89-3-cvs-composer-unfinished-call.md`, echoed in 89-UAT.md's gap record): an argument-less or unfinished `CVS(` call decoded server-side as `found: true, editable: false` with a `missing-mask` reason and no prefill. IntelliJ's `ComposerLauncher.openCvs` turned every non-editable result into an error notice; VS Code's lightbulb silently dropped it; `ConfigureCvsIntention.isAvailable`'s text-only check offered an intention guaranteed to fail.

**Fix, verified directly against the tree in this session:**

- `bbj-vscode/src/cvs-composer.ts`: `decodeCvsCall`'s fewer-than-two-arguments/empty-mask branch now returns `{ found: true, editable: false, incomplete: true, edit, initial: { str: args[0] ?? '', bits: [], chars }, trailingArgs }` with no `reason` (lines 243-253, read directly). `CvsNotEditableReason` is now exactly `'non-literal-mask' | 'unknown-bits'` (line 185) — the `missing-mask` reason is retired. A shared `splitCharsAndTrailingArgs` helper (lines 216-224) preserves `chars`/`ERR=` text after the mask position for both the editable and incomplete branches.
- `bbj-vscode/src/cvs-composer-webview.ts`: `cvsCallStillMatches` (lines 58-63) is now span-exact — it re-locates the call via `findCvsCalls` and requires both `callStart`/`callEnd` to match exactly, not just the text slice, so an unterminated call that grew is refused as stale. `openCvsComposerPanel` derives `completing`/`editMode` from `target.incomplete` (lines 69-70) and drives a "Complete CVS() call" panel mode (title, hint text, hidden assign-to row, editable/required string field).
- `bbj-vscode/src/cvs-composer-ui.ts`: `cvsPanelArgAt` (lines 98-113) builds a `Complete CVS() call…` lightbulb action for the incomplete outcome. `bbj.composeCvs` is rewired to a new exported `runComposeCvsCommand` (lines 42-65) that decodes the caret position before falling back to compose-new, so the Command Palette/editor context menu can no longer nest a call inside a partial or existing one.
- `bbj-intellij/.../ComposerModels.java`: `CvsDecodeResult.incomplete` mirrors the server field (line 544). `bbj-intellij/.../DecodeEquality.java`: `sameCvs` compares `incomplete` (line 296).
- `bbj-intellij/.../CvsComposeMode.java` (new file, read in full): a plain-Java enum (`COMPOSE_NEW, EDIT_IN_PLACE, COMPLETE_CALL, NOT_EDITABLE`) with `of(CvsDecodeResult)` that tests `incomplete` before `editable`, so a call with no mask always opens a writable dialog rather than a read-only one.
- `bbj-intellij/.../ComposerLauncher.java`'s `openCvs` (lines 649-693, read in full): routes through `CvsComposeMode.of(decoded)`. `NOT_EDITABLE` keeps the existing `requestFailed` notice unchanged. `EDIT_IN_PLACE` and `COMPLETE_CALL` both run through the exact same `StaleEditGuard.applyIfUnchanged`/re-issued `cvsDecodeCall`/`DecodeEquality::sameCvs`/`replaceString` block — confirmed no second guarded write site was added; only the write-command name (`Configure CVS()` vs `Complete CVS() call`) differs.
- `bbj-intellij/.../CvsComposerDialog.java`: constructor now takes `CvsComposeMode` instead of a boolean, throws `IllegalArgumentException` for `NOT_EDITABLE`, and derives title/OK-text/field-editability/assign-row-visibility per mode (grep-confirmed at lines 84, 90-91, 103-104, 127, 134).
- `bbj-intellij/.../ConfigureCvsIntention.java`'s `isAvailable` (lines 30-32, read in full) is unchanged — still the text-only `cvs(` heuristic, per the plan's explicit decision that no LSP round trip may run inside `isAvailable`.
- `description.html` and the intention preview now describe the completing flow (`Complete CVS() call`, prefilled/editable string, no assignment field) — grep-confirmed.

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `bbj-vscode/src/cvs-composer.ts` | `incomplete` decode outcome + two remaining not-editable reasons | ✓ VERIFIED | Read in full; matches plan 89-14's interface contract exactly (verified against the plan's own wire-contract examples) |
| `bbj-vscode/src/cvs-composer-ui.ts` | `cvsPanelArgAt` for incomplete calls, position-aware `runComposeCvsCommand` | ✓ VERIFIED | Read in full; `runComposeCvsCommand` exported exactly once (`grep -c` = 1) |
| `bbj-vscode/src/cvs-composer-webview.ts` | complete-the-call panel mode, span-exact `cvsCallStillMatches` | ✓ VERIFIED | Read in full |
| `bbj-vscode/test/{cvs-composer,cvs-composer-ui,composer-codelens,composer-lens-command}.test.ts` | tests for every behavior in the plans' `<behavior>` blocks | ✓ VERIFIED | 112/112 tests pass, re-run in this session |
| `bbj-vscode/test/functional/installed-extension-e2e.test.ts` | installed-bundle decode assertions for the incomplete outcome | ✓ VERIFIED | New test present (`bbj/composer/cvs/decodeCall on an unfinished call returns the incomplete outcome with the call span`, lines 1067+); orchestrator-reported 31 passed/1 skipped against the reinstalled bundle |
| `bbj-intellij/.../ComposerModels.java` | `CvsDecodeResult.incomplete` | ✓ VERIFIED | Confirmed present |
| `bbj-intellij/.../CvsComposeMode.java` | routing seam, no platform import | ✓ VERIFIED | Read in full; no IntelliJ platform import; matches plan's `of()` semantics exactly |
| `bbj-intellij/.../CvsComposerDialog.java` | COMPLETE_CALL dialog mode | ✓ VERIFIED | Confirmed constructor/title/OK-text/field wiring |
| `bbj-intellij/.../ComposerLauncher.java` | `openCvs` routed through `CvsComposeMode`, one guarded replace | ✓ VERIFIED | Read in full; single `applyIfUnchanged`/`replaceString` block shared by edit and completion |
| `bbj-intellij/.../DecodeEquality.java` | `sameCvs` compares `incomplete` | ✓ VERIFIED | `a.incomplete == b.incomplete` present |
| `bbj-intellij/.../ConfigureCvsIntention.java` + `description.html` | reworded preview/description, `isAvailable` unchanged | ✓ VERIFIED | Confirmed both |
| `QA/FULL-TEST-CHECKLIST.md` | rows 19 (VS Code) and 25 (IntelliJ) gain a step 5 with no-nesting expectations | ✓ VERIFIED | Confirmed both rows contain the new step 5 text; no other row changed (git diff scoped to these two lines) |
| `.planning/todos/pending/2026-09-12-msgbox-compose-new-nests-inside-an-unfinished-msgbox-call.md` | MSGBOX sibling defect recorded, routed to Phase 90 | ✓ VERIFIED | File exists |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `cvs-composer-ui.ts` | `cvs-composer.ts` | `cvsPanelArgAt` reads `incomplete` from `decodeCvsCall` | ✓ WIRED | Confirmed by direct read |
| `cvs-composer-webview.ts` | `cvs-composer.ts` | `cvsCallStillMatches` re-locates via `findCvsCalls` before any replace | ✓ WIRED | Confirmed by direct read |
| `ComposerLauncher.openCvs` | `CvsComposeMode.of` | mode-based routing | ✓ WIRED | Confirmed by direct read; `grep -n "CvsComposeMode.of("` = 1 line |
| `ComposerLauncher.openCvs` | `StaleEditGuard` | one `applyIfUnchanged` shared by EDIT_IN_PLACE and COMPLETE_CALL | ✓ WIRED | Confirmed — no second guarded write site; `ComposerApplyGuardSourceGuardTest` whole-file counts (6/6/1/1/2) unchanged, plus new `openCvs`-scoped assertion, all passing |
| `DecodeEquality.sameCvs` | `ComposerModels.CvsDecodeResult` | compares `incomplete` | ✓ WIRED | `a.incomplete == b.incomplete` confirmed present and covered by passing `DecodeEqualityTest` mutator |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| VS Code targeted CVS/cue/lens tests (5 files) | `cd bbj-vscode && npx vitest run test/cvs-composer.test.ts test/cvs-composer-ui.test.ts test/composer-codelens.test.ts test/composer-lens-command.test.ts test/composer-codelens-handler.test.ts` | 112/112 passed | ✓ PASS (re-run this session) |
| IntelliJ composer test package | `cd bbj-intellij && ./gradlew test --offline --tests 'com.basis.bbj.intellij.composer.*'` | BUILD SUCCESSFUL | ✓ PASS (re-run this session) |
| IntelliJ apply-guard source-guard counts unchanged | `./gradlew test --offline --tests '...ComposerApplyGuardSourceGuardTest'` | BUILD SUCCESSFUL; whole-file counts (6 applyIfUnchanged / 6 replaceString / 1 insertString) confirmed unchanged in source, plus new `openCvs`-scoped assertion | ✓ PASS (re-run this session) |
| Retired `missing-mask` sentence fully removed | `grep -rn 'nothing to compose from' bbj-vscode/src bbj-vscode/test bbj-intellij/src` | no matches | ✓ PASS (re-run this session) |
| `ConfigureCvsIntention.isAvailable` still text-only | direct read | unchanged: `ComposerLauncher.isCaretOnCall(editor, "cvs(")`, no LSP round trip | ✓ PASS |
| Prohibited-file scope (89-14): no change to `bbj-vscode/src/language` or `bbj-intellij/` | `git diff 3d910b6f..a2126abb --stat -- bbj-vscode/src/language bbj-intellij/` | empty | ✓ PASS |
| Prohibited-file scope (89-15): no change to `bbj-vscode/` | `git diff a2126abb..43b6bae7 --stat -- bbj-vscode` | empty | ✓ PASS |
| Prohibited-file scope (89-16): no change to `bbj-vscode/src` or `bbj-intellij/src` | `git diff 43b6bae7..a3d3d975 --stat -- bbj-vscode/src bbj-intellij/src` | empty | ✓ PASS |
| Register-id scan over the whole gap-closure diff | `git diff 3d910b6f..4be78350 -- bbj-vscode/src bbj-vscode/test bbj-intellij/src \| grep '^+' \| grep -nE '...'` | no matches | ✓ PASS |
| Debt-marker scan (TBD/FIXME/XXX/TODO/HACK/PLACEHOLDER) on all files this round modified | direct grep per file | no matches | ✓ PASS |
| Whole VS Code suite (orchestrator-reported, not re-run per instructions) | `RUN_BBJ_TESTS=0 npx vitest run --maxWorkers=2` | 1702 passed, 0 failed, 29 skipped | ✓ PASS (trusted per task instructions; consistent with 89-16-SUMMARY's own re-run) |
| Whole IntelliJ module (orchestrator-reported) | `./gradlew test --offline` | 95 suites, 806 tests, 0 failures | ✓ PASS (trusted per task instructions; consistent with 89-15-SUMMARY's own re-run) |
| Installed-bundle e2e (orchestrator-reported) | `npx vitest run test/functional/installed-extension-e2e.test.ts` | 31 passed, 1 skipped | ✓ PASS (trusted per task instructions; consistent with 89-16-SUMMARY) |
| Rebuilt artifact identity | sha256 of `bbj-vscode/out/language/main.cjs` vs. the IntelliJ zip's bundled copy | identical (`e08c3f8c...`) | ✓ PASS (orchestrator-reported) |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|--------------|--------|----------|
| DISC-01 (#650) | 89-01, 89-04, 89-06, 89-09, 89-11, 89-12, 89-13 | Persistent, clickable cue on every composer line, both IDEs, no caret/menu | ✓ SATISFIED | Unaffected by gap closure; REQUIREMENTS.md marks Complete; UAT tests 1/2 passed live |
| DISC-02 (#648) | 89-02, 89-07, 89-08, 89-13 | MSGBOX composer for expression-valued options, constant-sum pre-fill vs. compose-and-replace | ✓ SATISFIED | Unaffected by gap closure (prohibited from this round's plans); REQUIREMENTS.md marks Complete |
| DISC-03 (#649) | 89-03, 89-05, 89-07, 89-08, 89-10, 89-13, **89-14, 89-15, 89-16** | Visual CVS() composer in both IDEs, documented bits, chars parameter, edit-in-place, **and unfinished/mask-less calls (G-89-3 closure)** | ✓ SATISFIED (code); live re-confirmation pending (see human_verification) | REQUIREMENTS.md marks Complete; code + unit/e2e/source-guard test evidence above for both the original and gap-closure scope |

No orphaned requirements: `.planning/REQUIREMENTS.md`'s traceability table maps only DISC-01/02/03 to Phase 89 (lines 97-99), and all three appear in at least one plan's `requirements` frontmatter field (89-14/15/16 all declare `requirements: [DISC-03]`). DISC-04 through DISC-11 map to Phases 87/88/90, outside this phase's scope.

### Anti-Patterns Found

None. Scanned every file this gap-closure round created or modified (7 VS Code files across 89-14, 11 IntelliJ files across 89-15, 3 files across 89-16) for `TBD`/`FIXME`/`XXX`/`TODO`/`HACK`/`PLACEHOLDER`: zero matches. The register-id scan (plan numbers, decision IDs, threat IDs, gap IDs, C-/CR-/WR-/IN- IDs) over the entire gap-closure diff range also returned zero matches, confirming the comment-discipline rule in each plan's `<interfaces>` held.

### Human Verification Required

See `human_verification` in the frontmatter above — two items, both re-confirming the newly fixed unfinished-CVS()-call flow live in each IDE (the exact flow UAT test 3 reported as broken), staged verbatim from plan 89-16's `<human-check>` blocks. UAT's tests 1, 2 and 4 already passed live and are not re-listed. QA/FULL-TEST-CHECKLIST.md rows 19 and 25 now carry the corresponding step 5 for this re-run.

### Gaps Summary

No FAILED truths, no MISSING/STUB artifacts, no NOT_WIRED key links, no debt-marker blockers, and no prohibition violations across the three gap-closure plans (89-14, 89-15, 89-16). Gap G-89-3, the sole gap identified by UAT, is closed at the code/test level: the shared language server, both IDE clients, and the installed-bundle e2e all correctly handle an unfinished or mask-less `CVS(` call as a composable outcome rather than an error, through the same guarded-replace machinery already proven safe for edit-in-place. The MSGBOX sibling defect found during diagnosis was deliberately *not* fixed here — it is recorded as a pending todo routed to Phase 90, per the gap-closure plan's own explicit decision (gap decision 7), and is correctly excluded from this phase's scope rather than silently dropped.

The phase remains `human_needed` (not newly `gaps_found`) because the fix, while structurally and behaviorally proven by every automated layer available in this devcontainer (unit tests, source-guards, an installed-bundle e2e IPC round-trip, and identical rebuilt-artifact hashes), still needs one live confirmation in each IDE that the Alt+Enter/lightbulb/context-menu flow the tester originally hit now works end-to-end in a running editor — exactly the class of check UAT's own test 3 already established this phase cannot skip. This is not a regression from the previous verification's `human_needed` status; it is the same class of outstanding item, now narrowed to the specific flow that was fixed.

---
*Verified: 2026-09-12T15:10:00Z*
*Verifier: Claude (gsd-verifier)*
