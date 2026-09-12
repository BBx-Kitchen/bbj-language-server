---
status: complete
phase: 89-cvs-composer-msgbox-expressions-composer-discoverability
source: [89-VERIFICATION.md]
started: 2026-09-12T12:09:21Z
updated: 2026-09-12T13:10:00Z
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
  artifacts: []  # Filled by diagnosis
  missing: []    # Filled by diagnosis
