---
phase: 98-line-break-validation-false-alarms-a2
plan: 02
subsystem: parser/validation
tags: [langium, chevrotain, bbj, lexer, grammar, line-break-validation, vitest]

# Dependency graph
requires:
  - phase: 98-01
    provides: "conformance-regressions.test.ts harness and the test-data/conformance/ fixture convention"
provides:
  - "RestoreStatement widened to a numeric line reference via a new RESTORE_NO_NL lexer token, so RESTORE 0 and a bare RESTORE both parse correctly regardless of what follows"
  - "New LoadStatement grammar rule modelled on SaveStatement"
  - "EXIT_NO_NL lookahead widened to admit an identifier operand, excluding the words that may legally follow a bare EXIT"
  - "BRANCH_TARGET_EXCLUSION lookbehind on the six NL-sensitive custom tokens, so a language word can be a GOTO/GOSUB/ON...GOSUB target"
  - "Three conformance fixtures (restore-numeric.bbj, keyword-branch-targets.bbj, exit-load-save.bbj) and their line-break-validation.test.ts coverage"
affects: [98-03, 98-04, 98-05, 98-06]

actuals:
  tokens: 4973
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "Lexer-level disambiguation for 'keyword with an optional operand': a dedicated NL-sensitive token (RESTORE_NO_NL, mirroring EXIT_NO_NL) matches the keyword only when an operand actually follows, leaving the bare form to the plain keyword token — avoids the grammar-level optional-plus-alternation shape that creates a genuine parser ambiguity against whatever statement follows on the next line."
    - "Bounded-lookbehind branch-target exclusion: BRANCH_TARGET_EXCLUSION suppresses a custom NL-sensitive token right after GOTO/GOSUB (1-8 spaces/tabs) and through a bounded run of prior comma-separated targets (up to 16, each up to 64 identifier chars), so the last item of a multi-target ON...GOSUB list resolves too — every quantifier stays bounded per the DoS mitigation in this plan's threat model."

key-files:
  created:
    - bbj-vscode/test/test-data/conformance/restore-numeric.bbj
    - bbj-vscode/test/test-data/conformance/keyword-branch-targets.bbj
    - bbj-vscode/test/test-data/conformance/exit-load-save.bbj
  modified:
    - bbj-vscode/src/language/bbj.langium
    - bbj-vscode/src/language/bbj-token-builder.ts
    - bbj-vscode/test/line-break-validation.test.ts

key-decisions:
  - "RestoreStatement's final shape is `RESTORE_NO_NL lineref=(LabelRef | NUMBER) | kind='RESTORE'` — NOT the originally-committed `'RESTORE' lineref=(LabelRef | NUMBER)?`. The plain-optional form parsed a bare RESTORE cleanly only when it was the very last statement in the document; followed by any other statement, Chevrotain misresolved the optional trailing cross-reference against the next statement's leading token and raised a genuine parser error. The NUMBER alternative itself was sufficient (no Expression widening needed) — RESTORE mylabel correctly produces a LabelRef, not a SymbolRef, in both the original and corrected shapes."
  - "LoadStatement's final shape is exactly SaveStatement's mirrored shape with no extra option: `'LOAD' fileid=Expression (',' int=Expression)?` — the Assumption A2 risk flagged in 98-RESEARCH.md (BBj's real LOAD verb might need an option SAVE doesn't) did not materialize; the probed shapes (`LOAD \"prog\"`, `LOAD \"prog\",1`) both parsed and validated clean with this shape."
  - "Branch-target exclusion mechanism: a single BRANCH_TARGET_EXCLUSION regex-string constant, applied via a negative lookbehind to KEYWORD_STANDALONE, PRINT_STANDALONE_NL, START_BREAK, FNEND, NEXT_BREAK and METHODRET_END. RELEASE_NL/RELEASE_NO_NL/EXIT_NO_NL needed no change — they already carry CATEGORIES:[id]."

requirements-completed: [VALID-02, CONF-01]

