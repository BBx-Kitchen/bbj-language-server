---
phase: 88-setopts-in-code-hovers-tri-state-composer
reviewed: 2026-09-11T13:22:27Z
depth: standard
files_reviewed: 46
files_reviewed_list:
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjComposeSetoptsInCodeAction.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/SetoptsInCodeActionAvailability.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/BbjComposerServer.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/BbjHexLiteral.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ComposerLauncher.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ComposerModels.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ConfigureSetoptsInCodeIntention.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/DecodeEquality.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/SetoptsTriStateComposerDialog.java
  - bbj-intellij/src/main/resources/intentionDescriptions/ConfigureSetoptsInCodeIntention/after.bbj.template
  - bbj-intellij/src/main/resources/intentionDescriptions/ConfigureSetoptsInCodeIntention/before.bbj.template
  - bbj-intellij/src/main/resources/intentionDescriptions/ConfigureSetoptsInCodeIntention/description.html
  - bbj-intellij/src/main/resources/META-INF/plugin.xml
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/actions/BbjComposeSetoptsInCodeActionSourceGuardTest.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/actions/SetoptsInCodeActionAvailabilityTest.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/BbjHexLiteralTest.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerApplyGuardSourceGuardTest.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerDialogRefreshSourceGuardTest.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerFlowTest.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerIntentionPreviewSourceGuardTest.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerLauncherChainSourceGuardTest.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerModelsJsonBoundaryTest.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerRequestContractTest.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/DecodeEqualityTest.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/SetoptsInCodeSourceGuardTest.java
  - bbj-vscode/package.json
  - bbj-vscode/src/extension.ts
  - bbj-vscode/src/language/bbj-code-action-handler.ts
  - bbj-vscode/src/language/bbj-hover.ts
  - bbj-vscode/src/language/main.ts
  - bbj-vscode/src/language/setopts-code-scanner.ts
  - bbj-vscode/src/language/setopts-in-code-request.ts
  - bbj-vscode/src/language/validations/check-function-calls.ts
  - bbj-vscode/src/setopts-catalog.ts
  - bbj-vscode/src/setopts-composer-webview.ts
  - bbj-vscode/src/setopts-in-code-ui.ts
  - bbj-vscode/src/setopts-tristate-webview.ts
  - bbj-vscode/test/bbj-code-action-handler.test.ts
  - bbj-vscode/test/functional/installed-extension-e2e.test.ts
  - bbj-vscode/test/hover.test.ts
  - bbj-vscode/test/setopts-catalog.test.ts
  - bbj-vscode/test/setopts-code-scanner.test.ts
  - bbj-vscode/test/setopts-in-code-request.test.ts
  - bbj-vscode/test/setopts-in-code-ui.test.ts
  - examples/issue475-setopts-in-code.bbj
  - QA/FULL-TEST-CHECKLIST.md
findings:
  critical: 1
  warning: 4
  info: 2
  total: 7
status: issues_found
---

# Phase 88: Code Review Report

**Reviewed:** 2026-09-11T13:22:27Z
**Depth:** standard
**Files Reviewed:** 46
**Status:** issues_found

## Summary

This phase adds SETOPTS-in-code hover decode, a document-aware `decodeInCode`/`composeTriState`
LSP request pair, a new tri-state Set/Clear/Leave composer on both IDEs, a second (non-intention)
IntelliJ entry point, and a bounded `textDocument/codeAction` handler to stop IntelliJ's shared
intention search from hanging.

The server-side scanner (`setopts-code-scanner.ts`) and the decode-gating module
(`setopts-in-code-request.ts`) are unusually well fortified: the backward chain walk fails closed
on every disqualifying shape the test suite enumerates, the edit-region computation has dedicated
regression tests for shared lines, comma-joined statements, comments and blank lines, and the
IntelliJ `StaleEditGuard` (pre-existing, reused correctly here) re-checks the document's
modification stamp immediately before every guarded write. Test coverage across both platforms is
extensive and exercises real edge cases rather than restating the happy path.

Two categories of issues remain. First, the VS Code side's new tri-state webview (and the
absolute-mode webview it also drives) has no analog of the IntelliJ `StaleEditGuard`: unlike an
IntelliJ `DialogWrapper`, the VS Code composer panel is a non-modal `ViewColumn.Beside` webview, so
a user can keep editing the source document — including inserting/deleting lines above the
captured range — for the entire time the panel is open, and `apply` blindly replaces
`[startLine, endLine)` with no re-decode or version check. Second, the chain-safety scanner's
control-flow disqualification list is incomplete (`RETURN`/`BREAK`/`STOP`/exit statements are
treated as transparent rather than disqualifying), which is a real gap against the module's own
documented "any ambiguity resolves toward unsafe" contract, even though it requires unusual code
to trigger.

