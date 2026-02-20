---
status: complete
phase: 36-settings-plumbing
source: 36-01-SUMMARY.md
started: 2026-02-08T12:00:00Z
updated: 2026-02-08T12:15:00Z
---

## Current Test

[testing complete]

## Tests

### 1. bbj.debug Setting Visible in VS Code
expected: Open VS Code Settings and search "bbj.debug". A checkbox should appear with description about enabling debug logging.
result: pass

### 2. Enable Debug Logging
expected: Check the bbj.debug checkbox. In the Output panel (BBj Language Server channel), you should see "Log level changed to DEBUG" confirming the change took effect immediately without restarting the language server.
result: pass

### 3. Disable Debug Logging
expected: Uncheck the bbj.debug checkbox. Output panel should show "Log level changed to WARN". Debug-level messages should stop appearing.
result: pass

### 4. Quiet Startup
expected: Restart the language server (or reload window) with bbj.debug OFF. During startup, you should see minimal output — no verbose class loading or validation messages. Only errors/warnings if any.
result: skipped
reason: Quiet startup mechanism works (ERROR level until first validation), but effect not observable until Phase 37 migrates 56 console.* calls to logger.*

### 5. Verbose Startup
expected: Set bbj.debug ON, then restart the language server. During startup (after workspace initializes), detailed messages about class loading, validation, etc. should appear in the output channel.
result: pass

## Summary

total: 5
passed: 4
issues: 0
pending: 0
skipped: 1

## Gaps

[none]
