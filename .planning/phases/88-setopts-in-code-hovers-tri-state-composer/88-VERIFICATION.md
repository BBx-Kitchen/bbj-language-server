---
phase: 88-setopts-in-code-hovers-tri-state-composer
verified: 2026-09-11T13:31:41Z
status: gaps_found
score: 2/4 ROADMAP truths fully verified (1 present-behavior-unverified, 1 FAILED — new CR-01)
behavior_unverified: 1
overrides_applied: 0
re_verification:
  previous_status: gaps_found
  previous_score: "2/4 ROADMAP truths verified (1 present-behavior-unverified, 1 FAILED — round-three CR-01, the chain edit-range line-arithmetic bug)"
  gaps_closed:
    - "Round-three CR-01 (decodeInCode's chain edit-in-place range computed from origin/SETOPTS document line numbers, producing an empty [1,1) or inverted range for a safe chain sharing a physical line via ';') is fixed and independently confirmed: bbj-vscode/src/language/setopts-in-code-request.ts's chain branch is now anchored on the reassignment statements' own CST ranges (linkStatementNodes, exposed by setopts-code-scanner.ts's traceOptsChain/walkChain), requires each link to be a single-assignment LetStatement, and fails closed to a new named SetOptsNotEditableReason ('shared-line') with no chain/initial payload whenever the region cannot be expressed as a whole-line replace the chain owns outright. Read directly at setopts-in-code-request.ts:253-347 (unchanged from plan 88-14's own commits f7c1d204/f2e3ed77/3fb6be1b, confirmed by `git log`)."
    - "10 new edit-range-layer tests in bbj-vscode/test/setopts-in-code-request.test.ts pin the exact shape the review traced (semicolon-shared line), its degenerate all-on-one-line variant, an unrelated statement sharing a line, a comma-joined reassignment, a LET-prefixed single reassignment (proves statement- not assignment-anchoring), a comment before/between reassignments, and a blank line between reassignments — independently re-run in this verification: 235 passed, 1 skipped across the 7-file Phase 88 targeted suite (matches 88-14-SUMMARY.md's claim exactly)."
    - "Scanner's own decode verdict (traceOptsChain's safe/unsafe classification) is confirmed byte-identical: setopts-code-scanner.test.ts is unmodified by plan 88-14 (git diff --name-only confirms) and passes in full, so the hover-decode side (DISC-05) is unaffected by the edit-gate narrowing (DISC-06)."
    - "Whole-suite regression sweep independently re-run in this verification (--maxWorkers=2): 1513 passed, 12 failed (11 in test/linking.test.ts + 1 in test/issue447-real-interop.test.ts, exactly the documented pre-existing java-interop drift baseline), 6 skipped — no new regression from plan 88-14's changes."
  gaps_remaining:
    - "G-88-2's IntelliJ live-render half (Alt+Enter and the editor-context-menu entry actually open the composer) — 88-LIVE-RETEST.md round two is written and ready but its verdict block is still blank; no human has re-run it. Unaffected by this round's plan (88-14 touched no client/writer file)."
    - "G-88-3's actual purpose — 88-RESEARCH.md Assumption A2, the live BBjServices mask-width question — remains genuinely unanswered; 88-LIVE-RETEST.md's Check 3 is staged but unrun. Unaffected by this round's plan."
  regressions:
    - "NEW (found by this verification via the just-committed 88-REVIEW.md, not present in the prior round's gaps): a freshly-run standard-depth code review (88-REVIEW.md, reviewed 2026-09-11T13:22:27Z, committed as the HEAD commit ca077aa1 — i.e. AFTER plan 88-14 closed the round-three CR-01) found a *different* Critical finding, also labeled CR-01 by review-section numbering: the VS Code tri-state composer webview (bbj-vscode/src/setopts-tristate-webview.ts:116-134, and bbj-vscode/src/setopts-composer-webview.ts:94-117 reused by setopts-in-code-ui.ts's absolute-mode branch) applies its edit using `target.startLine`/`target.endLine`/`target.hexRange` line numbers captured at decode time, with no re-decode or document-version check before `vscode.workspace.applyEdit`, unlike IntelliJ's `StaleEditGuard` (confirmed independently: `ComposerLauncher.java` wires `StaleEditGuard` at three separate call sites — compose-new, absolute edit, chain edit — while grepping `bbj-vscode/src/*.ts` for `StaleEditGuard`/any document-version check on the SETOPTS composer paths returns nothing, and no test in `bbj-vscode/test/` exercises a document mutation between decode and apply). This asymmetry was already known and recorded as a Warning (WR-01) in the round-three verification's anti-pattern scan; the fresh, dedicated code review conducted after 88-14 independently re-examined it and classified it Critical. It is unfixed: `git diff ca077aa1..HEAD` on the affected files is empty (ca077aa1, the review commit, is HEAD)."
