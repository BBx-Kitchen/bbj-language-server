---
phase: 124-interop-client
plan: 03
subsystem: infra
tags: [json-rpc, bbj-ls, formatProgram, denumProgram, dedicated-connection, vitest]

requires:
  - phase: 124-interop-client
    provides: java-interop-errors.ts classifier (plan 01), program wire types and java-program-guard.ts validators (plan 02)
provides:
  - "java-interop-program-lane.ts: ProgramLane (third dedicated socket, own lane epoch, reopen cool-down, request pipeline), programOutcomeForError, programOutcomeForResult, PROGRAM_LANE_REOPEN_COOLDOWN_MS, ProgramLaneHooks"
  - "JavaInteropConnection and JavaInteropService formatProgram (whole document and range) and denumProgram returning a typed ProgramOutcome, never throwing"
  - "FakePeerInteropService.answerWith and default formatProgram/denumProgram answers"
  - "test/java-interop-program-lane.test.ts: route, outcome and lifecycle tests"
affects: [124-04, 124-05, 124-06, 125-ls-formatting, 126-ls-denum]

actuals:
  tokens: 10300
  tasks: 3
  commits: 5

tech-stack:
  added: []
  patterns:
    - "Dedicated third connection for format and DENUM, opened lazily with same-tick promise sharing"
    - "The lane is handed only createSocket, wrapSocket and a read-only shared-generation view: no connect hook, so no fallback and no breaker contact is possible"
    - "Every rejection becomes a typed outcome; request() never rejects"
    - "Failed open starts a 5 s cool-down; dispose lifts it"

key-files:
  created:
    - bbj-vscode/src/language/java-interop-program-lane.ts
    - bbj-vscode/test/java-interop-program-lane.test.ts
  modified:
    - bbj-vscode/src/language/java-interop-connection.ts
    - bbj-vscode/src/language/java-interop.ts
    - bbj-vscode/test/fake-interop-peer.ts

key-decisions:
  - "The cool-down is stamped only when the lane epoch still equals the one the open started under, so a disposal that overtakes an in-flight failing open keeps its promise to lift the cool-down"
  - "An unsupported-method answer (-32601) never disposes the lane: the other method may still be served on it"
  - "setNoDelay(true) is applied to the lane socket only, guarded by a typeof check because the fake peer's socket is a bare object"
  - "A repeat request inside the cool-down answers not-reachable without logging at all (no debug line either): no socket was attempted, so there is nothing new to report"

patterns-established:
  - "Lane module imports neither the notifications module nor the connection module, so a breaker or popup call cannot be added by accident"
  - "Hermetic lane tests drive the real lane through the fake peer's wrapSocket seam and assert on connection ids, socket attempts and connectionGeneration"

requirements-completed: [INT-01, INT-02]

duration: 10min
completed: 2026-10-01
status: complete

coverage:
  - id: D1
    description: "A whole-document format request travels from JavaInteropService through JavaInteropConnection and ProgramLane to the peer on its own connection and comes back as a validated typed outcome; a wrong version echo is malformed-result and a peer application error is a typed failed outcome, never thrown"
    requirement: INT-01
    verification:
      - kind: unit
        ref: "bbj-vscode/test/java-interop-program-lane.test.ts#whole-document format over the dedicated connection"
        status: pass
    human_judgment: false
  - id: D2
    description: "Range format and DENUM run over the same one dedicated connection, distinct from the shared connection and the parse lane, with typed results"
    requirement: INT-01
    verification:
      - kind: unit
        ref: "bbj-vscode/test/java-interop-program-lane.test.ts#format, range format and DENUM over one dedicated connection"
        status: pass
    human_judgment: false
  - id: D3
    description: "A hung program lane never delays a parse or a class lookup; format traffic never moves the shared connection generation"
    requirement: INT-02
    verification:
      - kind: unit
        ref: "bbj-vscode/test/java-interop-program-lane.test.ts#with the dedicated connection hung and a format request pending, a parse and a class lookup are still answered"
        status: pass
    human_judgment: false
  - id: D4
    description: "A refused open answers unavailable/not-reachable with no fallback, no dialog, no generation change and one log line holding only the socket error; the cool-down blocks socket attempts for 5 s; lane loss keeps live-parse verdict state; clearCache disposes the lane and lifts the cool-down"
    requirement: INT-02
    verification:
      - kind: unit
        ref: "bbj-vscode/test/java-interop-program-lane.test.ts#the dedicated connection lifecycle"
        status: pass
    human_judgment: false
---

# Phase 124 Plan 03: Dedicated Format/DENUM Connection Summary

**formatProgram (whole document and range) and denumProgram now run end to end through JavaInteropService over a third, dedicated, lazily opened connection that never touches the shared generation, the circuit breaker or the parse lane, and every outcome is a typed value built from a validated answer.**

## Performance

- **Duration:** about 10 min
- **Started:** 2026-10-01T12:29:00Z
- **Completed:** 2026-10-01T12:38:47Z
- **Tasks:** 3
- **Files modified:** 5 (2 new)

## Accomplishments

