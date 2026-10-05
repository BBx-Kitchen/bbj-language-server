---
phase: 124-interop-client
verified: 2026-10-01T13:20:00Z
status: passed
score: 5/5 must-haves verified
behavior_unverified: 0
overrides_applied: 0
warnings:
  - id: WR-01
    summary: "A lost program lane is dropped but never disposed; an in-flight request waits for the 15 s backstop and an error-only loss leaks a socket"
    severity: warning
    evidence: "java-interop-program-lane.ts onLaneLost (lines 424-430) clears the field and bumps the epoch but does not call lane.dispose(); node_modules/vscode-jsonrpc/lib/common/connection.js closeHandler (311-317) only sets state Closed, it does not reject pending requests"
  - id: WR-02
    summary: "PROGRAM_REQUEST_TIMEOUT_MS (15 s) is below the worst legitimate formatProgram with allowDenum (two 10 s peer steps)"
    severity: warning
  - id: WR-03
    summary: "A caller cancellation is not observed while the lane is opening (up to 10 s)"
    severity: warning
  - id: WR-04
    summary: "sanitizePeerText leaves LRM/RLM/ALM, zero-width and BOM characters in; its doc comment promises more than it does"
    severity: warning
---

# Phase 124: Interop Client Verification Report

**Phase Goal:** The language server can ask bbj-ls to format or denumber a program over the :5008 interop connection and gets a typed, validated answer. Format and DENUM traffic never slows or clears live compiler diagnostics, never disables another method and never trips the circuit breaker.
**Verified:** 2026-10-01
**Status:** passed (with 4 non-blocking warnings, see Warnings)
**Re-verification:** No, initial verification

## Goal Achievement

The goal is achieved. The five roadmap success criteria each trace to production code that exists, is substantive and is wired, and each is backed by tests that I re-ran or read in full. The one thing I tried hardest to falsify was SC2 and SC4 (isolation from the parse lane and the breaker); the code structure and the tests both hold. The four code-review warnings do not break any success criterion. WR-01 is real (I confirmed it against the installed library) and should be fixed before Phase 125 leans on the client.

### Observable Truths (roadmap contract)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Against a live BBj 26.03 BBjServices, the language server's client formats a program as a whole document and as a range, and denumbers a line-numbered program, each with a typed result | VERIFIED | I re-ran `test/functional/program-live.test.ts` against :5008: 6/6 passed, not skipped. Whole format returns `scope:'document'` with the version echoed; range format returns `scope:'range'` with at most one edit; DENUM returns `denumbered:true` and drops the `0010` prefix, and leaves `print 1` alone (`denumbered:false`). Calls go through `JavaInteropService.formatProgram/denumProgram` (java-interop.ts:249, 262 -> java-interop-connection.ts `programLane.request`). The roadmap says "interop harness"; CONTEXT D-17 reads that as the live vitest path, and the 17-case harness CLI was deliberately not extended. |
| 2 | Format/DENUM traffic never slows live `BBj Parser` diagnostics; DENUM latency behind a pending parse is measured and the route recorded; losing the route never clears live diagnostics or bumps the parse generation | VERIFIED | **Structure:** `ProgramLane` is a third socket. It is handed only `createSocket`, `wrapSocket` and a read-only `sharedGeneration()` (java-interop-connection.ts:229-233), and imports neither the connection nor the notifications module (imports checked). `onLaneLost`/`dispose` touch only `laneEpoch`. **Tests:** lane test "losing the connection moves only its own epoch: the generation and a stored live-parse verdict survive" and "with the dedicated connection hung and a format request pending, a parse and a class lookup are still answered" pass. **Measured live (my re-run, same as the SUMMARY within a few ms):** (a) small DENUM behind a pending large parse on one connection 183 ms; (b) same on the dedicated lane 3 ms; idle small DENUM 43 ms; (c) small parse while a large DENUM runs 42 ms against 82 ms idle. Route decision (dedicated lane kept) is recorded in 124-06-SUMMARY.md and here. See Info 1 for a caveat on how tightly (c) proves overlap. |
| 3 | Against a peer answering `-32601` for `formatProgram` or `denumProgram`, live parse and the other method keep working, and each method is probed again on the next connection | VERIFIED | Per-method latch map keyed `sharedGeneration.laneEpoch` (lane.ts:163, 326-345). Tests: "a peer without formatProgram latches only that method..." and the denumProgram twin (assert second call sends no request and opens no socket, other method ok on the same lane, live parse still `verdict`, generation unchanged); `a latched method is probed again after a cache clear / a lost program connection / a fresh shared connection` (3 cases); "a method-not-found answer from a replaced connection does not latch the new one". The real-wire suite proves the same on one loopback socket. |
| 4 | Every bbj-ls error code (`-33001`..`-33009`, `-32602`, `-32800`) yields its own typed outcome; after a burst, class completion/hover still work because the breaker never opens | VERIFIED | One shared classifier (java-interop-errors.ts `KIND_BY_CODE`, `-32800` first, `-32601` second). `outcomeForClassifiedError` maps all kinds with an exhaustive `never` check. Test table `a %s answer is its own typed outcome on both methods` covers 13 inputs on both methods; "twenty application errors leave the generation, class lookups and live parse untouched" asserts 11 distinct tokens, unchanged generation, no new socket, no `circuit open`, no error dialog, and live parse latch intact. Structurally the lane has no path to `onConnectAttemptSettled`/`notifyJavaConnectionError`. -33004 is a `failed/service-unavailable` outcome and never latches (own test). `-33007`/`-33008` `data` becomes a typed bounded payload and survives real JSON-RPC framing (wire suite). |
| 5 | A peer answer with both or neither of `text`/`edits`, an oversized payload, or an out-of-range range or line is rejected as a typed failure and never reaches an editor | VERIFIED | `java-program-guard.ts`: document request needs string `text` and absent `edits` (`edits-on-document-request`, `text-not-string`); range request needs absent `text` and an `edits` array of at most one (`text-on-range-request`, `edits-not-array`, `too-many-edits`); positions must be non-negative safe integers, ordered, inside the sent document and overlapping the requested lines; text and `newText` capped at min(4x + 64 KiB, 16 MiB); echoed `version` must match; diagnostics capped at 500, bad lines dropped individually. Lane turns a refusal into `malformed-result` (`programOutcomeForResult`), and an `ok` outcome only ever carries the guard's freshly built value. `java-program-guard.test.ts` has refusal cases for each shape (both/neither, number text, non-boolean flag, version echo, oversize, inverted/outside/non-overlapping edit). No editor consumer exists yet in this phase, which is the stated scope. |

