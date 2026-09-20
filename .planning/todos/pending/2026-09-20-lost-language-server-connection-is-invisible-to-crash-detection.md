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

Subscribe to LSP4IJ's `LanguageServerLifecycleManager` listener (or an equivalent signal that outlives the client) and record status synchronously, so an unexpected stop is logged and reaches the crash/auto-restart logic. Add a source guard and a coupling canary for the listener API.

See `.planning/debug/resolved/restart-duplicate-node-launches.md` and `.planning/debug/resolved/bbj-language-server-does-not-s.md`.
