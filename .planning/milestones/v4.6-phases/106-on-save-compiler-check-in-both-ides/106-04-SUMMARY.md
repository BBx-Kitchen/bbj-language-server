---
phase: 106-on-save-compiler-check-in-both-ides
plan: 04
subsystem: language-server
tags: [langium, diagnostics, bbjcpl, vitest]

# Dependency graph
requires:
  - phase: 106-on-save-compiler-check-in-both-ides
    provides: "The reason-aware live-parse arming chain and the fake-text-document-connection test harness from plan 01"
provides:
  - "A pure reconcileWithFallbackCheck that drops a Langium syntax complaint outright, at its original severity, only when its line overlaps a bbjcpl fallback diagnostic and the checked text still matches what Langium validated -- never a downgrade, since a fallback result is a check of the file on disk, not a live-parser verdict"
  - "An on-disk check (checkedTextIsOnDisk) in the builder's fallback branch: a save-triggered check is covered by the last recorded saved version; every other check falls back to reading the file and comparing it byte-for-byte to the checked text"
  - "Every fallback cycle whose checked text is not provably on disk still merges exactly as before this phase (mergeDiagnostics), so a mismatch never hides or misattributes a real error"
affects: [106-06]

# Actuals (#2632)
actuals:
  tokens: 21000
  tasks: 3
  commits: 5

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "A second, narrower reconciliation next to the existing verdict reconciliation in bbj-diagnostic-reconciliation.ts: same matched-line-text guard as the early-verdict case, but never downgrades -- a fallback result only ever drops a complaint outright or leaves it untouched, since it is a check of the file on disk, not a live verdict for the editor text"
    - "A last-saved-version map plus a disk read, tried in that order, decide whether a fallback cycle's checked text is provably on disk before the dedup runs at all -- the disk read only ever runs once bbjcpl has actually reported something, and is a document-level gate evaluated before the per-line reconciliation"

key-files:
  created:
    - bbj-vscode/test/bbj-cpl-fallback-dedup.test.ts
  modified:
    - bbj-vscode/src/language/bbj-diagnostic-reconciliation.ts
    - bbj-vscode/src/language/bbj-document-builder.ts
    - bbj-vscode/src/language/bbj-document-validator.ts
    - bbj-vscode/test/bbj-diagnostic-reconciliation.test.ts

key-decisions:
  - "Task 1 followed the plan's tracer-task discipline: production-quality wiring (reconcileWithFallbackCheck, checkedText capture, the version-only checkedTextIsOnDisk, and the fallback branch's three-way split) plus its own end-to-end test in one task, then the auto-mode tracer feedback gate re-ran the plan's <verify> before Task 2 started."
  - "Task 2's tests were written first. One of the six behavior cases (an open whose on-disk read matches the checked text) failed red against Task 1's version-only checkedTextIsOnDisk -- confirmed by an initial weak assertion silently passing through mergeDiagnostics' own same-line recoloring, then caught and strengthened to check the diagnostic's own message and absent data.code, which genuinely distinguished a dedup from a merge. The other five cases already passed against Task 1's code (the saved-version match and the pure reconciliation's own matched-line guard were both already correct), matching this phase's own established pattern (106-01/106-02) where a TDD task's tests sometimes need no further production change."
  - "Task 3's eleven pure edge-case tests all passed on the first run against Task 1's reconcileWithFallbackCheck -- no fix was needed."

requirements-completed: []

coverage:
  - id: D1
    description: "A bbjcpl fallback finding also flagged by Langium on an overlapping line shows once, as bbjcpl's own diagnostic, once the checked text is provably on disk (a save, or a matching disk read)"
    requirement: "DIAG-01"
    verification:
      - kind: unit
        ref: "test/bbj-cpl-fallback-dedup.test.ts#tracer: after a save, a bbjcpl finding on a line Langium also flags shows once, as bbjcpl's own diagnostic, and the other line stays an Error"
        status: pass
      - kind: unit
        ref: "test/bbj-cpl-fallback-dedup.test.ts#debounced, file saved: a save records the version, and the rebuild path dedups an overlapping complaint for that version"
        status: pass
      - kind: unit
        ref: "test/bbj-cpl-fallback-dedup.test.ts#on-save, an open whose on-disk text matches the checked text dedups an overlapping complaint"
        status: pass
    human_judgment: false
  - id: D2
    description: "Every mismatch (unsaved edits, an unreadable file, bytes that decode to different text, or a stale Langium line) merges exactly as before this phase, never hiding a real error"
    requirement: "DIAG-01"
    verification:
      - kind: unit
        ref: "test/bbj-cpl-fallback-dedup.test.ts#debounced, unsaved edits: a change arms a cycle whose fallback merges as before when the file cannot be read"
        status: pass
      - kind: unit
        ref: "test/bbj-cpl-fallback-dedup.test.ts#on-save, an open whose on-disk text differs by one non-ASCII character merges as before"
        status: pass
      - kind: unit
        ref: "test/bbj-cpl-fallback-dedup.test.ts#on-save, an open whose on-disk read rejects merges as before"
        status: pass
      - kind: unit
        ref: "test/bbj-cpl-fallback-dedup.test.ts#a stale Langium snapshot whose flagged line differs from the checked text keeps that complaint even though it overlaps"
        status: pass
      - kind: unit
        ref: "test/bbj-cpl-fallback-dedup.test.ts#bbjcpl returning no diagnostics publishes the hierarchy-applied Langium list unchanged, and the file is never read"
        status: pass
    human_judgment: false
  - id: D3
    description: "reconcileWithFallbackCheck's own rules (never downgrades, ordering, purity, the matched-line guard, and which diagnostics count as syntax complaints) are pinned at the pure-function level"
    requirement: "DIAG-01"
    verification:
      - kind: unit
        ref: "test/bbj-diagnostic-reconciliation.test.ts#reconcileWithFallbackCheck (11 tests)"
        status: pass
    human_judgment: false

