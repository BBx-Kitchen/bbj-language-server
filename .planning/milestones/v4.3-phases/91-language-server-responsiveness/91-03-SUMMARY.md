---
phase: 91-language-server-responsiveness
plan: 03
subsystem: language-server
tags: [java-interop, circuit-breaker, vscode-jsonrpc, vitest]

# Dependency graph
requires: []
provides:
  - "JavaInteropService: a request-driven closed/open/half-open circuit breaker guarding connect(), with INTEROP_BREAKER_INITIAL_COOLDOWN_MS/INTEROP_BREAKER_BACKOFF_FACTOR/INTEROP_BREAKER_MAX_COOLDOWN_MS exported constants"
  - "InteropTransportError and isInteropTransportFailure(error): the transport-failure classifier used to decide which failure stubs are safe to cache"
  - "JavaInteropService.onConnectionRecovered(listener): fires once per half-open-to-closed transition, scheduled with Promise.resolve().then(...), for a later plan to wire into a document re-check"
  - "JavaInteropService.wrapSocket(socket): extraction point letting a test double swap in a scriptable fake peer behind the real connect() path"
  - "test/fake-interop-peer.ts: FakePeerInteropService and createFakePeerServices() — a scriptable fake java-interop peer for fake-timer regression tests"
  - "test/java-interop-breaker.test.ts: 11 fake-timer regression tests for the breaker (#504)"
affects: [91-05, 91-06]

actuals:
  tokens: 9473
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "A three-state (closed/open/half-open) circuit breaker sits in front of an existing shared in-flight-promise connect(), classifying only connect-level failures (never a post-connect request timeout) as trip-worthy, so a slow-but-healthy peer never opens the breaker"
    - "A generation counter bumped by the one hard reset point (clearCache()) invalidates any connect attempt already in flight, so a stale probe cannot flip breaker state or report recovery after a reset"
    - "A stub-cache flag already on the existing createStubClass(className, cache) helper is driven by a transport-failure classifier, narrowing caching to genuine backend 'not found' answers instead of every failure"
    - "A callback registered from outside a shared service (onConnectionRecovered) is fired asynchronously via Promise.resolve().then(...) and never awaited by the caller, so a listener that re-enters resolution cannot block or deadlock the breaker's own connect() call"

key-files:
  created:
    - bbj-vscode/test/fake-interop-peer.ts
    - bbj-vscode/test/java-interop-breaker.test.ts
  modified:
    - bbj-vscode/src/language/java-interop.ts

key-decisions:
  - "Breaker trip threshold, cooldown values (5s initial, x2 backoff, 30s cap) and connect-vs-request-timeout classification are the plan's own discretionary starting point; tests read the exported constants, never a literal number"
  - "The breaker's due-time check happens before acquireLock()/lockQueue are ever touched, so the existing resolution lock and its re-entrant token scheme are byte-for-byte unchanged"
  - "getRawClass's 10s request race and doResolveClassByName's 30s chain race now reject with InteropTransportError (same message text) instead of a plain Error, so both classify as transport failures without changing any existing test's message-matching assertion"
  - "ensureCompleteClassIndex's already-resolved fast path calls a new probeIfDue() that starts (but never awaits) a half-open probe when due — the only way a candidate-lookup request (never itself touching connect()) can still trigger recovery with no edit"
  - "loadImplicitImports' simple-name copies are deduplicated by a package+simpleName map so a second run (recovery re-check, or a manual Refresh Java Classes) never grows the synthetic classpath document"

requirements-completed: []  # RESP-02 is also declared by plans 91-05 and 91-06, neither summarized yet — not marked Complete here per phase instruction; will be marked once every declaring plan lands

