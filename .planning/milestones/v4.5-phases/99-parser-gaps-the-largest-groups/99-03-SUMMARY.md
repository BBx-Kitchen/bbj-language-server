---
phase: 99-parser-gaps-the-largest-groups
plan: 03
subsystem: parser
tags: [langium, grammar, conformance]

# Dependency graph
requires:
  - phase: 99-02
    provides: "parser-keyword-statements.test.ts (shared services/beforeAll home), 99-CONFORMANCE.md (Run: plan 01/02 sections, the snapshots/ convention), the open A2 orchestrator decision (30 vs <=27)"
provides:
  - "FeatureName gains a 'label' alternative and a new narrow LabelName datatype rule (ID | 'label'), used by LabelDecl.name and the UserLabelRef cross-reference -- the word `label` now works as a label declaration (alone or in front of a statement), a GOTO/GOSUB/ON...GOTO branch target, and a plain variable, in every letter case, while LibSymbolicLabel, GotoStatement, OnGotoStatement and ValidName stay untouched"
  - "label-word-as-name.bbj conformance fixture -- every declaration/branch-target/variable position and case, plus an ordinary non-keyword label for the general case"
  - "99-CONFORMANCE.md Run: plan 03 section -- A 84->56 (label group fully cleared, 0 regressions), A2 unchanged at 30 (0 movement, carries forward plan 02's open gate-exceeded finding), B unchanged"
affects: [99-04, 99-05]

actuals:
  tokens: 4300
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "A lowercase-declared keyword excluded from the generic ID-category fallback gets a narrowly-scoped new datatype rule (mirroring FeatureName's own shipped 'void' precedent) rather than a bbj-token-builder.ts CATEGORIES special-case -- reused for a second word ('label') in this phase, following the exact pattern 'void' already established"

key-files:
  created:
    - bbj-vscode/test/test-data/conformance/label-word-as-name.bbj
  modified:
    - bbj-vscode/src/language/bbj.langium
    - bbj-vscode/test/parser-keyword-statements.test.ts
    - .planning/phases/99-parser-gaps-the-largest-groups/99-CONFORMANCE.md

key-decisions:
  - "Assumption A2 held: a cross-reference typed by a datatype rule that mixes the ID terminal with a bare keyword alternative (the new LabelName rule) compiles and resolves correctly. The generator's ambiguity-warning output was byte-identical before and after (only the 'Program rule potentially consumes no input' line, present in both runs and unrelated to this change). The recorded fallback (widening ValidName directly) was NOT needed -- ValidName is unchanged, confirmed by diff."
  - "The D-17 still-flagged case is a class declared with the word as its name (ClassDecl.name stays typed by ValidName, deliberately not widened) -- 1 parser error, unchanged before and after. The other candidate probed (a bare 'gosub' with no target) turned out to already parse with 0 errors in both runs -- GOSUB is declared uppercase, so it already gets the generic ID-category fallback and reads as a plain identifier when standalone -- so it was not usable as a 'must be a parser error in both runs' candidate and was not used."
  - "No lineBreakMap entry was needed, confirmed by probe: a label immediately followed by a statement (no space) and a label followed by a space plus a semicolon-chained pair both produce zero diagnostics of any severity, through the existing generic isLabelDecl/isCompoundStatement exemptions in isStandaloneStatement -- the same mechanism plan 02 confirmed for FieldStatement."
  - "Probed and confirmed safe before writing the fixture: a plain assignment to the word as a variable (LABEL=5) resolves through the local, self-referential implicit-variable-declaration mechanism (Assignment as its own NamedElement), not to a same-named LabelDecl elsewhere in the document -- local scope shadows the document-level LabelDecl export, so a fixture containing both a label declaration and a variable assignment/read of the same word produces zero diagnostics, confirmed by probe before committing to that fixture design."

requirements-completed: []
# PARSE-03 intentionally NOT marked complete -- shared with plan 05 of this phase per
# requirements.ready-ids (0/1 ready); the orchestrator marks it once every declaring plan lands.

