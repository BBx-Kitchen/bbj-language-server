# Phase 99 — Conformance Measurement

Measured at each plan boundary against the private corpus and harness that live outside this
repository (`/home/coder/repos/bbj-corpus/conformance/run.mjs`). Only counts and first-word /
message-group names are recorded here — no corpus file name, no corpus path, no corpus source
line (D-14, as 98 D-17).

## Baselines

The Phase 98 closing numbers this phase measures against (`98-CONFORMANCE.md` section 10):

| Measure | Phase 98 close | Phase 99 gate |
|---|---|---|
| A — valid code the language server rejects | 167 | ≤ 80; no remaining list-A first-word group of `FIELD`, `READ`, `IOLIST` or the word `label` |
| A2 — valid code that parses but gets a validation error | 27 | ≤ 27 |
| B — invalid code not flagged, of 1,210 | 665 (55.0%) | recorded with evidence status, not gated |

Direction of worse: for A, A2 and B, a **higher** file count is worse. Lower is always better.

## Run: plan 01

**What was measured.**

- Command: `node /home/coder/repos/bbj-corpus/conformance/run.mjs --ls /home/coder/repos/bbj-language-server`
- Date: 2026-09-21. Language server commit `27522e61` (the tree as committed through this plan's
  task 2), mode `validate`, `sourceModified: false`, 68 seconds.
- Preconditions confirmed before the run: `bbj-vscode/src/language/generated/ast.ts` no older
  than `bbj.langium`; `git status --porcelain -- bbj-vscode/src` printed nothing.

**Numbers.**

| Measure | Baseline | This run | Delta vs baseline | Gate | Verdict |
|---|---|---|---|---|---|
| A — valid code the language server rejects | 167 | 128 | −39 | ≤ 80 (phase-final) | improved, phase gate not yet due |
| A2 — valid code that parses but gets a validation error | 27 | 22 | −5 | ≤ 27 | **PASS** |
| B — invalid code not flagged, of 1,210 | 665 | 665 | 0 | recorded, not gated | unchanged |

The phase's A ≤ 80 gate is evaluated once all four groups have landed (plan 05); this run reports
the group's own contribution, which is a −39 file improvement on the phase's starting baseline.

**A — by first word of the line the parser stops at (this run, 128 files total).**

| Files | Group |
|---|---|
| 45 | FIELD |
| 16 | *(empty)* |
| 8 | PRINT |
| 8 | DREAD |
| 4 | METHOD |
| 3 | METHODEND |
| 3 | ESCAPE |
| 3 | IOLIST |
| 3 | LABEL |
| 2 | V |
| 2 | TEXT |
| 2 | CALL |
| 2 | VECTOR |
| 2 | GOSUB |
| 2 | LET |
| 2 | IF |
| 1 each | PROCESS_EVENTS, ENTER, GOTO, STATE, USE, NS, FNEND, VAR, BBJAPI |
| 0 | READ |

`READ` — the group this plan targeted
(`READ`/`EXTRACT`/`FIND`/`INPUT`/`PRINT`/`WRITE RECORD`'s `LEN=` channel option, previously about
38 files) is fully cleared from list A. `FIELD` (45) and `IOLIST` (3) are untouched, as expected —
they are plans 02 and 04's own targets, not this plan's.

**A2 — by message (this run, 22 files total).**

| Files | Message group |
|---|---|
| 4 | This statement needs to start in a new line: *(blank)* |
| 3 | This statement needs to end with a line break: return |
| 1 | This statement needs to end with a line break: endif |
| 1 | Field _ is declared _ but is initialized with a number. |
| 1 | This statement needs to start in a new line: x[all] |
| 1 | _ is only allowed inside a SWITCH block. |
| 1 | This statement needs to start in a new line: fi |
| 1 | DECLARE is not valid at class member level. ... |
| 1 | The member _ from the type _ ... is not visible |
| 1 | MODE option only supported in MKEYED Verb. |
| 1 | This statement needs to end with a line break: LET num = _._ |
| 1 | This statement needs to end with a line break: LET tiny = _ |
| 1 | This statement needs to end with a line break: LET val = _ |
| 1 | This statement needs to end with a line break: gravitational_constant = _._ |
| 1 | Comments need to be separated by line breaks or _. |
| 1 | This statement needs to end with a line break: log.DURATION = log.END-log. |
| 1 | This statement needs to start in a new line: else |

The three Phase-98-close `LEN=`-related A2 message groups (`This statement needs to end with a
line break: LEN=` — 3 files, `... len=` — 1 file, `... LET` — 1 file, total 5) no longer appear in
this run's list — confirming D-03's predicted side effect (A2 27 → 22, all five files were the
`LEN` residue named in Phase 98's own closing record, section 7).

**Set-movement sizes.**

The plan's Task 1 step 1 instruction was to snapshot `details.json` to
`/home/coder/repos/bbj-corpus/conformance/work/details-99-01-before.json` before this run, then
diff the snapshot against the fresh `details.json` for exact per-file set movement. That location
did not survive: `run.mjs` unconditionally does `rmSync(work, {recursive:true,force:true})` at its
own start, before writing `jobs-*.json`/`out-*.json` — it wipes the whole `work/` directory, not
only the files it is about to rewrite, so a snapshot placed there is destroyed by the very run it
was meant to be compared against. This was not caught before the run; the snapshot content is not
recoverable (the corpus repository's own git history for `conformance/details.json` is stale —
last committed at the harness's initial commit, long before this phase). Recorded as a deviation
(see this plan's SUMMARY); for plans 02-05 in this phase, the snapshot goes to a location
`run.mjs` never touches (e.g. a differently-named file directly under `conformance/`, or a path
outside the corpus repository entirely), and is deleted immediately after the comparison so it
does not linger as an untracked file in that repository's working tree.

Without a raw file-level diff, set movement for this run is reported at the group-arithmetic
level, which the evidence above supports without needing per-file identity:

- **A: 39 files left the list, 0 newly appeared.** The only first-word group present at the Phase
  98 close that is now completely absent is `READ` (~38 files, per 99-CONTEXT.md's own recorded
  group size); every other group this run reports (`FIELD` 45, `IOLIST` 3, `LABEL` 3, and the
  rest) is consistent with an unrelated, untouched group. The arithmetic reconciles to within one
  file of the phase-planning estimate of "about 38" for this group; the one-file difference is not
  further isolated (no raw diff available for this run).
- **A2: 5 files left the list (the LEN residue named above), 0 newly appeared.** Confirmed by
  comparing this run's message-group table against Phase 98's own closing record (`98-CONFORMANCE.md`
  section 7): every A2 message group in that record other than the three `LEN`-related rows is
  still present at the same count in this run's table.
- **B: 0 files moved, by count.** 665 this run vs. 665 baseline — an exact match. This plan's
  grammar edit only adds a new valid parse path (splitting a fused keyword literal into two
  ordinary grammar elements); it relaxes no existing check, so a B movement was not expected for
  this change. The identical count is consistent with zero movement but was not independently
  confirmed by a raw per-file diff for this run, for the same snapshot-location reason as above.

**0 files moved the wrong way** — no group unexpectedly grew, no B increase, and the one group
that shrank (`READ`, cleared from ~38 to 0) is exactly this plan's target. Handed to the
orchestrator only as a note that this run's set-movement evidence is group-level, not per-file, so
a subtler regression hiding inside an unchanged-count group could not be ruled out by this task
alone; the phase's later plans re-run the harness and can surface any such drift.
