---
phase: 67-apply-easy-fixes
plan: 05
subsystem: language-server
tags: [langium, lexer, value-converter, cpl-parser, variable-scoping, events, vitest]

# Dependency graph
requires:
  - phase: 67-apply-easy-fixes
    provides: 67-04's lint-clean milestone (npm run lint exit 0, zero warnings) and the
      red-then-green commit convention (D-12) proven across plans 67-01..67-04
provides:
  - Five closed D2 correctness ledger rows in 67-APPLY-SET.md — P61-D2-005, P61-D2-006,
    P61-D2-009, P61-D2-010, P61-D2-019 — each with real red/green shas
  - "### Plan 67-05 delta" section in 67-BASELINE.md recording verdict: identical
affects: [67-06, 67-12]

# Actuals (#2632)
actuals:
  tokens: 8700
  tasks: 3
  commits: 11

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "TreeStream iterator prune(): obtain the iterator explicitly via .iterator() (not the for...of
       sugar, since Symbol.iterator's return value's prune() is only reachable off the iterator
       object) to stop AstUtils.streamAllContents descending into an excluded subtree"
    - "Length-preserving per-line EOL tracking: capture each line's original delimiter via a
       capturing split (text.split(/(\\r\\n|\\r|\\n)/)) instead of re-joining every line with one
       globally-detected terminator"

key-files:
  created:
    - bbj-vscode/test/value-converter.test.ts
  modified:
    - bbj-vscode/src/language/bbj-value-converter.ts
    - bbj-vscode/src/language/bbj-lexer.ts
    - bbj-vscode/src/language/bbj-cpl-parser.ts
    - bbj-vscode/src/language/validations/check-variable-scoping.ts
    - bbj-vscode/src/language/lib/events.ts
    - bbj-vscode/test/lexer.test.ts
    - bbj-vscode/test/cpl-parser.test.ts
    - bbj-vscode/test/variable-scoping.test.ts
    - bbj-vscode/test/builtin-functions-library.test.ts
    - .planning/phases/67-apply-easy-fixes/67-APPLY-SET.md
    - .planning/phases/67-apply-easy-fixes/67-BASELINE.md

key-decisions:
  - "P61-D2-006 branch taken: track and re-emit each line's own original EOL (captured via a
     capturing split), not the reject/normalize-before-parse alternative — smaller edit, and the
     final line still falls back to the single detected eol so single-EOL-style and no-trailing-
     newline files tokenize byte-for-byte identically to before"
  - "P61-D2-010 branch taken: TreeStream iterator's prune() over a manual recursive walk mirroring
     walkStatements — smaller edit, no duplicated traversal logic"
  - "P61-D2-019 branch taken: merge (the two ON_MOUSE_ENTER/ON_MOUSE_EXIT declarations differ only
     in DOCU text) — both phrasings preserved as a union in the kept line-57/62 declaration, the
     duplicate block at lines 525-533 removed; events.bbl left untouched (confirmed dead per Phase
     61 Plan 07 — not read by any runtime consumer, only the .ts-exported string is used)"
  - "P61-D2-019's red test added directly to the existing test/builtin-functions-library.test.ts
     rather than a new events-library.test.ts — that harness already loads the bbjlib:///events.bbl
     document via the same WorkspaceManager.loadAdditionalDocuments path that loads functions.bbl"
  - "FIX-01..03 left Pending in REQUIREMENTS.md, following 67-01's established precedent — this
     plan closes 5 more of the 77 apply-set rows but does not complete the phase; marking the
     phase-level requirements complete is deferred to 67-12 (phase close)"

patterns-established: []

requirements-completed: []

