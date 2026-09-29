---
phase: 121-java-interop-service-decomposition
plan: "01"
subsystem: api
tags: [langium, dependency-injection, javadoc, java-interop]

requires:
  - phase: 120-classvalidator-activate-splits
    provides: sibling-module split pattern (check-classes.ts precedent)
provides:
  - "services.java.JavadocProvider DI key registered in BBjServices"
  - "JavaInteropService, BBjHoverProvider and BBjWorkspaceManager read the Javadoc provider from services instead of a getInstance() singleton"
  - "Every test services factory (createBBjTestServices, createCountingInteropServices, createFakePeerServices, java-interop-service.test.ts's createServices) registers its own initialised JavadocProvider"
affects: [121-02-javadocprovider-di-second-half, 121-03-through-121-10-javainteropservice-split]

actuals:
  tokens: 6953
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "DI service registered next to an existing sibling service (JavadocProvider next to JavaInteropService in bbj-module.ts's java group), mirroring the established JavaInteropService registration shape"
    - "Test services factories override the production DI factory with createInitializedJavadocProvider(fileSystemProvider), a synchronous already-initialised-with-no-roots provider, so no test double needs its own isInitialized() guard"

key-files:
  created: []
  modified:
    - bbj-vscode/src/language/java-javadoc.ts
    - bbj-vscode/src/language/bbj-module.ts
    - bbj-vscode/src/language/java-interop.ts
    - bbj-vscode/src/language/bbj-hover.ts
    - bbj-vscode/src/language/bbj-ws-manager.ts
    - bbj-vscode/test/bbj-test-module.ts
    - bbj-vscode/test/counting-java-interop.ts
    - bbj-vscode/test/fake-interop-peer.ts
    - bbj-vscode/test/java-interop-service.test.ts
    - bbj-vscode/test/java-interop-peer-guard.test.ts
    - bbj-vscode/test/javadoc-markdown-escape.test.ts
    - bbj-vscode/test/inlay-hints-javadoc.test.ts

key-decisions:
  - "The production DI factory hands out the existing process-wide JavadocProvider.getInstance() instance (not a fresh one) — this is a deliberate ordering step so the three source readers move with zero test change and the test factories move next while the not-yet-moved live-interop test files still see the same object. Plan 02 replaces the factory with a fresh instance per services set and deletes getInstance()."
  - "createBBjTestServices grew an optional second javadocProvider parameter, injected as one more DI module after BBjTestModule, so inlay-hints-javadoc.test.ts can hand it a provider pre-loaded with fake javadoc files instead of racing createBBjTestServices to initialise the old singleton first."

requirements-completed: []

coverage:
  - id: D1
    description: "services.java.JavadocProvider exists in BBjServices; JavaInteropService, BBjHoverProvider and BBjWorkspaceManager read it via constructor injection instead of JavadocProvider.getInstance()"
    verification:
      - kind: unit
        ref: "test/java-interop-service.test.ts, test/hover.test.ts, test/ws-manager.test.ts, test/javadoc.test.ts, test/inlay-hints-javadoc.test.ts, test/javadoc-markdown-escape.test.ts (23 load-bearing suites, run twice)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Every test services factory (createBBjTestServices, createCountingInteropServices, createFakePeerServices, java-interop-service.test.ts's createServices) registers a fresh, already-initialised JavadocProvider; the four isInitialized() guards in JavaInteropTestService, CountingJavaInteropService, FakePeerInteropService and MockableJavaInteropService constructors are deleted"
    verification:
      - kind: unit
        ref: "custom hygiene commands: 'test wiring OK', 'doubles unchanged apart from javadoc wiring', grep -c 'getInstance().isInitialized()' == 0 for all four files"
        status: pass
    human_judgment: false
  - id: D3
    description: "No test assertion, test name or describe name changed from the base; whole suite has no failing name absent from the base list; lint, typecheck:test and build pass; only the twelve planned files changed"
    verification:
      - kind: unit
        ref: "whole suite (npx vitest run --maxWorkers=2, base vs. post-plan), assertions-unchanged comm check, hygiene id-scan check"
        status: pass
    human_judgment: false

