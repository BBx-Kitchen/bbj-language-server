---
phase: 99-parser-gaps-the-largest-groups
plan: 05
subsystem: parser
tags: [langium, grammar, conformance, measurement]

# Dependency graph
requires:
  - phase: 99-04
    provides: "parser-keyword-statements.test.ts (shared services/beforeAll home), 99-CONFORMANCE.md (Run: plan 01/02/03/04 sections, the snapshots/ convention), the open A2 orchestrator decision (30 vs <=27) and the open B movement finding (665->666)"
provides:
  - "99-CONFORMANCE.md closing sections: Closing run, Gate table, A2 movement, B movement, Closing attestation, plus an Orchestrator per-file look correcting the plan's own gate-2 FIELD note and a Closing decision recording the user's 2026-09-21 call"
  - "99-VALIDATION.md reconciled Per-Task Verification Map (every row carries a status and a real task id)"
  - "A closing conformance measurement of the final tree: A 53 (PASS, gate <=80), A2 30 (FAIL, gate <=27, exceeds by 3), B 666 of 1,210 (recorded, not gated, +1 vs the Phase 98 close baseline of 665)"
affects: [99-06]

actuals:
  tokens: 7634
  tasks: 3
  commits: 4

tech-stack:
  added: []
  patterns:
    - "Closing-plan pattern reused from Phase 98 (plan 10): snapshot the harness details file immediately before the one closing run, compute every A2/B movement claim from a file-set diff against a recorded baseline set rather than from totals, and write a conditional-stop checkpoint instead of adjusting a rule/check/fixture to force a gate number"

key-files:
  created: []
  modified:
    - .planning/phases/99-parser-gaps-the-largest-groups/99-CONFORMANCE.md
    - .planning/phases/99-parser-gaps-the-largest-groups/99-VALIDATION.md

key-decisions:
  - "Gate-2 FIELD note corrected by the orchestrator's own per-file look (2026-09-21): the one remaining list-A file whose first-blocking word is FIELD is not table churn from an unrelated later line, as the executor's file-set-diff-only note first read it. The flagged line is the FieldStatement verb in its value form followed by a trailing comma-separated error-branch option (own-words shape: field <record>,<name>=<value>,err=<line reference>); FieldStatement's grammar rule carries no options tail, so this is a genuine PARSE-02 residue of the verb form, not a chance identifier or a class-member declaration."
  - "Stephan Wald chose Option A (2026-09-21): close both open gates with a gap plan inside Phase 99 rather than accept them as residue — give FieldStatement a trailing option tail, and fix the checkCommentNewLines false alarm behind the 8-file A2 rise, then re-measure. The B rise (665->666, plan 04's classified lost accidental catch) is accepted as recorded; it has no fix path in this repository before the compiler-parser endpoint (Phases 101-103)."
  - "PARSE-01, PARSE-02, PARSE-03 and PARSE-07 stay unticked in REQUIREMENTS.md. Three of the four criteria this plan attests already hold cleanly (FIELD as a verb, LEN= channel option, the word label), but the shared phase-final criterion 5 only partially holds (A2 gate miss, FIELD gate-2 residue), so no requirement closes until the gap plan re-measures."

requirements-completed: []
# PARSE-01/02/03/07 intentionally left untouched — this plan's own Task 3 conditional-stop
# fired (A2 gate FAIL, gate-2 PARTIAL), so the phase does not seal here; the gap plan closes
# the requirements at its own re-measure, per the user's 2026-09-21 decision.