coverage:
  - id: D1
    description: "The word `label` works as a label declaration alone on a line, in upper, lower and mixed case"
    requirement: PARSE-03
    verification:
      - kind: unit
        ref: "test/parser-keyword-statements.test.ts#the word `label` as a name (declaration alone, upper/lower/mixed case cases)"
        status: pass
      - kind: integration
        ref: "test/conformance-regressions.test.ts (label-word-as-name.bbj fixture)"
        status: pass
    human_judgment: false
  - id: D2
    description: "The word `label` works as a label declaration immediately followed by a statement on the same line, with and without a space after the colon, including a semicolon-chained pair of statements"
    requirement: PARSE-03
    verification:
      - kind: unit
        ref: "test/parser-keyword-statements.test.ts#the word `label` as a name (declaration immediately followed by a statement, no space / space and chained pair / ENTER cases; validation cases)"
        status: pass
    human_judgment: false
  - id: D3
    description: "The word `label` works as a GOTO and a GOSUB target, including inside a semicolon-chained statement and as one entry of a multi-target ON...GOTO/GOSUB list, and a branch target resolves to its declaration (not merely parses)"
    requirement: PARSE-03
    verification:
      - kind: unit
        ref: "test/parser-keyword-statements.test.ts#the word `label` as a name (GOSUB/GOTO/chained/ON...GOTO target cases; resolution case)"
        status: pass
    human_judgment: false
  - id: D4
    description: "The word `label` works as a variable on the left of an assignment and as a variable read inside an expression"
    requirement: PARSE-03
    verification:
      - kind: unit
        ref: "test/parser-keyword-statements.test.ts#the word `label` as a name (variable on the left of an assignment / variable read cases)"
        status: pass
    human_judgment: false
  - id: D5
    description: "A label with any other name keeps parsing; the library grammar's own symbolic-label declarations (labels.bbl) keep loading; only the word `label` is widened -- a class named `label` is still a parser error"
    requirement: PARSE-03
    verification:
      - kind: unit
        ref: "test/parser-keyword-statements.test.ts#the word `label` as a name (regression and still-flagged cases)"
        status: pass
      - kind: integration
        ref: "whole-suite run (every initializeWorkspace() call parses labels.bbl)"
        status: pass
    human_judgment: false
  - id: D6
    description: "Identifiers that contain, start with or end with the word stay ordinary names"
    requirement: PARSE-03
    verification:
      - kind: unit
        ref: "test/parser-keyword-statements.test.ts#the word `label` as a name (keyword-as-identifier cases)"
        status: pass
    human_judgment: false
  - id: D7
    description: "Conformance measurement: this group's contribution to the phase's A/A2/B gates"
    verification:
      - kind: manual_procedural
        ref: "node /home/coder/repos/bbj-corpus/conformance/run.mjs --ls <this repo>"
        status: pass
    human_judgment: true
    rationale: "The private corpus harness runs outside CI by design (D-15); the phase's A <= 80 final gate is evaluated at the phase level (plan 05), not per-plan. This run's own A2 number (30, still exceeding the phase's <=27 gate) is unchanged from plan 02 -- a genuine open finding carried forward, not something this plan's tools can resolve alone."

duration: 15min
completed: 2026-09-21
status: complete
---

# Phase 99 Plan 03: `label` as a name Summary

**`FeatureName` gains a `'label'` alternative and a new narrow `LabelName` datatype rule replaces `ValidName` as the type of `LabelDecl.name` and the `UserLabelRef` cross-reference — the word `label` now parses as a label declaration, a `GOTO`/`GOSUB`/`ON...GOTO` branch target, and a plain variable, in every letter case, clearing the phase's third-largest list-A group (28 files, 84 -> 56) with zero A2 or B side effect.**

## Performance

- **Duration:** 15 min
- **Started:** 2026-09-21T10:50:00Z (approx, first probe run)
- **Completed:** 2026-09-21T11:05:12Z
- **Tasks:** 3
- **Files modified:** 4 (1 grammar rule addition + 1 rule-type change, 1 new test fixture, 1 test-file addition, 1 measurement record)

## Accomplishments

- `bbj-vscode/src/language/bbj.langium` gains two additions, both following the already-shipped
  `'void'` precedent in `FeatureName` exactly: (1) `FeatureName` widened with a `'label'`
  alternative, covering the word's use as a plain variable (read and write) through
  `SymbolRef.symbol=[NamedElement:FeatureName]`; (2) a brand-new, narrowly-scoped datatype rule
  `LabelName returns string: ID | 'label'`, used in exactly two places — `LabelDecl.name` and
  `UserLabelRef`'s cross-reference type — covering the word's use as a label declaration and as a
  `GOTO`/`GOSUB`/`ON...GOTO` branch target. `ValidName` was deliberately **not** widened (the
  recorded fallback was not needed), so the word still cannot name a class, method, library
  function or library variable — confirmed by a still-flagged probe case. `LibSymbolicLabel`,
  `GotoStatement`, `OnGotoStatement`, `bbj-token-builder.ts` and `bbj-lexer.ts` are all
  byte-for-byte untouched (asserted by diff/status).