**Score:** 5/5 roadmap truths verified; 0 present-but-behavior-unverified.

Plan-level must-have truths (01-06) are all subsumed by the above or confirmed directly: shared classifier with parser-service migrated behaviour-identically (bbj-parser-service, parse-lane suites unchanged and green), wire types with optional fields omitted (wire suite), cool-down and lifecycle (lane tests), cancel-always backstop (lane tests + loopback `$/cancelRequest` proof), scriptable double running scripted answers through production guard and classifier (bbj-test-module.ts:302-314), live file probe-first with skip.

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `bbj-vscode/src/language/java-interop-errors.ts` | code constants, `classifyInteropError`, `FailureLogCadence` | VERIFIED | 217 lines, used by lane and parser service |
| `bbj-vscode/src/language/java-interop-program-types.ts` | wire types, outcome union, `RequestType`s | VERIFIED | 152 lines, imported by lane, guard, connection, front service |
| `bbj-vscode/src/language/java-program-guard.ts` | validators and sanitising | VERIFIED | 386 lines, wired as validators in connection |
| `bbj-vscode/src/language/java-interop-program-lane.ts` | `ProgramLane` | VERIFIED | 445 lines, instantiated in `JavaInteropConnection`, disposed in `disconnect()` |
| `bbj-vscode/src/language/java-interop-connection.ts` / `java-interop.ts` | delegates | VERIFIED | `formatProgram`/`denumProgram` present in both, type re-exports added |
| `bbj-vscode/src/language/bbj-parser-service.ts` | on the shared classifier | VERIFIED | calls `classifyInteropError`, `FailureLogCadence` |
| Tests: errors, guard, lane, wire, test-double, loopback peer, fake peer, `bbj-test-module.ts`, `functional/program-live.test.ts` | | VERIFIED | all present, all green |
| `COVERAGE.md` | api-coverage gate note | VERIFIED | present |

### Key Link Verification

