---
phase: 106-on-save-compiler-check-in-both-ides
plan: 06
subsystem: language-server
tags: [langium, lsp, diagnostics, on-save, bbjcpl, vitest]

# Dependency graph
requires:
  - phase: 106-on-save-compiler-check-in-both-ides
    provides: "The change-recording TextDocuments configuration, the kept-check store and composeWithKeptCheck (plan 05), and reconcileWithFallbackCheck plus checkedTextIsOnDisk (plan 04)"
provides:
  - "A save's verdict is kept and correctly re-placed even when the user typed while it ran, computed against the checked text/version so composeWithVerdict's own current-version check still recognizes it"
  - "A per-document check-sequence counter lets a newer on-save cycle supersede an older still-in-flight one, whichever resolves last -- the older cycle stores and publishes nothing"
  - "The save-time compile fallback branch now stores a kind 'fallback' kept check the same way the verdict branch does, in every mode except off, with the same same-text-document-object and supersession staleness rule under on-save"
  - "KeptCheck.storedUnderOnSave: a runtime switch away from on-save keeps a file's current compiler errors visible under debounced until that file's own first debounced check replaces them"
affects: []

# Actuals (#2632)
actuals:
  tokens: 17400
  tasks: 3
  commits: 5

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "A per-key sequence counter (checkSequence), bumped at the very start of every debounce cycle's timer callback before any await, lets a cycle detect -- after its own async work resolves, however long that takes -- whether a newer cycle for the same document has since started; consulted only under on-save, where a save's zero-delay cycle can genuinely overlap a still-in-flight earlier one"
    - "The verdict branch's entrance condition widened from a single stillCurrent (same object and same version) to stillCurrent OR (on-save AND same object) -- letting a save's own cycle complete and be kept even once the version has moved from typing, while debounced keeps the original stricter guard untouched"
    - "storedUnderOnSave on KeptCheck records the trigger at the exact moment each check was stored, not the trigger validateDocument sees later -- the field a runtime mode switch away from on-save needs to keep telling a stale-but-still-relevant kept check apart from one debounced has since replaced on its own"

key-files:
  modified:
    - bbj-vscode/src/language/bbj-document-builder.ts
    - bbj-vscode/src/language/bbj-document-validator.ts
    - bbj-vscode/src/language/bbj-kept-check.ts
    - bbj-vscode/test/on-save-kept-errors.test.ts
    - bbj-vscode/test/bbj-cpl-fallback-dedup.test.ts
    - bbj-vscode/test/bbj-kept-check.test.ts

key-decisions:
  - "Task 1 (tracer) landed the whole in-flight/supersession path in one commit, then the tracer feedback gate re-ran the plan's own targeted <verify> before Task 2 started (auto mode active)."
  - "Tasks 2 and 3 were run test-first as their tdd=true instruction requires, verified red by temporarily restoring the prior commit's production file(s) via `git checkout HEAD --`, confirming the new/updated tests failed against it, then restoring the production change and confirming green -- the same discipline this phase's earlier plans established."
  - "Task 2's own action step 3 (confirm composeOnSaveDiagnostics' fallback path and fix it if a test shows otherwise) surfaced two plan-04 tests whose 'merges as before' expectation was for the on-save fallback path's OLD (pre-this-plan) behavior: once Task 2 wires the kept-check composition into on-save regardless of whether the checked text is provably on disk, an untrustworthy result is now kept and shown (appended beside every Langium diagnostic, none suppressed) rather than merged with the old same-line source relabel. Updated both tests' titles and expectations to the new, plan-specified behavior rather than leaving them passing against a rule this plan deliberately supersedes."
  - "Two of Task 3's own new tests needed a test-authoring fix before they exercised anything real: a mode-switch test that never called builder.update() never gave BBjDocumentValidator's lazily-injected constructor (and its onDidClose subscription) a chance to run, and a rebuild-simulation test's own extra manual runBbjcplForDocuments() call, followed immediately by builder.update()'s own internal call to the same method, 'burned' the one-time post-switch trigger-changed suppression a real settings-change reload only ever triggers once. Both were caught while writing the tests, before either was ever committed -- not a deviation to already-landed work under any of Rules 1-4."

requirements-completed: [TRIG-04, DIAG-01]

