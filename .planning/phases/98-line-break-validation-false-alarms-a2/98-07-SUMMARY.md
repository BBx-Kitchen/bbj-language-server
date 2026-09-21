---
phase: 98-line-break-validation-false-alarms-a2
plan: 07
subsystem: validation
tags: [langium, lexer, chevrotain, line-break-validation, restore, roadmap]

# Dependency graph
requires:
  - phase: 98-line-break-validation-false-alarms-a2
    provides: "RESTORE_NO_NL lexer token (98-02) and the CONF-01 conformance harness (98-01)"
provides:
  - "RESTORE_NO_NL accepts a symbolic-label operand (asterisk + name-start char) without regressing the numeric/user-label/bare-verb forms or the verb-as-identifier guards"
  - "restore-numeric.bbj conformance fixture extended with symbolic-label RESTORE lines"
  - "ROADMAP.md Phase 98 criterion 2 back in sync with REQUIREMENTS.md's VALID-02 (LEN= moved to Phase 100, D-18)"
affects: [98-08, 98-09, 98-10]

# Actuals (#2632)
actuals:
  tokens: 3038
  tasks: 3
  commits: 3

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Lexer operand lookahead widened via non-capturing alternation of two branches rather than widening a single character class, to avoid admitting an unintended whitespace-tolerant match"

key-files:
  created: []
  modified:
    - bbj-vscode/src/language/bbj-token-builder.ts
    - bbj-vscode/test/line-break-validation.test.ts
    - bbj-vscode/test/test-data/conformance/restore-numeric.bbj
    - .planning/ROADMAP.md

key-decisions:
  - "RESTORE_NO_NL's operand lookahead is a non-capturing alternation — the existing [0-9A-Za-z_] class OR \\*[A-Za-z_] — not a single class with '*' added, because the wider single-class form also matches an asterisk followed by whitespace and would turn `x = restore * 2` into a false RESTORE statement."
  - "An unspaced multiplication written as `x = restore *foo` stays ambiguous in the language itself; this pattern resolves it in favour of the statement. Documented as a residual, not fixed."
  - "ROADMAP.md Phase 98 criterion 2 amended in place (1 line changed) to drop the continued LEN= item and cite D-18, matching REQUIREMENTS.md's already-corrected VALID-02 text."

requirements-completed: [VALID-02]

coverage:
  - id: D1
    description: "A symbolic-label RESTORE target (RESTORE *RETRY and case variants, including a label name that is also a language word) parses as exactly one RestoreStatement with zero line-break diagnostics"
    requirement: "VALID-02"
    verification:
      - kind: unit
        ref: "bbj-vscode/test/line-break-validation.test.ts#Line break validation: RESTORE with a numeric or label reference"
        status: pass
    human_judgment: false
  - id: D2
    description: "A variable named after the RESTORE verb (or containing it) used in a spaced multiplication/addition, or as an assignment target, keeps parsing as an ordinary LetStatement"
    requirement: "VALID-02"
    verification:
      - kind: unit
        ref: "bbj-vscode/test/line-break-validation.test.ts#Line break validation: the RESTORE verb word used as a name"
        status: pass
    human_judgment: false
  - id: D3
    description: "restore-numeric.bbj conformance fixture extended with symbolic-label RESTORE lines and still parses/validates clean"
    verification:
      - kind: integration
        ref: "bbj-vscode/test/conformance-regressions.test.ts#Every fixture in \"test-data/conformance\" parses and validates clean"
        status: pass
    human_judgment: false
  - id: D4
    description: "ROADMAP.md Phase 98 criterion 2 no longer promises the continued LEN= item and cites D-18"
    verification:
      - kind: other
        ref: "node -e script reading .planning/ROADMAP.md's Phase 98 block (see task 3 verify commands)"
        status: pass
    human_judgment: false

# Metrics
duration: 15min
completed: 2026-09-21
status: complete
---

# Phase 98 Plan 07: Symbolic-Label RESTORE Gap Closure Summary

