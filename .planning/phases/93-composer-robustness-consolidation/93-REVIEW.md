---
phase: 93-composer-robustness-consolidation
reviewed: 2026-09-18T10:30:48Z
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
  critical: 1
  warning: 2
  info: 1
  total: 4
status: issues_found
---

# Phase 93: Code Review Report

**Reviewed:** 2026-09-18T10:30:48Z
**Depth:** standard
**Files Reviewed:** 51
**Status:** issues_found

## Summary

Reviewed the full phase 93 file set: the robustness guards (`ComposerEditRanges`, `ComposerCatalogsCheck`, the `MALFORMED_EDIT` notice, and the SETOPTS raw-tail validation move to the language server), and the four base-class extractions (`ComposerSwingHelpers`, `ComposerIntentionBase`, `AddWindowFamilyComposerDialogBase`, `BbjComposeActionBase`).

The consolidation work is clean: the addWindow/addChildWindow debounce wiring, sequence-counter discipline, and OK-gating in `AddWindowFamilyComposerDialogBase` are byte-for-byte equivalent to what each dialog carried before, and every extracted helper in `ComposerSwingHelpers`/`ComposerIntentionBase`/`BbjComposeActionBase` is reached identically by every subclass. The `valid` fail-closed contract for `SetoptsComposerDialog`/`SetoptsTriStateComposerDialog` is correct and well-tested: both fields are primitive Java `boolean`s, so an absent `valid` key in a malformed/partial JSON-RPC response defaults to `false` and OK stays disabled (confirmed against `ComposerModelsJsonBoundaryTest`'s two fail-closed round-trip tests).

The one real gap is in the new robustness work itself: `ComposerLauncher.java`'s SETOPTS-in-code dispatch validates the character-range array (`hexRange`) for the `absolute` edit shape with the new `ComposerEditRanges` guard, but the sibling `chain` edit shape — decoded from the exact same `SetoptsInCodeDecodeResult` response, in the same method family, in the same diff — passes its `absolute.line` / `chain.startLine` / `chain.endLine` integers straight into `Document.getLineStartOffset(...)` with no bounds check at all. A malformed or version-skewed language-server response that names a line outside the current document throws an uncaught `IndexOutOfBoundsException` instead of the `MALFORMED_EDIT` notice this same phase built for exactly this failure class.

## Critical Issues

### CR-01: `chain.startLine`/`chain.endLine`/`absolute.line` are dereferenced with no document-bounds check, unlike the sibling `hexRange` this same phase guarded

**File:** `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ComposerLauncher.java:619` and `:663-664`

**Issue:** `openSetoptsInCodeAbsolute` and `openSetoptsInCodeChain` both consume fields from the same `SetoptsInCodeDecodeResult` the phase's own diff (see `git diff c5525e5c..HEAD`) added a `ComposerEditRanges.isUsable(ed.hexRange)` guard for, just a few lines above each usage:

```java
// openSetoptsInCodeAbsolute (line 619) — ed.line is never range-checked:
int ls = doc.getLineStartOffset(ed.line);
doc.replaceString(ls + ed.hexRange[0], ls + ed.hexRange[1], BbjHexLiteral.of(hex));

// openSetoptsInCodeChain (lines 663-664) — chain.startLine/endLine are never range-checked:
int startOffset = doc.getLineStartOffset(chain.startLine);
int endOffset = doc.getLineStartOffset(chain.endLine);
```

`Document.getLineStartOffset(int)` throws `IndexOutOfBoundsException` for a line number `< 0` or `>= getLineCount()`. Nothing between the decode response arriving and this call validates `ed.line`, `chain.startLine`, or `chain.endLine` against the live document's current line count — the only validation this phase added for the neighboring `absolute.hexRange` field (`ComposerEditRanges.isUsable(ed.hexRange)`, added two lines above the `ed.line` dereference at line 619) does not cover the line-number fields at all.

This is exactly the failure class the phase's own stated goal names ("guard malformed language-server payloads so the IDE never raises an internal error") and the class `ComposerLauncherRangeGuardSourceGuardTest`/`ComposerNotices.malformedEdit` exist to close for every *other* range in this file — but it was not extended to these two line-number fields. `StaleEditGuard.applyIfUnchanged`'s re-decode-and-compare step does not help here: if a buggy or version-skewed server deterministically returns the same out-of-range line number on both the initial decode and the guard's re-decode, the values compare equal (not stale) and the crash still happens inside the write-command body.

**Fix:** Add a document-line-count bound check before every one of these three dereferences, mirroring the `ComposerEditRanges`/`ComposerNotices.malformedEdit` pattern already established for `hexRange`:

```java
// openSetoptsInCodeAbsolute, before constructing the guard:
if (ed.line < 0 || ed.line >= editor.getDocument().getLineCount()) {
    ComposerNoticeRenderer.render(project, ComposerNotices.malformedEdit(labelOf(Kind.SETOPTS_IN_CODE)), null);
    return;
}

// openSetoptsInCodeChain, before constructing the guard:
int lineCount = editor.getDocument().getLineCount();
if (chain.startLine < 0 || chain.endLine < chain.startLine || chain.endLine > lineCount) {
    ComposerNoticeRenderer.render(project, ComposerNotices.malformedEdit(labelOf(Kind.SETOPTS_IN_CODE)), null);
    return;
}
```

## Warnings

### WR-01: `decoded.edit` is dereferenced with no null check across every edit-in-place path

**File:** `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ComposerLauncher.java:313, 363, 384, 390, 403, 485, 497, 709`

**Issue:** Every `open*` method that reaches an edit-in-place branch (`boolean edit = decoded != null && decoded.found;` or the MSGBOX/CVS equivalent) immediately dereferences `decoded.edit.preservedFlagBits`, `decoded.edit.hexDigits`, etc., with no check that `decoded.edit` itself is non-null. The TypeScript decode handlers are documented to always pair `found: true` with a populated `edit`, but nothing on the Java side enforces that contract — a malformed response with `found: true` and `edit: null` throws a `NullPointerException` at the first field access, on the EDT, inside the same file this phase is actively hardening against exactly this class of malformed-payload crash. This is pre-existing code, not introduced by this phase's diff, but it sits in the same methods the phase modified and is the same risk class as CR-01.

**Fix:** Add a `decoded.edit == null` check alongside each existing `decoded.found` check (or generalize `ComposerEditRanges`/`ComposerCatalogsCheck`'s "usable" pattern to a shared `decoded != null && decoded.found && decoded.edit != null` helper reused by every `open*` method), rendering `ComposerNotices.malformedEdit(...)` on failure rather than letting the NPE propagate.

### WR-02: `composeTriState`'s handler performs no defensive validation of its own request params

**File:** `bbj-vscode/src/language/setopts-in-code-request.ts:360-362`

**Issue:** `createComposeTriStateHandler()` is a bare pass-through: `(params) => composeSetOptsBlock(params)`. `composeSetOptsBlock` immediately does `input.selection.entries.find(...)` with no guard for `input.selection` being absent — unlike `createDecodeInCodeHandler`, which is careful to return `NOT_FOUND` rather than throw on every malformed input it can reach (missing document, unresolvable leaf, undetected shape). A malformed/incompatible client request (e.g. a future or buggy IDE build that omits `selection`) throws inside the LSP request handler instead of degrading gracefully the way its sibling handler in the same file does. This is lower severity than CR-01/WR-01 because it is client→server (a well-behaved client already always sends `selection`), not the server→client malformed-payload direction the phase's stated threat model targets, but it is an inconsistency within the same file/module this phase touched.

**Fix:** Either validate `params.selection` shape before calling `composeSetOptsBlock` (mirroring `createDecodeInCodeHandler`'s defensive style), or document explicitly why this handler is exempt from the module's own established convention.

## Info

### IN-01: `setopts-composer-webview.ts`'s `apply` branch silently no-ops on a `target` with neither `hexRange` nor `insertOffset`

**File:** `bbj-vscode/src/setopts-composer-webview.ts:111-126`

**Issue:** In the `'apply'` message handler, when `target` is present but carries neither `target.hexRange` nor `target.insertOffset` (a shape decodeCall is not expected to produce, but nothing enforces that at this boundary), the code builds an empty `WorkspaceEdit`, applies it (a no-op), and disposes the panel — the same "quietly do nothing" outcome IntelliJ's `MALFORMED_EDIT` notice (added by this phase) was built to make visible to the user instead. This is a pre-existing gap (not introduced by this phase's diff to this file, which only added the `hexSyntax`/`bbjHexLiteral` branch), and VS Code's `SetOptsStaleEditGuard` already covers the staleness half of this scenario, so this is flagged for awareness rather than as a blocking defect.

**Fix:** Optional — if a future pass wants IDE parity, surface a warning notification (or reuse the existing stale-document messaging path) when `target` carries neither field, matching IntelliJ's new `MALFORMED_EDIT` treatment.

---

_Reviewed: 2026-09-18T10:30:48Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
