---
phase: 118-small-dedup-drift-guards
plan: "01"
subsystem: testing
tags: [vitest, catalog, drift-guard, refactor, bbl]

# Dependency graph
requires:
  - phase: 114-lint-typecheck-test-suite-gates
    provides: whole-suite numFailedTests:0 gate, lint --max-warnings 0, typecheck:test
provides:
  - One shared wrapper shape across the four builtin catalog .ts files (events, functions, labels, variables)
  - Each lib/*.bbl mirror rewritten byte-identical to the served .ts export
  - A byte-exact vitest drift guard (bbl-catalog-drift.test.ts) covering all four catalog pairs
  - An "every .bbl has a row" completeness test against src/language/lib
  - Corrected .ts-vs-.bbl equivalence comment in builtin-library-members.test.ts
affects: [118-02, 118-03]

actuals:
  tokens: 11556
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "Byte-exact table-driven drift guard (test.each over a CATALOGS array) comparing an imported .ts export against its sibling .bbl file, CRLF-normalised, with a failure message naming the file to rewrite"

key-files:
  created:
    - bbj-vscode/test/bbl-catalog-drift.test.ts
  modified:
    - bbj-vscode/src/language/lib/events.ts
    - bbj-vscode/src/language/lib/events.bbl
    - bbj-vscode/src/language/lib/functions.ts
    - bbj-vscode/src/language/lib/functions.bbl
    - bbj-vscode/src/language/lib/labels.ts
    - bbj-vscode/src/language/lib/labels.bbl
    - bbj-vscode/src/language/lib/variables.ts
    - bbj-vscode/src/language/lib/variables.bbl
    - bbj-vscode/test/builtin-library-members.test.ts

key-decisions:
  - "Rewrote each .bbl from the evaluated .ts constant via a throwaway tsx script, never by hand-copying .ts source text (avoids the backslash-escaped-backtick drift class documented in research)"
  - "Wrapper shape unified to: opening backtick directly followed by `library` on line 1, closing backtick alone on its own line followed by `;`, one final newline — applied identically to all four files"
  - "Reworded (not deleted) the .ts-vs-.bbl name-set comment in builtin-library-members.test.ts to point at the new byte-exact guard as the stricter check, keeping the name-set test as a parse-level cross-check"

patterns-established:
  - "Drift guards for hand-synced mirror files: import the source-of-truth export, read the mirror from disk, normalise CRLF, assert strict equality with a message naming the file and its source"

requirements-completed: [REF-04, REF-05]

coverage:
  - id: D1
    description: "The four builtin catalog .ts files (events, functions, labels, variables) share one wrapper shape: opening backtick + library on line 1, closing backtick + semicolon alone on the last line, one final newline"
    requirement: "REF-04"
    verification:
      - kind: unit
        ref: "node -e wrapper-shape check (head/tail byte assertions), run inline during Task 1 and Task 2"
        status: pass
      - kind: unit
        ref: "bbj-vscode/test/builtin-functions-library.test.ts, bbj-vscode/test/builtin-library-members.test.ts, bbj-vscode/test/example-files.test.ts"
        status: pass
    human_judgment: false
  - id: D2
    description: "Each lib/*.bbl mirror is rewritten from its .ts export's evaluated value and matches it byte for byte (CRLF normalised)"
    requirement: "REF-05"
    verification:
      - kind: unit
        ref: "bbj-vscode/test/bbl-catalog-drift.test.ts#$bbl matches $exportName from $ts (4 pairs)"
        status: pass
      - kind: unit
        ref: "bbj-vscode/test/bbl-catalog-drift.test.ts#every .bbl file in src/language/lib has a row"
        status: pass
    human_judgment: false
  - id: D3
    description: "The drift guard actually catches drift: four append probes (one per .bbl) and a .ts-without-.bbl probe fail with a message naming the right file; a CRLF-only copy of a .bbl still passes"
    verification:
      - kind: other
        ref: "Task 3 negative/positive probe script (append probe per file, labels.ts rename probe, events.bbl CRLF probe) — see Deviations/Probe Results below"
        status: pass
    human_judgment: false
  - id: D4
    description: "Whole-suite, lint, typecheck:test, src type check and build stay clean after the catalog reshape"
    verification:
      - kind: unit
        ref: "npx vitest run --maxWorkers=2 (whole suite)"
        status: pass
      - kind: other
        ref: "npm run lint / npm run typecheck:test / npx tsc -p tsconfig.json --noEmit / npm run build"
        status: pass
    human_judgment: false

duration: 8min
completed: 2026-09-28
status: complete
---

# Phase 118 Plan 01: Catalog Wrapper Shape & Byte-Exact .bbl Drift Guard Summary

**All four builtin catalog `.ts` files now share one wrapper shape, every hand-synced `.bbl` mirror was rewritten from its evaluated export, and a new byte-exact vitest guard (`bbl-catalog-drift.test.ts`) fails and names the file the moment any of the four pairs drift again.**

## Performance

- **Duration:** 8 min
- **Started:** 2026-09-28T20:32:00Z
- **Completed:** 2026-09-28T20:40:00Z
- **Tasks:** 3
- **Files modified:** 9 (8 lib files + 1 new test), plus 1 existing test file's comment reworded

## Accomplishments
- `events.ts`, `functions.ts`, `labels.ts` and `variables.ts` all open with `` export const builtinX = `library `` on line 1 and close with a bare `` `; `` line followed by one final newline — no `.trimLeft()`/`.trimStart()` remains anywhere
- `events.bbl`, `functions.bbl`, `labels.bbl` and `variables.bbl` were each rewritten from the evaluated `.ts` export (never hand-copied), dropping `events.bbl`'s duplicate `ON_MOUSE_ENTER`/`ON_MOUSE_EXIT` entries and `functions.bbl`'s ~260 lines of backslash-escaped-backtick drift
- New `bbj-vscode/test/bbl-catalog-drift.test.ts`: a table-driven, byte-exact (CRLF-normalised) comparison of all four `.bbl`/`.ts` pairs, plus a completeness test asserting every `.bbl` in `src/language/lib` has a table row
- `builtin-library-members.test.ts`'s stale `.ts`-vs-`.bbl` comment (which documented and tolerated the now-fixed `events.bbl` duplicate entries and claimed no drift guard existed) was reworded to describe the new byte-exact guard, with no code line changed

## Task Commits

Each task was committed atomically:

1. **Task 1: labels and variables end to end** - `1d228e53` (refactor)
2. **Task 2: events and functions get the same wrapper** - `1f2c953b` (refactor)
3. **Task 3: reword the stale equivalence comment** - `fdfbff4a` (test)

**Plan metadata:** committed separately after this SUMMARY.

## Files Created/Modified
- `bbj-vscode/test/bbl-catalog-drift.test.ts` - new byte-exact drift guard over all four catalog pairs
- `bbj-vscode/src/language/lib/events.ts` - shared wrapper shape
- `bbj-vscode/src/language/lib/events.bbl` - rewritten from the evaluated `builtinEvents` value
- `bbj-vscode/src/language/lib/functions.ts` - shared wrapper shape
- `bbj-vscode/src/language/lib/functions.bbl` - rewritten from the evaluated `builtinFunctions` value
- `bbj-vscode/src/language/lib/labels.ts` - shared wrapper shape
- `bbj-vscode/src/language/lib/labels.bbl` - rewritten from the evaluated `builtinSymbolicLabels` value
- `bbj-vscode/src/language/lib/variables.ts` - shared wrapper shape
- `bbj-vscode/src/language/lib/variables.bbl` - rewritten from the evaluated `builtinVariables` value
- `bbj-vscode/test/builtin-library-members.test.ts` - reworded `.ts`-vs-`.bbl` equivalence comment (comment-only change)

## Decisions Made
- Rewrote every `.bbl` from the evaluated `.ts` constant (throwaway `npx tsx -e` script, deleted after use — nothing committed beyond the rewritten `.bbl` files), never from the `.ts` source text, avoiding the backslash-escaped-backtick drift class the research flagged
- Applied the identical wrapper shape (opening backtick + `library` on line 1; closing backtick + `;` alone on the last line; one final newline) to all four files, even though three distinct shapes existed beforehand
- Reworded (not removed) the existing name-set equivalence comment in `builtin-library-members.test.ts` to describe the new byte-exact guard as the stricter check and the name-set test as a parse-level cross-check, keeping the edit to comment lines only (verified: 0 non-comment lines changed, 1 diff hunk)

## Deviations from Plan

None - plan executed exactly as written.

### Probe Results (Task 3)

- Four `.bbl` append probes (events, functions, labels, variables): each caught, vitest exited 1 with a message naming the right `.bbl` as drifted; `src/language/lib` restored clean after every probe — `bbl probes OK`
- `.ts`-without-`.bbl` probe (renamed `label *ENDIF` to `label *ENDIFPROBE` in `labels.ts`): caught, vitest exited 1 naming `labels.bbl has drifted from builtinSymbolicLabels` — `ts probe OK`
- CRLF-only probe (converted `events.bbl` line endings to CRLF): tolerated, vitest exited 0 — `crlf probe OK`
- `lint`, `typecheck:test`, `npx tsc -p tsconfig.json --noEmit` and `build` all exited 0 with no tracked-file changes — `gates OK`
- Whole-suite run (`npx vitest run --maxWorkers=2`, JSON reporter): `numFailedTests=0 numTotalTests=3593` — matches the standing v4.1 regression-gate rule; no failure needed a per-test base comparison

### Closing-note drafts (not posted from here)

- **#583:** The four builtin catalog `.ts` wrappers (`events.ts`, `functions.ts`, `labels.ts`, `variables.ts`) now share one closing shape — opening backtick directly followed by `library`, closing backtick alone on its own line followed by `;`, one final newline. The two dead `.trimLeft()` calls and `variables.ts`'s ASI-reliant ending are gone.
- **#603:** The `lib/*.bbl` files stay as hand-synced mirrors — no generator, no deletion. Instead, a new byte-exact vitest test (`bbl-catalog-drift.test.ts`) fails and names the file the moment a mirror drifts from its `.ts` export. The two mirrors that had actually drifted, `events.bbl` (duplicate mouse-event entries) and `functions.bbl` (backslash-escaped backticks, unmasking the CVS synopsis disagreement), were rewritten from the served values, so both now match exactly what the language server serves.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All four catalog wrappers and their `.bbl` mirrors are byte-exact and drift-guarded; REF-04 and REF-05 marked complete in REQUIREMENTS.md
- Ready for 118-02 (compiler-option drift guard, REF-06) and 118-03 (`getFunctionReference` dedup, REF-01) — both independent of this plan's files

## Self-Check: PASSED

- `bbj-vscode/test/bbl-catalog-drift.test.ts` exists on disk: FOUND
- Commit `1d228e53` found in `git log --oneline --all`: FOUND
- Commit `1f2c953b` found in `git log --oneline --all`: FOUND
- Commit `fdfbff4a` found in `git log --oneline --all`: FOUND
- All plan-level `<verification>` items re-confirmed above (drift test + existing catalog suites pass; value checks show only hidden-whitespace changes; probes pass; lint/typecheck/build/whole-suite clean)

---
*Phase: 118-small-dedup-drift-guards*
*Completed: 2026-09-28*
