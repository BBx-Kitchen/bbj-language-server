---
phase: 116-java-interop-test-coverage
plan: "06"
subsystem: testing
tags: [java-interop, vscode-jsonrpc, vitest, jsonrpc-probe, whole-suite-gate]

requires:
  - phase: 116-java-interop-test-coverage
    provides: "116-01's shared loopback JSON-RPC peer (test/loopback-jsonrpc-peer.ts); 116-04/05's completed JavaInteropTestService fixture and Object-receiver fix that make the whole hermetic suite green"
provides:
  - "isInteropPeerAnswering(port, host?, timeoutMs?) in test-helper.ts: a real JSON-RPC getClassInfo round trip that shouldRunBBjTests()'s unset branch probes with, replacing the bare TCP isPortOpen connect"
  - "Two whole-suite runs (RUN_BBJ_TESTS=0 and RUN_BBJ_TESTS=1) both reporting numFailedTests 0 — the phase's closing proof for roadmap criterion 2"
affects: [117-dependency-hygiene-and-dependabot-coverage, 119-grammar-declare-and-shared-channel, 121-java-interop-service-decomposition]

actuals:
  tokens: 2355
  tasks: 2
  commits: 1

tech-stack:
  added: []
  patterns:
    - "isInteropPeerAnswering follows java-interop.ts's own establishConnection/wrapSocket shape
      (a Socket wrapped in a vscode-jsonrpc MessageConnection) but adds a single overall timer and
      a settle-once guard so it never leaves a probe socket or connection open, matching the
      threat register's DoS mitigation for a probe that talks to whatever is listening on a local
      port"

key-files:
  created:
    - bbj-vscode/test/test-helper.test.ts
  modified:
    - bbj-vscode/test/test-helper.ts

key-decisions:
  - "isInteropPeerAnswering sends getClassInfo for java.lang.Object with a 3000ms default timeout
    (shouldRunBBjTests' unset branch) — the same request java-interop.ts itself sends, and the
    request every cheap peer answers, per the plan's own discretion note"
  - "A reply counts as a working peer only when it is a non-null object with a string name and no
    error property; a 'not found' style { error: ... } reply and a JSON-RPC MethodNotFound both
    resolve false, matching the planner's edge-probe assumption that a peer answering 'not found'
    for java.lang.Object is not a working BBj peer"
  - "Task 2 needed no test or source edit: both whole-suite runs already reported numFailedTests 0
    on the first measurement, so there was no failure to disposition and
    issue447-real-interop.test.ts was left untouched, matching the plan's own 'no edit is
    expected' note"

requirements-completed: [TEST-05]

coverage:
  - id: D1
    description: "shouldRunBBjTests()'s unset branch turns BBj-gated suites on only for a peer
      that answers a real getClassInfo request; every negative case (error reply, MethodNotFound,
      never-answering peer, a plain TCP listener that never speaks JSON-RPC, a closed port) is
      pinned against the shared loopback peer, and the RUN_BBJ_TESTS flag-forcing cases are
      unchanged"
    requirement: "TEST-05"
    verification:
      - kind: unit
        ref: "test/test-helper.test.ts (all 12 cases)"
        status: pass
    human_judgment: false
  - id: D2
    description: "With BBjServices down (RUN_BBJ_TESTS=0, the CI state) the whole suite reports
      numFailedTests 0"
    requirement: "TEST-05"
    verification:
      - kind: other
        ref: "bbj-vscode/coverage/phase-116/suite-down.json (numFailedTests 0, numTotalTests 3586, gitignored)"
        status: pass
    human_judgment: false
  - id: D3
    description: "With BBjServices up on :5008 (RUN_BBJ_TESTS=1, npm run test:bbj) the whole suite
      reports numFailedTests 0, and more tests actually run live (fewer skipped) than in the down
      state"
    requirement: "TEST-05"
    verification:
      - kind: other
        ref: "bbj-vscode/coverage/phase-116/suite-up.json (numFailedTests 0, numTotalTests 3586, numPendingTests 30 < down's 53, gitignored)"
        status: pass
    human_judgment: false
  - id: D4
    description: "The folded 2026-09-20 todo (linking-interop-failures-survive-class-warmup) is
      resolved: its root cause (the hermetic test double lacking classes / rejecting connect())
      was fixed by plan 03's fixture completion and plan 04/05's remaining disabled-assertion
      work, and this plan's DEBT item 5 probe hardening closes the todo's other named cause"
    requirement: "TEST-05"
    verification: []
    human_judgment: true
    rationale: "Todo closure is a documentation/process step (moving the file under
      .planning/todos/), not something a test asserts; recorded here so the phase transition can
      close it, per the plan's own instruction"

