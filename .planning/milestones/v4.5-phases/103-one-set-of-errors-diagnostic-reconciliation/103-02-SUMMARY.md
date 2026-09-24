---
phase: 103-one-set-of-errors-diagnostic-reconciliation
plan: 02
subsystem: diagnostics
tags: [langium, typescript, diagnostics, vitest]

requires:
  - phase: 103-one-set-of-errors-diagnostic-reconciliation
    provides: >
      Plan 01's bbj-diagnostic-reconciliation.ts (reconcileWithVerdict, per-document verdict
      state, the remembered pre-hierarchy Langium diagnostics list) and the live-parse-first
      debounce callback in bbj-document-builder.ts
provides:
  - A failed live-parse cycle (any application error, a transport failure, or a malformed
    result) now forgets the document's verdict state and falls back to the save-time bbjcpl
    compile, restoring Langium's parse errors to Error severity exactly as before the live
    parser existed
  - A cancelled request, and a verdict answering for a document whose text version changed
    while the request was in flight, are both now true no-ops for that debounce cycle
  - Every way the endpoint or the compiler goes away (MethodNotFound, a connection-generation
    change, the compiler trigger set to off) now clears every document's verdict state, not
    only the document whose own cycle observed it
  - revalidateUseFilePathDiagnostics keeps the remembered pre-hierarchy Langium diagnostics
    list in sync with document.diagnostics, so a resolved USE diagnostic cannot reappear from
    a later verdict reconciliation
  - An exact-equality regression test pinning the older-server path against the 0.16.x merge
    computation, proving Rule 0 stays inert and mergeDiagnostics is untouched
affects: [103-03, 103-04, 103-05]

actuals:
  tokens: 9020
  tasks: 2
  commits: 5

tech-stack:
  added: []
  patterns:
    - "Version-before/version-after comparison around an awaited request, to detect a stale
       answer without a cancellation token of its own (mirrors the existing
       cplDebounceTimers per-file debounce, applied to a single in-flight request instead of a
       scheduled timer)"
    - "A shared 'keep' filter predicate applied to both the live document.diagnostics list and
       a separately-remembered pre-hierarchy list, so a revalidation decision never has to be
       made twice or drift between the two"

key-files:
  created: []
  modified:
    - bbj-vscode/src/language/bbj-document-builder.ts
    - bbj-vscode/src/language/bbj-parser-service.ts
    - bbj-vscode/test/bbj-parser-service.test.ts
    - bbj-vscode/test/document-builder.test.ts

key-decisions:
  - "forgetVerdict() is a no-op when no verdict state exists for the document — a document
     that never had a verdict is left byte-for-byte as it already was, matching 0.16.x
     behaviour exactly rather than unconditionally re-deriving document.diagnostics"
  - "The stale-verdict check compares document.textDocument.version captured immediately
     before requestLiveParse() against the same field read again after it resolves, rather
     than adding a new cancellation-token plumbing path — the existing debounce timer already
     schedules a newer cycle for the edit that changed the version, so this cycle simply does
     nothing"
  - "resetIfGenerationChanged() only calls clearAllVerdictStates() on an actual
     decided-to-undecided transition (mode !== 'unknown' at the moment the generation changes),
     never on repeated calls while the latch is still undecided — otherwise every probe before
     the first real parse on a fresh connection would redundantly clear an already-empty state"
  - "revalidateUseFilePathDiagnostics' existing inline filter callback was lifted into a named
     'keep' predicate and applied identically to both document.diagnostics and the remembered
     list, rather than duplicating the resolvability logic — keeps the two lists provably in
     sync by construction"

requirements-completed: []  # PSRV-06/PSRV-07 are shared with plans 103-03/04/05; not closed by this plan alone per its own shell rules