duration: 12min
completed: 2026-09-29
status: complete
---

# Phase 121 Plan 01: JavadocProvider DI Wiring (first half) Summary

**`JavadocProvider` is now read from `services.java.JavadocProvider` by its three production readers and by every test services factory, while `getInstance()` itself still exists and the production factory still hands out the one process-wide instance until plan 02.**

## Performance

- **Duration:** 12 min
- **Started:** 2026-09-29T10:28:00Z (approx.)
- **Completed:** 2026-09-29T10:40:03Z
- **Tasks:** 2
- **Files modified:** 12 source/test files (5 production `src/`, 7 `test/`)

## Accomplishments

- Base evidence recorded before any source edit: base SHA, whole-suite failing names (base list: only `test/functional/installed-extension-e2e.test.ts > (suite failed)`, `numFailedTests=0`), a clean run of the 23 load-bearing suites, the 23-line load-bearing list, and the `:5008` peer state (`up`) — all on disk under `/home/coder/repos/tmp/phase-121/`.
- `JavadocProvider`'s constructor is now public (was `protected`); `getInstance()` and `_instance` are unchanged and still present (deleted in plan 02).
- `services.java.JavadocProvider` registered in `bbj-module.ts`'s `BBjAddedServices` type and `BBjModule` module, next to `JavaInteropService`, with the production factory `() => JavadocProvider.getInstance()`.
- `JavaInteropService`, `BBjHoverProvider` and `BBjWorkspaceManager` (via `bbjServices.java`) read the provider from services instead of calling `JavadocProvider.getInstance()`. `tryInitializeJavaDoc` in `bbj-ws-manager.ts` takes the provider as a new first parameter; its `isInitialized()` guard and `initialize()` call are otherwise unchanged.
- `createInitializedJavadocProvider(fileSystemProvider)` (new export in `bbj-test-module.ts`) builds a fresh `JavadocProvider`, calls `initialize([], fileSystemProvider)` unawaited, and throws if `isInitialized()` is not synchronously true afterward.
- `createBBjTestServices`, `createCountingInteropServices`, `createFakePeerServices` and `java-interop-service.test.ts`'s `createServices` all register their own `JavadocProvider` via `createInitializedJavadocProvider`; the `isInitialized()` guard blocks in `JavaInteropTestService`, `CountingJavaInteropService`, `FakePeerInteropService` and `MockableJavaInteropService` constructors are deleted.
- `createBBjTestServices` grew an optional second `javadocProvider` parameter; `inlay-hints-javadoc.test.ts` uses it to hand the test services a provider already reading its fake javadoc file system, instead of relying on running before `createBBjTestServices` to win a race against the old singleton.
- `java-interop-peer-guard.test.ts` (5 spies) and `javadoc-markdown-escape.test.ts` (5 spies) retarget `vi.spyOn(JavadocProvider.getInstance(), ...)` to the services' own provider (`BBj.java.JavadocProvider` / `services.BBj.java.JavadocProvider`).

## Task Commits

Each task was committed atomically:

1. **Task 1: Phase base recorded, then JavaInteropService, hover and the workspace manager read the Javadoc provider from services.java.JavadocProvider** - `5bb265c8` (refactor)
2. **Task 2: Test services register a fresh, initialised provider; the test doubles lose their guards; javadoc spies and the inlay-hint fixture target the services' provider** - `0e39b69a` (test)

**Plan metadata:** committed as part of this SUMMARY's own commit (docs).

## Files Created/Modified

