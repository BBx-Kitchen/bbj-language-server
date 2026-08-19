---
phase: 67-apply-easy-fixes
plan: 08
subsystem: extension-host
tags: [child_process, spawn, vitest, mocking, formatter, decompile, file-io, race-condition]

# Dependency graph
requires:
  - phase: 67-apply-easy-fixes
    provides: 67-01's apparatus (67-APPLY-SET.md ledger, 67-BASELINE.md baseline, the
      red-then-green/test-is-the-fix commit conventions)
provides:
  - Six closed ledger rows in 67-APPLY-SET.md — P62-D2-010, P62-D3-001, P62-D5-006,
    P62-D8-002, P62-D2-011, P62-D4-005
  - "### Plan 67-08 delta" section in 67-BASELINE.md recording verdict: identical (3 full runs)
  - bbj-vscode/test/document-formatter.test.ts — the first test module for document-formatter.ts,
    with a reusable vscode-mocking pattern (workspace.getConfiguration, onDidChangeTextDocument
    callback capture, TextEdit/Range stand-ins) for any future test that needs to import a file
    touching the vscode module outside the extension host
affects: [67-09, 67-10, 67-11, 67-12]

# Actuals (#2632)
actuals:
  tokens: 9105
  tasks: 3
  commits: 11

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "vi.mock('vscode', ...) with a captured __testState callback reference: document-formatter.ts
       calls vscode.workspace.onDidChangeTextDocument(cb) at module load, so the mock stores the
       registered callback and tests invoke it directly to populate the module's internal map —
       the only way to drive that code path without a real VS Code extension host"
    - "Module-level in-flight Promise<string> Map keyed by document/resource URI, cleared on both
       the resolve and reject settle paths via promise.then(clear, clear) — the same shape used for
       any per-key async-request-dedup problem in this codebase"
    - "mtime-gated poll-until-settled: pairing a size-settled check with a call-start timestamp
       comparison (stat().mtimeMs >= callStartMs) closes a stale-artifact race that a size-only
       settle check cannot detect when the stale and fresh outputs coincidentally match in size"

key-files:
  created:
    - bbj-vscode/test/document-formatter.test.ts
  modified:
    - bbj-vscode/src/document-formatter.ts
    - bbj-vscode/src/decompile-io.ts
    - bbj-vscode/test/decompile-io.test.ts
    - .planning/phases/67-apply-easy-fixes/67-APPLY-SET.md
    - .planning/phases/67-apply-easy-fixes/67-BASELINE.md

key-decisions:
  - "P62-D8-002 branch taken: corrected the three unsavedContentMap comments rather than removing
     the map and its two listeners — removal is a behaviour change and outside a D8 easy fix's
     no-behaviour-change scope, per the record's own two-branch clause"
  - "P62-D5-006's non-ENOENT-error case deliberately not duplicated: it is the exact test already
     committed for P62-D2-010 (same test file, first test) — the ledger row records the overlap
     instead of re-asserting the same case a second time"
  - "P62-D2-011's stale-fixture test lives under bbj-vscode/test/test-data/ (created and removed
     per test), not os.tmpdir() like every other case in decompile-io.test.ts — the plan's own
     prohibition ('every filesystem fixture lives under bbj-vscode/test/') is read as binding on
     new tests this plan adds, not as retroactively rewriting the file's pre-existing convention"

