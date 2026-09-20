---
created: 2026-09-20T12:00:00.000Z
title: A lost language-server connection is invisible to the plugin's crash detection
area: intellij-server-lifecycle
severity: major
files:

  - bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjServerService.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/BbjLanguageClient.java

audit_acknowledged:
  milestone: v4.4
  at: 2026-09-20
---

## Problem

LSP4IJ detaches the plugin's language client before it publishes `ServerStatus.stopped`, and suppresses that status entirely when a newer start has already installed a context. `ExpectedStopGuard.classify`'s CRASH branch therefore never fires for a real process death or a dropped JSON-RPC connection: a whole Windows session of per-keystroke relaunches produced zero `stopped` transitions and no crash log line, which is why that defect went unnoticed until a maintainer read the LSP trace by hand.

## What's needed

LSP4IJ documents this: `LanguageClientImpl.handleServerStatusChanged` receives only `stopping` and
`started`; to track every status a plugin implements `LSPClientFeatures#handleServerStatusChanged`.
`BbjLanguageClient` overrides the client-side callback, so it can never see `stopped`. Move the status
feed for `BbjServerService.updateStatus` to the `LSPClientFeatures` subclass returned by
`BbjLanguageServerFactory.createClientFeatures()`, re-check `ExpectedStopGuard`'s classification against
the full status sequence it will then receive, and add a source guard plus a coupling canary for the hook.

See `.planning/debug/resolved/lsp4ij-upstream-report-draft.md` (report C, withdrawn) and
`.planning/debug/resolved/restart-duplicate-node-launches.md`.

## 2026-09-20 — first attempt reverted (Phase 97 hand UAT, macOS)

Moving the status feed to `LSPClientFeatures#handleServerStatusChanged` works — `stopped` does reach
`BbjServerService.updateStatus` — but it is not enough. With the full feed a killed process arrives
as `started -> stopping -> stopped`, and `ExpectedStopGuard.classify` only treats `started`/`starting`
as a live predecessor, so the stop is `NOT_A_STOP` and crash handling never runs (19-line `idea.log`
excerpt in `.planning/phases/97-release-0-16-0-milestone-close/97-UAT-ARTIFACTS.md`, Round 1).
LSP4IJ's own deliberate stops (last BBj file closed, project close, idle shutdown) take the same
path, so **status alone cannot separate a crash from a normal stop**; treating `stopping` as live
would raise a false crash and auto-restart on every file close.

Reverted in `8fe7cb72` + `a22b78ad`; the implementation that was tried is `bb0a49f0`, `cb3ce7f8`,
`a2680319` (feed, canary, guards — reusable).

What the real fix needs: a crash signal that does not come from the status sequence — most likely
the exit of the node process observed by the plugin's own connection provider, combined with "no
stop was requested". Also note the crash counter resets on every `started`, so the "crashed twice"
balloon can only fire when the second crash precedes `started`; decide whether that is intended.
Needs its own phase with a design step and a hand UAT that kills the process in a running IDE.
