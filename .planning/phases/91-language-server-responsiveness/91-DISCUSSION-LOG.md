# Phase 91: Language Server Responsiveness - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-09-12
**Phase:** 91-language-server-responsiveness
**Areas discussed:** Interop outage & recovery, Lock scope (RESP-02/03), PREFIX files: prune or not, How to prove 'doesn't scale'

---

## Todo cross-reference

| Option | Description | Selected |
|--------|-------------|----------|
| Live-interop getAllClassNames tests | Update issue447 + 11 linking interop tests for the current backend | |
| gradle-wrapper-hygiene fixture | IntelliJ Gradle fixture; reportedly already fixed | |
| Configured Node path fallback | IntelliJ Node detection decision | |
| Live Windows Node install check | Maintainer-owned human attestation | |

**User's choice:** None (the first attempt returned no answer; on the retry the user typed free text).
**Notes:** "keep the rest of this milestone lean. We need to release soon"

---

## Interop outage & recovery

**Recovery detection**

| Option | Description | Selected |
|--------|-------------|----------|
| Retry on next request | Lazy half-open after cooldown, capped backoff, no timer | ✓ |
| Background probe timer | Timer probes :5008 while open | |
| Only on Refresh / clearCache | Fails success criterion 2 (Pitfall 6) | |

**Open files on recovery**

| Option | Description | Selected |
|--------|-------------|----------|
| Re-check open files once | Reset to Parsed + DocumentBuilder.update, no clearCache | ✓ |
| Wait for the next edit | Stale diagnostics until edit or Refresh | |

**Stub caching**

| Option | Description | Selected |
|--------|-------------|----------|
| Only real 'not found' | Transport-failure stubs returned but not cached | ✓ |
| Cache none during outage | Framed on breaker state only | |

**Outage notice**

| Option | Description | Selected |
|--------|-------------|----------|
| One popup per outage | Existing text, closed→open only, silent probes | ✓ |
| Popup per outage + 'reconnected' | Adds an info message on recovery | |
| Log only, no popup | Server log only | |

**User's choice:** All recommended options.

---

## Lock scope (RESP-02/03)

**Global lock**

| Option | Description | Selected |
|--------|-------------|----------|
| Breaker only, keep lock | Smallest change; healthy-peer serialization unchanged | ✓ |
| Also replace the lock | Per-class dedup, concurrent resolution; larger blast radius | |

**#497 eviction guard**

| Option | Description | Selected |
|--------|-------------|----------|
| In-flight registry | Separate map, removed in finally, fast paths consult it; LRU untouched | ✓ |
| Pin set inside LruMap | Issue direction 1; leaked pin defeats bound | |
| Chain-aware pending check | Issue direction 2; depends on lock-token identity | |
| You decide | Leave to research within success criterion 3 | |

**User's choice:** Recommended options.

---

## PREFIX files: prune or not

**External-document pruning**

| Option | Description | Selected |
|--------|-------------|----------|
| Mirror the linker exactly | isExternalDocument unchanged; keep signatures, skip bodies | ✓ |
| Narrow 'external' first | Workspace/open files not external for linker and symbols | |

**getBBjClassesFromFile scan removal**

| Option | Description | Selected |
|--------|-------------|----------|
| You decide | Research/planning pick; never stale, no full scan | ✓ |
| Literal issue shape | Cache keyed by bbjFilePath + document URI | |
| Path-keyed index | Normalized path → classes map, rebuilt after index updates | |

**User's choice:** Mirror the linker; mechanism left to Claude.

---

## How to prove 'doesn't scale'

**RESP-01 test**

| Option | Description | Selected |
|--------|-------------|----------|
| Counters + loose timing | Deterministic counters gate + generous wall-clock ratio | ✓ |
| Counters only | No wall-clock assertion | |
| Wall-clock ratio only | Most literal, most flaky | |

**RESP-02/03/04 tests**

| Option | Description | Selected |
|--------|-------------|----------|
| Fake peer + fake timers | Plain npm test, no live :5008 | ✓ |
| Fake tests + one live check | Adds a RUN_BBJ_TESTS-gated test | |

**UAT**

| Option | Description | Selected |
|--------|-------------|----------|
| One outage check | Stop/restart BBjServices in one IDE on rebuilt distributables | ✓ |
| Automated only | No UAT | |

**User's choice:** Recommended options; then "I'm ready for context".

---

## Claude's Discretion

- Breaker trip threshold, cooldown, backoff cap, connect-level error classification
- getBBjClassesFromFile mechanism
- RESP-04 token carrying technique and cancellation-safe prefix memo (rule stated, not contested:
  one request's cancellation never affects another's result)
- Recovery sequence if the classpath or implicit imports never loaded against the current peer
  (research item)
- Background Phase 2 settling after a chain timeout (research item); re-insert after eviction; test seams

## Deferred Ideas

- Replace the global lock with per-class concurrent resolution
- Narrow isExternalDocument (its TODO) for workspace/open PREFIX files
- Background interop health probe / sharing IntelliJ's probe
- "Reachable again" info message
- Broader #232 CPU mitigations
