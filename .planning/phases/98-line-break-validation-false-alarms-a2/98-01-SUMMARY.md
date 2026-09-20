---
phase: 98-line-break-validation-false-alarms-a2
plan: 01
subsystem: parser/validation
tags: [langium, chevrotain, bbj, lexer, grammar, line-break-validation, vitest]

# Dependency graph
requires: []
provides:
  - "TABLE modelled as its own grammar rule with an opaque rest-of-line data terminal, so it no longer falls back to a bare ExpressionStatement"
  - "conformance-regressions.test.ts — the CONF-01 stricter parse+validate-clean harness, and the test-data/conformance/ fixture convention every later plan in this phase drops a file into"
affects: [98-02, 98-03, 98-04, 98-05, 98-06]

actuals:
  tokens: 2452
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "Opaque rest-of-line lexer token gated by a lookbehind (requires the triggering keyword + whitespace immediately before) plus a negative lookahead (rejects an immediately following operator/bracket char) — keeps the keyword's existing identifier usage intact while giving it new statement-leading meaning."
    - "conformance-regressions.test.ts: a sibling test file (not a nested loop inside example-files.test.ts) asserting zero lexer/parser errors AND zero error-severity diagnostics (linking excluded via DocumentValidator.LinkingError) over a dedicated, non-recursively-disjoint fixture subfolder."

key-files:
  created:
    - bbj-vscode/test/conformance-regressions.test.ts
    - bbj-vscode/test/test-data/conformance/table-statement.bbj
  modified:
    - bbj-vscode/src/language/bbj.langium
    - bbj-vscode/src/language/bbj-token-builder.ts
    - bbj-vscode/test/line-break-validation.test.ts

key-decisions:
  - "Final TABLE_DATA pattern: `/(?<=TABLE[ \\t]+)(?![=<>+\\-*\\/,)\\]])[^\\r\\n;]+/i` — the plan's starting hypothesis worked unchanged, no narrowing needed after probing."
  - "TableStatement grammar rule placed next to SavePStatement (the nearest keyword-plus-argument sibling) and registered in SingleStatement between SwitchCase and ThrowStatement, per the plan's explicit alternation slot."
  - "No embedded LabelDecl in the TableStatement rule itself — a leading label already works for free via the existing generic mechanism (isStandaloneStatement treats any statement immediately following a LabelDecl as non-standalone), confirmed by probe."

requirements-completed: [CONF-01, VALID-01]

coverage:
  - id: D1
    description: "A TABLE statement in every named variant (with/without leading label, short/long unspaced data, spaced/mixed-spacing data, upper/lower/mixed-case keyword, trailing ;rem comment) produces zero line-break diagnostics"
    requirement: VALID-01
    verification:
      - kind: unit
        ref: "test/line-break-validation.test.ts#Line break validation: TABLE statement"
        status: pass
      - kind: unit
        ref: "test/conformance-regressions.test.ts#Every fixture in \"test-data/conformance\" parses and validates clean"
        status: pass
    human_judgment: false
  - id: D2
    description: "`table` still works as an ordinary identifier (`table = 5`, `x = table`, `table$ = \"a\"`) exactly as before"
    verification:
      - kind: other
        ref: "scratch probe (deleted before commit, per convention) — table = 5, x = table, table$ = \"a\" each parse as LetStatement with zero lexer/parser errors and zero error-severity diagnostics"
        status: pass
    human_judgment: false
  - id: D3
    description: "The conformance harness cannot silently pass while empty, is order-independent, and never double-asserts a flat fixture"
    requirement: CONF-01
    verification:
      - kind: unit
        ref: "test/conformance-regressions.test.ts#conformance folder is non-empty"
        status: pass
      - kind: unit
        ref: "test/conformance-regressions.test.ts#conformance file list is order-independent"
        status: pass
      - kind: unit
        ref: "test/conformance-regressions.test.ts#conformance fixtures are disjoint from the flat \"test-data\" fixture folder"
        status: pass
    human_judgment: false
  - id: D4
    description: "A TABLE statement that does not start on a new line is still reported (the rule keeps its teeth)"
    verification:
      - kind: unit
        ref: "test/line-break-validation.test.ts#two statements on one line with no separator between them is still flagged"
        status: pass
    human_judgment: false

duration: 12min
completed: 2026-09-20
status: complete
---