duration: ~10min
completed: 2026-09-28
status: complete
---

# Phase 116 Plan 06: Hardened BBj-Test Gate and the Whole-Suite Zero-Failure Proof Summary

**shouldRunBBjTests() now gates on a real JSON-RPC getClassInfo answer instead of a bare open port, and the whole suite reports zero failed tests both with BBjServices down and with it up — closing roadmap criterion 2 and DEBT item 5.**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-09-28T13:31:40Z
- **Completed:** 2026-09-28T13:41:04Z
- **Tasks:** 2 (Task 2 needed no code change)
- **Files modified:** 2 (1 created, 1 modified)

## Accomplishments
- `test/test-helper.ts`: `isInteropPeerAnswering(port, host?, timeoutMs?)` replaces `isPortOpen`.
  It sends a real `getClassInfo` request for `java.lang.Object` over a socket wrapped in a
  vscode-jsonrpc `MessageConnection` (the same shape `java-interop.ts`'s own
  `establishConnection`/`wrapSocket` use), resolving `true` only for a non-null object reply with
  a string `name` and no `error` property. A single overall timer and a settle-once guard mean
  every path — success, socket error, socket close, an error-shaped reply, or the timer firing —
  clears the timer, disposes the connection if one was created, and destroys the socket exactly
  once. `shouldRunBBjTests()` keeps its exact signature and `RUN_BBJ_TESTS` flag handling; only
  its unset branch changed, from `isPortOpen(5008)` to `isInteropPeerAnswering(5008)`.
- `test/test-helper.test.ts` (new): 12 tests pin the probe against the shared loopback peer
  (`test/loopback-jsonrpc-peer.ts`) — a valid class-object reply (true, with the request logged),
  an `{ error }` reply, a `MethodNotFound` peer, a peer that never answers, **a plain `node:net`
  listener that accepts sockets and never speaks JSON-RPC** (the old probe's false positive — now
  correctly `false`), a closed port, and all six `RUN_BBJ_TESTS` flag-forcing values.
- Two whole-suite runs prove roadmap criterion 2: `RUN_BBJ_TESTS=0` (down) and `RUN_BBJ_TESTS=1`
  (up, against the live BBjServices peer on :5008) both report `numFailedTests: 0`. No failure
  needed dispositioning — `issue447-real-interop.test.ts` and every other file in `bbj-vscode/test`
  were left untouched for this task.

## Task Commits

Each task was committed atomically:

1. **Task 1: The BBj-test gate asks the peer a real JSON-RPC question instead of trusting any
   open port** — `d392777c` (feat)
2. **Task 2: The whole suite reports zero failed tests with BBjServices down and with it up** —
   no commit (no file changed; both whole-suite runs were already clean, see "Issues Encountered")

**Plan metadata:** (this commit)

_Note: Task 1 is TDD (`tdd="true"`). `test/test-helper.test.ts` was written against
`isInteropPeerAnswering`, which did not yet exist — the file failed to import/compile (RED) until
the function was added to `test-helper.ts` (GREEN), at which point all 12 cases passed on the
first run. Both files commit together in Task 1's single commit, following the pattern 116-04/05
established: the TDD gate is enforced at the task level via the plan's `<verify>`/
`<acceptance_criteria>` re-run, not a separate `test(...)` commit._

## Files Created/Modified
- `bbj-vscode/test/test-helper.ts` - `isInteropPeerAnswering` replaces `isPortOpen`;
  `shouldRunBBjTests()`'s unset branch calls it
- `bbj-vscode/test/test-helper.test.ts` - the probe's positive/negative cases and the
  `RUN_BBJ_TESTS` flag-forcing cases (12 tests)

## Decisions Made

