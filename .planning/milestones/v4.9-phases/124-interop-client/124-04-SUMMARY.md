---
phase: 124-interop-client
plan: 04
subsystem: infra
tags: [json-rpc, bbj-ls, formatProgram, denumProgram, cancellation, availability-latch, vitest]

requires:
  - phase: 124-interop-client
    provides: java-interop-errors.ts classifier and FailureLogCadence (plan 01), program guard and outcome types (plan 02), ProgramLane with lane epoch, cool-down and the request pipeline (plan 03)
provides:
  - "ProgramLane per-method availability latches keyed on the shared generation and the lane epoch; a missing method answers unavailable at once with no socket and no request"
  - "Failure log cadence on every non-ok program outcome: warn once per kind per connection key, debug afterwards, no request text"
  - "PROGRAM_REQUEST_TIMEOUT_MS (15 s) settle-first, cancel-always backstop and caller cancellation inside ProgramLane.request"
  - "FakePeerInteropService.formatProgramMethodMissing, denumProgramMethodMissing and cancelledRequests"
  - "test/java-interop-program-lane.test.ts: availability, outcome table, error burst, log cadence, deadline and cancellation suites (42 tests)"
affects: [124-05, 124-06, 125-ls-formatting, 126-ls-denum]

actuals:
  tokens: 8600
  tasks: 3
  commits: 5

tech-stack:
  added: []
  patterns:
    - "A latch stored under a key is read as unknown under any other key, so a shared-generation bump, a lane loss or a dispose re-probes both methods lazily"
    - "The latch and the failure log are written under the key captured when the request went out, so an answer from a replaced connection never decides anything about the new one"
    - "Cancellation runs through a linked CancellationTokenSource and the outcome is decided by a race, never by awaiting the peer, because vscode-jsonrpc leaves a cancelled request pending"
    - "Each classified error is classified once and reused for both the outcome and the log line"

key-files:
  created: []
  modified:
    - bbj-vscode/src/language/java-interop-program-lane.ts
    - bbj-vscode/test/fake-interop-peer.ts
    - bbj-vscode/test/java-interop-program-lane.test.ts

key-decisions:
  - "An answer that proves the method exists latches it available: a result, a malformed result, invalid-settings, mixed-numbering, a peer timeout and every failed outcome except transport (which includes -33004 and -32602); only -32601 latches unavailable, and cancelled, a client timeout, transport and not-reachable leave the latch alone"
  - "Latch and log are written only while the key captured before sending is still current for the latch; the log re-arms on the captured key"
  - "Only a failure the peer or the deadline produced is logged: a cancellation is never logged, and an unsupported method is logged once at info when it is latched"

patterns-established:
  - "Settle-first exchange: race the request against a deadline gate and the caller's cancellation, attach a no-op catch to the abandoned request, release the timer, the caller listener and the source in finally"
  - "Hermetic cancellation tests assert on the fake peer's cancelledRequests and on vi.getTimerCount() instead of timing"

requirements-completed: [INT-03, INT-04, INT-02]

duration: 8min
completed: 2026-10-01
status: complete

coverage:
  - id: D1
    description: "A peer that answers -32601 for formatProgram only (or denumProgram only) latches just that method off, answers it again with no request and no socket, keeps the other method and live parse working on an undisposed connection, and probes it again after a cache clear, a lost program connection or a fresh shared connection; a stale -32601 from a replaced connection never latches the new one"
    requirement: INT-03
    verification:
      - kind: unit
        ref: "bbj-vscode/test/java-interop-program-lane.test.ts#per-method availability"
        status: pass
    human_judgment: false
  - id: D2
    description: "Every bbj-ls code (-33001 to -33009, -32602, -32800) and a plain transport error yields its own typed outcome with its code; -33004 never latches; twenty application errors in a burst leave the shared generation, class lookups, the dialog and live parse untouched"
    requirement: INT-04
    verification:
      - kind: unit
        ref: "bbj-vscode/test/java-interop-program-lane.test.ts#the outcome of every peer answer, an error burst"
        status: pass
    human_judgment: false
  - id: D3
    description: "A malformed answer and every other failure kind warn once per kind per connection key and log at debug afterwards, never contain the request text at any level, and a peer cancellation logs nothing"
    requirement: INT-04
    verification:
      - kind: unit
        ref: "bbj-vscode/test/java-interop-program-lane.test.ts#failure logging"
        status: pass
    human_judgment: false
  - id: D4
    description: "A request pending at 15 s is cancelled on the wire and settles as a client timeout, never as transport; a caller cancellation and an already-cancelled token settle as cancelled without a log line or a timer; -33002 is a plain peer timeout with no lane recycling; no unhandled rejection is reported"
    requirement: INT-02
    verification:
      - kind: unit
        ref: "bbj-vscode/test/java-interop-program-lane.test.ts#the request deadline and cancellation"
        status: pass
    human_judgment: false
  - id: D5
    description: "The real wire behaviour of the cancellation (a $/cancelRequest actually arrives at the peer and a silent peer is never awaited) is not proven by the fake peer, which rejects on cancel unlike vscode-jsonrpc 8.2.1"
    requirement: INT-02
    verification: []
    human_judgment: true
    rationale: "Covered by the loopback wire suite in plan 05 and the live harness in plan 06; this plan's fake-peer tests prove only that the cancellation is requested"
