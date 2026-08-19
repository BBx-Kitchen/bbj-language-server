---
phase: 67-apply-easy-fixes
plan: 04
subsystem: language-server
tags: [langium, lsp-completion, document-symbols, lexer, vitest, testing-infra]

# Dependency graph
requires:
  - phase: 67-apply-easy-fixes
    provides: "67-01's apparatus (67-BASELINE.md, 67-APPLY-SET.md, derive-apply-set.mjs) and the red-then-green commit convention; 67-03's precedent for the plan-level baseline-delta write-up"
provides:
  - "bbj-completion-provider.ts fixes: cancelToken threaded through getFieldCompletion/getFilePathCompletion/completeAutoImportClasses (P61-D2-013), a prefix-keyed in-flight-promise memoization cache around findClassCandidatesByPrefix (P61-D3-004)"
  - "bbj-document-symbol-provider.ts fixes: coveredPositions keyed on the full node range via a shared encodeRangeKey helper (P61-D2-014), the two now-unused eslint-disable directives deleted (P61-D4-010) — this is the edit that makes npm run lint literally clean (D-10)"
  - "bbj-token-builder.ts fixes: spliceToken throws before splicing at a missing token index instead of silently corrupting the stream (P61-D2-008), the 14-call priority-reordering block extracted into reorderTokenPriorities (P61-D4-005)"
  - "Six 67-APPLY-SET.md ledger rows closed (P61-D2-013, P61-D3-004, P61-D2-014, P61-D4-010, P61-D2-008, P61-D4-005) and the plan 67-04 baseline delta recorded in 67-BASELINE.md, including the lint-clean milestone"
affects: [67-05, 67-06, 67-07, 67-08, 67-09, 67-10, 67-11, 67-12]

# Actuals (#2632)
actuals:
  tokens: 14300
  tasks: 3
  commits: 11

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "In-flight-promise memoization: cache the Promise itself (not just its resolved value), set into the cache synchronously before any await, so concurrent callers racing for the same key (Langium's completionForCrossReference invoked via Promise.all) share one underlying call instead of each starting a duplicate"
    - "Testing a provider's private helper directly via `(instance as unknown as {method(...): T}).method(...)` casting with a hand-built minimal argument shape, when driving the real public API end-to-end would depend on unstable parser/error-recovery internals to reproduce the exact collision deterministically"
    - "Reverting a just-written source fix to its last-committed state with `git checkout -- <file>` to re-verify a test is genuinely RED against the true pre-fix baseline, when the fix was drafted before the RED commit was captured"

key-files:
  created: []
  modified:
    - bbj-vscode/src/language/bbj-completion-provider.ts
    - bbj-vscode/src/language/bbj-document-symbol-provider.ts
    - bbj-vscode/src/language/bbj-token-builder.ts
    - bbj-vscode/test/completion-test.test.ts
    - bbj-vscode/test/document-symbol.test.ts
    - bbj-vscode/test/lexer.test.ts
    - .planning/phases/67-apply-easy-fixes/67-APPLY-SET.md
    - .planning/phases/67-apply-easy-fixes/67-BASELINE.md

key-decisions:
  - "P61-D3-004's cache stores the in-flight Promise, not the resolved value: a debug repro showed Langium's own completion engine calls completionForCrossReference more than once per cross-reference feature at one offset via Promise.all, so two calls for the same prefix within one request can both reach a resolved-value cache before either resolves; caching the promise itself dedupes that race, not only sequential repeats"
  - "P61-D3-004's cache is prefix-keyed only, not document-scoped, argued safe in the ledger notes (T-67-04-04): findClassCandidatesByPrefix depends solely on JavaInteropService's workspace-wide class index, which every document shares"
  - "P61-D2-014's regression test drives the private collectPositions method directly with two synthetic DocumentSymbol objects sharing range.start, rather than a real BBj parse-error snippet — constructing a genuine source reproducing the exact AST collision deterministically would depend on Chevrotain error-recovery internals"
  - "P61-D4-005 extracted only reorderTokenPriorities (not the record's own additionally-suggested wireIdCategories) per this plan's own narrower exact-edit instruction"
  - "FIX-01..03 left Pending in REQUIREMENTS.md — following 67-01/67-02/67-03's precedent, only 18 of 77 apply-set rows are applied after this plan (8 plans remain); marking complete now would misrepresent progress"

