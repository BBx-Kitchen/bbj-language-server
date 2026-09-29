---
phase: 121-java-interop-service-decomposition
plan: "03"
subsystem: api
tags: [java-interop, refactor, concurrency, tracer]

requires:
  - phase: 121-java-interop-service-decomposition
    provides: "plan 02's REF-09 close and ref09-end-sha.txt for plans 03-10 to diff their own scope claims against"
provides:
  - "bbj-vscode/src/language/java-interop-lock.ts exporting ResolutionLock (acquire, currentToken, reset), the request lock split out of JavaInteropService"
  - "the front class's private readonly lock field and its use in doResolveClassByName/clearCache"
  - "test/java-interop-lock.test.ts, the lock's own focused unit test with no JavaInteropService"
  - "/home/coder/repos/tmp/phase-121/exports-check.mjs, the D-08 exports-check every later REF-12 plan runs"
affects: [121-04-through-121-10-javainteropservice-split]

actuals:
  tokens: 3239
  tasks: 2
  commits: 1

tech-stack:
  added: []
  patterns:
    - "First REF-12 extraction: a sibling java-interop-*.ts module with no imports of its own, built and held by the front class as a private readonly field, delegated to via thin one-line calls (this.lock.acquire/currentToken/reset) — the wiring shape every later REF-12 plan repeats."

key-files:
  created:
    - bbj-vscode/src/language/java-interop-lock.ts
    - bbj-vscode/test/java-interop-lock.test.ts
  modified:
    - bbj-vscode/src/language/java-interop.ts

key-decisions:
  - "The grant-order test in java-interop-lock.test.ts covers both 'a second token waits until the holder releases' and 'three waiters are granted in FIFO order' as two tests (one for the two-party wait, one for the three-waiter chain), since the plan's single bullet described both behaviours together but they are two distinct assertions worth their own test names."
  - "Reconstructed plan-03-start.txt retroactively (Task 1's step 0 was missed before editing) — see Deviations."

requirements-completed: []

coverage:
  - id: D1
    description: "The request lock (lockQueue/lockHeld/currentLockToken/acquireLock/drainLockQueue) is extracted verbatim into java-interop-lock.ts as ResolutionLock; the front class holds it as `private readonly lock` and doResolveClassByName/clearCache use acquire/currentToken/reset with no behaviour change"
    requirement: "REF-12"
    verification:
      - kind: unit
        ref: "bbj-vscode/test/java-interop-lock.test.ts (6 tests: free-grant, re-entrant no-op, second-token wait, three-waiter FIFO order, reset frees the lock, reset drops a queued waiter)"
        status: pass
      - kind: unit
        ref: "the eight java-interop-*.test.ts suites, including java-interop-socket.test.ts's 'the resolution lock serializes concurrent lookups, observed on the wire' suite — 9 files, 144 tests"
        status: pass
    human_judgment: false
  - id: D2
    description: "The extraction touches only its three files, no pre-existing test file changed, the whole suite matches the phase base in failing test names, and lint/typecheck/build/hygiene are clean"
    verification:
      - kind: unit
        ref: "Task 2's four verify commands (scope, whole-suite JSON comparison, gates, hygiene) — all four print their expected OK line"
        status: pass
    human_judgment: false

duration: 8min
completed: 2026-09-29
status: complete
---

# Phase 121 Plan 03: Java Interop Lock Extraction (REF-12, first of five) Summary

**The request lock (`lockQueue`/`lockHeld`/`currentLockToken`/`acquireLock`/`drainLockQueue`) moves verbatim out of `JavaInteropService` into a new zero-import module `java-interop-lock.ts` as `ResolutionLock`, with its own 6-test unit suite, while the eight existing interop suites and the whole test suite stay green against the phase base.**

## Performance