coverage:
  - id: D1
    description: "Under on-save, a save's verdict that resolves after the user typed is kept and correctly placed on its (possibly shifted) line; a newer save's cycle always supersedes an older still-in-flight one, whichever resolves last; debounced keeps its own stale-verdict drop unchanged"
    requirement: "TRIG-04"
    verification:
      - kind: unit
        ref: "test/on-save-kept-errors.test.ts#in-flight results and supersession under on-save (4 tests: tracer, supersession newer-first, supersession older-first, debounced regression)"
        status: pass
      - kind: unit
        ref: "test/live-parse-interleaving.test.ts (11 tests, unchanged, still green)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Under on-save, a bbjcpl fallback result is kept and re-placed the same way a verdict is -- shows once per finding when the checked text is provably on disk, stays kept (appended, nothing suppressed) when it is not, and a later empty-result save clears the previously kept diagnostic; debounced's own fallback publish is unchanged"
    requirement: "DIAG-01"
    verification:
      - kind: unit
        ref: "test/on-save-kept-errors.test.ts#fallback results kept until the next save, end to end (4 tests)"
        status: pass
      - kind: unit
        ref: "test/bbj-cpl-fallback-dedup.test.ts (8 tests, 2 updated to the new on-save behavior, tracer test extended with a kind/seen assertion)"
        status: pass
    human_judgment: false
  - id: D3
    description: "A runtime switch away from on-save keeps each open file's current compiler errors (verdict or fallback) visible under debounced until that file's own first debounced check replaces them; off and close still forget every kept check and change log; steady-state debounced is unaffected; a verdict and a Langium validation of the same text still end with deep-equal document.diagnostics regardless of arrival order"
    verification:
      - kind: unit
        ref: "test/on-save-kept-errors.test.ts#mode switches keep current errors (7 tests)"
        status: pass
      - kind: unit
        ref: "whole-suite vitest run, --maxWorkers=2, RUN_BBJ_TESTS=0: numFailedTests=0, numTotalTests=2671"
        status: pass
    human_judgment: false

# Metrics
duration: 95min
completed: 2026-09-24
status: complete
---

# Phase 106 Plan 06: Keep, Supersede, and Switch — On-Save Compiler Errors Summary

**A per-document check-sequence counter lets a save's in-flight verdict or bbjcpl fallback result survive typing and be superseded only by a genuinely newer save; a `storedUnderOnSave` flag on the kept check lets a runtime switch away from on-save keep showing a file's current compiler errors until its own first debounced check replaces them.**

## Performance

- **Duration:** 95 min
- **Started:** 2026-09-24T14:12:00Z
- **Completed:** 2026-09-24T15:47:00Z
- **Tasks:** 3
- **Files modified:** 6 (0 created, 6 modified)

## Accomplishments
- `bbj-document-builder.ts` gained a `checkSequence` counter, bumped at the start of every debounce cycle before any `await`; under on-save a cycle whose own number no longer matches the counter's current value has been superseded by a newer save's cycle and stores/publishes nothing, whichever of the two resolves last.
- The verdict branch's entrance condition widened so a save's verdict is composed and kept even once the text has moved on from typing (same text-document object, on-save trigger), while `seen` is computed against the text and version the check actually ran against so `composeWithVerdict`'s own current-version check still recognizes it; debounced keeps its original, stricter `stillCurrent` guard untouched.
- The save-time compile fallback branch now stores a `kind: 'fallback'` kept check in every mode except off, mirroring the verdict branch's own staleness rule under on-save (same-text-document-object plus supersession) and its own storage discipline (stored under debounced too, so a later switch to on-save shows the last save's errors instead of starting from nothing; an empty compile result clears the previous save's kept diagnostic).
- `KeptCheck` gained `storedUnderOnSave: boolean`, set from the trigger at the exact moment each check is stored; `validateDocument` now also uses the kept-check composition under debounced when the stored check has this flag `true`, so a switch away from on-save keeps a file's current compiler errors visible through a post-switch rebuild and the next debounced edit, until that edit's own check stores a fresh kept check with the flag `false` — after which steady-state debounced never consults a kept check again.
- 15 new/updated tests across three files pin the in-flight, supersession, kept-fallback, and mode-switch behaviors end to end, through the real text-document store and the change-recording configuration built in earlier plans of this phase.

## Task Commits

Each task was committed atomically:

1. **Task 1: A save's verdict that arrives after the user typed is kept on the moved lines, and a newer save supersedes it** - `35155da4` (feat)
2. **Task 2: bbjcpl fallback results are kept until the next save and follow their lines** - `d727eec4` (test), `a4552423` (feat)
3. **Task 3: Mode switches keep current errors, off and close forget them, and the whole suite is green** - `61d927ca` (test), `6824b2ca` (feat)

**Plan metadata:** (this commit)

_Note: Task 1 carried `type="tracer"` and landed as a single production-quality commit with its own end-to-end test coverage, per this phase's own tracer discipline; the auto-mode tracer feedback gate re-ran the plan's `<verify>` before Task 2 began. Tasks 2 and 3 carried `tdd="true"`: both were verified red by temporarily restoring the prior commit's production file(s) (`git checkout HEAD -- <file>`), confirming the new/updated assertions failed against it, then restoring the change and confirming green — producing a genuine `test(...)` then `feat(...)` pair for each._

