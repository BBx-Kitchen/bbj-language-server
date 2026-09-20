---
created: 2026-09-20T12:00:00.000Z
title: Report two LSP4IJ upstream bugs found during the Windows restart diagnosis
area: upstream
severity: minor
files:

  - bbj-intellij/build.gradle.kts
---

## Problem

Found against lsp4ij 0.21.0 during the Windows restart diagnosis. Draft text with evidence and a per-report
confidence table: `.planning/debug/resolved/lsp4ij-upstream-report-draft.md`.

- A (ready): `LanguageServerWrapper.stop()` runs its blocking 5 s shutdown via `CompletableFuture.runAsync`
  on the common pool, so `helpAsyncBlocker` executes it inside a ReadAction-holding thread — the same class
  of problem upstream fixed for `start()` in their #1442. Backed by a stack trace from idea.log.
- B (ready, with a stated caveat): while `serverError` is set, every `start()` stops the still-initialising
  previous start and launches another process — one per Search Everywhere keystroke. Backed by the 0.21.0
  source and LSP trace message ids.
- C (withdrawn): `stopped` not reaching the language client is documented upstream behaviour; the fix is
  in our plugin (separate todo).

Established since this todo was first written: LSP4IJ's `ExtendedStreamMessageProducer.fireError` throws on
a reply that cannot be deserialised, by design (their #1238), which ends the listener and triggers the
automatic restart. That is intended and is not reported. A and B were checked against LSP4IJ `main`
(9bdfb68, 2026-09-18): the relevant files are unchanged since 0.21.0.

## What's needed

Maintainer reviews the draft, searches existing upstream issues for A and B, then files (or approves
filing). Outward-facing: nothing is filed without that approval.
