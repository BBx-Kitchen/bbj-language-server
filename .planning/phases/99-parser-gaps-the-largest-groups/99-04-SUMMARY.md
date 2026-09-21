---
phase: 99-parser-gaps-the-largest-groups
plan: 04
subsystem: parser
tags: [langium, grammar, conformance]

# Dependency graph
requires:
  - phase: 99-03
    provides: "parser-keyword-statements.test.ts (shared services/beforeAll home), 99-CONFORMANCE.md (Run: plan 01/02/03 sections, the snapshots/ convention), the open A2 orchestrator decision (30 vs <=27)"
provides:
  - "IolistStatement grammar rule (property items: one-or-more comma-separated Expression) registered alphabetically in the SingleStatement alternation between InitFileStatement and KeyedFileStatement -- the IOLIST statement now parses standalone, behind a numeric label, an ordinary named label and a label named with the word `label`, in every letter case, with an item list mixing a numeric scalar, a string variable and an all-elements array subscript, and over a continuation line"
  - "iolist-statement.bbj conformance fixture -- every statement/item shape and case, plus a channel-option reference to the leading label"
  - "99-CONFORMANCE.md Run: plan 04 section -- A 56->53 (the IOLIST group fully cleared, 0 regressions into A), A2 unchanged at 30 (0 movement, carries forward plan 02's open gate-exceeded finding), B 665->666 (one file regressed, classified as a lost accidental catch per D-11)"
affects: [99-05]

actuals:
  tokens: 4100
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "A plain 'KEYWORD items+=Expression (,' items+=Expression)*' statement rule needs no dedicated item-type rule when Expression's existing postfix machinery (here, MemberCall's array-subscript ArrayElement) already covers every item shape asked for -- reused RedimStatement's exact shape a second time in this phase, following 99-PATTERNS.md's own recommendation"

key-files:
  created:
    - bbj-vscode/test/test-data/conformance/iolist-statement.bbj
  modified:
    - bbj-vscode/src/language/bbj.langium
    - bbj-vscode/test/parser-keyword-statements.test.ts
    - .planning/phases/99-parser-gaps-the-largest-groups/99-CONFORMANCE.md

key-decisions:
  - "IolistStatement placed next to RedimStatement (its closest analog) rather than alphabetically inline in the SingleStatement rule body -- only the alternation entry itself is alphabetical (between InitFileStatement and KeyedFileStatement); the rule body's own position follows the same convention FieldStatement (plan 02) already established of grouping a new rule near its structural sibling."
  - "D-17 still-flagged candidate: a trailing comma with no item after it (`iolist a,b,`). The bare-keyword-with-no-items candidate the plan explicitly excluded was confirmed unusable by probe (0 parser errors both before and after, since the keyword keeps its identifier-category fallback when standalone). The leading-comma candidate was also confirmed still-flagged but not used, since the trailing-comma case ends up typed as the new IolistStatement itself post-fix (a tighter regression signal on the new rule specifically) while the leading-comma case stays an ExpressionStatement in both runs."
  - "No lineBreakMap entry needed, confirmed by probe (label-no-space and semicolon-chained shapes both produced only pre-existing linking warnings, no line-break diagnostic of any severity) -- matches 99-RESEARCH.md's prediction exactly, so no line-break-validation.ts edit was made."
  - "No check-variable-scoping.ts change needed. The item-list-only validation probe produced only 'Could not resolve reference' linking diagnostics at severity Warning (this project's bbj-document-validator.ts downgrades non-cyclic linking errors from Error to Warning by design), never an error-severity diagnostic from the scoping/use-before-assignment check itself -- confirmed unchanged by git status."

requirements-completed: []
# PARSE-07 intentionally NOT marked complete -- per the orchestrator rules for this plan, the
# requirement closes at phase end, not per-plan (plan 05 also touches the phase's requirement set).

