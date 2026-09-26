---
phase: 106-on-save-compiler-check-in-both-ides
plan: 02
subsystem: language-server
tags: [java-interop, circuit-breaker, jsonrpc, vitest]

# Dependency graph
requires: []
provides:
  - "parseProgram() tries its own dedicated connection first, independent of the shared connection's circuit breaker"
  - "Fallback to the shared connection happens only when the dedicated one cannot be opened or was retired for the generation"
  - "Pinning coverage for the half-open breaker, same-tick concurrency, mid-flight drop and parser-latch cases over the fake peer"
affects: []

# Actuals (#2632)
actuals:
  tokens: 5338
  tasks: 2
  commits: 2

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Same lane-first/shared-fallback ordering as the rest of the parse-lane machinery, no new plumbing -- a two-line reorder plus a rewritten doc comment"

key-files:
  created: []
  modified:
    - bbj-vscode/src/language/java-interop.ts
    - bbj-vscode/test/java-interop-parse-lane.test.ts

key-decisions:
  - "Task 2 wrote its five behavior tests first and verified them red against the pre-Task-1 ordering (temporarily reverting parseProgram() to the old connect()-then-lane order), confirmed all five failed, then restored Task 1's fix and re-verified green -- no production code change was needed since Task 1's reordering already covers every case Task 2 pins."

requirements-completed: [JINT-03]

coverage:
  - id: D1
    description: "A live parse answers over its own connection while the shared circuit breaker is open, with no wait on connect()/the breaker"
    requirement: "JINT-03"
    verification:
      - kind: unit
        ref: "test/java-interop-parse-lane.test.ts#with the shared breaker open, a parse is answered over its own connection"
        status: pass
    human_judgment: false
  - id: D2
    description: "A live parse started while the shared breaker is half-open (a probe connect in flight) resolves over the already-open dedicated connection with no new socket"
    requirement: "JINT-03"
    verification:
      - kind: unit
        ref: "test/java-interop-parse-lane.test.ts#half-open: a parse started while the shared breaker is half-open resolves over the existing lane with no new socket attempt"
        status: pass
    human_judgment: false
  - id: D3
    description: "parseProgram falls back to the shared connection only when the dedicated one cannot be opened or was retired for the generation, logging one warn line and never a dialog"
    requirement: "JINT-03"
    verification:
      - kind: unit
        ref: "test/java-interop-parse-lane.test.ts#with the dedicated connection refused, a parse succeeds over the shared connection, warns once with only the refusal text, never shows a dialog, and leaves the generation unchanged"
        status: pass
      - kind: unit
        ref: "test/java-interop-parse-lane.test.ts#with the dedicated connection refused and the shared breaker open, a parse rejects with the circuit-open message, makes no socket attempt beyond the refused dedicated one, and requestLiveParse classifies it as failed"
        status: pass
    human_judgment: false
  - id: D4
    description: "Losing the dedicated connection bumps the connection generation, clearing the isEnabled() latch and any stored verdict; a MethodNotFound answer retires the lane for the generation and the parser latch still reflects endpoint existence"
    requirement: "JINT-03"
    verification:
      - kind: unit
        ref: "test/java-interop-parse-lane.test.ts#an older server behind the dedicated connection: the parse rejects with MethodNotFound, the dedicated connection is disposed, and the next parse in the same generation opens the shared connection"
        status: pass
      - kind: unit
        ref: "test/java-interop-parse-lane.test.ts#a real BBjParserService over the fake peer: dropping the dedicated connection clears a document verdict state on the next isEnabled() call"
        status: pass
      - kind: unit
        ref: "test/java-interop-parse-lane.test.ts#a real BBjParserService over the fake peer, with the shared breaker open: requestLiveParse still returns a verdict, and isEnabled() is true"
        status: pass
    human_judgment: false
  - id: D5
    description: "Two same-tick parses while the shared breaker is open share one dedicated socket, and a dedicated connection dropped mid-request rejects that parse as a transport failure (bumping the generation)"
    requirement: "JINT-03"
    verification:
      - kind: unit
        ref: "test/java-interop-parse-lane.test.ts#two same-tick parses while the shared breaker is open share one dedicated socket and both resolve"
        status: pass
      - kind: unit
        ref: "test/java-interop-parse-lane.test.ts#a parse pending on a hung dedicated connection while the shared breaker is open rejects as a transport failure when that connection drops, bumping the generation"
        status: pass
    human_judgment: false

# Metrics
duration: 20min
completed: 2026-09-24
status: complete
---

# Phase 106 Plan 02: Parse Lane Independent of the Shared Breaker Summary

**`parseProgram()` now tries its own dedicated connection first and falls back to the shared connection's circuit breaker only when the lane cannot be opened, so a live parse is never short-circuited by a shared connection that is down, half-open, or busy with class lookups.**

## Performance

