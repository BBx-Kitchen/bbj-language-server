---
phase: 124-interop-client
plan: 06
subsystem: testing
tags: [json-rpc, bbj-ls, formatProgram, denumProgram, live-test, latency, cancellation, vitest]

requires:
  - phase: 124-interop-client
    provides: ProgramLane with latches and the cancel-always backstop (plans 03, 04), loopback wire proof and scriptable double (plan 05), program guard (plan 02), classifier (plan 01)
provides:
  - "test/functional/program-live.test.ts: RUN_BBJ_TESTS-gated live confirmation of whole-document format, range format and DENUM through the language server's own JavaInteropService, probe-first with skip"
  - "Measured DENUM and parse latencies for the route decision, and the finding that bbj-ls honours $/cancelRequest"
affects: [125-ls-formatting, 126-ls-denum]

actuals:
  tokens: 3600
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "A live file probes with a tiny real request first; an unavailable answer stores a skip reason that every test turns into ctx.skip(), any other non-ok answer fails every test visibly"
    - "Route measurement: start the large request without awaiting, give it a head start, time the small request, then settle the large one; one warm-up and three timed runs, median printed with a program-live: prefix"

key-files:
  created:
    - bbj-vscode/test/functional/program-live.test.ts
  modified: []

key-decisions:
  - "The dedicated program lane is kept: measured 3-4 ms for a small DENUM behind a pending large parse against about 175 ms on a shared connection, and live parse latency during a large DENUM is not above idle"
  - "The cancellation finding is recorded, not asserted; only the client's own cancelled outcome is asserted"

requirements-completed: [INT-01, INT-02]

duration: 5min
completed: 2026-10-01
status: complete

coverage:
  - id: D1
    description: "Against the live BBj 26.03 bbj-ls on 127.0.0.1:5008, the language server's own client formats a program as a whole document and as a range, and denumbers a numbered program (and leaves an unnumbered one alone), each with a typed ok result"
    requirement: INT-01
    verification:
      - kind: integration
        ref: "RUN_BBJ_TESTS=1 npx vitest run test/functional/program-live.test.ts#a whole-document format / a range format / DENUM removes the line numbers"
        status: pass
    human_judgment: false
  - id: D2
    description: "DENUM latency behind a pending large parse on the dedicated lane is measured against the same-connection baseline, and parse latency while a large DENUM runs is measured against idle; the numbers and the route decision are recorded here"
    requirement: INT-02
    verification:
      - kind: integration
        ref: "RUN_BBJ_TESTS=1 npx vitest run test/functional/program-live.test.ts#DENUM latency behind a pending parse, on the shared connection and on the dedicated one"
        status: pass
    human_judgment: false
  - id: D3
    description: "Whether bbj-ls honours $/cancelRequest is checked live on a raw connection and through the client, and the finding is recorded"
    requirement: INT-02
    verification:
      - kind: integration
        ref: "RUN_BBJ_TESTS=1 npx vitest run test/functional/program-live.test.ts#whether bbj-ls honours a cancelled DENUM request on a raw connection / a cancelled DENUM through the client settles as cancelled"
        status: pass
    human_judgment: false
  - id: D4
    description: "With the gate closed the file contributes only skipped tests and opens no connection; with the gate open it probes first and skips, never fails, when the peer does not serve formatProgram"
    requirement: INT-01
    verification:
      - kind: integration
        ref: "RUN_BBJ_TESTS=0 npx vitest run test/functional/program-live.test.ts (6 skipped)"
        status: pass
    human_judgment: false
---

# Phase 124 Plan 06: Live Format/DENUM Confirmation, Route Measurement and Cancellation Finding Summary

**The language server's own client formats (whole document and range) and denumbers against the live bbj-ls; a small DENUM behind a pending large parse takes 3-4 ms on the dedicated lane against about 175 ms on a shared connection, parse latency is not hurt by a running DENUM, and bbj-ls honours `$/cancelRequest` with `-32800` in 1-2 ms.**

Route status: **dedicated program lane kept (measured).** No "route needs review" flag.

## Performance

- **Duration:** about 5 min
- **Started:** 2026-10-01T12:57:00Z
- **Completed:** 2026-10-01T13:00:00Z
- **Tasks:** 2
- **Files modified:** 1 (new)

## Live results