coverage:
  - id: D1
    description: "RESTORE with a numeric or label line reference, and a bare RESTORE (with or without another statement following it), all produce zero line-break diagnostics in upper/lower/mixed case"
    requirement: VALID-02
    verification:
      - kind: unit
        ref: "test/line-break-validation.test.ts#Line break validation: RESTORE with a numeric or label reference"
        status: pass
      - kind: unit
        ref: "test/conformance-regressions.test.ts#Every fixture in \"test-data/conformance\" parses and validates clean"
        status: pass
    human_judgment: false
  - id: D2
    description: "A GOTO/GOSUB/ON...GOSUB target named after a language word (print, save, read, input, find, extract, delete, enter, write) links to its label declaration and produces zero line-break diagnostics, including as the last item of a comma-separated ON...GOSUB list, in upper/lower/mixed case"
    requirement: VALID-02
    verification:
      - kind: unit
        ref: "test/line-break-validation.test.ts#Line break validation: keyword-named GOTO/GOSUB/ON...GOSUB targets"
        status: pass
      - kind: unit
        ref: "test/conformance-regressions.test.ts#Every fixture in \"test-data/conformance\" parses and validates clean"
        status: pass
    human_judgment: false
  - id: D3
    description: "EXIT with a bare identifier operand parses as one exit statement, and IF x THEN EXIT ELSE ... keeps EXIT bare so the ELSE branch stays intact"
    requirement: VALID-02
    verification:
      - kind: unit
        ref: "test/line-break-validation.test.ts#Line break validation: EXIT with an identifier operand"
        status: pass
      - kind: unit
        ref: "test/conformance-regressions.test.ts#Every fixture in \"test-data/conformance\" parses and validates clean"
        status: pass
    human_judgment: false
  - id: D4
    description: "LOAD with a string file id, with or without a second argument, parses as one statement of its own type"
    requirement: VALID-02
    verification:
      - kind: unit
        ref: "test/line-break-validation.test.ts#Line break validation: LOAD with a file id"
        status: pass
      - kind: unit
        ref: "test/conformance-regressions.test.ts#Every fixture in \"test-data/conformance\" parses and validates clean"
        status: pass
    human_judgment: false
  - id: D5
    description: "Three new conformance regression fixtures (restore-numeric.bbj, keyword-branch-targets.bbj, exit-load-save.bbj) protect these four construct groups under the CONF-01 stricter assertion, and every touched rule/token keeps at least one still-flagged negative case"
    requirement: CONF-01
    verification:
      - kind: unit
        ref: "test/conformance-regressions.test.ts#Every fixture in \"test-data/conformance\" parses and validates clean"
        status: pass
      - kind: unit
        ref: "test/line-break-validation.test.ts (four 'two statements on one line ... is still flagged' tests)"
        status: pass
    human_judgment: false

duration: 55min
completed: 2026-09-20
status: complete
---

# Phase 98 Plan 02: RESTORE/LOAD/EXIT/Keyword-Branch-Target Grammar and Lexer Fixes Summary

**Widened RestoreStatement (via a new RESTORE_NO_NL lexer token), a new LoadStatement grammar rule, a widened EXIT_NO_NL lookahead, and a bounded branch-target-exclusion lookbehind on six NL-sensitive tokens eliminate the false line-break diagnostics on `RESTORE n`, `LOAD`, `EXIT expr` and keyword-named `GOTO`/`GOSUB`/`ON...GOSUB` targets.**

## Performance

- **Duration:** ~55 min
- **Started:** 2026-09-20T22:12:00Z (approx.)
- **Completed:** 2026-09-20T22:29:08Z (approx.)
- **Tasks:** 3
- **Files modified:** 6 (3 created, 3 modified)

## Accomplishments
- `RestoreStatement` now accepts a numeric (`NUMBER`) or label (`LabelRef`) line reference, or no reference at all, via a new `RESTORE_NO_NL` lexer token that mirrors `EXIT_NO_NL`'s "only match the keyword when an operand actually follows" mechanism — `RESTORE 0`, `RESTORE mylabel` and a bare `RESTORE` each parse as exactly one `RestoreStatement`, in upper, lower and mixed case, regardless of what statement follows.
- New `LoadStatement` grammar rule (`'LOAD' fileid=Expression (',' int=Expression)?`), registered in the `SingleStatement` alternation between `LetStatement` and `LockStatement` — `LOAD "prog"` and `LOAD "prog",1` each parse as one statement of their own type.
- `EXIT_NO_NL`'s lookahead now also admits an identifier operand, guarded by a negative lookahead excluding the words that may legally follow a bare `EXIT` on the same line (`ELSE`, `FI`, `ENDIF`, `THEN`, `REM`) — `EXIT err` parses as one exit statement while `IF x THEN EXIT ELSE ...` still keeps `EXIT` bare and the `ELSE` branch intact.
- New `BRANCH_TARGET_EXCLUSION` lookbehind applied to `KEYWORD_STANDALONE`, `PRINT_STANDALONE_NL`, `START_BREAK`, `FNEND`, `NEXT_BREAK` and `METHODRET_END` — a label named `print`, `save`, `read`, `input`, `find`, `extract`, `delete`, `enter` or `write` now links correctly as a `GOTO`/`GOSUB`/`ON...GOSUB` target, including as the last item of a multi-target comma list, in upper, lower and mixed case.
- Three new conformance regression fixtures and matching `line-break-validation.test.ts` coverage (positive cases plus a still-flagged negative per touched rule/token) protect all four construct groups.

