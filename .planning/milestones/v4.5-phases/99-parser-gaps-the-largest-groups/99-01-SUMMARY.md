---
phase: 99-parser-gaps-the-largest-groups
plan: 01
subsystem: parser
tags: [langium, grammar, lexer, bbj-token-builder, conformance]

# Dependency graph
requires:
  - phase: 98-line-break-validation-false-alarms-a2
    provides: "conformance harness/fixture convention, the LEN= residue diagnosis handed forward as D-18"
provides:
  - "LastVerifyOption's LEN= keyword literal unfused into 'LEN' '=' -- fixes the RECORD verbs' LEN= channel option for READ/EXTRACT/FIND/INPUT/PRINT/WRITE, keeps the INPUT verifier's own LEN=a,b form, makes LEN a usable variable name"
  - "parser-keyword-statements.test.ts -- the phase's shared home for still-flagged and keyword-as-identifier test cases, reused by plans 02-04"
  - "99-CONFORMANCE.md -- the phase's conformance measurement record, opened with plan 01's numbers"
affects: [99-02, 99-03, 99-04, 99-05]

actuals:
  tokens: 3200
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "Fused multi-character keyword literal split into two ordinary grammar elements when the fused text collides with an unrelated rule (Langium's keyword vocabulary is global, not scoped to the declaring rule)"

key-files:
  created:
    - bbj-vscode/test/test-data/conformance/record-verbs-len-option.bbj
    - bbj-vscode/test/parser-keyword-statements.test.ts
    - .planning/phases/99-parser-gaps-the-largest-groups/99-CONFORMANCE.md
    - .planning/phases/99-parser-gaps-the-largest-groups/deferred-items.md
  modified:
    - bbj-vscode/src/language/bbj.langium

key-decisions:
  - "The qualifying D-17 still-flagged case is READ(1)a$:(LEN=1,) (trailing comma, missing max expression) -- it produced 2 genuine parser errors both before and after the edit. The other candidate, READ(1)a$:(LEN=), was NOT a parser error before the edit (the fused LEN= token satisfied the rule's own min=Expression fallback as a bare identifier, producing only a linking warning) -- it does not qualify per the plan's 'must be a parser error in BOTH runs' rule, even though it becomes a parser error after the fix."
  - "Set-movement sizes for 99-CONFORMANCE.md are reported at group-arithmetic granularity, not a raw per-file diff, because the plan's snapshot-before-run location (conformance/work/) is wiped unconditionally by run.mjs's own rmSync at the start of every run -- the snapshot was destroyed by the very run it was meant to be compared against."

requirements-completed: [PARSE-02]

coverage:
  - id: D1
    description: "The six sibling RECORD verbs (READ, EXTRACT, FIND, INPUT, PRINT, WRITE) parse a LEN= channel option, spaced and fused spellings, any case"
    requirement: PARSE-02
    verification:
      - kind: unit
        ref: "test/parser-keyword-statements.test.ts#RECORD verbs LEN= channel option"
        status: pass
      - kind: integration
        ref: "test/conformance-regressions.test.ts (record-verbs-len-option.bbj fixture)"
        status: pass
    human_judgment: false
  - id: D2
    description: "The INPUT verifier's own LEN=a,b form still parses; LEN works as an ordinary variable name (LET LEN=5, a=1,len=2)"
    requirement: PARSE-02
    verification:
      - kind: unit
        ref: "test/parser-keyword-statements.test.ts#LET LEN=5 parses as a single assignment statement"
        status: pass
    human_judgment: false
  - id: D3
    description: "A malformed verifier option (missing max expression) is still a parser error; identifiers containing or starting with the word still parse"
    verification:
      - kind: unit
        ref: "test/parser-keyword-statements.test.ts#a verifier option whose value is absent is still a parser error"
        status: pass
      - kind: unit
        ref: "test/parser-keyword-statements.test.ts#keyword-as-identifier"
        status: pass
    human_judgment: false
  - id: D4
    description: "Conformance measurement: this group's contribution to the phase's A/A2/B gates"
    verification:
      - kind: manual_procedural
        ref: "node /home/coder/repos/bbj-corpus/conformance/run.mjs --ls <this repo>"
        status: pass
    human_judgment: true
    rationale: "The private corpus harness runs outside CI by design (D-15); its A <= 80 final gate is evaluated at the phase level (plan 05), not per-plan -- this plan's own numbers (A -39, A2 -5, B unchanged) are recorded for the orchestrator's tracking, not a standalone pass/fail."

patterns-established:
  - "A fused multi-character keyword literal declared inside one rule is global to the lexer (Langium's DefaultTokenBuilder deduplicates keyword tokens by text across the whole grammar) -- splitting it into ordinary elements is the fix whenever the fused text can legitimately occur elsewhere as separate tokens."

