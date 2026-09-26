---
phase: 111-java-class-data-from-the-interop-peer
reviewed: 2026-09-26T00:00:00Z
depth: standard
files_reviewed: 13
files_reviewed_list:
  - bbj-vscode/src/language/bbj-code-action-provider.ts
  - bbj-vscode/src/language/bbj-completion-provider.ts
  - bbj-vscode/src/language/bbj-document-validator.ts
  - bbj-vscode/src/language/bbj-hover.ts
  - bbj-vscode/src/language/bbj-scope-local.ts
  - bbj-vscode/src/language/java-interop.ts
  - bbj-vscode/src/language/java-peer-guard.ts
  - bbj-vscode/test/code-action.test.ts
  - bbj-vscode/test/java-interop-peer-guard.test.ts
  - bbj-vscode/test/java-package-name-collision.test.ts
  - bbj-vscode/test/java-qualified-name.test.ts
  - bbj-vscode/test/javadoc-markdown-escape.test.ts
  - bbj-vscode/test/unknown-java-member.test.ts
findings:
  critical: 2
  warning: 2
  info: 0
  total: 4
status: issues_found
---

# Phase 111: Code Review Report

**Reviewed:** 2026-09-26
**Depth:** standard
**Files Reviewed:** 13
**Status:** issues_found

## Summary

The phase adds `java-peer-guard.ts` as a shared bounding/escaping/qualified-name module and wires it
into `java-interop.ts` (SEC-03), `bbj-hover.ts`/`bbj-completion-provider.ts` (SEC-04), and
`bbj-code-action-provider.ts`/`bbj-completion-provider.ts` (SEC-05), plus a new `javaMemberAccess`
flag/message path in `bbj-document-validator.ts` (FIX-03) and a package-name guard in
`bbj-scope-local.ts`/`java-interop.ts` (FIX-02). Most of the new code is careful and well-tested:
`isJavaQualifiedName`, `escapeMarkdown`, `toFenceSafeLine`, `truncateText` and the Rule 2 exemption
all behave correctly for the cases exercised, and the `<` exclusion matches the amended D-06.

Two gaps were found that leave part of the SEC-03 bounding work incomplete relative to the locked
`111-CONTEXT.md` decisions:

1. The javadoc-file fallback path in `bbj-hover.ts` (a `MethodDoc` read directly from an on-disk
   javadoc file, not from the interop peer) never bounds the method name or per-parameter names it
   puts into the rendered signature — only the javadoc *text* is truncated. D-02 explicitly calls
   out that this fallback path must be bounded, alongside the interop-peer path.
2. A method/constructor entry whose `parameters` field is entirely *absent* (not merely the wrong
   type) survives `sanitizeJavaClassDto`'s keep/drop decision unchanged, then crashes the Phase 2
   async loop in `resolveClass()` when it calls `.entries()`/iterates `undefined`. D-03 explicitly
   lists `parameters` among the arrays that must default to `[]`, but no caller-side `??= []`
   exists for it (unlike `fields`/`methods`/`constructors`/`classes`, which do get one).

Two further, lower-severity observations are included below.

## Critical Issues

### CR-01: Hover's javadoc-file MethodDoc fallback leaves the method/parameter names completely unbounded

**File:** `bbj-vscode/src/language/bbj-hover.ts:119-148` (fallback branch at 127-133), and
`bbj-vscode/src/language/bbj-hover.ts:236-252` (`methodSignature`, `toMethodDocToMethodData`)

**Issue:** `111-CONTEXT.md` D-02 states: "The javadoc that `javadocProvider.getDocumentation()`
returns is bounded where Phase 2 copies it into `method.docu` … and where hover reads it on its
fallback path." The fallback path in `getAstNodeHoverContent` only truncates the javadoc *body*:

```ts
const javadocContent = typeof documentation?.docu === 'string'
    ? truncateText(this.tryParseJavaDoc(documentation.docu), MAX_JAVADOC_LENGTH)
    : ''
if (isMethodDoc(documentation)) {
    const javaMethodNode = node as JavaMethod
    const signature = `${javaTypeAdjust(javaMethodNode.returnType)} ${ownerClass(javaMethodNode)}${methodSignature(toMethodDocToMethodData(documentation, javaMethodNode), javaTypeAdjust)}`
    javaDoc = { signature: signature, javadoc: javadocContent }
}
```

