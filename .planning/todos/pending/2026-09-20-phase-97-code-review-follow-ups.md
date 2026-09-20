---
created: 2026-09-20T19:00:00.000Z
title: Phase 97 code-review follow-ups — download-progress fix is partial, three guards are weak
area: intellij-node-download
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
