---
phase: 92-host-side-hygiene-focus-guards
plan: "02"
subsystem: editor-integration
tags: [vscode, formatter, race-condition, in-flight-dedup, document-formatter]

# Dependency graph
requires: []
provides:
  - "Content-aware in-flight format sharing in document-formatter.ts (D-08)"
affects: [92-06]

# Actuals (#2632)
actuals:
  tokens: 1747
  tasks: 2
  commits: 2

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "In-flight promise map keyed by URI, sharing gated on content equality instead of URI alone, with identity-based cleanup so an older settle cannot evict a newer entry."

key-files:
  created: []
  modified:
    - bbj-vscode/src/document-formatter.ts
    - bbj-vscode/test/document-formatter.test.ts

key-decisions:
  - "inFlightFormats stores { content, promise } and reuses the promise only when inFlight.content === documentContent, per D-08; identical-content bursts (Save All) keep sharing one spawn."
  - "Cleanup on settle still uses identity comparison, now on the entry's stored promise, so an older run settling after a newer one replaced its entry never deletes the newer entry."

patterns-established:
  - "Content-equality gate before reusing an in-flight promise, applied wherever a request's freshly-read input could differ from an already-running operation's input."

requirements-completed: [RESP-06]

coverage:
  - id: D1
    description: "A format request made after an interim edit spawns its own formatter run and resolves with output computed from its own text, never an earlier in-flight run's output."
    requirement: "RESP-06"
    verification:
      - kind: unit
        ref: "test/document-formatter.test.ts#a request made after an interim edit spawns its own run and applies only its own output (race, issue #499)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Identical-content format bursts (e.g. Save All) still share exactly one spawned process, unchanged from before."
    requirement: "RESP-06"
    verification:
      - kind: unit
        ref: "test/document-formatter.test.ts#P62-D3-001: concurrent format requests share one spawn (all 4 pre-existing cases)"
        status: pass
    human_judgment: false
  - id: D3
    description: "A newer run's in-flight entry survives the older run it replaced settling first, so identical follow-up requests keep sharing the newer run; and no in-flight entry leaks after both runs of a different-content pair settle."
    requirement: "RESP-06"
    verification:
      - kind: unit
        ref: "test/document-formatter.test.ts#a newer run's in-flight entry survives the older run settling, so identical follow-up requests keep sharing it"
        status: pass
      - kind: unit
        ref: "test/document-formatter.test.ts#after both runs of a different-content pair settle, one more request with the latest content spawns again"
        status: pass
    human_judgment: false

# Metrics
duration: 5min
completed: 2026-09-13
status: complete
---

# Phase 92 Plan 02: Format Race Fix (RESP-06, #499) Summary

**`inFlightFormats` now shares a running formatter process only when the requesting text matches the text that process started with, so an interim edit spawns its own run instead of inheriting the older run's output.**

## Performance

- **Duration:** 5 min
- **Started:** 2026-09-13T07:20:31Z (immediately after 92-01)
- **Completed:** 2026-09-13T07:23:33Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- `inFlightFormats` value type changed from a bare `Promise<string>` to `{ content: string; promise: Promise<string> }`; a request reuses the stored promise only when `inFlight.content === documentContent`, otherwise it starts a fresh `runFormatter` call against the current text and replaces the map entry.
- The settle-time cleanup now compares the stored entry's `promise` (not a bare map value) against the settling run's own promise, so an older run settling after a newer one replaced its entry can never evict the newer entry — no in-flight entry leaks either way.
- Three new tests added inside the existing `P62-D3-001` describe block in `test/document-formatter.test.ts`:
  - `a request made after an interim edit spawns its own run and applies only its own output (race, issue #499)` — two spawns, each resolving with its own text's output, verified even when the older run settles after the newer one.
  - `a newer run's in-flight entry survives the older run settling, so identical follow-up requests keep sharing it` — a third identical-content request after the older run settles still shares the newer run's spawn (2 spawns total).
  - `after both runs of a different-content pair settle, one more request with the latest content spawns again` — proves no in-flight entry leaks (3 spawns total).
- All 4 pre-existing `P62-D3-001` tests pass unchanged, confirming the Save All one-spawn dedupe for identical content still holds.

## Task Commits

Each task was committed atomically:

1. **Task 1: A format request made after an interim edit gets output computed from its own text, not the earlier in-flight run's** - `18ac00b7` (feat) — RED test added and confirmed failing (1 spawn instead of 2) against the unmodified sharing logic, then the content-aware sharing logic implemented; GREEN confirmed with all 14 tests in the file passing.
2. **Task 2: A newer run's in-flight entry survives the older run settling, so identical follow-up requests keep sharing it** - `dc9aa153` (test) — both new tests passed against the Task 1 implementation with no further source changes needed; formatter test file (25 tests) and `no-shell-command-construction.test.ts` (verifier-precedes-spawn guard) both green, lint clean, register check empty.

**Plan metadata:** (this commit)

_Note: Task 2's cleanup identity comparison already matched the required behavior from Task 1's change — no additional source fix was needed, so this task produced only a `test(...)` commit._

## Files Created/Modified
- `bbj-vscode/src/document-formatter.ts` - `inFlightFormats` keyed by URI holding `{ content, promise }`; share-or-spawn logic gated on content equality; cleanup gated on promise identity of the current entry; block comment above the map rewritten to explain the content-equality rationale (issue #499) alongside the existing Save All dedupe rationale.
- `bbj-vscode/test/document-formatter.test.ts` - three new tests inside `P62-D3-001` covering the different-content race, newer-entry survival across an older settle, and no-leak-after-settle.

## Decisions Made
- Followed D-08 exactly: share only for identical text, keep the one-spawn dedupe for identical content, keep the existing map-identity cleanup guard (now scoped to the stored entry's promise field instead of a bare map value).
- No architectural changes; the fix stayed entirely within `document-formatter.ts`'s existing map-based coalescing structure.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- RESP-06 (#499) closed. `document-formatter.ts`'s in-flight sharing is now content-aware; no further work needed on this file for this phase.
- Ready for the next plan in Phase 92 (RESP-05, RESP-07, RESP-08 or RESP-09 depending on execution order).

---
*Phase: 92-host-side-hygiene-focus-guards*
*Completed: 2026-09-13*
