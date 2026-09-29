---
phase: 121-java-interop-service-decomposition
reviewed: 2026-09-29T00:00:00Z
depth: standard
files_reviewed: 28
files_reviewed_list:
  - bbj-vscode/src/language/bbj-hover.ts
  - bbj-vscode/src/language/bbj-module.ts
  - bbj-vscode/src/language/bbj-ws-manager.ts
  - bbj-vscode/src/language/java-interop-cache.ts
  - bbj-vscode/src/language/java-interop-class-index.ts
  - bbj-vscode/src/language/java-interop-classpath.ts
  - bbj-vscode/src/language/java-interop-connection.ts
  - bbj-vscode/src/language/java-interop-lock.ts
  - bbj-vscode/src/language/java-interop.ts
  - bbj-vscode/src/language/java-javadoc.ts
  - bbj-vscode/test/bbj-test-module.ts
  - bbj-vscode/test/counting-java-interop.ts
  - bbj-vscode/test/fake-interop-peer.ts
  - bbj-vscode/test/functional/issue440-real-interop.test.ts
  - bbj-vscode/test/functional/issue447-real-interop.test.ts
  - bbj-vscode/test/functional/java-class-lookups-real-interop.test.ts
  - bbj-vscode/test/functional/unknown-java-member-real-interop.test.ts
  - bbj-vscode/test/inlay-hints-javadoc.test.ts
  - bbj-vscode/test/java-interop-cache.test.ts
  - bbj-vscode/test/java-interop-class-index.test.ts
  - bbj-vscode/test/java-interop-classpath.test.ts
  - bbj-vscode/test/java-interop-connection.test.ts
  - bbj-vscode/test/java-interop-lock.test.ts
  - bbj-vscode/test/java-interop-peer-guard.test.ts
  - bbj-vscode/test/java-interop-service.test.ts
  - bbj-vscode/test/java-interop-socket.test.ts
  - bbj-vscode/test/javadoc-markdown-escape.test.ts
  - bbj-vscode/test/javadoc.test.ts
findings:
  critical: 0
  warning: 0
  info: 1
  total: 1
status: clean
---

# Phase 121: Code Review Report

**Reviewed:** 2026-09-29
**Depth:** standard (with targeted deep tracing on the two override-dispatch hazards flagged by 121-RESEARCH.md)
**Files Reviewed:** 28
**Status:** clean

## Summary

This phase splits `JavaInteropService` into five collaborators (`java-interop-connection.ts`,
`java-interop-cache.ts`, `java-interop-class-index.ts`, `java-interop-classpath.ts`,
`java-interop-lock.ts`) and moves `JavadocProvider` from a `getInstance()` singleton to a
DI-registered service (`services.java.JavadocProvider`). The stated bar is "no behaviour change."

Review method: rather than reading the new files in isolation, each collaborator's logic was
diffed line-by-line against the pre-phase file at `bb5404a0` (`java-interop.ts`, 1,764 lines) to
confirm every guard, log line, ordering and error-handling branch survived the move unchanged. The
two specific hazards 121-RESEARCH.md called out as the likeliest way this class of refactor
silently breaks a hermetic test double were traced end-to-end:

