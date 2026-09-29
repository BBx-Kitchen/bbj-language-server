---
created: 2026-09-20T19:00:00.000Z
title: Phase 97 code-review follow-ups — download-progress fix is partial, three guards are weak
area: intellij-node-download
resolves_phase: 114
severity: minor
files:

  - bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjNodeDownloader.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/BbjNodeDownloaderSourceGuardTest.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/Lsp4ijOverrideSiteSourceGuardTest.java
  - bbj-vscode/test/functional/issue447-real-interop.test.ts

audit_acknowledged:
  milestone: v4.4
  at: 2026-09-20
---

## Problem

Advisory findings from `.planning/phases/97-release-0-16-0-milestone-close/97-REVIEW.md`, raised after
0.16.0 shipped (no critical findings):

- **WR-01** — `HttpRequests…saveToFile` re-sets the indicator to indeterminate when the response has
  no `Content-Length` (chunked / proxied), so the next `setFraction` logs the same
  `IllegalStateException` the 0.16.0 fix removed. One logged trace per such download; not functional.
- **WR-02** — `BbjNodeDownloaderSourceGuardTest` counts substrings and textual order, so a
  commented-out `setIndeterminate(false)` still passes.
- **WR-03** — the `bbj/bbjcplAvailability` guard is exact for the empty body but comment-unaware for
  the annotation, and does not pin the `Object` parameter type.
- **WR-04** — the rewritten issue447 invariant (`hasCompleteClassIndex() === ensureCompleteClassIndex()`)
  holds by construction, so a broken `getAllClassNames` client path stays green.

## What's needed

Call `indicator.setIndeterminate(false)` inside the progress lambda before each `setFraction`; replace
the two string guards with a reflective check (`getMethod("bbjcplAvailability", Object.class)` +
`ServiceEndpoints.getSupportedMethods`) and a recording-fake sequence test; make issue447 assert a
definitive outcome plus a forced-fallback case. Info items IN-01..IN-03 are in the review file.

## Resolution

- WR-01 (download-progress `IllegalStateException` on chunked responses) and WR-02/WR-03 (the two
  weak `BbjNodeDownloader`/`bbjcplAvailability` guards) closed in phase 114's plan 03:
  `progressReporter(indicator)` now re-asserts `setIndeterminate(false)` before every `setFraction`,
  proven by a `Proxy`-based recording-fake `BbjNodeDownloaderProgressTest`; the `bbjcplAvailability`
  guard is now reflective (`getMethod` + `JsonNotification` annotation value +
  `ServiceEndpoints.getSupportedMethods`).
- WR-04 (the issue447 invariant holding by construction) closed in phase 114's plan 04: a
  `WireRecordingInteropService` seam judges the live capability from the actual wire response,
  with a definitive-outcome case and a forced-fallback case, both hermetic and live.
- The in-IDE download progress-bar visual confirmation (the part no automated test can show) is the
  manual checkpoint in phase 114's final plan.
