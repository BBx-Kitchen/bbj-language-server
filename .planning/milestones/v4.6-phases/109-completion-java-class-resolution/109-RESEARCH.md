# Phase 109: Completion & Java Class Resolution - Research

**Researched:** 2026-09-25
**Domain:** Langium scope/linking/type-inference/completion pipeline + java-interop class resolution (BBj language server) — no new external dependencies
**Confidence:** HIGH for COMP-01, COMP-03, JINT-01, JINT-02 (all empirically reproduced or refuted this session against the current tree, with a working test-double strategy validated for each); MEDIUM-HIGH for COMP-02 (the bug and the lossy-return-value design gap are both empirically confirmed; the exact refactor shape is a recommendation, not yet-built code)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**COMP-03: fix budget**
- **D-01:** The fix may be a change in `bbj-completion-provider.ts` (for example a fallback that
  produces candidates when Langium's grammar follower yields no positions inside `MethodDecl.body`)
  or a contained grammar change in `bbj.langium`. No patch to Langium itself, no local fork and no
  upstream PR in this phase. A position that would need one is recorded as out of reach (D-02).
- **D-02:** Positions that stay out of reach are recorded in two places. Each one keeps a
  `test.skip` that states its reason, and #561 stays open with a comment that lists the remaining
  positions. The phase SUMMARY and VERIFICATION name them as well. There is no docs
  known-limitation line and no new issue.
- **D-03:** The measurement comes first and is recorded before any fix. It covers a matrix of
  synthetic positions inside a class method body, each paired with the same position outside a
  class, which serves as the control. The positions include statement start, after `=`, a call
  argument, member access after `.`, inside IF/FOR nested in a method, and a DEF FN inside a
  method (the skipped test). Keep the before-fix results in the phase directory so the final state
  can be compared against them.
- **D-04:** A `bbj.langium` change must pass the private corpus harness, not only the vitest suite
  (example-files included). Run it as Phase 107 did: snapshot `details.json` before each run and
  compare file sets rather than totals, and no file may newly enter A or A2. No corpus file name,
  path or source line enters the repository, and fixtures stay synthetic. Remember the
  lexer-lookbehind lesson: a green suite did not catch a token that matched inside an identifier,
  so include keyword-as-identifier cases in any grammar-change test.

**COMP-02: reach of the overload re-selection**
- **D-05:** Type inference only. `bbj-type-inferer.ts` re-selects the overload with
  `findBestOverload` (`bbj-overload-selector.ts`) when it computes a call's return type, for both
  BBj `MethodDecl` and `JavaMethod` members. The linker (`getCandidate`) is not changed:
  go-to-definition, hover, find-references and the link target stay on the first-yielded
  declaration. Inlay hints already re-select (`bbj-inlay-hint-provider.ts:65`) and stay as they
  are. Reuse that provider's argument-type derivation instead of writing a second one.
- **D-06:** Tie rule: an ambiguous choice gives no type. Sometimes the arguments do not decide
  between candidates, either because they tie on score or because the argument types are unknown.
  If the tied candidates have different return types, the call's inferred type is `undefined`, so
  there is no member completion and no type-based check on the result. If they share a return
  type, that type is used. This is deliberately conservative. A wrong inferred type could make
  Phase 107's `bbj-unknown-java-member` Error fire on a valid member. `findBestOverload`'s own tie
  rule (the linked declaration wins) stays unchanged for inlay hints. Only the type inferer applies
  the no-type rule.

**JINT-01: primitives, void and arrays**
- **D-07:** Behaviour-neutral: build the same result locally, with no round trip. A primitive,
  `void` or array type name (`int`, `byte[]`, `java.lang.Object[]` and the like) resolves to the
  same zero-member type that today's lookup returns (#660 logs `0 methods, 0 fields`), built
  without a backend request. Completion, hover, the overload selector and VAL-03 see exactly what
  they saw before. Arrays are **not** mapped to their component class.
- **D-08 (research finding to follow up):** Both backends already erase array member types to the
  component type (`getProperTypeName` in `bbj-ls` and in the in-repo `java-interop/`), and
  `bbj-overload-selector.ts`'s comment relies on that. Yet #660 shows `byte[]` and
  `java.lang.Object[]` reaching `resolveClassByName`. Research must find where those array-suffixed
  names come from and make the filter cover that path as well as `resolveClass` Phase 2.

**JINT-02: nested class spelling**
- **D-09:** Unify in the language server. Normalize nested-class names in `java-interop.ts` (the
  key `resolveClassByName`, the `resolvedClasses` cache and the pending-resolution map use), so one
  class is fetched and cached once whatever spelling arrives. This must work with every backend
  version, including the root-owned `bbj-ls.jar` that fresh BBj installs ship. No `bbj-ls` change
  and no `bbj-ls` issue in this phase.
- **D-10:** Display spelling is `Outer.Inner`, the Java source form, in hover, completion detail
  and messages. It is what `getCanonicalName` (and therefore most member types) already produces,
  so this is the least visible change. When the backend is asked for the class, the request uses
  whatever spelling it accepts. Research confirms which one: `Class.forName` needs `$`.
- **Code fact for research:** both backends name member types with `getCanonicalName`
  (`Outer.Inner`), but name `declaringClass` and constructor `returnType` with `getName`
  (`Outer$Inner`). That split is a likely source of the duplicates. Also check how the class-name
  index (`getAllClassNames`) spells nested classes, and how a `USE` of a nested class in BBj source
  is written and resolved.

**COMP-01: static-only after a fully-qualified class**
- **D-11:** The interop side needs no change. `bbj-ls` sends `isStatic` for fields and methods
  (`InteropService.java:419,434`), so the `isStatic ?? false` default in `resolveClass` is not a
  blocker on the production backend. The fix is the `isClassRef` detection in `bbj-scope.ts`'s
  member-completion branch. It must also recognize a `MemberCall`-shaped receiver that names a Java
  class by its qualified name (where the receiver's inferred type is the class itself, not an
  instance). The result must be identical to the `SymbolRef` path, including static fields (#440
  event constants) and the implicit `.class`.

### Claude's Discretion
- COMP-01: how exactly a fully-qualified class receiver is told apart from an instance-typed
  receiver in the `MemberCall` chain, as long as instance access on a variable of that class type
  keeps offering all members.
- COMP-03: the shape of the provider fallback or grammar change, within D-01.
- JINT-02: which normalization helper and where it is applied, within D-09/D-10.

### Carried constraints
- Validation of built-in calls stays conservative. Java-dependent logic acts only on fully resolved
  classes (the cold-resolution gotcha), never on a cold or partial class.
- Tests parse with `parseHelper` and never with `DocumentBuilder.build`, which reaches CPL/interop
  on :5008. Java-dependent tests use `createBBjTestServices` (`test/bbj-test-module.ts`).
- Regression gate: judge on `numFailedTests` and compare failing test names against the phase base
  commit in a scratch worktree. Do not relabel failures as "env noise". Local baseline failures:
  linking(11) + issue447(1).
- Keep planning ids (D-xx, plan numbers) out of source and test comments. Issue numbers are fine.

### Deferred Ideas (OUT OF SCOPE)
- A `bbj-ls` change to send one nested-class spelling: not taken (D-09); revisit only if the LS
  normalization proves insufficient.
- VAL-03 optional extras, IntelliJ Node-download follow-ups, validation wording — carried from
  Phase 107/108, not this phase's concern.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| COMP-01 | `java.lang.String.` (no USE) offers statics only, same as `USE`d `String.` | Root cause reproduced empirically: the fully-qualified receiver is a `MemberCall`, never a `SymbolRef`, so `isClassRef` in `bbj-scope.ts:200-208` never fires. Exact fix location and shape given below with the AST shape proven by a live probe. |
| COMP-02 | A call to an overloaded method gets the return type of the overload that matches the arguments | Bug reproduced for both BBj `MethodDecl` and `JavaMethod` overloads. `findBestOverload`'s `MethodData`-only return type is shown to discard the AstNode needed to resolve a BBj `MethodDecl` overload's return type back to a `Class`; a concrete sibling-node-preserving design is proposed and reasoned from the actual field shapes (`MethodDecl.params` vs `MethodData.parameters`). |
| COMP-03 | Completion works inside class method bodies; gap is measured first | Full D-03 matrix run against the CURRENT tree: every tested position (statement start, after `=`, call argument, member after `.`, IF/FOR nested, DEF FN nested) already returns non-zero, on-par-with-control completions, **including the skipped test's own exact scenario**. Un-skipping the real test and running the full 44-test file green confirms this is not a fluke. The 2026-02-20 root cause appears stale. |
| JINT-01 | Primitives, `void`, arrays never reach the backend as class lookups | Confirmed the single choke point (`getRawClass`, only reachable via `resolveClassByName`) and the only production entry points into it. A concrete, behaviour-neutral fix shape (reuse `resolveClass`'s own pipeline, skip only the network call) is derived from reading `resolveClass`'s exact field-population sequence. |
| JINT-02 | `Outer.Inner` / `Outer$Inner` resolve once | Read both backends' `loadClassInfo`/`loadClassByName` source directly: confirmed the backend echoes back whatever spelling the client sent as `ClassInfo.name` (the cache-key source), and that `Class.forName` already tolerates a `.`-spelled request via an existing fallback. This means client-side normalization at `resolveClassByName`'s entry is sufficient and needs no coordinated backend change. |

</phase_requirements>

## Summary

Four of this phase's five requirements are Langium-scope/type-inference/completion-provider bugs
and one is a java-interop resolution-traffic bug; none touch external dependencies. Every finding
below was obtained by reading the exact source this session and, for the behavioural claims, by
running throwaway vitest probes against the CURRENT (unfixed) tree using `createBBjTestServices` +
`parseHelper` (all probe files were written under `bbj-vscode/test/`, run, and deleted — none were
committed, per the phase's shell/test rules).

**The single most consequential finding is COMP-03: the recorded defect appears to already be
fixed.** A full D-03 measurement matrix (statement start, after `=`, call argument, member after
`.`, IF/FOR nested in a method, and the skipped test's own DEF FN scenario) run against the current
tree shows **every position returning non-zero completions on par with the program-scope
control**, and un-skipping the actual skipped test (`test/completion-test.test.ts:186`, verbatim,
no changes) and running the full 44-test `completion-test.test.ts` file passes clean. The skip was
added 2026-02-20 (commit `85eab689`, phase 54) — roughly 55 phases and 7 months of completion/
grammar/Langium-upgrade work ago. This does not mean COMP-03 needs no plan: D-03's measurement
must still be run formally and recorded (per the locked decision), but the "fix" is very likely
just: run the matrix, un-skip the test, update or close #561 — no grammar change, so D-04's corpus
harness gate does not apply.

**COMP-01** is a precise, well-understood one-branch fix: `bbj-scope.ts`'s `isClassRef` detection
(`bbj-scope.ts:200-208`) only recognizes a `SymbolRef` receiver (the `USE`'d case, `String.`). A
fully-qualified reference (`java.lang.String.`, no `USE`) parses its receiver as a **chain of
`MemberCall` nodes**, never a `SymbolRef` — confirmed by a live AST dump. The fix is a second
branch that recognizes a `MemberCall` receiver whose own `member` cross-reference resolves directly
to a `Class` (mirroring what the type inferer's own `isMemberCall` branch already treats as
"receiver names the class itself": `isClass(member)` returns the member, see
`bbj-type-inferer.ts:87-89`).

**COMP-02** is confirmed broken for both BBj and Java overloads (probes below), and — more
importantly for planning — `findBestOverload`'s return type (`MethodData`, a plain
`{name, parameters, returnType}` object) **discards the resolved-class-worthy AstNode** for BBj
`MethodDecl` siblings (they are converted through `toMethodData()`, which has no way back to a
`Class`), while it happens to preserve enough for `JavaMethod` siblings (raw nodes, duck-typed).
The type inferer needs the actual declaration node to resolve a return type to a `Class`, so a new
sibling-preserving helper is needed alongside (not instead of) `findBestOverload`.

**JINT-01**'s fix location is proven singular: `getRawClass` (the only function that sends a
`getClassInfo` request) is reachable **only** through `resolveClassByName`, which itself has
exactly two entry shapes (by-name string, and the already-constructed-node `resolveClass`). A
behaviour-neutral, no-round-trip stub can be built by reusing `resolveClass`'s own Phase 1 field
population (which already produces a `{fields: [], methods: [], error: undefined}` shape for a
zero-member class) while skipping only the `getRawClass` network call.

**JINT-02**'s root cause is now precisely nailed from the backend source (`bbj-ls` and the in-repo
`java-interop/`): `loadClassInfo(className)` sets `classInfo.name = className` **verbatim, as an
echo of whatever spelling the client requested** — the backend does no normalization of its own.
The language server then caches by `javaClass.name` (`resolveClass`), so requesting `Outer.Inner`
and `Outer$Inner` produces two different cache entries and two backend round trips. `Class.forName`
already tolerates a `.`-spelled request via an existing, verified fallback in both backends'
`loadClassByName`, so normalizing to `.`-form once, at the very top of `resolveClassByName`, is
sufficient — no backend change, no per-backend-version branching needed.

**A load-bearing test-infrastructure finding for JINT-01/JINT-02:** the shared test double
(`JavaInteropTestService` in `test/bbj-test-module.ts`) **overrides `resolveClassByName` itself**
(`test/bbj-test-module.ts:172-175`), bypassing the exact production method these two requirements
must change. A new, narrower test double is needed for JINT-01/02's own tests — one that leaves
`resolveClassByName`/`resolveClass` as the real, inherited implementation and fakes only the
deepest layer (`getRawClass`, `protected`, safely overridable) with a call-counting spy. This
strategy is empirically validated below (a probe using exactly this shape reproduced both bugs
against real production code).

**Primary recommendation:** Fix COMP-01 with a second `isClassRef` branch in `bbj-scope.ts` (small,
isolated). Implement COMP-02 by adding a sibling-node-preserving helper next to
`findBestOverload` and wiring it into the type inferer's `MethodCall`/`MemberCall` branches, reusing
`bbj-inlay-hint-provider.ts`'s `argumentType()` (moved or duplicated to avoid a provider→inferer
import cycle — see Common Pitfalls). For COMP-03, run the D-03 matrix first exactly as locked, but
budget for the likely outcome that nothing needs fixing beyond un-skipping the test and updating
#561. Fix JINT-01/02 together in `resolveClassByName`, in that order (name normalization first,
then the primitive/void/array short-circuit, since both guards belong at the very top of the same
function) — build a new counting test double (not `JavaInteropTestService`) to verify both.