- Probed before and after the grammar edit and Node-22 regeneration: every declaration shape
  (alone; immediately followed by a statement with and without a space; a semicolon-chained pair;
  an `ENTER`-prefixed declaration), every branch-target shape (`GOSUB`, `GOTO`, a semicolon-chained
  `GOTO`, a multi-target `ON...GOTO` list entry) and both variable shapes (assignment, expression
  read) now parse with zero parser errors and a non-empty statement list, in upper, lower and mixed
  case. The other-name regression shapes (`foo:`, `foo:escape`, `L30: enter a$`) and five
  keyword-as-identifier shapes (`mylabel=1`, `labelx$="a"`, `nlabel(1)=2`,
  `for i=1 to nlabel`, `if mylabel then x=1`) stayed byte-for-byte unchanged — 0 parser errors
  before and after every one of them.
- The generator's ambiguity-warning output is identical before and after the edit (only the
  pre-existing `Program` "potentially consumes no input" line, unrelated to this change, in both
  runs) — Assumption A2 (a cross-reference typed by a rule mixing `ID` with a bare keyword
  alternative works) held; the recorded `ValidName`-widening fallback was not taken.
- Confirmed by probe that no `lineBreakMap` edit was needed: `label:escape` (no space) and
  `label: escape;exit` (space plus a semicolon-chained pair) both produce zero diagnostics of any
  severity, via the existing generic `isLabelDecl`/`isCompoundStatement` exemptions in
  `isStandaloneStatement` — no code change to `line-break-validation.ts`.
- Also probed, before finalizing the fixture design: a plain assignment to the word as a variable
  (`LABEL=5`) alongside an actual `label:` declaration in the same document resolves through the
  local, self-referential implicit-variable-declaration mechanism, not to the `LabelDecl` — local
  scope shadows the document-level export, so the two roles coexist with zero diagnostics.
- New fixture `label-word-as-name.bbj` (16 non-comment lines) and a new "the word `label` as a
  name" describe block in `parser-keyword-statements.test.ts` (reusing plans 01/02's single
  services instance/`beforeAll`) pin every declaration/branch-target/variable position and case, a
  cross-reference resolution assertion (a `GOSUB` target resolves to its `LabelDecl`), the
  other-name and keyword-as-identifier regression cases, the still-flagged class-name case, and two
  validation cases confirming zero error-severity diagnostics for the same-line and chained
  declaration shapes.