| From | To | Via | Status |
|------|----|-----|--------|
| `java-interop.ts` | `java-interop-connection.ts` | `interopConnection.formatProgram/denumProgram` | WIRED |
| `java-interop-connection.ts` | `java-interop-program-lane.ts` | `programLane.request(formatProgramRequest\|denumProgramRequest, params, validator, token)` | WIRED |
| `java-interop-connection.ts` | `java-program-guard.ts` | `validateFormatResult` / `validateDenumResult` | WIRED |
| lane | `java-interop-errors.ts` | `classifyInteropError(`, `failureLog.report(` | WIRED |
| lane | `vscode-jsonrpc` | `new CancellationTokenSource()` passed to `sendRequest` | WIRED |
| `bbj-parser-service.ts` | `java-interop-errors.ts` | `classifyInteropError(e)` in the catch | WIRED |
| `bbj-test-module.ts` | lane | `programOutcomeForResult/Error` | WIRED |
| `program-live.test.ts` | `JavaInteropService`, `scaffold.js` | `createBBjServices(...).java.JavaInteropService`, `connect` | WIRED |
| `disconnect()` / `clearCache` | program lane | `this.programLane.dispose()` (lifts cool-down, bumps lane epoch) | WIRED |

### Data-Flow Trace (Level 4)

| Artifact | Data | Source | Real data | Status |
|----------|------|--------|-----------|--------|
| `JavaInteropService.formatProgram` result | `result.text` / `edits` | peer answer through `validateFormatResult` | Yes, live run returned real text from bbj-ls | FLOWING |
| `JavaInteropService.denumProgram` result | `result.text`, `denumbered` | peer answer through `validateDenumResult` | Yes, live run returned `denumbered:true` with the number stripped | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Phase unit/wire/double suites plus the existing guards (parser service, parse lane, breaker, connection, timeouts, peer guard) | `npx vitest run` on 11 files | 11 files, 332 tests passed | PASS |
| Live format, range, DENUM, route measurement, cancel | `npx vitest run test/functional/program-live.test.ts` (peer on :5008 answering, so the gate opens) | 6/6 passed, not skipped | PASS |
| Whole suite (orchestrator) | recorded by the orchestrator | 3970 tests, 0 failed; only `installed-extension-e2e` fails (known environment suite) | accepted, not re-run |

### Probe Execution

No probe scripts declared or conventional for this phase. SKIPPED.

### Requirements Coverage

Plan frontmatter IDs: 01 [INT-04], 02 [INT-01, INT-05], 03 [INT-01, INT-02], 04 [INT-03, INT-04, INT-02], 05 [INT-01, INT-03, INT-04, INT-05], 06 [INT-01, INT-02]. REQUIREMENTS.md maps INT-01..INT-05 to Phase 124 and marks all five Complete. No ID declared by a plan is missing from REQUIREMENTS.md, and no REQUIREMENTS.md ID for this phase is unclaimed (no orphans).

| Requirement | Source plans | Status | Evidence |
|-------------|--------------|--------|----------|
| INT-01 typed `formatProgram` (document, range) and `denumProgram` over :5008 | 02, 03, 05, 06 | SATISFIED | Truth 1; types, delegates, live run |
| INT-02 format/DENUM never delays or resets live parse; route decided and measured; lost route never bumps parse generation | 03, 04, 06 | SATISFIED | Truth 2 |
| INT-03 per-method availability probed and latched per connection generation | 04, 05 | SATISFIED | Truth 3 |
| INT-04 every bbj-ls code classified; none trips the breaker | 01, 04, 05 | SATISFIED | Truth 4 |
| INT-05 responses validated before reaching an editor | 02, 05 | SATISFIED | Truth 5 |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| (phase files) | | TBD/FIXME/XXX/TODO/HACK scan | none found | Debt-marker gate clear |
| `java-interop-connection.ts` | 357 | `P67-WR-02` planning id in a comment | Info | Pre-existing, not in this phase's diff |
| (phase files) | | Planning IDs (D-xx, INT-xx, plan numbers) in new source/test comments | none found | Register rule satisfied |

No stubs: no empty returns, hardcoded empty data or console-only handlers in the new modules.

### Warnings (non-blocking; none breaks a success criterion)

**WR-01 (most important). Lane loss is never disposed.** `onLaneLost` (java-interop-program-lane.ts:424-430) clears the field and bumps the epoch but does not call `lane.dispose()`. I checked the installed vscode-jsonrpc: `closeHandler` only sets state to `Closed` and fires the close event; pending requests are rejected only by `dispose()` (`PendingResponseRejected`). Consequences: (1) a request in flight when the peer closes the socket (bbj-ls restart or crash) settles only after the 15 s backstop, as `timeout/client` with the text "no answer within 15 s", instead of failing at once as `failed/transport`; (2) a reader-error-only loss leaves a live socket and server-side workers unreferenced. The hermetic double masks this because `FakePeerInteropService.dropConnection` rejects pending requests itself, and no loopback test drops the socket mid-request even though `ctx.drop()` exists. This does not violate SC2: the lane still moves only its own epoch, the generation is untouched, and the next request reopens. It is an availability defect on a path Phase 125 (format-on-save, FMT-03/FMT-10) will exercise. Recommended fix is the one in the review (call `lane.dispose()` after clearing the field) plus a loopback mid-request-drop test. Worth doing before Phase 125 consumes the client.