---

# Phase 124 Plan 04: Per-Method Latches, Failure Cadence and Cancel-Always Backstop Summary

**ProgramLane now latches a missing formatProgram or denumProgram per connection key without touching the other method or live parse, logs every failure warn-once-per-kind with no request text, and settles each request through a cancel-always 15 s backstop or the caller's cancellation without ever waiting on the peer.**

## Performance

- **Duration:** 8 min
- **Started:** 2026-10-01T12:40:17Z
- **Completed:** 2026-10-01T12:48:44Z
- **Tasks:** 3
- **Files modified:** 3 (none new)

## Accomplishments

- Each method has its own availability latch. The key is the shared generation plus the lane epoch, so a reconnect, a cache clear, a lane loss or a dispose reads every stored latch as unknown and both methods are probed again. The first real call is the probe. A `-32601` latches only that method `unavailable`; afterwards that method answers `unavailable` / `method-not-found` with no request and no socket attempt, while the other method and live parse keep working on the same undisposed connection. One info line is logged when a method flips.
- A stale answer cannot latch a newer connection: the key is captured just before the request goes out, and the latch is written only while it is still current. The test that rejects a pending request with `-32601` after the connection was dropped shows the next call still sends a request.
- `-33004` and `-32602` never latch the method off (any non-transport failure counts as proof the method exists). Cancellation, a client timeout, a transport failure and a failed open leave the latch unchanged.
- Every non-ok outcome goes through the lane's `FailureLogCadence`: warn on the first failure of a kind for a connection key, debug afterwards, re-armed by a new connection. The line holds only the method, the kind and either the guard's fixed refusal token or the bounded peer message. A secret-marker test across a malformed answer, a `-33009` and a transport failure finds the marker at no logger level. Cancellations are never logged.
- `request` keeps its never-rejects contract and now runs the send through a settle-first exchange. The request goes out under a `CancellationTokenSource` linked to the caller's token. A 15 s timer (`PROGRAM_REQUEST_TIMEOUT_MS`) cancels that source and settles `timeout` with origin `client`; a caller cancellation cancels it and settles `cancelled`. Neither waits for the peer, the abandoned request gets a no-op handler, and the timer, the caller listener and the source are released in `finally`. An already-cancelled token returns `cancelled` before the latch check and before any socket.
- A `-33002` is a plain `timeout` / `peer` outcome: the connection is kept and the next request uses the same connection id.
- The error burst test sends 20 concurrent calls rotating through all eleven application codes on both methods: every code produces its own outcome token, and afterwards the shared generation, class lookups (no new socket, no circuit-open error), the error dialog and a real live-parse service are all untouched.

## Task Commits

1. **Task 1: A peer without formatProgram latches only that method off** (tracer) - `cd397fba` (feat). The tracer gate ran in auto mode: the verify was re-run end to end (35 tests across the lane and parse-lane suites, `typecheck:test`) and passed, so expansion continued.
2. **Task 2: Every bbj-ls code has its own outcome, an error burst never reaches the breaker, and failures follow the warn-once cadence** - TDD:
   - RED `14968b53` (test) - 2 of 37 tests failed (the cadence and the no-request-text test); the outcome table, the `-33004` test and the burst already passed because plan 03's builder already produced every outcome
   - GREEN `a9e6cf0c` (feat)
3. **Task 3: Cancel-always 15 s backstop and caller cancellation** - TDD:
   - RED `a54ec38f` (test) - 4 of 42 tests failed (backstop, caller cancellation, pre-cancelled token, unhandled-rejection check); the `-33002` test already passed
   - GREEN `82ab842c` (feat)

**Plan metadata:** committed with this SUMMARY (docs: complete plan)

## Files Created/Modified

