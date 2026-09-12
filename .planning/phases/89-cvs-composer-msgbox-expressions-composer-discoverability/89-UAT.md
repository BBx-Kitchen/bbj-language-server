---
status: testing
phase: 89-cvs-composer-msgbox-expressions-composer-discoverability
source: [89-VERIFICATION.md]
started: 2026-09-12T15:15:00Z
updated: 2026-09-12T15:15:00Z
---

Round 2 — re-test of gap G-89-3 after gap-closure plans 89-14, 89-15 and 89-16.
Round 1 (3 passed, 1 issue: G-89-3 on test 3) is preserved in git: `e9ec533d` (results) and `f2d54795` (root causes).

Artifacts under test (built from the final code tree — no bbj-vscode/bbj-intellij change since the build commit `66dbe20d`):
- VS Code: `/tmp/bbj-lang.vsix` (sha256 `84cb7382374695daec7007c13f4776709ba7baa63c79e23f327fd42da892475d`)
- IntelliJ: `bbj-intellij/build/distributions/bbj-intellij-0.1.0.zip` (sha256 `81d007a02e427850f1b268c5fbdc0d42862f9b1cdac5262f722604f998570e44`)
Rebuild both before testing if any code-review fix (89-REVIEW.md WR-01/IN-01) lands first.

## Current Test

number: 1
name: IntelliJ unfinished CVS() call opens the Complete CVS() call composer
expected: |
  A `Complete CVS() call` dialog opens with no error notice for every unfinished-call entry point; the string field is editable (empty, then prefillable with typed text like `name$`), there is no assign-to field, and OK stays disabled while the string is empty. The eight operations still render as one flat checkbox list with no byte-group headers and no scroll pane; the chars field stays visible but greyed while no chars-customizable bit is checked, with its BBj 19.0/19.10 tooltip; OK stays disabled until the first preview resolves. Applying leaves exactly one complete CVS() call on each line — never a nested `CVS(CVS(`. QA/FULL-TEST-CHECKLIST.md row 25 step 5.
awaiting: user response

## Tests

### 1. IntelliJ unfinished CVS() call opens the Complete CVS() call composer
steps: In IntelliJ, with the plugin zip above installed fresh: type `a$ = CVS(` (editor auto-closes the parenthesis) and press Alt+Enter choosing `Configure CVS() options…`; repeat on `b$ = CVS(name$` via the editor context menu. Also re-run round 1 test 3's original three entry points (Alt+Enter, context menu, Compose CVS() cue) on a complete call.
expected: A `Complete CVS() call` dialog opens with no error notice for every unfinished-call entry point; the string field is editable (empty, then prefillable with typed text like `name$`), there is no assign-to field, and OK stays disabled while the string is empty. The eight operations still render as one flat checkbox list with no byte-group headers and no scroll pane; the chars field stays visible but greyed while no chars-customizable bit is checked, with its BBj 19.0/19.10 tooltip; OK stays disabled until the first preview resolves. Applying leaves exactly one complete CVS() call on each line — never a nested `CVS(CVS(`. QA/FULL-TEST-CHECKLIST.md row 25 step 5.
result: [pending]

### 2. VS Code unfinished CVS() call opens the complete-the-call panel
steps: In VS Code, with the VSIX above installed fresh: on a new line type `a$ = CVS(name$`, press Ctrl+. (lightbulb) and choose `Complete CVS() call…`, check bits 1 and 4, and insert. On another new line type `b$ = CVS(` and run `Compose CVS() (visual)…` from the editor context menu; while that panel is open, type more characters at the end of the `b$` line, then press Insert.
expected: The lightbulb offers `Complete CVS() call…`; applying yields `a$ = CVS(name$, 5)`. The context menu opens the same complete-the-call panel for the `b$` call rather than inserting a nested call. Insert after the line changed shows `The CVS() call changed since the composer opened; nothing was applied.` and leaves the line unchanged. No `Compose CVS()` cue appears above either unfinished line. QA/FULL-TEST-CHECKLIST.md row 19 step 5.
result: [pending]

## Summary

total: 2
passed: 0
issues: 0
pending: 2
skipped: 0
blocked: 0

## Gaps