gaps:
  - truth: "A user can edit in place an absolute SETOPTS literal or a canonical var$=OPTS … SETOPTS var$ block; any other shape offers hover decode only, with no edit action presented (ROADMAP Success Criterion #3 / DISC-06)"
    status: failed
    reason: "The phase goal's own wording is 'can SAFELY compose or edit the two statically-safe shapes' — SC3 is specifically the safety-of-editing criterion, not merely 'an edit action exists'. 88-REVIEW.md's CR-01 (Critical, unfixed, confirmed present by direct source read in this verification) shows that VS Code's edit-in-place apply handlers for both statically-safe shapes (absolute literal via setopts-composer-webview.ts, and the chain via setopts-tristate-webview.ts) commit a whole-line/whole-token replace using line numbers captured at decode time, with no re-validation against the document's current state or version immediately before the write. If the user edits the document (e.g. inserts/deletes a line above the target) while the composer panel is open — which nothing prevents, since VS Code's webview is a non-modal ViewColumn.Beside panel, unlike IntelliJ's blocking DialogWrapper — apply silently replaces whatever now occupies that stale line range, corrupting or deleting code the chain/literal never owned. IntelliJ's equivalent edit paths are proven safe against exactly this scenario by a wired, tested StaleEditGuard; VS Code's are not. This is the identical failure mode SC3 exists to prevent (an edit corrupting code outside what the safe shape actually owns), just triggered by a race with the user's own concurrent typing instead of by wrong arithmetic."
    artifacts:
      - path: "bbj-vscode/src/setopts-tristate-webview.ts"
        issue: "Lines 116-134 (apply handler): replaces [target.startLine, target.endLine) using line numbers captured at decode time with no re-decode/version check immediately before vscode.workspace.applyEdit"
      - path: "bbj-vscode/src/setopts-composer-webview.ts"
        issue: "Lines 94-117 (apply handler, absolute-literal path reused by setopts-in-code-ui.ts): replaces target.hexRange on target.line with the same no-revalidation pattern"
    missing:
      - "A staleness guard on the VS Code side equivalent to IntelliJ's StaleEditGuard: re-run decodeInCode (or at minimum compare the target vscode.TextDocument's version) immediately before applyEdit, and abort with a 'document changed, please retry' message on any mismatch, for both the absolute and chain edit-in-place paths"
      - "Test coverage in bbj-vscode/test/ exercising a document mutation between decode and apply for at least one of the two edit paths, mirroring the IntelliJ *SourceGuardTest family already covering this scenario"
