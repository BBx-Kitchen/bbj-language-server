---
phase: 98-line-break-validation-false-alarms-a2
verified: 2026-09-21T04:45:44Z
status: gaps_found
score: 4/6 must-haves verified
behavior_unverified: 0
overrides_applied: 0
gaps:
  - truth: "Roadmap Success Criterion 5 / CONF-01 — 'the conformance run at the phase boundary reports A2 ≤ 25 (from 267) with A and B not regressed'"
    status: failed
    reason: >
      A2 = 22 (PASS, from 267) and A = 167 (PASS, from 168), but B = 665 of 1,210 (baseline 658),
      a regression of +7 files of invalid code no longer flagged. The gate as literally worded in
      ROADMAP.md requires A *and* B not regressed — B fails this. 98-CONFORMANCE.md and the
      98-06-SUMMARY.md both record this honestly as "accepted residue," and 98-06's own coverage
      block explicitly flags it for "a human/orchestrator decision," but no such decision has been
      recorded anywhere in this phase's artifacts (no `overrides:` entry, no sign-off). An
      executor's own SUMMARY narrative is not the human acceptance this gate requires.
    artifacts:
      - path: ".planning/phases/98-line-break-validation-false-alarms-a2/98-CONFORMANCE.md"
        issue: "Section 6/8 documents the B regression as 'accepted, unfixed residue' without a recorded human decision to accept it."
    missing:
      - "A human decision, recorded either as a VERIFICATION.md override (must_have, reason, accepted_by, accepted_at) or as a follow-up fix plan, on whether the +7 B regression is acceptable to close Phase 98 as-is."
  - truth: "Phase goal — 'the line-break validator ... agrees with bbjcpl on code it accepts' — holds for every RESTORE form the grammar itself declares legal"
    status: failed
    reason: >
      The grammar change in this phase (`RestoreStatement: RESTORE_NO_NL lineref=(LabelRef | NUMBER) | kind='RESTORE'`,
      with `LabelRef = SymbolicLabelRef | UserLabelRef`) explicitly declares that RESTORE accepts a
      symbolic label target (`*foo`), the same as GOTO/GOSUB. But `RESTORE_NO_NL`'s lexer pattern
      (`bbj-token-builder.ts`) only matches `RESTORE(?=[ \t]+[0-9A-Za-z_])` — no `*` — so
      `RESTORE *foo` falls through to the bare `kind='RESTORE'` alternative and `*foo` becomes a
      second, unrelated statement. Independently reproduced in this verification (temporary probe,
      deleted before finishing; `git status` confirms clean): input `restore *foo\n` produces
      `['RestoreStatement', 'ExpressionStatement']` and the diagnostics
      `This statement needs to end with a line break: restore` /
      `This statement needs to start in a new line: *foo` — exactly the class of false alarm this
      phase exists to remove, for a form the phase's own grammar change claims to support. This is
      98-REVIEW.md's CR-02, unresolved: no commit after the review (`c4540b3b`) touches
      `bbj-token-builder.ts`. Not covered by `restore-numeric.bbj` or `line-break-validation.test.ts`
      (checked — neither has a symbolic-label case).
    artifacts:
      - path: "bbj-vscode/src/language/bbj-token-builder.ts"
        issue: "RESTORE_NO_NL's character class excludes '*', so a legal symbolic-label RESTORE target is not tokenized as an operand."
    missing:
      - "Extend the RESTORE_NO_NL pattern to include '*' (per 98-REVIEW.md's suggested fix), or narrow the grammar back to NUMBER | UserLabelRef if symbolic-label RESTORE is not actually meant to be supported yet — plus a regression fixture/test covering it either way."
  - truth: "Line-break mask fixes for the single-line IF/FI/ELSE forms (VALID-04) do not create new false negatives — a genuinely malformed one-liner stays flagged"
    status: failed
    reason: >
      `elseStatementLineBreaks` and `ifEndStatementLineBreaks` (`line-break-validation.ts`) were
      changed in plans 04 and 06 to walk past a preceding same-line ELSE/end-of-IF statement instead
      of stopping there, so a nested chain's ELSE/FI can find its true governing IF further back.
      The walk has no bookkeeping of how many closers it has skipped versus how many IFs remain
      open, so it also now silently accepts a **non-nested** case where the only IF on the line was
      already closed. Independently reproduced in this verification (temporary probe, deleted
      before finishing): `if a=1 then b=1 fi else c=1` and `if a=1 then b=1 fi fi` both produce zero
      line-break diagnostics — a genuinely misplaced ELSE/FI is silently accepted. This is
      98-REVIEW.md's CR-01, unresolved: no commit after the review touches this function. Existing
      "still flagged" negative tests (`line-break-walk-termination.test.ts`) only cover an ELSE/FI
      with *no* IfStatement anywhere on the line, not this already-closed-IF shape, so nothing in
      the shipped suite catches it. The final harness run (B = 665, unchanged after this exact fix
      was applied in plan 06) suggests this specific shape does not currently appear in the
      corpus, but the validator has lost real detection capability with no test guarding it,
      directly bearing on the same "B not regressed" gate as the first gap above.
    artifacts:
      - path: "bbj-vscode/src/language/validations/line-break-validation.ts"
        issue: "elseStatementLineBreaks/ifEndStatementLineBreaks walk past same-line closers without tracking whether a found IfStatement is still open."
    missing:
      - "Track an open/closed balance while walking backward (98-REVIEW.md's suggested fix), and add the two 'still flagged' regression cases (non-nested ELSE after an already-closed IF; an extra trailing FI) to line-break-walk-termination.test.ts or line-break-single-line-if.test.ts."
