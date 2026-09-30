---
phase: 121-java-interop-service-decomposition
plan: "07"
subsystem: api
tags: [java-interop, refactor, tracer]

requires:
  - phase: 121-java-interop-service-decomposition
    provides: "plan 06's completed class-index module and exports-check.mjs, reused unchanged by this plan"
provides:
  - "bbj-vscode/src/language/java-interop-classpath.ts exporting ClasspathLoader (loadClasspath, loadImplicitImports, reset) and ClasspathLoaderHooks, with implicitJavaImports and the three moved requests (loadClasspath, getClassInfos, getTopLevelPackages)"
  - "the front's classpathLoader field, built with call-time hooks bound to its own connect/resolveClass/resolvedClasses/classpath and two new private front methods (ensureClasspathDocument, addTopLevelPackage)"
  - "the front's loadClasspath/loadImplicitImports as plain public delegates onto classpathLoader; clearCache's step 5 calling classpathLoader.reset()"
  - "test/java-interop-classpath.test.ts, the classpath module's own 10-test unit suite with stub hooks and no owning interop service"
affects: [121-08-through-121-10-javainteropservice-split]

actuals:
  tokens: 8500
  tasks: 2
  commits: 1

tech-stack:
  added: []
  patterns:
    - "Fourth REF-12 extraction: a sibling module built and held by the front class as a private readonly field, with the front's own protected connect/resolveClass hooks and a resolvedClasses-set hook wired in as call-time arrow functions so a subclass override still fires. The top-level package tree that loadImplicitImports used to build inline stays a private front method (addTopLevelPackage) reached through a hook, since the tree belongs to resolution and cache (D-06) and plan 08 carries it into that module; the loader only hands each package name across the hook boundary."

key-files:
  created:
    - bbj-vscode/src/language/java-interop-classpath.ts
    - bbj-vscode/test/java-interop-classpath.test.ts
  modified:
    - bbj-vscode/src/language/java-interop.ts

key-decisions:
  - "addTopLevelPackage and ensureClasspathDocument both stay private methods on the front class (not on the loader) per the plan's D-01/D-06 assumptions: the package tree needs childrenOfByName (front state until plan 08 moves it), and ensureClasspathDocument needs langiumDocuments/classpathDocument (front state per D-01, read directly by JavaInteropTestService)."
  - "The new unit test builds a fake MessageConnection dispatching on RequestType.method (loadClasspath/getClassInfos/getTopLevelPackages) from a per-test script, mirroring the existing java-interop-connection.test.ts and java-interop-class-index.test.ts stub-hook idiom, rather than reusing the heavier JavaInteropTestService fixture."

requirements-completed: []

coverage:
  - id: D1
    description: "ClasspathLoader holds loadClasspath, loadImplicitImports, the implicit-import copies and the three classpath requests; the top-level package tree code is a private front method (addTopLevelPackage) reached through a hook; loadClasspath/loadImplicitImports stay public overridable delegates on the front; clearCache's step 5 calls classpathLoader.reset()"
    requirement: "REF-12"
    verification:
      - kind: unit
        ref: "bbj-vscode/test/java-interop-classpath.test.ts (10 tests: loadClasspath entry mapping and connect-failure fallback; loadImplicitImports simple-name copy push/registration, java.sql exclusion, non-array getClassInfos answer, non-object bulk-path entries, addTopLevelPackage hand-off, getTopLevelPackages rejection tolerance, second-run copy reuse, post-reset fresh copy)"
        status: pass
      - kind: unit
        ref: "the twelve targeted suites (eight java-interop-*.test.ts plus the new java-interop-classpath, ws-manager, java-class-refresh, java-class-reload) — 12 files, 157 tests"
        status: pass
    human_judgment: false
  - id: D2
    description: "The extraction touches only its three files, no pre-existing test file changed since the REF-09 end commit, the whole suite matches the phase base in failing test names, lint/typecheck/build/hygiene are clean, and REQUIREMENTS.md is untouched"
    verification:
      - kind: unit
        ref: "Task 2's four verify commands (scope, whole-suite JSON comparison, gates, hygiene) — all four print their expected OK line"
        status: pass
    human_judgment: false

