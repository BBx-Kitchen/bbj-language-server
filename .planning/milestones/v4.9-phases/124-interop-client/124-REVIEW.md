---
phase: 124-interop-client
reviewed: 2026-10-01T00:00:00Z
depth: standard
files_reviewed: 16
files_reviewed_list:
  - bbj-vscode/src/language/bbj-parser-service.ts
  - bbj-vscode/src/language/java-interop-connection.ts
  - bbj-vscode/src/language/java-interop-errors.ts
  - bbj-vscode/src/language/java-interop-program-lane.ts
  - bbj-vscode/src/language/java-interop-program-types.ts
  - bbj-vscode/src/language/java-interop.ts
  - bbj-vscode/src/language/java-program-guard.ts
  - bbj-vscode/test/bbj-test-module.ts
  - bbj-vscode/test/fake-interop-peer.ts
  - bbj-vscode/test/functional/program-live.test.ts
  - bbj-vscode/test/java-interop-errors.test.ts
  - bbj-vscode/test/java-interop-program-lane.test.ts
  - bbj-vscode/test/java-interop-program-test-double.test.ts
  - bbj-vscode/test/java-interop-program-wire.test.ts
  - bbj-vscode/test/java-program-guard.test.ts
  - bbj-vscode/test/loopback-jsonrpc-peer.ts
findings:
  critical: 0
  warning: 4
  info: 7
  total: 11
status: issues_found
fixed_in_review_fix:
  - WR-01
  - WR-02
  - WR-03
  - WR-04
  - IN-01
  - IN-06
not_fixed_by_decision:
  - IN-02
  - IN-03
  - IN-04
  - IN-05
  - IN-07
---

# Phase 124: Code Review Report

**Reviewed:** 2026-10-01
**Depth:** standard
**Files Reviewed:** 16
**Status:** issues_found

## Summary

The dedicated format/DENUM lane is well structured. The lane never imports the breaker or the
notification module and never writes the shared generation. The latch key
(`sharedGeneration.laneEpoch`) is captured at send time and re-checked before recording, so a
stale answer cannot decide anything about a replacement connection. The cancel path clears its
timer and listener in a `finally`, and the abandoned `wire` promise is always handled. The guard
builds fresh objects and its UTF-16 / lone-`\r` line math agrees with how bbj-ls computes
positions (`TextPositions.positionAt`). The bbj-ls wire contract (README "JSON-RPC methods") was
cross-checked against the guard and the classifier. I found no contract mismatch.

No BLOCKER was found. The weaknesses are in lane-loss handling (the lost connection is never
disposed, and the test double hides it), a client deadline that is shorter than a legitimate
two-step request, cancellation not being observed while the lane opens, and an incomplete
control-character strip.

I verified the lane-loss behaviour against the installed `vscode-jsonrpc` 8.2.1:
`closeHandler` only moves the state to `Closed` and does not reject pending requests, while
`dispose()` does. `SocketMessageWriter.dispose()` is what destroys the socket.

## Warnings

### WR-01: A lost lane is dropped but never disposed; in-flight requests hang to the 15 s deadline and an error-only loss leaks a live socket

**File:** `bbj-vscode/src/language/java-interop-program-lane.ts:403-405, 424-430`
**Issue:** `onLaneLost` clears `this.lane` and bumps the epoch, but never calls `lane.dispose()`.
In vscode-jsonrpc 8.2.1 a `close` event only sets the connection state to `Closed`. It does not
reject `responsePromises`. Only `dispose()` rejects them with `PendingResponseRejected` and, via
`SocketMessageWriter.dispose()`, destroys the socket. Two consequences:

1. A request in flight when the peer closes the socket (a bbj-ls restart or crash) is not rejected.
   It waits for the full `PROGRAM_REQUEST_TIMEOUT_MS`, then settles as
   `{ kind: 'timeout', origin: 'client' }` with the misleading log text "no answer within 15 s".
   It should fail at once as `failed/transport`.
2. `lane.onError` also routes to `onLaneLost`. In `messageReader.js` a reader error does not close
   the connection (malformed header, a callback exception, a write error). In that case the lane
   is removed from the field but the socket stays open and unreferenced forever. bbj-ls keeps a
   parser and a format worker per TCP connection, so this also leaks server-side workers.

