---
phase: 107-validation-false-alarms-silent-skips
reviewed: 2026-09-25T00:00:00Z
depth: standard
files_reviewed: 13
files_reviewed_list:
  - bbj-vscode/src/language/bbj-document-validator.ts
  - bbj-vscode/src/language/bbj-scope-local.ts
  - bbj-vscode/src/language/bbj-validator.ts
  - bbj-vscode/src/language/validations/check-unknown-java-member.ts
  - bbj-vscode/src/language/validations/check-variable-scoping.ts
  - bbj-vscode/src/language/validations/line-break-validation.ts
  - bbj-vscode/test/functional/parse-program-live.test.ts
  - bbj-vscode/test/functional/unknown-java-member-real-interop.test.ts
  - bbj-vscode/test/line-break-single-line-if.test.ts
  - bbj-vscode/test/linking.test.ts
  - bbj-vscode/test/test-data/conformance/single-line-if-forms.bbj
  - bbj-vscode/test/unknown-java-member.test.ts
  - bbj-vscode/test/variable-scoping.test.ts
findings:
  critical: 0
  warning: 3
  info: 2
  total: 5
status: issues_found
---

# Phase 107: Code Review Report

**Reviewed:** 2026-09-25T00:00:00Z
**Depth:** standard
**Files Reviewed:** 13
**Status:** issues_found

## Summary

This phase adds a new, deliberately conservative "unknown Java member" Error check
(`check-unknown-java-member.ts`), a dedup pass so that check's Error doesn't also leave behind
the linker's own Warning for the same reference (`dropShadowedMemberLinkingDiagnostics` in
`bbj-document-validator.ts`), a real bug fix in the single-line-IF/ELSE/FI line-break balance
walk (`line-break-validation.ts`), a `DefReturn`-skipping fix to the same walk's sibling lookup,
and a set of `?.`-guard hardening fixes for crash-on-malformed-syntax cases in
`check-variable-scoping.ts` and `bbj-scope-local.ts`.

I ran the full unit suite for all touched production files plus the wider line-break suite
(`line-break-validation.test.ts`, `line-break-walk-termination.test.ts`,
`line-break-walk-timeout.test.ts`) and `example-files.test.ts`; everything passes (the only
failures observed, in `linking.test.ts`'s Java-FQN/nested-class/`Object`-supertype tests, are the
already-documented `getAllClassNames` environment drift against the live `:5008` backend, not a
regression from this diff — none of them touch the lines this phase changed). I also wrote
throwaway probes (not committed) to check reachability of two suspected null-deref paths; findings
below reflect what those probes actually showed, not just static reading.

No Critical/Blocker-level defect was found: I could not construct or prove a case where the new
check reports a member that genuinely exists. The three Warnings below are gaps in the check's own
conservatism or in defensive hardening that is inconsistent with a sibling fix in the same file —
none are proven-reachable crashes or false positives today, but each is a real, untested edge in
code whose entire design goal is "never false-positive, never crash."

## Warnings

### WR-01: The nested-Java-type guard only covers the chained-access shape, not a bare reference

**File:** `bbj-vscode/src/language/validations/check-unknown-java-member.ts:222-239`

**Issue:** `receiverType.classes` is documented in this same file (and confirmed by grep across
`java-interop.ts`, `bbj-test-module.ts`, `fake-interop-peer.ts`, `java-interop-service.test.ts` —
every `JavaClass`-shaped object in the codebase has `classes: []`) to always be empty, so
`nestedClassMatch` never actually fires. The only remaining protection against flagging a real
Java nested class/interface reference (`Outer.Inner`) as an unknown field is:

```ts
if (isClassRef && isMemberCall(memberCall.$container) && memberCall.$container.receiver === memberCall) {
    return;
}
```

This only suppresses the Error when the nested-type reference is itself the receiver of a
*further* member access (`Outer.Inner.CLASS`, `Outer.Inner.someStaticMethod()`). A bare reference
to a nested type used as a value on its own (assigned to a variable, passed as an argument, used
in a comparison) is not covered, and would be reported as `Field 'Inner' is not defined on Outer`
— a false positive on legitimate Java syntax, which is exactly the failure mode this whole check
exists to avoid. In practice a *bare* nested-type name is a fairly unusual thing to write in Java
semantics (it's normally chained into `.class`, a static member, or used only in `DECLARE`/`USE`/
`CAST`, which take an entirely different, non-`MemberCall` grammar path via `JavaTypeRef`) — which
is probably why this shape wasn't hit by the live-backend corpus review this phase's other guards
were validated against. But the guard's own doc comment claims the shape is "genuinely unknowable
from here" without qualifying that it only covers the chained sub-case, and there is no test (unit
or real-interop) for a bare nested-type reference at all, unlike every other guard in this file.

**Fix:** Either broaden the condition to not require chaining (e.g. treat any `isClassRef` member
that fails methodMatch/fieldMatch as unknowable when it looks like a Java nested-type name, using
the same `/^[A-Z]/` naming-convention heuristic `bbj-scope-local.ts`'s `isPotentiallyJavaFqn`
already relies on for the same class of ambiguity), or add an explicit code comment plus a test
proving the bare-reference shape is actually unreachable from BBj's `MemberCall` grammar (i.e. that
it can only be produced via `JavaTypeRef`), so the restriction is a documented, verified invariant
rather than an implicit one.

### WR-02: `hasCertainReceiverType`'s BBjAPI detection trusts raw reference text, not what it resolves to

**File:** `bbj-vscode/src/language/validations/check-unknown-java-member.ts:125-131`

**Issue:**