## Task Commits

Each task was committed atomically:

1. **Task 1: Give RESTORE a numeric line reference and LOAD a grammar rule of its own** - `701143c5` (feat)
2. **Task 2: Let EXIT take an expression and let a language word be a branch target** - `d1da4ac7` (feat)
3. **Task 3: Regression fixtures, still-flagged cases, and the register check** (includes the RESTORE_NO_NL deviation fix, see below) - `7b6f10aa` (test)

_No plan-metadata commit yet — this SUMMARY and STATE/ROADMAP updates are committed separately per the sequential-executor protocol._

## Files Created/Modified
- `bbj-vscode/src/language/bbj.langium` - Widened `RestoreStatement` to `RESTORE_NO_NL lineref=(LabelRef | NUMBER) | kind='RESTORE'`; new `LoadStatement` rule and its `SingleStatement` alternation entry; new `terminal RESTORE_NO_NL` placeholder declaration.
- `bbj-vscode/src/language/bbj-token-builder.ts` - Widened `EXIT_NO_NL` lookahead; new `RESTORE_NO_NL` terminal-token case (mirrors `EXIT_NO_NL`'s mechanism) plus its `reorderTokenPriorities` splice; new `BRANCH_TARGET_EXCLUSION` constant applied to six token patterns.
- `bbj-vscode/test/test-data/conformance/restore-numeric.bbj` - New fixture: numeric restore in three cases, a restore to a declared label, a bare restore, a restore sharing a line with a label.
- `bbj-vscode/test/test-data/conformance/keyword-branch-targets.bbj` - New fixture: nine keyword-named labels each reached by a `GOTO`/`GOSUB` in varying case, plus one `ON...GOSUB` list whose last target is a keyword-named label.
- `bbj-vscode/test/test-data/conformance/exit-load-save.bbj` - New fixture: `EXIT` with numeric and identifier operands, bare `EXIT`, `LOAD` with one and two arguments, bare `SAVE`, `SAVE` with a file id, each in at least two of upper/lower/mixed case.
- `bbj-vscode/test/line-break-validation.test.ts` - Four new `describe` blocks (RESTORE, LOAD, EXIT, keyword-branch-targets) with positive cases plus a still-flagged negative each; consolidated all six `describe` blocks in the file onto one shared `services`/`validate` instance with a single top-level `beforeAll` (see Deviations).

## Decisions Made
- `RestoreStatement`'s NUMBER alternative was sufficient — no fallback to a general `Expression` alternative was needed; `RESTORE mylabel` continues to produce a `LabelRef`, not a `SymbolRef`, confirmed by probe both before and after the `RESTORE_NO_NL` correction.
- `LoadStatement` needed no option beyond `SaveStatement`'s mirrored shape; the Assumption A2 risk noted in 98-RESEARCH.md (BBj's real `LOAD` verb accepting something `SAVE` doesn't) did not surface in probing.
- The branch-target exclusion mechanism was extended beyond a literal "GOTO/GOSUB plus 1-8 spaces" lookbehind to also look back through a bounded run (up to 16) of prior comma-separated targets, each up to 64 identifier characters — required so the *last* target of a multi-target `ON...GOSUB` list resolves, per this task's own acceptance criteria (`on x gosub first,print`). Every added quantifier stays bounded, matching the threat model's DoS mitigation for this change (T-98-04).
- No residue: every shape probed across all four construct groups (RESTORE, LOAD, EXIT, keyword-branch-targets) validated clean. Nothing to hand off to the residue triage in plan 06 for these four groups.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] RestoreStatement's plain-optional lineref created a genuine parser ambiguity**
- **Found during:** Task 3, while writing `restore-numeric.bbj` (a fixture with a bare `RESTORE` followed by more statements)
- **Issue:** The grammar committed in Task 1 (`'RESTORE' lineref=(LabelRef | NUMBER)?`) parsed a bare `RESTORE` cleanly only when it was the *last* statement in the document. Followed by any other statement (e.g. `RESTORE\nx = 1\n`), Chevrotain's parser misresolved the optional trailing cross-reference against the next statement's leading token and raised a genuine parser error ("Expecting end of file but found `=`" / `:`), regressing the operandless form this plan's own must-have truths require to keep working exactly as before.
- **Fix:** Replaced the grammar-level optional with a new `RESTORE_NO_NL` lexer token mirroring `EXIT_NO_NL`'s established mechanism: it matches `RESTORE` only when an operand (digit, letter or underscore after whitespace) actually follows, so the *lexer* — not the parser — decides which grammar alternative applies (`RESTORE_NO_NL lineref=(LabelRef | NUMBER) | kind='RESTORE'`), eliminating the ambiguity entirely.
- **Files modified:** `bbj-vscode/src/language/bbj.langium`, `bbj-vscode/src/language/bbj-token-builder.ts`
- **Verification:** Re-probed all RESTORE shapes (numeric, label, bare-alone, bare-then-statement, bare-then-RESTORE, label-sharing-a-line) — zero parser errors, zero diagnostics in every case; full targeted suite and whole-suite gate green afterward.
- **Committed in:** `7b6f10aa` (Task 3 commit, documented inline)