**Narrowed RESTORE_NO_NL's lexer lookahead to accept `RESTORE *label` as a single alternation branch, closing verification gap 2 without reopening the `x = restore * 2` false-positive the wider single-class fix would have caused.**

## Performance

- **Duration:** 15 min
- **Started:** 2026-09-21T05:21:00Z (approx.)
- **Completed:** 2026-09-21T05:32:12Z
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments
- A symbolic-label RESTORE target — `RESTORE *RETRY`, `restore *retry`, `ReStOrE *ReTrY`, `RESTORE *NEXT` (a label whose name is also a language word), and an undeclared `RESTORE *mytarget` — now parses as exactly one `RestoreStatement` and produces zero line-break diagnostics, closing the gap the phase's own grammar change left open.
- The rejected wider fix (adding `*` to the existing single character class) was deliberately not implemented: it would have re-broken `x = restore * 2` by matching an asterisk followed by whitespace. The chosen alternation requires a name-start character immediately after the asterisk instead.
- New adversarial regression coverage: a variable named after the verb multiplied or added with a spaced operator, and the verb word embedded in a longer identifier as a multiplicand or assignment target, all keep parsing as an ordinary `LetStatement`.
- `restore-numeric.bbj` gained three symbolic-label RESTORE lines (upper/lower/mixed case) and still parses and validates clean.
- ROADMAP.md's Phase 98 success criterion 2 no longer lists the continued `LEN=` item (moved to Phase 100 per D-18) and now matches REQUIREMENTS.md's already-corrected VALID-02 text.

## Task Commits

Each task was committed atomically:

1. **Task 1: A failing test that pins the symbolic-label RESTORE defect and the identifier shapes that must survive the fix** - `1084d1bc` (test)
2. **Task 2: Narrow RESTORE_NO_NL so it accepts a symbolic-label operand and nothing else new** - `1ad87ada` (feat)
3. **Task 3: Amend ROADMAP.md Phase 98 success criterion 2 to match the LEN= reassignment** - `1aae8208` (docs)

_Note: Task 1 is a tracer-style RED commit (tdd="true"); task 2 is the GREEN commit. No REFACTOR commit was needed — the implementation was minimal on the first pass._

## Files Created/Modified
- `bbj-vscode/src/language/bbj-token-builder.ts` - RESTORE_NO_NL's PATTERN widened to a non-capturing alternation (existing digit/letter/underscore class, OR `\*[A-Za-z_]`), doc comment rewritten to describe the symbolic-label branch and the rejected wider alternative
- `bbj-vscode/test/line-break-validation.test.ts` - 5 symbolic-label positive cases added to the existing RESTORE positiveCases array, a new statement-shape test.each asserting exactly `['RestoreStatement']`, and a new describe block ("the RESTORE verb word used as a name") with 4 adversarial identifier cases asserting both zero line-break diagnostics and `['LetStatement']` shape
- `bbj-vscode/test/test-data/conformance/restore-numeric.bbj` - 3 symbolic-label RESTORE lines (upper/lower/mixed case) added, leading REM prose updated to mention the symbolic-label target
- `.planning/ROADMAP.md` - Phase 98 success criterion 2 amended (1 line) to drop the continued LEN= item and cite D-18