- Conformance harness run: A 84→56 (−28, the `label` word-as-name group fully cleared from list A,
  0 files regressed — consistent with the phase's own "about 25" size estimate for this group).
  A2 stayed exactly unchanged at 30 (0 set movement in either direction — every A2 message-group
  row and count is byte-identical to plan 02's run), carrying forward plan 02's open
  gate-exceeded finding (30 vs ≤27) without worsening or resolving it. B stayed unchanged at 665
  (0 movement, confirmed by an exact per-file diff). No side effect on any other word is possible
  from this plan's mechanism (exactly one new `FeatureName` alternative plus one new `LabelName`
  rule referenced nowhere else) — recorded per D-05, with nothing to hand to Phase 100 from this
  plan's own change.

## Task Commits

1. **Task 1: The word works as a name — probe the cross-reference question first, then widen two rules** — `aa458255` (fix)
2. **Task 2: Fixture and permanent tests for every position, plus the narrow-scope negative** — `1e18dd9d` (test)
3. **Task 3: Measure the group and append to the phase's conformance record** — `6286728a` (docs)

**Plan metadata:** committed alongside this SUMMARY.

## Files Created/Modified

- `bbj-vscode/src/language/bbj.langium` — `FeatureName` gains a `'label'` alternative; new
  `LabelName` datatype rule (`ID | 'label'`) used by `LabelDecl.name` and `UserLabelRef`'s
  cross-reference type
- `bbj-vscode/test/test-data/conformance/label-word-as-name.bbj` — new conformance fixture: every
  declaration, branch-target and variable position and letter case, plus an ordinary non-keyword
  label for the general case
- `bbj-vscode/test/parser-keyword-statements.test.ts` — new "the word `label` as a name" describe
  block (positive cases, a cross-reference resolution assertion, other-name regression cases, the
  still-flagged class-name case, five keyword-as-identifier cases, two validation cases)
- `.planning/phases/99-parser-gaps-the-largest-groups/99-CONFORMANCE.md` — new "Run: plan 03"
  section with totals, both deltas, per-group counts, a real per-file set-movement diff, and the
  D-05 side-effect finding (none)

## Decisions Made

- **`LabelName` (not `ValidName`) as the new rule.** Confirmed sufficient and necessary by probe —
  no fallback to widening `ValidName` was needed; the generator accepted the cross-reference typed
  by the new rule with no new ambiguity warning.
- **D-17 still-flagged case: a class declared with the word as its name.** The other candidate
  considered (a bare `gosub` with no target) turned out to already parse cleanly in both runs
  (`GOSUB` is uppercase-declared and already has the generic ID-category fallback), so it did not
  qualify as a "parser error in both runs" candidate and was not used.
- **No `lineBreakMap` entry needed** — confirmed by probe for both the no-space and
  space-plus-chained same-line shapes.
- **Fixture design: multiple declarations of the same word are harmless.** Probed before
  committing to the fixture's shape — the LS raises no diagnostic (of any severity) for multiple
  `LabelDecl` nodes sharing the same name, and a variable use of the same word resolves through
  local scope, not the document-level label export. This let the fixture demonstrate every
  declaration shape in one coherent file without a linking or duplicate-name concern.

## Deviations from Plan

None — plan executed exactly as written; every task's acceptance criteria and `<verify>` command
passed.

## Issues Encountered

- **Self-caught register-check violation during Task 2.** A first draft of the still-flagged test
  name included the literal decision id `D-17` in its title. Caught by running the plan's own
  register-check grep before committing; fixed by rewording the test name to
  "deliberately not widened" with no identifier, then re-verified with the same grep (clean) and a
  re-run of the affected test files (still green). No scope or behavior change — text-only.
- **Grouped whole-file vitest runs hit `beforeAll` hook-timeout contention** (the documented
  pre-existing flake — multiple `initializeWorkspace()` calls racing under a shared 10s hook
  timeout), on both the blast-radius verification set and the whole-suite run. Every file that
  failed in a grouped run (`conformance-regressions.test.ts`, `line-break-validation.test.ts`)
  passed cleanly when run standalone; the whole-suite run's `numFailedTests: 0` (2128 total, 2061
  passed, 67 pending, 0 failed) is the authoritative gate per the project's standing decision, and
  it is 0. Judged as contention, not a regression, per MEMORY.md's documented pattern.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- `parser-keyword-statements.test.ts` is ready for plan 04's own describe block (`IOLIST`) — same
  shared services instance/`beforeAll` convention, unchanged.
- `99-CONFORMANCE.md` carries plans 01, 02 and 03's run sections; plan 04 (`IOLIST`) appends its
  own, and plan 05 evaluates the phase-final A ≤ 80 gate (A now stands at 56, already under the
  phase-final gate even before plan 04's own `IOLIST` contribution — plan 04 and plan 05's own
  measurement runs will confirm whether it stays there).
- **Orchestrator decision still open, carried unchanged from plan 02:** A2 = 30 vs the phase's
  ≤27 gate. This plan's own contribution was zero A2 movement in either direction — the finding is
  neither worsened nor resolved by this plan. Still needs either a `checkCommentNewLines` fix (out
  of scope for this phase's plans as currently scoped) or an explicit accepted-override before
  phase close, the same way Phase 98 closed with two accepted overrides.
- No blocker for plan 04 (`IOLIST`) starting — this plan's grammar edit and fixture are independent
  of the `IolistStatement` mechanism plan 04 will add.
- `PARSE-03` intentionally left incomplete in `REQUIREMENTS.md` — shared with plan 05
  (`requirements.ready-ids` reports 0/1 ready); the orchestrator marks it once plan 05 also lands.

---
*Phase: 99-parser-gaps-the-largest-groups*
*Completed: 2026-09-21*

## Self-Check: PASSED

All 4 key files confirmed present on disk (`bbj.langium`, `label-word-as-name.bbj`,
`parser-keyword-statements.test.ts`, `99-CONFORMANCE.md`). All 3 task commit hashes (`aa458255`,
`1e18dd9d`, `6286728a`) confirmed present in `git log`.