`toMethodDocToMethodData` copies `documentation.name` and every `documentation.params[i].name`
straight from the parsed javadoc-file JSON (`java-javadoc.ts`'s `loadJavadocFile` does a bare
`JSON.parse` with no bounding of any kind), with no length check:

```ts
function toMethodDocToMethodData(methodDoc: MethodDoc, node: JavaMethod): MethodData {
    const javaParams = node.parameters ?? []
    return {
        name: methodDoc.name,
        parameters: (methodDoc.params ?? []).map((p, idx) => ({ name: p.name, type: javaParams[idx]?.type ?? 'Object', optional: false })),
        returnType: node.returnType
    }
}
```

`methodSignature` then embeds these unbounded values directly into the returned string
(`${nodeDescription.name}(...${p.realName ?? p.name}...)`), and only `escapeMarkdown` (Markdown
safety, not length) is applied at the return statement (`bbj-hover.ts:145-148`). `bbj-hover.ts`
never imports `MAX_JAVA_IDENTIFIER_LENGTH`, confirming no bound is applied anywhere on this path.
A javadoc file (malformed, corrupted, or carrying a pathological entry) can therefore still produce
an arbitrarily large hover string via this one branch, which is exactly the class of problem SEC-03
set out to close for every peer/javadoc-derived field. There is also no test exercising the
`isMethodDoc` branch of this fallback (`javadoc-markdown-escape.test.ts` only exercises the
`ClassDoc`-shaped fallback), so this gap is untested as well as unbounded.

**Fix:** Bound `documentation.name` and each `params[i].name` the same way the interop-peer path
already bounds `realName` in `java-interop.ts` (`truncateText(name, MAX_JAVA_IDENTIFIER_LENGTH)`),
either inside `toMethodDocToMethodData` or right before it is called:

```ts
import { MAX_JAVA_IDENTIFIER_LENGTH, truncateText } from "./java-peer-guard.js";
// ...
function toMethodDocToMethodData(methodDoc: MethodDoc, node: JavaMethod): MethodData {
    const javaParams = node.parameters ?? []
    return {
        name: truncateText(methodDoc.name, MAX_JAVA_IDENTIFIER_LENGTH),
        parameters: (methodDoc.params ?? []).map((p, idx) => ({
            name: truncateText(p.name, MAX_JAVA_IDENTIFIER_LENGTH),
            type: javaParams[idx]?.type ?? 'Object',
            optional: false
        })),
        returnType: node.returnType
    }
}
```

### CR-02: A method/constructor entry with no `parameters` field at all crashes Phase 2 resolution for the rest of the class

**File:** `bbj-vscode/src/language/java-peer-guard.ts:120-153` (`defaultArrayIfPresentButInvalid`,
`sanitizeParameters`), `bbj-vscode/src/language/java-interop.ts:1272`, `:1320`

**Issue:** D-03 lists `parameters` among the arrays that "default to `[]`" like `fields`, `methods`,
`constructors` and `classes`. For the class-level arrays, `resolveClass()` backs this up with its
own `??=` defaulting (`javaClass.classes ??= []`, `javaClass.constructors ??= []` at
`java-interop.ts:1206-1207`; `javaClass.fields ??= []`, `javaClass.methods ??= []` at
`:1223-1224`). No equivalent defaulting exists anywhere for a member's `parameters` array.