- `bbj-vscode/src/language/java-javadoc.ts` - constructor made public
- `bbj-vscode/src/language/bbj-module.ts` - added `services.java.JavadocProvider` DI key and factory
- `bbj-vscode/src/language/java-interop.ts` - `javadocProvider` field now assigned from `services.java.JavadocProvider` in the constructor
- `bbj-vscode/src/language/bbj-hover.ts` - `javadocProvider` field now assigned from `services.java.JavadocProvider` in the constructor
- `bbj-vscode/src/language/bbj-ws-manager.ts` - captures `javadocProvider` from `bbjServices.java`, passes it into `tryInitializeJavaDoc`
- `bbj-vscode/test/bbj-test-module.ts` - `createInitializedJavadocProvider` export, `createBBjTestServices`'s new optional `javadocProvider` param, `BBjTestModule`'s `JavadocProvider` factory, guard deleted from `JavaInteropTestService`
- `bbj-vscode/test/counting-java-interop.ts` - `JavadocProvider` factory added, guard deleted from `CountingJavaInteropService`
- `bbj-vscode/test/fake-interop-peer.ts` - `JavadocProvider` factory added, guard deleted from `FakePeerInteropService`
- `bbj-vscode/test/java-interop-service.test.ts` - `JavadocProvider` factory added, guard deleted from `MockableJavaInteropService`
- `bbj-vscode/test/java-interop-peer-guard.test.ts` - 5 spy targets retargeted, unused `JavadocProvider` value import dropped
- `bbj-vscode/test/javadoc-markdown-escape.test.ts` - 5 spy targets retargeted, unused `JavadocProvider` value import dropped
- `bbj-vscode/test/inlay-hints-javadoc.test.ts` - `beforeAll` builds its own provider and hands it to `createBBjTestServices`

## Decisions Made

- The production DI factory hands out the existing `JavadocProvider.getInstance()` instance rather than a fresh one — a deliberate ordering step (per D-09/D-10 in CONTEXT.md) so this plan's source-reader move needs zero test change, and the test-factory move in Task 2 leaves the not-yet-migrated live-interop test files (`javadoc.test.ts`, `java-interop-socket.test.ts`, four functional tests) still seeing the same object they always have. Plan 02 replaces the factory with `() => new JavadocProvider()` and deletes `getInstance()`/`_instance`.
- `createBBjTestServices` took an optional second `javadocProvider` parameter (injected as a trailing DI module) rather than a separate factory function, keeping one entry point for every caller.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## Verification Evidence

**Base (before any source edit):**
```
numFailedTests=0 numPassedTests=3637 numPendingTests=30 numTotalTests=3667 failedSuites=1 lines=1
```
(the one failing line is the pre-existing `test/functional/installed-extension-e2e.test.ts > (suite failed)`, a known stale-installed-bundle issue, not a regression)

**23 load-bearing suites on the base:** `vitest-exit=0`, `Test Files 23 passed (23)`, `Tests 425 passed | 1 skipped (426)`

**Peer state:** `up` (`:5008` reachable at base-evidence time)

**Whole suite after Task 2 (suite-01):**
```
numFailedTests=0 numPassedTests=3637 numPendingTests=30 numTotalTests=3667 failedSuites=1 lines=1
```
Identical to the base counts line; `comm -13` (new failing names not in the base list) returned empty.

**23 load-bearing suites after Task 2:** `Test Files 23 passed (23)`, `Tests 425 passed | 1 skipped (426)`

**Gates:** `lint` (0 warnings), `typecheck:test`, `build` all exit 0.

**Hygiene:** no new planning identifiers in `src`/`test`, no closing-keyword commit bodies, no `java-interop.js` import-path change, exactly the twelve planned files changed under `bbj-vscode`.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `services.java.JavadocProvider` exists and is read by all three production consumers and all four test services factories; `getInstance()`/`_instance` remain in place for plan 02 to delete once no caller is left (`javadoc.test.ts`, `java-interop-socket.test.ts`, and the four functional live-interop tests still call `getInstance()` directly, as planned).
- Plan 02 can now give the production factory a fresh `JavadocProvider` per services set, delete `getInstance()`/`_instance`, migrate the remaining five call sites, and add the #624 regression test (two independently configured providers sharing no state).

---
*Phase: 121-java-interop-service-decomposition*
*Completed: 2026-09-29*
