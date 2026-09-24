---
phase: 102-live-compiler-diagnostics-with-backward-compatibility
plan: 01
subsystem: language-server
tags: [langium, jsonrpc, diagnostics, java-interop, vitest, compiler-diagnostics]

# Dependency graph
requires:
  - phase: 101-bbj-parser-endpoint-in-bbj-ls
    provides: "the parseProgram wire contract (ParseProgramParams/ParseProgramResult/ParseError, one-based editor coordinates, RequestCancelled supersession, -33001..-33005 error codes) that this plan's client codes to"
provides:
  - "A thin parseProgram() pass-through and a connectionGeneration counter on JavaInteropService, riding the existing socket/breaker/reconnect logic"
  - "A new BBjParserService owning the once-per-connection probe latch, the mode/failure log cadence, and one-based-to-zero-based coordinate conversion"
  - "BBjParserService registered in the compiler service group beside BBjCPLService"
  - "The document-builder debounce hook publishing live-parser diagnostics alongside the existing BBjCPL path, filter-then-concat (never absorbed into the BBjCPL source)"
  - "A scriptable JavaInteropTestService.parseProgram() double (old-server default, transport-error, malformed-result, arbitrary result/application-error scripts) plus simulateReconnect()"
  - "A hermetic end-to-end regression suite (19 tests) proving PSRV-03/04/08 through the real BBjDocumentBuilder"
affects: [102-02-coordinate-converter-and-diagnostics-cap, 102-03-live-endpoint-and-docs, 103-diagnostic-reconciliation, 104-conformance-measurement]

# Actuals (#2632)
actuals:
  tokens: 14100
  tasks: 3
  commits: 3

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Probe-by-calling, latch-on-MethodNotFound, reset-on-connection-generation-change — mirrors JavaInteropService.ensureCompleteClassIndex's existing getAllClassNames latch"
    - "Filter-then-concat diagnostic merge for a second compiler source, deliberately not the BBjCPL-specific mergeDiagnostics() same-line collapse"
    - "END_OF_LINE_CHARACTER sentinel clamp for an untrustworthy server-reported end character, instead of a real line-length lookup"
    - "Per-connection-generation failure-kind Set: first occurrence of a kind warns, repeats debug, a success clears the set"

key-files:
  created:
    - bbj-vscode/src/language/bbj-parser-service.ts
    - bbj-vscode/test/bbj-parser-service.test.ts
  modified:
    - bbj-vscode/src/language/java-interop.ts
    - bbj-vscode/src/language/bbj-module.ts
    - bbj-vscode/src/language/bbj-document-builder.ts
    - bbj-vscode/test/bbj-test-module.ts

key-decisions:
  - "DEFAULT_MAX_ERRORS (20) is a temporary internal constant in bbj-parser-service.ts until plan 02 wires bbj-document-validator.ts's getMaxErrors() through — documented in the plan and in the code comment, not a silent gap"
  - "The MethodNotFound branch is the only failure shape that changes the on/off latch; every other failure (application codes, transport, malformed result) leaves the latch untouched, per the plan's explicit 'an endpoint that answered at all still has the method' instruction"
  - "RequestCancelled is checked before any other error handling and produces no diagnostic and no log line at any level, since it is the server's normal answer to ordinary fast typing, not a failure"

patterns-established:
  - "New compiler diagnostic sources register a distinct `source` string and merge via filter-then-concat, never through the BBjCPL-specific mergeDiagnostics() helper"

requirements-completed: [PSRV-03, PSRV-04, PSRV-08]

coverage:
  - id: D1
    description: "With the endpoint present, an open document's current (unsaved) text is parsed 500ms after the last edit and BBj's own parser errors appear as Error-severity diagnostics with their own source, verbatim message, and joined-categories code"
    requirement: PSRV-03
    verification:
      - kind: unit
        ref: "test/bbj-parser-service.test.ts#publishes a live diagnostic"
        status: pass
    human_judgment: false
  - id: D2
    description: "An older BBj (no endpoint) or no connection at all behaves exactly as before: one probe request, no diagnostic, the save-time bbjcpl path unchanged, one off-mode log line, and a reconnect or cache clear re-probes"
    requirement: PSRV-04
    verification:
      - kind: unit
        ref: "test/bbj-parser-service.test.ts#an older server: one probe request, no diagnostic, the save-time compile still runs, then no further requests"
        status: pass
      - kind: unit
        ref: "test/bbj-parser-service.test.ts#logs the mode once per connection, across two different documents"
        status: pass
      - kind: unit
        ref: "test/bbj-parser-service.test.ts#after simulateReconnect the latch resets: the next edit sends a request again and picks up a scripted result"
        status: pass
    human_judgment: false
  - id: D3
    description: "Every endpoint failure shape (the five application error codes, a transport failure, a malformed result) never becomes a diagnostic and is logged once at warn per kind per connection then at debug on repeat until a success re-arms it; a RequestCancelled supersession produces no diagnostic and no log line at any level; no failure changes the on/off latch"
    requirement: PSRV-08
    verification:
      - kind: unit
        ref: "test/bbj-parser-service.test.ts (9 tests under 'no endpoint failure ever becomes a diagnostic')"
        status: pass
    human_judgment: false

duration: 22min
completed: 2026-09-22
status: complete
---

# Phase 102 Plan 01: Live Parser Diagnostics Client Summary

