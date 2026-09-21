# Phase 98 — Conformance Measurement

Measured once at the phase boundary against the private corpus and harness that live outside
this repository (`/home/coder/repos/bbj-corpus/conformance/run.mjs`). Only counts and
message-group names are recorded here — no corpus file name, no corpus path, no corpus source
line (D-17).

## 1. Numbers (initial run, Task 2)

Direction of worse: for A, A2 and B, a **higher** file count is worse — each measure counts a
category of disagreement between the language server and the compiler that this milestone wants
minimized. Lower is always better; the gate requires A2 to drop to 25 or below, and forbids A or
B from rising above their baseline.

| Measure | Baseline | Measured (initial) | Delta | Gate | Result |
|---|---|---|---|---|---|
| A — valid code the language server rejects | 168 | 167 | −1 | ≤ 168 | PASS |
| A2 — valid code that parses but gets a validation error | 267 | 41 | −226 | ≤ 25 | **FAIL (not yet — see Task 3)** |
| B — invalid code not flagged, of 1,210 | 658 (54.4%) | 665 (55.0%) | +7 | ≤ 658 | **FAIL** |

## 2. What the run measured

- Command: `node /home/coder/repos/bbj-corpus/conformance/run.mjs --ls /home/coder/repos/bbj-language-server`
- Date: 2026-09-21. Language server commit `5cf8dec7` (the tree as committed through plan 05),
  mode `validate`, 68 seconds.
- The harness loads the language server from source via `tsx`, so the measurement reflects the
  generated parser exactly as it stood at the run — `bbj-vscode/src/language/generated/ast.ts`
  was confirmed no older than `bbj.langium` before this run (Task 1).

## 3. Remaining A2 groups (initial run — 41 files across 22 message groups)

One row per message group as reported by the harness, with the file count and a one-line cause
in this executor's own words. Dispositions are assigned in Task 3, below.

| Files | Message group | Cause |
|---|---|---|
| 7 | RETURN statement inside a DEF function must have a return value. | A bare RETURN used to exit a multi-line DEF FN body early is flagged for lacking a return value; unmasked by this phase's DEF-FN body-closing fix (plan 05) now that these bodies parse into a real body instead of falling back to top-level expression statements. |
| 6 | This statement needs to start in a new line: (blank) | A same-line ELSE that closes a nested single-line IF/FI chain is not recognized by the ELSE line-break mask, which stops walking backward at the first end-of-IF statement instead of continuing to the governing IF. |
| 4 | This statement needs to start in a new line: else | Same root cause as the row above — the ELSE line-break mask stopping too early — surfacing under the ELSE token's own message this time instead of the IF's. |
| 3 | This statement needs to end with a line break: return | A RETURN statement carrying a value is flagged for a missing line break in a context none of this phase's five named groups cover; not further isolated. |
| 3 | This statement needs to end with a line break: LEN= | The fused `LEN=` keyword literal collides with plain-identifier usage and produces a wrong AST — the same defect plan 04 diagnosed and handed to Phase 100 under PARSE-08. |
| 2 | This statement needs to start in a new line: ELSE | Same ELSE line-break mask defect as the two rows above, differing only by the source token's case. |
| 1 | This statement needs to end with a line break: endif | A `;rem` comment immediately after ENDIF is flagged — the same class of "`;rem` after a block-closing keyword" gap Phase 100's roadmap criterion 2 targets for METHODEND/CLASSEND/FNEND. |
| 1 | Field _ is declared _ but is initialized with a number. | An existing field-initializer type check (string field, numeric initializer) unrelated to this phase's line-break/DECLARE/METHODRET scope. |
| 1 | This statement needs to start in a new line: x[all] | The CLEAR verb with an array-all suffix trips the generic "needs to start in a new line" default; a parser gap outside this phase's five named constructs. |
| 1 | _ is only allowed inside a SWITCH block. | An existing switch-statement placement check unrelated to this phase's scope. |
| 1 | This statement needs to end with a line break: LET | A LET assignment to a variable named `LEN` trips the same fused-keyword-literal defect as the `LEN=` row above, via a different statement shape. |
| 1 | This statement needs to start in a new line: fi | A single-line IF closed by FI whose THEN branch is `RETURN void` is still flagged — a narrower shape than the RETURN-in-IF and nested-FI forms plan 04 fixed. |
| 1 | This statement needs to end with a line break: len= | Same fused-keyword-literal defect as the `LEN=` row above, lower case. |
| 1 | DECLARE is not valid at class member level. Use FIELD for class-level declarations... | An existing DECLARE-placement check, distinct from the conflicting-DECLARE check plan 03 narrowed; unrelated to this phase's scope. |
| 1 | The member _ from the type _ (in _-_.bbj:_) is not visible | An existing member-visibility check unrelated to this phase's scope. |
| 1 | MODE option only supported in MKEYED Verb. | An existing KEYED-file-statement option check unrelated to this phase's scope. |
| 1 | This statement needs to end with a line break: LET num = _._ | A LET assignment whose numeric literal uses scientific notation trips the generic line-break default; likely a numeric-literal lexer gap outside this phase's named constructs. |
| 1 | This statement needs to end with a line break: LET tiny = _ | Same scientific-notation numeric-literal cause as the row above. |
| 1 | This statement needs to end with a line break: LET val = _ | Same scientific-notation numeric-literal cause as the two rows above. |
| 1 | This statement needs to end with a line break: gravitational_constant = _._ | Same scientific-notation numeric-literal cause, this time on a bare assignment rather than a LET statement. |
| 1 | Comments need to be separated by line breaks or _. | A REM comment inside a single-line IF's THEN clause trips a comment-placement check distinct from the semicolon-chain and end-of-IF forms plan 04 fixed. |
| 1 | This statement needs to end with a line break: log.DURATION = log.END-log. | A dotted/namespaced variable name trips the generic line-break default; a parser gap outside this phase's named constructs. |

