---
phase: 27-ide-polish
plan: 03
subsystem: diagnostics
tags: [error-messages, linker, validator, langium]

# Dependency graph
requires:
  - phase: N/A
    provides: Existing linker and validator infrastructure
provides:
  - Enhanced linker error messages with source filenames and line numbers
  - Enhanced class visibility error messages with declaration location
  - Enhanced member visibility error messages with declaration location
affects: [all-phases]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Source location extraction using AstUtils.getDocument() + basename() + line numbers"
    - "Workspace-relative paths with fallback to document directory"

key-files:
  created: []
  modified:
    - bbj-vscode/src/language/bbj-linker.ts
    - bbj-vscode/src/language/validations/check-classes.ts
    - bbj-vscode/src/language/bbj-validator.ts

key-decisions:
  - "Use basename() for file paths (not full workspace-relative paths) for cleaner messages"
  - "1-based line numbers for human readability (LSP uses 0-based)"
  - "Graceful fallback in linker if source location extraction fails"

patterns-established:
  - "Source location format: filename:line (e.g., Helper.bbj:42)"
  - "Error message format: [message] [in filename:line] for linker errors"
  - "Error message format: [message] (declared in filename:line) for visibility errors"

# Metrics
duration: 5min
completed: 2026-02-06
---

# Phase 27 Plan 03: Error Message Enhancement Summary

**Linker and validation error messages now include source filenames with line numbers, making cross-file errors immediately diagnosable**

## Performance

- **Duration:** 5 min
- **Started:** 2026-02-06T16:34:43Z
- **Completed:** 2026-02-06T16:39:19Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Linker "Could not resolve" errors include source filename with line number
- Class visibility "not visible" errors include declaration filename with line number
- Member visibility "not visible" errors include declaration file info
- All paths use basename (not absolute paths) for clean, portable messages

## Task Commits

Each task was committed atomically:

1. **Task 1: Enhance linker error messages** - `c114470` (feat) - *Note: completed in prior session as part of 27-01 bug fixes*
2. **Task 2: Enhance class visibility error messages** - `f1d02da` (feat)

_Note: Task 1 was completed in a previous execution session but documented here for plan completeness._

## Files Created/Modified
- `bbj-vscode/src/language/bbj-linker.ts` - Override createLinkingError to append [in filename:line] to error messages
- `bbj-vscode/src/language/validations/check-classes.ts` - Extract source location in checkBBjClass, update Protected/Private error messages
- `bbj-vscode/src/language/bbj-validator.ts` - Extract source location in checkClassReference and checkMemberCallUsingAccessLevels, update error messages

## Decisions Made
- **Basename vs full paths:** Used `basename()` instead of full workspace-relative paths for cleaner, more readable error messages. Full paths would be too verbose.
- **Line number format:** 1-based line numbers (human-readable) with `:line` suffix, matching standard editor convention.
- **Graceful fallback:** Linker's getSourceLocation wrapped in try/catch to prevent enhanced messages from breaking linking if source location extraction fails.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None. Build and tests passed after both tasks.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Error messages now provide actionable context for cross-file issues
- No blockers for subsequent phases
- Improved developer experience for diagnosing linker and visibility errors

## Self-Check: PASSED

All modified files verified:
- bbj-vscode/src/language/bbj-linker.ts - FOUND (override createLinkingError + getSourceLocation)
- bbj-vscode/src/language/validations/check-classes.ts - FOUND (source location in checkBBjClass)
- bbj-vscode/src/language/bbj-validator.ts - FOUND (source location in checkClassReference and checkMemberCallUsingAccessLevels)

All commits verified:
- c114470 - FOUND (Task 1 - linker enhancement)
- f1d02da - FOUND (Task 2 - validator enhancements)

---
*Phase: 27-ide-polish*
*Completed: 2026-02-06*
