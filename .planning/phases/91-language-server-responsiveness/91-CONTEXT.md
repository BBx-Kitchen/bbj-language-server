# Phase 91: Language Server Responsiveness - Context

**Gathered:** 2026-09-12
**Status:** Ready for planning

<domain>
## Phase Boundary

Four language-server-internal fixes, no host-side (VS Code extension or IntelliJ plugin) changes:

- **RESP-01 (#505):** scope resolution for `::file::Class` references and local symbol collection
  stop scaling with total workspace size (`bbj-scope.ts` `getBBjClassesFromFile`,
  `bbj-scope-local.ts` `collectLocalSymbols`).
- **RESP-02 (#504):** with java-interop unreachable, validating a document with many unresolved
  Java classes waits about one connect timeout in total; resolution resumes once the peer is back,
  without `clearCache()` (`java-interop.ts`).
- **RESP-03 (#497):** a class that genuinely resolves never stalls 30 s or degrades to a stub
  because the LRU evicted it during its own cyclic resolution (`java-interop.ts`).
- **RESP-04 (#498):** concurrent completion requests on different documents each honor their own
  cancellation token (`bbj-completion-provider.ts`).

**Milestone posture (stated by the user):** keep the rest of v4.3 lean — the release is due soon.
Every decision below picks the smallest change that meets the ROADMAP success criteria; anything
wider is a deferred idea, not scope.

</domain>

<decisions>
## Implementation Decisions

### Interop outage & recovery (RESP-02)
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

### Lock scope & eviction guard (RESP-02, RESP-03)
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

### PREFIX files & scope cost (RESP-01)
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

### Completion cancellation (RESP-04)
- **D-11:** Rule stated during discussion and not contested: **one completion request's cancellation
  never affects another request's result.** The `activeCancelToken` instance field goes away; the
  token reaches `completeAutoImportClasses` per request, never through state shared on the singleton
  provider (research Pitfall 8). The second layer counts too: `autoImportPrefixCache` shares one
  in-flight `findClassCandidatesByPrefix` promise across requests for up to its TTL, and that promise
  is created with the **first** caller's token. A cancelled first request must not reject or empty a
  concurrent second request's lookup for the same prefix.

### Verification
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

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope and requirements
- `.planning/ROADMAP.md` §"Phase 91: Language Server Responsiveness" — goal and the four success
  criteria (criteria 2/3/4 cite research Pitfalls 6/7/8).
- `.planning/REQUIREMENTS.md` — RESP-01..RESP-04 wording (RESP-02: "the breaker resets on cache clear
  or Refresh Java Classes").
- GitHub issues #505, #504, #497, #498 (`gh issue view <n> --repo BBx-Kitchen/bbj-language-server`) —
  Problem, Evidence, Failure scenario, Proposed approach / Possible directions, Acceptance criteria.
  Line numbers in them are stale. #497 and #498 came from the Phase 67 code review (WR-01, WR-03).

### Research
- `.planning/research/PITFALLS.md` §"Pitfall 6" — breaker must half-open and recover without
  `clearCache()`; slow-but-healthy must not trip it.
- `.planning/research/PITFALLS.md` §"Pitfall 7" — unguard in `finally` on every exit path; test
  cancellation and timeout mid-recursion. Its "bound by `MAX_RESOLUTION_DEPTH`" suggestion is
  corrected by D-08.
- `.planning/research/PITFALLS.md` §"Pitfall 8" — no instance-field token, however narrow; the
  two-concurrent-documents regression test; live-interop flakiness warning.

### Test harness notes
- `.planning/DEBT.md` — `shouldRunBBjTests()` gates on a bare TCP connect to :5008, so live-interop
  suites switch on locally against BBjServices. Known local drift: `linking.test.ts` interop (11) and
  `issue447-real-interop` (1) fail against the current backend and are not regressions (the todo was
  reviewed and deliberately not folded).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `bbj-vscode/src/language/java-interop.ts`:
  - `connect()` / `connectingPromise` already share one in-flight connect among same-tick callers;
    the breaker sits in front of it.
  - `createSocket()` has the 10 s connect timeout; `getRawClass()` has a 10 s request race;
    `doResolveClassByName()` has the 30 s chain race.
  - `createStubClass(className, cache)` already has the `cache` flag D-03 needs.
  - `clearCache()` is the single reset point.
  - `LruMap` / `RESOLVED_CLASSES_CACHE_LIMIT`; `_pendingResolutions`.
- `bbj-vscode/src/language/bbj-notifications.ts` `notifyJavaConnectionError` — called from
  `establishConnection()` on every failed connect; D-05 gates it.
- `bbj-vscode/src/language/main.ts` `reloadJavaClassesAndRevalidate()` step 4 — the open-document
  reset + `DocumentBuilder.update` that D-04 reuses; `bbj/refreshJavaClasses` handler.
- `bbj-vscode/src/language/bbj-linker.ts` `link()` — the external-document `isBBjClassMember` +
  `treeIter.prune()` template for D-09.
- `bbj-vscode/src/language/bbj-ws-manager.ts` `isExternalDocument()` — prefix-only test, unchanged.
- `bbj-vscode/src/language/bbj-scope.ts` `getBBjClassesFromFile()` — the full
  `indexManager.allElements(BbjClass.$type)` scan.
- `bbj-vscode/src/language/bbj-scope-local.ts` `collectLocalSymbols()` — unpruned
  `AstUtils.streamAllContents` walk with async `processNode`.
- `bbj-vscode/src/language/bbj-completion-provider.ts` — `activeCancelToken` (set in
  `getCompletion`, read in `completionForCrossReference`), `autoImportPrefixCache` +
  `findClassCandidatesByPrefixCached`.
- Tests: `bbj-vscode/test/java-interop-timeouts.test.ts` (`HangingBackendInterop` override of
  `connect()`/`createSocket()` + fake timers), `bbj-vscode/test/java-interop-service.test.ts`
  (existing LRU bound test, independent classes only), `bbj-vscode/test/completion-test.test.ts`,
  `bbj-vscode/test/bbj-test-module.ts` (`createBBjTestServices`, `JavaInteropTestService`),
  `bbj-vscode/test/test-helper.ts`.

### Established Patterns
- Cleanup guarantees are scoped to every exit path (`finally`), with no silent fourth outcome.
- Tests parse with `parseHelper`-style helpers, not `DocumentBuilder.build`, which triggers
  BBjCPL and :5008 and is flaky locally and fails on GitHub. Pick a RESP-01 workspace harness that
  avoids both.
- Vitest runs with cwd = `bbj-vscode` (`npx vitest run <file>`). The whole-suite gate is
  `numFailedTests: 0`; "failed suites" with zero failed tests are `beforeAll` hook-timeout
  contention (use `--maxWorkers=2`).
- No plan / decision ids (D-xx, plan numbers) in source or test comments; issue numbers are fine.

### Integration Points
- `bbj/refreshJavaClasses` → `reloadJavaClassesAndRevalidate()` → `clearCache()`: the breaker and
  registry reset path.
- `loadImplicitImports()` runs `resolveClass` concurrently via `Promise.all` outside the lock. It
  shapes registry occupancy (D-08) and startup behavior under an open breaker.
- D-04's recovery rebuild goes through `DocumentBuilder.update`, the same path Phase 85's
  `hasPendingWork()` quiescence wait observes.
- Both IDEs load the same `out/language/main.cjs`, so no VS Code extension or IntelliJ plugin code
  changes. UAT still needs both distributables rebuilt.

</code_context>

<specifics>
## Specific Ideas

- The user's priority for this phase and Phase 92 is a lean milestone and an early release: prefer the
  minimal fix that satisfies each success criterion.
- UAT scenario (D-14): open a BBj file that uses Java classes, stop BBjServices, and observe one popup
  and no stall. Start BBjServices and watch the diagnostics clear by themselves.

</specifics>

<deferred>
## Deferred Ideas

- Replace the global resolution lock with per-class concurrent resolution (faster startup and
  validation with a healthy peer). Rejected for this phase by D-06.
- Narrow `isExternalDocument()` so a PREFIX file inside a workspace folder, or open in the editor,
  gets full body linking and symbol collection (resolves its TODO; changes linker diagnostics).
- A background interop health probe, or sharing IntelliJ's status-bar probe with the language server.
- An info "Java interop service reachable again" message on recovery.
- The broader CPU-stability mitigations from #232 beyond #505.

### Reviewed Todos (not folded)
- **Update live-interop tests for the upgraded java-interop backend (getAllClassNames)**
  (`.planning/todos/pending/2026-09-03-update-live-interop-tests-for-getallclassnames-backend.md`):
  test hygiene. Not folded, to keep the milestone lean; D-13 needs no live interop.
- **gradle-wrapper-hygiene test fixture declares Gradle 8.13**
  (`.planning/todos/pending/2026-09-05-gradle-wrapper-hygiene-fixture-declares-stale-gradle-version.md`):
  unrelated IntelliJ build test, and reportedly already fixed on 2026-09-06.
- **A configured-but-unusable Node.js path suppresses the cached-download fallback**
  (`.planning/todos/pending/2026-09-06-configured-node-path-suppresses-cached-download-fallback.md`):
  an IntelliJ Node detection product decision, unrelated.
- **Live Windows check for the Node.js auto-install failure**
  (`.planning/todos/pending/2026-09-06-live-windows-check-for-node-auto-install-failure.md`):
  maintainer-owned human attestation, out of scope per REQUIREMENTS.md.

</deferred>

---

*Phase: 91-language-server-responsiveness*
*Context gathered: 2026-09-12*
