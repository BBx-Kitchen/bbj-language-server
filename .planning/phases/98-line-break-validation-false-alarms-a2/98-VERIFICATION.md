---
phase: 98-line-break-validation-false-alarms-a2
verified: 2026-09-21T07:00:00Z
status: passed
score: 6/6 must-haves verified
behavior_unverified: 0
overrides_applied: 2
overrides:
  -
    must_have: "Roadmap Success Criterion 5 / CONF-01 — 'the conformance run at the phase boundary reports A2 ≤ 25 (from 267) with A and B not regressed'"
    reason: "B regressed 658->665 of 1,210 (+7, unchanged since the phase boundary). Section 9's per-file evidence refutes the original keyword-branch-target attribution for all seven files: 5 trace to the RESTORE line-break fix (plan 02), 1 to the METHODRET severity downgrade (plan 03), 1 to the unclosed DEF FN grammar fix (plan 05) — each a legitimate, already-shipped fix whose removed false alarm happened to be the only thing flagging a file the compiler independently rejects for an unrelated reason elsewhere. Not fixable with this phase's line-break/DECLARE/METHODRET tools; carried to Phases 101-103 (the bbj-ls compiler-parser endpoint)."
    accepted_by: "Stephan Wald"
    accepted_at: "2026-09-21T00:00:00Z"
  -
    must_have: "Roadmap Success Criterion 5 / CONF-01 — 'the conformance run at the phase boundary reports A2 ≤ 25 (from 267) with A and B not regressed'"
    reason: "Closing re-run (98-CONFORMANCE.md section 10) measured A2 = 27, 2 over the ≤25 gate, up 5 from the phase boundary's 22. The +5 are two message groups (the blank 'needs to start in a new line' group, 4 files; the '...: else' group, 1 file) that reappeared after plan 08's commit 8ba30038 made the ELSE/end-of-IF backward walks count open IFs against stepped-over closers, restoring detection of a genuinely misplaced ELSE/FI. Since A2 by definition counts files the compiler accepts, these five are valid code being re-flagged, not a correctly restored detection — the balance rule is too strict for some real single-line shape. Accepted as carried-forward residue, not as correct behavior; tracked via a pending todo."
    accepted_by: "Stephan Wald"
    accepted_at: "2026-09-21T00:00:00Z"
re_verification:
  previous_status: gaps_found
  previous_score: 4/6
  gaps_closed:
    - "Roadmap Success Criterion 5 / CONF-01 — A2/B-not-regressed gate: closed via two recorded human overrides (accepted_by Stephan Wald, accepted_at 2026-09-21) covering both the unchanged B regression (658->665) and the closing re-run's A2 gate miss (27 vs ≤25)."
    - "Phase-goal-level RESTORE symbolic-label defect (98-REVIEW.md CR-02): RESTORE_NO_NL's lexer pattern now includes the `\\*[A-Za-z_]` alternative (bbj-token-builder.ts:156); independently confirmed by running test/line-break-validation.test.ts standalone (81/81 pass, including the 5 symbolic-label positive cases and their 'parses as exactly one RestoreStatement' shape assertions, plus the 'x = restore * 2' negative-control cases)."
    - "Line-break mask ELSE/FI false-negative (98-REVIEW.md CR-01): elseStatementLineBreaks/ifEndStatementLineBreaks now track an openIfs balance while walking backward (line-break-validation.ts:188-233); independently confirmed by running test/line-break-walk-termination.test.ts standalone (28/28 pass), including the three named repro cases (`if a=1 then b=1 fi else c=1`, `if a=1 then b=1 fi fi`, `if a then b=1 else c=1 else d=1` all flagged) and the positive nested forms staying clean."
  gaps_remaining: []
  regressions: []
deferred:
  - truth: "Roadmap Success Criterion 2's 'a continued LEN= item' sub-clause — no line-break error"
    addressed_in: "Phase 100"
    evidence: >
      ROADMAP.md's Phase 98 criterion 2 text was amended during gap closure (visible in the current
      tree) to read "...and SAVE produce no line-break error (about 70 files; the continued LEN= item
      was reclassified as a variable literally named LEN colliding with a fused keyword literal — a
      wrong-AST parser defect, not a line-break rule — and moved to Phase 100, D-18)." This closes the
      documentation inconsistency the prior verification flagged as a WARNING (criterion 2's text
      previously still promised the LEN= fix while REQUIREMENTS.md had already dropped it).