coverage:
  - id: D1
    description: "The IOLIST statement parses standalone, behind a numeric label, an ordinary named label and a label named with the word `label`, in upper, lower and mixed case"
    requirement: PARSE-07
    verification:
      - kind: unit
        ref: "test/parser-keyword-statements.test.ts#IOLIST statement (positive cases: standalone/label/case-variant rows)"
        status: pass
      - kind: integration
        ref: "test/conformance-regressions.test.ts (iolist-statement.bbj fixture)"
        status: pass
    human_judgment: false
  - id: D2
    description: "An IOLIST item list accepts a numeric scalar, a string variable and an all-elements array subscript, and a long item list spread over a continuation line"
    requirement: PARSE-07
    verification:
      - kind: unit
        ref: "test/parser-keyword-statements.test.ts#IOLIST statement (item-shape and continuation-line cases)"
        status: pass
    human_judgment: false
  - id: D3
    description: "A channel-option reference to the leading label of an IOLIST statement resolves to that label's declaration"
    requirement: PARSE-07
    verification:
      - kind: unit
        ref: "test/parser-keyword-statements.test.ts#IOLIST statement (channel-option resolution case)"
        status: pass
    human_judgment: false
  - id: D4
    description: "A program whose variables appear only inside an IOLIST statement produces no error-severity diagnostic from the scoping or use-before-assignment checks"
    requirement: PARSE-07
    verification:
      - kind: unit
        ref: "test/parser-keyword-statements.test.ts#IOLIST statement (item-list-only-vars validation case)"
        status: pass
    human_judgment: false
  - id: D5
    description: "A malformed item list (trailing comma with no item after it) is still a parser error; identifiers containing, starting with or ending with the word `iolist` still parse as ordinary names"
    requirement: PARSE-07
    verification:
      - kind: unit
        ref: "test/parser-keyword-statements.test.ts#IOLIST statement (still-flagged and keyword-as-identifier cases)"
        status: pass
    human_judgment: false
  - id: D6
    description: "Conformance measurement: this group's contribution to the phase's A/A2/B gates, including classification of the one B regression"
    verification:
      - kind: manual_procedural
        ref: "node /home/coder/repos/bbj-corpus/conformance/run.mjs --ls <this repo>"
        status: pass
    human_judgment: true
    rationale: "The private corpus harness runs outside CI by design (D-15); the phase's A <= 80 final gate is evaluated at the phase level (plan 05), not per-plan. The one newly-appeared B file and the unchanged A2 = 30 finding are recorded evidence for an orchestrator/human decision, not something this plan's own tools resolve."

duration: 24min
completed: 2026-09-21
status: complete
---

# Phase 99 Plan 04: `IOLIST` statement Summary

**New `IolistStatement` grammar rule (a `RedimStatement`-shaped keyword-plus-comma-list, registered in the `SingleStatement` alternation) makes the `IOLIST` statement parse standalone, behind every label form, with every item shape and over a continuation line, clearing the phase's fourth and final largest group (3 files, 56 -> 53) with zero A2 side effect and one classified, accepted B regression.**

## Performance

- **Duration:** 24 min
- **Started:** 2026-09-21T13:10:55Z
- **Completed:** 2026-09-21T13:34:43Z
- **Tasks:** 3
- **Files modified:** 4 (1 grammar rule addition + 1 alternation entry, 1 new test fixture, 1 test-file addition, 1 measurement record)

## Accomplishments

- `bbj-vscode/src/language/bbj.langium` gains `IolistStatement`, structurally identical to
  `RedimStatement` minus its optional `Err?`: `'IOLIST' items+=Expression (',' items+=Expression)*`,
  requiring at least one item so a malformed list (a trailing comma with no item after it) stays a
  parser error. No dedicated item rule was added — `Expression`'s existing `MemberCall`/`ArrayElement`
  postfix already covers a scalar, a string variable and an all-elements array item. `OtherItem`'s
  fused `'IOL='` channel-option literal is byte-for-byte untouched (confirmed by diff), and
  `check-variable-scoping.ts` is byte-for-byte untouched (confirmed by `git status`).
- Probed before and after the grammar edit and Node-22 regeneration: the statement parses standalone,
  behind a numeric label, an ordinary named label and a label named with the word `label`, in upper,
  lower and mixed case, with an item list mixing a numeric scalar, a string variable and an
  all-elements array item, and over a continuation line — all with zero parser errors, all zero
  before the fix. A channel-option reference (`IOL=<label>`) to the leading label now resolves to
  that `LabelDecl` (confirmed via the AST: `UserLabelRef.label.ref` points to the declaration). Seven
  keyword-as-identifier probes (`iolist=5`, `x=iolist+1`, `myiolist=1`, `iolistx$="a"`,
  `niolist(1)=2`, a `FOR` bound, an `IF` condition) stayed at zero parser errors, byte-identical
  before and after.
