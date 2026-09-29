---
phase: 121-java-interop-service-decomposition
plan: "04"
subsystem: api
tags: [java-interop, refactor, circuit-breaker, tracer]

requires:
  - phase: 121-java-interop-service-decomposition
    provides: "plan 03's request lock extraction and exports-check.mjs, the D-08 exports check this plan reuses"
provides:
  - "bbj-vscode/src/language/java-interop-connection.ts exporting JavaInteropConnection (connect, probeIfDue, onConnectionRecovered, setConnectionConfig, getConnectionConfig, openSocket, requestClassInfo, resetBreaker, disconnect, generation), InteropConnectionHooks, createSocketMessageConnection, plus the moved InteropTransportError, isInteropTransportFailure, METHOD_NOT_FOUND and the three INTEROP_BREAKER_* constants"
  - "the front class's private readonly interopConnection field, built with call-time hooks bound to its own createSocket/wrapSocket/connect, and the protected _connectionGeneration get/set accessor pair onto the module's generation"
  - "test/java-interop-connection.test.ts, the connection module's own 9-test unit suite with a stub socket factory and no JavaInteropService"
affects: [121-05-through-121-10-javainteropservice-split]

actuals:
  tokens: 13188
  tasks: 3
  commits: 2

tech-stack:
  added: []
  patterns:
    - "Second REF-12 extraction: a sibling module built and held by the front class as a private readonly field, with the front's own protected hooks (createSocket, wrapSocket, connect) wired in as call-time arrow functions so a subclass override still fires — the module's internal callers (probeIfDue, requestClassInfo) reach the peer only through hooks.connect(), never through the module's own connect() directly, so an overridden connect() (e.g. HangingBackendInterop, JavaInteropTestService) still takes effect."

key-files:
  created:
    - bbj-vscode/src/language/java-interop-connection.ts
    - bbj-vscode/test/java-interop-connection.test.ts
  modified:
    - bbj-vscode/src/language/java-interop.ts

key-decisions:
  - "The stub hooks object's own `connect` hook calls the connection instance's own connect() (the plan's stated default the front provides), via a `let connection` forward reference assigned right after construction — mirrors the real front's `connect: () => this.connect()` wiring exactly, including the property that a test can still swap what the hook does per call by mutating the outer socketMode flag."
  - "The 6 behavior bullets in the plan were split into 9 tests: bullet 1 (open-then-reuse, same-tick-share) split in two; bullet 3 (successful-probe-recovery, failed-probe-backoff) split in two, with the backoff test built as a 4-round loop (mirroring java-interop-breaker.test.ts's own cooldown-tracking idiom) to prove the cooldown genuinely reaches and stays at INTEROP_BREAKER_MAX_COOLDOWN_MS rather than asserting one doubled value; bullet 4 (resetBreaker-opens-socket, stale-attempt-after-reset) split in two."
  - "Discovered and corrected a wrong first draft of the backoff test: the breaker's onConnectAttemptSettled sets the NEXT breakerProbeDueAt using the cooldown value active DURING the probe that just failed, and only doubles breakerCooldownMs afterward for the round after that — so the first failed probe's next due time is `now + INITIAL_COOLDOWN` (2x INITIAL_COOLDOWN measured from when the breaker first opened), not `now + 2*INITIAL_COOLDOWN` from the probe itself. The test's first version asserted the latter and failed against the real (unchanged) breaker logic; the fix matches java-interop-breaker.test.ts's own reference loop exactly."

requirements-completed: []

coverage:
  - id: D1
    description: "The shared connection, its three-state circuit breaker, the connection generation and the recovery listeners move verbatim into java-interop-connection.ts as JavaInteropConnection; the front's protected createSocket/wrapSocket/connect/getRawClass hooks and the _connectionGeneration accessor pair stay overridable, reached by the module only through call-time hooks (never a bound method, never the module's own connect() bypassing an override); clearCache's breaker/generation reset and connection dispose steps become interopConnection.resetBreaker()/disconnect() in their same slots"
    requirement: "REF-12"
    verification:
      - kind: unit
        ref: "bbj-vscode/test/java-interop-connection.test.ts (9 tests: open-then-reuse, same-tick-share, socket-failure-opens-breaker, successful-probe-recovery, failed-probe-backoff-to-cap, resetBreaker-opens-socket, stale-attempt-after-reset, disconnect-then-reconnect, probeIfDue-gated-by-breaker-state)"
        status: pass
      - kind: unit
        ref: "the twelve targeted suites (eight java-interop-*.test.ts plus interop-config, bbj-parser-service, java-class-refresh, java-class-reload) — 12 files, 208 tests"
        status: pass
    human_judgment: false
  - id: D2
    description: "The extraction touches only its three files, no pre-existing test file changed, the whole suite matches the phase base in failing test names, lint/typecheck/build/hygiene are clean, and REQUIREMENTS.md is untouched"
    verification:
      - kind: unit
        ref: "Task 3's four verify commands (scope, whole-suite JSON comparison, gates, hygiene) — all four print their expected OK line"
        status: pass
    human_judgment: false

