---
phase: 124-interop-client
plan: 01
subsystem: infra
tags: [json-rpc, bbj-ls, error-classification, vitest, interop]

requires:
  - phase: 121-java-interop-split
    provides: java-interop-connection.ts parse lane and the BBjParserService probe/latch precedent
provides:
  - "java-interop-errors.ts: bbj-ls error code constants (-33001..-33009), classifyInteropError, typed -33007/-33008 payloads, FailureLogCadence"
  - "BBjParserService running on the shared classifier and cadence with byte-identical log tokens"
  - "test/java-interop-errors.test.ts pinning the classifier table, payload bounds and cadence"
  - "COVERAGE.md api-coverage gate note for the phase"
affects: [124-02, 124-03, 124-04, 124-05, 125-ls-formatting, 126-ls-denum]

actuals:
  tokens: 6500
  tasks: 2
  commits: 3

tech-stack:
  added: []
  patterns:
    - "Leaf error-classifier module shared by the live-parse path and the format/DENUM client"
    - "Duck-typed JSON-RPC error classification on a numeric code, never instanceof ResponseError"
    - "Peer error data read field by field into fresh objects (no spread, no pass-through)"

key-files:
  created:
    - bbj-vscode/src/language/java-interop-errors.ts
    - bbj-vscode/test/java-interop-errors.test.ts
    - .planning/phases/124-interop-client/COVERAGE.md
  modified:
    - bbj-vscode/src/language/bbj-parser-service.ts

key-decisions:
  - "BBjParserService keeps its legacy log tokens through a LIVE_PARSE_LOGGED_KINDS set: the five parse kinds log as themselves, every other classified kind logs as transport"
  - "The classifier reads code only when typeof is number, so a string code can no longer match a known kind"

patterns-established:
  - "Classifier returns kind, code and message; callers decide logging and latching"
  - "FailureLogCadence receives a caller-built line, so request text cannot enter through it"

requirements-completed: [INT-04]

duration: 12min
completed: 2026-10-01
status: complete

coverage:
  - id: D1
    description: "One shared module classifies every bbj-ls failure into its own kind, with -32800 first, -33002 as timeout, -33004 as service-unavailable and everything unknown as transport"
    requirement: INT-04
    verification:
      - kind: unit
        ref: "bbj-vscode/test/java-interop-errors.test.ts#classifyInteropError: code to kind"
        status: pass
    human_judgment: false
  - id: D2
    description: "-33007 and -33008 data become validated, bounded, freshly built typed payloads; garbage data still yields the kind with an empty payload"
    requirement: INT-04
    verification:
      - kind: unit
        ref: "bbj-vscode/test/java-interop-errors.test.ts#classifyInteropError: invalid-settings data / mixed-numbering data"
        status: pass
    human_judgment: false
  - id: D3
    description: "BBjParserService classifies live-parse failures through the shared module with unchanged log tokens, cadence and text"
    requirement: INT-04
    verification:
      - kind: unit
        ref: "bbj-vscode/test/bbj-parser-service.test.ts (unchanged), java-interop-parse-lane.test.ts (unchanged), live-parse-interleaving.test.ts (unchanged)"
        status: pass
    human_judgment: false
  - id: D4
    description: "FailureLogCadence warns first per kind, debugs repeats, and re-arms on a new generation or clear"
    requirement: INT-04
    verification:
      - kind: unit
        ref: "bbj-vscode/test/java-interop-errors.test.ts#FailureLogCadence"
        status: pass
    human_judgment: false
---

# Phase 124 Plan 01: Shared bbj-ls Error Classifier Summary

**One leaf module classifies every bbj-ls failure (-33001..-33009, -32601, -32602, -32800, transport) with validated -33007/-33008 payloads and a shared warn-then-debug log cadence, and BBjParserService now runs on it with byte-identical log output.**

## Performance

