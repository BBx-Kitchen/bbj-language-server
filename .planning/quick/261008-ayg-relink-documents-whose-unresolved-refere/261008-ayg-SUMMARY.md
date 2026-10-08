---
phase: 261008-ayg-relink-documents-whose-unresolved-refere
plan: 01
subsystem: language-server/document-builder
tags: [langium, relink, use, linking, diagnostics]
requires: []
provides:
  - "BBjDocumentBuilder.shouldRelink relinks a document with an unresolved reference when a file it names (USE or ::path::Class) is among the changed URIs"
affects: [bbj-vscode/src/language/bbj-document-builder.ts]
tech-stack:
  added: []
  patterns: ["path-based relink trigger evaluated before the changed documents are re-indexed"]
key-files:
  created:
    - bbj-vscode/test/relink-late-use-target.test.ts
  modified:
    - bbj-vscode/src/language/bbj-document-builder.ts
    - bbj-vscode/src/language/bbj-index-manager.ts
    - bbj-vscode/src/language/bbj-scope.ts
    - bbj-vscode/test/document-builder-rebuild-guard.test.ts
decisions:
  - "Relink trigger is path-based (candidate locations of each named file vs changed URI path keys), because shouldRelink runs before the changed files are re-parsed and re-indexed"
  - "Candidate set is a superset (document dir + every workspace root + contained PREFIX candidates) so it needs no edit when the working-directory-first resolution change lands"
metrics:
  duration: "about 15 min"
  completed: 2026-10-08
status: complete
actuals:
  tokens: 5300
  tasks: 3
  commits: 2
---

# Phase 261008-ayg Plan 01: Relink documents whose unresolved references can now resolve Summary

A program linked before the file named by its USE (or by an inline `::path::Class` reference) was indexed is now relinked and revalidated when that file is added or changed, so the stale "Could not resolve reference" warnings clear without a window reload.

## Commits

- `669de78a` fix(ls): relink a document when a file named by its unresolved USE is added or changed (trigger for USE statements, `pathKeyOf` exported, end-to-end regression for the late-indexed target, empty-then-class target, unrelated-document guard)
- `6904ccac` fix(ls): relink documents with unresolved file-qualified class references too (`BBjClassNamePattern` exported, inline `::path::Class` references, three-condition JSDoc, unit assertions in the rebuild-guard test, type fix in the new test)

Task 3 touched no production files; its only output is this SUMMARY.

## (a) Root cause

Langium 4.3.1's default `shouldRelink` (`node_modules/langium/lib/workspace/document-builder.js`) relinks every document that carries a linking error. `BBjDocumentBuilder.shouldRelink` narrows that outside the import flow to `indexManager.isAffected`, to avoid relinking every error-carrying document on each keystroke (the cascade the rebuild-guard tests pin). `isAffected` only fires for a document with a resolved dependency on a changed file. A program whose USE target was not indexed yet has no such dependency, so when the target was later added, the program was never relinked and its stale linking errors and published diagnostics stayed until a reload rebuilt everything.

RED evidence (new test on the unfixed code, precondition green, relink assertions red):

```
FAIL ... > adding the target file relinks and revalidates the program
AssertionError: expected [ 'OtherClass', 'OtherClass', 'sayHello' ] to deeply equal []
FAIL ... > gaining the class relinks and revalidates the program
AssertionError: expected [ 'OtherClass', 'OtherClass', 'sayHello' ] to deeply equal []
FAIL ... > relinks and revalidates once the named file appears
AssertionError: expected [ '::lib/OtherClass.bbj::OtherClass' ] to deeply equal []
```

The precondition test ("links against the missing class before it exists") passed on the unfixed code: `OtherClass` erroring, `SomeClass` linked. After the fix all five new cases and the existing rebuild-guard tests pass.

## (b) Why line 2 showed no diagnostic for the user

Shown by a temporary probe on the unfixed code (deleted, not committed), prog built while `OtherClass.bbj` was absent:

- Zero-based line 1 (`use ::lib/OtherClass.bbj::OtherClass`): the Use's `bbjClass` reference carries an error ("Could not resolve reference to BbjClass named 'OtherClass'"), and the only published diagnostic in the whole document is an Error on line 1: `File 'lib/OtherClass.bbj' could not be resolved. Searched: ...`. The linking warnings on lines 4 and 5 were not published.
- Reason (code reading, `bbj-document-validator.ts` `applyDiagnosticHierarchy` Rule 2): linking errors are downgraded to Warning, and any Error-severity diagnostic suppresses all warnings. `checkUsedClassExists` emits the missing-file diagnostic as an Error.

