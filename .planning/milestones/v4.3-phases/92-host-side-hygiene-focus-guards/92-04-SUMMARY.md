---
phase: 92-host-side-hygiene-focus-guards
plan: "04"
subsystem: vs-code-extension
tags: [vscode, decompile, filesystem, freshness, coarse-mtime]

requires:
  - phase: 92-host-side-hygiene-focus-guards
    provides: "plan 92-01's target-resolution.ts wiring pattern in Commands.cjs, and its establishment of source-guard tests as the way to cover Commands.cjs (which cannot load under Vitest)"
provides:
  - "decompile-io.ts: deleteLeftoverLst(inputPath) removes a leftover <input>.lst before bbjlst runs, ENOENT-tolerant, fail-closed on any other error"
  - "waitForDecompileOutput no longer gates on mtime; a .lst is accepted once its size settles across two polls, with freshness guaranteed by the caller's delete instead"
  - "Commands.cjs's decompileInPlace awaits deleteLeftoverLst(resolvedFileName) before execWithProgress, inside the existing try/catch"
affects: []

actuals:
  tokens: 4563
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "Positive freshness signal over timestamp comparison: delete the expected output path before the producing process runs, so anything that later appears at that path is provably fresh by construction — no mtime/slack constant needed."

key-files:
  created: []
  modified:
    - bbj-vscode/src/decompile-io.ts
    - bbj-vscode/src/Commands/Commands.cjs
    - bbj-vscode/test/decompile-io.test.ts

key-decisions:
  - "D-01/D-02/D-03/D-04 implemented exactly as locked in 92-CONTEXT.md: delete-then-wait replaces the mtime gate entirely, with no slack constant anywhere."
  - "The delete target is computed with the same expression waitForDecompileOutput uses internally (inputPath + '.lst', now shared via a private lstPathFor helper) — never Commands.cjs's separately-computed resolvedLstFileName — so the delete can never remove the input file itself, by construction (research Pitfall 1)."
  - "Task 1's GREEN change (dropping the mtime gate) deliberately broke the then-unmodified P62-D2-011 test, which depended on that gate; Task 2 reworked it around delete-then-wait per D-04, restoring green. This is the intended two-task split, not a regression."

requirements-completed: []

coverage:
  - id: D1
    description: "A fresh .lst whose mtime reads earlier than the call start (coarse-mtime filesystem) resolves promptly instead of spinning to timeout"
    requirement: RESP-05
    verification:
      - kind: unit
        ref: "bbj-vscode/test/decompile-io.test.ts#decompile-io > waitForDecompileOutput > a fresh listing with a coarse, earlier-looking mtime resolves promptly (no mtime gate)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Immediately before decompileInPlace runs bbjlst, the leftover <input>.lst is removed (ENOENT is the normal case and proceeds), computed via the same path expression waitForDecompileOutput watches"
    requirement: RESP-05
    verification:
      - kind: unit
        ref: "bbj-vscode/test/decompile-io.test.ts#decompile-io > deleteLeftoverLst > removes an existing <input>.lst"
        status: pass
      - kind: unit
        ref: "bbj-vscode/test/decompile-io.test.ts#decompile-io > deleteLeftoverLst > resolves without error when no leftover exists"
        status: pass
      - kind: unit
        ref: "bbj-vscode/test/decompile-io.test.ts#decompile-io > decompileInPlace wiring (source guard) > decompileInPlace awaits deleteLeftoverLst before execWithProgress, inside the try block"
        status: pass
      - kind: unit
        ref: "bbj-vscode/test/decompile-io.test.ts#decompile-io > decompileInPlace wiring (source guard) > Commands.cjs requires deleteLeftoverLst from decompile-io"
        status: pass
    human_judgment: false
  - id: D3
    description: "When <input>.lst exists and cannot be removed (non-ENOENT error), bbjlst is not run; the failure names the leftover path and the reason and is fail-closed"
    requirement: RESP-05
    verification:
      - kind: unit
        ref: "bbj-vscode/test/decompile-io.test.ts#decompile-io > deleteLeftoverLst > fails closed when the leftover cannot be removed, naming the path and reason"
        status: pass
    human_judgment: false
  - id: D4
    description: "The reworked P62-D2-011 test proves a stale .lst of matching size present before the run is removed by the delete step, and the wait resolves only after, and with, the fresh output"
    requirement: RESP-05
    verification:
      - kind: unit
        ref: "bbj-vscode/test/decompile-io.test.ts#decompile-io > waitForDecompileOutput > P62-D2-011: a stale .lst of matching size is never mistaken for fresh output > resolves with the fresh content, not a pre-existing .lst of coincidentally matching size"
        status: pass
    human_judgment: false
  - id: D5
    description: "For a .lst input, the delete step removes <input>.lst.lst and never the input file itself"
    requirement: RESP-05
    verification:
      - kind: unit
        ref: "bbj-vscode/test/decompile-io.test.ts#decompile-io > deleteLeftoverLst > for a .lst input, removes only <input>.lst.lst and never the input file itself"
        status: pass
    human_judgment: false
  - id: D6
    description: "decompileReadonly keeps running bbjlst in a fresh temp directory with no delete step, inheriting the size-settle wait unchanged"
    requirement: RESP-05
    verification: []
    human_judgment: true
    rationale: "decompileReadonly's own code path was not modified by this plan (it already runs bbjlst in a private mkdtemp copy and calls the same shared waitForDecompileOutput); no new test was added specifically for it since its behavior is unchanged and its existing coverage in this file (isTokenizedFile/waitForDecompileOutput tests) already exercises the shared wait function it calls."