coverage:
  - id: D1
    description: "The closing conformance run measures the final tree once, after the last source change of the phase, with the generated parser current, source status clean, the whole suite green on failed tests, and the register check clean over the phase's whole source diff"
    verification:
      - kind: unit
        ref: "cd bbj-vscode && RUN_BBJ_TESTS=0 npx vitest run --maxWorkers=2 (numFailedTests: 0, 2075 passed, 73 skipped)"
        status: pass
      - kind: manual_procedural
        ref: "node /home/coder/repos/bbj-corpus/conformance/run.mjs --ls <this repo>, 2026-09-21, commit 0f513214, sourceModified: false"
        status: pass
    human_judgment: false
  - id: D2
    description: "The gate table states, with reproducible arithmetic, the verdict for each of the four phase gates (A <=80, no remaining FIELD/READ/IOLIST/label first-word group, A2 <=27, B recorded)"
    verification:
      - kind: manual_procedural
        ref: "99-CONFORMANCE.md Gate table section: A 53 PASS; gate 2 PARTIAL (FIELD: 1, READ/IOLIST/LABEL: 0); A2 30 FAIL (exceeds by 3); B 666 recorded"
        status: pass
    human_judgment: true
    rationale: "The gate table itself is a factual record with reproducible arithmetic, but two of its four rows are not a clean PASS (A2 FAIL, gate 2 PARTIAL) — whether that shortfall seals the phase or triggers a gap plan is exactly the human decision this plan's Task 3 conditional-stop exists to route, not something this plan's own tooling resolves."
  - id: D3
    description: "Every criterion-to-evidence and requirement-to-evidence chain is written with named fixture and test, and the two deliberate non-goals (no blanket reserved-word rule, no new editor capability) are stated with their own diff evidence"
    verification:
      - kind: unit
        ref: "npx vitest run test/parser-keyword-statements.test.ts test/conformance-regressions.test.ts test/example-files.test.ts"
        status: pass
    human_judgment: false

duration: 32min
completed: 2026-09-21
status: complete
---

# Phase 99 Plan 05: Closing Conformance Run and the Conditional Stop Summary

**Closing measurement on commit `0f513214` finds list A cleanly under gate (53 of ≤80, all four named groups fully cleared except one already-counted FIELD-group file), but A2 sits at 30 against a ≤27 gate and that one FIELD file's own-words shape is a genuine verb-form residue — Task 3's conditional stop fired, the orchestrator ran the required per-file look, corrected the executor's own table-churn note, and the user chose to close both gates with a gap plan inside Phase 99 rather than accept them as residue.**

## Performance

- **Duration:** 32 min (Tasks 1-3), plus the orchestrator's own post-checkpoint correction and decision recording
- **Started:** 2026-09-21T13:46:47Z
- **Completed:** 2026-09-21T14:19:00Z (approx, orchestrator decision recorded same day)
- **Tasks:** 3
- **Files modified:** 2 (`99-CONFORMANCE.md`, `99-VALIDATION.md`)

## Accomplishments

- **Task 1 — proved the final tree is the tree being measured.** Generated parser confirmed no older
  than the grammar (no regeneration needed); `git status --porcelain -- bbj-vscode/src` printed
  nothing; whole vitest suite reported `numFailedTests: 0` (2075 passed, 73 skipped — the 4 "failed
  suites" are hook-timeout contention on 3 files plus the documented pre-existing
  `installed-extension-e2e.test.ts` environment failure, neither a failed test); all four phase
  fixtures (`field-verb.bbj`, `record-verbs-len-option.bbj`, `label-word-as-name.bbj`,
  `iolist-statement.bbj`) confirmed present alongside the nine inherited fixtures, with one describe
  block per construct group in `parser-keyword-statements.test.ts`; the register check over the
  phase's whole source diff (merge-base of HEAD with `origin/main`) produced no match. Reconciled
  `99-VALIDATION.md`'s Per-Task Verification Map so every row carries a status and a real task id.
- **Task 2 — the closing harness run, the gate table, and the disposition of what remains.** Snapshot
  taken immediately before the run; measured commit `0f513214`, `sourceModified: false`, 75 seconds.
  Numbers: **A 53** (Phase 98 close 167, last per-group run 53, this run 53 — PASS, ≤80). **A2 30**
  (Phase 98 close 27, last per-group run 30, this run 30 — exceeds the ≤27 gate by 3). **B 666 of
  1,210** (Phase 98 close 665, last per-group run 666, this run 666 — recorded, not gated, +1 vs the
  Phase 98 close baseline). The D-12 backstop confirmed identical: this run and plan 04's own
  per-group run report byte-identical numbers, and the file-set diff against the before-snapshot
  shows 0 files moved on any of the three lists — every number is attributable to the phase's four
  commits, not to run-to-run variation. The four-row gate table: (1) A ≤80 — **PASS** (53); (2) no
  remaining FIELD/READ/IOLIST/label first-word group — **PARTIAL** (`FIELD`: 1, `READ`: 0, `IOLIST`:
  0, `LABEL`: 0); (3) A2 ≤27 — **FAIL** (30, exceeds by 3); (4) B recorded — **recorded**, 666 (+1).
  A2 movement established by file-set diff against the recorded Phase 98 closing set (27 files / 20
  message groups): 3 message groups / 5 files cleared (exactly the `LEN`-related residue 99-CONTEXT's
  D-03 predicted, confirmed cleared since plan 01), 16 groups unchanged, 1 group (`checkCommentNewLines`
  "Comments need to be separated...") grew from 1 to 9 files (+8) — the mechanism plan 02's own run
  already traced to source, not re-derived here — 0 new groups appeared; arithmetic reconciles exactly
  (27 − 5 + 8 = 30). B movement: this task's own file-set diff shows 0 files newly uncaught since plan
  04 (byte-identical to the state plan 04 left it in); the phase-wide +1 vs the Phase 98 baseline is the
  single file plan 04's own before/after diff already classified as a lost accidental catch — that
  classification carried forward unchanged, no new cause written.
