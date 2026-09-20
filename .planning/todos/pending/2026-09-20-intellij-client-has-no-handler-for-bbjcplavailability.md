---
created: 2026-09-20T12:00:00.000Z
title: The IntelliJ client has no handler for the bbj/bbjcplAvailability notification
area: intellij-lsp-client
severity: minor
files:

  - bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/BbjLanguageClient.java
---

## Problem

Every server start logs `WARN GenericEndpoint - Unsupported notification method: bbj/bbjcplAvailability` in idea.log, because the server sends the notification and the IntelliJ language client declares no `@JsonNotification` for it.

## What's needed

Either handle it (surface BBjCPL availability the way VS Code does) or declare a no-op handler so the log stays clean.

See `.planning/debug/resolved/restart-duplicate-node-launches.md` and `.planning/debug/resolved/bbj-language-server-does-not-s.md`.