**`BBjParserService` wires `parseProgram` through `JavaInteropService`'s existing socket into the document builder's 500ms debounce, publishing Error-severity diagnostics under a distinct `BBj Parser` source while behaving exactly like 0.16.x against an older or unreachable server — proved by a 19-test hermetic suite.**

## Performance

- **Duration:** 22 min
- **Started:** 2026-09-22T14:25:15Z (branch already cut from Phase 101's tip)
- **Completed:** 2026-09-22T14:47:23Z
- **Tasks:** 3
- **Files modified:** 6 (2 created, 4 modified)

## Accomplishments

- A thin `parseProgram()` pass-through and a `connectionGeneration` counter on `JavaInteropService`, riding the existing connect()/breaker/reconnect machinery — no new socket, no new transport.
- A new `BBjParserService` (registered beside `BBjCPLService` in the `compiler` service group) owning the once-per-connection probe latch, the coordinate converter (`parseErrorToRange`/`parseErrorsToDiagnostics`), and the mode/failure log cadence.
- The document builder's existing 500ms debounce callback extended with a filter-then-concat live-diagnostics step — one timer map, one publish per debounce fire, never absorbed into the save-time `BBjCPL` source.
- A scriptable `JavaInteropTestService.parseProgram()` double (old-server default, an arbitrary result or application error, a plain transport error, a malformed result) plus `simulateReconnect()`.
- 19 passing tests proving: a live diagnostic publishes end-to-end (Task 1); an older/absent server behaves exactly as before, with a single mode log line and a working reconnect re-probe (Task 2); and every failure shape the endpoint contract can produce yields zero diagnostics with the correct warn/debug log cadence, while a `RequestCancelled` supersession is silent at every level (Task 3).

## Task Commits

Each task was committed atomically:

1. **Task 1: End-to-end "an unsaved edit becomes a live parser diagnostic" — one path only** - `3de5321f` (feat)
2. **Task 2: An older server, and no server at all, behave exactly as before** - `18796f47` (test)
3. **Task 3: No endpoint failure ever becomes a diagnostic** - `86c4abb8` (feat)

_Note: Task 2 required no production change — Task 1's tracer already implemented the exact catch-branch shape Task 2's tests pin down, so Task 2 is a pure test commit._

## Files Created/Modified

- `bbj-vscode/src/language/bbj-parser-service.ts` - New service: `BBJ_PARSER_SOURCE`, `parseErrorToRange`/`parseErrorsToDiagnostics`, `BBjParserService` (probe latch, coordinate conversion, failure classification and log cadence)
- `bbj-vscode/src/language/java-interop.ts` - `ParseProgramParams`/`ParseProgramResult`/`ParseError` interfaces, `parseProgramRequest`, `JavaInteropService.parseProgram()`, exported `METHOD_NOT_FOUND`, `connectionGeneration` getter bumped in `establishConnection()` and `clearCache()`
- `bbj-vscode/src/language/bbj-module.ts` - `BBjParserService` registered in the `compiler` service group
- `bbj-vscode/src/language/bbj-document-builder.ts` - `debouncedCompile()`'s timer callback extended with the live-parse filter-then-concat step; the `off`-trigger branch now also clears `BBj Parser`-sourced diagnostics
- `bbj-vscode/test/bbj-test-module.ts` - `JavaInteropTestService` exported, `scriptParseProgram()`/`simulateReconnect()`/`parseProgram()` override added
- `bbj-vscode/test/bbj-parser-service.test.ts` - New hermetic suite (19 tests) over a real `BBjDocumentBuilder` + `BBjParserService` + the scriptable double

## Decisions Made

- `DEFAULT_MAX_ERRORS = 20` is used internally until plan 02 wires `bbj-document-validator.ts`'s `getMaxErrors()` through — documented in-code and in this summary, not a silent gap.
- Only `MethodNotFound` changes the on/off latch; every other failure (application codes, transport, malformed result) leaves it untouched, per the plan's explicit instruction that an endpoint answering with any recognizable failure code still proves the method exists.
- `RequestCancelled` is checked first and produces no diagnostic and no log line at any level — it is the server's normal answer to a superseded request on ordinary fast typing, not a failure.

## Deviations from Plan

None - plan executed exactly as written. Task 1's tracer already included the full `MethodNotFound` catch branch and idempotent log-line logic (per the plan's own "the shape task 3 fills in" framing for the *unclassified* failure branch), so Task 2 needed no production change — only its regression tests, which is consistent with the plan's TDD framing for that task.

## Known Stubs

- **`DEFAULT_MAX_ERRORS` constant in `bbj-parser-service.ts`** (line ~21): hardcoded to `20` (mirroring the diagnostics setting's own default) until plan 02 wires `bbj.diagnostics.maxErrors` through via a new `getMaxErrors()` export on `bbj-document-validator.ts`. This is the plan's own documented sequencing (`artifacts_this_phase_produces` names `getMaxErrors()` as plan 02's deliverable), not an unplanned gap — recorded here so it is visible before plan 02 lands.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `BBjParserService`, the wire contract, and the probe/failure infrastructure are complete and tested; plan 02 can now build the real coordinate-converter fixture suite (PSRV-05) and wire `getMaxErrors()` without touching the latch/failure logic here.
- No blockers. Ready for `102-02-PLAN.md`.

## Self-Check: PASSED

All 7 created/modified source files and the SUMMARY.md itself were verified present on disk; all
3 task commit hashes (`3de5321f`, `18796f47`, `86c4abb8`) were verified present in git history.

---
*Phase: 102-live-compiler-diagnostics-with-backward-compatibility*
*Completed: 2026-09-22*