- **Task 3 — the criterion-by-criterion closing attestation, and the conditional stop.** All five
  Phase 99 success criteria attested with named evidence and a per-requirement fixture/test mapping
  (table below). Criteria 1-4 (`FIELD` as a verb, the `LEN=` channel option, the word `label` as a
  name, the `IOLIST` statement) each **Hold** cleanly. Criterion 5 (the phase-boundary conformance
  gate) **Partially holds**: A ≤80 holds (53); the no-remaining-group clause partially holds
  (`READ`/`IOLIST`/`LABEL` fully cleared, `FIELD` shows 1 remaining file); A2 ≤27 does **not** hold
  (30); B is recorded with its evidence status, as the roadmap wording requires. The two deliberate
  non-goals (no blanket reserved-word rule, no new editor capability) confirmed by diff evidence:
  the whole phase's `bbj-vscode/src/language/` diff touches exactly one file (`bbj.langium`, 32
  insertions / 4 deletions, every addition one of the four named grammar changes), and the six
  provider files (token builder, document symbol, semantic token, hover, completion, inlay hint)
  are byte-for-byte untouched. Because gate row 2 was PARTIAL and gate row 3 was FAIL, Task 3's
  conditional stop fired exactly as designed: the plan returned a blocking human checkpoint rather
  than sealing, with no source file touched to move a number.
- **Orchestrator per-file look (2026-09-21), correcting the executor's own note.** The executor's Task
  2 write-up read the one remaining `FIELD`-labeled list-A file as table churn — an `IOLIST`-group
  file whose blocking line moved from an `IOLIST` stop to a later, unrelated line that merely happens
  to start with the word `FIELD`. Per the file-set-diff evidence this file did enter the `FIELD` row
  exactly when plan 04 cleared its `IOLIST` stop, but the "unrelated line" reading was wrong: the
  harness's flagged line is the `FieldStatement` verb itself, in its value form, followed by a
  trailing comma-separated error-branch option (own-words shape: `field
  <record>,<name>=<value>,err=<line reference>`) — plan 02's `FieldStatement` grammar rule carries no
  options tail, so the parser stops at that second comma. This is a genuine PARSE-01 residue of the
  verb form, not a chance identifier and not a class-member declaration. `99-CONFORMANCE.md`'s gate-2
  note and the closing attestation's criterion-5 entry were both corrected in place to record this;
  gate row 2 stays **PARTIAL** until the rule accepts the option tail.
- **Closing decision (2026-09-21).** Stephan Wald reviewed the corrected gate table and chose to close
  both open gates with a gap plan inside Phase 99, rather than accept them as recorded residue: (1)
  give `FieldStatement` a trailing option tail for the `err=<line reference>` case, and (2) fix the
  `checkCommentNewLines` false alarm behind the 8-file A2 rise (one shape: a single-line `if … then …
  fi` statement continued on a `:`-continuation line ending in `; rem …`), then re-measure. The B rise
  (665 → 666, plan 04's classified lost accidental catch) is accepted as recorded — no fix path exists
  in this repository before the compiler-parser endpoint lands (Phases 101-103).

## Task Commits

1. **Task 1: Prove the final tree is the tree being measured** — `0f513214` (docs)
2. **Task 2: Closing harness run, the gate table, and the disposition of what remains** — `51b0afba` (docs)
3. **Task 3: Criterion-by-criterion closing attestation, and the conditional stop** — `b8e1c264` (docs)
4. **Orchestrator: gate-2 FIELD note corrected + closing decision recorded** — `97b2d083` (docs)

**Plan metadata:** committed alongside this SUMMARY.

## Files Created/Modified

- `.planning/phases/99-parser-gaps-the-largest-groups/99-CONFORMANCE.md` — Closing run, Gate table,
  A2 movement, B movement and Closing attestation sections; the gate-2 note corrected and a Closing
  decision section added by the orchestrator
- `.planning/phases/99-parser-gaps-the-largest-groups/99-VALIDATION.md` — reconciled Per-Task
  Verification Map (every row carries a status and a real task id)

## Decisions Made

See `key-decisions` in the frontmatter: the gate-2 FIELD note correction, the user's Option A closing
decision, and the deliberate choice to leave PARSE-01/02/03/07 unticked pending the gap plan.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 4-adjacent — checkpoint routed, not auto-fixed] Gate 2 (FIELD residue) and gate 3 (A2 ≤27)
both missed after the closing run**
- **Found during:** Task 2 (closing harness run) and Task 3 (closing attestation)
- **Issue:** The gate table produced one PARTIAL row (gate 2, FIELD: 1 remaining) and one FAIL row
  (gate 3, A2 30 vs ≤27). Per the plan's own Task 3 step 4 (the conditional stop), this is not
  auto-fixable — a missed gate must never be converted to a pass by adjusting a rule, check or
  fixture.
