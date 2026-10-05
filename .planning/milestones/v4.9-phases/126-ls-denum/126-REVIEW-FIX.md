---
phase: 126-ls-denum
fixed_at: 2026-10-03T08:06:00Z
review_path: .planning/phases/126-ls-denum/126-REVIEW.md
iteration: 1
findings_in_scope: 6
fixed: 5
skipped: 1
status: partial
---

# Phase 126: Code Review Fix Report

**Fixed at:** 2026-10-03
**Source review:** .planning/phases/126-ls-denum/126-REVIEW.md (gap-closure re-review; the earlier whole-phase fix report stays in git history)
**Iteration:** 1

**Summary:**
- Findings in scope: 6 (fix_scope: all)
- Fixed: 5
- Skipped: 1

**Verification ran in the isolated worktree**, not the main checkout. The worktree had no `node_modules`, so a plain symlink to the main checkout's `bbj-vscode/node_modules` was placed in it and unlinked (`unlink`, no recursive remove) before the worktree was removed. The gitignored `src/language/generated/*.ts` files were copied from the main checkout, because `langium:generate` does not run under the host's Node 24. The results below are reproducible from the main checkout, which now holds the same commits (fast-forwarded).

- `npm run lint`: clean (`--max-warnings 0`)
- `npm run typecheck:test`: clean
- `npm run build`: passes
- `npx vitest run test/activation-command-coverage.test.ts test/bbj-denum-offer.test.ts test/denum-diagnostics-output.test.ts test/extension-activation.test.ts`: 4 files, 138 tests passed
- `npx vitest run denum format --maxWorkers=2` (every denumber and formatter test file, 17 files): 404 tests passed
- Diff register check: no planning ids in the added source or test lines.
- The IntelliJ `ComposerRequestContractTest` was not run: no language-server request or notification handler path was touched, only the VS Code client handler and the server's debug logging.

## Fixed Issues

### WR-01: Show opens an empty Problems view once the user has edited the document

**Files modified:** `bbj-vscode/src/extension.ts`, `bbj-vscode/test/extension-activation.test.ts`
**Commit:** 9af8b30b
**Applied fix:** Instead of the suggested `collection.forEach` probe (the diagnostic collection is not needed for this, and the test mock has no `forEach`), the handler keeps a set of the document uris that hold problems, maintained by one `clearProblems` helper used by the replace-with-nothing path, the content-change listener and the close listener. The reveal handler opens the Problems view while the set is non-empty and otherwise calls `outputChannel.show(true)`, so the log copy stays reachable. The reveal tests were reworked: with nothing placed Show reveals the channel; with problems placed it opens the Problems view; after a content change or a close it reveals the channel; with a second document still holding problems it still opens the Problems view.

### IN-01: Uri matching is a silent no-op on any string mismatch

**Files modified:** `bbj-vscode/src/extension.ts`, `bbj-vscode/test/extension-activation.test.ts`
**Commit:** 7d8e8c19
**Applied fix:** The payload uri is normalised with `vscode.Uri.parse(uri).toString()` before the comparison (compared only, never opened). The `vscode` test mock gained a `Uri.parse` that mimics the editor's encoded drive-letter spelling, and a new test places problems when the payload spells `c:` and the editor spells `c%3A`. I did not add the "debug line on a miss" alternative: a miss is the normal case for a document the user closed, so it would be noise, and existing tests assert the channel gets no debug entries in the normal path.

### IN-02: Silent `catch {}` around `placeProblems` and the offer hides programmer errors

**Files modified:** `bbj-vscode/src/extension.ts`, `bbj-vscode/src/language/bbj-format-service.ts`, `bbj-vscode/test/extension-activation.test.ts`, `bbj-vscode/test/bbj-denum-offer.test.ts`
**Commit:** c1203bea
**Applied fix:** The placement catch now writes `outputChannel.debug('denumber problems not placed')` and the offer catch writes `Format notice: <kind> not offered (offer failed)` through the logger. Both are fixed tokens; neither includes the payload or the error text. The redundant `try` in `offerDenum` was kept rather than dropped, because it also covers the lazy `BBjDenumService` lookup, which `offer`'s own try does not. The `appendLine` catch stays silent on purpose: it exists because the channel write itself failed, so writing a trace to the same channel gains nothing. Two tests assert the trace and that a secret marker in the thrown error never reaches any log level.

### IN-03: Problems are capped at 500 while the log copy and the summary count are not

**Files modified:** `bbj-vscode/src/denum-diagnostics-output.ts`, `bbj-vscode/test/denum-diagnostics-output.test.ts`
**Commit:** deb61357
**Applied fix:** Took the first option: when valid entries are left out by the 500 bound, `denumProblems` appends one final information problem on the first line, "N more diagnostic(s) not shown here, see the BBj output". Invalid entries are not counted. The log block stays whole, which is why the message points at it, and the doc comments on `MAX_DENUM_PROBLEMS` and `denumProblems` say so. The cap test now expects 501 results with the notice last, and a new test covers the singular and plural wording, the invalid entries and a list within the bound.

### IN-04: Duplicated uri extraction

**Files modified:** `bbj-vscode/src/denum-diagnostics-output.ts`
**Commit:** 0a7a94b8
**Applied fix:** `formatDenumDiagnosticsBlock` now calls `denumPayloadUri(params)`. Behaviour is unchanged and the existing tests cover it.

## Skipped Issues

### WR-02: Problems are placed by line number with no binding to the text version they describe

**File:** `bbj-vscode/src/extension.ts:652-679` (`placeProblems`); payload `bbj-vscode/src/language/denum-notifications.ts:34-51`
**Reason:** No sound client-only mitigation exists, and the sound fix changes the wire contract. The client cannot tell a keystroke that arrived between the applied edit and the notification from the denumber edit's own change event, and it has no version to compare against; any heuristic (line text, line count) would be a guess. The real fix adds a document version to the `bbj/denumDiagnostics` payload. That is a server-to-client protocol change that also reaches the IntelliJ consumer and possibly bbj-ls (sibling repo, out of scope), so it was left for a deliberate design decision rather than made here. The window is small and the effect is bounded: the misplaced problems clear on the next edit or close.
**Original issue:** The payload carries a uri and lines but no document version, so a keystroke landing between the applied edit and the handled notification leaves problems attached to lines of text that have moved.

---

_Fixed: 2026-10-03_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
