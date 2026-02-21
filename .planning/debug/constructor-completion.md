---
status: diagnosed
trigger: "constructor completion doesn't work after new ClassName("
created: 2026-02-21T06:40:00Z
updated: 2026-02-21T07:00:00Z
---

## Current Focus

hypothesis: TWO root causes: (1) '(' not a trigger character so completion never auto-fires, (2) getConstructorCompletion() silently fails and falls through to slow default completion
test: traced code path, grammar, CST structure, scope/linking lifecycle
expecting: both issues confirmed
next_action: report diagnosis

## Symptoms

expected: Constructor signatures appear as completion items after typing `new java.util.HashMap(`
actual: No constructor items appear; only generic VSCode context completions after long loading
errors: none visible
reproduction: Type `new java.util.HashMap(` in a BBj file, wait for completion
started: Feature just added (commit bb9aef6, 2026-02-20) - may never have worked in practice

## Eliminated

- hypothesis: findLeafNodeAtOffset fails to find a node inside ConstructorCall
  evidence: traced CST structure -- '(' and ')' tokens both have astNode that walks up to ConstructorCall via data type rule chain (RPAREN_NO_NL -> RPAREN -> ConstructorCall)
  timestamp: 2026-02-21T06:50:00Z

- hypothesis: isConstructorCall type guard fails due to $type mismatch
  evidence: ConstructorCall.$type is 'ConstructorCall' (string); RPAREN/RPAREN_NO_NL are data type rules that don't change $type at runtime; reflection.isInstance correctly checks isSubtype
  timestamp: 2026-02-21T06:52:00Z

- hypothesis: parser error recovery fails to create ConstructorCall node
  evidence: Chevrotain recoveryEnabled=true in parser config; grammar structure (ConstructorCall rule) supports error recovery by inserting virtual RPAREN
  timestamp: 2026-02-21T06:55:00Z

## Evidence

- timestamp: 2026-02-21T06:40:00Z
  checked: grammar rule for ConstructorCall (bbj.langium line 841-847)
  found: Rule is 'new' klass=QualifiedClass ('(' args? RPAREN | '[' args? ']')
  implication: Parser with error recovery should create ConstructorCall even without closing paren

- timestamp: 2026-02-21T06:42:00Z
  checked: completionOptions (line 13-15 of bbj-completion-provider.ts)
  found: triggerCharacters = ['#'] -- only # triggers completion automatically
  implication: '(' does NOT auto-trigger completion -- user must press Ctrl+Space

- timestamp: 2026-02-21T06:44:00Z
  checked: getCompletion() override flow (lines 21-31)
  found: getConstructorCompletion() called before super.getCompletion(); if it returns undefined, falls through to default Langium completion which is slow
  implication: Any failure in getConstructorCompletion causes long wait from default provider

- timestamp: 2026-02-21T06:46:00Z
  checked: CST node builder (cst-node-builder.js lines 97-103)
  found: astNode getter walks up container chain for data type rules; correctly resolves to ConstructorCall
  implication: findLeafNodeAtOffset should work correctly for both '(' and ')' tokens

- timestamp: 2026-02-21T06:48:00Z
  checked: completion handler required state (language-server.js line 287)
  found: requiredState = DocumentState.Linked (state 4); scope computation (state 3) runs first
  implication: Java class references should be resolved by completion time

- timestamp: 2026-02-21T06:50:00Z
  checked: scope computation for JavaTypeRef (bbj-scope-local.ts line 178-181)
  found: tryResolveJavaReference() called during scope computation, awaited before linking
  implication: Java classes referenced by FQN should be loaded and available for getClass()

- timestamp: 2026-02-21T06:52:00Z
  checked: existing completion test (completion-test.test.ts line 134-162)
  found: test uses `new MyWidget(<|>)` WITH closing paren; assertion only checks items >= 0 (always passes)
  implication: test is a smoke test that doesn't verify constructor items actually appear

- timestamp: 2026-02-21T06:55:00Z
  checked: test module HashMap definition (bbj-test-module.ts line 95-117)
  found: createHashMapClass does NOT set constructors property; constructors would be undefined
  implication: getConstructorCompletion() returns undefined for HashMap in tests (empty constructors)

## Resolution

root_cause: |
  TWO root causes work together to prevent constructor completion:

  ROOT CAUSE 1 -- '(' not registered as trigger character (line 14, bbj-completion-provider.ts):
  completionOptions.triggerCharacters = ['#'] does not include '('.
  When user types '(' after 'new ClassName', VSCode does not automatically send a
  completion request to the language server. The user must manually press Ctrl+Space.

  ROOT CAUSE 2 -- getConstructorCompletion() returns undefined, falling through to slow
  default completion (line 26-30, bbj-completion-provider.ts):
  When getConstructorCompletion() returns undefined for ANY reason (class not resolved,
  no constructors, etc.), the method falls through to super.getCompletion() which runs
  Langium's full completion engine. This is expensive and slow, explaining the "long
  loading wait". The default completion produces keyword/variable suggestions, not
  constructor signatures.

  CONTRIBUTING FACTOR -- Silent failure with no diagnostics:
  getConstructorCompletion() has 4 early-return points (lines 79, 82, 86, 90, 134)
  that all return undefined with no logging. When something goes wrong (e.g., class
  not found, klass unresolved), there is no way to diagnose which exit point triggered.

fix:
verification:
files_changed: []