- **Fix:** The plan returned a blocking human checkpoint instead of sealing, exactly as designed. No
  source file was touched to move a number.
- **Files modified:** none (checkpoint routing only)
- **Verification:** `git status --porcelain -- bbj-vscode/src` confirmed clean at both Task 1 and
  after Task 3.
- **Committed in:** `51b0afba` (Task 2), `b8e1c264` (Task 3)

**2. [Orchestrator-level correction, not an executor deviation] Gate-2 note's "table churn" reading
was wrong**
- **Found during:** The orchestrator's mandatory per-file look at the checkpoint (this task is the
  orchestrator's job per the plan's own working rules, not the executor's)
- **Issue:** The executor's own Task 2 note attributed the one remaining `FIELD`-labeled file to an
  unrelated later line exposed by plan 04's `IOLIST` fix, without reading the file's own flagged line.
- **Fix:** The orchestrator read the harness's flagged line and found it to be the `FieldStatement`
  verb's own value form with a trailing `err=<line reference>` option the grammar rule does not
  accept — a genuine PARSE-01 residue, not table churn. `99-CONFORMANCE.md` corrected in place.
- **Files modified:** `.planning/phases/99-parser-gaps-the-largest-groups/99-CONFORMANCE.md`
- **Verification:** the corrected note is self-contained own-words shape description; no corpus file
  name, path or source line was written.
- **Committed in:** `97b2d083`

---

**Total deviations:** 2 (both checkpoint/attestation-level, not source auto-fixes — no source file
was modified by this plan or its follow-up correction).
**Impact on plan:** Task 3's conditional stop worked exactly as designed: two missed gates produced a
blocking checkpoint rather than an engineered pass, and the orchestrator's required per-file look
caught and corrected a wrong attribution before the human decision was made on it. No scope creep;
no source touched.

## Issues Encountered

None beyond the two items recorded above.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Phase 99 is **not sealed**. The closing measurement stands at A 53 (PASS), A2 30 (FAIL vs ≤27, +3
  over gate), gate-2 PARTIAL (one genuine `FieldStatement` verb-form residue: the trailing
  `err=<line reference>` option), B 666 of 1,210 (recorded, +1 vs the Phase 98 close baseline,
  accepted as a classified lost accidental catch).
- Per the user's 2026-09-21 decision, a gap plan inside Phase 99 will: (1) give `FieldStatement` a
  trailing option tail for the `err=` case, and (2) fix the `checkCommentNewLines` false alarm behind
  the 8-file A2 rise (the `:`-continuation-into-`; rem` shape), then re-measure. That gap plan owns
  the phase's final seal and the closing of PARSE-01/02/03/07.
- `PARSE-01`, `PARSE-02`, `PARSE-03` and `PARSE-07` intentionally left unticked in `REQUIREMENTS.md`
  — three of the four criteria already hold cleanly, but the shared phase-final criterion does not,
  so the requirement set closes with the gap plan, not here.
- No corpus file name, path or source line was written to any tracked file by this plan or the
  orchestrator's correction (confirmed by the grep verification in both Task 2 and Task 3).

---
*Phase: 99-parser-gaps-the-largest-groups*
*Completed: 2026-09-21*

## Self-Check: PASSED

`99-CONFORMANCE.md` and `99-VALIDATION.md` confirmed present on disk with the closing sections. All
four commit hashes (`0f513214`, `51b0afba`, `b8e1c264`, `97b2d083`) confirmed present in `git log`.