---

# Phase 98: Line-Break & Validation False Alarms (A2) Verification Report

**Phase Goal:** A developer writing valid BBj stops seeing errors the compiler would never report —
the line-break validator, the conflicting-`DECLARE` check and the `METHODRET` checks agree with
`bbjcpl` on code it accepts.
**Verified:** 2026-09-21T07:00:00Z
**Status:** passed
**Re-verification:** Yes — after gap closure (plans 98-07 through 98-10)

## Goal Achievement

### Observable Truths (ROADMAP.md "Phase 98" Success Criteria, verbatim)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | A `TABLE` statement (labelled/unlabelled, spaced/unspaced, long/short, any case) produces no "needs to start in a new line" error. | VERIFIED (regression check) | `line-break-validation.test.ts` "TABLE statement" suite re-run standalone this session — unchanged since initial verification, no touched code path in the gap-closure wave. |
| 2 | `RESTORE 0`, `GOSUB`/`GOTO` to a keyword-named label, `EXIT err`, `LOAD "prog"`, `SAVE` produce no line-break error; ROADMAP.md's own criterion-2 text was amended (gap-closure) to move the "continued LEN= item" clause to Phase 100 (D-18). **RESTORE with a symbolic label (`*foo`) now also produces no line-break error and parses as exactly one statement.** | VERIFIED — gap closed | `bbj-token-builder.ts:156`: `RESTORE_NO_NL` pattern is now `/RESTORE(?=[ \t]+(?:[0-9A-Za-z_]|\*[A-Za-z_]))/i`. Independently re-run `test/line-break-validation.test.ts` standalone (81/81 pass) — covers `RESTORE *RETRY`/`restore *retry`/`ReStOrE *ReTrY`/`RESTORE *NEXT`/`RESTORE *mytarget` (zero line-break diagnostics, parses as exactly one `RestoreStatement`) and the negative controls `x = restore * 2` / `x = restorex * 2` (stay one `LetStatement`, unaffected). |
| 3 | A multi-line `DEF FN...(params)` header/body never closed by `FNEND`, and the single-line `IF ... THEN ... ; GOTO label` / `... FI` forms, produce no line-break error; the fix does not create new false negatives. | VERIFIED — gap closed | `def-fn-unclosed-body.bbj`/`def-fn-early-return.bbj`/`single-line-if-forms.bbj` fixtures unchanged and re-verified passing. `elseStatementLineBreaks`/`ifEndStatementLineBreaks` (`line-break-validation.ts:188-233`) now track an `openIfs` balance. Independently re-run `test/line-break-walk-termination.test.ts` standalone (28/28 pass): `if a=1 then b=1 fi else c=1` flags `else`; `if a=1 then b=1 fi fi` flags the trailing `fi`; `if a then b=1 else c=1 else d=1` flags the second `else` — all three previously-silent false negatives now correctly flagged, while the legitimate nested forms (`if a then if b then c=1 fi else d=1 fi`, `if a then if b then c=1 fi fi`, `if a then b=1 else c=1 fi`) stay clean. |
| 4 | Conflicting-`DECLARE` and both `METHODRET` checks report no *error* on compiler-accepted code (amended wording, D-09), with one named in-method exception. | VERIFIED — coverage caveat resolved | `checkMethodReturn`/`checkConflictingDeclares` severity narrowing unchanged and re-verified passing (`classes.test.ts` 38/38, `variable-scoping.test.ts` 37/37 standalone). **WR-01 fixed:** `KNOWN_BBJ_SCALAR_TYPES` (`check-classes.ts:136`) is now a module-level export consulted by `checkConflictingDeclares` (`check-variable-scoping.ts:358`) *before* falling through to classpath-resolution, so `DECLARE BBjNumber q!` / `DECLARE BBjString q!` is flagged even with no live Java classpath. Independently confirmed the 4 new scalar tests use `createBBjServices(EmptyFileSystem)` (no interop) and re-run standalone (`-t scalar`, 4/4 pass): program-scope warning, method-scope error, same-scalar-twice silence, scalar-vs-unresolvable-class silence. |
| 5 | The conformance run at the phase boundary reports **A2 ≤ 25** (from 267) with **A and B not regressed**, and every fixed construct has a synthetic regression file. | **PASSED (override) — both sub-gates** | Closing re-run (98-CONFORMANCE.md section 10): A = 167 (PASS, from 168). A2 = 27 (2 over the ≤25 gate — **override 2**). B = 665 of 1,210 (baseline 658, +7 — **override 1**). Both overrides recorded above with `must_have`/`reason`/`accepted_by`/`accepted_at`; both grounded in corrected root-cause evidence (98-CONFORMANCE.md sections 9 and 10) rather than an executor's own narrative. Nine conformance fixtures under `bbj-vscode/test/test-data/conformance/`, asserted by `conformance-regressions.test.ts`, re-run standalone this session (4/4 pass). |

