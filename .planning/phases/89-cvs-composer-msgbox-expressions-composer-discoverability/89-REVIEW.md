---
phase: 89-cvs-composer-msgbox-expressions-composer-discoverability
reviewed: 2026-09-12T00:00:00Z
depth: standard
files_reviewed: 55
files_reviewed_list:
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjComposeCvsAction.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjComposeSetoptsAction.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjOpenComposerAtAction.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/BbjComposerServer.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ComposerLauncher.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ComposerLensKinds.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ComposerModels.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ConfigureCvsIntention.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/CvsComposerDialog.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/DecodeEquality.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/MsgboxComposerDialog.java
  - bbj-intellij/src/main/resources/intentionDescriptions/ConfigureCvsIntention/after.bbj.template
  - bbj-intellij/src/main/resources/intentionDescriptions/ConfigureCvsIntention/before.bbj.template
  - bbj-intellij/src/main/resources/intentionDescriptions/ConfigureCvsIntention/description.html
  - bbj-intellij/src/main/resources/META-INF/plugin.xml
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/actions/BbjComposeCvsActionSourceGuardTest.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/actions/BbjOpenComposerAtActionSourceGuardTest.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerApplyGuardSourceGuardTest.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerDialogRefreshSourceGuardTest.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerFlowTest.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerIntentionPreviewSourceGuardTest.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerLauncherChainSourceGuardTest.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerLensCommandContractTest.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerLensKindsTest.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerModelsJsonBoundaryTest.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerReplaceBannerSourceGuardTest.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerRequestContractTest.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/DecodeEqualityTest.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/config/BbjConfigFileTypeRegistrationTest.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/Lsp4ijCouplingCanaryTest.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/Lsp4ijImportAllowlistTest.java
  - bbj-vscode/package.json
  - bbj-vscode/src/addchildwindow-composer-ui.ts
  - bbj-vscode/src/addwindow-composer-ui.ts
  - bbj-vscode/src/composer-lens-command.ts
  - bbj-vscode/src/composer-lens-contract.ts
  - bbj-vscode/src/cvs-composer.ts
  - bbj-vscode/src/cvs-composer-ui.ts
  - bbj-vscode/src/cvs-composer-webview.ts
  - bbj-vscode/src/extension.ts
  - bbj-vscode/src/language/bbj-document-builder.ts
  - bbj-vscode/src/language/bbj-hover-handler.ts
  - bbj-vscode/src/language/bbj-module.ts
  - bbj-vscode/src/language/composer-codelens-handler.ts
  - bbj-vscode/src/language/composer-codelens.ts
  - bbj-vscode/src/language/composer-commands.ts
  - bbj-vscode/src/language/lib/functions.bbl
  - bbj-vscode/src/language/lib/functions.ts
  - bbj-vscode/src/language/main.ts
  - bbj-vscode/src/msgbox-composer.ts
  - bbj-vscode/src/msgbox-composer-ui.ts
  - bbj-vscode/src/msgbox-composer-webview.ts
  - bbj-vscode/src/setopts-composer-ui.ts
  - bbj-vscode/test/bbj-document-builder-config.test.ts
  - bbj-vscode/test/composer-codelens-handler.test.ts
  - bbj-vscode/test/composer-codelens.test.ts
  - bbj-vscode/test/composer-commands.test.ts
  - bbj-vscode/test/composer-cue-single-source.test.ts
  - bbj-vscode/test/composer-lens-command.test.ts
  - bbj-vscode/test/cvs-composer.test.ts
  - bbj-vscode/test/cvs-composer-ui.test.ts
  - bbj-vscode/test/extension-activation.test.ts
  - bbj-vscode/test/functional/installed-extension-e2e.test.ts
  - bbj-vscode/test/msgbox-composer.test.ts
  - bbj-vscode/test/msgbox-composer-ui.test.ts
  - bbj-vscode/test/validation-function-calls.test.ts
  - examples/issue650-composer-cues.bbj
  - QA/FULL-TEST-CHECKLIST.md
findings:
  critical: 1
  warning: 3
  info: 2
  total: 6
status: issues_found
---

# Phase 89: Code Review Report

**Reviewed:** 2026-09-12T00:00:00Z
**Depth:** standard
**Files Reviewed:** 68 (listed above; several are unchanged test/doc files pulled in for cross-reference)
**Status:** issues_found

## Summary

Reviewed the server-side composer codeLens cue (`composer-codelens.ts`/`composer-codelens-handler.ts`), the new CVS() composer (VS Code + IntelliJ), the MSGBOX constant-sum decode/compose-and-replace widening, the `bbx-config` document routing (`bbj-document-builder.ts`, `bbj-hover-handler.ts`), and the IntelliJ `bbj.openComposerAt` click-through.

