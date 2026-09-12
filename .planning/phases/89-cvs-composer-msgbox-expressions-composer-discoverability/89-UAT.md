---
status: diagnosed
phase: 89-cvs-composer-msgbox-expressions-composer-discoverability
source: [89-VERIFICATION.md]
started: 2026-09-12T12:09:21Z
updated: 2026-09-12T13:25:00Z
---

## Current Test

[testing complete]

## Tests

### 1. VS Code renders and clicks through all five composer cue kinds
expected: Open examples/issue650-composer-cues.bbj in VS Code (installed VSIX) without placing the caret. All five cue kinds (MSGBOX, addWindow, addChildWindow, CVS(), SETOPTS) render as plain-text CodeLens exactly on the applicable lines and nowhere on the mode% CVS line, the interrupted SETOPTS chain, the REM line or the string decoy; clicking each opens the matching composer pre-filled; Cancel leaves the file unchanged.
result: pass

### 2. IntelliJ Code Vision renders and clicks through all five cue kinds
expected: Open the same fixture in IntelliJ inside the plugin's sinceBuild range (BBj plugin + LSP4IJ 0.21.0) without placing the caret. Code Vision entries render for all five kinds, and clicking each opens the matching dialog — CvsComposerDialog, MsgboxComposerDialog (with the compose-and-replace banner on the flags% line, without it on a constant-sum line), the addWindow/addChildWindow dialogs, and the config SETOPTS dialog from the setopts-config cue on a bbx-config-mapped config file. Matches QA/FULL-TEST-CHECKLIST.md rows 23-27.
result: pass

### 3. IntelliJ CVS() composer layout, chars-field greying and OK gating
expected: Open the CVS() composer in IntelliJ via Alt+Enter on a CVS( call, the editor context menu, and the Compose CVS() cue. The eight operations render as one flat checkbox list with no byte-group headers and no scroll pane; the chars field stays visible but greyed out/disabled while no chars-customizable bit is checked, with a tooltip naming BBj 19.0/19.10; OK stays disabled until the first preview resolves.
result: issue
reported: "for an unfinished CVS I get an error: This CVS() call has no mask argument, so there is nothing to compose from - works fine on an existing one. But not while typing it up to CVS( and then pushing alt-enter"
severity: major

### 4. No perceptible typing lag from composer cues on a large file
expected: In a large .bbj file containing many composer calls, type continuously in both VS Code and IntelliJ; there is no noticeable added input lag compared with behavior before Phase 89.
result: pass

## Summary

total: 4
passed: 3
issues: 1
pending: 0
skipped: 0
blocked: 0

## Gaps

- gap_id: G-89-3
  truth: "Alt+Enter on a CVS( call in IntelliJ opens the CVS() composer, including on an unfinished call typed only up to CVS("
  status: failed
  reason: "User reported: for an unfinished CVS I get an error: This CVS() call has no mask argument, so there is nothing to compose from - works fine on an existing one. But not while typing it up to CVS( and then pushing alt-enter"
  severity: major
  test: 3
  root_cause: "Design gap, not a regression: an argument-less or unfinished CVS call (CVS(, CVS(), CVS(a$, CVS(a$,) decodes server-side as found/editable:false/missing-mask with no prefill (cvs-composer.ts:215-216), and IntelliJ openCvs turns every found-but-not-editable result into the error notice and returns (ComposerLauncher.java:654-660), while ConfigureCvsIntention.isAvailable only text-matches cvs( and so offers an intention guaranteed to fail. The plans specified missing-mask as not editable and the early return; D-14 only covered editing an existing call."
  artifacts:
    - path: "bbj-vscode/src/cvs-composer.ts"
      issue: "lines 180-187, 215-216: missing-mask conflates an in-progress call with a complete call lacking a mask; the result carries no prefill or span to compose into"
    - path: "bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ComposerLauncher.java"
      issue: "lines 654-660: every non-editable CVS decode ends in requestFailed; lines 699-714: the blank-composer path inserts at the caret, so reusing it would nest a call inside the partial CVS("
    - path: "bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ConfigureCvsIntention.java"
      issue: "lines 30-32: availability is a text-only cvs( check, so the intention is offered on a call it cannot compose"
    - path: "bbj-vscode/src/cvs-composer-ui.ts"
      issue: "line 35: VS Code lightbulb drops non-editable results, so the same gap exists silently; bbj.composeCvs inserts at the cursor without decoding"
    - path: "bbj-vscode/test/cvs-composer.test.ts, bbj-vscode/test/composer-codelens.test.ts, bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerApplyGuardSourceGuardTest.java"
      issue: "pin current behaviour: closed CVS(a$) as missing-mask (129-131), no cue for it (168), and exact source-guard counts (6 applyIfUnchanged, 6 replaceString, 1 sameCvs, 2 cvsDecodeCall) that a fix will move"
  missing:
    - "Server: a distinct composable decode outcome for an argument-less/unfinished CVS call carrying prefill (string from args[0] if present, no bits, empty chars) and the call span; mirror the fields in the IntelliJ DTO, the JSON-boundary test and DecodeEquality.sameCvs; keep non-literal-mask and unknown-bits as hard stops; decide whether closed CVS(a$) joins this outcome"
    - "IntelliJ openCvs: open CvsComposerDialog for the new outcome (assign-result field hidden) and replace the call span through StaleEditGuard + sameCvs, not insertAtCaret; handle an unterminated call whose span runs to end of line; update the source-guard counts"
    - "VS Code: offer a lightbulb compose action for the new outcome that replaces the partial span, guarded by cvsCallStillMatches; decide cue visibility on half-typed lines and whether bbj.composeCvs becomes position-aware"
    - "Tests for CVS(, CVS(), CVS(a$, CVS(a$, alongside the existing CVS(a$, n%) and CVS(a$, 256) cases; QA/FULL-TEST-CHECKLIST.md row 25 step for typing CVS( then Alt+Enter; update the intention description.html wording"
    - "Consider the analogous MSGBOX( insert-at-caret nesting in the same plan"
  debug_session: ".planning/debug/g-89-3-cvs-composer-unfinished-call.md"
