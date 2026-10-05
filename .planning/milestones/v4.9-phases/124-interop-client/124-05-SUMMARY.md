---
phase: 124-interop-client
plan: 05
subsystem: testing
tags: [json-rpc, loopback, bbj-ls, formatProgram, denumProgram, cancellation, test-double, vitest]

requires:
  - phase: 124-interop-client
    provides: ProgramLane with availability latches and the cancel-always backstop (plans 03, 04), program guard and outcome types (plan 02), error classifier (plan 01)
provides:
  - "LoopbackPeerContext.token and LoopbackPeer.cancellations: a handler sees its own request's cancellation token and the peer records every request whose $/cancelRequest arrived"
  - "test/java-interop-program-wire.test.ts: real-socket proof of omitted optional fields, typed results, error data framing, per-method availability and real $/cancelRequest"
  - "JavaInteropTestService.scriptFormatProgram / scriptDenumProgram and JavaInteropTestServiceProgramScript: contract-faithful scripted outcomes for every createBBjTestServices suite, success by default, never a socket"
  - "test/java-interop-program-test-double.test.ts: every scripted outcome pinned through createBBjTestServices"
affects: [124-06, 125-ls-formatting, 126-ls-denum]

actuals:
  tokens: 6000
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "A loopback peer handler observes cancellation through ctx.token.onCancellationRequested and the test awaits a promise that settles only when a real $/cancelRequest arrives, with only setTimeout/clearTimeout faked after the lane is open"
    - "A hermetic double feeds scripted wire answers through the production validators and classifier (programOutcomeForResult / programOutcomeForError) instead of building outcomes by hand"
    - "A test double overrides createSocket to reject, so even a path that bypasses its method overrides cannot open a real socket"

key-files:
  created:
    - bbj-vscode/test/java-interop-program-wire.test.ts
    - bbj-vscode/test/java-interop-program-test-double.test.ts
  modified:
    - bbj-vscode/test/loopback-jsonrpc-peer.ts
    - bbj-vscode/test/bbj-test-module.ts

key-decisions:
  - "The scripted default for formatProgram and denumProgram is a valid success echo, unlike parseProgram's method-not-found default, so suites that never script anything exercise the success path"
  - "Latches are not emulated in the double; they are proven against the fake peer (plan 04) and the loopback peer (this plan)"
  - "The wire suite shares one WireFixture (peer + plain service, torn down in afterEach with real timers restored first) instead of per-describe state"

patterns-established:
  - "Wire suite handler selection by the request's version string (warm, hang, after) so one peer serves the warm-up, the hung call and the follow-up"
  - "Hung-peer helper returning handlers plus arrived and cancelled promises: arrival proves the request left the client, cancelled proves a real cancel notification reached the peer"

requirements-completed: [INT-01, INT-03, INT-04, INT-05]

duration: 7min
completed: 2026-10-01
status: complete

coverage:
  - id: D1
    description: "Over a real loopback socket, formatProgram sends only the fields that were set (never a null optional), forwards canonicalName, settings and allowDenum exactly as given, returns a typed whole-document result, and opens only the one dedicated socket"
    requirement: INT-01
    verification:
      - kind: integration
        ref: "bbj-vscode/test/java-interop-program-wire.test.ts#formatProgram over a real loopback socket"
        status: pass
    human_judgment: false
  - id: D2
    description: "-33007 problems (a malformed entry dropped), -33008 line and -32800 cancelled survive real JSON-RPC framing and arrive as typed outcomes"
    requirement: INT-04
    verification:
      - kind: integration
        ref: "bbj-vscode/test/java-interop-program-wire.test.ts#error data survives real framing"
        status: pass
    human_judgment: false
  - id: D3
    description: "A peer without formatProgram latches only that method off (a second call sends no request) while denumProgram keeps working on the same single socket"
    requirement: INT-03
    verification:
      - kind: integration
        ref: "bbj-vscode/test/java-interop-program-wire.test.ts#each method is available on its own over the real wire"
        status: pass
    human_judgment: false
  - id: D4
    description: "The 15 s backstop (pending at 14,999 ms, a client timeout at 15,000 ms) and a caller cancellation each settle without waiting for the peer and put a real $/cancelRequest on the wire; the socket then serves a following request"
    requirement: INT-04
    verification:
      - kind: integration
        ref: "bbj-vscode/test/java-interop-program-wire.test.ts#cancellation reaches the peer as a real $/cancelRequest"
        status: pass
    human_judgment: false
  - id: D5
    description: "Every createBBjTestServices suite can script formatProgram/denumProgram (success by default, method-not-found, transport-error, wire result, wire error, outcome escape hatch); scripted wire answers go through the real validator and classifier; no scripted call reaches createSocket or connect, and createSocket itself rejects"
    requirement: INT-05
    verification:
      - kind: unit
        ref: "bbj-vscode/test/java-interop-program-test-double.test.ts"
        status: pass
    human_judgment: false
  - id: D6
    description: "Phase gates: targeted interop suites, typecheck:test, lint, build and the whole suite with RUN_BBJ_TESTS=0 report no failure beyond the known installed-extension environment suite"
    verification:
      - kind: other
        ref: "RUN_BBJ_TESTS=0 npx vitest run --maxWorkers=2 (3911 passed, 53 skipped, 0 failed tests); npm run typecheck:test; npm run lint; npm run build"
        status: pass
    human_judgment: false