- `ProgramLane` opens its own socket on the first format or DENUM request (same-tick callers share one open), calls `setNoDelay(true)` when the socket supports it, and resolves every request with a typed `ProgramOutcome`. It never rejects.
- No lane means `unavailable` / `not-reachable`. The lane is handed only `createSocket`, `wrapSocket` and a read-only `sharedGeneration`; it imports neither the notifications nor the connection module, so a fallback, a `connect()` call, a breaker change or an error popup cannot happen. A refused-open test asserts no format request reaches any connection, no dialog, an unchanged `connectionGeneration`, and that a later class lookup still works with no new socket and no circuit-open error.
- A failed open starts a 5 s cool-down: inside it no socket is attempted; one log line carries only the (sanitised) socket error, never request text. `dispose()` (called from `disconnect()`, so from `clearCache()`) lifts the cool-down.
- Losing the open lane bumps only the lane's own epoch. The lane-loss test inverts the parse-lane one: after a real `BBjParserService` stored a verdict state, dropping the program connection leaves `connectionGeneration` and the verdict state intact, and the next request reopens on a new connection id.
- `programOutcomeForError` maps every classifier kind with an exhaustive switch (`cancelled`, `unavailable`, `timeout` from the peer, `invalid-settings`, `mixed-numbering`, `failed` for the rest) and strips and bounds every peer string. `programOutcomeForResult` yields `ok` or `malformed-result` with the guard's fixed reason token.
- `FakePeerInteropService` gained `answerWith(method, handler)` (a thrown error or rejected promise becomes the rejection) and default `formatProgram`/`denumProgram` echo answers.

## Task Commits

1. **Task 1: Whole-document format end to end over a dedicated program connection** (tracer) - `04911da7` (feat)
2. **Task 2: DENUM and range format over the same lane, a hung lane never delays a parse or a class lookup** - TDD:
   - RED `079decbe` (test) - 2 of 9 tests failed (`denumProgram is not a function`); the range and hung-lane tests already passed against Task 1's lane
   - GREEN `a210db1a` (feat)
3. **Task 3: Lane lifecycle (no fallback, cool-down, own epoch, disposal)** - TDD:
   - RED `63d2534e` (test) - 2 of 13 failed (no warn line, no cool-down); the lane-loss and clearCache tests already passed because Task 1's lane already had the epoch and dispose behaviour
   - GREEN `5fc2f269` (feat)

**Plan metadata:** committed with this SUMMARY (docs: complete plan)

## Files Created/Modified

- `bbj-vscode/src/language/java-interop-program-lane.ts` - `ProgramLane`, hooks, cool-down constant and the two pure outcome builders
- `bbj-vscode/src/language/java-interop-connection.ts` - `programLane` field, `formatProgram`, `denumProgram`, disposal in `disconnect()`, header and `generation` doc updates
- `bbj-vscode/src/language/java-interop.ts` - `formatProgram`/`denumProgram` delegates and the type re-exports
- `bbj-vscode/test/fake-interop-peer.ts` - `answerWith`, default program answers, header comment
- `bbj-vscode/test/java-interop-program-lane.test.ts` - 13 tests across route, outcomes, shared connection, hung lane and lifecycle

## Decisions Made

- The cool-down is stamped only if the lane epoch still matches the one the open started under, so a disposal that overtakes a failing in-flight open does not leave a stale cool-down behind.
- A repeat request inside the cool-down logs nothing (the plan sketch mentioned a debug repeat): no socket was attempted, so there is no new event to report. The warn-once assertion holds either way.
- Task 1 imported only the format symbols into the connection module and Task 2 added the DENUM ones, so `noUnusedLocals` stayed clean at every commit.

## Deviations from Plan

### Auto-fixed Issues

None - no production behaviour deviated from the plan.

Commit trailer: the orchestrator prompt and the plan's executor rules name `Claude Opus 5.5`; this executor is Claude Sonnet 5.5 and the session's attribution instruction names that model, so every commit carries `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>` (the same call plan 02 made).

---

**Total deviations:** 0 auto-fixed, plus the trailer note above.
**Impact on plan:** None.

## Issues Encountered

None. The Grep tool was not registered in this session, so acceptance greps ran as scoped `grep` calls on absolute paths.

## Regression Judgement

- Plan verify (as written): `java-interop-program-lane`, `java-interop-parse-lane`, `java-interop-connection`, `java-interop-breaker`, `java-interop-timeouts` and `bbj-parser-service` suites pass (96 tests), `npm run typecheck:test` and `npm run lint` are clean. The four guard test files are unchanged (`git diff --exit-code` clean).
- Whole suite once, `npx vitest run --maxWorkers=2`: 181 of 182 files passed, 3877 tests passed, 30 skipped, 0 failed tests. The one failed suite is `test/functional/installed-extension-e2e.test.ts` (beforeAll, spawns the separately installed `~/.ext-test` bundle), the known environment failure. The linking interop-drift and issue447 failures did not appear in this run.

## Known Stubs

None.

## Threat Flags

None. The new surface is a third socket to the host and port already validated by the owning service's `createSocket`, which is the plan's own threat model (T-124-13 to T-124-19): isolation from the breaker, cool-down against a reconnect storm, lane-local epoch, sanitised peer strings and no request text in the one log line, each tested.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 124-04 can add the per-method latches (keyed on the lane's `currentKey()`, already present), the 15 s cancel-always backstop, the malformed-result log cadence (the lane already owns a `FailureLogCadence`) and `PROGRAM_REQUEST_TIMEOUT_MS` on top of `ProgramLane.request`.
- `requirements-completed` lists INT-01 and INT-02; both are also declared by later plans in this phase, and REQUIREMENTS.md was not edited here.

## Self-Check: PASSED

- FOUND: bbj-vscode/src/language/java-interop-program-lane.ts
- FOUND: bbj-vscode/test/java-interop-program-lane.test.ts
- FOUND commits: 04911da7, 079decbe, a210db1a, 63d2534e, 5fc2f269
- Acceptance greps for all three tasks pass; no planning identifiers in the five changed files; vitest, typecheck:test and lint clean.

---
*Phase: 124-interop-client*
*Completed: 2026-10-01*
