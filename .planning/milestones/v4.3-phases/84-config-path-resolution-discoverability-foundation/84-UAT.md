---
status: complete
phase: 84-config-path-resolution-discoverability-foundation
source: [84-VERIFICATION.md]
started: 2026-09-06T16:32:11Z
updated: 2026-09-06T19:31:34Z
---

## Current Test

[testing complete]

## Tests

### 1. VS Code QA row 10 — custom-named config file: highlighting, CodeLens, close/reopen, Revert File
expected: Config-file treatment (languageId bbx-config, bbx TextMate highlighting, SETOPTS CodeLens) survives open, close+reopen, and Revert File.
result: pass

### 2. VS Code QA row 11 — SETOPTS composer on the home default while a custom config is configured
expected: With a custom config file configured, opening the home default config.bbx and running the SETOPTS composer shows a non-blocking message naming the active config file's full path before the composer opens on the file actually open.
result: pass
note: hint fires only on the Command Palette entry point; CodeLens/Code Action paths pass an arg and skip it — accepted as matching QA row 11 wording

### 3. IntelliJ QA row 10 — custom-named config file: icon, bbx highlighting, no BBj diagnostics
expected: Pointing the config path at a custom-named file and opening it shows the config icon and bbx highlighting, and the Problems view raises no BBj diagnostics on the file.
result: pass
note: initially reported as not detected; re-check with the gear icon + Language Servers window confirmed correct typing. Tester expected a SETOPTS editor link, which exists only in VS Code — IntelliJ has no SETOPTS composer in this phase.

### 4. IntelliJ QA row 11 — home default config.bbx opens as a config file
expected: With the setting unchanged, config.bbx from the BBj home cfg directory opens with the config icon and bbx highlighting, not as BBj source.
result: pass

### 5. IntelliJ QA row 12 — changing the config path flips both open files without restart
expected: With both the old and new config file open, changing the config path setting immediately flips both: the old file reverts to extension-based typing, the new file becomes the config file type.
result: pass

### 6. IntelliJ missing/unreadable config file balloon
expected: Configuring a non-existent path shows a non-modal balloon naming the exact failing path and stating no prefixes were loaded; it does not repeat for the same path within the session. (No QA-checklist row covers this yet; add one alongside rows 10-12.)
result: pass

### 7. GUI/BUI/DWC run actions against a live custom-named config file, both IDEs
expected: The spawned bbj/bbjcpl process or EM web-run registration receives the resolved config path as -c (or the registered value), never the raw setting, a derived home default, or the EM Config sentinel. (No QA-checklist row covers this yet.)
result: pass
evidence: ps -ef on macOS showed two bbjinit processes (one VS Code, one IntelliJ) each with -c/Users/beff/bbx/barista/sys/config/enu/barista.cfg; GUI run only, BUI/DWC not exercised

### 8. IntelliJ Settings dialog inline config-path validation
expected: Typing a relative path, then a path to a missing file, into the config path field shows a non-blocking inline warning naming the applicable rule (absolute-path or missing-file); Apply still succeeds in every case. (No QA-checklist row covers this yet.)
result: pass

## Summary

total: 8
passed: 8
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps

[none yet]