**WR-02. The 15 s deadline can cut off a legitimate request.** bbj-ls README: a whole-document `formatProgram` with `allowDenum` runs a DENUM step (10 s limit) then a format step (10 s limit), and DENUM steps queue on one parser worker per connection. A healthy answer can take about 20 s, so the client would cancel it and report a timeout. The code comment ("only ever fires for a peer that has stopped answering at all") is therefore wrong for that case. Phase 126 uses `allowDenum` (FMT-07), so raise the constant (about 25 s) or size it per request before then. Not deferrable to a later phase by roadmap text; keep it open.

**WR-03. Cancellation is not observed while the lane opens.** `await this.laneConnection()` is not raced against the token, so a cancel during a slow open (up to the 10 s connect timeout) settles late. No success criterion depends on it.

**WR-04. `sanitizePeerText` is narrower than its doc.** It strips C0/C1, DEL and U+202A-202E, U+2066-2069, but not U+200E/200F, U+061C, zero-width, BOM, U+206A-206F. INT-05 asks for bounded sizes, ranges and lines, not full text sanitising, so this is hardening, not a missed requirement.

### Info

1. **SC2 measurement caveat.** The scenario (c) comparison (42 ms busy vs 82 ms idle) is not like for like: the idle parse is a back-to-back request on a parse socket without `TCP_NODELAY`, while the busy one goes out after a 30 ms head start. The large DENUM's own idle duration was not measured, so the file cannot prove the parse overlapped it. The conclusion still holds because (a) vs (b) shows the same-connection queueing and its absence on the dedicated lane (183 ms vs 3 ms), bbj-ls gives each connection its own workers, and the parse lane is structurally untouched. D-03 sets no millisecond bar and asks only that numbers are recorded, which they are.
2. **Cancel finding recorded as required.** bbj-ls honours `$/cancelRequest` (`-32800` 1-2 ms after the cancel); the client's own `cancelled` outcome is asserted.
3. Review IN-01..IN-07 (stale parser-service doc, timing-dependent live cancel assertion, a production `typeof setNoDelay` branch for the fake socket, cadence keyed on send-time key and kind only, unsanitised parse failure log line, socket leak if `wrapSocket`/`listen` throw, and an `errors` module comment that conflicts with a `vscode-languageserver` import) are cleanup items. None affects a success criterion.
4. `installed-extension-e2e` fails in the full suite because it spawns the pre-phase installed bundle in `~/.ext-test`; this is the known environment failure the orchestrator named and is unrelated to this phase's files.

### Human Verification Required

None. Every success criterion has automated evidence, including a live run against the real service.

### Gaps Summary

No gaps. The phase goal is achieved: the client calls `formatProgram` (document and range) and `denumProgram` over a dedicated connection, answers are validated and typed, parse traffic and the breaker are structurally isolated and proven so by tests and a live measurement, and each method is latched independently per connection. Carry WR-01 and WR-02 forward as work to schedule before or inside Phase 125/126; neither requires a Phase 124 gap-closure to declare the phase done.

---

_Verified: 2026-10-01_
_Verifier: Claude (gsd-verifier)_

## Re-verification after code-review fixes (2026-10-01)

User chose to fix WR-01, WR-02 (deadline per request kind — refined D-07 in CONTEXT), WR-03, WR-04,
IN-01 and IN-06 before closing the phase (commits 7155054b, d5c808d6, d5f3f05f, 4e979432,
3b70444e, 63f43621). Re-checked on the final tree:

- Whole suite (`npx vitest run --maxWorkers=2`): 3986 tests, 0 failed. Only failing suite is the
  known `test/functional/installed-extension-e2e.test.ts` (spawns the separately installed
  `~/.ext-test` bundle built before this phase).
- `npm run build`, `npm run typecheck:test`, `npm run lint`: clean.
- Live `RUN_BBJ_TESTS=1 npx vitest run test/functional/program-live.test.ts` against :5008: 6/6 passed.
- Planning/review-id scan of added src/test lines: clean.
- WR-01 now has a loopback test where the peer destroys the socket mid-request; the request settles
  as `failed/transport` without waiting for the backstop.

Status unchanged: **passed**. Remaining review items IN-02, IN-03, IN-04, IN-05, IN-07 are
informational and left by decision.