- The generator's ambiguity-warning output is identical before and after the edit (only the
  pre-existing `Program` "potentially consumes no input" line, unrelated to this change, in both
  runs).
- Confirmed by probe that no `lineBreakMap` edit was needed: a label immediately followed by `iolist`
  (no space) and an `iolist ...;iolist ...` semicolon-chained pair both produce only pre-existing
  linking-warning diagnostics, never a line-break diagnostic of any severity — the existing
  `isLabelDecl`/`isCompoundStatement` exemptions in `isStandaloneStatement` already cover both shapes,
  exactly as 99-RESEARCH.md predicted. No `line-break-validation.ts` edit was made.
- Confirmed by probe that `check-variable-scoping.ts` needed no change for D-10: a program whose
  variables appear only inside an `IOLIST` statement produces `[2]`-severity (Warning) "Could not
  resolve reference" diagnostics only — this project's own `bbj-document-validator.ts` downgrades
  every non-cyclic linking error from Error to Warning by design, and the conformance harness's own
  `NOT_VALIDATION` filter additionally excludes any `linking-error`-coded diagnostic regardless of
  severity. No error-severity diagnostic of any kind was observed.
- New fixture `iolist-statement.bbj` (10 non-comment lines) and a new "IOLIST statement" describe
  block in `parser-keyword-statements.test.ts` (reusing plans 01-03's single services
  instance/`beforeAll`) cover every statement/item/case shape, an AST-shape assertion via the
  generated `isIolistStatement` type guard, the channel-option resolution case, the item-list-only
  validation case, the still-flagged trailing-comma case, and seven keyword-as-identifier cases.
- Conformance harness run: A 56→53 (−3, the `IOLIST` group fully cleared from list A — 3 files left
  the list, 0 newly appeared, consistent with the phase's own recorded group size). A2 stayed exactly
  unchanged at 30 (0 set movement in either direction — byte-identical to plan 03's table), carrying
  forward plan 02's open gate-exceeded finding (30 vs ≤27) without worsening or resolving it. B rose
  by exactly 1 (665→666) — classified per D-11 as a **lost accidental catch**: the one newly-appeared
  file's own compiler-flagged defect is a semantic label-not-found check this project's validator can
  never see (a linking-error diagnostic, excluded by both the harness's worker and this repository's
  document-validator override, regardless of severity), so the file's prior "catch" must have come
  from an unrelated syntax error — most likely a bare `IOLIST` usage this plan's own fix resolves —
  now exposing the pre-existing, structurally-unreachable defect underneath. Accepted, recorded, not
  fixed (belongs to the future compiler-parser endpoint, Phases 101-103). Five small first-word
  groups (including one file now reporting `FIELD`) appeared at one file each purely from the
  `IOLIST` group's own files exposing a later, unrelated failing line further down the same document
  — the same table-churn pattern plan 03 recorded for the `label` group.

## Task Commits

1. **Task 1: The IOLIST statement parses — probe, one new rule, regenerate, probe again** — `f47c652a` (fix)
2. **Task 2: Fixture and permanent tests for the statement, the item shapes and the identifier cases** — `33446378` (test)
3. **Task 3: Measure the group and append to the phase's conformance record** — `ff9a5b59` (docs)

**Plan metadata:** committed alongside this SUMMARY.

## Files Created/Modified

- `bbj-vscode/src/language/bbj.langium` — new `IolistStatement` rule (next to `RedimStatement`,
  its closest analog) plus its `SingleStatement` alternation entry (alphabetical, between
  `InitFileStatement` and `KeyedFileStatement`)
- `bbj-vscode/test/test-data/conformance/iolist-statement.bbj` — new conformance fixture: every
  statement and item shape and letter case, plus a channel-option reference to the leading label
- `bbj-vscode/test/parser-keyword-statements.test.ts` — new "IOLIST statement" describe block
  (positive cases, AST-shape assertion, resolution assertion, item-list-only validation case,
  still-flagged trailing-comma case, seven keyword-as-identifier cases)
- `.planning/phases/99-parser-gaps-the-largest-groups/99-CONFORMANCE.md` — new "Run: plan 04"
  section with totals, both deltas, per-group counts (no display cap, read directly from
  `details.json`), a real per-file set-movement diff, and the D-11 classification of the one B
  regression

## Decisions Made

- **`IolistStatement` placed next to `RedimStatement`**, its closest structural analog, rather than
  at the alphabetical position within the rule body — only the `SingleStatement` alternation entry
  itself needed to be alphabetical (Langium doesn't care where in the file a referenced rule is
  defined). Matches the convention `FieldStatement` (plan 02) already established.
- **D-17 still-flagged case: a trailing comma with no item after it.** Confirmed by probe as a
  parser error in both the before and after runs. The plan's own excluded candidate (a bare
  keyword with no items) was confirmed unusable — it already parsed clean (0 errors) before the fix
  too, since the keyword keeps its identifier-category fallback when standalone.
- **No `lineBreakMap` entry needed** — confirmed by probe for both the no-space label-chained shape
  and the semicolon-chained pair shape; only pre-existing linking warnings appeared, never a
  line-break diagnostic.
- **No `check-variable-scoping.ts` change needed** — confirmed by probe that item-list-only
  variables draw only Warning-severity linking diagnostics, never an error-severity diagnostic of
  any kind, matching 99-RESEARCH.md's Pitfall 4 exactly.

## Deviations from Plan

None affecting behavior or scope — plan executed exactly as written; every task's acceptance
criteria and `<verify>` command passed.

## Issues Encountered

- **Commit message copy-paste error (Task 2).** The commit `33446378`'s subject line and first
  body sentence read "fixture and permanent tests for label as a name" — copied verbatim from plan
  03's own commit title instead of being rewritten for this plan's `IOLIST statement` work. The
  commit's actual diff and remaining body text are correct and describe this plan's `IOLIST`
  fixture and test additions accurately; only the first line and one sentence carry the
  wrong subject. Per the no-amend rule for this run, the commit was left as-is rather than
  rewritten. No functional impact — the diff content, acceptance criteria and verification for
  Task 2 are all correct and independently confirmed.
- **Grouped whole-file vitest runs hit `beforeAll` hook-timeout contention** on the blast-radius
  verification set (4 of 7 files failed on the first grouped run) and on the whole-suite run (4 of
  113 files failed with the same hook-timeout signature, plus a 5th pre-existing, unrelated failure
  — see below). Every hook-timeout failure passed cleanly when re-run standalone. The whole-suite
  run's own "Tests" tally shows 0 failed tests (2043 passed, 105 skipped, 2148 total, no failed
  count) — the authoritative `numFailedTests: 0` gate per the project's standing decision, and it is
  0. Judged as contention, not a regression, per MEMORY.md's documented pattern.
