---
phase: 93-composer-robustness-consolidation
reviewed: 2026-09-18T00:00:00Z
depth: standard
files_reviewed: 51
files_reviewed_list:
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjComposeActionBase.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjComposeAddChildWindowAction.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjComposeAddWindowAction.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjComposeCvsAction.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjComposeMsgboxAction.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjComposeSetoptsAction.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjComposeSetoptsInCodeAction.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/AddChildWindowComposerDialog.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/AddWindowComposerDialog.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/AddWindowFamilyComposerDialogBase.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ChildWindowSchematicPanel.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ComposerCatalogsCheck.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ComposerEditRanges.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ComposerIntentionBase.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ComposerLauncher.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ComposerModels.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ComposerNotices.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ComposerSwingHelpers.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ConfigureAddChildWindowIntention.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ConfigureAddWindowIntention.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ConfigureCvsIntention.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ConfigureMsgboxIntention.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ConfigureSetoptsInCodeIntention.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/CvsComposerDialog.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/MsgboxComposerDialog.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/MsgboxSchematicPanel.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/SetoptsComposerDialog.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/SetoptsTriStateComposerDialog.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/WindowSchematicPanel.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/actions/BbjComposeActionBaseSourceGuardTest.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/actions/BbjComposeCvsActionSourceGuardTest.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/actions/BbjComposeSetoptsActionSourceGuardTest.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/actions/BbjComposeSetoptsInCodeActionSourceGuardTest.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/AddWindowFamilyComposerDialogBaseSourceGuardTest.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerCatalogsCheckTest.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerCatalogsShapeSourceGuardTest.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerDialogRefreshSourceGuardTest.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerEditRangesTest.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerFieldValidationSourceGuardTest.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerIntentionBaseSourceGuardTest.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerIntentionPreviewSourceGuardTest.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerLauncherRangeGuardSourceGuardTest.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerModelsJsonBoundaryTest.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerNoticesTest.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerSwingHelpersSourceGuardTest.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/SetoptsComposerDialogSourceGuardTest.java
  - bbj-vscode/src/language/setopts-in-code-request.ts
  - bbj-vscode/src/setopts-catalog.ts
  - bbj-vscode/src/setopts-composer-webview.ts
  - bbj-vscode/test/composer-commands.test.ts
  - bbj-vscode/test/setopts-catalog.test.ts
findings:
  critical: 0
  warning: 4
  info: 2
  total: 6
status: issues_found
---

# Phase 93: Code Review Report

**Reviewed:** 2026-09-18T00:00:00Z
**Depth:** standard
**Files Reviewed:** 51
**Status:** issues_found

## Summary