duration: 18min
completed: 2026-09-21
status: complete
---

# Phase 99 Plan 01: RECORD verbs' LEN= channel option Summary

**Split the grammar's fused `'LEN='` keyword literal into `'LEN' '='`, fixing the `LEN=` channel option for all six RECORD verbs while keeping the INPUT verifier's own form and making `LEN` a usable variable name.**

Phase base commit (recorded before this plan's first commit, per the plan's working rules):
`28b13298fecc2e88afe08cf8fdbc2e3919e61946`.

## Performance

- **Duration:** 18 min
- **Started:** 2026-09-21T09:29:00Z (approx, first probe run)
- **Completed:** 2026-09-21T09:47:45Z
- **Tasks:** 3
- **Files modified:** 5 (1 grammar rule edit, 3 new test/fixture files, 1 new measurement record; plus a deferred-items.md log)

## Accomplishments

- `LastVerifyOption` in `bbj-vscode/src/language/bbj.langium` now reads `('LEN' '=' min=Expression ',' max=Expression) | min=Expression` — a single-line grammar diff, no lexer or token-builder change. `LEN` is all-uppercase, so it automatically inherits `CATEGORIES:[ID]` from `bbj-token-builder.ts`'s existing generic loop; no token-builder edit was needed.
- All six sibling RECORD verbs (`READ`, `EXTRACT`, `FIND`, `INPUT`, `PRINT`, `WRITE` with `RECORD`) now parse a `LEN=` channel option with zero lexer/parser errors, in the spaced and fused (`READRECORD`) spellings, any case, with a numeric or a variable value. Confirmed by probe before and after the edit, then pinned as permanent tests.
- The INPUT verifier's own `LEN=a,b` form (`READ(1)a$:(LEN=1,10)`) kept parsing with zero errors, as it did before the edit.
- `LET LEN=5` now parses as a single `LetStatement` (previously three cascading `ExpressionStatement`s with three line-break false-alarm diagnostics — the Phase 98 D-18 residue). `len=5` and `a=1,len=2` (multi-assignment) likewise parse clean.
- The qualifying still-flagged case (D-17): `READ(1)a$:(LEN=1,)` (trailing comma, missing `max` expression) stays a genuine parser error both before and after the edit.
- Keyword-as-identifier cases (`mylen=1`, `lenx$="a"`, `nlen(1)=2`, `for i=1 to mylen`, `if mylen then x=1`) and combined-form-confusion cases (`record_2=5`, `x=record_2+1`, `READ(1)record_2`) all stayed clean, before and after.
- Conformance harness run: A 167→128 (−39, the whole `READ`/`RECORD` `LEN=` group cleared from list A), A2 27→22 (−5, the five Phase 98 `LEN` residue files cleared, matching D-03's prediction exactly), B unchanged at 665.

## Task Commits

1. **Task 1: End-to-end "a RECORD verb with a LEN= channel option parses"** — `40fb9ad9` (fix)
2. **Task 2: Pin the group's positive, still-flagged and identifier cases as permanent tests** — `27522e61` (test)
3. **Task 3: Measure the group and open the phase's conformance record** — `01ade0f2` (docs)

**Plan metadata:** committed alongside this SUMMARY.

## Files Created/Modified

- `bbj-vscode/src/language/bbj.langium` — `LastVerifyOption`'s fused `'LEN='` literal split into `'LEN' '='`
- `bbj-vscode/test/test-data/conformance/record-verbs-len-option.bbj` — new conformance fixture: six sibling verbs with a `LEN=` option, upper/lower/mixed case, fused spelling, the verifier form, and `LET LEN=5`
- `bbj-vscode/test/parser-keyword-statements.test.ts` — new shared test file (one `createBBjServices`/`beforeAll` instance, reused by plans 02-04): positive RECORD-verb cases, the `LET LEN=5` AST-shape assertion, the still-flagged verifier case, keyword-as-identifier cases, combined-form-confusion cases
- `.planning/phases/99-parser-gaps-the-largest-groups/99-CONFORMANCE.md` — new phase measurement record, opened with this plan's baselines and run-1 numbers
- `.planning/phases/99-parser-gaps-the-largest-groups/deferred-items.md` — new, logs one out-of-scope whole-suite failure found during verification (see Issues Encountered)

## Decisions Made

- **Still-flagged candidate selection (D-17).** Two candidates were probed: `READ(1)a$:(LEN=)` (value absent) and `READ(1)a$:(LEN=1,)` (trailing comma). Only the trailing-comma form was a genuine parser error in the BEFORE run (2 parser errors); the value-absent form had 0 parser errors before the edit — the fused `LEN=` token satisfied `LastVerifyOption`'s own `min=Expression` fallback as a bare identifier reference, producing only a linking warning ("Could not resolve reference to NamedElement named 'LEN='"). Since the plan's rule requires a candidate to be a parser error in BOTH runs, `READ(1)a$:(LEN=1,)` was pinned; the value-absent form was left out even though it becomes a parser error after the fix too (a side effect, not the intentionally-selected regression guard).
- **Set-movement reporting granularity (see Deviations below).**

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Corrected the conformance-harness snapshot location for the set-movement diff**
- **Found during:** Task 3
- **Issue:** The plan's instruction was to snapshot `details.json` to `/home/coder/repos/bbj-corpus/conformance/work/details-99-01-before.json` before running the harness, on the stated assumption that "the harness overwrites the file on every run" (only `details.json` itself). In fact `run.mjs` runs `rmSync(work, {recursive:true, force:true})` unconditionally at its own start — it wipes the *entire* `work/` directory, including any file placed there beforehand, before writing its own `jobs-*.json`/`out-*.json`. The snapshot was destroyed by the very run it was meant to be diffed against, and the pre-run state was not otherwise recoverable (the corpus repository's own git history for `details.json` is stale, predating even Phase 98).
- **Fix:** Reported this run's set-movement at group-arithmetic granularity instead of a raw per-file diff: A's −39 delta is attributed to the `READ` first-word group, now completely absent from the harness's report (previously ~38 files per `99-CONTEXT.md`'s own recorded group size) with every other group's count matching what Phase 98's own closing record shows for it; A2's −5 delta is attributed to the exact five `LEN`-related message-group files named in `98-CONFORMANCE.md` section 7, none of which reappear in this run's message-group table; B stayed at an identical 665, consistent with (but not independently proven identical to) the baseline set, since this plan's change is additive-only and relaxes no existing check.
- **Files modified:** `.planning/phases/99-parser-gaps-the-largest-groups/99-CONFORMANCE.md` (documents the limitation and the corrected process for plans 02-05: snapshot to a location `run.mjs` never touches, e.g. a distinctly-named file directly under `conformance/` rather than under `conformance/work/`, deleted immediately after use).
- **Verification:** The group-level arithmetic is internally consistent (A's per-group table sums to 128; A2's to 22; no group present in Phase 98's closing record is missing from this run's tables except the five named `LEN` rows) and cross-checked against `99-CONTEXT.md`'s own recorded phase-98-close group sizes.
- **Committed in:** `01ade0f2` (Task 3 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking — corrected process, not source code)
**Impact on plan:** No impact on the grammar fix or its tests; only the measurement record's evidence granularity for this run's set-movement claim is coarser than the plan intended. The corrected snapshot process is documented for plans 02-05 to use a location the harness does not clear.

