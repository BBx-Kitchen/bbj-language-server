---
phase: 109-completion-java-class-resolution
reviewed: 2026-09-26T04:50:00Z
depth: standard
files_reviewed: 13
files_reviewed_list:
  - bbj-vscode/src/language/bbj-inlay-hint-provider.ts
  - bbj-vscode/src/language/bbj-overload-selector.ts
  - bbj-vscode/src/language/bbj-scope.ts
  - bbj-vscode/src/language/bbj-type-inferer.ts
  - bbj-vscode/src/language/java-interop.ts
  - bbj-vscode/test/completion-class-reference.test.ts
  - bbj-vscode/test/completion-method-body.test.ts
  - bbj-vscode/test/completion-test.test.ts
  - bbj-vscode/test/counting-java-interop.ts
  - bbj-vscode/test/functional/java-class-lookups-real-interop.test.ts
  - bbj-vscode/test/java-interop-local-types.test.ts
  - bbj-vscode/test/java-interop-nested-class-names.test.ts
  - bbj-vscode/test/overload-return-type.test.ts
findings:
  critical: 0
  warning: 0
  info: 4
  total: 4
status: issues_found
---

# Phase 109: Code Review Report

**Reviewed:** 2026-09-26T04:50:00Z
**Depth:** standard
**Files Reviewed:** 13
**Status:** issues_found

## Summary

Re-review after gap-closure plan 109-07 (commits `cc25ae07`, `d95fc856`), which narrows the
`.class` pseudo-member exclusion in `bbj-scope.ts`'s class-reference detection. Only these two
commits touched the reviewed file set since the prior `109-REVIEW.md` was written
(`git log 9898637b..HEAD` for the 13 reviewed files shows no other intervening commits); every
other file (`bbj-overload-selector.ts`, `bbj-type-inferer.ts`, `java-interop.ts`,
`bbj-inlay-hint-provider.ts`, and the non-class-reference test files) is byte-identical to what
the prior review already assessed.

