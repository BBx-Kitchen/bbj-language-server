# Phase 124: Interop Client - Pattern Map

**Mapped:** 2026-10-01
**Files analyzed:** 16 (5 new src, 3 modified src, 5 new test, 3 extended test doubles)
**Analogs found:** 16 / 16

All paths are under `/home/coder/repos/bbj-language-server/bbj-vscode/`. All analogs verified git-tracked (`git ls-files` on connection, fake peer, loopback peer; the rest are in the same tracked trees). No planning IDs (D-xx, INT-xx, plan numbers) in source or test comments.

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `src/language/java-interop-program-types.ts` (new) | model/types | request-response | `src/language/java-interop-connection.ts` lines 87-129 (`ParseProgramParams`, `parseProgramRequest`) | exact |
| `src/language/java-interop-errors.ts` (new, leaf) | utility (classifier + log cadence) | transform | `src/language/bbj-parser-service.ts` lines 108-130, 188-190, 218-230, 283-291 | exact (extraction) |
| `src/language/java-program-guard.ts` (new) | utility (validator/sanitiser) | transform | `src/language/java-peer-guard.ts` | role-match |
| `src/language/java-interop-program-lane.ts` (new) | service (lane + latch) | request-response | `java-interop-connection.ts` lines 196-214, 491-577 (parse lane) | role-match (4 deliberate differences) |
| `src/language/java-interop-connection.ts` (mod) | service | request-response | itself (`parseProgram`, `disconnect`) | exact |
| `src/language/java-interop.ts` (mod) | service front | request-response | itself, `parseProgram` delegate line 229, re-export line 29 | exact |
| `src/language/bbj-parser-service.ts` (mod) | service | request-response | itself | exact |
| `test/java-interop-errors.test.ts` (new) | test | transform | `test/bbj-parser-service.test.ts` lines 827-1056 | role-match |
| `test/java-program-guard.test.ts` (new) | test | transform | `test/java-interop-peer-guard.test.ts` | exact |
| `test/java-interop-program-lane.test.ts` (new) | test | request-response | `test/java-interop-parse-lane.test.ts` (invert 352-380) | exact |
| `test/java-interop-program-wire.test.ts` (new) | test | request-response | `test/java-interop-socket.test.ts` + `test/loopback-jsonrpc-peer.ts` | role-match |
| `test/functional/program-live.test.ts` (new) | test (live) | request-response | `test/functional/parse-program-live.test.ts` | exact |
| `test/bbj-test-module.ts` (ext) | test double | request-response | itself, `scriptParseProgram` lines 69-163 | exact |
| `test/fake-interop-peer.ts` (ext) | test double | request-response | itself, `handleSendRequest` lines 144-177 | exact |
| `test/loopback-jsonrpc-peer.ts` (ext) | test double | request-response | itself (expose `ctx.token`, `cancellations`) | exact |

Note: the interop harness CLI (`tools/interop-test-harness/cases.ts`) is NOT extended (live checks go to `program-live.test.ts`).

## Pattern Assignments

### `src/language/java-interop-program-types.ts` (types, request-response)

**Analog:** `src/language/java-interop-connection.ts`. Imports (lines 14-18) use `vscode-jsonrpc/node.js`:
```typescript
import {
    CancellationToken, ConnectionError, createMessageConnection, ErrorCodes, MessageConnection, RequestType,
    ResponseError, SocketMessageReader, SocketMessageWriter
} from 'vscode-jsonrpc/node.js';
```
Request-type pattern (line 129): `const parseProgramRequest = new RequestType<ParseProgramParams, ParseProgramResult, null>('parseProgram');` Copy as `new RequestType<FormatProgramParams, unknown, null>('formatProgram')` (result `unknown` on purpose, validated by the guard). Wire types, `ProgramOutcome<R>` union and constants: use RESEARCH.md "Code Examples" verbatim (optional fields omitted, never `null`). Also export a program-method union (`'formatProgram' | 'denumProgram'`). Export `METHOD_NOT_FOUND` stays in connection.ts line 69; the errors module should not import connection.ts (cycle) so define its own code constants and reuse `LSPErrorCodes.RequestCancelled` from `vscode-languageserver` as the parser service does.

---

### `src/language/java-interop-errors.ts` (leaf classifier + cadence)

**Analog:** `src/language/bbj-parser-service.ts`.