## Files Created/Modified
- `bbj-vscode/src/language/bbj-document-builder.ts` — `checkSequence`, the widened verdict-branch entrance condition and its `checkedText`/`versionBeforeRequest`-based `composeWithVerdict` call, the fallback branch's on-save staleness/supersession check, its own `KeptCheck` storage and `composeOnSaveDiagnostics` publish, and `storedUnderOnSave` on both `setKeptCheck` call sites
- `bbj-vscode/src/language/bbj-document-validator.ts` — `validateDocument`'s new debounced-and-`storedUnderOnSave` branch
- `bbj-vscode/src/language/bbj-kept-check.ts` — `KeptCheck.storedUnderOnSave`
- `bbj-vscode/test/on-save-kept-errors.test.ts` — three new describe blocks: in-flight results and supersession (4 tests), fallback results kept until the next save (4 tests), mode switches keep current errors (7 tests)
- `bbj-vscode/test/bbj-cpl-fallback-dedup.test.ts` — two "not on disk" tests updated to the new on-save behavior (kept and shown, not merged); tracer test extended with a `kind`/`seen` assertion on the stored kept check
- `bbj-vscode/test/bbj-kept-check.test.ts` — `storedUnderOnSave` added to every `KeptCheck` literal so the file keeps type-checking against the widened interface (no behavior change to these tests)

## Decisions Made
- Task 2's fix to the two stale plan-04 "not on disk" tests is a deliberate consequence of this plan's own D-01/D-11-driven behavior change (an untrustworthy on-save fallback result is now kept and shown rather than merged), not a bug fix — the plan's own action text anticipated exactly this ("confirm composeOnSaveDiagnostics' fallback path... and fix it if a test shows otherwise").
- Two Task 3 test-authoring mistakes (a close test that never forced `BBjDocumentValidator`'s lazy instantiation; a rebuild-simulation test whose own extra manual `runBbjcplForDocuments()` call consumed the one-time post-switch suppression before `builder.update()`'s own internal call ran) were caught and fixed while the tests were still being written, before either was committed.

## Deviations from Plan

None — plan executed exactly as written, including its tracer and TDD discipline for Tasks 1-3.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- `TRIG-04` and `DIAG-01` are functionally implemented and verified here (every task's acceptance criteria and the plan's own `<verification>` block pass), and this is the last plan in the phase declaring either — both should now mark `Complete` in REQUIREMENTS.md via the shared-ID gate once this plan's own SUMMARY lands.
- The whole-suite gate (`RUN_BBJ_TESTS=0 vitest run --maxWorkers=2`) reports `numFailedTests=0` across 2671 tests. Two suites reported as failed test files (`run-call-navigation.test.ts`, `functional/installed-extension-e2e.test.ts` in the final run; a different but overlapping set — `line-break-validation.test.ts`, `functional/installed-extension-e2e.test.ts` and others — in an earlier run of the same command) both carry zero individually failing tests; re-running `bbj-document-validator.test.ts` alone (one of the files that failed as a whole suite when run combined with this plan's own six-file targeted command) passed cleanly in isolation. This matches the project's own documented "whole-suite hook timeouts are contention" pattern (STATE.md), not a regression — this machine was running concurrent unrelated work throughout this session.
- Phase 106's own remaining scope (the IntelliJ setting/init option, the VS Code description, both feature docs, and the hand-UAT/timing-recheck plan item) is unaffected by this plan and is tracked as its own later plan in this phase, per the phase's own plan-split discretion.

---
*Phase: 106-on-save-compiler-check-in-both-ides*
*Completed: 2026-09-24*

## Self-Check: PASSED

- All 6 modified files confirmed present on disk with the expected content (`git status --short` clean after each commit; no untracked source/test files left behind).
- All 5 task commits (`35155da4`, `d727eec4`, `a4552423`, `61d927ca`, `6824b2ca`) confirmed in `git log --oneline`.
- Plan `<verification>` re-run: the six-file targeted vitest command (`test/on-save-kept-errors.test.ts test/on-save-trigger.test.ts test/bbj-kept-check.test.ts test/bbj-cpl-fallback-dedup.test.ts test/bbj-document-validator.test.ts test/live-parse-interleaving.test.ts`) — 105 tests, all pass with `--maxWorkers=2`; `bbj-document-validator.test.ts` alone also passes cleanly (the file that intermittently times out only under this machine's whole-suite/combined-run contention). Whole suite: `numFailedTests=0`, `numTotalTests=2671`. Register check over `1427d059..HEAD` for `bbj-vscode/src bbj-vscode/test` — no output (clean).
- Every task's `<acceptance_criteria>` re-verified via the grep/test commands documented inline during execution — all passed (`checkSequence` count 5; `kind: 'fallback'` count 1; `storedUnderOnSave` count 2 in the validator).
- `tsc -p tsconfig.json --noEmit` — no errors.
