# Phase 121: Java Interop Service Decomposition - Context

**Gathered:** 2026-09-29
**Status:** Ready for planning

<domain>
## Phase Boundary

A structural refactor with no behaviour change on the language server's hottest path:

- **REF-09 (#624):** `JavadocProvider` becomes a DI service in `BBjServices`. It is constructor-injected, and the `getInstance()` singleton and the test module's `isInitialized()` workaround are removed.
- **REF-12 (#558):** `JavaInteropService` (`java-interop.ts`, now 1,764 lines, the class starting at line 224) is split into modules along its five responsibilities: connection lifecycle, class resolution and cache, the request lock, classpath loading, and the complete class index. Each module can be imported and tested on its own.

"Unchanged behaviour" means the existing suites pass without assertion changes, compared against the phase base in a scratch worktree when a failure is in doubt. No new capability and no behaviour fix belong in this phase.

</domain>

<decisions>
## Implementation Decisions

### Split shape (REF-12)
- **D-01:** **Front class plus composed collaborators.** `JavaInteropService` stays the single DI service at `services.java.JavaInteropService`. It builds its collaborators itself, as plain classes that are not registered in `BBjServices`, and delegates to them.
- **D-02:** **The protected test hooks stay on `JavaInteropService`** (`createSocket`, `wrapSocket`, `connect`, `getRawClass`, `resolvedClassesCacheLimit`, `inFlightResolutionCount`, `buildCompleteClassIndex`, `clearCompleteClassIndex`, `classpath`, and any other protected member a double overrides). Collaborators receive them as constructor callbacks, for example `() => this.createSocket()`, so a subclass override still takes effect. The six test doubles stay unchanged: `JavaInteropTestService`, `CountingJavaInteropService`, `FakePeerInteropService`, `MockableJavaInteropService`, `LoopbackInterop` and `HangingBackendInterop`. The only allowed exception is the Javadoc wiring in D-10.
- **D-03:** **Sibling files** next to `java-interop.ts`, for example `java-interop-connection.ts`, `java-interop-cache.ts` (resolution and cache), `java-interop-lock.ts`, `java-interop-classpath.ts` and `java-interop-class-index.ts`. The planner picks the final names. This matches `java-class-refresh.ts` and `java-peer-guard.ts`. No `java-interop/` subfolder.
- **D-04:** **The whole public API stays on `JavaInteropService`** as thin delegates (`resolveClassByName`, `getResolvedClass`, `loadClasspath`, `loadImplicitImports`, `ensureCompleteClassIndex`, `hasCompleteClassIndex`, `resolveClassCandidatesBySimpleName`, `findClassCandidatesByPrefix`, `findClassCandidatesBySimpleName`, `parseProgram`, `clearCache`, `setConnectionConfig`, `getConnectionConfig`, `connectionGeneration`, `onConnectionRecovered`, `isClasspathAvailable`, `getChildrenOf`, `getChildOf`, `isKnownJavaPackage`, `storeJavaClass`, …). The 18 `src/` consumer files are untouched.

### Where the other pieces go
- **D-05:** **The parse lane and the circuit breaker go into the connection module**, together with the socket, `_connectionGeneration`, `connectingPromise`, the breaker state, generation and cooldown, and the recovery listeners. The breaker gates `connect()`, and the parse lane uses the same socket hooks and generation, so all of it is connection lifecycle. No sixth module.
- **D-06:** **The package/children tree** (`childrenOfByName`, `storeJavaClass`, `getChildOf`, `getChildrenOf`, `isKnownJavaPackage`) goes with the resolution and cache module. **The implicit-import copies** (`implicitImportCopies`) go with the classpath-loading module, because `loadImplicitImports` builds them.
- **D-07:** **`clearCache()` stays on the front class and orchestrates.** Each collaborator gets a `reset()`-style method, and `clearCache()` calls them in exactly today's order:
  1. the resolved cache, the pending resolutions, the in-flight Phase 2 registry, the children tree and the `java.lang.Object` cache
  2. the complete class index
  3. the lock state
  4. the breaker generation bump, then the connection generation bump, then the breaker reset
  5. the implicit-import copies and the classpath document arrays
  6. connection dispose, then parse-lane dispose and the retired-generation reset

  The `Java interop cache cleared` log line stays as it is.
- **D-08:** **Every symbol importable from `java-interop.ts` stays importable from there** (`InteropTransportError`, `isInteropTransportFailure`, `isLocalJavaTypeName`, `canonicalJavaClassName`, `JAVA_PRIMITIVE_TYPE_NAMES`, `RESOLVED_CLASSES_CACHE_LIMIT`, `INTEROP_BREAKER_*`, `JavaSyntheticDocUri`, `METHOD_NOT_FOUND`, the `ParseProgram*`/`ParseError` types, `JavaInteropService`). A helper may move to the module that uses it if `java-interop.ts` re-exports it, but no import path in `src/` or `test/` changes. Avoid an ESM import cycle between `java-interop.ts` and the new modules: if a module needs a helper that lives in `java-interop.ts`, move the helper into a leaf module and re-export it.

### Javadoc DI wiring (REF-09)
- **D-09:** **Register at `services.java.JavadocProvider`** in `BBjServices`, next to `JavaInteropService`, and add it to `bbj-module.ts`'s type and module. `bbj-hover.ts`, `JavaInteropService` and `bbj-ws-manager.ts` (via `bbjServices.java`, as it already does for `JavaInteropService`) take it from services. The constructor becomes public, and `lazyLoad` keeps its default of `true`. `getInstance()` and `_instance` are deleted. The production once-only initialise (`tryInitializeJavaDoc` guarded by `isInitialized()`, and `initialize()` throwing when already initialised) keeps its current behaviour.
- **D-10:** **The test modules override the factory.** `createBBjTestServices` (`test/bbj-test-module.ts`), plus the services built for `CountingJavaInteropService` and `FakePeerInteropService`, register a `JavadocProvider` that is already initialised with no roots (`initialize([], fs)`). Every services instance gets a fresh provider, so the `isInitialized()` guards in `bbj-test-module.ts:65-67`, `counting-java-interop.ts:106-108` and `fake-interop-peer.ts:91-93` are deleted. Before the first class resolution, check that the provider really is initialised: `initialize()` is async, and the flag is only set synchronously when there are no roots.
- **D-11:** **`javadoc.test.ts`, `inlay-hints-javadoc.test.ts` and `javadoc-markdown-escape.test.ts` change only their setup and spy targets.** `getInstance()` becomes the services' provider (`services.BBj.java.JavadocProvider`) or a `new JavadocProvider()`, and every `expect(...)` stays byte-identical. The #624 regression test goes into `javadoc.test.ts`: two independently configured providers in one process, and an assertion that they share no state (packages, initialised flag, fs access).

### Per-module tests
- **D-12:** **Each of the five extracted modules gets its own focused unit test file**, built with stub callbacks and no `JavaInteropService`:
  - lock: re-entrancy, FIFO order, reset
  - class index: build, simple-name and prefix lookup, clear
  - resolution and cache plus tree: LRU cap, store and `getChildOf`
  - classpath: `loadClasspath` and implicit imports through a stub request function
  - connection: breaker transitions and generation bumps, using a stub socket factory

  These tests are new. The existing `java-interop-*.test.ts` suites, the Phase 116 fake-socket suite and the whole suite also stay as they are, without assertion changes.
- **D-13:** **No performance benchmark.** The evidence is the green suites (the `counting-java-interop` doubles already pin request counts) plus the roadmap's live hand check in both IDEs.

### Claude's Discretion
- Final module and class names, and the exact shape of the collaborator constructor callbacks and dependencies.
- How the lock and the resolution module share `acquireLock`, which the resolution path takes. For example, the resolution module could receive the lock instance.
- Plan split and ordering, within the roadmap's rule: REF-09 first, then one responsibility per step, with the whole suite green after each extraction and the module's new test in the same plan.
- Whether `LruMap` moves into the cache module; it is not exported today.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Scope and requirements
- `.planning/ROADMAP.md` § "Phase 121: Java Interop Service Decomposition": goal, success criteria, planning notes (REF-09 first; warm up large classes before live-interop tests)
- `.planning/REQUIREMENTS.md`: REF-09, REF-12
- GitHub issue #624 (`gh issue view 624`): the JavadocProvider singleton, and the acceptance test with two independent instances
- GitHub issue #558 (`gh issue view 558`): the five responsibilities. Its line numbers refer to an older 955-line file.

### Code being split or rewired
- `bbj-vscode/src/language/java-interop.ts`: `JavaInteropService` (from line 224), `LruMap`, the exported helpers and constants, `clearCache()` (reset order), `acquireLock`/`drainLockQueue`
- `bbj-vscode/src/language/java-javadoc.ts`: `JavadocProvider` (`getInstance`, `initialize`, `isInitialized`)
- `bbj-vscode/src/language/bbj-module.ts`: the `java` service group (type at about line 58, module at about line 95)
- `bbj-vscode/src/language/bbj-hover.ts:20,121`: the `javadocProvider` field and its `isInitialized()` use
- `bbj-vscode/src/language/bbj-ws-manager.ts:134,183-189,365-374`: `bbjServices.java` access and `tryInitializeJavaDoc`

### Test doubles and suites that must stay green
- `bbj-vscode/test/bbj-test-module.ts` (`JavaInteropTestService`, `createBBjTestServices`)
- `bbj-vscode/test/counting-java-interop.ts`, `bbj-vscode/test/fake-interop-peer.ts`
- `bbj-vscode/test/java-interop-service.test.ts`, `java-interop-socket.test.ts`, `java-interop-timeouts.test.ts`, `java-interop-breaker.test.ts`, `java-interop-parse-lane.test.ts`, `java-interop-peer-guard.test.ts`, `java-interop-local-types.test.ts`, `java-interop-nested-class-names.test.ts`
- `bbj-vscode/test/javadoc.test.ts`, `inlay-hints-javadoc.test.ts`, `javadoc-markdown-escape.test.ts` (setup and spy retarget only)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `LruMap` (in `java-interop.ts`, not exported): the LRU for `_resolvedClasses`. It can move to the cache module.
- The Phase 116 fake-socket peer (`test/fake-interop-peer.ts`) and `CountingJavaInteropService`: request-count and socket-level pins that prove behaviour stays the same.
- `test/test-helper.ts` `shouldRunBBjTests()`: the gate for the live-interop tests.

### Established Patterns
- Sibling `java-*.ts` modules (`java-class-refresh.ts`, `java-class-reload.ts`, `java-peer-guard.ts`) take the `JavaInteropService` or its callbacks as arguments.
- Phase 120 split pattern: modules per responsibility, one entry point that calls them in today's order, and no re-export shim unless an importer needs one.
- Test doubles subclass `JavaInteropService` and override protected hooks. No test reaches a private field, so private state can move freely.
- No planning identifiers in source or test comments; issue numbers are fine.

### Integration Points
- `bbj-module.ts` `java` group: adds `JavadocProvider`.
- `bbj-ws-manager.ts`: initialises Javadoc before `loadClasspath` in `initializeWorkspace` (keep this order).
- `JavaInteropService.resolveClass` fills Javadoc during class resolution, so the resolution module needs the injected provider.

</code_context>

<specifics>
## Specific Ideas

- Live-interop checks must warm up large classes first. Cold resolution returns "no document" (memory: java-interop cold-resolution gotcha).
- The phase ends with the roadmap's hand check against a live BBjServices: hover, completion, the missing-USE quick fix and Refresh Java Classes, in both VS Code and IntelliJ. Build both distributables first, and again from the final tree after the code-review fixes.

</specifics>

<deferred>
## Deferred Ideas

### Reviewed Todos (not folded)
- `2026-09-26-intellij-interop-initoptions-key-mismatch.md`: IntelliJ sends `javaInteropHost`/`javaInteropPort`, but the server reads `interopHost`/`interopPort`. Left out because fixing it changes behaviour, and this phase is a pure refactor.
- `2026-09-26-signature-help-and-snippet-peer-name-escaping.md`: matched on keywords only; it is Phase 111 territory (escaping), not decomposition.
- `2026-09-27-windows-intellij-node-download-progress-check.md`: matched on keywords only; a Windows IntelliJ check, unrelated.

</deferred>

---

*Phase: 121-java-interop-service-decomposition*
*Context gathered: 2026-09-29*
