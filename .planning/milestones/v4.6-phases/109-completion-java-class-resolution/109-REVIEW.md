---
phase: 109-completion-java-class-resolution
reviewed: 2026-09-26T00:00:00Z
depth: standard
files_reviewed: 14
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
  - bbj-vscode/test/method-body-scope.test.ts
  - bbj-vscode/test/overload-return-type.test.ts
findings:
  critical: 0
  warning: 0
  info: 5
  total: 5
status: issues_found
---

# Phase 109: Code Review Report

**Reviewed:** 2026-09-26T00:00:00Z
**Depth:** standard
**Files Reviewed:** 14
**Status:** issues_found

## Summary

Full re-review of the whole phase diff (`git diff 4b0cd256^..HEAD` for the 14 listed files),
superseding the prior `109-REVIEW.md` (which covered the phase through the 109-07 gap-closure
commit) now that plan 109-08 has landed. 109-08 adds a new `lexicalScope()` private method to
`BbjScopeProvider` (`bbj-scope.ts`) that draws a hard boundary at `MethodDecl`: a class METHOD
body is documented BBj behavior to see only its own parameters and the class's fields, not
program-level variables. `method-body-scope.test.ts` (new) and `completion-method-body.test.ts`
(the `test.skip` from 109-07 replaced with real assertions) exercise this directly.

**Deep-dive on `lexicalScope()` (the requested focus):**

I traced `lexicalScope()` line by line against Langium's own
`DefaultScopeProvider.getScope` (`node_modules/langium/src/references/scope-provider.ts:51-72`):
the ancestor walk, the `localSymbols.has(currentNode)` / `getStream(currentNode)` per-node
lookup, and the `getGlobalScope` + `createScope` fold are copied exactly. The only addition is one
extra predicate clause, applied only when `currentNode` is specifically the `Program` node:
`!(dropProgramVariables && isSubtype(desc.type, VariableDecl.$type))`. Outside a `MethodDecl`
(`!getContainerOfType(context.container, isMethodDecl)`), the method short-circuits straight to
`superGetScope(context)` (today's exact, unmodified path), so every non-method reference is
provably unaffected.

I then checked `bbj-scope-local.ts`'s `collectLocalSymbols`/`processNode` to confirm which
`AstNodeDescription`s actually land keyed at the `Program` node with a `VariableDecl`-subtype
`type` (the only entries this new clause can touch), and which node kinds keep a legitimate name
visible from inside a method:
- Implicit auto-declared assignments (`foo$=""`), `DIM` arrays (`ArrayDecl` is a `VariableDecl`
  subtype per `generated/ast.ts:255`), top-level `declare` statements, and `READ`/`DREAD`/`ENTER`/
  `FOR` targets are *all* keyed at `Program` (via `findScopeHolder`/`addToScope`'s
  `CompoundStatement`-hoisting) with a `VariableDecl`- or `FieldDecl`-typed description — exactly
  the set the method-scoping doc comment claims to drop, and exactly what the new clause drops.
- Method parameters (`ParameterDecl`, also a `VariableDecl` subtype) are keyed at the `MethodDecl`
  node itself, not `Program`, so the `isProgram(currentNode)` guard never touches them — they stay
  visible.
- Class fields, accessors, `this!`/`super!` are keyed at the `BbjClass` node, never `Program` —
  unaffected, stay visible.
- `DEF FN` declarations are keyed at their container (their own `$type`, not `VariableDecl`) — the
  subtype check alone excludes them from the drop, regardless of which node they're keyed at.
- `USE`'d Java classes are keyed at `Program` with `type: javaClass.$type` (`JavaClass`, not
  `VariableDecl`) — also excluded by the subtype check, and additionally layered in *outside*
  `lexicalScope()` entirely (`memberAndImports` in `getScope` concatenates
  `importedBBjClasses(program)` alongside the `lexicalScope()` result), so they can never be
  affected by this change even if their typing changed.
- `LabelDecl` is not a `VariableDecl` subtype at all (`generated/ast.ts:3053` lists only
  `ArrayDecl | FieldDecl | ParameterDecl | VariableDecl`) — unaffected.

`method-body-scope.test.ts`'s `PRESENCE_FIXTURE` test and `KINDS_FIXTURE` test assert exactly this
partition (params/locals/`#field`/`this!`/USE'd classes/`DEF FN` all resolve inside the method;
every program-variable kind fails to link and is absent from completion), and both pass. I did not
find a case where a legitimate name is wrongly dropped.

One real, narrow gap: this whole partition is reached only through the
`isSymbolRef(context.container)` branch of `getScope` (the only call site of `lexicalScope()`).
The grammar has exactly one other cross-reference typed `VariableDecl` — `NextStatement.variable`
(`bbj.langium:479`, `NEXT_ID variable=[VariableDecl:FeatureName]`) — which is never wrapped in a
`SymbolRef` node, so it never reaches `lexicalScope()` and instead falls through to the untouched
`superGetScope(context)` at the end of `getScope`. In practice a `NEXT` inside a method body is
always paired with a `FOR` also inside that same method body (structurally enforced by block
nesting), so this is not a reachable regression today — see IN-05 below for why it's still worth
a note.