**WR-01 from the prior review is resolved.** The previous finding was that
`java.lang.Class.` (fully qualified, no `USE`) was misclassified as the `.class` pseudo-member
because the exclusion relied on member-text alone (`=== 'class'`, case-insensitive), which cannot
distinguish a literal reference to the class named `Class` from the synthetic `.class` property.
Commit `cc25ae07` fixes this by deciding based on the *preceding* segment's inferred type instead
of text alone: `class` after a resolved `JavaPackage` is a real class reference (static members
only); `class` after anything else (a class or a value) stays the pseudo-member (all instance
members). I traced this through the four relevant receiver shapes by hand against
`bbj-type-inferer.ts`'s `getType`:
- `String.class.` (SymbolRef receiver, USE'd) — unaffected by this change, still pseudo-member.
- `java.lang.String.class.` — receiver's receiver (`java.lang.String`) types as the `String`
  `JavaClass`, not a package → still pseudo-member. Correct (unchanged behavior).
- `java.lang.Class.` (no `.class`, direct reference) — receiver's receiver (`java.lang`) types as
  a `JavaPackage` → `isPseudoClassMember` is now `false` → `isJavaClass(receiver.member.ref)` is
  `true` → correctly detected as a class reference (static-only completion, matching
  `Class.` after `use java.lang.Class`). This is exactly the case WR-01 flagged as broken.
- `java.lang.Class.class.` — receiver's receiver (`java.lang.Class`) types as the `Class`
  `JavaClass` itself, not a package → still pseudo-member (instance members of `java.lang.Class`),
  matching the new test's expectation.

The new call to `this.typeInferer.getType(receiver.receiver)` is safe against the same
cyclic-reference concern the surrounding code guards elsewhere: `BBjTypeInferer.getType` already
catches `.ref` exceptions and reentrancy internally (via its `resolving` set and internal
try/catches in `getTypeInternal`), so it never throws — no new uncaught-exception path was
introduced by leaving this call outside a `try`/`catch`, unlike the two sibling branches in the
same `if`/`else if` chain that do wrap `.ref` access.

`npx vitest run test/completion-class-reference.test.ts` passes (15/15), including the three new
109-07 tests pinning the `.class`-after-`Class`, static-call, and instance-call-not-an-Error
behaviors.

One residual (very narrow) limitation remains from the same inherent ambiguity, plus the three
Info items from the prior review that these commits did not touch and remain applicable.

## Info

### IN-01: A nested Java class literally named `Class` still collides with the `.class` pseudo-member

**File:** `bbj-vscode/src/language/bbj-scope.ts:218-227`
**Issue:** The 109-07 fix disambiguates by checking whether the *segment before* `class` is a
`JavaPackage`. This correctly separates `<package>.Class.` (a real class reference) from
`<class-or-value>.class` (the pseudo-member). It does not cover a *nested* class literally named
`Class` — e.g. `com.example.Outer.Class` addressed as `Outer.Class.` (no `USE`), or
`com.example.Outer.Class.` fully qualified. Here `receiver.receiver` (`Outer`) types as a
`JavaClass`, not a `JavaPackage`, so `isPseudoClassMember` stays `true` and the reference is
(mis)treated as the `.class` pseudo-member on `Outer`, offering `java.lang.Class`'s instance
members instead of `Outer.Class`'s static members. This is the same class of ambiguity WR-01
described, one level of nesting deeper, and it is unaddressed by the current segment-type check
(a package vs. non-package test can't help once the enclosing type is itself a class). No test
exercises this shape.
**Fix:** This is a narrower restatement of the same inherent BBj case-insensitivity ambiguity
the code's own comment (`bbj-scope.ts:203-209`) already documents as a known, deliberate
limitation. Consider extending that comment to explicitly note nested classes named `Class` share
the same collision, or add a regression test capturing today's actual (pseudo-member) behavior so
a future change to this heuristic is deliberate rather than accidental. Not worth chasing further
given how rare a Java class literally named `Class` nested inside another class is in practice.

### IN-02: `overloadCandidates` silently drops `LibFunction` overloads, unlike its sibling `siblingOverloads`

**File:** `bbj-vscode/src/language/bbj-overload-selector.ts:133-145`
**Issue:** Carried forward from the prior review — unchanged by 109-07. `siblingOverloads` (used
by `findBestOverload`) handles `JavaMethod`, `MethodDecl`, and `LibFunction`. `overloadCandidates`
(used by the type inferer's return-type re-selection) only handles the first two and falls
through to `[]` for anything else, including `LibFunction`. Today this is harmless because
`overloadedCallType`'s caller already guards with
`!(isJavaMethod(linked) || isMethodDecl(linked))` before calling `overloadCandidates`, so a
`LibFunction` is never passed in — but the asymmetry between the two "find same-named siblings"
helpers is undocumented, and a future caller that reuses `overloadCandidates` more broadly
(expecting parity with `siblingOverloads`) would silently get no candidates for `LibFunction`
sites.
**Fix:** Add a short comment on `overloadCandidates` noting the deliberate scope restriction to
`JavaMethod`/`MethodDecl` (matching its only caller), or extend it with the same `LibFunction`
branch `siblingOverloads` has.

### IN-03: `bbj-type-inferer.ts` is missing a trailing newline

**File:** `bbj-vscode/src/language/bbj-type-inferer.ts:187`
**Issue:** Carried forward from the prior review — unchanged by 109-07 (confirmed via a
byte-level check: the file's last 20 bytes still end `...return false;\n}` with no final
newline). Minor, but inconsistent with the rest of the codebase and typically caught by
`eol-last`-style lint rules.
**Fix:** Add a trailing newline to the file.

### IN-04: `localJavaTypeDto`'s primitive branch does not use the trimmed name

**File:** `bbj-vscode/src/language/java-interop.ts:118-128`
**Issue:** Carried forward from the prior review — unchanged by 109-07. `isLocalJavaTypeName`/
`localJavaTypeDto` both derive `trimmed = name.trim()` to decide whether `name` is a
primitive/void. For the primitive branch, `localJavaTypeDto` still builds the returned `JavaClass`
using the original, untrimmed `name` for both `name` and `simpleName`:
```ts
if (JAVA_PRIMITIVE_TYPE_NAMES.has(trimmed)) {
    return {
        ...
        name,
        simpleName: name,
        ...
```
If a caller ever passed a primitive name with surrounding whitespace (e.g. `" int"`), the
resulting `JavaClass` would carry `name: " int"`, diverging from a clean `"int"` lookup elsewhere.
Not currently reachable from any tested call path — a hardening note, not an observed bug.
**Fix:** Use `trimmed` instead of `name` for both `name` and `simpleName` in the primitive branch.

---

_Reviewed: 2026-09-26T04:50:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