So a validation run while the file was absent would have shown the line-1 error and hidden the line-5 warnings, the opposite of what the user saw (line-5 warnings visible, nothing on line 2).

Inferred, not shown by a test: the user's state needs a validation that ran after `OtherClass.bbj` had entered `LangiumDocuments` (so `checkUsedClassExists`, which reads the live `langiumDocuments.hasDocument` and index, emitted no Error) but without a relink of the program (so its stale linking warnings survived, and Rule 2 no longer hid them). That is the same missing-relink defect seen through a validation that did run, which this change fixes at its source. No production change was made for this item.

The inline `declare ::lib/OtherClass.bbj::OtherClass o!` form worked as planned: its `BBjTypeRef` reference carries an error with a `$refText` that starts with `::lib/OtherClass.bbj::`; the `new ::path::Class()` fallback was not needed.

## (c) Trigger justification and compatibility with PR #741

Condition added in `shouldRelink`, after the unchanged import-flow branch and the unchanged `isAffected` check: relink when the document has a reference with an error and a file it names (a USE `bbjFilePath`, the `bbjFilePath` of the Use that contains an erroring reference, or the path in an erroring reference's `::path::Class` text) has a candidate location whose normalized, lowercased path key is in the changed set. Keeping the per-keystroke intent: typing puts the typed document in the changed set, so Langium skips it; a document whose USE of the changed file resolved is already relinked through `isAffected`; only documents with a linking error that name the changed file and could not resolve it are added. Cost controls: synthetic classpath and `bbjlib` documents and closed PREFIX library documents are skipped first, then "has an erroring reference", and candidates are computed only after that; changed URIs are converted to path keys once per update through a single-slot cache keyed by `Set` identity; the trigger compares strings only (no index scan, read or stat).

PR #741 compatibility: `getBBjClassesFromFile`, `checkUsedClassExists`, `revalidateUseFilePathDiagnostics` and the `path-containment.js` import lines were not edited. The trigger's candidate set (document dir, every workspace root, contained PREFIX candidates) is a superset of both the current rule and the working-directory-first rule, so it needs no edit after #741 merges; a superset can only cause an extra relink, never a missed one. `pathKeyOf` was imported on its own new line after the `bbj-ws-manager.js` import; the existing `./bbj-scope.js` and `./generated/ast.js` imports were extended.

## (d) Known limit (out of scope)

A member inherited from a superclass in a third file that the document does not name stays refreshed only through `isAffected`: if that member was unresolved and the third file later gains it, the document names neither that file in a USE nor in a `::path::` reference, so the file-path trigger does not fire.

## (e) Gate results

- `npm run build`: exit 0
- `npm run lint`: exit 0 (`--max-warnings 0`)
- `npm run typecheck:test`: exit 0 (after fixing one TS2345 in the new test: `Diagnostic.getMessageString` instead of `d.message`)
- Related suites (relink-late-use-target, document-builder-rebuild-guard, use-project-root, open-prefix-document, lazy-prefix-loading, imports, extensionless-use-target, use-path-containment): 8 files, 52 tests passed
- Whole suite `npx vitest run --maxWorkers=2`: `numFailedTests` 0 of 4680. One suite reported failed: `test/functional/installed-extension-e2e.test.ts` ("SETOPTS-in-code (#475)": `No document found for URI`). It spawns the installed extension bundle rather than this tree. Proven pre-existing: the same file run on base commit `0902ac7f` in a scratch worktree (node_modules symlinked, generated sources copied; removed afterwards) fails identically (19 passed, 15 skipped, same suite error).
- Register check over added source and test lines since `0902ac7f` (`261008`, `AYG-R`, `T-ayg`, `D-NN`, `quick task`): no matches. No closing keywords in the commit messages.

## Deviations from Plan

None - plan executed as written, with these notes:

- The new test file was authored with all cases up front; for the Task 1 commit the inline-DECLARE case was held back (it is Task 2 behavior) and restored for the Task 2 commit.
- The first draft of the test failed its own precondition because `SomeClass.bbj` was never added to the workspace; fixed in the test setup by building it first (test-only, before the RED run was recorded).
- `typecheck:test` caught a type error in the new test after the Task 2 commit; fixed in the test and amended into the Task 2 commit (unpushed).

## Known Stubs

None.

## Threat Flags

None. The trigger adds no endpoint, file access or trust boundary; candidate paths are only compared against already-changed URIs and never opened (T-ayg-01/02/03 mitigations implemented as planned).

## Self-Check: PASSED

- FOUND: bbj-vscode/test/relink-late-use-target.test.ts
- FOUND: commit 669de78a, commit 6904ccac
- Working tree clean apart from the untracked quick-task planning directory.
