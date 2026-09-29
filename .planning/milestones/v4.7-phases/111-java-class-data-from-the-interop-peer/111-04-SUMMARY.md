---
phase: 111-java-class-data-from-the-interop-peer
plan: 04
subsystem: api
tags: [java-interop, langium, scope-computation, vitest]

# Dependency graph
requires:
  - phase: 111-01
    provides: "java-peer-guard.ts and the resolveClass()/storeJavaClass() bounding this plan builds beside; CountingJavaInteropService as the required test harness for the real resolveClass/storeJavaClass pipeline"
provides:
  - "JavaInteropService.isKnownJavaPackage(qualifiedName): answers from the in-memory package tree only, canonicalizing a $ spelling first"
  - "bbj-scope-local.ts's tryResolveJavaReference: an early package check covering every caller (USE branch, its $ inner-class fallback, the qualified JavaTypeRef branch, the MemberCall FQN preload)"
  - "storeJavaClass leaf-collision handling: a class name colliding with an existing package is kept outside the package tree instead of leaving $container unset"
affects: [111-05]

# Actuals (#2632)
actuals:
  tokens: 3625
  tasks: 2
  commits: 2

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Single funnel guard: one check at the top of the one function every caller of Java class resolution goes through, instead of four separate call-site checks"
    - "Collision defence in depth mirrors createStubClass's own fallback shape ($container = classpath, $containerProperty = 'classes', $containerIndex = classpath.classes.length), not a new shape"

key-files:
  created:
    - bbj-vscode/test/java-package-name-collision.test.ts
  modified:
    - bbj-vscode/src/language/java-interop.ts
    - bbj-vscode/src/language/bbj-scope-local.ts

key-decisions:
  - "Fixed at the caller (tryResolveJavaReference), not by downgrading the console.error: the log line stays for any other genuinely unexpected missing container, matching the roadmap's explicit 'stop the bad request, not only lower the log level'"
  - "isKnownJavaPackage decides purely from the in-memory package tree (no casing heuristic): walks getChildOf per dot segment and checks the last node's $type, so an all-lowercase class name (com.test.lowercasename) is never mistaken for a package"
  - "storeJavaClass's collision handling reuses createStubClass's exact fallback shape ($container=classpath, $containerProperty='classes', $containerIndex=classpath.classes.length, no push into classpath.classes) rather than inventing a new shape"

patterns-established:
  - "A name-resolution funnel function is the single place to add a pre-flight guard that must cover every caller, instead of duplicating the guard at each call site"

requirements-completed: [FIX-02]

coverage:
  - id: D1
    description: "A bare-package USE line (use java.io, use java.net), its $ fallback, a qualified type reference naming a package (declare java.io x!), and a single-segment use java all resolve with no 'has no container' console.error and no class request sent for the package name, while a real class use (java.io.File) still resolves with no linking diagnostic"
    requirement: FIX-02
    verification:
      - kind: unit
        ref: "bbj-vscode/test/java-package-name-collision.test.ts#use java.io / use java.net / use java.io.File: no \"has no container\" error, no request for the bare package, and File still resolves"
        status: pass
      - kind: unit
        ref: "bbj-vscode/test/java-package-name-collision.test.ts#declare java.io x!: a qualified type naming a package sends no request for java.io and logs no \"has no container\""
        status: pass
      - kind: unit
        ref: "bbj-vscode/test/java-package-name-collision.test.ts#use java: a single-segment top-level package sends no request"
        status: pass
    human_judgment: false
  - id: D2
    description: "isKnownJavaPackage answers strictly from the in-memory package tree: true for a registered package (including a $ spelling), false for a class of the same shape, an unregistered name, and the empty string"
    requirement: FIX-02
    verification:
      - kind: unit
        ref: "bbj-vscode/test/java-package-name-collision.test.ts#isKnownJavaPackage answers from the in-memory package tree only > true for a registered package, false for a class, an unregistered name and the empty string; a $ spelling is canonicalized"
        status: pass
    human_judgment: false
  - id: D3
    description: "storeJavaClass's leaf step keeps an existing JavaPackage intact when a class name collides with it (defence in depth for a caller that bypasses the fix): no console.error, the package and its own classes stay reachable by the same object identity, and the colliding class lands on the classpath fallback"
    requirement: FIX-02
    verification:
      - kind: unit
        ref: "bbj-vscode/test/java-package-name-collision.test.ts#resolveRaw bypassing the caller: no \"has no container\" error, the collided class lands on the classpath fallback, and java.io / java.io.File stay reachable"
        status: pass
    human_judgment: false
  - id: D4
    description: "The fix is not a casing rule: java.util.HashMap still resolves via USE and DECLARE with no linking diagnostic, and an all-lowercase class name (com.test.lowercasename) still sends its resolution request and is added to scope"
    requirement: FIX-02
    verification:
      - kind: unit
        ref: "bbj-vscode/test/java-package-name-collision.test.ts#the check is not a casing rule — only the known package tree decides > java.util.HashMap: USE and DECLARE still resolve, no linking diagnostic"
        status: pass
      - kind: unit
        ref: "bbj-vscode/test/java-package-name-collision.test.ts#the check is not a casing rule — only the known package tree decides > a lowercase-named class (com.test.lowercasename) still sends its request and is added to scope"
        status: pass
    human_judgment: false
  - id: D5
    description: "The 'has no container' console.error is unchanged as a backstop for any other genuinely unexpected missing container — not downgraded or removed as the fix"
    requirement: FIX-02
    verification:
      - kind: other
        ref: "grep -c 'has no container, packageName' bbj-vscode/src/language/java-interop.ts == 1 (before and after both tasks)"
        status: pass
    human_judgment: false