## Critical Issues

### CR-01: VS Code SETOPTS-in-code composers apply edits with no re-decode/staleness guard, unlike the IntelliJ StaleEditGuard this phase's own IntelliJ side depends on

**File:** `bbj-vscode/src/setopts-tristate-webview.ts:116-134` (also affects `bbj-vscode/src/setopts-composer-webview.ts:94-117`, reused by `bbj-vscode/src/setopts-in-code-ui.ts`'s new absolute-mode branch)

**Issue:** The webview panel is created with `{ viewColumn: vscode.ViewColumn.Beside, preserveFocus: false }` — it does not block interaction with the source editor the way an IntelliJ `DialogWrapper` does. A user can keep typing in the `.bbj` file (adding/removing lines above the target, or editing the very lines the composer captured) for the whole time the panel is open. When `apply` fires:

```ts
case 'apply': {
    if (!msg.payload) break;
    const result = await compose(msg.payload);
    const text = blockInsertText(result);
    const edit = new vscode.WorkspaceEdit();
    if (target) {
        const uri = vscode.Uri.parse(target.uri);
        if (target.startLine === target.endLine) {
            edit.insert(uri, new vscode.Position(target.startLine, 0), text);
        } else {
            edit.replace(uri, new vscode.Range(target.startLine, 0, target.endLine, 0), text);
        }
    } else if (insertUri !== undefined && insertLine !== undefined) {
        edit.insert(insertUri, new vscode.Position(insertLine, 0), text);
    }
    await vscode.workspace.applyEdit(edit);
```

`target.startLine`/`target.endLine` are the line numbers captured at decode time (before the panel opened) and are never re-validated against the document's current shape or version. If the document changed underneath — even just an unrelated edit above the chain that shifted line numbers by one — this silently replaces whatever now occupies `[startLine, endLine)` with the newly composed block, deleting or corrupting code the chain never owned. This is exactly the class of bug IntelliJ's `StaleEditGuard` (`#567`) was built to close, and this phase's own `SetoptsInCodeSourceGuardTest`/`ComposerLauncherChainSourceGuardTest` explicitly pin that both new IntelliJ edit paths (`openSetoptsInCodeAbsolute`, `openSetoptsInCodeChain`) go through it — but the VS Code implementation of the very same two edit paths (added by this phase) has no equivalent check, and no test exercises document mutation between decode and apply.

The blast radius is worse for the new multi-line chain path than the pre-existing single-token `hexRange` replace in `setopts-composer-webview.ts`, since a stale multi-line region replace can delete an entire block of unrelated code, not just overwrite one hex literal.

**Fix:** Before applying, re-run `decodeInCode` (or at minimum compare `vscode.workspace.textDocuments`' version/line count for the target `uri`) and abort with a "document changed, please retry" message on any mismatch — mirroring `StaleEditGuard.applyIfUnchanged`'s re-decode-and-compare, and re-checking immediately before `applyEdit` the way the Java guard re-checks the modification stamp inside the write. At minimum, pass the originally-observed `vscode.TextDocument.version` through the panel and refuse to apply if `vscode.workspace.textDocuments.find(...).version` has changed.

## Warnings

### WR-01: `matchStatement`'s control-flow disqualification list omits RETURN/BREAK/STOP/exit-style statements, risking a false "safe" chain verdict

**File:** `bbj-vscode/src/language/setopts-code-scanner.ts:400-451`

**Issue:** `matchStatement` disqualifies `IfStatement`/`ElseStatement`/`IfEndStatement`/`WhileStatement`/`WhileEndStatement`/`ForStatement`/`GotoStatement`/`OnGotoStatement`/`SwitchStatement`/`SwitchCase`/`UntilStatement`, and only the `'REPEAT'` variant of `KeywordStatement`, as `'control-flow'`. Every other `KeywordStatement` kind — `RETURN`, `BREAK`, `CONTINUE`, `STOP`, `END`, `ESCAPE`, `RETRY`, `FLOATINGPOINT`, `DENUM`, `ENDTRACE`, `BYE` — plus `ExitWithNumberStatement`/`ExitToStatement`/`SetErrorStatement` fall through to `!isLetStatement(stmt)` and are classified `'irrelevant'`, i.e. fully transparent to the backward walk.

A `RETURN`/`BREAK`/`STOP`/exit statement sitting physically between the `OPTS` origin and the traced `SETOPTS`/`IOR`/`AND` target means the target is not reliably reached by straight-line fallthrough from the origin (it is only reachable via a jump into the middle of the block, e.g. a different `GOSUB`/label entry). Treating it as transparent can produce a `safe: true` verdict — and a folded `effect`/prefill selection — that does not reflect what the traced variable's value actually is along the path the target is really reached by. This directly contradicts the module's own stated invariant: "Any ambiguity resolves toward an unsafe verdict, never toward a false 'link' or 'origin'" (see the doc comment on `matchStatement`), and `UNSAFE_REASON_TEXT`'s `control-flow` text already names "a conditional, loop, or GOTO/GOSUB" but not this case.

**Fix:** Add `KeywordStatement` kinds other than a small allow-list (or simply every `KeywordStatement`/`ExitWithNumberStatement`/`ExitToStatement`/`SetErrorStatement`) to the `control-flow` branch of `matchStatement`, and add a `test.each` case for at least `RETURN` and `STOP` alongside the existing `controlFlowMarkers` table in `test/setopts-code-scanner.test.ts`.

### WR-02: New SETOPTS-in-code hover branch bypasses `bbj-hover.ts`'s own "never let a hover error surface as a failed LSP request" guarantee

**File:** `bbj-vscode/src/language/bbj-hover.ts:38-49`

**Issue:** The new branch:

```ts
if (cstNode && cstNode.offset + cstNode.length > offset) {
    const setOptsTarget = setoptsHoverTarget(cstNode);
    if (setOptsTarget) {
        const shape = detectSetOptsShape(setOptsTarget);
        if (shape) {
            return { contents: { kind: 'markdown', value: setoptsHoverMarkdown(shape) } };
        }
    }
    // Store reference context for inherited field detection
    this.referenceCstNode = cstNode;
    try {
        return await super.getHoverContent(document, params);
    } catch (e) {
        logger.warn(...);
        return undefined;
    } finally {
        this.referenceCstNode = undefined;
    }
}
```

runs entirely before the existing `try`/`catch` that the file's own comment says exists so "a hover computation error must never surface as a failed LSP request." Today `setoptsHoverTarget`/`detectSetOptsShape`/`setoptsHoverMarkdown` are internally defensive (every `.ref` access is wrapped in its own `try { } catch { }`), so this is not currently exploitable, but it is a structural gap: any future change to `setopts-code-scanner.ts` that introduces an uncaught throw (e.g. a new AST walk without its own guard) will re-surface as a failed `textDocument/hover` request — precisely the regression class this file's surrounding code was written to prevent.

**Fix:** Wrap the new branch in the same `try`/`catch`/`finally` as the rest of the method (or give it its own narrow `try`/`catch` that degrades to falling through to the existing declaration-resolution path on error).

### WR-03: `vscode:prepublish`'s minify step targets an orphaned bundle; the shipped extension bundles stay unminified with source maps

**File:** `bbj-vscode/package.json:666,673`

**Issue:** This phase's diff changes:

```diff
-    "vscode:prepublish": "shx cp ../LICENSE ./LICENSE  && npm run esbuild-base -- --minify && npm run lint",
+    "vscode:prepublish": "shx cp ../LICENSE ./LICENSE  && npm run build && npm run esbuild-base -- --minify && npm run lint",
```

Adding `npm run build` here is a real, welcome fix (it guarantees `out/extension.cjs` and `out/language/main.cjs` — the files `"main"` and the IntelliJ build actually load — are freshly built before packaging, rather than depending on the `prepare` lifecycle script having already run). However, the pre-existing `esbuild-base` step that still runs afterward is dead code relative to that goal:

```json
"esbuild-base": "esbuild ./src/extension.ts --bundle --outfile=out/main.js --external:vscode --format=cjs --platform=node",
```

This bundles only `src/extension.ts` (not `src/language/main.ts`) into `out/main.js`, a file nothing in `package.json` (`"main": "./out/extension.cjs"`) or the IntelliJ build ever loads. So `npm run esbuild-base -- --minify` produces an unused, minified orphan file, while the two bundles that are actually shipped and loaded — produced moments earlier by `npm run build` → `node ./esbuild.mjs` with no `--minify` flag — remain **unminified with `sourcemap: true`**. `.vscodeignore` excludes `src/`, `test/`, `node_modules`, etc., but not `out/**/*.map` or `out/main.js`, so both the source maps and the orphaned bundle ship inside the packaged VSIX.

**Fix:** Either delete the now-redundant `esbuild-base -- --minify` step from `vscode:prepublish` (since `npm run build` already produces the real bundles), or replace it with a minified production build of the actual bundles (e.g. `node ./esbuild.mjs -- --minify` targeting the same `outdir`), and add `out/**/*.map` (and the unused `out/main.js` if `esbuild-base` is kept for any other reason) to `.vscodeignore`.

### WR-04: `bbj-code-action-handler.ts`'s bounded budget swallows every failure into an undifferentiated `null`

**File:** `bbj-vscode/src/language/bbj-code-action-handler.ts:79-118`

**Issue:** `createBoundedCodeActionHandler` returns `null` for four structurally different outcomes — budget expiry, a rejected `waitForRequiredState`, a missing document, and a thrown/rejected `getCodeActions` — with no differentiation surfaced anywhere (no log line, no telemetry counter). This is a reasonable and deliberate trade-off given the design goal (never block IntelliJ's modal dialog), and is well covered by `bbj-code-action-handler.test.ts`, so this is not a functional defect. It is, however, a diagnosability gap: if `textDocument/codeAction` starts silently timing out in the field (the exact "56016ms hang" scenario the file's own comment references as motivation), there is currently no server-side signal distinguishing "budget expired" from "provider threw" from "document never reached Linked", which will make a recurrence of that exact incident harder to triage than it needs to be.

**Fix:** Add a `logger.warn`/`logger.debug` call on the budget-expiry and provider-throw paths (mirroring the pattern already used elsewhere in this codebase, e.g. `bbj-hover.ts`'s `logger.warn` on a caught hover error), naming which of the four outcomes fired.

## Info

### IN-01: `SetoptsInCodeActionAvailability.isAvailable` matches extensions case-sensitively

**File:** `bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/SetoptsInCodeActionAvailability.java:21,34`

**Issue:** `BBJ_SOURCE_EXTENSIONS = Set.of("bbj", "bbjt", "src", "bbx")` and `isAvailable` does `BBJ_SOURCE_EXTENSIONS.contains(extension)` — an exact, case-sensitive match against `VirtualFile.getExtension()`. IntelliJ's own `fileType` extension registration (`extensions="bbj;bbjt;src;bbx"` in `plugin.xml`) is typically matched case-insensitively by the platform's `FileTypeManager`. On a case-sensitive filesystem with an unusually-cased file (e.g. `Foo.BBJ`), IntelliJ may still classify the file as BBj while this action's `update()` hides the entry, diverging from the file type it is meant to track. Low likelihood in practice (BBj tooling conventionally lower-cases extensions) but worth a `toLowerCase()` normalization for parity with the platform's own matching, and a test case.

**Fix:** `BBJ_SOURCE_EXTENSIONS.contains(extension.toLowerCase(Locale.ROOT))` with a null-guard, plus a `SetoptsInCodeActionAvailabilityTest` case for a mixed-case extension.

### IN-02: Compose-new applies an unconditional no-op `WorkspaceEdit` on VS Code when every option is left "Leave", unlike the IntelliJ path's early return

**File:** `bbj-vscode/src/setopts-tristate-webview.ts:116-134` vs `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ComposerLauncher.java:457-469`

**Issue:** IntelliJ's `openSetoptsInCodeComposeNew` explicitly early-returns without opening a write command when `text == null || text.isEmpty()`. The VS Code `apply` handler has no equivalent guard for the compose-new (no `target`) branch: `blockInsertText` can return `''` (`result.lines.length === 0`), and the handler still constructs `edit.insert(insertUri, ..., '')` and calls `vscode.workspace.applyEdit(edit)` unconditionally. The net effect is a harmless no-op edit (confirmed by this phase's own test, "all-Leave case: compose-new still inserts the two-line canonical block" — that test only exercises the non-empty case), but the two platforms now have observably different code paths for the same all-Leave input, which is worth aligning for future maintainers rather than relying on both happening to converge on "no visible effect."

**Fix:** Mirror IntelliJ's guard: skip `applyEdit`/`panel.dispose()`'s edit branch (or at least skip constructing the edit) when `text` is empty and there is no `target`, for symmetry with the documented cross-platform "byte-for-byte the same call" convention this phase otherwise follows carefully (see `ComposerLauncher.java`'s own doc comment on that convention).

---

_Reviewed: 2026-09-11T13:22:27Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
