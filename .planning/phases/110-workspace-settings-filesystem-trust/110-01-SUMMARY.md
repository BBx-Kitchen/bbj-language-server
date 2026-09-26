---
phase: 110-workspace-settings-filesystem-trust
plan: 01
subsystem: language-server
tags: [interop, validation, langium, vscode, intellij]

# Dependency graph
requires: []
provides:
  - "interop-config.ts: the only owner of DEFAULT_INTEROP_HOST/PORT and validateInteropConfig, used by both server entry points and JavaInteropService itself"
  - "JavaInteropService.setConnectionConfig(host: unknown, port: unknown) validating every value itself, plus getConnectionConfig() read accessor"
affects: [111-java-class-data-from-the-interop-peer]

# Actuals (#2632)
actuals:
  tokens: 5565
  tasks: 2
  commits: 2

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Plain, Langium-free validator module (interop-config.ts) mirroring config-path-resolver.ts's injectable/import-free shape"
    - "setConnectionConfig validates internally so no caller (VS Code or IntelliJ initialization options, or the configuration-change handler) can bypass validation"

key-files:
  created:
    - bbj-vscode/src/language/interop-config.ts
    - bbj-vscode/test/interop-config.test.ts
  modified:
    - bbj-vscode/src/language/java-interop.ts
    - bbj-vscode/src/language/bbj-ws-manager.ts
    - bbj-vscode/src/language/main.ts

key-decisions:
  - "Followed D-01..D-04 as written: one plain module, per-field fallback, silent fallback for absent values, one warning per rejected present-but-invalid value"
  - "Default host consolidated to 'localhost' everywhere (D-02), replacing the three-way disagreement ('localhost' x2, '127.0.0.1' x1)"

patterns-established:
  - "A shared validator that the low-level setter itself calls, so both current and any future entry point (client push, initialization options, a later capability) is covered without duplicating validation logic"

requirements-completed: [SEC-01, REF-02]

coverage:
  - id: D1
    description: "One plain module (no Langium/editor imports) holds the only copy of the interop host/port defaults and a validator that rejects a non-string/empty host or a non-integer/out-of-range port, falling back per field with a logged warning for present-but-invalid values and silent fallback for absent values"
    requirement: SEC-01
    verification:
      - kind: unit
        ref: "test/interop-config.test.ts#validateInteropConfig (table + boundary cases)"
        status: pass
      - kind: integration
        ref: "test/interop-config.test.ts#interop settings from the initialization options (issue #509, #510)"
        status: pass
      - kind: integration
        ref: "test/interop-config.test.ts#interop settings from a configuration change (issue #509, #510)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Both server entry points (bbj-ws-manager.ts initialization options, main.ts configuration-change handler) hand raw values straight to setConnectionConfig with no default of their own; the defaults exist exactly once under bbj-vscode/src/language"
    requirement: REF-02
    verification:
      - kind: unit
        ref: "test/interop-config.test.ts#main.ts configuration-change call site (source pin)"
        status: pass
      - kind: other
        ref: "grep -rlE \"'localhost'|'127\\.0\\.0\\.1'\" bbj-vscode/src/language -> exactly interop-config.ts; grep -rnE \"(=|\\|\\|)\\s*5008\\b\" bbj-vscode/src/language -> exactly interop-config.ts"
        status: pass
    human_judgment: false

duration: 9min
completed: 2026-09-26
status: complete
---

# Phase 110 Plan 01: Shared Interop Host/Port Validator Summary

**One plain `interop-config.ts` module now owns the only copy of the interop defaults and a per-field validator, with `JavaInteropService.setConnectionConfig` validating every value itself so both server entry points — and IntelliJ, without any IntelliJ change — are covered.**

## Performance

- **Duration:** 9 min
- **Started:** 2026-09-26T11:35:00Z
- **Completed:** 2026-09-26T11:43:58Z
- **Tasks:** 2
- **Files modified:** 5 (2 created, 3 modified)

