---
phase: 89-cvs-composer-msgbox-expressions-composer-discoverability
reviewed: 2026-09-12T00:00:00Z
depth: standard
files_reviewed: 19
files_reviewed_list:
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ComposerLauncher.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ComposerModels.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ConfigureCvsIntention.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/CvsComposeMode.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/CvsComposerDialog.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/DecodeEquality.java
  - bbj-intellij/src/main/resources/intentionDescriptions/ConfigureCvsIntention/description.html
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerApplyGuardSourceGuardTest.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerModelsJsonBoundaryTest.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/CvsComposeModeTest.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/DecodeEqualityTest.java
  - bbj-vscode/src/cvs-composer.ts
  - bbj-vscode/src/cvs-composer-ui.ts
  - bbj-vscode/src/cvs-composer-webview.ts
  - bbj-vscode/test/composer-codelens.test.ts
  - bbj-vscode/test/composer-lens-command.test.ts
  - bbj-vscode/test/cvs-composer.test.ts
  - bbj-vscode/test/cvs-composer-ui.test.ts
  - bbj-vscode/test/functional/installed-extension-e2e.test.ts
findings:
  critical: 0
  warning: 1
  info: 1
  total: 2
status: issues_found
---

# Phase 89: Code Review Report — Gap-Closure Round (UAT G-89-3 / #649)

**Reviewed:** 2026-09-12T00:00:00Z
**Depth:** standard
**Files Reviewed:** 19
**Status:** issues_found

**Scope note:** This review covers only the gap-closure delta since commit `3d910b6f`
(`git diff 3d910b6f..HEAD`) — the unfinished-`CVS(`-call `incomplete` decode outcome and its
VS Code/IntelliJ compose-into-span wiring. The full-phase review for the rest of phase 89 lives
in git history (the previous `89-REVIEW.md`, now overwritten by this file) and its fix report is
in `89-REVIEW-FIX.md`; this document does not re-litigate that earlier round.

## Summary

The delta adds a third `CvsDecodeCallResult`/`CvsDecodeResult` outcome (`incomplete`) for a
`CVS(...)` call that has no mask argument yet (`CVS(`, `CVS()`, `CVS(a$`, `CVS(a$,`,
`CVS(a$)`), replacing the previous `missing-mask` hard-stop reason. Both editors route this
outcome into a "complete the call" flow that composes a whole new statement and replaces the
unfinished call's span, through the same stale-edit guard used for edit-in-place. I traced the
span-boundary math in `scanArgs`/`buildCvsCallInfo` against every documented unfinished form, the
two independent staleness mechanisms (VS Code's `cvsCallStillMatches` slice-plus-re-scan check,
IntelliJ's `DecodeEquality.sameCvs` field-wise re-decode comparison), and the `CvsComposeMode`
routing seam (`incomplete` checked before `editable`, defensively ordered even though the two are
documented as mutually exclusive on the wire). All of it holds up: I could not construct a
sequence of edits that lets a compose action nest a second `CVS(` inside the replaced span, or
that lets the stale-edit guard approve a write against content it never actually re-verified — the
test suites for both editors already stress exactly these edges (a same-prefix-but-grown
unterminated call, a call that turns editable while the completing dialog is still open, JSON
envelopes with the `incomplete` key entirely absent). The `CvsInitial`/`CvsDecodeResult` DTOs and
the TS `CvsDecodeCallResult` interface agree field-for-field, and the boundary test that parses a
literal `incomplete: true` envelope through LSP4J's Gson confirms the wire contract end to end.

Two lower-severity issues remain, both about the **new** VS Code panel behavior introduced by this
round rather than about the decode/guard correctness:

## Warnings

### WR-01: VS Code composer panel always labels its primary action "Insert", even in Complete/Edit mode

**File:** `bbj-vscode/src/cvs-composer-webview.ts:234, 260-274`
**Issue:** The webview's primary button is hard-coded `<button id="insert">Insert</button>` and
the `message` handler for `type: 'init'` updates `$('heading')`, `$('str-hint')` and the
assign-to row's visibility for `editMode`/`completing`, but never updates the button's own label.
Before this round, an unfinished call never reached this panel at all (it was a hard "missing
mask" message with no dialog); now `COMPLETE_CALL` mode routes here and — like the pre-existing
`EDIT` mode — replaces an existing call span rather than inserting a new statement, yet the button
still reads "Insert". IntelliJ's `CvsComposerDialog` gets this right for both modes:
`setOKButtonText(editMode || completing ? "Apply" : "Insert")` (CvsComposerDialog.java:104). The
mismatch is user-facing exactly in the phase this round is about ("composer discoverability") — a
user completing `CVS(name$` and seeing an "Insert" button has no visual cue that clicking it
replaces their own unfinished call rather than inserting a second one next to it.
**Fix:** Mirror the IntelliJ label logic in the webview's `init` handler:
```js
// in the 'init' branch, alongside the existing heading/str-hint updates:
$('insert').textContent = (editMode || completing) ? 'Apply' : 'Insert';
```
and post `editMode`/`completing` (already sent) is sufficient — no extension-host change needed.
Add a `cvs-composer-ui.test.ts` source assertion (in the style of the existing
`cvs-composer-webview.ts source assertions` describe block) so a future edit can't silently drop
the label swap again.

## Info

### IN-01: `runComposeCvsCommand` decodes the same call twice on the hard-stop-reason path

**File:** `bbj-vscode/src/cvs-composer-ui.ts:42-65`
**Issue:** When the cursor sits on a `CVS(...)` call whose mask is a non-literal expression or
uses undocumented bits, `cvsPanelArgAt` (line 52) internally calls `decodeCvsCall` and returns
`undefined` (neither of its two branches matches a hard-stop reason), after which the caller calls
`decodeCvsCall` again (line 57) purely to read `.reason` for the message. `decodeCvsCall` is cheap
(single-line regex/scan, no LSP round trip in the VS Code process), so this isn't a performance
problem, but it is duplicated logic that a future refactor of either function could silently
desync (e.g. if `cvsPanelArgAt` started returning a reason string alongside `undefined`, this call
site would still re-derive its own).
**Fix:** Have `cvsPanelArgAt` return the raw `CvsDecodeCallResult` (or at least its `reason`)
alongside `undefined`, or expose a small helper that returns `{ result, panelArg }` so
`runComposeCvsCommand` never needs a second `decodeCvsCall` call for the same cursor position.

---

_Reviewed: 2026-09-12T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