## Decisions Made
- **Non-capturing alternation over a widened single character class.** The plan explicitly forbade the review report's simpler suggested form (adding `*` to the existing `[0-9A-Za-z_]` class) because it would also match `restore * 2` (asterisk followed by whitespace), reintroducing the exact regression the phase's own observed-behaviour probe had recorded as a must-not-regress case. The alternation branch requires the name-start character immediately after the asterisk, with no whitespace tolerance, so `x = restore * 2` never satisfies either branch of the lookahead.
- **Residual ambiguity accepted, not fixed.** `x = restore *foo` (an unspaced multiplication) is genuinely ambiguous in the token stream: the lexer's context-free regex match wins the token race for `RESTORE_NO_NL` regardless of the parser's actual expression-vs-statement context, so this construct resolves in favour of the statement token (and would surface as a parser error inside an expression, not a silent misparse). This is documented as a residual limitation per the plan's explicit scope, not something this plan's tests assert against or attempt to resolve.
- **ROADMAP.md amendment kept to one line.** REQUIREMENTS.md's VALID-02 text had already dropped the LEN= item in an earlier plan; only ROADMAP.md's criterion 2 still listed it. A single-line edit (not a rewrite) keeps both closely aligned and the diff auditable.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `--reporter=basic` no longer exists in the installed vitest 4.1.10**
- **Found during:** Task 1 (running the plan's literal `<verify><automated>` command)
- **Issue:** The plan's verify commands specify `npx vitest run ... --reporter=basic`, but this project's installed vitest (4.1.10) removed the `basic` reporter name and errors with "Failed to load custom Reporter from basic" before any tests run — an environment/tooling drift unrelated to this plan's file changes.
- **Fix:** Ran the same test files without the `--reporter` flag (vitest's default reporter), which prints the same pass/fail/test-name information the verify step needs. No source or test file changed for this; it only affects how the verification command was invoked during execution.
- **Files modified:** None (verification tooling substitution only)
- **Verification:** Re-ran task 1's red-state check and task 2's green-state check both ways where possible; the default reporter's output format was sufficient to confirm exactly 10 symbolic-label test failures (task 1) and 0 failures across all four targeted files (task 2).
- **Committed in:** N/A (no file change; documented here per deviation rules)

**2. [Rule 3 - Blocking] Own-introduced planning-identifier citation caught by the register check**
- **Found during:** Task 1, before committing the red test
- **Issue:** My first draft of a regression-guard comment cited "D-14" (referencing this phase's earlier TABLE-token statement-anchor fix) to explain the analogy, which the plan's own register-check acceptance criterion forbids in source/test files.
- **Fix:** Reworded the comment to describe the earlier defect in behaviour terms ("an earlier lexer token in this phase once swallowed an identifier that merely contained its verb word, before that token gained a statement anchor") instead of citing the decision ID.
- **Files modified:** bbj-vscode/test/line-break-validation.test.ts
- **Verification:** Re-ran `git diff -- bbj-vscode/test/line-break-validation.test.ts | grep '^+' | grep -qE 'VALID-0|CONF-0|D-[0-9][0-9]|98-[0-9][0-9]'` — now exits 1 (no match), as required.
- **Committed in:** 1084d1bc (part of task 1's commit — caught before commit, not a follow-up fix)

---

**Total deviations:** 2 auto-fixed (both Rule 3 - blocking issues, both resolved before their respective commits). **Impact on plan:** Neither changed the plan's scope or design; one was a verification-tooling substitution, the other a self-caught register-check violation fixed before it ever reached a commit.

## Issues Encountered
- Running all four of task 2's targeted files together (`line-break-validation.test.ts`, `conformance-regressions.test.ts`, `example-files.test.ts`, `parser.test.ts`) hit a `beforeAll` hook timeout in `line-break-validation.test.ts` under worker contention (documented project behavior, "Whole-suite hook timeouts are contention" — a failed suite with `numFailedTests: 0` for that run is not a real failure). Re-ran the affected file alone (81/81 passed) and the remaining three together (226/226 passed, 1 pre-existing skip) to confirm. The plan's own whole-suite JSON gate independently confirmed `numFailedTests=0`.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Verification gap 2 (symbolic-label RESTORE false alarm) is closed; VALID-02's coverage now includes symbolic-label targets alongside numeric and user-label targets.
- `.planning/REQUIREMENTS.md` was not touched by this plan, per the phase's own working rule — its Phase 98 checkboxes remain unchecked until the phase's final gap plan (98-10) resolves them.
- Ready for 98-08 (open/closed balance in the ELSE/end-of-IF backward walks, and the scalar-type conflicting DECLARE restoration).

---
*Phase: 98-line-break-validation-false-alarms-a2*
*Completed: 2026-09-21*