# Metrics
duration: 15min
completed: 2026-09-24
status: complete
---

# Phase 106 Plan 04: BBjCPL Fallback Diagnostic Dedup Summary

**A pure `reconcileWithFallbackCheck` plus an on-disk check in the builder's save-time fallback branch, so a bbjcpl finding on a line Langium also flags shows once instead of twice, but only once the checked text is provably the text bbjcpl actually compiled.**

## Performance

- **Duration:** 15 min
- **Started:** 2026-09-24T12:04:00Z
- **Completed:** 2026-09-24T12:18:17Z
- **Tasks:** 3
- **Files modified:** 5 (1 created, 4 modified)

## Accomplishments
- `bbj-diagnostic-reconciliation.ts` gained `reconcileWithFallbackCheck(langiumDiagnostics, cplDiagnostics, validatedLineText, checkedLineText)`: every syntax complaint whose start line's text still matches what Langium validated it against, and whose range overlaps a bbjcpl diagnostic, is dropped outright (never downgraded); every other complaint is kept unchanged, at its original severity and data code.
- `bbj-document-builder.ts`'s `debouncedCompile` cycle now captures `checkedText` before each request, records a per-uri `lastSavedVersion` on every save (any trigger mode), and adds `checkedTextIsOnDisk(document, checkedVersion, checkedText)`: true when the checked version matches the last saved version, or (failing that) when a disk read comes back byte-identical to the checked text. The fallback branch uses `reconcileWithFallbackCheck` only when that check passes; every other case still uses `mergeDiagnostics`, exactly as before this phase.
- An optional `onDidClose` subscription on `TextDocumentEventsProvider` forgets a closed document's `lastSavedVersion` entry, so a later reopen never trusts a stale record from a previous editing session.
- `bbj-document-validator.ts`'s `mergeDiagnostics` doc comment and the Rule 0 note now describe the fallback dedup as a separate, line-scoped path that never runs through `applyDiagnosticHierarchy` again.
- A new `bbj-cpl-fallback-dedup.test.ts` (9 tests) exercises the whole builder-level cycle end to end -- a tracer under `on-save`, the same dedup reached under `debounced` via a rebuild, three checked-text-mismatch cases (unsaved edit, non-ASCII disk mismatch, a rejected disk read), a stale-Langium-line case, and the empty-bbjcpl-result no-read case.
- 11 new pure tests in `bbj-diagnostic-reconciliation.test.ts` pin `reconcileWithFallbackCheck`'s own rules: the matched-overlap drop, touching/adjacent spans, non-syntax pass-through, lexer/line-break complaints, the stale-line-text guard, the three empty-input cases, ordering, and purity.

## Task Commits

Each task was committed atomically:

1. **Task 1: After a save, a bbjcpl fallback shows one error per finding, end to end** - `0a337d53` (feat)
2. **Task 2: The dedup applies only when bbjcpl checked the editor text** - `f1a363da` (test), `456f9f9e` (feat)
3. **Task 3: Pure edge coverage for the fallback dedup** - `137569f2` (test)

**Plan metadata:** (this commit)

_Note: Tasks 2 and 3 carried `tdd="true"`. Task 2 produced a separate RED (`test`) and GREEN (`feat`) commit -- one of its six behavior cases genuinely failed red against Task 1's version-only `checkedTextIsOnDisk`. Task 3's eleven tests all passed on the first run against Task 1's `reconcileWithFallbackCheck`, so only a `test(...)` commit was needed -- no production code required a fix, matching the plan's own "if any fails ... fix ... note in SUMMARY" allowance for this outcome._