The test double masks this. `FakePeerInteropService.dropConnection` rejects the pending requests
itself with `PendingResponseRejected`, and its doc comment claims this "mirrors what a real socket
close does to in-flight requests". That is not what the real library does on close. No loopback
test drops the socket mid-request, although `ctx.drop()` exists in `loopback-jsonrpc-peer.ts`.
The scaffold at `tools/interop-test-harness/scaffold.ts:116` already uses the correct pattern
(`conn.onClose(() => conn.dispose())`).

**Fix:**
```ts
private onLaneLost(lane: MessageConnection): void {
    if (this.lane !== lane) {
        return;
    }
    this.lane = undefined;
    this.laneEpoch++;
    // Rejects pending requests with PendingResponseRejected (-> failed/transport at once) and
    // destroys the socket. The field is already cleared, so the identity guard keeps any
    // re-entrant close event a no-op.
    lane.dispose();
}
```
Add a loopback test: the peer handler calls `ctx.drop()` mid-request. Expect `failed/transport`
well before `PROGRAM_REQUEST_TIMEOUT_MS`, and expect the next request to open a second socket.
Correct the `dropConnection` comment, or make it model close without a reject. The same
close-without-dispose pattern exists on the parse lane (`onParseLaneLost`) and the shared
connection. That code is outside this phase, but the same fix applies.

### WR-02: The 15 s client deadline is shorter than a legitimate `formatProgram` with `allowDenum` or a request queued on the parser worker

**File:** `bbj-vscode/src/language/java-interop-program-lane.ts:31-37`
**Issue:** The comment says the deadline "sits above the peer's own 10 s format and parse
timeouts, so it only ever fires for a peer that has stopped answering at all". The bbj-ls README
contradicts this. A whole-document `formatProgram` with `allowDenum: true` on a numbered program
runs a DENUM step (bounded by `bbj.interop.parse.timeoutMs`, 10 s) and then a format step (bounded
by `bbj.interop.format.timeoutMs`, 10 s), so a slow but healthy answer can take up to about 20 s.
`denumProgram` and the DENUM step of `formatProgram` also queue behind each other on the
connection's single parser worker. A `formatProgram` queued behind an in-flight DENUM can therefore
exceed 15 s without the peer misbehaving. The client then cancels a request that would have
succeeded and reports a timeout.

**Fix:** Size the backstop to the worst legitimate case, for example two peer step timeouts plus
slack (`PROGRAM_REQUEST_TIMEOUT_MS = 25_000`). Alternatively choose the deadline per request
(`allowDenum === true && range === undefined` gets the longer one). Update the comment to state the
actual reasoning.

### WR-03: A caller cancellation is not observed while the lane is opening (up to 10 s)

**File:** `bbj-vscode/src/language/java-interop-program-lane.ts:196-203, 351-371`
**Issue:** The token is checked before `await this.laneConnection()` and again after it, but it is
not raced against the open. `openSocket` can take up to 10 s to fail (its connect timeout). A user
who cancels a format during that window gets a `cancelled` outcome only after the open settles. The
lane's stated contract is that a cancellation settles "at once". Concurrent same-tick callers that
share `this.connecting` have the same delay.

**Fix:** Race the open against the caller's token:
```ts
const lane = await this.raceCancellation(this.laneConnection(), token); // undefined => cancelled
```
where the helper registers `token.onCancellationRequested`, resolves a sentinel, and disposes its
listener in a `finally`. Do not abort the shared open itself, because other callers use it.

### WR-04: `sanitizePeerText` does not strip all bidi and invisible format characters its contract promises

**File:** `bbj-vscode/src/language/java-program-guard.ts:64-76, 78-94`
**Issue:** The doc comment says "every other C0 and C1 control, DEL and the bidi controls are
removed". `isStrippedControl` covers U+202A-202E and U+2066-2069 only. These stay in the output
(diagnostic messages, invalid-settings text, error messages):
- U+200E and U+200F (LRM, RLM)
- U+061C (ALM)
- U+200B-200D and U+2060-2064 (zero-width and joiner characters)
- U+FEFF
- U+206A-206F (deprecated format controls)
- U+FFF9-FFFB (annotation characters)

The text is documented as safe to show on one line as plain text. A directional mark or an
invisible character can reorder or hide text in a user-facing message.

**Fix:** Extend the predicate, or use a `\p{Cf}` test:
```ts
const FORMAT_CONTROL = /\p{Cf}/u; // covers LRM/RLM/ALM, ZW*, BOM, 206A-206F, FFF9-FFFB
```
This needs a code-point iteration rather than `charCodeAt`, or a global regex replace over the
whole string. Add test cases for each family.

