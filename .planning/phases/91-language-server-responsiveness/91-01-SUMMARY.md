---
phase: 91-language-server-responsiveness
plan: 01
subsystem: language-server
tags: [langium, scope-resolution, index-manager, performance, vitest]

# Dependency graph
requires: []
provides:
  - "BBjIndexManager.getBBjClassesForFiles(fileUris): a path-keyed BbjClass index maintained incrementally in updateContent/removeContent, replacing a full workspace-wide index scan"
  - "bbj-scope.ts getBBjClassesFromFile now queries the path-keyed index instead of streaming every BbjClass in the workspace"
  - "bbj-scope-local.ts collectLocalSymbols prunes PREFIX (external) document member bodies, mirroring bbj-linker.ts's own external-document member rule"
  - "test/scope-cost-regression.test.ts: work-counter and loose-timing regression coverage for #505"
affects: [91-02, 91-03, 91-04, 91-05, 91-06]

actuals:
  tokens: 7476
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "Path-keyed secondary index maintained alongside Langium's own symbolIndex, updated only inside updateContent/removeContent overrides — never triggers a document rebuild"
    - "Local symbol collection mirrors the linker's own external-document member-pruning rule (isExternalDocument + isBBjClassMember + visibility + TreeIterator.prune()) instead of duplicating a separate policy"

key-files:
  created:
    - bbj-vscode/test/scope-cost-regression.test.ts
  modified:
    - bbj-vscode/src/language/bbj-index-manager.ts
    - bbj-vscode/src/language/bbj-scope.ts
    - bbj-vscode/src/language/bbj-scope-local.ts

key-decisions:
  - "getBBjClassesForFiles dedupes candidate file URIs by normalized path key before lookup (not after), so two candidates naming the same file contribute that file's classes once"
  - "Result ordering uses the index's own document-insertion order (a documentOrder map mirroring symbolIndex's Map insertion order), not candidate-path order, so same-named classes from two candidate files resolve exactly as the old full scan did"
  - "BbjScopeComputation reads the WorkspaceManager lazily via a private accessor and detects isExternalDocument via a method-presence check (not instanceof), avoiding a new import cycle (bbj-ws-manager -> bbj-document-validator -> bbj-scope -> bbj-scope-local)"

patterns-established:
  - "Regression test harness: an in-memory FileSystemProvider + createBBjTestServices + parseHelper(validation:false), so a workspace-size regression test never reaches BBjCPL or java-interop's :5008"

requirements-completed: []  # RESP-01 is also declared by plan 91-06 (not yet summarized) — not marked Complete here per phase instruction; will be marked once every declaring plan lands

coverage:
  - id: D1
    description: "::file::Class scope lookups cost the same regardless of total workspace size (path-keyed BbjClass index)"
    requirement: "RESP-01"
    verification:
      - kind: unit
        ref: "test/scope-cost-regression.test.ts#scope lookup cost does not grow with workspace size (#505)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Path-keyed index stays correct under edits, removal, duplicates, case differences and insertion-order ties"
    requirement: "RESP-01"
    verification:
      - kind: unit
        ref: "test/scope-cost-regression.test.ts#path-keyed class index stays correct (#505)"
        status: pass
    human_judgment: false
  - id: D3
    description: "PREFIX-document local symbol collection no longer walks method bodies the linker never links; workspace documents are unaffected"
    requirement: "RESP-01"
    verification:
      - kind: unit
        ref: "test/scope-cost-regression.test.ts#PREFIX symbol collection does not walk member bodies (#505)"
        status: pass
    human_judgment: false

duration: 21min
completed: 2026-09-12
status: complete
---

# Phase 91 Plan 01: Constant-Cost Scope Lookups and PREFIX Symbol Collection Summary

