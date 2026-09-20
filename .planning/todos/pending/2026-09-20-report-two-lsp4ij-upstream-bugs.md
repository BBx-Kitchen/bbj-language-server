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
- C (not ready): `ServerStatus.stopped` not reaching the language client after an unexpected stop — source
  reading only; may be a documentation matter rather than a bug.

Corrected since this todo was first written: a reply lsp4j cannot deserialise does NOT drop the connection.
A local probe showed lsp4j logs SEVERE, keeps listening and leaves the request pending. Which LSP4IJ path
stopped the server after our malformed reply was never captured; the draft says so and no report claims it.

## What's needed

Maintainer reviews the draft, checks A and B against LSP4IJ `main` and existing issues, then files (or
approves filing). Outward-facing: nothing is filed without that approval.
