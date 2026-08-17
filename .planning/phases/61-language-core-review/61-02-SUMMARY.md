---
phase: 61-language-core-review
plan: 02
subsystem: review
tags: [langium, chevrotain, lexer, grammar, tokenizer, security-review, test-coverage]

# Dependency graph
requires:
  - phase: 61-language-core-review
    provides: "61-01: 61-COVERAGE.md skeleton (88-cell grid, D-17 gate, 38 n/a carry-forwards), RU-61-06 fully swept, D-05 recording shape approved and frozen"
provides:
  - "RU-61-01 (grammar & lexing, 5 files/1,340 LOC) swept end to end across all 6 live dimensions — 9 findings, phase-wide ledger at 12 of 50 applies cells recorded"
affects: [61-03-PLAN, 61-04-PLAN, 61-05-PLAN, 61-06-PLAN, 61-07-PLAN, phase-66-debt-retriage, phase-67-easy-fixes, phase-68-doc-assembly]

# Actuals (#2632)
actuals:
  tokens: 8783
  tasks: 2
  commits: 2

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Regex/algorithm reproductions run as standalone node -e scripts (not committed test files) to clear the repro evidence tier without touching reviewed source or adding out-of-scope test artifacts"
    - "A single defect surfaced from two angles (correctness + doc-accuracy) is recorded as two cross-referencing finding records under their respective primary dimensions, following RU-61-06's P61-D2-004/P61-D8-001 precedent"

key-files:
  created: []
  modified:
    - .planning/reviews/61-COVERAGE.md

key-decisions:
  - "STRING_LITERAL's doubled-quote escape (bbj.langium:948's comment claims 'Handled in BBjValueConverter') is never actually collapsed by bbj-value-converter.ts — recorded as P61-D2-005 (correctness) and P61-D8-002 (doc-accuracy), cross-referencing each other"
  - "bbj-lexer.ts's prepareLineSplitter normalizes all line endings to one style based on 'does the file contain any \\r\\n', which silently breaks its own length-preservation invariant (proven by lexer.test.ts's own offset-preservation test) for genuinely mixed-EOL files, corrupting downstream LSP position mapping — recorded as P61-D2-006"
  - "The BBjFilePath terminal's greedy `::.*::` was reproduced spanning past the nearest closing `::` into a second qualified reference on the same physical line — recorded as P61-D2-007, classified major because fixing it edits a bbj.langium terminal rule (D-13 test 2)"
  - "example-files.test.ts's `.forEach(async ...)` loop doesn't await its own assertions, so it would not fail if a future test-data file failed to lex/parse, undermining CLAUDE.md's stated zero-lexer/parser-error guarantee — recorded as P61-D5-004"
  - "The 3 disabled parser.test.ts assertions (D-14 routing table item) recorded as P61-D5-003 with dedup naming DEBT-02 as the owning re-triage requirement, per the same pattern RU-61-06 used for its P61-D5-001"
  - "prepareLineSplitter's splice-based line-merge is linear, not quadratic — benchmarked 2,000 to 160,000 lines directly, confirming Array.prototype.splice's equal insert/delete count performs an in-place slot replacement; recorded as a clean D3 pass rather than a finding"

patterns-established:
  - "When a repro-tier claim can be verified with a short, self-contained script (regex behavior, algorithm reproduction), run it via `node -e` in the scratchpad/session context rather than committing a throwaway test file — keeps the finding's evidence runnable and reproducible without violating the plan's no-source-file-changes constraint"

requirements-completed: [RVW-01]

coverage:
  - id: D1
    description: "RU-61-01 (grammar & lexing, 5 files/1,340 LOC) swept across D1, D2, D3 at evidence tier repro — D1 pass (no catastrophic backtracking or injection surface), D2 fail with 4 findings (P61-D2-005..008), D3 pass (prepareLineSplitter benchmarked linear)"
    requirement: RVW-01
    verification:
      - kind: other
        ref: "acceptance_criteria grep suite in 61-02-PLAN.md Task 1 (grep -cE checks on RU-61-01 D1-D3 cell lines, phase-wide pass/fail=9, pending=41, n/a=38, unique finding IDs, no blank dedup, no excluded-surface location, no source-tree git diff) — all passed"
        status: pass
    human_judgment: false
  - id: D2
    description: "RU-61-01 completed across D4, D5, D8 at evidence tier trace — D4 fail with 2 findings (P61-D4-004/005), D5 fail with 2 findings (P61-D5-003/004, including the routed 3 disabled parser.test.ts assertions cross-referencing DEBT-02), D8 fail with 1 finding (P61-D8-002)"
    requirement: RVW-01
    verification:
      - kind: other
        ref: "acceptance_criteria grep suite in 61-02-PLAN.md Task 2 (6 live cells verdicted, 2 n/a cells intact, all 5 files named, parser.test.ts+DEBT-02 present, phase-wide pass/fail=12, pending=38, n/a=38, unique finding IDs, no blank dedup, no source-tree git diff) — all passed"
        status: pass
    human_judgment: false