## Architectural Responsibility Map

Single-process Langium language server, consumed identically by two IDE clients. No browser/SSR/
API/CDN tiers exist; the meaningful "tiers" are the Langium pipeline's own stages (per `CLAUDE.md`).

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| COMP-01 static-only class-ref completion | Scope Provider (`bbj-scope.ts`) | Type Inferer (`bbj-type-inferer.ts`, read-only signal source) | The member-completion scope branch owns "what's offered here"; it already reads the type inferer's result, it just doesn't yet ask the right question of the receiver's own AST shape |
| COMP-02 overload-aware return type | Type Inferer (`bbj-type-inferer.ts`) | Overload Selector (`bbj-overload-selector.ts`, scoring logic reused) | D-05 locks this to type inference only; the linker's link target is explicitly unchanged |
| COMP-03 completion inside method bodies | Completion Provider (`bbj-completion-provider.ts`) | Grammar (`bbj.langium`, only if D-03 finds a real gap) | Per D-01's budget; research suggests the grammar/provider gap may already be closed |
| JINT-01 primitive/array filter | Java Interop (`java-interop.ts`, `resolveClassByName`) | — | Single choke point; no other tier touches class-name-to-request translation |
| JINT-02 nested-class normalization | Java Interop (`java-interop.ts`, `resolveClassByName`/`resolveClass`) | Scope Provider (`bbj-scope.ts`, consumes the now-unified tree read-only) | Cache-key unification must happen where the cache lives; downstream consumers (scope, hover, completion) need no change once the key is unified |

## Standard Stack

No new external dependencies. This phase modifies existing internal TypeScript logic only.

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `langium` | `~4.3.1` [VERIFIED: bbj-vscode/package.json:701] | Grammar/AST/validation/linking/scope/completion framework already in use | All five fixes are within its existing extension points (`ScopeProvider`, `TypeInferer` — project-internal, `DefaultLinker`, `DefaultCompletionProvider`) |
| `vitest` | `^4.1.10` [VERIFIED: bbj-vscode/package.json:719] | Test runner | `parseHelper`/`expectCompletion`/`validationHelper` from `langium/test` are the project's established probing pattern, used throughout this research session |

**Installation:** None required.

## Package Legitimacy Audit

Not applicable — this phase installs no external packages.

## Project Constraints (from CLAUDE.md)

