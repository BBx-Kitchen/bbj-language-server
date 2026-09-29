# Phase 116: Java-Interop Test Coverage - Pattern Map

**Mapped:** 2026-09-28
**Files analyzed:** 10 (4 edits with new fixture/test content, 3 new test files, 2 new src modules, 1 edit to main.ts wiring)
**Analogs found:** 10 / 10 (all in-repo; no "no analog" files this phase)

All excerpts below are re-derived from RESEARCH.md's verified reads (same session) to avoid
re-reading files already fully read this session. Every analog path was confirmed git-tracked via
`git ls-files` before being named here.

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `bbj-vscode/test/bbj-test-module.ts` (add `createJavaUtilDateClass`, `createJavaUtilListClass`, `createJavaUtilLinkedListClass`, `createJavaUtilMapClass`+`Map.Entry`, `createJavaLangBooleanClass`, `createJavaSqlDateClass`, `String` simple-name alias, `resolveClassByName` primitive delegation) | test fixture/utility | CRUD (in-memory classpath data) | `createHashMapClass` in the same file | exact |
| `bbj-vscode/test/linking.test.ts` (drop `describe.runIf` gate, rename block) | test | request-response (linking assertions) | itself (edit in place) | exact |
| `bbj-vscode/test/parser.test.ts` (re-enable 3 assertions, remove `DISABLED:` comments) | test | request-response (parse+validate assertions) | itself (edit in place) | exact |
| `bbj-vscode/test/test-helper.ts` (`shouldRunBBjTests()` → real JSON-RPC round trip) | test utility | request-response (probe) | `tools/interop-test-harness/scaffold.ts`'s `connect()` + `RequestType` constants | role-match |
| `bbj-vscode/test/functional/issue447-real-interop.test.ts` (drift fix if needed, D-04) | test | request-response | itself (already rewritten backend-agnostic in Phase 114, verify no change needed) | exact |
| `bbj-vscode/test/interop-harness-fake-peer.ts` (generalize `FakePeerHandlers`/`RequestType` map, D-09) | test infrastructure (fake server) | event-driven / request-response | itself (promote in place) + `java-interop.ts`'s private `RequestType` constants (source of the two extra method names) | exact |
| `bbj-vscode/test/java-interop-socket.test.ts` (NEW, D-10) | test | streaming/event-driven (socket connect/timeout/lock) | `bbj-vscode/test/java-interop-timeouts.test.ts` (`HangingBackendInterop` exposer-subclass pattern) | exact |
| `bbj-vscode/src/language/refresh-java-classes-request.ts` (NEW, D-13) | route/controller (LSP request handler) | request-response | `bbj-vscode/src/language/resolved-config-path-request.ts` | exact |
| `bbj-vscode/src/language/configuration-change-handler.ts` (NEW, D-13) | route/controller (LSP notification handler) | event-driven | `bbj-vscode/src/language/bbj-hover-handler.ts` (`registerConfigAwareHoverHandler`, for the "register after `startLanguageServer`" ordering discipline) + `main.ts`'s current inline `onDidChangeConfiguration` body (to be moved verbatim) | exact |
| `bbj-vscode/test/refresh-java-classes-request.test.ts` + `bbj-vscode/test/configuration-change-handler.test.ts` (NEW, D-15/D-16) | test | request-response / event-driven | `bbj-vscode/test/notifications.test.ts` (fake-`Connection` construction pattern) + `bbj-vscode/test/java-class-reload.test.ts` (how an already-extracted handler module is tested in isolation) | exact |
| `bbj-vscode/src/language/main.ts` (wiring only: replace inline handler bodies with `register*` calls) | wiring/entry point | request-response + event-driven | itself (edit in place); wiring-call shape matches existing `registerCompileRequest`/`registerResolvedConfigPathRequest`/`registerBoundedCodeActionHandler`/`registerComposerCodeLensHandler`/`registerConfigAwareHoverHandler` calls already in the file | exact |

## Pattern Assignments

### `bbj-vscode/test/bbj-test-module.ts` (test fixture, CRUD)

**Analog:** `createHashMapClass`, same file, lines 346-365 (verified this session, quoted in RESEARCH.md Code Example 1)