The remaining four Info items are carried forward from the prior review (files/lines unchanged by
109-08, re-verified against current `HEAD`).

## Info

### IN-01: A nested Java class literally named `Class` still collides with the `.class` pseudo-member

**File:** `bbj-vscode/src/language/bbj-scope.ts:211-229`
**Issue:** The class-reference detection disambiguates `class` by checking whether the *segment
before* it types as a `JavaPackage`. This correctly separates `<package>.Class.` (a real class
reference) from `<class-or-value>.class` (the pseudo-member). It does not cover a *nested* class
literally named `Class` — e.g. `com.example.Outer.Class` addressed as `Outer.Class.` (no `USE`),
or `com.example.Outer.Class.` fully qualified. Here `receiver.receiver` (`Outer`) types as a
`JavaClass`, not a `JavaPackage`, so `isPseudoClassMember` stays `true` and the reference is
(mis)treated as the `.class` pseudo-member on `Outer`, offering `java.lang.Class`'s instance
members instead of `Outer.Class`'s static members. No test exercises this shape.
**Fix:** This is a narrower restatement of the same inherent BBj case-insensitivity ambiguity the
code's own comment (`bbj-scope.ts:199-210`) already documents as a known, deliberate limitation.
Consider extending that comment to explicitly note nested classes named `Class` share the same
collision, or add a regression test capturing today's actual (pseudo-member) behavior so a future
change to this heuristic is deliberate rather than accidental. Not worth chasing further given how
rare a Java class literally named `Class` nested inside another class is in practice.

### IN-02: `overloadCandidates` silently drops `LibFunction` overloads, unlike its sibling `siblingOverloads`

**File:** `bbj-vscode/src/language/bbj-overload-selector.ts:133-145`
**Issue:** `siblingOverloads` (used by `findBestOverload`, driving inlay hints) handles
`JavaMethod`, `MethodDecl`, and `LibFunction`. `overloadCandidates` (used by the type inferer's
return-type re-selection, #556) only handles the first two and falls through to `[]` for anything
else, including `LibFunction`. Today this is harmless: `BBjTypeInferer.getTypeInternal` has no
`isLibFunction` branch at all (a `LibFunction`'s return type was never inferred before this phase
either), and `overloadedCallType`'s guard (`!(isJavaMethod(linked) || isMethodDecl(linked))`)
already excludes `LibFunction` before `overloadCandidates` is ever called — so there is no
observable behavior gap. But the asymmetry between the two "find same-named siblings" helpers is
undocumented, and a future caller that reuses `overloadCandidates` expecting parity with
`siblingOverloads` would silently get no candidates for a `LibFunction` site.
**Fix:** Add a short comment on `overloadCandidates` noting the deliberate scope restriction to
`JavaMethod`/`MethodDecl` (matching its only caller), or extend it with the same `LibFunction`
branch `siblingOverloads` has.

### IN-03: `bbj-type-inferer.ts` is missing a trailing newline

**File:** `bbj-vscode/src/language/bbj-type-inferer.ts:186`
**Issue:** The file's last bytes are `...return false;\n}` with no final newline (confirmed with a
byte-level check against current `HEAD`). Minor, but inconsistent with the rest of the codebase
and typically caught by `eol-last`-style lint rules.
**Fix:** Add a trailing newline to the file.

### IN-04: `localJavaTypeDto`'s primitive branch does not use the trimmed name

**File:** `bbj-vscode/src/language/java-interop.ts:119-133`
**Issue:** `isLocalJavaTypeName`/`localJavaTypeDto` both derive `trimmed = name.trim()` to decide
whether `name` is a primitive/void. For the primitive branch, `localJavaTypeDto` still builds the
returned `JavaClass` using the original, untrimmed `name` for both `name` and `simpleName`:
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

### IN-05: The method-scope boundary is only reachable through `SymbolRef`, leaving `NEXT`'s `variable` reference unguarded

**File:** `bbj-vscode/src/language/bbj-scope.ts:290-296`
**Issue:** `lexicalScope()` is called from exactly one place: the `isSymbolRef(context.container)`
branch of `getScope`. The grammar's only other cross-reference typed `VariableDecl` is
`NextStatement.variable` (`bbj-vscode/src/language/bbj.langium:479`,
`NEXT_ID variable=[VariableDecl:FeatureName]`), which is not wrapped in a `SymbolRef` node and so
never reaches `lexicalScope()` — it falls through to the plain, unfiltered `superGetScope(context)`
at the bottom of `getScope`. If a `NEXT x` statement ever sat inside a class method body while `x`
resolved only to a same-named `FOR` variable declared at program scope, that reference would not
be excluded the way a `SymbolRef` to the same name would be. In practice a `NEXT` inside a method
is always paired with a `FOR` also inside that method (block nesting enforces this), so this is not
believed reachable today, and no test demonstrates an actual failure.
**Fix:** No action needed unless a future grammar or validation change decouples `FOR`/`NEXT`
pairing from block nesting. If it's ever worth closing defensively, `lexicalScope()` could be
invoked for `NextStatement.variable` too (or `getScope` could special-case its `referenceType` the
same way), but this is speculative hardening, not a fix for an observed defect.

---

_Reviewed: 2026-09-26T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
