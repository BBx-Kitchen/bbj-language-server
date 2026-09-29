# Phase 116: Java-Interop Test Coverage - Research

**Researched:** 2026-09-28
**Domain:** Vitest/TypeScript test authoring against Langium's linking/scope pipeline, a hand-rolled `net`+`vscode-jsonrpc` client (`JavaInteropService`), and LSP handler extraction in a `vscode-languageserver` server (`main.ts`)
**Confidence:** HIGH (nearly every claim below was verified this session by reading the exact source file or by running the real test suite; the `[ASSUMED]` tags are limited to a handful of naming/ordering choices explicitly left to discretion)

## Summary

This phase closes four requirements (TEST-04, TEST-05, TEST-06, TEST-08) that are all instances of
the same underlying problem: `bbj-vscode`'s test suite currently exercises hand-written test
doubles and disabled assertions instead of the real `JavaInteropService` connection/timeout/lock
code and the real `main.ts` LSP handler bodies. CONTEXT.md's decisions (D-01 through D-16) already
specify the fix shape precisely; this research verifies those decisions against the actual current
source and running test suite, and surfaces four concrete, previously-undocumented findings that
change how the plan must sequence its tasks:

1. **The `linking.test.ts` "Interop related tests" describe block's 11 failures are exactly as the
   2026-09-20 todo describes, confirmed by re-running it live this session** (`RUN_BBJ_TESTS=1`,
   :5008 up): 11 failed / 7 passed / 24 skipped, byte-identical to the todo's verbatim failure
   list. `test/functional/issue447-real-interop.test.ts`, which the todo's D-04 companion decision
   also names, already passes 5/5 live — it was already rewritten backend-agnostic in Phase 114
   (STATE.md: "114-04 ... replacing the tautological hasCompleteClassIndex assertion") and needs
   no further change for this phase.
2. **`JavaInteropTestService`'s classpath document is indexed once, in its constructor, and
   Langium's global scope does not pick up classes or class members added to it afterward** — even
   via the *base class's own* `resolveClassByName`, which resolves a primitive class synchronously
   with no network call. This was verified empirically this session (see Pitfall 1) and means every
   fixture class/method the three DISABLED `parser.test.ts` assertions need must be added inside
   `JavaInteropTestService`'s constructor (matching D-01/D-06's own instruction), never via a
   test-local seam call after construction.
3. **`JavaInteropTestService.resolveClassByName` fully overrides the base class and never reaches
   the `isLocalJavaTypeName`/`localJavaTypeDto` local-primitive-resolution code added by #660** —
   confirmed by constructing a bare `JavaInteropService` and calling `resolveClassByName('byte')`,
   which resolves locally and instantly with no network attempt, then confirming the *test double*
   still reports `byte`/`void` as unresolved. This is *why* the `String[]`/`byte[]` DISABLED
   assertion still fails today, not staleness in the comment.
4. **`main.ts`'s `onDidChangeConfiguration` handler has no per-field "classpath-affecting vs not"
   branch** — read in full this session (lines 192–280): once `workspaceInitialized` is true, *every*
   settings-change event unconditionally calls `reloadJavaClassesAndRevalidate()`, regardless of
   which field changed. D-16's language ("a classpath-affecting change that reloads vs one that
   doesn't") most plausibly describes the *pre-init vs post-init* branch (pre-init never reloads;
   post-init always does), not a per-field gate — see Pitfall 4 and Open Question 1.

**Primary recommendation:** Follow D-01–D-16 exactly as written; this research's job is to pin the
concrete mechanics (constructor-time-only fixture visibility, the `resolveClassByName` override
gap, and the config-handler's actual unconditional-reload shape) so the plan's tasks build fixture
code and handler tests that match what the source and the live suite actually do, not what the
DISABLED comments or D-16's prose imply in isolation.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Fixture completeness for linking/parser tests | Test infrastructure (`test/bbj-test-module.ts`) | — | Pure test-double data; no production behavior changes |
| Fake JSON-RPC socket peer | Test infrastructure (`test/interop-harness-fake-peer.ts`, promoted) | — | A real `net.Server` + `vscode-jsonrpc` server used only from tests |
| Real connect/timeout/lock coverage | Backend (`src/language/java-interop.ts`) | Test infrastructure | Test-only additions (a fake peer) driving already-shipped production code; no `src/` change expected unless D-06 finds a real LS bug |
| LSP handler extraction | Backend (`src/language/main.ts` → new `register*` modules) | — | Handler *bodies* move to new modules under `src/language/`; `main.ts` stays the thin wiring entry point that calls `createConnection()` |
| `shouldRunBBjTests()` hardening | Test infrastructure (`test/test-helper.ts`) | Backend (JSON-RPC round trip against `interopHost`/`interopPort`) | A test-suite gate, but the round trip it performs talks the same protocol as `java-interop.ts` |

## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Complete the fixture. Add `java.util.Date`, `java.util.List`, `java.util.LinkedList`,
  `java.util.Map` with a nested `Map.Entry`, `java.sql.Date`, `java.lang.Boolean` to
  `JavaInteropTestService` in `test/bbj-test-module.ts`, plus an `Object`-equivalent base so
  `toString()` resolves on any user-defined class. The block runs hermetically, in CI too, and its
  result doesn't depend on :5008. The block is not moved onto live interop.
- **D-02:** Build the fake classes the same way as `createHashMapClass`/`createSysGuiClass`, with
  only the members the tests reference (e.g. `Map.Entry.getValue`, `Boolean.TRUE`,
  `java.sql.Date.valueOf`, `toString`). Don't build fuller JDK-like member lists.
- **D-03:** Drop the `describe.runIf(isInteropRunning)` gate and rename the block so it no longer
  claims to exercise interop (e.g. "Java class linking (test double)"). It runs unconditionally.
- **D-04:** Zero failed tests, whole suite, both states. Criterion 2 covers the whole suite,
  including the drifted live-interop tests — the `issue447` capability tests that fail against the
  current bbj-ls (`getAllClassNames`, since 2026-09-03). Update them to the current backend so a
  whole-suite run reports `numFailedTests: 0` both with :5008 up (`npm run test:bbj`) and down
  (`npm test`).
- **D-05:** Harden `shouldRunBBjTests()` now (DEBT item 5). Replace the bare TCP probe with a real
  JSON-RPC round trip, short and non-hanging, every existing caller keeps its current call shape.
- **D-06:** Test double first. Re-enable each of the three assertions (substring parse
  `new String()(1)`, the `BBjAPI().getGlobalNamespace().getValue()` chain with `release()`, the
  `String[]`/`byte[]` field and method signature). Extend `JavaInteropTestService` only where an
  assertion actually needs it. Check each `DISABLED` comment before adding fixture code — some may
  be stale. `src/` stays untouched unless an assertion exposes a real LS bug, then fix in `src/` and
  record in SUMMARY.
- **D-07:** The `BBjAPI()` chain asserts `expectNoValidationErrors`, matching the real LS on real
  BBj. The fake `getValue()` returns what the real signature returns (`Object`). The fake is not
  typed to a semaphore, and `release()` on the untyped `!` variable is not flagged, as today.
- **D-08:** Remove the stale `DISABLED:` comment blocks together with the commented-out assertions.
- **D-09:** Promote a shared loopback fake peer. Generalise `test/interop-harness-fake-peer.ts` into
  one shared real `net` + vscode-jsonrpc server (loopback, ephemeral port, per-test handler
  overrides, drop and never-answer controls). The harness tests and the new `java-interop.ts` suite
  both use it, and the Phase 115 harness tests stay green without assertion changes.
- **D-10:** The new suite drives `JavaInteropService`'s real `connect()`, `createSocket()` and
  `wrapSocket()`, pointed at the fake server's port. Covers at least a refused connection (nothing
  listening), a response that times out (server accepts, never answers), and concurrent requests
  serialized by the resolution lock (server sees one request at a time, in order).
- **D-11:** Leave the existing client-side fakes alone. `test/fake-interop-peer.ts` and the breaker
  and parse-lane suites that use it keep their `createSocket`/`wrapSocket` overrides. The new suite
  covers only what they skip.