- **Duration:** 8 min
- **Started:** 2026-09-29T11:06:00Z (approx.)
- **Completed:** 2026-09-29T11:13:52Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- `bbj-vscode/src/language/java-interop-lock.ts` created: `export class ResolutionLock` with `acquire(lockToken)`, a `currentToken` getter, a private `drain()`, and `reset()`. The `acquire`/`drain` bodies are the base `acquireLock`/`drainLockQueue` bodies verbatim, with only the field names changed (`lockQueue` → `queue`, `lockHeld` → `held`, `currentLockToken` → `token`). The module imports nothing.
- `java-interop.ts`: the three lock fields (with their doc comments) replaced by `private readonly lock = new ResolutionLock();`; `doResolveClassByName` now reads `this.lock.currentToken ?? {}` and calls `await this.lock.acquire(lockToken)`; `clearCache()`'s step 3 (`// Reset lock state`) now calls `this.lock.reset();` in the exact same slot, between the complete-class-index clear and the breaker generation bump. The old `acquireLock`/`drainLockQueue` private methods are deleted.
- `bbj-vscode/test/java-interop-lock.test.ts` created: 6 tests exercising `ResolutionLock` alone (no `JavaInteropService`, no Langium services) — a free lock grants immediately and exposes the holder via `currentToken`; the holding token re-acquiring resolves immediately with a no-op release that leaves the lock held; a second distinct token waits until the holder releases; three waiters are granted one at a time in the order they asked; `reset()` frees the lock and clears `currentToken`; `reset()` drops a queued waiter so it is never granted afterwards. No timers — ordering is proven by flushing already-resolved promises.
- `/home/coder/repos/tmp/phase-121/exports-check.mjs` written (outside the repo): diffs the base `java-interop.ts`'s direct-declaration exports against the working tree's direct-declaration + `export { … }` re-exports. Confirms base=15, head=15, missing=0 — the D-08 check every later REF-12 plan (04-10) reuses.
- Tracer feedback gate (auto mode active, `workflow.auto_advance: true`): re-ran Task 1's three `<verify>` commands end-to-end after the commit — all passed (`lock extracted`, `exports OK`, 9/9 test files / 144/144 tests) — before proceeding to Task 2's measurement.
- Task 2 measured the extraction against the phase base: scope check (only the three planned files changed under `bbj-vscode`, no pre-existing test file touched, no module imports `./java-interop.js`), whole-suite run (3680 tests, 0 failed, the one pre-existing failing suite name (`installed-extension-e2e.test.ts`) unchanged from the base list), `lint`/`typecheck:test`/`build` all green, and the hygiene id-scan clean.

## Task Commits

Each task was committed atomically:

1. **Task 1: The request lock runs from java-interop-lock.ts, with its own unit test, and the interop suites pass** - `1686dc60` (refactor)
2. **Task 2: Lock extraction measured against the phase base** - no code commit (measurement/SUMMARY only)

**Plan metadata:** this SUMMARY's own commit.

## Files Created/Modified

- `bbj-vscode/src/language/java-interop-lock.ts` - the extracted `ResolutionLock` class (acquire, currentToken, reset)
- `bbj-vscode/src/language/java-interop.ts` - uses `this.lock` in place of the three former private fields and the two former private methods
- `bbj-vscode/test/java-interop-lock.test.ts` - the lock's own 6-test unit suite

## Decisions Made

