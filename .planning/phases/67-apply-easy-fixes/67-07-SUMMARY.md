---
phase: 67-apply-easy-fixes
plan: 07
subsystem: language-server
tags: [vitest, langium, test-coverage, hover, signature-help, scope, overload-selector, notifications]

# Dependency graph
requires:
  - phase: 67-apply-easy-fixes
    provides: 67-01's apparatus (67-APPLY-SET.md ledger, 67-BASELINE.md baseline, the
      red-then-green/test-is-the-fix commit conventions) and 67-05's P61-D2-019
      events.ts duplicate-declaration fix, which this plan's builtin-library-members.test.ts
      equivalence test discovers is NOT mirrored in the never-read physical events.bbl file
provides:
  - Ten closed D5/D8 ledger rows in 67-APPLY-SET.md — P61-D5-004, P61-D5-005, P61-D5-006,
    P61-D5-007, P61-D5-008, P61-D5-011, P61-D5-012, P61-D5-015, P61-D5-017, P61-D8-007
  - "### Plan 67-07 delta" section in 67-BASELINE.md recording verdict: identical (3 full runs)
  - Five new/extended test files closing every remaining D5 test-coverage gap in
    src/language/'s LSP-facing providers (signature help, hover, overload selection,
    scope shadowing, line-break validation, client notifications, the example-files sweep,
    the CPL service's unvalidated spawn path, and the three under-tested builtin catalogs)
affects: [67-08, 67-09, 67-10, 67-11, 67-12]

# Actuals (#2632)
actuals:
  tokens: 16266
  tasks: 3
  commits: 11

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "D5 anti-vacuous discipline: every test-is-the-fix commit was preceded by locally breaking
       the exact behaviour it asserts (regex swap, tie-comparison operator flip, scope-registration
       gate, try/catch removal, dedup-guard inversion, entry rename), observing the test fail with
       the specific error captured verbatim in the ledger row's notes:, then reverting and
       reconfirming green before committing — the broken state never touched git"
    - "vi.resetModules() + dynamic re-import per test isolates a module with process-lifetime
       singleton state (bbj-notifications.ts's _connection/bbjcplAvailableState) so one test's
       mutation can't leak into another's assertions within the same file"
    - "Empirical discovery over assumed API shape: bbj-hover.ts's inherited-field detection only
       fires when the hovered field's own CST node is itself the receiver of an outer MemberCall
       (a chained d!.x.y access), not a direct one-hop d!.x — found by instrumenting the provider
       with temporary debug logging rather than guessing from the source reading alone"
    - "Unique-name-set (not raw-count) equivalence for .ts-vs-.bbl catalog comparison: the physical,
       never-read events.bbl still carries entries P61-D5-005's parent phase (P61-D2-019, landed
       earlier in this phase) removed only from the consumed events.ts — comparing unique names
       instead of declaration counts avoids re-flagging that already-understood, out-of-scope
       staleness as new drift"

key-files:
  created:
    - bbj-vscode/test/line-break-validation.test.ts
    - bbj-vscode/test/overload-selector.test.ts
    - bbj-vscode/test/notifications.test.ts
    - bbj-vscode/test/builtin-library-members.test.ts
    - bbj-vscode/test/test-data/cpl-fixture-bbjhome/bin/bbjcpl
  modified:
    - bbj-vscode/test/variable-scoping.test.ts
    - bbj-vscode/test/functional/lsp-features.test.ts
    - bbj-vscode/test/hover.test.ts
    - bbj-vscode/test/example-files.test.ts
    - bbj-vscode/test/cpl-service.test.ts
    - bbj-vscode/test/builtin-functions-library.test.ts
    - .planning/phases/67-apply-easy-fixes/67-APPLY-SET.md
    - .planning/phases/67-apply-easy-fixes/67-BASELINE.md