# Metrics
duration: ~25min
completed: 2026-08-17
status: complete
---

# Phase 61 Plan 02: RU-61-01 Grammar & Lexing Sweep Summary

**Swept the grammar/lexer pipeline (`bbj.langium`, `java-types.langium`, `bbj-lexer.ts`, `bbj-token-builder.ts`, `bbj-value-converter.ts` — 5 files, 1,340 LOC) end to end across all 6 live dimensions, recording 9 findings including a verified mixed-EOL position-drift bug and an unenforced string-literal escape contract.**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-08-17 (session start, following 61-01)
- **Completed:** 2026-08-17T21:37:01Z
- **Tasks:** 2 (both `auto`)
- **Files modified:** 1 (`.planning/reviews/61-COVERAGE.md`)

## Accomplishments

- `## RU-61-01 — Grammar & lexing` fully swept at both evidence tiers: `repro` for D1/D2/D3 (Task 1) and `trace` for D4/D5/D8 (Task 2) — 9 total findings, all 13-field-complete with non-blank `dedup`.
- **D1 Security: pass.** Every terminal regex in `bbj.langium` and every custom pattern `bbj-token-builder.ts` constructs was checked for catastrophic-backtracking shapes (nested quantifiers, overlapping alternation, unanchored greedy `.*` inside a repeated group) — none found. `bbj-value-converter.ts` performs no evaluation/unescaping/interpolation of input. `java-types.langium`'s connection to peer-supplied Java type data is cross-referenced to `RU-61-06` rather than re-assessed (already recorded there as `P61-D1-002`).
- **D2 Correctness: fail, 4 findings.** `P61-D2-005` — `STRING_LITERAL`'s doubled-quote escape (`""` → `"`) is never actually collapsed by `bbj-value-converter.ts`, contradicting the terminal's own comment; reproduced with a standalone script. `P61-D2-006` — mixed line-ending files break `prepareLineSplitter`'s length-preservation invariant, drifting token offsets and corrupting downstream LSP position mapping; reproduced with a node script showing a 1-character-per-line offset shift. `P61-D2-007` — the `BBjFilePath` terminal's greedy `::.*::` spans past the nearest closing `::` into a second qualified reference on the same physical line; reproduced with `String.prototype.match`. `P61-D2-008` — `spliceToken()` silently removes the wrong (last) token via `Array.prototype.splice(-1, 1)` when a hardcoded terminal name lookup fails, instead of throwing.
- **D3 Performance: pass.** Regexes are compiled once at grammar/services initialization, not per keystroke. `prepareLineSplitter` was re-implemented and benchmarked from 2,000 to 160,000 lines across many independent continuation groups — confirmed linear (e.g. 80,000 lines: 74.6ms vs. 160,000 lines: 138.3ms), because `splice`'s equal insert/delete count performs an in-place slot replacement rather than an O(n) tail shift.
- **D4 Maintainability: fail, 2 findings.** `P61-D4-004` — `WithChannelAndOptionsAndOutputItems`/`WithChannelAndOptionsAndInputItems` are near-duplicate grammar fragments that have already drifted apart (one extra alternative in the Output variant). `P61-D4-005` — `buildTokens()` bundles 3 responsibilities (terminal construction, 14 hardcoded priority-reordering calls, ID-category wiring) in one 58-line method with no internal decomposition.
- **D5 Test coverage: fail, 2 findings.** `P61-D5-003` — the 3 disabled `parser.test.ts` assertions (Java-classpath blocked under `EmptyFileSystem`), recorded with full evidence and `dedup: DEBT-02` per D-14. `P61-D5-004` — `example-files.test.ts`'s `.forEach(async ...)` loop never awaits its own assertions, so a future non-parsing test-data file would not fail the test, undermining CLAUDE.md's stated zero-lexer/parser-error guarantee.
- **D8 Doc accuracy: fail, 1 finding.** `P61-D8-002` — `bbj.langium:948`'s comment claiming escape handling occurs in `BBjValueConverter` is false (cross-ref `P61-D2-005`). CLAUDE.md's Langium-pipeline description, `prepareLineSplitter` claim, and `npm run langium:generate` instruction were all verified accurate.
- All 5 unit files are named inside the section; the 2 `n/a` cells (D6, D7) are byte-identical carry-forwards, untouched.
- Phase-wide ledger: 12 of 50 `applies` cells recorded, 38 `n/a` pinned, 88 total — matching the plan's target exactly.

