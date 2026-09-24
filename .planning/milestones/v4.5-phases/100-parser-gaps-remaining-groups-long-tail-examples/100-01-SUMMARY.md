---
phase: 100-parser-gaps-remaining-groups-long-tail-examples
plan: 01
subsystem: parser
tags: [langium, grammar, bbj, chevrotain, array, brackets]

requires:
  - phase: 99-parser-gaps-the-largest-groups
    provides: the array-element, VariableDecl/FieldDecl/MethodDecl/ParameterDecl grammar shapes this plan widens, and the CAST-style repeatable bracket-pair precedent this plan reuses
provides:
  - "Empty array brackets (`x[]`) parse wherever an array element can stand and produce the same whole-array node `x[all]` produces"
  - "Repeatable bracket-pair declarations (`declare int[][] name!`) on DECLARE, FIELD, a method's return type and a parameter"
  - "A post-name whole-array marker on a parameter (`BBjArray dat[all]` and bare `BBjArray dat[]`)"
  - "array-bracket-forms.bbj conformance fixture and a permanent parser-keyword-statements.test.ts describe-block pair covering this group"
  - "100-CONFORMANCE.md opened with the phase's baselines and this group's first measurement"
affects: [100-02, 100-03, 100-04, 100-05, 100-06]

actuals:
  tokens: 4988
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "Each bracket alternative closes with its own trailing bracket, and a bare closing bracket itself is the token that sets the whole-array marker true -- the same 'boolean assigned from a keyword' shape the declaration rules in this grammar already use, extended to a bracket token"
    - "Repeatable bracket-pair count (arrayDims+='[' ']')* replaces a single optional boolean flag, mirroring the already-shipped CastExpression pattern, at all four declaration/parameter/return-type sites"

key-files:
  created:
    - bbj-vscode/test/test-data/conformance/array-bracket-forms.bbj
    - .planning/phases/100-parser-gaps-remaining-groups-long-tail-examples/100-CONFORMANCE.md
  modified:
    - bbj-vscode/src/language/bbj.langium
    - bbj-vscode/src/language/validations/check-classes.ts
    - bbj-vscode/test/parser-keyword-statements.test.ts

key-decisions:
  - "The empty-bracket alternative that satisfies D-03 (same node, all=true) is: each of the three ArrayElement bracket alternatives closes with its own trailing bracket, and the third alternative -- no ALL literal, no index list -- assigns the whole-array marker directly from the closing bracket token (all?=']'). Confirmed by probe both before and after: all three shapes (ALL, indices, empty) parse, and the empty case produces all=true with an empty index list, matching x[all] exactly."
  - "The naive 'make ALL itself optional' candidate (all?='ALL'?) was not used -- it would leave `all` unset for the empty case, silently violating D-03 even though parsing succeeds. Not committed, only reasoned through before picking the three-alternative shape."
  - "The VariableDecl/MethodDecl AST interfaces' single boolean array?: boolean property is renamed to arrayDims: string[] (a repeatable pair count), applied at all four declaration sites (DECLARE, FIELD, a method's return type, and ParameterDecl) plus the three check-classes.ts truthy reads, which become pair-count checks."
  - "The compiler accepts BOTH a parameter's post-name whole-array marker with the ALL word (BBjArray dat[all]) and the bare form (BBjArray dat[]) -- confirmed directly against bbjcpl (both compiled with zero errors, cross-checked against a deliberately malformed sibling that bbjcpl did reject). Both spellings are therefore supported: ('[' 'ALL'? ']')? after the parameter's name, with no AST property captured for it (nothing downstream reads it)."
  - "The generator's ambiguity-warning output is identical before and after both grammar edits in this plan -- the only line present in every run is the pre-existing, unrelated 'Program rule potentially consumes no input' warning."

patterns-established:
  - "Bracket-closes-per-alternative shape for widening an optional-keyword-or-list grammar rule to also accept an empty form while still setting the same boolean marker"

requirements-completed: []