- BBj is **case-insensitive**; all comparisons involving BBj member/class names in new code must
  stay case-insensitive (existing patterns: `.toLowerCase()` comparisons throughout
  `bbj-overload-selector.ts`, `StreamScopeWithPredicate`).
  `.`-`/`\``$`- name normalization for JINT-02 is not itself case-sensitive but must not break this.
- Grammar changes (`bbj.langium`) require `npm run langium:generate` afterward; never edit
  `src/language/generated/**` directly. Only relevant if COMP-03's measurement finds a real gap
  needing a grammar change (currently looks unlikely — see COMP-03 findings).
- Every `.bbj` file dropped into `bbj-vscode/test/test-data/` is auto-parsed by
  `example-files.test.ts` and must produce zero lexer/parser errors.
- Tests must use `parseHelper`, never `DocumentBuilder.build` (reaches CPL/interop on :5008).
  Java-dependent tests use `createBBjTestServices` (`test/bbj-test-module.ts`) — **but see the
  JINT-01/02 test-infrastructure finding below: that double's `resolveClassByName` override
  bypasses the code these two requirements change, so a new, narrower double is needed for their
  tests specifically.**
- Shell/search rules: built-in `Read`/`Glob`/(`Grep` unregistered in this environment per project
  MEMORY, use bash `grep` with absolute paths instead) first; every shell path absolute; never `cd`
  chained with `grep`/`find`/`cat`; `git add` scoped to exact paths, never `-A`/`.`.
- AST `$type` checks use the generated `ClassName` string constant / `isXxx()` guards from
  `generated/ast.ts`, never string literals — followed throughout this research's code citations.
- Langium 4.x completion-provider/scope-provider extension points are the project's established
  pattern (`bbj-completion-provider.ts` extends `DefaultCompletionProvider`, `bbj-scope.ts` extends
  `DefaultScopeProvider`) — new logic should extend these classes' existing methods, not introduce
  parallel mechanisms.

## Architecture Patterns

### System Architecture Diagram

```
BBj source text
      │
      ▼
┌─────────────┐
│   Parser     │  MemberCall chain built for `java.lang.String.` (no USE) —
└──────┬──────┘  confirmed: SymbolRef(java) -> MemberCall(member=lang)
       │                  -> MemberCall(member=String) -> MemberCall(member=undefined, dangling `.`)
       ▼
┌──────────────────────┐   COMP-01 site: bbj-scope.ts member-completion
│ Scope Provider         │   branch (~L192-233). isClassRef only checks
│ (bbj-scope.ts)         │   isSymbolRef(receiver) — misses the MemberCall-
└──────┬────────────────┘   chain receiver shape entirely (proven below).
       │
       ▼                    COMP-02 site: getCandidate picks the FIRST
┌──────────────────────┐    name match (bbj-linker.ts, unchanged per D-05).
│ Linker                │    Type inference (below) must re-select instead.
│ (bbj-linker.ts)       │
└──────┬────────────────┘
       ▼
┌──────────────────────┐   COMP-02 site: getTypeInternal's isMethodCall
│ Type Inferer           │   branch delegates to isMemberCall(expression.method)
│ (bbj-type-inferer.ts)  │   WITHOUT ever looking at expression.args — the args
└──────┬────────────────┘   live on the outer MethodCall, structurally distant
       │                     from where the member's return type is read.
       ▼
┌──────────────────────┐   COMP-03 site: completion candidate generation for
│ Completion Provider    │   a position inside MethodDecl.body — measured this
│ (bbj-completion-       │   session to already work (see findings below).
│  provider.ts)          │
└──────┬────────────────┘
       ▼
   LSP completion/hover/type-check results

Separately — Java class resolution (JINT-01/02), triggered from Phase 2 of
resolveClass() (field.type / method.returnType / parameter.type / constructor.returnType)
and from bbj-scope-local.ts's FQN preload:

  resolveClassByName(name) ── [ONLY choke point into the network] ──▶ getRawClass(name)
        │                                                                    │
        │  JINT-01: primitive/void/array names must stop HERE               │
        │  JINT-02: $-vs-.-spelled nested names must normalize HERE         ▼
        │                                                         getClassInfoRequest → :5008 backend
        ▼                                                         (bbj-ls or java-interop/)
  resolvedClasses cache (keyed by javaClass.name, itself an ECHO
  of whatever spelling was sent — confirmed by reading loadClassInfo
  in both backends: `classInfo.name = className;` verbatim)
```

### Recommended Project Structure

No new files are structurally required for any of the five fixes; all land in existing files.

```
bbj-vscode/src/language/
├── bbj-scope.ts                 # COMP-01: extend isClassRef detection (~L200-208)
├── bbj-type-inferer.ts          # COMP-02: MethodCall/MemberCall branches re-select overload
├── bbj-overload-selector.ts     # COMP-02: new sibling-node-preserving helper alongside findBestOverload
├── bbj-inlay-hint-provider.ts   # COMP-02: argumentType() reused (moved or duplicated — see pitfalls)
├── bbj-completion-provider.ts   # COMP-03: only if D-03 finds a real gap (looks unlikely)
├── bbj.langium                  # COMP-03: only if a grammar change proves necessary (D-01 budget)
├── java-interop.ts              # JINT-01/02: resolveClassByName (name normalization + primitive/array short-circuit)
test/
├── bbj-test-module.ts           # JINT-01/02: needs a NEW, narrower test double (see findings)
├── completion-test.test.ts      # COMP-01, COMP-03 (existing skipped test at :186)
├── method-return-java-type.test.ts   # COMP-02: existing pattern for asserting inferred call type
```

### Pattern 1 (COMP-01): the exact AST shape of a fully-qualified receiver, proven live

Grammar (`bbj.langium:863-870,893-895` [VERIFIED: read this session]):
```
MemberCall infers Expression:
    PrimaryExpression
    (
        {infer MemberCall.receiver=current} '.' (member=[NamedElement:FeatureName])?
        | {infer ArrayElement.receiver=current} "[" ... "]"
        | {infer MethodCall.method=current} '(' ... ')'
    )*
;
SymbolRef infers Expression:
    {infer SymbolRef} instanceAccess?='#'? symbol=[NamedElement:FeatureName]
;
```
`java.lang.String.` therefore parses as a **chain of `MemberCall`s**, only the innermost receiver is
a bare `SymbolRef` (`java`); every subsequent `.segment` is a `MemberCall` whose `receiver` is the
previous `MemberCall`. Confirmed with a live probe (`createBBjTestServices` + `parseHelper`, run
and deleted this session, `documentUri: 'file:///comp01-probe.bbj'`) parsing
`\n        java.lang.String.<|>\n        ` and dumping every `MemberCall`:
```
MemberCall count: 3
MemberCall[0] receiver.$type= MemberCall member= undefined   <- the dangling `.` (member not yet typed)
MemberCall[1] receiver.$type= MemberCall member= String
MemberCall[2] receiver.$type= SymbolRef member= lang
dangling.receiver.$type: MemberCall
dangling.receiver.member.$refText: String
dangling.receiver.member.ref.$type: JavaClass
isClass(dangling.receiver.member.ref): true
typeInferer.getType(dangling.receiver).$type: JavaClass String
```
Then querying the scope provider for the dangling MemberCall's `member` cross-reference (the exact
call site `bbj-scope.ts` makes for completion) reproduced the bug directly:
```
Scope element names: [ 'class', 'CASE_INSENSITIVE_ORDER', 'someInstanceField', 'charAt' ]
Contains instance-only field someInstanceField: true    <- BUG: leaks instance-only member
Contains static field CASE_INSENSITIVE_ORDER: true
```
Compare with the control (`s! = new java.lang.String()\ns!.`, an instance receiver, which correctly
offers `someInstanceField` too — that is CORRECT for an instance, confirming the existing
`SymbolRef` branch already does the right thing for instances and the gap is specific to the
class-reference case).

**Current (buggy) code** (`bbj-scope.ts:198-233` [VERIFIED: read this session]):
```typescript
let isClassRef = false;
if (isSymbolRef(receiver)) {
    try {
        const ref = receiver.symbol.ref;
        isClassRef = isJavaClass(ref);
    } catch {
        // cyclic reference, ignore
    }
}
if (isJavaClass(receiverType)) {
    ...
    if (isClassRef) {
        // Class reference access — static members only.
        const staticMethods = receiverType.methods.filter(m => m.isStatic);
        ...
```
Only `isSymbolRef(receiver)` is checked. For the fully-qualified case, `receiver` is a `MemberCall`
whose own `.member.ref` is the `JavaClass` directly — exactly the same "receiver names the class
itself" signal the type inferer already recognizes elsewhere:
```typescript
// Source: bbj-vscode/src/language/bbj-type-inferer.ts:87-89 [VERIFIED: read this session]
} else if (isJavaPackage(member) || isClass(member)) {
    return member;
}
```
**Recommended fix** — add a second branch to the `isClassRef` detection:
```typescript
let isClassRef = false;
if (isSymbolRef(receiver)) {
    try {
        isClassRef = isJavaClass(receiver.symbol.ref);
    } catch { /* cyclic reference, ignore */ }
} else if (isMemberCall(receiver) && receiver.member) {
    try {
        isClassRef = isJavaClass(receiver.member.ref);
    } catch { /* cyclic reference, ignore */ }
}
```
`isJavaClass` (not the broader `isClass`) matches the existing `SymbolRef` branch's own choice —
COMP-01 is scoped to Java classes (`java.lang.String.`), and `isBbjClass` class-reference access is
a structurally separate branch a few lines below (`bbj-scope.ts:234-244`) not mentioned by any
COMP-01 decision. The rest of the existing `isClassRef` branch (static-only filtering, the
`.class` pseudo-member, `#440` static fields) needs **no change** — it already works correctly for
the `SymbolRef`/`USE`'d case (proven by the existing passing test `'static field (event constant)
is offered on a Java class reference - issue #440'`, `test/completion-test.test.ts:533-552`), so
making `isClassRef` become `true` for the fully-qualified case routes it through the exact same,
already-correct code path.

### Pattern 2 (COMP-02): the bug reproduced, and why `findBestOverload` alone is not enough

Reproduced live (probes run and deleted this session, both patterns following
`test/method-return-java-type.test.ts`'s own established assertion style —
`BBj.types.Inferer.getType(methodCall)`):

**BBj `MethodDecl` overloads**, two `m1` overloads differing only by parameter/return type
(`String`/`HashMap`), called with a `HashMap` argument:
```
COMP-02 BBj MethodDecl overload — inferred type name: String   <- BUG: should be HashMap
```
**`JavaMethod` overloads** (fake `java.lang.String.find`, one `String`->`String`, one
`HashMap`->`HashMap`, called with a `HashMap` argument):
```
COMP-02 JavaMethod overload — inferred type name / isJavaClass: String true   <- BUG: should be HashMap
```
Root cause, read directly (`bbj-type-inferer.ts:104-108,55-89` [VERIFIED: read this session]):
```typescript
} else if (isMethodCall(expression)) {
    // A call expression (e.g. BBjAPI(), obj.foo()) has the type of the
    // thing being called: for BBjAPI() the method symbol resolves to the
    // BBjAPI class, for obj.foo() the receiver member yields its return type.
    return this.getType(expression.method);
}
```
`expression.method` is a `MemberCall` (or `SymbolRef`); `expression.args` (the call's actual
arguments — the only source of overload-disambiguating information) is **never read** on this
path. The `isMemberCall` branch that then runs reads `member.resolvedReturnType?.ref ??
this.javaInterop.getResolvedClass(member.returnType)` for `JavaMethod`, or `getClass(member.
returnType)` for `MethodDecl` — always for the **linker's already-chosen** `member`, which
`bbj-linker.ts`'s `getCandidate` picked via `scope.getElement(name)` returning the **first** match
in iteration order (`bbj-scope.ts`'s `StreamScopeWithPredicate.getElement`,
`this.elements.find(e => ...)` — first match wins), independent of the call's arguments.