- `bbj-vscode/src/language/java-interop-program-lane.ts` - latch map and `availability`/`recordAvailability`, `logFailure`, the `exchange` backstop, `PROGRAM_REQUEST_TIMEOUT_MS`, and `outcomeForClassifiedError` behind the unchanged `programOutcomeForError` wrapper
- `bbj-vscode/test/fake-interop-peer.ts` - `formatProgramMethodMissing`, `denumProgramMethodMissing`, `cancelledRequests` (every request whose token was cancelled; the existing reject-on-cancel for hung requests is unchanged)
- `bbj-vscode/test/java-interop-program-lane.test.ts` - suites for per-method availability, the outcome table, the error burst, failure logging, and the deadline and cancellation; shared `liveParse`, `callProgram` and `spyOnLogger` helpers at module scope

## Decisions Made

- The latch table follows the plan, including that a client timeout and a transport failure never change a latch, so a flaky peer cannot flip a method off.
- A repeat `-32601` while a method is already unavailable under the same key does not log twice; the info line is written only on the flip.
- The failure log re-arms on the key captured with the request, as the plan says. A late answer from a replaced connection can therefore re-arm the warn level once; that costs at most one extra warning and is not worth a second guard.
- The caller-cancellation no-log assertion lives in the deadline and cancellation suite (Task 3), where a hung connection exists, rather than in the Task 2 outcome suite; the Task 2 suite asserts the same for a peer `-32800` answer.

## Deviations from Plan

### Auto-fixed Issues

None - no production behaviour deviated from the plan.

Notes, none of which changed behaviour:
- The Task 3 RED commit imports `PROGRAM_REQUEST_TIMEOUT_MS` before the constant exists, so that commit alone does not type-check (it runs at vitest level and fails for the expected reasons). The GREEN commit restores a clean `typecheck:test`. The commit hooks did not object.
- The `liveParse` helper written for the first suite was moved to module scope so the burst suite could reuse it.
- Commit trailer: the plan's executor rules name `Claude Opus 5.5`; this executor is Claude Sonnet 5.5 and the session's attribution instruction names that model, so every commit carries `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>` (the call plans 02 and 03 made).

---

**Total deviations:** 0 auto-fixed, plus the notes above.
**Impact on plan:** None.

## Issues Encountered

None. The Grep tool was not registered in this session, so acceptance greps ran as scoped `grep` calls on absolute paths.

## Regression Judgement

- Plan verify (as written for Task 3): the lane, parse-lane, connection, breaker, timeouts and live-parse-interleaving suites pass (96 tests), `npm run typecheck:test` and `npm run lint` are clean, no "Unhandled" text in the output. The five existing guard test files are unchanged (`git diff --exit-code` clean).
- Whole suite once, `npx vitest run --maxWorkers=2`: 181 of 182 files passed, 3906 tests passed, 30 skipped, 0 failed tests. The one failed suite is `test/functional/installed-extension-e2e.test.ts`, the known environment failure (spawns the separately installed `~/.ext-test` bundle). No other failing name, so no regression.

## Known Stubs

None.

## Threat Flags

None. The surface touched is the plan's own threat model: the deadline and cancel-always exchange (T-124-20, T-124-21), the per-method latch (T-124-22, T-124-25), the burst through the breaker (T-124-23), the log lines (T-124-24) and the dangling request promise (T-124-26). Each is mitigated and covered by a test above.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 124-05 can prove the real wire behaviour this plan only models with the fake peer: that `ResponseError.data` survives real framing and that a real `$/cancelRequest` arrives, using the loopback peer (`ctx.token` and a cancellations list).
- Plan 124-06 can measure the live latencies and record whether bbj-ls honours `$/cancelRequest`; the lane already sends it on every deadline or caller cancellation.
- `requirements-completed` lists INT-03, INT-04 and INT-02; INT-02 and INT-04 are also declared by other plans in this phase, so REQUIREMENTS.md was not edited here.

## Self-Check: PASSED

- FOUND: bbj-vscode/src/language/java-interop-program-lane.ts
- FOUND: bbj-vscode/test/fake-interop-peer.ts
- FOUND: bbj-vscode/test/java-interop-program-lane.test.ts
- FOUND commits: cd397fba, 14968b53, a9e6cf0c, a54ec38f, 82ab842c
- Acceptance greps for all three tasks pass (formatProgramMethodMissing/denumProgramMethodMissing in the fake peer and the tests, `currentKey()` 5, `failureLog.report(` 2, `-33004` and `circuit open` in the tests, `export const PROGRAM_REQUEST_TIMEOUT_MS = 15_000` 1, `new CancellationTokenSource()` 1, `cancelledRequests` 2); no planning identifiers in the three changed files; vitest, typecheck:test and lint clean.

---
*Phase: 124-interop-client*
*Completed: 2026-10-01*