## Task Commits

Each task was committed atomically:

1. **Task 1: Sweep RU-61-01 at evidence tier `repro` — D1, D2, D3** — `47a5c11` (feat)
2. **Task 2: Complete RU-61-01 at evidence tier `trace` — D4, D5, D8** — `808aa55` (feat)

**Plan metadata:** commit follows this SUMMARY.

## Files Created/Modified

- `.planning/reviews/61-COVERAGE.md` - Appended `## RU-61-01 — Grammar & lexing` section only: 6 cell verdicts, 9 finding records, 2 Not-reproducible dispositions, 2 Cross-unit referrals. No other section touched.

## Decisions Made

- **A single defect surfaced from two angles is recorded as two cross-referencing findings**, following RU-61-06's precedent: `P61-D2-005` (correctness) and `P61-D8-002` (doc-accuracy) both trace to the same `bbj-value-converter.ts:14` gap.
- **Repro-tier evidence for algorithmic/regex claims was produced via standalone `node -e` scripts**, not committed test files — this cleared the `repro` evidence tier for `P61-D2-006`, `P61-D2-007`, `P61-D2-008` and the D3 benchmark without adding any file to the working tree, keeping the plan's single-file `files_modified` constraint intact.
- **`P61-D2-007` (BBjFilePath greedy match) classified `major`**, not `easy`, because any fix edits a `bbj.langium` terminal rule — D-13 test (2) fails regardless of the small edit size, matching the safety-gate pattern used throughout RU-61-06.
- **The `beforeAll` hookTimeout flakiness that struck this unit's own `chevrotain-tokens.test.ts` suite (per INVENTORY's Test & Build Baseline) was NOT recorded as an RU-61-01 finding** — per the plan's explicit instruction, it is cross-referenced to `RU-61-05` (its root cause, `WorkspaceManager.initializeWorkspace()`, lives there) instead.
- **The java-types.langium → java-interop.ts peer-data connection was cross-referenced to RU-61-06 rather than re-assessed** — `java-types.langium` contains only AST type-shape interfaces with no parsing/validation logic of its own; the unvalidated-assignment defect (`P61-D1-002`) is already fully recorded in RU-61-06's files.

## Deviations from Plan

None - plan executed exactly as written. Both tasks' automated `<verify>` blocks passed on first run, along with every additional acceptance criterion (field-count equality across all 23 findings now in the file, pass-line length ≥80 chars, unique well-formed finding IDs, non-blank `dedup`, no excluded-surface `location:`, `git status --porcelain` empty for `bbj-vscode`/`bbj-intellij`/`java-interop`/`INVENTORY.md`). No source file was modified; `INVENTORY.md` was not edited; no GitHub issue was opened.

## Issues Encountered

None. One candidate D1 claim (whether the BBjFilePath mis-tokenization could mask an `ERR=` clause) and one candidate D4 claim (exhaustive grammar-rule reachability) did not clear their evidence tier and were recorded under `### Not-reproducible dispositions` with their reasons rather than asserted as findings or silently dropped.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan `61-03` (wave 3, `RU-61-03` validation & BBjCPL diagnostics) can now proceed: the shared `61-COVERAGE.md` carries 12 of 50 `applies` cells recorded, its own stubbed section is already in place, and the D-17 gate's stated totals (50/38/88) remain untouched.
- `RU-61-03` inherits a note from this plan: `P61-D2-005`'s failure scenario references `bbj-validator.ts:419`'s `RUN`/`CALL` file-path resolution as a downstream consumer of the unescaped `.value` — that file belongs to `RU-61-03`, but the finding itself (and its `location:`) stays here since the defect originates in `bbj-value-converter.ts`.
- 5 of `61-COVERAGE.md`'s 7 unit sections remain fully `pending` (38 of 50 `applies` cells); `RU-61-06` and `RU-61-01` are the only two units complete.
- No blockers.

## Self-Check: PASSED

- FOUND: `.planning/reviews/61-COVERAGE.md`
- FOUND: `.planning/phases/61-language-core-review/61-02-SUMMARY.md`
- FOUND commit: `47a5c11` (Task 1)
- FOUND commit: `808aa55` (Task 2)

---
*Phase: 61-language-core-review*
*Completed: 2026-08-17*
