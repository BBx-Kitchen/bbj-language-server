---
phase: 261008-ayg-relink-documents-whose-unresolved-refere
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - bbj-vscode/src/language/bbj-document-builder.ts
  - bbj-vscode/src/language/bbj-index-manager.ts
  - bbj-vscode/src/language/bbj-scope.ts
  - bbj-vscode/test/relink-late-use-target.test.ts
  - bbj-vscode/test/document-builder-rebuild-guard.test.ts
autonomous: true
requirements: [AYG-R1, AYG-R2, AYG-R3, AYG-R4]

estimate:
  tokens: 100000
  raw_tokens: 100000
  tasks: 3
  confidence: low

must_haves:
  truths:
    - "A program built while the file named by its USE was not yet indexed links cleanly once that file is added: the USE reference, the bare class-name SymbolRef and the static member call all resolve, with no linking warning left (AYG-R1)"
    - "That relinked program is revalidated in the same update, so its Validated document phase fires and Langium republishes its cleared diagnostics (AYG-R1)"
    - "A USE target that first exists without the class and later gains it relinks the program too, and so does an inline file-qualified class reference such as a DECLARE of a ::path::Class type (AYG-R2)"
    - "A document with unresolved references that names neither the changed file in a USE nor in a ::path:: reference is still not relinked or revalidated when another file changes; all existing rebuild-guard assertions pass unchanged (AYG-R3)"
    - "The fix was proven by a test that failed on the unfixed code, and the SUMMARY explains the line-2 observation and the candidate-path choice that stays correct after the working-directory-first path resolution change lands (AYG-R4)"
  artifacts:
    - path: "bbj-vscode/src/language/bbj-document-builder.ts"
      provides: "shouldRelink relinks a document with a linking error when a file it names in a USE or a ::path:: reference is among the changed URIs"
    - path: "bbj-vscode/src/language/bbj-index-manager.ts"
      provides: "exported pathKeyOf, the single normalized case-insensitive path key"
    - path: "bbj-vscode/src/language/bbj-scope.ts"
      provides: "exported BBjClassNamePattern for the ::path::Class reference form"
    - path: "bbj-vscode/test/relink-late-use-target.test.ts"
      provides: "hermetic end-to-end regression: late-indexed USE target, empty-then-class target, inline DECLARE target, unrelated document untouched"
    - path: "bbj-vscode/test/document-builder-rebuild-guard.test.ts"
      provides: "unit-level shouldRelink assertions for the new trigger next to the existing guards"
  key_links:
    - from: "BBjDocumentBuilder.shouldRelink"
      to: "pathKeyOf / containedPrefixCandidates / BBjWorkspaceManager.getWorkspaceFolderUris"
      via: "candidate locations of each named file compared against the changed URIs' path keys"
    - from: "BBjDocumentBuilder.shouldRelink"
      to: "collectAllUseStatements (the same USE list importedBBjClasses reads)"
      via: "USE file paths of the document's program"
    - from: "relink-late-use-target.test.ts"
      to: "DocumentBuilder.update + onDocumentPhase(DocumentState.Validated)"
      via: "in-memory FileSystemProvider; the Validated listener is the same hook Langium's diagnostics handler publishes from"
---

<objective>
Relink and revalidate a BBj document whose unresolved references can now resolve because a file it names in a USE (or in an inline `::path::Class` reference) was added or changed after the document was linked.

Purpose: the user saw "Could not resolve reference to NamedElement named 'OtherClass'" and "... named 'sayHello'" on `OtherClass.sayHello()` in an open program. Developer: Reload Window cleared them, and a full workspace build links the same files cleanly. The program was linked before `OtherClass.bbj` was indexed and was never relinked. Langium 4.3.1's default `shouldRelink` (node_modules/langium/lib/workspace/document-builder.js, around line 190) relinks any document that has a linking error. `BBjDocumentBuilder.shouldRelink` (bbj-document-builder.ts, around line 1114) narrows that to `indexManager.isAffected` outside the import flow, to avoid relinking many error-carrying documents on every keystroke. A document whose USE target did not resolve has no resolved dependency on that target, so `isAffected` never fires for it, and its stale linking errors and published diagnostics stay.

Output: a file-path relink trigger in `shouldRelink`, hermetic regression tests, and a SUMMARY that explains the root cause, the line-2 observation and the trigger choice.
</objective>