Kind table to extend (lines 108-130):
```typescript
const APPLICATION_ERROR_KINDS: Record<number, string> = {
    [-33001]: 'parser-exception', [-33002]: 'timeout', [-33003]: 'size-cap',
    [-33004]: 'service-unavailable', [-33005]: 'protected-program',
};
const MALFORMED_RESULT_KIND = 'malformed-result';
const TRANSPORT_KIND = 'transport';
function classifyFailureKind(code: number | undefined): string {
    if (code !== undefined && code in APPLICATION_ERROR_KINDS) { return APPLICATION_ERROR_KINDS[code]; }
    return TRANSPORT_KIND;
}
```
Duck-typing on code (lines 262-273) — keep, never `instanceof ResponseError`:
```typescript
const code = (e as { code?: number } | undefined)?.code;
if (code === LSPErrorCodes.RequestCancelled) { return { kind: 'cancelled' }; }   // checked first
if (code === METHOD_NOT_FOUND) { ... }
const message = e instanceof Error ? e.message : String(e);
```
Cadence to extract into a `FailureLogCadence` class (lines 188-190, 226-229, 283-291):
```typescript
private readonly reportedFailureKinds = new Set<string>();
private failureKindsGeneration = -1;
if (generation !== this.failureKindsGeneration) { this.reportedFailureKinds.clear(); this.failureKindsGeneration = generation; }
const line = `Live compiler diagnostics: request failed (${kind}): ${message}`;
if (this.reportedFailureKinds.has(kind)) { logger.debug(line); } else { this.reportedFailureKinds.add(kind); logger.warn(line); }
```
Pitfall to carry: `BBjParserService` must keep log tokens byte-identical. Pass through only parser-exception/timeout/size-cap/service-unavailable/protected-program; every other kind (new codes -33006..-33009, -32602) logs as `transport`. Message prefix stays configurable (parse keeps `Live compiler diagnostics: request failed (...)`). Success clear (`reportedFailureKinds.clear()` line 259) stays in the parse service. Leaf rule: import only vscode-jsonrpc/vscode-languageserver, `./logger.js` and `./java-peer-guard.js`.
`-33007`/`-33008` typed `data`: build fresh objects from validated fields, use `truncateText` + `MAX_PEER_ERROR_LENGTH` from java-peer-guard; garbage gives `problems: []` / `line: undefined`.

---

### `src/language/java-program-guard.ts` (validator)

**Analog:** `src/language/java-peer-guard.ts`. Header comment convention (lines 7-26: "Kept free of Langium and editor imports"). Reusable helpers:
```typescript
export const MAX_PEER_ERROR_LENGTH = 1024;
export const TRUNCATION_MARKER = '…';
function isPlainObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
export function truncateText(text: string, limit: number): string { ... }  // surrogate-safe, lines 94-103
```
`isPlainObject` is module-private there; either export it or redefine locally. Import `truncateText`, `MAX_PEER_ERROR_LENGTH` from `./java-peer-guard.js`. Constants and rules: RESEARCH.md Pattern 5 (cap `min(len*4+64KiB, 16MiB)`, version echo strict equality, whole vs range shape, edit inside document and overlapping lines, line terminators `\n`, `\r\n`, lone `\r`, diagnostics cap 500, `line: 0` kept as "no location", invalid entries dropped individually, fresh object returned).

---

### `src/language/java-interop-program-lane.ts` (ProgramLane)

**Analog:** parse lane in `src/language/java-interop-connection.ts`.