This phase consolidates the IntelliJ composer actions/intentions/dialogs onto shared bases
(`BbjComposeActionBase`, `ComposerIntentionBase`, `AddWindowFamilyComposerDialogBase`,
`ComposerSwingHelpers`) and hardens two known crash paths: catalogs-payload shape
(`ComposerCatalogsCheck`, #609) and edit-range/line-bound validation
(`ComposerEditRanges`, #591). I traced every consolidation boundary and every new guard
back to its call sites in `ComposerLauncher.java`.

The previously reported CR-01 (unchecked server-supplied line numbers reaching
`Document.getLineStartOffset(int)` in `openSetoptsInCodeAbsolute`/`openSetoptsInCodeChain`)
is genuinely fixed: `ComposerEditRanges.isUsableLine`/`isUsableLineRegion` use a strict
`< lineCount` bound, both guards run before `StaleEditGuard` is constructed (i.e. before
the write command is entered), and the test suite (`ComposerEditRangesTest`,
`ComposerLauncherRangeGuardSourceGuardTest`) pins the ordering and the boundary correctly
(`endLine == lineCount` is rejected, matching real `Document` semantics). I did not find a
way to make the fixed call sites throw.

However, the `#591` "malformed edit range" defense is incomplete in two ways that are
directly adjacent to the code this phase touched: `ComposerEditRanges.isUsable(int[])`
deliberately does not check that `range[0] <= range[1]`, and every array-shaped range this
phase gates (`flagsRange`, `eventMaskRange`, SETOPTS's `hexRange`) is written to the
document with no other ordering check downstream — so a version-skewed or buggy language
server that sends a reversed range still crashes the write, which is exactly the failure
mode this guard exists to close. Separately, the two `int`-typed line fields the new
line-bound guards protect (`SetoptsInCodeAbsoluteEdit.line`, `SetoptsInCodeChainEdit.startLine/endLine`)
are Java primitives Gson defaults to `0` when a field is omitted from the wire payload —
`isUsableLine(0, lineCount)` is `true` for any non-empty document, so an incomplete
response silently edits line 0 instead of being rejected as malformed.

The three items the prior review deliberately deferred (`decoded.edit` dereferenced
without a null check; `createComposeTriStateHandler` not validating `params.selection`;
the webview's silent no-op on a target with neither `hexRange` nor `insertOffset`) are
still present, unchanged, and still pre-existing/deferred rather than regressions of this
phase — re-confirmed below for completeness.

## Warnings

### WR-01: `ComposerEditRanges.isUsable(int[])` never validates range ordering, so a reversed range still crashes the write

**File:** `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ComposerEditRanges.java:16-23`
**Issue:** `isUsable(int[] range)` only checks `range != null && range.length == 2` — the
javadoc explicitly disclaims checking `range[0] <= range[1]` ("that is the document's
problem, not this predicate's"), and `ComposerEditRangesTest.aDescendingTwoElementRangeIsStillUsableBecauseOrderingIsTheDocumentsProblemNotThisPredicates`
pins `isUsable(new int[]{9, 4})` as `true`. But nothing downstream ever validates
ordering before the write: `applyHexEdit` (`ComposerLauncher.java:451-461`) builds
`new Op(ls + ed.flagsRange[0], ls + ed.flagsRange[1], flagsHex)` directly from the
unordered array and later calls `doc.replaceString(op.start, op.end, op.text)`
(`ComposerLauncher.java:465-467`); `openSetopts` (`ComposerLauncher.java:517-529`) does the
same with `ed.hexRange`; `openSetoptsInCodeAbsolute` (`ComposerLauncher.java:604-607, 633`)
does the same with `ed.hexRange` for the absolute-literal edit. IntelliJ's
`Document.replaceString(start, end, text)` throws when `end < start`, so a version-skewed
or buggy language server response with a reversed range still crashes the write inside a
`WriteCommandAction` — the exact class of failure `ComposerEditRanges` (#591) was
introduced to close, left half-closed for the array-shaped ranges (the line-region
predicate, `isUsableLineRegion`, does enforce `endLine >= startLine` and is not affected).
**Fix:**
```java
public static boolean isUsable(int[] range) {
    return range != null && range.length == 2 && range[0] <= range[1];
}
```
Update `ComposerEditRangesTest`'s descending-range test to expect `false` (its own rationale
sentence — "ordering is the document's problem" — is the thing to revisit, not preserve).

### WR-02: Gson defaults an omitted `int` line field to `0`, which the new line-bound guards accept as valid

**File:** `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ComposerModels.java:470-474,477-482`
**Issue:** `SetoptsInCodeAbsoluteEdit.line`, `SetoptsInCodeChainEdit.startLine` and
`SetoptsInCodeChainEdit.endLine` are primitive `int` fields. When a version-skewed or
malformed `bbj/composer/setopts/decodeInCode` response omits one of these keys, Gson
silently leaves the field at its default, `0` — a value indistinguishable from an
explicit, legitimate `line: 0`. `ComposerEditRanges.isUsableLine(0, lineCount)`
(`ComposerEditRanges.java:34-36`) is `true` for any document with at least one line, so
the very guards this phase added at `ComposerLauncher.java:611-615` (absolute) and
`ComposerLauncher.java:663-667` (chain) cannot detect this malformed-input shape: instead
of aborting with `ComposerNotices.malformedEdit(...)`, the code proceeds to rewrite line 0
of the user's file — silently editing the wrong location rather than failing closed, which
is worse than the crash the guard was built to prevent. This is a real gap in an otherwise
carefully "fail-closed" family (contrast with `AddWindowPreview.valid`, a `boolean` whose
missing-key default of `false` is documented and tested as intentionally fail-closed).
**Fix:** Make the wire fields boxed (`Integer`) so "absent" is representable and distinct
from `0`, and treat `null` as immediately malformed in `ComposerLauncher` before calling
`ComposerEditRanges.isUsableLine`/`isUsableLineRegion` — or, more centrally, extend
`ComposerCatalogsCheck`-style shape validation to the decode-result DTOs themselves.

### WR-03 (re-confirmed, pre-existing — deferred by design): `decoded.edit` dereferenced with no null check

**File:** `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ComposerLauncher.java` (e.g. lines 313, 390-394, 403-407, 497, 725)
**Issue:** Every edit-in-place branch dereferences `decoded.edit` (e.g.
`MsgboxEdit ed = decoded.edit;`, `decoded.edit.preservedFlagBits`) immediately after
checking `decoded.found`, with no null check on `edit` itself. A response with
`found: true` but a missing/null `edit` object (a version-skewed or buggy server) throws
`NullPointerException` on the EDT rather than surfacing `ComposerNotices.malformedEdit(...)`.
This is unchanged from before this phase and was explicitly deferred by the prior review
(WR-01) as pre-existing debt, not a phase-93 regression. Confirmed still present, still
unaddressed by this phase's `ComposerCatalogsCheck`/`ComposerEditRanges` work (both of
which validate catalogs and ranges, but not the presence of the `edit` object that carries
those ranges).
**Fix:** Add a `decoded.edit == null` guard alongside the existing `found`/`editable`
checks in each `open*` method, rendering `ComposerNotices.malformedEdit(...)` on failure,
matching the pattern already used for `ComposerEditRanges.isUsable(...)`.

## Info

### IN-01 (re-confirmed, pre-existing — deferred by design): `createComposeTriStateHandler` never validates `params.selection`

**File:** `bbj-vscode/src/language/setopts-in-code-request.ts:360-362`
**Issue:** `createComposeTriStateHandler()` returns `(params) => composeSetOptsBlock(params)`
with no validation that `params.selection` (or `params.selection.entries`) is present.
`composeSetOptsBlock` immediately does `input.selection.entries.find(...)` inside a loop
over `SETOPTS_BITS` (`bbj-vscode/src/setopts-catalog.ts:488-491`), so a malformed
`bbj/composer/setopts/composeTriState` request (missing `selection`) throws a
`TypeError` out of the LSP request handler. Confirmed unchanged from the prior review's
WR-02, deliberately deferred there as pre-existing.
**Fix:** Validate `params?.selection?.entries` is an array before delegating, returning a
fail-closed `{ lines: [], text: '', valid: false }` on a malformed request, mirroring the
`valid: false` fail-closed convention already documented on `SetoptsPreview`/`AddWindowPreview`.

### IN-02 (re-confirmed, pre-existing — deferred by design): webview silently no-ops on a target with neither `hexRange` nor `insertOffset`

**File:** `bbj-vscode/src/setopts-composer-webview.ts:107-131`
**Issue:** In the `'apply'` message handler, when `target` is present but carries neither
`target.hexRange` nor `target.insertOffset`, neither `if` branch executes, so `edit`
remains an empty `WorkspaceEdit`; `vscode.workspace.applyEdit(edit)` is called with no
edits, `panel.dispose()` runs, and the user sees the panel simply close with no error and
no document change. Confirmed unchanged from the prior review's IN-01, deliberately
deferred there.
**Fix:** Add an explicit `else` branch that surfaces a "nothing to update" notice
(mirroring `ComposerNotices.malformedEdit`'s Java-side convention) instead of silently
closing.

### IN-03: Inconsistent robustness across this phase's own "source guard" test helpers

**File:** e.g. `bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerLauncherRangeGuardSourceGuardTest.java:84-104` vs. `bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/SetoptsComposerDialogSourceGuardTest.java:74-100`
**Issue:** Most of the new/updated "source guard" tests in this phase extract a
brace-balanced method body with a naive counter (`extractMethodBody`) that increments/
decrements depth on every `{`/`}` character in the raw source text, including inside
string and character literals and (in several classes) inside comments not yet stripped.
`SetoptsComposerDialogSourceGuardTest`'s own `blockAfter` helper is quote-aware (skips
braces inside `"…"`/`'…'` literals) specifically because a regex literal such as
`"[0-9A-F]{0,14}"` would otherwise desynchronize the brace count. The other guard classes
reviewed here (`ComposerLauncherRangeGuardSourceGuardTest`, `ComposerCatalogsShapeSourceGuardTest`,
`ComposerIntentionBaseSourceGuardTest`, `BbjComposeActionBaseSourceGuardTest`,
`AddWindowFamilyComposerDialogBaseSourceGuardTest`) use the naive counter against
`ComposerLauncher.java` and other files that do contain brace characters inside string
literals and Javadoc prose elsewhere in the same files, so their extraction is one string
literal away from silently mis-scoping the body it asserts against (asserting inside the
wrong span, or failing to find the closing brace at all). None of the specific extractions
exercised in this phase currently hit such a literal, so no test is presently broken by
this — but the inconsistency between the two techniques in the same package is worth
converging on the quote-aware one everywhere these count-based assertions are load-bearing.
**Fix:** Factor the quote-aware `blockAfter`/`extractMethodBody` variant into one shared
test-only helper (already tolerated by this codebase's own convention of "no shared test
utility, so a bad edit can't weaken every guard at once" — a `protected`/`static` copy
duplicated file-to-file is fine; the goal is only that every copy uses the safer algorithm).

---

_Reviewed: 2026-09-18T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
