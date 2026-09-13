---
phase: 90-composer-robustness-intellij-composer-performance
plan: 03
subsystem: intellij-composer
tags: [intellij, composer, cache, lsp4ij, completablefuture, junit5]

requires:
  - phase: 82-composer-request-consolidation-stale-edit-guard
    provides: ComposerFlow's single terminal-handler chain (server -> catalogs -> decodeCall) and
      StaleEditGuard/ComposerNotices that this plan's cache clearing builds on
provides:
  - ComposerHandleCache, a plain-Java per-project memo of the resolved BbjComposerServer proxy and
    ComposerCatalogs with identity-checked invalidation
  - BbjComposerService as a Disposable project service owning one cache, subscribed to
    BbjServerStatusListener.TOPIC
  - ComposerFlow.launch and ComposerLauncher.launchAt routed through the cache instead of a raw
    per-call server future
affects: [90-08]

actuals:
  tokens: 13140
  tasks: 2
  commits: 5

tech-stack:
  added: []
  patterns:
    - "Plain-Java identity-checked memo (no IntelliJ/time-source import), same shape as
      BbjInteropPortCache/TokenValidationCache"
    - "Project service implements Disposable, subscribes to a Topic in its own constructor
      (BbjJavaInteropService precedent)"
    - "Static facade delegates to project.getService(...) so unrelated callers need no edit"

key-files:
  created:
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ComposerHandleCache.java
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerHandleCacheTest.java
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/BbjComposerServiceSourceGuardTest.java
  modified:
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/BbjComposerService.java
    - bbj-intellij/src/main/resources/META-INF/plugin.xml
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ComposerFlow.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ComposerLauncher.java
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerFlowTest.java
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/Lsp4ijOverrideSiteSourceGuardTest.java

key-decisions:
  - "ComposerHandleCache is package-private (not public) since every caller (BbjComposerService,
    ComposerFlow, ComposerLauncher) lives in the composer package; only BbjComposerService's static
    facades are public API surface."
  - "ComposerFlow.launch's terminal handle() calls handles.invalidate() unconditionally on any
    failure -- including a null server -- even though ComposerHandleCache.server() already
    self-clears on a null/exceptional result; the extra call is a harmless no-op in that case and
    the single required call site for the failed-decode case (a non-null, still-live-looking proxy
    whose request simply failed)."

requirements-completed: []

coverage:
  - id: D1
    description: "A second composer open in the same IntelliJ session reuses the cached server proxy
      and catalogs, performing zero server-resolution and zero bbj/composer/catalogs requests, while
      still sending its own decode request every time."
    requirement: DISC-11
    verification:
      - kind: unit
        ref: "ComposerHandleCacheTest#twoServerCallsInvokeTheResolverOnceAndReturnTheSameFutureInstance"
        status: pass
      - kind: unit
        ref: "ComposerHandleCacheTest#twoCatalogsCallsForTheResolvedProxyPerformOneRequestAndReturnTheSameFuture"
        status: pass
      - kind: unit
        ref: "ComposerFlowTest#aSecondLaunchThroughTheSameHandlesReusesServerAndCatalogsButDecodesAgain"
        status: pass
    human_judgment: true
    rationale: "The live 'second open is faster, and still works after Restart Language Server' check
      is staged as an end-of-phase human check by plan 90-08, per this plan's own <verification>
      step 5."
  - id: D2
    description: "Any BbjServerStatusListener.TOPIC status change clears the cache, so a restart,
      crash, manual restart or config-reload restart never serves a stale proxy; a resolution that
      started before a clear is never served to a caller after that clear."
    requirement: DISC-11
    verification:
      - kind: unit
        ref: "ComposerHandleCacheTest#invalidateAfterAFilledCacheMakesTheNextServerAndCatalogsResolveAgain"
        status: pass
      - kind: unit
        ref: "ComposerHandleCacheTest#invalidateWhilePendingMeansTheStaleCompletionIsNeverServedAndTheNextServerResolvesAgain"
        status: pass
      - kind: unit
        ref: "BbjComposerServiceSourceGuardTest#theServiceSubscribesOnceAndInvalidatesFromThatSubscriptionWithNoDirectCatalogsFetch"
        status: pass
    human_judgment: false
  - id: D3
    description: "A failed launch (a dead cached proxy, a failed request, or the single
      LAUNCH_TIMEOUT_MILLIS deadline) clears the cache before showing the existing notReady/
      requestFailed balloon, so the balloon Retry resolves from scratch with no silent retry inside
      the deadline."
    requirement: DISC-11
    verification:
      - kind: unit
        ref: "ComposerFlowTest#aFailedLaunchClearsTheHandlesSoTheRetryResolvesFromScratch"
        status: pass
      - kind: unit
        ref: "ComposerFlowTest#aNullServerIsNotKeptAndRaisesNotReady"
        status: pass
      - kind: unit
        ref: "BbjComposerServiceSourceGuardTest#theFlowSeamHasNoDirectCatalogsFetchAndInvalidatesOnceInsideItsOwnTerminalHandler"
        status: pass
    human_judgment: false
  - id: D4
    description: "BbjCompileAction and BbjRefreshJavaClassesAction keep using the unchanged static
      BbjComposerService.server(project) facade with no edit, and the LSP4IJ import allowlist for
      BbjComposerService.java stays at LanguageServerManager only."
    requirement: DISC-11
    verification:
      - kind: unit
        ref: "BbjComposerServiceSourceGuardTest#theTwoUnrelatedActionsStillUseTheUnchangedStaticFacade"
        status: pass
      - kind: unit
        ref: "Lsp4ijImportAllowlistTest (whole suite run, unmodified)"
        status: pass
      - kind: integration
        ref: "git -C bbj-language-server diff HEAD --stat -- bbj-intellij/src/main/java/com/basis/bbj/intellij/actions"
        status: pass
    human_judgment: false