Bookkeeping template (lines 204-214) and lazy open with same-tick promise sharing (lines 491-549):
```typescript
private parseLane?: MessageConnection;
private parseLaneConnecting?: Promise<MessageConnection | undefined>;
...
if (this.parseLaneConnecting) { return this.parseLaneConnecting; }
this.parseLaneConnecting = this.openParseLane(generation);
try { return await this.parseLaneConnecting; } finally { this.parseLaneConnecting = undefined; }
...
socket = await this.hooks.createSocket();
const lane = this.hooks.wrapSocket(socket);
lane.onClose(() => this.onParseLaneLost(lane));
lane.onError(() => this.onParseLaneLost(lane));
lane.listen();
if (this.generation !== generation) { lane.dispose(); return undefined; }   // epoch re-check
```
Identity-guarded loss + dispose-clears-field-first (lines 561-577):
```typescript
private onParseLaneLost(lane: MessageConnection): void {
    if (this.parseLane !== lane) { return; }
    this.parseLane = undefined;
    this.generation++;        // DO NOT COPY: program lane bumps only its own laneEpoch
}
private disposeParseLane(): void { const lane = this.parseLane; this.parseLane = undefined; lane?.dispose(); }
```
Deliberate differences (RESEARCH.md Patterns 1-3): own `laneEpoch`; no `hooks.connect()`, no breaker, no `notifyJavaConnectionError`; cool-down stamp (`Date.now()`, ~5 s; `INTEROP_BREAKER_INITIAL_COOLDOWN_MS` at line 30 is the numeric precedent) after a failed open; `-32601` flips only that method's latch and never disposes the lane (contrast lines 472-478); settle-first backstop with `CancellationTokenSource` (15 s, never `Promise.race` abandon as in `requestClassInfo` lines 401-412, but keep its dangling-promise guard `requestPromise.catch(() => {})` at line 407); `socket.setNoDelay(true)` guarded by `typeof socket.setNoDelay === 'function'` (fake socket is `{} as Socket`). Latch key `` `${sharedGeneration}.${laneEpoch}` `` mirrors `resetIfGenerationChanged` (`bbj-parser-service.ts` 218-230) and captures the key before the request (`latchOn(generation)` at line 243/257).
Hooks shape: the existing `InteropConnectionHooks` (`createSocket`/`wrapSocket`/`connect`) — pass the lane only `{createSocket, wrapSocket, sharedGeneration}`.

---

### `src/language/java-interop-connection.ts` (modify)

Add a `programLane` field built from the same hooks; add `formatProgram`/`denumProgram` beside `parseProgram` (line 463); in `disconnect()` (lines 432-441) add `this.programLane.dispose()` next to `this.disposeParseLane();`. Do not touch `resetBreaker()` (lines 419-429): its `generation++` is the shared bump that lazily resets latches via the key. Outcome methods never throw.

### `src/language/java-interop.ts` (modify)

Delegate pattern (lines 221-231):
```typescript
public parseProgram(params: ParseProgramParams, token?: CancellationToken): Promise<ParseProgramResult> {
    return this.interopConnection.parseProgram(params, token);
}
```
Add two delegates returning `Promise<ProgramOutcome<...>>`; re-export new types beside line 29 (`export type { ParseProgramParams, ParseError, ParseProgramResult } from './java-interop-connection.js';`).

### `src/language/bbj-parser-service.ts` (modify)

Replace lines 108-130 and the private cadence with the shared module; keep `requestLiveParse` semantics (cancelled first, `METHOD_NOT_FOUND` latches off, `logFailure(MALFORMED_RESULT_KIND, ...)`, latch on result only). Do not "fix" the latch-on-application-error doc discrepancy.

---

### Tests

**`test/java-program-guard.test.ts`** — copy structure of `test/java-interop-peer-guard.test.ts`; table of every malformed shape from CONTEXT Specifics.

**`test/java-interop-program-lane.test.ts`** — analog `test/java-interop-parse-lane.test.ts` (access pattern `getRawClass` at lines 29, 42-44; the lane-loss test at 352-380 asserts the generation bump — invert it: program-lane loss leaves `connectionGeneration`, breaker and parse latch untouched). Use `FakePeerInteropService`: hung connection via `hungConnectionIds`, `dropConnection(id)`, `vi.useFakeTimers()` for the 15 s backstop and cool-down. SC4: 20 application errors then assert generation/breaker unchanged and class lookups still answered.

**`test/java-interop-errors.test.ts`** — classifier table; log-token identity guarded by `test/bbj-parser-service.test.ts:827-1056` (`warnSpy.mock.calls[0][0]` `toContain(kind)`, no document text in any log line, lines 1030-1055).

**`test/java-interop-program-wire.test.ts`** — real framing via `test/loopback-jsonrpc-peer.ts` (`startLoopbackPeer`); response that never arrives pattern in `test/java-interop-socket.test.ts`; asserts `ResponseError.data` survives and a real `$/cancelRequest` arrives (fake peer rejects `Error('Canceled')` on cancel, which real vscode-jsonrpc 8.2.1 does not).