**Score:** 6/6 must-haves verified (5 roadmap criteria fully hold — 3 unconditionally, 1 with a
now-amended and honestly-scoped deferral, 1 with a caveat now resolved by a code fix — plus the
conformance gate, which holds via two recorded human overrides rather than on its own literal terms).

### Note on a new, already-tracked residual defect (98-REVIEW.md WR-A)

The post-gap-closure code review found that the CR-01 fix itself over-counts a same-line `ElseStatement`
in `elseStatementLineBreaks` (treats it as an independent closer claim, while `ifEndStatementLineBreaks`
treats it as consuming), so a complete inner `IF...THEN...ELSE...FI` group double-counts against an
outer `ELSE`. Independently reproduced in this verification (temporary probe test, created, run, and
deleted in this session; `git status --porcelain` confirmed clean afterward — only the pre-existing
untracked `.planning/milestone.lock` remained): `if a then if b then c=1 else d=1 fi else e=1 fi\n`
(a legal, compiler-accepted nested one-liner) produces the diagnostic `This statement needs to start
in a new line: else`.

This is a false **positive** (over-flagging valid code), not a false negative — it does not reopen
gap 3, whose truth is specifically about a malformed one-liner staying flagged. It is the same failure
class as the already-accepted A2-gate override above (valid code re-flagged by the ELSE/end-of-IF
balance counter), and it is already disclosed and tracked: the pending todo
`.planning/todos/pending/2026-09-21-loosen-single-line-if-balance-rule-a2-residue.md` was updated
(commit `4a419634`, already on this branch) with this exact repro as its concrete starting point for
the follow-up fix. No new override or gap is recorded for it — it is additional evidence for residue
the human already accepted, not an undisclosed defect.

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `bbj-vscode/test/conformance-regressions.test.ts` | CONF-01 harness | VERIFIED | Re-run standalone this session (4/4 pass). |
| `bbj-vscode/test/test-data/conformance/*.bbj` (9 files) | One fixture per fixed construct group | VERIFIED | Unchanged since initial verification; all still present and passing. |
| `bbj-vscode/src/language/bbj-token-builder.ts` | `RESTORE_NO_NL` symbolic-label support | VERIFIED — CR-02 fixed | Pattern now `/RESTORE(?=[ \t]+(?:[0-9A-Za-z_]|\*[A-Za-z_]))/i`; confirmed by reading source and re-running `line-break-validation.test.ts` standalone. |
| `bbj-vscode/src/language/validations/line-break-validation.ts` | ELSE/FI backward-walk open-IF bookkeeping | VERIFIED — CR-01 fixed, WR-A residual noted | `openIfs` counter present in both `elseStatementLineBreaks` and `ifEndStatementLineBreaks`; confirmed by reading source and re-running `line-break-walk-termination.test.ts` standalone. A residual over-count on nested `IF...ELSE...FI` + outer `ELSE` shapes (WR-A) is real but already tracked as accepted A2 residue, not a new gap. |
| `bbj-vscode/src/language/validations/check-classes.ts`, `check-variable-scoping.ts` | Scalar-vs-scalar DECLARE conflict restored without classpath | VERIFIED — WR-01 fixed | `KNOWN_BBJ_SCALAR_TYPES` exported and consulted pre-resolution; confirmed by reading source and re-running `variable-scoping.test.ts -t scalar` standalone (4/4 pass) against `createBBjServices(EmptyFileSystem)`. |
| `.planning/todos/pending/2026-09-21-loosen-single-line-if-balance-rule-a2-residue.md` | Tracks the accepted A2 residue as follow-up work | VERIFIED | Present, references the correct files, includes the concrete WR-A repro added in the same commit that replaced 98-REVIEW.md. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|----|--------|---------|
| `RestoreStatement.lineref=(LabelRef\|NUMBER)` | `RESTORE_NO_NL` lexer pattern | operand-presence lookahead, now including `\*[A-Za-z_]` | WIRED | Confirmed — the gap 2 mismatch is resolved. |
| `elseStatementLineBreaks`/`ifEndStatementLineBreaks` walk | governing (open) `IfStatement` | backward same-line walk with `openIfs` balance | WIRED | Confirmed — the gap 3 mismatch (finding *an* IfStatement rather than an *open* one) is resolved for the three named repro shapes; a distinct residual over-count (WR-A) remains, tracked as accepted debt. |
| `checkConflictingDeclares`'s scalar short-circuit | `KNOWN_BBJ_SCALAR_TYPES` | pre-resolution simple-name lookup | WIRED | Confirmed — WR-01's classpath dependency is resolved. |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| RESTORE symbolic-label positive/negative cases | `cd bbj-vscode && RUN_BBJ_TESTS=0 npx vitest run test/line-break-validation.test.ts --hookTimeout=30000` | 81/81 passed | PASS |
| ELSE/FI backward-walk balance (3 named repro cases + positives) | `cd bbj-vscode && RUN_BBJ_TESTS=0 npx vitest run test/line-break-walk-termination.test.ts --hookTimeout=30000` | 28/28 passed | PASS |
| Single-line IF forms regression | `cd bbj-vscode && RUN_BBJ_TESTS=0 npx vitest run test/line-break-single-line-if.test.ts --hookTimeout=30000` | 12/12 passed | PASS |
| Scalar-vs-scalar conflicting DECLARE (WR-01) | `cd bbj-vscode && RUN_BBJ_TESTS=0 npx vitest run test/variable-scoping.test.ts -t scalar --hookTimeout=30000` | 4/4 passed | PASS |
| Conflicting-DECLARE/METHODRET regression (full suites) | `cd bbj-vscode && RUN_BBJ_TESTS=0 npx vitest run test/variable-scoping.test.ts test/classes.test.ts --hookTimeout=30000` | 37/37 + 38/38 passed | PASS |
| Conformance-regression harness | `cd bbj-vscode && RUN_BBJ_TESTS=0 npx vitest run test/conformance-regressions.test.ts --hookTimeout=30000` | 4/4 passed | PASS |
| WR-A repro: `if a then if b then c=1 else d=1 fi else e=1 fi` | Temporary probe test, created/run/deleted this session | Diagnostic `This statement needs to start in a new line: else` confirmed — same class as accepted A2 residue, already tracked | INFO (not a gap) |
| Register check (no plan/decision IDs in the gap-closure diff) | `git diff -U0 5fb113cb..HEAD -- bbj-vscode \| grep '^+' \| grep -oE 'VALID-0[1-9]\|CONF-0[1-9]\|D-[0-9][0-9]\|98-[0-9][0-9]'` | no match | PASS |
| No new debt markers in gap-closure-touched source/test files | grep TBD/FIXME/XXX/TODO/HACK/PLACEHOLDER across the 7 touched files | none found | PASS |
| Working tree cleanliness after verification probes | `git status --porcelain` | only pre-existing untracked `.planning/milestone.lock` | PASS |

