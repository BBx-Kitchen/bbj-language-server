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

### Per-file look at the four files (orchestrator, after plan 01)

Evidence: file-set diff of `snapshots/details-100-01-before.json` against the post-run `details.json`,
the flagged source lines, and direct `bbjcpl -N` probes.

| File | Move | What the file shows |
|------|------|---------------------|
| `samples/dup-75c6bfa9.bbj` | A → A2 | Was on list A for `dread x![]` (line 5). That now parses; the next disagreement in the same file is `clear x![]` (line 14), reported as "This statement needs to end with a line break: clear". `bbjcpl` accepts `clear x![]`. `CLEAR` followed by a variable list is a long-tail shape for plan 04, not a fault of the bracket rule. |
| `samples/asprsa-9a447b16.bbj` | caught → B | Compiler's complaint is an undefined label (line 895). The only thing this tree ever flagged was the parse error on `A![]=SN!.split("R")` (line 2527), which the compiler accepts. The earlier "catch" was accidental. |
| `bbjllm-dataset/row1733-0-79df14d1.bbj` | caught → B | Compiler rejects `LET parts$[] = SPLIT(dateStr$, "/")` (line 4). Probes: `parts$[] = "a"` and `parts$[all] = "a"` are both rejected, `parts$[] = q$[]` is accepted. The compiler requires a whole-array right-hand side for a whole-array target; that rule applied to `[all]` before this phase and was never checked here. It is a typed validation rule, not a parser shape; out of scope for the parser plans. |
| `bbjllm-dataset/row1772-0-b1c55c9f.bbj` | caught → B | Compiler rejects `FILEOPEN(...)` on line 1 (see the pending file-dialog todo handled in plan 05). Previously flagged only through the `[]` parse error on line 6. Accidental catch. |

Net: no file lost a correct diagnosis. Three accidental catches went away with the parse error that
produced them; one file advanced from its first disagreement to its second.

## Run: plan 02

**What was measured.**

- Command: `node /home/coder/repos/bbj-corpus/conformance/run.mjs --ls /home/coder/repos/bbj-language-server`
- Date: 2026-09-21. Language server commit `84d800c7` (the tree as committed through this
  plan's task 2), mode `validate`, `sourceModified: false`, 77 seconds.
- Preconditions confirmed before the run: `bbj-vscode/src/language/generated/ast.ts` no older
  than `bbj.langium`; `git status --porcelain -- bbj-vscode/src` printed nothing.
- `details.json` snapshotted to `snapshots/details-100-02-before.json` before the run.

**Numbers.**

| Measure | Plan 01 run | This run | Delta vs plan 01 | Delta vs Phase 99 close | Gate | Verdict |
|---|---|---|---|---|---|---|
| A — valid code the language server rejects | 21 | 16 | −5 | −36 | ≤ 25 (phase-final) | **improved, at or below the plan 01 run and the phase-final gate** |
| A2 — valid code that parses but gets a validation error | 24 | 28 | +4 | +5 | ≤ 23 | above both baselines |
| B — invalid code not flagged, of 1,210 | 669 | 669 | 0 | +3 | recorded, not gated | unchanged from plan 01 |

**A — by first word of the line the parser stops at (this run, 16 files total).**

| Files | Group |
|---|---|
| 2 | PRINT |
| 2 | IF |
| 1 each | PROCESS_EVENTS, *(empty)*, METHODEND, USE, FNEND, VAR, INPUT, FULLTEXT, ON, LET, METHOD |

None of the remaining first-word groups belong to the block-boundary or line-numbered-class
groups this plan targeted — the one `METHODEND` file and the one `FNEND` file left on list A
are a bare, unadorned `methodend`/`fnend` line with nothing after it (no trailing comment, no
class around it), which is a different shape from the comment-tail and line-number gaps this
plan closed; they carry over as residue for the long-tail triage.

**A2 — by message (this run, 28 files total).**

| Files | Message group |
|---|---|
| 6 | This statement needs to start in a new line: *(blank)* |
| 4 | This statement needs to end with a line break: classend |
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

One message group is new against the plan 01 run: "This statement needs to end with a line
break: classend" (4 files). Every other message group present at the plan 01 run still appears
at an unchanged count in this run's table.

**Set-movement sizes** (file-set difference, `snapshots/details-100-02-before.json` vs. this
run's `details.json`; sizes only, no id, path or line).

- **A (falseRejects): before 21, after 16 — 5 files left the list, 0 newly appeared.** Every
  movement this run made to list A is an improvement; none of this plan's grammar edit added a
  new list-A entry.
- **A2 (falseAlarms): before 24, after 28 — 4 files newly appeared, 0 left.** All four newly
  appeared files carry the exact same message group above, and the exact same own-words line
  shape: a `CLASSEND` immediately followed by a semicolon-introduced comment with the word
  `rem` and no comment text at all after it (`classend; rem` and `classend;rem`, nothing
  trailing).
- **B (missed): before 669, after 669 — 0 files newly appeared, 0 left.** No movement in the
  missed set this run.

## 4 files moved the wrong way — handed to the orchestrator

All four are A2 entries (0 files left the caught set this run — the missed/B set did not move).
Every one of the four carries the identical message group ("This statement needs to end with a
line break: classend") and the identical own-words line shape: `CLASSEND` followed by a
semicolon-introduced comment whose comment word (`rem`) has no text after it at all — no space,
no body. This plan's own diagnostic-cleanliness tests for the block-boundary comment tail always
gave the comment a body (`; rem c`); a bare `; rem` with nothing following it is a narrower shape
this plan did not probe. No cause, mechanism or attribution is recorded here for any of the four
— the per-file look is the orchestrator's job, not this task's, per this phase's own working
rule.

### Per-file look at the four A2 files (orchestrator, after plan 02)

File-set diff of `snapshots/details-100-02-before.json` against the post-run `details.json`: list A lost
5 files and gained none; B is the same set; A2 gained exactly `samples/16526-175f36d1.bbj` (line 20),
`samples/17065-6c66c142.bbj` (line 19), `samples/28950-024d2643.bbj` (line 33) and
`samples/thismethod-36d8a603.bbj` (line 36). All four were on list A before, all four flagged lines are
`classend; rem` / `classend;rem` with nothing after the comment word, all four carry the message
"This statement needs to end with a line break: classend". The line-end pattern in
`line-break-validation.ts` demands a blank after `rem`, so a bare `rem` at end of line does not count
as a comment tail. For a user these four files are no better off yet (one error replaced by another),
so the pattern fix is folded into plan 04 together with `clear x![]` from the plan 01 look; the
same-line leading line number in front of `class`/`classend` (false line-break diagnostics, present
before this phase) goes to plan 04 as well.