The codeLens cue provider, the bounded codeLens/hover handlers, the `bbx-config` build-filter, and the IntelliJ stale-edit-guard wiring (`StaleEditGuard` + `DecodeEquality`, pinned by several `*SourceGuardTest`s) are well constructed and consistently tested — cancellation, budget-expiry, and re-parse-avoidance are all covered by targeted tests that pass by construction.

The one serious defect found is a cross-client parity gap: **the VS Code MSGBOX composer applies an edit-in-place write with no stale-edit re-verification**, while the IntelliJ counterpart for the exact same flow explicitly guards it (`StaleEditGuard` + `DecodeEquality::sameMsgbox`), and the VS Code CVS() composer added in this same phase also guards it (`cvsCallStillMatches`). This phase's own `decodeMsgboxCall` widening (the new "compose-and-replace" mode) increases the population of MSGBOX calls that reach this unguarded write path, so the risk surface grew in this phase even though the missing guard itself predates it.

## Critical Issues

### CR-01: VS Code MSGBOX composer writes without re-verifying the target call is unchanged

**File:** `bbj-vscode/src/msgbox-composer-webview.ts:105-121`
**Issue:**
`openMsgboxComposerPanel`'s `insert` message handler applies the edit unconditionally:
```ts
case 'insert': {
    if (!msg.payload) break;
    const r = build(msg.payload);
    if (!r.valid) break;
    const edit = new vscode.WorkspaceEdit();
    if (editMode && arg?.target) {
        const uri = vscode.Uri.parse(arg.target.uri);
        const range = new vscode.Range(arg.target.line, arg.target.callStart, arg.target.line, arg.target.callEnd);
        edit.replace(uri, range, r.statement);
    } else if (insertUri && insertPosition) {
        edit.insert(insertUri, insertPosition, r.statement);
    }
    await vscode.workspace.applyEdit(edit);
    panel.dispose();
    break;
}
```
`arg.target` (`MsgboxPanelArg.target`) carries only `{ uri, line, callStart, callEnd, trailingArgs }` — unlike `CvsEditTarget` (`cvs-composer-webview.ts`), there is no captured `callText` and no equivalent of `cvsCallStillMatches` called before `applyEdit`. If the user edits the document (anywhere that shifts or changes the text at `[callStart, callEnd)` on `line`) while the non-modal "Beside" webview panel is still open — trivially possible since the panel does not block editing — clicking Insert/Apply silently overwrites whatever text now occupies that byte range with the newly composed `MSGBOX(...)` statement. This is a real data-loss/incorrect-behavior risk, not merely a race in theory: the webview panel is deliberately non-modal (`preserveFocus: false` but no modal lock), so the user is expected to be able to keep editing.

This phase concretely widens the population of calls that reach this unguarded write: before this phase, `decodeMsgboxCall`'s only edit path was a re-configurable integer/constant-sum literal (`git diff` confirms `msgbox-composer-ui.ts`'s Code Action provider used to `return []` for any other options expression — no edit offered at all). This phase's new "compose-and-replace" branch (`msgbox-composer.ts`'s `decodeMsgboxCall`, `info.args.length >= 2` fallback) now offers "Compose MSGBOX options (replaces expression)…" for *any* MSGBOX call with an undecodable second argument (a variable, a function call, an arbitrary expression) and replaces the **entire call span** on Apply — previously such calls had no edit action at all, so there was no overwrite risk for them.

The IntelliJ side of this exact flow (`ComposerLauncher.openMsgbox` in `ComposerLauncher.java`) does guard it correctly, via `StaleEditGuard.applyIfUnchanged(..., DecodeEquality::sameMsgbox, ...)`, and `ComposerApplyGuardSourceGuardTest.java` explicitly pins that every IntelliJ edit flow (MSGBOX included) reaches the guard. The VS Code MSGBOX webview has no matching mechanism at all.

