---
created: 2026-09-20T12:00:00.000Z
title: Report two LSP4IJ upstream bugs found during the Windows restart diagnosis
area: upstream
severity: minor
files:

  - bbj-intellij/build.gradle.kts
---

## Problem

Found against lsp4ij 0.21.0: (1) `LanguageServerWrapper.serverError` is cleared only after a start fully initialises (line 510), so until then every `getInitializedServer()` re-enters `start()`, stops the still-initialising attempt and launches another process -- Search Everywhere drives that once per keystroke; (2) `ServerStatus.stopped` never reaches a plugin's language client after an unexpected stop, because the client is nulled first. Also worth mentioning: a response lsp4j cannot deserialise drops the connection silently, with no log line.

## What's needed

File both at redhat-developer/lsp4ij with the message-id evidence from the resolved debug session. Outward-facing: the maintainer files or approves the text.

See `.planning/debug/resolved/restart-duplicate-node-launches.md` and `.planning/debug/resolved/bbj-language-server-does-not-s.md`.