## 4. Criterion-4 attestation (initial run)

Success criterion 4 (amended per D-05/D-09): no error-severity diagnostic on compiler-accepted
code from the conflicting-DECLARE check or either METHODRET check, with one named exception —
unrelated resolved DECLAREs of one name inside a single method body.

None of the 22 message groups above name "Conflicting DECLARE", "declares a return type but has
no METHODRET returning a value", or "is declared void and must not return a value" — the three
checks plan 03 narrowed produce zero error-severity hits on this corpus run. Criterion 4 holds
as amended; the named exception (in-method unrelated-resolved DECLARE pair) is not exercised by
any file in this corpus.

## 5. Task 3 — triage, fixes and the closing measurement

Two of the twenty-two message groups above turned out to be trivially related to changes this
phase already made. Both are validator-severity fixes matching the D-06/D-07 pattern this phase
already established (a check that disagrees with the compiler becomes a warning, not silence).

### Fix A — RETURN inside a DEF FN downgraded from error to warning

- **File:** `bbj-vscode/src/language/bbj-validator.ts` (`checkReturnValueInDef`)
- **Change:** the one `accept('error', 'RETURN statement inside a DEF function must have a
  return value.', ...)` call is now `accept('warning', ...)`.
- **Why trivially related:** before plan 05, an unclosed multi-line DEF FN body never populated
  with real statements (it fell back to top-level expression statements), so this check never
  saw the bare RETURN at all. Plan 05's `FNEND?` grammar fix made these bodies parse correctly,
  which is what let this pre-existing, overly strict check start firing on a bare early-exit
  RETURN — a shape the compiler accepts (the corpus files exercising it are themselves valid).
  Downgrading it to a warning keeps the check's teeth (it still fires) while stopping the false
  alarm at error severity, exactly as plan 03 did for the two METHODRET checks.
- **New fixture and test:** `bbj-vscode/test/test-data/conformance/def-fn-early-return.bbj`
  (an in-loop early exit and a single-line-IF-guarded early exit, both in upper and lower case);
  `bbj-vscode/test/validation.test.ts`'s existing "DEF RETURN needs a return value" test now
  asserts a warning (`expectWarning`) instead of an error.
- **Result:** A2 41 -> 34 (7 files fixed), confirmed by re-running the harness.

### Fix B — the ELSE line-break mask now walks past a same-line ELSE or end-of-IF statement

- **File:** `bbj-vscode/src/language/validations/line-break-validation.ts` (`elseStatementLineBreaks`)
- **Change:** removed the branch that stopped the backward walk (without clearing the flag) the
  moment it found a preceding same-line ELSE or end-of-IF statement. The walk now falls through
  to the loop's generic "keep walking" step, exactly like `ifEndStatementLineBreaks`'s own
  backward walk after plan 04's fix.
- **Why trivially related:** this is the same construct group (single-line IF/FI/ELSE forms,
  VALID-04) and the same root-cause class plan 04 fixed one function away — a same-line ELSE
  that closes a nested single-line IF/FI chain needs to walk past the inner FI to find its own
  governing IF, exactly as plan 04 taught the FI mask to do. Plan 04 fixed the IF and FI masks
  but not the sibling ELSE mask, leaving this defect in place; some of the corpus files this
  fixed were already reporting a different, now-resolved diagnostic first (which is why the
  "needs to start in a new line" blank-message group in section 3 above also disappears here —
  it was the same underlying files, previously surfacing a different symptom).