See `key-decisions` in the frontmatter: the exact `getClassInfo`/`java.lang.Object`/3000ms probe
shape (planner's discretion under D-05), the "object with a string `name`, no `error` field"
success criterion, and that Task 2 required no edit because both whole-suite runs were already
clean.

## Deviations from Plan

None - plan executed exactly as written. No `src/` changes were needed or made; the change is
confined to `bbj-vscode/test/test-helper.ts` and its new test file, exactly as `files_modified`
declared for Task 1.

## Issues Encountered

Task 2's whole-suite runs did not reproduce the two contention-flaky failures the phase research
(Pitfall 5) had measured earlier this session (`parser-keyword-statements.test.ts` and
`installed-extension-e2e.test.ts`'s assertion mismatch) — both runs went straight to
`numFailedTests: 0` under `--maxWorkers=2`. Both runs *did* show the pre-existing
`numFailedTestSuites: 2` / `numFailedTests: 0` shape (a suite-level "failed" status with zero
failed assertions), and inspecting `testResults` in each JSON report confirms the one file with a
non-`passed` status is `test/functional/installed-extension-e2e.test.ts` — the same stale-installed-
bundle "No document found for URI" case STATE.md's Tech Debt section already documents as
pre-existing and out of scope for this phase. Since `numFailedTests` is 0 in both states, this
does not affect the D-04 gate and needed no fix. No other failure — real or contention — appeared
in either run.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- TEST-05 (#559) is complete: `isInteropPeerAnswering` closes DEBT item 5, and both whole-suite
  runs report `numFailedTests: 0`. This is the only plan in Phase 116 declaring `TEST-05`, so it
  is safe to mark `Complete` in `REQUIREMENTS.md`.
- The folded todo `2026-09-20-linking-interop-failures-survive-class-warmup` is resolved (see
  coverage entry D4) — root cause fixed across plans 03-06. The phase transition should close it
  under `.planning/todos/`.
- All four of Phase 116's requirements (TEST-04, TEST-05, TEST-06, TEST-08) are now complete —
  this was the last plan in the phase's wave 4.
- Plan 02's coverage reading for `main.ts`'s extracted handler modules (VERIFICATION/D-15) is
  recorded in `116-02-SUMMARY.md`'s `coverage` block and `coverage/phase-116/coverage-summary.json`
  (gitignored, one-off reading, no new CI gate).
- No blockers for phase verification or the next phase. `bbj-vscode/coverage/phase-116/` holds
  four gitignored JSON reports from this plan and plan 04/05 (`suite-04.json`, `suite-05.json`,
  `suite-down.json`, `suite-up.json`) as the whole-suite evidence trail for this phase.

## Self-Check: PASSED

- `[ -f bbj-vscode/test/test-helper.ts ]` → FOUND
- `[ -f bbj-vscode/test/test-helper.test.ts ]` → FOUND
- `git log --oneline --all` shows commit `d392777c` on `gsd/v4.7-audit-hygiene-burndown`
- Plan-level `<verification>` re-run:
  - `env -u RUN_BBJ_TESTS npx vitest run test/test-helper.test.ts` → 12 passed, 0 failed (≥7 required)
  - `RUN_BBJ_TESTS=0 npx vitest run --maxWorkers=2 --reporter=json` → `numFailedTests: 0`,
    `numTotalTests: 3586` (`coverage/phase-116/suite-down.json`)
  - `RUN_BBJ_TESTS=1 npx vitest run --maxWorkers=2 --reporter=json` → `numFailedTests: 0`,
    `numTotalTests: 3586`, `numPendingTests: 30` (< down's 53) (`coverage/phase-116/suite-up.json`)
  - `npm run lint` → exit 0
  - `npm run typecheck:test` → exit 0
- All acceptance-criteria grep/diff checks from Task 1 re-run and pass: `isPortOpen` count 0,
  `isInteropPeerAnswering(5008` count 1, `shouldRunBBjTests` signature count 1, no caller in the
  test-file diff since the phase base passes an argument
- `pgrep -af vitest` / `ps aux | grep vitest` → no leftover vitest process after either whole-suite
  run
- `git status --short` → only the pre-existing unstaged `.planning/STATE.md` (to be updated by
  this plan's own state-update step) and the pre-existing untracked `.planning/milestone.lock`; no
  stray probe files

---
*Phase: 116-java-interop-test-coverage*
*Completed: 2026-09-28*