coverage:
  - id: D1
    description: "A failed live-parse cycle (five application error codes, a transport failure, a malformed result) after an accepted verdict falls back to the save-time compile exactly once, restores Langium's parse error to Error severity, forgets the verdict state, and logs exactly one warn line"
    requirement: PSRV-06
    verification:
      - kind: integration
        ref: "test/bbj-parser-service.test.ts#a live-parse failure falls back to the save-time compile (9 tests)"
        status: pass
    human_judgment: false
  - id: D2
    description: "A cancelled request, and a verdict for a document whose text version changed in flight, are true no-ops: no reconciliation, no state change, no save-time compile"
    requirement: PSRV-06
    verification:
      - kind: integration
        ref: "test/bbj-parser-service.test.ts#a cancelled answer after an accepted verdict / #a verdict for a document whose text version changed while the request was in flight"
        status: pass
    human_judgment: false
  - id: D3
    description: "Against the old-server double, the published diagnostics are computed-equal to the 0.16.x merge (mergeDiagnostics over applyDiagnosticHierarchy over the remembered Langium list), with no downgraded diagnostic and no verdict state — Rule 0 and mergeDiagnostics stay untouched"
    requirement: PSRV-06
    verification:
      - kind: integration
        ref: "test/bbj-parser-service.test.ts#an older server gets exactly the 0.16.x diagnostics > exact equality against the 0.16.x merge"
        status: pass
    human_judgment: false
  - id: D4
    description: "MethodNotFound, a post-reconnect isEnabled() call, and the compiler trigger set to off each clear every document's verdict state, not only the document whose own cycle observed the event"
    requirement: PSRV-07
    verification:
      - kind: integration
        ref: "test/bbj-parser-service.test.ts#a MethodNotFound answer clears every document's verdict state / #after simulateReconnect, calling isEnabled() clears the verdict state; test/document-builder.test.ts#setCompilerTrigger(\"off\") followed by runBbjcplForDocuments clears every document's verdict state"
        status: pass
    human_judgment: false
  - id: D5
    description: "revalidateUseFilePathDiagnostics keeps the remembered pre-hierarchy Langium diagnostics list in sync with document.diagnostics, so a resolved USE diagnostic cannot reappear from a later verdict reconciliation"
    requirement: PSRV-06
    verification:
      - kind: integration
        ref: "test/document-builder.test.ts#a now-resolved USE diagnostic is dropped from both document.diagnostics and the remembered list; the still-unresolved one survives in both"
        status: pass
    human_judgment: false

duration: 22min
completed: 2026-09-23
status: complete
---

# Phase 103 Plan 02: Live-Parse Fallback, Verdict Lifecycle, and the Old-Server Pin Summary

**A failed, cancelled, or stale live-parse outcome now falls back to the save-time bbjcpl compile exactly as before the live parser existed, every way the endpoint or compiler goes away forgets every document's verdict state, and an exact-equality test pins the older-server path to the 0.16.x merge computation.**

## Performance

