---
created: 2026-09-20T12:00:00.000Z
title: A lost language-server connection is invisible to the plugin's crash detection
area: intellij-server-lifecycle
severity: major
files:

  - bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjServerService.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/BbjLanguageClient.java
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
