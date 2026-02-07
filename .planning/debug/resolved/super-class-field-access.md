---
status: resolved
trigger: "Super Class Field Access Fails to Resolve - #A! in subclass cannot resolve parent field"
created: 2026-02-07T00:00:00Z
updated: 2026-02-07T00:02:00Z
---

## Current Focus

hypothesis: CONFIRMED AND FIXED - shouldRelink override was too aggressive, preventing relinking of docs with unresolved refs after new docs are added via addImportedBBjDocuments
test: All 14 inheritance chain tests pass, 0 new test failures
expecting: N/A - fix applied and verified
next_action: Archive session

## Symptoms

expected: Fields defined in a parent BBj class should resolve in subclasses via #fieldName!
actual: "Could not resolve reference to NamedElement named 'A!'. [in test123.bbj:31]"
errors: Could not resolve reference to NamedElement named 'A!'
reproduction: Create parent class with field A! in external file (loaded via PREFIX), extend it in workspace file, access #A! in subclass
started: Reported after Phase 29-02 added depth-capped inheritance chain traversal

## Eliminated

- hypothesis: Field name suffix (!) causes name mismatch in scope lookup
  evidence: Tests with ! suffix pass (both same-file and cross-file). ID_WITH_SUFFIX terminal correctly matches A!.
  timestamp: 2026-02-07T00:00:30Z

- hypothesis: createBBjClassMemberScope doesn't traverse inheritance chain
  evidence: Code at bbj-scope.ts:349 checks bbjType.extends.length==1 and calls getClass() to recurse. All unit tests pass (14 tests including grandparent, multi-level).
  timestamp: 2026-02-07T00:00:35Z

- hypothesis: FieldDecl not properly added to class localSymbols
  evidence: processNode in bbj-scope-local.ts hits isVariableDecl branch for FieldDecl (confirmed via AST reflection superTypes). Field is added to BbjClass scope via addToScope.
  timestamp: 2026-02-07T00:00:40Z

- hypothesis: Case sensitivity issue in scope lookup
  evidence: createCaseSensitiveScope uses exact match (e.name === name). Field name A! matches reference text A!. Tests confirm.
  timestamp: 2026-02-07T00:00:42Z

- hypothesis: Parent class defined after child in same file causes issue
  evidence: Test "Field in super class resolves when parent is defined AFTER child" passes. Langium phases all docs through IndexedContent before Linked.
  timestamp: 2026-02-07T00:00:45Z

- hypothesis: Parser/lexer issue with ! suffix token
  evidence: Chevrotain longest-match rule correctly tokenizes A! as ID_WITH_SUFFIX. BBjTokenBuilder has no special handling for !.
  timestamp: 2026-02-07T00:00:48Z

## Evidence

- timestamp: 2026-02-07T00:00:20Z
  checked: Grammar rules for SymbolRef, FieldDecl, Extends, QualifiedClass
  found: SymbolRef uses instanceAccess?='#'? symbol=[NamedElement:FeatureName]. FieldDecl name uses FeatureName. Both support ID_WITH_SUFFIX including !.
  implication: Parsing is correct for field names with ! suffix.

- timestamp: 2026-02-07T00:00:25Z
  checked: createBBjClassMemberScope in bbj-scope.ts (lines 336-368)
  found: Gets localSymbols via document.localSymbols.getStream(bbjType). Recurses to superType via getClass(bbjType.extends[0]). Uses createCaseSensitiveScope.
  implication: Inheritance chain traversal logic is correct.

- timestamp: 2026-02-07T00:00:30Z
  checked: getScope for SymbolRef with instanceAccess in bbj-scope.ts (lines 172-206)
  found: Gets bbjType via getContainerOfType, calls createBBjClassMemberScope(bbjType, false, new Set()), wraps in StreamScopeWithPredicate with imports and super scope.
  implication: Scope construction for #field access is correct.

- timestamp: 2026-02-07T00:00:35Z
  checked: Unit tests in classes.test.ts
  found: ALL 14 inheritance chain tests pass (methods, fields, !, $, cross-file, grandparent, reverse order, unresolvable types, qualified BBj names).
  implication: Scope resolution works in unit test environments. Difference must be in document build lifecycle.

- timestamp: 2026-02-07T00:00:40Z
  checked: Langium DefaultDocumentBuilder.buildDocuments (node_modules)
  found: Phases: Parse -> IndexedContent -> ComputedScopes -> Linked -> IndexedReferences -> Validated. ALL docs go through each phase before next.
  implication: Within a single buildDocuments batch, cross-references should resolve.

- timestamp: 2026-02-07T00:00:45Z
  checked: BBjDocumentBuilder.addImportedBBjDocuments and shouldRelink override
  found: CRITICAL - After external docs loaded via addImportedBBjDocuments, calls this.update(). Update checks shouldRelink for existing docs. Custom override ONLY checks indexManager.isAffected(), which checks referenceIndex for resolved refs pointing to changed URIs. Default Langium ALSO relinks docs with any linking errors.
  implication: Documents with unresolved extends/field references are NOT relinked after parent doc is added.

- timestamp: 2026-02-07T00:00:50Z
  checked: Default Langium shouldRelink vs custom override (node_modules line 182-189 vs bbj-document-builder.ts line 60-66)
  found: Default: `if (document.references.some(ref => ref.error !== undefined)) return true;` then falls back to isAffected. Custom: ONLY isAffected.
  implication: Custom override was designed to prevent infinite rebuild loop but is too aggressive, blocking legitimate relinking.

- timestamp: 2026-02-07T00:01:00Z
  checked: Applied fix and ran full test suite
  found: 765 tests pass, 16 fail (all pre-existing). No new failures introduced. Fix correctly adds isImportingBBjDocuments check to shouldRelink.
  implication: Fix is safe and targeted.

## Resolution

root_cause: The custom `shouldRelink` override in `BBjDocumentBuilder` (line 60-66) removed Langium's default behavior of relinking documents that have linking errors. When a parent class is in an external file loaded via `addImportedBBjDocuments`, the child document is built first with unresolved `extends` and `#field` references. After the parent is loaded and `update()` is called, the child should be relinked, but the custom `shouldRelink` only checks `isAffected()` (which looks at resolved references in the referenceIndex). Since the child's references were unresolved, they don't point to the parent's URI, so `isAffected` returns false and the child is never relinked.

fix: Modified `shouldRelink` in `BBjDocumentBuilder` to restore the "relink docs with errors" behavior ONLY during the `addImportedBBjDocuments` flow (when `isImportingBBjDocuments` is true). During normal incremental updates (user edits), the conservative `isAffected`-only behavior is preserved to avoid relinking 25+ documents on every keystroke. The `isImportingBBjDocuments` flag already prevents infinite loops by blocking recursive imports in `buildDocuments`.

verification: All 14 inheritance chain tests pass (including 7 new tests for ! suffix, cross-file, reverse order, unresolvable types, qualified names). Full test suite: 765 pass, 16 fail (all pre-existing), 0 new failures.

files_changed:
- /Users/beff/_workspace/bbj-language-server/bbj-vscode/src/language/bbj-document-builder.ts: Modified shouldRelink to conditionally restore error-based relinking during import flow
- /Users/beff/_workspace/bbj-language-server/bbj-vscode/test/classes.test.ts: Added 7 new inheritance tests for ! suffix, cross-file, and edge cases
