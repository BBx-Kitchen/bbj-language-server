---
phase: 52-bbjcpl-foundation
plan: 02
subsystem: language-server
tags: [bbjcpl, diagnostics, lsp, process-lifecycle, vitest, spawn, abort]

# Dependency graph
requires:
  - 52-01 (parseBbjcplOutput() function)
provides:
  - BBjCPLService class: compile(), setTimeout(), isCompiling() methods
  - BBjCPLService registered as services.compiler.BBjCPLService in Langium DI
  - Lifecycle tests: abort-on-resave, ENOENT, inFlight cleanup
affects:
  - 53 — Phase 53 wires compile() into buildDocuments() via services.compiler.BBjCPLService

# Tech tracking
tech-stack:
  added: []
  patterns:
    - cancel flag + proc.kill() for process abort (safer than AbortController with ENOENT spawns)
    - race-safe inFlight map: handlers compare handle identity before cleanup
    - settle() wrapper function: prevents double-resolve in Promise when both error and close fire

key-files:
  created:
    - bbj-vscode/src/language/bbj-cpl-service.ts
    - bbj-vscode/test/cpl-service.test.ts
  modified:
    - bbj-vscode/src/language/bbj-module.ts

key-decisions:
  - "AbortController.abort() on ENOENT spawn (proc.pid=undefined) sends kill signal to process group 0 — kills vitest worker. Fix: use cancel flag + proc.kill() only when proc.pid !== undefined"
  - "CompileHandle interface with cancel() method replaces AbortController in inFlight map — separates abort-on-resave logic from process signal handling"
  - "settle() wrapper prevents double-resolve when both error and close events fire (ENOENT triggers both)"
  - "No AbortController passed to spawn — timeout uses setTimeout + proc.kill() directly; cancellation uses handle.cancel()"

patterns-established:
  - "Process lifecycle: spawn without signal, cancel via cancel flag + proc.kill(), timeout via clearTimeout + proc.kill()"
  - "Race-safe inFlight map: store CompileHandle in map, check handle identity in close/error handlers before cleanup"

requirements-completed: [CPL-02, CPL-04]

# Metrics
duration: 12min
completed: 2026-02-20
---

# Phase 52 Plan 02: BBjCPL Process Lifecycle Service Summary

**BBjCPLService with spawn-based process lifecycle (cancel flag + proc.kill()), abort-on-resave, ENOENT graceful degradation, and Langium DI registration**

## Performance

- **Duration:** 12 min
- **Started:** 2026-02-20T03:57:21Z
- **Completed:** 2026-02-20T04:09:58Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Created `BBjCPLService` class in `bbj-cpl-service.ts` with spawn-based bbjcpl invocation
- Implemented race-safe abort-on-resave: `inFlight` map stores `CompileHandle` with `cancel()` method; second `compile()` call cancels first via `handle.cancel()` which sets a flag and kills the process if it has a valid PID
- Implemented timeout via `setTimeout` + `proc.kill()` directly (no AbortController signal on spawn)
- Implemented ENOENT graceful degradation: `error` handler checks `err.code === 'ENOENT'` and returns `[]`
- Registered `BBjCPLService` in `BBjAddedServices` type and `BBjModule` object in `bbj-module.ts`
- Phase 53 can call `services.compiler.BBjCPLService.compile(filePath)` from `buildDocuments()`
- 8 lifecycle tests all passing; 6 pre-existing test failures unchanged

## Task Commits

1. **Task 1: BBjCPLService class** — `d19f52e` (feat)
2. **Task 2: DI registration + lifecycle tests** — `db3c469` (feat)

_Note: Task 1 commit was amended as part of Task 2 (bug fix to service implementation discovered during test execution)_

## Files Created/Modified

- `bbj-vscode/src/language/bbj-cpl-service.ts` — BBjCPLService with compile(), setTimeout(), isCompiling(); cancel flag + proc.kill() lifecycle
- `bbj-vscode/src/language/bbj-module.ts` — Added BBjCPLService to BBjAddedServices type and BBjModule object
- `bbj-vscode/test/cpl-service.test.ts` — 8 lifecycle tests: empty bbjHome, ENOENT, inFlight cleanup, setTimeout, isCompiling, abort-on-resave, path derivation

## Decisions Made

- **AbortController crash:** Using `AbortController` with `spawn()` when the binary doesn't exist (ENOENT) causes `proc.pid = undefined`. Calling `abort()` on that controller sends a kill signal to process group 0, which kills the parent process (the vitest worker). Fixed by removing `signal` from `spawn()` options and using a `cancelled` flag + `proc.kill()` only when `proc.pid !== undefined`.

- **CompileHandle interface:** Instead of storing `AbortController` in `inFlight`, store a `CompileHandle` object with a `cancel()` method. This encapsulates the cancellation logic safely and allows Phase 53 to cancel in-flight compilations without worrying about process lifecycle edge cases.

- **settle() helper:** Wraps `resolve()` to prevent double-resolution when both the `error` event and the `close` event fire on the same process (which happens with ENOENT — both events fire). The first call to `settle()` wins; subsequent calls are no-ops.

- **Timeout implementation:** Uses `setTimeout` (Node.js global) + `proc.kill()` directly, without `AbortController`. The `clearTimeout` is called from both `close` and `error` handlers to prevent the timeout from firing after the process has already settled.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] AbortController.abort() with ENOENT spawn kills the vitest worker**

- **Found during:** Task 2 — abort-on-resave test (test 6) caused exit code 144 (SIGURG/process group kill)
- **Issue:** The original implementation used `AbortController` for both timeout and abort-on-resave. When `existing.abort()` was called on a controller linked to a spawn that got ENOENT (before the error event fired), Node.js tried to kill `proc.pid = undefined`, sending SIGTERM to process group 0, which killed the entire vitest worker.
- **Investigation:** Binary search through tests confirmed test 6 (abort-on-resave) caused the crash. Isolated with direct Node.js test: `spawn('/nonexistent/binary', [...])` followed immediately by `controller.abort()` crashes with exit 144.
- **Fix:** Removed `signal` parameter from `spawn()`. Replaced `AbortController` in `inFlight` with a `CompileHandle` interface. Cancel method checks `proc.pid !== undefined` before calling `proc.kill()`. Added `cancelled` flag for coordinating abort state. Added `settle()` helper to prevent double-resolve.
- **Files modified:** `bbj-vscode/src/language/bbj-cpl-service.ts` (complete rewrite of process lifecycle section)
- **Committed in:** `db3c469` (combined with DI registration and tests)

---

**Total deviations:** 1 auto-fixed process lifecycle bug (critical — crashed test runner)
**Impact on plan:** Both must-haves are satisfied with the new implementation. The fix is strictly better than the original: no AbortController crash, same semantics for abort-on-resave, timeout, and ENOENT graceful degradation.

## Self-Check: PASSED

Files confirmed present:
- `bbj-vscode/src/language/bbj-cpl-service.ts` — FOUND
- `bbj-vscode/src/language/bbj-module.ts` — FOUND (modified)
- `bbj-vscode/test/cpl-service.test.ts` — FOUND

Commits confirmed:
- `d19f52e` — FOUND (Task 1: BBjCPLService class)
- `db3c469` — FOUND (Task 2: DI registration + lifecycle tests)

TypeScript: zero errors (`npx tsc --noEmit`)
Tests: 8 new tests pass, 6 pre-existing failures unchanged

---
*Phase: 52-bbjcpl-foundation*
*Completed: 2026-02-20*
