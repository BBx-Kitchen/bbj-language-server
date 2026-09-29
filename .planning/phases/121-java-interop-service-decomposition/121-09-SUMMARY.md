---
phase: 121-java-interop-service-decomposition
plan: "09"
subsystem: api
tags: [java-interop, refactor, tracer]

requires:
  - phase: 121-java-interop-service-decomposition
    provides: "plan 08's JavaResolutionCache module (the resolved-class cache and the package tree, with hooks limited to classpath()), the front's three private resolvedClasses/_inFlightPhase2/_pendingResolutions getters and exports-check.mjs, reused/removed unchanged by this plan"
provides:
  - "bbj-vscode/src/language/java-interop-cache.ts extended with the class resolution pipeline: resolveClassByName (public), doResolveClassByName and createStubClass (private), resolveClass (async), the moved isLocalJavaTypeName/JAVA_PRIMITIVE_TYPE_NAMES/localJavaTypeDto/selectMethodDoc/erasedSimpleName/extractPackageName/javaTypeAdjust/tryParseJavaDoc, MAX_RESOLUTION_DEPTH/RESOLUTION_TIMEOUT_MS, and ResolutionCacheHooks extended with ensureClasspathDocument/getDocumentation/getRawClass/resolveClass/resolveClassByName"
  - "the front's resolvedClasses/inFlightPhase2/pendingResolutions are private again on JavaResolutionCache (the three plan-08-only front getters deleted); the front's lock field moved above resolutionCache and is passed into JavaResolutionCache's constructor; resolveClassByName and resolveClass are thin plain (non-async) delegates on the front"
  - "isLocalJavaTypeName and JAVA_PRIMITIVE_TYPE_NAMES re-exported from java-interop.ts per D-08, alongside the existing canonicalJavaClassName re-export"
  - "test/java-interop-cache.test.ts's 6 new routing tests, built with stub hooks and a real ResolutionLock, proving every override-sensitive internal call (resolveClassByName ×5, resolveClass ×2, getRawClass ×1) goes through the hooks and not a same-module call"
affects: [121-10-javainteropservice-split-closeout]

actuals:
  tokens: 19276
  tasks: 2
  commits: 1

tech-stack:
  added: []
  patterns:
    - "The last and most coupled REF-12 extraction: the resolution pipeline (resolveClassByName/doResolveClassByName/createStubClass/resolveClass) moves into JavaResolutionCache verbatim except every call to getRawClass, resolveClass or resolveClassByName becoming a call through ResolutionCacheHooks back to the front class's own (possibly overridden) method — never a same-module call — so JavaInteropTestService's resolveClassByName override and the counting/cyclic doubles' getRawClass overrides still take effect (hazard 1 from RESEARCH.md). resolveClass is routed through a hook even though nothing overrides it, per CONTEXT's planner assumption, purely to close a future trap at zero cost. storeJavaClass/getChildOf/createStubClass/doResolveClassByName stay module-internal calls since nothing overrides or spies on them — re-confirmed by Task 1's own override/spy inventory before any edit."

key-files:
  created: []
  modified:
    - bbj-vscode/src/language/java-interop-cache.ts
    - bbj-vscode/src/language/java-interop.ts
    - bbj-vscode/test/java-interop-cache.test.ts

key-decisions:
  - "The resolutionCache field initializer's hooks object routes resolveClass/resolveClassByName back through the front's own delegate methods (`(javaClass, token, depth) => this.resolveClass(javaClass, token, depth)`), which in turn call `this.resolutionCache.resolveClass(...)`/`resolveClassByName(...)` — one extra hop through the front on every hook invocation, matching the same override-dispatch pattern already used for getRawClass/createSocket/wrapSocket/connect in earlier plans. This is not infinite recursion: the module's own resolveClass method never calls hooks.resolveClass on itself, only hooks.resolveClassByName (Phase 2) and hooks.getDocumentation; only resolveClassByName's local-type path and doResolveClassByName call hooks.resolveClass."
  - "The two unit tests that exercise resolveClass through a hook (member-type routing, and the concurrent/second-lookup/dotted-spelling tests) record the class name passed to the resolveClass hook as a string snapshot at call time, not a reference to the mutable JavaClass object — resolveClass's own storeJavaClass step mutates javaClass.name down to its simple (package-stripped) spelling before the hook's caller can read it back, so a reference-based assertion would read post-mutation state and fail even though the routing itself was correct."
  - "ensureClasspathDocument (a plain, non-overridden private front method already reused by classpathLoader's hooks) is reused as-is for the resolution pipeline's langiumDocuments-registration step, replacing the inline `if (!this.langiumDocuments.hasDocument(...)) { this.langiumDocuments.addDocument(...) }` block verbatim with a single hooks.ensureClasspathDocument() call, per the plan's explicit instruction."