coverage:
  - id: D1
    description: "Empty array brackets parse at all eleven call sites (DREAD target, PRINT item, PRINT item mixed with a literal, PRINT list mixing an indexed and a whole-array item, assignment target, CALL argument, XCALL argument, method-call argument, function-call argument with and without a trailing error option, nested interop copy call), every suffix, every case, and produce the whole-array node"
    requirement: PARSE-04
    verification:
      - kind: unit
        ref: "bbj-vscode/test/parser-keyword-statements.test.ts#empty array brackets meaning the whole array"
        status: pass
      - kind: integration
        ref: "bbj-vscode/test/conformance-regressions.test.ts#Every fixture in test-data/conformance parses and validates clean"
        status: pass
    human_judgment: false
  - id: D2
    description: "More than one bracket pair parses on DECLARE, FIELD, a method's return type and a parameter; a no-pair declaration still records zero pairs; the class around a two-pair field/method survives intact"
    requirement: PARSE-05
    verification:
      - kind: unit
        ref: "bbj-vscode/test/parser-keyword-statements.test.ts#type-side bracket shapes"
        status: pass
    human_judgment: false
  - id: D3
    description: "A parameter carries the whole-array marker after its own name, in both an ALL-worded and a bare spelling, in upper and lower case"
    requirement: PARSE-05
    verification:
      - kind: unit
        ref: "bbj-vscode/test/parser-keyword-statements.test.ts#type-side bracket shapes"
        status: pass
    human_judgment: false
  - id: D4
    description: "The three check-classes.ts array-boolean reads follow the pair-count rename with no other repository site reading the old property; the private conformance harness ran once against the finished tree with a snapshot taken first"
    verification:
      - kind: other
        ref: "git grep -n arrayDims -- bbj-vscode/src/language/validations/check-classes.ts (3 matches); node /home/coder/repos/bbj-corpus/conformance/run.mjs --ls (falseRejects 21, below the 52 baseline)"
        status: pass
    human_judgment: false

duration: 21min
completed: 2026-09-21
status: complete
---

# Phase 100 Plan 01: Empty Array Brackets and Type-Side Bracket Shapes Summary

**Empty array brackets (`x[]`) now mean the whole array at every one of eleven call sites, and DECLARE/FIELD/a method's return type/a parameter accept more than one bracket pair, closing the phase's largest list-A group with a −31 file improvement already past the phase-final gate.**

## Performance

- **Duration:** 21 min
- **Started:** 2026-09-21T19:58:00Z (approx, first probe run)
- **Completed:** 2026-09-21T20:19:17Z
- **Tasks:** 3
- **Files modified:** 5

## Accomplishments

- The `ArrayElement` postfix rule in `bbj.langium` widened so an immediately-closing bracket pair (`x[]`) parses at every call site that reaches it — `PRINT` item, `DREAD` target, assignment target, `CALL`/`XCALL` argument, method-call argument, function-call argument (with and without a trailing `err=` option), and the nested `bbjapi().copy()` interop call — in every suffix (`!`, `$`, `%`, none) and every case, producing the exact same whole-array node (`all=true`, empty index list) that `x[all]` already produces.
- `DECLARE`, `FIELD`, a method's return type and `ParameterDecl` all replaced their single optional bracket-pair flag with a repeatable pair count (`arrayDims+='[' ']'`), mirroring the already-shipped `CastExpression` pattern; a class carrying a two-pair field or method return type now parses intact instead of disintegrating into loose expression statements.
- A parameter accepts a whole-array marker written after its own name — `BBjArray dat[all]` and the bare `BBjArray dat[]` — both confirmed accepted by the real `bbjcpl` compiler.
- `check-classes.ts`'s three boolean `array`/`meth.array`/`field.array` reads became `arrayDims.length > 0` pair-count reads; no other file in the repository read the old property.
- The whole group is pinned under two new permanent `describe` blocks in `parser-keyword-statements.test.ts` and the extended `array-bracket-forms.bbj` conformance fixture — both still-flagged cases (`print x[`, `print x[,]`) and the four keyword-as-identifier cases stay clean/rejected exactly as before.
- `100-CONFORMANCE.md` opened with the phase's baselines (A 52, A2 23, B 666) and this group's first measurement: A 52 → 21 (−31), A2 23 → 24 (+1), B 666 → 669 (+3).

## Task Commits

Each task was committed atomically:

1. **Task 1: End-to-end "an empty bracket pair means the whole array"** - `268badfb` (feat)
2. **Task 2: The type-side bracket shapes, their downstream reads, and the group's permanent tests** - `eabd6c4d` (feat)
3. **Task 3: Measure the group and open the phase's conformance record** - `332e9e33` (docs)

