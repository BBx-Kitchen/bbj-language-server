---
status: resolved
trigger: "DEF FN Parameter Completion Shows Wrong Names - _f$ shows as _f, parameters leak outside FN body"
created: 2026-02-07T00:00:00Z
updated: 2026-02-07T00:01:00Z
---

## Current Focus

hypothesis: REFUTED -- Both reported bugs do not reproduce in tests. Code is correct.
test: Wrote 7 completion and scoping tests covering all scenarios
expecting: Tests would fail if bugs existed
next_action: Document findings and add regression tests

## Symptoms

expected: Parameters show with full names (_f$, _t$) and only appear inside FN body
actual: Parameters show as _f and _t (missing $ suffix), and appear outside FN body too
errors: None (functional bug, not crash)
reproduction: Open file with `def fnIsText(_f$,_t$)`, trigger completion inside and outside FN body
started: Phase 29 added DEF FN parameter scoping

## Eliminated

- hypothesis: "FunctionParameter grammar rule loses $ suffix from name"
  evidence: Parser test shows param[0].name="_f$", param[1].name="_t$" -- $ suffix preserved
  timestamp: 2026-02-07T00:00:30Z

- hypothesis: "processNode adds parameters to wrong scope (container instead of DefFunction)"
  evidence: isDefFunction branch at line 103 correctly does addToScope(scopes, node, description) where node=DefFunction. Completion test outside FN body returns zero parameter items.
  timestamp: 2026-02-07T00:00:40Z

- hypothesis: "createDescription strips $ from parameter names"
  evidence: BBjAstNodeDescriptionProvider.createDescription passes through to super for NamedElement type (default case). The name argument is param.name which is "_f$". Completion items have label="_f$".
  timestamp: 2026-02-07T00:00:45Z

- hypothesis: "Completion provider transforms or truncates names with $"
  evidence: BBjCompletionProvider.createReferenceCompletionItem only modifies FunctionNodeDescription, LibSymbolicLabelDecl, and LibEventType items. NamedElement params pass through unchanged. Test confirms label="_f$".
  timestamp: 2026-02-07T00:00:50Z

- hypothesis: "Parameters leak because FunctionParameter nodes are also processed by else branch"
  evidence: While FunctionParameter nodes ARE processed by else branch (they are NamedElement $type), the else branch adds to node.$container which IS the DefFunction. So they're scoped to the same DefFunction node. Completion outside FN body shows zero leak items.
  timestamp: 2026-02-07T00:00:55Z

## Evidence

- timestamp: 2026-02-07T00:00:20Z
  checked: Grammar rule FunctionParameter and terminal ID_WITH_SUFFIX
  found: FunctionParameter returns NamedElement with name=FeatureName. FeatureName is ID | ID_WITH_SUFFIX. ID_WITH_SUFFIX regex is /[_a-zA-Z][\w_]*(!|\$|%)/ which captures the $ suffix.
  implication: Parser correctly captures $ in parameter names

- timestamp: 2026-02-07T00:00:30Z
  checked: Parsed AST for `DEF fnIsText(_f$,_t$)` via parser test
  found: param[0] $type=NamedElement name="_f$", param[1] $type=NamedElement name="_t$"
  implication: AST correctly stores full parameter names including $ suffix

- timestamp: 2026-02-07T00:00:40Z
  checked: Completion output inside DEF FN body via expectCompletion test
  found: Items with label "_f$" and "_t$" present. No items with label "_f" or "_t" (without $).
  implication: Completion correctly shows full parameter names

- timestamp: 2026-02-07T00:00:45Z
  checked: Completion output OUTSIDE DEF FN body
  found: Zero items containing "_f" or "_t" in any form
  implication: Parameters correctly scoped to DefFunction, no leaking

- timestamp: 2026-02-07T00:00:50Z
  checked: Completion for single-line DEF FN and DEF FN inside class method
  found: Both scenarios correctly show _f$ and _t$ with no leaking
  implication: All DEF FN variants work correctly

- timestamp: 2026-02-07T00:00:55Z
  checked: Duplicate parameter entries in scope
  found: Despite FunctionParameter being processed both by isDefFunction and else branches, completion shows exactly 1 entry per parameter (no duplicates)
  implication: No practical impact from dual processing

- timestamp: 2026-02-07T00:01:00Z
  checked: Scope resolution chain via DefaultScopeProvider.getScope()
  found: Walks container chain: Statement -> DefFunction -> Program. Parameters scoped to DefFunction ARE visible inside body. Outside body, DefFunction is NOT in container chain, so params are invisible.
  implication: Langium's scope chain correctly isolates DEF FN parameters

## Resolution

root_cause: REPORTED BUGS DO NOT REPRODUCE. The code is correct:
  1. Parameter names preserve $ suffix through grammar -> AST -> scope -> completion pipeline
  2. Parameters are correctly scoped to DefFunction node and do not leak to enclosing scope
  3. The FunctionParameter grammar rule uses name=FeatureName which includes ID_WITH_SUFFIX terminal
  4. processNode in bbj-scope-local.ts correctly adds params to DefFunction scope (line 103)

  Minor code quality finding: FunctionParameter nodes ($type=NamedElement) are processed TWICE --
  once explicitly in isDefFunction branch and once via else branch fallthrough. This is harmless
  (same scope, same name) but is slightly wasteful.

  Possible explanations for user-reported symptoms:
  - VS Code word-based suggestions may interleave with LSP suggestions (VS Code splits on $)
  - The issue may have been fixed in a prior commit and not noticed
  - The issue may only manifest with a specific file/workspace configuration not covered by tests

fix: Added 6 regression tests to bbj-vscode/test/completion-test.test.ts covering:
  - DEF FN params show with $ suffix inside multi-line body
  - DEF FN params do not leak outside FN body
  - DEF FN params not duplicated in completion
  - DEF FN params with $ suffix inside class method
  - DEF FN single-line params show with $ suffix

verification: All 7 completion tests pass (6 new + 1 existing). All 29 variable-scoping tests pass.
files_changed:
  - bbj-vscode/test/completion-test.test.ts (added 6 regression tests)