requirements-completed: []

coverage:
  - id: D1
    description: "The class resolution pipeline (resolveClassByName/doResolveClassByName/createStubClass/resolveClass) and its module-level helpers move into JavaResolutionCache; every call the pipeline makes to getRawClass, resolveClass or resolveClassByName goes through ResolutionCacheHooks back to the front's own (possibly overridden) method; the front's three plan-08-only state getters are removed and resolvedClasses/inFlightPhase2/pendingResolutions are private again; the lock field moves above resolutionCache and is passed into its constructor; peer-data bounding and all resolution bounds are byte-identical in position; clearCache keeps its documented six-step order"
    requirement: "REF-12"
    verification:
      - kind: unit
        ref: "bbj-vscode/test/java-interop-cache.test.ts (13 tests: 7 pre-existing plan-08 cases plus 6 new routing cases — member-type routing at depth 1 never touching getRawClass; a new class calling getRawClass once and handing its answer to the resolveClass hook; a second lookup and the Outer.Inner dotted spelling of the same class both returning the cached object with no further getRawClass call; resolveClassByName('int') going to the resolveClass hook with a local primitive DTO and never calling getRawClass; two concurrent lookups of one new name sharing a single getRawClass call)"
        status: pass
      - kind: unit
        ref: "the 23 load-bearing suites plus java-interop-cache.test.ts — 24 files, 445 passed, 1 skipped"
        status: pass
      - kind: integration
        ref: "the whole vitest suite (3,724 tests) — numFailedTests=0, the one pre-existing failing suite name (installed-extension-e2e.test.ts) unchanged from the phase base"
        status: pass
    human_judgment: false
  - id: D2
    description: "The extraction touches only its three planned files, no pre-existing test file changed since the REF-09 end commit, the whole suite matches the phase base in failing test names, lint/typecheck/build/hygiene are clean, and REQUIREMENTS.md is untouched"
    verification:
      - kind: unit
        ref: "Task 2's four verify commands (scope, whole-suite JSON comparison, gates, hygiene) — all four print their expected OK line"
        status: pass
    human_judgment: false

duration: 25min
completed: 2026-09-29
status: complete
---

# Phase 121 Plan 09: Java Interop Resolution Cache Extraction (REF-12, fifth of five, second half) Summary

**The class resolution pipeline — `resolveClassByName`, `doResolveClassByName`, `createStubClass`, `resolveClass` and their module-level helpers — moves out of `JavaInteropService` into `java-interop-cache.ts`, joining the resolved-class cache and package tree plan 08 already extracted; every call the pipeline makes to `getRawClass`, `resolveClass` or `resolveClassByName` routes back through six call-time hooks to the front class's own (possibly subclass-overridden) method, so `JavaInteropTestService`'s hermetic `resolveClassByName` override and the counting/cyclic test doubles' `getRawClass` overrides still take effect; the front is now a pure wiring-and-delegate class and the module's state is private again.**

## Performance