**2. [Rule 1 - Bug] Per-describe-block test setup compounded into a beforeAll hook timeout**
- **Found during:** Task 3, after adding four new `describe` blocks to `line-break-validation.test.ts`
- **Issue:** Each of the file's `describe` blocks independently called `createBBjServices(EmptyFileSystem)` + `initializeWorkspace()` in its own `beforeAll` (an established, if wasteful, pre-existing pattern). Adding four more such blocks pushed the file to six independent async setups; running the file alone reliably tripped vitest's default 10-second `beforeAll` hook timeout on one or more blocks (non-deterministically, depending on which block's setup landed last in the scheduling order).
- **Fix:** Consolidated all six `describe` blocks in the file onto one shared `services`/`validate` instance with a single top-level `beforeAll`, cutting the file's total setup cost from six instantiations to one. No behavioral or assertion changes.
- **Files modified:** `bbj-vscode/test/line-break-validation.test.ts`
- **Verification:** File runtime dropped from ~50s (flaky, sometimes timing out) to ~8.5s (all 61 tests passing) across repeated runs.
- **Committed in:** `7b6f10aa` (Task 3 commit)

---

**Total deviations:** 2 auto-fixed (2 bugs — one grammar-level parser ambiguity, one test-infra timeout)
**Impact on plan:** Both fixes were necessary for correctness (deviation 1) and test-suite stability (deviation 2). No scope creep — both stayed within this plan's four construct groups and its own `line-break-validation.test.ts` file.

## Issues Encountered
None beyond the two deviations above, which were found and resolved during the plan's own probe-first workflow.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- All four construct groups this plan owns (`RESTORE n`, keyword-named `GOTO`/`GOSUB`/`ON...GOSUB` targets, `EXIT expr`, `LOAD`) validate clean with no known residue to hand to plan 06's triage.
- The `RESTORE_NO_NL`-style "lexer decides whether an operand follows" pattern is now precedented twice (`EXIT_NO_NL`, `RESTORE_NO_NL`) for any later plan that needs to make a keyword's trailing reference optional without risking the same parser ambiguity.
- `line-break-validation.test.ts`'s single-shared-services structure is the pattern later plans in this phase should follow when adding new `describe` blocks to this file, to avoid re-triggering the hook-timeout flake.
- No blockers for the next plan.

---
*Phase: 98-line-break-validation-false-alarms-a2*
*Completed: 2026-09-20*

## Self-Check: PASSED

- FOUND: bbj-vscode/src/language/bbj.langium
- FOUND: bbj-vscode/src/language/bbj-token-builder.ts
- FOUND: bbj-vscode/test/test-data/conformance/restore-numeric.bbj
- FOUND: bbj-vscode/test/test-data/conformance/keyword-branch-targets.bbj
- FOUND: bbj-vscode/test/test-data/conformance/exit-load-save.bbj
- FOUND: bbj-vscode/test/line-break-validation.test.ts
- FOUND commit: 701143c5 (feat(98-02): widen RESTORE and add a LoadStatement grammar rule)
- FOUND commit: d1da4ac7 (feat(98-02): let EXIT take an expression and a keyword be a branch target)
- FOUND commit: 7b6f10aa (test(98-02): add regression fixtures and still-flagged cases for RESTORE/LOAD/EXIT/keyword-labels)
- Re-ran plan `<verification>` block 1 (targeted set): 322 passed / 1 skipped, no failures.
- Re-ran plan `<verification>` block 2 (whole suite, `--maxWorkers=2`): `numFailedTests: 0` (1926 passed, 88 skipped) — 4 failed suites are pre-existing `beforeAll` hook timeouts under contention (hover.test.ts, setopts-code-scanner.test.ts x2, variable-scoping.test.ts) plus one known e2e "No document found" flake (installed-extension-e2e.test.ts), per the whole-suite gate substitution standing decision.
- Re-ran plan `<verification>` block 3: `git status --porcelain` shows no stray scratch probe file and nothing under `bbj-vscode/src/language/generated/` (only the pre-existing untracked `.planning/milestone.lock`).
- Re-ran all `<acceptance_criteria>` across the three tasks: all pass (grep counts, probe outputs, register check, still-flagged assertions).