deferred:
  - truth: "Roadmap Success Criterion 2's 'a continued LEN= item' sub-clause — no line-break error"
    addressed_in: "Phase 100"
    evidence: >
      98-CONTEXT.md D-18 (research correction, 2026-09-20) reclassifies this as a variable literally
      named `LEN` colliding with the fused `LEN=` keyword literal — a wrong-AST parser defect
      (PARSE-08 territory), not a line-break-mask defect this phase's tools can fix. Phase 100's own
      roadmap success criterion 3 explicitly covers "words BBj itself allows as names although they
      are language words ... work as variables" — this construct falls squarely under that.
      REQUIREMENTS.md's VALID-02 text was updated to exclude it accordingly. ROADMAP.md's Phase 98
      criterion 2 prose itself was **not** edited to drop the "continued LEN= item" clause (unlike
      criterion 4, which D-05/D-09 explicitly reworded) — see the Gaps Summary below for this
      documentation inconsistency, which is a WARNING, not a blocking gap.
---

# Phase 98: Line-Break & Validation False Alarms (A2) Verification Report

**Phase Goal:** A developer writing valid BBj stops seeing errors the compiler would never report —
the line-break validator, the conflicting-`DECLARE` check and the `METHODRET` checks agree with
`bbjcpl` on code it accepts.
**Verified:** 2026-09-21T04:45:44Z
**Status:** gaps_found
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (ROADMAP.md "Phase 98" Success Criteria, verbatim)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | A `TABLE` statement (labelled/unlabelled, spaced/unspaced, long/short, any case) produces no "needs to start in a new line" error. | VERIFIED | `table-statement.bbj` fixture; `line-break-validation.test.ts` "Line break validation: TABLE statement" suite passes (re-run standalone: 4/4); `TABLE_DATA` terminal wired via `spliceToken`/`reorderTokenPriorities` in `bbj-token-builder.ts`; zero TABLE hits in the recorded conformance run. |
| 2 | `RESTORE 0`, `GOSUB`/`GOTO` to a keyword-named label, `EXIT err`, `LOAD "prog"`, `SAVE`, and a continued `LEN=` item produce no line-break error. | PARTIAL — see gaps/deferred | Numeric RESTORE, keyword-branch-targets, EXIT/LOAD/SAVE: verified (fixtures + passing tests + zero corpus hits). The `LEN=` item is **not fixed** and is explicitly deferred to Phase 100 per D-18 (see `deferred` in frontmatter) — a legitimate, documented scope correction, but ROADMAP.md's own criterion-2 text was never edited to remove it (WARNING, not a blocking gap). Separately, **RESTORE with a symbolic label (`*foo`) — a form the phase's own grammar change declares legal — still produces the false alarm** (see gap 2 above, CR-02, independently reproduced). |
| 3 | A multi-line `DEF FN...(params)` header/body never closed by `FNEND`, and the single-line `IF ... THEN ... ; GOTO label` / `... FI` forms, produce no line-break error. | VERIFIED | `def-fn-unclosed-body.bbj`, `def-fn-early-return.bbj`, `single-line-if-forms.bbj` fixtures; `line-break-validation.test.ts` and `line-break-single-line-if.test.ts` pass standalone; `FNEND?` grammar change confirmed in `bbj.langium`. One narrower residual `fi` shape (`RETURN void FI`) is recorded as accepted residue, not one of the two named forms. |
| 4 | Conflicting-`DECLARE` and both `METHODRET` checks report no *error* on compiler-accepted code (amended wording, D-09: no error-severity diagnostic, with one named in-method exception). | VERIFIED, with a coverage caveat | `checkMethodReturn`'s two disagreements and `checkConflictingDeclares`'s program-level case confirmed downgraded to `warning` in `check-classes.ts`/`check-variable-scoping.ts`; `classes.test.ts`/`variable-scoping.test.ts` assert warning severity; zero error-severity hits from these three checks in the recorded conformance run. **Caveat (98-REVIEW.md WR-01, confirmed by reading the code):** `checkConflictingDeclares` now requires both DECLARE types to resolve to a `Class` before comparing them, so a same-scope scalar-type mismatch (`DECLARE BBjNumber q!` / `DECLARE BBjString q!`) that used to be flagged (as a plain string compare) is now silently dropped whenever no live Java classpath is loaded — the project's own stated default/common case. This does not violate the amended criterion's letter (it produces nothing, not an error) but is a real, untested loss of an existing check's coverage. |
| 5 | The conformance run at the phase boundary reports **A2 ≤ 25** (from 267) with **A and B not regressed**, and every fixed construct has a synthetic regression file. | **FAILED** | A2 = 22 (PASS), A = 167 (PASS), **B = 665 of 1,210, regressed +7 from baseline 658 (FAIL)**. Nine conformance fixtures exist under `bbj-vscode/test/test-data/conformance/` and are asserted by `conformance-regressions.test.ts` (re-run standalone: 4/4 pass). The B regression is documented as "accepted residue" by the executor, but no human decision to accept it is on record anywhere in this phase's artifacts — see gap 1. |

