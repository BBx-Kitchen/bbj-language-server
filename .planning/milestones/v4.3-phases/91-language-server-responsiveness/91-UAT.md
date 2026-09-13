---
status: complete
phase: 91-language-server-responsiveness
source: [91-VERIFICATION.md]
started: 2026-09-13T02:00:00Z
updated: 2026-09-13T05:45:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Live java-interop outage and recovery in VS Code (D-14)

Artifacts rebuilt on request from `e52e5e50` (same source tree as `d955379f`, after code-review fixes 2ca423ff, 59befa50), 2026-09-13T05:31Z:
- VS Code: `/tmp/bbj-lang.vsix`, sha256 `31ecff5a2a82cee62c89c193e75170850449eb5b8e08eec03fc41703f9c31aab`, already installed into VS Code (ext test) by `bbj-ext-install`
- IntelliJ (`clean buildPlugin`): `bbj-intellij/build/distributions/bbj-intellij-0.1.0.zip`, sha256 `15b4c0a416d9e059c8a4531a3ab0060d72c966d07b980c6fd0bc3b73a6945f39`
- Both bundles' `main.cjs` are byte-identical to `bbj-vscode/out/language/main.cjs` and contain the breaker marker `Java interop service unavailable (circuit open)` (count 1 each)

If any code changes before this test runs, rebuild both first: `npm --prefix /home/coder/repos/bbj-language-server/bbj-vscode run build`, `bbj-ext-install`, and `/home/coder/repos/bbj-language-server/bbj-intellij/gradlew -p /home/coder/repos/bbj-language-server/bbj-intellij clean buildPlugin --console=plain -q`.

Steps, in VS Code (ext test) after reloading the window:
1. With BBjServices running, open a `.bbj` file containing `use java.util.HashMap`, `declare HashMap m!` and `m! = new HashMap()`. Wait until diagnostics settle.
2. Stop BBjServices.
3. Add `use java.util.concurrent.ConcurrentSkipListMap`, `declare ConcurrentSkipListMap a!`, `use java.util.concurrent.LinkedTransferQueue`, `declare LinkedTransferQueue b!`, `use java.util.concurrent.Phaser`, `declare Phaser c!`. Keep typing and hovering normally for about ten seconds.
4. Start BBjServices, wait until it is fully up, then wait at least 30 more seconds.
5. Without typing and without Refresh Java Classes, move the caret onto `ConcurrentSkipListMap` in its `declare` line. If nothing changes within a few seconds, move it off and back once more.

expected: Steps 2-3 show exactly one connection-error popup for the whole outage, no multi-second freeze, and unresolved-class diagnostics on the three new declare lines. Steps 4-5 clear those diagnostics within about 20 seconds with no popup or information message, no edit and no Refresh Java Classes. Recovery is request-driven (no background timer), so a caret move is the allowed trigger; record the observed behaviour either way.
result: pass

## Summary

total: 1
passed: 1
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps
