---
phase: 88-setopts-in-code-hovers-tri-state-composer
verified: 2026-09-11T11:15:00Z
status: gaps_found
score: 2/4 ROADMAP truths fully verified (1 present-behavior-unverified, 1 FAILED — see CR-01)
behavior_unverified: 1
overrides_applied: 0
re_verification:
  previous_status: human_needed
  previous_score: "2/4 ROADMAP truths verified (2 present-behavior-unverified — live-render layer)"
  gaps_closed:
    - "G-88-1 (hover decode in both live IDEs) — closed by an actual human live retest this round (88-UAT.md tests 4 and 5, both `result: pass`, 2026-09-11), not merely re-proven at the artifact layer. All 5 hover targets, including the byte-range chain's unsafe-reason decode, render correctly in both VS Code (basis-intl.bbj-lang-0.12.28, installedTimestamp 2026-09-11T10:47:24Z) and IntelliJ (bbj-intellij-0.1.0.zip, sha256 e76f76824dcb4f706e454b8465fa069c941b0e1ef5ee9d6fb8e8ca84ce51cc66)."
    - "G-88-3's two live-reported mask-literal defects (missing $...$ wrapper on absolute edit-in-place; spurious double-quotes around IOR/AND mask arguments) are fixed at the source: independently confirmed by reading bbj-vscode/src/setopts-catalog.ts:472/474 (now routes through the shared `bbjHexLiteral()` formatter, no literal quote characters in the template) and re-running the full Phase 88 targeted suite (225 passed, 1 skipped) plus the installed-bundle e2e suite's new bare-hex-literal assertion."
    - "G-88-2's VS Code half (composer reachable via all three entry points, edits the right lines) is confirmed fixed by live retest (88-UAT.md test 6, `result: issue` only for the G-88-3 quoting defect, explicitly noting 'with that fixed, everything else is a pass')."
    - "G-88-2's IntelliJ server-side root cause (textDocument/codeAction gated at the later, unbounded DocumentState.Validated instead of hover's DocumentState.Linked, with no timeout) is fixed and independently confirmed: bbj-vscode/src/language/bbj-code-action-handler.ts exists, is wired, and a fresh targeted-suite run passes bbj-code-action-handler.test.ts and the e2e cold-ordering probe."
  gaps_remaining:
    - "G-88-2's IntelliJ live-render half (Alt+Enter and the new editor-context-menu entry actually open the composer) — round two of 88-LIVE-RETEST.md is written and ready but its verdict block is still blank; no human has re-run it yet against the current build."
    - "G-88-3's actual purpose — 88-RESEARCH.md Assumption A2, the live BBjServices mask-width question — remains genuinely unanswered. The quoting defect that aborted the original attempt is fixed, but no live BASIS run has happened since; 88-LIVE-RETEST.md's Check 3 is staged but unrun."
  regressions:
    - "NEW (found by this verification, not present in the prior round's must-haves): CR-01 from 88-REVIEW.md — decodeInCode's chain edit-in-place range is computed from document line numbers (originLine + 1 .. the SETOPTS statement's line), not from the actual reassignment statements' CST ranges. Independently confirmed still present in bbj-vscode/src/language/setopts-in-code-request.ts:189-191 (unchanged since the review). This corrupts or duplicates code for a SAFE, editable chain whose reassignment and/or SETOPTS statement shares a physical line with another statement via ';' — a shape the codebase's own safety walk explicitly classifies safe and edit-eligible (test/setopts-code-scanner.test.ts:393-410, 'WR-B regression'), so decodeInCode reports editable:true and both writers apply the edit unconditionally onto a wrong (possibly empty or inverted) line range. This is a functional defect proven by direct source reading against an existing passing test fixture, not merely an unverified truth."
gaps:
  - truth: "A user can edit in place an absolute SETOPTS literal or a canonical var$=OPTS … SETOPTS var$ block; any other shape offers hover decode only, with no edit action presented (ROADMAP Success Criterion #3 / DISC-06)"
    status: failed
    reason: "decodeInCode's chain edit-in-place range computation (setopts-in-code-request.ts:189-191) assumes every chain reassignment occupies its own dedicated physical line strictly between the origin and the SETOPTS statement. For the safe, edit-eligible chain shape 'A$=OPTS\\nA$=IOR(A$,$08$) ; SETOPTS A$' (both statements sharing a line via ';', which the codebase's own safety walk classifies safe:true — see setopts-code-scanner.test.ts's 'WR-B regression' test), decodeInCode computes an EMPTY [1,1) replace range while still returning editable:true with a populated chain payload. Both writers (bbj-vscode/src/setopts-tristate-webview.ts's apply handler and bbj-intellij's ComposerLauncher.openSetoptsInCodeChain) trust this range unconditionally, insert the newly composed lines into the empty gap, and never touch or remove the original reassignment text still sitting on the shared line — silently producing a file with BOTH the old and the new reassignment, changing the effective SETOPTS vector from what either selection alone would produce. A second, more severe variant (origin and SETOPTS on the same single line with zero reassignments) produces an INVERTED range (startLine > endLine), which VS Code's Range constructor silently reorders (replacing the wrong span) and which can throw inside IntelliJ's WriteCommandAction."
    artifacts:
      - path: "bbj-vscode/src/language/setopts-in-code-request.ts"
        issue: "Lines 182-200 (createDecodeInCodeHandler, chain branch): startLine = originLine + 1, endLine = SETOPTS statement's line — computed purely from line numbers, not from the actual chain-link statements' own CST ranges, with no defensive check for an empty or inverted range before returning editable:true"
    missing:
      - "Compute the replace region from the actual reassignment statements' CST ranges (first/last chain-link node's own $cstNode), not from origin/SETOPTS line numbers — or, when any chain link/origin/SETOPTS shares a physical line with another statement, fail closed (editable: false with a new SetOptsUnsafeReason such as 'shared-line') the same way 'indexed-target' already fails closed for a shape the model cannot precisely represent"
      - "At minimum, a defensive guard: if (startLine > endLine) return NOT_FOUND, before returning the chain payload"
      - "New test coverage in setopts-in-code-request.test.ts for 'A$=OPTS\\nA$=IOR(A$,$08$) ; SETOPTS A$' (the exact WR-B-regression shape) and its all-single-line degenerate form, at the edit-range layer — the existing WR-B test only proves the hover/safety verdict, not the edit range"
deferred: []
behavior_unverified_items:
  - truth: "A user can generate a SETOPTS read-modify-write block from a tri-state Set/Clear/Leave form, invoked via the Code Action lightbulb/Command Palette/context menu in VS Code and Alt+Enter/context-menu in IntelliJ (ROADMAP Success Criterion #2 / DISC-06)"
    test: "Run 88-LIVE-RETEST.md (round two) Check 1 (composer output validity, either IDE) and Check 2 (IntelliJ's two reachability doors: Alt+Enter and the new editor context-menu entry) against the build identities the document names (VS Code installedTimestamp 2026-09-11T10:47:24Z; IntelliJ zip sha256 e76f76824dcb4f706e454b8465fa069c941b0e1ef5ee9d6fb8e8ca84ce51cc66)."
    expected: "The composer opens and composes a valid, bare-$...$-hex-literal block in VS Code (already spot-confirmed by test 6's live retest modulo the now-fixed quoting defect); in IntelliJ, either door (Alt+Enter or the new context-menu action) opens the same composer without the 'Searching for Context Actions...'/'Pull Docker Image' hang reported in test 7."
    why_human: "No IntelliJ sandbox exists in this devcontainer (probed directly by plan 88-09) — the fix (bbj-code-action-handler.ts's bounded/DocumentState.Linked-gated codeAction, plus the new BbjComposeSetoptsInCodeAction context-menu entry) is proven correct at the unit/e2e/artifact layers in this verification (targeted suite 225/226 passed+skipped, whole-suite 1502/1521 passed with only the documented pre-existing java-interop drift), but whether Alt+Enter or the context menu actually opens the dialog in a live IntelliJ session is UI behavior only a human with that sandbox can observe. 88-LIVE-RETEST.md round two is written and ready but its verdict block is unfilled."
human_verification:
  - test: "88-LIVE-RETEST.md (round two) Check 2 — IntelliJ reachability, both doors (Alt+Enter and the new editor context-menu entry) — against bbj-intellij-0.1.0.zip sha256 e76f76824dcb4f706e454b8465fa069c941b0e1ef5ee9d6fb8e8ca84ce51cc66."
    expected: "'Configure SETOPTS options in code…' appears via Alt+Enter and opens the composer within a reasonable time (the server-side fix now bounds codeAction at ~5000ms, gated on the same DocumentState.Linked state hover already uses successfully); the new right-click context-menu entry opens the same composer as a second, intention-search-independent door."
    why_human: "No IntelliJ sandbox reachable from this devcontainer; the server-side timing/gating fix is proven by unit test and a cold-ordering e2e probe (7ms, down from a measured 56016ms hang), but the actual IntelliJ platform-side intention-search behavior can only be observed live."
  - test: "88-LIVE-RETEST.md (round two) Check 3 — live mask-width falsification, 88-RESEARCH.md Assumption A2. Using the block composed in Check 1, run the program as GUI/BUI/DWC against a live BBjServices."
    expected: "The generated IOR/AND calls (16-byte/32-hex-digit full-width mask base) run without raising a BBj !ERROR — this specific question has never actually been answered; the prior attempt's !ERROR=17 was caused entirely by the now-fixed quoting defect (confirmed: the quoting fix is present in setopts-catalog.ts:472/474 and setopts-in-code-request.ts's absolute-edit path), not by the mask width itself."
    why_human: "Headless BBj execution is confirmed blocked in this devcontainer (GUI mode: 'Must have a display for GUI mode'; non-GUI terminal aliases: 'Could not find a termcap file: /etc/termcap'; no X server or xvfb-run installed)."
---

# Phase 88: SETOPTS-in-Code Hovers & Tri-State Composer Verification Report

**Phase Goal:** Users working with SETOPTS/IOR/AND expressions directly in BBj code get accurate decode hovers everywhere, and can safely compose or edit the two statically-safe shapes.
**Verified:** 2026-09-11T11:15:00Z
**Status:** gaps_found
**Re-verification:** Yes — third round, following gap-closure plans 88-10 through 88-13 (which addressed the diagnosed G-88-2 IntelliJ-hang root cause and G-88-3's mask-literal-quoting defects reported by the prior human live retest round)

## Why this moves from `human_needed` back to `gaps_found`, not to `passed`

The prior verification round (`88-08`/`88-09`, status `human_needed`) correctly identified that
every code-level and shipped-artifact gate had been proven, and that only the live-editor-rendering
layer remained. That live retest (round one) then ran and found two real, live-reproduced defects
(G-88-2's IntelliJ Alt+Enter hang; G-88-3's mask-literal quoting bugs) plus confirmed G-88-1's
hover decode genuinely works on screen in both IDEs. Plans 88-10 through 88-13 fixed G-88-3 at the
source (one shared `bbjHexLiteral`/`BbjHexLiteral.of` formatter, a narrowed decoder that refuses
the invalid quoted form) and G-88-2's server-side root cause (a bounded, `DocumentState.Linked`-gated
`codeAction` handler, plus a second IntelliJ entry point that bypasses intention search), and staged
a round-two live retest that has not yet been run by a human.

That would, on its own, put this phase back at `human_needed` — present, wired, unit- and e2e-tested,
but the pixel-layer confirmation still pending. **It does not**, because this verification
independently traced the chain-edit-in-place code path flagged as CR-01 in the just-completed
`88-REVIEW.md` and confirmed it is real, unfixed, and demonstrably wrong for a specific input that
the codebase's own test suite already proves is classified as a *safe, edit-eligible* chain:

```
A$=OPTS
A$=IOR(A$,$08$) ; SETOPTS A$
```

`setopts-code-scanner.test.ts`'s own `"WR-B regression"` test (lines 401-410) proves `traceOptsChain`
reports `safe: true` with one link for exactly this shape. But `decodeInCode`
(`setopts-in-code-request.ts:182-200`, read directly in this verification, unchanged from the
review) computes `originLine = 0`, `startLine = originLine + 1 = 1`, `endLine = 1` (the line the
`SETOPTS` statement is on) — an **empty** `[1, 1)` replace range — while still returning
`editable: true` with a populated `chain` payload. Both writers trust that range unconditionally:
they insert the newly composed lines into the empty gap and never touch the original
`A$=IOR(A$,$08$)` text still sitting on the shared line, so the edited file silently ends up with
**both** the old and the new reassignment. This is not an inference from missing test coverage — it
is a traced, reproducible defect confirmed against the codebase's own existing fixture, in code that
is squarely inside DISC-06's "edit in place a canonical `var$=OPTS…SETOPTS var$` block" contract.

Per the decision tree, any FAILED truth routes the phase to `gaps_found`, ahead of any
`human_needed`/`PRESENT_BEHAVIOR_UNVERIFIED` items that also exist (and several legitimately still
do — see below). This is not a live-rendering question; it is source code producing a demonstrably
wrong edit for an input the module's own tests already exercise at the safety layer.

## Goal Achievement

### Observable Truths (ROADMAP Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Hovering a `SETOPTS` literal, or an `IOR`/`AND` line against an OPTS-derived variable, shows which options that line sets or clears, with AND masks shown as the logical cleared bits | ✓ VERIFIED | Proven at every layer, including a live human retest this round: `88-UAT.md`'s G-88-1 is `status: resolved`, `resolved_by: "live retest tests 4 (VS Code) and 5 (IntelliJ), both passed 2026-09-11"`. Independently re-confirmed at the unit/e2e layer: targeted suite 225 passed/1 skipped |
| 2 | A user can generate a SETOPTS read-modify-write block from a tri-state Set/Clear/Leave form | ⚠️ PRESENT_BEHAVIOR_UNVERIFIED | Codegen defect (G-88-3) fixed and independently confirmed at source (`bbjHexLiteral()` used at `setopts-catalog.ts:472/474`, no stray quotes) and re-tested (225/226 targeted, 1502/1521 whole-suite with only the documented pre-existing java-interop drift). VS Code invocation live-confirmed in round-one retest modulo the now-fixed quoting bug. IntelliJ invocation (Alt+Enter / new context-menu door) still unconfirmed live — round-two retest staged but not yet run — see human verification |
| 3 | A user can edit in place an absolute `SETOPTS` literal or a canonical `var$=OPTS … SETOPTS var$` block; any other shape offers hover decode only, with no edit action presented | ✗ FAILED | CR-01 (88-REVIEW.md): `decodeInCode`'s chain edit-range computation is line-based, not statement-based, and silently corrupts/duplicates code for a safe, edit-eligible chain whose reassignment shares a physical line with the origin or `SETOPTS` statement via `;` — independently confirmed present and unfixed by direct source read, traced against an existing passing test fixture (`setopts-code-scanner.test.ts`'s "WR-B regression"). See Gaps below |
| 4 | Typing near a decoded SETOPTS line produces no visible input lag or CPU spike — decode is request-scoped, not a per-keystroke full-document walk | ✓ VERIFIED | Unchanged by this round's plans; no document-change listener added. `bbj-code-action-handler.ts`'s new bound applies to `codeAction`, not to a per-keystroke decode path |

**Score:** 2/4 ROADMAP truths fully verified; 1 present-and-wired but behavior-unverified
(IntelliJ composer reachability); 1 FAILED (chain edit-in-place range computation).

### What Changed Since the Last Verification — Independently Re-Verified, Not Trusted from SUMMARY.md

| Claim (from 88-10/88-11/88-12/88-13-SUMMARY.md) | Independently confirmed in this run |
|---|---|
| One shared `bbjHexLiteral`/`BbjHexLiteral.of` formatter now emits every generated `IOR`/`AND` mask argument as a bare `$…$` literal with no surrounding quotes | ✓ Read `bbj-vscode/src/setopts-catalog.ts:472/474` directly: `${variable}=IOR(${variable},${bbjHexLiteral(...)})` — no literal `"` characters in the template |
| The decoder now refuses a quoted hex literal at all three decode sites | ✓ Full targeted suite (225 passed, 1 skipped) includes `setopts-code-scanner.test.ts`'s narrowed-decoder coverage; re-run directly in this session |
| `textDocument/codeAction` is now bounded and gated at hover's own `DocumentState.Linked` state | ✓ `bbj-vscode/src/language/bbj-code-action-handler.ts` exists and is exercised by `bbj-code-action-handler.test.ts`, which passed in the targeted re-run |
| G-88-1 fully resolved by an actual live human retest (not just artifact-layer proof) | ✓ Read `88-UAT.md` directly: gap_id G-88-1, `status: resolved`, `resolved_by` names live retest tests 4 and 5, both `result: pass`, dated 2026-09-11 |
| G-88-2 (IntelliJ) and G-88-3 (mask-width) remain `status: failed`, pending the round-two live retest | ✓ Read `88-UAT.md` directly: both gap records still read `status: failed`; `88-LIVE-RETEST.md`'s verdict block (round two) is unfilled template text, confirming no retest has run yet |
| Phase 88 targeted suite passes cleanly | ✓ Re-ran directly in this session: **225 passed, 1 skipped (226)** across all 7 targeted files, including `installed-extension-e2e.test.ts` |
| Whole-suite regression sweep: 12 known-baseline failures, no new regressions | ✓ Re-ran directly in this session: **1502 passed, 12 failed, 7 skipped (1521)** — the 12 failures are exactly `linking.test.ts` (11, Interop-related) + `issue447-real-interop.test.ts` (1, `getAllClassNames` capability drift), the documented pre-existing java-interop environment-drift baseline |
| No planning identifier leaked into tracked source/QA-checklist files this round | ✓ `git diff a43a070a~1..HEAD -- bbj-vscode/src bbj-intellij/src QA/FULL-TEST-CHECKLIST.md examples/issue475-setopts-in-code.bbj`: no match for plan/gap/decision/review-finding id tokens |
| **NEW, not previously claimed by any SUMMARY:** CR-01's chain edit-range defect is unfixed | ✓ This verification's own direct read of `setopts-in-code-request.ts:182-200`, traced against `setopts-code-scanner.test.ts`'s existing "WR-B regression" fixture — see Gaps below |

### Required Artifacts

| Artifact | Expected | Status | Details |
|---|---|---|---|
| `bbj-vscode/src/setopts-catalog.ts` (`bbjHexLiteral`) | Single shared hex-literal formatter used by every generated `IOR`/`AND` line | ✓ VERIFIED | Read directly; lines 472/474 route through `bbjHexLiteral()`, no stray quotes |
| `bbj-vscode/src/language/setopts-code-scanner.ts` (`parseHexLiteral`) | Narrowed to the grammar's `HEX_STRING` terminal, refusing a quoted form | ✓ VERIFIED | Targeted suite includes this coverage and passes |
| `bbj-vscode/src/language/bbj-code-action-handler.ts` | Bounded `codeAction` handler, gated at `DocumentState.Linked` | ✓ VERIFIED | Present; `bbj-code-action-handler.test.ts` passes |
| `bbj-intellij/.../BbjComposeSetoptsInCodeAction.java` | Second, non-intention IntelliJ entry point into the composer | ✓ VERIFIED (artifact layer) | Present in source; distributable-level proof from 88-13's own rebuild not independently re-derived this round (not required — no `bbj-intellij/src` change happened after 88-13, per `git diff` above) — live invocation still unconfirmed, see human verification |
| `bbj-vscode/src/language/setopts-in-code-request.ts` (`createDecodeInCodeHandler`, chain branch) | Correct edit-in-place range for every safe chain shape, including line-sharing via `;` | ✗ STUB-LIKE DEFECT (CR-01) | Range computed from line numbers, not statement CST ranges — wrong for the shape `setopts-code-scanner.test.ts`'s own "WR-B regression" test proves is safe/edit-eligible |
| `.planning/phases/88-setopts-in-code-hovers-tri-state-composer/88-LIVE-RETEST.md` (round two) | Self-contained scripted retest for G-88-2 (IntelliJ) and Check 3 (mask width) | ✓ VERIFIED (present, unrun) | Present; all sections read directly; verdict block confirmed still blank |

### Key Link Verification

| From | To | Via | Status | Details |
|---|---|---|---|---|
| `traceOptsChain`'s `safe`/`links` verdict | `decodeInCode`'s `editable`/`chain` payload | shared classification at the *statement* level | ⚠️ MISWIRED (CR-01) | The safety verdict is correctly statement-level (confirmed by the passing "WR-B regression" test), but the downstream edit-range computation regresses to line-level, breaking the contract the safety walk assumes for exactly the shapes it approves |
| `composeSetOptsBlock` | both IDE clients' writers | server-side generation, client-side verbatim insert | ✓ WIRED | Confirmed: `bbjHexLiteral()` fix is server-side, so it reaches both hosts identically; unit/e2e re-run confirms |
| `bbj-code-action-handler.ts`'s bound | LSP4IJ's `ShowIntentionActionsHandler` / VS Code's Code Action lightbulb | `connection.onCodeAction` re-registration after `DocumentState.Linked` | ✓ WIRED (server side) | Confirmed by passing unit test and the e2e cold-ordering probe; live confirmation of the IntelliJ-side unblock is still pending human retest |
| VS Code/IntelliJ client UI | rendered hover popup / composer dialog | VS Code's/IntelliJ's own rendering pipeline | ✓ OBSERVED (hover only) | `88-UAT.md` G-88-1 records an actual passing human live retest for hover in both IDEs. The composer-invocation half (IntelliJ specifically) remains `? NOT OBSERVABLE HERE` — staged in `88-LIVE-RETEST.md` round two |

### Behavioral Spot-Checks / Test Execution (re-run fresh in this verification session)

| Behavior | Command | Result | Status |
|---|---|---|---|
| Phase 88 targeted suite (7 files) | `npx vitest run test/setopts-code-scanner.test.ts test/setopts-in-code-request.test.ts test/hover.test.ts test/setopts-catalog.test.ts test/setopts-in-code-ui.test.ts test/functional/installed-extension-e2e.test.ts test/bbj-code-action-handler.test.ts` | 225 passed, 1 skipped (226) | ✓ PASS |
| Whole-suite regression sweep | `npx vitest run --maxWorkers=2` | 1502 passed, 12 failed, 7 skipped (1521) — 12 failures = documented pre-existing java-interop drift (`linking.test.ts` 11 + `issue447-real-interop.test.ts` 1) | ✓ PASS (no new regressions) |
| G-88-3 quoting fix present at source | `grep -n "bbjHexLiteral" bbj-vscode/src/setopts-catalog.ts` | Lines 472/474 route through the formatter, no stray quotes in the template | ✓ PASS |
| CR-01 defect reproduction (traced, not executed) | Direct read of `setopts-in-code-request.ts:182-200` against `setopts-code-scanner.test.ts:401-410`'s fixture `A$=OPTS\nA$=IOR(A$,$08$) ; SETOPTS A$` | `originLine=0`, `startLine=1`, `endLine=1` → empty range returned with `editable:true` | ✗ CONFIRMS DEFECT |
| Register check over the round's diff | `git diff a43a070a~1..HEAD -- bbj-vscode/src bbj-intellij/src QA/FULL-TEST-CHECKLIST.md examples/issue475-setopts-in-code.bbj` | No plan/decision/gap/review-finding id tokens found | ✓ PASS |
| Debt-marker scan on round 3's key files | `grep -nE "TBD|FIXME|XXX|TODO|HACK|PLACEHOLDER"` across `setopts-catalog.ts`, `setopts-in-code-request.ts`, `setopts-composer-webview.ts`, `setopts-in-code-ui.ts`, `bbj-code-action-handler.ts`, `BbjHexLiteral.java`, `BbjComposeSetoptsInCodeAction.java`, `SetoptsInCodeActionAvailability.java` | No matches | ✓ PASS |

### Requirements Coverage

| Requirement | Source Plans | Description | Status | Evidence |
|---|---|---|---|---|
| DISC-05 | 88-01, 88-02, 88-07, 88-08, 88-09, 88-11 | Hover decode for SETOPTS literal / IOR/AND-against-OPTS-derived-variable, AND masks as cleared bits | ✓ SATISFIED | Fully proven end-to-end, including an actual human live retest in both IDEs this round (`88-UAT.md` G-88-1 `status: resolved`). `REQUIREMENTS.md` correctly reads `Complete` for DISC-05 — this is the one place this round's premature-Complete pattern (see below) happens to land on the right answer, because DISC-05's own live evidence genuinely closed |
| DISC-06 | 88-02 (oracle only), 88-03, 88-04, 88-05, 88-06, 88-07, 88-08, 88-09, 88-10, 88-11, 88-12, 88-13 | Tri-state compose-new + edit-in-place for the two statically-safe shapes, both IDEs | ✗ BLOCKED | Two independent reasons: (1) CR-01 — the edit-in-place half has a confirmed, unfixed defect that corrupts a safe chain shape's own edited file; (2) the compose-new half's IntelliJ invocation and 88-RESEARCH.md Assumption A2's live mask-width question are both still genuinely unresolved (round-two `88-LIVE-RETEST.md` unrun). `REQUIREMENTS.md` currently reads `Complete` for DISC-06 — **this is incorrect and should be reverted to `Gaps Found`**, mirroring the correction already made once before in commit `a43a070a` for the same premature-marking pattern (this time introduced by plan 88-11's `docs(88-11): complete SETOPTS decoder-narrowing plan` commit `f3d40687`, which flipped both rows to `Complete` even though `88-UAT.md`'s own G-88-2/G-88-3 records — and 88-13-SUMMARY.md's own explicit disclaimer — say the opposite) |

No orphaned requirements — DISC-05 and DISC-06 are the only two mapped to Phase 88 in
`REQUIREMENTS.md`, and both are claimed by plans in this phase's set.

**Documentation-accuracy finding (not itself a code defect, but part of goal-achievement
verification):** `REQUIREMENTS.md` lines 21 and 102 mark DISC-06 `[x]`/`Complete`. Given CR-01 (a
confirmed, unfixed functional defect touching exactly DISC-06's edit-in-place contract) and
`88-UAT.md`'s own G-88-2/G-88-3 records still reading `status: failed`, this marking should be
reverted to `Gaps Found` — the same correction `a43a070a` already made once for this exact pattern
in this phase's history.

### Anti-Patterns Found

No blocker-level debt markers (TBD/FIXME/XXX/TODO/HACK/PLACEHOLDER) in any file touched by
88-10 through 88-13 — confirmed by direct grep. No leaked planning identifiers in the round's
source/QA diff.

One blocker-level defect found by this verification via direct code tracing (not a grep
anti-pattern, but a confirmed logic error): **CR-01**, detailed above and in Gaps.

Carried forward from `88-REVIEW.md` (not independently re-verified fix status this round — neither
has any 88-10..88-13 plan touched these paths — but worth restating since they compound CR-01's
risk surface):

- **WR-01** (warning): VS Code's tri-state chain composer applies its edit with no staleness
  re-validation (unlike IntelliJ's `StaleEditGuard`) — a document changed between decode and apply
  can silently corrupt unrelated lines, independent of CR-01.
- **WR-02** (warning): a comment/blank line between the origin and the first reassignment is
  silently deleted by an edit-in-place — root cause shared with CR-01; resolves naturally once
  CR-01 is fixed with statement-anchored ranges.
- **WR-03** (warning): `composeTriState`'s server handler performs no defensive validation of
  `selection.entries` — not currently exploitable (only trusted IDE clients call it), low urgency.
- **IN-01/IN-02** (info): pre-existing `innerHTML` pattern in both webviews; `vscode:prepublish`
  double-bundles on publish. Neither blocks the phase goal.

### Human Verification Required

1. **IntelliJ composer reachability — Check 2 of `88-LIVE-RETEST.md` (round two).** Place the caret
   on a SETOPTS-in-code line in `examples/issue475-setopts-in-code.bbj`, against
   `bbj-intellij-0.1.0.zip` (sha256 `e76f76824dcb4f706e454b8465fa069c941b0e1ef5ee9d6fb8e8ca84ce51cc66`).
   Expected: Alt+Enter opens "Configure SETOPTS options in code…" without the round-one
   "Searching for Context Actions..."/"Pull Docker Image" hang; the new right-click context-menu
   entry opens the same composer as a second door. Why human: no IntelliJ sandbox in this
   devcontainer; the server-side fix is proven at the unit/e2e layer but the IntelliJ platform's
   own intention-search behavior can only be observed live.

2. **Live mask-width falsification — Check 3 of `88-LIVE-RETEST.md` (round two), 88-RESEARCH.md
   Assumption A2.** Compose a block via Check 1, run it as GUI/BUI/DWC against a live BBjServices.
   Expected: the generated `IOR`/`AND` calls (16-byte/32-hex-digit mask base) run without a BBj
   `!ERROR`. Why human: headless BBj execution is confirmed blocked in this devcontainer (no
   display, no termcap file, no `xvfb-run`); this specific question has never actually been
   answered — the prior attempt's failure was entirely the now-fixed quoting defect.

### Gaps Summary

One blocker gap this round, found independently by this verification rather than carried forward
from any prior UAT record: **CR-01**, an unfixed critical code-review finding that the chain
edit-in-place range computation in `setopts-in-code-request.ts` is line-based rather than
statement-based, and silently corrupts or duplicates code for a safe, edit-eligible chain shape the
codebase's own tests already prove is classified `safe: true` (the semicolon-joined "WR-B
regression" shape). This is not a live-rendering question — it is traced, reproducible source
behavior, confirmed by this verification's own direct read of the unchanged handler against an
existing passing test fixture. It sits squarely inside ROADMAP Success Criterion #3 / DISC-06's
"edit in place a canonical `var$=OPTS…SETOPTS var$` block" contract, so the phase goal is not yet
achieved.

Two items remain correctly staged for human verification and are not gaps in the FAILED sense —
they are present-and-wired-but-unobserved (IntelliJ composer reachability) or genuinely undecided
pending a live runtime (the mask-width question) — both scripted in `88-LIVE-RETEST.md` round two,
which is ready but has not yet been run.

One documentation-accuracy issue: `REQUIREMENTS.md` marks DISC-06 `Complete`; given CR-01 and the
still-open G-88-2/G-88-3 UAT records, it should read `Gaps Found` — the same correction previously
applied once already (`a43a070a`) for the identical premature-marking pattern.

---

_Verified: 2026-09-11T11:15:00Z_
_Verifier: Claude (gsd-verifier)_
