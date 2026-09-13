---
status: complete
phase: 89-cvs-composer-msgbox-expressions-composer-discoverability
source: [89-VERIFICATION.md]
started: 2026-09-12T15:15:00Z
updated: 2026-09-12T15:14:48Z
---

Round 2 — re-test of gap G-89-3 after gap-closure plans 89-14, 89-15 and 89-16.
Round 1 (3 passed, 1 issue: G-89-3 on test 3) is preserved in git: `e9ec533d` (results) and `f2d54795` (root causes).

Artifacts under test (rebuilt on request 2026-09-12 15:08Z at `deb25b4a` — no bbj-vscode/bbj-intellij change since `66dbe20d`; IntelliJ via `clean buildPlugin`, bundled `main.cjs` byte-identical to `bbj-vscode/out/language/main.cjs`):
- VS Code: `/tmp/bbj-lang.vsix` (sha256 `8111f52202b9fe4671a5260133dc8fe0f05c2f0b6a80ea15241791050ec0fc44`)
- IntelliJ: `bbj-intellij/build/distributions/bbj-intellij-0.1.0.zip` (sha256 `55b3f52fed2bb9577a35381216f95249614fcd91037cbc96c53d5002ac3c2f60`)
Rebuild both before testing if any code-review fix (89-REVIEW.md WR-01/IN-01) lands first.

## Current Test

[testing complete]

## Tests

### 1. IntelliJ unfinished CVS() call opens the Complete CVS() call composer
steps: In IntelliJ, with the plugin zip above installed fresh: type `a$ = CVS(` (editor auto-closes the parenthesis) and press Alt+Enter choosing `Configure CVS() options…`; repeat on `b$ = CVS(name$` via the editor context menu. Also re-run round 1 test 3's original three entry points (Alt+Enter, context menu, Compose CVS() cue) on a complete call.
expected: A `Complete CVS() call` dialog opens with no error notice for every unfinished-call entry point; the string field is editable (empty, then prefillable with typed text like `name$`), there is no assign-to field, and OK stays disabled while the string is empty. The eight operations still render as one flat checkbox list with no byte-group headers and no scroll pane; the chars field stays visible but greyed while no chars-customizable bit is checked, with its BBj 19.0/19.10 tooltip; OK stays disabled until the first preview resolves. Applying leaves exactly one complete CVS() call on each line — never a nested `CVS(CVS(`. QA/FULL-TEST-CHECKLIST.md row 25 step 5.
result: pass

### 2. VS Code unfinished CVS() call opens the complete-the-call panel
steps: In VS Code, with the VSIX above installed fresh: on a new line type `a$ = CVS(name$`, press Ctrl+. (lightbulb) and choose `Complete CVS() call…`, check bits 1 and 4, and insert. On another new line type `b$ = CVS(` and run `Compose CVS() (visual)…` from the editor context menu; while that panel is open, type more characters at the end of the `b$` line, then press Insert.
expected: The lightbulb offers `Complete CVS() call…`; applying yields `a$ = CVS(name$, 5)`. The context menu opens the same complete-the-call panel for the `b$` call rather than inserting a nested call. Insert after the line changed shows `The CVS() call changed since the composer opened; nothing was applied.` and leaves the line unchanged. No `Compose CVS()` cue appears above either unfinished line. QA/FULL-TEST-CHECKLIST.md row 19 step 5.
result: pass

## Summary

total: 2
passed: 2
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps

[none]