<execution_context>
@~/.claude-shared/dot-claude/gsd-core/workflows/execute-plan.md
@~/.claude-shared/dot-claude/gsd-core/templates/summary.md
</execution_context>

<context>
@/home/coder/repos/bbj-language-server/CLAUDE.md
@/home/coder/repos/bbj-language-server/.planning/STATE.md

Source files (read only the ranges named in each task's read_first):
- bbj-vscode/src/language/bbj-document-builder.ts: the `shouldRelink` override around lines 1099-1128; `addImportedBBjDocuments` around lines 1130-1229 (the import flow and its `isImportingBBjDocuments` flag); `buildDocuments` around lines 409-433; imports at lines 1-17 (already imports `isUse`, `UriUtils`, `URI`, `AstUtils`, `BBjPathPattern`, `containedPrefixCandidates`, `normalize`, `JavaSyntheticDocUri`, `BBjWorkspaceManager`)
- bbj-vscode/src/language/bbj-index-manager.ts: module-private `pathKeyOf` (line 13), `isAffected` (line 38), `getBBjClassesForFiles` (line 99)
- bbj-vscode/src/language/bbj-scope.ts: module-private `BBjClassNamePattern` (line 60); `getBBjClassesFromFile` (lines 330-353, the candidate set: document dir, every workspace root, contained PREFIX candidates); `importedBBjClasses` (line 498); exported `collectAllUseStatements` (line 637)
- bbj-vscode/test/document-builder-rebuild-guard.test.ts: existing shouldRelink guard tests (must stay green unchanged)
- bbj-vscode/test/open-prefix-document.test.ts lines 47-128: `InMemoryFileSystemProvider`, `open()` and `update`-driven build helpers to copy
- bbj-vscode/test/use-project-root.test.ts lines 28-35: how a test sets the workspace folder to `/root`

Interfaces the executor needs (verified at planning time):
- `protected override shouldRelink(document: LangiumDocument, changedUris: Set<string>): boolean`. `changedUris` holds `uri.toString()` strings for changed and deleted documents. Langium calls it once per known document inside `update()` BEFORE the changed documents are re-parsed and re-indexed, so a changed file's new exports are not known yet. The trigger must therefore be path-based, not export-name-based.
- `BBjWorkspaceManager.getWorkspaceFolderUris(): URI[]`, `getSettings()?.prefixes`, `isClosedLibraryDocument(documentUri, textDocuments)`; the builder reaches the manager through `this.wsManager()` and has `this.textDocuments`.
- `containedPrefixCandidates(prefixes, path): string[]` (path-containment.ts); `UriUtils.resolvePath(base, path)`.
- Langium publishes diagnostics from `DocumentBuilder.onDocumentPhase(DocumentState.Validated, ...)` (node_modules/langium/lib/lsp/language-server.js `addDiagnosticsHandler`). A document reset to `ComputedScopes` by `shouldRelink` is relinked and revalidated in the same update, so it is republished.

Constraint from in-flight PR #741 (working directory first, then PREFIX; touches bbj-document-builder.ts around lines 13-14, 1172-1177 and 1276-1290, rewrites `getBBjClassesFromFile` in bbj-scope.ts and adds a new import line after the `path-containment.js` import in both files): do not edit `getBBjClassesFromFile`, `checkUsedClassExists`, `revalidateUseFilePathDiagnostics`, or the import lines next to the `path-containment.js` imports. Extend existing import statements instead. The relink trigger uses its own candidate superset (document dir + every workspace root + contained PREFIX candidates). Under #741 the working directory is either the deepest workspace root containing the document or the document's own dir, so the superset still covers it and needs no edit after #741 merges. A superset can only cause an extra relink, never a missed one.
</context>

<tasks>

<task type="tracer" tdd="true">
  <name>Task 1: Reproduce the stale link end-to-end, then relink on a changed USE target</name>
  <files>bbj-vscode/test/relink-late-use-target.test.ts, bbj-vscode/src/language/bbj-document-builder.ts, bbj-vscode/src/language/bbj-index-manager.ts</files>
  <read_first>
    - /home/coder/repos/bbj-language-server/bbj-vscode/src/language/bbj-document-builder.ts (lines 1-17 and 1099-1229)
    - /home/coder/repos/bbj-language-server/bbj-vscode/src/language/bbj-index-manager.ts (whole file, 123 lines)
    - /home/coder/repos/bbj-language-server/bbj-vscode/src/language/bbj-scope.ts (lines 330-353 and 498-505 and 637-657)
    - /home/coder/repos/bbj-language-server/bbj-vscode/test/open-prefix-document.test.ts (lines 1-128)
    - /home/coder/repos/bbj-language-server/bbj-vscode/test/use-project-root.test.ts (lines 28-35)
    - /home/coder/repos/bbj-language-server/bbj-vscode/node_modules/langium/lib/workspace/document-builder.js (lines 74-122 and 190-197: update() and the default shouldRelink)
  </read_first>
  <behavior>
    - Precondition (passes on the unfixed code): with /root as the workspace folder, /root/lib/SomeClass.bbj (class SomeClass with a public static void sayHello method) and /root/app/prog.bbj open in the editor, both built through DocumentBuilder.update, and no /root/lib/OtherClass.bbj yet, prog's SomeClass.sayHello() line links, and the OtherClass SymbolRef on zero-based line 5 carries a linking error
    - RED then GREEN: after /root/lib/OtherClass.bbj (class OtherClass with a public static void sayHello method) is added to the in-memory files and DocumentBuilder.update([otherUri], []) runs, every reference in prog resolves (no reference has error set, the OtherClass SymbolRef and the sayHello member are linked), prog.diagnostics holds no linking-error diagnostic and no "could not be resolved" message, and a DocumentState.Validated onDocumentPhase listener registered before that update recorded prog's uri (revalidated, so republished)
  </behavior>
  <action>
Create bbj-vscode/test/relink-late-use-target.test.ts as a hermetic test. Copy the small `InMemoryFileSystemProvider` class and the `open()` / update-driven build helper pattern from open-prefix-document.test.ts (lines 47-128). Build services with `createBBjTestServices({ fileSystemProvider: () => new InMemoryFileSystemProvider(files) })`, call `initializeWorkspace([])`, then set the workspace manager's `folders` to a single `/root` folder (the cast in use-project-root.test.ts lines 32-34) and its `settings` to `{ prefixes: [], classpath: [] }` (the cast in open-prefix-document.test.ts line 95). Set the builder's private `bbjcplAvailable` to false. Call `setCompilerTrigger('off')` in beforeEach so no compiler timers arm. In afterEach call `setCompilerTrigger('debounced')` and `clearAllVerdictStates()`, as open-prefix-document.test.ts does.

Use this layout so the USE paths resolve both under today's rules (workspace-root candidate) and under PR #741's working-directory rule: /root/lib/SomeClass.bbj, /root/lib/OtherClass.bbj, and /root/app/prog.bbj containing exactly the user's program shape: `use ::lib/SomeClass.bbj::SomeClass`, `use ::lib/OtherClass.bbj::OtherClass`, two blank lines, `SomeClass.sayHello()`, `OtherClass.sayHello()`. Open prog.bbj in TextDocuments, as the user had it open. Bring OtherClass.bbj in without opening it, the way a file created on disk reaches the server through the file watcher. Write the precondition test and the relink test described in behavior.

Run the new file on the UNFIXED code first, in the foreground. Keep the failing assertion output for the SUMMARY: the precondition must pass and the relink assertions must fail. If the precondition fails or the relink assertions already pass, stop and report: the hypothesis would be wrong. During this RED run, also record prog's zero-based line 1 state for the SUMMARY: whether the `OtherClass` USE's `bbjClass` reference carries an error, and which diagnostics sit on line 1 compared with line 5.

Then implement the trigger. In bbj-index-manager.ts, export the existing `pathKeyOf` function unchanged. In bbj-document-builder.ts, import it on a NEW import line placed directly after the existing `bbj-ws-manager.js` import (line 8), not next to the `path-containment.js` import. In `shouldRelink`, keep the import-flow branch and the `isAffected` return exactly as they are. Add one more condition, evaluated only when `isAffected` is false, through a new private method (suggested name `unresolvedFileTargetChanged(document, changedUris)`). It returns true when the document has at least one reference whose `error` is set AND one of the files its program names in a USE has a candidate location whose path key is in the changed set. Collect the USE file paths from `collectAllUseStatements(program)` when the parse root is a Program (the same list `importedBBjClasses` reads), taking capture group 1 of `BBjPathPattern` from each `bbjFilePath`. Extend the existing `./bbj-scope.js` import with `collectAllUseStatements`, and the existing `./generated/ast.js` import with `isProgram`. Candidate locations for a path are: `UriUtils.resolvePath(UriUtils.dirname(document.uri), path)`, `UriUtils.resolvePath(root, path)` for every `getWorkspaceFolderUris()` root, and `containedPrefixCandidates(prefixes, path)` mapped through `URI.file`. Get the roots and prefixes from `this.wsManager()` when it is a `BBjWorkspaceManager`; otherwise use the document-dir candidate only. Convert the changed URI strings to path keys with `URI.parse` followed by `pathKeyOf`. Re-run the file until it is green.

Shell rules: absolute paths; `git -C /home/coder/repos/bbj-language-server`; `cd` only directly before `npx vitest`; never `cd … && grep/cat/sed`; no `git stash`; no `git add -A` or `git add .`; run tests in the foreground and never wait on them with a `pgrep` loop. No planning identifiers in source or test comments or assertion messages; GitHub issue numbers are fine. Commit the test and the fix together with plain git, staging the exact paths, using a `fix(ls): ...` subject and the Co-Authored-By trailer.
  </action>
  <verify>
    <automated>cd /home/coder/repos/bbj-language-server/bbj-vscode && npx vitest run test/relink-late-use-target.test.ts test/document-builder-rebuild-guard.test.ts</automated>
  </verify>
  <done>The new test failed on the unfixed code (the failing assertions are recorded for the SUMMARY) and now passes. All five existing rebuild-guard tests pass unchanged. prog's late-indexed OtherClass USE, its bare OtherClass SymbolRef and its sayHello member all link after `update([otherUri], [])`, and prog is revalidated in that same update.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Cover file-qualified references, keep the per-keystroke guard, pin both directions</name>
  <files>bbj-vscode/src/language/bbj-document-builder.ts, bbj-vscode/src/language/bbj-scope.ts, bbj-vscode/test/relink-late-use-target.test.ts, bbj-vscode/test/document-builder-rebuild-guard.test.ts</files>
  <read_first>
    - /home/coder/repos/bbj-language-server/bbj-vscode/src/language/bbj-scope.ts (lines 55-62 and 355-365)
    - /home/coder/repos/bbj-language-server/bbj-vscode/src/language/bbj-ws-manager.ts (lines 287-330: getWorkspaceFolderUris, isClosedLibraryDocument)
    - /home/coder/repos/bbj-language-server/bbj-vscode/test/test-data/issue527-declare-file-paths.bbj (DECLARE with a ::path::Class type)
    - /home/coder/repos/bbj-language-server/bbj-vscode/test/document-builder-rebuild-guard.test.ts (whole file, 127 lines)
  </read_first>
  <behavior>
    - Empty-then-class: /root/lib/OtherClass.bbj exists from the start with no class (for example a single REM line); prog is built and its OtherClass SymbolRef carries a linking error; the file's text then becomes the class and update([otherUri], []) runs; prog then has no reference error, no linking-error diagnostic, and was revalidated
    - Inline qualified reference: /root/app/declare.bbj containing only `declare ::lib/OtherClass.bbj::OtherClass o!` (no USE) is built before OtherClass.bbj exists, and its BBjTypeRef reference (whose $refText starts with ::lib/OtherClass.bbj::) carries an error; after OtherClass.bbj is added and updated, the reference resolves and the document was revalidated
    - Untouched unrelated document: /root/app/unrelated.bbj with `use ::lib/Missing.bbj::Missing` and `y! = new Missing()` keeps its errors and is NOT recorded by the Validated listener during the OtherClass.bbj update
    - Unit level, in document-builder-rebuild-guard.test.ts against the existing `broken` fixture: shouldRelink(broken, {URI.file('/root/lib/Missing.bbj')}) is true; shouldRelink(broken, {URI.file('/root/LIB/missing.bbj')}) is true (same case-insensitive path key the BBj class index uses); shouldRelink(broken, {URI.file('/root/other/Missing.bbj')}) is false (same file name, different directory); the existing UNRELATED_URI assertion stays false
  </behavior>
  <action>
Extend the new trigger to inline file-qualified class references. In bbj-scope.ts, change only the declaration of `BBjClassNamePattern` (line 60) from a module-private const to an exported const; do not touch the import block above it. Import it into the builder by extending the existing `./bbj-scope.js` import. In the trigger, while scanning the document's references for errors, also take capture group 1 of `BBjClassNamePattern` from each erroring reference's `$refText` as a named file, and take the `bbjFilePath` of any erroring reference whose container is a `Use`. This covers a USE that `collectAllUseStatements` does not reach. Every BBj-class reference that can bind to another file's class names that file explicitly, through a USE (bare names resolve through `importedBBjClasses`) or through `::path::Class`. A file-path match is therefore complete for BBj class targets. Resolved references keep being covered by `isAffected`.

Keep the trigger cheap and in this order:
1. Skip the classpath document (`JavaSyntheticDocUri`) and the `bbjlib` scheme, as `BBjIndexManager.isAffected` does.
2. Skip a closed PREFIX library document via `isClosedLibraryDocument(document.uri, this.textDocuments)`. It is never validated, so it shows no stale diagnostics; it is linked by signature only, and the import flow already relinks it when new targets load.
3. Return false unless some reference has an error.
4. Only then compute candidate locations.

Convert the changed URI set to path keys once per update. Use a single-slot cache on the builder keyed by the identity of the `changedUris` Set: Langium passes the same Set instance for every document in one update. Never scan the index, read files or stat paths in the trigger. It compares strings only.

Rewrite the `shouldRelink` JSDoc so it states all three conditions in order: the import flow, `isAffected`, and the new file-target condition. Explain why the new condition keeps the per-keystroke intent. Typing in a document puts it in the changed set, so Langium skips it. A document whose USE of the changed file resolved is already relinked through `isAffected`. So the only documents added are those with a linking error that name the changed file and could not resolve it, which are exactly the stale ones. Also say that the candidate set is deliberately a superset of the scope provider's (document dir, every workspace root, contained PREFIX candidates), because an over-match costs one relink and an under-match leaves stale errors. No planning identifiers in comments.

Add the end-to-end cases from behavior to relink-late-use-target.test.ts, reusing Task 1's helpers. Add the unit assertions to document-builder-rebuild-guard.test.ts as a new test inside the existing describe block, without changing any existing assertion. If the DECLARE precondition shows no erroring reference with the qualified `$refText`, use `o! = new ::lib/OtherClass.bbj::OtherClass()` instead and say so in the SUMMARY.

Same shell, comment and commit rules as Task 1. Use a `fix(ls): ...` or `test(ls): ...` subject.
  </action>
  <verify>
    <automated>cd /home/coder/repos/bbj-language-server/bbj-vscode && npx vitest run test/relink-late-use-target.test.ts test/document-builder-rebuild-guard.test.ts test/use-project-root.test.ts test/open-prefix-document.test.ts test/lazy-prefix-loading.test.ts test/imports.test.ts test/extensionless-use-target.test.ts test/use-path-containment.test.ts</automated>
  </verify>
  <done>All listed suites pass. The empty-then-class, inline-DECLARE and unrelated-document cases and the four unit assertions are in place and green. The trigger skips synthetic and closed library documents, checks for an erroring reference before computing any candidate, and converts the changed set once per update. The shouldRelink JSDoc states all three conditions and the per-keystroke rationale.</done>
</task>

<task type="auto">
  <name>Task 3: Whole-suite, lint, typecheck and register gates; record root cause and limits</name>
  <files>.planning/quick/261008-ayg-relink-documents-whose-unresolved-refere/261008-ayg-SUMMARY.md</files>
  <read_first>
    - /home/coder/repos/bbj-language-server/bbj-vscode/src/language/bbj-document-validator.ts (lines 96-200: applyDiagnosticHierarchy, and lines 367-469: validateDocument verdict composition)
  </read_first>
  <action>
Run the gates in verify in the foreground: build, lint, typecheck:test, the whole vitest suite with `--maxWorkers=2` judged on `numFailedTests` equal to 0, and the register check over the added source and test lines since base commit 0902ac7f. If the whole suite reports a failing test, run that one file on base commit 0902ac7f in a scratch `git worktree` (Node 22). Diff the failing test names: only a failure that also fails on the base is pre-existing. Known environment drift: linking.test.ts interop cases, the issue447 capability test, and the installed-extension-e2e suite, which spawns the installed bundle. Fix any failure that is new. If the register check prints anything, reword those comments or messages and amend the latest commit, unless it is already pushed; this branch is not pushed by this plan.

Write the SUMMARY with:
(a) The root cause. Confirm Langium 4.3.1's default shouldRelink and the narrowing in BBjDocumentBuilder.shouldRelink, and quote the RED failure from Task 1.
(b) Why line 2 showed no diagnostic for the user. State what the RED run showed for the line-2 USE (reference error yes/no, diagnostics on line 1), and give the best-supported explanation, marking clearly what is shown by the test and what is inferred. Candidates to check by reading code only: the verdict composition and diagnostic hierarchy under the default debounced trigger hiding the USE warning while keeping the line-5 warnings, or a validation that ran without a relink while `checkUsedClassExists` read the live index. Use at most one temporary probe, delete it before committing, and make no production change for this item.
(c) The trigger's justification and the candidate superset's compatibility with PR #741.
(d) Known limit, out of scope: a member inherited from a superclass in a third file that the document does not name is still refreshed only through `isAffected`.
(e) Gate results.

Record deviations in the SUMMARY only, not in a separate ledger. Commit only if a gate fix touched files.
  </action>
  <verify>
    <automated>npm --prefix /home/coder/repos/bbj-language-server/bbj-vscode run build && npm --prefix /home/coder/repos/bbj-language-server/bbj-vscode run lint && npm --prefix /home/coder/repos/bbj-language-server/bbj-vscode run typecheck:test && rm -f /tmp/relink-suite.json && (cd /home/coder/repos/bbj-language-server/bbj-vscode && npx vitest run --maxWorkers=2 --reporter=json --outputFile=/tmp/relink-suite.json; true) && node -e "const r=require('/tmp/relink-suite.json'); console.log('numFailedTests', r.numFailedTests); process.exit(r.numFailedTests === 0 ? 0 : 1)" && ! git -C /home/coder/repos/bbj-language-server diff 0902ac7f..HEAD -- bbj-vscode/src bbj-vscode/test | grep '^+' | grep -nE '261008|AYG-R[0-9]|T-ayg|\bD-[0-9]{2}\b|quick task'</automated>
  </verify>
  <done>Build, lint and typecheck:test exit 0. The whole suite reports numFailedTests 0, or every failure is proven pre-existing on base 0902ac7f. The register check prints nothing. The SUMMARY covers the root cause with the RED evidence, the line-2 explanation, the trigger justification and #741 compatibility, the inherited-member limit, and the gate results.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| workspace file text -> language server | USE paths and `::path::Class` reference text come from user and library source files and feed the relink decision |
| file watcher / editor events -> DocumentBuilder.update | every change event runs shouldRelink once per known document |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-ayg-01 | Denial of Service | BBjDocumentBuilder.shouldRelink new trigger, run per document per update | medium | mitigate | Cheapest checks first (synthetic / bbjlib / closed library skip, then "has an erroring reference"); changed URIs converted to path keys once per update through a single-slot cache keyed by Set identity; string comparison only, no index scan, file read or stat; only documents that name the changed file and could not resolve it are added to the rebuild |
| T-ayg-02 | Tampering | candidate paths built from USE / `::path::` text | low | mitigate | PREFIX candidates come only from containedPrefixCandidates (the issue #526 containment check); every candidate is only compared against already-changed URIs and is never opened, read or stat'ed by the trigger |
| T-ayg-03 | Denial of Service | relink loop between update and buildDocuments | low | mitigate | The trigger runs only inside update() for documents outside the changed set; buildDocuments reaches update only through the existing guarded import flow, whose isImportingBBjDocuments branch and depth guard are unchanged; the rebuild-guard re-entry test stays green |
</threat_model>

<verification>
- The new regression file failed before the fix and passes after it (RED output quoted in the SUMMARY).
- The existing rebuild-guard assertions are unchanged and green: an error-carrying document that names no changed file is still not relinked.
- The related USE / PREFIX / imports suites, the whole suite (numFailedTests 0), lint, typecheck:test and build are green.
- No planning identifiers in the added source or test lines.
</verification>

<success_criteria>
- After a USE target file is indexed late (new file, or an existing file that gains the class), the program that names it links cleanly and its diagnostics are republished without a window reload.
- Inline `::path::Class` references are relinked the same way.
- Typing in one file still does not relink unrelated documents just because they have unresolved references.
- The change does not edit the code paths PR #741 rewrites and stays correct after #741 merges.
</success_criteria>

<output>
Create `/home/coder/repos/bbj-language-server/.planning/quick/261008-ayg-relink-documents-whose-unresolved-refere/261008-ayg-SUMMARY.md` when done
</output>
