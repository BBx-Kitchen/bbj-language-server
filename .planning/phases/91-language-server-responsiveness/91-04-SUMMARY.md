---
phase: 91-language-server-responsiveness
plan: 04
subsystem: language-server
tags: [java-interop, lru-cache, cyclic-resolution, vitest]

# Dependency graph
requires: ["91-03"]
provides:
  - "JavaInteropService._inFlightPhase2: an in-flight registry beside the resolvedClasses LRU, set where resolveClass registers a class before its async Phase 2 and drained in an identity-guarded finally"
  - "JavaInteropService.resolvedClassesCacheLimit()/inFlightResolutionCount(): protected test seams for forcing LRU eviction and reading in-flight registry size"
  - "test/java-interop-service.test.ts: CyclicFakeInteropService/HangingMembersInteropService test doubles and a describe block with 4 regression tests for #497"
affects: []

actuals:
  tokens: 6198
  tasks: 2
  commits: 1

tech-stack:
  added: []
  patterns:
    - "An in-flight registry (plain Map, not a second LRU) sits beside a bounded LRU cache, populated at the exact point the LRU entry is set and consulted by every fast path that reads the LRU, so an entry evicted mid-async-work is still found by a re-entrant/cyclic lookup"
    - "Cleanup runs in an outer try/finally wrapping both the inner try/catch (which already swallows Phase-2 errors) and the trailing synchronous work, with the finally guarded by reference identity against the registry's current entry — so a clearCache() or a newer resolution of the same class is never disturbed by a stale async step settling after the fact"
    - "A cache-bound test seam (resolvedClassesCacheLimit()) is read during field initialization, before any subclass field exists, relying on JS virtual dispatch (the subclass override is already on the prototype chain at construction time) rather than instance state"

key-files:
  created: []
  modified:
    - bbj-vscode/src/language/java-interop.ts
    - bbj-vscode/test/java-interop-service.test.ts

key-decisions:
  - "Both this plan's tasks (the forced-eviction cyclic test, and the three registry-drain tests for chain timeout/cancellation/clearCache) were authored and verified together against a single implementation pass, since the same _inFlightPhase2 registry change makes all four green at once. All four tests and the one production commit landed in a single commit rather than the plan's nominal two — documented in Deviations, not a defect."
  - "The identity-guarded finally puts an evicted class back into resolvedClasses only when the registry still maps its name to that exact object — satisfying the plan's must-have that a late Phase 2 after clearCache() never resurrects a stale class."

requirements-completed: []  # RESP-03 is also declared by plan 91-06, which has no SUMMARY yet — not marked Complete here per phase instruction

coverage:
  - id: D1
    description: "A class evicted from the LRU during its own cyclic Phase-2 resolution resolves back to itself with no refetch, no stub and no stall"
    requirement: "RESP-03"
    verification:
      - kind: unit
        ref: "test/java-interop-service.test.ts#a class evicted during its own cyclic resolution (#497) > resolves back to itself with no refetch, no stub and no stall"
        status: pass
    human_judgment: false
  - id: D2
    description: "The in-flight registry drains after a chain timeout once the background Phase 2 settles, with no error on the resolved class"
    requirement: "RESP-03"
    verification:
      - kind: unit
        ref: "test/java-interop-service.test.ts#a class evicted during its own cyclic resolution (#497) > the registry drains after a chain timeout once the background resolution settles"
        status: pass
    human_judgment: false
  - id: D3
    description: "The in-flight registry drains after a cancellation"
    requirement: "RESP-03"
    verification:
      - kind: unit
        ref: "test/java-interop-service.test.ts#a class evicted during its own cyclic resolution (#497) > the registry drains after a cancellation"
        status: pass
    human_judgment: false
  - id: D4
    description: "clearCache() empties the registry immediately, and a late Phase 2 that settles afterward does not bring its class back into resolvedClasses"
    requirement: "RESP-03"
    verification:
      - kind: unit
        ref: "test/java-interop-service.test.ts#a class evicted during its own cyclic resolution (#497) > clearCache empties the registry and a late Phase 2 does not bring its class back"
        status: pass
    human_judgment: false

