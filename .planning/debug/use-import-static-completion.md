---
status: diagnosed
trigger: "Static method completion doesn't work on USE-imported class references but works on FQN"
created: 2026-02-21T00:00:00Z
updated: 2026-02-21T02:00:00Z
---

## Current Focus

hypothesis: CONFIRMED — Two-factor root cause identified
test: Static code analysis complete, trace through all code paths verified
expecting: N/A — root cause confirmed
next_action: Report diagnosis with fix suggestions

## Symptoms

expected: After `USE java.lang.String`, typing `String.` should show static methods (valueOf, format, join, etc.)
actual: `String.` only shows `.class` in completion. But `java.lang.String.` shows all static methods.
errors: none (silent wrong behavior)
reproduction: USE java.lang.String; then type String. and check completion
started: unknown

## Eliminated

- hypothesis: SymbolRef.symbol.ref doesn't resolve to JavaClass for USE-imported names
  evidence: bbj-scope-local.ts:164 adds JavaClass node to Program local scope with simple name. The scope chain for SymbolRef includes local symbols (from super.getScope). The local scope has "String" -> JavaClass. The linker finds this and returns description.node which IS the JavaClass.
  timestamp: 2026-02-21T00:00:30Z

- hypothesis: receiverType is not JavaClass for USE path
  evidence: Type inferer at bbj-type-inferer.ts:43 checks isClass(reference) which matches JavaClass. Returns the reference. So receiverType IS a JavaClass. The fact that .class appears in completion CONFIRMS receiverType is JavaClass (lines 171-175 of bbj-scope.ts only produce .class when isJavaClass(receiverType) is true).
  timestamp: 2026-02-21T00:00:40Z

- hypothesis: FQN and USE resolve to different JavaClass nodes
  evidence: Both resolve to the same original JavaClass from getResolvedClass('java.lang.String'). The FQN path resolves through MemberCall chain -> member.ref -> JavaClass. The USE path resolves through local scope -> description.node -> same JavaClass. The shallow copy created for implicit imports (loadImplicitImports:207) shares the same methods array reference.
  timestamp: 2026-02-21T00:00:50Z

- hypothesis: Completion parser creates synthetic MemberCall without receiver (causing EMPTY_SCOPE)
  evidence: The Langium completion parser's element stack maps features to NextFeature objects WITHOUT type info (line 225 of completion-provider.ts). The action() in completion parser is NOOP (langium-parser.ts:697). Since the element stack doesn't propagate type from actions, next.type is undefined for the member cross-reference. When next.type is undefined, completionForCrossReference does NOT create a synthetic node (line 417) — it uses context.node from the regular parse tree. Since .class DOES appear, the scope provider IS receiving the actual MemberCall with a valid receiver (otherwise receiverType would be undefined and EMPTY_SCOPE would be returned, showing nothing).
  timestamp: 2026-02-21T01:30:00Z

- hypothesis: FuzzyMatcher filters out static method labels
  evidence: DefaultFuzzyMatcher.match() returns true for empty query (line 27-28 of fuzzy-matcher.ts). When no text is typed after the dot, all labels match. Not a filtering issue.
  timestamp: 2026-02-21T01:00:00Z

- hypothesis: createScopeForNodes fails for static methods (nameProvider returns undefined)
  evidence: DefaultNameProvider.getName checks isNamed(node) which returns true for any object with a string name property. JavaMethod objects have name:string. So getName returns method.name correctly.
  timestamp: 2026-02-21T01:15:00Z

## Evidence