**`test/functional/program-live.test.ts`** — analog `test/functional/parse-program-live.test.ts` lines 1-61:
```typescript
const run = await shouldRunBBjTests();
const services = createBBjServices(NodeFileSystem);
beforeAll(async () => {
    if (!run) return;
    services.BBj.java.JavaInteropService.setConnectionConfig('127.0.0.1', 5008);
    await initializeWorkspace(services.shared);
}, 120000);
test.runIf(run)('...', async () => { await services.BBj.java.JavaInteropService.parseProgram({...}); });
```
Imports `shouldRunBBjTests`/`initializeWorkspace` from `../test-helper.js`. Probe first and skip on `unavailable`/method-not-found; warm up before timing (see memory note on cold resolution); record the latency numbers (idle DENUM, DENUM behind pending parse on parse lane vs program lane, parse latency during DENUM, `$/cancelRequest` finding). Never `DocumentBuilder.build`.

---

### Test doubles

**`test/bbj-test-module.ts`** (lines 69-163): mirror `JavaInteropTestServiceParseProgramScript` / `scriptParseProgram` / override. Script union: wire result (`unknown`), wire error `{code,message,data?}`, `'method-not-found'`, `'transport-error'`, `{outcome}` escape hatch. Exception to the template: default script = valid success echo (the parse default of `'method-not-found'` hides the success path), and wire results/errors run through the real `validateFormatResult` / `validateDenumResult` / `classifyInteropError`. Error construction precedent: `throw new ResponseError(ErrorCodes.MethodNotFound, 'Unsupported request method: parseProgram');`. Never touch `connect()`.

**`test/fake-interop-peer.ts`** (lines 76-77, 144-177): add `formatProgramMethodMissing` / `denumProgramMethodMissing` beside `parseProgramMethodMissing`; add switch cases:
```typescript
case 'parseProgram':
    if (this.parseProgramMethodMissing) { return Promise.reject({ code: -32601 }); }
    return Promise.resolve({ version: (params as { version: string }).version, errors: [] });
```
Plus `answerWith(method, fn)` override and `cancelledRequests` recorded for every request token (not only hung ones, line 150).

**`test/loopback-jsonrpc-peer.ts`**: expose the star-handler's last `CancellationToken` as `ctx.token` and add a `cancellations` list (additive; `interop-harness-fake-peer.ts` ignores new fields).

## Shared Patterns

### Never touch breaker or shared generation from the new lane
**Source:** `java-interop-connection.ts` lines 221-258, 270-291 (`connect()` and `onConnectAttemptSettled` are the only breaker movers) and lines 525-549 (`openParseLane` comment: never touches breaker, never raises notification). **Apply to:** `java-interop-program-lane.ts`.

### Dangling request promise guard
**Source:** `java-interop-connection.ts` line 407 `requestPromise.catch(() => { /* ... */ });` **Apply to:** every `sendRequest` in the lane (late `-32800` / `PendingResponseRejected` after settle).

### Peer-input sanitising
**Source:** `java-peer-guard.ts` `truncateText`, `MAX_PEER_ERROR_LENGTH`. **Apply to:** error `data` payloads, diagnostic messages, log lines (never log request text).

### Log cadence
**Source:** `bbj-parser-service.ts` lines 283-291 (warn first per kind per generation, then debug). **Apply to:** program lane failures and malformed results.

### Source comment hygiene
No D-xx / INT-xx / plan numbers in source or tests; issue numbers fine. No `eslint-disable` (guarded by `test/eslint-disable-directives.test.ts`). Gates: `npm run lint`, `npm run typecheck:test` (harness at strict), `npm test`; run vitest with cwd `bbj-vscode`.

## No Analog Found

| File / mechanic | Role | Reason |
|---|---|---|
| Settle-first cancel with linked `CancellationTokenSource` | backstop | Nothing in the repo cancels on timeout; `requestClassInfo` abandons. Use RESEARCH.md Pattern 2 (vscode-jsonrpc 8.2.1 cancel does not reject the promise). |
| Line-model helper (`\n`, `\r\n`, lone `\r`) for range validation | utility | No shared helper; `lsp-position.ts` is position-conversion only. Write a small local one in the guard. |

## Metadata

**Analog search scope:** `bbj-vscode/src/language`, `bbj-vscode/test`, `bbj-vscode/test/functional`
**Files read:** CONTEXT.md, RESEARCH.md (lines 1-531), java-interop-connection.ts (14-74, 180-578), bbj-parser-service.ts (95-305), java-peer-guard.ts (1-120), bbj-test-module.ts (60-170), fake-interop-peer.ts (70-200), parse-program-live.test.ts (1-70)
**Pattern extraction date:** 2026-10-01
