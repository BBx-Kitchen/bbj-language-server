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

See below: two of the twenty-two message groups above turned out to be trivially related to
changes this phase already made and were fixed; the remainder are dispositioned as accepted
residue or handed to Phase 100.

<!-- gsd:write-continue -->
