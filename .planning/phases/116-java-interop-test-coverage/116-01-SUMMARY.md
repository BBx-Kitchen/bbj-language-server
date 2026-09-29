---
phase: 116-java-interop-test-coverage
plan: "01"
subsystem: testing
tags: [java-interop, vscode-jsonrpc, vitest, loopback-socket, fake-timers, resolution-lock]

requires: []
provides:
  - "A shared loopback JSON-RPC peer (test/loopback-jsonrpc-peer.ts) reused by the Phase 115
    harness tests and a new java-interop socket suite"
  - "Real connect()/createSocket()/wrapSocket() coverage for JavaInteropService over an actual
    loopback socket, including a refused connection, a response that never arrives, and
    concurrent lookups serialized by the resolution lock"
affects: [117-dependency-hygiene-and-dependabot-coverage, 121-java-interop-service-decomposition]

actuals:
  tokens: 6300
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "Shared loopback net + vscode-jsonrpc test peer with a star (method-name) request handler,
      request/connection-id logging and in-flight/max-in-flight tracking, promoted from a
      harness-specific fixed-RequestType peer"
    - "Exposer-subclass test pattern that adds only public passthroughs and overrides no
      connection member, so production connect/socket/lock code runs unmodified against a real
      loopback socket"
    - "Fake timers scoped to toFake: ['setTimeout', 'clearTimeout'] only, installed after a real
      connection exists, so vscode-jsonrpc's setImmediate-driven message queue keeps running"

key-files:
  created:
    - bbj-vscode/test/loopback-jsonrpc-peer.ts
    - bbj-vscode/test/java-interop-socket.test.ts
  modified:
    - bbj-vscode/test/interop-harness-fake-peer.ts

key-decisions:
  - "unusedLoopbackPort() binds and closes a throwaway startLoopbackPeer() instance instead of a
    second hand-rolled net.createServer, keeping exactly one 'listen(0, 127.0.0.1)' call site in
    the shared peer module"
  - "interop-harness-fake-peer.ts's startFakePeer became a thin four-entry handler-map adapter
    over startLoopbackPeer, with a toFakePeerContext() narrowing helper so the harness's existing
    drop()-only FakePeerContext type stays unchanged"
  - "Task 3's concurrency assertion shape was settled by a throwaway probe (run once with
    --disable-console-intercept, then deleted) before committing to the test, per the plan's
    explicit instruction — see 'Probe results' below"

requirements-completed: [TEST-06]

