# Phase 100 — Conformance Measurement

Measured at each plan boundary against the private corpus and harness that live outside this
repository (`/home/coder/repos/bbj-corpus/conformance/run.mjs`). Only counts and first-word /
message-group names are recorded here — no corpus file name, no corpus path, no corpus source
line.

## Baselines

The Phase 99 closing numbers this phase measures against (`99-CONFORMANCE.md`):

| Measure | Phase 99 close | Phase 100 gate |
|---|---|---|
| A — valid code the language server rejects | 52 | ≤ 25 |
| A2 — valid code that parses but gets a validation error | 23 | ≤ 23 |
| B — invalid code not flagged, of 1,210 | 666 | recorded with per-file evidence status, not gated |

Direction of worse: for A, A2 and B, a **higher** file count is worse. Lower is always better.

## Run: plan 01

**What was measured.**

- Command: `node /home/coder/repos/bbj-corpus/conformance/run.mjs --ls /home/coder/repos/bbj-language-server`
- Date: 2026-09-21. Language server commit `eabd6c4d` (the tree as committed through this plan's
  task 2), mode `validate`, `sourceModified: false`, 77 seconds.
- Preconditions confirmed before the run: `bbj-vscode/src/language/generated/ast.ts` no older
  than `bbj.langium`; `git status --porcelain -- bbj-vscode/src` printed nothing.
- `details.json` snapshotted to `snapshots/details-100-01-before.json` before the run.

**Numbers.**

| Measure | Baseline | This run | Delta vs baseline | Gate | Verdict |
|---|---|---|---|---|---|
| A — valid code the language server rejects | 52 | 21 | −31 | ≤ 25 (phase-final) | **improved, below the phase-final gate already** |
| A2 — valid code that parses but gets a validation error | 23 | 24 | +1 | ≤ 23 | above baseline by 1 file |
| B — invalid code not flagged, of 1,210 | 666 | 669 | +3 | recorded, not gated | regressed by 3 files |

The phase's A ≤ 25 gate is evaluated once every group in this phase has landed (plan 06); this
run reports the group's own contribution — a −31 file improvement, well past this group's own
"about 29" estimate from the phase context, meaning some files attributed to other groups in that
estimate were also empty-bracket cases.

**A — by first word of the line the parser stops at (this run, 21 files total).**

| Files | Group |
|---|---|
| 3 | METHODEND |
| 3 | METHOD |
| 2 | PRINT |
| 2 | IF |
| 1 each | PROCESS_EVENTS, *(empty)*, USE, FNEND, VAR, INPUT, FULLTEXT, DEF, ASSERT, ON, LET |

None of these first-word groups is the array-bracket group this plan targeted — that group is
fully cleared from list A. The remaining groups belong to later plans in this phase (block
boundaries, language words as names, the long tail) or are residue for the triage plan.

**A2 — by message (this run, 24 files total).**

| Files | Message group |
|---|---|
| 6 | This statement needs to start in a new line: *(blank)* |
| 3 | This statement needs to end with a line break: return |
| 1 | This statement needs to end with a line break: endif |
| 1 | Field 'y!' is declared 'BBjString' but is initialized with a number. |
| 1 | This statement needs to start in a new line: x[all] |
| 1 | This statement needs to end with a line break: clear |
| 1 | 'CASE DEFAULT' is only allowed inside a SWITCH block. |
| 1 | This statement needs to start in a new line: fi |
| 1 | DECLARE is not valid at class member level. Use FIELD for class-level declarations, or move DECLARE inside a method body. |
| 1 | The member is not visible (a visibility check) |
| 1 | MODE option only supported in MKEYED Verb. |
| 1 | This statement needs to end with a line break: LET num = 6.022 |
| 1 | This statement needs to end with a line break: LET tiny = 1 |
| 1 | This statement needs to end with a line break: LET val = 1 |
| 1 | This statement needs to end with a line break: gravitational_constant = 6.674 |
| 1 | This statement needs to end with a line break: log.DURATION = log.END-log. |
| 1 | This statement needs to start in a new line: else |

One message group is new against the Phase 99 close: "This statement needs to start in a new
line: x[all]" (1 file). Every other message group present at the Phase 99 close still appears at
an unchanged count in this run's table.

**Set-movement sizes** (file-set difference, `snapshots/details-100-01-before.json` vs. this
run's `details.json`; sizes only, no id, path or line).

- **A (falseRejects): before 52, after 21 — 31 files left the list, 0 newly appeared.** Every
  movement this run made to list A is an improvement; none of this plan's grammar edit added a
  new list-A entry.
- **A2 (falseAlarms): before 23, after 24 — 1 file newly appeared, 0 left.** The new message
  group above is exactly this one file.
- **B (missed): before 666, after 669 — 3 files newly appeared, 0 left.** Three previously-caught
  invalid files are no longer flagged by this tree.

## 4 files moved the wrong way — handed to the orchestrator

1 file newly entered A2 (a false alarm on previously-clean code) and 3 files newly entered B's
missed set (previously-caught invalid code no longer flagged) — 4 files total moved the wrong
way this run. Of these, **3 files left the caught set** (the B regressions: code the harness
used to correctly flag as invalid is now silently accepted). No cause, mechanism or attribution
is recorded here for any of the four — the per-file look is the orchestrator's job, not this
task's, per this phase's own working rule.