deferred: []
behavior_unverified_items:
  - truth: "A user can generate a SETOPTS read-modify-write block from a tri-state Set/Clear/Leave form, invoked via the Code Action lightbulb/Command Palette/context menu in VS Code and Alt+Enter/context-menu in IntelliJ (ROADMAP Success Criterion #2 / DISC-06)"
    test: "Run 88-LIVE-RETEST.md (round two) Check 2 (IntelliJ's two reachability doors: Alt+Enter and the editor context-menu entry) against the build identities the document names (VS Code installedTimestamp 2026-09-11T10:47:24Z; IntelliJ zip sha256 e76f76824dcb4f706e454b8465fa069c941b0e1ef5ee9d6fb8e8ca84ce51cc66)."
    expected: "Either door opens the composer without the 'Searching for Context Actions...'/'Pull Docker Image' hang reported in 88-UAT.md test 7."
    why_human: "No IntelliJ sandbox exists in this devcontainer — the server-side fix (bbj-code-action-handler.ts's bounded/DocumentState.Linked-gated codeAction, plus the new BbjComposeSetoptsInCodeAction context-menu entry) is proven correct at the unit/e2e/artifact layers, but whether Alt+Enter or the context menu actually opens the dialog in a live IntelliJ session is UI behavior only a human with that sandbox can observe. 88-LIVE-RETEST.md round two is written and ready but its verdict block is unfilled — unchanged since the prior verification round; plan 88-14 did not touch any client/writer file."
human_verification:
  - test: "88-LIVE-RETEST.md (round two) Check 2 — IntelliJ reachability, both doors (Alt+Enter and the editor context-menu entry) — against bbj-intellij-0.1.0.zip sha256 e76f76824dcb4f706e454b8465fa069c941b0e1ef5ee9d6fb8e8ca84ce51cc66."
    expected: "'Configure SETOPTS options in code…' appears via Alt+Enter and opens the composer within a reasonable time; the editor context-menu entry opens the same composer as a second, intention-search-independent door."
    why_human: "No IntelliJ sandbox reachable from this devcontainer; the server-side timing/gating fix is proven by unit test and a cold-ordering e2e probe, but the actual IntelliJ platform-side intention-search behavior can only be observed live."
  - test: "88-LIVE-RETEST.md (round two) Check 3 — live mask-width falsification, 88-RESEARCH.md Assumption A2. Using the block composed in Check 1, run the program as GUI/BUI/DWC against a live BBjServices."
    expected: "The generated IOR/AND calls (16-byte/32-hex-digit full-width mask base) run without raising a BBj !ERROR — the quoting defect that aborted the original attempt is fixed (confirmed present in setopts-catalog.ts), so this question is now isolated and still open."
    why_human: "Headless BBj execution is confirmed blocked in this devcontainer (no display, no termcap file, no xvfb-run installed)."
---

# Phase 88: SETOPTS-in-Code Hovers & Tri-State Composer Verification Report

**Phase Goal:** Users working with SETOPTS/IOR/AND expressions directly in BBj code get accurate decode hovers everywhere, and can safely compose or edit the two statically-safe shapes.
**Verified:** 2026-09-11T13:31:41Z
**Status:** gaps_found
**Re-verification:** Yes — fourth round, following gap-closure plan 88-14 (statement-anchored chain edit-region computation, closing the round-three CR-01 line-arithmetic defect)

## Why this stays at `gaps_found`, not `passed` or `human_needed`

Plan 88-14 did exactly what it set out to do, and did it correctly: the round-three CR-01
(`decodeInCode`'s chain edit-in-place range computed from document line numbers, producing an
empty or inverted replace region for a safe chain sharing a physical line via `;`) is fixed. This
verification independently re-read the new implementation
(`bbj-vscode/src/language/setopts-in-code-request.ts:253-347`), confirmed it anchors the region on
the reassignment statements' own CST ranges and fails closed with a new named
`SetOptsNotEditableReason` (`'shared-line'`) exactly as designed, and independently re-ran both the
7-file Phase 88 targeted suite (235 passed, 1 skipped — matches the SUMMARY's claim) and the
whole-suite regression sweep (1513 passed, 12 failed — the exact, unchanged pre-existing
java-interop baseline, 6 skipped). Ten new tests pin the full line-sharing/line-owning matrix
(shared-line via `;`, the all-on-one-line degenerate case, an unrelated statement, a comma-joined
reassignment, a `LET`-prefixed reassignment, comments before/between reassignments, a blank line).
None of this is trusted from `88-14-SUMMARY.md` — every claim above was independently re-derived
against the current source tree in this session.

This phase does not, however, move to `passed`, because a **standard-depth code review
(`88-REVIEW.md`) was run against the current HEAD *after* plan 88-14 closed** and found a new
Critical finding, itself labeled `CR-01` by that review's own section numbering (a different defect
from the round-three `CR-01`, which is now fixed): VS Code's SETOPTS composer webviews
(`setopts-tristate-webview.ts`'s chain apply handler and `setopts-composer-webview.ts`'s
absolute-literal apply handler, the latter reused by `setopts-in-code-ui.ts`) apply their edit
using line numbers captured at decode time, with no re-decode or document-version check
immediately before `vscode.workspace.applyEdit` — unlike IntelliJ's `StaleEditGuard`, which this
phase's own IntelliJ code wires at all three of its edit-in-place call sites (compose-new, absolute,
chain) and which the IntelliJ `*SourceGuardTest` family explicitly covers.

