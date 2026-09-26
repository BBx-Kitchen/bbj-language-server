---
phase: 106-on-save-compiler-check-in-both-ides
plan: 05
subsystem: language-server
tags: [langium, lsp, textDocumentSync, diagnostics, vitest]

# Dependency graph
requires:
  - phase: 106-on-save-compiler-check-in-both-ides
    provides: "The reason-aware live-parse arming chain (open/change/save), the newly-advertised save capability, and the fake-text-document-connection test harness from plan 01"
provides:
  - "bbj-kept-check.ts: pure line/range mapping through recorded content changes, a per-document change log capped at 2000 batches, a change-recording TextDocuments configuration, a kept-check store (verdict/fallback), and composeWithKeptCheck"
  - "Under on-save, a BBj-parser verdict's own diagnostics are kept and re-placed on their (possibly shifted) line on every keystroke until the next save, instead of vanishing on the next keystroke the way the debounced verdict path already does"
  - "A Langium complaint the verdict already accounted for keeps its downgrade/drop treatment while the user types; a complaint on text the check never saw shows as an Error beside a kept error on the same line"
affects: [106-06]

# Actuals (#2632)
actuals:
  tokens: 18317
  tasks: 3
  commits: 4

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "A change-recording TextDocumentsConfiguration wraps TextDocument.create/update, recording each incremental (or whole-document, converted via a line-diff) change into a per-document, version-chained log -- the log is the substrate every kept diagnostic's line is mapped through"
    - "A kept diagnostic is matched by (message, line text) via the existing syntaxComplaintKey idiom, never by line number, so it survives an edit that only shifts its line while still losing trust the instant the line's own text changes"
    - "composeOnSaveDiagnostics runs the diagnostic hierarchy before composition for a fallback kept check and after composition for a verdict kept check, mirroring the two call sites' existing hierarchy-ordering conventions exactly"

key-files:
  created:
    - bbj-vscode/src/language/bbj-kept-check.ts
    - bbj-vscode/test/bbj-kept-check.test.ts
    - bbj-vscode/test/on-save-kept-errors.test.ts
  modified:
    - bbj-vscode/src/language/bbj-module.ts
    - bbj-vscode/src/language/bbj-document-validator.ts
    - bbj-vscode/src/language/bbj-document-builder.ts

key-decisions:
  - "Task 1 (tracer) landed the whole path in one commit -- the change-recording configuration, the kept-check store, composeWithKeptCheck, the validator's on-save branch, and the builder's verdict-branch wiring -- then the tracer feedback gate re-ran the plan's <verify> before Task 2 started (auto mode active via workflow.auto_advance)."
  - "Tasks 2 and 3 were written test-first, as the plan's tdd=true instruction required. Both landed with zero production changes needed: every pure and end-to-end case passed against Task 1's implementation on the first run, so only test(...) commits were produced -- no feat/fix commit followed either."
  - "This plan wires the kept-check store and composeOnSaveDiagnostics only for the debouncedCompile verdict branch (liveOutcome.kind === 'verdict'), exactly as the plan's own Task 1 action text specifies. The save-time compile fallback branch (kind: 'fallback') is structurally supported by bbj-kept-check.ts (KeptCheck.kind already includes 'fallback', and composeWithKeptCheck already never downgrades for it) but is not wired into the builder's fallback branch here -- that wiring is 106-06's own stated scope (its own TRIG-04/DIAG-01 requirements declaration), not a gap in this plan."

requirements-completed: []

coverage:
  - id: D1
    description: "Under on-save, a BBj Parser verdict error follows its line through inserts and deletes above it, through the real text-document store, the change-recording configuration and the validator"
    requirement: "TRIG-04"
    verification:
      - kind: unit
        ref: "test/on-save-kept-errors.test.ts#tracer: a BBj Parser error from the last check follows its line while the user types above it"
        status: pass
      - kind: unit
        ref: "test/on-save-kept-errors.test.ts#end to end: the verdict drops the overlapping complaint and downgrades the other; inserting a line above keeps BBj's error on the shifted line"
        status: pass
    human_judgment: false
  - id: D2
    description: "The line-mapping rules (inserts, deletes, splits, joins, whole-document diffing) and the change log (chaining, pruning, the 2000-batch cap, the recording configuration) are correct at the pure-function level"
    verification:
      - kind: unit
        ref: "test/bbj-kept-check.test.ts (38 tests across mapLineThroughChange, mapLineThroughBatches, mapRangeThroughBatches, wholeDocumentChangeAsRange, contentChangesSince, createChangeRecordingTextDocumentsConfiguration)"
        status: pass
    human_judgment: false
  - id: D3
    description: "composeWithKeptCheck's own rules (seen-based drop/downgrade, unseen complaints stay Errors, a deleted kept-diagnostic line disappears, a stale validated line is never trusted, and equivalence with reconcileWithVerdict when nothing has changed) are pinned, plus the full typing-between-saves narrative end to end: editing a flagged line keeps the kept error and adds a fresh complaint beside it, fixing the syntax keeps the kept error, deleting the line removes it, a rebuild starts no new check, and debounced typing still drops a verdict's diagnostics as before"
    requirement: "TRIG-04"
    verification:
      - kind: unit
        ref: "test/bbj-kept-check.test.ts#composeWithKeptCheck (7 tests)"
        status: pass
      - kind: unit
        ref: "test/on-save-kept-errors.test.ts#composing while typing between saves, end to end (4 tests)"
        status: pass
    human_judgment: false