patterns-established:
  - "Own-test-bug discovery mid-fix (Rule 1): the P62-D2-011 red test's first version wrote the
     stale .lst in the same tick as the waitForDecompileOutput call, so its mtime could round to
     at-or-after the call-start timestamp the new mtime gate checks against — occasionally passing
     the gate for the wrong reason. Found by re-running the green state and seeing a flaky failure
     unrelated to the P62-D4-005 change made alongside it; fixed with a real 100ms gap and landed
     as its own test( commit, separate from the unrelated P62-D4-005 fix"

requirements-completed: []

coverage:
  - id: D1
    description: "document-formatter.ts's spawn 'error' handler rejects on any error code, not only ENOENT, so the format promise can never hang silently"
    verification:
      - kind: unit
        ref: "bbj-vscode/test/document-formatter.test.ts#P62-D2-010: rejects the format promise on a non-ENOENT spawn error"
        status: pass
    human_judgment: false
  - id: D2
    description: "Concurrent format requests for the same document URI share one in-flight spawn instead of each starting an independent java process, with the in-flight entry cleared on both resolve and reject"
    verification:
      - kind: unit
        ref: "bbj-vscode/test/document-formatter.test.ts#P62-D3-001 describe block, 4 cases — 100% pass"
        status: pass
    human_judgment: false
  - id: D3
    description: "document-formatter.ts has a full test module for the first time (ENOENT, non-zero exit, non-ENOENT error, unsaved-content fallback) and its unsaved-content-map comments now describe actual behaviour"
    verification:
      - kind: unit
        ref: "bbj-vscode/test/document-formatter.test.ts — 8/8 pass; bbj-vscode/src/document-formatter.ts comments corrected at 3 sites"
        status: pass
    human_judgment: false
  - id: D4
    description: "waitForDecompileOutput gates resolution on a settled size AND mtime at or after call start, so a stale .lst of coincidentally matching size is never returned; decompile-io.ts imports TOKENIZED_BBJ_MAGIC from tokenized-bbj.ts instead of redeclaring it"
    verification:
      - kind: unit
        ref: "bbj-vscode/test/decompile-io.test.ts — 9/9 pass incl. the P62-D2-011 stale-.lst case; bbj-vscode/test/tokenized-bbj.test.ts — 6/6 pass unchanged"
        status: pass
    human_judgment: false
  - id: D5
    description: "Six ledger rows closed with no TBD/pending, every commit sha resolves, plan-level baseline delta recorded as identical across three full npm test runs"
    verification:
      - kind: other
        ref: ".planning/phases/67-apply-easy-fixes/67-APPLY-SET.md rows 50-53,55,58; 67-BASELINE.md '### Plan 67-08 delta' — 3 full npm test runs, same 11-name gate set every time; npm run lint exit 0, zero warnings"
        status: pass
    human_judgment: false

duration: ~13min
completed: 2026-08-19
status: complete
---

# Phase 67 Plan 08: document-formatter.ts and decompile-io.ts Findings Summary

**Fixed the formatter's never-settling promise and duplicate-spawn race, gave document-formatter.ts its first test module, closed decompile-io.ts's stale-.lst race with an mtime gate, and de-duplicated the tokenized-BBj magic constant — six ledger rows closed, ten task commits plus one own-test-bug fix commit.**

## Performance

- **Duration:** ~13 min (commit span 13:53:53Z → 14:06:16Z)
- **Tasks:** 3
- **Files touched:** 6 (1 created, 5 modified)
- **Commits:** 11 (7 `test(...)`, 3 `fix(...)`, 1 `docs(P62-D8-002):`, 1 `docs(67-08):`)

## Accomplishments

- **document-formatter.ts's never-settling promise fixed** (P62-D2-010): the spawn `'error'`
  handler only rejected on `ENOENT`; any other spawn-level error (EACCES, EMFILE/ENFILE) fell
  through with neither `resolve` nor `reject` called, hanging the format request indefinitely.
  Added an `else { reject(err) }` branch, driven red-then-green by a mocked-`child_process.spawn`
  test with an explicit 5000ms vitest timeout so the pre-fix hang produced a clean failure, not a
  stuck run.
- **Concurrent format requests deduplicated** (P62-D3-001): a module-level
  `Map<string, Promise<string>>` keyed by document URI now shares one in-flight spawn across
  concurrent requests for the same document, clearing the entry on both the resolve and reject
  settle paths so a later request still spawns fresh. Verified with four cases: same-URI dedup,
  different-URI non-dedup, and cleanup-then-respawn on both settle paths.
- **document-formatter.ts's first test module authored** (P62-D5-006, test-is-the-fix per D-13):
  `test/document-formatter.test.ts` now covers all four required cases — ENOENT, non-zero exit,
  non-ENOENT error, and the unsaved-content-map fallback — with `vscode` and `child_process`
  mocked. The non-ENOENT-error case reuses P62-D2-010's own test rather than duplicating it.
- **Stale unsaved-content-map comments corrected** (P62-D8-002): the old comments framed
  `document.getText()` as reading "from the file system" as an alternative to the map; corrected
  to state `document.getText()` always returns VS Code's live in-memory buffer, so the map's
  tracked value and `document.getText()` are the same content for the document object the method
  receives. Took the comment-correction branch, not the map-removal branch (behaviour-preserving).
- **decompile-io.ts's stale-.lst race closed** (P62-D2-011): `waitForDecompileOutput`'s
  size-settled poll had no check that the observed `.lst` was written after the call started, so a
  stale listing from an earlier (possibly crashed) run could be returned if its byte size
  coincidentally matched the fresh run's. Replaced the size-only `statSize` helper with
  `statSizeAndMtime` and gated resolution on `mtimeMs >= callStartMs` in addition to the existing
  size-settle check.
- **Tokenized-BBj magic constant de-duplicated** (P62-D4-005): `decompile-io.ts` now imports
  `TOKENIZED_BBJ_MAGIC` from `./tokenized-bbj.js` and wraps it with `Buffer.from(...)`, instead of
  hand-typing the same 7-byte sequence a second time. `tokenized-bbj.ts` itself is unchanged.
- **Plan-level baseline delta run** (D-09): `npm run lint` exits 0 with zero warnings; `npm test`'s
  failing-test NAME set is set-equal to the phase-start 11-name gate set across three full runs,
  with only load-dependent `beforeAll` hookTimeout suites varying (different suites each run, all
  confirmed passing cleanly in isolation). Verdict: **identical**.

## Task Commits

Each task was committed atomically:

1. **Task 1: document-formatter.ts — hang, duplicate spawns, missing coverage, stale comment**
   - `c10e7a9` — `test(P62-D2-010): add failing test for a non-ENOENT formatter spawn error` (RED)
   - `c05fd57` — `fix(P62-D2-010): reject the format promise on any spawn error` (GREEN)
   - `0a8a14b` — `test(P62-D3-001): add failing test for duplicate concurrent formatter spawns` (RED)
   - `a425924` — `fix(P62-D3-001): share one in-flight format promise per document URI` (GREEN)
   - `4afa828` — `test(P62-D5-006): cover formatter ENOENT, non-zero exit and unsaved-content fallback`
   - `b8dd31a` — `docs(P62-D8-002): correct the unsaved-content map comments`
2. **Task 2: decompile-io.ts — the stale .lst race and the duplicated magic constant**
   - `57c8ada` — `test(P62-D2-011): add failing test for a stale .lst of matching size` (RED)
   - `73aadc8` — `test(P62-D2-011): fix flaky timing in the stale-.lst regression test` (own-bug fix,
     see Deviations)
   - `806acb5` — `fix(P62-D2-011): gate decompile output on mtime at or after call start` (GREEN)
   - `e6fc4fe` — `fix(P62-D4-005): import TOKENIZED_BBJ_MAGIC instead of redeclaring it`
3. **Task 3: Close the six ledger rows and run the plan baseline delta**
   - `46b3028` — `docs(67-08): close formatter and decompile rows and record baseline delta`

## Files Created/Modified

- `bbj-vscode/test/document-formatter.test.ts` — new, 8 test cases across P62-D2-010, P62-D3-001,
  and P62-D5-006, mocking `vscode` and `child_process`
- `bbj-vscode/src/document-formatter.ts` — spawn-error else branch, in-flight-promise Map, three
  corrected comments
- `bbj-vscode/src/decompile-io.ts` — `statSizeAndMtime` replacing `statSize`, call-start timestamp
  and mtime gate, `TOKENIZED_BBJ_MAGIC` import replacing the local redeclaration
- `bbj-vscode/test/decompile-io.test.ts` — one new case (`P62-D2-011`) under a dedicated
  `bbj-vscode/test/test-data/` fixture directory
- `.planning/phases/67-apply-easy-fixes/67-APPLY-SET.md` — six rows closed
- `.planning/phases/67-apply-easy-fixes/67-BASELINE.md` — `### Plan 67-08 delta` appended

## Decisions Made

- **P62-D8-002 branch taken:** corrected the three `unsavedContentMap` comments rather than
  removing the map and its two listeners, since removal is a behaviour change outside a D8 easy
  fix's no-behaviour-change scope, per the record's own two-branch clause.
- **P62-D5-006's non-ENOENT-error case not duplicated:** it is the exact test already committed
  for P62-D2-010 in the same file — the ledger row records the overlap rather than re-asserting
  the same case a second time, matching the record's own classification note that this file needs
  only one new test file, unlike the phase's other D5 findings.
- **P62-D2-011's stale-fixture test lives under `bbj-vscode/test/test-data/`** (created and
  removed per test), not `os.tmpdir()` like every other case in `decompile-io.test.ts` — the
  plan's prohibition that "every filesystem fixture lives under bbj-vscode/test/" was read as
  binding on new tests this plan adds, not as retroactively rewriting the file's pre-existing
  `os.tmpdir()` convention for its five already-existing cases.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed flaky timing in the P62-D2-011 red test, after the green fix landed**
