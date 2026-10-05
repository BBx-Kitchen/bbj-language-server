# Phase 124: Interop Client - Research

**Researched:** 2026-10-01
**Domain:** Node/TypeScript JSON-RPC client layer (vscode-jsonrpc 8.2.1) in the Langium language server, talking to bbj-ls on :5008
**Confidence:** HIGH (every structural claim below was read from the files this session; wire behaviour was measured live against the container's :5008)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Carried forward (v4.9 decisions in STATE.md — not re-asked)**
- Hard cut-over: no fallback to `BBjCFCli.jar` or bbjlst denumbering; BBj < 26.03 eventually
  gets a "requires BBj 26.03 or later" message (wording is Phase 125/126).
- bbj-ls is not changed in this milestone; anything it should change is drafted as a bbj-ls issue.
- DENUM and formatting both edit the **open editor buffer in place** — never the file on disk —
  each as one undoable edit; "Denumber and Format" is one request with `allowDenum` and therefore
  one undo step (user re-stated this during the discussion; it is the plan).
  Consequence for this phase: every client call takes the live text as a parameter and never reads
  the file from disk; `FormatProgramParams` carries `allowDenum` (typed, optional) so Phase 126 can
  use it.

**Route (format/DENUM lane)**
- **D-01:** `formatProgram` and `denumProgram` travel over a **third, dedicated connection** (a
  "program lane" for format+DENUM only), opened lazily like the parse lane. The parse lane stays
  exclusive to `parseProgram`; format/DENUM never use it. Rationale: bbj-ls gives each TCP
  connection its own parser and format workers, so DENUM never queues behind a live parse, and
  class-info traffic on the shared reader thread (#692) never delays it.
  — **Reversibility:** costly — the lane bookkeeping, tests and harness measurement are built
  around a separate socket.
- **D-02:** **Commit, then confirm.** Build the dedicated lane now. The live harness measures
  DENUM latency (a) behind a pending parse on the parse lane as the baseline and (b) on the
  dedicated lane while a parse is pending, plus live-parse latency while DENUM runs. The numbers
  and the route decision are recorded in the phase (SUMMARY/VERIFICATION). Change course only if
  the dedicated lane measures worse.
- **D-03:** Acceptance threshold: **no queueing behind parse.** DENUM latency on the dedicated lane
  with a pending parse stays close to its idle latency, and live parse latency is unchanged while
  DENUM runs. Record the numbers; there is no fixed millisecond bar.
- **D-04:** **No fallback** to the shared connection. If the dedicated lane cannot be opened, the
  call returns a typed "not reachable"/unavailable outcome. The breaker is never touched (no
  `connect()` path, no `notifyJavaConnectionError`).
- **D-05:** **Reopen on the next request, with a short cool-down.** A failed open does not latch for
  the whole generation; the next format/DENUM request tries again, rate-limited so a burst of
  format-on-save requests does not hammer :5008.
- **D-06:** **Lane loss resets only its own state.** The format/DENUM lane keeps its own lane
  generation; losing it re-probes only the `formatProgram`/`denumProgram` latches and **never
  bumps the shared `generation`** (live parse verdicts survive — SC2). A shared-generation bump
  (reconnect, `clearCache()`) also resets the format/DENUM latches, so each method is probed again
  on the next connection (SC3).

**Timeout & cancellation**
- **D-07:** **Client backstop above bbj-ls:** a named client deadline of 15 s (bbj-ls's own
  format/parse timeouts are 10 s). On expiry the client **always cancels** (`$/cancelRequest` via
  the token passed to `sendRequest`) — never abandons like `requestClassInfo`'s `Promise.race` —
  and returns a typed `timeout` outcome. Never classified as a transport failure.
- **D-08:** The caller's `CancellationToken` is forwarded to `sendRequest`; a caller cancellation
  and a peer `-32800` both yield a typed `cancelled` outcome, never logged as a failure, never fed
  to any latch or breaker. The live harness checks whether bbj-ls honours `$/cancelRequest` and
  records the finding (open research gap).
- **D-09:** A `-33002` caused by a previous overrunning request is a **plain typed `timeout`**; no
  lane recycling. The dedicated lane already keeps an overrun away from live parse.

**Classifier scope**
- **D-10:** **One shared classifier module** for every bbj-ls code (`-33001`..`-33009`, `-32601`,
  `-32602`, `-32800`, plus transport/`ConnectionError`/breaker-open). `BBjParserService` migrates
  to it **behaviour-identical**: same kind tokens (`parser-exception`, `timeout`, `size-cap`,
  `service-unavailable`, `protected-program`, `transport`, `malformed-result`), same warn-then-debug
  cadence, guarded by the existing `bbj-parser-service.test.ts` / `java-interop-parse-lane.test.ts`.
  — **Reversibility:** reversible.
- **D-11:** **Per-method availability latches live in the interop client** (INT-03), one per
  method: `unknown → available | unavailable`, keyed on lane generation and shared generation
  (D-06). The first real call is the probe (no capability request, no version parsing — the
  `BBjParserService` precedent). `-32601` latches only that method's state `unavailable`; any other
  answer latches `available`. A latched `unavailable` answers immediately without a round trip.
  `-33004` stays a typed `service-unavailable` outcome (not a latch), since it can be transient or
  "closing connection".
- **D-12:** Error `data` becomes a **validated, typed payload**:
  `{kind:'invalid-settings', problems:[{setting,message}]}` for `-33007`,
  `{kind:'mixed-numbering', line}` for `-33008`. Payloads are bounded and sanitised like any peer
  input; malformed `data` still yields the kind with an empty payload. Application errors are
  converted into outcomes, never rethrown (Pitfall 21: rebuilding a `ResponseError` loses `data`).

**Validation bounds (INT-05)**
- **D-13:** **Contract-exact shape check against the request:**
  - whole-document `formatProgram` → `text` present, `edits` absent;
  - range `formatProgram` → `edits` present with 0 or 1 entry, integer non-negative positions,
    inside the document and overlapping the requested lines; `text` absent;
  - `denumProgram` → `text` string, `denumbered` boolean;
  - the echoed `version` must equal the version sent (stale answers rejected here).
  Anything else → typed `malformed-result`; it never reaches an editor.
- **D-14:** **Text size cap, relative and absolute:** returned `text` ≤ 4× request text + 64 KiB,
  and never above 16 MiB. Named constants in the guard module.
- **D-15:** **Diagnostics sanitised `java-peer-guard.ts`-style:** count capped (~500), messages
  truncated and control characters stripped, treated as plain text; lines coerced to integers ≥ 1;
  out-of-range entries dropped individually without failing the whole result.
- **D-16:** A malformed answer is a typed `malformed-result` outcome, logged at warn **once per kind
  per connection generation**, then at debug (the `BBjParserService` cadence). User messages are
  Phase 125/126's job.

### Claude's Discretion
- Module split and names (e.g. a program wire-types file, an error-classifier module, a program
  peer guard alongside `java-peer-guard.ts`), the exact outcome union shape, and the lane's
  bookkeeping fields, within D-01..D-16.
- The exact cool-down length for D-05 and the exact diagnostic count/length caps for D-15.
- Neutral wording for the existing parse-lane warning text if it is shared code.
- How `JavaInteropTestService` scripts the two new methods (it must cover every outcome; see
  Specifics) and how the harness reaches the language server's client for SC1.

### Deferred Ideas (OUT OF SCOPE)
- `canonicalName` choice and per-document serialization to avoid supersession losing a
  format-on-save (Pitfall 7b) — Phase 125 (the client only forwards whatever `canonicalName` the
  caller passes).
- User-facing messages for each outcome ("requires BBj 26.03", invalid settings, mixed numbering,
  timeouts) — Phases 125/126.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| INT-01 | LS can call `formatProgram` (whole + range) and `denumProgram` over :5008 with typed request/response shapes | Wire types, README contract, [LIVE] response shapes (Standard Stack, Code Examples 1-2) |
| INT-02 | Format/DENUM never delays or resets live `parseProgram` diagnostics; routing decided and measured; lane loss never bumps parse generation | Dedicated `ProgramLane` (Pattern 1); [LIVE] measurement table; test shape inverts `java-interop-parse-lane.test.ts:352-380` |
| INT-03 | Each method probed and latched per connection generation on its own | Latch design keyed on (shared generation, lane epoch) (Pattern 3) |
| INT-04 | Every bbj-ls error code classified into a typed outcome; none trips the breaker | Shared classifier (Pattern 4), code table, breaker invariants (Pitfall 2) |
| INT-05 | Responses validated before they reach an editor | Program guard (Pattern 5), bounds, [LIVE] coordinate findings |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

- All commands from `bbj-vscode/`; `npx vitest run <file>` must be run with cwd = `bbj-vscode` (memory: vitest cwd-relative fixtures). `--reporter=basic` does not exist in vitest 4.1.10 [VERIFIED: node_modules/vitest/package.json:4].
- CI gates for the PR: `npm run build`, `npm run lint` (`eslint src test tools/interop-test-harness --max-warnings 0`, package.json:672), `npm run typecheck:test` (`tsc -p tsconfig.test.json --noEmit && tsc -p tsconfig.harness.json --noEmit`, package.json:673), `npm test`. The harness is type-checked at **strict** (`noImplicitAny` on) by `tsconfig.harness.json`.
- Tests: Vitest + `createBBjTestServices` (hermetic; `JavaInteropTestService`), `parseHelper` never `DocumentBuilder.build` (reaches CPL / :5008). No `eslint-disable` directives (a test guards them: `test/eslint-disable-directives.test.ts`).
- Never edit `src/language/generated/`. No grammar change in this phase, so no `langium:generate` (Node 24 breaks it; not needed).
- Shell rules: absolute paths, no chained `cd … && grep|cat|find|sed`, `git -C`, scoped greps; `git add <exact path>` only.
- CONTEXT Specifics: **no planning IDs (D-xx, INT-xx, plan numbers) in source or test comments**; issue numbers are fine. Memory: executors repeatedly violate this; grep the diff before closing.
- Commit helper omits trailers; add `Co-Authored-By` via plain git.
- Hermetic tests must never reach :5008; live tests stay behind `RUN_BBJ_TESTS` (`shouldRunBBjTests()` also auto-detects a peer answering on 5008, `test/test-helper.ts:70-75`) and skip, not fail, on `-32601`.

## Summary

The phase is a pure client-layer addition in `bbj-vscode/src/language/`. The existing parse lane (`java-interop-connection.ts:197-577`) is a good template for lazy open, same-tick promise sharing and identity-guarded close handling, but the new lane differs in four ways that drive most of the design: (1) no fallback to the shared connection and no breaker/`notifyJavaConnectionError` contact; (2) lane loss bumps **only its own epoch**, never the shared `generation` (the parse lane's `onParseLaneLost` does `this.generation++` at line 566 — do **not** copy that); (3) two methods with **independent latches**; (4) a **cancel-always** 15 s backstop instead of `requestClassInfo`'s abandon-race.

The decisive technical finding for D-07/D-08: in vscode-jsonrpc 8.2.1, cancelling the token passed to `sendRequest` **sends `$/cancelRequest` but does not reject the returned promise** — the promise stays pending until the peer answers or the connection is disposed [VERIFIED: node_modules/vscode-jsonrpc/lib/common/connection.js:1043-1081]. bbj-ls does honour the notification and answers `-32800` within milliseconds [LIVE], but a wedged peer would leave the promise pending forever. So the client must (a) cancel via a linked `CancellationTokenSource`, **and** (b) settle its own typed outcome immediately (`timeout` on backstop expiry, `cancelled` on caller cancel) without waiting for the peer's reply, attaching a no-op `catch` to the dangling request promise. That satisfies "always cancels, never abandons" (the peer is told) without hanging the caller.

Live measurement on this container already supports D-01: a small DENUM sent on the **same** connection behind a pending 673 KB parse took ~600 ms, versus 5-57 ms on a **separate** connection; a small parse on connection A during a big DENUM on connection B was unaffected. The planned harness/functional run must re-measure through the real client and record the numbers; the pre-measurements below are the expected shape.

**Primary recommendation:** Build a new `ProgramLane` class (own module, constructed and disposed by `JavaInteropConnection`) that owns the third socket, its epoch, the per-method latches, the cool-down, the backstop and the outcome pipeline (classify → validate), backed by three new leaf modules (`java-interop-program-types.ts`, `java-interop-errors.ts` classifier + cadence, `java-program-guard.ts`); migrate `BBjParserService` to the classifier with a thin collapse-to-legacy-token map so its log tokens stay byte-identical.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Format / DENUM computation | bbj-ls (peer, inside BBjServices) | — | Phase 124 only *calls* it; bbj-ls is not changed |
| Wire types, request/response shape | LS interop client (`src/language/`) | — | Typed contract lives beside `ParseProgramParams` |
| Dedicated third connection, lifecycle | LS interop client (`JavaInteropConnection` → `ProgramLane`) | — | Same layer owns the parse lane and shared socket |
| Per-method availability latch | LS interop client | LS feature layer (Phase 125/126 reads outcome) | D-11: latch is client state keyed on generations |
| Error classification | LS interop client (shared leaf module) | `BBjParserService` consumes it | D-10: one classifier, two consumers |
| Response validation / sanitising | LS interop client (peer guard) | — | INT-05: nothing unvalidated may leave the client |
| Timeout/cancel backstop | LS interop client | LS feature layer supplies the caller token | D-07/D-08 |
| Circuit breaker | Shared connection only (`connect()`) | — | Program lane must never reach it (D-04) |
| User messages | LS feature layer (Phase 125/126) | IDE clients | Out of scope here |
| Live measurement / route record | Test tier (functional test, RUN_BBJ_TESTS) | Phase SUMMARY/VERIFICATION | D-02 |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| vscode-jsonrpc | 8.2.1 (`^8.2.1` in package.json:687; installed 8.2.1) | `RequestType`, `MessageConnection`, `CancellationTokenSource`, `ResponseError`, `ErrorCodes` | Already the interop transport; v9 migration is explicitly out of v4.9 [VERIFIED: node_modules/vscode-jsonrpc/package.json:4; CONTEXT deferred list] |
| vscode-languageserver | 10.0.1 (`LSPErrorCodes.RequestCancelled`) | The `-32800` constant used by `BBjParserService` today | Reuse; do not re-declare the number in two places [VERIFIED: node_modules/vscode-languageserver/package.json:4] |
| vitest | 4.1.10 | Test runner (`vi.useFakeTimers`, `vi.spyOn`) | Project standard [VERIFIED: package.json:704] |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `test/loopback-jsonrpc-peer.ts` | in-repo | Real-socket peer with real framing, per-connection ids | Wire-level tests: `data` preserved, params shape, real `$/cancelRequest` |
| `test/fake-interop-peer.ts` | in-repo | `FakePeerInteropService` — scripted fake `MessageConnection`, `connectionId`, `dropConnection`, `hungConnectionIds` | Lane/latch/generation/breaker tests |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Dedicated lane | Parse lane / shared connection | Rejected by D-01 (locked) |
| Resolve-then-cancel backstop | `Promise.race` abandon | Rejected by D-07; mislabels slow format and poisons next request with `-33002` |

**Installation:** none — no new packages. **Package Legitimacy Audit: not applicable (zero new external packages; `package-legitimacy check` not run).**

## Package Legitimacy Audit

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| (none) | — | — | — | — | — | No packages installed this phase |

**Packages removed due to [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

## Architecture Patterns

### System Architecture Diagram

```
caller (Phase 125/126 handler, harness, live test)
   │  formatProgram(params, token?) / denumProgram(params, token?)
   ▼
JavaInteropService (front: plain delegates, like parseProgram)          src/language/java-interop.ts
   ▼
JavaInteropConnection  ──owns──►  shared connection + breaker + generation   (UNCHANGED semantics)
   │                    ──owns──►  parse lane (parseProgram only)            (UNCHANGED)
   │                    ──owns──►  ProgramLane  ── NEW ──────────────────────────────────────────┐
   │   disconnect() ──► programLane.dispose()                                                      │
   ▼                                                                                               │
ProgramLane.request(method, params, callerToken)                                                  │
   1. token already cancelled?            ──► {kind:'cancelled'}  (no send)                       │
   2. latch[method] === unavailable (for current key)? ──► {kind:'unavailable'}  (no socket)      │
   3. open lane lazily (same-tick shared promise)                                                 │
        open fails ──► cool-down stamp, warn once, ──► {kind:'unavailable', reason:'not-reachable'} │
        cool-down active ──► same outcome, no socket attempt                                      │
   4. linked CancellationTokenSource ◄── caller token   (forwards cancel; settles 'cancelled')    │
      15 s timer ──► cancel source, settle {kind:'timeout'}  (never await the peer)               │
   5. lane.sendRequest(type, params, source.token)   ──────────►  bbj-ls (own parser + format worker)
   6. wire result ──► validate (java-program-guard) ──► {kind:'ok', result} | {kind:'malformed-result'}
      wire error  ──► classify (java-interop-errors)  ──► typed outcome (+ latch update, + log cadence)
      lane close/error ──► laneEpoch++ ; (shared generation NOT touched)                          │
                                                                                                  ┘
BBjParserService ── classifies parse failures through the SAME java-interop-errors module,
                    collapsing every non-legacy kind to the legacy token 'transport'.
```

### Component Responsibilities

| File (new = ★) | Responsibility |
|------|----------------|
| ★ `src/language/java-interop-program-types.ts` | `FormatProgramParams/Result`, `DenumProgramParams/Result`, `ProgramDiagnostic`, LSP `Range/Position/TextEdit` wire shapes, `ProgramOutcome<T>` union, `RequestType` constants |
| ★ `src/language/java-interop-errors.ts` | bbj-ls code constants, `classifyInteropError(e)`, typed `data` extraction (`-33007`/`-33008`), `FailureLogCadence` (warn-first/debug-repeat). **Leaf module** — imports only vscode-jsonrpc/vscode-languageserver and `java-peer-guard.ts`, so `java-interop-connection.ts` and `bbj-parser-service.ts` can both import it without a cycle |
| ★ `src/language/java-program-guard.ts` | Size caps, line-model helper, `validateFormatResult(request, raw)`, `validateDenumResult(request, raw)`, diagnostic sanitiser. No Langium/editor imports (same rule as `java-peer-guard.ts` header) |
| ★ `src/language/java-interop-program-lane.ts` | `ProgramLane` class: socket, lane epoch, latches, cool-down, backstop, outcome pipeline, `dispose()` |
| `src/language/java-interop-connection.ts` | Construct `ProgramLane` with `{createSocket, wrapSocket}` hooks + a `() => this.generation` reader; add `formatProgram`/`denumProgram`; call `programLane.dispose()` from `disconnect()` |
| `src/language/java-interop.ts` | Two delegates beside `parseProgram` (line 229); re-export the new types like `ParseProgramParams` (line 29) |
| `src/language/bbj-parser-service.ts` | Replace `APPLICATION_ERROR_KINDS`/`classifyFailureKind`/`MALFORMED_RESULT_KIND`/`TRANSPORT_KIND` (lines 108-130) and the private cadence (lines 188-190, 283-291) with the shared module |

### Recommended structure
```
bbj-vscode/src/language/
├── java-interop-connection.ts       # + programLane field, 2 methods, dispose in disconnect()
├── java-interop-program-lane.ts     # ★ ProgramLane
├── java-interop-program-types.ts    # ★ wire + outcome types
├── java-interop-errors.ts           # ★ classifier + cadence (leaf)
├── java-program-guard.ts            # ★ validation + sanitising
└── java-interop.ts                  # + 2 delegates, re-exports
bbj-vscode/test/
├── java-interop-errors.test.ts          # ★ classifier table, data payloads
├── java-program-guard.test.ts           # ★ every malformed shape
├── java-interop-program-lane.test.ts    # ★ FakePeer: lane, latch, generation, breaker, backstop
├── java-interop-program-wire.test.ts    # ★ loopback: real framing, data survives, $/cancelRequest
├── functional/program-live.test.ts      # ★ RUN_BBJ_TESTS: SC1 + latency + cancel finding
└── fake-interop-peer.ts, bbj-test-module.ts, loopback-jsonrpc-peer.ts   # extended
```

### Pattern 1: `ProgramLane` skeleton (own epoch, no breaker, no shared generation)

**What:** Mirrors `parseLaneConnection`/`openParseLane` (lines 491-549) for lazy open and promise sharing, with the four differences in the Summary.
**When to use:** every format/DENUM call.

```typescript
// Source: shape derived from java-interop-connection.ts:491-577 (read this session)
export const PROGRAM_REQUEST_TIMEOUT_MS = 15_000;        // client backstop above bbj-ls's 10 s
export const PROGRAM_LANE_REOPEN_COOLDOWN_MS = 5_000;    // discretionary; = INTEROP_BREAKER_INITIAL_COOLDOWN_MS

interface ProgramLaneHooks {
    createSocket(): Promise<Socket>;
    wrapSocket(socket: Socket): MessageConnection;
    sharedGeneration(): number;               // read-only view of JavaInteropConnection.generation
}

export class ProgramLane {
    private lane?: MessageConnection;
    private connecting?: Promise<MessageConnection | undefined>;
    private laneEpoch = 0;                    // bumped on loss and on dispose; NEVER touches shared generation
    private reopenNotBefore = 0;              // Date.now() stamp set by a failed open
    private readonly latches = new Map<ProgramMethod, { key: string; state: 'available' | 'unavailable' }>();

    private currentKey(): string { return `${this.hooks.sharedGeneration()}.${this.laneEpoch}`; }

    private onLaneLost(lane: MessageConnection): void {
        if (this.lane !== lane) return;       // identity guard, as onParseLaneLost
        this.lane = undefined;
        this.laneEpoch++;                     // re-probe both methods; shared generation untouched
    }

    public dispose(): void {                  // called from JavaInteropConnection.disconnect()
        const lane = this.lane;
        this.lane = undefined;                // clear first so the close listener is a no-op
        this.laneEpoch++;
        this.reopenNotBefore = 0;             // a config change must retry immediately
        lane?.dispose();
    }
}
```

Critical rules:
- `openLane` calls `hooks.createSocket()`/`wrapSocket()` only. It must **never** call `hooks.connect()`, never import `notifyJavaConnectionError`, never touch `breakerState` (D-04). A test asserts breaker state and `connectionGeneration` unchanged across an error burst and across lane loss.
- After `createSocket()` resolves, compare `laneEpoch` captured at open start; if it moved (dispose during open), dispose the new connection and return `undefined` (the parse lane does the same with `generation`, lines 542-545).
- A `-32601` answer must **not** dispose the lane (unlike parse, lines 472-478): the other method may still work. The lane stays open; only that method's latch flips.

### Pattern 2: Backstop + cancellation (settle first, never await the peer)

```typescript
// Source: vscode-jsonrpc 8.2.1 connection.js:1043-1081 (cancel sends $/cancelRequest, promise stays pending)
private async send<P, R>(type: RequestType<P, R, null>, params: P, caller?: CancellationToken, lane: MessageConnection): Promise<Settled<R>> {
    const source = new CancellationTokenSource();
    let timedOut = false;
    let callerCancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const link = caller?.onCancellationRequested(() => { callerCancelled = true; source.cancel(); });
    try {
        const wire = lane.sendRequest(type, params, source.token);   // may throw synchronously on a disposed connection
        wire.catch(() => { /* a late -32800 / PendingResponseRejected after we already settled */ });
        const gate = new Promise<'timeout' | 'caller'>(resolve => {
            timer = setTimeout(() => { timedOut = true; source.cancel(); resolve('timeout'); }, PROGRAM_REQUEST_TIMEOUT_MS);
            if (caller) caller.onCancellationRequested(() => resolve('caller'));
        });
        const winner = await Promise.race([wire.then(value => ({ value })), gate]);
        if (winner === 'timeout') return { kind: 'timeout' };
        if (winner === 'caller') return { kind: 'cancelled' };
        return { kind: 'wire-result', value: winner.value };
    } catch (e) {
        if (timedOut) return { kind: 'timeout' };          // our own cancel's -32800 must not read as peer supersession
        if (callerCancelled) return { kind: 'cancelled' };
        return { kind: 'wire-error', error: e };
    } finally {
        if (timer !== undefined) clearTimeout(timer);
        link?.dispose();
        source.dispose();
    }
}
```

Notes the planner must carry into tasks:
- Check `caller?.isCancellationRequested` **before** sending and return `cancelled` without a request (an already-cancelled token would otherwise send `$/cancelRequest` after the request).
- The 15 s backstop test uses `vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })` with the loopback peer (pattern: `test/java-interop-socket.test.ts`, "response that never arrives") or plain `vi.useFakeTimers()` with `FakePeerInteropService` (`hungConnectionIds`).
- `Date.now()` for the cool-down is faked by `vi.useFakeTimers()` defaults — advance time to test the 5 s window.

### Pattern 3: Per-method latch keyed on (shared generation, lane epoch)

- Key = `` `${sharedGeneration}.${laneEpoch}` ``. A stored latch whose key differs from `currentKey()` is treated as `unknown` (lazy reset, the `resetIfGenerationChanged` precedent in `bbj-parser-service.ts:218-230`).
- **Capture the key before the request**; on settle, write the latch only if the captured key is still current (a stale answer from a replaced lane must not latch the new epoch — same reason `latchOn(generation)` takes the generation captured at call start, `bbj-parser-service.ts:243`).
- `-32601` → latch that method `unavailable`; any other answer that proves the method exists (result, any `-3300x`, `-32602`) → `available`. `-32800`, `timeout`, caller `cancelled`, transport failure, malformed-result → **no latch change** (the parse service latches `on` for application errors but not for cancel/transport; mirror exactly: `BBjParserService.requestLiveParse` latches only on a result and on `-32601`; application errors do not latch — see "latch semantics" pitfall below).
- Latched `unavailable` → return `{kind:'unavailable', reason:'method-not-found'}` with **no socket attempt and no request**.
- Shared-generation bumps that reset latches: `establishConnection` (line 342), `resetBreaker` (line 425, via `clearCache()`), and — as an existing side effect — `onParseLaneLost` (line 566). All are fine per D-06 (a spurious re-probe is cheap).

### Pattern 4: Shared classifier (`java-interop-errors.ts`)

Code table (verbatim from `bbj-ls/README.md` "Error codes", read this session): `-33001` `ERROR_PARSE_FAILED`, `-33002` `ERROR_TIMEOUT`, `-33003` `ERROR_TOO_LARGE`, `-33004` `ERROR_SERVICE_UNAVAILABLE`, `-33005` `ERROR_PROTECTED_PROGRAM`, `-33006` `ERROR_DENUM_NEEDED`, `-33007` `ERROR_INVALID_SETTINGS` (data `[{setting, message}]`), `-33008` `ERROR_MIXED_NUMBERING` (data `{line}`), `-33009` `ERROR_FORMAT_FAILED`, `-32602` `ERROR_INVALID_PARAMS`, `-32800` `RequestCancelled`; `-32601` is JSON-RPC MethodNotFound (`ErrorCodes.MethodNotFound = -32601`, `ErrorCodes.InvalidParams = -32602`, `ErrorCodes.PendingResponseRejected = -32097` [VERIFIED: node_modules/vscode-jsonrpc/lib/common/messages.js:17-18,44]).

Suggested kind tokens (planner may rename, Claude's discretion): legacy seven (`parser-exception`, `timeout`, `size-cap`, `service-unavailable`, `protected-program`, `transport`, `malformed-result`) plus `denum-needed`, `invalid-settings`, `mixed-numbering`, `format-failed`, `invalid-params`, `method-not-found`, `cancelled`.

Rules:
1. **Duck-type on `code`**, never `instanceof ResponseError`: the existing tests reject plain objects (`Promise.reject({ code: -32601 })` in `test/fake-interop-peer.ts:168,171`, `test/java-interop-connection.test.ts:43`) and `JavaInteropTestService` throws real `ResponseError`s; both must classify identically. Read `(e as {code?: number})?.code` and `.data` / `.message`.
2. `cancelled` (`-32800`) is checked first (parse service does this at `bbj-parser-service.ts:264`).
3. Any other/absent code (plain `Error`, `InteropTransportError` incl. "circuit open", `ConnectionError`, `PendingResponseRejected`, `-32603`, anything unknown) → `transport`.
4. **Behaviour-identical migration trap:** the parse service today logs token `transport` for *every* code outside `-33001..-33005` (including `-32602`, `-33006..-33009`). A richer classifier would change that token for those codes. Keep the log tokens byte-identical by mapping in `BBjParserService`: kinds in {`parser-exception`,`timeout`,`size-cap`,`service-unavailable`,`protected-program`} pass through; everything else (except `cancelled`/`method-not-found`, handled before logging) logs as `transport`. Guard tests: `bbj-parser-service.test.ts:827-1056` (each token asserted via `warnSpy.mock.calls[0][0]` `toContain(kind)`, cadence, re-arm after success, no document text in any log level) and `java-interop-parse-lane.test.ts` (all).
5. Typed `data` (D-12): `-33007` → `problems` = array entries that are plain objects with string `setting`/`message`; cap the count (settings map is capped at 64 entries by bbj-ls, so a cap of 64 loses nothing real), truncate/strip each with the guard helpers; non-array/garbage → `problems: []`. `-33008` → `line` integer ≥ 1 else `undefined`. Build **fresh objects** from validated fields; never spread or assign the peer's object (prototype-pollution / unexpected-key hygiene).
6. `FailureLogCadence`: extract the `reportedFailureKinds` set + generation reset + `logger.warn`-first/`logger.debug`-repeat from `BBjParserService` (lines 188-190, 218-230, 283-291) into the shared module; both consumers instantiate it. Keep the message prefix configurable (parse keeps `Live compiler diagnostics: request failed (${kind}): ${message}`; the program client uses neutral wording). Never include request text in any line (existing test at `bbj-parser-service.test.ts:1030-1055` and `java-interop-parse-lane.test.ts:112-131` pin this).

### Pattern 5: Program guard (`java-program-guard.ts`)

Named constants (values D-14/D-15; exact diagnostic caps are Claude's discretion):
```typescript
export const PROGRAM_TEXT_RELATIVE_FACTOR = 4;
export const PROGRAM_TEXT_SLACK = 64 * 1024;                 // 64 KiB
export const PROGRAM_TEXT_ABSOLUTE_CAP = 16 * 1024 * 1024;   // 16 MiB
export const MAX_PROGRAM_DIAGNOSTICS = 500;
export const MAX_PROGRAM_DIAGNOSTIC_MESSAGE_LENGTH = 1024;   // = MAX_PEER_ERROR_LENGTH (java-peer-guard.ts:48), reuse truncateText
export const MAX_ORIGINAL_LINE_NUMBER_LENGTH = 32;
export const MAX_FORMAT_PROBLEMS = 64;
```
`allowedTextLength(requestText) = min(requestText.length * 4 + 65536, 16 MiB)`; compare in UTF-16 code units (`.length`) for both sides — document the unit (peer sizes are UTF-8 bytes; UTF-16 length ≤ UTF-8 bytes, so the sanity bound is never stricter than intended). Apply the same cap to `edits[0].newText`.

Validation rules to implement (all derived from D-13 + [LIVE] findings):
- Result must be a plain object (`typeof === 'object'`, non-null, not array).
- **Version echo:** `result.version === request.version` (strict string equality). Live: bbj-ls echoes the string verbatim (`'v-whole'` → `'v-whole'`); when `version` is *omitted* the result has no `version` key, but this client always sends one [LIVE].
- Whole-document `formatProgram` (request has no `range`): `typeof text === 'string'`, within cap, and `edits` is `undefined` or `null` (treat JSON `null` as absent; README says absent fields are omitted, never `null`, so leniency costs nothing). Else malformed.
- Range `formatProgram`: `text` absent; `edits` is an array of length 0 or 1; each `edit.range.start/end` has integer, non-negative `line`/`character`, `start ≤ end`, **inside the sent document** (`line ≤ lastLine`, `character ≤ lineLength(line)`, lines split on `\n`, `\r\n`, lone `\r` — see Pitfall 5), `newText` a string within the cap, and the edit's line span **overlaps** the requested line span.
- `denumProgram`: `typeof text === 'string'` within cap, `typeof denumbered === 'boolean'`.
- `denumbered` on a `formatProgram` result: not listed in D-13; recommended: absent → `false`, present non-boolean → malformed (discretion; live always sends it).
- `diagnostics`: absent/`null` → `[]`; present non-array → malformed; otherwise sanitise entry-by-entry (below).
- Return a **fresh typed object** assembled from validated fields; never hand back the peer object.

Diagnostic sanitising (D-15): cap `MAX_PROGRAM_DIAGNOSTICS`; per entry require plain object; `message` string → strip control chars, `truncateText(…, MAX…)`; `severity` ∈ {`ERROR`,`WARNING`,`INFO`} (README Types table) else drop the entry; `originalLineNumber` string (≤32) else `''`; **`line`: see Open Question 1 — `0` is a legitimate wire value ("0 when BBj gave none", README Types), so it must be kept as "no location", not coerced to 1 and not dropped**; non-integer / negative / > line count of the result's own text → drop that entry only.
Strip set (discretionary, consistent with `java-peer-guard.ts`'s concern for hidden text): C0/C1 controls, `U+2028/2029`, and bidi overrides `U+202A-202E`, `U+2066-2069`; replace line breaks with a space so a message stays one line.

### Anti-Patterns to Avoid
- **Copying `onParseLaneLost`'s `this.generation++`** into the program lane (violates SC2 / D-06).
- **Calling `hooks.connect()` as a fallback** (violates D-04; opens/uses the breaker).
- **Awaiting the request promise after cancel** — it never settles on a silent peer (8.2.1 semantics).
- **`Promise.race` + timer that does not cancel** (`requestClassInfo`, lines 401-412) — D-07 forbids it.
- **Rethrowing application errors** or wrapping them in `InteropTransportError` — `isInteropTransportFailure` would then classify them as outage and the class cache would stop caching (Pitfall 9).
- **Disposing the lane on `-32601`** — the other method shares the lane.
- **Passing the peer object through** (`return raw as FormatProgramResult`) — defeats INT-05.
- **Logging request text** or echoing peer strings unsanitised into logs.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Cancel linking | A manual flag/promise dance | `CancellationTokenSource` + `caller.onCancellationRequested` | Emits `$/cancelRequest` through the connection's own strategy |
| JSON-RPC framing / `data` preservation | Custom socket framing | Real `createMessageConnection` (`createSocketMessageConnection`) | `ResponseError.data` survives; Pitfall 21/20 |
| Truncation with surrogate safety | New truncate function | `truncateText` / `TRUNCATION_MARKER` from `java-peer-guard.ts` | Never splits a surrogate pair (lines 94-103) |
| Warn-then-debug cadence | A second copy | Extract once into `java-interop-errors.ts` | Two copies drift; D-10 requires identical behaviour |
| Loopback server for wire tests | A new net server | `startLoopbackPeer` (extend with `ctx.token` + a cancellations list) | Shared infra already used by harness tests |
| Line splitting in guard | `text.split('\n')` | A small shared helper handling `\n`, `\r\n`, lone `\r` | bbj-ls treats lone `\r` as a line break [LIVE] |

**Key insight:** every piece of this phase has a precedent in the parse path; the only genuinely new mechanics are the separate epoch/latch bookkeeping and the settle-first cancel. Reuse, then isolate.

## Common Pitfalls

### Pitfall 1: Cancel does not reject the client promise (8.2.1)
**What goes wrong:** Code `await`s the request after `source.cancel()` expecting an immediate `-32800`/`Canceled`; against a hung peer it never returns.
**Why:** `sendRequest`'s cancel listener only calls `cancellationStrategy.sender.sendCancellation` (a `$/cancelRequest` notification, connection.js:1046-1048); the promise is rejected only by a response, a write error, or dispose.
**How to avoid:** Pattern 2 (settle first). **Warning signs:** a backstop test that passes only because the fake peer rejects `Error('Canceled')` on cancel (`fake-interop-peer.ts:150-153` does exactly that — real vscode-jsonrpc does not). Cover the real behaviour with the loopback peer.

### Pitfall 2: Breaker / generation coupling creeping back in
**What goes wrong:** An outcome path calls `isInteropTransportFailure`, throws `InteropTransportError`, or uses `connect()`; or lane loss bumps `generation`.
**How to avoid:** the lane receives only `createSocket`/`wrapSocket` hooks plus a read-only generation accessor. Test (SC4): script 20 application errors across all codes, then assert `connectionGeneration` unchanged, `interop.sentRequests` for `getClassInfo` still answered, class completion/hover tests still pass (use the existing `getRawClass` access pattern from `java-interop-parse-lane.test.ts:29,42-44`).

### Pitfall 3: Latch semantics diverge from the parse precedent
**What goes wrong:** Latching `available` on an *application error* is specified by D-11 ("any other answer latches available") but `BBjParserService` actually latches `on` only on a **result** (`requestLiveParse` calls `latchOn` after a valid `errors` array, line 257) and not on an application error, despite the class doc comment saying otherwise (lines 168-172). D-11 is locked — follow D-11 for the new latches (application error ⇒ method exists ⇒ `available`), and do **not** "fix" the parse service as part of the migration (behaviour-identical).
**How to avoid:** unit-test the latch table explicitly: result/`-33001..-33009`/`-32602` ⇒ `available`; `-32601` ⇒ `unavailable`; `-32800`, timeout, transport, malformed ⇒ unchanged.

### Pitfall 4: Cancel frees the client but not the peer worker
**What goes wrong:** [LIVE] after cancelling a big DENUM, a small DENUM on the **same** connection took 252-766 ms (the worker was still finishing the cancelled job), versus ~84 ms normally. A tight cancel/retry loop on one lane queues behind its own cancelled work; bbj-ls also answers `-33002` for a request that "arrived while a previous request on this connection was still overrunning" (README).
**How to avoid:** this is exactly what D-09 accepts (plain `timeout`, no recycling). Test that a `-33002` yields `timeout` and does not change any latch. Do not add lane recycling. Note for Phase 125: per-document serialization matters.

### Pitfall 5: Range validation stricter than the peer
**What goes wrong:** A legitimate edit rejected as malformed (user's format silently fails). [LIVE] findings to build the validator against:
- text `'if a then print 1\n  x=1\nrem y\n'`, request range `(0,0)-(2,0)` → one edit `(0,0)-(2,0)`, `newText` ending `\n`;
- no trailing newline `'if a then print 1\n  x=1'`, range `(0,0)-(1,5)` → edit `(0,0)-(1,5)`;
- request `end.line = 99` (past the document) → edit end clamps to `(2,0)` for a 3-line model (`'…\n…\n'` has lines 0,1,2; line 2 is empty);
- CRLF text → edit `(0,0)-(2,0)`, `newText` keeps `\r\n`; lone-CR text → `(0,0)-(2,0)`, `newText` keeps `\r`;
- unchanged range → `edits: []`.
So `lastLine = number of line terminators` (CR, LF, CRLF each one), `character ≤ length of that line excluding terminator`.
**Overlap:** compute inclusive line spans for both the request and the edit, treating an end at `character 0` with `end.line > start.line` as excluding that last line (README: "an end at character 0 excludes that line"); count **touching/intersecting** as overlap. The peer expands to whole logical statements (`:` continuations), so the edit may be *larger* than the request — require intersection, never containment. Test a zero-width request range (cursor) on a line.

### Pitfall 6: `ProgramDiagnostic.line === 0`
README Types: `line` is "1-based line in the response's own `text`, or `0` when BBj gave none". D-15 says "lines coerced to integers ≥ 1". Coercing `0 → 1` invents a location; dropping loses the message. See Open Question 1.

### Pitfall 7: Fake test doubles hide the contract
`JavaInteropTestService` defaults `parseProgram` to `method-not-found`; copying that default for the new methods yields suites that never exercise success. Default the new scripts to a **valid success** echo, and give every non-success outcome an explicit script value (Pitfall 20). Malformed scripts must run through the **real validator** (see Test-double design) or they prove nothing.

### Pitfall 8: Unhandled rejection from the dangling request
After the backstop or caller cancel settles the outcome, the peer's late `-32800` (or `PendingResponseRejected` on dispose) rejects the abandoned `sendRequest` promise. Always attach `wire.catch(() => {})` immediately (precedent: `requestClassInfo` line 407). A vitest run fails on unhandled rejections.

### Pitfall 9: Sequential request floor of ~82 ms (delayed ACK)
[LIVE] a sequence of small requests on one connection each took ~82 ms; with `socket.setNoDelay(true)` on the client socket, ~42 ms (both numbers: format and parse). This is Phase 125's format-on-save budget concern. Optional, low-risk mitigation scoped to the new lane only: after `hooks.createSocket()` resolves, `if (typeof socket.setNoDelay === 'function') socket.setNoDelay(true)` — the fake peer's socket is `{} as Socket` (`fake-interop-peer.ts:114`), so the guard is mandatory. Changing `openSocket()` for all connections is out of scope. See Open Question 2.

## Code Examples

### Wire types (shapes confirmed live and from README Types table)
```typescript
// Source: bbj-ls/README.md "Types" + [LIVE] probe 2026-10-01
export interface Position { line: number; character: number }       // 0-based, UTF-16 code units
export interface Range { start: Position; end: Position }
export interface TextEdit { range: Range; newText: string }
export type ProgramSeverity = 'ERROR' | 'WARNING' | 'INFO';
export interface ProgramDiagnostic { line: number; originalLineNumber: string; severity: ProgramSeverity; message: string }

export interface FormatProgramParams {
    text: string;
    version: string;                       // always sent; echo is verified
    canonicalName?: string;                // forwarded as given (Phase 125 decides the value)
    settings?: Record<string, string | number | boolean>;   // never null values: peer answers -33007 "unknown value null"
    allowDenum?: boolean;
    range?: Range;
}
export interface FormatProgramResult { text?: string; edits?: TextEdit[]; diagnostics: ProgramDiagnostic[]; denumbered: boolean; version: string }
export interface DenumProgramParams { text: string; version: string; canonicalName?: string }
export interface DenumProgramResult { text: string; diagnostics: ProgramDiagnostic[]; denumbered: boolean; version: string }

export const formatProgramRequest = new RequestType<FormatProgramParams, unknown, null>('formatProgram');
export const denumProgramRequest = new RequestType<DenumProgramParams, unknown, null>('denumProgram');
// Result generic is `unknown` on purpose: the raw wire value is validated before it becomes a typed result.
```
Optional fields must be **omitted**, never `null` (README Connection). `JSON.stringify` drops `undefined` automatically; just never assign `null`.

### Outcome union (suggested; names are discretionary)
```typescript
export type ProgramFailureKind =
    | 'parser-exception' | 'timeout' | 'size-cap' | 'service-unavailable' | 'protected-program'
    | 'denum-needed' | 'format-failed' | 'invalid-params' | 'transport' | 'malformed-result';

export type ProgramOutcome<R> =
    | { kind: 'ok'; result: R }
    | { kind: 'cancelled' }                                                      // caller cancel or peer -32800; never logged, never latched
    | { kind: 'timeout'; origin: 'client' | 'peer' }                              // 15 s backstop or -33002
    | { kind: 'unavailable'; reason: 'method-not-found' | 'not-reachable' }       // latch or failed/cooling-down lane open
    | { kind: 'invalid-settings'; problems: Array<{ setting: string; message: string }> }
    | { kind: 'mixed-numbering'; line: number | undefined }
    | { kind: 'failed'; failure: ProgramFailureKind; code?: number; message: string }
    | { kind: 'malformed-result'; reason: string };
```
(`-33004` ⇒ `failed`/`service-unavailable`, deliberately **not** `unavailable` — D-11.)

### Test double design (resolves the "malformed must hit the real validator" tension)
- **`JavaInteropTestService`** (used by every `createBBjTestServices` suite, so Phases 125/126 inherit it): add `scriptFormatProgram(script)` / `scriptDenumProgram(script)`. A script is one of: a *wire result* (`unknown`), a *wire error* `{code, message, data?}`, `'method-not-found'`, `'transport-error'`, or `{ outcome: ProgramOutcome }` (escape hatch, e.g. a `timeout`). The override feeds wire results/errors through the **same exported pure functions** the lane uses (`validateFormatResult`, `classifyInteropError`), so a scripted malformed result becomes `malformed-result` exactly as in production. **Default script = a valid success echo** (whole doc: `text` = request text; range: `edits: []`; denum: `denumbered: false`, `text` = request text; `version` echoed). Never touches `connect()`/sockets. Latch behaviour is *not* emulated here (covered with the fake peer).
- **`FakePeerInteropService`**: add `formatProgramMethodMissing` / `denumProgramMethodMissing` booleans beside `parseProgramMethodMissing` (line 77), `formatProgram`/`denumProgram` cases in `handleSendRequest` (default echo-valid answers), and a generic `answerWith(method, (params, connectionId) => unknown | Promise<unknown>)` override so a test can return an error object `{code, message, data}` (rejected like the existing `Promise.reject({ code: -32601 })`). Record cancellations (`cancelledRequests`) by registering `token.onCancellationRequested` for every request, not only hung ones.
- **`loopback-jsonrpc-peer.ts`**: the star `conn.onRequest((method, params) => …)` also receives the request's `CancellationToken` as the last argument; expose it as `ctx.token` and add a `cancellations` record (additive; `interop-harness-fake-peer.ts` wraps it and ignores new fields). Needed to assert a real `$/cancelRequest` arrives and that error `data` survives real framing.

## Live Findings (all [LIVE] unless noted; container :5008, single runs, 2026-10-01)

**Shapes and codes (confirmed against README):**
| Call | Result |
|------|--------|
| `formatProgram` whole, unnumbered | keys `text, diagnostics, denumbered, version`; `edits` absent; version echoed verbatim |
| `formatProgram` range | keys `edits, diagnostics, denumbered, version`; `text` absent |
| `formatProgram` range, already formatted | `edits: []` |
| `denumProgram` numbered `0010 print 1\n0020 goto 0010\n` | `denumbered: true`, text `L10: print 1\ngoto L10\n` |
| `denumProgram` unnumbered | `denumbered: false`, text unchanged |
| `denumProgram` with a syntax error in numbered source | success with `diagnostics: [{line:1, originalLineNumber:"0010", severity:"ERROR", message:"syntax error"}, …]` |
| `denumProgram` mixed numbering | `-33008`, `data: {line: 2}`, message "mixed line numbering: line 2 has no line number" |
| `formatProgram` numbered, `allowDenum` absent | `-33006` |
| `formatProgram` `{indentWidth: 2.5, bogus: 'x'}` | `-33007`, `data: [{setting:"indentWidth", message:…}, {setting:"bogus", message:"unknown setting; allowed: …15 keys incl. splitSingleLineIf"}]` |
| `formatProgram` mixed + `allowDenum:true` | `-33008`, `data: {line: 2}` |
| `denumProgram {}` / bad range (start after end) | `-32602` ("text is required" / "range.start must not be after range.end") |
| unknown method | `-32601` "Unsupported request method: …" |
| 4.4 MB text | `-33003`; the **same connection** answers a small request normally right after |
| empty text | success (`text: ''`, `denumbered: false`) |
| `version` sent as number `12` | echoed as string `"12"` (irrelevant: client always sends a string) |
| `version` omitted | result has **no** `version` key |

Every error was a real `ResponseError` (`ctor: ResponseError`) with `code`/`message`/`data` intact over a real `createMessageConnection`.

**Cancellation (answers the D-08 open research gap):** bbj-ls **honours `$/cancelRequest`**: a cancelled `denumProgram`, `parseProgram` and `formatProgram` each settled with `-32800` "The request (id: N, method: 'denumProgram') has been cancelled" within 9-88 ms of the cancel. The connection stayed healthy (a parse right after was fine). **Caveat:** the peer worker keeps running the cancelled job — the next small DENUM on the same connection took 252-766 ms (queued behind the cancelled work).

**Latency / routing (D-02, D-03 pre-measurement; the phase must re-measure through the real client):**
| Scenario | Result |
|----------|--------|
| small DENUM idle, sequential, default socket | ~52-85 ms (≈82 ms floor); first call on a fresh connection 5 ms |
| big DENUM idle (9,999 numbered lines, 375 KB) | 280-476 ms |
| big parse idle (20,000 lines, 673 KB) | 546-684 ms |
| small DENUM **behind a pending big parse, SAME connection** | 594-628 ms (queued behind the parse) |
| small DENUM while a big parse is pending, **SEPARATE connection** | 5-57 ms |
| big DENUM behind big parse, same vs separate | 796 ms vs 318 ms |
| small parse (conn A) while a big DENUM runs (conn B) | 42-84 ms, equal to idle (no queueing) |
| small `formatProgram` behind a pending big parse, same connection | 43-82 ms (format worker is separate — README) |
| sequential small requests, default socket | ~82 ms each; with `setNoDelay(true)` ~42 ms |

Conclusion for the route record: the dedicated lane eliminates the parse-queueing penalty (≈600 ms → ≈5-57 ms) and does not slow parse; D-01 is supported by data. The functional test must reproduce this through the client and write the numbers into SUMMARY/VERIFICATION.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Spawn Java `BBjCFCli.jar` / `bbjlst` for format/denumber | bbj-ls `formatProgram`/`denumProgram` over :5008 | bbj-ls built 2026-09-30 (memory/PITFALLS evidence) | This phase builds the client; removal is Phase 127 |
| Race-with-timer abandon (`requestClassInfo`) | Cancel-always backstop | D-07 | Prevents `-33002` poisoning |
| Single latch for "endpoint" | Per-method latches | D-11 | `parseProgram` working ≠ `formatProgram` working (different bbj-ls ship dates) |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | 5 s is a reasonable program-lane reopen cool-down | Pattern 1 | Too long delays recovery after a BBjServices restart; too short hammers :5008 (D-05 leaves the number to discretion) |
| A2 | Diagnostic caps (500 entries, 1024-char messages, 32-char `originalLineNumber`) are adequate | Pattern 5 | Real DENUM output truncated (D-15 leaves caps to discretion); live DENUM of a 9,999-line file produced only small diagnostics |
| A3 | Stripping bidi overrides (U+202A-202E, U+2066-2069) and U+2028/2029 in addition to C0/C1 is desirable | Pattern 5 | Over-stripping a legitimate message (very unlikely; messages are BBj compiler text) |
| A4 | Dropping a diagnostic with an unrecognised `severity` is better than coercing it | Pattern 5 | A new bbj-ls severity would silently vanish; alternative is coercing to `INFO` |
| A5 | Treating JSON `null` like an absent `edits`/`text`/`diagnostics` is safe leniency | Pattern 5 | A peer sending `null` is technically off-contract; leniency only avoids false rejections |
| A6 | `setNoDelay(true)` on the program lane socket is safe and worthwhile | Pitfall 9 | None observed; measured only on the dev container |
| A7 | Latency numbers are representative of customer machines | Live Findings | They are single runs on one dev container; record as evidence, not as a bar (D-03 has no fixed ms bar) |
| A8 | A peer worker occupied by a cancelled job still blocks later same-lane requests on all peers/versions | Pitfall 4 | Only observed on this dev build (BBj 26.03 dev); D-09 handles it either way |

## Open Questions

1. **`ProgramDiagnostic.line === 0` vs D-15 "lines coerced to integers ≥ 1"**
   - What we know: README Types: `line` is "`0` when BBj gave none"; PITFALLS Pitfall 6 says map `0` to "no location".
   - What's unclear: whether D-15's coercion intends `0 → 1`.
   - Recommendation: keep legitimate `0` as `line: undefined` ("no location") in the typed `ProgramDiagnostic`; coerce/drop only non-integers, negatives and lines past the result text. State this in the plan so the executor does not turn `0` into `1`. Needs a one-line confirmation from the user only if they object.
2. **Should the program lane set `TCP_NODELAY`?**
   - Known: [LIVE] halves per-request latency (82 → 42 ms) for sequential small requests; matters for Phase 125's format-on-save budget.
   - Unclear: whether touching socket options is in the user's "keep lean" scope for this phase.
   - Recommendation: include it (one guarded line in `openLane`) and record the measurement; drop it if the user prefers zero extra behaviour.
3. **Harness vehicle (SC1/SC2 live cases).** The 17-case CLI harness is raw-socket and has no `skip` status (`TestStatus = 'pass'|'fail'|'error'`, `types.ts:54`); a live peer older than 26.03 would make new cases `error` and fail its gate, and `test/interop-harness.test.ts` hard-codes the 17 case names, `matrixRows` length 9 and per-case loops (`1..17`). Recommendation: do **not** extend the gate list; put the live cases in `test/functional/program-live.test.ts` using the real client (`createBBjServices(NodeFileSystem)` + `setConnectionConfig('127.0.0.1', 5008)`, the pattern at `test/functional/parse-program-live.test.ts:45-51`), with a raw-connection baseline via the harness's own `connect()` from `tools/interop-test-harness/scaffold.ts`. If the planner still wants harness-CLI cases, they need a `skip` status plumbed through `types.ts`, `gate.ts`, `report*.ts` and `interop-harness*.test.ts` — materially more churn.
4. **Residual risk of D-09 (no lane recycling).** If a peer wedges *and* ignores cancel, every request on the program lane times out at 15 s until the lane drops. Accepted by D-09; mention in VERIFICATION notes only.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node | build/test | ✓ | v24.20.0 (shell default) | Node 22 only needed for `langium:generate`, not this phase |
| vscode-jsonrpc | client | ✓ | 8.2.1 | — |
| vitest | tests | ✓ | 4.1.10 | — |
| Live bbj-ls on 127.0.0.1:5008 (+ MCP :5009) | live functional test, route measurement | ✓ listening (java pid 3838179) and answering `formatProgram`/`denumProgram`/`parseProgram` | BBj 26.03 dev build (per task brief; the exact build string was not read) | Hermetic suites (fake/loopback peers) cover everything but the live numbers; live test skips when `shouldRunBBjTests()` is false |
| `RUN_BBJ_TESTS=1` | `npm run test:bbj` | ✓ (env flag; auto-detect also probes 5008) | — | — |

**Missing dependencies with no fallback:** none.
**Environment caution:** MEMORY notes that fresh BBj ships its own `bbj-ls.jar` root-owned; do not attempt to modify bbj-ls or BBjServices (task rule). The scratch probe script used for this research was created inside `bbj-vscode/` and deleted afterwards (git status clean except the pre-existing `.planning/config.json` modification).

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest 4.1.10 |
| Config file | `/home/coder/repos/bbj-language-server/bbj-vscode/vitest.config.ts` (`include: ['test/**/*.test.ts']`) |
| Quick run command | `cd /home/coder/repos/bbj-language-server/bbj-vscode && npx vitest run test/java-interop-program-lane.test.ts` |
| Full suite command | `cd /home/coder/repos/bbj-language-server/bbj-vscode && npm test` (judge on `numFailedTests`; use `--maxWorkers=2` under contention; local whole-suite baseline carries pre-existing interop failures per memory) |
| Typecheck / lint | `npm run typecheck:test`, `npm run lint` (both are CI gates) |
| Live | `cd /home/coder/repos/bbj-language-server/bbj-vscode && RUN_BBJ_TESTS=1 npx vitest run test/functional/program-live.test.ts` |

### Phase Requirements → Test Map
| Req / SC | Behavior | Test Type | Automated Command | File Exists? |
|----------|----------|-----------|-------------------|-------------|
| INT-01 / SC1 | whole + range `formatProgram` and `denumProgram` return typed results through the client (fake peer) | unit | `npx vitest run test/java-interop-program-lane.test.ts` | ❌ Wave 0 |
| INT-01 / SC1 | same three calls against the live peer through the LS client | live (gated) | `RUN_BBJ_TESTS=1 npx vitest run test/functional/program-live.test.ts` | ❌ Wave 0 |
| INT-01 | params reach the wire with optional fields omitted (no `null`), real framing, `data` intact | integration (loopback) | `npx vitest run test/java-interop-program-wire.test.ts` | ❌ Wave 0 |
| INT-02 / SC2 | program traffic uses a connection id distinct from the parse lane and the shared connection; parse still answered while format/DENUM hung | unit | `npx vitest run test/java-interop-program-lane.test.ts` | ❌ Wave 0 |
| INT-02 / SC2 | losing the program lane leaves `connectionGeneration` unchanged and a stored verdict state (`setVerdictState`/`getVerdictState`) intact after `BBjParserService.isEnabled()` — inversion of `java-interop-parse-lane.test.ts:352-380` | unit | same file | ❌ Wave 0 |
| INT-02 / SC2 | DENUM latency behind pending parse (parse-lane baseline vs dedicated lane) and parse latency during DENUM measured and logged | live (gated) | `RUN_BBJ_TESTS=1 npx vitest run test/functional/program-live.test.ts` | ❌ Wave 0 |
| INT-03 / SC3 | `-32601` on `formatProgram` only keeps `denumProgram` and live parse working, and vice versa; a latched `unavailable` sends no request and opens no socket | unit | `npx vitest run test/java-interop-program-lane.test.ts` | ❌ Wave 0 |
| INT-03 / SC3 | latches reset on `simulateReconnect`/`_connectionGeneration` bump, on `clearCache()`, and on lane loss; each method is probed again | unit | same file | ❌ Wave 0 |
| INT-04 / SC4 | classifier table: every code → kind; `-33007`/`-33008` typed data; malformed `data` → empty payload; plain-object and `ResponseError` rejections classify identically | unit | `npx vitest run test/java-interop-errors.test.ts` | ❌ Wave 0 |
| INT-04 / SC4 | burst of application errors: `connectionGeneration`, breaker (`getRawClass` still resolves, no `circuit open`), live-parse latch unchanged; `getRawClass`-backed class lookup still works | unit | `npx vitest run test/java-interop-program-lane.test.ts` | ❌ Wave 0 |
| INT-04 | lane open refused → typed `unavailable`, no `notifyJavaConnectionError` (spy on `showErrorMessage`), cool-down suppresses a second socket attempt within the window, retry after it | unit (fake timers) | same file | ❌ Wave 0 |
| INT-04 / D-07/08 | backstop: pending past 15 000 ms ⇒ `timeout`, cancellation recorded, never `transport`; caller cancel ⇒ `cancelled`, not logged; `-32800` ⇒ `cancelled`; `-33002` ⇒ `timeout` | unit + loopback | program-lane + program-wire files | ❌ Wave 0 |
| INT-04 | classifier migration behaviour-identical | regression | `npx vitest run test/bbj-parser-service.test.ts test/java-interop-parse-lane.test.ts test/live-parse-interleaving.test.ts` | ✅ exist |
| INT-05 / SC5 | each malformed shape → `malformed-result`: both/neither `text`/`edits`, whole-doc with `edits`, range with `text`, `edits.length > 1`, out-of-document / negative / non-integer / inverted positions, non-overlapping edit, wrong `version` echo, oversize (relative and 16 MiB), non-string text, non-boolean `denumbered`, non-array diagnostics | unit | `npx vitest run test/java-program-guard.test.ts` | ❌ Wave 0 |
| INT-05 | diagnostics sanitising: count cap, truncation marker, control/bidi stripping, `line` 0 kept as "no location", bad entries dropped individually, others kept | unit | same file | ❌ Wave 0 |
| INT-05 | malformed answer logged warn once per kind per generation then debug; no request text in any line | unit | program-lane file | ❌ Wave 0 |
| (regression) | existing guards stay green | regression | `npx vitest run test/java-interop-breaker.test.ts test/java-interop-connection.test.ts test/java-interop-timeouts.test.ts test/java-interop-peer-guard.test.ts` | ✅ exist |
| (drift) | no planning ids in new source/test comments | manual grep | `grep` the diff for `D-[0-9]`, `INT-0`, `Plan [0-9]` (scoped, absolute paths) | n/a |

### Sampling Rate
- **Per task commit:** the single new test file for that task (`npx vitest run test/<file>`), plus `npm run typecheck:test` after any type change.
- **Per wave merge:** the six existing interop guard files above + all new files; `npm run lint`.
- **Phase gate:** `npm test` (numFailedTests judgement per memory — compare test names against the phase base commit in a scratch worktree if anything fails), `npm run typecheck:test`, `npm run lint`, `npm run build`, then the live run `RUN_BBJ_TESTS=1 npx vitest run test/functional/program-live.test.ts` with numbers copied into SUMMARY/VERIFICATION.
- IntelliJ `./gradlew test` is **not** required: no `bbj/*` request name or `main.ts` change in this phase (the contract test reads `.ts` paths for request names; Phase 124 adds none).

### Wave 0 Gaps
- [ ] `test/java-interop-errors.test.ts`, `test/java-program-guard.test.ts`, `test/java-interop-program-lane.test.ts`, `test/java-interop-program-wire.test.ts`, `test/functional/program-live.test.ts`
- [ ] Extend `test/fake-interop-peer.ts` (method-missing switches, `answerWith`, cancellation recording), `test/bbj-test-module.ts` (`scriptFormatProgram`/`scriptDenumProgram`, valid-success defaults), `test/loopback-jsonrpc-peer.ts` (`ctx.token`, `cancellations`)
- [ ] No framework install needed

## Security Domain

`security_enforcement` is not set to false in `.planning/config.json` (absent = enabled). This phase accepts untrusted-ish input from a local peer process into the language server.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | Interop is an unauthenticated loopback socket by design (host/port validated by `validateInteropConfig`, `interop-config.ts`) |
| V3 Session Management | no | — |
| V4 Access Control | no | — |
| V5 Input Validation | **yes** | `java-program-guard.ts`: shape, size, range, sanitising before anything leaves the client |
| V6 Cryptography | no | — |
| V7 Error Handling and Logging | **yes** | No request text and no unsanitised peer strings in logs; typed outcomes instead of rethrown peer errors |
| V11/V13 Business logic / API | yes (light) | Version-echo check rejects stale/cross-wired answers; backstop bounds resource use |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Oversized peer response (memory/CPU DoS in editor) | DoS | Relative + absolute text caps (4× + 64 KiB, 16 MiB), diagnostic count cap, `edits` ≤ 1 |
| Out-of-document edit range applied to a buffer / rejected wholesale by a JVM client (cf. `parseErrorToRange` comment, `bbj-parser-service.ts:32-34`) | Tampering/DoS | Positions validated against the **sent** text before any editor sees them |
| Control / bidi / line-separator characters in diagnostic messages hiding or forging text | Spoofing | Strip + replace line breaks, truncate (consistent with `java-peer-guard.ts`'s hidden-text concern) |
| Prototype pollution / unexpected keys via peer JSON | Tampering | Build fresh objects field by field; never spread/`Object.assign` peer objects |
| Stale or cross-document result applied to a newer buffer | Tampering | Strict `version` echo equality (D-13) |
| Document text leaking into logs | Information disclosure | Cadence logger never receives request text; test asserts a secret marker never appears (precedent: `bbj-parser-service.test.ts:1030-1055`) |
| Hung peer wedging the server | DoS | 15 s backstop with cancel; cool-down on failed opens |

## Sources

### Primary (HIGH confidence) — all read this session
- `/home/coder/repos/bbj-language-server/bbj-vscode/src/language/java-interop-connection.ts` (full) — parse lane lines 197-577, `disconnect()` 432-441, `resetBreaker()` 419-429, `requestClassInfo` 401-412
- `/home/coder/repos/bbj-language-server/bbj-vscode/src/language/bbj-parser-service.ts` (full) — classifier 108-130, latch 158-311, cadence 283-291
- `/home/coder/repos/bbj-language-server/bbj-vscode/src/language/java-interop.ts`, `java-peer-guard.ts` (full)
- `/home/coder/repos/bbj-language-server/bbj-vscode/test/{bbj-test-module.ts, fake-interop-peer.ts, loopback-jsonrpc-peer.ts, java-interop-parse-lane.test.ts, java-interop-timeouts.test.ts, java-interop-socket.test.ts (partial), interop-harness.test.ts, interop-harness-fake-peer.ts, functional/parse-program-live.test.ts}`; `bbj-parser-service.test.ts:826-1056`
- `/home/coder/repos/bbj-language-server/bbj-vscode/tools/interop-test-harness/{run-tests.ts, cases.ts, types.ts, gate.ts, scaffold.ts}`
- `/home/coder/repos/bbj-language-server/bbj-vscode/node_modules/vscode-jsonrpc/lib/common/connection.js:185-215,1005-1110` and `messages.js:15-63` (cancel semantics, error codes)
- `/home/coder/repos/bbj-ls/README.md` — "JSON-RPC methods", Types, Settings, Error codes
- `/home/coder/repos/bbj-language-server/.planning/{phases/124-interop-client/124-CONTEXT.md, REQUIREMENTS.md, STATE.md (lines 195-215), ROADMAP.md (Phase 124), research/PITFALLS.md (lines 1-502)}`
- **[LIVE]** probe against 127.0.0.1:5008, 2026-10-01 (scratch script created in `bbj-vscode/`, executed, deleted)

### Secondary (MEDIUM)
- `/home/coder/repos/bbj-language-server/.planning/research/ARCHITECTURE.md` — section headings only skimmed (§2/§3); its parse-lane recommendation is superseded by D-01

### Tertiary (LOW)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new packages; versions read from installed package.json files.
- Architecture: HIGH — derived from reading every cited file; dedicated-lane approach backed by live numbers.
- Pitfalls: HIGH — the cancel semantics were verified in library source and confirmed live; latch-semantic divergence verified in source.
- Validation bounds (caps, strip set, severity handling): MEDIUM — discretionary values flagged in the Assumptions Log.

**Research date:** 2026-10-01
**Valid until:** 2026-10-31 for code structure (the repo moves with each phase); the bbj-ls wire contract is pinned by `/home/coder/repos/bbj-ls/README.md` and should be re-read if bbj-ls is rebuilt.
