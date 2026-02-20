---
phase: 53-bbjcpl-diagnostic-integration
plan: 02
subsystem: diagnostics
tags: [bbj, bbjcpl, diagnostics, compiler, lsp, langium, debounce, status-bar]

# Dependency graph
requires:
  - phase: 53-bbjcpl-diagnostic-integration
    plan: 01
    provides: mergeDiagnostics(), getCompilerTrigger(), notifyBbjcplAvailability() in bbj-document-validator.ts and bbj-notifications.ts

provides:
  - BBjCPL compile() called from buildDocuments() after Langium validation (not from onBuildPhase)
  - 500ms trailing-edge debounce preventing CPU spike on rapid saves
  - Trigger mode routing: 'off' clears stale BBjCPL diagnostics; 'on-save'/'debounced' both debounce
  - Lazy BBjCPL availability detection via fs.accessSync on first trigger
  - bbj/bbjcplAvailability LSP notification sent to client on first detection
  - BBjCPL status bar item in extension.ts (hidden by default, shown on unavailable)
  - compilerTrigger in initializationOptions (reads bbj.compiler.trigger VS Code setting)
  - bbj-notifications.ts module isolating LSP connection from bbj-document-builder imports
  - 7 integration tests for mergeDiagnostics() covering all merge scenarios

affects:
  - extension client: status bar shows/hides on bbj/bbjcplAvailability notification
  - bbj-document-validator.ts: mergeDiagnostics() consumed from buildDocuments()

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Notification isolation pattern: bbj-notifications.ts holds connection reference initialized by main.ts, allowing shared services to send notifications without importing the entry point
    - Lazy availability detection: fs.accessSync check on first compile trigger (not at startup)
    - Trailing-edge debounce: clearTimeout+setTimeout pattern with per-file Map of timers

key-files:
  created:
    - bbj-vscode/src/language/bbj-notifications.ts
    - bbj-vscode/test/cpl-integration.test.ts
  modified:
    - bbj-vscode/src/language/bbj-document-builder.ts
    - bbj-vscode/src/language/main.ts
    - bbj-vscode/src/extension.ts

key-decisions:
  - "Extracted notifyBbjcplAvailability to bbj-notifications.ts: bbj-document-builder.ts cannot import main.ts (createConnection() runs at module load time, crashing test environments). New module holds connection reference, initialized by main.ts at startup."
  - "trackBbjcplAvailability() uses fs.accessSync to check bbjcpl binary at BBj home — simpler and more reliable than monitoring compile() return values (empty [] is ambiguous between clean file and ENOENT)"
  - "Both 'on-save' and 'debounced' trigger modes use the same 500ms debounce — distinction is preserved in the enum for future use but both trigger the same debouncedCompile() path at this integration stage"
  - "notifyDocumentPhase() called with CancellationToken.None after debounce completes — original build token is stale after 500ms, BBjCPLService handles its own internal timeout"

patterns-established:
  - "Notification isolation: shared services (document-builder) → bbj-notifications.ts → main.ts initializes connection reference. Never import main.ts from shared services."
  - "Lazy BBjCPL detection: first compile trigger checks binary existence, notifies client once, subsequent calls are no-ops (bbjcplAvailable !== undefined guard)"
  - "Clear-then-show BBjCPL diagnostics: filter out old BBjCPL diags before compile, merge new ones after — prevents stale diagnostic flicker"

requirements-completed: [CPL-05, CPL-06, CPL-07, CPL-08]

# Metrics
duration: 6min
completed: 2026-02-20
---

# Phase 53 Plan 02: BBjCPL Diagnostic Integration — Core Wiring Summary

**BBjCPLService.compile() wired into buildDocuments() with 500ms debounce, trigger mode routing, lazy availability detection, client status bar, and 7 integration tests for mergeDiagnostics()**

## Performance

- **Duration:** 6 min
- **Started:** 2026-02-20T08:42:45Z
- **Completed:** 2026-02-20T08:50:00Z
- **Tasks:** 3
- **Files modified:** 5 (3 modified, 2 created)

## Accomplishments

- Wired BBjCPLService.compile() into BBjDocumentBuilder.buildDocuments() with 500ms trailing-edge debounce — prevents CPU spike on rapid saves, prevents diagnostic flicker via clear-then-show pattern
- Added trigger mode routing: 'off' clears stale BBjCPL diagnostics and skips compile; 'on-save' and 'debounced' both use debouncedCompile()
- Added lazy BBjCPL availability detection via fs.accessSync on first compile trigger; sends bbj/bbjcplAvailability LSP notification to client
- Added client-side BBjCPL status bar item and bbj/bbjcplAvailability notification listener in extension.ts; added compilerTrigger to initializationOptions
- Extracted notifyBbjcplAvailability to isolated bbj-notifications.ts module to break circular import with main.ts (which calls createConnection() at module load time)
- Created 7 integration tests for mergeDiagnostics() covering all merge scenarios; full suite: 496 tests pass, 4 pre-existing failures unchanged