- **D-12:** Timeouts use fake timers over the real socket. `vi.useFakeTimers` advances past the real
  10s/30s constants, as `test/java-interop-timeouts.test.ts` already does. No injectable-timeout
  `src/` change. If fake timers and socket I/O interfere, fake only `setTimeout`/`clearTimeout`; no
  `src/` change.
- **D-13:** Use the existing `register*(connection, deps)` pattern. The `bbj/refreshJavaClasses`
  request body, the `onDidChangeConfiguration` body and their inline helpers
  (`reloadJavaClassesAndRevalidate`, `refreshInlayHints`, settings parsing) move into new modules
  taking services, workspace manager and setters as deps. `main.ts` only wires them.
  `createConnection()` stays in `main.ts`; the `bbj-notifications.ts` isolation is kept — no
  shared-services module imports `main.ts`.
- **D-14:** The extraction is behaviour-neutral: same call order, same messages, config handler
  still registered after `startLanguageServer`. Existing suites pass without assertion changes.
- **D-15:** Behaviour tests plus a coverage reading. Tests drive the registered handlers through a
  fake connection and assert their effects. VERIFICATION records a one-off `vitest --coverage`
  reading for the new modules. No new CI coverage gate, no per-file threshold.
- **D-16:** Every branch of the configuration handler gets a test: push vs pull settings, a
  classpath-affecting change that reloads vs one that doesn't, the interop host/port change, the
  reload-failure path. The refresh request gets its success and failure cases.

### Claude's Discretion

- Plan ordering and grouping. Suggested: fixture and baseline (D-01..D-08) first, then the shared
  fake peer and the java-interop suite, then the main.ts extraction.
- The exact JSON-RPC call the hardened probe uses (D-05), and its timeout.
- The new block's name (D-03), the new module and file names (D-13), and how the shared fake peer
  is parameterised over the two clients' request types (D-09).

### Deferred Ideas (OUT OF SCOPE)

- `2026-09-26-intellij-interop-initoptions-key-mismatch.md`: an IntelliJ behaviour fix, not test
  coverage. Stays pending for a fix phase or backlog.
- `2026-09-26-signature-help-and-snippet-peer-name-escaping.md`: a `src/` security fix, out of scope
  for a test-coverage phase.