---

# Phase 124 Plan 05: Loopback Wire Proof and Scriptable Format/DENUM Double Summary

**Real-socket proof that formatProgram/denumProgram omit unset fields, keep -33007/-33008 error data through framing, latch per method, and put a real $/cancelRequest on the wire at the 15 s backstop and on caller cancellation, plus a success-by-default scriptable double that routes scripted wire answers through the production guard and classifier and can never open a socket.**

## Performance

- **Duration:** 7 min
- **Started:** 2026-10-01T12:49:50Z
- **Completed:** 2026-10-01T12:56:30Z
- **Tasks:** 3
- **Files modified:** 4 (2 new, 2 changed; no production source touched)

## Accomplishments

- The shared loopback peer now hands every handler its own request's `CancellationToken` through `ctx.token` and records each request whose `$/cancelRequest` arrived in `peer.cancellations`. The change is additive: `interop-harness-fake-peer.ts` and `java-interop-socket.test.ts` are byte-unchanged and their suites still pass.
- The wire suite (8 tests) uses a plain, un-overridden `JavaInteropService` against that peer. A whole-document format reaches the peer with exactly `text` and `version` and nothing null; a request carrying `canonicalName`, `settings` and `allowDenum` reaches it exactly as given with no `range`; only one socket is ever accepted.
- Error data survives real framing: `-33007` with one valid and one malformed entry gives exactly one problem, `-33008` gives line 2, `-32800` gives `cancelled`.
- Per-method availability holds over the real wire: with a peer that has only `denumProgram`, `formatProgram` answers `unavailable` / `method-not-found`, a second call sends no request (one `formatProgram` request in total), and `denumProgram` answers `ok` on the same socket (`connectionCount` stays 1).
- Real cancellation, both ways: after a warm-up opens the lane, a hung `formatProgram` is pending at 14,999 ms, settles as `timeout` / `client` at 15,000 ms, and the peer's handler token is then cancelled with the request recorded in `peer.cancellations`; a following request on the same socket is answered. A caller `CancellationTokenSource.cancel()` settles `cancelled` at once and the peer's token is cancelled afterwards. This closes the open question the fake peer left (it rejects on cancel, vscode-jsonrpc 8.2.1 does not).
- `JavaInteropTestService` gained `scriptFormatProgram` / `scriptDenumProgram` and overrides for both methods. Scripts default to `'success'` (a valid echo: whole document `{ text, ... }`, range `{ edits: [], ... }`, DENUM `{ text, denumbered: false, ... }`), and a wire result or wire error runs through `programOutcomeForResult` / `programOutcomeForError` and the real `validateFormatResult` / `validateDenumResult`. Proof it is the real guard: a scripted `edits: []` on a whole-document request is `malformed-result` (`edits-on-document-request`), a stale version echo is `version-mismatch`, a missing `denumbered` flag is refused, and control characters in a scripted error message are stripped.
- `JavaInteropTestService.createSocket` now rejects, so even a path that bypasses the method overrides cannot open a socket. A spy test shows zero `createSocket` and `connect` calls across every scripted outcome.

## Task Commits

1. **Task 1: A whole-document format travels over a real loopback socket with omitted optional fields and comes back typed** (tracer) - `c91c9e15` (test). The tracer gate ran in auto mode: the verify was re-run end to end (4 files, 47 tests, then `typecheck:test`) and passed, so expansion continued.
2. **Task 2: Error data, per-method availability and real $/cancelRequest over the real wire** - `211774ae` (test)
3. **Task 3: Scriptable format/DENUM in the hermetic test double, and the phase gates** - `aee5ccec` (test)

**Plan metadata:** committed with this SUMMARY (docs: complete plan)

_Note: Tasks 2 and 3 are marked `tdd="true"`, but the behaviour they test was built in plans 02 to 04, so the wire tests passed on their first run (8 of 8) and no RED commit exists for them. Task 3's tests were written after the double, as pins for the contract it implements, so there is no separate failing-test commit either._

## Files Created/Modified

