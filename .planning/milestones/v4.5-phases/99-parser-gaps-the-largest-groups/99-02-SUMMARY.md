---
phase: 99-parser-gaps-the-largest-groups
plan: 02
subsystem: parser
tags: [langium, grammar, lexer, conformance]

# Dependency graph
requires:
  - phase: 99-01
    provides: "parser-keyword-statements.test.ts (shared services/beforeAll home), 99-CONFORMANCE.md (opened baseline and run-1 numbers), the corrected snapshots/ convention"
provides:
  - "FieldStatement grammar rule (record, name, value) registered in the SingleStatement alternation -- the FIELD verb parses at program level and inside a method body, in every letter case, while the class-member FieldDecl and its no-type parser error stay untouched"
  - "field-verb.bbj conformance fixture -- name-part, value-part, case and class-member-sharing coverage"
  - "99-CONFORMANCE.md Run: plan 02 section -- A 128->84 (FIELD group cleared), A2 22->30 (exceeds phase gate, root mechanism traced), B unchanged; first real per-file set-movement diff this phase"
affects: [99-03, 99-04, 99-05]

actuals:
  tokens: 3600
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "New SingleStatement alternative for a keyword whose bare-identifier fallback previously swallowed a following comma -- the name part typed one level below the relational expression (AdditiveExpr, not full Expression) to avoid the statement's own '=' being consumed as a comparison operator"

key-files:
  created:
    - bbj-vscode/test/test-data/conformance/field-verb.bbj
  modified:
    - bbj-vscode/src/language/bbj.langium
    - bbj-vscode/test/parser-keyword-statements.test.ts
    - .planning/phases/99-parser-gaps-the-largest-groups/99-CONFORMANCE.md

key-decisions:
  - "FieldStatement's name part is written at the AdditiveExpr level (record=Expression ',' name=AdditiveExpr '=' value=Expression), per the Orchestrator Addendum -- the full-Expression shape RESEARCH.md's own body text recommended is not usable as written (relational-level '=' would consume the statement's own equals sign)."
  - "field(1) and field.x -- the two identifier-as-risk cases the plan flagged -- needed no alternation reordering and no record-part narrowing: probed before and after, both stayed 0 parser errors unchanged, because the discriminating comma never becomes reachable without a preceding record=Expression ',' match."
  - "The qualifying D-17 still-flagged case for the verb form is 'field rec$,name$' (no value) -- 1 parser error before and after, unchanged. The class-member declaration without a type ('FIELD PUBLIC x') is the second, pre-existing still-flagged case (D-09) and was also confirmed unchanged (1 parser error, both runs)."
  - "No lineBreakMap entry was needed: a label-chained FieldStatement and a semicolon-chained pair of FieldStatements both produced zero error-severity diagnostics by probe, confirming the existing isLabelDecl/isCompoundStatement exemptions in isStandaloneStatement already cover the new rule."

requirements-completed: []
# PARSE-01 intentionally NOT marked complete -- shared with plans 03/04/05 of this phase per
# requirements.ready-ids (0/1 ready); the orchestrator marks it once every declaring plan lands.

coverage:
  - id: D1
    description: "The FIELD verb (record, name, value as plain expressions) parses with zero lexer/parser errors for every name-part shape (string variable, spaced string literal, masked str() concatenation), every value-part shape (nested call, negative number, num(), method-call result), at program level and inside a method body, in upper/lower/mixed case"
    requirement: PARSE-01
    verification:
      - kind: unit
        ref: "test/parser-keyword-statements.test.ts#FIELD verb (positive cases)"
        status: pass
      - kind: integration
        ref: "test/conformance-regressions.test.ts (field-verb.bbj fixture)"
        status: pass
    human_judgment: false
  - id: D2
    description: "The class-member FIELD declaration (FieldDecl) and its no-type parser error are untouched; a FIELD verb without a value is still a parser error"
    requirement: PARSE-01
    verification:
      - kind: unit
        ref: "test/parser-keyword-statements.test.ts#FIELD verb (still-flagged cases)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Identifiers containing, starting with or ending with the word FIELD stay ordinary names (field=5, x=field+1, field(1), field.x, myfield=1, fieldname$=\"a\", nfield(1)=2, for i=1 to nfield, if myfield then x=1)"
    requirement: PARSE-01
    verification:
      - kind: unit
        ref: "test/parser-keyword-statements.test.ts#FIELD verb (keyword-as-identifier cases)"
        status: pass
    human_judgment: false
  - id: D4
    description: "No new hover text, outline entry or validation is added; the verb produces no error-severity diagnostic (D-07)"
    verification:
      - kind: unit
        ref: "test/parser-keyword-statements.test.ts#FIELD verb (validation case)"
        status: pass
    human_judgment: false
  - id: D5
    description: "Conformance measurement: this group's contribution to the phase's A/A2/B gates"
    verification:
      - kind: manual_procedural
        ref: "node /home/coder/repos/bbj-corpus/conformance/run.mjs --ls <this repo>"
        status: pass
    human_judgment: true
    rationale: "The private corpus harness runs outside CI by design (D-15); its A <= 80 final gate is evaluated at the phase level (plan 05), not per-plan. This run's own A2 side effect (22 -> 30, exceeding the phase's <=27 gate) is a genuine finding requiring an orchestrator decision (fix checkCommentNewLines or accept as residue), not a pass/fail this plan can resolve alone."