coverage:
  - id: D1
    description: "Twenty distinct unresolved classes against an unreachable peer settle within about one connect timeout in total, with exactly one socket attempt and one error popup; none of the resulting stubs are cached"
    requirement: "RESP-02"
    verification:
      - kind: unit
        ref: "test/java-interop-breaker.test.ts#java-interop circuit breaker (#504) > twenty unresolved classes against an unreachable peer settle within one connect timeout"
        status: pass
    human_judgment: false
  - id: D2
    description: "After the cooldown elapses, the next lookup becomes the single half-open probe; success closes the breaker, resets the cooldown and fires a recovery listener without clearCache(); a further lookup does not re-fire the listener"
    requirement: "RESP-02"
    verification:
      - kind: unit
        ref: "test/java-interop-breaker.test.ts#java-interop circuit breaker (#504) > the peer coming back is picked up by the next lookup after the cooldown, without clearCache"
        status: pass
    human_judgment: false
  - id: D3
    description: "Repeated failed probes back off the cooldown by the backoff factor up to the cap, staying silent (no additional popup) the whole time"
    requirement: "RESP-02"
    verification:
      - kind: unit
        ref: "test/java-interop-breaker.test.ts#java-interop circuit breaker (#504) > failed probes back off up to the cap and stay silent"
        status: pass
    human_judgment: false
  - id: D4
    description: "Only one probe runs while the breaker is half-open; a second concurrent caller short-circuits instead of opening a second socket"
    requirement: "RESP-02"
    verification:
      - kind: unit
        ref: "test/java-interop-breaker.test.ts#java-interop circuit breaker (#504) > only one probe runs while half-open"
        status: pass
    human_judgment: false
  - id: D5
    description: "clearCache() resets the breaker to closed, and a connect attempt started before the reset can no longer flip breaker state or report recovery"
    requirement: "RESP-02"
    verification:
      - kind: unit
        ref: "test/java-interop-breaker.test.ts#java-interop circuit breaker (#504) > clearCache resets the breaker and a stale probe cannot report recovery"
        status: pass
    human_judgment: false
  - id: D6
    description: "A second outage after a successful recovery shows a second popup — dedup is per-outage, not permanent"
    requirement: "RESP-02"
    verification:
      - kind: unit
        ref: "test/java-interop-breaker.test.ts#java-interop circuit breaker (#504) > a second outage after recovery shows a second popup"
        status: pass
    human_judgment: false
  - id: D7
    description: "A connected-but-slow peer never trips the breaker: only the connect-level failure counts, not a post-connect request timeout"
    requirement: "RESP-02"
    verification:
      - kind: unit
        ref: "test/java-interop-breaker.test.ts#java-interop circuit breaker (#504) > a connected but slow peer does not trip the breaker"
        status: pass
    human_judgment: false
  - id: D8
    description: "isInteropTransportFailure classifies InteropTransportError, ConnectionError and a PendingResponseRejected ResponseError as transport failures, and any other error as a genuine backend answer"
    requirement: "RESP-02"
    verification:
      - kind: unit
        ref: "test/java-interop-breaker.test.ts#java-interop circuit breaker (#504) > transport failures are classified"
        status: pass
    human_judgment: false
  - id: D9
    description: "A connection dropped mid-request returns an uncached stub, and the next lookup against a genuinely down peer still opens the breaker with one popup"
    requirement: "RESP-02"
    verification:
      - kind: unit
        ref: "test/java-interop-breaker.test.ts#java-interop circuit breaker (#504) > a connection dropped mid-request returns an uncached stub"
        status: pass
    human_judgment: false
  - id: D10
    description: "A class-candidate lookup answered entirely from the local complete class index still starts the half-open probe in the background, without waiting for it"
    requirement: "RESP-02"
    verification:
      - kind: unit
        ref: "test/java-interop-breaker.test.ts#java-interop circuit breaker (#504) > a candidate lookup answered from the complete class index still starts the probe"
        status: pass
    human_judgment: false
  - id: D11
    description: "loadImplicitImports() can run a second time without clearCache() and adds no duplicate entry to the synthetic classpath document"
    requirement: "RESP-02"
    verification:
      - kind: unit
        ref: "test/java-interop-breaker.test.ts#java-interop circuit breaker (#504) > implicit imports load again without clearCache and without duplicate classpath entries"
        status: pass
    human_judgment: false

duration: ~35min
completed: 2026-09-13
status: complete
---

# Phase 91 Plan 03: Java Interop Circuit Breaker Summary

**A request-driven three-state circuit breaker in `java-interop.ts` turns an interop outage from N connect timeouts into one, and recovers on its own without `clearCache()`.**

## Performance

- **Duration:** ~35 min
- **Started:** 2026-09-13T00:24:00Z
- **Completed:** 2026-09-13T00:38:20Z
- **Tasks:** 3
- **Files modified:** 3 (1 production, 2 test)

## Accomplishments

- A closed/open/half-open breaker guards `connect()`: one connect-level failure opens it, every concurrent or subsequent lookup short-circuits immediately (no socket attempt) until a cooldown elapses, and exactly one `notifyJavaConnectionError` popup fires per outage (on the closed-to-open transition only).
- After the cooldown, the next lookup becomes the single half-open probe; success closes the breaker, resets the cooldown, and fires a new `onConnectionRecovered` listener asynchronously — success needs no `clearCache()`. A failed probe backs off the cooldown (x2, capped at 30s) silently.
- Stub caching narrows to genuine "not found": `getRawClass`'s request timeout, `doResolveClassByName`'s chain timeout, a breaker short-circuit, and a dropped-connection rejection all classify as transport failures via the new `isInteropTransportFailure(error)` and are never cached, so the class resolves normally once the peer returns. A connected-but-slow peer's timeout is classified the same way but never trips the breaker (only a failed `connect()` does).
- `ensureCompleteClassIndex`'s already-resolved fast path now starts (but never awaits) the half-open probe when due, so a class-candidate lookup answered entirely from the local index — the only language-server path that can run without an edit — still brings recovery.
- `loadImplicitImports()` can re-run safely (the recovery path a later plan wires up) without duplicating entries in the synthetic classpath document.
- A scriptable fake java-interop peer (`test/fake-interop-peer.ts`) sits behind the real `connect()` path (only `createSocket()`/`wrapSocket()` are overridden), backing 11 new fake-timer regression tests in `test/java-interop-breaker.test.ts`.

## Task Commits

