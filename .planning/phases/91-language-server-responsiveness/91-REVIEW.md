---
phase: 91-language-server-responsiveness
reviewed: 2026-09-13T00:00:00Z
depth: standard
files_reviewed: 13
files_reviewed_list:
  - bbj-vscode/src/language/bbj-completion-provider.ts
  - bbj-vscode/src/language/bbj-index-manager.ts
  - bbj-vscode/src/language/bbj-scope-local.ts
  - bbj-vscode/src/language/bbj-scope.ts
  - bbj-vscode/src/language/java-class-reload.ts
  - bbj-vscode/src/language/java-interop.ts
  - bbj-vscode/src/language/main.ts
  - bbj-vscode/test/completion-test.test.ts
  - bbj-vscode/test/fake-interop-peer.ts
  - bbj-vscode/test/java-class-reload.test.ts
  - bbj-vscode/test/java-interop-breaker.test.ts
  - bbj-vscode/test/java-interop-service.test.ts
  - bbj-vscode/test/scope-cost-regression.test.ts
findings:
  critical: 0
  warning: 2
  info: 1
  total: 3
status: issues_found
---

# Phase 91: Language Server Responsiveness Code Review Report

**Reviewed:** 2026-09-13
**Depth:** standard
**Files Reviewed:** 13
**Status:** issues_found

## Summary

Reviewed the diff against `174985f7` implementing RESP-01..RESP-04 (circuit breaker + recovery,
LRU-eviction-safe cyclic resolution, path-keyed class index, per-request completion cancellation).
The circuit-breaker state machine in `java-interop.ts` was traced in detail against D-01/D-02/D-05,
including the "only one probe while half-open" concurrency guarantee — it holds up: because none of
`connect()`'s breaker-transition code awaits before assigning `connectingPromise`, two same-tick
`connect()` callers can never interleave mid-transition, so the single-probe invariant is safe under
JS's run-to-completion semantics. The `_inFlightPhase2` registry (D-07/D-08) correctly guards every
fast path and its `finally` is identity-guarded against a stale settle racing a `clearCache()` or a
newer resolution of the same class. `bbj-index-manager.ts`'s new path-keyed index was checked against
`DefaultIndexManager`'s actual `symbolIndex`/`astReflection` field visibility and insertion-order
semantics — both hold. `bbj-scope-local.ts`'s external-document pruning was compared line-by-line
against `bbj-linker.ts`'s existing `link()` (unchanged, out of scope) that it is required to mirror.

Two correctness gaps were found, both narrower than the phase's own success criteria but real:
(1) a resolution aborted by cancellation is not recognized by `isInteropTransportFailure` and can be
permanently cached as a genuine "not found" stub, undermining D-03's stated guarantee; (2) the new
member-body pruning in `collectLocalSymbols` also — as a side effect of matching the linker's prune
point — removes the proactive preload of fully-qualified Java types used in an external/PREFIX
document's own member *signatures* (field/return/parameter types), a capability the pre-91 full scan
had and the new regression suite does not exercise.

## Warnings

### WR-01: A cancelled Java class resolution can be cached forever as "not found"

