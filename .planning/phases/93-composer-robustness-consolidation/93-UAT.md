---
status: testing
phase: 93-composer-robustness-consolidation
source: [93-VERIFICATION.md]
started: 2026-09-18T11:45:00Z
updated: 2026-09-18T11:45:00Z
---

## Setup Required Before Test 1

Both extensions must be built and installed from the **current** tree before any test below is
meaningful — the phase's consolidation touches the IntelliJ plugin and the VS Code language server
together, and testing a stale artefact proves nothing:

```
cd /home/coder/repos/bbj-language-server/bbj-vscode && npm run build
cd /home/coder/repos/bbj-language-server/bbj-intellij && ./gradlew buildPlugin
```

Then install the built VSIX and the IntelliJ plugin zip. If IntelliJ file-type association looks
wrong, check the gear icon in the plugin settings and the Language Servers tool window before
recording a failure.

Automated half already satisfied: `./gradlew test --rerun` → **983 tests, 0 failures, 0 errors**
(observed 2026-09-18, aggregated across 110 JUnit XML files).

## Current Test

number: 1
name: Success criterion #5 — all six composer kinds via all three entry points
expected: |
  No visible change to any dialog's fields, labels, default selections, or the BBj statement/block
  written into the source file, across all six composer kinds and both consolidated
  dialog/intention/action families.
awaiting: user response

## Tests

### 1. Success criterion #5 — all six composer kinds via all three entry points
expected: Open MSGBOX, addWindow, addChildWindow, CVS, SETOPTS, and SETOPTS-in-code composers via all three entry points each (lightbulb intention, editor context-menu action, composer cue click-through). Confirm identical dialogs, defaults, and generated statements to before this phase's consolidation. No visible change to any dialog's fields, labels, default selections, or the BBj statement/block written into the source file.
result: [pending]

### 2. Theme-aware error colour in Light and Darcula
expected: Open a composer dialog in both the Light and Darcula IntelliJ themes. Error text renders in the theme-aware error colour (`NamedColorUtil.getErrorForeground()`), and a stalled preview also renders in that same colour instead of default gray. These are two deliberate colour changes introduced by plan 93-01 — a visible change is the correct outcome here, not a regression.
result: [pending]

### 3. SETOPTS raw-hex field validation message
expected: Type a non-hex character into `SetoptsComposerDialog`'s raw-hex field. The same field-scoped error message appears next to the field and Apply/OK is refused. Message text is byte-identical to the deleted Java copy's wording ("must be 0-9 or A-F, up to 14 digits"); Apply/OK stays disabled until the field is corrected.
result: [pending]

### 4. addWindow / addChildWindow parity after base extraction
expected: Open both addWindow and addChildWindow composers in create and edit mode. Both still open, preview, and write exactly as before the `AddWindowFamilyComposerDialogBase` extraction (93-06), with no change to any label, default value, or generated statement.
result: [pending]

## Summary

total: 4
passed: 0
issues: 0
pending: 4
skipped: 0
blocked: 0

## Gaps
