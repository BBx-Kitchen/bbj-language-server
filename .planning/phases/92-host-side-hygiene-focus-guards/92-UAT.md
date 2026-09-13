---
status: complete
phase: 92-host-side-hygiene-focus-guards
source: [92-VERIFICATION.md]
started: 2026-09-13T08:10:00Z
updated: 2026-09-13T08:56:10Z
---

## Current Test

[testing complete]

## Tests

### 1. IntelliJ status-bar widgets follow a bare editor-tab switch
expected: |
  Setup: install `bbj-intellij/build/distributions/bbj-intellij-0.1.0.zip` (rebuilt from the final
  Phase 92 tree with `clean buildPlugin`, sha256 5e57a632443365f3002b00409ece82fa10a691ba6dae8086aa2a4b796094f89d)
  via Settings → Plugins → gear → Install Plugin from Disk, and restart the IDE.
  In a project containing a `.bbj` program, a `.bbx` program, a non-BBj file (e.g. README.md or a
  .java file) and `config.bbx`: open all four as tabs and wait for `BBj: Ready`; do not stop or
  restart the server during the steps.
  1. Click the `.bbj` tab → both widgets visible.
  2. Click the non-BBj tab → both disappear immediately.
  3. Click the `config.bbx` tab → both stay hidden.
  4. Click the `.bbx` program tab → both appear.
  5. Click the `.bbj` tab again → both visible.
  Each change happens on the tab click itself, not later. (Tab icon: gear = BBx Config,
  round BBj logo = BBj source.)
result: pass

## Summary

total: 1
passed: 1
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps

[none]