## Task Commits

Each task was committed atomically:

1. **Task 1: Wire BBjCPL into buildDocuments() with trigger modes and debounce** - `26bcdfc` (feat)
2. **Task 2: Client-side status bar and initializationOptions wiring** - `1281110` (feat)
3. **Task 3: Integration tests for merge logic and BBjCPL hierarchy** - `9491919` (test)

## Files Created/Modified

- `bbj-vscode/src/language/bbj-document-builder.ts` - runBbjcplForDocuments(), debouncedCompile(), shouldCompileWithBbjcpl(), trackBbjcplAvailability(); imports from bbj-notifications.ts (not main.ts)
- `bbj-vscode/src/language/bbj-notifications.ts` - (created) initNotifications(connection) + notifyBbjcplAvailability() — LSP notification isolated from main.ts entry point
- `bbj-vscode/src/language/main.ts` - Removed inline notifyBbjcplAvailability; imports initNotifications from bbj-notifications.ts and calls it with connection
- `bbj-vscode/src/extension.ts` - bbjcplStatusBar status bar item, bbj/bbjcplAvailability notification listener, compilerTrigger in initializationOptions
- `bbj-vscode/test/cpl-integration.test.ts` - (created) 7 unit tests for mergeDiagnostics() — all scenarios pass

## Decisions Made

- **Notification isolation via bbj-notifications.ts**: Direct import of `main.ts` from `bbj-document-builder.ts` caused `createConnection()` to execute at module load time during tests, crashing 14 test suites. Solution: create `bbj-notifications.ts` with a connection reference initialized by `main.ts` at startup via `initNotifications(connection)`.

- **fs.accessSync for availability detection**: The `compile()` return value of `[]` is ambiguous — it means both "clean file" and "ENOENT/bbjcpl not found". Binary existence check via `accessSync` is direct and reliable.

- **Both trigger modes use debounce**: The plan notes 'on-save' and 'debounced' are both implemented with the 500ms debounce. The enum distinction is preserved for future use but both route through `debouncedCompile()` at this stage — this is the correct behavior since `buildDocuments()` is already the save trigger.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Extracted notifyBbjcplAvailability to bbj-notifications.ts**
- **Found during:** Task 1 (Wire BBjCPL into buildDocuments())
- **Issue:** Importing `notifyBbjcplAvailability` from `main.ts` caused `createConnection(ProposedFeatures.all)` to execute at module load time in test environments. This crashed 14 test suites (10 more than the 4 pre-existing failures).
- **Fix:** Created `bbj-notifications.ts` with `initNotifications(connection)` + `notifyBbjcplAvailability()`. `main.ts` calls `initNotifications(connection)` at startup. `bbj-document-builder.ts` imports from `bbj-notifications.ts` only.
- **Files modified:** bbj-vscode/src/language/bbj-notifications.ts (created), bbj-vscode/src/language/main.ts (removed old export, added initNotifications call), bbj-vscode/src/language/bbj-document-builder.ts (import target changed)
- **Verification:** `npx vitest run` — 496 tests pass, 4 pre-existing failures (same as before changes)
- **Committed in:** `26bcdfc` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (Rule 3 - blocking circular import in test environment)
**Impact on plan:** Auto-fix is an architectural improvement — the notification isolation pattern is better than the direct import approach. No scope creep; plan's original `notifyBbjcplAvailability()` function still exists with identical behavior in the new module.

## Issues Encountered

- Circular import via main.ts: discovered during Task 1 test run. Fixed by extracting notification function to isolated module. The plan anticipated the circular import concern for `BBjServices` type (and correctly handled it with `import type`) but did not anticipate the runtime impact of importing `notifyBbjcplAvailability` from `main.ts`.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 53 complete: end-to-end BBjCPL diagnostic integration is ready
- BBjCPL errors will appear in the Problems panel after saving .bbj files (when BBj is installed and configured)
- Status bar shows "BBjCPL: unavailable" when BBj is not installed — Langium diagnostics work normally
- v3.7 milestone requirements CPL-05 through CPL-08 are complete

## Self-Check: PASSED

- FOUND: bbj-vscode/src/language/bbj-document-builder.ts
- FOUND: bbj-vscode/src/language/bbj-notifications.ts
- FOUND: bbj-vscode/test/cpl-integration.test.ts
- FOUND: .planning/phases/53-bbjcpl-diagnostic-integration/53-02-SUMMARY.md
- FOUND commit: 26bcdfc (Task 1)
- FOUND commit: 1281110 (Task 2)
- FOUND commit: 9491919 (Task 3)

---
*Phase: 53-bbjcpl-diagnostic-integration*
*Completed: 2026-02-20*