- `2026-09-27-windows-intellij-node-download-progress-check.md`: a manual check on real Windows, no
  code in this phase.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| TEST-04 | Re-enable and pass the three disabled `parser.test.ts` validation assertions (#528) | Pitfalls 1–3 identify exactly why each assertion currently fails and what constructor-time fixture change each needs; see Code Examples 1–2 |
| TEST-05 | Pass or deliberately rewrite the 11 `linking.test.ts` interop tests; whole-suite baseline has no known failures (#559) | Verified live this session: 11/7/24 split confirmed unchanged; whole-suite baseline measured both ways (see Validation Architecture); D-04's issue447 concern already resolved by Phase 114 |
| TEST-06 | Exercise `java-interop.ts`'s real connect/timeout/lock code against a local fake socket server (#560) | Architecture Patterns 2–3 and Code Examples 3 document the fake-peer promotion, the real-socket-under-test pattern, and precedent for fake timers over a real socket |
| TEST-08 | `main.ts` handler logic testable without module-load `createConnection()`, covered by tests (#563) | Architecture Pattern 1 (existing `register*` shape), Pitfall 4 (no per-field reload gate — pin actual behavior), Code Example 4 |
</phase_requirements>

## Standard Stack

No new external packages are needed for this phase — every dependency used below is already
installed and already used by an existing test or `src/` file in this repository.

### Core (already installed, in-repo verified)

| Library | Version | Purpose | Why Standard (in this repo) |
|---------|---------|---------|------------------------------|
| `vitest` | `^4.1.10` [VERIFIED: bbj-vscode/package.json:728] | Test runner, fake timers (`vi.useFakeTimers`), mocking | Already the project's only test runner; `--reporter=basic` does not exist in this version — do not pass it (confirmed by the `Startup Error: Failed to load custom Reporter from basic` this session; matches project memory) |
| `vscode-jsonrpc` | `^8.2.1` [VERIFIED: bbj-vscode/package.json:712] | `createMessageConnection`, `SocketMessageReader`/`Writer`, `RequestType` | Already used by `java-interop.ts`, `interop-harness-fake-peer.ts`, `fake-interop-peer.ts` for the exact same client/server pattern this phase needs |
| `langium` | `~4.3.1` [VERIFIED: bbj-vscode/package.json:709] | `parseHelper`, `EmptyFileSystem`, DI module wiring | Already the project's language toolkit; do not upgrade — pinned per the v4.7 standing constraint (`.planning/STATE.md`: "do not install or run langium 4.4") |
| `vscode-languageserver` | (pinned override, see package.json) | `Connection` type, `createConnection` | Already the interface every `register*` handler module types its `connection` parameter against |
| `node:net` | (Node builtin) | Loopback `Socket`/`createServer` for the fake peer | Already used by `interop-harness-fake-peer.ts` and `fake-interop-peer.ts` |

### Package Legitimacy Audit

No packages are installed or upgraded by this phase — table intentionally omitted. If a plan task
discovers a genuine need for a new devDependency (unlikely given the precedent code below), the
Package Legitimacy Gate protocol must be run before it is added, and this file amended.

## Architecture Patterns

### System Architecture Diagram

```
                    ┌─────────────────────────────────────────────┐
                    │  Test file (vitest)                          │
                    │  e.g. test/java-interop-socket.test.ts (new)  │
                    └───────────────┬───────────────────────────────┘
                                    │ constructs
                                    ▼
        ┌───────────────────────────────────────────────────────────┐
        │ JavaInteropService (real, src/language/java-interop.ts)    │
        │  .setConnectionConfig('127.0.0.1', fakePeer.port)           │
        │  .connect() → .createSocket() → .wrapSocket()  (all REAL)  │
        └───────────────┬───────────────────────────┬────────────────┘
                         │ TCP loopback               │ acquireLock() /
                         ▼                             │ drainLockQueue()
        ┌───────────────────────────────┐             │ (serializes
        │ Fake peer (test/, promoted     │◄────────────┘ concurrent
        │ from interop-harness-fake-     │  getClassInfo   resolveClassByName
        │ peer.ts) — real net.Server +   │  requests, in   calls through
        │ vscode-jsonrpc, per-test       │  arrival order  one lock queue)
        │ handler overrides, ctx.drop()  │
        └───────────────────────────────┘

                    ┌─────────────────────────────────────────────┐
                    │  Test file (vitest)                          │
                    │  e.g. test/bbj-refresh-java-classes.test.ts   │
                    │        (new, TEST-08)                         │
                    └───────────────┬───────────────────────────────┘
                                    │ constructs a fake Connection
                                    │ ({ onRequest, onDidChangeConfiguration,
                                    │    window: { showErrorMessage,
                                    │    showInformationMessage }, ... })
                                    ▼
        ┌───────────────────────────────────────────────────────────┐
        │ registerRefreshJavaClassesRequest(connection, deps)          │
        │ registerConfigurationChangeHandler(connection, deps)          │
        │   (new modules under src/language/, D-13)                     │
        │   → calls deps.reloadClasspathAndRecheckDocuments(...)        │
        │     (src/language/java-class-reload.ts — ALREADY extracted)   │
        └───────────────────────────────────────────────────────────┘
                                    ▲
                                    │ wired by (unchanged responsibility)
                    ┌───────────────┴───────────────┐
                    │ src/language/main.ts            │
                    │  const connection = createConnection(...)  ← stays here
                    │  registerRefreshJavaClassesRequest(connection, {...})
                    │  registerConfigurationChangeHandler(connection, {...})
                    └─────────────────────────────────┘
```

### Recommended Project Structure

No new top-level folders. New files land beside their siblings:

```
bbj-vscode/
├── src/language/
│   ├── main.ts                          # unchanged responsibility: createConnection() + wiring only
│   ├── java-class-reload.ts             # ALREADY EXISTS — reload/recheck logic, already extracted
│   ├── refresh-java-classes-request.ts  # NEW (name at discretion, D-13): bbj/refreshJavaClasses handler body
│   └── configuration-change-handler.ts  # NEW (name at discretion, D-13): onDidChangeConfiguration handler body
├── test/
│   ├── bbj-test-module.ts               # EDIT (D-01/D-02/D-06): JavaInteropTestService fixture classes
│   ├── linking.test.ts                  # EDIT (D-03): drop describe.runIf gate, rename block
│   ├── parser.test.ts                   # EDIT (D-06/D-08): re-enable 3 assertions, remove DISABLED comments
│   ├── test-helper.ts                   # EDIT (D-05): shouldRunBBjTests() JSON-RPC round trip
│   ├── interop-harness-fake-peer.ts     # EDIT (D-09): generalize to a shared fake peer
│   ├── java-interop-socket.test.ts      # NEW (name at discretion, D-10): real connect/timeout/lock suite
│   ├── refresh-java-classes-request.test.ts     # NEW (D-15/D-16)
│   └── configuration-change-handler.test.ts     # NEW (D-15/D-16)
└── test/functional/
    └── issue447-real-interop.test.ts    # VERIFIED already passing 5/5 live — likely no change needed (D-04)
```

### Pattern 1: `register*(connection, deps)` handler extraction

**What:** A handler's body moves into its own module as a plain function taking a structurally-typed
`deps` interface; a thin `registerX(connection, deps)` wires it to the connection. `main.ts` keeps
only the `createConnection()` call and the wiring lines.

**When to use:** For both TEST-08 handlers (`bbj/refreshJavaClasses`, `onDidChangeConfiguration`).

**Example (existing precedent, read this session):**
```typescript
// Source: bbj-vscode/src/language/resolved-config-path-request.ts:37-56 (verified this session)
export interface ResolvedConfigPathDeps {
    wsManager: {
        getResolvedConfigPath(): ResolvedConfigPathResult;
    };
}

export function createResolvedConfigPathHandler(deps: ResolvedConfigPathDeps): () => Promise<ResolvedConfigPathResult> {
    return async (): Promise<ResolvedConfigPathResult> => {
        return deps.wsManager.getResolvedConfigPath();
    };
}

export function registerResolvedConfigPathRequest(connection: Pick<Connection, 'onRequest'>, deps: ResolvedConfigPathDeps): void {
    connection.onRequest(RESOLVED_CONFIG_PATH_METHOD, createResolvedConfigPathHandler(deps));
}
```
A second precedent, `registerConfigAwareHoverHandler` (`bbj-vscode/src/language/bbj-hover-handler.ts:33-49`,
verified this session), shows the "register AFTER `startLanguageServer`" ordering rule D-14 must
preserve for any handler that overrides a Langium default — not directly applicable to
`bbj/refreshJavaClasses` or `onDidChangeConfiguration` (neither is a Langium default), but the
*ordering discipline* (comment explaining why registration happens where it does) is the pattern to
follow.

**A third relevant precedent — the reload logic is ALREADY extracted:**
`src/language/java-class-reload.ts` already exports `reloadClasspathAndRecheckDocuments(services: JavaClassReloadServices)`
[VERIFIED: bbj-vscode/src/language/java-class-reload.ts:17-57], with its own passing test file
`test/java-class-reload.test.ts` [VERIFIED: exists, imports `reloadClasspathAndRecheckDocuments` at
line 22]. TEST-08's remaining scope is smaller than the phase description's file list suggests: the
`bbj/refreshJavaClasses` handler and `onDidChangeConfiguration` handler need to move, but the
reload-and-recheck sequence they call is already tested in isolation. The new handler tests should
call the real `reloadClasspathAndRecheckDocuments` (or a fake matching its `JavaClassReloadServices`
shape) rather than re-testing its internals.

### Pattern 2: Real-service-under-test, fake-peer-behind-it (D-10)

**What:** Construct the real `JavaInteropService` (not a subclass with `createSocket`/`wrapSocket`
overridden), point it at the fake peer's real loopback port via `setConnectionConfig`, and assert
on behavior observed through the class's own public/protected surface (via a thin test subclass that
exposes `connect()`/`createSocket()` for direct invocation, mirroring `HangingBackendInterop` in
`java-interop-timeouts.test.ts`).

**Example:**
```typescript
// Source: bbj-vscode/test/java-interop-timeouts.test.ts:21-42 (verified this session)
class HangingBackendInterop extends JavaInteropService {
    public sendRequestCalls = 0;
    protected override async connect(): Promise<MessageConnection> { /* ... */ }
    public callGetRawClass(className: string): Promise<JavaClass> {
        return this.getRawClass(className);
    }
    public callCreateSocket(): Promise<unknown> {
        return this.createSocket();
    }
}
```
For D-10, the equivalent exposer subclass should NOT override `connect()`/`createSocket()` — it
should only add public passthrough methods (`callConnect()`, `callCreateSocket()`,
`callResolveClassByName()`), so the *real* implementations run against the fake peer's real port.

### Pattern 3: Fake JSON-RPC peer, promoted (D-09)

**What:** `test/interop-harness-fake-peer.ts` already implements exactly the shared peer shape D-09
wants: a real `net.createServer` on `127.0.0.1:0` (ephemeral port), one `vscode-jsonrpc`
`MessageConnection` per accepted socket, per-connection handler overrides, and a `context.drop()`
that destroys the socket mid-request.
```typescript
// Source: bbj-vscode/test/interop-harness-fake-peer.ts:251-298 (verified this session)
export function startFakePeer(overrides: FakePeerOverrides = {}): Promise<FakePeer> {
    return new Promise((resolvePeer, rejectPeer) => {
        const server: Server = createServer(socket => {
            const conn = createMessageConnection(new SocketMessageReader(socket), new SocketMessageWriter(socket));
            const ctx: FakePeerContext = { drop: () => socket.destroy() };
            conn.onRequest(getClassInfoRequest, (params) => (overrides.getClassInfo ?? defaultGetClassInfo)(params, ctx));
            // ... three more request types ...
            conn.listen();
        });
        server.listen(0, '127.0.0.1', () => resolvePeer({ port: /* ... */, close: /* ... */ }));
    });
}
```
**The gap D-09 must close:** its `FakePeerHandlers` interface is fixed to the harness's four request
types (`getClassInfo`, `getClassInfos`, `getTopLevelPackages`, `loadClasspath`)
[VERIFIED: bbj-vscode/test/interop-harness-fake-peer.ts:51-56], imported from
`tools/interop-test-harness/scaffold.ts`'s own `RequestType` constants
[VERIFIED: bbj-vscode/tools/interop-test-harness/scaffold.ts:34-37: `export const getClassInfoRequest = new RequestType<ClassInfoParams, ClassInfoDto, null>('getClassInfo');` and siblings]. `java-interop.ts` has its **own separate, module-private** `RequestType` constants for the same method
names, plus two the harness doesn't have (`getAllClassNames`, `parseProgram`)
[VERIFIED: bbj-vscode/src/language/java-interop.ts:1670-1699 — none of `loadClasspathRequest`,
`getClassInfoRequest`, `getClassInfosRequest`, `getTopLevelPackages`, `getAllClassNamesRequest`,
`parseProgramRequest` carry an `export` keyword]. Since `vscode-jsonrpc` dispatches by the request's
*method-name string* (`'getClassInfo'`, etc.), not by object identity, a server built against the
harness's `RequestType` objects genuinely interoperates over the wire with a client using
`java-interop.ts`'s own private ones — **but generalizing D-09 means either (a) importing the
harness's exported `RequestType` constants into the new suite for the four shared methods and adding
two new local ones for `getAllClassNames`/`parseProgram`, or (b) parameterizing `startFakePeer`'s
handler map over method-name strings directly instead of typed `RequestType` objects.** This is the
concrete shape of "how the shared fake peer is parameterised over the two clients' request types"
that CONTEXT.md leaves to discretion.

### Pattern 4: Real socket + fake timers (precedent already exists, D-12)

**What:** `vi.useFakeTimers()` coexisting with a real `net.Socket` connect attempt, already proven in
this codebase:
```typescript
// Source: bbj-vscode/test/java-interop-timeouts.test.ts:83-99 (verified this session)
test('socket connect to an unreachable backend settles rather than hanging', async () => {
    vi.useFakeTimers();
    const interop = new HangingBackendInterop(newServices());
    interop.setConnectionConfig('192.0.2.1', 5008); // RFC 5737 — routes nowhere
    const pending = interop.callCreateSocket();
    const assertion = expect(pending).rejects.toThrow(/timed out after 10s|ECONNREFUSED|.../);
    await vi.advanceTimersByTimeAsync(10_000);
    await assertion;
});
```
This test never opens a *listening* peer — it relies on an unroutable address to stay pending until
the fake-timer-driven 10s guard fires. D-10's "refused connection" and "response that times out"
cases are different: a refused connection needs something *actively listening then closing/refusing*
(or nothing listening on the picked port), and D-10's "response that times out" needs a peer that
*accepts the TCP connection* but never answers the JSON-RPC request — exactly what
`startFakePeer`'s `answerRequests`-style override (see `FakePeerInteropService.answerRequests` in
`fake-interop-peer.ts:60-61`, a different file, client-side) demonstrates conceptually, but the new
suite must build this by *not* registering a handler for the relevant request on a *real* fake-peer
connection so the request hangs, then driving `vi.advanceTimersByTimeAsync` past the relevant real
constant (`RESOLUTION_TIMEOUT_MS = 30_000` at `java-interop.ts:252`, or the `getRawClass` race
timeout of `10000` at `java-interop.ts:573`).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| A loopback JSON-RPC test server | A new from-scratch `net.createServer` + `vscode-jsonrpc` wiring | Promote `test/interop-harness-fake-peer.ts` (D-09) | It already does exactly this, including ephemeral-port allocation, per-connection overrides, and a `drop()` control; a second hand-rolled implementation would immediately diverge |
| A fake `Connection` for handler tests | A full mock of the `vscode-languageserver` `Connection` interface | A minimal structural object typed via `Pick<Connection, ...>`, following `test/fake-text-document-connection.ts`'s and `test/notifications.test.ts`'s pattern (`{ sendNotification: vi.fn(), window: { showErrorMessage: vi.fn() } } as unknown as Connection`) | `Connection` has dozens of methods; every existing test in this repo that fakes one only implements the handful the code under test actually calls |
| Reload-and-recheck sequencing tests | Re-testing `clearCache()` → `loadClasspath()` → `loadImplicitImports()` → document re-check ordering from scratch inside the new handler tests | Call the already-extracted, already-tested `reloadClasspathAndRecheckDocuments` (`src/language/java-class-reload.ts`, tested by `test/java-class-reload.test.ts`) and assert only that the new handler *calls* it (plus the handler's own error-message/setter side effects) | Avoids duplicate coverage and keeps the new handler tests focused on what actually moved |
| Primitive/array Java type resolution | A parallel primitive-name table inside `JavaInteropTestService` | `isLocalJavaTypeName`/the base class's own resolution path — but only reachable if `JavaInteropTestService.resolveClassByName` is taught to delegate to it (Pitfall 3) or the primitive classes are added as constructor-time fixture entries like every other fake class (Pitfall 1 makes the delegate-to-super approach alone insufficient for *linking*, only for interop-level lookups) | `isLocalJavaTypeName`/`localJavaTypeDto` (`java-interop.ts:90-145`) is the single already-shipped source of truth for "which type names are primitives/arrays/blank" |

**Key insight:** every piece of infrastructure this phase needs (fake peer, fake connection, reload
sequencing, primitive-name detection) already exists in the codebase in a form built for an adjacent
purpose. The work is almost entirely *generalizing/reusing* existing modules, not writing new
mechanisms from scratch — which is also why D-09, D-13 and Don't-Hand-Roll above all point at the
same three files.

## Common Pitfalls

### Pitfall 1: Constructor-time-only fixture visibility (HIGH confidence — empirically verified)

**What goes wrong:** Adding a class, or adding a method to an already-registered class, to
`JavaInteropTestService`'s classpath *after* construction does not make it linkable — Langium's
global scope for `SimpleTypeRef`/`MemberCall` references does not see the change, even though
`getResolvedClass()`/`resolveClassByName()` return the mutated object correctly.

**Why it happens:** `JavaInteropTestService`'s constructor pushes its five fake classes into
`this.classpath.classes`, resolves each, and *then* calls
`this.langiumDocuments.addDocument(this.classpathDocument)`
[VERIFIED: bbj-vscode/test/bbj-test-module.ts:77-84]. `SimpleTypeRef.simpleClass`'s scope is resolved
purely synchronously by `resolveClassScopeByName`, which reads from `document.localSymbols` and
`this.getGlobalScope(Class.$type, context)` [VERIFIED: bbj-vscode/src/language/bbj-scope.ts:355-374]
— it never calls `resolveClassByName` and never re-scans the classpath document's current content at
query time. Verified empirically this session in three separate probes (deleted after use, no source
changes committed):
  - Pushing a new `getGlobalNamespace` method onto the already-resolved `BBjAPI` class object
    (same object `getResolvedClass('BBjAPI')` returns) and then parsing
    `BBjAPI().getGlobalNamespace().getValue()` still produced
    `Could not resolve reference to NamedElement named 'getGlobalNamespace'.`
  - Calling `await interop.resolveClassByName('byte')` (which resolves successfully and instantly,
    confirmed by a bare `JavaInteropService` instance resolving `'byte'`/`'void'` with no network
    call) *before* parsing `field protected byte[] bytes`, and the `SimpleTypeRef` for `byte` still
    produced `Could not resolve reference to Class named 'byte'.`

**How to avoid:** Every fixture class and every fixture method the three `parser.test.ts` assertions
and the `linking.test.ts` block need must be added to the arrays `JavaInteropTestService`'s
constructor builds *before* `addDocument` runs — i.e., inside `createBBjApiClass`/a new
`createXxxClass` helper, appended to the `fakeJavaClasses` array at
`bbj-vscode/test/bbj-test-module.ts:70-76`, never via a per-test seam call afterward. This matches
D-01's and D-06's own instructions exactly; the verification above exists to remove any temptation
to "simplify" the fix with a post-construction seam (which would silently not work).

**Warning signs:** A fixture change that "should" fix a DISABLED assertion but the assertion still
fails with the exact same `Could not resolve reference to ...` message — check whether the fixture
edit landed inside the constructor's class-building code or was added via a runtime seam call.

### Pitfall 2: `String` (unqualified) needs a simple-name fixture entry, not just the FQN

**What goes wrong:** `java.lang.String` is already preloaded [VERIFIED: bbj-vscode/test/bbj-test-module.ts:73,386-409],
but `new String()(1)` (the substring-parse DISABLED assertion, no `use java.lang.String`) still fails
with `Could not resolve reference to Class named 'String'.` — verified empirically this session.

**Why it happens:** In production, `loadImplicitImports()` copies every `java.lang.*` class into the
classpath a *second* time under its simple name (`simpleNameCopy.name = simpleName`)
[VERIFIED: bbj-vscode/src/language/java-interop.ts:784-799], which is what makes bare `String`
resolvable without a `use` statement. `JavaInteropTestService.loadImplicitImports()` is overridden to
be a no-op (`return false`) [VERIFIED: bbj-vscode/test/bbj-test-module.ts:168-170], so no simple-name
copy of `String` (or any other implicit-import class) ever exists in the test double's classpath.

**How to avoid:** Add a second constructor-time fixture entry named plain `String` (packageName
`java.lang`) alongside the existing `java.lang.String` entry — mirroring what `loadImplicitImports`
would have produced — rather than trying to make the no-op `loadImplicitImports()` do real work
(which would risk reaching for the network path the test double must never touch).

**Warning signs:** A DISABLED assertion using a bare class name with no `use`/`declare` fails with
`Could not resolve reference to Class named '<Name>'.` even though the FQN is preloaded — check
whether a simple-name alias entry exists, not just the FQN entry.

### Pitfall 3: `JavaInteropTestService.resolveClassByName` bypasses #660's local primitive resolution

**What goes wrong:** The base `JavaInteropService.resolveClassByName` checks `isLocalJavaTypeName`
first and resolves a primitive/array/blank name locally with no network call
[VERIFIED: bbj-vscode/src/language/java-interop.ts:1009-1020, quoting the guard: `if (isLocalJavaTypeName(key)) { return this.resolveClass(localJavaTypeDto(key), token, _depth); }`].
`JavaInteropTestService` **overrides** `resolveClassByName` entirely with a two-line body that never
consults `isLocalJavaTypeName`:
```typescript
// Source: bbj-vscode/test/bbj-test-module.ts:172-175 (verified this session, quoted verbatim)
public override async resolveClassByName(className: string): Promise<JavaClass> {
    // A preloaded class, or a silent stub for anything else — never a socket, never a log.
    return this.getResolvedClass(className) ?? this.stubClass(className);
}
```
So calling `resolveClassByName('byte')` on the test double returns `this.stubClass('byte')` — an
`error`-carrying stub — not the real primitive DTO the base class would build.

**Why it happens:** The override exists to guarantee the test double never opens a socket (its own
comment block above the override explains this, `bbj-vscode/test/bbj-test-module.ts:153-159`), but
in doing so it discards the *local, no-network* primitive-resolution branch too, since that branch
lives inside the same overridden method.

**How to avoid:** Per Pitfall 1, fixing this alone is not sufficient for the `SimpleTypeRef` linking
path the `String[]`/`byte[]` DISABLED assertion needs (that requires constructor-time classpath
entries). But it IS worth fixing for correctness of any *other* test or later phase that calls
`resolveClassByName('byte')`/`'void'`/an array type directly and expects the real local-resolution
shape (no `error` field, `packageName: 'java.lang'`) rather than a stub. The safe fix: have the
override check `isLocalJavaTypeName(className)` first and delegate to `super.resolveClassByName(className)`
for that case (network-safe, since the base class's own guard short-circuits before any `connect()`
call), falling through to the existing `getResolvedClass() ?? stubClass()` behavior otherwise.

**Warning signs:** A test asserting on the *shape* of a resolved primitive class (not just whether a
`SimpleTypeRef` links) sees `error: 'not resolved (test double)'` where production code would never
set `error` for a primitive.

### Pitfall 4: `onDidChangeConfiguration` has no per-field "classpath-affecting" branch — pin actual behavior

**What goes wrong:** D-16 asks for a test covering "a classpath-affecting change that reloads vs one
that doesn't." Read in full this session, the handler's actual post-initialization branch has no
such distinction:
```typescript
// Source: bbj-vscode/src/language/main.ts:245-280 (verified this session, quoted verbatim)
    // Skip Java class reload during initial startup — initializeWorkspace handles it
    if (!workspaceInitialized) {
        // Still apply non-reload settings
        const wsManager = shared.workspace.WorkspaceManager as BBjWorkspaceManager;
        wsManager.setConfigPath(config.configPath || '');
        notifyResolvedConfigPath(wsManager.getResolvedConfigPath());
        configWatcher.updateResolvedPath(wsManager.getResolvedConfigPath());
        return;
    }

    try {
        const javaInterop = BBj.java.JavaInteropService;
        const wsManager = shared.workspace.WorkspaceManager as BBjWorkspaceManager;
        wsManager.setConfigPath(config.configPath || '');
        notifyResolvedConfigPath(wsManager.getResolvedConfigPath());
        configWatcher.updateResolvedPath(wsManager.getResolvedConfigPath());
        logger.info('BBj settings changed, refreshing Java classes...');
        javaInterop.setConnectionConfig(config.interop?.host, config.interop?.port);
        await reloadJavaClassesAndRevalidate();
    } catch (error) {
        console.error('Failed to refresh Java classes after settings change:', error);
    }
```
Every settings-change event that arrives *after* `workspaceInitialized` becomes true triggers
`reloadJavaClassesAndRevalidate()` unconditionally — a `debug`-only or `inlayHints`-only settings
change reloads the whole Java classpath and revalidates every document too, today, in production.

**Why it happens:** The debug/diagnostics/compiler.trigger/compiler/inlayHints settings are applied
earlier in the same handler, unconditionally and with "no startup gate" comments
(`main.ts:210-243`), independent of the `workspaceInitialized` branch below them. There is no
`if (config.interop or config.classpath changed)` guard anywhere in this handler.

**How to avoid:** D-14 requires the extraction to be behaviour-neutral. The test for "a
classpath-affecting change that reloads vs one that doesn't" should be written to pin the **actual**
boundary — pre-init (`workspaceInitialized === false`, never reloads) vs post-init (always reloads)
— rather than asserting a per-field distinction the source does not implement. If the plan intends
a genuine per-field optimization (skip the reload when only `debug`/`inlayHints` changed), that is a
behavior *change*, which D-14 explicitly rules out for this phase; flag it instead as a candidate for
a later phase (or ask in Open Question 1 below) rather than silently changing behavior while writing
"behaviour-neutral" tests.

**Warning signs:** A new test asserts `reloadClasspathAndRecheckDocuments`/`reloadJavaClassesAndRevalidate`
was NOT called for a non-classpath field change post-init — that assertion will fail against today's
actual code and either exposes a real change in scope, or a misreading of D-16.

### Pitfall 5: Whole-suite runs show 2 contention-flaky failures unrelated to this phase

**What goes wrong:** A `--maxWorkers=2` whole-suite run (both `RUN_BBJ_TESTS=0` and `RUN_BBJ_TESTS=1`)
shows two extra failures beyond the known 11 `linking.test.ts` interop failures: a 5000ms timeout in
`test/parser-keyword-statements.test.ts` ("a verifier option whose value is absent is still a parser
error") and an assertion mismatch in `test/functional/installed-extension-e2e.test.ts` ("every
composer kind carries its cue"), plus a documented pre-existing "failed suite, 0 failed tests"
(`installed extension e2e: SETOPTS-in-code`, "No document found for URI" — matches
`STATE.md`'s "114-REVIEW.md ... installed-extension-e2e still counts as a failed suite with 0 failed
assertions (stale installed bundle, pre-existing)").

**Why it happens:** Both the timeout and the assertion mismatch disappear when the same test file is
run in isolation (verified this session: both pass standalone). This matches the project's own
documented pattern ("Whole-suite hook timeouts are contention" memory entry) — under
`--maxWorkers=2` contention, `initializeWorkspace()`/`beforeAll` timing shifts enough to produce
transient failures that are not present when files run alone.

**How to avoid:** When measuring "zero failed tests" for D-04's success criterion, judge on
`numFailedTests` from an isolated or low-contention run, and treat a whole-suite `--maxWorkers=2` run
showing exactly these two extra failures as noise consistent with prior sessions, not new phase-116
scope. Re-run any suspicious whole-suite failure in isolation before treating it as real.

**Warning signs:** A whole-suite run reports more than 11 failures in `RUN_BBJ_TESTS=1` mode, or any
failures in `RUN_BBJ_TESTS=0` mode beyond the pre-existing "failed suite, 0 failed tests" case — the
extra count is very likely contention, not a regression, but must still be re-verified in isolation
before being dismissed.

## Code Examples

### 1. Constructor-time fixture class (existing pattern to extend, D-01/D-02)

```typescript
// Source: bbj-vscode/test/bbj-test-module.ts:346-365 (verified this session — createHashMapClass,
// the exact shape D-02 says to copy for Date/List/LinkedList/Map/Map.Entry/Boolean/java.sql.Date)
function createHashMapClass(container: Classpath): JavaClass {
    const clazz: JavaClass = {
        $type: JavaClass.$type,
        name: 'java.util.HashMap',
        packageName: 'java.util',
        $container: container,
        $containerProperty: 'classes',
        classes: [],
        fields: [],
        methods: [],
        constructors: [],
        deprecated: false
    }
    clazz.methods = [
        makeMethod(clazz, 'put', 'java.lang.Object'),
        // inherited from java.lang.Object; needed so `obj!.getClass()` resolves
        makeMethod(clazz, 'getClass', 'java.lang.Class')
    ]
    return clazz
}
```
New helpers (`createJavaUtilDateClass`, `createJavaUtilListClass`, `createJavaUtilLinkedListClass`,
`createJavaUtilMapClass` — with a nested `Map.Entry` needing `getValue`/`getKey`
[per the todo's failure list at `.planning/todos/pending/2026-09-20-linking-interop-failures-survive-class-warmup.md:37-38`],
`createJavaLangBooleanClass` with a static `TRUE` field, `createJavaSqlDateClass` with a static
`valueOf` method) follow this exact shape and are appended to the `fakeJavaClasses` array at
`test/bbj-test-module.ts:70-76`.

### 2. Nested class naming for `Map.Entry` (verify against `canonicalJavaClassName`)

The `Map.Entry` fixture must use the **canonical dotted spelling** `java.util.Map.Entry`, not
`java.util.Map$Entry`, to match how the test source references it (`use java.util.Map.Entry`,
`new java.util.Map.Entry()` — `linking.test.ts:434,441`) and how
`canonicalJavaClassName` treats a `$` between a letter and a letter as a nested-class separator
converted to `.` [VERIFIED: bbj-vscode/src/language/java-interop.ts:163-170] — meaning either
spelling would canonicalize to the same key if resolved through `resolveClassByName`, but the fixture
is added directly to `classpath.classes` and resolved via `this.resolveClass(clazz)` in the
constructor loop [`test/bbj-test-module.ts:77-80`], which does apply `canonicalJavaClassName` to
`javaClass.name` [VERIFIED: bbj-vscode/src/language/java-interop.ts:1175-1176]. The interop
harness's own fixture uses the `$`-spelling (`'Map$Entry'`, `interop-harness-fake-peer.ts:164`) for a
different reason (its DTOs go over the wire, where the backend's raw naming convention applies) —
don't copy that spelling into this test double; use the dotted form directly so no canonicalization
surprises appear in a test assertion.

### 3. Real-connect suite skeleton (D-10, new file)

```typescript
// Skeleton only — exact names at discretion (D-09/D-10). Verified real method names/signatures
// against bbj-vscode/src/language/java-interop.ts this session.
import { EmptyFileSystem } from 'langium';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { JavaInteropService } from '../src/language/java-interop.js';
import { createBBjServices } from '../src/language/bbj-module.js'; // production DI, NOT the test double —
                                                                     // JavaInteropTestService's connect() is
                                                                     // hard-rejected (bbj-test-module.ts:160-162)
import { startFakePeer } from './interop-harness-fake-peer.js'; // after D-09 generalization

class ExposedInterop extends JavaInteropService {
    public callConnect() { return this.connect(); }
    public callResolveClassByName(name: string) { return this.resolveClassByName(name); }
}

describe('java-interop real connect/timeout/lock (TEST-06)', () => {
    afterEach(() => vi.useRealTimers());

    test('a refused connection (nothing listening) rejects', async () => {
        const interop = new ExposedInterop(createBBjServices(EmptyFileSystem).BBj);
        interop.setConnectionConfig('127.0.0.1', 1); // port 1: refused on loopback in CI sandboxes
        await expect(interop.callConnect()).rejects.toThrow();
    });

    test('a response that never arrives times out', async () => {
        vi.useFakeTimers();
        const peer = await startFakePeer({ getClassInfo: () => new Promise(() => { /* never resolves */ }) });
        const interop = new ExposedInterop(createBBjServices(EmptyFileSystem).BBj);
        interop.setConnectionConfig('127.0.0.1', peer.port);
        const pending = interop.callResolveClassByName('some.Class');
        const assertion = expect(pending).rejects.toThrow(/timeout/i);
        await vi.advanceTimersByTimeAsync(30_000); // RESOLUTION_TIMEOUT_MS, java-interop.ts:252
        await assertion;
        await peer.close();
    });

    test('concurrent resolveClassByName calls are serialized by the resolution lock', async () => {
        const seen: string[] = [];
        const peer = await startFakePeer({
            getClassInfo: (params) => { seen.push(params.className); return { name: params.className, packageName: '', fields: [], methods: [], constructors: [] }; },
        });
        const interop = new ExposedInterop(createBBjServices(EmptyFileSystem).BBj);
        interop.setConnectionConfig('127.0.0.1', peer.port);
        await Promise.all([
            interop.callResolveClassByName('a.One'),
            interop.callResolveClassByName('a.Two'),
            interop.callResolveClassByName('a.Three'),
        ]);
        // Assert `seen` reflects one-at-a-time arrival — exact assertion shape (timestamps vs mere
        // order) is a plan-time decision; the lock only guarantees order, not zero overlap on the
        // TCP layer itself if the peer's own handler is async.
        await peer.close();
    });
});
```
**Open question for the plan:** whether `resolveClassByName` calls for *distinct* class names are
actually serialized by the SAME lock, or only re-entrant calls sharing a `lockToken` are — see Open
Question 2.

### 4. Fake `Connection` for a `register*` handler test (D-15)

```typescript
// Pattern verified this session against bbj-vscode/test/notifications.test.ts:26-33 and
// bbj-vscode/src/language/main.ts:41-50 (the bbj/refreshJavaClasses handler body)
function createFakeConnection() {
    return {
        onRequest: vi.fn(),
        onDidChangeConfiguration: vi.fn(),
        window: {
            showErrorMessage: vi.fn(),
            showInformationMessage: vi.fn(),
        },
        workspace: {
            getConfiguration: vi.fn(),
        },
        languages: {
            inlayHint: { refresh: vi.fn().mockResolvedValue(undefined) },
        },
    } as unknown as Connection;
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|---------------|--------|
| `describe.runIf(isInteropRunning)` gate on `linking.test.ts`'s "Interop related tests" | Gate dropped; block renamed to reflect it is a hermetic test double (D-03) | This phase (TEST-05) | The block runs in CI too, and never again silently reports "24 skipped" with no signal about whether the fixture is actually complete |
| Bare TCP connect probe in `shouldRunBBjTests()` | A real JSON-RPC round trip against the peer (D-05) | This phase (TEST-05/DEBT item 5) | `RUN_BBJ_TESTS` unset stops turning gated suites on just because *something* answers on :5008 |
| `main.ts` inline handler bodies for `bbj/refreshJavaClasses` and `onDidChangeConfiguration` | Extracted into `register*(connection, deps)` modules (D-13), following the pattern `compile-command.ts`/`resolved-config-path-request.ts`/`bbj-hover-handler.ts` already established | This phase (TEST-08) | Handler logic gets real unit-test coverage without `createConnection()` running at module load |
| `JavaInteropTestService.resolveClassByName` silently stubbing every unpreloaded name including primitives | (Recommended by this research, not yet decided as a locked D-item) delegate to `super.resolveClassByName` for `isLocalJavaTypeName` names | Candidate for this phase's D-06 work | Matches #660's already-shipped production behavior; avoids a second, divergent primitive-name list |

**Deprecated/outdated:**
- The `DISABLED:` comment blocks in `parser.test.ts` (lines ~531-534, ~812-816, ~861-865) describe
  causes ("cannot be resolved in EmptyFileSystem test context") that are only partially accurate —
  see Pitfalls 1-3 for the actual current cause of each failure. D-08 removes these comments; do not
  copy their stated rationale into new code comments without re-verifying it, since two of the three
  are now known to be imprecise.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | The exact assertion shape for "concurrent requests serialized by the resolution lock" (timestamp ordering vs. request-arrival-order array) is left to the plan/executor's judgment — no existing test in this repo asserts on cross-request serialization order this way | Code Example 3, Open Question 2 | A weak assertion (e.g., only checking the final result, not ordering) would satisfy D-10's literal test names but not its stated intent ("the server sees one request at a time, in order") |
| A2 | `resolveClassByName` calls for *different* class names funnel through the *same* lock instance (not per-class locks) — inferred from reading `acquireLock`'s single `lockQueue`/`lockHeld` fields (not per-key), but not exercised by a dedicated multi-class-name concurrency test in the existing suite | Code Example 3, Open Question 2 | If two different class names actually resolve concurrently (not serialized), D-10's "concurrent requests serialized" test would need a different trigger (e.g., re-resolving the SAME class name concurrently, which the `_pendingResolutions` map dedups) rather than distinct names |
| A3 | New file names (`java-interop-socket.test.ts`, `refresh-java-classes-request.ts`, `configuration-change-handler.ts`, etc.) shown in the Recommended Project Structure are suggestions only — CONTEXT.md explicitly leaves naming to discretion (D-09/D-13) | Recommended Project Structure | None — purely cosmetic; the plan may pick different names freely |

## Open Questions

1. **Does D-16's "classpath-affecting change that reloads vs one that doesn't" mean the
   pre-init/post-init branch, or a genuine per-field distinction not yet in the source?**
   - What we know: the post-init branch of `onDidChangeConfiguration` unconditionally calls
     `reloadJavaClassesAndRevalidate()` for every settings-change event, verified by reading
     `main.ts:245-280` in full this session (see Pitfall 4).
   - What's unclear: whether the plan should (a) write the test to pin today's actual unconditional
     post-init reload (behaviour-neutral, matches D-14), or (b) treat this as new information that
     changes D-16's scope and flag it back for a user decision before writing a test that could
     assert a behavior the code doesn't have.
   - Recommendation: default to (a) — pin actual behavior — since D-14 is an explicit, locked
     constraint ("existing suites pass without assertion changes") and this phase's stated goal is
     coverage of existing code, not a behavior change. If the plan's author disagrees, surface this
     explicitly as a deviation before implementing option (b).

2. **Is the resolution lock (`acquireLock`/`lockQueue`) actually exercised by concurrent calls for
   *different* class names, or only by re-entrant/duplicate-name calls?**
   - What we know: `acquireLock` takes a `lockToken` object and a *single* `lockQueue`/`lockHeld`
     pair of fields, not a per-class-name map [VERIFIED: bbj-vscode/src/language/java-interop.ts:242-246,558-590].
     `resolveClassByName` also short-circuits identical-in-flight names via `_pendingResolutions`
     before ever reaching `acquireLock` [VERIFIED: bbj-vscode/src/language/java-interop.ts:1038-1041].
   - What's unclear: whether concurrently resolving THREE DIFFERENT class names actually serializes
     through the single lock (making the fake peer see one `getClassInfo` request complete before
     the next departs) or whether they race independently before any of them reaches
     `acquireLock`'s queue (e.g., if the lock is only acquired deep inside `doResolveClassByName`
     after an already-awaited `getRawClass`, three concurrent calls could have three in-flight
     `getRawClass` requests on the wire simultaneously, with the LOCK only serializing the
     synchronous bookkeeping around `resolveClass`, not the network round trip itself).
   - Recommendation: the plan's D-10 task should read `doResolveClassByName`
     (`java-interop.ts:1073-1111`) closely at implementation time and, if needed, write a small
     throwaway probe (as this research did for the three DISABLED assertions) before committing to
     a specific concurrency assertion shape.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | vitest `^4.1.10` [VERIFIED: bbj-vscode/package.json:728] |
| Config file | `bbj-vscode/vitest.config.ts` [VERIFIED, read this session: `include: ['test/**/*.test.ts']`, `exclude: ['out/**', 'node_modules/**']`] |
| Quick run command | `cd bbj-vscode && npx vitest run <file>` (never `--reporter=basic` — not a valid vitest 4.1.10 reporter, confirmed by a `Startup Error` this session) |
| Full suite command (BBj down / hermetic) | `cd bbj-vscode && RUN_BBJ_TESTS=0 npx vitest run --maxWorkers=2` (matches `npm test` in an environment where :5008 is genuinely unreachable; on this dev box :5008 is live, so plain `npm test` alone does NOT simulate "down" — must force `RUN_BBJ_TESTS=0`) |
| Full suite command (BBj up) | `cd bbj-vscode && RUN_BBJ_TESTS=1 npx vitest run --maxWorkers=2` (= `npm run test:bbj`) |

### Measured baseline (this session, both states, verified live)

| Run | Test Files | Tests | Notes |
|-----|-----------|-------|-------|
| `RUN_BBJ_TESTS=0` (hermetic, CI-like) whole suite, `--maxWorkers=2` | 2 failed / 156 passed / 4 skipped (162) | 2 failed / 3466 passed / 71 skipped (3539) | Both failures (`parser-keyword-statements.test.ts` timeout, `installed-extension-e2e.test.ts` assertion) pass when the same file is re-run in isolation — contention noise (Pitfall 5), not a real regression |
| `RUN_BBJ_TESTS=1` (BBj/interop up on :5008) whole suite, `--maxWorkers=2` | 3 failed / 159 passed (162) | 13 failed / 3496 passed / 30 skipped (3539) | 13 = the known 11 `linking.test.ts` interop failures + the same 2 contention flakes as above (re-verified: neither is a real linking.test.ts test) |
| `RUN_BBJ_TESTS=1 npx vitest run test/linking.test.ts -t "Interop"` | 1 failed | 11 failed / 7 passed / 24 skipped (42) | Byte-identical to the 2026-09-20 todo's verbatim failure list — confirmed unchanged this session |
| `RUN_BBJ_TESTS=1 npx vitest run test/functional/issue447-real-interop.test.ts` | 1 passed | 5 passed (5) | Already fixed by Phase 114 (`WireRecordingInteropService`); D-04's issue447 mention is pre-Phase-114 information — likely needs no further change, but re-confirm at plan-verification time since the whole-suite run should still be the authoritative check |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|--------------------|--------------|
| TEST-04 | Substring parse `new String()(1)` validates clean | unit (parser) | `cd bbj-vscode && npx vitest run test/parser.test.ts -t "substring other cases"` | ✅ edit existing |
| TEST-04 | `BBjAPI().getGlobalNamespace().getValue().release()` validates clean | unit (parser) | `cd bbj-vscode && npx vitest run test/parser.test.ts -t "Release usage"` | ✅ edit existing |
| TEST-04 | `String[]`/`byte[]` field and method signature validates clean | unit (parser) | `cd bbj-vscode && npx vitest run test/parser.test.ts -t "Array type ref"` | ✅ edit existing |
| TEST-05 | All 11 previously-failing linking assertions pass hermetically | unit (linking) | `cd bbj-vscode && npx vitest run test/linking.test.ts` | ✅ edit existing |
| TEST-05 | Whole suite reports 0 failed tests, both :5008 states | whole-suite | `cd bbj-vscode && RUN_BBJ_TESTS=0 npx vitest run --maxWorkers=2` and `RUN_BBJ_TESTS=1 npx vitest run --maxWorkers=2` | ✅ (measured above) |
| TEST-05 | `shouldRunBBjTests()` does a real JSON-RPC round trip, not a bare TCP probe | unit | ❌ Wave 0 — new test needed for `test-helper.ts`'s hardened probe | ❌ Wave 0 |
| TEST-06 | Refused connection (nothing listening) rejects through real `connect()` | unit (socket) | ❌ Wave 0 — new file | ❌ Wave 0 |
| TEST-06 | A response that never arrives times out through real socket + fake timers | unit (socket) | ❌ Wave 0 — new file | ❌ Wave 0 |
| TEST-06 | Concurrent requests serialized by the resolution lock, observed on the wire | unit (socket) | ❌ Wave 0 — new file | ❌ Wave 0 |
| TEST-08 | `bbj/refreshJavaClasses` handler: success and failure paths | unit (handler) | ❌ Wave 0 — new file | ❌ Wave 0 |
| TEST-08 | `onDidChangeConfiguration` handler: push/pull settings, host/port change, reload-failure path, pre/post-init reload boundary | unit (handler) | ❌ Wave 0 — new file | ❌ Wave 0 |
| TEST-08 | Coverage reading for the two new handler modules | one-off | `cd bbj-vscode && npx vitest run --coverage` (coverage disabled by default per `vitest.config.ts:10`; pass `--coverage` explicitly) | N/A (one-off, not gated) |

### Sampling Rate
- **Per task commit:** `cd bbj-vscode && npx vitest run <changed file>`
- **Per wave merge:** `cd bbj-vscode && RUN_BBJ_TESTS=0 npx vitest run --maxWorkers=2` (hermetic — the only state guaranteed reproducible in CI)
- **Phase gate:** both `RUN_BBJ_TESTS=0` and `RUN_BBJ_TESTS=1` full-suite runs green (`numFailedTests: 0`, judged after re-running any suspicious failure in isolation per Pitfall 5) before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `test/java-interop-socket.test.ts` (or discretionary name) — covers TEST-06 (D-10)
- [ ] `test/refresh-java-classes-request.test.ts` (or discretionary name) — covers TEST-08's refresh handler (D-15/D-16)
- [ ] `test/configuration-change-handler.test.ts` (or discretionary name) — covers TEST-08's config handler (D-15/D-16)
- [ ] A test for the hardened `shouldRunBBjTests()` JSON-RPC round trip (D-05) — could live in `test/test-helper.test.ts` (does not currently exist) or be folded into an existing gating test
- [ ] Framework install: none — vitest, vscode-jsonrpc, langium already present

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-------------------|
| V2 Authentication | no | Phase adds no auth surface |
| V3 Session Management | no | Phase adds no session surface |
| V4 Access Control | no | Phase adds no access-control surface |
| V5 Input Validation | no (test-only) | The new fake peer accepts test-controlled JSON-RPC params only, over loopback; no untrusted input reaches it |
| V6 Cryptography | no | Not touched |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|-----------------------|
| A new fake peer accidentally binds to a non-loopback interface, becoming reachable from outside the test process | Information Disclosure (theoretical, test-only) | `startFakePeer`'s existing `server.listen(0, '127.0.0.1', ...)` already binds loopback-only with an ephemeral port [VERIFIED: bbj-vscode/test/interop-harness-fake-peer.ts:281] — preserve this exact bind address when generalizing (D-09); do not switch to `0.0.0.0` or omit the host argument |
| A handler test's fake `Connection` silently swallows an error path because `window.showErrorMessage` isn't a real assertion target | (test-quality risk, not a STRIDE category) | Assert on `vi.fn()` call args for both `showErrorMessage`/`showInformationMessage`, per D-15's "assert their effects" requirement |

This phase makes no production-facing changes to authentication, input parsing of untrusted network
data, or cryptography; its only `src/`-facing change (the handler extraction, D-13) is required to be
behaviour-neutral (D-14). No new ASVS-relevant surface is introduced.

## Sources

### Primary (HIGH confidence — read directly this session)
- `bbj-vscode/test/bbj-test-module.ts` — full file read; `JavaInteropTestService` fixture, all `createXxxClass` helpers
- `bbj-vscode/test/test-helper.ts` — full file read; `isPortOpen`, `shouldRunBBjTests`, `initializeWorkspace`
- `bbj-vscode/test/parser.test.ts` (lines 490-889) — the three DISABLED assertions and surrounding context
- `bbj-vscode/test/linking.test.ts` (lines 1-60, 280-478) — the "Interop related tests" describe block and its gate
- `bbj-vscode/src/language/java-interop.ts` — full file read (both halves); `connect`/`createSocket`/`wrapSocket`/`acquireLock`/`resolveClassByName`/`resolveClass`/timeouts/breaker/lock/RequestType constants
- `bbj-vscode/test/interop-harness-fake-peer.ts` — full file read; the fake peer to promote (D-09)
- `bbj-vscode/test/fake-interop-peer.ts` — full file read; the client-side fake to leave alone (D-11)
- `bbj-vscode/test/java-interop-timeouts.test.ts` — full file read; the fake-timer-over-real-socket precedent (D-12)
- `bbj-vscode/test/fake-text-document-connection.ts` — full file read; fake-connection construction pattern
- `bbj-vscode/src/language/main.ts` — full file read; the two handlers TEST-08 extracts, and the actual config-handler branch structure (Pitfall 4)
- `bbj-vscode/src/language/resolved-config-path-request.ts`, `bbj-vscode/src/language/bbj-hover-handler.ts` — the existing `register*(connection, deps)` precedent
- `bbj-vscode/src/language/java-class-reload.ts`, `bbj-vscode/test/java-class-reload.test.ts` — already-extracted reload logic and its existing test
- `bbj-vscode/src/language/bbj-notifications.ts`, `bbj-vscode/test/notifications.test.ts` — the isolation module and its fake-connection test pattern
- `bbj-vscode/test/functional/issue447-real-interop.test.ts` — full file read; the `WireRecordingInteropService` pattern and the three-layer live/forced/hermetic test structure
- `bbj-vscode/tools/interop-test-harness/scaffold.ts` (lines 1-120) — the harness's own `connect()`/`RequestType` constants, to compare against `java-interop.ts`'s private ones
- `bbj-vscode/tools/interop-test-harness/types.ts`/`cases.ts`/`gate.ts` referenced via `bbj-vscode/test/interop-harness.test.ts` (lines 1-70)
- `bbj-vscode/src/language/lib/bbj-api.ts` — the synthetic BBjAPI stub referenced in the DISABLED comment
- `bbj-vscode/src/language/validations/check-unknown-java-member.ts` (lines 1-80) — `isUniversalObjectReceiver`
- `bbj-vscode/src/language/bbj-scope.ts` (lines 81-200, 355-430) — `SimpleTypeRef`/`MemberCall` scope resolution mechanics behind Pitfall 1
- `bbj-vscode/vitest.config.ts` — full file read; include/exclude patterns, coverage thresholds (not CI-gated)
- `bbj-vscode/package.json` — dependency versions and npm scripts (`test`, `test:bbj`, `test:coverage`)
- `.planning/phases/116-java-interop-test-coverage/116-CONTEXT.md` — full file read (user decisions)
- `.planning/REQUIREMENTS.md`, `.planning/STATE.md` — full files read (project history/decisions)
- `.planning/todos/pending/2026-09-20-linking-interop-failures-survive-class-warmup.md` — full file read (root-cause todo)
- Live test runs this session: `RUN_BBJ_TESTS=1 npx vitest run test/linking.test.ts -t "Interop"`,
  `RUN_BBJ_TESTS=1 npx vitest run test/functional/issue447-real-interop.test.ts`,
  `RUN_BBJ_TESTS=0 npx vitest run --maxWorkers=2` (whole suite), `RUN_BBJ_TESTS=1 npx vitest run --maxWorkers=2` (whole suite),
  isolated re-runs of the two contention-flaky files, and three throwaway fixture probes (deleted, not committed) confirming Pitfalls 1-3

### Secondary (MEDIUM confidence)
None — every claim in this document traces to a file read or a live command run this session; no
web/external documentation was needed for this phase's domain (pure in-repo TypeScript/vitest/Langium
mechanics already demonstrated by adjacent code in this same repository).

### Tertiary (LOW confidence)
None.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new dependencies; all versions read directly from `package.json`
- Architecture: HIGH — every pattern cited is an existing, currently-passing file in this repository
- Pitfalls: HIGH — all four pitfalls were verified either by reading exact source lines or by running
  throwaway probes against the real test double this session (probes deleted, not committed; `git
  status` confirmed clean before and after)
- Fixture mechanics (constructor-time-only visibility) — HIGH but not previously documented anywhere
  in the project's memory or todos; this is new information this research surfaced

**Research date:** 2026-09-28
**Valid until:** Until `java-interop.ts`/`main.ts`/`bbj-test-module.ts` change again — this is
fast-moving in-repo mechanics, not external documentation; treat this file as stale the moment any
of Phases 117-121 touch `java-interop.ts` (Phase 121 is a full decomposition) or `main.ts`
(Phase 120's `activate()` split). For phase 116 itself, valid for the life of this phase's planning
and execution.