key-decisions:
  - "P61-D5-005 branch taken: 'document the current behaviour' (not 'assert rejection once
     P61-D1-003 is fixed') per the record's own two-branch clause — P61-D1-003 is major-refactor
     and routes to Phase 68. Pinned the current unvalidated bbjHome/bin/bbjcpl spawn with a
     controlled, repo-owned fixture binary (never an external/writable path, per T-67-07-02),
     naming P61-D1-003 in both the test comment and the ledger row"
  - "P61-D5-011 home decision: extended the EXISTING test/functional/lsp-features.test.ts rather
     than creating test/signature-help.test.ts, since the file already existed at execution time —
     per the plan's own escape clause"
  - "P61-D5-012's inherited-field hover case required empirical construction, not the literal
     one-hop example implied by the finding record's own trace-tier evidence: `d!.x` alone never
     enters the isMemberCall(referenceNode.$container) branch. Used a chained `d!.x.y` access with
     a BbjClass-typed field x — documented inline in the test as a discovery, not filed as a new
     finding, since the code's actually-reachable behaviour is what a coverage test pins"
  - "P61-D5-017's equivalence assertion compares unique declared-name SETS between the .ts-derived
     virtual document and the physical .bbl file, not raw declaration counts — events.bbl still
     carries the pre-P61-D2-019 duplicate ON_MOUSE_ENTER/ON_MOUSE_EXIT entries that events.ts no
     longer has (that earlier fix in this phase correctly only touched the consumed file); a
     count-based comparison would have mistaken that known, out-of-scope staleness for new drift"

patterns-established:
  - "Two beforeAll-hookTimeout flaky occurrences hit this plan's own new files
     (hover.test.ts, overload-selector.test.ts, line-break-validation.test.ts) under full-suite
     contention on individual npm test runs — each reproduced cleanly in isolation, confirming the
     load-dependent pattern D-08 already documents rather than a defect in the new tests themselves"

requirements-completed: []

coverage:
  - id: D1
    description: "Six missing-coverage tests for language services (line-break validation CRLF/no-trailing-newline, overload-selector tie rule, variable-scoping local-shadows-field, signature-help label/activeParameter/documentation, hover documented-member/inherited-field/error-degrade, notifications init-guard/dedup)"
    verification:
      - kind: unit
        ref: "bbj-vscode/test/line-break-validation.test.ts, overload-selector.test.ts, variable-scoping.test.ts (P61-D5-008 block), functional/lsp-features.test.ts (Signature help block), hover.test.ts (P61-D5-012 block), notifications.test.ts — 64/64 pass"
        status: pass
    human_judgment: false
  - id: D2
    description: "Four findings inside the test tree itself: example-files.test.ts awaits every parse, cpl-service.test.ts pins the unvalidated bbjHome spawn, builtin-library-members.test.ts covers labels/variables/events plus a .ts-vs-.bbl equivalence assertion, builtin-functions-library.test.ts's comment corrected"
    verification:
      - kind: unit
        ref: "bbj-vscode/test/example-files.test.ts, cpl-service.test.ts, builtin-library-members.test.ts, builtin-functions-library.test.ts — 22/22 pass"
        status: pass
    human_judgment: false
  - id: D3
    description: "Ten ledger rows closed with no TBD/pending, every commit sha resolves, all nine D5 rows carry an anti-vacuous note, plan-level baseline delta recorded as identical"
    verification:
      - kind: other
        ref: ".planning/phases/67-apply-easy-fixes/67-APPLY-SET.md rows 27-31,33-35,37,44; 67-BASELINE.md '### Plan 67-07 delta' — 3 full npm test runs, same 11-name gate set every time; npm run lint exit 0"
        status: pass
    human_judgment: false

duration: ~33min
completed: 2026-08-19
status: complete
---

# Phase 67 Plan 07: D5 Test-Coverage Findings Summary

**Closed all nine remaining D5 test-coverage gaps plus one D8 comment fix, adding five new test files and extending five existing ones — every added test proven non-vacuous against a deliberately broken local copy before landing, per the phase's D-13 discipline.**

## Performance