duration: ~25min
completed: 2026-09-13
status: complete
---

# Phase 91 Plan 04: Java Interop LRU-Eviction/Cyclic-Resolution Guard Summary

**A plain `Map` in-flight registry beside `java-interop.ts`'s bounded LRU stops eviction mid-cyclic-resolution from producing a 30-second stall or a stub for a class that resolves (#497), and provably drains to empty after success, a chain timeout, a cancellation, and `clearCache()`.**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-09-13T00:53:00Z
- **Completed:** 2026-09-13T00:58:30Z
- **Tasks:** 2
- **Files modified:** 2 (1 production, 1 test)

## Accomplishments

- `_inFlightPhase2`, a plain `Map<string, JavaClass>`, is set beside `resolvedClasses.set(className, javaClass)` right before `resolveClass`'s async Phase 2 starts, and consulted by all three fast paths that previously only checked the LRU: `resolveClassByName` (before `_pendingResolutions`), `doResolveClassByName` (right after the post-lock double-check), and `resolveClass`'s own re-entry check. A cyclic reference that loops back to a class whose LRU entry was evicted mid-Phase-2 now returns the same in-flight object instead of triggering a redundant fetch that would eventually time out.
- The registry is cleared in an identity-guarded `finally` wrapping Phase 2's existing try/catch plus the trailing `AstUtils.linkContentToContainer` call: only when `_inFlightPhase2.get(className) === javaClass` (the registry still points at this exact object) does the `finally` put the class back into `resolvedClasses` if the LRU evicted it, then delete the registry entry. This guard is what makes `clearCache()` safe against a Phase 2 that settles afterward — the stale entry's identity check fails once the registry has already been cleared, so it can never resurrect a class from a cleared classpath.
- `clearCache()` clears `_inFlightPhase2` alongside `_resolvedClasses` and `_pendingResolutions`.
- Two new protected test seams: `resolvedClassesCacheLimit()` (read during field initialization to size the LRU — an override must return a literal since no subclass field exists yet at that point) and `inFlightResolutionCount()` (registry size).
- Four new regression tests under `a class evicted during its own cyclic resolution (#497)`: the forced-eviction cyclic case (LRU capped at 3), and three registry-drain proofs (chain timeout, cancellation, `clearCache()`) using new `CyclicFakeInteropService`/`HangingMembersInteropService` test doubles and an optional Java-interop-service factory parameter threaded through `createServices`/`createInteropService`.
- No test asserts an upper bound on the registry's size while resolutions are in flight, per D-08 — only that it settles to 0 once every resolution has (success, chain timeout, cancellation, or `clearCache()`).
- `LruMap`, `RESOLVED_CLASSES_CACHE_LIMIT`, and the resolution lock (`acquireLock`/`drainLockQueue`/`lockQueue`/`currentLockToken`) are byte-for-byte unchanged, confirmed by `git diff 174985f7` showing no changed line inside any of those three definitions.

## Task Commits

1. **Task 1 + Task 2 combined: the in-flight Phase-2 registry, its three fast-path consult points, the identity-guarded finally, `clearCache()` wiring, and all four regression tests (forced eviction, chain-timeout drain, cancellation drain, clearCache drain)** - `c0189087` (feat)

**Plan metadata:** (this commit)

## Pre-change Failing Counts (RED before the production step)