- **Duration:** 25 min
- **Started:** 2026-09-29T12:28:14Z (approx., previous plan's completion)
- **Completed:** 2026-09-29T12:53:16Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- `bbj-vscode/src/language/java-interop-cache.ts` grows from ~390 to ~700 lines: `ResolutionCacheHooks` gains `ensureClasspathDocument(): void`, `getDocumentation(node: Documented & NamedElement): Promise<NamedDoc | undefined>`, `getRawClass(className, token?): Promise<JavaClass>`, `resolveClass(javaClass, token?, depth?): Promise<JavaClass>` and `resolveClassByName(className, token?, depth?): Promise<JavaClass>`. The constructor becomes `constructor(cacheLimit: number, private readonly lock: Pick<ResolutionLock, 'acquire' | 'currentToken'>, private readonly hooks: ResolutionCacheHooks)`. `resolvedClasses`, `inFlightPhase2` and `pendingResolutions` become `private readonly` again. Two new `private static readonly` bounds (`MAX_RESOLUTION_DEPTH = 50`, `RESOLUTION_TIMEOUT_MS = 30_000`) and the moved, exported `JAVA_PRIMITIVE_TYPE_NAMES`/`isLocalJavaTypeName` plus the unexported `localJavaTypeDto`, `selectMethodDoc`, `erasedSimpleName`, `extractPackageName`, `javaTypeAdjust`, `tryParseJavaDoc` join the module, moved verbatim from `java-interop.ts` with their doc comments (two `{@link}` targets updated from `JavaInteropService.X` to `JavaResolutionCache.X`, matching the plan's explicit rename rule). The four pipeline methods (`resolveClassByName` public async, `doResolveClassByName` private async, `createStubClass` private, `resolveClass` async) move in verbatim except: the local-type path and `doResolveClassByName` call `this.hooks.resolveClass(...)` instead of `this.resolveClass(...)`; the five Phase-2 member-type calls become `this.hooks.resolveClassByName(..., _depth + 1)`; `doResolveClassByName`'s raw-DTO fetch becomes `this.hooks.getRawClass(requestName, token)`; the `langiumDocuments`-registration block becomes one `this.hooks.ensureClasspathDocument()` call; `this.javadocProvider.getDocumentation(javaClass)` becomes `this.hooks.getDocumentation(javaClass)`; every `this.classpath` read (in `createStubClass` and the `$container` fallback in `resolveClass`) becomes `this.hooks.classpath()`; and every `JavaInteropService.MAX_RESOLUTION_DEPTH`/`RESOLUTION_TIMEOUT_MS` static read becomes `JavaResolutionCache.X`. `storeJavaClass` (already module-internal from plan 08) is called directly, module-internally, since nothing overrides or spies on it. New imports: `AstUtils, isJSDoc, parseJSDoc` from `langium`; `CancellationToken` from `vscode-jsonrpc/node.js`; `DocumentationInfo, Documented, JavaField, JavaMethod, JavaMethodParameter, NamedElement` from `./generated/ast.js`; `InteropTransportError, isInteropTransportFailure` from `./java-interop-connection.js`; `import type { ResolutionLock } from './java-interop-lock.js'`; `isClassDoc, MethodDoc, NamedDoc` from `./java-javadoc.js`; `isUsableJavaClassName, MAX_JAVADOC_LENGTH, MAX_JAVA_IDENTIFIER_LENGTH, sanitizeJavaClassDto, truncateText` from `./java-peer-guard.js`.
- `java-interop.ts` shrinks from ~950 to 467 lines (base was 1,764): the `lock` field moves above `resolutionCache` (field initializers run in declaration order, and `resolutionCache`'s own initializer now reads `this.lock`); `resolutionCache`'s field initializer becomes `new JavaResolutionCache(this.resolvedClassesCacheLimit(), this.lock, { classpath, ensureClasspathDocument, getDocumentation, getRawClass, resolveClass, resolveClassByName })` — six call-time hooks, each a bare arrow function closing over `this` and calling the front's own (possibly overridden) method, never `.bind(this)`. `MAX_RESOLUTION_DEPTH`/`RESOLUTION_TIMEOUT_MS` and the three plan-08-only private getters (`resolvedClasses`, `_inFlightPhase2`, `_pendingResolutions`) are deleted, along with the module-level `JAVA_PRIMITIVE_TYPE_NAMES`/`isLocalJavaTypeName`/`localJavaTypeDto`/`selectMethodDoc`/`erasedSimpleName`/`extractPackageName`/`javaTypeAdjust`/`tryParseJavaDoc` (all moved). `resolveClassByName` (public) and `resolveClass` (protected) become plain, non-async one-line delegates onto `this.resolutionCache`. `export { canonicalJavaClassName, isLocalJavaTypeName, JAVA_PRIMITIVE_TYPE_NAMES } from './java-interop-cache.js';` keeps all three importable from `java-interop.ts` per D-08. Now-unused imports dropped: `AstUtils, isJSDoc, parseJSDoc` (langium); `DocumentationInfo, JavaField, JavaMethod, JavaMethodParameter` (ast — only used inside the moved `resolveClass`); `isClassDoc, MethodDoc` (java-javadoc — `JavadocProvider` itself stays); `InteropTransportError, isInteropTransportFailure` (still re-exported, no longer imported); `canonicalJavaClassName` (still re-exported, no longer used directly on the front); the whole `java-peer-guard.js` import line (`isUsableJavaClassName, MAX_JAVADOC_LENGTH, MAX_JAVA_IDENTIFIER_LENGTH, sanitizeJavaClassDto, truncateText` — only used inside the moved `resolveClass`).
- `bbj-vscode/test/java-interop-cache.test.ts` grows from 7 to 13 tests: `createCache` now builds `JavaResolutionCache` with a `new ResolutionLock()` and a hooks object cast through `ResolutionCacheHooks` (the 7 pre-existing tests only exercise the `classpath()` hook, unaffected). A new `class resolution routing (#558)` nested `describe` adds a `createRoutedCache` helper whose `resolveClass`/`resolveClassByName` hooks route back to the cache's own same-named methods (mirroring the front's real wiring) and a `getRawClass` hook answering a fresh member-less DTO per name. Six new tests cover: member-type routing at depth 1 for a field, a method parameter/return type and a constructor parameter/return type, with zero `getRawClass` calls; a new class calling `getRawClass` once and handing its answer to the `resolveClass` hook; a second lookup of the same class returning the cached object with no further `getRawClass` call; the `Outer.Inner` dotted spelling of an already-resolved `Outer$Inner` class returning the same cached object with no further `getRawClass` call; `resolveClassByName('int')` reaching the `resolveClass` hook with a local primitive DTO and never calling `getRawClass`; two concurrent lookups of one new class name sharing a single `getRawClass` call.
- Task 1's step 0 override/spy inventory (re-run over every tracked test file) confirmed no test double overrides or spies on `storeJavaClass`, `getChildOf`, `createStubClass` or `doResolveClassByName` — all four stayed module-internal calls, no additional hook needed.
- Tracer feedback gate (auto mode active, `workflow.auto_advance: true`): re-ran Task 1's three `<verify>` commands end-to-end after the commit — all passed (`resolution extracted`; `guard order, reset order and exports OK`; 24/24 test files, 445 passed + 1 skipped) — before proceeding to Task 2.
- Task 2 measured the move against the phase base: scope check (only the three planned files changed since this plan's own start; no pre-existing test file changed since the REF-09 end commit; the only test files added since the REF-09 end commit are the five plan 03/05/06/07/08 unit-test files plus this plan's own; no `src` file outside `java-interop*.ts` changed since the REF-09 end commit; no new module imports `./java-interop.js`; the connection, lock and classpath modules import no sibling), whole-suite run (3,724 tests, 0 failed, the one pre-existing failing suite name (`installed-extension-e2e.test.ts`) unchanged from the base list), `lint`/`typecheck:test`/`build` all green, and the hygiene id-scan clean (no new planning identifier, no closing-keyword commit body since the phase base).

## Task Commits

Each task was committed atomically:

1. **Task 1: Class resolution runs from JavaResolutionCache behind call-time hooks, with its routing unit tests, and the 23 load-bearing suites pass** - `fd914ff7` (refactor)
2. **Task 2: Resolution move measured against the phase base** - no code commit (measurement/SUMMARY only)

**Plan metadata:** this SUMMARY's own commit.

## Files Created/Modified

- `bbj-vscode/src/language/java-interop-cache.ts` - gains the class resolution pipeline (resolveClassByName/doResolveClassByName/createStubClass/resolveClass), the moved local-type/javadoc helpers, and the two resolution bounds; `ResolutionCacheHooks` extended to six hooks; constructor now takes the lock instance
- `bbj-vscode/src/language/java-interop.ts` - the front is now pure wiring: `lock` declared before `resolutionCache`; `resolutionCache`'s field initializer wires all six hooks; `resolveClassByName`/`resolveClass` are one-line delegates; the moved helpers/bounds/getters are deleted and now-unused imports dropped; `isLocalJavaTypeName`/`JAVA_PRIMITIVE_TYPE_NAMES` re-exported
- `bbj-vscode/test/java-interop-cache.test.ts` - `createCache` updated for the new constructor signature; 6 new routing tests added under a nested `describe` block

## Decisions Made

See `key-decisions` in the frontmatter: the extra front-hop in the resolveClass/resolveClassByName hook wiring (matching the existing getRawClass/createSocket/wrapSocket/connect pattern, not infinite recursion), the string-snapshot fix for the two tests that read the resolveClass hook's argument before `storeJavaClass` mutates `javaClass.name`, and reusing the existing `ensureClasspathDocument` private method as-is for the pipeline's document-registration step.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Two new unit tests initially asserted the pre-mutation class name on the object passed to the resolveClass hook**
- **Found during:** Task 1 (running the new routing tests immediately after writing them, before commit)
- **Issue:** The `resolveClass` hook in `createRoutedCache` pushed the (still-mutable) `javaClass` object reference into a recording array before calling `cache.resolveClass(javaClass, ...)`. `resolveClass`'s own `storeJavaClass` step later mutates `javaClass.name` in place, from the canonical fully-qualified spelling (`'test.Outer.Inner'`) down to the simple, package-stripped spelling (`'Outer.Inner'`) — pre-existing, unchanged behavior carried over from `java-interop.ts`. Reading `.name` off the recorded reference after resolution therefore returned the post-mutation value, failing the assertion `toBe('test.Outer$Inner')`/`toBe('test.Outer.Inner')` even though the routing itself (one `getRawClass` call, the DTO handed to the `resolveClass` hook) was correct.
- **Fix:** Changed the recorder to push `javaClass.name` (a string snapshot taken at call time, before any mutation) instead of the object reference; updated the two affected assertions to check the snapshot string and, for the "resolved" object, its expected post-`storeJavaClass` simple name (`'Outer.Inner'`) via a `getResolvedClass('test.Outer.Inner')` identity check instead of `.name`.
- **Files modified:** `bbj-vscode/test/java-interop-cache.test.ts`
- **Verification:** the targeted 24-file suite (load-bearing + `java-interop-cache.test.ts`) passed 445/446 (1 pre-existing skip) after the fix; re-confirmed in the post-commit tracer re-run.
- **Committed in:** `fd914ff7` (part of the Task 1 commit — caught and fixed before the commit was made, not a follow-up commit)

---

**Total deviations:** 1 auto-fixed (1 Rule 1 bug, self-introduced while writing the new tests and caught by the test's own first run before any commit)
**Impact on plan:** Test-only fix, no production behavior changed. No scope creep.

## Issues Encountered

None beyond the one auto-fixed deviation above. The whole-suite `npx vitest run --maxWorkers=2 --reporter=json` command exceeded the interactive 120s foreground budget and was moved to the harness's own background-task tracking; a subsequent manual wait-loop shell command (`until ... pgrep -f "vitest/dist/workers/forks.js" ...`) hit the documented self-matching-pgrep pitfall (its own command line contains the search string) and looped indefinitely after the real vitest run had already finished — it was identified from `ps` output and killed directly by PID rather than via a second `pgrep -f vitest` match. No test or verify command was affected; the whole-suite JSON report and its 0-failure result were already written to disk before the stray wait-loop was killed.

## Verification Evidence

**Plan start SHA:** `537b660f30944d77c9942827f47b9ac4001c6acf`
**REF-09 end SHA (from plan 02):** `c42513d31ca4cad14e58001bffd7f75a5e6ce51a`
**Phase base SHA:** `bb5404a0aa90c6365efb9b7d8bd28da718edd173`
**Precondition (plan 08 committed, exports-check.mjs green before this plan's own edits):** `exports base=15 head=15 missing=0` / `exports OK`
**Override/spy inventory (Task 1 step 0):** `/home/coder/repos/tmp/phase-121/override-inventory-09.txt` — confirms no test double overrides or spies on `storeJavaClass`, `getChildOf`, `createStubClass` or `doResolveClassByName`; the only resolution-adjacent entries are `getRawClass` (2 overrides), `resolveClassByName` (1 override), `resolveClassCandidatesBySimpleName` (1 override), `resolvedClassesCacheLimit` (2 overrides), and one `spyOn(privates, 'getRawClass')` / one `spyOn(javaInterop, 'resolveClassByName')` — all already routed through hooks per plan.

**Task 1 — resolution extraction check:** `resolution extracted` (no `_inFlightPhase2`/`_pendingResolutions`/`get resolvedClasses`/`MAX_RESOLUTION_DEPTH`/`RESOLUTION_TIMEOUT_MS`/the seven moved helper `function` declarations/`doResolveClassByName`/`createStubClass`/`sanitizeJavaClassDto`/`getDocumentation(javaClass)` survive in non-comment lines of `java-interop.ts`; the front builds `resolutionCache` with `this.lock` as its second constructor argument, all six hooks present verbatim, no `.bind(this)`; the module has exactly 5 `this.hooks.resolveClassByName(` calls, exactly 1 `this.hooks.getRawClass(requestName, token)` call, exactly 2 `this.hooks.resolveClass(` calls, zero same-module `this.resolveClassByName(`/`this.resolveClass(`/`this.getRawClass(`/`this.javadocProvider` calls, both bounds present, `truncateText(` appears twice, all three state fields are `private readonly`, and the module imports only from `./java-interop-connection.js` and `./java-interop-lock.js` among `./java-interop*` paths).

**Task 1 — guard order, reset order and exports check:** `guard order, reset order and exports OK` (the peer-data guard sequence inside `resolveClass` — `isUsableJavaClassName(javaClass.name)` → `canonicalJavaClassName(javaClass.name)` → `sanitizeJavaClassDto(javaClass)` → `this.storeJavaClass(javaClass` → `this.hooks.getDocumentation(javaClass)` — matches exactly, in order; `clearCache()`'s nine-statement sequence matches exactly, in order, with step 1 still `this.resolutionCache.reset()`; `exports base=15 head=15 missing=0`).

**Task 1 — targeted suites:** `Test Files 24 passed (24)`, `Tests 445 passed | 1 skipped (446)` (the 23 load-bearing suites plus the now-13-test `java-interop-cache.test.ts`).

**Tracer feedback gate (auto mode):** all three of Task 1's `<verify>` commands re-run and passed identically after the commit (`resolution extracted`; `guard order, reset order and exports OK`; 24/24 files, 445 passed + 1 skipped).

**Gates (re-run before commit and again in Task 2):** `npm run lint`, `npm run typecheck:test`, `npm run build` all exit 0.

**Task 2 — scope check:**
```
scope OK
```
(no pre-existing test file changed since the REF-09 end commit; the only test files added since the REF-09 end commit are `java-interop-cache.test.ts`, `java-interop-class-index.test.ts`, `java-interop-classpath.test.ts`, `java-interop-connection.test.ts` and `java-interop-lock.test.ts`; the full diff since this plan's own start touches exactly `java-interop-cache.ts`, `java-interop.ts`, `java-interop-cache.test.ts`; no `src` file outside `java-interop*.ts` changed since the REF-09 end commit; no module imports `./java-interop.js`; the connection, lock and classpath modules import no sibling)

**Task 2 — whole suite (suite-09):**
```
numFailedTests=0 numPassedTests=3694 numPendingTests=30 numTotalTests=3724 failedSuites=1 lines=1
```
Failing suite name: `test/functional/installed-extension-e2e.test.ts > (suite failed)` — identical to the base list (`comm -13` returned empty). `suite names OK`.

**Task 2 — gates:** `npm run lint`, `npm run typecheck:test`, `npm run build` all exit 0 (`gates OK`).

**Task 2 — hygiene:** no new planning identifier in any added `src`/`test` line, no closing-keyword commit body since the phase base, `hygiene OK`.

**REQUIREMENTS.md:** unchanged by this plan (`git diff --quiet` against the plan start SHA — REF-12 is declared by plans 03-10 and only plan 10 marks it, per the executor shell rules).

**`java-interop.ts` line count:** 467 lines now, against the phase base's 1,764 (and plan 08's ~950) — the resolution pipeline was the largest remaining chunk on the front class.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All five REF-12 responsibilities (connection lifecycle, class resolution/cache/tree, request lock, classpath loading, complete class index) now live in their own modules, each independently importable and unit-tested; `java-interop.ts` is a 467-line front class that only wires collaborators, keeps the protected test hooks and public API as delegates, and orchestrates `clearCache()`.
- `/home/coder/repos/tmp/phase-121/exports-check.mjs` continues to pass (base=15, head=15, missing=0) and is ready for plan 10.
- Per the roadmap and REQUIREMENTS.md, plan 10 is the REF-12 close-out plan: a final hand check across the whole `JavaInteropService`/`JavaResolutionCache`/`JavaInteropConnection`/`ResolutionLock`/`ClasspathLoader`/`CompleteClassIndex` module set, and the one place in the phase that marks REF-12 complete in REQUIREMENTS.md.

## Self-Check: PASSED

All key files confirmed present on disk:
- `bbj-vscode/src/language/java-interop-cache.ts` — contains `async resolveClassByName(className: string, token?: CancellationToken, _depth: number = 0): Promise<JavaClass> {`.
- `bbj-vscode/src/language/java-interop.ts` — contains `private readonly resolutionCache = new JavaResolutionCache(this.resolvedClassesCacheLimit(), this.lock, {`; none of the moved pipeline members, helpers or bounds remain in non-comment lines.
- `bbj-vscode/test/java-interop-cache.test.ts` — 13 `test(` blocks present, including the 6 new routing cases.

Commit `fd914ff7` confirmed present in `git log --oneline -5`.

---
*Phase: 121-java-interop-service-decomposition*
*Completed: 2026-09-29*