**This verification treats that finding as a must-have gap, not an out-of-scope warning**, for one
specific reason: ROADMAP Success Criterion #3 is not "an edit action exists for the two
statically-safe shapes" — it is that a user "can **safely** compose or edit" them. The word
"safely" is the entire point of distinguishing the two statically-safe shapes from every other
shape (which gets hover-only, precisely because editing them cannot be done safely). A live code
review — using the project's own standard review methodology — rated this defect Critical, and it
touches exactly the two edit-in-place paths SC3 names, on exactly the one host (VS Code) that lacks
the staleness protection the other host (IntelliJ) already has for the identical operation. It is
also unfixed: `ca077aa1` (the review commit) is `HEAD`, and no follow-up commit touches either
webview file. There is no override in this file's frontmatter accepting the deviation. Per the
decision tree, a FAILED must-have routes the phase to `gaps_found` ahead of the still-legitimately-
open human-verification items (IntelliJ live reachability, the live mask-width question), which
remain correctly staged and unaffected by this round.

**Counter-consideration recorded for the human decision-maker:** the round-three verification's own
anti-pattern scan already knew about this exact asymmetry and classified it as a Warning (`WR-01`),
not a blocker, reasoning it "compounds CR-01's risk surface" rather than independently failing the
phase. The fresh, dedicated code review reached a different (Critical) severity call on the same
underlying fact. Both readings are defensible; this verification follows the more recent, more
formal source (a standard-depth review specifically scoped to this phase's changed files) and the
literal wording of the ROADMAP success criterion, but flags the disagreement explicitly rather than
silently picking one. If the project decides the narrow race-condition window (user must edit the
document while the non-modal panel is open, between decode and apply) is an acceptable, documented
risk for VS Code parity with IntelliJ, an override entry in this file's frontmatter is the
mechanism to record that decision and move SC3 to `PASSED (override)`.

## Goal Achievement

### Observable Truths (ROADMAP Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Hovering a `SETOPTS` literal, or an `IOR`/`AND` line against an OPTS-derived variable, shows which options that line sets or clears, with AND masks shown as the logical cleared bits | ✓ VERIFIED | Unaffected by plan 88-14: `setopts-code-scanner.test.ts` is unmodified (`git diff --name-only` confirms) and passes in full; `88-UAT.md`'s G-88-1 is `status: resolved` via an actual live human retest in both IDEs (tests 4 and 5, both `result: pass`, 2026-09-11) |
| 2 | A user can generate a SETOPTS read-modify-write block from a tri-state Set/Clear/Leave form | ⚠️ PRESENT_BEHAVIOR_UNVERIFIED | Unaffected by plan 88-14 (no client/writer file touched). VS Code invocation live-confirmed in round-one retest (mask-quoting defect since fixed). IntelliJ invocation (Alt+Enter / context-menu door) still unconfirmed live — `88-LIVE-RETEST.md` round two staged but unrun — see Human Verification |
| 3 | A user can edit in place an absolute `SETOPTS` literal or a canonical `var$=OPTS … SETOPTS var$` block; any other shape offers hover decode only, with no edit action presented | ✗ FAILED | Round-three's line-arithmetic defect is fixed and independently confirmed (see below). But `88-REVIEW.md`'s new CR-01 (Critical, unfixed) shows VS Code's edit-in-place apply for both statically-safe shapes has no staleness/re-decode guard, unlike IntelliJ's wired `StaleEditGuard` — the "safely" half of this criterion is not met on VS Code. See Gaps below and the reasoning above |
| 4 | Typing near a decoded SETOPTS line produces no visible input lag or CPU spike — decode results hook into the existing debounced document-build cycle rather than an independent full-document walk per keystroke | ✓ VERIFIED | Unchanged by plan 88-14: no document-change listener added; the chain-region computation runs once per `decodeInCode` request, scoped to the resolved leaf, not a per-keystroke walk (confirmed by direct read of the modified handler) |

**Score:** 2/4 ROADMAP truths fully verified; 1 present-and-wired but behavior-unverified (IntelliJ
composer reachability, unaffected by this round); 1 FAILED (VS Code edit-in-place staleness gap,
newly surfaced by this round's code review).

### What Changed Since the Last Verification — Independently Re-Verified, Not Trusted from SUMMARY.md

| Claim (from 88-14-SUMMARY.md) | Independently confirmed in this run |
|---|---|
| `decodeInCode`'s chain branch is now anchored on the reassignment statements' own CST ranges (`linkStatementNodes`), not origin/SETOPTS line arithmetic | ✓ Read `setopts-in-code-request.ts:253-347` directly: `startLine`/`endLine` are computed from `linkCsts` (the link statements' own CST offsets), with an explicit `regionOwnedExclusively` residue check and a `SetOptsNotEditableReason: 'shared-line'` fail-closed branch |
| The shared-line chain (`A$=OPTS\nA$=IOR(A$,$08$) ; SETOPTS A$`, the exact round-three defect fixture) now returns `editable: false` with the named reason instead of an empty `[1,1)` range | ✓ `bbj-vscode/test/setopts-in-code-request.test.ts:169` asserts `result.reason === NOT_EDITABLE_REASON_TEXT['shared-line']` for this fixture; test independently re-run and passes |
| The degenerate all-on-one-line chain never returns an inverted range | ✓ `bbj-vscode/test/setopts-in-code-request.test.ts:202` (line 191 test) asserts the same fail-closed reason for this fixture |
| The scanner's own decode verdict (`traceOptsChain`) is byte-identical | ✓ `setopts-code-scanner.test.ts` unmodified by this round's commits (`git log` on the file shows no 88-14 commit) and passes in full |
| Phase 88 targeted suite passes cleanly (235 passed, 1 skipped) | ✓ Independently re-run in this session: **235 passed, 1 skipped (236)** across the 7 targeted files |
| Whole-suite regression sweep: 12 pre-existing failures, no new regressions | ✓ Independently re-run in this session (`--maxWorkers=2`): **1513 passed, 12 failed, 6 skipped (1531)** — the 12 failures are exactly `test/linking.test.ts` (11) + `test/issue447-real-interop.test.ts` (1), the documented pre-existing java-interop drift baseline |
| No planning identifier leaked into tracked source/test files this round | ✓ `git diff --unified=0 f2e3ed77~1..3fb6be1b -- bbj-vscode/src bbj-vscode/test \| grep -nE '^\+.*((CR\|WR)-[0-9A-Z]+\|G-88-[0-9])'` matches nothing |
| **NEW, not claimed by any SUMMARY, found by this verification's own reading of the just-committed `88-REVIEW.md`:** VS Code's SETOPTS composer apply handlers have no staleness guard, unlike IntelliJ's `StaleEditGuard` | ✓ `git log --oneline -3 -- .planning/phases/88-.../88-REVIEW.md` shows `ca077aa1` (this review) is `HEAD`; `git diff ca077aa1..HEAD` on the affected webview files is empty (unfixed); direct read of `setopts-tristate-webview.ts:116-134` and `setopts-composer-webview.ts:94-117` confirms no version/re-decode check; `grep -n StaleEditGuard bbj-vscode/src/*.ts` returns nothing; `ComposerLauncher.java` wires `StaleEditGuard` at three call sites (lines 220, 334, 391) |

### Required Artifacts

| Artifact | Expected | Status | Details |
|---|---|---|---|
| `bbj-vscode/src/language/setopts-code-scanner.ts` (`linkStatementNodes`/`linkStatementsNewestFirst`) | Chain links' enclosing statements exposed for the edit-region computation, scanner verdict unchanged | ✓ VERIFIED | Read directly; `traceOptsChain` reverses and forwards `linkStatementNodes` on the safe-chain result only; `setopts-code-scanner.test.ts` unmodified and passing |
| `bbj-vscode/src/language/setopts-in-code-request.ts` (`createDecodeInCodeHandler`, chain branch) | Statement-anchored, fail-closed edit-in-place region for every safe chain shape | ✓ VERIFIED | Round-three CR-01 confirmed fixed by direct read and by the new tests |
| `bbj-vscode/test/setopts-in-code-request.test.ts` | Edit-range-layer coverage for the full line-sharing/line-owning matrix | ✓ VERIFIED | 10 new tests present, independently re-run and passing |
| `bbj-vscode/src/setopts-tristate-webview.ts` / `bbj-vscode/src/setopts-composer-webview.ts` (apply handlers) | Edit application safe against a document that changed between decode and apply | ✗ GAP (new CR-01, 88-REVIEW.md) | No staleness/re-decode/version check before `applyEdit`, unlike IntelliJ's wired `StaleEditGuard`; confirmed present and unfixed by direct read |
| `.planning/phases/88-.../88-LIVE-RETEST.md` (round two) | Self-contained scripted retest for G-88-2 (IntelliJ) and Check 3 (mask width) | ✓ VERIFIED (present, unrun) | Present; verdict block confirmed still blank |

### Key Link Verification

| From | To | Via | Status | Details |
|---|---|---|---|---|
| `traceOptsChain`'s safe/`links` verdict | `decodeInCode`'s `editable`/`chain` payload | `linkStatementNodes`, statement-level CST anchoring | ✓ WIRED (fixed) | Confirmed by direct read and by the new test matrix; the safety verdict and the edit-range representability gate are now correctly layered, matching the review's own recommended fix |
| `decodeInCode`'s `chain.startLine`/`chain.endLine` | VS Code's `setopts-tristate-webview.ts` apply handler | line-numbers passed through unchanged, applied with no re-validation | ⚠️ UNSAFE (new CR-01) | The handoff itself works (both writers already refuse an edit when `editable` is false), but the consuming writer trusts a potentially stale region with no re-check immediately before the write |
| `decodeInCode`'s `absolute.hexRange`/`.line` | VS Code's `setopts-composer-webview.ts` apply handler | same pattern | ⚠️ UNSAFE (new CR-01) | Same defect class as above, on the absolute-literal edit path |
| IntelliJ's `ComposerLauncher` edit paths (compose-new, absolute, chain) | `StaleEditGuard` | `guard.applyIfUnchanged`, re-decode-and-compare before write | ✓ WIRED | Confirmed at three call sites (`ComposerLauncher.java:220,334,391`); this is the parity IntelliJ has and VS Code lacks |

### Behavioral Spot-Checks / Test Execution (re-run fresh in this verification session)

| Behavior | Command | Result | Status |
|---|---|---|---|
| Phase 88 targeted suite (7 files) | `npx vitest run test/setopts-code-scanner.test.ts test/setopts-in-code-request.test.ts test/hover.test.ts test/setopts-catalog.test.ts test/setopts-in-code-ui.test.ts test/functional/installed-extension-e2e.test.ts test/bbj-code-action-handler.test.ts` | 235 passed, 1 skipped (236) | ✓ PASS |
| Whole-suite regression sweep | `npx vitest run --maxWorkers=2` | 1513 passed, 12 failed, 6 skipped (1531) — 12 failures = documented pre-existing java-interop drift | ✓ PASS (no new regression) |
| Plan 88-14 commits exist and match SUMMARY | `git log --oneline -5 -- setopts-in-code-request.ts setopts-code-scanner.ts setopts-in-code-request.test.ts` | `f7c1d204`, `f2e3ed77`, `3fb6be1b` all present | ✓ PASS |
| Register check over plan 88-14's diff | `git diff --unified=0 f2e3ed77~1..3fb6be1b -- bbj-vscode/src bbj-vscode/test \| grep -nE '^\+.*((CR\|WR)-[0-9A-Z]+\|G-88-[0-9])'` | No match (grep exit 1) | ✓ PASS |
| Debt-marker scan on plan 88-14's 3 touched files | `grep -nE "TBD\|FIXME\|XXX\|TODO\|HACK\|PLACEHOLDER"` | No matches | ✓ PASS |
| New CR-01 (staleness) confirmed unfixed | `git log --oneline -3 -- 88-REVIEW.md` (HEAD is the review commit); `grep -n StaleEditGuard bbj-vscode/src/*.ts` | Review commit is HEAD; no VS Code staleness guard found anywhere | ✗ CONFIRMS DEFECT |

### Requirements Coverage

| Requirement | Source Plans | Description | Status | Evidence |
|---|---|---|---|---|
| DISC-05 | 88-01, 88-02, 88-07, 88-08, 88-09, 88-11, 88-14 | Hover decode for SETOPTS literal / IOR/AND-against-OPTS-derived-variable, AND masks as cleared bits | ✓ SATISFIED | Fully proven end-to-end including a live human retest in both IDEs; unaffected and unregressed by this round. `REQUIREMENTS.md` reads `Complete` for DISC-05 — accurate |
| DISC-06 | 88-02 (oracle only), 88-03 through 88-14 | Tri-state compose-new + edit-in-place for the two statically-safe shapes, both IDEs, *safely* | ✗ BLOCKED | The round-three line-arithmetic defect is fixed, but the new CR-01 (VS Code staleness gap on both edit-in-place paths) is unfixed and touches exactly this requirement's "safely edit" contract; IntelliJ's live composer reachability (G-88-2) and the live mask-width question (G-88-3) also remain open, staged for human verification. `REQUIREMENTS.md` currently reads `Complete` for DISC-06 (set by plan 88-14's own commit) — **this should be reverted to `Gaps Found`**, the third time this exact premature-marking correction has been needed in this phase's history (previously corrected once in commit `a43a070a`/`1aceabc9` for the round-three CR-01, and now again for the new CR-01) |

No orphaned requirements — DISC-05 and DISC-06 are the only two mapped to Phase 88 in
`REQUIREMENTS.md`, and both are claimed by plans in this phase's set (all 14 plans checked).

**Documentation-accuracy finding (not itself a code defect, but part of goal-achievement
verification):** `REQUIREMENTS.md` lines 21 and 102 mark DISC-06 `[x]`/`Complete`, set by plan
88-14's own commit `487e1c8f` (`docs(88-14): complete chain edit-in-place CST-anchoring
gap-closure plan`). Plan 88-14 was correct that *its own* scoped defect was fixed, but the
requirement itself is broader than that one plan's scope, and a fresh, independent code review
completed and committed after that marking found a new, unfixed Critical defect squarely inside
DISC-06's contract. This marking should be reverted to `Gaps Found` pending the staleness-guard
fix (or an accepted override).

### Anti-Patterns Found

No blocker-level debt markers (TBD/FIXME/XXX/TODO/HACK/PLACEHOLDER) in any file touched by plan
88-14 — confirmed by direct grep. No leaked planning identifiers in the round's source/test diff.

One Critical finding from `88-REVIEW.md`, confirmed still present and unfixed by this verification
(detailed above as a gap): **CR-01** (VS Code staleness guard).

Carried forward from `88-REVIEW.md`, not independently re-verified fix status this round (no
88-14 commit touches these paths) but restated since they inform risk context:

- **WR-01**: `matchStatement`'s control-flow disqualification list omits RETURN/BREAK/STOP/exit
  statements, risking a false "safe" chain verdict in an unusual code shape.
- **WR-02**: the new SETOPTS-in-code hover branch in `bbj-hover.ts` runs before the file's own
  "never let a hover error surface as a failed LSP request" `try`/`catch`.
- **WR-03**: `vscode:prepublish`'s minify step targets an orphaned bundle; the shipped extension
  bundles stay unminified with source maps.
- **WR-04**: `bbj-code-action-handler.ts`'s bounded budget swallows every failure into an
  undifferentiated `null` with no diagnostic signal.
- **IN-01/IN-02** (info): case-sensitive extension matching in `SetoptsInCodeActionAvailability`;
  VS Code's compose-new applies a no-op edit on an all-Leave selection where IntelliJ early-returns.

None of WR-01 through WR-04 or IN-01/IN-02 independently block the phase goal; they are recorded
for completeness and do not change this verification's status.

### Human Verification Required

1. **IntelliJ composer reachability — Check 2 of `88-LIVE-RETEST.md` (round two).** Place the caret
   on a SETOPTS-in-code line in `examples/issue475-setopts-in-code.bbj`, against
   `bbj-intellij-0.1.0.zip` (sha256 `e76f76824dcb4f706e454b8465fa069c941b0e1ef5ee9d6fb8e8ca84ce51cc66`).
   Expected: Alt+Enter opens "Configure SETOPTS options in code…" without the round-one hang; the
   editor context-menu entry opens the same composer as a second door. Why human: no IntelliJ
   sandbox in this devcontainer.

2. **Live mask-width falsification — Check 3 of `88-LIVE-RETEST.md` (round two), 88-RESEARCH.md
   Assumption A2.** Compose a block via Check 1, run it as GUI/BUI/DWC against a live BBjServices.
   Expected: the generated `IOR`/`AND` calls run without a BBj `!ERROR`. Why human: headless BBj
   execution is confirmed blocked in this devcontainer.

### Gaps Summary

One blocker gap this round, found independently by this verification via a just-committed, fresh
code review of the current HEAD (not carried forward from any prior UAT record, and distinct from
the round-three gap this round's plan 88-14 correctly closed): **a new CR-01** — VS Code's
SETOPTS-in-code composer apply handlers (both the absolute-literal and the chain edit-in-place
paths) commit a whole-line/whole-token replace using line numbers captured at decode time, with no
re-decode or document-version check immediately before the write, unlike IntelliJ's wired
`StaleEditGuard`. This sits squarely inside ROADMAP Success Criterion #3 / DISC-06's "can **safely**
… edit" contract — the round-three fix corrected the *arithmetic* that computes the region; this
finding is about the *safety* of applying that region against a document that may have changed
since it was computed. The reasoning for treating this as a must-have gap (rather than an
out-of-scope warning) is spelled out above, along with the counter-consideration that a prior,
less formal pass classified the same underlying asymmetry as a non-blocking Warning — an override
in this file's frontmatter is available if the project decides otherwise.

Two items remain correctly staged for human verification and are not gaps in the FAILED sense —
present-and-wired-but-unobserved (IntelliJ composer reachability) or genuinely undecided pending a
live runtime (the mask-width question) — both scripted in `88-LIVE-RETEST.md` round two, unaffected
by this round's plan.

One documentation-accuracy issue: `REQUIREMENTS.md` marks DISC-06 `Complete`; given the new CR-01
and the still-open G-88-2/G-88-3 UAT records, it should read `Gaps Found` — the same self-correction
pattern this phase's history has already applied twice.

---

_Verified: 2026-09-11T13:31:41Z_
_Verifier: Claude (gsd-verifier)_
