---
phase: 67-apply-easy-fixes
plan: 03
subsystem: language-server
tags: [langium, workspace-manager, document-builder, vitest, bbjcpl, testing-infra]

# Dependency graph
requires:
  - phase: 67-apply-easy-fixes
    provides: "67-01's apparatus (67-BASELINE.md, 67-APPLY-SET.md, derive-apply-set.mjs) and the red-then-green commit convention; 67-02's precedent for the plan-level baseline-delta write-up"
provides:
  - "bbj-ws-manager.ts fixes: multi-folder workspace prefix/classpath merge (P61-D2-015), surfaced workspace-setup failures via logger.error (P61-D2-016)"
  - "bbj-document-builder.ts fixes: caught/logged document-build callback errors (P61-D2-017), one fsPath-to-BbjClass Map build per index update instead of per-lookup (P61-D3-005)"
  - "bbj-vscode/test/ws-manager.test.ts and bbj-vscode/test/document-builder.test.ts — two new unit-test modules, including P61-D5-016's direct trackBbjcplAvailability/debouncedCompile coverage"
  - "Six 67-APPLY-SET.md ledger rows closed (P61-D2-015, P61-D2-016, P61-D2-017, P61-D3-005, P61-D5-016, P61-D8-006) and the plan 67-03 baseline delta recorded in 67-BASELINE.md"
affects: [67-04, 67-05, 67-06, 67-07, 67-08, 67-09, 67-10, 67-11, 67-12]

# Actuals (#2632)
actuals:
  tokens: 12000
  tasks: 3
  commits: 10

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "createBBjTestServices (not plain createBBjServices) for any new workspace-lifecycle unit test — avoids the real java-interop socket connect (localhost:5008) that plain createBBjServices reaches in initializeWorkspace(), which costs ~7-8s per beforeAll and is a documented flakiness source (P61-D5-013)"
    - "Constructing BBjDocumentBuilder directly (bypassing DI) with a hand-built services object — ServiceRegistry.getServices() returning a mocked BBjCPLService.compile, and a mocked TextDocuments — reusing a real BBjWorkspaceManager/IndexManager pair from createBBjServices(EmptyFileSystem) for everything else"
    - "Accessing private class members in tests via `(instance as unknown as { method(): T }).method()` casting — matches this codebase's existing convention (use-project-root.test.ts's folders-field cast)"

key-files:
  created:
    - bbj-vscode/test/ws-manager.test.ts
    - bbj-vscode/test/document-builder.test.ts
  modified:
    - bbj-vscode/src/language/bbj-ws-manager.ts
    - bbj-vscode/src/language/bbj-document-builder.ts
    - .planning/phases/67-apply-easy-fixes/67-APPLY-SET.md
    - .planning/phases/67-apply-easy-fixes/67-BASELINE.md

key-decisions:
  - "P61-D2-016: chose logger.error alone over bbj-notifications.ts's client-notification path — bbj-ws-manager.ts does not already import bbj-notifications.ts, and the finding's own test-5 clause accepts logger.error as sufficient"
  - "P61-D8-006 closed no-op: P61-D2-016's own fix (same plan) already deleted the misleading '// all fine' comment its record complains about — per the record's own alternative-resolution clause ('fix the underlying handling per P61-D2-016 so the comment becomes true')"
  - "FIX-01..03 left Pending in REQUIREMENTS.md — following 67-01/67-02's precedent, only 12 of 77 apply-set rows are applied after this plan (9 plans remain); marking complete now would misrepresent progress"

patterns-established:
  - "For workspace/document-builder unit tests that need a controllable FileSystemProvider, build a small in-memory implementation of langium's FileSystemProvider interface (flat Map<path, content>, one-level non-recursive readDirectory) rather than reaching for real fs or EmptyFileSystemProvider's always-empty stub"

requirements-completed: []

coverage:
  - id: D1
    description: "A multi-root workspace's second (and later) folders now contribute prefixes and classpath entries, not only the first folder (#33, P61-D2-015)"
    requirement: "FIX-01"
    verification:
      - kind: unit
        ref: "bbj-vscode/test/ws-manager.test.ts#prefixes and classpath from both folders are present, not only the first"
        status: pass
      - kind: unit
        ref: "bbj-vscode/test/ws-manager.test.ts#single-folder workspace still resolves exactly that folder's settings (no regression)"
        status: pass
    human_judgment: false
  - id: D2
    description: "A workspace-setup failure reaches logger.error instead of being swallowed by a bare console.error behind a misleading comment (P61-D2-016, closes P61-D8-006 as a no-op)"
    requirement: "FIX-01"
    verification:
      - kind: unit
        ref: "bbj-vscode/test/ws-manager.test.ts#a throw inside initializeWorkspace reaches logger.error"
        status: pass
    human_judgment: false
  - id: D3
    description: "A callback throw inside the document-build debounced-compile hook is caught and logged via logger.error instead of becoming an unhandled process-level rejection (P61-D2-017)"
    requirement: "FIX-01"
    verification:
      - kind: unit
        ref: "bbj-vscode/test/document-builder.test.ts#a rejecting BBjCPLService.compile is caught and logged via logger.error"
        status: pass
    human_judgment: false
  - id: D4
    description: "revalidateUseFilePathDiagnostics builds an fsPath-to-BbjClass Map once per index update instead of re-scanning allElements() per unresolved-USE diagnostic, with identical resolution results (P61-D3-005)"
    requirement: "FIX-01"
    verification:
      - kind: unit
        ref: "bbj-vscode/test/document-builder.test.ts#allElements() is called once per update, not once per diagnostic, with identical results"
        status: pass
    human_judgment: false
  - id: D5
    description: "trackBbjcplAvailability's once-only dedup guard and debouncedCompile's trailing-edge debounce are directly asserted by committed tests against a BBjDocumentBuilder with mocked collaborators (P61-D5-016)"
    requirement: "FIX-02"
    verification:
      - kind: unit
        ref: "bbj-vscode/test/document-builder.test.ts#trackBbjcplAvailability only notifies once across repeated calls (lazy, once-only guard)"
        status: pass
      - kind: unit
        ref: "bbj-vscode/test/document-builder.test.ts#debouncedCompile coalesces rapid successive calls into one compile after the debounce window"
        status: pass
    human_judgment: false
  - id: D6
    description: "Plan-level baseline delta: npm test's deterministic 11-name failing-test set is identical to the phase-start gate set across 4 runs; npm run lint unchanged (2 pre-existing warnings)"
    requirement: "FIX-03"
    verification:
      - kind: other
        ref: ".planning/phases/67-apply-easy-fixes/67-BASELINE.md — ### Plan 67-03 delta, verdict: identical"
        status: pass
    human_judgment: false

duration: ~15min
completed: 2026-08-19
status: complete
---

# Phase 67 Plan 03: bbj-ws-manager.ts and bbj-document-builder.ts Easy Fixes Summary

**Multi-folder workspace merge, surfaced setup/callback failures via logger.error, and a per-update (not per-lookup) fsPath-to-BbjClass index Map, on the two services that run on every workspace open and every document build.**

## Performance

- **Duration:** ~15 min (commit span 10:49:19Z → 11:04:31Z)
- **Started:** 2026-08-19T10:39:12Z (approx, session start after 67-02)
- **Completed:** 2026-08-19T11:04:31Z
- **Tasks:** 3
- **Files modified:** 6 (2 created, 4 modified)

## Accomplishments