- **Duration:** 20 min
- **Started:** 2026-09-24T11:09Z
- **Completed:** 2026-09-24T11:28Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- `JavaInteropService.parseProgram()` awaits `parseLaneConnection()` first and only calls `this.connect()` (the shared, breaker-gated connection) when the dedicated lane returns `undefined` — a two-line reorder of an already-existing method, no new plumbing.
- The `parseProgram` doc comment now describes the new ordering, including the generation side effect: a parse that opens the lane before any shared connection exists gets retired and re-opened once the shared connection's own first connect bumps the generation.
- Four pre-existing `java-interop-parse-lane.test.ts` tests updated their socket-attempt expectations for the new ordering (a parse that never needs the shared connection now opens one socket, not two).
- A new tracer test proves a parse is answered over the dedicated connection while the shared breaker is open, with the breaker left untouched (a class lookup right after still short-circuits, no new socket).
- Five new tests pin the half-open breaker, same-tick concurrency, mid-flight lane drop, the parser latch through `BBjParserService`, and the dedicated-connection-also-refused case — all verified red against the pre-fix ordering, then green with Task 1's fix restored.

## Task Commits

Each task was committed atomically:

1. **Task 1: A live parse answers over its own connection while the shared breaker is open** - `0d237eaa` (feat)
2. **Task 2: Half-open breaker, same-tick and mid-flight cases, and the latch over the lane** - `e029cb80` (test)

_Note: Task 2 carried `tdd="true"`. Its five tests were verified red by temporarily reverting `parseProgram()` to the pre-Task-1 ordering, confirming all five failed, then restoring Task 1's fix and re-verifying green. Since Task 1's reordering already covers every case Task 2 pins, no production code change was needed — a single `test(...)` commit is the correct and complete record (no separate `feat(...)` commit, per the plan's own "if any fails ... fix ... note in SUMMARY" allowance for this exact outcome)._

## Files Created/Modified
- `bbj-vscode/src/language/java-interop.ts` - `parseProgram()` reordered to try `parseLaneConnection()` before `this.connect()`; doc comment rewritten
- `bbj-vscode/test/java-interop-parse-lane.test.ts` - four existing tests' socket-attempt expectations updated for the new ordering; one new tracer test (breaker-open); five new tests in a new `describe` block (half-open, same-tick, mid-flight drop, parser latch, dedicated-refused-and-breaker-open)

## Decisions Made
- Task 2's tests were written first and verified red against the pre-Task-1 ordering (by temporarily reverting the one-line/two-line change in `parseProgram()`, running only the new tests, confirming all five failed, then restoring the fix and diffing the restored file byte-identical against the committed Task 1 version before re-running green). This mirrors 106-01's own documented TDD practice for this repository.
- No production code change was needed in Task 2: Task 1's reordering already satisfies every behavior case Task 2 pins (half-open, concurrency, mid-flight drop, latch). This is the outcome the plan's own action text explicitly anticipated ("If any fails against Task 1's code, fix parseProgram() only... and note the fix").

## Deviations from Plan

### Auto-fixed Issues

None — every task's `<action>` steps were followed as written; no Rule 1-3 auto-fixes were needed.

---

**Total deviations:** 0
**Impact on plan:** None. Plan executed as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- `JINT-03` is fully implemented and verified; the 105 constraints it builds on (generation bump on lane loss, verdict-clear on generation change, parser latch reflecting endpoint existence) are unchanged and re-pinned by this plan's new tests.
- A whole-suite regression run (`vitest run --maxWorkers=2`, no file filter) was taken as an extra precaution beyond the plan's own `<verification>` block: 117/123 files and 2533/2594 tests passed, with exactly 11 failures, all in `test/linking.test.ts`'s "Interop related tests" describe block — the project's own documented, pre-existing environmental baseline (STATE.md's Test-harness false positive note: `shouldRunBBjTests()` gates on a bare TCP connect to :5008, so with BBjServices up these 11 tests switch on and fail; local baseline re-measured 2026-09-23 at 11). Neither `java-interop.ts` nor `java-interop-parse-lane.test.ts` appear among the failing files.
- Criterion 5's re-check of a few Phase 105 "after" timing samples (per CONTEXT.md's discretion note) is out of scope for this plan and is not attempted here — it belongs with the later plan(s) covering hand UAT and the timing re-check.

---
*Phase: 106-on-save-compiler-check-in-both-ides*
*Completed: 2026-09-24*

## Self-Check: PASSED

- Both modified files confirmed present on disk with the expected content (`java-interop.ts`'s `parseProgram` reordered; `java-interop-parse-lane.test.ts` carrying 16 tests).
- Both task commits (`0d237eaa`, `e029cb80`) confirmed in `git log`.
- Plan `<verification>` re-run clean: `vitest run test/java-interop-parse-lane.test.ts test/java-interop-breaker.test.ts test/bbj-parser-service.test.ts test/java-class-reload.test.ts` — 4 files, 69 tests, all passed; `tsc -p tsconfig.json` — no errors; register check over `1427d059..HEAD` for the two touched files — no output (clean).
- Every task's `<acceptance_criteria>` re-verified via the exact grep/test commands specified inline in the plan — all passed.
