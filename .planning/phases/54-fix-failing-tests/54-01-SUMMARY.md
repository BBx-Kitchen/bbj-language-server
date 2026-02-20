---
phase: 54-fix-failing-tests
plan: 01
subsystem: testing
tags: [vitest, langium, access-control, error-messages, regex]

# Dependency graph
requires: []
provides:
  - TEST-01 passing: classes.test.ts private class access assertion uses toContain()
  - TEST-02 passing: classes.test.ts protected class access assertion uses toContain()
  - TEST-05 passing: validation.test.ts instance member access assertions use RegExp
  - TEST-06 passing: validation.test.ts static member access assertions use RegExp
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Use toContain() instead of toBe() for error message assertions to tolerate format changes"
    - "Use RegExp with .*  in expectError() calls to match messages with optional suffix like (in file:line)"

key-files:
  created: []
  modified:
    - bbj-vscode/test/classes.test.ts
    - bbj-vscode/test/validation.test.ts

key-decisions:
  - "Substring matching (toContain) chosen over exact match (toBe) for class access-level errors — tolerates future format changes"
  - "RegExp matching chosen for Langium expectError() calls — tolerates (in file:line) suffix in enhanced error messages"

patterns-established:
  - "Pattern: prefer toContain/RegExp over toBe/string for error message assertions in Langium tests"

requirements-completed: [TEST-01, TEST-02, TEST-05, TEST-06]

# Metrics
duration: 2min
completed: 2026-02-20
---

# Phase 54 Plan 01: Fix Failing Tests Summary

**Fixed 4 failing access-level error message assertions by switching from exact-match to substring/RegExp matching to tolerate the (declared in file:line) source location suffix added to error messages.**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-20T10:21:53Z
- **Completed:** 2026-02-20T10:23:55Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- TEST-01: classes.test.ts "Cannot access private class from different file" now uses `toContain()` — passes green
- TEST-02: classes.test.ts "Cannot access protected class from different non-related folder file" now uses `toContain()` — passes green
- TEST-05: validation.test.ts "Call instance members with different access levels" — 6 `expectError` calls switched from string to RegExp — passes green
- TEST-06: validation.test.ts "Call static members with different access levels" — 6 `expectError` calls switched from string to RegExp — passes green
- No regressions introduced; all previously passing tests continue to pass

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix class access-level error message assertions (TEST-01, TEST-02)** - `ff1c2c2` (fix)
2. **Task 2: Fix member access-level error message assertions (TEST-05, TEST-06)** - `f4a2a9a` (fix)

## Files Created/Modified

- `/Users/beff/_workspace/bbj-language-server/bbj-vscode/test/classes.test.ts` - Lines 53-54 and 81-82: `.toBe()` changed to `.toContain()` for private and protected class access-level assertions
- `/Users/beff/_workspace/bbj-language-server/bbj-vscode/test/validation.test.ts` - Lines 300-323 and 362-385: 12 `expectError` string arguments replaced with RegExp literals using `.*is not visible` pattern

## Decisions Made

- Use `toContain()` for class error message assertions (first assertion checks class name mentioned, second checks visibility fragment) — resilient to message format changes
- Use RegExp (`/The member '...' from the type '...'.*is not visible/`) for Langium `expectError()` calls — Langium's `expectError` supports RegExp using `regexp.test(d.message)` internally

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

Full test suite revealed 2 pre-existing failures unrelated to this plan:
- `completion-test.test.ts > DEF FN parameters with $ suffix inside class method` — TEST-03 (known pre-existing)
- `imports.test.ts > USE referencing file with no classes shows file-path error` — pre-existing, out of scope for this plan

Both were logged as pre-existing and not touched.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- TEST-01, TEST-02, TEST-05, TEST-06 are all green
- Remaining pre-existing failures (TEST-03 and imports failure) are candidates for follow-on phases

## Self-Check: PASSED

- FOUND: bbj-vscode/test/classes.test.ts
- FOUND: bbj-vscode/test/validation.test.ts
- FOUND: .planning/phases/54-fix-failing-tests/54-01-SUMMARY.md
- FOUND commit: ff1c2c2
- FOUND commit: f4a2a9a

---
*Phase: 54-fix-failing-tests*
*Completed: 2026-02-20*
