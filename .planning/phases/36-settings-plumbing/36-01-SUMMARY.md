---
phase: 36-settings-plumbing
plan: 01
subsystem: configuration
tags: [settings, logging, hot-reload]

dependency_graph:
  requires:
    - phase: 35
      plan: 01
      provides: "logger singleton with LogLevel enum and setLevel()"
  provides:
    - "bbj.debug boolean setting registered in VS Code settings schema"
    - "onDidChangeConfiguration handler with logger integration"
    - "Quiet startup: ERROR level until first document validation"
    - "Hot-reload: debug=true→DEBUG, false→WARN without LS restart"
  affects:
    - "VS Code settings UI (new bbj.debug checkbox)"
    - "LS startup output (quiet until workspace init)"
    - "Future console.* migration (Phase 37 will use logger)"

tech_stack:
  added: []
  patterns:
    - "LSP didChangeConfiguration protocol for settings hot-reload"
    - "Deferred logger level application for quiet startup"
    - "Explicit boolean check (debug === true) for safe undefined/null handling"

key_files:
  created: []
  modified:
    - path: "bbj-vscode/package.json"
      lines_changed: "+6"
      purpose: "Added bbj.debug boolean setting schema"
    - path: "bbj-vscode/src/language/main.ts"
      lines_changed: "+26 / -1"
      purpose: "Imported logger, added pendingDebugLevel tracking, wired onDidChangeConfiguration"
    - path: "bbj-vscode/test/logger.test.ts"
      lines_changed: "+97"
      purpose: "Added 8 integration tests for settings-to-logger mapping"

decisions: []

metrics:
  tasks_completed: 2
  files_modified: 3
  lines_added: 129
  lines_removed: 1
  commits: 2
  tests_added: 8
  tests_passing: 25
  duration_minutes: 2
  completed: "2026-02-08"
---

# Phase 36 Plan 01: Settings Plumbing Summary

**One-liner:** VS Code bbj.debug setting hot-reloads logger level (DEBUG/WARN) via LSP configuration protocol with quiet startup until first document validation completes.

## What Was Built

Wired the `bbj.debug` boolean setting from VS Code settings UI through the LSP `onDidChangeConfiguration` handler to the logger singleton, enabling hot-reloadable debug output control without LS restart.

**Core mechanism:**
1. **Quiet startup:** Logger defaults to ERROR level (from Phase 35)
2. **Pre-workspace init:** onDidChangeConfiguration stores user's debug preference in `pendingDebugLevel`
3. **First validation:** onBuildPhase(Validated) applies pendingDebugLevel once workspace initialized
4. **Post-startup:** Subsequent config changes apply immediately via `logger.setLevel()`

**Mapping logic:**
- `config.debug === true` → `LogLevel.DEBUG` (verbose output)
- `config.debug !== true` → `LogLevel.WARN` (quiet mode, warnings visible)
- Explicit `=== true` check handles undefined/null safely

## Technical Implementation

### package.json Changes

Added `bbj.debug` setting to `contributes.configuration.properties`:

```json
"bbj.debug": {
  "type": "boolean",
  "default": false,
  "description": "Enable debug logging in the BBj language server. Shows detailed diagnostics, class loading, and validation messages.",
  "scope": "window"
}
```

Positioned BEFORE `bbj.home` so it appears first in settings UI (most commonly toggled).

### main.ts Changes

**Imports:**
```typescript
import { logger, LogLevel } from './logger.js';
```

**Quiet startup tracking:**
```typescript
let pendingDebugLevel: LogLevel = LogLevel.WARN; // Default when debug=false

shared.workspace.DocumentBuilder.onBuildPhase(DocumentState.Validated, () => {
    if (!workspaceInitialized) {
        workspaceInitialized = true;
        // Quiet startup complete: apply user's debug preference
        logger.setLevel(pendingDebugLevel);
    }
});
```