Date: 2026-10-01. Live peer: BBjServices bbj-ls on 127.0.0.1:5008 in this dev container, reached by the language server's own `JavaInteropService` (the baseline scenario (a) uses a raw connection from the interop harness's `connect`). The BBj / bbj-ls build string is not visible from the client, so it is not recorded. The live run was **not skipped**: the probe answered `ok`, so every test ran.

Three full runs were taken. Run 1 (before the idle-parse line was added to the file) and runs 2 and 3 agree within a few milliseconds. Lines copied verbatim from run 2:

```
program-live: idle small denum (client) median=44ms runs=[44, 44, 44]
program-live: idle large parse (client) median=201ms runs=[198, 201, 203]
program-live: (a) small denum behind a pending parse, same raw connection median=176ms runs=[176, 173, 227]
program-live: (b) small denum behind a pending parse, dedicated lane median=3ms runs=[5, 3, 3]
program-live: (c) idle small parse median=82ms runs=[82, 82, 82]
program-live: (c) small parse while a large denum runs median=42ms runs=[41, 42, 42]
program-live: cancel honoured=yes code=-32800 ms=2
program-live: client cancel outcome=cancelled ms=0
```

Run 3 (verbatim): idle small denum 44 ms, idle large parse 202 ms, (a) 173 ms runs=[173, 173, 196], (b) 3 ms runs=[3, 3, 4], (c) idle small parse 82 ms, (c) parse during a large denum 42 ms, cancel honoured=yes code=-32800 ms=1, client cancel outcome=cancelled ms=0. Run 1: (a) 195 ms, (b) 4 ms, (c) 82 ms idle and 42 ms busy, cancel honoured=yes code=-32800 ms=1.

How the scenarios were built: the large parse is a 20,000-line synthetic program (alternating `rem line N` and `xN = N`); the large DENUM is 9,999 synthetic numbered lines with five-digit numbers; the small DENUM is the two-line numbered program. In (a) and (b) the large parse is started without awaiting, given a 30 ms head start, then the small DENUM is timed. Each scenario has one warm-up and three timed runs. The `ms` in the two cancel lines is measured from the moment of the cancel to the moment the request settled, not from the send. The text is generated in the test; no proprietary source enters the repository.

## Route decision

**Dedicated program lane kept (measured).**

- (b) the dedicated lane, about 3-4 ms, is far below (a) the same-connection baseline, about 175 ms. In (a) the small DENUM waits for the remainder of the large parse (the large parse alone takes about 200 ms here, minus the 30 ms head start): on one connection a DENUM queues behind a pending parse. On the dedicated lane it does not.
- The dedicated lane is also not slower than idle: the idle small DENUM (44 ms) is a back-to-back request floor and (b) is below it, so there is no queueing. D-03's acceptance (DENUM behind a pending parse stays close to its idle latency) holds.
- (c) the small parse during a large DENUM, 42 ms, is not above the idle small parse, 82 ms. The idle parse number is the parse connection's own back-to-back floor (the parse lane does not set `TCP_NODELAY`; the program lane does, and that lane is the only one this phase changed). Live parse latency is unchanged, in fact not worse, while DENUM runs.
- These are single-container numbers recorded as evidence, not as a bar (no fixed millisecond threshold, per the plan). They are lower in absolute terms than the research pre-measurement (large parse about 200 ms now against 546-684 ms then, queued DENUM about 175 ms against 594-628 ms), most likely a different bbj-ls build, but the shape is the same and so is the conclusion.

## $/cancelRequest finding

**bbj-ls honours `$/cancelRequest`.** A large DENUM sent on a raw connection and cancelled after about 20 ms settled with `-32800` (RequestCancelled) 1-2 ms after the cancel notification went out (`honoured=yes code=-32800`), well inside the 15 s guard, in all three runs. Through the client, a large DENUM whose caller token is cancelled shortly after the call settles as `cancelled` within 0-1 ms (the client settles first and does not wait for the peer) and the cancel notification is on the wire (proven in the loopback wire suite). Caveat carried from the research and not re-measured here: the peer worker may keep running a cancelled job, so a request right after a cancel on the same connection can be slower; the plain `timeout` for `-33002` already covers that case.

## Accomplishments