- **Duration:** 12 min
- **Started:** 2026-10-01T12:17:00Z
- **Completed:** 2026-10-01T12:29:00Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- `java-interop-errors.ts` exports the nine `ERROR_*` constants, `InteropErrorKind`, `classifyInteropError`, `FailureLogCadence`, `MALFORMED_RESULT_KIND` and `MAX_INVALID_SETTINGS_PROBLEMS`. It imports only `vscode-jsonrpc`, `vscode-languageserver`, the logger and the peer guard, so the connection and the parser service can both import it without a cycle.
- `-33007` data becomes `{kind:'invalid-settings', problems:[{setting,message}]}` (at most 64 entries, each string truncated to the peer error bound, entries that are not plain objects with string fields dropped); `-33008` data becomes `{kind:'mixed-numbering', line}` (safe integer of at least 1, else `undefined`). Garbage data still yields the kind with an empty payload. A `__proto__` key from parsed JSON never reaches `Object.prototype` or the returned object.
- `BBjParserService` lost its local kind table, constants, classify function and private reported-kinds set. The catch block classifies once; `cancelled` and `method-not-found` keep their old handling; the five parse kinds log as themselves and every other kind logs as `transport`. The three guard suites pass without any edit.
- The classifier test file adds 73 tests: the full code table (for both `ResponseError` and plain objects), transport fallbacks, message shape, payload bounds, no data on other codes, and the cadence.

## Task Commits

1. **Task 1: Live-parse failures classified end to end through one shared classifier and cadence** - `037f05f9` (feat)
2. **Task 2: Typed -33007/-33008 payloads, the full classifier table under test, and the coverage note** - TDD, two commits:
   - RED: `7b7c61fa` (test) — 20 of 73 tests failed (all payload tests); the 53 classification and cadence tests already passed against Task 1's module
   - GREEN: `122ba81a` (feat)

**Plan metadata:** committed with this SUMMARY (docs: complete plan)

## Files Created/Modified

- `bbj-vscode/src/language/java-interop-errors.ts` - classifier, error constants, typed payload builders, `FailureLogCadence`
- `bbj-vscode/src/language/bbj-parser-service.ts` - migrated onto the shared classifier and cadence
- `bbj-vscode/test/java-interop-errors.test.ts` - classifier table, payload bounds, `__proto__` hygiene, cadence
- `.planning/phases/124-interop-client/COVERAGE.md` - one-line api-coverage gate note

## Decisions Made

- Kept the live-parse log token collapse inside the parser service (`LIVE_PARSE_LOGGED_KINDS`), not in the shared module, so the format/DENUM client sees the full kind set while the parse log stays as it was.
- The `-33007` truncation reuses `truncateText`/`MAX_PEER_ERROR_LENGTH` from the peer guard; control-character stripping is left to the point where a payload becomes user-facing text, so the module has no second stripping helper.

## Deviations from Plan

None - plan executed exactly as written.

One behaviour edge worth recording, not a deviation: the old parser-service table looked the code up with `code in APPLICATION_ERROR_KINDS`, which would have matched a string code such as `'-33001'`. The classifier now reads a code only when it is a number (the plan's explicit rule), so a string code classifies as `transport`. No existing test exercises a string code and no real peer sends one.

## Issues Encountered

None. The Grep tool was not registered in this session; verification greps ran as scoped `grep` calls on absolute paths.

## Regression Judgement

Targeted runs only, as written in the plan's verify: `bbj-parser-service`, `java-interop-parse-lane`, `live-parse-interleaving` and the new `java-interop-errors` suites all pass (138 tests), `npm run typecheck:test` and `npm run lint` are clean. The whole suite was not run in this plan, so the known environment failures (linking interop drift, issue447 capability) were not re-observed here.

## Known Stubs

None.

## Threat Flags

None. The only new surface is the classifier reading peer error `data`, which is the plan's own threat model (T-124-01, T-124-02, T-124-05) and is mitigated and tested.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plans 124-03 and 124-04 can import `classifyInteropError`, the `ERROR_*` constants, `InteropErrorData` and `FailureLogCadence` with the exact names from the plan's contract.
- `ClassifiedInteropError.data` is already bounded; the format/DENUM client still has to strip control characters when it turns the payloads into outcomes.

## Self-Check: PASSED

- FOUND: bbj-vscode/src/language/java-interop-errors.ts
- FOUND: bbj-vscode/test/java-interop-errors.test.ts
- FOUND: .planning/phases/124-interop-client/COVERAGE.md
- FOUND commits: 037f05f9, 7b7c61fa, 122ba81a
- Acceptance greps for both tasks pass; guard suites untouched (`git diff --exit-code` clean); no planning identifiers in source or test comments.

---
*Phase: 124-interop-client*
*Completed: 2026-10-01*
