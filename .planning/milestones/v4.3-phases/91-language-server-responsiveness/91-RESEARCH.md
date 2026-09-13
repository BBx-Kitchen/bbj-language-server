# Phase 91: Language Server Responsiveness - Research

**Researched:** 2026-09-12
**Domain:** Langium-based LSP internals — circuit breaking a JSON-RPC socket peer, LRU-cache/cyclic-recursion races, Langium `IndexManager`/`ScopeComputation`/linker pruning, and per-request cancellation-token isolation on a singleton `CompletionProvider`
**Confidence:** HIGH — every claim below is either read directly from this repo's source this session (`[VERIFIED: path:lines]`, with the load-bearing text quoted verbatim) or from the installed `langium` package's own `.d.ts`/`.js` (`[VERIFIED: node_modules/langium/...]`). No web search was used; this phase's correctness turns entirely on this repo's and Langium 4.3.1's actual code, not on external framework advice.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** `JavaInteropService` gets a three-state circuit breaker (closed / open / half-open)
  guarding connection attempts. Recovery is **request-driven**: once open, lookups short-circuit
  immediately (no socket attempt) until a cooldown elapses; the next lookup after the cooldown is
  let through as a **single** half-open probe. Probe success closes the breaker; probe failure
  reopens it with a longer cooldown, up to a cap. **No background timer.** `clearCache()` (and so
  Refresh Java Classes and classpath-affecting settings changes) resets it to closed.
- **D-02:** While the breaker is open, N distinct unresolved classes cost about one connect timeout
  in total, then each short-circuits — ROADMAP success criterion 2. The breaker must not trip on a
  slow-but-connected peer (research Pitfall 6): connect-level failures count; a connected peer that
  is slow to answer `getClassInfo` does not trip it the same way.
- **D-03:** **Stub caching narrows to genuine "not found".** A stub produced by a transport failure —
  breaker open, connect refused, the 10 s socket connect timeout, the 10 s `getRawClass` request
  timeout, the 30 s chain timeout — is returned to the caller but **not** stored in
  `resolvedClasses` (`createStubClass(className, false)`), so the class resolves normally once the
  peer is back. A stub for a class the backend answered but could not find stays cached as today.
  Without this, success criterion 2's "resumes" is meaningless: today every failure stub is cached
  for the life of the process.
- **D-04:** On the breaker's open → closed transition (a probe succeeds after an outage), **re-check
  open files once**: reset `file`-scheme documents to `DocumentState.Parsed` and run
  `DocumentBuilder.update(...)`, reusing step 4 of `main.ts` `reloadJavaClassesAndRevalidate`
  (extract it into a shared helper rather than duplicating it). No `clearCache()`, so resolved
  classes are kept. Stale "unresolved class" diagnostics clear without the user typing.
- **D-05:** **One error popup per outage.** `notifyJavaConnectionError` (today: one popup per failed
  connect, no dedupe) fires once, on the closed → open transition, with its existing message text.
  A failed half-open probe is silent (log only). Nothing is shown on recovery besides the
  diagnostics clearing. IntelliJ's own interop status-bar health probe is untouched and is not
  consulted by the breaker.
- **D-06:** **Breaker only — the global resolution lock stays.** `acquireLock` / `lockQueue` /
  `currentLockToken` and the re-entrant lock-token scheme are unchanged. Lookups with a healthy peer
  still serialize (startup preload speed unchanged). Replacing the lock with per-class concurrency
  is deferred.
- **D-07:** **#497 guard = an in-flight registry beside the LRU.** A separate map of classes that
  `resolveClass` has registered but whose async member-type step (Phase 2) is still running. The entry
  is added where `resolveClass` does `resolvedClasses.set(className, javaClass)` before Phase 2, and
  removed in a `finally` covering **every** exit path (success, thrown error, chain timeout,
  cancellation). The fast paths — `resolveClassByName`'s `resolvedClasses.has` check (before the
  `_pendingResolutions` lookup), `doResolveClassByName`'s post-lock double-check, and
  `resolveClass`'s re-entry check — consult the registry as well as the LRU. `LruMap` itself is not
  modified, so `RESOLVED_CLASSES_CACHE_LIMIT = 5000` still bounds it. `clearCache()` clears the
  registry.
