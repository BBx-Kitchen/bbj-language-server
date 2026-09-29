---
phase: 121-java-interop-service-decomposition
plan: "08"
subsystem: api
tags: [java-interop, refactor, tracer]

requires:
  - phase: 121-java-interop-service-decomposition
    provides: "plan 07's completed classpath-loading module, its addTopLevelPackage/ensureClasspathDocument hooks, and exports-check.mjs, reused unchanged by this plan"
provides:
  - "bbj-vscode/src/language/java-interop-cache.ts exporting JavaResolutionCache (getResolvedClass, isClasspathAvailable, values, inFlightCount, registerResolvedClass, findClassCandidatesBySimpleName, getChildrenOf, getChildOf, isKnownJavaPackage, storeJavaClass, addTopLevelPackage, reset) and ResolutionCacheHooks, plus the moved canonicalJavaClassName (re-exported from java-interop.ts) and LruMap"
  - "the front's resolutionCache field, built as a field initializer with this.resolvedClassesCacheLimit() read eagerly and a hook bound to this.classpath"
  - "the front's three private getters (resolvedClasses, _inFlightPhase2, _pendingResolutions) so the still-unmoved resolution pipeline (resolveClassByName/doResolveClassByName/createStubClass/resolveClass) reads the module's state with byte-identical text"
  - "the front's getResolvedClass/isClasspathAvailable/findClassCandidatesBySimpleName/getChildrenOf/getChildOf/isKnownJavaPackage/storeJavaClass as plain public delegates onto resolutionCache; clearCache's step 1 calling resolutionCache.reset()"
  - "test/java-interop-cache.test.ts, the module's own 7-test unit suite with a stub classpath hook and no owning interop service"
affects: [121-09-resolution-pipeline-extraction, 121-10-javainteropservice-split-closeout]

actuals:
  tokens: 11556
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "Fifth and largest REF-12 extraction: the front builds the collaborator as a field initializer (not in the constructor body) so JavaResolutionCache's cache limit is still read eagerly, before any subclass field exists — the exact timing pitfall 1 warned about. Three of the module's fields (resolvedClasses, inFlightPhase2, pendingResolutions) are public readonly in this plan only, because the resolution pipeline stays on the front and reads them through three private front getters that return the module's live objects directly, so .set/.get/.has/.delete calls on the returned object still mutate the shared collaborator state. A later plan (09) moves the pipeline itself and can then make the three fields private."

key-files:
  created:
    - bbj-vscode/src/language/java-interop-cache.ts
    - bbj-vscode/test/java-interop-cache.test.ts
  modified:
    - bbj-vscode/src/language/java-interop.ts

key-decisions:
  - "The front's addTopLevelPackage (parked there by plan 07, since the package tree it writes into is resolution/cache state per D-06) moved into JavaResolutionCache verbatim in this plan, and the classpathLoader hook now calls resolutionCache.addTopLevelPackage directly; ensureClasspathDocument stays on the front (it reads langiumDocuments/classpathDocument, front state until a later plan if ever)."
  - "The unit test builds JavaResolutionCache directly with a plain stub classpath() hook returning one fixed Classpath object, mirroring the class-index/classpath/lock modules' stub-hook idiom rather than reusing the heavier JavaInteropTestService fixture; the #676 leaf-package-collision test uses a two-level package (a.b) rather than a bare top-level name, since a zero-length packageName argument produces an empty leading path segment in storeJavaClass's own parts array and would not reproduce the collision this test targets."
  - "A stray, newly-authored P61-D3-001 audit-finding reference in a field-level JSDoc (added during Task 1) was dropped as a Rule 1 fix during Task 2's hygiene check — the two pre-existing P61-D3-001 references (the moved LruMap doc comment and the front's reworded RESOLVED_CLASSES_CACHE_LIMIT doc comment) are unaffected and grandfathered as moved/edited-in-place text; a getChildrenOf(classpath) test call was also a genuine TS2345 type error (getChildrenOf takes JavaClass | JavaPackage | undefined, not Classpath) and was fixed to getChildrenOf() with no argument, relying on the hook fallback."

requirements-completed: []

