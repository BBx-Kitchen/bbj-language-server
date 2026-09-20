---
created: 2026-09-20T12:00:00.000Z
title: Node.js download logs an IllegalStateException for setFraction on an indeterminate indicator
area: intellij-node-download
severity: trivial
files:

  - bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjNodeDownloader.java
---

## Problem

`BbjNodeDownloader.java:101` calls `indicator.setFraction(...)` without ever calling `setIndeterminate(false)` (never called anywhere in the plugin). The platform logs an IllegalStateException trace on every download. Cosmetic; the install is not aborted.

## What's needed

Call `indicator.setIndeterminate(false)` before the first `setFraction`.

See `.planning/debug/resolved/restart-duplicate-node-launches.md` and `.planning/debug/resolved/bbj-language-server-does-not-s.md`.
