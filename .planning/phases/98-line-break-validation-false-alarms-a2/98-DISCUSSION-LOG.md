# Phase 98: Line-Break & Validation False Alarms (A2) - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-09-20
**Phase:** 98-Line-Break & Validation False Alarms (A2)
**Areas discussed:** Grammar vs validator fix, DECLARE / METHODRET fate, Regression convention, Keeping checks useful

---

## Grammar vs validator fix

### Where should Phase 98 fix the mis-parsed constructs?

| Option | Description | Selected |
|--------|-------------|----------|
| Root cause in grammar | Add/repair statement rules in `bbj.langium` (+ lexer); AST becomes right; drops the roadmap's "leaves the grammar alone" note | ✓ |
| Validator only, as roadmapped | Tolerate the mis-parsed shapes in `line-break-validation.ts`; AST stays wrong | |
| Per construct, cheapest correct | Grammar where a rule is missing/too narrow, validator where only the mask is wrong | |

**User's choice:** Root cause in grammar
**Notes:** Scout found `TABLE` absent from the grammar and `RESTORE` limited to a label ref; the validator reports only the symptom.

### How far should the grammar model TABLE's hex operand?

| Option | Description | Selected |
|--------|-------------|----------|
| Opaque rest-of-line | One data token up to end of line / `;rem`; no hex validation | ✓ |
| Structured hex bytes | Hex terminals for mask and bytes; collides with identifiers and numbers | |
| You decide | Researcher picks | |

**User's choice:** Opaque rest-of-line

### How much of "language words as names" does Phase 98 take?

| Option | Description | Selected |
|--------|-------------|----------|
| Branch targets only | GOTO/GOSUB/ON…GOTO target position plus what the label side needs to link | ✓ |
| Only the words seen in the corpus | Just `print` and `save` | |
| Pull PARSE-08 forward | Whole possibleName set now | |

**User's choice:** Branch targets only

### How to handle the roadmap's "leaves the grammar alone" statement?

| Option | Description | Selected |
|--------|-------------|----------|
| Amend ROADMAP.md now | Correct Depends-on/Repository lines and the DECLARE check's file | ✓ |
| Record in CONTEXT.md only | Roadmap text stays | |

**User's choice:** Amend ROADMAP.md now

---

## DECLARE / METHODRET fate

### What should the conflicting-DECLARE check do?

| Option | Description | Selected |
|--------|-------------|----------|
| Downgrade to warning | Hint stays, "invalid" claim goes | |
| Remove the check | Compiler silent, language server silent | |
| Keep error, narrow it | Error only where provably wrong | ✓ |

**User's choice:** Keep error, narrow it
**Notes:** Follow-up showed the seven corpus hits by pattern (related types 2, unresolvable 1, same short name / different class 1, unrelated re-declared at program level 2, deliberately contradictory 1).

### What is the narrowed rule?

| Option | Description | Selected |
|--------|-------------|----------|
| Error only inside a method; warning at program level | Unrelated resolved types: error in a method body, warning at program scope; related/unresolvable silent | ✓ |
| Error when both resolve and are unrelated | Regardless of scope; leaves 3–4 files in A2 | |
| Warning when unrelated, silent otherwise | No error tier | |

**User's choice:** Error only inside a method; warning at program level

### What should the two METHODRET checks do?

| Option | Description | Selected |
|--------|-------------|----------|
| Both to warning | Missing-METHODRET and void-returns-value both become warnings | ✓ |
| Missing-METHODRET to warning only | Void check stays an error | |
| Remove both | | |

**User's choice:** Both to warning

### How should success criterion 4 read?

| Option | Description | Selected |
|--------|-------------|----------|
| Reword: "no error", with the named exception | Amend ROADMAP.md; in-method unrelated DECLAREs documented as deliberate | ✓ |
| Reword to "no error", drop the in-method error | | |
| Leave the wording | | |

**User's choice:** Reword with the named exception

### Special-case stub methods?

| Option | Description | Selected |
|--------|-------------|----------|
| No special cases | One plain warning | ✓ |
| Silent for empty bodies | | |
| You decide | | |

**User's choice:** No special cases

---

## Regression convention

### What should a CONF-01 regression file be checked for?

| Option | Description | Selected |
|--------|-------------|----------|
| Zero parse errors + zero validation errors | Error severity, linking excluded, no CPL/interop contact | ✓ |
| Parse-only files + separate validation tests | | |
| Both | | |

**User's choice:** Zero parse errors + zero validation errors
**Notes:** Scout found `example-files.test.ts` asserts parse errors only, so it cannot catch an A2 regression.

### Which files get the stricter assertion?

| Option | Description | Selected |
|--------|-------------|----------|
| A dedicated subfolder | `test/test-data/conformance/` | ✓ |
| By filename prefix | `conformance-*.bbj` | |
| All test-data files | | |

**User's choice:** A dedicated subfolder

### How are the files organised?

| Option | Description | Selected |
|--------|-------------|----------|
| One file per construct group | Named for the construct, all variants inside | ✓ |
| One file per requirement | Requirement ids in file names | |
| One file per corpus message variant | ~25 files | |

**User's choice:** One file per construct group

### How are they written?

| Option | Description | Selected |
|--------|-------------|----------|
| Hand-written minimal shapes | Invented names/data, behaviour REM | ✓ |
| Realistic mini-programs | | |

**User's choice:** Hand-written minimal shapes

---

## Keeping checks useful

### How is "not widened into uselessness" guarded?

| Option | Description | Selected |
|--------|-------------|----------|
| Existing negatives stay green + one new negative per touched rule | | ✓ |
| Existing negatives only | | |
| Negatives checked against bbjcpl | | |

**User's choice:** Existing negatives stay green + one new negative per touched rule

### Unnamed residue (trailing-comma PRINT, continued LEN=) — in or out?

| Option | Description | Selected |
|--------|-------------|----------|
| Both in | Fix the line-break cause; note the PRINT overlap for Phase 100 | ✓ |
| LEN= in, trailing comma to Phase 100 | | |
| Whatever reaches ≤ 25 | | |

**User's choice:** Both in

### What happens to A2 files that remain at the boundary run?

| Option | Description | Selected |
|--------|-------------|----------|
| Triage and record, fix only if cheap | Gate stays ≤ 25 | ✓ |
| Drive to zero | | |
| Stop at ≤ 25, no record | | |

**User's choice:** Triage and record, fix only if cheap

### Who runs the private harness, and what is recorded?

| Option | Description | Selected |
|--------|-------------|----------|
| Claude runs it; numbers only in the repo | Counts and message-group names, no corpus file names or source lines | ✓ |
| You run it, I record | | |
| Claude runs it, also mid-phase | | |

**User's choice:** Claude runs it; numbers only in the repo

---

## Claude's Discretion

- Lexer mechanism and AST naming for the opaque `TABLE` token
- Grammar expression of `RESTORE n`, `EXIT expr`, `LOAD`, `SAVE`
- Whether the conformance assertion extends `example-files.test.ts` or lives in a sibling test
- Warning wording; plan split and ordering

## Deferred Ideas

- Language words as names outside branch-target position — Phase 100 (PARSE-08)
- PRINT/INPUT item forms beyond the trailing-comma symptom — Phase 100 (PARSE-04)
- Hex validation of `TABLE` data — left to the compiler endpoint
- Four pending todos reviewed, none folded (keyword matches only; IntelliJ lifecycle and test-harness topics)