patterns-established:
  - "A finding that names D3-004's exact edit ('add a small prefix-keyed memoization/debounce cache') still requires the implementer to work out its concurrency semantics from a failing test observation, not just its literal shape — the initial straightforward resolved-value cache passed the 'reduced call count' bar only for sequential repeats and needed a debug repro to catch the concurrent-call race"

requirements-completed: []

coverage:
  - id: D1
    description: "A completion request cancelled mid-flight stops at the next await boundary in getFieldCompletion, getFilePathCompletion and completeAutoImportClasses instead of running to completion (P61-D2-013)"
    requirement: "FIX-01"
    verification:
      - kind: unit
        ref: "bbj-vscode/test/completion-test.test.ts#a pre-cancelled request stops before getFieldCompletion builds any items"
        status: pass
      - kind: unit
        ref: "bbj-vscode/test/completion-test.test.ts#a pre-cancelled request stops before getFilePathCompletion reads the filesystem"
        status: pass
      - kind: unit
        ref: "bbj-vscode/test/completion-test.test.ts#a pre-cancelled request stops before completeAutoImportClasses queries the class index"
        status: pass
    human_judgment: false
  - id: D2
    description: "Repeated class-candidate lookups for the same prefix hit a memoization cache instead of re-running findClassCandidatesByPrefix, returning the same candidate set the uncached path returns (P61-D3-004)"
    requirement: "FIX-01"
    verification:
      - kind: unit
        ref: "bbj-vscode/test/completion-test.test.ts#a second lookup for the identical prefix is served from cache, not re-run"
        status: pass
    human_judgment: false
  - id: D3
    description: "Two sibling AST nodes that share a start position but differ in end position produce two distinct document symbols, not one (P61-D2-014)"
    requirement: "FIX-01"
    verification:
      - kind: unit
        ref: "bbj-vscode/test/document-symbol.test.ts#P61-D2-014: sibling symbols sharing a start position but differing in extent are both recorded"
        status: pass
    human_judgment: false
  - id: D4
    description: "A token stream in which the expected next token is absent raises instead of splicing at index -1 (P61-D2-008)"
    requirement: "FIX-01"
    verification:
      - kind: unit
        ref: "bbj-vscode/test/lexer.test.ts#P61-D2-008: spliceToken throws instead of silently corrupting the stream when the named token is absent"
        status: pass
    human_judgment: false
  - id: D5
    description: "npm run lint exits 0 and reports zero warnings — the two pre-existing warnings recorded in the phase baseline are gone (P61-D4-010, D-10); reorderTokenPriorities extracted from buildTokens with tokenization unchanged (P61-D4-005)"
    requirement: "FIX-01"
    verification:
      - kind: other
        ref: "cd bbj-vscode && npm run lint — exit 0, zero warnings"
        status: pass
      - kind: unit
        ref: "bbj-vscode/test/lexer.test.ts, test/parser.test.ts, test/example-files.test.ts — all pass after the extraction"
        status: pass
    human_judgment: false
  - id: D6
    description: "Plan-level baseline delta: npm test's deterministic 11-name failing-test set is identical to the phase-start gate set across 3 runs; npm run lint reaches literal cleanliness, attributed to P61-D4-010"
    requirement: "FIX-03"
    verification:
      - kind: other
        ref: ".planning/phases/67-apply-easy-fixes/67-BASELINE.md — ### Plan 67-04 delta, verdict: identical"
        status: pass
    human_judgment: false

duration: ~22min
completed: 2026-08-19
status: complete
---

# Phase 67 Plan 04: Completion, Document-Symbol and Token-Builder Easy Fixes Summary

**Threaded cancellation and prefix memoization through the completion provider, fixed a position-collision bug in the document-symbol outline's error-recovery path, guarded the token builder's splice against a missing index, and cleared `npm run lint` to literal zero warnings — the lint gate this whole phase carries.**

## Performance

- **Duration:** ~22 min (commit span 11:30:14Z → 11:52:30Z)
- **Started:** 2026-08-19T11:07:02Z (approx, session start after 67-03)
- **Completed:** 2026-08-19T11:52:30Z
- **Tasks:** 3
- **Files modified:** 8 (0 created, 8 modified)

## Accomplishments

