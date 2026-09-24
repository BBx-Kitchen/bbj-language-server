---
phase: 105-live-diagnostics-responsiveness-on-large-workspaces
plan: 03
subsystem: language-server
tags: [java-interop, vscode-jsonrpc, connection-lifecycle, circuit-breaker]

requires:
  - phase: 102-live-compiler-diagnostics-with-backward-compatibility
    provides: "BBjParserService's connectionGeneration-keyed probe latch and clearAllVerdictStates() reset pattern, reused here for the dedicated connection's own loss/reopen handling"
provides:
  - "A dedicated parseProgram MessageConnection on JavaInteropService, opened lazily and reused for the life of a connection generation, so a live parse never waits behind getClassInfo traffic already queued on the shared connection"
  - "A silent, logged-once-per-generation fallback to the shared connection when the dedicated connection cannot be opened or an older server answers MethodNotFound"
  - "Per-connection ids, hung/refused-attempt scripting, and connection disposal records in the fake interop peer test double, so a test can address one connection independently of another"
affects: [105-04, 105-05]

actuals:
  tokens: 9294
  tasks: 2
  commits: 3

tech-stack:
  added: []
  patterns:
    - "A second connection reuses the existing connect()/establishConnection() template (its own createSocket()/wrapSocket() calls, its own in-flight-promise dedup) rather than a parallel implementation, and is retired/reopened by connectionGeneration instead of a second breaker"
    - "Fallback-on-open-failure recorded as a retired-generation flag (not an exception type or a boolean), so both routing (parseLaneConnection()) and the fallback log's once-per-generation cadence read the same single field"

key-files:
  created:
    - bbj-vscode/test/java-interop-parse-lane.test.ts
  modified:
    - bbj-vscode/src/language/java-interop.ts
    - bbj-vscode/test/fake-interop-peer.ts

key-decisions:
  - "The dedicated connection is tied to connectionGeneration rather than getting its own breaker: opened once per generation, retired (never retried) once opening fails within that generation, and reopened only when the generation moves on — matching the plan's discretion item 2."
  - "Losing the dedicated connection after it was open bumps connectionGeneration by exactly one (a third bump site alongside establishConnection() and clearCache()), so BBjParserService's existing generation-keyed latch and verdict-clear logic picks it up unmodified; opening it never bumps the generation, since the server behind it is the one the shared connection already probed."
  - "disposeParseLane() clears the field before calling dispose(), so a voluntary disposal (generation retirement, the MethodNotFound branch, clearCache()) never re-enters onParseLaneLost's generation-bump path through its own close listener — only a connection lost out from under the service (server-initiated) bumps the generation."
  - "The fake peer's connection ids are assigned in wrapSocket() creation order, not in createSocket() attempt order, so a refused attempt (no successful wrap) never consumes an id — matching the production code's own 'connection 1 is the shared connection, connection 2 is the dedicated one' framing in the simple case."

patterns-established:
  - "Test doubles that model more than one live connection need connection-scoped pending-request bookkeeping (connectionId on both SentRequest and the internal pending-request record) rather than one shared pending list, once a test wants to hang or drop one connection without disturbing another."

requirements-completed: [RESP-04]