duration: ~12min
completed: 2026-09-13
status: complete
---

# Phase 92 Plan 04: Decompile Freshness on Coarse-Mtime Filesystems (RESP-05) Summary

**Decompile now deletes the leftover `.lst` before bbjlst runs and drops the mtime gate entirely, so a fresh listing on a coarse-mtime filesystem resolves promptly instead of spinning the 20-second timeout, while a genuinely stale pre-existing `.lst` is still never served.**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-09-13T07:32Z
- **Completed:** 2026-09-13T07:44Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- New `deleteLeftoverLst(inputPath)` in `decompile-io.ts`: unlinks `<input>.lst` before bbjlst runs, tolerates ENOENT (normal case), and fails closed with a named error (`Could not remove the leftover "…" from an earlier decompile: …`) on any other error — including a directory occupying the `.lst` path.
- `waitForDecompileOutput` no longer captures or compares mtime; a `.lst` is accepted once its size settles across two polls. Both functions now share a private `lstPathFor(inputPath)` helper for the watched/deleted path, so the delete target can never diverge from the wait target.
- `Commands.cjs`'s `decompileInPlace` awaits `deleteLeftoverLst(resolvedFileName)` immediately before `execWithProgress(argv)`, inside the existing `try`; an undeletable leftover's rejection lands in the existing `catch`, reusing the `Failed to decompile "<file>": …` error shape with no new formatting code.
- `P62-D2-011` reworked around delete-then-wait per D-04 (kept, not deleted, not weakened): it now deletes the stale `.lst` first, asserts it's gone, then proves the wait resolves only at or after the fresh write.
- Two new tests: an undeletable leftover (a directory at the `.lst` path) fails closed with the directory intact; for a `.lst` input, the delete removes only `<input>.lst.lst`, never the input file itself.
- 6 new/reworked tests total in `decompile-io.test.ts` (16 tests in the file, all passing).

## Task Commits

1. **Task 1: A fresh listing with a coarse, earlier-looking mtime resolves promptly, and decompileInPlace clears the leftover before bbjlst runs** - `653c8656` (feat)
2. **Task 2: A stale listing is still never served, an undeletable leftover fails closed, and a .lst input is never deleted** - `e1468e7d` (test)

**Plan metadata:** committed together with this SUMMARY.

_Note: both tasks carried `tdd="true"`. Task 1's RED tests (coarse-mtime, `deleteLeftoverLst`, wiring guard) were added and confirmed failing (`deleteLeftoverLst is not a function`, mtime-gated timeout, missing wiring) before the GREEN implementation, then folded into the single `feat` commit above per the plan's tracer-task shape. Task 1's GREEN change deliberately broke the then-unreworked `P62-D2-011` test (see Deviations); Task 2's own commit is the `test`-typed rework plus its two new fail-closed/`.lst`-input tests, confirmed green before committing._

## Files Created/Modified
- `bbj-vscode/src/decompile-io.ts` - `deleteLeftoverLst`, private `lstPathFor`, `statSize` (size-only, replacing the mtime-capturing `statSizeAndMtime`), mtime gate removed from `waitForDecompileOutput`, docstrings rewritten
- `bbj-vscode/src/Commands/Commands.cjs` - `decompileInPlace` awaits `deleteLeftoverLst(resolvedFileName)` before `execWithProgress`; require destructuring extended
- `bbj-vscode/test/decompile-io.test.ts` - coarse-mtime test, `deleteLeftoverLst` describe (removes existing, no-op when absent, fail-closed, `.lst`-input safety), `decompileInPlace wiring` source-guard describe, reworked `P62-D2-011`

## Decisions Made
- D-01 through D-04 implemented exactly per `92-CONTEXT.md`, with no slack constant introduced anywhere (per D-02's explicit constraint).
- The delete target is always computed as `inputPath + '.lst'` via the same private helper the wait uses internally — never `Commands.cjs`'s separately-computed `resolvedLstFileName` — so by construction (`x + '.lst' !== x` for any `x`) the delete can never remove the input file, for either a plain or an already-`.lst` input (research Pitfall 1's safety property).
- `SizeAndMtime` was renamed to `FileSize` and reduced to `{ size: number }` rather than left as an unused field, since D-02 explicitly says "no slack constant is introduced anywhere" and an unused capture would be dead weight with no compensating clarity benefit.

