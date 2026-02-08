---
phase: 35-logger-infrastructure
plan: 01
subsystem: infra
tags: [logging, singleton, typescript, zero-overhead]

# Dependency graph
requires:
  - phase: N/A
    provides: N/A (foundation layer)
provides:
  - Logger singleton with LogLevel enum for level-based filtering
  - Lazy evaluation via callback form for zero overhead when disabled
  - Scoped logger factory for component-tagged debug messages
affects: [36-settings-plumbing, 37-console-migration]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - ES6 module-scoped singleton pattern
    - Lazy evaluation via union type (string | (() => string))
    - Numeric enum for O(1) level comparison

key-files:
  created:
    - bbj-vscode/src/language/logger.ts
    - bbj-vscode/test/logger.test.ts
  modified: []

key-decisions:
  - "Regular enum (not const enum) for better debuggability and isolatedModules compatibility"
  - "ISO 8601 timestamps on debug messages only, plain text for info/warn/error"
  - "Default level ERROR (quietest startup) before settings load"
  - "Scoped loggers expose debug method only (component tags matter for debug output)"

patterns-established:
  - "Logger works immediately at module import time, before DI containers initialize"
  - "Zero-overhead logging via lazy callbacks prevents string interpolation when disabled"

# Metrics
duration: 1 min
completed: 2026-02-08
---

# Phase 35 Plan 01: Logger Infrastructure Summary

**Lightweight logger singleton (~60 lines) with level-based filtering, lazy evaluation via callbacks, and zero overhead when disabled**

## Performance

- **Duration:** 1 min
- **Started:** 2026-02-08T14:27:33Z
- **Completed:** 2026-02-08T14:28:52Z
- **Tasks:** 2
- **Files modified:** 2 (both created)

## Accomplishments
- Logger singleton with debug(), info(), warn(), error() methods using ES6 module-scoped pattern
- LogLevel enum (ERROR=0, WARN=1, INFO=2, DEBUG=3) with O(1) numeric comparison
- Lazy message evaluation via string | (() => string) union type — callbacks only invoked when level enabled
- Scoped logger factory logger.scoped(component) prepends component tag on debug messages
- Comprehensive test coverage (17 tests) verifying level filtering, lazy evaluation, zero overhead, output format

## Task Commits

Each task was committed atomically:

1. **Task 1: Create logger singleton module** - `5882034` (feat)
2. **Task 2: Create logger unit tests** - `d3eb84f` (test)

**Plan metadata:** Not yet committed (pending STATE.md update)

## Files Created/Modified
- `bbj-vscode/src/language/logger.ts` - Logger singleton (~67 lines) with LogLevel enum, lazy evaluation, scoped factory
- `bbj-vscode/test/logger.test.ts` - Unit tests (270 lines, 17 tests) verifying all success criteria

## Decisions Made

**Regular enum instead of const enum:** Used regular numeric enum for LogLevel to ensure compatibility with isolatedModules (may be used in IntelliJ LSP4IJ builds) and better debuggability. Performance difference for 4 enum values is negligible.

**ISO 8601 timestamps on debug only:** Debug messages include full ISO timestamp via toISOString() for unambiguous log analysis. Info/warn/error messages are plain text for cleaner output.

**Default level ERROR:** Logger defaults to ERROR level before settings load to ensure quietest possible startup. Phase 36 will wire setLevel() to settings changes.

**Scoped loggers expose debug only:** Scoped logger factory returns object with debug() method only, as component tags are most valuable for debug-level output where identifying the source matters.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - implementation straightforward, all tests passed on first run.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

**Ready for Phase 36 (Settings Plumbing):**
- Logger singleton complete and tested
- setLevel() method ready to wire to onDidChangeConfiguration handler
- isDebug() method ready for conditional logging blocks
- Default ERROR level ensures quiet startup

**Blockers:** None

**Notes for Phase 36:**
- Need to map bbj.debug boolean setting to LogLevel.WARN (off) or LogLevel.DEBUG (on)
- Call logger.setLevel() in onDidChangeConfiguration handler
- Temporary ERROR level override during startup (until first document validation completes)

## Self-Check: PASSED

**Created files verified:**
- ✓ bbj-vscode/src/language/logger.ts exists
- ✓ bbj-vscode/test/logger.test.ts exists

**Commits verified:**
- ✓ 5882034 (feat: logger singleton module)
- ✓ d3eb84f (test: logger unit tests)

---
*Phase: 35-logger-infrastructure*
*Completed: 2026-02-08*