- Split the "second token waits" and "three waiters granted in FIFO order" plan bullet into two separate tests, since they assert distinct behaviours (a single waiter's wait vs. a chain of three granted one at a time) worth naming individually.
- `exports-check.mjs` collects `export { … }` / `export type { … }` re-export blocks (with or without `from`, spanning lines, stripping a leading `type ` and taking a trailing `as` alias) in addition to direct declarations, per the plan's D-08 spec — not exercised this plan (no re-export block exists yet), but ready for a later plan that needs to move a helper and re-export it.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Task 1's step 0 (recording `plan-03-start.txt` before any edit) was missed**
- **Found during:** Task 2, reading its own `<precondition>` (`plan-03-start.txt` must exist)
- **Issue:** Task 1's action step 0 says to write the plan's start SHA to `/home/coder/repos/tmp/phase-121/plan-03-start.txt` *before* any source edit, if the file is missing. This step was skipped — the file did not exist when Task 2 began, after Task 1's commit had already landed.
- **Fix:** Reconstructed the value from git history: the commit immediately before Task 1's commit (`1686dc60`) is `d51447c5` (plan 02's own metadata commit, the last commit before this plan started any work), confirmed via `git log --oneline -5`. Wrote `d51447c5a5124b2b2d8572ba825c01e99f0cd91c` (full SHA) to `plan-03-start.txt`.
- **Files modified:** none (scratch file only, outside the repository, not committed)
- **Verification:** Task 2's scope-check verify command (which diffs against `plan-03-start.txt`) ran clean and printed `scope OK`; the reconstructed SHA correctly names exactly the three files this plan changed.
- **Committed in:** n/a (scratch file, per the plan's own instruction that nothing under `/home/coder/repos/tmp/phase-121/` is committed)

---

**Total deviations:** 1 auto-fixed (1 blocking — a missed setup step, corrected before it could affect any verify command).
**Impact on plan:** No production code affected. The reconstructed start SHA is provably correct (it is the actual last commit before this plan's own first commit), so Task 2's scope-check measurement is exactly as accurate as if the file had been written on schedule.

## Issues Encountered

None beyond the deviation above.

## Verification Evidence

**Plan start SHA (reconstructed):** `d51447c5a5124b2b2d8572ba825c01e99f0cd91c`
**REF-09 end SHA (from plan 02):** `c42513d31ca4cad14e58001bffd7f75a5e6ce51a`
**Peer state:** unchanged from plan 02's recording (`up`)

**Task 1 — lock extraction check:** `lock extracted` (no `lockQueue`/`lockHeld`/`currentLockToken`/`acquireLock`/`drainLockQueue` survive in `java-interop.ts`; the front class uses `this.lock.currentToken`/`this.lock.acquire(lockToken)`/`this.lock.reset()`; `java-interop-lock.ts` starts with `export class ResolutionLock` and has zero `import` lines; `clearCache()`'s `this.lock.reset()` immediately follows `this.clearCompleteClassIndex()`; no `.bind(this)` anywhere).

**Task 1 — exports check:** `exports base=15 head=15 missing=0` then `exports OK`.

**Task 1 — unit test + eight interop suites:** `Test Files 9 passed (9)`, `Tests 144 passed (144)`.

**Tracer feedback gate (auto mode):** all three of Task 1's `<verify>` commands re-run and passed identically after the commit.

**Task 2 — scope check:**
```
scope OK
```
(no pre-existing test file changed since the REF-09 end commit; the only added test file is `java-interop-lock.test.ts`; the full diff since this plan's own start touches exactly `java-interop-lock.ts`, `java-interop.ts`, `java-interop-lock.test.ts`; no `src` file outside `java-interop*.ts` changed since the REF-09 end commit; no module imports `./java-interop.js`)

**Task 2 — whole suite (suite-03):**
```
numFailedTests=0 numPassedTests=3650 numPendingTests=30 numTotalTests=3680 failedSuites=1 lines=1
```
Failing suite name: `test/functional/installed-extension-e2e.test.ts > (suite failed)` — identical to the base list (`comm -13` returned empty). `suite names OK`.

**Task 2 — gates:** `npm run lint`, `npm run typecheck:test`, `npm run build` all exit 0 (`gates OK`).

**Task 2 — hygiene:** no new planning identifier in any added `src`/`test` line, no closing-keyword commit body since the phase base, `hygiene OK`.

**REQUIREMENTS.md:** unchanged by this plan (`git diff --quiet` against the plan start SHA — REF-12 is declared by plans 03-10 and only plan 10 marks it, per the executor shell rules).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- The request lock is fully extracted and independently testable; the front class's `doResolveClassByName` and `clearCache` use it through three thin calls.
- `/home/coder/repos/tmp/phase-121/exports-check.mjs` is ready for plan 04 onward (the D-08 exports check every REF-12 plan runs).
- Per CONTEXT.md's planner assumptions, plan 04 extracts the connection and circuit breaker next (owns `METHOD_NOT_FOUND` and `InteropTransportError`, which the later class-index and cache modules import), so no module ever needs to import `java-interop.ts` back.

## Self-Check: PASSED

All key files confirmed present on disk:
- `bbj-vscode/src/language/java-interop-lock.ts` — `export class ResolutionLock` present.
- `bbj-vscode/test/java-interop-lock.test.ts` — 6 `test(` blocks present.
- `bbj-vscode/src/language/java-interop.ts` — `private readonly lock = new ResolutionLock();` present; no `lockQueue`/`lockHeld`/`currentLockToken`/`acquireLock`/`drainLockQueue` remain.

Commit `1686dc60` confirmed present in `git log --oneline -5`.

---
*Phase: 121-java-interop-service-decomposition*
*Completed: 2026-09-29*