**Core pattern — constructor-time fixture class factory:**
```typescript
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
        makeMethod(clazz, 'getClass', 'java.lang.Class')
    ]
    return clazz
}
```
Every new fixture class (`java.util.Date`, `java.util.List`, `java.util.LinkedList`,
`java.util.Map` + nested `java.util.Map.Entry`, `java.lang.Boolean`, `java.sql.Date`) copies this
exact shape, giving each class only the members the failing tests reference (D-02): e.g.
`Map.Entry` needs `getValue`/`getKey`, `Boolean` needs a static `TRUE` field, `java.sql.Date`
needs a static `valueOf` method.

**CRITICAL constraint (Pitfall 1, HIGH confidence, empirically verified this session):** every new
class/method MUST be appended to the `fakeJavaClasses` array built inside the constructor, at
`test/bbj-test-module.ts:70-76`, BEFORE `this.langiumDocuments.addDocument(this.classpathDocument)`
runs at `test/bbj-test-module.ts:77-84`. Adding a class or method via any post-construction seam
call does not work — Langium's global scope for `SimpleTypeRef`/`MemberCall` never re-scans the
classpath document after `addDocument`. Do not "simplify" this by adding a runtime seam.

**Simple-name alias pattern (Pitfall 2):** production's `loadImplicitImports()` copies every
`java.lang.*` class under its simple name (`java-interop.ts:784-799`); the test double's override
is a no-op (`bbj-test-module.ts:168-170`). So a bare `String` fixture entry (packageName
`java.lang`, name `String`) must be added alongside the existing `java.lang.String` FQN entry —
mirror the production output, don't make the no-op override do real work.

**`resolveClassByName` primitive-delegation fix (Pitfall 3), current override to extend:**
```typescript
// Source: bbj-vscode/test/bbj-test-module.ts:172-175 (verified this session, quoted verbatim)
public override async resolveClassByName(className: string): Promise<JavaClass> {
    // A preloaded class, or a silent stub for anything else — never a socket, never a log.
    return this.getResolvedClass(className) ?? this.stubClass(className);
}
```
Extend to check `isLocalJavaTypeName(className)` first and delegate to
`super.resolveClassByName(className)` for that case (network-safe — the base class's own guard at
`java-interop.ts:1009-1020` short-circuits before any `connect()` call), falling through to the
existing `getResolvedClass() ?? stubClass()` behavior otherwise. Note this alone is NOT sufficient
for the `String[]`/`byte[]` DISABLED `parser.test.ts` assertion — that needs the constructor-time
classpath entries too (Pitfall 1); this fix is for correctness of any direct
`resolveClassByName('byte')`-style caller.

**Naming convention (Code Example 2):** use the canonical dotted spelling `java.util.Map.Entry`,
not `java.util.Map$Entry`, since the fixture is resolved via `this.resolveClass(clazz)` in the
constructor loop, which applies `canonicalJavaClassName` to `javaClass.name`
(`java-interop.ts:1175-1176`), and the test source references it as `use java.util.Map.Entry` /
`new java.util.Map.Entry()` (`linking.test.ts:434,441`).

---

### `bbj-vscode/test/linking.test.ts` (test, request-response)

**Analog:** itself — edit in place.

**Pattern:** drop the `describe.runIf(isInteropRunning)` gate on the "Interop related tests" block
(around line 294) and rename it to something that no longer claims to exercise live interop, e.g.
`describe('Java class linking (test double)', () => { ... })`. The block then runs unconditionally,
in CI too, gated only by the fixture completeness done in `bbj-test-module.ts` above.

---

### `bbj-vscode/test/parser.test.ts` (test, request-response)

