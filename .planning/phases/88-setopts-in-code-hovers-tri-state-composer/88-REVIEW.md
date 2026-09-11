---
phase: 88-setopts-in-code-hovers-tri-state-composer
reviewed: 2026-09-11T00:00:00Z
depth: standard
files_reviewed: 44
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
  warning: 3
  info: 2
  total: 6
status: issues_found
---

# Phase 88: Code Review Report

**Reviewed:** 2026-09-11
**Depth:** standard
**Files Reviewed:** 44
**Status:** issues_found

## Summary

This phase adds a SETOPTS-in-code hover decoder (`setopts-code-scanner.ts`), a document-aware
`decodeInCode`/`composeTriState` request pair (`setopts-in-code-request.ts`), a tri-state
Set/Clear/Leave composer on both IDEs (`SetoptsTriStateComposerDialog.java` /
`setopts-tristate-webview.ts`), and the associated IntelliJ action/intention wiring. The code is
heavily documented, and the bulk of it — the pure catalog/vector arithmetic in
`setopts-catalog.ts`, the AST-walking safety classifier in `setopts-code-scanner.ts`, the
DTO/equality/JSON-boundary layer on the IntelliJ side, and the bounded code-action handler — is
well tested and internally consistent; I traced the arithmetic (hex delimiters, full-width
single-bit masks, fold/last-write-wins semantics, catalog-order codegen) by hand against the test
suite and found no defect in that layer.

