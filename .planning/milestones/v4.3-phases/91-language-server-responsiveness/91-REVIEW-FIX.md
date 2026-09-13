---
phase: 91-language-server-responsiveness
fixed_at: 2026-09-13T01:46:05Z
review_path: .planning/phases/91-language-server-responsiveness/91-REVIEW.md
iteration: 1
findings_in_scope: 2
fixed: 2
skipped: 0
status: all_fixed
---

# Phase 91: Language Server Responsiveness Fix Report

**Fixed at:** 2026-09-13T01:46:05Z
**Source review:** `.planning/phases/91-language-server-responsiveness/91-REVIEW.md`
**Iteration:** 1

**Summary:**
- Findings in scope: 2 (WR-01, WR-02; IN-01 explicitly excluded from this pass)
- Fixed: 2
- Skipped: 0

**Isolation:** All edits, tests, and commits for this pass ran inside an isolated git worktree
(`workflow.use_worktrees=true`) on a temporary branch, then fast-forwarded onto `main`. The
worktree had no `node_modules` or `src/language/generated/` of its own (both gitignored, neither
tracked by git); both were symlinked in from the main checkout for the duration of this run so
`vitest`/`tsc`/`eslint` could execute, and the symlinks are not part of any commit. **The build,
lint, and full in-scope test run recorded below all executed inside that worktree**, using the
main checkout's installed `node_modules` — reproducible from `main` after the fast-forward merge
completes, since the worktree itself is removed once this pass finishes.

## Fixed Issues

### WR-01: A cancelled Java class resolution can be cached forever as "not found"

**Files modified:** `bbj-vscode/src/language/java-interop.ts`, `bbj-vscode/test/java-interop-service.test.ts`
**Commit:** `2ca423ff`
**Applied fix:** `doResolveClassByName`'s catch block now treats a cancelled resolution
(`token?.isCancellationRequested === true`) the same as a transport failure, alongside the
existing `isInteropTransportFailure(e)` check, so `createStubClass` is called with `cache: false`.
A cancellation-driven stub is returned to the caller but never stored in `resolvedClasses`,
letting a later, uncancelled lookup for the same class name resolve it normally instead of being
permanently stuck as "not found" until a cache clear.

**Regression test:** Added `'a class whose resolution is cancelled is not cached, so a later
lookup resolves it'` to `test/java-interop-service.test.ts` (within the existing `#497` describe
block, using the existing `CyclicFakeInteropService` test double and no live socket). It resolves
a class with an already-cancelled `CancellationTokenSource` token, asserts the returned stub
carries `.error` but `getResolvedClass()` returns `undefined` (not cached), then resolves the same
class name again (uncancelled, with a `dtos` factory registered) and asserts it now resolves
successfully and is cached.
- **Before the fix:** failed — `getResolvedClass('t.Cancelled')` returned the permanently cached
  "not found" stub instead of `undefined`.
- **After the fix:** passes.

### WR-02: PREFIX/external documents no longer preload fully-qualified Java types used in a member's own signature

**Files modified:** `bbj-vscode/src/language/bbj-scope-local.ts`, `bbj-vscode/test/scope-cost-regression.test.ts`
**Commit:** `59befa50`
**Applied fix:** In `collectLocalSymbols`'s external-document branch, before pruning a non-private
class member's body, the member's own signature nodes are now also explicitly passed to
`processNode`: a `FieldDecl`'s `type`, a `MethodDecl`'s `returnType`, and each parameter's `type`.
This restores proactive resolution of a fully-qualified Java type named in a member's own
field/return/parameter type (the `isJavaTypeRef` branch in `processNode` triggers the resolution),
while leaving the pruning of method bodies untouched — the tree iterator still never descends into
a member's body.

**Regression test:** Added a new describe block, `'PREFIX member signature types stay preloaded
despite body pruning (#505)'`, to `test/scope-cost-regression.test.ts`. A PREFIX-directory fixture
class declares a public field, a public method return type, and a public method parameter type
each naming a distinct fully-qualified Java class, plus a private member and a body-local
`declare` statement each naming their own distinct Java classes. The test spies on
`JavaInteropService.resolveClassByName` and asserts the three public signature types are requested
while the body-local and private-member types are not.
- **Before the fix:** failed — none of the signature types were requested (`resolveClassByName`'s
  spy recorded zero calls for `java.util.List`).
- **After the fix:** passes, and the existing `scope-cost-regression.test.ts` body-pruning counters
  (`processNode calls on a PREFIX document do not depend on body size`, etc.) stay green — bodies
  remain pruned.

## Verification (ran inside the isolated worktree)

```
npx vitest run test/java-interop-service.test.ts test/java-interop-breaker.test.ts \
  test/java-interop-timeouts.test.ts test/java-class-reload.test.ts \
  test/scope-cost-regression.test.ts test/completion-test.test.ts
```
Result: 6 test files passed, 86 tests passed, 1 skipped (pre-existing BBj-gated skip), 0 failed.

```
npm run build
```
Result: `tsc -b tsconfig.json && node ./esbuild.mjs` — succeeded, exit 0.

```
npm run lint
```
Result: `eslint src test` — succeeded, exit 0, no findings.

## Skipped Issues

None — both in-scope findings were fixed.

---

_Fixed: 2026-09-13T01:46:05Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