_Phase base commit (taken before this plan's first commit): `9cc8bffe7bc9079df86ec1ea6d5897b038b7c98a`._

## Files Created/Modified
- `bbj-vscode/src/language/bbj.langium` - Widened `ArrayElement`'s bracket alternative to accept an empty form that sets the whole-array marker; replaced the single-pair bracket flag with a repeatable pair count on `VariableDecl`/`FieldDecl`/`MethodDeclStart`/`ParameterDecl`; added a post-name whole-array marker to `ParameterDecl`; updated the `VariableDecl`/`MethodDecl` AST interfaces
- `bbj-vscode/src/language/validations/check-classes.ts` - Three boolean `array` reads renamed to `arrayDims.length > 0` pair-count reads
- `bbj-vscode/test/test-data/conformance/array-bracket-forms.bbj` - New conformance fixture covering every empty-bracket call site and every type-side bracket shape
- `bbj-vscode/test/parser-keyword-statements.test.ts` - Two new permanent `describe` blocks (`empty array brackets meaning the whole array`, `type-side bracket shapes`) with positive, AST-shape, still-flagged and identifier-as-keyword cases
- `.planning/phases/100-parser-gaps-remaining-groups-long-tail-examples/100-CONFORMANCE.md` - New: phase baselines and this group's first measurement, opened per D-26/D-27

## Decisions Made

- **Empty-bracket grammar shape (D-02/D-03):** each of the three `ArrayElement` bracket alternatives closes its own trailing bracket; the third (`all?="]"`) assigns the whole-array marker directly from the closing-bracket token when neither `ALL` nor an index list is present. Confirmed by probe: `all=true`, empty `indices`, identical to `x[all]`.
- **Rejected candidate:** `all?='ALL'?` (making the `ALL` literal itself optional) was reasoned through but not used — it parses cleanly but leaves `all` unset for the empty case, silently failing D-03's "same node" requirement.
- **Type-side bracket rename (D-04):** `array?: boolean` → `arrayDims: string[]` on `VariableDecl`/`MethodDecl`, applied uniformly at all four sites and their three downstream reads.
- **Parameter marker spelling (Task 2, step 1):** both `BBjArray dat[all]` and bare `BBjArray dat[]` compile with `/opt/bbx/bin/bbjcpl -N` (verified via `spawnSync`, stdout+stderr concatenated, cross-checked against a deliberately malformed sibling file that `bbjcpl` did reject with `error at line …` on stderr — confirming the harness itself catches real errors, not just always-empty output). Both spellings are therefore supported at the grammar level; no AST property is captured for the marker since nothing downstream reads it.
- **Ambiguity-warning comparison:** identical before and after both grammar edits — the only line printed by `npm run langium:generate` in every run (baseline, post-Task-1, post-Task-2) is the pre-existing, unrelated `src/language/bbj.langium:15:1 - This parser rule potentially consumes no input.` warning on the `Program` rule.
- **Identifier-case counts (D-25):** the pre-edit and post-edit probe both reported zero parser errors across `myall=1`, `allx$="a"`, `x=all2+1`, `for i=1 to nall` — no regression.

## Deviations from Plan

None — plan executed exactly as written. The task's own instruction to fall back to the "plain-optional" candidate and stop-and-report if the three-alternative shape failed to set `all=true` was not needed: the three-alternative shape worked on the first probe.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `array-bracket-forms.bbj` and the two `parser-keyword-statements.test.ts` describe blocks are in place for plans 02-04 to extend with their own construct groups, per the phase's artifact table.
- `100-CONFORMANCE.md` is open; plans 02-04 append their own "Run: plan NN" sections, and plan 06 closes it with the final gate table.
- **4 files moved the wrong way this run** (1 newly entered A2 — a false alarm on `x[all]`-adjacent code; 3 newly entered B's missed set) — handed to the orchestrator for the per-file look; no cause recorded in this plan's own artifacts.
- `PARSE-04`/`PARSE-05` are NOT marked complete in `REQUIREMENTS.md` — both are also declared by `100-06`, the phase's closing plan, and five more plans in this phase remain open (project-specific requirement #6).

---
*Phase: 100-parser-gaps-remaining-groups-long-tail-examples*
*Completed: 2026-09-21*

## Self-Check: PASSED

All five key files confirmed present on disk (`bbj-vscode/test/test-data/conformance/array-bracket-forms.bbj`, `.planning/phases/100-parser-gaps-remaining-groups-long-tail-examples/100-CONFORMANCE.md`, `bbj-vscode/src/language/bbj.langium`, `bbj-vscode/src/language/validations/check-classes.ts`, `bbj-vscode/test/parser-keyword-statements.test.ts`). All three task commit hashes (`268badfb`, `eabd6c4d`, `332e9e33`) confirmed present in `git log --oneline --all`.