The one significant defect is architectural: the `decodeInCode` handler computes a safe chain's
edit-in-place range purely from **document line numbers** (`originLine + 1` .. the `SETOPTS`
statement's line), while the underlying chain-safety model operates at the **statement** level and
explicitly supports (and is unit-tested for, at the hover layer) multiple statements joined by `;`
on one physical source line. When a reassignment shares a line with the origin or the closing
`SETOPTS` statement, the computed range silently excludes that reassignment from the "region to
replace," so an edit-in-place duplicates or discards code instead of replacing it — while the
server still reports `editable: true` and both IDE writers apply the edit unconditionally. This
propagates identically to both `bbj-intellij/.../ComposerLauncher.java`'s
`openSetoptsInCodeChain` and `bbj-vscode/.../setopts-tristate-webview.ts`'s `apply` handler,
since both simply trust the server's `startLine`/`endLine`.

I also found three lower-severity findings: the new VS Code tri-state chain composer applies its
edit with no re-validation against document changes since decode (unlike its IntelliJ twin's
`StaleEditGuard`), the region-deletion behavior above also silently drops any comment/blank line
sitting between the origin and the first tracked reassignment, and the new `composeTriState`
server handler performs no defensive validation of its `selection.entries` input.

## Critical Issues

### CR-01: Chain edit-in-place range is computed by line number, not statement — corrupts or duplicates code when a reassignment shares a line with the origin or `SETOPTS`

**File:** `bbj-vscode/src/language/setopts-in-code-request.ts:182-200`

**Issue:**

```ts
const setoptsCst = target.$cstNode;
const originCst = shape.originNode?.$cstNode;
...
const endLine = document.textDocument.positionAt(setoptsCst.offset).line;
const originLine = document.textDocument.positionAt(originCst.offset).line;
const startLine = originLine + 1;
...
chain: { variableName: shape.variableName, startLine, endLine, indent: lineIndent(document, indentLine) },
```

`startLine`/`endLine` assume every reassignment in the chain occupies its own dedicated physical
line strictly between the origin's line and the `SETOPTS` statement's line. But
`setopts-code-scanner.ts`'s own safety walk (`matchStatement`/`walkChain`/`flattenStatements`)
operates at the **statement** level and is explicitly tested to classify a chain as `safe: true`
when a reassignment or the `SETOPTS` statement itself is joined to a neighboring statement with
`;` on one physical line — see `bbj-vscode/test/setopts-code-scanner.test.ts:393-410` ("a
CompoundStatement sibling is transparent" / "WR-B regression"). No equivalent test exists for the
*edit-range computation* in `setopts-in-code-request.test.ts` or `setopts-in-code-ui.test.ts` —
only well-separated-line chains are exercised there.

Concretely, for the source:

```
A$=OPTS; A$=IOR(A$,$08$)
SETOPTS A$
```

`traceOptsChain` correctly finds one `IOR` link and reports `safe: true` (both the origin and the
link live on line 0, joined by `;`). But `decodeInCode` computes `originLine = 0`,
`startLine = originLine + 1 = 1`, `endLine = 1` (the `SETOPTS` line) — an **empty** `[1, 1)`
range. Both writers (`ComposerLauncher.openSetoptsInCodeChain` in
`bbj-intellij/.../ComposerLauncher.java:517-549`, and the `apply` handler in
`bbj-vscode/src/setopts-tristate-webview.ts:116-134`) trust this range unconditionally: they
insert the newly composed `IOR`/`AND` lines at that empty point, but never touch or remove the
original `A$=IOR(A$,$08$)` text that is still sitting on line 0 (before the origin — actually
after `A$=OPTS;` on the same line). The result is a file that now contains **both** the old and
the new reassignment, silently changing the effective SETOPTS vector from what either the old or
the new selection alone would produce — exactly the kind of silent-corruption failure mode
DISC-06's "never touch what you can't round-trip" rule is meant to prevent, except here it fires
`editable: true` and touches it wrong instead of refusing.

A second, more severe variant: when the origin and `SETOPTS` are themselves on the same single
line with zero reassignments (e.g. `A$=OPTS; SETOPTS A$`), `originLine === endLine === 0`, so
`startLine = originLine + 1 = 1` while `endLine = 0` — an **inverted** range
(`startLine > endLine`). `vscode.Range`'s constructor silently swaps its two positions when
constructed out of order, so the VS Code writer replaces the wrong span of text; on the IntelliJ
side, `doc.getLineStartOffset(chain.startLine)` in `ComposerLauncher.java:544` is called with a
line number that may not exist in a single-line document, which is a plausible runtime exception
inside a `WriteCommandAction` (silently swallowed by IntelliJ, but the file is left in whatever
partial state the aborted edit produced).

**Fix:** Compute the replace region from the actual reassignment *statements'* CST ranges (the
first and last chain-link node's own `$cstNode`), not from the origin/`SETOPTS` line numbers.
When a chain has reassignments that do not each occupy an isolated line — i.e. any chain link or
the origin/`SETOPTS` statement shares a line with another statement the walk touched — either
compute a precise sub-line character range instead of a whole-line range, or fail closed
(`editable: false`, with a new `SetOptsUnsafeReason` such as `'shared-line'`) the same way
`indexed-target` already fails closed for a shape the model cannot precisely represent. At minimum,
add a defensive check: `if (startLine > endLine) { return NOT_FOUND; }` before returning the
`chain` payload, and add the missing test coverage for `A$=OPTS; A$=IOR(A$,$08$)\nSETOPTS A$`
(and its all-single-line degenerate form) to `setopts-in-code-request.test.ts`.

## Warnings

### WR-01: VS Code's new tri-state chain composer applies its edit with no staleness re-validation, unlike its IntelliJ twin

**File:** `bbj-vscode/src/setopts-tristate-webview.ts:116-134`

**Issue:** The `apply` message handler recomputes the composed block text via `compose()` but
applies it directly against the `startLine`/`endLine` captured at `decodeInCode` time, with no
re-decode or modification-stamp check:

```ts
case 'apply': {
    ...
    const edit = new vscode.WorkspaceEdit();
    if (target) {
        const uri = vscode.Uri.parse(target.uri);
        if (target.startLine === target.endLine) {
            edit.insert(uri, new vscode.Position(target.startLine, 0), text);
        } else {
            edit.replace(uri, new vscode.Range(target.startLine, 0, target.endLine, 0), text);
        }
    }
    ...
    await vscode.workspace.applyEdit(edit);
```

The IntelliJ side built a dedicated `StaleEditGuard` specifically for this class of risk and wires
it through every SETOPTS-in-code edit path, including this exact chain-edit flow
(`ComposerLauncher.openSetoptsInCodeChain`, `bbj-intellij/.../ComposerLauncher.java:533-549`,
re-decoding and comparing via `DecodeEquality::sameSetoptsInCode` before writing). The VS Code
panel is a webview with an async round trip to the user and to the language server before Apply is
clicked, during which the user's document can change (typing above the target range, an auto-save
reformat, etc.); `target.startLine`/`endLine` are never re-validated, so a stale apply can silently
overwrite or corrupt unrelated lines. This same gap already existed for the older absolute-mode
`setopts-composer-webview.ts`, but that panel only ever rewrites a single in-line token; this
phase's new chain panel replaces a whole multi-line range, which is materially riskier under the
same missing protection.

**Fix:** Re-run `SETOPTS_DECODE_IN_CODE_METHOD` (or at minimum compare the target range's current
text/line count against what was captured) immediately before constructing the `WorkspaceEdit` in
the `apply` case, mirroring `ComposerLauncher`'s `StaleEditGuard`/`DecodeEquality.sameSetoptsInCode`
pattern, and refuse the write with a user-visible message on mismatch.

### WR-02: A comment or blank line between the origin and the first reassignment is silently deleted by an edit-in-place

**File:** `bbj-vscode/src/language/setopts-in-code-request.ts:191` (root cause shared with CR-01)

**Issue:** `startLine = originLine + 1` assumes the line immediately after the origin statement is
either the first reassignment or (with zero reassignments) the `SETOPTS` line itself. For:

```
A$=OPTS
REM keep this
A$=IOR(A$,$08$)
SETOPTS A$
```

the walk still classifies the chain `safe: true` (a `REM` comment is not a statement the walker
sees), but `startLine` = 1 (the `REM` line) and the whole `[1, 3)` range — including the comment —
gets replaced by the freshly composed reassignment lines on Apply, deleting the comment with no
warning. This is a narrower instance of the same statement-vs-line mismatch as CR-01.

**Fix:** Once CR-01's range computation is anchored to the actual reassignment statements' own CST
ranges rather than `originLine + 1`, this resolves naturally (the replaced region would start at
the first reassignment statement, not at whatever the next line happens to be).

### WR-03: `composeTriState`'s server handler performs no defensive validation of its `selection.entries` input

**File:** `bbj-vscode/src/language/setopts-in-code-request.ts:212-214`, `bbj-vscode/src/setopts-catalog.ts:459-483`

**Issue:** `createComposeTriStateHandler` is a bare pass-through:

```ts
export function createComposeTriStateHandler(): (params: SetOptsComposeTriStateParams) => SetOptsComposeTriStateResult {
    return (params: SetOptsComposeTriStateParams): SetOptsComposeTriStateResult => composeSetOptsBlock(params);
}
```

and `composeSetOptsBlock` immediately does `input.selection.entries.find(...)`. Every other
`bbj/composer/*` handler in this codebase is reached only from the two trusted IDE clients, so this
is not exploitable today, but it is also the only handler in this family with zero shape checking
on its params — a malformed request (e.g. `{ "selection": {} }`, omitting `entries`) throws a raw
`TypeError` out of the LSP request handler instead of failing gracefully like every neighboring
handler in `setopts-in-code-request.ts` (`createDecodeInCodeHandler` returns `NOT_FOUND` for every
malformed/missing-data case it can hit).

**Fix:** Guard `input.selection?.entries` and return an empty/default result (or throw a
recognizable LSP error) rather than letting `Array.prototype.find` throw on `undefined`.

## Info

### IN-01: `legend.innerHTML` with catalog-sourced interpolation in both webviews

**File:** `bbj-vscode/src/setopts-tristate-webview.ts:246`, `bbj-vscode/src/setopts-composer-webview.ts:254` (pre-existing pattern, reused here)

**Issue:** `legend.innerHTML = 'Byte ' + byteNo + ' <span class="byte-no">— ' + groups[byteNo] + '</span>';`
interpolates `groups[byteNo]` (from the server's static `BYTE_GROUPS` catalog) into `innerHTML`.
Today's data source is a hardcoded compile-time constant, so this is not currently exploitable, but
it is a pattern that silently becomes an XSS vector the moment any byte-group label ever becomes
even partially server/data-driven (e.g. localized strings loaded from a file, or a future
user-customizable catalog).

**Fix:** Build the `<span>` with `document.createElement`/`textContent` instead of `innerHTML`,
consistent with how every other dynamic label in the same file (`lbl.textContent = bit.label`) is
already built.

### IN-02: `vscode:prepublish` now runs the full TypeScript+esbuild `build` and then `esbuild-base --minify` again

**File:** `bbj-vscode/package.json` (diff line ~ `"vscode:prepublish"`)

**Issue:**
```diff
-"vscode:prepublish": "shx cp ../LICENSE ./LICENSE  && npm run esbuild-base -- --minify && npm run lint",
+"vscode:prepublish": "shx cp ../LICENSE ./LICENSE  && npm run build && npm run esbuild-base -- --minify && npm run lint",
```
`npm run build` already runs `node ./esbuild.mjs` (a non-minified bundle) before the pipeline now
runs `esbuild-base -- --minify` a second time, bundling twice on every publish. Likely intentional
(to get a `tsc -b` type-check gate before packaging), but it is worth confirming that was the
intent rather than an accidental leftover from merging a type-check step in — running `tsc -b`
alone (without the redundant non-minified esbuild pass inside `build`) would achieve the same
type-check gate without the duplicate bundle.

---

_Reviewed: 2026-09-11_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