`defaultArrayIfPresentButInvalid` (the function every `sanitizeMemberArray`/`sanitizeParameters`
call funnels through) only replaces `obj[key]` with `[]` when the field is *present but the wrong
type*; when the field is absent (`undefined`), it is deliberately left untouched, per its own doc
comment ("An absent value is left untouched, so a caller's own `??= []` defaulting still applies to
it") — the same contract the class-level arrays rely on. But `sanitizeParameters` is the only
consumer of that contract for `parameters`, and no caller anywhere adds the matching `??= []` for
`method.parameters` / `constructor.parameters`.

The result: a method or constructor entry with a valid `name`/`returnType` (so it is *kept* by
`sanitizeMemberArray`) but no `parameters` key at all reaches Phase 2 with `parameters === undefined`.
`resolveClass()` then does:

```ts
for (const [index, parameter] of method.parameters.entries()) { ... }   // java-interop.ts:1272
...
for (const parameter of constructor.parameters) { ... }                 // java-interop.ts:1320
```

Both throw a `TypeError` on `undefined`. The throw is caught only by the single `try { … } catch (e)
{ console.error(e) }` that wraps the *entire* Phase 2 block (methods, then constructors), so
whichever methods/constructors come after the offending entry in iteration order never get their
`resolvedReturnType`, `docu`, or linked parameters — the class silently ends up partially resolved.
This is exactly the "malformed/older classpath response" scenario the existing `P61-D2-003`
precedent (cited by D-03 itself) was written for, and the test suite does not cover it: the
`RawMethod`/`rawMethod()` test helper in `counting-java-interop.ts` always populates `parameters`,
so an entirely-absent `parameters` field was never exercised.

**Fix:** Default `parameters` the same way the class-level arrays already are, right after Phase 1
sets `$type` on each method/constructor:

```ts
for (const method of javaClass.methods) {
    (method as Mutable<JavaMethod>).$type = JavaMethod.$type;
    method.deprecated = (method as unknown as { isDeprecated?: boolean }).isDeprecated ?? false;
    method.isStatic = (method as unknown as { isStatic?: boolean }).isStatic ?? false;
    method.parameters ??= [];
}
for (const constructor of javaClass.constructors) {
    (constructor as Mutable<JavaMethod>).$type = JavaMethod.$type;
    constructor.isStatic = false;
    constructor.deprecated = (constructor as unknown as { isDeprecated?: boolean }).isDeprecated ?? false;
    constructor.parameters ??= [];
}
```

(or, alternatively, make `sanitizeParameters` itself always leave `owner.parameters` as an array —
defaulting an absent one to `[]` instead of relying on a caller that doesn't exist).

## Warnings

### WR-01: No bound on the *number* of fields/methods/constructors/parameters a class entry may carry

**File:** `bbj-vscode/src/language/java-peer-guard.ts:154-231` (`sanitizeMemberArray`,
`sanitizeParameters`)

**Issue:** Every string-shaped field copied from the peer now has a length bound
(`MAX_JAVA_IDENTIFIER_LENGTH`, `MAX_JAVADOC_LENGTH`, `MAX_PEER_ERROR_LENGTH`), but there is no bound
anywhere on how many entries `fields`, `methods`, `constructors` or a method's `parameters` may
contain. `sanitizeMemberArray`/`sanitizeParameters` still `.forEach` the entire array regardless of
size, and a class with, say, 500,000 tiny-but-valid field entries is processed and stored in full.
This is a narrower version of the same "broken or hostile peer" threat model SEC-03 targets (an
oversized response), just expressed as cardinality instead of string length, and is not mentioned as
out of scope in `111-CONTEXT.md`.

**Fix:** Consider adding a fixed cap (e.g. a few thousand) on `fields.length`/`methods.length`/
`constructors.length`/`parameters.length` in `sanitizeMemberArray`/`sanitizeParameters`, dropping
(and noting) the excess the same way an individual oversized field is dropped today. If this is
judged out of scope for this phase, it is worth recording explicitly rather than leaving implicit.

### WR-02: `constructors` array sanitization has no dedicated regression test

**File:** `bbj-vscode/test/java-interop-peer-guard.test.ts`

**Issue:** `sanitizeJavaClassDto` calls `sanitizeMemberArray` identically for `fields`, `methods`
and `constructors` (`java-peer-guard.ts:277-279`), and the constructors path additionally carries
`sanitizeParams=true` like methods. The test file covers dropped/oversized/wrongly-typed `fields`
and `methods` entries (including their `parameters`) extensively, but no test ever puts a malformed
entry into `constructors` and asserts it is dropped or defaulted. Given constructors go through the
exact same code path as methods, the functional risk is low, but the D-05b regression-test intent
("feeds an oversized and wrongly typed response through `resolveClass()` and asserts what is stored
on the node") is not fully exercised for this array.

**Fix:** Add a case mirroring the existing `wideClassBody()`/`resolveClassByName` test but with a
malformed `constructors` entry (oversized name, non-string `returnType`, or non-array
`parameters`), asserting the constructor is dropped/repaired the same way a method is.

---

_Reviewed: 2026-09-26_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