# Phase 98 Plan 01: TABLE Opaque-Rest-of-Line Statement + Conformance Harness Summary

**New `TableStatement` grammar rule and `TABLE_DATA` lexer terminal eliminate the false "needs a line break" diagnostic on TABLE statements, proven by a new `conformance-regressions.test.ts` harness (CONF-01) that every later plan in this phase reuses.**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-09-20T21:19:00Z (approx.)
- **Completed:** 2026-09-20T21:31:00Z (approx.)
- **Tasks:** 3
- **Files modified:** 5 (2 created, 3 modified)

## Accomplishments
- `TABLE` now has its own grammar rule (`TableStatement: 'TABLE' data=TABLE_DATA;`), registered in the `SingleStatement` alternation, backed by a new `TABLE_DATA` lexer terminal built as an opaque rest-of-line token in `BBjTokenBuilder.buildTerminalToken` and spliced to front priority in `reorderTokenPriorities` — the keyword no longer falls back to a bare `ExpressionStatement` whose hex data became spurious extra sibling statements.
- `table` keeps working as an ordinary identifier (`table = 5`, `x = table`, `table$ = "a"`) — the `TABLE_DATA` pattern's negative lookahead rejects a following operator/bracket char, so the parser's own lookahead falls back to `ExpressionStatement` exactly as before in those positions.
- Stood up `bbj-vscode/test/conformance-regressions.test.ts` and the `bbj-vscode/test/test-data/conformance/` fixture folder — the CONF-01 convention (zero lexer/parser errors AND zero error-severity validation diagnostics, linking excluded) every later plan in this phase (and Phases 99/100) inherits.
- Expanded the fixture and `line-break-validation.test.ts` to cover every TABLE variant CONTEXT.md names (10 variants: with/without leading label, short/long unspaced data, spaced/mixed-spacing data, upper/lower/mixed-case keyword, trailing `;rem`), plus a still-flagged negative case (`a = 1 table 00ff` — two statements on one line, no separator) proving the generic line-break rule still has teeth.
- Hardened the harness against three ways it could silently stop protecting: an explicit empty-folder guard, an order-independence check, and a disjointness check proving no fixture name is asserted under both the flat `test-data` rule and the stricter conformance rule.

## Task Commits

Each task was committed atomically:

1. **Task 1: End-to-end "a TABLE line validates clean" — one path only** - `21c7ab5f` (feat)
2. **Task 2: Cover every TABLE variant and keep the still-flagged case flagged** - `7579bdd9` (test)
3. **Task 3: Harden the conformance harness against the ways it could silently stop protecting** - `81e1f376` (test)

_No plan-metadata commit yet — this SUMMARY and STATE/ROADMAP updates are committed separately per the sequential-executor protocol._

## Files Created/Modified
- `bbj-vscode/test/conformance-regressions.test.ts` - New CONF-01 harness: reads `test-data/conformance/*.bbj` sorted, asserts zero lexer/parser errors and zero error-severity diagnostics (linking excluded), plus three guard tests (non-empty, order-independent, disjoint from the flat fixture folder).
- `bbj-vscode/test/test-data/conformance/table-statement.bbj` - New fixture, 10 hand-written TABLE variants plus a leading `REM` behaviour statement.
- `bbj-vscode/src/language/bbj.langium` - New `terminal TABLE_DATA: /_table_data/;` placeholder and `TableStatement: 'TABLE' data=TABLE_DATA;` rule, registered in `SingleStatement` between `SwitchCase` and `ThrowStatement`.
- `bbj-vscode/src/language/bbj-token-builder.ts` - New `TABLE_DATA` branch in `buildTerminalToken` (real pattern, `LINE_BREAKS: false`) and a `this.spliceToken(tokens, 'TABLE_DATA')` call in `reorderTokenPriorities`.
- `bbj-vscode/test/line-break-validation.test.ts` - New `describe('Line break validation: TABLE statement', ...)` block: 10 positive cases (`test.each`) plus the still-flagged negative case.