coverage:
  - id: D1
    description: "BBjValueConverter un-escapes doubled quotes when converting STRING_LITERAL, matching bbj.langium:948's documented escape contract"
    requirement: "FIX-01"
    verification:
      - kind: unit
        ref: "bbj-vscode/test/value-converter.test.ts#a doubled quote inside a string literal converts to a single embedded quote"
        status: pass
    human_judgment: false
  - id: D2
    description: "bbj-lexer.ts's prepareLineSplitter preserves each line's original EOL, keeping token offsets in sync with the original text on mixed CRLF/LF input"
    requirement: "FIX-01"
    verification:
      - kind: unit
        ref: "bbj-vscode/test/lexer.test.ts#P61-D2-006: mixed CRLF/LF line endings preserve token offsets against the original text"
        status: pass
    human_judgment: false
  - id: D3
    description: "parseBbjcplOutput clamps the converted physical line at zero, never emitting a negative LSP line number"
    requirement: "FIX-01"
    verification:
      - kind: unit
        ref: "bbj-vscode/test/cpl-parser.test.ts#P61-D2-009: a diagnostic reported on physical line 0 clamps to LSP line 0, never -1"
        status: pass
    human_judgment: false
  - id: D4
    description: "checkUseBeforeAssignment's Pass 2 prunes excluded MethodDecl/BbjClass/DefFunction subtrees instead of continuing past them, eliminating spurious use-before-assignment hints"
    requirement: "FIX-01"
    verification:
      - kind: unit
        ref: "bbj-vscode/test/variable-scoping.test.ts#P61-D2-010: excluded subtree (a method body) is pruned from the outer scope walk, not just skipped"
        status: pass
    human_judgment: false
  - id: D5
    description: "lib/events.ts declares ON_MOUSE_ENTER and ON_MOUSE_EXIT exactly once each"
    requirement: "FIX-01"
    verification:
      - kind: unit
        ref: "bbj-vscode/test/builtin-functions-library.test.ts#P61-D2-019: every builtin event name is declared exactly once"
        status: pass
    human_judgment: false
  - id: D6
    description: "Plan-level baseline delta: npm run lint exits 0 zero warnings, npm test's 11-name deterministic gate set is unchanged across three runs"
    requirement: "FIX-03"
    verification:
      - kind: other
        ref: ".planning/phases/67-apply-easy-fixes/67-BASELINE.md — ### Plan 67-05 delta, verdict: identical"
        status: pass
    human_judgment: false

duration: ~13min
completed: 2026-08-19
status: complete
---

# Phase 67 Plan 05: Value Conversion, Lexer, CPL Parser, Variable Scoping, Events Summary

**Un-escaped doubled-quote string literals, fixed mixed-CRLF/LF token-offset drift in the lexer, clamped negative BBjCPL line numbers, pruned excluded subtrees from variable-scoping's use-before-assignment walk, and removed duplicate ON_MOUSE_ENTER/ON_MOUSE_EXIT event declarations — five D2 correctness fixes, each red-then-green.**

## Performance

- **Duration:** ~13 min (commit span 12:43:00Z → 12:55:31Z)
- **Started:** 2026-08-19T12:42:00Z (approx, session start)
- **Completed:** 2026-08-19T12:55:41Z
- **Tasks:** 3
- **Files modified:** 11 (1 created, 10 modified)

## Accomplishments