duration: 21min
completed: 2026-09-26
status: complete
---

# Phase 111 Plan 04: Java Class Data from the Interop Peer Summary

**The "Java class java.io has no container" log line (issue #676) is gone: `bbj-scope-local.ts`'s `tryResolveJavaReference` now stops a bare package name before it ever reaches class resolution, via a new `JavaInteropService.isKnownJavaPackage` that reads the in-memory package tree only, with `storeJavaClass` also kept from mis-storing a class that collides with an existing package.**

## Performance

- **Duration:** 21 min
- **Started:** 2026-09-26T17:29:00Z (approx, following 111-03)
- **Completed:** 2026-09-26T17:50:00Z
- **Tasks:** 2
- **Files modified:** 3 (2 modified, 1 created)

## Accomplishments
- `JavaInteropService.isKnownJavaPackage(qualifiedName)` answers whether a name is already a registered Java package, reading `childrenOfByName` only (via the existing `getChildOf`) and never sending a request to the peer; a `$`-spelled name is canonicalized with the existing `canonicalJavaClassName` first.
- `bbj-scope-local.ts`'s `tryResolveJavaReference` — the single function every caller (the `USE` branch, its `$` inner-class fallback, the qualified `JavaTypeRef` branch, and the `MemberCall` FQN preload) funnels through — now returns before any class request when `isKnownJavaPackage` says so, with one `logger.debug` line naming the package.
- `storeJavaClass`'s leaf step no longer silently drops a colliding class with no container: when the leaf name already names a registered `JavaPackage`, the class is kept out of the package tree entirely (same fallback shape `createStubClass` uses — `$container = classpath`, no push into `classpath.classes`), the package and its own classes stay reachable by the exact same object, and one `logger.debug` line records the collision. Any other missing-container case (an existing `JavaClass` at the leaf) is unchanged, so `resolveClass`'s `console.error` still reports it.
- `test/java-package-name-collision.test.ts` (new, 7 tests) reproduces issue #676 end to end through `CountingJavaInteropService` (never `JavaInteropTestService`, which would bypass the real `resolveClass`/`storeJavaClass` pipeline): the original bug text, the fixed caller, the `isKnownJavaPackage` predicate directly, the `storeJavaClass` collision path via a direct `resolveRaw` call that bypasses the caller, a `declare java.io x!` qualified-type case, a single-segment `use java`, and two regressions proving the check is not a casing rule.

## Task Commits

Each task was committed atomically:

1. **Task 1: A bare package name in a USE line is never sent to class resolution, end to end** - `4e6bf752` (feat)
2. **Task 2: storeJavaClass keeps a package intact when a class name collides with it, and real class uses still resolve** - `4a8ec1c0` (feat)

**Plan metadata:** commit pending (this SUMMARY + STATE/ROADMAP/REQUIREMENTS)

## Files Created/Modified
- `bbj-vscode/src/language/java-interop.ts` — new `isKnownJavaPackage` method next to `getChildOf`; `storeJavaClass`'s leaf step gains a collision branch for an existing `JavaPackage`
- `bbj-vscode/src/language/bbj-scope-local.ts` — `tryResolveJavaReference` gains the early package-name check, first statement, before any resolution call
- `bbj-vscode/test/java-package-name-collision.test.ts` — new: reproduction, `isKnownJavaPackage` unit cases, `storeJavaClass` collision (via `resolveRaw`), `declare`/`use java` qualified-type cases, and two not-a-casing-rule regressions

## Decisions Made
- Followed the plan's D-11/D-12 exactly: fix at the caller (the one funnel function), keep the `console.error` unchanged as a backstop, add the `storeJavaClass` collision guard as defence in depth for any caller that bypasses `tryResolveJavaReference` directly (proven via `CountingJavaInteropService.resolveRaw`, which calls the protected `resolveClass` without going through scope computation at all).
- `isKnownJavaPackage` walks the tree via the existing `getChildOf` rather than adding a new lookup structure, keeping one source of truth for "what does the interop service currently know."

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None specific to this plan. The whole-suite verification run (`npx vitest run --maxWorkers=2`) showed the repository's documented pre-existing local drift: `test/linking.test.ts`'s 11 "Interop related tests" fail while BBjServices is reachable on `:5008` in this dev container (exact test names match the project's own standing baseline), plus transient `beforeAll` hook timeouts in unrelated suites (`bbj-document-validator.test.ts`, `line-break-single-line-if.test.ts`, `setopts-code-scanner.test.ts`, `validation-function-calls.test.ts`, `validation.test.ts` — the documented worker-contention pattern, green on retry) and the pre-existing `test/functional/installed-extension-e2e.test.ts` "No document found" issue (#475, a stale installed bundle, tracked separately). None of these are caused by this plan's changes — `numFailedTests` was exactly 11 in both runs, and every failing test name is the same `linking.test.ts` interop set the project already tracks.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- FIX-02 (#676) is closed: the caller is fixed, the console.error is preserved as a backstop for any other case, and the fix is pinned by an end-to-end test plus a direct `storeJavaClass`-collision test.
- `isKnownJavaPackage` and the `storeJavaClass` collision guard are available for 111-05 if useful, though 111-05's own scope (SEC-05, `isJavaQualifiedName`) does not depend on them.
- No blockers for 111-05.

---
*Phase: 111-java-class-data-from-the-interop-peer*
*Completed: 2026-09-26*

## Self-Check: PASSED

- `bbj-vscode/src/language/java-interop.ts` — FOUND (isKnownJavaPackage, storeJavaClass collision handling present)
- `bbj-vscode/src/language/bbj-scope-local.ts` — FOUND (isKnownJavaPackage call site present)
- `bbj-vscode/test/java-package-name-collision.test.ts` — FOUND (7 tests, all passing)
- `.planning/phases/111-java-class-data-from-the-interop-peer/111-04-SUMMARY.md` — FOUND
- Commit `4e6bf752` — FOUND (`git log --oneline --all | grep 4e6bf752`)
- Commit `4a8ec1c0` — FOUND (`git log --oneline --all | grep 4a8ec1c0`)
- All acceptance-criteria greps (Tasks 1-2) re-run against final `HEAD` — all match expected counts (1, 1, 1)
- `npx tsc -p tsconfig.json` — clean
- `npx vitest run test/java-package-name-collision.test.ts test/java-interop-peer-guard.test.ts test/java-interop-nested-class-names.test.ts test/java-interop-service.test.ts test/imports.test.ts test/method-body-scope.test.ts` — all green (86+26 tests across the two tasks' verify sets)
- Whole-suite `npx vitest run --maxWorkers=2` — 11 failed tests, all pre-existing `test/linking.test.ts` interop drift (exact names match the documented baseline); 0 failures attributable to this plan
- No planning identifiers in the source/test diff (`git diff --cached` grep check passed for both task commits)