**Analog:** itself — edit in place, three locations (lines ~526-535, ~806-816, ~850-866 per
CONTEXT.md's canonical_refs).

**Pattern:** for each of the three `DISABLED:` blocks:
1. Remove the stale `DISABLED:` comment (its stated rationale is only partially accurate — D-08).
2. Uncomment/re-enable the assertion.
3. Only add `bbj-test-module.ts` fixture support if the assertion still fails after re-enabling —
   check each one individually since `java.lang.String` is already preloaded and primitives/arrays
   now resolve locally (#660) per D-06.
4. The `BBjAPI().getGlobalNamespace().getValue().release()` chain asserts
   `expectNoValidationErrors` (D-07) — the fake `getValue()` returns `Object`, untyped, so
   `release()` on it is not flagged, matching today's real-BBj behavior. No semaphore typing needed.
5. `src/` stays untouched unless an assertion exposes a real LS bug (D-06) — if so, fix in `src/`
   and record it in SUMMARY.

---

### `bbj-vscode/test/test-helper.ts` (test utility, request-response)

**Analog:** `tools/interop-test-harness/scaffold.ts`'s own `connect()` + exported `RequestType`
constants (e.g. `getClassInfoRequest = new RequestType<ClassInfoParams, ClassInfoDto, null>('getClassInfo')`,
verified `scaffold.ts:34-37`), and `java-interop.ts`'s own connect/request pattern for the shape of
a short JSON-RPC round trip over `net`.

**Core pattern — replace the bare TCP probe:** `shouldRunBBjTests()` currently does an
`isPortOpen`-style bare TCP connect. D-05 requires swapping this for a real JSON-RPC round trip
(e.g. a lightweight request like `getAllClassNames` or a purpose-built ping, at plan discretion)
against the same host/port, short-timeout, non-hanging, with every existing caller keeping its
current call shape (still an async boolean-returning function). Model the connect/request/cleanup
sequence on `java-interop.ts`'s `connect()`/`createSocket()`/`wrapSocket()` trio rather than
hand-rolling a new one.

---

### `bbj-vscode/test/interop-harness-fake-peer.ts` (test infrastructure, event-driven, D-09)

**Analog:** itself — promote in place, plus `java-interop.ts`'s private `RequestType` constants as
the source of the two extra method names to add.

**Current shape to generalize** (verified `test/interop-harness-fake-peer.ts:251-298`):
```typescript
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
**Gap to close (D-09):** `FakePeerHandlers` is fixed to the harness's four request types
(`getClassInfo`, `getClassInfos`, `getTopLevelPackages`, `loadClasspath`), imported from
`tools/interop-test-harness/scaffold.ts`'s exported `RequestType` constants. `java-interop.ts` has
its own module-private `RequestType` constants for the same method names plus two more
(`getAllClassNames`, `parseProgram`) at `java-interop.ts:1670-1699`, none exported. Since
`vscode-jsonrpc` dispatches by method-name string, either (a) import the harness's exported
constants for the four shared methods and add two new local ones for the two extra methods, or (b)
parameterize `startFakePeer`'s handler map over method-name strings directly. Either satisfies
D-09; the concrete choice is at plan discretion.

**Security constraint to preserve:** `server.listen(0, '127.0.0.1', ...)` binds loopback-only with
an ephemeral port (`interop-harness-fake-peer.ts:281`) — keep this exact bind address; never switch
to `0.0.0.0` or omit the host argument.

---

### `bbj-vscode/test/java-interop-socket.test.ts` (NEW, test, streaming/event-driven, D-10)

**Analog:** `bbj-vscode/test/java-interop-timeouts.test.ts`, lines 21-42 and 83-99 (verified this
session).

**Exposer-subclass pattern to copy** (do NOT override `connect()`/`createSocket()` — only add
public passthroughs so the REAL implementations run against the fake peer):
```typescript
// Source: bbj-vscode/test/java-interop-timeouts.test.ts:21-42
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
For D-10's suite, the exposer subclass adds only passthroughs (`callConnect()`,
`callCreateSocket()`, `callResolveClassByName()`) with NO overrides, so real `connect`/socket code
runs against the fake peer's real loopback port.

**Fake-timer-over-real-socket pattern** (verified `java-interop-timeouts.test.ts:83-99`):
```typescript
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
Use `createBBjServices(EmptyFileSystem).BBj` (production DI), NOT `JavaInteropTestService` — its
`connect()` is hard-rejected (`bbj-test-module.ts:160-162`). Required coverage (D-10): refused
connection (nothing listening / port 1), a response that times out (peer accepts, no handler
registered so the request hangs, `vi.advanceTimersByTimeAsync` past `RESOLUTION_TIMEOUT_MS = 30_000`
at `java-interop.ts:252`), and concurrent requests serialized by the resolution lock (assert
arrival order on the fake peer side — see RESEARCH.md Open Question 2 before finalizing the exact
assertion shape; read `doResolveClassByName` at `java-interop.ts:1073-1111` first).

**Full skeleton:** see RESEARCH.md "Code Examples § 3" for the complete three-test skeleton
(refused connection / timeout / concurrency), already verified against real method names this
session.

---

### `bbj-vscode/src/language/refresh-java-classes-request.ts` (NEW, controller/route, request-response, D-13)

**Analog:** `bbj-vscode/src/language/resolved-config-path-request.ts`, lines 37-56 (verified this
session).

**Full pattern to copy:**
```typescript
// Source: bbj-vscode/src/language/resolved-config-path-request.ts:37-56
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
Apply this exact three-part shape (`XxxDeps` interface, `createXxxHandler(deps)` factory,
`registerXxxRequest(connection, deps)` wiring function typed via `Pick<Connection, 'onRequest'>`)
to the `bbj/refreshJavaClasses` request body currently inline in `main.ts` (lines ~41-50 per
RESEARCH.md Code Example 4's citation). The deps interface should carry whatever
`reloadJavaClassesAndRevalidate` needs — reuse the already-extracted, already-tested
`reloadClasspathAndRecheckDocuments` from `src/language/java-class-reload.ts` rather than
re-implementing reload sequencing (see Don't-Hand-Roll below).

**Error handling:** match the handler's current inline try/catch shape (window error message on
failure) — this extraction must be behaviour-neutral (D-14): same call order, same messages.

---

### `bbj-vscode/src/language/configuration-change-handler.ts` (NEW, controller/route, event-driven, D-13)

**Analog:** `bbj-vscode/src/language/bbj-hover-handler.ts` (`registerConfigAwareHoverHandler`, for
the "register after `startLanguageServer`" ordering discipline) + the current inline body in
`main.ts:245-280` (verified this session, quoted verbatim) which must move essentially unchanged:

```typescript
// Source: bbj-vscode/src/language/main.ts:245-280 (current body to relocate verbatim)
    // Skip Java class reload during initial startup — initializeWorkspace handles it
    if (!workspaceInitialized) {
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

**CRITICAL behavioral note (Pitfall 4, verified by full read this session):** there is NO
per-field "classpath-affecting vs not" branch in this handler today — every post-init
settings-change event unconditionally reloads. D-16's language most plausibly describes the
pre-init (never reloads) vs post-init (always reloads) boundary, not a genuine per-field gate.
Per RESEARCH.md's Open Question 1 recommendation: write the new test to pin TODAY'S actual
unconditional post-init-reload behavior (satisfies D-14's behaviour-neutral requirement). Do not
silently introduce a real per-field optimization while writing "behaviour-neutral" tests — if a
genuine per-field gate is wanted, flag it back as a scope question rather than deciding it here.

**Wiring/ordering rule to preserve (D-13):** `createConnection()` stays in `main.ts`; no
shared-services module imports `main.ts` (the `bbj-notifications.ts` isolation pattern,
`src/language/bbj-notifications.ts`, must be kept intact). The configuration handler must remain
registered after `startLanguageServer`, matching `bbj-hover-handler.ts`'s
`registerConfigAwareHoverHandler` ordering-discipline precedent.

---

### `bbj-vscode/test/refresh-java-classes-request.test.ts` + `bbj-vscode/test/configuration-change-handler.test.ts` (NEW, test, D-15/D-16)

**Analog:** `bbj-vscode/test/notifications.test.ts`, lines 26-33 (fake-`Connection` construction),
and `bbj-vscode/test/java-class-reload.test.ts` (how an already-extracted handler-adjacent module
is unit-tested in isolation without a real `Connection`).

**Fake-`Connection` pattern to copy:**
```typescript
// Source: pattern verified against bbj-vscode/test/notifications.test.ts:26-33 and
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
Use a minimal structural fake typed via `Pick<Connection, ...>` or `as unknown as Connection` —
implement only the handful of `Connection` methods the handler under test actually calls (see
Don't-Hand-Roll below); do not mock the full interface.

**Required coverage (D-16):** every branch of the configuration handler — push vs pull settings, a
classpath-affecting change that reloads vs one that doesn't (write this as the pre-init/post-init
boundary per Pitfall 4 above, not a per-field gate), the interop host/port change, and the
reload-failure path (assert `window.showErrorMessage`/`console.error` side effect). The refresh
request test needs both its success and failure cases.

**Reuse, don't re-test:** call the real `reloadClasspathAndRecheckDocuments`
(`src/language/java-class-reload.ts`, already covered by `test/java-class-reload.test.ts`) or a
fake matching its `JavaClassReloadServices` shape — assert only that the new handler *calls* it
plus the handler's own error-message/setter side effects. Don't re-derive
`clearCache()` → `loadClasspath()` → `loadImplicitImports()` sequencing inside these new tests.

---

### `bbj-vscode/src/language/main.ts` (wiring, edit in place)

**Analog:** itself — the file already has the target wiring shape for five other handlers
(`registerCompileRequest`, `registerResolvedConfigPathRequest`, `registerBoundedCodeActionHandler`,
`registerComposerCodeLensHandler`, `registerConfigAwareHoverHandler`). Apply the identical call
shape for the two new `register*` functions, replacing the inline handler bodies. `main.ts` keeps
only `createConnection()` and the wiring lines — no handler logic remains inline. D-14: same order
of calls, same messages, configuration handler still registered after `startLanguageServer`.

## Shared Patterns

### `register*(connection, deps)` extraction shape (D-13)
**Source:** `bbj-vscode/src/language/resolved-config-path-request.ts:37-56`
**Apply to:** `refresh-java-classes-request.ts`, `configuration-change-handler.ts`
```typescript
export interface XxxDeps { /* structural, only what the handler calls */ }
export function createXxxHandler(deps: XxxDeps): (...) => Promise<...> { /* body */ }
export function registerXxxRequest(connection: Pick<Connection, 'onRequest'>, deps: XxxDeps): void {
    connection.onRequest(METHOD, createXxxHandler(deps));
}
```

### Constructor-time-only test fixtures (Pitfall 1)
**Source:** `bbj-vscode/test/bbj-test-module.ts:70-84`
**Apply to:** every new fixture class/method for D-01/D-02/D-06 — must land in the constructor's
`fakeJavaClasses` array before `addDocument`, never via a post-construction seam call.

### Loopback-only fake JSON-RPC peer (D-09)
**Source:** `bbj-vscode/test/interop-harness-fake-peer.ts:251-298,281`
**Apply to:** the promoted shared fake peer used by both harness tests and the new
`java-interop-socket.test.ts` suite. Preserve `server.listen(0, '127.0.0.1', ...)` exactly.

### Fake `Connection` for handler tests
**Source:** `bbj-vscode/test/notifications.test.ts:26-33`
**Apply to:** `refresh-java-classes-request.test.ts`, `configuration-change-handler.test.ts` — only
implement the `Connection` methods the handler under test calls.

### Fake timers over a real socket (D-12)
**Source:** `bbj-vscode/test/java-interop-timeouts.test.ts:83-99`
**Apply to:** `java-interop-socket.test.ts`'s timeout case. `vi.useFakeTimers()` +
`vi.advanceTimersByTimeAsync(...)` past the real `RESOLUTION_TIMEOUT_MS`/10s constants; no
injectable-timeout `src/` change (fall back to faking only `setTimeout`/`clearTimeout` if fake
timers and socket I/O interfere).

## No Analog Found

None — every file this phase touches has a strong in-repo analog (see table above). This phase is
explicitly scoped as "generalize/reuse existing modules, not write new mechanisms from scratch"
(RESEARCH.md's own framing), and every file's Match Quality above is "exact."

## Don't Hand-Roll (carried from RESEARCH.md, directly actionable for the planner)

| Problem | Don't Build | Use Instead |
|---|---|---|
| Loopback JSON-RPC test server | A new from-scratch `net.createServer` + `vscode-jsonrpc` wiring | Promote `test/interop-harness-fake-peer.ts` (D-09) |
| Fake `Connection` for handler tests | A full mock of the `vscode-languageserver` `Connection` interface | A minimal structural object per `test/fake-text-document-connection.ts`/`test/notifications.test.ts` |
| Reload-and-recheck sequencing tests | Re-testing `clearCache()`→`loadClasspath()`→`loadImplicitImports()`→recheck from scratch | Call the already-extracted, already-tested `reloadClasspathAndRecheckDocuments` (`src/language/java-class-reload.ts`) |
| Primitive/array Java type resolution | A parallel primitive-name table inside `JavaInteropTestService` | `isLocalJavaTypeName`/`localJavaTypeDto` (`java-interop.ts:90-145`), delegated to via the `resolveClassByName` override fix |

## Metadata

**Analog search scope:** `bbj-vscode/test/`, `bbj-vscode/src/language/`, `bbj-vscode/tools/interop-test-harness/` — all files identified in CONTEXT.md's "Code under change" and RESEARCH.md's "Sources" section, confirmed git-tracked via `git ls-files` before citation.
**Files scanned:** 17 (all listed in CONTEXT.md canonical_refs + RESEARCH.md Sources; no additional Glob/Grep sweep needed since RESEARCH.md already performed full-file reads this session and this mapper avoided re-reading them)
**Pattern extraction date:** 2026-09-28