duration: 9min
completed: 2026-09-29
status: complete
---

# Phase 121 Plan 07: Java Interop Classpath Extraction (REF-12, fourth of five) Summary

**Classpath loading (`loadClasspath`/`sendRequestSafe`) and implicit-import loading (`loadImplicitImports`, the implicit-import copies, and the three classpath requests) move out of `JavaInteropService` into a new `java-interop-classpath.ts` module (`ClasspathLoader`), reached only through call-time hooks; the top-level package tree that `loadImplicitImports` built inline stays behind a hook to a private front method for plan 08 to carry into resolution and cache, with a 10-test unit suite of its own and the interop, ws-manager and refresh/reload suites staying green against the phase base.**

## Performance

- **Duration:** 9 min
- **Started:** 2026-09-29T11:56:19Z (approx.)
- **Completed:** 2026-09-29T12:05:00Z (approx.)
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- `bbj-vscode/src/language/java-interop-classpath.ts` created (183 lines): `export class ClasspathLoader` built with `constructor(private readonly hooks: ClasspathLoaderHooks)`. Holds the moved `implicitJavaImports` constant, the three request types (`loadClasspathRequest`, `getClassInfosRequest`, `getTopLevelPackages`) and their two param interfaces, the `implicitImportCopies` field, the private `sendRequestSafe` helper, and the public `loadClasspath(classPath, token)`, `loadImplicitImports(token)` and `reset()` methods. Bodies moved verbatim except: `this.connect()` → `this.hooks.connect()`, `this.resolveClass(javaClass, token)` → `this.hooks.resolveClass(javaClass, token)`, each `this.resolvedClasses.set(...)` → `this.hooks.registerResolvedClass(...)`, each `this.classpath` read → `this.hooks.classpath()`, the langiumDocuments block → `this.hooks.ensureClasspathDocument()`, and the top-level-package tree-building block → a `this.hooks.addTopLevelPackage(pack.packageName)` call per package, still inside the same inner try that tolerates a server without `getTopLevelPackages`. Imports only `vscode-jsonrpc/node.js`, `langium` (`Mutable`), `./generated/ast.js` (`Classpath`, `JavaClass`), `./java-peer-guard.js` (`isUsableJavaClassName`) and `./logger.js` — no sibling interop module and not `./java-interop.js`.
- `java-interop.ts` (down to 1,140 lines from 1,259): `implicitJavaImports`, `implicitImportCopies`, `sendRequestSafe`, the three request declarations and their two param interfaces all deleted; `RequestType` dropped from the `vscode-jsonrpc/node.js` import (its only remaining use was in the deleted code). `private readonly classpathLoader = new ClasspathLoader({ connect: () => this.connect(), resolveClass: (javaClass, token) => this.resolveClass(javaClass, token), registerResolvedClass: (name, javaClass) => this.resolvedClasses.set(name, javaClass), classpath: () => this.classpath, ensureClasspathDocument: () => this.ensureClasspathDocument(), addTopLevelPackage: (packageName) => this.addTopLevelPackage(packageName) });` added where the old `implicitImportCopies` field sat. `loadClasspath`/`loadImplicitImports` are now plain (non-`async`) public delegates returning `this.classpathLoader.loadClasspath(...)`/`this.classpathLoader.loadImplicitImports(...)`, keeping their original JSDoc. Two new private methods hold the code the hooks reach: `ensureClasspathDocument(): void` (the "add classpath document when missing" block, verbatim) and `addTopLevelPackage(packageName: string): void` (the package-tree walk for one package name, verbatim, using `this.classpath` and `this.childrenOfByName` directly since both stay front state until later plans). `clearCache()`'s step 5 is now `this.classpathLoader.reset();` in the same slot, followed by the unchanged two classpath-array resets. `resolveClass`'s own separate "add the classpath document when missing" copy (used during class resolution, not classpath loading) was left untouched, as instructed.
- `bbj-vscode/test/java-interop-classpath.test.ts` created (10 tests): builds `ClasspathLoader` alone with stub hooks — a `connect` hook returning a fake `MessageConnection` whose `sendRequest` dispatches on `type.method` (`loadClasspath`/`getClassInfos`/`getTopLevelPackages`) against a per-test script, a `resolveClass` hook recording every class it is handed, a `registerResolvedClass` hook recording name→class, a `classpath` hook returning one stable `{ $type: 'Classpath', packages: [], classes: [] }` object, and `ensureClasspathDocument`/`addTopLevelPackage` hooks counting/recording calls. Covers: `loadClasspath` drops empty entries, keeps bracketed entries as-is, prefixes the rest with `file:`, and sends exactly one request; `loadClasspath` returns `false` when `connect` rejects; `loadImplicitImports` resolves a package's class, pushes one simple-name copy into the classpath and registers it under its simple name; `loadImplicitImports` does not push a simple-name copy for `java.sql` classes (still resolves them); a non-array `getClassInfos` answer is treated as empty; a non-object bulk-path entry (`null`/number/string) is skipped without ever calling `resolveClass`; `loadImplicitImports` hands each `getTopLevelPackages` package name to `addTopLevelPackage`; `loadImplicitImports` still returns `true` when `getTopLevelPackages` rejects; a second `loadImplicitImports` run reuses the existing simple-name copy (no duplicate push, `registerResolvedClass` called with the same object); after `reset()` a run pushes a fresh copy distinct from the pre-reset one.
- Tracer feedback gate (auto mode active, `workflow.auto_advance: true`): re-ran Task 1's three `<verify>` commands end-to-end after the commit — all passed (`classpath extracted`, `reset order and exports OK`, 12/12 test files / 157/157 tests) — before proceeding to Task 2.
- Task 2 measured the move against the phase base: scope check (only the three planned files changed since this plan's own start, no pre-existing test file touched since the REF-09 end commit, no `src` file outside `java-interop*.ts` changed, no module imports `./java-interop.js`, the connection, lock and classpath modules import no sibling), whole-suite run (3,711 tests, 0 failed, the one pre-existing failing suite name (`installed-extension-e2e.test.ts`) unchanged from the base list), `lint`/`typecheck:test`/`build` all green, and the hygiene id-scan clean.

## Task Commits

Each task was committed atomically:

1. **Task 1: Classpath and implicit-import loading run from ClasspathLoader, with its own unit test, and the interop, ws-manager and refresh suites pass** - `a242d760` (refactor)
2. **Task 2: Classpath extraction measured against the phase base** - no code commit (measurement/SUMMARY only)

**Plan metadata:** this SUMMARY's own commit.

## Files Created/Modified

- `bbj-vscode/src/language/java-interop-classpath.ts` - the extracted `ClasspathLoader` class, its `ClasspathLoaderHooks` interface, `implicitJavaImports`, and the three moved classpath requests
- `bbj-vscode/src/language/java-interop.ts` - uses `this.classpathLoader` in place of the former loading fields/methods; `ensureClasspathDocument`/`addTopLevelPackage` stay as private front methods reached through hooks; `clearCache()`'s step 5 delegates to `classpathLoader.reset()`
- `bbj-vscode/test/java-interop-classpath.test.ts` - the classpath module's own 10-test unit suite

## Decisions Made

See `key-decisions` in the frontmatter: `addTopLevelPackage`/`ensureClasspathDocument` staying private front methods (not moving into the loader) per D-01/D-06, and the stub-hook test idiom mirroring the connection and class-index module tests.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## Verification Evidence

**Plan start SHA:** `3705d4d6c609b4baec012a8e4ca8a80c18d93b5b`
**REF-09 end SHA (from plan 02):** `c42513d31ca4cad14e58001bffd7f75a5e6ce51a`
**Precondition (plan 06 committed, exports-check.mjs green before this plan's own edits):** `exports base=15 head=15 missing=0` / `exports OK`

**Task 1 — classpath extraction check:** `classpath extracted` (no `implicitJavaImports`/`implicitImportCopies`/`sendRequestSafe`/`loadClasspathRequest`/`getClassInfosRequest`/`getTopLevelPackages`/`PackageInfoParams`/`ClassPathInfoParams` survive in non-comment lines of `java-interop.ts`; the front builds `classpathLoader` with call-time hooks; the delegates, the two new private methods and `.bind(this)`-free wiring are all present; the new module's `ClasspathLoader` class, its hook calls in the pinned order and its single `./java-interop-classpath.ts` self-containment are all present; it imports no sibling interop module).

**Task 1 — reset order and exports check:** `reset order and exports OK` (`clearCache()`'s six-line call sequence unchanged except step 5 now reading `this.classpathLoader.reset()`; `exports base=15 head=15 missing=0`).

**Task 1 — targeted suites:** `Test Files 12 passed (12)`, `Tests 157 passed (157)` (the eight `java-interop-*.test.ts` suites plus the new `java-interop-classpath`, `ws-manager`, `java-class-refresh` and `java-class-reload`).

**Tracer feedback gate (auto mode):** all three of Task 1's `<verify>` commands re-run and passed identically after the commit.

**Task 2 — scope check:**
```
scope OK
```
(no pre-existing test file changed since the REF-09 end commit; the only added test files since the REF-09 end commit are `java-interop-class-index.test.ts`, `java-interop-classpath.test.ts`, `java-interop-connection.test.ts` and `java-interop-lock.test.ts`; the full diff since this plan's own start touches exactly `java-interop-classpath.ts`, `java-interop.ts`, `java-interop-classpath.test.ts`; no `src` file outside `java-interop*.ts` changed since the REF-09 end commit; no module imports `./java-interop.js`; the connection, lock and classpath modules import no sibling)

**Task 2 — whole suite (suite-07):**
```
numFailedTests=0 numPassedTests=3681 numPendingTests=30 numTotalTests=3711 failedSuites=1 lines=1
```
Failing suite name: `test/functional/installed-extension-e2e.test.ts > (suite failed)` — identical to the base list (`comm -13` returned empty). `suite names OK`.

**Task 2 — gates:** `npm run lint`, `npm run typecheck:test`, `npm run build` all exit 0 (`gates OK`).

**Task 2 — hygiene:** no new planning identifier in any added `src`/`test` line, no closing-keyword commit body since the phase base, `hygiene OK`.

**REQUIREMENTS.md:** unchanged by this plan (`git diff --quiet` against the plan start SHA — REF-12 is declared by plans 03-10 and only plan 10 marks it, per the executor shell rules).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Classpath and implicit-import loading are fully extracted and independently testable; the front class's public delegates stay overridable, and the two private front methods (`ensureClasspathDocument`, `addTopLevelPackage`) are ready for plan 08 and plan 09 to reach through the same hook pattern.
- `/home/coder/repos/tmp/phase-121/exports-check.mjs` continues to pass (base=15, head=15, missing=0) and is ready for plan 08 onward.
- Per CONTEXT.md's planner assumptions, `addTopLevelPackage`'s body is package-tree code that plan 08 moves into the resolution-and-cache module along with `childrenOfByName`; the remaining REF-12 plans extract resolution/cache/tree, then orchestrate the front class as thin delegates over all five collaborators.

## Self-Check: PASSED

All key files confirmed present on disk:
- `bbj-vscode/src/language/java-interop-classpath.ts` — `export class ClasspathLoader` present.
- `bbj-vscode/test/java-interop-classpath.test.ts` — 10 `test(` blocks present.
- `bbj-vscode/src/language/java-interop.ts` — `private readonly classpathLoader = new ClasspathLoader(` present; none of the moved loading fields, methods or request declarations remain in non-comment lines.

Commit `a242d760` confirmed present in `git log --oneline -5`.

---
*Phase: 121-java-interop-service-decomposition*
*Completed: 2026-09-29*
