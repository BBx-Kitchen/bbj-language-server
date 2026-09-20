---
created: 2026-09-20T12:00:00.000Z
title: The server status log line prints a stale previous status
area: intellij-server-lifecycle
severity: minor
files:

  - bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjServerService.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/ExpectedStopGuard.java
---

## Problem

`BbjServerService.updateStatus` logs and classifies with `previousStatus` before the line that advances it (`previousStatus = currentStatus; currentStatus = status`), so the value is two transitions old: the log shows "started -> started" and "stopping -> stopping". The same two-behind value is the input to `ExpectedStopGuard.classify`; whether crash classification depends on that by design or by accident is unverified.

## What's needed

Decide what `classify` should receive, check `ExpectedStopGuard` and its tests, then make the log line print the real from-state (`currentStatus`). Do not change the classifier input without a test that pins the intended behaviour.

See `.planning/debug/resolved/restart-duplicate-node-launches.md` and `.planning/debug/resolved/bbj-language-server-does-not-s.md`.