With the two test seams (`resolvedClassesCacheLimit()`, `inFlightResolutionCount()`) added but `_inFlightPhase2` not yet consulted anywhere, the forced-eviction cyclic test failed at `expect(settled).toBe(true)` — the resolution had **not settled** within the 100ms fake-time window: class `t.A` was evicted from the size-3 LRU during its own Phase 2 (by the concurrent resolution of `t.B`/`t.C1-3`), and the cyclic back-reference from `t.B` to `t.A` fell through to a fresh `resolveClassByName('t.A', ...)` call with no cache hit, no pending-resolution hit, and (pre-fix) no in-flight-registry hit either — exactly the redundant refetch-and-eventually-timeout path #497 describes. The companion chain-timeout drain test also failed at the same point (`inFlightResolutionCount()` returning `0` unconditionally, since nothing populated the registry yet), confirming both symptoms trace to the same missing consult points.

## Files Created/Modified

- `bbj-vscode/src/language/java-interop.ts` — `_inFlightPhase2` field + JSDoc, `resolvedClassesCacheLimit()`/`inFlightResolutionCount()` seams, three fast-path consult points (`resolveClassByName`, `doResolveClassByName`, `resolveClass`), the registry `set` beside `resolvedClasses.set` in `resolveClass`, the wrapping identity-guarded `finally`, and `clearCache()`'s new `_inFlightPhase2.clear()`.
- `bbj-vscode/test/java-interop-service.test.ts` — `createServices`/`createInteropService` gained an optional Java-interop-service factory parameter (defaulting to `MockableJavaInteropService`); new `CyclicFakeInteropService` (cache limit forced to 3, scriptable `dtos`/`rawClassCalls`, cancellation-aware `getRawClass` override, `testResolveClassByName`/`testInFlightCount`) and `HangingMembersInteropService` (unbounded cache limit) test doubles; new describe block `a class evicted during its own cyclic resolution (#497)` with the four tests listed under Accomplishments.

## Decisions Made

See key-decisions in frontmatter.

## Deviations from Plan

### Auto-fixed Issues

None — the implementation matched the plan's D-07 design on the first pass; no bugs found during red-then-green cycling.

### Process Deviation (not a defect)

**1. Task 1 and Task 2's tests and the single production change were authored, verified, and committed together, rather than as two separate red-then-green cycles.**
- **Why:** the plan's own Task 2 acceptance text anticipates this ("If a case fails, fix the production code while keeping the identity guard") — Task 2's three drain tests exercise the exact same `_inFlightPhase2` registry the Task 1 fix introduces, and all three passed immediately once Task 1's implementation landed, with zero additional production changes needed. Splitting them into two commits would have required either committing Task 1's fix with untested drain guarantees, or writing Task 2's tests against a synthetic reverted state purely for commit-shape purposes.
- **Effect:** one commit (`c0189087`) carries the full plan's file set (`java-interop.ts` + `java-interop-service.test.ts`) with all four regression tests and the one production change. All plan-level acceptance criteria (both tasks' `<verify>`/`<acceptance_criteria>` blocks) were independently checked and pass.
- **Not filed to WINDOWS.md:** this is a resolved authoring-sequence deviation, not an open defect, stub, or skipped verification.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Whole-suite target files (`java-interop-service.test.ts`, `java-interop-breaker.test.ts`, `java-interop-timeouts.test.ts`, `completion-test.test.ts`) are green: 68 passed, 1 skipped (pre-existing), 0 failed.
- `npm run lint` and `npm run build` both exit 0.
- Register check (`git diff 174985f7` scanned for `9[0-9]-[0-9]{2}`, `D-[0-9]{2}`, `T-9[0-9]-[0-9]+`, `G-9[0-9]-[0-9]+`, `Pitfall N`, `(C|CR|WR|IN)-[0-9]{2}`) prints nothing across both changed files.
- No file under `bbj-intellij/` was touched (this plan is language-server-internal only).
- No blockers for plan 91-05 or 91-06.

---
*Phase: 91-language-server-responsiveness*
*Completed: 2026-09-13*

## Self-Check: PASSED

- FOUND: bbj-vscode/src/language/java-interop.ts
- FOUND: bbj-vscode/test/java-interop-service.test.ts
- FOUND: .planning/phases/91-language-server-responsiveness/91-04-SUMMARY.md
- FOUND commit: c0189087