coverage:
  - id: D1
    description: "A parse sent through parseProgram() rides a dedicated MessageConnection to the same interop host/port, answered while fifty class lookups sit unanswered on the shared connection"
    requirement: "RESP-04"
    verification:
      - kind: unit
        ref: "test/java-interop-parse-lane.test.ts#a parse is answered on its own connection while class lookups on the shared connection are still pending"
        status: pass
    human_judgment: false
  - id: D2
    description: "When the dedicated connection cannot be opened, a parse falls back to the shared connection, warns exactly once per generation with only the socket error text (never document text), never shows a dialog, and leaves connectionGeneration and the breaker untouched; a second parse in the same generation makes no further attempt, and clearCache() lets the next parse try again"
    requirement: "RESP-04"
    verification:
      - kind: unit
        ref: "test/java-interop-parse-lane.test.ts#with the dedicated connection refused, a parse succeeds over the shared connection, warns once with only the refusal text, never shows a dialog, and leaves the generation unchanged"
        status: pass
      - kind: unit
        ref: "test/java-interop-parse-lane.test.ts#a second parse in the same generation opens no new socket and logs nothing; clearCache() makes the next parse try the dedicated connection again"
        status: pass
    human_judgment: false
  - id: D3
    description: "Two same-tick parseProgram calls open exactly one dedicated socket and both requests carry the same connection id"
    requirement: "RESP-04"
    verification:
      - kind: unit
        ref: "test/java-interop-parse-lane.test.ts#two same-tick parses open exactly one dedicated socket and both requests carry the same connection id"
        status: pass
    human_judgment: false
  - id: D4
    description: "Opening the dedicated connection leaves connectionGeneration unchanged; losing it after it was open bumps the generation by exactly one, so a subsequent class lookup stays on the shared connection with no new socket and the next parse opens a fresh dedicated connection"
    requirement: "RESP-04"
    verification:
      - kind: unit
        ref: "test/java-interop-parse-lane.test.ts#opening the dedicated connection leaves the generation unchanged; losing it bumps the generation by one, the next class lookup stays on the shared connection, and the next parse reopens a dedicated connection"
        status: pass
    human_judgment: false
  - id: D5
    description: "A parse pending on a hung dedicated connection rejects when that connection drops, and the rejection is classified as a transport failure by isInteropTransportFailure"
    requirement: "RESP-04"
    verification:
      - kind: unit
        ref: "test/java-interop-parse-lane.test.ts#a parse pending on a hung dedicated connection rejects as a transport failure when that connection drops"
        status: pass
    human_judgment: false
  - id: D6
    description: "A MethodNotFound answer on the dedicated connection (an older server) rejects the parse unchanged, disposes the dedicated connection, and routes a further parse in the same generation over the shared connection with no new socket attempt"
    requirement: "RESP-04"
    verification:
      - kind: unit
        ref: "test/java-interop-parse-lane.test.ts#an older server behind the dedicated connection: the parse rejects with MethodNotFound, the dedicated connection is disposed, and the next parse in the same generation uses the shared connection with no new socket"
        status: pass
    human_judgment: false
  - id: D7
    description: "clearCache() disposes the dedicated connection alongside the shared one; with the shared connection unreachable, a parse rejects exactly as before (a transport failure) with a single socket attempt and no dedicated attempt"
    requirement: "RESP-04"
    verification:
      - kind: unit
        ref: "test/java-interop-parse-lane.test.ts#clearCache marks the dedicated connection disposed"
        status: pass
      - kind: unit
        ref: "test/java-interop-parse-lane.test.ts#with the peer down, a parse rejects as a transport failure with a single socket attempt and no dedicated attempt"
        status: pass
    human_judgment: false
  - id: D8
    description: "A real BBjParserService driving a fake document through requestLiveParse over the dedicated connection: dropping that connection makes the next isEnabled() call clear the document's stored verdict state"
    requirement: "RESP-04"
    verification:
      - kind: unit
        ref: "test/java-interop-parse-lane.test.ts#a real BBjParserService over the fake peer: dropping the dedicated connection clears a document verdict state on the next isEnabled() call"
        status: pass
    human_judgment: false
  - id: D9
    description: "The breaker, java-interop-service, java-interop-timeouts and bbj-parser-service suites all stay green; tsc -b exits 0; no added source or test line carries a planning identifier"
    requirement: "RESP-04"
    verification:
      - kind: unit
        ref: "test/java-interop-breaker.test.ts, test/java-interop-service.test.ts, test/java-interop-timeouts.test.ts, test/bbj-parser-service.test.ts (all files, all tests)"
        status: pass
      - kind: other
        ref: "npx tsc -b tsconfig.json"
        status: pass
    human_judgment: false

duration: 14min
completed: 2026-09-23
status: complete
---

# Phase 105 Plan 03: Dedicated Parser Connection Summary

**`parseProgram` now travels its own `MessageConnection` to `bbj-ls`, opened lazily and tied to `connectionGeneration`, so a live parse is answered immediately even while dozens of `getClassInfo` lookups from a large workspace's startup build sit unanswered on the shared connection — falling back silently to the shared connection, logged once per generation, when the dedicated one cannot be opened or an older server rejects it.**

## Performance