## Info

### IN-01: Stale and contradictory documentation in the parser service

**File:** `bbj-vscode/src/language/bbj-parser-service.ts:149-152, 187-192`
**Issue:**
- `resetIfGenerationChanged`'s doc still references `{@link reportedFailureKinds}`, which this
  change removed (it is now `failureLogCadence`).
- The class doc says an application error "proves the method exists" and latches `'on'`. The code
  does not do that: only a result with an `errors` array calls `latchOn`, and `requestLiveParse`'s
  own doc says no failure shape changes the latch.

**Fix:** Point the link at `failureLogCadence` and align the class doc with the behaviour.

### IN-02: The live cancel test can fail on timing alone

**File:** `bbj-vscode/test/functional/program-live.test.ts:306-316`
**Issue:** The test sleeps 20 ms and then cancels, and asserts `outcome.kind === 'cancelled'`. If
the 9,999-line DENUM finishes first (a fast peer, or one that is already warm), the outcome is
`ok` and the test fails. The raw-connection cancel test next to it correctly records the result
instead of asserting it.

**Fix:** Make the request large enough that completion before the cancel is not plausible, or
accept `ok` and log which one happened. Alternatively cancel as soon as the peer has the request
rather than after a fixed sleep.

### IN-03: Production code carries a branch that exists only for the test double's socket

**File:** `bbj-vscode/src/language/java-interop-program-lane.ts:397-401`
**Issue:** `typeof socket.setNoDelay === 'function'` guards against the fake peer's `{} as Socket`.
Production behaviour is shaped by a test double.

**Fix:** Give the fake socket a no-op `setNoDelay`, or apply `setNoDelay` inside the real
`openSocket`/`createSocket` for the lane only, and drop the production branch.

### IN-04: The failure-log cadence is keyed on the send-time key and on kind only

**File:** `bbj-vscode/src/language/java-interop-program-lane.ts:308-323`
**Issue:**
- `logFailure` calls `syncGeneration(key)` with the key captured when the request was sent. A late
  failure from a replaced connection resets the cadence to the old key. The next failure on the
  current connection resets it again, so one outage can warn twice for the same kind.
- `report(kind, ...)` is not method-scoped, so a `malformed-result` for `formatProgram` consumes
  the warn that a different problem on `denumProgram` would have used. The line names the method,
  but only one warn is emitted.

**Fix:** Skip the log, or log at debug, when `key !== this.currentKey()`. Key the cadence on
`${method}:${kind}` if per-method warns are intended.

### IN-05: The live-parse failure log line is neither sanitised nor bounded

**File:** `bbj-vscode/src/language/bbj-parser-service.ts:247-248, 258-261`
**Issue:** `failure.message` is the raw peer text (`error.message` or `String(error)`). It goes
into the log line unbounded and with control characters and newlines. The new program lane passes
the same classifier output through `sanitizePeerText(…, MAX_PEER_ERROR_LENGTH)` before it logs.
The two consumers of the one shared classifier are now inconsistent, and a peer message containing
line breaks can forge log lines.

**Fix:** Apply the same sanitise-and-bound step to `failure.message` before `logFailure`. Alternatively
sanitise inside `classifyInteropError`, which would also make its doc ("control characters are
stripped later") true in one place.

### IN-06: `openLane` leaks the socket if wrapping or listening throws

**File:** `bbj-vscode/src/language/java-interop-program-lane.ts:402-405`
**Issue:** `wrapSocket(socket)` and `lane.listen()` run outside any try/catch. If either throws,
the socket is neither destroyed nor retired. The exception propagates to `request()`'s catch as a
`transport` failure, with no cool-down and no socket cleanup.

**Fix:** Wrap them. On failure call `socket.destroy?.()`, set the cool-down as the createSocket
failure path does, and return `undefined`.

### IN-07: `java-interop-errors.ts` claims independence from editor imports but imports `vscode-languageserver`

**File:** `bbj-vscode/src/language/java-interop-errors.ts:17-24`
**Issue:** The header says the module is "free of Langium and editor imports", but it imports
`LSPErrorCodes` from `vscode-languageserver`. It only needs the constant `-32800`. The import
pulls the whole language-server package into a module meant to be a light leaf for its consumers.

**Fix:** Define `const REQUEST_CANCELLED = -32800` locally (as the other codes are), or correct
the header.

---

_Reviewed: 2026-10-01_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