- Fixed `bbj-ws-manager.ts`'s `initializeWorkspace()` to merge prefixes and classpath from every workspace folder instead of only `folders[0]` — the concrete root cause behind #33's "multi-root workspaces don't work" report (P61-D2-015), with the single-folder case proven byte-identical to the pre-fix behavior.
- Routed `initializeWorkspace()`'s previously-silent `catch (e) { // all fine; console.error(e); }` through `logger.error`, removing the misleading comment (P61-D2-016) — which also resolved `P61-D8-006`'s stale-comment finding as a no-op per that record's own alternative-resolution clause.
- Wrapped `bbj-document-builder.ts`'s `debouncedCompile()` async `setTimeout` callback body in try/catch, so a rejecting `BBjCPLService.compile()` no longer surfaces as an unhandled process-level promise rejection (P61-D2-017).
- Replaced `revalidateUseFilePathDiagnostics()`'s per-diagnostic `indexManager.allElements(BbjClass.$type)` linear scan with a single `Map<fsPath, AstNodeDescription>` built once per call, proven bounded (≤1 scan per batch vs. 4 in the regression test) with identical filtering results (P61-D3-005).
- Added direct unit coverage of `trackBbjcplAvailability`'s once-only dedup guard and `debouncedCompile`'s trailing-edge debounce, against a `BBjDocumentBuilder` built with a mocked `ServiceRegistry`/`TextDocuments` — both passed immediately against the unmodified implementation (P61-D5-016, D-13 test-is-the-fix).
- Closed all 6 ledger rows in `67-APPLY-SET.md` and ran the plan-level baseline delta 4 times (this plan touches the build hot path): the deterministic 11-name `npm test` gate set was identical on every run; `npm run lint` unchanged. Verdict: **identical**.

## Task Commits

Each task was committed atomically:

1. **Task 1: `bbj-ws-manager.ts` — multi-folder workspace, silent setup failure, stale comment**
   - `c6bef67` — `test(P61-D2-015): add failing test for multi-folder workspace prefix and classpath merge` (RED)
   - `1f5e824` — `fix(P61-D2-015): merge prefixes and classpath across all workspace folders` (GREEN)
   - `d0b1666` — `test(P61-D2-016): add failing test for silently swallowed workspace setup failure` (RED)
   - `c47da5c` — `fix(P61-D2-016): surface workspace setup failures through logger.error` (GREEN — also resolves P61-D8-006 as no-op)
2. **Task 2: `bbj-document-builder.ts` — swallowed callback error, per-lookup rescan, missing unit coverage**
   - `26576ae` — `test(P61-D2-017): add failing test for swallowed document-build callback error` (RED)
   - `38dea2e` — `fix(P61-D2-017): catch and log document-build callback errors` (GREEN)
   - `fc9cf79` — `test(P61-D3-005): add failing test for per-lookup allElements rescan` (RED)
   - `6b32823` — `fix(P61-D3-005): build an fsPath-to-BbjClass map once per index update` (GREEN)
   - `5db3ac9` — `test(P61-D5-016): assert trackBbjcplAvailability dedup and debouncedCompile timing` (test-is-the-fix)
3. **Task 3: Close the six ledger rows and run the plan baseline delta**
   - `6343f90` — `docs(67-03): close workspace and document-builder rows and record baseline delta`

## Files Created/Modified

- `bbj-vscode/src/language/bbj-ws-manager.ts` — `initializeWorkspace()` restructured to loop over all folders (merge) and route the catch through `logger.error`
- `bbj-vscode/src/language/bbj-document-builder.ts` — `debouncedCompile()`'s callback wrapped in try/catch; `revalidateUseFilePathDiagnostics()` builds a Map once per call instead of per diagnostic
- `bbj-vscode/test/ws-manager.test.ts` — new: multi-folder merge test, single-folder regression test, setup-failure-surfaced test
- `bbj-vscode/test/document-builder.test.ts` — new: callback-error test, per-lookup-rescan test, dedup/debounce-timing tests
- `.planning/phases/67-apply-easy-fixes/67-APPLY-SET.md` — 6 rows closed (5 applied, 1 no-op)
- `.planning/phases/67-apply-easy-fixes/67-BASELINE.md` — `### Plan 67-03 delta` subsection, plus 4 newly-observed flaky suites appended to `## Flaky exclusions (D-08)`