# Metrics
duration: 105min
completed: 2026-09-24
status: complete
---

# Phase 106 Plan 05: On-Save Kept Compiler Errors Summary

**A change-recording text-document configuration plus a pure `composeWithKeptCheck` keep a BBj-parser verdict's own diagnostics visible and correctly re-placed on their line while the user types between saves, closing the exact gap `composeWithVerdict` deliberately leaves open for `debounced`.**

## Performance

- **Duration:** 105 min
- **Started:** 2026-09-24T12:32Z (continuing an interrupted prior session's `bbj-module.ts` edit)
- **Completed:** 2026-09-24T14:17Z
- **Tasks:** 3
- **Files modified:** 6 (3 created, 3 modified)

## Accomplishments
- `bbj-kept-check.ts`: `mapLineThroughChange`/`mapLineThroughBatches`/`mapRangeThroughBatches` map a line or range through one or many recorded content changes, correctly distinguishing "stays", "shifts", and "dropped" for every insert/delete/split/join/whole-document-diff shape the plan specified; a per-document change log (`recordContentChanges`/`contentChangesSince`/`pruneContentChangesThrough`/`clearContentChanges`) chains batches by version and caps at 2000 per document; `createChangeRecordingTextDocumentsConfiguration()` wraps `TextDocument.create`/`update` to record every change without altering what the store returns.
- `bbj-module.ts` wires that configuration into `BBjSharedModule.workspace.TextDocuments`, replacing Langium's default plain `TextDocument`-backed configuration.
- `bbj-kept-check.ts`'s `KeptCheck` store (`getKeptCheck`/`setKeptCheck`/`clearKeptCheck`/`clearAllKeptChecks`) and pure `composeWithKeptCheck` re-place each kept diagnostic on its mapped line, and decide per Langium syntax complaint whether it's dropped (overlaps a placed diagnostic, was already seen), downgraded (seen, no overlap, kept.kind is `'verdict'`), or left as an Error (never seen, or the line text no longer matches what was validated).
- `bbj-document-validator.ts`: `composeOnSaveDiagnostics` orders the diagnostic hierarchy correctly for each kept-check kind; `validateDocument`'s new on-save branch composes against the stored kept check and the change log's `contentChangesSince` result; the close subscription now also clears the kept check and change log for the closing uri.
- `bbj-document-builder.ts`: the verdict branch of `debouncedCompile` now also stores a `KeptCheck` (in every trigger mode, so a later switch to on-save keeps showing the current verdict) and, under on-save, publishes through `composeOnSaveDiagnostics` instead of the plain hierarchy-applied verdict composition; `runBbjcplForDocuments`'s `off` branch now also clears every kept check and change log.
- 38 pure tests in `bbj-kept-check.test.ts` pin the line-mapping rules and the change log; a further 7-test `composeWithKeptCheck` block pins its own overlap/downgrade/unseen/deleted-line/stale-line/equivalence rules.
- `on-save-kept-errors.test.ts` (9 tests total) covers the tracer scenario end to end, then a `composing while typing between saves, end to end` block: a verdict drops the overlapping complaint and downgrades the other while following an inserted line; editing the flagged line keeps the kept error and shows a fresh complaint beside it; fixing the underlying syntax keeps the kept error; deleting the flagged line removes it; a rebuild starts no new compiler check; and a debounced regression case confirms typing still drops a verdict's own diagnostics exactly as before this phase.

## Task Commits

Each task was committed atomically:

1. **Task 1: Under on-save, a BBj error from the last check follows its line while the user types above it** - `3d50e7fa` (feat)
2. **Task 2: Line mapping and change-log edge cases** - `c9a03f8c` (test)
3. **Task 3: Composition rules while typing between saves, end to end** - `b72319da` (test)

**Plan metadata:** (this commit)

_Note: Tasks 2 and 3 carried `tdd="true"`. Both produced only a `test(...)` commit -- every case passed against Task 1's implementation on the first run, matching this phase's own established pattern (see 106-01 Task 2, 106-04 Task 3) where a correctly-designed tracer already satisfies the later pinning tests._

## Files Created/Modified
- `bbj-vscode/src/language/bbj-kept-check.ts` - line/range mapping through content changes, the per-document change log, `createChangeRecordingTextDocumentsConfiguration`, `KeptCheck` and its store, `composeWithKeptCheck`
- `bbj-vscode/src/language/bbj-module.ts` - `BBjSharedModule.workspace.TextDocuments` built on the change-recording configuration
- `bbj-vscode/src/language/bbj-document-validator.ts` - `composeOnSaveDiagnostics`, the on-save branch in `validateDocument`, the close subscription clearing the kept check and change log
- `bbj-vscode/src/language/bbj-document-builder.ts` - the verdict branch stores a `KeptCheck` and publishes through `composeOnSaveDiagnostics` under on-save; the `off` branch clears every kept check and change log
- `bbj-vscode/test/bbj-kept-check.test.ts` - 45 tests: pure mapping, range mapping, whole-document diffing, the change log, the recording configuration, and `composeWithKeptCheck`
- `bbj-vscode/test/on-save-kept-errors.test.ts` - 9 tests: the tracer scenario and the full typing-between-saves narrative end to end

## Decisions Made
- Task 1's tracer feedback gate re-ran the plan's `<verify>` end-to-end (auto mode active) before Task 2 began, per the plan's tracer discipline.
- A prior, interrupted executor session had already landed `bbj-module.ts`'s `TextDocuments` override, uncommitted, before this session started; it was reviewed against the plan (matches Task 1's action text exactly) and kept as this plan's own work, per the orchestrator's own instruction mid-session.
- Task 3's end-to-end "editing the flagged line" scenario needed empirical grounding, not a hand-derived guess: probing the fixture `'x = 1 +\nrem ok\ny = 2 *\n'` showed the parser's own error-recovery reports each complaint on the *resync* line after a dangling operator (e.g. the `rem ok` comment line), not the operator's own line -- confirmed by three throwaway `validationHelper` probes before writing the final assertions, per this project's standing rule against hand-derived runtime traces.