- **New test and fixture:** `bbj-vscode/test/line-break-single-line-if.test.ts` gains "a nested
  single-line IF/FI followed on the same line by the outer ELSE"; the existing negative case "an
  ELSE with no governing IF on the line is still flagged" in
  `bbj-vscode/test/line-break-walk-termination.test.ts` is unchanged and still passes.
  `bbj-vscode/test/test-data/conformance/single-line-if-forms.bbj` gains the same shape in
  upper, lower and mixed case.
- **Result:** A2 34 -> 22 (12 files fixed: 6 in the blank-message group, 4 in the lowercase
  `else` group, 2 in the uppercase `ELSE` group), confirmed by re-running the harness.

### Whole-suite and register-check re-runs after both fixes

- `cd bbj-vscode && RUN_BBJ_TESTS=0 npx vitest run --maxWorkers=2`: `numFailedTests: 0` after
  each fix (re-run twice, once per fix), matching the standing whole-suite gate substitution
  decision — the "failed suites" each time were `beforeAll` hook timeouts under contention,
  confirmed by re-running each flaky file alone and getting zero failures.
- Register check (`git diff -U0 -- bbj-vscode | grep '^+' | grep -qE 'VALID-0|CONF-0|D-[0-9][0-9]|98-[0-9][0-9]'`):
  no match, both times.
- `git status --porcelain`: no stray scratch probe file after either fix.

## 6. Final numbers (after Task 3's two fixes)

| Measure | Baseline | Measured (final) | Delta | Gate | Result |
|---|---|---|---|---|---|
| A — valid code the language server rejects | 168 | 167 | −1 | ≤ 168 | **PASS** |
| A2 — valid code that parses but gets a validation error | 267 | 22 | −245 | ≤ 25 | **PASS** |
| B — invalid code not flagged, of 1,210 | 658 (54.4%) | 665 (55.0%) | +7 | ≤ 658 | **FAIL** |