- **Duration:** ~33 min (commit span 13:34:51Z → 13:47:17Z)
- **Tasks:** 3
- **Files touched:** 13 (5 created, 8 modified)
- **Commits:** 11 (9 `test(...)`, 1 `docs(P61-D8-007):`, 1 `docs(67-07):`)

## Accomplishments

- **Six language-service coverage gaps closed** (Task 1): CRLF and missing-trailing-newline
  handling in line-break validation; the documented "linked declaration wins ties" rule in
  `bbj-overload-selector.ts`, driven directly against a real tied `MethodDecl` pair; a local
  shadowing a same-named class field (`bbj-scope.ts`); `provideSignatureHelp` on a real
  `MethodCall`, asserting label, parameter labels, markdown documentation, and `activeParameter`
  for two cursor positions; hover content for a documented member, an inherited field (via a
  chained `d!.x.y` access — the one-hop case doesn't reach the inheritance-detection branch), and
  the error-degrade path; and `bbj-notifications.ts`'s no-op-before-init guard and dedup logic.
- **Four test-tree findings closed** (Task 2): `example-files.test.ts`'s `.forEach(async...)`
  replaced with an awaited `for...of` loop (verified with a locally-added, never-committed
  malformed `.bbj` fixture); `cpl-service.test.ts` pins the CPL service's current unvalidated
  `bbjHome/bin/bbjcpl` spawn behaviour against a controlled, repo-owned substitute binary, naming
  `P61-D1-003` as the finding that will change it; a new `builtin-library-members.test.ts` covers
  `labels.ts`/`variables.ts`/`events.ts` (previously zero coverage) plus a `.ts`-vs-`.bbl`
  unique-name equivalence assertion; and `builtin-functions-library.test.ts`'s misleading header
  comment corrected to state it guards the `.ts`-derived virtual document, not the physical
  `.bbl` file.
- **Ledger and baseline closed** (Task 3): all ten rows in `67-APPLY-SET.md` completed with
  `fail_before: inapplicable`, `user_facing: no`, and (for the nine D5 rows) an `anti-vacuous:`
  note quoting the observed red-state error message. `npm run lint` exits 0 with zero warnings;
  three full `npm test` runs all produced the identical 11-name deterministic gate set (the
  pre-existing `linking.test.ts` interop failures) with zero net regressions — verdict:
  **identical**.

## Task Commits

Each task was committed atomically:

1. **Task 1: Six missing-coverage tests for language services**
   - `d080471` — `test(P61-D5-006): cover CRLF and missing trailing newline in line-break validation`
   - `64c9d1e` — `test(P61-D5-007): assert the linked declaration wins an exact overload tie`
   - `1b8e786` — `test(P61-D5-008): assert a local shadows a same-named field`
   - `e0acbbf` — `test(P61-D5-011): assert signature help label, activeParameter and documentation`
   - `42b8881` — `test(P61-D5-012): cover hover content for members, inherited fields and errors`
   - `540232c` — `test(P61-D5-015): cover client-notification init guard and dedup`
2. **Task 2: The four findings inside the test tree itself**
   - `6af46c8` — `test(P61-D5-004): await every parse in the example-files sweep`
   - `500001d` — `test(P61-D5-005): pin the current unvalidated bbjHome spawn behaviour`
   - `f3ba5c5` — `test(P61-D5-017): cover builtin library labels, variables and events`
   - `40d3af1` — `docs(P61-D8-007): correct the builtin-library test comment`
3. **Task 3: Close the ten ledger rows and run the plan baseline delta**
   - `78bcca0` — `docs(67-07): close the D5 coverage rows and record baseline delta`

## Files Created/Modified

- `bbj-vscode/test/line-break-validation.test.ts` — new, 3 tests
- `bbj-vscode/test/overload-selector.test.ts` — new, 1 test
- `bbj-vscode/test/notifications.test.ts` — new, 3 tests
- `bbj-vscode/test/builtin-library-members.test.ts` — new, 9 tests
- `bbj-vscode/test/test-data/cpl-fixture-bbjhome/bin/bbjcpl` — new, controlled substitute binary fixture
- `bbj-vscode/test/variable-scoping.test.ts` — +1 test (P61-D5-008 block)
- `bbj-vscode/test/functional/lsp-features.test.ts` — +2 tests (Signature help block)
- `bbj-vscode/test/hover.test.ts` — +3 tests (P61-D5-012 block)
- `bbj-vscode/test/example-files.test.ts` — loop body rewritten, same 1 test
- `bbj-vscode/test/cpl-service.test.ts` — +1 test
- `bbj-vscode/test/builtin-functions-library.test.ts` — header comment corrected, no test change
- `.planning/phases/67-apply-easy-fixes/67-APPLY-SET.md` — 10 rows closed
- `.planning/phases/67-apply-easy-fixes/67-BASELINE.md` — `### Plan 67-07 delta` appended

No file under `bbj-vscode/src/` was modified — matches the plan's own stated scope.

## Decisions Made

- **P61-D5-005** took the "document current behaviour" branch (not "assert rejection"), since
  `P61-D1-003` is major-refactor and out of scope; the fixture binary lives under
  `test/test-data/` (repo-controlled, per threat `T-67-07-02`), never an external or writable path.
- **P61-D5-011** extended the existing `test/functional/lsp-features.test.ts` rather than creating
  a new `test/signature-help.test.ts`, per the plan's own escape clause (the file already existed).
- **P61-D5-012**'s inherited-field hover test required a chained `d!.x.y` construction with a
  `BbjClass`-typed field — the literal one-hop `d!.x` example implied by the finding's trace-tier
  evidence never reaches the `isMemberCall(referenceNode.$container)` branch. Documented inline in
  the test rather than filed as a new finding, since a coverage test's job is to pin the code's
  actually-reachable behaviour.
- **P61-D5-017**'s `.ts`-vs-`.bbl` equivalence assertion compares unique name SETS, not raw
  declaration counts, so the never-read `events.bbl`'s pre-`P61-D2-019` duplicate leftovers (that
  fix, landed earlier in this phase, correctly only touched the consumed `.ts` file) aren't
  mistaken for new drift.