1. **Task 1: Twenty unresolved classes against an unreachable peer settle within one connect timeout, with one socket attempt, one popup and nothing cached** - `68684f44` (feat)
2. **Task 2: After the cooldown a single half-open probe re-tests the peer; success resumes resolution without clearCache and signals recovery once; failure backs off silently; clearCache resets** - `25446e40` (feat)
3. **Task 3: A slow-but-connected peer never trips the breaker; request, chain and dropped-connection failures are never cached; candidate lookups carry the probe; implicit imports reload safely** - `151f8ba5` (fix)

**Plan metadata:** (this commit)

## Pre-change Failing Counts (RED before each task's production step)

- **Task 1**, before any breaker code existed: the twenty-class test's own settlement loop showed only 1 of 20 classes settled within 10050ms of fake time, `socketAttempts` was 2 (a second class had already opened its own socket, since the lock serializes lookups and each one attempted its own connect), and `showErrorMessage` had fired once. The test failed at its first assertion (`settled.every(Boolean)` was `false`).
- **Task 2**, against Task 1's committed code (no half-open logic yet): 4 of 5 new tests failed — `onConnectionRecovered` did not exist yet (`TypeError`), the backoff test's socket-attempt count was off by one (every due-time crossing attempted a plain reconnect, not a single gated probe), the half-open concurrency test timed out (a second concurrent caller opened its own socket instead of short-circuiting), and `clearCache()`'s stale-probe guard test failed (`showErrorMessage` stayed at 1 instead of 2, since nothing reopened the breaker after the reset in the way the test expected). Only the "second outage after recovery" test passed coincidentally, since it doesn't exercise probe concurrency or backoff.
- **Task 3**, against Task 2's committed code: 3 of 5 new tests failed — the slow-peer test failed because `getRawClass`'s timeout still rejected a plain `Error`, so it was cached like `test.SlowA` (`getResolvedClass` returned a defined stub instead of `undefined`); the candidate-lookup-recovers test failed because `ensureCompleteClassIndex`'s already-resolved branch made no `probeIfDue()` call yet (`socketAttempts` stayed at 1 instead of 2, and the recovery listener was never called); the implicit-imports-dedupe test failed because a second run unconditionally pushed two more entries into `classpath.classes` (4 total instead of 2). The classifier test and the dropped-connection test already passed, since `isInteropTransportFailure` and the breaker's own short-circuit path were already correct from Task 1.

## Files Created/Modified

- `bbj-vscode/src/language/java-interop.ts` — the breaker state machine (`connect()`, `onConnectAttemptSettled`, `throwCircuitOpen`, `probeIfDue`, `fireRecoveryListeners`, `onConnectionRecovered`), `wrapSocket()` extraction, `InteropTransportError`/`isInteropTransportFailure`, the three exported cooldown constants, the transport-classified stub-cache flag in `doResolveClassByName`'s catch, `getRawClass`/`doResolveClassByName`'s timeout races now rejecting with `InteropTransportError`, the `implicitImportCopies` dedupe map in `loadImplicitImports`, and `clearCache()`'s breaker/dedupe-map reset.
- `bbj-vscode/test/fake-interop-peer.ts` — new. `FakePeerInteropService` (scriptable `createSocket()`/`wrapSocket()` overrides, `peerUp`/`connectDelayMs`/`answerRequests`/`packageClasses` knobs, `dropConnection()`, `seedCompleteClassIndex()`, `classpathClassCount()`) and `createFakePeerServices()`.
- `bbj-vscode/test/java-interop-breaker.test.ts` — new. 11 tests under `java-interop circuit breaker (#504)`.

## Decisions Made

See key-decisions in frontmatter. No deviation from the plan's discretionary choices was needed.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None. All three tasks' RED states were confirmed exactly as the plan's acceptance criteria anticipated before implementing each task's production step (see "Pre-change Failing Counts" above).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `onConnectionRecovered` exists and is ready for plan 91-05 to wire into the open-document re-check (reset `file`-scheme documents to `Parsed` and re-run `DocumentBuilder.update`, reusing `main.ts`'s existing `reloadJavaClassesAndRevalidate` steps 2-4).
- No file under `bbj-intellij/` was touched, confirmed by `git diff 174985f7 --stat -- bbj-intellij` printing nothing.
- Whole-suite `npm test` (RUN_BBJ_TESTS=0, `--maxWorkers=2`) is green: `numFailedTests: 0` across 1846 tests (1817 passed, 29 pending — the known local `linking.test.ts`/`issue447-real-interop` interop-drift skips and other pre-existing skips), `numFailedTestSuites: 0`.
- No blockers for plans 91-04/91-05/91-06.

---
*Phase: 91-language-server-responsiveness*
*Completed: 2026-09-13*

## Self-Check: PASSED

- FOUND: bbj-vscode/test/fake-interop-peer.ts
- FOUND: bbj-vscode/test/java-interop-breaker.test.ts
- FOUND: .planning/phases/91-language-server-responsiveness/91-03-SUMMARY.md
- FOUND commit: 68684f44
- FOUND commit: 25446e40
- FOUND commit: 151f8ba5