## Issues Encountered

- **Whole-suite run (`npx vitest run --maxWorkers=2`) surfaces one non-hook-timeout failure unrelated to this plan.** `test/functional/installed-extension-e2e.test.ts > "installed extension e2e: SETOPTS-in-code (#475)"` fails with `Error: No document found for URI: file:///home/coder/repos/bbj-language-server/examples/issue475-setopts-in-code.bbj`, reproduced in isolation (not a `--maxWorkers` contention artifact like the other 4 "failed suites" seen across two whole-suite runs, which were all `beforeAll` hook timeouts on different files each run). This suite is gated by `installPresent` and drives an already-installed VS Code extension bundle over its own language-server connection — unrelated to this plan's single-rule grammar edit and to SETOPTS handling. Logged to `deferred-items.md`, not fixed, per the executor's scope boundary (pre-existing, out of scope for a grammar-only plan). `numFailedTests` at the individual-test level was 0 across both whole-suite runs; only suite-level setup failures occurred.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- `parser-keyword-statements.test.ts` is ready for plans 02-04 to add their own `describe` block (one shared services instance, one top-level `beforeAll`, as the file's header comment states).
- `99-CONFORMANCE.md` is open with this plan's baselines and run-1 numbers; plans 02-04 append their own `Run: plan NN` sections, and plan 05 evaluates the phase-final A ≤ 80 gate.
- The corrected conformance-snapshot process (location outside `conformance/work/`) should be used starting with plan 02's own Task 3-equivalent measurement, to avoid repeating this plan's set-movement evidence gap.
- No blockers for plan 02 (`FIELD` verb).

---
*Phase: 99-parser-gaps-the-largest-groups*
*Completed: 2026-09-21*

## Self-Check: PASSED

All 6 key files confirmed present on disk (`bbj.langium`, `record-verbs-len-option.bbj`,
`parser-keyword-statements.test.ts`, `99-CONFORMANCE.md`, `deferred-items.md`, this SUMMARY). All
3 task commit hashes (`40fb9ad9`, `27522e61`, `01ade0f2`) confirmed present in `git log`.
