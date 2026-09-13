---
status: testing
phase: 91-language-server-responsiveness
source: [91-VERIFICATION.md]
started: 2026-09-13T02:00:00Z
updated: 2026-09-13T02:00:00Z
---

## Current Test

number: 1
name: Live java-interop outage and recovery in VS Code (D-14)
expected: |
  During the outage: exactly one "Failed to connect to the Java interop service…" error popup,
  typing/completion/hover stay responsive with no multi-second freeze, and the new declare lines
  show unresolved-class diagnostics. After BBjServices is back: within about 20 seconds of a caret
  move onto an affected class name, those diagnostics clear on their own, with no popup, no edit
  and no Refresh Java Classes.
awaiting: user response

## Tests

### 1. Live java-interop outage and recovery in VS Code (D-14)

Artifacts rebuilt from the final tree `d955379f` (after code-review fixes 2ca423ff, 59befa50):
- VS Code: `/tmp/bbj-lang.vsix`, sha256 `c5f075e497cef35eb0fb2aeaff69adcfb66d57b7705324863e9f1267021cfee1`, already installed into VS Code (ext test) by `bbj-ext-install`
- IntelliJ: `bbj-intellij/build/distributions/bbj-intellij-0.1.0.zip`, sha256 `2b90b12de3bfbdcc5df17d82a4127b18529e84c19a49caebed244c5441e1c66e`
- Both bundles contain the breaker marker `Java interop service unavailable (circuit open)` (count 1 each)

If any code changes before this test runs, rebuild both first: `npm --prefix /home/coder/repos/bbj-language-server/bbj-vscode run build`, `bbj-ext-install`, and `/home/coder/repos/bbj-language-server/bbj-intellij/gradlew -p /home/coder/repos/bbj-language-server/bbj-intellij clean buildPlugin --console=plain -q`.

Steps, in VS Code (ext test) after reloading the window:
1. With BBjServices running, open a `.bbj` file containing `use java.util.HashMap`, `declare HashMap m!` and `m! = new HashMap()`. Wait until diagnostics settle.
2. Stop BBjServices.
3. Add `use java.util.concurrent.ConcurrentSkipListMap`, `declare ConcurrentSkipListMap a!`, `use java.util.concurrent.LinkedTransferQueue`, `declare LinkedTransferQueue b!`, `use java.util.concurrent.Phaser`, `declare Phaser c!`. Keep typing and hovering normally for about ten seconds.
4. Start BBjServices, wait until it is fully up, then wait at least 30 more seconds.
5. Without typing and without Refresh Java Classes, move the caret onto `ConcurrentSkipListMap` in its `declare` line. If nothing changes within a few seconds, move it off and back once more.

expected: Steps 2-3 show exactly one connection-error popup for the whole outage, no multi-second freeze, and unresolved-class diagnostics on the three new declare lines. Steps 4-5 clear those diagnostics within about 20 seconds with no popup or information message, no edit and no Refresh Java Classes. Recovery is request-driven (no background timer), so a caret move is the allowed trigger; record the observed behaviour either way.
result: [pending]

## Summary

total: 1
passed: 0
issues: 0
pending: 1
skipped: 0
blocked: 0

## Gaps