## Deviations from Plan

None - plan executed exactly as written, including its TDD instructions for Tasks 2 and 3.

## Issues Encountered

- An early draft of Task 3's "editing the flagged line" end-to-end test assumed (without checking) that the fixture's dangling-operator line itself carries the parse error. A `EmptyFileSystemProvider` throw and, after fixing the harness ordering, a wrong-location assertion both surfaced the same wrong assumption. Three throwaway `validationHelper` probes (removed before committing) established the real error-recovery location, and the test was rewritten against that ground truth.
- `builder.update([uri], [])` on a document added via `addWorkspaceDocument` but never opened through the fake client throws `No file system is available` (`EmptyFileSystemProvider.readFile`) -- Langium's own document factory falls back to a disk read when the uri has no entry in `services.workspace.TextDocuments`. Fixed by always opening through the fake client (with the compiler trigger off, so the open itself starts no compiler check) before the first `builder.update` call in every end-to-end test that needs a real pre-existing Langium baseline.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- `TRIG-04` is functionally implemented and verified here (every task's acceptance criteria and the plan's own `<verification>` block pass), but stays `Pending` in REQUIREMENTS.md because plan `106-06` also declares it and has not yet produced a SUMMARY -- the shared-ID gate (`requirements.ready-ids`) is expected to report it blocked for that reason, not because anything here is incomplete.
- The save-time compile fallback branch's own kept-check wiring (`KeptCheck.kind: 'fallback'`) is structurally ready in `bbj-kept-check.ts` (`composeWithKeptCheck` already never downgrades for it) but not yet wired into `bbj-document-builder.ts`'s fallback branch -- that is `106-06`'s own stated scope.
- A whole-suite run (`vitest run --maxWorkers=2`) was attempted twice as an extra precaution beyond the plan's own `<verification>` block. Both runs reproduced the project's documented, pre-existing `linking.test.ts` "Interop related tests" failures (11, environmental BBjServices drift, unrelated to this plan's files). A handful of other files (`conformance-regressions.test.ts`, `line-break-validation.test.ts`, `functional/installed-extension-e2e.test.ts`) failed inconsistently between the two runs and even alone, on a `beforeAll` hook timing out at 10s -- consistent with the project's documented "whole-suite hook timeouts are contention" pattern (this machine was running several other concurrent, unrelated Claude sessions during this plan's execution). None of these three files import or exercise `bbj-kept-check.ts`, `bbj-module.ts`, `bbj-document-validator.ts` or `bbj-document-builder.ts`'s changed code paths. The plan's own targeted `<verification>` commands (the eight-file vitest command and `tsc`) passed cleanly and repeatably throughout this session.

---
*Phase: 106-on-save-compiler-check-in-both-ides*
*Completed: 2026-09-24*

## Self-Check: PASSED

- All 6 created/modified files confirmed present on disk with the expected content.
- All 3 task commits (`3d50e7fa`, `c9a03f8c`, `b72319da`) confirmed in `git log`.
- Plan `<verification>` re-run clean: `vitest run test/bbj-kept-check.test.ts test/on-save-kept-errors.test.ts test/on-save-trigger.test.ts test/bbj-cpl-fallback-dedup.test.ts test/live-parse-interleaving.test.ts test/live-parse-scheduling.test.ts test/bbj-document-validator.test.ts test/bbj-diagnostic-reconciliation.test.ts --maxWorkers=2` -- 8 files, 162 tests, all passed; `tsc -p tsconfig.json` -- no errors; register check over `1427d059..HEAD` for `bbj-vscode/src bbj-vscode/test` -- no output (clean).
- Every task's `<acceptance_criteria>` re-verified via the grep/test commands documented inline during execution -- all passed.