## Decisions Made
- The plan's starting `TABLE_DATA` pattern hypothesis (lookbehind for `TABLE`+whitespace, negative lookahead rejecting `=<>+-*/,)]`, body excluding CR/LF/`;`) worked exactly as proposed — verified via the Pattern-1 probe technique (scratch vitest file, deleted before committing) against `TABLE ff00aa11`, `L1: TABLE ff00aa11`, spaced/mixed/upper/lower/mixed-case variants, a trailing `;rem`, `table = 5`, `x = table`, `table$ = "a"`, and the still-flagged `a = 1 table 00ff`. No narrowing was needed.
- `TableStatement`'s grammar rule carries no embedded `LabelDecl` (unlike `SwitchCase`'s `LabelDecl? 'CASE' ...` shape) — a leading label already works via the existing generic mechanism (`isStandaloneStatement` in `line-break-validation.ts` treats any statement immediately following a `LabelDecl` as non-standalone, so no surrounding line break is demanded between the label and the TABLE statement on the same physical line). Confirmed clean via probe (`L1: TABLE ff00aa11` → `[LabelDecl, TableStatement]`, zero diagnostics).
- No TABLE data shape tried in this plan (short/long, spaced/unspaced/mixed, any case, with/without label, trailing `;rem`) failed to parse or validate clean — nothing to hand off to the residue triage in a later plan.

## Deviations from Plan

None - plan executed exactly as written. The one register-check slip (a code comment in `bbj-token-builder.ts` referencing `D-01/D-03`) was caught and fixed before staging, not left as a deviation to fix later — see `## Issues Encountered`.

## Issues Encountered
- A first draft of the `TABLE_DATA` code comment in `bbj-token-builder.ts` referenced decision IDs (`D-01/D-03`) from the phase context, which the register check (`git diff | grep -E 'D-[0-9]{2}|...'`) correctly flagged before staging. Reworded the comment to describe the behavior without citing planning IDs; re-ran the register check clean and re-verified the test still passed before committing.
- The whole-suite run (`npx vitest run --maxWorkers=2`) reported 6 "Failed Suites" (`hover.test.ts`, `line-break-validation.test.ts`, `run-call-navigation.test.ts`, `setopts-in-code-request.test.ts`, `chevrotain-tokens.test.ts`, `installed-extension-e2e.test.ts`), all `beforeAll` hook timeouts under contention (one is a pre-existing "No document found" e2e/environment failure) — `numFailedTests: 0` (1869 passed, 94 skipped, 0 failed). This matches the documented whole-suite gate substitution standing decision; not a regression from this plan's changes. The targeted blast-radius run (`conformance-regressions`, `line-break-validation`, `line-break-walk-termination`, `example-files`, `parser`, `lexer`) passed clean at 265 passed / 1 skipped with no failed suites.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- The conformance harness and `test-data/conformance/` convention are live and proven end-to-end; plans 02-06 in this phase (RESTORE/GOSUB-GOTO/EXIT/LOAD, single-line IF/FI, DECLARE/METHODRET, residue triage) can each drop their own fixture into the folder and extend `conformance-regressions.test.ts`'s coverage automatically (the loop is generic over the folder contents).
- No blockers for the next plan. `table` as an ordinary identifier remains untouched in every position it worked before.

---
*Phase: 98-line-break-validation-false-alarms-a2*
*Completed: 2026-09-20*

## Self-Check: PASSED

- FOUND: bbj-vscode/test/conformance-regressions.test.ts
- FOUND: bbj-vscode/test/test-data/conformance/table-statement.bbj
- FOUND: bbj-vscode/src/language/bbj.langium
- FOUND: bbj-vscode/src/language/bbj-token-builder.ts
- FOUND: bbj-vscode/test/line-break-validation.test.ts
- FOUND commit: 21c7ab5f (feat(98-01): model TABLE as an opaque rest-of-line statement)
- FOUND commit: 7579bdd9 (test(98-01): cover every TABLE variant and keep a still-flagged case)
- FOUND commit: 81e1f376 (test(98-01): harden the conformance harness against silent gaps)
- Re-ran plan `<verification>` block 1 (blast-radius set): 265 passed / 1 skipped, no failures.
- Re-ran plan `<verification>` block 2 (whole suite, `--maxWorkers=2`): `numFailedTests: 0` (1869 passed, 94 skipped) — 6 failed suites are pre-existing `beforeAll` hook timeouts under contention, per the whole-suite gate substitution standing decision.
- Re-ran plan `<verification>` block 3: `git status --porcelain` shows no stray scratch probe file and nothing under `bbj-vscode/src/language/generated/`.
