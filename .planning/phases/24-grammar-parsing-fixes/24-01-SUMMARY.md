---
phase: 24-grammar-parsing-fixes
plan: 01
subsystem: grammar
tags: [chevrotain, lexer, tokenization, bbj-keywords]

# Dependency graph
requires:
  - phase: 20-langium-4
    provides: Langium 4 upgrade with Chevrotain tokenization infrastructure
provides:
  - Chevrotain LONGER_ALT configuration on all keyword tokens
  - Keyword-prefixed identifiers (getResult, isNew, readData) tokenize correctly as single ID tokens
  - Test suite verifying labels, GOTO targets, field names, and variable names with keyword prefixes
affects: [25-grammar-parsing-fixes, 26-grammar-parsing-fixes]

# Tech tracking
tech-stack:
  added: []
  patterns: [chevrotain-longer-alt, keyword-identifier-disambiguation]

key-files:
  created: []
  modified:
    - bbj-vscode/src/language/bbj-token-builder.ts
    - bbj-vscode/test/parser.test.ts

key-decisions:
  - "Apply LONGER_ALT to ALL keyword tokens (future-proof), not just known conflicts"
  - "Use readData instead of forEach in tests (FOR keyword context-sensitive)"

patterns-established:
  - "Chevrotain LONGER_ALT property used for keyword/identifier disambiguation"

# Metrics
duration: 34min
completed: 2026-02-06
---

# Phase 24 Plan 01: Grammar & Parsing Fixes - GRAM-02 Summary

**Chevrotain LONGER_ALT configuration enables camel-case identifiers with embedded keywords (getResult, isNew, readData) to tokenize as single ID tokens**

## Performance

- **Duration:** 34 min
- **Started:** 2026-02-06T06:50:10Z
- **Completed:** 2026-02-06T07:24:20Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Added LONGER_ALT property to all keyword tokens in BBjTokenBuilder
- Chevrotain lexer now prefers longer ID match over keyword when identifier starts with keyword
- Labels, GOTO targets, field names, and variable names with keyword prefixes parse without error
- 4 new test cases verify GRAM-02 fix across all identifier contexts

## Task Commits

Each task was committed atomically:

1. **Task 1: Add LONGER_ALT to keyword tokens** - `8ec5fec` (feat)
2. **Task 2: Add tests for keyword-prefixed identifiers (GRAM-02)** - `f40aee3` (test)

_No plan metadata commit (planning docs not committed per project config)_

## Files Created/Modified
- `bbj-vscode/src/language/bbj-token-builder.ts` - Added LONGER_ALT property to all keyword tokens and RELEASE_NL/RELEASE_NO_NL terminals
- `bbj-vscode/test/parser.test.ts` - Added 4 test cases for GRAM-02: labels, GOTO/GOSUB, field names, variable names with keyword prefixes

## Decisions Made

**1. Apply LONGER_ALT to ALL keyword tokens**
- Rationale: Future-proof against any keyword prefix conflicts, not just known cases (GET, IS, FOR, NEW, READ)
- Applied to all tokens matching criteria: uppercase name, not terminal, not excluded, no LINE_BREAKS

**2. Used readData instead of forEach in tests**
- Rationale: FOR is context-sensitive keyword (part of FOR loop syntax), readData is clearer test case

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - Chevrotain LONGER_ALT property worked as documented. Test suite integration straightforward.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- GRAM-02 (keyword-prefixed identifiers) complete and tested
- Ready for GRAM-03 (other grammar fixes) in next plan
- No blockers

## Self-Check: PASSED

All modified files exist. All commit hashes verified.

---
*Phase: 24-grammar-parsing-fixes*
*Completed: 2026-02-06*