- **Duration:** 14 min
- **Started:** 2026-09-23T12:33:12Z (approx., immediately after 105-02)
- **Completed:** 2026-09-23T12:46:46Z
- **Tasks:** 2 completed
- **Files modified:** 3 (1 created, 2 modified)

## Accomplishments

- `JavaInteropService.parseProgram()` opens a second `MessageConnection` lazily on first use (`parseLaneConnection()`/`openParseLane()`), reusing the service's own `createSocket()`/`wrapSocket()` so it reads the same `interopHost`/`interopPort` — proven end to end by a tracer test where a parse is answered while fifty `getClassInfo` lookups sit unanswered on the shared, hung connection.
- The dedicated connection is tied to `connectionGeneration`, not a second breaker: at most one open attempt per generation (`parseLaneRetiredGeneration`), a shared in-flight promise for same-tick callers (`parseLaneConnecting`, mirroring `connect()`'s own `connectingPromise`), and no retry after a failed open until the generation moves on.
- When the dedicated connection cannot be opened, `parseProgram()` falls back to the shared connection; the fallback is logged with exactly one `logger.warn` line per generation carrying only the socket error text, never document text, never a dialog, and never touching the breaker or the endpoint probe latch.
- Losing the dedicated connection after it was open (`onParseLaneLost`) bumps `_connectionGeneration` by exactly one — a third, newly-documented bump site alongside `establishConnection()` and `clearCache()` — so `BBjParserService`'s existing generation-keyed latch and verdict-clear logic resets unmodified, while the shared connection stays in use with no new socket. Opening the dedicated connection itself never bumps the generation.
- A `MethodNotFound` answer on the dedicated connection (an older server) is rethrown unchanged to the caller, and the connection is disposed and not reopened for the rest of that generation, so a pre-endpoint `bbj-ls` never keeps an idle second socket.
- `clearCache()` disposes the dedicated connection alongside the shared one and resets `parseLaneRetiredGeneration`, so the next parse after a cache clear tries the dedicated connection again from scratch.
- `test/fake-interop-peer.ts` gained per-connection identity (`connectionId` on every `SentRequest`, assigned in `wrapSocket()` creation order), `hungConnectionIds`/`refusedSocketAttempts` for addressing one connection independently, a `parseProgram` handler (with `parseProgramMethodMissing` for the older-server case), and `connectionRecords()`/targeted `dropConnection(connectionId?)` for inspecting and disposing one connection without disturbing another — all additive, so the existing circuit-breaker suite (`java-interop-breaker.test.ts`) stays green unchanged.

## Task Commits

Each task was committed atomically; Task 2 carried `tdd="true"`:

1. **Task 1: dedicated connection tracer** - `14111443` (feat) — `parseLaneConnection()`/`openParseLane()`/`onParseLaneLost()`/`disposeParseLane()` and `parseProgram()`'s new routing, plus the fake peer's connection-id plumbing and the tracer test.
2. **Task 2 RED: failing tests for fallback and lifecycle** - `35142593` (test)
3. **Task 2 GREEN: fallback, lifecycle and verdict-clear implementation** - `70bfe4d8` (feat)

**Plan metadata:** commit pending (this SUMMARY + STATE.md + ROADMAP.md + REQUIREMENTS.md)

## Files Created/Modified

- `bbj-vscode/src/language/java-interop.ts` — added `parseLane`/`parseLaneGeneration`/`parseLaneConnecting`/`parseLaneRetiredGeneration` fields, `parseLaneConnection()`, `openParseLane()`, `onParseLaneLost()`, `disposeParseLane()`; changed `parseProgram()`'s routing and `clearCache()`'s disposal; extended the `_connectionGeneration` doc comment to name the third bump site
- `bbj-vscode/test/fake-interop-peer.ts` — added `SentRequest.connectionId`, `refusedSocketAttempts`, `hungConnectionIds`, `parseProgramMethodMissing`, `connectionRecords()`, and a `dropConnection(connectionId?)` that targets one connection or every connection; `wrapSocket()` now assigns and tracks a per-connection id and disposed flag
- `bbj-vscode/test/java-interop-parse-lane.test.ts` (new) — the tracer test plus nine behavior tests covering the fallback, dedup, generation lifecycle, transport-failure classification, the older-server branch, `clearCache()` disposal, the peer-down path, and verdict-state clearing through a real `BBjParserService`

## Decisions Made

- The dedicated connection reuses `connect()`'s own template (`createSocket()`/`wrapSocket()`, an in-flight-promise dedup) rather than a parallel implementation or its own breaker — matching the plan's own discretion item 2 and keeping the new state surface small (four fields, no new state machine).
- `disposeParseLane()` clears the field before calling `dispose()`, so any close/error event that fires as a direct result of a voluntary disposal (retiring an older generation's lane, the `MethodNotFound` branch, `clearCache()`) finds `this.parseLane` already cleared and takes `onParseLaneLost()`'s no-op branch — only a connection lost out from under the service (the server closing it) reaches the generation-bump path.
- The fake peer's connection ids are assigned in `wrapSocket()` creation order (only successful opens), not `createSocket()` attempt order, so a refused attempt never consumes an id — this is what lets a fallback test reliably predict "the dedicated connection, opened next, will be connection 2" without reading internal counters.

## Deviations from Plan

None — plan executed exactly as written. Task 1's production code (the parse-lane fields, routing, open/lost/dispose methods) was written together with the fake peer's connection-id plumbing and its tracer test, matching the plan's own "production code; the fallback and lifecycle come in Task 2" framing. Task 2 followed the plan's explicit TDD instruction ("watch the new ones fail; then implement"): the nine behavior tests were written first, verified RED against the Task-1-only state (4 of the 9 failed, exercising exactly the not-yet-built fallback/generation-bump/MethodNotFound/clearCache behaviors — the other 5 already passed against Task 1's partial routing, which is expected), then the fallback/lifecycle production code was added and all 9 confirmed GREEN. Two test-authoring bugs surfaced and were fixed during the RED→GREEN pass (both in the test file, not production code): a `connectionGeneration` baseline captured before the shared connection's own generation-bumping open, and a missing `vi.restoreAllMocks()`/`vi.clearAllMocks()` in the new describe block's `afterEach` that let a `logger.warn` spy's call count leak across tests within the same file.

## Issues Encountered

None beyond the two test-authoring bugs above, both caught and fixed before the GREEN commit.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- RESP-04 is now Complete in REQUIREMENTS.md (no sibling plan in this phase declares it — confirmed via `requirements.ready-ids`).
- The dedicated connection is production code, not a throwaway tracer: it is what plan 04's interleaving work and plan 05's before/after measurement will actually exercise on the live `bbj-corpus` workspace.
- The residual server-side risk flagged in the plan's `flagged_assumptions` (a BBj 26.03 build without `bbj-ls@9987bee`'s `ParserCacheGuard` on `release/26.03` could hand a fresh dedicated connection a stale source snapshot) is unchanged by this plan — it is a transfer-disposition threat (T-105-12) for the user to backport, not something the client side can detect or mitigate.
- No blockers for plan 04 or plan 05.

---
*Phase: 105-live-diagnostics-responsiveness-on-large-workspaces*
*Completed: 2026-09-23*

## Self-Check: PASSED

- `bbj-vscode/src/language/java-interop.ts` exists on disk
- `bbj-vscode/test/fake-interop-peer.ts` exists on disk
- `bbj-vscode/test/java-interop-parse-lane.test.ts` exists on disk
- Commits `14111443`, `35142593`, `70bfe4d8` all found in `git log --oneline --all`
- All 10 tests in `test/java-interop-parse-lane.test.ts` pass; `test/java-interop-breaker.test.ts` (11), `test/java-interop-service.test.ts`, `test/java-interop-timeouts.test.ts` and `test/bbj-parser-service.test.ts` all pass unchanged (72 tests total across the four regression files plus the new file); `npx tsc -b tsconfig.json` exits 0 with no output
- The register check (`git diff -U0 9601e7122827888ad308611553f9ee145ce9b1fe -- <all three files> | grep '^+' | grep -E 'RESP-0|D-[0-9][0-9]|10[0-9]-[0-9][0-9]|CR-[0-9]|WR-[0-9]|T-105-'`) finds nothing — exit 1
- Acceptance-criteria greps: `parseLaneConnection` count 3 (≥2), `notifyJavaConnectionError` count 2 (exactly 2, unchanged from the phase base), `_connectionGeneration++` count 3, `parseLaneRetiredGeneration` count 5 (≥4)