coverage:
  - id: D1
    description: "JavaResolutionCache holds the resolved-class cache and the package tree (the LRU, the in-flight Phase 2 registry, the pending-resolution map, the java.lang.Object shortcut, the children tree) plus their lookup/mutation methods; the front's three private getters keep the byte-identical resolution pipeline reading the module's live state; the tree and cache public API stays on the front as delegates; clearCache's step 1 is one call to resolutionCache.reset() in the documented order"
    requirement: "REF-12"
    verification:
      - kind: unit
        ref: "bbj-vscode/test/java-interop-cache.test.ts (7 tests: LRU cap and recency, storeJavaClass/getChildOf/getChildrenOf/isKnownJavaPackage tree-building, the #676 leaf-collision guard, addTopLevelPackage idempotence, findClassCandidatesBySimpleName case-insensitive/skip rules, canonical ($-spelled) getResolvedClass lookup, reset() emptying both cache and tree)"
        status: pass
      - kind: unit
        ref: "the 23 load-bearing suites plus the new java-interop-cache.test.ts — 24 files, 439 passed, 1 skipped"
        status: pass
    human_judgment: false
  - id: D2
    description: "The extraction touches only its three files, no pre-existing test file changed since the REF-09 end commit, the whole suite matches the phase base in failing test names, lint/typecheck/build/hygiene are clean, and REQUIREMENTS.md is untouched"
    verification:
      - kind: unit
        ref: "Task 2's four verify commands (scope, whole-suite JSON comparison, gates, hygiene) — all four print their expected OK line"
        status: pass
    human_judgment: false

duration: 20min
completed: 2026-09-29
status: complete
---

# Phase 121 Plan 08: Java Interop Resolution Cache Extraction (REF-12, fifth of five, first half) Summary

**The resolved-class LRU, the in-flight Phase 2 registry, the pending-resolution map, the `java.lang.Object` shortcut and the Java package tree move out of `JavaInteropService` into a new `java-interop-cache.ts` module (`JavaResolutionCache`), reached by the still-unmoved resolution pipeline through three private front getters and by every other caller through plain public delegates, with a 7-test unit suite of its own and the 23 load-bearing suites plus the whole suite staying green against the phase base.**

## Performance

