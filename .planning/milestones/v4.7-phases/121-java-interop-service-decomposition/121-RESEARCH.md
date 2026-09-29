# Phase 121: Java Interop Service Decomposition - Research

**Researched:** 2026-09-29
**Domain:** TypeScript/Langium language-server internals — dependency-injection wiring (Langium DI) and a stateful-service decomposition (front class + composed collaborators) with zero behaviour change
**Confidence:** HIGH (every claim below is grounded in a `Read`/`Grep` of the actual source and test files in this repo, not training-data recall of Langium or general TS patterns)

## Summary

This phase has two independent halves. REF-09 (Javadoc DI) is small and mechanical but touches a *wide* blast radius: every file that calls `JavadocProvider.getInstance()` must move in the same plan, because the singleton is what makes today's tests pass at all (several test doubles pre-initialize it in their constructor precisely to dodge the "not initialized" throw). REF-12 (the `JavaInteropService` split) is the harder half: five collaborators must be carved out of a 1,764-line class whose test doubles reach deep into its protected surface — not just by overriding methods (already enumerated in CONTEXT.md's D-02), but by *calling* protected members that are never overridden (`resolveClass`, `langiumDocuments`, `classpathDocument`, `_connectionGeneration`). The single riskiest finding of this research: `JavaInteropTestService` overrides the **public** `resolveClassByName`, and the (soon-to-be-extracted) resolution collaborator's own Phase-2 logic recursively calls `resolveClassByName` on itself for every field/method/parameter type. If that internal recursive call is wired collaborator-to-collaborator instead of back through the front class's (possibly overridden) method, `JavaInteropTestService`'s hermetic short-circuit stops taking effect and its 15 fake classes would try to resolve their real member types over a socket that doesn't exist in tests. The same hazard exists for `ensureCompleteClassIndex` (overridden by `JavaInteropTestService`) being called internally by the *not*-overridden `findClassCandidatesByPrefix`. Both are documented in detail below, with a general rule the planner should apply to every public/protected member, not just the ones CONTEXT.md already named.

**Primary recommendation:** Do REF-09 in its own first plan (wide fan-out, but self-contained and low-risk). For REF-12, extract in increasing order of coupling — lock, then class index, then classpath, then connection (breaker + parse lane), and resolution/cache/tree last — and make every collaborator-to-collaborator call that could be intercepted by ANY existing test double go through a constructor-injected callback bound to the front class's own (overridable) method, not a direct call to a sibling collaborator's method. Never let two collaborator modules import each other's `.ts` file directly; the front class (`java-interop.ts`) is the only wiring point, which sidesteps the ESM-cycle risk in D-08 entirely.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Java class resolution/cache/package-tree | API / Backend (language server) | — | In-process cache + AST-linking logic inside the LSP server; no browser/CDN tier exists in this project |
| Connection lifecycle (socket, breaker, parse lane) | API / Backend | Database/Storage-equivalent (external `bbj-ls`/java-interop socket peer at `:5008`) | The language server is the sole client of a TCP/JSON-RPC peer; the "storage" tier here is the external process, out of scope for this phase |
| Classpath / implicit-import loading | API / Backend | — | Populates the in-memory `Classpath` AST document consumed by scope/linking |
| Complete class index | API / Backend | — | Optional server-provided endpoint (`getAllClassNames`), consumed only inside the language server for auto-import suggestions |
| Javadoc lookup (REF-09) | API / Backend | — | File-system-backed lookup service, injected into hover/interop; no client-side (VS Code/IntelliJ) counterpart — both IDEs consume it only via LSP hover/inlay-hint responses |

