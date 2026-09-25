# Phase 109: Completion & Java Class Resolution - Context

**Gathered:** 2026-09-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Completion offers the right members in the right places, and Java class resolution sends the
backend only real class names, once each. Five requirements, all in the language server
(`bbj-vscode/`):

- **COMP-01 (#577):** after a fully-qualified Java class reference typed without `USE`
  (`java.lang.String.`), completion offers only static members, the same list as `String.`
  after `USE java.lang.String`.
- **COMP-02 (#556):** a call to an overloaded BBj or Java method gets the return type of the
  overload its arguments match, whatever order the overloads are declared or returned in.
- **COMP-03 (#561):** completion inside class method bodies. First measure which positions are
  broken, then fix each one or record why it stays out of reach, including the skipped DEF FN
  `_f$`/`_t$` test.
- **JINT-01 (#660):** primitives, `void` and array types never go to the java-interop backend as
  class lookups.
- **JINT-02 (#659):** a nested class named `Outer.Inner` in one place and `Outer$Inner` in
  another is resolved once, and completion shows the same members for both spellings.

No new features. The v4.6 rule holds: keep each fix minimal and release soon.

</domain>

<decisions>
## Implementation Decisions

### COMP-03: fix budget
- **D-01:** **The fix may be a change in `bbj-completion-provider.ts`** (for example a
  fallback that produces candidates when Langium's grammar follower yields no positions inside
  `MethodDecl.body`) **or a contained grammar change in `bbj.langium`.** No patch to Langium
  itself, no local fork and no upstream PR in this phase. A position that would need one is
  recorded as out of reach (D-02).
- **D-02:** **Positions that stay out of reach are recorded in two places.** Each one keeps a
  `test.skip` that states its reason, and #561 stays open with a comment that lists the
  remaining positions. The phase SUMMARY and VERIFICATION name them as well. There is no docs
  known-limitation line and no new issue.
- **D-03:** **The measurement comes first and is recorded before any fix.** It covers a matrix
  of synthetic positions inside a class method body, each paired with the same position
  outside a class, which serves as the control. The positions include statement start, after
  `=`, a call argument, member access after `.`, inside IF/FOR nested in a method, and a DEF FN
  inside a method (the skipped test). Keep the before-fix results in the phase directory so the
  final state can be compared against them.
- **D-04:** **A `bbj.langium` change must pass the private corpus harness, not only the vitest
  suite** (example-files included). Run it as Phase 107 did: snapshot `details.json` before
  each run and compare file sets rather than totals, and no file may newly enter A or A2. No
  corpus file name, path or source line enters the repository, and fixtures stay synthetic.
  Remember the lexer-lookbehind lesson: a green suite did not catch a token that matched inside
  an identifier, so include keyword-as-identifier cases in any grammar-change test.

### COMP-02: reach of the overload re-selection
- **D-05:** **Type inference only.** `bbj-type-inferer.ts` re-selects the overload with
  `findBestOverload` (`bbj-overload-selector.ts`) when it computes a call's return type, for
  both BBj `MethodDecl` and `JavaMethod` members. The linker (`getCandidate`) is not changed:
  go-to-definition, hover, find-references and the link target stay on the first-yielded
  declaration. Inlay hints already re-select (`bbj-inlay-hint-provider.ts:65`) and stay as they
  are. Reuse that provider's argument-type derivation instead of writing a second one.
- **D-06:** **Tie rule: an ambiguous choice gives no type.** Sometimes the arguments do not
  decide between candidates, either because they tie on score or because the argument types
  are unknown. If the tied candidates have different return types, the call's inferred type is
  `undefined`, so there is no member completion and no type-based check on the result. If they
  share a return type, that type is used. This is deliberately conservative. A wrong inferred
  type could make Phase 107's `bbj-unknown-java-member` Error fire on a valid member.
  `findBestOverload`'s own tie rule (the linked declaration wins) stays unchanged for inlay
  hints. Only the type inferer applies the no-type rule.

### JINT-01: primitives, void and arrays
- **D-07:** **Behaviour-neutral: build the same result locally, with no round trip.** A
  primitive, `void` or array type name (`int`, `byte[]`, `java.lang.Object[]` and the like)
  resolves to the same zero-member type that today's lookup returns (#660 logs
  `0 methods, 0 fields`), built without a backend request. Completion, hover, the overload
  selector and VAL-03 see exactly what they saw before. Arrays are **not** mapped to their
  component class.
- **D-08 (research finding to follow up):** Both backends already erase array member types to
  the component type (`getProperTypeName` in `bbj-ls` and in the in-repo `java-interop/`), and
  `bbj-overload-selector.ts`'s comment relies on that. Yet #660 shows `byte[]` and
  `java.lang.Object[]` reaching `resolveClassByName`. Research must find where those
  array-suffixed names come from (another backend field, a `.bbl`/BBj-side declaration, the
  class-name index, or something else) and make the filter cover that path as well as
  `resolveClass` Phase 2.

### JINT-02: nested class spelling
- **D-09:** **Unify in the language server.** Normalize nested-class names in `java-interop.ts`
  (the key `resolveClassByName`, the `resolvedClasses` cache and the pending-resolution map
  use), so one class is fetched and cached once whatever spelling arrives. This must work with
  every backend version, including the root-owned `bbj-ls.jar` that fresh BBj installs ship. No
  `bbj-ls` change and no `bbj-ls` issue in this phase.
- **D-10:** **Display spelling is `Outer.Inner`**, the Java source form, in hover, completion
  detail and messages. It is what `getCanonicalName` (and therefore most member types) already
  produces, so this is the least visible change. When the backend is asked for the class, the
  request uses whatever spelling it accepts. Research confirms which one: `Class.forName` needs
  `$`.
- **Code fact for research:** both backends name member types with `getCanonicalName`
  (`Outer.Inner`), but name `declaringClass` and constructor `returnType` with `getName`
  (`Outer$Inner`). That split is a likely source of the duplicates. Also check how the
  class-name index (`getAllClassNames`) spells nested classes, and how a `USE` of a nested class
  in BBj source is written and resolved.

### COMP-01: static-only after a fully-qualified class
- **D-11:** **The interop side needs no change.** `bbj-ls` sends `isStatic` for fields and
  methods (`InteropService.java:419,434`), so the `isStatic ?? false` default in `resolveClass`
  is not a blocker on the production backend. The fix is the `isClassRef` detection in
  `bbj-scope.ts`'s member-completion branch. It must also recognize a `MemberCall`-shaped
  receiver that names a Java class by its qualified name (where the receiver's inferred type is
  the class itself, not an instance). The result must be identical to the `SymbolRef` path,
  including static fields (#440 event constants) and the implicit `.class`.

### Claude's Discretion
- COMP-01: how exactly a fully-qualified class receiver is told apart from an instance-typed
  receiver in the `MemberCall` chain (a type-inferer signal, a check on the `JavaPackage` →
  class chain, or similar), as long as instance access on a variable of that class type keeps
  offering all members.
- COMP-03: the shape of the provider fallback or grammar change, within D-01.
- JINT-02: which normalization helper and where it is applied, within D-09/D-10.

### Carried constraints
- Validation of built-in calls stays conservative. Java-dependent logic acts only on fully
  resolved classes (the cold-resolution gotcha), never on a cold or partial class.
- Tests parse with `parseHelper` and never with `DocumentBuilder.build`, which reaches
  CPL/interop on :5008. Java-dependent tests use `createBBjTestServices`
  (`test/bbj-test-module.ts`).
- Regression gate: judge on `numFailedTests` and compare failing test names against the phase
  base commit in a scratch worktree. Do not relabel failures as "env noise". Local baseline
  failures: linking(11) + issue447(1).
- Keep planning ids (D-xx, plan numbers) out of source and test comments. Issue numbers are
  fine.

### Todo bookkeeping (not folded)
- The two Phase 108 todos (lost connection invisible to crash detection; stale previous status
  in the log) are closed as implemented by Phase 108 in this discussion's commit.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements and roadmap
- `.planning/REQUIREMENTS.md`: COMP-01, COMP-02, COMP-03, JINT-01, JINT-02
- `.planning/ROADMAP.md` § "Phase 109: Completion & Java Class Resolution": success criteria
  1-5 and planning notes

### GitHub issues (read with `gh issue view <n> -R BBx-Kitchen/bbj-language-server`)
- #577: COMP-01, `isClassRef` misses `MemberCall` receivers
- #556: COMP-02, type inference reads the first-linked overload's return type
- #561: COMP-03, no completion positions inside `MethodDecl.body`
- #660: JINT-01, primitive and array names sent as class lookups (log excerpt)
- #659: JINT-02, nested classes resolved twice (log excerpt)

### Prior phase context
- `.planning/phases/107-validation-false-alarms-silent-skips/107-CONTEXT.md`: D-10
  (`bbj-unknown-java-member` Error, which the D-06 tie rule protects) and D-13 (corpus harness
  procedure and the no-corpus-text rule reused by D-04)

### Backend (read-only reference, no change in this phase)
- `/home/coder/repos/bbj-ls/src/main/java/bbj/interop/InteropService.java`: `isStatic`
  (:419, :434) and `getProperTypeName` (:508-511), which gives array erasure and canonical vs
  binary names
- `java-interop/src/main/java/bbj/interop/InteropService.java`: the in-repo equivalent
  (`getProperTypeName` :274-280)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `findBestOverload` / `fitsArity` / `ArgumentType` (`bbj-overload-selector.ts`): overload
  scoring already used by inlay hints; the type inferer reuses it (D-05)
- `bbj-inlay-hint-provider.ts` `argumentType()`: existing derivation of argument types at a call
  site
- `createStubClass` (`java-interop.ts`): already builds a zero-member `JavaClass`, a candidate
  for D-07's local result
- `StreamScopeWithPredicate` + the `SymbolRef` static-only branch (`bbj-scope.ts:209-225`):
  the exact list COMP-01 must reproduce

### Established Patterns
- `resolveClassByName` guards (in this order): `resolvedClasses` fast path, `_inFlightPhase2`,
  `_pendingResolutions` dedup, depth limit. Name normalization (D-09) and the JINT-01 filter
  belong before the first of these so every path benefits
- `resolveClass` Phase 1 sets `isStatic`/`deprecated` synchronously; Phase 2 resolves
  `field.type`, `method.returnType` and `parameter.type` through `resolveClassByName`
  (java-interop.ts ~1080-1145), which is the main source of the #660 traffic
- The type inferer's `MemberCall` branch (`bbj-type-inferer.ts` ~55-90) reads
  `member.resolvedReturnType` / `getClass(member.returnType)` from the linked member only

### Integration Points
- `bbj-scope.ts` `getScope` member-completion branch (~192-240): COMP-01
- `bbj-type-inferer.ts` `MethodDecl` / `JavaMethod` return-type branches: COMP-02
- `bbj-completion-provider.ts` (+ possibly `bbj.langium`): COMP-03;
  `test/completion-test.test.ts:186` is the skipped `_f$`/`_t$` test
- `java-interop.ts` `resolveClassByName` / `resolveClass`: JINT-01/02

</code_context>

<specifics>
## Specific Ideas

- Criterion 4 and 5 evidence: a cold start with `bbj.debug` on shows no `Resolving class int`,
  `void`, `byte[]` or `...[]` lines, and no `Outer.Inner` / `Outer$Inner` pair. Unit tests pin
  this with a counting fake backend. Where practical, also capture a real cold-start log line
  set against the :5008 backend (remember the live-interop warm-up gotcha).

</specifics>

<deferred>
## Deferred Ideas

### Reviewed Todos (not folded)
- `2026-09-20-linking-interop-failures-survive-class-warmup.md`: test-infrastructure issue
  with the live backend, not completion or resolution behaviour
- `2026-09-20-phase-97-code-review-follow-ups.md`: IntelliJ Node-download follow-ups, out of
  scope
- `2026-09-24-unknown-java-member-linking-warning-extras.md`: validation wording and hierarchy
  Rule 2, explicitly excluded by 107 D-10
- `2026-09-20-lost-language-server-connection-is-invisible-to-crash-detection.md` and
  `2026-09-20-status-transition-log-prints-a-stale-previous-status.md`: done by Phase 108,
  moved to completed

- A `bbj-ls` change to send one nested-class spelling: not taken (D-09); revisit only if the LS
  normalization proves insufficient

</deferred>

---

*Phase: 109-completion-java-class-resolution*
*Context gathered: 2026-09-25*