duration: 22min
completed: 2026-09-29
status: complete
---

# Phase 121 Plan 04: Java Interop Connection Extraction, First Half (REF-12, second of five) Summary

**The shared connection, three-state circuit breaker, connection generation and recovery listeners move out of `JavaInteropService` into a new `java-interop-connection.ts` module (`JavaInteropConnection`), reached only through call-time hooks so every hermetic test double's overridden `connect()`/`createSocket()`/`wrapSocket()` still fires, with a 9-test unit suite of its own and the eight interop suites plus the whole test suite staying green against the phase base.**

## Performance

- **Duration:** 22 min
- **Started:** 2026-09-29T11:15:21Z (approx.)
- **Completed:** 2026-09-29T11:38:00Z (approx.)
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments

- `bbj-vscode/src/language/java-interop-connection.ts` created (370 lines): `export class JavaInteropConnection` built with `constructor(private readonly hooks: InteropConnectionHooks)`. Holds the shared `connection`/`connectingPromise` fields, `interopHost`/`interopPort`, the four breaker fields, a public `generation` field (was `protected _connectionGeneration` on the front) and `recoveryListeners`. Methods: public `connect()` (the real breaker-guarded logic, unchanged body apart from field/hook renames), private `throwCircuitOpen`/`onConnectAttemptSettled`/`fireRecoveryListeners`/`establishConnection` (now calling `this.hooks.createSocket()`/`this.hooks.wrapSocket(socket)`), public `onConnectionRecovered`, public `probeIfDue()` (now calling `this.hooks.connect()`), public `setConnectionConfig`/`getConnectionConfig`, public `openSocket()` (was `createSocket`) and public `requestClassInfo()` (was `getRawClass`, now calling `this.hooks.connect()`), plus the new `resetBreaker()` (clearCache's former step 4, same statement order) and `disconnect()` (clearCache's former step 6's connection-dispose half). Also holds the module-level moves: the three `INTEROP_BREAKER_*` constants, `InteropTransportError`, `isInteropTransportFailure`, `METHOD_NOT_FOUND`, the unexported `ClassInfoParams`/`getClassInfoRequest`, and the new `createSocketMessageConnection()` function (wrapSocket's one-line body) plus the `InteropConnectionHooks` interface. Imports only `net`, `vscode-jsonrpc/node.js`, `./generated/ast.js`, `./bbj-notifications.js`, `./interop-config.js` and `./logger.js` — no sibling `java-interop-*.ts` module and not `java-interop.ts`.
- `java-interop.ts` (1,492 lines, down from 1,720): the moved fields and methods deleted; `private readonly interopConnection = new JavaInteropConnection({ createSocket: () => this.createSocket(), wrapSocket: (socket) => this.wrapSocket(socket), connect: () => this.connect() })` added where `connection` used to sit; `_connectionGeneration` replaced by a `protected get`/`set` accessor pair reading/writing `this.interopConnection.generation`, so the parse lane's unchanged `this._connectionGeneration` reads/bumps keep working; `connect`/`wrapSocket`/`createSocket`/`getRawClass` are now plain (non-`async`) protected delegates returning the module's promise directly; `setConnectionConfig`/`getConnectionConfig`/`onConnectionRecovered`/`connectionGeneration` stay public, now thin delegates (the `connectionGeneration` getter needed no edit — it already read `this._connectionGeneration`, now itself an accessor); `ensureCompleteClassIndex`'s `this.probeIfDue()` became `this.interopConnection.probeIfDue()`; `clearCache()`'s breaker/generation-reset block became `this.interopConnection.resetBreaker();` and its connection-dispose block became `this.interopConnection.disconnect();`, both in their original slots, followed unchanged by `this.disposeParseLane(); this.parseLaneRetiredGeneration = -1;`. Re-exports `InteropTransportError`, `isInteropTransportFailure`, the three `INTEROP_BREAKER_*` constants and `METHOD_NOT_FOUND` from the new module (D-08); unused imports (`ConnectionError`, `createMessageConnection`, `ErrorCodes`, `ResponseError`, `SocketMessageReader`, `SocketMessageWriter`, `notifyJavaConnectionError`, `DEFAULT_INTEROP_HOST`, `DEFAULT_INTEROP_PORT`, `formatInteropRejection`, `validateInteropConfig`) removed (tsconfig `noUnusedLocals`).
- `bbj-vscode/test/java-interop-connection.test.ts` created (9 tests): builds `JavaInteropConnection` alone with a stub `InteropConnectionHooks` (a `createSocket` counter with three scriptable modes — immediate success, immediate failure, or a deferred promise released by hand for the stale-attempt test — a fake `MessageConnection` recording `listen()`/`dispose()` and keeping `onClose`/`onError` listeners, and a `connect` hook that calls the built instance's own `connect()`, mirroring the real front's wiring). Covers: first-connect-opens-then-reuses, same-tick-share, socket-failure-opens-breaker-and-short-circuits, successful-half-open-probe-fires-recovery-listener-once, failed-probe-backoff-reaching-and-staying-at-the-cap (a 4-round loop), `resetBreaker()` bumping generation and immediately re-arming, a stale in-flight failure settling after `resetBreaker()` leaving the breaker closed, `disconnect()` disposing and forcing a fresh socket + generation bump, and `probeIfDue()` calling the connect hook only when open and due.
- Tracer feedback gate (auto mode active, `workflow.auto_advance: true`): re-ran Task 1's four `<verify>` commands end-to-end after the commit — all passed (`connection extracted`, `reset order OK`, `exports OK`, 12/12 test files / 208/208 tests) — before proceeding to Task 2.
- Task 3 measured the extraction against the phase base: scope check (only the three planned files changed since this plan's own start, no pre-existing test file touched since the REF-09 end commit, no `src` file outside `java-interop*.ts` changed, no module imports `./java-interop.js`), whole-suite run (3,689 tests, 0 failed, the one pre-existing failing suite name (`installed-extension-e2e.test.ts`) unchanged from the base list), `lint`/`typecheck:test`/`build` all green, and the hygiene id-scan clean.

## Task Commits

Each task was committed atomically:

1. **Task 1: The shared connection and breaker run from JavaInteropConnection behind the unchanged protected hooks, and the breaker, loopback and timeout suites pass** - `842e43ee` (refactor)
2. **Task 2: JavaInteropConnection's own unit test with a stub socket factory** - `96535d02` (test)
3. **Task 3: Connection extraction measured against the phase base** - no code commit (measurement/SUMMARY only)

**Plan metadata:** this SUMMARY's own commit.

## Files Created/Modified

- `bbj-vscode/src/language/java-interop-connection.ts` - the extracted `JavaInteropConnection` class, its `InteropConnectionHooks` interface, `createSocketMessageConnection`, and the moved breaker constants/`InteropTransportError`/`isInteropTransportFailure`/`METHOD_NOT_FOUND`
- `bbj-vscode/src/language/java-interop.ts` - uses `this.interopConnection` in place of the former connection/breaker fields and methods; `_connectionGeneration` is now an accessor pair
- `bbj-vscode/test/java-interop-connection.test.ts` - the connection module's own 9-test unit suite

## Decisions Made

See `key-decisions` in the frontmatter: the stub `connect` hook's forward-reference wiring, the 6-bullet-to-9-test split, and the corrected backoff-test timing model (matching `java-interop-breaker.test.ts`'s own cooldown-tracking idiom rather than a naive "double the gap from this probe" reading).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] First draft of the cooldown-backoff unit test asserted the wrong next-probe due time**
- **Found during:** Task 2, first `npx vitest run` of the new test file
- **Issue:** The test asserted the second probe's due time was `now + (INITIAL_COOLDOWN * BACKOFF_FACTOR)` measured from the first probe. The actual (unchanged) production logic in `onConnectAttemptSettled` sets the next `breakerProbeDueAt` using the cooldown value that was active *during* the probe that just settled, and only doubles `breakerCooldownMs` afterward — so the correct gap is still the pre-doubling cooldown, and the "twice the cooldown" language in the plan's behavior bullet describes cumulative elapsed time from when the breaker first opened, not the gap from the most recent probe. This was a test-authoring bug, not a change to `JavaInteropConnection` — the moved logic is byte-identical to the base.
- **Fix:** Rewrote the test as a 4-round loop tracking `now`/`cooldown`/`dueAt` exactly the way `java-interop-breaker.test.ts`'s own "failed probes back off up to the cap" test does, confirming the breaker short-circuits one ms before each computed due time and lets exactly one probe through at it, and that the cooldown reaches and then stays at `INTEROP_BREAKER_MAX_COOLDOWN_MS`.
- **Files modified:** `bbj-vscode/test/java-interop-connection.test.ts` (test-only; no production code touched)
- **Verification:** `npx vitest run test/java-interop-connection.test.ts` — 9/9 tests pass.
- **Committed in:** `96535d02` (Task 2 commit; the fix landed before the commit, so no separate follow-up commit was needed)