Whole-suite contention note: an initial batched run of 5 files hit the documented `beforeAll` hook
timeout under contention (`line-break-single-line-if.test.ts`, `variable-scoping.test.ts` reported as
"failed" with 0 failed tests inside); both were re-run standalone above and pass in full, consistent
with the project's known whole-suite-contention pattern.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| VALID-01 | 98-01 | TABLE statement gets no line-break error | SATISFIED | Unchanged, re-verified. |
| VALID-02 | 98-02, 98-04, 98-07 | RESTORE n, keyword-named GOSUB/GOTO targets, EXIT expr, LOAD, SAVE get no line-break error | SATISFIED | Numeric/keyword/EXIT/LOAD verified as before; the symbolic-label RESTORE gap (CR-02) is now fixed and tested (98-07). |
| VALID-03 | 98-05 | Multi-line DEF FN header gets no line-break error | SATISFIED | Unchanged, re-verified. |
| VALID-04 | 98-04, 98-06, 98-08 | Single-line IF/FI forms not reported as "needs new line" | SATISFIED | Positive forms unchanged; the CR-01 false-negative regression is fixed and tested (98-08). A distinct residual false-positive (WR-A) is real but already tracked as accepted A2 residue, not a VALID-04 text violation (VALID-04 is about false positives on the *originally-named* forms, which still hold). |
| VALID-05 | 98-03, 98-08 | Conflicting-DECLARE/METHODRET report no error on compiler-accepted code | SATISFIED | Severity narrowing unchanged; the WR-01 scalar-coverage gap is now fixed and tested (98-08). |
| CONF-01 | 98-01..06, 98-09, 98-10 | Synthetic regression file per fixed construct; conformance measured at phase boundary | SATISFIED (via recorded human override) | Fixture convention fully delivered; both the B-regression and A2-gate-miss sub-gates are covered by recorded, evidenced `overrides:` entries (`accepted_by: Stephan Wald`, `accepted_at: 2026-09-21`) rather than left as an executor narrative. |

