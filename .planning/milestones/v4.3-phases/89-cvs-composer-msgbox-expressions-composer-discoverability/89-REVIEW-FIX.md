---
phase: 89-cvs-composer-msgbox-expressions-composer-discoverability
fixed_at: 2026-09-12T12:30:00Z
review_path: .planning/phases/89-cvs-composer-msgbox-expressions-composer-discoverability/89-REVIEW.md
iteration: 1
findings_in_scope: 4
fixed: 4
skipped: 0
status: all_fixed
---

# Phase 89: Code Review Fix Report

**Fixed at:** 2026-09-12T12:30:00Z
**Source review:** .planning/phases/89-cvs-composer-msgbox-expressions-composer-discoverability/89-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 4 (CR-01, WR-01, WR-02, WR-03)
- Fixed: 4
- Skipped: 0

## Fixed Issues

### CR-01: VS Code MSGBOX composer writes without re-verifying the target call is unchanged

**Files modified:** `bbj-vscode/src/msgbox-composer-webview.ts`, `bbj-vscode/src/msgbox-composer-ui.ts`, `bbj-vscode/src/composer-lens-command.ts`, `bbj-vscode/test/msgbox-composer-ui.test.ts`, `bbj-vscode/test/composer-lens-command.test.ts`
**Commit:** f2f35909
**Applied fix:** Mirrored the CVS() composer's staleness guard. Added a `callText: string` field to a new named `MsgboxEditTarget` interface (replacing the previous inline `target` shape on `MsgboxPanelArg`), populated it in `msgboxPanelArgFromDecode` (which now also takes the line text as a parameter, matching `cvsPanelArgAt`'s shape) by slicing the decoded call span out of the current line text, and threaded that through both call sites (`MsgboxCodeActionProvider` and the `bbj.openComposerAt` cue-click handler). Before `edit.replace(...)` in `openMsgboxComposerPanel`'s `insert` handler, the current document text at `[callStart, callEnd)` is re-checked against the captured `callText` via a new `msgboxCallStillMatches` helper; on a mismatch or missing document, a warning ("The MSGBOX() call changed since the composer opened; nothing was applied.") is shown and the edit is aborted instead of applied. Added regression tests mirroring `cvs-composer-ui.test.ts`'s coverage: `msgboxCallStillMatches` true/false, and `openMsgboxComposerPanel` EDIT-mode tests for the unchanged-call (writes + disposes), missing-document (warns, no write), and changed-call-text (warns, no write) cases.

### WR-01: CSP nonce generated with `Math.random()`, not a CSPRNG

**Files modified:** `bbj-vscode/src/webview-nonce.ts` (new), `bbj-vscode/src/cvs-composer-webview.ts`, `bbj-vscode/src/msgbox-composer-webview.ts`, `bbj-vscode/src/setopts-composer-webview.ts`, `bbj-vscode/src/addwindow-composer-webview.ts`, `bbj-vscode/src/addchildwindow-composer-webview.ts`, `bbj-vscode/src/setopts-tristate-webview.ts`
**Commit:** b1005e5d
**Applied fix:** Fixed together with WR-02 (same root cause/same commit) — see below.

### WR-02: `getNonce()` duplicated verbatim across webview modules

**Files modified:** same as WR-01
**Commit:** b1005e5d
**Applied fix:** Found all 6 copies of the identical `getNonce()` helper (a `Math.random()`-driven 32-char generator) via a repo-wide grep of `bbj-vscode/src/**/*.ts`: `cvs-composer-webview.ts`, `setopts-composer-webview.ts`, `addwindow-composer-webview.ts`, `addchildwindow-composer-webview.ts`, `msgbox-composer-webview.ts`, `setopts-tristate-webview.ts`. Extracted one `getNonce()` into a new shared module `bbj-vscode/src/webview-nonce.ts`, implemented with Node's `crypto.randomBytes(16).toString('base64')` (a CSPRNG, resolving WR-01 for all six files at once), and replaced each local definition with an import. Confirmed via grep that no test or source-guard file pins the per-file `getNonce`/`Math.random` implementation (the one `Math.random()` hit outside the webviews, in `test/code-action.test.ts`, is an unrelated random test-document URI, not a nonce), so no other files needed updating.

### WR-03: `decodeMsgboxCall`/`decodeCvsCall`'s "closed sum" recognizers are vulnerable to 32-bit bitwise coercion on pathological literal sums

**Files modified:** `bbj-vscode/src/cvs-composer.ts`, `bbj-vscode/src/msgbox-composer.ts`, `bbj-vscode/test/cvs-composer.test.ts`, `bbj-vscode/test/msgbox-composer.test.ts`
**Commit:** 442f706e
**Applied fix:** Added an upper-bound check (`sum > 0xFFFFFFFF` rejects, returning `undefined`) to the running-sum accumulation loop in both `parseCvsLiteralSum` and `parseMsgboxOptionsSum`, so a pathological literal like `CVS(a$, 4294967300)` (2^32 + 4) is rejected before it ever reaches a bitwise operator, instead of being silently reduced modulo 2^32 and reported as a small, safely-editable mask. Added a matching defense-in-depth guard directly in `decodeCvsCall`'s own bitwise "unknown-bits" test. Also found and closed a second, separate vulnerable path while implementing this fix: `msgbox-composer.ts`'s `buildCallInfo` has a bare-integer-literal fast path (`numMatch`) that bypasses `parseMsgboxOptionsSum` entirely for a plain numeric literal argument — added the same `<= 0xFFFFFFFF` bound there, falling through to leave the call undecoded (opening compose-and-replace mode) instead of decoding a wrapped value. Added regression tests for both parsers (accepting the exact `0xFFFFFFFF` boundary, rejecting `2^32`, rejecting a sum that crosses the boundary mid-accumulation) and for both `decodeCvsCall` and `decodeMsgboxCall` end-to-end with the `4294967300` pathological literal from the review, confirming the call now reports not-editable / compose-and-replace instead of decoding bogus small bits.

## Skipped Issues

None — all in-scope findings were fixed.

---

_Fixed: 2026-09-12T12:30:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