**File:** `bbj-vscode/src/language/java-interop.ts:74-85` (`isInteropTransportFailure`) and `:794-796` (`doResolveClassByName`'s catch)

**Issue:** D-03's guarantee is that stub caching narrows to *genuine* "not found" answers, and that
every transport-level failure (breaker open, connect refused/timeout, request timeout, chain
timeout, dropped connection) stays uncached. `isInteropTransportFailure` classifies exactly three
shapes: `InteropTransportError`, `ConnectionError`, and `ResponseError` with code
`ErrorCodes.PendingResponseRejected`. It does not recognize a cancellation-driven rejection (e.g. a
`ResponseError` with `ErrorCodes.RequestCancelled` if the backend answers a `$/cancelRequest`, or any
other error shape produced when a caller's `CancellationToken` fires mid-request). Since
`doResolveClassByName`'s catch does `createStubClass(className, !isInteropTransportFailure(e))`, any
such rejection is treated as a *definitive* "not found" and permanently cached — the class is
registered in `resolvedClasses` with `error: 'Resolution failed or depth limit exceeded'`. Because
`resolveClassByName`'s very first fast path is `resolvedClasses.has(className)`, every later,
uncancelled lookup for that same class name short-circuits on the bad stub and never re-resolves it;
only `clearCache()` (Refresh Java Classes / a classpath-affecting settings change) clears it. A
cancellation is a routine event (completion/hover requests are cancelled constantly as the user
types), so a class whose resolution happens to race a cancellation can end up permanently
"unresolvable" for the rest of the session.

The test suite's own `CyclicFakeInteropService`/`HangingMembersInteropService`
(`test/java-interop-service.test.ts`) demonstrate exactly this shape — their `getRawClass` override
rejects with a plain `Error('cancelled')` when the token fires — but the "the registry drains after a
cancellation" test only asserts `testInFlightCount() === 0`; it never asserts whether
`getResolvedClass('t.T')` (or the cancelled child classes `t.H1..t.H4`) ended up wrongly cached with
`.error` set, so this gap is untested rather than deliberately accepted.

**Fix:** Treat a cancellation as a transport failure regardless of its wrapped error shape, e.g. in
`doResolveClassByName`'s catch:
```ts
} catch (e) {
    logger.warn(`Failed to resolve Java class '${className}': ${e}`);
    const cancelled = token?.isCancellationRequested === true;
    return this.createStubClass(className, !(cancelled || isInteropTransportFailure(e)));
}
```
(or add the LSP `ErrorCodes.RequestCancelled` code to `isInteropTransportFailure` if the backend is
known to answer cancelled requests with that code) — and extend the existing cancellation regression
test to assert the resolved/cancelled classes are **not** left in `resolvedClasses` with an error.

### WR-02: PREFIX/external documents no longer preload fully-qualified Java types used in a member's own signature

**File:** `bbj-vscode/src/language/bbj-scope-local.ts:130-149` (pruning added by this phase) interacting with the existing `isJavaTypeRef` branch at `:217-220`

**Issue:** Before this phase, `collectLocalSymbols` walked every node of every document — including
external/PREFIX documents — via unpruned `AstUtils.streamAllContents(rootNode)`. `processNode`'s
`isJavaTypeRef(node) && node.pathParts.length > 1` branch (unchanged by this diff) fires for *any*
qualified `JavaTypeRef` node encountered this way and proactively calls
`tryResolveJavaReference(...)`, which resolves and caches the class in `JavaInteropService` ahead of
time. This is the only place that eagerly triggers resolution for a `JavaTypeRef` reached during
symbol collection.

`MethodDecl.returnType`, `FieldDecl.type` and `ParameterDecl.type` are each a nested `QualifiedClass`
AST node (`BBjTypeRef | SimpleTypeRef | JavaTypeRef` — see `bbj.langium:353-382`), not a `Reference`
directly on the member/param node. In the new pruned branch, for an external document,
`collectLocalSymbols` calls `processNode` only on the class-member node itself and (for a method) on
each `param` node directly — never on the nested `type`/`returnType` node — and then calls
`treeIter.prune()`, so the tree iterator never visits those nested `JavaTypeRef` nodes as their own
step either. The net effect: a PREFIX class's own field type, method return type, or parameter type
that names a fully-qualified Java class (e.g. `field public java.util.List items!`) is no longer
proactively resolved when that PREFIX file's local symbols are collected — whereas before this phase
it was.

This is a genuinely new side effect of mirroring `bbj-linker.ts`'s prune boundary: `link()`'s
equivalent loop only ever *links references* (via `AstUtils.streamReferences`, which is also
call-site-shallow and has the same signature-type blind spot, but that is pre-existing/out of scope)
— it has no analogue to `processNode`'s Java-preload side effect, so applying the same prune point to
`collectLocalSymbols` silently drops a capability `link()` never had to preserve in the first place.
Nothing else in the reviewed files triggers Java class resolution synchronously on demand (
`bbj-scope.ts`'s `JavaSymbol` scope case reads `this.javaInterop.getChildrenOf(...)` synchronously,
with no fallback to trigger resolution), so a consumer of such a field/param/return type from another
document (e.g. `bbj-completion-provider.ts`'s `buildInstanceMemberItems` calling
`getClass(field.type)`) can only succeed if the class happens to already be resolved via some other
path (implicit imports, another document's own qualified reference, etc.).

The new regression tests in `scope-cost-regression.test.ts` ("PREFIX symbol collection does not walk
member bodies") only exercise `BBjString`-typed fields/params, so this specific scenario is not
covered either way.

**Fix:** When processing an external document's member node/params, also explicitly walk into and
`processNode` the member's `returnType`/`type` and each param's `type` node (without recursing
further, mirroring what the pruned iterator would have reached one level deeper), e.g.:
```ts
if (externalDoc && isBBjClassMember(node)) {
    if ((node as { visibility?: string }).visibility?.toLowerCase() !== 'private') {
        await this.processNode(node, document, scopes);
        if (isFieldDecl(node) && node.type) {
            await this.processNode(node.type, document, scopes);
        }
        if (isMethodDecl(node)) {
            if (node.returnType) {
                await this.processNode(node.returnType, document, scopes);
            }
            for (const param of node.params) {
                await this.processNode(param, document, scopes);
                if (param.type) {
                    await this.processNode(param.type, document, scopes);
                }
            }
        }
    }
    treeIter.prune();
}
```
and add a regression case with a PREFIX class exposing a `java.*`-typed field/parameter/return type
that is not otherwise resolved, asserting it still resolves from a consuming document.

## Info

### IN-01: Missing trailing newline

**File:** `bbj-vscode/src/language/bbj-index-manager.ts:123`

**Issue:** The file ends with `}` and no trailing newline (confirmed via `tail -c`), which most
ESLint/EditorConfig setups flag (`eol-last`) and which differs from every other file in this diff.

**Fix:** Add a trailing newline at end of file.

---

_Reviewed: 2026-09-13_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