REQUIREMENTS.md's Phase 98 status table rows (VALID-01..05, CONF-01) all read "Complete", consistent
with this verification's findings. No orphaned requirements: all 6 IDs declared across the 10 plan
frontmatters match REQUIREMENTS.md's Phase 98 mapping exactly.

### Anti-Patterns Found

None introduced by the gap-closure wave (plans 98-07 through 98-10). Register check over the whole
phase source diff (`5fb113cb..HEAD -- bbj-vscode`) is clean (0 matches). No TBD/FIXME/XXX/TODO/HACK/
PLACEHOLDER markers in any of the 7 files touched by gap closure.

Pre-existing, non-blocking items carried forward unchanged from 98-REVIEW.md (out of this phase's
gap-closure scope, not tied to any roadmap success criterion, not previously flagged as gaps):
`WR-B` (BRANCH_TARGET_EXCLUSION's bounded lookbehind has untested boundaries), `WR-C` (TABLE_DATA's
numeric line-number prefix is untested/unclear), `IN-A`/`IN-B` (pre-existing `P61-D*` planning IDs
left in source/test comments), `IN-C` (two near-tautological conformance-suite tests).

### Human Verification Required

None. Both previously-open code-level gaps (CR-01, CR-02) are independently confirmed fixed and
behaviorally tested by tests run standalone in this session (not merely read). The conformance gate
(gap 1) is closed by a recorded, evidenced human decision already on record (`overrides:` block,
Stephan Wald, 2026-09-21) — this verification only re-confirms it was carried forward byte-for-byte
per the re-verification instructions and that its evidence pointers (98-CONFORMANCE.md sections 9-11)
are internally consistent. The new WR-A finding is a disclosed, already-accepted-class residual
defect with a filed follow-up todo, not an open decision requiring a human this session.

### Gaps Summary

All three gaps from the initial verification are closed:

1. **Roadmap success criterion 5 / CONF-01 (conformance gate).** Closed via two recorded overrides
   (Stephan Wald, 2026-09-21), each grounded in corrected root-cause evidence (98-CONFORMANCE.md
   sections 9 and 10) rather than an unaccepted executor narrative. Carried forward byte-for-byte from
   the prior VERIFICATION.md per the re-verification instructions.
2. **RESTORE symbolic-label false alarm (CR-02).** Fixed in `bbj-token-builder.ts` (commit `1ad87ada`,
   plan 98-07) and independently confirmed in this session by reading the source and re-running
   `test/line-break-validation.test.ts` standalone (81/81 pass).
3. **ELSE/FI backward-walk false negative (CR-01).** Fixed in `line-break-validation.ts` (commit
   `8ba30038`, plan 98-08) and independently confirmed in this session by reading the source and
   re-running `test/line-break-walk-termination.test.ts` standalone (28/28 pass), including all three
   named repro cases from the verification brief.

One new, already-tracked residual (WR-A, a false positive on nested `IF...ELSE...FI` + outer `ELSE`
shapes, introduced by the CR-01 fix itself) was independently reproduced in this session. It is the
same failure class as the already-accepted A2-gate override, is disclosed in 98-REVIEW.md, and is
tracked in the pending todo with a concrete repro — not a new gap, not a new override, not a human
decision point for this session.

Phase 98 achieves its goal: the line-break validator, the conflicting-DECLARE check, and the METHODRET
checks now agree with `bbjcpl` on the code this phase's five named construct groups cover, with the
conformance gate's residual disagreement (B regression, A2 residue) explicitly accepted as carried-
forward work for Phases 101-103 and a filed follow-up todo, not silently absorbed.

---

_Verified: 2026-09-21T07:00:00Z_
_Verifier: Claude (gsd-verifier)_