This project has no browser/CDN/SSR tiers in the conventional sense — it is a single Langium-based LSP server (`bbj-vscode/src/language/`) consumed by two thin IDE clients over LSP. Every capability in this phase lives entirely in the "API/Backend" tier as defined by the template; there is no cross-tier misassignment risk for this phase.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| REF-09 | `JavadocProvider` is an injected DI service instead of a `getInstance()` singleton (#624) | "REF-09: JavadocProvider DI Wiring" section — full call-site inventory, DI registration mechanics, `initialize()` synchronicity gotcha, and every test file that must change in the same plan |
| REF-12 | `JavaInteropService` is split along its five responsibilities, with unchanged behaviour (#558) | "REF-12: JavaInteropService Decomposition" section — field/method-to-collaborator map, cross-collaborator coupling table, the two critical override-dispatch hazards, and a suggested no-cycle extraction order |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

- Search and read with `Grep`/`Glob`/`Read` first; shell `grep`/`find`/`cat` only when a built-in tool cannot do the job, and only against an absolute path (no bare recursive scans, no `.env*`/`*.pem`/`*.key`/credential-store reads).
- Never chain `cd` with `grep`/`find`/`cat`/`sed`/`head`/`tail`; use `git -C <abs path>` instead of `cd` before `git`.
- Scope `git add` to exact paths, never `-A`/`.`.
- `npm run langium:generate` after grammar changes (not applicable — this phase touches no `.langium` grammar).
- All `bbj-vscode/` commands run with cwd = `bbj-vscode/` (`cd /home/coder/repos/bbj-language-server/bbj-vscode && npx vitest run ...`, per repo memory `vitest-cwd-relative-fixtures`).
- Never edit `src/language/generated/` by hand — not applicable here (no grammar change).

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01 Split shape:** Front class plus composed collaborators. `JavaInteropService` stays the single DI service at `services.java.JavaInteropService`. It builds its collaborators itself, as plain classes that are **not** registered in `BBjServices`, and delegates to them.
- **D-02 Protected test hooks stay on `JavaInteropService`:** `createSocket`, `wrapSocket`, `connect`, `getRawClass`, `resolvedClassesCacheLimit`, `inFlightResolutionCount`, `buildCompleteClassIndex`, `clearCompleteClassIndex`, `classpath`, and any other protected member a double overrides. Collaborators receive them as constructor callbacks (e.g. `() => this.createSocket()`) so a subclass override still takes effect. The six test doubles stay unchanged: `JavaInteropTestService`, `CountingJavaInteropService`, `FakePeerInteropService`, `MockableJavaInteropService`, `LoopbackInterop`, `HangingBackendInterop`. The only allowed exception is the Javadoc wiring in D-10.
- **D-03 Sibling files:** next to `java-interop.ts`, e.g. `java-interop-connection.ts`, `java-interop-cache.ts`, `java-interop-lock.ts`, `java-interop-classpath.ts`, `java-interop-class-index.ts`. Planner picks final names. No `java-interop/` subfolder.
- **D-04 Whole public API stays on `JavaInteropService`** as thin delegates: `resolveClassByName`, `getResolvedClass`, `loadClasspath`, `loadImplicitImports`, `ensureCompleteClassIndex`, `hasCompleteClassIndex`, `resolveClassCandidatesBySimpleName`, `findClassCandidatesByPrefix`, `findClassCandidatesBySimpleName`, `parseProgram`, `clearCache`, `setConnectionConfig`, `getConnectionConfig`, `connectionGeneration`, `onConnectionRecovered`, `isClasspathAvailable`, `getChildrenOf`, `getChildOf`, `isKnownJavaPackage`, `storeJavaClass`, … The 18 `src/` consumer files are untouched.
- **D-05 Parse lane + circuit breaker go in the connection module**, with the socket, `_connectionGeneration`, `connectingPromise`, breaker state/generation/cooldown, and recovery listeners. No sixth module.
- **D-06 Package/children tree** (`childrenOfByName`, `storeJavaClass`, `getChildOf`, `getChildrenOf`, `isKnownJavaPackage`) goes with resolution+cache. **Implicit-import copies** (`implicitImportCopies`) go with classpath loading (built by `loadImplicitImports`).
- **D-07 `clearCache()` stays on the front class and orchestrates**, calling each collaborator's `reset()`-style method in exactly today's order (six steps — quoted in full in "REF-12" below). The `Java interop cache cleared` log line stays as-is.
- **D-08 Every symbol importable from `java-interop.ts` stays importable from there** (`InteropTransportError`, `isInteropTransportFailure`, `isLocalJavaTypeName`, `canonicalJavaClassName`, `JAVA_PRIMITIVE_TYPE_NAMES`, `RESOLVED_CLASSES_CACHE_LIMIT`, `INTEROP_BREAKER_*`, `JavaSyntheticDocUri`, `METHOD_NOT_FOUND`, the `ParseProgram*`/`ParseError` types, `JavaInteropService`). A helper may move to the module that uses it if `java-interop.ts` re-exports it. No import path in `src/`/`test/` changes. Avoid an ESM import cycle: if a module needs a helper that lives in `java-interop.ts`, move the helper into a leaf module and re-export it.
- **D-09 Javadoc registered at `services.java.JavadocProvider`** in `BBjServices`, next to `JavaInteropService`, added to `bbj-module.ts`'s type and module. `bbj-hover.ts`, `JavaInteropService`, and `bbj-ws-manager.ts` (via `bbjServices.java`) take it from services. Constructor becomes public; `lazyLoad` keeps default `true`. `getInstance()`/`_instance` deleted. Production once-only initialise (`tryInitializeJavaDoc` guarded by `isInitialized()`, `initialize()` throwing when already initialised) keeps its current behaviour.
- **D-10 Test modules override the factory.** `createBBjTestServices`, plus services built for `CountingJavaInteropService` and `FakePeerInteropService`, register a `JavadocProvider` already initialised with no roots (`initialize([], fs)`). Every services instance gets a fresh provider; the `isInitialized()` guards in `bbj-test-module.ts:65-67`, `counting-java-interop.ts:106-108`, `fake-interop-peer.ts:91-93` are deleted. `initialize()` is async and the flag is only set synchronously when there are no roots — check that the provider really is initialised before the first class resolution.
- **D-11 `javadoc.test.ts`, `inlay-hints-javadoc.test.ts`, `javadoc-markdown-escape.test.ts` change only setup and spy targets.** `getInstance()` becomes the services' provider (`services.BBj.java.JavadocProvider`) or `new JavadocProvider()`; every `expect(...)` stays byte-identical. The #624 regression test (two independently configured providers sharing no state) goes into `javadoc.test.ts`.
- **D-12 Each of the five extracted modules gets its own focused unit test file**, built with stub callbacks and no `JavaInteropService`: lock (re-entrancy, FIFO order, reset); class index (build, simple-name/prefix lookup, clear); resolution+cache+tree (LRU cap, store, `getChildOf`); classpath (`loadClasspath`/implicit imports via a stub request function); connection (breaker transitions/generation bumps via a stub socket factory). These are new tests. Existing `java-interop-*.test.ts`, Phase 116's fake-socket suite, and the whole suite stay unchanged.
- **D-13 No performance benchmark.** Evidence is the green suites (`counting-java-interop` doubles already pin request counts) plus the roadmap's live hand check in both IDEs.

### Claude's Discretion

- Final module and class names, and the exact shape of the collaborator constructor callbacks and dependencies.
- How the lock and the resolution module share `acquireLock`; e.g. the resolution module could receive the lock instance.
- Plan split and ordering, within the roadmap's rule: REF-09 first, then one responsibility per step, whole suite green after each extraction, with the module's new test in the same plan.
- Whether `LruMap` moves into the cache module; it is not exported today.

### Deferred Ideas (OUT OF SCOPE)

- `2026-09-26-intellij-interop-initoptions-key-mismatch.md` — IntelliJ sends `javaInteropHost`/`javaInteropPort`, server reads `interopHost`/`interopPort`. Left out: fixing it changes behaviour; this phase is a pure refactor.
- `2026-09-26-signature-help-and-snippet-peer-name-escaping.md` — matched on keywords only; Phase 111 territory (escaping), not decomposition.
- `2026-09-27-windows-intellij-node-download-progress-check.md` — matched on keywords only; unrelated Windows IntelliJ check.
</user_constraints>

## Current File Sizes (for plan sizing)

| File | Lines | Role |
|------|------:|------|
| `bbj-vscode/src/language/java-interop.ts` | 1,764 | `JavaInteropService` (class body: lines 224-1591), free helpers, request types, exported constants/interfaces |
| `bbj-vscode/src/language/java-javadoc.ts` | 221 (whole file moves conceptually into DI wiring, content mostly unchanged) | `JavadocProvider` |
| `bbj-vscode/src/language/java-peer-guard.ts` | 387 | Unaffected — already a sibling module, imported by `java-interop.ts` for peer-data bounding (`isUsableJavaClassName`, `sanitizeJavaClassDto`, `truncateText`, length constants) |
| `bbj-vscode/src/language/java-class-refresh.ts` | 91 | Reference pattern: takes `JavaInteropService` via a structural `Pick<JavaInteropService, 'clearCache'>` type, not a concrete import cycle |
| `bbj-vscode/src/language/java-class-reload.ts` | 57 | Same reference pattern |

Rough line-count split of the 1,764-line file by responsibility (counting the class body only, lines 224-1591 = 1,368 lines; free functions/types/request-type declarations after the class, lines 1592-1764 = 173 lines, are shared or per-collaborator as noted below):

| Responsibility | Approx. lines (class body) | Notable spans |
|---|---:|---|
| Connection lifecycle (socket, breaker, parse lane, `getRawClass`, `parseProgram`) | ~480 | 226-232, 253-297 (fields), 353-531 (`connect`…`createSocket`), 564-575 (`getRawClass`), 596-732 (`parseProgram`…`sendRequestSafe`) |
| Resolution + cache + package tree | ~520 | 233-250 (fields), 315-346 (cache getters), 538-557 (`getResolvedClass`/`javaLangObject`), 928-999 (candidate lookups, shared with class index), 1001-1486 (`resolveClassByName`…`storeJavaClass`) |
| Request lock | ~40 | 242-246 (fields), 1552-1590 (`acquireLock`/`drainLockQueue`) |
| Classpath / implicit-import loading | ~120 | 276 (`implicitImportCopies` field), 740-847 (`loadClasspath`/`loadImplicitImports`) |
| Complete class index | ~90 | 853-855 (fields), 864-919 (`ensureCompleteClassIndex`…`buildCompleteClassIndex`), shares 928-999 with resolution (candidate lookups span both) |
| `clearCache()` orchestration (stays on front class, D-07) | ~60 | 1492-1550 |
| Constructor + shared fields (`langiumDocuments`, `classpathDocument`, `javadocProvider`, `classpath` getter) | ~35 | 298-313, 533-535 |

The two candidate-lookup methods (`resolveClassCandidatesBySimpleName` at 928-945, `findClassCandidatesByPrefix` at 953-976) straddle class-index and resolution/cache — see "Cross-Collaborator Couplings" below for how CONTEXT.md's grouping resolves this.

## REF-09: JavadocProvider DI Wiring

### Every `JavadocProvider.getInstance()` call site (verified by `Grep`, 2026-09-29)

**Production (`src/`):**

| File | Line(s) | Use |
|---|---|---|
| `bbj-vscode/src/language/java-interop.ts` | 300 | `protected javadocProvider = JavadocProvider.getInstance();` — class-field initializer, must become a constructor parameter |
| `bbj-vscode/src/language/bbj-hover.ts` | 20 | `protected javadocProvider = JavadocProvider.getInstance();` — same pattern, independent instance today |
| `bbj-vscode/src/language/bbj-ws-manager.ts` | 367-369 | Inside the free function `tryInitializeJavaDoc(wsJavadocFolders, fileSystemProvider, cancelToken)` (not a class method) — calls `JavadocProvider.getInstance()`, checks `isInitialized()`, calls `initialize(...)` |

Three **independent** `JavadocProvider.getInstance()` reads in production code today all resolve to the **same module-level singleton** (`JavadocProvider._instance`, a static field) — that is exactly the bug #624 describes and the reason two independently-configured providers in one process cannot exist today. After D-09, each of these three call sites must instead read the one shared instance from `services.java.JavadocProvider` (or receive it via constructor injection, matching how `JavaInteropService` is already obtained via `bbjServices.java.JavaInteropService` in `bbj-ws-manager.ts:134`).

`bbj-ws-manager.ts`'s `tryInitializeJavaDoc` is a **module-level free function**, not a class method — it has no `this` and no services access today; it takes `(wsJavadocFolders, fileSystemProvider, cancelToken)`. To read the DI-registered provider it needs either a fourth parameter (`javadocProvider: JavadocProvider`) passed by its one call site (`BBjWorkspaceManager.initializeWorkspace`, line 193) or to become a private method on `BBjWorkspaceManager`. `BBjWorkspaceManager`'s constructor already captures `bbjServices.java.JavaInteropService` into `this.javaInterop` (line 134) — the natural parallel is `this.javadocProvider = bbjServices.java.JavadocProvider` in the same spot, then pass `this.javadocProvider` into `tryInitializeJavaDoc` (or inline the guard as a private method).

**Test (`test/`), verified by `Grep`:**

| File | Line(s) | Use | Consequence under D-10 |
|---|---|---|---|
| `bbj-vscode/test/bbj-test-module.ts` | 66-67 | `JavaInteropTestService` constructor: `if (!JavadocProvider.getInstance().isInitialized()) { JavadocProvider.getInstance().initialize([], services.shared.workspace.FileSystemProvider); }` | Deleted per D-10; `createBBjTestServices`'s own `BBjTestModule` registers an already-initialised provider instead |
| `bbj-vscode/test/counting-java-interop.ts` | 107-108 | Same guard, `CountingJavaInteropService` constructor | Deleted per D-10; `createCountingInteropServices`'s inline `testModule` (lines 135-139) needs a `java.JavadocProvider` factory added alongside its `java.JavaInteropService` factory |
| `bbj-vscode/test/fake-interop-peer.ts` | 92-93 | Same guard, `FakePeerInteropService` constructor | Deleted per D-10; `createFakePeerServices`'s `FakePeerModule` (lines 226-230) needs the same addition |
| `bbj-vscode/test/java-interop-service.test.ts` | 66-67 | Same guard, `MockableJavaInteropService` constructor (this class is **not** named in D-10's three-factory list) | `createServices()` in this file (lines 142-162) builds its own inline `testModule` with only a `java.JavaInteropService` factory — it will pick up the production `BBjModule`'s `JavadocProvider` factory (uninitialised) unless this test module is *also* given a `java.JavadocProvider` override, or the guard here is left as a direct call against `services.BBj.java.JavadocProvider` (no more `getInstance()`, but still an explicit init call). **This file needs its own decision in the plan** — CONTEXT.md's D-10 names only `createBBjTestServices`, `CountingJavaInteropService` and `FakePeerInteropService`; `MockableJavaInteropService`/`java-interop-service.test.ts` is a fourth call site not covered by the locked decision and must be handled the same way for the suite to stay green. |
| `bbj-vscode/test/java-interop-socket.test.ts` | 45-47 | `newInterop()` helper: `if (!JavadocProvider.getInstance().isInitialized()) { JavadocProvider.getInstance().initialize([], services.shared.workspace.FileSystemProvider); }` — uses plain `createBBjServices` (production module, not test module) | Same as above: a fifth call site, not named in D-10, needing the same treatment (read `services.shared`'s BBj services' `java.JavadocProvider` and initialise it directly, no more static singleton) |
| `bbj-vscode/test/javadoc-markdown-escape.test.ts` | 266, 289, 351, 383, 435 | `vi.spyOn(JavadocProvider.getInstance(), 'getDocumentation').mockResolvedValue(...)` — five spy call sites across the file, all against services built via `createBBjTestServices` in the same `describe` block (lines 143, 242, 479) | Per D-11: retarget each to `vi.spyOn(services.BBj.java.JavadocProvider, 'getDocumentation')` |
| `bbj-vscode/test/inlay-hints-javadoc.test.ts` | 64 | `beforeAll`: `await JavadocProvider.getInstance().initialize([URI.parse('file:///javadoc')], new JavadocFileSystem());` — **explicitly documented today as running "before `createBBjTestServices`, which would otherwise initialize the JavadocProvider singleton with no javadoc sources"** (comment at lines 62-63) | This is the clearest evidence of the #624 bug: two callers race to be first to touch the same static singleton. Under D-09/D-10 this ordering hazard disappears structurally — DI hands each `createBBjTestServices()` call its own instance — but this test must switch to overriding **its own** `java.JavadocProvider` factory (an already-initialised-with-the-fake-FS provider), not rely on being called before `createBBjTestServices`. This is a **required behavioural change to the test's setup shape**, not just a spy retarget — flag for the planner as needing more than D-11's "setup and spy targets" framing suggests, since the current default-empty-provider from D-10 would leave this test with no javadoc sources at all. |
| `bbj-vscode/test/javadoc.test.ts` | 23 | `JavadocProvider.getInstance()` inside `test('Check initialize called', ...)` — asserts `getPackageDoc('test')` throws "not initialized" on a **fresh** provider | Per D-11: replace with `new JavadocProvider()` (constructor is now public) — this test wants a never-initialised instance, which `new JavadocProvider()` gives directly, cleaner than any services plumbing |

**JavadocProvider's own subclass in tests:** `javadoc.test.ts:11-18` declares `class JavadocProviderUnderTest extends JavadocProvider { constructor(lazyLoad = true) { super(lazyLoad); } override async loadJavadocFile(...) {...} }`. Today `JavadocProvider`'s constructor is `protected constructor(lazyLoad: boolean = true)` (line 28 of `java-javadoc.ts`) — a subclass can already call a protected constructor via `super()`, so this file's ability to subclass is unaffected by making the constructor public (D-09). No change needed to this subclass itself, only to the plain (non-subclassed) `new JavadocProviderUnderTest()`/`getInstance()` call sites elsewhere in the same file.

### `initialize()` synchronicity — the D-10 gotcha, verified

`java-javadoc.ts:45-87`:
```
async initialize(roots: URI[], fsAccess: FileSystemProvider, cancelToken: CancellationToken = CancellationToken.None) {
    if (this.isInitialized()) {
        throw new Error("JavadocProvider already initialized");
    }
    this.fsAccess = fsAccess;
    ...
    for (const root of roots.filter(uri => uri.scheme === 'file')) {
        ...
        nodes = await this.fsAccess.readDirectory(root)
        ...
    }
    ...
    this.initialized = true;
    ...
}
```
With `roots = []` (D-10's "already initialised with no roots" case), the `for` loop body never runs — there is no `await` between entry and `this.initialized = true;` other than the function's own microtask boundary. In practice `initialize([], fs)` still returns a `Promise` (the function is `async`), so `this.initialized` is **not** set synchronously from the *caller's* perspective — it is set on the next microtask tick, same as any `async` function with no `await` inside its executed path. A DI factory `(services) => { const p = new JavadocProvider(); p.initialize([], services.shared.workspace.FileSystemProvider); return p; }` (not awaited, since Langium's `Module` factories are synchronous) returns the provider with `initialized` still `false` at the moment the factory returns, flipping to `true` only after the unawaited promise's microtask runs. D-10 flags this exact risk ("`initialize()` is async, and the flag is only set synchronously when there are no roots" is the **intended** end state the planner must verify, not an automatic guarantee) — **verify, don't assume**: a synchronous DI factory cannot `await` the `initialize()` call, so any test that constructs a service and *immediately* (same microtask, before the next `await`) calls `resolveClass`/`getDocumentation` risks a race the empty-roots case does not obviously close. The planner should have the extraction plan add a positive check (e.g. a new unit test asserting `provider.isInitialized() === true` synchronously after the factory-returned instance's constructing microtask, or restructure `initialize()` so the empty-roots path sets `this.initialized = true` synchronously before any `await` point — the loop's `await` is only reached when `roots` is non-empty, so with `roots = []` the function body is fully synchronous up to `this.initialized = true`, meaning the returned Promise is *already resolved* by the time `.then()`/`await` would run, but the **assignment order relative to the DI factory's return statement** still needs a `void factory-created-provider.initialize([], fs)` (fire-and-forget, not awaited) to actually execute its synchronous prefix before the module system hands the object to the next line of code — confirm this holds by reading Langium's `inject()`, or add the explicit test D-10 anticipates).

### Where `bbj-ws-manager.ts` reaches `BBjServices` (existing pattern to mirror)

`bbj-vscode/src/language/bbj-ws-manager.ts:132-134`:
```
this.documentFactory = services.workspace.LangiumDocumentFactory;
const bbjServices = services.ServiceRegistry.all.find(service => service.LanguageMetaData.languageId === 'bbj') as BBjServices;
this.javaInterop = bbjServices.java.JavaInteropService;
```
This is the exact mechanism D-09 says to reuse ("`bbj-ws-manager.ts` (via `bbjServices.java`, as it already does for `JavaInteropService`)"). Add `this.javadocProvider = bbjServices.java.JavadocProvider;` on the next line — no new lookup pattern needed.

## REF-12: JavaInteropService Decomposition

### Field-and-method-to-collaborator map (from a full `Read` of `java-interop.ts`, lines 224-1765)

| Collaborator (D-03 sibling file) | Fields | Methods (★ = D-02 protected test hook; ‡ = D-04 public delegate) |
|---|---|---|
| **Connection** (`java-interop-connection.ts`) | `connection`, `connectingPromise`, `interopHost`, `interopPort`, `breakerState`, `breakerProbeDueAt`, `breakerCooldownMs`, `breakerGeneration`, `_connectionGeneration`★, `recoveryListeners`, `parseLane`, `parseLaneGeneration`, `parseLaneConnecting`, `parseLaneRetiredGeneration` | `connect`★, `throwCircuitOpen`, `onConnectAttemptSettled`, `fireRecoveryListeners`, `onConnectionRecovered`‡, `probeIfDue`, `establishConnection`, `wrapSocket`★, `setConnectionConfig`‡, `getConnectionConfig`‡, `createSocket`★, `getRawClass`★, `parseProgram`‡, `parseLaneConnection`, `openParseLane`, `onParseLaneLost`, `disposeParseLane`, `sendRequestSafe` (private helper, used only by `loadClasspath` today — see coupling below), `connectionGeneration` getter‡ |
| **Resolution + cache + package tree** (`java-interop-cache.ts` or similar) | `_resolvedClasses` (the `LruMap`), `childrenOfByName`, `_inFlightPhase2`, `_pendingResolutions`, `MAX_RESOLUTION_DEPTH` (static), `RESOLUTION_TIMEOUT_MS` (static), `JAVA_LANG_OBJECT` | `resolvedClasses` getter, `resolvedClassesCacheLimit`★, `inFlightResolutionCount`★, `isClasspathAvailable`‡, `getResolvedClass`‡, `javaLangObject` (private), `resolveClassByName`‡, `doResolveClassByName` (private), `createStubClass` (private), `resolveClass`★ (called-not-overridden, see below), `getChildrenOf`‡, `getChildOf`‡, `isKnownJavaPackage`‡, `storeJavaClass`‡, `findClassCandidatesBySimpleName`‡ |
| **Request lock** (`java-interop-lock.ts`) | `lockQueue`, `lockHeld`, `currentLockToken` | `acquireLock` (private), `drainLockQueue` (private) |
| **Classpath / implicit imports** (`java-interop-classpath.ts`) | `implicitImportCopies` | `loadClasspath`‡, `loadImplicitImports`‡ |
| **Complete class index** (`java-interop-class-index.ts`) | `completeClassIndex`, `completeIndexResolved` | `ensureCompleteClassIndex`‡, `hasCompleteClassIndex`‡, `clearCompleteClassIndex`★, `buildCompleteClassIndex`★ |
| **Straddles class index + resolution/cache** | — | `resolveClassCandidatesBySimpleName`‡ (lines 928-945: calls `ensureCompleteClassIndex`, then either the index or `findClassCandidatesBySimpleName` + a probe loop calling `resolveClassByName`), `findClassCandidatesByPrefix`‡ (lines 953-976: calls `ensureCompleteClassIndex`, then either the index or iterates `resolvedClasses`) |
| **Stays on front class** (D-01, D-07) | `langiumDocuments`★ (protected, called directly by `bbj-test-module.ts`), `classpathDocument`★ (protected, called directly by `bbj-test-module.ts`), `javadocProvider` (now DI-injected, D-09) | `classpath` getter★, constructor, `clearCache`‡ (orchestrates, D-07) |

★ marks members CONTEXT.md's D-02 explicitly names as "protected test hooks." The map above adds four members test doubles **call directly without overriding** — `resolveClass`, `langiumDocuments`, `classpathDocument`, `_connectionGeneration` — which D-02's closing clause ("and any other protected member a double overrides") does not literally cover, since these are called, not overridden. They still need to remain protected members with identical names/signatures on `JavaInteropService` (verified against `bbj-test-module.ts` lines 71-94, 150 — see the full quotes in "Protected/Public Member Inventory" below). Unlike the override-needing members, these do **not** need the "constructor callback so an override takes effect" treatment, since nothing overrides them — a plain delegate suffices.

### Protected/Public Member Inventory — every test-double touch point, verified by `Read`

Source of truth: `bbj-vscode/test/bbj-test-module.ts`, `bbj-vscode/test/counting-java-interop.ts`, `bbj-vscode/test/fake-interop-peer.ts`, `bbj-vscode/test/java-interop-service.test.ts`, `bbj-vscode/test/java-interop-socket.test.ts`, `bbj-vscode/test/java-interop-timeouts.test.ts`, `bbj-vscode/test/functional/issue447-real-interop.test.ts` (all read this session).

| Member | Overridden by | Called-through (not overridden) by |
|---|---|---|
| `createSocket` | `MockableJavaInteropService`/`CyclicFakeInteropService`/`HangingMembersInteropService` (java-interop-service.test.ts:71-76), `FakePeerInteropService` (fake-interop-peer.ts:111-132) | `LoopbackInterop` (`callCreateSocket`, java-interop-socket.test.ts:29-31), `HangingBackendInterop` (`callCreateSocket`, java-interop-timeouts.test.ts:39-41) |
| `wrapSocket` | `FakePeerInteropService` (fake-interop-peer.ts:134-147), `WireRecordingInteropService` (functional/issue447-real-interop.test.ts:43) | — |
| `connect` | `HangingBackendInterop` (full replace, java-interop-timeouts.test.ts:24-33) | `LoopbackInterop` (`callConnect`), `MockableJavaInteropService` (`testConnect`), and *implicitly* every other double via internal calls from `getRawClass`/`loadClasspath`/`loadImplicitImports`/`ensureCompleteClassIndex`/`parseProgram` |
| `getRawClass` | `CountingJavaInteropService` (counting-java-interop.ts:117-120, full replace), `CyclicFakeInteropService` (java-interop-service.test.ts:108-121, partially delegates to `super.getRawClass`) | `LoopbackInterop` (`callGetRawClass`), `HangingBackendInterop` (`callGetRawClass`), `MockableJavaInteropService` (`testGetRawClass`) |
| `resolvedClassesCacheLimit` | `CyclicFakeInteropService` (returns `3`), `HangingMembersInteropService` (returns `RESOLVED_CLASSES_CACHE_LIMIT`, un-overriding the override) | — |
| `inFlightResolutionCount` | — | `CyclicFakeInteropService` (`testInFlightCount`) |
| `buildCompleteClassIndex` | — | `JavaInteropTestService.seedCompleteClassIndex` (bbj-test-module.ts:107), `FakePeerInteropService.seedCompleteClassIndex` (fake-interop-peer.ts:217), `MockableJavaInteropService.testBuildCompleteClassIndex` |
| `clearCompleteClassIndex` | — | `JavaInteropTestService.resetCompleteClassIndex` (bbj-test-module.ts:112) |
| `classpath` getter | — | `JavaInteropTestService` constructor (`this.classpath.classes.push(clazz)`, bbj-test-module.ts:88), `FakePeerInteropService.classpathClassCount` (`this.classpath.classes.length`) |
| `resolveClass` (protected, **not in D-02's explicit list**) | — | `JavaInteropTestService` constructor (`this.resolveClass(clazz)`, bbj-test-module.ts:89), `CountingJavaInteropService.resolveRaw` (`this.resolveClass(dto)`, counting-java-interop.ts:124), `MockableJavaInteropService.testResolveClass` |
| `langiumDocuments` (protected field, **not in D-02's explicit list**) | — | `JavaInteropTestService` constructor (`this.langiumDocuments.hasDocument(...)`, `.addDocument(...)`, bbj-test-module.ts:92-93) |
| `classpathDocument` (protected field, **not in D-02's explicit list**) | — | Read transitively via the `classpath` getter everywhere; `.uri` read directly in `JavaInteropTestService` constructor |
| `_connectionGeneration` (protected field, **not in D-02's explicit list**) | — | `JavaInteropTestService.simulateReconnect` (`this._connectionGeneration++`, bbj-test-module.ts:150) — direct field mutation, not a method call; the collaborator holding this field must expose it as a genuinely mutable protected field on the front class (a getter-only delegate is not sufficient) |
| `resolveClassByName` (public, D-04 delegate) | `JavaInteropTestService` (bbj-test-module.ts:182-193, calls `super.resolveClassByName` for local types, else serves from cache/stub) | Called internally, recursively, by `resolveClass`'s own Phase-2 loop (java-interop.ts:1260, 1273, 1279, 1321, 1327) and by `doResolveClassByName` |
| `resolveClassCandidatesBySimpleName` (public, D-04 delegate) | `JavaInteropTestService` (bbj-test-module.ts:156-161, calls `super.resolveClassCandidatesBySimpleName` conditionally) | — |
| `ensureCompleteClassIndex` (public, D-04 delegate) | `JavaInteropTestService` (bbj-test-module.ts:101-103, `return this.hasCompleteClassIndex();`) | Called internally by `findClassCandidatesByPrefix` (java-interop.ts:956) — **not overridden by any double**, so this call site sees whatever `ensureCompleteClassIndex` resolves to at call time |
| `loadClasspath`, `loadImplicitImports` | `JavaInteropTestService` (full no-network replace) | — |

### Two critical override-dispatch hazards (the reason to read this section before designing collaborator wiring)

**Hazard 1 — `resolveClassByName` recursion inside `resolveClass`'s Phase 2.** `JavaInteropTestService.resolveClassByName` (public override) is what makes the test double hermetic: it never calls `connect()`, it only serves from the pre-populated cache or returns a local stub. But `JavaInteropTestService`'s **constructor** calls the *inherited* (not overridden) `resolveClass(clazz)` directly for each of its 15 fake classes (bbj-test-module.ts:89). `resolveClass`'s Phase 2 (java-interop.ts:1256-1332) recursively calls `this.resolveClassByName(field.type, ...)`, `this.resolveClassByName(method.returnType, ...)`, `this.resolveClassByName(parameter.type, ...)` for every member — e.g. resolving `BBjAPI.getGlobalNamespace`'s return type `com.basis.bbj.proxies.BBjNamespace` (bbj-test-module.ts:280) triggers exactly this recursive path **today**, and it resolves correctly only because `this` is the `JavaInteropTestService` instance and `resolveClassByName` dispatches through the prototype chain to the override.

If, after the split, the resolution/cache collaborator's `resolveClass` implementation calls its **own sibling method** for `resolveClassByName` (collaborator-internal call, not routed back through the front class), the override stops taking effect for these recursive calls — because the collaborator is a plain object, not on `JavaInteropService`'s prototype chain, and has no way to see a subclass's override of the front class's `resolveClassByName`. The fix: the resolution/cache collaborator's constructor must receive a callback — e.g. `resolveClassByName: (name, token, depth) => Promise<JavaClass>` — bound to the *front class's own* `resolveClassByName` (`(n, t, d) => this.resolveClassByName(n, t, d)`, closed over the `JavaInteropService` instance in its constructor), and `resolveClass`'s internal Phase-2 logic must call that injected callback for every recursive lookup, not a same-collaborator private method. This mirrors D-02's `() => this.createSocket()` example, just applied to a much more central method than the ones D-02 explicitly names.

**Hazard 2 — `ensureCompleteClassIndex` called from `findClassCandidatesByPrefix`, a different (unoverridden) method.** `JavaInteropTestService` overrides `ensureCompleteClassIndex` to `return this.hasCompleteClassIndex();` (bbj-test-module.ts:101-103) — a short-circuit that avoids ever touching the network. `resolveClassCandidatesBySimpleName` is *also* overridden by `JavaInteropTestService` (so its own internal `ensureCompleteClassIndex` call is moot — it only calls `super.resolveClassCandidatesBySimpleName` when `hasCompleteClassIndex()` is already true, which routes into the index branch, never the network-probing branch). But `findClassCandidatesByPrefix` is **not** overridden by `JavaInteropTestService`, and its base implementation (java-interop.ts:953-976) calls `this.ensureCompleteClassIndex(token)` directly (line 956). If a caller ever invokes `findClassCandidatesByPrefix` on a `JavaInteropTestService` instance and the class-index collaborator's own internal `ensureCompleteClassIndex` bypasses the front class's override, it would attempt the real `connect()`-based probe instead of using the test override — a behaviour change invisible to any test that doesn't specifically exercise this path today. **General rule for the planner:** for *every* public method any double overrides, every internal call site to that method — from any collaborator, including the one that "owns" it — must go through a callback bound to the front class's own (dynamically dispatched) method, never a same-collaborator private call. This is broader than D-02's literal text and should be treated as the actual acceptance bar for "unchanged behaviour," not just the members D-02 happens to name.

### Cross-Collaborator Couplings (dependency graph, no cycles)

| Caller (needs) | Callee (provides) | Concrete call | How to wire (no direct collaborator→collaborator import) |
|---|---|---|---|
| Resolution/cache | Connection | `getRawClass` (via `doResolveClassByName`), `connect` (transitively) | Constructor callback bound to front class's `getRawClass`/`connect` |
| Resolution/cache | Lock | `acquireLock`, read `currentLockToken` (java-interop.ts:1081, `this.currentLockToken ?? {}`) | Per CONTEXT.md's discretion note: "the resolution module could receive the lock instance" — pass the Lock collaborator instance (or a narrow structural interface exposing `acquire`/`currentToken`) directly; Lock has no reverse dependency on Resolution, so this is a one-directional, cycle-free reference |
| Resolution/cache | Javadoc (DI) | `javadocProvider.getDocumentation(javaClass)` (java-interop.ts:1257) | Front class passes its DI-injected `javadocProvider` into the Resolution/cache collaborator's constructor |
| Classpath | Connection | `connect` (loadClasspath via `sendRequestSafe`; loadImplicitImports directly awaits `connect()`) | Constructor callback |
| Classpath | Resolution/cache | `loadImplicitImports` calls `this.resolveClass(javaClass, token)` (java-interop.ts:773) for every fetched class, and directly mutates `this.resolvedClasses.set(...)` (line 790, 796) and `this.childrenOfByName`/tree-building (lines 809-837, building the top-level-package tree that D-06 assigns to Resolution/cache) | Constructor callback for `resolveClass`; **the top-level-package tree-building block (lines 809-837) is presently inlined in `loadImplicitImports` but writes into `childrenOfByName`, which D-06 assigns to Resolution/cache — this needs either a `registerPackageChild(parent, name)`-shaped callback exposed by Resolution/cache, or the whole tree-building block moves into Resolution/cache as a method Classpath calls with the fetched `topLevelPackages` data.** This split is not fully resolved by D-06's text alone; flag as an open design point for the plan (see Open Questions) |
| Class index | Connection | `connect`, `probeIfDue` (java-interop.ts:866, inside `ensureCompleteClassIndex`'s already-resolved fast path) | Constructor callbacks for both; `probeIfDue` is presently `private` on the front class (line 445) and is *only* called from `ensureCompleteClassIndex` today — verify no other caller before deciding whether it moves into Connection (owning) or stays a front-class-orchestrated call |
| Class index / Resolution/cache | (shared) | `resolveClassCandidatesBySimpleName`/`findClassCandidatesByPrefix` read both `completeClassIndex` (Class index) and `resolvedClasses` (Resolution/cache) | These two methods are genuine multi-collaborator orchestrations; CONTEXT.md leaves their exact home to discretion. Simplest option: keep them as front-class methods that call into both collaborators (front class already holds references to both) — do **not** force them into either single collaborator |
| `clearCache` (front class, D-07) | All five collaborators | See exact 6-step order below | Front class calls each collaborator's `reset()` in the order D-07 specifies; no collaborator calls another collaborator's `reset()` |

**D-08's helper-relocation rule, applied concretely:** `canonicalJavaClassName`, `isLocalJavaTypeName`, `localJavaTypeDto`, `JAVA_PRIMITIVE_TYPE_NAMES` are used by **both** Resolution/cache (`resolveClassByName`'s local-type fast path) and by tree-lookup logic (`isKnownJavaPackage` calls `canonicalJavaClassName`, line 1392) — both inside the same Resolution/cache collaborator per D-06, so these helpers can live directly in that collaborator's file and be re-exported from `java-interop.ts` (satisfying D-08) with zero cycle risk, since nothing *else* needs to import them except `java-interop.ts` itself and test files (which already import from `java-interop.js`, unaffected by where the implementation physically lives). `InteropTransportError`/`isInteropTransportFailure` are used by Connection (throws) and by Resolution/cache (`doResolveClassByName`'s catch, line 1107) — put them in the Connection collaborator's file (Connection "owns" the concept of a transport failure) and have Resolution/cache import directly from `java-interop-connection.ts` (one-directional: Resolution/cache → Connection, matching the existing functional dependency; Connection never needs to import from Resolution/cache). `METHOD_NOT_FOUND` is used by Connection (`parseProgram`'s parse-lane retry) and Class index (`ensureCompleteClassIndex`'s catch) — same shape, put it in Connection and have Class index import it directly.

### `clearCache()` exact reset order (D-07, quoted verbatim from CONTEXT.md, cross-checked against the live implementation at java-interop.ts:1492-1550)

1. the resolved cache, the pending resolutions, the in-flight Phase 2 registry, the children tree and the `java.lang.Object` cache — **all Resolution/cache state** (`_resolvedClasses.clear()`, `_pendingResolutions.clear()`, `_inFlightPhase2.clear()`, `childrenOfByName.clear()`, `JAVA_LANG_OBJECT = undefined`)
2. the complete class index — **Class index's `reset()`** (`clearCompleteClassIndex()`)
3. the lock state — **Lock's `reset()`** (`lockQueue = []`, `lockHeld = false`, `currentLockToken = null`)
4. the breaker generation bump, then the connection generation bump, then the breaker reset — **Connection's `reset()`**, three sub-steps in this exact order (`breakerGeneration++`, then `_connectionGeneration++`, then `breakerState = 'closed'; breakerProbeDueAt = 0; breakerCooldownMs = INTEROP_BREAKER_INITIAL_COOLDOWN_MS`)
5. the implicit-import copies and the classpath document arrays — **Classpath's `reset()`** for `implicitImportCopies.clear()`, but `this.classpath.packages = []; this.classpath.classes = []` operates on `classpathDocument`, which **stays on the front class** per D-01 — so this step is split between Classpath's collaborator (implicit-import copies) and the front class itself (classpath document arrays), not a single collaborator call
6. connection dispose, then parse-lane dispose and the retired-generation reset — **Connection's `reset()`**, continued (`connection?.dispose(); connection = undefined`, then `disposeParseLane(); parseLaneRetiredGeneration = -1`)

The `logger.info('Java interop cache cleared')` line (1549) stays as the front class's own last statement, unchanged.

### Suggested extraction order (increasing coupling; REF-09 first per roadmap, order within REF-12 is Claude's Discretion)

1. **REF-09 (Javadoc DI)** — its own plan first. Wide fan-out (7+ files across `src/` and `test/`, see the inventory table above) but each change is mechanical and independently testable; doing it first also removes the `JavadocProvider.getInstance()` calls that several REF-12 collaborators would otherwise still be reaching for during their own extraction.
2. **Lock** — zero external dependents besides Resolution/cache's `acquireLock` call; smallest, safest first REF-12 step. No existing dedicated test file; covered indirectly by `java-interop-service.test.ts`'s concurrency assertions and `java-interop-socket.test.ts`'s "resolution lock serializes concurrent lookups" test (lines 190-249) — both must stay green. New D-12 unit test: re-entrancy, FIFO order, reset.
3. **Class index** — depends only on Connection (`connect`, `probeIfDue`) and exposes `ensureCompleteClassIndex`/`hasCompleteClassIndex`/`buildCompleteClassIndex`/`clearCompleteClassIndex`. Targeted tests: `java-interop-service.test.ts` (`hasCompleteClassIndex` tests around line 280-287, `testBuildCompleteClassIndex`), `java-interop-local-types.test.ts`, `java-interop-nested-class-names.test.ts` (both via `createCountingInteropServices`, exercising the real class-index fallback path).
4. **Classpath** — depends on Connection (`connect`/`sendRequestSafe`) and Resolution/cache (`resolveClass`, tree-writing — see the open coupling above). Targeted tests: `java-interop-socket.test.ts`'s `loadImplicitImports` concurrency test (lines 251-288), any functional live-interop test gated by `shouldRunBBjTests()`.
5. **Connection** (breaker + parse lane) — the largest single extraction (~480 lines), needed by almost every other collaborator, so pulling it out before Resolution/cache lets the callback-injection pattern be proven on the four earlier extractions first. Targeted tests: `java-interop-breaker.test.ts` (310 lines), `java-interop-parse-lane.test.ts` (573 lines), `java-interop-socket.test.ts`, `java-interop-timeouts.test.ts`.
6. **Resolution + cache + package tree** — last, since it is the most coupled (depends on Connection, Lock, Javadoc, and is depended on by Classpath) and carries both override-dispatch hazards documented above. Targeted tests: `java-interop-service.test.ts` (478 lines, the bulk of direct coverage), `java-interop-peer-guard.test.ts` (535 lines), `java-interop-local-types.test.ts`, `java-interop-nested-class-names.test.ts`, plus every `javadoc*.test.ts` file indirectly (via `getDocumentation` calls during Phase 2).

At every step: run the step's targeted files first (`cd /home/coder/repos/bbj-language-server/bbj-vscode && npx vitest run test/<targeted-files>`), then the whole suite, before moving to the next collaborator — matching the roadmap's "whole suite green after each extraction" rule and D-12's "module's new test in the same plan."

## Runtime State Inventory

This is a pure in-process code refactor — no rename of a persisted string, external service configuration, OS-registered state, secret/env-var name, or build artifact is involved.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | None — `JavaInteropService`'s cache (`_resolvedClasses`, `childrenOfByName`, `completeClassIndex`) is entirely in-memory, rebuilt on every language-server start; nothing is persisted to disk or a database under the old class/field names | None |
| Live service config | None — the phase does not touch the wire protocol (`getClassInfo`, `getClassInfos`, `loadClasspath`, `getTopLevelPackages`, `getAllClassNames`, `parseProgram` request method names all stay byte-identical, verified by `Read` of the `RequestType(...)` declarations at java-interop.ts:1670-1699) | None |
| OS-registered state | None | None |
| Secrets/env vars | None | None |
| Build artifacts | None — `services.java.JavaInteropService` and the new `services.java.JavadocProvider` are the only new/changed DI registration keys, and neither is read from an env var, config file, or external registry | None |

## Common Pitfalls

### Pitfall 1: Collaborator constructed as a class-field initializer loses the `resolvedClassesCacheLimit()` override timing
**What goes wrong:** Today, `_resolvedClasses = new LruMap<string, JavaClass>(this.resolvedClassesCacheLimit())` (java-interop.ts:233) is a **class-field initializer** on `JavaInteropService` itself. Per its own doc comment (lines 325-327), this runs "before any subclass field exists," which is why `CyclicFakeInteropService`'s override of `resolvedClassesCacheLimit()` (returning `3`) can safely be a literal-only override with no subclass-state dependency. If the Resolution/cache collaborator is *also* built as a class-field initializer on the front class (rather than in the constructor body), the same "runs before subclass fields exist" ordering holds automatically, since JS field-initializer order is unaffected by this refactor. If instead the collaborator is built inside the constructor **body** after some other subclass-visible setup, the ordering guarantee could silently shift.
**Why it happens:** JS class field initializers for a base class run during the base class's own construction, before the derived class's own field initializers run (which happen after `super()` returns, inside the derived constructor) — but a **method override** (not a field) is visible immediately via the prototype chain, regardless of field-initialization order. The existing code relies on exactly this: `resolvedClassesCacheLimit()` is a method, so the override is visible the instant `this.resolvedClassesCacheLimit()` is called, even mid-base-class-construction.
**How to avoid:** Build the Resolution/cache collaborator (or at minimum, capture its `limit = cacheLimitCallback()` value) at the same point in `JavaInteropService`'s own construction where `_resolvedClasses` is built today — either as a field initializer or as the first statement of the constructor body, calling `this.resolvedClassesCacheLimit()` (or the injected callback) eagerly, synchronously, once. Do not defer the limit read to first-use.
**Warning signs:** `java-interop-service.test.ts`'s `CyclicFakeInteropService`/`HangingMembersInteropService` tests (LRU eviction during cyclic Phase-2 resolution, #497) would start failing or passing for the wrong reason if the cache size silently reverted to the default 5000 instead of the overridden 3.

### Pitfall 2: `resolveClassByName`/`ensureCompleteClassIndex` override-dispatch hazards (see "Two critical override-dispatch hazards" above)
Already covered in full above — repeated here as a pitfall because it is the single most likely way this phase silently breaks `JavaInteropTestService`-based tests (the majority of the suite) while every *targeted* per-collaborator unit test (D-12) still passes, since those new tests are built with stub callbacks and never exercise a real subclass override chain.

### Pitfall 3: `_connectionGeneration` must stay a real mutable field, not a getter-only delegate
**What goes wrong:** `JavaInteropTestService.simulateReconnect()` does `this._connectionGeneration++;` directly (bbj-test-module.ts:150) — a **field increment**, not a method call. If the front class exposes `_connectionGeneration` only as a getter (`get connectionGeneration() { return this.connection.generation; }`, matching the existing **public** `connectionGeneration` getter at java-interop.ts:320-322), the protected field increment used by this test double has no delegate target — `this._connectionGeneration++` would need a working setter too, or the protected field must be re-declared to delegate reads/writes both ways (e.g. `protected get _connectionGeneration() { return this.connection.generation; } protected set _connectionGeneration(v) { this.connection.generation = v; }`).
**Why it happens:** The distinction between the **public** getter-only `connectionGeneration` (D-04 delegate, read-only by design) and the **protected** read-write `_connectionGeneration` field (D-02-adjacent, used by exactly one test double for a direct mutation) is easy to collapse into a single accessor during the extraction.
**How to avoid:** Keep `_connectionGeneration` a genuine protected accessor pair (get+set) on `JavaInteropService`, backed by the Connection collaborator's own generation field, distinct from the public read-only `connectionGeneration` getter.
**Warning signs:** `bbj-test-module.ts`'s breaker/recovery-adjacent tests that call `simulateReconnect()` would silently stop bumping the generation, and any test asserting post-reconnect behaviour would fail with a stale generation number.

### Pitfall 4: `loadImplicitImports`'s inline top-level-package-tree build (lines 809-837) is Classpath code writing into Resolution/cache's data structure
Already covered under "Cross-Collaborator Couplings" above — repeated as a pitfall because it's easy to read D-06 ("package/children tree goes with resolution and cache... implicit-import copies go with classpath loading") as a clean split and miss that the *tree-building code itself* is physically inside `loadImplicitImports` (Classpath) but mutates `childrenOfByName` (Resolution/cache).

## Code Examples

### Existing sibling-module pattern to imitate (verified, not hypothetical)
```typescript
// Source: bbj-vscode/src/language/java-class-refresh.ts:15-18, 34-38 (read this session)
import type { Connection } from 'vscode-languageserver';
import type { JavaInteropService } from './java-interop.js';
import { reloadClasspathAndRecheckDocuments, type JavaClassReloadServices } from './java-class-reload.js';

/** Structural dependencies {@link createReloadJavaClassesAndRevalidate} needs. */
export interface ReloadJavaClassesDeps {
    javaInterop: Pick<JavaInteropService, 'clearCache'>;
    reloadServices: JavaClassReloadServices;
    refreshInlayHints(): void;
    window: Pick<Connection['window'], 'showInformationMessage'>;
}
```
This is the established repo idiom for a sibling module that needs only a *slice* of `JavaInteropService`'s public surface: a structural `Pick<...>` type, not a class import used for `instanceof`/subclassing. The same idiom (structural typing over the front class's public delegate surface) is a reasonable model for how the five new collaborators receive their constructor callbacks, though D-02 already prescribes concrete arrow-function callbacks (`() => this.createSocket()`) for the protected-hook set specifically.

### Existing DI registration pattern to imitate for `JavadocProvider`
```typescript
// Source: bbj-vscode/src/language/bbj-module.ts:58-60, 95-97 (read this session) — JavaInteropService's own registration, the exact shape D-09 says to copy for JavadocProvider
export type BBjAddedServices = {
    // ...
    java: {
        JavaInteropService: JavaInteropService
    },
    // ...
}
export const BBjModule: Module<BBjServices, PartialLangiumServices & BBjAddedServices> = {
    // ...
    java: {
        JavaInteropService: (services) => new JavaInteropService(services)
    },
    // ...
};
```

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | A synchronous DI factory calling `provider.initialize([], fs)` without `await` still leaves `provider.isInitialized() === true` by the time any *subsequent* `await`-separated code in a test runs (since the `roots=[]` path of `initialize()` has no `await` before setting `this.initialized = true`, so its promise resolves on the same microtask turn it was created) | REF-09, "`initialize()` synchronicity" | If wrong, D-10's "already initialised with no roots" factories would hand tests a not-yet-initialised provider, and `getDocumentation`/`getPackageDoc` calls would throw "JavadocProvider not initialized" intermittently depending on microtask timing — the planner should add the explicit synchronous-check unit test this research recommends rather than trust this reasoning alone |
| A2 | `MockableJavaInteropService` (`java-interop-service.test.ts`) and `LoopbackInterop`'s `newInterop()` helper (`java-interop-socket.test.ts`) are NOT covered by D-10's three named factories (`createBBjTestServices`, `CountingJavaInteropService`, `FakePeerInteropService`) and therefore need their own explicit handling in the plan | REF-09 inventory table | If wrong (i.e. if CONTEXT.md's authors intended D-10's list to be exhaustive and these two files don't actually need a change), the planner would add unnecessary work; but leaving them unhandled would leave two `JavadocProvider.getInstance()` calls uncompiled after `getInstance()` is deleted (D-09), so the safer assumption is that they do need updating — this was verified by direct `Grep`+`Read` of both files this session, not inferred |
| A3 | The top-level-package-tree-building block inside `loadImplicitImports` (java-interop.ts:809-837) must either move into the Resolution/cache collaborator as a method Classpath calls with fetched data, or Resolution/cache must expose a tree-mutation callback to Classpath — CONTEXT.md's D-06 does not explicitly resolve which | Cross-Collaborator Couplings | If the planner picks the wrong shape, `getTopLevelPackages`'s tree data could end up split between two collaborators inconsistently, breaking `isKnownJavaPackage`/`getChildOf` for top-level packages loaded this way; low risk since this is called out explicitly as an open point requiring a plan-time decision, not silently assumed away |

## Open Questions

1. **Does `probeIfDue` (java-interop.ts:445-449, private) have any caller besides `ensureCompleteClassIndex` (line 866)?**
   - What we know: A `Grep` of `java-interop.ts` alone shows exactly one call site, inside `ensureCompleteClassIndex`.
   - What's unclear: Whether a future/hidden caller exists outside this file (unlikely, since it's `private`, not `protected`, so no subclass or external file could call it).
   - Recommendation: Treat as Class-index-owned-but-Connection-implemented; wire via the same constructor-callback pattern as `connect`. Since it's `private` (not `protected`), no test double can override it — one less hazard to worry about for this specific member.

2. **Where should the two straddling methods (`resolveClassCandidatesBySimpleName`, `findClassCandidatesByPrefix`) physically live?**
   - What we know: Both call into Class index (`ensureCompleteClassIndex`, `completeClassIndex`) and Resolution/cache (`findClassCandidatesBySimpleName`, `resolvedClasses`, `resolveClassByName`). CONTEXT.md's D-01/D-03 assign every extracted method to exactly one of the five sibling files, but these two genuinely need both.
   - What's unclear: Whether the planner should (a) keep them as front-class methods (simplest, no collaborator "owns" cross-cutting orchestration), (b) put them in Class index with a Resolution/cache callback, or (c) put them in Resolution/cache with a Class-index callback.
   - Recommendation: (a) — front class methods — is simplest and lowest-risk, since the front class already holds references to both collaborators post-construction and these two methods are pure orchestration with no state of their own to own.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.10 (confirmed via `/home/coder/repos/tmp/phase-120/targeted-base.txt`'s recorded run header: `RUN  v4.1.10 /home/coder/repos/bbj-language-server/bbj-vscode`) |
| Config file | `bbj-vscode/vitest.config.ts` (declares `test.include`/`test.exclude`, per Phase 114's TEST-03 fix — already in place) |
| Quick run command | `cd /home/coder/repos/bbj-language-server/bbj-vscode && npx vitest run test/<targeted-file>.test.ts` |
| Full suite command | `cd /home/coder/repos/bbj-language-server/bbj-vscode && npx vitest run --maxWorkers=2` (whole-suite gate is `numFailedTests: 0` per the project's standing decision, not a failing-suite-identity delta — `--reporter=basic` does **not** exist in vitest 4.1.10, per repo memory `planner-vitest-reporter-basic`; use the default reporter or `--reporter=json --outputFile=<path>` if a machine-readable artifact is needed, matching Phase 120's own pattern) |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| REF-09 | `JavadocProvider` is DI-registered, constructor public, `getInstance()`/`_instance` deleted | unit | `cd /home/coder/repos/bbj-language-server/bbj-vscode && npx vitest run test/javadoc.test.ts` | ✅ |
| REF-09 | Two independently configured providers share no state (#624 regression) | unit | Same file, new test per D-11 | ✅ (new test added to existing file) |
| REF-09 | Hover/inlay-hints/markdown-escape suites unaffected in assertions, only setup/spy retargeted | unit | `cd /home/coder/repos/bbj-language-server/bbj-vscode && npx vitest run test/inlay-hints-javadoc.test.ts test/javadoc-markdown-escape.test.ts` | ✅ |
| REF-12 | Each of the five collaborators is independently importable and testable | unit | `cd /home/coder/repos/bbj-language-server/bbj-vscode && npx vitest run test/java-interop-lock.test.ts test/java-interop-class-index.test.ts test/java-interop-cache.test.ts test/java-interop-classpath.test.ts test/java-interop-connection.test.ts` (exact filenames per D-03's planner-chosen names) | ❌ Wave 0 — five new files per D-12 |
| REF-12 | Existing `java-interop-*.test.ts`, Phase 116 fake-socket suite, whole suite pass with no assertion changes | unit+integration | `cd /home/coder/repos/bbj-language-server/bbj-vscode && npx vitest run test/java-interop-service.test.ts test/java-interop-socket.test.ts test/java-interop-timeouts.test.ts test/java-interop-parse-lane.test.ts test/java-interop-breaker.test.ts test/java-interop-peer-guard.test.ts test/java-interop-local-types.test.ts test/java-interop-nested-class-names.test.ts` | ✅ (all 8 files exist) |
| REF-12 | Live hand check: hover, completion, missing-USE quick fix, Refresh Java Classes in both IDEs | manual | Build both distributables (VS Code VSIX + IntelliJ zip) per repo memory `uat-build-both-extensions-first`; live-interop tests warm up large classes first per repo memory `java-interop-cold-resolution-gotcha` | manual-only, justified: no CI harness drives a real VS Code/IntelliJ UI session against a live `bbj-ls` peer |

### Sampling Rate
- **Per task commit:** targeted vitest run for the collaborator/file just touched (see the extraction-order table above for which files pin which step)
- **Per wave/plan merge:** `cd /home/coder/repos/bbj-language-server/bbj-vscode && npx vitest run --maxWorkers=2` (whole suite), plus `npm run lint` and `npm run typecheck:test` (both gates already exist and run in CI per TEST-01/TEST-02)
- **Phase gate:** Full suite green (`numFailedTests: 0`, judged the same way as Phase 120 — `installed-extension-e2e.test.ts` failing as "(suite failed)" with 0 failed assertions is the documented pre-existing stale-bundle flake, not a regression, per repo memory `whole-suite-hook-timeouts-contention` and STATE.md's tech-debt log) before `/gsd-verify-work`; `npm run build` green; live hand check in both IDEs per the roadmap's success criteria

### Recommended base-comparison scratch directory
Following the Phase 120 pattern (`/home/coder/repos/tmp/phase-120/base-sha.txt`, `suite-base.json`, `suite-base-failed.txt`, `targeted-base.txt`, all read this session): capture the same four artifacts under `/home/coder/repos/tmp/phase-121/` at the phase's base commit (`3d7e30211ea190af8e49bbcd30caea0df91b551c`, the current `HEAD` per `git rev-parse HEAD` run this session) before the first extraction plan starts, so any whole-suite failure encountered mid-phase can be diffed against a known-good baseline test-name list rather than re-litigated from scratch.

### Wave 0 Gaps
- [ ] Five new collaborator unit test files per D-12 (`java-interop-lock.test.ts` or similar — exact names follow D-03's chosen module names): lock (re-entrancy, FIFO order, reset), class index (build, simple-name/prefix lookup, clear), resolution+cache+tree (LRU cap, store, `getChildOf`), classpath (`loadClasspath`/implicit imports via a stub request function), connection (breaker transitions/generation bumps via a stub socket factory)
- [ ] `javadoc.test.ts`'s new #624 regression test (two independently configured providers sharing no state — packages, initialised flag, fs access)
- [ ] `/home/coder/repos/tmp/phase-121/` base-comparison artifacts (base SHA, whole-suite JSON+failed-names, targeted-file run) captured before the first extraction plan
- [ ] Framework install: none — vitest, the config, and every existing test file already exist; this phase adds test files, it does not bootstrap test infrastructure

## Security Domain

No new external input, trust boundary, or cryptographic/auth surface is introduced by this phase — it is a structural refactor of code that already exists, with explicitly unchanged behaviour (roadmap: "No new capability and no behaviour fix belong in this phase"). The peer-data bounding logic this phase's Resolution/cache collaborator will call (`isUsableJavaClassName`, `sanitizeJavaClassDto`, `truncateText` from `java-peer-guard.ts`) was hardened in Phase 111 (SEC-03/SEC-04) and is out of scope here — verified by `Read` of `java-interop.ts`'s imports (line 19) showing these functions are consumed, not redefined, by this file.

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | Not touched — no auth surface in this phase |
| V3 Session Management | no | Not touched |
| V4 Access Control | no | Not touched |
| V5 Input Validation | no (pre-existing, unchanged) | `java-peer-guard.ts`'s `sanitizeJavaClassDto`/`isUsableJavaClassName` remain the single owner of peer-data bounding; this phase moves *callers* of these functions between files but does not change the validation logic itself |
| V6 Cryptography | no | Not applicable — no crypto in this phase |

### Known Threat Patterns for this stack
No new threat pattern is introduced. The one pre-existing risk adjacent to this phase — a malformed/hostile peer response reaching the AST unchecked — was closed in Phase 111 (SEC-03) and is unaffected by where `resolveClass`'s implementation physically lives, since `sanitizeJavaClassDto(javaClass)` (java-interop.ts:1193) is called with the same arguments and in the same place in the pipeline regardless of file boundaries.

## Sources

### Primary (HIGH confidence — direct `Read`/`Grep` of repository source, this session)
- `bbj-vscode/src/language/java-interop.ts` (full file, 1,764 lines) — every field, method, helper function, and request-type declaration cited above
- `bbj-vscode/src/language/java-javadoc.ts` (full file, 221 lines) — `JavadocProvider`'s constructor, `initialize`, `isInitialized`, `getDocumentation`, `getPackageDoc`
- `bbj-vscode/src/language/bbj-module.ts` (full file) — DI registration shape (`BBjAddedServices`, `BBjModule`, `createBBjServices`)
- `bbj-vscode/src/language/bbj-ws-manager.ts` (lines 1-200, 350-390) — `tryInitializeJavaDoc`, `bbjServices.java` access pattern
- `bbj-vscode/src/language/bbj-hover.ts` (lines 1-40) — `javadocProvider` field and its `isInitialized()` use
- `bbj-vscode/src/language/java-class-refresh.ts` (lines 1-40) — reference sibling-module pattern
- `bbj-vscode/test/bbj-test-module.ts` (full file, 622 lines) — `JavaInteropTestService`, `createBBjTestServices`, every fake-class factory
- `bbj-vscode/test/counting-java-interop.ts` (full file, 150 lines) — `CountingJavaInteropService`
- `bbj-vscode/test/fake-interop-peer.ts` (full file, 249 lines) — `FakePeerInteropService`
- `bbj-vscode/test/java-interop-service.test.ts` (lines 1-170) — `MockableJavaInteropService`, `CyclicFakeInteropService`, `HangingMembersInteropService`
- `bbj-vscode/test/java-interop-socket.test.ts` (full file, 289 lines) — `LoopbackInterop`, `newInterop()`
- `bbj-vscode/test/java-interop-timeouts.test.ts` (lines 1-50) — `HangingBackendInterop`
- `bbj-vscode/test/javadoc.test.ts` (full file, 159 lines)
- `bbj-vscode/test/javadoc-markdown-escape.test.ts`, `bbj-vscode/test/inlay-hints-javadoc.test.ts` (targeted `Grep`+`Read` of `JavadocProvider` usage)
- `bbj-vscode/test/functional/issue447-real-interop.test.ts` (targeted `Grep`) — `WireRecordingInteropService`
- `.planning/phases/121-java-interop-service-decomposition/121-CONTEXT.md`, `.planning/REQUIREMENTS.md`, `.planning/STATE.md` — locked decisions, requirement definitions, project history
- `/home/coder/repos/tmp/phase-120/base-sha.txt`, `targeted-base.txt`, `suite-base-failed.txt` — Phase 120's base-comparison artifact shape, vitest version confirmation

### Secondary (MEDIUM confidence)
- None — every claim in this document traces to a file read this session; no web search or external documentation lookup was needed (this is a pure in-repo TypeScript/Langium refactor, no new library or framework knowledge required)

### Tertiary (LOW confidence)
- The A1 assumption about `initialize()`'s synchronous-resolution timing (see Assumptions Log) is reasoning from the source code's control flow, not a runtime-verified observation — flagged accordingly

## Metadata

**Confidence breakdown:**
- Standard stack: N/A — no new library/package introduced by this phase
- Architecture (collaborator split, coupling map): HIGH — every field/method/coupling claim is grounded in a direct `Read` of `java-interop.ts` and all seven test-double files, cross-checked against CONTEXT.md's locked decisions
- Pitfalls (override-dispatch hazards): HIGH — traced by reading the actual override chains in the test doubles, not inferred from general JS/TS class semantics alone
- Validation architecture: HIGH — vitest version and command shapes confirmed against a real prior-phase run artifact (`/home/coder/repos/tmp/phase-120/`), not assumed from `package.json` alone

**Research date:** 2026-09-29
**Valid until:** Until this phase's REF-09/REF-12 source changes land (this research describes exact current line numbers and call sites that will shift as soon as the first extraction plan executes) — effectively single-phase-scoped, not a stable 30-day reference
