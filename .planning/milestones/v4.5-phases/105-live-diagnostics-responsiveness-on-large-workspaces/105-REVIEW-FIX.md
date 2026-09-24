---
phase: 105-live-diagnostics-responsiveness-on-large-workspaces
fixed_at: 2026-09-23T15:44:00Z
review_path: .planning/phases/105-live-diagnostics-responsiveness-on-large-workspaces/105-REVIEW.md
iteration: 1
findings_in_scope: 2
fixed: 2
skipped: 0
status: all_fixed
scope_note: >
  Fix scope was explicitly narrowed by the requester to CR-01 and CR-02 only. WR-01 and IN-01 were
  deferred by the requester and were not attempted.
---

# Phase 105: Code Review Fix Report

**Fixed at:** 2026-09-23T15:44:00Z
**Source review:** .planning/phases/105-live-diagnostics-responsiveness-on-large-workspaces/105-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 2 (CR-01, CR-02 — WR-01 and IN-01 explicitly deferred, not in scope)
- Fixed: 2
- Skipped: 0

## Fixed Issues

### CR-01: The event-armed live-parse trigger reaches `bbx-config` documents that `update()` explicitly excludes

**Files modified:** `bbj-vscode/src/language/bbj-document-builder.ts`, `bbj-vscode/test/live-parse-scheduling.test.ts`
**Commit:** c1fb6dde
**Applied fix:** `armLiveParseForDocument` — the single private method both `armLiveParseFromEvent`
and `armWhenWorkspaceReady`'s deferred callback funnel through before ever arming a debounce cycle —
now calls `isBuildableDocumentUri(document.uri, this.textDocuments, this.serviceRegistry)` first and
returns early when it is `false`. This reuses the exact exclusion `update()` already applies to the
rebuild-driven trigger, so a document opened with the composer's `bbx-config` language id (regardless
of its own file extension) is excluded from the event-armed path too, for both of its callers, with a
single change. Added a regression test proving a `bbx-config`-language document on a `.bbj`-style uri
never arms a live-parse request and never leaves `hasPendingCompile()` true. The test was run against
the pre-fix code (fix hunk temporarily reverted, then restored) and confirmed to fail without the fix.

## Fixed Issues (continued)

### CR-02: A stale, failed debounce cycle can discard and overwrite a newer cycle's already-published verdict

**Files modified:** `bbj-vscode/src/language/bbj-document-builder.ts`, `bbj-vscode/test/live-parse-interleaving.test.ts`
**Commit:** d199ba71
**Applied fix:** `debouncedCompile`'s fallback branch (failed / unavailable / trigger-latched-off)
now checks the same `stillCurrent` flag the verdict branch already checks, and returns without
forgetting the document's verdict, running the save-time compile, or publishing anything when the
cycle's own request is no longer for the document's current text — mirroring how the verdict/cancelled
branch already treats a stale result. Added two regression tests exercising two overlapping debounce
cycles for the same document (an older cycle's request stays pending past a newer cycle's own
request/publish): one where the older cycle resolves `'failed'`, and one where it resolves
`'unavailable'`. Both were run against the pre-fix code (fix hunk temporarily reverted, then restored)
and confirmed to fail without the fix.

**Deliberate design decision, not left as an open question:** the `'unavailable'` outcome keeps its
old, *unconditional* `clearAllVerdictStates()` call — it is **not** gated on `stillCurrent` the way
the rest of the fallback branch now is. Reasoning: `'unavailable'` means the request that just
resolved is the one that discovered the live-parser endpoint no longer exists on this connection —
a fact about the *connection*, not about this one cycle's *text version*. If that clear were gated on
`stillCurrent`, a stale cycle that happens to be the one that discovers the flip would leave every
*other* open document's stored verdict trusting an endpoint that, per this very request, is now known
to be gone — those verdicts would linger until (if ever) another live-parse cycle for each of those
documents happens to run and rediscover the same unavailability. The second regression test added for
this finding (an older cycle discovering `'unavailable'` after a newer cycle already published) proves
both halves of this decision at once: the global clear still runs (an unrelated second document's
pre-seeded verdict state is gone afterward), while the newer cycle's diagnostics are still never
recomputed or republished (`sendDiagnosticsToClient` is still called exactly once, and the save-time
compiler is never invoked for the stale cycle).

## Skipped Issues

None — both in-scope findings (CR-01, CR-02) were fixed. WR-01 and IN-01 were out of scope for this
run (explicitly deferred by the requester) and were not attempted; they remain open in
`105-REVIEW.md`.

---

_Fixed: 2026-09-23T15:44:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
