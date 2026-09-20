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

## 2026-09-20 — first attempt reverted (Phase 97)

The one-line fix (pass and print `currentStatus`, delete the `previousStatus` field — `626b8fe3`,
pinned by `d16e7e57`) was reverted together with the crash-detection status-feed move
(`8fe7cb72`), because the two only make sense together. Finding to carry forward: once the full
status feed is in place every stop arrives as `started -> stopping -> stopped`, so the true
from-state at `stopped` is `stopping` — which the classifier does not accept as live. The stale
two-behind value happened to be `started` there. Fix this todo as part of the crash-detection
redesign, not before it.