coverage:
  - id: D1
    description: "The Phase 115 harness fake peer is generalized into one shared real loopback
      net + vscode-jsonrpc server; the harness tests run on it unchanged"
    requirement: "TEST-06"
    verification:
      - kind: integration
        ref: "test/interop-harness.test.ts (all cases)"
        status: pass
      - kind: integration
        ref: "test/interop-harness-report.test.ts (all cases)"
        status: pass
    human_judgment: false
  - id: D2
    description: "A class lookup travels from the production JavaInteropService over a real
      loopback socket to the shared peer and back (connect/createSocket/wrapSocket all run
      unmodified), with a cache hit on a repeated lookup"
    requirement: "TEST-06"
    verification:
      - kind: integration
        ref: "test/java-interop-socket.test.ts#a class lookup travels over a real loopback socket to the shared peer and back"
        status: pass
    human_judgment: false
  - id: D3
    description: "A refused connection (nothing listening) rejects with a real ECONNREFUSED and
      logs the connect failure; a lookup against it resolves to an uncached error stub. A
      response that never arrives leaves resolveClassByName pending at 9,999ms and settling with
      an uncached error at 10,000ms (getRawClass's real race); callGetRawClass rejects with the
      matching timeout message at the same boundary"
    requirement: "TEST-06"
    verification:
      - kind: integration
        ref: "test/java-interop-socket.test.ts#callConnect() rejects with ECONNREFUSED and logs the connect failure"
        status: pass
      - kind: integration
        ref: "test/java-interop-socket.test.ts#a lookup against a refused connection resolves to an uncached error stub"
        status: pass
      - kind: integration
        ref: "test/java-interop-socket.test.ts#resolveClassByName is still pending at 9,999 ms and settles with an uncached error at 10,000 ms"
        status: pass
      - kind: integration
        ref: "test/java-interop-socket.test.ts#callGetRawClass rejects with the 10s resolution-timeout message, not before"
        status: pass
    human_judgment: false
  - id: D4
    description: "Three concurrent lookups of distinct classes reach the peer one at a time, in
      call order (the resolution lock serializes them, max in-flight 1); a non-vacuity control
      (loadImplicitImports' unlocked getClassInfos burst) shows the peer can measure 2+ requests
      genuinely in flight at once"
    requirement: "TEST-06"
    verification:
      - kind: integration
        ref: "test/java-interop-socket.test.ts#three concurrent lookups of distinct classes reach the peer one at a time, in call order"
        status: pass
      - kind: integration
        ref: "test/java-interop-socket.test.ts#non-vacuity control: loadImplicitImports' unlocked getClassInfos burst shows 2+ requests genuinely in flight at once"
        status: pass
    human_judgment: false

duration: ~20min
completed: 2026-09-28
status: complete
---

# Phase 116 Plan 01: Real Java-Interop Socket Coverage Summary

**Promoted the Phase 115 harness fake peer into one shared loopback JSON-RPC server and drove the production `JavaInteropService`'s real connect/timeout/resolution-lock code over it, with zero `src/` changes.**

## Performance

- **Duration:** ~20 min
- **Started:** 2026-09-28T11:33:00Z (approximate — plan execution began within the wave-1 execution window recorded in STATE.md)
- **Completed:** 2026-09-28T11:53:30Z
- **Tasks:** 3
- **Files modified:** 3 (2 created, 1 modified)

## Accomplishments
- `test/loopback-jsonrpc-peer.ts`: one shared real `net` + `vscode-jsonrpc` loopback server (127.0.0.1, ephemeral port, star-handler method-name dispatch, per-request logging with connection id, in-flight/max-in-flight tracking, `neverAnswer()` and `unusedLoopbackPort()` controls)
- `test/interop-harness-fake-peer.ts`: `startFakePeer` is now a thin adapter over `startLoopbackPeer`; every exported name, fixture and default handler is byte-identical, and `test/interop-harness.test.ts`/`test/interop-harness-report.test.ts` pass unchanged
- `test/java-interop-socket.test.ts` (new): `LoopbackInterop` adds only public passthroughs — no `connect()`/`createSocket()`/`wrapSocket()` override — so the real production code runs against the shared peer, covering:
  - the happy-path class lookup and cache hit
  - a refused connection (ECONNREFUSED, logged, uncached error stub)
  - a response that never arrives (pending at 9,999ms, settled with an uncached error at 10,000ms via `getRawClass`'s real 10s race; `callGetRawClass` rejects with the matching message)
  - three concurrent lookups of distinct classes serialized one-at-a-time by the resolution lock, with a non-vacuity control proving the peer can detect real concurrency

## Task Commits

Each task was committed atomically:

1. **Task 1: A class lookup travels from the production JavaInteropService over a real loopback socket to the shared peer and back** — `674357a9` (feat)
2. **Task 2: A refused connection and an unanswered request both settle through the real socket code** — `b64465fc` (test)
3. **Task 3: Concurrent lookups of distinct classes reach the peer one at a time, in order** — `27e093cd` (test)

**Plan metadata:** (this commit)

## Files Created/Modified
- `bbj-vscode/test/loopback-jsonrpc-peer.ts` - the shared loopback JSON-RPC peer
- `bbj-vscode/test/interop-harness-fake-peer.ts` - now a thin adapter over the shared peer
- `bbj-vscode/test/java-interop-socket.test.ts` - real connect/timeout/lock coverage (7 tests)

## Decisions Made
- `unusedLoopbackPort()` reuses `startLoopbackPeer()` (bind-then-close) instead of a second hand-rolled `net.createServer`, so the file has exactly one `listen(0, '127.0.0.1', ...)` call site — satisfies the "one server implementation" acceptance check while keeping the same functional bind.
- `interop-harness-fake-peer.ts` keeps its own `FakePeerContext` (`drop()`-only) type; a `toFakePeerContext()` helper narrows the shared peer's richer `LoopbackPeerContext` (which also carries `connectionId`) down to it, so no harness-facing type changed.

### Probe results (Task 3, deleted before commit — not in git history)

Per the plan's instruction, a throwaway probe fired three concurrent `resolveClassByName` calls for distinct class names against a peer that delayed each answer by 20ms, then printed the arrival order and `peer.maxInFlight`:

```
PROBE arrivalOrder: ["a.One","a.Two","a.Three"]
PROBE maxInFlight: 1
```

This confirmed the research's Open Question 2 in favor of Assumption A2: the single `lockQueue`/`lockHeld` pair does serialize concurrent lookups of *different* class names on the wire, one request at a time, in call order — not just re-entrant/duplicate-name calls. Task 3's serialization test and its non-vacuity control were written against this confirmed behavior; the probe itself was deleted immediately after (`git status --short` was clean before the real test was added).

## Deviations from Plan

None - plan executed exactly as written. No `src/` changes were needed or made.

## Issues Encountered
None. All three tasks passed their verify commands and acceptance criteria on the first implementation attempt; the tracer task's (Task 1) feedback gate re-verify and every `tdd="true"` task's initial run were green, matching the plan's own expectation that these tests pin already-shipped production behavior rather than drive new implementation.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `test/loopback-jsonrpc-peer.ts` is now available as shared test infrastructure for any later phase suite that needs a real loopback JSON-RPC peer.
- Phase 121 (Java Interop Service Decomposition) can now move `connect()`/`createSocket()`/`wrapSocket()`/the resolution lock under real socket test coverage instead of only client-side-fake coverage.
- No blockers for plans 116-02/116-03 (parallel wave-1 plans) or later phase-116 plans — this plan's files (`loopback-jsonrpc-peer.ts`, `interop-harness-fake-peer.ts`, `java-interop-socket.test.ts`) are not declared as touched by any other 116-xx plan's `files_modified`.

## Self-Check: PASSED

- `[ -f bbj-vscode/test/loopback-jsonrpc-peer.ts ]` → FOUND
- `[ -f bbj-vscode/test/java-interop-socket.test.ts ]` → FOUND
- `[ -f bbj-vscode/test/interop-harness-fake-peer.ts ]` → FOUND (modified)
- `git log --oneline --all --grep="674357a9"` / direct `git log` lookup → commits `674357a9`, `b64465fc`, `27e093cd` all present on `gsd/v4.7-audit-hygiene-burndown`
- Plan-level `<verification>` re-run: `env -u RUN_BBJ_TESTS npx vitest run test/java-interop-socket.test.ts test/interop-harness.test.ts test/interop-harness-report.test.ts` → 3 files passed, 48 tests passed, 0 failed
- `npm run lint` → exit 0; `npm run typecheck:test` → exit 0
- `git diff --stat 5833a207 -- bbj-vscode/src` → empty (no `src/` change)

---
*Phase: 116-java-interop-test-coverage*
*Completed: 2026-09-28*