- `bbj-value-converter.ts`'s STRING_LITERAL case now applies `.replace(/""/g, '"')` after stripping the outer quote delimiters, so a doubled-quote escape (`"He said ""hi"""`) converts to a single embedded quote instead of leaving both quote characters — matching the grammar's own documented contract (bbj.langium:948).
- `bbj-lexer.ts`'s `prepareLineSplitter` now captures and re-emits each line's own original EOL (via a capturing split) instead of re-joining every line with one globally-detected terminator, fixing a token-offset drift that previously corrupted diagnostics/hover/completion/go-to-definition ranges for the remainder of any file with mixed CRLF/LF line endings. Single-EOL-style files and files with no trailing newline tokenize byte-for-byte identically to before (proved algebraically and by test).
- `bbj-cpl-parser.ts` now clamps the converted physical line at zero (`Math.max(0, parseInt(match[1], 10) - 1)`), so a bbjcpl diagnostic reporting physical line 0 maps to LSP line 0 instead of the out-of-contract -1.
- `check-variable-scoping.ts`'s Pass 2 now walks `AstUtils.streamAllContents(node)` via the TreeStream iterator's own `prune()` method for excluded MethodDecl/BbjClass/DefFunction subtrees, instead of a bare `continue` that skipped the matched node but still let the iterator descend into its children — eliminating spurious "used before assignment" hints on a nested method's own correctly-ordered local variable reads.
- `lib/events.ts`'s duplicate `ON_MOUSE_ENTER`/`ON_MOUSE_EXIT` declarations (lines 57/528 and 62/533) are merged into one declaration each, with both DOCU phrasings preserved as a union; each event name is now declared exactly once, so completion no longer offers the same label twice.
- Closed all five ledger rows in `67-APPLY-SET.md` with real red/green commit shas, `fail_before` observations, and `user_facing: yes` on all five. Recorded `### Plan 67-05 delta` in `67-BASELINE.md`: `npm run lint` exits 0 with zero warnings (unchanged from 67-04's lint-clean milestone); `npm test`'s 11-name deterministic failing-test set (all `test/linking.test.ts > Linking Tests > Interop related tests`, unreachable java-interop) is set-equal to the phase-start gate set across three full runs. **Verdict: identical.**

## Task Commits

Each task was committed atomically:

1. **Task 1: Value conversion, line-ending handling, and CPL line clamping**
   - `1b619cc` — `test(P61-D2-005): add failing test for doubled-quote string literal conversion`
   - `4db8169` — `fix(P61-D2-005): un-escape doubled quotes when converting string literals`
   - `112c9bb` — `test(P61-D2-006): add failing test for mixed CRLF and LF line endings`
   - `e57b15a` — `fix(P61-D2-006): preserve each line's original EOL in prepareLineSplitter`
   - `5528665` — `test(P61-D2-009): add failing test for a CPL diagnostic reported on line 0`
   - `7b6eff9` — `fix(P61-D2-009): clamp the converted CPL line number at zero`
2. **Task 2: Variable-scoping traversal pruning and the duplicate event declarations**
   - `869a330` — `test(P61-D2-010): add failing test for descent into an excluded scoping subtree`
   - `b83d3e8` — `fix(P61-D2-010): prune excluded subtrees instead of continuing past them`
   - `d1e86e6` — `test(P61-D2-019): add failing test for duplicate event declarations`
   - `3b18ac9` — `fix(P61-D2-019): remove the duplicate event declarations`
3. **Task 3: Close the five ledger rows and run the plan baseline delta**
   - `18a88a0` — `docs(67-05): close the remaining language-core D2 rows and record baseline delta`

## Files Created/Modified

- `bbj-vscode/test/value-converter.test.ts` — new vitest module for `BBjValueConverter`'s STRING_LITERAL conversion (doubled-quote, no-doubled-quote, empty-literal cases)
- `bbj-vscode/src/language/bbj-value-converter.ts` — one-line `.replace(/""/g, '"')` addition
- `bbj-vscode/src/language/bbj-lexer.ts` — `prepareLineSplitter` reworked to track and re-emit per-line original EOL
- `bbj-vscode/src/language/bbj-cpl-parser.ts` — `Math.max(0, ...)` clamp on the converted physical line
- `bbj-vscode/src/language/validations/check-variable-scoping.ts` — Pass 2 rewritten to use the TreeStream iterator's `prune()` directly
- `bbj-vscode/src/language/lib/events.ts` — duplicate `ON_MOUSE_ENTER`/`ON_MOUSE_EXIT` declarations merged and removed
- `bbj-vscode/test/lexer.test.ts` — 3 new regression tests (mixed CRLF/LF, single-EOL-style, no-trailing-newline)
- `bbj-vscode/test/cpl-parser.test.ts` — 1 new test for the line-0 clamp
- `bbj-vscode/test/variable-scoping.test.ts` — 1 new test for excluded-subtree pruning
- `bbj-vscode/test/builtin-functions-library.test.ts` — 1 new test asserting every builtin event name is declared exactly once
- `.planning/phases/67-apply-easy-fixes/67-APPLY-SET.md` — 5 rows closed (P61-D2-005/006/009/010/019)
- `.planning/phases/67-apply-easy-fixes/67-BASELINE.md` — `### Plan 67-05 delta` section appended

## Decisions Made

- **P61-D2-006 branch:** per-line original EOL tracking (captured via a capturing split `text.split(/(\r\n|\r|\n)/)`), not the reject/normalize-before-parse alternative the record also permitted. The final line still falls back to the single detected `eol`, matching prior behavior exactly for single-EOL-style files and files with no trailing newline — verified both algebraically (the continuation-splicing math is unaffected, since `splice()` keeps the `lines` array length constant so the parallel `delimiters` array stays aligned) and by test.
- **P61-D2-010 branch:** `prune()` on the TreeStream iterator (obtained via `.iterator()`, since `prune()` is only reachable on the iterator object, not through the for...of sugar) over a manual recursive walk mirroring `walkStatements`'s exclusion logic — smaller edit, no duplicated traversal logic.
- **P61-D2-019 branch:** merge, not delete-the-later-duplicate-verbatim — the two declarations' DOCU text differed ("Window Mouse Enter"/"Window Mouse Exit" vs "Mouse Enter Event"/"Mouse Exit Event"), so both phrasings are preserved as a union in the kept declaration ("Window Mouse Enter / Mouse Enter Event"). `events.bbl` (the physical catalog mirror) is left untouched — confirmed dead per Phase 61 Plan 07 (not read by any runtime consumer or test).
- **P61-D2-019's red test** lives in the existing `test/builtin-functions-library.test.ts`, not a new `test/events-library.test.ts` — that harness's `createBBjServices` + `initializeWorkspace` already loads the `bbjlib:///events.bbl` document through the same `WorkspaceManager.loadAdditionalDocuments` path that loads `functions.bbl`, confirmed by reading `bbj-ws-manager.ts:219-228` before deciding.
- **FIX-01..03 left Pending in REQUIREMENTS.md**, following 67-01's established precedent: this plan closes 5 more of the 77 apply-set rows (bringing the running total to 8 applied) but far from "all fixes" or phase completion; marking the phase-level requirements complete is deferred to 67-12 (phase close), consistent with D-07's say-what-is-true philosophy.

## Deviations from Plan

None — plan executed exactly as written. All five fixes are the exact edit named in each finding record's `classification:` test-5 clause (`input.slice(1, -1).replace(/""/g, '"')`; per-line EOL tracking; `Math.max(0, parseInt(match[1], 10) - 1)`; `prune()`; remove/merge the duplicate `eventtype` declarations). The two two-option branch choices (P61-D2-006, P61-D2-010) and the merge-vs-delete choice (P61-D2-019) are documented above under Decisions Made, not Rule 1-4 auto-fixes.

## Issues Encountered

None. All three red tests failed exactly as predicted before their corresponding fix, and all suites returned to green immediately after.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- 8 of 77 apply-set rows now closed (3 from 67-01, 5 from this plan); plans 67-06 through 67-11 continue applying the remaining pending rows.
- `P61-D8-002` (bbj.langium:948's comment naming P61-D2-005 as its alternative resolution) is plan 67-06's concern — this plan did not touch `bbj.langium`, per the plan's own success criterion.
- No blockers. `npm run lint` stays clean (0 warnings) and the 11-name deterministic `npm test` gate set is unchanged — future plans should continue the same per-plan baseline-delta comparison (D-09).

## Self-Check: PASSED

All 11 created/modified files confirmed present on disk; all 11 commit hashes confirmed present in `git log --oneline --all`.