**`findBestOverload` correctly re-ranks by argument type when given real `argTypes`** — confirmed
live: with `argTypes = [{className: 'HashMap'}]`, `findBestOverload(linkedMember, linkedData,
argTypes)` picked the `HashMap` overload (`{"name":"m1","parameters":[{"name":"h","type":
"java.util.HashMap"}],"returnType":"java.util.HashMap"}`) — the scoring algorithm itself is
correct and reusable as-is (`fitsArity`/`scoreOverload`/`typeAffinity`, `bbj-overload-selector.ts:
22-96`).

**The load-bearing gap: `findBestOverload`'s return value cannot always be resolved back to a
`Class`.** Confirmed live: for the winning `MethodDecl` candidate, `Object.keys(best)` is exactly
`['name', 'parameters', 'returnType']` — **no AstNode, no way to call `getClass()`**. This is because
`siblingOverloads` (`bbj-overload-selector.ts:98-115` [VERIFIED: read this session]) converts
`MethodDecl` siblings through `toMethodData()`:
```typescript
// Source: bbj-vscode/src/language/bbj-nodedescription-provider.ts:35-41 [VERIFIED: read this session]
export function toMethodData(methDecl: MethodDecl): MethodData {
    return {
        name: methDecl.name,
        parameters: methDecl.params.map(p => { return { name: p.name, type: getFQNFullname(p.type) } }),
        returnType: getFQNFullname(methDecl.returnType)
    }
}
```
`getFQNFullname` returns a **string** (`klass.klass.$refText` / etc. — quoted verbatim at
`bbj-nodedescription-provider.ts:61-71` [VERIFIED: read this session]), discarding the actual
`MethodDecl.returnType: QualifiedClass` node. There is **no existing helper that resolves a bare
BBj class-name string back to a `Class`** — confirmed by grep: every `getResolvedClass(string)` call
site in the codebase is `javaInterop.getResolvedClass`, Java-only; the only BBj-class-by-name
resolver, `resolveClassScopeByName` in `bbj-scope.ts:332-351`, is `private` and needs a
`ReferenceInfo` context, not a bare string. `getClass()` (`bbj-nodedescription-provider.ts:82-95`)
needs the actual `QualifiedClass` AST node.