- Threaded `cancelToken` through `getFieldCompletion`, `getFilePathCompletion` and `completeAutoImportClasses` in `bbj-completion-provider.ts`, checking `isCancellationRequested` at each await boundary; a request the client has already superseded now stops early instead of doing its work (network round trip, filesystem read, or class-list build) to completion (P61-D2-013).
- Added `findClassCandidatesByPrefixCached`, a prefix-keyed memoization cache around `findClassCandidatesByPrefix` that caches the in-flight `Promise` itself (not just its resolved value), because Langium's own completion engine can invoke `completionForCrossReference` more than once for the same cross-reference feature within a single request via `Promise.all` — a plain resolved-value cache still let two concurrent calls both miss. Bounded by a 20-entry LRU-style cap and a 2s TTL; not document-scoped (argued safe: the underlying index is workspace-wide) (P61-D3-004).
- Fixed `bbj-document-symbol-provider.ts`'s deep-walk fallback to key `coveredPositions` on the full CST range (start **and** end) via a new shared `encodeRangeKey` helper, instead of start alone — two sibling nodes sharing a start offset but differing in extent no longer collapse into one outline entry (P61-D2-014).
- Deleted the two now-unused `eslint-disable-next-line @typescript-eslint/no-explicit-any` directives at `bbj-document-symbol-provider.ts:75` and `:149` — neither guarded read actually trips that rule. `npm run lint` now exits 0 with **zero** warnings, the phase's own lint-clean milestone (D-10), attributed to this finding, not housekeeping (P61-D4-010).
- Guarded `bbj-token-builder.ts`'s `spliceToken` to throw when the sought token name is absent instead of letting `Array.prototype.splice(-1, 1)` silently remove and reorder the wrong (last) token in the vocabulary (P61-D2-008).
- Extracted the 14 hardcoded `spliceToken` priority-reordering calls out of `buildTokens()` into a dedicated `reorderTokenPriorities(tokens)` method, isolating it from the unrelated ID-category/`LONGER_ALT` wiring that follows in the same function — behaviour-preserving, verified against the full lexer/parser/example-files suites (P61-D4-005).
- Closed all 6 ledger rows in `67-APPLY-SET.md` and ran the plan-level baseline delta 3 times: the deterministic 11-name `npm test` gate set was identical on every run; `npm run lint` reached literal cleanliness. Verdict: **identical**.

## Task Commits

Each task was committed atomically:

1. **Task 1: `bbj-completion-provider.ts` — cancellation threading and prefix memoization**
   - `1b85860` — `test(P61-D2-013): add failing test for uncancellable completion request` (RED)
   - `eb7d843` — `fix(P61-D2-013): thread cancelToken through the completion await boundaries` (GREEN)
   - `a1a90cd` — `test(P61-D3-004): add failing test for repeated class-candidate prefix lookups` (RED)
   - `0aaece2` — `fix(P61-D3-004): memoize findClassCandidatesByPrefix by prefix` (GREEN)
2. **Task 2: symbol-provider position collisions, the lint gate, and the token-builder splice guard**
   - `6b8c2db` — `test(P61-D2-014): add failing test for sibling symbols sharing a start position` (RED)
   - `84373a6` — `fix(P61-D2-014): key coveredPositions on the full node range` (GREEN)
   - `91f8329` — `fix(P61-D4-010): drop the two unused lint suppression directives` (no test, D4)
   - `83375d4` — `test(P61-D2-008): add failing test for splice at a missing token index` (RED)
   - `664670f` — `fix(P61-D2-008): throw before splicing at a missing token index` (GREEN)
   - `6be6639` — `fix(P61-D4-005): extract reorderTokenPriorities from buildTokens` (no test, D4)
3. **Task 3: Close the six ledger rows and run the plan baseline delta**
   - `de1d46e` — `docs(67-04): close provider rows, record lint-clean milestone and baseline delta`

## Files Created/Modified

- `bbj-vscode/src/language/bbj-completion-provider.ts` — `activeCancelToken` field, cancellation checks in three methods, `autoImportPrefixCache` + `findClassCandidatesByPrefixCached`
- `bbj-vscode/src/language/bbj-document-symbol-provider.ts` — `encodeRangeKey` helper shared by `collectPositions`/`applyDeepWalkFallback`; two lint-suppression comments deleted
- `bbj-vscode/src/language/bbj-token-builder.ts` — `spliceToken` throws on a missing index; `reorderTokenPriorities(tokens)` extracted from `buildTokens()`
- `bbj-vscode/test/completion-test.test.ts` — new: 3 cancellation tests, 1 memoization test
- `bbj-vscode/test/document-symbol.test.ts` — new: sibling-position-collision test
- `bbj-vscode/test/lexer.test.ts` — new: spliceToken missing-index test
- `.planning/phases/67-apply-easy-fixes/67-APPLY-SET.md` — 6 rows closed (all applied)
- `.planning/phases/67-apply-easy-fixes/67-BASELINE.md` — `### Plan 67-04 delta` subsection recording the lint-clean milestone, plus 5 newly-observed flaky suites appended to `## Flaky exclusions (D-08)`