**B is not fixed in this plan.** The regression is a side effect, not a new bug this plan
introduced: removing the false line-break alarms on `GOSUB`/`GOTO` to keyword-named labels
(plan 02) also removed a diagnostic that was *accidentally* catching a small number of
compiler-rejected files (an undefined label) under the wrong message. The harness explicitly
excludes linking errors from both A2 and B ("the run uses a fake Java classpath"), so once the
false line-break error is gone, the genuine defect (an undefined branch target) is no longer
caught by anything at error severity — it becomes a linking-only concern, out of this
measurement's scope. Building a real check for it here would mean adding a new error-severity
validation for undefined branch targets — an architectural change outside a plan whose own
threat model forbids widening checks to chase a number, and squarely the job the milestone
already assigns to the `bbj-ls` compiler-parser endpoint (Phases 101-103), not this phase's
line-break/DECLARE/METHODRET scope. **B's regression is recorded here as accepted, unfixed
residue — not silently accepted as passing.** Roadmap success criterion 5 ("A2 <= 25 ... with A
and B not regressed") is therefore only **partially met**: the A2 and A halves pass; the B half
does not.

## 7. Remaining A2 groups — final disposition (22 files, 18 message groups)

| Files | Message group | Disposition | Reason |
|---|---|---|---|
| 3 | This statement needs to end with a line break: return | Accepted residue | A value-carrying RETURN statement, outside any of this phase's five named groups; cause not further isolated. |
| 3 | This statement needs to end with a line break: LEN= | Handed to Phase 100 (PARSE-08) | The fused `LEN=` keyword-literal defect plan 04 diagnosed and D-18 assigned to Phase 100's language-words-as-names work. |
| 1 | This statement needs to end with a line break: endif | Handed to Phase 100 | Same "`;rem` after a block-closing keyword" shape as Phase 100's roadmap criterion 2 (METHODEND/CLASSEND/FNEND), applied to ENDIF. |
| 1 | Field _ is declared _ but is initialized with a number. | Accepted residue | An existing field-initializer type check, unrelated to this phase's line-break/DECLARE/METHODRET scope. |
| 1 | This statement needs to start in a new line: x[all] | Handed to Phase 100 | A CLEAR-verb parser gap (array-all suffix); long-tail territory, not one of this phase's five named groups. |
| 1 | _ is only allowed inside a SWITCH block. | Accepted residue | An existing switch-statement placement check, unrelated to this phase's scope. |
| 1 | This statement needs to end with a line break: LET | Handed to Phase 100 (PARSE-08) | Same fused `LEN=` defect as above, via a `LET LEN=...` assignment shape. |
| 1 | This statement needs to start in a new line: fi | Accepted residue | A narrower `RETURN void` variant of the single-line-IF/FI forms this phase fixed; needs its own investigation, not trivially related to a change already made. |
| 1 | This statement needs to end with a line break: len= | Handed to Phase 100 (PARSE-08) | Same fused `LEN=` defect as above, lower case. |
| 1 | DECLARE is not valid at class member level. Use FIELD for class-level declarations... | Accepted residue | An existing DECLARE-placement check, distinct from the conflicting-DECLARE check this phase narrowed. |
| 1 | The member _ from the type _ (in _-_.bbj:_) is not visible | Accepted residue | An existing member-visibility check, unrelated to this phase's scope. |
| 1 | MODE option only supported in MKEYED Verb. | Accepted residue | An existing KEYED-file-statement option check, unrelated to this phase's scope. |
| 1 | This statement needs to end with a line break: LET num = _._ | Handed to Phase 100 | Likely a scientific-notation numeric-literal lexer gap; long-tail territory. |
| 1 | This statement needs to end with a line break: LET tiny = _ | Handed to Phase 100 | Same scientific-notation numeric-literal cause as the row above. |
| 1 | This statement needs to end with a line break: LET val = _ | Handed to Phase 100 | Same scientific-notation numeric-literal cause as the two rows above. |
| 1 | This statement needs to end with a line break: gravitational_constant = _._ | Handed to Phase 100 | Same scientific-notation numeric-literal cause, on a bare assignment. |
| 1 | Comments need to be separated by line breaks or _. | Accepted residue | A REM-inside-a-single-line-IF comment-placement check, distinct from the semicolon-chain and end-of-IF forms this phase fixed. |
| 1 | This statement needs to end with a line break: log.DURATION = log.END-log. | Handed to Phase 100 | A dotted/namespaced variable name parser gap; long-tail territory. |

## 8. Success-criteria closing evidence

1. **TABLE statement (VALID-01).** Holds. Evidence: `bbj-vscode/test/test-data/conformance/table-statement.bbj`;
   `npx vitest run test/line-break-validation.test.ts test/conformance-regressions.test.ts` — the
   "Line break validation: TABLE statement" suite passes; zero TABLE-message hits in either
   conformance run above.
2. **RESTORE/keyword-branch-targets/EXIT/LOAD/SAVE/continued LEN= item (VALID-02).** Mostly
   holds, with one named exception. Evidence: `restore-numeric.bbj`, `keyword-branch-targets.bbj`,
   `exit-load-save.bbj`, `print-trailing-comma.bbj`; the matching `line-break-validation.test.ts`
   and `line-break-single-line-if.test.ts` suites pass; zero RESTORE/GOSUB-GOTO-keyword/EXIT/LOAD
   hits in the final conformance run. The roadmap's own wording for this criterion also names "a
   continued LEN= item" — that construct is **not** fixed (see PARSE-08 residue, section 7); it
   was corrected by D-18 to be a wrong-AST parser defect outside a line-break-mask fix, and
   REQUIREMENTS.md's VALID-02 text (written after that correction) does not include it.
3. **Multi-line DEF FN / single-line IF and FI forms (VALID-03, VALID-04).** Holds. Evidence:
   `def-fn-unclosed-body.bbj`, `def-fn-early-return.bbj`, `single-line-if-forms.bbj`; the
   `line-break-validation.test.ts` and `line-break-single-line-if.test.ts` suites pass; zero
   DEF-FN-header or single-line-IF/FI/ELSE hits in the final conformance run (the one remaining
   `fi` hit is the distinct `RETURN void` shape recorded as accepted residue in section 7, not a
   form named in either criterion).
4. **Conflicting DECLARE / METHODRET (VALID-05), amended wording (D-05, D-09).** Holds. Evidence:
   `declare-methodret.bbj`; `classes.test.ts` and `variable-scoping.test.ts` assert warning
   severity for both METHODRET checks and for the program-scope conflicting-DECLARE case, and
   error severity for the one named in-method exception; zero error-severity hits from any of
   the three checks in either conformance run above (section 4's attestation, confirmed
   unchanged after Task 3's fixes since neither fix touched these checks).
5. **Conformance run at the phase boundary (CONF-01).** Partially holds — see section 6. A2 is
   at 22, at or below the 25 gate (from 267); A improves from 168 to 167 (not regressed); B
   regresses from 658 to 665 of 1,210 (not met, recorded as accepted residue, not silently
   passed). Nine synthetic regression fixtures now live under
   `bbj-vscode/test/test-data/conformance/`, one per construct group fixed across plans 01-06,
   each asserted by `conformance-regressions.test.ts` (zero parse errors, zero error-severity
   diagnostics, linking excluded).