## Deviations from Plan

### Auto-fixed Issues

None requiring a Rule 1-3 fix to production code. One structural note on task sequencing, not a deviation from what the plan specified:

**Expected transitional test state between Task 1 and Task 2 (not a bug)**

- **Found during:** Task 1's final verify step
- **Observation:** After Task 1's GREEN change (dropping the mtime gate per D-02), the then-unmodified `P62-D2-011` test failed, because its own premise (a stale `.lst` written 100ms before the wait starts, relying on the mtime gate to reject it) no longer held once the mtime check was removed. Task 1's generic `<verify>` block's `<fails_when>` clause ("a summary line reporting any failed test") would read as failing at that intermediate point.
- **Resolution:** This is exactly what D-04 and Task 2's own action step 1 anticipate and require ("the test must be reworked to cover delete-then-wait... It must not be deleted, and it must not be weakened into passing vacuously"). Task 1's own `<acceptance_criteria>` — the more specific and authoritative definition of that task's "done" state — lists only the coarse-mtime test, the `deleteLeftoverLst` tests, and the wiring guard, which all passed (4/4 new tests green; only the pre-existing, soon-to-be-reworked `P62-D2-011` was red). Task 2 immediately reworked that test as its first action, restoring the whole file to green before its own commit. No production code was affected by this observation; it is reported here for transparency about the two-task split's intermediate state.
- **Files modified:** none beyond what both tasks already specified.
- **Verification:** `npm --prefix bbj-vscode exec -- vitest run test/decompile-io.test.ts` — 16/16 passing after Task 2's commit.
- **Committed in:** `e1468e7d` (Task 2 commit) resolves the intermediate state left by `653c8656`.

---

**Total deviations:** 0 requiring production-code auto-fix; 1 documented transitional test state, resolved within the plan's own two-task sequence.
**Impact on plan:** None — both tasks executed exactly as specified; the reported item is a plan-structure note, not scope creep or an unplanned fix.

## Discovered, Not Fixed

**Denumbering a `.lst` input (`resolvedLstFileName` vs. the wait's `<input>.lst.lst` path) is a pre-existing, likely-already-broken code path, left untouched.**

Per the plan's own "Flagged assumptions" and research Pitfall 1: when the input to `decompileInPlace` already ends in `.lst` (denumbering an already-decompiled listing), `Commands.cjs`'s `resolvedLstFileName` resolves to the input itself, but `waitForDecompileOutput`'s internal `lstPath` (now `lstPathFor`) is unconditionally `inputPath + '.lst'` — for this input shape, `<input>.lst.lst`, a path distinct from both the input and from `resolvedLstFileName`. What `bbjlst -l -xlst` actually writes for this flag combination is unverifiable in this environment (no `bbj.home`/`bbjlst` binary available). This plan's D-01 delete target is computed identically to the wait's own path, so the delete can never touch the input file regardless of this open question (verified by the new `.lst`-input safety test), but the underlying denumber-a-`.lst`-input timeout risk itself is out of scope here and was not investigated further, per the plan's explicit instruction not to widen scope.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- RESP-05 (#500) is implemented and unit-tested end to end (D-01 through D-04), but is NOT marked complete in `REQUIREMENTS.md` — plan 92-06 also declares RESP-05 and has not yet produced a SUMMARY.md; `requirements.ready-ids` confirmed 0/1 ready, so `REQUIREMENTS.md` was left unchanged per this plan's own instructions.
- Live BBj UAT for the coarse-mtime decompile fix (a real BBj installation) is out of scope for this plan per `92-CONTEXT.md`'s "UAT scope beyond D-13" — automated tests are the only proof required, and they are all green.

---
*Phase: 92-host-side-hygiene-focus-guards*
*Completed: 2026-09-13*

## Self-Check: PASSED

- `bbj-vscode/src/decompile-io.ts` — FOUND, contains `export async function deleteLeftoverLst`
- `bbj-vscode/test/decompile-io.test.ts` — FOUND, 16/16 tests passing
- `bbj-vscode/src/Commands/Commands.cjs` — FOUND, contains `await deleteLeftoverLst(resolvedFileName)`
- `.planning/phases/92-host-side-hygiene-focus-guards/92-04-SUMMARY.md` — this file
- Commit `653c8656` — FOUND in `git log --oneline`
- Commit `e1468e7d` — FOUND in `git log --oneline`
- `grep -c 'mtimeMs' bbj-vscode/src/decompile-io.ts` → 0
- `grep -c 'await deleteLeftoverLst(resolvedFileName)' bbj-vscode/src/Commands/Commands.cjs` → 1
- `npm --prefix bbj-vscode run build` → exit 0
- `npm --prefix bbj-vscode run lint` → exit 0
- Register check (`git diff 3ec25f02` grep for planning ids) → prints nothing