## Decisions Made

- **P61-D3-004's cache stores the in-flight `Promise`, not the resolved value.** A debug repro (throwaway script, not committed) against the real `Promise.all`-driven completion engine showed two `completeAutoImportClasses` calls for the same prefix within one request both reach the cache before either resolves. A first-draft resolved-value cache reduced 4 calls to 2 (only sequential repeats deduped); caching the in-flight promise synchronously, before any `await`, reduced it to 1.
- **P61-D3-004's cache key is the lowercased prefix alone, not document-scoped** — argued safe in the ledger row's `notes:` (T-67-04-04): the underlying lookup depends only on `JavaInteropService`'s workspace-wide class index, which every document shares.
- **P61-D2-014's regression test drives the private `collectPositions` method directly** with two synthetic `DocumentSymbol` objects sharing `range.start`, rather than a real BBj source snippet — reproducing the exact AST-level collision deterministically would depend on Chevrotain error-recovery internals not stable enough to build a test against.
- **P61-D4-005 extracted only `reorderTokenPriorities`**, not the finding record's additionally-suggested `wireIdCategories` — this plan's own task text named only the former as the exact edit.
- **FIX-01/02/03 left `Pending` in `REQUIREMENTS.md`** — following prior plans' precedent, only 18 of 77 apply-set rows are applied after this plan; marking complete now would misrepresent progress.

## Deviations from Plan

None — plan executed exactly as written. The commit count came to 11 (10 code commits + 1 docs commit), one more than the plan objective's estimated "10 commits" — the plan's own task breakdown (4 + 6 + 1 = 11) accounts for the actual total; not a Rule 1-4 deviation, just a documentation-estimate discrepancy in the plan's own objective line.

## Issues Encountered

- **P61-D3-004's first-draft fix under-deduplicated.** The initial implementation cached the *resolved* `string[]` value, keyed by prefix. The committed test still failed after that draft (2 calls observed, not the required 1) because Langium's `Promise.all`-driven completion algorithm invokes `completionForCrossReference` — and therefore `completeAutoImportClasses` — more than once for the same cross-reference feature within a single request, so two concurrent calls for the same prefix both missed a resolved-value cache before either had written to it. Diagnosed with a small throwaway debug test (not committed) instrumenting the real call count and cache-size progression across two sequential `getCompletion()` calls; resolved by caching the in-flight `Promise` itself, written into the cache map synchronously before any `await`, so a concurrent caller shares the same request.
- **The test committed alongside the RED commit initially collided with an unrelated test's cached state.** `bbj-completion-provider.ts`'s prefix cache is a shared instance field (the provider is a singleton for the whole test file), so the first draft of the P61-D3-004 test reused the same `"TreeM"` prefix an earlier `- issue #447` test in the same file already exercises, which had already warmed the cache and made the count assertion pass for the wrong reason (a false "0 calls" pass, then later collide differently once the fix's cache implementation changed). Resolved by switching to a fabricated, file-unique class name/prefix (`P61D3004UniqueMarkerClass`) not used anywhere else in `completion-test.test.ts`, and re-verified the RED state genuinely failed against the true pre-fix committed source (reverted the working tree to the last commit via `git checkout -- <file>`, confirmed 4 real calls, then restored the fix) before amending the test commit and proceeding to the GREEN fix commit.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- 18 of 77 apply-set rows now applied (3 from 67-01, 7 from 67-02, 6 from 67-03, 6 from this plan — see `67-APPLY-SET.md`'s own reconciliation math for the exact arithmetic). Plans 67-05 through 67-11 continue applying the remaining pending rows.
- `npm run lint` is now genuinely clean (0 warnings) — future plans in this phase should expect and preserve that state; any new warning surfacing in a later plan is a regression, not baseline noise.
- The deterministic 11-name `npm test` gate set remains known, stable, and unaffected by this plan's fixes. The flaky-suite list in `67-BASELINE.md` now names 14 suites total across the phase so far — future plans' baseline deltas should expect this wider spread under contention and treat any `beforeAll` hookTimeout as flaky-per-D-08 rather than a regression, confirming via re-run before concluding otherwise.
- No blockers.

## Self-Check: PASSED

All 8 modified files confirmed present on disk; all 11 commit hashes confirmed present in `git log --oneline --all`.