## Files Created/Modified
- `bbj-vscode/src/language/bbj-diagnostic-reconciliation.ts` - `reconcileWithFallbackCheck`; module header and `lineSpansOverlap` doc comment updated to describe the second reconciliation
- `bbj-vscode/src/language/bbj-document-builder.ts` - `checkedText` capture, `lastSavedVersion` map, `onDocumentSaved`, `checkedTextIsOnDisk` (version match, then a disk read), an optional `onDidClose` subscription, and the fallback branch's three-way split (empty / on-disk-dedup / merge)
- `bbj-vscode/src/language/bbj-document-validator.ts` - `mergeDiagnostics` doc comment and the Rule 0 note updated to describe the fallback dedup as a separate path
- `bbj-vscode/test/bbj-cpl-fallback-dedup.test.ts` - new: 9 builder-level tests (tracer, debounced rebuild, unsaved edit, three disk-check variants, stale line, empty result)
- `bbj-vscode/test/bbj-diagnostic-reconciliation.test.ts` - new `describe('reconcileWithFallbackCheck', ...)` block (11 tests)

## Decisions Made
- Followed the plan's tracer/TDD discipline as written: Task 1 as a full production-quality tracer with its own verify, Task 2 test-first with one genuinely-red case caught by strengthening a too-weak assertion, Task 3 test-first with no production change needed.
- No architectural decisions were needed; every wiring site followed the plan's own action text (the fallback branch's on-disk gate, the saved-version map, the optional `onDidClose` hook) exactly as specified.

## Deviations from Plan

### Auto-fixed Issues

None — every task's `<action>` steps were followed as written; no Rule 1-3 auto-fixes were needed. The one adjustment made during execution (strengthening a test assertion in Task 2's "on-disk text matches" case so it actually exercised the dedup rather than incidentally passing through `mergeDiagnostics`' own same-line source recoloring) was a correction to a test I was actively writing before it was ever committed, not a fix to already-landed work — not a deviation from the plan under any of Rules 1-4.

---

**Total deviations:** 0
**Impact on plan:** None. Plan executed as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- `DIAG-01` is functionally implemented and verified here (every task's acceptance criteria and the plan's own `<verification>` block pass), but stays `Pending` in REQUIREMENTS.md because plan `106-06` also declares it and has not yet produced a SUMMARY -- the shared-ID gate (`requirements.ready-ids`) reported it `0/1 requirement(s) ready to mark complete` for that reason, confirmed by direct query, not because anything here is incomplete.
- `reconcileWithFallbackCheck` and `checkedTextIsOnDisk` are ready for `106-06`'s own diagnostic-reconciliation work in this same phase to build on.
- A whole-suite regression run (`vitest run --maxWorkers=2`, no file filter) was taken as an extra precaution beyond the plan's own `<verification>` block: 2479/2613 tests passed, with exactly 11 failures, all in `test/linking.test.ts`'s "Interop related tests" describe block -- the project's own documented, pre-existing environmental baseline (STATE.md's Test-harness false positive note, re-measured at 11 as recently as the Phase 105 close). Two other suites (`document-builder-rebuild-guard.test.ts`, `line-break-validation.test.ts`) reported "failed" only because every one of their tests shows `skipped` under a `beforeAll` hook timeout -- the project's own documented whole-suite contention pattern (STATE.md's "Whole-suite hook timeouts are contention" note), confirmed by running `bbj-document-validator.test.ts` alone (which hit the same timeout in the combined run) and seeing it pass cleanly in isolation. `functional/installed-extension-e2e.test.ts` skips entirely without a prior `bbj-ext-install`, also pre-existing and unrelated. None of the four failing/skipped suites touch this plan's own files.

---
*Phase: 106-on-save-compiler-check-in-both-ides*
*Completed: 2026-09-24*

## Self-Check: PASSED

- All 5 created/modified files confirmed present on disk with the expected content.
- All 5 task commits (`0a337d53`, `f1a363da`, `456f9f9e`, `137569f2`) confirmed in `git log` (4 unique hashes across 3 tasks, per the TDD split noted above).
- Plan `<verification>` re-run clean: `vitest run test/bbj-diagnostic-reconciliation.test.ts test/bbj-cpl-fallback-dedup.test.ts test/live-parse-interleaving.test.ts test/document-builder.test.ts test/bbj-document-validator.test.ts test/on-save-trigger.test.ts --maxWorkers=2` -- 6 files, 113 tests, all passed (the un-parallelized single run hit the same beforeAll contention timeout on `bbj-document-validator.test.ts` that the whole-suite run did; `--maxWorkers=2` cleared it, and the file passes alone regardless); `tsc -p tsconfig.json` -- no errors; register check over `1427d059..HEAD` for `bbj-vscode/src bbj-vscode/test` -- no output (clean).
- Every task's `<acceptance_criteria>` re-verified via the grep/test commands documented inline during execution -- all passed.