Contrast with `JavaMethod`: `siblingOverloads`'s `isJavaMethod` branch returns the **raw**
`JavaMethod` nodes directly (`node.$container.methods.filter(...)`, no conversion) — confirmed live
that the winner from `findBestOverload` still carries `'resolvedReturnType' in best === true`, with
`.ref?.name === 'HashMap'` intact (duck-typed: `JavaMethod` structurally satisfies `MethodData`
since it already has `name`/`parameters`/`returnType`, so the spread in `enhanceFunctionDescription`
— `{ ...descr, ...func }`, `bbj-nodedescription-provider.ts:30-32` — and `findBestOverload`'s own
candidate array both keep the original object identity for Java, but MethodDecl has NO such
overlap: `MethodDecl.params` (not `parameters`) and `MethodDecl.returnType: QualifiedClass` (not a
string) mean it can never satisfy `MethodData`'s shape without the lossy conversion).

**Recommended design** (a new function, not a change to `findBestOverload`'s existing signature —
`bbj-inlay-hint-provider.ts` must keep working unmodified per D-05):
```typescript
// bbj-overload-selector.ts — new export, alongside findBestOverload
export interface OverloadCandidate { node: AstNode; data: MethodData }

/** Like siblingOverloads, but keeps the originating AstNode paired with its MethodData —
 *  MethodDecl siblings need this because toMethodData() discards the node identity that
 *  getClass(candidate.returnType) requires to resolve a return type back to a Class. */
function siblingOverloadCandidates(node: AstNode): OverloadCandidate[] { ... }

/** Re-selects by the same scoring as findBestOverload, but returns the node (so the caller
 *  can resolve its return type) and whether the winner was a genuine tie (D-06). */
export function selectOverloadNode(
    resolved: AstNode | undefined, linkedNode: AstNode, linkedData: MethodData, argTypes: ArgumentType[]
): { node: AstNode; tied: boolean } | undefined { ... }
```
The type inferer's `isMethodCall` branch then becomes: gather `expression.args` via a reusable
`argumentType()`, call `selectOverloadNode`, and resolve the **winner's own node**:
`isJavaMethod(winner) ? winner.resolvedReturnType?.ref ?? getResolvedClass(winner.returnType) :
isMethodDecl(winner) ? getClass(winner.returnType) : undefined` — i.e. reuse the exact per-kind
resolution the type inferer already does for the linked member today, just applied to the
**re-selected** node instead of the linker's first match. D-06's tie rule needs the score
comparison exposed too (e.g. return `tied: true` when two candidates share the top score), so the
caller can compare their resolved return types and fall back to `undefined` only when they differ.

`argumentType()` (`bbj-inlay-hint-provider.ts:104-117` [VERIFIED: read this session]) depends on
`TypeInferer` (`protected readonly inferer: TypeInferer`) — moving it into
`bbj-overload-selector.ts` (which currently has no such dependency) or duplicating a
type-inferer-free variant avoids a provider→inferer→provider import cycle; see Common Pitfalls.

**Test-double gap for COMP-02:** `test/bbj-test-module.ts`'s fake `SysGui` class (`addWindow`,
`openWindow`, `showDialog`, `setValue` — all real overload pairs already used by inlay-hint tests,
`bbj-test-module.ts:213-355` [VERIFIED: read this session]) has **every overload returning the same
type** (`'java.lang.Object'` or `'void'`) — none demonstrate a return-type change across overloads,
which is exactly what COMP-02 needs to test. A new fake method pair with differing return types
(or the `String.find(String)`/`String.find(HashMap)` shape used in this session's probe) needs to
be added to the test double, or built inline per-test the way
`method-return-java-type.test.ts:186-196,230-242` pushes an ad-hoc `JavaMethod` directly onto
`getResolvedClass('java.lang.String')!.methods`.

### Pattern 3 (COMP-03): the measurement matrix, run against the current tree

D-03's exact matrix (statement start, after `=`, call argument, member after `.`, IF nested, FOR
nested, DEF FN nested — the skipped test's own scenario) was run this session with a throwaway
probe (`createBBjTestServices`, direct `CompletionProvider.getCompletion()` calls, run and
deleted), each position paired with the identical construct at program scope (with a trailing
statement after the cursor in both — see the pitfall below on why that matters). **Every position
inside a class method body returned non-zero completions, matching or exceeding its control:**

| Position | In-method count | Control count |
|----------|-----------------|----------------|
| statement start | 145 | 139 |
| after `=` | 4 | 4 |
| call argument (`PRINT <\|>`) | 143 | 143 |
| member after `.` (`x!.<\|>`) | 4 | 4 |
| inside `IF` nested in method | 143 | 141 |
| inside `FOR` nested in method | 147 | 145 |
| DEF FN nested in method (skipped test's own scenario) | 147 | 144 |
| partial keyword prefix (`PRI<\|>`) | 4 | 4 |
| partial class name after `use` (`Hash<\|>`) | 1 | 1 |

For the DEF FN position specifically (the skipped test's exact scenario), the labels were checked
directly: `_f$`/`_t$` both present, no truncated `_f`/`_t` — exactly what the skipped assertion
(`test/completion-test.test.ts:203-213`) expects.

**Confirmation the skipped test itself passes, unmodified, in its original full-file context:** a
throwaway copy of the entire `completion-test.test.ts` (44 tests) with only `test.skip(...)` →
`test(...)` on the one line was run standalone — **all 44 tests passed**, including the previously
skipped one, with no other change.

**Historical context for why this is plausible, not just a fluke:** `git log -S "DEF FN parameters
with"` shows the skip was added in `85eab689` (2026-02-20, phase 54, message: "Root cause: Langium
DefaultCompletionProvider grammar follower does not find valid completion positions inside class
method statement bodies"). Between then and now (phase 109), the log shows a Langium 4.3
regression-and-fix cycle (`ca7225ba "fix: restore BBjAPI()/method-call completions broken after
Langium 4.3"`) and at least five more completion-provider fixes (`#445`, `#453`, `#454`, `#455`,
`#460`, plus the `#498` per-request cancellation-token rework) — any of which plausibly closed the
grammar-follower gap as a side effect, unnoticed because the one test exercising it stayed skipped.

**Methodological pitfall found and corrected during this measurement:** an early version of the
"call argument" control (`PRINT <|>\n` as the ENTIRE file) returned 0 items while the in-method
version returned 143 — which looked backwards (broken at program scope, not in the method).
Re-testing with a trailing statement after the cursor (`x! = 1\nPRINT <|>\ny! = 2\n`) made the
control match the in-method count exactly (143 = 143). **The apparent "0" was an artifact of the
completion point being the very last content before EOF, not anything about program-scope vs.
class-method-body.** Any D-03 fixture the plan writes must include a trailing statement after the
`<|>` marker, in both the in-method and control variants, or a position will read as falsely
broken.

**Recommendation:** run D-03's matrix as locked (required regardless of outcome), keep the raw
before-fix results in the phase directory as instructed. Given this session's findings, the
expected outcome is: no position needs a provider/grammar fix. The remaining work is: un-skip
`test/completion-test.test.ts:186` (verbatim — it already passes), and per D-02, since nothing
stays "out of reach," close out #561 with a comment stating the baseline now passes rather than
leaving it open with a list of broken positions (D-02's "positions that stay out of reach" clause
does not apply if the measurement finds none — confirm this reading with the user at plan/discuss
time if the matrix, re-run formally, disagrees with this session's informal probe).

### Pattern 4 (JINT-01): the single choke point, and a behaviour-neutral no-round-trip design

**Confirmed: `getRawClass` (the only function that sends a `getClassInfo` request,
`java-interop.ts:465-476` [VERIFIED: read this session]) is reachable from exactly one place**
(`doResolveClassByName`, `java-interop.ts:957-960`), which is reachable only from
`resolveClassByName` (`java-interop.ts:894-936`). Every Phase-2 caller —
`field.resolvedType`/`method.resolvedReturnType`/`parameter.resolvedType`/`constructor.
resolvedReturnType` (`java-interop.ts:1086-1144`, all four call `resolveClassByName`) — and the two
other callers (`bbj-scope-local.ts:385`, `java-interop.ts:822`, both FQN-probe shaped, not the
primitive/array source) all funnel through this one function. Guarding at the top of
`resolveClassByName` therefore covers every path, including future ones, in one place (matching
D-09's own placement note).

**The exact #660 traffic source, confirmed by reading `resolveClass`'s Phase 2 loop directly**
(`java-interop.ts:1082-1144` [VERIFIED: read this session]):
```typescript
for (const field of javaClass.fields) {
    field.resolvedType = { ref: await this.resolveClassByName(field.type, token, _depth + 1), $refText: field.type };
}
for (const method of javaClass.methods) {
    ...
    method.resolvedReturnType = { ref: await this.resolveClassByName(method.returnType, token, _depth + 1), $refText: method.returnType };
    for (const [index, parameter] of method.parameters.entries()) {
        ...
        parameter.resolvedType = { ref: await this.resolveClassByName(parameter.type, token, _depth + 1), $refText: parameter.type };
```
`field.type`/`method.returnType`/`parameter.type` are the **raw, unfiltered strings from the
backend DTO** — for a `byte[] p_flags` parameter or a `void` return, these are literally `"byte[]"`
/`"void"`, passed straight into `resolveClassByName` with no check.

**A behaviour-neutral, no-round-trip design, derived from `resolveClass`'s own Phase 1 (synchronous)
field population** (`java-interop.ts:1016-1077` [VERIFIED: read this session]): today's round trip
for a primitive/void/array name still goes through the FULL `resolveClass()` pipeline (Phase 1 sets
`$type`/`isStatic`/`deprecated`, `storeJavaClass` registers it in the classpath tree, Phase 2 does
nothing further since there are 0 fields/methods to recurse into) — producing a cached `JavaClass`
with `error: undefined`, `packageName: ''` (or the array's own weird "package"), `fields: []`,
`methods: []`. This is **not** the same shape as `createStubClass()`'s stub (which sets `error:
'Resolution failed or depth limit exceeded'` — a real, resolved-but-empty class is different from a
failed-resolution stub, and downstream consumers like Phase 107's `bbj-unknown-java-member` check
(`isJavaClass(receiverType) && !receiverType.error`) tell the two apart). **The behaviour-neutral
fix is therefore: at the top of `resolveClassByName`, for a primitive/`void`/array-suffixed name,
synthesize a raw `{name: className, fields: [], methods: []}` object locally (no network call) and
pass it through the EXISTING `resolveClass()` call — not `createStubClass()`** — reproducing
exactly what today's round trip produces (including `storeJavaClass`'s tree registration, which the
classpath tree already receives today for these names via the real round trip, so skipping it would
be the actual behaviour change).

**The primitive/void list** (Java keyword primitives, confirmed against the `#660` log excerpt and
standard Java): `boolean`, `byte`, `char`, `double`, `float`, `int`, `long`, `short` (8), plus
`void` (9 total, matching the issue's own "eight primitives, void" phrasing). **Array detection**:
`className.endsWith('[]')` (covers `int[]`, `byte[]`, `java.lang.Object[]`, and multi-dimensional
`int[][]` since the suffix check only inspects the last two characters) — per D-07, an array name
is **not** unwrapped to its component type; it gets its own zero-member stub keyed by the full
array-suffixed string, exactly as today.

**D-08's specific question (where array-suffixed names originate despite both backends' own
`getProperTypeName` erasing arrays to their component type) is answered:** they don't originate
from a *different* path than Phase 2 — Phase 2 IS the source. `getProperTypeName` erasure happens
**inside the backend**, for the *return value of a resolved class's own fields/methods* — i.e. once
a class **containing** an array-typed member is resolved, that member's `type`/`returnType` string
already arrives at the language server pre-erased to the component type by the backend (per the
`getProperTypeName` code CONTEXT.md cites). But the erased value itself can still be an array
string in one case CONTEXT.md's citation does not cover: `getProperTypeName`'s own erasure is
`clazz.isArray() ? clazz.getComponentType().getCanonicalName() : clazz.getCanonicalName()` — this
erases exactly ONE array dimension. A `byte[]` field's `.getType()` is a `byte[].class`, an array
whose component type is `byte` (not itself an array) — `getComponentType().getCanonicalName()` for
that gives `"byte"`, not `"byte[]"`. **So a genuinely single-dimension array member's type string
should already arrive erased.** The `byte[]`/`java.lang.Object[]` names in the #660 log are far more
plausibly explained by: (a) `getProperTypeName` only erases the OUTER dimension of a
multi-dimensional array (`byte[][]` → `byte[]`, still array-suffixed) — a real, common case for
event-mask/flags APIs — or (b) a raw JDK reflection field never routed through `getProperTypeName`
at all, e.g. the constructor block's `pi.type = getProperTypeName(p.type)` IS routed
(`InteropService.java:453` region, [CITED: bbj-ls source, read this session]) so this is less
likely. **This nuance could not be fully pinned down without a live multi-dim-array repro against
the real backend; recommend the plan's Wave 0 include a synthetic multi-dimensional-array test case
(`byte[][]`) specifically, since the single-erasure-dimension theory is the strongest fit for the
evidence but was not independently confirmed by reading the loop that calls `getProperTypeName` on
an already-array component type.** Regardless of the exact origin, the fix (guard at
`resolveClassByName`'s entry, matched by `.endsWith('[]')`) covers it either way — this is a
robustness note, not a blocker.

### Pattern 5 (JINT-02): the backend echoes the request spelling back; normalize once, client-side

**Confirmed directly from both backends' source: the response's own `name` field is an untouched
echo of whatever the client requested — no backend-side normalization exists.**
```java
// Source: bbj-ls InteropService.java:402-405 [VERIFIED: read this session]
private ClassInfo loadClassInfo(String className) {
    // FIXME handle inner class names
    var classInfo = new ClassInfo();
    classInfo.name = className;
```
```java
// Source: java-interop/src/main/java/bbj/interop/InteropService.java:166-171 [VERIFIED: read this session]
private ClassInfo loadClassInfo(String className) {
    // Inner class names (Outer.Inner) are handled by loadClassByName(),
    // which converts dot-separated names to $-separated JVM names when
    // Class.forName() fails. See #314 for context.
    var classInfo = new ClassInfo();
    classInfo.name = className;
```
Since the language server's `resolveClass()` uses `const className = javaClass.name` (the echoed
value) as the `resolvedClasses` cache key (`java-interop.ts:1017-1018` [VERIFIED: read this
session]), requesting `Outer.Inner` then `Outer$Inner` produces **two separate cache entries and two
backend round trips** — this is JINT-02's exact mechanism, empirically reproduced this session (see
the test-double finding below: `getRawClass` was called once per spelling, twice total, for the
same real class).

**`Class.forName` already tolerates a `.`-spelled nested-class request, via an existing fallback —
confirmed identical in both backends:**
```java
// Source: bbj-ls InteropService.java:475-500 [VERIFIED: read this session]
private Class<?> loadClassByName(String className) throws ClassNotFoundException {
    try {
        return Class.forName(className, false, classLoader);
    } catch (ClassNotFoundException e) {
        var matches = FIRST_UPPER_SEGMENT.matcher(className).results().limit(2).count();
        if (matches > 1) {
            // Probably nested class FQN
            var segements = className.split("\\.");
            var delim = ".";
            if (segements.length > 1) {
                // Try with canonical name
                var canonicalName = new StringBuilder();
                for (int i = 0; i < segements.length; i++) {
                    var qualifier = segements[i];
                    canonicalName.append(qualifier);
                    if (i < (segements.length - 1)) {
                        if (!qualifier.isEmpty() && Character.isUpperCase(qualifier.charAt(0))) {
                            delim = "$";
                        }
                        canonicalName.append(delim);
                    }
                }
                if ("$".equals(delim)) {
                    // Nested class, try to load with canonical name
                    return Class.forName(canonicalName.toString(), false, classLoader);
```
A `.`-spelled request (`Outer.Inner`) first fails the direct `Class.forName`, then this fallback
detects an upper-case-starting segment and retries with `$` inserted — succeeding. A `$`-spelled
request (`Outer$Inner`) succeeds on the FIRST `Class.forName` call directly (JVM binary names use
`$` natively). **Both spellings work today against both backends** — this means client-side
normalization to a single spelling is sufficient and safe: the backend will accept it either way
(the `.`-form just costs one extra exception-and-retry per request on the backend, a minor,
acceptable cost, not a correctness issue) — confirming D-09's "must work with every backend
version" requirement without needing a version probe or backend change.

**`getAllClassNames` (the class-name index backing auto-import / `findClassCandidatesByPrefix`)
spells nested classes in `$`-form**, confirmed: `bbj-ls InteropService.java:194-202
[VERIFIED: read this session]`, quoted: `".forEach(info -> names.add(info.getName()));"` —
`ClassInfo.getName()` on a `ClassPath`-scanned class is the JVM binary name (`$`-form). This index
is a SEPARATE data path from `resolveClassByName`'s cache (it's a flat name list used only for
missing-`use` suggestions, `java-interop.ts:864-885` `findClassCandidatesBySimpleName`/
`resolveClassCandidatesBySimpleName`) — not itself a source of duplicate resolution, but worth
noting for the plan: an auto-import suggestion for a nested class may itself insert a `$`-spelled
`use` statement unless this list is also normalized before display/insertion. This is adjacent to
JINT-02's locked scope (D-09/D-10 only mention `resolveClassByName`/`resolvedClasses`/the
pending-resolution map) — flag as a possible follow-up rather than in-scope, since CONTEXT.md does
not name `findClassCandidatesByPrefix`/`getAllClassNames` among the required normalization sites.

**Recommended design** — a small pure normalizer, applied at the very top of BOTH entry points into
resolution (the string-based `resolveClassByName` AND the node-based `resolveClass`, since
`resolveClass` is independently reachable from `loadClasspath()`'s bulk-load loop,
`java-interop.ts:666`, bypassing `resolveClassByName` entirely):
```typescript
/** Canonical spelling for a Java class name: dotted (matches getCanonicalName(), member types,
 *  and Class.forName's fallback path) rather than JVM-binary ($-separated). */
function normalizeJavaClassName(name: string): string {
    return name.includes('$') ? name.replace(/\$/g, '.') : name;
}
```
Applied as the FIRST statement in `resolveClassByName(className, ...)` (reassigning the parameter,
so every downstream cache check — `resolvedClasses.has`, `_inFlightPhase2.get`,
`_pendingResolutions.get` — and the eventual `getRawClass(className, ...)` call all see the
normalized value), and again at the top of `resolveClass(javaClass, ...)` on `javaClass.name`
itself before `const className = javaClass.name` is read for caching (covering the `loadClasspath`
bulk path, which never goes through `resolveClassByName`). Since the backend always echoes back
whatever spelling was requested, normalizing the OUTGOING request to `.`-form means the response's
own `.name` field arrives already `.`-form too — no second normalization needed on the way back.

**Display spelling (D-10) needs no separate work**: once `javaClass.name` is normalized to `.`-form,
every consumer that reads `.name` for hover/completion/messages (`bbj-hover.ts`,
`createReferenceCompletionItem` in `bbj-completion-provider.ts`, etc.) already shows the normalized
form — this is a side effect of the cache-key fix, not a separate change.

## A load-bearing test-infrastructure finding, shared by JINT-01 and JINT-02

**`JavaInteropTestService` (the project's standard Java test double, `test/bbj-test-module.ts:172-
175` [VERIFIED: read this session]) overrides `resolveClassByName` itself:**
```typescript
public override async resolveClassByName(className: string): Promise<JavaClass> {
    // A preloaded class, or a silent stub for anything else — never a socket, never a log.
    return this.getResolvedClass(className) ?? this.stubClass(className);
}
```
This is a **deliberate hermetic shortcut** (per its own comment, to avoid a real socket attempt on
:5008) — but it means **any test written against the standard `createBBjTestServices()` double
never exercises the production `resolveClassByName`/`resolveClass` code path at all** for a class
not already preloaded. JINT-01 and JINT-02's fixes live entirely inside that bypassed method, so
tests asserting "no backend request for `int`" or "resolved once for both spellings" **cannot** use
`JavaInteropTestService` as-is.

**A viable alternative, empirically validated this session:** a new test double that extends
`JavaInteropService` directly (not `JavaInteropTestService`) and overrides only the deepest layer,
`getRawClass` (`protected`, safely overridable from a subclass), with a call-counting spy — leaving
the real, inherited `resolveClassByName`/`resolveClass` to run:
```typescript
class CountingJavaInteropTestService extends JavaInteropService {
    public rawClassCalls: string[] = [];
    protected override async getRawClass(className: string, _token?: CancellationToken): Promise<JavaClass> {
        this.rawClassCalls.push(className);
        return { $type: JavaClass.$type, name: className, packageName: '', fields: [], methods: [], classes: [], constructors: [] } as unknown as JavaClass;
    }
}
```
Run against the CURRENT (unfixed) tree this session:
```
rawClassCalls for int: [ 'int' ]                                                        <- proves the JINT-01 bug via real code
rawClassCalls for nested class (both spellings): [ 'com.test.Outer.Inner', 'com.test.Outer$Inner' ]  <- proves the JINT-02 bug via real code (2 calls, not 1)
```
(A `JavadocProvider not initialized` console error appeared in this quick probe because it skipped
the initialization `JavaInteropTestService`'s constructor does — `bbj-test-module.ts:65-68`; the
error is caught internally by `resolveClass`'s own `catch (e) { console.error(e) }`, so resolution
still completed, but a real test double built on this pattern should call
`JavadocProvider.getInstance().initialize([], services.shared.workspace.FileSystemProvider)` in its
constructor exactly as `JavaInteropTestService` already does, to keep output clean.)

**Recommendation:** add this new, narrower double (e.g. `test/java-interop-counting-test-module.ts`
or inline in the JINT-01/02 test file) as Wave 0 test infrastructure for this phase. It directly
lets the plan assert both success criteria 4 and 5 with unit tests reading `rawClassCalls`, without
needing the live `:5008` backend (matching the carried "cold-resolution gotcha"/hermetic-test
constraints).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Detecting "receiver names a class, not an instance" (COMP-01) | A new heuristic on `receiverType` alone | Check whether the receiver's OWN cross-reference (`.symbol.ref` or `.member.ref`) resolves directly to a `Class`, mirroring `bbj-type-inferer.ts:87-89`'s existing `isClass(member)` check | The type inferer already encodes this exact distinction for a different purpose; reusing the same signal keeps the two mechanisms from silently diverging later |
| Overload scoring (COMP-02) | A second scoring algorithm for the type inferer | `fitsArity`/`scoreOverload`/`typeAffinity` from `bbj-overload-selector.ts`, reused via a new node-preserving wrapper | D-05 explicitly requires reuse; the scoring logic is already correct (proven live) — only the return-value shape (`MethodData` vs. AstNode) needs a new wrapper |
| Resolving a BBj class-name string back to a `Class` (COMP-02) | A new global BBj-class-by-name resolver | Keep the AstNode alongside the `MethodData` through overload selection so `getClass(node.returnType)` (the existing helper, needs the real `QualifiedClass` node) can be used directly | No such by-name resolver exists today (confirmed by exhaustive grep); building one is a larger, riskier addition than preserving node identity one call deeper |
| Primitive/array/void filtering (JINT-01) | A new lightweight synthetic `JavaClass` shape | Reuse `resolveClass()`'s own Phase 1 pipeline (feed it a locally-built raw object, skip only `getRawClass`) | `resolveClass()` already produces the exact `{fields:[], methods:[], error: undefined}` shape D-07 requires as "behaviour-neutral"; a hand-rolled shortcut risks missing a field the real pipeline sets (`$type`, `packageName`, `storeJavaClass` tree registration) |
| Nested-class name normalization (JINT-02) | A `bbj-ls`-side fix, or a version-probe-gated client fix | A single client-side string normalizer at `resolveClassByName`'s/`resolveClass`'s entry | D-09 locks this to the language server; `Class.forName`'s existing fallback (verified in both backend copies) already accepts the normalized `.`-form, so no backend coordination is needed |

**Key insight:** every one of this phase's fixes is a **read of an already-computed signal that
exists one call frame away from where today's code looks** — COMP-01 needs to look at the
receiver's own cross-reference instead of only its shape; COMP-02 needs to look at the call's args
instead of only the linked member; JINT-01/02 need to intercept at the single existing choke point
instead of adding parallel guards. None require new state, new services, or new external calls.

## Common Pitfalls

### Pitfall 1: Assuming COMP-03 needs a grammar or provider fix without re-measuring first
**What goes wrong:** Building D-01's fallback/grammar-change machinery before running D-03's
matrix wastes the budget on a problem that may not exist on the current tree.
**Why it happens:** The issue (#561) and the skipped test's own comment both assert a "0 items"
defect; without re-measuring, that assertion is easy to trust.
**How to avoid:** Run D-03's matrix FIRST (it is locked regardless), including un-skipping the
exact skipped test, before writing any provider/grammar code.
**Warning signs:** If the plan schedules a grammar-change task before a measurement task, this
pitfall has already been triggered.

### Pitfall 2: A degenerate control fixture makes a working position look broken
**What goes wrong:** A completion marker placed as the very last content before EOF returns 0
items regardless of location (class-method-body or program-scope) — this looks like a
location-specific defect but is a fixture artifact.
**Why it happens:** Confirmed live this session: `PRINT <|>\n` alone returns 0 items; `PRINT
<|>\ny! = 2\n` (trailing statement added) returns the same count as the paired in-method case.
**How to avoid:** Every D-03 fixture (in-method AND control) must have a trailing statement after
the `<|>` marker.
**Warning signs:** A control column reading exactly 0 while its paired in-method column is
non-zero, for a position that is not itself inherently empty (e.g. not the deliberately-empty
`after =` case).

### Pitfall 3: `argumentType()` reuse creating a provider→inferer→provider import cycle
**What goes wrong:** `bbj-inlay-hint-provider.ts`'s `argumentType()` depends on `TypeInferer`
(constructor-injected). If the type inferer (`bbj-type-inferer.ts`) imports it directly to reuse
the logic, and the inlay-hint provider still imports from the overload selector, a cycle can form
depending on where the helper lands.
**Why it happens:** `argumentType()` was written for a consumer (inlay hints) that already has a
`TypeInferer` reference; the type inferer IS the `TypeInferer` implementation, so a call back into
itself is circular in spirit even if not literally a cyclic ES import.
**How to avoid:** Move (or duplicate, if the move is too invasive) `argumentType()`'s literal/
prefix-expression logic into `bbj-overload-selector.ts` as a small pure helper taking a
`(expr: Expression, inferer: TypeInferer) => ArgumentType` shape — neither the type inferer nor the
inlay-hint provider needs to import the other; both import the shared helper from the selector
module (which already has no inferer dependency today).
**Warning signs:** A circular-import warning from `tsc`/`esbuild`, or `argumentType` becoming
`this.inferer.getType(...)` inside `bbj-type-inferer.ts` calling back into its own class's public
method recursively in a confusing way.

### Pitfall 4: Using `JavaInteropTestService` for JINT-01/02 tests
**What goes wrong:** A test written against the standard `createBBjTestServices()` double will
pass regardless of whether the JINT-01/02 fix is present or absent, because
`resolveClassByName` is entirely overridden and never reaches production code.
**Why it happens:** `createBBjTestServices` is the default, well-documented pattern used by nearly
every other test file in this project; it is the natural first choice.
**How to avoid:** Use a new, narrower double (see the "load-bearing test-infrastructure finding"
section above) for JINT-01/02's own tests specifically. Other requirements (COMP-01/02/03) are
unaffected — `JavaInteropTestService`'s override only matters for tests that need to observe
`resolveClassByName`'s OWN filtering/normalization behavior.
**Warning signs:** A JINT-01/02 test that passes immediately, before any production code change —
that is the signature of accidentally testing the test double's stub, not the fix.

### Pitfall 5: Treating `createStubClass()` as the right shape for JINT-01's local stub
**What goes wrong:** Reusing `createStubClass(className)` directly for a primitive/void/array name
sets `error: 'Resolution failed or depth limit exceeded'`, which is NOT what today's real round
trip produces (today's primitive stub has `error: undefined`) — this would be a silent behavior
change that D-07 explicitly forbids ("Completion, hover, the overload selector and VAL-03 see
exactly what they saw before").
**Why it happens:** `createStubClass` is the obviously-named, already-existing "build me a
zero-member class" helper, and CONTEXT.md's own code_context section flags it as "a candidate."
**How to avoid:** Reuse `resolveClass()`'s pipeline instead (feeding it a locally-built raw object
with no `error` field), not `createStubClass()`. See Pattern 4 above for the exact reasoning.
**Warning signs:** A test asserting `!receiverType.error` for a primitive-typed member starts
failing after the "fix" — that means `createStubClass`'s error-tagged shape leaked through.

## Code Examples

### COMP-01: extended isClassRef detection
```typescript
// bbj-vscode/src/language/bbj-scope.ts, member-completion branch (~L200)
let isClassRef = false;
if (isSymbolRef(receiver)) {
    try {
        isClassRef = isJavaClass(receiver.symbol.ref);
    } catch { /* cyclic reference, ignore */ }
} else if (isMemberCall(receiver) && receiver.member) {
    try {
        isClassRef = isJavaClass(receiver.member.ref);
    } catch { /* cyclic reference, ignore */ }
}
```

### JINT-01/02: guard order at the top of `resolveClassByName`
```typescript
// bbj-vscode/src/language/java-interop.ts
async resolveClassByName(className: string, token?: CancellationToken, _depth: number = 0): Promise<JavaClass> {
    className = normalizeJavaClassName(className);        // JINT-02: $ -> . once, before any cache read
    if (isPrimitiveVoidOrArray(className)) {               // JINT-01: never reaches getRawClass
        return this.resolveClass(buildLocalStub(className), token, _depth); // reuses the real pipeline
    }
    if (this.resolvedClasses.has(className)) { ... }        // existing fast path, now keyed consistently
    ...
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|---------------|--------|
| N/A — no ecosystem-level "state of the art" shift applies; this is internal bugfixing within an already-adopted framework (Langium 4.3.1) | — | — | — |

**Deprecated/outdated:** Nothing in this phase's scope is deprecated; the fixes work within the
existing Langium extension points already in use throughout the codebase.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Multi-dimensional array erasure (`byte[][]`) is the most likely source of a still-array-suffixed type string reaching `resolveClassByName` despite `getProperTypeName`'s single-dimension erasure, rather than an unrouted reflection field | JINT-01, Pattern 4 | If wrong, the `.endsWith('[]')` guard still fixes the symptom (no request, correct stub) — no behavioral risk, only a documentation-accuracy risk for D-08's "where do they come from" question |
| A2 | The `getAllClassNames`/`findClassCandidatesByPrefix` index's `$`-spelled nested-class names are out of JINT-02's locked scope (not named in D-09/D-10) | JINT-02, Pattern 5 | If the user intended this in scope, a nested-class auto-import suggestion could still insert a `$`-spelled `use` statement after the fix — low risk (cosmetic), easy follow-up |
| A3 | COMP-03's measurement, when formally re-run by the plan/executor, will reproduce this session's informal probe results (all positions already working) | COMP-03, Pattern 3 | If the formal re-run finds a genuinely broken position this session's probes missed, D-01/D-02's fallback-or-record path is still fully specified and available — no rework of the research, just more plan scope than expected |

**If this table is empty:** N/A — see above.

## Open Questions

1. **Does the formal D-03 measurement (run by the plan, not this session's informal probe) agree
   with "nothing is broken"?**
   - What we know: seven positions plus two extra partial-typing cases, all tested this session
     against the current tree with `createBBjTestServices`, all non-zero and on par with controls;
     the actual skipped test passes verbatim in its full original file context.
   - What's unclear: whether some position outside this session's matrix (e.g. `#field!` instance
     access syntax nested inside a method's IF, or a position exercised only via a Java-backed
     class rather than the fake test classes) is still broken.
   - Recommendation: run D-03's matrix formally as the phase's first task exactly as locked; if it
     confirms this session's findings, COMP-03 becomes "close #561, un-skip the test" rather than a
     grammar/provider change — significantly shrinking that requirement's plan footprint. Confirm
     this reading with the user before skipping COMP-03's fix-task entirely, since D-02's "record
     positions that stay out of reach" language assumes some will be found.

2. **Should `resolveClassByName`'s primitive/void/array short-circuit also bypass
   `storeJavaClass`'s tree registration, or keep it (as today's real round trip does)?**
   - What we know: today's real round trip DOES register `int`/`void`/`byte[]` as top-level
     entries in the classpath tree via `storeJavaClass` (confirmed by reading `resolveClass`'s
     unconditional `this.storeJavaClass(javaClass, javaClass.packageName)` call, which runs before
     any field/method-specific logic).
   - What's unclear: whether any completion/auto-import surface currently relies on (or is
     harmlessly tolerant of) `int`/`void` appearing as spurious top-level "classes" — this was not
     independently probed (e.g. does `int` show up in a `Ctrl+Space` at a type-reference position
     today?).
   - Recommendation: keep `storeJavaClass` in the reused pipeline (matches D-07's behaviour-neutral
     requirement exactly) unless a specific test shows it causing a new problem; do not use this as
     an opportunity to also "clean up" the tree, since that would be a behavior change outside this
     requirement's scope.

## Environment Availability

No external tool/service dependencies are introduced by this phase. The existing `:5008`
java-interop backend dependency is unchanged (JINT-01/02 reduce traffic to it, they do not add a
new dependency on it), and this phase's own tests must run hermetically (no live backend), per the
carried "cold-resolution gotcha" and "tests parse with parseHelper" constraints — consistent with
every other phase in this milestone. Section otherwise not applicable.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest `^4.1.10` [VERIFIED: bbj-vscode/package.json:719] |
| Config file | `bbj-vscode/vitest.config.ts` (no custom `include` glob — default `**/*.{test,spec}.?(c|m)[jt]s?(x)`) |
| Quick run command | `cd bbj-vscode && npx vitest run test/<file>.test.ts` |
| Full suite command | `cd bbj-vscode && npm test` (BBj/interop-dependent tests skip unless `RUN_BBJ_TESTS=1` and `:5008` is reachable) |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| COMP-01 | `java.lang.String.` (no USE) offers statics only | unit | `npx vitest run test/completion-test.test.ts -t "issue #577"` (new test) | ❌ Wave 0 — add alongside the existing `#440` static-field test |
| COMP-02 | Call to overloaded method infers the matching overload's return type | unit | `npx vitest run test/method-return-java-type.test.ts` (extend) or a new `overload-return-type.test.ts` | ❌ Wave 0 — needs BOTH a `MethodDecl` and `JavaMethod` fixture with differing per-overload return types (none exist today) |
| COMP-03 | Completion works inside class method bodies (measured first) | unit + measurement record | `npx vitest run test/completion-test.test.ts` (un-skip `:186`) | ✅ exists, currently skipped |
| JINT-01 | No backend request for primitive/void/array names | unit (counting fake) | `npx vitest run test/java-interop-counting.test.ts` (new) | ❌ Wave 0 — needs the new `CountingJavaInteropTestService`-shaped double (see finding above) |
| JINT-02 | `Outer.Inner`/`Outer$Inner` resolve once, same members shown for both | unit (counting fake) | same new counting-double file | ❌ Wave 0 — same double, additional test case |

### Sampling Rate
- **Per task commit:** the specific file(s) touched (`npx vitest run test/<file>.test.ts`)
- **Per wave merge:** `cd bbj-vscode && npm test` (full suite, `RUN_BBJ_TESTS` unset — local baseline
  is linking(11) + issue447(1) failures, per the carried standing decision; judge on
  `numFailedTests`, not "failed suites")
- **Phase gate:** full suite green (against the known baseline) before `/gsd-verify-work`; if D-03's
  matrix or COMP-02's overload fix touches `bbj.langium`, also run the private corpus harness per
  D-04 before considering the gate met

### Wave 0 Gaps
- [ ] A new, narrower Java-interop test double (`CountingJavaInteropTestService`-shaped: extends
      `JavaInteropService` directly, overrides only `getRawClass`, initializes `JavadocProvider` in
      its constructor like `JavaInteropTestService` does) — required for JINT-01 and JINT-02 tests,
      since the standard double bypasses the exact method being fixed.
- [ ] A `MethodDecl` overload pair with differing return types (e.g. two same-named methods, one
      returning a BBj class, one returning a Java class) — needed for COMP-02's BBj-side test; none
      of the existing fixtures have this shape.
- [ ] A `JavaMethod` overload pair with differing return types on the fake test-module classpath
      (`test/bbj-test-module.ts`'s `SysGui`/`HashMap`/`String` fakes all share one return type per
      overload group today) — needed for COMP-02's Java-side test.
- [ ] A synthetic multi-dimensional-array fixture (`byte[][]`) for JINT-01, per Open Question /
      Assumption A1 above — not strictly required to pass the stated success criteria, but
      recommended to close the "where do array-suffixed names actually originate" question with
      certainty rather than a strong inference.
- [ ] The D-03 before-fix measurement results file itself (e.g.
      `.planning/phases/109-completion-java-class-resolution/109-COMP03-MEASUREMENT.md`) — D-03
      requires these kept in the phase directory; none exist yet (this session's probes were
      throwaway and deleted per the phase's own shell rules, so the FORMAL measurement must be
      re-run and its results committed, not copied from this document).

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-------------------|
| V2 Authentication | no | Not applicable — no auth surface in this phase |
| V3 Session Management | no | Not applicable |
| V4 Access Control | no | Not applicable |
| V5 Input Validation | yes (narrow) | JINT-01's own filter IS an input-validation control: it stops forwarding attacker-uninfluenced-but-untrusted-shaped strings (Java type names sourced from resolved classpath reflection, not user input) to a backend RPC; no new external input surface is introduced |
| V6 Cryptography | no | Not applicable |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|----------------------|
| Backend request amplification (JINT-01's own defect: unbounded distinct array-type spellings, each triggering a socket round trip) | Denial of Service (resource exhaustion, self-inflicted rather than attacker-driven) | The fix itself IS the mitigation — short-circuiting primitive/void/array names before `getRawClass` bounds the request volume; no additional control needed beyond what this phase already builds |
| Nested-class cache-key duplication (JINT-02) causing unbounded cache growth for a workspace with many nested-class references | Denial of Service (memory growth via `resolvedClasses`' LRU-adjacent cache) | Normalizing to one cache key per real class (this phase's fix) directly bounds this; no separate control needed |

No new trust boundary, no new network surface, no new credential/secret handling is introduced by
this phase — all five requirements operate entirely within the existing language-server ↔
java-interop-backend RPC channel and the existing Langium in-process pipeline.

## Sources

### Primary (HIGH confidence — read directly this session)
- `bbj-vscode/src/language/bbj-scope.ts` — full file read; `isClassRef` detection, member-completion
  branch, `StreamScopeWithPredicate`
- `bbj-vscode/src/language/bbj-type-inferer.ts` — full file read
- `bbj-vscode/src/language/bbj-overload-selector.ts` — full file read
- `bbj-vscode/src/language/bbj-inlay-hint-provider.ts` — full file read
- `bbj-vscode/src/language/bbj-nodedescription-provider.ts` — full file read
- `bbj-vscode/src/language/bbj-linker.ts` — full file read
- `bbj-vscode/src/language/bbj-completion-provider.ts` — full file read
- `bbj-vscode/src/language/bbj.langium` — grammar excerpts (`MemberCall`, `SymbolRef`,
  `PrimaryExpression`, `QualifiedClass`, `MethodDecl`/`MethodDeclStart`)
- `bbj-vscode/src/language/generated/ast.ts` — `JavaClass`, `JavaField`, `JavaMethod`,
  `JavaMethodParameter`, `MethodDecl`, `LibFunction`, `BbjClass`, `Class` interfaces
- `bbj-vscode/src/language/java-interop.ts` — `resolveClassByName`, `doResolveClassByName`,
  `createStubClass`, `resolveClass` (Phase 1 + Phase 2), `storeJavaClass`, `getRawClass`,
  `getResolvedClass`, `extractPackageName` — all read directly this session
  (offsets 430-510, 790-830, 850-1150, 1196-1230, 1398-1410)
  and confirmed via `grep` for every `resolveClassByName(`/`.resolveClass(` call site
- `bbj-vscode/test/bbj-test-module.ts` — full relevant sections read (`JavaInteropTestService`
  constructor, `resolveClassByName` override, `stubClass`, all fake Java classes)
- `bbj-vscode/test/completion-test.test.ts` — read in full (all 44 tests, including the skipped
  test's exact text and surrounding tests)
- `bbj-vscode/test/method-return-java-type.test.ts` — read in full (the established pattern for
  asserting `TypeInferer.getType()` on a method call)
- `/home/coder/repos/bbj-ls/src/main/java/bbj/interop/InteropService.java` — `loadClassInfo`,
  `loadClassByName`, `getAllClassNames`, `getClassInfo` (sibling repo, read-only reference, no
  change in this phase, per canonical_refs)
- `/home/coder/repos/bbj-language-server/java-interop/src/main/java/bbj/interop/InteropService.java`
  — same methods, in-repo copy
- Six live vitest probes run against the current tree this session (all written under
  `bbj-vscode/test/`, run via `npx vitest run <file> --disable-console-intercept`, then deleted —
  none committed): COMP-01 AST-shape probe, COMP-02 overload-inference probe (BBj + Java),
  COMP-03 measurement-matrix probe (9 position pairs) + verbatim-skipped-test probe +
  full-file-with-skip-removed probe, JINT-01/02 counting-fake probe
- `git log -S`/`git show` on `bbj-vscode/test/completion-test.test.ts` for COMP-03's historical
  context (commit `85eab689`, 2026-02-20)
- `gh issue view 561` and `gh issue view 660` (full issue bodies, including the #660 log excerpt)

### Secondary (MEDIUM confidence)
- `.planning/phases/107-validation-false-alarms-silent-skips/107-RESEARCH.md` — prior-phase
  precedent for corpus-harness invocation, `JavaClass.error` as the "fully resolved" discriminator,
  and Langium document-validator diagnostic-hierarchy behavior (cited for continuity, not
  re-verified line-by-line this session since it is out of this phase's own file set)

### Tertiary (LOW confidence)
- None — every claim in this document is either `[VERIFIED: ...]` (read directly this session or
  empirically reproduced via a live probe) or explicitly flagged `[ASSUMED]`/logged in the
  Assumptions table above.

## Metadata

**Confidence breakdown:**
- COMP-01: HIGH — root cause and fix location both proven by a live AST-dump probe against the
  current tree
- COMP-02: MEDIUM-HIGH — the bug and the exact design gap (`MethodData` losing AstNode identity)
  are both proven live; the recommended new-function shape is a reasoned design, not yet-built code
- COMP-03: HIGH for "the recorded defect appears already fixed" (proven by running the actual
  skipped test, unmodified, in its full original context); MEDIUM for "no position anywhere is
  still broken" (this session's matrix is broad but not exhaustive — see Open Question 1)
- JINT-01: HIGH — choke point and traffic source both proven by direct reads plus a live
  counting-fake probe against real production code; MEDIUM for the multi-dim-array origin theory
  specifically (flagged as Assumption A1, does not affect the fix's correctness)
- JINT-02: HIGH — root cause (backend echo, no backend-side normalization) proven by reading both
  backends' source directly; the `Class.forName` fallback tolerance proven by reading the fallback
  code path directly in both backends

**Research date:** 2026-09-25
**Valid until:** 30 days (stable internal codebase, no fast-moving external dependency; re-verify
if `bbj-ls` or the in-repo `java-interop/` change their `loadClassInfo`/`loadClassByName` in the
interim, or if a Langium version bump lands before this phase executes)