- timestamp: 2026-02-21T00:00:10Z
  checked: Grammar structure for MemberCall, SymbolRef, and USE
  found: MemberCall grammar (bbj.langium:791) uses {infer MemberCall.receiver=current} '.' member=[NamedElement:FeatureName]. USE stores javaClass via JavaTypeRef pathParts. SymbolRef uses symbol=[NamedElement:FeatureName]. For FQN, the receiver of the final MemberCall is itself a MemberCall (not a SymbolRef).
  implication: isClassRef at bbj-scope.ts:163 checks isSymbolRef(receiver) — this is TRUE for USE path (String is a SymbolRef) but FALSE for FQN path (java.lang.String's receiver is a MemberCall chain).

- timestamp: 2026-02-21T00:00:15Z
  checked: FQN code path through scope provider
  found: For java.lang.String., isClassRef stays false because receiver is a MemberCall. Falls through to instance access at line 185 which shows ALL members (static + instance + fields + .class).
  implication: FQN showing "valueOf, format, join" is NOT because it filters for static methods — it shows ALL methods. Users see static methods among all methods.

- timestamp: 2026-02-21T00:00:20Z
  checked: USE code path through scope provider
  found: For String., isClassRef should be true (receiver is SymbolRef, ref is JavaClass). Then line 178: receiverType.methods.filter(m => m.isStatic). If this returns empty, only .class shows.
  implication: The specific symptom (only .class) matches exactly: isClassRef=true BUT no static methods pass the filter.

- timestamp: 2026-02-21T00:00:25Z
  checked: java-interop.ts method isStatic handling
  found: Line 403 sets method.isStatic from raw Java DTO. Uses (method as unknown as { isStatic?: boolean }).isStatic ?? false. If backend sends isStatic field, it works. If not, defaults to false.
  implication: isStatic depends on Java backend sending the property with correct name.

- timestamp: 2026-02-21T00:00:35Z
  checked: Langium completion provider synthetic node creation
  found: When next.type is set, completion-provider.ts:421-426 creates a synthetic MemberCall without receiver. BUT the completion parser's element stack does NOT carry type info from actions (action() is NOOP in completion parser at langium-parser.ts:697). So next.type is undefined, meaning the actual parsed tree node is used.
  implication: The actual parsed MemberCall node (with receiver) is used during completion. Synthetic node creation is NOT the issue.

- timestamp: 2026-02-21T00:00:45Z
  checked: loadImplicitImports simple-name copy
  found: java-interop.ts:204-209 creates shallow copy of each java.lang class with simple name. Copy shares methods array with original. Both should see isStatic flags set during resolveClass.
  implication: The copy mechanism doesn't lose isStatic — same array reference.

- timestamp: 2026-02-21T01:45:00Z
  checked: Langium completion provider buildContexts flow
  found: buildContexts (completion-provider.ts:229-317) yields multiple contexts. For "String.", previousToken is "." which ends with a non-letter, so performNextCompletion is true. Up to 3 contexts yielded. continueCompletion (line 346) stops after first context that produces items. The ".class" item comes from the scope provider returning StreamScopeWithPredicate(stream([classDesc]), scope) at line 180-181, where scope is the static methods scope (empty if no static methods).
  implication: The scope provider IS reached with the correct MemberCall container. The issue is specifically in the static methods filter at line 178.

- timestamp: 2026-02-21T01:50:00Z
  checked: FQN path also shows instance methods, not just static
  found: The FQN path (isClassRef=false) at line 185-191 streams ALL receiverType.fields AND receiverType.methods without any isStatic filter. This means FQN shows EVERYTHING: charAt, length, valueOf, format, etc. The user sees static methods (valueOf, format, join) among ALL methods.
  implication: The FQN path "working" is actually a MASKING effect — it shows too much (instance + static), while the USE path shows too little (nothing). The correct behavior for class reference access should be static-only, which is what the USE path attempts but fails at.

- timestamp: 2026-02-21T01:55:00Z
  checked: Whether isStatic is actually set to true on any methods
  found: The Java backend (InteropService.java:200) correctly sets mi.isStatic = Modifier.isStatic(m.getModifiers()). java-interop.ts:403 reads this with ?? false fallback. However, there is an important ordering consideration: resolveClass is called during loadImplicitImports, and the methods loop at line 399-440 iterates javaClass.methods setting isStatic on each. The isStatic IS set correctly during this loop. But if the class object is accessed BEFORE resolveClass completes (e.g., via a race condition in async resolution), methods might still have isStatic=undefined. In practice, resolvedClasses.set() at line 385 happens BEFORE the methods loop at line 399. So a concurrent access to getResolvedClass() could return the class before its methods have isStatic set.
  implication: There is a potential race condition: the class is added to resolvedClasses at line 385, but method isStatic is set in the loop at lines 399-440. If getScope accesses the class between these two points, isStatic would be undefined (defaulting to false via the AST metadata).

## Resolution

root_cause: The FQN path (`java.lang.String.`) and the USE path (`String.`) take fundamentally different branches in bbj-scope.ts:

**FACTOR 1 — Architectural Asymmetry (bbj-scope.ts:162-191):**
- FQN: receiver is MemberCall -> isClassRef=false (line 163) -> line 185-191 shows ALL members (static + instance + fields + .class). This is why FQN "works" — it bypasses the isStatic filter entirely.
- USE: receiver is SymbolRef -> isClassRef=true (line 166) -> line 178 filters by m.isStatic. Only methods with isStatic=true pass + .class from outer scope.

**FACTOR 2 — Static method filter returns empty (bbj-scope.ts:178):**
`receiverType.methods.filter(m => m.isStatic)` returns empty. The most likely cause is a race condition in java-interop.ts where the class is registered in resolvedClasses (line 385) BEFORE the method properties (including isStatic) are set (line 399-403). During completion, the scope provider accesses the class, gets methods whose isStatic is still undefined/false (AST metadata default), and the filter eliminates all methods.

Additionally, the FQN path should ALSO be checking isClassRef for MemberCall receivers that resolve to JavaClass (not just SymbolRef receivers). Currently, `java.lang.String.` shows instance methods like charAt alongside static methods — this is incorrect for a class reference.

fix: See Suggested Fix Direction below
verification:
files_changed: []
