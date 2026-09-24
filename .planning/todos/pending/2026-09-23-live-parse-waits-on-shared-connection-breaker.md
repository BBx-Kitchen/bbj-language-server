---
created: 2026-09-23
title: Live parse still waits on the shared interop connection (and its circuit breaker) before using its own
area: java-interop
severity: minor
files:

  - bbj-vscode/src/language/java-interop.ts (parseProgram, openParseLane)

audit_acknowledged:
  milestone: v4.5
  at: 2026-09-24
---

## Problem

Phase 105's code review (`.planning/phases/105-live-diagnostics-responsiveness-on-large-workspaces/105-REVIEW.md`,
WR-01) found that `parseProgram()` still awaits the shared connection's `connect()` — and so its
circuit breaker — before trying the dedicated parser connection. While the shared connection is in
a half-open probe window, a live parse can be short-circuited even though its own socket would
succeed.

Deferred by the user on 2026-09-23: fixing it changes the transport the phase's before/after
timings were measured through (`105-MEASUREMENT.md`), so it needs its own change plus a re-check of
a few "after" samples.

## Solution sketch

Let the dedicated lane attempt its own connection independently of the shared connection's breaker
state, falling back to the shared connection only when the lane cannot be opened. Add a test in
`test/java-interop-parse-lane.test.ts` where the shared connection's breaker is open or half-open
and the lane still answers.