- **Found during:** Task 2, immediately after the P62-D4-005 import edit, running the full
  `decompile-io.test.ts` suite to verify.
- **Issue:** The red test's stale `.lst` was written in the same tick as the
  `waitForDecompileOutput` call, with no gap. Once the mtime-gate fix landed, the stale write's
  `mtimeMs` could round to at-or-after the call-start timestamp the fix compares against,
  occasionally satisfying the new gate on the very first settle-check for the wrong reason —
  producing an intermittent false failure (2 consecutive failing runs observed) unrelated to the
  actual fix's correctness.
- **Fix:** Added a real 100ms gap (`await new Promise(resolve => setTimeout(resolve, 100))`)
  between writing the stale file and starting the wait, so its mtime is unambiguously earlier than
  call start — matching the finding's actual failure scenario, where the stale file is left over
  from a prior, separate run.
- **Files modified:** `bbj-vscode/test/decompile-io.test.ts`
- **Commit:** `73aadc8` (landed as its own `test(P62-D2-011):` commit, kept separate from the
  unrelated `fix(P62-D4-005):` commit that happened to be staged alongside it)
- **Verification:** three consecutive full runs of `test/decompile-io.test.ts` + `tokenized-bbj.test.ts`
  after the fix, all 15/15 passing.

This is the only deviation from the plan's literal acceptance criteria: the plan's stated
`git log --format=%s -3` sequence for `P62-D2-011`/`P62-D4-005` (`test → fix → fix`) is actually
four commits (`test → test → fix → fix`) because of this own-test-bug fix, documented here rather
than silently absorbed into either surrounding commit.

## Issues Encountered

None beyond the flaky-timing deviation above, which was fully resolved within Task 2.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Six of the phase's 77 ledger rows closed by this plan (bringing the phase running total to
  `3 + 1 + 5 + 6 + 8 + 10 + 10 + 6` closed across plans 67-01 through 67-08 — see
  `67-APPLY-SET.md`'s `## Index` for the authoritative count). No blockers for plan 67-09.
- The vscode-mocking pattern in `document-formatter.test.ts` (capturing the
  `onDidChangeTextDocument` callback via `__testState`) is reusable for any future test needing to
  import a file that calls `vscode.workspace.*` at module load time outside the extension host.

## Self-Check: PASSED

All 6 created/modified files confirmed present on disk; all 11 commit hashes confirmed present in
`git log --oneline --all`.