- `bbj-vscode/test/loopback-jsonrpc-peer.ts` - `LoopbackPeerContext.token`, `LoopbackPeer.cancellations`, per-request context built in the star handler
- `bbj-vscode/test/java-interop-program-wire.test.ts` - the real-socket suite and its `WireFixture`, `hangingFormatPeer` helpers
- `bbj-vscode/test/bbj-test-module.ts` - `JavaInteropTestServiceProgramScript`, the two script seams, the two overrides, `scriptedProgramOutcome`, and the `createSocket` rejection
- `bbj-vscode/test/java-interop-program-test-double.test.ts` - every scripted outcome through `createBBjTestServices(EmptyFileSystem)` (20 tests)

## Decisions Made

- Scripts default to a valid success echo so a later phase's suites reach the success path without scripting anything; the contract only differs from `parseProgram`'s default there.
- The double does not emulate latches. Availability is covered by the fake-peer suite (plan 04) and now by the loopback suite, so duplicating it in a double would only add a second place to drift.
- The `outcome` escape hatch is cast to the method's outcome type and returned as given; it is the one script that bypasses the production guard, by design.

## Deviations from Plan

None - plan executed exactly as written.

Notes, none of which changed behaviour:
- The Task 1 commit command was run as `cd ... && git ...` once, against the shell rules; it worked and every later git call used `git -C`.
- The commit trailer is `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`: the plan text names Opus 5.5, this executor is Sonnet 5.5 and the session's attribution instruction names that model (as plans 02 to 04 did).

---

**Total deviations:** 0 auto-fixed.
**Impact on plan:** None.

## Issues Encountered

None. The Grep tool was not registered in this session, so acceptance greps ran as single scoped `grep` calls on absolute paths.

## Regression Judgement

- Targeted gate (Task 3 verify, first command): 14 files, 375 tests, all passed; `npm run typecheck:test`, `npm run lint` (`--max-warnings 0`) and `npm run build` clean.
- Whole suite, `RUN_BBJ_TESTS=0 npx vitest run --maxWorkers=2`, once: 179 files passed, 4 skipped, 1 failed; 3911 tests passed, 53 skipped, **0 failed tests**. The one failed suite is `test/functional/installed-extension-e2e.test.ts` (a `beforeAll` "No document found for URI" in the SETOPTS-in-code block), the known environment failure that spawns the separately installed `~/.ext-test` bundle. No other failing name appeared, so no comparison against the phase base was needed and nothing was relabelled.
- `interop-harness-fake-peer.ts` and `java-interop-socket.test.ts` are unchanged (`git diff --exit-code` clean); the register grep for planning identifiers over the four changed files finds nothing.

## Known Stubs

None.

## Threat Flags

None. The surface touched is the plan's own threat model: contract drift in the double (T-124-27, scripted answers go through the real validators, malformed-script tests), a hermetic suite reaching :5008 (T-124-28, `createSocket` rejects and a spy shows zero calls), a wire suite hanging on a silent handler (T-124-29, fake `setTimeout` drives the backstop and tests await arrival and cancellation promises), and the loopback bind (T-124-30, unchanged: `127.0.0.1` port 0).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 124-06 (live harness) can measure real latencies and record whether bbj-ls itself honours `$/cancelRequest`; the client side of that is now proven to put the notification on the wire.
- Phases 125 and 126 can script `formatProgram` / `denumProgram` outcomes in any `createBBjTestServices` suite with `scriptFormatProgram` / `scriptDenumProgram`, and get a valid success without scripting.
- `requirements-completed` lists INT-01, INT-03, INT-04, INT-05; each is also declared by other plans in this phase (plan 124-06 at least), so REQUIREMENTS.md was not edited here, as the plan instructs.

## Self-Check: PASSED

- FOUND: bbj-vscode/test/loopback-jsonrpc-peer.ts
- FOUND: bbj-vscode/test/java-interop-program-wire.test.ts
- FOUND: bbj-vscode/test/bbj-test-module.ts
- FOUND: bbj-vscode/test/java-interop-program-test-double.test.ts
- FOUND commits: c91c9e15, 211774ae, aee5ccec
- Acceptance greps pass: `readonly token: CancellationToken` 1, `cancellations` 4 in the peer, `connectionCount` 1, `PROGRAM_REQUEST_TIMEOUT_MS` 2, `ctx.token` 1 and `cancellations` 5 in the wire suite, `export type JavaInteropTestServiceProgramScript` 1, `public scriptFormatProgram(`/`scriptDenumProgram(` 2, `programOutcomeForResult(` 2, `protected override createSocket(` 1, planning-identifier grep empty; both Task 3 verify commands pass.

---
*Phase: 124-interop-client*
*Completed: 2026-10-01*