- **Duration:** 22 min
- **Started:** 2026-09-23T06:16:00Z (approximate — first tool call in this session)
- **Completed:** 2026-09-23T06:37:32Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- `debouncedCompile()` now distinguishes four cases after asking the live parser: a verdict for
  unchanged text (plan 01's reconciliation path, unchanged), a stale verdict or a cancelled
  request (a true no-op — no reconciliation, no state change, no save-time compile), and every
  other outcome (failed, unavailable, or the latch/trigger off) — which now calls a new
  `forgetVerdict()` before falling back to the save-time compile, so a real Langium error is
  never left downgraded without a verdict behind it
- `forgetVerdict()` clears a document's verdict state and restores the pre-hierarchy Langium
  diagnostics list (with the hierarchy re-applied) — but only when a verdict state actually
  existed, leaving a document that never had one untouched
- The stale-verdict check compares `document.textDocument.version` captured immediately before
  `requestLiveParse()` against the same field read again after it resolves
- `BBjParserService.resetIfGenerationChanged()` now clears every document's verdict state once
  per actual decided-to-undecided connection transition (a reconnect or a Java-class cache
  clear after the latch had settled) — never on repeated calls while the latch is still
  undecided
- The `unavailable` (MethodNotFound) outcome and the compiler-trigger-off branch of
  `runBbjcplForDocuments()` both now call `clearAllVerdictStates()` — the latch or trigger just
  went off for every document, not only the one whose cycle observed it
- `revalidateUseFilePathDiagnostics()`'s existing inline filter callback was lifted into a named
  `keep` predicate and applied identically to both `document.diagnostics` and the remembered
  pre-hierarchy Langium list, so a USE diagnostic it resolves cannot reappear from a later
  verdict reconciliation
- A new exact-equality regression test drives one real debounce cycle against the old-server
  double with a real validated document carrying two distinct Langium parse errors, and asserts
  `document.diagnostics` is computed-equal to `mergeDiagnostics(applyDiagnosticHierarchy(...))`
  — pinning "unchanged" as a computed equality rather than a description, and confirming no
  diagnostic anywhere carries the downgraded code and no verdict state exists

## Task Commits

Each task was committed as its own RED/GREEN pair per its `tdd="true"` attribute (task 2 also has one follow-up `fix` commit for a self-introduced doc-comment ordering issue, caught and corrected before this summary):

1. **Task 1 RED: failing tests for the live-parse fallback, cancellation and stale-verdict outcomes** — `8b01db4d` (test)
1. **Task 1 GREEN: fall back to the save-time compile on a failed, cancelled or stale live-parse outcome** — `52eb408f` (feat)
2. **Task 2 RED: failing tests for endpoint-gone verdict clearing and the old-server pin** — `c46ca781` (test)
2. **Task 2 GREEN: forget every verdict on a connection change, trigger-off, or MethodNotFound, and keep the remembered Langium list honest across USE revalidation** — `0afb710b` (feat)
2. **Follow-up: restore debouncedCompile's own doc comment, misattached to forgetVerdict** — `055075c9` (fix)

**Plan metadata:** committed alongside this summary.

## Files Created/Modified

- `bbj-vscode/src/language/bbj-document-builder.ts` — `forgetVerdict()`, the stale/cancelled
  no-op branch, the `unavailable`-outcome and trigger-off `clearAllVerdictStates()` calls, and
  `revalidateUseFilePathDiagnostics()`'s shared `keep` predicate
- `bbj-vscode/src/language/bbj-parser-service.ts` — `resetIfGenerationChanged()` clears every
  verdict state once per decided-to-undecided connection transition
- `bbj-vscode/test/bbj-parser-service.test.ts` — two new `describe` blocks (`a live-parse
  failure falls back to the save-time compile`, `an older server gets exactly the 0.16.x
  diagnostics`) plus compile-call assertions added to the existing failure-shape and
  cancellation tests
- `bbj-vscode/test/document-builder.test.ts` — two new `describe` blocks (trigger-off verdict
  clearing, USE-revalidation list sync) and a `runBbjcplForDocuments` entry on `BuilderPrivates`

## Decisions Made

- `forgetVerdict()` only acts when a verdict state exists for the document — a document that
  never had one is left byte-for-byte unchanged, matching 0.16.x behaviour exactly
- The stale-verdict guard reuses a version-before/version-after comparison instead of adding a
  new cancellation-token plumbing path; the existing debounce timer already schedules a newer
  cycle for the edit that changed the version
- `resetIfGenerationChanged()`'s `clearAllVerdictStates()` call is gated on `mode !== 'unknown'`
  at the moment the generation changes, so repeated undecided-latch probes on a fresh connection
  never redundantly clear an already-empty state
- `revalidateUseFilePathDiagnostics()`'s inline filter callback was lifted into a named `keep`
  predicate applied identically to both diagnostics lists, rather than duplicating the
  resolvability logic — keeps the two lists provably in sync by construction

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed a doc-comment misattached to the wrong method**
- **Found during:** Task 2, immediately after the GREEN commit, during final re-verification
- **Issue:** Inserting `forgetVerdict()` between `debouncedCompile()`'s existing doc comment and
  the method itself left `debouncedCompile()` with no doc comment of its own and
  `forgetVerdict()` wrongly preceded by an unrelated block describing `debouncedCompile()`'s
  behaviour instead of its own
- **Fix:** Reordered so `forgetVerdict()` (with its own doc comment) comes first, followed by
  `debouncedCompile()` with its original doc comment restored immediately above it — no
  behaviour change
- **Files modified:** `bbj-vscode/src/language/bbj-document-builder.ts`
- **Verification:** `npx tsc -b tsconfig.json` clean, full task-2 verify suite (84/84) still
  passing after the reorder
- **Committed in:** `055075c9`

---

**Total deviations:** 1 auto-fixed (1 Rule 1 documentation bug)
**Impact on plan:** Documentation-only; no production behaviour changed. No scope creep.

## Issues Encountered

**Whole-suite regression check (not part of this plan's own `<verification>` block, run as
extra diligence per project convention):** `npx vitest run --maxWorkers=2` reports
`numFailedTests: 11`, all in `test/linking.test.ts`'s pre-existing interop-backend-drift group —
matching the documented local baseline exactly (STATE.md / `103-01-SUMMARY.md`: "the documented
local baseline of 12 should now be 11"). No file this plan modified is reachable from those
tests (they exercise Java-interop class resolution, unrelated to diagnostic reconciliation).
Not investigated further — out of scope per the deviation rules' scope boundary.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- `forgetVerdict()`, the four-way outcome split in `debouncedCompile()`, and the
  connection/trigger-off verdict clears are ready for plan 03 (the line-break validator's
  `data.code` tagging, `BBjDocumentValidator`'s carry-over call) and plan 05 (the live check,
  the conformance run, and hand UAT against both the endpoint-present and pre-endpoint-jar
  states)
- No blockers. PSRV-06/PSRV-07 remain `Pending` in `REQUIREMENTS.md` — correctly, since plans
  03-05 also declare them and have not yet produced a summary; `requirements.ready-ids` will
  mark them `Complete` only once the last declaring plan finishes

---
*Phase: 103-one-set-of-errors-diagnostic-reconciliation*
*Completed: 2026-09-23*

## Self-Check: PASSED

All 4 modified files confirmed present on disk with the expected changes; all 5 commits
(8b01db4d, 52eb408f, c46ca781, 0afb710b, 055075c9) confirmed in `git log`. Re-ran this plan's
`<verification>` block: `npx vitest run test/bbj-parser-service.test.ts test/document-builder.test.ts
test/bbj-diagnostic-reconciliation.test.ts test/cpl-integration.test.ts` — 84/84 passed;
`npx tsc -b tsconfig.json` and `npm run lint` — both clean. All `<acceptance_criteria>` for
tasks 1-2 re-verified passing, including the literal `grep` checks for `private forgetVerdict(`,
the `notifyDocumentPhase(...)` single-call invariant, the absence of planning identifiers, and
the `toEqual(mergeDiagnostics(` assertion string.