- A new gated live file calls `formatProgram` (whole document and range) and `denumProgram` through the language server's own `JavaInteropService`: a whole-document format returns a typed ok with `scope: 'document'`, the version echoed, a text and a diagnostics array; a range format over `(0,0)-(2,0)` returns `scope: 'range'` with at most one edit; DENUM drops the line number of a numbered program (`denumbered: true`, first line no longer starts with `0010`) and leaves `print 1` untouched (`denumbered: false`).
- The file probes first with a tiny real `formatProgram` and skips (never fails) on `unavailable`, printing `program-live: skipped - probe answered unavailable/<reason>`; any other non-ok probe outcome makes every test fail visibly. With `RUN_BBJ_TESTS=0` it reports 6 skipped and opens no connection.
- The route measurement and the cancellation findings above, recorded with the date and the run-to-run spread.

## Task Commits

1. **Task 1: A whole-document format against the live bbj-ls through the language server's own client** (tracer) - `cd15ee58` (test). Tracer gate in auto mode: the verify was re-run end to end (live run, 1 test passed, not skipped), then expansion continued.
2. **Task 2: Live range format and DENUM, the route measurement, the cancellation finding** - `3d108098` (test)

**Plan metadata:** committed with this SUMMARY (docs: complete plan)

## Files Created/Modified

- `bbj-vscode/test/functional/program-live.test.ts` - gate, probe-first skip, six live tests (whole format, range format, DENUM, route measurement, raw cancel finding, client cancel)

## Decisions Made

- The dedicated program lane stays: measured better than the same-connection baseline by a wide margin and not worse than idle.
- An idle large-parse line was added to the measurement beyond the plan's list so the same-connection queueing in (a) can be read against the parse's own duration.
- The cancel finding is printed, not asserted; the assertion in the file is the client's own `cancelled` outcome.

## Deviations from Plan

None - plan executed exactly as written, apart from the one extra measurement line noted under Decisions Made.

Trailer note: the plan's executor rules name `Claude Opus 5.5`; this executor is Claude Sonnet 5.5 and the session's attribution instruction names that model, so every commit carries `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>` (as plans 02-05 did).

**Total deviations:** 0 auto-fixed.
**Impact on plan:** None.

## Issues Encountered

None. The Grep tool was not registered in this session, so acceptance greps ran as scoped `grep` calls on absolute paths.

## Regression Judgement

- Task 2 verify as written: live run (`RUN_BBJ_TESTS=1`) 6 of 6 passed, gate-closed run 6 skipped, `npm run typecheck:test` and `npm run lint` clean.
- Only a test file was added; no production source and no existing test changed. The whole suite was not re-run: plan 05's whole-suite gate (0 failed tests, only `installed-extension-e2e` failing in `beforeAll`) is the last measurement and nothing it covers has changed since.

## Known Stubs

None.

## Threat Flags

None. The surface is the plan's own threat model: synthetic program text only (T-124-31), a gated and probe-first live file (T-124-32), host fixed to 127.0.0.1:5008 (T-124-33), and bounded waits (the client backstop, the raw guard) against a wedged peer (T-124-34).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 124 is complete: the client layer exists, is proven hermetically, over a real socket, and live. Phases 125 and 126 can call `formatProgram` and `denumProgram` and script them in any `createBBjTestServices` suite.
- Notes for Phase 125: per-document serialization of format requests still matters (supersession by `canonicalName`, and a cancelled job may keep the worker busy); the program lane sets `TCP_NODELAY` and the parse lane does not.
- REQUIREMENTS.md: INT-01..INT-05 are each evidenced by the six phase summaries (INT-01 by 02, 03, 05, 06; INT-02 by 03, 04, 06; INT-03 by 04, 05; INT-04 by 01, 04, 05; INT-05 by 02, 05) and are marked complete with this plan.

## Self-Check: PASSED

- FOUND: bbj-vscode/test/functional/program-live.test.ts
- FOUND commits: cd15ee58, 3d108098
- Acceptance greps pass: `shouldRunBBjTests` 2, `ctx.skip()` 1, `DocumentBuilder` 0, `program-live:` 5 lines in the file, `interop-test-harness/scaffold.js` 1, planning-identifier grep empty; live run green, gate-closed run all skipped, typecheck:test and lint clean.

---
*Phase: 124-interop-client*
*Completed: 2026-10-01*