## Accomplishments
- `interop-config.ts` exports `DEFAULT_INTEROP_HOST` ('localhost'), `DEFAULT_INTEROP_PORT` (5008), `INTEROP_HOST_SETTING`, `INTEROP_PORT_SETTING`, `InteropRejection`, `ValidatedInteropConfig`, `validateInteropConfig`, and `formatInteropRejection` — a plain module with zero imports
- `JavaInteropService.setConnectionConfig(host: unknown, port: unknown)` validates every call through `validateInteropConfig`, logs one `logger.warn` per rejected (present-but-invalid) value, and falls back per field to the shared defaults; absent (`undefined`/`null`) values fall back silently
- `JavaInteropService.getConnectionConfig()` added as a read accessor
- `bbj-ws-manager.ts`'s `onInitialize` and `main.ts`'s `onDidChangeConfiguration` both pass raw values straight into `setConnectionConfig` with no local `||` fallback
- The interop default host/port literal now exists exactly once in `bbj-vscode/src/language` (interop-config.ts), collapsing the prior three-way disagreement (`'localhost'` x2, `'127.0.0.1'` x1)

## Task Commits

Each task was committed atomically:

1. **Task 1: Initialization options reach the interop service only through the shared validator, end to end** - `0cf92b10` (feat)
2. **Task 2: The configuration-change entry point uses the same validator, and the defaults exist once** - `6e30d8e1` (feat)

## Files Created/Modified
- `bbj-vscode/src/language/interop-config.ts` - the only owner of the interop defaults and their validation
- `bbj-vscode/src/language/java-interop.ts` - `setConnectionConfig` now validates internally; `getConnectionConfig()` added
- `bbj-vscode/src/language/bbj-ws-manager.ts` - `onInitialize` passes raw initialization-option values through
- `bbj-vscode/src/language/main.ts` - `onDidChangeConfiguration` passes raw pushed values through
- `bbj-vscode/test/interop-config.test.ts` - validator table, initialization-options path, configuration-change path, main.ts call-site pin

## Decisions Made
- Followed D-01 through D-04 exactly as CONTEXT.md specified — no deviations from the locked decisions.
- `formatInteropRejection` renders string values with `JSON.stringify` (so a newline in a rejected host can't forge a second log line) and caps rendered values at 100 characters, matching T-110-02/T-110-03 of the threat model.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

The whole-suite regression gate (`RUN_BBJ_TESTS=0 npm --prefix bbj-vscode test -- --maxWorkers=2`) reported 10 failed test *files* but only 1 failed *test*. All 10 file-level failures are `beforeAll`/`initializeWorkspace` hook timeouts — the documented `initializeWorkspace` hook-contention pattern (`RU-61-05`/MEMORY.md), unrelated to this plan's files. The single failed test, `test/functional/installed-extension-e2e.test.ts > every composer kind carries its cue > setopts-in-code cue appears only on the absolute literal and the safe chain's SETOPTS line`, is a documented pre-existing issue (stale installed extension bundle; unrelated SETOPTS-composer domain). Confirmed pre-existing: `git diff c591cfe8 HEAD -- bbj-vscode/test/functional/installed-extension-e2e.test.ts` is empty (the test file is byte-identical to the phase base), and none of this plan's changed files (`interop-config.ts`, `java-interop.ts`, `bbj-ws-manager.ts`, `main.ts`) touch the composer/SETOPTS code path. The plan's own targeted verification commands (Task 1 and Task 2 `<verify>` blocks) all passed with 0 failures.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- `interop-config.ts` and its `isPathInside`-shaped module conventions are ready for plan 110-02 (`path-containment.ts`, SEC-06/SEC-07), which the plan's own "Artifacts this phase produces" section already scopes.
- SEC-01 and REF-02 are complete; issues #509, #510, #581 (interop portion) are addressed in code — closing keywords go in the milestone PR, not in these commits.
- No blockers for the next plan in this phase.

---
*Phase: 110-workspace-settings-filesystem-trust*
*Completed: 2026-09-26*

## Self-Check: PASSED
