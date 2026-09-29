# Phase 116: Java-Interop Test Coverage - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-09-28
**Phase:** 116-java-interop-test-coverage
**Areas discussed:** Linking test fix path, Disabled parser assertions, Fake socket server, main.ts handler extraction

---

## Todo folding

| Option | Description | Selected |
|--------|-------------|----------|
| Linking root cause | 2026-09-20 linking interop failures survive class warm-up; TEST-05 routes through it | ✓ |
| IntelliJ initOptions keys | javaInteropHost/Port vs interopHost/Port mismatch; IntelliJ behaviour fix | |
| Peer-name escaping | Signature-help/snippet escaping of peer names; src security fix | |
| Windows download progress | Manual re-check on real Windows | |

**User's choice:** Linking root cause only.

---

## Linking test fix path

| Option | Description | Selected |
|--------|-------------|----------|
| Complete the fixture | Add missing fake classes to JavaInteropTestService; hermetic, runs in CI | ✓ |
| Real live interop | Back the block with a real JavaInteropService; only runs with BBj | |
| Both | Hermetic fixture plus a live-backed describe | |

| Option | Description | Selected |
|--------|-------------|----------|
| Drop gate, rename | Run unconditionally; rename so it doesn't claim interop | ✓ |
| Keep as is | Keep the :5008 gate and name | |
| You decide | Planner picks | |

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, fix all failures | Update the drifted issue447/live-interop tests too; zero failures both states | ✓ |
| Linking only | Record the issue447 drift as a known exception | |

| Option | Description | Selected |
|--------|-------------|----------|
| Only if needed | Touch shouldRunBBjTests() only if the zero-failure run trips on it | |
| Harden it now | Replace the bare TCP probe with a real JSON-RPC round trip | ✓ |

| Option | Description | Selected |
|--------|-------------|----------|
| Only what tests use | Minimal members, existing helper style | ✓ |
| Realistic subsets | Fuller JDK-like member lists | |

**Notes:** The user chose the non-recommended "Harden it now" for the BBj probe (DEBT item 5).

---

## Disabled parser assertions

| Option | Description | Selected |
|--------|-------------|----------|
| Test double first | Extend the double where needed; src only for a real LS bug | ✓ |
| Test double only | Never change src; narrow the assertion and file an issue instead | |
| Synthetic built-ins in src | Register the types as built-ins in the LS | |

| Option | Description | Selected |
|--------|-------------|----------|
| No errors, as real LS | getValue returns Object; release() on `!` not flagged | ✓ |
| Typed fake chain | getValue returns a semaphore type | |

---

## Fake socket server

| Option | Description | Selected |
|--------|-------------|----------|
| Promote a shared server | Generalise the Phase 115 loopback fake peer for both clients | ✓ |
| New server for java-interop | Separate helper; 115 file untouched | |

| Option | Description | Selected |
|--------|-------------|----------|
| Leave them as is | Breaker/parse-lane tests keep createSocket/wrapSocket overrides | ✓ |
| Migrate them | Move all interop tests onto the real server | |

| Option | Description | Selected |
|--------|-------------|----------|
| Fake timers over real socket | vi.useFakeTimers past the real constants; no src change | ✓ |
| Injectable timeouts | Configurable timeout values in src | |
| You decide | Planner picks | |

---

## main.ts handler extraction

| Option | Description | Selected |
|--------|-------------|----------|
| Same register* pattern | New register*(connection, deps) modules; main.ts only wires | ✓ |
| Pure functions + thin handlers | Extract logic only; wiring stays untested | |

| Option | Description | Selected |
|--------|-------------|----------|
| Behaviour tests + coverage read | Fake-connection tests; one-off coverage reading in VERIFICATION | ✓ |
| Per-file coverage threshold | v8 threshold in vitest.config.ts | |

| Option | Description | Selected |
|--------|-------------|----------|
| Every branch | One test per configuration-handler branch | ✓ |
| Main paths only | Refresh success/failure plus one config change | |

---

## Claude's Discretion

- Plan ordering and grouping
- The hardened probe's exact JSON-RPC call and timeout
- The new block, module and file names, and how the shared fake peer is parameterised

## Deferred Ideas

- The three unfolded todos (IntelliJ initOptions keys, peer-name escaping, Windows download check) stay pending.