**Score:** 4/6 must-haves verified (2 roadmap criteria fully hold, 1 partially holds with a documented, evidence-backed deferral, 1 holds with a caveat, 2 fail outright: criterion 5, and the phase-goal-level RESTORE/ELSE-FI defects surfaced by code review).

### On the B-regression cause (task-requested plausibility check)

98-CONFORMANCE.md/98-06-SUMMARY.md attribute the entire B regression (658 → 665) to plan 02's fix
for keyword-named `GOTO`/`GOSUB` targets: before the fix, a keyword-named label that does not exist
anywhere in the program was coincidentally caught by the (wrong) line-break error; after the fix,
the reference correctly reaches Langium's linker, which reports it as a *linking* error — and the
harness explicitly excludes linking diagnostics from both A2 and B ("uses a fake Java classpath").
**This mechanism is plausible and consistent with the harness's documented exclusion rule** and with
`BRANCH_TARGET_EXCLUSION`'s role (confirmed in `bbj-token-builder.ts`) in making keyword-named labels
resolve via the normal cross-reference path instead of falling through as an opaque token. It cannot
be independently confirmed against the actual corpus files under this environment's shell rules (no
corpus file access), so it remains a plausible, not corpus-verified, explanation. **It is also not
the only mechanism capable of producing this class of regression**: CR-01 (independently confirmed
above) removes detection of a different, unrelated malformed-code shape (a non-nested ELSE/FI closing
an already-closed IF) through the exact same class of false-negative side effect, introduced in the
same phase. The final harness run (B = 665, unchanged after CR-01's underlying fix was applied in
plan 06) indicates this specific shape is not currently present in the corpus, but that is a fact
about the current corpus, not a guarantee the mechanism is inert.

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `bbj-vscode/test/conformance-regressions.test.ts` | CONF-01 harness | VERIFIED | Exists, asserts zero lexer/parser errors and zero error-severity diagnostics (linking excluded) over every `.bbj` file in the conformance folder; passes standalone (4/4). |
| `bbj-vscode/test/test-data/conformance/*.bbj` (9 files) | One fixture per fixed construct group | VERIFIED | `table-statement.bbj`, `restore-numeric.bbj`, `keyword-branch-targets.bbj`, `exit-load-save.bbj`, `print-trailing-comma.bbj`, `single-line-if-forms.bbj`, `def-fn-unclosed-body.bbj`, `def-fn-early-return.bbj`, `declare-methodret.bbj` all present; each hand-written with a `REM` behavior comment (D-13), no plan/decision IDs (register-check clean). |
| `bbj-vscode/src/language/bbj.langium` | TABLE/RESTORE/EXIT/LOAD/FNEND grammar fixes | VERIFIED | `TableStatement`, `RestoreStatement` (lineref=(LabelRef\|NUMBER)), `LoadStatement`, `ExitWithNumberStatement`, `DefFunction`'s `FNEND?` all present and registered in the statement alternation. |
| `bbj-vscode/src/language/bbj-token-builder.ts` | `TABLE_DATA`, `RESTORE_NO_NL`, `EXIT_NO_NL`, `BRANCH_TARGET_EXCLUSION` | VERIFIED, with the CR-02 defect | Tokens exist and are spliced; `RESTORE_NO_NL`'s character class is missing `*` (gap 2). |
| `bbj-vscode/src/language/validations/line-break-validation.ts` | ELSE/FI/IF backward-walk fixes | VERIFIED, with the CR-01 defect | Walks implemented as described; missing open/closed bookkeeping (gap 3). |
| `bbj-vscode/src/language/validations/check-classes.ts`, `check-variable-scoping.ts` | METHODRET/DECLARE severity narrowing | VERIFIED, with the WR-01 caveat | Severity branches present and tested at the java-class level; scalar-type case untested and silently dropped. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|----|--------|---------|
| `TABLE_DATA` terminal | `reorderTokenPriorities`/`buildTokens` | splice + `LINE_BREAKS` property | WIRED | Confirmed in `bbj-token-builder.ts`; TABLE tests pass. |
| `TableStatement` grammar rule | `isStandaloneStatement` in `line-break-validation.ts` | `SingleStatement` alternation membership | WIRED | Confirmed. |
| `checkConflictingDeclares`'s `node` param | severity branch (`isProgram(node) ? 'warning' : 'error'`) | direct read | WIRED | Confirmed at `check-variable-scoping.ts:338`. |
| `RestoreStatement.lineref=(LabelRef\|NUMBER)` | `RESTORE_NO_NL` lexer pattern | operand-presence lookahead | **PARTIAL / NOT_WIRED for `*`** | Grammar accepts `SymbolicLabelRef`; lexer pattern's character class excludes `*` — gap 2. |
| `elseStatementLineBreaks`/`ifEndStatementLineBreaks` walk | governing `IfStatement` | backward same-line walk | **WIRED BUT OVER-BROAD** | Finds *an* IfStatement, not necessarily an *open* one — gap 3. |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| TABLE/RESTORE/single-line-IF/DEF-FN/DECLARE-METHODRET suites pass standalone | `cd bbj-vscode && RUN_BBJ_TESTS=0 npx vitest run test/conformance-regressions.test.ts test/line-break-validation.test.ts test/line-break-single-line-if.test.ts test/line-break-walk-termination.test.ts test/classes.test.ts test/variable-scoping.test.ts test/validation.test.ts test/example-files.test.ts` (targeted files re-run alone where the batched run hit `beforeAll` contention) | 183+4+33 = passed; whole batch had 2 "failed suites" (hook timeouts under contention, both files pass standalone: 4/4 and 33/33) | PASS |
| CR-01 reproduction: non-nested ELSE after an already-closed IF | Temporary probe test (`zzz-verify-probe.test.ts`, deleted immediately after; `git status` confirmed clean) — `if a=1 then b=1 fi else c=1` | Zero line-break diagnostics — false negative confirmed | FAIL (confirms gap 3) |
| CR-01 reproduction: extra trailing FI | Same probe — `if a=1 then b=1 fi fi` | Zero line-break diagnostics — false negative confirmed | FAIL (confirms gap 3) |
| CR-02 reproduction: `RESTORE *foo` | Same probe — `restore *foo\n` | `RestoreStatement` + `ExpressionStatement`, two line-break diagnostics ("needs to end with a line break: restore", "needs to start in a new line: *foo") | FAIL (confirms gap 2) |
| Register check (no plan/decision IDs in phase source diff) | `git diff -U0 5fb113cb..HEAD -- bbj-vscode \| grep '^+' \| grep -qE 'VALID-0\|CONF-0\|D-[0-9][0-9]\|98-[0-9][0-9]'` | no match | PASS |
| No new debt markers in touched source files | grep for TODO/FIXME/TBD/HACK in the 6 touched source files, cross-checked against the phase diff | 3 pre-existing `TODO`s in `bbj.langium` (lines 421/501/768), none added by this phase's diff | PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| VALID-01 | 98-01 | TABLE statement gets no line-break error | SATISFIED | Fixture + tests + zero corpus hits. |
| VALID-02 | 98-02, 98-04 | RESTORE n, keyword-named GOSUB/GOTO targets, EXIT expr, LOAD, SAVE get no line-break error | SATISFIED (per REQUIREMENTS.md's literal text, which is numeric-RESTORE-scoped) — but the grammar's own broader RESTORE-with-LabelRef design (which REQUIREMENTS.md does not literally require) is defective for the symbolic-label case (CR-02); flagged above as a phase-goal-level gap, not a VALID-02-text gap. |
| VALID-03 | 98-05 | Multi-line DEF FN header gets no line-break error | SATISFIED | Fixture + tests + zero corpus hits. |
| VALID-04 | 98-04, 98-06 | Single-line IF/FI forms not reported as "needs new line" | SATISFIED for the positive forms named; the fix's negative-side regression (CR-01) is a distinct, unresolved defect (gap 3) that this requirement's text does not itself cover (VALID-04 is about false positives, not the new false negative). |
| VALID-05 | 98-03 | Conflicting-DECLARE/METHODRET report no error on compiler-accepted code | SATISFIED, with the WR-01 coverage caveat noted above (does not contradict the requirement's letter). |
| CONF-01 | 98-01..06 | Synthetic regression file per fixed construct; conformance measured at phase boundary | **PARTIALLY SATISFIED** — the fixture convention is fully delivered (9 files, all passing), but the phase-boundary measurement itself fails one of its three named gates (B not regressed). REQUIREMENTS.md marks this "Complete," which this verification disputes for the reasons in gap 1. |

No orphaned requirements: all 6 IDs declared across the 6 plan frontmatters match REQUIREMENTS.md's Phase 98 mapping exactly.

### Anti-Patterns Found

None introduced by this phase. Three pre-existing `TODO` comments in `bbj.langium` (lines 421, 501, 768) predate this phase's diff (confirmed via `git diff -U0 5fb113cb..HEAD`) and are out of scope. Register check for stray plan/decision/requirement IDs in source is clean.

### Human Verification Required

None — the remaining open items (gaps 1-3 above) are code-level defects and a documentation/process gap that were independently reproduced and confirmed in this verification; they do not require human judgment to detect, only a decision on remediation (fix now vs. accept and re-scope), which is exactly what gap 1 already asks the orchestrator/human to make explicit.

### Gaps Summary

Phase 98 delivers real, well-tested value: the TABLE, RESTORE-numeric, keyword-branch-target,
EXIT/LOAD/SAVE, unclosed-DEF-FN, and single-line-IF/FI **positive** cases are genuinely fixed, backed
by fixtures and passing tests, and A2 fell from 267 to 22 — comfortably under the ≤25 gate. The
CONF-01 regression-fixture convention is well-executed and will serve Phases 99/100 as designed.

However, three things keep this phase from a clean pass:

1. **Roadmap success criterion 5 is honestly documented as failed, but not accepted.** B regressed
   (658 → 665) as a real, disclosed side effect of the plan 02 fix. The executor's own SUMMARY
   correctly flags this as needing "a human/orchestrator decision," but that decision was never
   recorded — there is no override, no sign-off, nothing beyond the narrative itself. A phase cannot
   close on a gate its own plan declares failed without someone other than the executor accepting it.

2. **Two Critical findings from the phase's own code review (98-REVIEW.md) remain unresolved in the
   committed code**, both independently reproduced in this verification: `RESTORE *label` (CR-02)
   reintroduces exactly the false-alarm class this phase exists to eliminate, for a form the phase's
   own grammar change declares legal; and the ELSE/FI backward-walk fix (CR-01) has no bookkeeping
   for "how many closers has this walk skipped," so it silently accepts genuinely malformed
   non-nested ELSE/FI shapes that the pre-phase code used to correctly flag. Neither is covered by
   the shipped test suite. The last commit on this branch (`c4540b3b`) only adds the review report —
   no fix followed it.

3. **A documentation inconsistency** (WARNING, not blocking): 98-CONTEXT.md's D-18 correctly
   reassigns the "continued LEN= item" to Phase 100 as a different defect class, and REQUIREMENTS.md
   was updated to match — but ROADMAP.md's own Phase 98 criterion 2 text still literally promises
   "a continued LEN= item produce[s] no line-break error," which remains false. Unlike criterion 4
   (explicitly reworded by D-09), criterion 2's text was never amended to reflect D-18's scope
   correction.

**This looks intentional in spirit but not in process.** If the orchestrator/human wants to accept
the B regression and the two unresolved review criticals as scoped-out residue for a follow-up phase,
the clean path is to add explicit `overrides:` entries to this VERIFICATION.md (or re-open a
closure plan) rather than let an executor's own "accepted residue" language stand in for that
decision.

---

_Verified: 2026-09-21T04:45:44Z_
_Verifier: Claude (gsd-verifier)_