```ts
if (isMethodCall(receiver)) {
    const method = receiver.method;
    if (isSymbolRef(method)) {
        return method.symbol?.$refText?.toLowerCase() === 'bbjapi';
    }
    return false;
}
```

This treats any method call whose callee's reference text is literally `bbjapi` as certain,
without checking that `method.symbol.ref` actually resolves to the built-in `BBjAPI` accessor
function. If a codebase ever declares its own function or method named `bbjapi` (BBj is
case-insensitive and user-definable names aren't reserved), and the type inferer resolves *that*
call's return type to some fully-resolved Java class, this guard would still return `true` purely
on the name match, letting an incorrect "certain" verdict through to the Error path. This is a
narrow scenario (nobody is likely to shadow `BBjAPI`), but it's the one place in this function that
checks source text instead of a resolved symbol, and it's inconsistent with how carefully every
other guard in this file checks node *shape* or *resolved type* rather than raw text.

**Fix:** Confirm `method.symbol?.ref` is the actual built-in `BBjAPI` global before trusting the
name match, e.g. by checking that the resolved element is the well-known synthetic `BBjAPI`
function/class from `lib/bbj-api.ts` rather than just comparing `$refText`.

### WR-03: An unguarded `symbol.$refText` remains in `bbj-scope-local.ts`, one function away from where the identical crash class was just hardened

**File:** `bbj-vscode/src/language/bbj-scope-local.ts:236-251`

**Issue:** This phase added a `node.symbol` guard to the `isInputVariable` branch (line 293:
`if (isSymbolRef(node) && node.symbol)`) specifically to stop a crash when a malformed reference
(e.g. `ENTER ##`) parses to a `SymbolRef` whose `symbol` cross-reference never got assigned. The
adjacent `isAssignment` branch a few lines above has the exact same shape and was not touched:

```ts
if (isSymbolRef(node.variable)) {
    // case: `foo$ = ""` without declaring foo$
    const symbol = node.variable.symbol
    if (scopes.getStream(scopeHolder).toArray().findIndex((descr: AstNodeDescription) => descr.name === symbol.$refText) === -1) {
```

I verified with a throwaway probe that `node.variable.symbol` genuinely can be `undefined` for
malformed input shaped like `## = 1` (confirmed via direct AST inspection). It happens not to
crash today only because, for every malformed shape I could construct, whenever the inner
`SymbolRef.symbol` fails to bind this way, the *outer* `Assignment.instanceAccess` flag is also
`true` (the malformed `#`-prefix that leaves `symbol` unbound is consumed as the SymbolRef's own
`instanceAccess`, which per the grammar (`Assignment: instanceAccess?='#'? variable=MemberCall ...`)
requires the outer Assignment to have already consumed a leading `#` of its own) — and the
containing `else if (isAssignment(node) && !node.instanceAccess && ...)` guard already excludes
that case before reaching this line. I could not find a malformed input that reaches this branch
with `symbol` undefined and `!node.instanceAccess` true, across 14 different malformed-LHS shapes
tried. This makes it a real but currently-unproven crash path: it depends on an implicit,
undocumented interaction between two different `instanceAccess` flags in the grammar rather than
an explicit guard, and would silently start crashing scope computation again if the grammar or
recovery behavior around `Assignment`/`SymbolRef` ever changes.

**Fix:** Add the same `symbol &&` (or `symbol?.$refText`) guard here that was just added to the
`isInputVariable` branch, for consistency and to remove the reliance on an unstated grammar
invariant:

```ts
if (isSymbolRef(node.variable) && node.variable.symbol) {
    const symbol = node.variable.symbol
    ...
}
```

## Info

### IN-01: `isReassignedToADifferentConstructedClass` matches by variable name across the whole document, not by scope

**File:** `bbj-vscode/src/language/validations/check-unknown-java-member.ts:79-102`

**Issue:** `AstUtils.streamAllContents(root)` walks the entire file looking for another
`Assignment` to a variable of the same (lower-cased) name, with no check that the two assignments
are in the same method/function/program scope. Two unrelated local variables in different methods
that happen to share a name (e.g. both called `x!`) will make each other's construction "uncertain"
even though they're different variables entirely. Per this phase's own stated bias, this only
produces additional false negatives (suppressed diagnostics), never a false positive, so it's
Info-level, but it does mean the check is markedly more conservative than its own doc comment
implies ("the same variable... reconstructed elsewhere").

**Fix:** Scope the search to the nearest enclosing `MethodDecl`/`DefFunction`/`Program` of
`assignment` (mirroring how `check-variable-scoping.ts`'s `walkStatements` already scopes its own
first-assignment tracking) rather than the whole document.

### IN-02: The empty-string exclusion in `hasCertainReceiverType` also fires for a literal used directly as a receiver

**File:** `bbj-vscode/src/language/validations/check-unknown-java-member.ts:117-124`

**Issue:** `isStringLiteral(receiver) => receiver.value !== ''` is there to stop an
auto-declared variable's placeholder `x! = ""` first assignment from being trusted. But
`hasCertainReceiverType` is also called directly on a `MemberCall`'s own receiver
(`checkUnknownJavaMember`'s `hasCertainReceiverType(receiver)`), where a bare empty string literal
used *directly* as a receiver (`"".invalidMethod()`) has no such ambiguity at all — its type is
unambiguously `java.lang.String` regardless of value. The current code suppresses this case too,
which is a missed diagnostic opportunity (false negative only), consistent with this phase's
conservative bias.

**Fix:** Distinguish the two call sites — trust any string literal receiver when
`hasCertainReceiverType` is called directly on a `MemberCall.receiver` (depth 0), and keep the
empty-string exclusion only for the recursive assignment-tracing case (`depth > 0`).

---

_Reviewed: 2026-09-25T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