duration: 17min
completed: 2026-09-21
status: complete
---

# Phase 99 Plan 02: FIELD verb Summary

**Added a `FieldStatement` grammar rule (record, name, value as plain expressions) so `FIELD` used as a verb parses — clearing the phase's single largest list-A group (45 files, now 0) — while the class-member `FieldDecl` stays byte-for-byte untouched; conformance measurement surfaced an 8-file A2 side effect traced to a pre-existing validator check unmasked by the fix, handed to the orchestrator with root-mechanism evidence rather than fixed in this plan.**

## Performance

- **Duration:** 17 min
- **Started:** 2026-09-21T10:22:01Z (approx, first probe run)
- **Completed:** 2026-09-21T10:39:35Z
- **Tasks:** 3
- **Files modified:** 4 (1 grammar rule addition, 1 new test fixture, 1 test-file addition, 1 measurement record)

## Accomplishments

- `bbj-vscode/src/language/bbj.langium` gains a new `SingleStatement` alternative:
  `FieldStatement: 'FIELD' record=Expression ',' name=AdditiveExpr '=' value=Expression`,
  registered alphabetically-adjacent to `TableStatement` (the same "no prior alternative claims
  this keyword's verb form" defect shape). The name part is deliberately typed at the `AdditiveExpr`
  level — one level below the relational expression that would otherwise consume the statement's
  own `=` as a comparison operator — per the Orchestrator Addendum's correction to the research's
  originally-recommended full-`Expression` shape.
- Probed before and after the grammar edit and the regeneration (Node 22): every target shape —
  three name-part shapes (string variable, spaced string literal, masked `str(...)` concatenation),
  four value-part shapes (nested call, negative number, `num()`, method-call result), the verb
  inside a method body, and all three letter cases — now parses as a single `FieldStatement` node
  with zero lexer/parser errors. The class-member `FieldDecl` form (with and without a type) and
  every keyword-as-identifier probe (`field=5`, `x=field+1`, `field(1)`, `field.x`, `myfield=1`,
  `fieldname$="a"`, `nfield(1)=2`, `for i=1 to nfield`, `if myfield then x=1`) stayed byte-for-byte
  unchanged — 0 parser errors before and after for every one of them, including the two
  identifier-as-risk cases the plan flagged (`field(1)`, `field.x`), which needed no alternation
  reordering or `record`-part narrowing.
- The generator's ambiguity-warning output is byte-identical before and after the edit (verified
  by regenerating against the pre-edit grammar via `git show HEAD:...` and diffing the two runs) —
  no new Chevrotain ambiguity was introduced.
- Confirmed by probe that no `lineBreakMap` edit was needed: a label-chained `FieldStatement`
  (`lbl:field rec$,name$=dec(x$)`) and two semicolon-chained `FieldStatement`s both produce zero
  error-severity diagnostics, via the existing generic `isLabelDecl`/`isCompoundStatement`
  exemptions in `isStandaloneStatement` — no code change to `line-break-validation.ts`.
- New fixture `field-verb.bbj` and a new "FIELD verb" describe block in
  `parser-keyword-statements.test.ts` (reusing plan 01's single services instance/`beforeAll`) pin
  every positive shape, both still-flagged cases (no-value verb, no-type class member), all nine
  keyword-as-identifier cases, an AST-shape assertion through the generated `isFieldStatement`
  guard, and a validation case confirming zero error-severity diagnostics.
- Conformance harness run: A 128→84 (−44, the whole `FIELD` first-word group cleared from list A).
  A2 22→30 (+8) — this run has the phase's first real before/after per-file set diff (the
  `snapshots/` location survives the harness's own `work/` wipe), and it traces the entire +8
  cleanly to one message group ("Comments need to be separated by line breaks or `;`."). Reading
  `bbj-validator.ts`'s `checkCommentNewLines` (this repository's own source, not corpus source)
  shows it returns immediately whenever `document.parseResult.parserErrors.length > 0` — these 8
  files previously had the `FIELD` parser error masking this pre-existing check entirely; now that
  `FieldStatement` parses them cleanly, the check runs for the first time and flags a comment not
  immediately preceded by a line break or `;`. B stayed unchanged at 665 (0 movement, confirmed by
  the same exact per-file diff).

## Task Commits

