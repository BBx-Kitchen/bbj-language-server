---
phase: 109-completion-java-class-resolution
reviewed: 2026-09-25T19:29:13Z
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
  warning: 1
  info: 3
  total: 4
status: issues_found
---

# Phase 109: Code Review Report

**Reviewed:** 2026-09-25T19:29:13Z
**Depth:** standard
**Files Reviewed:** 13
**Status:** issues_found

## Summary

Reviewed the diff between `9898637b` and `HEAD` for the overload-aware return-type inference
(#556), the nested-class-name canonicalization and local-primitive short-circuit in
`java-interop.ts` (#659/#660), and the fully-qualified class-reference scope narrowing in
`bbj-scope.ts` (#577-adjacent). The new logic in `bbj-overload-selector.ts` and
`bbj-type-inferer.ts` is careful about ties, arity fallback and recursion safety, and is backed
by thorough, well-targeted tests (`overload-return-type.test.ts`,
`java-interop-nested-class-names.test.ts`, `java-interop-local-types.test.ts`). No security
issues, crashes, or data-loss risks were found.

One real (if narrow) logic defect was found in `bbj-scope.ts`'s new class-reference detection: it
misclassifies a literal reference to the class named `Class` (most notably `java.lang.Class`
itself) as the `.class` pseudo-member, because BBj's case-insensitivity makes the two
indistinguishable by name text alone. The remaining findings are minor quality/hardening notes.

## Warnings

### WR-01: A literal reference to a class named `Class` is misclassified as the `.class` pseudo-member

**File:** `bbj-vscode/src/language/bbj-scope.ts:212`
**Issue:**
The new `else if` branch that detects a class-reference receiver for a fully-qualified
`MemberCall` (no `USE`) excludes any receiver whose member text is `class`
(case-insensitive) before even attempting `.ref`:

```ts
} else if (isMemberCall(receiver) && receiver.member && receiver.member.$refText.toLowerCase() !== 'class') {
    try {
        isClassRef = isJavaClass(receiver.member.ref);
    } catch {
        // cyclic reference, ignore
    }
}
```

This is meant to keep `String.class.` and `java.lang.String.class.` on the instance-member path
(a `Class<String>` instance), which is correct. But it also excludes a *literal* qualified
reference ending in the identifier `Class` — most importantly `java.lang.Class` itself, e.g.
`java.lang.Class.forName(...)` typed fully-qualified with no `USE`. BBj is case-insensitive, so
the token `class`/`Class`/`CLASS` cannot be distinguished from the synthetic `.class`
pseudo-member by text alone; the scope provider's own pseudo-member scope entry
(`this.descriptions.createDescription(javaLangClass, 'class')`) resolves to the very same
`java.lang.Class` `JavaClass` node that a genuine qualified reference to `java.lang.Class`
resolves to, so `.ref` identity can't disambiguate them either.

Practical effect: `java.lang.Class.` (fully qualified, no `USE`) falls into the "instance access"
branch (`isClassRef` stays `false`), so completion after that dot offers `java.lang.Class`'s full
instance+static member list (unfiltered by `isStatic`) instead of the static-only list the
`isClassRef` branch would produce. Because the instance branch is a superset (it doesn't filter
by `isStatic`), actual reference resolution/linking of e.g. `forName` still succeeds — but
completion quality degrades (irrelevant instance members like `hashCode()`/`toString()` get
offered alongside the static ones a user actually wants after typing `java.lang.Class.`).

No test in `completion-class-reference.test.ts` exercises a receiver that is *itself* literally
named `Class` (all cases there use `String`/`HashMap`), so this gap is currently uncovered.

**Fix:**
Given the underlying ambiguity is inherent to BBj's case-insensitive `.class` syntax colliding
with any class literally named `Class`, a full disambiguation may not be possible from this
location alone. At minimum:
- Add a code comment acknowledging the known collision (rather than presenting the exclusion as
  a complete `.class`-detection), so a future reader doesn't mistake it for a corner case that's
  already handled.
- Consider narrowing the exclusion to receivers where excluding based on text is actually
  necessary — e.g., only treat the receiver as the `.class` pseudo-member when its *own* receiver
  chain resolves to a value-typed (non-package, non-class-literal) expression, if that
  information is available earlier in the chain; otherwise leave the qualified-package case
  (`java.lang.Class`) as a documented, tested limitation.
- Add a regression test capturing today's actual behavior (completion after
  `java.lang.Class.` with no `USE`) so a future change to this heuristic is deliberate, not
  accidental.

## Info

### IN-01: `overloadCandidates` silently drops `LibFunction` overloads, unlike its sibling `siblingOverloads`

**File:** `bbj-vscode/src/language/bbj-overload-selector.ts:133-145`
**Issue:** `siblingOverloads` (the pre-existing helper used by `findBestOverload`) handles three
cases: `JavaMethod`, `MethodDecl`, and `LibFunction`. The new `overloadCandidates` (used by the
type inferer's return-type re-selection) only handles the first two and falls through to `[]` for
any other node, including `LibFunction`. Today this is harmless because
`overloadedCallType`'s caller already guards with
`!(isJavaMethod(linked) || isMethodDecl(linked))` before ever calling `overloadCandidates`, so a
`LibFunction` is never passed in. But the asymmetry between the two "find same-named siblings"
helpers is not documented, and a future caller that reuses `overloadCandidates` more broadly
(expecting it to mirror `siblingOverloads`) would silently get no candidates for `LibFunction`
sites.
**Fix:** Either add a short comment on `overloadCandidates` noting the deliberate scope
restriction to `JavaMethod`/`MethodDecl` (matching its only caller), or extend it with the same
`LibFunction` branch `siblingOverloads` has, returning `{ node, data }` pairs for consistency.

### IN-02: `bbj-type-inferer.ts` is missing a trailing newline

**File:** `bbj-vscode/src/language/bbj-type-inferer.ts:187`
**Issue:** The file's last line (`}` closing `sameDeclaredClass`) has no trailing newline
(confirmed via `git diff`'s `\ No newline at end of file` marker and a byte-level check). Minor,
but inconsistent with the rest of the codebase and typically caught by `eol-last`-style lint
rules or editor diffs that otherwise look clean.
**Fix:** Add a trailing newline to the file.

### IN-03: `localJavaTypeDto`'s primitive branch does not use the trimmed name

**File:** `bbj-vscode/src/language/java-interop.ts:107-123`
**Issue:** `isLocalJavaTypeName`/`localJavaTypeDto` both derive `trimmed = name.trim()` to decide
whether `name` is a primitive/void. For the primitive branch, `localJavaTypeDto` builds the
returned `JavaClass` using the *original, untrimmed* `name` for both `name` and `simpleName`:

```ts
if (JAVA_PRIMITIVE_TYPE_NAMES.has(trimmed)) {
    return {
        ...
        name,
        simpleName: name,
        ...
```

If a caller ever passed a primitive name with surrounding whitespace (e.g. `" int"`), the
resulting `JavaClass` would carry `name: " int"` and would be cached under that
whitespace-polluted key (since `resolveClass`'s `canonicalJavaClassName` call does not trim
either), diverging from a clean `"int"` lookup elsewhere and potentially double-caching the same
conceptual primitive under two different keys, with the padded one shown in hover/completion.
This is not currently reachable from any tested code path (all call sites appear to pass
already-trimmed type names, and the test suite's `'  '` case only exercises the *blank* branch,
not a padded primitive), so this is a hardening note rather than an observed bug.
**Fix:** Use `trimmed` instead of `name` for both `name` and `simpleName` in the primitive
branch, matching the intent already expressed by computing `trimmed` in the first place.

---

_Reviewed: 2026-09-25T19:29:13Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