**Fix:** Mirror `cvs-composer-webview.ts`'s guard: capture the call's verbatim text in `MsgboxEditTarget` (add a `callText: string` field, populated in `msgbox-composer-ui.ts`'s `msgboxPanelArgFromDecode`), and before `edit.replace(...)`, re-check the current document's text at `[callStart, callEnd)` on `line` still equals `callText` (analogous to `cvsCallStillMatches`); on mismatch, `vscode.window.showWarningMessage(...)` and abort, exactly like `cvs-composer-webview.ts`'s `STALE_CALL_TEXT` path.

## Warnings

### WR-01: CSP nonce generated with `Math.random()`, not a CSPRNG

**File:** `bbj-vscode/src/cvs-composer-webview.ts:294-301` (new in this phase); also present pre-existing in `bbj-vscode/src/msgbox-composer-webview.ts:394-401`
**Issue:** The nonce that the webview's Content-Security-Policy relies on (`script-src 'nonce-${nonce}'`) is generated with `Math.random()`:
```ts
function getNonce(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let text = '';
    for (let i = 0; i < 32; i++) {
        text += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return text;
}
```
`Math.random()` is not cryptographically secure; a nonce built from it is theoretically predictable, weakening the anti-injection guarantee the CSP nonce is meant to provide. This is a newly-authored file in this phase (`cvs-composer-webview.ts`, 89-05) that copies a pre-existing weak pattern from `msgbox-composer-webview.ts` rather than fixing it.
**Fix:** Use Node's `crypto.randomBytes`/`crypto.randomUUID()` (available in the extension host) to generate the nonce, e.g. `crypto.randomBytes(16).toString('base64')`.

### WR-02: `getNonce()` duplicated verbatim across webview modules

**File:** `bbj-vscode/src/cvs-composer-webview.ts:294-301`, `bbj-vscode/src/msgbox-composer-webview.ts:394-401` (and, per the existing pattern, other `*-composer-webview.ts` files)
**Issue:** The exact same nonce-generation helper is copy-pasted per webview module instead of being factored into a shared utility. This is how the weak `Math.random()` pattern propagated into the new CVS() webview (WR-01) — a single shared helper would make it a one-line fix instead of an N-file grep-and-fix.
**Fix:** Extract a single `getNonce()` into a shared module (e.g. `webview-nonce.ts`) and import it from every composer webview.

### WR-03: `decodeMsgboxCall`/`decodeCvsCall`'s "closed sum" recognizers are vulnerable to 32-bit bitwise coercion on pathological literal sums

**File:** `bbj-vscode/src/cvs-composer.ts:102-113` (`parseCvsLiteralSum`), `bbj-vscode/src/cvs-composer.ts:214` (`decodeCvsCall`'s unknown-bits check), `bbj-vscode/src/msgbox-composer.ts:496-522` (`parseMsgboxOptionsSum`)
**Issue:** `parseCvsLiteralSum` accumulates via ordinary `+` on JS numbers with no upper-bound check, and `decodeCvsCall` then tests `(sum & ~CVS_KNOWN_MASK) !== 0` to decide editability. JS's `&` operator applies `ToInt32` (modulo 2^32) before comparing. A source literal like `CVS(a$, 4294967300)` (`4294967296 + 4`, i.e. 2^32 + 4) is accepted by `parseCvsLiteralSum` as `4294967300`, but `4294967300 & ~255` evaluates as `4 & ~255 === 0`, so the call is reported `editable: true` with `bits: [4]` — silently discarding the out-of-range magnitude rather than reporting `unknown-bits`. The same class of coercion applies to `parseMsgboxOptionsSum`'s summed integer literals feeding into `decode()`'s bitwise tests in `msgbox-composer.ts`. This requires a deliberately-unrealistic BBj literal to trigger and causes no data loss (the composed statement is always re-derived from the decoded catalog bits, never from the original literal text), but it is a genuine correctness gap in the "safely decodable" boundary these functions are documented to enforce exactly.
**Fix:** Reject (return `undefined`/not-editable) when the running sum exceeds `Number.MAX_SAFE_INTEGER` bounds relevant here — practically, reject any sum `> 0xFFFFFFFF` (or even `> CVS_KNOWN_MASK`/`> highest documented MSGBOX bit`) before applying any bitwise operator to it.

## Info

### IN-01: `BBjDocumentBuilder.update`'s config filter does not apply to the `deleted` list

**File:** `bbj-vscode/src/language/bbj-document-builder.ts:77-83`
**Issue:** `update` filters `changed` through `isBuildableDocumentUri` but passes `deleted` straight through to `super.update(buildableChanged, deleted, cancelToken)` unfiltered. Since a `bbx-config` document is (by this same phase's design) never added to `langiumDocuments` in the first place, deleting one is very likely a harmless no-op in Langium's base implementation — but the asymmetry is worth naming explicitly given how carefully `changed` is filtered right next to it, and it is untested (the accompanying `bbj-document-builder-config.test.ts` only exercises `deleted` alongside a still-open config uri in `changed`, not a config uri appearing only in `deleted`).
**Fix:** Either add a test asserting a config-only `deleted` entry is harmless, or filter `deleted` the same way as `changed` for symmetry and to remove the implicit reliance on the base class's un-pinned behavior.

### IN-02: `MsgboxPanelArg.target` and `CvsEditTarget` carry different shapes for the same conceptual "edit-in-place target"

**File:** `bbj-vscode/src/msgbox-composer-webview.ts:20-22`, `bbj-vscode/src/cvs-composer-webview.ts:22-31`
**Issue:** `CvsEditTarget` was clearly designed with the staleness guard in mind (`callText` field, `cvsCallStillMatches` helper) while `MsgboxPanelArg.target` has no equivalent field. Beyond enabling CR-01, this makes the two composer modules diverge in a way that isn't obviously intentional (there's no doc comment explaining why MSGBOX doesn't need what CVS needs — and per CR-01's analysis, it does).
**Fix:** Covered by CR-01's fix; noted separately here since it's also a maintainability/consistency issue independent of the correctness risk.

---

_Reviewed: 2026-09-12T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