1. **Task 1: The FIELD verb parses — probe, one new rule, regenerate, probe again** — `7bb7e12e` (fix)
2. **Task 2: Fixture and permanent tests for the verb, the declaration and the identifier cases** — `1c7a8a03` (test)
3. **Task 3: Measure the group and append to the phase's conformance record** — `4d0be07e` (docs)

**Plan metadata:** committed alongside this SUMMARY.

## Files Created/Modified

- `bbj-vscode/src/language/bbj.langium` — new `FieldStatement` rule, registered in `SingleStatement`
- `bbj-vscode/test/test-data/conformance/field-verb.bbj` — new conformance fixture: name-part and value-part shapes, upper/lower/mixed case, a label-chained verb, and a class-member `FIELD` declaration with a type
- `bbj-vscode/test/parser-keyword-statements.test.ts` — new "FIELD verb" describe block (positive cases, AST-shape assertion, both still-flagged cases, nine keyword-as-identifier cases, one validation case)
- `.planning/phases/99-parser-gaps-the-largest-groups/99-CONFORMANCE.md` — new "Run: plan 02" section with totals, deltas, per-group counts, the phase's first real per-file set-movement diff, and the A2 root-mechanism finding

## Decisions Made

- **Name-part expression level (Orchestrator Addendum item 1).** `name=AdditiveExpr`, not `name=Expression` — confirmed necessary and sufficient by probe; no further narrowing was needed for any name-part shape tried, including the `"PRE_"+str(n:"00")` concatenation with a masked colon inside it.
- **No alternation reordering or `record`-part narrowing needed for `field(1)`/`field.x`.** Both stayed 0 parser errors before and after — the plan's flagged risk did not materialize; Chevrotain's default lookahead already discriminates on the presence of a top-level `,` after the `record` expression.
- **D-17 still-flagged case: `field rec$,name$` (no value).** 1 parser error, unchanged before/after. The class-member-without-a-type case (`FIELD PUBLIC x`) was also confirmed still-flagged (pre-existing, unaffected by this plan's grammar edit) as the second required D-09 case.
- **A2 increase (22→30) traced to a pre-existing validator, not this plan's grammar change.** See Deviations below.

## Deviations from Plan

None — plan executed exactly as written; every task's acceptance criteria and `<verify>` command passed. The A2 measurement finding below is a conformance-harness result, not a deviation from how this plan's tasks were executed.

## Issues Encountered

- **Conformance harness Run: plan 02 found an 8-file A2 regression (22→30), exceeding the phase's ≤27 gate.** Root mechanism traced (via reading this repository's own `bbj-validator.ts`, not corpus source) to `checkCommentNewLines`, a pre-existing check that returns immediately whenever a document has any parser error. These 8 files previously had the `FIELD` parser error masking this check entirely; now that `FieldStatement` parses them, the check runs for the first time and flags a comment not immediately preceded by a line break or `;`. This is unmasked residue, structurally the same pattern documented in Phase 98's decision log (a fix that closes one gate reveals a pre-existing check behind it), not a defect this plan's grammar rule introduced directly. Per the plan's Orchestrator Addendum ("Measurement duties are orchestrator-side... any per-file look at a moved file is done by the orchestrator between plans") and this plan's own `files_modified` scope (which does not include `bbj-validator.ts`), no fix was attempted in this plan. Recorded in `99-CONFORMANCE.md`'s "Run: plan 02" section with the exact set-movement count (8, all in one message group, 0 elsewhere) for the orchestrator's decision: fix `checkCommentNewLines`, or accept as recorded residue against the phase's A2 gate (mirroring how Phase 98 accepted its own B regression as documented residue).

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- `parser-keyword-statements.test.ts` is ready for plans 03-04 to add their own describe blocks (one shared services instance, one top-level `beforeAll`, unchanged from plan 01's convention).
- `99-CONFORMANCE.md` carries plans 01 and 02's run sections; plan 03 (`label` as a name) appends its own, and plan 05 evaluates the phase-final A ≤ 80 gate.
- **Orchestrator decision needed before phase close:** the A2 regression above (22→30, gate ≤27) needs either a `checkCommentNewLines` fix (out of this plan's scope) or an explicit accepted-override, the same way Phase 98 closed with two accepted overrides. Plan 03's own measurement run will show whether this A2 number holds, grows further, or is joined by additional residue from the `label` fix.
- No blocker for plan 03 (`label` as a name) starting — this plan's grammar edit and fixture are independent of the `LabelName`/`FeatureName` mechanism plan 03 will add.

---
*Phase: 99-parser-gaps-the-largest-groups*
*Completed: 2026-09-21*

## Self-Check: PASSED

All 4 key files confirmed present on disk (`bbj.langium`, `field-verb.bbj`,
`parser-keyword-statements.test.ts`, `99-CONFORMANCE.md`). All 3 task commit hashes (`7bb7e12e`,
`1c7a8a03`, `4d0be07e`) confirmed present in `git log`.