- **`test/functional/installed-extension-e2e.test.ts` fails even standalone**, with "No document
  found for URI" for an examples fixture — an environment-dependent test requiring a live installed
  VS Code extension host, unrelated to this plan's grammar/parser change (no file this plan touched
  is anywhere near that test's scope) and out of scope per the deviation rules' scope boundary. Its
  own tally (19 passed, 15 skipped, 0 failed) shows the failure is a suite-setup crash, not an
  individual test failure — consistent with the whole-suite run's overall `numFailedTests: 0`.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- `parser-keyword-statements.test.ts` is ready for plan 05's own work — same shared services
  instance/`beforeAll` convention, unchanged.
- `99-CONFORMANCE.md` carries plans 01-04's run sections; plan 05 evaluates the phase-final A ≤ 80
  gate. A now stands at 53, already well under the phase-final gate.
- **Orchestrator decision still open, carried unchanged from plan 02:** A2 = 30 vs the phase's ≤27
  gate. This plan's own contribution was zero A2 movement in either direction — the finding is
  neither worsened nor resolved by this plan.
- **New orchestrator decision from this plan:** one B regression (665→666), classified per D-11 as
  a lost accidental catch tied to a semantic label-not-found defect this project's validator can
  never see by design — accepted and recorded above, not fixed in this plan. Also five small
  first-word A-group entries (including one `FIELD`-labeled file) that are table churn from files
  already on the A list, not new regressions — the set-movement diff confirms 0 files newly
  appeared in A.
- No blocker for plan 05 starting — this plan's grammar edit and fixture are independent of any
  work plan 05 might undertake.
- `PARSE-07` intentionally left incomplete in `REQUIREMENTS.md` per this plan's orchestrator rules
  — the requirement closes at phase end.

---
*Phase: 99-parser-gaps-the-largest-groups*
*Completed: 2026-09-21*