- **Duration:** 20 min
- **Started:** 2026-09-29T12:06:23Z (approx., previous plan's completion)
- **Completed:** 2026-09-29T12:26:21Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- `bbj-vscode/src/language/java-interop-cache.ts` created (~390 lines): `export class JavaResolutionCache` built with `constructor(cacheLimit: number, private readonly hooks: ResolutionCacheHooks)`, constructing the LRU from `cacheLimit`. Holds the moved, exported `canonicalJavaClassName` and the moved (unexported) `LruMap`. Three fields are public readonly in this plan only — `resolvedClasses` (the LRU), `inFlightPhase2`, `pendingResolutions` — plus the private `childrenOfByName` tree and `javaLangObjectCache` (renamed from the front's `JAVA_LANG_OBJECT`). Methods, moved verbatim except field names and `this.classpath` becoming `this.hooks.classpath()`: `getResolvedClass`, private `javaLangObject`, `isClasspathAvailable`, `values()` (new, backs the front's prefix-search fallback), `inFlightCount()`, `registerResolvedClass` (a plain LRU set), `findClassCandidatesBySimpleName`, `getChildrenOf`, `getChildOf` (no default parameter — the front keeps that), `isKnownJavaPackage`, `storeJavaClass` (including the #676 leaf-collision guard, verbatim), `addTopLevelPackage` (plan 07's front method, now moved in verbatim), and `reset()` — the exact five clearCache-step-1 statements and comments, in order: resolved cache, pending resolutions, in-flight Phase 2 registry, children tree, `java.lang.Object` cache.
- `java-interop.ts` (down from ~1,168 to ~874 lines): the `_resolvedClasses`/`childrenOfByName`/`_inFlightPhase2`/`_pendingResolutions`/`JAVA_LANG_OBJECT` fields, the `javaLangObject()` method, the module-level `canonicalJavaClassName` function and `LruMap` class, and the front's `addTopLevelPackage` are all deleted. `private readonly resolutionCache = new JavaResolutionCache(this.resolvedClassesCacheLimit(), { classpath: () => this.classpath });` sits at the old `_resolvedClasses` field-initializer position (pitfall 1: the cache limit is still read eagerly, before any subclass field exists). Three private getters — `resolvedClasses`, `_inFlightPhase2`, `_pendingResolutions` — return the module's live LRU/Maps, so `resolveClassByName`, `doResolveClassByName`, `createStubClass` and `resolveClass` keep reading/mutating them with unchanged text (confirmed byte-identical against the plan start). `getResolvedClass`, `isClasspathAvailable`, `findClassCandidatesBySimpleName`, `getChildrenOf`, `getChildOf` (keeping its `= this.classpath` default), `isKnownJavaPackage` and `storeJavaClass` are now one-line delegates. `findClassCandidatesByPrefix`'s fallback loop iterates `this.resolutionCache.values()`. The `classpathLoader` hooks' `registerResolvedClass` and `addTopLevelPackage` now call `this.resolutionCache.registerResolvedClass(...)`/`.addTopLevelPackage(...)` directly. `clearCache()`'s step 1 is `this.resolutionCache.reset();`. `canonicalJavaClassName` is imported for the pipeline's own use and re-exported (`export { canonicalJavaClassName } from './java-interop-cache.js';`) so every external import path is unchanged (D-08). The now-unused `isJavaPackage` and `assertType` imports were dropped.
- `bbj-vscode/test/java-interop-cache.test.ts` created (7 tests): builds `JavaResolutionCache` alone with a stub `classpath()` hook returning one fixed `{ $type: 'Classpath', packages: [], classes: [] }` object. Covers: a limit-3 LRU evicting the least-recently-used entry, with a `getResolvedClass` read refreshing recency; `storeJavaClass` building `com.acme.Widget` under `com`/`acme` package nodes, walkable via `getChildOf`/`getChildrenOf`, with `isKnownJavaPackage` true for the package and false for the class; the #676 leaf-collision guard (a class named `a.b` colliding with an existing `a.b` package stays outside the tree, `$container` on the classpath, the package intact) — built on a two-level package rather than a bare top-level name, since `storeJavaClass`'s own `parts` array construction from an empty `packageName` does not reproduce the collision; `addTopLevelPackage` idempotence (a second call for the same name adds no second node); `findClassCandidatesBySimpleName` case-insensitive matching that skips `$`-inner and packageless names; `getResolvedClass('Outer$Inner')` finding a class registered under its canonical `Outer.Inner` spelling; `reset()` emptying both the resolved-class cache and the package tree.
- Tracer feedback gate (auto mode active, `workflow.auto_advance: true`): re-ran Task 1's three `<verify>` commands end-to-end after the commit — all passed (`cache extracted`, `pipeline untouched, reset order and exports OK`, 24/24 test files / 439 passed + 1 skipped) — before proceeding to Task 2.
- Task 2's `typecheck:test` run surfaced a genuine `TS2345` in the new test file (`getChildrenOf(classpath)` — the method takes `JavaClass | JavaPackage | undefined`, not `Classpath`) and, separately, Task 2's hygiene grep found a stray newly-authored `P61-D3-001` reference in a field-level JSDoc comment I had added in Task 1 (the two pre-existing occurrences — the moved `LruMap` doc and the front's reworded `RESOLVED_CLASSES_CACHE_LIMIT` doc — are unaffected). Both fixed as Rule 1 deviations in a follow-up commit; see Deviations below.
- Task 2 then measured the move against the phase base: scope check (only the three planned files changed since this plan's own start, no pre-existing test file touched since the REF-09 end commit, no `src` file outside `java-interop*.ts` changed, no module imports `./java-interop.js`, the connection/lock/classpath modules import no sibling), whole-suite run (3,718 tests, 0 failed, the one pre-existing failing suite name (`installed-extension-e2e.test.ts`) unchanged from the base list), `lint`/`typecheck:test`/`build` all green, and the hygiene id-scan clean.

## Task Commits

Each task was committed atomically:

1. **Task 1: The resolved-class cache and the package tree run from JavaResolutionCache, with its own unit test, and the 23 load-bearing suites pass** - `3500a945` (refactor)
2. **Rule 1 fix (found during Task 2's typecheck/hygiene gates):** `23ddb4a8` (fix) - corrects the `getChildrenOf(classpath)` type error in the new test and drops the stray `P61-D3-001` reference added in Task 1
3. **Task 2: Cache and tree extraction measured against the phase base** - no code commit (measurement/SUMMARY only)

**Plan metadata:** this SUMMARY's own commit.

## Files Created/Modified

- `bbj-vscode/src/language/java-interop-cache.ts` - the extracted `JavaResolutionCache` class, its `ResolutionCacheHooks` interface, the moved `canonicalJavaClassName` (re-exported) and `LruMap`
- `bbj-vscode/src/language/java-interop.ts` - uses `this.resolutionCache` in place of the former cache/tree fields and methods; three private getters keep the untouched pipeline reading the module's state; the tree/cache public API stays on the front as delegates; `clearCache()`'s step 1 delegates to `resolutionCache.reset()`
- `bbj-vscode/test/java-interop-cache.test.ts` - the module's own 7-test unit suite

## Decisions Made

See `key-decisions` in the frontmatter: `addTopLevelPackage` moving fully into the cache module (unlike `ensureClasspathDocument`, which stays on the front), the two-level-package shape chosen for the #676 collision test, and the Rule 1 fixes for the test's type error and the stray audit-finding reference.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `getChildrenOf(classpath)` in the new unit test does not type-check**
- **Found during:** Task 2 (`npm run typecheck:test`, after Task 1's commit)
- **Issue:** The test called `cache.getChildrenOf(classpath)`, but `getChildrenOf`'s parameter type is `JavaClass | JavaPackage | undefined` — `Classpath` is not assignable, since the plan's own interface spec keeps `getChildrenOf` without a `Classpath` branch (only `getChildOf` takes `Classpath` in its union, via the front's default parameter).
- **Fix:** Changed the call to `cache.getChildrenOf()` (no argument), relying on the module's own `javaPackageLike ?? this.hooks.classpath()` fallback to reach the same root-level children.
- **Files modified:** `bbj-vscode/test/java-interop-cache.test.ts`
- **Verification:** `npm run typecheck:test` exits 0; the same test still asserts `toHaveLength(1)`.
- **Committed in:** `23ddb4a8`

**2. [Rule 1 - Bug] A newly-authored comment carried a planning identifier the base file never had**
- **Found during:** Task 2 (the hygiene id-scan, comparing head against `base-sha.txt`)
- **Issue:** Task 1's field-level JSDoc for `resolvedClasses` in the new module included `(P61-D3-001)`, a NEW occurrence not present in the phase base (the shell rule only grandfathers a moved/pre-existing occurrence, not a freshly-authored one) — this pushed the P61-D3 token count from 2 (base) to 3 (head), failing the `comm -13` hygiene check.
- **Fix:** Reworded the comment to `(see {@link LruMap})`, dropping the audit-finding id; the two original occurrences (the moved `LruMap` class doc, and the front's `RESOLVED_CLASSES_CACHE_LIMIT` doc which was reworded in place but kept its existing id) are untouched.
- **Files modified:** `bbj-vscode/src/language/java-interop-cache.ts`
- **Verification:** the hygiene `comm -13` check returns empty; `hygiene OK`.
- **Committed in:** `23ddb4a8`

---

**Total deviations:** 2 auto-fixed (2 Rule 1 bugs, both self-introduced in Task 1 and caught by Task 2's own gates before any commit reached the plan's final state)
**Impact on plan:** Both fixes are narrowly scoped to the new test file and one JSDoc comment; no production behavior changed. No scope creep.

## Issues Encountered

None beyond the two auto-fixed deviations above.

## Verification Evidence

**Plan start SHA:** `d4b7cbcad5159d77636bade3aeed3257dab94be8`
**REF-09 end SHA (from plan 02):** `c42513d31ca4cad14e58001bffd7f75a5e6ce51a`
**Phase base SHA:** `bb5404a0aa90c6365efb9b7d8bd28da718edd173`
**Precondition (plan 07 committed, exports-check.mjs green before this plan's own edits):** `exports base=15 head=15 missing=0` / `exports OK`

**Task 1 — cache extraction check:** `cache extracted` (no `_resolvedClasses`/`childrenOfByName`/`JAVA_LANG_OBJECT`/`javaLangObject(`/`class LruMap`/`function canonicalJavaClassName`/`private addTopLevelPackage` survive in non-comment lines of `java-interop.ts`; the front builds `resolutionCache` with the eager cache-limit read, the three getters, the delegates and `.bind(this)`-free wiring are all present; the new module's `JavaResolutionCache` class, its `matches an existing package` collision text and its single-hook `this.classpath` self-containment are all present; it imports no sibling interop module).

**Task 1 — pipeline/reset/exports check:** `pipeline untouched, reset order and exports OK` (`resolveClassByName`/`doResolveClassByName`/`createStubClass`/`resolveClass` byte-identical to the plan start; `reset()`'s five statements in the documented order; `clearCache()`'s nine-step sequence in the documented order with step 1 now `this.resolutionCache.reset()`; `exports base=15 head=15 missing=0`).

**Task 1 — targeted suites:** `Test Files 24 passed (24)`, `Tests 439 passed | 1 skipped (440)` (the 23 load-bearing suites plus the new `java-interop-cache.test.ts`).

**Tracer feedback gate (auto mode):** all three of Task 1's `<verify>` commands re-run and passed identically after the commit.

**Rule 1 fixes (`23ddb4a8`):** `npm run typecheck:test` clean; re-ran the targeted suites (`Test Files 24 passed (24)`, `Tests 439 passed | 1 skipped (440)`) and the structural/pipeline checks — all still pass.

**Task 2 — scope check:**
```
scope OK
```
(no pre-existing test file changed since the REF-09 end commit; the only added test files since the REF-09 end commit are `java-interop-cache.test.ts`, `java-interop-class-index.test.ts`, `java-interop-classpath.test.ts`, `java-interop-connection.test.ts` and `java-interop-lock.test.ts`; the full diff since this plan's own start touches exactly `java-interop-cache.ts`, `java-interop.ts`, `java-interop-cache.test.ts`; no `src` file outside `java-interop*.ts` changed since the REF-09 end commit; no module imports `./java-interop.js`; the connection, lock and classpath modules import no sibling)

**Task 2 — whole suite (suite-08):**
```
numFailedTests=0 numPassedTests=3688 numPendingTests=30 numTotalTests=3718 failedSuites=1 lines=1
```
Failing suite name: `test/functional/installed-extension-e2e.test.ts > (suite failed)` — identical to the base list (`comm -13` returned empty). `suite names OK`.

**Task 2 — gates:** `npm run lint`, `npm run typecheck:test`, `npm run build` all exit 0 (`gates OK`).

**Task 2 — hygiene:** no new planning identifier in any added `src`/`test` line (after the Rule 1 fix above), no closing-keyword commit body since the phase base, `hygiene OK`.

**REQUIREMENTS.md:** unchanged by this plan (`git diff --quiet` against the plan start SHA — REF-12 is declared by plans 03-10 and only plan 10 marks it, per the executor shell rules).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- The resolved-class cache and the Java package tree are fully extracted and independently testable; the front class's public tree/cache delegates stay overridable, and the three private getters are ready for plan 09 to reuse (or retire) when it moves the resolution pipeline itself.
- `/home/coder/repos/tmp/phase-121/exports-check.mjs` continues to pass (base=15, head=15, missing=0) and is ready for plan 09 onward.
- Per CONTEXT.md's planner assumptions, the three public-in-this-plan fields (`resolvedClasses`, `inFlightPhase2`, `pendingResolutions`) exist only so the still-unmoved pipeline can keep reading the moved state; plan 09 moves `resolveClassByName`/`doResolveClassByName`/`createStubClass`/`resolveClass` into (or alongside) `JavaResolutionCache` and makes those three fields private, completing the fifth REF-12 responsibility. Plan 10 then closes out REF-12 as a whole and marks the requirement.

## Self-Check: PASSED

All key files confirmed present on disk:
- `bbj-vscode/src/language/java-interop-cache.ts` — `export class JavaResolutionCache` present.
- `bbj-vscode/test/java-interop-cache.test.ts` — 7 `test(` blocks present.
- `bbj-vscode/src/language/java-interop.ts` — `private readonly resolutionCache = new JavaResolutionCache(` present; none of the moved cache/tree fields, methods or declarations remain in non-comment lines.

Commits `3500a945` and `23ddb4a8` confirmed present in `git log --oneline -5`.

---
*Phase: 121-java-interop-service-decomposition*
*Completed: 2026-09-29*