---

**Total deviations:** 1 auto-fixed (1 bug, test-only — no production code affected).
**Impact on plan:** No production code affected; the corrected test now proves the byte-identical backoff behavior claimed by the plan's Task 1 acceptance criteria.

## Issues Encountered

None beyond the deviation above.

## Verification Evidence

**Plan start SHA:** `039e398a3c52a0fb8c27be2dc4af611b12ae40a1`
**REF-09 end SHA (from plan 02):** `c42513d31ca4cad14e58001bffd7f75a5e6ce51a`
**Precondition (plan 03 committed, exports-check.mjs green before this plan's own edits):** `exports base=15 head=15 missing=0` / `exports OK`

**Task 1 — connection extraction check:** `connection extracted` (no `breakerState`/`breakerGeneration`/`breakerCooldownMs`/`breakerProbeDueAt`/`connectingPromise`/`recoveryListeners`/`interopHost`/`interopPort`/`establishConnection`/`throwCircuitOpen`/`onConnectAttemptSettled`/`getClassInfoRequest`/`new Socket(`/`createMessageConnection(` survive in non-comment lines of `java-interop.ts`; the front builds `interopConnection` with call-time hooks; the accessor pair, delegates and re-exports are present; no `.bind(this)` anywhere; the module's own hooks/imports/timeout literals/validation call match exactly).

**Task 1 — reset order check:** `reset order OK` (`resetBreaker()`'s five statements in the base's exact order; `clearCache()`'s fourteen steps in the base's exact order with the breaker/generation and connection-dispose blocks now single `interopConnection.resetBreaker()`/`interopConnection.disconnect()` calls in their same slots).

**Task 1 — exports check:** `exports base=15 head=15 missing=0` then `exports OK`.

**Task 1 — targeted suites:** `Test Files 12 passed (12)`, `Tests 208 passed (208)` (the eight `java-interop-*.test.ts` suites plus `interop-config`, `bbj-parser-service`, `java-class-refresh`, `java-class-reload`).

**Tracer feedback gate (auto mode):** all four of Task 1's `<verify>` commands re-run and passed identically after the commit.

**Task 2 — unit suite:** static checks pass (no `JavaInteropService`/`createBBjTestServices`/`createBBjServices`/`java-interop.js` reference in the test file; imports from `../src/language/java-interop-connection.js`; 9 ≥ 6 test blocks) and `npx vitest run test/java-interop-connection.test.ts` reports `Test Files 1 passed (1)`, `Tests 9 passed (9)`.

**Task 3 — scope check:**
```
scope OK
```
(no pre-existing test file changed since the REF-09 end commit; the only added test files since the REF-09 end commit are `java-interop-connection.test.ts` and plan 03's `java-interop-lock.test.ts`; the full diff since this plan's own start touches exactly `java-interop-connection.ts`, `java-interop.ts`, `java-interop-connection.test.ts`; no `src` file outside `java-interop*.ts` changed since the REF-09 end commit; no module imports `./java-interop.js`)

**Task 3 — whole suite (suite-04):**
```
numFailedTests=0 numPassedTests=3659 numPendingTests=30 numTotalTests=3689 failedSuites=1 lines=1
```
Failing suite name: `test/functional/installed-extension-e2e.test.ts > (suite failed)` — identical to the base list (`comm -13` returned empty). `suite names OK`.

**Task 3 — gates:** `npm run lint`, `npm run typecheck:test`, `npm run build` all exit 0 (`gates OK`).

**Task 3 — hygiene:** no new planning identifier in any added `src`/`test` line, no closing-keyword commit body since the phase base, `hygiene OK`.

**REQUIREMENTS.md:** unchanged by this plan (`git diff --quiet` against the plan start SHA — REF-12 is declared by plans 03-10 and only plan 10 marks it, per the executor shell rules).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- The shared connection and circuit breaker are fully extracted and independently testable; the front class's protected hooks, public delegates and `clearCache()` all route through `interopConnection`.
- The parse lane stays on the front, unchanged, still reading/bumping `this._connectionGeneration` (now served by the accessor pair) and calling the front's own `createSocket`/`wrapSocket`/`connect` — ready for plan 05 to move it into `java-interop-connection.ts` and complete D-05's end state.
- `/home/coder/repos/tmp/phase-121/exports-check.mjs` continues to pass (base=15, head=15, missing=0) and is ready for plan 05 onward.

## Self-Check: PASSED

All key files confirmed present on disk:
- `bbj-vscode/src/language/java-interop-connection.ts` — `export class JavaInteropConnection` present.
- `bbj-vscode/test/java-interop-connection.test.ts` — 9 `test(` blocks present.
- `bbj-vscode/src/language/java-interop.ts` — `private readonly interopConnection = new JavaInteropConnection(` present; none of the moved breaker/connection fields or methods remain in non-comment lines.

Commits `842e43ee` and `96535d02` confirmed present in `git log --oneline -5`.

---
*Phase: 121-java-interop-service-decomposition*
*Completed: 2026-09-29*