- **D-08:** The registry's hard guarantee is **"empty once every resolution has settled"** — success
  criterion 3. Do not assert it stays at or below `MAX_RESOLUTION_DEPTH` (Pitfall 7's suggestion):
  `loadImplicitImports()` calls `resolveClass` for every class of eight packages via `Promise.all`
  **outside** the lock, so many classes are legitimately in flight at once.
- **D-09:** `collectLocalSymbols` **mirrors `bbj-linker.ts` `link()` exactly** for external documents.
  `BBjWorkspaceManager.isExternalDocument()` is unchanged (its "check that document is part of the
  workspace folders" TODO stays open). Where the linker, for an external document, links a BBj
  class member's own references and its method parameters and then calls `treeIter.prune()`,
  symbol collection processes the same member signature nodes and skips the member's body, including
  the linker's private-member handling. This also skips the Java class resolutions `processNode`
  would otherwise start for those bodies. Files under a PREFIX already get no body linking today, so
  no user-visible change is expected; USE-statement caching (`cachedUseStatements`) and the synthetic
  classpath document's `classesMapScope` must behave exactly as before.
- **D-10:** `getBBjClassesFromFile` no longer scans every `BbjClass` in the index per lookup. The
  mechanism is Claude's discretion (see below), bound by: results are never stale after a file is
  added, changed or removed; matching stays case-insensitive on normalized paths against the current
  document's directory, every workspace root (#378) and every prefix; the `::path::Name` renaming for
  `simpleName === false` and the fallback for synthetic regex-extracted index entries (no AST node)
  are preserved.
- **D-11:** Rule stated during discussion and not contested: **one completion request's cancellation
  never affects another request's result.** The `activeCancelToken` instance field goes away; the
  token reaches `completeAutoImportClasses` per request, never through state shared on the singleton
  provider (research Pitfall 8). The second layer counts too: `autoImportPrefixCache` shares one
  in-flight `findClassCandidatesByPrefix` promise across requests for up to its TTL, and that promise
  is created with the **first** caller's token. A cancelled first request must not reject or empty a
  concurrent second request's lookup for the same prefix.
- **D-12:** **RESP-01 proof = deterministic counters + loose timing.** A synthetic multi-document
  workspace at two sizes (small vs. large). The hard gate is work counters that stay flat as the
  workspace grows: index elements examined per `::file::Class` lookup, and nodes visited inside
  external documents during local symbol collection. Add a coarse wall-clock ratio with generous
  headroom so the test is still literally a timing regression test, and it must not flake on GitHub CI
  or under whole-suite contention.
- **D-13:** **RESP-02/03/04 proof = fake peer + fake timers in plain `npm test`.** No live :5008 and
  no new `RUN_BBJ_TESTS`-gated tests. Following `test/java-interop-timeouts.test.ts`'s override
  pattern and `vi.useFakeTimers`:
  - **RESP-02:** an unreachable peer that later comes back. N distinct classes finish in about one
    connect timeout; recovery needs no `clearCache()`; exactly one notification per outage;
    transport stubs are not cached; open documents are re-checked once on recovery.
  - **RESP-03:** a forced eviction during a cyclic Phase-2 resolution. No 30 s stall, no stub, and
    the registry is empty after success, timeout and cancellation.
  - **RESP-04:** two concurrent completion requests on two documents, with the first cancelled after
    the second starts. The first observes its own cancellation and the second is unaffected,
    including through the per-prefix memo.
- **D-14:** **UAT = one live outage check** in one IDE, against distributables rebuilt from the final
  tree. With a BBj file that uses Java classes open: stop BBjServices, then confirm one error popup
  and no multi-second stall. Restart BBjServices, then confirm the stale unresolved-class diagnostics
  clear on their own, with no edit and no Refresh Java Classes.

### Claude's Discretion

- Breaker trip threshold (#504 says "after the first failure"), initial cooldown, backoff factor and
  cap, and the exact classification of which errors count as connect-level (D-02).
- The `getBBjClassesFromFile` mechanism (D-10): the issue's literal per-file cache keyed by
  `bbjFilePath` + document URI, or a normalized-path → exported-classes index rebuilt lazily after
  index updates.
- How the RESP-04 token is carried (explicit parameter threading, a per-request `WeakMap` keyed by a
  fresh request object, or `AsyncLocalStorage` — the server only runs under Node) and how the prefix
  memo is made cancellation-safe (e.g. memoize a token-free lookup and apply each request's own token
  at its own await), within D-11.
- **Research item — recovery sequence:** if the peer was unreachable at startup (or restarted, losing
  its state), `loadClasspath` / `loadImplicitImports` may never have completed against the current
  peer. The researcher must check whether the peer keeps classpath state across reconnects. If it
  does not, D-04's recovery must re-run those loads (still without `clearCache()`) before re-checking
  documents, or user-classpath classes would be cached as genuine "not found" (D-03).
- **Research item — background Phase 2 after a chain timeout:** `doResolveClassByName` returns a stub
  when its 30 s race fires, but `resolveClass` keeps running. D-07's `finally` therefore runs only when
  that background work settles. Planning must make sure it does settle (token and request timeouts
  bound it), so D-08's "empty after settle" is provable.
- Whether a class evicted from the LRU during its own Phase 2 is re-inserted when Phase 2 completes.
- The test seam used to force an eviction (e.g. an injectable cache limit) and the counters' seam for
  D-12.

### Deferred Ideas (OUT OF SCOPE)

- Replace the global resolution lock with per-class concurrent resolution (faster startup and
  validation with a healthy peer). Rejected for this phase by D-06.
- Narrow `isExternalDocument()` so a PREFIX file inside a workspace folder, or open in the editor,
  gets full body linking and symbol collection (resolves its TODO; changes linker diagnostics).
- A background interop health probe, or sharing IntelliJ's status-bar probe with the language server.
- An info "Java interop service reachable again" message on recovery.
- The broader CPU-stability mitigations from #232 beyond #505.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| RESP-01 (#505) | Scope resolution and symbol collection cost no longer scales with total workspace size, proven by a timing test on a synthetic multi-document workspace | `BBjIndexManager` reverse-index mechanism (§Standard Stack/Architecture Patterns), `collectLocalSymbols` pruning mirroring `bbj-linker.ts`, test harness reusing `lazy-prefix-loading.test.ts`'s pattern |
| RESP-02 (#504) | Unreachable java-interop peer: total wait ≈ one connect timeout, not one per class; breaker resets on cache clear/Refresh Java Classes | Circuit breaker placement, connect-level vs. slow-peer error classification, recovery-sequence finding (classpath state is NOT preserved across reconnect — §Common Pitfalls Pitfall A), D-03 stub-caching narrowing |
| RESP-03 (#497) | No 30 s stall / stub for a class that genuinely resolves, caused by LRU eviction racing its own cyclic resolution | In-flight Phase-2 registry design, exact mechanism of the eviction-induced stall (§Common Pitfalls Pitfall B), injectable-cache-limit test seam |
| RESP-04 (#498) | Concurrent completion requests on different documents each honor their own cancellation token | `AsyncLocalStorage` vs. `WeakMap` analysis against Langium's actual `completionFor`/`completionForCrossReference` call chain, `autoImportPrefixCache` token-free-memo fix, confirmed request interleaving in `createRequestHandler` |
</phase_requirements>

## Summary

This phase is four independent, code-localized fixes inside `bbj-vscode/src/language/` — no grammar,
no new dependency, no host (VS Code/IntelliJ) change. All four bugs were pre-diagnosed by GitHub
issues #505/#504/#497/#498 (three sourced from the Phase 67 code review) with file:line evidence that
still matches current `main` almost exactly (line numbers drift a few lines, mechanisms are unchanged)
`[VERIFIED: bbj-vscode/src/language/java-interop.ts, bbj-scope.ts, bbj-scope-local.ts, bbj-completion-provider.ts — read this session]`.

The single most consequential new finding from this session is for **RESP-02/D-04's recovery
sequence**: both the local dev java-interop service and the production `bbj-ls` backend spin up a
**brand-new `InteropService` instance per accepted socket connection** — confirmed by reading
`java-interop/src/main/java/bbj/interop/SocketServiceApp.java:53` and
`/home/coder/repos/bbj-ls/src/main/java/bbj/interop/LanguageService.java:87`, both literally
`var interopService = new InteropService();` inside the connection-accept loop. `bbj-ls`'s own class
comment says outright: *"A new InteropService is created per editor connection, but BBjServices hands
out the same ClassLoader instance for a given SSCP, so the scan result can be shared across
connections."* — the **scan result** (Guava `ClassPath`) may be shared via a static weak-keyed cache,
but the **loaded classpath itself** (`classLoader`/`classPath` instance fields, and which SSCP or
custom jars were requested via `loadClasspath`) is **not** preserved across a reconnect: a fresh
`InteropService` starts back at the default SSCP (`getSSCP(DEFAULT_SSCP)` in the constructor). This
means D-04's "no `clearCache()`, so resolved classes are kept" is correct for `resolvedClasses`
(pure client-side data, safe to keep), but the recovery sequence **must also re-run
`loadClasspath(settings.classpath)` + `loadImplicitImports()`** against the new connection before
re-checking documents — otherwise a class that is only in the user's custom classpath will get a
*genuine* "Class not found" answer from the new default-SSCP-backed peer, and per D-03 that genuine
not-found gets cached forever, defeating the whole point of D-04's recovery.

The second major finding is for **RESP-03**: tracing the exact eviction/cyclic-recursion race shows
the failure is not (only) in the `resolveClassByName`→`_pendingResolutions` path (which already
dedupes correctly) but in **`resolveClass()`'s own direct-entry re-entry check**
(`java-interop.ts:653`, `if (this.resolvedClasses.has(className))`) combined with `loadImplicitImports()`
calling `resolveClass()` **directly**, bypassing `_pendingResolutions` registration entirely
(`java-interop.ts:328`). D-07's separate in-flight registry, populated at the exact point
`resolvedClasses.set(className, javaClass)` runs before Phase 2 (`java-interop.ts:708`) and consulted
by all three fast paths, closes this regardless of which entry point (`resolveClassByName` or direct
`resolveClass`) started the chain.

The third finding is for **RESP-04**: Langium 4.3.1's `DefaultCompletionProvider.completionFor` /
`completionForCrossReference` signatures genuinely carry no cancellation token
(`node_modules/langium/lib/lsp/completion/completion-provider.d.ts:147-148`) because Langium's own
internal algorithm invokes them without one — so "parameter threading" through those two override
points is not mechanically available. `AsyncLocalStorage` (Node builtin, no new dependency, already
implied by CONTEXT.md's "the server only runs under Node") is the mechanism that actually works here,
and `createRequestHandler` (`node_modules/langium/lib/lsp/language-server.js:500-521`) confirms two
concurrent `textDocument/completion` requests for different documents genuinely interleave on this
server (no per-connection completion mutex; each request is an independent `async` handler function).

**Primary recommendation:** implement the breaker as a small state machine placed in front of
`connect()`/`establishConnection()` in `java-interop.ts`, wire its open→closed recovery through a
callback registered from `main.ts` (mirroring `bbj-notifications.ts`'s existing "avoid importing
main.ts into shared services" isolation pattern) that reruns `loadClasspath`+`loadImplicitImports`
before the existing step-4 document re-check; add a small `_inFlightPhase2` map beside the LRU in
`java-interop.ts` for RESP-03; extend the already-existing `BBjIndexManager` subclass
(`bbj-index-manager.ts`) with a normalized-path reverse index for RESP-01's `getBBjClassesFromFile`,
and mirror `bbj-linker.ts`'s `treeIter.prune()` in `collectLocalSymbols` for RESP-01's symbol-collection
half; and switch `BBjCompletionProvider` from its `activeCancelToken` field to a Node
`AsyncLocalStorage<CancellationToken>` for RESP-04, decoupling `autoImportPrefixCache`'s shared promise
from any individual caller's token.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Java class resolution + circuit breaker (RESP-02, RESP-03) | API/Backend (language server, `java-interop.ts`) | — (Java backend is an external service boundary, not touched) | Purely server-side network-resilience logic; the JSON-RPC socket to `java-interop`/`bbj-ls` is an external service dependency, not a tier this phase modifies |
| Scope resolution / symbol collection (RESP-01) | API/Backend (language server, `bbj-scope.ts`, `bbj-scope-local.ts`, `bbj-index-manager.ts`) | — | Pure in-process Langium document/index bookkeeping; no client involvement |
| Completion cancellation isolation (RESP-04) | API/Backend (language server, `bbj-completion-provider.ts`) | — | The LSP `textDocument/completion` handler and its per-request token lifecycle are entirely server-side; VS Code/IntelliJ clients already send correct per-request tokens today |
| Error/notification surfacing (D-05's popup) | API/Backend (language server via `bbj-notifications.ts`) | Browser/Client + Frontend-in-JVM (renders `window/showMessage`) | The server decides *when* to notify (dedup logic); the client renders the notification unchanged — no new client code needed |

**Why this matters here:** all four requirements are 100% server-tier work. The Deferred Ideas list
(background health probe shared with IntelliJ's status bar, IntelliJ-side changes) is explicitly
scoped out precisely because it would cross into the IDE-client tier, which ROADMAP's "Depends on:
Nothing (independent; pure language-server internals)" already rules out.

## Standard Stack

No new runtime dependency is required. This phase adds/changes only code inside
`bbj-vscode/src/language/*.ts`, using facilities already installed:

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `langium` | 4.3.1 `[VERIFIED: bbj-vscode/node_modules/langium/package.json]` | `IndexManager`/`DocumentBuilder`/`DefaultCompletionProvider` base classes this phase extends | Already the project's core framework; no alternative considered |
| Node.js `node:async_hooks` (`AsyncLocalStorage`) | Node builtin (whatever Node ships with the LS runtime) | Per-request cancellation-token propagation for RESP-04 | Builtin, zero install; confirmed available in this environment (`node -e "require('async_hooks').AsyncLocalStorage"` → `available`); no existing use of it in this codebase, so this is a **new pattern**, not a new package |
| `vitest` | ^4.1.10 `[VERIFIED: bbj-vscode/package.json:713]` | `vi.useFakeTimers()`/`vi.advanceTimersByTimeAsync()` for D-13's fake-timer regression tests | Already used identically by `test/java-interop-timeouts.test.ts` |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `AsyncLocalStorage` for the completion token (RESP-04) | A `WeakMap<CompletionParams, CancellationToken>` populated in `getCompletion` | Requires `CompletionContext` (the object actually passed to `completionFor`/`completionForCrossReference`) to carry a stable reference back to the originating `CompletionParams`/request object; Langium's `CompletionContext` interface (`document`, `textDocument`, `features`, offsets, `position` — `node_modules/langium/lib/lsp/completion/completion-provider.d.ts:33-54`) has no such field, and `buildContexts()` (which manufactures `CompletionContext` instances, one or more per request) itself takes no token parameter, so there is no clean injection point without also patching `buildContexts`. `AsyncLocalStorage` avoids this because it doesn't need a shared object identity — it rides the async call stack. |
| An in-flight registry beside the LRU (RESP-03, D-07) | Simply increase `RESOLVED_CLASSES_CACHE_LIMIT` or make the LRU unbounded | Doesn't fix the race (a large-enough classpath can always exceed any fixed bound in one session) and reintroduces the unbounded-memory-growth problem `RESOLVED_CLASSES_CACHE_LIMIT` was added to fix (`P61-D3-001`, `java-interop.ts:34-40`) |
| A reverse path→classes index inside `BBjIndexManager` (RESP-01, D-10) | The issue's literally-worded "cache keyed by `bbjFilePath` + document URI" (a request-shaped LRU cache in `bbj-scope.ts` itself) | A request-keyed cache still needs correct invalidation on file add/change/remove, which `BBjIndexManager` already has native hook points for (`updateContent`/`remove`/`removeContent`) since it is the object that already recomputes `bbj-scope-local.ts`'s exports per document. Building the cache in `bbj-scope.ts` instead would require either duplicating that invalidation wiring or making `bbj-scope.ts` listen to the same `DocumentBuilder`/`IndexManager` events `BBjIndexManager` already implements — strictly more code for the identical guarantee. |

**Installation:** none — no `npm install` needed for this phase.

## Package Legitimacy Audit

**No external packages are added by this phase.** All four fixes are implemented with code already
present (`langium`, `vscode-jsonrpc`, `vitest`) or Node's own `async_hooks` builtin. No `npm view`/
registry check is applicable.

## Architecture Patterns

### System Architecture Diagram

```
                         textDocument/completion (RESP-04)
   VS Code / IntelliJ ────────────────────────────────────────►  connection.onCompletion
   (LSP4IJ / vscode-  ◄────────────────────────────────────────  (createRequestHandler,
    languageclient)         CompletionList response                langium/lsp/language-server.js)
                                                                          │
                                                                          │ per-request, NOT serialized
                                                                          │ (waitUntilPhase awaits only
                                                                          │  THIS document's Linked state)
                                                                          ▼
                                                          BBjCompletionProvider.getCompletion(doc, params, token)
                                                                          │
                                              ┌───────────────────────────┼────────────────────────────┐
                                              │ AsyncLocalStorage.run(token, …) wraps this call (new)    │
                                              ▼                                                          ▼
                                 super.getCompletion() → buildContexts()               completionForCrossReference()
                                 → completionFor()/completionForCrossReference()  ──►  completeAutoImportClasses()
                                                                                              │
                                                                                              │ findClassCandidatesByPrefixCached
                                                                                              │ (token-free shared promise; each
                                                                                              │  caller re-checks its OWN token
                                                                                              │  via ALS.getStore() after await)
                                                                                              ▼
                                                                                   JavaInteropService.findClassCandidatesByPrefix
                                                                                              │
                       ┌──────────────────────────────────────────────────────────────────────┘
                       │
                       ▼
       resolveClassByName(className, token) ──► resolvedClasses.has? ──yes──► return cached JavaClass
       (RESP-02/RESP-03)                          │no
                                                   ▼
                                    _inFlightPhase2.has? (NEW, RESP-03) ──yes──► return in-flight object
                                                   │no
                                                   ▼
                                    _pendingResolutions.has? ──yes──► await same promise
                                                   │no
                                                   ▼
                                    doResolveClassByName() ──► acquireLock() ──► CIRCUIT BREAKER (NEW, RESP-02)
                                                                                       │
                                                                    closed ────────────┼──────────── open
                                                                       │                              │
                                                                       ▼                              ▼
                                                          connect() → getRawClass()         short-circuit stub
                                                          (10s socket / 10s request         (createStubClass,
                                                           timeouts unchanged)                cache:false — D-03)
                                                                       │
                                                                       ▼
                                                          resolveClass(javaClass) — Phase 1 (sync)
                                                          resolvedClasses.set() + _inFlightPhase2.set() (NEW)
                                                                       │
                                                                       ▼
                                                          Phase 2 (async, per-field/method resolveClassByName
                                                          recursion) — 30s RESOLUTION_TIMEOUT_MS race in
                                                          doResolveClassByName; Phase 2 itself is NOT
                                                          cancelled by that race and runs to its own
                                                          completion in the background (finally removes
                                                          _inFlightPhase2 entry — D-08)

       Breaker open→closed transition (probe succeeds) ──► recovery callback (NEW, registered from main.ts,
                                                              NOT imported into java-interop.ts):
                                                              loadClasspath(settings.classpath)
                                                              → loadImplicitImports()
                                                              → reset open file-scheme docs to Parsed
                                                              → DocumentBuilder.update(docUris, [])
                                                              (steps 2-4 of main.ts's existing
                                                               reloadJavaClassesAndRevalidate, WITHOUT
                                                               step 1's clearCache())

       :: file :: Class reference (RESP-01)
       bbj-scope.ts getBBjClassesFromFile() ──► BBjIndexManager.getBBjClassesByPath(normalizedPath) (NEW)
                                                  O(1) map lookup, NOT indexManager.allElements() full scan

       BbjScopeComputation.collectLocalSymbols() (RESP-01)
       ──► AstUtils.streamAst(root).iterator() (NEW, replaces streamAllContents)
           for isExternalDocument + isBBjClassMember(node) && not private:
               process member signature + method params, then iter.prune()
           (mirrors bbj-linker.ts link()'s exact prune logic)
```

### Recommended Project Structure

No new files/folders are required; all changes land inside existing files:

```
bbj-vscode/src/language/
├── java-interop.ts            # breaker state machine, _inFlightPhase2 registry, D-03 stub-cache flag
├── bbj-notifications.ts       # (unchanged shape) — recovery callback pattern modeled on this file's
│                               #   own "avoid importing main.ts into shared services" isolation
├── main.ts                    # registers the breaker's recovery callback; extracts
│                               #   reloadJavaClassesAndRevalidate's steps 2-4 into a shared helper
├── bbj-index-manager.ts       # BBjIndexManager gains a normalized-path → BbjClass[] reverse index
├── bbj-scope.ts               # getBBjClassesFromFile() calls the new reverse index instead of
│                               #   indexManager.allElements(BbjClass.$type).filter(...)
├── bbj-scope-local.ts         # collectLocalSymbols() gains isExternalDocument-aware pruning
├── bbj-completion-provider.ts # activeCancelToken field replaced by AsyncLocalStorage; the prefix
│                               #   memo's underlying fetch becomes token-free
└── bbj-ws-manager.ts          # (unchanged) — isExternalDocument() consulted by both the linker
                                #   (existing) and collectLocalSymbols (new, D-09)
```

### Pattern 1: Three-state circuit breaker guarding `connect()`

**What:** closed/open/half-open state on `JavaInteropService`, gating `establishConnection()`
(equivalently: gating the call site inside `connect()` before `this.establishConnection()` is
invoked).

**When to use:** every path that would otherwise attempt a socket connect — `getRawClass`'s
`this.connect()` call, `loadClasspath`/`loadImplicitImports`'s `sendRequestSafe`/direct `connect()`
calls.

**Evidence for placement — which errors are "connect-level":**
```typescript
// Source: bbj-vscode/src/language/java-interop.ts:212-229 (read this session)
protected createSocket(): Promise<Socket> {
    return new Promise((resolve, reject) => {
        const socket = new Socket();
        const timeout = setTimeout(() => {
            socket.destroy();
            reject(new Error('Socket connection to Java service timed out after 10s'));
        }, 10000);
        socket.on('error', (err) => {
            clearTimeout(timeout);
            reject(err);
        });
        socket.on('ready', () => {
            clearTimeout(timeout);
            resolve(socket);
        });
        socket.connect(this.interopPort, this.interopHost);
    });
}
```
`socket.on('error', ...)` rejects with whatever Node's `net.Socket` raises — `ECONNREFUSED`,
`EHOSTUNREACH`, `ENETUNREACH`, `ETIMEDOUT`, etc. (the existing timeout-race test at
`test/java-interop-timeouts.test.ts:93-95` already asserts against
`/timed out after 10s|ENETUNREACH|EHOSTUNREACH|ECONNREFUSED|ENETDOWN|EACCES|EPERM/`). **All of these
are "connect-level"** — the socket never reached `ready`. This is the failure class that should trip
the breaker.

By contrast, `getRawClass`'s own 10 s **request** timeout (`java-interop.ts:262-273`, a `Promise.race`
against `connection.sendRequest(getClassInfoRequest, ...)`) fires only **after** a connection was
already established — this is "connected but slow to answer," which D-02 explicitly says must **not**
trip the breaker the same way a connect failure does. **Recommendation:** place the breaker's
success/failure classification only around `establishConnection()`'s own `createSocket()` call (and
optionally the JSON-RPC handshake itself, if any), not around `getRawClass`'s post-connect timeout.

### Pattern 2: In-flight Phase-2 registry beside the LRU (D-07)

**What:** `private readonly _inFlightPhase2 = new Map<string, JavaClass>();` populated at the exact
point `resolvedClasses.set()` runs in `resolveClass`, consulted by all three fast paths, cleared in a
`finally`.

**Evidence for the exact injection point:**
```typescript
// Source: bbj-vscode/src/language/java-interop.ts:704-712 (read this session)
        // Register in resolvedClasses now that isStatic and deprecated are fully populated.
        // This must happen before the async type-resolution loop below, which calls
        // resolveClassByName() recursively — the fast-path check in resolveClassByName
        // and the re-entry guard in resolveClass both depend on this entry existing.
        this.resolvedClasses.set(className, javaClass);

        try {
            // Phase 2 (async): resolve type references and populate documentation.
            const documentation = await this.javadocProvider.getDocumentation(javaClass);
```
The comment ("the re-entry guard in `resolveClass` ... depend[s] on this entry existing") is exactly
the invariant #497 shows is now false once `_resolvedClasses` is an `LruMap`. `resolveClass`'s own
re-entry check is at the top of the function:
```typescript
// Source: bbj-vscode/src/language/java-interop.ts:651-655 (read this session)
    protected async resolveClass(javaClass: Mutable<JavaClass>, token?: CancellationToken, _depth: number = 0): Promise<JavaClass> {
        const className = javaClass.name
        if (this.resolvedClasses.has(className)) {
            return this.resolvedClasses.get(className)!;
        }
```
This check has **no fallback to `_pendingResolutions`** — and `loadImplicitImports()` calls
`resolveClass` **directly**, never through `resolveClassByName`, so a class entering the graph this way
is never registered in `_pendingResolutions` at all:
```typescript
// Source: bbj-vscode/src/language/java-interop.ts:325-328 (read this session)
            await Promise.all(implicitJavaImports.concat('java.sql').map(async pack => {
                const classInfos = await connection.sendRequest(getClassInfosRequest, { packageName: pack }, token);
                await Promise.all(classInfos.map(async javaClass => {
                    await this.resolveClass(javaClass, token)
```
This is the concrete mechanism behind Pitfall B below: if such a class's `resolvedClasses` entry is
evicted mid-Phase-2 and a cyclic reference loops back to it, `resolveClass`'s re-entry check misses,
`_pendingResolutions` has nothing for it either, and the class is fetched and resolved a **second**
time — recursively, redundantly, and (per the failure trace in Pitfall B) potentially slowly enough to
hit the 30 s `RESOLUTION_TIMEOUT_MS` and get cached as a genuine-looking failure stub.

**D-08's bound (don't assert ≤ `MAX_RESOLUTION_DEPTH`):**
```typescript
// Source: bbj-vscode/src/language/java-interop.ts:325-339 (read this session, condensed)
implicitJavaImports.concat('java.sql')  // 8 package names
  .map(async pack => {
      const classInfos = await connection.sendRequest(getClassInfosRequest, { packageName: pack }, token);
      await Promise.all(classInfos.map(async javaClass => { await this.resolveClass(javaClass, token) }))
  })  // Promise.all over 8 packages, each itself Promise.all over every class in that package
```
Confirms D-08's reasoning verbatim: up to 8 packages' worth of classes are legitimately in Phase 2
concurrently, with no lock (this direct-`resolveClass` path never calls `acquireLock`), so the
registry's size during `loadImplicitImports()` is bounded only by "how many classes across those 8
packages," not by `MAX_RESOLUTION_DEPTH = 50`.

### Pattern 3: `BBjIndexManager` as the natural home for RESP-01's reverse index (D-10)

**What:** `BbjScopeProvider.getBBjClassesFromFile()` today does:
```typescript
// Source: bbj-vscode/src/language/bbj-scope.ts:308-331 (read this session)
    private getBBjClassesFromFile(container: AstNode, bbjFilePath: string, simpleName: boolean) {
        const currentDocUri = AstUtils.getDocument(container).uri;
        const prefixes = this.workspaceManager.getSettings()?.prefixes ?? [];
        const workspaceRoots = this.workspaceManager.getWorkspaceFolderUris();
        const adjustedFileUris = [UriUtils.resolvePath(UriUtils.dirname(currentDocUri), bbjFilePath)]
            .concat(workspaceRoots.map(root => UriUtils.resolvePath(root, bbjFilePath)))
            .concat(prefixes.map(prefixPath => URI.file(resolve(prefixPath, bbjFilePath))));
        let bbjClasses = this.indexManager.allElements(BbjClass.$type).filter(bbjClass => {
            return adjustedFileUris.some(adjustedFileUri => normalize(bbjClass.documentUri.fsPath).toLowerCase() === normalize(adjustedFileUri.fsPath).toLowerCase());
        })
        if (!simpleName) {
            bbjClasses = bbjClasses.map(d => {
                if (d.node) {
                    return this.descriptions.createDescription(d.node, `::${bbjFilePath}::${d.name}`);
                }
                // Fallback for synthetic index entries (e.g. regex-extracted classes
                // from files with parser errors) that have no AST node.
                return { ...d, name: `::${bbjFilePath}::${d.name}` };
            });
        }
        return new StreamScopeWithPredicate(bbjClasses);
    }
```
`this.indexManager.allElements(BbjClass.$type)` streams **every** `BbjClass` description across the
**entire** workspace index, filtered by path equality — the O(total-workspace-BbjClasses) cost the
issue names.

`bbj-index-manager.ts` already exists and already overrides Langium's `DefaultIndexManager`:
```typescript
// Source: bbj-vscode/src/language/bbj-index-manager.ts:1-30 (read this session, full file)
export class BBjIndexManager extends DefaultIndexManager {
    wsManager: () => WorkspaceManager;
    constructor(services: LangiumSharedCoreServices) {
        super(services);
        this.wsManager = () => services.workspace.WorkspaceManager;
    }
    public override isAffected(document: LangiumDocument<AstNode>, changedUris: Set<string>): boolean {
        if(document.uri.toString() === JavaSyntheticDocUri || document.uri.scheme === 'bbjlib') {
            return false;
        }
        if (this.wsManager() instanceof BBjWorkspaceManager) {
            const bbjWsManager = this.wsManager() as BBjWorkspaceManager;
            const isExternal = bbjWsManager.isExternalDocument(document.uri)
            if(![...changedUris].every(changed => bbjWsManager.isExternalDocument(URI.parse(changed))) && isExternal) {
                return false;
            }
        }
        return super.isAffected(document, changedUris);
    }
}
```
and is wired as the shared `IndexManager` service:
```typescript
// Source: bbj-vscode/src/language/bbj-module.ts:174 (read this session)
        IndexManager: (services: LangiumSharedServices) => new BBjIndexManager(services)
```
Langium's own `DefaultIndexManager.updateContent` (the method that repopulates the index for one
document, called once per changed document per build) is:
```javascript
// Source: bbj-vscode/node_modules/langium/lib/workspace/index-manager.js:77-81 (read this session)
    async updateContent(document, cancelToken = CancellationToken.None) {
        const services = this.serviceRegistry.getServices(document.$document?.uri ?? document.uri);
        const exports = await services.references.ScopeComputation.collectExportedSymbols(document, cancelToken);
        const uri = document.uri.toString();
        this.symbolIndex.set(uri, exports);
```
`services.references.ScopeComputation.collectExportedSymbols` is `BbjScopeComputation.collectExportedSymbols`
(`bbj-scope-local.ts:60-104`) — the SAME function that already computes exactly this document's own
`BbjClass` exports. **Recommendation:** override `updateContent`/`remove`/`removeContent` in
`BBjIndexManager` to maintain a `Map<string /* normalized fsPath, lowercased */, AstNodeDescription[]>`
populated from `this.symbolIndex.get(document.uri.toString())` (filtered to `BbjClass.$type`) right
after `super.updateContent()` runs, and deleted on `remove`/`removeContent`. This is an O(this
document's own class count) update per document change — not O(total workspace) — and Langium's own
lifecycle guarantees it is rebuilt exactly when a file is added/changed and dropped exactly when a
file is removed, satisfying D-10's "never stale" bound with no new invalidation machinery. Expose a
public `getBBjClassesByPath(normalizedPath: string): AstNodeDescription[]` for `bbj-scope.ts` to call
per candidate `adjustedFileUri` (an O(1) map lookup, replacing the O(N) `.filter()` scan). The
candidate-path computation itself (`adjustedFileUris`) is already cheap pure-string work bounded by
"current dir + workspace roots + prefixes," not total file count, and is unaffected.

**Anti-pattern warning:** do **not** rebuild the whole reverse index from `onBuildPhase`/`onUpdate`
callbacks that themselves call `DocumentBuilder.update()`/`notifyDocumentPhase()` — this repo already
paid for that exact mistake once:
```typescript
// Source: bbj-vscode/src/language/bbj-document-builder.ts:148-150, 169-170 (read this session)
                // BBjCPL integration: compile validated documents based on trigger mode.
                // IMPORTANT: Called here inside buildDocuments(), NOT from onBuildPhase —
                // onBuildPhase triggers a CPU rebuild loop (see STATE.md).
...
     * IMPORTANT: This runs INSIDE buildDocuments(), not from onBuildPhase —
     * calling from onBuildPhase causes CPU rebuild loops (see STATE.md).
```
The `BBjIndexManager.updateContent` override recommended above is safe from this because it only
writes to a private, read-only-from-outside `Map` — it never calls `DocumentBuilder.update`,
`notifyDocumentPhase`, or anything that would re-trigger a build. This mirrors `main.ts`'s own existing
safe use of `onBuildPhase(DocumentState.Validated, ...)` (`main.ts:162`), which also only does
read/notify work, never a rebuild call.

### Pattern 4: Mirroring `bbj-linker.ts`'s `treeIter.prune()` in `collectLocalSymbols` (D-09)

**What the linker does today** (the template to mirror exactly):
```typescript
// Source: bbj-vscode/src/language/bbj-linker.ts:41-69 (read this session)
    override async link(document: LangiumDocument, cancelToken = CancellationToken.None): Promise<void> {
        const started = Date.now()
        const wsManager = this.wsManager()
        const externalDoc = (wsManager instanceof BBjWorkspaceManager)
            && (wsManager as BBjWorkspaceManager).isExternalDocument(document.uri)

        const treeIter = AstUtils.streamAst(document.parseResult.value).iterator()
        for (const node of treeIter) {
            await interruptAndCheck(cancelToken);
            if (externalDoc && isBBjClassMember(node)) {
                if ((node as { visibility?: string }).visibility?.toLowerCase() !== 'private') {
                    AstUtils.streamReferences(node).forEach(ref => this.doLink(ref, document));
                    // don't link the method body or Field initialization, we are only interested on its signature
                    if (isMethodDecl(node)) {
                        node.params.forEach(p => AstUtils.streamReferences(p).forEach(ref => this.doLink(ref, document)))
                    }
                }
                treeIter.prune()
            } else {
                AstUtils.streamReferences(node).forEach(ref => this.doLink(ref, document));
            }
        }
        document.state = DocumentState.Linked;
    }
```

**What `collectLocalSymbols` does today** (the O(whole-external-body) walk to fix):
```typescript
// Source: bbj-vscode/src/language/bbj-scope-local.ts:106-126 (read this session)
    override async collectLocalSymbols(document: LangiumDocument, cancelToken: CancellationToken): Promise<LocalSymbols> {
        const rootNode = document.parseResult.value;
        const scopes = new MultiMap<AstNode, AstNodeDescription>();
        // Override to process node in an async way
        // to trigger backend resolution of Java class references.
        for (const node of AstUtils.streamAllContents(rootNode)) {
            await interruptAndCheck(cancelToken);
            await this.processNode(node, document, scopes);
        }
        if (isProgram(rootNode)) {
            (document as BbjDocument).cachedUseStatements = collectAllUseStatements(rootNode);
        }
        if (JavaSyntheticDocUri === document.uri.toString() && isClasspath(rootNode)) {
            (document as JavaDocument).classesMapScope = new MapScope(scopes.getStream(rootNode).toArray())
        }
        return scopes;
    }
```
`AstUtils.streamAllContents(rootNode)` has no `prune()` — it always walks the **entire** tree,
including every external-document class member's **body**, running `processNode` (which triggers
`await this.tryResolveJavaReference(...)` — real Java-class-resolution side effects, per
`bbj-scope-local.ts:271-285`'s `isMemberCall`/FQN-preload branch) on every statement inside those
bodies, even though `bbj-linker.ts` never links them and `isExternalDocument()`-scoped files get no
body linking today.

**Recommended change:** replace `AstUtils.streamAllContents(rootNode)` with
`AstUtils.streamAst(rootNode).iterator()` (the same API the linker already uses, confirmed present in
this Langium version by `bbj-linker.ts`'s own working `import { ... AstUtils ... }` and
`.iterator()`/`.prune()` calls), compute `externalDoc` the same way the linker does (via
`isExternalDocument`), and inside the loop:

```
for (const node of treeIter) {
    await interruptAndCheck(cancelToken);
    if (externalDoc && isBBjClassMember(node)) {
        if ((node as { visibility?: string }).visibility?.toLowerCase() !== 'private') {
            await this.processNode(node, document, scopes);              // member's own signature
            if (isMethodDecl(node)) {
                for (const p of node.params) { await this.processNode(p, document, scopes); }
            }
        }
        treeIter.prune();   // skip the member's body — mirrors the linker exactly
    } else {
        await this.processNode(node, document, scopes);
    }
}
```

D-09's own constraint — "USE-statement caching (`cachedUseStatements`) and the synthetic classpath
document's `classesMapScope` must behave exactly as before" — is satisfied because both are computed
**after** the main loop, unconditionally, from `rootNode`/`scopes` as today; pruning only changes which
nodes are visited **inside** the loop, not the two post-loop reads.

**Import note:** `isBBjClassMember` is currently imported in `bbj-linker.ts` from
`./generated/ast.js` (`bbj-linker.ts:21`) but not in `bbj-scope-local.ts` today — this import must be
added.

### Pattern 5: `AsyncLocalStorage` for RESP-04's per-request token

**Current shared-field mechanism (the bug):**
```typescript
// Source: bbj-vscode/src/language/bbj-completion-provider.ts:53-59 (read this session)
    protected activeCancelToken?: CancellationToken;
```
```typescript
// Source: bbj-vscode/src/language/bbj-completion-provider.ts:94-104 (read this session)
    protected override async completionForCrossReference(context: CompletionContext, next: NextFeature<GrammarAST.CrossReference>, acceptor: CompletionAcceptor): Promise<void> {
        const offered = new Set<string>();
        const recording: CompletionAcceptor = (ctx, item) => { if (item.label) { offered.add(item.label); } acceptor(ctx, item); };
        await super.completionForCrossReference(context, next, recording);
        if (!this.dotTriggerActive && this.isClassCrossReference(next.feature) && this.isTypeReferencePosition(context)) {
            await this.completeAutoImportClasses(context, offered, acceptor, this.activeCancelToken);
        }
    }
```
```typescript
// Source: bbj-vscode/src/language/bbj-completion-provider.ts:247 (read this session, inside getCompletion)
        this.activeCancelToken = cancelToken;
```
**Why parameter threading through `completionFor`/`completionForCrossReference` is not mechanically
available:** Langium's own base-class override signatures carry no token, and Langium's internal
algorithm is what calls these methods:
```typescript
// Source: bbj-vscode/node_modules/langium/lib/lsp/completion/completion-provider.d.ts:147-148 (read this session)
    protected completionFor(context: CompletionContext, next: NextFeature, acceptor: CompletionAcceptor): MaybePromise<void>;
    protected completionForCrossReference(context: CompletionContext, next: NextFeature<ast.CrossReference>, acceptor: CompletionAcceptor): MaybePromise<void>;
```
Since the *caller* of these methods (Langium's own completion engine, not our code) never has a token
to pass, adding a token parameter to the override would just always receive `undefined` from that
caller. `CompletionContext` itself (`document`, `textDocument`, `features`, `tokenOffset`,
`tokenEndOffset`, `offset`, `position` — `completion-provider.d.ts:33-54`) carries no token and no
back-reference to the originating `CompletionParams`/request object either, so a `WeakMap` keyed on
`context` would need `buildContexts()` overridden too (also token-less in its own signature,
`completion-provider.d.ts:128`) just to inject the key.

**Recommended mechanism:**
```typescript
import { AsyncLocalStorage } from 'node:async_hooks';
// module-level or static: shared across the singleton provider, keyed per-call-stack not per-instance
const completionTokenStorage = new AsyncLocalStorage<CancellationToken | undefined>();
```
Wrap the bulk of `getCompletion`'s body: `return completionTokenStorage.run(cancelToken, () => { /* existing method body */ });`
(or wrap just the two calls to `super.getCompletion` — the dot-trigger branch and the default path —
since those are the two call sites from which `completionForCrossReference` is ultimately invoked;
wrapping the whole method is simpler and equally correct). Read it wherever `this.activeCancelToken`
is read today: `completionTokenStorage.getStore()`.

**Why this correctly isolates concurrent requests:** Node's `AsyncLocalStorage.run(store, callback)`
creates a new async execution context scoped to `callback` and everything `callback` awaits
(transitively) — a *different* concurrent `getCompletion()` call has its *own* `.run()` invocation with
its *own* store, and Node's async-hooks machinery keeps them separate even though they interleave on
the same event loop and share the same `BBjCompletionProvider` singleton instance. This is confirmed
safe to rely on here because two concurrent `textDocument/completion` requests genuinely do interleave
on this server (no per-connection request mutex):
```javascript
// Source: bbj-vscode/node_modules/langium/lib/lsp/language-server.js:287-291, 500-521 (read this session)
export function addCompletionHandler(connection, services, requiredState = DocumentState.Linked) {
    connection.onCompletion(createRequestHandler((services, document, params, cancelToken) => {
        return services.lsp?.CompletionProvider?.getCompletion(document, params, cancelToken);
    }, services, requiredState));
}
...
export function createRequestHandler(serviceCall, sharedServices, requiredState) {
    const documents = sharedServices.workspace.LangiumDocuments;
    const serviceRegistry = sharedServices.ServiceRegistry;
    return async (params, cancelToken) => {
        const uri = URI.parse(params.textDocument.uri);
        const cancellationError = await waitUntilPhase(sharedServices, cancelToken, uri, requiredState);
        ...
        const document = await documents.getOrCreateDocument(uri);
        return await serviceCall(language, document, params, cancelToken) ?? null;
    };
}
```
`waitUntilPhase` awaits `documentBuilder.waitUntil(requiredState, uri, cancelToken)` **per-document**
(`uri` is the specific requested document's URI, not a global lock) — so a slow completion on document
A never blocks a completion request on document B from starting, confirming two genuinely-concurrent,
independently-cancellable completion requests are the actual runtime shape this server already has.

**The second-layer fix (`autoImportPrefixCache`):**
```typescript
// Source: bbj-vscode/src/language/bbj-completion-provider.ts:178-204 (read this session)
    protected findClassCandidatesByPrefixCached(prefix: string, cancelToken?: CancellationToken): Promise<string[]> {
        const key = prefix.toLowerCase();
        const now = Date.now();
        const cached = this.autoImportPrefixCache.get(key);
        if (cached && (now - cached.cachedAt) < AUTO_IMPORT_PREFIX_CACHE_TTL_MS) {
            this.autoImportPrefixCache.delete(key);
            this.autoImportPrefixCache.set(key, cached);
            return cached.promise;
        }
        const promise = this.javaInterop.findClassCandidatesByPrefix(prefix, undefined, cancelToken);
        this.autoImportPrefixCache.set(key, { promise, cachedAt: now });
        promise.catch(() => { this.autoImportPrefixCache.delete(key); });
        ...
        return promise;
    }
```
The **creating** caller's `cancelToken` is passed into `this.javaInterop.findClassCandidatesByPrefix`,
which threads it into a real JSON-RPC request (`ensureCompleteClassIndex`'s
`connection.sendRequest(getAllClassNamesRequest, {}, token)`, `java-interop.ts:408`). Standard LSP
JSON-RPC cancellation semantics reject the request's promise once its token is cancelled — so if the
*first* (creating) caller's request is cancelled, the **shared** promise rejects for every caller
currently awaiting it, including a second, still-valid caller. **Recommended fix (matches CONTEXT.md's
own hint):** create the underlying fetch with no per-caller token at all
(`this.javaInterop.findClassCandidatesByPrefix(prefix, undefined, undefined)` or explicit
`CancellationToken.None`), so the shared promise's lifetime is decoupled from any individual caller's
cancellation. `completeAutoImportClasses` already independently re-checks its **own** token immediately
after the await:
```typescript
// Source: bbj-vscode/src/language/bbj-completion-provider.ts:145-148 (read this session)
        const fqns = await this.findClassCandidatesByPrefixCached(prefix, cancelToken);
        if (cancelToken?.isCancellationRequested) {
            return;
        }
```
so no new post-await check is needed — only the *creation* of the shared promise needs to stop
carrying a token that can cancel it out from under an unrelated caller.

### Anti-Patterns to Avoid

- **Serializing the breaker through the existing `lockQueue`:** D-06 explicitly keeps the resolution
  lock unchanged; the breaker must short-circuit *before* `acquireLock()` is ever called, not add a
  second layer of queuing inside it.
- **Cancelling `resolveClass()`'s background Phase 2 when `doResolveClassByName`'s 30 s race fires:**
  there is no cancellation token wired to make this safe today (the token passed down only cancels
  individual nested JSON-RPC requests, not the whole recursive Phase-2 chain) — D-08's "empty after
  settle" guarantee already accounts for this by *not* requiring termination within 30 s, only
  eventual settlement (bounded by nested `getRawClass`'s 10 s timeouts and `MAX_RESOLUTION_DEPTH = 50`).
  Do not add ad-hoc cancellation here as an "improvement"; it is out of this phase's scope and could
  interact badly with D-07's registry cleanup ordering.
- **Building RESP-01's reverse index with an unbounded scan on every reference lookup instead of on
  every document change:** the whole point of Pattern 3 is that the expensive scan happens once per
  changed **document**, not once per **reference**.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Per-request async context propagation across a singleton service | A custom `Map`/`WeakMap` keyed by a synthesized "request id" threaded manually through every call | `AsyncLocalStorage` (Node builtin) | Node's async-hooks machinery already solves "propagate a value through an arbitrary async call graph, isolated per concurrent invocation" correctly, including through `Promise.all` fan-out (used inside `resolveClass`'s Phase 2 and `loadImplicitImports`) — a hand-rolled version would need to solve the exact same interleaving problem `AsyncLocalStorage` is designed for |
| Circuit breaker state machine | A boolean `isDown` flag with a `setTimeout` retry | A proper closed/open/half-open state machine (D-01) | A boolean flag can't express "one probe permitted, others still short-circuit" (D-01's explicit half-open semantics) without extra ad-hoc state that ends up reinventing the three states anyway |
| LRU eviction-safe in-flight tracking | Extending `LruMap` itself with a "pinned" flag per entry | A separate plain `Map` (D-07) | D-07 explicitly rejects modifying `LruMap`: "`LruMap` itself is not modified, so `RESOLVED_CLASSES_CACHE_LIMIT = 5000` still bounds it" — a pinned-entry LRU would let pinned entries silently exceed the size bound `RESOLVED_CLASSES_CACHE_LIMIT` exists to enforce (`P61-D3-001`) |

**Key insight:** every one of this phase's four fixes has a Node/Langium built-in or an
already-present codebase seam (`BBjIndexManager`, the linker's `prune()` pattern, `LruMap`'s existing
shape) that fits with no new abstraction — the risk in this phase is almost entirely about **placement**
(exactly which call site gets the guard) rather than needing new machinery.

## Common Pitfalls

### Pitfall A: The recovery sequence forgets the peer has no memory of the old classpath

**What goes wrong:** D-04 says "No `clearCache()`, so resolved classes are kept" for the breaker's
open→closed recovery. If the recovery sequence stops there (just resets document state and calls
`DocumentBuilder.update`), any class that is only reachable through the user's custom classpath (not
the default SSCP) will get asked of a **brand-new** `InteropService` instance that has never seen
`loadClasspath`'s entries, genuinely fail to resolve, and — per D-03's own rule that "a stub for a
class the backend answered but could not find stays cached as today" — get **permanently** cached as
not-found, even though the class is perfectly resolvable.

**Why it happens:** the JVM peer's socket-accept loop constructs a fresh `InteropService` per accepted
connection, in both the local dev backend and the production backend:
```java
// Source: java-interop/src/main/java/bbj/interop/SocketServiceApp.java:36-53 (read this session)
while (true) {
    var socketChannel = serverSocket.accept().get();
    try {
        startJsonRpc(socketChannel);
        ...
protected void startJsonRpc(AsynchronousSocketChannel socketChannel) throws IOException {
    var interopService = new InteropService();
```
```java
// Source: /home/coder/repos/bbj-ls/src/main/java/bbj/interop/LanguageService.java:83-92 (read this session)
                    try {
                        LOG.log(Level.INFO, "BBj Language Service at {0} accepted new connection from {1}", ...);
                        var interopService = new InteropService();
                        var launcher = new Launcher.Builder<>().setLocalService(interopService)
                        ...
```
and `bbj-ls`'s own `InteropService` explicitly documents that only the **classpath scan result** is
shared across connections (via a static, weak-keyed cache), not the classpath itself:
```java
// Source: /home/coder/repos/bbj-ls/src/main/java/bbj/interop/InteropService.java:64-96 (read this session)
	/*
	 * Guava ClassPath scans walk every jar on the classpath and are the expensive
	 * part of serving a connection. A new InteropService is created per editor
	 * connection, but BBjServices hands out the same ClassLoader instance for a
	 * given SSCP, so the scan result can be shared across connections. Weak keys
	 * compare by identity and let a replaced ClassLoader be collected; the expiry
	 * bounds staleness when jars change behind an unchanged ClassLoader instance.
	 */
	private static final Cache<ClassLoader, ClassPath> SCAN_CACHE = CacheBuilder.newBuilder()
			.weakKeys()
			.expireAfterWrite(10, TimeUnit.MINUTES)
			.build();

	private ClassLoader classLoader;
    ...
	public InteropService() {
		try {
			classLoader = getSSCP(DEFAULT_SSCP);
```
Every new `InteropService()` constructor call resets `classLoader` to the **default** SSCP
(`getSSCP(DEFAULT_SSCP)`) — a brand-new socket connection (which is exactly what happens on the
breaker's half-open probe / reconnect) starts from scratch and has **no memory** of any
`loadClasspath` call a previous connection made. A `getClassInfo` request for a class only present in
the user's custom jars will get a genuine `"Class not found: " + className` answer (see Pitfall
evidence below), not a transport failure — so D-03's transport-stub carve-out does **not** protect it.

**How to avoid:** the breaker's open→closed recovery sequence (D-04) must, before re-checking open
documents, re-run the equivalent of `main.ts`'s existing `reloadJavaClassesAndRevalidate` **steps 2 and
3** (`loadClasspath(settings.classpath)` then `loadImplicitImports()`) against the freshly-reconnected
peer — still **without** step 1's `clearCache()`, so already-resolved classes in `resolvedClasses`
are kept (harmless, since they were correctly resolved against a classpath that — for standard-library
classes at least — is the same across any SSCP). Concretely:
```typescript
// Source: bbj-vscode/src/language/main.ts:125-158 (read this session — existing steps 1-5)
async function reloadJavaClassesAndRevalidate(): Promise<void> {
    const javaInterop = BBj.java.JavaInteropService;
    javaInterop.clearCache();                                          // step 1 — SKIP for D-04 recovery
    const wsManager = shared.workspace.WorkspaceManager as BBjWorkspaceManager;
    const settings = wsManager.getSettings();
    if (settings && settings.classpath.length > 0) {
        await javaInterop.loadClasspath(settings.classpath);           // step 2 — KEEP for D-04 recovery
    }
    await javaInterop.loadImplicitImports();                           // step 3 — KEEP for D-04 recovery
    // step 4: reset open file-scheme docs to Parsed + DocumentBuilder.update(...) — KEEP for D-04 recovery
    ...
    connection.window.showInformationMessage('Java classes refreshed'); // step 5 — SKIP (D-05: silent on recovery)
}
```
Extract steps 2-4 into a shared helper callable both from the explicit `bbj/refreshJavaClasses` path
(steps 1-5, unchanged) and from the breaker's recovery callback (steps 2-4 only, no `clearCache()`, no
popup). Per STATE.md's standing constraint, this helper must **not** live in or be imported from
`main.ts` into `java-interop.ts` (`bbj-notifications.ts isolation module must be preserved — importing
main.ts from shared services crashes tests`); the cleanest wiring is a callback **registered from**
`main.ts` onto a small event-emitter-shaped API on `JavaInteropService` (e.g.
`onBreakerRecovered(callback: () => Promise<void>): void`), mirroring `bbj-notifications.ts`'s own
"module holds a lightweight ... sender ... without pulling in the full main.ts entry point" pattern —
`java-interop.ts` fires the callback on its own open→closed transition; `main.ts` is the only file that
knows about `WorkspaceManager`/`DocumentBuilder` and wires the actual reload+revalidate logic into that
callback at startup.

**At startup with the peer unreachable, nothing "poisons" the cache** — worth confirming, since it
bounds what recovery has to undo: `loadClasspath` routes through `sendRequestSafe`, which returns its
`fallback` (`false`) on any failure and touches no cache state:
```typescript
// Source: bbj-vscode/src/language/java-interop.ts:287-295, 303-314 (read this session)
    private async sendRequestSafe<P, R>(request: RequestType<P, R, null>, params: P, fallback: R, token?: CancellationToken): Promise<R> {
        try {
            const connection = await this.connect();
            return await connection.sendRequest(request, params, token);
        } catch (e) {
            console.error(e)
            return fallback;
        }
    }
    public async loadClasspath(classPath: string[], token?: CancellationToken): Promise<boolean> {
        ...
        return this.sendRequestSafe(loadClasspathRequest, { classPathEntries: entries }, false, token);
    }
```
and `loadImplicitImports` throws out of its `try` at the `this.connect()` call itself (before any
per-class `resolveClass` call runs), landing in its own outer `catch (e) { console.error(e); return
false; }` (`java-interop.ts:381-384`) with zero classes ever having been fetched or cached. So
`isClasspathAvailable()` (`_resolvedClasses.size > 0`) correctly reports "unavailable" and the existing
type-resolution-diagnostic suppression already degrades gracefully — **the startup path leaves nothing
behind that D-04's recovery needs to clean up**; recovery only needs to *run* the loads that failed at
startup (or after a peer restart), which is exactly what re-running steps 2-3 accomplishes.

**Warning signs:** after a real BBjServices restart, hovering/completing a class from the project's own
classpath (not `java.lang`/JDK-bundled) permanently shows "cannot be resolved" even though the peer is
back up and standard-library classes resolve fine again.

### Pitfall B: LRU eviction during Phase 2 makes a resolvable class look genuinely unresolvable

**What goes wrong (exact mechanism traced this session):** `loadImplicitImports()` resolves class `A`
via a **direct** `resolveClass(A)` call (not `resolveClassByName`), so `A` is never registered in
`_pendingResolutions`. `resolveClass(A)`'s Phase 1 sets `resolvedClasses.set('A', A)`
(`java-interop.ts:708`) and starts Phase 2, which (for a field/method type) calls
`resolveClassByName('B', token, depth+1)`. If `B` also has a field/method type pointing back to `A`
(a real JDK pattern, e.g. `Object`↔`Class`), that nested call does
`resolveClassByName('A', token, depth+2)`. Normally `resolvedClasses.has('A')` is true (fast path,
correct). **But** if enough *other* classes were `.set()` into the same `LruMap` during `A`'s own
Phase 2 — entirely plausible, since `loadImplicitImports` resolves up to 8 packages' worth of classes
concurrently via `Promise.all` outside the lock — `A`'s entry can be evicted as least-recently-used
before its own Phase 2 finishes. Then the nested `resolveClassByName('A', ...)` call finds
`resolvedClasses.has('A')` false, `_pendingResolutions.get('A')` empty (never registered — direct-entry
path), and proceeds to treat `A` as brand-new: it re-fetches `A` over the wire and calls
`resolveClass()` on it a **second, fully redundant time**, itself starting a **second** nested
`doResolveClassByName('A', ...)` with its own independent 30 s `RESOLUTION_TIMEOUT_MS` race. If this
redundant sub-graph is slow enough (extra round trips, lock contention, or a deeper redundant cycle),
that race can fire, and `doResolveClassByName`'s `catch` returns `this.createStubClass(className)` —
**cached by default** (`cache: true`) — permanently marking a genuinely-resolvable class as failed:
```typescript
// Source: bbj-vscode/src/language/java-interop.ts:605-611 (read this session)
        } catch (e) {
            logger.warn(`Failed to resolve Java class '${className}': ${e}`);
            return this.createStubClass(className);
        } finally {
            release();
        }
```
This matches the issue's own diagnosis word-for-word: *"a ~30s stall for that resolution instead of an
immediate cache hit, and the caller silently receives a `createStubClass()` stub ... instead of the
resolved class"* (issue #497, `[VERIFIED: gh issue view 497]`).

**How to avoid (D-07):** add `private readonly _inFlightPhase2 = new Map<string, JavaClass>();`,
populated in the SAME statement that does `resolvedClasses.set(className, javaClass)`
(`java-interop.ts:708`), removed in a `finally` wrapping `resolveClass`'s Phase 2 `try`/`catch`
(`java-interop.ts:710-776`). Consult it — in addition to `resolvedClasses`/`_pendingResolutions` — at
all three fast paths named by D-07: `resolveClassByName`'s `resolvedClasses.has` check
(`java-interop.ts:550`), `doResolveClassByName`'s post-lock double-check (`java-interop.ts:594`), and
`resolveClass`'s own re-entry check (`java-interop.ts:653`) — the last of these is the one this trace
shows is actually load-bearing for the failure, since it is the check the eviction+direct-entry
combination bypasses today.

**Test seam for forcing the eviction deterministically:** `_resolvedClasses` is initialized as a class
field with a hard-coded limit:
```typescript
// Source: bbj-vscode/src/language/java-interop.ts:103, 40 (read this session)
    private readonly _resolvedClasses = new LruMap<string, JavaClass>(RESOLVED_CLASSES_CACHE_LIMIT); // = 5000
```
Refactor this into a protected factory method (`protected createResolvedClassesLru(): LruMap<string,
JavaClass> { return new LruMap(RESOLVED_CLASSES_CACHE_LIMIT); }`) called from the constructor, so a
test subclass can override it to return `new LruMap(2)` or similar — mirroring the exact override
pattern this test suite already uses for `createSocket()`
(`test/java-interop-service.test.ts:71-76`, `MockableJavaInteropService`) and `connect()`
(`test/java-interop-timeouts.test.ts:24-33`, `HangingBackendInterop`). With a tiny limit, a test can
resolve class `A` (with a field type `B`) and class `B` (with a field type `A`), while controlling the
raw-fetch timing (e.g. a mock `connect()` returning a manually-resolvable `sendRequest`) so that enough
*other* classes are resolved in between to force `A`'s eviction before its own Phase 2 completes —
then assert (a) `A` and `B` both resolve to their real (non-stub, non-error) values, (b)
`_inFlightPhase2` is empty afterward, and (c — a second test) forcing a cancellation or the 30 s
`RESOLUTION_TIMEOUT_MS` mid-chain still leaves `_inFlightPhase2` empty once everything settles (proving
D-08's "empty after settle," not "bounded during").

**Whether to re-insert into the LRU when Phase 2 completes (open discretion item):** `resolveClass`
only calls `resolvedClasses.set()` once, before Phase 2 (`java-interop.ts:708`) — there is no
re-`.set()` after Phase 2 finishes today. If the entry was evicted mid-Phase-2, it stays absent from
the LRU after completion (functionally safe once D-07 ships, since `_inFlightPhase2` protects every
reference *during* the window, and a *later* reference after Phase 2 has finished and the registry
entry is removed simply causes one full, non-cyclic-risk re-resolution — not a stall or a bad stub).
**Recommendation:** re-`.set()` into `resolvedClasses` right before Phase 2's `return javaClass`
(`java-interop.ts:778`) as a cheap, safe addition — it avoids a wasted full re-resolution shortly after
completion for a class the LRU happened to evict mid-flight, at the cost of one extra `Map`
delete+insert.

**Warning signs today (pre-fix):** intermittent "cannot be resolved" diagnostics for a JDK class known
to exist (e.g. after a large `use`/auto-import chain or during the initial `loadImplicitImports`
preload of a cold session), which does **not** reproduce when the same file is reopened later in the
same session (because by then the class may already sit un-evicted in the LRU).

## Code Examples

### Existing timeout/lock constants this phase must respect (do not change their values)

```typescript
// Source: bbj-vscode/src/language/java-interop.ts:40, 113-115, 218, 271 (read this session)
export const RESOLVED_CLASSES_CACHE_LIMIT = 5000;
private static readonly MAX_RESOLUTION_DEPTH = 50;
private static readonly RESOLUTION_TIMEOUT_MS = 30_000;
// createSocket(): 10000 ms connect timeout
// getRawClass(): 10000 ms request timeout (Promise.race)
```

### `createStubClass`'s existing `cache` flag — exactly what D-03 needs, already present

```typescript
// Source: bbj-vscode/src/language/java-interop.ts:613-642 (read this session)
    private createStubClass(className: string, cache: boolean = true): JavaClass {
        const existing = this.resolvedClasses.get(className);
        if (existing) return existing;
        const stub: Mutable<JavaClass> = {
            $type: JavaClass.$type,
            ...
            error: `Resolution failed or depth limit exceeded`,
        } as unknown as Mutable<JavaClass>;
        if (cache) {
            this.resolvedClasses.set(className, stub);
        }
        return stub;
    }
```
D-03's "transport stub → `createStubClass(className, false)`" is a one-line change at each of the
transport-failure call sites (`doResolveClassByName`'s `catch` at `java-interop.ts:605-611` currently
calls `this.createStubClass(className)` with the default `cache: true` for **every** failure reason,
not just genuine not-found — this needs to become conditional on whether the underlying failure was a
transport failure (breaker open / connect refused / socket-connect timeout / request timeout / 30s
chain timeout) vs. the backend's own `error` field being set on an otherwise-successful `getClassInfo`
response).

### Exact backend "not found" response shape (confirms `resolveClass`'s own comment)

```java
// Source: java-interop/src/main/java/bbj/interop/InteropService.java:226-236 (read this session)
        } catch (ClassNotFoundException exc) {
            classInfo.fields = Collections.emptyList();
            classInfo.methods = Collections.emptyList();
            classInfo.constructors = Collections.emptyList();
            classInfo.error = "Class not found: " + className;
        } catch (NoClassDefFoundError error) {
            classInfo.fields = Collections.emptyList();
            classInfo.methods = Collections.emptyList();
            classInfo.constructors = Collections.emptyList();
            classInfo.error = "No class definition found: " + error.getMessage();
        }
```
This confirms the exact backend "not found" contract `resolveClass`'s own comment refers to:
```typescript
// Source: bbj-vscode/src/language/java-interop.ts:664-668 (read this session)
        if (!javaClass.packageName) {
            // can happen if the class was not found by Java backend
            javaClass.packageName = packageName;
        }
```
A genuine not-found `getClassInfo` response has `error` set to a string starting with `"Class not
found: "` or `"No class definition found: "`, and `packageName`/`simpleName` are **never populated**
by the backend in that branch (only `classInfo.name` is set, from the request echo at
`InteropService.java:170-171`) — this is exactly why `resolveClass` has to derive `packageName` itself
from the class name string when the backend didn't set it. **A genuine not-found and a transport
failure are distinguishable by this shape:** a genuine not-found `JavaClass` has `error` set AND came
back from a *successful* `getRawClass`/`connection.sendRequest` call (the promise resolved, not
rejected); a transport failure never reaches this code path at all — it is a **rejected** promise
caught by `doResolveClassByName`'s own `catch` (`java-interop.ts:605`), which today can't tell the two
apart because both paths currently funnel into the same `createStubClass(className)` call with the
default caching behavior. D-03's fix must therefore branch **inside `doResolveClassByName`'s `catch`**
(the site that already distinguishes "the raw fetch/resolve threw" from "the raw fetch succeeded and
the class carries a backend `error`") — not inside `createStubClass` itself, which has no way to know
which case it's being called for once inside a generic catch handler unless the call site passes that
information down (e.g. via the existing `cache` boolean parameter, set based on classifying the caught
error as connect-level/timeout vs. anything else).

### `_pendingResolutions` vs. direct `resolveClass` entry — the two entry points D-07 must unify

```typescript
// Source: bbj-vscode/src/language/java-interop.ts:545-580 (read this session, condensed)
    async resolveClassByName(className: string, token?: CancellationToken, _depth: number = 0): Promise<JavaClass> {
        if (this.resolvedClasses.has(className)) { return this.resolvedClasses.get(className)!; }
        const pending = this._pendingResolutions.get(className);
        if (pending) { return pending; }
        if (_depth > JavaInteropService.MAX_RESOLUTION_DEPTH) { return this.createStubClass(className, false); }
        const resolutionPromise = this.doResolveClassByName(className, token, _depth);
        this._pendingResolutions.set(className, resolutionPromise);
        try { return await resolutionPromise; } finally { this._pendingResolutions.delete(className); }
    }
```
vs.
```typescript
// Source: bbj-vscode/src/language/java-interop.ts:325-328 (read this session)
            await Promise.all(implicitJavaImports.concat('java.sql').map(async pack => {
                const classInfos = await connection.sendRequest(getClassInfosRequest, { packageName: pack }, token);
                await Promise.all(classInfos.map(async javaClass => {
                    await this.resolveClass(javaClass, token)   // <-- bypasses _pendingResolutions entirely
```

## State of the Art

| Old Approach | Current Approach (this phase) | When Changed | Impact |
|--------------|------------------|---------------|--------|
| One boolean/log-based failure signal per connect attempt, no breaker | Three-state closed/open/half-open breaker | This phase (RESP-02) | N unresolved classes against a dead peer: was `~10N`s, becomes `~10`s total |
| `resolvedClasses`-only cache-hit check for cycle-breaking | `resolvedClasses` + `_inFlightPhase2` registry checked together | This phase (RESP-03) | A cyclic reference can no longer "fall through" a mid-flight LRU eviction into a redundant, potentially-timing-out re-resolution |
| Full-workspace `indexManager.allElements(BbjClass.$type)` scan per `::file::Class` reference | O(1) reverse-index lookup via `BBjIndexManager` | This phase (RESP-01) | Per-lookup cost stops scaling with total workspace `BbjClass` count |
| `AstUtils.streamAllContents` unpruned walk per document in `collectLocalSymbols` | `AstUtils.streamAst(...).iterator()` with the linker's own prune rule | This phase (RESP-01) | External-document member bodies are no longer walked (or Java-resolved) during symbol collection, matching what the linker already skips |
| Single instance field `activeCancelToken` shared by a singleton `CompletionProvider` | `AsyncLocalStorage` per completion request | This phase (RESP-04) | Concurrent completion requests on different documents can no longer observe each other's cancellation |

**Not deprecated by this phase (explicitly kept, per locked decisions):** the global resolution lock
(`acquireLock`/`lockQueue`/`currentLockToken`, D-06); `LruMap`'s own eviction algorithm (D-07 adds a
side map, does not modify `LruMap`); `isExternalDocument()`'s existing prefix-only logic and its open
TODO (D-09).

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | The discretionary breaker cooldown/backoff defaults (initial cooldown, backoff factor, cap) are not specified anywhere in CONTEXT.md, REQUIREMENTS.md, or the GitHub issues — this research does not recommend specific numbers, leaving them fully to the plan/executor's discretion as CONTEXT.md states | Standard Stack / Pattern 1 | If the plan invents specific numbers without flagging them as a product choice, a reviewer might mistake them for a researched/verified value rather than an arbitrary discretionary pick |
| A2 | The recommendation to re-`.set()` a class into `resolvedClasses` after Phase 2 completes (to avoid a wasted re-resolution post-eviction) is a **recommendation**, not a requirement — D-07/D-08 only require `_inFlightPhase2` to protect *during* Phase 2 and be empty *after* settlement; whether the LRU re-admits the class afterward is explicitly left to Claude's discretion in CONTEXT.md | Common Pitfalls, Pitfall B | If skipped, no correctness regression — only a minor, session-rare extra re-resolution cost for a class evicted exactly during its own Phase 2 |
| A3 | This research assumes the production `bbj-ls` backend at `/home/coder/repos/bbj-ls` (read this session) is representative of what a real deployed BBjServices instance runs — per project memory ("`bbj-ls` is the production Java backend ... mirrors `java-interop/`"). It has not been independently confirmed against a live BBjServices process in this environment | Summary, Common Pitfalls Pitfall A | If a deployed BBjServices version has since diverged from this checkout, the "new `InteropService` per connection" finding might not hold for every field version — the D-14 live UAT step (stop/restart BBjServices, observe recovery) is exactly the check that would catch a divergence |

**All other claims in this research are `[VERIFIED: file:line]`** against code read directly this
session (`bbj-vscode/src/language/*.ts`, `bbj-vscode/test/*.ts`, `bbj-vscode/node_modules/langium/lib/**`,
`java-interop/src/**/*.java`, `/home/coder/repos/bbj-ls/src/**/*.java`) or `[VERIFIED: gh issue view]`
against the four GitHub issues' current bodies — no claim in the four Common-Pitfalls/Pattern sections
above rests on training-data assumptions about Langium's or Node's behavior.

## Open Questions

1. **Exact breaker cooldown/backoff numbers**
   - What we know: D-01/D-02 specify the *shape* (closed/open/half-open, request-driven, no
     background timer, reset on `clearCache()`), and success criterion 2 requires "about one connect
     timeout in total" for N unresolved classes while the breaker is open — i.e., the *initial* open
     state must not itself add meaningful extra delay beyond the one connect attempt that opened it.
   - What's unclear: the exact cooldown duration before the next half-open probe, the backoff
     multiplier, and the cap — CONTEXT.md defers all three to Claude's discretion with no numeric
     hint anywhere in the four GitHub issues.
   - Recommendation: pick small, clearly-commented constants (e.g. initial cooldown on the order of a
     few seconds, doubling backoff, capped at a low tens-of-seconds ceiling) and flag them in the plan
     as a discretionary product choice rather than a researched value, consistent with A1 above. The
     fake-timer regression tests (D-13) should assert the *shape* (breaker opens after one failure,
     probes exactly once per cooldown, recovers) rather than pinning exact millisecond values, so a
     later tuning pass doesn't break the tests.

2. **Whether `bbj-ls`'s per-connection `InteropService` behavior is universal across deployed
   BBjServices versions**
   - What we know: both the local dev `java-interop/` service and the `/home/coder/repos/bbj-ls`
     checkout construct a fresh `InteropService` per accepted socket connection (confirmed by reading
     both `SocketServiceApp.java` and `LanguageService.java` this session).
   - What's unclear: whether every BBjServices version a customer might run embeds the exact same
     `bbj-ls` behavior, or whether some versions might reuse an `InteropService` across reconnects
     (which would make D-04's classpath-reload step a harmless no-op rather than a required step).
   - Recommendation: implement the recovery sequence to always re-run `loadClasspath` +
     `loadImplicitImports` on open→closed transition regardless (it is cheap and idempotent against a
     peer that *did* keep state), and use D-14's live UAT restart check to confirm behavior against
     whatever BBjServices version is actually available in this environment.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js `async_hooks` (`AsyncLocalStorage`) | RESP-04 fix | Yes | Node builtin (confirmed present via `node -e "require('async_hooks').AsyncLocalStorage"` → `available`, this session) | none needed |
| `langium` 4.3.1 | All four fixes (base classes) | Yes | 4.3.1 `[VERIFIED: bbj-vscode/node_modules/langium/package.json]` | none needed |
| `vitest` ^4.1.10 | D-13's fake-timer regression tests | Yes | Confirmed via `bbj-vscode/package.json` scripts and existing `test/java-interop-timeouts.test.ts` using `vi.useFakeTimers()` | none needed |
| Live java-interop peer on :5008 | NOT required for this phase's automated tests (D-13 mandates fake peer + fake timers only) | N/A by design | — | D-14's UAT step does require a live BBjServices for the manual outage check, out of scope for automated CI |

**Missing dependencies with no fallback:** none.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | vitest ^4.1.10 `[VERIFIED: bbj-vscode/package.json]` |
| Config file | `bbj-vscode/vitest.config.ts` (existing, unchanged by this phase) |
| Quick run command | `cd /home/coder/repos/bbj-language-server/bbj-vscode && npx vitest run test/java-interop-service.test.ts test/java-interop-timeouts.test.ts test/completion-test.test.ts` |
| Full suite command | `cd /home/coder/repos/bbj-language-server/bbj-vscode && npx vitest run --maxWorkers=2` (per project memory: `--maxWorkers=2` avoids `beforeAll` hook-timeout contention that looks like failures but isn't) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| RESP-01 | Scope resolution / symbol collection cost stays flat as workspace size grows (counters + loose timing, D-12) | unit/regression | `npx vitest run test/scope-cost-regression.test.ts` (new file) | ❌ Wave 0 — new test file needed; reuse `test/lazy-prefix-loading.test.ts`'s `InMemoryFileSystemProvider` + `parseHelper({validation:false})` harness pattern (confirmed avoids `DocumentBuilder.build`'s BBjCPL/:5008 path since `shouldCompileWithBbjcpl` requires the document be registered in `textDocuments`, which `parseHelper` never does) |
| RESP-02 | N unresolved classes against a dead-then-live peer finish in ~one connect timeout; breaker resets on `clearCache()`; exactly one popup; transport stubs not cached; open docs re-checked once on recovery | unit/regression | `npx vitest run test/java-interop-breaker.test.ts` (new file) | ❌ Wave 0 — follow `test/java-interop-timeouts.test.ts`'s `HangingBackendInterop`-style override pattern with `vi.useFakeTimers()` |
| RESP-03 | A forced LRU eviction during a class's own cyclic Phase-2 resolution never stalls 30s / never produces a stub; `_inFlightPhase2` empty after success, timeout, and cancellation | unit/regression | `npx vitest run test/java-interop-service.test.ts` (extend existing file, new `describe` block) | ❌ Wave 0 — extend `test/java-interop-service.test.ts`'s existing `MockableJavaInteropService` with the injectable-LRU-limit seam (Pattern/Pitfall B above) |
| RESP-04 | Two concurrent completion requests on different documents each honor their own cancellation token, including through the `autoImportPrefixCache` memo | unit/regression | `npx vitest run test/completion-test.test.ts` (extend existing file, new `describe` block) | ❌ Wave 0 — extend the existing `describe('cancellation stops completion work at the next await boundary - P61-D2-013', ...)` block's pattern (`test/completion-test.test.ts:752-814`) with a two-document concurrent variant |

### Sampling Rate

- **Per task commit:** the single relevant new/extended test file (see table above)
- **Per wave merge:** `npx vitest run --maxWorkers=2` (full suite)
- **Phase gate:** full suite green (`numFailedTests: 0`, per this project's standing whole-suite-gate
  convention — DEBT.md item 5) before `/gsd-verify-work`; known pre-existing local-only failures
  (`linking.test.ts` interop (11), `issue447-real-interop` (1) against live :5008 drift) are excluded
  from the gate per existing project convention, not introduced by this phase

### Wave 0 Gaps

- [ ] `test/scope-cost-regression.test.ts` — covers RESP-01 (small-vs-large synthetic multi-document
  workspace, work-counter assertions per D-12)
- [ ] `test/java-interop-breaker.test.ts` — covers RESP-02 (breaker state machine, fake timers, fake
  peer)
- [ ] Extend `test/java-interop-service.test.ts` — covers RESP-03 (forced eviction during cyclic
  resolution)
- [ ] Extend `test/completion-test.test.ts` — covers RESP-04 (two-document concurrent cancellation)
- [ ] Test seam: `JavaInteropService`'s LRU limit made injectable via a protected factory method (no
  test file today exercises a non-default cache limit)
- [ ] Test seam: `_inFlightPhase2`'s size/emptiness needs a protected/public test accessor (mirroring
  how existing tests expose protected members, e.g. `MockableJavaInteropService.testResolveClass`)

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | This phase touches no auth surface |
| V3 Session Management | No | N/A |
| V4 Access Control | No | N/A |
| V5 Input Validation | Marginal | The breaker's error classification (Pattern 1) reads Node socket error codes (`ECONNREFUSED`/`EHOSTUNREACH`/etc.) — these are trusted, locally-sourced values from `net.Socket`, not attacker-controlled input; no new external input surface is introduced |
| V6 Cryptography | No | N/A |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Denial of service against the editing session via a slow/unreachable interop peer (the exact bug RESP-02 fixes) | Denial of Service | The circuit breaker itself *is* the mitigation this phase adds — short-circuiting after one connect-level failure instead of paying a per-class timeout tax |
| Unbounded memory growth from an in-flight tracking structure that never drains (a hypothetical regression in D-07's own fix) | Denial of Service (resource exhaustion) | D-08's "empty after settle" invariant, proven by the fake-timer regression test forcing timeout/cancellation mid-chain — this is the security-relevant property of the new `_inFlightPhase2` map, not just a correctness nicety |
| A completion request's cancellation being misapplied to an unrelated concurrent request's data (the exact bug RESP-04 fixes) | Tampering (cross-request data leakage between concurrently-served clients, in principle — though in this single-user LSP context the practical impact is wrong results, not a security breach) | `AsyncLocalStorage`-based isolation, verified by the two-concurrent-document regression test |

This phase does not introduce new attacker-reachable input, new authentication/authorization surface,
or new cryptographic material — its "security" content is almost entirely availability/resilience
(items already covered under Performance/Common Pitfalls above), so ASVS coverage here is
intentionally light.

## Sources

### Primary (HIGH confidence — read directly this session)

- `bbj-vscode/src/language/java-interop.ts` — full file read; breaker placement, LRU/registry design, `resolveClassByName`/`doResolveClassByName`/`resolveClass`/`createStubClass`/`clearCache`/`acquireLock`
- `bbj-vscode/src/language/bbj-notifications.ts` — full file read; `notifyJavaConnectionError`'s no-dedupe baseline, the module's own "avoid importing main.ts" isolation pattern
- `bbj-vscode/src/language/main.ts` — full file read; `reloadJavaClassesAndRevalidate`'s five steps, `bbj/refreshJavaClasses` handler, `onBuildPhase(DocumentState.Validated, ...)` usage
- `bbj-vscode/src/language/bbj-scope.ts` — full file read; `getBBjClassesFromFile`, `resolveClassScopeByName`
- `bbj-vscode/src/language/bbj-scope-local.ts` — full file read; `collectLocalSymbols`, `collectExportedSymbols`, `processNode`
- `bbj-vscode/src/language/bbj-linker.ts` — full file read; `link()`'s `treeIter.prune()` template
- `bbj-vscode/src/language/bbj-ws-manager.ts` — full file read; `isExternalDocument()`
- `bbj-vscode/src/language/bbj-completion-provider.ts` — full file read; `activeCancelToken`, `autoImportPrefixCache`, `completionForCrossReference`, `getCompletion`
- `bbj-vscode/src/language/bbj-index-manager.ts` — full file read; `BBjIndexManager.isAffected`
- `bbj-vscode/src/language/bbj-document-builder.ts` (excerpt, lines 80-280) — `hasPendingWork`, `shouldValidate`, `buildDocuments`, the "onBuildPhase triggers a CPU rebuild loop" warnings
- `bbj-vscode/src/language/bbj-module.ts` (grep) — DI wiring confirming `IndexManager: BBjIndexManager`
- `bbj-vscode/test/java-interop-timeouts.test.ts` — full file read; `HangingBackendInterop` override pattern, fake-timer conventions
- `bbj-vscode/test/java-interop-service.test.ts` — full file read; `MockableJavaInteropService`, existing LRU-bound test
- `bbj-vscode/test/bbj-test-module.ts` — full file read; `JavaInteropTestService`, `createBBjTestServices`
- `bbj-vscode/test/test-helper.ts` — full file read; `initializeWorkspace`, `shouldRunBBjTests`
- `bbj-vscode/test/lazy-prefix-loading.test.ts` — full file read; the `parseHelper({validation:false})` + `InMemoryFileSystemProvider` harness pattern reused for RESP-01's test design
- `bbj-vscode/test/completion-test.test.ts` (excerpt, lines 750-840) — existing cancellation-test conventions
- `bbj-vscode/node_modules/langium/lib/workspace/index-manager.d.ts` and `.js` — `IndexManager` interface, `DefaultIndexManager.updateContent`'s exact implementation
- `bbj-vscode/node_modules/langium/lib/lsp/completion/completion-provider.d.ts` — `CompletionContext`, `completionFor`/`completionForCrossReference` signatures (no token parameter)
- `bbj-vscode/node_modules/langium/lib/lsp/language-server.js` (excerpts) — `addCompletionHandler`, `createRequestHandler`, `waitUntilPhase`, `addDiagnosticsHandler`
- `bbj-vscode/node_modules/langium/lib/workspace/documents.d.ts` (excerpt) — `DocumentState` enum ordering
- `bbj-vscode/package.json` — `langium` 4.3.1, `vitest` ^4.1.10, test scripts
- `java-interop/src/main/java/bbj/interop/InteropService.java` — full file read; `getClassInfo`/`loadClasspath`/"Class not found" shape
- `java-interop/src/main/java/bbj/interop/SocketServiceApp.java` — full file read; per-connection `new InteropService()`
- `/home/coder/repos/bbj-ls/src/main/java/bbj/interop/InteropService.java` — read via `diff` against the local dev copy plus targeted greps; `SCAN_CACHE`/SSCP/per-connection classpath-state comment
- `/home/coder/repos/bbj-ls/src/main/java/bbj/interop/LanguageService.java` (excerpt, lines 40-110) — per-connection `new InteropService()` in the production backend's accept loop
- GitHub issues #505, #504, #497, #498 (`gh issue view <n>`) — Problem/Evidence/Failure scenario/Proposed approach/Acceptance criteria text, cross-checked against current code
- `.planning/phases/91-language-server-responsiveness/91-CONTEXT.md`, `.planning/REQUIREMENTS.md`, `.planning/STATE.md`, `.planning/research/PITFALLS.md` (§Pitfall 6/7/8) — full read, as required reading

### Secondary / Tertiary

None — this research used no WebSearch/WebFetch; every claim traces to a file read or `gh` command
executed this session, per the phase's own "no host-side changes, pure language-server internals"
scope not requiring any external-ecosystem lookup.

## Project Constraints (from CLAUDE.md)

- `npm run langium:generate` is only needed after grammar changes — this phase touches no `.langium`
  grammar file, so it is not required.
- Tests use Vitest with `EmptyFileSystem`/`langium/test` utilities; for Java-interop-backed tests use
  `createBBjTestServices`/`JavaInteropTestService` from `test/bbj-test-module.ts` (already followed by
  this research's recommended test harnesses).
- `npm test` (plain) must not require BBj/java-interop reachability; `RUN_BBJ_TESTS=1`/`test:bbj` is
  opt-in only — this phase's D-13 mandate (fake peer + fake timers, no live :5008) already matches this
  constraint exactly.
- Shell/file-access rules (absolute paths, no bare recursive `grep`/`find`, no `cd`-chained reads) were
  followed throughout this research session.
- AST `$type` checks use the generated `ClassName` string constants and `isXxx()` type guards
  (`generated/ast.ts`) — followed in all code-example snippets above (e.g. `BbjClass.$type`,
  `isBBjClassMember`).

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new dependency; every API used (`AsyncLocalStorage`, `langium` base
  classes) confirmed present and version-pinned this session
- Architecture: HIGH — every proposed mechanism (breaker placement, `_inFlightPhase2`, `BBjIndexManager`
  reverse index, `collectLocalSymbols` pruning, `AsyncLocalStorage`) is grounded in code read this
  session, including the Langium framework internals that determine whether each mechanism is even
  mechanically possible
- Pitfalls: HIGH — both major pitfalls (recovery-sequence classpath-state loss; LRU-eviction-vs-cyclic-
  resolution race) were traced to an exact, quoted, line-cited mechanism this session, going beyond
  what CONTEXT.md/the GitHub issues already stated
- Assumptions: LOW-risk — the only two assumptions logged (A1: discretionary breaker tuning constants;
  A3: production BBjServices version parity with the checked-out `bbj-ls`) are both already flagged as
  open/discretionary in CONTEXT.md or covered by D-14's live UAT step

**Research date:** 2026-09-12
**Valid until:** 30 days (stable, internal-only code paths; no external framework/ecosystem drift risk
since no new dependency is introduced) — re-verify sooner only if `langium` is upgraded past 4.3.1
before this phase is planned/executed, since the exact absence of a token parameter on
`completionFor`/`completionForCrossReference` is version-specific and should be re-checked against
whatever `langium` version is installed at plan time.