## Deviations from Plan

None — plan executed exactly as written. All decisions above are judgment calls within the
plan's own stated intent (test-only, D5 test-is-the-fix, no source change), not Rule 1-4
auto-fixes.

## Issues Encountered

- `test/hover.test.ts` and `test/overload-selector.test.ts` (this plan's own new files) hit the
  documented `beforeAll`-hookTimeout flakiness (10s default) on run 1 of the three-run baseline
  delta, purely from full-suite contention — both passed cleanly (8/8) when re-run in isolation
  immediately after. `test/line-break-validation.test.ts` hit the same pattern on run 2. None is a
  defect in the new tests; all three are the load-dependent pattern `67-BASELINE.md`'s
  `## Flaky exclusions (D-08)` section already names for other suites in this codebase.
- `isVariableDecl`'s generated `$type` union also matches `FieldDecl`/`ArrayDecl`/`ParameterDecl`
  (they share the `VariableDecl` grammar rule family), so `test/variable-scoping.test.ts`'s
  P61-D5-008 test had to narrow to `node.$type === 'VariableDecl'` specifically to distinguish the
  DECLAREd local from the class field of the same name — documented inline.
- `bbj-hover.ts`'s inherited-field detection (`referenceNode.$container` must itself be a
  `MemberCall`) only fires for chained member access, not the more intuitive one-hop case — found
  by instrumenting the provider with temporary local debug logging (never committed) rather than
  guessing from the source alone.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Plans 67-08 through 67-11 continue applying the remaining pending `67-APPLY-SET.md` rows; this
  plan leaves no D5 row open.
- No blockers. The 11-name deterministic gate set, the beforeAll-hookTimeout flakiness pattern,
  and the zero-warning lint state are all unchanged and stable — future plans should continue the
  same per-plan baseline-delta convention (D-09).

## Self-Check: PASSED

All 13 created/modified files confirmed present on disk; all 11 commit hashes confirmed present
in `git log --oneline --all`.