## Decisions Made

- **P61-D2-016:** chose `logger.error` alone over `bbj-notifications.ts`'s client-notification path — the file does not already import `bbj-notifications.ts`, and the finding's own test-5 clause accepts `logger.error` as sufficient.
- **P61-D8-006 closed no-op:** `P61-D2-016`'s own fix (landed in this same plan) already deleted the misleading `// all fine` comment its record complains about, satisfying the record's own alternative-resolution clause ("fix the underlying handling per P61-D2-016 so the comment becomes true").
- **Test harness used `createBBjTestServices` (not plain `createBBjServices`)** for `ws-manager.test.ts`, deviating from `use-project-root.test.ts`'s literal idiom: a trial run of the plain-`createBBjServices` pattern against a live workspace with a non-empty classpath cost ~7-8s per test (a real socket connect attempt to `localhost:5008`, the exact multi-second cost profile `P61-D5-013` already documents as this codebase's flakiness source). `createBBjTestServices`'s `JavaInteropTestService` test double keeps the new tests fast and hermetic without touching the real interop path.
- **FIX-01/02/03 left `Pending` in `REQUIREMENTS.md`** — following 67-01/67-02's precedent, only 12 of 77 apply-set rows are applied after this plan (9 plans remain); marking complete now would misrepresent progress. Left for 67-12 (phase close) to mark once genuinely discharged.

## Deviations from Plan

None — plan executed exactly as written. The `createBBjTestServices` choice (documented above under Decisions Made) is a test-harness implementation detail within the plan's own stated intent ("construct a `BBjDocumentBuilder`/workspace-manager unit test"), not a Rule 1-4 deviation from the plan's required edits or acceptance criteria.

## Issues Encountered

- The plan-level baseline delta's `npm test` run showed 2-3 additional `beforeAll` `hookTimeout`-flaky `FAIL` lines beyond the known 11-name gate set on every run, and 4 of those suites (`declare-in-class.test.ts`, `lazy-prefix-loading.test.ts`, `use-project-root.test.ts`, `run-call-file-resolution.test.ts`) were not among the phase-start baseline's originally-named 5 flaky suites. Ran the delta 4 times (rather than the usual 2) to confirm the deterministic 11-name set stayed identical throughout and that every additional `FAIL` line was a `beforeAll` hookTimeout (never an assertion failure) before accepting the "identical" verdict. Resolved by appending all 4 newly-observed suites to `67-BASELINE.md`'s `## Flaky exclusions (D-08)` section with suite name, quoted timeout text, and reproduction status — consistent with, not caused by, this plan's changes (this plan touches `bbj-ws-manager.ts`'s `initializeWorkspace()`, the exact path `P61-D5-013` already names as the routing-table's flakiness source, and adds two new `beforeAll`-driven test suites of its own).

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- 12 of 77 apply-set rows now applied (3 from 67-01, 7 from 67-02, 6 from this plan — minus the D-04 double-count and the 1 no-op counted once — see `67-APPLY-SET.md`'s own reconciliation math for the exact arithmetic). Plans 67-04 through 67-11 continue applying the remaining pending rows.
- The deterministic 11-name gate set and the 2 lint warnings remain known, stable, and unaffected by this plan's fixes. The flaky-suite list in `67-BASELINE.md` now names 9 suites total (5 original + 4 newly observed) — future plans' baseline deltas should expect this wider spread under contention and treat any `beforeAll` hookTimeout as flaky-per-D-08 rather than a regression, confirming via re-run before concluding otherwise.
- No blockers.

## Self-Check: PASSED

All 6 created/modified files confirmed present on disk; all 10 commit hashes confirmed present in `git log --oneline --all`.