- **Hazard 1 (`resolveClassByName` recursion inside `resolveClass`'s Phase 2):** confirmed fixed.
  `JavaResolutionCache`'s Phase 2 loop calls `this.hooks.resolveClassByName(...)`
  (`java-interop-cache.ts:518,531,537,579,585`), and the hook is bound in `java-interop.ts:81` as
  `(className, token, depth) => this.resolveClassByName(className, token, depth)` — a closure over
  the front-class instance, so `JavaInteropTestService`'s override of the public
  `resolveClassByName` (`bbj-test-module.ts:199`) still intercepts every recursive member-type
  lookup made during the constructor's `this.resolveClass(clazz)` preload of its 15 fake classes.
- **Hazard 2 (`ensureCompleteClassIndex` called from the unoverridden `findClassCandidatesByPrefix`):**
  confirmed fixed. Per 121-RESEARCH.md's own recommendation, both straddling methods
  (`resolveClassCandidatesBySimpleName`, `findClassCandidatesByPrefix`) were kept as front-class
  orchestration methods (`java-interop.ts:312-357`) rather than pushed into either collaborator, so
  their internal `this.ensureCompleteClassIndex(token)` calls dispatch through the front class's
  own (overridable) method exactly as before the split.

Also verified, each against the pre-phase original:
- `clearCache()`'s six-step reset order (D-07) — `resolutionCache.reset()` →
  `clearCompleteClassIndex()` → `lock.reset()` → `interopConnection.resetBreaker()` (breaker
  generation bump, then connection generation bump, then breaker-state reset, in that sub-order) →
  `classpathLoader.reset()` + classpath document arrays → `interopConnection.disconnect()`
  (connection dispose, then parse-lane dispose + retired-generation reset) — is byte-for-byte the
  same sequence as the original `clearCache()` (`java-interop.ts:439-465` vs. base
  `java-interop.ts:1492-1550`).
- The `_connectionGeneration` protected accessor pair (`java-interop.ts:114-121`) is a genuine
  get/set forwarding to `JavaInteropConnection.generation`, not a read-only delegate — so
  `JavaInteropTestService.simulateReconnect()`'s direct `this._connectionGeneration++` mutation
  (`bbj-test-module.ts:167`) still works, matching Pitfall 3 in 121-RESEARCH.md.
  `resolvedClassesCacheLimit()` is still read eagerly inside a field initializer
  (`java-interop.ts:75`), at the same point in construction the original `_resolvedClasses` field
  initializer read it, so `CyclicFakeInteropService`/`HangingMembersInteropService`'s override
  (`java-interop-service.test.ts:100-102,133-135`) is honoured — confirmed empirically (field
  initializers, including ones declared after the constructor in source order, all run before the
  constructor body, so the override is visible via the prototype chain regardless of `classIndex`'s
  field being declared textually after the constructor).
- `loadImplicitImports`'s top-level-package tree-building block, flagged by 121-RESEARCH.md as
  "Classpath code writing into Resolution/cache's data structure" (assumption A3): resolved by
  moving the whole per-package tree-walk into `JavaResolutionCache.addTopLevelPackage()`
  (`java-interop-cache.ts:775-802`), called once per package name from `ClasspathLoader`
  (`java-interop-classpath.ts:165-167`) — the loop body is identical to the original inline block.
- The REF-09 Javadoc DI wiring's gaps the research flagged as *not* covered by D-10's three named
  factories — `MockableJavaInteropService` (`java-interop-service.test.ts`) and `LoopbackInterop`'s
  `newInterop()` (`java-interop-socket.test.ts`) — were both handled with the same
  `createInitializedJavadocProvider`/`services.java.JavadocProvider` pattern as the three named
  ones.
- `initialize()`'s synchronicity for the `roots=[]` case (the A1 assumption in 121-RESEARCH.md):
  confirmed by reading `java-javadoc.ts:43` — the `for` loop body never executes for an empty
  `roots` array, so `initialize([], fs)` reaches `this.initialized = true` with no `await` in its
  executed path, making `createInitializedJavadocProvider`'s unawaited `void
  provider.initialize(...)` followed immediately by `provider.isInitialized()` safe.
- No ESM import cycle: `java-interop-lock.ts` has no imports; `java-interop-connection.ts` and
  `java-interop-class-index.ts` import nothing from the other collaborators or from
  `java-interop.ts`; `java-interop-cache.ts` imports only from `java-interop-connection.ts` and
  `java-interop-lock.ts` (never the reverse); `java-interop.ts` is the only file that imports all
  five and is the sole re-export point, satisfying D-08.
- All 18 `src/` consumer files (`bbj-scope-local.ts`, `bbj-document-builder.ts`,
  `bbj-document-symbol-provider.ts`, `bbj-index-manager.ts`, etc.) still import
  `JavaSyntheticDocUri`/`JAVA_PRIMITIVE_TYPE_NAMES`/`JavaInteropService` etc. from
  `./java-interop.js` unchanged, and no stray `JavadocProvider.getInstance()`/`_instance`
  reference remains anywhere in `src/` or `test/` (confirmed via a repo-wide grep).
- `bbj-vscode`'s `tsc --noEmit` (both `tsconfig.json` and `tsconfig.test.json`) and `npm run lint`
  scoped to every file in this phase's file list complete with no errors or warnings.

No behaviour-affecting defect was found. The one item below is a minor test-quality note, not a
functional or security issue.

## Info

### IN-01: Narrow-scoped test hooks cast away missing methods instead of stubbing them

**File:** `bbj-vscode/test/java-interop-cache.test.ts:40`
**Issue:** `createCache()` builds its `JavaResolutionCache` with
`{ classpath: () => classpath } as ResolutionCacheHooks` — a single-property object cast to the
full five-property `ResolutionCacheHooks` interface. This is safe today because every test built on
`createCache()` only exercises methods that read the `classpath` hook (`storeJavaClass`,
`getChildOf`, `addTopLevelPackage`, `findClassCandidatesBySimpleName`, `reset`), never
`ensureClasspathDocument`/`getDocumentation`/`getRawClass`/`resolveClass`/`resolveClassByName`. If
a future test in this `describe` block calls a method that reaches one of the uncast-away hooks, it
will fail with a runtime `TypeError: this.hooks.X is not a function` instead of a clear "hook not
provided" test-setup error.
**Fix:** Provide no-op/throwing stubs for the remaining four hooks instead of the blanket cast, e.g.:
```typescript
function createCache(limit = 5000): JavaResolutionCache {
    const hooks: ResolutionCacheHooks = {
        classpath: () => classpath,
        ensureClasspathDocument: () => { /* not exercised by this describe block */ },
        getDocumentation: async () => undefined,
        getRawClass: async () => { throw new Error('getRawClass not stubbed in this test'); },
        resolveClass: async () => { throw new Error('resolveClass not stubbed in this test'); },
        resolveClassByName: async () => { throw new Error('resolveClassByName not stubbed in this test'); }
    };
    return new JavaResolutionCache(limit, new ResolutionLock(), hooks);
}
```

---

_Reviewed: 2026-09-29_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