duration: 25min
completed: 2026-09-12
status: complete
---

# Phase 90 Plan 03: IntelliJ Composer Server/Catalogs Handle Cache Summary

**A per-project `ComposerHandleCache` memoizes the resolved `BbjComposerServer` proxy and its
`ComposerCatalogs`, invalidated on any language-server status change and on any launch failure, so a
second composer open in the same IntelliJ session sends zero server-resolution and zero catalogs
requests while still decoding the caret line every time.**

## Performance

- **Duration:** 25 min
- **Started:** 2026-09-12T20:13:27Z (approx, from prior plan's STATE.md timestamp)
- **Completed:** 2026-09-12T20:24:17Z
- **Tasks:** 2
- **Files modified:** 9 (3 created, 6 modified)

## Accomplishments

- `ComposerHandleCache` (new, plain Java, no IntelliJ or time-source import): a `synchronized`
  memo over `server()` and `catalogs(server)`, each backed by a stored `CompletableFuture`
  cleared by `invalidate()` or by its own `whenComplete` when the result is `null` or
  exceptional — including the case where `invalidate()` races a still-pending resolution, whose
  late completion lands on a future the cache no longer references and is dropped.
- `BbjComposerService` converted from a static-only two-line facade into a `Disposable` project
  service owning one `ComposerHandleCache`, subscribed to
  `BbjServerService.BbjServerStatusListener.TOPIC` in its constructor so starting, stopping, a
  crash, a manual restart and a config-reload restart all clear the cache. The static
  `server(Project)` facade is unchanged (now delegating to the cache), so `BbjCompileAction` and
  `BbjRefreshJavaClassesAction` needed no edit. Registered in `plugin.xml` as a `projectService`.
- `ComposerFlow.launch` now takes a `ComposerHandleCache` instead of a raw
  `CompletableFuture<BbjComposerServer>`: the chain reads `handles.server()` then
  `handles.catalogs(server)`, and the single terminal `handle()` calls `handles.invalidate()`
  before notifying on any failure, so the balloon Retry always resolves from scratch.
  `ComposerLauncher.launchAt` resolves `BbjComposerService.handles(project)` once and passes it to
  all six `flow.launch(...)` call sites (MSGBOX, addWindow, addChildWindow, SETOPTS,
  SETOPTS-in-code, CVS).
- Catalogs are fetched lazily: `ComposerHandleCache.catalogs(server)` only memoizes a result when
  `server` is the exact proxy the current `server()` entry resolved to, so a stray or superseded
  proxy is requested on every call and never cached.

## Task Commits

Each task followed RED-GREEN, with one additional fix commit for a comment-discipline violation
caught by the plan's own register scan:

1. **Task 1: Composer handle cache + `BbjComposerService` project-service conversion**
   - `2176f46e` test(90-03): add failing coverage for the composer handle cache
   - `4fdbfae0` feat(90-03): cache the composer server proxy per project, invalidated on status change
2. **Task 2: Route `ComposerFlow`/`ComposerLauncher` through the cache**
   - `25a50eea` test(90-03): add failing coverage for cache reuse across composer launches
   - `ac4eadf7` feat(90-03): route composer launches through the per-project handle cache
   - `31ca387b` fix(90-03): drop a decision-id reference leaked into a test assertion message

_Note: TDD tasks produced RED then GREEN commits; Task 2's plan-level register scan (step 3 of
`<verification>`) caught a decision id (`D-17`) that had leaked into a test assertion message,
fixed in a follow-up `fix(90-03)` commit before the plan-level verification was re-run clean._