**Path-keyed BbjClass index in BBjIndexManager plus linker-mirrored member pruning in collectLocalSymbols, so `::file::Class` lookups and PREFIX symbol collection stop scaling with workspace size (#505)**

## Performance

- **Duration:** 21 min
- **Started:** 2026-09-12T23:37:50Z
- **Completed:** 2026-09-12T23:58:28Z
- **Tasks:** 3
- **Files modified:** 3 (+ 1 test file created)

## Accomplishments

- `BBjIndexManager` now maintains a private path-keyed map of every document's exported `BbjClass` descriptions (`bbjClassesByPath`), updated incrementally inside `updateContent`/`removeContent` right after calling `super`, plus a `documentOrder` map mirroring the base class's own `symbolIndex` insertion order.
- `getBBjClassesFromFile` in `bbj-scope.ts` now calls the new `getBBjClassesForFiles(adjustedFileUris)` instead of streaming `indexManager.allElements(BbjClass.$type)` across the whole workspace and filtering by path — a `::file::Class` lookup now examines a handful of index elements regardless of workspace size.
- `collectLocalSymbols` in `bbj-scope-local.ts` mirrors `bbj-linker.ts`'s `link()` external-document rule: for a PREFIX (external) document, a non-private class member's own node and (for a method) its parameters are processed, then the member's body is pruned via `TreeIterator.prune()`; a private member is skipped entirely. Workspace documents are unaffected — `isExternalDocument()` and `bbj-ws-manager.ts` are unchanged.
- `test/scope-cost-regression.test.ts` (new, 3 describes, 13 tests) proves both fixes with work counters plus a deliberately loose wall-clock ratio, using an in-memory `FileSystemProvider` + `createBBjTestServices` + `parseHelper({validation:false})` so the suite never reaches BBjCPL or java-interop's `:5008`.

## Task Commits

Each task was committed atomically:

1. **Task 1: One `::file::Class` lookup examines the same handful of index elements in a 10-file and a 250-file workspace** - `4a3d6411` (feat)
2. **Task 2: The path-keyed index is never stale, counts a file once, returns nothing for missing or class-less files, and keeps the full scan's order** - `131cb0f2` (test)
3. **Task 3: PREFIX documents collect local symbols for member signatures only, pinned by a counter and a loose timing ratio** - `aee1e0a9` (feat)

_No separate plan-metadata commit was created for this run; SUMMARY/STATE/ROADMAP updates are committed together as the final commit below._

## Files Created/Modified

- `bbj-vscode/src/language/bbj-index-manager.ts` - Path-keyed `bbjClassesByPath`/`documentOrder` maps, `updateContent`/`removeContent` overrides, public `getBBjClassesForFiles`
- `bbj-vscode/src/language/bbj-scope.ts` - `getBBjClassesFromFile` now queries the path-keyed index; dropped the now-unused `normalize` import
- `bbj-vscode/src/language/bbj-scope-local.ts` - `collectLocalSymbols` prunes external-document member bodies; new lazy `workspaceManager` accessor and `IsExternalDocumentCapable` type-only detection shape
- `bbj-vscode/test/scope-cost-regression.test.ts` - New regression suite (created in Task 1, extended in Tasks 2 and 3)

## Decisions Made

- Dedupe candidate file URIs by normalized path key *before* the index lookup (via a `Set`), not by de-duplicating the returned documents afterward — this is what makes "two candidates naming the same file contribute that file's classes once" hold structurally rather than incidentally.
- Preserve the pre-existing full-scan's result order (document insertion order into the shared index) rather than candidate-path order, by tracking a separate `documentOrder` map — verified by a dedicated test where candidate-path order and insertion order disagree.
- Used a method-presence check (`typeof wsManager.isExternalDocument === 'function'`) rather than `instanceof BBjWorkspaceManager` in `bbj-scope-local.ts`, with only a type-only (`import type`) reference to `BBjWorkspaceManager`, to avoid closing a new import cycle (`bbj-ws-manager.ts` → `bbj-document-validator.ts` → `bbj-scope.ts` → `bbj-scope-local.ts`), matching the pattern already used by `bbj-linker.ts`.
- Per this phase's explicit instruction, `RESP-01` is **not** marked Complete in REQUIREMENTS.md by this plan, since plan 91-06 also declares it and has not yet landed a SUMMARY.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `CancellationToken` is not exported from the `langium` package root**
- **Found during:** Task 1 (build verification after implementing `bbj-index-manager.ts`)
- **Issue:** Importing `CancellationToken` from `"langium"` failed TypeScript compilation (`TS2724: '"langium"' has no exported member named 'CancellationToken'`) — the rest of the codebase (`bbj-linker.ts`, `bbj-scope-local.ts`, `bbj-ws-manager.ts`) imports it from `vscode-languageserver` instead.
- **Fix:** Moved the `CancellationToken` import to `vscode-languageserver`, matching the existing codebase convention.
- **Files modified:** `bbj-vscode/src/language/bbj-index-manager.ts`
- **Verification:** `npm run build` passes; full test suite still green.
- **Committed in:** `4a3d6411` (Task 1 commit)

**2. [Rule 1 - Bug] Own comment violated this plan's register-check (planning decision id in source)**
- **Found during:** Task 2 (running the register-check scan ahead of Task 3's formal verify step, as a self-check before committing)
- **Issue:** A doc comment I wrote on `bbjClassesByPath` in `bbj-index-manager.ts` included the literal token `D-10`, which this plan's own register-check (and the project's comment-discipline rule) forbids in source/test text.
- **Fix:** Reworded the comment to drop the decision-id token while keeping the same explanation; kept the GitHub issue reference `#505`, which is explicitly allowed.
- **Files modified:** `bbj-vscode/src/language/bbj-index-manager.ts`
- **Verification:** Re-ran the register-check grep — zero matches; full test suite still green.
- **Committed in:** `131cb0f2` (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (1 blocking-issue fix, 1 register-check self-correction)
**Impact on plan:** Both fixes were necessary for the plan's own verification gates (build, register-check) to pass. No scope creep — no behavior changed beyond what the plan specified.

## Issues Encountered

None beyond the two auto-fixed deviations above.

**Pre-change vs. post-change measurements** (recorded for #505, per this plan's `<output>` spec):

- `::file::Class` lookup, index elements examined: pre-change 10-file workspace = 11, 250-file workspace = 251 (both scale with total workspace size — the +1 in each case is the synthetic built-in `BBjAPI` class always present in the index); post-change: both = 1 (constant, independent of workspace size).
- PREFIX `collectLocalSymbols` `processNode` calls: pre-change Small (n=2 body lines) = 40, Large (n=200 body lines) = 2416 (scales with body size); post-change: both = 7 (constant, independent of body size). A same-content non-PREFIX document's count still scales with body size post-change (unchanged behavior, proven by a dedicated test).
- Timing ratios (informational; the timing tests use a deliberately loose bound of `max(small*8, small+150ms)` and are not the hard gate — the counters are): observed on this run, lookup timing was well within the loose bound in both the pre-change failing run (664ms vs. bound 284ms — this is the run that *failed*, confirming the timing test also correctly detects the regression) and the post-change passing run; PREFIX symbol-collection timing likewise passed post-change (pre-change failed at 463ms vs. bound 164ms).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- The path-keyed index and linker-mirrored pruning are in place and covered by a dedicated regression suite; subsequent 91-0x plans (reachability circuit breaker, LRU eviction race, shared cancel token, decompile freshness hang, stale format replacement) are independent of this plan's changes and can proceed.
- `RESP-01` stays open in REQUIREMENTS.md until plan 91-06 (which also declares it) lands its own SUMMARY.

## Self-Check: PASSED

All created/modified files verified present on disk; all three task commit hashes (4a3d6411, 131cb0f2, aee1e0a9) verified present in git history.

---
*Phase: 91-language-server-responsiveness*
*Completed: 2026-09-12*