**Configuration handler:**
```typescript
connection.onDidChangeConfiguration(async (change) => {
    shared.workspace.ConfigurationProvider.updateConfiguration(change);

    const config = change.settings?.bbj;
    if (!config) return;

    // Apply debug setting to logger
    if (config.debug !== undefined) {
        const newLevel = config.debug === true ? LogLevel.DEBUG : LogLevel.WARN;
        if (workspaceInitialized) {
            logger.setLevel(newLevel); // Post-startup: immediate
        } else {
            pendingDebugLevel = newLevel; // Pre-startup: deferred
        }
    }

    // ... existing Java interop reload logic unchanged ...
});
```

### Test Coverage

Added 8 integration tests in `logger.test.ts`:

1. **Mapping logic:** debug=true/false/undefined/null → LogLevel conversion
2. **Hot-reload:** setLevel updates logger behavior correctly
3. **Quiet startup:** ERROR level suppresses warn/info during startup
4. **Error always emits:** ERROR messages never suppressed
5. **Persistence:** Multiple setLevel calls work without desync

**Test results:** 25/25 passing (17 existing + 8 new)

## Integration Points

**Input:** VS Code settings UI (`bbj.debug` checkbox) → LSP `workspace/didChangeConfiguration` notification

**Processing:**
1. Langium's ConfigurationProvider updated first (keeps internals in sync)
2. BBj-specific handler reads `config.debug`
3. Logger level applied immediately (post-startup) or deferred (pre-startup)

**Output:** Logger singleton level updated → affects all future `logger.debug()` calls

**Existing handlers preserved:** Java interop reload logic in onDidChangeConfiguration unchanged

## Verification

### Success Criteria Met

✅ **TypeScript compilation:** Zero errors
✅ **All tests passing:** 25/25 (17 existing + 8 new integration tests)
✅ **bbj.debug registered:** Appears in package.json with correct schema
✅ **Logger integration:** main.ts imports logger and calls setLevel()
✅ **Quiet startup:** ERROR level until onBuildPhase(Validated) fires
✅ **Hot-reload:** Subsequent config changes apply immediately

### Manual Verification Steps

1. Open VS Code, enable `bbj.debug` setting
2. Observe "Log level changed to DEBUG" in LS output channel
3. Open BBj file → see detailed validation/class loading messages
4. Disable `bbj.debug` setting
5. Observe "Log level changed to WARN" → debug output stops
6. No LS restart required for any of these changes

## Deviations from Plan

None - plan executed exactly as written. No bugs discovered, no blocking issues encountered, no architectural changes needed.

## Next Phase Readiness

**Phase 37 (Console Migration) can proceed immediately.**

Phase 37 will systematically replace 56 console.* call sites with logger.* equivalents:
- console.log() → logger.debug()
- console.warn() → logger.warn()
- console.error() → logger.error()

**Blockers:** None

**Dependencies satisfied:**
- ✅ Logger singleton exists (Phase 35)
- ✅ bbj.debug setting wired (Phase 36 Plan 01)
- ✅ Hot-reload working without LS restart

## Files Modified

| File | Purpose | Changes |
|------|---------|---------|
| bbj-vscode/package.json | Settings schema | +6 lines (bbj.debug definition) |
| bbj-vscode/src/language/main.ts | Configuration handler | +26/-1 lines (logger integration) |
| bbj-vscode/test/logger.test.ts | Integration tests | +97 lines (8 new tests) |

## Commits

| Hash | Type | Message |
|------|------|---------|
| b840f2e | feat | Wire bbj.debug setting to logger singleton |
| f21b251 | test | Add settings integration tests for logger |

**Total changes:** 3 files modified, +129/-1 lines, 2 commits

## Self-Check: PASSED

✅ **Files exist:**
- bbj-vscode/package.json (modified, bbj.debug present)
- bbj-vscode/src/language/main.ts (modified, logger imported)
- bbj-vscode/test/logger.test.ts (modified, 8 tests added)

✅ **Commits exist:**
- b840f2e: feat(36-01): wire bbj.debug setting to logger singleton
- f21b251: test(36-01): add settings integration tests for logger

✅ **TypeScript compiles:** Zero errors
✅ **Tests pass:** 25/25 passing
✅ **Schema valid:** bbj.debug appears in package.json with correct type/description
✅ **Integration verified:** onDidChangeConfiguration calls logger.setLevel()

All claims verified. Plan 36-01 complete.