## Files Created/Modified

- `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ComposerHandleCache.java` (new) —
  the plain-Java memo: `server()`, `catalogs(BbjComposerServer)`, `invalidate()`.
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerHandleCacheTest.java` (new) —
  hit, invalidation, stale-completion, null/exceptional-result and no-time-source coverage using a
  `java.lang.reflect.Proxy`-based `BbjComposerServer` double.
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/BbjComposerServiceSourceGuardTest.java`
  (new) — wiring pins for the service registration, the single status subscription, the flow's
  single `invalidate()` call site and its position, the launcher's cache usage, and the two
  untouched actions.
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/BbjComposerService.java` — now a
  `Disposable` project service; `server(Project)` facade unchanged; new `handles(Project)`
  accessor; server resolution logic moved into a private `resolveServer(Project)`.
- `bbj-intellij/src/main/resources/META-INF/plugin.xml` — new `projectService` registration.
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ComposerFlow.java` — `launch(...)`
  takes a `ComposerHandleCache`; terminal handler clears it on any failure before notifying.
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ComposerLauncher.java` — `launchAt`
  resolves the cache once and passes it to all six `flow.launch(...)` calls.
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerFlowTest.java` — every
  `flow.launch(...)` call site wrapped in a `ComposerHandleCache`; `FakeComposerServer` gained
  `catalogsRequests`/`decodeRequests` counters; three new reuse/failure-clears/null-not-kept tests.
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/Lsp4ijOverrideSiteSourceGuardTest.java` —
  the guarded method-body lookup renamed from `server(...)` to `resolveServer(...)`.

## Decisions Made

- `ComposerHandleCache` stays package-private: every production caller
  (`BbjComposerService`, `ComposerFlow`, `ComposerLauncher`) already lives in the `composer`
  package, so only `BbjComposerService`'s static `handles(Project)`/`server(Project)` facades need
  to be public.
- `ComposerFlow`'s terminal handler calls `handles.invalidate()` unconditionally on any failure,
  including the null-server case where `ComposerHandleCache` has already self-cleared — the extra
  call is a cheap no-op there and is the one call site needed for the failed-decode case (a
  proxy that looked live but whose request failed).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Comment-discipline register-scan violation in a new test's assertion message**
- **Found during:** Task 2, running the plan-level `<verification>` register scan after the GREEN
  commit for Task 2 landed.
- **Issue:** `BbjComposerServiceSourceGuardTest`'s `theServiceSubscribesOnceAndInvalidatesFrom...`
  test's assertion message parenthetically cited a decision id (`D-17`), violating this plan's
  interface-block comment-discipline rule (no plan/decision/gap ids in source or test comments).
- **Fix:** Removed the parenthetical citation, keeping the assertion message's substantive wording
  (catalogs are fetched lazily on first open, never on the status subscription) unchanged.
- **Files modified:**
  `bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/BbjComposerServiceSourceGuardTest.java`
- **Verification:** re-ran the targeted test class (still green) and the plan-level register scan
  (`git diff $BASE..HEAD -- bbj-intellij | grep '^+' | grep -nE '...'`), which now exits 1 (no
  match).
- **Committed in:** `31ca387b`

---

**Total deviations:** 1 auto-fixed (1 Rule 1 — comment-discipline bug caught by the plan's own gate).
**Impact on plan:** Cosmetic; no production or test behavior changed. No scope creep.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- DISC-11 (#612) is code-complete and covered by unit tests; per this plan's `requirements-completed`
  frontmatter left empty by design — the plan's own interface block instructs the executor not to
  mark DISC-11 complete in `REQUIREMENTS.md` here (it stays `Pending` until the phase's live human
  checks close it, staged by plan 90-08).
- `./gradlew test --offline` is green for the whole `bbj-intellij` module (824 tests, 0 failures, 0
  errors) after this plan's changes.
- Live verification ("second open is faster, and still works after Restart Language Server") is
  explicitly deferred to plan 90-08's end-of-phase human check, per this plan's own
  `<verification>` step 5 — no blocker, by design.

---

## Self-Check: PASSED

All 9 created/modified source files and the SUMMARY.md itself verified present on disk; all 5
task/fix commits (`2176f46e`, `4fdbfae0`, `25a50eea`, `ac4eadf7`, `31ca387b`) verified present in
git history. `./gradlew test --offline` re-run clean (824 tests, 0 failures, 0 errors). Plan-level
register scan and scope-diff checks re-run clean after the comment-discipline fix.

---

*Phase: 90-composer-robustness-intellij-composer-performance*
*Completed: 2026-09-12*
